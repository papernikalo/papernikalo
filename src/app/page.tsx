import type { Metadata } from "next";
import Link from "next/link";
import { governmentJobNames, governmentJobs } from "@/lib/content";
import { tabs } from "@/lib/nav";
import { siteName, siteTagline } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: siteName },
  description: `${siteTagline}. ${governmentJobNames.join(", ")}.`,
  keywords: governmentJobNames,
};

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <section className="mx-auto max-w-3xl text-center">
        <div>
          <p className="text-sm font-medium text-[#1d4e89]">Central and state exams</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-balance sm:text-5xl sm:leading-[1.08]">
            {siteTagline}
          </h1>
          <p className="mt-4 text-base leading-7 text-[#52606d] sm:text-lg">
            SSC, UPSC, railways, banks, and state exams in one list. An underlined
            name opens that board&apos;s own site. Dates and vacancy numbers here
            are examples, so check the notice before you apply. Photo and PDF tools run in
            your browser.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <a
              href="#job-directory"
              className="rounded-full bg-[#1c2834] px-4 py-2.5 text-sm font-medium text-[#f3f5f7]"
            >
              Browse job names
            </a>
            <Link
              href="/tools"
              className="rounded-full border border-[#1c2834] bg-[#ffffff] px-4 py-2.5 text-sm font-medium"
            >
              Prepare a form
            </Link>
          </div>
        </div>
      </section>

      <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tabs.map((tab) => (
          <li key={tab.href}>
            <Link
              href={tab.href}
              className="flex h-full flex-col rounded-2xl border border-[#d5dee6] bg-[#ffffff] px-4 py-4 transition-colors hover:border-[#8aa4bc]"
            >
              <p className="font-medium">{tab.label}</p>
              <p className="mt-2 flex-1 text-sm leading-6 text-[#52606d]">{tab.summary}</p>
              <p className="mt-4 text-sm font-medium text-[#1d4e89]">Open</p>
            </Link>
          </li>
        ))}
      </ul>

      <section aria-labelledby="government-jobs" id="job-directory" className="scroll-mt-24 pt-14">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="government-jobs" className="text-2xl font-semibold tracking-tight">
            Government jobs
          </h2>
          <p className="mt-2 text-[#52606d]">
            {governmentJobNames.length} exam names. Underlined ones open the
            official site.
          </p>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {governmentJobs.map((group) => {
            const headingId = group.group.toLowerCase().replaceAll(" ", "-");
            return (
              <section
                key={group.group}
                aria-labelledby={headingId}
                className="rounded-2xl border border-[#d5dee6] bg-[#ffffff] p-5"
              >
                <h3
                  id={headingId}
                  className="border-b border-[#e6edf2] pb-3 text-sm font-semibold text-[#1d4e89]"
                >
                  {group.group}
                </h3>
                <ul className="mt-3 columns-1 gap-x-6 sm:columns-2">
                  {group.jobs.map((job) => (
                    <li key={job.name} className="break-inside-avoid py-1 text-sm leading-6">
                      {job.href ? (
                        <a
                          href={job.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline decoration-[#d5dee6] underline-offset-4 hover:decoration-[#1d4e89]"
                        >
                          {job.name}
                        </a>
                      ) : (
                        <span className="text-[#5c6b78]">{job.name}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </section>
    </main>
  );
}
