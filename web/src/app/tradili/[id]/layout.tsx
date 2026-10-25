import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo/metadata";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return pageMetadata({
    title: "Tradili tape",
    description:
      "Watch a Tradili race tape with MT5-style deals, danmaku, chat, and box-score stats — or play alongside the same market.",
    path: `/tradili/${encodeURIComponent(id)}`,
  });
}

export default function TradiliMatchLayout({ children }: { children: React.ReactNode }) {
  return children;
}
