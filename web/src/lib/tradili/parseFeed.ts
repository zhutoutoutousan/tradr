/** Pure RSS/Atom parsers used by Tradili info feeds. */

export type FeedKind = "news" | "paper";

export interface FeedItem {
  id: string;
  kind: FeedKind;
  title: string;
  summary: string;
  url: string;
  source: string;
  publishedAt: string | null;
}

function decodeXml(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => {
      try {
        return String.fromCodePoint(parseInt(h, 16));
      } catch {
        return "";
      }
    })
    .replace(/&#(\d+);/g, (_, n) => {
      try {
        return String.fromCodePoint(Number(n));
      } catch {
        return "";
      }
    })
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function tag(block: string, name: string): string {
  const re = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i");
  const m = block.match(re);
  return m ? decodeXml(m[1]) : "";
}

function linkFrom(block: string): string {
  const href = block.match(/<link[^>]*href=["']([^"']+)["'][^>]*\/?>/i);
  if (href) return href[1];
  const plain = tag(block, "link");
  if (plain.startsWith("http")) return plain;
  return "";
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export function parseRssItems(xml: string, source: string, limit: number): FeedItem[] {
  const chunks = xml.split(/<item[\s>]/i).slice(1);
  const out: FeedItem[] = [];
  for (const raw of chunks) {
    const block = raw.split(/<\/item>/i)[0] ?? "";
    const title = tag(block, "title");
    const url = linkFrom(block) || tag(block, "guid");
    if (!title || !url) continue;
    const summary = stripHtml(tag(block, "description") || tag(block, "summary")).slice(0, 220);
    const publishedAt = tag(block, "pubDate") || tag(block, "dc:date") || null;
    out.push({
      id: `news-${source}-${url}`,
      kind: "news",
      title,
      summary,
      url,
      source,
      publishedAt,
    });
    if (out.length >= limit) break;
  }
  return out;
}

export function parseAtomEntries(xml: string, source: string, kind: FeedKind, limit: number): FeedItem[] {
  const chunks = xml.split(/<entry[\s>]/i).slice(1);
  const out: FeedItem[] = [];
  for (const raw of chunks) {
    const block = raw.split(/<\/entry>/i)[0] ?? "";
    const title = tag(block, "title");
    const url = linkFrom(block);
    if (!title || !url) continue;
    const summary = stripHtml(tag(block, "summary") || tag(block, "content")).slice(0, 280);
    const publishedAt = tag(block, "published") || tag(block, "updated") || null;
    const id = tag(block, "id") || url;
    out.push({
      id: `${kind}-${id}`,
      kind,
      title,
      summary,
      url: url.replace("http://arxiv.org/", "https://arxiv.org/"),
      source,
      publishedAt,
    });
    if (out.length >= limit) break;
  }
  return out;
}
