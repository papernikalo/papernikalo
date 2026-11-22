export const TARGET_WPM = 40;
export const MISTAKE_LIMIT = 0.03;
const CHARACTERS_PER_WORD = 5;

export type AlignedWord =
  | { kind: "ok"; typed: string }
  | { kind: "half"; typed: string; expected: string }
  | { kind: "sub"; typed: string; expected: string }
  | { kind: "extra"; typed: string }
  | { kind: "missed"; expected: string };

export type TypingScore = {
  seconds: number;
  chars: number;
  minutes: number;
  keystrokes: number;
  gross: number;
  net: number;
  errorPercent: number;
  accuracy: number;
  mistakes: number;
  wordUnits: number;
  typedCount: number;
  fullMistakes: number;
  counts: { ok: number; half: number; sub: number; missed: number; extra: number };
  pass: boolean;
  aligned: AlignedWord[];
  tips: string[];
};

export function formatClock(seconds: number) {
  const total = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

export function wordsOf(text: string) {
  return text.trim().split(/\s+/).filter(Boolean);
}

/** Letters and digits only, so a capital or a comma can be marked as a half mistake. */
export function normalizeWord(word: string) {
  return word.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Characters that count toward speed. Spaces stay in, because the Delhi High
 * Court notice uses “characters with space”. A line break counts as one space.
 */
export function countedCharacters(text: string) {
  return text.replace(/\r?\n/g, " ").length;
}

export function alignWords(typed: string[], reference: string[]): AlignedWord[] {
  const rows = typed.length;
  const cols = Math.min(reference.length, rows + 60);
  const width = cols + 1;
  const cost = new Uint32Array((rows + 1) * width);
  const op = new Uint8Array((rows + 1) * width);

  for (let col = 1; col <= cols; col += 1) {
    cost[col] = col * 2;
    op[col] = 2;
  }

  for (let row = 1; row <= rows; row += 1) {
    cost[row * width] = row * 2;
    op[row * width] = 1;
    for (let col = 1; col <= cols; col += 1) {
      const typedWord = typed[row - 1];
      const expected = reference[col - 1];
      const typedKey = normalizeWord(typedWord);
      const expectedKey = normalizeWord(expected);
      const change =
        typedWord === expected ? 0 : typedKey === expectedKey && typedKey !== "" ? 1 : 2;
      let best = cost[(row - 1) * width + (col - 1)] + change;
      let step = 0;
      const extra = cost[(row - 1) * width + col] + 2;
      const missed = cost[row * width + (col - 1)] + 2;
      if (extra < best) {
        best = extra;
        step = 1;
      }
      if (missed < best) {
        best = missed;
        step = 2;
      }
      cost[row * width + col] = best;
      op[row * width + col] = step;
    }
  }

  let end = 0;
  let best = Number.POSITIVE_INFINITY;
  for (let col = 0; col <= cols; col += 1) {
    const here = cost[rows * width + col];
    if (here <= best) {
      best = here;
      end = col;
    }
  }

  const aligned: AlignedWord[] = [];
  let row = rows;
  let col = end;
  while (row > 0 || col > 0) {
    const step = op[row * width + col];
    if (row > 0 && col > 0 && step === 0) {
      const typedWord = typed[row - 1];
      const expected = reference[col - 1];
      const typedKey = normalizeWord(typedWord);
      if (typedWord === expected) aligned.push({ kind: "ok", typed: typedWord });
      else if (typedKey === normalizeWord(expected) && typedKey !== "") {
        aligned.push({ kind: "half", typed: typedWord, expected });
      } else aligned.push({ kind: "sub", typed: typedWord, expected });
      row -= 1;
      col -= 1;
    } else if (row > 0 && (step === 1 || col === 0)) {
      aligned.push({ kind: "extra", typed: typed[row - 1] });
      row -= 1;
    } else {
      aligned.push({ kind: "missed", expected: reference[col - 1] });
      col -= 1;
    }
  }

  return aligned.reverse();
}

export function scoreAttempt({
  typedText,
  reference,
  seconds,
  keystrokes,
}: {
  typedText: string;
  reference: string[];
  seconds: number;
  keystrokes: number;
}): TypingScore {
  const typedWords = wordsOf(typedText);
  const aligned = alignWords(typedWords, reference);
  const counts = { ok: 0, half: 0, sub: 0, missed: 0, extra: 0 };
  for (const word of aligned) {
    if (word.kind === "ok") counts.ok += 1;
    else if (word.kind === "half") counts.half += 1;
    else if (word.kind === "sub") counts.sub += 1;
    else if (word.kind === "missed") counts.missed += 1;
    else counts.extra += 1;
  }

  const fullMistakes = counts.sub + counts.missed + counts.extra;
  const mistakes = fullMistakes + counts.half / 2;
  const chars = countedCharacters(typedText);
  const minutes = Math.max(seconds, 1) / 60;
  const wordUnits = chars / CHARACTERS_PER_WORD;
  const gross = wordUnits / minutes;
  const net = Math.max(0, (wordUnits - mistakes) / minutes);
  const errorPercent = wordUnits ? (mistakes / wordUnits) * 100 : 0;
  const accuracy = typedWords.length ? (counts.ok / typedWords.length) * 100 : 0;
  const pass = gross >= TARGET_WPM && errorPercent <= MISTAKE_LIMIT * 100;

  const tips: string[] = [];
  if (gross < TARGET_WPM) {
    tips.push(`You need ${Math.ceil(TARGET_WPM - gross)} more wpm to reach ${TARGET_WPM}.`);
  }
  if (errorPercent > MISTAKE_LIMIT * 100) {
    tips.push(
      `Mistakes are ${errorPercent.toFixed(2)}%, over the 3% limit. Slow down slightly and check capitals and punctuation.`,
    );
  }
  if (counts.half > fullMistakes && counts.half > 2) {
    tips.push(
      "Most errors are capital letters or punctuation. Watch commas, full stops and words like Hon'ble, Rs. and dates.",
    );
  }
  if (counts.missed > 3) {
    tips.push("You skipped several words. Keep your eyes moving word by word along the passage.");
  }
  if (tips.length === 0) {
    tips.push("Good attempt. Try a longer duration or turn backspace off to match strict exam conditions.");
  }

  return {
    seconds,
    chars,
    minutes,
    keystrokes,
    gross,
    net,
    errorPercent,
    accuracy,
    mistakes,
    wordUnits,
    typedCount: typedWords.length,
    fullMistakes,
    counts,
    pass,
    aligned,
    tips,
  };
}
