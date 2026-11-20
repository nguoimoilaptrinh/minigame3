// Điều phối giao diện chính v3.2: một phòng cố định, router tự vào lại ván, resume gate, PWA
window.AppUI = (() => {
  const VIEW_IDS = ['view-home', 'view-werewolf-host', 'view-werewolf-player', 'view-spy-room'];
  let toastTimer = null;
  let toastHideTimer = null;

  function setActiveGameMode(isActive, phaseMode = null) {
    document.body.classList.toggle('in-active-game', Boolean(isActive));
    document.body.classList.toggle('phase-night', Boolean(isActive && phaseMode === 'NIGHT'));
    document.body.classList.toggle('phase-day', Boolean(isActive && phaseMode === 'DAY'));
  }

  // ---------- Lưu trữ (mọi key đi qua RoomNetwork.storageKey) ----------
  function sk(base) {
    try {
      return window.RoomNetwork?.storageKey ? window.RoomNetwork.storageKey(base) : base;
    } catch (_) {
      return base;
    }
  }
  function lsGet(base) {
    try {
      return localStorage.getItem(sk(base));
    } catch (_) {
      return null;
    }
  }
  function lsSet(base, val) {
    try {
      localStorage.setItem(sk(base), val);
    } catch (_) {}
  }
  function lsDel(base) {
    try {
      localStorage.removeItem(sk(base));
    } catch (_) {}
  }

  function markSession(role, game) {
    lsSet('hq_session', JSON.stringify({ role, game, ts: Date.now() }));
  }
  function clearSession() {
    lsDel('hq_session');
  }
  function getSession() {
    try {
      const raw = lsGet('hq_session');
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (obj && (obj.role === 'host' || obj.role === 'player') && (obj.game === 'werewolf' || obj.game === 'spy')) return obj;
    } catch (_) {}
    return null;
  }
  const RECENT_NAMES_KEY = 'hq_recent_names_v4';
  const CUSTOM_AVATAR_KEY = 'hq_custom_avatar_v4';

  function isCustomAvatarId(id) {
    return typeof id === 'string' && id.startsWith('data:image/');
  }

  function getCustomAvatarDataUrl() {
    try {
      if (typeof localStorage === 'undefined') return '';
      const raw = localStorage.getItem(CUSTOM_AVATAR_KEY);
      return isCustomAvatarId(raw) ? raw : '';
    } catch (_) {
      return '';
    }
  }

  function saveCustomAvatarDataUrl(dataUrl) {
    if (!isCustomAvatarId(dataUrl)) return;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(CUSTOM_AVATAR_KEY, dataUrl);
      }
    } catch (_) {}
  }

  function getRecentNames() {
    try {
      if (typeof localStorage === 'undefined') return [];
      const raw = localStorage.getItem(RECENT_NAMES_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((n) => typeof n === 'string' && n.trim())
        .map((n) => n.trim())
        .slice(0, 3);
    } catch (_) {
      return [];
    }
  }

  function saveRecentName(name) {
    const clean = typeof name === 'string' ? name.trim() : '';
    if (!clean) return getRecentNames();
    const existing = getRecentNames().filter((n) => n.toLowerCase() !== clean.toLowerCase());
    const next = [clean, ...existing].slice(0, 3);
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(RECENT_NAMES_KEY, JSON.stringify(next));
      }
    } catch (_) {}
    return next;
  }

  function renderRecentNamesBar(inputEl, barId = 'recent-names-chips') {
    if (typeof document === 'undefined' || !inputEl) return null;
    let wrap = document.getElementById(barId);
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = barId;
      wrap.className = 'recent-names-wrap';
      wrap.setAttribute('role', 'group');
      wrap.setAttribute('aria-label', 'Gợi ý tên dùng gần đây');
      inputEl.insertAdjacentElement('afterend', wrap);
    }
    const names = getRecentNames();
    wrap.innerHTML = '';
    if (!names.length) {
      wrap.hidden = true;
      return wrap;
    }
    wrap.hidden = false;
    const label = document.createElement('span');
    label.className = 'recent-names-label';
    label.textContent = 'Gần đây:';
    wrap.appendChild(label);

    names.forEach((name) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'recent-name-chip';
      chip.textContent = name;
      chip.addEventListener('click', () => {
        inputEl.value = name;
        if (typeof inputEl.setCustomValidity === 'function') inputEl.setCustomValidity('');
        inputEl.removeAttribute('aria-invalid');
        inputEl.dispatchEvent(new Event('input', { bubbles: true }));
        inputEl.focus();
      });
      wrap.appendChild(chip);
    });
    return wrap;
  }

  function getProfile() {
    return { name: (lsGet('hq_player_name') || '').trim(), avatarId: getSavedAvatarId() };
  }

  function getSavedAvatarId() {
    const saved = lsGet('hq_player_avatar');
    if (isCustomAvatarId(saved)) {
      return saved;
    }
    if (saved && window.GameData?.PLAYER_AVATARS?.some((a) => a.id === saved)) {
      return saved;
    }
    const custom = getCustomAvatarDataUrl();
    if (custom) {
      lsSet('hq_player_avatar', custom);
      return custom;
    }
    const randId = window.GameData?.getRandomAvatarId ? window.GameData.getRandomAvatarId() : 'boy_smile';
    lsSet('hq_player_avatar', randId);
    return randId;
  }

  function saveAvatarId(id) {
    if (!id || typeof id !== 'string') return;
    if (isCustomAvatarId(id)) {
      saveCustomAvatarDataUrl(id);
    }
    lsSet('hq_player_avatar', id);
  }

  function createAvatarEl(avatarId, sizeClass = 'avatar-md') {
    if (typeof document === 'undefined') return null;
    if (isCustomAvatarId(avatarId)) {
      const span = document.createElement('span');
      span.className = `avatar-badge avatar-badge-custom ${sizeClass}`;
      span.setAttribute('aria-hidden', 'true');
      const img = document.createElement('img');
      img.className = 'avatar-img avatar-custom-img';
      img.src = avatarId;
      img.alt = 'Ảnh đại diện người chơi';
      img.draggable = false;
      img.onerror = () => {
        img.remove();
        span.textContent = '🙂';
      };
      span.appendChild(img);
      return span;
    }
    const av = window.GameData?.getAvatarById
      ? window.GameData.getAvatarById(avatarId)
      : { emoji: '🙂', label: 'Người chơi', bg: 'linear-gradient(135deg,#6366f1,#06b6d4)' };
    const span = document.createElement('span');
    span.className = `avatar-badge ${sizeClass}`;
    span.style.background = av.bg;
    span.setAttribute('aria-hidden', 'true');
    if (av.img) {
      const img = document.createElement('img');
      img.className = 'avatar-img';
      img.src = av.img;
      img.alt = '';
      img.draggable = false;
      img.onerror = () => {
        img.remove();
        span.textContent = av.emoji || '🙂';
      };
      span.appendChild(img);
    } else {
      span.textContent = av.emoji;
    }
    return span;
  }

  function loadImageFromFile(file) {
    return new Promise((resolve, reject) => {
      if (typeof FileReader === 'undefined' || typeof Image === 'undefined') {
        reject(new Error('Trình duyệt không hỗ trợ đọc tệp ảnh'));
        return;
      }
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Không thể đọc tệp ảnh'));
      reader.onload = () => {
        const img = new Image();
        img.onload = () =>
          resolve({
            source: img,
            width: img.naturalWidth || img.width,
            height: img.naturalHeight || img.height,
            cleanup: null
          });
        img.onerror = () => reject(new Error('Tệp không phải hình ảnh hợp lệ'));
        img.src = String(reader.result || '');
      };
      reader.readAsDataURL(file);
    });
  }

  async function decodeImageFile(file) {
    if (typeof createImageBitmap === 'function') {
      try {
        const bitmap = await createImageBitmap(file);
        return {
          source: bitmap,
          width: bitmap.width,
          height: bitmap.height,
          cleanup: () => {
            try {
              bitmap.close();
            } catch (_) {}
          }
        };
      } catch (_) {}
    }
    return loadImageFromFile(file);
  }

  function encodeAvatarDataUrl(canvas) {
    const MAX_LEN = 14 * 1024;
    let dataUrl = '';
    try {
      dataUrl = canvas.toDataURL('image/webp', 0.78);
    } catch (_) {}
    if (dataUrl && dataUrl.startsWith('data:image/webp')) {
      if (dataUrl.length > MAX_LEN) {
        try {
          const q65 = canvas.toDataURL('image/webp', 0.65);
          if (q65 && q65.startsWith('data:image/webp')) dataUrl = q65;
        } catch (_) {}
      }
      if (dataUrl.length <= MAX_LEN) return dataUrl;
    }
    try {
      let jpg = canvas.toDataURL('image/jpeg', 0.75);
      if (jpg.length > MAX_LEN) {
        const jpg60 = canvas.toDataURL('image/jpeg', 0.6);
        if (jpg60 && jpg60.length < jpg.length) jpg = jpg60;
      }
      if (jpg && jpg.startsWith('data:image/')) {
        if (!dataUrl || !dataUrl.startsWith('data:image/') || jpg.length < dataUrl.length) {
          return jpg;
        }
      }
    } catch (_) {}
    if (dataUrl && dataUrl.startsWith('data:image/')) return dataUrl;
    throw new Error('Không thể nén ảnh đại diện');
  }

  async function processAvatarFile(file) {
    if (!file) throw new Error('Không có tệp được chọn');
    if (file.type && !file.type.startsWith('image/')) {
      throw new Error('Vui lòng chọn tệp hình ảnh hợp lệ');
    }
    if (typeof document === 'undefined') {
      throw new Error('Môi trường không hỗ trợ xử lý ảnh');
    }
    const decoded = await decodeImageFile(file);
    try {
      const srcW = decoded.width;
      const srcH = decoded.height;
      if (!srcW || !srcH) throw new Error('Kích thước ảnh không hợp lệ');
      const size = 128;
      const side = Math.min(srcW, srcH);
      const sx = Math.floor((srcW - side) / 2);
      const sy = Math.floor((srcH - side) / 2);
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas 2D không khả dụng');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(decoded.source, sx, sy, side, side, 0, 0, size, size);
      return encodeAvatarDataUrl(canvas);
    } finally {
      if (typeof decoded.cleanup === 'function') decoded.cleanup();
    }
  }

  function renderAvatarPicker(container, selectedId, onSelect) {
    if (typeof document === 'undefined' || !container) return;
    const list = window.GameData?.PLAYER_AVATARS || [];
    let current = selectedId || getSavedAvatarId();
    const customUrl = isCustomAvatarId(current) ? current : getCustomAvatarDataUrl();
    container.innerHTML = '';

    const uploadBar = document.createElement('div');
    uploadBar.className = 'avatar-upload-bar';

    const uploadBtn = document.createElement('button');
    uploadBtn.type = 'button';
    uploadBtn.className = 'btn btn-secondary btn-sm avatar-upload-btn';
    uploadBtn.textContent = '📷 Chọn ảnh của bạn';

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.className = 'visually-hidden';
    fileInput.tabIndex = -1;
    fileInput.setAttribute('aria-hidden', 'true');

    uploadBtn.addEventListener('click', () => {
      fileInput.click();
    });
    uploadBar.append(uploadBtn, fileInput);

    let previewBtn = null;
    if (customUrl) {
      previewBtn = document.createElement('button');
      previewBtn.type = 'button';
      previewBtn.className = `avatar-custom-preview${current === customUrl ? ' is-active' : ''}`;
      previewBtn.setAttribute('aria-label', 'Dùng ảnh đại diện tùy chỉnh của bạn');
      const previewImg = document.createElement('img');
      previewImg.className = 'avatar-custom-img';
      previewImg.src = customUrl;
      previewImg.alt = 'Xem trước ảnh đại diện';
      previewImg.draggable = false;
      previewBtn.appendChild(previewImg);
      uploadBar.appendChild(previewBtn);
    }
    container.appendChild(uploadBar);

    const grid = document.createElement('div');
    grid.className = 'avatar-picker-grid';
    grid.setAttribute('role', 'group');
    grid.setAttribute('aria-label', 'Danh sách ảnh và icon đại diện');

    const selectAvatar = (id, targetBtn) => {
      current = id;
      grid.querySelectorAll('.avatar-option').forEach((b) => b.setAttribute('aria-pressed', 'false'));
      if (targetBtn) targetBtn.setAttribute('aria-pressed', 'true');
      if (previewBtn) previewBtn.classList.toggle('is-active', id === customUrl);
      if (typeof onSelect === 'function') onSelect(id);
    };

    if (customUrl) {
      const customBtn = document.createElement('button');
      customBtn.type = 'button';
      customBtn.className = 'avatar-option avatar-option-photo avatar-option-custom';
      customBtn.dataset.avatarId = customUrl;
      const customImg = document.createElement('img');
      customImg.className = 'avatar-img avatar-custom-img';
      customImg.src = customUrl;
      customImg.alt = 'Ảnh đại diện của bạn';
      customImg.draggable = false;
      customImg.onerror = () => {
        customImg.remove();
        customBtn.textContent = '🙂';
      };
      customBtn.appendChild(customImg);
      customBtn.title = 'Ảnh đại diện của bạn';
      customBtn.setAttribute('aria-label', 'Ảnh đại diện của bạn');
      customBtn.setAttribute('aria-pressed', customUrl === current ? 'true' : 'false');
      customBtn.addEventListener('click', () => selectAvatar(customUrl, customBtn));
      grid.appendChild(customBtn);
      if (previewBtn) {
        previewBtn.addEventListener('click', () => selectAvatar(customUrl, customBtn));
      }
    }

    list.forEach((av) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = av.img ? 'avatar-option avatar-option-photo' : 'avatar-option';
      btn.dataset.avatarId = av.id;
      btn.style.background = av.bg;
      if (av.img) {
        const img = document.createElement('img');
        img.className = 'avatar-img';
        img.src = av.img;
        img.alt = '';
        img.draggable = false;
        img.onerror = () => {
          img.remove();
          btn.textContent = av.emoji || '🙂';
        };
        btn.appendChild(img);
      } else {
        btn.textContent = av.emoji;
      }
      btn.title = av.label;
      btn.setAttribute('aria-label', av.label);
      btn.setAttribute('aria-pressed', av.id === current ? 'true' : 'false');
      btn.addEventListener('click', () => selectAvatar(av.id, btn));
      grid.appendChild(btn);
    });

    fileInput.addEventListener('change', async (e) => {
      const file = e.target?.files?.[0];
      if (!file) return;
      uploadBtn.disabled = true;
      uploadBtn.textContent = '⏳ Đang xử lý ảnh...';
      try {
        const dataUrl = await processAvatarFile(file);
        saveCustomAvatarDataUrl(dataUrl);
        saveAvatarId(dataUrl);
        if (typeof onSelect === 'function') onSelect(dataUrl);
        renderAvatarPicker(container, dataUrl, onSelect);
        showToast('Đã cập nhật ảnh đại diện!');
      } catch (_) {
        showToast('Không thể đọc ảnh này. Hãy thử ảnh JPG, PNG hoặc WebP khác nhé!');
      } finally {
        try {
          fileInput.value = '';
        } catch (_) {}
        uploadBtn.disabled = false;
        uploadBtn.textContent = '📷 Chọn ảnh của bạn';
      }
    });

    container.appendChild(grid);
    const sel = grid.querySelector('.avatar-option[aria-pressed="true"]');
    if (sel) {
      requestAnimationFrame(() => {
        try {
          if (grid.scrollWidth > grid.clientWidth + 4 && grid.clientHeight < 200) {
            grid.scrollLeft = Math.max(0, sel.offsetLeft - grid.clientWidth / 2 + sel.offsetWidth / 2);
          }
        } catch (_) {}
      });
    }
  }

  // Cơ chế Nhấn & Giữ (Hold to Peek) chống lộ bài khi quên úp thẻ
  function bindHoldToPeekCard(btnEl, setRevealed) {
    if (!btnEl || btnEl.dataset.holdBound === '1') return;
    btnEl.dataset.holdBound = '1';

    const show = (e) => {
      if (e && e.type === 'pointerdown' && e.button !== undefined && e.button !== 0) return;
      setRevealed(true);
    };
    const hide = () => setRevealed(false);

    btnEl.addEventListener('pointerdown', (e) => {
      if (btnEl.setPointerCapture && e.pointerId !== undefined) {
        try {
          btnEl.setPointerCapture(e.pointerId);
        } catch (_) {}
      }
      show(e);
    });
    btnEl.addEventListener('pointerup', hide);
    btnEl.addEventListener('pointercancel', hide);
    btnEl.addEventListener('pointerleave', hide);
    btnEl.addEventListener('lostpointercapture', hide);
    btnEl.addEventListener('blur', hide);
    btnEl.addEventListener('contextmenu', (e) => e.preventDefault());
    btnEl.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        show(e);
      }
    });
    btnEl.addEventListener('keyup', (e) => {
      if (e.key === ' ' || e.key === 'Enter') hide();
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) hide();
    });
  }

  function showView(viewId) {
    VIEW_IDS.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.hidden = id !== viewId;
    });
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  let currentPlayerGame = null;
  let pendingBeaconGame = null;
  let latestBeacon = null;
  let latestBeaconAt = 0;
  let beaconSeen = false;
  let pendingJoin = false;
  let pendingJoinTimer = null;
  let gateActive = false;
  let refreshHomeProfileFn = () => {};

  function goHome() {
    releaseWakeLock();
    setActiveGameMode(false, null);
    currentPlayerGame = null;
    pendingBeaconGame = null;
    // Xóa query params trên URL nhưng không reload trang
    try {
      const url = new URL(window.location.href);
      url.search = '';
      window.history.replaceState({}, '', url.toString());
    } catch (_) {}
    showView('view-home');
    refreshHomeProfileFn();
    renderHomeStatus();
    updateIosHint();
  }

  function showToast(msg) {
    const toast = document.getElementById('toast-message');
    if (!toast) return;
    toast.textContent = msg;
    toast.hidden = false;
    toast.classList.add('is-visible');
    if (typeof toast.showPopover === 'function') {
      try {
        toast.showPopover();
      } catch (_) {}
    }
    clearTimeout(toastTimer);
    clearTimeout(toastHideTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('is-visible');
      toastHideTimer = setTimeout(() => {
        if (typeof toast.hidePopover === 'function') {
          try {
            toast.hidePopover();
          } catch (_) {}
        }
        toast.hidden = true;
      }, 260);
    }, 3200);
  }

  async function copyText(text, successMsg) {
    try {
      await navigator.clipboard.writeText(text);
      showToast(successMsg || 'Đã sao chép!');
    } catch (_) {
      showToast('Hãy bôi đen và copy đường dẫn bên dưới QR!');
    }
  }

  function renderQrCode(container, url, cellSize = 7) {
    if (!container) return;
    container.innerHTML = '';
    if (typeof window.qrcode === 'function') {
      try {
        const qr = window.qrcode(0, 'M');
        qr.addData(url);
        qr.make();
        container.innerHTML = qr.createSvgTag({ cellSize, margin: 2, scalable: true });
        return;
      } catch (_) {}
    }
    // Fallback nếu không tải được thư viện QR
    const fallback = document.createElement('div');
    fallback.style.color = '#0f172a';
    fallback.style.fontSize = '0.85rem';
    fallback.style.fontWeight = '700';
    fallback.style.textAlign = 'center';
    fallback.textContent = 'Hãy gửi đường dẫn hoặc mã phòng cho bạn bè!';
    container.appendChild(fallback);
  }

  function openQrZoomModal(title, roomCode, url) {
    const dialog = document.getElementById('dialog-qr-zoom');
    if (!dialog) return;
    const titleEl = document.getElementById('dialog-qr-zoom-title');
    const codeEl = document.getElementById('dialog-qr-zoom-code');
    const boxEl = document.getElementById('dialog-qr-zoom-box');
    const urlEl = document.getElementById('dialog-qr-zoom-url');
    if (titleEl && title) titleEl.textContent = title;
    if (codeEl) {
      codeEl.textContent = roomCode || '';
      const line = codeEl.closest('.qr-zoom-code-line');
      if (line) line.hidden = !roomCode;
    }
    if (urlEl) urlEl.textContent = url || '';
    renderQrCode(boxEl, url, 11);
    if (!dialog.open) dialog.showModal();
  }

  function confirmDialog(title, bodyText) {
    return new Promise((resolve) => {
      const dialog = document.getElementById('dialog-confirm');
      document.getElementById('dialog-confirm-title').textContent = title;
      document.getElementById('dialog-confirm-body').textContent = bodyText;

      const onClose = () => {
        const confirmed = dialog.returnValue === 'confirm';
        dialog.returnValue = '';
        dialog.removeEventListener('close', onClose);
        resolve(confirmed);
      };
      dialog.addEventListener('close', onClose);
      dialog.showModal();
    });
  }

  function promptProfileDialog(initialName = '', initialAvatarId = '') {
    return new Promise((resolve) => {
      const dialog = document.getElementById('dialog-name');
      const input = document.getElementById('dialog-name-input');
      const form = document.getElementById('form-dialog-name');
      const pickerWrap = document.getElementById('dialog-avatar-picker');
      input.value = initialName;
      let chosenAvatar = initialAvatarId || getSavedAvatarId();

      renderRecentNamesBar(input, 'dialog-recent-names-chips');
      renderAvatarPicker(pickerWrap, chosenAvatar, (id) => {
        chosenAvatar = id;
      });

      const onClose = () => {
        const confirmed = dialog.returnValue === 'confirm';
        const val = input.value.trim();
        dialog.returnValue = '';
        dialog.removeEventListener('close', onClose);
        if (confirmed && val) {
          saveRecentName(val);
          lsSet('hq_player_name', val);
          saveAvatarId(chosenAvatar);
          refreshHomeProfileFn();
          resolve({ name: val, avatarId: chosenAvatar });
        } else {
          resolve(null);
        }
      };

      form.onsubmit = (e) => {
        if (!input.value.trim()) {
          e.preventDefault();
          input.focus();
        }
      };

      dialog.addEventListener('close', onClose);
      dialog.showModal();
    });
  }

  function promptNameDialog(initialName = '') {
    return promptProfileDialog(initialName).then((res) => (res ? res.name : null));
  }

  // Fallback light-dismiss cho trình duyệt chưa hỗ trợ closedby="any"
  function attachClosedByFallback() {
    if (typeof HTMLDialogElement === 'undefined') return;
    if ('closedBy' in HTMLDialogElement.prototype) return;
    const outside = (e, dialog) => {
      const r = dialog.getBoundingClientRect();
      return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    };
    for (const dialog of document.querySelectorAll('dialog[closedby="any"]')) {
      let pressedOutside = false;
      dialog.addEventListener('pointerdown', (e) => {
        pressedOutside = outside(e, dialog);
      });
      dialog.addEventListener('pointerup', (e) => {
        if (pressedOutside && outside(e, dialog)) dialog.close();
      });
    }
  }

  let openSoundModalFn = () => {};

  function openSoundSettings() {
    openSoundModalFn();
  }

  function setupDialogs() {
    attachClosedByFallback();

    // Sound Settings Dialog
    const soundDialog = document.getElementById('dialog-sound');
    const voiceChk = document.getElementById('sound-voice-enable');
    const sfxChk = document.getElementById('sound-sfx-enable');
    const ambientChk = document.getElementById('sound-ambient-enable');
    const ttsModeSel = document.getElementById('sound-tts-mode');
    const genderWrap = document.getElementById('sound-gender-wrap');
    const genderSel = document.getElementById('sound-voice-gender');
    const browserVoiceWrap = document.getElementById('sound-browser-voice-wrap');
    const voiceSel = document.getElementById('sound-voice-select');
    const voiceStatus = document.getElementById('sound-voice-status');
    const rateRange = document.getElementById('sound-rate-range');
    const rateVal = document.getElementById('sound-rate-val');
    const pitchRange = document.getElementById('sound-pitch-range');
    const pitchVal = document.getElementById('sound-pitch-val');

    function describeVoiceStatus(cfg) {
      if (!voiceStatus) return;
      if (!cfg.voice) {
        voiceStatus.className = 'voice-status warn';
        voiceStatus.textContent = '⚠️ Giọng đọc đang TẮT. Hãy tích “Bật giọng đọc Tiếng Việt” ở phía trên để Bot đọc bài.';
        return;
      }
      if (cfg.mode === 'studio_female') {
        voiceStatus.className = 'voice-status';
        voiceStatus.textContent =
          '✓ Đang dùng Giọng Kể Chuyện Phòng Thu [V1-C]: Nữ Ngọc Huyền (VieNeu-TTS v3 — 0ms độ trễ).';
        return;
      }
      if (cfg.mode === 'studio_male') {
        voiceStatus.className = 'voice-status';
        voiceStatus.textContent =
          '✓ Đang dùng Giọng Kể Chuyện Phòng Thu [V1-A]: Nam Thiền Tâm Đức (VieNeu-TTS v3 — 0ms độ trễ).';
        return;
      }
      if (cfg.hasVietnameseVoice) {
        voiceStatus.className = 'voice-status';
        voiceStatus.textContent = `✓ Tìm thấy ${cfg.viVoiceCount} giọng Tiếng Việt trên thiết bị${
          cfg.hasNeuralVoice ? ' (có giọng Neural)' : ''
        }${cfg.selectedVoiceName ? ` — đang chọn: ${cfg.selectedVoiceName}` : ''}.`;
      } else {
        voiceStatus.className = 'voice-status warn';
        voiceStatus.textContent =
          'Thiết bị chưa cài giọng Tiếng Việt. Bot sẽ tự dùng Cloud TTS Tiếng Việt — không bao giờ đọc bằng giọng tiếng Anh.';
      }
    }

    function populateVoices() {
      const cfg = window.AudioEngine.getConfig();
      const list = window.AudioEngine.getVietnameseVoices();
      voiceSel.innerHTML = '';
      if (list.length === 0) {
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = 'Máy chưa có giọng Tiếng Việt — dùng Cloud TTS';
        voiceSel.appendChild(opt);
        voiceSel.disabled = true;
        describeVoiceStatus(cfg);
        return;
      }
      voiceSel.disabled = false;
      const sorted = [...list].sort((a, b) => {
        const aNeural = /natural|neural/i.test(a.name) ? 0 : 1;
        const bNeural = /natural|neural/i.test(b.name) ? 0 : 1;
        return aNeural - bNeural;
      });
      const selectedURI = cfg.manualVoice ? cfg.voiceURI : cfg.selectedVoiceURI || cfg.voiceURI;
      sorted.forEach((v) => {
        const opt = document.createElement('option');
        opt.value = v.voiceURI;
        opt.textContent = `${v.name} (${v.lang})`;
        if (v.voiceURI === selectedURI) opt.selected = true;
        voiceSel.appendChild(opt);
      });
      if (!selectedURI) voiceSel.selectedIndex = 0;
      describeVoiceStatus(cfg);
    }

    function applyConfigToUI() {
      const cfg = window.AudioEngine.getConfig();
      voiceChk.checked = cfg.voice;
      sfxChk.checked = cfg.sfx;
      if (ambientChk) ambientChk.checked = cfg.ambient;
      ttsModeSel.value = Array.from(ttsModeSel.options).some((o) => o.value === cfg.mode)
        ? cfg.mode
        : 'auto_neural';
      if (genderSel) genderSel.value = cfg.voiceGender || 'female';
      rateRange.value = String(cfg.rate);
      rateVal.textContent = `${cfg.rate.toFixed(2).replace(/\.00$/, '.0')}x`;
      if (pitchRange) {
        pitchRange.value = String(cfg.pitch);
        pitchVal.textContent = cfg.pitch.toFixed(2).replace(/\.00$/, '.0');
      }
      const isStudio = cfg.mode === 'studio_female' || cfg.mode === 'studio_male';
      browserVoiceWrap.hidden = isStudio || cfg.mode === 'cloud';
      if (genderWrap) genderWrap.hidden = isStudio;
      describeVoiceStatus(cfg);
    }

    voiceChk.checked = window.AudioEngine.getConfig().voice;
    sfxChk.checked = window.AudioEngine.getConfig().sfx;
    if (ambientChk) ambientChk.checked = window.AudioEngine.getConfig().ambient;
    applyConfigToUI();

    document.addEventListener('audio-voices-updated', populateVoices);
    document.addEventListener('audio-tts-warning', (e) => {
      if (e.detail?.message) showToast(e.detail.message);
    });
    document.addEventListener('audio-speak-state', (e) => {
      const speaking = Boolean(e.detail?.speaking);
      const wwBotBox = document.getElementById('ww-bot-announcer');
      const spyBotBox = document.getElementById('spy-bot-announcer');
      if (wwBotBox) wwBotBox.classList.toggle('is-speaking', speaking);
      if (spyBotBox) spyBotBox.classList.toggle('is-speaking', speaking);
      document.querySelectorAll('.player-bot-line').forEach((box) => {
        box.classList.toggle('is-speaking', speaking);
      });
    });

    openSoundModalFn = () => {
      window.AudioEngine.unlock();
      applyConfigToUI();
      populateVoices();
      soundDialog.showModal();
    };

    document.getElementById('btn-sound-settings').addEventListener('click', openSoundModalFn);

    document.getElementById('btn-close-sound').addEventListener('click', () => {
      soundDialog.returnValue = '';
      soundDialog.close();
    });

    const syncAudioCfg = () => {
      const rate = Number(rateRange.value) || 1.02;
      const pitch = pitchRange ? Number(pitchRange.value) || 1.0 : 1.0;
      const mode = ttsModeSel.value;
      const isStudio = mode === 'studio_female' || mode === 'studio_male';
      rateVal.textContent = `${rate.toFixed(2).replace(/\.00$/, '.0')}x`;
      if (pitchVal) pitchVal.textContent = pitch.toFixed(2).replace(/\.00$/, '.0');
      browserVoiceWrap.hidden = isStudio || mode === 'cloud';
      if (genderWrap) genderWrap.hidden = isStudio;
      window.AudioEngine.setConfig({
        voice: voiceChk.checked,
        sfx: sfxChk.checked,
        ambient: ambientChk ? ambientChk.checked : true,
        rate,
        pitch,
        mode,
        voiceGender: genderSel ? genderSel.value : 'female'
      });
      populateVoices();
      describeVoiceStatus(window.AudioEngine.getConfig());
    };

    voiceChk.addEventListener('change', syncAudioCfg);
    sfxChk.addEventListener('change', syncAudioCfg);
    if (ambientChk) ambientChk.addEventListener('change', syncAudioCfg);
    ttsModeSel.addEventListener('change', syncAudioCfg);
    if (genderSel) genderSel.addEventListener('change', syncAudioCfg);
    voiceSel.addEventListener('change', () => {
      // Chọn giọng cụ thể = ghi đè lựa chọn Nam/Nữ.
      window.AudioEngine.setConfig({ voiceURI: voiceSel.value });
      describeVoiceStatus(window.AudioEngine.getConfig());
    });
    rateRange.addEventListener('input', syncAudioCfg);
    if (pitchRange) pitchRange.addEventListener('input', syncAudioCfg);

    document.getElementById('btn-test-sfx').addEventListener('click', () => {
      window.AudioEngine.unlock();
      window.AudioEngine.playWolfHowl();
    });
    const testSaveBtn = document.getElementById('btn-test-witch-save');
    if (testSaveBtn) {
      testSaveBtn.addEventListener('click', () => {
        window.AudioEngine.unlock();
        window.AudioEngine.playWitchSave();
      });
    }
    const testPoisonBtn = document.getElementById('btn-test-witch-poison');
    if (testPoisonBtn) {
      testPoisonBtn.addEventListener('click', () => {
        window.AudioEngine.unlock();
        window.AudioEngine.playWitchPoison();
      });
    }

    document.getElementById('btn-test-tts').addEventListener('click', () => {
      window.AudioEngine.unlock();
      window.AudioEngine.speak(
        'Xin chào cả hội! Đây là giọng đọc Tiếng Việt của Bot Quản Trò. Đêm nay, cả làng hãy nhắm mắt thật kỹ nhé!'
      );
    });

    // Rules Dialog
    const rulesDialog = document.getElementById('dialog-rules');
    document.getElementById('btn-rules').addEventListener('click', () => rulesDialog.showModal());
    document.getElementById('btn-close-rules').addEventListener('click', () => {
      rulesDialog.returnValue = '';
      rulesDialog.close();
    });
    rulesDialog.addEventListener('close', () => {
      rulesDialog.returnValue = '';
    });

    // Role Codex Dialog
    const rolesDialog = document.getElementById('dialog-roles');
    const rolesBtn = document.getElementById('btn-roles');
    if (rolesBtn && rolesDialog) {
      rolesBtn.addEventListener('click', () => {
        renderRoleCodex();
        if (!rolesDialog.open) rolesDialog.showModal();
      });
    }
    const closeRolesBtn = document.getElementById('btn-close-roles');
    if (closeRolesBtn && rolesDialog) {
      closeRolesBtn.addEventListener('click', () => {
        rolesDialog.returnValue = '';
        rolesDialog.close();
      });
    }

    // QR Zoom Dialog
    const qrZoomDialog = document.getElementById('dialog-qr-zoom');
    const closeQrBtn = document.getElementById('btn-close-qr-zoom');
    if (qrZoomDialog && closeQrBtn) {
      closeQrBtn.addEventListener('click', () => {
        qrZoomDialog.returnValue = '';
        qrZoomDialog.close();
      });
    }

    // Bảng Phong Thần & Tổng kết Đêm Hội Quán [N4]
    const openLeaderboard = () => {
      if (window.StatsAwards && typeof window.StatsAwards.openLeaderboardDialog === 'function') {
        window.StatsAwards.openLeaderboardDialog();
      } else {
        showToast('Bảng Phong Thần chưa sẵn sàng.');
      }
    };
    const leaderboardBtn = document.getElementById('btn-leaderboard');
    if (leaderboardBtn) leaderboardBtn.addEventListener('click', openLeaderboard);
    const wwLeaderboardBtn = document.getElementById('ww-host-open-leaderboard');
    if (wwLeaderboardBtn) wwLeaderboardBtn.addEventListener('click', openLeaderboard);
    const spyLeaderboardBtn = document.getElementById('spy-open-leaderboard');
    if (spyLeaderboardBtn) spyLeaderboardBtn.addEventListener('click', openLeaderboard);
  }

  function renderRoleCodex() {
    const grid = document.getElementById('roles-codex-grid');
    if (!grid) return;
    grid.innerHTML = '';
    const order = window.GameData?.ROLE_ORDER || [
      'werewolf', 'alpha_wolf', 'seer', 'guard', 'witch', 'hunter',
      'cupid', 'elder', 'spellcaster', 'detective', 'cursed_villager',
      'avenger', 'jester', 'serial_killer', 'villager'
    ];
    order.forEach((roleId) => {
      const role = window.GameData?.WEREWOLF_ROLES?.[roleId];
      if (!role) return;
      const card = document.createElement('article');
      card.className = 'role-codex-card';
      card.dataset.team = role.team;
      card.tabIndex = 0;
      card.setAttribute('role', 'button');
      card.setAttribute('aria-expanded', 'false');
      card.setAttribute('aria-label', `${role.name} — ${role.teamName}. Chạm để xem mô tả đầy đủ.`);
      const toggle = () => {
        const expanded = card.classList.toggle('is-expanded');
        card.setAttribute('aria-expanded', String(expanded));
      };
      card.addEventListener('click', toggle);
      card.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          toggle();
        }
      });

      const art = document.createElement('span');
      art.className = 'role-codex-art';
      art.setAttribute('aria-hidden', 'true');
      if (role.bgImage) art.style.backgroundImage = `url('${role.bgImage}')`;

      const body = document.createElement('div');
      body.className = 'role-codex-body';
      const title = document.createElement('strong');
      title.textContent = `${role.icon} ${role.name}`;
      const team = document.createElement('span');
      team.className = 'team-tag';
      team.textContent = role.teamName;
      const desc = document.createElement('p');
      desc.textContent = role.desc;
      body.append(title, team, desc);
      card.append(art, body);
      grid.appendChild(card);
    });
  }

  let wakeLock = null;

  function releaseWakeLock() {
    if (!wakeLock) return;
    const lock = wakeLock;
    wakeLock = null;
    try {
      const result = lock.release();
      if (result && typeof result.catch === 'function') result.catch(() => {});
    } catch (_) {}
  }

  async function keepScreenAwake() {
    if (!('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
    if (wakeLock && !wakeLock.released) return;
    try {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => {
        wakeLock = null;
      });
    } catch (_) {}
  }

  function toggleFullscreen() {
    try {
      if (!document.fullscreenElement) {
        const root = document.documentElement;
        if (root.requestFullscreen) root.requestFullscreen();
        else if (root.webkitRequestFullscreen) root.webkitRequestFullscreen();
      } else if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    } catch (_) {}
  }

  // ==================== ROUTER: một phòng cố định ====================
  const GAME_NAMES = { werewolf: '🐺 Ma Sói', spy: '🕵️ Gián Điệp' };
  const PHASE_NAMES = {
    LOBBY: 'phòng chờ',
    ROLE_REVEAL: 'chia vai',
    NIGHT: 'ban đêm',
    DAY: 'ban ngày',
    HUNTER_REVENGE: 'Thợ Săn bắn',
    GAME_OVER: 'kết thúc ván',
    PLAYING: 'đang chơi',
    VOTING: 'đang vote'
  };

  function getModule(game) {
    return game === 'spy' ? window.SpyGame : window.WerewolfGame;
  }

  function renderHomeStatus() {
    const el = document.getElementById('join-room-status');
    if (!el) return;
    const b = latestBeacon;
    if (pendingJoin) {
      el.textContent = '⏳ Đang tìm phòng…';
      el.dataset.state = 'wait';
      return;
    }
    if (b && b.game) {
      const waiting = b.phase === 'LOBBY';
      el.textContent = `🟢 Phòng đang mở: ${GAME_NAMES[b.game] || b.game} — ${waiting ? 'đang chờ người vào' : 'đang chơi'}`;
      el.dataset.state = 'on';
    } else if (beaconSeen) {
      el.textContent = '⚪ Chưa thấy máy Quản Trò. Nhờ người cầm laptop mở phòng nhé!';
      el.dataset.state = 'off';
    } else {
      el.textContent = '⏳ Đang tìm phòng của hội…';
      el.dataset.state = 'wait';
    }
  }

  function joinGame(game) {
    const mod = getModule(game);
    if (!mod || typeof mod.joinAsPlayer !== 'function') return;
    const profile = getProfile();
    if (!profile.name) return;
    window.AudioEngine?.unlock?.();
    keepScreenAwake();
    pendingJoin = false;
    clearTimeout(pendingJoinTimer);
    currentPlayerGame = game;
    pendingBeaconGame = null;
    mod.joinAsPlayer(profile.name, profile.avatarId);
  }

  function onBeacon(beacon) {
    if (gateActive) return;
    if (beacon && beacon.game) {
      latestBeacon = beacon;
      latestBeaconAt = Date.now();
    } else {
      latestBeacon = null;
    }
    beaconSeen = true;
    renderHomeStatus();
    if (!beacon || !beacon.game) {
      pendingBeaconGame = null;
      return;
    }
    const homeVisible = !document.getElementById('view-home')?.hidden;

    // Đang ở trong game X mà Quản Trò chuyển sang Y (2 beacon liên tiếp)
    if (currentPlayerGame && beacon.game !== currentPlayerGame) {
      if (pendingBeaconGame === beacon.game) {
        const old = getModule(currentPlayerGame);
        try {
          old?.cleanup?.();
        } catch (_) {}
        showToast(`Quản Trò đã chuyển sang ${GAME_NAMES[beacon.game] || beacon.game} — đang vào…`);
        joinGame(beacon.game);
      } else {
        pendingBeaconGame = beacon.game;
      }
      return;
    }
    pendingBeaconGame = null;

    if (!homeVisible || currentPlayerGame) return;

    // Vào ngay nếu người dùng đã bấm Vào phòng trước đó
    if (pendingJoin) {
      joinGame(beacon.game);
      return;
    }
    // Tự vào lại (lỡ tắt trình duyệt)
    const sess = getSession();
    if (sess && sess.role === 'player' && getProfile().name) {
      joinGame(beacon.game);
    }
  }

  function startBeaconWatch() {
    if (!window.RoomNetwork?.watchBeacon) {
      beaconSeen = true;
      renderHomeStatus();
      return;
    }
    renderHomeStatus();
    try {
      window.RoomNetwork.watchBeacon(onBeacon);
    } catch (_) {}
  }

  function isBeaconFresh() {
    return latestBeacon && Date.now() - latestBeaconAt < 6000;
  }

  async function startHostFlow(game) {
    const mod = getModule(game);
    if (!mod || typeof mod.startHost !== 'function') return;
    if (isBeaconFresh() && latestBeacon.hostId !== window.RoomNetwork.getClientId() + '_host') {
      const ok = await confirmDialog(
        'Đang có máy khác làm Quản Trò',
        'Phòng Hội Quán đang được một máy khác dẫn. Máy này tiếp quản vai trò Quản Trò? Ván trên máy kia sẽ dừng.'
      );
      if (!ok) return;
    }
    window.AudioEngine?.unlock?.();
    keepScreenAwake();
    mod.startHost({ resume: false });
  }

  // ---------- Resume gate ----------
  function formatTime(ts) {
    if (!ts) return '--:--';
    const d = new Date(ts);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  function showResumeGate(game, info) {
    const gate = document.getElementById('resume-gate');
    if (!gate) return false;
    gateActive = true;
    const desc = document.getElementById('resume-gate-desc');
    if (desc) {
      const phase = PHASE_NAMES[info.phase] || info.phase || '';
      desc.textContent = `${GAME_NAMES[game] || game}${phase ? ' — ' + phase : ''} • ${info.playerCount ?? 0} người chơi • lưu lúc ${formatTime(info.savedAt)}`;
    }
    gate.hidden = false;
    document.body.classList.add('has-resume-gate');
    const goBtn = document.getElementById('resume-gate-go');
    const endBtn = document.getElementById('resume-gate-end');

    let done = false;
    const closeGate = () => {
      gate.hidden = true;
      document.body.classList.remove('has-resume-gate');
      document.removeEventListener('keydown', onKey, true);
    };
    const resume = () => {
      if (done) return;
      done = true;
      closeGate();
      gateActive = false;
      window.AudioEngine?.unlock?.();
      keepScreenAwake();
      getModule(game).startHost({ resume: true });
    };
    const onKey = (e) => {
      if (e.target === endBtn) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        resume();
      }
    };
    goBtn.onclick = resume;
    document.addEventListener('keydown', onKey, true);
    endBtn.onclick = async () => {
      const ok = await confirmDialog(
        'Kết thúc ván đang lưu?',
        'Ván đã lưu trên máy này sẽ bị xóa hẳn và không thể khôi phục. Bạn chắc chứ?'
      );
      if (!ok) return;
      done = true;
      try {
        getModule(game).discardHostSnapshot?.();
      } catch (_) {}
      clearSession();
      closeGate();
      gateActive = false;
      startBeaconWatch();
    };
    setTimeout(() => goBtn.focus(), 50);
    return true;
  }

  // ---------- iOS hint ----------
  function isIos() {
    const ua = navigator.userAgent || '';
    return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }
  function isStandalone() {
    try {
      return navigator.standalone === true || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
    } catch (_) {
      return false;
    }
  }
  function updateIosHint() {
    const el = document.getElementById('ios-install-hint');
    if (!el) return;
    let dismissed = false;
    try {
      dismissed = localStorage.getItem('hq_ios_hint_dismissed') === '1';
    } catch (_) {}
    const homeVisible = !document.getElementById('view-home')?.hidden;
    el.hidden = !(isIos() && !isStandalone() && !dismissed && homeVisible);
  }

  function setupIosHint() {
    const btn = document.getElementById('ios-install-hint-close');
    if (btn) {
      btn.addEventListener('click', () => {
        try {
          localStorage.setItem('hq_ios_hint_dismissed', '1');
        } catch (_) {}
        updateIosHint();
      });
    }
    updateIosHint();
  }

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    if (!/^https?:$/.test(location.protocol)) return;
    window.addEventListener('load', () => {
      try {
        navigator.serviceWorker.register('sw.js').catch(() => {});
      } catch (_) {}
    });
  }

  // ---------- Home ----------
  function setupHomeHandlers() {
    const createWwBtn = document.getElementById('btn-create-werewolf');
    const createSpyBtn = document.getElementById('btn-create-spy');
    const joinForm = document.getElementById('form-join-room');
    const nameInput = document.getElementById('input-join-name');
    const avatarPickerWrap = document.getElementById('join-avatar-picker');
    const errEl = document.getElementById('join-error-msg');
    const panel = document.getElementById('home-player-panel');
    const greetRow = document.getElementById('home-greeting');
    const greetName = document.getElementById('home-greeting-name');
    const greetAvatar = document.getElementById('home-greeting-avatar');
    const editBtn = document.getElementById('btn-edit-profile');
    const submitBtn = document.getElementById('btn-join-submit');

    const savedName = (lsGet('hq_player_name') || '').trim();
    if (savedName) nameInput.value = savedName;
    let selectedAvatarId = getSavedAvatarId();

    const getActiveJoinAvatarId = () =>
      avatarPickerWrap?.querySelector('.avatar-option[aria-pressed="true"]')?.dataset.avatarId || selectedAvatarId;

    function renderGreeting() {
      const p = getProfile();
      if (greetName) greetName.textContent = p.name;
      if (greetAvatar) {
        greetAvatar.innerHTML = '';
        const avEl = createAvatarEl(p.avatarId, 'avatar-md');
        if (avEl) greetAvatar.appendChild(avEl);
      }
    }
    function setEditing(editing) {
      if (!panel) return;
      panel.classList.toggle('has-profile', !editing && Boolean(getProfile().name));
      if (greetRow) greetRow.hidden = editing || !getProfile().name;
      if (editing) {
        selectedAvatarId = getSavedAvatarId();
        renderRecentNamesBar(nameInput, 'recent-names-chips');
        renderAvatarPicker(avatarPickerWrap, selectedAvatarId, (id) => {
          selectedAvatarId = id;
          saveAvatarId(id);
        });
      }
    }

    refreshHomeProfileFn = () => {
      const p = getProfile();
      if (p.name) nameInput.value = p.name;
      selectedAvatarId = p.avatarId;
      renderRecentNamesBar(nameInput, 'recent-names-chips');
      renderAvatarPicker(avatarPickerWrap, selectedAvatarId, (id) => {
        selectedAvatarId = id;
        saveAvatarId(id);
      });
      if (p.name) {
        renderGreeting();
        setEditing(false);
      } else if (greetRow) {
        greetRow.hidden = true;
      }
    };

    renderRecentNamesBar(nameInput, 'recent-names-chips');
    renderAvatarPicker(avatarPickerWrap, selectedAvatarId, (id) => {
      selectedAvatarId = id;
      saveAvatarId(id);
    });
    if (savedName) {
      renderGreeting();
      setEditing(false);
    } else if (greetRow) {
      greetRow.hidden = true;
    }
    if (editBtn) {
      editBtn.addEventListener('click', () => {
        setEditing(true);
        nameInput.focus();
      });
    }

    createWwBtn.addEventListener('click', () => startHostFlow('werewolf'));
    createSpyBtn.addEventListener('click', () => startHostFlow('spy'));

    nameInput.addEventListener('input', () => {
      nameInput.setCustomValidity('');
      errEl.textContent = '';
    });
    nameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.isComposing) e.preventDefault();
    });

    joinForm.addEventListener('submit', (e) => {
      e.preventDefault();
      window.AudioEngine?.unlock?.();
      keepScreenAwake();

      const playerName = nameInput.value.trim();
      if (!playerName) {
        errEl.textContent = 'Vui lòng nhập tên của bạn để Bot Quản Trò gọi chính xác!';
        nameInput.setAttribute('aria-invalid', 'true');
        panel?.classList.remove('has-profile');
        if (greetRow) greetRow.hidden = true;
        nameInput.focus();
        return;
      }
      nameInput.removeAttribute('aria-invalid');
      lsSet('hq_player_name', playerName);
      saveRecentName(playerName);
      renderRecentNamesBar(nameInput, 'recent-names-chips');
      saveAvatarId(getActiveJoinAvatarId());
      renderGreeting();
      errEl.textContent = '';

      if (latestBeacon && latestBeacon.game) {
        joinGame(latestBeacon.game);
        return;
      }
      pendingJoin = true;
      renderHomeStatus();
      if (submitBtn) submitBtn.disabled = true;
      clearTimeout(pendingJoinTimer);
      pendingJoinTimer = setTimeout(() => {
        if (!pendingJoin) return;
        pendingJoin = false;
        if (submitBtn) submitBtn.disabled = false;
        renderHomeStatus();
        errEl.textContent = 'Chưa thấy phòng nào đang mở. Nhờ người cầm laptop bấm "Mở phòng", rồi bấm Vào phòng lại nhé!';
      }, 10000);
      // Mở khóa nút khi đã vào được
      const unlock = setInterval(() => {
        if (!pendingJoin) {
          clearInterval(unlock);
          if (submitBtn) submitBtn.disabled = false;
        }
      }, 400);
    });

    document.querySelectorAll('[data-scroll-to]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = document.querySelector(btn.dataset.scrollTo);
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });

    // Bỏ qua âm thầm các tham số cũ ?room=&game=
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.has('room') || params.has('game')) {
        params.delete('room');
        params.delete('game');
        const qs = params.toString();
        window.history.replaceState({}, '', window.location.pathname + (qs ? '?' + qs : ''));
      }
    } catch (_) {}
  }

  function init() {
    setupDialogs();
    setupHomeHandlers();
    setupIosHint();
    const hostDetails = document.getElementById('home-host-details');
    if (hostDetails && window.innerWidth > 720) hostDetails.open = true;
    showView('view-home');
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') keepScreenAwake();
    });

    // Router: máy host có ván đã lưu → cổng tiếp tục; còn lại → chế độ người chơi
    let gated = false;
    const sess = getSession();
    if (sess && sess.role === 'host') {
      try {
        const info = getModule(sess.game)?.getHostSnapshotInfo?.();
        if (info) gated = showResumeGate(sess.game, info);
      } catch (_) {}
    }
    if (!gated) startBeaconWatch();
  }

  if (typeof navigator !== 'undefined') registerServiceWorker();
  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', init);
  }

  return {
    showView,
    goHome,
    setActiveGameMode,
    getSavedAvatarId,
    saveAvatarId,
    createAvatarEl,
    renderAvatarPicker,
    getRecentNames,
    saveRecentName,
    bindHoldToPeekCard,
    openSoundSettings,
    showToast,
    copyText,
    renderQrCode,
    openQrZoomModal,
    confirmDialog,
    promptNameDialog,
    promptProfileDialog,
    markSession,
    clearSession,
    getSession,
    getProfile
  };
})();
