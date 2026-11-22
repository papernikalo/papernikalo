import type { Metadata } from "next";
import Link from "next/link";
import { PageFrame } from "@/components/page-frame";
import { TypingTest } from "@/components/tools/typing-test";

export const metadata: Metadata = {
  title: "Typing test",
  description:
    "Practise the Delhi High Court SPA / PA English typing test on judgment-style passages, with exam timing and mistake counting.",
};

export default function TypingTestPage() {
  return (
    <PageFrame
      title="Typing test"
      summary="Practise the Delhi High Court SPA / PA English typing test on judgment-style passages, with exam timing and mistake counting."
    >
      <div className="mb-6">
        <Link href="/tools" className="text-sm font-medium text-[#1d4e89] underline underline-offset-4">
          ← All tools
        </Link>
      </div>
      <TypingTest />
    </PageFrame>
  );
}
