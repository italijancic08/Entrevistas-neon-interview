"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, PerformanceMonitor } from "@react-three/drei";
import { Bloom, EffectComposer, ToneMapping } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import * as THREE from "three";
import Bust, { type BustTarget } from "./Bust";
import Ghost from "./Ghost";
import { BG, THEMES } from "@/lib/theme";
import { STEPS, type Step, type View } from "@/lib/steps";
import type { Device } from "@/hooks/useDevice";
import { Damped, bell, clampDt, damp } from "@/lib/motion";

const H = 3.35; // alto aproximado del busto a escala 1

type Mouse = RefObject<{ x: number; y: number }>;

/** Posición, escala y giro de cada busto según la escena. Las fracciones coinciden con el layout HTML. */
function computeLayout(step: Step, view: View, visW: number, visH: number, portrait: boolean): { busts: BustTarget[]; intensity: number } {
  const col = (i: number) => ((i - 1) * visW) / 3;
  const hidden = (i: number): BustTarget => ({ x: col(i), y: 0, z: -2, s: 0, ry: 0 });
  const face = (i: number, k: number) => (1 - i) * k;

  switch (step.kind) {
    case "intro": {
      const b: BustTarget = portrait
        ? { x: 0, y: visH * 0.2, z: 0, s: (visH * 0.36) / H, ry: -0.3 }
        : { x: visW * 0.24, y: -visH * 0.02, z: 0, s: Math.min((visH * 0.74) / H, (visW * 0.36) / 3.2), ry: -0.45 };
      return { busts: [b, hidden(1), hidden(2)], intensity: 1 };
    }
    case "presentation": {
      const sp = portrait ? 0.31 : 0.27;
      const s = portrait ? Math.min((visH * 0.3) / H, (visW * 0.31) / 3.2) : Math.min((visH * 0.5) / H, (visW * 0.27) / 3.2);
      return {
        busts: [0, 1, 2].map((i) => ({ x: (i - 1) * visW * sp, y: portrait ? visH * 0.02 : -visH * 0.02, z: 0, s, ry: face(i, 0.3) })),
        intensity: 1,
      };
    }
    case "question": {
      if (view.mode === "compare") {
        const y = portrait ? (0.5 - 0.31) * visH : (0.5 - 0.36) * visH;
        const s = portrait ? Math.min((visH * 0.15) / H, (visW * 0.3) / 3.2) : Math.min((visH * 0.3) / H, ((visW / 3) * 0.9) / 3.2);
        return {
          busts: [0, 1, 2].map((i) => ({ x: portrait ? (i - 1) * visW * 0.3 : col(i), y, z: 0, s, ry: face(i, 0.25) })),
          intensity: 0.9,
        };
      }
      const sel = view.selected - 1;
      const b: BustTarget = portrait
        ? { x: 0, y: (0.5 - 0.29) * visH, z: 0, s: Math.min((visH * 0.26) / H, (visW * 0.6) / 3.2), ry: 0 }
        : { x: -visW * 0.22, y: -visH * 0.02, z: 0, s: Math.min((visH * 0.78) / H, (visW * 0.38) / 3.2), ry: 0.3 };
      return { busts: [0, 1, 2].map((i) => (i === sel ? b : hidden(i))), intensity: 0.95 };
    }
    case "conclusion": {
      const sp = portrait ? 0.3 : 0.36;
      const s = portrait ? (visH * 0.2) / H : Math.min((visH * 0.5) / H, (visW * 0.3) / 3.2);
      return {
        busts: [0, 1, 2].map((i) => ({ x: (i - 1) * visW * sp, y: portrait ? visH * 0.22 : visH * 0.12, z: -2.5, s, ry: face(i, 0.3) })),
        intensity: 0.55,
      };
    }
    default: {
      const sp = portrait ? 0.3 : 0.27;
      const s = portrait ? Math.min((visH * 0.2) / H, (visW * 0.3) / 3.2) : Math.min((visH * 0.36) / H, (visW * 0.26) / 3.2);
      return {
        busts: [0, 1, 2].map((i) => ({ x: (i - 1) * visW * sp, y: portrait ? visH * 0.22 : visH * 0.15, z: 0, s, ry: face(i, 0.2) })),
        intensity: 1,
      };
    }
  }
}

interface WorldProps {
  view: View;
  dirRef: RefObject<number>;
  device: Device;
  hovered: number | null;
  onHover: (i: number | null) => void;
  onSelect: (i: number) => void;
  mouse: Mouse;
}

function World({ view, dirRef, device, hovered, onHover, onSelect, mouse }: WorldProps) {
  const { size } = useThree();
  const portrait = device.portrait;
  const camZ = portrait ? 9.2 : 7;
  const visH = 2 * camZ * Math.tan(THREE.MathUtils.degToRad(20));
  const visW = visH * (size.width / size.height);
  const step = STEPS[view.step];

  const { busts, intensity } = useMemo(() => computeLayout(step, view, visW, visH, portrait), [step, view, visW, visH, portrait]);

  const intensityRef = useRef(1);
  const enteredAt = useRef(0);
  const kickFrom = useRef(-1e9);

  // El mouse llega a saltos; se filtra antes de usarlo para mover busto y cámara.
  const smoothMouse = useRef({ x: 0, y: 0 });

  // Cámara: cada eje se amortigua (acelera y frena suave) en vez de perseguir el objetivo a velocidad máxima.
  const cam = useRef({ x: new Damped(0), y: new Damped(0), z: new Damped(camZ) });

  useEffect(() => {
    // Empuje de cámara en cada transición: una campana 0 → 1 → 0, así arranca y termina sin tirones.
    kickFrom.current = device.reduced ? -1e9 : performance.now();
    enteredAt.current = performance.now();
  }, [view.step, view.mode, view.selected, device.reduced]);

  useFrame((state, rawDt) => {
    const dt = clampDt(rawDt);
    const camera = state.camera as THREE.PerspectiveCamera;
    const c = cam.current;

    const sm = smoothMouse.current;
    const km = damp(6, dt);
    sm.x += (mouse.current.x - sm.x) * km;
    sm.y += (mouse.current.y - sm.y) * km;

    const kick = bell((performance.now() - kickFrom.current) / 1500);

    let drift = 0;
    if (step.kind === "conclusion") drift = (step.f - 2) * 0.35;
    else if (step.kind === "intro" || step.kind === "presentation") drift = Math.sin(view.step * 1.3) * 0.25;
    const tx = step.kind === "question" ? 0 : drift;

    camera.position.x = c.x.step(tx + sm.x * 0.18, 0.6, dt);
    camera.position.y = c.y.step(sm.y * 0.1, 0.6, dt);
    camera.position.z = c.z.step(camZ, 0.7, dt) + kick * 1.6;
    camera.rotation.z = kick * 0.05 * dirRef.current;
    const fov = 40 + kick * 7;
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }

    let ti = intensity;
    if (step.kind === "final") ti = Math.max(0.22, 1 - (performance.now() - enteredAt.current) / 1000 / 14);
    intensityRef.current += (ti - intensityRef.current) * damp(2, dt);
    state.scene.environmentIntensity = 0.25 + 0.75 * intensityRef.current;

  });

  return (
    <>
      <ambientLight intensity={0.15} />
      <Environment resolution={256}>
        {/* Contraluz cálido grande (derecha, atrás), contraluz frío (izquierda, atrás) y un relleno frontal tenue */}
        <Lightformer form="rect" intensity={5} color="#FF4A3D" position={[5, 1.5, -4.5]} scale={[5, 6, 1]} />
        <Lightformer form="rect" intensity={3} color="#6FD3E8" position={[-5.5, 2, -4]} scale={[5, 4, 1]} />
        <Lightformer form="rect" intensity={0.9} color="#EAF7FF" position={[-2, 3, 6]} scale={[8, 2, 1]} />
      </Environment>

      <Ghost kind={step.kind} camZ={camZ} />

      <Suspense fallback={null}>
      {busts.map((t, i) => (
        <Bust
          key={i}
          theme={THEMES[i]}
          index={i}
          target={t}
          intensity={intensityRef}
          mouse={smoothMouse}
          hovered={hovered === i}
          interactive={step.kind === "presentation"}
          showLabel={step.kind === "presentation"}
          lowPower={device.lowPower}
          onHover={onHover}
          onSelect={onSelect}
        />
      ))}
      </Suspense>

      {!device.lowPower && (
        <EffectComposer multisampling={4}>
          <Bloom intensity={1.1} luminanceThreshold={0.8} luminanceSmoothing={0.2} mipmapBlur />
          <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        </EffectComposer>
      )}
    </>
  );
}

export interface StageProps {
  view: View;
  dirRef: RefObject<number>;
  device: Device;
  hovered: number | null;
  onHover: (i: number | null) => void;
  onSelect: (i: 1 | 2 | 3) => void;
}

export default function Stage({ view, dirRef, device, hovered, onHover, onSelect }: StageProps) {
  const mouse = useRef({ x: 0, y: 0 });
  const maxDpr = device.lowPower ? 1.25 : 1.75;
  const [dpr, setDpr] = useState(maxDpr);

  useEffect(() => {
    const h = (e: PointerEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", h);
    return () => window.removeEventListener("pointermove", h);
  }, []);

  const select = useCallback((i: number) => onSelect(i as 1 | 2 | 3), [onSelect]);

  return (
    <div className="fixed inset-0 z-0">
      <Canvas
        dpr={Math.min(dpr, maxDpr)}
        camera={{ fov: 40, position: [0, 0, 7], near: 0.1, far: 80 }}
        gl={{ antialias: !device.lowPower, powerPreference: "high-performance" }}
      >
        <color attach="background" args={[BG]} />
        {/* Si los FPS caen, baja la resolución de forma gradual para mantener el movimiento fluido */}
        <PerformanceMonitor onChange={({ factor }) => setDpr(Math.round((1 + (maxDpr - 1) * factor) * 8) / 8)} />
        <World view={view} dirRef={dirRef} device={device} hovered={hovered} onHover={onHover} onSelect={select} mouse={mouse} />
      </Canvas>
    </div>
  );
}