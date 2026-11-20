// js/ww-host-ui.js — Giao diện Quản Trò (Laptop Host UI) Ma Sói v4.0
(typeof window !== 'undefined' ? window : globalThis).WWHostUI = (() => {
  'use strict';

  const _win = typeof window !== 'undefined' ? window : globalThis;

  const FALLBACK_ROLE_ORDER = [
    'werewolf',
    'alpha_wolf',
    'seer',
    'guard',
    'witch',
    'hunter',
    'cupid',
    'elder',
    'spellcaster',
    'detective',
    'cursed_villager',
    'avenger',
    'jester',
    'serial_killer',
    'villager'
  ];

  const NEW_V4_ROLES = new Set(['spellcaster', 'detective', 'cursed_villager', 'avenger']);

  const FALLBACK_PRESETS = [
    { id: 'classic', name: 'Cơ bản', icon: '🌙', badge: 'Chuẩn mực', minPlayers: 5, desc: 'Lối chơi kinh điển dễ làm quen.' },
    { id: 'love_drama', name: 'Drama Tình Ái', icon: '💘', badge: 'Cực lầy', minPlayers: 5, desc: 'Cặp đôi éo le, Thằng Ngố và Bán Sói.' },
    { id: 'blitz', name: 'Tốc chiến', icon: '⚡', badge: 'Nhanh gọn', minPlayers: 5, desc: 'Nhịp độ gắt, nhiều kỹ năng hạ gục.' },
    { id: 'mind_games', name: 'Hack não nhiều phe', icon: '🧠', badge: 'Cao thủ', minPlayers: 6, desc: 'Đủ 4 vai mới v4.0 + Phe Thứ 3.' }
  ];

  const FALLBACK_NIGHT_STEP_META = {
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

  const STORY_THEME_OPTIONS = [
    { value: 'classic', label: '📜 Cổ điển v3.3' },
    { value: 'foggy_village', label: '🌫️ Làng Sương Mù' },
    { value: 'drinking_banter', label: '🍻 Bàn Nhậu Gà Trống' },
    { value: 'mansion_mystery', label: '🕯️ Dinh Thự Bí Ẩn' }
  ];

  const LAST_WORDS_SECONDS_OPTIONS = [
    { value: 15, label: '15s' },
    { value: 25, label: '25s' },
    { value: 40, label: '40s' }
  ];

  let hostTickTimer = null;
  let lastHostSceneKey = '';
  let activePresetId = null;

  // ==================== SAFE GLOBAL ACCESSORS ====================
  function E() {
    return _win.WWEngine || null;
  }

  function ctx() {
    const e = E();
    return e && typeof e.getContext === 'function' ? e.getContext() : {};
  }

  function getState() {
    const c = ctx();
    if (typeof c.getState === 'function') return c.getState();
    const e = E();
    return e && typeof e.getState === 'function' ? e.getState() : null;
  }

  function getSession() {
    const c = ctx();
    return typeof c.getSession === 'function' ? c.getSession() : null;
  }

  function getIsHost() {
    const c = ctx();
    return typeof c.getIsHost === 'function' ? Boolean(c.getIsHost()) : true;
  }

  function GD() {
    return _win.GameData || {};
  }

  function AppUI() {
    return _win.AppUI || null;
  }

  function WWViews() {
    return _win.WWViews || null;
  }

  function Audio() {
    return _win.AudioEngine || null;
  }

  function SceneFX() {
    return _win.SceneFX || null;
  }

  function RoomNet() {
    return _win.RoomNetwork || _win.Network || null;
  }

  function elById(id) {
    if (typeof document === 'undefined' || typeof document.getElementById !== 'function') return null;
    return document.getElementById(id);
  }

  function qs(selector, root) {
    const base = root || (typeof document !== 'undefined' ? document : null);
    if (!base || typeof base.querySelector !== 'function') return null;
    return base.querySelector(selector);
  }

  function escapeHtml(str) {
    const c = ctx();
    if (typeof c.escapeHtml === 'function') return c.escapeHtml(str);
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function fmtClock(totalSeconds) {
    const c = ctx();
    if (typeof c.formatClock === 'function') return c.formatClock(totalSeconds);
    const s = Math.max(0, Math.ceil(Number(totalSeconds) || 0));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }

  function findPlayer(state, id) {
    const c = ctx();
    if (typeof c.byId === 'function') return c.byId(id);
    if (!state || !Array.isArray(state.players)) return undefined;
    return state.players.find((p) => p.id === id);
  }

  function getTally() {
    const e = E();
    const c = ctx();
    if (e && typeof e.getDayVoteTally === 'function') return e.getDayVoteTally();
    if (typeof c.getDayVoteTally === 'function') return c.getDayVoteTally();
    return { groups: {}, weights: {}, entries: [], topVotes: 0, isTie: false, leaderId: null };
  }

  function formatVoteCount(val) {
    const n = Math.round((Number(val) || 0) * 10) / 10;
    return Number.isInteger(n) ? String(n) : n.toFixed(1);
  }

  function updateSetting(key, val) {
    const e = E();
    if (!e || typeof e.changeSetting !== 'function') return;
    const patch = typeof key === 'object' && key !== null ? key : { [key]: val };
    e.changeSetting(patch);
  }

  function clearHostTickTimer() {
    if (hostTickTimer) {
      clearTimeout(hostTickTimer);
      hostTickTimer = null;
    }
  }

  function buildPlayerLabelEl(player, sizeClass = 'avatar-md', suffix = '') {
    const wrap = document.createElement('span');
    wrap.className = 'player-name-with-avatar';
    const ui = AppUI();
    if (ui && typeof ui.createAvatarEl === 'function') {
      wrap.appendChild(ui.createAvatarEl(player?.avatarId, sizeClass));
    }
    const txt = document.createElement('strong');
    txt.textContent = `${player?.name || '?'}${suffix}`;
    wrap.appendChild(txt);
    return wrap;
  }

  async function askConfirm(title, message) {
    const ui = AppUI();
    if (ui && typeof ui.confirmDialog === 'function') {
      return Boolean(await ui.confirmDialog(title, message));
    }
    return true;
  }

  // ==================== DYNAMIC v4.0 DOM INJECTION ====================
  function ensurePresetBar(configEl) {
    if (typeof document === 'undefined' || !configEl || !configEl.parentNode) return null;
    let bar = elById('ww-host-preset-bar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'ww-host-preset-bar';
      bar.className = 'preset-bar ww-preset-bar';
      bar.style.cssText =
        'display:flex;flex-direction:column;gap:0.45rem;margin-bottom:0.85rem;padding:0.65rem 0.75rem;border-radius:12px;background:rgba(139,92,246,0.08);border:1px solid rgba(139,92,246,0.22);';
      configEl.parentNode.insertBefore(bar, configEl);
    }
    return bar;
  }

  function ensureIngameDynamicUI() {
    if (typeof document === 'undefined') return;
    const gameEl = elById('ww-host-game');
    if (!gameEl) return;

    // [B3] Pause / Resume button in .ingame-actions
    const actionsEl = qs('.ingame-actions', gameEl);
    if (actionsEl && !elById('ww-host-pause-btn')) {
      const pauseBtn = document.createElement('button');
      pauseBtn.type = 'button';
      pauseBtn.id = 'ww-host-pause-btn';
      pauseBtn.className = 'btn btn-ghost btn-sm';
      pauseBtn.textContent = '⏸️ Tạm dừng';
      pauseBtn.onclick = () => {
        E()?.togglePause?.();
      };
      const anchor = elById('ww-host-reset-game') || elById('ww-host-open-log');
      if (anchor && anchor.parentNode === actionsEl) {
        actionsEl.insertBefore(pauseBtn, anchor);
      } else {
        actionsEl.appendChild(pauseBtn);
      }
    }

    // [B3] Pause banner above #ww-bot-announcer
    if (!elById('ww-host-pause-banner')) {
      const pauseBanner = document.createElement('div');
      pauseBanner.id = 'ww-host-pause-banner';
      pauseBanner.className = 'pause-banner';
      pauseBanner.hidden = true;
      pauseBanner.setAttribute('role', 'status');
      pauseBanner.style.cssText =
        'display:flex;align-items:center;justify-content:space-between;gap:0.75rem;flex-wrap:wrap;padding:0.75rem 1rem;margin-bottom:0.9rem;border-radius:12px;background:rgba(245,158,11,0.16);border:1px solid rgba(245,158,11,0.55);color:#fef3c7;font-weight:700;';

      const label = document.createElement('span');
      label.textContent = '⏸️ Ván đấu đang TẠM DỪNG — mọi đồng hồ và lượt thao tác đã đóng băng.';

      const resumeBtn = document.createElement('button');
      resumeBtn.type = 'button';
      resumeBtn.id = 'ww-host-resume-quick-btn';
      resumeBtn.className = 'btn btn-primary btn-sm';
      resumeBtn.textContent = '▶️ Tiếp tục';
      resumeBtn.onclick = () => {
        E()?.togglePause?.();
      };

      pauseBanner.append(label, resumeBtn);
      const announcerEl = elById('ww-bot-announcer');
      if (announcerEl && announcerEl.parentNode === gameEl) {
        gameEl.insertBefore(pauseBanner, announcerEl);
      } else {
        gameEl.prepend(pauseBanner);
      }
    }

    // [G3] Spellcaster silenced banner inside #ww-host-day-box
    const dayBox = elById('ww-host-day-box');
    if (dayBox && !elById('ww-host-silenced-banner')) {
      const banner = document.createElement('div');
      banner.id = 'ww-host-silenced-banner';
      banner.className = 'alert-box silenced-banner';
      banner.hidden = true;
      banner.style.cssText =
        'margin-bottom:0.9rem;padding:0.75rem 0.95rem;border-radius:10px;background:rgba(99,102,241,0.16);border:1px solid rgba(129,140,248,0.48);color:#e0e7ff;font-weight:700;';
      const resultBanner = elById('ww-host-night-result-banner');
      if (resultBanner && resultBanner.parentNode === dayBox) {
        resultBanner.insertAdjacentElement('afterend', banner);
      } else {
        dayBox.prepend(banner);
      }
    }

    // [G1] & [G2] Sheriff box & Last Words box inside .phase-panel
    const stagePanel = qs('.host-stage-panel', gameEl) || qs('.phase-panel', gameEl);
    if (stagePanel) {
      const overBox = elById('ww-host-gameover-box');

      if (!elById('ww-host-sheriff-box')) {
        const sheriffBox = document.createElement('div');
        sheriffBox.id = 'ww-host-sheriff-box';
        sheriffBox.className = 'sheriff-host-box';
        sheriffBox.hidden = true;
        if (overBox && overBox.parentNode === stagePanel) {
          stagePanel.insertBefore(sheriffBox, overBox);
        } else {
          stagePanel.appendChild(sheriffBox);
        }
      }

      if (!elById('ww-host-lastwords-box')) {
        const lwBox = document.createElement('div');
        lwBox.id = 'ww-host-lastwords-box';
        lwBox.className = 'lastwords-host-box';
        lwBox.hidden = true;
        lwBox.style.cssText =
          'padding:1rem;border-radius:12px;background:rgba(244,63,94,0.08);border:1px solid rgba(244,63,94,0.32);display:flex;flex-direction:column;gap:0.75rem;';

        const title = document.createElement('h2');
        title.textContent = '🗣️ Lời Trăng Trối';
        title.style.margin = '0';

        const victimsEl = document.createElement('p');
        victimsEl.id = 'ww-host-lastwords-victims';
        victimsEl.className = 'result-banner';
        victimsEl.style.margin = '0';

        const timerEl = document.createElement('p');
        timerEl.id = 'ww-host-lastwords-timer';
        timerEl.className = 'day-timer';
        timerEl.style.cssText = 'margin:0;font-size:1.15rem;font-weight:800;';

        const skipBtn = document.createElement('button');
        skipBtn.type = 'button';
        skipBtn.id = 'ww-host-skip-lastwords';
        skipBtn.className = 'btn btn-primary btn-block';
        skipBtn.textContent = '⏭️ Kết thúc Lời Trăng Trối (Đi tiếp)';
        skipBtn.onclick = () => {
          E()?.skipLastWords?.();
        };

        lwBox.append(title, victimsEl, timerEl, skipBtn);
        if (overBox && overBox.parentNode === stagePanel) {
          stagePanel.insertBefore(lwBox, overBox);
        } else {
          stagePanel.appendChild(lwBox);
        }
      }
    }
  }

  // ==================== SHARE BOX & EVENTS ====================
  function renderHostShareBox() {
    const rn = RoomNet();
    const shareUrl = rn && typeof rn.buildShareUrl === 'function' ? rn.buildShareUrl() : '';
    const codeEl = elById('ww-host-code');
    if (codeEl) codeEl.textContent = (rn && rn.ROOM_LABEL) || '----';
    const urlEl = elById('ww-host-share-url');
    if (urlEl) urlEl.textContent = shareUrl;
    const qrEl = elById('ww-host-qr');
    if (qrEl) AppUI()?.renderQrCode?.(qrEl, shareUrl);
  }

  function bindHostEvents() {
    ensureIngameDynamicUI();
    const shareUrl = () => {
      const rn = RoomNet();
      return rn && typeof rn.buildShareUrl === 'function' ? rn.buildShareUrl() : '';
    };

    const copyBtn = elById('ww-host-copy-link');
    if (copyBtn) {
      copyBtn.onclick = () => {
        AppUI()?.copyText?.(shareUrl(), 'Đã copy link mở app Hội Quán!');
      };
    }

    const openWwQrZoom = () => {
      const rn = RoomNet();
      AppUI()?.openQrZoomModal?.('🐺 Quét QR để mở app Hội Quán', (rn && rn.ROOM_LABEL) || '', shareUrl());
    };
    const wwQrEl = elById('ww-host-qr');
    const wwQrBtn = elById('ww-qr-zoom-btn');
    if (wwQrEl) wwQrEl.onclick = openWwQrZoom;
    if (wwQrBtn) wwQrBtn.onclick = openWwQrZoom;

    const testVoiceBtn = elById('ww-host-test-voice');
    if (testVoiceBtn) {
      testVoiceBtn.onclick = () => {
        const audio = Audio();
        audio?.unlock?.();
        audio?.speak?.('Xin chào cả hội! Bot Quản Trò đã sẵn sàng dẫn dắt ván Ma Sói hôm nay.');
      };
    }

    const replayBotVoice = () => {
      const e = E();
      if (e && typeof e.requestReplayBot === 'function') {
        e.requestReplayBot();
        return;
      }
      const st = getState();
      const audio = Audio();
      audio?.unlock?.();
      if (st && st.botText) audio?.speak?.(st.botText);
    };
    const hostReplayBtn = elById('ww-host-replay-voice');
    if (hostReplayBtn) hostReplayBtn.onclick = replayBotVoice;
    const ingameReplayBtn = elById('ww-replay-bot');
    if (ingameReplayBtn) ingameReplayBtn.onclick = replayBotVoice;

    const leaveHost = async () => {
      const st = getState();
      if (st && st.phase !== 'LOBBY') {
        const ok = await askConfirm(
          'Thoát phòng Ma Sói?',
          'Thoát sẽ KẾT THÚC ván Ma Sói đang chơi của cả hội. Chắc chắn chứ?'
        );
        if (!ok) return;
      }
      clearHostTickTimer();
      lastHostSceneKey = '';
      E()?.discardHostSnapshot?.();
      AppUI()?.clearSession?.();
      E()?.cleanup?.();
      AppUI()?.goHome?.();
    };

    const leaveLobbyBtn = elById('ww-host-leave');
    if (leaveLobbyBtn) leaveLobbyBtn.onclick = leaveHost;
    const leaveIngameBtn = elById('ww-ingame-leave');
    if (leaveIngameBtn) leaveIngameBtn.onclick = leaveHost;

    const soundBtn = elById('ww-ingame-sound');
    if (soundBtn) {
      soundBtn.onclick = () => {
        AppUI()?.openSoundSettings?.();
      };
    }

    const addDemoBtn = elById('ww-host-add-demo');
    if (addDemoBtn) {
      addDemoBtn.onclick = () => {
        E()?.addDemoPlayer?.();
      };
    }

    const autoRolesBtn = elById('ww-host-auto-roles');
    if (autoRolesBtn) {
      autoRolesBtn.onclick = () => {
        activePresetId = null;
        E()?.autoFillRoles?.();
      };
    }

    const startBtn = elById('ww-host-start-btn');
    if (startBtn) {
      startBtn.onclick = () => {
        E()?.startNewGame?.();
      };
    }

    const skipStepBtn = elById('ww-host-skip-step');
    if (skipStepBtn) {
      skipStepBtn.onclick = () => {
        E()?.skipNightStep?.();
      };
    }

    const skipHunterBtn = elById('ww-host-skip-hunter');
    if (skipHunterBtn) {
      skipHunterBtn.onclick = () => {
        const e = E();
        if (e && typeof e.skipRevenge === 'function') e.skipRevenge();
        else e?.skipHunterShot?.();
      };
    }

    const finalizeBtn = elById('ww-host-finalize-vote');
    if (finalizeBtn) {
      finalizeBtn.onclick = async () => {
        const st = getState();
        if (!st || st.phase !== 'DAY') return;
        const tally = getTally();
        if (!tally.leaderId) return;
        if (tally.isTie || tally.leaderId === '__skip__') {
          const ok = await askConfirm(
            'Hòa phiếu / Bỏ phiếu trắng?',
            'Kết quả hiện tại không có người bị treo cổ. Chuyển sang Đêm tiếp theo?'
          );
          if (ok) E()?.skipLynchToNight?.();
          return;
        }
        const leader = findPlayer(st, tally.leaderId);
        if (!leader) return;
        const ok = await askConfirm(
          'Chốt treo cổ theo phiếu bầu?',
          `Treo cổ ${leader.name} (${formatVoteCount(tally.topVotes)} phiếu)?`
        );
        if (ok) {
          const e = E();
          if (e && typeof e.lynchPlayer === 'function') e.lynchPlayer(leader.id);
          else e?.finalizeVoteNow?.();
        }
      };
    }

    const noLynchBtn = elById('ww-host-no-lynch');
    if (noLynchBtn) {
      noLynchBtn.onclick = async () => {
        const ok = await askConfirm(
          'Xác nhận hòa phiếu?',
          'Không treo cổ ai hôm nay và chuyển sang đêm tiếp theo?'
        );
        if (ok) E()?.skipLynchToNight?.();
      };
    }

    const playAgainBtn = elById('ww-host-play-again');
    if (playAgainBtn) {
      playAgainBtn.onclick = () => {
        lastHostSceneKey = '';
        E()?.returnToLobby?.();
      };
    }

    const openLogBtn = elById('ww-host-open-log');
    if (openLogBtn) {
      openLogBtn.onclick = () => {
        const st = getState();
        if (!st) return;
        const over = st.phase === 'GAME_OVER';
        WWViews()?.openLogDialog?.({
          title: '📜 Nhật ký ván đấu',
          entries: st.logs,
          showSecret: over,
          note: over
            ? 'Ván đã kết thúc — mọi hành động bí mật được hiện ra.'
            : 'Màn hình này cả bàn đều nhìn thấy nên chỉ hiện sự kiện công khai. Hành động bí mật ban đêm sẽ hiện sau khi ván kết thúc.'
        });
      };
    }

    const lastGameBtn = elById('ww-host-last-game-btn');
    if (lastGameBtn) {
      lastGameBtn.onclick = () => {
        const c = ctx();
        let last = null;
        try {
          last = typeof c.readLastGame === 'function' ? c.readLastGame() : JSON.parse(c.lsGet?.('hq_ww_last_game') || 'null');
        } catch (_) {}
        if (!last) return;
        const rolesMap = GD().WEREWOLF_ROLES || {};
        const winTitles = c.WIN_TITLE || {};
        const when = last.finishedAt ? new Date(last.finishedAt).toLocaleString('vi-VN') : '';
        const summary = (last.players || [])
          .map((p) => `${p.name}: ${(rolesMap[p.roleId] || {}).name || '?'}`)
          .join(' • ');
        WWViews()?.openLogDialog?.({
          title: `📜 Ván trước${when ? ` — ${when}` : ''}`,
          entries: last.logs || [],
          showSecret: true,
          note: `${winTitles[last.winner] || 'Ván đã kết thúc'}  |  ${summary}`
        });
      };
    }

    const voteCancelBtn = elById('ww-host-vote-cancel');
    if (voteCancelBtn) {
      voteCancelBtn.onclick = () => {
        const st = getState();
        if (!st || st.phase !== 'DAY' || !st.voteLock) return;
        E()?.cancelVoteLock?.();
      };
    }

    const resetBtn = elById('ww-host-reset-game');
    if (resetBtn) {
      resetBtn.onclick = async () => {
        const ok = await askConfirm(
          'Reset ván?',
          'Reset ván đang chơi và đưa cả hội về phòng chờ? Người chơi vẫn ở trong phòng.'
        );
        if (ok) {
          lastHostSceneKey = '';
          E()?.returnToLobby?.();
        }
      };
    }
  }

  // ==================== SCENE FX ====================
  function runHostScene(state) {
    if (!state) return;
    const key = `${state.phase}:${state.nightNumber}`;
    if (key === lastHostSceneKey) return;
    lastHostSceneKey = key;

    const audio = Audio();
    const fx = SceneFX();

    if (state.phase === 'ROLE_REVEAL') {
      audio?.playStart?.();
      fx?.playPhase?.({
        mode: 'role',
        icon: '🃏',
        kicker: 'CHIA VAI BÍ MẬT',
        title: 'VAI TRÒ CỦA BẠN',
        sub: 'Nhấn & giữ thẻ trên điện thoại để xem — thả tay thẻ tự úp lại.',
        duration: 2300
      });
    } else if (state.phase === 'NIGHT') {
      audio?.playNightAmbience?.();
      audio?.startNightAmbience?.();
      fx?.playPhase?.({
        mode: 'night',
        icon: '🌙',
        kicker: `MÀN ĐÊM ${state.nightNumber}`,
        title: `ĐÊM ${state.nightNumber}`,
        sub: 'Trời tối rồi, xin mời cả làng nhắm mắt lại.',
        duration: 2200
      });
    } else if (state.phase === 'DAY') {
      audio?.stopNightAmbience?.();
      fx?.playPhase?.({
        mode: 'day',
        icon: '☀️',
        kicker: `BÌNH MINH NGÀY ${state.nightNumber}`,
        title: 'TRỜI SÁNG',
        sub: state.lastDawnSummary || 'Cả làng mở mắt và bắt đầu tranh luận.',
        duration: 2400
      });
    } else if (state.phase === 'HUNTER_REVENGE') {
      audio?.stopNightAmbience?.();
      fx?.flash?.('rgba(244, 63, 94, 0.3)');
      fx?.shake?.();
    } else if (state.phase === 'SHERIFF_ELECTION' || state.phase === 'SHERIFF_TRANSFER' || state.phase === 'LAST_WORDS') {
      audio?.stopNightAmbience?.();
    } else if (state.phase === 'GAME_OVER') {
      audio?.stopNightAmbience?.();
      fx?.celebrate?.();
      fx?.flash?.('rgba(251, 191, 36, 0.24)');
    }
  }

  // ==================== LOBBY RENDERING ====================
  function renderPresetBar(configEl) {
    const bar = ensurePresetBar(configEl);
    if (!bar) return;

    const presets = Array.isArray(GD().ROLE_PRESETS) && GD().ROLE_PRESETS.length > 0
      ? GD().ROLE_PRESETS
      : FALLBACK_PRESETS;

    bar.innerHTML = '';

    const head = document.createElement('div');
    head.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:0.5rem;flex-wrap:wrap;';
    const title = document.createElement('strong');
    title.textContent = '⚡ Bộ cài đặt nhanh (Presets)';
    title.style.fontSize = '0.88rem';
    const sub = document.createElement('small');
    sub.textContent = '1 chạm áp dụng đội hình theo số người';
    sub.style.opacity = '0.72';
    head.append(title, sub);

    const grid = document.createElement('div');
    grid.className = 'preset-grid';
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:0.45rem;';

    presets.forEach((preset) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      const isActive = activePresetId === preset.id;
      btn.className = `btn btn-sm ${isActive ? 'btn-primary' : 'btn-secondary'}`;
      btn.title = preset.desc || preset.name;
      btn.style.cssText =
        'display:flex;flex-direction:column;align-items:flex-start;gap:0.15rem;padding:0.48rem 0.65rem;text-align:left;height:auto;';

      const topLine = document.createElement('span');
      topLine.style.cssText = 'display:flex;align-items:center;gap:0.35rem;font-weight:700;width:100%;justify-content:space-between;';
      const nameSpan = document.createElement('span');
      nameSpan.textContent = `${preset.icon || '🎲'} ${preset.name}`;
      const badgeSpan = document.createElement('span');
      badgeSpan.textContent = preset.badge || '';
      badgeSpan.style.cssText = 'font-size:0.68rem;opacity:0.85;padding:0.05rem 0.35rem;border-radius:999px;background:rgba(255,255,255,0.12);';
      topLine.append(nameSpan, badgeSpan);

      const descSpan = document.createElement('small');
      descSpan.textContent = preset.desc || '';
      descSpan.style.cssText = 'font-size:0.72rem;opacity:0.78;line-height:1.25;font-weight:400;';

      btn.append(topLine, descSpan);
      btn.addEventListener('click', () => {
        activePresetId = preset.id;
        E()?.applyRolePreset?.(preset.id);
        AppUI()?.showToast?.(`Đã áp dụng bộ "${preset.icon || ''} ${preset.name}"!`);
      });

      grid.appendChild(btn);
    });

    bar.append(head, grid);
  }

  function createCheckboxSettingRow({ id, label, hint, checked, onChange }) {
    const wrap = document.createElement('div');
    wrap.className = 'setting-row';

    const row = document.createElement('label');
    row.style.cssText = 'display:flex;align-items:center;gap:0.55rem;cursor:pointer;font-weight:700;font-size:0.95rem;';

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    if (id) cb.id = id;
    cb.checked = Boolean(checked);
    cb.style.cssText = 'width:1.05rem;height:1.05rem;accent-color:#8b5cf6;cursor:pointer;';
    cb.addEventListener('change', () => onChange(cb.checked));

    const span = document.createElement('span');
    span.textContent = label;
    row.append(cb, span);
    wrap.appendChild(row);

    if (hint) {
      const small = document.createElement('small');
      small.textContent = hint;
      wrap.appendChild(small);
    }
    return wrap;
  }

  function createSelectSettingRow({ id, label, hint, value, options, disabled, hidden, onChange }) {
    const wrap = document.createElement('div');
    wrap.className = 'setting-row';
    wrap.hidden = Boolean(hidden);

    const title = document.createElement('strong');
    title.textContent = label;

    const select = document.createElement('select');
    if (id) select.id = id;
    select.disabled = Boolean(disabled);
    select.style.cssText =
      'padding:0.48rem 0.65rem;border-radius:10px;background:rgba(15,23,42,0.85);color:#f8fafc;border:1px solid rgba(148,163,184,0.28);font:inherit;font-size:0.9rem;';

    options.forEach((opt) => {
      const o = document.createElement('option');
      o.value = String(opt.value);
      o.textContent = opt.label;
      if (String(opt.value) === String(value)) o.selected = true;
      select.appendChild(o);
    });

    select.addEventListener('change', () => onChange(select.value));
    wrap.append(title, select);

    if (hint) {
      const small = document.createElement('small');
      small.textContent = hint;
      wrap.appendChild(small);
    }
    return wrap;
  }

  function renderHostSettings(state) {
    const box = elById('ww-host-settings');
    if (!box) return;
    const c = ctx();
    const defSettings = c.DEFAULT_SETTINGS || {
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
    const cur = typeof c.normalizeSettings === 'function'
      ? c.normalizeSettings(state.settings)
      : { ...defSettings, ...(state.settings || {}) };
    const voteOptions = Array.isArray(c.VOTE_TIME_OPTIONS) ? c.VOTE_TIME_OPTIONS : [0, 60, 90, 120, 180, 300];
    const nightPaceCfg = c.NIGHT_PACE_CONFIG || {
      fast: { label: 'Nhanh' },
      normal: { label: 'Vừa' },
      slow: { label: 'Chậm' }
    };

    const voteLabel = (sec) => {
      if (!sec) return 'Không giới hạn';
      if (sec % 60 === 0) return `${sec / 60} phút`;
      return `${Math.floor(sec / 60)},5 phút`;
    };

    const rows = [
      {
        title: '⏰ Giới hạn thời gian bỏ phiếu ban ngày',
        hint: 'Hết giờ, Bot tự chốt theo phiếu hiện có (ai chưa vote coi như bỏ qua). Mặc định: không giới hạn.',
        options: voteOptions.map((v) => ({ label: voteLabel(v), on: cur.voteTimeLimit === v, key: 'voteTimeLimit', val: v }))
      },
      {
        title: '🤝 Khi hòa phiếu',
        hint: 'Mặc định: bỏ phiếu lại một lần, hòa nữa thì không ai bị treo cổ.',
        options: [
          { label: 'Bỏ phiếu lại 1 lần', on: cur.tieRule === 'revote', key: 'tieRule', val: 'revote' },
          { label: 'Không ai bị treo cổ', on: cur.tieRule === 'none', key: 'tieRule', val: 'none' }
        ]
      },
      {
        title: '⚖️ Chốt phiếu',
        hint: 'Mặc định: khi mọi người đã vote, Bot đếm ngược 8 giây rồi tự chốt.',
        options: [
          { label: 'Tự chốt khi vote xong', on: cur.autoVoteLock, key: 'autoVoteLock', val: true },
          { label: 'Quản Trò tự bấm chốt', on: !cur.autoVoteLock, key: 'autoVoteLock', val: false }
        ]
      },
      {
        title: '🌙 Nhịp đêm',
        hint: 'Bot chờ ngẫu nhiên một lúc ở mỗi lượt, kể cả khi vai đó đã chết — để không ai đoán ra ai còn sống.',
        options: Object.entries(nightPaceCfg).map(([key, cfg]) => ({
          label: cfg.label,
          on: cur.nightPace === key,
          key: 'nightPace',
          val: key
        }))
      }
    ];

    box.innerHTML = '';
    rows.forEach((row) => {
      const wrap = document.createElement('div');
      wrap.className = 'setting-row';
      const title = document.createElement('strong');
      title.textContent = row.title;
      const seg = document.createElement('div');
      seg.className = 'seg';
      seg.setAttribute('role', 'group');
      seg.setAttribute('aria-label', row.title);
      row.options.forEach((opt) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = `seg-btn${opt.on ? ' is-on' : ''}`;
        b.textContent = opt.label;
        b.setAttribute('aria-pressed', String(opt.on));
        b.addEventListener('click', () => updateSetting(opt.key, opt.val));
        seg.appendChild(b);
      });
      const hint = document.createElement('small');
      hint.textContent = row.hint;
      wrap.append(title, seg, hint);
      box.appendChild(wrap);
    });

    // v4.0 Expansion settings (all default OFF / classic v3.3)
    box.appendChild(
      createCheckboxSettingRow({
        id: 'ww-set-sheriff',
        label: '👑 Bầu Trưởng Làng (phiếu bầu trọng số 1.5x)',
        hint: 'Đầu Ngày 1 cả làng bầu 1 Trưởng Làng nắm 1,5 phiếu. Nếu Trưởng Làng chết có thể trao lại huy hiệu.',
        checked: cur.sheriffEnabled,
        onChange: (checked) => updateSetting('sheriffEnabled', checked)
      })
    );

    box.appendChild(
      createCheckboxSettingRow({
        id: 'ww-set-lastwords',
        label: '🗣️ Lời Trăng Trối trước khi chia tay',
        hint: 'Người vừa bị loại có thời gian phát biểu trăng trối trước khi chuyển pha.',
        checked: cur.lastWordsEnabled,
        onChange: (checked) => updateSetting('lastWordsEnabled', checked)
      })
    );

    box.appendChild(
      createSelectSettingRow({
        id: 'ww-set-lastwords-sec',
        label: '⏱️ Thời lượng Lời Trăng Trối',
        hint: 'Chỉ áp dụng khi bật Lời Trăng Trối.',
        value: cur.lastWordsSeconds || 25,
        options: LAST_WORDS_SECONDS_OPTIONS,
        disabled: !cur.lastWordsEnabled,
        hidden: !cur.lastWordsEnabled,
        onChange: (val) => updateSetting('lastWordsSeconds', Number(val) || 25)
      })
    );

    box.appendChild(
      createSelectSettingRow({
        id: 'ww-set-story-theme',
        label: '📖 Chủ đề lời dẫn (Story Theme)',
        hint: 'Chọn phong cách kể chuyện cho Bot Quản Trò.',
        value: cur.storyTheme || 'classic',
        options: STORY_THEME_OPTIONS,
        disabled: false,
        hidden: false,
        onChange: (val) => updateSetting('storyTheme', val)
      })
    );

    box.appendChild(
      createCheckboxSettingRow({
        id: 'ww-set-dynamic-events',
        label: '🎭 Lời dẫn biến thiên theo diễn biến thật',
        hint: 'Bot tự chèn bình luận theo tình huống (đêm yên bình liên tiếp, cặp đôi, chung cuộc...).',
        checked: cur.dynamicEvents,
        onChange: (checked) => updateSetting('dynamicEvents', checked)
      })
    );

    box.appendChild(
      createCheckboxSettingRow({
        id: 'ww-set-campaign-mode',
        label: '📖 Đêm Liên Hoàn (nhớ kết quả ván trước)',
        hint: 'Ghi nhớ phe thắng và nạn nhân ván trước để nối mạch truyện xuyên suốt buổi chơi.',
        checked: cur.campaignMode,
        onChange: (checked) => updateSetting('campaignMode', checked)
      })
    );

    const resetBtn = elById('ww-host-settings-reset');
    if (resetBtn) {
      resetBtn.onclick = () => E()?.resetSettings?.();
      const isDefault = Object.keys(defSettings).every((k) => cur[k] === defSettings[k]);
      resetBtn.hidden = isDefault;
    }
  }

  function renderHostLobby(state) {
    const session = getSession();
    const c = ctx();
    const players = Array.isArray(state.players) ? state.players : [];
    const count = players.length;
    const readyCount = players.filter((p) => p.ready).length;

    const countEl = elById('ww-host-player-count');
    if (countEl) countEl.textContent = String(count);
    const readyEl = elById('ww-host-ready-summary');
    if (readyEl) readyEl.textContent = `${readyCount}/${count} sẵn sàng`;

    const listEl = elById('ww-host-player-list');
    if (listEl) {
      listEl.innerHTML = '';
      if (count === 0) {
        const empty = document.createElement('li');
        empty.className = 'player-item';
        empty.textContent = 'Chưa có ai vào phòng. Hãy quét QR hoặc nhập mã phòng trên điện thoại.';
        listEl.appendChild(empty);
      } else {
        players.forEach((p) => {
          const li = document.createElement('li');
          li.className = 'player-item pop-in';
          const left = buildPlayerLabelEl(p, 'avatar-md');

          const right = document.createElement('div');
          right.style.cssText = 'display:flex;gap:0.45rem;align-items:center;';

          const badge = document.createElement('span');
          badge.className = `pill ${p.ready ? 'pill-ready' : 'pill-wait'}`;
          badge.textContent = p.ready ? 'Sẵn sàng' : 'Đang chờ';

          const kickBtn = document.createElement('button');
          kickBtn.type = 'button';
          kickBtn.className = 'btn btn-ghost btn-sm';
          kickBtn.textContent = '✕';
          kickBtn.setAttribute('aria-label', `Xóa ${p.name}`);
          kickBtn.addEventListener('click', () => {
            E()?.kickPlayer?.(p.id);
          });

          if (!p.isDemo && session && typeof session.isClientOnline === 'function' && !session.isClientOnline(p.id)) {
            li.classList.add('is-offline');
            const off = document.createElement('span');
            off.className = 'pill pill-wait';
            off.textContent = '🔴 Mất kết nối';
            right.appendChild(off);
          }

          right.append(badge, kickBtn);
          li.append(left, right);
          listEl.appendChild(li);
        });
      }
    }

    const configEl = elById('ww-host-role-config');
    let totalRoles = 0;
    const rolesCfg = state.rolesConfig || {};

    if (configEl) {
      renderPresetBar(configEl);
      configEl.innerHTML = '';

      const gd = GD();
      const rolesMap = gd.WEREWOLF_ROLES || {};
      const order = Array.isArray(gd.ROLE_ORDER) && gd.ROLE_ORDER.length > 0 ? gd.ROLE_ORDER : FALLBACK_ROLE_ORDER;

      order.forEach((roleId) => {
        const role = rolesMap[roleId];
        if (!role) return;
        const val = Number(rolesCfg[roleId]) || 0;
        totalRoles += val;

        const row = document.createElement('div');
        row.className = 'role-config-row';

        const info = document.createElement('div');
        info.className = 'role-config-info';
        const icon = document.createElement('span');
        icon.textContent = role.icon;
        icon.setAttribute('aria-hidden', 'true');

        const txt = document.createElement('div');
        const isNew = Boolean(role.isNewV4 || NEW_V4_ROLES.has(roleId));
        const newBadge = isNew
          ? ' <span class="badge-new" style="display:inline-block;margin-left:0.25rem;padding:0.06rem 0.38rem;font-size:0.65rem;font-weight:800;border-radius:999px;background:rgba(34,211,238,0.18);color:#67e8f9;border:1px solid rgba(34,211,238,0.36);vertical-align:middle;">Mới</span>'
          : '';
        txt.innerHTML = `<strong>${escapeHtml(role.name)}${newBadge}</strong><small>${escapeHtml(role.teamName)}</small>`;
        info.append(icon, txt);

        const stepper = document.createElement('div');
        stepper.className = 'stepper';
        const minus = document.createElement('button');
        minus.type = 'button';
        minus.textContent = '−';
        minus.setAttribute('aria-label', `Giảm ${role.name}`);
        minus.addEventListener('click', () => {
          activePresetId = null;
          E()?.updateRoleCount?.(roleId, -1);
        });

        const num = document.createElement('span');
        num.textContent = String(val);

        const plus = document.createElement('button');
        plus.type = 'button';
        plus.textContent = '+';
        plus.setAttribute('aria-label', `Tăng ${role.name}`);
        plus.addEventListener('click', () => {
          activePresetId = null;
          E()?.updateRoleCount?.(roleId, 1);
        });

        stepper.append(minus, num, plus);
        row.append(info, stepper);
        configEl.appendChild(row);
      });
    } else if (typeof c.getRoleCountTotal === 'function') {
      totalRoles = c.getRoleCountTotal(rolesCfg);
    }

    renderHostSettings(state);

    const totalNote = elById('ww-host-role-total');
    const wolves = (Number(rolesCfg.werewolf) || 0) + (Number(rolesCfg.alpha_wolf) || 0);
    const villagersSide = totalRoles - wolves;
    const canStart =
      count >= 5 && readyCount === count && totalRoles === count && wolves >= 1 && villagersSide > wolves;

    if (totalNote) {
      if (count < 5) {
        totalNote.textContent = `Tổng vai trò: ${totalRoles} (Cần tối thiểu 5 người chơi)`;
      } else if (totalRoles !== count) {
        totalNote.textContent = `⚠️ Tổng vai trò (${totalRoles}) chưa khớp số người chơi (${count})!`;
      } else if (wolves < 1 || villagersSide <= wolves) {
        totalNote.textContent = `⚠️ Cần ít nhất 1 Ma Sói và phe Dân nhiều hơn Ma Sói!`;
      } else if (readyCount < count) {
        totalNote.textContent = `✅ Đã khớp ${totalRoles} vai trò — Đang chờ ${count - readyCount} người ấn Sẵn sàng.`;
      } else {
        totalNote.textContent = `🎉 Đủ ${count} người sẵn sàng — Có thể bắt đầu ngay!`;
      }
    }

    const startBtn = elById('ww-host-start-btn');
    if (startBtn) startBtn.disabled = !canStart;

    const lastBtn = elById('ww-host-last-game-btn');
    if (lastBtn) {
      const hasLast = typeof c.readLastGame === 'function' ? Boolean(c.readLastGame()) : Boolean(c.lsGet?.('hq_ww_last_game'));
      lastBtn.hidden = !hasLast;
    }
  }

  // ==================== COUNTDOWN SYNC (DAY, VOTE LOCK, LAST WORDS, PAUSE) ====================
  function remainingMsOf(obj, deadlineField, state) {
    if (!obj) return 0;
    if (state && state.isPaused && typeof obj.pausedRemainingMs === 'number') {
      return Math.max(0, obj.pausedRemainingMs);
    }
    return Math.max(0, (obj[deadlineField] || 0) - Date.now());
  }

  function hostCountdownText(state) {
    const lock = state.voteLock;
    const remMs = remainingMsOf(lock, 'endsAt', state);
    const left = Math.max(0, Math.ceil(remMs / 1000));
    const pauseTag = state.isPaused ? ' [ĐANG TẠM DỪNG]' : '';
    if (lock.kind === 'lynch') {
      const t = findPlayer(state, lock.targetId);
      return `⏳ Chốt treo cổ ${t ? t.name : ''} sau ${left} giây…${pauseTag}`;
    }
    return `⏳ Không ai bị treo cổ — sang đêm sau ${left} giây…${pauseTag}`;
  }

  function hostDeadlineText(state) {
    const dd = state && state.dayDeadline;
    if (!dd) return '';
    const remMs = remainingMsOf(dd, 'endsAt', state);
    const pauseTag = state.isPaused ? ' [ĐANG TẠM DỪNG]' : '';
    return `⏰ Hết giờ bỏ phiếu sau ${fmtClock(remMs / 1000)}${state.revoteUsed ? ' (vòng bỏ phiếu lại)' : ''}${pauseTag}`;
  }

  function lastWordsTimerText(state) {
    const lw = state && state.lastWords;
    if (!lw) return '';
    const remMs = remainingMsOf(lw, 'endsAt', state);
    const pauseTag = state.isPaused ? ' [ĐANG TẠM DỪNG]' : '';
    return `⏳ Thời gian trăng trối còn: ${fmtClock(remMs / 1000)}${pauseTag}`;
  }

  function syncHostCountdown() {
    const state = getState();
    const el = elById('ww-host-vote-countdown');
    const cancel = elById('ww-host-vote-cancel');
    const dayEl = elById('ww-host-day-timer');
    const lwTimerEl = elById('ww-host-lastwords-timer');

    const paused = Boolean(state && state.isPaused);
    const inDay = Boolean(state && state.phase === 'DAY');
    const active = Boolean(inDay && state.voteLock);
    const deadlineActive = Boolean(inDay && state.dayDeadline && state.flow && state.flow.key === 'day');
    const lwActive = Boolean(state && state.phase === 'LAST_WORDS' && state.lastWords);

    if (dayEl) {
      dayEl.hidden = !deadlineActive;
      if (deadlineActive) {
        const remMs = remainingMsOf(state.dayDeadline, 'endsAt', state);
        dayEl.textContent = hostDeadlineText(state);
        dayEl.classList.toggle('is-urgent', remMs <= 30000);
      }
    }

    if (el) {
      if (active) {
        el.hidden = false;
        el.textContent = hostCountdownText(state);
        if (cancel) cancel.hidden = false;
      } else {
        const lockPaused = Boolean(inDay && state.voteLockPaused);
        el.hidden = !lockPaused;
        if (lockPaused) el.textContent = '⏸ Đã tạm dừng đếm ngược — có người đổi phiếu thì chạy lại, hoặc ấn Chốt bên dưới.';
        if (cancel) cancel.hidden = true;
      }
    }

    if (lwTimerEl) {
      lwTimerEl.hidden = !lwActive;
      if (lwActive) {
        const lwRemMs = remainingMsOf(state.lastWords, 'endsAt', state);
        lwTimerEl.textContent = lastWordsTimerText(state);
        lwTimerEl.classList.toggle('is-urgent', lwRemMs <= 5000);
      }
    }

    if (!paused && (active || deadlineActive || lwActive)) {
      if (!hostTickTimer) {
        const tick = () => {
          hostTickTimer = null;
          const cur = getState();
          if (!cur || !getIsHost() || cur.isPaused) return;
          const curInDay = cur.phase === 'DAY';
          const lockNow = Boolean(curInDay && cur.voteLock);
          const ddNow = Boolean(curInDay && cur.dayDeadline && cur.flow && cur.flow.key === 'day');
          const lwNow = Boolean(cur.phase === 'LAST_WORDS' && cur.lastWords);
          if (!lockNow && !ddNow && !lwNow) return;
          if (lockNow && el) el.textContent = hostCountdownText(cur);
          if (ddNow && dayEl) {
            const remMs = remainingMsOf(cur.dayDeadline, 'endsAt', cur);
            dayEl.textContent = hostDeadlineText(cur);
            dayEl.classList.toggle('is-urgent', remMs <= 30000);
          }
          if (lwNow && lwTimerEl) {
            const lwRemMs = remainingMsOf(cur.lastWords, 'endsAt', cur);
            lwTimerEl.textContent = lastWordsTimerText(cur);
            lwTimerEl.classList.toggle('is-urgent', lwRemMs <= 5000);
          }
          hostTickTimer = setTimeout(tick, 250);
        };
        hostTickTimer = setTimeout(tick, 250);
      }
    } else {
      clearHostTickTimer();
    }
  }

  // ==================== ACTIVE GAME PHASE RENDERERS ====================
  function renderSheriffBox(state, sheriffBox) {
    if (!sheriffBox) return;
    sheriffBox.innerHTML = '';

    const players = Array.isArray(state.players) ? state.players : [];
    const alivePlayers = players.filter((p) => p.alive);

    if (state.phase === 'SHERIFF_ELECTION') {
      const h = document.createElement('h2');
      h.textContent = '👑 Bầu Trưởng Làng (1,5 phiếu)';

      const desc = document.createElement('p');
      desc.className = 'panel-desc';
      const votedCount = Object.keys(state.sheriffVotes || {}).length;
      desc.textContent = `Người chơi chọn ứng viên trên điện thoại (${votedCount}/${alivePlayers.length} đã bầu). Quản Trò cũng có thể chỉ định trực tiếp hoặc bỏ qua.`;

      const counts = {};
      let skipCount = 0;
      Object.entries(state.sheriffVotes || {}).forEach(([vId, tId]) => {
        const voter = findPlayer(state, vId);
        if (!voter || !voter.alive) return;
        if (tId === '__skip__') skipCount += 1;
        else counts[tId] = (counts[tId] || 0) + 1;
      });

      const list = document.createElement('ul');
      list.className = 'vote-tally-list';

      alivePlayers.forEach((p) => {
        const li = document.createElement('li');
        li.className = 'vote-tally-item';
        li.style.alignItems = 'center';

        const left = document.createElement('div');
        left.style.cssText = 'display:flex;align-items:center;gap:0.55rem;flex-wrap:wrap;';
        left.appendChild(buildPlayerLabelEl(p, 'avatar-md'));

        const votePill = document.createElement('span');
        votePill.className = 'pill pill-ready';
        votePill.textContent = `${counts[p.id] || 0} phiếu`;
        left.appendChild(votePill);

        const assignBtn = document.createElement('button');
        assignBtn.type = 'button';
        assignBtn.className = 'btn btn-primary btn-sm';
        assignBtn.textContent = '👑 Chọn làm Trưởng Làng';
        assignBtn.addEventListener('click', () => {
          E()?.assignSheriffDirect?.(p.id);
        });

        li.append(left, assignBtn);
        list.appendChild(li);
      });

      sheriffBox.append(h, desc, list);

      if (skipCount > 0) {
        const skipNote = document.createElement('p');
        skipNote.className = 'panel-desc';
        skipNote.textContent = `🏳️ Bỏ phiếu trắng: ${skipCount} phiếu`;
        sheriffBox.appendChild(skipNote);
      }

      const skipBtn = document.createElement('button');
      skipBtn.type = 'button';
      skipBtn.className = 'btn btn-secondary btn-block';
      skipBtn.textContent = '⏭️ Bỏ qua — Không bầu Trưởng Làng';
      skipBtn.addEventListener('click', () => {
        E()?.skipSheriffElection?.();
      });
      sheriffBox.appendChild(skipBtn);
    } else if (state.phase === 'SHERIFF_TRANSFER') {
      const oldSheriff = state.sheriffId ? findPlayer(state, state.sheriffId) : null;
      const h = document.createElement('h2');
      h.textContent = '👑 Trao lại Huy hiệu Trưởng Làng';

      const desc = document.createElement('p');
      desc.className = 'result-banner';
      desc.textContent = `Trưởng Làng ${oldSheriff ? oldSheriff.name : ''} đã tử nạn! Chờ Trưởng Làng chọn người kế nhiệm trên điện thoại, hoặc Quản Trò hỗ trợ chọn bên dưới:`;

      const grid = document.createElement('div');
      grid.className = 'lynch-grid';
      alivePlayers.forEach((p) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn btn-secondary target-btn-avatar';
        btn.style.cssText = 'display:flex;align-items:center;gap:0.5rem;justify-content:flex-start;padding:0.55rem 0.8rem;';
        const ui = AppUI();
        if (ui && typeof ui.createAvatarEl === 'function') {
          btn.appendChild(ui.createAvatarEl(p.avatarId, 'avatar-md'));
        }
        const span = document.createElement('span');
        span.textContent = `👑 Trao cho ${p.name}`;
        btn.appendChild(span);
        btn.addEventListener('click', () => {
          E()?.resolveSheriffTransfer?.(p.id);
        });
        grid.appendChild(btn);
      });

      const tearBtn = document.createElement('button');
      tearBtn.type = 'button';
      tearBtn.className = 'btn btn-danger-outline btn-block';
      tearBtn.textContent = '🗑️ Xé bỏ huy hiệu (Không trao cho ai)';
      tearBtn.addEventListener('click', () => {
        E()?.resolveSheriffTransfer?.(null);
      });

      sheriffBox.append(h, desc, grid, tearBtn);
    }
  }

  function renderLastWordsBox(state) {
    const victimsEl = elById('ww-host-lastwords-victims');
    if (victimsEl) {
      const names = state.lastWords && Array.isArray(state.lastWords.names) ? state.lastWords.names : [];
      victimsEl.textContent = names.length > 0
        ? `🗣️ Người sắp chia tay: ${names.join(', ')}`
        : '🗣️ Đang phát biểu Lời Trăng Trối...';
    }
  }

  function patchVoteTallyList(tallyEl, state, tally, maxTallyVotes) {
    if (!tallyEl || typeof document === 'undefined') return;
    const entries = Array.isArray(tally?.entries) ? tally.entries : [];

    if (entries.length === 0) {
      const curChildren = Array.from(tallyEl.children || []);
      const existingEmpty = curChildren.find((n) => n?.dataset?.empty === '1');
      if (existingEmpty && curChildren.length === 1) return;
      tallyEl.innerHTML = '';
      const empty = document.createElement('li');
      empty.className = 'vote-tally-item';
      empty.dataset.empty = '1';
      empty.textContent = 'Chưa có ai bấm Vote trên điện thoại (có thể bấm Vote trực tiếp hoặc vote miệng ở ngoài).';
      tallyEl.appendChild(empty);
      return;
    }

    const sheriffEnabled = Boolean(state.settings && state.settings.sheriffEnabled);
    const existingById = new Map();
    Array.from(tallyEl.children || []).forEach((child) => {
      const tid = child?.dataset?.targetId;
      if (tid) {
        existingById.set(tid, child);
      } else if (child.parentNode === tallyEl) {
        tallyEl.removeChild(child);
      }
    });

    const wantedIds = new Set(entries.map(([tId]) => String(tId)));
    existingById.forEach((node, tid) => {
      if (!wantedIds.has(tid) && node.parentNode === tallyEl) {
        tallyEl.removeChild(node);
        existingById.delete(tid);
      }
    });

    entries.forEach(([tId, voters], idx) => {
      const key = String(tId);
      let li = existingById.get(key);
      let labelWrap;
      let voterWrap;
      let bar;
      let barFill;
      let countPill;

      if (!li) {
        li = document.createElement('li');
        li.className = 'vote-tally-item pop-in';
        li.dataset.targetId = key;

        const leftCol = document.createElement('div');
        labelWrap = document.createElement('div');
        labelWrap.className = 'tally-target-label';

        voterWrap = document.createElement('div');
        voterWrap.className = 'voter-avatars-mini';

        bar = document.createElement('div');
        bar.className = 'vote-bar';
        barFill = document.createElement('span');
        bar.appendChild(barFill);

        leftCol.append(labelWrap, voterWrap, bar);

        countPill = document.createElement('span');
        countPill.className = 'pill pill-ready tally-count-pill';

        li.append(leftCol, countPill);
      } else {
        li.classList.remove('pop-in');
        labelWrap = qs('.tally-target-label', li);
        voterWrap = qs('.voter-avatars-mini', li);
        bar = qs('.vote-bar', li);
        barFill = bar ? qs('span', bar) : null;
        countPill = qs('.tally-count-pill', li);
      }

      if (labelWrap) {
        if (tId === '__skip__') {
          const sig = '__skip__';
          if (labelWrap.dataset.labelSig !== sig) {
            labelWrap.dataset.labelSig = sig;
            labelWrap.innerHTML = '';
            const skipLabel = document.createElement('strong');
            skipLabel.textContent = '🏳️ Bỏ phiếu trắng';
            labelWrap.appendChild(skipLabel);
          }
        } else {
          const targetPlayer = findPlayer(state, tId);
          const sig = `${targetPlayer?.name || '?'}|${targetPlayer?.avatarId || ''}`;
          if (labelWrap.dataset.labelSig !== sig) {
            labelWrap.dataset.labelSig = sig;
            labelWrap.innerHTML = '';
            labelWrap.appendChild(buildPlayerLabelEl(targetPlayer, 'avatar-md'));
          }
        }
      }

      if (voterWrap) {
        const voterItems = voters.map((v) => {
          const isSheriffVoter = Boolean(
            v.isSheriff ||
              (v.weight && v.weight > 1) ||
              (sheriffEnabled && state.sheriffId && v.id === state.sheriffId)
          );
          return { v, isSheriffVoter };
        });
        const voterSig = voterItems
          .map(({ v, isSheriffVoter }) => `${v.id}:${v.name}:${v.avatarId || ''}:${isSheriffVoter ? 1 : 0}`)
          .join('|');
        if (voterWrap.dataset.voterSig !== voterSig) {
          voterWrap.dataset.voterSig = voterSig;
          voterWrap.innerHTML = '';
          const ui = AppUI();
          voterItems.forEach(({ v, isSheriffVoter }) => {
            const pill = document.createElement('span');
            pill.className = `voter-pill-mini${isSheriffVoter ? ' is-sheriff' : ''}`;
            if (isSheriffVoter) pill.title = 'Trưởng Làng (1.5 phiếu)';
            if (ui && typeof ui.createAvatarEl === 'function') {
              pill.appendChild(ui.createAvatarEl(v.avatarId, 'avatar-sm'));
            }
            const vName = document.createElement('span');
            vName.textContent = isSheriffVoter ? `${v.name} ⭐` : v.name;
            pill.appendChild(vName);
            voterWrap.appendChild(pill);
          });
        }
      }

      const weightedTotal =
        tally.weights && typeof tally.weights[tId] === 'number' ? tally.weights[tId] : voters.length;
      const pct = Math.max(7, Math.round((weightedTotal / maxTallyVotes) * 100));

      if (bar) {
        bar.classList.toggle('is-leading', tId === tally.leaderId && !tally.isTie);
      }
      if (barFill) {
        barFill.style.width = `${pct}%`;
      }
      if (countPill) {
        countPill.textContent = `${formatVoteCount(weightedTotal)} phiếu`;
      }

      const currentAtIdx = tallyEl.children ? tallyEl.children[idx] : null;
      if (currentAtIdx !== li) {
        tallyEl.insertBefore(li, currentAtIdx || null);
      }
    });
  }

  function renderHostActiveGame(state) {
    ensureIngameDynamicUI();
    const c = ctx();
    const players = Array.isArray(state.players) ? state.players : [];
    const aliveCount = players.filter((p) => p.alive).length;
    const isPaused = Boolean(state.isPaused);
    const canPause = state.phase !== 'LOBBY' && state.phase !== 'GAME_OVER';

    const phaseMap = {
      ROLE_REVEAL: 'CHIA VAI TRÒ',
      NIGHT: `ĐÊM ${state.nightNumber}`,
      HUNTER_REVENGE: state.pendingRevengeRole === 'avenger' ? 'KẺ BÁO THÙ RA TAY' : 'THỢ SĂN RA TAY',
      SHERIFF_ELECTION: 'BẦU TRƯỞNG LÀNG',
      SHERIFF_TRANSFER: 'TRAO HUY HIỆU',
      LAST_WORDS: 'LỜI TRĂNG TRỐI',
      DAY: `NGÀY ${state.nightNumber}`,
      GAME_OVER: 'KẾT THÚC'
    };

    const phaseBadge = elById('ww-host-phase-badge');
    if (phaseBadge) phaseBadge.textContent = phaseMap[state.phase] || state.phase;
    const aliveBadge = elById('ww-host-alive-count');
    if (aliveBadge) aliveBadge.textContent = `Còn sống: ${aliveCount}/${players.length}`;
    const botTextEl = elById('ww-host-bot-text');
    if (botTextEl) botTextEl.textContent = state.botText || '';

    // [B3] Update Pause button & banner
    const pauseBtn = elById('ww-host-pause-btn');
    if (pauseBtn) {
      pauseBtn.hidden = !canPause;
      pauseBtn.textContent = isPaused ? '▶️ Tiếp tục' : '⏸️ Tạm dừng';
      pauseBtn.classList.toggle('is-paused', isPaused);
      pauseBtn.classList.toggle('btn-primary', isPaused);
      pauseBtn.classList.toggle('btn-ghost', !isPaused);
    }
    const pauseBanner = elById('ww-host-pause-banner');
    if (pauseBanner) {
      pauseBanner.hidden = !(canPause && isPaused);
    }

    // Board & Game Over layout
    const isOver = state.phase === 'GAME_OVER';
    const boardEl = elById('ww-host-board');
    const gameEl = elById('ww-host-game');
    if (gameEl) gameEl.classList.toggle('is-gameover', isOver);
    if (boardEl) {
      boardEl.hidden = isOver;
      if (!isOver) {
        const vm = E()?.buildHostBoardVm?.() || c.buildHostBoardVm?.();
        if (vm) WWViews()?.hostBoard?.(boardEl, vm);
      }
    }

    syncHostCountdown();

    const nightBox = elById('ww-host-night-box');
    const dayBox = elById('ww-host-day-box');
    const overBox = elById('ww-host-gameover-box');
    const hunterWait = elById('ww-host-hunter-wait');
    const sheriffBox = elById('ww-host-sheriff-box');
    const lastWordsBox = elById('ww-host-lastwords-box');

    if (nightBox) nightBox.hidden = !(state.phase === 'NIGHT' || state.phase === 'ROLE_REVEAL');
    if (dayBox) dayBox.hidden = !(state.phase === 'DAY' || state.phase === 'HUNTER_REVENGE');
    if (hunterWait) hunterWait.hidden = state.phase !== 'HUNTER_REVENGE';
    if (sheriffBox) sheriffBox.hidden = !(state.phase === 'SHERIFF_ELECTION' || state.phase === 'SHERIFF_TRANSFER');
    if (lastWordsBox) lastWordsBox.hidden = state.phase !== 'LAST_WORDS';
    if (overBox) overBox.hidden = state.phase !== 'GAME_OVER';

    // 1. Night Steps (all 9 roles via NIGHT_STEP_META)
    if (state.phase === 'NIGHT' || state.phase === 'ROLE_REVEAL') {
      const stepsEl = elById('ww-host-night-steps');
      if (stepsEl) {
        stepsEl.innerHTML = '';
        const order = E()?.getActiveNightOrder?.() || c.getActiveNightOrder?.() || [];
        const stepMeta = c.NIGHT_STEP_META || FALLBACK_NIGHT_STEP_META;
        const curIdx = state.nightStep ? order.indexOf(state.nightStep) : -1;

        order.forEach((stepKey, idx) => {
          const li = document.createElement('li');
          li.className = 'night-step-item';
          if (state.phase === 'NIGHT') {
            if (idx < curIdx) li.classList.add('done');
            else if (idx === curIdx) li.classList.add('active');
          }
          const meta = stepMeta[stepKey] || FALLBACK_NIGHT_STEP_META[stepKey];
          const labelSpan = document.createElement('span');
          labelSpan.textContent = meta ? meta.label : stepKey;

          const statusSpan = document.createElement('span');
          statusSpan.textContent =
            state.phase === 'NIGHT' && idx === curIdx ? 'Đang chờ...' : idx < curIdx ? 'Xong' : '';

          li.append(labelSpan, statusSpan);
          stepsEl.appendChild(li);
        });
      }
    }

    // 2. Day & Revenge (Silenced banner, Hunter/Avenger wait, Weighted Vote Tally, Manual Lynch)
    if (state.phase === 'DAY' || state.phase === 'HUNTER_REVENGE') {
      const resultBanner = elById('ww-host-night-result-banner');
      if (resultBanner) resultBanner.textContent = state.lastDawnSummary || '';

      // [G3] Spellcaster silenced banner
      const silencedBanner = elById('ww-host-silenced-banner');
      if (silencedBanner) {
        if (state.silencedId) {
          const silencedTarget = findPlayer(state, state.silencedId);
          silencedBanner.hidden = false;
          silencedBanner.textContent = `🔇 Hôm nay ${silencedTarget ? silencedTarget.name : '?'} bị Pháp Sư Câm khóa miệng — KHÔNG ĐƯỢC LÊN TIẾNG!`;
        } else {
          silencedBanner.hidden = true;
          silencedBanner.textContent = '';
        }
      }

      // [G3] Dynamic Hunter / Avenger revenge prompt
      if (state.phase === 'HUNTER_REVENGE' && hunterWait) {
        const actor = state.pendingHunterId ? findPlayer(state, state.pendingHunterId) : null;
        const actorTag = actor ? ` (${actor.name})` : '';
        const titleEl = qs('strong', hunterWait);
        const descEl = qs('p', hunterWait);
        if (state.pendingRevengeRole === 'avenger') {
          if (titleEl) titleEl.textContent = `⚔️ Đang chờ Kẻ Báo Thù${actorTag} chọn người kéo theo!`;
          if (descEl) descEl.textContent = 'Kẻ Báo Thù chọn 1 người còn sống trên điện thoại của mình để kéo theo xuống mồ (hoặc bấm bỏ qua bên dưới).';
        } else {
          if (titleEl) titleEl.textContent = `🏹 Đang chờ Thợ Săn${actorTag} xác nhận phát súng!`;
          if (descEl) descEl.textContent = 'Thợ Săn hô bắn ở ngoài rồi tự bấm chọn người bị bắn trên điện thoại của mình (hoặc bấm bỏ qua bên dưới).';
        }
      }

      // Live Phone Vote Tally (with Sheriff 1.5x weighted votes) — [H4] DOM Patch theo data-target-id
      const tally = getTally();
      const votedTotal = Object.keys(state.dayVotes || {}).length;
      const voteProgress = elById('ww-host-vote-progress');
      if (voteProgress) voteProgress.textContent = `${votedTotal}/${aliveCount} đã vote`;
      const maxTallyVotes = Math.max(1, tally.topVotes || 1);

      const tallyEl = elById('ww-host-vote-tally');
      if (tallyEl) {
        patchVoteTallyList(tallyEl, state, tally, maxTallyVotes);
      }

      const finalizeBtn = elById('ww-host-finalize-vote');
      if (finalizeBtn) {
        finalizeBtn.hidden = !(state.phase === 'DAY' && tally.entries && tally.entries.length > 0);
        if (!finalizeBtn.hidden) {
          if (tally.isTie || tally.leaderId === '__skip__') {
            finalizeBtn.textContent = '🤝 Chốt theo phiếu: Hòa / Không treo cổ ai';
          } else {
            const leader = findPlayer(state, tally.leaderId);
            finalizeBtn.textContent = `⚖️ Chốt treo cổ ${leader ? leader.name : ''} (${formatVoteCount(tally.topVotes)} phiếu)`;
          }
        }
      }

      // Direct manual lynch buttons
      const lynchGrid = elById('ww-host-lynch-grid');
      const canLynch = state.phase === 'DAY';
      if (lynchGrid) {
        lynchGrid.innerHTML = '';
        players
          .filter((p) => p.alive)
          .forEach((p) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'lynch-btn target-btn-avatar';
            btn.disabled = !canLynch;
            const ui = AppUI();
            if (ui && typeof ui.createAvatarEl === 'function') {
              btn.appendChild(ui.createAvatarEl(p.avatarId, 'avatar-md'));
            }
            const span = document.createElement('span');
            span.textContent = `Treo cổ ${p.name}`;
            btn.appendChild(span);
            btn.addEventListener('click', async () => {
              const ok = await askConfirm(
                'Xác nhận treo cổ?',
                `Xác nhận cả làng đã vote treo cổ ${p.name}?`
              );
              if (ok) E()?.lynchPlayer?.(p.id);
            });
            lynchGrid.appendChild(btn);
          });
      }
      const noLynchBtn = elById('ww-host-no-lynch');
      if (noLynchBtn) noLynchBtn.disabled = !canLynch;
    }

    // 3. Sheriff Election / Transfer [G1]
    if (state.phase === 'SHERIFF_ELECTION' || state.phase === 'SHERIFF_TRANSFER') {
      renderSheriffBox(state, sheriffBox);
    }

    // 4. Last Words [G2]
    if (state.phase === 'LAST_WORDS') {
      renderLastWordsBox(state);
    }

    // 5. Game Over
    if (state.phase === 'GAME_OVER') {
      const winTitles = c.WIN_TITLE || {};
      const banner = elById('ww-host-winner-banner');
      if (banner) {
        banner.textContent = winTitles[state.winner] || '🏆 KẾT THÚC!';
        banner.hidden = true;
      }
      const revealEl = elById('ww-host-reveal-list');
      if (revealEl) {
        revealEl.innerHTML = '';
        revealEl.hidden = true;
      }
      const revealHead = elById('ww-host-reveal-heading');
      if (revealHead) revealHead.hidden = true;
      const logHead = elById('ww-host-gameover-log-heading');
      if (logHead) logHead.hidden = false;

      const goBoardEl = elById('ww-host-gameover-board');
      const goVm = E()?.buildGameOverVm?.(state, null) || c.buildGameOverVm?.(state, null);
      if (goBoardEl && goVm) WWViews()?.gameOverBoard?.(goBoardEl, goVm);

      const goLogEl = elById('ww-host-gameover-log');
      if (goLogEl) WWViews()?.timeline?.(goLogEl, state.logs || [], { showSecret: true });
    }
  }

  // ==================== PUBLIC ENTRYPOINTS ====================
  function renderHost() {
    const state = getState();
    if (!state) return;
    runHostScene(state);
    const isActive = state.phase !== 'LOBBY';
    const phaseMode = state.phase === 'NIGHT' || state.phase === 'ROLE_REVEAL' ? 'NIGHT' : 'DAY';
    AppUI()?.setActiveGameMode?.(isActive, phaseMode);

    const lobbyEl = elById('ww-host-lobby');
    const gameEl = elById('ww-host-game');

    if (state.phase === 'LOBBY') {
      if (lobbyEl) lobbyEl.hidden = false;
      if (gameEl) gameEl.hidden = true;
      clearHostTickTimer();
      renderHostLobby(state);
    } else {
      if (lobbyEl) lobbyEl.hidden = true;
      if (gameEl) gameEl.hidden = false;
      renderHostActiveGame(state);
    }
  }

  function registerHooks() {
    const e = E();
    if (e && typeof e.setRenderHooks === 'function') {
      e.setRenderHooks({
        renderHost,
        renderHostShareBox,
        bindHostEvents,
        syncHostCountdown
      });
    }
  }

  function init() {
    lastHostSceneKey = '';
    clearHostTickTimer();
    registerHooks();
  }

  // Tự động đăng ký hook khi nạp file
  registerHooks();

  return {
    init,
    renderHost,
    renderHostShareBox,
    bindHostEvents,
    syncHostCountdown
  };
})();

if (typeof window !== 'undefined') {
  window.WWHostUI = window.WWHostUI || globalThis.WWHostUI;
}
