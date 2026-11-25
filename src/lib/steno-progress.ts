export type StenoAttemptInput = {
  passageLabel: string;
  language: "English" | "Hindi";
  speed: number;
  playOnce: boolean;
  accuracy: number;
  correct: number;
  words: number;
  mistakes: number;
};

export type StenoAttemptRow = StenoAttemptInput & {
  createdAt: string;
};

function whole(value: unknown, min: number, max: number) {
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) return null;
  return value;
}

export function parseStenoAttempt(value: unknown): StenoAttemptInput | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const passageLabel = typeof row.passageLabel === "string" ? row.passageLabel.trim() : "";
  if (passageLabel.length < 1 || passageLabel.length > 80) return null;
  if (row.language !== "English" && row.language !== "Hindi") return null;
  const speed = whole(row.speed, 40, 200);
  const accuracy =
    typeof row.accuracy === "number" && Number.isFinite(row.accuracy)
      ? Math.round(row.accuracy * 10) / 10
      : null;
  const correct = whole(row.correct, 0, 5000);
  const words = whole(row.words, 0, 5000);
  const mistakes = whole(row.mistakes, 0, 5000);
  if (
    speed === null ||
    accuracy === null ||
    accuracy < 0 ||
    accuracy > 100 ||
    correct === null ||
    words === null ||
    mistakes === null ||
    typeof row.playOnce !== "boolean"
  ) {
    return null;
  }
  return {
    passageLabel,
    language: row.language,
    speed,
    playOnce: row.playOnce,
    accuracy,
    correct,
    words,
    mistakes,
  };
}
