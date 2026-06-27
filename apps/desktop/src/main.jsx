import { CharacterCanvas, createCharacterBus } from "@companion/character-core";
import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { initPet, interactive, setInteractive } from "./petBridge";

// Desktop renderer. It owns one bus and feeds it from the Electron main process
// through the preload bridge; the character-core runtime turns those events into
// performances. The renderer opens no socket of its own — main owns the gateway
// connection (see electron/main.cjs) and pushes events here.
const bus = createCharacterBus();

// Models ship with the desktop app (public/models). character-core stays
// asset-path-agnostic; the host points it at the files.
const MODELS = {
  armatureUrl: "/models/Armature.glb",
  posesUrl: "/models/Poses.glb",
};

function App() {
  const [connection, setConnection] = useState("offline");
  const params = new URLSearchParams(location.search);

  useEffect(() => {
    // Pin (click-through) on spawn so the pet doesn't grab the cursor.
    initPet();

    // Preload → bus. Every notification the main process receives lands here.
    const offEvent = window.pet?.onEvent((event) => bus.publish(event));
    const offStatus = window.pet?.onGatewayStatus((status) => setConnection(status));
    return () => {
      offEvent?.();
      offStatus?.();
    };
  }, []);

  return (
    <CharacterCanvas
      bus={bus}
      models={MODELS}
      connection={connection}
      showPanel={!params.has("nopanel")}
      onActivity={setInteractive} // hover character → window solid
      hudInteractive={interactive} // HUD doubles as a drag handle in the pet
    />
  );
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
