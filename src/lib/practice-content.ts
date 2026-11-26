import { ObjectId } from "mongodb";
import { io } from "next/cache";
import { AuthError } from "@/lib/auth-config";
import {
  passageLanguages,
  stenoTopics,
  typingWordsPerMinute,
  type SavedStenoDictation,
  type SavedTypingPassage,
} from "@/lib/content-fields";
import { examBodies, type ExamChoice } from "@/lib/exam-bodies";
import { getDb } from "@/lib/mongo";
import { wordsOf } from "@/lib/typing-score";

export type { SavedStenoDictation, SavedTypingPassage } from "@/lib/content-fields";

type TypingDoc = {
  _id: ObjectId;
  title: string;
  text: string;
  language: "English" | "Hindi";
  examId?: string;
  minutes?: number;
  createdAt: Date;
  createdBy: string;
};

type StenoDoc = {
  _id: ObjectId;
  title: string;
  english: string;
  hindi: string;
  topic: string;
  createdAt: Date;
  createdBy: string;
};

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T) {
  const text = textOf(value);
  return (allowed as readonly string[]).includes(text) ? (text as T) : fallback;
}

function textOf(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function parseTitle(value: unknown) {
  const title = textOf(value).replace(/\s+/g, " ");
  if (title.length < 2 || title.length > 140) {
    throw new AuthError("Enter a title between 2 and 140 characters.", 400);
  }
  return title;
}

function parseOptionalBody(value: unknown, label: string, max: number) {
  const body = textOf(value);
  if (!body) return "";
  if (body.length > max) throw new AuthError(`${label} must be ${max} characters or fewer.`, 400);
  return body;
}

function parseBody(value: unknown, label: string, min: number, max: number) {
  const body = textOf(value);
  if (body.length < min || body.length > max) {
    throw new AuthError(`${label} must be ${min} to ${max} characters.`, 400);
  }
  return body;
}

function parseMinutes(value: unknown) {
  const minutes = typeof value === "number" ? value : Number(textOf(value));
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 60) {
    throw new AuthError("Enter a time from 1 to 60 minutes.", 400);
  }
  return minutes;
}

function parseId(value: unknown) {
  const id = textOf(value);
  if (!ObjectId.isValid(id)) throw new AuthError("That item could not be found.", 400);
  return new ObjectId(id);
}

export async function listTypingPassages(): Promise<SavedTypingPassage[]> {
  await io();
  const db = await getDb();
  const rows = await db
    .collection<TypingDoc>("typingPassages")
    .find({}, { projection: { createdBy: 0 } })
    .sort({ createdAt: 1 })
    .limit(200)
    .toArray();
  return rows.map((row) => ({
    id: row._id.toHexString(),
    title: row.title,
    text: row.text,
    language: row.language === "Hindi" ? "Hindi" as const : "English" as const,
    examId: textOf(row.examId) || undefined,
    minutes: Number.isInteger(row.minutes) && (row.minutes ?? 0) >= 1 && (row.minutes ?? 0) <= 60 ? row.minutes : undefined,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function addTypingPassage(
  createdBy: string,
  input: { title?: unknown; text?: unknown; language?: unknown; examId?: unknown; minutes?: unknown },
) {
  const title = parseTitle(input.title);
  const text = parseBody(input.text, "The passage", 40, 100000);
  const language = oneOf(input.language, passageLanguages, "English");
  const minutes = parseMinutes(input.minutes);
  const expectedWords = minutes * typingWordsPerMinute;
  const actualWords = wordsOf(text).length;
  if (actualWords !== expectedWords) {
    throw new AuthError(
      `A ${minutes} minute passage at ${typingWordsPerMinute} wpm needs ${expectedWords} words. This one has ${actualWords}.`,
      400,
    );
  }
  const examId = textOf(input.examId);
  await io();
  const db = await getDb();
  const customExams = await listCustomExams();
  if (!examBodies.some((item) => item.id === examId) && !customExams.some((item) => item.id === examId)) {
    throw new AuthError("Choose an exam body.", 400);
  }
  const doc: TypingDoc = {
    _id: new ObjectId(),
    title,
    text,
    language,
    examId,
    minutes,
    createdAt: new Date(),
    createdBy,
  };
  await db.collection<TypingDoc>("typingPassages").insertOne(doc);
  return {
    id: doc._id.toHexString(),
    title,
    text,
    language,
    examId,
    minutes,
    createdAt: doc.createdAt.toISOString(),
  };
}

export async function removeTypingPassage(id: unknown) {
  await io();
  const db = await getDb();
  const result = await db.collection<TypingDoc>("typingPassages").deleteOne({ _id: parseId(id) });
  if (!result.deletedCount) throw new AuthError("That passage could not be found.", 404);
}

export async function listStenoDictations(): Promise<SavedStenoDictation[]> {
  await io();
  const db = await getDb();
  const rows = await db
    .collection<StenoDoc>("stenoDictations")
    .find({}, { projection: { createdBy: 0 } })
    .sort({ createdAt: 1 })
    .limit(200)
    .toArray();
  return rows.map((row) => ({
    id: row._id.toHexString(),
    title: row.title,
    english: row.english,
    hindi: row.hindi || "",
    topic: row.topic || "General",
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function addStenoDictation(
  createdBy: string,
  input: { title?: unknown; english?: unknown; hindi?: unknown; topic?: unknown },
) {
  const title = parseTitle(input.title);
  const english = parseBody(input.english, "The English dictation", 20, 8000);
  const hindi = parseOptionalBody(input.hindi, "The Hindi dictation", 8000);
  const requested = textOf(input.topic).replace(/\s+/g, " ");
  await io();
  const db = await getDb();
  const customDictations = await listCustomDictations();
  const topic =
    stenoTopics.find((item) => item.toLowerCase() === requested.toLowerCase()) ??
    customDictations.find((item) => item.name.toLowerCase() === requested.toLowerCase())?.name;
  if (!topic) throw new AuthError("Choose a dictation.", 400);
  const doc: StenoDoc = {
    _id: new ObjectId(),
    title,
    english,
    hindi,
    topic,
    createdAt: new Date(),
    createdBy,
  };
  await db.collection<StenoDoc>("stenoDictations").insertOne(doc);
  return {
    id: doc._id.toHexString(),
    title,
    english,
    hindi,
    topic,
    createdAt: doc.createdAt.toISOString(),
  };
}

export async function removeStenoDictation(id: unknown) {
  await io();
  const db = await getDb();
  const result = await db.collection<StenoDoc>("stenoDictations").deleteOne({ _id: parseId(id) });
  if (!result.deletedCount) throw new AuthError("That dictation could not be found.", 404);
}

export async function countPracticeActivity() {
  await io();
  const db = await getDb();
  const [accounts, typingAttempts, stenoAttempts] = await Promise.all([
    db.collection("users").countDocuments(),
    db.collection("typingAttempts").countDocuments(),
    db.collection("stenoAttempts").countDocuments(),
  ]);
  return { accounts, typingAttempts, stenoAttempts };
}

export type PracticeOption = { id: string; name: string };

type OptionDoc = {
  _id: ObjectId;
  kind: "exam" | "dictation";
  name: string;
  nameKey: string;
  slug: string;
  createdAt: Date;
  createdBy: string;
};

function optionSlug(name: string) {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

export async function listCustomExams(): Promise<ExamChoice[]> {
  await io();
  const db = await getDb();
  const rows = await db.collection<OptionDoc>("practiceOptions").find({ kind: "exam" }).sort({ createdAt: 1 }).toArray();
  return rows.map((row) => ({
    id: row.slug,
    name: row.name,
    posts: "Practice test",
    langs: "English · Hindi",
  }));
}

export async function listCustomDictations(): Promise<PracticeOption[]> {
  await io();
  const db = await getDb();
  const rows = await db
    .collection<OptionDoc>("practiceOptions")
    .find({ kind: "dictation" })
    .sort({ createdAt: 1 })
    .toArray();
  return rows.map((row) => ({ id: row.slug, name: row.name }));
}

export async function addPracticeOption(createdBy: string, kind: unknown, rawName: unknown): Promise<PracticeOption> {
  if (kind !== "exam" && kind !== "dictation") throw new AuthError("Choose exam or dictation.", 400);
  const name = textOf(rawName).replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 60) {
    throw new AuthError("Enter a name between 2 and 60 characters.", 400);
  }
  const base = optionSlug(name);
  if (!base) throw new AuthError("Use letters or numbers in the name.", 400);
  const nameKey = name.toLowerCase();
  if (kind === "exam" && examBodies.some((item) => item.id === base || item.name.toLowerCase() === nameKey)) {
    throw new AuthError("That exam body is already listed.", 400);
  }
  if (kind === "dictation" && stenoTopics.some((item) => item.toLowerCase() === nameKey)) {
    throw new AuthError("That dictation is already listed.", 400);
  }
  await io();
  const db = await getDb();
  const options = db.collection<OptionDoc>("practiceOptions");
  const taken = await options.find({ kind }).project<{ slug: string; nameKey: string }>({ slug: 1, nameKey: 1 }).toArray();
  if (taken.some((item) => item.nameKey === nameKey)) {
    throw new AuthError("That name is already listed.", 400);
  }
  let slug = base;
  let suffix = 2;
  while (taken.some((item) => item.slug === slug) || (kind === "exam" && examBodies.some((item) => item.id === slug))) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }
  const doc: OptionDoc = {
    _id: new ObjectId(),
    kind,
    name,
    nameKey,
    slug,
    createdAt: new Date(),
    createdBy,
  };
  try {
    await options.insertOne(doc);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === 11000) {
      throw new AuthError("That name is already listed.", 400);
    }
    throw error;
  }
  return { id: slug, name };
}

export async function removePracticeOption(kind: unknown, id: unknown) {
  if (kind !== "exam" && kind !== "dictation") throw new AuthError("Choose exam or dictation.", 400);
  const slug = textOf(id);
  if (!slug) throw new AuthError("That option could not be found.", 400);
  await io();
  const db = await getDb();
  const options = db.collection<OptionDoc>("practiceOptions");
  const option = await options.findOne({ kind, slug });
  if (!option) throw new AuthError("That option could not be found.", 404);
  if (kind === "exam") {
    const used = await db.collection<TypingDoc>("typingPassages").countDocuments({ examId: slug });
    if (used) throw new AuthError("Remove the passages for this exam body first.", 400);
  } else {
    const used = await db.collection<StenoDoc>("stenoDictations").countDocuments({ topic: option.name });
    if (used) throw new AuthError("Remove the pieces that use this dictation first.", 400);
  }
  await options.deleteOne({ _id: option._id });
}
