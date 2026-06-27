import { create } from "zustand";
import { normalizeEvent } from "./schema";
import { reactionFor, REACTIONS, levelFromXp, xpForLevel } from "./rules";

// Drives the companion. One reaction plays at a time; incoming events queue so a
// burst of notifications becomes a little performance instead of a flicker. When
// the queue drains the character settles back into Idle.

const IDLE = { ...REACTIONS.idle, event: null, sentiment: "neutral" };
const MAX_QUEUE = 8; // burst guard — drop the oldest beyond this
const MAX_HISTORY = 30;

let playTimer = null;

export const useReactionStore = create((set, get) => ({
  current: IDLE, // reaction object currently performing
  playing: false, // true while a non-idle reaction is on screen
  queue: [], // reaction objects waiting their turn
  history: [], // recent events, newest first (for the feed/debug)
  xp: 0,
  level: 1,
  connection: "offline", // 'offline' | 'connecting' | 'online'
  setConnection: (connection) => set({ connection }),

  /** Public entry point. Accepts a raw payload from anywhere and enqueues it. */
  trigger: (rawEvent) => {
    const event = normalizeEvent(rawEvent);
    const reaction = reactionFor(event);

    set((s) => ({
      history: [event, ...s.history].slice(0, MAX_HISTORY),
    }));

    if (get().playing) {
      set((s) => ({ queue: [...s.queue, reaction].slice(-MAX_QUEUE) }));
    } else {
      get()._play(reaction);
    }
    return reaction;
  },

  /** Internal: start performing a reaction and schedule the return to idle. */
  _play: (reaction) => {
    if (playTimer) clearTimeout(playTimer);
    set((s) => {
      const xp = s.xp + (reaction.xp || 0);
      return {
        current: reaction,
        playing: reaction.id !== "idle",
        xp,
        level: levelFromXp(xp),
      };
    });
    if (reaction.id === "idle" || !reaction.durationMs) return;
    playTimer = setTimeout(() => get()._advance(), reaction.durationMs);
  },

  /** Internal: pop the next queued reaction, or settle into idle. */
  _advance: () => {
    const { queue } = get();
    if (queue.length) {
      const [next, ...rest] = queue;
      set({ queue: rest });
      get()._play(next);
    } else {
      set({ current: IDLE, playing: false });
    }
  },

  /** Force-stop everything and return to idle (used by the UI). */
  reset: () => {
    if (playTimer) clearTimeout(playTimer);
    set({ current: IDLE, playing: false, queue: [] });
  },

  // Selectors as helpers
  xpProgress: () => {
    const { level, xp } = get();
    const floor = xpForLevel(level);
    const ceil = xpForLevel(level + 1);
    return ceil === floor ? 1 : (xp - floor) / (ceil - floor);
  },
}));

// Convenience for non-React callers (gateway client, dev console).
export const triggerReaction = (event) => useReactionStore.getState().trigger(event);
