import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = pageMetadata({
  title: "Tradili — race tapes, markets & papers",
  description:
    "Tradili (Tradr × Bilibili × YouTube): race tapes with danmaku, finance news from free RSS, arXiv quant papers, and MT5-style deal lines.",
  path: "/tradili",
  keywords: [
    "Tradili",
    "trading replay",
    "finance news RSS",
    "arXiv quantitative finance",
    "danmaku trading",
    "MT5 deal lines",
    "Tradr replays",
  ],
});

export default function TradiliLayout({ children }: { children: React.ReactNode }) {
  return children;
}
