import { pressButton } from './controls.js';

const STORAGE_KEY = 'ff-touch-settings-v1';

const DEFAULTS = {
  opacity: 55,
  size: 100,
  offset: 8,
  vibrate: true,
  visible: true,
};

let settings = { ...DEFAULTS };
const activePointers = new Map(); // pointerId -> buttonName

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) settings = { ...DEFAULTS, ...JSON.parse(raw) };
  } catch (_) {
    settings = { ...DEFAULTS };
  }
}

function saveSettings() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (_) {
    /* ignore quota */
  }
}

function vibrateShort() {
  if (!settings.vibrate) return;
  try {
    if (navigator.vibrate) navigator.vibrate(10);
  } catch (_) {
    /* unsupported */
  }
}

function applyVisualSettings() {
  const root = document.getElementById('touch-controls');
  if (!root) return;
  root.style.setProperty('--tc-opacity', String(settings.opacity / 100));
  root.style.setProperty('--tc-scale', String(settings.size / 100));
  root.style.setProperty('--tc-offset', `${settings.offset}px`);
  document.body.classList.toggle('controls-hidden', !settings.visible);
}

function setPressed(btn, on) {
  pressButton(btn, on);
  document.querySelectorAll(`.tc-btn[data-btn="${btn}"]`).forEach((el) => {
    el.classList.toggle('is-pressed', on);
  });
}

function bindButton(el) {
  const btn = el.dataset.btn;
  if (!btn) return;

  const down = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (activePointers.has(e.pointerId)) return;
    activePointers.set(e.pointerId, btn);
    try {
      el.setPointerCapture(e.pointerId);
    } catch (_) {
      /* ignore */
    }
    setPressed(btn, true);
    vibrateShort();
  };

  const up = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const mapped = activePointers.get(e.pointerId);
    if (!mapped) return;
    activePointers.delete(e.pointerId);
    setPressed(mapped, false);
  };

  el.addEventListener('pointerdown', down);
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
  el.addEventListener('lostpointercapture', (e) => {
    const mapped = activePointers.get(e.pointerId);
    if (mapped) {
      activePointers.delete(e.pointerId);
      setPressed(mapped, false);
    }
  });

  // Block context menu / gesture side-effects on control surface
  el.addEventListener('contextmenu', (e) => e.preventDefault());
}

export function initTouchControls({
  onOpenSettings,
} = {}) {
  loadSettings();
  applyVisualSettings();

  const root = document.getElementById('touch-controls');
  if (!root) return;

  root.querySelectorAll('.tc-btn').forEach(bindButton);

  // Prevent scroll/zoom when interacting over controls layer
  root.addEventListener(
    'touchmove',
    (e) => {
      if (e.target.closest('.tc-btn')) e.preventDefault();
    },
    { passive: false }
  );

  const opacity = document.getElementById('ctrl-opacity');
  const size = document.getElementById('ctrl-size');
  const offset = document.getElementById('ctrl-offset');
  const vibrate = document.getElementById('ctrl-vibrate');
  const visible = document.getElementById('ctrl-visible');
  const close = document.getElementById('ctrl-close');

  if (opacity) {
    opacity.value = settings.opacity;
    opacity.addEventListener('input', () => {
      settings.opacity = Number(opacity.value);
      applyVisualSettings();
      saveSettings();
    });
  }
  if (size) {
    size.value = settings.size;
    size.addEventListener('input', () => {
      settings.size = Number(size.value);
      applyVisualSettings();
      saveSettings();
    });
  }
  if (offset) {
    offset.value = settings.offset;
    offset.addEventListener('input', () => {
      settings.offset = Number(offset.value);
      applyVisualSettings();
      saveSettings();
    });
  }
  if (vibrate) {
    vibrate.checked = settings.vibrate;
    vibrate.addEventListener('change', () => {
      settings.vibrate = vibrate.checked;
      saveSettings();
    });
  }
  if (visible) {
    visible.checked = settings.visible;
    visible.addEventListener('change', () => {
      settings.visible = visible.checked;
      applyVisualSettings();
      saveSettings();
    });
  }
  if (close) {
    close.addEventListener('click', () => {
      document.getElementById('controls-modal').hidden = true;
    });
  }

  return {
    show() {
      root.hidden = false;
      root.setAttribute('aria-hidden', 'false');
      applyVisualSettings();
    },
    hide() {
      root.hidden = true;
      root.setAttribute('aria-hidden', 'true');
    },
    openSettings: onOpenSettings,
    getSettings: () => ({ ...settings }),
  };
}

export function isTouchDevice() {
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    window.matchMedia('(pointer: coarse)').matches
  );
}

export function initOrientationGate() {
  const gate = document.getElementById('rotate-gate');
  if (!gate) return;

  const update = () => {
    const portrait = window.matchMedia('(orientation: portrait)').matches;
    const narrow = window.matchMedia('(max-width: 900px)').matches;
    const shouldShow = document.body.classList.contains('touch-ui') && portrait && narrow;
    gate.hidden = !shouldShow;
  };

  window.addEventListener('orientationchange', update);
  window.addEventListener('resize', update);
  update();
  return update;
}
