# Lanyard 3D physique — à activer APRÈS le lancement

> La page `/lien` tourne aujourd'hui avec `LanyardCard.tsx` (carte CSS recto/verso
> qui se balance et se retourne, **zéro dépendance, zéro asset**). Ce fichier
> explique comment passer au **vrai Lanyard 3D physique** (React Bits) une fois
> que tu auras le temps et l'asset `card.glb`. Tant que ces 2 bloqueurs ne sont
> pas levés, **ne touche à rien** : le site doit rester en ligne.

## Pourquoi ce n'est pas activé dès maintenant

1. **Asset obligatoire manquant.** Le Lanyard charge un modèle 3D `card.glb`
   via `useGLTF`. Sans ce fichier, la page **crash** (Suspense qui throw).
   Tu ne l'as pas encore. Il faut soit modéliser la carte, soit récupérer
   l'asset fourni par React Bits (`card.glb` + `lanyard.png`).
2. **Poids + risque build.** Ça ajoute 5 grosses libs (dont du WASM physique)
   sur ton **site commercial principal**, à la veille de la mise en ligne.
   Pas le bon moment pour prendre ce risque.

## Étapes d'activation (post-lancement)

### 1. Installer les dépendances (dans apps/vena)

```bash
npm install three @react-three/fiber @react-three/drei @react-three/rapier meshline --workspace apps/vena
npm install -D @types/three --workspace apps/vena
```

### 2. Déposer les assets

- `apps/vena/public/lien/card.glb` (le modèle de la carte)
- `apps/vena/public/lien/lanyard.png` (la texture de la lanière)

### 3. Config Next.js / Turbopack pour les .glb

Dans `apps/vena/next.config.js`, autoriser le chargement des `.glb` comme
ressources statiques (drei `useGLTF` les charge via une URL `/lien/card.glb`,
donc en général **rien à configurer** : il suffit que le fichier soit dans
`/public`). Si tu importes le `.glb` en module (`import card from './card.glb'`),
là il faudra une règle webpack/turbopack — préfère la version URL `/lien/card.glb`.

### 4. Créer le composant client `Lanyard3D.tsx`

Code de référence (adapté React Bits, à coller dans `components/Lanyard3D.tsx`) :

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { Canvas, extend, useFrame } from "@react-three/fiber";
import { useGLTF, useTexture, Environment, Lightformer } from "@react-three/drei";
import {
  BallCollider,
  CuboidCollider,
  Physics,
  RigidBody,
  useRopeJoint,
  useSphericalJoint,
} from "@react-three/rapier";
import { MeshLineGeometry, MeshLineMaterial } from "meshline";
import * as THREE from "three";

extend({ MeshLineGeometry, MeshLineMaterial });

// chemins vers les assets dans /public
const GLB = "/lien/card.glb";
const TEX = "/lien/lanyard.png";

export default function Lanyard3D() {
  return (
    <div className="w-full h-full">
      <Canvas camera={{ position: [0, 0, 13], fov: 25 }}>
        <ambientLight intensity={Math.PI} />
        <Physics gravity={[0, -40, 0]} timeStep={1 / 60}>
          <Band />
        </Physics>
        <Environment blur={0.75}>
          <Lightformer intensity={2} position={[0, -1, 5]} scale={[100, 0.1, 1]} />
        </Environment>
      </Canvas>
    </div>
  );
}

function Band() {
  const band = useRef<any>(null);
  const fixed = useRef<any>(null);
  const j1 = useRef<any>(null);
  const j2 = useRef<any>(null);
  const j3 = useRef<any>(null);
  const card = useRef<any>(null);

  const vec = new THREE.Vector3();
  const ang = new THREE.Vector3();
  const rot = new THREE.Vector3();
  const dir = new THREE.Vector3();

  const segmentProps = { type: "dynamic" as const, canSleep: true, angularDamping: 2, linearDamping: 2 };
  const { nodes, materials } = useGLTF(GLB) as any;
  const texture = useTexture(TEX);

  const [dragged, setDragged] = useState<false | THREE.Vector3>(false);
  const [hovered, setHovered] = useState(false);

  const [curve] = useState(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(),
        new THREE.Vector3(),
        new THREE.Vector3(),
        new THREE.Vector3(),
      ]),
  );

  useRopeJoint(fixed, j1, [[0, 0, 0], [0, 0, 0], 1]);
  useRopeJoint(j1, j2, [[0, 0, 0], [0, 0, 0], 1]);
  useRopeJoint(j2, j3, [[0, 0, 0], [0, 0, 0], 1]);
  useSphericalJoint(j3, card, [[0, 0, 0], [0, 1.45, 0]]);

  useEffect(() => {
    if (hovered) {
      document.body.style.cursor = dragged ? "grabbing" : "grab";
      return () => { document.body.style.cursor = "auto"; };
    }
  }, [hovered, dragged]);

  useFrame((state, delta) => {
    if (dragged && typeof dragged !== "boolean") {
      vec.set(state.pointer.x, state.pointer.y, 0.5).unproject(state.camera);
      dir.copy(vec).sub(state.camera.position).normalize();
      vec.add(dir.multiplyScalar(state.camera.position.length()));
      card.current?.setNextKinematicTranslation({
        x: vec.x - dragged.x,
        y: vec.y - dragged.y,
        z: vec.z - dragged.z,
      });
    }
    if (fixed.current) {
      [j1, j2].forEach((ref) => {
        if (!ref.current.lerped)
          ref.current.lerped = new THREE.Vector3().copy(ref.current.translation());
        const dist = Math.max(0.1, Math.min(1, ref.current.lerped.distanceTo(ref.current.translation())));
        ref.current.lerped.lerp(ref.current.translation(), delta * (10 + dist * 8));
      });
      curve.points[0].copy(j3.current.translation());
      curve.points[1].copy(j2.current.lerped);
      curve.points[2].copy(j1.current.lerped);
      curve.points[3].copy(fixed.current.translation());
      band.current.geometry.setPoints(curve.getPoints(32));
      ang.copy(card.current.angvel());
      rot.copy(card.current.rotation());
      card.current.setAngvel({ x: ang.x, y: ang.y - rot.y * 0.25, z: ang.z });
    }
  });

  curve.curveType = "chordal";

  return (
    <>
      <group position={[0, 4, 0]}>
        <RigidBody ref={fixed} {...segmentProps} type="fixed" />
        <RigidBody position={[0.5, 0, 0]} ref={j1} {...segmentProps}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody position={[1, 0, 0]} ref={j2} {...segmentProps}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody position={[1.5, 0, 0]} ref={j3} {...segmentProps}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody position={[2, 0, 0]} ref={card} {...segmentProps} type={dragged ? "kinematicPosition" : "dynamic"}>
          <CuboidCollider args={[0.8, 1.125, 0.01]} />
          <group
            scale={2.25}
            position={[0, -1.2, -0.05]}
            onPointerOver={() => setHovered(true)}
            onPointerOut={() => setHovered(false)}
            onPointerUp={(e: any) => { e.target.releasePointerCapture(e.pointerId); setDragged(false); }}
            onPointerDown={(e: any) => {
              e.target.setPointerCapture(e.pointerId);
              setDragged(new THREE.Vector3().copy(e.point).sub(vec.copy(card.current.translation())));
            }}
          >
            <mesh geometry={nodes.card.geometry}>
              <meshPhysicalMaterial map={materials.base.map} clearcoat={1} clearcoatRoughness={0.15} roughness={0.3} metalness={0.5} />
            </mesh>
            <mesh geometry={nodes.clip.geometry} material={materials.metal} />
            <mesh geometry={nodes.clamp.geometry} material={materials.metal} />
          </group>
        </RigidBody>
      </group>
      <mesh ref={band}>
        {/* @ts-expect-error meshline custom element */}
        <meshLineGeometry />
        {/* @ts-expect-error meshline custom element */}
        <meshLineMaterial color="#414C35" depthTest={false} resolution={[1000, 1000]} useMap map={texture} repeat={[-3, 1]} lineWidth={1} />
      </mesh>
    </>
  );
}

useGLTF.preload(GLB);
```

### 5. Brancher dans la page

Dans `app/lien/LienClient.tsx`, remplacer `<LanyardCard />` par un import
dynamique **sans SSR** (le 3D ne doit tourner que côté client) :

```tsx
import dynamic from "next/dynamic";
const Lanyard3D = dynamic(() => import("@/components/Lanyard3D"), { ssr: false });
// ...puis <Lanyard3D /> à la place de <LanyardCard /> sur desktop.
```

> **Garde `LanyardCard` en fallback mobile** : le 3D physique sur petit écran
> est lourd et peu maniable. La consigne d'origine était d'ailleurs : mobile =
> carte simple + nav verticale sans effet.
