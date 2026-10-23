import type { Metadata } from "next";
import ReplayPlayer from "@/components/replay/ReplayPlayer";

export const metadata: Metadata = {
  title: "Round replay · Tradr",
  robots: { index: false },
};

export default async function ReplayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ReplayPlayer id={decodeURIComponent(id)} />;
}
