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
import { LeaveGuard } from "@/components/leave-guard";
import { ConfirmStartDialog, SignInModal } from "@/components/start-dialogs";
import { useTestChrome } from "@/components/test-chrome";
import { examBodies, type ExamChoice } from "@/lib/exam-bodies";
import { usePracticeCatalog } from "@/lib/practice-catalog";
import { typingPassages, type TypingPassage } from "@/lib/typing-passages";
import { clearLocalDraft, writeLocalDraft } from "@/lib/local-draft";
import { parseTypingAttempt } from "@/lib/typing-progress";
import {
  MISTAKE_LIMIT,
  formatClock,
  scoreAttempt,
  wordsOf,
  type AlignedWord,
  type TypingScore,
} from "@/lib/typing-score";

const durationChoices = [
  { value: "300", label: "5 min" },
  { value: "600", label: "10 min" },
  { value: "900", label: "15 min" },
];

const TYPING_DRAFT_KEY = "papernikalo-typing-draft";

function passageFits(item: TypingPassage, examId: string) {
  if (item.examId && item.examId !== examId) return false;
  return true;
}

export function TypingExam() {
  const catalog = usePracticeCatalog();
  const passages = useMemo(
    () => [...typingPassages, ...catalog.typing],
    [catalog.typing],
  );
  const exams = useMemo(() => {
    const extra = catalog.exams.filter((item) => !examBodies.some((built) => built.id === item.id));
    return [...examBodies, ...extra];
  }, [catalog.exams]);
  return <TypingTest passages={passages} exams={exams} />;
}

export function TypingTest({
  passages = typingPassages,
  exams = examBodies,
}: {
  passages?: TypingPassage[];
  exams?: readonly ExamChoice[];
}) {
  const [phase, setPhase] = useState<"setup" | "test" | "result">("setup");
  const [examId, setExamId] = useState("dhc");
  const [language, setLanguage] = useState("English");
  const [passageChoice, setPassageChoice] = useState("random");
  const [passageId, setPassageId] = useState("0");
  const [duration, setDuration] = useState("600");
  const [allowBackspace, setAllowBackspace] = useState(true);
  const [highlight, setHighlight] = useState(false);
  const [paused, setPaused] = useState(false);
  const [typed, setTyped] = useState("");
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  const [now, setNow] = useState(0);
  const [result, setResult] = useState<TypingScore | null>(null);
  const keystrokes = useRef(0);
  const settled = useRef(false);
  const passageRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const { user, ready } = useAuth();
  const [saveNote, setSaveNote] = useState("");
  const [gate, setGate] = useState<"closed" | "sign-in" | "confirm">("closed");
  const pendingFinish = useRef<{ fromTimer?: boolean } | null>(null);
  const pausedForSignIn = useRef(false);
  const pauseStarted = useRef<number | null>(null);
  const requestFinishRef = useRef<(options?: { fromTimer?: boolean }) => void>(() => {});
  const signedIn = Boolean(user);
  const passageChoices = [
    { value: "random", label: "Random passage" },
    ...passages.flatMap((item, index) =>
      passageFits(item, examId)
        ? [{ value: String(index), label: item.minutes ? `${item.title} · ${item.minutes} min` : item.title }]
        : [],
    ),
  ];
  const exam = exams.find((item) => item.id === examId) ?? examBodies[2];
  useTestChrome(phase === "test");

  useEffect(() => {
    if (passageChoice === "random") return;
    const item = passages[Number(passageChoice)];
    if (!item || !passageFits(item, examId)) setPassageChoice("random");
  }, [examId, passageChoice, passages]);

  useEffect(() => {
    if (phase !== "test") {
      clearLocalDraft(TYPING_DRAFT_KEY);
      return;
    }
    writeLocalDraft(
      TYPING_DRAFT_KEY,
      JSON.stringify({ typed, passageId, examId, language, duration, allowBackspace }),
    );
  }, [phase, typed, passageId, examId, language, duration, allowBackspace]);

  const passage = useMemo(() => {
    const fitting = passages.filter((item) => passageFits(item, examId));
    const start = passages[Number(passageId)];
    const ordered =
      start && passageFits(start, examId)
        ? [start, ...fitting.filter((item) => item !== start)]
        : fitting;
    const source = ordered.length ? ordered : passages;
    return {
      title: source[0]?.title ?? "Passage",
      words: wordsOf(source.map((item) => item.text).join(" ")),
    };
  }, [examId, passageId, passages]);

  const reset = useCallback(() => {
    setTyped("");
    setStartedAt(null);
    setFinished(false);
    setResult(null);
    setNow(0);
    setSaveNote("");
    setPaused(false);
    pauseStarted.current = null;
    keystrokes.current = 0;
    settled.current = false;
    if (passageRef.current) passageRef.current.scrollTop = 0;
  }, []);

  const abandonTest = useCallback(() => {
    clearLocalDraft(TYPING_DRAFT_KEY);
    reset();
    setPhase("setup");
  }, [reset]);

  const durationSeconds = Number(duration);
  const passageReady = passage.words.length > 0;
  const elapsed = startedAt === null ? 0 : Math.min(durationSeconds, (now - startedAt) / 1000);
  const remaining = durationSeconds - elapsed;
  const typedWords = wordsOf(typed);
  const currentWord = typedWords.length - (/\s$/.test(typed) || !typed ? 0 : 1);
  const liveChars = typed.replace(/\r?\n/g, " ").length;
  const liveGross =
    startedAt === null ? 0 : Math.round(liveChars / 5 / (Math.max(elapsed, 1) / 60));

  const finish = useCallback((options?: { fromTimer?: boolean; save?: boolean }) => {
    if (finished || settled.current || startedAt === null) return;
    if (!options?.fromTimer && typed.trim().length === 0) return;
    settled.current = true;
    const pauseHold =
      pauseStarted.current === null ? 0 : Math.max(0, performance.now() - pauseStarted.current);
    const seconds = Math.min(
      durationSeconds,
      Math.max(0, (performance.now() - startedAt - pauseHold) / 1000),
    );
    const score = scoreAttempt({
      typedText: typed,
      reference: passage.words,
      seconds,
      keystrokes: keystrokes.current,
    });
    setFinished(true);
    setPaused(false);
    setResult(score);
    setPhase("result");
    const passageLabel = `${Number(passageId) + 1}. ${passages[Number(passageId)]?.title ?? "Passage"}`;
    const attempt = parseTypingAttempt({
      passageLabel,
      passageIndex: Number(passageId),
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
    if (!attempt || !(options?.save ?? signedIn)) return;
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
    passageId,
    passages,
    allowBackspace,
    signedIn,
  ]);

  const finishRef = useRef(finish);
  useEffect(() => {
    finishRef.current = finish;
  }, [finish]);

  useEffect(() => {
    if (!ready || !pendingFinish.current) return;
    if (!user) {
      if (!pendingFinish.current.fromTimer && pauseStarted.current === null) {
        pauseStarted.current = performance.now();
        pausedForSignIn.current = true;
        setPaused(true);
      }
      setGate("sign-in");
      return;
    }
    const pending = pendingFinish.current;
    pendingFinish.current = null;
    pausedForSignIn.current = false;
    setGate("closed");
    finishRef.current({ ...pending, save: true });
  }, [ready, user]);

  useEffect(() => {
    if (startedAt === null || finished || paused) return;
    const timer = setInterval(() => {
      const tick = performance.now();
      setNow(tick);
      if ((tick - startedAt) / 1000 >= durationSeconds) requestFinishRef.current({ fromTimer: true });
    }, 250);
    return () => clearInterval(timer);
  }, [startedAt, finished, durationSeconds, paused]);

  useEffect(() => {
    if (result) resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [result]);

  useEffect(() => {
    const box = passageRef.current;
    if (!box || phase !== "test") return;
    const words = box.querySelectorAll<HTMLElement>("span[data-w]");
    if (!words.length) return;
    const word = words[Math.max(0, Math.min(currentWord, words.length - 1))];
    const raw = word.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop;
    const top = Math.round(raw / 38) * 38;
    if (Math.abs(box.scrollTop - top) < 2) return;
    box.scrollTo({ top, behavior: "smooth" });
  }, [currentWord, passage.words, phase]);

  function blockClipboard(event: { preventDefault: () => void }) {
    event.preventDefault();
  }

  function onType(next: string) {
    if (finished || !passageReady) return;
    if (!allowBackspace && next.length < typed.length) return;
    setTyped(next);
  }

  const durationLabel =
    durationChoices.find((item) => item.value === duration)?.label ??
    `${Math.max(1, Math.round(Number(duration) / 60))} min`;
  const completedCount = /\s$/.test(typed) ? typedWords.length : Math.max(0, typedWords.length - 1);
  let correctCount = 0;
  for (let index = 0; index < completedCount; index += 1) {
    if (typedWords[index] === passage.words[index]) correctCount += 1;
  }
  const liveAccuracy = completedCount === 0 ? 100 : (correctCount / completedCount) * 100;
  const progress = passage.words.length
    ? Math.min(100, (typedWords.length / passage.words.length) * 100)
    : 0;

  function choosePassage(value: string) {
    setPassageChoice(value);
    if (value === "random") return;
    setPassageId(value);
    const item = passages[Number(value)];
    if (item?.language) setLanguage(item.language);
    const savedMinutes = passages[Number(value)]?.minutes;
    if (savedMinutes) setDuration(String(savedMinutes * 60));
  }

  function begin() {
    let nextId = passageChoice === "random" ? passageId : passageChoice;
    if (passageChoice === "random") {
      const pool = passages
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => passageFits(item, examId));
      const source = pool.length ? pool : passages.map((item, index) => ({ item, index }));
      const pick = source[Math.floor(Math.random() * source.length)];
      if (pick) {
        nextId = String(pick.index);
        setPassageId(nextId);
      }
    }
    const savedMinutes = passages[Number(nextId)]?.minutes;
    if (savedMinutes) setDuration(String(savedMinutes * 60));
    const savedLanguage = passages[Number(nextId)]?.language;
    if (savedLanguage) setLanguage(savedLanguage);
    reset();
    const stamp = performance.now();
    setNow(stamp);
    setStartedAt(stamp);
    setPhase("test");
  }

  function requestStart() {
    setGate("confirm");
  }

  function requestFinish(options?: { fromTimer?: boolean }) {
    if (finished || settled.current || startedAt === null || pendingFinish.current) return;
    if (!options?.fromTimer && typed.trim().length === 0) return;
    if (!ready || !user) {
      pendingFinish.current = options ?? {};
      if (!ready) return;
      if (!options?.fromTimer && pauseStarted.current === null) {
        pauseStarted.current = performance.now();
        pausedForSignIn.current = true;
        setPaused(true);
      }
      setGate("sign-in");
      return;
    }
    finish(options);
  }
  requestFinishRef.current = requestFinish;

  function startDialogs() {
    return (
      <>
        <SignInModal
          open={gate === "sign-in"}
          onClose={() => {
            const pending = pendingFinish.current;
            pendingFinish.current = null;
            setGate("closed");
            if (pending?.fromTimer) {
              finish({ fromTimer: true, save: false });
              return;
            }
            if (!pausedForSignIn.current) return;
            pausedForSignIn.current = false;
            const held = performance.now() - (pauseStarted.current ?? performance.now());
            pauseStarted.current = null;
            setStartedAt((value) => (value === null ? value : value + held));
            setNow(performance.now());
            setPaused(false);
          }}
          onSignedIn={() => {
            const pending = pendingFinish.current ?? {};
            pendingFinish.current = null;
            pausedForSignIn.current = false;
            setGate("closed");
            finish({ ...pending, save: true });
          }}
        />
        <ConfirmStartDialog
          open={gate === "confirm"}
          title="Start this test?"
          body="The timer starts as soon as you confirm, and keeps running until you pause, submit, or the time ends."
          confirmLabel="Start test"
          confirmClass="rounded-[10px] bg-[#C2410C] px-[22px] py-3.5 font-semibold text-white"
          onConfirm={() => {
            setGate("closed");
            begin();
          }}
          onCancel={() => setGate("closed")}
        />
      </>
    );
  }

  function togglePause() {
    if (startedAt === null || finished) return;
    if (!paused) {
      pauseStarted.current = performance.now();
      setPaused(true);
      return;
    }
    const held = performance.now() - (pauseStarted.current ?? performance.now());
    pauseStarted.current = null;
    setStartedAt((value) => (value === null ? value : value + held));
    setNow(performance.now());
    setPaused(false);
  }

  function testActions() {
    const nothingTyped = typed.trim().length === 0;
    return (
      <>
        <button
          type="button"
          onClick={togglePause}
          disabled={startedAt === null || finished}
          className="inline-flex min-h-11 items-center rounded-lg border border-[#D1D5DB] bg-white px-[18px] font-semibold text-[#374151] disabled:opacity-50"
        >
          {paused ? "Resume" : "Pause"}
        </button>
        {paused ? (
          <button
            type="button"
            onClick={abandonTest}
            className="inline-flex min-h-11 items-center rounded-lg border border-[#D1D5DB] bg-white px-[18px] font-semibold text-[#374151]"
          >
            Exit
          </button>
        ) : (
          <button
            type="button"
            onClick={() => requestFinish()}
            disabled={startedAt === null || finished || nothingTyped}
            className="inline-flex min-h-11 items-center rounded-lg bg-[#C2410C] px-[18px] font-semibold text-white disabled:opacity-50"
          >
            Submit test
          </button>
        )}
      </>
    );
  }

  function wordClass(index: number) {
    if (index < completedCount) {
      return typedWords[index] === passage.words[index]
        ? "text-[#166534]"
        : "bg-[#FEF2F2] text-[#B91C1C] underline decoration-2 underline-offset-4";
    }
    if (highlight && index === currentWord) return "rounded bg-[#FFE4D6] px-[3px] text-[#111827]";
    return "text-[#6B7280]";
  }

  if (phase === "result" && result) {
    return (
      <>
      {startDialogs()}
      <ResultView
        result={result}
        resultRef={resultRef}
        examName={exam.name}
        language={language}
        durationLabel={durationLabel}
        examTimed={durationSeconds === 600}
        saveNote={saveNote}
        signedIn={signedIn}
        onRetry={requestStart}
        onAnother={() => {
          reset();
          setPhase("setup");
        }}
      />
      </>
    );
  }

  if (phase === "test") {
    return (
      <div className="bg-[#F6F7F9] text-[#111827]">
        {startDialogs()}
        <LeaveGuard active storageKey={TYPING_DRAFT_KEY} onLeave={abandonTest} />
        <div className="border-b border-[#E3E6EB] bg-white">
          <div className="mx-auto flex w-full max-w-[1200px] flex-wrap items-center justify-between gap-4 px-6 py-3.5">
            <div className="flex flex-wrap items-center gap-3.5">
              <span className="font-display text-xl font-bold">{exam.name}</span>
              <span className="rounded-full bg-[#FFF7F2] px-3 py-1.5 text-[13px] font-semibold text-[#C2410C]">
                {exam.name} · {language} · {durationLabel}
              </span>
            </div>
            <div className="flex items-center gap-2.5">{testActions()}</div>
          </div>
        </div>
        <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-5 px-6 py-7 pb-16">
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex flex-col gap-1 rounded-xl bg-[#111827] px-5 py-4 text-white">
              <span className="text-[13px] text-[#D1D5DB]">
                Time left
              </span>
              <span className="font-display text-[32px] leading-none font-bold">{formatClock(remaining)}</span>
            </div>
            <div className="flex flex-col gap-1 rounded-xl border border-[#E3E6EB] bg-white px-5 py-4">
              <span className="text-[13px] text-[#4B5563]">Live speed</span>
              <span className="font-display text-[32px] leading-none font-bold">
                {liveGross} <span className="text-base font-medium text-[#4B5563]">wpm</span>
              </span>
            </div>
            <div className="flex flex-col gap-1 rounded-xl border border-[#E3E6EB] bg-white px-5 py-4">
              <span className="text-[13px] text-[#4B5563]">Accuracy</span>
              <span className="font-display text-[32px] leading-none font-bold">
                {liveAccuracy.toFixed(1)}
                <span className="text-base font-medium text-[#4B5563]">%</span>
              </span>
            </div>
            <div className="flex flex-col gap-1 rounded-xl border border-[#E3E6EB] bg-white px-5 py-4">
              <span className="text-[13px] text-[#4B5563]">Words typed</span>
              <span className="font-display text-[32px] leading-none font-bold">
                {typedWords.length}{" "}
                <span className="text-base font-medium text-[#4B5563]">/ {passage.words.length}</span>
              </span>
            </div>
          </section>
          <div className="h-1.5 overflow-hidden rounded-full bg-[#E3E6EB]">
            <div className="h-1.5 bg-[#C2410C]" style={{ width: `${progress}%` }} />
          </div>
          <section
            ref={passageRef}
            aria-label="Passage"
            onCopy={blockClipboard}
            onCut={blockClipboard}
            className="h-[230px] overflow-y-auto rounded-2xl border border-[#E3E6EB] bg-white px-8 font-passage text-[19px] leading-[38px] select-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {passage.words.map((word, index) => (
              <span key={`${word}-${index}`}>
                <span data-w="" className={wordClass(index)}>
                  {word}
                </span>{" "}
              </span>
            ))}
          </section>
          <section className="flex flex-col gap-2">
            <label htmlFor="typing-input" className="text-sm font-semibold">
              Type the passage here
            </label>
            <textarea
              id="typing-input"
              value={typed}
              disabled={finished || !passageReady || paused}
              spellCheck={false}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              placeholder="Type the passage. The timer is already running."
              onChange={(event) => onType(event.target.value)}
              onKeyDown={(event) => {
                if (finished || !passageReady || paused) return;
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
              className="box-border min-h-[180px] w-full resize-y rounded-xl border-2 border-[#C2410C] bg-white px-5 py-[18px] font-passage text-lg leading-[1.8] text-[#111827] focus:outline-none disabled:opacity-70"
            />
            <div className="flex flex-wrap gap-4 text-[13px] text-[#4B5563]">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-[#166534]" />
                Correct
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-[#B91C1C]" />
                Mistake
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-[#C2410C]" />
                Current word
              </span>
              <span>Copy-paste disabled · Backspace {allowBackspace ? "allowed" : "off"}</span>
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#F6F7F9] text-[#111827]">
      {startDialogs()}
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-7 px-6 py-10 pb-[72px]">
        <div className="flex flex-col gap-2">
          <p className="text-sm text-[#4B5563]">
            <Link href="/" className="text-[#4B5563] hover:text-[#111827]">
              Home
            </Link>{" "}
            / Typing
          </p>
          <h1 className="font-display text-4xl font-bold">Choose your exam body</h1>
          <p className="text-base text-[#4B5563]">
            The test follows the selected exam&apos;s time and how mistakes are counted.
          </p>
        </div>
        <div className="flex flex-wrap items-start gap-7">
          <section className="grid min-w-0 flex-[999_1_560px] grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
            {exams.map((item) => {
              const selected = item.id === examId;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setExamId(item.id)}
                  className={
                    selected
                      ? "flex min-h-[132px] cursor-pointer flex-col gap-2 rounded-[14px] border-2 border-[#C2410C] bg-[#FFF7F2] p-5 text-left"
                      : "flex min-h-[132px] cursor-pointer flex-col gap-2 rounded-[14px] border-2 border-[#E3E6EB] bg-white p-5 text-left"
                  }
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-display text-[19px] font-semibold">{item.name}</span>
                    {selected ? (
                      <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C2410C" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <path d="m8 12 3 3 5-6" />
                      </svg>
                    ) : null}
                  </span>
                  <span className="text-sm leading-normal text-[#4B5563]">{item.posts}</span>
                  <span className="text-[13px] font-medium text-[#374151]">{item.langs}</span>
                </button>
              );
            })}
          </section>
          <aside className="flex flex-[1_1_320px] flex-col gap-[22px] rounded-2xl border border-[#E3E6EB] bg-white p-6">
            <div className="flex flex-col gap-1">
              <span className="text-[13px] font-semibold tracking-[0.06em] text-[#4B5563] uppercase">
                Test setup
              </span>
              <span className="font-display text-[22px] font-semibold">{exam.name}</span>
            </div>
            {/* Language stays with the passage. The test does not ask for it.
            <div className="flex flex-col gap-2.5">
              <span className="text-sm font-semibold">Language</span>
              <div className="flex gap-2">
                {["English", "Hindi"].map((item) => (
                  <button key={item} type="button" onClick={() => setLanguage(item)} className={pillClass(item === language)}>
                    {item}
                  </button>
                ))}
              </div>
            </div>
            */}
            <div className="flex flex-col gap-2.5">
              <span className="text-sm font-semibold">Duration</span>
              <div className="flex gap-2">
                {durationChoices.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setDuration(item.value)}
                    className={pillClass(item.value === duration)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2.5">
              <label htmlFor="passage" className="text-sm font-semibold">
                Passage
              </label>
              <select
                id="passage"
                value={passageChoice}
                onChange={(event) => choosePassage(event.target.value)}
                className="h-11 rounded-lg border border-[#D1D5DB] bg-white px-3 text-[15px]"
              >
                {passageChoices.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-3 text-[15px]">
              <label className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={allowBackspace}
                  onChange={(event) => setAllowBackspace(event.target.checked)}
                  className="h-[18px] w-[18px] accent-[#C2410C]"
                />
                Allow backspace
              </label>
              <label className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={highlight}
                  onChange={(event) => setHighlight(event.target.checked)}
                  className="h-[18px] w-[18px] accent-[#C2410C]"
                />
                Highlight current word
              </label>
            </div>
            <button
              type="button"
              onClick={requestStart}
              className="rounded-[10px] bg-[#C2410C] px-5 py-3.5 text-center text-base font-semibold text-white"
            >
              Start test
            </button>
            <span className="text-[13px] leading-normal text-[#4B5563]">
              After you confirm, the timer starts immediately. Sign in when you submit
              to save the result. A pass on the 10 minute setting is {MISTAKE_LIMIT * 100}% mistakes or fewer.
            </span>
          </aside>
        </div>
      </div>
    </div>
  );
}

function pillClass(on: boolean) {
  return on
    ? "min-h-11 cursor-pointer rounded-full border border-[#C2410C] bg-[#C2410C] px-4 text-sm font-semibold text-white"
    : "min-h-11 cursor-pointer rounded-full border border-[#D1D5DB] bg-white px-4 text-sm font-semibold text-[#374151]";
}

function ResultView({
  result,
  resultRef,
  examName,
  language,
  durationLabel,
  examTimed,
  saveNote,
  signedIn,
  onRetry,
  onAnother,
}: {
  result: TypingScore;
  resultRef: RefObject<HTMLDivElement | null>;
  examName: string;
  language: string;
  durationLabel: string;
  examTimed: boolean;
  saveNote: string;
  signedIn: boolean;
  onRetry: () => void;
  onAnother: () => void;
}) {
  const qualified = examTimed && result.pass;
  return (
    <div className="bg-[#F6F7F9] text-[#111827]">
      <div ref={resultRef} className="mx-auto flex w-full max-w-[1200px] flex-col gap-7 px-6 py-10 pb-[72px]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-sm text-[#4B5563]">
              {examName} · {language} · {durationLabel}
            </span>
            <h1 className="font-display text-4xl font-bold">Your result</h1>
          </div>
          <span
            className={
              qualified
                ? "rounded-[10px] bg-[#DCFCE7] px-4 py-2.5 text-base font-bold text-[#166534]"
                : "rounded-[10px] bg-[#FEF2F2] px-4 py-2.5 text-base font-bold text-[#B91C1C]"
            }
          >
            {qualified ? "Qualified · target 40 wpm" : examTimed ? "Not qualified yet" : "Practice result"}
          </span>
        </div>
        <section className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          <ScoreTile label="Net speed" value={result.net.toFixed(0)} unit="wpm" />
          <ScoreTile label="Accuracy" value={result.accuracy.toFixed(1)} unit="%" />
          <ScoreTile label="Full mistakes" value={String(result.fullMistakes)} tone="bad" />
          <ScoreTile label="Half mistakes" value={String(result.counts.half)} tone="warn" />
        </section>
        <section className="flex flex-col gap-4 rounded-2xl border border-[#E3E6EB] bg-white px-8 py-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Mistakes in your passage</h2>
            <div className="flex flex-wrap gap-3.5 text-[13px] text-[#4B5563]">
              <span>
                <span className="text-[#B91C1C] line-through">word</span> wrong / missing
              </span>
              <span>
                <span className="bg-[#FEF3C7] px-1">word</span> spelling / punctuation
              </span>
              <span>
                <span className="font-semibold text-[#166534]">word</span> correct form
              </span>
            </div>
          </div>
          <p className="font-passage text-[17px] leading-[2]">
            {result.aligned.length ? (
              result.aligned.map((word, index) => <CheckedWord key={index} word={word} />)
            ) : (
              <em>Nothing typed.</em>
            )}
          </p>
          {result.tips.length ? (
            <ul className="grid gap-1 text-sm text-[#4B5563]">
              {result.tips.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          ) : null}
          <p className="text-sm text-[#4B5563]">
            {signedIn ? saveNote || "Saving this attempt." : "Sign in to keep this result."}{" "}
            {signedIn ? (
              <Link href="/progress" className="font-semibold text-[#C2410C]">
                Progress
              </Link>
            ) : null}
          </p>
        </section>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={onRetry} className="rounded-[10px] bg-[#C2410C] px-[22px] py-3.5 font-semibold text-white">
            Retry this passage
          </button>
          <button
            type="button"
            onClick={onAnother}
            className="rounded-[10px] border border-[#D1D5DB] bg-white px-[22px] py-3.5 font-semibold text-[#111827]"
          >
            Try another exam
          </button>
          <Link
            href="/steno"
            className="rounded-[10px] border border-[#D1D5DB] bg-white px-[22px] py-3.5 font-semibold text-[#111827]"
          >
            Go to steno practice
          </Link>
        </div>
      </div>
    </div>
  );
}

function ScoreTile({
  label,
  value,
  unit,
  tone,
}: {
  label: string;
  value: string;
  unit?: string;
  tone?: "bad" | "warn";
}) {
  const color = tone === "bad" ? "text-[#B91C1C]" : tone === "warn" ? "text-[#B45309]" : "";
  return (
    <div className="flex flex-col gap-1.5 rounded-[14px] border border-[#E3E6EB] bg-white p-5">
      <span className="text-sm text-[#4B5563]">{label}</span>
      <span className={`font-display text-[40px] leading-none font-bold ${color}`}>
        {value}
        {unit ? <span className="text-lg font-medium text-[#4B5563]">{unit === "%" ? "%" : ` ${unit}`}</span> : null}
      </span>
    </div>
  );
}

function CheckedWord({ word }: { word: AlignedWord }) {
  if (word.kind === "ok") return <>{word.typed} </>;
  if (word.kind === "half") {
    return (
      <>
        <span className="bg-[#FEF3C7] px-1" title={`Should be: ${word.expected}`}>
          {word.typed}
        </span>{" "}
        <span className="font-semibold text-[#166534]">{word.expected}</span>{" "}
      </>
    );
  }
  if (word.kind === "sub") {
    return (
      <>
        <span className="text-[#B91C1C] line-through" title="Wrong word">
          {word.typed}
        </span>{" "}
        <span className="font-semibold text-[#166534]">{word.expected}</span>{" "}
      </>
    );
  }
  if (word.kind === "missed") {
    return (
      <span className="text-[#B91C1C] line-through" title="Missed word">
        {word.expected}{" "}
      </span>
    );
  }
  return (
    <span className="bg-[#FEF3C7] px-1 underline" title="Extra word">
      {word.typed}{" "}
    </span>
  );
}
