"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { LeaveGuard } from "@/components/leave-guard";
import { ConfirmStartDialog, SignInModal } from "@/components/start-dialogs";
import { useTestChrome } from "@/components/test-chrome";
import { clearLocalDraft, writeLocalDraft } from "@/lib/local-draft";
import { usePracticeCatalog, usePracticeReady } from "@/lib/practice-catalog";
import type { StenoDictation } from "@/lib/steno-dictations";
import { alignWords, wordsOf, type AlignedWord } from "@/lib/typing-score";

const STENO_DRAFT_KEY = "papernikalo-steno-draft";
const SPEED_KEY = "papernikalo-steno-speed";
const MODE_KEY = "papernikalo-steno-mode";
const PAGE_SIZE = 9;
const PASS_ERROR = 7;

const speeds = [60, 80, 100, 120];
const MIN_SPEED = 40;
const MAX_SPEED = 200;

export function StenoExam() {
  const catalog = usePracticeCatalog();
  const contentReady = usePracticeReady();
  return <StenoPractice dictations={catalog.steno} contentReady={contentReady} />;
}

export function StenoPractice({
  dictations,
  contentReady = true,
}: {
  dictations: StenoDictation[];
  contentReady?: boolean;
}) {
  const [phase, setPhase] = useState<"setup" | "session">("setup");
  const [speed, setSpeed] = useState(80);
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
  const [query, setQuery] = useState("");
  const [topicFilter, setTopicFilter] = useState("all");
  const [lengthFilter, setLengthFilter] = useState<number | "all">("all");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [speedOpen, setSpeedOpen] = useState(false);
  const [typeTick, setTypeTick] = useState(0);
  const playToken = useRef(0);
  const spokenRef = useRef(0);
  const typeStarted = useRef<number | null>(null);
  const typeEndsAt = useRef<number | null>(null);
  const practiceListRef = useRef<HTMLElement>(null);
  const expireSubmitRef = useRef<() => void>(() => {});
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
  const scriptWords = useMemo(() => wordsOf(script), [script]);
  const spokenWords = wordsOf(script.slice(0, spoken)).length;
  const totalSeconds = speed > 0 ? (scriptWords.length / speed) * 60 : 0;
  const elapsedSeconds = speed > 0 ? (spokenWords / speed) * 60 : 0;
  const typeLimitSeconds = isTest && speed > 0 && scriptWords.length > 0
    ? Math.max(60, Math.round((scriptWords.length / speed) * 60 * 10))
    : 0;
  const segmentCount = Math.max(1, Math.ceil(scriptWords.length / 20) || 1);
  const segmentIndex = Math.min(segmentCount - 1, Math.floor(spokenWords / 20));

  useEffect(() => {
    if (dictations.some((item) => item.id === dictationId)) return;
    setDictationId(dictations[0]?.id ?? "");
  }, [dictations, dictationId]);

  useEffect(() => {
    const savedSpeed = Number(localStorage.getItem(SPEED_KEY));
    const savedMode = localStorage.getItem(MODE_KEY);
    if (Number.isInteger(savedSpeed) && savedSpeed >= MIN_SPEED && savedSpeed <= MAX_SPEED) {
      setSpeed(savedSpeed);
      if (!speeds.includes(savedSpeed)) setCustomSpeed(String(savedSpeed));
    }
    if (savedMode === "test" || savedMode === "practice") setMode(savedMode);
  }, []);

  useEffect(() => {
    localStorage.setItem(SPEED_KEY, String(speed));
  }, [speed]);

  useEffect(() => {
    localStorage.setItem(MODE_KEY, mode);
  }, [mode]);

  useEffect(() => {
    return () => window.speechSynthesis?.cancel();
  }, []);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [query, topicFilter, lengthFilter]);

  useEffect(() => {
    if (step !== "type" || submitted) return;
    if (typeStarted.current === null) typeStarted.current = performance.now();
    if (isTest && typeLimitSeconds > 0 && typeEndsAt.current === null) {
      typeEndsAt.current = performance.now() + typeLimitSeconds * 1000;
    }
    const id = window.setInterval(() => {
      setTypeTick((value) => value + 1);
      if (isTest && typeEndsAt.current !== null && performance.now() >= typeEndsAt.current) {
        expireSubmitRef.current();
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [step, submitted, isTest, typeLimitSeconds]);

  function stopSpeech() {
    playToken.current += 1;
    window.speechSynthesis?.cancel();
    spokenRef.current = 0;
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
    setSpeedOpen(false);
  }

  function speakFrom(charIndex: number, rateSpeed = speed) {
    const synth = window.speechSynthesis;
    if (!synth || !script) return;
    const token = ++playToken.current;
    synth.cancel();
    const start = Math.max(0, Math.min(script.length, charIndex));
    spokenRef.current = start;
    setSpoken(start);
    if (start >= script.length) {
      setPlaying(false);
      setPlayed(true);
      if (isTest) setStep("type");
      return;
    }
    const utterance = new SpeechSynthesisUtterance(script.slice(start));
    utterance.lang = language === "Hindi" ? "hi-IN" : "en-IN";
    utterance.rate = Math.min(2, Math.max(0.4, rateSpeed / 100));
    utterance.onboundary = (event) => {
      if (playToken.current !== token) return;
      if (event.name && event.name !== "word") return;
      const chars = start + (event.charIndex || 0) + (event.charLength || 0);
      spokenRef.current = Math.min(script.length, chars);
      setSpoken(spokenRef.current);
    };
    utterance.onend = () => {
      if (playToken.current !== token) return;
      spokenRef.current = script.length;
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
    speakFrom(spokenRef.current > 0 && spokenRef.current < script.length ? spokenRef.current : 0);
  }

  function rewindTen() {
    if (isTest || spokenRef.current === 0) return;
    const heard = wordsOf(script.slice(0, spokenRef.current)).length;
    const back = Math.max(1, Math.round((speed * 10) / 60));
    speakFrom(charIndexOfWord(script, Math.max(0, heard - back)));
  }

  function changeSpeed(value: number) {
    if (isTest && phase === "session") return;
    setSpeed(value);
    setCustomSpeed(speeds.includes(value) ? "" : String(value));
    setSpeedOpen(false);
    if (playing) speakFrom(spokenRef.current, value);
  }

  const comparison = useMemo(() => {
    if (!submitted) return null;
    return alignWords(wordsOf(transcript), scriptWords);
  }, [scriptWords, submitted, transcript]);

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
    setSpeedOpen(false);
    typeStarted.current = null;
    typeEndsAt.current = null;
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
    if (!contentReady || dictations.length === 0 || customInvalid || !dictation.id) return;
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
          title={isTest ? "Start this exam?" : "Start this practice?"}
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

  function chooseCustom(raw: string) {
    setCustomSpeed(raw);
    if (raw.trim() === "") {
      if (!speeds.includes(speed)) setSpeed(80);
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

  function expireTranscription() {
    if (submittedRef.current) return;
    commitSubmit(Boolean(isTest && user), { allowEmpty: true });
  }
  expireSubmitRef.current = expireTranscription;

  function commitSubmit(save: boolean, options?: { allowEmpty?: boolean }) {
    if (submittedRef.current) return;
    if (!options?.allowEmpty && transcript.trim().length === 0) return;
    submittedRef.current = true;
    const reference = scriptWords;
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

  const catalogRows = useMemo(
    () =>
      dictations.map((item) => {
        const text = item.english.trim() ? item.english : item.hindi;
        return { item, words: wordsOf(text).length, topic: item.topic || "General" };
      }),
    [dictations],
  );
  const topics = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of catalogRows) counts.set(row.topic, (counts.get(row.topic) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [catalogRows]);
  const lengths = useMemo(() => {
    const counts = new Map<number, number>();
    for (const row of catalogRows) counts.set(row.words, (counts.get(row.words) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0]).slice(0, 4).map(([count]) => count).sort((a, b) => a - b);
  }, [catalogRows]);
  const filtered = catalogRows.filter((row) => {
    if (topicFilter !== "all" && row.topic !== topicFilter) return false;
    if (lengthFilter !== "all" && row.words !== lengthFilter) return false;
    const needle = query.trim().toLowerCase();
    if (!needle) return true;
    return `${row.item.title} ${row.topic}`.toLowerCase().includes(needle);
  });
  const visible = filtered.slice(0, visibleCount);
  const selectedWords = scriptWords.length;
  const typedWords = wordsOf(transcript).length;
  const typingMinutes = typeStarted.current ? Math.max((performance.now() - typeStarted.current) / 60000, 1 / 60) : 0;
  const typingSpeed = typingMinutes > 0 ? Math.round(typedWords / typingMinutes) : 0;
  const typeRemainingSeconds =
    isTest && typeEndsAt.current !== null
      ? Math.max(0, Math.ceil((typeEndsAt.current - performance.now()) / 1000))
      : typeLimitSeconds;
  void typeTick;

  if (phase === "setup") {
    return (
      <div className="bg-[#F5F6F8] text-[#111827]">
        {startDialogs()}
        <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 px-6 py-8 lg:flex-row lg:items-start lg:gap-8 lg:px-10">
          <main className="flex min-w-0 flex-1 flex-col gap-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[13px] text-[#6B7280]">
                  <Link href="/" className="hover:text-[#111827]">Home</Link> / Steno
                </p>
                <h1 className="mt-1.5 font-display text-4xl font-bold">Choose your dictation</h1>
              </div>
              <label className="flex h-11 w-full items-center gap-2 rounded-[10px] border border-[#D1D5DB] bg-white px-3.5 text-sm text-[#6B7280] sm:w-[280px]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" aria-hidden="true">
                  <circle cx="11" cy="11" r="7" />
                  <path d="M20 20l-3.5-3.5" />
                </svg>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search passages"
                  className="min-w-0 flex-1 border-0 bg-transparent text-[#111827] outline-none placeholder:text-[#6B7280]"
                />
              </label>
            </div>

            <div className="flex flex-col gap-3 border-b border-[#E5E7EB] pb-3 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex gap-6 overflow-x-auto text-[15px]">
                <FilterTab on={topicFilter === "all"} count={catalogRows.length} onClick={() => setTopicFilter("all")}>
                  All
                </FilterTab>
                {topics.map(([topic, count]) => (
                  <FilterTab key={topic} on={topicFilter === topic} count={count} onClick={() => setTopicFilter(topic)}>
                    {topic}
                  </FilterTab>
                ))}
              </div>
              {lengths.length > 1 ? (
                <div className="flex flex-wrap gap-2">
                  <LengthChip on={lengthFilter === "all"} onClick={() => setLengthFilter("all")}>All lengths</LengthChip>
                  {lengths.map((count) => (
                    <LengthChip key={count} on={lengthFilter === count} onClick={() => setLengthFilter(count)}>
                      {`${count} words`}
                    </LengthChip>
                  ))}
                </div>
              ) : null}
            </div>

            {!contentReady ? (
              <p className="text-[#4B5563]">Loading dictations…</p>
            ) : dictations.length === 0 ? (
              <p className="text-[#4B5563]">No dictations yet.</p>
            ) : filtered.length === 0 ? (
              <p className="text-[#4B5563]">No passages match this search.</p>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {visible.map(({ item, words, topic }) => {
                  const selected = item.id === dictation.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => selectDictation(item.id)}
                      className={
                        selected
                          ? "flex cursor-pointer flex-col items-start gap-3 rounded-[14px] border-2 border-[#C2410C] bg-white p-[18px] text-left shadow-[0_0_0_4px_#FDE7DB]"
                          : "flex cursor-pointer flex-col items-start gap-3 rounded-[14px] border border-[#E5E7EB] bg-white p-[18px] text-left"
                      }
                    >
                      <span className="flex w-full items-center justify-between gap-2">
                        <span className={`text-xs font-semibold tracking-[0.04em] uppercase ${topicTone(topic)}`}>{topic}</span>
                        {selected ? (
                          <span className="rounded-full bg-[#C2410C] px-2 py-0.5 text-xs font-medium text-white">Selected</span>
                        ) : null}
                      </span>
                      <span className="line-clamp-2 h-[47px] text-left font-display text-lg leading-snug font-semibold text-[#111827]">{item.title}</span>
                      <span className="flex gap-3.5 text-[13px] text-[#4B5563]">
                        <span>{words} words</span>
                        <span>·</span>
                        <span>{minutesAt80(words)} min at 80 wpm</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
            {filtered.length > visible.length ? (
              <div className="flex justify-center pt-1">
                <button
                  type="button"
                  onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
                  className="h-11 rounded-[10px] border border-[#D1D5DB] bg-white px-5 text-sm text-[#111827]"
                >
                  Show more passages
                </button>
              </div>
            ) : null}
          </main>

          <aside className="flex w-full shrink-0 flex-col gap-5 rounded-2xl border border-[#E5E7EB] bg-white p-6 lg:sticky lg:top-6 lg:w-[340px]">
            <div>
              <div className="text-xs tracking-[0.06em] text-[#6B7280] uppercase">Selected · sticky while you scroll</div>
              <div className="mt-1.5 font-display text-[22px] leading-tight font-semibold">{dictation.title}</div>
              <div className="mt-1.5 text-[13px] text-[#4B5563]">
                {dictation.topic || "Dictation"} · {selectedWords} words
              </div>
            </div>
            <div className="flex flex-col gap-2.5">
              <span className="text-sm font-semibold">Dictation speed</span>
              <div className="grid grid-cols-4 gap-2">
                {speeds.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => changeSpeed(item)}
                    className={
                      item === speed && customSpeed.trim() === ""
                        ? "h-11 rounded-[10px] border border-[#C2410C] bg-[#C2410C] text-sm font-semibold text-white"
                        : "h-11 rounded-[10px] border border-[#D1D5DB] bg-white text-sm text-[#111827]"
                    }
                  >
                    {item}
                  </button>
                ))}
              </div>
              <label className="text-xs text-[#6B7280]">
                wpm · remembered from your last session
                <input
                  type="number"
                  inputMode="numeric"
                  min={MIN_SPEED}
                  max={MAX_SPEED}
                  step={1}
                  value={customSpeed}
                  placeholder="Custom speed"
                  onChange={(event) => chooseCustom(event.target.value)}
                  className="mt-2 h-10 w-full rounded-[10px] border border-[#D1D5DB] bg-white px-3 text-sm font-semibold text-[#111827]"
                />
              </label>
              {customInvalid ? (
                <span className="text-xs text-[#C2410C]">Enter a whole number from {MIN_SPEED} to {MAX_SPEED}.</span>
              ) : null}
            </div>
            <div className="flex flex-col gap-2.5">
              <span className="text-sm font-semibold">Mode</span>
              <button
                type="button"
                onClick={() => setMode("practice")}
                className={mode === "practice" ? "rounded-xl border-2 border-[#C2410C] bg-[#FFF7F2] px-3.5 py-3 text-left" : "rounded-xl border border-[#D1D5DB] bg-white px-3.5 py-3 text-left"}
              >
                <div className="text-sm font-semibold">Practice</div>
                <div className="mt-0.5 text-[13px] text-[#4B5563]">Pause, rewind 10 s, replay. No time limit.</div>
              </button>
              <button
                type="button"
                onClick={() => setMode("test")}
                className={mode === "test" ? "rounded-xl border-2 border-[#C2410C] bg-[#FFF7F2] px-3.5 py-3 text-left" : "rounded-xl border border-[#D1D5DB] bg-white px-3.5 py-3 text-left"}
              >
                <div className="text-sm font-semibold">Exam</div>
                <div className="mt-0.5 text-[13px] text-[#4B5563]">Plays once. Timed transcription, paste blocked.</div>
              </button>
            </div>
            <div className="flex flex-col gap-2 rounded-xl bg-[#F5F6F8] p-3.5 text-[13px] text-[#374151]">
              <div className="flex justify-between"><span>Dictation</span><span className="font-semibold text-[#111827]">{dictationLength(selectedWords, speed)}</span></div>
              <div className="flex justify-between"><span>Transcription</span><span className="font-semibold text-[#111827]">{isTest ? transcriptionLength(selectedWords, speed) : "No limit"}</span></div>
              <div className="flex justify-between"><span>Exam pattern</span><span className="font-semibold text-[#111827]">SSC Grade D</span></div>
            </div>
            <button
              type="button"
              onClick={requestStart}
              disabled={!contentReady || dictations.length === 0 || customInvalid || !dictation.id}
              className="h-[52px] rounded-xl bg-[#C2410C] text-base font-semibold text-white disabled:opacity-40"
            >
              Start dictation
            </button>
          </aside>
        </div>
      </div>
    );
  }

  if (submitted && comparison) {
    const result = summarise(comparison, scriptWords.length);
    const typedMinutes = typeStarted.current ? Math.max(1, Math.round((performance.now() - typeStarted.current) / 60000)) : 0;
    const limitMinutes = typeLimitSeconds > 0 ? Math.round(typeLimitSeconds / 60) : 0;
    return (
      <div className="bg-[#F5F6F8] text-[#111827]">
        {startDialogs()}
        <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 px-6 py-8 lg:px-10">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[13px] text-[#6B7280]">
                Result · {speed} wpm · {isTest ? "Exam" : "Practice"} mode · SSC Grade D pattern
              </p>
              <h1 className="mt-1.5 font-display text-[34px] font-bold">{dictation.title}</h1>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <button type="button" onClick={begin} className="h-[46px] rounded-[10px] border border-[#D1D5DB] bg-white px-4 text-sm">Try again</button>
              <button
                type="button"
                onClick={() => practiceListRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                className="h-[46px] rounded-[10px] border border-[#D1D5DB] bg-white px-4 text-sm"
              >
                Practise my mistakes
              </button>
              <button
                type="button"
                onClick={() => {
                  const index = dictations.findIndex((item) => item.id === dictation.id);
                  const next = dictations[(index + 1) % dictations.length];
                  if (next) selectDictation(next.id);
                  setPhase("setup");
                }}
                className="h-[46px] rounded-[10px] bg-[#C2410C] px-5 text-sm font-semibold text-white"
              >
                Next passage →
              </button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <div className={result.pass ? "flex items-center gap-5 rounded-2xl border border-[#A7F3D0] bg-[#ECFDF3] p-5 sm:col-span-2" : "flex items-center gap-5 rounded-2xl border border-[#FECACA] bg-[#FEF2F2] p-5 sm:col-span-2"}>
              <div className={result.pass ? "grid h-16 w-16 shrink-0 place-items-center rounded-full bg-[#166534] font-display text-sm font-bold text-white" : "grid h-16 w-16 shrink-0 place-items-center rounded-full bg-[#B91C1C] font-display text-sm font-bold text-white"}>
                {result.pass ? "PASS" : "FAIL"}
              </div>
              <div>
                <div className={result.pass ? "font-display text-4xl leading-none font-bold text-[#14532D]" : "font-display text-4xl leading-none font-bold text-[#991B1B]"}>
                  {result.errorPercent.toFixed(1)}%
                </div>
                <div className={result.pass ? "mt-1.5 text-sm text-[#166534]" : "mt-1.5 text-sm text-[#991B1B]"}>
                  Error rate · limit for SSC Grade D is {PASS_ERROR}%
                </div>
              </div>
            </div>
            <StatCard label="Full mistakes" value={String(result.full)} detail="wrong, missed or extra words" tone="text-[#B91C1C]" />
            <StatCard label="Half mistakes" value={String(result.half)} detail="spelling, punctuation, capitals" tone="text-[#92400E]" />
            <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5">
              <div className="text-[13px] text-[#6B7280]">Words typed</div>
              <div className="mt-1.5 font-display text-[34px] leading-none font-bold">
                {typedWords}<span className="text-lg text-[#9CA3AF]">/{scriptWords.length}</span>
              </div>
              <div className="mt-1 text-xs text-[#6B7280]">
                {typedMinutes
                  ? limitMinutes
                    ? `in ${typedMinutes} min of ${limitMinutes}`
                    : `in ${typedMinutes} min`
                  : "just now"}
              </div>
            </div>
          </div>

          {saveNote ? (
            <p className="text-sm text-[#4B5563]">
              {saveNote}{" "}
              {signedIn ? <Link href="/progress" className="font-semibold text-[#C2410C]">Progress</Link> : null}
            </p>
          ) : null}

          <div className="flex flex-col items-start gap-6 xl:flex-row">
            <section className="min-w-0 flex-1 rounded-2xl border border-[#E5E7EB] bg-white p-6">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-[17px] font-semibold">Your transcription vs the original</h2>
                <div className="flex flex-wrap gap-3.5 text-xs text-[#374151]">
                  <Legend swatch="bg-[#FEE2E2] border-[#B91C1C]" label="Full mistake" />
                  <Legend swatch="bg-[#FEF3C7] border-[#92400E]" label="Half mistake" />
                  <Legend swatch="bg-[#E5E7EB] border-[#6B7280]" label="Missed" />
                  <Legend swatch="bg-[#DCFCE7] border-[#166534]" label="Correct word" />
                </div>
              </div>
              <p className="text-[17px] leading-[2.1]">
                {comparison.map((word, index) => (
                  <ComparedWord key={index} word={word} />
                ))}
              </p>
            </section>
            <aside ref={practiceListRef} className="flex w-full shrink-0 flex-col gap-3.5 rounded-2xl border border-[#E5E7EB] bg-white p-5 xl:w-80">
              <h2 className="text-base font-semibold">Words to practise</h2>
              <p className="text-[13px] text-[#6B7280]">Taken from this attempt</p>
              {result.practice.length === 0 ? (
                <p className="text-sm text-[#4B5563]">No mistakes in this transcription.</p>
              ) : (
                result.practice.map((item) => (
                  <div key={`${item.word}-${item.note}`} className="flex items-center justify-between rounded-[10px] bg-[#F5F6F8] px-3 py-2.5 text-sm">
                    <span className="font-medium">{item.word}</span>
                    <span className="text-xs text-[#6B7280]">{item.note}</span>
                  </div>
                ))
              )}
              <button
                type="button"
                disabled={result.practice.length === 0}
                onClick={() => {
                  const synth = window.speechSynthesis;
                  if (!synth || result.practice.length === 0) return;
                  synth.cancel();
                  const utterance = new SpeechSynthesisUtterance(result.practice.map((item) => item.word).join(". "));
                  utterance.lang = language === "Hindi" ? "hi-IN" : "en-IN";
                  utterance.rate = 0.9;
                  synth.speak(utterance);
                }}
                className="h-11 rounded-[10px] border border-[#C2410C] bg-white text-sm font-semibold text-[#C2410C] disabled:opacity-40"
              >
                Drill these words
              </button>
            </aside>
          </div>
        </div>
      </div>
    );
  }

  const nothingTyped = transcript.trim().length === 0;
  const canType = !isTest || played;

  return (
    <div className="bg-[#F5F6F8] text-[#111827]">
      {startDialogs()}
      <LeaveGuard active={sessionOpen} storageKey={STENO_DRAFT_KEY} onLeave={abandonAttempt} />
      <div className="border-b border-[#E5E7EB] bg-white">
        <div className="mx-auto flex w-full max-w-[1280px] flex-wrap items-center justify-between gap-4 px-6 py-3.5 lg:px-10">
          <div className="flex flex-wrap items-center gap-3.5">
            <span className="font-display text-lg font-semibold">{dictation.title}</span>
            <span className={isTest && step === "type" ? "rounded-full bg-[#111827] px-2.5 py-1 text-xs font-medium text-white" : "rounded-full bg-[#FDE7DB] px-2.5 py-1 text-xs font-medium text-[#8A300A]"}>
              {speed} wpm · {language} · {isTest ? "Exam" : "Practice"}
            </span>
          </div>
          {isTest && step === "type" ? (
            <div className="flex items-center gap-2.5 rounded-xl bg-[#FEF3C7] px-4 py-2 text-[#78350F]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#78350F" strokeWidth="2" aria-hidden="true">
                <circle cx="12" cy="13" r="8" />
                <path d="M12 9v4l2 2M9 2h6" />
              </svg>
              <span className="text-[13px]">Time left</span>
              <span className="font-display text-[22px] font-semibold">{clock(typeRemainingSeconds)}</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={abandonAttempt}
              className="h-10 rounded-[10px] border border-[#D1D5DB] bg-white px-4 text-sm"
            >
              Exit
            </button>
          )}
        </div>
      </div>
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 px-6 py-7 lg:px-10">
        <Stepper step={step} />
        {step === "listen" ? (
          <>
            <section className="flex flex-col items-center gap-7 rounded-[20px] border border-[#E5E7EB] bg-white px-6 py-10 sm:px-10">
              <div className="text-sm text-[#6B7280]">
                {spokenWords === 0 && !playing ? "Ready to play" : `Now playing · segment ${segmentIndex + 1} of ${segmentCount}`}
              </div>
              <div className="font-display text-5xl font-semibold tracking-tight sm:text-7xl">
                {clock(elapsedSeconds)} <span className="text-3xl text-[#9CA3AF] sm:text-[40px]">/ {clock(totalSeconds)}</span>
              </div>
              <div className="flex w-full gap-1" aria-label="Progress by 20-word segments">
                {Array.from({ length: segmentCount }, (_, index) => (
                  <span
                    key={index}
                    className={
                      index < segmentIndex || (index === segmentIndex && spokenWords > 0 && spoken >= script.length)
                        ? "h-2.5 flex-1 rounded-[3px] bg-[#C2410C]"
                        : index === segmentIndex && spokenWords > 0
                          ? "h-2.5 flex-1 rounded-[3px] bg-[#F2A57E]"
                          : "h-2.5 flex-1 rounded-[3px] bg-[#E5E7EB]"
                    }
                  />
                ))}
              </div>
              <div className="flex items-center gap-7">
                <button
                  type="button"
                  aria-label="Rewind 10 seconds"
                  onClick={rewindTen}
                  disabled={isTest || spokenWords === 0}
                  className="grid h-14 w-14 place-items-center rounded-full border border-[#D1D5DB] bg-white text-xs font-semibold text-[#374151] disabled:opacity-40"
                >
                  −10s
                </button>
                <button
                  type="button"
                  aria-label={playing ? "Pause" : "Play"}
                  onClick={togglePlay}
                  disabled={isTest && played && !playing}
                  className="grid h-[88px] w-[88px] place-items-center rounded-full bg-[#C2410C] disabled:opacity-40"
                >
                  {playing ? (
                    <svg width="30" height="30" viewBox="0 0 24 24" fill="#FFFFFF" aria-hidden="true">
                      <rect x="6" y="5" width="4" height="14" rx="1" />
                      <rect x="14" y="5" width="4" height="14" rx="1" />
                    </svg>
                  ) : (
                    <svg width="30" height="30" viewBox="0 0 24 24" fill="#FFFFFF" aria-hidden="true">
                      <path d="M9 6v12l10-6z" />
                    </svg>
                  )}
                </button>
                <div className="relative">
                  <button
                    type="button"
                    aria-label="Change speed"
                    disabled={isTest}
                    onClick={() => setSpeedOpen((open) => !open)}
                    className="h-14 rounded-full border border-[#D1D5DB] bg-white px-4 text-sm font-semibold text-[#374151] disabled:opacity-40"
                  >
                    {speed} wpm ▾
                  </button>
                  {speedOpen ? (
                    <div className="absolute top-16 left-0 z-10 grid min-w-28 gap-1 rounded-xl border border-[#E5E7EB] bg-white p-2 shadow-lg">
                      {speeds.map((item) => (
                        <button key={item} type="button" onClick={() => changeSpeed(item)} className="rounded-lg px-3 py-2 text-left text-sm hover:bg-[#F5F6F8]">
                          {item} wpm
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
              <p className="text-center text-[13px] text-[#6B7280]">
                {isTest
                  ? "Exam mode: the audio plays once. Pause, rewind and speed change stay off."
                  : "Practice mode: pause, rewind and speed change are allowed. In Exam mode the audio plays once."}
              </p>
            </section>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2.5 text-sm text-[#4B5563]">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4B5563" strokeWidth="2" aria-hidden="true">
                  <path d="M4 4h12l4 4v12H4z" />
                  <path d="M8 12h8M8 16h5" />
                </svg>
                Write in your notebook. The original text stays hidden until you submit.
              </div>
              <button
                type="button"
                onClick={goToTranscription}
                disabled={!canType}
                className="h-[52px] rounded-xl bg-[#111827] px-7 text-[15px] font-semibold text-white disabled:opacity-40"
              >
                I&apos;m done, start typing →
              </button>
            </div>
          </>
        ) : (
          <>
            <section className="flex flex-col gap-3.5 rounded-[20px] border border-[#E5E7EB] bg-white p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <label htmlFor="transcript" className="text-[15px] font-semibold">Type from your shorthand notes</label>
                <div className="flex flex-wrap gap-2 text-xs">
                  {isTest ? <span className="rounded-full bg-[#F3F4F6] px-2.5 py-1 text-[#374151]">Paste blocked</span> : null}
                  <span className="rounded-full bg-[#F3F4F6] px-2.5 py-1 text-[#374151]">Backspace on</span>
                  <span className="rounded-full bg-[#F3F4F6] px-2.5 py-1 text-[#374151]">Autosaved</span>
                </div>
              </div>
              <textarea
                id="transcript"
                value={transcript}
                onPaste={(event) => {
                  if (isTest) event.preventDefault();
                }}
                onChange={(event) => {
                  setTranscript(event.target.value);
                  setSubmitted(false);
                  setSaveNote("");
                }}
                className="box-border h-[420px] w-full resize-none rounded-xl border-2 border-[#C2410C] bg-white px-5 py-[18px] font-passage text-base leading-[1.8] text-[#111827] outline-none"
              />
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex gap-6 text-sm text-[#4B5563]">
                  <span><b className="text-[#111827]">{typedWords}</b> / {scriptWords.length} words typed</span>
                  <span><b className="text-[#111827]">{typingSpeed}</b> wpm typing speed</span>
                </div>
                <button
                  type="button"
                  onClick={submitPractice}
                  disabled={nothingTyped}
                  className="h-[52px] rounded-xl bg-[#C2410C] px-8 text-base font-semibold text-white disabled:opacity-40"
                >
                  Submit transcription
                </button>
              </div>
            </section>
            <p className="text-[13px] text-[#6B7280]">
              {isTest
                ? "Submit closes the test. When time runs out, your text is submitted automatically."
                : "Submit closes this attempt and opens the result."}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function Stepper({ step }: { step: "listen" | "type" }) {
  return (
    <ol className="flex flex-wrap items-center gap-3 text-sm">
      <li className={step === "listen" ? "flex items-center gap-2 font-semibold text-[#111827]" : "flex items-center gap-2 text-[#166534]"}>
        <span className={step === "listen" ? "grid h-[26px] w-[26px] place-items-center rounded-full bg-[#C2410C] text-[13px] text-white" : "grid h-[26px] w-[26px] place-items-center rounded-full bg-[#DCFCE7] text-[13px] text-[#166534]"}>
          {step === "listen" ? "1" : "✓"}
        </span>
        Listen & write shorthand
      </li>
      <li className={step === "type" ? "h-0.5 w-12 bg-[#86EFAC]" : "h-0.5 w-12 bg-[#D1D5DB]"} />
      <li className={step === "type" ? "flex items-center gap-2 font-semibold text-[#111827]" : "flex items-center gap-2 text-[#6B7280]"}>
        <span className={step === "type" ? "grid h-[26px] w-[26px] place-items-center rounded-full bg-[#C2410C] text-[13px] text-white" : "grid h-[26px] w-[26px] place-items-center rounded-full border-2 border-[#D1D5DB] text-[13px]"}>
          2
        </span>
        Type transcription
      </li>
      <li className="h-0.5 w-12 bg-[#D1D5DB]" />
      <li className="flex items-center gap-2 text-[#6B7280]">
        <span className="grid h-[26px] w-[26px] place-items-center rounded-full border-2 border-[#D1D5DB] text-[13px]">3</span>
        Result
      </li>
    </ol>
  );
}

function FilterTab({
  on,
  count,
  onClick,
  children,
}: {
  on: boolean;
  count: number;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={on ? "border-b-[3px] border-[#C2410C] py-3 font-semibold text-[#111827]" : "py-3 text-[#4B5563]"}
    >
      {children} <span className={on ? "font-medium text-[#6B7280]" : "text-[#9CA3AF]"}>{count}</span>
    </button>
  );
}

function LengthChip({ on, onClick, children }: { on: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={on ? "h-[34px] rounded-full border border-[#111827] bg-[#111827] px-3.5 text-[13px] text-white" : "h-[34px] rounded-full border border-[#D1D5DB] bg-white px-3.5 text-[13px] text-[#374151]"}
    >
      {children}
    </button>
  );
}

function StatCard({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: string }) {
  return (
    <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5">
      <div className="text-[13px] text-[#6B7280]">{label}</div>
      <div className={`mt-1.5 font-display text-[34px] leading-none font-bold ${tone}`}>{value}</div>
      <div className="mt-1 text-xs text-[#6B7280]">{detail}</div>
    </div>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-3 w-3 rounded-[3px] border ${swatch}`} />
      {label}
    </span>
  );
}

function HowThisWorks({ test }: { test: boolean }) {
  const steps = test
    ? [
        "Listen and write it in shorthand. The original text stays hidden.",
        "The dictation plays once. Typing opens when the audio finishes.",
        "Type from your notes within the timed window. Sign in at submit to save this exam.",
      ]
    : [
        "Listen and write it in shorthand. The original text stays hidden.",
        "You can pause, rewind and replay. Start typing when you are ready.",
        "Type from your notes and submit. This practice is not saved.",
      ];

  return (
    <div className="grid gap-3">
      <p className="font-semibold text-[#111827]">How this {test ? "exam" : "practice"} works</p>
      <ol className="grid gap-2">
        {steps.map((step, index) => (
          <li key={step}>{index + 1}. {step}</li>
        ))}
      </ol>
    </div>
  );
}

function ComparedWord({ word }: { word: AlignedWord }) {
  if (word.kind === "ok") return <>{word.typed} </>;
  if (word.kind === "half") {
    return <span className="rounded px-1 text-[#78350F] [border-bottom:2px_dotted_#92400E] bg-[#FEF3C7]">{word.typed} </span>;
  }
  if (word.kind === "sub") {
    return (
      <>
        <span className="rounded bg-[#FEE2E2] px-1 text-[#991B1B] line-through">{word.typed}</span>{" "}
        <span className="rounded bg-[#DCFCE7] px-1 font-medium text-[#14532D]">{word.expected}</span>{" "}
      </>
    );
  }
  if (word.kind === "missed") {
    return <span className="rounded bg-[#E5E7EB] px-1 text-[#4B5563] line-through">{word.expected} </span>;
  }
  return <span className="rounded bg-[#FEE2E2] px-1 text-[#991B1B] line-through">{word.typed} </span>;
}

function summarise(rows: AlignedWord[], referenceWords: number) {
  let half = 0;
  let full = 0;
  const practice: { word: string; note: string }[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    if (row.kind === "ok") continue;
    if (row.kind === "half") half += 1;
    else full += 1;
    const word = row.kind === "extra" ? row.typed : row.kind === "missed" ? row.expected : row.expected;
    const note = row.kind === "half" ? "spelling" : row.kind === "missed" ? "missed" : row.kind === "extra" ? "extra" : "wrong word";
    const key = `${word}-${note}`;
    if (seen.has(key) || practice.length >= 8) continue;
    seen.add(key);
    practice.push({ word, note });
  }
  const errorPercent = referenceWords ? ((full + half / 2) / referenceWords) * 100 : 0;
  return { half, full, errorPercent, pass: errorPercent <= PASS_ERROR, practice };
}

function topicTone(topic: string) {
  if (topic === "Legal") return "text-[#5B21B6]";
  if (topic === "Parliament") return "text-[#C2410C]";
  if (topic === "Office") return "text-[#1D4ED8]";
  return "text-[#4B5563]";
}

function minutesAt80(words: number) {
  return Math.max(1, Math.round(words / 80));
}

function dictationLength(words: number, wpm: number) {
  if (!words || !wpm) return "—";
  const minutes = words / wpm;
  if (minutes < 1) return `${Math.max(1, Math.round(minutes * 60))} sec`;
  const rounded = Math.round(minutes);
  return `${rounded} min`;
}

function transcriptionLength(words: number, wpm: number) {
  if (!words || !wpm) return "—";
  const minutes = (words / wpm) * 10;
  if (minutes < 1) return `${Math.max(1, Math.round(minutes * 60))} sec`;
  return `${Math.round(minutes)} min`;
}

function clock(seconds: number) {
  const total = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function charIndexOfWord(text: string, wordIndex: number) {
  if (wordIndex <= 0) return 0;
  const pattern = /\S+/g;
  let seen = 0;
  let found: RegExpExecArray | null;
  while ((found = pattern.exec(text))) {
    if (seen === wordIndex) return found.index;
    seen += 1;
  }
  return text.length;
}
