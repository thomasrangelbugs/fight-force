/**
 * Fighting Force Web Edition — game path config.
 * Change GAME_URL only here (e.g. CDN).
 */
window.FF_CONFIG = Object.freeze({
  gameName: 'Fighting Force',
  gameId: 19970801,
  /**
   * Small ZIP (~68MB) with MODE2 cue + data track only.
   * Avoid games/FightingForce-USA.zip (433MB multi-track) on mobile.
   */
  GAME_URL: 'games/FightingForce-data.zip',
  EXTERNAL_FILES: null,
  BIOS_URL: '',
  CORE: 'psx',
  PATH_TO_DATA: 'emulator/data/',
  LOADER_URL: 'emulator/data/loader.js',
});
