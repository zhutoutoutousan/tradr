/** Server-side Tradili feed helpers: finance RSS + arXiv Atom. */

import { parseAtomEntries, parseRssItems, type FeedItem } from "./parseFeed";

export type { FeedItem, FeedKind } from "./parseFeed";

const UA =
  "Mozilla/5.0 (compatible; TradrTradili/1.0; +https://github.com/zhutoutoutousan/tradr)";

const NEWS_FEEDS: { source: string; url: string }[] = [
  { source: "BBC Business", url: "https://feeds.bbci.co.uk/news/business/rss.xml" },
  { source: "MarketWatch", url: "https://feeds.content.dowjones.io/public/rss/mw_topstories" },
  {
    source: "CNBC",
    url: "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100003114",
  },
];

const ARXIV_URL =
  "https://export.arxiv.org/api/query?search_query=cat:q-fin.TR+OR+cat:q-fin.CP+OR+cat:q-fin.ST&sortBy=submittedDate&sortOrder=descending&max_results=12";

async function fetchText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
      },
      // Next.js data cache when running in the App Router; ignored elsewhere.
      next: { revalidate: 600 },
      signal: AbortSignal.timeout(8_000),
    } as RequestInit);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

export async function fetchFinanceNews(perFeed = 6): Promise<FeedItem[]> {
  const results = await Promise.all(
    NEWS_FEEDS.map(async (f) => {
      const xml = await fetchText(f.url);
      if (!xml) return [] as FeedItem[];
      return parseRssItems(xml, f.source, perFeed);
    }),
  );
  const merged = results.flat();
  merged.sort((a, b) => {
    const ta = a.publishedAt ? Date.parse(a.publishedAt) : 0;
    const tb = b.publishedAt ? Date.parse(b.publishedAt) : 0;
    return tb - ta;
  });
  const seen = new Set<string>();
  return merged.filter((item) => {
    const key = item.title.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function fetchArxivPapers(): Promise<FeedItem[]> {
  const xml = await fetchText(ARXIV_URL);
  if (!xml) {
    const atom = await fetchText("https://rss.arxiv.org/atom/q-fin.TR");
    if (!atom) return [];
    return parseAtomEntries(atom, "arXiv q-fin.TR", "paper", 12);
  }
  return parseAtomEntries(xml, "arXiv", "paper", 12);
}

export async function fetchTradiliInfoFeed(): Promise<{ news: FeedItem[]; papers: FeedItem[] }> {
  const [news, papers] = await Promise.all([fetchFinanceNews(), fetchArxivPapers()]);
  return { news, papers };
}
