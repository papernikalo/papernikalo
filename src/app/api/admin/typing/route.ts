import { authFailure, authJson, readJson, rejectCrossSite } from "@/app/api/auth/http";
import { requireAdmin } from "@/lib/admin";
import { addTypingPassage, removeTypingPassage } from "@/lib/practice-content";

export async function POST(request: Request) {
  const rejected = rejectCrossSite(request);
  if (rejected) return rejected;
  try {
    const user = await requireAdmin();
    const body = await readJson(request);
    if (!body) return authJson({ error: "That passage could not be saved." }, 400);
    const passage = await addTypingPassage(user.userId, body);
    return authJson({ passage });
  } catch (error) {
    return authFailure(error, "That passage could not be saved.");
  }
}

export async function DELETE(request: Request) {
  const rejected = rejectCrossSite(request);
  if (rejected) return rejected;
  try {
    await requireAdmin();
    const body = await readJson(request);
    if (!body) return authJson({ error: "That passage could not be removed." }, 400);
    await removeTypingPassage(body.id);
    return authJson({ ok: true });
  } catch (error) {
    return authFailure(error, "That passage could not be removed.");
  }
}
