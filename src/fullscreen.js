/** Fullscreen + iOS maximize fallback. */

export function isFullscreenActive() {
  return Boolean(
    document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.body.classList.contains('immersive')
  );
}

export async function requestFullscreen(el = document.documentElement) {
  try {
    if (el.requestFullscreen) {
      await el.requestFullscreen();
    } else if (el.webkitRequestFullscreen) {
      el.webkitRequestFullscreen();
    } else if (el.webkitEnterFullscreen) {
      el.webkitEnterFullscreen();
    } else {
      document.body.classList.add('immersive', 'ios-fallback');
    }
  } catch (err) {
    console.warn('[fullscreen] native failed, using fallback', err);
    document.body.classList.add('immersive', 'ios-fallback');
  }

  tryLockLandscape();
}

export async function exitFullscreen() {
  try {
    if (document.exitFullscreen && document.fullscreenElement) {
      await document.exitFullscreen();
    } else if (document.webkitExitFullscreen && document.webkitFullscreenElement) {
      document.webkitExitFullscreen();
    }
  } catch (err) {
    console.warn('[fullscreen] exit failed', err);
  }
  document.body.classList.remove('immersive');
}

export async function toggleFullscreen(el) {
  if (isFullscreenActive()) {
    await exitFullscreen();
  } else {
    await requestFullscreen(el);
  }
}

export function tryLockLandscape() {
  try {
    const orientation = screen.orientation || screen.mozOrientation || screen.msOrientation;
    if (orientation && typeof orientation.lock === 'function') {
      orientation.lock('landscape').catch(() => {});
    }
  } catch (err) {
    console.warn('[orientation] lock unavailable', err);
  }
}
