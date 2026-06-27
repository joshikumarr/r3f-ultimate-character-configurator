import { useAnimations, useGLTF } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import { MeshStandardMaterial } from "three";
import { useCharacterStore } from "../actions/characterStore";

// Self-contained, backend-free avatar. Renders the base body mesh directly so
// the character is always visible (no PocketBase asset catalog needed), binds
// the Poses.glb clip library, and crossfades to whatever pose the current action
// calls for. Model URLs are injected by the host so the package owns no asset
// paths; `onActivity` lets the host react to hover (e.g. the desktop pet toggles
// click-through) without the core knowing anything about the shell.
export const Character = ({ armatureUrl, posesUrl, onActivity, ...props }) => {
  const group = useRef();
  const { nodes } = useGLTF(armatureUrl);
  const { animations } = useGLTF(posesUrl);
  const { actions } = useAnimations(animations, group);

  const pose = useCharacterStore((s) => s.current.pose);

  // Give the base mesh a pleasant default skin so it reads on its own. Cloned so
  // we never mutate the shared GLTF cache.
  const skin = useMemo(
    () => new MeshStandardMaterial({ color: 0xf5c6a5, roughness: 0.9 }),
    []
  );
  useEffect(() => {
    const mesh = nodes.Plane;
    if (mesh) {
      mesh.material = skin;
      mesh.castShadow = true;
    }
  }, [nodes, skin]);

  // Crossfade between poses whenever the action changes.
  const prev = useRef(null);
  useEffect(() => {
    const next = actions[pose] || actions.Idle;
    if (!next) return;
    next.reset().fadeIn(0.25).play();
    if (prev.current && prev.current !== next) {
      prev.current.fadeOut(0.25);
    }
    prev.current = next;
  }, [actions, pose]);

  return (
    <group
      ref={group}
      {...props}
      dispose={null}
      onPointerOver={(e) => {
        e.stopPropagation();
        onActivity?.(true);
        document.body.style.cursor = "grab";
      }}
      onPointerOut={() => {
        onActivity?.(false);
        document.body.style.cursor = "auto";
      }}
    >
      <group name="Scene">
        <group name="Armature" rotation={[Math.PI / 2, 0, 0]} scale={0.01}>
          {nodes.mixamorigHips && <primitive object={nodes.mixamorigHips} />}
          {nodes.Plane && <primitive object={nodes.Plane} />}
        </group>
      </group>
    </group>
  );
};
