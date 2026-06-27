import { useAnimations, useGLTF } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import { LoopRepeat, MeshStandardMaterial } from "three";
import { useCharacterStore } from "../actions/characterStore";
import { usePreviewStore } from "./previewStore";

// Self-contained, backend-free avatar. Renders the base body mesh directly so
// the character is always visible (no PocketBase asset catalog needed), binds
// the Poses.glb clip library, and crossfades to whatever pose the current action
// calls for. Model URLs are injected by the host so the package owns no asset
// paths; `onActivity` lets the host react to hover (e.g. the desktop pet toggles
// click-through) without the core knowing anything about the shell.
//
// It also drives live preview: when the preview store holds a clip (an imported
// FBX/GLB), it plays that clip on the same mixer, overriding the event-driven
// pose until preview is cleared.
export const Character = ({ armatureUrl, posesUrl, onActivity, ...props }) => {
  const group = useRef();
  const { nodes } = useGLTF(armatureUrl);
  const { animations } = useGLTF(posesUrl);
  const { actions, mixer } = useAnimations(animations, group);

  const pose = useCharacterStore((s) => s.current.pose);
  const previewClip = usePreviewStore((s) => s.clip);

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

  // Event-driven pose playback — suspended while a preview clip owns the mixer.
  const poseActionRef = useRef(null);
  useEffect(() => {
    if (previewClip) return;
    const next = actions[pose] || actions.Idle;
    if (!next) return;
    next.reset().fadeIn(0.25).play();
    if (poseActionRef.current && poseActionRef.current !== next) {
      poseActionRef.current.fadeOut(0.25);
    }
    poseActionRef.current = next;
  }, [actions, pose, previewClip]);

  // Live preview overrides the pose. Loops the imported clip until cleared, then
  // the effect above resumes the current pose (previewClip → null re-runs it).
  useEffect(() => {
    if (!previewClip || !mixer) return;
    const action = mixer.clipAction(previewClip, group.current);
    action.reset().setLoop(LoopRepeat, Infinity).fadeIn(0.3).play();
    poseActionRef.current?.fadeOut(0.3);
    return () => {
      action.fadeOut(0.3);
      setTimeout(() => {
        action.stop();
        mixer.uncacheAction?.(previewClip, group.current);
      }, 350);
    };
  }, [previewClip, mixer]);

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
