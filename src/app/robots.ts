import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

/**
 * Sign-in and sign-up stay crawlable so their noindex tag can be seen.
 * Disallow only routes that are private or that redirect into a private flow.
 * /api/ is not required to render the public HTML.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/account",
        "/transactions",
        "/subscribe",
        "/pricing",
        "/tools/typing/progress",
      ],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
