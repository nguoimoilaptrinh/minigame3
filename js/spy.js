// Game 2: Gián Điệp v4.0 — Laptop Quản Trò, bộ đề nội bộ, hẹn giờ Spyfall, tự chốt phiếu & tạm dừng
window.SpyGame = (() => {
  const gd = (typeof window !== 'undefined' && window.GameData) || {};
  const {
    SPY_CARD_THEMES = {
      spy: { bgImage: 'assets/roles/spy.webp', themeColor: '#ef4444' },
      mr_white: { bgImage: 'assets/roles/spy.webp', themeColor: '#a855f7' },
      civilian: { bgImage: 'assets/roles/civilian.webp', themeColor: '#06b6d4' }
    },
    UNDERCOVER_DECKS = {},
    getDeckPairs = () => [],
    TWIST_QUESTION_PAIRS = [],
    SPYFALL_LOCATIONS = [],
    SPYFALL_QUESTIONS = [],
    ROUND_SPARKS = ['Mô tả bằng 1 câu ngắn gọn dựa trên trải nghiệm cá nhân của bạn!'],
    getRandomAvatarId = () => 'boy_smile'
  } = gd;

  let session = null;
  let isHost = false;
  let myName = '';
  let myAvatarId = '';
  let state = null;
  let mySecret = null; // { mode, role, word, hint, question, location, locRole }
  let cardRevealed = false;
  let crossedLocations = new Set();
  let lastReceivedSeq = -1;
  let lastSceneKey = '';
  let demoCounter = 1;
  let voteAllAnnounced = false;
  let lastBeaconJoinAt = 0;
  let voteLockTimer = null;
  let spyTickTimer = null;
  let voteLockSuppressed = false;
  let spyfall30sWarned = false;
  let spyfallTimeUpAnnounced = false;
  let clientVoteLockEnd = 0;
  let clientSpyfallEnd = 0;
  let customDeckActiveTab = 'undercover';
  const SNAPSHOT_KEY = 'hq_spy_host_snapshot';

  function getSpyfallLocations() {
    const list = window.GameData?.getAllSpyfallLocations?.();
    return Array.isArray(list) && list.length ? list : SPYFALL_LOCATIONS;
  }

  function formatCountdownMs(ms) {
    const totalSec = Math.max(0, Math.ceil(Number(ms || 0) / 1000));
    const mm = String(Math.floor(totalSec / 60)).padStart(2, '0');
    const ss = String(totalSec % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  }

  function snapshotKey() {
    return window.RoomNetwork?.storageKey ? window.RoomNetwork.storageKey(SNAPSHOT_KEY) : SNAPSHOT_KEY;
  }

  function randomEpoch() {
    return `e${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  }

  function computeMaxSpyVotes(playerCount, spyCount, hasMrWhite, mode) {
    if (mode === 'spyfall') {
      return Math.max(1, spyCount || 1);
    }
    const badCount = (spyCount || 1) + (hasMrWhite ? 1 : 0);
    let allowedMistakes = 0;
    if (playerCount >= 9) allowedMistakes = 3;
    else if (playerCount >= 7) allowedMistakes = 2;
    else if (playerCount >= 5) allowedMistakes = 1;
    return badCount + allowedMistakes;
  }

  function createInitialState() {
    return {
      stateSeq: 0,
      epoch: randomEpoch(),
      roomCode: window.RoomNetwork?.ROOM_ID || 'HQ01',
      hostId: null,
      phase: 'LOBBY', // LOBBY | PLAYING | MR_WHITE_GUESS | GAME_OVER
      config: {
        mode: 'undercover', // 'undercover' | 'twist' | 'spyfall'
        deckKey: 'all',
        spyCount: 1,
        mrWhite: false
      },
      settings: {
        autoVoteLock: false,
        spyfallTimerSec: 300
      },
      round: 1,
      maxVotes: 1,
      votesUsed: 0,
      aliveBadCount: 1,
      botText: 'Chờ mọi người quét QR vào phòng và ấn Sẵn sàng...',
      roundSpark: '',
      twistQuestionRevealed: false,
      revealedQuestionText: '',
      players: [], // { id, name, avatarId, ready, alive, isDemo, role (host-only), word, locRole }
      turnOrder: [],
      firstQuestionerId: null,
      spyfallDeadline: 0,
      votes: {},
      voteLock: null, // { targetId, endsAt }
      isPaused: false,
      pausedRemainingMs: 0,
      pausedSpyfallMs: 0,
      pausedVoteLockMs: 0,
      pendingMrWhiteId: null,
      winner: null, // 'civilian' | 'spy' | 'mr_white'
      winReason: '',
      answerSummary: null,
      crossedResetToken: 0
    };
  }

  function ensureStateDefaults(s) {
    if (!s) return s;
    s.config = {
      mode: 'undercover',
      deckKey: 'all',
      spyCount: 1,
      mrWhite: false,
      ...(s.config || {})
    };
    s.settings = {
      autoVoteLock: false,
      spyfallTimerSec: 300,
      ...(s.settings || {})
    };
    s.votes = s.votes || {};
    s.turnOrder = s.turnOrder || [];
    if (typeof s.isPaused !== 'boolean') s.isPaused = false;
    if (typeof s.pausedRemainingMs !== 'number') s.pausedRemainingMs = 0;
    if (typeof s.pausedSpyfallMs !== 'number') s.pausedSpyfallMs = 0;
    if (typeof s.pausedVoteLockMs !== 'number') s.pausedVoteLockMs = 0;
    if (typeof s.spyfallDeadline !== 'number') s.spyfallDeadline = 0;
    if (s.firstQuestionerId === undefined) s.firstQuestionerId = null;
    if (s.voteLock === undefined) s.voteLock = null;
    return s;
  }

  function getPublicState(s) {
    const revealAll = s.phase === 'GAME_OVER';
    const aliveBadCount = (s.players || []).filter(
      (p) => p.alive && (p.role === 'spy' || p.role === 'mr_white')
    ).length;
    const now = Date.now();
    const spyfallRemainingMs =
      s.phase === 'PLAYING' && s.config?.mode === 'spyfall'
        ? s.isPaused
          ? Math.max(0, s.pausedSpyfallMs || 0)
          : s.spyfallDeadline > 0
            ? Math.max(0, s.spyfallDeadline - now)
            : 0
        : 0;
    const publicVoteLock =
      s.voteLock && s.phase === 'PLAYING'
        ? {
            targetId: s.voteLock.targetId,
            remainingMs: s.isPaused
              ? Math.max(0, s.pausedVoteLockMs || 0)
              : Math.max(0, s.voteLock.endsAt - now)
          }
        : null;
    return {
      stateSeq: s.stateSeq,
      epoch: s.epoch,
      roomCode: s.roomCode,
      hostId: s.hostId,
      phase: s.phase,
      config: s.config,
      settings: s.settings || { autoVoteLock: false, spyfallTimerSec: 300 },
      round: s.round,
      maxVotes: s.maxVotes || 1,
      votesUsed: s.votesUsed || 0,
      aliveBadCount: s.phase === 'LOBBY' ? s.config.spyCount || 1 : aliveBadCount,
      botText: s.botText || '',
      roundSpark: s.roundSpark,
      twistQuestionRevealed: s.twistQuestionRevealed,
      revealedQuestionText: s.twistQuestionRevealed || revealAll ? s.revealedQuestionText : '',
      turnOrder: s.turnOrder,
      firstQuestionerId: s.firstQuestionerId || null,
      spyfallDeadline: s.spyfallDeadline || 0,
      spyfallRemainingMs,
      votes: s.votes,
      voteLock: publicVoteLock,
      isPaused: Boolean(s.isPaused),
      pausedRemainingMs: s.pausedRemainingMs || 0,
      pendingMrWhiteId: s.pendingMrWhiteId,
      winner: s.winner,
      winReason: s.winReason,
      answerSummary: revealAll ? s.answerSummary : null,
      crossedResetToken: s.crossedResetToken,
      players: s.players.map((p) => ({
        id: p.id,
        name: p.name,
        avatarId: p.avatarId || 'boy_smile',
        ready: p.ready,
        alive: p.alive,
        isDemo: p.isDemo,
        online: Boolean(
          p.isDemo || (session && session.isClientOnline ? session.isClientOnline(p.id) : true)
        ),
        revealedRole: !p.alive || revealAll ? p.role : null,
        role: revealAll ? p.role : null,
        word: revealAll ? p.word : null,
        locRole: revealAll ? p.locRole : null
      }))
    };
  }

  function syncStateToClients() {
    if (!isHost || !session || !state) return;
    state.stateSeq += 1;
    session.send('SPY_STATE', getPublicState(state));
    if (session.setBeaconInfo) {
      session.setBeaconInfo({ phase: state.phase, stateSeq: state.stateSeq, epoch: state.epoch });
    }
    saveHostSnapshot();
  }

  // ==================== HOST SNAPSHOT ====================
  function saveHostSnapshot() {
    if (!isHost || !state) return;
    try {
      localStorage.setItem(
        snapshotKey(),
        JSON.stringify({ v: 1, savedAt: Date.now(), state, demoCounter, voteAllAnnounced })
      );
    } catch (_) {}
  }

  function readHostSnapshot() {
    try {
      const raw = localStorage.getItem(snapshotKey());
      if (!raw) return null;
      const snap = JSON.parse(raw);
      if (!snap || !snap.state || !Array.isArray(snap.state.players) || !snap.state.phase) return null;
      if (!snap.state.config || typeof snap.state.stateSeq !== 'number') return null;
      return snap;
    } catch (_) {
      return null;
    }
  }

  function getHostSnapshotInfo() {
    const snap = readHostSnapshot();
    if (!snap) return null;
    return {
      phase: snap.state.phase,
      playerCount: snap.state.players.length,
      savedAt: snap.savedAt || 0
    };
  }

  function discardHostSnapshot() {
    try {
      localStorage.removeItem(snapshotKey());
    } catch (_) {}
  }

  // Đổi id người chơi (thiết bị mới / xoá dữ liệu trình duyệt) — sửa mọi chỗ lưu id.
  function remapPlayerId(oldId, newId) {
    if (!state || oldId === newId) return;
    state.players.forEach((p) => {
      if (p.id === oldId) p.id = newId;
    });
    const newVotes = {};
    Object.entries(state.votes || {}).forEach(([voterId, targetId]) => {
      newVotes[voterId === oldId ? newId : voterId] = targetId === oldId ? newId : targetId;
    });
    state.votes = newVotes;
    state.turnOrder = (state.turnOrder || []).map((id) => (id === oldId ? newId : id));
    if (state.firstQuestionerId === oldId) state.firstQuestionerId = newId;
    if (state.voteLock && state.voteLock.targetId === oldId) state.voteLock.targetId = newId;
    if (state.pendingMrWhiteId === oldId) state.pendingMrWhiteId = newId;
  }

  function setSpyBotSpeech(text) {
    if (!state) return;
    state.botText = text;
    syncStateToClients();
    render();
    try {
      window.AudioEngine?.speak?.(text);
    } catch (_) {}
  }

  function deliverSecretToPlayer(player) {
    if (!isHost || !state) return;
    const secretPayload = {
      mode: state.config.mode,
      role: player.role,
      word: player.word || null,
      hint: state.answerSummary ? state.answerSummary.hint || null : null,
      question: player.question || null,
      // Tuyệt đối không gửi địa điểm bí mật cho Gián Điệp trong chế độ Spyfall.
      location:
        player.role !== 'spy' && state.answerSummary ? state.answerSummary.location : null,
      locRole: player.locRole || null
    };

    if (player.id === session?.clientId) {
      mySecret = secretPayload;
    } else if (!player.isDemo && session) {
      session.send('SPY_SECRET', secretPayload, player.id);
    }
  }

  // ==================== ENTRY POINTS ====================
  function startHost({ resume = false } = {}) {
    cleanup();
    isHost = true;
    myName = 'Quản Trò';
    myAvatarId = '';
    demoCounter = 1;
    voteAllAnnounced = false;
    voteLockSuppressed = false;
    spyfall30sWarned = false;
    spyfallTimeUpAnnounced = false;

    const snap = resume ? readHostSnapshot() : null;
    if (snap) {
      state = ensureStateDefaults(snap.state);
      demoCounter = snap.demoCounter || 1;
      voteAllAnnounced = Boolean(snap.voteAllAnnounced);
      if (!state.epoch) state.epoch = randomEpoch();
      lastSceneKey = `${state.phase}:${state.round}:${state.winner || ''}`;
    } else {
      state = createInitialState();
    }

    session = window.RoomNetwork.createSession({
      gameType: 'spy',
      isHost: true,
      onMessage: handleHostMessage,
      onStatus: (txt, ok) => updateNetBadge('spy-net-status', txt, ok),
      onPresence: () => {
        if (!isHost || !state) return;
        syncStateToClients();
        render();
      },
      onSuperseded: () => {
        window.AppUI?.showToast?.('Máy khác đã tiếp quản vai trò Quản Trò.');
        window.AppUI?.clearSession?.();
        cleanup();
        window.AppUI?.goHome?.();
      }
    });

    state.hostId = session.clientId;
    // Laptop chỉ đóng vai Quản Trò Dẫn Chuyện — không thêm vào danh sách người chơi!
    window.AppUI?.markSession?.('host', 'spy');
    if (session.setBeaconInfo) {
      session.setBeaconInfo({ phase: state.phase, stateSeq: state.stateSeq, epoch: state.epoch });
    }

    bindEvents();
    renderShareBox();
    window.AppUI?.showView?.('view-spy-room');
    render();
    syncStateToClients(); // cũng lưu snapshot (ghi đè snapshot cũ khi bắt đầu mới)

    if (snap && state.phase !== 'LOBBY') {
      if (state.phase === 'PLAYING' && !state.isPaused) {
        if (state.voteLock && state.voteLock.endsAt) {
          armVoteLockTimer();
        }
        startSpyTickLoop();
      }
      if (state.botText && !state.isPaused) {
        try {
          window.AudioEngine?.speak?.(state.botText);
        } catch (_) {}
      }
      if (state.phase === 'MR_WHITE_GUESS') {
        const mw = state.players.find((p) => p.id === state.pendingMrWhiteId);
        if (mw && mw.isDemo) setTimeout(() => resolveMrWhiteGuess(''), 1400);
      }
    }
  }

  function joinAsPlayer(playerName, playerAvatarId) {
    cleanup();
    isHost = false;
    myName = playerName;
    myAvatarId = playerAvatarId || window.AppUI?.getSavedAvatarId?.() || 'boy_smile';
    lastReceivedSeq = -1;
    lastBeaconJoinAt = 0;
    state = createInitialState();
    state.epoch = null; // sẽ nhận epoch thật từ Quản Trò

    const announceJoin = () => {
      if (!session || isHost) return;
      session.send('SPY_JOIN', { name: myName, avatarId: myAvatarId });
    };

    session = window.RoomNetwork.createSession({
      gameType: 'spy',
      isHost: false,
      onMessage: handleClientMessage,
      onStatus: (txt, ok) => updateNetBadge('spy-net-status', txt, ok),
      onConnected: announceJoin,
      onBeacon: (b) => {
        if (!b || b.game !== 'spy' || !state || isHost) return;
        if (b.epoch !== state.epoch || b.stateSeq !== lastReceivedSeq) {
          const now = Date.now();
          if (now - lastBeaconJoinAt >= 1500) {
            lastBeaconJoinAt = now;
            announceJoin();
          }
        }
      }
    });

    window.AppUI?.markSession?.('player', 'spy');
    bindEvents();
    window.AppUI?.showView?.('view-spy-room');
    render();

    announceJoin();
  }

  function clearVoteLockTimer() {
    if (voteLockTimer) {
      clearTimeout(voteLockTimer);
      voteLockTimer = null;
    }
  }

  function stopSpyTickLoop() {
    if (spyTickTimer) {
      clearInterval(spyTickTimer);
      spyTickTimer = null;
    }
  }

  function startSpyTickLoop() {
    stopSpyTickLoop();
    if (!state || state.phase !== 'PLAYING') return;
    updateDynamicCountdowns();
    spyTickTimer = setInterval(() => {
      if (!state || state.phase !== 'PLAYING') {
        stopSpyTickLoop();
        return;
      }
      updateDynamicCountdowns();
    }, 1000);
  }

  function cancelVoteLock({ byHost = false, silent = false } = {}) {
    clearVoteLockTimer();
    const hadLock = Boolean(state && state.voteLock);
    if (state) {
      state.voteLock = null;
      state.pausedVoteLockMs = 0;
    }
    if (byHost) {
      voteLockSuppressed = true;
    }
    if (hadLock && !silent && isHost && state) {
      syncStateToClients();
      render();
      if (byHost) {
        window.AppUI?.showToast?.('Đã hủy tự chốt phiếu.');
      }
    }
  }

  function armVoteLockTimer() {
    clearVoteLockTimer();
    if (!isHost || !state || state.phase !== 'PLAYING' || state.isPaused || !state.voteLock) return;
    const lock = state.voteLock;
    const delay = Math.max(100, lock.endsAt - Date.now());
    voteLockTimer = setTimeout(() => {
      voteLockTimer = null;
      if (!isHost || !state || state.phase !== 'PLAYING' || state.isPaused) return;
      const cur = state.voteLock;
      if (!cur || cur.targetId !== lock.targetId || cur.endsAt !== lock.endsAt) return;
      state.voteLock = null;
      state.pausedVoteLockMs = 0;
      eliminatePlayer(cur.targetId);
    }, delay);
  }

  function evaluateSpyVoteLock() {
    if (!isHost || !state || state.phase !== 'PLAYING') {
      if (state && state.voteLock) cancelVoteLock({ silent: true });
      return;
    }
    if (!state.settings?.autoVoteLock || state.isPaused || voteLockSuppressed) {
      if (!state.settings?.autoVoteLock && state.voteLock) {
        cancelVoteLock({ silent: true });
      }
      return;
    }

    const realAlive = state.players.filter((p) => p.alive && !p.isDemo);
    if (realAlive.length === 0 || !realAlive.every((p) => Boolean(state.votes[p.id]))) {
      if (state.voteLock) cancelVoteLock({ silent: true });
      return;
    }

    const entries = Object.entries(getVoteCounts()).sort((a, b) => b[1].length - a[1].length);
    if (entries.length === 0) {
      if (state.voteLock) cancelVoteLock({ silent: true });
      return;
    }

    const topCount = entries[0][1].length;
    const leaders = entries.filter(([, voters]) => voters.length === topCount);
    if (leaders.length !== 1) {
      // Hòa phiếu -> hủy tự chốt phiếu
      if (state.voteLock) cancelVoteLock({ silent: true });
      return;
    }

    const leaderId = leaders[0][0];
    if (state.voteLock && state.voteLock.targetId === leaderId) {
      return;
    }

    clearVoteLockTimer();
    state.voteLock = { targetId: leaderId, endsAt: Date.now() + 8000 };
    armVoteLockTimer();
    try {
      window.AudioEngine?.playSfx?.('vote_tick');
    } catch (_) {}
    const leader = state.players.find((p) => p.id === leaderId);
    if (leader) {
      window.AppUI?.showToast?.(`Tất cả đã vote! Tự chốt loại ${leader.name} sau 8 giây.`);
    }
  }

  function pauseGame() {
    if (!isHost || !state || state.isPaused) return;
    if (state.phase !== 'PLAYING' && state.phase !== 'MR_WHITE_GUESS') return;

    const now = Date.now();
    state.pausedSpyfallMs =
      state.config?.mode === 'spyfall' && state.spyfallDeadline > 0
        ? Math.max(0, state.spyfallDeadline - now)
        : 0;
    if (state.voteLock && state.voteLock.endsAt) {
      state.pausedVoteLockMs = Math.max(0, state.voteLock.endsAt - now);
      clearVoteLockTimer();
    } else {
      state.pausedVoteLockMs = 0;
    }
    state.pausedRemainingMs = state.pausedSpyfallMs || state.pausedVoteLockMs || 0;
    state.isPaused = true;

    try {
      window.AudioEngine?.pauseAll?.();
    } catch (_) {}
    if (session) {
      session.send('SPY_PAUSE_STATE', {
        paused: true,
        pausedRemainingMs: state.pausedRemainingMs,
        spyfallRemainingMs: state.pausedSpyfallMs,
        voteLockRemainingMs: state.pausedVoteLockMs
      });
    }
    syncStateToClients();
    render();
  }

  function resumeGame() {
    if (!isHost || !state || !state.isPaused) return;
    const now = Date.now();
    if (state.pausedSpyfallMs > 0) {
      state.spyfallDeadline = now + state.pausedSpyfallMs;
    }
    state.pausedSpyfallMs = 0;

    if (state.voteLock) {
      const rem = state.pausedVoteLockMs > 0 ? state.pausedVoteLockMs : 500;
      state.voteLock.endsAt = now + rem;
      armVoteLockTimer();
    }
    state.pausedVoteLockMs = 0;
    state.pausedRemainingMs = 0;
    state.isPaused = false;

    try {
      window.AudioEngine?.resumeAll?.();
    } catch (_) {}
    if (session) {
      session.send('SPY_PAUSE_STATE', { paused: false });
    }
    syncStateToClients();
    render();
    if (state.phase === 'PLAYING') {
      startSpyTickLoop();
    }
  }

  function togglePause() {
    if (!state) return;
    if (state.isPaused) resumeGame();
    else pauseGame();
  }

  function cleanup() {
    lastSceneKey = '';
    clearVoteLockTimer();
    stopSpyTickLoop();
    voteLockSuppressed = false;
    spyfall30sWarned = false;
    spyfallTimeUpAnnounced = false;
    clientVoteLockEnd = 0;
    clientSpyfallEnd = 0;
    try {
      window.AudioEngine?.stopSpeech?.();
      window.AudioEngine?.stopNightAmbience?.();
    } catch (_) {}
    if (session) {
      session.destroy();
      session = null;
    }
    state = null;
    mySecret = null;
    cardRevealed = false;
    crossedLocations.clear();
  }

  // ==================== HOST MESSAGE HANDLER ====================
  function handleHostMessage(msg) {
    if (!state) return;
    const { senderId, type, payload } = msg;

    if (type === 'SPY_JOIN') {
      const cleanName = String(payload.name || 'Người chơi').trim().slice(0, 20) || 'Người chơi';
      const avatarId = payload.avatarId || getRandomAvatarId(state.players.length);
      let player = state.players.find((p) => p.id === senderId);
      let changed = false;
      if (!player) {
        if (state.phase !== 'LOBBY') {
          const byName = state.players.find(
            (p) => p.name.toLowerCase() === cleanName.toLowerCase() && !p.isDemo
          );
          if (byName) {
            remapPlayerId(byName.id, senderId);
            if (payload.avatarId) byName.avatarId = payload.avatarId;
            syncStateToClients();
            render();
            deliverSecretToPlayer(byName);
          }
          return;
        }
        player = {
          id: senderId,
          name: cleanName,
          avatarId,
          ready: false,
          alive: true,
          isDemo: false,
          role: null
        };
        state.players.push(player);
        changed = true;
      } else if (state.phase === 'LOBBY') {
        if (player.name !== cleanName) {
          player.name = cleanName;
          changed = true;
        }
        if (payload.avatarId && player.avatarId !== payload.avatarId) {
          player.avatarId = payload.avatarId;
          changed = true;
        }
      }

      if (changed) {
        syncStateToClients();
        render();
      } else {
        // JOIN lặp lại: chỉ gửi lại trạng thái hiện tại cho người này (idempotent)
        session.send('SPY_STATE', getPublicState(state), senderId);
      }
      if (state.phase !== 'LOBBY') {
        deliverSecretToPlayer(player);
      }
      return;
    }

    if (type === 'SPY_RENAME') {
      const p = state.players.find((x) => x.id === senderId);
      if (p && state.phase === 'LOBBY') {
        p.name = String(payload.name || p.name).trim().slice(0, 20) || p.name;
        if (payload.avatarId) p.avatarId = payload.avatarId;
        syncStateToClients();
        render();
      }
      return;
    }

    if (type === 'SPY_READY') {
      const p = state.players.find((x) => x.id === senderId);
      if (p && state.phase === 'LOBBY') {
        p.ready = Boolean(payload.ready);
        syncStateToClients();
        render();
      }
      return;
    }

    if (type === 'SPY_LEAVE') {
      if (state.phase === 'LOBBY') {
        state.players = state.players.filter((x) => x.id !== senderId);
        syncStateToClients();
        render();
      }
      return;
    }

    if (type === 'SPY_VOTE' && state.phase === 'PLAYING') {
      if (state.isPaused) return;
      recordSpyVote(senderId, payload.targetId);
      return;
    }

    if (type === 'SPY_MRWHITE_GUESS' && state.phase === 'MR_WHITE_GUESS' && senderId === state.pendingMrWhiteId) {
      if (state.isPaused) return;
      resolveMrWhiteGuess(payload.guessText || '');
      return;
    }

    if (type === 'SPY_LOCATION_GUESS' && state.phase === 'PLAYING') {
      if (state.isPaused) return;
      const spy = state.players.find((x) => x.id === senderId && x.alive && x.role === 'spy');
      if (spy) {
        resolveSpyfallLocationGuess(spy, payload.location || '');
      }
    }
  }

  function recordSpyVote(voterId, targetId) {
    if (!state || state.phase !== 'PLAYING' || state.isPaused) return;
    const voter = state.players.find((x) => x.id === voterId && x.alive);
    const target = state.players.find((x) => x.id === targetId && x.alive);
    if (!voter || !target || voter.id === target.id) return;
    voteLockSuppressed = false;
    state.votes[voterId] = targetId;
    evaluateSpyVoteLock();
    syncStateToClients();
    render();
    checkAllSpyVoted();
  }

  function checkAllSpyVoted() {
    if (voteAllAnnounced || !state || state.phase !== 'PLAYING') return;
    const realAlive = state.players.filter((p) => p.alive && !p.isDemo);
    if (realAlive.length === 0) return;
    if (realAlive.every((p) => Boolean(state.votes[p.id]))) {
      voteAllAnnounced = true;
      saveHostSnapshot();
      try {
        window.AudioEngine?.playVoteGavel?.();
      } catch (_) {}
      const sorted = Object.entries(getVoteCounts()).sort((a, b) => b[1].length - a[1].length);
      if (sorted[0]) {
        const topPlayer = state.players.find((p) => p.id === sorted[0][0]);
        try {
          window.AudioEngine?.speak?.(
            `Mọi người đã bỏ phiếu xong! ${topPlayer ? topPlayer.name : ''} đang có nhiều phiếu nghi ngờ nhất.`
          );
        } catch (_) {}
      }
    }
  }

  // ==================== HOST GAME LOGIC ====================
  function startNewRoundGame() {
    if (!isHost || !state) return;
    ensureStateDefaults(state);
    try {
      window.AudioEngine?.unlock?.();
    } catch (_) {}

    clearVoteLockTimer();
    stopSpyTickLoop();
    voteLockSuppressed = false;
    spyfall30sWarned = false;
    spyfallTimeUpAnnounced = false;
    state.isPaused = false;
    state.pausedRemainingMs = 0;
    state.pausedSpyfallMs = 0;
    state.pausedVoteLockMs = 0;
    state.voteLock = null;
    state.spyfallDeadline = 0;
    state.firstQuestionerId = null;

    const n = state.players.length;
    const spiesWanted = Math.min(state.config.spyCount || 1, Math.max(1, Math.floor((n - 1) / 2)));
    const wantMrWhite = state.config.mode === 'undercover' && state.config.mrWhite && n >= spiesWanted + 2;

    const indices = state.players.map((_, i) => i);
    shuffle(indices);

    state.round = 1;
    state.votesUsed = 0;
    state.maxVotes = computeMaxSpyVotes(n, spiesWanted, wantMrWhite, state.config.mode);
    state.votes = {};
    voteAllAnnounced = false;
    state.pendingMrWhiteId = null;
    state.winner = null;
    state.winReason = '';
    state.twistQuestionRevealed = false;
    state.revealedQuestionText = '';
    state.crossedResetToken += 1;
    crossedLocations.clear();
    cardRevealed = false;

    lastSceneKey = '';
    state.players.forEach((p) => {
      p.alive = true;
      p.role = 'civilian';
      p.word = null;
      p.question = null;
      p.locRole = null;
    });

    if (state.config.mode === 'undercover') {
      let chosenDeckKey = state.config.deckKey || 'all';
      if (chosenDeckKey === 'custom') {
        const customPairs = getDeckPairs('custom') || [];
        if (customPairs.length < 1) {
          window.AppUI?.showToast?.('Bộ tự tạo chưa có cặp từ Undercover — tạm chuyển sang trộn kho đề chung!');
          chosenDeckKey = 'all';
        }
      }
      let pair = window.GameData?.pickUndercoverPair?.(chosenDeckKey);
      if (!pair) {
        const pairs = getDeckPairs(chosenDeckKey);
        const pool = pairs && pairs.length ? pairs : getDeckPairs('all');
        pair = pool[Math.floor(Math.random() * pool.length)];
      }
      const flip = Math.random() < 0.5;
      const civilianWord = flip ? pair[0] : pair[1];
      const spyWord = flip ? pair[1] : pair[0];

      for (let i = 0; i < spiesWanted; i++) {
        state.players[indices[i]].role = 'spy';
        state.players[indices[i]].word = spyWord;
      }
      if (wantMrWhite) {
        state.players[indices[spiesWanted]].role = 'mr_white';
        state.players[indices[spiesWanted]].word = null;
      }
      state.players.forEach((p) => {
        if (p.role === 'civilian') p.word = civilianWord;
      });

      state.answerSummary = {
        mode: 'undercover',
        category: pair[2] || 'Chung',
        hint: pair[3] || '',
        civilianWord,
        spyWord,
        location: null
      };
      state.roundSpark = ROUND_SPARKS[0];
    } else if (state.config.mode === 'twist') {
      let pair = window.GameData?.pickTwistQuestion?.();
      if (!pair) {
        pair = TWIST_QUESTION_PAIRS[Math.floor(Math.random() * TWIST_QUESTION_PAIRS.length)];
      }
      const flip = Math.random() < 0.5;
      const qCiv = flip ? pair[0] : pair[1];
      const qSpy = flip ? pair[1] : pair[0];

      for (let i = 0; i < spiesWanted; i++) {
        state.players[indices[i]].role = 'spy';
        state.players[indices[i]].question = qSpy;
      }
      state.players.forEach((p) => {
        if (p.role === 'civilian') p.question = qCiv;
      });

      state.revealedQuestionText = qCiv;
      state.answerSummary = {
        mode: 'twist',
        category: pair[2] || 'Hỏi xoáy',
        civilianWord: qCiv,
        spyWord: qSpy,
        location: null
      };
      state.roundSpark = 'Mọi người lần lượt trả lời câu hỏi trên thẻ (cấm đọc đề), xong rồi bấm Lật Câu Hỏi Thật!';
    } else {
      let loc = window.GameData?.pickSpyfallLocation?.();
      if (!loc) {
        const allLocs = getSpyfallLocations();
        loc = allLocs[Math.floor(Math.random() * allLocs.length)];
      }
      const rolesList = Array.isArray(loc.roles) && loc.roles.length ? loc.roles : ['Khách', 'Nhân viên', 'Quản lý', 'Thành viên'];
      const shuffledRoles = [...rolesList];
      shuffle(shuffledRoles);

      for (let i = 0; i < spiesWanted; i++) {
        state.players[indices[i]].role = 'spy';
      }
      let roleCursor = 0;
      state.players.forEach((p) => {
        if (p.role === 'civilian') {
          p.locRole = shuffledRoles[roleCursor % shuffledRoles.length];
          roleCursor += 1;
        }
      });

      state.answerSummary = {
        mode: 'spyfall',
        location: loc.name,
        civilianWord: null,
        spyWord: null
      };
      state.roundSpark = 'Đặt câu hỏi qua lại để tìm ai không biết địa điểm bí mật!';
    }

    const orderIds = state.players.map((p) => p.id);
    shuffle(orderIds);
    state.turnOrder = orderIds;
    state.phase = 'PLAYING';

    if (state.config.mode === 'spyfall') {
      state.firstQuestionerId = state.turnOrder[0] || null;
      const timerSec = Number(state.settings?.spyfallTimerSec ?? 300);
      state.spyfallDeadline = timerSec > 0 ? Date.now() + timerSec * 1000 : 0;
    }

    state.players.forEach((p) => deliverSecretToPlayer(p));
    syncStateToClients();
    render();
    startSpyTickLoop();
    try {
      window.AudioEngine?.playRoosterDawn?.();
    } catch (_) {}

    const firstSpeaker = state.players.find((p) => p.id === state.turnOrder[0]);
    const voteBudgetNote = `Cả hội có tối đa ${state.maxVotes} lượt vote để tìm ra Gián Điệp.`;
    if (state.config.mode === 'undercover') {
      setSpyBotSpeech(
        `Ván Gián Điệp bắt đầu! Mọi người hãy giữ thẻ trên điện thoại để xem từ khóa. Người phát biểu đầu tiên là ${
          firstSpeaker ? firstSpeaker.name : ''
        }. ${voteBudgetNote}`
      );
    } else if (state.config.mode === 'twist') {
      setSpyBotSpeech(
        `Chế độ Hỏi Xoáy bắt đầu! Hãy đọc thầm câu hỏi trên điện thoại và lần lượt trả lời thành tiếng, bắt đầu từ ${
          firstSpeaker ? firstSpeaker.name : ''
        }! ${voteBudgetNote}`
      );
    } else {
      const firstQ = state.players.find((p) => p.id === state.firstQuestionerId);
      const firstName = firstQ ? firstQ.name : firstSpeaker ? firstSpeaker.name : '';
      setSpyBotSpeech(
        `Spyfall bắt đầu! Dân thường hãy xem địa điểm bí mật, còn Gián Điệp hãy lắng nghe thật kỹ! Người đặt câu hỏi đầu tiên là ${firstName}! ${voteBudgetNote}`
      );
    }
  }

  function revealTwistQuestion() {
    if (!isHost || !state || state.config.mode !== 'twist') return;
    state.twistQuestionRevealed = true;
    try {
      window.AudioEngine?.playVoteGavel?.();
    } catch (_) {}
    setSpyBotSpeech(`Câu hỏi thật của Dân Thường là: ${state.revealedQuestionText}`);
  }

  function eliminatePlayer(targetId) {
    if (!isHost || !state || state.phase !== 'PLAYING') return;
    const target = state.players.find((p) => p.id === targetId && p.alive);
    if (!target) return;

    cancelVoteLock({ silent: true });
    voteLockSuppressed = false;
    try {
      window.AudioEngine?.playVoteGavel?.();
      window.SceneFX?.flash?.('rgba(244, 63, 94, 0.22)');
    } catch (_) {}
    target.alive = false;
    state.votesUsed = (state.votesUsed || 0) + 1;
    state.votes = {};
    voteAllAnnounced = false;

    if (state.config.mode === 'undercover' && target.role === 'mr_white') {
      state.phase = 'MR_WHITE_GUESS';
      state.pendingMrWhiteId = target.id;
      const hostInput = typeof document !== 'undefined' ? document.getElementById('spy-host-mrwhite-input') : null;
      if (hostInput) hostInput.value = '';
      setSpyBotSpeech(`${target.name} chính là Mr. White! Mời ${target.name} đoán từ khóa của Dân Thường.`);
      if (target.id === session?.clientId) {
        openGuessDialog('mr_white');
      } else if (target.isDemo) {
        setTimeout(() => resolveMrWhiteGuess(''), 1400);
      }
      return;
    }

    evaluateAfterElimination(target);
  }

  function resolveMrWhiteGuess(guessText) {
    if (!state || state.phase !== 'MR_WHITE_GUESS') return;
    const mrWhite = state.players.find((p) => p.id === state.pendingMrWhiteId);
    state.pendingMrWhiteId = null;

    const cleanGuess = String(guessText || '').trim().toLowerCase().normalize('NFC');
    const cleanAnswer = String(state.answerSummary?.civilianWord || '').trim().toLowerCase().normalize('NFC');

    if (cleanGuess && cleanGuess === cleanAnswer) {
      endGame(
        'mr_white',
        `${mrWhite ? mrWhite.name : 'Mr. White'} đã đoán trúng từ khóa "${state.answerSummary.civilianWord}" và lật kèo chiến thắng!`
      );
      return;
    }

    window.AppUI?.showToast?.(`Mr. White đoán "${guessText || '...'}" — Không chính xác!`);
    evaluateAfterElimination(mrWhite);
  }

  function resolveSpyfallLocationGuess(spyPlayer, guessedLocation) {
    const targetLoc = state.answerSummary?.location || '';
    if (guessedLocation === targetLoc) {
      endGame('spy', `Gián Điệp ${spyPlayer.name} đã đoán chính xác địa điểm "${targetLoc}"!`);
    } else {
      endGame(
        'civilian',
        `Gián Điệp ${spyPlayer.name} đoán nhầm thành "${guessedLocation}" (Đáp án đúng là "${targetLoc}"). Phe Dân Thường thắng!`
      );
    }
  }

  function evaluateAfterElimination(eliminated) {
    const alive = state.players.filter((p) => p.alive);
    const aliveBad = alive.filter((p) => p.role === 'spy' || p.role === 'mr_white');
    const aliveCiv = alive.filter((p) => p.role === 'civilian');
    const remainingVotes = Math.max(0, (state.maxVotes || 1) - (state.votesUsed || 0));

    if (state.config.mode === 'spyfall') {
      if (aliveBad.length === 0) {
        endGame('civilian', `Chính xác! Cả hội đã bắt đúng Gián Điệp ${eliminated ? eliminated.name : ''}!`);
        return;
      }
      if (eliminated && eliminated.role === 'civilian' && remainingVotes <= 0) {
        endGame('spy', `Bắt nhầm Dân Thường ${eliminated.name}! Hết lượt vote — Gián Điệp đã thoát thành công!`);
        return;
      }
      if (aliveBad.length >= aliveCiv.length) {
        endGame('spy', `Gián Điệp đã áp đảo số lượng Dân Thường! Phe Gián Điệp thắng!`);
        return;
      }
      advanceToNextRound(
        eliminated ? `${eliminated.name} (${eliminated.role === 'spy' ? 'Gián Điệp' : 'Dân Thường'}) đã bị loại! Còn ${remainingVotes} lượt vote.` : ''
      );
      return;
    }

    // Undercover & Twist
    if (aliveBad.length === 0) {
      endGame('civilian', 'Chính xác! Toàn bộ Gián Điệp đã bị vạch mặt! Phe Dân Thường chiến thắng!');
      return;
    }
    if (aliveBad.length >= aliveCiv.length) {
      endGame('spy', 'Số Gián Điệp còn lại đã ngang bằng Dân Thường! Phe Gián Điệp chiến thắng!');
      return;
    }
    if (remainingVotes <= 0) {
      endGame('spy', 'Cả hội đã dùng hết toàn bộ lượt Vote mà vẫn chưa bắt hết Gián Điệp! Phe Gián Điệp chiến thắng!');
      return;
    }

    const roleLabel =
      eliminated?.role === 'spy' ? 'Gián Điệp' : eliminated?.role === 'mr_white' ? 'Mr. White' : 'Dân Thường';
    advanceToNextRound(
      eliminated ? `${eliminated.name} là ${roleLabel}! Cả hội còn ${remainingVotes} lượt vote.` : ''
    );
  }

  function advanceToNextRound(notice) {
    cancelVoteLock({ silent: true });
    voteLockSuppressed = false;
    state.phase = 'PLAYING';
    state.round += 1;
    state.votes = {};
    voteAllAnnounced = false;
    try {
      window.AudioEngine?.playRoundSwell?.();
    } catch (_) {}
    state.roundSpark = ROUND_SPARKS[(state.round - 1) % ROUND_SPARKS.length];
    const aliveIds = state.players.filter((p) => p.alive).map((p) => p.id);
    shuffle(aliveIds);
    state.turnOrder = aliveIds;
    if (state.config.mode === 'spyfall') {
      state.firstQuestionerId = state.turnOrder[0] || state.firstQuestionerId;
    }
    if (notice) {
      window.AppUI?.showToast?.(notice);
      setSpyBotSpeech(`${notice} Bắt đầu vòng ${state.round}!`);
    } else {
      syncStateToClients();
      render();
    }
  }

  function endGame(winner, winReason) {
    cancelVoteLock({ silent: true });
    stopSpyTickLoop();
    state.isPaused = false;
    state.pausedRemainingMs = 0;
    state.pausedSpyfallMs = 0;
    state.pausedVoteLockMs = 0;
    state.phase = 'GAME_OVER';
    state.winner = winner;
    state.winReason = winReason;
    try {
      window.StatsAwards?.recordSpyGame?.(state);
    } catch (_) {}
    try {
      window.AudioEngine?.playVictory?.();
    } catch (_) {}
    setSpyBotSpeech(winReason);
  }

  // ==================== CLIENT MESSAGE HANDLER ====================
  function handleClientMessage(msg) {
    if (!state) return;
    const { type, payload } = msg;

    if (type === 'SPY_PAUSE_STATE') {
      state.isPaused = Boolean(payload?.paused);
      if (typeof payload?.spyfallRemainingMs === 'number') {
        state.spyfallRemainingMs = payload.spyfallRemainingMs;
      }
      if (typeof payload?.voteLockRemainingMs === 'number') {
        state.voteLockRemainingMs = payload.voteLockRemainingMs;
      }
      render();
      return;
    }

    if (type === 'SPY_STATE') {
      if (
        typeof payload.stateSeq === 'number' &&
        payload.phase !== 'LOBBY' &&
        payload.stateSeq < lastReceivedSeq
      ) {
        return;
      }
      if (payload.epoch && state.epoch && payload.epoch !== state.epoch) {
        // Quản Trò đã tạo phòng/ván mới → bỏ trạng thái cũ
        lastReceivedSeq = -1;
        mySecret = null;
        cardRevealed = false;
        crossedLocations.clear();
      }
      if (typeof payload.stateSeq === 'number') {
        lastReceivedSeq = payload.stateSeq;
      }

      const prevReset = state.crossedResetToken;
      state = ensureStateDefaults({ ...state, ...payload });
      clientSpyfallEnd =
        !state.isPaused && Number(payload.spyfallRemainingMs) > 0
          ? Date.now() + Number(payload.spyfallRemainingMs)
          : 0;
      clientVoteLockEnd =
        !state.isPaused && payload.voteLock && Number(payload.voteLock.remainingMs) > 0
          ? Date.now() + Number(payload.voteLock.remainingMs)
          : 0;
      const meSynced = (state.players || []).find((p) => p.id === session?.clientId);
      if (meSynced && meSynced.avatarId) {
        myAvatarId = meSynced.avatarId;
      }
      if (state.phase === 'LOBBY') {
        mySecret = null;
        cardRevealed = false;
        stopSpyTickLoop();
      }
      if (payload.crossedResetToken !== prevReset) {
        crossedLocations.clear();
        cardRevealed = false;
      }
      if (state.phase === 'GAME_OVER') {
        try {
          window.StatsAwards?.recordSpyGame?.(state);
        } catch (_) {}
      }
      render();
      if (state.phase === 'PLAYING' && !state.isPaused) {
        startSpyTickLoop();
      }

      if (state.phase === 'MR_WHITE_GUESS' && state.pendingMrWhiteId === session?.clientId) {
        openGuessDialog('mr_white');
      }
      return;
    }

    if (type === 'SPY_SECRET') {
      mySecret = payload;
      render();
    }
  }

  // ==================== DYNAMIC DOM & CUSTOM DECK MODAL ====================
  function ensureSpyStyles() {
    if (typeof document === 'undefined' || !document.head) return;
    if (document.getElementById('spy-v4-styles')) return;
    const styleEl = document.createElement('style');
    styleEl.id = 'spy-v4-styles';
    styleEl.textContent = `
      .spy-manage-deck-btn { margin-top: 0.45rem; align-self: flex-start; }
      .spy-pause-banner {
        border-color: rgba(251, 191, 36, 0.55);
        background: rgba(251, 191, 36, 0.14);
        color: #fde68a;
        font-weight: 700;
        text-align: center;
        margin-bottom: 0.85rem;
      }
      .spy-first-questioner-badge {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        padding: 0.4rem 0.78rem;
        border-radius: 999px;
        background: rgba(34, 211, 238, 0.14);
        border: 1px solid rgba(34, 211, 238, 0.42);
        color: #a5f3fc;
        font-weight: 700;
        font-size: 0.9rem;
        margin-bottom: 0.7rem;
      }
      .spy-vote-lock-banner {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.65rem;
        flex-wrap: wrap;
        margin-top: 0.65rem;
        padding: 0.65rem 0.85rem;
        border-radius: 12px;
        border: 1px solid rgba(251, 191, 36, 0.5);
        background: rgba(251, 191, 36, 0.12);
        color: #fde68a;
        font-weight: 700;
      }
      #spy-custom-deck-dialog { width: min(640px, calc(100vw - 1.5rem)); }
      .spy-cd-stats { font-size: 0.85rem; color: var(--text-muted, #94a3b8); margin-bottom: 0.65rem; }
      .spy-cd-tabs { display: flex; gap: 0.45rem; flex-wrap: wrap; margin-bottom: 0.85rem; }
      .spy-cd-tab { flex: 1 1 auto; }
      .spy-cd-tab.is-active { border-color: rgba(34, 211, 238, 0.65); background: rgba(34, 211, 238, 0.18); color: #ecfeff; }
      .spy-cd-form { display: grid; gap: 0.55rem; margin-bottom: 0.85rem; }
      .spy-cd-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.55rem; }
      .spy-cd-import { display: grid; gap: 0.45rem; margin-bottom: 0.85rem; padding-top: 0.65rem; border-top: 1px solid rgba(148, 163, 184, 0.2); }
      .spy-cd-import textarea { min-height: 76px; resize: vertical; }
      .spy-cd-toolbar { display: flex; gap: 0.5rem; flex-wrap: wrap; justify-content: space-between; align-items: center; margin-bottom: 0.65rem; }
      .spy-cd-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.45rem; max-height: 220px; overflow-y: auto; }
      .spy-cd-item {
        display: flex; align-items: center; justify-content: space-between; gap: 0.6rem;
        padding: 0.5rem 0.7rem; border-radius: 10px;
        background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(148, 163, 184, 0.18);
      }
      .spy-cd-item-meta { display: grid; gap: 0.15rem; font-size: 0.88rem; min-width: 0; }
      .spy-cd-item-sub { font-size: 0.76rem; color: var(--text-muted, #94a3b8); }
      @media (max-width: 520px) { .spy-cd-row { grid-template-columns: 1fr; } }
    `;
    document.head.appendChild(styleEl);
  }

  function deleteCustomDeckItem(mode, id) {
    const dataApi = window.GameData;
    if (!dataApi || !id) return false;
    if (typeof dataApi.removeCustomSpyItem === 'function') {
      return dataApi.removeCustomSpyItem(mode, id);
    }
    if (mode === 'undercover' && typeof dataApi.removeCustomUndercoverPair === 'function') {
      return dataApi.removeCustomUndercoverPair(id);
    }
    if (mode === 'twist' && typeof dataApi.removeCustomTwistQuestion === 'function') {
      return dataApi.removeCustomTwistQuestion(id);
    }
    if (mode === 'spyfall' && typeof dataApi.removeCustomSpyfallLocation === 'function') {
      return dataApi.removeCustomSpyfallLocation(id);
    }
    return false;
  }

  function ensureCustomDeckDialog() {
    if (typeof document === 'undefined' || !document.body) return null;
    let dialog = document.getElementById('spy-custom-deck-dialog');
    if (dialog) return dialog;

    dialog = document.createElement('dialog');
    dialog.id = 'spy-custom-deck-dialog';
    dialog.setAttribute('closedby', 'any');
    dialog.setAttribute('aria-labelledby', 'spy-custom-deck-title');

    const header = document.createElement('div');
    header.className = 'dialog-header';
    const title = document.createElement('h2');
    title.id = 'spy-custom-deck-title';
    title.textContent = '✏️ Tạo / Sửa bộ đề của hội';
    const closeIconBtn = document.createElement('button');
    closeIconBtn.type = 'button';
    closeIconBtn.className = 'btn btn-ghost btn-sm';
    closeIconBtn.setAttribute('aria-label', 'Đóng');
    closeIconBtn.textContent = '✕';
    closeIconBtn.addEventListener('click', () => dialog.close());
    header.append(title, closeIconBtn);

    const body = document.createElement('div');
    body.className = 'dialog-body-stack';
    body.innerHTML = `
      <div class="spy-cd-stats" data-role="stats"></div>
      <div class="spy-cd-tabs" role="tablist" aria-label="Loại bộ đề tự tạo">
        <button type="button" class="btn btn-secondary btn-sm spy-cd-tab" data-tab="undercover">Cặp từ Undercover</button>
        <button type="button" class="btn btn-secondary btn-sm spy-cd-tab" data-tab="twist">Câu hỏi Hỏi Xoáy</button>
        <button type="button" class="btn btn-secondary btn-sm spy-cd-tab" data-tab="spyfall">Địa điểm Spyfall</button>
      </div>
      <form class="spy-cd-form" data-role="add-form">
        <div class="spy-cd-row" data-role="fields-main"></div>
        <div class="spy-cd-row" data-role="fields-extra"></div>
        <button type="submit" class="btn btn-primary btn-sm">+ Thêm vào bộ đề của hội</button>
      </form>
      <div class="spy-cd-import">
        <label class="field-label-text" data-role="import-label">Nhập nhanh nhiều dòng:</label>
        <textarea data-role="import-text" placeholder="Mỗi dòng 1 mục..."></textarea>
        <button type="button" class="btn btn-secondary btn-sm" data-action="import">📥 Nhập nhanh nhiều dòng</button>
      </div>
      <div class="spy-cd-toolbar">
        <span class="field-label-text" data-role="list-heading">Danh sách đã lưu</span>
        <div style="display:flex;gap:0.45rem;flex-wrap:wrap;">
          <button type="button" class="btn btn-ghost btn-sm" data-action="export">📋 Copy JSON</button>
          <button type="button" class="btn btn-danger btn-sm" data-action="clear-all">🗑️ Xóa toàn bộ</button>
        </div>
      </div>
      <ul class="spy-cd-list" data-role="item-list"></ul>
    `;

    const footerForm = document.createElement('form');
    footerForm.method = 'dialog';
    footerForm.className = 'dialog-actions';
    const doneBtn = document.createElement('button');
    doneBtn.type = 'submit';
    doneBtn.value = 'close';
    doneBtn.className = 'btn btn-primary';
    doneBtn.textContent = 'Đóng';
    footerForm.appendChild(doneBtn);

    dialog.append(header, body, footerForm);
    document.body.appendChild(dialog);

    // Fallback light-dismiss CHỈ KHI trình duyệt chưa hỗ trợ closedBy trên HTMLDialogElement
    if (typeof HTMLDialogElement !== 'undefined' && !('closedBy' in HTMLDialogElement.prototype)) {
      const isOutside = (e) => {
        const r = dialog.getBoundingClientRect();
        return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
      };
      let pressedOutside = false;
      dialog.addEventListener('pointerdown', (e) => {
        pressedOutside = isOutside(e);
      });
      dialog.addEventListener('pointerup', (e) => {
        if (pressedOutside && isOutside(e)) dialog.close();
      });
    }

    dialog.addEventListener('close', () => {
      dialog.returnValue = '';
    });

    const renderDialogContents = () => {
      const dataApi = window.GameData || {};
      const stats = dataApi.getCustomDeckStats?.() || {
        undercoverCount: 0,
        twistCount: 0,
        spyfallCount: 0,
        total: 0
      };
      const decks = dataApi.getCustomSpyDecks?.() || { undercover: [], twist: [], spyfall: [] };

      const statsEl = dialog.querySelector('[data-role="stats"]');
      if (statsEl) {
        statsEl.textContent = `Tổng: ${stats.total} mục (Undercover: ${stats.undercoverCount} • Hỏi Xoáy: ${stats.twistCount} • Spyfall: ${stats.spyfallCount})`;
      }

      dialog.querySelectorAll('.spy-cd-tab').forEach((tabBtn) => {
        const active = tabBtn.dataset.tab === customDeckActiveTab;
        tabBtn.classList.toggle('is-active', active);
        tabBtn.setAttribute('aria-selected', String(active));
      });

      const mainWrap = dialog.querySelector('[data-role="fields-main"]');
      const extraWrap = dialog.querySelector('[data-role="fields-extra"]');
      const importLabel = dialog.querySelector('[data-role="import-label"]');
      const importTextarea = dialog.querySelector('[data-role="import-text"]');
      const listHeading = dialog.querySelector('[data-role="list-heading"]');
      const listEl = dialog.querySelector('[data-role="item-list"]');

      if (mainWrap && extraWrap) {
        mainWrap.innerHTML = '';
        extraWrap.innerHTML = '';
        if (customDeckActiveTab === 'undercover') {
          mainWrap.innerHTML = `
            <input type="text" data-field="a" placeholder="Từ A (VD: Trà sữa)" maxlength="60" required autofocus>
            <input type="text" data-field="b" placeholder="Từ B (VD: Cà phê sữa)" maxlength="60" required>
          `;
          extraWrap.innerHTML = `
            <input type="text" data-field="cat" placeholder="Chủ đề (tùy chọn)" maxlength="40">
            <input type="text" data-field="hint" placeholder="Gợi ý mô tả (tùy chọn)" maxlength="120">
          `;
          if (importLabel) importLabel.textContent = 'Nhập nhanh (Mỗi dòng: Từ A | Từ B | Chủ đề | Gợi ý):';
          if (importTextarea) importTextarea.placeholder = 'Bún bò | Phở bò | Ẩm thực | Nước dùng và sợi bún\nTinder | Bumble | Hẹn hò';
        } else if (customDeckActiveTab === 'twist') {
          mainWrap.innerHTML = `
            <input type="text" data-field="a" placeholder="Câu hỏi Dân Thường" maxlength="160" required autofocus>
            <input type="text" data-field="b" placeholder="Câu hỏi Gián Điệp" maxlength="160" required>
          `;
          extraWrap.innerHTML = `
            <input type="text" data-field="cat" placeholder="Chủ đề (tùy chọn)" maxlength="40">
            <div></div>
          `;
          if (importLabel) importLabel.textContent = 'Nhập nhanh (Mỗi dòng: Câu Dân | Câu Gián Điệp | Chủ đề):';
          if (importTextarea) importTextarea.placeholder = 'Món ăn bạn thích nhất? | Món ăn bạn sợ nhất? | Ẩm thực';
        } else {
          mainWrap.innerHTML = `
            <input type="text" data-field="a" placeholder="Tên địa điểm (VD: Quán Net cỏ)" maxlength="60" required autofocus>
            <input type="text" data-field="b" placeholder="Các vai trò cách nhau bằng dấu phẩy" maxlength="200">
          `;
          extraWrap.innerHTML = '';
          if (importLabel) importLabel.textContent = 'Nhập nhanh (Mỗi dòng: Tên địa điểm | Vai 1, Vai 2, Vai 3, Vai 4):';
          if (importTextarea) importTextarea.placeholder = 'Quán Net cỏ | Chủ quán, Game thủ, Shipper mì tôm, Bảo vệ';
        }
      }

      const items = Array.isArray(decks[customDeckActiveTab]) ? decks[customDeckActiveTab] : [];
      if (listHeading) {
        listHeading.textContent = `Danh sách hiện có (${items.length} mục)`;
      }
      if (listEl) {
        listEl.innerHTML = '';
        if (items.length === 0) {
          const empty = document.createElement('li');
          empty.className = 'spy-cd-item';
          empty.textContent = 'Chưa có mục tự tạo nào trong tab này.';
          listEl.appendChild(empty);
        } else {
          items.forEach((item) => {
            const li = document.createElement('li');
            li.className = 'spy-cd-item';
            const meta = document.createElement('div');
            meta.className = 'spy-cd-item-meta';
            const mainTxt = document.createElement('strong');
            const subTxt = document.createElement('span');
            subTxt.className = 'spy-cd-item-sub';

            if (customDeckActiveTab === 'undercover') {
              mainTxt.textContent = `${item.wordA} ↔ ${item.wordB}`;
              subTxt.textContent = `${item.category || 'Nội bộ hội'}${item.hint ? ` • ${item.hint}` : ''}`;
            } else if (customDeckActiveTab === 'twist') {
              mainTxt.textContent = `${item.qCivilian} ⇄ ${item.qSpy}`;
              subTxt.textContent = item.category || 'Nội bộ hội';
            } else {
              mainTxt.textContent = item.name;
              subTxt.textContent = (item.roles || []).join(', ');
            }
            meta.append(mainTxt, subTxt);

            const delBtn = document.createElement('button');
            delBtn.type = 'button';
            delBtn.className = 'btn btn-danger btn-sm';
            delBtn.textContent = 'Xóa';
            delBtn.addEventListener('click', () => {
              deleteCustomDeckItem(customDeckActiveTab, item.id);
              renderDialogContents();
            });

            li.append(meta, delBtn);
            listEl.appendChild(li);
          });
        }
      }
    };

    dialog.querySelectorAll('.spy-cd-tab').forEach((tabBtn) => {
      tabBtn.addEventListener('click', () => {
        customDeckActiveTab = tabBtn.dataset.tab || 'undercover';
        renderDialogContents();
      });
    });

    const addForm = dialog.querySelector('[data-role="add-form"]');
    if (addForm) {
      addForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const dataApi = window.GameData || {};
        const aVal = addForm.querySelector('[data-field="a"]')?.value || '';
        const bVal = addForm.querySelector('[data-field="b"]')?.value || '';
        const catVal = addForm.querySelector('[data-field="cat"]')?.value || 'Nội bộ hội';
        const hintVal = addForm.querySelector('[data-field="hint"]')?.value || '';

        let res = null;
        if (customDeckActiveTab === 'undercover') {
          res = dataApi.addCustomUndercoverPair?.(aVal, bVal, catVal || 'Nội bộ hội', hintVal);
        } else if (customDeckActiveTab === 'twist') {
          res = dataApi.addCustomTwistQuestion?.(aVal, bVal, catVal || 'Nội bộ hội');
        } else {
          res = dataApi.addCustomSpyfallLocation?.(aVal, bVal);
        }

        if (!res) {
          window.AppUI?.showToast?.('Không thể thêm (dữ liệu thiếu hoặc bị trùng lặp).');
          return;
        }
        window.AppUI?.showToast?.('Đã thêm vào bộ đề của hội!');
        renderDialogContents();
      });
    }

    const importBtn = dialog.querySelector('[data-action="import"]');
    if (importBtn) {
      importBtn.addEventListener('click', () => {
        const ta = dialog.querySelector('[data-role="import-text"]');
        const raw = ta ? ta.value : '';
        if (!raw.trim()) return;
        const result = window.GameData?.importCustomSpyText?.(customDeckActiveTab, raw);
        if (result) {
          window.AppUI?.showToast?.(`Đã nhập ${result.added} mục (bỏ qua ${result.skipped} dòng).`);
          if (result.added > 0 && ta) ta.value = '';
          renderDialogContents();
        }
      });
    }

    const exportBtn = dialog.querySelector('[data-action="export"]');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const json = window.GameData?.exportCustomSpyDecks?.();
        if (json) {
          window.AppUI?.copyText?.(json, 'Đã copy JSON bộ đề tự tạo!');
        }
      });
    }

    const clearAllBtn = dialog.querySelector('[data-action="clear-all"]');
    if (clearAllBtn) {
      let armClear = false;
      clearAllBtn.addEventListener('click', () => {
        if (!armClear) {
          armClear = true;
          clearAllBtn.textContent = '⚠️ Bấm lần nữa để xóa sạch!';
          setTimeout(() => {
            armClear = false;
            clearAllBtn.textContent = '🗑️ Xóa toàn bộ';
          }, 3000);
          return;
        }
        armClear = false;
        clearAllBtn.textContent = '🗑️ Xóa toàn bộ';
        window.GameData?.clearCustomSpyDecks?.();
        window.AppUI?.showToast?.('Đã xóa toàn bộ bộ đề tự tạo.');
        renderDialogContents();
      });
    }

    dialog._refreshSpyCustomDeck = renderDialogContents;
    return dialog;
  }

  function openCustomDeckDialog() {
    const dialog = ensureCustomDeckDialog();
    if (!dialog) return;
    if (typeof dialog._refreshSpyCustomDeck === 'function') {
      dialog._refreshSpyCustomDeck();
    }
    if (!dialog.open) dialog.showModal();
  }

  function ensureSpyDomInjected() {
    if (typeof document === 'undefined') return;
    ensureSpyStyles();

    const deckSel = document.getElementById('spy-deck-select');
    if (deckSel && !deckSel.querySelector('option[value="custom"]')) {
      const opt = document.createElement('option');
      opt.value = 'custom';
      opt.textContent = '✨ Bộ tự tạo của hội';
      deckSel.appendChild(opt);
    }

    const cfgForm = document.getElementById('spy-config-form');
    const deckRow = document.getElementById('spy-deck-row');
    const mrWhiteRow = document.getElementById('spy-mrwhite-row');

    if (cfgForm && !document.getElementById('spy-manage-custom-deck')) {
      const manageBtn = document.createElement('button');
      manageBtn.id = 'spy-manage-custom-deck';
      manageBtn.type = 'button';
      manageBtn.className = 'btn btn-secondary btn-sm spy-manage-deck-btn';
      manageBtn.textContent = '✏️ Tạo / Sửa bộ đề của hội';
      manageBtn.hidden = true;
      manageBtn.addEventListener('click', () => openCustomDeckDialog());
      if (deckRow && deckRow.parentElement === cfgForm) {
        deckRow.insertAdjacentElement('afterend', manageBtn);
      } else {
        cfgForm.appendChild(manageBtn);
      }
    }

    if (cfgForm && !document.getElementById('spy-timer-row')) {
      const timerRow = document.createElement('div');
      timerRow.id = 'spy-timer-row';
      timerRow.className = 'config-row';
      timerRow.hidden = true;

      const timerLabel = document.createElement('label');
      timerLabel.htmlFor = 'spy-timer-select';
      timerLabel.textContent = 'Thời gian thảo luận Spyfall:';

      const timerSel = document.createElement('select');
      timerSel.id = 'spy-timer-select';
      timerSel.name = 'spyfallTimerSec';
      [
        { value: '0', text: 'Không giới hạn' },
        { value: '180', text: '3 phút' },
        { value: '300', text: '5 phút (khuyên dùng)' },
        { value: '480', text: '8 phút' }
      ].forEach((o) => {
        const opt = document.createElement('option');
        opt.value = o.value;
        opt.textContent = o.text;
        if (o.value === '300') opt.selected = true;
        timerSel.appendChild(opt);
      });

      timerRow.append(timerLabel, timerSel);
      if (mrWhiteRow && mrWhiteRow.parentElement === cfgForm) {
        mrWhiteRow.insertAdjacentElement('afterend', timerRow);
      } else {
        cfgForm.appendChild(timerRow);
      }
    }

    if (cfgForm && !document.getElementById('spy-autolock-row')) {
      const row = document.createElement('div');
      row.id = 'spy-autolock-row';
      row.className = 'config-checkbox-row';

      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.id = 'spy-autolock-check';
      cb.name = 'autoVoteLock';

      const lbl = document.createElement('label');
      lbl.htmlFor = 'spy-autolock-check';
      lbl.textContent = 'Tự chốt phiếu sau 8 giây khi tất cả người chơi sống đã bỏ phiếu thăm dò';

      row.append(cb, lbl);
      cfgForm.appendChild(row);
    }

    const spyGameEl = document.getElementById('spy-game');
    if (spyGameEl) {
      const ingameActions = spyGameEl.querySelector('.ingame-actions');
      const resetBtn = document.getElementById('spy-host-reset-game');
      if (ingameActions && !document.getElementById('spy-host-pause-btn')) {
        const pauseBtn = document.createElement('button');
        pauseBtn.id = 'spy-host-pause-btn';
        pauseBtn.type = 'button';
        pauseBtn.className = 'btn btn-secondary btn-sm';
        pauseBtn.textContent = '⏸️ Tạm dừng';
        pauseBtn.hidden = true;
        pauseBtn.addEventListener('click', () => togglePause());
        if (resetBtn && resetBtn.parentElement === ingameActions) {
          ingameActions.insertBefore(pauseBtn, resetBtn);
        } else {
          ingameActions.prepend(pauseBtn);
        }
      }

      const cornerBar = spyGameEl.querySelector('.ingame-corner-bar');
      if (!document.getElementById('spy-pause-banner')) {
        const pauseBanner = document.createElement('div');
        pauseBanner.id = 'spy-pause-banner';
        pauseBanner.className = 'alert-box spy-pause-banner';
        pauseBanner.hidden = true;
        pauseBanner.textContent = '⏸️ Ván chơi đang TẠM DỪNG — Đồng hồ và phiếu bầu đang tạm khóa.';
        if (cornerBar && cornerBar.parentElement === spyGameEl) {
          cornerBar.insertAdjacentElement('afterend', pauseBanner);
        } else {
          spyGameEl.prepend(pauseBanner);
        }
      }
    }

    const spyfallTools = document.getElementById('spy-spyfall-tools');
    if (spyfallTools && !document.getElementById('spy-first-questioner-badge')) {
      const badge = document.createElement('div');
      badge.id = 'spy-first-questioner-badge';
      badge.className = 'spy-first-questioner-badge';
      badge.hidden = true;
      spyfallTools.prepend(badge);
    }

    const votePanel = document.getElementById('spy-vote-panel');
    const liveVoteBox = document.getElementById('spy-live-vote');
    if (votePanel && !document.getElementById('spy-vote-lock-banner')) {
      const lockBanner = document.createElement('div');
      lockBanner.id = 'spy-vote-lock-banner';
      lockBanner.className = 'spy-vote-lock-banner';
      lockBanner.hidden = true;

      const lockText = document.createElement('span');
      lockText.setAttribute('data-role', 'lock-text');

      const cancelLockBtn = document.createElement('button');
      cancelLockBtn.id = 'spy-vote-cancel-lock';
      cancelLockBtn.type = 'button';
      cancelLockBtn.className = 'btn btn-ghost btn-sm';
      cancelLockBtn.textContent = 'Hủy tự chốt';
      cancelLockBtn.hidden = true;
      cancelLockBtn.addEventListener('click', () => cancelVoteLock({ byHost: true }));

      lockBanner.append(lockText, cancelLockBtn);
      if (liveVoteBox && liveVoteBox.parentElement === votePanel) {
        liveVoteBox.insertAdjacentElement('afterend', lockBanner);
      } else {
        votePanel.appendChild(lockBanner);
      }
    }

    ensureCustomDeckDialog();
  }

  function updateDynamicCountdowns() {
    if (typeof document === 'undefined' || !state) return;

    // 1. Spyfall Timer (#spy-spark-note)
    const sparkEl = document.getElementById('spy-spark-note');
    if (sparkEl && state.phase === 'PLAYING' && state.config?.mode === 'spyfall') {
      const hasTimer = isHost
        ? state.spyfallDeadline > 0 || (state.isPaused && state.pausedSpyfallMs > 0)
        : clientSpyfallEnd > 0 || (state.isPaused && state.spyfallRemainingMs > 0);
      if (hasTimer) {
        const remMs = state.isPaused
          ? isHost
            ? state.pausedSpyfallMs || 0
            : state.spyfallRemainingMs || 0
          : isHost
            ? Math.max(0, state.spyfallDeadline - Date.now())
            : Math.max(0, clientSpyfallEnd - Date.now());
        const clock = formatCountdownMs(remMs);
        sparkEl.textContent = state.isPaused ? `⏸️ Tạm dừng • ⏱️ ${clock}` : `⏱️ ${clock}`;

        if (isHost && !state.isPaused) {
          const secLeft = Math.ceil(remMs / 1000);
          if (secLeft <= 30 && secLeft > 0 && !spyfall30sWarned) {
            spyfall30sWarned = true;
            try {
              window.AudioEngine?.playSfx?.('vote_tick');
            } catch (_) {}
          }
          if (remMs <= 0 && !spyfallTimeUpAnnounced) {
            spyfallTimeUpAnnounced = true;
            try {
              window.AudioEngine?.playSfx?.('bell');
            } catch (_) {}
            setSpyBotSpeech('Hết giờ thảo luận Spyfall! Cả hội hãy chốt phiếu ngay để tìm ra Gián Điệp!');
          }
        }
      }
    }

    // 2. Vote Lock Banner (#spy-vote-lock-banner & #spy-vote-cancel-lock)
    const lockBanner = document.getElementById('spy-vote-lock-banner');
    const cancelLockBtn = document.getElementById('spy-vote-cancel-lock');
    if (lockBanner) {
      const showLock = Boolean(state.phase === 'PLAYING' && state.voteLock);
      lockBanner.hidden = !showLock;
      if (showLock) {
        const lockRemMs = state.isPaused
          ? isHost
            ? state.pausedVoteLockMs || 0
            : state.voteLockRemainingMs || state.voteLock?.remainingMs || 0
          : isHost
            ? Math.max(0, (state.voteLock.endsAt || 0) - Date.now())
            : Math.max(0, clientVoteLockEnd - Date.now());
        const sec = Math.max(0, Math.ceil(lockRemMs / 1000));
        const target = (state.players || []).find((p) => p.id === state.voteLock.targetId);
        const targetName = target ? target.name : '?';
        const lockText = lockBanner.querySelector('[data-role="lock-text"]');
        if (lockText) {
          lockText.textContent = state.isPaused
            ? `⏸️ Tạm dừng chốt phiếu ${targetName} (còn ${sec}s)`
            : `⏳ Tự chốt loại ${targetName} sau ${sec}s — đổi phiếu để hủy!`;
        }
        if (cancelLockBtn) {
          cancelLockBtn.hidden = !(isHost && !state.isPaused);
        }
      } else if (cancelLockBtn) {
        cancelLockBtn.hidden = true;
      }
    }
  }

  // ==================== UI BINDING & RENDER ====================
  function bindEvents() {
    if (typeof document === 'undefined') return;
    ensureSpyDomInjected();

    const copyLinkBtn = document.getElementById('spy-copy-link');
    if (copyLinkBtn) {
      copyLinkBtn.onclick = () => {
        const url = window.RoomNetwork?.buildShareUrl?.() || '';
        window.AppUI?.copyText?.(url, 'Đã copy link mời vào Hội Quán!');
      };
    }

    const openSpyQrZoom = () => {
      if (!state) return;
      const url = window.RoomNetwork?.buildShareUrl?.() || '';
      window.AppUI?.openQrZoomModal?.('🕵️ Quét QR để mở app Hội Quán', window.RoomNetwork?.ROOM_LABEL || '', url);
    };
    const spyQrEl = document.getElementById('spy-qr');
    const spyQrBtn = document.getElementById('spy-qr-zoom-btn');
    if (spyQrEl) spyQrEl.onclick = openSpyQrZoom;
    if (spyQrBtn) spyQrBtn.onclick = openSpyQrZoom;

    const spySoundBtn = document.getElementById('spy-ingame-sound');
    if (spySoundBtn) spySoundBtn.onclick = () => window.AppUI?.openSoundSettings?.();

    const leaveRoom = async () => {
      if (!state) return;
      if (isHost) {
        if (state.phase !== 'LOBBY') {
          const ok = await window.AppUI?.confirmDialog?.(
            'Thoát khỏi ván?',
            'Thoát sẽ KẾT THÚC ván Gián Điệp đang chơi của cả hội. Chắc chắn chứ?'
          );
          if (!ok) return;
        }
        discardHostSnapshot();
      } else {
        if (state.phase !== 'LOBBY') {
          const ok = await window.AppUI?.confirmDialog?.(
            'Thoát khỏi ván?',
            'Bạn sẽ rời phòng. Vào lại vẫn tiếp tục được ván đang chơi.'
          );
          if (!ok) return;
        }
        if (session) session.send('SPY_LEAVE', {});
      }
      window.AppUI?.clearSession?.();
      cleanup();
      window.AppUI?.goHome?.();
    };

    const leaveBtn = document.getElementById('spy-leave');
    const ingameLeaveBtn = document.getElementById('spy-ingame-leave');
    if (leaveBtn) leaveBtn.onclick = leaveRoom;
    if (ingameLeaveBtn) ingameLeaveBtn.onclick = leaveRoom;

    const replaySpyVoice = () => {
      try {
        window.AudioEngine?.unlock?.();
        if (state && state.botText) window.AudioEngine?.speak?.(state.botText);
      } catch (_) {}
    };
    const spyReplayBtn = document.getElementById('spy-replay-bot');
    if (spyReplayBtn) spyReplayBtn.onclick = replaySpyVoice;

    const spyCodeEl = document.getElementById('spy-room-code');
    if (spyCodeEl) {
      spyCodeEl.style.cursor = 'pointer';
      spyCodeEl.title = 'Nhấn để copy link app';
      spyCodeEl.onclick = () => {
        window.AppUI?.copyText?.(window.RoomNetwork?.buildShareUrl?.() || '', 'Đã copy link app Hội Quán!');
      };
    }

    const fsBtn = document.getElementById('spy-ingame-fullscreen');
    if (fsBtn) {
      fsBtn.onclick = () => {
        try {
          if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
          else document.exitFullscreen?.();
        } catch (_) {}
      };
    }

    const editNameBtn = document.getElementById('spy-edit-name');
    if (editNameBtn) {
      editNameBtn.onclick = async () => {
        const profile = await window.AppUI?.promptProfileDialog?.(myName, myAvatarId);
        if (profile && (profile.name !== myName || profile.avatarId !== myAvatarId)) {
          myName = profile.name;
          myAvatarId = profile.avatarId;
          try {
            localStorage.setItem(window.RoomNetwork.storageKey('hq_player_name'), myName);
          } catch (_) {}
          window.AppUI?.saveAvatarId?.(myAvatarId);
          if (isHost) {
            const me = state.players.find((p) => p.id === session?.clientId);
            if (me) {
              me.name = myName;
              me.avatarId = myAvatarId;
            }
            syncStateToClients();
            render();
          } else if (session) {
            session.send('SPY_RENAME', { name: myName, avatarId: myAvatarId });
          }
        }
      };
    }

    const readyBtn = document.getElementById('spy-ready-btn');
    if (readyBtn) {
      readyBtn.onclick = () => {
        try {
          window.AudioEngine?.unlock?.();
        } catch (_) {}
        const me = state.players.find((p) => p.id === session?.clientId);
        const nextReady = me ? !me.ready : true;
        if (isHost) {
          if (me) me.ready = nextReady;
          syncStateToClients();
          render();
        } else if (session) {
          session.send('SPY_READY', { ready: nextReady });
        }
      };
    }

    const addDemoBtn = document.getElementById('spy-add-demo');
    if (addDemoBtn) {
      addDemoBtn.onclick = () => {
        if (!isHost || state.phase !== 'LOBBY') return;
        const demoNames = ['An', 'Bình', 'Chi', 'Dũng', 'Hà', 'Khánh', 'Linh', 'Ngọc'];
        const name = `${demoNames[(demoCounter - 1) % demoNames.length]} (Test ${demoCounter})`;
        const avatarId = getRandomAvatarId(state.players.length);
        demoCounter += 1;
        state.players.push({
          id: `spydemo_${Date.now()}_${demoCounter}`,
          name,
          avatarId,
          ready: true,
          alive: true,
          isDemo: true,
          role: null
        });
        syncStateToClients();
        render();
      };
    }

    const cfgForm = document.getElementById('spy-config-form');
    if (cfgForm) {
      cfgForm.onchange = () => {
        if (!isHost || !state || state.phase !== 'LOBBY') return;
        ensureStateDefaults(state);
        const modeInput = cfgForm.querySelector('input[name="spyMode"]:checked');
        state.config.mode = modeInput ? modeInput.value : 'undercover';
        state.config.deckKey = document.getElementById('spy-deck-select')?.value || 'all';
        state.config.spyCount = Number(document.getElementById('spy-count-select')?.value) || 1;
        state.config.mrWhite = Boolean(document.getElementById('spy-mrwhite-check')?.checked);
        state.settings.autoVoteLock = Boolean(document.getElementById('spy-autolock-check')?.checked);
        const timerSelEl = document.getElementById('spy-timer-select');
        if (timerSelEl) {
          const val = Number(timerSelEl.value);
          state.settings.spyfallTimerSec = Number.isFinite(val) ? val : 300;
        }
        syncStateToClients();
        render();
      };
    }

    const startBtn = document.getElementById('spy-start-btn');
    if (startBtn) startBtn.onclick = () => startNewRoundGame();

    const toggleCardBtn = document.getElementById('spy-toggle-card');
    if (toggleCardBtn && window.AppUI?.bindHoldToPeekCard) {
      window.AppUI.bindHoldToPeekCard(toggleCardBtn, (show) => {
        if (cardRevealed === show) return;
        cardRevealed = show;
        if (show && mySecret) {
          // Cố ý KHÔNG phát âm thanh khi lật thẻ: tiếng động sẽ làm lộ người đang xem thẻ.
          try {
            window.AudioEngine?.unlock?.();
            window.SceneFX?.sparkleAtElement?.(document.getElementById('spy-toggle-card'));
          } catch (_) {}
        }
        renderSecretCard();
      });
    }

    const twistRevBtn = document.getElementById('spy-twist-reveal-btn');
    if (twistRevBtn) twistRevBtn.onclick = () => revealTwistQuestion();
    const guessLocBtn = document.getElementById('spy-open-guess-location');
    if (guessLocBtn) {
      guessLocBtn.onclick = () => {
        if (state?.isPaused) {
          window.AppUI?.showToast?.('Ván chơi đang tạm dừng!');
          return;
        }
        openGuessDialog('spyfall');
      };
    }

    const hostMrWhiteForm = document.getElementById('spy-host-mrwhite-form');
    if (hostMrWhiteForm) {
      hostMrWhiteForm.onsubmit = (e) => {
        e.preventDefault();
        if (!isHost || !state || state.phase !== 'MR_WHITE_GUESS' || state.isPaused) return;
        const input = document.getElementById('spy-host-mrwhite-input');
        const val = input ? input.value.trim() : '';
        if (!val) return;
        resolveMrWhiteGuess(val);
      };
    }

    const skipRoundBtn = document.getElementById('spy-skip-round');
    if (skipRoundBtn) {
      skipRoundBtn.onclick = () => {
        if (!isHost || state.phase !== 'PLAYING' || state.isPaused) return;
        try {
          window.AudioEngine?.playVoteGavel?.();
        } catch (_) {}
        advanceToNextRound('Hòa phiếu! Chưa loại ai, chuyển sang vòng tiếp theo.');
      };
    }

    const playAgainBtn = document.getElementById('spy-play-again');
    if (playAgainBtn) playAgainBtn.onclick = () => resetToLobby();

    const resetBtn = document.getElementById('spy-host-reset-game');
    if (resetBtn) {
      resetBtn.onclick = async () => {
        if (!isHost || !state || state.phase === 'LOBBY') return;
        const ok = await window.AppUI?.confirmDialog?.(
          'Reset ván?',
          'Ván Gián Điệp hiện tại sẽ bị huỷ và cả hội quay về sảnh chờ (giữ nguyên danh sách người chơi).'
        );
        if (ok) resetToLobby();
      };
    }
  }

  function resetToLobby() {
    if (!isHost || !state) return;
    cancelVoteLock({ silent: true });
    stopSpyTickLoop();
    voteLockSuppressed = false;
    spyfall30sWarned = false;
    spyfallTimeUpAnnounced = false;
    state.isPaused = false;
    state.pausedRemainingMs = 0;
    state.pausedSpyfallMs = 0;
    state.pausedVoteLockMs = 0;
    state.spyfallDeadline = 0;
    state.firstQuestionerId = null;
    state.phase = 'LOBBY';
    state.votes = {};
    voteAllAnnounced = false;
    state.winner = null;
    state.pendingMrWhiteId = null;
    state.twistQuestionRevealed = false;
    lastSceneKey = '';
    state.players.forEach((p) => {
      p.alive = true;
      p.role = null;
      if (!p.isDemo) p.ready = false;
    });
    syncStateToClients();
    render();
  }

  function openGuessDialog(kind) {
    if (typeof document === 'undefined') return;
    const dialog = document.getElementById('dialog-guess');
    if (!dialog) return;
    const titleEl = document.getElementById('dialog-guess-title');
    const descEl = document.getElementById('dialog-guess-desc');
    const textWrap = document.getElementById('dialog-guess-text-wrap');
    const selectWrap = document.getElementById('dialog-guess-select-wrap');
    const textInput = document.getElementById('dialog-guess-input');
    const selectInput = document.getElementById('dialog-guess-select');
    const cancelBtn = document.getElementById('dialog-guess-cancel');

    if (kind === 'mr_white') {
      titleEl.textContent = '🃏 Cơ hội lật kèo cho Mr. White!';
      descEl.textContent = 'Bạn vừa bị loại. Hãy nhập từ khóa của Dân Thường để cướp chiến thắng!';
      textWrap.hidden = false;
      selectWrap.hidden = true;
      textInput.value = '';
      textInput.required = true;
      cancelBtn.hidden = true;
    } else {
      titleEl.textContent = '🎯 Gián Điệp đoán Địa Điểm';
      descEl.textContent = 'Nếu đoán đúng bạn sẽ thắng ngay lập tức. Nếu sai, Phe Dân Thường thắng!';
      textWrap.hidden = true;
      selectWrap.hidden = false;
      textInput.required = false;
      cancelBtn.hidden = false;
      selectInput.innerHTML = '';
      getSpyfallLocations().forEach((loc) => {
        const opt = document.createElement('option');
        opt.value = loc.name;
        opt.textContent = loc.name;
        selectInput.appendChild(opt);
      });
    }

    const form = document.getElementById('form-dialog-guess');
    cancelBtn.onclick = () => {
      dialog.returnValue = 'cancel';
      dialog.close();
    };

    form.onsubmit = (e) => {
      e.preventDefault();
      if (state?.isPaused) return;
      if (kind === 'mr_white') {
        const val = textInput.value.trim();
        if (!val) return;
        dialog.close('confirm');
        if (isHost) resolveMrWhiteGuess(val);
        else session?.send('SPY_MRWHITE_GUESS', { guessText: val });
      } else {
        const loc = selectInput.value;
        dialog.close('confirm');
        if (isHost) {
          const me = state.players.find((p) => p.id === session?.clientId);
          resolveSpyfallLocationGuess(me, loc);
        } else {
          session?.send('SPY_LOCATION_GUESS', { location: loc });
        }
      }
    };

    if (!dialog.open) dialog.showModal();
  }

  function renderShareBox() {
    if (typeof document === 'undefined') return;
    const codeEl = document.getElementById('spy-room-code');
    const urlEl = document.getElementById('spy-share-url');
    const qrEl = document.getElementById('spy-qr');
    if (codeEl) codeEl.textContent = window.RoomNetwork?.ROOM_LABEL || '';
    const shareUrl = window.RoomNetwork?.buildShareUrl?.() || '';
    if (urlEl) urlEl.textContent = shareUrl;
    if (qrEl) window.AppUI?.renderQrCode?.(qrEl, shareUrl);
  }

  function buildSpyPlayerLabelEl(player, sizeClass = 'avatar-md', suffix = '') {
    const wrap = document.createElement('span');
    wrap.className = 'player-name-with-avatar';
    if (window.AppUI?.createAvatarEl) {
      wrap.appendChild(window.AppUI.createAvatarEl(player?.avatarId, sizeClass));
    }
    const txt = document.createElement('strong');
    txt.textContent = `${player?.name || '?'}${suffix}`;
    wrap.appendChild(txt);
    return wrap;
  }

  function runSpyScene() {
    if (!state) return;
    const key = `${state.phase}:${state.round}:${state.winner || ''}`;
    if (key === lastSceneKey) return;
    lastSceneKey = key;

    try {
      if (state.phase === 'PLAYING') {
        window.AudioEngine?.stopNightAmbience?.();
        if (state.round === 1) {
          window.SceneFX?.playPhase?.({
            mode: 'role',
            icon: '🕵️',
            kicker: 'CHIA BÀI BÍ MẬT',
            title: 'VÁN CHƠI BẮT ĐẦU',
            sub: 'Nhấn & giữ thẻ để xem từ khóa. Cả hội bắt đầu tranh luận!',
            duration: 2100
          });
        } else {
          window.SceneFX?.playPhase?.({
            mode: 'day',
            icon: '🔄',
            kicker: `VÒNG THẨM VẤN ${state.round}`,
            title: `VÒNG ${state.round}`,
            sub: 'Thứ tự phát biểu đã được xáo lại — tiếp tục truy tìm Gián Điệp!',
            duration: 1450
          });
        }
      } else if (state.phase === 'GAME_OVER') {
        window.SceneFX?.celebrate?.({ count: 110 });
        window.SceneFX?.flash?.('rgba(251, 191, 36, 0.22)');
      } else if (state.phase === 'MR_WHITE_GUESS') {
        window.SceneFX?.flash?.('rgba(168, 85, 247, 0.24)');
        window.SceneFX?.shake?.();
      }
    } catch (_) {}
  }

  function renderPlayerVote() {
    const box = document.getElementById('spy-player-vote-box');
    const grid = document.getElementById('spy-my-vote-grid');
    const label = document.getElementById('spy-my-vote-label');
    const desc = document.getElementById('spy-player-vote-desc');
    if (!box || !grid || !state || !session) return;

    const show = !isHost && state.phase === 'PLAYING';
    box.hidden = !show;
    if (!show) return;

    const me = state.players.find((p) => p.id === session.clientId);
    const myVote = state.votes ? state.votes[session.clientId] : null;
    const votedTarget = myVote ? state.players.find((p) => p.id === myVote) : null;
    if (label) label.textContent = votedTarget ? `Đã vote: ${votedTarget.name}` : 'Chưa vote';

    grid.innerHTML = '';
    if (!me || !me.alive) {
      if (desc) desc.textContent = '💀 Bạn đã bị loại — hãy theo dõi phần còn lại của ván đấu.';
      return;
    }
    if (desc) {
      desc.textContent = state.isPaused
        ? '⏸️ Ván chơi đang tạm dừng — tạm khóa gửi phiếu thăm dò.'
        : 'Chọn người bạn nghi là Gián Điệp. Quản Trò sẽ thấy phiếu này ngay trên màn hình chính — bạn có thể đổi phiếu bất cứ lúc nào.';
    }

    state.players
      .filter((p) => p.alive && p.id !== session.clientId)
      .forEach((p) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.disabled = Boolean(state.isPaused);
        btn.className = `target-btn target-btn-avatar ${myVote === p.id ? 'selected' : ''}`;
        if (window.AppUI?.createAvatarEl) {
          btn.appendChild(window.AppUI.createAvatarEl(p.avatarId, 'avatar-md'));
        }
        const span = document.createElement('span');
        span.textContent = myVote === p.id ? `✓ ${p.name}` : p.name;
        btn.appendChild(span);
        btn.addEventListener('click', () => {
          if (state.isPaused) return;
          session.send('SPY_VOTE', { targetId: p.id });
        });
        grid.appendChild(btn);
      });
  }

  function renderLiveVote() {
    const box = document.getElementById('spy-live-vote');
    const list = document.getElementById('spy-live-vote-list');
    const progress = document.getElementById('spy-live-vote-progress');
    if (!box || !list || !state) return;

    const groups = getVoteCounts();
    const entries = Object.entries(groups).sort((a, b) => b[1].length - a[1].length);
    const total = entries.reduce((sum, [, voters]) => sum + voters.length, 0);
    const show = state.phase === 'PLAYING' && entries.length > 0;
    box.hidden = !show;
    if (!show) return;

    const max = Math.max(1, entries[0][1].length);
    if (progress) progress.textContent = `${total} phiếu từ điện thoại`;
    list.innerHTML = '';

    entries.forEach(([targetId, voters]) => {
      const target = state.players.find((p) => p.id === targetId);
      const li = document.createElement('li');
      li.className = 'vote-tally-item pop-in';

      const left = document.createElement('div');
      if (target) left.appendChild(buildSpyPlayerLabelEl(target, 'avatar-sm'));

      const bar = document.createElement('div');
      bar.className = 'vote-bar is-leading';
      const fill = document.createElement('span');
      fill.style.width = `${Math.max(8, Math.round((voters.length / max) * 100))}%`;
      bar.appendChild(fill);
      left.appendChild(bar);

      const count = document.createElement('span');
      count.className = 'pill pill-alive';
      count.textContent = `${voters.length} phiếu`;

      li.append(left, count);
      list.appendChild(li);
    });
  }

  function render() {
    if (typeof document === 'undefined' || !state || !session) return;
    ensureSpyDomInjected();
    runSpyScene();
    window.AppUI?.setActiveGameMode?.(state.phase !== 'LOBBY', 'DAY');

    const roomCodeEl = document.getElementById('spy-room-code');
    if (roomCodeEl) roomCodeEl.textContent = window.RoomNetwork?.ROOM_LABEL || '';
    const myNameEl = document.getElementById('spy-my-name');
    if (myNameEl) myNameEl.textContent = myName;
    const myAvSlot = document.getElementById('spy-my-avatar');
    if (myAvSlot) {
      myAvSlot.innerHTML = '';
      if (window.AppUI?.createAvatarEl) {
        myAvSlot.appendChild(window.AppUI.createAvatarEl(myAvatarId, 'avatar-md'));
      }
    }

    const lobbyEl = document.getElementById('spy-lobby');
    const gameEl = document.getElementById('spy-game');

    const resetLobbyBtn = document.getElementById('spy-host-reset-game');
    if (resetLobbyBtn && state.phase === 'LOBBY') resetLobbyBtn.hidden = true;
    const pauseLobbyBtn = document.getElementById('spy-host-pause-btn');
    if (pauseLobbyBtn && state.phase === 'LOBBY') pauseLobbyBtn.hidden = true;

    if (state.phase === 'LOBBY') {
      if (lobbyEl) lobbyEl.hidden = false;
      if (gameEl) gameEl.hidden = true;
      renderLobby();
    } else {
      if (lobbyEl) lobbyEl.hidden = true;
      if (gameEl) gameEl.hidden = false;
      renderActiveGame();
    }
  }

  function renderLobby() {
    ensureStateDefaults(state);
    const count = state.players.length;
    const readyCount = state.players.filter((p) => p.ready).length;
    document.getElementById('spy-player-count').textContent = String(count);
    document.getElementById('spy-ready-summary').textContent = `${readyCount}/${count} sẵn sàng`;
    document.getElementById('spy-host-demo-wrap').hidden = !isHost;
    const playerLobbyControls = document.getElementById('spy-player-lobby-controls');
    const hostLobbyGuide = document.getElementById('spy-host-lobby-guide');
    if (playerLobbyControls) playerLobbyControls.hidden = isHost;
    if (hostLobbyGuide) hostLobbyGuide.hidden = !isHost;

    if (!isHost) {
      const me = state.players.find((p) => p.id === session.clientId);
      const readyBtn = document.getElementById('spy-ready-btn');
      if (me && me.ready) {
        readyBtn.textContent = '⏳ Đã Sẵn Sàng (Ấn để hủy)';
        readyBtn.className = 'btn btn-secondary btn-lg btn-block';
      } else {
        readyBtn.textContent = '✅ Ấn Sẵn Sàng';
        readyBtn.className = 'btn btn-success btn-lg btn-block';
      }
    }

    const listEl = document.getElementById('spy-player-list');
    listEl.innerHTML = '';
    if (count === 0) {
      const empty = document.createElement('li');
      empty.className = 'player-item';
      empty.textContent = 'Chưa có người chơi nào. Hãy quét mã QR bằng điện thoại để vào phòng!';
      listEl.appendChild(empty);
    } else {
      state.players.forEach((p) => {
        const li = document.createElement('li');
        li.className = 'player-item pop-in';
        const suffix = p.id === session.clientId ? ' (Bạn)' : '';
        const left = buildSpyPlayerLabelEl(p, 'avatar-md', suffix);
        const pill = document.createElement('span');
        pill.className = `pill ${p.ready ? 'pill-ready' : 'pill-wait'}`;
        pill.textContent = p.ready ? 'Sẵn sàng' : 'Đang chờ';
        if (p.online === false && !p.isDemo) {
          li.classList.add('is-offline');
          const off = document.createElement('span');
          off.className = 'pill pill-dead pill-offline';
          off.textContent = '🔴 Mất kết nối';
          li.append(left, off, pill);
        } else {
          li.append(left, pill);
        }
        listEl.appendChild(li);
      });
    }

    const cfgForm = document.getElementById('spy-config-form');
    cfgForm.querySelectorAll('input[name="spyMode"]').forEach((r) => {
      r.checked = r.value === state.config.mode;
      r.disabled = !isHost;
    });

    const deckRow = document.getElementById('spy-deck-row');
    deckRow.hidden = state.config.mode !== 'undercover';
    const deckSel = document.getElementById('spy-deck-select');
    deckSel.value = state.config.deckKey || 'all';
    deckSel.disabled = !isHost;

    const manageDeckBtn = document.getElementById('spy-manage-custom-deck');
    if (manageDeckBtn) {
      manageDeckBtn.hidden = !isHost;
    }

    const countSel = document.getElementById('spy-count-select');
    countSel.value = String(state.config.spyCount);
    countSel.disabled = !isHost;

    const mrWhiteRow = document.getElementById('spy-mrwhite-row');
    mrWhiteRow.hidden = state.config.mode !== 'undercover';
    const mrWhiteCheck = document.getElementById('spy-mrwhite-check');
    mrWhiteCheck.checked = Boolean(state.config.mrWhite);
    mrWhiteCheck.disabled = !isHost;

    const timerRow = document.getElementById('spy-timer-row');
    const timerSel = document.getElementById('spy-timer-select');
    if (timerRow) timerRow.hidden = !(isHost && state.config.mode === 'spyfall');
    if (timerSel) {
      timerSel.value = String(state.settings?.spyfallTimerSec ?? 300);
      timerSel.disabled = !isHost;
    }

    const autoLockCheck = document.getElementById('spy-autolock-check');
    if (autoLockCheck) {
      autoLockCheck.checked = Boolean(state.settings?.autoVoteLock);
      autoLockCheck.disabled = !isHost;
    }

    const startBtn = document.getElementById('spy-start-btn');
    startBtn.hidden = !isHost;
    startBtn.disabled = !(isHost && count >= 3 && readyCount === count);

    const hintEl = document.getElementById('spy-lobby-hint');
    if (count < 3) {
      hintEl.textContent = `Cần tối thiểu 3 người chơi (khuyên dùng 5–10 người). Hiện có ${count} người.`;
    } else if (readyCount < count) {
      hintEl.textContent = `Đang chờ ${count - readyCount} người ấn Sẵn sàng...`;
    } else {
      hintEl.textContent = isHost
        ? '🎉 Mọi người đã sẵn sàng! Ấn "Chia bài & Bắt đầu chơi"!'
        : '🎉 Tất cả đã sẵn sàng! Đang chờ chủ phòng bấm Bắt đầu...';
    }
  }

  function renderSecretCard() {
    const btn = document.getElementById('spy-toggle-card');
    const bgLayer = document.getElementById('spy-card-bg');
    btn.setAttribute('aria-expanded', String(cardRevealed));
    btn.classList.toggle('is-flipped', cardRevealed);

    const cardAv = document.getElementById('spy-card-avatar');
    if (cardAv) {
      cardAv.innerHTML = '';
      if (window.AppUI?.createAvatarEl) {
        cardAv.appendChild(window.AppUI.createAvatarEl(myAvatarId, 'avatar-xl'));
      }
    }
    const cardOwner = document.getElementById('spy-card-owner');
    if (cardOwner) {
      cardOwner.textContent = `${myName || 'Bạn'} — 👆 Nhấn & GIỮ để xem Thẻ Mật`;
    }

    if (!mySecret) return;
    const theme = SPY_CARD_THEMES[mySecret.role] || SPY_CARD_THEMES.civilian;
    if (bgLayer && theme.bgImage) {
      bgLayer.style.backgroundImage = `url('${theme.bgImage}')`;
    }
    if (theme.themeColor) {
      btn.style.setProperty('--role-theme', theme.themeColor);
    }

    const iconEl = document.getElementById('spy-card-icon');
    const titleEl = document.getElementById('spy-card-title');
    const detailEl = document.getElementById('spy-card-detail');
    const hintEl = document.getElementById('spy-card-hint');
    hintEl.hidden = true;

    if (state.config.mode === 'undercover') {
      if (mySecret.role === 'mr_white') {
        iconEl.textContent = '🃏';
        titleEl.textContent = 'BẠN LÀ MR. WHITE';
        detailEl.textContent = 'Thẻ trắng! Lắng nghe mọi người mô tả để đoán ra từ khóa Dân Thường.';
      } else {
        iconEl.textContent = '📝';
        titleEl.textContent = mySecret.word || '---';
        detailEl.textContent = 'Hãy mô tả từ khóa này thật khéo mà không làm lộ quá sớm!';
        if (mySecret.hint) {
          hintEl.hidden = false;
          hintEl.textContent = mySecret.hint;
        }
      }
    } else if (state.config.mode === 'twist') {
      iconEl.textContent = '❓';
      titleEl.textContent = 'CÂU HỎI BÍ MẬT CỦA BẠN';
      detailEl.textContent = mySecret.question || '---';
      hintEl.hidden = false;
      hintEl.textContent = 'Chỉ nói câu trả lời của bạn — KHÔNG đọc câu hỏi lên!';
    } else {
      if (mySecret.role === 'spy') {
        iconEl.textContent = '🕵️';
        titleEl.textContent = 'BẠN LÀ GIÁN ĐIỆP!';
        detailEl.textContent = 'Bạn không biết địa điểm. Hãy đặt câu hỏi và lắng nghe để đoán trúng địa điểm!';
      } else {
        iconEl.textContent = '📍';
        titleEl.textContent = mySecret.location || '---';
        detailEl.textContent = `Vai trò gợi ý của bạn: ${mySecret.locRole || 'Khách'}`;
      }
    }
  }

  function getVoteCounts() {
    const groups = {};
    Object.entries(state.votes || {}).forEach(([vId, targetId]) => {
      const voter = state.players.find((p) => p.id === vId);
      if (!voter || !voter.alive) return;
      if (!groups[targetId]) groups[targetId] = [];
      groups[targetId].push({ id: voter.id, name: voter.name, avatarId: voter.avatarId });
    });
    return groups;
  }

  function renderActiveGame() {
    ensureStateDefaults(state);
    const modeNames = {
      undercover: 'AI LÀ GIÁN ĐIỆP',
      twist: 'ĐIỆP VIÊN HỎI XOÁY',
      spyfall: 'SPYFALL — ĐOÁN ĐỊA ĐIỂM'
    };
    document.getElementById('spy-mode-badge').textContent = modeNames[state.config.mode] || 'GIÁN ĐIỆP';
    document.getElementById('spy-round-badge').textContent = `Vòng ${state.round}`;

    const deckBadge = document.getElementById('spy-deck-badge');
    if (state.config.mode === 'undercover') {
      deckBadge.hidden = false;
      deckBadge.textContent =
        state.config.deckKey === 'all'
          ? 'Trộn tất cả'
          : state.config.deckKey === 'custom'
            ? '✨ Bộ tự tạo của hội'
            : UNDERCOVER_DECKS[state.config.deckKey]?.label || 'Từ khóa';
    } else {
      deckBadge.hidden = true;
    }

    const pauseBtn = document.getElementById('spy-host-pause-btn');
    if (pauseBtn) {
      pauseBtn.hidden = !(isHost && (state.phase === 'PLAYING' || state.phase === 'MR_WHITE_GUESS'));
      pauseBtn.textContent = state.isPaused ? '▶️ Tiếp tục' : '⏸️ Tạm dừng';
    }

    const pauseBanner = document.getElementById('spy-pause-banner');
    if (pauseBanner) {
      pauseBanner.hidden = !(state.isPaused && (state.phase === 'PLAYING' || state.phase === 'MR_WHITE_GUESS'));
    }

    document.getElementById('spy-spark-note').textContent =
      state.roundSpark || 'Thảo luận tự do • Bầu chọn ngoài đời rồi ấn trên Laptop';

    const botBox = document.getElementById('spy-bot-announcer');
    const botTxt = document.getElementById('spy-bot-text');
    if (botBox) botBox.hidden = !isHost;
    if (botTxt && isHost) botTxt.textContent = state.botText || 'Bot đang dẫn dắt ván chơi...';

    const cliLine = document.getElementById('spy-cli-bot-line');
    const cliText = document.getElementById('spy-cli-bot-text');
    if (cliLine) cliLine.hidden = isHost;
    if (cliText) cliText.textContent = state.botText || 'Bot đang dẫn dắt ván chơi...';

    const remainingVotes = Math.max(0, (state.maxVotes || 1) - (state.votesUsed || 0));
    const remVotesEl = document.getElementById('spy-remaining-votes');
    const remBadEl = document.getElementById('spy-remaining-bad');
    if (remVotesEl) remVotesEl.textContent = `${remainingVotes} / ${state.maxVotes || 1} lượt`;
    if (remBadEl) {
      const badLeft =
        typeof state.aliveBadCount === 'number'
          ? state.aliveBadCount
          : state.players.filter((p) => p.alive && (p.role === 'spy' || p.role === 'mr_white')).length;
      remBadEl.textContent = `${badLeft} người`;
    }

    const cardPanel = document.getElementById('spy-player-card-panel');
    if (cardPanel) cardPanel.hidden = isHost;
    if (!isHost) {
      renderSecretCard();
    }

    const isSpyfall = state.config.mode === 'spyfall';
    const isTwist = state.config.mode === 'twist';

    document.getElementById('spy-spyfall-tools').hidden = !isSpyfall;
    document.getElementById('spy-twist-tools').hidden = !isTwist;
    document.getElementById('spy-order-box').hidden = isSpyfall;

    if (isTwist) {
      const revBanner = document.getElementById('spy-twist-revealed-banner');
      const revBtn = document.getElementById('spy-twist-reveal-btn');
      revBanner.hidden = !state.twistQuestionRevealed;
      if (state.twistQuestionRevealed) {
        document.getElementById('spy-twist-real-question').textContent = state.revealedQuestionText || '';
      }
      revBtn.hidden = !(isHost && state.phase === 'PLAYING' && !state.twistQuestionRevealed);
    }

    if (isSpyfall) {
      const firstQBadge = document.getElementById('spy-first-questioner-badge');
      if (firstQBadge) {
        const firstQ = state.players.find((p) => p.id === state.firstQuestionerId);
        if (firstQ) {
          firstQBadge.hidden = false;
          firstQBadge.textContent = `🎤 Người đặt câu hỏi đầu tiên: ${firstQ.name}`;
        } else {
          firstQBadge.hidden = true;
        }
      }

      const meAlive = state.players.find((p) => p.id === session.clientId)?.alive;
      document.getElementById('spy-guess-location-wrap').hidden =
        !(state.phase === 'PLAYING' && meAlive && mySecret?.role === 'spy');
      const guessOpenBtn = document.getElementById('spy-open-guess-location');
      if (guessOpenBtn) guessOpenBtn.disabled = Boolean(state.isPaused);

      const grid = document.getElementById('spy-locations-grid');
      grid.innerHTML = '';
      getSpyfallLocations().forEach((loc) => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = `loc-chip ${crossedLocations.has(loc.name) ? 'crossed' : ''}`;
        chip.textContent = loc.name;
        chip.addEventListener('click', () => {
          if (crossedLocations.has(loc.name)) crossedLocations.delete(loc.name);
          else crossedLocations.add(loc.name);
          renderActiveGame();
        });
        grid.appendChild(chip);
      });

      const qList = document.getElementById('spy-spyfall-questions-list');
      if (qList.childElementCount === 0) {
        SPYFALL_QUESTIONS.forEach((q) => {
          const li = document.createElement('li');
          li.textContent = q;
          qList.appendChild(li);
        });
      }
    } else {
      const orderList = document.getElementById('spy-order-list');
      orderList.innerHTML = '';
      (state.turnOrder || []).forEach((id) => {
        const p = state.players.find((x) => x.id === id);
        if (p) {
          const li = document.createElement('li');
          li.appendChild(buildSpyPlayerLabelEl(p, 'avatar-md'));
          orderList.appendChild(li);
        }
      });
    }

    // Laptop Host Verdict Selection (IRL Vote) / Phone Live Status
    const voteHeading = document.getElementById('spy-vote-heading');
    const voteInst = document.getElementById('spy-vote-instruction');
    if (voteHeading) {
      voteHeading.textContent = isHost
        ? '⚖️ Phán quyết ngoài đời — Chọn người bị Vote'
        : '📋 Danh sách người chơi trong ván';
    }
    if (voteInst) {
      voteInst.textContent = isHost
        ? 'Cả hội tranh luận và biểu quyết ngoài đời xong, đại diện bấm chọn người bị nghi là Gián Điệp bên dưới:'
        : 'Tranh luận ngoài đời tự do! Khi thống nhất xong, chọn người bị vote trên màn hình Laptop Quản Trò.';
    }

    const voteList = document.getElementById('spy-vote-list');
    voteList.innerHTML = '';

    state.players.forEach((p) => {
      const li = document.createElement('li');
      const offline = p.online === false && !p.isDemo;
      li.className = `vote-row pop-in ${p.alive ? '' : 'eliminated'} ${offline ? 'is-offline' : ''}`;

      const info = document.createElement('div');
      info.appendChild(buildSpyPlayerLabelEl(p, 'avatar-md', p.id === session.clientId ? ' (Bạn)' : ''));
      if (offline) {
        const off = document.createElement('span');
        off.className = 'pill pill-dead pill-offline';
        off.textContent = '🔴 Mất kết nối';
        info.appendChild(off);
      }

      const actions = document.createElement('div');
      actions.style.display = 'flex';
      actions.style.gap = '0.5rem';
      actions.style.alignItems = 'center';

      if (!p.alive) {
        const revPill = document.createElement('span');
        revPill.className = 'pill pill-dead';
        const r = p.revealedRole || p.role;
        revPill.textContent =
          r === 'spy' ? '🕵️ Gián Điệp' : r === 'mr_white' ? '🃏 Mr. White' : '🧑‍🌾 Dân Thường';
        actions.appendChild(revPill);
      } else if (isHost && state.phase === 'PLAYING') {
        const elimBtn = document.createElement('button');
        elimBtn.type = 'button';
        elimBtn.className = 'btn btn-danger btn-sm';
        elimBtn.disabled = Boolean(state.isPaused);
        elimBtn.textContent = '⚖️ Chọn loại (Đã vote)';
        elimBtn.addEventListener('click', async () => {
          if (state.isPaused) return;
          const ok = await window.AppUI?.confirmDialog?.(
            'Chốt kết quả vote ngoài đời?',
            `Xác nhận cả hội đã vote loại ${p.name}?`
          );
          if (ok) eliminatePlayer(p.id);
        });
        actions.appendChild(elimBtn);
      } else {
        const alivePill = document.createElement('span');
        alivePill.className = 'pill pill-alive';
        alivePill.textContent = 'Còn sống';
        actions.appendChild(alivePill);
      }

      li.append(info, actions);
      voteList.appendChild(li);
    });

    renderPlayerVote();
    renderLiveVote();
    updateDynamicCountdowns();

    const aliveCount = state.players.filter((p) => p.alive).length;
    document.getElementById('spy-vote-progress').textContent =
      state.phase === 'PLAYING' ? `Vòng ${state.round} • ${aliveCount} người còn lại` : 'Đã kết thúc';

    document.getElementById('spy-host-controls').hidden = !(isHost && state.phase === 'PLAYING');
    const skipRoundBtn = document.getElementById('spy-skip-round');
    if (skipRoundBtn) skipRoundBtn.disabled = Boolean(state.isPaused);
    const resetGameBtn = document.getElementById('spy-host-reset-game');
    if (resetGameBtn) resetGameBtn.hidden = !isHost;
    document.getElementById('spy-mrwhite-banner').hidden = state.phase !== 'MR_WHITE_GUESS';
    const hostMrWhiteForm = document.getElementById('spy-host-mrwhite-form');
    if (hostMrWhiteForm) hostMrWhiteForm.hidden = !(isHost && state.phase === 'MR_WHITE_GUESS');

    const overBox = document.getElementById('spy-gameover-box');
    overBox.hidden = state.phase !== 'GAME_OVER';
    if (state.phase === 'GAME_OVER') {
      const wMap = {
        civilian: '🏆 PHE DÂN THƯỜNG CHIẾN THẮNG!',
        spy: '🕵️ PHE GIÁN ĐIỆP CHIẾN THẮNG!',
        mr_white: '🃏 MR. WHITE LẬT KÈO CHIẾN THẮNG!'
      };
      document.getElementById('spy-winner-banner').textContent = wMap[state.winner] || 'KẾT THÚC!';
      const ans = state.answerSummary || {};
      const ansEl = document.getElementById('spy-answer-reveal');
      if (state.config.mode === 'undercover') {
        ansEl.innerHTML = `<p>${escapeHtml(state.winReason)}</p><p><strong>Từ Dân Thường:</strong> ${escapeHtml(
          ans.civilianWord
        )} • <strong>Từ Gián Điệp:</strong> ${escapeHtml(ans.spyWord)}</p>`;
      } else if (state.config.mode === 'twist') {
        ansEl.innerHTML = `<p>${escapeHtml(state.winReason)}</p><p><strong>Câu hỏi Dân Thường:</strong> ${escapeHtml(
          ans.civilianWord
        )}</p><p><strong>Câu hỏi Gián Điệp:</strong> ${escapeHtml(ans.spyWord)}</p>`;
      } else {
        ansEl.innerHTML = `<p>${escapeHtml(state.winReason)}</p><p><strong>Địa điểm bí mật:</strong> ${escapeHtml(
          ans.location
        )}</p>`;
      }

      const revList = document.getElementById('spy-reveal-list');
      revList.innerHTML = '';
      state.players.forEach((p) => {
        const li = document.createElement('li');
        li.className = 'reveal-item pop-in';
        const left = buildSpyPlayerLabelEl(p, 'avatar-md');
        const right = document.createElement('span');
        right.className = 'reveal-role';
        const theme = SPY_CARD_THEMES[p.role] || SPY_CARD_THEMES.civilian;
        const art = document.createElement('span');
        art.className = 'reveal-role-art';
        art.setAttribute('aria-hidden', 'true');
        if (theme.bgImage) art.style.backgroundImage = `url('${theme.bgImage}')`;
        const roleLabel =
          p.role === 'spy' ? '🕵️ Gián Điệp' : p.role === 'mr_white' ? '🃏 Mr. White' : '🧑‍🌾 Dân Thường';
        right.append(
          art,
          document.createTextNode(`${roleLabel}${p.word ? ` (${p.word})` : p.locRole ? ` (${p.locRole})` : ''}`)
        );
        li.append(left, right);
        revList.appendChild(li);
      });

      document.getElementById('spy-play-again').hidden = !isHost;
    }
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  function updateNetBadge(id, text, online) {
    if (typeof document === 'undefined') return;
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = text;
    el.className = `net-badge ${online ? '' : 'offline'}`;
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
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
    getState: () => state
  };
})();
