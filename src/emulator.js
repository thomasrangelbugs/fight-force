import { DEFAULT_KEYBOARD_CONTROLS, setInputBridge } from './controls.js';

const STEPS = [
  { key: 'prepare', label: 'Preparando emulador', progress: 8 },
  { key: 'wasm', label: 'Preparando WebAssembly', progress: 18 },
  { key: 'core', label: 'Carregando nucleo PS1', progress: 32 },
  { key: 'game', label: 'Baixando Fighting Force (~44MB)', progress: 45 },
  { key: 'boot', label: 'Extraindo e iniciando jogo', progress: 70 },
  { key: 'done', label: 'Fighting Force pronto', progress: 100 },
];

let progressTimer = null;
let bootWatchdog = null;

function cfg() {
  return window.FF_CONFIG || {};
}

function setLoading(status, detail, progress) {
  const statusEl = document.getElementById('loading-status');
  const detailEl = document.getElementById('loading-detail');
  const fill = document.getElementById('loading-fill');
  const bar = fill?.parentElement;
  if (statusEl) statusEl.textContent = status;
  if (detailEl) detailEl.textContent = detail;
  if (fill && typeof progress === 'number') {
    fill.style.width = `${Math.max(0, Math.min(100, progress))}%`;
    if (bar) bar.setAttribute('aria-valuenow', String(Math.round(progress)));
  }
}

function advance(stepKey) {
  const step = STEPS.find((s) => s.key === stepKey) || STEPS[0];
  setLoading('Inicializando PlayStation...', step.label, step.progress);
}

function detectWebGL() {
  try {
    const canvas = document.createElement('canvas');
    const gl2 = canvas.getContext('webgl2');
    if (gl2) return { ok: true, version: 2 };
    const gl1 = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl1) return { ok: true, version: 1 };
  } catch (err) {
    console.error('[webgl]', err);
  }
  return { ok: false, version: 0 };
}

export function checkCapabilities() {
  const issues = [];
  if (typeof WebAssembly !== 'object') {
    issues.push('Seu navegador nao suporta WebAssembly.');
  }
  const gl = detectWebGL();
  if (!gl.ok) {
    issues.push('WebGL nao esta disponivel.');
  }
  return { ok: issues.length === 0, issues, webgl: gl };
}

async function assertGameExists(url) {
  const encoded = encodeURI(url);
  try {
    const res = await fetch(encoded, { method: 'HEAD' });
    if (res.ok) return true;
    if (res.status === 405 || res.status === 501) return true;
  } catch (_) {
    /* try GET range */
  }
  try {
    const res = await fetch(encoded, {
      method: 'GET',
      headers: { Range: 'bytes=0-0' },
    });
    if (res.ok || res.status === 206) return true;
  } catch (err) {
    console.error('[game] probe failed', err);
  }
  return false;
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Falha ao carregar ${src}`));
    document.body.appendChild(s);
  });
}

function hideEmulatorChrome() {
  if (document.getElementById('ff-hide-ejs-chrome')) return;
  const style = document.createElement('style');
  style.id = 'ff-hide-ejs-chrome';
  style.textContent = `
    .ejs-player .ejs--vp,
    .ejs-player .ejs-virtual-gamepad,
    .ejs-player .ejs_virtualGamepad_parent {
      display: none !important;
    }
  `;
  document.head.appendChild(style);
}

function parseProgressFromText(text) {
  if (!text) return null;
  const pct = text.match(/(\d+)\s*%/);
  return pct ? Number(pct[1]) : null;
}

function startProgressMirror() {
  stopProgressMirror();
  progressTimer = window.setInterval(() => {
    const emu = window.EJS_emulator;
    const text =
      emu?.textElem?.innerText ||
      document.querySelector('#game .ejs_loading_text')?.textContent ||
      '';
    if (!text) return;

    const lower = text.toLowerCase();
    if (lower.includes('error') || lower.includes('failed')) {
      console.error('[Fighting Force] emulator status:', text);
      setLoading('Erro ao carregar', text, 100);
      return;
    }

    const pct = parseProgressFromText(text);
    if (pct != null) {
      setLoading('Inicializando PlayStation...', text, 55 + Math.round(pct * 0.4));
    } else {
      setLoading('Inicializando PlayStation...', text);
    }
  }, 250);
}

function stopProgressMirror() {
  if (progressTimer) {
    clearInterval(progressTimer);
    progressTimer = null;
  }
}

function stopBootWatchdog() {
  if (bootWatchdog) {
    clearTimeout(bootWatchdog);
    bootWatchdog = null;
  }
}

export function stopEmulatorLoadingHelpers() {
  stopProgressMirror();
  stopBootWatchdog();
}

/**
 * Boot EmulatorJS after user gesture.
 */
export async function startEmulator({ onReady, onStart, onError, onProgress } = {}) {
  const config = cfg();
  let gameUrl = config.GAME_URL;
  if (!gameUrl) {
    throw new Error('Arquivo Fighting Force nao encontrado (GAME_URL vazio).');
  }
  // Encode spaces for fetch/EmulatorJS
  gameUrl = encodeURI(gameUrl);

  advance('prepare');
  onProgress?.(STEPS[0]);

  const caps = checkCapabilities();
  if (!caps.ok) {
    throw new Error(caps.issues.join(' '));
  }

  advance('wasm');

  const exists = await assertGameExists(config.GAME_URL);
  if (!exists) {
    throw new Error('Arquivo Fighting Force nao encontrado.');
  }

  if (caps.webgl.version < 2) {
    window.EJS_forceLegacyCores = true;
  }

  advance('core');
  onProgress?.(STEPS[2]);

  window.EJS_player = '#game';
  window.EJS_gameUrl = gameUrl;
  window.EJS_core = config.CORE || 'psx';
  window.EJS_pathtodata = config.PATH_TO_DATA || 'emulator/data/';
  window.EJS_startOnLoaded = true;
  window.EJS_gameName = config.gameName || 'Fighting Force';
  window.EJS_gameID = config.gameId || 19970801;
  window.EJS_color = '#2f6dff';
  window.EJS_backgroundColor = '#000000';
  window.EJS_defaultControls = DEFAULT_KEYBOARD_CONTROLS;
  window.EJS_disableCue = false;
  window.EJS_disableAutoLang = true;
  window.EJS_VirtualGamepadSettings = {};
  window.EJS_softLoad = false;
  window.EJS_Buttons = {
    playPause: false,
    restart: false,
    mute: true,
    settings: false,
    fullscreen: false,
    saveState: true,
    loadState: true,
    screenRecord: false,
    gamepad: true,
    cheat: false,
    volume: true,
    saveSavFiles: true,
    loadSavFiles: true,
    quickSave: true,
    quickLoad: true,
    screenshot: false,
    cacheManager: false,
    exitEmulation: false,
  };

  if (config.BIOS_URL) {
    window.EJS_biosUrl = encodeURI(config.BIOS_URL);
  }

  if (config.EXTERNAL_FILES && typeof config.EXTERNAL_FILES === 'object') {
    const mapped = {};
    for (const [fsPath, url] of Object.entries(config.EXTERNAL_FILES)) {
      mapped[fsPath] = encodeURI(url);
    }
    window.EJS_externalFiles = mapped;
  }

  window.EJS_ready = () => {
    advance('boot');
    startProgressMirror();
    const emu = window.EJS_emulator;
    if (emu?.gameManager) {
      setInputBridge(emu.gameManager);
    }
    hideEmulatorChrome();
    onReady?.(emu);

    stopBootWatchdog();
    bootWatchdog = window.setTimeout(() => {
      const text = window.EJS_emulator?.textElem?.innerText || '';
      console.error('[Fighting Force] boot timeout. Last status:', text);
      stopProgressMirror();
      const err = new Error(
        text
          ? `Demorou demais para iniciar. Status: ${text}`
          : 'Demorou demais para iniciar o jogo.'
      );
      onError?.(err);
    }, 120000);
  };

  window.EJS_onGameStart = () => {
    stopProgressMirror();
    stopBootWatchdog();
    advance('done');
    const emu = window.EJS_emulator;
    if (emu?.gameManager) {
      setInputBridge(emu.gameManager);
    }
    onStart?.(emu);
  };

  advance('game');
  onProgress?.(STEPS[3]);

  try {
    await loadScript(config.LOADER_URL || 'emulator/data/loader.js');
  } catch (err) {
    console.error(err);
    stopEmulatorLoadingHelpers();
    onError?.(err);
    throw new Error('Nao foi possivel inicializar o nucleo PlayStation.');
  }
}
