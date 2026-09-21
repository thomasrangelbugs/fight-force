import { PSX_BUTTON } from './controls.js';

const badge = () => document.getElementById('gamepad-badge');

/** Standard mapping for Xbox / DualShock-like controllers via Gamepad API (visual badge only).
 *  EmulatorJS already reads Gamepad API natively; we only surface connection status.
 */
export function initGamepadMonitor() {
  const update = () => {
    const pads = navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : [];
    const el = badge();
    if (!el) return;
    if (pads.length) {
      el.hidden = false;
      el.textContent = 'Controle conectado';
    } else {
      el.hidden = true;
    }
  };

  window.addEventListener('gamepadconnected', (e) => {
    console.info('[gamepad] connected', e.gamepad?.id);
    update();
  });
  window.addEventListener('gamepaddisconnected', (e) => {
    console.info('[gamepad] disconnected', e.gamepad?.id);
    update();
  });

  // Poll lightly — some browsers only expose pads after a button press
  let raf = 0;
  const loop = () => {
    update();
    raf = window.setTimeout(loop, 1500);
  };
  loop();

  return () => window.clearTimeout(raf);
}

/**
 * Optional manual gamepad → simulateInput bridge if EmulatorJS gamepad is disabled.
 * Kept unused by default; EmulatorJS handles pads when EJS_Buttons.gamepad is available.
 */
export function readPadToButtons(pad, bridge) {
  if (!pad || !bridge) return;
  const map = [
    [pad.buttons[0]?.pressed, 'cross'],
    [pad.buttons[1]?.pressed, 'circle'],
    [pad.buttons[2]?.pressed, 'square'],
    [pad.buttons[3]?.pressed, 'triangle'],
    [pad.buttons[4]?.pressed, 'l1'],
    [pad.buttons[5]?.pressed, 'r1'],
    [pad.buttons[6]?.pressed, 'l2'],
    [pad.buttons[7]?.pressed, 'r2'],
    [pad.buttons[8]?.pressed, 'select'],
    [pad.buttons[9]?.pressed, 'start'],
    [pad.buttons[12]?.pressed, 'up'],
    [pad.buttons[13]?.pressed, 'down'],
    [pad.buttons[14]?.pressed, 'left'],
    [pad.buttons[15]?.pressed, 'right'],
  ];
  for (const [pressed, name] of map) {
    const index = PSX_BUTTON[name];
    if (index === undefined) continue;
    try {
      bridge.simulateInput(0, index, pressed ? 1 : 0);
    } catch (_) {
      /* ignore */
    }
  }
}
