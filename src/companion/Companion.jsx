import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect } from "react";
import { CompanionHUD } from "../components/CompanionHUD";
import { DevTriggerPanel } from "../components/DevTriggerPanel";
import { NotificationCard } from "../components/NotificationCard";
import { ReactionFX } from "../components/ReactionFX";
import { CompanionScene } from "./CompanionScene";
import { initPet } from "./petBridge";
import { usePetEvents } from "./usePetEvents";

// Root of the desktop-pet companion. Transparent canvas (so an Electron
// always-on-top window shows only the character + effects), with DOM overlay
// layers on top. Notification events arrive from the Electron main process
// through the preload bridge; see usePetEvents.
//
// Query flags:
//   ?nopanel  hide the dev trigger panel (clean pet mode)
export const Companion = () => {
  const params = new URLSearchParams(location.search);

  // Events arrive only through the preload bridge (gateway → main → preload).
  // In a plain browser tab the dev panel drives reactions directly.
  usePetEvents();

  // In the Electron pet, start click-through so the window doesn't grab the
  // cursor; hovering the character or UI makes it interactive again.
  useEffect(() => initPet(), []);

  return (
    <>
      <Canvas
        camera={{ position: [0, 0.35, 4.6], fov: 38 }}
        gl={{ alpha: true, preserveDrawingBuffer: true, antialias: true }}
        style={{ position: "fixed", inset: 0 }}
      >
        <Suspense fallback={null}>
          <CompanionScene />
        </Suspense>
      </Canvas>

      <ReactionFX />
      <NotificationCard />
      <CompanionHUD />
      {!params.has("nopanel") && <DevTriggerPanel />}
    </>
  );
};
