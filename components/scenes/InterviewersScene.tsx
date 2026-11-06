"use client";

import { useSceneIntro } from "@/hooks/useSceneIntro";
import SplitText from "@/components/ui/SplitText";
import Button from "@/components/ui/Button";

interface Props {
  portrait: boolean;
  onSelect: (n: 1 | 2 | 3) => void;
  onCompare: () => void;
  onHover: (i: number | null) => void;
}

export default function InterviewersScene({ portrait, onSelect, onCompare, onHover }: Props) {
  const ref = useSceneIntro();
  return (
    <div ref={ref} className={`absolute inset-0 flex flex-col justify-between px-6 pb-28 md:px-14 ${portrait ? "pt-24" : "pt-28"}`}>
      <div>
        <p data-anim className="eyebrow">
          Escena 02 · Entrevistados
        </p>
        <h2 className="h-display mt-3 text-[length:clamp(1.4rem,3.6vw,3.6rem)]">
          <SplitText text="TRES PERSPECTIVAS." />
          <br />
          <span className="soft">
            <SplitText text="UNA PROFESIÓN." />
          </span>
        </h2>
      </div>

      <div className="flex flex-col items-center gap-5">
        <p data-anim className="eyebrow muted text-center">
          {portrait ? "Tocá un entrevistado para ver sus respuestas" : "Pasá el mouse sobre un personaje · click para modo individual"}
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          {([1, 2, 3] as const).map((n) => (
            <Button
              key={n}
              data-anim
              onClick={() => onSelect(n)}
              onPointerEnter={() => onHover(n - 1)}
              onPointerLeave={() => onHover(null)}
            >
              Entrevistado 0{n}
            </Button>
          ))}
        </div>
        <Button data-anim variant="primary" onClick={onCompare}>
          Comparar entrevistas
        </Button>
      </div>
    </div>
  );
}
