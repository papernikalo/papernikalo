import { authFailure, authJson } from "@/app/api/auth/http";
import { readAccessUserId } from "@/lib/auth";
import { listServiceAccess } from "@/lib/entitlements";

export async function GET() {
  try {
    const userId = await readAccessUserId();
    if (!userId) return authJson({ error: "Sign in to see your services." }, 401);
    return authJson({ services: await listServiceAccess(userId) });
  } catch (error) {
    return authFailure(error, "Services could not be loaded.");
  }
}
