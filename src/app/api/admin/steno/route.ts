import { authFailure, authJson, readJson, rejectCrossSite } from "@/app/api/auth/http";
import { requireAdmin } from "@/lib/admin";
import { addStenoDictation, removeStenoDictation } from "@/lib/practice-content";

export async function POST(request: Request) {
  const rejected = rejectCrossSite(request);
  if (rejected) return rejected;
  try {
    const user = await requireAdmin();
    const body = await readJson(request);
    if (!body) return authJson({ error: "That dictation could not be saved." }, 400);
    const dictation = await addStenoDictation(user.userId, body);
    return authJson({ dictation });
  } catch (error) {
    return authFailure(error, "That dictation could not be saved.");
  }
}

export async function DELETE(request: Request) {
  const rejected = rejectCrossSite(request);
  if (rejected) return rejected;
  try {
    await requireAdmin();
    const body = await readJson(request);
    if (!body) return authJson({ error: "That dictation could not be removed." }, 400);
    await removeStenoDictation(body.id);
    return authJson({ ok: true });
  } catch (error) {
    return authFailure(error, "That dictation could not be removed.");
  }
}
