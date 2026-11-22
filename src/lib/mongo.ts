import { MongoClient, type Db } from "mongodb";
import { AuthError } from "@/lib/auth-config";

const globalForMongo = globalThis as typeof globalThis & {
  mongoClient?: MongoClient;
  mongoIndexes?: Promise<void>;
};

async function ensureIndexes(db: Db) {
  const users = db.collection("users");
  const sessions = db.collection("sessions");
  const payments = db.collection("payments");
  const typingAttempts = db.collection("typingAttempts");
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
  ]);
}

export async function getDb() {
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) {
    throw new AuthError("Accounts are not available right now.", 503);
  }

  if (!globalForMongo.mongoClient) {
    globalForMongo.mongoClient = new MongoClient(uri);
  }

  try {
    await globalForMongo.mongoClient.connect();
  } catch (error) {
    console.error(error);
    throw new AuthError("Accounts are not available right now.", 503);
  }

  const db = globalForMongo.mongoClient.db();
  if (!globalForMongo.mongoIndexes) {
    globalForMongo.mongoIndexes = ensureIndexes(db).catch((error: unknown) => {
      globalForMongo.mongoIndexes = undefined;
      throw error;
    });
  }
  await globalForMongo.mongoIndexes;
  return db;
}
