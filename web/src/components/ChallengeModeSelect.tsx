"use client";

import { useState, useEffect } from "react";
import { STORY_LEVELS, CHALLENGE_LEVELS, getAvailableLevels, type ChallengeLevel } from "@/lib/game/challenges";
import { loadProgress, type PlayerProgress } from "@/lib/game/progress";

interface ChallengeModeSelectProps {
  onSelectLevel: (level: ChallengeLevel) => void;
  onBack: () => void;
}

export default function ChallengeModeSelect({ onSelectLevel, onBack }: ChallengeModeSelectProps) {
  const [activeTab, setActiveTab] = useState<"story" | "challenge">("story");
  const [progress, setProgress] = useState<PlayerProgress | null>(null);

  useEffect(() => {
    setProgress(loadProgress());
  }, []);

  if (!progress) return null;

  const availableLevels = getAvailableLevels(progress.challenges.completedLevels);
  const storyLevels = STORY_LEVELS;
  const challengeLevels = CHALLENGE_LEVELS;

  const renderStars = (levelId: string) => {
    const stars = progress.challenges.completedLevels[levelId] || 0;
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3].map((i) => (
          <span
            key={i}
            className={`text-sm ${i <= stars ? "text-yellow-400" : "text-slate-700"}`}
          >
            ★
          </span>
        ))}
      </div>
    );
  };

  const isLevelAvailable = (level: ChallengeLevel) => {
    return availableLevels.some(l => l.id === level.id);
  };

  const renderLevel = (level: ChallengeLevel) => {
    const available = isLevelAvailable(level);
    const completed = (progress.challenges.completedLevels[level.id] || 0) > 0;

    return (
      <button
        key={level.id}
        onClick={() => available && onSelectLevel(level)}
        disabled={!available}
        className={`flex flex-col gap-2 rounded-lg border p-4 text-left transition-all ${
          available
            ? completed
              ? "border-emerald-500/30 bg-emerald-950/20 hover:border-emerald-500/50 hover:bg-emerald-950/30"
              : "border-slate-700 bg-slate-800/50 hover:border-slate-600 hover:bg-slate-800"
            : "border-slate-800 bg-slate-900/30 opacity-50 cursor-not-allowed"
        }`}
      >
        {/* Level Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{level.title.split(" ")[0]}</span>
            <div>
              <h3 className="font-semibold text-white">{level.title.split(" ").slice(1).join(" ")}</h3>
              <p className="text-xs text-slate-500">Level {level.level}</p>
            </div>
          </div>
          {available && renderStars(level.id)}
        </div>

        {/* Description */}
        <p className="text-sm text-slate-400">{level.description}</p>

        {/* Objectives */}
        <div className="space-y-1">
          {level.objectives.map((obj, idx) => (
            <div key={idx} className="flex items-center gap-2 text-xs text-slate-500">
              <span className="text-emerald-500">✓</span>
              <span>{obj.description}</span>
            </div>
          ))}
        </div>

        {/* Rewards */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-700/50">
          <span className="text-xs text-slate-500">Rewards:</span>
          <span className="text-xs font-mono text-amber-400">+{level.rewards.xp} XP</span>
          {level.rewards.unlocks && level.rewards.unlocks.length > 0 && (
            <span className="text-xs text-violet-400">+{level.rewards.unlocks.length} Unlock(s)</span>
          )}
        </div>

        {/* Locked Indicator */}
        {!available && (
          <div className="flex items-center gap-2 pt-2 border-t border-slate-700/50">
            <svg className="h-4 w-4 text-slate-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            <span className="text-xs text-slate-600">Locked</span>
          </div>
        )}
      </button>
    );
  };

  return (
    <div className="flex min-h-[100dvh] flex-col bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-slate-800 p-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-400 transition-colors hover:text-slate-200"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <h1 className="text-xl font-bold">Challenge Mode</h1>
        <div className="w-20" /> {/* Spacer */}
      </header>

      {/* Player Progress Bar */}
      <div className="border-b border-slate-800 bg-slate-900/50 p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">Level {progress.challenges.level}</span>
            <span className="text-xs text-slate-500">
              {progress.challenges.xp} XP
            </span>
          </div>
          <span className="text-xs text-slate-500">
            {Object.keys(progress.challenges.completedLevels).length} / {STORY_LEVELS.length + CHALLENGE_LEVELS.length} Completed
          </span>
        </div>
        <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-500"
            style={{
              width: `${(Object.keys(progress.challenges.completedLevels).length / (STORY_LEVELS.length + CHALLENGE_LEVELS.length)) * 100}%`
            }}
          />
        </div>
      </div>

      {/* Tab Selector */}
      <div className="flex gap-2 border-b border-slate-800 bg-slate-900/50 p-2">
        <button
          onClick={() => setActiveTab("story")}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "story"
              ? "bg-emerald-600 text-white"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          📚 Story Mode
        </button>
        <button
          onClick={() => setActiveTab("challenge")}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "challenge"
              ? "bg-amber-600 text-white"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          ⚔️ Challenge Mode
        </button>
      </div>

      {/* Level Grid */}
      <main className="flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-4xl">
          {activeTab === "story" && (
            <div>
              <div className="mb-4">
                <h2 className="text-lg font-bold text-emerald-400">Story Mode</h2>
                <p className="text-sm text-slate-500">
                  Learn trading step by step. Unlock new powerups!
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {storyLevels.map(renderLevel)}
              </div>
            </div>
          )}

          {activeTab === "challenge" && (
            <div>
              <div className="mb-4">
                <h2 className="text-lg font-bold text-amber-400">Challenge Mode</h2>
                <p className="text-sm text-slate-500">
                  Difficult challenges for experienced traders!
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {challengeLevels.map(renderLevel)}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
