import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminEditor } from "@/components/admin-editor";
import { PageFrame } from "@/components/page-frame";
import { readCurrentUser } from "@/lib/auth";
import { listCustomDictations, listCustomExams, countPracticeActivity, listStenoDictations, listTypingPassages } from "@/lib/practice-content";
import { privatePageMetadata } from "@/lib/seo";

export const metadata: Metadata = privatePageMetadata({
  path: "/admin",
  title: "Admin",
  description: "Add typing passages and steno dictations for PaperNikalo.",
});

export const instant = false;

export default async function AdminPage() {
  const user = await readCurrentUser();
  if (!user) redirect("/sign-in");

  if (!user.admin) {
    return (
      <PageFrame title="Admin" summary="Only an admin account can add passages and dictations.">
        <p className="text-[#4B5563]">This account does not have admin access.</p>
      </PageFrame>
    );
  }

  const [typing, steno, activity, customExams, customDictations] = await Promise.all([
    listTypingPassages(),
    listStenoDictations(),
    countPracticeActivity(),
    listCustomExams(),
    listCustomDictations(),
  ]);

  return (
    <main className="flex-1 bg-[#F6F7F9]">
      <AdminEditor
        name={user.name.trim() || user.userId}
        typing={typing}
        steno={steno}
        customExams={customExams.map(({ id, name }) => ({ id, name }))}
        customDictations={customDictations}
        stats={activity}
      />
    </main>
  );
}
