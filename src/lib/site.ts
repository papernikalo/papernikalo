export const siteName = "PaperNikalo";
export const siteTagline = "Government job notices across India";

/** Fixed reference date so open and closed labels stay static. */
export const asOf = "2026-11-17";
export const asOfLabel = "17 November 2026";

/**
 * Public origin for canonical URLs, Open Graph, JSON-LD, sitemap.xml, and robots.txt.
 * Set NEXT_PUBLIC_SITE_URL to the live https origin before a production deploy.
 * On Vercel, VERCEL_PROJECT_PRODUCTION_URL is used when that value is unset.
 */
let warnedLocalProduction = false;

export function getSiteUrl() {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  const preview = process.env.VERCEL_URL?.trim();
  const raw =
    explicit ||
    (production ? `https://${production}` : "") ||
    (preview ? `https://${preview}` : "") ||
    "http://localhost:3000";

  const url = raw.replace(/\/$/, "");
  if (
    !warnedLocalProduction &&
    process.env.NODE_ENV === "production" &&
    /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(url)
  ) {
    warnedLocalProduction = true;
    console.warn(
      "NEXT_PUBLIC_SITE_URL is a local address during a production build. Set it to the live https origin so canonical URLs, the sitemap, and robots.txt use the public domain.",
    );
  }
  return url;
}

export function absoluteUrl(path: string) {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${getSiteUrl()}${normalized}`;
}

/** Canonical page URL. The homepage has no trailing slash, matching the canonical link. */
export function pageUrl(path: string) {
  if (path === "/" || path === "") return getSiteUrl();
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${getSiteUrl()}${normalized.replace(/\/$/, "")}`;
}
