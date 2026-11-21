// js/audio-voicepack.js — Bộ phát tệp giọng đọc Quản Trò thu sẵn [V1] v4.0 (VieNeu-TTS v3 Turbo)
(typeof window !== 'undefined' ? window : globalThis).VoicePack = (() => {
  'use strict';

  const STORAGE_KEY = 'hq_voice_mode';
  const ESSENTIAL_KEYS = ['night_start', 'morning_peaceful', 'vote_start', 'call_werewolf'];

  let manifest = null;
  let currentMode = 'female_ngochuyen';
  let currentAudio = null;
  let isPaused = false;
  const audioCache = {};

  function normalizeVoiceKey(mode) {
    if (mode === 'studio_male' || mode === 'male_thientamduc') {
      return 'male_thientamduc';
    }
    return 'female_ngochuyen';
  }

  function isStudioMode(mode) {
    return (
      mode === 'studio_female' ||
      mode === 'studio_male' ||
      mode === 'female_ngochuyen' ||
      mode === 'male_thientamduc'
    );
  }

  function preloadEssentialVoices() {
    if (!manifest || !manifest.voices || typeof Audio !== 'function') return;
    const voice = manifest.voices[normalizeVoiceKey(currentMode)];
    if (!voice || !voice.files) return;

    ESSENTIAL_KEYS.forEach((key) => {
      const url = voice.files[key];
      if (url && !audioCache[url]) {
        try {
          const a = new Audio();
          a.preload = 'auto';
          a.src = url;
          audioCache[url] = a;
        } catch (_) {}
      }
    });
  }

  function init() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (saved) currentMode = normalizeVoiceKey(saved);
      }
    } catch (_) {}

    if (typeof fetch !== 'function') return Promise.resolve(null);

    return fetch('assets/voices/manifest.json')
      .then((res) => (res && res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.voices) {
          manifest = data;
          preloadEssentialVoices();
        }
        return manifest;
      })
      .catch(() => null);
  }

  function setVoiceMode(mode) {
    currentMode = normalizeVoiceKey(mode);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(STORAGE_KEY, currentMode);
      }
    } catch (_) {}
    preloadEssentialVoices();
    return currentMode;
  }

  function getVoiceMode() {
    return currentMode;
  }

  function getManifest() {
    return manifest;
  }

  function getUrl(promptKey, voiceKey) {
    if (!promptKey) return null;
    const vKey = normalizeVoiceKey(voiceKey || currentMode);
    if (manifest && manifest.voices && manifest.voices[vKey] && manifest.voices[vKey].files) {
      const fromManifest = manifest.voices[vKey].files[promptKey];
      if (fromManifest) return fromManifest;
    }
    return `assets/voices/${vKey}/${promptKey}.mp3`;
  }

  function hasPrompt(promptKey, voiceKey) {
    if (!promptKey) return false;
    const vKey = normalizeVoiceKey(voiceKey || currentMode);
    if (manifest && manifest.voices && manifest.voices[vKey] && manifest.voices[vKey].files) {
      if (manifest.voices[vKey].files[promptKey]) return true;
    }
    if (manifest && Array.isArray(manifest.keys)) {
      return manifest.keys.includes(promptKey);
    }
    return false;
  }

  function matchPromptKey(text) {
    if (!text || typeof text !== 'string') return null;
    const t = text.toLowerCase();

    if (t.includes('xin chào cả hội') || t.includes('thử giọng')) {
      return { key: 'test_voice', dramaticReveal: false };
    }
    if (
      t.includes('trời tối rồi') ||
      t.includes('trời đã tối') ||
      t.includes('xin mời tất cả mọi người nhắm mắt') ||
      t.includes('xin mời tất cả mọi người đi ngủ')
    ) {
      return { key: 'night_start', dramaticReveal: false };
    }
    // Câu "… đã chọn xong. Xin mời … nhắm mắt lại." — phải dùng đúng giọng đã chọn
    if (t.includes('nhắm mắt lại') && t.includes('xin mời')) {
      const sleepRoles = [
        ['thần tình yêu', 'sleep_cupid'],
        ['bảo vệ', 'sleep_guard'],
        ['sói đầu đàn', 'sleep_alpha_wolf'],
        ['ma sói', 'sleep_werewolf'],
        ['bầy sói', 'sleep_werewolf'],
        ['tiên tri', 'sleep_seer'],
        ['thám tử', 'sleep_detective'],
        ['phù thủy', 'sleep_witch'],
        ['pháp sư câm', 'sleep_spellcaster'],
        ['sát nhân', 'sleep_serial_killer']
      ];
      const hit = sleepRoles.find(([role]) => t.includes(`xin mời ${role} nhắm mắt`));
      if (hit) return { key: hit[1], dramaticReveal: false };
    }
    if (t.includes('thần tình yêu ơi')) {
      return { key: 'call_cupid', dramaticReveal: false };
    }
    if (t.includes('bảo vệ ơi')) {
      return { key: 'call_guard', dramaticReveal: false };
    }
    // Bắt buộc kiểm tra 'sói đầu đàn ơi' TRƯỚC 'ma sói' / 'bầy sói'
    if (t.includes('sói đầu đàn ơi')) {
      return { key: 'call_alpha_wolf', dramaticReveal: false };
    }
    if (t.includes('ma sói ơi') || t.includes('bầy sói ơi')) {
      return { key: 'call_werewolf', dramaticReveal: false };
    }
    if (t.includes('tiên tri ơi')) {
      return { key: 'call_seer', dramaticReveal: false };
    }
    if (t.includes('phù thủy ơi')) {
      return { key: 'call_witch', dramaticReveal: false };
    }
    if (t.includes('sát nhân độc hành ơi')) {
      return { key: 'call_serial_killer', dramaticReveal: false };
    }
    if (t.includes('pháp sư câm ơi')) {
      return { key: 'call_spellcaster', dramaticReveal: false };
    }
    if (t.includes('thám tử ơi')) {
      return { key: 'call_detective', dramaticReveal: false };
    }
    if (
      (t.includes('bình yên') ||
        t.includes('không có ai bị hại') ||
        t.includes('không ai thiệt mạng') ||
        t.includes('không ai chết')) &&
      t.includes('sáng')
    ) {
      return { key: 'morning_peaceful', dramaticReveal: false };
    }
    if (
      (t.includes('trời đã sáng') || t.includes('bình minh')) &&
      (t.includes('thiệt mạng') ||
        t.includes('ngã xuống') ||
        t.includes('hy sinh') ||
        t.includes('bị hại') ||
        t.includes('ra đi') ||
        t.includes('chết') ||
        t.includes('biến cố'))
    ) {
      return { key: 'morning_deaths_intro', dramaticReveal: true };
    }
    if (t.includes('30 giây') || t.includes('ba mươi giây')) {
      return { key: 'vote_30s', dramaticReveal: false };
    }
    if (t.includes('giờ biểu quyết') || t.includes('bỏ phiếu treo cổ')) {
      return { key: 'vote_start', dramaticReveal: false };
    }
    if (t.includes('phiếu vẫn hòa')) {
      return { key: 'vote_tie_none', dramaticReveal: false };
    }
    if (t.includes('phiếu bị hòa') || t.includes('bỏ phiếu lại')) {
      return { key: 'vote_tie_revote', dramaticReveal: false };
    }
    if (t.includes('không có ai bị treo cổ') || t.includes('không ai bị treo cổ')) {
      return { key: 'day_no_lynch', dramaticReveal: false };
    }
    if (
      (t.includes('giàn treo cổ') || t.includes('bị treo cổ')) &&
      !t.includes('không có ai') &&
      !t.includes('không ai')
    ) {
      return { key: 'vote_eliminated_intro', dramaticReveal: true };
    }
    if ((t.includes('kết thúc') || t.includes('chiến thắng')) && t.includes('thằng ngố')) {
      return { key: 'game_over_jester', dramaticReveal: false };
    }
    if ((t.includes('kết thúc') || t.includes('chiến thắng')) && t.includes('cặp đôi')) {
      return { key: 'game_over_lovers', dramaticReveal: false };
    }
    if ((t.includes('kết thúc') || t.includes('chiến thắng')) && t.includes('sát nhân')) {
      return { key: 'game_over_serial_killer', dramaticReveal: false };
    }
    if (
      (t.includes('kết thúc') || t.includes('chiến thắng')) &&
      (t.includes('phe ma sói') || t.includes('bầy sói') || t.includes('ma sói đã'))
    ) {
      return { key: 'game_over_werewolf', dramaticReveal: false };
    }
    if (
      (t.includes('kết thúc') || t.includes('chiến thắng')) &&
      (t.includes('dân làng') || t.includes('phe dân'))
    ) {
      return { key: 'game_over_villager', dramaticReveal: false };
    }

    return null;
  }

  function cleanupHandlers(audio) {
    if (!audio) return;
    try {
      audio.onplay = null;
      audio.onended = null;
      audio.onerror = null;
    } catch (_) {}
  }

  function stopCurrentAudio() {
    if (currentAudio) {
      const audio = currentAudio;
      currentAudio = null;
      cleanupHandlers(audio);
      try {
        audio.pause();
        audio.currentTime = 0;
      } catch (_) {}
    }
    isPaused = false;
  }

  function playPrompt(promptKey, options = {}) {
    stopCurrentAudio();
    const opts = options || {};
    const onStart = typeof opts.onStart === 'function' ? opts.onStart : () => {};
    const onEnd = typeof opts.onEnd === 'function' ? opts.onEnd : () => {};
    const onError = typeof opts.onError === 'function' ? opts.onError : () => {};

    const audioUrl =
      typeof opts.audioFile === 'string' && opts.audioFile.trim()
        ? opts.audioFile.trim()
        : getUrl(promptKey, opts.voiceKey);

    if (!audioUrl || typeof Audio !== 'function') {
      onError(new Error('Audio unavailable'));
      return;
    }

    let audio = audioCache[audioUrl];
    if (!audio) {
      audio = new Audio(audioUrl);
      audioCache[audioUrl] = audio;
    }

    currentAudio = audio;
    isPaused = false;

    const rate = Math.min(1.5, Math.max(0.7, Number(opts.rate) || 1.0));
    try {
      audio.playbackRate = rate;
      audio.preservesPitch = true;
    } catch (_) {}

    let settled = false;
    let started = false;

    audio.onplay = () => {
      if (settled || currentAudio !== audio || started) return;
      started = true;
      onStart();
    };

    audio.onended = () => {
      if (settled) return;
      settled = true;
      cleanupHandlers(audio);
      if (currentAudio === audio) currentAudio = null;
      isPaused = false;
      onEnd();
    };

    audio.onerror = (err) => {
      if (settled) return;
      settled = true;
      cleanupHandlers(audio);
      if (currentAudio === audio) currentAudio = null;
      isPaused = false;
      onError(err || new Error(`Failed to load audio: ${audioUrl}`));
    };

    try {
      audio.currentTime = 0;
    } catch (_) {}

    try {
      const playPromise = audio.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch((err) => {
          if (settled) return;
          settled = true;
          cleanupHandlers(audio);
          if (currentAudio === audio) currentAudio = null;
          isPaused = false;
          onError(err || new Error('Audio play rejected'));
        });
      }
    } catch (err) {
      if (!settled) {
        settled = true;
        cleanupHandlers(audio);
        if (currentAudio === audio) currentAudio = null;
        isPaused = false;
        onError(err);
      }
    }
  }

  function pauseAll() {
    if (currentAudio && !currentAudio.paused) {
      try {
        currentAudio.pause();
        isPaused = true;
      } catch (_) {}
    }
  }

  function resumeAll() {
    if (currentAudio && isPaused) {
      try {
        isPaused = false;
        const p = currentAudio.play();
        if (p && typeof p.catch === 'function') p.catch(() => {});
      } catch (_) {}
    }
  }

  function isAudioPlaying() {
    return Boolean(currentAudio && !currentAudio.paused);
  }

  if (typeof window !== 'undefined') {
    init();
  }

  return {
    init,
    normalizeVoiceKey,
    isStudioMode,
    setVoiceMode,
    getVoiceMode,
    matchPromptKey,
    playPrompt,
    stopCurrentAudio,
    pauseAll,
    resumeAll,
    isPlaying: isAudioPlaying,
    getManifest,
    getUrl,
    hasPrompt
  };
})();
