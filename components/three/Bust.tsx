"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { Html, Sparkles } from "@react-three/drei";
import * as THREE from "three";
import type { BustTheme } from "@/lib/theme";
import { HEAD_VARIANTS, buildEar, buildHead, earAnchor, rng, sampleSurface, type HeadData, type SurfaceSample } from "@/lib/head";
import { makeSkinTextures } from "@/lib/skin";
import { Damped, clampDt } from "@/lib/motion";

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

const HEAD_Y = 0.95; // altura del centro de la cabeza dentro del busto
const NECK_Z = -0.2;

/* ------------------------------------------------------------------ */
/* Geometrías (se construyen una sola vez y se comparten)              */
/* ------------------------------------------------------------------ */

function toGeometry(d: HeadData): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(d.positions, 3));
  g.setAttribute("normal", new THREE.BufferAttribute(d.normals, 3));
  g.setAttribute("uv", new THREE.BufferAttribute(d.uvs, 2));
  g.setIndex(new THREE.BufferAttribute(d.indices, 1));
  g.computeBoundingSphere();
  return g;
}

interface HeadAsset {
  data: HeadData;
  geometry: THREE.BufferGeometry;
}

const headCache = new Map<string, HeadAsset>();
function getHead(variant: number, rings: number, segs: number): HeadAsset {
  const key = `${variant}-${rings}-${segs}`;
  let a = headCache.get(key);
  if (!a) {
    const data = buildHead(HEAD_VARIANTS[variant % HEAD_VARIANTS.length], rings, segs);
    a = { data, geometry: toGeometry(data) };
    headCache.set(key, a);
  }
  return a;
}

let earGeo: THREE.BufferGeometry | null = null;
const getEar = () => (earGeo ??= toGeometry(buildEar()));

/** Cuello (cilindro) y hombros (revolución con pendiente de trapecio), ya con la escala horneada. */
let bodyAsset: { neck: THREE.BufferGeometry; shoulders: THREE.BufferGeometry } | null = null;
function getBody() {
  if (!bodyAsset) {
    const neck = new THREE.CylinderGeometry(0.31, 0.38, 1.1, 40, 1, true);
    neck.scale(1, 1, 0.92);
    neck.translate(0, 0.05, NECK_Z);

    const profile = new THREE.SplineCurve(
      [
        [0.001, -1.42], [0.9, -1.4], [1.38, -1.3], [1.56, -1.12], [1.5, -0.95],
        [1.15, -0.8], [0.76, -0.66], [0.46, -0.55], [0.27, -0.46],
      ].map(([r, y]) => new THREE.Vector2(r, y))
    ).getPoints(72);
    const shoulders = new THREE.LatheGeometry(profile, 72);
    shoulders.scale(1, 1, 0.55);
    shoulders.translate(0, 0, NECK_Z);
    bodyAsset = { neck, shoulders };
  }
  return bodyAsset;
}

/* ------------------------------------------------------------------ */
/* Material                                                            */
/* ------------------------------------------------------------------ */

/**
 * Luz de contorno (rim) direccional por fresnel, inyectada como emisión: es lo que recorta la silueta
 * con ese borde rojo/cian de la referencia, independientemente de las luces de la escena.
 */
function addRim(mat: THREE.MeshPhysicalMaterial, a: THREE.Color, b: THREE.Color, rimI: { value: number }) {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uRimA = { value: a };
    shader.uniforms.uRimB = { value: b };
    shader.uniforms.uRimI = rimI;
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform vec3 uRimA;\nuniform vec3 uRimB;\nuniform float uRimI;")
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
        {
          vec3 rn = normalize(normal);
          float rf = pow(1.0 - saturate(dot(rn, normalize(vViewPosition))), 2.4);
          vec3 dA = normalize((viewMatrix * vec4(0.85, 0.55, -0.45, 0.0)).xyz);
          vec3 dB = normalize((viewMatrix * vec4(-0.9, 0.2, -0.35, 0.0)).xyz);
          float la = smoothstep(-0.1, 0.7, dot(rn, dA));
          float lb = smoothstep(-0.1, 0.7, dot(rn, dB));
          totalEmissiveRadiance += (uRimA * la * 1.7 + uRimB * lb * 0.8) * rf * uRimI;
        }`
      );
  };
  mat.customProgramCacheKey = () => "bust-rim-v1";
}

function makeBodyMaterial(theme: BustTheme, rimI: { value: number }, maps?: { bump: THREE.Texture; emissive: THREE.Texture }) {
  const base = {
    color: theme.body,
    clearcoat: 0.55,
    clearcoatRoughness: 0.22,
    envMapIntensity: 1.3,
  };
  const mat =
    theme.kind === "holo"
      ? new THREE.MeshPhysicalMaterial({ ...base, metalness: 0.95, roughness: 0.2, iridescence: 1, iridescenceIOR: 1.6, clearcoat: 1, clearcoatRoughness: 0.1 })
      : theme.kind === "geo"
        ? new THREE.MeshPhysicalMaterial({ ...base, metalness: 0.85, roughness: 0.36, flatShading: true })
        : new THREE.MeshPhysicalMaterial({ ...base, metalness: 0.92, roughness: 0.3 });

  if (maps) {
    mat.emissive = new THREE.Color("#ffffff");
    mat.emissiveMap = maps.emissive;
    mat.emissiveIntensity = 2.2;
    if (theme.kind !== "geo") {
      mat.bumpMap = maps.bump;
      mat.bumpScale = 1.5;
    }
  }
  addRim(mat, new THREE.Color(theme.b), new THREE.Color(theme.a), rimI);
  return mat;
}

/* ------------------------------------------------------------------ */
/* Detalles sobre la superficie (placas y pistas)                       */
/* ------------------------------------------------------------------ */

const _o = new THREE.Object3D();
const _z = new THREE.Vector3(0, 0, 1);
const _n = new THREE.Vector3();

function toMatrices(
  samples: SurfaceSample[],
  offset: [number, number, number],
  seed: number,
  size: (rnd: () => number) => [number, number, number],
  lift: (depth: number) => number
): THREE.Matrix4[] {
  const rnd = rng(seed);
  return samples.map(({ p, n }) => {
    const [sx, sy, sz] = size(rnd);
    const l = lift(sz);
    _o.position.set(p[0] + n[0] * l + offset[0], p[1] + n[1] * l + offset[1], p[2] + n[2] * l + offset[2]);
    _n.set(n[0], n[1], n[2]);
    _o.quaternion.setFromUnitVectors(_z, _n);
    _o.rotateZ(Math.floor(rnd() * 4) * (Math.PI / 2) + (rnd() - 0.5) * 0.3);
    _o.scale.set(sx, sy, sz);
    _o.updateMatrix();
    return _o.matrix.clone();
  });
}

const inFace = (p: [number, number, number]) => p[2] > 0.12 && Math.abs(p[0]) < 0.55 && p[1] > -0.98 && p[1] < 0.64;
const inEar = (p: [number, number, number]) => Math.abs(p[0]) > 0.58 && Math.abs(p[1] + 0.12) < 0.34 && p[2] < 0.1;

/* ------------------------------------------------------------------ */

const moved = (a: BustTarget, b: BustTarget) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y) + Math.abs(a.s - b.s) * 3 > 0.3;

export default function Bust({ theme, index, target, intensity, mouse, hovered, interactive, showLabel, lowPower, onHover, onSelect }: Props) {
  const root = useRef<THREE.Group>(null);
  const ringA = useRef<THREE.Mesh>(null);
  const ringB = useRef<THREE.Mesh>(null);
  const lightA = useRef<THREE.PointLight>(null);
  const lightB = useRef<THREE.PointLight>(null);
  const darkRef = useRef<THREE.InstancedMesh>(null);
  const glowRef = useRef<THREE.InstancedMesh>(null);

  // Estado de movimiento: cada propiedad es un amortiguador, así que acelera y frena sin tirones.
  const motion = useRef({
    x: new Damped(target.x),
    y: new Damped(target.y),
    z: new Damped(target.z),
    s: new Damped(0),
    ry: new Damped(target.ry),
    hov: new Damped(0),
    goal: target,
    pending: target,
    wait: 0,
  });

  const colA = useMemo(() => new THREE.Color(theme.a).multiplyScalar(2.2), [theme.a]);
  const colB = useMemo(() => new THREE.Color(theme.b).multiplyScalar(2.2), [theme.b]);

  const rimI = useMemo(() => ({ value: 1 }), []);
  const detail = lowPower ? { rings: 120, segs: 104 } : { rings: 220, segs: 192 };
  const faceted = theme.kind === "geo";

  const head = useMemo(() => (faceted ? getHead(index, 72, 64) : getHead(index, detail.rings, detail.segs)), [faceted, index, detail.rings, detail.segs]);
  const wire = useMemo(() => (theme.kind === "holo" ? getHead(index, 44, 40).geometry : null), [theme.kind, index]);
  const ear = getEar();
  const body = getBody();
  const earPos = useMemo(() => earAnchor(HEAD_VARIANTS[index % HEAD_VARIANTS.length]), [index]);

  const skin = useMemo(() => makeSkinTextures(theme.a, theme.b, theme.seed, lowPower ? 512 : 1024, lowPower ? 256 : 512), [theme.a, theme.b, theme.seed, lowPower]);
  const material = useMemo(() => makeBodyMaterial(theme, rimI, skin), [theme, rimI, skin]);

  useEffect(
    () => () => {
      material.dispose();
      skin.bump.dispose();
      skin.emissive.dispose();
    },
    [material, skin]
  );

  const { dark, glow } = useMemo(() => {
    const n = lowPower ? 0.5 : 1;
    const hd = head.data;
    const accept = (p: [number, number, number], nn: [number, number, number]) => !inFace(p) && !inEar(p) && nn[1] > -0.55;
    const off: [number, number, number] = [0, HEAD_Y, 0];

    const sh = body.shoulders.attributes;
    const shAccept = (_p: [number, number, number], nn: [number, number, number]) => nn[1] > -0.1;
    const plateSize = (r: () => number): [number, number, number] => [0.05 + r() * 0.17, 0.03 + r() * 0.11, 0.008 + r() * 0.022];
    const traceSize = (r: () => number): [number, number, number] => [0.12 + r() * 0.4, 0.012, 0.012];
    const lp = (d: number) => d * 0.5 - 0.004;

    const plates = [
      ...toMatrices(sampleSurface(hd.positions, hd.normals, hd.indices, Math.round(300 * n), theme.seed, accept), off, theme.seed + 1, plateSize, lp),
      ...toMatrices(
        sampleSurface(sh.position.array, sh.normal.array, body.shoulders.index!.array, Math.round(110 * n), theme.seed + 7, shAccept),
        [0, 0, 0], theme.seed + 2, plateSize, lp
      ),
    ];
    const traces = [
      ...toMatrices(sampleSurface(hd.positions, hd.normals, hd.indices, Math.round(120 * n), theme.seed + 13, accept), off, theme.seed + 3, traceSize, () => 0.004),
      ...toMatrices(
        sampleSurface(sh.position.array, sh.normal.array, body.shoulders.index!.array, Math.round(40 * n), theme.seed + 17, shAccept),
        [0, 0, 0], theme.seed + 4, traceSize, () => 0.004
      ),
    ];
    return { dark: plates, glow: traces };
  }, [head, body, theme.seed, lowPower]);

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

  useFrame((state, rawDt) => {
    const g = root.current;
    if (!g) return;
    const dt = clampDt(rawDt);
    const m = motion.current;

    // Cuando cambia la escena, cada busto arranca con un pequeño retraso (efecto escalonado).
    if (target !== m.pending) {
      m.wait = moved(target, m.goal) ? index * 0.07 : 0;
      m.pending = target;
    }
    if (m.goal !== m.pending) {
      m.wait -= dt;
      if (m.wait <= 0) m.goal = m.pending;
    }
    const tg = m.goal;

    const px = m.x.step(tg.x, 0.55, dt);
    const py = m.y.step(tg.y, 0.55, dt);
    const pz = m.z.step(tg.z, 0.6, dt);
    const ps = Math.max(0, m.s.step(tg.s, 0.6, dt));
    const pry = m.ry.step(tg.ry, 0.75, dt);
    const hov = m.hov.step(hovered ? 1 : 0, 0.22, dt);

    const s = ps * (1 + hov * 0.08);
    g.visible = s > 0.02;
    if (!g.visible) return;

    const t = state.clock.elapsedTime;
    const mo = mouse.current;
    g.position.set(px, py + Math.sin(t * 0.9 + index * 1.7) * 0.07 * Math.max(s, 0.4), pz);
    g.scale.setScalar(s);
    g.rotation.y = pry + mo.x * 0.5 + Math.sin(t * 0.35 + index) * 0.1 + hov * Math.sin(t * 1.4) * 0.05;
    g.rotation.x = -mo.y * 0.16 + hov * Math.sin(t * 1.1) * 0.015;

    if (ringA.current) ringA.current.rotation.z = t * 0.45 + index;
    if (ringB.current) ringB.current.rotation.z = -t * 0.3 + index;

    const I = intensity.current * (1 + hov * 1.3);
    rimI.value = 0.35 + 0.65 * Math.min(intensity.current, 1.1) + hov * 0.6;
    const sq = s * s; // compensa la caída de luz al escalar el grupo
    if (lightA.current) lightA.current.intensity = 34 * I * sq;
    if (lightB.current) lightB.current.intensity = 40 * I * sq;
  });

  const earRot = (sx: number): [number, number, number] => [-0.17, -sx * 0.32, sx * 0.04];

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
      {/* Cabeza, orejas, cuello y hombros */}
      <mesh geometry={head.geometry} material={material} position={[0, HEAD_Y, 0]} />
      {[-1, 1].map((sx) => (
        <mesh key={sx} geometry={ear} material={material} position={[sx * earPos[0], HEAD_Y + earPos[1], earPos[2]]} rotation={earRot(sx)} scale={[sx, 1, 1]} />
      ))}
      <mesh geometry={body.neck} material={material} />
      <mesh geometry={body.shoulders} material={material} />

      {/* Collar luminoso */}
      <mesh position={[0, -0.42, NECK_Z]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 0.9, 1]}>
        <torusGeometry args={[0.47, 0.03, 12, 56]} />
        <meshBasicMaterial color={colA} toneMapped={false} />
      </mesh>

      {/* Malla holográfica */}
      {wire && (
        <mesh geometry={wire} position={[0, HEAD_Y, 0]} scale={1.012}>
          <meshBasicMaterial color={colA} wireframe transparent opacity={0.16} toneMapped={false} depthWrite={false} />
        </mesh>
      )}

      {/* Anillos orbitales */}
      <mesh ref={ringA} position={[0, HEAD_Y, -0.1]} rotation={[Math.PI / 2.2, 0, 0]}>
        <torusGeometry args={[1.55, 0.01, 8, 128]} />
        <meshBasicMaterial color={colA} transparent opacity={0.7} toneMapped={false} />
      </mesh>
      <mesh ref={ringB} position={[0, HEAD_Y, -0.1]} rotation={[Math.PI / 3, 0.6, 0]}>
        <torusGeometry args={[1.95, 0.007, 8, 128]} />
        <meshBasicMaterial color={colB} transparent opacity={0.55} toneMapped={false} />
      </mesh>

      {/* Placas y circuitos en relieve sobre la superficie */}
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
