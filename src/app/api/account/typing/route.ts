import { authFailure, authJson, readJson, rejectCrossSite } from "@/app/api/auth/http";
import { readAccessUserId } from "@/lib/auth";
import { recordTypingAttempt, listTypingAttempts } from "@/lib/typing-attempts";
import { parseTypingAttempt } from "@/lib/typing-progress";

export async function GET() {
  try {
    const userId = await readAccessUserId();
    if (!userId) return authJson({ error: "Sign in to see your typing progress." }, 401);
    const attempts = await listTypingAttempts(userId);
    return authJson({ attempts });
  } catch (error) {
    return authFailure(error, "Typing progress could not be loaded.");
  }
}

export async function POST(request: Request) {
  const rejected = rejectCrossSite(request);
  if (rejected) return rejected;
  try {
    const userId = await readAccessUserId();
    if (!userId) return authJson({ error: "Sign in to save typing progress." }, 401);
    const body = await readJson(request);
    if (!body) return authJson({ error: "That attempt could not be saved." }, 400);
    const incoming = Array.isArray(body.attempts) ? body.attempts.slice(0, 30) : [body];
    const saved = [];
    for (const item of incoming) {
      const attempt = parseTypingAttempt(item);
      if (!attempt) return authJson({ error: "That attempt could not be saved." }, 400);
      saved.push(await recordTypingAttempt(userId, attempt));
    }
    return authJson({ attempts: saved });
  } catch (error) {
    return authFailure(error, "That attempt could not be saved.");
  }
}
