import { unlockAudio, bindAudioResumeOnGesture } from './audio.js';
import { startEmulator, checkCapabilities, stopEmulatorLoadingHelpers } from './emulator.js';
import { initTouchControls, isTouchDevice, initOrientationGate } from './mobile.js';
import { initGamepadMonitor } from './gamepad.js';
import { saveState, loadState, restartGame, startSaveWatchdog } from './saves.js';
import { toggleFullscreen, requestFullscreen } from './fullscreen.js';

const bootScreen = document.getElementById('boot-screen');
const loadingScreen = document.getElementById('loading-screen');
const gameScreen = document.getElementById('game-screen');
const pauseMenu = document.getElementById('pause-menu');
const controlsModal = document.getElementById('controls-modal');
const errorToast = document.getElementById('error-toast');
const playBtn = document.getElementById('btn-play');

let started = false;
let saveWatchdogStop = null;
let touchApi = null;

function showError(message) {
  console.error('[Fighting Force]', message);
  if (!errorToast) return;
  errorToast.hidden = false;
  errorToast.textContent = message;
  window.setTimeout(() => {
    errorToast.hidden = true;
  }, 8000);
}

function showToast(message) {
  if (!errorToast) return;
  errorToast.hidden = false;
  errorToast.style.borderColor = 'rgba(120, 180, 255, 0.45)';
  errorToast.style.background = 'rgba(8, 16, 32, 0.95)';
  errorToast.style.color = '#d7e6ff';
  errorToast.textContent = message;
  window.setTimeout(() => {
    errorToast.hidden = true;
    errorToast.removeAttribute('style');
  }, 2500);
}

function setScreen(name) {
  bootScreen.hidden = name !== 'boot';
  loadingScreen.hidden = name !== 'loading';
  if (name === 'game') {
    gameScreen.hidden = false;
  } else if (name === 'boot') {
    gameScreen.hidden = true;
  } else if (name === 'loading') {
    // keep game mount visible under the overlay for WebGL
    gameScreen.hidden = false;
  }
}

function openPause(open) {
  pauseMenu.hidden = !open;
}

function openControls(open) {
  controlsModal.hidden = !open;
}

async function handleSave() {
  try {
    const msg = await saveState();
    showToast(msg);
  } catch (err) {
    showError(err.message || 'Falha ao salvar.');
  }
}

async function handleLoad() {
  try {
    const msg = await loadState();
    showToast(msg);
  } catch (err) {
    showError(err.message || 'Falha ao carregar.');
  }
}

function wireHud() {
  document.getElementById('btn-menu')?.addEventListener('click', (e) => {
    e.stopPropagation();
    openPause(true);
  });
  document.getElementById('btn-save')?.addEventListener('click', (e) => {
    e.stopPropagation();
    handleSave();
  });
  document.getElementById('btn-load')?.addEventListener('click', (e) => {
    e.stopPropagation();
    handleLoad();
  });
  document.getElementById('btn-fullscreen')?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleFullscreen(document.getElementById('game-stage') || document.documentElement);
  });

  pauseMenu?.addEventListener('click', (e) => {
    if (e.target === pauseMenu) openPause(false);
  });

  pauseMenu?.querySelectorAll('[data-action]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const action = btn.getAttribute('data-action');
      openPause(false);
      switch (action) {
        case 'continue':
          break;
        case 'save':
          await handleSave();
          break;
        case 'load':
          await handleLoad();
          break;
        case 'controls':
          openControls(true);
          break;
        case 'fullscreen':
          await toggleFullscreen(document.getElementById('game-stage') || document.documentElement);
          break;
        case 'restart':
          restartGame();
          break;
        case 'exit':
          window.location.reload();
          break;
        default:
          break;
      }
    });
  });
}

async function purgeServiceWorkers() {
  if (!('serviceWorker' in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((r) => r.unregister()));
    if (window.caches?.keys) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
    console.info('[sw] purged old workers/caches');
  } catch (err) {
    console.warn('[sw] purge failed', err);
  }
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  // Skip SW on localhost so cache never hides fixes while developing
  const host = location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') {
    purgeServiceWorkers();
    return;
  }
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js?v=3').catch((err) => {
      console.warn('[sw] register failed', err);
    });
  });
}

function prepareTouchUi() {
  if (!isTouchDevice()) return;
  document.body.classList.add('touch-ui');
  touchApi = initTouchControls();
  initOrientationGate();
  touchApi?.show();
}

async function onPlay() {
  if (started) return;
  started = true;
  playBtn.disabled = true;

  setScreen('loading');
  document.body.classList.add('playing');

  try {
    await unlockAudio();
    bindAudioResumeOnGesture(document);

    try {
      await requestFullscreen(document.documentElement);
    } catch (_) {
      /* optional */
    }

    prepareTouchUi();

    await startEmulator({
      onReady: () => {
        console.info('[Fighting Force] emulator ready');
        gameScreen.hidden = false;
      },
      onStart: () => {
        console.info('[Fighting Force] game started');
        stopEmulatorLoadingHelpers();
        setScreen('game');
        saveWatchdogStop = startSaveWatchdog();
        if (window.EJS_emulator?.gameManager) {
          import('./controls.js').then(({ setInputBridge }) => {
            setInputBridge(window.EJS_emulator.gameManager);
          });
        }
      },
      onError: (err) => {
        console.error('[Fighting Force] boot error', err);
        stopEmulatorLoadingHelpers();
        started = false;
        playBtn.disabled = false;
        document.body.classList.remove('playing');
        setScreen('boot');
        showError(err?.message || 'Nao foi possivel carregar o jogo.');
      },
    });
  } catch (err) {
    console.error(err);
    stopEmulatorLoadingHelpers();
    started = false;
    playBtn.disabled = false;
    document.body.classList.remove('playing');
    setScreen('boot');
    showError(err.message || 'Nao foi possivel carregar o jogo.');
  }
}

async function boot() {
  await purgeServiceWorkers();

  const caps = checkCapabilities();
  const warn = document.getElementById('capability-warning');
  if (!caps.ok && warn) {
    warn.hidden = false;
    warn.textContent = caps.issues.join(' ');
  }

  wireHud();
  initGamepadMonitor();
  registerServiceWorker();

  playBtn?.addEventListener('click', onPlay);

  document.addEventListener(
    'gesturestart',
    (e) => {
      if (document.body.classList.contains('playing')) e.preventDefault();
    },
    { passive: false }
  );
}

boot();
