import { CharacterCanvas, createCharacterBus } from "@companion/character-core";
import { StrictMode, useCallback, useEffect, useState } from "react";
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
  const [library, setLibrary] = useState([]);
  const params = new URLSearchParams(location.search);

  // Pose library manifest (written by `npm run add-pose` / Save to library).
  const loadLibrary = useCallback(async () => {
    try {
      const res = await fetch("/models/poses/poses.json", { cache: "no-store" });
      if (!res.ok) return;
      const list = await res.json();
      setLibrary(list.map((p) => ({ name: p.name, url: `/models/poses/${p.file}` })));
    } catch {
      /* no library yet — fine */
    }
  }, []);

  useEffect(() => {
    initPet();
    loadLibrary();

    const offEvent = window.pet?.onEvent((event) => bus.publish(event));
    const offStatus = window.pet?.onGatewayStatus((status) => setConnection(status));
    return () => {
      offEvent?.();
      offStatus?.();
    };
  }, [loadLibrary]);

  // Persist a previewed FBX/GLB into the library via the main-process converter.
  const onSavePose = window.pet?.convertPose
    ? async (file, name) => {
        if (!file?.path) throw new Error("File path unavailable (drag the file into the window).");
        await window.pet.convertPose({ path: file.path, name });
        await loadLibrary();
      }
    : undefined;

  return (
    <CharacterCanvas
      bus={bus}
      models={MODELS}
      connection={connection}
      showPanel={!params.has("nopanel")}
      showStudio={!params.has("nopanel")}
      library={library}
      onSavePose={onSavePose}
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
