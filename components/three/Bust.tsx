"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { Html, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
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
/* Modelos GLB realistas (uno por entrevistado) con expresiones        */
/* ------------------------------------------------------------------ */

// Un modelo por entrevistado: E1 hombre con barba (Ready Player Me), E2 hombre rapado (Avaturn), E3 mujer (MPFB, CC0).
const URLS = ["/models/heads/entrevistado1.glb", "/models/heads/entrevistado2.glb", "/models/heads/entrevistado3.glb"];
URLS.forEach((u) => useGLTF.preload(u));

// Pequeños ajustes por entrevistado (multiplican las texturas del modelo; blanco = sin cambio).
const VARIANTS = [
  { skin: "#ffffff", hair: "#ffffff", scale: 1.0 },
  { skin: "#ffffff", hair: "#ffffff", scale: 1.0 },
  { skin: "#ffffff", hair: "#ffffff", scale: 1.0 },
];

const HEAD_Y = 0.39; // altura del centro de la cabeza (para el halo)
// Brillo que reciben las caras: 1 = original, menos = más oscuro (afecta la luz frontal y el ambiente).
const FACE_LIGHT = [0.4, 0.1, 0.5]; // uno por entrevistado (el 2 recibía demasiada luz)
const K = 11; // metros del modelo → unidades de la escena (cabeza ≈ 2.6 de alto)
const EYE_Y = 0.5; // altura de los ojos en la escena
const NECK_BACK = 0.085; // distancia de los ojos al eje del cuello (m): la cabeza gira sobre él

/** Huesos de los ojos en los tres modelos (Character Creator / Rigify / Avaturn). */
const EYE_BONE = /^(DEF_eye\.[LR]|LeftEye|RightEye|.*_[LR]_Eye)$/;

/** Cada canal expresivo con el nombre del morph en cada convención (CC4 / ARKit). */
const CHANNELS = {
  blinkL: ["Eye_Blink_L", "eyeBlinkLeft"],
  blinkR: ["Eye_Blink_R", "eyeBlinkRight"],
  squintL: ["Eye_Squint_L", "eyeSquintLeft"],
  squintR: ["Eye_Squint_R", "eyeSquintRight"],
  wideL: ["Eye_Wide_L", "eyeWideLeft"],
  wideR: ["Eye_Wide_R", "eyeWideRight"],
  smileL: ["Mouth_Smile_L", "mouthSmileLeft"],
  smileR: ["Mouth_Smile_R", "mouthSmileRight"],
  cheekL: ["Cheek_Raise_L", "cheekSquintLeft"],
  cheekR: ["Cheek_Raise_R", "cheekSquintRight"],
  browInL: ["Brow_Raise_Inner_L", "browInnerUp"],
  browInR: ["Brow_Raise_Inner_R"],
  browOutL: ["Brow_Raise_Outer_L", "browOuterUpLeft"],
  browOutR: ["Brow_Raise_Outer_R", "browOuterUpRight"],
} as const;
type Channel = keyof typeof CHANNELS;
type Pair = [THREE.Mesh, number];

interface Shared {
  uRimA: { value: THREE.Color };
  uRimB: { value: THREE.Color };
  uRimI: { value: number };
}

interface EyeRig {
  bone: THREE.Object3D;
  q0: THREE.Quaternion;
  A: THREE.Quaternion;
  Ainv: THREE.Quaternion;
}

interface Rig {
  object: THREE.Object3D;
  eyes: EyeRig[];
  pairs: Record<Channel, Pair[]>;
  mats: THREE.Material[];
}

/**
 * Luz de contorno (rim) por fresnel, inyectada como emisión. El apagado del cuello viene horneado
 * en el color de vértice del GLB (COLOR_0): oscurece la piel y también la luz de contorno.
 */
function patchMaterial(mat: THREE.Material, sh: Shared) {
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, sh);
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
  mat.customProgramCacheKey = () => "bust-glb-v2";
}

/** Clona el GLB, lo centra/escala, prepara materiales y localiza morphs y huesos de los ojos. */
function buildRig(source: THREE.Object3D, sh: Shared, index: number): Rig {
  const variant = VARIANTS[index % VARIANTS.length];
  const KK = K * variant.scale;
  const object = cloneSkinned(source);
  object.updateMatrixWorld(true);

  const eyes: EyeRig[] = [];
  const center = new THREE.Vector3();
  object.traverse((o) => {
    if (!EYE_BONE.test(o.name) || !o.parent) return;
    const A = new THREE.Quaternion();
    o.parent.getWorldQuaternion(A);
    eyes.push({ bone: o, q0: o.quaternion.clone(), A, Ainv: A.clone().invert() });
    center.add(o.getWorldPosition(new THREE.Vector3()));
  });
  if (eyes.length) center.divideScalar(eyes.length);
  else center.set(0, 1.6, 0.1);

  // Ojos a EYE_Y y eje del cuello en el origen: la cabeza gira sobre él.
  object.scale.setScalar(KK);
  object.position.set(-center.x * KK, EYE_Y - center.y * KK, -(center.z - NECK_BACK) * KK);

  const mats: THREE.Material[] = [];
  const morphMeshes: THREE.Mesh[] = [];
  object.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.raycast = () => {}; // el hover usa una malla proxy (el pelo tiene miles de triángulos)
    mesh.frustumCulled = false;
    const m = (mesh.material as THREE.MeshStandardMaterial).clone();
    const label = `${mesh.name} ${m.name}`;
    const count = mesh.geometry.attributes.position.count;
    // Pelo y pestañas: recorte por alfa (sin transparencia) para que no haya errores de orden.
    if (/lash/i.test(label) || (m.transparent && count > 1000 && !/AO|occlusion|tear/i.test(label))) {
      m.transparent = false;
      m.alphaTest = Math.max(m.alphaTest, 0.35);
      m.depthWrite = true;
      m.side = THREE.DoubleSide;
    }
    m.envMapIntensity = 0.9 * FACE_LIGHT[index % FACE_LIGHT.length];
    // Variaciones entre entrevistados: tono de piel y color de pelo/cejas.
    if (/^base$/i.test(mesh.name)) m.color.multiply(new THREE.Color(variant.skin));
    else if (/ponytail|hair|eyebrow|lash/i.test(label)) m.color.multiply(new THREE.Color(variant.hair));
    patchMaterial(m, sh);
    mesh.material = m;
    mats.push(m);
    if (mesh.morphTargetDictionary && mesh.morphTargetInfluences) morphMeshes.push(mesh);
  });

  const pairs = {} as Record<Channel, Pair[]>;
  (Object.keys(CHANNELS) as Channel[]).forEach((ch) => {
    pairs[ch] = [];
    for (const mesh of morphMeshes) {
      for (const name of CHANNELS[ch]) {
        const idx = mesh.morphTargetDictionary![name];
        if (idx !== undefined) pairs[ch].push([mesh, idx]);
      }
    }
  });
  return { object, eyes, pairs, mats };
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

interface Fx {
  nextBlink: number;
  blinkStart: number;
  nextSaccade: number;
  sx: number;
  sy: number;
  gx: number;
  gy: number;
  smile: number;
  brow: number;
  wide: number;
}

const damp = THREE.MathUtils.damp;
const dq = new THREE.Quaternion();
const eul = new THREE.Euler();

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

  // Estado de las expresiones (parpadeo, mirada, sonrisa, cejas).
  const fx = useRef<Fx>({
    nextBlink: 1 + index * 0.7,
    blinkStart: -10,
    nextSaccade: 0,
    sx: 0,
    sy: 0,
    gx: 0,
    gy: 0,
    smile: 0,
    brow: 0,
    wide: 0,
  });

  const rimI = useMemo(() => ({ value: 1 }), []);
  const shared = useMemo<Shared>(
    () => ({
      uRimA: { value: new THREE.Color(theme.b) },
      uRimB: { value: new THREE.Color(theme.a) },
      uRimI: rimI,
    }),
    [theme, rimI]
  );
  const gltf = useGLTF(URLS[index % URLS.length]);
  const rig = useMemo(() => buildRig(gltf.scene, shared, index), [gltf, shared]);
  const glow = useMemo(() => getGlow(), []);

  useEffect(() => () => rig.mats.forEach((m) => m.dispose()), [rig]);

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

    /* ---------------- Expresiones ---------------- */
    const f = fx.current;
    const put = (ch: Channel, v: number) => {
      for (const [mesh, i] of rig.pairs[ch]) mesh.morphTargetInfluences![i] = v;
    };

    // Parpadeo aleatorio (a veces doble).
    if (t >= f.nextBlink) {
      f.blinkStart = t;
      f.nextBlink = t + (Math.random() < 0.2 ? 0.32 : 2 + Math.random() * 4);
    }
    const bp = (t - f.blinkStart) / 0.17;
    const blink = bp >= 0 && bp <= 1 ? Math.pow(Math.sin(bp * Math.PI), 0.7) : 0;

    // Sonrisa y cejas: un fondo casi neutro que respira, y más expresivo con el cursor encima.
    const idle = 0.5 + 0.5 * Math.sin(t * 0.27 + index * 2.1);
    const smileT = 0.05 + idle * 0.05 + hov * 0.5;
    const browT = hov * 0.4 + Math.pow(Math.max(0, Math.sin(t * 0.45 + index * 1.3)), 8) * 0.35;
    const wideT = hov * 0.15;
    f.smile = damp(f.smile, smileT, 6, dt);
    f.brow = damp(f.brow, browT, 6, dt);
    f.wide = damp(f.wide, wideT, 6, dt);

    put("blinkL", blink);
    put("blinkR", blink);
    put("smileL", f.smile);
    put("smileR", f.smile);
    put("cheekL", f.smile * 0.5);
    put("cheekR", f.smile * 0.5);
    put("squintL", f.smile * 0.35);
    put("squintR", f.smile * 0.35);
    put("wideL", f.wide * (1 - blink));
    put("wideR", f.wide * (1 - blink));
    put("browInL", f.brow);
    put("browInR", f.brow);
    put("browOutL", f.brow * 0.6);
    put("browOutR", f.brow * 0.6);

    // Mirada: sigue al cursor con pequeños movimientos rápidos (sacadas) como un ojo real.
    if (t >= f.nextSaccade) {
      f.sx = (Math.random() - 0.5) * 0.12;
      f.sy = (Math.random() - 0.5) * 0.07;
      f.nextSaccade = t + 0.7 + Math.random() * 1.8;
    }
    f.gx = damp(f.gx, THREE.MathUtils.clamp(mo.x * 0.3 + f.sx, -0.45, 0.45), 12, dt);
    f.gy = damp(f.gy, THREE.MathUtils.clamp(mo.y * 0.2 + f.sy, -0.3, 0.3), 12, dt);
    dq.setFromEuler(eul.set(-f.gy, f.gx, 0));
    for (const e of rig.eyes) {
      // Rotación definida en el espacio del modelo y llevada al espacio local del hueso.
      e.bone.quaternion.copy(e.Ainv).multiply(dq).multiply(e.A).multiply(e.q0);
    }

    const I = intensity.current * (1 + hov * 1.3);
    rimI.value = 0.35 + 0.65 * Math.min(intensity.current, 1.1) + hov * 0.6;
    const sq = s * s; // compensa la caída de luz al escalar el grupo
    if (lightA.current) lightA.current.intensity = 30 * FACE_LIGHT[index % FACE_LIGHT.length] * I * sq;// luz principal suave, desde el frente
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
      <primitive object={rig.object} />

      {/* Zona de hover invisible: raycast barato en vez de recorrer la malla del pelo */}
      <mesh position={[0, 0.2, 0]} scale={[1.15, 1.6, 1.15]}>
        <sphereGeometry args={[1, 12, 10]} />
        <meshBasicMaterial visible={false} />
      </mesh>

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
