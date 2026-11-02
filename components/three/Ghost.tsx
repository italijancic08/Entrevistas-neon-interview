"use client";

import { useEffect, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { Step } from "@/lib/steps";
import { clampDt, damp } from "@/lib/motion";

/**
 * Palabra gigante en contorno detrás de las cabezas (el "FUTURCORE" de la referencia).
 * Se dibuja una vez en un canvas 2D y vive en la escena 3D, como un plano al fondo: así queda
 * realmente detrás de los bustos y se mueve con la cámara.
 */
const WORDS: Record<Step["kind"], string> = {
  intro: "RELEVAMIENTO",
  presentation: "ENTREVISTAS",
  question: "PREGUNTAS",
  conclusion: "CONCLUSIÓN",
  final: "CIERRE",
};
const KINDS = Object.keys(WORDS) as Step["kind"][];
const OPACITY: Record<Step["kind"], number> = { intro: 0.13, presentation: 0.12, question: 0.07, conclusion: 0.07, final: 0.11 };

const CW = 4096;
const CH = 1024;
const Z = -4.2;

function drawWord(text: string, family: string): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = CW;
  c.height = CH;
  const g = c.getContext("2d")!;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.lineJoin = "round";
  g.strokeStyle = "#ffffff";
  g.lineWidth = 3;
  const probe = 400;
  g.font = `600 ${probe}px ${family}`;
  g.letterSpacing = "0.06em"; // si el navegador no lo soporta, simplemente se ignora
  const w = g.measureText(text).width || 1;
  const size = Math.max(260, Math.min(560, (CW * 0.96 * probe) / w));
  g.font = `600 ${size}px ${family}`;
  g.letterSpacing = "0.06em";
  g.strokeText(text, CW / 2, CH / 2);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

export default function Ghost({ kind, camZ }: { kind: Step["kind"]; camZ: number }) {
  const { size } = useThree();
  const [maps, setMaps] = useState<Record<string, THREE.CanvasTexture> | null>(null);
  const mats = useRef<Record<string, THREE.MeshBasicMaterial | null>>({});

  useEffect(() => {
    let dead = false;
    const made: THREE.CanvasTexture[] = [];
    (async () => {
      const family = getComputedStyle(document.documentElement).getPropertyValue("--font-montserrat").trim() || "sans-serif";
      try {
        await document.fonts.load(`600 200px ${family}`, "RELEVAMIENTO");
      } catch {
        /* si la fuente no carga se usa la de respaldo */
      }
      if (dead) return;
      const out: Record<string, THREE.CanvasTexture> = {};
      for (const k of KINDS) {
        out[k] = drawWord(WORDS[k], family);
        made.push(out[k]);
      }
      setMaps(out);
    })();
    return () => {
      dead = true;
      made.forEach((t) => t.dispose());
    };
  }, []);

  const dist = camZ - Z;
  const visH = 2 * dist * Math.tan(THREE.MathUtils.degToRad(20));
  const visW = visH * (size.width / size.height);
  const width = Math.max(visW * 1.12, visH * 0.95);
  const height = (width * CH) / CW;

  useFrame((_, rawDt) => {
    const dt = clampDt(rawDt);
    for (const k of KINDS) {
      const m = mats.current[k];
      if (m) m.opacity += ((k === kind ? OPACITY[k] : 0) - m.opacity) * damp(3, dt);
    }
  });

  if (!maps) return null;
  return (
    <group position={[0, visH * 0.17, Z]}>
      {KINDS.map((k) => (
        <mesh key={k} renderOrder={-1}>
          <planeGeometry args={[width, height]} />
          <meshBasicMaterial
            ref={(m) => {
              mats.current[k] = m;
            }}
            map={maps[k]}
            transparent
            opacity={0}
            depthWrite={false}
            toneMapped={false}
            fog={false}
          />
        </mesh>
      ))}
    </group>
  );
}
