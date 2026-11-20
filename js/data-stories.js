// js/data-stories.js — Kho cốt truyện và lời dẫn biến thiên v4.0 (Mặc định TẮT / Chuẩn v3.3)
window.GameData = window.GameData || {};

(() => {
  'use strict';

  const CAMPAIGN_STORAGE_KEY = 'hq_story_campaign_v4';
  const MAX_CAMPAIGN_HISTORY = 10;

  const STORY_THEMES = {
    classic: {
      id: 'classic',
      name: 'Mặc định (Chuẩn mực v3.3)',
      desc: 'Lời dẫn ngắn gọn, chuẩn mực, tập trung vào nhịp chơi nhanh.'
    },
    foggy_village: {
      id: 'foggy_village',
      name: 'Làng Sương Mù Ma Mị',
      desc: 'Không khí u tối, rùng rợn, tiếng gió rít qua khe cửa sổ gỗ.'
    },
    drinking_banter: {
      id: 'drinking_banter',
      name: 'Bàn Nhậu Cà Khịa Hài Hước',
      desc: 'Giọng điệu lầy lội, trêu đùa các pha bóp đồng đội trên bàn nhậu.'
    },
    mansion_mystery: {
      id: 'mansion_mystery',
      name: 'Dinh Thự Án Mạng Cổ Điển',
      desc: 'Trinh thám phong cách quý tộc Agatha Christie, bí ẩn và trang trọng.'
    }
  };

  const DEFAULT_STORY_SETTINGS = {
    storyTheme: 'classic',
    dynamicEvents: false,
    campaignMode: false
  };

  // Lời dẫn chuẩn mực v3.3 (Dùng làm mốc cơ sở 100% không đổi) + bổ sung khóa v4.0
  const BASE_NARRATIONS = {
    night_start: 'Trời đã tối rồi, xin mời tất cả mọi người đi ngủ.',
    call_cupid: 'Thần Tình Yêu ơi, hãy thức dậy và chọn hai người để se duyên nào.',
    call_guard: 'Bảo Vệ ơi, đêm nay bạn muốn bảo vệ ai?',
    call_werewolf: 'Bầy Sói ơi, hãy mở mắt ra, nhìn đồng bọn và chọn con mồi đêm nay.',
    call_alpha_wolf: 'Sói Đầu Đàn ơi, bạn có muốn dùng quyền Nguyền biến nạn nhân thành Sói không?',
    call_seer: 'Tiên Tri ơi, đêm nay bạn muốn soi ai để tìm ra chân tướng?',
    call_witch: 'Phù Thủy ơi, đêm nay có người gặp nạn, bạn có muốn cứu hay dùng độc giết ai không?',
    call_serial_killer: 'Sát Nhân Độc Hành ơi, hãy thức dậy chọn mục tiêu thanh trừng đêm nay.',
    call_spellcaster: 'Pháp Sư Câm ơi, hãy thức dậy chọn một người bị khóa miệng vào ngày mai.',
    call_detective: 'Thám Tử ơi, hãy thức dậy chọn hai người để kiểm tra xem họ cùng phe hay khác phe.',
    morning_peaceful: 'Trời đã sáng, một đêm thật bình yên, không có ai bị hại!',
    morning_deaths: 'Trời đã sáng, đêm qua ngôi làng đã xảy ra biến cố đau thương. Người thiệt mạng là: {names}.',
    vote_start: 'Đã đến giờ biểu quyết treo cổ, hãy cân nhắc kỹ và bấm phiếu trên điện thoại.',
    vote_tie_revote: 'Số phiếu bị hòa! Cả làng sẽ tiến hành bỏ phiếu lại một lần nữa giữa những người bằng phiếu.',
    vote_tie_none: 'Số phiếu vẫn hòa! Hôm nay trời đã muộn, không ai bị treo cổ.',
    vote_eliminated: 'Kết quả biểu quyết: Người bị đưa lên giàn treo cổ hôm nay là {name}.',
    game_over_werewolf: 'Trò chơi kết thúc! Phe Ma Sói đã hoàn toàn làm chủ ngôi làng!',
    game_over_villager: 'Trò chơi kết thúc! Dân làng đã tiêu diệt hết Ma Sói và giành chiến thắng rực rỡ!',
    game_over_lovers: 'Trò chơi kết thúc! Tình yêu đích thực đã chiến thắng, Cặp Đôi Tình Nhân đã giành thắng lợi duy nhất!',
    game_over_serial_killer: 'Trò chơi kết thúc! Sát Nhân Độc Hành đã sống sót cuối cùng và quét sạch tất cả!',
    game_over_jester: 'Trò chơi kết thúc! Thằng Ngố đã lừa được cả làng treo cổ mình và thắng ngay lập tức!',
    day_no_lynch: 'Hôm nay không có ai bị treo cổ. Màn đêm lại chuẩn bị buông xuống...',
    night_silenced: 'Chú ý! Hôm nay {silencedName} đã bị Pháp Sư Câm khóa miệng, tuyệt đối không được phát biểu hay ra dấu!',
    sheriff_elected: 'Chúc mừng {name} đã được cả làng tin tưởng bầu làm Trưởng Làng, nắm giữ 1,5 phiếu quyền lực!',
    sheriff_transfer: 'Trưởng Làng trước khi ngã xuống đã trao lại huy hiệu quyền lực cho {name}!',
    last_words: 'Trước khi rời cuộc chơi, {name} có vài giây nói lời trăng trối cuối cùng!',
    hunter_revenge: 'Thợ Săn {name} trước khi ngã xuống đã kịp bóp cò kéo theo một mục tiêu!',
    avenger_revenge: 'Kẻ Báo Thù {name} bị treo cổ đã kích hoạt lời nguyền kéo theo một người chết chung!',
    cursed_turned: 'Bóng tối đã đánh thức dòng máu sói trong một dân làng...',
    campaign_intro: ''
  };

  // [C1] Kho cốt truyện mở rộng cho 3 chủ đề
  const THEME_NARRATIONS = {
    foggy_village: {
      night_start: [
        'Màn sương lạnh buốt tràn qua thung lũng, tiếng quạ kêu báo hiệu một đêm kinh hoàng bắt đầu.',
        'Ánh trăng khuất sau rừng thông u ám, cả ngôi làng hãy nhắm mắt lại trước khi bóng tối nuốt chửng.',
        'Gió rít qua khe cửa gỗ mục, màn đêm đặc quánh đã buông xuống. Mọi người hãy chìm vào giấc ngủ.'
      ],
      call_cupid: 'Trong làn sương mờ ảo, Thần Tình Yêu hãy thức dậy se duyên cho hai linh hồn.',
      call_guard: 'Người gác đêm ơi, giữa màn sương đặc quánh này, bạn muốn che chở cho ai?',
      call_werewolf: 'Bầy Sói đói khát trong rừng sương, hãy mở mắt nhận diện đồng loại và chọn con mồi đêm nay.',
      call_alpha_wolf: 'Sói Đầu Đàn quyền uy, bạn có muốn gieo lời nguyền biến nạn nhân thành Sói không?',
      call_seer: 'Tiên Tri nơi tháp chuông cổ, hãy thức dậy vén màn sương soi thấu một linh hồn.',
      call_witch: 'Phù Thủy trong căn chòi u tối, đêm nay có người gặp nạn, bạn dùng thuốc cứu hay thuốc độc?',
      call_serial_killer: 'Kẻ Sát Nhân ẩn mình trong sương mù, hãy lặng lẽ chọn nạn nhân tiếp theo.',
      call_spellcaster: 'Pháp Sư Câm ơi, hãy niệm chú khóa miệng một kẻ xấu số vào sáng mai.',
      call_detective: 'Thám Tử ơi, hãy lần theo dấu vết trong sương để đối chiếu hai người đêm nay.',
      morning_peaceful: [
        'Ánh bình minh le lói xua tan sương lạnh. Kỳ diệu thay, đêm qua không có giọt máu nào rơi xuống!',
        'Sương sớm tan dần trên mái nhà gỗ, cả ngôi làng thở phào vì tất cả vẫn còn sống sót.',
        'Tiếng chuông nhà thờ vang lên bình yên, đêm qua lũ quái vật đã không tìm được con mồi.'
      ],
      morning_deaths: [
        'Sương máu tan dần... Những người xấu số đã vĩnh viễn không thể thức dậy sáng nay là: {names}.',
        'Một tiếng thét xé tan màn sương sớm! Nạn nhân nằm lại bên giếng làng là: {names}.',
        'Khi bình minh hé rạng, dấu vết kinh hoàng để lại cho thấy {names} đã không qua khỏi đêm qua.'
      ],
      night_silenced: 'Lời nguyền câm lặng đã giáng xuống! Hôm nay {silencedName} bị khóa miệng hoàn toàn, cấm nói hay ra hiệu!',
      vote_start: [
        'Màn sương chưa tan hết nhưng nghi kỵ đã bùng lên! Hãy chọn kẻ bị đưa lên giá treo cổ.',
        'Đến giờ phán xét giữa quảng trường sương mù! Cả làng hãy bỏ phiếu trên điện thoại.',
        'Ánh mắt nghi ngờ đổ dồn về nhau, hãy quyết định xem ai phải rời khỏi ngôi làng hôm nay.'
      ],
      vote_tie_revote: 'Lá phiếu chia đôi giữa màn sương! Cả làng phải bỏ phiếu lại một lần nữa.',
      vote_tie_none: 'Bóng tối lại sắp phủ xuống mà phiếu vẫn hòa! Hôm nay không ai bị treo cổ.',
      vote_eliminated: 'Ánh lửa bập bùng tiễn bước kẻ bị kết tội: {name} đã chính thức lên giàn treo cổ!',
      day_no_lynch: 'Không ai bị đưa lên giá treo cổ hôm nay. Sương mù lại bắt đầu kéo về...',
      sheriff_elected: 'Giữa thời khắc đen tối, {name} được suy tôn làm Trưởng Làng với 1,5 phiếu uy quyền!',
      sheriff_transfer: 'Trước lúc lìa đời trong sương lạnh, Trưởng Làng đã trao huy hiệu lại cho {name}!',
      last_words: 'Trước khi màn sương nuốt trọn, {name} có vài giây trăng trối cuối cùng!',
      hunter_revenge: 'Thợ Săn {name} trước khi gục ngã vẫn kịp nổ phát súng vang dội vào màn sương!',
      avenger_revenge: 'Oán khí bùng phát! Kẻ Báo Thù {name} kéo theo một linh hồn xuống mồ chung!',
      cursed_turned: 'Trong tiếng tru giữa rừng sương, dòng máu sói ẩn giấu vừa thức tỉnh...',
      game_over_werewolf: 'Màn sương đỏ rực bao trùm tất cả! Bầy Sói đã làm chủ hoàn toàn ngôi làng ma ám!',
      game_over_villager: 'Bình minh rực sáng xua tan vĩnh viễn bóng tối! Dân làng đã tiêu diệt sạch bầy Sói!',
      game_over_lovers: 'Giữa chốn địa ngục sương mù, chỉ có tình yêu đích thực sống sót! Cặp Đôi chiến thắng!',
      game_over_serial_killer: 'Không Sói, chẳng Dân, chỉ còn Sát Nhân Độc Hành đứng cười lạnh giữa biển sương!',
      game_over_jester: 'Ha ha! Thằng Ngố đã lừa cả làng sương mù treo cổ mình và thắng ngoạn mục!'
    },

    drinking_banter: {
      night_start: [
        'Hết giờ cụng ly rồi các chiến thần! Tắt đèn đi ngủ, cấm ai lé mắt xem trộm đấy nhé.',
        'Tạm dừng kèo nhậu, úp mặt xuống bàn đi ngủ hết nào! Ai he hé mắt là phạt một ly đầy.',
        'Đèn tắt nhạc lên! Mời các con giời nhắm mắt giữ sức cho kèo đấu trí đêm nay.'
      ],
      call_cupid: 'Thần Tình Yêu ơi, dậy ghép kèo cho hai đứa ngồi cạnh nhau thành đôi uyên ương nào!',
      call_guard: 'Bảo Vệ ơi, đêm nay bạn muốn đỡ đạn hộ chiến hữu nào trên bàn nhậu?',
      call_werewolf: 'Bầy Sói ơi, mở mắt ra nháy nhau rồi chốt nhanh một nạn nhân cho anh em còn nhậu tiếp!',
      call_alpha_wolf: 'Sói Đầu Đàn ơi, có muốn cắn nhẹ biến nạn nhân thành đồng bọn nhậu chung phe không?',
      call_seer: 'Tiên Tri ơi, dậy soi nhân phẩm xem đứa nào đang gáy to mà thực chất là Sói nào!',
      call_witch: 'Phù Thủy ơi, có người sắp gục trên bàn rồi, cứu bạn hay tiện tay tiễn thêm một đứa?',
      call_serial_killer: 'Sát Nhân ơi, không cần phe phái gì hết, dậy xiên nhẹ một đứa cho bàn nhậu đỡ ồn!',
      call_spellcaster: 'Pháp Sư Câm ơi, dậy dán băng keo vô mồm một đứa hay nói đạo lý nhất bàn đi!',
      call_detective: 'Thám Tử ơi, dậy check xem hai khứa kia có đang cấu kết bóp đồng đội không!',
      morning_peaceful: [
        'Bình minh rồi! Tối qua Sói chắc say mèm ngủ quên nên làng mình vẫn còn nguyên xi!',
        'Dậy đi mấy ông thần! Đêm qua yên bình lạ thường, không ai phải ra ngoài ngồi cổ vũ cả.',
        'Chúc mừng cả bàn, tối qua Sói đá trượt khung thành nên sáng nay đủ quân số nhậu tiếp!'
      ],
      morning_deaths: [
        'Sáng bảnh mắt rồi! Chia buồn cùng chiến thần uống nước suối sáng nay: {names}.',
        'Rồi xong! Đêm qua có biến căng, mời {names} thu dọn đồ đạc ra ghế dự bị ngồi nhé.',
        'Tin buồn đầu ngày trên bàn nhậu: {names} đã chính thức bay màu sau một đêm sóng gió!'
      ],
      night_silenced: 'Chết chưa! Hôm nay {silencedName} bị dán băng keo khóa mồm, cạy răng cũng không được nói nửa lời!',
      vote_start: [
        'Tới giờ chỉ mặt đặt tên rồi! Đừng nể nang bạn nhậu, bấm phiếu cho chuẩn vào!',
        'Ai mặt gian nhất bàn thì bấm nút ngay! Biểu quyết treo cổ chính thức bắt đầu.',
        'Giờ phán xét tới rồi, coi chừng bị mấy con Sói nó thao túng tâm lý hết cả lũ đấy!'
      ],
      vote_tie_revote: 'Kèo căng đét, phiếu hòa rồi! Bầu lại phát nữa cho ra ngô ra khoai nào!',
      vote_tie_none: 'Vẫn hòa luôn! Thôi giải tán ai về nhà nấy, hôm nay không treo cổ ai hết.',
      vote_eliminated: 'Chốt đơn! Cả bàn đồng lòng tiễn {name} lên đường ra ngoài hóng gió!',
      day_no_lynch: 'Hôm nay hòa bình hữu nghị, không ai bị treo cổ. Chuẩn bị tắt đèn đi ngủ tiếp!',
      sheriff_elected: 'Vỗ tay! {name} chính thức lên chức Trưởng Làng, cầm hẳn 1,5 phiếu đi dọa thiên hạ!',
      sheriff_transfer: 'Trước khi bay màu, Trưởng Làng kịp ném lại chiếc ghế quyền lực cho {name}!',
      last_words: 'Cho {name} vài giây gào thét trăng trối lần cuối trước khi khóa mic!',
      hunter_revenge: 'Bùm! Thợ Săn {name} trước khi out game vẫn kịp kéo thêm một khứa chết chung cho vui!',
      avenger_revenge: 'Cay cú cực độ! Kẻ Báo Thù {name} bị treo cổ lập tức kéo một người xuống hố cùng!',
      cursed_turned: 'Ối dồi ôi, vừa có một dân làng bị cắn xong mọc luôn nanh sói rồi kìa!',
      game_over_werewolf: 'Toang cả bàn! Phe Ma Sói lừa lọc đỉnh cao đã dọn sạch bàn nhậu và thắng tuyệt đối!',
      game_over_villager: 'Đỉnh cao nhân phẩm! Dân làng đã lột mặt nạ hết bầy Sói và thắng giòn giã!',
      game_over_lovers: 'Tất cả chỉ là nền cho tình yêu! Cặp Đôi Tình Nhân ôm nhau thắng trọn cả ván!',
      game_over_serial_killer: 'Quá khét! Sát Nhân Độc Hành cân cả bản đồ, tiễn hết Sói lẫn Dân ra chuồng gà!',
      game_over_jester: 'Bị lừa tập thể rồi! Thằng Ngố cười khà khà ôm cúp chiến thắng nhờ cú treo cổ đi vào lòng đất!'
    },

    mansion_mystery: {
      night_start: [
        'Đồng hồ quả lắc trong dinh thự điểm chuông nửa đêm. Xin các vị khách lui về phòng ngủ và khóa chặt then cài.',
        'Ánh nến trên hành lang vụt tắt, dinh thự chìm vào tĩnh lặng chết người. Mời tất cả nhắm mắt.',
        'Bão tố gõ cửa kính lâu đài, đêm nay lại có kẻ toan tính mưu đồ đen tối. Xin hãy an giấc.'
      ],
      call_cupid: 'Thần Tình Yêu ẩn danh ơi, xin hãy chọn hai vị khách để kết nên mối lương duyên định mệnh.',
      call_guard: 'Vệ sĩ tận tụy ơi, đêm nay bạn chọn canh gác trước cửa phòng vị khách nào?',
      call_werewolf: 'Những kẻ mang mặt nạ Sói trong dinh thự, hãy mở mắt trao đổi ánh nhìn và chọn mục tiêu đêm nay.',
      call_alpha_wolf: 'Chủ nhân bóng tối Đầu Đàn, ngài có muốn dùng lời nguyền chiêu mộ thêm đồng phạm đêm nay?',
      call_seer: 'Nhà Chiêm Tinh ơi, hãy mở mắt và khám phá hồ sơ bí mật của một vị khách.',
      call_witch: 'Bậc thầy Độc Dược ơi, có người vừa trúng bẫy trong đêm, bạn sẽ giải cứu hay hạ độc ai khác?',
      call_serial_killer: 'Sát Thủ Lạnh Lùng ơi, hãy hành động một mình và chọn mục tiêu thanh trừng đêm nay.',
      call_spellcaster: 'Pháp Sư Câm ơi, hãy tước đi quyền phát ngôn của một vị khách vào buổi sáng mai.',
      call_detective: 'Thám Tử lừng danh ơi, hãy đối chiếu chứng cứ để xem hai vị khách có cùng phe hay không.',
      morning_peaceful: [
        'Trời đã rạng. Quản gia đi tuần tra và xác nhận đêm qua toàn bộ dinh thự vẫn an toàn tuyệt đối.',
        'Ánh nắng chiếu qua khung cửa sổ kính màu, không có án mạng nào xảy ra trong dinh thự đêm qua.',
        'Buổi sáng thanh bình hiếm hoi tại dinh thự, tất cả các vị khách đều có mặt đầy đủ tại sảnh chính.'
      ],
      morning_deaths: [
        'Hiện trường vụ án đã được phong tỏa! Những nạn nhân xấu số đêm qua trong dinh thự là: {names}.',
        'Tiếng chuông báo động vang lên khắp sảnh lớn! Nạn nhân vừa được phát hiện là: {names}.',
        'Đêm qua hung thủ đã ra tay tàn độc. Danh sách nạn nhân không qua khỏi gồm: {names}.'
      ],
      night_silenced: 'Thông báo khẩn! {silencedName} đã trúng bùa khóa miệng, tuyệt đối giữ im lặng suốt phiên điều trần hôm nay!',
      vote_start: [
        'Phiên điều trần tại đại sảnh bắt đầu! Hãy bỏ phiếu chỉ đích danh kẻ tình nghi số một.',
        'Mọi manh mối đã đặt lên bàn. Xin các vị khách bỏ phiếu quyết định số phận kẻ bị nghi ngờ.',
        'Không thể chần chừ thêm nữa, hãy bấm phiếu trên điện thoại để trục xuất hung thủ khỏi dinh thự!'
      ],
      vote_tie_revote: 'Hội đồng phân vân với số phiếu ngang nhau! Xin tiến hành bỏ phiếu lại giữa các nghi phạm.',
      vote_tie_none: 'Bế tắc hoàn toàn! Không đủ chứng cứ kết tội, hôm nay không ai bị trục xuất.',
      vote_eliminated: 'Phán quyết đã được thi hành! {name} chính thức bị kết án và đưa khỏi dinh thự.',
      day_no_lynch: 'Phiên xét xử khép lại mà chưa tìm ra hung thủ. Bóng đêm lại bao phủ tòa dinh thự...',
      sheriff_elected: 'Xin chúc mừng {name} được tín nhiệm giữ chức Trưởng Làng, nắm giữ lá phiếu 1,5 quyền lực!',
      sheriff_transfer: 'Trước khi nhắm mắt, Trưởng Làng đã trao lại chiếc nhẫn ấn tín cho {name}!',
      last_words: 'Theo nghi thức cuối cùng, {name} có vài giây để lại lời trăng trối trước toàn thể dinh thự!',
      hunter_revenge: 'Viên đạn cuối cùng! Thợ Săn {name} trước khi ngã xuống đã kịp bắn gục một nghi phạm!',
      avenger_revenge: 'Bản án kéo theo bi kịch! Kẻ Báo Thù {name} kích hoạt cái bẫy khiến một người chết chung!',
      cursed_turned: 'Một bí mật kinh hoàng vừa lộ diện: dòng máu sói trong một vị khách đã bị đánh thức...',
      game_over_werewolf: 'Vụ án khép lại trong bi kịch! Bầy Sói đã hạ màn và chiếm trọn tòa dinh thự!',
      game_over_villager: 'Chân tướng đã được phơi bày! Phe Dân Làng đã vạch trần toàn bộ hung thủ và chiến thắng!',
      game_over_lovers: 'Vượt qua mọi âm mưu tàn khốc, Cặp Đôi Tình Nhân trở thành những người chiến thắng duy nhất!',
      game_over_serial_killer: 'Một kịch bản không ai ngờ tới! Sát Thủ Độc Hành đã hạ gục từng người một để độc chiếm dinh thự!',
      game_over_jester: 'Cú lừa thế kỷ ngay tại tòa dinh thự! Thằng Ngố đã khiến mọi người tự tay kết án mình và thắng ngay lập tức!'
    }
  };

  // [C2] Kho lời dẫn biến thiên theo tình huống thật (khi dynamicEvents === true)
  const DYNAMIC_NARRATIONS = {
    lover_suicide_morning: {
      classic: 'Bi kịch tình yêu! Đêm qua một người gục ngã kéo theo người thương quyên sinh, cặp đôi {loverNames} đã cùng nhau ra đi.',
      foggy_village: 'Sương lạnh se sắt lòng người... Cặp đôi {loverNames} thề nguyền sống chết có nhau đã cùng nhau gục ngã trong đêm!',
      drinking_banter: 'Khổ thân quá! Một đứa bay màu thế là đứa kia cũng đòi uống cạn chén theo luôn, cặp đôi {loverNames} chính thức dắt tay nhau ra ngoài!',
      mansion_mystery: 'Một bi kịch đậm chất tiểu thuyết trong dinh thự: cái chết của một người đã khiến {loverNames} cùng tuẫn tiết theo tình yêu!'
    },
    lover_suicide_vote: {
      classic: 'Lá phiếu định mệnh đã chia cắt đôi uyên ương! Cặp đôi {loverNames} đã cùng nhau rời cuộc chơi vì lời thề tình yêu.',
      foggy_village: 'Giàn treo cổ không chỉ lấy đi một mạng! Tình yêu bi thương khiến cặp đôi {loverNames} cùng nhau tan biến vào sương đêm.',
      drinking_banter: 'Treo cổ một mà đi tận hai! Cặp đôi {loverNames} dính lời nguyền tình yêu nên dắt nhau ra ghế dự bị ngồi chung luôn rồi!',
      mansion_mystery: 'Phán quyết tại đại sảnh vô tình kéo theo bi kịch kép: cặp đôi {loverNames} đã cùng nhau rời khỏi dinh thự mãi mãi.'
    },
    multi_death: {
      classic: 'Một đêm kinh hoàng tột độ! Làng ta đã phải chứng kiến thảm kịch nhiều người ngã xuống cùng lúc: {names}.',
      foggy_village: 'Đêm đại họa nhuộm đỏ màn sương! Cùng lúc nhiều linh hồn đã lìa khỏi thế gian: {names}.',
      drinking_banter: 'Toang nặng rồi anh em ơi! Đêm qua có tới mấy pha ra tay liền tù tì, tiễn một lượt {names} ra ngoài ngồi!',
      mansion_mystery: 'Án mạng liên hoàn trong dinh thự! Sáng nay quản gia bàng hoàng phát hiện nhiều nạn nhân cùng lúc: {names}.'
    },
    peaceful_streak: {
      classic: 'Lạ lùng thay! Đã {streak} đêm liên tiếp ngôi làng bình yên vô sự, không có một ai thiệt mạng!',
      foggy_village: 'Một điều kỳ bí giữa rừng sương: đã {streak} đêm liền không một giọt máu nào rơi, phải chăng cơn bão lớn đang chực chờ?',
      drinking_banter: 'Ảo thật đấy! {streak} đêm liền Sói ngủ quên hay ăn chay trường vậy? Cả bàn vẫn bình an vô sự!',
      mansion_mystery: 'Hồ sơ dinh thự ghi nhận {streak} đêm liên tiếp hoàn toàn không có án mạng. Một sự tĩnh lặng đáng ngờ trước giờ G!'
    },
    final_three_peaceful: {
      classic: 'Bình minh sinh tử đã điểm! Chỉ còn đúng 3 người cuối cùng trụ lại, đêm qua bình yên nhưng hôm nay chắc chắn phải ngã ngũ!',
      foggy_village: 'Trong màn sương đặc chỉ còn đúng 3 bóng người! Đêm qua không ai chết, nhưng cuộc đối đầu sinh tử cuối cùng đã tới!',
      drinking_banter: 'Chung kết tổng chỉ còn đúng 3 chiến thần! Đêm qua hụt kèo rồi, hôm nay nhìn mặt nhau mà chốt hạ thôi!',
      mansion_mystery: 'Trong tòa dinh thự rộng lớn chỉ còn lại đúng 3 vị khách cuối cùng! Hung thủ và người vô tội sắp đối mặt trực diện!'
    },
    final_three_deaths: {
      classic: 'Trời đã sáng, nạn nhân đêm qua là {names}. Làng chỉ còn đúng 3 người cuối cùng bước vào vòng sinh tử!',
      foggy_village: 'Sương tan để lộ thi thể của {names}. Chỉ còn đúng 3 người sống sót cuối cùng cho trận chiến sinh tử hôm nay!',
      drinking_banter: 'Xin vĩnh biệt {names}! Trên bàn nhậu giờ chỉ còn đúng 3 mạng cuối cùng đấu trí giành cúp!',
      mansion_mystery: 'Nạn nhân {names} vừa gục ngã, để lại đúng 3 vị khách cuối cùng trong tòa dinh thự định mệnh!'
    },
    final_three_vote: {
      classic: 'Thời khắc quyết định vận mệnh cả ván đấu! Chỉ còn đúng 3 người cuối cùng, mỗi lá phiếu lúc này là sinh tử!',
      foggy_village: 'Vòng phán xét cuối cùng giữa 3 kẻ sống sót! Một lá phiếu sai lầm sẽ nhấn chìm tất cả vào sương đêm!',
      drinking_banter: 'Chung kết 3 người rồi mấy ní ơi! Bấm nhầm một phiếu là dâng cúp tận tay đối thủ ngay đấy!',
      mansion_mystery: 'Chỉ còn 3 vị khách tại bàn nghị sự! Đây là lá phiếu tối hậu quyết định ai là kẻ chiến thắng cuối cùng!'
    },
    night_one_victim: {
      classic: 'Mở màn đầy bất ngờ ngay Đêm 1! Ngôi làng chưa kịp làm quen đã phải tiễn biệt nạn nhân đầu tiên: {names}.',
      foggy_village: 'Tiếng tru đầu tiên trong màn sương Đêm 1 đã gọi tên {names}! Một khởi đầu đẫm máu và đầy u ám.',
      drinking_banter: 'Vừa mới vô ván Đêm 1 còn chưa kịp nóng máy mà {names} đã bị bế đi uống nước suối đầu tiên rồi!',
      mansion_mystery: 'Án mạng mở màn ngay Đêm đầu tiên tại dinh thự! Vị khách xấu số {names} đã trở thành nạn nhân đầu tiên.'
    },
    silenced_addendum: {
      classic: 'Đặc biệt chú ý: Hôm nay {silencedName} đã bị Pháp Sư Câm khóa miệng, tuyệt đối không được nói hay ra dấu!',
      foggy_village: 'Ngoài ra, lời nguyền câm lặng đã trói chặt {silencedName} suốt ngày hôm nay!',
      drinking_banter: 'À suýt quên: Hôm nay {silencedName} bị dán băng keo khóa mồm, chỉ được ngồi nghe chứ cấm hé răng nhé!',
      mansion_mystery: 'Lưu ý thêm từ hiện trường: {silencedName} đã bị tước quyền phát ngôn hoàn toàn trong phiên điều trần hôm nay!'
    }
  };

  function getStorage() {
    try {
      if (typeof window !== 'undefined' && window && window.localStorage) {
        return window.localStorage;
      }
    } catch (_) {
      // Bỏ qua lỗi truy cập localStorage
    }
    return null;
  }

  function createEmptyCampaignState() {
    return {
      gameCount: 0,
      lastWinnerTeam: '',
      lastWinnerLabel: '',
      lastFirstVictim: '',
      lastMvpName: '',
      wolfStreak: 0,
      villagerStreak: 0,
      history: []
    };
  }

  let memoryCampaignState = createEmptyCampaignState();

  function cloneCampaignState(state) {
    const src = state && typeof state === 'object' ? state : {};
    return {
      gameCount: Number(src.gameCount) || 0,
      lastWinnerTeam: typeof src.lastWinnerTeam === 'string' ? src.lastWinnerTeam : '',
      lastWinnerLabel: typeof src.lastWinnerLabel === 'string' ? src.lastWinnerLabel : '',
      lastFirstVictim: typeof src.lastFirstVictim === 'string' ? src.lastFirstVictim : '',
      lastMvpName: typeof src.lastMvpName === 'string' ? src.lastMvpName : '',
      wolfStreak: Number(src.wolfStreak) || 0,
      villagerStreak: Number(src.villagerStreak) || 0,
      history: Array.isArray(src.history)
        ? src.history.slice(-MAX_CAMPAIGN_HISTORY).map((item) => ({ ...(item || {}) }))
        : []
    };
  }

  function getCampaignState() {
    const storage = getStorage();
    if (storage) {
      try {
        const raw = storage.getItem(CAMPAIGN_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          memoryCampaignState = cloneCampaignState(parsed);
          return cloneCampaignState(memoryCampaignState);
        }
        memoryCampaignState = createEmptyCampaignState();
        return cloneCampaignState(memoryCampaignState);
      } catch (_) {
        // Fallback sang bộ nhớ tạm nếu JSON hỏng hoặc bị chặn
      }
    }
    return cloneCampaignState(memoryCampaignState);
  }

  function saveCampaignState(state) {
    const normalized = cloneCampaignState(state);
    memoryCampaignState = normalized;
    const storage = getStorage();
    if (storage) {
      try {
        storage.setItem(CAMPAIGN_STORAGE_KEY, JSON.stringify(normalized));
      } catch (_) {
        // Bỏ qua lỗi quota hoặc chế độ ẩn danh
      }
    }
    return cloneCampaignState(normalized);
  }

  const DEFAULT_TEAM_LABELS = {
    werewolf: 'Phe Ma Sói',
    villager: 'Phe Dân Làng',
    lovers: 'Cặp Đôi Tình Nhân',
    serial_killer: 'Sát Nhân Độc Hành',
    jester: 'Thằng Ngố'
  };

  function recordGameOutcome(outcome = {}) {
    const data = outcome && typeof outcome === 'object' ? outcome : {};
    const state = getCampaignState();

    const winnerTeam = String(data.winnerTeam || data.lastWinnerTeam || '').trim();
    const winnerLabel = String(
      data.winnerLabel || data.lastWinnerLabel || DEFAULT_TEAM_LABELS[winnerTeam] || ''
    ).trim();
    const firstVictim = String(data.firstVictim || data.lastFirstVictim || '').trim();
    const mvpName = String(data.mvpName || data.lastMvpName || '').trim();

    state.gameCount += 1;
    state.lastWinnerTeam = winnerTeam;
    state.lastWinnerLabel = winnerLabel;
    state.lastFirstVictim = firstVictim;
    state.lastMvpName = mvpName;

    if (winnerTeam === 'werewolf') {
      state.wolfStreak += 1;
      state.villagerStreak = 0;
    } else if (winnerTeam === 'villager') {
      state.villagerStreak += 1;
      state.wolfStreak = 0;
    } else {
      state.wolfStreak = 0;
      state.villagerStreak = 0;
    }

    state.history.push({
      gameNumber: state.gameCount,
      winnerTeam,
      winnerLabel,
      firstVictim,
      mvpName,
      timestamp: Date.now()
    });

    if (state.history.length > MAX_CAMPAIGN_HISTORY) {
      state.history = state.history.slice(-MAX_CAMPAIGN_HISTORY);
    }

    return saveCampaignState(state);
  }

  function resetCampaignState() {
    memoryCampaignState = createEmptyCampaignState();
    const storage = getStorage();
    if (storage) {
      try {
        storage.removeItem(CAMPAIGN_STORAGE_KEY);
      } catch (_) {
        // Bỏ qua lỗi xóa storage
      }
    }
    return cloneCampaignState(memoryCampaignState);
  }

  function normalizeTheme(storySettings) {
    const rawTheme = storySettings && typeof storySettings === 'object'
      ? storySettings.storyTheme
      : 'classic';
    if (rawTheme && Object.prototype.hasOwnProperty.call(STORY_THEMES, rawTheme)) {
      return rawTheme;
    }
    return 'classic';
  }

  function getCampaignOpening(storySettings = {}) {
    if (!storySettings || typeof storySettings !== 'object' || !storySettings.campaignMode) {
      return '';
    }
    const state = getCampaignState();
    if (!state.gameCount) {
      return '';
    }

    const theme = normalizeTheme(storySettings);
    const victim = state.lastFirstVictim;
    const winnerLabel = state.lastWinnerLabel || DEFAULT_TEAM_LABELS[state.lastWinnerTeam] || 'phe chiến thắng';

    if (state.wolfStreak >= 2) {
      const streak = state.wolfStreak;
      const victimPart = victim ? ` Đừng quên ván trước ${victim} vừa mở hàng ra đi ngay Đêm 1!` : '';
      if (theme === 'foggy_village') {
        return `Màn sương càng thêm u ám khi bầy Sói đã thắng liền ${streak} ván!${victimPart} Đêm nay dân làng liệu có lật ngược thế cờ?`;
      }
      if (theme === 'drinking_banter') {
        return `Ái chà! Bầy Sói đang gáy cực khét với chuỗi ${streak} ván thắng thông!${victimPart} Hôm nay anh em có lật kèo nổi không đây?`;
      }
      if (theme === 'mansion_mystery') {
        return `Chuỗi ${streak} vụ án liên tiếp phần thắng đều thuộc về bầy Sói!${victimPart} Dinh thự tối nay chờ một màn phá án danh dự!`;
      }
      return `Ván mới bắt đầu! Phe Ma Sói đang nắm chuỗi ${streak} trận thắng liên tiếp.${victimPart}`;
    }

    if (state.villagerStreak >= 2) {
      const streak = state.villagerStreak;
      const victimPart = victim ? ` Liệu ${victim} hôm nay có tránh được dớp nằm xuống ở Đêm 1 như ván trước?` : '';
      if (theme === 'foggy_village') {
        return `Ánh sáng hy vọng bừng lên sau chuỗi ${streak} ván thắng liên tiếp của Dân Làng!${victimPart}`;
      }
      if (theme === 'drinking_banter') {
        return `Nhân phẩm ngút trời! Dân Làng đang giữ chuỗi ${streak} ván toàn thắng!${victimPart} Tối nay Sói có gỡ gạc nổi không?`;
      }
      if (theme === 'mansion_mystery') {
        return `Phe Dân Làng đã phá giải thành công ${streak} vụ án liên hoàn!${victimPart} Cuộc đấu trí mới chính thức khai màn!`;
      }
      return `Ván mới bắt đầu! Dân Làng đang giữ chuỗi ${streak} trận thắng liên tiếp.${victimPart}`;
    }

    const victimNote = victim ? ` Nhắc nhẹ ${victim} ván trước vừa lên bảng Đêm 1, hôm nay nhớ cẩn thận nhé!` : '';
    const mvpNote = !victim && state.lastMvpName ? ` Ngôi sao nổi bật ván trước gọi tên ${state.lastMvpName}.` : '';
    if (theme === 'foggy_village') {
      return `Hồi chuông ván thứ ${state.gameCount + 1} vang lên sau chiến thắng của ${winnerLabel}.${victimNote}${mvpNote}`;
    }
    if (theme === 'drinking_banter') {
      return `Kèo mới lên sóng! Ván trước ${winnerLabel} vừa ẵm cúp xong.${victimNote}${mvpNote}`;
    }
    if (theme === 'mansion_mystery') {
      return `Chương tiếp theo tại dinh thự bắt đầu sau chiến thắng của ${winnerLabel}.${victimNote}${mvpNote}`;
    }
    return `Ván thứ ${state.gameCount + 1} bắt đầu! Ván trước ${winnerLabel} đã giành chiến thắng.${victimNote}${mvpNote}`;
  }

  function pickVariant(templateOrList, context) {
    if (!Array.isArray(templateOrList)) {
      return typeof templateOrList === 'string' ? templateOrList : '';
    }
    if (templateOrList.length === 0) return '';
    const round = context && context.round;
    if (Number.isInteger(round) && round >= 1) {
      return templateOrList[(round - 1) % templateOrList.length];
    }
    const idx = Math.floor(Math.random() * templateOrList.length);
    return templateOrList[idx];
  }

  function hasText(val) {
    return val !== undefined && val !== null && String(val).trim() !== '';
  }

  function hasNumber(val) {
    return val !== undefined && val !== null && val !== '' && !Number.isNaN(Number(val));
  }

  function applyPlaceholders(template, context) {
    if (!template || typeof template !== 'string') return '';
    const ctx = context && typeof context === 'object' ? context : {};

    const deadListStr = Array.isArray(ctx.deadNames) && ctx.deadNames.length > 0
      ? ctx.deadNames.join(', ')
      : '';
    const resolvedNames = hasText(ctx.names)
      ? String(ctx.names)
      : (deadListStr || (hasText(ctx.name) ? String(ctx.name) : ''));
    const resolvedName = hasText(ctx.name)
      ? String(ctx.name)
      : (hasText(ctx.names) ? String(ctx.names) : '');
    const resolvedLoverNames = hasText(ctx.loverNames)
      ? String(ctx.loverNames)
      : resolvedNames;
    const resolvedSilenced = hasText(ctx.silencedName) ? String(ctx.silencedName) : '';
    const resolvedWinner = hasText(ctx.winner)
      ? String(ctx.winner)
      : (hasText(ctx.winnerLabel) ? String(ctx.winnerLabel) : '');

    const rawCount = hasNumber(ctx.count)
      ? ctx.count
      : (hasNumber(ctx.deadCount)
        ? ctx.deadCount
        : (Array.isArray(ctx.deadNames) ? ctx.deadNames.length : null));
    const rawRound = hasNumber(ctx.round) ? ctx.round : null;
    const rawAlive = hasNumber(ctx.aliveCount) ? ctx.aliveCount : null;
    const rawStreak = hasNumber(ctx.streak)
      ? ctx.streak
      : (hasNumber(ctx.peacefulStreak) ? ctx.peacefulStreak : null);

    const replacements = {
      name: resolvedName,
      names: resolvedNames,
      loverNames: resolvedLoverNames,
      silencedName: resolvedSilenced,
      winner: resolvedWinner,
      count: rawCount !== null ? String(rawCount) : '',
      round: rawRound !== null ? String(rawRound) : '',
      aliveCount: rawAlive !== null ? String(rawAlive) : '',
      streak: rawStreak !== null ? String(rawStreak) : ''
    };

    return template.replace(
      /\{(name|names|loverNames|silencedName|count|round|aliveCount|streak|winner)\}/g,
      (match, key) => (replacements[key] !== '' ? replacements[key] : match)
    );
  }

  function resolveBaseOrThemeTemplate(eventKey, theme, context) {
    if (theme !== 'classic' && THEME_NARRATIONS[theme] && Object.prototype.hasOwnProperty.call(THEME_NARRATIONS[theme], eventKey)) {
      return pickVariant(THEME_NARRATIONS[theme][eventKey], context);
    }
    return BASE_NARRATIONS[eventKey] || '';
  }

  function isMultiDeath(context) {
    if (!context || typeof context !== 'object') return false;
    if (Number(context.deadCount) >= 2) return true;
    if (Array.isArray(context.deadNames) && context.deadNames.length >= 2) return true;
    return false;
  }

  function resolveDynamicTemplate(eventKey, theme, context) {
    const ctx = context && typeof context === 'object' ? context : {};

    if (eventKey === 'morning_deaths') {
      if (ctx.loverSuicide === true) {
        return DYNAMIC_NARRATIONS.lover_suicide_morning[theme] || DYNAMIC_NARRATIONS.lover_suicide_morning.classic;
      }
      if (isMultiDeath(ctx)) {
        return DYNAMIC_NARRATIONS.multi_death[theme] || DYNAMIC_NARRATIONS.multi_death.classic;
      }
      if (Number(ctx.aliveCount) === 3) {
        return DYNAMIC_NARRATIONS.final_three_deaths[theme] || DYNAMIC_NARRATIONS.final_three_deaths.classic;
      }
      if (Number(ctx.round) === 1) {
        return DYNAMIC_NARRATIONS.night_one_victim[theme] || DYNAMIC_NARRATIONS.night_one_victim.classic;
      }
    } else if (eventKey === 'vote_eliminated') {
      if (ctx.loverSuicide === true) {
        return DYNAMIC_NARRATIONS.lover_suicide_vote[theme] || DYNAMIC_NARRATIONS.lover_suicide_vote.classic;
      }
    } else if (eventKey === 'morning_peaceful') {
      if (Number(ctx.aliveCount) === 3) {
        return DYNAMIC_NARRATIONS.final_three_peaceful[theme] || DYNAMIC_NARRATIONS.final_three_peaceful.classic;
      }
      if (Number(ctx.peacefulStreak) >= 2) {
        return DYNAMIC_NARRATIONS.peaceful_streak[theme] || DYNAMIC_NARRATIONS.peaceful_streak.classic;
      }
    } else if (eventKey === 'vote_start') {
      if (Number(ctx.aliveCount) === 3) {
        return DYNAMIC_NARRATIONS.final_three_vote[theme] || DYNAMIC_NARRATIONS.final_three_vote.classic;
      }
    }

    return null;
  }

  /**
   * Hàm lấy câu dẫn chuyện thông minh:
   * - Khi storySettings rỗng hoặc ở mặc định -> Trả về đúng câu chuẩn BASE_NARRATIONS[eventKey] (v3.3)
   * - Khi bật C1, C2, C3 -> Biến thiên theo chủ đề, tình huống thật và trí nhớ Đêm Liên Hoàn
   */
  function getNarration(eventKey, context = {}, storySettings = {}) {
    if (!eventKey || typeof eventKey !== 'string') return '';

    const ctx = context && typeof context === 'object' ? context : {};
    const settings = storySettings && typeof storySettings === 'object' ? storySettings : {};

    if (eventKey === 'campaign_intro') {
      return getCampaignOpening(settings);
    }

    const theme = normalizeTheme(settings);
    const isDynamic = Boolean(settings.dynamicEvents);

    let template = isDynamic ? resolveDynamicTemplate(eventKey, theme, ctx) : null;
    if (!template) {
      template = resolveBaseOrThemeTemplate(eventKey, theme, ctx);
    }

    if (
      isDynamic &&
      (eventKey === 'morning_peaceful' || eventKey === 'morning_deaths') &&
      hasText(ctx.silencedName)
    ) {
      const silencedNote = DYNAMIC_NARRATIONS.silenced_addendum[theme] || DYNAMIC_NARRATIONS.silenced_addendum.classic;
      template = template ? `${template} ${silencedNote}` : silencedNote;
    }

    return applyPlaceholders(template, ctx);
  }

  // Gắn trực tiếp vào GameData
  Object.assign(window.GameData, {
    STORY_THEMES,
    DEFAULT_STORY_SETTINGS,
    BASE_NARRATIONS,
    THEME_NARRATIONS,
    getNarration,
    getCampaignState,
    recordGameOutcome,
    resetCampaignState,
    getCampaignOpening
  });
})();
