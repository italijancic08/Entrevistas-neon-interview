"use client";

import { INSTITUTION } from "@/data/interviews";
import { useSceneIntro } from "@/hooks/useSceneIntro";
import SplitText from "@/components/ui/SplitText";
import Button from "@/components/ui/Button";

export default function IntroScene({ onStart, portrait }: { onStart: () => void; portrait: boolean }) {
  const ref = useSceneIntro();
  return (
    <div ref={ref} className={`absolute inset-0 flex flex-col px-6 pb-28 pt-24 md:px-14 justify-end`}>
      <div className={portrait ? "" : "max-w-[440px]"}>
        <p data-anim className="eyebrow">
          Archivo de entrevistas
        </p>
        <h1 className="h-display mt-4 text-[length:clamp(1.9rem,6vw,2.4rem)] md:text-[length:clamp(2.2rem,3.8vw,4rem)]">
          <SplitText text="RELEVAMIENTO" />
          <br />
          <span className="soft">
            <SplitText text="DE DATOS" />
          </span>
        </h1>
        <p data-anim className="lead mt-5 max-w-[380px] text-[0.95rem]">
          Nuestra profesión vista desde la sociedad: tres entrevistas, ocho preguntas y una misma pregunta de fondo, ¿qué es ser programador?
        </p>
        <p data-anim className="mt-5 font-display text-[0.66rem] font-bold uppercase tracking-[0.2em] text-ice">
          Eleva la mirada sobre una profesión invisible
        </p>

        <div data-anim className="fine mt-6 grid max-w-[420px] grid-cols-2 gap-x-8">
          <div>
            <p>
              <strong>{INSTITUTION.university}</strong>
            </p>
            <p>{INSTITUTION.faculty}</p>
            <p className="mt-2">{INSTITUTION.subject}</p>
            <p>{INSTITUTION.place}</p>
          </div>
          <div>
            <p className="eyebrow muted mb-1">Integrantes</p>
            {INSTITUTION.members.map((m) => (
              <p key={m}>{m}</p>
            ))}
          </div>
        </div>

        <div data-anim className="mt-8">
          <Button variant="primary" onClick={onStart}>
            Iniciar experiencia
          </Button>
        </div>
      </div>
    </div>
  );
}
