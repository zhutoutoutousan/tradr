import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo/metadata";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return pageMetadata({
    title: "Replay",
    description:
      "Watch a Tradr community trading replay or play alongside the same market while the original run replays as a bot.",
    path: `/community/${encodeURIComponent(id)}`,
  });
}

export default function CommunityMatchLayout({ children }: { children: React.ReactNode }) {
  return children;
}