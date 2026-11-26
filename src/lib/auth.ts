import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import { MongoServerError, ObjectId } from "mongodb";
import { cookies } from "next/headers";
import { cache } from "react";
import {
  ACCESS_COOKIE,
  ACCESS_SECONDS,
  AuthError,
  logAccountFailure,
  REFRESH_COOKIE,
  REFRESH_SECONDS,
  type PublicUser,
} from "@/lib/auth-config";
import { getDb } from "@/lib/mongo";

const LOCK_AFTER = 8;
const LOCK_MS = 15 * 60 * 1000;
const REUSE_GRACE_MS = 60 * 1000;
let unusedPasswordHash: Promise<string> | null = null;

type UserDoc = Omit<PublicUser, "admin"> & {
  passwordHash: string;
  createdAt: Date;
  failedAttempts: number;
  lockedUntil: Date | null;
  /** "ADMIN" on accounts that can add typing and steno content. */
  type?: string;
};

type SessionDoc = {
  _id: ObjectId;
  userId: string;
  tokenHash: string;
  previousHash?: string;
  previousValidUntil?: Date;
  expiresAt: Date;
  createdAt: Date;
};

type AccountInput = {
  userId?: unknown;
  name?: unknown;
  password?: unknown;
  confirmPassword?: unknown;
  email?: unknown;
  mobile?: unknown;
};

function authSecret() {
  const secret = process.env.AUTH_SECRET?.trim() ?? "";
  if (secret.length < 32) {
    logAccountFailure("AUTH_SECRET is missing or shorter than 32 characters", undefined, {
      length: secret.length,
    });
    throw new AuthError("Accounts are not available right now.", 503);
  }
  return secret;
}

function requireText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function parseUserId(value: unknown) {
  const userId = requireText(value).toLowerCase();
  if (!/^[a-z0-9_]{3,32}$/.test(userId)) {
    throw new AuthError("User id must be 3 to 32 letters, numbers, or underscores.", 400);
  }
  return userId;
}

function parsePassword(value: unknown) {
  const password = typeof value === "string" ? value : "";
  if (password.length < 8 || password.length > 72) {
    throw new AuthError("Password must be 8 to 72 characters.", 400);
  }
  return password;
}

function parseName(value: unknown) {
  const name = requireText(value).replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 80) {
    throw new AuthError("Enter your name.", 400);
  }
  return name;
}

function parseEmail(value: unknown) {
  const email = requireText(value).toLowerCase();
  if (email.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AuthError("Enter a valid email address.", 400);
  }
  return email;
}

function parseMobile(value: unknown) {
  let mobile = requireText(value).replace(/[\s-]/g, "");
  if (mobile.startsWith("+91")) mobile = mobile.slice(3);
  if (mobile.startsWith("0")) mobile = mobile.slice(1);
  if (!/^[6-9]\d{9}$/.test(mobile)) {
    throw new AuthError("Enter a 10-digit Indian mobile number.", 400);
  }
  return mobile;
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function signAccess(userId: string) {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({ sub: userId, iat: now, exp: now + ACCESS_SECONDS }),
  ).toString("base64url");
  const data = `${header}.${payload}`;
  const signature = createHmac("sha256", authSecret()).update(data).digest("base64url");
  return `${data}.${signature}`;
}

function readAccess(token: string) {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, payload, signature] = parts;
  const data = `${header}.${payload}`;
  const expected = createHmac("sha256", authSecret()).update(data).digest("base64url");
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;

  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      sub?: unknown;
      exp?: unknown;
    };
    if (typeof claims.sub !== "string" || typeof claims.exp !== "number") return null;
    if (claims.exp <= Math.floor(Date.now() / 1000)) return null;
    return claims.sub;
  } catch {
    return null;
  }
}

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

async function writeCookies(access: string, refresh?: string) {
  const jar = await cookies();
  jar.set(ACCESS_COOKIE, access, cookieOptions(ACCESS_SECONDS));
  if (refresh) {
    jar.set(REFRESH_COOKIE, refresh, cookieOptions(REFRESH_SECONDS));
  }
}

export async function clearAuthCookies() {
  const jar = await cookies();
  jar.delete(ACCESS_COOKIE);
  jar.delete(REFRESH_COOKIE);
}

async function collections() {
  const db = await getDb();
  return {
    users: db.collection<UserDoc>("users"),
    sessions: db.collection<SessionDoc>("sessions"),
  };
}

function publicUser(user: UserDoc): PublicUser {
  const photo = typeof user.photo === "string" ? user.photo : "";
  return {
    userId: user.userId,
    name: typeof user.name === "string" ? user.name : "",
    email: user.email,
    mobile: user.mobile,
    photo: photo.startsWith("data:image/jpeg;base64,") ? photo : "",
    admin: user.type === "ADMIN",
  };
}

export function parseProfilePhoto(value: unknown) {
  if (value === "") return "";
  if (typeof value !== "string" || value.length > 220_000 || !value.startsWith("data:image/jpeg;base64,")) {
    throw new AuthError("Choose a JPEG, PNG, or WebP picture.", 400);
  }
  const bytes = Buffer.from(value.slice("data:image/jpeg;base64,".length), "base64");
  if (bytes.length < 32 || bytes.length > 150_000 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    throw new AuthError("Choose a JPEG, PNG, or WebP picture.", 400);
  }
  return value;
}

export async function updateAccount(
  userId: string,
  input: { name?: unknown; email?: unknown; mobile?: unknown; photo?: unknown },
) {
  const name = parseName(input.name);
  const email = parseEmail(input.email);
  const mobile = parseMobile(input.mobile);
  const photo = parseProfilePhoto(input.photo);
  const { users } = await collections();
  try {
    const result = await users.updateOne({ userId }, { $set: { name, email, mobile, photo } });
    if (!result.matchedCount) throw new AuthError("Sign in again.", 401);
  } catch (error) {
    if (error instanceof AuthError) throw error;
    const message = duplicateMessage(error);
    if (message) throw new AuthError(message, 409);
    throw error;
  }
  const user = await users.findOne({ userId });
  if (!user) throw new AuthError("Sign in again.", 401);
  return publicUser(user);
}

async function startSession(user: UserDoc) {
  const refresh = randomBytes(32).toString("base64url");
  const { sessions } = await collections();
  const now = new Date();
  await sessions.insertOne({
    _id: new ObjectId(),
    userId: user.userId,
    tokenHash: hashToken(refresh),
    expiresAt: new Date(now.getTime() + REFRESH_SECONDS * 1000),
    createdAt: now,
  });
  await writeCookies(signAccess(user.userId), refresh);
  return publicUser(user);
}

function duplicateMessage(error: unknown) {
  if (!(error instanceof MongoServerError) || error.code !== 11000) return null;
  const pattern = error.keyPattern ?? {};
  if (pattern.userId) return "That user id is already registered.";
  if (pattern.email) return "That email is already registered.";
  if (pattern.mobile) return "That mobile number is already registered.";
  return "That account is already registered.";
}

export async function registerAccount(input: AccountInput) {
  authSecret();
  const userId = parseUserId(input.userId);
  const password = parsePassword(input.password);
  const confirmPassword = typeof input.confirmPassword === "string" ? input.confirmPassword : "";
  if (password !== confirmPassword) {
    throw new AuthError("Passwords do not match.", 400);
  }
  const name = parseName(input.name);
  const email = parseEmail(input.email);
  const mobile = parseMobile(input.mobile);
  const { users } = await collections();
  const passwordHash = await bcrypt.hash(password, 12);

  try {
    await users.insertOne({
      userId,
      name,
      email,
      mobile,
      photo: "",
      passwordHash,
      createdAt: new Date(),
      failedAttempts: 0,
      lockedUntil: null,
    });
  } catch (error) {
    const message = duplicateMessage(error);
    if (message) throw new AuthError(message, 409);
    throw error;
  }

  const user = await users.findOne({ userId });
  if (!user) throw new AuthError("The account could not be created.", 500);
  return startSession(user);
}

export async function signInAccount(input: { userId?: unknown; password?: unknown }) {
  authSecret();
  const userId = parseUserId(input.userId);
  let password: string;
  try {
    password = parsePassword(input.password);
  } catch {
    throw new AuthError("The user id or password is wrong.", 401);
  }
  const { users } = await collections();
  const user = await users.findOne({ userId });

  if (user?.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
    throw new AuthError("Too many attempts. Try again in 15 minutes.", 429);
  }

  unusedPasswordHash ??= bcrypt.hash("papernikalo-unused-password", 12);
  const hash = user?.passwordHash ?? (await unusedPasswordHash);
  const matches = await bcrypt.compare(password, hash);
  if (!user || !matches) {
    if (user) {
      const attempts = user.failedAttempts + 1;
      await users.updateOne(
        { userId },
        attempts >= LOCK_AFTER
          ? { $set: { failedAttempts: 0, lockedUntil: new Date(Date.now() + LOCK_MS) } }
          : { $set: { failedAttempts: attempts } },
      );
    }
    throw new AuthError("The user id or password is wrong.", 401);
  }

  await users.updateOne({ userId }, { $set: { failedAttempts: 0, lockedUntil: null } });
  return startSession(user);
}

export async function refreshAccount(refreshToken: string | undefined) {
  if (!refreshToken) throw new AuthError("Sign in again.", 401);
  authSecret();
  const presented = hashToken(refreshToken);
  const { users, sessions } = await collections();
  const now = new Date();
  const session = await sessions.findOne({
    $or: [{ tokenHash: presented }, { previousHash: presented }],
  });

  if (!session || session.expiresAt.getTime() <= now.getTime()) {
    if (session) await sessions.deleteOne({ _id: session._id });
    await clearAuthCookies();
    throw new AuthError("Sign in again.", 401);
  }

  if (session.previousHash === presented) {
    if (!session.previousValidUntil || session.previousValidUntil.getTime() <= now.getTime()) {
      await sessions.deleteOne({ _id: session._id });
      await clearAuthCookies();
      throw new AuthError("Sign in again.", 401);
    }
  }

  const user = await users.findOne({ userId: session.userId });
  if (!user) {
    await sessions.deleteMany({ userId: session.userId });
    await clearAuthCookies();
    throw new AuthError("Sign in again.", 401);
  }

  if (session.tokenHash === presented) {
    const refresh = randomBytes(32).toString("base64url");
    await sessions.updateOne(
      { _id: session._id },
      {
        $set: {
          tokenHash: hashToken(refresh),
          previousHash: presented,
          previousValidUntil: new Date(now.getTime() + REUSE_GRACE_MS),
        },
      },
    );
    await writeCookies(signAccess(user.userId), refresh);
  } else {
    await writeCookies(signAccess(user.userId));
  }

  return publicUser(user);
}

export async function readAccessUserId() {
  const jar = await cookies();
  const access = jar.get(ACCESS_COOKIE)?.value;
  if (!access) return null;
  return readAccess(access);
}

/** The signed-in account for this request, without rotating the refresh key. */
export const readCurrentUser = cache(async (): Promise<PublicUser | null> => {
  try {
    const jar = await cookies();
    const access = jar.get(ACCESS_COOKIE)?.value;
    const refreshToken = jar.get(REFRESH_COOKIE)?.value;
    if (!access && !refreshToken) return null;

    authSecret();
    const { users, sessions } = await collections();
    const userId = access ? readAccess(access) : null;
    if (userId) {
      const user = await users.findOne({ userId });
      if (user) return publicUser(user);
    }

    if (!refreshToken) return null;
    const presented = hashToken(refreshToken);
    const now = new Date();
    const session = await sessions.findOne({
      $or: [{ tokenHash: presented }, { previousHash: presented }],
    });
    if (!session || session.expiresAt.getTime() <= now.getTime()) return null;
    if (
      session.previousHash === presented &&
      (!session.previousValidUntil || session.previousValidUntil.getTime() <= now.getTime())
    ) {
      return null;
    }

    const user = await users.findOne({ userId: session.userId });
    return user ? publicUser(user) : null;
  } catch (error) {
    logAccountFailure("Could not read the signed-in account", error);
    return null;
  }
});

export async function signOutAccount(refreshToken: string | undefined) {
  try {
    if (refreshToken) {
      const presented = hashToken(refreshToken);
      const { sessions } = await collections();
      await sessions.deleteOne({ $or: [{ tokenHash: presented }, { previousHash: presented }] });
    }
  } finally {
    await clearAuthCookies();
  }
}
