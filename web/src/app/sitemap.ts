import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const now = new Date();

  return [
    { url: base, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/multiplayer`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/community`, lastModified: now, changeFrequency: "daily", priority: 0.85 },
    { url: `${base}/register`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
  ];
}