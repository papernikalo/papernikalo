import { authFailure, authJson, readJson, rejectCrossSite } from "@/app/api/auth/http";
import { readAccessUserId, updateAccount } from "@/lib/auth";
import { AuthError } from "@/lib/auth-config";

export async function POST(request: Request) {
  const rejected = rejectCrossSite(request);
  if (rejected) return rejected;

  const body = await readJson(request);
  if (!body) return authJson({ error: "The account could not be saved." }, 400);

  try {
    const userId = await readAccessUserId();
    if (!userId) throw new AuthError("Sign in again.", 401);
    const user = await updateAccount(userId, body);
    return authJson({ user });
  } catch (error) {
    return authFailure(error, "The account could not be saved.");
  }
}
