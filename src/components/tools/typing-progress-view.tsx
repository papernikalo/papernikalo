"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  summarizeAttempts,
  type TypingAttemptRow,
} from "@/lib/typing-progress";
import { TARGET_WPM, formatClock } from "@/lib/typing-score";

export function TypingProgress() {
  const [attempts, setAttempts] = useState<TypingAttemptRow[]>([]);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch("/api/account/typing");
        const body = (await response.json()) as { attempts?: TypingAttemptRow[]; error?: string };
        if (!response.ok) throw new Error(body.error || "Typing progress could not be loaded.");
        if (!cancelled) {
          setAttempts(body.attempts ?? []);
          setNote("");
        }
      } catch (reason: unknown) {
        if (!cancelled) {
          setAttempts([]);
          setNote(reason instanceof Error ? reason.message : "Typing progress could not be loaded.");
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

  return (
    <section className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <p className="text-sm text-[#52606d]">Saved on this account.</p>
        <Link href="/tools/typing" className="text-sm font-medium text-[#1d4e89] underline underline-offset-4">
          Back to the test
        </Link>
      </div>
      {note ? <p className="text-sm text-[#1d4e89]">{note}</p> : null}
      {loading ? <p className="text-sm text-[#52606d]">Loading your attempts.</p> : null}
      {!loading && summary ? (
        <>
          <p className="text-sm leading-6 text-[#52606d]">{gap}</p>
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
          <p className="text-sm text-[#52606d]">
            {summary.change === null
              ? "This is the first saved attempt."
              : `${summary.change >= 0 ? "+" : ""}${summary.change.toFixed(1)} wpm gross since the previous attempt.`}{" "}
            Lowest mistake rate so far is {summary.lowestError.toFixed(2)}%.
          </p>
        </>
      ) : null}
      {!loading && !summary && !note ? (
        <p className="text-sm text-[#52606d]">
          Finish a signed-in test to see your best speed, how the last attempt compares, and whether
          you have cleared 40 wpm with 3% mistakes.
        </p>
      ) : null}
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
                    <ResultBadge attempt={attempt} />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={11} className="px-3 py-3 text-[#52606d]">
                  {loading ? "Loading attempts." : "No attempts yet."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ResultBadge({ attempt }: { attempt: TypingAttemptRow }) {
  const exam = attempt.durationSeconds === 600;
  const label = exam ? (attempt.pass ? "Pass" : "Fail") : "Practice";
  const tone = !exam
    ? "bg-[#e7eef5] text-[#1d4e89]"
    : attempt.pass
      ? "bg-[#e5f2ea] text-[#1d7a4c]"
      : "bg-[#fbe4e2] text-[#9b2c2c]";
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

function Stat({ label, value, tone }: { label: string; value: string; tone?: "bad" | "accent" }) {
  const toneClass = tone === "bad" ? "text-[#9b2c2c]" : tone === "accent" ? "text-[#1d4e89]" : "";
  return (
    <div className="rounded-lg border border-[#d5dee6] bg-[#ffffff] px-4 py-3">
      <span className="text-xs font-semibold tracking-wider text-[#52606d] uppercase">{label}</span>
      <b className={`block font-mono text-xl font-medium tabular-nums ${toneClass}`}>{value}</b>
    </div>
  );
}
