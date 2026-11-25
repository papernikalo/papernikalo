import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { pageJsonLd, pageMetadata, publicPage } from "@/lib/seo";

const page = publicPage("/");

export const metadata: Metadata = pageMetadata(page);

const exams = ["SSC", "Delhi High Court", "AIIMS", "DSSSB", "+ more"];
const speeds = ["60 wpm", "80 wpm", "100 wpm", "120 wpm", "English · Hindi"];

const steps = [
  {
    number: "01",
    title: "Pick your exam or speed",
    body: "The test copies that exam's language, time and checking rules.",
  },
  {
    number: "02",
    title: "Practise in exam conditions",
    body: "Live timer, no copy-paste, backspace on or off like the real test.",
  },
  {
    number: "03",
    title: "See every mistake",
    body: "Speed, accuracy, full and half mistakes, word by word.",
  },
];

function KeyboardIcon() {
  return (
    <svg
      aria-hidden="true"
      width="30"
      height="30"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#C2410C"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10" />
    </svg>
  );
}

function HeadsetIcon() {
  return (
    <svg
      aria-hidden="true"
      width="30"
      height="30"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#C2410C"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 14v-2a9 9 0 0 1 18 0v2" />
      <rect x="3" y="14" width="4" height="7" rx="1.5" />
      <rect x="17" y="14" width="4" height="7" rx="1.5" />
    </svg>
  );
}

export default function Home() {
  return (
    <main className="flex-1 bg-[#F6F7F9] text-[#111827]">
      <JsonLd data={pageJsonLd(page)} />
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-12 px-6 py-14 pb-[72px]">
        <section className="flex max-w-[760px] flex-col gap-3.5">
          <p className="text-[13px] font-semibold tracking-[0.08em] text-[#C2410C] uppercase">
            For government exam aspirants
          </p>
          <h1 className="font-display text-4xl leading-[1.1] font-bold tracking-tight sm:text-5xl">
            Practice typing and steno the way the exam tests you
          </h1>
          <p className="text-lg leading-[1.6] text-[#4B5563]">
            Pick a tool to begin. Typing tests follow each exam body&apos;s pattern, and
            steno dictations play at the speed you choose.
          </p>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <article className="flex flex-col gap-5 rounded-2xl border border-[#E3E6EB] bg-white p-8">
            <div className="grid h-14 w-14 place-items-center rounded-xl bg-[#FFF7F2]">
              <KeyboardIcon />
            </div>
            <div className="flex flex-col gap-2">
              <h2 className="font-display text-[28px] font-semibold">Typing Test</h2>
              <p className="text-base leading-[1.6] text-[#4B5563]">
                Choose your exam body, set language and duration, and type a passage
                under real exam rules. Get WPM, accuracy and every mistake marked.
              </p>
            </div>
            <ul className="flex flex-wrap gap-2">
              {exams.map((exam) => (
                <li
                  key={exam}
                  className="rounded-full bg-[#F3F4F6] px-3 py-1.5 text-[13px] font-medium text-[#374151]"
                >
                  {exam}
                </li>
              ))}
            </ul>
            <Link
              href="/typing"
              className="mt-auto self-start rounded-[10px] bg-[#C2410C] px-[22px] py-3.5 text-base font-semibold text-white hover:bg-[#9A3412]"
            >
              Start typing test →
            </Link>
          </article>

          <article className="flex flex-col gap-5 rounded-2xl border border-[#E3E6EB] bg-white p-8">
            <div className="grid h-14 w-14 place-items-center rounded-xl bg-[#FFF7F2]">
              <HeadsetIcon />
            </div>
            <div className="flex flex-col gap-2">
              <h2 className="font-display text-[28px] font-semibold">Steno Practice</h2>
              <p className="text-base leading-[1.6] text-[#4B5563]">
                Listen to dictation at your chosen speed, take it down in shorthand,
                then type your transcription and compare it with the original.
              </p>
            </div>
            <ul className="flex flex-wrap gap-2">
              {speeds.map((speed) => (
                <li
                  key={speed}
                  className="rounded-full bg-[#F3F4F6] px-3 py-1.5 text-[13px] font-medium text-[#374151]"
                >
                  {speed}
                </li>
              ))}
            </ul>
            <Link
              href="/steno"
              className="mt-auto self-start rounded-[10px] bg-[#C2410C] px-[22px] py-3.5 text-base font-semibold text-white hover:bg-[#9A3412]"
            >
              Start steno practice →
            </Link>
          </article>
        </section>

        <section className="flex flex-col gap-5">
          <h2 className="font-display text-2xl font-semibold">How it works</h2>
          <ol className="grid gap-4 sm:grid-cols-3">
            {steps.map((step) => (
              <li
                key={step.number}
                className="flex flex-col gap-1.5 rounded-xl border border-[#E3E6EB] bg-white p-5"
              >
                <span className="font-display text-sm font-bold text-[#C2410C]">{step.number}</span>
                <h3 className="text-[17px] font-semibold">{step.title}</h3>
                <p className="text-[15px] leading-[1.55] text-[#4B5563]">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </main>
  );
}
