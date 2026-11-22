import { cookies } from "next/headers";
import { signOutAccount } from "@/lib/auth";
import { REFRESH_COOKIE } from "@/lib/auth-config";
import { authFailure, authJson, rejectCrossSite } from "@/app/api/auth/http";

export async function POST(request: Request) {
  const rejected = rejectCrossSite(request);
  if (rejected) return rejected;

  try {
    const jar = await cookies();
    await signOutAccount(jar.get(REFRESH_COOKIE)?.value);
    return authJson({ ok: true });
  } catch (error) {
    return authFailure(error, "Sign-out failed.");
  }
}
