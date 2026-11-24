// js/audio-voicepack.js — Bộ phát tệp giọng đọc Quản Trò thu sẵn [V1] v4.0 (VieNeu-TTS v3 Turbo)
// Hỗ trợ phát 0ms qua Web Audio API (AudioBuffer) tránh chặn Autoplay + fallback 1 thẻ <audio> mở khóa sẵn.
(typeof window !== 'undefined' ? window : globalThis).VoicePack = (() => {
  'use strict';

  const STORAGE_KEY = 'hq_voice_mode';
  const SILENT_WAV = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';

  const KNOWN_PROMPT_KEYS = [
    'game_start',
    'night_start',
    'call_cupid',
    'call_guard',
    'call_werewolf',
    'call_alpha_wolf',
    'call_seer',
    'call_witch',
    'call_serial_killer',
    'call_spellcaster',
    'call_detective',
    'sleep_cupid',
    'sleep_guard',
    'sleep_werewolf',
    'sleep_alpha_wolf',
    'sleep_seer',
    'sleep_detective',
    'sleep_witch',
    'sleep_spellcaster',
    'sleep_serial_killer',
    'wolf_nudge',
    'cupid_paired_notice',
    'night_silenced',
    'morning_peaceful',
    'morning_deaths_intro',
    'vote_start',
    'vote_30s',
    'vote_all_done',
    'vote_all_skip',
    'vote_tie_revote',
    'vote_tie_none',
    'vote_eliminated_intro',
    'day_no_lynch',
    'hunter_trigger',
    'hunter_shot',
    'hunter_skip',
    'avenger_trigger',
    'avenger_pull',
    'avenger_skip',
    'sheriff_election',
    'sheriff_elected',
    'sheriff_skipped',
    'sheriff_transfer_prompt',
    'sheriff_transfer',
    'sheriff_transfer_none',
    'last_words',
    'resume_day',
    'game_over_werewolf',
    'game_over_villager',
    'game_over_lovers',
    'game_over_serial_killer',
    'game_over_jester',
    'test_voice'
  ];

  const KNOWN_KEY_SET = new Set(KNOWN_PROMPT_KEYS);
  const ESSENTIAL_KEYS = [
    'game_start',
    'night_start',
    'morning_peaceful',
    'morning_deaths_intro',
    'vote_start',
    'call_werewolf'
  ];

  let manifest = null;
  let currentMode = 'female_ngochuyen';
  let sharedAudioCtx = null;
  let sharedAudioEl = null;
  let audioElUnlocked = false;

  // Trạng thái phát hiện tại
  let playSeq = 0;
  let currentAudio = null; // HTMLAudioElement khi dùng kênh <audio>
  let currentSource = null; // AudioBufferSourceNode khi dùng Web Audio API
  let currentBuffer = null;
  let currentRate = 1.0;
  let currentStartedAt = 0;
  let currentOffsetSec = 0;
  let currentOnEnd = null;
  let currentGuardTimer = null;
  let isPaused = false;

  // Bộ đệm giải mã AudioBuffer theo URL (chỉ lưu khi giải mã thành công)
  const bufferCache = new Map();
  const bufferPending = new Map();

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

  function clearGuardTimer() {
    if (currentGuardTimer) {
      clearTimeout(currentGuardTimer);
      currentGuardTimer = null;
    }
  }

  function ensureSharedAudioEl() {
    if (typeof Audio !== 'function') return null;
    if (!sharedAudioEl) {
      try {
        sharedAudioEl = new Audio();
        sharedAudioEl.preload = 'auto';
      } catch (_) {
        sharedAudioEl = null;
      }
    }
    return sharedAudioEl;
  }

  function unlock(audioCtx) {
    if (audioCtx) {
      sharedAudioCtx = audioCtx;
    } else if (!sharedAudioCtx && typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)) {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        sharedAudioCtx = new AC();
      } catch (_) {}
    }

    if (sharedAudioCtx && sharedAudioCtx.state === 'suspended') {
      try {
        const p = sharedAudioCtx.resume();
        if (p && typeof p.catch === 'function') p.catch(() => {});
      } catch (_) {}
    }

    // Mở khóa duy nhất 1 thẻ <audio> dự phòng trong lúc đang có cử chỉ chạm của người dùng
    if (!audioElUnlocked && !currentAudio) {
      const el = ensureSharedAudioEl();
      if (el) {
        try {
          el.muted = true;
          el.src = SILENT_WAV;
          const p = el.play();
          if (p && typeof p.then === 'function') {
            p.then(() => {
              try {
                el.pause();
                el.currentTime = 0;
                el.muted = false;
                audioElUnlocked = true;
              } catch (_) {}
            }).catch(() => {
              try {
                el.muted = false;
              } catch (_) {}
            });
          } else {
            el.pause();
            el.muted = false;
            audioElUnlocked = true;
          }
        } catch (_) {
          try {
            el.muted = false;
          } catch (_) {}
        }
      }
    }

    preloadEssentialVoices();
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
    if (manifest && Array.isArray(manifest.keys) && manifest.keys.includes(promptKey)) {
      return true;
    }
    return KNOWN_KEY_SET.has(promptKey);
  }

  function loadDecodedBuffer(url) {
    if (!url || !sharedAudioCtx || typeof fetch !== 'function') return Promise.resolve(null);
    if (bufferCache.has(url)) return Promise.resolve(bufferCache.get(url));
    if (bufferPending.has(url)) return bufferPending.get(url);

    const promise = new Promise((resolve) => {
      let done = false;
      const finish = (buf) => {
        if (done) return;
        done = true;
        bufferPending.delete(url);
        if (buf) bufferCache.set(url, buf);
        resolve(buf || null);
      };
      const timer = setTimeout(() => finish(null), 6500);

      fetch(url)
        .then((res) => (res && res.ok ? res.arrayBuffer() : null))
        .then((arrBuf) => {
          if (!arrBuf || !sharedAudioCtx || typeof sharedAudioCtx.decodeAudioData !== 'function') {
            clearTimeout(timer);
            finish(null);
            return;
          }
          return sharedAudioCtx.decodeAudioData(arrBuf.slice(0));
        })
        .then((decoded) => {
          clearTimeout(timer);
          finish(decoded || null);
        })
        .catch(() => {
          clearTimeout(timer);
          finish(null);
        });
    });

    bufferPending.set(url, promise);
    return promise;
  }

  function preloadKey(promptKey, voiceKey) {
    if (!promptKey || !hasPrompt(promptKey, voiceKey)) return;
    const url = getUrl(promptKey, voiceKey);
    if (!url) return;
    if (sharedAudioCtx) {
      loadDecodedBuffer(url);
    }
  }

  function preloadEssentialVoices() {
    if (!sharedAudioCtx) return;
    const vKey = normalizeVoiceKey(currentMode);
    ESSENTIAL_KEYS.forEach((key) => preloadKey(key, vKey));
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

  function matchPromptKey(text) {
    if (!text || typeof text !== 'string') return null;
    const t = text.toLowerCase();

    if (t.includes('xin chào cả hội') || t.includes('thử giọng')) {
      return { key: 'test_voice', dramaticReveal: false };
    }
    if (t.includes('trò chơi ma sói bắt đầu') || t.includes('ván ma sói bắt đầu') || (t.includes('nhấn và giữ thẻ bài') && t.includes('vai trò bí mật'))) {
      return { key: 'game_start', dramaticReveal: false };
    }
    if (t.includes('bot quản trò đã quay lại') || t.includes('tiếp tục thảo luận và bỏ phiếu')) {
      return { key: 'resume_day', dramaticReveal: false };
    }
    if (
      t.includes('trời tối rồi') ||
      t.includes('trời đã tối') ||
      t.includes('xin mời tất cả mọi người nhắm mắt') ||
      t.includes('xin mời tất cả mọi người đi ngủ') ||
      t.includes('tắt đèn đi ngủ') ||
      t.includes('úp mặt xuống bàn') ||
      t.includes('màn đêm đặc quánh') ||
      t.includes('điểm chuông nửa đêm') ||
      t.includes('nhắm mắt lại trước khi bóng tối') ||
      t.includes('mời tất cả nhắm mắt')
    ) {
      return { key: 'night_start', dramaticReveal: false };
    }

    // Câu gọi đi ngủ của từng vai trò
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

    if (
      t.includes('thống nhất chọn một con mồi') ||
      t.includes('chốt nhanh nạn nhân') ||
      t.includes('chưa thống nhất con mồi')
    ) {
      return { key: 'wolf_nudge', dramaticReveal: false };
    }
    if (t.includes('thần tình yêu đã se duyên') && !t.includes('nhắm mắt')) {
      return { key: 'cupid_paired_notice', dramaticReveal: false };
    }

    // Gọi thức dậy từng vai trò (hỗ trợ cả 4 chủ đề cốt truyện)
    if (t.includes('thần tình yêu ơi') || (t.includes('thần tình yêu') && t.includes('se duyên') && !t.includes('nhắm mắt'))) {
      return { key: 'call_cupid', dramaticReveal: false };
    }
    if (t.includes('bảo vệ ơi') || t.includes('người gác đêm ơi') || t.includes('vệ sĩ tận tụy ơi')) {
      return { key: 'call_guard', dramaticReveal: false };
    }
    // Bắt buộc kiểm tra Sói Đầu Đàn TRƯỚC Ma Sói / Bầy Sói
    if (t.includes('sói đầu đàn') || t.includes('chủ nhân bóng tối đầu đàn')) {
      return { key: 'call_alpha_wolf', dramaticReveal: false };
    }
    if (
      t.includes('ma sói ơi') ||
      t.includes('bầy sói ơi') ||
      t.includes('bầy sói đói khát') ||
      t.includes('mặt nạ sói')
    ) {
      return { key: 'call_werewolf', dramaticReveal: false };
    }
    if (t.includes('tiên tri ơi') || t.includes('tiên tri nơi tháp chuông') || t.includes('nhà chiêm tinh ơi')) {
      return { key: 'call_seer', dramaticReveal: false };
    }
    if (t.includes('thám tử ơi') || t.includes('thám tử lừng danh ơi')) {
      return { key: 'call_detective', dramaticReveal: false };
    }
    if (t.includes('phù thủy ơi') || t.includes('phù thủy trong căn chòi') || t.includes('bậc thầy độc dược ơi')) {
      return { key: 'call_witch', dramaticReveal: false };
    }
    if (t.includes('pháp sư câm ơi')) {
      return { key: 'call_spellcaster', dramaticReveal: false };
    }
    if (
      t.includes('sát nhân độc hành ơi') ||
      t.includes('sát nhân ơi') ||
      t.includes('kẻ sát nhân ẩn mình') ||
      t.includes('sát thủ lạnh lùng ơi')
    ) {
      return { key: 'call_serial_killer', dramaticReveal: false };
    }

    // Thợ Săn & Kẻ Báo Thù
    if (t.includes('kẻ báo thù') && (t.includes('chọn 1 người') || t.includes('chọn một người') || t.includes('khoan đã'))) {
      return { key: 'avenger_trigger', dramaticReveal: false };
    }
    if (t.includes('kẻ báo thù') && t.includes('không kéo theo ai')) {
      return { key: 'avenger_skip', dramaticReveal: false };
    }
    if (t.includes('kẻ báo thù') && (t.includes('kéo theo') || t.includes('lời nguyền'))) {
      return { key: 'avenger_pull', dramaticReveal: false };
    }
    if (t.includes('thợ săn') && (t.includes('hô bắn') || t.includes('khoan đã'))) {
      return { key: 'hunter_trigger', dramaticReveal: false };
    }
    if (t.includes('thợ săn') && t.includes('không bắn ai')) {
      return { key: 'hunter_skip', dramaticReveal: false };
    }
    if (t.includes('thợ săn') && (t.includes('bắn hạ') || t.includes('đoàng') || t.includes('bóp cò') || t.includes('viên đạn'))) {
      return { key: 'hunter_shot', dramaticReveal: false };
    }

    // Trưởng Làng [G1]
    if (t.includes('đến lúc bầu trưởng làng') || t.includes('bầu trưởng làng đang hòa') || t.includes('bầu chọn trưởng làng')) {
      return { key: 'sheriff_election', dramaticReveal: false };
    }
    if (t.includes('không bầu trưởng làng')) {
      return { key: 'sheriff_skipped', dramaticReveal: false };
    }
    if (t.includes('trao lại huy hiệu trưởng làng cho một người') || (t.includes('trưởng làng') && t.includes('đã ngã xuống'))) {
      return { key: 'sheriff_transfer_prompt', dramaticReveal: false };
    }
    if (t.includes('huy hiệu trưởng làng đã bị hủy')) {
      return { key: 'sheriff_transfer_none', dramaticReveal: false };
    }
    if (t.includes('trao lại huy hiệu') || t.includes('trao lại chiếc nhẫn') || t.includes('ném lại chiếc ghế')) {
      return { key: 'sheriff_transfer', dramaticReveal: false };
    }
    if (t.includes('trưởng làng') && (t.includes('1,5 phiếu') || t.includes('1.5 phiếu') || t.includes('chức trưởng làng'))) {
      return { key: 'sheriff_elected', dramaticReveal: false };
    }

    // Lời Trăng Trối [G2]
    if (t.includes('trăng trối')) {
      return { key: 'last_words', dramaticReveal: false };
    }

    // Pháp Sư Câm khóa miệng độc lập
    if (t.includes('khóa miệng') && !t.includes('trời đã sáng') && !t.includes('trời sáng')) {
      return { key: 'night_silenced', dramaticReveal: false };
    }

    // Bình minh yên bình / có người chết
    if (
      (t.includes('bình yên') ||
        t.includes('không có ai bị hại') ||
        t.includes('không ai thiệt mạng') ||
        t.includes('không có ai thiệt mạng') ||
        t.includes('không có giọt máu') ||
        t.includes('an toàn tuyệt đối') ||
        t.includes('không ai phải ra ngoài') ||
        t.includes('không có án mạng')) &&
      (t.includes('sáng') || t.includes('bình minh') || t.includes('rạng') || t.includes('đêm qua') || t.includes('tối qua') || t.includes('đêm liên tiếp'))
    ) {
      return { key: 'morning_peaceful', dramaticReveal: false };
    }
    if (
      (t.includes('trời đã sáng') || t.includes('trời sáng') || t.includes('bình minh') || t.includes('đêm qua') || t.includes('sương máu') || t.includes('hiện trường vụ án')) &&
      (t.includes('thiệt mạng') ||
        t.includes('ngã xuống') ||
        t.includes('hy sinh') ||
        t.includes('bị hại') ||
        t.includes('ra đi') ||
        t.includes('chết') ||
        t.includes('biến cố') ||
        t.includes('nạn nhân') ||
        t.includes('bay màu') ||
        t.includes('biến căng'))
    ) {
      return { key: 'morning_deaths_intro', dramaticReveal: true };
    }

    // Biểu quyết & Treo cổ
    if (t.includes('30 giây') || t.includes('ba mươi giây')) {
      return { key: 'vote_30s', dramaticReveal: false };
    }
    if (t.includes('tất cả đã bỏ phiếu') || t.includes('tất cả mọi người đã bỏ phiếu')) {
      return { key: 'vote_all_done', dramaticReveal: false };
    }
    if (t.includes('đa số bỏ phiếu trắng') || t.includes('đa số đã bỏ phiếu trắng')) {
      return { key: 'vote_all_skip', dramaticReveal: false };
    }
    if (t.includes('giờ biểu quyết') || t.includes('bỏ phiếu treo cổ') || t.includes('phiên điều trần') || t.includes('chỉ mặt đặt tên')) {
      return { key: 'vote_start', dramaticReveal: false };
    }
    if (t.includes('phiếu vẫn hòa') || t.includes('hòa phiếu lần nữa') || t.includes('bế tắc hoàn toàn')) {
      return { key: 'vote_tie_none', dramaticReveal: false };
    }
    if (t.includes('phiếu bị hòa') || t.includes('bỏ phiếu lại') || t.includes('hòa phiếu giữa')) {
      return { key: 'vote_tie_revote', dramaticReveal: false };
    }
    if (t.includes('không có ai bị treo cổ') || t.includes('không ai bị treo cổ') || t.includes('chưa tìm ra hung thủ')) {
      return { key: 'day_no_lynch', dramaticReveal: false };
    }
    if (
      (t.includes('giàn treo cổ') || t.includes('bị treo cổ') || t.includes('treo cổ ') || t.includes('kết án và đưa khỏi') || t.includes('tiễn ')) &&
      !t.includes('không có ai') &&
      !t.includes('không ai') &&
      !t.includes('thằng ngố') &&
      !t.includes('kẻ báo thù')
    ) {
      return { key: 'vote_eliminated_intro', dramaticReveal: true };
    }

    // Kết thúc ván
    if ((t.includes('kết thúc') || t.includes('chiến thắng') || t.includes('thắng')) && t.includes('thằng ngố')) {
      return { key: 'game_over_jester', dramaticReveal: false };
    }
    if ((t.includes('kết thúc') || t.includes('chiến thắng') || t.includes('thắng')) && t.includes('cặp đôi')) {
      return { key: 'game_over_lovers', dramaticReveal: false };
    }
    if ((t.includes('kết thúc') || t.includes('chiến thắng') || t.includes('thắng')) && (t.includes('sát nhân') || t.includes('sát thủ'))) {
      return { key: 'game_over_serial_killer', dramaticReveal: false };
    }
    if (
      (t.includes('kết thúc') || t.includes('chiến thắng') || t.includes('thắng')) &&
      (t.includes('phe ma sói') || t.includes('bầy sói') || t.includes('ma sói đã'))
    ) {
      return { key: 'game_over_werewolf', dramaticReveal: false };
    }
    if (
      (t.includes('kết thúc') || t.includes('chiến thắng') || t.includes('thắng')) &&
      (t.includes('dân làng') || t.includes('phe dân'))
    ) {
      return { key: 'game_over_villager', dramaticReveal: false };
    }

    return null;
  }

  function cleanupElementHandlers(audio) {
    if (!audio) return;
    try {
      audio.onplay = null;
      audio.onended = null;
      audio.onerror = null;
      audio.onloadedmetadata = null;
    } catch (_) {}
  }

  function stopCurrentAudio() {
    playSeq += 1;
    clearGuardTimer();
    isPaused = false;
    currentBuffer = null;
    currentOffsetSec = 0;
    currentOnEnd = null;

    if (currentSource) {
      const src = currentSource;
      currentSource = null;
      try {
        src.onended = null;
        src.stop(0);
      } catch (_) {}
      try {
        src.disconnect();
      } catch (_) {}
    }

    if (currentAudio) {
      const audio = currentAudio;
      currentAudio = null;
      cleanupElementHandlers(audio);
      try {
        audio.pause();
        audio.currentTime = 0;
      } catch (_) {}
    }
  }

  function startBufferPlayback(buf, offsetSec, rate, seq, onStart, onEnd) {
    if (seq !== playSeq || !sharedAudioCtx || !buf) return false;
    try {
      if (sharedAudioCtx.state === 'suspended') {
        const rp = sharedAudioCtx.resume();
        if (rp && typeof rp.catch === 'function') rp.catch(() => {});
      }
      const src = sharedAudioCtx.createBufferSource();
      src.buffer = buf;
      src.playbackRate.value = rate;
      src.connect(sharedAudioCtx.destination);

      currentSource = src;
      currentBuffer = buf;
      currentRate = rate;
      currentOffsetSec = Math.max(0, offsetSec || 0);
      currentStartedAt = sharedAudioCtx.currentTime;
      currentOnEnd = onEnd;
      isPaused = false;

      let finished = false;
      const done = () => {
        if (finished || seq !== playSeq) return;
        finished = true;
        clearGuardTimer();
        if (currentSource === src) {
          currentSource = null;
          currentBuffer = null;
          currentOnEnd = null;
        }
        isPaused = false;
        onEnd();
      };

      src.onended = () => {
        if (isPaused) return;
        done();
      };

      const remainingSec = Math.max(0.05, (buf.duration - currentOffsetSec) / Math.max(0.5, rate));
      clearGuardTimer();
      currentGuardTimer = setTimeout(() => {
        if (!isPaused) done();
      }, Math.ceil(remainingSec * 1000) + 2000);

      src.start(0, currentOffsetSec);
      onStart();
      return true;
    } catch (_) {
      return false;
    }
  }

  function playViaAudioElement(audioUrl, rate, seq, onStart, onEnd, onError) {
    const audio = ensureSharedAudioEl();
    if (!audio || seq !== playSeq) {
      onError(new Error('Audio element unavailable'));
      return;
    }

    cleanupElementHandlers(audio);
    try {
      audio.pause();
    } catch (_) {}

    currentAudio = audio;
    isPaused = false;

    let settled = false;
    let started = false;

    const fail = (err) => {
      if (settled || seq !== playSeq) return;
      settled = true;
      clearGuardTimer();
      cleanupElementHandlers(audio);
      if (currentAudio === audio) currentAudio = null;
      isPaused = false;
      onError(err || new Error(`Failed to play: ${audioUrl}`));
    };

    const complete = () => {
      if (settled || seq !== playSeq) return;
      settled = true;
      clearGuardTimer();
      cleanupElementHandlers(audio);
      if (currentAudio === audio) currentAudio = null;
      isPaused = false;
      onEnd();
    };

    clearGuardTimer();
    currentGuardTimer = setTimeout(() => {
      if (!isPaused) fail(new Error(`Audio timeout: ${audioUrl}`));
    }, 9000);

    audio.onloadedmetadata = () => {
      if (settled || seq !== playSeq) return;
      const dur = Number(audio.duration);
      if (Number.isFinite(dur) && dur > 0) {
        clearGuardTimer();
        currentGuardTimer = setTimeout(() => {
          if (!isPaused) complete();
        }, Math.ceil((dur * 1000) / Math.max(0.5, rate)) + 2600);
      }
    };

    audio.onplay = () => {
      if (settled || seq !== playSeq || started) return;
      started = true;
      audioElUnlocked = true;
      onStart();
    };

    audio.onended = complete;
    audio.onerror = (err) => fail(err || new Error(`Failed to load audio: ${audioUrl}`));

    try {
      audio.muted = false;
      audio.src = audioUrl;
      audio.playbackRate = rate;
      audio.preservesPitch = true;
      audio.currentTime = 0;
    } catch (_) {}

    try {
      const playPromise = audio.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch((err) => fail(err || new Error('Audio play rejected')));
      }
    } catch (err) {
      fail(err);
    }
  }

  function playPrompt(promptKey, options = {}) {
    stopCurrentAudio();
    const seq = playSeq;
    const opts = options || {};
    const onStart = typeof opts.onStart === 'function' ? opts.onStart : () => {};
    const onEnd = typeof opts.onEnd === 'function' ? opts.onEnd : () => {};
    const onError = typeof opts.onError === 'function' ? opts.onError : () => {};

    const audioUrl =
      typeof opts.audioFile === 'string' && opts.audioFile.trim()
        ? opts.audioFile.trim()
        : getUrl(promptKey, opts.voiceKey);

    if (!audioUrl) {
      onError(new Error('Audio unavailable'));
      return;
    }

    const rate = Math.min(1.5, Math.max(0.7, Number(opts.rate) || 1.0));

    // Kênh 1 (ưu tiên): Web Audio API AudioBuffer — không bị chặn autoplay trên các nhịp chờ bất đồng bộ
    if (sharedAudioCtx && typeof fetch === 'function') {
      loadDecodedBuffer(audioUrl).then((buf) => {
        if (seq !== playSeq) return;
        if (buf && startBufferPlayback(buf, 0, rate, seq, onStart, onEnd)) {
          return;
        }
        playViaAudioElement(audioUrl, rate, seq, onStart, onEnd, onError);
      });
      return;
    }

    // Kênh 2: HTMLAudioElement
    playViaAudioElement(audioUrl, rate, seq, onStart, onEnd, onError);
  }

  function pauseAll() {
    if (isPaused) return;
    if (currentSource && sharedAudioCtx && currentBuffer) {
      isPaused = true;
      clearGuardTimer();
      const elapsed = Math.max(0, (sharedAudioCtx.currentTime - currentStartedAt) * currentRate);
      currentOffsetSec = Math.min(currentBuffer.duration, currentOffsetSec + elapsed);
      const src = currentSource;
      currentSource = null;
      try {
        src.onended = null;
        src.stop(0);
      } catch (_) {}
      try {
        src.disconnect();
      } catch (_) {}
      return;
    }

    if (currentAudio && !currentAudio.paused) {
      try {
        currentAudio.pause();
        isPaused = true;
        clearGuardTimer();
      } catch (_) {}
    }
  }

  function resumeAll() {
    if (!isPaused) return;
    const seq = playSeq;

    if (currentBuffer && sharedAudioCtx && typeof currentOnEnd === 'function') {
      const buf = currentBuffer;
      const off = currentOffsetSec;
      const rate = currentRate;
      const onEnd = currentOnEnd;
      if (off >= buf.duration - 0.05) {
        isPaused = false;
        currentBuffer = null;
        currentOnEnd = null;
        onEnd();
        return;
      }
      startBufferPlayback(buf, off, rate, seq, () => {}, onEnd);
      return;
    }

    if (currentAudio) {
      try {
        isPaused = false;
        const p = currentAudio.play();
        if (p && typeof p.catch === 'function') p.catch(() => {});
      } catch (_) {}
    }
  }

  function isAudioPlaying() {
    return Boolean((currentSource && !isPaused) || (currentAudio && !currentAudio.paused));
  }

  if (typeof window !== 'undefined') {
    init();
  }

  return {
    init,
    unlock,
    preloadKey,
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
