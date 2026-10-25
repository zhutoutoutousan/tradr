import CommunityReplayPlay from "@/components/CommunityReplayPlay";

export default async function TradiliReplayPlayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CommunityReplayPlay gameId={id} />;
}