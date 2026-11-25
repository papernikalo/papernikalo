import type { Metadata } from "next";
import { tools } from "@/lib/content";
import { merchant } from "@/lib/merchant";
import { getSiteUrl, pageUrl, siteName, siteTagline } from "@/lib/site";

/** Date of the public page set published in the sitemap. */
const sitemapUpdated = "2026-11-25";

const shareImage = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: `${siteName}. ${siteTagline}.`,
} as const;

export type PublicPage = {
  path: string;
  /** Visible H1. The document title adds the site name when the H1 does not already include it. */
  title: string;
  description: string;
  keywords: string[];
  /** Label used when this page is a parent in a breadcrumb. Matches the visible nav or logo. */
  crumb: string;
  parent?: string;
  schemaType?: "WebPage" | "AboutPage" | "ContactPage";
  changeFrequency: "monthly" | "yearly";
  priority: number;
  lastModified: string;
};

/**
 * Indexable pages. Keyword lists are editorial targets taken from the page
 * content. They are not search-volume or difficulty figures.
 */
export const publicPages: PublicPage[] = [
  {
    path: "/",
    title: "Practice typing and steno the way the exam tests you",
    description:
      "Pick a tool to begin. Typing tests follow each exam body's pattern, and steno dictations play at the speed you choose.",
    keywords: [
      "typing test",
      "steno practice",
      "SSC typing test",
      "government exam typing",
      "shorthand dictation",
      "typing speed accuracy",
    ],
    crumb: siteName,
    changeFrequency: "monthly",
    priority: 1,
    lastModified: sitemapUpdated,
  },
  {
    path: "/tools",
    title: "Form photo and PDF tools",
    description:
      "Resize a form photo, crop a signature, clear the background, and compress or merge PDFs in your browser before you upload.",
    keywords: [
      "form photo resizer",
      "signature crop",
      "plain photo background",
      "PDF compress",
      "merge PDF",
      "application form upload",
    ],
    crumb: "Tools",
    parent: "/",
    changeFrequency: "monthly",
    priority: 0.8,
    lastModified: sitemapUpdated,
  },
  {
    path: "/typing",
    title: "Delhi High Court typing test",
    description:
      "Practise the Delhi High Court SPA and PA English typing test on judgment-style passages, with exam timing and mistake counting.",
    keywords: [
      "Delhi High Court typing test",
      "SPA typing test",
      "PA typing test",
      "English typing practice",
    ],
    crumb: "Typing",
    parent: "/",
    changeFrequency: "monthly",
    priority: 0.8,
    lastModified: sitemapUpdated,
  },
  {
    path: "/steno",
    title: "Steno dictation",
    description:
      "Pick a speed, listen to a dictation, take it down in shorthand, then type your transcription and compare it with the original.",
    keywords: [
      "steno practice",
      "shorthand dictation",
      "stenography test",
      "dictation 80 wpm",
      "dictation 100 wpm",
    ],
    crumb: "Steno",
    parent: "/",
    changeFrequency: "monthly",
    priority: 0.7,
    lastModified: sitemapUpdated,
  },
  {
    path: "/jobs",
    title: "Sample government job notices",
    description:
      "Sample notices for SSC CGL, UPSC Civil Services, RRB NTPC, IBPS PO, and a state sub-inspector post. Confirm the official notice before you apply.",
    keywords: [
      "sample government job notice",
      "SSC CGL",
      "UPSC CSE",
      "RRB NTPC",
      "IBPS PO",
    ],
    crumb: "Jobs",
    parent: "/",
    changeFrequency: "monthly",
    priority: 0.8,
    lastModified: sitemapUpdated,
  },
  {
    path: "/notifications",
    title: "Exam notifications",
    description:
      "Example admit card, result, recruitment, and last-date lines for SSC, UPSC, railways, and IBPS. These are not live alerts.",
    keywords: ["exam notification", "admit card", "exam result", "last date to apply"],
    crumb: "Notifications",
    parent: "/",
    changeFrequency: "monthly",
    priority: 0.6,
    lastModified: sitemapUpdated,
  },
  {
    path: "/about",
    title: "About PaperNikalo",
    description:
      "PaperNikalo lists recruitment exam names from Indian government bodies and runs form photo and PDF tools in your browser.",
    keywords: ["About PaperNikalo", "government exam list", "form document tools"],
    crumb: "About",
    parent: "/",
    schemaType: "AboutPage",
    changeFrequency: "yearly",
    priority: 0.5,
    lastModified: sitemapUpdated,
  },
  {
    path: "/contact",
    title: "Contact PaperNikalo",
    description:
      "Email, postal address in New Delhi, and support hours for payments, refunds, and other questions about PaperNikalo.",
    keywords: ["contact PaperNikalo", "PaperNikalo support", "New Delhi"],
    crumb: "Contact",
    parent: "/",
    schemaType: "ContactPage",
    changeFrequency: "yearly",
    priority: 0.5,
    lastModified: sitemapUpdated,
  },
  {
    path: "/terms",
    title: "Terms and conditions",
    description:
      "Terms for using PaperNikalo, including sample listings, browser-based form tools, and payments in Indian rupees.",
    keywords: ["PaperNikalo terms", "terms and conditions"],
    crumb: "Terms",
    parent: "/",
    changeFrequency: "yearly",
    priority: 0.3,
    lastModified: sitemapUpdated,
  },
  {
    path: "/privacy",
    title: "Privacy policy",
    description:
      "What PaperNikalo stores when you create an account or pay, and how card, UPI, and netbanking details are handled.",
    keywords: ["PaperNikalo privacy policy", "account data"],
    crumb: "Privacy",
    parent: "/",
    changeFrequency: "yearly",
    priority: 0.3,
    lastModified: sitemapUpdated,
  },
  {
    path: "/refunds",
    title: "Cancellation and refunds",
    description:
      "How to cancel a PaperNikalo payment before it is captured, and when a duplicate charge or a failed tools page is refunded.",
    keywords: ["PaperNikalo refund", "cancellation and refunds"],
    crumb: "Cancellation and refunds",
    parent: "/",
    changeFrequency: "yearly",
    priority: 0.3,
    lastModified: sitemapUpdated,
  },
];

const pagesByPath = new Map(publicPages.map((page) => [page.path, page]));

export function publicPage(path: string) {
  const page = pagesByPath.get(path);
  if (!page) throw new Error(`Missing SEO page ${path}`);
  return page;
}

export function documentTitle(page: Pick<PublicPage, "title">) {
  if (page.title.includes(siteName)) return page.title;
  return `${page.title} · ${siteName}`;
}

function social(
  title: string,
  description: string,
  path?: string,
): Pick<Metadata, "openGraph" | "twitter"> {
  return {
    openGraph: {
      title,
      description,
      ...(path ? { url: path } : {}),
      siteName,
      locale: "en_IN",
      type: "website",
      images: [shareImage],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [shareImage],
    },
  };
}

export function rootMetadata(): Metadata {
  const home = publicPage("/");
  return {
    metadataBase: new URL(getSiteUrl()),
    title: {
      default: documentTitle(home),
      template: `%s · ${siteName}`,
    },
    description: home.description,
    applicationName: siteName,
    authors: [{ name: merchant.legalName, url: getSiteUrl() }],
    creator: merchant.legalName,
    publisher: merchant.legalName,
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    ...social(documentTitle(home), home.description),
  };
}

export function pageMetadata(page: PublicPage): Metadata {
  const title = documentTitle(page);
  return {
    title: { absolute: title },
    description: page.description,
    keywords: page.keywords,
    alternates: { canonical: page.path },
    ...social(title, page.description, page.path),
  };
}

/** Signed-in, checkout, and account routes. Crawlable only when they are linked, and not indexed. */
export function notFoundMetadata(): Metadata {
  const title = `Page not found · ${siteName}`;
  const description = "That address is not a page on PaperNikalo.";
  return {
    title: { absolute: title },
    description,
    robots: { index: false, follow: true },
    ...social(title, description),
  };
}

export function privatePageMetadata(page: {
  path: string;
  title: string;
  description: string;
}): Metadata {
  const title = `${page.title} · ${siteName}`;
  return {
    title: { absolute: title },
    description: page.description,
    alternates: { canonical: page.path },
    robots: { index: false, follow: true },
    ...social(title, page.description, page.path),
  };
}

function organizationId() {
  return `${getSiteUrl()}/#organization`;
}

function websiteId() {
  return `${getSiteUrl()}/#website`;
}

export function siteJsonLd() {
  const organization: Record<string, unknown> = {
    "@type": "Organization",
    "@id": organizationId(),
    name: merchant.legalName,
    url: getSiteUrl(),
    email: merchant.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: merchant.address,
      addressLocality: merchant.city,
      addressCountry: "IN",
    },
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: merchant.email,
      areaServed: "IN",
      availableLanguage: "en",
      hoursAvailable: {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: [
          "https://schema.org/Monday",
          "https://schema.org/Tuesday",
          "https://schema.org/Wednesday",
          "https://schema.org/Thursday",
          "https://schema.org/Friday",
          "https://schema.org/Saturday",
        ],
        opens: "10:00",
        closes: "18:00",
      },
    },
  };

  return {
    "@context": "https://schema.org",
    "@graph": [
      organization,
      {
        "@type": "WebSite",
        "@id": websiteId(),
        name: siteName,
        url: getSiteUrl(),
        description: siteTagline,
        inLanguage: "en-IN",
        publisher: { "@id": organizationId() },
      },
    ],
  };
}

function breadcrumbItems(page: PublicPage) {
  const chain: PublicPage[] = [];
  let current: PublicPage | undefined = page;
  while (current) {
    chain.unshift(current);
    current = current.parent ? pagesByPath.get(current.parent) : undefined;
  }
  return chain.map((item, index) => ({
    name: index === chain.length - 1 ? item.title : item.crumb,
    path: item.path,
  }));
}

export function pageJsonLd(page: PublicPage) {
  const url = pageUrl(page.path);
  const webpage: Record<string, unknown> = {
    "@type": page.schemaType ?? "WebPage",
    "@id": `${url}#webpage`,
    url,
    name: documentTitle(page),
    description: page.description,
    dateModified: page.lastModified,
    inLanguage: "en-IN",
    isPartOf: { "@id": websiteId() },
    publisher: { "@id": organizationId() },
  };
  const graph: Record<string, unknown>[] = [webpage];

  if (page.path !== "/") {
    const crumbs = breadcrumbItems(page);
    webpage.breadcrumb = { "@id": `${url}#breadcrumb` };
    graph.push({
      "@type": "BreadcrumbList",
      "@id": `${url}#breadcrumb`,
      itemListElement: crumbs.map((crumb, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: crumb.name,
        item: pageUrl(crumb.path),
      })),
    });
  }

  if (page.path === "/tools") {
    webpage.mainEntity = { "@id": `${url}#tools` };
    graph.push({
      "@type": "ItemList",
      "@id": `${url}#tools`,
      name: page.title,
      itemListElement: tools.map((tool, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: tool.name,
        description: tool.detail,
      })),
    });
  }

  return {
    "@context": "https://schema.org",
    "@graph": graph,
  };
}
