import { QUESTIONS } from "@/data/interviews";
import SplitText from "./SplitText";

interface Props {
  q: number;
  compact?: boolean;
  center?: boolean;
}

export default function QuestionDisplay({ q, compact = false, center = false }: Props) {
  const Q = QUESTIONS[q];
  return (
    <header className={center ? "text-center" : ""}>
      <p data-anim className="eyebrow">
        Pregunta 0{Q.id} <span className="text-ice/35">/ 0{QUESTIONS.length}</span>
      </p>
      <h2 className={`h-display mt-3 ${compact ? "text-[length:clamp(1.05rem,1.8vw,1.8rem)]" : "text-[length:clamp(1.1rem,2.4vw,2.3rem)]"}`}>
        <SplitText text={Q.text} />
      </h2>
    </header>
  );
}
