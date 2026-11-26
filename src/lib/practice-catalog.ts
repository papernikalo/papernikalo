"use client";

import { useSyncExternalStore } from "react";
import type { ExamChoice } from "@/lib/exam-bodies";
import type { StenoDictation } from "@/lib/steno-dictations";
import type { TypingPassage } from "@/lib/typing-passages";

export type PracticeCatalog = {
  typing: TypingPassage[];
  steno: StenoDictation[];
  exams: ExamChoice[];
};

const empty: PracticeCatalog = { typing: [], steno: [], exams: [] };

let catalog = empty;
let ready = false;
let started = false;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function asTyping(value: unknown): TypingPassage[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    if (typeof row.title !== "string" || typeof row.text !== "string") return [];
    return [
      {
        title: row.title,
        text: row.text,
        language: row.language === "Hindi" ? "Hindi" : row.language === "English" ? "English" : undefined,
        examId: typeof row.examId === "string" ? row.examId : undefined,
        minutes: typeof row.minutes === "number" && Number.isInteger(row.minutes) ? row.minutes : undefined,
      },
    ];
  });
}

function asSteno(value: unknown): StenoDictation[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    if (
      typeof row.id !== "string" ||
      typeof row.title !== "string" ||
      typeof row.english !== "string" ||
      typeof row.hindi !== "string"
    ) {
      return [];
    }
    return [
      {
        id: row.id,
        title: row.title,
        english: row.english,
        hindi: row.hindi,
        topic: typeof row.topic === "string" ? row.topic : undefined,
      },
    ];
  });
}

function asExams(value: unknown): ExamChoice[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    if (typeof row.id !== "string" || typeof row.name !== "string") return [];
    return [
      {
        id: row.id,
        name: row.name,
        posts: typeof row.posts === "string" ? row.posts : "Practice test",
        langs: typeof row.langs === "string" ? row.langs : "English · Hindi",
      },
    ];
  });
}
export function startPracticeCatalog() {
  if (started || typeof window === "undefined") return;
  started = true;
  void fetch("/api/practice/catalog", { cache: "no-store" })
    .then(async (response) => {
      if (!response.ok) return empty;
      return (await response.json()) as { typing?: unknown; steno?: unknown; exams?: unknown };
    })
    .then((payload) => {
      catalog = { typing: asTyping(payload.typing), steno: asSteno(payload.steno), exams: asExams(payload.exams) };
      ready = true;
      emit();
    })
    .catch(() => {
      catalog = empty;
      ready = true;
      emit();
    });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function usePracticeCatalog() {
  return useSyncExternalStore(subscribe, () => catalog, () => empty);
}

export function usePracticeReady() {
  return useSyncExternalStore(subscribe, () => ready, () => false);
}
