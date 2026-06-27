# Reactive Character Companion — Design & MVP

A 3D animated character that reacts to your notifications. A deploy succeeds and
it throws on shades to a Matrix code-rain; a passive-aggressive email from your
boss and an angry bird gets launched at the toast; you finish a task and confetti
goes off. External apps (GitHub Actions, Slack, email rules, any MCP client)
drive it through a single notification endpoint.

Built on top of the R3F Ultimate Character Configurator — it reuses that rig and
its `Poses.glb` clip library.

---

## Architecture

```
 ┌──────────────┐   POST /notify   ┌───────────────┐   WS broadcast   ┌──────────────┐   IPC      ┌────────────┐
 │ GitHub Action │ ───────────────▶ │               │ ───────────────▶ │ Electron main │ ────────▶ │  renderer   │
 │ Slack / email │                  │   Gateway     │                  │ (WS client +  │  preload  │ (React/R3F) │
 │ MCP client    │ ──(MCP tool)──▶  │  HTTP + WS    │                  │  pet window)  │           │  character  │
 └──────────────┘   via MCP server  └───────────────┘                  └──────────────┘           └────────────┘
```

One ingress (`/notify`), one fan-out (WS). The **renderer never opens a socket** —
in the desktop pet the Electron *main* process owns the single gateway
connection and pushes events to the character through the preload bridge. This
keeps connection logic in one place and lets the window do native things later
(reposition, OS-notification hooks, etc.).

### The event envelope (`src/reactions/schema.js`)

Every source is normalized into one shape so the reaction logic is source-blind:

```jsonc
{
  "id": "evt_…", "source": "github|slack|email|manual|mcp|system",
  "kind": "deploy_succeeded|ci_failed|task_completed|email_received|mention|…",
  "sentiment": "positive|negative|neutral|urgent",  // inferred if omitted
  "intensity": 0.0-1.0, "actor": "boss|ci-bot|…",
  "title": "…", "body": "…", "ts": 0, "meta": {}
}
```

`normalizeEvent()` is tolerant: missing fields fall back to defaults so a
half-configured webhook still animates the character. Only `kind` really matters,
and unknown kinds still map to a sensible default.

### Reactions (`src/reactions/rules.js`)

A **Reaction = pose + 2D VFX + timing + theme**, all data so new ones are trivial
to add as the character "evolves". `classify(event)` maps an event to a reaction
id (most-specific rule wins; sentiment is inferred from the text when not given).

| Reaction   | Pose (Poses.glb) | VFX        | Triggered by                              |
|------------|------------------|------------|-------------------------------------------|
| celebrate  | King             | confetti   | task_completed, pr_approved, ci_passed    |
| matrix     | Cool             | code-rain  | deploy_succeeded                          |
| angry      | Punch            | projectile | email_received · negative · from boss     |
| wink       | Chill            | hearts     | email_received · positive                 |
| facepalm   | Dram             | rain cloud | ci_failed, deploy_failed, changes req.    |
| alert      | Ninja            | pulse ring | mention / urgent                          |
| think      | Busy             | thought    | neutral / unknown                         |
| idle       | Idle             | —          | resting state                             |

VFX are a 2D canvas overlay (`ReactionFX.jsx`) — no new 3D assets needed for the
MVP, which keeps the existing Bloom look intact.

### Reaction store (`src/reactions/reactionStore.js`)

One reaction plays at a time; bursts queue so a flurry of notifications becomes a
little performance instead of a flicker, then the character settles back to Idle.
Each reaction grants XP → levels, which will gate fancier VFX later.

---

## Components

| Path | Role |
|------|------|
| `src/reactions/*` | Framework-agnostic core: schema, rules, store (shared by browser **and** Node). |
| `src/components/CompanionAvatar.jsx` | Backend-free avatar — renders the base mesh directly and plays reaction poses. |
| `src/components/ReactionFX.jsx` | 2D canvas particle layer (confetti, matrix, projectile, …). |
| `src/components/NotificationCard.jsx` / `CompanionHUD.jsx` / `DevTriggerPanel.jsx` | DOM overlays: the toast, level/connection HUD, demo triggers. |
| `src/companion/Companion.jsx` | Overlay app root (transparent canvas + overlays). |
| `src/companion/usePetEvents.js` | Consumes events from the preload bridge. |
| `src/companion/petBridge.js` | Click-through / interactivity bridge to Electron. |
| `server/gateway.mjs` | HTTP `/notify` + WS broadcast. |
| `mcp/server.mjs` | MCP server exposing `send_character_notification`. |
| `electron/main.cjs` / `preload.cjs` | Transparent always-on-top pet window; owns the gateway socket. |
| `.github/workflows/notify-character.yml` | Sample: CI result → reaction. |

---

## Running it

```bash
npm install                 # first time (downloads Electron)

npm run gateway             # 1) start the notification gateway  (:8787)
npm run pet:dev             # 2) vite + the Electron desktop pet
# …or browser-only demo:
npm run demo                # gateway + vite; open /overlay.html and use the panel
```

Fire a test reaction from anywhere:

```bash
curl -X POST localhost:8787/notify -H 'content-type: application/json' \
  -d '{"source":"github","kind":"deploy_succeeded","title":"Prod deploy ✅"}'
```

**Desktop pet controls:** `Ctrl/Cmd+Shift+P` pin/unpin (click-through),
`Ctrl/Cmd+Shift+H` hide/show. Hover the character or drag the HUD pill to move it.

### MCP wiring (GitHub / Slack / editor agents)

```jsonc
{ "command": "node", "args": ["mcp/server.mjs"],
  "env": { "GATEWAY_URL": "http://localhost:8787" } }
```

Tools: `send_character_notification` (the main entry point) and `list_reactions`.

---

## Roadmap (post-MVP)

1. **Evolution** — XP unlocks new poses/VFX tiers; cosmetics from the configurator.
2. **Bespoke 3D animations** — jump, wave, ride/bounce on the toast, fire the bird.
3. **Native notification taps** — read OS notifications directly (macOS/Windows).
4. **Source adapters** — first-class Slack/Gmail/Linear apps over the same `/notify`.
5. **User-editable rules** — drag-to-map events → reactions in the UI.
6. **Multiplayer** — companions reacting to a team's shared event stream.
```
