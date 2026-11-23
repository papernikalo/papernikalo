import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageFrame } from "@/components/page-frame";
import { TypingProgress } from "@/components/tools/typing-progress-view";
import { privatePageMetadata } from "@/lib/seo";
import { hasSessionCookie } from "@/lib/session-cookie";

export const metadata: Metadata = privatePageMetadata({
  path: "/tools/typing/progress",
  title: "Typing progress",
  description: "Typing attempts saved on this PaperNikalo account.",
});

export const instant = false;

export default async function TypingProgressPage() {
  if (!(await hasSessionCookie())) redirect("/sign-in");

  return (
    <PageFrame
      title="Typing progress"
      summary="Attempts saved on this account, newest first. The 40 wpm line is only for the 10 minute test."
    >
      <div className="mb-6">
        <Link href="/tools/typing" className="text-sm font-medium text-[#1d4e89] underline underline-offset-4">
          ← Typing test
        </Link>
      </div>
      <TypingProgress />
    </PageFrame>
  );
}
