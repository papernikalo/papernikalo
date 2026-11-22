import { getSiteUrl } from "@/lib/site";

export function isSameSite(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  return origin === getSiteUrl() || origin === new URL(request.url).origin;
}
