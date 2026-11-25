import { getDb } from "@/lib/mongo";
import type { StenoAttemptInput, StenoAttemptRow } from "@/lib/steno-progress";

type StoredAttempt = StenoAttemptInput & {
  userId: string;
  createdAt: Date;
};

function toRow(attempt: StoredAttempt): StenoAttemptRow {
  return {
    passageLabel: attempt.passageLabel,
    language: attempt.language,
    speed: attempt.speed,
    playOnce: attempt.playOnce,
    accuracy: attempt.accuracy,
    correct: attempt.correct,
    words: attempt.words,
    mistakes: attempt.mistakes,
    createdAt: attempt.createdAt.toISOString(),
  };
}

export async function recordStenoAttempt(userId: string, input: StenoAttemptInput) {
  const db = await getDb();
  const stored: StoredAttempt = { ...input, userId, createdAt: new Date() };
  await db.collection<StoredAttempt>("stenoAttempts").insertOne(stored);
  return toRow(stored);
}

export async function listStenoAttempts(userId: string) {
  const db = await getDb();
  const rows = await db
    .collection<StoredAttempt>("stenoAttempts")
    .find({ userId }, { projection: { _id: 0 } })
    .sort({ createdAt: -1 })
    .limit(100)
    .toArray();
  return rows.map(toRow);
}
