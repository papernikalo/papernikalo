import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { PageFrame } from "@/components/page-frame";
import { practiceSets, sampleQuestion } from "@/lib/content";
import { tabByHref } from "@/lib/nav";
import { pageJsonLd, pageMetadata, publicPage } from "@/lib/seo";

const tab = tabByHref("/practice");
const page = publicPage("/practice");

export const metadata: Metadata = pageMetadata(page);

export default function PracticePage() {
  return (
    <PageFrame title={page.title} summary={tab.summary}>
      <JsonLd data={pageJsonLd(page)} />
      <p className="mb-6 text-sm leading-6 text-[#52606d]">
        Sample notices for these exams are on the{" "}
        <Link href="/jobs" className="font-medium text-[#1d4e89] underline underline-offset-4">
          job notices
        </Link>{" "}
        page.
      </p>
      <article className="rounded-2xl border border-[#d5dee6] bg-[#ffffff] px-4 py-5 sm:px-6">
        <p className="text-sm font-medium text-[#1d4e89]">Try this</p>
        <h2 className="mt-2 text-xl font-semibold leading-7 tracking-tight">
          {sampleQuestion.prompt}
        </h2>
        <ol className="mt-4 grid gap-2">
          {sampleQuestion.options.map((option, index) => {
            const correct = index === sampleQuestion.answerIndex;
            return (
              <li
                key={option}
                className={
                  correct
                    ? "flex items-center justify-between gap-3 rounded-xl border border-[#1d4e89] bg-[#e8f1f8] px-3 py-2.5"
                    : "flex items-center gap-3 rounded-xl border border-[#e6edf2] px-3 py-2.5"
                }
              >
                <span>
                  <span className="mr-2 text-sm font-medium text-[#5c6b78]">
                    {String.fromCharCode(65 + index)}
                  </span>
                  {option}
                </span>
                {correct ? (
                  <span className="rounded-full bg-[#1d4e89] px-2 py-0.5 text-xs font-medium text-[#f3f5f7]">
                    Answer
                  </span>
                ) : null}
              </li>
            );
          })}
        </ol>
        <p className="mt-4 text-sm leading-6 text-[#52606d]">{sampleQuestion.explanation}</p>
      </article>

      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {practiceSets.map((set) => (
          <li
            key={set.exam}
            className="rounded-2xl border border-[#d5dee6] bg-[#ffffff] px-4 py-4"
          >
            <h2 className="font-semibold tracking-tight">{set.exam}</h2>
            <p className="mt-2 text-sm leading-6 text-[#52606d]">
              {set.level} · {set.questions} questions · {set.papers}{" "}
              {set.papers === 1 ? "paper" : "papers"}
            </p>
          </li>
        ))}
      </ul>
    </PageFrame>
  );
}
