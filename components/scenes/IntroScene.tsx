"use client";

import { INSTITUTION } from "@/data/interviews";
import { useSceneIntro } from "@/hooks/useSceneIntro";
import SplitText from "@/components/ui/SplitText";
import NeonButton from "@/components/ui/NeonButton";

export default function IntroScene({ onStart, portrait }: { onStart: () => void; portrait: boolean }) {
  const ref = useSceneIntro();
  return (
    <div ref={ref} className={`absolute inset-0 flex flex-col px-6 pb-24 pt-20 md:px-16 ${portrait ? "justify-end" : "justify-center"}`}>
      <div className={portrait ? "" : "max-w-[62%]"}>
        <p data-anim className="font-mono text-[11px] tracking-[0.4em] text-neon-cyan md:text-xs">
          // ARCHIVO_DE_ENTREVISTAS · SISTEMA_ACTIVO
        </p>
        <h1 className="title-3d mt-4 font-display font-black leading-[0.95] text-[length:clamp(1.5rem,7vw,2.6rem)] md:text-[length:clamp(2.6rem,5.2vw,6rem)]">
          <SplitText text="RELEVAMIENTO" />
          <br />
          <span className="glitch text-neon-cyan">
            <SplitText text="DE DATOS" />
          </span>
        </h1>
        <p data-anim className="mt-5 font-display text-[length:clamp(.85rem,1.6vw,1.5rem)] tracking-[0.12em] text-ice/90">
          Nuestra Profesión vista desde la Sociedad
        </p>

        <div data-anim className="mt-6 grid grid-cols-2 gap-x-6 text-[length:clamp(.9rem,1.05vw,1.05rem)] leading-snug text-ice/80 md:gap-x-10">
          <div>
            <p className="font-semibold text-ice">{INSTITUTION.university}</p>
            <p>{INSTITUTION.faculty}</p>
            <p className="mt-2">{INSTITUTION.subject}</p>
            <p>{INSTITUTION.place}</p>
          </div>
          <div>
            <p className="font-mono text-[11px] tracking-[0.3em] text-neon-magenta">INTEGRANTES</p>
            {INSTITUTION.members.map((m) => (
              <p key={m}>{m}</p>
            ))}
          </div>
        </div>

        <div data-anim className="mt-7">
          <NeonButton onClick={onStart}>[ INICIAR EXPERIENCIA ]</NeonButton>
        </div>
      </div>
    </div>
  );
}