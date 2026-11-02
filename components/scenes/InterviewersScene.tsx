"use client";

import { useSceneIntro } from "@/hooks/useSceneIntro";
import SplitText from "@/components/ui/SplitText";
import NeonButton from "@/components/ui/NeonButton";

interface Props {
  portrait: boolean;
  onSelect: (n: 1 | 2 | 3) => void;
  onCompare: () => void;
  onHover: (i: number | null) => void;
}

export default function InterviewersScene({ portrait, onSelect, onCompare, onHover }: Props) {
  const ref = useSceneIntro();
  return (
    <div ref={ref} className={`absolute inset-0 flex flex-col justify-between px-5 pb-24 md:px-14 ${portrait ? "pt-24" : "pt-20"}`}>
      <div>
        <p data-anim className="font-mono text-[11px] tracking-[0.4em] text-neon-magenta">
          // ESCENA_02 · ENTREVISTADOS
        </p>
        <h2 className="mt-3 font-display font-black leading-[1.05] text-[length:clamp(1.4rem,4.4vw,4.2rem)]">
          <SplitText text="TRES PERSPECTIVAS." />
          <br />
          <span className="text-neon-cyan">
            <SplitText text="UNA PROFESIÓN." />
          </span>
        </h2>
      </div>

      <div className="flex flex-col items-center gap-4">
        <p data-anim className="text-center font-mono text-[11px] tracking-[0.2em] text-ice/60">
          {portrait ? "TOCÁ UN ENTREVISTADO PARA VER SUS RESPUESTAS" : "PASÁ EL MOUSE SOBRE UN BUSTO · CLICK PARA MODO INDIVIDUAL"}
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          {([1, 2, 3] as const).map((n) => (
            <NeonButton
              key={n}
              data-anim
              variant={n === 2 ? "magenta" : "cyan"}
              onClick={() => onSelect(n)}
              onPointerEnter={() => onHover(n - 1)}
              onPointerLeave={() => onHover(null)}
            >
              ENTREVISTADO 0{n}
            </NeonButton>
          ))}
        </div>
        <NeonButton data-anim onClick={onCompare}>
          [ COMPARAR ENTREVISTAS ]
        </NeonButton>
      </div>
    </div>
  );
}