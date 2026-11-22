import { readAccessUserId } from "@/lib/auth";
import { authFailure, authJson } from "@/app/api/auth/http";

export async function GET() {
  try {
    const userId = await readAccessUserId();
    if (!userId) return authJson({ userId: null }, 401);
    return authJson({ userId });
  } catch (error) {
    return authFailure(error, "Sign in again.");
  }
}
