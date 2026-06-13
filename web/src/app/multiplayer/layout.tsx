import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = pageMetadata({
  title: "Multiplayer",
  description:
    "Join or create Tradr multiplayer rooms. Race friends on the same live market for 3 minutes. Browse open rooms with traders waiting—no room code required.",
  path: "/multiplayer",
  keywords: [
    "multiplayer trading game",
    "online trading room",
    "browser multiplayer game",
    "Tradr multiplayer",
  ],
});

export default function MultiplayerLayout({ children }: { children: React.ReactNode }) {
  return children;
}