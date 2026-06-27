// Electron desktop-pet shell.
//
// A frameless, transparent, always-on-top window that renders the companion
// (overlay.html) so the character literally lives on your desktop and reacts on
// top of everything. Connects to the gateway over WS exactly like the browser.
//
//   npm run gateway          # start the notification gateway
//   npm run pet:dev          # vite dev server + this window
//   npm run pet              # build, then this window (production)
//
// Global shortcut  Ctrl/Cmd+Shift+P  toggles "click-through" mode: when pinned,
// mouse events pass through the transparent areas to the apps underneath.

const { app, BrowserWindow, globalShortcut, ipcMain, screen } = require("electron");
const path = require("node:path");
const WebSocket = require("ws");

const DEV_URL = process.env.VITE_DEV_SERVER_URL; // set by npm run pet:dev
const GATEWAY_WS = process.env.GATEWAY_WS || "ws://localhost:8787";
const WIDTH = 380;
const HEIGHT = 520;

let win;
let clickThrough = false;

function createWindow() {
  const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize;

  win = new BrowserWindow({
    width: WIDTH,
    height: HEIGHT,
    x: sw - WIDTH - 24,
    y: sh - HEIGHT - 24,
    transparent: true,
    frame: false,
    resizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    hasShadow: false,
    fullscreenable: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
    },
  });

  win.setAlwaysOnTop(true, "screen-saver");
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  // In pet mode we hide the dev panel for a clean character; events come from
  // the gateway. Drop `nopanel` if you want the in-window demo buttons.
  const query = "?nopanel";
  if (DEV_URL) {
    win.loadURL(`${DEV_URL}/overlay.html${query}`);
  } else {
    win.loadFile(path.join(__dirname, "..", "dist", "overlay.html"), { search: query.slice(1) });
  }
}

function setClickThrough(on) {
  clickThrough = on;
  // forward:true still lets hover/move events reach the window so the character
  // can stay lively even while clicks pass through.
  win?.setIgnoreMouseEvents(on, { forward: true });
  win?.webContents.send("clickthrough", on);
}

// Push a message to the renderer once it has finished loading (events that
// arrive during startup are simply dropped — the gateway replays recent ones).
function toRenderer(channel, payload) {
  if (win && !win.isDestroyed() && !win.webContents.isLoading()) {
    win.webContents.send(channel, payload);
  }
}

// The main process owns the single gateway connection and forwards every event
// to the renderer through the preload bridge. Auto-reconnects with backoff so
// the pet survives the gateway restarting.
let gatewayWs;
let gatewayRetry = 0;
let gatewayReconnectTimer;

function connectGateway() {
  toRenderer("gateway-status", "connecting");
  gatewayWs = new WebSocket(GATEWAY_WS);

  gatewayWs.on("open", () => {
    gatewayRetry = 0;
    toRenderer("gateway-status", "online");
  });

  gatewayWs.on("message", (raw) => {
    let data;
    try {
      data = JSON.parse(raw.toString());
    } catch {
      return;
    }
    // Frames are either { type:"event", event } or an array of recent events.
    const events = Array.isArray(data) ? data : data.type === "event" ? [data.event] : [data];
    events.filter(Boolean).forEach((event) => toRenderer("companion-event", event));
  });

  const retry = () => {
    toRenderer("gateway-status", "offline");
    clearTimeout(gatewayReconnectTimer);
    const delay = Math.min(8000, 500 * 2 ** gatewayRetry++);
    gatewayReconnectTimer = setTimeout(connectGateway, delay);
  };
  gatewayWs.on("close", retry);
  gatewayWs.on("error", () => gatewayWs.close());
}

app.whenReady().then(() => {
  createWindow();

  // Reflect the current connection state once the page is ready (it may have
  // loaded after the socket already opened).
  win.webContents.on("did-finish-load", () => {
    toRenderer("gateway-status", gatewayWs?.readyState === WebSocket.OPEN ? "online" : "connecting");
  });

  connectGateway();

  globalShortcut.register("CommandOrControl+Shift+P", () => setClickThrough(!clickThrough));
  globalShortcut.register("CommandOrControl+Shift+H", () => (win?.isVisible() ? win.hide() : win?.show()));

  // Renderer can ask to (un)pin itself, e.g. when the pointer enters a button.
  ipcMain.on("set-clickthrough", (_e, on) => setClickThrough(!!on));

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("will-quit", () => globalShortcut.unregisterAll());
// Keep running when the (only) window is "closed" on macOS; pet lives in the bg.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
