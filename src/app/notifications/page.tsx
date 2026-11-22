import type { Metadata } from "next";
import { PageFrame } from "@/components/page-frame";
import { notifications } from "@/lib/content";
import { tabByHref } from "@/lib/nav";

const tab = tabByHref("/notifications");

export const metadata: Metadata = {
  title: tab.label,
  description: tab.summary,
};

export default function NotificationsPage() {
  return (
    <PageFrame title={tab.label} summary={tab.summary}>
      <ul className="grid gap-3">
        {notifications.map((item) => (
          <li
            key={item.title}
            className="rounded-2xl border border-[#d5dee6] bg-[#ffffff] px-4 py-4 sm:px-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="rounded-full bg-[#f3f5f7] px-2.5 py-1 text-xs font-medium text-[#1d4e89]">
                {item.kind}
              </p>
              <time className="text-sm text-[#5c6b78]">{item.date}</time>
            </div>
            <h2 className="mt-3 font-semibold tracking-tight">{item.title}</h2>
            <p className="mt-1 text-sm leading-6 text-[#52606d]">{item.detail}</p>
          </li>
        ))}
      </ul>
    </PageFrame>
  );
}
