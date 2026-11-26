"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { LeaveGuard } from "@/components/leave-guard";
import { ConfirmStartDialog, SignInModal } from "@/components/start-dialogs";
import { useTestChrome } from "@/components/test-chrome";
import { clearLocalDraft, writeLocalDraft } from "@/lib/local-draft";
import { usePracticeCatalog } from "@/lib/practice-catalog";
import { stenoDictations, type StenoDictation } from "@/lib/steno-dictations";
import { alignWords, wordsOf, type AlignedWord } from "@/lib/typing-score";

const STENO_DRAFT_KEY = "papernikalo-steno-draft";

export function StenoExam() {
  const catalog = usePracticeCatalog();
  const dictations = useMemo(
    () => [...stenoDictations, ...catalog.steno],
    [catalog.steno],
  );
  return <StenoPractice dictations={dictations} />;
}

const speeds = [60, 80, 100, 120];
const MIN_SPEED = 40;
const MAX_SPEED = 200;

export function StenoPractice({ dictations }: { dictations: StenoDictation[] }) {
  const [phase, setPhase] = useState<"setup" | "session">("setup");
  const [speed, setSpeed] = useState(100);
  const [customSpeed, setCustomSpeed] = useState("");
  const [saveNote, setSaveNote] = useState("");
  const [dictationId, setDictationId] = useState(dictations[0]?.id ?? "");
  const [step, setStep] = useState<"listen" | "type">("listen");
  const [playing, setPlaying] = useState(false);
  const [spoken, setSpoken] = useState(0);
  const [mode, setMode] = useState<"practice" | "test">("practice");
  const [played, setPlayed] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const playToken = useRef(0);
  const { user, ready } = useAuth();
  const signedIn = Boolean(user);
  const [gate, setGate] = useState<"closed" | "sign-in" | "confirm">("closed");
  const pendingSubmit = useRef(false);
  const submittedRef = useRef(false);
  const commitSubmitRef = useRef<(save: boolean) => void>(() => {});
  const customValue = Number(customSpeed);
  const customInvalid =
    customSpeed.trim() !== "" &&
    (!Number.isInteger(customValue) || customValue < MIN_SPEED || customValue > MAX_SPEED);

  useTestChrome(phase === "session" && !submitted);

  const isTest = mode === "test";
  const dictation = dictations.find((item) => item.id === dictationId) ??
    dictations[0] ?? { id: "", title: "Dictation", english: "", hindi: "" };
  const language: "English" | "Hindi" = dictation.english.trim() ? "English" : "Hindi";
  const script = language === "Hindi" ? dictation.hindi : dictation.english;
  const fraction = script.length ? Math.min(1, spoken / script.length) : 0;

  useEffect(() => {
    return () => window.speechSynthesis?.cancel();
  }, []);

  function stopSpeech() {
    playToken.current += 1;
    window.speechSynthesis?.cancel();
    setPlaying(false);
    setSpoken(0);
  }

  function selectDictation(id: string) {
    stopSpeech();
    setDictationId(id);
    setPlayed(false);
    setSubmitted(false);
    submittedRef.current = false;
    setTranscript("");
    setStep("listen");
  }

  function startSpeech() {
    const synth = window.speechSynthesis;
    if (!synth) return;
    const token = ++playToken.current;
    synth.cancel();
    setSpoken(0);
    const utterance = new SpeechSynthesisUtterance(script);
    utterance.lang = language === "Hindi" ? "hi-IN" : "en-IN";
    utterance.rate = Math.min(2, Math.max(0.4, speed / 100));
    utterance.onboundary = (event) => {
      if (playToken.current !== token) return;
      const chars = (event.charIndex || 0) + (event.charLength || 0);
      setSpoken(Math.min(script.length, chars));
    };
    utterance.onend = () => {
      if (playToken.current !== token) return;
      setSpoken(script.length);
      setPlaying(false);
      setPlayed(true);
      if (isTest) setStep("type");
    };
    setPlaying(true);
    synth.speak(utterance);
  }

  function togglePlay() {
    const synth = window.speechSynthesis;
    if (!synth) return;
    if (isTest && played && !playing) return;
    if (playing) {
      synth.pause();
      setPlaying(false);
      return;
    }
    if (synth.paused && synth.speaking) {
      synth.resume();
      setPlaying(true);
      return;
    }
    startSpeech();
  }

  const comparison = useMemo(() => {
    if (!submitted) return null;
    return alignWords(wordsOf(transcript), wordsOf(script));
  }, [script, submitted, transcript]);

  const sessionOpen = phase === "session" && !submitted;

  useEffect(() => {
    if (!sessionOpen) {
      clearLocalDraft(STENO_DRAFT_KEY);
      return;
    }
    writeLocalDraft(
      STENO_DRAFT_KEY,
      JSON.stringify({ transcript, dictationId, language, speed, mode }),
    );
  }, [sessionOpen, transcript, dictationId, language, speed, mode]);

  function resetAttempt() {
    clearLocalDraft(STENO_DRAFT_KEY);
    stopSpeech();
    setPlayed(false);
    setSubmitted(false);
    submittedRef.current = false;
    setTranscript("");
    setSaveNote("");
    setStep("listen");
  }

  function abandonAttempt() {
    resetAttempt();
    setPhase("setup");
  }

  function begin() {
    resetAttempt();
    setPhase("session");
  }

  function requestStart() {
    if (customInvalid) return;
    setGate("confirm");
  }

  function startDialogs() {
    return (
      <>
        <SignInModal
          open={gate === "sign-in"}
          onClose={() => {
            pendingSubmit.current = false;
            setGate("closed");
          }}
          onSignedIn={() => {
            pendingSubmit.current = false;
            setGate("closed");
            commitSubmitRef.current(true);
          }}
        />
        <ConfirmStartDialog
          open={gate === "confirm"}
          title={isTest ? "Start this test?" : "Start this practice?"}
          body={<HowThisWorks test={isTest} />}
          confirmLabel="Start"
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

  function goToTranscription() {
    stopSpeech();
    setStep("type");
  }

  function choosePreset(value: number) {
    setSpeed(value);
    setCustomSpeed("");
  }

  function chooseCustom(raw: string) {
    setCustomSpeed(raw);
    if (raw.trim() === "") {
      if (!speeds.includes(speed)) setSpeed(100);
      return;
    }
    const value = Number(raw);
    if (Number.isInteger(value) && value >= MIN_SPEED && value <= MAX_SPEED) setSpeed(value);
  }

  function submitPractice() {
    if (submitted || transcript.trim().length === 0) return;
    if (isTest && !user) {
      pendingSubmit.current = true;
      if (ready) setGate("sign-in");
      return;
    }
    commitSubmit(isTest);
  }

  function commitSubmit(save: boolean) {
    if (submittedRef.current || transcript.trim().length === 0) return;
    submittedRef.current = true;
    const reference = wordsOf(script);
    const rows = alignWords(wordsOf(transcript), reference);
    const correct = rows.filter((row) => row.kind === "ok").length;
    const mistakes = rows.length - correct;
    const accuracy = reference.length ? Math.round((correct / reference.length) * 1000) / 10 : 0;
    setSubmitted(true);
    if (!isTest || !save) {
      setSaveNote(isTest ? "Sign in to keep this result." : "This practice is not saved.");
      return;
    }
    setSaveNote("Saving this attempt.");
    void fetch("/api/account/steno", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        passageLabel: dictation.title,
        language,
        speed,
        playOnce: true,
        accuracy,
        correct,
        words: reference.length,
        mistakes,
      }),
    })
      .then(async (response) => {
        if (!response.ok) {
          const body = (await response.json()) as { error?: string };
          setSaveNote(body.error || "This practice could not be saved on your account.");
          return;
        }
        setSaveNote("Saved on your account.");
      })
      .catch(() => setSaveNote("This practice could not be saved on your account."));
  }
  commitSubmitRef.current = commitSubmit;

  useEffect(() => {
    if (!pendingSubmit.current || !ready) return;
    if (!user) {
      setGate("sign-in");
      return;
    }
    pendingSubmit.current = false;
    setGate("closed");
    commitSubmitRef.current(true);
  }, [ready, user]);

  const progress = fraction * 100;

  if (phase === "setup") {
    return (
      <div className="bg-[#F6F7F9] text-[#111827]">
        {startDialogs()}
        <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-7 px-6 py-10 pb-[72px]">
          <div className="flex flex-col gap-2">
            <p className="text-sm text-[#4B5563]">
              <Link href="/" className="text-[#4B5563] hover:text-[#111827]">
                Home
              </Link>{" "}
              / Steno
            </p>
            <h1 className="font-display text-4xl font-bold">Choose your dictation</h1>
            <p className="text-base text-[#4B5563]">
              Set the speed and passage before the audio starts.
            </p>
          </div>
          <div className="flex flex-wrap items-start gap-7">
            <section className="grid min-w-0 flex-[999_1_560px] grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
              {dictations.map((item) => {
                const selected = item.id === dictationId;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => selectDictation(item.id)}
                    className={
                      selected
                        ? "flex min-h-[132px] cursor-pointer flex-col gap-2 rounded-[14px] border-2 border-[#C2410C] bg-[#FFF7F2] p-5 text-left"
                        : "flex min-h-[132px] cursor-pointer flex-col gap-2 rounded-[14px] border-2 border-[#E3E6EB] bg-white p-5 text-left"
                    }
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-display text-[19px] font-semibold">{item.title}</span>
                      {selected ? (
                        <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C2410C" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          <path d="m8 12 3 3 5-6" />
                        </svg>
                      ) : null}
                    </span>
                    <span className="text-sm leading-normal text-[#4B5563]">{item.topic ? `${item.topic} dictation` : "Dictation"}</span>
                    <span className="text-[13px] font-medium text-[#374151]">
                      {wordsOf(item.english.trim() ? item.english : item.hindi).length} words
                    </span>
                  </button>
                );
              })}
            </section>
            <aside className="flex flex-[1_1_320px] flex-col gap-[22px] rounded-2xl border border-[#E3E6EB] bg-white p-6">
              <div className="flex flex-col gap-1">
                <span className="text-[13px] font-semibold tracking-[0.06em] text-[#4B5563] uppercase">
                  Practice setup
                </span>
                <span className="font-display text-[22px] font-semibold">{dictation.title}</span>
              </div>
              <div className="flex flex-col gap-2.5">
                <span className="text-sm font-semibold">Dictation speed</span>
                <div className="grid grid-cols-2 gap-2">
                  {speeds.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => choosePreset(item)}
                      className={
                        item === speed && customSpeed.trim() === ""
                          ? "min-h-12 cursor-pointer rounded-[10px] border border-[#C2410C] bg-[#C2410C] text-[15px] font-semibold text-white"
                          : "min-h-12 cursor-pointer rounded-[10px] border border-[#D1D5DB] bg-white text-[15px] font-semibold text-[#374151]"
                      }
                    >
                      {item} wpm
                    </button>
                  ))}
                </div>
                <label className="mt-1 flex flex-col gap-2">
                  <span className="text-sm font-semibold">Custom speed</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={MIN_SPEED}
                    max={MAX_SPEED}
                    step={1}
                    value={customSpeed}
                    placeholder={`${MIN_SPEED}–${MAX_SPEED}`}
                    onChange={(event) => chooseCustom(event.target.value)}
                    className="min-h-12 rounded-[10px] border border-[#D1D5DB] bg-white px-3 text-[15px] font-semibold text-[#111827]"
                  />
                  <span className="text-[13px] leading-normal text-[#4B5563]">
                    {customInvalid
                      ? `Enter a whole number from ${MIN_SPEED} to ${MAX_SPEED}.`
                      : `Or type your own speed, from ${MIN_SPEED} to ${MAX_SPEED} wpm.`}
                  </span>
                </label>
              </div>
              {/* Language stays with the dictation. The test does not ask for it.
              <div className="flex flex-col gap-2.5">
                <span className="text-sm font-semibold">Language</span>
                <div className="flex gap-2">
                  {(["English", "Hindi"] as const).map((item) => (
                    <button
                      key={item}
                      type="button"
                      disabled={item === "Hindi" && !hindiReady}
                      onClick={() => setLanguage(item)}
                      className={
                        item === language
                          ? "min-h-11 cursor-pointer rounded-full border border-[#C2410C] bg-[#C2410C] px-4 text-sm font-semibold text-white"
                          : "min-h-11 cursor-pointer rounded-full border border-[#D1D5DB] bg-white px-4 text-sm font-semibold text-[#374151] disabled:cursor-default disabled:opacity-40"
                      }
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
              */}
              <div className="flex flex-col gap-2.5">
                <span className="text-sm font-semibold">Mode</span>
                <div className="grid grid-cols-2 gap-2">
                  {(["practice", "test"] as const).map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setMode(item)}
                      className={
                        item === mode
                          ? "min-h-11 cursor-pointer rounded-[10px] border border-[#C2410C] bg-[#C2410C] px-4 text-sm font-semibold text-white"
                          : "min-h-11 cursor-pointer rounded-[10px] border border-[#D1D5DB] bg-white px-4 text-sm font-semibold text-[#374151]"
                      }
                    >
                      {item === "test" ? "Test" : "Practice"}
                    </button>
                  ))}
                </div>
              </div>
              <button
                type="button"
                onClick={requestStart}
                disabled={customInvalid}
                className="rounded-[10px] bg-[#C2410C] px-5 py-3.5 text-center text-base font-semibold text-white disabled:opacity-40"
              >
                Start
              </button>
            </aside>
          </div>
        </div>
      </div>
    );
  }

  const nothingTyped = transcript.trim().length === 0;

  return (
    <div className="bg-[#F6F7F9] text-[#111827]">
      {startDialogs()}
      <LeaveGuard active={sessionOpen} storageKey={STENO_DRAFT_KEY} onLeave={abandonAttempt} />
      <div className="border-b border-[#E3E6EB] bg-white">
        <div className="mx-auto flex w-full max-w-[1200px] flex-wrap items-center justify-between gap-4 px-6 py-3.5">
          <div className="flex flex-wrap items-center gap-3.5">
            <span className="font-display text-xl font-bold">{dictation.title}</span>
            <span className="rounded-full bg-[#FFF7F2] px-3 py-1.5 text-[13px] font-semibold text-[#C2410C]">
              {speed} wpm · {language} · {isTest ? "Test" : "Practice"}
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={abandonAttempt}
              className="inline-flex min-h-11 items-center rounded-lg border border-[#D1D5DB] bg-white px-[18px] font-semibold text-[#374151]"
            >
              Exit
            </button>
            {step === "listen" && !isTest ? (
              <button
                type="button"
                onClick={goToTranscription}
                className="inline-flex min-h-11 items-center rounded-lg bg-[#C2410C] px-[18px] font-semibold text-white hover:bg-[#9A3412]"
              >
                Next
              </button>
            ) : null}
            {step === "type" && !submitted ? (
              <button
                type="button"
                onClick={submitPractice}
                disabled={nothingTyped}
                className="inline-flex min-h-11 items-center rounded-lg bg-[#C2410C] px-[18px] font-semibold text-white disabled:opacity-50"
              >
                Submit
              </button>
            ) : null}
          </div>
        </div>
      </div>
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-5 px-6 py-7 pb-16">
        <section className="flex min-w-0 flex-col gap-5">
            <div className="flex gap-2" aria-label="Practice steps">
              <span aria-current={step === "listen" ? "step" : undefined} className={stepClass(step === "listen")}>
                1 · Listen & write shorthand
              </span>
              <span aria-current={step === "type" ? "step" : undefined} className={stepClass(step === "type")}>
                2 · Type transcription
              </span>
            </div>

            {step === "listen" ? (
              <>
                <div className="flex flex-col gap-6 rounded-2xl bg-[#111827] p-8 text-white">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[13px] text-[#D1D5DB]">Now playing</span>
                      <span className="font-display text-2xl font-semibold">{dictation.title}</span>
                    </div>
                    <span className="rounded-full bg-[#C2410C] px-3.5 py-2 font-display text-lg font-bold">
                      {speed} wpm
                    </span>
                  </div>
                  <div className="flex items-center gap-5">
                    <button
                      type="button"
                      aria-label={playing ? "Pause dictation" : "Play dictation"}
                      onClick={togglePlay}
                      disabled={isTest && played && !playing}
                      className="grid h-[72px] w-[72px] shrink-0 place-items-center rounded-full border-0 bg-white disabled:opacity-40"
                    >
                      {playing ? (
                        <svg aria-hidden="true" width="28" height="28" viewBox="0 0 24 24" fill="#111827">
                          <rect x="6" y="5" width="4" height="14" rx="1" />
                          <rect x="14" y="5" width="4" height="14" rx="1" />
                        </svg>
                      ) : (
                        <svg aria-hidden="true" width="28" height="28" viewBox="0 0 24 24" fill="#111827">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      )}
                    </button>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#374151]">
                      <div className="h-2 bg-[#FB923C]" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-3 rounded-2xl border border-[#E3E6EB] bg-white p-6">
                  <h2 className="text-[17px] font-semibold">While you listen</h2>
                  <p className="text-[15px] leading-relaxed text-[#4B5563]">
                    Write the dictation in shorthand in your notebook. The original text stays hidden.
                    {isTest
                      ? " This test plays once. When the audio finishes, the typing step opens."
                      : " You can replay this as many times as you need. Press Next when you are ready to type."}
                  </p>
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="rounded-2xl border border-[#E3E6EB] bg-white px-6 py-5">
                  <h2 className="text-[17px] font-semibold">Type from your notes</h2>
                  <p className="mt-2 text-[15px] leading-relaxed text-[#4B5563]">
                    Type the shorthand you wrote. The speed, language, and passage stay as you set them until you submit.
                  </p>
                </div>
                <label htmlFor="transcript" className="text-sm font-semibold">
                  Transcription
                </label>
                <textarea
                  id="transcript"
                  value={transcript}
                  onChange={(event) => {
                    setTranscript(event.target.value);
                    setSubmitted(false);
                    setSaveNote("");
                  }}
                  className="box-border min-h-80 w-full resize-y rounded-xl border-2 border-[#C2410C] bg-white px-5 py-[18px] font-passage text-lg leading-[1.8] text-[#111827] focus:outline-none"
                />
                {saveNote ? (
                  <p className="text-sm text-[#4B5563]">
                    {saveNote}{" "}
                    {signedIn ? (
                      <Link href="/progress" className="font-semibold text-[#C2410C]">
                        Progress
                      </Link>
                    ) : null}
                  </p>
                ) : null}
                {comparison ? (
                  <>
                    <Comparison rows={comparison} original={script} />
                  </>
                ) : null}
              </div>
            )}
        </section>
      </div>
    </div>
  );
}

function stepClass(on: boolean) {
  return on
    ? "inline-flex min-h-11 items-center rounded-[10px] border border-[#C2410C] bg-[#C2410C] px-[18px] text-[15px] font-semibold text-white"
    : "inline-flex min-h-11 items-center rounded-[10px] border border-[#E3E6EB] bg-[#F3F4F6] px-[18px] text-[15px] font-semibold text-[#9CA3AF]";
}

function HowThisWorks({ test }: { test: boolean }) {
  const steps = test
    ? [
        "Listen and write it in shorthand. The original text stays hidden, and you cannot jump between the steps.",
        "The dictation plays once. Typing opens when the audio finishes.",
        "Type from your notes and submit. Sign in at submit to save this test on your account.",
      ]
    : [
        "Listen and write it in shorthand. The original text stays hidden, and you cannot jump between the steps.",
        "You can replay the dictation. Press Next when you are ready to type.",
        "Type from your notes and submit. This practice is not saved.",
      ];

  return (
    <div className="grid gap-3">
      <p className="font-semibold text-[#111827]">How this {test ? "test" : "practice"} works</p>
      <ol className="grid gap-2">
        {steps.map((step, index) => (
          <li key={step}>{index + 1}. {step}</li>
        ))}
      </ol>
    </div>
  );
}

function Comparison({ rows, original }: { rows: AlignedWord[]; original: string }) {
  const correct = rows.filter((row) => row.kind === "ok").length;
  const accuracy = rows.length ? Math.round((correct / wordsOf(original).length) * 1000) / 10 : 0;
  return (
    <section className="mt-2 flex flex-col gap-3 rounded-2xl border border-[#E3E6EB] bg-white px-6 py-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Compared with the original</h2>
        <span className="rounded-[10px] bg-[#FFF7F2] px-3 py-1.5 text-sm font-bold text-[#C2410C]">
          {accuracy}% exact words
        </span>
      </div>
      <p className="font-passage text-[17px] leading-[2]">
        {rows.map((word, index) => (
          <ComparedWord key={index} word={word} />
        ))}
      </p>
    </section>
  );
}

function ComparedWord({ word }: { word: AlignedWord }) {
  if (word.kind === "ok") return <>{word.typed} </>;
  if (word.kind === "half" || word.kind === "sub") {
    return (
      <>
        <span className="text-[#B91C1C] line-through">{word.typed}</span>{" "}
        <span className="font-semibold text-[#166534]">{word.expected}</span>{" "}
      </>
    );
  }
  if (word.kind === "missed") {
    return <span className="text-[#B91C1C] line-through">{word.expected} </span>;
  }
  return <span className="bg-[#FEF3C7] px-1">{word.typed} </span>;
}
