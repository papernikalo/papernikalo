import { getDb } from "@/lib/mongo";
import type { TypingAttemptInput, TypingAttemptRow } from "@/lib/typing-progress";

type StoredAttempt = TypingAttemptInput & {
  userId: string;
  createdAt: Date;
};

function toRow(attempt: StoredAttempt): TypingAttemptRow {
  return {
    passageLabel: attempt.passageLabel,
    passageIndex: attempt.passageIndex,
    durationSeconds: attempt.durationSeconds,
    seconds: attempt.seconds,
    gross: attempt.gross,
    net: attempt.net,
    accuracy: attempt.accuracy,
    mistakes: attempt.mistakes,
    fullMistakes: attempt.fullMistakes,
    halfMistakes: attempt.halfMistakes,
    wrong: attempt.wrong,
    missed: attempt.missed,
    extra: attempt.extra,
    errorPercent: attempt.errorPercent,
    characters: attempt.characters,
    keystrokes: attempt.keystrokes,
    backspace: attempt.backspace,
    pass: attempt.pass,
    createdAt: attempt.createdAt.toISOString(),
  };
}

export async function recordTypingAttempt(userId: string, input: TypingAttemptInput) {
  const db = await getDb();
  const stored: StoredAttempt = { ...input, userId, createdAt: new Date() };
  await db.collection<StoredAttempt>("typingAttempts").insertOne(stored);
  return toRow(stored);
}

export async function listTypingAttempts(userId: string) {
  const db = await getDb();
  const rows = await db
    .collection<StoredAttempt>("typingAttempts")
    .find({ userId }, { projection: { _id: 0 } })
    .sort({ createdAt: -1 })
    .limit(100)
    .toArray();
  return rows.map(toRow);
}
