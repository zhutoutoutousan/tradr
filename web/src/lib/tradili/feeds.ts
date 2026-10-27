/** Server-side Tradili feed helpers: finance RSS, quant blogs, arXiv. */

import { parseAtomEntries, parseRssItems, type FeedItem } from "./parseFeed";

export type { FeedItem, FeedKind } from "./parseFeed";

const UA =
  "Mozilla/5.0 (compatible; TradrTradili/1.0; +https://github.com/zhutoutoutousan/tradr)";

/** General finance headlines — free public RSS. */
const NEWS_FEEDS: { source: string; url: string }[] = [
  { source: "BBC Business", url: "https://feeds.bbci.co.uk/news/business/rss.xml" },
  { source: "MarketWatch", url: "https://feeds.content.dowjones.io/public/rss/mw_topstories" },
  {
    source: "CNBC",
    url: "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100003114",
  },
];

/**
 * Quant / systematic blogs — free public RSS (verified 2026-10).
 * Skip sources that 403/503 under server UA (Cloudflare, etc.).
 */
const QUANT_BLOG_FEEDS: { source: string; url: string }[] = [
  { source: "Quantocracy", url: "https://quantocracy.com/feed/" },
  { source: "Robot Wealth", url: "https://robotwealth.com/feed/" },
  { source: "QuantInsti", url: "https://blog.quantinsti.com/rss/" },
  { source: "Alpha Architect", url: "https://alphaarchitect.com/feed/" },
];

const ARXIV_API =
  "https://export.arxiv.org/api/query?search_query=cat:q-fin.TR+OR+cat:q-fin.CP+OR+cat:q-fin.ST+OR+cat:q-fin.PR&sortBy=submittedDate&sortOrder=descending&max_results=16";

const ARXIV_RSS = "https://rss.arxiv.org/rss/q-fin";
const ARXIV_ATOM_CP = "https://rss.arxiv.org/atom/q-fin.CP";

async function fetchText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
      },
      redirect: "follow",
      // QuantInsti (and similar) RSS can exceed Next's 2MB data-cache limit.
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    } as RequestInit);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function dedupeByTitle(items: FeedItem[]): FeedItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.title.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function sortByDate(items: FeedItem[]): FeedItem[] {
  return [...items].sort((a, b) => {
    const ta = a.publishedAt ? Date.parse(a.publishedAt) : 0;
    const tb = b.publishedAt ? Date.parse(b.publishedAt) : 0;
    return tb - ta;
  });
}

async function fetchRssGroup(
  feeds: { source: string; url: string }[],
  kind: "news" | "blog",
  perFeed: number,
): Promise<FeedItem[]> {
  const results = await Promise.all(
    feeds.map(async (f) => {
      const xml = await fetchText(f.url);
      if (!xml) return [] as FeedItem[];
      return parseRssItems(xml, f.source, perFeed, kind);
    }),
  );
  return dedupeByTitle(sortByDate(results.flat()));
}

export async function fetchFinanceNews(perFeed = 6): Promise<FeedItem[]> {
  return fetchRssGroup(NEWS_FEEDS, "news", perFeed);
}

export async function fetchQuantBlogs(perFeed = 5): Promise<FeedItem[]> {
  return fetchRssGroup(QUANT_BLOG_FEEDS, "blog", perFeed);
}

export async function fetchArxivPapers(): Promise<FeedItem[]> {
  const xml = await fetchText(ARXIV_API);
  if (xml) return parseAtomEntries(xml, "arXiv", "paper", 16);

  const rss = await fetchText(ARXIV_RSS);
  if (rss) {
    // arXiv RSS is RSS 2.0 with arxiv namespace — parse as items, retag kind.
    return parseRssItems(rss, "arXiv q-fin", 16, "paper");
  }

  const atom = await fetchText(ARXIV_ATOM_CP);
  if (!atom) return [];
  return parseAtomEntries(atom, "arXiv q-fin.CP", "paper", 12);
}

export async function fetchTradiliInfoFeed(): Promise<{
  news: FeedItem[];
  blogs: FeedItem[];
  papers: FeedItem[];
}> {
  const [news, blogs, papers] = await Promise.all([
    fetchFinanceNews(),
    fetchQuantBlogs(),
    fetchArxivPapers(),
  ]);
  return { news, blogs, papers };
}

/** Catalog for Academy / API docs (no network). */
export const QUANT_FEED_CATALOG = [
  ...NEWS_FEEDS.map((f) => ({ ...f, kind: "news" as const })),
  ...QUANT_BLOG_FEEDS.map((f) => ({ ...f, kind: "blog" as const })),
  { source: "arXiv q-fin", url: ARXIV_RSS, kind: "paper" as const },
  { source: "arXiv API (TR/CP/ST/PR)", url: ARXIV_API, kind: "paper" as const },
];
