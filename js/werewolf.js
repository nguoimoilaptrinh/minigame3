// js/werewolf.js — Thin Facade hợp nhất WWEngine, WWHostUI và WWPlayerUI (v4.0)
(typeof window !== 'undefined' ? window : globalThis).WerewolfGame = (() => {
  'use strict';

  const _win = typeof window !== 'undefined' ? window : globalThis;

  function engine() {
    return _win.WWEngine;
  }

  function initHooks() {
    if (_win.WWHostUI && typeof _win.WWHostUI.init === 'function') _win.WWHostUI.init();
    if (_win.WWPlayerUI && typeof _win.WWPlayerUI.init === 'function') _win.WWPlayerUI.init();
  }

  function startHost(opts) {
    initHooks();
    return engine()?.startHost?.(opts);
  }

  function joinAsPlayer(opts) {
    initHooks();
    return engine()?.joinAsPlayer?.(opts);
  }

  function cleanup() {
    return engine()?.cleanup?.();
  }

  function getHostSnapshotInfo() {
    return engine()?.getHostSnapshotInfo?.() || null;
  }

  function discardHostSnapshot() {
    return engine()?.discardHostSnapshot?.();
  }

  function togglePause() {
    return engine()?.togglePause?.();
  }

  function pauseGame() {
    return engine()?.pauseGame?.();
  }

  function resumeGame() {
    return engine()?.resumeGame?.();
  }

  function getState() {
    return engine()?.getState?.() || null;
  }

  return {
    startHost,
    joinAsPlayer,
    cleanup,
    getHostSnapshotInfo,
    discardHostSnapshot,
    togglePause,
    pauseGame,
    resumeGame,
    getState
  };
})();
