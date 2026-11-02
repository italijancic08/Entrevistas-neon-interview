export interface BustTheme {
  a: string;
  b: string;
  body: string;
  kind: "metal" | "holo" | "geo";
  seed: number;
}

export const THEMES: BustTheme[] = [
  { a: "#00E5FF", b: "#FF315F", body: "#0d1822", kind: "metal", seed: 11 },
  { a: "#8B5CF6", b: "#FF3FD0", body: "#120f24", kind: "holo", seed: 23 },
  { a: "#00E5FF", b: "#2F6BFF", body: "#0a1626", kind: "geo", seed: 37 },
];