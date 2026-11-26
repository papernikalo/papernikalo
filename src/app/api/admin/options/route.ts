import { authFailure, authJson, readJson, rejectCrossSite } from "@/app/api/auth/http";
import { requireAdmin } from "@/lib/admin";
import { addPracticeOption, removePracticeOption } from "@/lib/practice-content";

export async function POST(request: Request) {
  const rejected = rejectCrossSite(request);
  if (rejected) return rejected;
  try {
    const user = await requireAdmin();
    const body = await readJson(request);
    if (!body) return authJson({ error: "That option could not be saved." }, 400);
    const option = await addPracticeOption(user.userId, body.kind, body.name);
    return authJson({ option });
  } catch (error) {
    return authFailure(error, "That option could not be saved.");
  }
}

export async function DELETE(request: Request) {
  const rejected = rejectCrossSite(request);
  if (rejected) return rejected;
  try {
    await requireAdmin();
    const body = await readJson(request);
    if (!body) return authJson({ error: "That option could not be removed." }, 400);
    await removePracticeOption(body.kind, body.id);
    return authJson({ ok: true });
  } catch (error) {
    return authFailure(error, "That option could not be removed.");
  }
}
