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
      nightWake: 'Thức dậy MỖI ĐÊM cùng bầy Sói (Ma Sói, Sói Đầu Đàn và người đã bị biến thành Sói).',
      howToPlay: 'Mỗi đêm mở mắt/màn hình cùng đồng bọn để thống nhất cắn 1 nạn nhân (không cắn Sói chung bầy). Ban ngày hãy giữ bình tĩnh, nói năng tự nhiên, đặt nghi vấn hợp lý lên dân làng để không bị bỏ phiếu treo cổ.',
      winRule: 'Phe Ma Sói thắng khi số Sói sống sót bằng hoặc nhiều hơn số người không phải Sói còn lại (trừ khi Thằng Ngố, Sát Nhân hoặc Cặp Đôi khác phe thắng trước).',
      tip: 'Nếu được ghép thành Tình Nhân với người Phe Dân hoặc Sát Nhân: bạn VẪN thức dậy cùng bầy Sói ban đêm, nhưng mục tiêu lúc này là bảo vệ người yêu sống sót cuối cùng — không được để bầy Sói cắn người yêu của mình!',
      speechGuide: 'Vai Ma Sói, thuộc phe Ma Sói. Ban đêm bạn thức dậy cùng bầy Sói để thống nhất cắn một người. Ban ngày bạn phải giả vờ làm dân làng lương thiện, đánh lạc hướng để tránh bị treo cổ. Lưu ý nếu bạn là Tình Nhân với người khác phe, bạn vẫn dậy cùng bầy Sói ban đêm nhưng phải tìm cách bảo vệ người yêu sống sót tới cuối ván.',
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
      nightWake: 'Thức dậy MỖI ĐÊM cùng bầy Sói. Đêm nào dùng Nguyền thì kích hoạt ngay trong lượt Sói.',
      howToPlay: 'Cùng bầy Sói chọn mục tiêu cắn. Bạn có đúng 1 lần cả ván bật chế độ "Nguyền": nạn nhân đêm đó sẽ không chết mà trở thành Ma Sói từ đêm sau (bị Tiên Tri soi ra phe Sói và thức dậy cùng bầy Sói). Phù Thủy không cần cứu người bị Nguyền.',
      winRule: 'Thắng cùng Phe Ma Sói khi số Sói bằng hoặc nhiều hơn phe còn lại.',
      tip: 'Đừng vội Nguyền đêm 1 khi Bảo Vệ dễ đoán bài hoặc khi chưa rõ ai là vai mạnh; hãy đợi lúc phù hợp để tăng quân số Sói bất ngờ khiến làng mất dấu.',
      speechGuide: 'Vai Sói Đầu Đàn, thuộc phe Ma Sói. Bạn thức dậy cùng bầy Sói mỗi đêm. Ngoài việc chọn người cắn, bạn có một lần duy nhất trong ván dùng quyền Nguyền để biến nạn nhân bị Sói cắn thành đồng bọn Ma Sói thay vì giết họ. Người bị nguyền sẽ sống tiếp vào sáng hôm sau và thức dậy cùng bầy Sói từ đêm kế tiếp.',
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
      nightWake: 'Thức dậy MỖI ĐÊM trước lượt Phù Thủy để chọn 1 người được khiên bảo vệ.',
      howToPlay: 'Chọn 1 người (có thể tự bảo vệ mình) để chặn đòn cắn của Ma Sói hoặc đòn cắn kết hợp trong đêm đó. Không thể chọn cùng 1 người 2 đêm liên tiếp, nên phải luân phiên chiến thuật.',
      winRule: 'Thắng cùng Phe Dân Làng khi toàn bộ Ma Sói và Sát Nhân bị loại.',
      tip: 'Bảo Vệ chỉ chắn được nanh vuốt Ma Sói, KHÔNG chặn được Bình Độc của Phù Thủy hay dao của Sát Nhân. Nếu đêm qua không ai chết, hãy âm thầm để ý người bạn vừa bảo vệ.',
      speechGuide: 'Vai Bảo Vệ, thuộc phe Dân Làng. Mỗi đêm bạn thức dậy chọn một người, kể cả chính mình, để bảo vệ khỏi bị Ma Sói cắn. Luật cấm bảo vệ cùng một người hai đêm liên tiếp. Lưu ý khiên Bảo Vệ chỉ chống được Sói cắn, không đỡ được độc của Phù Thủy hay đòn của Sát Nhân.',
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
      nightWake: 'Thức dậy MỖI ĐÊM sau lượt Bảo Vệ để soi 1 người.',
      howToPlay: 'Chọn 1 người chưa bị loại để kiểm tra phe: hệ thống báo họ là "Phe Ma Sói" hoặc "Không phải Sói / Phe Dân Làng". Ban ngày cân nhắc lúc nào cần công khai kết quả soi để dẫn dắt phiếu treo cổ mà không bị Sói cắn quá sớm.',
      winRule: 'Thắng cùng Phe Dân Làng khi loại hết Ma Sói và Sát Nhân.',
      tip: 'Bán Sói khi chưa bị Sói cắn vẫn soi ra Phe Dân Làng; chỉ sau khi bị cắn hóa Sói mới soi ra Phe Ma Sói. Sát Nhân và Thằng Ngố không mang dòng máu Sói nên kết quả soi không báo là Ma Sói.',
      speechGuide: 'Vai Tiên Tri, thuộc phe Dân Làng. Mỗi đêm bạn thức dậy chọn soi một người để biết người đó có phải Ma Sói hay không. Ban ngày hãy khéo léo chia sẻ thông tin soi đúng lúc để dẫn dắt dân làng treo cổ Sói mà không tự lộ quá sớm.',
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
      nightWake: 'Thức dậy MỖI ĐÊM sau lượt Ma Sói (trừ khi đã dùng hết cả 2 bình).',
      howToPlay: 'Khi vào lượt, màn hình cho bạn biết đêm nay ai đang sắp chết vì Sói cắn (nếu người đó chưa bị Bảo Vệ đỡ hoặc chưa bị Nguyền). Bạn có thể bấm dùng Bình Cứu để cứu họ, và/hoặc chọn dùng Bình Độc lên 1 người bạn nghi ngờ, hoặc bỏ qua để giữ thuốc.',
      winRule: 'Thắng cùng Phe Dân Làng khi loại hết Ma Sói và Sát Nhân.',
      tip: 'Không nên ném Bình Độc quá vội ở đêm 1. Khi đã dùng Bình Cứu cho ai, người đó là nhân chứng cực mạnh để bạn tin tưởng ban ngày.',
      speechGuide: 'Vai Phù Thủy, thuộc phe Dân Làng. Bạn có một Bình Cứu và một Bình Độc, mỗi bình chỉ dùng một lần cả ván. Mỗi đêm bạn sẽ thấy ai vừa bị Sói cắn để quyết định có cứu hay không, đồng thời có thể ném Bình Độc loại một người bạn nghi là Sói.',
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
      nightWake: 'Ngủ ban đêm như dân thường. Chỉ kích hoạt kỹ năng ngay khoảnh khắc bạn bị loại (bị Sói cắn, Sát Nhân đâm hoặc bị treo cổ).',
      howToPlay: 'Trong ván cứ chơi và suy luận như dân làng. Ngay khi bạn chết (sáng bị lật bài chết đêm hoặc ban ngày bị treo cổ), điện thoại của bạn sẽ mở bảng "Chọn 1 người để bắn kéo theo" — hãy chọn mục tiêu nghi nhất hoặc bỏ qua.',
      winRule: 'Thắng cùng Phe Dân Làng khi tiêu diệt hết Ma Sói và Sát Nhân.',
      tip: 'Nếu bạn là Tình Nhân và chết theo dây chuyền vì người yêu chết, hoặc chết vì Bình Độc Phù Thủy, hãy xem thông báo trên màn hình xem súng có kích hoạt hay không. Cố gắng chỉ rõ đối tượng tình nghi trước khi chết.',
      speechGuide: 'Vai Thợ Săn, thuộc phe Dân Làng. Ban đêm bạn ngủ bình thường. Khi bạn bị loại bởi Sói cắn, Sát Nhân hoặc bị làng treo cổ, súng Thợ Săn sẽ kích hoạt để bạn kéo theo một người chết chung ngay trên điện thoại.',
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
      nightWake: 'CHỈ thức dậy ĐÊM ĐẦU TIÊN (Đêm 1) để chọn 2 người ghép đôi.',
      howToPlay: 'Ở Đêm 1, chọn 2 người bất kỳ (có thể chọn cả chính mình). Sau khi ghép xong, cả 2 người đó sẽ nhận thông báo biết tên người yêu và phe của cặp đôi. Từ Đêm 2 trở đi bạn ngủ luôn ban đêm như Dân Làng.',
      winRule: 'Thắng theo Phe Dân Làng (trừ khi chính bạn tự ghép mình với một Ma Sói/Sát Nhân thành Cặp Đôi khác phe thì bạn đổi sang Phe Thứ 3 Cặp Đôi!).',
      tip: 'QUAN TRỌNG: Tình nhân với Sói KHÔNG thức dậy cùng bầy Sói ban đêm! Chỉ ai thực sự mang vai Sói mới dậy cùng bầy Sói, còn người dân kia vẫn ngủ — họ chỉ bảo vệ nhau vào ban ngày và cùng thắng nếu là 2 người cuối cùng.',
      speechGuide: 'Vai Thần Tình Yêu. Bạn chỉ thức dậy duy nhất đêm đầu tiên để ghép đôi hai người thành Cặp Đôi Tình Nhân. Hai người yêu nhau sẽ biết mặt nhau và nếu một người chết thì người kia chết theo. Lưu ý quan trọng: nếu một Dân Làng yêu một Ma Sói, người Dân đó KHÔNG thức dậy cùng bầy Sói ban đêm, mà chỉ bảo vệ nhau ban ngày để thành Phe Thứ Ba sống sót tới cuối.',
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
      nightWake: 'Ngủ ban đêm như dân thường; lá chắn nội tại tự kích hoạt khi bị Sói cắn lần đầu.',
      howToPlay: 'Chơi như một dân làng uy tín. Nếu đêm nay Sói cắn trúng bạn lần đầu, bạn vẫn sống và mất 1 lớp giáp (được báo ngầm ở thẻ bài), sáng hôm sau không có người chết nếu không có đòn khác.',
      winRule: 'Thắng cùng Phe Dân Làng khi loại hết Ma Sói và Sát Nhân.',
      tip: 'Khi bạn đã mất 1 giáp, đừng nhận vơ mình được Bảo Vệ cứu nếu có Bảo Vệ thật ngoài đời — cẩn thận kẻo bị Ma Sói cắn bồi đêm kế tiếp hoặc bị Sát Nhân xiên.',
      speechGuide: 'Vai Già Làng, thuộc phe Dân Làng. Bạn ngủ ban đêm nhưng sở hữu hai mạng trước nanh vuốt Ma Sói: lần đầu bị Sói cắn chỉ làm bạn mất lớp giáp và vẫn sống sót, lần cắn thứ hai mới chết. Tuy nhiên nếu bị treo cổ, trúng độc hay bị Sát Nhân ám sát thì bạn chết ngay.',
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
      nightWake: 'Không thức dậy ban đêm.',
      howToPlay: 'Ban ngày hãy diễn thật khéo để mọi người nghi bạn là Ma Sói (nói mâu thuẫn nhẹ, nhận bừa vai Tiên Tri hoặc né câu hỏi vừa đủ) sao cho cả làng bỏ phiếu TREO CỔ bạn. Đừng lộ liễu quá khiến dân biết bạn là Thằng Ngố và bỏ qua không thèm treo!',
      winRule: 'THẮNG ĐỘC LẬP NGAY LẬP TỨC ngay khoảnh khắc bị làng biểu quyết treo cổ ban ngày. Nếu bị Sói cắn, Sát Nhân giết hoặc bị bắn/độc chết thì tính là thua.',
      tip: 'Không được tự nhận mình là Thằng Ngố — hãy giả vờ như đang gồng mình chối tội Sói để người khác hăng hái vote treo bạn.',
      speechGuide: 'Vai Thằng Ngố, thuộc Phe Thứ Ba độc lập. Bạn không dậy ban đêm. Mục tiêu duy nhất của bạn là diễn sao cho cả làng nghi ngờ và bỏ phiếu treo cổ bạn vào ban ngày, khi đó bạn thắng ngay lập tức. Nếu bạn chết vào ban đêm thì sẽ thua.',
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
      nightWake: 'Thức dậy MỖI ĐÊM một mình để chọn ám sát 1 người (xuyên qua khiên Bảo Vệ).',
      howToPlay: 'Mỗi đêm bạn tự chọn 1 nạn nhân để hạ sát — đòn của bạn không bị Bảo Vệ chặn. Bạn không cùng phe với Dân Làng cũng không cùng phe với Ma Sói, nên ban ngày cần khéo léo giữ thế cân bằng để Sói và Dân tự triệt tiêu lẫn nhau.',
      winRule: 'THẮNG ĐỘC LẬP khi tiêu diệt tất cả đối thủ (hoặc còn lại 1–2 người khi không còn phe khác áp đảo và bạn sống sót cuối cùng).',
      tip: 'Đừng vội giết hết Ma Sói khi Dân Làng còn quá đông, vì khi hết Sói cả làng sẽ dồn phiếu truy tìm Sát Nhân.',
      speechGuide: 'Vai Sát Nhân, thuộc Phe Thứ Ba độc lập. Mỗi đêm bạn thức dậy một mình chọn ám sát một người, đòn đánh xuyên qua khiên của Bảo Vệ. Bạn phải loại cả phe Dân lẫn phe Sói để trở thành người sống sót cuối cùng mới chiến thắng.',
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
      nightWake: 'Ngủ suốt ban đêm, không mở mắt/thao tác.',
      howToPlay: 'Ban ngày là sân chơi chính của bạn: quan sát nét mặt, nhớ lại ai bênh ai, ai né tránh vote, đặt câu hỏi thẳng và tổng hợp thông tin từ Tiên Tri, Thám Tử, Phù Thủy để bỏ phiếu treo đúng Sói.',
      winRule: 'Thắng cùng Phe Dân Làng khi loại hết Ma Sói và Sát Nhân.',
      tip: 'Dân Làng đôi khi có thể "đỡ đạn" giả vờ có chức năng để dụ Sói cắn nhầm, giữ mạng cho Tiên Tri hoặc Phù Thủy thật.',
      speechGuide: 'Vai Dân Làng, thuộc phe Dân Làng. Bạn ngủ suốt ban đêm và không có kỹ năng đặc biệt. Sức mạnh của bạn nằm ở ban ngày: lắng nghe lập luận, soi sự mâu thuẫn trong lời nói và bỏ phiếu chính xác để treo cổ Ma Sói.',
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
      desc: 'Mỗi đêm chọn 1 người bị khóa miệng: sáng hôm sau người đó tuyệt đối không được nói chuyện hay ra dấu ngoài đời suốt vòng thảo luận!',
      nightWake: 'Thức dậy MỖI ĐÊM để chọn 1 người bị dính bùa Câm (không được phép khóa miệng cùng 1 người 2 đêm liên tiếp).',
      howToPlay: 'Chọn người bạn muốn bịt miệng vào ban ngày kế tiếp (ví dụ người nói quá nhiều hoặc đối tượng nghi vấn). Người bị khóa miệng vẫn được ĐỌC thông tin trên máy và VẪN ĐƯỢC BỎ PHIẾU treo cổ như bình thường, chỉ bị cấm nói chuyện và ra ký hiệu ngoài đời suốt buổi thảo luận.',
      winRule: 'Thắng cùng Phe Dân Làng khi loại hết Ma Sói và Sát Nhân.',
      tip: 'Cẩn thận đừng khóa miệng Tiên Tri hoặc người đang giữ manh mối quan trọng! Nếu khóa trúng Sói đầu sỏ hay Kẻ nói dối, làng sẽ có một ngày thảo luận cực kỳ dễ thở.',
      speechGuide: 'Vai Pháp Sư Câm, thuộc phe Dân Làng. Mỗi đêm bạn thức dậy chọn một người để khóa miệng, không chọn cùng một người hai đêm liền. Sáng hôm sau người bị nguyền tuyệt đối không được nói hay ra dấu trong lúc thảo luận, nhưng họ vẫn được bỏ phiếu như bình thường.',
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
      desc: 'Mỗi đêm chọn soi 2 người chơi bất kỳ để biết họ đang thuộc CÙNG PHE hay KHÁC PHE.',
      nightWake: 'Thức dậy MỖI ĐÊM để chọn đúng 2 người chơi khác nhau và nhận kết quả tức thì.',
      howToPlay: 'Chọn cặp A và B mỗi đêm. Màn hình sẽ báo ngay "Cùng phe" hoặc "Khác phe" theo 3 nhóm (Dân Làng / Ma Sói / Phe Thứ 3). Ghép các cặp soi qua nhiều đêm để khoanh vùng ai đang ở phe nào.',
      winRule: 'Thắng cùng Phe Dân Làng khi loại hết Ma Sói và Sát Nhân.',
      tip: 'Nếu đêm 1 bạn soi A và B là "Khác phe", đêm 2 hãy thử soi A với C (hoặc với chính bạn!) để bẻ khóa xem ai mới là phe Sói hoặc Phe Thứ 3.',
      speechGuide: 'Vai Thám Tử, thuộc phe Dân Làng. Mỗi đêm bạn thức dậy chọn hai người chơi bất kỳ để kiểm tra xem họ đang ở cùng phe hay khác phe. Bằng cách ghép cặp qua từng đêm, bạn sẽ nhanh chóng khoanh vùng được Ma Sói và Phe Thứ Ba.',
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
      desc: 'Ban đầu là Dân Làng bình thường. Nhưng nếu ban đêm bị Ma Sói cắn, bạn không chết mà lập tức hóa thành Ma Sói gia nhập bầy!',
      nightWake: 'Khi còn là Dân: ngủ ban đêm. Nếu bị Ma Sói cắn và chuyển hóa: từ đêm hôm sau thức dậy cùng bầy Sói!',
      howToPlay: 'Lúc đầu bạn hoàn toàn thuộc Phe Dân Làng, ngủ ban đêm và chơi bình thường để phe Dân thắng. Nhưng nếu Ma Sói lỡ chọn cắn bạn vào ban đêm (và bạn không được Bảo Vệ che), bạn không chết mà biến thành Ma Sói — sáng ra bạn nhận thẻ Sói mới và từ đó chơi theo Phe Ma Sói!',
      winRule: 'Thắng cùng Phe Dân Làng nếu chưa bị hóa Sói; thắng cùng Phe Ma Sói nếu đã bị Sói cắn chuyển hóa.',
      tip: 'Trước khi bị cắn, Tiên Tri soi bạn vẫn ra Phe Dân Làng! Sau khi chuyển hóa thành Sói, Tiên Tri soi lại sẽ ra Phe Ma Sói và bạn cần quay xe bảo vệ đồng bọn Sói.',
      speechGuide: 'Vai Bán Sói. Ban đầu bạn thuộc phe Dân Làng và ngủ ban đêm bình thường. Nhưng nếu ban đêm bị Ma Sói cắn, bạn không chết mà hóa thành Ma Sói gia nhập bầy, đổi sang phe Ma Sói và thức dậy cùng bầy Sói từ đêm tiếp theo.',
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
      desc: 'Nếu bị cả làng biểu quyết TREO CỔ ban ngày, bạn lập tức kích hoạt lời nguyền kéo theo 1 người bất kỳ chết chung!',
      nightWake: 'Ngủ suốt ban đêm. Kỹ năng CHỈ kích hoạt khi bạn bị treo cổ ban ngày.',
      howToPlay: 'Khác với Thợ Săn: nếu bị Sói cắn ban đêm thì bạn chết bình thường và KHÔNG kéo theo ai. Nhưng nếu ban ngày bạn bị làng bỏ phiếu TREO CỔ, điện thoại sẽ hiện bảng cho bạn chỉ định 1 người chết chung ngay tại chỗ!',
      winRule: 'Thắng cùng Phe Dân Làng khi tiêu diệt hết Ma Sói và Sát Nhân.',
      tip: 'Hãy công khai hoặc úp mở vai trò khi sắp bị oan treo cổ — Ma Sói thường rất ngại hùa vote treo Kẻ Báo Thù vì sợ bị kéo chết theo.',
      speechGuide: 'Vai Kẻ Báo Thù, thuộc phe Dân Làng. Bạn ngủ ban đêm. Nếu bị Sói cắn ban đêm bạn chết bình thường, nhưng nếu bị cả làng bỏ phiếu treo cổ vào ban ngày, bạn sẽ kích hoạt trả thù để kéo theo một người bất kỳ chết chung ngay lập tức.',
    }
  };

  const ROLE_FAQ_TOPICS = [
    {
      id: 'lovers_wolf',
      icon: '💘',
      title: 'Tình nhân với Sói có dậy cùng bầy Sói ban đêm không?',
      answer: 'KHÔNG! Chỉ người mang vai Ma Sói / Sói Đầu Đàn / Bán Sói đã hóa Sói mới được thức dậy cùng bầy Sói ban đêm. Nếu Thần Tình Yêu ghép 1 Dân Làng với 1 Ma Sói, người Dân đó vẫn ngủ suốt đêm (không biết mặt bầy Sói). Hai người chỉ biết mặt nhau qua thẻ bài riêng và thành Phe Thứ 3 Cặp Đôi — nếu 1 người chết thì người kia chết theo.',
      speechText: 'Giải đáp luật Tình Nhân với Ma Sói: Câu trả lời là Không! Người thuộc phe Dân dù được ghép đôi với Ma Sói vẫn ngủ vào ban đêm và không thức dậy cùng bầy Sói. Chỉ có người mang vai Sói mới dậy cắn người. Hai người yêu nhau chỉ biết nhau là Cặp Đôi và cần bảo vệ nhau vào ban ngày để sống sót đến cuối ván.'
    },
    {
      id: 'cursed_alpha',
      icon: '🌘',
      title: 'Bán Sói & Sói Đầu Đàn Nguyền hoạt động thế nào?',
      answer: 'Bán Sói lúc đầu là Dân (Tiên Tri soi ra Phe Dân). Nếu đêm đó bị Sói cắn mà không có Bảo Vệ đỡ thì Bán Sói KHÔNG chết mà biến thành Ma Sói từ đêm sau (Phù Thủy cũng không thấy ai sắp chết). Tương tự khi Sói Đầu Đàn bật quyền Nguyền (1 lần cả ván), nạn nhân sống tiếp vào sáng hôm sau và gia nhập bầy Sói.',
      speechText: 'Giải đáp luật Bán Sói và Sói Đầu Đàn Nguyền: Bán Sói ban đầu là Dân Làng, Tiên Tri soi ra phe Dân. Nếu bị Sói cắn và không có Bảo Vệ che, Bán Sói sẽ biến thành Ma Sói từ đêm sau mà không chết. Còn Sói Đầu Đàn có một lần duy nhất trong ván dùng quyền Nguyền để biến nạn nhân bị cắn thành Ma Sói mới.'
    },
    {
      id: 'avenger_hunter',
      icon: '⚔️',
      title: 'Kẻ Báo Thù khác gì với Thợ Săn?',
      answer: 'Thợ Săn (🏹) chết vì Sói cắn, Sát Nhân hay bị treo cổ đều được nổ súng kéo theo 1 người. Còn Kẻ Báo Thù (⚔️) CHỈ kích hoạt kéo theo 1 người khi bị cả làng biểu quyết TREO CỔ ban ngày; nếu chết ban đêm thì không trả thù được.',
      speechText: 'Phân biệt Thợ Săn và Kẻ Báo Thù: Thợ Săn khi bị Sói cắn ban đêm lẫn bị treo cổ ban ngày đều có thể bắn kéo theo một người. Còn Kẻ Báo Thù chỉ kích hoạt trả thù kéo theo một người khi bị làng bỏ phiếu treo cổ vào ban ngày; nếu chết ban đêm thì không kéo theo ai.'
    },
    {
      id: 'spellcaster_mute',
      icon: '🤐',
      title: 'Bị Pháp Sư Câm khóa miệng thì có được bỏ phiếu không?',
      answer: 'CÓ! Người bị khóa miệng chỉ bị cấm nói chuyện và ra ký hiệu ngoài đời suốt phần thảo luận ban ngày, nhưng đến giờ bỏ phiếu treo cổ trên điện thoại thì họ VẪN ĐƯỢC BỎ PHIẾU bình thường. Pháp Sư Câm không thể khóa miệng cùng 1 người 2 đêm liên tiếp.',
      speechText: 'Giải đáp luật Pháp Sư Câm: Người bị khóa miệng tuyệt đối không được nói hay ra dấu ngoài đời suốt buổi thảo luận ban ngày, nhưng đến lúc bỏ phiếu treo cổ trên điện thoại thì vẫn được bấm chọn bỏ phiếu bình thường.'
    },
    {
      id: 'sheriff_lastwords',
      icon: '👑',
      title: 'Trưởng Làng & Lời Trăng Trối hoạt động ra sao?',
      answer: 'Nếu bật Trưởng Làng, đầu Ngày 1 làng bầu ra 1 người giữ huy hiệu 👑: phiếu treo cổ của Trưởng Làng được tính là 1.5 phiếu (phá thế hòa) và khi chết được trao lại huy hiệu. Nếu bật Lời Trăng Trối, người mới chết có vài chục giây nói lời cuối trước khi sang pha tiếp theo.',
      speechText: 'Giải đáp Trưởng Làng và Lời Trăng Trối: Trưởng Làng sở hữu lá phiếu nặng một phẩy năm điểm khi bỏ phiếu treo cổ và có thể truyền huy hiệu cho người khác khi bị loại. Lời Trăng Trối cho phép người vừa bị loại phát biểu ngắn trước khi làng chuyển sang đêm hoặc kết thúc ngày.'
    }
  ];

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
    ROLE_FAQ_TOPICS,
    ROLE_ORDER,
    CLASSIC_ROLE_ORDER,
    ROLE_PRESETS,
    getRecommendedWerewolfRoles,
    getPresetWerewolfRoles
  });
})();
