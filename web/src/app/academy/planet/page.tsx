"use client";

import AcademyShell from "@/components/academy/AcademyShell";
import LearningPlanet from "@/components/academy/LearningPlanet";

export default function AcademyPlanetPage() {
  return (
    <AcademyShell
      title="Learning Planet"
      subtitle="Quant 学习星球 — knowledge graph, interview arena, desk library."
    >
      <LearningPlanet />
    </AcademyShell>
  );
}
