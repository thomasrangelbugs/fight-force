/** Audio unlock helpers (Safari / autoplay policy). */

let audioCtx = null;

export function getAudioContext() {
  return audioCtx;
}

export async function unlockAudio() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;

  if (!audioCtx) {
    audioCtx = new AC();
  }

  try {
    if (audioCtx.state === 'suspended') {
      await audioCtx.resume();
    }
  } catch (err) {
    console.warn('[audio] resume failed', err);
  }

  // Silent buffer nudge — helps some mobile browsers
  try {
    const buffer = audioCtx.createBuffer(1, 1, 22050);
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(audioCtx.destination);
    source.start(0);
  } catch (_) {
    /* ignore */
  }

  return audioCtx;
}

export function bindAudioResumeOnGesture(target = document) {
  const resume = () => {
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
  };
  target.addEventListener('pointerdown', resume, { passive: true });
  target.addEventListener('touchstart', resume, { passive: true });
  target.addEventListener('keydown', resume);
}
