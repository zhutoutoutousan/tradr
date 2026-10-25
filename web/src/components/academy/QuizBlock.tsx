"use client";

import { useState } from "react";
import type { QuizQuestion } from "@/lib/academy";

export default function QuizBlock({
  questions,
  onAllCorrect,
}: {
  questions: QuizQuestion[];
  onAllCorrect: () => void;
}) {
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  const allDone =
    questions.length > 0 &&
    questions.every((q) => {
      const choice = q.choices.find((c) => c.id === picked[q.id]);
      return revealed[q.id] && choice?.correct;
    });

  return (
    <div className="space-y-4" data-testid="academy-quiz">
      {questions.map((q) => {
        const sel = picked[q.id];
        const show = revealed[q.id];
        const correct = q.choices.find((c) => c.id === sel)?.correct;
        return (
          <div key={q.id} className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <p className="font-semibold text-white">{q.prompt}</p>
            <ul className="mt-3 space-y-2">
              {q.choices.map((c) => {
                const active = sel === c.id;
                let cls = "border-slate-700 hover:border-slate-500";
                if (show && c.correct) cls = "border-emerald-500/60 bg-emerald-500/10";
                else if (show && active && !c.correct) cls = "border-rose-500/50 bg-rose-500/10";
                else if (active) cls = "border-amber-500/50 bg-amber-500/10";
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      disabled={show && correct}
                      onClick={() => {
                        setPicked((p) => ({ ...p, [q.id]: c.id }));
                        setRevealed((r) => ({ ...r, [q.id]: true }));
                      }}
                      className={`w-full rounded-lg border px-3 py-2 text-left text-sm text-slate-200 ${cls}`}
                    >
                      {c.text}
                    </button>
                  </li>
                );
              })}
            </ul>
            {show ? <p className="mt-2 text-xs text-slate-400">{q.explain}</p> : null}
          </div>
        );
      })}
      {allDone ? (
        <button
          type="button"
          data-testid="academy-quiz-pass"
          onClick={onAllCorrect}
          className="rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-emerald-400"
        >
          Mark lesson complete
        </button>
      ) : (
        <p className="text-xs text-slate-500">Answer every question correctly to finish this lesson.</p>
      )}
    </div>
  );
}
