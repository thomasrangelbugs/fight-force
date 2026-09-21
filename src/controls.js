/**
 * Libretro joypad indices used by EmulatorJS / pcsx_rearmed.
 * Cross = B, Circle = A, Square = Y, Triangle = X
 */
export const PSX_BUTTON = Object.freeze({
  cross: 0,
  square: 1,
  select: 2,
  start: 3,
  up: 4,
  down: 5,
  left: 6,
  right: 7,
  circle: 8,
  triangle: 9,
  l1: 10,
  r1: 11,
  l2: 12,
  r2: 13,
});

/**
 * Default keyboard map (EmulatorJS player 0).
 * value = keyboard code name used by EJS; value2 = gamepad label.
 */
export const DEFAULT_KEYBOARD_CONTROLS = {
  0: {
    0: { value: 'z', value2: 'BUTTON_2' }, // Cross
    1: { value: 'a', value2: 'BUTTON_4' }, // Square
    2: { value: 'shift', value2: 'SELECT' },
    3: { value: 'enter', value2: 'START' },
    4: { value: 'up', value2: 'DPAD_UP' },
    5: { value: 'down', value2: 'DPAD_DOWN' },
    6: { value: 'left', value2: 'DPAD_LEFT' },
    7: { value: 'right', value2: 'DPAD_RIGHT' },
    8: { value: 'x', value2: 'BUTTON_1' }, // Circle
    9: { value: 's', value2: 'BUTTON_3' }, // Triangle
    10: { value: 'q', value2: 'LEFT_TOP_SHOULDER' },
    11: { value: 'e', value2: 'RIGHT_TOP_SHOULDER' },
    12: { value: '1', value2: 'LEFT_BOTTOM_SHOULDER' },
    13: { value: '3', value2: 'RIGHT_BOTTOM_SHOULDER' },
    14: { value: '', value2: 'LEFT_STICK' },
    15: { value: '', value2: 'RIGHT_STICK' },
  },
  1: {},
  2: {},
  3: {},
};

/**
 * Extra WASD directional aliases (arrows remain primary in EmulatorJS).
 * Note: A/S are face buttons (square/triangle); use arrows for movement when using those.
 */
export const WASD_ALIASES = {
  KeyW: 'up',
  KeyD: 'right',
};

let inputTarget = null;

export function setInputBridge(bridge) {
  inputTarget = bridge;
}

export function pressButton(name, pressed) {
  const index = PSX_BUTTON[name];
  if (index === undefined) return;
  const value = pressed ? 1 : 0;

  if (inputTarget && typeof inputTarget.simulateInput === 'function') {
    try {
      inputTarget.simulateInput(0, index, value);
      return;
    } catch (err) {
      console.warn('[controls] simulateInput failed', err);
    }
  }

  // Fallback: dispatch keyboard events for mapped keys
  const keyMap = {
    up: 'ArrowUp',
    down: 'ArrowDown',
    left: 'ArrowLeft',
    right: 'ArrowRight',
    cross: 'KeyZ',
    circle: 'KeyX',
    square: 'KeyA',
    triangle: 'KeyS',
    l1: 'KeyQ',
    r1: 'KeyE',
    l2: 'Digit1',
    r2: 'Digit3',
    start: 'Enter',
    select: 'ShiftLeft',
  };
  const code = keyMap[name];
  if (!code) return;
  const ev = new KeyboardEvent(pressed ? 'keydown' : 'keyup', {
    code,
    key: code.startsWith('Arrow') ? code.replace('Arrow', '') : code,
    bubbles: true,
    cancelable: true,
  });
  document.dispatchEvent(ev);
}
