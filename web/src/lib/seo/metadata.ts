import type { Metadata } from "next";
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_KEYWORDS,
  DEFAULT_TITLE,
  SITE_NAME,
  siteUrl,
} from "@/lib/seo/site";

type PageMetaOpts = {
  title?: string;
  description?: string;
  path?: string;
  keywords?: string[];
  noIndex?: boolean;
};

const sharedIcons: Metadata["icons"] = {
  icon: [
    { url: "/favicon.svg", type: "image/svg+xml" },
    { url: "/icon", type: "image/png", sizes: "32x32" },
  ],
  apple: [{ url: "/apple-icon", type: "image/png", sizes: "180x180" }],
  shortcut: "/favicon.svg",
};

export function rootMetadata(): Metadata {
  const base = siteUrl();
  return {
    metadataBase: new URL(base),
    title: {
      default: DEFAULT_TITLE,
      template: `%s | ${SITE_NAME}`,
    },
    description: DEFAULT_DESCRIPTION,
    keywords: DEFAULT_KEYWORDS,
    applicationName: SITE_NAME,
    authors: [{ name: SITE_NAME, url: base }],
    creator: SITE_NAME,
    publisher: SITE_NAME,
    category: "games",
    icons: sharedIcons,
    alternates: {
      canonical: base,
    },
    openGraph: {
      type: "website",
      locale: "en_US",
      url: base,
      siteName: SITE_NAME,
      title: DEFAULT_TITLE,
      description: DEFAULT_DESCRIPTION,
    },
    twitter: {
      card: "summary_large_image",
      title: DEFAULT_TITLE,
      description: DEFAULT_DESCRIPTION,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    other: {
      "apple-mobile-web-app-title": SITE_NAME,
      "mobile-web-app-capable": "yes",
    },
  };
}

export function pageMetadata(opts: PageMetaOpts = {}): Metadata {
  const base = siteUrl();
  const path = opts.path ?? "/";
  const url = path.startsWith("http") ? path : `${base}${path.startsWith("/") ? path : `/${path}`}`;
  const title = opts.title;
  const description = opts.description ?? DEFAULT_DESCRIPTION;
  const keywords = opts.keywords ?? DEFAULT_KEYWORDS;

  return {
    title,
    description,
    keywords,
    icons: sharedIcons,
    alternates: { canonical: url },
    openGraph: {
      title: title ? `${title} | ${SITE_NAME}` : DEFAULT_TITLE,
      description,
      url,
    },
    twitter: {
      card: "summary_large_image",
      title: title ? `${title} | ${SITE_NAME}` : DEFAULT_TITLE,
      description,
    },
    robots: opts.noIndex ? { index: false, follow: false } : { index: true, follow: true },
  };
}