import CommunityReplayPlay from "@/components/CommunityReplayPlay";

export default async function CommunityReplayPlayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CommunityReplayPlay gameId={id} />;
}