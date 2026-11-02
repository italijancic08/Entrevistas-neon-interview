/**
 * Cabeza humana procedural.
 *
 * Se construye como una pila de secciones elípticas (de la barbilla a la coronilla) cuyo ancho y
 * profundidad siguen perfiles de cráneo reales; encima se esculpen las facciones con campos
 * gaussianos (cejas, cuencas, nariz, pómulos, labios, mentón). Sin dependencias: devuelve arrays
 * planos, así que se puede probar en Node y envolver en THREE.BufferGeometry desde el componente.
 *
 * Sistema de coordenadas: x = derecha, y = arriba (barbilla -1 … coronilla +1), z = hacia el frente.
 */

export interface HeadParams {
  width: number;
  jaw: number;
  brow: number;
  nose: number;
  lips: number;
  cheek: number;
  chin: number;
}

/** Tres rostros con proporciones distintas, para que no parezcan clones. */
export const HEAD_VARIANTS: HeadParams[] = [
  { width: 1, jaw: 1, brow: 1, nose: 1, lips: 1, cheek: 1, chin: 1 },
  { width: 0.94, jaw: 0.84, brow: 0.7, nose: 0.86, lips: 1.25, cheek: 1.2, chin: 0.85 },
  { width: 1.06, jaw: 1.14, brow: 1.3, nose: 1.1, lips: 0.85, cheek: 0.9, chin: 1.2 },
];

export interface HeadData {
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
  indices: Uint32Array;
}

const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
const smooth = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const gauss = (x: number, y: number, cx: number, cy: number, sx: number, sy: number) =>
  Math.exp(-0.5 * (((x - cx) / sx) ** 2 + ((y - cy) / sy) ** 2));

/** Spline cúbica de Hermite con tangentes por diferencias finitas (Catmull-Rom no uniforme). */
function spline(keys: [number, number][]): (x: number) => number {
  const n = keys.length;
  const m = keys.map((_, i) => {
    const a = keys[Math.max(0, i - 1)];
    const b = keys[Math.min(n - 1, i + 1)];
    return (b[1] - a[1]) / (b[0] - a[0]);
  });
  return (x) => {
    if (x <= keys[0][0]) return keys[0][1];
    if (x >= keys[n - 1][0]) return keys[n - 1][1];
    let i = 0;
    while (keys[i + 1][0] < x) i++;
    const [x0, y0] = keys[i];
    const [x1, y1] = keys[i + 1];
    const h = x1 - x0;
    const t = (x - x0) / h;
    const t2 = t * t;
    const t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * y0 + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * y1 + (t3 - t2) * h * m[i + 1];
  };
}

// Perfiles del cráneo (de y = -1 barbilla a y = 0.7). Por encima manda una tapa suave que cierra la coronilla.
const HALF_WIDTH = spline([
  [-1.0, 0.0], [-0.985, 0.1], [-0.95, 0.19], [-0.9, 0.25], [-0.8, 0.34], [-0.65, 0.46],
  [-0.45, 0.57], [-0.25, 0.635], [-0.05, 0.665], [0.15, 0.685], [0.35, 0.695], [0.55, 0.69], [0.7, 0.68],
]);
const FRONT = spline([
  [-1.0, 0.3], [-0.95, 0.5], [-0.88, 0.6], [-0.75, 0.575], [-0.6, 0.58], [-0.4, 0.6],
  [-0.2, 0.615], [0.0, 0.62], [0.15, 0.645], [0.3, 0.69], [0.4, 0.705], [0.55, 0.7], [0.7, 0.685],
]);
const BACK = spline([
  [-1.0, 0.1], [-0.9, 0.2], [-0.7, 0.38], [-0.5, 0.6], [-0.3, 0.78], [-0.1, 0.88],
  [0.1, 0.93], [0.3, 0.955], [0.55, 0.94], [0.7, 0.915],
]);
const PROFILE_TOP = 0.7;
const CAP_Y = 0.38;
/** Tapa de la coronilla: arranca con curvatura cero (exponente > 2) para que no se note el empalme. */
const cap = (y: number) => (y > CAP_Y ? Math.sqrt(Math.max(0, 1 - ((y - CAP_Y) / (1 - CAP_Y)) ** 2.5)) : 1);

// Nariz: protrusión y ancho según la altura (las claves van de abajo hacia arriba, en orden creciente).
const NOSE_AMP = spline([
  [-0.5, 0], [-0.45, 0.05], [-0.41, 0.18], [-0.36, 0.26], [-0.3, 0.245], [-0.2, 0.2], [-0.05, 0.115], [0.08, 0.04], [0.16, 0],
]);
const NOSE_WID = spline([[-0.5, 0.095], [-0.36, 0.09], [-0.22, 0.072], [-0.05, 0.057], [0.12, 0.042]]);

/** Relieve facial: desplazamiento en z (positivo = hacia afuera) en el punto (x, y) de la cara. */
function faceRelief(x: number, y: number, P: HeadParams): number {
  const ax = Math.abs(x);
  let d = 0;

  // Frente, arco superciliar y cuencas oculares
  d += P.brow * 0.05 * gauss(ax, y, 0.28, 0.24, 0.22, 0.07);
  d += P.brow * 0.035 * gauss(x, y, 0, 0.2, 0.12, 0.06);
  d -= 0.085 * gauss(ax, y, 0.27, 0.07, 0.14, 0.09);
  d += 0.05 * gauss(ax, y, 0.27, 0.065, 0.085, 0.05); // globo ocular
  d -= 0.02 * gauss(ax, y, 0.27, 0.14, 0.12, 0.017); // pliegue del párpado
  d += 0.012 * gauss(ax, y, 0.27, -0.005, 0.1, 0.02); // bolsa inferior

  // Nariz
  d += P.nose * NOSE_AMP(y) * Math.exp(-0.5 * (x / NOSE_WID(y)) ** 2);
  d += P.nose * 0.05 * gauss(ax, y, 0.12, -0.36, 0.055, 0.05); // alas
  d -= 0.03 * gauss(ax, y, 0.07, -0.43, 0.032, 0.018); // fosas
  d -= 0.028 * gauss(ax, y, 0.21, -0.5, 0.04, 0.14); // surco nasogeniano

  // Pómulos, mejillas, sien
  d += P.cheek * 0.05 * gauss(ax, y, 0.42, -0.1, 0.16, 0.11);
  d -= 0.03 * gauss(ax, y, 0.4, -0.45, 0.14, 0.12);
  d -= 0.03 * gauss(ax, y, 0.58, 0.3, 0.1, 0.12);

  // Labios y mentón
  d += P.lips * 0.055 * gauss(x, y, 0, -0.585, 0.17, 0.038);
  d += P.lips * 0.062 * gauss(x, y, 0, -0.695, 0.15, 0.045);
  d -= 0.05 * gauss(x, y, 0, -0.636, 0.2, 0.011);
  d -= 0.015 * gauss(x, y, 0, -0.51, 0.03, 0.045); // surco subnasal
  d += P.chin * 0.065 * gauss(x, y, 0, -0.87, 0.17, 0.09);
  d -= 0.03 * gauss(x, y, 0, -0.78, 0.14, 0.022);

  // Mandíbula
  d += 0.02 * gauss(ax, y, 0.5, -0.6, 0.08, 0.12);
  return d;
}

/** Punto donde se ancla la oreja (centro de la elipse, sobre la superficie lateral del cráneo). */
export function earAnchor(P: HeadParams): [number, number, number] {
  const y = -0.12;
  return [HALF_WIDTH(y) * P.width + 0.005, y, (FRONT(y) - BACK(y)) / 2 - 0.02];
}

export function buildHead(P: HeadParams, rings: number, segs: number): HeadData {
  const cols = segs + 1;
  const vc = (rings + 1) * cols;
  const positions = new Float32Array(vc * 3);
  const uvs = new Float32Array(vc * 2);

  for (let i = 0; i <= rings; i++) {
    // Espaciado coseno: más anillos cerca de la barbilla y la coronilla, donde la curvatura es mayor.
    const y = -Math.cos((Math.PI * i) / rings);
    const c = cap(y);
    const jawMask = smooth(-0.2, -0.7, y);
    const W = HALF_WIDTH(Math.min(y, PROFILE_TOP)) * c * P.width * (1 + (P.jaw - 1) * jawMask);
    const Zf = FRONT(Math.min(y, PROFILE_TOP)) * c;
    const Zb = BACK(Math.min(y, PROFILE_TOP)) * c;
    const zc = (Zf - Zb) / 2;
    const zr = (Zf + Zb) / 2;

    for (let j = 0; j <= segs; j++) {
      const phi = (2 * Math.PI * j) / segs; // phi = 0 → nuca (la costura queda atrás); phi = π → frente
      const sx = Math.sin(phi);
      const cz = -Math.cos(phi);
      const x = W * sx;
      let z = zc + zr * cz;

      const front = smooth(0, 0.35, cz) * (1 - smooth(0.75, 0.97, Math.abs(sx)));
      if (front > 0 && y < 0.6) z += faceRelief(x, y, P) * front;

      const k = (i * cols + j) * 3;
      positions[k] = x;
      positions[k + 1] = y;
      positions[k + 2] = z;
      uvs[(i * cols + j) * 2] = j / segs;
      uvs[(i * cols + j) * 2 + 1] = (y + 1) / 2;
    }
  }

  const indices = new Uint32Array(rings * segs * 6);
  let t = 0;
  for (let i = 0; i < rings; i++) {
    for (let j = 0; j < segs; j++) {
      const a = i * cols + j;
      const b = a + 1;
      const c2 = a + cols;
      const d = c2 + 1;
      indices[t++] = a;
      indices[t++] = c2;
      indices[t++] = b;
      indices[t++] = b;
      indices[t++] = c2;
      indices[t++] = d;
    }
  }

  const normals = finishNormals(positions, indices, rings, segs);

  return { positions, normals, uvs, indices };
}

function computeNormals(pos: Float32Array, idx: Uint32Array, vc: number): Float32Array {
  const n = new Float32Array(vc * 3);
  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t] * 3, b = idx[t + 1] * 3, c = idx[t + 2] * 3;
    const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2];
    const vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; // ponderado por área
    for (const o of [a, b, c]) {
      n[o] += nx; n[o + 1] += ny; n[o + 2] += nz;
    }
  }
  for (let i = 0; i < vc; i++) {
    const l = Math.hypot(n[i * 3], n[i * 3 + 1], n[i * 3 + 2]) || 1;
    n[i * 3] /= l; n[i * 3 + 1] /= l; n[i * 3 + 2] /= l;
  }
  return n;
}

export function rng(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

export interface SurfaceSample {
  p: [number, number, number];
  n: [number, number, number];
}

/**
 * Reparte puntos sobre una malla (proporcional al área de cada triángulo). `accept` permite
 * dejar zonas libres, por ejemplo el rostro.
 */
export function sampleSurface(
  pos: ArrayLike<number>,
  nor: ArrayLike<number>,
  idx: ArrayLike<number>,
  count: number,
  seed: number,
  accept: (p: [number, number, number], n: [number, number, number]) => boolean
): SurfaceSample[] {
  const tris = idx.length / 3;
  const cum = new Float64Array(tris);
  let total = 0;
  for (let t = 0; t < tris; t++) {
    const a = idx[t * 3] * 3, b = idx[t * 3 + 1] * 3, c = idx[t * 3 + 2] * 3;
    const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2];
    const vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
    total += 0.5 * Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx);
    cum[t] = total;
  }

  const rnd = rng(seed);
  const out: SurfaceSample[] = [];
  let guard = 0;
  while (out.length < count && guard++ < count * 40) {
    const r = rnd() * total;
    let lo = 0, hi = tris - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cum[mid] < r) lo = mid + 1;
      else hi = mid;
    }
    const a = idx[lo * 3] * 3, b = idx[lo * 3 + 1] * 3, c = idx[lo * 3 + 2] * 3;
    let u = rnd(), v = rnd();
    if (u + v > 1) { u = 1 - u; v = 1 - v; }
    const w = 1 - u - v;
    const p: [number, number, number] = [
      pos[a] * w + pos[b] * u + pos[c] * v,
      pos[a + 1] * w + pos[b + 1] * u + pos[c + 1] * v,
      pos[a + 2] * w + pos[b + 2] * u + pos[c + 2] * v,
    ];
    let n: [number, number, number] = [
      nor[a] * w + nor[b] * u + nor[c] * v,
      nor[a + 1] * w + nor[b + 1] * u + nor[c + 1] * v,
      nor[a + 2] * w + nor[b + 2] * u + nor[c + 2] * v,
    ];
    const l = Math.hypot(n[0], n[1], n[2]) || 1;
    n = [n[0] / l, n[1] / l, n[2] / l];
    if (accept(p, n)) out.push({ p, n });
  }
  return out;
}

/** Normales suaves para una malla en cuadrícula: unifica la costura y los polos. */
function finishNormals(positions: Float32Array, indices: Uint32Array, rings: number, segs: number): Float32Array {
  const cols = segs + 1;
  const normals = computeNormals(positions, indices, (rings + 1) * cols);
  for (let i = 0; i <= rings; i++) {
    const a = i * cols * 3;
    const b = (i * cols + segs) * 3;
    const nx = normals[a] + normals[b];
    const ny = normals[a + 1] + normals[b + 1];
    const nz = normals[a + 2] + normals[b + 2];
    const l = Math.hypot(nx, ny, nz) || 1;
    normals[a] = normals[b] = nx / l;
    normals[a + 1] = normals[b + 1] = ny / l;
    normals[a + 2] = normals[b + 2] = nz / l;
  }
  for (let j = 0; j <= segs; j++) {
    const lo = j * 3;
    const hi = (rings * cols + j) * 3;
    normals[lo] = 0; normals[lo + 1] = -1; normals[lo + 2] = 0;
    normals[hi] = 0; normals[hi + 1] = 1; normals[hi + 2] = 0;
  }
  return normals;
}

function gridIndices(rings: number, segs: number): Uint32Array {
  const cols = segs + 1;
  const indices = new Uint32Array(rings * segs * 6);
  let t = 0;
  for (let i = 0; i < rings; i++) {
    for (let j = 0; j < segs; j++) {
      const a = i * cols + j;
      const c = a + cols;
      indices[t++] = a; indices[t++] = a + 1; indices[t++] = c;
      indices[t++] = a + 1; indices[t++] = c + 1; indices[t++] = c;
    }
  }
  return indices;
}

/**
 * Oreja: elipsoide aplanado con hélix (borde) en relieve, concha hundida y lóbulo. Eje x = hacia afuera.
 * Para la oreja izquierda se espeja con scale.x = -1.
 */
export function buildEar(rings = 36, segs = 36): HeadData {
  const cols = segs + 1;
  const positions = new Float32Array((rings + 1) * cols * 3);
  const uvs = new Float32Array((rings + 1) * cols * 2);
  for (let i = 0; i <= rings; i++) {
    const th = (Math.PI * i) / rings;
    const dy = Math.cos(th);
    const sr = Math.sin(th);
    for (let j = 0; j <= segs; j++) {
      const ph = (2 * Math.PI * j) / segs;
      const dx = sr * Math.cos(ph);
      const dz = sr * Math.sin(ph);
      const lobe = 1 - 0.4 * smooth(-0.1, -1, dy); // el lóbulo se afina
      const rx = 0.05, ry = 0.27, rz = 0.155 * lobe;
      let x = rx * dx;
      if (dx > 0) {
        const r = Math.sqrt(Math.max(0, 1 - dx * dx)); // 0 en el centro de la cara externa, 1 en el borde
        const ant = 0.5 + 0.5 * clamp(dz, -1, 1);
        x += 0.032 * Math.exp(-(((r - 0.86) / 0.1) ** 2)); // hélix
        x -= 0.05 * Math.exp(-((r / 0.5) ** 2)) * (0.6 + 0.4 * ant); // concha
        x += 0.016 * Math.exp(-(((dy * 0.9 + dz * 0.5 - 0.1) / 0.16) ** 2)) * smooth(0.2, 0.8, r); // antihélix
      }
      const k = (i * cols + j) * 3;
      positions[k] = x;
      positions[k + 1] = ry * dy;
      positions[k + 2] = rz * dz;
      uvs[(i * cols + j) * 2] = j / segs;
      uvs[(i * cols + j) * 2 + 1] = i / rings;
    }
  }
  const indices = gridIndices(rings, segs);
  return { positions, normals: finishNormals(positions, indices, rings, segs), uvs, indices };
}
