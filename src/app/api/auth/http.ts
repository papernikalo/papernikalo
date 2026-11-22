import { unstable_rethrow } from "next/navigation";
import { AuthError } from "@/lib/auth-config";
import { isSameSite } from "@/lib/same-origin";

export function authJson(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export function rejectCrossSite(request: Request) {
  if (isSameSite(request)) return null;
  return authJson({ error: "Use the PaperNikalo site to sign in." }, 403);
}

export async function readJson(request: Request) {
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function authFailure(error: unknown, fallback: string) {
  unstable_rethrow(error);
  if (error instanceof AuthError) {
    return authJson({ error: error.message }, error.status);
  }
  console.error(error);
  return authJson({ error: fallback }, 500);
}
