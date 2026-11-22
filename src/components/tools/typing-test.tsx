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
import { useRouter } from "next/navigation";
import { AppSelect } from "@/components/app-select";
import { useAuth } from "@/components/auth-provider";
import { typingPassages } from "@/lib/typing-passages";
import { parseTypingAttempt } from "@/lib/typing-progress";
import {
  MISTAKE_LIMIT,
  TARGET_WPM,
  formatClock,
  scoreAttempt,
  wordsOf,
  type AlignedWord,
  type TypingScore,
} from "@/lib/typing-score";

const durations = [
  { value: "600", label: "10 min (exam)" },
  { value: "300", label: "5 min" },
  { value: "120", label: "2 min" },
  { value: "60", label: "1 min" },
];

const passageOptions = [
  ...typingPassages.map((item, index) => ({
    value: String(index),
    label: `${index + 1}. ${item.title}`,
  })),
  { value: "custom", label: "Paste your own passage" },
];

export function TypingTest() {
  const [passageId, setPassageId] = useState("0");
  const [duration, setDuration] = useState("600");
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
  const router = useRouter();
  const [saveNote, setSaveNote] = useState("");
  const [signInPrompt, setSignInPrompt] = useState(false);
  const signedIn = Boolean(user);

  const custom = passageId === "custom";
  const passage = useMemo(() => {
    if (custom) {
      const text = customText.trim();
      return { title: "Your passage", words: text ? wordsOf(text) : [] };
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
    setSaveNote("");
    keystrokes.current = 0;
    settled.current = false;
    if (passageRef.current) passageRef.current.scrollTop = 0;
  }, []);

  const durationSeconds = Number(duration);
  const running = startedAt !== null && !finished;
  const passageReady = passage.words.length > 0;
  const elapsed = startedAt === null ? 0 : Math.min(durationSeconds, (now - startedAt) / 1000);
  const remaining = durationSeconds - elapsed;
  const typedWords = wordsOf(typed);
  const currentWord = typedWords.length - (/\s$/.test(typed) || !typed ? 0 : 1);
  const liveChars = typed.replace(/\r?\n/g, " ").length;
  const liveGross =
    startedAt === null ? 0 : Math.round(liveChars / 5 / (Math.max(elapsed, 1) / 60));

  const requestReset = useCallback(() => {
    if (!ready) return;
    if (!signedIn) {
      setSignInPrompt(true);
      return;
    }
    reset();
  }, [ready, reset, signedIn]);

  useEffect(() => {
    if (!signInPrompt) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setSignInPrompt(false);
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [signInPrompt]);

  const finish = useCallback(() => {
    if (finished || settled.current || startedAt === null) return;
    settled.current = true;
    const seconds = Math.min(durationSeconds, (performance.now() - startedAt) / 1000);
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
      durationSeconds,
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
    if (!attempt || !signedIn) return;
    setSaveNote("");
    void fetch("/api/account/typing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(attempt),
    })
      .then(async (response) => {
        if (!response.ok) {
          const body = (await response.json()) as { error?: string };
          setSaveNote(body.error || "This attempt could not be saved on your account.");
          return;
        }
        setSaveNote("Saved on your account.");
      })
      .catch(() => setSaveNote("This attempt could not be saved on your account."));
  }, [
    finished,
    startedAt,
    durationSeconds,
    typed,
    passage.words,
    custom,
    passageId,
    allowBackspace,
    signedIn,
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
      if ((tick - startedAt) / 1000 >= durationSeconds) finishRef.current();
    }, 250);
    return () => clearInterval(timer);
  }, [startedAt, finished, durationSeconds]);

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
    if (finished || !passageReady) return;
    if (!allowBackspace && next.length < typed.length) return;
    if (startedAt === null && next.length > 0) {
      const stamp = performance.now();
      setNow(stamp);
      setStartedAt(stamp);
    }
    setTyped(next);
  }

  const characterTarget = Math.round((durationSeconds / 60) * TARGET_WPM * 5);

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 rounded-2xl border border-[#d5dee6] bg-[#ffffff] px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="font-medium">{signedIn ? "1. Set the test" : "Example test"}</h2>
          <p className="text-sm text-[#52606d]">
            {signedIn
              ? running
                ? "Reset to change the passage or the time."
                : "Choose these before you start."
              : "This example stays as it is. Sign in to change it or start again."}
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_14rem]">
          <AppSelect
            label="Passage"
            value={passageId}
            options={passageOptions}
            searchable
            disabled={!signedIn || running}
            onChange={(value) => {
              setPassageId(value);
              reset();
            }}
          />
          <AppSelect
            label="Time"
            value={duration}
            options={durations}
            disabled={!signedIn || running}
            onChange={(value) => {
              setDuration(value);
              reset();
            }}
          />
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={allowBackspace}
              disabled={!signedIn}
              onChange={(event) => setAllowBackspace(event.target.checked)}
            />
            Allow backspace
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={highlight}
              onChange={(event) => setHighlight(event.target.checked)}
            />
            Highlight the word you are on
          </label>
        </div>
        <p className="text-sm leading-6 text-[#52606d]">
          A pass is {TARGET_WPM} wpm with mistakes at or under {MISTAKE_LIMIT * 100}%, and that line
          is only for the 10 minute setting. Speed counts every character, including spaces. A
          capital or punctuation slip is half a mistake.
        </p>
        {custom ? (
          <div className="grid gap-2 border-t border-[#d5dee6] pt-4">
            <label
              htmlFor="custom-passage"
              className="text-xs font-semibold tracking-wider text-[#52606d] uppercase"
            >
              Your passage
            </label>
            <textarea
              id="custom-passage"
              value={draft}
              disabled={!signedIn || running}
              onChange={(event) => setDraft(event.target.value)}
              className="min-h-28 w-full rounded-xl border border-[#d5dee6] bg-[#ffffff] px-4 py-3 text-sm disabled:opacity-70"
              placeholder="Paste a judgment or order, then load it."
            />
            <div>
              <button
                type="button"
                disabled={!signedIn || running || !draft.trim()}
                onClick={() => {
                  setCustomText(draft);
                  reset();
                }}
                className="inline-flex h-10 items-center rounded-full bg-[#1c2834] px-4 text-sm font-medium text-[#f3f5f7] disabled:opacity-50"
              >
                Load passage
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-[#52606d]">
            The chosen passage comes first. The other passages follow, so a long test does not run
            out of text.
          </p>
        )}
      </section>

      <section className="grid gap-4">
        <h2 className="font-medium">{signedIn ? "2. Type the passage" : "Type the passage"}</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat
            label={result ? "Time used" : "Time left"}
            value={formatClock(result ? result.seconds : remaining)}
            tone={!result && remaining <= 60 && running ? "bad" : "accent"}
          />
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
            Read this · {passage.title}
          </div>
          {passage.words.length ? (
            passage.words.map((word, index) => (
              <span key={`${word}-${index}`}>
                <span data-w="" className={highlight && index === currentWord ? "cw" : undefined}>
                  {word}
                </span>{" "}
              </span>
            ))
          ) : (
            <p className="font-sans text-sm text-[#52606d]">
              Load a passage above. The timer starts when you type the first character.
            </p>
          )}
        </div>

        <div className="grid gap-2">
          <label htmlFor="typing-input" className="text-xs font-semibold tracking-wider text-[#52606d] uppercase">
            Type here
          </label>
          <textarea
            id="typing-input"
            value={typed}
            disabled={finished || !passageReady}
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            placeholder={
              passageReady
                ? "The timer starts on your first character."
                : "Load a passage before typing."
            }
            onChange={(event) => onType(event.target.value)}
            onKeyDown={(event) => {
              if (finished || !passageReady) return;
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
            Copy and paste are turned off. Match the capitals, punctuation, and spaces.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={requestReset}
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
      </section>

      {result ? (
        <ResultCard result={result} resultRef={resultRef} exam={durationSeconds === 600} />
      ) : null}
      {result && signedIn ? (
        <p className="text-sm text-[#52606d]">
          {saveNote || "Saving this attempt."}{" "}
          <Link href="/tools/typing/progress" className="font-medium text-[#1d4e89] underline underline-offset-4">
            View progress
          </Link>
        </p>
      ) : null}
      {result && ready && !signedIn ? (
        <p className="text-sm text-[#52606d]">
          This example is not saved. Sign in to keep your results and start again.
        </p>
      ) : null}
      {signInPrompt ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#1c2834]/50 px-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-sign-in-title"
            className="w-full max-w-md rounded-2xl border border-[#d5dee6] bg-[#ffffff] p-5 shadow-xl"
          >
            <h2 id="reset-sign-in-title" className="text-lg font-medium">
              Sign in to reset
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#52606d]">
              This example stays on the page. Sign in to reset it, choose another passage, and save
              your progress.
            </p>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setSignInPrompt(false)}
                className="inline-flex h-10 items-center rounded-full border border-[#1c2834] px-4 text-sm font-medium"
              >
                Keep the example
              </button>
              <button
                type="button"
                onClick={() => router.push("/sign-in")}
                className="inline-flex h-10 items-center rounded-full bg-[#1c2834] px-4 text-sm font-medium text-[#f3f5f7]"
              >
                Sign in
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
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
  exam,
}: {
  result: TypingScore;
  resultRef: RefObject<HTMLElement | null>;
  exam: boolean;
}) {
  const allowed = (MISTAKE_LIMIT * result.wordUnits).toFixed(1);
  const mistakeLabel = result.mistakes % 1 ? result.mistakes.toFixed(1) : String(result.mistakes);
  const qualified = exam && result.pass;
  const failedExam = exam && !result.pass;
  return (
    <section ref={resultRef} className="grid scroll-mt-6 gap-4">
      <div
        className={
          qualified
            ? "flex flex-wrap items-baseline gap-x-4 gap-y-1 rounded-lg border border-[#1d7a4c] bg-[#e5f2ea] px-4 py-3"
            : failedExam
              ? "flex flex-wrap items-baseline gap-x-4 gap-y-1 rounded-lg border border-[#9b2c2c] bg-[#fbe4e2] px-4 py-3"
              : "flex flex-wrap items-baseline gap-x-4 gap-y-1 rounded-lg border border-[#1d4e89] bg-[#e7eef5] px-4 py-3"
        }
      >
        <strong
          className={
            qualified ? "text-lg text-[#1d7a4c]" : failedExam ? "text-lg text-[#9b2c2c]" : "text-lg text-[#1d4e89]"
          }
        >
          {exam ? (result.pass ? "Qualified" : "Not qualified yet") : "Practice result"}
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
