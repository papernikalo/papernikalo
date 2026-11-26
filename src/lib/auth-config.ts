/** Access keys last 5 minutes. The browser asks the server to check the refresh key on that same interval. */
export const ACCESS_SECONDS = 5 * 60;

/** Refresh keys last 14 days, then the person has to sign in again. */
export const REFRESH_SECONDS = 14 * 24 * 60 * 60;

export const AUTH_CHECK_MS = ACCESS_SECONDS * 1000;

export const ACCESS_COOKIE = "pn_access";
export const REFRESH_COOKIE = "pn_refresh";

export type PublicUser = {
  userId: string;
  name: string;
  email: string;
  mobile: string;
  photo: string;
  /** True when the account document has type "ADMIN". */
  admin: boolean;
};

export class AuthError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

type ErrorDetail = {
  name?: string;
  code?: string | number;
  message?: string;
};

function describeError(error: unknown) {
  const chain: ErrorDetail[] = [];
  const seen = new Set<unknown>();
  let current: unknown = error;
  while (current && typeof current === "object" && !seen.has(current) && chain.length < 5) {
    seen.add(current);
    const record = current as { name?: unknown; code?: unknown; message?: unknown; cause?: unknown };
    const detail: ErrorDetail = {};
    if (typeof record.name === "string") detail.name = record.name;
    if (typeof record.code === "string" || typeof record.code === "number") detail.code = record.code;
    if (typeof record.message === "string") detail.message = record.message;
    chain.push(detail);
    current = record.cause;
  }
  return chain.length > 0 ? chain : [{ message: String(error) }];
}

/** Server log for the public "accounts are not available" failure. Never pass secrets or connection strings. */
export function logAccountFailure(
  reason: string,
  error?: unknown,
  extra?: Record<string, unknown>,
) {
  console.error("[accounts]", reason, {
    ...extra,
    ...(error === undefined ? {} : { error: describeError(error) }),
  });
}
