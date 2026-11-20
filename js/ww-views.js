/* ww-views.js — pure view components for Ma Sói (window.WWViews). Data in -> DOM out. */
window.WWViews = (() => {
  'use strict';

  /* ---------- helpers ---------- */
  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = String(text);
    return n;
  }
  function clear(c) {
    if (!c) return;
    if (c._wwvTimer) {
      clearInterval(c._wwvTimer);
      c._wwvTimer = null;
    }
    c.innerHTML = '';
  }
  function avatar(avatarId, size) {
    try {
      const ui = window.AppUI;
      if (ui && typeof ui.createAvatarEl === 'function') {
        const a = ui.createAvatarEl(avatarId, size || 'avatar-md');
        if (a) return a;
      }
    } catch (e) { /* fall through */ }
    return el('span', 'wwv-avatar-fallback ' + (size || 'avatar-md'), '🙂');
  }
  function roles() {
    return (window.GameData && window.GameData.WEREWOLF_ROLES) || {};
  }
  function role(id) {
    const r = roles();
    return r[id] || r.villager || { id: 'villager', name: 'Dân Làng', icon: '🧑‍🌾', team: 'villager', teamName: 'Phe Dân Làng', bgImage: '', themeColor: '#eab308' };
  }
  function strongText(parent, before, bold, after) {
    parent.appendChild(document.createTextNode(before));
    parent.appendChild(el('strong', '', bold));
    if (after) parent.appendChild(document.createTextNode(after));
  }
  function arr(a) { return Array.isArray(a) ? a : []; }

  /* ---------- 1. wolfVotePanel ---------- */
  function wolfVotePanel(container, vm, handlers) {
    clear(container);
    if (!container) return;
    vm = vm || {};
    const onPick = (handlers && handlers.onPick) || function () {};
    const wolfCount = Math.max(1, Number(vm.wolfCount) || 1);
    const candidates = arr(vm.candidates);
    const root = el('div', 'wwv-wolf');

    const head = el('div', 'wwv-wolf-head');
    head.appendChild(el('h3', 'wwv-wolf-title', '🐺 Bầy Sói chọn con mồi'));
    head.appendChild(el('p', 'wwv-wolf-sub', wolfCount > 1
      ? 'Cả bầy chạm cùng 1 người để chốt — nút đầy màu là đã thống nhất.'
      : 'Chạm vào người bạn muốn cắn đêm nay.'));
    root.appendChild(head);

    const lock = vm.lock && vm.lock.targetId ? vm.lock : null;
    const byId = {};
    candidates.forEach((c) => { byId[c.id] = c; });

    if (lock) {
      const target = byId[lock.targetId];
      const banner = el('div', 'wwv-lock-banner');
      banner.setAttribute('role', 'status');
      const txt = el('div', 'wwv-lock-text');
      const countEl = el('strong', 'wwv-lock-count');
      txt.appendChild(document.createTextNode('✅ Cả bầy đã thống nhất cắn '));
      txt.appendChild(el('strong', '', target ? target.name : 'con mồi'));
      txt.appendChild(document.createTextNode(' — '));
      const tail = el('span', 'wwv-lock-tail');
      tail.appendChild(document.createTextNode('tự chốt sau '));
      tail.appendChild(countEl);
      tail.appendChild(document.createTextNode('…'));
      txt.appendChild(tail);
      banner.appendChild(txt);
      root.appendChild(banner);

      const endAt = Date.now() + Math.max(0, Number(lock.remainingMs) || 0);
      const tick = () => {
        const left = Math.max(0, endAt - Date.now());
        if (left <= 0) {
          tail.textContent = 'Đang chốt…';
          banner.classList.add('wwv-is-final');
          if (container._wwvTimer) { clearInterval(container._wwvTimer); container._wwvTimer = null; }
        } else {
          countEl.textContent = String(Math.ceil(left / 1000));
        }
      };
      tick();
      if (endAt > Date.now()) container._wwvTimer = setInterval(tick, 200);
    }

    if (!candidates.length) {
      root.appendChild(el('div', 'wwv-empty-box', 'Không còn con mồi hợp lệ.'));
      container.appendChild(root);
      return;
    }

    // Cảnh báo người yêu đặt TRÊN lưới nút để Sói thấy ngay, không phải cuộn xuống.
    const loverCand = candidates.find((c) => c && c.isMyLover);
    if (loverCand) {
      const warn = el('div', 'wwv-lover-warn');
      strongText(warn, '💘 ', loverCand.name, ' là người yêu của bạn — nếu họ chết, bạn cũng chết theo!');
      root.appendChild(warn);
    }

    const grid = el('div', 'wwv-wolf-grid' + (candidates.length > 6 ? ' wwv-wolf-grid-many' : ''));
    candidates.forEach((c) => {
      const pickedBy = arr(c.pickedBy);
      const n = pickedBy.length;
      const frac = Math.min(1, n / wolfCount);
      const mine = vm.myPickId === c.id || pickedBy.some((p) => p && p.isMe);
      const full = n >= wolfCount && n > 0;
      const btn = el('button', 'wwv-wolf-btn');
      btn.type = 'button';
      if (mine) btn.classList.add('wwv-is-mine');
      if (full) btn.classList.add('wwv-is-full');
      if (lock && lock.targetId === c.id) btn.classList.add('wwv-is-locked');
      if (n > 0) btn.classList.add('wwv-has-picks');
      btn.style.setProperty('--wwv-fill', (frac * 100).toFixed(1) + '%');
      btn.style.setProperty('--wwv-segs', String(wolfCount));
      btn.setAttribute('aria-pressed', mine ? 'true' : 'false');
      btn.setAttribute('aria-label', c.name + (n ? ', ' + n + '/' + wolfCount + ' sói đã chọn' : ''));
      btn.dataset.id = c.id;

      const fill = el('span', 'wwv-wolf-fill');
      fill.setAttribute('aria-hidden', 'true');
      btn.appendChild(fill);
      if (wolfCount > 1) {
        const segs = el('span', 'wwv-wolf-segs');
        segs.setAttribute('aria-hidden', 'true');
        for (let i = 1; i < wolfCount; i++) {
          const d = el('i', 'wwv-seg-line');
          d.style.left = ((i / wolfCount) * 100).toFixed(2) + '%';
          segs.appendChild(d);
        }
        btn.appendChild(segs);
      }

      const body = el('span', 'wwv-wolf-body');
      body.appendChild(avatar(c.avatarId, 'avatar-lg'));
      body.appendChild(el('span', 'wwv-wolf-name', c.name));
      const picks = el('span', 'wwv-wolf-picks');
      pickedBy.forEach((p) => {
        const chip = el('span', 'wwv-mini' + (p.isMe ? ' wwv-mini-me' : ''));
        chip.title = p.isMe ? 'Bạn' : p.name;
        chip.appendChild(avatar(p.avatarId, 'avatar-sm'));
        picks.appendChild(chip);
      });
      if (mine) picks.appendChild(el('span', 'wwv-me-tag', 'Bạn'));
      body.appendChild(picks);
      btn.appendChild(body);

      btn.appendChild(el('span', 'wwv-wolf-count', n + '/' + wolfCount));
      if (c.isMyLover) {
        btn.classList.add('wwv-is-lover');
        btn.appendChild(el('span', 'wwv-lover-ribbon', '💘'));
      }
      btn.addEventListener('click', () => onPick(c.id));
      grid.appendChild(btn);
    });
    root.appendChild(grid);
    container.appendChild(root);
  }

  /* ---------- 2. secretExtras ---------- */
  function secretExtras(container, vm) {
    clear(container);
    if (!container) return;
    vm = vm || {};
    const teammates = arr(vm.teammates);
    const lover = vm.lover || null;
    const converted = !!vm.converted;
    if (!lover && !converted && !teammates.length) {
      container.hidden = true;
      return;
    }
    container.hidden = false;
    const root = el('div', 'wwv-extras');

    if (lover) {
      const p = el('div', 'wwv-extra wwv-extra-lover');
      p.appendChild(el('div', 'wwv-extra-title', '💘 BẠN ĐÃ ĐƯỢC SE DUYÊN'));
      const row = el('div', 'wwv-extra-row');
      row.appendChild(avatar(lover.avatarId, 'avatar-lg'));
      const info = el('div', 'wwv-extra-info');
      info.appendChild(el('div', 'wwv-extra-name', lover.name));
      info.appendChild(el('div', 'wwv-extra-role', (lover.roleIcon || '') + ' ' + (lover.roleName || '')));
      row.appendChild(info);
      p.appendChild(row);
      if (lover.alive === false) {
        p.appendChild(el('div', 'wwv-extra-rule wwv-extra-dead', '💔 Người yêu đã mất'));
      } else {
        p.appendChild(el('div', 'wwv-extra-rule', lover.sameSide
          ? 'Hai bạn cùng phe. Một người chết, người kia chết theo.'
          : 'Hai bạn KHÁC PHE → thành phe Cặp Đôi: chỉ thắng khi 2 bạn là 2 người sống sót cuối cùng. Một người chết, người kia chết theo.'));
      }
      root.appendChild(p);
    }

    if (converted) {
      const p = el('div', 'wwv-extra wwv-extra-cursed');
      p.appendChild(el('div', 'wwv-extra-title', '🩸 Bạn đã bị Sói Đầu Đàn NGUYỀN — từ giờ bạn là MA SÓI!'));
      root.appendChild(p);
    }

    if (teammates.length) {
      const p = el('div', 'wwv-extra wwv-extra-pack');
      p.appendChild(el('div', 'wwv-extra-title', '🐺 Đồng bọn Sói'));
      const list = el('div', 'wwv-chip-row');
      teammates.forEach((t) => {
        const chip = el('span', 'wwv-chip' + (t.alive === false ? ' wwv-chip-dead' : ''));
        chip.appendChild(avatar(t.avatarId, 'avatar-sm'));
        chip.appendChild(el('span', 'wwv-chip-name', t.name));
        if (t.alive === false) chip.appendChild(el('span', 'wwv-chip-skull', '💀'));
        list.appendChild(chip);
      });
      p.appendChild(list);
      root.appendChild(p);
    }
    container.appendChild(root);
  }

  /* ---------- 3. confirmBar ---------- */
  function confirmBar(container, opts) {
    opts = opts || {};
    const tone = ['primary', 'danger', 'success'].indexOf(opts.tone) >= 0 ? opts.tone : 'primary';
    const bar = el('div', 'sticky-action-bar wwv-confirm-bar');
    if (!opts.enabled) {
      bar.appendChild(el('div', 'wwv-confirm-hint', opts.hint || '👆 Hãy chọn ở phía trên trước'));
    }
    const btn = el('button', 'btn btn-lg btn-block btn-' + tone, opts.label || 'Xác nhận');
    btn.type = 'button';
    let fired = false;
    if (opts.enabled) {
      btn.classList.add('btn-attention', 'wwv-attention');
    } else {
      btn.disabled = true;
    }
    btn.addEventListener('click', () => {
      if (fired || btn.disabled) return;
      fired = true;
      btn.disabled = true;
      btn.classList.remove('btn-attention', 'wwv-attention');
      btn.textContent = '⏳ Đang gửi…';
      if (typeof opts.onConfirm === 'function') opts.onConfirm();
    });
    bar.appendChild(btn);
    if (container) container.appendChild(bar);
    if (opts.enabled) {
      try {
        if (typeof requestAnimationFrame === 'function') {
          requestAnimationFrame(() => {
            try { bar.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (e) { /* ignore */ }
          });
        }
      } catch (e) { /* ignore */ }
    }
    return bar;
  }

  /* ---------- 4. hostBoard ---------- */
  function hostBoard(container, vm) {
    clear(container);
    if (!container) return;
    vm = vm || {};
    const phase = vm.phase;
    const players = arr(vm.players);
    const alive = players.filter((p) => p.alive !== false).length;
    const root = el('div', 'wwv-board');
    const head = el('div', 'wwv-board-head');
    head.appendChild(el('h3', 'wwv-board-title', 'Bàn chơi'));
    head.appendChild(el('span', 'wwv-board-count', 'còn sống ' + alive + '/' + players.length));
    root.appendChild(head);

    let maxVotes = 0;
    if (phase === 'DAY') players.forEach((p) => { if (p.alive !== false) maxVotes = Math.max(maxVotes, p.votesAgainst || 0); });

    const grid = el('div', 'wwv-board-grid');
    players.forEach((p) => {
      const dead = p.alive === false;
      const tile = el('div', 'wwv-tile');
      tile.dataset.id = p.id;
      if (dead) tile.classList.add('wwv-tile-dead');
      const offline = !dead && !p.isDemo && p.online === false;
      if (offline) tile.classList.add('wwv-tile-offline');
      if (phase === 'LOBBY' && !dead) tile.classList.add(p.ready ? 'wwv-tile-ready' : 'wwv-tile-notready');
      const votes = p.votesAgainst || 0;
      if (phase === 'DAY' && !dead && votes > 0 && votes === maxVotes) tile.classList.add('wwv-tile-top');

      const av = el('div', 'wwv-tile-av');
      av.appendChild(avatar(p.avatarId, 'avatar-lg'));
      if (dead) av.appendChild(el('span', 'wwv-tile-skull', '💀'));
      if (offline) {
        const dot = el('span', 'wwv-dot-off');
        dot.title = 'Mất kết nối';
        av.appendChild(dot);
      }
      tile.appendChild(av);

      const nm = el('div', 'wwv-tile-name', p.name);
      if (p.isDemo) nm.appendChild(el('span', 'wwv-tag-bot', 'bot'));
      tile.appendChild(nm);

      let status = '';
      if (dead) status = p.deathNote || 'Đã chết';
      else if (offline) status = 'Mất kết nối';
      else if (phase === 'LOBBY') status = p.ready ? '✅ Sẵn sàng' : '⏳ Chưa sẵn sàng';
      else if (phase === 'DAY' && p.voted) status = '🗳️ Đã vote';
      else if (phase === 'DAY') status = 'Đang suy nghĩ…';
      else status = 'Còn sống';
      const st = el('div', 'wwv-tile-status', status);
      if (offline) st.classList.add('wwv-status-off');
      tile.appendChild(st);

      if (phase === 'DAY' && votes > 0) {
        tile.appendChild(el('span', 'wwv-vote-badge', '🗳️ ' + votes));
      }
      grid.appendChild(tile);
    });
    root.appendChild(grid);
    container.appendChild(root);
  }

  /* ---------- 5. gameOverBoard ---------- */
  const WOLF_IDS = ['werewolf', 'alpha_wolf'];
  const THIRD_IDS = ['jester', 'serial_killer'];
  function factionOf(roleId) {
    if (WOLF_IDS.indexOf(roleId) >= 0) return 'werewolf';
    if (THIRD_IDS.indexOf(roleId) >= 0) return 'third';
    return 'villager';
  }
  const FACTION_TITLE = {
    werewolf: '🐺 Phe Ma Sói',
    villager: '🧑‍🌾 Phe Dân Làng',
    third: '🎭 Phe Thứ 3'
  };

  function gameOverBoard(container, vm) {
    clear(container);
    if (!container) return;
    vm = vm || {};
    const players = arr(vm.players);
    const root = el('div', 'wwv-go');
    const hero = el('div', 'wwv-go-hero wwv-win-' + String(vm.winner || 'none'));
    hero.appendChild(el('div', 'wwv-go-title', vm.winnerTitle || 'Ván đấu kết thúc'));
    if (vm.winnerSub) hero.appendChild(el('div', 'wwv-go-sub', vm.winnerSub));
    root.appendChild(hero);

    const groups = { werewolf: [], villager: [], third: [] };
    players.forEach((p) => groups[factionOf(p.roleId)].push(p));
    const order = ['villager', 'werewolf', 'third'];
    order.sort((a, b) => {
      const wa = groups[a].some((p) => p.won) ? 1 : 0;
      const wb = groups[b].some((p) => p.won) ? 1 : 0;
      return wb - wa;
    });
    order.forEach((key) => {
      const list = groups[key];
      if (!list.length) return;
      const sec = el('section', 'wwv-go-group wwv-faction-' + key);
      if (list.some((p) => p.won)) sec.classList.add('wwv-group-win');
      sec.appendChild(el('h4', 'wwv-go-group-title', FACTION_TITLE[key]));
      const grid = el('div', 'wwv-go-grid');
      list.forEach((p) => grid.appendChild(roleCard(p)));
      sec.appendChild(grid);
      root.appendChild(sec);
    });
    container.appendChild(root);
  }

  function roleCard(p) {
    const r = role(p.roleId);
    const card = el('div', 'wwv-rcard');
    card.style.setProperty('--wwv-accent', r.themeColor || '#8b5cf6');
    if (p.won) card.classList.add('wwv-rcard-won');
    if (p.alive === false) card.classList.add('wwv-rcard-dead');
    const art = el('div', 'wwv-rcard-art');
    if (r.bgImage) art.style.backgroundImage = 'url("' + String(r.bgImage).replace(/"/g, '') + '")';
    card.appendChild(art);
    const av = el('div', 'wwv-rcard-av');
    av.appendChild(avatar(p.avatarId, 'avatar-lg'));
    card.appendChild(av);
    const body = el('div', 'wwv-rcard-body');
    body.appendChild(el('div', 'wwv-rcard-name', p.name));
    body.appendChild(el('div', 'wwv-rcard-role', (r.icon || '') + ' ' + r.name));
    const badges = el('div', 'wwv-badges');
    if (p.won) badges.appendChild(el('span', 'wwv-badge wwv-badge-win', '🏆 Thắng'));
    if (p.alive === false) badges.appendChild(el('span', 'wwv-badge wwv-badge-dead', '💀 ' + (p.deathNote || 'Đã chết')));
    else badges.appendChild(el('span', 'wwv-badge wwv-badge-alive', '❤️ Sống sót'));
    if (p.isLover) badges.appendChild(el('span', 'wwv-badge wwv-badge-lover', '💘 Cặp đôi'));
    body.appendChild(badges);
    if (p.startRoleId && p.startRoleId !== p.roleId) {
      body.appendChild(el('div', 'wwv-rcard-start', 'Ban đầu: ' + role(p.startRoleId).name));
    }
    card.appendChild(body);
    return card;
  }

  /* ---------- 6. playerGameOver ---------- */
  function playerGameOver(container, vm, handlers) {
    clear(container);
    if (!container) return;
    vm = vm || {};
    const players = arr(vm.players);
    const me = players.find((p) => p.id === vm.myId);
    const root = el('div', 'wwv-pgo');
    const banner = el('div', 'wwv-pgo-banner wwv-win-' + String(vm.winner || 'none'));
    banner.appendChild(el('div', 'wwv-pgo-title', vm.winnerTitle || 'Ván đấu kết thúc'));
    if (vm.winnerSub) banner.appendChild(el('div', 'wwv-pgo-sub', vm.winnerSub));
    root.appendChild(banner);
    if (me) {
      root.appendChild(el('div', 'wwv-pgo-me ' + (me.won ? 'wwv-pgo-won' : 'wwv-pgo-lost'),
        me.won ? '🎉 Bạn đã THẮNG!' : '😵 Bạn đã thua ván này'));
    }
    const list = el('div', 'wwv-pgo-list');
    players.forEach((p) => {
      const r = role(p.roleId);
      const row = el('div', 'wwv-pgo-row');
      if (p.id === vm.myId) row.classList.add('wwv-is-me');
      if (p.alive === false) row.classList.add('wwv-pgo-dead');
      row.style.setProperty('--wwv-accent', r.themeColor || '#8b5cf6');
      row.appendChild(avatar(p.avatarId, 'avatar-md'));
      const info = el('div', 'wwv-pgo-info');
      const nm = el('div', 'wwv-pgo-name', p.name);
      if (p.id === vm.myId) nm.appendChild(el('span', 'wwv-me-tag', 'Bạn'));
      info.appendChild(nm);
      info.appendChild(el('div', 'wwv-pgo-role', (r.icon || '') + ' ' + r.name));
      info.appendChild(el('div', 'wwv-pgo-state', p.alive === false ? '💀 ' + (p.deathNote || 'Đã chết') : '❤️ Sống sót'));
      row.appendChild(info);
      const marks = el('div', 'wwv-pgo-marks');
      if (p.isLover) marks.appendChild(el('span', '', '💘'));
      if (p.won) marks.appendChild(el('span', '', '🏆'));
      row.appendChild(marks);
      list.appendChild(row);
    });
    root.appendChild(list);
    const btn = el('button', 'btn btn-secondary btn-block btn-lg wwv-pgo-log', '📜 Xem nhật ký ván đấu');
    btn.type = 'button';
    btn.addEventListener('click', () => {
      if (handlers && typeof handlers.onOpenLog === 'function') handlers.onOpenLog();
    });
    root.appendChild(btn);
    container.appendChild(root);
  }

  /* ---------- 7. timeline ---------- */
  function phaseHeader(phase, round) {
    switch (phase) {
      case 'setup': return '🎬 Chuẩn bị';
      case 'night': return '🌙 Đêm ' + round;
      case 'day': return '☀️ Ngày ' + round;
      case 'end': return '🏁 Kết thúc';
      default: return 'Ván đấu';
    }
  }

  function timeline(container, entries, opts) {
    clear(container);
    if (!container) return;
    opts = opts || {};
    const showSecret = !!opts.showSecret;
    const all = arr(entries).slice().sort((a, b) => (a.seq || 0) - (b.seq || 0));
    const hiddenSecret = all.some((e) => e.secret) && !showSecret;
    const visible = all.filter((e) => showSecret || !e.secret);
    const root = el('div', 'wwv-tl');
    if (!visible.length) {
      root.appendChild(el('div', 'wwv-empty-box', opts.emptyText || 'Chưa có sự kiện nào.'));
    }
    let curKey = null;
    let list = null;
    visible.forEach((e) => {
      const key = e.phase + '|' + e.round;
      if (key !== curKey) {
        curKey = key;
        const grp = el('section', 'wwv-tl-group wwv-tl-' + (e.phase || 'x'));
        grp.appendChild(el('h4', 'wwv-tl-head', phaseHeader(e.phase, e.round)));
        list = el('ul', 'wwv-tl-list');
        grp.appendChild(list);
        root.appendChild(grp);
      }
      const li = el('li', 'wwv-tl-item' + (e.secret ? ' wwv-tl-secret' : ''));
      li.appendChild(el('span', 'wwv-tl-icon', e.icon || '•'));
      const t = el('span', 'wwv-tl-text', e.text);
      li.appendChild(t);
      if (e.secret) li.appendChild(el('span', 'wwv-tl-tag', '🔒 bí mật'));
      list.appendChild(li);
    });
    if (hiddenSecret) {
      root.appendChild(el('div', 'wwv-tl-note', '🔒 Các hành động bí mật ban đêm sẽ hiện ra sau khi ván kết thúc.'));
    }
    container.appendChild(root);
  }

  /* ---------- 8. openLogDialog ---------- */
  function openLogDialog(opts) {
    opts = opts || {};
    let dialog = document.getElementById('wwv-log-dialog');
    if (!dialog) {
      dialog = document.createElement('dialog');
      dialog.id = 'wwv-log-dialog';
      dialog.className = 'wwv-dialog';
      const shell = el('div', 'wwv-dialog-shell');
      const header = el('div', 'wwv-dialog-head');
      header.appendChild(el('h3', 'wwv-dialog-title', ''));
      const x = el('button', 'wwv-dialog-x', '✕');
      x.type = 'button';
      x.setAttribute('aria-label', 'Đóng');
      header.appendChild(x);
      shell.appendChild(header);
      shell.appendChild(el('p', 'wwv-dialog-note', ''));
      shell.appendChild(el('div', 'wwv-dialog-body', ''));
      const foot = el('div', 'wwv-dialog-foot');
      const close = el('button', 'btn btn-secondary btn-lg wwv-dialog-close', 'Đóng');
      close.type = 'button';
      foot.appendChild(close);
      shell.appendChild(foot);
      dialog.appendChild(shell);
      const doClose = () => { try { dialog.close(); } catch (e) { dialog.removeAttribute('open'); } };
      x.addEventListener('click', doClose);
      close.addEventListener('click', doClose);
      dialog.addEventListener('click', (ev) => { if (ev.target === dialog) doClose(); });
      document.body.appendChild(dialog);
    }
    const q = (sel) => (dialog.querySelector ? dialog.querySelector(sel) : null);
    const titleEl = q('.wwv-dialog-title');
    const noteEl = q('.wwv-dialog-note');
    const bodyEl = q('.wwv-dialog-body');
    if (titleEl) titleEl.textContent = opts.title || '📜 Nhật ký ván đấu';
    if (noteEl) {
      noteEl.textContent = opts.note || '';
      noteEl.hidden = !opts.note;
    }
    if (bodyEl) {
      timeline(bodyEl, opts.entries, { showSecret: !!opts.showSecret });
      bodyEl.scrollTop = 0;
    }
    if (!dialog.open) {
      try { dialog.showModal(); } catch (e) { dialog.setAttribute('open', ''); }
    }
    return dialog;
  }

  return {
    wolfVotePanel,
    secretExtras,
    confirmBar,
    hostBoard,
    gameOverBoard,
    playerGameOver,
    timeline,
    openLogDialog
  };
})();
