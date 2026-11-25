"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  summarizeAttempts,
  type TypingAttemptRow,
} from "@/lib/typing-progress";
import type { StenoAttemptRow } from "@/lib/steno-progress";
import { TARGET_WPM, formatClock } from "@/lib/typing-score";

type Panel = "typing" | "steno";

export function TypingProgress() {
  const [attempts, setAttempts] = useState<TypingAttemptRow[]>([]);
  const [stenoAttempts, setStenoAttempts] = useState<StenoAttemptRow[]>([]);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [panel, setPanel] = useState<Panel>("typing");
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [typingResponse, stenoResponse] = await Promise.all([
          fetch("/api/account/typing"),
          fetch("/api/account/steno"),
        ]);
        const typingBody = (await typingResponse.json()) as { attempts?: TypingAttemptRow[]; error?: string };
        const stenoBody = (await stenoResponse.json()) as { attempts?: StenoAttemptRow[]; error?: string };
        if (!typingResponse.ok) throw new Error(typingBody.error || "Progress could not be loaded.");
        if (!stenoResponse.ok) throw new Error(stenoBody.error || "Progress could not be loaded.");
        if (!cancelled) {
          setAttempts(typingBody.attempts ?? []);
          setStenoAttempts(stenoBody.attempts ?? []);
          setNote("");
        }
      } catch (reason: unknown) {
        if (!cancelled) {
          setAttempts([]);
          setStenoAttempts([]);
          setNote(reason instanceof Error ? reason.message : "Progress could not be loaded.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

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

  function choose(next: Panel) {
    setPanel(next);
    setOpen(null);
  }

  return (
    <section className="grid gap-5">
      <div className="flex w-full gap-2">
        <PanelButton
          current={panel === "typing"}
          label="Typing"
          count={loading ? null : attempts.length}
          onClick={() => choose("typing")}
        />
        <PanelButton
          current={panel === "steno"}
          label="Steno"
          count={loading ? null : stenoAttempts.length}
          onClick={() => choose("steno")}
        />
      </div>
      {note ? <p className="text-sm font-medium text-[#B91C1C]">{note}</p> : null}
      {loading ? <p className="text-sm text-[#4B5563]">Loading your attempts.</p> : null}

      {panel === "typing" ? (
        <div className="grid gap-4">
          {!loading && summary ? (
            <>
              <p className="max-w-3xl text-sm leading-6 text-[#4B5563]">{gap}</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label="Best gross" value={`${summary.bestGross.toFixed(1)} wpm`} tone="accent" />
                <Stat label="Best net" value={`${summary.bestNet.toFixed(1)} wpm`} />
                <Stat label="Last 5 average" value={`${summary.recentAverage.toFixed(1)} wpm`} />
                <Stat
                  label="Passed"
                  value={`${summary.passes} of ${summary.count}`}
                  tone={summary.passes ? "accent" : undefined}
                />
              </div>
              <p className="text-sm text-[#4B5563]">
                {summary.change === null
                  ? "This is the first saved attempt."
                  : `${summary.change >= 0 ? "+" : ""}${summary.change.toFixed(1)} wpm gross since the previous attempt.`}{" "}
                Lowest mistake rate so far is {summary.lowestError.toFixed(2)}%.
              </p>
            </>
          ) : null}
          {!loading && !summary && !note ? (
            <EmptyState
              text="Finish a signed-in typing test to see your best speed, how the last attempt compares, and whether you have cleared 40 wpm with 3% mistakes."
              href="/typing"
              label="Open typing"
            />
          ) : null}
          {attempts.map((attempt, index) => {
            const id = `typing-${attempt.createdAt}-${index}`;
            const exam = attempt.durationSeconds === 600;
            return (
              <AttemptCard
                key={id}
                id={id}
                open={open === id}
                onToggle={() => setOpen(open === id ? null : id)}
                title={attempt.passageLabel}
                when={formatWhen(attempt.createdAt)}
                highlight={`${attempt.gross.toFixed(1)} wpm`}
                badge={<ResultBadge attempt={attempt} />}
              >
                <Detail label="Set" value={formatClock(attempt.durationSeconds)} />
                <Detail label="Typed" value={formatClock(attempt.seconds)} />
                <Detail label="Gross" value={`${attempt.gross.toFixed(1)} wpm`} />
                <Detail label="Net" value={`${attempt.net.toFixed(1)} wpm`} />
                <Detail label="Accuracy" value={`${attempt.accuracy.toFixed(0)}%`} />
                <Detail
                  label="Mistakes"
                  value={String(attempt.mistakes % 1 ? attempt.mistakes.toFixed(1) : attempt.mistakes)}
                />
                <Detail label="Error" value={`${attempt.errorPercent.toFixed(2)}%`} />
                <Detail label="Backspace" value={attempt.backspace ? "On" : "Off"} />
                <Detail label="Result" value={exam ? (attempt.pass ? "Pass" : "Fail") : "Practice"} />
              </AttemptCard>
            );
          })}
        </div>
      ) : (
        <div className="grid gap-4">
          {!loading && stenoAttempts.length ? <StenoSummary attempts={stenoAttempts} /> : null}
          {!loading && !stenoAttempts.length && !note ? (
            <EmptyState
              text="Submit a signed-in steno test to see the passage, speed, and how many words matched."
              href="/steno"
              label="Open steno"
            />
          ) : null}
          {stenoAttempts.map((attempt, index) => {
            const id = `steno-${attempt.createdAt}-${index}`;
            return (
              <AttemptCard
                key={id}
                id={id}
                open={open === id}
                onToggle={() => setOpen(open === id ? null : id)}
                title={attempt.passageLabel}
                when={formatWhen(attempt.createdAt)}
                highlight={`${attempt.accuracy.toFixed(1)}%`}
                badge={
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                      attempt.playOnce ? "bg-[#FFF7F2] text-[#C2410C]" : "bg-[#F3F4F6] text-[#374151]"
                    }`}
                  >
                    {attempt.playOnce ? "Test" : "Practice"}
                  </span>
                }
              >
                <Detail label="Language" value={attempt.language} />
                <Detail label="Speed" value={`${attempt.speed} wpm`} />
                <Detail label="Kind" value={attempt.playOnce ? "Test" : "Practice"} />
                <Detail label="Accuracy" value={`${attempt.accuracy.toFixed(1)}%`} />
                <Detail label="Exact words" value={`${attempt.correct} / ${attempt.words}`} />
                <Detail label="Mistakes" value={String(attempt.mistakes)} />
              </AttemptCard>
            );
          })}
        </div>
      )}
    </section>
  );
}

function PanelButton({
  current,
  label,
  count,
  onClick,
}: {
  current: boolean;
  label: string;
  count: number | null;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={current}
      onClick={onClick}
      className={
        current
          ? "flex min-h-11 flex-1 items-center justify-center gap-2 rounded-[10px] bg-[#C2410C] px-[18px] py-2.5 text-[15px] font-medium text-white"
          : "flex min-h-11 flex-1 items-center justify-center gap-2 rounded-[10px] border border-[#E3E6EB] bg-white px-[18px] py-2.5 text-[15px] font-medium text-[#374151] transition duration-200 hover:-translate-y-0.5 hover:border-[#111827] hover:text-[#111827]"
      }
    >
      {label}
      {count !== null ? (
        <span className={current ? "rounded-full bg-white/20 px-2 py-0.5 text-xs" : "rounded-full bg-[#F3F4F6] px-2 py-0.5 text-xs text-[#4B5563]"}>
          {count}
        </span>
      ) : null}
    </button>
  );
}

function AttemptCard({
  id,
  open,
  onToggle,
  title,
  when,
  highlight,
  badge,
  children,
}: {
  id: string;
  open: boolean;
  onToggle: () => void;
  title: string;
  when: string;
  highlight: string;
  badge: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <article className="overflow-hidden rounded-2xl border border-[#E3E6EB] bg-white transition duration-200 hover:-translate-y-0.5 hover:border-[#111827] hover:shadow-sm">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <span className="grid min-w-0 gap-1">
          <span className="truncate font-display text-lg font-semibold text-[#111827]">{title}</span>
          <span className="text-sm text-[#4B5563]">{when}</span>
        </span>
        <span className="flex shrink-0 items-center gap-3">
          {badge}
          <span className="font-mono text-lg font-medium tabular-nums text-[#111827]">{highlight}</span>
          <span
            className={`grid h-8 w-8 place-items-center rounded-full bg-[#F3F4F6] text-lg leading-none text-[#111827] transition duration-200 ${
              open ? "rotate-45 bg-[#C2410C] text-white" : ""
            }`}
          >
            +
          </span>
        </span>
      </button>
      <div className={`grid transition-[grid-template-rows] duration-200 ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="overflow-hidden">
          <div id={id} className="grid gap-3 border-t border-[#E3E6EB] px-5 py-4 sm:grid-cols-3">
            {children}
          </div>
        </div>
      </div>
    </article>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-0.5">
      <span className="text-xs font-semibold tracking-wider text-[#4B5563] uppercase">{label}</span>
      <span className="font-mono text-[15px] tabular-nums text-[#111827]">{value}</span>
    </div>
  );
}

function EmptyState({ text, href, label }: { text: string; href: string; label: string }) {
  return (
    <div className="flex flex-col items-start gap-4 rounded-2xl border border-[#E3E6EB] bg-white px-5 py-5">
      <p className="max-w-3xl text-sm leading-6 text-[#4B5563]">{text}</p>
      <Link
        href={href}
        className="rounded-[10px] bg-[#C2410C] px-[18px] py-2.5 text-[15px] font-medium text-white hover:bg-[#9A3412]"
      >
        {label}
      </Link>
    </div>
  );
}

function StenoSummary({ attempts }: { attempts: StenoAttemptRow[] }) {
  const best = Math.max(...attempts.map((attempt) => attempt.accuracy));
  const latest = attempts[0];
  const previous = attempts[1];
  const change = previous ? latest.accuracy - previous.accuracy : null;
  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Best accuracy" value={`${best.toFixed(1)}%`} tone="steno" />
        <Stat label="Latest" value={`${latest.accuracy.toFixed(1)}%`} tone="steno" />
        <Stat label="Tests" value={String(attempts.length)} />
      </div>
      <p className="text-sm text-[#4B5563]">
        {change === null
          ? "This is the first saved steno test."
          : `${change >= 0 ? "+" : ""}${change.toFixed(1)} points since the previous test.`}
      </p>
    </>
  );
}

function ResultBadge({ attempt }: { attempt: TypingAttemptRow }) {
  const exam = attempt.durationSeconds === 600;
  const label = exam ? (attempt.pass ? "Pass" : "Fail") : "Practice";
  const tone = !exam
    ? "bg-[#FFF7F2] text-[#C2410C]"
    : attempt.pass
      ? "bg-[#e5f2ea] text-[#1d7a4c]"
      : "bg-[#fbe4e2] text-[#B91C1C]";
  return <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${tone}`}>{label}</span>;
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

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "bad" | "accent" | "steno";
}) {
  const toneClass =
    tone === "bad" ? "text-[#B91C1C]" : tone === "accent" || tone === "steno" ? "text-[#C2410C]" : "";
  return (
    <div className="rounded-2xl border border-[#E3E6EB] bg-white px-4 py-3 transition duration-200 hover:-translate-y-0.5 hover:border-[#111827] hover:shadow-sm">
      <span className="text-xs font-semibold tracking-wider text-[#4B5563] uppercase">{label}</span>
      <b className={`block font-mono text-xl font-medium tabular-nums ${toneClass}`}>{value}</b>
    </div>
  );
}
