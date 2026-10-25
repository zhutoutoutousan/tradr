"use client";

import { useRouter } from "next/navigation";
import ChallengeModeSelect from "@/components/ChallengeModeSelect";
import { stashChallenge } from "@/lib/academy";
import type { ChallengeLevel } from "@/lib/game/challenges";
import AcademyShell from "./AcademyShell";

export default function StoryCampaign() {
  const router = useRouter();

  const onSelectLevel = (level: ChallengeLevel) => {
    stashChallenge(level, "/academy/story");
    router.push(`/?level=${encodeURIComponent(level.id)}`);
  };

  return (
    <AcademyShell
      title="Story & Challenge Campaign"
      subtitle="Stars unlock powerups and harder Challenges. Started from Academy so your path stays with the curriculum."
    >
      <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-2 sm:p-4">
        <ChallengeModeSelect onSelectLevel={onSelectLevel} onBack={() => router.push("/academy")} />
      </div>
    </AcademyShell>
  );
}
