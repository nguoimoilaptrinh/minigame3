// Lớp hiệu ứng điện ảnh v4.0: bầu trời sao tiết kiệm pin di động, màn chuyển cảnh Đêm/Ngày, pháo giấy chiến thắng, tia sáng & rung màn hình
(typeof window !== 'undefined' ? window : globalThis).SceneFX = (() => {
  const _win = typeof window !== 'undefined' ? window : globalThis;
  const _doc = typeof document !== 'undefined' ? document : null;

  const reduceMotion =
    typeof _win.matchMedia === 'function' &&
    _win.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const mobileQuery =
    typeof _win.matchMedia === 'function'
      ? _win.matchMedia('(max-width: 768px), (pointer: coarse)')
      : null;

  let ambientCanvas = null;
  let ambientCtx = null;
  let ambientStars = [];
  let ambientRaf = 0;
  let ambientRunning = false;
  let ambientBodyObserver = null;
  let explicitInGame = null;

  function isMobileDevice() {
    if (mobileQuery) return Boolean(mobileQuery.matches);
    return typeof _win.innerWidth === 'number' ? _win.innerWidth <= 768 : false;
  }

  function isInActiveGame() {
    if (explicitInGame !== null) return explicitInGame;
    return Boolean(_doc && _doc.body && _doc.body.classList && _doc.body.classList.contains('in-active-game'));
  }

  function shouldPauseAmbient() {
    if (reduceMotion) return true;
    if (_doc && _doc.hidden) return true;
    return isMobileDevice() && isInActiveGame();
  }

  let fxCanvas = null;
  let fxCtx = null;
  let fxParticles = [];
  let fxRaf = 0;
  let fxRunning = false;

  let curtainEl = null;
  let curtainTimer = 0;
  let flashEl = null;

  function resizeCanvas(canvas, context) {
    if (!canvas || !context) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // ==================== BẦU TRỜI SAO ====================
  function buildStars() {
    const count = Math.max(46, Math.min(110, Math.round((window.innerWidth * window.innerHeight) / 16000)));
    ambientStars = Array.from({ length: count }, (_, i) => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 1.5 + 0.4,
      alpha: Math.random() * 0.5 + 0.25,
      speed: Math.random() * 0.07 + 0.015,
      phase: Math.random() * Math.PI * 2,
      twinkle: Math.random() * 0.02 + 0.008,
      hue: i % 11 === 0 ? 42 : i % 7 === 0 ? 188 : 222
    }));
  }

  function drawAmbient(now) {
    if (!ambientCtx || !ambientRunning || shouldPauseAmbient()) {
      ambientRunning = false;
      ambientRaf = 0;
      return;
    }
    const w = _win.innerWidth;
    const h = _win.innerHeight;
    ambientCtx.clearRect(0, 0, w, h);

    ambientStars.forEach((s) => {
      if (!reduceMotion) {
        s.y += s.speed;
        if (s.y > h + 4) {
          s.y = -4;
          s.x = Math.random() * w;
        }
      }
      const twinkle = reduceMotion ? 1 : 0.68 + Math.sin(now * s.twinkle + s.phase) * 0.32;
      ambientCtx.beginPath();
      ambientCtx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ambientCtx.fillStyle = `hsla(${s.hue}, 90%, 82%, ${s.alpha * twinkle})`;
      ambientCtx.fill();
    });

    // Vài ngôi sao lớn lấp lánh
    ambientStars.slice(0, 8).forEach((s, i) => {
      const a = 0.06 + Math.sin(now * 0.0008 + i) * 0.05;
      const g = ambientCtx.createRadialGradient(s.x, s.y, 0, s.x, s.y, 26);
      g.addColorStop(0, `rgba(167, 139, 250, ${a})`);
      g.addColorStop(1, 'rgba(167, 139, 250, 0)');
      ambientCtx.fillStyle = g;
      ambientCtx.beginPath();
      ambientCtx.arc(s.x, s.y, 26, 0, Math.PI * 2);
      ambientCtx.fill();
    });

    ambientRaf = requestAnimationFrame(drawAmbient);
  }

  function startAmbient() {
    if (!ambientCtx) return;
    if (shouldPauseAmbient()) {
      stopAmbient();
      if (reduceMotion) {
        resizeCanvas(ambientCanvas, ambientCtx);
        buildStars();
        ambientRunning = true;
        // Vẽ 1 khung tĩnh duy nhất cho prefers-reduced-motion
        const w = _win.innerWidth;
        const h = _win.innerHeight;
        ambientCtx.clearRect(0, 0, w, h);
        ambientStars.forEach((s) => {
          ambientCtx.beginPath();
          ambientCtx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
          ambientCtx.fillStyle = `hsla(${s.hue}, 90%, 82%, ${s.alpha})`;
          ambientCtx.fill();
        });
        ambientRunning = false;
      }
      return;
    }
    if (ambientRunning) return;
    ambientRunning = true;
    resizeCanvas(ambientCanvas, ambientCtx);
    buildStars();
    ambientRaf = requestAnimationFrame(drawAmbient);
  }

  function stopAmbient() {
    ambientRunning = false;
    if (ambientRaf && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(ambientRaf);
    }
    ambientRaf = 0;
  }

  function syncAmbientState() {
    if (!ambientCtx) return;
    if (shouldPauseAmbient()) {
      stopAmbient();
    } else {
      startAmbient();
    }
  }

  function setInGame(active) {
    explicitInGame = active === null || active === undefined ? null : Boolean(active);
    syncAmbientState();
  }

  // ==================== PHÁO GIẤY / TIA SÁNG ====================
  function fxLoop() {
    if (!fxCtx) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    fxCtx.clearRect(0, 0, w, h);

    fxParticles = fxParticles.filter((p) => p.life > 0);
    fxParticles.forEach((p) => {
      p.life -= 1;
      p.vy += p.gravity;
      p.vx *= p.drag;
      p.vy *= p.drag;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.spin;

      const alpha = Math.max(0, Math.min(1, p.life / p.maxLife));
      fxCtx.save();
      fxCtx.translate(p.x, p.y);
      fxCtx.rotate(p.rot);
      fxCtx.globalAlpha = alpha;
      fxCtx.fillStyle = p.color;
      if (p.shape === 'circle') {
        fxCtx.beginPath();
        fxCtx.arc(0, 0, p.size, 0, Math.PI * 2);
        fxCtx.fill();
      } else {
        fxCtx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      }
      fxCtx.restore();
    });

    if (fxParticles.length > 0) {
      fxRaf = requestAnimationFrame(fxLoop);
    } else {
      fxRunning = false;
      fxCtx.clearRect(0, 0, w, h);
    }
  }

  function kickFxLoop() {
    if (fxRunning) return;
    fxRunning = true;
    resizeCanvas(fxCanvas, fxCtx);
    fxRaf = requestAnimationFrame(fxLoop);
  }

  function celebrate(options = {}) {
    if (reduceMotion) {
      flash('rgba(255, 214, 120, 0.32)');
      return;
    }
    const colors = options.colors || ['#fbbf24', '#f472b6', '#8b5cf6', '#22d3ee', '#34d399', '#f97316', '#ffffff'];
    const count = options.count || 140;
    const originY = options.originY ?? -20;
    for (let i = 0; i < count; i++) {
      const life = 150 + Math.random() * 130;
      fxParticles.push({
        x: Math.random() * window.innerWidth,
        y: originY - Math.random() * window.innerHeight * 0.35,
        vx: (Math.random() - 0.5) * 3.6,
        vy: 1 + Math.random() * 3.4,
        gravity: 0.045 + Math.random() * 0.03,
        drag: 0.996,
        size: 6 + Math.random() * 9,
        color: colors[Math.floor(Math.random() * colors.length)],
        rot: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 0.18,
        life,
        maxLife: life,
        shape: Math.random() > 0.72 ? 'circle' : 'rect'
      });
    }
    kickFxLoop();
  }

  function sparkleAt(x, y, color = '#fde68a') {
    if (reduceMotion) return;
    for (let i = 0; i < 22; i++) {
      const angle = (Math.PI * 2 * i) / 22 + Math.random() * 0.4;
      const speed = 1.4 + Math.random() * 3.2;
      const life = 38 + Math.random() * 26;
      fxParticles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        gravity: 0.025,
        drag: 0.955,
        size: 2.5 + Math.random() * 3.5,
        color: Math.random() > 0.5 ? color : '#a78bfa',
        rot: 0,
        spin: 0,
        life,
        maxLife: life,
        shape: 'circle'
      });
    }
    kickFxLoop();
  }

  function sparkleAtElement(el) {
    if (!el) return;
    const r = el.getBoundingClientRect();
    sparkleAt(r.left + r.width / 2, r.top + r.height * 0.42);
  }

  function flash(color = 'rgba(255,255,255,0.6)') {
    if (!flashEl) return;
    flashEl.style.background = color;
    flashEl.classList.remove('is-active');
    // Force reflow để animation chạy lại
    void flashEl.offsetWidth;
    flashEl.classList.add('is-active');
    setTimeout(() => flashEl.classList.remove('is-active'), 620);
  }

  function shake() {
    if (reduceMotion) return;
    document.body.classList.remove('fx-shake');
    void document.body.offsetWidth;
    document.body.classList.add('fx-shake');
    setTimeout(() => document.body.classList.remove('fx-shake'), 560);
  }

  // ==================== MÀN CHUYỂN CẢNH ====================
  function playPhase(options = {}) {
    if (!curtainEl) return;
    const {
      mode = 'night',
      icon = '🌙',
      kicker = 'MÀN ĐÊM BUÔNG XUỐNG',
      title = '',
      sub = '',
      duration = 2100
    } = options;

    clearTimeout(curtainTimer);
    curtainEl.className = `phase-curtain curtain-${mode}`;
    const iconEl = curtainEl.querySelector('.curtain-icon');
    const kickerEl = curtainEl.querySelector('.curtain-kicker');
    const titleEl = curtainEl.querySelector('.curtain-title');
    const subEl = curtainEl.querySelector('.curtain-sub');
    if (iconEl) iconEl.textContent = icon;
    if (kickerEl) kickerEl.textContent = kicker;
    if (titleEl) titleEl.textContent = title;
    if (subEl) {
      subEl.textContent = sub;
      subEl.hidden = !sub;
    }

    curtainEl.hidden = false;
    void curtainEl.offsetWidth;
    curtainEl.classList.add('is-visible');

    curtainTimer = setTimeout(() => {
      curtainEl.classList.remove('is-visible');
      setTimeout(() => {
        curtainEl.hidden = true;
      }, 600);
    }, reduceMotion ? 900 : duration);
  }

  function hidePhase() {
    if (!curtainEl) return;
    clearTimeout(curtainTimer);
    curtainEl.classList.remove('is-visible');
    setTimeout(() => {
      curtainEl.hidden = true;
    }, 500);
  }

  // ==================== NGHIÊNG THẺ 3D THEO CON TRỎ ====================
  function bindTilt(el) {
    if (!el || el.dataset.tiltBound === '1') return;
    el.dataset.tiltBound = '1';
    let raf = 0;

    const reset = () => {
      el.style.setProperty('--tilt-x', '0deg');
      el.style.setProperty('--tilt-y', '0deg');
      el.style.setProperty('--tilt-lift', '0px');
    };

    el.addEventListener('pointermove', (e) => {
      if (reduceMotion || e.pointerType === 'touch') return;
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.setProperty('--tilt-x', `${(-py * 8).toFixed(2)}deg`);
        el.style.setProperty('--tilt-y', `${(px * 10).toFixed(2)}deg`);
        el.style.setProperty('--tilt-lift', '-4px');
      });
    });
    el.addEventListener('pointerleave', reset);
    el.addEventListener('pointercancel', reset);
    el.addEventListener('pointerup', () => setTimeout(reset, 120));
  }

  // ==================== KHỞI TẠO ====================
  function init() {
    if (!_doc) return;
    ambientCanvas = _doc.getElementById('ambient-canvas');
    fxCanvas = _doc.getElementById('fx-canvas');
    curtainEl = _doc.getElementById('phase-curtain');
    flashEl = _doc.getElementById('screen-flash');

    if (ambientCanvas) {
      ambientCtx = ambientCanvas.getContext('2d');
      startAmbient();
    }
    if (fxCanvas) {
      fxCtx = fxCanvas.getContext('2d');
      resizeCanvas(fxCanvas, fxCtx);
    }

    if (typeof _win.addEventListener === 'function') {
      _win.addEventListener('resize', () => {
        if (ambientCtx) {
          resizeCanvas(ambientCanvas, ambientCtx);
          buildStars();
          syncAmbientState();
        }
        if (fxCtx) resizeCanvas(fxCanvas, fxCtx);
      });
    }

    if (mobileQuery && typeof mobileQuery.addEventListener === 'function') {
      mobileQuery.addEventListener('change', syncAmbientState);
    }

    if (typeof MutationObserver === 'function' && _doc.body && !ambientBodyObserver) {
      ambientBodyObserver = new MutationObserver(() => syncAmbientState());
      ambientBodyObserver.observe(_doc.body, { attributes: true, attributeFilter: ['class'] });
    }

    _doc.addEventListener('visibilitychange', () => {
      if (_doc.hidden) {
        stopAmbient();
        if (fxRaf) cancelAnimationFrame(fxRaf);
        fxRunning = false;
      } else {
        syncAmbientState();
        if (fxParticles.length > 0) kickFxLoop();
      }
    });

    _doc.querySelectorAll('#ww-pl-toggle-card, #spy-toggle-card').forEach(bindTilt);

    // Tiếng "tách" nhẹ khi bấm các nút chính — KHÔNG phát trên điện thoại khi đang trong ván:
    // ban đêm mọi người nhắm mắt nghe Bot, tiếng bấm của điện thoại sẽ làm lộ ai đang hành động.
    _doc.addEventListener('pointerdown', (e) => {
      const btn = e.target.closest?.('.btn');
      if (!btn || btn.disabled) return;
      if (isMobileDevice() && isInActiveGame()) return;
      if (_win.AudioEngine) _win.AudioEngine.playUi();
    });
  }

  if (_doc) {
    if (_doc.readyState === 'loading') {
      _doc.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  }

  return {
    playPhase,
    hidePhase,
    celebrate,
    sparkleAt,
    sparkleAtElement,
    flash,
    shake,
    bindTilt,
    setInGame,
    syncAmbientState
  };
})();
