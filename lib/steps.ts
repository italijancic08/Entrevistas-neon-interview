import { CONCLUSION, QUESTIONS, type InterviewerId } from "@/data/interviews";

export type Mode = "compare" | "single";

export type Step =
  | { kind: "intro" }
  | { kind: "presentation" }
  | { kind: "question"; q: number }
  | { kind: "conclusion"; f: number }
  | { kind: "final" };

export interface View {
  step: number;
  mode: Mode;
  selected: InterviewerId;
}

export const STEPS: Step[] = [
  { kind: "intro" },
  { kind: "presentation" },
  ...QUESTIONS.map((_, q) => ({ kind: "question" as const, q })),
  ...CONCLUSION.map((_, f) => ({ kind: "conclusion" as const, f })),
  { kind: "final" },
];

export const FIRST_QUESTION = 2;
export const LAST = STEPS.length - 1;