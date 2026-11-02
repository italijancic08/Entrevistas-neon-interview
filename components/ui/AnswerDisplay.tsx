import SplitText from "./SplitText";

interface Props {
  text: string;
  split?: boolean;
  className?: string;
}

export default function AnswerDisplay({ text, split = false, className = "" }: Props) {
  return <p className={className}>{split ? <SplitText text={text} /> : text}</p>;
}