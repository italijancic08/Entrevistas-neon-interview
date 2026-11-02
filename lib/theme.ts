/** Color de fondo único de la escena (lienzo 3D y página): plano, azul-petróleo muy oscuro. */
export const BG = "#0b171e";

export interface BustTheme {
  /** Tono frío: luz de relleno, contraluz izquierdo y color de identificación del entrevistado. */
  a: string;
  /** Luz de contorno cálida que se refleja desde atrás. */
  b: string;
  /** Tinte que multiplica la textura de piel (cambia el tono de piel de cada cabeza). */
  skin: string;
  /** Proporciones de la cabeza (ancho, alto, profundidad) para que las tres no sean clones. */
  shape: [number, number, number];
}

export const THEMES: BustTheme[] = [
  { a: "#6FD3E8", b: "#FF4A3D", skin: "#ffffff", shape: [1, 1, 1] },
  { a: "#9A8CFF", b: "#FF3F7A", skin: "#b88c73", shape: [0.93, 1.05, 0.97] },
  { a: "#6FB1FF", b: "#FF8040", skin: "#e9efff", shape: [1.07, 0.97, 1.03] },
];
