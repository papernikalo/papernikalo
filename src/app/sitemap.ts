import type { MetadataRoute } from "next";
import { publicPages } from "@/lib/seo";
import { pageUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return publicPages.map((page) => ({
    url: pageUrl(page.path),
    lastModified: page.lastModified,
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));
}
