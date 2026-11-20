// js/data-roles.js — Dữ liệu Avatar người chơi và Danh mục Vai trò Ma Sói v4.0
window.GameData = window.GameData || {};

(() => {
  'use strict';

  const PLAYER_AVATARS = [
    { id: 'friend_1', img: 'assets/avatars/friend_1.webp', emoji: '🦇', label: 'Thành viên 1', bg: 'linear-gradient(135deg,#ec4899,#8b5cf6)' },
    { id: 'friend_2', img: 'assets/avatars/friend_2.webp', emoji: '🍊', label: 'Thành viên 2', bg: 'linear-gradient(135deg,#f97316,#facc15)' },
    { id: 'friend_3', img: 'assets/avatars/friend_3.webp', emoji: '👻', label: 'Thành viên 3', bg: 'linear-gradient(135deg,#6366f1,#0ea5e9)' },
    { id: 'friend_4', img: 'assets/avatars/friend_4.webp', emoji: '🐱', label: 'Thành viên 4', bg: 'linear-gradient(135deg,#f472b6,#fb7185)' },
    { id: 'friend_5', img: 'assets/avatars/friend_5.webp', emoji: '🕶️', label: 'Thành viên 5', bg: 'linear-gradient(135deg,#334155,#3b82f6)' },
    { id: 'friend_6', img: 'assets/avatars/friend_6.webp', emoji: '⛰️', label: 'Thành viên 6', bg: 'linear-gradient(135deg,#10b981,#06b6d4)' },
    { id: 'friend_7', img: 'assets/avatars/friend_7.webp', emoji: '👓', label: 'Thành viên 7', bg: 'linear-gradient(135deg,#38bdf8,#2563eb)' },
    { id: 'friend_8', img: 'assets/avatars/friend_8.webp', emoji: '🖤', label: 'Thành viên 8', bg: 'linear-gradient(135deg,#475569,#7c3aed)' },
    { id: 'boy_smile', emoji: '👦', label: 'Nam vui vẻ', bg: 'linear-gradient(135deg,#38bdf8,#6366f1)' },
    { id: 'girl_smile', emoji: '👧', label: 'Nữ đáng yêu', bg: 'linear-gradient(135deg,#f472b6,#e11d48)' },
    { id: 'man_cool', emoji: '👨', label: 'Anh trai', bg: 'linear-gradient(135deg,#3b82f6,#1d4ed8)' },
    { id: 'woman_chic', emoji: '👩', label: 'Chị đẹp', bg: 'linear-gradient(135deg,#ec4899,#a855f7)' },
    { id: 'man_beard', emoji: '🧔', label: 'Râu ngầu', bg: 'linear-gradient(135deg,#f59e0b,#b45309)' },
    { id: 'blond_boy', emoji: '👱‍♂️', label: 'Tóc vàng', bg: 'linear-gradient(135deg,#fbbf24,#f97316)' },
    { id: 'blond_girl', emoji: '👱‍♀️', label: 'Cô gái vàng', bg: 'linear-gradient(135deg,#fcd34d,#ec4899)' },
    { id: 'curly_hair', emoji: '🧑‍🦱', label: 'Tóc xoăn', bg: 'linear-gradient(135deg,#8b5cf6,#6366f1)' },
    { id: 'red_hair', emoji: '🧑‍🦰', label: 'Tóc đỏ', bg: 'linear-gradient(135deg,#ef4444,#f97316)' },
    { id: 'white_hair', emoji: '🧑‍🦳', label: 'Bạch kim', bg: 'linear-gradient(135deg,#94a3b8,#475569)' },
    { id: 'grandpa', emoji: '👴', label: 'Bô lão', bg: 'linear-gradient(135deg,#10b981,#0f766e)' },
    { id: 'grandma', emoji: '👵', label: 'Bà ngoại', bg: 'linear-gradient(135deg,#14b8a6,#0369a1)' },
    { id: 'glasses_nerd', emoji: '🤓', label: 'Mọt sách', bg: 'linear-gradient(135deg,#0ea5e9,#2563eb)' },
    { id: 'sunglasses', emoji: '😎', label: 'Kính râm', bg: 'linear-gradient(135deg,#6366f1,#0f172a)' },
    { id: 'monocle', emoji: '🧐', label: 'Thám tử', bg: 'linear-gradient(135deg,#d97706,#78350f)' },
    { id: 'smirk', emoji: '😏', label: 'Bí ẩn', bg: 'linear-gradient(135deg,#9333ea,#4c1d95)' },
    { id: 'star_eyes', emoji: '🤩', label: 'Hào hứng', bg: 'linear-gradient(135deg,#f43f5e,#f59e0b)' },
    { id: 'party_face', emoji: '🥳', label: 'Tiệc tùng', bg: 'linear-gradient(135deg,#22c55e,#06b6d4)' },
    { id: 'cowboy', emoji: '🤠', label: 'Cao bồi', bg: 'linear-gradient(135deg,#ea580c,#9a3412)' },
    { id: 'clown', emoji: '🤡', label: 'Hề hước', bg: 'linear-gradient(135deg,#ef4444,#ec4899)' },
    { id: 'prince', emoji: '🤴', label: 'Hoàng tử', bg: 'linear-gradient(135deg,#eab308,#7c3aed)' },
    { id: 'princess', emoji: '👸', label: 'Công chúa', bg: 'linear-gradient(135deg,#f472b6,#c026d3)' },
    { id: 'detective', emoji: '🕵️', label: 'Đặc vụ', bg: 'linear-gradient(135deg,#334155,#0f172a)' },
    { id: 'ninja', emoji: '🥷', label: 'Ẩn thân', bg: 'linear-gradient(135deg,#1e293b,#7c2d12)' }
  ];

  function getAvatarById(id) {
    return PLAYER_AVATARS.find((a) => a.id === id) || PLAYER_AVATARS[0];
  }

  function getRandomAvatarId(seedIndex) {
    if (typeof seedIndex === 'number' && seedIndex >= 0) {
      return PLAYER_AVATARS[seedIndex % PLAYER_AVATARS.length].id;
    }
    return PLAYER_AVATARS[Math.floor(Math.random() * PLAYER_AVATARS.length)].id;
  }

  const WEREWOLF_ROLES = {
    werewolf: {
      id: 'werewolf',
      name: 'Ma Sói',
      icon: '🐺',
      team: 'werewolf',
      teamName: 'Phe Ma Sói',
      bgImage: 'assets/roles/werewolf.webp',
      themeColor: '#ef4444',
      desc: 'Ban đêm thức dậy cùng đồng bọn chọn 1 dân làng để cắn. Ban ngày giả vờ làm dân lương thiện.',
      weight: 1.0
    },
    alpha_wolf: {
      id: 'alpha_wolf',
      name: 'Sói Đầu Đàn',
      icon: '🩸',
      team: 'werewolf',
      teamName: 'Phe Ma Sói',
      bgImage: 'assets/roles/alpha_wolf.webp',
      themeColor: '#dc2626',
      desc: 'Thức dậy cùng bầy Sói. Có 1 lần duy nhất trong ván được phép Nguyền biến nạn nhân bị Sói cắn thành Ma Sói mới thay vì giết họ!',
      weight: 1.0
    },
    guard: {
      id: 'guard',
      name: 'Bảo Vệ',
      icon: '🛡️',
      team: 'villager',
      teamName: 'Phe Dân Làng',
      bgImage: 'assets/roles/guard.webp',
      themeColor: '#06b6d4',
      desc: 'Mỗi đêm chọn 1 người (kể cả bản thân) để bảo vệ khỏi nanh vuốt Ma Sói. Không được bảo vệ cùng 1 người 2 đêm liên tiếp.',
      weight: 1.0
    },
    seer: {
      id: 'seer',
      name: 'Tiên Tri',
      icon: '🔮',
      team: 'villager',
      teamName: 'Phe Dân Làng',
      bgImage: 'assets/roles/seer.webp',
      themeColor: '#a855f7',
      desc: 'Mỗi đêm chọn soi 1 người chơi để biết họ thuộc Phe Ma Sói hay Phe Dân Làng.',
      weight: 1.0
    },
    witch: {
      id: 'witch',
      name: 'Phù Thủy',
      icon: '🧪',
      team: 'villager',
      teamName: 'Phe Dân Làng',
      bgImage: 'assets/roles/witch.webp',
      themeColor: '#10b981',
      desc: 'Có 1 Bình Cứu (chữa người bị Sói cắn đêm nay) và 1 Bình Độc (giết 1 người bất kỳ). Mỗi bình chỉ dùng 1 lần cả ván.',
      weight: 1.0
    },
    hunter: {
      id: 'hunter',
      name: 'Thợ Săn',
      icon: '🏹',
      team: 'villager',
      teamName: 'Phe Dân Làng',
      bgImage: 'assets/roles/hunter.webp',
      themeColor: '#f59e0b',
      desc: 'Khi bị Sói cắn hoặc treo cổ, bạn hô bắn ở ngoài đời rồi tự bấm chọn người bị bắn trên điện thoại để Bot tiếp tục!',
      weight: 1.0
    },
    cupid: {
      id: 'cupid',
      name: 'Thần Tình Yêu',
      icon: '💘',
      team: 'villager',
      teamName: 'Phe Dân Làng',
      bgImage: 'assets/roles/cupid.webp',
      themeColor: '#ec4899',
      desc: 'Đêm đầu tiên ghép đôi 2 người thành Cặp Đôi Tình Nhân. Nếu 1 người chết, người kia chết theo! Nếu 2 người khác phe, họ thành Phe Thứ 3 Cặp Đôi.',
      weight: 1.0
    },
    elder: {
      id: 'elder',
      name: 'Già Làng',
      icon: '🧓',
      team: 'villager',
      teamName: 'Phe Dân Làng',
      bgImage: 'assets/roles/elder.webp',
      themeColor: '#d97706',
      desc: 'Có 2 mạng trước nanh vuốt Ma Sói (Sói cắn lần đầu chỉ mất giáp, cắn lần 2 mới chết). Bị độc, Sát Nhân đâm, bắn hoặc treo cổ thì chết ngay.',
      weight: 1.0
    },
    jester: {
      id: 'jester',
      name: 'Thằng Ngố (Kẻ Chán Đời)',
      icon: '🃏',
      team: 'neutral',
      teamName: 'Phe Thứ 3 (Độc Lập)',
      bgImage: 'assets/roles/jester.webp',
      themeColor: '#f43f5e',
      desc: 'Bạn thuộc Phe Thứ 3 độc lập! Mục tiêu duy nhất: đánh lừa cả làng biểu quyết TREO CỔ bạn vào ban ngày để thắng ngay lập tức (nếu chết ban đêm thì thua).',
      weight: 1.0
    },
    serial_killer: {
      id: 'serial_killer',
      name: 'Sát Nhân',
      icon: '🗡️',
      team: 'neutral',
      teamName: 'Phe Thứ 3 (Độc Lập)',
      bgImage: 'assets/roles/serial_killer.webp',
      themeColor: '#e11d48',
      desc: 'Thuộc Phe Thứ 3 độc lập! Mỗi đêm thức dậy chọn ám sát 1 người. Thắng khi trở thành người sống sót cuối cùng!',
      weight: 1.0
    },
    villager: {
      id: 'villager',
      name: 'Dân Làng',
      icon: '🧑‍🌾',
      team: 'villager',
      teamName: 'Phe Dân Làng',
      bgImage: 'assets/roles/villager.webp',
      themeColor: '#eab308',
      desc: 'Không có chức năng đặc biệt ban đêm. Hãy lắng nghe, suy luận ban ngày để tìm ra Ma Sói!',
      weight: 1.0
    },
    spellcaster: {
      id: 'spellcaster',
      name: 'Pháp Sư Câm',
      icon: '🤐',
      team: 'villager',
      teamName: 'Phe Dân Làng',
      bgImage: 'assets/roles/spellcaster.webp',
      themeColor: '#6366f1',
      weight: 1.0,
      isNewV4: true,
      desc: 'Mỗi đêm chọn 1 người bị khóa miệng: sáng hôm sau người đó tuyệt đối không được nói chuyện hay ra dấu ngoài đời suốt vòng thảo luận!'
    },
    detective: {
      id: 'detective',
      name: 'Thám Tử',
      icon: '🕵️‍♂️',
      team: 'villager',
      teamName: 'Phe Dân Làng',
      bgImage: 'assets/roles/detective.webp',
      themeColor: '#0ea5e9',
      weight: 1.0,
      isNewV4: true,
      desc: 'Mỗi đêm chọn soi 2 người chơi bất kỳ để biết họ đang thuộc CÙNG PHE hay KHÁC PHE.'
    },
    cursed_villager: {
      id: 'cursed_villager',
      name: 'Bán Sói',
      icon: '🌘',
      team: 'villager',
      teamName: 'Phe Dân Làng',
      bgImage: 'assets/roles/cursed_villager.webp',
      themeColor: '#f97316',
      weight: 1.0,
      isNewV4: true,
      desc: 'Ban đầu là Dân Làng bình thường. Nhưng nếu ban đêm bị Ma Sói cắn, bạn không chết mà lập tức hóa thành Ma Sói gia nhập bầy!'
    },
    avenger: {
      id: 'avenger',
      name: 'Kẻ Báo Thù',
      icon: '⚔️',
      team: 'villager',
      teamName: 'Phe Dân Làng',
      bgImage: 'assets/roles/avenger.webp',
      themeColor: '#b91c1c',
      weight: 1.0,
      isNewV4: true,
      desc: 'Nếu bị cả làng biểu quyết TREO CỔ ban ngày, bạn lập tức kích hoạt lời nguyền kéo theo 1 người bất kỳ chết chung!'
    }
  };

  const CLASSIC_ROLE_ORDER = [
    'werewolf',
    'alpha_wolf',
    'seer',
    'guard',
    'witch',
    'hunter',
    'cupid',
    'elder',
    'jester',
    'serial_killer',
    'villager'
  ];

  const ROLE_ORDER = [
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

  const ROLE_PRESETS = [
    {
      id: 'classic',
      name: 'Cơ bản',
      icon: '🌙',
      badge: 'Chuẩn mực',
      minPlayers: 5,
      desc: 'Lối chơi kinh điển dễ làm quen, cân bằng Sói – Dân.'
    },
    {
      id: 'love_drama',
      name: 'Drama Tình Ái',
      icon: '💘',
      badge: 'Cực lầy',
      minPlayers: 5,
      desc: 'Cặp đôi éo le, Thằng Ngố phá bĩnh, Bán Sói phản kèo và Kẻ Báo Thù.'
    },
    {
      id: 'blitz',
      name: 'Tốc chiến',
      icon: '⚡',
      badge: 'Nhanh gọn',
      minPlayers: 5,
      desc: 'Nhịp độ cực gắt, ít Dân thường, nhiều kỹ năng hạ gục và khóa miệng.'
    },
    {
      id: 'mind_games',
      name: 'Hack não nhiều phe',
      icon: '🧠',
      badge: 'Cao thủ',
      minPlayers: 6,
      desc: 'Đủ 4 vai mới v4.0 + Phe Thứ 3 (Sát Nhân, Thằng Ngố, Cặp Đôi) đấu trí căng não.'
    }
  ];

  function getRecommendedWerewolfRoles(count) {
    const n = Math.max(5, Math.floor(Number(count) || 5));
    const base = {
      werewolf: 1,
      alpha_wolf: 0,
      seer: 1,
      guard: 1,
      witch: 0,
      hunter: 0,
      cupid: 0,
      elder: 0,
      spellcaster: 0,
      detective: 0,
      cursed_villager: 0,
      avenger: 0,
      jester: 0,
      serial_killer: 0,
      villager: 2
    };

    let counts = { ...base };
    if (n === 5) {
      counts.villager = 2;
    } else if (n === 6) {
      counts.witch = 1;
      counts.jester = 1;
      counts.villager = 1;
    } else if (n === 7) {
      counts.werewolf = 2;
      counts.witch = 1;
      counts.jester = 1;
      counts.villager = 1;
    } else if (n === 8) {
      counts.werewolf = 2;
      counts.witch = 1;
      counts.hunter = 1;
      counts.cupid = 1;
      counts.jester = 1;
      counts.villager = 0;
    } else if (n === 9) {
      counts.werewolf = 1;
      counts.alpha_wolf = 1;
      counts.witch = 1;
      counts.hunter = 1;
      counts.cupid = 1;
      counts.jester = 1;
      counts.elder = 1;
      counts.villager = 0;
    } else if (n === 10) {
      counts.werewolf = 1;
      counts.alpha_wolf = 1;
      counts.witch = 1;
      counts.hunter = 1;
      counts.cupid = 1;
      counts.elder = 1;
      counts.jester = 1;
      counts.serial_killer = 1;
      counts.villager = 0;
    } else if (n === 11) {
      counts.werewolf = 2;
      counts.alpha_wolf = 1;
      counts.witch = 1;
      counts.hunter = 1;
      counts.cupid = 1;
      counts.elder = 1;
      counts.jester = 1;
      counts.serial_killer = 1;
      counts.villager = 0;
    } else {
      const wolves = n >= 13 ? 3 : 2;
      counts.werewolf = wolves;
      counts.alpha_wolf = 1;
      counts.seer = 1;
      counts.guard = 1;
      counts.witch = 1;
      counts.hunter = 1;
      counts.cupid = 1;
      counts.elder = 1;
      counts.jester = 1;
      counts.serial_killer = 1;
      const assigned = Object.keys(counts).reduce((acc, k) => k === 'villager' ? acc : acc + counts[k], 0);
      counts.villager = Math.max(0, n - assigned);
    }

    return finalizeRoleCounts(counts, n);
  }

  function finalizeRoleCounts(rawCounts, n) {
    const totalPlayers = Math.max(5, Math.floor(Number(n) || 5));
    const result = {};

    ROLE_ORDER.forEach((roleId) => {
      const val = rawCounts[roleId];
      result[roleId] = (typeof val === 'number' && !isNaN(val) && val >= 0) ? Math.floor(val) : 0;
    });

    if ((result.werewolf + result.alpha_wolf) <= 0) {
      result.werewolf = 1;
    }

    let currentSum = ROLE_ORDER.reduce((sum, r) => sum + result[r], 0);

    if (currentSum > totalPlayers) {
      const reductionOrder = ['villager', 'jester', 'serial_killer', 'cursed_villager', 'avenger', 'spellcaster', 'detective', 'cupid', 'elder', 'hunter', 'witch', 'guard', 'seer', 'alpha_wolf'];
      let diff = currentSum - totalPlayers;
      for (const roleId of reductionOrder) {
        if (diff <= 0) break;
        if (roleId === 'alpha_wolf' && result.werewolf === 0) continue;
        const available = roleId === 'werewolf' ? Math.max(0, result.werewolf - (result.alpha_wolf === 0 ? 1 : 0)) : result[roleId];
        const canReduce = Math.min(available, diff);
        if (canReduce > 0) {
          result[roleId] -= canReduce;
          diff -= canReduce;
        }
      }
      if (diff > 0) {
        result.villager = Math.max(0, result.villager - diff);
        currentSum = ROLE_ORDER.reduce((sum, r) => sum + result[r], 0);
        if (currentSum > totalPlayers) {
          result.werewolf = Math.max(1, result.werewolf - (currentSum - totalPlayers));
        }
      }
    } else if (currentSum < totalPlayers) {
      result.villager += (totalPlayers - currentSum);
    }

    return result;
  }

  function getPresetWerewolfRoles(presetId, count) {
    const n = Math.max(5, Math.floor(Number(count) || 5));
    const pid = ROLE_PRESETS.some(p => p.id === presetId) ? presetId : 'classic';
    let raw = {};

    if (pid === 'classic') {
      raw = {
        werewolf: n >= 8 ? 2 : 1,
        alpha_wolf: 0,
        seer: 1,
        guard: 1,
        witch: n >= 6 ? 1 : 0,
        hunter: n >= 8 ? 1 : 0,
        cupid: 0,
        elder: n >= 10 ? 1 : 0,
        spellcaster: 0,
        detective: 0,
        cursed_villager: 0,
        avenger: 0,
        jester: 0,
        serial_killer: 0,
        villager: 0
      };
    } else if (pid === 'love_drama') {
      raw = {
        werewolf: n >= 7 ? 2 : 1,
        alpha_wolf: n >= 9 ? 1 : 0,
        seer: 1,
        guard: n >= 6 ? 1 : 0,
        witch: n >= 10 ? 1 : 0,
        hunter: 0,
        cupid: 1,
        elder: 0,
        spellcaster: n >= 11 ? 1 : 0,
        detective: 0,
        cursed_villager: n >= 7 ? 1 : 0,
        avenger: n >= 8 ? 1 : 0,
        jester: n >= 6 ? 1 : 0,
        serial_killer: 0,
        villager: 0
      };
    } else if (pid === 'blitz') {
      raw = {
        werewolf: n >= 8 ? 2 : 1,
        alpha_wolf: n >= 8 ? 1 : 0,
        seer: 1,
        guard: n >= 11 ? 1 : 0,
        witch: n >= 7 ? 1 : 0,
        hunter: 1,
        cupid: 0,
        elder: 0,
        spellcaster: n >= 6 ? 1 : 0,
        detective: n >= 10 ? 1 : 0,
        cursed_villager: 0,
        avenger: n >= 8 ? 1 : 0,
        jester: 0,
        serial_killer: n >= 9 ? 1 : 0,
        villager: 0
      };
    } else if (pid === 'mind_games') {
      raw = {
        werewolf: n >= 9 ? 2 : 1,
        alpha_wolf: n >= 7 ? 1 : 0,
        seer: n >= 11 ? 1 : 0,
        guard: n >= 12 ? 1 : 0,
        witch: n >= 10 ? 1 : 0,
        hunter: 0,
        cupid: n >= 9 ? 1 : 0,
        elder: n >= 13 ? 1 : 0,
        spellcaster: n >= 6 ? 1 : 0,
        detective: 1,
        cursed_villager: n >= 7 ? 1 : 0,
        avenger: n >= 8 ? 1 : 0,
        jester: n >= 6 ? 1 : 0,
        serial_killer: n >= 8 ? 1 : 0,
        villager: 0
      };
    } else {
      return getRecommendedWerewolfRoles(n);
    }

    return finalizeRoleCounts(raw, n);
  }

  // Gắn trực tiếp vào GameData
  Object.assign(window.GameData, {
    PLAYER_AVATARS,
    getAvatarById,
    getRandomAvatarId,
    WEREWOLF_ROLES,
    ROLE_ORDER,
    CLASSIC_ROLE_ORDER,
    ROLE_PRESETS,
    getRecommendedWerewolfRoles,
    getPresetWerewolfRoles
  });
})();
