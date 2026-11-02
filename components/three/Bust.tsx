"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { Html, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import type { BustTheme } from "@/lib/theme";
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

/* ------------------------------------------------------------------ */
/* Escaneo 3D de una cabeza humana real                                */
/*   "Infinite" 3D Head Scan, Lee Perry-Smith (CC BY 3.0, triplegangers.com) */
/* ------------------------------------------------------------------ */

const BASE = "/models/head";
const HEAD_URL = `${BASE}/LeePerrySmith.glb`;
useGLTF.preload(HEAD_URL);

const HEAD_Y = 0.39; // altura del centro de la cabeza (para el halo)
const K = 0.53; // escala del escaneo → unidades de la escena (cabeza ≈ 2.6 de alto)
const CUT = -1.28; // por debajo de esta altura se descartan los triángulos (hombros)
const FADE_TOP = -0.95; // el cuello se apaga entre FADE_TOP y FADE_END, así el corte no se nota
const FADE_END = -1.25;

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

let headGeo: THREE.BufferGeometry | null = null;

/** Centra y escala el escaneo, quita los hombros y apaga el cuello hacia abajo (color de vértice). */
function prepareHead(src: THREE.BufferGeometry): THREE.BufferGeometry {
  if (headGeo) return headGeo;
  const g = src.clone();
  // Pivote en el eje del cuello: la cabeza gira sobre él, como una cabeza real.
  g.translate(0.08, -1.185, 0.1);
  g.scale(K, K, K);
  g.translate(0, 0.2, 0);

  const pos = g.attributes.position;
  const idx = g.index!.array;
  const keep: number[] = [];
  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t], b = idx[t + 1], c = idx[t + 2];
    if (Math.min(pos.getY(a), pos.getY(b), pos.getY(c)) >= CUT) keep.push(a, b, c);
  }
  g.setIndex(keep);

  const col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const f = smooth(FADE_END, FADE_TOP, pos.getY(i));
    col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = f;
  }
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  g.computeBoundingSphere();
  headGeo = g;
  return g;
}

interface SkinMaps {
  map: THREE.Texture;
  normal: THREE.Texture;
  spec: THREE.Texture;
}
let skinMaps: SkinMaps | null = null;
function getSkinMaps(): SkinMaps {
  if (!skinMaps) {
    const loader = new THREE.TextureLoader();
    const load = (file: string, srgb: boolean) => {
      const t = loader.load(`${BASE}/${file}`);
      t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      t.anisotropy = 8;
      return t;
    };
    skinMaps = {
      map: load("Map-COL.jpg", true),
      normal: load("Infinite-Level_02_Tangent_SmoothUV.jpg", false),
      spec: load("Map-SPEC.jpg", true),
    };
  }
  return skinMaps;
}

/* ------------------------------------------------------------------ */
/* Material de piel                                                    */
/* ------------------------------------------------------------------ */

/**
 * Luz de contorno (rim) por fresnel, inyectada como emisión: recorta la silueta con el borde
 * cálido/frío de la referencia sin depender de las luces de la escena. Se apaga junto con el cuello.
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
          float rf = pow(1.0 - saturate(dot(rn, normalize(vViewPosition))), 2.6);
          vec3 dA = normalize((viewMatrix * vec4(0.85, 0.55, -0.45, 0.0)).xyz);
          vec3 dB = normalize((viewMatrix * vec4(-0.9, 0.2, -0.35, 0.0)).xyz);
          float la = smoothstep(-0.1, 0.7, dot(rn, dA));
          float lb = smoothstep(-0.1, 0.7, dot(rn, dB));
          float fd = 1.0;
          #ifdef USE_COLOR
            fd = vColor.r;
          #endif
          totalEmissiveRadiance += (uRimA * la * 1.5 + uRimB * lb * 0.55) * rf * uRimI * fd;
        }`
      );
  };
  mat.customProgramCacheKey = () => "head-rim-v1";
}

function makeSkinMaterial(theme: BustTheme, rimI: { value: number }) {
  const m = getSkinMaps();
  const mat = new THREE.MeshPhysicalMaterial({
    color: theme.skin,
    map: m.map,
    normalMap: m.normal,
    normalScale: new THREE.Vector2(1.1, 1.1),
    specularColorMap: m.spec,
    specularIntensity: 1,
    metalness: 0,
    roughness: 0.52,
    clearcoat: 0.12,
    clearcoatRoughness: 0.45,
    sheen: 0.6, // vello suave de la piel
    sheenRoughness: 0.5,
    sheenColor: new THREE.Color("#ffb59a"),
    envMapIntensity: 0.9,
    vertexColors: true,
  });
  addRim(mat, new THREE.Color(theme.b), new THREE.Color(theme.a), rimI);
  return mat;
}

/** Halo difuso que se pega detrás de la cabeza: la luz cálida "rebotando" en el fondo. */
let glowTex: THREE.CanvasTexture | null = null;
function getGlow() {
  if (!glowTex) {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const g = c.getContext("2d")!;
    const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    gr.addColorStop(0, "rgba(255,255,255,1)");
    gr.addColorStop(0.35, "rgba(255,255,255,0.35)");
    gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr;
    g.fillRect(0, 0, 256, 256);
    glowTex = new THREE.CanvasTexture(c);
  }
  return glowTex;
}

/* ------------------------------------------------------------------ */

const moved = (a: BustTarget, b: BustTarget) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y) + Math.abs(a.s - b.s) * 3 > 0.3;

export default function Bust({ theme, index, target, intensity, mouse, hovered, interactive, showLabel, onHover, onSelect }: Props) {
  const root = useRef<THREE.Group>(null);
  const glowMat = useRef<THREE.SpriteMaterial>(null);
  const lightA = useRef<THREE.PointLight>(null);
  const lightB = useRef<THREE.PointLight>(null);
  const lightC = useRef<THREE.PointLight>(null);

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

  const rimI = useMemo(() => ({ value: 1 }), []);
  const gltf = useGLTF(HEAD_URL) as unknown as { nodes: Record<string, THREE.Mesh> };
  const geometry = useMemo(() => prepareHead(gltf.nodes.LeePerrySmith.geometry), [gltf]);
  const material = useMemo(() => makeSkinMaterial(theme, rimI), [theme, rimI]);
  const glow = useMemo(() => getGlow(), []);

  useEffect(() => () => material.dispose(), [material]);

  useFrame((state, rawDt) => {
    const g = root.current;
    if (!g) return;
    const dt = clampDt(rawDt);
    const m = motion.current;

    // Cuando cambia la escena, cada cabeza arranca con un pequeño retraso (efecto escalonado).
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
    g.position.set(px, py + Math.sin(t * 0.9 + index * 1.7) * 0.05 * Math.max(s, 0.4), pz);
    g.scale.setScalar(s);
    g.rotation.y = pry + mo.x * 0.5 + Math.sin(t * 0.35 + index) * 0.1 + hov * Math.sin(t * 1.4) * 0.05;
    g.rotation.x = -mo.y * 0.16 + hov * Math.sin(t * 1.1) * 0.015;

    const I = intensity.current * (1 + hov * 1.3);
    rimI.value = 0.35 + 0.65 * Math.min(intensity.current, 1.1) + hov * 0.6;
    const sq = s * s; // compensa la caída de luz al escalar el grupo
    if (lightA.current) lightA.current.intensity = 30 * I * sq; // luz principal suave, desde el frente
    if (lightB.current) lightB.current.intensity = 80 * I * sq; // contraluz cálido
    if (lightC.current) lightC.current.intensity = 18 * I * sq; // contraluz frío
    if (glowMat.current) glowMat.current.opacity = 0.2 * Math.min(intensity.current, 1.1) * (1 + hov * 0.9);
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
      <mesh geometry={geometry} material={material} scale={theme.shape} />

      {/* Halo cálido detrás de la cabeza */}
      <sprite position={[0.5, HEAD_Y, -1.4]} scale={[4.8, 4.8, 1]} raycast={() => null}>
        <spriteMaterial ref={glowMat} map={glow} color={theme.b} transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </sprite>

      {/* Iluminación propia: luz principal suave al frente, contraluz cálido (derecha) y frío (izquierda) */}
      <pointLight ref={lightA} color="#fff1e6" position={[-2.2, 1.6, 3]} intensity={30} decay={2} />
      <pointLight ref={lightB} color={theme.b} position={[2.6, 1.4, -2]} intensity={80} decay={2} />
      <pointLight ref={lightC} color={theme.a} position={[-2.8, 1.1, -2.2]} intensity={18} decay={2} />

      {showLabel && (
        <Html center position={[0, -1.6, 0]} style={{ pointerEvents: "none" }} zIndexRange={[5, 0]}>
          <div className={`bust-tag ${hovered ? "on" : ""}`} style={{ ["--c" as string]: theme.a }}>
            <span>ENTREVISTADO 0{index + 1}</span>
            <em>VER RESPUESTAS</em>
          </div>
        </Html>
      )}
    </group>
  );
}
