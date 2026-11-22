import type { Metadata } from "next";
import { PageFrame } from "@/components/page-frame";
import { jobs } from "@/lib/content";
import { tabByHref } from "@/lib/nav";

const tab = tabByHref("/jobs");

export const metadata: Metadata = {
  title: tab.label,
  description: tab.summary,
};

export default function JobsPage() {
  return (
    <PageFrame title={tab.label} summary={tab.summary}>
      <ul className="grid gap-4">
        {jobs.map((job) => (
          <li
            key={job.title}
            className="rounded-2xl border border-[#d5dee6] bg-[#ffffff] px-4 py-4 sm:px-5"
          >
            <p className="text-sm text-[#52606d]">{job.org}</p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight">{job.title}</h2>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-xs tracking-wide text-[#5c6b78] uppercase">Place</dt>
                <dd className="mt-1">{job.place}</dd>
              </div>
              <div>
                <dt className="text-xs tracking-wide text-[#5c6b78] uppercase">Qualification</dt>
                <dd className="mt-1">{job.qualification}</dd>
              </div>
              <div>
                <dt className="text-xs tracking-wide text-[#5c6b78] uppercase">Vacancies</dt>
                <dd className="mt-1">{job.vacancies}</dd>
              </div>
              <div>
                <dt className="text-xs tracking-wide text-[#5c6b78] uppercase">Last date</dt>
                <dd className="mt-1 font-medium">{job.lastDate}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
    </PageFrame>
  );
}
