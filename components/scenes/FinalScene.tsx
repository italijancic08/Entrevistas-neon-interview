"use client";

import { INSTITUTION } from "@/data/interviews";
import { useSceneIntro } from "@/hooks/useSceneIntro";
import SplitText from "@/components/ui/SplitText";
import NeonButton from "@/components/ui/NeonButton";

interface Props {
  portrait: boolean;
  onHome: () => void;
  onRepeat: () => void;
}

export default function FinalScene({ portrait, onHome, onRepeat }: Props) {
  const ref = useSceneIntro();
  return (
    <div ref={ref} className="absolute inset-0 flex flex-col justify-end px-6 pb-24 pt-20 md:px-14">
      <div className={`grid gap-6 ${portrait ? "" : "grid-cols-[1.3fr_1fr] items-end"}`}>
        <div>
          <h2 className="font-display font-black leading-[1.05] text-[length:clamp(1.3rem,3.1vw,3.2rem)]">
            <SplitText text="LA TECNOLOGÍA EVOLUCIONA." />
            <br />
            <span className="text-neon-magenta">
              <SplitText text="EL APRENDIZAJE CONTINÚA." />
            </span>
          </h2>
          <div data-anim className="mt-6 flex flex-wrap gap-3">
            <NeonButton onClick={onHome}>[ VOLVER AL INICIO ]</NeonButton>
            <NeonButton variant="magenta" onClick={onRepeat}>
              [ REPETIR EXPERIENCIA ]
            </NeonButton>
          </div>
        </div>

        <div data-anim className="grid grid-cols-2 gap-x-6 text-[length:clamp(.9rem,1.05vw,1.05rem)] leading-snug text-ice/80">
          <div>
            <p className="font-semibold text-ice">{INSTITUTION.university}</p>
            <p>{INSTITUTION.faculty}</p>
            <p className="mt-2">{INSTITUTION.subject}</p>
            <p>{INSTITUTION.place}</p>
          </div>
          <div>
            <p className="font-mono text-[11px] tracking-[0.3em] text-neon-cyan">INTEGRANTES</p>
            {INSTITUTION.members.map((m) => (
              <p key={m}>{m}</p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}