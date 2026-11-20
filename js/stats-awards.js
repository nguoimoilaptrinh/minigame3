// js/stats-awards.js — Bảng Phong Thần, Danh Hiệu Vui & Xuất Ảnh Kỷ Niệm Buổi Chơi v4.0
(() => {
  'use strict';

  const root = typeof window !== 'undefined' ? window : globalThis;
  const STORAGE_KEY = 'hq_session_stats_v4';
  const MAX_RECORDED_KEYS = 250;
  const CANVAS_WIDTH = 1080;
  const CANVAS_HEIGHT = 1350;

  let memoryStore = null;
  let resetConfirmTimer = null;
  let activeDialogRenderToken = 0;

  const FALLBACK_ROLE_TEAMS = {
    werewolf: 'werewolf',
    alpha_wolf: 'werewolf',
    jester: 'neutral',
    serial_killer: 'neutral',
    guard: 'villager',
    seer: 'villager',
    witch: 'villager',
    hunter: 'villager',
    cupid: 'villager',
    elder: 'villager',
    villager: 'villager',
    spellcaster: 'villager',
    detective: 'villager',
    cursed_villager: 'villager',
    avenger: 'villager'
  };

  function createEmptySession() {
    return {
      version: 4,
      updatedAt: Date.now(),
      werewolfGamesCount: 0,
      spyGamesCount: 0,
      recordedKeys: [],
      players: {}
    };
  }

  function createEmptyPlayer(key, name, avatarId) {
    return {
      key,
      name: name || 'Người chơi',
      avatarId: avatarId || 'boy_smile',
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      wolfGames: 0,
      wolfWins: 0,
      villagerGames: 0,
      villagerWins: 0,
      neutralWins: 0,
      night1Deaths: 0,
      lynchedCount: 0,
      survivedWins: 0,
      spyGames: 0,
      spyRoleGames: 0,
      spyRoleWins: 0,
      mrWhiteWins: 0,
      correctSpyVotes: 0,
      points: 0,
      lastUpdated: Date.now()
    };
  }

  function safeStorageGet(key) {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        return localStorage.getItem(key);
      }
    } catch (_) {}
    return memoryStore;
  }

  function safeStorageSet(key, value) {
    memoryStore = value;
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        localStorage.setItem(key, value);
      }
    } catch (_) {}
  }

  function safeStorageRemove(key) {
    memoryStore = null;
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        localStorage.removeItem(key);
      }
    } catch (_) {}
  }

  function normalizePlayerName(name) {
    return String(name || '')
      .trim()
      .replace(/\s+/g, ' ');
  }

  function normalizePlayerKey(name, fallbackId) {
    const cleaned = normalizePlayerName(name).toLowerCase();
    if (cleaned) return cleaned;
    return String(fallbackId || 'unknown').trim().toLowerCase();
  }

  function sanitizePlayerRecord(raw, fallbackKey) {
    const base = createEmptyPlayer(
      (raw && raw.key) || fallbackKey || 'unknown',
      (raw && raw.name) || 'Người chơi',
      (raw && raw.avatarId) || 'boy_smile'
    );
    if (!raw || typeof raw !== 'object') return base;
    const numFields = [
      'gamesPlayed',
      'wins',
      'losses',
      'wolfGames',
      'wolfWins',
      'villagerGames',
      'villagerWins',
      'neutralWins',
      'night1Deaths',
      'lynchedCount',
      'survivedWins',
      'spyGames',
      'spyRoleGames',
      'spyRoleWins',
      'mrWhiteWins',
      'correctSpyVotes',
      'points',
      'lastUpdated'
    ];
    for (const field of numFields) {
      const n = Number(raw[field]);
      base[field] = Number.isFinite(n) && n >= 0 ? n : base[field];
    }
    if (raw.name) base.name = normalizePlayerName(raw.name) || base.name;
    if (raw.avatarId) base.avatarId = String(raw.avatarId);
    return base;
  }

  function loadSessionRaw() {
    const text = safeStorageGet(STORAGE_KEY);
    if (!text) return createEmptySession();
    try {
      const parsed = JSON.parse(text);
      if (!parsed || typeof parsed !== 'object') return createEmptySession();
      const session = createEmptySession();
      session.updatedAt = Number(parsed.updatedAt) || Date.now();
      session.werewolfGamesCount = Math.max(0, Number(parsed.werewolfGamesCount) || 0);
      session.spyGamesCount = Math.max(0, Number(parsed.spyGamesCount) || 0);
      session.recordedKeys = Array.isArray(parsed.recordedKeys)
        ? parsed.recordedKeys.filter((k) => typeof k === 'string').slice(-MAX_RECORDED_KEYS)
        : [];
      const srcPlayers = parsed.players && typeof parsed.players === 'object' ? parsed.players : {};
      for (const [k, val] of Object.entries(srcPlayers)) {
        const key = normalizePlayerKey(val && val.name, k);
        session.players[key] = sanitizePlayerRecord(val, key);
      }
      return session;
    } catch (_) {
      return createEmptySession();
    }
  }

  function saveSessionRaw(session) {
    session.updatedAt = Date.now();
    if (Array.isArray(session.recordedKeys) && session.recordedKeys.length > MAX_RECORDED_KEYS) {
      session.recordedKeys = session.recordedKeys.slice(-MAX_RECORDED_KEYS);
    }
    safeStorageSet(STORAGE_KEY, JSON.stringify(session));
  }

  function sortLeaderboard(playersList) {
    return [...playersList].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (b.survivedWins !== a.survivedWins) return b.survivedWins - a.survivedWins;
      if (a.losses !== b.losses) return a.losses - b.losses;
      return String(a.name || '').localeCompare(String(b.name || ''), 'vi');
    });
  }

  function toPlayerList(stats) {
    if (!stats) return [];
    if (Array.isArray(stats)) return stats.map((p, idx) => sanitizePlayerRecord(p, `p_${idx}`));
    if (Array.isArray(stats.leaderboard) && stats.leaderboard.length > 0 && !stats.players) {
      return stats.leaderboard.map((p, idx) => sanitizePlayerRecord(p, `p_${idx}`));
    }
    const pMap = stats.players;
    if (Array.isArray(pMap)) {
      return pMap.map((p, idx) => sanitizePlayerRecord(p, `p_${idx}`));
    }
    if (pMap && typeof pMap === 'object') {
      return Object.entries(pMap).map(([k, val]) => sanitizePlayerRecord(val, k));
    }
    return [];
  }

  function getSessionStats() {
    const session = loadSessionRaw();
    const list = sortLeaderboard(Object.values(session.players));
    return {
      version: session.version,
      updatedAt: session.updatedAt,
      werewolfGamesCount: session.werewolfGamesCount,
      spyGamesCount: session.spyGamesCount,
      totalGames: session.werewolfGamesCount + session.spyGamesCount,
      recordedKeys: [...session.recordedKeys],
      players: session.players,
      leaderboard: list
    };
  }

  function resetSessionStats() {
    safeStorageRemove(STORAGE_KEY);
    return getSessionStats();
  }

  function getOrCreatePlayer(session, playerObj) {
    const name = normalizePlayerName(playerObj && playerObj.name);
    const key = normalizePlayerKey(name, playerObj && playerObj.id);
    if (!session.players[key]) {
      session.players[key] = createEmptyPlayer(key, name || 'Người chơi', playerObj && playerObj.avatarId);
    }
    const entry = session.players[key];
    if (name) entry.name = name;
    if (playerObj && playerObj.avatarId) {
      entry.avatarId = String(playerObj.avatarId);
    }
    entry.lastUpdated = Date.now();
    return entry;
  }

  function getRoleTeam(roleId) {
    const id = String(roleId || 'villager');
    const roleMeta = root.GameData && root.GameData.WEREWOLF_ROLES && root.GameData.WEREWOLF_ROLES[id];
    if (roleMeta && roleMeta.team) return roleMeta.team;
    return FALLBACK_ROLE_TEAMS[id] || 'villager';
  }

  function didWinWerewolf(winner, player, lovers) {
    if (!player) return false;
    const roleId = player.roleId || 'villager';
    const team = getRoleTeam(roleId);
    if (winner === 'villager') return team === 'villager';
    if (winner === 'werewolf') return team === 'werewolf';
    if (winner === 'jester') return roleId === 'jester';
    if (winner === 'serial_killer') return roleId === 'serial_killer';
    if (winner === 'lovers') return Array.isArray(lovers) && lovers.includes(player.id);
    return false;
  }

  function buildWerewolfDedupKey(wwState) {
    const gameId = wwState.gameId ? String(wwState.gameId) : '';
    const epoch = wwState.epoch ? String(wwState.epoch) : '';
    const gameNo = Number(wwState.gameNo);
    if (Number.isFinite(gameNo) && gameNo > 0) {
      return `ww:${gameId}:${epoch}:g${gameNo}`;
    }
    const seq = wwState.stateSeq !== undefined && wwState.stateSeq !== null ? String(wwState.stateSeq) : '';
    return `ww:${gameId}:${epoch}:${seq}`;
  }

  function buildSpyDedupKey(spyState) {
    const epoch = spyState.epoch ? String(spyState.epoch) : spyState.gameId ? String(spyState.gameId) : '';
    const round = Number(spyState.round) || 0;
    const hasToken = typeof spyState.crossedResetToken === 'number' && Number.isFinite(spyState.crossedResetToken);
    const tokenPart = hasToken ? `:t${spyState.crossedResetToken}` : '';
    return `spy:${epoch}:r${round}${tokenPart}`;
  }

  function recordWerewolfGame(wwState) {
    if (!wwState || wwState.phase !== 'GAME_OVER' || !wwState.winner) return false;
    if (!Array.isArray(wwState.players) || wwState.players.length === 0) return false;

    const session = loadSessionRaw();
    const dedupKey = buildWerewolfDedupKey(wwState);
    if (session.recordedKeys.includes(dedupKey)) return false;

    const deaths = wwState.deaths && typeof wwState.deaths === 'object' ? wwState.deaths : {};
    const lovers = Array.isArray(wwState.lovers) ? wwState.lovers : [];
    const dayVotes = wwState.dayVotes && typeof wwState.dayVotes === 'object' ? wwState.dayVotes : {};
    const playersById = new Map();
    for (const p of wwState.players) {
      if (p && p.id) playersById.set(p.id, p);
    }

    for (const p of wwState.players) {
      if (!p) continue;
      const entry = getOrCreatePlayer(session, p);
      const roleId = p.roleId || p.startRoleId || 'villager';
      const team = getRoleTeam(roleId);
      const won = didWinWerewolf(wwState.winner, p, lovers);
      const death = p.id ? deaths[p.id] : null;
      const isNight1Death = Boolean(death && death.phase === 'night' && Number(death.round) === 1);
      const isLynched = Boolean(death && death.cause === 'lynch');
      const isAlive = p.alive !== false;

      entry.gamesPlayed += 1;
      if (team === 'werewolf') entry.wolfGames += 1;
      if (team === 'villager') entry.villagerGames += 1;

      if (won) {
        entry.wins += 1;
        entry.points += 3;
        if (team === 'werewolf') entry.wolfWins += 1;
        else if (team === 'villager') entry.villagerWins += 1;
        if (team === 'neutral' || wwState.winner === 'lovers' || wwState.winner === 'jester' || wwState.winner === 'serial_killer') {
          if (team === 'neutral' || (wwState.winner === 'lovers' && lovers.includes(p.id))) {
            entry.neutralWins += 1;
            entry.points += 1;
          }
        }
        if (isAlive) {
          entry.survivedWins += 1;
          entry.points += 1;
        }
      } else {
        entry.losses += 1;
      }

      // Điểm tham gia
      entry.points += 1;

      if (isNight1Death) entry.night1Deaths += 1;
      if (isLynched) entry.lynchedCount += 1;

      // Thưởng nhỏ nếu bỏ phiếu cuối ngày trúng phe Sói/Sát Nhân
      if (p.id && dayVotes[p.id] && team === 'villager') {
        const target = playersById.get(dayVotes[p.id]);
        if (target) {
          const targetTeam = getRoleTeam(target.roleId || 'villager');
          if (targetTeam === 'werewolf' || target.roleId === 'serial_killer') {
            entry.points += 1;
          }
        }
      }
    }

    session.werewolfGamesCount += 1;
    session.recordedKeys.push(dedupKey);
    saveSessionRaw(session);
    return true;
  }

  function recordSpyGame(spyState) {
    if (!spyState || spyState.phase !== 'GAME_OVER' || !spyState.winner) return false;
    if (!Array.isArray(spyState.players) || spyState.players.length === 0) return false;

    const session = loadSessionRaw();
    const dedupKey = buildSpyDedupKey(spyState);
    if (session.recordedKeys.includes(dedupKey)) return false;

    const votes = spyState.votes && typeof spyState.votes === 'object' ? spyState.votes : {};
    const playersById = new Map();
    for (const p of spyState.players) {
      if (p && p.id) playersById.set(p.id, p);
    }

    for (const p of spyState.players) {
      if (!p) continue;
      const entry = getOrCreatePlayer(session, p);
      const role = p.role || p.revealedRole || 'civilian';
      const isBadRole = role === 'spy' || role === 'mr_white';
      const isAlive = p.alive !== false;

      let won = false;
      if (spyState.winner === 'civilian') {
        won = role === 'civilian';
      } else if (spyState.winner === 'spy') {
        won = role === 'spy' || role === 'mr_white';
      } else if (spyState.winner === 'mr_white') {
        won = role === 'mr_white';
      }

      entry.gamesPlayed += 1;
      entry.spyGames += 1;
      if (isBadRole) entry.spyRoleGames += 1;

      // Điểm tham gia
      entry.points += 1;

      if (won) {
        entry.wins += 1;
        entry.points += 3;
        if (isBadRole) {
          entry.spyRoleWins += 1;
        }
        if (role === 'mr_white') {
          entry.mrWhiteWins += 1;
          entry.points += 1;
        }
        if (isAlive) {
          entry.survivedWins += 1;
          entry.points += 1;
        }
      } else {
        entry.losses += 1;
      }

      if (!isAlive && !won && role === 'civilian') {
        // Dân bị vote loại nhầm trong Gián Điệp cũng tính vào lịch sử bị loại
        entry.lynchedCount += 1;
      }

      // Thống kê vote trúng Gián Điệp / Mr. White
      if (p.id && votes[p.id] && role === 'civilian') {
        const target = playersById.get(votes[p.id]);
        if (target && (target.role === 'spy' || target.role === 'mr_white')) {
          entry.correctSpyVotes += 1;
          entry.points += 1;
        }
      }
    }

    session.spyGamesCount += 1;
    session.recordedKeys.push(dedupKey);
    saveSessionRaw(session);
    return true;
  }

  function pickTopPlayer(list, scoreFn, tieBreakFn) {
    let best = null;
    let bestScore = 0;
    let bestTie = -Infinity;
    for (const p of list) {
      const score = scoreFn(p);
      if (score <= 0) continue;
      const tie = tieBreakFn ? tieBreakFn(p) : 0;
      if (!best || score > bestScore || (score === bestScore && tie > bestTie)) {
        best = p;
        bestScore = score;
        bestTie = tie;
      }
    }
    return best ? { player: best, score: bestScore } : null;
  }

  function computeAwards(stats) {
    const inputStats = stats || getSessionStats();
    const list = toPlayerList(inputStats);
    if (list.length === 0) return [];

    const awards = [];

    // 1. Vua Hội Quán
    const king = pickTopPlayer(
      list,
      (p) => p.points,
      (p) => p.wins * 100 - p.losses
    );
    if (king) {
      awards.push({
        id: 'king_of_club',
        icon: '👑',
        label: 'Vua Hội Quán',
        title: '👑 Vua Hội Quán',
        playerKey: king.player.key,
        playerName: king.player.name,
        avatarId: king.player.avatarId,
        metricLabel: `${king.player.points} điểm • ${king.player.wins} trận thắng`,
        value: king.score,
        accent: '#fbbf24'
      });
    }

    // 2. Sói Chúa Lươn Lẹo
    const wolfBoss = pickTopPlayer(
      list,
      (p) => p.wolfWins + p.spyRoleWins,
      (p) => p.wolfGames + p.spyRoleGames + p.mrWhiteWins
    );
    if (wolfBoss) {
      const wCount = wolfBoss.player.wolfWins;
      const sCount = wolfBoss.player.spyRoleWins;
      const parts = [];
      if (wCount > 0) parts.push(`${wCount} ván Sói`);
      if (sCount > 0) parts.push(`${sCount} ván Gián Điệp`);
      awards.push({
        id: 'deceiver_king',
        icon: '🐺',
        label: 'Sói Chúa Lươn Lẹo',
        title: '🐺 Sói Chúa Lươn Lẹo',
        playerKey: wolfBoss.player.key,
        playerName: wolfBoss.player.name,
        avatarId: wolfBoss.player.avatarId,
        metricLabel: `Thắng phe ác: ${parts.join(' • ')}`,
        value: wolfBoss.score,
        accent: '#f43f5e'
      });
    }

    // 3. Nạn Nhân Đêm 1 Quốc Dân
    const victim = pickTopPlayer(
      list,
      (p) => p.night1Deaths * 2 + p.lynchedCount,
      (p) => p.night1Deaths * 10 + p.losses
    );
    if (victim) {
      const p = victim.player;
      const detail =
        p.night1Deaths > 0 && p.lynchedCount > 0
          ? `${p.night1Deaths} lần chết Đêm 1 • ${p.lynchedCount} lần bị loại`
          : p.night1Deaths > 0
            ? `${p.night1Deaths} lần gục ngã ngay Đêm 1`
            : `${p.lynchedCount} lần bị cả hội đưa lên giá`;
      awards.push({
        id: 'night1_victim',
        icon: '💀',
        label: 'Nạn Nhân Đêm 1 Quốc Dân',
        title: '💀 Nạn Nhân Đêm 1 Quốc Dân',
        playerKey: p.key,
        playerName: p.name,
        avatarId: p.avatarId,
        metricLabel: detail,
        value: victim.score,
        accent: '#a855f7'
      });
    }

    // 4. Đôi Mắt Tinh Đời
    const sharpEye = pickTopPlayer(
      list,
      (p) => {
        const spyCivWins = Math.max(0, p.wins - p.wolfWins - p.neutralWins - p.spyRoleWins - p.villagerWins);
        return p.villagerWins + spyCivWins + p.correctSpyVotes;
      },
      (p) => p.correctSpyVotes * 10 + p.villagerWins
    );
    if (sharpEye) {
      const p = sharpEye.player;
      const spyCivWins = Math.max(0, p.wins - p.wolfWins - p.neutralWins - p.spyRoleWins - p.villagerWins);
      const totalGoodWins = p.villagerWins + spyCivWins;
      const detail =
        p.correctSpyVotes > 0
          ? `${totalGoodWins} thắng phe Dân • ${p.correctSpyVotes} vote chuẩn`
          : `${totalGoodWins} lần đưa phe Dân tới chiến thắng`;
      awards.push({
        id: 'sharp_eye',
        icon: '🕵️',
        label: 'Đôi Mắt Tinh Đời',
        title: '🕵️ Đôi Mắt Tinh Đời',
        playerKey: p.key,
        playerName: p.name,
        avatarId: p.avatarId,
        metricLabel: detail,
        value: sharpEye.score,
        accent: '#22d3ee'
      });
    }

    // 5. Kẻ Sống Sót Bất Tử
    const survivor = pickTopPlayer(
      list,
      (p) => p.survivedWins,
      (p) => p.wins
    );
    if (survivor) {
      awards.push({
        id: 'immortal_survivor',
        icon: '🛡️',
        label: 'Kẻ Sống Sót Bất Tử',
        title: '🛡️ Kẻ Sống Sót Bất Tử',
        playerKey: survivor.player.key,
        playerName: survivor.player.name,
        avatarId: survivor.player.avatarId,
        metricLabel: `${survivor.player.survivedWins} ván sống sót tới phút cuối`,
        value: survivor.score,
        accent: '#34d399'
      });
    }

    // 6. Bậc Thầy Biến Hóa (tham gia đều cả Ma Sói & Gián Điệp)
    const chameleon = pickTopPlayer(
      list,
      (p) => {
        const wwGames = Math.max(0, p.gamesPlayed - p.spyGames);
        if (wwGames <= 0 || p.spyGames <= 0) return 0;
        return Math.min(wwGames, p.spyGames) * 10 + p.gamesPlayed;
      },
      (p) => p.wins
    );
    if (chameleon) {
      const p = chameleon.player;
      const wwGames = Math.max(0, p.gamesPlayed - p.spyGames);
      awards.push({
        id: 'chameleon_master',
        icon: '🎭',
        label: 'Bậc Thầy Biến Hóa',
        title: '🎭 Bậc Thầy Biến Hóa',
        playerKey: p.key,
        playerName: p.name,
        avatarId: p.avatarId,
        metricLabel: `${wwGames} ván Ma Sói • ${p.spyGames} ván Gián Điệp`,
        value: chameleon.score,
        accent: '#f59e0b'
      });
    }

    return awards;
  }

  // ==================== AVATAR RESOLUTION ====================
  function resolveAvatarMeta(avatarId) {
    const raw = typeof avatarId === 'string' ? avatarId.trim() : '';
    if (
      raw.startsWith('data:image/') ||
      raw.startsWith('assets/') ||
      raw.startsWith('http://') ||
      raw.startsWith('https://') ||
      raw.startsWith('/')
    ) {
      return {
        id: raw,
        img: raw,
        emoji: '',
        bg: 'linear-gradient(135deg,#8b5cf6,#22d3ee)'
      };
    }

    const avatars = root.GameData && Array.isArray(root.GameData.PLAYER_AVATARS) ? root.GameData.PLAYER_AVATARS : [];
    const found = avatars.find((a) => a.id === raw);
    if (found) return found;

    if (/^friend_[1-8]$/.test(raw)) {
      return {
        id: raw,
        img: `assets/avatars/${raw}.webp`,
        emoji: '',
        bg: 'linear-gradient(135deg,#6366f1,#06b6d4)'
      };
    }

    return {
      id: raw || 'default',
      img: '',
      emoji: '',
      bg: 'linear-gradient(135deg,#6366f1,#06b6d4)'
    };
  }

  function getInitials(name) {
    const cleaned = normalizePlayerName(name);
    if (!cleaned) return '?';
    const parts = cleaned.split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return cleaned.slice(0, 2).toUpperCase();
  }

  function createAvatarElement(avatarId, playerName, sizeClass = 'sa-avatar-md') {
    const meta = resolveAvatarMeta(avatarId);
    const wrap = document.createElement('span');
    wrap.className = `sa-avatar ${sizeClass}`;
    if (meta.bg) wrap.style.background = meta.bg;
    wrap.setAttribute('aria-hidden', 'true');

    const fallbackText = meta.emoji || getInitials(playerName);

    if (meta.img) {
      const img = document.createElement('img');
      img.className = 'sa-avatar-img';
      img.src = meta.img;
      img.alt = '';
      img.draggable = false;
      img.onerror = () => {
        img.remove();
        wrap.textContent = fallbackText;
      };
      wrap.appendChild(img);
    } else {
      wrap.textContent = fallbackText;
    }

    return wrap;
  }

  // ==================== CANVAS POSTER RENDERING (1080 x 1350) ====================
  function loadImageSafe(src, timeoutMs = 2500) {
    return new Promise((resolve) => {
      if (!src || typeof Image === 'undefined') {
        resolve(null);
        return;
      }
      let settled = false;
      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          resolve(null);
        }
      }, timeoutMs);

      const img = new Image();
      if (/^https?:\/\//i.test(src)) {
        img.crossOrigin = 'anonymous';
      }
      img.onload = () => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(img.naturalWidth > 0 ? img : null);
        }
      };
      img.onerror = () => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(null);
        }
      };
      try {
        img.src = src;
      } catch (_) {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(null);
        }
      }
    });
  }

  function drawRoundedRectPath(ctx, x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  function fitTextEllipsis(ctx, text, maxWidth) {
    const raw = String(text || '');
    if (ctx.measureText(raw).width <= maxWidth) return raw;
    let lo = 0;
    let hi = raw.length;
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      if (ctx.measureText(raw.slice(0, mid) + '…').width <= maxWidth) {
        lo = mid;
      } else {
        hi = mid - 1;
      }
    }
    return lo > 0 ? raw.slice(0, lo) + '…' : '…';
  }

  function drawCanvasAvatar(ctx, cx, cy, radius, imgObj, playerName, ringColor, emojiText) {
    ctx.save();
    // Glow ring
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 4, 0, Math.PI * 2);
    ctx.fillStyle = ringColor || 'rgba(167, 139, 250, 0.75)';
    ctx.fill();

    // Inner clip
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.clip();

    const grad = ctx.createLinearGradient(cx - radius, cy - radius, cx + radius, cy + radius);
    grad.addColorStop(0, '#312e81');
    grad.addColorStop(0.5, '#6d28d9');
    grad.addColorStop(1, '#0891b2');
    ctx.fillStyle = grad;
    ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);

    if (imgObj && imgObj.naturalWidth > 0) {
      const iw = imgObj.naturalWidth;
      const ih = imgObj.naturalHeight;
      const scale = Math.max((radius * 2) / iw, (radius * 2) / ih);
      const dw = iw * scale;
      const dh = ih * scale;
      ctx.drawImage(imgObj, cx - dw / 2, cy - dh / 2, dw, dh);
    } else {
      const label = emojiText || getInitials(playerName);
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `800 ${Math.round(radius * 0.88)}px "Be Vietnam Pro", "Segoe UI", Arial, sans-serif`;
      ctx.fillText(label, cx, cy + 2);
    }
    ctx.restore();
  }

  async function renderAwardCanvas(canvas, stats) {
    if (!canvas || typeof canvas.getContext !== 'function') return canvas || null;

    const sessionStats = stats || getSessionStats();
    const leaderboard = Array.isArray(sessionStats.leaderboard)
      ? sessionStats.leaderboard
      : sortLeaderboard(toPlayerList(sessionStats));
    const awards = computeAwards(sessionStats);

    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    // Nạp trước toàn bộ avatar ảnh cần thiết (tối đa top 5 + 6 danh hiệu)
    const avatarKeysNeeded = new Set();
    leaderboard.slice(0, 5).forEach((p) => avatarKeysNeeded.add(p.avatarId || ''));
    awards.slice(0, 6).forEach((a) => avatarKeysNeeded.add(a.avatarId || ''));

    const imageCache = new Map();
    await Promise.all(
      Array.from(avatarKeysNeeded).map(async (avId) => {
        const meta = resolveAvatarMeta(avId);
        if (meta.img) {
          const loaded = await loadImageSafe(meta.img);
          imageCache.set(avId, { img: loaded, meta });
        } else {
          imageCache.set(avId, { img: null, meta });
        }
      })
    );

    // 1. Gothic + Neon Night Sky Background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    bgGrad.addColorStop(0, '#050712');
    bgGrad.addColorStop(0.45, '#0b1024');
    bgGrad.addColorStop(1, '#05060f');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Ambient radial glows
    const g1 = ctx.createRadialGradient(220, 140, 20, 220, 140, 480);
    g1.addColorStop(0, 'rgba(139, 92, 246, 0.34)');
    g1.addColorStop(1, 'rgba(139, 92, 246, 0)');
    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const g2 = ctx.createRadialGradient(900, 200, 15, 900, 200, 440);
    g2.addColorStop(0, 'rgba(34, 211, 238, 0.22)');
    g2.addColorStop(1, 'rgba(34, 211, 238, 0)');
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const g3 = ctx.createRadialGradient(540, 1180, 30, 540, 1180, 520);
    g3.addColorStop(0, 'rgba(244, 63, 94, 0.16)');
    g3.addColorStop(1, 'rgba(244, 63, 94, 0)');
    ctx.fillStyle = g3;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Subtle stars
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    for (let i = 0; i < 42; i++) {
      const sx = ((i * 197 + 43) % (CANVAS_WIDTH - 80)) + 40;
      const sy = ((i * 271 + 29) % 340) + 24;
      const sr = (i % 3) * 0.7 + 0.8;
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();
    }

    // Outer double gothic frame
    ctx.save();
    drawRoundedRectPath(ctx, 28, 28, CANVAS_WIDTH - 56, CANVAS_HEIGHT - 56, 36);
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.42)';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    drawRoundedRectPath(ctx, 40, 40, CANVAS_WIDTH - 80, CANVAS_HEIGHT - 80, 28);
    ctx.strokeStyle = 'rgba(167, 139, 250, 0.26)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    // Moon emblem top-right
    ctx.save();
    const moonGrad = ctx.createRadialGradient(935, 115, 6, 935, 115, 58);
    moonGrad.addColorStop(0, '#fffbeb');
    moonGrad.addColorStop(0.55, '#fde68a');
    moonGrad.addColorStop(1, 'rgba(251, 191, 36, 0.12)');
    ctx.fillStyle = moonGrad;
    ctx.beginPath();
    ctx.arc(935, 115, 54, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 2. Header Typography
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Pill badge
    drawRoundedRectPath(ctx, 290, 74, 500, 40, 20);
    ctx.fillStyle = 'rgba(139, 92, 246, 0.24)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(167, 139, 250, 0.55)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#a5f3fc';
    ctx.font = '800 20px "Be Vietnam Pro", "Segoe UI", Arial, sans-serif';
    ctx.fillText('HỘI QUÁN PARTY GAME • TỔNG KẾT BUỔI CHƠI', 540, 95);

    // Main title
    const titleGrad = ctx.createLinearGradient(200, 135, 880, 210);
    titleGrad.addColorStop(0, '#fffbeb');
    titleGrad.addColorStop(0.45, '#fde68a');
    titleGrad.addColorStop(1, '#f59e0b');
    ctx.fillStyle = titleGrad;
    ctx.shadowColor = 'rgba(251, 191, 36, 0.35)';
    ctx.shadowBlur = 24;
    ctx.font = '900 72px "Be Vietnam Pro", "Segoe UI", Arial, sans-serif';
    ctx.fillText('BẢNG PHONG THẦN', 540, 178);
    ctx.shadowBlur = 0;

    // Session summary line
    const wwCount = Number(sessionStats.werewolfGamesCount) || 0;
    const spyCount = Number(sessionStats.spyGamesCount) || 0;
    const totalPlayers = leaderboard.length;
    const summaryLine = `${wwCount} ván Ma Sói  •  ${spyCount} ván Gián Điệp  •  ${totalPlayers} chiến thần`;
    ctx.fillStyle = '#dbe3f5';
    ctx.font = '600 24px "Be Vietnam Pro", "Segoe UI", Arial, sans-serif';
    ctx.fillText(summaryLine, 540, 236);
    ctx.restore();

    // Empty state
    if (leaderboard.length === 0) {
      ctx.save();
      drawRoundedRectPath(ctx, 110, 420, 860, 420, 28);
      ctx.fillStyle = 'rgba(17, 26, 46, 0.85)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.fillStyle = '#fbbf24';
      ctx.font = '800 40px "Be Vietnam Pro", "Segoe UI", Arial, sans-serif';
      ctx.fillText('Chưa có dữ liệu ván đấu', 540, 585);

      ctx.fillStyle = '#96a3c0';
      ctx.font = '500 26px "Be Vietnam Pro", "Segoe UI", Arial, sans-serif';
      ctx.fillText('Hãy hoàn tất ít nhất 1 ván Ma Sói hoặc Gián Điệp', 540, 650);
      ctx.fillText('để Bảng Phong Thần vinh danh hội bạn!', 540, 692);
      ctx.restore();
      return canvas;
    }

    // 3. Top Leaderboard Section
    ctx.save();
    ctx.fillStyle = '#a5f3fc';
    ctx.font = '800 23px "Be Vietnam Pro", "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('🏆 XẾP HẠNG ĐIỂM CAO NHẤT', 76, 294);
    ctx.restore();

    const topPlayers = leaderboard.slice(0, 5);
    const rankColors = ['#fbbf24', '#cbd5e1', '#fb923c', '#818cf8', '#22d3ee'];
    const rankLabels = ['👑 #1', '🥈 #2', '🥉 #3', '#4', '#5'];

    let curY = 316;
    topPlayers.forEach((p, idx) => {
      const isFirst = idx === 0;
      const cardH = isFirst ? 116 : 86;
      const cardX = 72;
      const cardW = CANVAS_WIDTH - 144;

      ctx.save();
      drawRoundedRectPath(ctx, cardX, curY, cardW, cardH, 22);
      if (isFirst) {
        const cardGrad = ctx.createLinearGradient(cardX, curY, cardX + cardW, curY + cardH);
        cardGrad.addColorStop(0, 'rgba(251, 191, 36, 0.22)');
        cardGrad.addColorStop(0.55, 'rgba(139, 92, 246, 0.22)');
        cardGrad.addColorStop(1, 'rgba(17, 26, 46, 0.92)');
        ctx.fillStyle = cardGrad;
        ctx.fill();
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.72)';
        ctx.lineWidth = 2.5;
        ctx.stroke();
      } else {
        ctx.fillStyle = 'rgba(17, 26, 46, 0.86)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.22)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Rank badge
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = rankColors[idx] || '#dbe3f5';
      ctx.font = `900 ${isFirst ? 30 : 24}px "Be Vietnam Pro", "Segoe UI", Arial, sans-serif`;
      ctx.fillText(rankLabels[idx], cardX + 58, curY + cardH / 2);

      // Avatar
      const avInfo = imageCache.get(p.avatarId || '') || { img: null, meta: resolveAvatarMeta(p.avatarId) };
      const avRadius = isFirst ? 39 : 29;
      const avCx = cardX + 152;
      const avCy = curY + cardH / 2;
      drawCanvasAvatar(ctx, avCx, avCy, avRadius, avInfo.img, p.name, rankColors[idx], avInfo.meta.emoji);

      // Player name (extra large and crisp)
      const textX = avCx + avRadius + 24;
      const pointsBoxW = 190;
      const nameMaxW = cardX + cardW - pointsBoxW - textX - 24;

      ctx.textAlign = 'left';
      ctx.fillStyle = '#ffffff';
      ctx.font = `800 ${isFirst ? 36 : 29}px "Be Vietnam Pro", "Segoe UI", Arial, sans-serif`;
      ctx.fillText(fitTextEllipsis(ctx, p.name, nameMaxW), textX, curY + (isFirst ? 42 : 31));

      ctx.fillStyle = '#cbd5e1';
      ctx.font = `600 ${isFirst ? 21 : 18}px "Be Vietnam Pro", "Segoe UI", Arial, sans-serif`;
      const subStats = `${p.wins} thắng / ${p.gamesPlayed} ván  •  Sống thắng: ${p.survivedWins}`;
      ctx.fillText(fitTextEllipsis(ctx, subStats, nameMaxW), textX, curY + (isFirst ? 80 : 61));

      // Points pill on right
      const pillX = cardX + cardW - pointsBoxW - 18;
      const pillY = curY + (cardH - 54) / 2;
      drawRoundedRectPath(ctx, pillX, pillY, pointsBoxW, 54, 16);
      ctx.fillStyle = isFirst ? 'rgba(251, 191, 36, 0.24)' : 'rgba(34, 211, 238, 0.14)';
      ctx.fill();
      ctx.strokeStyle = isFirst ? 'rgba(251, 191, 36, 0.65)' : 'rgba(34, 211, 238, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.fillStyle = isFirst ? '#fde68a' : '#67e8f9';
      ctx.font = `900 ${isFirst ? 30 : 26}px "Be Vietnam Pro", "Segoe UI", Arial, sans-serif`;
      ctx.fillText(`${p.points} ĐIỂM`, pillX + pointsBoxW / 2, curY + cardH / 2 + 1);

      ctx.restore();
      curY += cardH + 12;
    });

    // 4. Danh Hiệu Vui Section
    const awardsStartY = Math.max(curY + 18, 822);
    ctx.save();
    ctx.fillStyle = '#fde68a';
    ctx.font = '800 23px "Be Vietnam Pro", "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('🎖️ DANH HIỆU VINH DANH ĐÊM NAY', 76, awardsStartY);
    ctx.restore();

    const showAwards = awards.slice(0, 6);
    const colGap = 20;
    const rowGap = 16;
    const boxW = (CANVAS_WIDTH - 144 - colGap) / 2;
    const boxH = 118;
    const gridTop = awardsStartY + 24;

    if (showAwards.length === 0) {
      ctx.save();
      drawRoundedRectPath(ctx, 72, gridTop, CANVAS_WIDTH - 144, 120, 22);
      ctx.fillStyle = 'rgba(17, 26, 46, 0.72)';
      ctx.fill();
      ctx.fillStyle = '#96a3c0';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '600 24px "Be Vietnam Pro", "Segoe UI", Arial, sans-serif';
      ctx.fillText('Chơi thêm ván để mở khóa các danh hiệu đặc biệt!', 540, gridTop + 60);
      ctx.restore();
    } else {
      showAwards.forEach((aw, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const ax = 72 + col * (boxW + colGap);
        const ay = gridTop + row * (boxH + rowGap);

        ctx.save();
        drawRoundedRectPath(ctx, ax, ay, boxW, boxH, 20);
        ctx.fillStyle = 'rgba(17, 26, 46, 0.9)';
        ctx.fill();
        ctx.strokeStyle = aw.accent || 'rgba(167, 139, 250, 0.45)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Top accent bar
        drawRoundedRectPath(ctx, ax + 18, ay, boxW - 36, 4, 2);
        ctx.fillStyle = aw.accent || '#a78bfa';
        ctx.fill();

        const avInfo = imageCache.get(aw.avatarId || '') || { img: null, meta: resolveAvatarMeta(aw.avatarId) };
        drawCanvasAvatar(ctx, ax + 54, ay + 64, 30, avInfo.img, aw.playerName, aw.accent, avInfo.meta.emoji);

        const contentX = ax + 100;
        const contentW = boxW - 118;

        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = aw.accent || '#fde68a';
        ctx.font = '800 20px "Be Vietnam Pro", "Segoe UI", Arial, sans-serif';
        ctx.fillText(fitTextEllipsis(ctx, `${aw.icon} ${aw.label}`, contentW), contentX, ay + 30);

        ctx.fillStyle = '#ffffff';
        ctx.font = '800 28px "Be Vietnam Pro", "Segoe UI", Arial, sans-serif';
        ctx.fillText(fitTextEllipsis(ctx, aw.playerName, contentW), contentX, ay + 65);

        ctx.fillStyle = '#cbd5e1';
        ctx.font = '600 17px "Be Vietnam Pro", "Segoe UI", Arial, sans-serif';
        ctx.fillText(fitTextEllipsis(ctx, aw.metricLabel, contentW), contentX, ay + 95);
        ctx.restore();
      });
    }

    // 5. Footer
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(148, 163, 184, 0.85)';
    const nowStr = new Date().toLocaleDateString('vi-VN');
    ctx.font = '600 20px "Be Vietnam Pro", "Segoe UI", Arial, sans-serif';
    ctx.fillText(`Hội Quán Ma Sói & Gián Điệp v4.0  •  Kỷ niệm ngày ${nowStr}`, 540, CANVAS_HEIGHT - 68);
    ctx.restore();

    return canvas;
  }

  async function downloadAwardImage(stats) {
    if (typeof document === 'undefined') return false;
    const previewCanvas = document.getElementById('sa-poster-canvas');
    const canvas = previewCanvas || document.createElement('canvas');
    await renderAwardCanvas(canvas, stats);

    const dateTag = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const filename = `hoi-quan-bang-phong-than-${dateTag}.png`;

    const triggerDownload = (href, revokeLater) => {
      const a = document.createElement('a');
      a.href = href;
      a.download = filename;
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
      if (revokeLater) {
        setTimeout(() => {
          try {
            URL.revokeObjectURL(href);
          } catch (_) {}
        }, 1500);
      }
    };

    if (typeof canvas.toBlob === 'function') {
      return new Promise((resolve) => {
        try {
          canvas.toBlob((blob) => {
            if (blob && typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
              triggerDownload(URL.createObjectURL(blob), true);
              resolve(true);
            } else {
              try {
                triggerDownload(canvas.toDataURL('image/png'), false);
                resolve(true);
              } catch (_) {
                resolve(false);
              }
            }
          }, 'image/png');
        } catch (_) {
          try {
            triggerDownload(canvas.toDataURL('image/png'), false);
            resolve(true);
          } catch (__) {
            resolve(false);
          }
        }
      });
    }

    try {
      triggerDownload(canvas.toDataURL('image/png'), false);
      return true;
    } catch (_) {
      return false;
    }
  }

  // ==================== DIALOG UI (MODERN WEB GUIDANCE) ====================
  function attachLightDismissFallback(dialog) {
    if (typeof HTMLDialogElement === 'undefined' || 'closedBy' in HTMLDialogElement.prototype) return;
    if (dialog.dataset.saDismissFallback === '1') return;
    dialog.dataset.saDismissFallback = '1';

    let pressedOutside = false;
    const isOutside = (e) => {
      const r = dialog.getBoundingClientRect();
      return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    };

    dialog.addEventListener('pointerdown', (e) => {
      pressedOutside = isOutside(e);
    });
    dialog.addEventListener('pointerup', (e) => {
      if (pressedOutside && isOutside(e)) {
        dialog.close();
      }
      pressedOutside = false;
    });
  }

  function ensureLeaderboardDialog() {
    if (typeof document === 'undefined') return null;
    let dialog = document.getElementById('stats-awards-dialog');
    if (dialog) return dialog;

    dialog = document.createElement('dialog');
    dialog.id = 'stats-awards-dialog';
    dialog.className = 'sa-dialog';
    dialog.setAttribute('closedby', 'any');
    dialog.setAttribute('aria-labelledby', 'stats-awards-title');

    dialog.addEventListener('close', () => {
      dialog.returnValue = '';
      if (resetConfirmTimer) {
        clearTimeout(resetConfirmTimer);
        resetConfirmTimer = null;
      }
    });

    attachLightDismissFallback(dialog);
    document.body.appendChild(dialog);
    return dialog;
  }

  function renderDialogContent(dialog) {
    const stats = getSessionStats();
    const awards = computeAwards(stats);
    const renderToken = ++activeDialogRenderToken;

    dialog.innerHTML = '';

    const shell = document.createElement('div');
    shell.className = 'sa-shell';

    // Header
    const header = document.createElement('div');
    header.className = 'sa-header';

    const titleWrap = document.createElement('div');
    titleWrap.className = 'sa-title-wrap';

    const eyebrow = document.createElement('p');
    eyebrow.className = 'sa-eyebrow';
    eyebrow.textContent = 'TỔNG KẾT BUỔI CHƠI HỘI QUÁN';

    const title = document.createElement('h2');
    title.id = 'stats-awards-title';
    title.className = 'sa-title';
    title.textContent = '🏆 Bảng Phong Thần & Vinh Danh';

    titleWrap.append(eyebrow, title);

    const closeBtn = document.createElement('button');
    closeBtn.id = 'sa-close-btn';
    closeBtn.type = 'button';
    closeBtn.className = 'sa-close-btn';
    closeBtn.setAttribute('aria-label', 'Đóng Bảng Phong Thần');
    closeBtn.textContent = '✕';
    closeBtn.addEventListener('click', () => dialog.close('close'));

    header.append(titleWrap, closeBtn);
    shell.appendChild(header);

    // Summary Strip
    const summaryBar = document.createElement('div');
    summaryBar.className = 'sa-summary-bar';

    const summaryItems = [
      { label: 'Tổng số ván', value: `${stats.totalGames}`, icon: '🎲' },
      { label: 'Ma Sói', value: `${stats.werewolfGamesCount} ván`, icon: '🐺' },
      { label: 'Gián Điệp', value: `${stats.spyGamesCount} ván`, icon: '🕵️' },
      { label: 'Người chơi', value: `${stats.leaderboard.length}`, icon: '👥' }
    ];
    for (const item of summaryItems) {
      const chip = document.createElement('div');
      chip.className = 'sa-stat-chip';

      const iconEl = document.createElement('span');
      iconEl.className = 'sa-stat-icon';
      iconEl.setAttribute('aria-hidden', 'true');
      iconEl.textContent = item.icon;

      const textCol = document.createElement('div');
      textCol.className = 'sa-stat-text';

      const valEl = document.createElement('strong');
      valEl.textContent = item.value;
      const lblEl = document.createElement('span');
      lblEl.textContent = item.label;

      textCol.append(valEl, lblEl);
      chip.append(iconEl, textCol);
      summaryBar.appendChild(chip);
    }
    shell.appendChild(summaryBar);

    // Main 2-col layout (Awards + Leaderboard on left, Poster preview on right)
    const grid = document.createElement('div');
    grid.className = 'sa-main-grid';

    const leftCol = document.createElement('div');
    leftCol.className = 'sa-left-col';

    // Awards section
    const awardsSection = document.createElement('section');
    awardsSection.className = 'sa-section';
    const awardsHeading = document.createElement('h3');
    awardsHeading.className = 'sa-section-title';
    awardsHeading.textContent = '🎖️ Danh Hiệu Vui Buổi Chơi';
    awardsSection.appendChild(awardsHeading);

    if (awards.length === 0) {
      const emptyBox = document.createElement('p');
      emptyBox.className = 'sa-empty-note';
      emptyBox.textContent = 'Chưa có danh hiệu nào. Hãy chơi xong ít nhất 1 ván Ma Sói hoặc Gián Điệp!';
      awardsSection.appendChild(emptyBox);
    } else {
      const awardsGrid = document.createElement('div');
      awardsGrid.className = 'sa-awards-grid';

      for (const aw of awards) {
        const card = document.createElement('article');
        card.className = 'sa-award-card';
        card.style.setProperty('--sa-accent', aw.accent || '#a78bfa');

        const cardTop = document.createElement('div');
        cardTop.className = 'sa-award-head';
        cardTop.textContent = `${aw.icon} ${aw.label}`;

        const cardBody = document.createElement('div');
        cardBody.className = 'sa-award-player';
        cardBody.appendChild(createAvatarElement(aw.avatarId, aw.playerName, 'sa-avatar-sm'));

        const info = document.createElement('div');
        info.className = 'sa-award-info';
        const pName = document.createElement('strong');
        pName.textContent = aw.playerName;
        const pMetric = document.createElement('span');
        pMetric.textContent = aw.metricLabel;
        info.append(pName, pMetric);

        cardBody.appendChild(info);
        card.append(cardTop, cardBody);
        awardsGrid.appendChild(card);
      }
      awardsSection.appendChild(awardsGrid);
    }
    leftCol.appendChild(awardsSection);

    // Leaderboard section
    const lbSection = document.createElement('section');
    lbSection.className = 'sa-section';
    const lbHeading = document.createElement('h3');
    lbHeading.className = 'sa-section-title';
    lbHeading.textContent = '📊 Bảng Xếp Hạng Người Chơi';
    lbSection.appendChild(lbHeading);

    if (stats.leaderboard.length === 0) {
      const emptyLb = document.createElement('p');
      emptyLb.className = 'sa-empty-note';
      emptyLb.textContent = 'Chưa có người chơi nào được ghi nhận trong buổi này.';
      lbSection.appendChild(emptyLb);
    } else {
      const listEl = document.createElement('ol');
      listEl.className = 'sa-leaderboard-list';

      stats.leaderboard.forEach((p, idx) => {
        const li = document.createElement('li');
        li.className = `sa-lb-row ${idx < 3 ? `sa-rank-${idx + 1}` : ''}`;

        const rankSpan = document.createElement('span');
        rankSpan.className = 'sa-lb-rank';
        rankSpan.textContent = idx === 0 ? '👑' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;

        const avEl = createAvatarElement(p.avatarId, p.name, 'sa-avatar-md');

        const meta = document.createElement('div');
        meta.className = 'sa-lb-meta';
        const nameEl = document.createElement('strong');
        nameEl.className = 'sa-lb-name';
        nameEl.textContent = p.name;

        const detailEl = document.createElement('span');
        detailEl.className = 'sa-lb-detail';
        detailEl.textContent = `${p.wins} thắng / ${p.gamesPlayed} ván • Sói: ${p.wolfWins} • Dân: ${p.villagerWins} • Gián điệp: ${p.spyGames}`;
        meta.append(nameEl, detailEl);

        const scoreBox = document.createElement('div');
        scoreBox.className = 'sa-lb-score';
        const ptsStrong = document.createElement('strong');
        ptsStrong.textContent = `${p.points}`;
        const ptsSub = document.createElement('span');
        ptsSub.textContent = 'điểm';
        scoreBox.append(ptsStrong, ptsSub);

        li.append(rankSpan, avEl, meta, scoreBox);
        listEl.appendChild(li);
      });

      lbSection.appendChild(listEl);
    }
    leftCol.appendChild(lbSection);

    // Right column: Poster Preview
    const rightCol = document.createElement('div');
    rightCol.className = 'sa-right-col';

    const previewCard = document.createElement('section');
    previewCard.className = 'sa-poster-card';

    const previewTitle = document.createElement('h3');
    previewTitle.className = 'sa-section-title';
    previewTitle.textContent = '🖼️ Xem Trước Ảnh Kỷ Niệm';

    const canvasWrap = document.createElement('div');
    canvasWrap.className = 'sa-canvas-frame';

    const canvas = document.createElement('canvas');
    canvas.id = 'sa-poster-canvas';
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    canvas.setAttribute('aria-label', 'Poster tổng kết Bảng Phong Thần');
    canvasWrap.appendChild(canvas);

    previewCard.append(previewTitle, canvasWrap);
    rightCol.appendChild(previewCard);

    grid.append(leftCol, rightCol);
    shell.appendChild(grid);

    // Footer actions
    const footer = document.createElement('div');
    footer.className = 'sa-footer-actions';

    const resetBtn = document.createElement('button');
    resetBtn.id = 'sa-reset-btn';
    resetBtn.type = 'button';
    resetBtn.className = 'btn btn-danger sa-btn-reset';
    resetBtn.textContent = '🗑️ Xóa buổi chơi cũ';
    resetBtn.addEventListener('click', () => {
      if (resetBtn.dataset.confirm !== '1') {
        resetBtn.dataset.confirm = '1';
        resetBtn.textContent = '⚠️ Bấm lần nữa để xác nhận xóa';
        resetBtn.classList.add('is-confirming');
        if (resetConfirmTimer) clearTimeout(resetConfirmTimer);
        resetConfirmTimer = setTimeout(() => {
          resetBtn.dataset.confirm = '';
          resetBtn.textContent = '🗑️ Xóa buổi chơi cũ';
          resetBtn.classList.remove('is-confirming');
        }, 4000);
        return;
      }
      if (resetConfirmTimer) {
        clearTimeout(resetConfirmTimer);
        resetConfirmTimer = null;
      }
      resetSessionStats();
      renderDialogContent(dialog);
      try {
        root.AppUI?.showToast?.('Đã xóa dữ liệu buổi chơi cũ.');
      } catch (_) {}
    });

    const downloadBtn = document.createElement('button');
    downloadBtn.id = 'sa-download-btn';
    downloadBtn.type = 'button';
    downloadBtn.className = 'btn btn-primary sa-btn-download';
    downloadBtn.textContent = '📥 Lưu ảnh gửi nhóm chat';
    downloadBtn.setAttribute('autofocus', '');
    downloadBtn.addEventListener('click', async () => {
      downloadBtn.disabled = true;
      const orig = downloadBtn.textContent;
      downloadBtn.textContent = '⏳ Đang xuất ảnh PNG...';
      try {
        await downloadAwardImage(stats);
        try {
          root.AppUI?.showToast?.('Đã tải xuống ảnh Bảng Phong Thần!');
        } catch (_) {}
      } finally {
        downloadBtn.disabled = false;
        downloadBtn.textContent = orig;
      }
    });

    const doneBtn = document.createElement('button');
    doneBtn.type = 'button';
    doneBtn.className = 'btn btn-ghost sa-btn-done';
    doneBtn.textContent = 'Đóng';
    doneBtn.addEventListener('click', () => dialog.close('done'));

    footer.append(resetBtn, downloadBtn, doneBtn);
    shell.appendChild(footer);

    dialog.appendChild(shell);

    // Render poster preview asynchronously
    renderAwardCanvas(canvas, stats).then(() => {
      if (renderToken !== activeDialogRenderToken) return;
    });
  }

  function openLeaderboardDialog() {
    if (typeof document === 'undefined') return null;
    const dialog = ensureLeaderboardDialog();
    if (!dialog) return null;

    renderDialogContent(dialog);
    if (!dialog.open && typeof dialog.showModal === 'function') {
      dialog.showModal();
    }
    return dialog;
  }

  root.StatsAwards = {
    STORAGE_KEY,
    recordWerewolfGame,
    recordSpyGame,
    getSessionStats,
    resetSessionStats,
    computeAwards,
    openLeaderboardDialog,
    renderAwardCanvas,
    downloadAwardImage
  };
})();
