"use client";

import type { CSSProperties } from "react";
import { INTERVIEWERS, QUESTIONS, type InterviewerId } from "@/data/interviews";
import { THEMES } from "@/lib/theme";
import { useSceneIntro } from "@/hooks/useSceneIntro";
import QuestionDisplay from "@/components/ui/QuestionDisplay";
import AnswerDisplay from "@/components/ui/AnswerDisplay";
import NeonButton from "@/components/ui/NeonButton";

interface Props {
  q: number;
  who: InterviewerId;
  portrait: boolean;
  onWho: (n: InterviewerId) => void;
  onQuestion: (q: number) => void;
}

export default function IndividualScene({ q, who, portrait, onWho, onQuestion }: Props) {
  const ref = useSceneIntro();
  const Q = QUESTIONS[q];
  const theme = THEMES[who - 1];

  return (
    <div
      ref={ref}
      style={{ ["--c" as string]: theme.a } as CSSProperties}
      className={`absolute inset-0 flex px-5 pb-24 md:px-14 ${portrait ? "flex-col pt-24" : "pt-20"}`}
    >
      {/* Espacio donde se ve el busto 3D */}
      <div className={portrait ? "h-[30vh] shrink-0" : "w-[46%] shrink-0"} />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col justify-center gap-4">
        <div>
          <p data-anim className="font-mono text-[11px] tracking-[0.4em]" style={{ color: "var(--c)" }}>
            INTERVIEW_0{who}
          </p>
          <h3 data-anim className="font-display text-[length:clamp(1.1rem,2vw,2rem)] font-black" style={{ color: "var(--c)" }}>
            ENTREVISTADO 0{who}
          </h3>
        </div>

        <QuestionDisplay q={q} compact />

        <div className="holo-frame min-h-0">
          <p data-anim className="mb-2 font-mono text-[10px] tracking-[0.4em] text-ice/50">
            RESPUESTA
          </p>
          <div data-scroll className="pointer-events-auto max-h-[34vh] overflow-y-auto pr-1 md:max-h-[38vh]">
            <AnswerDisplay split text={Q.answers[who]} className="text-[length:clamp(1.05rem,1.75vw,1.7rem)] leading-relaxed" />
          </div>
        </div>

        <div data-anim className="flex flex-wrap items-center gap-4">
          <div className="flex gap-2">
            {INTERVIEWERS.map((n) => (
              <NeonButton key={n} size="sm" active={n === who} variant={n === 2 ? "magenta" : "cyan"} onClick={() => onWho(n)}>
                0{n}
              </NeonButton>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            {QUESTIONS.map((_, i) => (
              <button
                key={i}
                aria-label={`Ir a la pregunta ${i + 1}`}
                onClick={() => onQuestion(i)}
                className={`pointer-events-auto h-2 cursor-pointer rounded-full transition-all duration-500 ${i === q ? "w-7 bg-neon-magenta" : "w-2 bg-ice/30 hover:bg-neon-cyan"}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}