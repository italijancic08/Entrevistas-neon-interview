"use client";

import type { CSSProperties } from "react";
import { INTERVIEWERS, QUESTIONS, type InterviewerId } from "@/data/interviews";
import { THEMES } from "@/lib/theme";
import { useSceneIntro } from "@/hooks/useSceneIntro";
import QuestionDisplay from "@/components/ui/QuestionDisplay";
import AnswerDisplay from "@/components/ui/AnswerDisplay";
import Button from "@/components/ui/Button";

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
      className={`absolute inset-0 flex px-6 pb-28 md:px-14 ${portrait ? "flex-col pt-24" : "pt-28"}`}
    >
      {/* Espacio donde se ve el busto 3D */}
      <div className={portrait ? "h-[30vh] shrink-0" : "w-[46%] shrink-0"} />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col justify-center gap-5">
        <QuestionDisplay q={q} compact />

        <div className="card min-h-0">
          <p data-anim className="card-tag">
            Entrevistado 0{who}
          </p>
          <div data-scroll className="pointer-events-auto max-h-[34vh] overflow-y-auto pr-1 md:max-h-[38vh]">
            <AnswerDisplay split text={Q.answers[who]} className="text-[length:clamp(1.05rem,1.6vw,1.55rem)] leading-relaxed" />
          </div>
        </div>

        <div data-anim className="flex flex-wrap items-center gap-5">
          <div className="flex gap-2">
            {INTERVIEWERS.map((n) => (
              <Button key={n} size="sm" active={n === who} onClick={() => onWho(n)}>
                0{n}
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            {QUESTIONS.map((_, i) => (
              <button
                key={i}
                aria-label={`Ir a la pregunta ${i + 1}`}
                onClick={() => onQuestion(i)}
                className={`pointer-events-auto h-[5px] cursor-pointer rounded-full transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${i === q ? "w-6 bg-accent" : "w-[5px] bg-ice/30 hover:bg-ice"}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
