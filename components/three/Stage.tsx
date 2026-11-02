"use client";

import { useCallback, useEffect, useMemo, useRef, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Float, Grid, Lightformer, Sparkles } from "@react-three/drei";
import { Bloom, EffectComposer, ToneMapping, Vignette } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import * as THREE from "three";
import Bust, { type BustTarget } from "./Bust";
import { THEMES } from "@/lib/theme";
import { STEPS, type Step, type View } from "@/lib/steps";
import type { Device } from "@/hooks/useDevice";

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

const DECOR: { p: [number, number, number]; s: number; k: number; c: string }[] = [
  { p: [-7, 2.2, -6], s: 0.7, k: 0, c: "#00E5FF" },
  { p: [7.5, -0.5, -7], s: 0.9, k: 1, c: "#FF315F" },
  { p: [-5, -1.2, -8], s: 0.6, k: 2, c: "#8B5CF6" },
  { p: [4.5, 3, -9], s: 0.8, k: 3, c: "#00E5FF" },
  { p: [-9, 0.5, -10], s: 1.1, k: 1, c: "#8B5CF6" },
  { p: [9, 2.6, -11], s: 0.7, k: 0, c: "#FF315F" },
];

function DecorShape({ k }: { k: number }) {
  switch (k) {
    case 0: return <octahedronGeometry args={[1, 0]} />;
    case 1: return <icosahedronGeometry args={[1, 0]} />;
    case 2: return <torusGeometry args={[1, 0.08, 8, 40]} />;
    default: return <boxGeometry args={[1.4, 1.4, 1.4]} />;
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
  const kick = useRef(0);
  const enteredAt = useRef(0);
  const gridRef = useRef<THREE.Mesh>(null);

  useEffect(() => {
    kick.current = device.reduced ? 0 : 1; // empuje de cámara en cada transición
    enteredAt.current = performance.now();
  }, [view.step, view.mode, view.selected, device.reduced]);

  useFrame((state, dt) => {
    const cam = state.camera as THREE.PerspectiveCamera;
    const k = 1 - Math.exp(-dt * 3);
    kick.current *= Math.exp(-dt * 2.4);

    let drift = 0;
    if (step.kind === "conclusion") drift = (step.f - 2) * 0.35;
    else if (step.kind === "intro" || step.kind === "presentation") drift = Math.sin(view.step * 1.3) * 0.25;
    const tx = step.kind === "question" ? 0 : drift;

    cam.position.x += (tx + mouse.current.x * 0.18 - cam.position.x) * k;
    cam.position.y += (mouse.current.y * 0.1 - cam.position.y) * k;
    cam.position.z = camZ + kick.current * 1.6;
    cam.rotation.z = kick.current * 0.05 * dirRef.current;
    const fov = 40 + kick.current * 7;
    if (Math.abs(cam.fov - fov) > 0.01) {
      cam.fov = fov;
      cam.updateProjectionMatrix();
    }

    let ti = intensity;
    if (step.kind === "final") ti = Math.max(0.22, 1 - (performance.now() - enteredAt.current) / 1000 / 14);
    intensityRef.current += (ti - intensityRef.current) * (1 - Math.exp(-dt * 2));
    state.scene.environmentIntensity = 0.25 + 0.75 * intensityRef.current;

    if (gridRef.current) gridRef.current.position.z = (state.clock.elapsedTime * 0.5) % 3;
  });

  const decor = device.lowPower ? DECOR.slice(0, 3) : DECOR;

  return (
    <>
      <ambientLight intensity={0.12} />
      <Environment resolution={256}>
        <Lightformer form="rect" intensity={4} color="#00E5FF" position={[-5, 2, -3]} scale={[8, 3, 1]} />
        <Lightformer form="rect" intensity={5} color="#FF315F" position={[5, 1, -4]} scale={[6, 4, 1]} />
        <Lightformer form="ring" intensity={2} color="#8B5CF6" position={[0, 4, 2]} scale={4} />
        <Lightformer form="rect" intensity={1.2} color="#EAF7FF" position={[0, 1, 6]} scale={[10, 2, 1]} />
      </Environment>

      <Grid
        ref={gridRef}
        position={[0, -2.5, 0]}
        args={[60, 60]}
        cellSize={0.5}
        cellThickness={0.6}
        cellColor="#0a4b5c"
        sectionSize={3}
        sectionThickness={1.1}
        sectionColor="#FF315F"
        fadeDistance={26}
        fadeStrength={1.5}
      />

      <Sparkles count={device.lowPower ? 60 : 160} scale={[16, 9, 10]} size={2.2} speed={0.25} color="#EAF7FF" opacity={0.7} position={[0, 0.5, -2]} />
      <Sparkles count={device.lowPower ? 20 : 60} scale={[14, 8, 8]} size={3} speed={0.3} color="#00E5FF" opacity={0.8} position={[0, 0.5, -3]} />

      {decor.map((d, i) => (
        <Float key={i} speed={1 + i * 0.2} rotationIntensity={1.2} floatIntensity={1.5} position={d.p}>
          <mesh scale={d.s}>
            <DecorShape k={d.k} />
            <meshBasicMaterial wireframe color={d.c} transparent opacity={0.35} toneMapped={false} />
          </mesh>
        </Float>
      ))}

      {busts.map((t, i) => (
        <Bust
          key={i}
          theme={THEMES[i]}
          index={i}
          target={t}
          intensity={intensityRef}
          mouse={mouse}
          hovered={hovered === i}
          interactive={step.kind === "presentation"}
          showLabel={step.kind === "presentation"}
          lowPower={device.lowPower}
          onHover={onHover}
          onSelect={onSelect}
        />
      ))}

      {!device.lowPower && (
        <EffectComposer multisampling={0}>
          <Bloom intensity={0.9} luminanceThreshold={0.85} luminanceSmoothing={0.2} mipmapBlur />
          <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
          <Vignette offset={0.2} darkness={0.8} />
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
        dpr={device.lowPower ? [1, 1.25] : [1, 1.75]}
        camera={{ fov: 40, position: [0, 0, 7], near: 0.1, far: 80 }}
        gl={{ antialias: !device.lowPower, powerPreference: "high-performance" }}
      >
        <color attach="background" args={["#071018"]} />
        <fog attach="fog" args={["#071018", 10, 28]} />
        <World view={view} dirRef={dirRef} device={device} hovered={hovered} onHover={onHover} onSelect={select} mouse={mouse} />
      </Canvas>
    </div>
  );
}