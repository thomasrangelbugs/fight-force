/** Save / load helpers wrapping EmulatorJS persistence (IndexedDB). */

function getEmulator() {
  return window.EJS_emulator || null;
}

function getGameManager() {
  return getEmulator()?.gameManager || null;
}

export async function saveState() {
  const emu = getEmulator();
  const gm = getGameManager();
  if (!emu && !gm) throw new Error('Emulador ainda não está pronto.');

  try {
    if (gm && typeof gm.quickSave === 'function') {
      const ok = gm.quickSave(1);
      if (ok === false) throw new Error('quickSave returned false');
      if (typeof gm.saveSaveFiles === 'function') gm.saveSaveFiles();
      return 'Estado salvo.';
    }
    if (typeof emu.elements?.bottomBar?.quickSave?.[0]?.click === 'function') {
      emu.elements.bottomBar.quickSave[0].click();
      return 'Estado salvo.';
    }
    if (gm && typeof gm.saveSaveFiles === 'function') {
      gm.saveSaveFiles();
      return 'Memory card sincronizado.';
    }
  } catch (err) {
    console.error('[saves] saveState', err);
    throw new Error('Nao foi possivel salvar o progresso.');
  }

  throw new Error('Salvar estado nao esta disponivel neste nucleo.');
}

export async function loadState() {
  const emu = getEmulator();
  const gm = getGameManager();
  if (!emu && !gm) throw new Error('Emulador ainda não está pronto.');

  try {
    if (gm && typeof gm.quickLoad === 'function') {
      const ok = gm.quickLoad(1);
      if (ok === false) throw new Error('quickLoad returned false');
      return 'Estado carregado.';
    }
    if (typeof emu.elements?.bottomBar?.quickLoad?.[0]?.click === 'function') {
      emu.elements.bottomBar.quickLoad[0].click();
      return 'Estado carregado.';
    }
  } catch (err) {
    console.error('[saves] loadState', err);
    throw new Error('Nao foi possivel carregar o progresso.');
  }

  throw new Error('Carregar estado nao esta disponivel neste nucleo.');
}

export function restartGame() {
  const gm = getGameManager();
  const emu = getEmulator();
  try {
    if (gm && typeof gm.restart === 'function') {
      gm.restart();
      return;
    }
    if (emu?.elements?.bottomBar?.restart?.[0]) {
      emu.elements.bottomBar.restart[0].click();
      return;
    }
  } catch (err) {
    console.error('[saves] restart', err);
  }
  window.location.reload();
}

/** Keep memory-card style saves flushed periodically once running. */
export function startSaveWatchdog(intervalMs = 20000) {
  const id = window.setInterval(() => {
    try {
      const gm = getGameManager();
      if (gm && typeof gm.saveSaveFiles === 'function') {
        gm.saveSaveFiles();
      }
    } catch (_) {
      /* ignore */
    }
  }, intervalMs);
  return () => window.clearInterval(id);
}
