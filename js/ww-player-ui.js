// js/ww-player-ui.js — Giao diện Người chơi trên Điện thoại (v4.0)
(typeof window !== 'undefined' ? window : globalThis).WWPlayerUI = ((global) => {
  'use strict';

  const _win = typeof window !== 'undefined' ? window : global;

  let lastHasAction = false;
  let lastPlayerSceneKey = '';
  let lastPhaseStepKey = '';
  let lastRenderedPhase = '';
  let playerTickTimer = null;

  // Trạng thái chọn mục tiêu cục bộ trên điện thoại (tự reset khi đổi pha/lượt)
  let selectedNightTarget = null;
  let selectedCupidTargets = [];
  let selectedDetectiveTargets = [];
  let selectedHunterTarget = null;
  let selectedSheriffTarget = null;
  let witchSaveChoice = false;
  let witchPoisonChoice = null;

  function eng() {
    return (_win && _win.WWEngine) || null;
  }

  function ctx() {
    const e = eng();
    return e && typeof e.getContext === 'function' ? e.getContext() : null;
  }

  function getRolesMap() {
    return (_win && _win.GameData && _win.GameData.WEREWOLF_ROLES) || {};
  }

  function escapeHtml(str) {
    const c = ctx();
    if (c && typeof c.escapeHtml === 'function') return c.escapeHtml(str);
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatClock(totalSeconds) {
    const c = ctx();
    if (c && typeof c.formatClock === 'function') return c.formatClock(totalSeconds);
    const s = Math.max(0, Math.ceil(Number(totalSeconds) || 0));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }

  function isWolfRole(roleId) {
    const c = ctx();
    if (c && typeof c.isWolfRole === 'function') return c.isWolfRole(roleId);
    return roleId === 'werewolf' || roleId === 'alpha_wolf';
  }

  function isPausedState(st) {
    const c = ctx();
    if (st && typeof st.isPaused === 'boolean') return st.isPaused;
    return Boolean(c && typeof c.isHostPaused === 'function' && c.isHostPaused());
  }

  function resetTurnSelections() {
    selectedNightTarget = null;
    selectedCupidTargets = [];
    selectedDetectiveTargets = [];
    selectedHunterTarget = null;
    selectedSheriffTarget = null;
    witchSaveChoice = false;
    witchPoisonChoice = null;
  }

  function createAvatar(avatarId, sizeClass = 'avatar-md') {
    try {
      const ui = _win.AppUI;
      if (ui && typeof ui.createAvatarEl === 'function') {
        const node = ui.createAvatarEl(avatarId, sizeClass);
        if (node) return node;
      }
    } catch (_) {}
    const fallback = document.createElement('span');
    fallback.className = `avatar-slot ${sizeClass}`;
    fallback.textContent = '🙂';
    return fallback;
  }

  function buildPlayerLabelEl(player, sizeClass = 'avatar-md', suffix = '') {
    const wrap = document.createElement('span');
    wrap.className = 'player-name-with-avatar';
    wrap.appendChild(createAvatar(player && player.avatarId, sizeClass));
    const txt = document.createElement('strong');
    txt.textContent = `${(player && player.name) || '?'}${suffix}`;
    wrap.appendChild(txt);
    return wrap;
  }

  function nameOfPublic(st, id) {
    const p = st && Array.isArray(st.players) ? st.players.find((x) => x.id === id) : null;
    return p ? p.name : '?';
  }

  function aliveOfPublic(st, id, fallback) {
    const p = st && Array.isArray(st.players) ? st.players.find((x) => x.id === id) : null;
    return p ? p.alive : fallback !== false;
  }

  function safeSendAction(payload) {
    const e = eng();
    const c = ctx();
    const st = c ? c.getState() : null;
    if (!e || isPausedState(st)) return;
    if (typeof e.sendAction === 'function') e.sendAction(payload);
  }

  function safeSendDayVote(targetId) {
    const e = eng();
    const c = ctx();
    const st = c ? c.getState() : null;
    if (!e || isPausedState(st)) return;
    if (typeof e.sendDayVote === 'function') e.sendDayVote(targetId);
  }

  function safeSendSheriffVote(targetId) {
    const e = eng();
    const c = ctx();
    const st = c ? c.getState() : null;
    if (!e || isPausedState(st)) return;
    if (typeof e.sendSheriffVote === 'function') e.sendSheriffVote(targetId);
  }

  function safeSendSheriffTransfer(targetId) {
    const e = eng();
    const c = ctx();
    const st = c ? c.getState() : null;
    if (!e || isPausedState(st)) return;
    if (typeof e.sendSheriffTransfer === 'function') e.sendSheriffTransfer(targetId);
  }

  // ==================== LOG DIALOG & SCENE FX ====================
  function openPlayerLog() {
    const c = ctx();
    const st = c ? c.getState() : null;
    if (!st) return;
    const over = st.phase === 'GAME_OVER';
    try {
      _win.WWViews?.openLogDialog?.({
        title: '📜 Nhật ký ván đấu',
        entries: st.logs || [],
        showSecret: over,
        note: over ? '' : 'Hành động bí mật ban đêm sẽ hiện ra sau khi ván kết thúc.'
      });
    } catch (_) {}
  }

  function runPlayerScene(st) {
    const c = ctx();
    if (!st || (c && typeof c.getIsHost === 'function' && c.getIsHost())) return;
    const key = `${st.phase}:${st.nightNumber || 0}`;
    if (key === lastPlayerSceneKey) return;
    lastPlayerSceneKey = key;

    try {
      const fx = _win.SceneFX;
      if (!fx) return;
      if (st.phase === 'ROLE_REVEAL' && typeof fx.playPhase === 'function') {
        fx.playPhase({
          mode: 'role',
          icon: '🃏',
          kicker: 'THẺ BÀI CỦA BẠN',
          title: 'BÍ MẬT',
          sub: 'Nhấn & giữ thẻ phía dưới để xem vai trò.',
          duration: 2000
        });
      } else if (st.phase === 'NIGHT' && typeof fx.playPhase === 'function') {
        fx.playPhase({
          mode: 'night',
          icon: '🌙',
          kicker: `MÀN ĐÊM ${st.nightNumber || 1}`,
          title: `ĐÊM ${st.nightNumber || 1}`,
          sub: 'Nhắm mắt lại và lắng nghe Bot Quản Trò.',
          duration: 1800
        });
      } else if (st.phase === 'DAY' && typeof fx.playPhase === 'function') {
        fx.playPhase({
          mode: 'day',
          icon: '☀️',
          kicker: `BÌNH MINH NGÀY ${st.nightNumber || 1}`,
          title: 'TRỜI SÁNG',
          sub: 'Mở mắt, tranh luận và bỏ phiếu treo cổ.',
          duration: 1900
        });
      } else if (st.phase === 'GAME_OVER' && typeof fx.celebrate === 'function') {
        fx.celebrate({ count: 90 });
      }
    } catch (_) {}
  }

  // ==================== DYNAMIC BANNERS & BADGES ====================
  function ensurePauseBanner(gameEl) {
    if (!gameEl || typeof document === 'undefined') return null;
    let banner = document.getElementById('ww-pl-pause-banner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'ww-pl-pause-banner';
      banner.className = 'alert-box ww-pl-pause-banner';
      banner.setAttribute('role', 'status');
      banner.hidden = true;
      banner.style.borderColor = 'rgba(245, 158, 11, 0.7)';
      banner.style.background = 'rgba(245, 158, 11, 0.16)';
      banner.style.color = '#fde68a';
      banner.style.fontWeight = '700';
      banner.style.textAlign = 'center';
      banner.style.marginBottom = '0.75rem';
      banner.textContent = '⏸️ Ván đấu đang tạm dừng — Vui lòng chờ Quản Trò bấm Tiếp tục';

      const strip = gameEl.querySelector ? gameEl.querySelector('.mobile-status-strip') : null;
      if (strip && strip.nextSibling) {
        gameEl.insertBefore(banner, strip.nextSibling);
      } else {
        gameEl.insertBefore(banner, gameEl.firstChild);
      }
    }
    return banner;
  }

  function ensureSheriffBadge(gameEl) {
    if (!gameEl || typeof document === 'undefined') return null;
    let badge = document.getElementById('ww-pl-sheriff-badge');
    if (!badge) {
      badge = document.createElement('span');
      badge.id = 'ww-pl-sheriff-badge';
      badge.className = 'alive-status-pill ww-pl-sheriff-badge';
      badge.hidden = true;
      badge.style.background = 'rgba(251, 191, 36, 0.18)';
      badge.style.color = '#fde68a';
      badge.style.borderColor = 'rgba(251, 191, 36, 0.45)';
      badge.textContent = '👑 Trưởng Làng (Phiếu 1.5x)';

      const badgesWrap = gameEl.querySelector ? gameEl.querySelector('.mobile-status-badges') : null;
      if (badgesWrap) {
        badgesWrap.appendChild(badge);
      } else {
        gameEl.insertBefore(badge, gameEl.firstChild);
      }
    }
    return badge;
  }

  function ensureSilencedAlert(gameEl) {
    if (!gameEl || typeof document === 'undefined') return null;
    let silWarn = document.getElementById('ww-pl-silenced-alert');
    if (!silWarn) {
      silWarn = document.createElement('div');
      silWarn.id = 'ww-pl-silenced-alert';
      silWarn.className = 'alert-box ww-pl-silenced-alert';
      silWarn.setAttribute('role', 'alert');
      silWarn.hidden = true;
      silWarn.style.borderColor = 'rgba(244, 63, 94, 0.65)';
      silWarn.style.background = 'rgba(244, 63, 94, 0.16)';
      silWarn.style.color = '#fecdd3';
      silWarn.style.fontWeight = '700';
      silWarn.style.marginBottom = '0.75rem';
      silWarn.textContent =
        '🔇 BẠN BỊ PHÁP SƯ CÂM KHÓA MIỆNG HÔM NAY — Không được phát biểu, ra hiệu hay làm âm thanh!';

      const botLine = document.getElementById('ww-pl-bot-line');
      if (botLine && botLine.parentNode === gameEl) {
        gameEl.insertBefore(silWarn, botLine);
      } else {
        gameEl.insertBefore(silWarn, gameEl.firstChild);
      }
    }
    return silWarn;
  }

  // ==================== PLAYER EVENTS (HOLD-TO-PEEK & LOBBY) ====================
  function bindPlayerEvents() {
    if (typeof document === 'undefined') return;

    const leavePlayer = async () => {
      const e = eng();
      const c = ctx();
      const st = c ? c.getState() : null;
      if (st && st.phase !== 'LOBBY' && _win.AppUI && typeof _win.AppUI.confirmDialog === 'function') {
        const ok = await _win.AppUI.confirmDialog(
          'Rời phòng Ma Sói?',
          'Bạn sẽ rời phòng. Mở lại app vẫn vào tiếp được ván đang chơi.'
        );
        if (!ok) return;
      }
      try {
        e?.sendLeave?.();
      } catch (_) {}
      try {
        _win.AppUI?.clearSession?.();
      } catch (_) {}
      try {
        e?.cleanup?.();
      } catch (_) {}
      try {
        _win.AppUI?.goHome?.();
      } catch (_) {}
    };

    const leaveBtn = document.getElementById('ww-pl-leave');
    if (leaveBtn) leaveBtn.onclick = leavePlayer;
    const ingameLeaveBtn = document.getElementById('ww-pl-ingame-leave');
    if (ingameLeaveBtn) ingameLeaveBtn.onclick = leavePlayer;

    const editNameBtn = document.getElementById('ww-pl-edit-name');
    if (editNameBtn) {
      editNameBtn.onclick = async () => {
        const e = eng();
        const c = ctx();
        if (!c || !_win.AppUI || typeof _win.AppUI.promptProfileDialog !== 'function') return;
        const curName = c.getMyName();
        const curAvatar = c.getMyAvatarId();
        const profile = await _win.AppUI.promptProfileDialog(curName, curAvatar);
        if (profile && (profile.name !== curName || profile.avatarId !== curAvatar)) {
          e?.sendRename?.(profile.name, profile.avatarId);
        }
      };
    }

    const readyBtn = document.getElementById('ww-pl-ready-btn');
    if (readyBtn) {
      readyBtn.onclick = () => {
        const e = eng();
        e?.sendReady?.();
      };
    }

    const toggleCardBtn = document.getElementById('ww-pl-toggle-card');
    if (toggleCardBtn && _win.AppUI && typeof _win.AppUI.bindHoldToPeekCard === 'function') {
      _win.AppUI.bindHoldToPeekCard(toggleCardBtn, (show) => {
        const c = ctx();
        if (!c) return;
        if (c.getCardRevealed() === show) return;
        c.setCardRevealed(show);

        const prevTimer = c.getPeekTimer();
        if (prevTimer) {
          clearTimeout(prevTimer);
          c.setPeekTimer(null);
        }

        if (show) {
          // Cố ý KHÔNG phát âm thanh khi lật thẻ: tiếng động sẽ làm lộ người đang xem vai.
          try {
            _win.AudioEngine?.unlock?.();
            _win.SceneFX?.sparkleAtElement?.(toggleCardBtn);
          } catch (_) {}
          // Giữ thẻ >= 700ms mới tính là đã xem tin mới.
          if (c.getCardHasNews()) {
            c.setPeekTimer(setTimeout(() => c.markCardSeen(), 700));
          }
        }
        renderSecretCard();
      });
    }

    const plLogBtn = document.getElementById('ww-pl-open-log');
    if (plLogBtn) {
      plLogBtn.onclick = openPlayerLog;
    }
  }

  // ==================== SECRET 3D CARD RENDER ====================
  function renderSecretCard() {
    if (typeof document === 'undefined') return;
    const c = ctx();
    if (!c) return;

    const btn = document.getElementById('ww-pl-toggle-card');
    if (!btn) return;

    const st = c.getState();
    const clientSecret = c.getMySecret();
    const cardRevealed = Boolean(c.getCardRevealed());
    const cardHasNews = Boolean(c.getCardHasNews());
    const myName = c.getMyName();
    const myAvatarId = c.getMyAvatarId();

    const bgLayer = document.getElementById('ww-pl-card-bg');
    btn.setAttribute('aria-expanded', String(cardRevealed));
    btn.classList.toggle('is-flipped', cardRevealed);
    btn.classList.toggle('has-news', cardHasNews);

    const newsPill = document.getElementById('ww-pl-card-news');
    if (newsPill) newsPill.hidden = !cardHasNews;

    const cardAv = document.getElementById('ww-pl-card-avatar');
    if (cardAv) {
      cardAv.innerHTML = '';
      cardAv.appendChild(createAvatar(myAvatarId, 'avatar-xl'));
    }

    const cardOwner = document.getElementById('ww-pl-card-owner');
    if (cardOwner) {
      cardOwner.textContent = lastHasAction
        ? '👆 Giữ để xem vai trò'
        : `${myName || 'Bạn'} — 👆 Nhấn & GIỮ để xem Vai Trò`;
    }

    if (clientSecret && clientSecret.roleId) {
      const roles = getRolesMap();
      const role = roles[clientSecret.roleId] || roles.villager;
      if (role) {
        if (bgLayer && role.bgImage) {
          bgLayer.style.backgroundImage = `url('${role.bgImage}')`;
        }
        if (role.themeColor) {
          btn.style.setProperty('--role-theme', role.themeColor);
        }
        const iconEl = document.getElementById('ww-pl-role-icon');
        if (iconEl) iconEl.textContent = role.icon || '';
        const nameEl = document.getElementById('ww-pl-role-name');
        if (nameEl) nameEl.textContent = role.name || '';
        const teamBadge = document.getElementById('ww-pl-role-team');
        if (teamBadge) {
          teamBadge.hidden = false;
          teamBadge.textContent = role.teamName || '';
          teamBadge.dataset.team = role.team || '';
        }
        const descEl = document.getElementById('ww-pl-role-desc');
        if (descEl) descEl.textContent = role.desc || '';
      }

      const matesEl = document.getElementById('ww-pl-role-teammates');
      if (matesEl) matesEl.hidden = true;

      const li = clientSecret.loverInfo;
      const extrasEl = document.getElementById('ww-pl-secret-extras');
      if (extrasEl && _win.WWViews && typeof _win.WWViews.secretExtras === 'function') {
        _win.WWViews.secretExtras(extrasEl, {
          teammates: (clientSecret.teammates || []).map((m) => ({
            ...m,
            alive: aliveOfPublic(st, m.id, m.alive)
          })),
          lover: li ? { ...li, alive: aliveOfPublic(st, li.id, li.alive) } : null,
          converted: Boolean(clientSecret.converted)
        });
      }
    }
  }

  // ==================== HAS ACTION CHECK ====================
  function playerHasAction(st, myId, alive) {
    const c = ctx();
    if (!st || !myId) return false;
    if (!Array.isArray(st.players) || !st.players.some((p) => p.id === myId)) return false;

    // Thợ Săn / Kẻ Báo Thù / Trưởng Làng vừa ngã xuống vẫn cần thao tác dù alive === false
    if (st.phase === 'HUNTER_REVENGE') return st.pendingHunterId === myId;
    if (st.phase === 'SHERIFF_TRANSFER') return Boolean(st.sheriffId && st.sheriffId === myId);

    if (!alive) return false;
    if (st.phase === 'DAY' || st.phase === 'SHERIFF_ELECTION') return true;
    if (st.phase === 'NIGHT') {
      const secret = c ? c.getMySecret() : null;
      const role = secret && secret.roleId;
      return Boolean(role && (st.nightStep === role || (st.nightStep === 'werewolf' && isWolfRole(role))));
    }
    return false;
  }

  // ==================== COUNTDOWN TIMERS ====================
  function voteCountdownText(st) {
    const c = ctx();
    const lock = st && st.voteLock;
    if (!lock) return '';
    const endMs = c ? c.getClientVoteLockEnd() : 0;
    const rawLeft = isPausedState(st) ? Number(lock.remainingMs) || 0 : endMs - Date.now();
    const left = Math.max(0, Math.ceil(rawLeft / 1000));
    if (lock.kind === 'lynch') {
      return `⏳ Chốt treo cổ ${nameOfPublic(st, lock.targetId)} sau ${left} giây — muốn đổi phiếu thì đổi ngay!`;
    }
    return `⏳ Không ai bị treo cổ — sang đêm sau ${left} giây — muốn đổi phiếu thì đổi ngay!`;
  }

  function playerDeadlineText(st) {
    const c = ctx();
    const dl = st && st.dayDeadline;
    if (!dl) return '';
    const endMs = c ? c.getClientDayDeadlineEnd() : 0;
    const rawLeft = isPausedState(st) ? Number(dl.remainingMs) || 0 : endMs - Date.now();
    const left = Math.max(0, rawLeft / 1000);
    return `⏰ Còn ${formatClock(left)} để bỏ phiếu${st.revoteUsed ? ' (vòng bỏ phiếu lại)' : ''}`;
  }

  function lastWordsTimerText(st) {
    const c = ctx();
    const lw = st && st.lastWords;
    if (!lw) return '';
    const endMs = c ? c.getClientLastWordsEnd() : 0;
    const rawLeft = isPausedState(st) ? Number(lw.remainingMs) || 0 : endMs - Date.now();
    const left = Math.max(0, rawLeft / 1000);
    return `⏳ Thời gian còn lại: ${formatClock(left)}`;
  }

  function ensurePlayerTick() {
    if (playerTickTimer || typeof document === 'undefined') return;
    const tick = () => {
      playerTickTimer = null;
      const c = ctx();
      const st = c ? c.getState() : null;
      if (!st) return;

      const lockEl = document.getElementById('ww-pl-vote-countdown');
      const dlEl = document.getElementById('ww-pl-day-timer');
      const lwEl = document.getElementById('ww-pl-lastwords-timer');

      const lockOn = Boolean(st.voteLock && lockEl);
      const dlOn = Boolean(st.dayDeadline && dlEl);
      const lwOn = Boolean(st.phase === 'LAST_WORDS' && st.lastWords && lwEl);
      if (!lockOn && !dlOn && !lwOn) return;

      if (lockOn) lockEl.textContent = voteCountdownText(st);
      if (dlOn) {
        dlEl.textContent = playerDeadlineText(st);
        const remMs = isPausedState(st)
          ? Number(st.dayDeadline.remainingMs) || 0
          : c.getClientDayDeadlineEnd() - Date.now();
        dlEl.classList.toggle('is-urgent', remMs <= 30000);
      }
      if (lwOn) lwEl.textContent = lastWordsTimerText(st);

      if (!isPausedState(st)) {
        playerTickTimer = setTimeout(tick, 250);
      }
    };
    playerTickTimer = setTimeout(tick, 250);
  }

  // ==================== MAIN RENDER PLAYER ====================
  function renderPlayer() {
    if (typeof document === 'undefined') return;
    const c = ctx();
    if (!c) return;

    const st = c.getState();
    const sess = c.getSession();
    if (!st || !sess) return;

    const phaseStepKey = `${st.phase}:${st.nightNumber || 0}:${st.nightStep || ''}:${st.pendingHunterId || ''}`;
    if (st.phase === 'LOBBY') {
      lastPlayerSceneKey = '';
      lastPhaseStepKey = '';
      resetTurnSelections();
    } else if (phaseStepKey !== lastPhaseStepKey) {
      lastPhaseStepKey = phaseStepKey;
      resetTurnSelections();
    }

    runPlayerScene(st);

    const isActive = st.phase !== 'LOBBY';
    const phaseMode = st.phase === 'NIGHT' || st.phase === 'ROLE_REVEAL' ? 'NIGHT' : 'DAY';
    try {
      _win.AppUI?.setActiveGameMode?.(isActive, phaseMode);
    } catch (_) {}

    const rn = _win.RoomNetwork || _win.Network;
    const plCodeEl = document.getElementById('ww-pl-room-code');
    if (plCodeEl) plCodeEl.textContent = st.roomCode || (rn && rn.ROOM_LABEL) || '----';

    const playerBotText = document.getElementById('ww-pl-bot-text');
    if (playerBotText) playerBotText.textContent = st.botText || 'Bot Quản Trò đang chuẩn bị...';

    const myName = c.getMyName();
    const myAvatarId = c.getMyAvatarId();

    const myNameEl = document.getElementById('ww-pl-my-name');
    if (myNameEl) myNameEl.textContent = myName;

    const myAvSlot = document.getElementById('ww-pl-my-avatar');
    if (myAvSlot) {
      myAvSlot.innerHTML = '';
      myAvSlot.appendChild(createAvatar(myAvatarId, 'avatar-md'));
    }

    const lobbyEl = document.getElementById('ww-pl-lobby');
    const gameEl = document.getElementById('ww-pl-game');
    if (!lobbyEl || !gameEl) return;

    const myId = sess.clientId;
    const me = Array.isArray(st.players) ? st.players.find((p) => p.id === myId) : null;

    if (st.phase === 'LOBBY') {
      lobbyEl.hidden = false;
      gameEl.hidden = true;
      lastRenderedPhase = 'LOBBY';

      const readyBtn = document.getElementById('ww-pl-ready-btn');
      if (readyBtn) {
        if (me && me.ready) {
          readyBtn.textContent = '⏳ Đã Sẵn Sàng (Ấn để hủy)';
          readyBtn.className = 'btn btn-secondary btn-lg btn-block';
        } else {
          readyBtn.textContent = '✅ Ấn Sẵn Sàng';
          readyBtn.className = 'btn btn-success btn-lg btn-block';
        }
      }

      const countEl = document.getElementById('ww-pl-count');
      if (countEl) countEl.textContent = String((st.players || []).length);

      const list = document.getElementById('ww-pl-lobby-list');
      if (list) {
        list.innerHTML = '';
        (st.players || []).forEach((p) => {
          const li = document.createElement('li');
          li.className = 'player-item pop-in';
          const left = buildPlayerLabelEl(p, 'avatar-sm', p.id === myId ? ' (Bạn)' : '');
          const pill = document.createElement('span');
          pill.className = `pill ${p.ready ? 'pill-ready' : 'pill-wait'}`;
          pill.textContent = p.ready ? 'Sẵn sàng' : 'Đang chờ';
          li.append(left, pill);
          if (p.online === false && !p.isDemo) {
            li.classList.add('is-offline');
            const off = document.createElement('span');
            off.className = 'pill pill-wait';
            off.textContent = '🔴 Mất kết nối';
            li.appendChild(off);
          }
          list.appendChild(li);
        });
      }
      return;
    }

    lobbyEl.hidden = true;
    gameEl.hidden = false;

    const activeChip = document.getElementById('ww-pl-active-player');
    if (activeChip) {
      activeChip.innerHTML = '';
      activeChip.appendChild(createAvatar(myAvatarId, 'avatar-sm'));
      const chipName = document.createElement('span');
      chipName.textContent = myName;
      activeChip.appendChild(chipName);
    }

    const alive = me ? Boolean(me.alive) : false;
    lastHasAction = playerHasAction(st, myId, alive);
    renderSecretCard();

    const aliveBadge = document.getElementById('ww-pl-alive-badge');
    if (aliveBadge) {
      aliveBadge.textContent = alive ? '❤️ Còn sống' : '💀 Đã bị loại';
      aliveBadge.className = `alive-status-pill ${alive ? '' : 'dead'}`;
    }

    // [G1] Huy hiệu Trưởng Làng
    const sheriffBadge = ensureSheriffBadge(gameEl);
    const isSheriff = Boolean(me && st.sheriffId && me.id === st.sheriffId);
    if (sheriffBadge) {
      sheriffBadge.hidden = !isSheriff;
    }

    // [B3] Banner Tạm dừng
    const paused = isPausedState(st);
    const pauseBanner = ensurePauseBanner(gameEl);
    if (pauseBanner) {
      pauseBanner.hidden = !paused;
    }

    // [G3] Cảnh báo Pháp Sư Câm khóa miệng
    const isSilenced = Boolean(me && st.silencedId && me.id === st.silencedId && me.alive);
    const silencedAlert = ensureSilencedAlert(gameEl);
    if (silencedAlert) {
      silencedAlert.hidden = !isSilenced;
    }

    gameEl.classList.toggle('is-dead', !alive);
    gameEl.classList.toggle('has-action', lastHasAction);
    gameEl.classList.toggle('is-gameover', st.phase === 'GAME_OVER');
    gameEl.classList.toggle('is-paused', paused);

    const phaseBadge = document.getElementById('ww-pl-phase-badge');
    if (phaseBadge) {
      const phaseMap = {
        ROLE_REVEAL: 'XEM VAI TRÒ',
        NIGHT: `🌙 ĐÊM ${st.nightNumber || 1}`,
        HUNTER_REVENGE: st.pendingRevengeRole === 'avenger' ? '⚔️ KẺ BÁO THÙ RA TAY' : '🏹 THỢ SĂN RA TAY',
        SHERIFF_ELECTION: '👑 BẦU TRƯỞNG LÀNG',
        SHERIFF_TRANSFER: '👑 TRAO HUY HIỆU',
        LAST_WORDS: '🕯️ LỜI TRĂNG TRỐI',
        DAY: `☀️ NGÀY ${st.nightNumber || 1}`,
        GAME_OVER: '🏆 KẾT THÚC'
      };
      phaseBadge.textContent = phaseMap[st.phase] || st.phase;
    }

    renderPlayerActionArea(st, myId, me, alive, paused);
    lastRenderedPhase = st.phase;
  }

  // ==================== TARGET BUTTON, FX & DOM PATCH ====================
  function triggerRoleFx(type, anchorEl) {
    try {
      _win.MobileFX?.triggerRoleFx?.(type, anchorEl);
    } catch (_) {}
  }

  function findConfirmBtn(area) {
    if (!area || typeof area.querySelector !== 'function') return area;
    return area.querySelector('.wwv-confirm-bar .btn, .sticky-action-bar .btn') || area;
  }

  function setTargetBtnState(btn, labelText, isSelected, isDisabled) {
    if (!btn) return;
    const sel = Boolean(isSelected);
    btn.classList.toggle('selected', sel);
    btn.classList.toggle('is-selected', sel);
    btn.setAttribute('aria-pressed', String(sel));
    btn.disabled = Boolean(isDisabled);
    const labelEl = typeof btn.querySelector === 'function' ? btn.querySelector('.target-btn-label') : null;
    if (labelEl) {
      if (labelEl.textContent !== labelText) labelEl.textContent = labelText;
    } else if (btn.textContent !== labelText) {
      btn.textContent = labelText;
    }
  }

  function makeTargetBtn(player, labelText, isSelected, isDisabled, onClick) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.targetId = player.id;
    btn.className = 'target-btn target-btn-avatar';
    btn.appendChild(createAvatar(player.avatarId, 'avatar-md'));
    const span = document.createElement('span');
    span.className = 'target-btn-label';
    btn.appendChild(span);
    setTargetBtnState(btn, labelText, isSelected, isDisabled);
    btn.addEventListener('click', (ev) => {
      if (btn.disabled) return;
      onClick(ev, btn);
    });
    return btn;
  }

  function makeSkipTargetBtn(targetId, labelText, isSelected, isDisabled, onClick) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.targetId = targetId;
    btn.className = 'target-btn';
    setTargetBtnState(btn, labelText, isSelected, isDisabled);
    btn.addEventListener('click', (ev) => {
      if (btn.disabled) return;
      onClick(ev, btn);
    });
    return btn;
  }

  function patchTargetGridInPlace(area, entries) {
    if (!area || typeof area.querySelector !== 'function') return false;
    const grid = area.querySelector('.target-grid');
    if (!grid || typeof grid.querySelectorAll !== 'function') return false;
    const btns = Array.from(grid.querySelectorAll('.target-btn[data-target-id]'));
    if (btns.length !== entries.length) return false;
    for (let i = 0; i < entries.length; i += 1) {
      if (btns[i].dataset.targetId !== entries[i].id) return false;
    }
    for (let i = 0; i < entries.length; i += 1) {
      const e = entries[i];
      setTargetBtnState(btns[i], e.label, e.selected, e.disabled);
    }
    return true;
  }

  function upsertConfirmBar(area, opts) {
    if (!area || !_win.WWViews || typeof _win.WWViews.confirmBar !== 'function') return;
    const bar = typeof area.querySelector === 'function'
      ? area.querySelector('.wwv-confirm-bar, .sticky-action-bar')
      : null;
    const btn = bar && typeof bar.querySelector === 'function' ? bar.querySelector('button, .btn') : null;
    if (bar && btn) {
      if (btn.textContent !== opts.label) btn.textContent = opts.label;
      btn.disabled = !opts.enabled;
      const hint = bar.querySelector('.hint, small');
      if (hint && opts.hint) {
        if (hint.textContent !== opts.hint) hint.textContent = opts.hint;
        hint.hidden = Boolean(opts.enabled);
      }
      return;
    }
    _win.WWViews.confirmBar(area, opts);
  }

  function applyPauseLock(area, paused) {
    if (!area) return;
    area.classList.toggle('is-paused', Boolean(paused));
    if (!paused) {
      area.removeAttribute('aria-disabled');
      return;
    }
    area.setAttribute('aria-disabled', 'true');
    if (typeof area.querySelectorAll === 'function') {
      const controls = area.querySelectorAll('button, input, select, textarea');
      controls.forEach((ctrl) => {
        ctrl.disabled = true;
      });
    }
  }

  function buildActionSceneKey(st, myId, alive) {
    const c = ctx();
    const players = Array.isArray(st.players) ? st.players : [];
    if (!players.some((p) => p.id === myId)) return 'spectator';
    if (st.phase === 'GAME_OVER') return `gameover:${st.winner || ''}:${(st.logs || []).length}`;
    if (st.phase === 'HUNTER_REVENGE') {
      if (st.pendingHunterId === myId) {
        const ids = players.filter((p) => p.alive && p.id !== myId).map((p) => p.id).join(',');
        return `hunter:${st.pendingRevengeRole || 'hunter'}:${ids}`;
      }
      return `hunter_wait:${st.pendingRevengeRole || 'hunter'}`;
    }
    if (st.phase === 'SHERIFF_ELECTION') {
      const ids = alive ? players.filter((p) => p.alive).map((p) => p.id).join(',') : '';
      return `sheriff_elec:${alive}:${ids}`;
    }
    if (st.phase === 'SHERIFF_TRANSFER') {
      const isMine = Boolean(st.sheriffId && st.sheriffId === myId);
      const ids = isMine ? players.filter((p) => p.alive && p.id !== myId).map((p) => p.id).join(',') : '';
      return `sheriff_xfer:${isMine}:${ids}`;
    }
    if (st.phase === 'LAST_WORDS') {
      const names = (st.lastWords && Array.isArray(st.lastWords.names) ? st.lastWords.names : []).join(',');
      return `last_words:${names}`;
    }
    if (st.phase === 'ROLE_REVEAL') return 'role_reveal';
    if (st.phase === 'DAY') {
      const ids = alive ? players.filter((p) => p.alive && p.id !== myId).map((p) => p.id).join(',') : '';
      return `day:${alive}:${Boolean(st.revoteUsed)}:${Boolean(st.dayDeadline)}:${Boolean(st.voteLock)}:${st.lastDawnSummary || ''}:${ids}`;
    }
    if (!alive) return 'night_dead';
    const secret = c ? c.getMySecret() : null;
    const myRole = secret && secret.roleId;
    const activeTurn =
      myRole && (st.nightStep === myRole || (st.nightStep === 'werewolf' && isWolfRole(myRole)));
    if (!activeTurn) return 'night_sleep';

    if (st.nightStep === 'cupid') {
      return `night:cupid:${players.filter((p) => p.alive).map((p) => p.id).join(',')}`;
    }
    if (st.nightStep === 'guard') {
      return `night:guard:${st.lastGuardedId || ''}:${players.filter((p) => p.alive).map((p) => p.id).join(',')}`;
    }
    if (st.nightStep === 'werewolf') return 'night:werewolf';
    if (st.nightStep === 'alpha_wolf') {
      const alphaInfo = c ? c.getAlphaInfo() : null;
      return `night:alpha_wolf:${Boolean(alphaInfo?.canConvert)}:${alphaInfo?.targetId || alphaInfo?.victimId || ''}:${Boolean(alphaInfo?.alreadyUsed)}`;
    }
    if (st.nightStep === 'seer') {
      const seerRes = c ? c.getSeerResult() : null;
      if (seerRes) return `night:seer:res:${seerRes.targetName || ''}:${Boolean(seerRes.isWolf)}`;
      const ids = players.filter((p) => p.alive && p.id !== myId).map((p) => p.id).join(',');
      return `night:seer:pick:${ids}:${(st.seerHistory || []).join(',')}`;
    }
    if (st.nightStep === 'detective') {
      const detRes = c ? c.getDetectiveResult() : null;
      if (detRes) return `night:detective:res:${detRes.target1 || ''}:${detRes.target2 || ''}`;
      const ids = players.filter((p) => p.alive && p.id !== myId).map((p) => p.id).join(',');
      return `night:detective:pick:${ids}`;
    }
    if (st.nightStep === 'witch') {
      const info = (c && c.getWitchInfo()) || {};
      const ids = players
        .filter((p) => p.alive && p.id !== myId && !(witchSaveChoice && info.victimId === p.id))
        .map((p) => p.id)
        .join(',');
      return `night:witch:${Boolean(info.canSave)}:${Boolean(info.canPoison)}:${info.victimId || ''}:${witchSaveChoice}:${ids}`;
    }
    if (st.nightStep === 'spellcaster') {
      return `night:spellcaster:${st.lastSilencedId || ''}:${players.filter((p) => p.alive).map((p) => p.id).join(',')}`;
    }
    if (st.nightStep === 'serial_killer') {
      return `night:serial_killer:${players.filter((p) => p.alive && p.id !== myId).map((p) => p.id).join(',')}`;
    }
    return `night:${st.nightStep || ''}`;
  }

  function renderPlayerActionArea(st, myId, me, alive, paused) {
    const c = ctx();
    const area = document.getElementById('ww-pl-action-area');
    if (!area || !c) return;

    const preserveScroll = lastRenderedPhase === 'DAY' && st.phase === 'DAY';
    const prevScrollY = preserveScroll && typeof _win.scrollY === 'number' ? _win.scrollY : 0;

    const sceneKey = buildActionSceneKey(st, myId, alive);
    const sameScene = area.dataset?.sceneKey === sceneKey;
    const forceRebuild = st.phase === 'GAME_OVER' || st.nightStep === 'werewolf' || !sameScene;

    if (forceRebuild) {
      area.innerHTML = '';
      if (area.dataset) area.dataset.sceneKey = sceneKey;
    }

    const players = Array.isArray(st.players) ? st.players : [];
    if (!players.some((p) => p.id === myId)) {
      if (forceRebuild) {
        area.innerHTML =
          '<div class="sleep-box"><span class="sleep-icon" aria-hidden="true">👀</span><p>Đang có ván chơi — bạn xem ké nhé, chờ ván sau để vào chơi cùng cả hội!</p></div>';
      }
      applyPauseLock(area, paused);
      return;
    }

    if (st.phase === 'GAME_OVER') {
      try {
        const vm = c.buildGameOverVm(st, myId);
        _win.WWViews?.playerGameOver?.(area, vm, { onOpenLog: openPlayerLog });
      } catch (_) {}
      applyPauseLock(area, false);
      return;
    }

    if (st.phase === 'HUNTER_REVENGE') {
      if (st.pendingHunterId === myId) {
        renderHunterActionUI(area, st, myId, paused, !forceRebuild);
      } else if (forceRebuild) {
        const isAvenger = st.pendingRevengeRole === 'avenger';
        area.innerHTML = isAvenger
          ? '<div class="sleep-box"><span class="sleep-icon" aria-hidden="true">⚔️</span><p>Đang chờ Kẻ Báo Thù chọn 1 người kéo theo xuống mồ...</p></div>'
          : '<div class="sleep-box"><span class="sleep-icon" aria-hidden="true">🏹</span><p>Đang chờ Thợ Săn hô bắn và bấm xác nhận trên điện thoại...</p></div>';
      }
      applyPauseLock(area, paused);
      return;
    }

    if (st.phase === 'SHERIFF_ELECTION') {
      renderSheriffElectionUI(area, st, myId, alive, paused, !forceRebuild);
      applyPauseLock(area, paused);
      return;
    }

    if (st.phase === 'SHERIFF_TRANSFER') {
      renderSheriffTransferUI(area, st, myId, paused, !forceRebuild);
      applyPauseLock(area, paused);
      return;
    }

    if (st.phase === 'LAST_WORDS') {
      if (forceRebuild) renderLastWordsUI(area, st);
      applyPauseLock(area, paused);
      return;
    }

    if (st.phase === 'ROLE_REVEAL') {
      if (forceRebuild) {
        area.innerHTML =
          '<div class="sleep-box"><span class="sleep-icon" aria-hidden="true">🃏</span><p>Chạm vào thẻ bài phía trên để xem vai trò của bạn. Đêm 1 sắp bắt đầu!</p></div>';
      }
      applyPauseLock(area, paused);
      return;
    }

    if (st.phase === 'DAY') {
      renderDayVoteUI(area, st, myId, me, alive, paused, !forceRebuild);
      applyPauseLock(area, paused);
      if (preserveScroll && typeof _win.scrollTo === 'function') {
        try {
          _win.scrollTo(0, prevScrollY);
        } catch (_) {}
      }
      return;
    }

    // NIGHT PHASE
    if (!alive) {
      if (forceRebuild) {
        area.innerHTML =
          '<div class="sleep-box"><span class="sleep-icon" aria-hidden="true">💀</span><p>Bạn đã bị loại. Hãy giữ im lặng hoàn toàn và theo dõi ván đấu.</p></div>';
      }
      applyPauseLock(area, paused);
      return;
    }

    const secret = c.getMySecret();
    const myRole = secret && secret.roleId;
    const activeTurn =
      myRole && (st.nightStep === myRole || (st.nightStep === 'werewolf' && isWolfRole(myRole)));

    if (!activeTurn) {
      if (forceRebuild) {
        area.innerHTML =
          '<div class="sleep-box"><span class="sleep-icon" aria-hidden="true">🌙</span><p>Đang trong đêm... Hãy nhắm mắt lại và lắng nghe Bot Quản Trò.</p></div>';
      }
      applyPauseLock(area, paused);
      return;
    }

    const canPatch = !forceRebuild;
    if (st.nightStep === 'cupid') renderCupidActionUI(area, st, paused, canPatch);
    else if (st.nightStep === 'guard') renderGuardActionUI(area, st, paused, canPatch);
    else if (st.nightStep === 'werewolf') renderWerewolfActionUI(area, st, myId, paused);
    else if (st.nightStep === 'alpha_wolf') renderAlphaWolfActionUI(area, paused, canPatch);
    else if (st.nightStep === 'seer') renderSeerActionUI(area, st, myId, paused, canPatch);
    else if (st.nightStep === 'detective') renderDetectiveActionUI(area, st, myId, paused, canPatch);
    else if (st.nightStep === 'witch') renderWitchActionUI(area, st, myId, paused, canPatch);
    else if (st.nightStep === 'spellcaster') renderSpellcasterActionUI(area, st, paused, canPatch);
    else if (st.nightStep === 'serial_killer') renderSerialKillerActionUI(area, st, myId, paused, canPatch);

    applyPauseLock(area, paused);
  }

  // ==================== SPECIAL PHASES & DAY VOTING ====================
  function renderDayVoteUI(area, st, myId, me, alive, paused, canPatch) {
    const myVote = st.dayVotes ? st.dayVotes[myId] : null;
    const candidates = (st.players || []).filter((p) => p.alive && p.id !== myId);

    if (canPatch && alive) {
      const entries = candidates.map((p) => ({
        id: p.id,
        label: myVote === p.id ? `✓ Vote ${p.name}` : p.name,
        selected: myVote === p.id,
        disabled: paused
      }));
      entries.push({
        id: '__skip__',
        label: myVote === '__skip__' ? '✓ Phiếu trắng' : '🏳️ Bỏ phiếu trắng',
        selected: myVote === '__skip__',
        disabled: paused
      });
      if (patchTargetGridInPlace(area, entries)) {
        if (st.dayDeadline) ensurePlayerTick();
        if (st.voteLock) ensurePlayerTick();
        return;
      }
      area.innerHTML = '';
    }

    const h = document.createElement('h3');
    h.textContent = '☀️ Ban ngày — Tranh luận & Vote';
    area.appendChild(h);

    const summary = document.createElement('p');
    summary.textContent = st.lastDawnSummary || 'Mọi người hãy thảo luận tự do!';
    area.appendChild(summary);

    if (!alive) {
      const deadNote = document.createElement('p');
      deadNote.className = 'hint';
      deadNote.textContent = '💀 Bạn đã bị loại — không thể bỏ phiếu.';
      area.appendChild(deadNote);
      return;
    }

    if (st.revoteUsed) {
      const rv = document.createElement('p');
      rv.className = 'hint';
      rv.textContent = '🔁 Vòng bỏ phiếu lại: lần này hòa nữa thì không ai bị treo cổ.';
      area.appendChild(rv);
    }

    if (st.dayDeadline) {
      const dl = document.createElement('p');
      dl.id = 'ww-pl-day-timer';
      dl.className = 'day-timer';
      dl.textContent = playerDeadlineText(st);
      area.appendChild(dl);
      ensurePlayerTick();
    }

    if (st.voteLock) {
      const cd = document.createElement('p');
      cd.id = 'ww-pl-vote-countdown';
      cd.className = 'vote-countdown';
      cd.textContent = voteCountdownText(st);
      area.appendChild(cd);
      ensurePlayerTick();
    }

    const isSheriff = Boolean(me && st.sheriffId && me.id === st.sheriffId);
    const voteLabel = document.createElement('p');
    voteLabel.className = 'panel-desc';
    voteLabel.textContent = isSheriff
      ? 'Bầu chọn người nghi là Ma Sói — 👑 (Phiếu của bạn nặng 1.5x):'
      : 'Bầu chọn người nghi là Ma Sói (Bot sẽ cập nhật trực tiếp lên màn hình chính):';
    area.appendChild(voteLabel);

    const grid = document.createElement('div');
    grid.className = 'target-grid';

    candidates.forEach((p) => {
      grid.appendChild(
        makeTargetBtn(p, myVote === p.id ? `✓ Vote ${p.name}` : p.name, myVote === p.id, paused, (_ev, btn) => {
          triggerRoleFx('vote_stamp', btn);
          safeSendDayVote(p.id);
        })
      );
    });

    const skipVoteBtn = makeSkipTargetBtn(
      '__skip__',
      myVote === '__skip__' ? '✓ Phiếu trắng' : '🏳️ Bỏ phiếu trắng',
      myVote === '__skip__',
      paused,
      (_ev, btn) => {
        triggerRoleFx('vote_stamp', btn);
        safeSendDayVote('__skip__');
      }
    );
    grid.appendChild(skipVoteBtn);

    area.appendChild(grid);
  }

  function renderHunterActionUI(area, st, myId, paused, canPatch) {
    const isAvenger = st.pendingRevengeRole === 'avenger';
    const roleKey = isAvenger ? 'avenger' : 'hunter';
    const candidates = (st.players || []).filter((p) => p.alive && p.id !== myId);
    const icon = isAvenger ? '⚔️' : '🎯';
    const confirmLabel = selectedHunterTarget
      ? isAvenger
        ? `⚔️ Kéo theo ${nameOfPublic(st, selectedHunterTarget)}`
        : `🏹 Bắn ${nameOfPublic(st, selectedHunterTarget)}`
      : isAvenger
      ? '⚔️ Chọn người kéo theo'
      : '🏹 Chọn người để bắn';
    const confirmOpts = {
      label: confirmLabel,
      enabled: Boolean(selectedHunterTarget) && !paused,
      tone: 'danger',
      hint: isAvenger ? '👆 Chạm tên người muốn kéo theo ở phía trên' : '👆 Chạm tên người bị bắn ở phía trên',
      onConfirm: () => {
        triggerRoleFx(isAvenger ? 'avenger_strike' : 'hunter_aim', findConfirmBtn(area));
        safeSendAction({ step: roleKey, role: roleKey, targetId: selectedHunterTarget });
      }
    };

    if (canPatch) {
      const entries = candidates.map((p) => ({
        id: p.id,
        label: `${icon} ${p.name}`,
        selected: selectedHunterTarget === p.id,
        disabled: paused
      }));
      if (patchTargetGridInPlace(area, entries)) {
        const skipBtn = area.querySelector('.ww-skip-action-btn');
        if (skipBtn) skipBtn.disabled = Boolean(paused);
        upsertConfirmBar(area, confirmOpts);
        return;
      }
      area.innerHTML = '';
    }

    const title = document.createElement('h3');
    title.textContent = isAvenger
      ? '⚔️ Kẻ Báo Thù kéo theo 1 người xuống mồ!'
      : '🏹 Phát súng cuối cùng của Thợ Săn!';
    area.appendChild(title);

    const guide = document.createElement('p');
    guide.className = 'panel-desc';
    guide.textContent = isAvenger
      ? 'Bạn vừa bị treo cổ! Chọn 1 người còn sống để kéo theo chết chung rồi bấm xác nhận bên dưới (không đổi lại được):'
      : 'Hãy hô bắn ở ngoài đời, chạm tên người bị bắn rồi bấm nút Bắn bên dưới (không đổi lại được):';
    area.appendChild(guide);

    const grid = document.createElement('div');
    grid.className = 'target-grid';
    candidates.forEach((p) => {
      grid.appendChild(
        makeTargetBtn(p, `${icon} ${p.name}`, selectedHunterTarget === p.id, paused, () => {
          selectedHunterTarget = p.id;
          renderPlayer();
        })
      );
    });
    area.appendChild(grid);

    const skipBtn = document.createElement('button');
    skipBtn.type = 'button';
    skipBtn.className = 'btn btn-secondary btn-block ww-skip-action-btn';
    skipBtn.disabled = Boolean(paused);
    skipBtn.textContent = isAvenger ? 'Không kéo theo ai' : 'Không bắn ai';
    skipBtn.addEventListener('click', () => {
      if (paused) return;
      safeSendAction({ step: roleKey, role: roleKey, targetId: null });
    });
    area.appendChild(skipBtn);

    upsertConfirmBar(area, confirmOpts);
  }

  function renderSheriffElectionUI(area, st, myId, alive, paused, canPatch) {
    const myVote = st.sheriffVotes ? st.sheriffVotes[myId] : null;
    const candidates = (st.players || []).filter((p) => p.alive);
    const statusText = myVote
      ? myVote === '__skip__'
        ? '✅ Phiếu của bạn: Không bầu ai (Bỏ qua)'
        : `✅ Bạn đang bầu cho: ${nameOfPublic(st, myVote)}`
      : '';

    if (canPatch && alive) {
      const entries = candidates.map((p) => {
        const picked = myVote === p.id;
        const baseName = p.id === myId ? `${p.name} (Bạn)` : p.name;
        return {
          id: p.id,
          label: picked ? `✓ ${baseName}` : `👑 ${baseName}`,
          selected: picked,
          disabled: paused
        };
      });
      entries.push({
        id: '__skip__',
        label: myVote === '__skip__' ? '✓ Không bầu ai' : '🏳️ Không bầu ai (Phiếu trắng)',
        selected: myVote === '__skip__',
        disabled: paused
      });
      const existingGrid = area.querySelector('.target-grid');
      if (existingGrid && patchTargetGridInPlace(area, entries)) {
        let status = area.querySelector('.ww-sheriff-vote-status');
        if (myVote) {
          if (!status) {
            status = document.createElement('div');
            status.className = 'result-banner ww-sheriff-vote-status';
            area.insertBefore(status, existingGrid);
          }
          if (status.textContent !== statusText) status.textContent = statusText;
        } else if (status && status.parentNode === area) {
          area.removeChild(status);
        }
        return;
      }
      area.innerHTML = '';
    }

    const h = document.createElement('h3');
    h.textContent = '👑 Bầu Trưởng Làng (Phiếu 1.5x)';
    area.appendChild(h);

    const desc = document.createElement('p');
    desc.className = 'panel-desc';
    desc.textContent =
      'Trưởng Làng nắm giữ 1,5 phiếu khi bỏ phiếu treo cổ ban ngày. Hãy bầu chọn người bạn tin tưởng nhất:';
    area.appendChild(desc);

    if (!alive) {
      const deadNote = document.createElement('p');
      deadNote.className = 'hint';
      deadNote.textContent = '💀 Bạn đã bị loại — không thể bỏ phiếu bầu Trưởng Làng.';
      area.appendChild(deadNote);
      return;
    }

    if (myVote) {
      const status = document.createElement('div');
      status.className = 'result-banner ww-sheriff-vote-status';
      status.textContent = statusText;
      area.appendChild(status);
    }

    const grid = document.createElement('div');
    grid.className = 'target-grid';
    candidates.forEach((p) => {
      const picked = myVote === p.id;
      const baseName = p.id === myId ? `${p.name} (Bạn)` : p.name;
      const label = picked ? `✓ ${baseName}` : `👑 ${baseName}`;
      grid.appendChild(
        makeTargetBtn(p, label, picked, paused, (_ev, btn) => {
          triggerRoleFx('vote_stamp', btn);
          safeSendSheriffVote(p.id);
        })
      );
    });

    const skipBtn = makeSkipTargetBtn(
      '__skip__',
      myVote === '__skip__' ? '✓ Không bầu ai' : '🏳️ Không bầu ai (Phiếu trắng)',
      myVote === '__skip__',
      paused,
      (_ev, btn) => {
        triggerRoleFx('vote_stamp', btn);
        safeSendSheriffVote('__skip__');
      }
    );
    grid.appendChild(skipBtn);

    area.appendChild(grid);
  }

  function renderSheriffTransferUI(area, st, myId, paused, canPatch) {
    const isMyTransfer = Boolean(st.sheriffId && st.sheriffId === myId);
    if (!isMyTransfer) {
      if (!canPatch) {
        area.innerHTML =
          '<div class="sleep-box"><span class="sleep-icon" aria-hidden="true">👑</span><p>Đang chờ Trưởng Làng chọn người kế nhiệm huy hiệu...</p></div>';
      }
      return;
    }

    const aliveCandidates = (st.players || []).filter((p) => p.alive && p.id !== myId);
    if (selectedSheriffTarget && !aliveCandidates.some((p) => p.id === selectedSheriffTarget)) {
      selectedSheriffTarget = null;
    }

    const confirmOpts = {
      label: selectedSheriffTarget
        ? `👑 Trao huy hiệu cho ${nameOfPublic(st, selectedSheriffTarget)}`
        : '👑 Chọn người kế nhiệm huy hiệu',
      enabled: Boolean(selectedSheriffTarget) && !paused,
      tone: 'primary',
      hint: '👆 Chạm tên người chơi còn sống ở phía trên',
      onConfirm: () => {
        triggerRoleFx('vote_stamp', findConfirmBtn(area));
        safeSendSheriffTransfer(selectedSheriffTarget);
      }
    };

    if (canPatch) {
      const entries = aliveCandidates.map((p) => ({
        id: p.id,
        label: `👑 ${p.name}`,
        selected: selectedSheriffTarget === p.id,
        disabled: paused
      }));
      if (patchTargetGridInPlace(area, entries)) {
        const tearBtn = area.querySelector('.ww-skip-action-btn');
        if (tearBtn) tearBtn.disabled = Boolean(paused);
        upsertConfirmBar(area, confirmOpts);
        return;
      }
      area.innerHTML = '';
    }

    const h = document.createElement('h3');
    h.textContent = '👑 Trao lại Huy hiệu Trưởng Làng';
    area.appendChild(h);

    const desc = document.createElement('p');
    desc.className = 'panel-desc';
    desc.textContent =
      'Bạn vừa ngã xuống khi đang giữ huy hiệu Trưởng Làng. Chọn 1 người còn sống để kế nhiệm quyền lực (1,5 phiếu), hoặc xé bỏ huy hiệu:';
    area.appendChild(desc);

    const grid = document.createElement('div');
    grid.className = 'target-grid';
    aliveCandidates.forEach((p) => {
      grid.appendChild(
        makeTargetBtn(p, `👑 ${p.name}`, selectedSheriffTarget === p.id, paused, () => {
          selectedSheriffTarget = p.id;
          renderPlayer();
        })
      );
    });
    area.appendChild(grid);

    const tearBtn = document.createElement('button');
    tearBtn.type = 'button';
    tearBtn.className = 'btn btn-secondary btn-block ww-skip-action-btn';
    tearBtn.disabled = Boolean(paused);
    tearBtn.textContent = '🗑️ Xé bỏ huy hiệu (Không trao cho ai)';
    tearBtn.addEventListener('click', () => {
      if (paused) return;
      safeSendSheriffTransfer(null);
    });
    area.appendChild(tearBtn);

    upsertConfirmBar(area, confirmOpts);
  }

  function renderLastWordsUI(area, st) {
    const names = (st.lastWords && Array.isArray(st.lastWords.names) ? st.lastWords.names : []).filter(Boolean);
    const box = document.createElement('div');
    box.className = 'sleep-box';

    const icon = document.createElement('span');
    icon.className = 'sleep-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = '🕯️';
    box.appendChild(icon);

    const title = document.createElement('h3');
    title.textContent = 'Lời Trăng Trối Cuối Cùng';
    box.appendChild(title);

    const msg = document.createElement('p');
    msg.textContent = names.length
      ? `Xin mời mọi người giữ trật tự và lắng nghe lời trăng trối của: ${names.join(', ')}.`
      : 'Xin mời mọi người lắng nghe lời trăng trối cuối cùng.';
    box.appendChild(msg);

    if (st.lastWords) {
      const lwTimer = document.createElement('p');
      lwTimer.id = 'ww-pl-lastwords-timer';
      lwTimer.className = 'day-timer';
      lwTimer.textContent = lastWordsTimerText(st);
      box.appendChild(lwTimer);
      ensurePlayerTick();
    }

    area.appendChild(box);
  }

  // ==================== NIGHT ROLE UIs ====================
  function renderCupidActionUI(area, st, paused, canPatch) {
    const alivePlayers = (st.players || []).filter((p) => p.alive);
    const aliveIds = new Set(alivePlayers.map((p) => p.id));
    selectedCupidTargets = selectedCupidTargets.filter((id) => aliveIds.has(id));
    const hintText = `Đã chọn ${selectedCupidTargets.length}/2 người (có thể chọn cả chính mình):`;

    const confirmOpts = {
      label: '💘 Xác nhận ghép đôi Tình Nhân',
      enabled: selectedCupidTargets.length === 2 && !paused,
      tone: 'primary',
      hint: '👆 Chọn đủ 2 người ở phía trên',
      onConfirm: () => {
        triggerRoleFx('cupid_link', findConfirmBtn(area));
        safeSendAction({ step: 'cupid', role: 'cupid', targetIds: selectedCupidTargets });
      }
    };

    if (canPatch) {
      const entries = alivePlayers.map((p) => {
        const isSel = selectedCupidTargets.includes(p.id);
        return {
          id: p.id,
          label: isSel ? `💘 ${p.name}` : p.name,
          selected: isSel,
          disabled: paused
        };
      });
      if (patchTargetGridInPlace(area, entries)) {
        const hintEl = area.querySelector('.ww-selection-hint');
        if (hintEl && hintEl.textContent !== hintText) hintEl.textContent = hintText;
        upsertConfirmBar(area, confirmOpts);
        return;
      }
      area.innerHTML = '';
    }

    const h = document.createElement('h3');
    h.textContent = '💘 Lượt Thần Tình Yêu: Chọn 2 người để ghép đôi';
    area.appendChild(h);

    const hint = document.createElement('p');
    hint.className = 'panel-desc ww-selection-hint';
    hint.textContent = hintText;
    area.appendChild(hint);

    const grid = document.createElement('div');
    grid.className = 'target-grid';
    alivePlayers.forEach((p) => {
      const isSel = selectedCupidTargets.includes(p.id);
      grid.appendChild(
        makeTargetBtn(p, isSel ? `💘 ${p.name}` : p.name, isSel, paused, () => {
          if (selectedCupidTargets.includes(p.id)) {
            selectedCupidTargets = selectedCupidTargets.filter((id) => id !== p.id);
          } else if (selectedCupidTargets.length < 2) {
            selectedCupidTargets = [...selectedCupidTargets, p.id];
          } else {
            selectedCupidTargets = [selectedCupidTargets[1], p.id];
          }
          renderPlayer();
        })
      );
    });
    area.appendChild(grid);

    upsertConfirmBar(area, confirmOpts);
  }

  function renderGuardActionUI(area, st, paused, canPatch) {
    const alivePlayers = (st.players || []).filter((p) => p.alive);
    alivePlayers.forEach((p) => {
      if (st.lastGuardedId === p.id && selectedNightTarget === p.id) selectedNightTarget = null;
    });

    const confirmOpts = {
      label: selectedNightTarget ? `🛡️ Bảo vệ ${nameOfPublic(st, selectedNightTarget)}` : '🛡️ Xác nhận bảo vệ',
      enabled: Boolean(selectedNightTarget) && !paused,
      tone: 'primary',
      hint: '👆 Chạm tên người cần bảo vệ ở phía trên',
      onConfirm: () => {
        triggerRoleFx('seer_peek', findConfirmBtn(area));
        safeSendAction({ step: 'guard', role: 'guard', targetId: selectedNightTarget });
      }
    };

    if (canPatch) {
      const entries = alivePlayers.map((p) => {
        const blocked = st.lastGuardedId === p.id;
        return {
          id: p.id,
          label: blocked ? `${p.name} (Đêm trước)` : p.name,
          selected: selectedNightTarget === p.id,
          disabled: paused || blocked
        };
      });
      if (patchTargetGridInPlace(area, entries)) {
        upsertConfirmBar(area, confirmOpts);
        return;
      }
      area.innerHTML = '';
    }

    const h = document.createElement('h3');
    h.textContent = '🛡️ Lượt Bảo Vệ: Chọn 1 người để che chở đêm nay';
    area.appendChild(h);

    const grid = document.createElement('div');
    grid.className = 'target-grid';
    alivePlayers.forEach((p) => {
      const blocked = st.lastGuardedId === p.id;
      grid.appendChild(
        makeTargetBtn(p, blocked ? `${p.name} (Đêm trước)` : p.name, selectedNightTarget === p.id, paused || blocked, () => {
          selectedNightTarget = p.id;
          renderPlayer();
        })
      );
    });
    area.appendChild(grid);

    upsertConfirmBar(area, confirmOpts);
  }

  function buildWolfVm(st, myId) {
    const c = ctx();
    const wolfSync = (c && c.getWolfSync()) || { wolfVotes: {}, wolfCount: 1, lock: null };
    const wolfLockEndLocal = (c && c.getWolfLockEndLocal()) || 0;
    const secret = c ? c.getMySecret() : null;

    const votes = wolfSync.wolfVotes || {};
    const mateIds = new Set(((secret && secret.teammates) || []).map((m) => m.id));
    const loverId = (secret && secret.loverInfo && secret.loverInfo.id) || null;
    const players = Array.isArray(st.players) ? st.players : [];

    const candidates = players
      .filter((p) => p.alive && p.id !== myId && !mateIds.has(p.id))
      .map((cand) => ({
        id: cand.id,
        name: cand.name,
        avatarId: cand.avatarId,
        isMyLover: cand.id === loverId,
        pickedBy: Object.entries(votes)
          .filter(([, tId]) => tId === cand.id)
          .map(([wId]) => {
            const w = players.find((x) => x.id === wId);
            return { id: wId, name: w ? w.name : '?', avatarId: w ? w.avatarId : '', isMe: wId === myId };
          })
      }));

    const lockRem = wolfSync.lock
      ? isPausedState(st)
        ? Number(wolfSync.lock.remainingMs) || 0
        : Math.max(0, wolfLockEndLocal - Date.now())
      : 0;

    return {
      wolfCount: wolfSync.wolfCount || 1,
      myPickId: votes[myId] || null,
      candidates,
      lock: wolfSync.lock ? { targetId: wolfSync.lock.targetId, remainingMs: lockRem } : null
    };
  }

  function renderWerewolfActionUI(area, st, myId, paused) {
    const c = ctx();
    if (!_win.WWViews || typeof _win.WWViews.wolfVotePanel !== 'function' || !c) return;
    _win.WWViews.wolfVotePanel(area, buildWolfVm(st, myId), {
      onPick: (targetId) => {
        if (paused) return;
        const pickedBtn =
          (typeof area.querySelector === 'function' &&
            (area.querySelector(`[data-target-id="${targetId}"]`) ||
              area.querySelector('.target-btn.selected, .target-btn.is-selected'))) ||
          area;
        triggerRoleFx('wolf_bite', pickedBtn);
        const curSync = c.getWolfSync() || { wolfVotes: {}, wolfCount: 1, lock: null };
        c.setWolfSyncLocal({
          ...curSync,
          wolfVotes: { ...(curSync.wolfVotes || {}), [myId]: targetId },
          lock: null
        });
        c.setWolfLockEndLocal(0);
        safeSendAction({ step: 'werewolf', role: 'werewolf', targetId });
        renderPlayer();
      }
    });
  }

  // [H3-Bug] Giữ nguyên giao diện rõ ràng cho Sói Đầu Đàn kể cả khi đã hết quyền nguyền hoặc chưa có mục tiêu
  function renderAlphaWolfActionUI(area, paused, canPatch) {
    const c = ctx();
    const alphaInfo = c ? c.getAlphaInfo() : null;
    const targetId = alphaInfo && (alphaInfo.targetId || alphaInfo.victimId);
    const targetName = (alphaInfo && (alphaInfo.targetName || alphaInfo.victimName)) || '';
    const canConvert = Boolean(alphaInfo && alphaInfo.canConvert && targetId && !alphaInfo.alreadyUsed);

    if (canPatch && typeof area.querySelectorAll === 'function') {
      area.querySelectorAll('.ww-alpha-bar .btn').forEach((btn) => {
        btn.disabled = Boolean(paused);
      });
      return;
    }

    const h = document.createElement('h3');
    h.textContent = '🩸 Lượt Sói Đầu Đàn (Kỹ năng Nguyền Hóa)';
    area.appendChild(h);

    const infoBox = document.createElement('div');
    infoBox.className = 'result-banner';

    if (canConvert) {
      infoBox.innerHTML = `Đêm nay bầy Sói đã chọn cắn <strong>${escapeHtml(
        targetName
      )}</strong>. Bạn có muốn dùng quyền Nguyền <strong>1 lần duy nhất</strong> biến người này thành Ma Sói thay vì giết họ không?`;
      area.appendChild(infoBox);

      const bar = document.createElement('div');
      bar.className = 'sticky-action-bar ww-alpha-bar';

      const convertBtn = document.createElement('button');
      convertBtn.type = 'button';
      convertBtn.className = 'btn btn-danger btn-lg btn-block';
      convertBtn.disabled = Boolean(paused);
      convertBtn.textContent = `🩸 Nguyền hóa ${targetName} thành Ma Sói`;
      convertBtn.addEventListener('click', () => {
        if (paused) return;
        triggerRoleFx('wolf_bite', convertBtn);
        safeSendAction({ step: 'alpha_wolf', role: 'alpha_wolf', convert: true });
      });
      bar.appendChild(convertBtn);

      const skipBtn = document.createElement('button');
      skipBtn.type = 'button';
      skipBtn.className = 'btn btn-secondary btn-lg btn-block';
      skipBtn.disabled = Boolean(paused);
      skipBtn.textContent = '⏭️ Không nguyền (Để Sói cắn như bình thường)';
      skipBtn.addEventListener('click', () => {
        if (paused) return;
        safeSendAction({ step: 'alpha_wolf', role: 'alpha_wolf', convert: false });
      });
      bar.appendChild(skipBtn);
      area.appendChild(bar);
      return;
    }

    const reason =
      alphaInfo && alphaInfo.alreadyUsed
        ? 'Bạn đã sử dụng quyền Nguyền Hóa ở đêm trước rồi.'
        : 'Đêm nay bầy Sói chưa có mục tiêu bị cắn hợp lệ để nguyền hóa.';
    infoBox.innerHTML = `<p>${escapeHtml(
      reason
    )}</p><p class="hint">🤫 Hãy giữ nguyên điện thoại như đang thao tác đến khi Bot gọi đi ngủ để không bị lộ!</p>`;
    area.appendChild(infoBox);
  }

  function renderSeerActionUI(area, st, myId, paused, canPatch) {
    const c = ctx();
    const seerResult = c ? c.getSeerResult() : null;

    if (seerResult) {
      const doneOpts = {
        label: 'Đã xem xong — Nhắm mắt lại',
        enabled: !paused,
        tone: 'primary',
        onConfirm: () => {
          triggerRoleFx('seer_peek', findConfirmBtn(area));
          safeSendAction({ step: 'seer', role: 'seer', action: 'done', done: true });
        }
      };
      if (canPatch) {
        upsertConfirmBar(area, doneOpts);
        return;
      }

      const h = document.createElement('h3');
      h.textContent = '🔮 Lượt Tiên Tri';
      area.appendChild(h);

      const resBox = document.createElement('div');
      resBox.className = 'alert-box';
      resBox.innerHTML = seerResult.isWolf
        ? `<strong>🐺 ${escapeHtml(seerResult.targetName)} thuộc PHE MA SÓI!</strong>`
        : `<strong>🧑‍🌾 ${escapeHtml(seerResult.targetName)} thuộc PHE DÂN LÀNG!</strong>`;
      area.appendChild(resBox);

      upsertConfirmBar(area, doneOpts);
      return;
    }

    const inspectedSet = new Set(st.seerHistory || []);
    const candidates = (st.players || []).filter((p) => p.alive && p.id !== myId);
    const hasUninspected = candidates.some((p) => !inspectedSet.has(p.id));
    const finishOpts = {
      label: 'Nhắm mắt lại',
      enabled: !paused,
      tone: 'primary',
      onConfirm: () => safeSendAction({ step: 'seer', role: 'seer', action: 'done', done: true })
    };

    if (canPatch) {
      const entries = candidates.map((p) => {
        const alreadyDone = inspectedSet.has(p.id);
        return {
          id: p.id,
          label: alreadyDone ? `${p.name} (Đã soi đêm trước)` : `🔮 ${p.name}`,
          selected: false,
          disabled: paused || alreadyDone
        };
      });
      if (patchTargetGridInPlace(area, entries)) {
        if (!hasUninspected) upsertConfirmBar(area, finishOpts);
        return;
      }
      area.innerHTML = '';
    }

    const h = document.createElement('h3');
    h.textContent = '🔮 Lượt Tiên Tri';
    area.appendChild(h);

    const pNote = document.createElement('p');
    pNote.className = 'panel-desc';
    pNote.textContent = hasUninspected
      ? 'Chọn 1 người chưa soi để biết họ có phải Ma Sói hay không:'
      : 'Bạn đã soi hết tất cả người chơi còn sống! Hãy ấn xong để tiếp tục.';
    area.appendChild(pNote);

    const grid = document.createElement('div');
    grid.className = 'target-grid';
    candidates.forEach((p) => {
      const alreadyDone = inspectedSet.has(p.id);
      grid.appendChild(
        makeTargetBtn(
          p,
          alreadyDone ? `${p.name} (Đã soi đêm trước)` : `🔮 ${p.name}`,
          false,
          paused || alreadyDone,
          (_ev, btn) => {
            triggerRoleFx('seer_peek', btn);
            safeSendAction({ step: 'seer', role: 'seer', action: 'inspect', targetId: p.id });
          }
        )
      );
    });
    area.appendChild(grid);

    if (!hasUninspected) {
      upsertConfirmBar(area, finishOpts);
    }
  }

  // [G3] Thám Tử: chọn 2 người còn sống khác nhau (trừ bản thân) để xem cùng phe hay khác phe
  function renderDetectiveActionUI(area, st, myId, paused, canPatch) {
    const c = ctx();
    const detRes = c ? c.getDetectiveResult() : null;

    if (detRes) {
      const doneOpts = {
        label: 'Đã xem xong — Nhắm mắt lại',
        enabled: !paused,
        tone: 'primary',
        onConfirm: () => safeSendAction({ step: 'detective', role: 'detective', action: 'done', done: true })
      };
      if (canPatch) {
        upsertConfirmBar(area, doneOpts);
        return;
      }

      const h = document.createElement('h3');
      h.textContent = '🕵️‍♂️ Lượt Thám Tử (Đối chiếu phe)';
      area.appendChild(h);

      const t1 = detRes.target1Name || detRes.target1 || '?';
      const t2 = detRes.target2Name || detRes.target2 || '?';
      const resBox = document.createElement('div');
      resBox.className = 'alert-box ww-detective-result';
      resBox.innerHTML = detRes.sameTeam
        ? `<strong>✅ CÙNG PHE:</strong> ${escapeHtml(t1)} và ${escapeHtml(t2)} đang thuộc cùng một phe!`
        : `<strong>⚠️ KHÁC PHE:</strong> ${escapeHtml(t1)} và ${escapeHtml(t2)} đang thuộc hai phe khác nhau!`;
      area.appendChild(resBox);

      upsertConfirmBar(area, doneOpts);
      return;
    }

    const candidates = (st.players || []).filter((p) => p.alive && p.id !== myId);
    const validIds = new Set(candidates.map((p) => p.id));
    selectedDetectiveTargets = selectedDetectiveTargets.filter((id) => validIds.has(id));
    const noteText = `Chọn đúng 2 người còn sống khác nhau (trừ bạn) để kiểm tra cùng phe hay khác phe (${selectedDetectiveTargets.length}/2):`;
    const ready = selectedDetectiveTargets.length === 2;
    const confirmOpts = {
      label: ready
        ? `🕵️‍♂️ Kiểm tra ${nameOfPublic(st, selectedDetectiveTargets[0])} & ${nameOfPublic(
            st,
            selectedDetectiveTargets[1]
          )}`
        : '🕵️‍♂️ Chọn đủ 2 người để kiểm tra',
      enabled: ready && !paused,
      tone: 'primary',
      hint: '👆 Chạm chọn đúng 2 người chơi ở phía trên',
      onConfirm: () => {
        triggerRoleFx('detective_scan', findConfirmBtn(area));
        safeSendAction({
          step: 'detective',
          role: 'detective',
          target1Id: selectedDetectiveTargets[0],
          target2Id: selectedDetectiveTargets[1]
        });
      }
    };

    if (canPatch) {
      const entries = candidates.map((p) => {
        const isSel = selectedDetectiveTargets.includes(p.id);
        return {
          id: p.id,
          label: isSel ? `🕵️‍♂️ ${p.name}` : p.name,
          selected: isSel,
          disabled: paused
        };
      });
      if (patchTargetGridInPlace(area, entries)) {
        const noteEl = area.querySelector('.ww-selection-hint');
        if (noteEl && noteEl.textContent !== noteText) noteEl.textContent = noteText;
        upsertConfirmBar(area, confirmOpts);
        return;
      }
      area.innerHTML = '';
    }

    const h = document.createElement('h3');
    h.textContent = '🕵️‍♂️ Lượt Thám Tử (Đối chiếu phe)';
    area.appendChild(h);

    const pNote = document.createElement('p');
    pNote.className = 'panel-desc ww-selection-hint';
    pNote.textContent = noteText;
    area.appendChild(pNote);

    const grid = document.createElement('div');
    grid.className = 'target-grid';
    candidates.forEach((p) => {
      const isSel = selectedDetectiveTargets.includes(p.id);
      grid.appendChild(
        makeTargetBtn(p, isSel ? `🕵️‍♂️ ${p.name}` : p.name, isSel, paused, () => {
          if (selectedDetectiveTargets.includes(p.id)) {
            selectedDetectiveTargets = selectedDetectiveTargets.filter((id) => id !== p.id);
          } else if (selectedDetectiveTargets.length < 2) {
            selectedDetectiveTargets = [...selectedDetectiveTargets, p.id];
          } else {
            selectedDetectiveTargets = [selectedDetectiveTargets[1], p.id];
          }
          renderPlayer();
        })
      );
    });
    area.appendChild(grid);

    upsertConfirmBar(area, confirmOpts);
  }

  function witchConfirmLabel(st, info) {
    const save = witchSaveChoice && info.victimName ? `Cứu ${info.victimName}` : '';
    const target = witchPoisonChoice ? nameOfPublic(st, witchPoisonChoice) : '';
    if (save && target) return `🧪 Xong lượt Phù Thủy — ${save} & đầu độc ${target}`;
    if (save) return `🧪 Xong lượt Phù Thủy — ${save}`;
    if (target) return `🧪 Xong lượt Phù Thủy — Đầu độc ${target}`;
    return '🧪 Xong lượt Phù Thủy — Nhắm mắt lại';
  }

  function renderWitchActionUI(area, st, myId, paused, canPatch) {
    const c = ctx();
    const info = (c && c.getWitchInfo()) || { victimId: null, victimName: null, canSave: false, canPoison: false };
    const candidates = info.canPoison
      ? (st.players || []).filter((p) => p.alive && p.id !== myId && !(witchSaveChoice && info.victimId === p.id))
      : [];

    const confirmOpts = {
      label: witchConfirmLabel(st, info),
      enabled: !paused,
      tone: 'primary',
      onConfirm: () => {
        triggerRoleFx('witch_potion', findConfirmBtn(area));
        safeSendAction({
          step: 'witch',
          role: 'witch',
          useSave: witchSaveChoice,
          poisonTargetId: witchPoisonChoice
        });
      }
    };

    if (canPatch) {
      const saveBtn = typeof area.querySelector === 'function' ? area.querySelector('.ww-witch-save-btn') : null;
      if (saveBtn) {
        saveBtn.disabled = Boolean(paused);
        saveBtn.className = `btn btn-block ww-witch-save-btn ${witchSaveChoice ? 'btn-success' : 'btn-secondary'}`;
        saveBtn.textContent = witchSaveChoice
          ? `✅ Đã chọn CỨU ${info.victimName}`
          : `💚 Dùng Bình Cứu ${info.victimName}`;
      }
      if (!info.canPoison || patchTargetGridInPlace(area, candidates.map((p) => ({
        id: p.id,
        label: `☠️ ${p.name}`,
        selected: witchPoisonChoice === p.id,
        disabled: paused
      })))) {
        upsertConfirmBar(area, confirmOpts);
        return;
      }
      area.innerHTML = '';
    }

    const h = document.createElement('h3');
    h.textContent = '🧪 Lượt Phù Thủy';
    area.appendChild(h);

    const saveBox = document.createElement('div');
    saveBox.className = 'result-banner';
    if (!info.canSave) {
      saveBox.textContent = '💚 Bình Cứu: Đã dùng hết ở đêm trước.';
    } else if (!info.victimName) {
      saveBox.textContent = '💚 Bình Cứu: Đêm nay không có nạn nhân nào bị Sói cắn.';
    } else {
      saveBox.innerHTML = `<p>Đêm nay <strong>${escapeHtml(info.victimName)}</strong> vừa bị Sói cắn!</p>`;
      const saveBtn = document.createElement('button');
      saveBtn.type = 'button';
      saveBtn.className = `btn btn-block ww-witch-save-btn ${witchSaveChoice ? 'btn-success' : 'btn-secondary'}`;
      saveBtn.disabled = Boolean(paused);
      saveBtn.textContent = witchSaveChoice
        ? `✅ Đã chọn CỨU ${info.victimName}`
        : `💚 Dùng Bình Cứu ${info.victimName}`;
      saveBtn.addEventListener('click', () => {
        if (paused) return;
        witchSaveChoice = !witchSaveChoice;
        if (witchSaveChoice && info.victimId && witchPoisonChoice === info.victimId) {
          witchPoisonChoice = null;
        }
        renderPlayer();
      });
      saveBox.appendChild(saveBtn);
    }
    area.appendChild(saveBox);

    const poisonWrap = document.createElement('div');
    if (!info.canPoison) {
      const pTxt = document.createElement('p');
      pTxt.className = 'hint';
      pTxt.textContent = '☠️ Bình Độc: Đã dùng hết ở đêm trước.';
      poisonWrap.appendChild(pTxt);
    } else {
      const pTxt = document.createElement('p');
      pTxt.textContent = '☠️ Bình Độc (tùy chọn): Chọn 1 người để đầu độc, hoặc bỏ qua:';
      poisonWrap.appendChild(pTxt);

      const grid = document.createElement('div');
      grid.className = 'target-grid';
      candidates.forEach((p) => {
        grid.appendChild(
          makeTargetBtn(p, `☠️ ${p.name}`, witchPoisonChoice === p.id, paused, () => {
            witchPoisonChoice = witchPoisonChoice === p.id ? null : p.id;
            renderPlayer();
          })
        );
      });
      poisonWrap.appendChild(grid);
    }
    area.appendChild(poisonWrap);

    upsertConfirmBar(area, confirmOpts);
  }

  // [G3] Pháp Sư Câm: chọn 1 người khóa miệng ngày mai (không trùng 2 đêm liên tiếp nếu còn lựa chọn khác)
  function renderSpellcasterActionUI(area, st, paused, canPatch) {
    const lastSilencedId = st.lastSilencedId || null;
    const alivePlayers = (st.players || []).filter((p) => p.alive);
    const hasOther = alivePlayers.some((p) => p.id !== lastSilencedId);
    alivePlayers.forEach((p) => {
      const blocked = Boolean(lastSilencedId && p.id === lastSilencedId && hasOther);
      if (blocked && selectedNightTarget === p.id) selectedNightTarget = null;
    });

    const confirmOpts = {
      label: selectedNightTarget
        ? `🤐 Khóa miệng ${nameOfPublic(st, selectedNightTarget)}`
        : '🤐 Chọn người để khóa miệng',
      enabled: Boolean(selectedNightTarget) && !paused,
      tone: 'primary',
      hint: '👆 Chạm tên người muốn khóa miệng ở phía trên',
      onConfirm: () => {
        triggerRoleFx('spell_silence', findConfirmBtn(area));
        safeSendAction({ step: 'spellcaster', role: 'spellcaster', targetId: selectedNightTarget });
      }
    };

    if (canPatch) {
      const entries = alivePlayers.map((p) => {
        const blocked = Boolean(lastSilencedId && p.id === lastSilencedId && hasOther);
        return {
          id: p.id,
          label: blocked ? `${p.name} (Vừa khóa đêm qua)` : `🤐 ${p.name}`,
          selected: selectedNightTarget === p.id,
          disabled: paused || blocked
        };
      });
      if (patchTargetGridInPlace(area, entries)) {
        const skipBtn = area.querySelector('.ww-skip-action-btn');
        if (skipBtn) skipBtn.disabled = Boolean(paused);
        upsertConfirmBar(area, confirmOpts);
        return;
      }
      area.innerHTML = '';
    }

    const h = document.createElement('h3');
    h.textContent = '🤐 Lượt Pháp Sư Câm: Chọn 1 người khóa miệng ngày mai';
    area.appendChild(h);

    const hint = document.createElement('p');
    hint.className = 'panel-desc';
    hint.textContent = 'Người bị khóa miệng sẽ không được nói chuyện hay ra dấu trong vòng thảo luận ngày mai:';
    area.appendChild(hint);

    const grid = document.createElement('div');
    grid.className = 'target-grid';
    alivePlayers.forEach((p) => {
      const blocked = Boolean(lastSilencedId && p.id === lastSilencedId && hasOther);
      grid.appendChild(
        makeTargetBtn(
          p,
          blocked ? `${p.name} (Vừa khóa đêm qua)` : `🤐 ${p.name}`,
          selectedNightTarget === p.id,
          paused || blocked,
          () => {
            selectedNightTarget = p.id;
            renderPlayer();
          }
        )
      );
    });
    area.appendChild(grid);

    const skipBtn = document.createElement('button');
    skipBtn.type = 'button';
    skipBtn.className = 'btn btn-secondary btn-block ww-skip-action-btn';
    skipBtn.disabled = Boolean(paused);
    skipBtn.textContent = 'Không khóa ai (Bỏ qua)';
    skipBtn.addEventListener('click', () => {
      if (paused) return;
      safeSendAction({ step: 'spellcaster', role: 'spellcaster', targetId: null });
    });
    area.appendChild(skipBtn);

    upsertConfirmBar(area, confirmOpts);
  }

  function renderSerialKillerActionUI(area, st, myId, paused, canPatch) {
    const candidates = (st.players || []).filter((p) => p.alive && p.id !== myId);
    const confirmOpts = {
      label: selectedNightTarget ? `🗡️ Ám sát ${nameOfPublic(st, selectedNightTarget)}` : '🗡️ Ám sát người này',
      enabled: Boolean(selectedNightTarget) && !paused,
      tone: 'danger',
      hint: '👆 Chạm tên mục tiêu ở phía trên',
      onConfirm: () => {
        triggerRoleFx('avenger_strike', findConfirmBtn(area));
        safeSendAction({ step: 'serial_killer', role: 'serial_killer', targetId: selectedNightTarget });
      }
    };

    if (canPatch) {
      const entries = candidates.map((p) => ({
        id: p.id,
        label: `🗡️ ${p.name}`,
        selected: selectedNightTarget === p.id,
        disabled: paused
      }));
      if (patchTargetGridInPlace(area, entries)) {
        upsertConfirmBar(area, confirmOpts);
        return;
      }
      area.innerHTML = '';
    }

    const h = document.createElement('h3');
    h.textContent = '🗡️ Lượt Sát Nhân Độc Hành: Chọn mục tiêu đêm nay';
    area.appendChild(h);

    const grid = document.createElement('div');
    grid.className = 'target-grid';
    candidates.forEach((p) => {
      grid.appendChild(
        makeTargetBtn(p, `🗡️ ${p.name}`, selectedNightTarget === p.id, paused, () => {
          selectedNightTarget = p.id;
          renderPlayer();
        })
      );
    });
    area.appendChild(grid);

    upsertConfirmBar(area, confirmOpts);
  }

  // ==================== INIT & REGISTRATION ====================
  function registerHooks() {
    const e = eng();
    if (e && typeof e.setRenderHooks === 'function') {
      e.setRenderHooks({ renderPlayer, bindPlayerEvents });
    }
  }

  function init() {
    registerHooks();
  }

  registerHooks();

  return {
    init,
    renderPlayer,
    bindPlayerEvents
  };
})(typeof window !== 'undefined' ? window : globalThis);

if (typeof window !== 'undefined') {
  window.WWPlayerUI = window.WWPlayerUI || globalThis.WWPlayerUI;
}
