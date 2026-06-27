import { ContactShadows, Environment, Float } from "@react-three/drei";
import { CompanionAvatar } from "../components/CompanionAvatar";
import { useReactionStore } from "../reactions/reactionStore";

// Lean scene for the companion: no ground plane (so it can float on a
// transparent desktop window), soft key/fill/rim lights tinted to match the
// configurator's look, a contact shadow for grounding, and a gentle idle bob
// that calms down while a reaction is performing.
export const CompanionScene = () => {
  const playing = useReactionStore((s) => s.playing);

  return (
    <>
      <Environment preset="sunset" environmentIntensity={0.35} />

      <directionalLight position={[5, 6, 5]} intensity={2.2} castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-0.0001} />
      <directionalLight position={[-5, 5, 5]} intensity={0.6} />
      <directionalLight position={[3, 3, -5]} intensity={4} color="#ff3b3b" />
      <directionalLight position={[-3, 3, -5]} intensity={5} color="#3cb1ff" />

      <Float floatIntensity={playing ? 0.15 : 0.6} rotationIntensity={playing ? 0.05 : 0.25} speed={playing ? 1.5 : 2.5}>
        <CompanionAvatar position-y={-0.9} />
      </Float>

      <ContactShadows position={[0, -0.92, 0]} opacity={0.5} scale={6} blur={2.4} far={3} color="#000000" />
    </>
  );
};
