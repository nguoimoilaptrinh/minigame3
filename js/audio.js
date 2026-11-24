// Bộ máy âm thanh v4.0 — Giọng đọc thu sẵn VieNeu-TTS v3 [V1], Cloud TTS v3.3 dự phòng, nhạc nền & hiệu ứng điện ảnh
(typeof window !== 'undefined' ? window : globalThis).AudioEngine = (() => {
  const STORAGE_KEY = 'hq_audio_cfg_v3_fix1';

  const DEFAULT_CONFIG = {
    voice: true,
    sfx: true,
    ambient: true,
    rate: 1.02,
    pitch: 1.0,
    mode: 'studio_female', // 'studio_female' | 'studio_male' | 'auto_neural' | 'cloud' | 'browser'
    voiceGender: 'female', // 'female' | 'male'
    voiceURI: '',
    manualVoice: false
  };

  function normalizeMode(m) {
    if (m === 'studio_female' || m === 'female_ngochuyen') return 'studio_female';
    if (m === 'studio_male' || m === 'male_thientamduc') return 'studio_male';
    if (m === 'auto_neural' || m === 'v33_online') return 'auto_neural';
    if (m === 'cloud') return 'cloud';
    if (m === 'browser') return 'browser';
    return DEFAULT_CONFIG.mode;
  }

  // Flowery TTS: các giọng Tiếng Việt thật, phát được trực tiếp trong trình duyệt.
  const FLOWERY_VOICES = {
    female: {
      primary: '42bc3e50-3c44-5099-b421-7e51d7d577e5', // Hoai My - Microsoft Azure
      alternate: '9898ce96-b966-577d-8a5f-1e3004e649a7' // Linh - Speechify
    },
    male: {
      primary: '756286d1-c495-5465-a76f-de8aeee4b1a5', // Nam Minh - Microsoft Azure
      alternate: 'bcfc0f4c-7114-5b41-a6c1-972a63bb1957' // Minh - Speechify
    }
  };

  function loadSavedConfig() {
    try {
      if (typeof localStorage === 'undefined') return { ...DEFAULT_CONFIG };
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...DEFAULT_CONFIG };
      const parsed = JSON.parse(raw);
      const mode = normalizeMode(parsed.mode);
      let voiceGender = parsed.voiceGender === 'male' ? 'male' : 'female';
      if (mode === 'studio_female') voiceGender = 'female';
      else if (mode === 'studio_male') voiceGender = 'male';
      return {
        ...DEFAULT_CONFIG,
        ...parsed,
        mode,
        voiceGender,
        manualVoice: Boolean(parsed.manualVoice),
        rate: Math.min(1.5, Math.max(0.7, Number(parsed.rate) || DEFAULT_CONFIG.rate)),
        pitch: Math.min(1.2, Math.max(0.8, Number(parsed.pitch) || DEFAULT_CONFIG.pitch))
      };
    } catch (_) {
      return { ...DEFAULT_CONFIG };
    }
  }

  let config = loadSavedConfig();
  let ctx = null;
  let masterSfx = null;
  let voices = [];
  let currentSpeakToken = 0;
  let currentAudioEl = null;
  let cloudAudioEl = null;
  let speechTimers = [];
  let isSpeakingState = false;
  let isPaused = false;
  let dramaticTimer = null;
  let dramaticCallback = null;
  let dramaticToken = 0;
  let dramaticStartedAt = 0;
  let dramaticDelayMs = 0;
  let pausedDramaticRemainingMs = 0;
  let nightBed = null;

  if (typeof window !== 'undefined' && window.VoicePack && typeof window.VoicePack.setVoiceMode === 'function') {
    if (config.mode === 'studio_female' || config.mode === 'studio_male') {
      window.VoicePack.setVoiceMode(config.mode);
    }
  }

  // Ngưỡng & tiện ích
  const CLOUD_CHUNK_LIMIT = 280;
  const BROWSER_CHUNK_LIMIT = 130;

  function emitSpeakState(speaking) {
    if (isSpeakingState === speaking) return;
    isSpeakingState = speaking;
    if (typeof document !== 'undefined' && typeof CustomEvent === 'function') {
      document.dispatchEvent(new CustomEvent('audio-speak-state', { detail: { speaking } }));
    }
  }

  let lastWarningAt = 0;

  function emitWarning(message, detail = {}) {
    const now = Date.now();
    if (now - lastWarningAt < 20000) return;
    lastWarningAt = now;
    if (typeof document !== 'undefined' && typeof CustomEvent === 'function') {
      document.dispatchEvent(
        new CustomEvent('audio-tts-warning', { detail: { message, ...detail } })
      );
    }
  }

  function saveConfig() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch (_) {}
  }

  function isVietnameseVoice(voice) {
    return Boolean(voice && typeof voice.lang === 'string' && /^vi([-_]|$)/i.test(voice.lang));
  }

  function ensureContext() {
    if (typeof window !== 'undefined' && !ctx && (window.AudioContext || window.webkitAudioContext)) {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
      masterSfx = ctx.createGain();
      masterSfx.gain.value = 0.9;
      masterSfx.connect(ctx.destination);
    }
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    return ctx;
  }

  const SILENT_WAV = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
  let cloudAudioUnlocked = false;

  function unlock() {
    const ac = ensureContext();
    if (typeof window !== 'undefined' && window.VoicePack && typeof window.VoicePack.unlock === 'function') {
      try {
        window.VoicePack.unlock(ac);
      } catch (_) {}
    }
    if (!cloudAudioUnlocked && typeof Audio === 'function' && !currentAudioEl) {
      try {
        if (!cloudAudioEl) cloudAudioEl = new Audio();
        cloudAudioEl.muted = true;
        cloudAudioEl.src = SILENT_WAV;
        const p = cloudAudioEl.play();
        if (p && typeof p.then === 'function') {
          p.then(() => {
            try {
              cloudAudioEl.pause();
              cloudAudioEl.currentTime = 0;
              cloudAudioEl.muted = false;
              cloudAudioUnlocked = true;
            } catch (_) {}
          }).catch(() => {
            try {
              cloudAudioEl.muted = false;
            } catch (_) {}
          });
        } else {
          cloudAudioEl.pause();
          cloudAudioEl.muted = false;
          cloudAudioUnlocked = true;
        }
      } catch (_) {}
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      loadVoices();
      try {
        window.speechSynthesis.resume();
      } catch (_) {}
    }
  }

  // ==================== QUẢN LÝ GIỌNG ĐỌC ====================
  function findBestNeuralVietnameseVoice(list) {
    const viList = (list || []).filter(isVietnameseVoice);
    if (!viList.length) return null;
    return (
      viList.find((v) => /hoaimy|namminh/i.test(v.name) && /natural|neural|online/i.test(v.name)) ||
      viList.find((v) => /natural|neural/i.test(v.name)) ||
      viList.find((v) => /online/i.test(v.name)) ||
      null
    );
  }

  const FEMALE_VOICE_RE = /hoai\s*my|hoaimy|linh|hoa|huong|hương|an\s*nhien|an\s*nhiên|thanh\s*diep|thanh\s*diệp|nhung|trang|ngoc|ngọc|mai|thao|thảo|female|nữ|\bnu\b/i;
  const MALE_VOICE_RE = /nam\s*minh|namminh|minh|dung|dũng|hai|hải|duy|khanh|khánh|hien|hiển|luan|luân|bao|bảo|male|\bnam\b/i;

  function voiceMatchesGender(voice, gender) {
    const name = `${voice.name || ''} ${voice.voiceURI || ''}`;
    if (gender === 'male') {
      return MALE_VOICE_RE.test(name) && !/hoai\s*my|hoaimy/i.test(name);
    }
    return FEMALE_VOICE_RE.test(name) && !/nam\s*minh|namminh/i.test(name);
  }

  function findBestVietnameseVoice() {
    const list = getVoices().filter(isVietnameseVoice);
    if (!list.length) return null;

    if (config.manualVoice && config.voiceURI) {
      const saved = list.find((v) => v.voiceURI === config.voiceURI);
      if (saved) return saved;
    }

    const gendered = list.filter((v) => voiceMatchesGender(v, config.voiceGender));
    const pool = gendered.length ? gendered : list;

    return (
      findBestNeuralVietnameseVoice(pool) ||
      pool.find((v) => /google/i.test(v.name)) ||
      pool.find((v) => /linh|hoa|mai|thao|viet/i.test(v.name)) ||
      pool[0]
    );
  }

  function loadVoices() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
    const list = window.speechSynthesis.getVoices() || [];
    if (!list.length) return voices;

    voices = list;
    // TUYỆT ĐỐI không giữ một giọng không phải tiếng Việt trong cấu hình.
    if (config.voiceURI && !list.some((v) => v.voiceURI === config.voiceURI && isVietnameseVoice(v))) {
      config.voiceURI = '';
      config.manualVoice = false;
    }
    if (!config.voiceURI) {
      const best = findBestVietnameseVoice();
      if (best) {
        config.voiceURI = best.voiceURI;
        saveConfig();
      }
    }
    if (typeof document !== 'undefined' && typeof CustomEvent === 'function') {
      document.dispatchEvent(new CustomEvent('audio-voices-updated'));
    }
    return voices;
  }

  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    loadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', () => loadVoices());
    // Một số trình duyệt chỉ trả voices sau khi trang ổn định
    setTimeout(loadVoices, 350);
    setTimeout(loadVoices, 1200);
  }

  function getVoices() {
    if (!voices.length) loadVoices();
    return voices;
  }

  function getVietnameseVoices() {
    return getVoices().filter(isVietnameseVoice);
  }

  function hasVietnameseVoice() {
    return getVietnameseVoices().length > 0;
  }

  function setConfig(partial = {}) {
    const next = { ...config };
    if (typeof partial.voice === 'boolean') next.voice = partial.voice;
    if (typeof partial.sfx === 'boolean') next.sfx = partial.sfx;
    if (typeof partial.ambient === 'boolean') next.ambient = partial.ambient;
    if (typeof partial.rate === 'number') next.rate = Math.min(1.5, Math.max(0.7, partial.rate));
    if (typeof partial.pitch === 'number') next.pitch = Math.min(1.2, Math.max(0.8, partial.pitch));
    if (partial.mode !== undefined) {
      next.mode = normalizeMode(partial.mode);
      if (next.mode === 'studio_female') {
        if (next.voiceGender !== 'female') {
          next.voiceURI = '';
          next.manualVoice = false;
        }
        next.voiceGender = 'female';
      } else if (next.mode === 'studio_male') {
        if (next.voiceGender !== 'male') {
          next.voiceURI = '';
          next.manualVoice = false;
        }
        next.voiceGender = 'male';
      }
    }
    if (partial.voiceGender === 'female' || partial.voiceGender === 'male') {
      if (next.voiceGender !== partial.voiceGender) {
        // Đổi giới tính thì bỏ giọng chọn tay để tự chọn đúng giọng nam/nữ.
        next.voiceURI = '';
        next.manualVoice = false;
      }
      next.voiceGender = partial.voiceGender;
    }
    if (typeof partial.voiceURI === 'string') {
      if (!partial.voiceURI) {
        next.voiceURI = '';
        next.manualVoice = false;
      } else {
        const candidate = getVoices().find((v) => v.voiceURI === partial.voiceURI);
        // Chỉ chấp nhận giọng Tiếng Việt — đây là chốt chặn lỗi đọc tiếng Anh.
        if (candidate && isVietnameseVoice(candidate)) {
          next.voiceURI = candidate.voiceURI;
          next.manualVoice = true;
        }
      }
    }

    config = next;
    saveConfig();

    if (typeof window !== 'undefined' && window.VoicePack && typeof window.VoicePack.setVoiceMode === 'function') {
      window.VoicePack.setVoiceMode(config.mode);
    }

    if (!config.ambient || !config.sfx) stopNightAmbience();
    if (!config.voice) stopSpeech();
    return getConfig();
  }

  function getConfig() {
    const best = findBestVietnameseVoice();
    return {
      voice: config.voice,
      sfx: config.sfx,
      ambient: config.ambient,
      rate: config.rate,
      pitch: config.pitch,
      voiceGender: config.voiceGender,
      voiceURI: config.voiceURI,
      manualVoice: config.manualVoice,
      mode: config.mode,
      hasNeuralVoice: Boolean(findBestNeuralVietnameseVoice(getVoices())),
      hasVietnameseVoice: hasVietnameseVoice(),
      viVoiceCount: getVietnameseVoices().length,
      selectedVoiceName: best ? best.name : '',
      selectedVoiceLang: best ? best.lang : '',
      selectedVoiceURI: best ? best.voiceURI : ''
    };
  }

  function clearSpeechTimers() {
    speechTimers.forEach((t) => clearTimeout(t));
    speechTimers = [];
  }

  function later(fn, ms, token) {
    const t = setTimeout(() => {
      speechTimers = speechTimers.filter((x) => x !== t);
      if (token === currentSpeakToken) fn();
    }, ms);
    speechTimers.push(t);
    return t;
  }

  function clearDramaticTimer() {
    if (dramaticTimer) {
      clearTimeout(dramaticTimer);
      dramaticTimer = null;
    }
    dramaticCallback = null;
    dramaticToken = 0;
    dramaticStartedAt = 0;
    dramaticDelayMs = 0;
    pausedDramaticRemainingMs = 0;
  }

  function scheduleDramaticTimer(fn, ms, token) {
    clearDramaticTimer();
    const delay = Math.max(0, Number(ms) || 0);
    if (isPaused) {
      dramaticCallback = fn;
      dramaticToken = token;
      dramaticDelayMs = delay;
      pausedDramaticRemainingMs = delay;
      return;
    }
    dramaticCallback = fn;
    dramaticToken = token;
    dramaticDelayMs = delay;
    dramaticStartedAt = Date.now();
    pausedDramaticRemainingMs = 0;
    dramaticTimer = setTimeout(() => {
      const cb = dramaticCallback;
      const cbToken = dramaticToken;
      clearDramaticTimer();
      if (cbToken === currentSpeakToken && typeof cb === 'function') {
        cb();
      }
    }, delay);
  }

  function stopSpeech() {
    currentSpeakToken += 1;
    emitSpeakState(false);
    clearSpeechTimers();
    clearDramaticTimer();
    isPaused = false;
    try {
      if (typeof window !== 'undefined' && window.VoicePack && typeof window.VoicePack.stopCurrentAudio === 'function') {
        window.VoicePack.stopCurrentAudio();
      }
    } catch (_) {}
    if (currentAudioEl) {
      try {
        currentAudioEl.onended = null;
        currentAudioEl.onerror = null;
        currentAudioEl.onloadedmetadata = null;
        currentAudioEl.pause();
        currentAudioEl.removeAttribute('src');
        currentAudioEl.load();
      } catch (_) {}
      currentAudioEl = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (_) {}
    }
  }

  function pauseAll() {
    isPaused = true;
    try {
      if (typeof window !== 'undefined' && window.VoicePack && typeof window.VoicePack.pauseAll === 'function') {
        window.VoicePack.pauseAll();
      }
    } catch (_) {}
    if (currentAudioEl && !currentAudioEl.paused) {
      try {
        currentAudioEl.pause();
      } catch (_) {}
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
          window.speechSynthesis.pause();
        }
      } catch (_) {}
    }
    if (dramaticTimer) {
      clearTimeout(dramaticTimer);
      dramaticTimer = null;
      const elapsed = Date.now() - dramaticStartedAt;
      pausedDramaticRemainingMs = Math.max(0, dramaticDelayMs - elapsed);
    }
    if (ctx && ctx.state === 'running') {
      try {
        ctx.suspend().catch(() => {});
      } catch (_) {}
    }
  }

  function resumeAll() {
    isPaused = false;
    if (ctx && ctx.state === 'suspended') {
      try {
        ctx.resume().catch(() => {});
      } catch (_) {}
    }
    try {
      if (typeof window !== 'undefined' && window.VoicePack && typeof window.VoicePack.resumeAll === 'function') {
        window.VoicePack.resumeAll();
      }
    } catch (_) {}
    if (currentAudioEl && currentAudioEl.paused && currentAudioEl.src) {
      try {
        const p = currentAudioEl.play();
        if (p && typeof p.catch === 'function') p.catch(() => {});
      } catch (_) {}
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      } catch (_) {}
    }
    if (dramaticCallback && dramaticToken === currentSpeakToken) {
      const cb = dramaticCallback;
      const rem = pausedDramaticRemainingMs;
      const tok = dramaticToken;
      if (rem > 0) {
        scheduleDramaticTimer(cb, rem, tok);
      } else if (!dramaticTimer) {
        clearDramaticTimer();
        if (typeof cb === 'function') cb();
      }
    }
  }

  // ==================== CHIA CÂU ====================
  function splitIntoChunks(text, maxLen = CLOUD_CHUNK_LIMIT) {
    const clean = String(text || '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!clean) return [];
    const sentences = clean.split(/(?<=[.!?;,])\s+/);
    const chunks = [];
    let current = '';

    for (const part of sentences) {
      if ((current + ' ' + part).trim().length <= maxLen) {
        current = (current + ' ' + part).trim();
      } else {
        if (current) chunks.push(current);
        if (part.length <= maxLen) {
          current = part;
        } else {
          const words = part.split(' ');
          let sub = '';
          for (const w of words) {
            if ((sub + ' ' + w).trim().length <= maxLen) {
              sub = (sub + ' ' + w).trim();
            } else {
              if (sub) chunks.push(sub);
              sub = w;
            }
          }
          current = sub;
        }
      }
    }
    if (current) chunks.push(current);
    return chunks;
  }

  function estimateSpeechMs(text) {
    return Math.min(9000, Math.max(700, String(text || '').length * 62));
  }

  function finishSilently(text, token, onDone) {
    later(() => {
      emitSpeakState(false);
      if (typeof onDone === 'function') onDone();
    }, estimateSpeechMs(text), token);
  }

  // ==================== CLOUD TTS TIẾNG VIỆT ====================
  function cloudUrls(chunk) {
    const text = encodeURIComponent(chunk);
    const voices = FLOWERY_VOICES[config.voiceGender] || FLOWERY_VOICES.female;
    return [
      // Flowery TTS — phát được trực tiếp trong Chrome/Safari/Firefox.
      `https://api.flowery.pw/v1/tts?text=${text}&voice=${encodeURIComponent(voices.primary)}`,
      `https://api.flowery.pw/v1/tts?text=${text}&voice=${encodeURIComponent(voices.alternate)}`,
      // Dự phòng cũ cho một số mạng vẫn tải được Google TTS.
      `https://translate.googleapis.com/translate_tts?client=gtx&ie=UTF-8&tl=vi&q=${text}`,
      `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=vi&q=${text}`
    ];
  }

  function speakWithBrowser(text, token, onDone, opts = {}) {
    if (token !== currentSpeakToken) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      emitWarning('Trình duyệt không hỗ trợ giọng đọc. Bot sẽ hiển thị phụ đề thay thế.');
      finishSilently(text, token, onDone);
      return;
    }

    const allVoices = getVoices();
    const viVoice = findBestVietnameseVoice();
    // Nếu trình duyệt đã trả danh sách giọng đầy đủ nhưng KHÔNG có bất kỳ giọng Việt nào (và không ép đọc), tránh đọc bằng giọng tiếng Anh
    if (!viVoice && allVoices.length > 0 && !opts.allowLangFallback) {
      emitWarning(
        'Thiết bị chưa cài giọng Tiếng Việt và không kết nối được Cloud TTS. Hãy bật mạng hoặc cài gói giọng nói Tiếng Việt trong Cài đặt hệ điều hành.'
      );
      finishSilently(text, token, onDone);
      return;
    }

    const chunks = splitIntoChunks(text, BROWSER_CHUNK_LIMIT);
    if (!chunks.length) {
      emitSpeakState(false);
      if (typeof onDone === 'function') onDone();
      return;
    }

    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();
    } catch (_) {}

    let index = 0;

    const speakNext = () => {
      if (token !== currentSpeakToken) return;
      if (index >= chunks.length) {
        emitSpeakState(false);
        if (typeof onDone === 'function') onDone();
        return;
      }

      const chunk = chunks[index];
      index += 1;

      const utter = new SpeechSynthesisUtterance(chunk);
      utter.lang = 'vi-VN';
      utter.rate = config.rate;
      utter.pitch = config.pitch;
      const pickedVoice = findBestVietnameseVoice() || viVoice;
      if (pickedVoice) utter.voice = pickedVoice;

      let finished = false;
      const keepAlive = setInterval(() => {
        if (finished || token !== currentSpeakToken) {
          clearInterval(keepAlive);
          return;
        }
        try {
          if (window.speechSynthesis.paused && !isPaused) window.speechSynthesis.resume();
        } catch (_) {}
      }, 5000);
      const guard = setTimeout(() => {
        if (finished) return;
        finished = true;
        clearInterval(keepAlive);
        speakNext();
      }, Math.max(3200, Math.min(14000, chunk.length * 160)));

      const complete = () => {
        if (finished) return;
        finished = true;
        clearTimeout(guard);
        clearInterval(keepAlive);
        if (token !== currentSpeakToken) return;
        setTimeout(speakNext, 90);
      };

      utter.onend = complete;
      utter.onerror = complete;

      try {
        window.speechSynthesis.speak(utter);
      } catch (_) {
        complete();
      }
    };

    // Chờ cancel() hoàn tất rồi mới speak để tránh bị nuốt câu đầu.
    setTimeout(speakNext, 60);
  }

  function speakCloud(text, token, onDone) {
    const chunks = splitIntoChunks(text, CLOUD_CHUNK_LIMIT);
    if (!chunks.length) {
      emitSpeakState(false);
      if (typeof onDone === 'function') onDone();
      return;
    }

    let index = 0;

    const fallbackToBrowser = (fromIndex) => {
      if (token !== currentSpeakToken) return;
      if (hasVietnameseVoice() || getVoices().length === 0) {
        speakWithBrowser(chunks.slice(fromIndex).join(' '), token, onDone, { allowLangFallback: true });
      } else {
        emitWarning(
          'Không tải được giọng đọc Cloud Tiếng Việt. Bot sẽ hiển thị phụ đề để mọi người vẫn theo dõi ván chơi.'
        );
        finishSilently(chunks.slice(fromIndex).join(' '), token, onDone);
      }
    };

    const playChunk = (endpointIndex) => {
      if (token !== currentSpeakToken) return;
      if (index >= chunks.length) {
        emitSpeakState(false);
        if (typeof onDone === 'function') onDone();
        return;
      }

      const chunk = chunks[index];
      const urls = cloudUrls(chunk);
      const url = urls[endpointIndex] || urls[0];

      // Dùng lại MỘT thẻ Audio cho mọi câu. Trên iOS/Safari, thẻ đã được
      // "mở khóa" bởi lần chạm đầu tiên sẽ phát được các câu tiếp theo ổn định hơn.
      if (!cloudAudioEl) cloudAudioEl = new Audio();
      const audio = cloudAudioEl;
      try {
        audio.pause();
      } catch (_) {}
      audio.onended = null;
      audio.onerror = null;
      audio.onloadedmetadata = null;
      audio.muted = false;
      audio.src = url;
      audio.preload = 'auto';
      audio.referrerPolicy = 'no-referrer';
      audio.playbackRate = config.rate;
      audio.preservesPitch = true;
      currentAudioEl = audio;

      let handled = false;
      let guardTimer = setTimeout(() => {
        if (handled || token !== currentSpeakToken) return;
        handled = true;
        try {
          audio.pause();
        } catch (_) {}
        currentAudioEl = null;
        if (endpointIndex + 1 < Math.min(2, urls.length)) {
          playChunk(endpointIndex + 1);
        } else {
          fallbackToBrowser(index);
        }
      }, Math.max(3200, Math.min(5500, 2400 + chunk.length * 14)));

      // Khi đã có metadata, canh thời gian chính xác theo độ dài file thật.
      audio.onloadedmetadata = () => {
        if (handled || token !== currentSpeakToken) return;
        const duration = Number(audio.duration);
        if (!Number.isFinite(duration) || duration <= 0) return;
        clearTimeout(guardTimer);
        const rate = Math.max(0.7, config.rate || 1);
        guardTimer = setTimeout(() => {
          if (handled || token !== currentSpeakToken) return;
          handled = true;
          try {
            audio.pause();
          } catch (_) {}
          currentAudioEl = null;
          fallbackToBrowser(index);
        }, Math.ceil((duration * 1000) / rate) + 2200);
      };

      const stepForward = () => {
        if (handled || token !== currentSpeakToken) return;
        handled = true;
        clearTimeout(guardTimer);
        currentAudioEl = null;
        index += 1;
        // Nhịp nghỉ nhỏ giữa các câu để giọng đọc tự nhiên như người kể chuyện
        setTimeout(() => playChunk(0), 130);
      };

      audio.onended = stepForward;

      const tryNextEndpoint = () => {
        if (handled || token !== currentSpeakToken) return;
        handled = true;
        clearTimeout(guardTimer);
        currentAudioEl = null;
        if (endpointIndex + 1 < urls.length) {
          playChunk(endpointIndex + 1);
        } else {
          fallbackToBrowser(index);
        }
      };

      audio.onerror = tryNextEndpoint;

      try {
        audio.load();
      } catch (_) {}

      const playPromise = audio.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {
          // Autoplay bị chặn: nếu có giọng vi thì dùng Web Speech ngay
          if (handled) return;
          handled = true;
          clearTimeout(guardTimer);
          currentAudioEl = null;
          if (hasVietnameseVoice()) {
            speakWithBrowser(chunks.slice(index).join(' '), token, onDone);
          } else {
            // Chờ lần chạm tiếp theo của người dùng
            emitWarning('Trình duyệt đang chặn tự động phát âm thanh. Hãy chạm vào màn hình một lần.');
            finishSilently(chunks.slice(index).join(' '), token, onDone);
          }
        });
      }
    };

    playChunk(0);
  }

  // ==================== API ĐỌC CHÍNH ====================
  function speak(text, onEndOrOpts) {
    const opts =
      typeof onEndOrOpts === 'function'
        ? { onEnd: onEndOrOpts }
        : onEndOrOpts && typeof onEndOrOpts === 'object'
        ? onEndOrOpts
        : {};
    const onEnd = typeof opts.onEnd === 'function' ? opts.onEnd : null;
    const onStart = typeof opts.onStart === 'function' ? opts.onStart : null;
    const onError = typeof opts.onError === 'function' ? opts.onError : null;

    stopSpeech();
    const token = currentSpeakToken;
    const done = () => {
      if (token !== currentSpeakToken) return;
      emitSpeakState(false);
      if (onEnd) onEnd();
    };

    if (!config.voice && !opts.forceSpeak) {
      emitWarning('Giọng đọc đang TẮT. Mở “Giọng & Âm thanh” và tích “Bật giọng đọc Tiếng Việt” để Bot đọc bài.');
      finishSilently(text || '', token, onEnd);
      return;
    }

    if (!text && !opts.promptKey && !opts.audioFile) {
      finishSilently('', token, onEnd);
      return;
    }

    emitSpeakState(true);
    try {
      ensureContext();
      if (typeof window !== 'undefined' && window.VoicePack && typeof window.VoicePack.unlock === 'function') {
        window.VoicePack.unlock(ctx);
      }
    } catch (_) {}

    const fallbackToV33 = () => {
      if (token !== currentSpeakToken) return;
      if (!text) {
        if (onError) onError(new Error('Không có văn bản dự phòng'));
        finishSilently('', token, done);
        return;
      }
      if (onStart) {
        try {
          onStart();
        } catch (_) {}
      }
      if (opts.preferBrowser || config.mode === 'browser') {
        if (hasVietnameseVoice() || getVoices().length === 0 || opts.allowLangFallback) {
          speakWithBrowser(text, token, done, { allowLangFallback: Boolean(opts.allowLangFallback) });
        } else {
          speakCloud(text, token, done);
        }
        return;
      }
      if (config.mode === 'cloud') {
        speakCloud(text, token, done);
        return;
      }
      // Chế độ tự động / fallback từ Studio: ưu tiên Neural Tiếng Việt (Edge), sau đó Cloud, cuối cùng giọng Việt trình duyệt.
      const bestVoice = findBestVietnameseVoice();
      const isNeural = Boolean(bestVoice && /natural|neural|online/i.test(bestVoice.name));
      if (bestVoice && (isNeural || config.manualVoice)) {
        speakWithBrowser(text, token, done);
        return;
      }
      speakCloud(text, token, done);
    };

    const vp = typeof window !== 'undefined' ? window.VoicePack : null;
    const explicitV33 =
      Boolean(opts.preferBrowser) ||
      opts.voiceKey === 'v33_online' ||
      opts.voiceKey === 'browser' ||
      opts.voiceKey === 'cloud' ||
      opts.voiceKey === 'auto_neural';
    const isStudioConfig = config.mode === 'studio_female' || config.mode === 'studio_male';
    const isStudioArg = Boolean(vp && typeof vp.isStudioMode === 'function' && vp.isStudioMode(opts.voiceKey));

    if (!opts.forceFallback && !explicitV33 && vp && (isStudioConfig || isStudioArg)) {
      let matched = null;
      if (opts.promptKey || opts.audioFile) {
        matched = {
          key: opts.promptKey || 'custom',
          dramaticReveal: Boolean(opts.dramaticReveal || Number(opts.dramaticPauseMs) > 0)
        };
      } else if (typeof vp.matchPromptKey === 'function') {
        matched = vp.matchPromptKey(text);
      }

      if (matched && (opts.audioFile || typeof vp.hasPrompt !== 'function' || vp.hasPrompt(matched.key, opts.voiceKey || config.mode))) {
        const useDramatic = Boolean(matched.dramaticReveal || Number(opts.dramaticPauseMs) > 0);
        const pauseMs = Number(opts.dramaticPauseMs) > 0 ? Number(opts.dramaticPauseMs) : 800;
        const followUps = Array.isArray(opts.followUpKeys) ? opts.followUpKeys.filter(Boolean) : [];
        let followIndex = 0;

        const playFollowUpOrFinish = () => {
          if (token !== currentSpeakToken) return;
          while (
            followIndex < followUps.length &&
            typeof vp.hasPrompt === 'function' &&
            !vp.hasPrompt(followUps[followIndex], opts.voiceKey || config.mode)
          ) {
            followIndex += 1;
          }
          if (followIndex < followUps.length) {
            const nextKey = followUps[followIndex];
            followIndex += 1;
            vp.playPrompt(nextKey, {
              voiceKey: opts.voiceKey || config.mode,
              rate: config.rate,
              onEnd: playFollowUpOrFinish,
              onError: playFollowUpOrFinish
            });
            return;
          }
          done();
        };

        vp.playPrompt(matched.key, {
          voiceKey: opts.voiceKey || config.mode,
          audioFile: opts.audioFile,
          rate: config.rate,
          onStart: () => {
            if (token !== currentSpeakToken) return;
            if (onStart) onStart();
          },
          onEnd: () => {
            if (token !== currentSpeakToken) return;
            if (useDramatic) {
              playHeartbeat();
              scheduleDramaticTimer(playFollowUpOrFinish, pauseMs, token);
            } else {
              playFollowUpOrFinish();
            }
          },
          onError: () => {
            if (token !== currentSpeakToken) return;
            fallbackToV33();
          }
        });
        return;
      }
    }

    fallbackToV33();
  }

  // ==================== ÂM THANH TỔNG HỢP ====================
  function playTone(freq, duration, type = 'sine', volume = 0.2, delay = 0, destination = null) {
    if (!config.sfx) return;
    const ac = ensureContext();
    if (!ac) return;
    const now = ac.currentTime + delay;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(destination || masterSfx || ac.destination);
    osc.start(now);
    osc.stop(now + duration + 0.06);
  }

  function playNoise(duration, volume = 0.2, filterFreq = 1800, delay = 0, type = 'lowpass') {
    if (!config.sfx) return;
    const ac = ensureContext();
    if (!ac) return;
    const now = ac.currentTime + delay;
    const len = Math.floor(ac.sampleRate * duration);
    const buffer = ac.createBuffer(1, Math.max(1, len), ac.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ac.sampleRate * (duration / 3)));
    }
    const src = ac.createBufferSource();
    src.buffer = buffer;
    const filter = ac.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(filterFreq, now);
    const gain = ac.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(masterSfx || ac.destination);
    src.start(now);
  }

  function playWolfHowl() {
    // Chuông đêm êm dịu — không còn tiếng sói hú rợn người
    playTone(392.0, 0.3, 'sine', 0.12, 0);
    playTone(523.25, 0.4, 'sine', 0.1, 0.14);
    playTone(659.25, 0.55, 'sine', 0.07, 0.3);
  }

  function playRoosterDawn() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      playTone(f, i === 3 ? 0.9 : 0.34, 'triangle', 0.17, i * 0.15);
      playTone(f * 2, 0.18, 'sine', 0.04, i * 0.15 + 0.02);
    });
    playNoise(0.5, 0.03, 3200, 0.05, 'highpass');
  }

  function playNightAmbience() {
    playTone(220, 0.7, 'sine', 0.11, 0);
    playTone(196, 0.75, 'sine', 0.11, 0.28);
    playTone(146.83, 1.0, 'triangle', 0.1, 0.6);
    playNoise(1.4, 0.02, 700, 0.1, 'lowpass');
  }

  function playHeartbeat() {
    playTone(72, 0.16, 'sine', 0.3, 0);
    playTone(58, 0.22, 'sine', 0.24, 0.2);
    playTone(72, 0.14, 'sine', 0.2, 0.42);
  }

  function playWitchPotion() {
    [392, 493.88, 587.33].forEach((f, idx) => {
      playTone(f, 0.22, 'sine', 0.1, idx * 0.09);
    });
    playNoise(0.35, 0.03, 2400, 0.1, 'highpass');
  }

  function playWitchSave() {
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    notes.forEach((f, idx) => {
      playTone(f, 0.38, 'triangle', 0.16, idx * 0.09);
      playTone(f * 1.5, 0.28, 'sine', 0.06, idx * 0.09 + 0.03);
    });
  }

  function playWitchPoison() {
    if (!config.sfx) return;
    const ac = ensureContext();
    if (!ac) return;
    const now = ac.currentTime;

    [0, 0.06, 0.12].forEach((offset, idx) => {
      const len = Math.floor(ac.sampleRate * 0.1);
      const buf = ac.createBuffer(1, len, ac.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ac.sampleRate * 0.026));
      }
      const src = ac.createBufferSource();
      src.buffer = buf;
      const bp = ac.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(2300 + idx * 950, now + offset);
      bp.Q.setValueAtTime(2.5, now + offset);
      const g = ac.createGain();
      g.gain.setValueAtTime(0.3, now + offset);
      g.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.09);
      src.connect(bp);
      bp.connect(g);
      g.connect(masterSfx || ac.destination);
      src.start(now + offset);
    });

    const osc = ac.createOscillator();
    const lp = ac.createBiquadFilter();
    const gain = ac.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(380, now + 0.08);
    osc.frequency.exponentialRampToValueAtTime(92, now + 0.72);
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(920, now + 0.08);
    lp.frequency.exponentialRampToValueAtTime(230, now + 0.72);
    gain.gain.setValueAtTime(0.001, now + 0.08);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.14);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.78);
    osc.connect(lp);
    lp.connect(gain);
    gain.connect(masterSfx || ac.destination);
    osc.start(now + 0.08);
    osc.stop(now + 0.8);

    [0.18, 0.3, 0.44].forEach((delay, i) => {
      playTone(320 - i * 45, 0.12, 'sine', 0.13, delay);
    });
  }

  function playHunterShot() {
    playNoise(0.4, 0.42, 1400, 0, 'lowpass');
    playTone(90, 0.35, 'sine', 0.3, 0);
    playTone(55, 0.5, 'triangle', 0.22, 0.04);
    playNoise(0.12, 0.16, 3800, 0.01, 'highpass');
  }

  function playVoteGavel() {
    playTone(300, 0.12, 'square', 0.1, 0);
    playTone(196, 0.34, 'triangle', 0.18, 0.08);
    playTone(98, 0.4, 'sine', 0.18, 0.1);
    playNoise(0.16, 0.08, 700, 0.02, 'lowpass');
  }

  function playVictory() {
    const melody = [
      [523.25, 0], [659.25, 0.14], [783.99, 0.28], [1046.5, 0.42],
      [987.77, 0.62], [1046.5, 0.76], [1318.5, 0.94]
    ];
    melody.forEach(([f, d]) => {
      playTone(f, 0.5, 'triangle', 0.17, d);
      playTone(f * 1.5, 0.3, 'sine', 0.05, d + 0.02);
    });
    playTone(261.63, 1.4, 'sine', 0.08, 1.0);
    playTone(392, 1.4, 'sine', 0.06, 1.0);
  }

  function playTick() {
    playTone(920, 0.05, 'sine', 0.07, 0);
  }

  function playUi() {
    playTone(660, 0.05, 'sine', 0.035, 0);
  }

  function playCardFlip() {
    playNoise(0.12, 0.08, 2800, 0, 'highpass');
    playTone(880, 0.09, 'sine', 0.05, 0.03);
    playTone(1320, 0.12, 'sine', 0.03, 0.1);
  }

  function playRoleReveal() {
    [523.25, 659.25, 880, 1174.66].forEach((f, i) => {
      playTone(f, 0.4, 'sine', 0.055, i * 0.06);
    });
    playNoise(0.4, 0.025, 4200, 0.02, 'highpass');
  }

  function playDeath() {
    playTone(140, 1.2, 'sawtooth', 0.09, 0);
    playTone(70, 1.5, 'sine', 0.2, 0.04);
    playTone(46, 1.6, 'sine', 0.16, 0.1);
    playNoise(0.9, 0.08, 500, 0.02, 'lowpass');
  }

  function playJoin() {
    playTone(587.33, 0.16, 'sine', 0.08, 0);
    playTone(880, 0.24, 'sine', 0.07, 0.09);
  }

  function playStart() {
    [392, 523.25, 659.25, 783.99].forEach((f, i) => {
      playTone(f, 0.5, 'triangle', 0.1, i * 0.09);
    });
    playNoise(0.5, 0.03, 3000, 0.05, 'highpass');
  }

  function playElimination() {
    playVoteGavel();
    setTimeout(() => playDeath(), 120);
  }

  function playRoundSwell() {
    playTone(261.63, 0.7, 'sine', 0.06, 0);
    playTone(329.63, 0.8, 'sine', 0.05, 0.1);
    playTone(392, 0.9, 'sine', 0.04, 0.2);
  }

  // ==================== NHẠC NỀN KHÔNG GIAN ====================
  function stopNightAmbience() {
    if (!nightBed) return;
    const bed = nightBed;
    nightBed = null;
    try {
      const now = bed.ac.currentTime;
      bed.gain.gain.cancelScheduledValues(now);
      bed.gain.gain.setValueAtTime(Math.max(0.0001, bed.gain.gain.value), now);
      bed.gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);
      bed.nodes.forEach((n) => {
        try {
          n.stop(now + 1);
        } catch (_) {}
      });
      setTimeout(() => {
        try {
          bed.gain.disconnect();
        } catch (_) {}
      }, 1200);
    } catch (_) {}
  }

  function startNightAmbience() {
    if (!config.sfx || !config.ambient) return;
    const ac = ensureContext();
    if (!ac) return;
    stopNightAmbience();

    const gain = ac.createGain();
    gain.gain.setValueAtTime(0.0001, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.075, ac.currentTime + 2.2);
    gain.connect(masterSfx || ac.destination);

    const nodes = [];

    // Lớp trầm ấm (drone)
    const droneFreqs = [55, 82.41, 110];
    droneFreqs.forEach((f, i) => {
      const osc = ac.createOscillator();
      const g = ac.createGain();
      osc.type = i === 0 ? 'sine' : 'triangle';
      osc.frequency.value = f;
      g.gain.value = i === 0 ? 0.5 : 0.12;
      osc.connect(g);
      g.connect(gain);
      osc.start();
      nodes.push(osc);
    });

    // Lớp gió rất nhẹ
    const noiseLen = Math.floor(ac.sampleRate * 4);
    const buf = ac.createBuffer(1, noiseLen, ac.sampleRate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < noiseLen; i++) {
      last = (last + (Math.random() * 2 - 1) * 0.04) * 0.985;
      data[i] = last;
    }
    const src = ac.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 480;
    const windGain = ac.createGain();
    windGain.gain.value = 0.55;
    src.connect(lp);
    lp.connect(windGain);
    windGain.connect(gain);
    src.start();
    nodes.push(src);

    // LFO làm drone "thở"
    const lfo = ac.createOscillator();
    const lfoGain = ac.createGain();
    lfo.frequency.value = 0.06;
    lfoGain.gain.value = 0.025;
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    lfo.start();
    nodes.push(lfo);

    nightBed = { ac, gain, nodes };
  }

  function playBell() {
    playTone(659.25, 0.35, 'sine', 0.14, 0);
    playTone(987.77, 0.5, 'sine', 0.09, 0.08);
  }

  function playSfx(sfxName) {
    if (!sfxName || typeof sfxName !== 'string') return;
    const key = sfxName.trim().toLowerCase();
    const map = {
      wolf_howl: playWolfHowl,
      bell: playBell,
      vote_tick: playTick,
      tick: playTick,
      heartbeat: playHeartbeat,
      death_chime: playDeath,
      death: playDeath,
      dawn: playRoosterDawn,
      rooster: playRoosterDawn,
      gavel: playVoteGavel,
      vote_gavel: playVoteGavel,
      victory: playVictory,
      card_flip: playCardFlip,
      ui: playUi,
      hunter_shot: playHunterShot,
      witch_save: playWitchSave,
      witch_poison: playWitchPoison,
      witch_potion: playWitchPotion,
      night: playNightAmbience,
      role_reveal: playRoleReveal,
      elimination: playElimination,
      join: playJoin,
      start: playStart
    };
    const fn = map[key];
    if (typeof fn === 'function') fn();
  }

  return {
    unlock,
    getVoices,
    getVietnameseVoices,
    hasVietnameseVoice,
    setConfig,
    getConfig,
    speak,
    stopSpeech,
    pauseAll,
    resumeAll,
    pauseAllAudio: pauseAll,
    resumeAllAudio: resumeAll,
    isPaused: () => isPaused,
    isSpeaking: () => isSpeakingState,
    preloadPrompt: (key) => {
      try {
        if (typeof window !== 'undefined' && window.VoicePack && typeof window.VoicePack.preloadKey === 'function') {
          window.VoicePack.preloadKey(key, config.mode);
        }
      } catch (_) {}
    },
    splitIntoChunks,
    playSfx,
    playWolfHowl,
    playNightAmbience,
    startNightAmbience,
    stopNightAmbience,
    playRoosterDawn,
    playHeartbeat,
    playWitchPotion,
    playWitchSave,
    playWitchPoison,
    playHunterShot,
    playVoteGavel,
    playVictory,
    playTick,
    playUi,
    playCardFlip,
    playRoleReveal,
    playDeath,
    playJoin,
    playStart,
    playElimination,
    playRoundSwell
  };
})();
(typeof window !== 'undefined' ? window : globalThis).AppAudio = (
  typeof window !== 'undefined' ? window : globalThis
).AudioEngine;
