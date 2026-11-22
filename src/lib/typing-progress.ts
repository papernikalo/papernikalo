import { TARGET_WPM, MISTAKE_LIMIT } from "@/lib/typing-score";

export const TYPING_HISTORY_KEY = "dhc-typing-history";

/** Drops typing rows left in this browser. Account progress stays in the database. */
export function clearStoredTypingHistory() {
  try {
    localStorage.removeItem(TYPING_HISTORY_KEY);
  } catch {
    // This browser refused storage.
  }
}

const DURATIONS = new Set([60, 120, 300, 600]);

export type TypingAttemptInput = {
  passageLabel: string;
  passageIndex: number | null;
  durationSeconds: number;
  seconds: number;
  gross: number;
  net: number;
  accuracy: number;
  mistakes: number;
  fullMistakes: number;
  halfMistakes: number;
  wrong: number;
  missed: number;
  extra: number;
  errorPercent: number;
  characters: number;
  keystrokes: number;
  backspace: boolean;
  pass: boolean;
};

export type TypingAttemptRow = TypingAttemptInput & {
  createdAt: string;
};

export type TypingSummary = {
  count: number;
  passes: number;
  bestGross: number;
  bestNet: number;
  recentAverage: number;
  lowestError: number;
  latestGross: number;
  change: number | null;
  examBestGross: number | null;
  examPasses: number;
};

function finite(value: unknown, min: number, max: number) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) return null;
  return Math.round(value * 100) / 100;
}

export function parseTypingAttempt(value: unknown): TypingAttemptInput | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const passageLabel = typeof row.passageLabel === "string" ? row.passageLabel.trim() : "";
  if (passageLabel.length < 1 || passageLabel.length > 160) return null;
  const passageIndex =
    row.passageIndex === null
      ? null
      : typeof row.passageIndex === "number" &&
          Number.isInteger(row.passageIndex) &&
          row.passageIndex >= 0 &&
          row.passageIndex <= 12
        ? row.passageIndex
        : undefined;
  if (passageIndex === undefined) return null;
  if (typeof row.durationSeconds !== "number" || !DURATIONS.has(row.durationSeconds)) return null;
  const seconds = finite(row.seconds, 0, row.durationSeconds + 1);
  const gross = finite(row.gross, 0, 400);
  const net = finite(row.net, 0, 400);
  const accuracy = finite(row.accuracy, 0, 100);
  const mistakes = finite(row.mistakes, 0, 5000);
  const fullMistakes = finite(row.fullMistakes, 0, 5000);
  const halfMistakes = finite(row.halfMistakes, 0, 5000);
  const wrong = finite(row.wrong, 0, 5000);
  const missed = finite(row.missed, 0, 5000);
  const extra = finite(row.extra, 0, 5000);
  const errorPercent = finite(row.errorPercent, 0, 1000);
  const characters = finite(row.characters, 0, 20000);
  const keystrokes = finite(row.keystrokes, 0, 30000);
  if (
    seconds === null ||
    gross === null ||
    net === null ||
    accuracy === null ||
    mistakes === null ||
    fullMistakes === null ||
    halfMistakes === null ||
    wrong === null ||
    missed === null ||
    extra === null ||
    errorPercent === null ||
    characters === null ||
    keystrokes === null ||
    typeof row.backspace !== "boolean"
  ) {
    return null;
  }
  return {
    passageLabel,
    passageIndex,
    durationSeconds: row.durationSeconds,
    seconds,
    gross,
    net,
    accuracy,
    mistakes,
    fullMistakes,
    halfMistakes,
    wrong,
    missed,
    extra,
    errorPercent,
    characters,
    keystrokes,
    backspace: row.backspace,
    pass: gross >= TARGET_WPM && errorPercent <= MISTAKE_LIMIT * 100,
  };
}

export function summarizeAttempts(rows: TypingAttemptRow[]): TypingSummary | null {
  if (!rows.length) return null;
  const recent = rows.slice(0, 5);
  const bestGross = Math.max(...rows.map((row) => row.gross));
  const bestNet = Math.max(...rows.map((row) => row.net));
  const lowestError = Math.min(...rows.map((row) => row.errorPercent));
  const recentAverage = recent.reduce((sum, row) => sum + row.gross, 0) / recent.length;
  const latest = rows[0];
  const previous = rows[1];
  const examRows = rows.filter((row) => row.durationSeconds === 600);
  return {
    count: rows.length,
    passes: rows.filter((row) => row.pass).length,
    bestGross,
    bestNet,
    recentAverage,
    lowestError,
    latestGross: latest.gross,
    change: previous ? latest.gross - previous.gross : null,
    examBestGross: examRows.length ? Math.max(...examRows.map((row) => row.gross)) : null,
    examPasses: examRows.filter((row) => row.pass).length,
  };
}

