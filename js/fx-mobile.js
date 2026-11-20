// js/fx-mobile.js — Hiệu ứng chạm xúc giác & thị giác cho điện thoại (v4.0)
(function (global) {
  'use strict';

  const STYLE_ID = 'mobile-fx-styles';
  const LAYER_ID = 'mobile-fx-layer';
  const CLEANUP_MS = 660;

  const FX_CONFIG = {
    wolf_bite: {
      haptic: [24, 34, 36],
      color: '#f43f5e',
      accent: '#fda4af',
      kind: 'claw'
    },
    witch_potion: {
      haptic: [16, 26, 22],
      color: '#34d399',
      accent: '#a855f7',
      kind: 'potion'
    },
    seer_peek: {
      haptic: [14, 22, 16],
      color: '#22d3ee',
      accent: '#a78bfa',
      kind: 'crystal'
    },
    hunter_aim: {
      haptic: [28, 18, 38],
      color: '#f59e0b',
      accent: '#f43f5e',
      kind: 'crosshair'
    },
    cupid_link: {
      haptic: [16, 24, 16],
      color: '#fb7185',
      accent: '#f9a8d4',
      kind: 'cupid'
    },
    vote_stamp: {
      haptic: [22],
      color: '#fbbf24',
      accent: '#22d3ee',
      kind: 'stamp'
    },
    spell_silence: {
      haptic: [24, 28, 18],
      color: '#818cf8',
      accent: '#c084fc',
      kind: 'seal'
    },
    detective_scan: {
      haptic: [14, 20, 14],
      color: '#38bdf8',
      accent: '#fde047',
      kind: 'scan'
    },
    avenger_strike: {
      haptic: [30, 20, 40],
      color: '#fb7185',
      accent: '#fbbf24',
      kind: 'strike'
    }
  };

  function isReducedMotion() {
    try {
      return Boolean(
        typeof window !== 'undefined' &&
          typeof window.matchMedia === 'function' &&
          window.matchMedia('(prefers-reduced-motion: reduce)').matches
      );
    } catch (_) {
      return false;
    }
  }

  function triggerHaptic(pattern) {
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function' && pattern) {
        navigator.vibrate(pattern);
      }
    } catch (_) {}
  }

  function ensureStyles() {
    if (typeof document === 'undefined') return;
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${LAYER_ID} {
        position: fixed;
        inset: 0;
        z-index: 95;
        pointer-events: none;
        overflow: hidden;
      }
      .mfx-burst {
        position: fixed;
        left: 0;
        top: 0;
        width: 0;
        height: 0;
        pointer-events: none;
        will-change: transform, opacity;
      }
      .mfx-ring {
        position: absolute;
        left: -46px;
        top: -46px;
        width: 92px;
        height: 92px;
        border-radius: 50%;
        border: 3px solid var(--mfx-color, #22d3ee);
        box-shadow: 0 0 18px var(--mfx-color, #22d3ee);
        opacity: 0;
        animation: mfxRingOut 0.62s cubic-bezier(0.22, 1, 0.36, 1) forwards;
      }
      .mfx-ring-inner {
        position: absolute;
        left: -30px;
        top: -30px;
        width: 60px;
        height: 60px;
        border-radius: 50%;
        border: 2px solid var(--mfx-accent, #a78bfa);
        opacity: 0;
        animation: mfxRingIn 0.52s cubic-bezier(0.22, 1, 0.36, 1) forwards;
      }
      .mfx-slash {
        position: absolute;
        left: -42px;
        top: -3px;
        width: 84px;
        height: 6px;
        border-radius: 99px;
        background: linear-gradient(90deg, transparent, var(--mfx-accent, #fda4af) 25%, var(--mfx-color, #f43f5e) 65%, transparent);
        box-shadow: 0 0 14px var(--mfx-color, #f43f5e);
        opacity: 0;
        animation: mfxSlash 0.56s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }
      .mfx-particle {
        position: absolute;
        left: -7px;
        top: -7px;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: radial-gradient(circle at 35% 35%, #fff, var(--mfx-p-color, #34d399) 70%);
        box-shadow: 0 0 12px var(--mfx-p-color, #34d399);
        opacity: 0;
        animation: mfxFloatUp 0.62s cubic-bezier(0.22, 1, 0.36, 1) forwards;
      }
      .mfx-reticle {
        position: absolute;
        left: -40px;
        top: -40px;
        width: 80px;
        height: 80px;
        border-radius: 50%;
        border: 2.5px dashed var(--mfx-color, #f59e0b);
        box-shadow: 0 0 18px var(--mfx-accent, #f43f5e);
        opacity: 0;
        animation: mfxLockIn 0.58s cubic-bezier(0.22, 1, 0.36, 1) forwards;
      }
      .mfx-reticle::before,
      .mfx-reticle::after {
        content: "";
        position: absolute;
        left: 50%;
        top: 50%;
        background: var(--mfx-accent, #f43f5e);
        transform: translate(-50%, -50%);
      }
      .mfx-reticle::before { width: 96px; height: 2px; }
      .mfx-reticle::after { width: 2px; height: 96px; }
      .mfx-stamp {
        position: absolute;
        left: -36px;
        top: -36px;
        width: 72px;
        height: 72px;
        border-radius: 50%;
        border: 4px double var(--mfx-color, #fbbf24);
        background: radial-gradient(circle, rgba(251, 191, 36, 0.24), transparent 70%);
        opacity: 0;
        animation: mfxStampHit 0.56s cubic-bezier(0.22, 1, 0.36, 1) forwards;
      }
      .mfx-sweep {
        position: absolute;
        left: -48px;
        top: -48px;
        width: 96px;
        height: 96px;
        border-radius: 50%;
        border-top: 3px solid var(--mfx-color, #38bdf8);
        border-right: 3px solid var(--mfx-accent, #fde047);
        border-bottom: 3px solid transparent;
        border-left: 3px solid transparent;
        opacity: 0;
        animation: mfxRadar 0.62s ease-out forwards;
      }
      .mfx-glyph {
        position: absolute;
        left: -20px;
        top: -20px;
        width: 40px;
        height: 40px;
        display: grid;
        place-items: center;
        font-size: 1.65rem;
        line-height: 1;
        filter: drop-shadow(0 0 10px var(--mfx-color, #fff));
        opacity: 0;
        animation: mfxGlyphPop 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards;
      }
      @keyframes mfxRingOut {
        0% { transform: scale(0.32); opacity: 0.95; }
        100% { transform: scale(1.48); opacity: 0; }
      }
      @keyframes mfxRingIn {
        0% { transform: scale(1.55); opacity: 0.25; }
        50% { transform: scale(0.82); opacity: 0.95; }
        100% { transform: scale(0.55); opacity: 0; }
      }
      @keyframes mfxSlash {
        0% { transform: translate(-18px, var(--mfx-dy, 0px)) rotate(var(--mfx-rot, -35deg)) scaleX(0.2); opacity: 0; }
        35% { transform: translate(0, var(--mfx-dy, 0px)) rotate(var(--mfx-rot, -35deg)) scaleX(1.08); opacity: 1; }
        100% { transform: translate(16px, var(--mfx-dy, 0px)) rotate(var(--mfx-rot, -35deg)) scaleX(0.9); opacity: 0; }
      }
      @keyframes mfxFloatUp {
        0% { transform: translate(0, 8px) scale(0.45); opacity: 0.95; }
        100% { transform: translate(var(--mfx-tx, 0px), var(--mfx-ty, -56px)) scale(1.15); opacity: 0; }
      }
      @keyframes mfxLockIn {
        0% { transform: scale(1.65) rotate(-35deg); opacity: 0.35; }
        45% { transform: scale(0.88) rotate(0deg); opacity: 1; }
        100% { transform: scale(1.06) rotate(8deg); opacity: 0; }
      }
      @keyframes mfxStampHit {
        0% { transform: scale(1.85); opacity: 0.15; }
        35% { transform: scale(0.92); opacity: 1; }
        70% { transform: scale(1.05); opacity: 0.9; }
        100% { transform: scale(1.22); opacity: 0; }
      }
      @keyframes mfxRadar {
        0% { transform: scale(0.35) rotate(0deg); opacity: 0.95; }
        100% { transform: scale(1.38) rotate(240deg); opacity: 0; }
      }
      @keyframes mfxGlyphPop {
        0% { transform: translateY(6px) scale(0.5); opacity: 0; }
        35% { transform: translateY(-6px) scale(1.18); opacity: 1; }
        100% { transform: translateY(-28px) scale(0.9); opacity: 0; }
      }
      @media (prefers-reduced-motion: reduce) {
        #${LAYER_ID} { display: none !important; }
      }
    `;
    const head = document.head || document.documentElement;
    if (head) head.appendChild(style);
  }

  function ensureLayer() {
    if (typeof document === 'undefined' || !document.body) return null;
    let layer = document.getElementById(LAYER_ID);
    if (!layer) {
      layer = document.createElement('div');
      layer.id = LAYER_ID;
      layer.setAttribute('aria-hidden', 'true');
      document.body.appendChild(layer);
    }
    return layer;
  }

  function resolveOrigin(anchorEl) {
    const w = typeof window !== 'undefined' && window.innerWidth ? window.innerWidth : 375;
    const h = typeof window !== 'undefined' && window.innerHeight ? window.innerHeight : 667;
    if (anchorEl && typeof anchorEl.getBoundingClientRect === 'function') {
      try {
        const r = anchorEl.getBoundingClientRect();
        if (r && (r.width > 0 || r.height > 0)) {
          return {
            x: Math.max(24, Math.min(w - 24, r.left + r.width / 2)),
            y: Math.max(24, Math.min(h - 24, r.top + r.height / 2))
          };
        }
      } catch (_) {}
    }
    return { x: w / 2, y: h * 0.56 };
  }

  function addNode(parent, className, vars, text) {
    const el = document.createElement('span');
    el.className = className;
    if (vars) {
      Object.entries(vars).forEach(([k, v]) => {
        el.style.setProperty(k, String(v));
      });
    }
    if (text) el.textContent = text;
    parent.appendChild(el);
    return el;
  }

  function buildBurstNodes(burst, type, cfg) {
    if (type === 'wolf_bite') {
      addNode(burst, 'mfx-ring');
      [-14, 0, 14].forEach((dy, idx) => {
        addNode(burst, 'mfx-slash', {
          '--mfx-dy': `${dy}px`,
          '--mfx-rot': `${-36 + idx * 4}deg`,
          animationDelay: `${idx * 45}ms`
        });
      });
      return;
    }

    if (type === 'witch_potion') {
      addNode(burst, 'mfx-ring');
      const offsets = [
        [-28, -54, cfg.color],
        [0, -68, cfg.accent],
        [28, -50, cfg.color],
        [-18, -36, cfg.accent],
        [20, -40, cfg.color],
        [-36, -24, cfg.accent]
      ];
      offsets.forEach(([tx, ty, pColor], idx) => {
        addNode(burst, 'mfx-particle', {
          '--mfx-tx': `${tx}px`,
          '--mfx-ty': `${ty}px`,
          '--mfx-p-color': pColor,
          animationDelay: `${idx * 38}ms`
        });
      });
      addNode(burst, 'mfx-glyph', null, '🧪');
      return;
    }

    if (type === 'seer_peek') {
      addNode(burst, 'mfx-ring');
      addNode(burst, 'mfx-ring-inner');
      addNode(burst, 'mfx-glyph', null, '🔮');
      return;
    }

    if (type === 'hunter_aim') {
      addNode(burst, 'mfx-reticle');
      addNode(burst, 'mfx-ring');
      return;
    }

    if (type === 'cupid_link') {
      addNode(burst, 'mfx-ring');
      addNode(burst, 'mfx-particle', { '--mfx-tx': '-34px', '--mfx-ty': '-46px', '--mfx-p-color': cfg.color });
      addNode(burst, 'mfx-particle', { '--mfx-tx': '34px', '--mfx-ty': '-46px', '--mfx-p-color': cfg.accent });
      addNode(burst, 'mfx-glyph', null, '💘');
      return;
    }

    if (type === 'vote_stamp') {
      addNode(burst, 'mfx-stamp');
      addNode(burst, 'mfx-ring');
      addNode(burst, 'mfx-glyph', null, '✓');
      return;
    }

    if (type === 'spell_silence') {
      addNode(burst, 'mfx-ring-inner');
      addNode(burst, 'mfx-ring');
      addNode(burst, 'mfx-glyph', null, '🤐');
      return;
    }

    if (type === 'detective_scan') {
      addNode(burst, 'mfx-sweep');
      addNode(burst, 'mfx-ring');
      addNode(burst, 'mfx-glyph', null, '🕵️');
      return;
    }

    if (type === 'avenger_strike') {
      addNode(burst, 'mfx-ring');
      addNode(burst, 'mfx-slash', { '--mfx-dy': '0px', '--mfx-rot': '-42deg' });
      addNode(burst, 'mfx-slash', { '--mfx-dy': '0px', '--mfx-rot': '42deg', animationDelay: '45ms' });
      addNode(burst, 'mfx-glyph', null, '⚡');
      return;
    }

    addNode(burst, 'mfx-ring');
  }

  function triggerRoleFx(type, anchorEl) {
    if (typeof document === 'undefined') return false;
    const cfg = FX_CONFIG[type] || FX_CONFIG.vote_stamp;
    if (isReducedMotion()) return false;

    try {
      ensureStyles();
      const layer = ensureLayer();
      if (!layer) return false;

      const { x, y } = resolveOrigin(anchorEl);
      const burst = document.createElement('div');
      burst.className = `mfx-burst mfx-${cfg.kind}`;
      burst.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`;
      burst.style.setProperty('--mfx-color', cfg.color);
      burst.style.setProperty('--mfx-accent', cfg.accent);

      buildBurstNodes(burst, type, cfg);
      layer.appendChild(burst);

      triggerHaptic(cfg.haptic);

      if (typeof setTimeout === 'function') {
        setTimeout(() => {
          try {
            if (burst.parentNode) burst.parentNode.removeChild(burst);
          } catch (_) {}
        }, CLEANUP_MS);
      }
      return true;
    } catch (_) {
      return false;
    }
  }

  const api = {
    triggerRoleFx,
    SUPPORTED_TYPES: Object.keys(FX_CONFIG)
  };

  if (typeof window !== 'undefined') {
    window.MobileFX = api;
  } else {
    global.MobileFX = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
