export const tabs = [
  {
    href: "/tools",
    label: "Tools",
    summary: "Get a form photo, signature, and PDF ready before you upload them.",
  },
  {
    href: "/practice",
    label: "Practice",
    summary: "Try a question from the kind of paper these exams set.",
  },
  {
    href: "/jobs",
    label: "Jobs",
    summary: "A short list of openings, so you can see how a notice is laid out.",
  },
  {
    href: "/notifications",
    label: "Notifications",
    summary: "Admit cards, results, and last dates. These are examples, not live alerts.",
  },
] as const;

export const publicPaths = ["/", ...tabs.map((tab) => tab.href)] as const;

export type TabHref = (typeof tabs)[number]["href"];

export function tabByHref(href: TabHref) {
  const tab = tabs.find((item) => item.href === href);
  if (!tab) {
    throw new Error(`Missing tab ${href}`);
  }
  return tab;
}
