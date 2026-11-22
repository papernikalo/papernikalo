"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { typingPassages } from "@/lib/typing-passages";
import {
  parseTypingAttempt,
  summarizeAttempts,
  type TypingAttemptRow,
} from "@/lib/typing-progress";
import {
  MISTAKE_LIMIT,
  TARGET_WPM,
  formatClock,
  scoreAttempt,
  wordsOf,
  type AlignedWord,
  type TypingScore,
} from "@/lib/typing-score";

const LOCAL_KEY = "dhc-typing-history";
const durations = [
  { value: 600, label: "10 min (exam)" },
  { value: 300, label: "5 min" },
  { value: 120, label: "2 min" },
  { value: 60, label: "1 min" },
];

function readLocal(): TypingAttemptRow[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]") as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item) => {
      const attempt = parseTypingAttempt(item);
      if (!attempt || !item || typeof item !== "object") return [];
      const createdAt = (item as { createdAt?: unknown }).createdAt;
      if (typeof createdAt !== "string") return [];
      return [{ ...attempt, createdAt }];
    });
  } catch {
    return [];
  }
}

function writeLocal(rows: TypingAttemptRow[]) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(rows.slice(0, 100)));
  } catch {
    // This browser refused storage. A signed-in attempt is still saved on the account.
  }
}

export function TypingTest() {
  const [passageId, setPassageId] = useState("0");
  const [duration, setDuration] = useState(600);
  const [allowBackspace, setAllowBackspace] = useState(true);
  const [highlight, setHighlight] = useState(true);
  const [draft, setDraft] = useState("");
  const [customText, setCustomText] = useState("");
  const [typed, setTyped] = useState("");
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  const [now, setNow] = useState(0);
  const [result, setResult] = useState<TypingScore | null>(null);
  const keystrokes = useRef(0);
  const settled = useRef(false);
  const passageRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLElement>(null);
  const { user, ready } = useAuth();
  const [attempts, setAttempts] = useState<TypingAttemptRow[]>([]);
  const [progressNote, setProgressNote] = useState("");

  const custom = passageId === "custom";
  const passage = useMemo(() => {
    if (custom) {
      const text =
        customText.trim() ||
        "Paste a judgment or order in the box above, then press Load passage.";
      return { title: "Your passage", words: wordsOf(text) };
    }
    const index = Number(passageId);
    const order = [...typingPassages.slice(index), ...typingPassages.slice(0, index)];
    return {
      title: order[0]?.title ?? "Passage",
      words: wordsOf(order.map((item) => item.text).join(" ")),
    };
  }, [custom, customText, passageId]);

  const reset = useCallback(() => {
    setTyped("");
    setStartedAt(null);
    setFinished(false);
    setResult(null);
    setNow(0);
    keystrokes.current = 0;
    settled.current = false;
    if (passageRef.current) passageRef.current.scrollTop = 0;
  }, []);

  const elapsed = startedAt === null ? 0 : Math.min(duration, (now - startedAt) / 1000);
  const remaining = duration - elapsed;
  const typedWords = wordsOf(typed);
  const currentWord = typedWords.length - (/\s$/.test(typed) || !typed ? 0 : 1);
  const liveChars = typed.replace(/\r?\n/g, " ").length;
  const liveGross =
    startedAt === null ? 0 : Math.round(liveChars / 5 / (Math.max(elapsed, 1) / 60));

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    async function load() {
      if (!user) {
        if (!cancelled) {
          setAttempts(readLocal());
          setProgressNote("");
        }
        return;
      }
      try {
        const response = await fetch("/api/account/typing");
        const body = (await response.json()) as { attempts?: TypingAttemptRow[]; error?: string };
        if (!response.ok) throw new Error(body.error || "Typing progress could not be loaded.");
        let rows = body.attempts ?? [];
        const local = readLocal();
        if (!rows.length && local.length) {
          const uploaded = await fetch("/api/account/typing", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ attempts: [...local].reverse() }),
          });
          const saved = (await uploaded.json()) as { attempts?: TypingAttemptRow[] };
          if (uploaded.ok && saved.attempts?.length) {
            rows = [...saved.attempts].reverse();
            writeLocal([]);
          } else {
            rows = local;
          }
        }
        if (!cancelled) {
          setAttempts(rows);
          setProgressNote("");
        }
      } catch (reason: unknown) {
        if (!cancelled) {
          setAttempts(readLocal());
          setProgressNote(
            reason instanceof Error ? reason.message : "Typing progress could not be loaded.",
          );
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [ready, user]);

  const finish = useCallback(() => {
    if (finished || settled.current || startedAt === null) return;
    settled.current = true;
    const seconds = Math.min(duration, (performance.now() - startedAt) / 1000);
    const score = scoreAttempt({
      typedText: typed,
      reference: passage.words,
      seconds,
      keystrokes: keystrokes.current,
    });
    setFinished(true);
    setResult(score);
    const passageLabel = custom
      ? "Your passage"
      : `${Number(passageId) + 1}. ${typingPassages[Number(passageId)]?.title ?? "Passage"}`;
    const attempt = parseTypingAttempt({
      passageLabel,
      passageIndex: custom ? null : Number(passageId),
      durationSeconds: duration,
      seconds,
      gross: score.gross,
      net: score.net,
      accuracy: score.accuracy,
      mistakes: score.mistakes,
      fullMistakes: score.fullMistakes,
      halfMistakes: score.counts.half,
      wrong: score.counts.sub,
      missed: score.counts.missed,
      extra: score.counts.extra,
      errorPercent: score.errorPercent,
      characters: score.chars,
      keystrokes: score.keystrokes,
      backspace: allowBackspace,
      pass: score.pass,
    });
    if (!attempt) return;
    const row: TypingAttemptRow = { ...attempt, createdAt: new Date().toISOString() };
    setAttempts((current) => {
      const next = [row, ...current].slice(0, 100);
      if (!user) writeLocal(next);
      return next;
    });
    if (!user) return;
    void fetch("/api/account/typing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(attempt),
    })
      .then(async (response) => {
        if (!response.ok) {
          const body = (await response.json()) as { error?: string };
          setProgressNote(body.error || "This attempt could not be saved on your account.");
        }
      })
      .catch(() => setProgressNote("This attempt could not be saved on your account."));
  }, [
    finished,
    startedAt,
    duration,
    typed,
    passage.words,
    custom,
    passageId,
    allowBackspace,
    user,
  ]);

  const finishRef = useRef(finish);
  useEffect(() => {
    finishRef.current = finish;
  }, [finish]);

  useEffect(() => {
    if (startedAt === null || finished) return;
    const timer = setInterval(() => {
      const tick = performance.now();
      setNow(tick);
      if ((tick - startedAt) / 1000 >= duration) finishRef.current();
    }, 250);
    return () => clearInterval(timer);
  }, [startedAt, finished, duration]);

  useEffect(() => {
    if (result) resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [result]);

  useEffect(() => {
    const box = passageRef.current;
    if (!box || !highlight) return;
    const words = box.querySelectorAll<HTMLElement>("span[data-w]");
    const word = words[Math.max(0, Math.min(currentWord, words.length - 1))];
    if (!word) return;
    const top = word.offsetTop - box.offsetTop;
    if (top > box.scrollTop + box.clientHeight - 60 || top < box.scrollTop) {
      box.scrollTop = top - 40;
    }
  }, [currentWord, highlight, passage.words]);

  function blockClipboard(event: { preventDefault: () => void }) {
    event.preventDefault();
  }

  function onType(next: string) {
    if (finished) return;
    if (!allowBackspace && next.length < typed.length) return;
    if (startedAt === null && next.length > 0) {
      const stamp = performance.now();
      setNow(stamp);
      setStartedAt(stamp);
    }
    setTyped(next);
  }

  const characterTarget = Math.round((duration / 60) * TARGET_WPM * 5);

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="max-w-2xl text-sm leading-6 text-[#52606d]">
          Delhi High Court SPA / PA · Stage I English typing test. Results stay in this browser.
          Speed counts every character, including spaces. A capital or punctuation slip is half a
          mistake.
        </p>
        <span className="rounded-md border border-[#d5dee6] bg-[#ffffff] px-2 py-1 font-mono text-xs text-[#52606d]">
          Qualify: at least {TARGET_WPM} wpm · mistakes at most {MISTAKE_LIMIT * 100}% · 10 min
        </span>
      </div>

      <div className="flex flex-wrap items-end gap-x-5 gap-y-3 rounded-2xl border border-[#d5dee6] bg-[#ffffff] px-4 py-3">
        <label className="grid gap-1">
          <span className="text-xs font-semibold tracking-wider text-[#52606d] uppercase">
            Passage
          </span>
          <select
            className="max-w-full rounded-md border border-[#d5dee6] bg-[#ffffff] px-3 py-2 text-sm"
            value={passageId}
            onChange={(event) => {
              setPassageId(event.target.value);
              reset();
            }}
          >
            {typingPassages.map((item, index) => (
              <option key={item.title} value={index}>
                {index + 1}. {item.title}
              </option>
            ))}
            <option value="custom">Paste your own passage</option>
          </select>
        </label>
        <label className="grid gap-1">
          <span className="text-xs font-semibold tracking-wider text-[#52606d] uppercase">
            Duration
          </span>
          <select
            className="rounded-md border border-[#d5dee6] bg-[#ffffff] px-3 py-2 text-sm"
            value={duration}
            onChange={(event) => {
              setDuration(Number(event.target.value));
              reset();
            }}
          >
            {durations.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 pb-2 text-sm">
          <input
            type="checkbox"
            checked={allowBackspace}
            onChange={(event) => setAllowBackspace(event.target.checked)}
          />
          Allow backspace
        </label>
        <label className="flex items-center gap-2 pb-2 text-sm">
          <input
            type="checkbox"
            checked={highlight}
            onChange={(event) => setHighlight(event.target.checked)}
          />
          Highlight current word
        </label>
        <div className="flex flex-wrap gap-2 sm:ml-auto">
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-10 items-center rounded-full border border-[#1c2834] px-4 text-sm font-medium"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={finish}
            disabled={startedAt === null || finished}
            className="inline-flex h-10 items-center rounded-full bg-[#1c2834] px-4 text-sm font-medium text-[#f3f5f7] disabled:opacity-50"
          >
            Submit test
          </button>
        </div>
      </div>

      {custom ? (
        <div className="grid gap-2">
          <label htmlFor="custom-passage" className="text-xs font-semibold tracking-wider text-[#52606d] uppercase">
            Paste a judgment or order to practise with
          </label>
          <textarea
            id="custom-passage"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            className="min-h-28 w-full rounded-lg border border-[#d5dee6] bg-[#ffffff] px-4 py-3 text-sm"
            placeholder="Copy a few paragraphs from a Delhi High Court judgment and paste them here."
          />
          <div>
            <button
              type="button"
              onClick={() => {
                setCustomText(draft);
                reset();
              }}
              className="inline-flex h-10 items-center rounded-full bg-[#1c2834] px-4 text-sm font-medium text-[#f3f5f7]"
            >
              Load passage
            </button>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Time left" value={formatClock(remaining)} tone={remaining <= 60 ? "bad" : "accent"} />
        <Stat label="Gross speed" value={`${liveGross} wpm`} />
        <Stat label="Words typed" value={String(typedWords.length)} />
        <Stat label="Characters, with spaces" value={`${liveChars} / ${characterTarget}`} />
      </div>

      <div
        ref={passageRef}
        aria-label="Passage to type"
        onCopy={blockClipboard}
        onCut={blockClipboard}
        onDragStart={blockClipboard}
        className="typing-passage relative max-h-64 overflow-y-auto rounded-lg border border-[#d5dee6] bg-[#ffffff] px-5 py-4 font-serif text-[1.05rem] leading-8 select-none"
      >
        <div className="mb-1 font-sans text-xs font-semibold tracking-wider text-[#52606d] uppercase">
          {passage.title}
        </div>
        {passage.words.map((word, index) => (
          <span key={`${word}-${index}`}>
            <span data-w="" className={highlight && index === currentWord ? "cw" : undefined}>
              {word}
            </span>{" "}
          </span>
        ))}
      </div>

      <div className="grid gap-2">
        <textarea
          value={typed}
          disabled={finished}
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          aria-label="Type the passage here"
          placeholder="Click here and start typing. The timer starts on your first key."
          onChange={(event) => onType(event.target.value)}
          onKeyDown={(event) => {
            if (finished) return;
            if (!allowBackspace && (event.key === "Backspace" || event.key === "Delete")) {
              event.preventDefault();
              return;
            }
            if (event.key.length === 1 || event.key === "Backspace" || event.key === "Enter") {
              keystrokes.current += 1;
            }
          }}
          onPaste={blockClipboard}
          onDrop={blockClipboard}
          onCopy={blockClipboard}
          onCut={blockClipboard}
          onContextMenu={blockClipboard}
          className="min-h-52 w-full resize-y rounded-lg border-2 border-[#d5dee6] bg-[#ffffff] px-5 py-4 font-serif text-[1.05rem] leading-8 text-[#1c2834] focus:border-[#1d4e89] focus:outline-none disabled:opacity-70"
        />
        <p className="text-sm text-[#52606d]">
          Copy and paste are disabled, as in the exam. Type exactly as shown, including capitals,
          punctuation and spacing.
        </p>
      </div>

      {result ? <ResultCard result={result} resultRef={resultRef} /> : null}

      <ProgressTable attempts={attempts} signedIn={Boolean(user)} note={progressNote} />
    </div>
  );
}

function ProgressTable({
  attempts,
  signedIn,
  note,
}: {
  attempts: TypingAttemptRow[];
  signedIn: boolean;
  note: string;
}) {
  const summary = summarizeAttempts(attempts);
  const gap = !summary
    ? ""
    : summary.examPasses > 0
      ? `You have cleared the 10 minute test ${summary.examPasses} ${summary.examPasses === 1 ? "time" : "times"}.`
      : summary.examBestGross === null
        ? "The 40 wpm line is for the 10 minute test. Shorter attempts are practice."
        : summary.examBestGross < TARGET_WPM
          ? `${Math.ceil(TARGET_WPM - summary.examBestGross)} wpm still to reach 40 on a 10 minute attempt.`
          : "Your best 10 minute gross has reached 40 wpm. A pass also needs mistakes at or under 3%.";
  return (
    <section id="progress" className="grid scroll-mt-24 gap-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 className="font-medium">Your progress</h2>
        <p className="text-sm text-[#52606d]">
          {signedIn ? (
            "Saved on this account."
          ) : (
            <>
              Saved on this device.{" "}
              <Link href="/sign-in" className="underline underline-offset-4">
                Sign in
              </Link>{" "}
              to keep it on your account.
            </>
          )}
        </p>
      </div>
      {note ? <p className="text-sm text-[#1d4e89]">{note}</p> : null}
      {summary ? (
        <>
          <p className="text-sm leading-6 text-[#52606d]">{gap}</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Best gross" value={`${summary.bestGross.toFixed(1)} wpm`} tone="accent" />
            <Stat label="Best net" value={`${summary.bestNet.toFixed(1)} wpm`} />
            <Stat
              label="Last 5 average"
              value={`${summary.recentAverage.toFixed(1)} wpm`}
            />
            <Stat
              label="Passed"
              value={`${summary.passes} of ${summary.count}`}
              tone={summary.passes ? "accent" : undefined}
            />
          </div>
          <p className="text-sm text-[#52606d]">
            {summary.change === null
              ? "This is the first saved attempt."
              : `${summary.change >= 0 ? "+" : ""}${summary.change.toFixed(1)} wpm gross since the previous attempt.`}{" "}
            Lowest mistake rate so far is {summary.lowestError.toFixed(2)}%.
          </p>
        </>
      ) : (
        <p className="text-sm text-[#52606d]">
          Finish a test to see your best speed, how the last attempt compares, and whether you have cleared 40 wpm with 3% mistakes.
        </p>
      )}
      <div className="overflow-x-auto rounded-lg border border-[#d5dee6] bg-[#ffffff]">
        <table className="w-full border-collapse text-sm tabular-nums">
          <thead>
            <tr>
              {[
                "Date",
                "Passage",
                "Set",
                "Typed",
                "Gross",
                "Net",
                "Accuracy",
                "Mistakes",
                "Error %",
                "Backspace",
                "Result",
              ].map((heading) => (
                <th
                  key={heading}
                  className="border-b border-[#d5dee6] px-3 py-2 text-left text-xs font-semibold tracking-wider whitespace-nowrap text-[#52606d] uppercase"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {attempts.length ? (
              attempts.map((attempt, index) => (
                <tr
                  key={`${attempt.createdAt}-${index}`}
                  className="[&>td]:border-b [&>td]:border-[#d5dee6] [&>td]:px-3 [&>td]:py-2 [&>td]:whitespace-nowrap"
                >
                  <td>{formatWhen(attempt.createdAt)}</td>
                  <td>{attempt.passageLabel}</td>
                  <td>{formatClock(attempt.durationSeconds)}</td>
                  <td>{formatClock(attempt.seconds)}</td>
                  <td>{attempt.gross.toFixed(1)}</td>
                  <td>{attempt.net.toFixed(1)}</td>
                  <td>{attempt.accuracy.toFixed(0)}%</td>
                  <td>{attempt.mistakes % 1 ? attempt.mistakes.toFixed(1) : attempt.mistakes}</td>
                  <td>{attempt.errorPercent.toFixed(2)}%</td>
                  <td>{attempt.backspace ? "On" : "Off"}</td>
                  <td>
                    <span
                      className={
                        attempt.pass
                          ? "rounded-full bg-[#e5f2ea] px-2 py-0.5 text-xs font-bold text-[#1d7a4c]"
                          : "rounded-full bg-[#fbe4e2] px-2 py-0.5 text-xs font-bold text-[#9b2c2c]"
                      }
                    >
                      {attempt.pass ? "Pass" : "Fail"}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={11} className="px-3 py-3 text-[#52606d]">
                  No attempts yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function formatWhen(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "bad" | "accent" }) {
  const toneClass = tone === "bad" ? "text-[#9b2c2c]" : tone === "accent" ? "text-[#1d4e89]" : "";
  return (
    <div className="rounded-lg border border-[#d5dee6] bg-[#ffffff] px-4 py-3">
      <span className="text-xs font-semibold tracking-wider text-[#52606d] uppercase">{label}</span>
      <b className={`block font-mono text-xl font-medium tabular-nums ${toneClass}`}>{value}</b>
    </div>
  );
}

function ResultCard({
  result,
  resultRef,
}: {
  result: TypingScore;
  resultRef: RefObject<HTMLElement | null>;
}) {
  const allowed = (MISTAKE_LIMIT * result.wordUnits).toFixed(1);
  const mistakeLabel = result.mistakes % 1 ? result.mistakes.toFixed(1) : String(result.mistakes);
  return (
    <section ref={resultRef} className="grid scroll-mt-6 gap-4">
      <div
        className={
          result.pass
            ? "flex flex-wrap items-baseline gap-x-4 gap-y-1 rounded-lg border border-[#1d7a4c] bg-[#e5f2ea] px-4 py-3"
            : "flex flex-wrap items-baseline gap-x-4 gap-y-1 rounded-lg border border-[#9b2c2c] bg-[#fbe4e2] px-4 py-3"
        }
      >
        <strong className={result.pass ? "text-lg text-[#1d7a4c]" : "text-lg text-[#9b2c2c]"}>
          {result.pass ? "Qualified" : "Not qualified yet"}
        </strong>
        <span>
          {result.gross.toFixed(1)} wpm gross · {result.errorPercent.toFixed(2)}% mistakes in{" "}
          {formatClock(result.seconds)}
        </span>
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
        <ScoreStat
          label="Gross speed"
          value={result.gross.toFixed(1)}
          note={`${result.chars} characters with spaces ÷ 5 ÷ ${result.minutes.toFixed(1)} min · ${result.keystrokes} keys pressed`}
        />
        <ScoreStat label="Net speed" value={result.net.toFixed(1)} note="wpm after mistakes" />
        <ScoreStat
          label="Accuracy"
          value={`${result.accuracy.toFixed(1)}%`}
          note={`${result.counts.ok} of ${result.typedCount} words exact`}
        />
        <ScoreStat label="Total mistakes" value={mistakeLabel} note={`allowed ${allowed} (3%)`} />
        <ScoreStat
          label="Full mistakes"
          value={String(result.fullMistakes)}
          note={`${result.counts.sub} wrong · ${result.counts.missed} missed · ${result.counts.extra} extra`}
        />
        <ScoreStat
          label="Half mistakes"
          value={String(result.counts.half)}
          note="capital / punctuation only"
        />
      </div>
      <ul className="grid gap-1 rounded-lg border border-[#d5dee6] bg-[#ffffff] px-4 py-3 text-sm">
        {result.tips.map((tip) => (
          <li key={tip}>• {tip}</li>
        ))}
      </ul>
      <h2 className="font-medium">Word-by-word check</h2>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-[#52606d]">
        <span>
          <span className="rounded bg-[#fbe4e2] px-0.5 text-[#9b2c2c]">wrong</span> typed vs correct
        </span>
        <span>
          <span className="rounded bg-[#f4ead2] px-0.5 text-[#8a5a00]">half</span> case/punctuation
        </span>
        <span>
          <span className="rounded bg-[#fbe4e2] px-0.5 text-[#9b2c2c] line-through opacity-85">
            missed
          </span>{" "}
          omitted
        </span>
        <span>
          <span className="rounded bg-[#f4ead2] px-0.5 text-[#8a5a00] underline decoration-wavy">
            extra
          </span>{" "}
          added
        </span>
      </div>
      <div className="max-h-96 overflow-y-auto rounded-lg border border-[#d5dee6] bg-[#ffffff] px-5 py-4 font-serif text-[1.05rem] leading-8">
        {result.aligned.length ? (
          result.aligned.map((word, index) => <CheckedWord key={index} word={word} />)
        ) : (
          <em>Nothing typed.</em>
        )}
      </div>
    </section>
  );
}

function ScoreStat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-lg border border-[#d5dee6] bg-[#ffffff] px-4 py-3">
      <span className="text-xs font-semibold tracking-wider text-[#52606d] uppercase">{label}</span>
      <b className="block font-mono text-xl font-medium tabular-nums">{value}</b>
      <small className="text-[#52606d]">{note}</small>
    </div>
  );
}

function CheckedWord({ word }: { word: AlignedWord }) {
  if (word.kind === "ok") return <>{word.typed} </>;
  if (word.kind === "half") {
    return (
      <>
        <span className="rounded bg-[#f4ead2] px-0.5 text-[#8a5a00]" title={`Should be: ${word.expected}`}>
          {word.typed}
        </span>{" "}
      </>
    );
  }
  if (word.kind === "sub") {
    return (
      <>
        <span className="rounded bg-[#fbe4e2] px-0.5 text-[#9b2c2c]" title={`Should be: ${word.expected}`}>
          {word.typed} <s className="opacity-70">{word.expected}</s>
        </span>{" "}
      </>
    );
  }
  if (word.kind === "missed") {
    return (
      <>
        <span className="rounded bg-[#fbe4e2] px-0.5 text-[#9b2c2c] line-through opacity-85" title="Missed word">
          {word.expected}
        </span>{" "}
      </>
    );
  }
  return (
    <>
      <span className="rounded bg-[#f4ead2] px-0.5 text-[#8a5a00] underline decoration-wavy" title="Extra word">
        {word.typed}
      </span>{" "}
    </>
  );
}
