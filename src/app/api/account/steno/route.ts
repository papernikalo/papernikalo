import { authFailure, authJson, readJson, rejectCrossSite } from "@/app/api/auth/http";
import { readAccessUserId } from "@/lib/auth";
import { listStenoAttempts, recordStenoAttempt } from "@/lib/steno-attempts";
import { parseStenoAttempt } from "@/lib/steno-progress";

export async function GET() {
  try {
    const userId = await readAccessUserId();
    if (!userId) return authJson({ error: "Sign in to see your progress." }, 401);
    const attempts = await listStenoAttempts(userId);
    return authJson({ attempts });
  } catch (error) {
    return authFailure(error, "Progress could not be loaded.");
  }
}

export async function POST(request: Request) {
  const rejected = rejectCrossSite(request);
  if (rejected) return rejected;
  try {
    const userId = await readAccessUserId();
    if (!userId) return authJson({ error: "Sign in to save this practice." }, 401);
    const body = await readJson(request);
    const attempt = parseStenoAttempt(body);
    if (!attempt) return authJson({ error: "That practice could not be saved." }, 400);
    return authJson({ attempt: await recordStenoAttempt(userId, attempt) });
  } catch (error) {
    return authFailure(error, "That practice could not be saved.");
  }
}
