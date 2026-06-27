import { useAnimations, useGLTF } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import { MeshStandardMaterial } from "three";
import { setInteractive } from "../companion/petBridge";
import { useReactionStore } from "../reactions/reactionStore";

useGLTF.preload("/models/Armature.glb");
useGLTF.preload("/models/Poses.glb");

// A self-contained, backend-free avatar for the companion. Unlike the
// configurator's Avatar (which only renders PocketBase-provided assets), this
// renders the base body mesh directly so the character is always visible, then
// binds the Poses.glb clip library and crossfades to whatever pose the current
// reaction calls for.
export const CompanionAvatar = (props) => {
  const group = useRef();
  const { nodes } = useGLTF("/models/Armature.glb");
  const { animations } = useGLTF("/models/Poses.glb");
  const { actions } = useAnimations(animations, group);

  const pose = useReactionStore((s) => s.current.pose);

  // Give the base mesh a pleasant default skin so it reads even without the
  // customization backend. Cloned so we never mutate the shared GLTF cache.
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

  // Crossfade between poses whenever the reaction changes.
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

  // Hovering the character makes the Electron pet window solid (so you can grab
  // it); leaving returns to click-through. No-op in a browser tab.
  return (
    <group
      ref={group}
      {...props}
      dispose={null}
      onPointerOver={(e) => {
        e.stopPropagation();
        setInteractive(true);
        document.body.style.cursor = "grab";
      }}
      onPointerOut={() => {
        setInteractive(false);
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
