import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = pageMetadata({
  title: "Tradili — race tapes & danmaku",
  description:
    "Tradili (Tradr × Bilibili × YouTube): browse historical race tapes with danmaku, chat, MT5-style deal lines for players and bots, and sports box scores.",
  path: "/tradili",
  keywords: [
    "Tradili",
    "trading replay",
    "trading game gallery",
    "danmaku trading",
    "MT5 deal lines",
    "Tradr replays",
  ],
});

export default function TradiliLayout({ children }: { children: React.ReactNode }) {
  return children;
}
