import { MongoClient, type Db } from "mongodb";
import { AuthError, logAccountFailure } from "@/lib/auth-config";

const globalForMongo = globalThis as typeof globalThis & {
  mongoClient?: MongoClient;
  mongoIndexes?: Promise<void>;
};

async function ensureIndexes(db: Db) {
  const users = db.collection("users");
  const sessions = db.collection("sessions");
  const payments = db.collection("payments");
  const typingAttempts = db.collection("typingAttempts");
  const stenoAttempts = db.collection("stenoAttempts");
  const serviceGrants = db.collection("serviceGrants");
  const typingPassages = db.collection("typingPassages");
  const stenoDictations = db.collection("stenoDictations");
  await Promise.all([
    users.createIndex({ userId: 1 }, { unique: true }),
    users.createIndex({ email: 1 }, { unique: true }),
    users.createIndex({ mobile: 1 }, { unique: true }),
    sessions.createIndex({ tokenHash: 1 }, { unique: true }),
    sessions.createIndex({ previousHash: 1 }),
    sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    payments.createIndex({ paymentId: 1 }, { unique: true }),
    payments.createIndex({ userId: 1, createdAt: -1 }),
    typingAttempts.createIndex({ userId: 1, createdAt: -1 }),
    stenoAttempts.createIndex({ userId: 1, createdAt: -1 }),
    serviceGrants.createIndex({ paymentId: 1 }, { unique: true }),
    typingPassages.createIndex({ createdAt: 1 }),
    stenoDictations.createIndex({ createdAt: 1 }),
    db.collection("practiceOptions").createIndex({ kind: 1, nameKey: 1 }, { unique: true }),
    db.collection("practiceOptions").createIndex({ kind: 1, slug: 1 }, { unique: true }),
  ]);
}

function databaseTarget(uri: string | undefined) {
  if (!uri) return { present: false };
  const scheme = uri.startsWith("mongodb+srv:")
    ? "mongodb+srv"
    : uri.startsWith("mongodb:")
      ? "mongodb"
      : "other";
  try {
    const host = new URL(uri.replace(/^mongodb(\+srv)?:\/\//, "http://")).hostname;
    return { present: true, scheme, host };
  } catch {
    return { present: true, scheme };
  }
}

export async function getDb() {
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) {
    logAccountFailure("MONGODB_URI is missing");
    throw new AuthError("Accounts are not available right now.", 503);
  }

  if (!globalForMongo.mongoClient) {
    globalForMongo.mongoClient = new MongoClient(uri);
  }

  try {
    await globalForMongo.mongoClient.connect();
  } catch (error) {
    const client = globalForMongo.mongoClient;
    globalForMongo.mongoClient = undefined;
    void client?.close().catch(() => undefined);
    logAccountFailure("database connection failed", error, databaseTarget(uri));
    throw new AuthError("Accounts are not available right now.", 503);
  }

  const db = globalForMongo.mongoClient.db();
  if (!globalForMongo.mongoIndexes) {
    globalForMongo.mongoIndexes = ensureIndexes(db).catch((error: unknown) => {
      globalForMongo.mongoIndexes = undefined;
      logAccountFailure("database indexes failed", error, databaseTarget(uri));
      throw error;
    });
  }
  await globalForMongo.mongoIndexes;
  return db;
}
