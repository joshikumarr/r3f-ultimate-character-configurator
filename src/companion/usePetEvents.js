import { useEffect } from "react";
import { useReactionStore } from "../reactions/reactionStore";
import { inPet } from "./petBridge";

// The renderer's only event source. The Electron main process owns the single
// gateway socket and forwards every notification event (and connection status)
// through the preload bridge; here we feed them into the reaction store so the
// character reacts. No-op in a plain browser tab (no preload) — there the dev
// trigger panel drives reactions directly.
export function usePetEvents() {
  useEffect(() => {
    if (!inPet) return;
    const setConnection = useReactionStore.getState().setConnection;

    const offEvent = window.pet.onEvent((event) => {
      useReactionStore.getState().trigger(event);
    });
    const offStatus = window.pet.onGatewayStatus((status) => setConnection(status));

    return () => {
      offEvent?.();
      offStatus?.();
    };
  }, []);
}
