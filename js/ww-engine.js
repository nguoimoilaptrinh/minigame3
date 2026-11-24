// js/ww-engine.js — Lõi Engine Ma Sói v4.0 (tách độc lập khỏi UI để chạy cả trên trình duyệt và Node VM)
(typeof window !== 'undefined' ? window : globalThis).WWEngine = (() => {
  'use strict';

  const _win = typeof window !== 'undefined' ? window : globalThis;

  function gd() {
    return (_win && _win.GameData) || {};
  }

  function rolesMap() {
    return gd().WEREWOLF_ROLES || {};
  }

  function getRecommendedRoles(count) {
    const fn = gd().getRecommendedWerewolfRoles;
    if (typeof fn === 'function') return fn(count);
    const n = Math.max(5, Math.floor(Number(count) || 5));
    return { werewolf: 1, seer: 1, guard: 1, villager: Math.max(2, n - 3) };
  }

  function getRandomAvatar(seedIndex) {
    const fn = gd().getRandomAvatarId;
    if (typeof fn === 'function') return fn(seedIndex);
    return 'boy_smile';
  }

  function netMod() {
    return (_win && (_win.RoomNetwork || _win.Network)) || null;
  }

  function roomId() {
    const rn = netMod();
    return (rn && rn.ROOM_ID) || 'hoiquan';
  }

  const SNAPSHOT_KEY = 'hq_ww_host_snapshot';
  const LAST_GAME_KEY = 'hq_ww_last_game';
  const SETTINGS_KEY = 'hq_ww_settings';
  const LOG_CAP = 500;
  const RESUME_PREFIX = 'Bot Quản Trò đã kết nối lại. ';
  const JOIN_THROTTLE_MS = 1500;

  // Mốc thời gian cho các bước chờ
  const DAY_MS = 120000;
  const WOLF_LOCK_MS = 3000;
  const WOLF_NUDGE_MS = 40000;
  const WOLF_MAJORITY_MS = 75000;
  const SEER_SAFETY_MS = 12000;
  const DETECTIVE_SAFETY_MS = 12000;
  const REMIND_AT_MS = [35000, 90000];
  const VOTE_LOCK_MS = 8000;
  const DAY_WARN_MS = 30000;
  const DAY_RESUME_GRACE_MS = 20000;

  const DEFAULT_SETTINGS = {
    voteTimeLimit: 0,
    tieRule: 'revote',
    autoVoteLock: true,
    nightPace: 'normal',
    sheriffEnabled: false,
    lastWordsEnabled: false,
    lastWordsSeconds: 25,
    storyTheme: 'classic',
    dynamicEvents: false,
    campaignMode: false
  };

  const VOTE_TIME_OPTIONS = [0, 60, 90, 120, 180, 300];
  const TIE_RULES = ['revote', 'none'];
  const STORY_THEMES = ['classic', 'foggy_village', 'drinking_banter', 'mansion_mystery'];

  const NIGHT_PACE_CONFIG = {
    fast: { mul: 0.6, floorMs: 4500, label: 'Nhanh' },
    normal: { mul: 1, floorMs: 7500, label: 'Vừa' },
    slow: { mul: 1.5, floorMs: 11000, label: 'Chậm' }
  };

  const FAKE_ACT_RANGE = {
    cupid: [5500, 10000],
    guard: [5000, 10500],
    werewolf: [8000, 15000],
    alpha_wolf: [4500, 8500],
    seer: [5500, 11000],
    detective: [6000, 11500],
    witch: [7000, 13500],
    spellcaster: [5000, 9500],
    serial_killer: [5500, 10500]
  };

  const NIGHT_STEP_META = {
    cupid: { key: 'cupid', name: 'Thần Tình Yêu', icon: '💘', label: '💘 Thần Tình Yêu ghép đôi 2 người (Đêm 1)' },
    guard: { key: 'guard', name: 'Bảo Vệ', icon: '🛡️', label: '🛡️ Bảo Vệ thức dậy bảo vệ 1 người' },
    werewolf: { key: 'werewolf', name: 'Ma Sói', icon: '🐺', label: '🐺 Ma Sói thức dậy chọn con mồi' },
    alpha_wolf: { key: 'alpha_wolf', name: 'Sói Đầu Đàn', icon: '🩸', label: '🩸 Sói Đầu Đàn quyết định Nguyền hóa nạn nhân' },
    seer: { key: 'seer', name: 'Tiên Tri', icon: '🔮', label: '🔮 Tiên Tri thức dậy soi thân phận' },
    detective: { key: 'detective', name: 'Thám Tử', icon: '🕵️‍♂️', label: '🕵️‍♂️ Thám Tử thức dậy đối chiếu 2 người chơi' },
    witch: { key: 'witch', name: 'Phù Thủy', icon: '🧪', label: '🧪 Phù Thủy thức dậy dùng bình thuốc' },
    spellcaster: { key: 'spellcaster', name: 'Pháp Sư Câm', icon: '🤐', label: '🤐 Pháp Sư Câm chọn 1 người khóa miệng ngày mai' },
    serial_killer: { key: 'serial_killer', name: 'Sát Nhân Độc Hành', icon: '🗡️', label: '🗡️ Sát Nhân thức dậy chọn mục tiêu ám sát' }
  };

  const STEP_CALL_NAME = {
    cupid: 'Thần Tình Yêu',
    guard: 'Bảo Vệ',
    werewolf: 'Ma Sói',
    alpha_wolf: 'Sói Đầu Đàn',
    seer: 'Tiên Tri',
    detective: 'Thám Tử',
    witch: 'Phù Thủy',
    spellcaster: 'Pháp Sư Câm',
    serial_killer: 'Sát Nhân Độc Hành',
    hunter: 'Thợ Săn',
    avenger: 'Kẻ Báo Thù'
  };

  const WIN_TITLE = {
    villager: '🏆 PHE DÂN LÀNG CHIẾN THẮNG!',
    werewolf: '🐺 PHE MA SÓI CHIẾN THẮNG!',
    jester: '🃏 PHE THỨ 3 — THẰNG NGỐ (KẺ CHÁN ĐỜI) CHIẾN THẮNG!',
    serial_killer: '🗡️ PHE THỨ 3 — SÁT NHÂN ĐỘC HÀNH CHIẾN THẮNG!',
    lovers: '💘 PHE THỨ 3 — CẶP ĐÔI TÌNH NHÂN CHIẾN THẮNG!'
  };

  const WIN_SUB = {
    villager: 'Toàn bộ Ma Sói và Sát Nhân đã bị tiêu diệt.',
    werewolf: 'Ma Sói đã chiếm quyền kiểm soát ngôi làng.',
    jester: 'Cả làng đã bị lừa treo cổ Thằng Ngố.',
    serial_killer: 'Sát Nhân Độc Hành là kẻ sống sót cuối cùng.',
    lovers: 'Cặp đôi khác phe sống sót đến cuối cùng.'
  };

  const CAUSE_NOTE = {
    wolf: 'bị Sói cắn',
    poison: 'bị đầu độc',
    serial_killer: 'bị Sát Nhân ám sát',
    lynch: 'bị treo cổ',
    hunter: 'bị Thợ Săn bắn',
    avenger: 'bị Kẻ Báo Thù kéo theo',
    lover: 'chết theo người yêu'
  };

  const CAUSE_TEXT = {
    wolf: 'bị Sói cắn',
    poison: 'bị Phù Thủy đầu độc',
    serial_killer: 'bị Sát Nhân ám sát'
  };

  // ==================== MODULE STATE & HOOKS ====================
  let hooks = {
    renderHost: null,
    renderPlayer: null,
    renderHostShareBox: null,
    bindHostEvents: null,
    bindPlayerEvents: null,
    syncHostCountdown: null
  };

  function setRenderHooks(newHooks) {
    if (!newHooks || typeof newHooks !== 'object') return;
    Object.keys(newHooks).forEach((k) => {
      if (typeof newHooks[k] === 'function' || newHooks[k] === null) {
        hooks[k] = newHooks[k];
      }
    });
  }

  let session = null;
  let isHost = false;
  let myName = '';
  let myAvatarId = '';
  let state = null;
  let clientView = 'lobby';
  let clientSecret = null; // { roleId, teammates: [], loverInfo: null, converted, startRoleId }
  let witchInfo = null;
  let alphaInfo = null;
  let seerResult = null;
  let detectiveResult = null;
  let wolfSync = { wolfVotes: {}, wolfCount: 1, lock: null };
  let wolfLockEndLocal = 0;
  let cardRevealed = false;
  let cardHasNews = false;
  let newsNotifiedSig = '';
  let peekTimer = null;
  let clientVoteLockEnd = 0;
  let clientDayDeadlineEnd = 0;
  let clientLastWordsEnd = 0;
  let lastReceivedSeq = -1;
  let lastJoinSentAt = 0;

  // Host-only timers & guards
  let speechGuardTimer = null;
  let pausedSpeechGuard = null;
  let speechPrefix = '';
  let stepResolved = false;
  let autoRolesMode = true;
  let demoCounter = 1;
  let voteAllAnnounced = false;
  let skipStepFloorOnce = false;

  // Bảng quản lý timer có endsAt/remainingMs/fn để hỗ trợ Pause/Resume [B3]
  const activeTimers = {}; // name -> { id, endsAt, remainingMs, fn, paused }

  // ==================== SETTINGS HELPERS ====================
  function normalizeSettings(raw) {
    const s = raw && typeof raw === 'object' ? raw : {};
    const limit = Number(s.voteTimeLimit);
    const lwSec = Number(s.lastWordsSeconds);
    return {
      voteTimeLimit: VOTE_TIME_OPTIONS.includes(limit) ? limit : DEFAULT_SETTINGS.voteTimeLimit,
      tieRule: TIE_RULES.includes(s.tieRule) ? s.tieRule : DEFAULT_SETTINGS.tieRule,
      autoVoteLock: s.autoVoteLock === false ? false : true,
      nightPace: NIGHT_PACE_CONFIG[s.nightPace] ? s.nightPace : DEFAULT_SETTINGS.nightPace,
      sheriffEnabled: Boolean(s.sheriffEnabled),
      lastWordsEnabled: Boolean(s.lastWordsEnabled),
      lastWordsSeconds: Number.isFinite(lwSec) && lwSec >= 10 && lwSec <= 120 ? Math.round(lwSec) : DEFAULT_SETTINGS.lastWordsSeconds,
      storyTheme: STORY_THEMES.includes(s.storyTheme) ? s.storyTheme : DEFAULT_SETTINGS.storyTheme,
      dynamicEvents: Boolean(s.dynamicEvents),
      campaignMode: Boolean(s.campaignMode)
    };
  }

  function loadSettings() {
    try {
      return normalizeSettings(JSON.parse(lsGet(SETTINGS_KEY) || 'null'));
    } catch (_) {
      return normalizeSettings(null);
    }
  }

  function saveSettings() {
    if (state && state.settings) lsSet(SETTINGS_KEY, JSON.stringify(state.settings));
  }

  function settingsOfState(s) {
    return normalizeSettings(s && s.settings);
  }

  function settingsOf() {
    return (state && state.settings) ? state.settings : DEFAULT_SETTINGS;
  }

  function paceCfg() {
    return NIGHT_PACE_CONFIG[settingsOf().nightPace] || NIGHT_PACE_CONFIG.normal;
  }

  function fakeActDelay(step) {
    const [lo, hi] = FAKE_ACT_RANGE[step] || [5000, 10000];
    const r = (Math.random() + Math.random()) / 2;
    return Math.round((lo + (hi - lo) * r) * paceCfg().mul);
  }

  // ==================== STORAGE & GENERAL HELPERS ====================
  function storeKey(base) {
    const rn = netMod();
    return rn && typeof rn.storageKey === 'function' ? rn.storageKey(base) : base;
  }

  function lsGet(base) {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        return localStorage.getItem(storeKey(base));
      }
    } catch (_) {}
    return null;
  }

  function lsSet(base, value) {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        localStorage.setItem(storeKey(base), value);
        return true;
      }
    } catch (_) {}
    return false;
  }

  function lsRemove(base) {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        localStorage.removeItem(storeKey(base));
      }
    } catch (_) {}
  }

  function newEpoch() {
    return `${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
  }

  function byId(id) {
    return state && Array.isArray(state.players) ? state.players.find((p) => p.id === id) : undefined;
  }

  function isWolfRole(roleId) {
    return roleId === 'werewolf' || roleId === 'alpha_wolf';
  }

  function getPlayerSide(roleId) {
    if (isWolfRole(roleId)) return 'werewolf';
    if (roleId === 'serial_killer') return 'serial_killer';
    if (roleId === 'jester') return 'jester';
    return 'villager';
  }

  function roleNameOf(p) {
    const map = rolesMap();
    return (p && map[p.roleId] && map[p.roleId].name) || (p && p.roleId) || '?';
  }

  function describe(p) {
    return p ? `${p.name} (${roleNameOf(p)})` : '?';
  }

  function vibrate(pattern) {
    try {
      if (typeof navigator !== 'undefined' && navigator && typeof navigator.vibrate === 'function') {
        navigator.vibrate(pattern);
      }
    } catch (_) {}
  }

  function formatClock(totalSeconds) {
    const s = Math.max(0, Math.ceil(Number(totalSeconds) || 0));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function updateNetBadge(id, text, online) {
    try {
      if (typeof document === 'undefined' || typeof document.getElementById !== 'function') return;
      const el = document.getElementById(id);
      if (!el) return;
      el.textContent = text;
      el.className = `net-badge ${online ? '' : 'offline'}`;
    } catch (_) {}
  }

  function getRoleCountTotal(cfg) {
    const src = cfg || (state && state.rolesConfig) || {};
    return Object.values(src).reduce((sum, v) => sum + (Number(v) || 0), 0);
  }

  function getDefaultRoles(count) {
    return getRecommendedRoles(count);
  }

  // ==================== TIMER & PAUSE/RESUME [B3] ====================
  function clearNamedTimer(name) {
    const entry = activeTimers[name];
    if (!entry) return;
    if (entry.id != null) {
      clearTimeout(entry.id);
    }
    delete activeTimers[name];
  }

  function clearTimers() {
    Object.keys(activeTimers).forEach((k) => clearNamedTimer(k));
  }

  function armTimer(name, ms, fn) {
    clearNamedTimer(name);
    if (typeof fn !== 'function') return;
    const delay = Math.max(0, Math.round(Number(ms) || 0));
    const endsAt = Date.now() + delay;
    if (state && state.isPaused) {
      activeTimers[name] = { id: null, endsAt, remainingMs: delay, fn, paused: true };
      return;
    }
    const id = setTimeout(() => {
      delete activeTimers[name];
      if (!state || !isHost) return;
      fn();
    }, delay);
    activeTimers[name] = { id, endsAt, remainingMs: delay, fn, paused: false };
  }

  function armStepTimer(fn, ms) {
    armTimer('hostStep', ms, fn);
  }

  function clearSpeechGuard() {
    if (speechGuardTimer) {
      clearTimeout(speechGuardTimer.id);
      speechGuardTimer = null;
    }
    pausedSpeechGuard = null;
  }

  function clearHostTimers() {
    clearSpeechGuard();
    clearTimers();
  }

  function broadcastPacket(type, payload) {
    if (!session) return;
    if (typeof session.broadcast === 'function') {
      session.broadcast(type, payload);
    } else if (typeof session.send === 'function') {
      session.send(type, payload);
    }
  }

  function pauseGame() {
    if (!isHost || !state || state.phase === 'LOBBY' || state.phase === 'GAME_OVER' || state.isPaused) {
      return false;
    }
    const now = Date.now();
    let maxRemaining = 0;

    Object.keys(activeTimers).forEach((name) => {
      const entry = activeTimers[name];
      if (!entry) return;
      if (entry.id != null) {
        clearTimeout(entry.id);
        entry.id = null;
      }
      entry.remainingMs = Math.max(0, (entry.endsAt || now) - now);
      entry.paused = true;
      if (entry.remainingMs > maxRemaining) maxRemaining = entry.remainingMs;
    });

    if (speechGuardTimer) {
      clearTimeout(speechGuardTimer.id);
      const rem = Math.max(0, speechGuardTimer.endsAt - now);
      pausedSpeechGuard = { remainingMs: rem, fn: speechGuardTimer.fn };
      speechGuardTimer = null;
    }

    if (state.dayDeadline && state.dayDeadline.endsAt) {
      state.dayDeadline.pausedRemainingMs = Math.max(0, state.dayDeadline.endsAt - now);
      maxRemaining = Math.max(maxRemaining, state.dayDeadline.pausedRemainingMs);
    }
    if (state.voteLock && state.voteLock.endsAt) {
      state.voteLock.pausedRemainingMs = Math.max(0, state.voteLock.endsAt - now);
      maxRemaining = Math.max(maxRemaining, state.voteLock.pausedRemainingMs);
    }
    if (state.nightActions && state.nightActions.wolfLock && state.nightActions.wolfLock.endsAt) {
      state.nightActions.wolfLock.pausedRemainingMs = Math.max(0, state.nightActions.wolfLock.endsAt - now);
      maxRemaining = Math.max(maxRemaining, state.nightActions.wolfLock.pausedRemainingMs);
    }
    if (state.lastWords && state.lastWords.endsAt) {
      state.lastWords.pausedRemainingMs = Math.max(0, state.lastWords.endsAt - now);
      maxRemaining = Math.max(maxRemaining, state.lastWords.pausedRemainingMs);
    }
    if (state.stepWatch && state.stepWatch.deadline) {
      state.stepWatch.pausedRemainingMs = Math.max(0, state.stepWatch.deadline - now);
      maxRemaining = Math.max(maxRemaining, state.stepWatch.pausedRemainingMs);
    }

    state.isPaused = true;
    state.pausedRemainingMs = maxRemaining;

    try {
      _win.AudioEngine?.pauseAll?.();
    } catch (_) {}

    broadcastPacket('WW_PAUSE_STATE', { paused: true, pausedRemainingMs: state.pausedRemainingMs });
    syncStateToClients();
    hooks.renderHost?.();
    hooks.syncHostCountdown?.();
    return true;
  }

  function resumeGame() {
    if (!isHost || !state || !state.isPaused) {
      return false;
    }
    const now = Date.now();
    state.isPaused = false;
    state.pausedRemainingMs = 0;

    if (state.dayDeadline && typeof state.dayDeadline.pausedRemainingMs === 'number') {
      state.dayDeadline.endsAt = now + state.dayDeadline.pausedRemainingMs;
      delete state.dayDeadline.pausedRemainingMs;
    }
    if (state.voteLock && typeof state.voteLock.pausedRemainingMs === 'number') {
      state.voteLock.endsAt = now + state.voteLock.pausedRemainingMs;
      delete state.voteLock.pausedRemainingMs;
    }
    if (state.nightActions && state.nightActions.wolfLock && typeof state.nightActions.wolfLock.pausedRemainingMs === 'number') {
      state.nightActions.wolfLock.endsAt = now + state.nightActions.wolfLock.pausedRemainingMs;
      delete state.nightActions.wolfLock.pausedRemainingMs;
    }
    if (state.lastWords && typeof state.lastWords.pausedRemainingMs === 'number') {
      state.lastWords.endsAt = now + state.lastWords.pausedRemainingMs;
      delete state.lastWords.pausedRemainingMs;
    }
    if (state.stepWatch && typeof state.stepWatch.pausedRemainingMs === 'number') {
      state.stepWatch.deadline = now + state.stepWatch.pausedRemainingMs;
      delete state.stepWatch.pausedRemainingMs;
    }

    if (pausedSpeechGuard) {
      const sg = pausedSpeechGuard;
      pausedSpeechGuard = null;
      const sgId = setTimeout(sg.fn, Math.max(50, sg.remainingMs));
      speechGuardTimer = { id: sgId, endsAt: now + Math.max(50, sg.remainingMs), fn: sg.fn };
    }

    const toRearm = [];
    Object.keys(activeTimers).forEach((name) => {
      const entry = activeTimers[name];
      if (entry && entry.paused) {
        toRearm.push([name, entry.remainingMs, entry.fn]);
      }
    });
    toRearm.forEach(([name, rem, fn]) => {
      armTimer(name, rem, fn);
    });

    try {
      _win.AudioEngine?.resumeAll?.();
    } catch (_) {}

    broadcastPacket('WW_PAUSE_STATE', { paused: false, pausedRemainingMs: 0 });
    syncStateToClients();
    hooks.renderHost?.();
    hooks.syncHostCountdown?.();
    return true;
  }

  function togglePause() {
    if (!state) return false;
    return state.isPaused ? resumeGame() : pauseGame();
  }

  // ==================== STORY NARRATION [C1, C2, C3] ====================
  const NARRATION_KEY_ALIAS = {
    dawn_peaceful: 'morning_peaceful',
    dawn_death: 'morning_deaths',
    dawn_double_death: 'morning_deaths',
    dawn_lover_suicide: 'morning_deaths',
    dawn_peaceful_streak: 'morning_peaceful',
    dawn_final_three: 'morning_deaths',
    dawn_night1_victim: 'morning_deaths',
    dawn_silenced_addendum: 'night_silenced'
  };

  function narrate(key, vars = {}, fallback = '') {
    try {
      const fn = gd().getNarration;
      if (typeof fn === 'function') {
        const st = settingsOf();
        const storySettings = {
          storyTheme: st.storyTheme || 'classic',
          dynamicEvents: Boolean(st.dynamicEvents),
          campaignMode: Boolean(st.campaignMode)
        };
        const ctx = {
          round: (state && state.nightNumber) || 1,
          theme: storySettings.storyTheme,
          dynamicEvents: storySettings.dynamicEvents,
          campaignMode: storySettings.campaignMode,
          ...(vars || {})
        };
        let txt = fn(key, ctx, storySettings);
        if (!txt && NARRATION_KEY_ALIAS[key]) {
          txt = fn(NARRATION_KEY_ALIAS[key], ctx, storySettings);
        }
        if (txt) return txt;
      }
    } catch (_) {}
    return fallback || '';
  }

  // ==================== STATE SCHEMA & PUBLIC PROJECTION ====================
  function createNightActions() {
    return {
      cupidTargets: [],
      guardTarget: null,
      wolfVotes: {},
      wolfLock: null, // { targetId, endsAt }
      wolfStartedAt: null,
      wolfFirstPickAt: null,
      wolfNudged: false,
      seerResultAt: null,
      wolfTarget: null,
      alphaConvert: false,
      seerTarget: null,
      seerInspected: false,
      detectiveTargets: [],
      detectiveChecked: false,
      detectiveResultAt: null,
      witchSave: false,
      witchPoisonTarget: null,
      spellcasterTarget: null,
      serialKillerTarget: null
    };
  }

  function createNightVictims() {
    return {
      wolfTargetId: null,
      witchSaveTargetId: null,
      witchPoisonTargetId: null,
      serialKillerTargetId: null,
      convertedWolfId: null
    };
  }

  function createInitialHostState() {
    return {
      gameId: `ww_${Date.now()}`,
      stateSeq: 0,
      roomCode: roomId(),
      epoch: newEpoch(),
      phase: 'LOBBY', // LOBBY | ROLE_REVEAL | NIGHT | HUNTER_REVENGE | SHERIFF_ELECTION | SHERIFF_TRANSFER | LAST_WORDS | DAY | GAME_OVER
      round: 0,
      nightNumber: 0,
      nightStep: null,
      players: [],
      rolesConfig: getRecommendedRoles(5),
      lastGuardedId: null,
      seerHistory: [],
      lovers: [],
      alphaWolfConvertUsed: false,
      alphaWolfState: { curseUsed: false },
      witchPotions: { save: true, poison: true },
      witchState: { saveUsed: false, poisonUsed: false },
      elderLivesMap: {},
      nightActions: createNightActions(),
      nightVictims: createNightVictims(),
      silencedId: null,
      lastSilencedId: null,
      detectiveCheck: null,
      sheriffId: null,
      sheriffDone: false,
      sheriffVotes: {},
      pendingSheriffNext: null,
      lastWords: null,
      dayVotes: {},
      gameNo: 0,
      voteLock: null,
      voteLockPaused: false,
      revoteUsed: false,
      settings: loadSettings(),
      dayDeadline: null,
      stepWatch: null,
      queuedHunterShot: null,
      pendingHunterId: null,
      pendingRevengeRole: null,
      avengerPending: null,
      pendingHunterNext: null,
      hunterQueue: [],
      isPaused: false,
      pausedRemainingMs: 0,
      peacefulStreak: 0,
      botText: 'Chờ tất cả người chơi vào phòng và ấn Sẵn sàng...',
      lastDawnSummary: '',
      winner: null,
      logs: [],
      logSeq: 0,
      deaths: {},
      flow: { key: 'lobby', data: {} }
    };
  }

  function syncPlayerFlags() {
    if (!state || !Array.isArray(state.players)) return;
    const guardTarget = state.nightActions ? state.nightActions.guardTarget : null;
    state.players.forEach((p) => {
      p.sheriff = Boolean(state.sheriffId && p.id === state.sheriffId);
      p.silenced = Boolean(state.silencedId && p.id === state.silencedId);
      p.shielded = Boolean(guardTarget && p.id === guardTarget);
    });
    if (state.witchPotions) {
      state.witchState = {
        saveUsed: !state.witchPotions.save,
        poisonUsed: !state.witchPotions.poison
      };
    }
    state.alphaWolfState = { curseUsed: Boolean(state.alphaWolfConvertUsed) };
  }

  function getPublicState(s) {
    const revealAll = s.phase === 'GAME_OVER';
    const paused = Boolean(s.isPaused);
    const deaths = {};
    Object.entries(s.deaths || {}).forEach(([id, d]) => {
      deaths[id] = revealAll ? { round: d.round, phase: d.phase, cause: d.cause } : { round: d.round, phase: d.phase };
    });

    const dayRem = (dd) => {
      if (!dd) return 0;
      if (paused && typeof dd.pausedRemainingMs === 'number') return dd.pausedRemainingMs;
      return Math.max(0, (dd.endsAt || 0) - Date.now());
    };

    const st = settingsOfState(s);

    return {
      gameId: s.gameId || null,
      stateSeq: s.stateSeq,
      roomCode: s.roomCode,
      epoch: s.epoch,
      phase: s.phase,
      round: s.nightNumber || 0,
      nightNumber: s.nightNumber,
      nightStep: s.nightStep,
      rolesConfig: s.rolesConfig,
      lastGuardedId: s.lastGuardedId,
      seerHistory: s.seerHistory || [],
      dayVotes: s.dayVotes,
      gameNo: s.gameNo || 0,
      revoteUsed: Boolean(s.revoteUsed),
      sheriffId: s.sheriffId || null,
      sheriffDone: Boolean(s.sheriffDone),
      sheriffVotes: s.phase === 'SHERIFF_ELECTION' ? (s.sheriffVotes || {}) : {},
      silencedId: s.silencedId || null,
      isPaused: paused,
      pausedRemainingMs: paused ? Number(s.pausedRemainingMs) || 0 : 0,
      lastWords:
        s.lastWords && s.phase === 'LAST_WORDS'
          ? {
              names: s.lastWords.names || [],
              durationMs: s.lastWords.durationMs || 0,
              remainingMs: dayRem(s.lastWords)
            }
          : null,
      settings: st,
      dayDeadline:
        s.dayDeadline && s.phase === 'DAY' && s.flow && s.flow.key === 'day'
          ? { remainingMs: dayRem(s.dayDeadline) }
          : null,
      voteLock:
        s.voteLock && s.phase === 'DAY'
          ? {
              remainingMs: dayRem(s.voteLock),
              kind: s.voteLock.kind,
              targetId: s.voteLock.targetId || null
            }
          : null,
      pendingHunterId: s.pendingHunterId,
      pendingRevengeRole: s.pendingRevengeRole || null,
      avengerPending: s.avengerPending || null,
      botText: s.botText,
      lastDawnSummary: s.lastDawnSummary,
      winner: s.winner,
      lovers: revealAll ? s.lovers || [] : [],
      alphaWolfConvertUsed: revealAll ? Boolean(s.alphaWolfConvertUsed) : false,
      logs: revealAll ? s.logs : (s.logs || []).filter((e) => !e.secret),
      deaths,
      players: (s.players || []).map((p) => ({
        id: p.id,
        name: p.name,
        avatarId: p.avatarId || 'boy_smile',
        ready: p.ready,
        alive: p.alive,
        isDemo: p.isDemo,
        sheriff: Boolean(s.sheriffId && p.id === s.sheriffId),
        silenced: Boolean(s.silencedId && p.id === s.silencedId),
        shielded: revealAll ? Boolean(p.shielded) : false,
        online: p.isDemo ? true : Boolean(session && session.isClientOnline && session.isClientOnline(p.id)),
        roleId: revealAll ? p.roleId : null,
        startRoleId: revealAll ? p.startRoleId || p.roleId : null
      }))
    };
  }

  // ==================== SNAPSHOT / FLOW ====================
  function persistHost() {
    if (!isHost || !state) return;
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        localStorage.setItem(
          storeKey(SNAPSHOT_KEY),
          JSON.stringify({
            v: 1,
            savedAt: Date.now(),
            state,
            autoRolesMode,
            demoCounter,
            stepResolved,
            voteAllAnnounced
          })
        );
      }
    } catch (_) {}
  }

  function readHostSnapshot() {
    const raw = lsGet(SNAPSHOT_KEY);
    if (!raw) return null;
    try {
      const snap = JSON.parse(raw);
      if (snap && snap.state && Array.isArray(snap.state.players) && typeof snap.state.phase === 'string') {
        return snap;
      }
    } catch (_) {}
    return null;
  }

  function getHostSnapshotInfo() {
    const snap = readHostSnapshot();
    if (!snap) return null;
    return { phase: snap.state.phase, playerCount: snap.state.players.length, savedAt: snap.savedAt || 0 };
  }

  function discardHostSnapshot() {
    lsRemove(SNAPSHOT_KEY);
  }

  function setFlow(key, data = {}) {
    if (!state) return;
    state.flow = { key, data };
    persistHost();
  }

  function saveLastGame() {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        localStorage.setItem(
          storeKey(LAST_GAME_KEY),
          JSON.stringify({
            finishedAt: Date.now(),
            winner: state.winner,
            players: state.players.map((p) => ({
              id: p.id,
              name: p.name,
              avatarId: p.avatarId,
              alive: p.alive,
              roleId: p.roleId,
              startRoleId: p.startRoleId || p.roleId
            })),
            lovers: state.lovers || [],
            deaths: state.deaths || {},
            logs: state.logs
          })
        );
      }
    } catch (_) {}
  }

  function readLastGame() {
    try {
      return JSON.parse(lsGet(LAST_GAME_KEY) || 'null');
    } catch (_) {
      return null;
    }
  }

  function syncStateToClients() {
    if (!isHost || !session || !state) return;
    syncPlayerFlags();
    state.round = state.nightNumber || 0;
    state.stateSeq += 1;
    persistHost();
    if (typeof session.setBeaconInfo === 'function') {
      session.setBeaconInfo({ phase: state.phase, stateSeq: state.stateSeq, epoch: state.epoch });
    }
    session.send('WW_STATE', getPublicState(state));
  }

  // ==================== SECRETS & PROMPT DATA ====================
  function sendSecretToPlayer(player, extra) {
    if (!isHost || !session || !player || !player.roleId || player.isDemo) return;
    const roles = rolesMap();
    const teammates = isWolfRole(player.roleId)
      ? state.players
          .filter((p) => isWolfRole(p.roleId) && p.id !== player.id)
          .map((p) => ({ id: p.id, name: p.name, avatarId: p.avatarId, alive: p.alive }))
      : [];
    let loverInfo = null;
    if (Array.isArray(state.lovers) && state.lovers.length === 2 && state.lovers.includes(player.id)) {
      const partnerId = state.lovers.find((id) => id !== player.id);
      const partner = byId(partnerId);
      if (partner) {
        loverInfo = {
          id: partner.id,
          name: partner.name,
          avatarId: partner.avatarId,
          alive: partner.alive,
          roleName: (roles[partner.roleId] && roles[partner.roleId].name) || '?',
          roleIcon: (roles[partner.roleId] && roles[partner.roleId].icon) || '',
          sameSide: getPlayerSide(partner.roleId) === getPlayerSide(player.roleId)
        };
      }
    }
    session.send(
      'WW_SECRET',
      {
        roleId: player.roleId,
        startRoleId: player.startRoleId || player.roleId,
        converted: Boolean(player.startRoleId && player.startRoleId !== player.roleId),
        convertedReason:
          player.convertedReason || (player.startRoleId === 'cursed_villager' ? 'cursed' : player.startRoleId && player.startRoleId !== player.roleId ? 'alpha' : ''),
        teammates,
        loverInfo,
        ...(extra || {})
      },
      player.id
    );
  }

  function sendAlphaInfoTo(alphaPlayer, infoOverride) {
    if (!session || !alphaPlayer || alphaPlayer.isDemo) return;
    if (infoOverride) {
      session.send('WW_ALPHA_INFO', infoOverride, alphaPlayer.id);
      return;
    }
    const victimId = state.nightActions.wolfTarget;
    const victim = victimId ? byId(victimId) : null;
    const canConvert = Boolean(!state.alphaWolfConvertUsed && victim);
    session.send(
      'WW_ALPHA_INFO',
      {
        canConvert,
        alreadyUsed: Boolean(state.alphaWolfConvertUsed),
        targetId: canConvert && victim ? victim.id : null,
        targetName: canConvert && victim ? victim.name : '',
        victimId: canConvert && victim ? victim.id : null,
        victimName: canConvert && victim ? victim.name : ''
      },
      alphaPlayer.id
    );
  }

  function sendWitchInfoTo(witchPlayer) {
    if (!session || !witchPlayer || witchPlayer.isDemo) return;
    // Nếu Sói Đầu Đàn đã nguyền nạn nhân đêm nay, nạn nhân biến thành Sói chứ không chết -> Phù Thủy không cần cứu
    const victimId =
      state.witchPotions.save && !state.nightActions.alphaConvert ? state.nightActions.wolfTarget : null;
    const victim = victimId ? byId(victimId) : null;
    session.send(
      'WW_WITCH_INFO',
      {
        victimId: victim ? victim.id : null,
        victimName: victim ? victim.name : null,
        canSave: state.witchPotions.save,
        canPoison: state.witchPotions.poison
      },
      witchPlayer.id
    );
  }

  function sendSeerResultTo(seerPlayer) {
    if (!session || !seerPlayer || seerPlayer.isDemo) return;
    const na = state.nightActions;
    const target = na.seerInspected && na.seerTarget ? byId(na.seerTarget) : null;
    if (!target) return;
    session.send(
      'WW_SEER_RESULT',
      { targetId: target.id, targetName: target.name, isWolf: isWolfRole(target.roleId) },
      seerPlayer.id
    );
  }

  function sendDetectiveResultTo(detectivePlayer) {
    if (!session || !detectivePlayer || detectivePlayer.isDemo) return;
    const na = state.nightActions;
    if (!na.detectiveChecked || !state.detectiveCheck) return;
    session.send('WW_DETECTIVE_RESULT', state.detectiveCheck, detectivePlayer.id);
  }

  function aliveWolves() {
    return state.players.filter((p) => p.alive && isWolfRole(p.roleId));
  }

  function isValidPrey(id) {
    return Boolean(id) && state.players.some((p) => p.id === id && p.alive && !isWolfRole(p.roleId));
  }

  function sendWolfSync(wolfPlayer) {
    if (!session || !wolfPlayer || wolfPlayer.isDemo) return;
    const na = state.nightActions;
    const wolves = aliveWolves();
    const ids = new Set(wolves.map((w) => w.id));
    const votes = {};
    Object.entries(na.wolfVotes || {}).forEach(([wId, tId]) => {
      if (ids.has(wId)) votes[wId] = tId;
    });
    const lockRem = na.wolfLock
      ? state.isPaused && typeof na.wolfLock.pausedRemainingMs === 'number'
        ? na.wolfLock.pausedRemainingMs
        : Math.max(0, na.wolfLock.endsAt - Date.now())
      : 0;
    session.send(
      'WW_WOLF_SYNC',
      {
        wolfVotes: votes,
        wolfCount: Math.max(1, wolves.length),
        lock: na.wolfLock ? { targetId: na.wolfLock.targetId, remainingMs: lockRem } : null
      },
      wolfPlayer.id
    );
  }

  function sendWolfSyncAll() {
    if (!session) return;
    aliveWolves()
      .filter((w) => !w.isDemo)
      .forEach((w) => sendWolfSync(w));
  }

  function sendPendingPromptData(player) {
    if (!player || player.isDemo || !player.alive) return;
    if (state.phase !== 'NIGHT' || stepResolved) return;
    const step = state.nightStep;
    if (step === 'witch' && player.roleId === 'witch') sendWitchInfoTo(player);
    else if (step === 'alpha_wolf' && player.roleId === 'alpha_wolf') sendAlphaInfoTo(player);
    else if (step === 'seer' && player.roleId === 'seer') sendSeerResultTo(player);
    else if (step === 'detective' && player.roleId === 'detective') sendDetectiveResultTo(player);
    else if (step === 'werewolf' && isWolfRole(player.roleId)) sendWolfSync(player);
  }

  function resyncPlayer(player, broadcast) {
    if (broadcast) syncStateToClients();
    else session.send('WW_STATE', getPublicState(state), player.id);
    if (state.phase !== 'LOBBY') {
      sendSecretToPlayer(player);
      sendPendingPromptData(player);
    }
  }

  // ==================== LOG [H4 LOG_DELTA] ====================
  function derivePhase() {
    if (!state) return 'setup';
    if (state.phase === 'NIGHT') return 'night';
    if (
      state.phase === 'DAY' ||
      state.phase === 'HUNTER_REVENGE' ||
      state.phase === 'SHERIFF_ELECTION' ||
      state.phase === 'SHERIFF_TRANSFER' ||
      state.phase === 'LAST_WORDS'
    ) {
      return 'day';
    }
    if (state.phase === 'GAME_OVER') return 'end';
    return 'setup';
  }

  function joinNames(list) {
    const arr = (list || []).filter(Boolean);
    if (arr.length <= 1) return arr.join('');
    return `${arr.slice(0, -1).join(', ')} và ${arr[arr.length - 1]}`;
  }

  function addLog(text, { icon = '•', secret = false, phase } = {}) {
    if (!state) return;
    state.logSeq = (state.logSeq || 0) + 1;
    const entry = {
      seq: state.logSeq,
      round: state.nightNumber || 0,
      phase: phase || derivePhase(),
      icon,
      text,
      secret: Boolean(secret)
    };
    state.logs.push(entry);
    if (state.logs.length > LOG_CAP) state.logs.splice(0, state.logs.length - LOG_CAP);
    if (!entry.secret && isHost && session && typeof session.sendLogDelta === 'function') {
      session.sendLogDelta([entry]);
    }
  }

  function getVoteWeight(voter) {
    if (!voter || !voter.alive) return 0;
    const st = settingsOf();
    if (st.sheriffEnabled && state && state.sheriffId && voter.id === state.sheriffId) return 1.5;
    return 1.0;
  }

  function roundVote(v) {
    return Math.round((Number(v) || 0) * 10) / 10;
  }

  function describeDayVotes() {
    const parts = [];
    Object.entries((state && state.dayVotes) || {}).forEach(([vId, tId]) => {
      const voter = byId(vId);
      if (!voter) return;
      const target = tId === '__skip__' ? null : byId(tId);
      const w = getVoteWeight(voter);
      const wTag = w > 1 ? ` (${w} phiếu)` : '';
      parts.push(`${voter.name}${wTag} → ${tId === '__skip__' ? 'bỏ trắng' : target ? target.name : '?'}`);
    });
    return parts.join('; ');
  }

  // ==================== BOT SPEECH ====================
  function setBotSpeech(text, onDoneOrOpts, maybeOpts) {
    clearSpeechGuard();
    const onDone = typeof onDoneOrOpts === 'function' ? onDoneOrOpts : null;
    const speechOpts =
      typeof onDoneOrOpts === 'object' && onDoneOrOpts !== null
        ? onDoneOrOpts
        : maybeOpts && typeof maybeOpts === 'object'
        ? maybeOpts
        : {};

    if (speechPrefix) {
      text = speechPrefix + text;
      speechPrefix = '';
    }

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      clearSpeechGuard();
      if (!state || !isHost) return;
      if (typeof onDone === 'function') onDone();
    };

    state.botText = text;
    state.botPromptKey = speechOpts.promptKey || null;
    state.botFollowUpKeys = Array.isArray(speechOpts.followUpKeys) ? speechOpts.followUpKeys : [];
    state.botDramaticReveal = Boolean(speechOpts.dramaticReveal);
    hooks.renderHost?.();
    syncStateToClients();

    const holdMs = Math.min(32000, Math.max(6000, String(text || '').length * 105));
    if (state.isPaused) {
      pausedSpeechGuard = { remainingMs: holdMs, fn: finish };
    } else {
      const sgId = setTimeout(finish, holdMs);
      speechGuardTimer = { id: sgId, endsAt: Date.now() + holdMs, fn: finish };
    }

    try {
      if (_win.AudioEngine && typeof _win.AudioEngine.speak === 'function') {
        _win.AudioEngine.speak(text, {
          promptKey: state.botPromptKey,
          followUpKeys: state.botFollowUpKeys,
          dramaticReveal: state.botDramaticReveal,
          onEnd: finish
        });
      } else {
        setTimeout(finish, 30);
      }
    } catch (_) {
      setTimeout(finish, 30);
    }
  }

  function requestReplayBot() {
    if (!state || !state.botText) return;
    try {
      _win.AudioEngine?.unlock?.();
      _win.AudioEngine?.speak?.(state.botText, {
        promptKey: state.botPromptKey || undefined,
        followUpKeys: Array.isArray(state.botFollowUpKeys) ? state.botFollowUpKeys : undefined,
        dramaticReveal: Boolean(state.botDramaticReveal),
        forceSpeak: true
      });
    } catch (_) {}
  }

  // ==================== ENTRY POINTS ====================
  function startHost({ resume = false } = {}) {
    cleanup();
    isHost = true;

    const snap = resume ? readHostSnapshot() : null;
    if (snap) {
      state = { ...createInitialHostState(), ...snap.state };
      if (!state.epoch) state.epoch = newEpoch();
      state.nightActions = { ...createNightActions(), ...(state.nightActions || {}) };
      state.nightVictims = { ...createNightVictims(), ...(state.nightVictims || {}) };
      state.settings = normalizeSettings(state.settings || loadSettings());
      state.roomCode = roomId();
      state.isPaused = false;
      state.pausedRemainingMs = 0;
      autoRolesMode = snap.autoRolesMode !== false;
      demoCounter = snap.demoCounter || 1;
      stepResolved = Boolean(snap.stepResolved);
      voteAllAnnounced = Boolean(snap.voteAllAnnounced);
      syncPlayerFlags();
    } else {
      autoRolesMode = true;
      demoCounter = 1;
      stepResolved = false;
      voteAllAnnounced = false;
      state = createInitialHostState();
    }

    const rn = netMod();
    if (rn && typeof rn.createSession === 'function') {
      session = rn.createSession({
        gameType: 'werewolf',
        isHost: true,
        onMessage: handleHostMessage,
        onStatus: (txt, ok) => updateNetBadge('ww-host-net-status', txt, ok),
        onPresence: () => {
          if (!state || !isHost) return;
          syncStateToClients();
          hooks.renderHost?.();
        },
        onSuperseded: () => {
          try {
            _win.AppUI?.showToast?.('Máy khác đã tiếp quản vai trò Quản Trò.');
            _win.AppUI?.clearSession?.();
          } catch (_) {}
          cleanup();
          try {
            _win.AppUI?.goHome?.();
          } catch (_) {}
        }
      });
    }

    if (session && typeof session.setBeaconInfo === 'function') {
      session.setBeaconInfo({ phase: state.phase, stateSeq: state.stateSeq, epoch: state.epoch });
    }
    try {
      _win.AppUI?.markSession?.('host', 'werewolf');
    } catch (_) {}

    hooks.bindHostEvents?.();
    hooks.renderHostShareBox?.();
    hooks.renderHost?.();
    try {
      _win.AppUI?.showView?.('view-werewolf-host');
    } catch (_) {}

    if (snap) {
      syncStateToClients();
      resumeHostFlow();
    } else {
      persistHost();
    }
  }

  function mergeClientLogDelta(payload) {
    if (!state || isHost || !payload) return;
    const incoming = Array.isArray(payload.entries)
      ? payload.entries
      : payload.entry
      ? [payload.entry]
      : [];
    if (!incoming.length) return;
    if (!Array.isArray(state.logs)) state.logs = [];
    const seenSeq = new Set(state.logs.map((e) => e && e.seq).filter((x) => typeof x === 'number'));
    let added = false;
    incoming.forEach((entry) => {
      if (!entry || entry.secret) return;
      if (typeof entry.seq === 'number') {
        if (seenSeq.has(entry.seq)) return;
        seenSeq.add(entry.seq);
      }
      state.logs.push(entry);
      added = true;
    });
    if (added) {
      state.logs.sort((a, b) => (a.seq || 0) - (b.seq || 0));
      if (state.logs.length > LOG_CAP) state.logs.splice(0, state.logs.length - LOG_CAP);
      hooks.renderPlayer?.();
    }
  }

  function joinAsPlayer(playerName, playerAvatarId) {
    cleanup();
    isHost = false;
    myName = playerName;
    try {
      myAvatarId = playerAvatarId || _win.AppUI?.getSavedAvatarId?.() || 'boy_smile';
    } catch (_) {
      myAvatarId = playerAvatarId || 'boy_smile';
    }
    resetClientLocalState();
    lastReceivedSeq = -1;
    lastJoinSentAt = 0;

    state = createInitialHostState();
    state.epoch = null;

    const rn = netMod();
    if (rn && typeof rn.createSession === 'function') {
      session = rn.createSession({
        gameType: 'werewolf',
        isHost: false,
        onMessage: handleClientMessage,
        onLogDelta: mergeClientLogDelta,
        onStatus: (txt, ok) => updateNetBadge('ww-pl-net-status', txt, ok),
        onConnected: () => announceJoin(true),
        onBeacon: (b) => {
          if (!state || !b || b.game !== 'werewolf') return;
          if (b.epoch !== state.epoch || b.stateSeq !== lastReceivedSeq) announceJoin(false);
        }
      });
    }
    try {
      _win.AppUI?.markSession?.('player', 'werewolf');
    } catch (_) {}

    hooks.bindPlayerEvents?.();
    try {
      _win.AppUI?.showView?.('view-werewolf-player');
    } catch (_) {}
    hooks.renderPlayer?.();
    announceJoin(true);
  }

  function announceJoin(force) {
    if (!session || isHost) return;
    const now = Date.now();
    if (!force && now - lastJoinSentAt < JOIN_THROTTLE_MS) return;
    lastJoinSentAt = now;
    session.send('WW_JOIN', { name: myName, avatarId: myAvatarId });
  }

  function resetClientLocalState() {
    clientSecret = null;
    witchInfo = null;
    alphaInfo = null;
    seerResult = null;
    detectiveResult = null;
    wolfSync = { wolfVotes: {}, wolfCount: 1, lock: null };
    wolfLockEndLocal = 0;
    cardRevealed = false;
    cardHasNews = false;
    newsNotifiedSig = '';
    if (peekTimer) {
      clearTimeout(peekTimer);
      peekTimer = null;
    }
    clientVoteLockEnd = 0;
    clientDayDeadlineEnd = 0;
    clientLastWordsEnd = 0;
    clientView = 'lobby';
  }

  function cleanup() {
    clearHostTimers();
    if (peekTimer) {
      clearTimeout(peekTimer);
      peekTimer = null;
    }
    speechPrefix = '';
    try {
      _win.AudioEngine?.stopSpeech?.();
      _win.AudioEngine?.stopNightAmbience?.();
    } catch (_) {}
    if (session) {
      try {
        session.destroy();
      } catch (_) {}
      session = null;
    }
    state = null;
    isHost = false;
  }

  // ==================== HOST LOBBY & SETTINGS ACTIONS ====================
  function addDemoPlayer() {
    if (!isHost || !state || state.phase !== 'LOBBY') return null;
    const demoNames = ['An', 'Bình', 'Chi', 'Dũng', 'Hà', 'Khánh', 'Linh', 'Minh', 'Ngọc', 'Phúc'];
    const name = `${demoNames[(demoCounter - 1) % demoNames.length]} (Test ${demoCounter})`;
    const avatarId = getRandomAvatar(state.players.length);
    demoCounter += 1;
    const demo = {
      id: `demo_${Date.now()}_${demoCounter}`,
      name,
      avatarId,
      ready: true,
      alive: true,
      isDemo: true,
      sheriff: false,
      silenced: false,
      shielded: false,
      roleId: null
    };
    state.players.push(demo);
    if (autoRolesMode && state.players.length >= 5) {
      state.rolesConfig = getRecommendedRoles(state.players.length);
    }
    persistHost();
    syncStateToClients();
    hooks.renderHost?.();
    return demo;
  }

  function kickPlayer(playerId) {
    if (!isHost || !state || state.phase !== 'LOBBY' || !playerId) return;
    state.players = state.players.filter((x) => x.id !== playerId);
    if (autoRolesMode && state.players.length >= 5) {
      state.rolesConfig = getRecommendedRoles(state.players.length);
    }
    persistHost();
    syncStateToClients();
    hooks.renderHost?.();
  }

  function updateRoleCount(roleId, delta, isAbsolute = false) {
    if (!isHost || !state || state.phase !== 'LOBBY' || !roleId) return;
    const roles = rolesMap();
    if (Object.keys(roles).length > 0 && !roles[roleId]) return;
    autoRolesMode = false;
    const max = roleId === 'werewolf' || roleId === 'villager' ? 10 : 1;
    const cur = Number(state.rolesConfig[roleId]) || 0;
    const next = isAbsolute ? Number(delta) || 0 : cur + (Number(delta) || 0);
    state.rolesConfig[roleId] = Math.max(0, Math.min(max, Math.floor(next)));
    persistHost();
    syncStateToClients();
    hooks.renderHost?.();
  }

  function autoFillRoles() {
    if (!isHost || !state || state.phase !== 'LOBBY') return;
    autoRolesMode = true;
    state.rolesConfig = getRecommendedRoles(Math.max(5, state.players.length));
    persistHost();
    syncStateToClients();
    hooks.renderHost?.();
  }

  function applyRolePreset(presetId) {
    if (!isHost || !state || state.phase !== 'LOBBY') return null;
    const fn = gd().getPresetWerewolfRoles;
    const count = Math.max(5, state.players.length);
    autoRolesMode = false;
    state.rolesConfig = typeof fn === 'function' ? fn(presetId, count) : getRecommendedRoles(count);
    persistHost();
    syncStateToClients();
    hooks.renderHost?.();
    return state.rolesConfig;
  }

  function changeSetting(patch) {
    if (!state || !isHost || state.phase !== 'LOBBY') return;
    state.settings = normalizeSettings({ ...settingsOf(), ...(patch || {}) });
    saveSettings();
    persistHost();
    syncStateToClients();
    hooks.renderHost?.();
  }

  function resetSettings() {
    changeSetting({ ...DEFAULT_SETTINGS });
  }

  // ==================== HOST MESSAGE HANDLER ====================
  function remapPlayerId(oldId, newId) {
    if (!state || oldId === newId) return;
    const swap = (id) => (id === oldId ? newId : id);
    const swapKeys = (obj) => {
      const out = {};
      Object.entries(obj || {}).forEach(([k, v]) => {
        out[swap(k)] = v;
      });
      return out;
    };
    const p = byId(oldId);
    if (p) p.id = newId;
    state.lovers = (state.lovers || []).map(swap);
    state.lastGuardedId = swap(state.lastGuardedId);
    state.seerHistory = (state.seerHistory || []).map(swap);
    state.elderLivesMap = swapKeys(state.elderLivesMap);
    state.pendingHunterId = swap(state.pendingHunterId);
    state.avengerPending = swap(state.avengerPending);
    state.silencedId = swap(state.silencedId);
    state.lastSilencedId = swap(state.lastSilencedId);
    state.sheriffId = swap(state.sheriffId);
    state.hunterQueue = (state.hunterQueue || []).map((item) =>
      typeof item === 'string' ? swap(item) : { ...item, id: swap(item.id) }
    );
    state.deaths = swapKeys(state.deaths);

    const votes = {};
    Object.entries(state.dayVotes || {}).forEach(([k, v]) => {
      votes[swap(k)] = swap(v);
    });
    state.dayVotes = votes;

    const sVotes = {};
    Object.entries(state.sheriffVotes || {}).forEach(([k, v]) => {
      sVotes[swap(k)] = swap(v);
    });
    state.sheriffVotes = sVotes;

    if (state.voteLock) state.voteLock.targetId = swap(state.voteLock.targetId);
    if (state.queuedHunterShot) {
      state.queuedHunterShot.hunterId = swap(state.queuedHunterShot.hunterId);
      state.queuedHunterShot.targetId = swap(state.queuedHunterShot.targetId);
    }
    if (state.detectiveCheck) {
      state.detectiveCheck.target1Id = swap(state.detectiveCheck.target1Id);
      state.detectiveCheck.target2Id = swap(state.detectiveCheck.target2Id);
    }
    if (state.nightVictims) {
      state.nightVictims.wolfTargetId = swap(state.nightVictims.wolfTargetId);
      state.nightVictims.witchSaveTargetId = swap(state.nightVictims.witchSaveTargetId);
      state.nightVictims.witchPoisonTargetId = swap(state.nightVictims.witchPoisonTargetId);
      state.nightVictims.serialKillerTargetId = swap(state.nightVictims.serialKillerTargetId);
      state.nightVictims.convertedWolfId = swap(state.nightVictims.convertedWolfId);
    }
    const na = state.nightActions;
    if (na) {
      na.cupidTargets = (na.cupidTargets || []).map(swap);
      na.guardTarget = swap(na.guardTarget);
      const wv = {};
      Object.entries(na.wolfVotes || {}).forEach(([k, v]) => {
        wv[swap(k)] = swap(v);
      });
      na.wolfVotes = wv;
      if (na.wolfLock) na.wolfLock.targetId = swap(na.wolfLock.targetId);
      na.wolfTarget = swap(na.wolfTarget);
      na.seerTarget = swap(na.seerTarget);
      na.detectiveTargets = (na.detectiveTargets || []).map(swap);
      na.witchPoisonTarget = swap(na.witchPoisonTarget);
      na.spellcasterTarget = swap(na.spellcasterTarget);
      na.serialKillerTarget = swap(na.serialKillerTarget);
    }
    (state.logs || []).forEach((e) => {
      if (Array.isArray(e.refs)) e.refs = e.refs.map(swap);
    });
    syncPlayerFlags();
  }

  function handleHostMessage(msg) {
    if (!state || !isHost || !msg) return;
    const { senderId, type } = msg;
    const payload = msg.payload || {};

    if (type === 'WW_JOIN') {
      const cleanName = String(payload.name || 'Người chơi').trim().slice(0, 20) || 'Người chơi';
      const avatarId = payload.avatarId || getRandomAvatar(state.players.length);
      let player = byId(senderId);
      let changed = false;

      if (!player) {
        if (state.phase !== 'LOBBY') {
          const byName = state.players.find((p) => p.name.toLowerCase() === cleanName.toLowerCase() && !p.isDemo);
          if (byName && !(session && session.isClientOnline && session.isClientOnline(byName.id))) {
            remapPlayerId(byName.id, senderId);
            if (payload.avatarId) byName.avatarId = payload.avatarId;
            resyncPlayer(byName, true);
            hooks.renderHost?.();
            return;
          }
          if (session) session.send('WW_STATE', getPublicState(state), senderId);
          return;
        }
        player = {
          id: senderId,
          name: cleanName,
          avatarId,
          ready: false,
          alive: true,
          isDemo: false,
          sheriff: false,
          silenced: false,
          shielded: false,
          roleId: null
        };
        state.players.push(player);
        if (autoRolesMode && state.players.length >= 5) {
          state.rolesConfig = getRecommendedRoles(state.players.length);
        }
        changed = true;
      } else if (state.phase === 'LOBBY') {
        if (player.name !== cleanName || (payload.avatarId && player.avatarId !== payload.avatarId)) changed = true;
        player.name = cleanName;
        if (payload.avatarId) player.avatarId = payload.avatarId;
      }

      resyncPlayer(player, changed);
      hooks.renderHost?.();
      return;
    }

    if (type === 'WW_RENAME') {
      const p = byId(senderId);
      if (p && state.phase === 'LOBBY') {
        p.name = String(payload.name || p.name).trim().slice(0, 20) || p.name;
        if (payload.avatarId) p.avatarId = payload.avatarId;
        syncStateToClients();
        hooks.renderHost?.();
      }
      return;
    }

    if (type === 'WW_READY') {
      const p = byId(senderId);
      if (p && state.phase === 'LOBBY') {
        p.ready = Boolean(payload.ready);
        syncStateToClients();
        hooks.renderHost?.();
      }
      return;
    }

    if (type === 'WW_LEAVE') {
      if (state.phase === 'LOBBY') {
        state.players = state.players.filter((x) => x.id !== senderId);
        if (autoRolesMode && state.players.length >= 5) {
          state.rolesConfig = getRecommendedRoles(state.players.length);
        }
        syncStateToClients();
        hooks.renderHost?.();
      }
      return;
    }

    // [B3] Khi đang tạm dừng: từ chối mọi thao tác chơi từ điện thoại
    if (state.isPaused) {
      return;
    }

    if ((type === 'WW_DAY_VOTE' || type === 'WW_VOTE') && state.phase === 'DAY') {
      if (!['day', 'dawn'].includes(state.flow && state.flow.key)) return;
      const voter = state.players.find((x) => x.id === senderId && x.alive);
      if (!voter) return;
      const tId = payload.targetId;
      if (tId === '__skip__' || state.players.some((x) => x.id === tId && x.alive && x.id !== senderId)) {
        if (state.dayVotes[senderId] === tId) return;
        state.dayVotes[senderId] = tId;
        state.voteLockPaused = false;
        evaluateDayVotes();
        syncStateToClients();
        hooks.renderHost?.();
      }
      return;
    }

    if (type === 'WW_SHERIFF_VOTE' && state.phase === 'SHERIFF_ELECTION') {
      castSheriffVote(senderId, payload.targetId);
      return;
    }

    if (type === 'WW_SHERIFF_TRANSFER' && state.phase === 'SHERIFF_TRANSFER') {
      if (senderId === state.sheriffId) {
        resolveSheriffTransfer(payload.targetId || null);
      }
      return;
    }

    if (type === 'WW_WOLF_PICK') {
      handleHostNightOrHunterAction(senderId, { ...payload, step: 'werewolf' });
      return;
    }

    if (type === 'WW_HUNTER_PICK') {
      handleHostNightOrHunterAction(senderId, { ...payload, step: payload.step || 'hunter' });
      return;
    }

    if (type === 'WW_ACTION') {
      handleHostNightOrHunterAction(senderId, payload);
    }
  }

  // ==================== DAY VOTING ====================
  function _clearVoteLock() {
    if (state) state.voteLock = null;
    clearNamedTimer('voteLock');
  }

  function cancelVoteLock() {
    if (!state) return;
    _clearVoteLock();
    if (isHost && state.phase === 'DAY') {
      state.voteLockPaused = true;
      addLog('Đã tạm dừng đếm ngược chốt phiếu.', { icon: '⏸' });
      syncStateToClients();
      hooks.renderHost?.();
      hooks.syncHostCountdown?.();
    }
  }

  function resetDayVoteState() {
    _clearVoteLock();
    if (!state) return;
    state.voteLockPaused = false;
    state.revoteUsed = false;
    state.dayVotes = {};
    state.dayDeadline = null;
    clearNamedTimer('dayDeadline');
    clearNamedTimer('dayWarn');
  }

  function armDayDeadline({ resumed = false } = {}) {
    if (!state || !isHost || state.phase !== 'DAY' || !state.flow || state.flow.key !== 'day') return;
    const limit = Number(settingsOf().voteTimeLimit) || 0;
    if (!limit) {
      state.dayDeadline = null;
      return;
    }
    if (!state.dayDeadline) state.dayDeadline = { endsAt: Date.now() + limit * 1000, warned: false };
    if (resumed && state.dayDeadline.endsAt < Date.now() + DAY_RESUME_GRACE_MS) {
      state.dayDeadline.endsAt = Date.now() + DAY_RESUME_GRACE_MS;
    }
    const endsAt = state.dayDeadline.endsAt;
    const remMs = state.isPaused && typeof state.dayDeadline.pausedRemainingMs === 'number'
      ? state.dayDeadline.pausedRemainingMs
      : endsAt - Date.now();
    persistHost();
    armTimer('dayDeadline', remMs, () => {
      const cur = state.dayDeadline;
      if (!cur || cur.endsAt !== endsAt || state.phase !== 'DAY' || !state.flow || state.flow.key !== 'day') return;
      onDayDeadline();
    });
    if (limit >= 90 && !state.dayDeadline.warned) {
      armTimer('dayWarn', remMs - DAY_WARN_MS, () => {
        const cur = state.dayDeadline;
        if (!cur || cur.endsAt !== endsAt || state.phase !== 'DAY' || !state.flow || state.flow.key !== 'day') return;
        cur.warned = true;
        persistHost();
        setBotSpeech('Chỉ còn 30 giây nữa là hết giờ bỏ phiếu! Ai chưa bỏ phiếu thì nhanh tay lên!', { promptKey: 'vote_30s' });
      });
    }
  }

  function onDayDeadline() {
    if (!state || !isHost || state.phase !== 'DAY' || !state.flow || state.flow.key !== 'day') return;
    state.dayDeadline = null;
    _clearVoteLock();
    const tally = getDayVoteTally();
    addLog('⏰ Hết giờ bỏ phiếu — chốt theo phiếu hiện có.', { icon: '⏰' });

    if (!tally.leaderId) {
      skipLynchToNight();
      return;
    }
    if (tally.isTie) {
      if (settingsOf().tieRule === 'revote' && !state.revoteUsed) startRevote(tally);
      else skipLynchToNight();
      return;
    }
    if (tally.leaderId === '__skip__') {
      skipLynchToNight();
      return;
    }
    if (byId(tally.leaderId) && byId(tally.leaderId).alive) lynchPlayer(tally.leaderId);
    else skipLynchToNight();
  }

  function startRevote(tally) {
    _clearVoteLock();
    state.revoteUsed = true;
    const names = tiedNames(tally);
    state.dayVotes = {};
    state.voteLockPaused = false;
    state.dayDeadline = null;
    addLog(`Hòa phiếu giữa ${joinNames(names)} — cả làng bỏ phiếu lại.`, { icon: '🤝' });
    try {
      _win.AudioEngine?.playVoteGavel?.();
    } catch (_) {}
    setBotSpeech(
      narrate(
        'vote_tie_revote',
        { names: joinNames(names) },
        `Hòa phiếu giữa ${joinNames(names)}! Mọi người thảo luận thêm và bỏ phiếu lại — lần này hòa nữa thì không ai bị treo cổ.`
      ),
      { promptKey: 'vote_tie_revote' }
    );
    armDayDeadline();
  }

  function armVoteLockTimer() {
    const lock = state && state.voteLock;
    if (!lock || state.phase !== 'DAY' || !state.flow || state.flow.key !== 'day') return;
    const endsAt = lock.endsAt;
    const remMs = state.isPaused && typeof lock.pausedRemainingMs === 'number'
      ? lock.pausedRemainingMs
      : Math.max(300, endsAt - Date.now());
    armTimer('voteLock', remMs, () => {
      const cur = state.voteLock;
      if (!cur || cur.endsAt !== endsAt || state.phase !== 'DAY' || !state.flow || state.flow.key !== 'day') return;
      if (cur.kind === 'lynch' && cur.targetId && byId(cur.targetId) && byId(cur.targetId).alive) {
        lynchPlayer(cur.targetId);
      } else {
        skipLynchToNight();
      }
    });
  }

  function tiedNames(tally) {
    return tally.entries
      .filter(([tId]) => (tally.weights[tId] || 0) === tally.topVotes)
      .map(([tId]) => (tId === '__skip__' ? 'phiếu trắng' : (byId(tId) || {}).name || '?'));
  }

  function evaluateDayVotes() {
    if (!state || !isHost || state.phase !== 'DAY' || !state.flow || state.flow.key !== 'day') return;
    const realAlive = state.players.filter((p) => p.alive && !p.isDemo);
    if (realAlive.length === 0) return;
    const allDone = realAlive.every((p) => Boolean(state.dayVotes[p.id]));
    if (!allDone) {
      if (state.voteLock) _clearVoteLock();
      return;
    }
    if (settingsOf().autoVoteLock === false) {
      if (state.voteLock) _clearVoteLock();
      return;
    }
    if (state.voteLockPaused) return;

    const tally = getDayVoteTally();
    if (!tally.leaderId) return;
    const prev = state.voteLock;
    let kind;
    let targetId = null;
    let text;

    let lockPromptKey = 'vote_all_done';
    if (tally.isTie && !state.revoteUsed && settingsOf().tieRule === 'revote') {
      startRevote(tally);
      return;
    }
    if (tally.isTie) {
      kind = 'skip';
      lockPromptKey = 'vote_tie_none';
      text = `Hòa phiếu${state.revoteUsed ? ' lần nữa' : ''}! Hôm nay không ai bị treo cổ. Bot sẽ chuyển sang đêm sau 8 giây — ai muốn đổi phiếu thì đổi ngay!`;
    } else if (tally.leaderId === '__skip__') {
      kind = 'skip';
      lockPromptKey = 'vote_all_skip';
      text = 'Đa số bỏ phiếu trắng! Hôm nay không ai bị treo cổ. Bot sẽ chuyển sang đêm sau 8 giây — ai muốn đổi phiếu thì đổi ngay!';
    } else {
      kind = 'lynch';
      targetId = tally.leaderId;
      lockPromptKey = 'vote_all_done';
      const leader = byId(targetId);
      text = `Tất cả đã bỏ phiếu! ${leader ? leader.name : ''} đang dẫn đầu với ${tally.topVotes} phiếu. Bot sẽ chốt sau 8 giây — ai muốn đổi phiếu thì đổi ngay!`;
    }

    state.voteLock = { endsAt: Date.now() + VOTE_LOCK_MS, kind, targetId };
    armVoteLockTimer();
    persistHost();
    if (!prev || prev.kind !== kind || prev.targetId !== targetId) {
      try {
        _win.AudioEngine?.playVoteGavel?.();
      } catch (_) {}
      setBotSpeech(text, { promptKey: lockPromptKey });
    }
  }

  function finalizeVoteNow() {
    if (!isHost || !state || state.phase !== 'DAY') return;
    const tally = getDayVoteTally();
    if (!tally.leaderId || tally.isTie || tally.leaderId === '__skip__') {
      skipLynchToNight();
      return;
    }
    if (byId(tally.leaderId) && byId(tally.leaderId).alive) {
      lynchPlayer(tally.leaderId);
    } else {
      skipLynchToNight();
    }
  }

  // ==================== HOST GAME LOGIC ====================
  function startNewGame() {
    if (!isHost || !state || state.phase !== 'LOBBY') return;
    try {
      _win.AudioEngine?.unlock?.();
    } catch (_) {}
    clearHostTimers();

    const pool = [];
    for (const [roleId, count] of Object.entries(state.rolesConfig || {})) {
      for (let i = 0; i < (Number(count) || 0); i++) pool.push(roleId);
    }
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    state.gameId = `ww_${Date.now()}`;
    state.elderLivesMap = {};
    state.players.forEach((p, idx) => {
      p.roleId = pool[idx] || 'villager';
      p.startRoleId = p.roleId;
      p.alive = true;
      p.sheriff = false;
      p.silenced = false;
      p.shielded = false;
      if (p.roleId === 'elder') state.elderLivesMap[p.id] = 2;
    });

    state.phase = 'ROLE_REVEAL';
    state.round = 0;
    state.nightNumber = 0;
    state.nightStep = null;
    state.lastGuardedId = null;
    state.seerHistory = [];
    state.lovers = [];
    state.alphaWolfConvertUsed = false;
    state.alphaWolfState = { curseUsed: false };
    state.witchPotions = { save: true, poison: true };
    state.witchState = { saveUsed: false, poisonUsed: false };
    state.nightActions = createNightActions();
    state.nightVictims = createNightVictims();
    state.silencedId = null;
    state.lastSilencedId = null;
    state.detectiveCheck = null;
    state.sheriffId = null;
    state.sheriffDone = false;
    state.sheriffVotes = {};
    state.pendingSheriffNext = null;
    state.lastWords = null;
    state.isPaused = false;
    state.pausedRemainingMs = 0;
    state.peacefulStreak = 0;
    resetDayVoteState();
    state.gameNo = (state.gameNo || 0) + 1;
    state.stepWatch = null;
    state.queuedHunterShot = null;
    state.pendingHunterId = null;
    state.pendingRevengeRole = null;
    state.avengerPending = null;
    state.pendingHunterNext = null;
    state.hunterQueue = [];
    state.winner = null;
    state.logs = [];
    state.logSeq = 0;
    state.deaths = {};
    state.lastDawnSummary = '';
    state._nightLastWordsDone = false;
    state._lynchLastWordsDone = false;
    state._nightDeadNames = [];
    state._lynchDeadNames = [];
    voteAllAnnounced = false;
    stepResolved = false;

    addLog('Ván chơi Ma Sói mới bắt đầu!', { icon: '🎬', phase: 'setup' });
    addLog(`Chia vai: ${state.players.map((p) => `${p.name} = ${roleNameOf(p)}`).join('; ')}`, {
      icon: '🃏',
      secret: true,
      phase: 'setup'
    });

    const st = settingsOf();
    if (JSON.stringify(st) !== JSON.stringify(DEFAULT_SETTINGS)) {
      const parts = [];
      if (st.voteTimeLimit) parts.push(`giới hạn bỏ phiếu ${st.voteTimeLimit} giây`);
      if (st.tieRule === 'none') parts.push('hòa phiếu thì không ai bị treo cổ');
      if (!st.autoVoteLock) parts.push('Quản Trò tự bấm chốt phiếu');
      if (st.nightPace !== 'normal') parts.push(`nhịp đêm ${NIGHT_PACE_CONFIG[st.nightPace].label.toLowerCase()}`);
      if (st.sheriffEnabled) parts.push('bật Trưởng Làng (1,5 phiếu)');
      if (st.lastWordsEnabled) parts.push(`Lời trăng trối ${st.lastWordsSeconds} giây`);
      if (st.storyTheme !== 'classic') parts.push(`cốt truyện: ${st.storyTheme}`);
      if (st.dynamicEvents) parts.push('lời dẫn biến thiên');
      if (st.campaignMode) parts.push('Đêm Liên Hoàn');
      if (parts.length) addLog(`Cài đặt ván: ${parts.join('; ')}.`, { icon: '⚙️', phase: 'setup' });
    }

    setFlow('role_reveal');
    syncStateToClients();
    state.players.forEach((p) => {
      if (!p.isDemo) sendSecretToPlayer(p);
    });
    hooks.renderHost?.();
    runRoleReveal();
  }

  function runRoleReveal() {
    setBotSpeech(
      'Trò chơi Ma Sói bắt đầu! Mọi người hãy nhấn và giữ thẻ bài trên điện thoại để xem vai trò bí mật của mình nhé.',
      () => {
        armStepTimer(() => {
          if (state && state.phase === 'ROLE_REVEAL') {
            beginNextNight();
          }
        }, 2400);
      },
      { promptKey: 'game_start' }
    );
  }

  function beginNextNight() {
    clearHostTimers();
    state.phase = 'NIGHT';
    state.nightNumber += 1;
    state.round = state.nightNumber;
    state.nightStep = null;
    state.silencedId = null;
    state.detectiveCheck = null;
    state.lastWords = null;
    state.nightVictims = createNightVictims();
    state._nightLastWordsDone = false;
    state._lynchLastWordsDone = false;
    state._nightDeadNames = [];
    state._lynchDeadNames = [];
    resetDayVoteState();
    state.stepWatch = null;
    state.nightActions = createNightActions();
    syncPlayerFlags();
    voteAllAnnounced = false;
    stepResolved = false;
    addLog(`Đêm thứ ${state.nightNumber} bắt đầu.`, { icon: '🌙' });
    setFlow('night_intro');
    runNightIntro();
  }

  function runNightIntro() {
    hooks.renderHost?.();
    const st = settingsOf();
    let introText;
    if (st.storyTheme === 'classic' && !st.dynamicEvents) {
      introText = `Đêm thứ ${state.nightNumber}. Trời tối rồi, xin mời tất cả mọi người nhắm mắt lại!`;
    } else {
      introText = narrate(
        'night_start',
        { round: state.nightNumber },
        `Đêm thứ ${state.nightNumber}. Trời tối rồi, xin mời tất cả mọi người nhắm mắt lại!`
      );
    }

    if (state.nightNumber === 1 && st.campaignMode) {
      try {
        const campOpen = gd().getCampaignOpening?.({
          storyTheme: st.storyTheme,
          dynamicEvents: st.dynamicEvents,
          campaignMode: st.campaignMode
        });
        if (campOpen) introText = `${campOpen} ${introText}`;
      } catch (_) {}
    }

    setBotSpeech(
      introText,
      () => {
        armStepTimer(() => advanceNightStep(), 1000);
      },
      { promptKey: 'night_start' }
    );
  }

  function getActiveNightOrder(cfg, nightNum) {
    const rolesCfg = cfg || (state && state.rolesConfig) || {};
    const nNum = nightNum !== undefined && nightNum !== null ? Number(nightNum) : (state && state.nightNumber) || 1;
    const order = [];
    if (nNum === 1 && (rolesCfg.cupid || 0) > 0) order.push('cupid');
    if ((rolesCfg.guard || 0) > 0) order.push('guard');
    order.push('werewolf');
    // [H3-Bug] Luôn đưa Sói Đầu Đàn vào thứ tự đêm nếu có trong rolesConfig (không phụ thuộc đã dùng nguyền chưa)
    if ((rolesCfg.alpha_wolf || 0) > 0) order.push('alpha_wolf');
    if ((rolesCfg.seer || 0) > 0) order.push('seer');
    if ((rolesCfg.detective || 0) > 0) order.push('detective');
    if ((rolesCfg.witch || 0) > 0) order.push('witch');
    if ((rolesCfg.spellcaster || 0) > 0) order.push('spellcaster');
    if ((rolesCfg.serial_killer || 0) > 0) order.push('serial_killer');
    return order;
  }

  function advanceNightStep() {
    clearHostTimers();
    skipStepFloorOnce = false;
    if (!state || state.phase !== 'NIGHT') return;

    const order = getActiveNightOrder();
    const currentIndex = state.nightStep ? order.indexOf(state.nightStep) : -1;
    const nextStep = order[currentIndex + 1];

    if (!nextStep) {
      resolveNightAndStartDay();
      return;
    }

    state.nightStep = nextStep;
    stepResolved = false;
    setFlow('night_step');
    syncStateToClients();
    hooks.renderHost?.();
    runNightStepPrompt(nextStep);
  }

  // ----- Nhắc người chơi chưa thao tác -----
  function ensureWatch(key) {
    if (!state.stepWatch || state.stepWatch.key !== key) {
      state.stepWatch = { key, startedAt: Date.now(), level: 0 };
      persistHost();
    }
  }

  function stepWaitingPlayer() {
    if (!state) return null;
    if (state.phase === 'NIGHT' && state.flow && state.flow.key === 'night_step' && !stepResolved) {
      const step = state.nightStep;
      const na = state.nightActions;
      if (step === 'werewolf') {
        if (na.wolfFirstPickAt || na.wolfLock) return null;
        return aliveWolves().find((w) => !w.isDemo) || null;
      }
      if (step === 'seer' && na.seerInspected) return null;
      if (step === 'detective' && na.detectiveChecked) return null;
      if (step === 'alpha_wolf') {
        if (state.alphaWolfConvertUsed || !na.wolfTarget) return null;
      }
      const p = state.players.find((x) => x.alive && x.roleId === step);
      return p && !p.isDemo ? p : null;
    }
    if (state.phase === 'HUNTER_REVENGE' && state.flow && state.flow.key === 'hunter_wait') {
      const h = byId(state.pendingHunterId);
      return h && !h.isDemo ? h : null;
    }
    return null;
  }

  function armReminders() {
    const watch = state && state.stepWatch;
    if (!watch || watch.level >= REMIND_AT_MS.length) return;
    const key = watch.key;
    armTimer('remind', Math.max(3000, watch.startedAt + REMIND_AT_MS[watch.level] - Date.now()), () => {
      const cur = state.stepWatch;
      if (!cur || cur.key !== key) return;
      const waiting = stepWaitingPlayer();
      if (waiting) {
        const step =
          state.phase === 'HUNTER_REVENGE'
            ? state.pendingRevengeRole === 'avenger'
              ? 'avenger'
              : 'hunter'
            : state.nightStep;
        const remindKey =
          step === 'hunter'
            ? 'hunter_trigger'
            : step === 'avenger'
            ? 'avenger_trigger'
            : step
            ? `call_${step}`
            : undefined;
        setBotSpeech(
          step === 'werewolf'
            ? 'Ma Sói ơi, hãy mở mắt dậy và chọn con mồi đêm nay!'
            : `${STEP_CALL_NAME[step] || 'Bạn'} ơi, hãy thao tác trên điện thoại của mình nhé!`,
          { promptKey: remindKey }
        );
      }
      cur.level += 1;
      persistHost();
      armReminders();
    });
  }

  // ----- Bầy Sói -----
  function wolfTally() {
    const alive = new Set(aliveWolves().map((w) => w.id));
    const tally = {};
    Object.entries(state.nightActions.wolfVotes || {}).forEach(([wId, tId]) => {
      if (alive.has(wId) && isValidPrey(tId)) tally[tId] = (tally[tId] || 0) + 1;
    });
    const max = Math.max(0, ...Object.values(tally));
    return { tally, max, topIds: Object.keys(tally).filter((id) => tally[id] === max && max > 0) };
  }

  function evaluateWolfVotes() {
    if (!state || state.phase !== 'NIGHT' || state.nightStep !== 'werewolf' || stepResolved) return;
    const na = state.nightActions;
    const wolves = aliveWolves();
    const real = wolves.filter((w) => !w.isDemo);
    if (real.length === 0) return;
    const leader = real.find((w) => isValidPrey(na.wolfVotes[w.id]));
    wolves
      .filter((w) => w.isDemo)
      .forEach((d) => {
        if (leader) na.wolfVotes[d.id] = na.wolfVotes[leader.id];
        else delete na.wolfVotes[d.id];
      });
    if (leader && !na.wolfFirstPickAt) na.wolfFirstPickAt = Date.now();
    const picks = wolves.map((w) => na.wolfVotes[w.id]);
    const agreed = picks.length > 0 && picks.every((t) => isValidPrey(t) && t === picks[0]) ? picks[0] : null;
    if (agreed) {
      if (!na.wolfLock || na.wolfLock.targetId !== agreed) {
        na.wolfLock = { targetId: agreed, endsAt: Date.now() + WOLF_LOCK_MS };
      }
    } else {
      na.wolfLock = null;
    }
    persistHost();
    armWolfTimers();
    sendWolfSyncAll();
  }

  function armWolfTimers() {
    if (!state || state.nightStep !== 'werewolf' || !state.flow || state.flow.key !== 'night_step' || stepResolved) return;
    const na = state.nightActions;
    const now = Date.now();
    if (na.wolfLock) {
      const lock = na.wolfLock;
      const lockRem = state.isPaused && typeof lock.pausedRemainingMs === 'number'
        ? lock.pausedRemainingMs
        : Math.max(400, lock.endsAt - now);
      armTimer('wolfLock', lockRem, () => {
        const cur = state.nightActions.wolfLock;
        if (!cur || cur.endsAt !== lock.endsAt) return;
        finishWerewolfStep(cur.targetId);
      });
    } else {
      clearNamedTimer('wolfLock');
    }
    if (na.wolfFirstPickAt) {
      if (!na.wolfNudged) {
        armTimer('wolfNudge', Math.max(400, na.wolfFirstPickAt + WOLF_NUDGE_MS - now), () => {
          const cur = state.nightActions;
          if (stepResolved || state.nightStep !== 'werewolf' || cur.wolfNudged || cur.wolfLock) return;
          cur.wolfNudged = true;
          persistHost();
          setBotSpeech('Bầy Sói ơi, hãy thống nhất chọn một con mồi nào!', { promptKey: 'wolf_nudge' });
        });
      }
      armTimer('wolfMajority', Math.max(400, na.wolfFirstPickAt + WOLF_MAJORITY_MS - now), () => {
        const cur = state.nightActions;
        if (stepResolved || state.nightStep !== 'werewolf' || state.flow.key !== 'night_step') return;
        if (cur.wolfLock) {
          finishWerewolfStep(cur.wolfLock.targetId);
          return;
        }
        const { topIds } = wolfTally();
        if (topIds.length === 0) return;
        const tied = topIds.length > 1;
        finishWerewolfStep(
          topIds[Math.floor(Math.random() * topIds.length)],
          tied
            ? 'Bầy Sói không thống nhất sau 75 giây, hòa phiếu nên Bot chọn ngẫu nhiên trong số bị chọn.'
            : 'Bầy Sói không thống nhất sau 75 giây, Bot chốt theo đa số.'
        );
      });
    }
  }

  function armSeerSafety() {
    if (!state || state.nightStep !== 'seer' || !state.flow || state.flow.key !== 'night_step' || stepResolved) return;
    const na = state.nightActions;
    if (!na.seerInspected || !na.seerResultAt) return;
    armTimer('seerSafety', Math.max(400, na.seerResultAt + SEER_SAFETY_MS - Date.now()), () => {
      if (stepResolved || state.nightStep !== 'seer' || state.flow.key !== 'night_step') return;
      addLog('Tiên Tri chưa bấm "xong" sau 12 giây — Bot tự đóng lượt.', { icon: '🔮', secret: true });
      finishSeerStep();
    });
  }

  function armDetectiveSafety() {
    if (!state || state.nightStep !== 'detective' || !state.flow || state.flow.key !== 'night_step' || stepResolved) return;
    const na = state.nightActions;
    if (!na.detectiveChecked || !na.detectiveResultAt) return;
    armTimer('detectiveSafety', Math.max(400, na.detectiveResultAt + DETECTIVE_SAFETY_MS - Date.now()), () => {
      if (stepResolved || state.nightStep !== 'detective' || state.flow.key !== 'night_step') return;
      addLog('Thám Tử chưa bấm "xong" sau 12 giây — Bot tự đóng lượt.', { icon: '🕵️‍♂️', secret: true });
      finishDetectiveStep();
    });
  }

  function runNightStepPrompt(step) {
    ensureWatch(`night${state.nightNumber}:${step}`);
    armReminders();
    if (step === 'cupid') runCupidStep();
    else if (step === 'guard') runGuardStep();
    else if (step === 'werewolf') runWerewolfStep();
    else if (step === 'alpha_wolf') runAlphaWolfStep();
    else if (step === 'seer') runSeerStep();
    else if (step === 'detective') runDetectiveStep();
    else if (step === 'witch') runWitchStep();
    else if (step === 'spellcaster') runSpellcasterStep();
    else if (step === 'serial_killer') runSerialKillerStep();
  }

  function closeNightStep(text, promptKey) {
    setFlow('night_step_done');
    const startedAt = (state.stepWatch && state.stepWatch.startedAt) || 0;
    const wait = skipStepFloorOnce ? 0 : Math.max(0, startedAt + paceCfg().floorMs - Date.now());
    skipStepFloorOnce = false;
    const speakClose = () => {
      if (!state || state.phase !== 'NIGHT' || !state.flow || state.flow.key !== 'night_step_done') return;
      setBotSpeech(
        text,
        () => {
          armStepTimer(() => advanceNightStep(), 900 + Math.round(Math.random() * 700));
        },
        { promptKey }
      );
    };
    if (wait > 0) armStepTimer(speakClose, wait);
    else speakClose();
  }

  function runCupidStep() {
    const aliveCupid = state.players.find((p) => p.alive && p.roleId === 'cupid');
    const st = settingsOf();
    const callTxt =
      st.storyTheme === 'classic' && !st.dynamicEvents
        ? 'Thần Tình Yêu ơi, hãy mở mắt dậy và chọn 2 người để ghép thành Cặp Đôi Tình Nhân!'
        : narrate('call_cupid', {}, 'Thần Tình Yêu ơi, hãy mở mắt dậy và chọn 2 người để ghép thành Cặp Đôi Tình Nhân!');
    setBotSpeech(
      callTxt,
      () => {
        if (!aliveCupid) {
          armStepTimer(() => finishCupidStep([]), fakeActDelay('cupid'));
        } else if (aliveCupid.isDemo) {
          const pool = [...state.players].filter((p) => p.alive);
          for (let i = pool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [pool[i], pool[j]] = [pool[j], pool[i]];
          }
          const pair = pool.length >= 2 ? [pool[0].id, pool[1].id] : [];
          armStepTimer(() => finishCupidStep(pair), fakeActDelay('cupid'));
        }
      },
      { promptKey: 'call_cupid' }
    );
  }

  function finishCupidStep(targetIds) {
    if (stepResolved || !state || state.phase !== 'NIGHT' || state.nightStep !== 'cupid') return;
    stepResolved = true;
    clearHostTimers();
    const valid = Array.isArray(targetIds)
      ? [...new Set(targetIds)].filter((id) => state.players.some((p) => p.id === id && p.alive)).slice(0, 2)
      : [];
    if (valid.length === 2) {
      state.lovers = valid;
      state.nightActions.cupidTargets = valid;
      const [a, b] = valid.map(byId);
      const cross = getPlayerSide(a.roleId) !== getPlayerSide(b.roleId);
      addLog(
        `Thần Tình Yêu ghép đôi ${describe(a)} và ${describe(b)} — ${cross ? 'KHÁC phe (có thể thành Phe Thứ 3)' : 'cùng phe'}.`,
        { icon: '💘', secret: true }
      );
      valid.forEach((id) => {
        const lp = byId(id);
        if (lp) sendSecretToPlayer(lp);
      });
    } else {
      addLog('Thần Tình Yêu không ghép đôi ai.', { icon: '💘', secret: true });
    }
    closeNightStep(narrate('sleep_cupid', {}, 'Thần Tình Yêu đã se duyên xong. Xin mời Thần Tình Yêu nhắm mắt lại.'), 'sleep_cupid');
  }

  function runGuardStep() {
    const aliveGuard = state.players.find((p) => p.alive && p.roleId === 'guard');
    const st = settingsOf();
    const callTxt =
      st.storyTheme === 'classic' && !st.dynamicEvents
        ? 'Bảo Vệ ơi, hãy mở mắt dậy và chọn một người để bảo vệ đêm nay.'
        : narrate('call_guard', {}, 'Bảo Vệ ơi, hãy mở mắt dậy và chọn một người để bảo vệ đêm nay.');
    setBotSpeech(
      callTxt,
      () => {
        if (!aliveGuard) {
          armStepTimer(() => finishGuardStep(null), fakeActDelay('guard'));
        } else if (aliveGuard.isDemo) {
          const candidates = state.players.filter((p) => p.alive && p.id !== state.lastGuardedId);
          const pick = candidates[Math.floor(Math.random() * candidates.length)];
          armStepTimer(() => finishGuardStep(pick ? pick.id : null), fakeActDelay('guard'));
        }
      },
      { promptKey: 'call_guard' }
    );
  }

  function finishGuardStep(targetId) {
    if (stepResolved || !state || state.phase !== 'NIGHT' || state.nightStep !== 'guard') return;
    stepResolved = true;
    clearHostTimers();
    state.nightActions.guardTarget = targetId || null;
    state.lastGuardedId = targetId || null;
    syncPlayerFlags();
    const t = targetId ? byId(targetId) : null;
    addLog(t ? `Bảo Vệ chọn bảo vệ ${describe(t)}.` : 'Bảo Vệ không bảo vệ ai.', { icon: '🛡️', secret: true });
    closeNightStep(narrate('sleep_guard', {}, 'Bảo Vệ đã chọn xong. Xin mời Bảo Vệ nhắm mắt lại.'), 'sleep_guard');
  }

  function runWerewolfStep() {
    const wolves = aliveWolves();
    const na = state.nightActions;
    if (!na.wolfStartedAt) na.wolfStartedAt = Date.now();
    if (wolves.some((w) => !w.isDemo)) evaluateWolfVotes();
    const st = settingsOf();
    const callTxt =
      st.storyTheme === 'classic' && !st.dynamicEvents
        ? 'Ma Sói ơi, hãy mở mắt dậy và chọn con mồi đêm nay!'
        : narrate('call_werewolf', {}, 'Ma Sói ơi, hãy mở mắt dậy và chọn con mồi đêm nay!');
    setBotSpeech(
      callTxt,
      () => {
        if (wolves.length === 0) {
          armStepTimer(() => finishWerewolfStep(null), fakeActDelay('werewolf'));
        } else if (wolves.every((w) => w.isDemo)) {
          const prey = state.players.filter((p) => p.alive && !isWolfRole(p.roleId));
          const pick = prey[Math.floor(Math.random() * prey.length)];
          armStepTimer(() => finishWerewolfStep(pick ? pick.id : null), fakeActDelay('werewolf'));
        }
      },
      { promptKey: 'call_werewolf' }
    );
  }

  function pickMajorityWolfTarget(lastTargetId) {
    const { topIds } = wolfTally();
    if (topIds.length) return topIds[Math.floor(Math.random() * topIds.length)];
    return isValidPrey(lastTargetId) ? lastTargetId : null;
  }

  function finishWerewolfStep(targetId, note) {
    if (stepResolved || !state || state.phase !== 'NIGHT' || state.nightStep !== 'werewolf') return;
    stepResolved = true;
    clearHostTimers();
    const na = state.nightActions;
    na.wolfTarget = targetId || null;
    na.wolfLock = null;
    const t = targetId ? byId(targetId) : null;
    const votesText = Object.entries(na.wolfVotes || {})
      .filter(([wId]) => !(byId(wId) || {}).isDemo)
      .map(([wId, tId]) => `${(byId(wId) || {}).name || '?'} → ${(byId(tId) || {}).name || '?'}`)
      .join('; ');
    addLog(
      t
        ? `Bầy Sói chốt cắn ${describe(t)}.${votesText ? ` Phiếu Sói: ${votesText}.` : ''}${note ? ` ${note}` : ''}`
        : 'Bầy Sói không chọn được con mồi nào.',
      { icon: '🐺', secret: true }
    );
    closeNightStep(narrate('sleep_werewolf', {}, 'Ma Sói đã chọn xong con mồi. Xin mời Ma Sói nhắm mắt lại.'), 'sleep_werewolf');
  }

  // [H3-Bug] Sói Đầu Đàn luôn được gọi nếu có trong rolesConfig và giữ thời lượng cố định khi không thể nguyền
  function runAlphaWolfStep() {
    const aliveAlphas = state.players.filter((p) => p.alive && p.roleId === 'alpha_wolf');
    const wolfTarget = state.nightActions.wolfTarget ? byId(state.nightActions.wolfTarget) : null;
    const canAct = !state.alphaWolfConvertUsed && aliveAlphas.length > 0 && Boolean(wolfTarget);

    if (canAct) {
      aliveAlphas.forEach((alpha) => {
        if (!alpha.isDemo) {
          sendAlphaInfoTo(alpha, {
            canConvert: true,
            alreadyUsed: false,
            targetId: wolfTarget.id,
            targetName: wolfTarget.name,
            victimId: wolfTarget.id,
            victimName: wolfTarget.name
          });
        }
      });
    } else if (aliveAlphas.length > 0) {
      aliveAlphas.forEach((alpha) => {
        if (!alpha.isDemo) {
          sendAlphaInfoTo(alpha, {
            canConvert: false,
            alreadyUsed: Boolean(state.alphaWolfConvertUsed),
            targetId: null,
            targetName: '',
            victimId: null,
            victimName: ''
          });
        }
      });
    }

    const st = settingsOf();
    const callTxt =
      st.storyTheme === 'classic' && !st.dynamicEvents
        ? 'Sói Đầu Đàn ơi, bạn có muốn dùng quyền Nguyền biến nạn nhân đêm nay thành Ma Sói không?'
        : narrate(
            'call_alpha_wolf',
            {},
            'Sói Đầu Đàn ơi, bạn có muốn dùng quyền Nguyền biến nạn nhân đêm nay thành Ma Sói không?'
          );

    setBotSpeech(
      callTxt,
      () => {
        if (!canAct) {
          armStepTimer(() => finishAlphaWolfStep(false), fakeActDelay('alpha_wolf'));
        } else if (aliveAlphas.every((p) => p.isDemo)) {
          armStepTimer(() => finishAlphaWolfStep(false), fakeActDelay('alpha_wolf'));
        }
      },
      { promptKey: 'call_alpha_wolf' }
    );
  }

  function finishAlphaWolfStep(convert) {
    if (stepResolved || !state || state.phase !== 'NIGHT' || state.nightStep !== 'alpha_wolf') return;
    stepResolved = true;
    clearHostTimers();
    const victim = state.nightActions.wolfTarget ? byId(state.nightActions.wolfTarget) : null;
    if (convert && !state.alphaWolfConvertUsed && victim) {
      state.nightActions.alphaConvert = true;
      addLog(`Sói Đầu Đàn quyết định NGUYỀN ${describe(victim)}.`, { icon: '🩸', secret: true });
    } else {
      addLog('Sói Đầu Đàn không dùng quyền Nguyền đêm nay.', { icon: '🩸', secret: true });
    }
    closeNightStep(narrate('sleep_alpha_wolf', {}, 'Sói Đầu Đàn đã quyết định xong. Xin mời Sói Đầu Đàn nhắm mắt lại.'), 'sleep_alpha_wolf');
  }

  function runSeerStep() {
    const aliveSeer = state.players.find((p) => p.alive && p.roleId === 'seer');
    if (aliveSeer && !aliveSeer.isDemo) sendSeerResultTo(aliveSeer);
    armSeerSafety();
    const st = settingsOf();
    const callTxt =
      st.storyTheme === 'classic' && !st.dynamicEvents
        ? 'Tiên Tri ơi, hãy mở mắt dậy và chọn một người để soi thân phận.'
        : narrate('call_seer', {}, 'Tiên Tri ơi, hãy mở mắt dậy và chọn một người để soi thân phận.');
    setBotSpeech(
      callTxt,
      () => {
        if (!aliveSeer || aliveSeer.isDemo) {
          armStepTimer(() => finishSeerStep(), fakeActDelay('seer'));
        }
      },
      { promptKey: 'call_seer' }
    );
  }

  function finishSeerStep() {
    if (stepResolved || !state || state.phase !== 'NIGHT' || state.nightStep !== 'seer') return;
    stepResolved = true;
    clearHostTimers();
    closeNightStep(narrate('sleep_seer', {}, 'Tiên Tri đã soi xong. Xin mời Tiên Tri nhắm mắt lại.'), 'sleep_seer');
  }

  // [G3] Thám Tử
  function runDetectiveStep() {
    const aliveDetective = state.players.find((p) => p.alive && p.roleId === 'detective');
    if (aliveDetective && !aliveDetective.isDemo && state.nightActions.detectiveChecked) {
      sendDetectiveResultTo(aliveDetective);
    }
    armDetectiveSafety();
    const st = settingsOf();
    const callTxt =
      st.storyTheme === 'classic' && !st.dynamicEvents
        ? 'Thám Tử ơi, hãy mở mắt dậy và chọn hai người để kiểm tra xem họ cùng phe hay khác phe.'
        : narrate(
            'call_detective',
            {},
            'Thám Tử ơi, hãy mở mắt dậy và chọn hai người để kiểm tra xem họ cùng phe hay khác phe.'
          );
    setBotSpeech(
      callTxt,
      () => {
        if (!aliveDetective || aliveDetective.isDemo) {
          armStepTimer(() => finishDetectiveStep(), fakeActDelay('detective'));
        }
      },
      { promptKey: 'call_detective' }
    );
  }

  function finishDetectiveStep() {
    if (stepResolved || !state || state.phase !== 'NIGHT' || state.nightStep !== 'detective') return;
    stepResolved = true;
    clearHostTimers();
    closeNightStep(narrate('sleep_detective', {}, 'Thám Tử đã kiểm tra xong. Xin mời Thám Tử nhắm mắt lại.'), 'sleep_detective');
  }

  function runWitchStep() {
    try {
      _win.AudioEngine?.playWitchPotion?.();
    } catch (_) {}
    const aliveWitch = state.players.find((p) => p.alive && p.roleId === 'witch');
    if (aliveWitch && !aliveWitch.isDemo) {
      sendWitchInfoTo(aliveWitch);
    }
    const st = settingsOf();
    const callTxt =
      st.storyTheme === 'classic' && !st.dynamicEvents
        ? 'Phù Thủy ơi, hãy mở mắt dậy để sử dụng bình thuốc của mình.'
        : narrate('call_witch', {}, 'Phù Thủy ơi, hãy mở mắt dậy để sử dụng bình thuốc của mình.');
    setBotSpeech(
      callTxt,
      () => {
        if (!aliveWitch || aliveWitch.isDemo) {
          armStepTimer(() => finishWitchStep(false, null), fakeActDelay('witch'));
        }
      },
      { promptKey: 'call_witch' }
    );
  }

  function finishWitchStep(useSave, poisonTargetId) {
    if (stepResolved || !state || state.phase !== 'NIGHT' || state.nightStep !== 'witch') return;
    stepResolved = true;
    clearHostTimers();
    let didSave = false;
    let didPoison = false;
    if (useSave && state.witchPotions.save && !state.nightActions.alphaConvert) {
      state.nightActions.witchSave = true;
      state.witchPotions.save = false;
      didSave = true;
      const v = state.nightActions.wolfTarget ? byId(state.nightActions.wolfTarget) : null;
      addLog(`Phù Thủy dùng Bình Cứu${v ? ` cứu ${describe(v)}` : ' (không có nạn nhân)'}.`, { icon: '💚', secret: true });
    }
    if (poisonTargetId && state.witchPotions.poison) {
      state.nightActions.witchPoisonTarget = poisonTargetId;
      state.witchPotions.poison = false;
      didPoison = true;
      addLog(`Phù Thủy dùng Bình Độc lên ${describe(byId(poisonTargetId))}.`, { icon: '☠️', secret: true });
    }
    state.witchState = {
      saveUsed: !state.witchPotions.save,
      poisonUsed: !state.witchPotions.poison
    };
    syncPlayerFlags();
    if (!didSave && !didPoison) addLog('Phù Thủy không dùng bình nào đêm nay.', { icon: '🧪', secret: true });

    try {
      if (didSave && didPoison) {
        _win.AudioEngine?.playWitchSave?.();
        setTimeout(() => {
          try {
            _win.AudioEngine?.playWitchPoison?.();
          } catch (_) {}
        }, 600);
      } else if (didSave) {
        _win.AudioEngine?.playWitchSave?.();
      } else if (didPoison) {
        _win.AudioEngine?.playWitchPoison?.();
      }
    } catch (_) {}

    closeNightStep(narrate('sleep_witch', {}, 'Phù Thủy đã hành động xong. Xin mời Phù Thủy nhắm mắt lại.'), 'sleep_witch');
  }

  // [G3] Pháp Sư Câm
  function runSpellcasterStep() {
    const aliveSC = state.players.find((p) => p.alive && p.roleId === 'spellcaster');
    const st = settingsOf();
    const callTxt =
      st.storyTheme === 'classic' && !st.dynamicEvents
        ? 'Pháp Sư Câm ơi, hãy thức dậy chọn một người bị khóa miệng vào ngày mai.'
        : narrate('call_spellcaster', {}, 'Pháp Sư Câm ơi, hãy thức dậy chọn một người bị khóa miệng vào ngày mai.');
    setBotSpeech(
      callTxt,
      () => {
        if (!aliveSC) {
          armStepTimer(() => finishSpellcasterStep(null), fakeActDelay('spellcaster'));
        } else if (aliveSC.isDemo) {
          const candidates = state.players.filter((p) => p.alive && p.id !== state.lastSilencedId);
          const pick = candidates[Math.floor(Math.random() * candidates.length)];
          armStepTimer(() => finishSpellcasterStep(pick ? pick.id : null), fakeActDelay('spellcaster'));
        }
      },
      { promptKey: 'call_spellcaster' }
    );
  }

  function finishSpellcasterStep(targetId) {
    if (stepResolved || !state || state.phase !== 'NIGHT' || state.nightStep !== 'spellcaster') return;
    stepResolved = true;
    clearHostTimers();
    state.nightActions.spellcasterTarget = targetId || null;
    const t = targetId ? byId(targetId) : null;
    addLog(
      t ? `Pháp Sư Câm chọn khóa miệng ${describe(t)} vào ngày mai.` : 'Pháp Sư Câm không khóa miệng ai.',
      { icon: '🤐', secret: true }
    );
    closeNightStep(narrate('sleep_spellcaster', {}, 'Pháp Sư Câm đã chọn xong. Xin mời Pháp Sư Câm nhắm mắt lại.'), 'sleep_spellcaster');
  }

  function runSerialKillerStep() {
    const aliveSK = state.players.find((p) => p.alive && p.roleId === 'serial_killer');
    const st = settingsOf();
    const callTxt =
      st.storyTheme === 'classic' && !st.dynamicEvents
        ? 'Sát Nhân Độc Hành ơi, hãy mở mắt dậy và chọn 1 mục tiêu để ám sát đêm nay.'
        : narrate(
            'call_serial_killer',
            {},
            'Sát Nhân Độc Hành ơi, hãy mở mắt dậy và chọn 1 mục tiêu để ám sát đêm nay.'
          );
    setBotSpeech(
      callTxt,
      () => {
        if (!aliveSK) {
          armStepTimer(() => finishSerialKillerStep(null), fakeActDelay('serial_killer'));
        } else if (aliveSK.isDemo) {
          const candidates = state.players.filter((p) => p.alive && p.id !== aliveSK.id);
          const pick = candidates[Math.floor(Math.random() * candidates.length)];
          armStepTimer(() => finishSerialKillerStep(pick ? pick.id : null), fakeActDelay('serial_killer'));
        }
      },
      { promptKey: 'call_serial_killer' }
    );
  }

  function finishSerialKillerStep(targetId) {
    if (stepResolved || !state || state.phase !== 'NIGHT' || state.nightStep !== 'serial_killer') return;
    stepResolved = true;
    clearHostTimers();
    state.nightActions.serialKillerTarget = targetId || null;
    const t = targetId ? byId(targetId) : null;
    addLog(t ? `Sát Nhân chọn ám sát ${describe(t)}.` : 'Sát Nhân không ám sát ai.', { icon: '🗡️', secret: true });
    closeNightStep(narrate('sleep_serial_killer', {}, 'Sát Nhân đã chọn xong mục tiêu. Xin mời Sát Nhân nhắm mắt lại.'), 'sleep_serial_killer');
  }

  function skipNightStep() {
    if (!isHost || !state || state.phase !== 'NIGHT' || !state.flow || state.flow.key !== 'night_step') return;
    skipStepFloorOnce = true;
    if (state.nightStep === 'cupid') finishCupidStep([]);
    else if (state.nightStep === 'guard') finishGuardStep(null);
    else if (state.nightStep === 'werewolf') {
      const prey = state.players.find((p) => p.alive && !isWolfRole(p.roleId));
      finishWerewolfStep(pickMajorityWolfTarget(prey ? prey.id : null));
    } else if (state.nightStep === 'alpha_wolf') finishAlphaWolfStep(false);
    else if (state.nightStep === 'seer') finishSeerStep();
    else if (state.nightStep === 'detective') finishDetectiveStep();
    else if (state.nightStep === 'witch') finishWitchStep(false, null);
    else if (state.nightStep === 'spellcaster') finishSpellcasterStep(null);
    else if (state.nightStep === 'serial_killer') finishSerialKillerStep(null);
  }

  function handleHostNightOrHunterAction(senderId, payload) {
    const player = byId(senderId);
    if (!player || !payload || state.isPaused) return;
    const actionStep = payload.step || payload.role;

    if (state.phase === 'NIGHT') {
      if (!state.flow || state.flow.key !== 'night_step') return;

      if (state.nightStep === 'cupid' && actionStep === 'cupid' && player.alive && player.roleId === 'cupid') {
        const list = Array.isArray(payload.targetIds) ? payload.targetIds : [];
        if (list.length !== 2 || list[0] === list[1]) return;
        finishCupidStep(list);
        return;
      }

      if (state.nightStep === 'guard' && actionStep === 'guard' && player.alive && player.roleId === 'guard') {
        const tId = payload.targetId || null;
        if (tId) {
          const guardTarget = state.players.find((p) => p.id === tId && p.alive);
          if (!guardTarget || tId === state.lastGuardedId) return;
        }
        finishGuardStep(tId);
        return;
      }

      if (state.nightStep === 'werewolf' && actionStep === 'werewolf' && player.alive && isWolfRole(player.roleId)) {
        const prey = state.players.find((p) => p.id === payload.targetId && p.alive && !isWolfRole(p.roleId));
        if (!prey) return;
        if (state.nightActions.wolfVotes[senderId] === prey.id) {
          sendWolfSync(player);
          return;
        }
        state.nightActions.wolfVotes[senderId] = prey.id;
        evaluateWolfVotes();
        return;
      }

      if (
        state.nightStep === 'alpha_wolf' &&
        actionStep === 'alpha_wolf' &&
        player.alive &&
        player.roleId === 'alpha_wolf'
      ) {
        if (state.alphaWolfConvertUsed || !state.nightActions.wolfTarget) return;
        finishAlphaWolfStep(Boolean(payload.convert));
        return;
      }

      if (state.nightStep === 'seer' && actionStep === 'seer' && player.alive && player.roleId === 'seer') {
        if ((payload.action === 'inspect' || (!payload.done && payload.targetId)) && payload.targetId) {
          if (state.nightActions.seerInspected) return;
          if (!Array.isArray(state.seerHistory)) state.seerHistory = [];
          if (state.seerHistory.includes(payload.targetId)) return;
          const target = state.players.find((p) => p.id === payload.targetId && p.alive && p.id !== senderId);
          if (target) {
            state.nightActions.seerInspected = true;
            state.nightActions.seerResultAt = Date.now();
            state.nightActions.seerTarget = target.id;
            state.seerHistory.push(target.id);
            addLog(
              `Tiên Tri ${player.name} soi ${describe(target)}: ${isWolfRole(target.roleId) ? 'thuộc phe Ma Sói' : 'thuộc phe Dân Làng'}.`,
              { icon: '🔮', secret: true }
            );
            syncStateToClients();
            sendSeerResultTo(player);
            armSeerSafety();
          }
        } else if (payload.action === 'done' || payload.done === true) {
          finishSeerStep();
        }
        return;
      }

      if (
        state.nightStep === 'detective' &&
        actionStep === 'detective' &&
        player.alive &&
        player.roleId === 'detective'
      ) {
        if (payload.action === 'done' || payload.done === true) {
          finishDetectiveStep();
          return;
        }
        if (state.nightActions.detectiveChecked) return;
        const t1 = payload.target1Id || (Array.isArray(payload.targetIds) ? payload.targetIds[0] : null);
        const t2 = payload.target2Id || (Array.isArray(payload.targetIds) ? payload.targetIds[1] : null);
        if (!t1 || !t2 || t1 === t2 || t1 === senderId || t2 === senderId) return;
        const p1 = state.players.find((p) => p.id === t1 && p.alive);
        const p2 = state.players.find((p) => p.id === t2 && p.alive);
        if (!p1 || !p2) return;

        const sameTeam = getPlayerSide(p1.roleId) === getPlayerSide(p2.roleId);
        state.nightActions.detectiveChecked = true;
        state.nightActions.detectiveResultAt = Date.now();
        state.nightActions.detectiveTargets = [p1.id, p2.id];
        state.detectiveCheck = {
          target1Id: p1.id,
          target1Name: p1.name,
          target2Id: p2.id,
          target2Name: p2.name,
          target1: p1.name,
          target2: p2.name,
          sameTeam
        };
        addLog(
          `Thám Tử ${player.name} đối chiếu ${describe(p1)} và ${describe(p2)}: ${sameTeam ? 'CÙNG PHE' : 'KHÁC PHE'}.`,
          { icon: '🕵️‍♂️', secret: true }
        );
        syncStateToClients();
        sendDetectiveResultTo(player);
        armDetectiveSafety();
        return;
      }

      if (state.nightStep === 'witch' && actionStep === 'witch' && player.alive && player.roleId === 'witch') {
        const wantSave = Boolean(payload.useSave);
        let poisonId = payload.poisonTargetId || null;
        if (poisonId) {
          const validPoison = state.players.find((p) => p.id === poisonId && p.alive && p.id !== senderId);
          if (!validPoison || (wantSave && poisonId === state.nightActions.wolfTarget)) {
            poisonId = null;
          }
        }
        finishWitchStep(wantSave, poisonId);
        return;
      }

      if (
        state.nightStep === 'spellcaster' &&
        actionStep === 'spellcaster' &&
        player.alive &&
        player.roleId === 'spellcaster'
      ) {
        const tId = payload.targetId || null;
        if (tId) {
          const target = state.players.find((p) => p.id === tId && p.alive);
          if (!target) return;
          if (tId === state.lastSilencedId) {
            const hasOther = state.players.some((p) => p.alive && p.id !== state.lastSilencedId);
            if (hasOther) return;
          }
          finishSpellcasterStep(target.id);
        } else {
          finishSpellcasterStep(null);
        }
        return;
      }

      if (
        state.nightStep === 'serial_killer' &&
        actionStep === 'serial_killer' &&
        player.alive &&
        player.roleId === 'serial_killer'
      ) {
        const target = state.players.find((p) => p.id === payload.targetId && p.alive && p.id !== senderId);
        finishSerialKillerStep(target ? target.id : null);
        return;
      }
    }

    if (
      state.phase === 'HUNTER_REVENGE' &&
      (actionStep === 'hunter' || actionStep === 'avenger') &&
      senderId === state.pendingHunterId
    ) {
      let targetId = payload.targetId || null;
      if (targetId) {
        const validShot = state.players.find((p) => p.id === targetId && p.alive && p.id !== senderId);
        if (!validShot) return;
      }
      if (!state.flow || state.flow.key !== 'hunter_wait') {
        state.queuedHunterShot = { hunterId: senderId, targetId };
        persistHost();
        return;
      }
      resolveHunterShot(targetId);
    }
  }

  // ==================== DEATHS, REVENGE, DAWN & LYNCH ====================
  function killPlayers(list, ctx = {}) {
    const phase = ctx.phase || 'night';
    const dead = [];
    const chain = [];
    const kill = (p, cause) => {
      p.alive = false;
      state.deaths[p.id] = { round: state.nightNumber, phase, cause };
      dead.push(p);
    };
    (list || []).forEach(({ id, cause }) => {
      const p = byId(id);
      if (p && p.alive) kill(p, cause);
    });
    if (!ctx.noChain && Array.isArray(state.lovers) && state.lovers.length === 2) {
      const pA = byId(state.lovers[0]);
      const pB = byId(state.lovers[1]);
      if (pA && pB) {
        let pair = null;
        if (!pA.alive && pB.alive) pair = { partner: pB, diedFor: pA };
        else if (!pB.alive && pA.alive) pair = { partner: pA, diedFor: pB };
        if (pair) {
          kill(pair.partner, 'lover');
          chain.push(pair);
          addLog(`${pair.partner.name} chết theo người yêu ${pair.diedFor.name} vì tình!`, {
            icon: '💔',
            phase: phase === 'night' ? 'night' : 'day'
          });
        }
      }
    }
    return { dead, chain };
  }

  function chainText(chain) {
    return chain.length > 0
      ? ` ${chain.map((d) => `${d.partner.name} chết theo người yêu ${d.diedFor.name}!`).join(' ')}`
      : '';
  }

  function normalizeRevengeEntry(entry) {
    if (!entry) return null;
    if (typeof entry === 'string') return { id: entry, role: 'hunter' };
    return { id: entry.id, role: entry.role === 'avenger' ? 'avenger' : 'hunter' };
  }

  function setupRevengeQueue(entries, nextAfter) {
    const normalized = (entries || []).map(normalizeRevengeEntry).filter(Boolean);
    if (!normalized.length) return;
    state.hunterQueue = normalized.slice(1);
    state.pendingHunterId = normalized[0].id;
    state.pendingRevengeRole = normalized[0].role;
    state.avengerPending = state.pendingRevengeRole === 'avenger' ? normalized[0].id : null;
    state.pendingHunterNext = nextAfter;
    state.phase = 'HUNTER_REVENGE';
  }

  function setupHunters(hunters, next) {
    setupRevengeQueue(
      (hunters || []).map((h) => ({ id: typeof h === 'string' ? h : h.id, role: 'hunter' })),
      next
    );
  }

  function resolveNightAndStartDay() {
    clearHostTimers();
    const { guardTarget, wolfTarget, alphaConvert, witchSave, witchPoisonTarget, serialKillerTarget, spellcasterTarget } =
      state.nightActions;

    const kills = [];
    let elderSurvivedHint = false;
    let convertedWolfId = null;

    if (alphaConvert && wolfTarget && wolfTarget !== guardTarget) {
      const converted = state.players.find((p) => p.id === wolfTarget && p.alive);
      if (converted) {
        const before = roleNameOf(converted);
        converted.roleId = 'werewolf';
        converted.convertedReason = 'alpha';
        state.alphaWolfConvertUsed = true;
        state.alphaWolfState = { curseUsed: true };
        convertedWolfId = converted.id;
        addLog(`Sói Đầu Đàn nguyền hóa thành công ${converted.name} (${before}) thành Ma Sói!`, {
          icon: '🩸',
          secret: true
        });
        const loverSet = new Set(Array.isArray(state.lovers) && state.lovers.includes(converted.id) ? state.lovers : []);
        state.players.forEach((p) => {
          if (p.id === converted.id || isWolfRole(p.roleId) || loverSet.has(p.id)) {
            sendSecretToPlayer(p);
          }
        });
      }
    } else if (wolfTarget) {
      const victim = byId(wolfTarget);
      if (alphaConvert) {
        addLog(`Lời nguyền thất bại: ${victim ? victim.name : '?'} được Bảo Vệ che chở.`, { icon: '🩸', secret: true });
      }
      if (wolfTarget === guardTarget) {
        addLog(`${victim ? describe(victim) : '?'} bị Sói cắn nhưng được Bảo Vệ che chở nên sống sót.`, {
          icon: '🛡️',
          secret: true
        });
      } else if (witchSave) {
        addLog(`${victim ? describe(victim) : '?'} bị Sói cắn nhưng được Phù Thủy cứu sống.`, {
          icon: '💚',
          secret: true
        });
      } else if (victim && victim.alive && victim.roleId === 'cursed_villager') {
        // [G3] Bán Sói bị Sói cắn -> không chết, thức tỉnh thành Ma Sói
        victim.roleId = 'werewolf';
        victim.convertedReason = 'cursed';
        convertedWolfId = victim.id;
        addLog(`🐺 ${victim.name} (Bán Sói) bị Ma Sói cắn nhưng không chết — đã thức tỉnh thành Ma Sói!`, {
          icon: '🌘',
          secret: true
        });
        sendSecretToPlayer(victim, { converted: true, convertedReason: 'cursed' });
        const loverSet = new Set(Array.isArray(state.lovers) && state.lovers.includes(victim.id) ? state.lovers : []);
        state.players.forEach((p) => {
          if ((p.id !== victim.id && isWolfRole(p.roleId)) || (p.id !== victim.id && loverSet.has(p.id))) {
            sendSecretToPlayer(p);
          }
        });
      } else if (victim && victim.alive && victim.roleId === 'elder' && (state.elderLivesMap[victim.id] || 0) > 1) {
        state.elderLivesMap[victim.id] = 1;
        elderSurvivedHint = true;
        addLog(`Già Làng ${victim.name} bị Sói cắn nhưng nhờ lớp giáp đầu tiên vẫn bình an!`, {
          icon: '🧓',
          secret: true
        });
      } else {
        kills.push({ id: wolfTarget, cause: 'wolf' });
      }
    }

    if (witchPoisonTarget) kills.push({ id: witchPoisonTarget, cause: 'poison' });
    if (serialKillerTarget) {
      if (serialKillerTarget !== guardTarget) {
        kills.push({ id: serialKillerTarget, cause: 'serial_killer' });
      } else {
        addLog(`Sát Nhân ám sát ${describe(byId(serialKillerTarget))} nhưng được Bảo Vệ che chở.`, {
          icon: '🛡️',
          secret: true
        });
      }
    }

    state.nightVictims = {
      wolfTargetId: wolfTarget || null,
      witchSaveTargetId: witchSave ? wolfTarget || null : null,
      witchPoisonTargetId: witchPoisonTarget || null,
      serialKillerTargetId: serialKillerTarget || null,
      convertedWolfId
    };

    const { dead: deadPlayers, chain: loverDeaths } = killPlayers(kills, { phase: 'night' });
    deadPlayers.forEach((p) => {
      const cause = state.deaths[p.id].cause;
      if (CAUSE_TEXT[cause]) addLog(`${describe(p)} ${CAUSE_TEXT[cause]} và chết trong đêm.`, { icon: '💀', secret: true });
    });

    if (deadPlayers.length === 0) {
      state.peacefulStreak = (state.peacefulStreak || 0) + 1;
    } else {
      state.peacefulStreak = 0;
    }

    // [G3] Pháp Sư Câm khóa miệng lúc bình minh
    const scTarget = spellcasterTarget ? byId(spellcasterTarget) : null;
    if (scTarget && scTarget.alive) {
      state.silencedId = scTarget.id;
      state.lastSilencedId = scTarget.id;
      addLog(`🔇 ${scTarget.name} bị Pháp Sư Câm khóa miệng — hôm nay không được lên tiếng!`, {
        icon: '🤐',
        phase: 'day'
      });
    } else {
      state.silencedId = null;
    }
    syncPlayerFlags();

    try {
      _win.AudioEngine?.playRoosterDawn?.();
      if (deadPlayers.length > 0) {
        _win.SceneFX?.flash?.('rgba(244, 63, 94, 0.2)');
        setTimeout(() => {
          try {
            _win.AudioEngine?.playDeath?.();
          } catch (_) {}
        }, 260);
      }
    } catch (_) {}

    const st = settingsOf();
    const aliveCount = state.players.filter((p) => p.alive).length;
    const loverExtra = chainText(loverDeaths).trimEnd();
    const loverNames = loverDeaths.length > 0 ? joinNames([loverDeaths[0].partner.name, loverDeaths[0].diedFor.name]) : '';

    let announcement = '';
    if (deadPlayers.length === 0) {
      if (st.storyTheme === 'classic' && !st.dynamicEvents) {
        announcement = 'Trời sáng rồi, xin mời mọi người mở mắt ra! Đêm qua là một đêm bình yên, không có ai thiệt mạng.';
      } else {
        announcement = narrate(
          'morning_peaceful',
          { aliveCount, peacefulStreak: state.peacefulStreak, round: state.nightNumber },
          'Trời sáng rồi, xin mời mọi người mở mắt ra! Đêm qua là một đêm bình yên, không có ai thiệt mạng.'
        );
      }
      state.lastDawnSummary = elderSurvivedHint
        ? '☀️ Đêm qua bình yên (Có người vừa thoát chết trong gang tấc!).'
        : '☀️ Đêm qua bình yên — Không có ai thiệt mạng.';
      addLog('Đêm qua bình yên, không ai thiệt mạng.', { icon: '☀️', phase: 'day' });
    } else {
      const deadNamesArr = deadPlayers.map((p) => p.name);
      const names = deadNamesArr.join(', ');
      if (st.storyTheme === 'classic' && !st.dynamicEvents) {
        announcement = `Trời sáng rồi, xin mời mọi người mở mắt ra! Đêm qua có ${deadPlayers.length} người đã thiệt mạng, đó là: ${names}!${loverExtra ? ` Trong đó ${loverExtra}` : ''}`;
      } else {
        announcement = narrate(
          'morning_deaths',
          {
            deadNames: deadNamesArr,
            names,
            deadCount: deadPlayers.length,
            aliveCount,
            round: state.nightNumber,
            loverSuicide: loverDeaths.length > 0,
            loverNames
          },
          `Trời sáng rồi, xin mời mọi người mở mắt ra! Đêm qua có ${deadPlayers.length} người đã thiệt mạng, đó là: ${names}!${loverExtra ? ` Trong đó ${loverExtra}` : ''}`
        );
      }
      state.lastDawnSummary = `💀 Đêm qua có ${deadPlayers.length} người thiệt mạng: ${names}.${loverExtra ? ` ${loverExtra}` : ''}`;
      addLog(`Đêm qua ${deadPlayers.length} người thiệt mạng: ${names}.`, { icon: '💀', phase: 'day' });
    }

    const dawnFollowUpKeys = [];
    if (scTarget && scTarget.alive) {
      const silencedMsg = narrate(
        'dawn_silenced_addendum',
        { name: scTarget.name, silencedName: scTarget.name },
        `Chú ý! Hôm nay ${scTarget.name} đã bị Pháp Sư Câm khóa miệng, tuyệt đối không được nói chuyện hay ra dấu!`
      );
      if (silencedMsg) announcement += ` ${silencedMsg}`;
      state.lastDawnSummary += ` 🤐 ${scTarget.name} bị khóa miệng hôm nay.`;
      dawnFollowUpKeys.push('night_silenced');
    }

    if (state.nightNumber === 1 && (state.rolesConfig.cupid || 0) > 0 && (state.lovers || []).length === 2) {
      announcement +=
        ' Đêm qua Thần Tình Yêu đã se duyên cho một cặp đôi. Mọi người hãy giữ thẻ bài để kiểm tra xem mình có được se duyên không nhé!';
      dawnFollowUpKeys.push('cupid_paired_notice');
    }

    const hunters = deadPlayers.filter((p) => p.roleId === 'hunter');
    resetDayVoteState();
    state.stepWatch = null;
    state._nightDeadNames = deadPlayers.map((p) => p.name);
    state._nightLastWordsDone = false;
    voteAllAnnounced = false;
    if (hunters.length > 0) {
      setupHunters(hunters, 'DAY');
    } else {
      state.phase = 'DAY';
    }
    const dawnPromptKey = deadPlayers.length === 0 ? 'morning_peaceful' : 'morning_deaths_intro';
    const dawnDramatic = deadPlayers.length > 0;
    setFlow('dawn', {
      announcement,
      promptKey: dawnPromptKey,
      followUpKeys: dawnFollowUpKeys,
      dramaticReveal: dawnDramatic
    });
    hooks.renderHost?.();
    setBotSpeech(announcement, afterDawnAnnouncement, {
      promptKey: dawnPromptKey,
      followUpKeys: dawnFollowUpKeys,
      dramaticReveal: dawnDramatic
    });
  }

  function afterDawnAnnouncement() {
    if (!state) return;
    if (state.phase === 'HUNTER_REVENGE' && state.pendingHunterId) {
      triggerHunterPrompt();
      return;
    }
    proceedAfterDawnPhase();
  }

  // [G1 + G2] Luồng sau bình minh: Xong Thợ Săn -> checkWinCondition -> SHERIFF_TRANSFER -> SHERIFF_ELECTION -> LAST_WORDS -> DAY
  function proceedAfterDawnPhase() {
    if (!state || !isHost) return;
    if (checkWinCondition()) return;

    const st = settingsOf();
    const sheriffPlayer = state.sheriffId ? byId(state.sheriffId) : null;
    if (st.sheriffEnabled && state.sheriffId && sheriffPlayer && !sheriffPlayer.alive) {
      triggerSheriffTransfer('DAY');
      return;
    }

    if (state.nightNumber === 1 && st.sheriffEnabled && !state.sheriffDone) {
      startSheriffElection();
      return;
    }

    if (
      Array.isArray(state._nightDeadNames) &&
      state._nightDeadNames.length > 0 &&
      st.lastWordsEnabled &&
      !state._nightLastWordsDone
    ) {
      state._nightLastWordsDone = true;
      startLastWords(state._nightDeadNames, 'DAY');
      return;
    }

    state.phase = 'DAY';
    resetDayVoteState();
    voteAllAnnounced = false;
    setFlow('day');
    armDayDeadline();
    evaluateDayVotes();
    syncStateToClients();
    hooks.renderHost?.();
  }

  // [G1 + G2] Luồng sau treo cổ: Xong Thợ Săn/Kẻ Báo Thù -> checkWinCondition -> SHERIFF_TRANSFER -> LAST_WORDS -> beginNextNight
  function proceedAfterLynchPhase() {
    if (!state || !isHost) return;
    if (checkWinCondition()) return;

    const st = settingsOf();
    const sheriffPlayer = state.sheriffId ? byId(state.sheriffId) : null;
    if (st.sheriffEnabled && state.sheriffId && sheriffPlayer && !sheriffPlayer.alive) {
      triggerSheriffTransfer('NEXT_NIGHT');
      return;
    }

    if (
      Array.isArray(state._lynchDeadNames) &&
      state._lynchDeadNames.length > 0 &&
      st.lastWordsEnabled &&
      !state._lynchLastWordsDone
    ) {
      state._lynchLastWordsDone = true;
      startLastWords(state._lynchDeadNames, 'NEXT_NIGHT');
      return;
    }

    setFlow('to_night');
    armStepTimer(() => beginNextNight(), 1200);
  }

  function triggerHunterPrompt() {
    const actor = byId(state.pendingHunterId);
    if (!actor) {
      afterHunterResolved(state.pendingHunterNext);
      return;
    }
    const role =
      state.pendingRevengeRole === 'avenger' || (actor.roleId === 'avenger' && state.avengerPending === actor.id)
        ? 'avenger'
        : 'hunter';
    state.pendingRevengeRole = role;
    state.avengerPending = role === 'avenger' ? actor.id : null;

    setFlow('hunter_wait');
    const queued = state.queuedHunterShot;
    state.queuedHunterShot = null;
    if (queued && queued.hunterId === actor.id) {
      const ok = !queued.targetId || state.players.some((p) => p.id === queued.targetId && p.alive && p.id !== actor.id);
      if (ok) {
        resolveHunterShot(queued.targetId || null);
        return;
      }
    }
    ensureWatch(`revenge${Object.keys(state.deaths || {}).length}`);
    armReminders();
    hooks.renderHost?.();

    const speech =
      role === 'avenger'
        ? narrate(
            'avenger_trigger',
            { name: actor.name },
            `Khoan đã! ${actor.name} là Kẻ Báo Thù! Xin mời ${actor.name} chọn 1 người để kéo theo chết chung trên điện thoại!`
          )
        : narrate(
            'hunter_trigger',
            { name: actor.name },
            `Khoan đã! ${actor.name} là Thợ Săn. Xin mời ${actor.name} hô bắn ở ngoài rồi bấm chọn tên người bị bắn ngay trên điện thoại của mình!`
          );

    setBotSpeech(
      speech,
      () => {
        if (actor.isDemo) {
          armStepTimer(() => resolveHunterShot(null), 1800);
        }
      },
      { promptKey: role === 'avenger' ? 'avenger_trigger' : 'hunter_trigger' }
    );
  }

  function resolveHunterShot(targetId) {
    clearHostTimers();
    if (!state || state.phase !== 'HUNTER_REVENGE' || !state.flow || state.flow.key !== 'hunter_wait') return;
    const actor = byId(state.pendingHunterId);
    const nextAfter = state.pendingHunterNext;
    const actorName = actor ? actor.name : '';
    const revengeRole = state.pendingRevengeRole === 'avenger' ? 'avenger' : 'hunter';
    state.pendingHunterId = null;
    state.pendingRevengeRole = null;
    state.avengerPending = null;

    let text;
    let promptKey;
    const target = targetId ? state.players.find((p) => p.id === targetId && p.alive) : null;
    if (target) {
      try {
        _win.AudioEngine?.playHunterShot?.();
      } catch (_) {}
      const cause = revengeRole === 'avenger' ? 'avenger' : 'hunter';
      if (revengeRole === 'avenger') {
        addLog(`⚔️ Kẻ Báo Thù ${actorName} kéo theo ${target.name} chết chung!`, { icon: '⚔️' });
      } else {
        addLog(`Thợ Săn ${actorName} bắn hạ ${target.name}!`, { icon: '🏹' });
      }
      const { dead, chain } = killPlayers([{ id: target.id, cause }], { phase: 'day' });

      const deadTargetList = nextAfter === 'NEXT_NIGHT' ? '_lynchDeadNames' : '_nightDeadNames';
      if (!Array.isArray(state[deadTargetList])) state[deadTargetList] = [];
      dead.forEach((p) => {
        if (!state[deadTargetList].includes(p.name)) state[deadTargetList].push(p.name);
      });

      dead
        .filter((p) => p.roleId === 'hunter')
        .forEach((p) => {
          const exists = (state.hunterQueue || []).some((item) => (typeof item === 'string' ? item === p.id : item.id === p.id));
          if (!exists) state.hunterQueue.push({ id: p.id, role: 'hunter' });
        });

      const cm = chainText(chain);
      if (revengeRole === 'avenger') {
        promptKey = 'avenger_pull';
        text = `${narrate(
          'avenger_pull',
          { name: actorName, targetName: target.name },
          `Lời nguyền Kẻ Báo Thù! ${actorName} đã kéo theo ${target.name} chết chung!`
        )}${cm}`;
        state.lastDawnSummary += ` ⚔️ Kẻ Báo Thù kéo theo ${target.name}.${cm}`;
      } else {
        promptKey = 'hunter_shot';
        text = `${narrate(
          'hunter_pull',
          { name: actorName, targetName: target.name },
          `Đoàng! Thợ Săn ${actorName} đã bắn hạ ${target.name} trước khi ngã xuống!`
        )}${cm}`;
        state.lastDawnSummary += ` 🏹 Thợ Săn bắn hạ ${target.name}.${cm}`;
      }
    } else if (revengeRole === 'avenger') {
      promptKey = 'avenger_skip';
      addLog(`Kẻ Báo Thù ${actorName} không kéo theo ai.`, { icon: '⚔️' });
      text = `Kẻ Báo Thù ${actorName} quyết định không kéo theo ai.`;
    } else {
      promptKey = 'hunter_skip';
      addLog(`Thợ Săn ${actorName} quyết định không bắn ai.`, { icon: '🏹' });
      text = `Thợ Săn ${actorName} quyết định không bắn ai.`;
    }

    setFlow('after_hunter', { next: nextAfter, text, promptKey });
    hooks.renderHost?.();
    setBotSpeech(text, () => afterHunterResolved(nextAfter), { promptKey });
  }

  function skipRevenge() {
    if (!isHost || !state || state.phase !== 'HUNTER_REVENGE') return;
    resolveHunterShot(null);
  }

  function afterHunterResolved(nextAfter) {
    if (!state) return;
    state.pendingHunterNext = nextAfter;
    if (Array.isArray(state.hunterQueue) && state.hunterQueue.length > 0) {
      const nextEntry = normalizeRevengeEntry(state.hunterQueue.shift());
      if (nextEntry && nextEntry.id) {
        state.pendingHunterId = nextEntry.id;
        state.pendingRevengeRole = nextEntry.role;
        state.avengerPending = nextEntry.role === 'avenger' ? nextEntry.id : null;
        triggerHunterPrompt();
        return;
      }
    }
    state.pendingHunterNext = null;
    state.pendingRevengeRole = null;
    state.avengerPending = null;
    if (nextAfter === 'NEXT_NIGHT') {
      proceedAfterLynchPhase();
    } else {
      proceedAfterDawnPhase();
    }
  }

  // ==================== SHERIFF ELECTION & TRANSFER [G1] ====================
  function startSheriffElection() {
    if (!isHost || !state) return;
    state.phase = 'SHERIFF_ELECTION';
    state.sheriffVotes = {};
    setFlow('sheriff_election');
    syncStateToClients();
    hooks.renderHost?.();
    setBotSpeech(
      narrate(
        'sheriff_election_start',
        {},
        'Đã đến lúc bầu Trưởng Làng! Mọi người hãy chọn ứng cử viên trên điện thoại — Trưởng Làng sẽ nắm giữ 1,5 phiếu quyền lực.'
      ),
      { promptKey: 'sheriff_election' }
    );
  }

  function getSheriffVoteTally() {
    const counts = {};
    Object.entries((state && state.sheriffVotes) || {}).forEach(([vId, tId]) => {
      const voter = byId(vId);
      if (!voter || !voter.alive) return;
      counts[tId] = (counts[tId] || 0) + 1;
    });
    const candidates = Object.entries(counts)
      .filter(([tId]) => tId !== '__skip__')
      .sort((a, b) => b[1] - a[1]);
    const topVotes = candidates[0] ? candidates[0][1] : 0;
    const leaders = candidates.filter(([, c]) => c === topVotes && topVotes > 0).map(([id]) => id);
    return { counts, candidates, topVotes, leaders, isTie: leaders.length > 1 };
  }

  function evaluateSheriffVotes() {
    if (!isHost || !state || state.phase !== 'SHERIFF_ELECTION') return;
    const realAlive = state.players.filter((p) => p.alive && !p.isDemo);
    if (realAlive.length === 0) return;
    const allDone = realAlive.every((p) => Boolean(state.sheriffVotes[p.id]));
    if (!allDone) return;

    const tally = getSheriffVoteTally();
    if (tally.leaders.length === 1) {
      assignSheriffDirect(tally.leaders[0]);
    } else if (tally.leaders.length === 0) {
      skipSheriffElection();
    } else {
      // Hòa phiếu bầu Trưởng Làng: chọn ngẫu nhiên hoặc giữ để Quản Trò chọn? Thông báo hòa để Quản Trò quyết hoặc random
      const tiedStr = joinNames(tally.leaders.map((id) => (byId(id) || {}).name || '?'));
      addLog(`Bầu Trưởng Làng hòa phiếu giữa ${tiedStr}. Quản Trò có thể chỉ định hoặc bỏ qua.`, { icon: '🎖️' });
      setBotSpeech(`Bầu Trưởng Làng đang hòa phiếu giữa ${tiedStr}! Quản Trò hãy chọn Trưởng Làng hoặc bỏ qua.`, {
        promptKey: 'sheriff_election'
      });
    }
  }

  function castSheriffVote(voterId, targetId) {
    if (!isHost || !state || state.phase !== 'SHERIFF_ELECTION' || state.isPaused) return;
    const voter = state.players.find((p) => p.id === voterId && p.alive);
    if (!voter) return;
    if (targetId !== '__skip__' && !state.players.some((p) => p.id === targetId && p.alive)) return;
    if (state.sheriffVotes[voterId] === targetId) return;
    state.sheriffVotes[voterId] = targetId;
    evaluateSheriffVotes();
    if (state && state.phase === 'SHERIFF_ELECTION') {
      syncStateToClients();
      hooks.renderHost?.();
    }
  }

  function assignSheriffDirect(targetId) {
    if (!isHost || !state) return;
    const target = state.players.find((p) => p.id === targetId && p.alive);
    if (!target) return;
    clearHostTimers();
    state.sheriffId = target.id;
    state.sheriffDone = true;
    state.sheriffVotes = {};
    syncPlayerFlags();
    addLog(`🎖️ ${target.name} được bầu làm Trưởng Làng (1,5 phiếu)!`, { icon: '🎖️' });
    const text = narrate(
      'sheriff_elected',
      { name: target.name },
      `Chúc mừng ${target.name} đã được cả làng tin tưởng bầu làm Trưởng Làng, nắm giữ 1,5 phiếu quyền lực!`
    );
    setFlow('after_sheriff_election', { text, promptKey: 'sheriff_elected' });
    syncStateToClients();
    hooks.renderHost?.();
    setBotSpeech(text, () => proceedAfterDawnPhase(), { promptKey: 'sheriff_elected' });
  }

  function skipSheriffElection() {
    if (!isHost || !state) return;
    clearHostTimers();
    state.sheriffId = null;
    state.sheriffDone = true;
    state.sheriffVotes = {};
    syncPlayerFlags();
    addLog('🎖️ Không bầu Trưởng Làng trong ván này.', { icon: '🎖️' });
    const text = narrate('sheriff_skipped', {}, 'Cả làng quyết định không bầu Trưởng Làng.');
    setFlow('after_sheriff_election', { text, promptKey: 'sheriff_skipped' });
    syncStateToClients();
    hooks.renderHost?.();
    setBotSpeech(text, () => proceedAfterDawnPhase(), { promptKey: 'sheriff_skipped' });
  }

  function triggerSheriffTransfer(nextAction) {
    if (!isHost || !state) return;
    const sheriff = state.sheriffId ? byId(state.sheriffId) : null;
    state.phase = 'SHERIFF_TRANSFER';
    state.pendingSheriffNext = nextAction || 'DAY';
    setFlow('sheriff_transfer', { nextAction: state.pendingSheriffNext });
    syncStateToClients();
    hooks.renderHost?.();

    const sheriffName = sheriff ? sheriff.name : 'Trưởng Làng';
    setBotSpeech(
      narrate(
        'sheriff_transfer_prompt',
        { name: sheriffName },
        `Trưởng Làng ${sheriffName} đã ngã xuống! Hãy trao lại huy hiệu Trưởng Làng cho một người còn sống.`
      ),
      () => {
        if (!sheriff || sheriff.isDemo) {
          const alive = state.players.filter((p) => p.alive);
          const pick = alive[Math.floor(Math.random() * alive.length)];
          armStepTimer(() => resolveSheriffTransfer(pick ? pick.id : null), 1500);
        }
      },
      { promptKey: 'sheriff_transfer_prompt' }
    );
  }

  function resolveSheriffTransfer(targetId) {
    if (!isHost || !state || state.phase !== 'SHERIFF_TRANSFER') return;
    clearHostTimers();
    const nextAction = state.pendingSheriffNext || 'DAY';
    state.pendingSheriffNext = null;
    const target = targetId ? state.players.find((p) => p.id === targetId && p.alive) : null;
    let text;
    let promptKey;
    if (target) {
      state.sheriffId = target.id;
      promptKey = 'sheriff_transfer';
      addLog(`🎖️ Huy hiệu Trưởng Làng được trao lại cho ${target.name}!`, { icon: '🎖️' });
      text = narrate(
        'sheriff_transfer',
        { name: target.name },
        `Trưởng Làng trước khi ngã xuống đã trao lại huy hiệu quyền lực cho ${target.name}!`
      );
    } else {
      state.sheriffId = null;
      promptKey = 'sheriff_transfer_none';
      addLog('🎖️ Huy hiệu Trưởng Làng bị hủy bỏ.', { icon: '🎖️' });
      text = narrate('sheriff_transfer_none', {}, 'Huy hiệu Trưởng Làng đã bị hủy bỏ.');
    }
    syncPlayerFlags();
    setFlow('after_sheriff_transfer', { nextAction, text, promptKey });
    syncStateToClients();
    hooks.renderHost?.();
    setBotSpeech(
      text,
      () => {
        if (nextAction === 'NEXT_NIGHT') proceedAfterLynchPhase();
        else proceedAfterDawnPhase();
      },
      { promptKey }
    );
  }

  // ==================== LAST WORDS [G2] ====================
  function startLastWords(names, nextAction) {
    if (!isHost || !state) return;
    const namesArr = (Array.isArray(names) ? names : [names]).filter(Boolean);
    const durationMs = Math.max(5000, (Number(settingsOf().lastWordsSeconds) || 25) * 1000);
    state.phase = 'LAST_WORDS';
    state.lastWords = {
      names: namesArr,
      durationMs,
      endsAt: Date.now() + durationMs,
      nextAction: nextAction || 'DAY'
    };
    setFlow('last_words', { names: namesArr, nextAction: state.lastWords.nextAction });
    syncStateToClients();
    hooks.renderHost?.();

    const namesStr = joinNames(namesArr);
    const speech = narrate(
      'last_words',
      { name: namesStr, names: namesStr },
      `Trước khi rời cuộc chơi, ${namesStr} có ${Math.round(durationMs / 1000)} giây nói lời trăng trối cuối cùng!`
    );
    setBotSpeech(speech, { promptKey: 'last_words' });
    armTimer('lastWords', durationMs, () => skipLastWords());
  }

  function skipLastWords() {
    if (!isHost || !state || state.phase !== 'LAST_WORDS') return;
    clearNamedTimer('lastWords');
    const nextAction =
      (state.lastWords && state.lastWords.nextAction) ||
      (state.flow && state.flow.data && state.flow.data.nextAction) ||
      'DAY';
    state.lastWords = null;
    if (nextAction === 'NEXT_NIGHT') {
      proceedAfterLynchPhase();
    } else {
      proceedAfterDawnPhase();
    }
  }

  // ==================== LYNCH & SKIP ====================
  function lynchPlayer(targetId) {
    if (!state || state.phase !== 'DAY' || !state.flow || state.flow.key !== 'day') return;
    const target = state.players.find((p) => p.id === targetId && p.alive);
    if (!target) return;
    clearHostTimers();

    try {
      _win.AudioEngine?.playVoteGavel?.();
      _win.SceneFX?.flash?.('rgba(244, 63, 94, 0.18)');
    } catch (_) {}

    const votesText = describeDayVotes();
    resetDayVoteState();
    addLog(`Cả làng biểu quyết treo cổ ${target.name}.${votesText ? ` Phiếu bầu: ${votesText}.` : ''}`, {
      icon: '⚖️'
    });
    addLog(`Người bị treo cổ: ${describe(target)}.`, { icon: '⚖️', secret: true });

    if (target.roleId === 'jester') {
      killPlayers([{ id: target.id, cause: 'lynch' }], { phase: 'day', noChain: true });
      try {
        _win.AudioEngine?.playVictory?.();
      } catch (_) {}
      finishGame(
        'jester',
        narrate(
          'game_over_jester',
          { name: target.name },
          `Trời ơi! ${target.name} chính là Thằng Ngố (Kẻ Chán Đời)! Cả làng đã bị lừa treo cổ và Phe Thứ 3 giành chiến thắng độc lập!`
        ),
        '🃏'
      );
      return;
    }

    const { dead, chain } = killPlayers([{ id: target.id, cause: 'lynch' }], { phase: 'day' });
    const cm = chainText(chain);
    const st = settingsOf();
    const loverNames = chain.length > 0 ? joinNames([chain[0].partner.name, chain[0].diedFor.name]) : '';
    const baseText =
      st.storyTheme === 'classic' && !st.dynamicEvents
        ? `Cả làng đã biểu quyết treo cổ ${target.name}!${cm}`
        : `${narrate(
            'vote_eliminated',
            { name: target.name, loverSuicide: chain.length > 0, loverNames },
            `Cả làng đã biểu quyết treo cổ ${target.name}!`
          )}${chain.length > 0 && !st.dynamicEvents ? cm : ''}`;

    state.lastDawnSummary = `⚖️ Cả làng đã treo cổ ${target.name}.${cm}`;
    state._lynchDeadNames = dead.map((p) => p.name);
    state._lynchLastWordsDone = false;

    const revengeEntries = [];
    // [G3] Kẻ Báo Thù chỉ kích hoạt khi bị treo cổ ban ngày
    if (target.roleId === 'avenger') {
      revengeEntries.push({ id: target.id, role: 'avenger' });
    }
    dead
      .filter((p) => p.roleId === 'hunter')
      .forEach((p) => {
        revengeEntries.push({ id: p.id, role: 'hunter' });
      });

    if (revengeEntries.length > 0) setupRevengeQueue(revengeEntries, 'NEXT_NIGHT');

    setFlow('after_lynch', { text: baseText, promptKey: 'vote_eliminated_intro', dramaticReveal: true });
    hooks.renderHost?.();
    setBotSpeech(baseText, afterLynchAnnouncement, { promptKey: 'vote_eliminated_intro', dramaticReveal: true });
  }

  function afterLynchAnnouncement() {
    if (!state) return;
    if (state.phase === 'HUNTER_REVENGE' && state.pendingHunterId) {
      triggerHunterPrompt();
      return;
    }
    proceedAfterLynchPhase();
  }

  function skipLynchToNight() {
    if (!state || state.phase !== 'DAY' || !state.flow || state.flow.key !== 'day') return;
    clearHostTimers();
    try {
      _win.AudioEngine?.playVoteGavel?.();
    } catch (_) {}
    const votesText = describeDayVotes();
    resetDayVoteState();
    addLog(`Hòa phiếu / bỏ phiếu trắng, không ai bị treo cổ.${votesText ? ` Phiếu bầu: ${votesText}.` : ''}`, {
      icon: '🤝'
    });
    setFlow('to_night');
    const st = settingsOf();
    const speech =
      st.storyTheme === 'classic' && !st.dynamicEvents
        ? 'Hôm nay không có ai bị treo cổ. Màn đêm lại chuẩn bị buông xuống...'
        : narrate('day_no_lynch', {}, 'Hôm nay không có ai bị treo cổ. Màn đêm lại chuẩn bị buông xuống...');
    setBotSpeech(
      speech,
      () => {
        armStepTimer(() => beginNextNight(), 1100);
      },
      { promptKey: 'day_no_lynch' }
    );
  }

  // ==================== WIN CONDITION & GAME OVER ====================
  function finishGame(winner, winMsg, icon) {
    clearHostTimers();
    state.phase = 'GAME_OVER';
    state.winner = winner;
    state.pendingHunterId = null;
    state.pendingRevengeRole = null;
    state.avengerPending = null;
    state.hunterQueue = [];
    state.lastWords = null;
    state.isPaused = false;
    state.pausedRemainingMs = 0;
    _clearVoteLock();
    state.dayDeadline = null;
    state.queuedHunterShot = null;
    addLog(winMsg, { icon, phase: 'end' });
    saveLastGame();
    try {
      _win.StatsAwards?.recordWerewolfGame?.(state);
    } catch (_) {}

    if (settingsOf().campaignMode) {
      let firstVictim = '';
      const deathEntries = Object.entries(state.deaths || {});
      if (deathEntries.length > 0) {
        deathEntries.sort((a, b) => (a[1].round || 99) - (b[1].round || 99));
        const fvPlayer = byId(deathEntries[0][0]);
        if (fvPlayer) firstVictim = fvPlayer.name;
      }
      try {
        gd().recordGameOutcome?.({
          winnerTeam: winner,
          winnerLabel: WIN_TITLE[winner] || winner,
          firstVictim
        });
      } catch (_) {}
    }

    const winPromptKey = winner ? `game_over_${winner}` : null;
    setFlow('game_over', { msg: winMsg, promptKey: winPromptKey });
    hooks.renderHost?.();
    setBotSpeech(winMsg, { promptKey: winPromptKey });
  }

  function checkWinCondition() {
    if (!state) return false;
    const alive = state.players.filter((p) => p.alive);
    const aliveWolves = alive.filter((p) => isWolfRole(p.roleId)).length;
    const aliveSK = alive.filter((p) => p.roleId === 'serial_killer').length;
    const aliveNonWolves = alive.filter((p) => !isWolfRole(p.roleId)).length;

    let isCrossTeamLoversWin = false;
    if (Array.isArray(state.lovers) && state.lovers.length === 2 && alive.length === 2) {
      const [idA, idB] = state.lovers;
      const pA = alive.find((p) => p.id === idA);
      const pB = alive.find((p) => p.id === idB);
      if (pA && pB && getPlayerSide(pA.roleId) !== getPlayerSide(pB.roleId)) {
        isCrossTeamLoversWin = true;
      }
    }

    let winner = null;
    if (isCrossTeamLoversWin) {
      winner = 'lovers';
    } else if (aliveSK > 0 && (alive.length === 1 || (alive.length === 2 && aliveWolves === 0))) {
      winner = 'serial_killer';
    } else if (aliveWolves === 0 && aliveSK === 0) {
      winner = 'villager';
    } else if (aliveSK === 0 && aliveWolves >= aliveNonWolves) {
      winner = 'werewolf';
    }

    if (!winner) return false;

    try {
      _win.AudioEngine?.playVictory?.();
    } catch (_) {}

    const winMessages = {
      villager: 'Chúc mừng Phe Dân Làng đã chiến thắng! Toàn bộ Ma Sói và Sát Nhân đã bị tiêu diệt!',
      werewolf: 'Ma Sói đã chiếm quyền kiểm soát ngôi làng! Phe Ma Sói chiến thắng!',
      serial_killer: 'Sát Nhân Độc Hành là kẻ sống sót cuối cùng! Phe Thứ 3 Sát Nhân chiến thắng độc lập!',
      lovers: 'Cặp Đôi Tình Nhân đã sống sót đến giây phút cuối cùng! Tình yêu bất diệt chiến thắng!'
    };
    const st = settingsOf();
    const storyKey = `game_over_${winner}`;
    const msg =
      st.storyTheme === 'classic' && !st.dynamicEvents
        ? winMessages[winner] || 'Trò chơi kết thúc!'
        : narrate(storyKey, { winnerLabel: WIN_TITLE[winner] || winner }, winMessages[winner] || 'Trò chơi kết thúc!');
    finishGame(winner, msg, '🏆');
    return true;
  }

  // ==================== VIEW-MODELS & VOTE TALLY ====================
  function deathNoteOf(st, id, withCause) {
    const d = (st.deaths || {})[id];
    if (!d) return '';
    const when = `${d.phase === 'night' ? 'Đêm' : 'Ngày'} ${d.round}`;
    return withCause && d.cause && CAUSE_NOTE[d.cause] ? `${when} — ${CAUSE_NOTE[d.cause]}` : when;
  }

  function didWin(winner, p, lovers) {
    if (winner === 'villager') return getPlayerSide(p.roleId) === 'villager';
    if (winner === 'werewolf') return isWolfRole(p.roleId);
    if (winner === 'jester') return p.roleId === 'jester';
    if (winner === 'serial_killer') return p.roleId === 'serial_killer';
    if (winner === 'lovers') return lovers.includes(p.id);
    return false;
  }

  function buildGameOverVm(st, myId) {
    const src = st || state || {};
    const lovers = src.lovers || [];
    return {
      winner: src.winner,
      winnerTitle: WIN_TITLE[src.winner] || '🏆 KẾT THÚC!',
      winnerSub: WIN_SUB[src.winner] || '',
      myId: myId || null,
      players: (src.players || []).map((p) => ({
        id: p.id,
        name: p.name,
        avatarId: p.avatarId,
        alive: p.alive,
        roleId: p.roleId || 'villager',
        startRoleId: p.startRoleId || p.roleId || 'villager',
        isLover: lovers.includes(p.id),
        sheriff: Boolean(src.sheriffId && p.id === src.sheriffId),
        deathNote: p.alive ? '' : deathNoteOf(src, p.id, true) || 'Đã chết',
        won: didWin(src.winner, { id: p.id, roleId: p.roleId || 'villager' }, lovers)
      }))
    };
  }

  function buildHostBoardVm() {
    if (!state) return { phase: 'LOBBY', players: [] };
    const inDay = state.phase === 'DAY';
    const against = {};
    if (inDay) {
      Object.entries(state.dayVotes || {}).forEach(([vId, tId]) => {
        const v = byId(vId);
        if (v && v.alive) {
          against[tId] = roundVote((against[tId] || 0) + getVoteWeight(v));
        }
      });
    }
    const sheriffOn = Boolean(settingsOf().sheriffEnabled);
    return {
      phase: state.phase,
      sheriffId: state.sheriffId || null,
      silencedId: state.silencedId || null,
      players: state.players.map((p) => ({
        id: p.id,
        name: p.name,
        avatarId: p.avatarId,
        alive: p.alive,
        online: p.isDemo ? true : Boolean(session && session.isClientOnline && session.isClientOnline(p.id)),
        isDemo: Boolean(p.isDemo),
        ready: Boolean(p.ready),
        sheriff: Boolean(sheriffOn && state.sheriffId && p.id === state.sheriffId),
        silenced: Boolean(state.silencedId && p.id === state.silencedId),
        voted: inDay && Boolean(state.dayVotes && state.dayVotes[p.id]),
        votesAgainst: inDay ? against[p.id] || 0 : 0,
        deathNote: p.alive ? '' : deathNoteOf(state, p.id, false) || 'Đã chết'
      }))
    };
  }

  function getDayVoteTally() {
    const groups = {}; // targetId -> [{ id, name, avatarId, weight, isSheriff }]
    const weights = {}; // targetId -> weighted sum
    Object.entries((state && state.dayVotes) || {}).forEach(([vId, tId]) => {
      const voter = byId(vId);
      if (!voter || !voter.alive) return;
      const w = getVoteWeight(voter);
      if (!groups[tId]) groups[tId] = [];
      groups[tId].push({
        id: voter.id,
        name: voter.name,
        avatarId: voter.avatarId,
        weight: w,
        isSheriff: w > 1
      });
      weights[tId] = roundVote((weights[tId] || 0) + w);
    });

    const entries = Object.entries(groups).sort((a, b) => (weights[b[0]] || 0) - (weights[a[0]] || 0));
    const topVotes = entries[0] ? weights[entries[0][0]] || 0 : 0;
    const isTie = entries.length > 1 && (weights[entries[1][0]] || 0) === topVotes;
    const leaderId = entries[0] ? entries[0][0] : null;
    return { groups, weights, entries, topVotes, isTie, leaderId };
  }

  // ==================== RESUME HOST FLOW ====================
  function resumeHostFlow() {
    if (!state || !isHost) return;
    const flow = state.flow || { key: 'lobby', data: {} };
    const data = flow.data || {};
    clearHostTimers();
    speechPrefix = RESUME_PREFIX;

    switch (flow.key) {
      case 'role_reveal':
        runRoleReveal();
        break;
      case 'night_intro':
        runNightIntro();
        break;
      case 'night_step':
        stepResolved = false;
        runNightStepPrompt(state.nightStep);
        break;
      case 'night_step_done':
        stepResolved = true;
        advanceNightStep();
        break;
      case 'dawn':
        setBotSpeech(data.announcement || state.botText, afterDawnAnnouncement, {
          promptKey: data.promptKey,
          followUpKeys: data.followUpKeys,
          dramaticReveal: data.dramaticReveal
        });
        break;
      case 'hunter_wait':
        triggerHunterPrompt();
        break;
      case 'after_hunter':
        setBotSpeech(data.text || 'Đã hành động xong.', () => afterHunterResolved(data.next), { promptKey: data.promptKey });
        break;
      case 'sheriff_election':
        setBotSpeech(
          narrate(
            'sheriff_election_start',
            {},
            'Đã đến lúc bầu Trưởng Làng! Mọi người hãy chọn ứng cử viên trên điện thoại.'
          ),
          { promptKey: 'sheriff_election' }
        );
        break;
      case 'after_sheriff_election':
        setBotSpeech(data.text || state.botText, () => proceedAfterDawnPhase(), { promptKey: data.promptKey });
        break;
      case 'sheriff_transfer':
        triggerSheriffTransfer(state.pendingSheriffNext || data.nextAction || 'DAY');
        break;
      case 'after_sheriff_transfer':
        setBotSpeech(
          data.text || state.botText,
          () => {
            if ((data.nextAction || 'DAY') === 'NEXT_NIGHT') proceedAfterLynchPhase();
            else proceedAfterDawnPhase();
          },
          { promptKey: data.promptKey }
        );
        break;
      case 'last_words': {
        const lw = state.lastWords;
        const rem = lw && lw.endsAt ? Math.max(1000, lw.endsAt - Date.now()) : 5000;
        speechPrefix = '';
        setBotSpeech(state.botText || 'Tiếp tục Lời Trăng Trối.', { promptKey: 'last_words' });
        armTimer('lastWords', rem, () => skipLastWords());
        break;
      }
      case 'after_lynch':
        setBotSpeech(data.text || 'Cả làng đã biểu quyết xong.', afterLynchAnnouncement, {
          promptKey: data.promptKey || 'vote_eliminated_intro',
          dramaticReveal: Boolean(data.dramaticReveal)
        });
        break;
      case 'to_night':
        beginNextNight();
        break;
      case 'day':
        speechPrefix = '';
        setBotSpeech('Bot Quản Trò đã quay lại, ván đấu tiếp tục! Mời cả làng tiếp tục thảo luận và bỏ phiếu.', {
          promptKey: 'resume_day'
        });
        armVoteLockTimer();
        armDayDeadline({ resumed: true });
        syncStateToClients();
        break;
      case 'game_over':
      case 'lobby':
      default:
        speechPrefix = '';
        break;
    }
  }

  // ==================== CLIENT MESSAGE HANDLER ====================
  function handleClientMessage(msg) {
    if (!state || !msg) return;
    const { type } = msg;
    const payload = msg.payload || {};

    if (type === 'LOG_DELTA') {
      mergeClientLogDelta(payload);
      return;
    }

    if (type === 'WW_PAUSE_STATE') {
      state.isPaused = Boolean(payload.paused);
      if (typeof payload.pausedRemainingMs === 'number') {
        state.pausedRemainingMs = payload.pausedRemainingMs;
      }
      if (state.isPaused) {
        try {
          _win.AudioEngine?.pauseAll?.();
        } catch (_) {}
      } else {
        try {
          _win.AudioEngine?.resumeAll?.();
        } catch (_) {}
      }
      hooks.renderPlayer?.();
      return;
    }

    if (type === 'WW_STATE') {
      if (payload.epoch && payload.epoch !== state.epoch) {
        const hadEpoch = Boolean(state.epoch);
        lastReceivedSeq = -1;
        resetClientLocalState();
        state = createInitialHostState();
        state.epoch = null;
        if (hadEpoch && payload.phase !== 'LOBBY') setTimeout(() => announceJoin(true), 0);
      } else if (
        typeof payload.stateSeq === 'number' &&
        payload.phase !== 'LOBBY' &&
        payload.stateSeq < lastReceivedSeq
      ) {
        return;
      }
      if (typeof payload.stateSeq === 'number') {
        lastReceivedSeq = payload.stateSeq;
      }

      const prevStep = state.nightStep;
      const prevPhase = state.phase;
      const prevPendingHunter = state.pendingHunterId;
      state = { ...state, ...payload };

      const meSynced = session && (state.players || []).find((p) => p.id === session.clientId);
      if (meSynced && meSynced.avatarId) {
        myAvatarId = meSynced.avatarId;
      }

      if (state.phase === 'LOBBY') {
        clientSecret = null;
        witchInfo = null;
        alphaInfo = null;
        seerResult = null;
        detectiveResult = null;
        wolfSync = { wolfVotes: {}, wolfCount: 1, lock: null };
        cardRevealed = false;
        cardHasNews = false;
        newsNotifiedSig = '';
        clientView = 'lobby';
      } else if (state.phase === 'GAME_OVER') {
        clientView = 'game_over';
        try {
          _win.StatsAwards?.recordWerewolfGame?.(state);
        } catch (_) {}
      } else {
        clientView = 'game';
      }

      clientVoteLockEnd = state.voteLock ? Date.now() + (Number(state.voteLock.remainingMs) || 0) : 0;
      clientDayDeadlineEnd = state.dayDeadline ? Date.now() + (Number(state.dayDeadline.remainingMs) || 0) : 0;
      clientLastWordsEnd = state.lastWords ? Date.now() + (Number(state.lastWords.remainingMs) || 0) : 0;

      if (state.phase === 'NIGHT' && (prevPhase !== 'NIGHT' || prevStep !== state.nightStep)) {
        alphaInfo = null;
        seerResult = null;
        detectiveResult = null;
        wolfSync = { wolfVotes: {}, wolfCount: 1, lock: null };

        const isMyTurn =
          clientSecret &&
          (state.nightStep === clientSecret.roleId ||
            (state.nightStep === 'werewolf' && isWolfRole(clientSecret.roleId)));
        if (isMyTurn && isMeAlive()) notifyMyTurn([120, 60, 120]);
      }

      if (state.phase === 'HUNTER_REVENGE' && session && state.pendingHunterId === session.clientId) {
        if (prevPhase !== 'HUNTER_REVENGE' || prevPendingHunter !== session.clientId) {
          notifyMyTurn([180, 80, 180]);
        }
      }

      syncCardNews();
      hooks.renderPlayer?.();
      return;
    }

    if (type === 'WW_SECRET') {
      clientSecret = payload;
      syncCardNews();
      hooks.renderPlayer?.();
      return;
    }

    if (type === 'WW_WITCH_INFO') {
      witchInfo = payload;
      hooks.renderPlayer?.();
      return;
    }

    if (type === 'WW_ALPHA_INFO') {
      alphaInfo = payload;
      hooks.renderPlayer?.();
      return;
    }

    if (type === 'WW_SEER_RESULT') {
      seerResult = payload;
      hooks.renderPlayer?.();
      return;
    }

    if (type === 'WW_DETECTIVE_RESULT') {
      detectiveResult = payload;
      hooks.renderPlayer?.();
      return;
    }

    if (type === 'WW_WOLF_SYNC') {
      wolfSync = {
        wolfVotes: payload.wolfVotes || {},
        wolfCount: Math.max(1, Number(payload.wolfCount) || 1),
        lock:
          payload.lock && payload.lock.targetId
            ? { targetId: payload.lock.targetId, remainingMs: Number(payload.lock.remainingMs) || 0 }
            : null
      };
      wolfLockEndLocal = wolfSync.lock ? Date.now() + wolfSync.lock.remainingMs : 0;
      hooks.renderPlayer?.();
    }
  }

  function notifyMyTurn(pattern) {
    vibrate(pattern);
    try {
      _win.SceneFX?.flash?.('rgba(251, 191, 36, 0.28)');
    } catch (_) {}
    try {
      _win.AudioEngine?.playUi?.();
    } catch (_) {}
  }

  // ----- Thẻ bài có tin mới -----
  function secretSig() {
    if (!clientSecret || !clientSecret.roleId) return '';
    const mates = (clientSecret.teammates || [])
      .map((m) => m.id)
      .sort()
      .join(',');
    return [
      clientSecret.roleId,
      (clientSecret.loverInfo && clientSecret.loverInfo.id) || '',
      mates,
      clientSecret.converted ? 1 : 0
    ].join('|');
  }

  function seenKey() {
    return `${(state && state.epoch) || ''}:${(state && state.gameNo) || 0}`;
  }

  function readSeenCard() {
    try {
      return JSON.parse(lsGet('hq_ww_card_seen') || 'null');
    } catch (_) {
      return null;
    }
  }

  function syncCardNews() {
    const sig = secretSig();
    if (!sig || !state || !state.epoch || state.phase === 'LOBBY' || state.phase === 'GAME_OVER') {
      cardHasNews = false;
      return;
    }
    const seen = readSeenCard();
    const news = !(seen && seen.key === seenKey() && seen.sig === sig);
    if (news && newsNotifiedSig !== sig) {
      newsNotifiedSig = sig;
      vibrate([200, 100, 200]);
    }
    cardHasNews = news;
    if (news && cardRevealed && !peekTimer) peekTimer = setTimeout(markCardSeen, 700);
  }

  function markCardSeen() {
    peekTimer = null;
    const sig = secretSig();
    if (!sig) return;
    lsSet('hq_ww_card_seen', JSON.stringify({ key: seenKey(), sig }));
    cardHasNews = false;
    newsNotifiedSig = sig;
    hooks.renderPlayer?.();
  }

  function isMeAlive() {
    if (!state || !session) return false;
    const me = state.players.find((p) => p.id === session.clientId);
    return me ? me.alive : false;
  }

  // ==================== RETURN TO LOBBY ====================
  function returnToLobby() {
    if (!state) return;
    clearHostTimers();
    speechPrefix = '';
    try {
      _win.AudioEngine?.stopSpeech?.();
      _win.AudioEngine?.stopNightAmbience?.();
    } catch (_) {}
    state.phase = 'LOBBY';
    state.round = 0;
    state.nightNumber = 0;
    state.nightStep = null;
    state.nightActions = createNightActions();
    state.nightVictims = createNightVictims();
    resetDayVoteState();
    state.stepWatch = null;
    state.queuedHunterShot = null;
    state.winner = null;
    state.lovers = [];
    state.lastGuardedId = null;
    state.seerHistory = [];
    state.alphaWolfConvertUsed = false;
    state.alphaWolfState = { curseUsed: false };
    state.witchPotions = { save: true, poison: true };
    state.witchState = { saveUsed: false, poisonUsed: false };
    state.elderLivesMap = {};
    state.silencedId = null;
    state.lastSilencedId = null;
    state.detectiveCheck = null;
    state.sheriffId = null;
    state.sheriffDone = false;
    state.sheriffVotes = {};
    state.pendingSheriffNext = null;
    state.lastWords = null;
    state.pendingHunterId = null;
    state.pendingRevengeRole = null;
    state.avengerPending = null;
    state.pendingHunterNext = null;
    state.hunterQueue = [];
    state.isPaused = false;
    state.pausedRemainingMs = 0;
    state.peacefulStreak = 0;
    state.lastDawnSummary = '';
    state.logs = [];
    state.logSeq = 0;
    state.deaths = {};
    state.botText = 'Chờ tất cả người chơi vào phòng và ấn Sẵn sàng...';
    stepResolved = false;
    voteAllAnnounced = false;
    state.players.forEach((p) => {
      p.alive = true;
      p.roleId = null;
      p.startRoleId = null;
      p.ready = Boolean(p.isDemo);
      p.sheriff = false;
      p.silenced = false;
      p.shielded = false;
    });
    setFlow('lobby');
    syncStateToClients();
    hooks.renderHost?.();
  }

  // ==================== CLIENT ACTIONS ====================
  function sendAction(payload) {
    if (session) session.send('WW_ACTION', payload);
  }

  function sendDayVote(targetId) {
    if (session) session.send('WW_DAY_VOTE', { targetId });
  }

  function sendSheriffVote(targetId) {
    if (session) session.send('WW_SHERIFF_VOTE', { targetId });
  }

  function sendSheriffTransfer(targetId) {
    if (session) session.send('WW_SHERIFF_TRANSFER', { targetId });
  }

  function sendRename(name, avatarId) {
    const clean = String(name || myName || '').trim().slice(0, 20);
    if (clean) myName = clean;
    if (avatarId) myAvatarId = avatarId;
    lsSet('hq_player_name', myName);
    try {
      _win.AppUI?.saveAvatarId?.(myAvatarId);
    } catch (_) {}
    if (session) session.send('WW_RENAME', { name: myName, avatarId: myAvatarId });
    hooks.renderPlayer?.();
  }

  function sendReady(ready) {
    try {
      _win.AudioEngine?.unlock?.();
    } catch (_) {}
    const me =
      state && state.players && session ? state.players.find((p) => p.id === session.clientId) : null;
    const nextReady = typeof ready === 'boolean' ? ready : me ? !me.ready : true;
    if (session) session.send('WW_READY', { ready: nextReady });
  }

  function sendLeave() {
    if (session) session.send('WW_LEAVE', {});
  }

  // ==================== CONTEXT BRIDGE ====================
  function getContext() {
    return {
      // Constants
      WIN_TITLE,
      DAY_MS,
      VOTE_LOCK_MS,
      DEFAULT_SETTINGS,
      NIGHT_PACE_CONFIG,
      NIGHT_STEP_META,
      VOTE_TIME_OPTIONS,

      // State & Client getters/setters
      getState: () => state,
      getSession: () => session,
      getIsHost: () => isHost,
      getAutoRolesMode: () => autoRolesMode,
      getMyRole: () => (clientSecret && clientSecret.roleId) || null,
      getMySecret: () => clientSecret,
      setMySecret: (v) => {
        clientSecret = v;
      },
      getMyName: () => myName,
      setMyName: (v) => {
        myName = String(v || '');
      },
      getMyAvatarId: () => myAvatarId,
      setMyAvatarId: (v) => {
        myAvatarId = String(v || '');
      },
      getClientView: () => clientView,
      setClientView: (v) => {
        clientView = v;
      },
      getWitchInfo: () => witchInfo,
      getAlphaInfo: () => alphaInfo,
      getSeerResult: () => seerResult,
      getDetectiveResult: () => detectiveResult,
      getWolfSync: () => wolfSync,
      setWolfSyncLocal: (v) => {
        wolfSync = v;
      },
      getWolfLockEndLocal: () => wolfLockEndLocal,
      setWolfLockEndLocal: (v) => {
        wolfLockEndLocal = Number(v) || 0;
      },
      getClientVoteLockEnd: () => clientVoteLockEnd,
      getClientDayDeadlineEnd: () => clientDayDeadlineEnd,
      getClientLastWordsEnd: () => clientLastWordsEnd,
      getCardRevealed: () => cardRevealed,
      setCardRevealed: (v) => {
        cardRevealed = Boolean(v);
      },
      getCardHasNews: () => cardHasNews,
      getPeekTimer: () => peekTimer,
      setPeekTimer: (v) => {
        peekTimer = v;
      },
      isHostPaused: () => Boolean(state && state.isPaused),

      // Helpers
      byId,
      isWolfRole,
      getPlayerSide,
      isMeAlive,
      formatClock,
      escapeHtml,
      vibrate,
      lsGet,
      lsSet,
      getActiveNightOrder,
      getDayVoteTally,
      buildGameOverVm,
      buildHostBoardVm,
      readLastGame,
      markCardSeen,
      syncCardNews,
      updateNetBadge,
      getRoleCountTotal,
      getDefaultRoles,
      normalizeSettings,
      applyRolePreset,
      narrate
    };
  }

  return {
    // Lifecycle
    setRenderHooks,
    getContext,
    startHost,
    joinAsPlayer,
    cleanup,
    getHostSnapshotInfo,
    discardHostSnapshot,
    getState: () => state,

    // Lobby & Host actions
    startNewGame,
    returnToLobby,
    addDemoPlayer,
    kickPlayer,
    updateRoleCount,
    autoFillRoles,
    applyRolePreset,
    changeSetting,
    resetSettings,
    skipNightStep,
    skipRevenge,
    lynchPlayer,
    skipLynchToNight,
    finalizeVoteNow,
    cancelVoteLock,
    togglePause,
    pauseGame,
    resumeGame,
    skipLastWords,
    castSheriffVote,
    assignSheriffDirect,
    skipSheriffElection,
    resolveSheriffTransfer,
    requestReplayBot,

    // Client actions
    sendAction,
    sendDayVote,
    sendSheriffVote,
    sendSheriffTransfer,
    sendRename,
    sendReady,
    sendLeave,
    announceJoin,

    // Pure / Test helpers
    getActiveNightOrder,
    getDayVoteTally,
    buildGameOverVm,
    buildHostBoardVm,
    getPlayerSide,
    isWolfRole,
    narrate
  };
})();

if (typeof window !== 'undefined') {
  window.WWEngine = window.WWEngine || globalThis.WWEngine;
}
