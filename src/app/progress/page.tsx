import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageFrame } from "@/components/page-frame";
import { TypingProgress } from "@/components/tools/typing-progress-view";
import { privatePageMetadata } from "@/lib/seo";
import { hasSessionCookie } from "@/lib/session-cookie";

export const metadata: Metadata = privatePageMetadata({
  path: "/progress",
  title: "Progress",
  description: "Typing tests and steno practices saved on this PaperNikalo account.",
});

export const instant = false;

export default async function TypingProgressPage() {
  if (!(await hasSessionCookie())) redirect("/sign-in");

  return (
    <PageFrame
      title="Progress"
      summary="Typing tests and steno practices saved on this account, newest first."
    >
      <TypingProgress />
    </PageFrame>
  );
}
