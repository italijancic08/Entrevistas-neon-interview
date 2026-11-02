import * as THREE from "three";
import { rng } from "./head";

/**
 * Texturas procedurales del "metal con circuitos" de la referencia:
 * - bump: placas, uniones y pistas en relieve
 * - emissive: pistas y glifos que brillan (alimentan el bloom)
 * Las dos dejan la cara lisa (máscara suave) para que el rostro se lea limpio.
 * La coordenada u recorre el cráneo (0 = nuca, 0.5 = frente) y v va de la barbilla a la coronilla.
 */
export interface SkinTextures {
  bump: THREE.CanvasTexture;
  emissive: THREE.CanvasTexture;
}

type Rnd = () => number;

function trace(ctx: CanvasRenderingContext2D, rnd: Rnd, x: number, y: number, segs: number, step: number) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  let horizontal = rnd() < 0.5;
  for (let i = 0; i < segs; i++) {
    const len = (1 + Math.floor(rnd() * 4)) * step * (rnd() < 0.5 ? -1 : 1);
    if (horizontal) x += len;
    else y += len;
    ctx.lineTo(x, y);
    horizontal = !horizontal;
  }
  ctx.stroke();
  return [x, y] as const;
}

function clearFace(ctx: CanvasRenderingContext2D, W: number, H: number, color: string) {
  ctx.save();
  ctx.translate(W * 0.5, H * 0.6);
  ctx.scale((W * 0.16) / (H * 0.42), 1);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, H * 0.42);
  g.addColorStop(0, color);
  g.addColorStop(0.72, color);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, H * 0.42, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function makeSkinTextures(colorA: string, colorB: string, seed: number, W = 1024, H = 512): SkinTextures {
  const rnd = rng(seed * 97 + 5);
  const cell = 16;

  // ---- Relieve (escala de grises, 128 = nivel medio) ----
  const bc = document.createElement("canvas");
  bc.width = W;
  bc.height = H;
  const b = bc.getContext("2d")!;
  b.fillStyle = "#808080";
  b.fillRect(0, 0, W, H);

  for (let i = 0; i < 110; i++) {
    const w = (1 + Math.floor(rnd() * 8)) * cell;
    const h = (1 + Math.floor(rnd() * 4)) * cell;
    const x = Math.floor((rnd() * W) / cell) * cell;
    const y = Math.floor((rnd() * H) / cell) * cell;
    const g = 128 + (rnd() < 0.5 ? -1 : 1) * (14 + rnd() * 34);
    b.fillStyle = `rgb(${g},${g},${g})`;
    b.fillRect(x, y, w, h);
    b.strokeStyle = "#3c3c3c";
    b.lineWidth = 2;
    b.strokeRect(x + 1, y + 1, w - 2, h - 2);
  }
  b.strokeStyle = "#d2d2d2";
  b.fillStyle = "#e4e4e4";
  b.lineWidth = 3;
  b.lineJoin = "round";
  for (let i = 0; i < 60; i++) {
    const [ex, ey] = trace(b, rnd, rnd() * W, rnd() * H, 3 + Math.floor(rnd() * 3), cell * 1.5);
    b.beginPath();
    b.arc(ex, ey, 4.5, 0, Math.PI * 2);
    b.fill();
  }
  for (let i = 0; i < 2500; i++) {
    const g = 128 + (rnd() - 0.5) * 36;
    b.fillStyle = `rgb(${g},${g},${g})`;
    b.fillRect(rnd() * W, rnd() * H, 1 + rnd() * 2, 1 + rnd() * 2);
  }
  clearFace(b, W, H, "rgb(128,128,128)");

  // ---- Emisiva (pistas luminosas sobre negro) ----
  const ec = document.createElement("canvas");
  ec.width = W;
  ec.height = H;
  const e = ec.getContext("2d")!;
  e.fillStyle = "#000";
  e.fillRect(0, 0, W, H);
  e.lineJoin = "round";
  e.lineCap = "round";
  const palette = [colorA, colorA, "#ffffff", colorB];
  for (let i = 0; i < 16; i++) {
    const c = palette[Math.floor(rnd() * palette.length)];
    e.strokeStyle = c;
    e.fillStyle = c;
    e.shadowColor = c;
    e.shadowBlur = 6;
    e.lineWidth = 1 + rnd() * 0.8;
    const [ex, ey] = trace(e, rnd, rnd() * W, rnd() * H, 2 + Math.floor(rnd() * 4), cell * (1 + rnd() * 2));
    if (rnd() < 0.6) {
      e.beginPath();
      e.arc(ex, ey, 2.5 + rnd() * 2.5, 0, Math.PI * 2);
      e.fill();
    }
  }
  // Grupos de glifos: pequeños marcos que recuerdan a los símbolos grabados de la referencia
  e.shadowBlur = 4;
  for (let i = 0; i < 4; i++) {
    const c = palette[Math.floor(rnd() * palette.length)];
    e.strokeStyle = c;
    e.lineWidth = 1.5;
    const x = rnd() * W;
    const y = rnd() * H;
    for (let k = 0; k < 3 + Math.floor(rnd() * 4); k++) {
      e.strokeRect(x + k * 9, y + (rnd() - 0.5) * 6, 5 + rnd() * 6, 8 + rnd() * 10);
    }
  }
  e.shadowBlur = 0;
  clearFace(e, W, H, "rgba(0,0,0,1)");

  const bump = new THREE.CanvasTexture(bc);
  const emissive = new THREE.CanvasTexture(ec);
  emissive.colorSpace = THREE.SRGBColorSpace;
  for (const t of [bump, emissive]) {
    t.wrapS = THREE.RepeatWrapping;
    t.anisotropy = 8;
  }
  return { bump, emissive };
}
