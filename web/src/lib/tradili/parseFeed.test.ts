import { describe, expect, it } from "vitest";
import { parseAtomEntries, parseRssItems } from "./parseFeed";

const RSS = `<?xml version="1.0"?>
<rss version="2.0"><channel>
<title>Demo</title>
<item>
  <title>Markets rally on rate cut bets</title>
  <link>https://example.com/a</link>
  <description><![CDATA[<p>Stocks jump as traders price cuts.</p>]]></description>
  <pubDate>Mon, 20 Oct 2026 12:00:00 GMT</pubDate>
</item>
<item>
  <title>Oil slips</title>
  <guid>https://example.com/b</guid>
  <description>Crude softens.</description>
</item>
</channel></rss>`;

const ATOM = `<?xml version="1.0"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <id>http://arxiv.org/abs/2510.00001</id>
    <title>Deep RL for Market Making</title>
    <link href="https://arxiv.org/abs/2510.00001" rel="alternate"/>
    <summary>We study RL agents on LOB data.</summary>
    <published>2026-10-01T00:00:00Z</published>
  </entry>
</feed>`;

describe("parseFeed", () => {
  it("parses RSS items with CDATA", () => {
    const items = parseRssItems(RSS, "Demo", 10);
    expect(items).toHaveLength(2);
    expect(items[0].title).toBe("Markets rally on rate cut bets");
    expect(items[0].summary).toContain("Stocks jump");
    expect(items[0].url).toBe("https://example.com/a");
    expect(items[0].kind).toBe("news");
  });

  it("decodes numeric HTML entities in titles", () => {
    const xml = `<?xml version="1.0"?><rss><channel><item>
      <title>&#x2018;Hello&#x2019; &amp; markets</title>
      <link>https://example.com/c</link>
    </item></channel></rss>`;
    const items = parseRssItems(xml, "Demo", 1);
    expect(items[0].title).toBe("‘Hello’ & markets");
  });

  it("parses Atom entries for arXiv-style papers", () => {
    const items = parseAtomEntries(ATOM, "arXiv", "paper", 5);
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe("Deep RL for Market Making");
    expect(items[0].url).toContain("arxiv.org");
    expect(items[0].kind).toBe("paper");
  });
});
