import { interactive } from "../companion/petBridge";
import { useReactionStore } from "../reactions/reactionStore";

const DOT = { offline: "#ff5a5a", connecting: "#ffcf4a", online: "#3cff9a" };

// Minimal always-on overlay: connection status + level/XP progress. Kept tiny so
// it works inside the small desktop-pet window as well as full screen.
export const CompanionHUD = () => {
  const level = useReactionStore((s) => s.level);
  const connection = useReactionStore((s) => s.connection);
  const progress = useReactionStore((s) => s.xpProgress());

  return (
    <div
      {...interactive}
      style={{
        position: "fixed",
        top: 14,
        left: 14,
        WebkitAppRegion: "drag", // drag handle to move the desktop pet
        cursor: "grab",
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "6px 10px",
        borderRadius: 999,
        background: "rgba(18,16,40,0.7)",
        backdropFilter: "blur(6px)",
        color: "#f3f1ff",
        fontFamily: "system-ui, sans-serif",
        fontSize: 12,
        zIndex: 40,
        userSelect: "none",
      }}
      title={`Gateway: ${connection}`}
    >
      <span style={{ width: 8, height: 8, borderRadius: 8, background: DOT[connection] || "#888" }} />
      <span style={{ fontWeight: 700 }}>Lv {level}</span>
      <span style={{ position: "relative", width: 70, height: 6, borderRadius: 6, background: "#ffffff22" }}>
        <span
          style={{
            position: "absolute",
            inset: 0,
            width: `${Math.round(progress * 100)}%`,
            borderRadius: 6,
            background: "linear-gradient(90deg,#8b8bff,#ff7ec8)",
            transition: "width .4s ease",
          }}
        />
      </span>
    </div>
  );
};
