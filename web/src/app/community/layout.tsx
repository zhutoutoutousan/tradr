import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = pageMetadata({
  title: "Community Gallery",
  description:
    "Browse anonymous Tradr trading runs. Watch replays or Play alongside—trade the same market while a recorded session replays as a Peer trader bot.",
  path: "/community",
  keywords: [
    "trading replay",
    "trading game gallery",
    "paper trading community",
    "Tradr replays",
  ],
});

export default function CommunityLayout({ children }: { children: React.ReactNode }) {
  return children;
}