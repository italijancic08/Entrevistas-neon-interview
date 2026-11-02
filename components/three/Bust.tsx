"use client";

import { useLayoutEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { Html, Sparkles } from "@react-three/drei";
import * as THREE from "three";
import type { BustTheme } from "@/lib/theme";

export interface BustTarget {
  x: number;
  y: number;
  z: number;
  s: number;
  ry: number;
}

interface Props {
  theme: BustTheme;
  index: number;
  target: BustTarget;
  intensity: RefObject<number>;
  mouse: RefObject<{ x: number; y: number }>;
  hovered: boolean;
  interactive: boolean;
  showLabel: boolean;
  lowPower: boolean;
  onHover: (i: number | null) => void;
  onSelect: (i: number) => void;
}

function rng(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

/** Reparte piezas (placas o trazos de circuito) sobre la superficie de un elipsoide. */
function scatter(
  seed: number,
  count: number,
  center: [number, number, number],
  radii: [number, number, number],
  trace: boolean,
  clearFace: boolean
): THREE.Matrix4[] {
  const rnd = rng(seed);
  const out: THREE.Matrix4[] = [];
  const o = new THREE.Object3D();
  const dir = new THREE.Vector3();
  let guard = 0;
  while (out.length < count && guard++ < count * 30) {
    const u = rnd() * Math.PI * 2;
    const v = Math.acos(2 * rnd() - 1);
    dir.set(Math.sin(v) * Math.cos(u), Math.cos(v), Math.sin(v) * Math.sin(u));
    if (clearFace && dir.z > 0.25 && Math.abs(dir.x) < 0.72 && dir.y < 0.6 && dir.y > -0.6) continue;
    o.position.set(center[0] + dir.x * radii[0], center[1] + dir.y * radii[1], center[2] + dir.z * radii[2]);
    o.lookAt(o.position.x + dir.x, o.position.y + dir.y, o.position.z + dir.z);
    o.rotateZ(Math.floor(rnd() * 4) * (Math.PI / 2) + (rnd() - 0.5) * 0.3);
    if (trace) o.scale.set(0.15 + rnd() * 0.4, 0.014, 0.014);
    else o.scale.set(0.08 + rnd() * 0.28, 0.05 + rnd() * 0.16, 0.03 + rnd() * 0.07);
    o.updateMatrix();
    out.push(o.matrix.clone());
  }
  return out;
}

function BodyMaterial({ theme }: { theme: BustTheme }) {
  if (theme.kind === "holo")
    return (
      <meshPhysicalMaterial color={theme.body} metalness={0.95} roughness={0.18} iridescence={1} iridescenceIOR={1.6} clearcoat={1} clearcoatRoughness={0.1} />
    );
  if (theme.kind === "geo") return <meshStandardMaterial color={theme.body} metalness={0.85} roughness={0.35} flatShading />;
  return <meshStandardMaterial color={theme.body} metalness={0.92} roughness={0.28} />;
}

export default function Bust({ theme, index, target, intensity, mouse, hovered, interactive, showLabel, lowPower, onHover, onSelect }: Props) {
  const root = useRef<THREE.Group>(null);
  const ringA = useRef<THREE.Mesh>(null);
  const ringB = useRef<THREE.Mesh>(null);
  const lightA = useRef<THREE.PointLight>(null);
  const lightB = useRef<THREE.PointLight>(null);
  const darkRef = useRef<THREE.InstancedMesh>(null);
  const glowRef = useRef<THREE.InstancedMesh>(null);
  const cur = useRef({ x: target.x, y: target.y, z: target.z, s: 0, ry: target.ry, hov: 0 });

  const colA = useMemo(() => new THREE.Color(theme.a).multiplyScalar(2.2), [theme.a]);
  const colB = useMemo(() => new THREE.Color(theme.b).multiplyScalar(2.2), [theme.b]);

  const { dark, glow } = useMemo(() => {
    const n = lowPower ? 0.5 : 1;
    const head = scatter(theme.seed, Math.round(220 * n), [0, 0.95, 0], [0.8, 1, 0.92], false, true);
    const shoulders = scatter(theme.seed + 7, Math.round(70 * n), [0, -0.85, 0], [1.55, 0.55, 0.85], false, false);
    const t1 = scatter(theme.seed + 13, Math.round(90 * n), [0, 0.95, 0], [0.81, 1.01, 0.93], true, true);
    const t2 = scatter(theme.seed + 17, Math.round(30 * n), [0, -0.85, 0], [1.56, 0.56, 0.86], true, false);
    return { dark: [...head, ...shoulders], glow: [...t1, ...t2] };
  }, [theme.seed, lowPower]);

  useLayoutEffect(() => {
    const d = darkRef.current;
    const g = glowRef.current;
    if (!d || !g) return;
    dark.forEach((m, i) => d.setMatrixAt(i, m));
    d.instanceMatrix.needsUpdate = true;
    glow.forEach((m, i) => {
      g.setMatrixAt(i, m);
      g.setColorAt(i, i % 3 === 0 ? colB : colA);
    });
    g.instanceMatrix.needsUpdate = true;
    if (g.instanceColor) g.instanceColor.needsUpdate = true;
  }, [dark, glow, colA, colB]);

  useFrame((state, dt) => {
    const g = root.current;
    if (!g) return;
    const c = cur.current;
    const k = 1 - Math.exp(-dt * 3.2);
    c.x += (target.x - c.x) * k;
    c.y += (target.y - c.y) * k;
    c.z += (target.z - c.z) * k;
    c.ry += (target.ry - c.ry) * k;
    c.s += (target.s - c.s) * (1 - Math.exp(-dt * 3.8));
    c.hov += ((hovered ? 1 : 0) - c.hov) * (1 - Math.exp(-dt * 8));

    const s = c.s * (1 + c.hov * 0.09);
    g.visible = s > 0.02;
    if (!g.visible) return;

    const t = state.clock.elapsedTime;
    const m = mouse.current;
    g.position.set(c.x, c.y + Math.sin(t * 0.9 + index * 1.7) * 0.07 * Math.max(s, 0.4), c.z);
    g.scale.setScalar(s);
    g.rotation.y = c.ry + m.x * 0.5 + Math.sin(t * 0.35 + index) * 0.1 + c.hov * Math.sin(t * 4) * 0.06;
    g.rotation.x = -m.y * 0.16 + c.hov * Math.sin(t * 3) * 0.02;

    if (ringA.current) ringA.current.rotation.z = t * 0.45 + index;
    if (ringB.current) ringB.current.rotation.z = -t * 0.3 + index;

    const I = intensity.current * (1 + c.hov * 1.3);
    const sq = s * s; // compensa la caída de luz al escalar el grupo
    if (lightA.current) lightA.current.intensity = 34 * I * sq;
    if (lightB.current) lightB.current.intensity = 40 * I * sq;
  });

  return (
    <group
      ref={root}
      onPointerOver={(e) => {
        if (!interactive) return;
        e.stopPropagation();
        onHover(index);
      }}
      onPointerOut={() => {
        if (interactive) onHover(null);
      }}
      onClick={(e) => {
        if (!interactive) return;
        e.stopPropagation();
        onSelect(index + 1);
      }}
    >
      {/* Cabeza */}
      <mesh position={[0, 0.95, 0]} scale={[0.8, 1, 0.92]}>
        {theme.kind === "geo" ? <icosahedronGeometry args={[1, 2]} /> : <sphereGeometry args={[1, 64, 64]} />}
        <BodyMaterial theme={theme} />
      </mesh>
      {/* Mandíbula */}
      <mesh position={[0, 0.32, 0.14]} scale={[0.6, 0.52, 0.72]}>
        <sphereGeometry args={[1, 32, 32]} />
        <BodyMaterial theme={theme} />
      </mesh>
      {/* Cuello y hombros */}
      <mesh position={[0, -0.3, 0]}>
        <cylinderGeometry args={[0.32, 0.4, 0.9, 24]} />
        <BodyMaterial theme={theme} />
      </mesh>
      <mesh position={[0, -0.95, 0]} scale={[1.55, 0.55, 0.85]}>
        <sphereGeometry args={[1, 40, 40]} />
        <BodyMaterial theme={theme} />
      </mesh>
      <mesh position={[0, -0.45, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.5, 0.035, 12, 48]} />
        <meshBasicMaterial color={colA} toneMapped={false} />
      </mesh>

      {/* Rostro */}
      {[-1, 1].map((sx) => (
        <mesh key={sx} position={[sx * 0.28, 1.08, 0.85]} rotation={[0, sx * -0.25, sx * 0.08]}>
          <boxGeometry args={[0.22, 0.035, 0.05]} />
          <meshBasicMaterial color={colA} toneMapped={false} />
        </mesh>
      ))}
      <mesh position={[0, 1.22, 0.78]}>
        <boxGeometry args={[0.95, 0.07, 0.18]} />
        <BodyMaterial theme={theme} />
      </mesh>
      <mesh position={[0, 0.88, 0.88]} rotation={[-0.3, 0, 0]}>
        <boxGeometry args={[0.13, 0.36, 0.22]} />
        <BodyMaterial theme={theme} />
      </mesh>
      <mesh position={[0, 0.55, 0.83]}>
        <boxGeometry args={[0.34, 0.025, 0.05]} />
        <meshBasicMaterial color={colB} toneMapped={false} />
      </mesh>

      {/* Malla holográfica */}
      {theme.kind !== "metal" && (
        <mesh position={[0, 0.95, 0]} scale={[0.86, 1.06, 0.98]}>
          <icosahedronGeometry args={[1, theme.kind === "geo" ? 1 : 3]} />
          <meshBasicMaterial color={colA} wireframe transparent opacity={0.22} toneMapped={false} />
        </mesh>
      )}

      {/* Anillos orbitales */}
      <mesh ref={ringA} position={[0, 0.95, 0]} rotation={[Math.PI / 2.2, 0, 0]}>
        <torusGeometry args={[1.55, 0.01, 8, 128]} />
        <meshBasicMaterial color={colA} transparent opacity={0.7} toneMapped={false} />
      </mesh>
      <mesh ref={ringB} position={[0, 0.95, 0]} rotation={[Math.PI / 3, 0.6, 0]}>
        <torusGeometry args={[1.95, 0.007, 8, 128]} />
        <meshBasicMaterial color={colB} transparent opacity={0.55} toneMapped={false} />
      </mesh>

      {/* Componentes electrónicos y circuitos */}
      <instancedMesh ref={darkRef} args={[undefined, undefined, dark.length]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#16222d" metalness={0.9} roughness={0.38} />
      </instancedMesh>
      <instancedMesh ref={glowRef} args={[undefined, undefined, glow.length]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </instancedMesh>

      {/* Iluminación neón propia */}
      <pointLight ref={lightA} color={theme.a} position={[-2.4, 1.8, 2.4]} intensity={30} decay={2} />
      <pointLight ref={lightB} color={theme.b} position={[2.6, 1.6, -2]} intensity={30} decay={2} />

      <Sparkles count={lowPower ? 12 : 30} scale={[4.2, 4.6, 3.5]} size={4} speed={0.35} opacity={0.9} color={theme.a} position={[0, 0.5, 0]} />

      {showLabel && (
        <Html center position={[0, -1.7, 0]} style={{ pointerEvents: "none" }} zIndexRange={[5, 0]}>
          <div className={`bust-tag ${hovered ? "on" : ""}`} style={{ ["--c" as string]: theme.a }}>
            <span>INTERVIEW_0{index + 1}</span>
            <em>ENTREVISTADO 0{index + 1}</em>
          </div>
        </Html>
      )}
    </group>
  );
}