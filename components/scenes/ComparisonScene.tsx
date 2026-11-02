"use client";

import type { CSSProperties } from "react";
import { INTERVIEWERS, QUESTIONS } from "@/data/interviews";
import { THEMES } from "@/lib/theme";
import { useSceneIntro } from "@/hooks/useSceneIntro";
import QuestionDisplay from "@/components/ui/QuestionDisplay";
import AnswerDisplay from "@/components/ui/AnswerDisplay";

export default function ComparisonScene({ q, portrait }: { q: number; portrait: boolean }) {
  const ref = useSceneIntro();
  const Q = QUESTIONS[q];
  return (
    <div ref={ref} className={`absolute inset-0 flex flex-col px-6 pb-28 md:px-14 ${portrait ? "pt-24" : "pt-28"}`}>
      <QuestionDisplay q={q} center={!portrait} />

      {/* Espacio donde se ven los bustos 3D */}
      <div className={`grid shrink-0 grid-cols-3 items-end text-center ${portrait ? "h-[17vh]" : "h-[28vh]"}`}>
        {!portrait &&
          INTERVIEWERS.map((n) => (
            <span key={n} data-anim className="eyebrow muted">
              Entrevistado 0{n}
            </span>
          ))}
      </div>

      <div data-scroll className={`pointer-events-auto min-h-0 flex-1 overflow-y-auto ${portrait ? "flex flex-col gap-3" : "grid grid-cols-3 content-start gap-5"}`}>
        {INTERVIEWERS.map((n) => (
          <article key={n} data-anim className="card" style={{ ["--c" as string]: THEMES[n - 1].a } as CSSProperties}>
            <span className="card-tag">Entrevistado 0{n}</span>
            <AnswerDisplay text={Q.answers[n]} />
          </article>
        ))}
      </div>
    </div>
  );
}
