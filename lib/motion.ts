/**
 * Utilidades de movimiento.
 *
 * `Damped` es un amortiguador críticamente amortiguado (SmoothDamp): acelera y frena de forma suave
 * (ease-in-out), conserva la velocidad si el objetivo cambia a mitad de camino y nunca rebota.
 * Un lerp exponencial, en cambio, arranca siempre a la máxima velocidad y se siente "brusco".
 */
export class Damped {
  value: number;
  vel = 0;

  constructor(value = 0) {
    this.value = value;
  }

  step(target: number, smoothTime: number, dt: number): number {
    const omega = 2 / Math.max(0.0001, smoothTime);
    const x = omega * dt;
    const e = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
    const change = this.value - target;
    const temp = (this.vel + omega * change) * dt;
    this.vel = (this.vel - omega * temp) * e;
    this.value = target + (change + temp) * e;
    return this.value;
  }

  snap(v: number) {
    this.value = v;
    this.vel = 0;
  }
}

/** Evita saltos al volver de otra pestaña o tras un tirón de rendimiento. */
export const clampDt = (dt: number) => Math.min(dt, 1 / 20);

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/** Campana suave 0 → 1 → 0 (para el empuje de cámara en las transiciones). */
export const bell = (p: number) => Math.sin(Math.PI * clamp01(p)) ** 2;

/** Factor de suavizado independiente de los FPS. */
export const damp = (rate: number, dt: number) => 1 - Math.exp(-rate * dt);
