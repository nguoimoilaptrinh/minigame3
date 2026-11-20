// js/data-spy.js — Kho từ khóa, câu hỏi và địa điểm trò chơi Gián Điệp v4.0
window.GameData = window.GameData || {};

(() => {
  'use strict';

  const SPY_CARD_THEMES = {
    spy: {
      bgImage: 'assets/roles/spy.webp',
      themeColor: '#ef4444'
    },
    mr_white: {
      bgImage: 'assets/roles/spy.webp',
      themeColor: '#a855f7'
    },
    civilian: {
      bgImage: 'assets/roles/civilian.webp',
      themeColor: '#06b6d4'
    }
  };

  // 5 Bộ Chủ Đề cho Ai Là Gián Điệp (Undercover) - kèm Gợi ý khía cạnh mô tả
  const UNDERCOVER_DECKS = {
    drama: {
      label: '🔥 Tình Yêu, Drama & Hội Bạn Thân',
      pairs: [
        ['Người yêu cũ', 'Crush không hồi đáp', 'Tình cảm', 'Gợi ý: Nhắc đến cảm giác khi thấy người đó online'],
        ['Bạn thân khác giới', 'Em gái mưa', 'Quan hệ', 'Gợi ý: Nói về mức độ thân thiết dễ gây hiểu lầm'],
        ['Quỹ đen giấu vợ', 'Tiền mừng cưới', 'Tiền bạc', 'Gợi ý: Nhắc đến lúc cất giữ hoặc xài khoản tiền này'],
        ['Bùng kèo phút chót', 'Đi trễ 1 tiếng', 'Hội bạn', 'Gợi ý: Kể phản ứng của cả nhóm khi chuyện này xảy ra'],
        ['Nhậu say gọi người yêu cũ', 'Nhậu say khóc lóc', 'Bàn nhậu', 'Gợi ý: Kể cảnh tượng sáng hôm sau khi tỉnh dậy'],
        ['Bị cắm sừng', 'Ế truyền niên', 'Tình duyên', 'Gợi ý: Nói về tâm trạng mỗi dịp Valentine'],
        ['Thảo mai', 'Đạo đức giả', 'Tính cách', 'Gợi ý: Mô tả qua cách nói chuyện trước mặt và sau lưng'],
        ['Mối tình đầu', 'Tình một đêm', 'Kỷ niệm', 'Gợi ý: Độ khó quên và mức độ công khai với bạn bè'],
        ['Hỏi cưới bất ngờ', 'Chia tay qua tin nhắn', 'Bước ngoặt', 'Gợi ý: Phản ứng của người nhận được lời này'],
        ['Bạn mượn tiền không trả', 'Bạn chuyên đi ăn chực', 'Hội bạn', 'Gợi ý: Cách xử lý khi người đó nhắn tin rủ đi chơi'],
        ['Xem trộm điện thoại người yêu', 'Kiểm tra lịch sử tìm kiếm', 'Bí mật', 'Gợi ý: Cảm giác tim đập chân run lúc làm việc này'],
        ['Sống ảo check-in sang chảnh', 'Flex bảng lương', 'Mạng xã hội', 'Gợi ý: Mục đích thực sự khi đăng lên Facebook'],
        ['Ghét nhưng vẫn phải cười', 'Thích nhưng giả vờ chảnh', 'Tâm lý', 'Gợi ý: Biểu cảm khuôn mặt khi gặp người đó'],
        ['Hẹn hò qua Tinder', 'Xem mắt do bố mẹ sắp xếp', 'Hẹn hò', 'Gợi ý: Điều bạn lo lắng nhất trong buổi gặp đầu tiên'],
        ['Nói xấu sếp trong nhóm chat', 'Quên tắt mic khi họp online', 'Công sở', 'Gợi ý: Khoảnh khắc thót tim khi phát hiện ra sự cố'],
        ['Chụp ảnh dìm bạn thân', 'Tag bạn vào ảnh cũ thời trẩu', 'Tình bạn', 'Gợi ý: Hậu quả sau khi bấm nút đăng'],
        ['Ghen tuông vô cớ', 'Kiểm soát giờ giấc', 'Tình yêu', 'Gợi ý: Dấu hiệu nhận biết khi đối phương bắt đầu làm vậy'],
        ['Ăn cơm trước kẻng', 'Yêu xa khác múi giờ', 'Tình yêu', 'Gợi ý: Thử thách lớn nhất của hai người'],
        ['Tỏ tình bị từ chối', 'Bị xem tin nhắn không rep', 'Cảm xúc', 'Gợi ý: Mức độ quê và cách chữa ngượng'],
        ['Hội chị em cây khế', 'Hội anh em cột chèo', 'Nhóm bạn', 'Gợi ý: Chủ đề thường xuyên được bàn tán khi tụ tập'],
        ['Đòi lại quà sau chia tay', 'Block hết mọi nền tảng', 'Hậu chia tay', 'Gợi ý: Mức độ phũ phàng sau khi đường ai nấy đi'],
        ['Trà xanh', 'Bad boy', 'Nhân vật', 'Gợi ý: Chiêu thức thường dùng để thu hút người khác'],
        ['Lương 5 triệu sống kiểu 50 triệu', 'Có tiền nhưng mặc đồ rách', 'Lối sống', 'Gợi ý: Ấn tượng của người ngoài khi nhìn vào'],
        ['Hứa mai trả nợ', 'Hứa từ mai giảm cân', 'Lời hứa', 'Gợi ý: Tỉ lệ thành sự thật của câu nói này'],
        ['Lỡ tay thả tim ảnh cũ 3 năm trước', 'Nhắn nhầm vào nhóm có sếp', 'Tai nạn', 'Gợi ý: Tốc độ thu hồi và độ hoảng loạn lúc đó']
      ]
    },
    food: {
      label: '🍜 Ẩm Thực & Ăn Nhậu Việt Nam',
      pairs: [
        ['Phở bò', 'Bún bò Huế', 'Món nước', 'Gợi ý: Nước dùng, sợi bánh và rau ăn kèm'],
        ['Bún đậu mắm tôm', 'Bún chả Hà Nội', 'Bữa trưa', 'Gợi ý: Mùi vị đặc trưng và thứ chấm đi kèm'],
        ['Trứng vịt lộn', 'Trứng cút lộn xào me', 'Ăn vặt', 'Gợi ý: Cách ăn và cảm giác của người lần đầu thử'],
        ['Chân gà sả tắc', 'Nộm bò khô', 'Ăn vặt', 'Gợi ý: Vị chua cay mặn ngọt khi nhâm nhi buổi tối'],
        ['Trà sữa trân châu', 'Trà chanh giã tay', 'Đồ uống', 'Gợi ý: Topping đi kèm và độ phổ biến'],
        ['Cà phê sữa đá', 'Bạc xỉu', 'Cà phê', 'Gợi ý: Tỉ lệ sữa và độ đắng'],
        ['Bia hơi vỉa hè', 'Quán ốc đêm', 'Ăn nhậu', 'Gợi ý: Không khí ồn ào và những món gọi thêm'],
        ['Lẩu Thái chua cay', 'Lẩu riêu cua bắp bò', 'Món lẩu', 'Gợi ý: Hương vị nồi nước lẩu và đồ nhúng'],
        ['Bánh mì pate', 'Xôi xéo hành phi', 'Bữa sáng', 'Gợi ý: Mua vội buổi sáng trước giờ đi làm'],
        ['Cơm tấm sườn bì chả', 'Cơm gà xối mỡ', 'Cơm trưa', 'Gợi ý: Miếng thịt và chén nước mắm rưới lên'],
        ['Bánh chưng', 'Bánh tét', 'Ngày Tết', 'Gợi ý: Hình dáng bên ngoài và cách cắt ra đĩa'],
        ['Sầu riêng', 'Mít tố nữ', 'Trái cây', 'Gợi ý: Mùi hương và phản ứng của người ngồi cạnh'],
        ['Cháo lòng', 'Tiết canh', 'Món nhậu', 'Gợi ý: Độ kén người ăn và giờ bán quen thuộc'],
        ['Mì tôm úp trứng', 'Phở gói ăn liền', 'Đêm khuya', 'Gợi ý: Cứu đói lúc 12 giờ đêm khi lười ra đường'],
        ['Nước mía siêu sạch', 'Trà đá vỉa hè', 'Giải khát', 'Gợi ý: Giá tiền và độ mát lạnh ngày hè'],
        ['Thịt nướng BBQ', 'Lẩu Haidilao', 'Tụ tập', 'Gợi ý: Mùi ám lên quần áo sau khi ăn xong'],
        ['Nem chua rán', 'Khoai tây lắc phô mai', 'Ăn vặt', 'Gợi ý: Món gọi đầu tiên khi ngồi quán vỉa hè'],
        ['Gà rán KFC', 'Vịt quay Bắc Kinh', 'Món thịt', 'Gợi ý: Lớp da giòn bên ngoài và cách chấm'],
        ['Sinh tố bơ', 'Nước ép dưa hấu', 'Đồ uống', 'Gợi ý: Độ đặc sánh và màu sắc trong ly'],
        ['Bánh tráng trộn', 'Bánh tráng nướng Đà Lạt', 'Ăn vặt', 'Gợi ý: Cách chế biến và các nguyên liệu rắc lên'],
        ['Tôm hùm', 'Cua hoàng đế', 'Hải sản', 'Gợi ý: Độ đắt đỏ và công đoạn bóc vỏ'],
        ['Rượu táo mèo', 'Bia thủ công (Craft Beer)', 'Đồ có cồn', 'Gợi ý: Độ nặng đô và nơi thường thưởng thức'],
        ['Bánh cuốn nóng', 'Bánh xèo miền Tây', 'Bánh Việt', 'Gợi ý: Độ mỏng giòn và bát nước chấm'],
        ['Xoài xanh chấm mắm đường', 'Cóc bao tử muối ớt', 'Ăn vặt', 'Gợi ý: Độ chua khiến người nhìn cũng chảy nước miếng'],
        ['Kem Tràng Tiền', 'Sữa chua nếp cẩm', 'Tráng miệng', 'Gợi ý: Cảm giác mát lạnh và cách ăn']
      ]
    },
    trend: {
      label: '🎬 Showbiz, Phim Ảnh & Trend Mạng',
      pairs: [
        ['TikTok', 'YouTube Shorts', 'Video ngắn', 'Gợi ý: Thuật toán gây nghiện lúc 1 giờ sáng'],
        ['Livestream chốt đơn', 'Review quán ăn', 'Mạng xã hội', 'Gợi ý: Cách người dẫn nói chuyện trước camera'],
        ['Stalk Facebook người yêu cũ', 'Dùng nick ảo đi dạo', 'Mạng xã hội', 'Gợi ý: Mức độ cẩn thận sợ để lại dấu vết'],
        ['Netflix and Chill', 'Ra rạp xem suất khuya', 'Phim ảnh', 'Gợi ý: Không gian tối và những việc hay làm kèm'],
        ['Anh Trai Say Hi', 'Rap Việt', 'Gameshow', 'Gợi ý: Âm nhạc sôi động và lượng fan nữ đông đảo'],
        ['Phim kinh dị nửa đêm', 'Phim ngôn tình tổng tài', 'Thể loại phim', 'Gợi ý: Cảm xúc khi xem xong lúc tắt đèn'],
        ['ChatGPT làm bài tập', 'Copy bài từ Google', 'Công nghệ', 'Gợi ý: Mức độ phụ thuộc khi sát deadline'],
        ['Chơi Liên Quân', 'Chơi Tốc Chiến', 'Game Mobile', 'Gợi ý: Lý do hay cãi nhau với đồng đội'],
        ['Săn sale 0 giờ Shopee', 'Mua đồ ngoài chợ đêm', 'Mua sắm', 'Gợi ý: Cảm giác hồi hộp lúc chờ chốt đơn'],
        ['Hát Karaoke tay vịn', 'Hát Karaoke gia đình', 'Giải trí', 'Gợi ý: Người cầm mic và không khí trong phòng'],
        ['Nghe Podcast chữa lành', 'Nghe nhạc thất tình', 'Âm thanh', 'Gợi ý: Thời điểm hay đeo tai nghe mở lên'],
        ['Cosplay nhân vật Anime', 'Chụp ảnh kỷ yếu', 'Chụp ảnh', 'Gợi ý: Sự đầu tư trang phục và make-up'],
        ['Bắt trend nhảy TikTok', 'Quay Vlog một ngày', 'Sáng tạo', 'Gợi ý: Số lần phải quay đi quay lại'],
        ['Đọc bình luận hóng biến', 'Viết status triết lý', 'Facebook', 'Gợi ý: Thói quen khi có drama trên mạng'],
        ['Flex bằng đại học', 'Khoe ảnh du lịch Châu Âu', 'Sống ảo', 'Gợi ý: Phản ứng của bạn bè phía dưới bình luận'],
        ['Fan cứng K-Pop', 'Wibu chính hiệu', 'Cộng đồng', 'Gợi ý: Bộ sưu tập đồ lưu niệm ở nhà'],
        ['Chơi Ma Sói xuyên đêm', 'Đánh bài tiến lên', 'Board game', 'Gợi ý: Độ ồn ào và nguy cơ tan vỡ tình bạn'],
        ['Xem bóng đá quán cà phê', 'Chơi PES cùng hội bạn', 'Thể thao', 'Gợi ý: Tiếng hò hét mỗi khi suýt vào lưới'],
        ['Đăng story ẩn ý', 'Đổi avatar đen', 'Tâm trạng', 'Gợi ý: Dấu hiệu cho thấy chủ nhân đang có chuyện'],
        ['Đu idol đi concert', 'Đi phượt xuyên Việt', 'Trải nghiệm', 'Gợi ý: Chi phí bỏ ra và kỷ niệm nhớ đời'],
        ['Zalo công việc', 'Messenger hội bạn', 'Nhắn tin', 'Gợi ý: Cảm giác khi thấy thông báo tin nhắn mới'],
        ['Mua vé hạng thương gia', 'Ngồi xe khách giường nằm', 'Di chuyển', 'Gợi ý: Độ thoải mái và thời gian ngủ trên đường'],
        ['Chạy bộ hồ Tây', 'Tập Gym check-in gương', 'Thể thao', 'Gợi ý: Mục đích chụp ảnh đăng story'],
        ['Xem bói bài Tarot', 'Xem tử vi đầu năm', 'Tâm linh', 'Gợi ý: Niềm tin vào những lời phán về tình duyên'],
        ['Quán Bar quẩy tới sáng', 'Quán Pub chill nhẹ', 'Cuộc sống đêm', 'Gợi ý: Độ lớn của tiếng nhạc và đồ uống']
      ]
    },
    mind: {
      label: '🧠 Hack Não & Tâm Lý (Độ khó cao)',
      pairs: [
        ['Lời nói dối vô hại', 'Lời khen xã giao', 'Giao tiếp', 'Gợi ý: Nói ra để người nghe vui dù sự thật khác'],
        ['Tự tin', 'Tự cao', 'Tính cách', 'Gợi ý: Ranh giới mong manh khiến người khác nể hoặc ghét'],
        ['Thất tình', 'Thất nghiệp', 'Khủng hoảng', 'Gợi ý: Điều khiến người ta mất ngủ và hết tiền'],
        ['Giấc mơ', 'Ký ức', 'Tâm trí', 'Gợi ý: Hiện lên trong đầu khi nhắm mắt nhưng không chạm được'],
        ['Cô đơn giữa đám đông', 'Thích ở một mình', 'Cảm xúc', 'Gợi ý: Trạng thái tâm lý khi không nói chuyện với ai'],
        ['Hy vọng', 'Ảo tưởng', 'Tâm lý', 'Gợi ý: Khi bạn tin vào điều chưa chắc có thật'],
        ['Kiên nhẫn', 'Cố chấp', 'Thái độ', 'Gợi ý: Tiếp tục chờ đợi dù kết quả vẫn chưa thấy'],
        ['Tiết kiệm', 'Keo kiệt', 'Tiền bạc', 'Gợi ý: Cách nhìn nhận của người ngoài khi bạn không chịu chi'],
        ['Lãng mạn', 'Sến súa', 'Tình cảm', 'Gợi ý: Tùy thuộc vào người làm điều đó có đẹp trai hay không'],
        ['Ghen tị', 'Ngưỡng mộ', 'Cảm xúc', 'Gợi ý: Khi nhìn thấy thành công vượt trội của người khác'],
        ['Hối tiếc', 'Ân hận', 'Quá khứ', 'Gợi ý: Cảm giác giá như mình đã làm khác đi'],
        ['Thật thà', 'Vô duyên', 'Giao tiếp', 'Gợi ý: Nói thẳng sự thật mất lòng trước mặt nhiều người'],
        ['Lười biếng', 'Thư giãn', 'Trạng thái', 'Gợi ý: Nằm trên giường cả ngày Chủ nhật không làm gì'],
        ['Bí mật', 'Tin đồn', 'Thông tin', 'Gợi ý: Càng cấm kể thì tốc độ lan truyền càng nhanh'],
        ['Tham vọng', 'Tham lam', 'Động lực', 'Gợi ý: Muốn có nhiều hơn những gì mình đang sở hữu'],
        ['Tha thứ', 'Quên đi', 'Tâm lý', 'Gợi ý: Phản ứng sau khi bị người khác làm tổn thương'],
        ['Ngại ngùng', 'Khinh người', 'Ấn tượng', 'Gợi ý: Im lặng ít nói trong buổi gặp đầu tiên'],
        ['Thử thách', 'Rắc rối', 'Cuộc sống', 'Gợi ý: Tình huống khó khăn bất ngờ ập tới'],
        ['May mắn', 'Tài năng', 'Thành công', 'Gợi ý: Yếu tố giúp một người thắng lớn'],
        ['Chờ đợi', 'Bỏ cuộc', 'Hành động', 'Gợi ý: Quyết định đứng yên hay quay lưng bước đi'],
        ['Quen biết', 'Thân thiết', 'Quan hệ', 'Gợi ý: Mức độ hiểu nhau khi gặp ngoài đường'],
        ['Đam mê', 'Nghĩa vụ', 'Công việc', 'Gợi ý: Lý do khiến bạn thức dậy vào sáng thứ Hai'],
        ['Hài hước', 'Nhạt nhẽo', 'Giao tiếp', 'Gợi ý: Phản ứng của cả bàn sau khi bạn kể xong chuyện cười'],
        ['Tò mò', 'Nhiều chuyện', 'Thái độ', 'Gợi ý: Rất muốn biết chuyện riêng tư của nhà hàng xóm'],
        ['Hoài niệm', 'Lỗi thời', 'Thời gian', 'Gợi ý: Thích những món đồ và bài hát từ 10 năm trước']
      ]
    },
    life: {
      label: '🏙️ Đời Sống & Địa Danh Quen Thuộc',
      pairs: [
        ['Đà Lạt', 'Sa Pa', 'Du lịch', 'Gợi ý: Thời tiết se lạnh, sương mù và dốc cao'],
        ['Phú Quốc', 'Nha Trang', 'Biển đảo', 'Gợi ý: Hải sản, resort và nước biển xanh'],
        ['Bệnh viện', 'Phòng khám tư', 'Y tế', 'Gợi ý: Mùi thuốc sát trùng và việc phải xếp hàng chờ'],
        ['Trường học', 'Thư viện', 'Học tập', 'Gợi ý: Tiếng trống hoặc sự im lặng tuyệt đối'],
        ['Siêu thị', 'Chợ truyền thống', 'Mua sắm', 'Gợi ý: Có điều hòa niêm yết giá hay được trả giá thoải mái'],
        ['Sân bay', 'Nhà ga xe lửa', 'Di chuyển', 'Gợi ý: Kéo vali, soi chiếu an ninh và bảng giờ khởi hành'],
        ['Chung cư cao cấp', 'Nhà trọ sinh viên', 'Nhà ở', 'Gợi ý: Thang máy, bảo vệ và tiền dịch vụ hàng tháng'],
        ['Ô tô', 'Xe buýt', 'Phương tiện', 'Gợi ý: Ngồi máy lạnh ngắm đường phố nhưng có điểm dừng cố định'],
        ['Xe máy', 'Xe đạp điện', 'Phương tiện', 'Gợi ý: Luồn lách giờ tan tầm và đội mũ bảo hiểm'],
        ['Điều hòa', 'Quạt hơi nước', 'Gia dụng', 'Gợi ý: Vị cứu tinh trong những ngày nắng nóng 40 độ'],
        ['Máy giặt', 'Máy sấy quần áo', 'Gia dụng', 'Gợi ý: Xử lý đống đồ bẩn vào ngày trời mưa nồm'],
        ['Kính cận', 'Kính râm', 'Phụ kiện', 'Gợi ý: Đeo lên mũi để nhìn rõ hơn hoặc để tránh chói'],
        ['Chăn bông', 'Gối ôm', 'Phòng ngủ', 'Gợi ý: Thứ không thể thiếu trên giường mỗi đêm'],
        ['Ô che mưa', 'Áo mưa cánh dơi', 'Mùa mưa', 'Gợi ý: Dùng khi trời đổ mưa nhưng độ tiện trên xe máy khác nhau'],
        ['Bác sĩ', 'Y tá', 'Nghề nghiệp', 'Gợi ý: Mặc áo blouse trắng và trực ca đêm'],
        ['Công an giao thông', 'Bảo vệ dân phố', 'Nghề nghiệp', 'Gợi ý: Đứng ở ngã tư hoặc tuần tra đường phố'],
        ['Tài xế công nghệ', 'Shipper giao hàng', 'Nghề nghiệp', 'Gợi ý: Mặc áo đồng phục chạy ngoài đường suốt ngày'],
        ['Đám cưới quê', 'Tiệc cưới nhà hàng', 'Sự kiện', 'Gợi ý: Dàn loa công suất lớn và số lượng món ăn'],
        ['Tết Nguyên Đán', 'Tết Trung Thu', 'Lễ hội', 'Gợi ý: Sum họp gia đình và lì xì hay rước đèn'],
        ['Con muỗi', 'Con ruồi', 'Côn trùng', 'Gợi ý: Tiếng vo ve khó chịu quanh tai và cái vỉ đập'],
        ['Con chó', 'Con mèo', 'Thú cưng', 'Gợi ý: Cách thể hiện tình cảm khi chủ đi làm về'],
        ['Mặt trời', 'Mặt trăng', 'Bầu trời', 'Gợi ý: Ánh sáng và thời điểm xuất hiện trên cao'],
        ['Công viên nước', 'Bể bơi bốn mùa', 'Bơi lội', 'Gợi ý: Trò chơi trượt ống và mùi clo trong nước'],
        ['Khách sạn 5 sao', 'Homestay', 'Nghỉ dưỡng', 'Gợi ý: Cách trang trí phòng và dịch vụ đi kèm'],
        ['Lập trình viên', 'Thiết kế đồ họa', 'Nghề nghiệp', 'Gợi ý: Dán mắt vào màn hình máy tính xuyên đêm']
      ]
    }
  };

  // Chế độ: Điệp Viên Hỏi Xoáy (Câu Hỏi Lệch Pha) — 36 cặp
  const TWIST_QUESTION_PAIRS = [
    ['Nếu trúng số 10 tỷ ngày mai, việc đầu tiên bạn làm là gì?', 'Nếu trong ví chỉ còn đúng 50 nghìn, bạn sẽ mua gì hôm nay?', 'Tiền bạc'],
    ['Món ăn nào bạn có thể ăn cả tuần không ngán?', 'Món ăn nào bạn từng ăn xong bị đau bụng nhớ đời?', 'Ẩm thực'],
    ['Ở tuổi bao nhiêu thì bạn thấy kết hôn là đẹp nhất?', 'Ở tuổi bao nhiêu bạn từng làm chuyện ngốc nghếch nhất?', 'Cuộc đời'],
    ['Nếu được tàng hình trong 1 tiếng, bạn sẽ đi đâu?', 'Nơi nào bạn ghét nhất nhưng vẫn phải tới hàng tuần?', 'Bí mật'],
    ['Bạn sẽ nói câu gì nếu gặp lại người yêu cũ ngoài đường?', 'Bạn sẽ nói câu gì để đuổi khéo một người vay tiền?', 'Giao tiếp'],
    ['Điều gì khiến bạn sẵn sàng chi tiền không cần suy nghĩ?', 'Thứ gì mua xong bạn hối hận nhất năm nay?', 'Mua sắm'],
    ['Bạn thường mất bao lâu để chuẩn bị trước khi ra khỏi nhà?', 'Lần gần nhất bạn đi vệ sinh mất khoảng bao nhiêu phút?', 'Thời gian'],
    ['Ai trong bàn này là người đáng tin cậy nhất để giữ bí mật?', 'Ai trong bàn này nhìn mặt dễ bị dụ đa cấp nhất?', 'Hội bạn'],
    ['Một ngày cuối tuần lý tưởng của bạn kéo dài mấy tiếng ngủ?', 'Bạn có thể nhịn tắm tối đa bao nhiêu ngày vào mùa đông?', 'Thói quen'],
    ['Nếu phải sống trên hoang đảo, bạn mang theo ai trong phòng này?', 'Nếu bị kẹt thang máy, bạn sợ ở chung với ai trong phòng này nhất?', 'Sinh tồn'],
    ['Bạn thích nhận món quà gì nhất vào ngày sinh nhật?', 'Thứ vô dụng nhất từng có người tặng bạn là gì?', 'Quà tặng'],
    ['Khi tức giận tột độ, bạn thường làm gì để xả stress?', 'Khi mới ngủ dậy còn ngái ngủ, bạn hay làm gì đầu tiên?', 'Hành động'],
    ['Biệt danh dễ thương hồi nhỏ của bạn là gì?', 'Tên một món đồ bạn muốn vứt đi ngay lập tức là gì?', 'Tên gọi'],
    ['Mùi hương nào khiến bạn thấy thư giãn ngay lập tức?', 'Mùi gì khiến bạn muốn nín thở chạy thật nhanh?', 'Giác quan'],
    ['Bộ phận nào trên cơ thể người khác thu hút bạn đầu tiên?', 'Chỗ nào trên người bạn hay bị đau mỏi nhất gần đây?', 'Cơ thể'],
    ['Nếu được quay về 5 năm trước, bạn muốn nhắn nhủ bản thân điều gì?', 'Nếu gặp người lạ thang máy, bạn hay buột miệng nói câu gì?', 'Lời nói'],
    ['Con vật nào giống tính cách của bạn nhất?', 'Con vật nào bạn sợ nhìn thấy trong phòng ngủ nhất?', 'Động vật'],
    ['Sở trường tự tin nhất của bạn khi đi hát Karaoke là bài gì?', 'Thứ âm thanh nào khiến bạn nhức đầu mỗi sáng?', 'Âm thanh'],
    ['Bạn sẵn sàng bỏ ra tối đa bao nhiêu tiền cho một bữa ăn sang chảnh?', 'Bạn sẵn sàng cho bạn thân vay tối đa bao nhiêu tiền không cần giấy nợ?', 'Con số'],
    ['Lần gần nhất bạn khóc là vì lý do gì?', 'Lần gần nhất bạn cười đau bụng là vì chuyện gì?', 'Cảm xúc'],
    ['Theo bạn, tiêu chuẩn số 1 của một người yêu lý tưởng là gì?', 'Theo bạn, tật xấu khó chấp nhận nhất của sếp là gì?', 'Đánh giá'],
    ['Bạn thường làm gì vào lúc 1 giờ sáng khi chưa ngủ?', 'Việc gì bạn thấy mất thời gian nhất mỗi sáng đi làm?', 'Lịch trình'],
    ['Nếu đổi tên Facebook thành một câu slogan, bạn đặt là gì?', 'Câu cửa miệng của bố mẹ bạn mỗi khi mắng bạn là gì?', 'Câu nói'],
    ['Thành phố nào ở Việt Nam bạn muốn sống thử 1 năm?', 'Nơi nào nắng nóng hoặc kẹt xe khiến bạn phát điên nhất?', 'Địa điểm'],
    ['Bạn nghĩ mình sẽ có mấy đứa con trong tương lai?', 'Bạn đã từng làm vỡ bao nhiêu chiếc điện thoại rồi?', 'Số lượng'],
    ['Món đồ công nghệ nào bạn không thể sống thiếu?', 'Thứ gì trong nhà bạn hay làm thất lạc nhất?', 'Đồ vật'],
    ['Nếu được đóng vai phản diện trong phim, bạn muốn làm ác nhân nào?', 'Nhân vật hoạt hình nào bạn thấy giống thằng bạn thân nhất?', 'Nhân vật'],
    ['Bạn sẽ làm gì nếu phát hiện bạn thân nói xấu mình?', 'Bạn sẽ làm gì nếu lỡ làm đổ nước lên laptop sếp?', 'Xử lý tình huống'],
    ['Kiểu tóc nào bạn thấy hợp với mình nhất?', 'Kiểu ăn mặc nào bạn không bao giờ dám thử ra đường?', 'Ngoại hình'],
    ['Khi đi du lịch với hội bạn, bạn thường đảm nhận vai trò gì?', 'Khi dọn nhà đón Tết, bạn hay trốn tránh việc gì nhất?', 'Vai trò'],
    ['Bài học đắt giá nhất bạn rút ra từ năm ngoái là gì?', 'Mẹo vặt hài hước nhất bạn học được trên TikTok là gì?', 'Kinh nghiệm'],
    ['Bạn có thể uống tối đa mấy lon bia / ly trà sữa trong một buổi?', 'Mỗi ngày bạn uống khoảng mấy cốc cà phê?', 'Đồ uống'],
    ['Nếu được xóa bỏ 1 ngày trong tuần, bạn chọn thứ mấy?', 'Ngày nào trong tuần bạn hay tiêu tiền nhiều nhất?', 'Ngày trong tuần'],
    ['Ai là người nhắn tin với bạn nhiều nhất tuần qua?', 'Ai là người bạn hay bơ tin nhắn nhất?', 'Tin nhắn'],
    ['Điều điên rồ nhất bạn muốn làm trước tuổi 40 là gì?', 'Trò chơi cảm giác mạnh nào bạn thà chết không chơi lại lần 2?', 'Trải nghiệm'],
    ['Nếu sáng mai thức dậy biến thành tỷ phú, bạn nghỉ việc lúc mấy giờ?', 'Thường mấy giờ tối bạn mới bắt đầu ăn tối hoặc đặt đồ ăn?', 'Giờ giấc']
  ];

  // 30 Địa điểm Spyfall
  const SPYFALL_LOCATIONS = [
    { name: 'Bệnh viện', roles: ['Bác sĩ phẫu thuật', 'Y tá trực đêm', 'Bệnh nhân', 'Dược sĩ', 'Bảo vệ', 'Nhân viên xét nghiệm', 'Người nhà bệnh nhân', 'Bác sĩ thực tập'] },
    { name: 'Máy bay', roles: ['Cơ trưởng', 'Tiếp viên hàng không', 'Hành khách hạng thương gia', 'Hành khách say máy bay', 'Kỹ sư hàng không', 'An ninh sân bay', 'Khách du lịch', 'Em bé khóc nhè'] },
    { name: 'Trường học', roles: ['Hiệu trưởng', 'Giáo viên chủ nhiệm', 'Học sinh cá biệt', 'Lớp trưởng', 'Cô lao công', 'Chú bảo vệ', 'Thủ thư', 'Phụ huynh'] },
    { name: 'Quán cà phê', roles: ['Pha chế (Barista)', 'Thu ngân', 'Freelancer chạy deadline', 'Khách hẹn hò', 'Phục vụ bàn', 'Chủ quán', 'Sinh viên ôn thi', 'Nhân viên giao hàng'] },
    { name: 'Rạp chiếu phim', roles: ['Nhân viên bán bỏng ngô', 'Soát vé', 'Cặp đôi ngồi hàng ghế cuối', 'Người hay spoil phim', 'Kỹ thuật viên phòng chiếu', 'Khách đi xem một mình', 'Quản lý rạp', 'Tín đồ phim kinh dị'] },
    { name: 'Siêu thị', roles: ['Thu ngân', 'Nhân viên sắp xếp hàng', 'Bảo vệ quầy gửi đồ', 'Bà nội trợ đi săn sale', 'Nhân viên phát đồ ăn thử', 'Quản lý siêu thị', 'Khách mua mì gói nửa đêm', 'Thợ làm bánh'] },
    { name: 'Đám cưới', roles: ['Cô dâu', 'Chú rể', 'MC dẫn chương trình', 'Nhiếp ảnh gia', 'Bạn thân cô dâu', 'Nhân viên phục vụ tiệc', 'Khách đến ăn cỗ rồi về', 'Người yêu cũ đi dự'] },
    { name: 'Sở thú', roles: ['Người chăm sóc thú', 'Bác sĩ thú y', 'Hướng dẫn viên', 'Khách tham quan', 'Người bán bóng bay', 'Nhiếp ảnh gia', 'Bảo vệ cổng', 'Nhân viên vệ sinh'] },
    { name: 'Bãi biển', roles: ['Cứu hộ bờ biển', 'Người bán dừa tươi', 'Khách du lịch tắm nắng', 'Người chơi lướt sóng', 'Nhiếp ảnh gia', 'Nhân viên cho thuê phao', 'Đầu bếp hải sản', 'Khách đi xây lâu đài cát'] },
    { name: 'Ngân hàng', roles: ['Giao dịch viên', 'Giám đốc chi nhánh', 'Bảo vệ trực cửa', 'Khách hàng vay vốn', 'Nhân viên tư vấn thẻ', 'Kế toán trưởng', 'Người đi rút tiền', 'Kỹ thuật viên bảo trì ATM'] },
    { name: 'Đồn công an', roles: ['Cảnh sát hình sự', 'Trực ban tiếp dân', 'Cảnh sát giao thông', 'Người đi trình báo mất đồ', 'Luật sư', 'Điều tra viên', 'Phóng viên', 'Thực tập sinh'] },
    { name: 'Tàu hỏa', roles: ['Lái tàu', 'Trưởng tàu soát vé', 'Nhân viên đẩy xe đồ ăn', 'Hành khách nằm giường trên', 'Khách du lịch bụi', 'Sinh viên về quê', 'Kỹ thuật viên điện tàu', 'Người bán hàng rong ở ga'] },
    { name: 'Khách sạn 5 sao', roles: ['Lễ tân', 'Nhân viên khuân hành lý', 'Đầu bếp trưởng', 'Nhân viên buồng phòng', 'Khách VIP', 'Quản lý khách sạn', 'Bảo vệ sảnh', 'Nhân viên pha chế quầy bar'] },
    { name: 'Phòng tập Gym', roles: ['Huấn luyện viên cá nhân (PT)', 'Lễ tân quầy thẻ', 'Người mới đi tập lần đầu', 'Vận động viên thể hình', 'Nhân viên lau dọn', 'Bác sĩ dinh dưỡng', 'Khách chỉ đến chụp ảnh check-in', 'Quản lý phòng tập'] },
    { name: 'Tàu vũ trụ', roles: ['Chỉ huy phi hành đoàn', 'Kỹ sư động cơ', 'Nhà sinh học vũ trụ', 'Phi công lái tàu', 'Bác sĩ không gian', 'Chuyên gia liên lạc', 'Nhà thiên văn học', 'Robot trợ lý'] },
    { name: 'Tàu ngầm', roles: ['Thuyền trưởng', 'Kỹ sư hạt nhân', 'Nhân viên radar (Sonar)', 'Đầu bếp tàu ngầm', 'Bác sĩ quân y', 'Thủy thủ vận hành ngư lôi', 'Sĩ quan dẫn đường', 'Thợ máy'] },
    { name: 'Công viên giải trí', roles: ['Nhân viên vận hành tàu lượn', 'Người mặc đồ Mascot', 'Người bán kem', 'Khách sợ độ cao', 'Nhân viên soát vé', 'Y tế trực sơ cứu', 'Phụ huynh dắt trẻ nhỏ', 'Nhiếp ảnh gia'] },
    { name: 'Phim trường', roles: ['Đạo diễn', 'Diễn viên chính', 'Diễn viên đóng thế', 'Quay phim', 'Chuyên viên trang điểm', 'Người cầm micro thu âm', 'Biên kịch', 'Nhà sản xuất'] },
    { name: 'Nhà hàng lẩu nướng', roles: ['Đầu bếp thái thịt', 'Nhân viên thay vỉ nướng', 'Thu ngân', 'Khách hàng ăn buffet', 'Quản lý nhà hàng', 'Nhân viên rửa bát', 'Shipper đợi lấy đơn', 'Food reviewer'] },
    { name: 'Tiệm cắt tóc / Salon', roles: ['Thợ cắt tóc chính', 'Nhân viên gội đầu', 'Lễ tân', 'Khách hàng muốn đổi kiểu tóc', 'Thợ nhuộm tóc', 'Học việc quét tóc', 'Khách ngồi đợi', 'Chủ tiệm'] },
    { name: 'Sân vận động bóng đá', roles: ['Cầu thủ tiền đạo', 'Thủ môn', 'Trọng tài chính', 'Huấn luyện viên', 'Cổ động viên cuồng nhiệt', 'Bình luận viên', 'Nhân viên y tế sân', 'Người bán nước dạo'] },
    { name: 'Thư viện', roles: ['Thủ thư', 'Sinh viên ôn thi căng thẳng', 'Nhà nghiên cứu lịch sử', 'Người ngủ gật trong thư viện', 'Bảo vệ', 'Nhân viên xếp sách', 'Học sinh tìm tài liệu', 'Kỹ thuật viên máy tính'] },
    { name: 'Quán Karaoke', roles: ['Nhân viên chỉnh âm thanh', 'Phục vụ bê đồ uống', 'Khách hàng giữ mic không buông', 'Thu ngân', 'Bảo vệ giữ xe', 'Quản lý quán', 'Người chỉ ngồi bấm bài', 'Khách đi nhầm phòng'] },
    { name: 'Tàu du lịch biển', roles: ['Thuyền trưởng', 'Ca sĩ hát trên boong', 'Đầu bếp buffet', 'Nhân viên cứu hộ', 'Khách say sóng', 'Hướng dẫn viên du lịch', 'Nhiếp ảnh gia', 'Bartender'] },
    { name: 'Công trường xây dựng', roles: ['Kỹ sư giám sát', 'Kiến trúc sư', 'Thợ lái cần cẩu', 'Thợ hồ', 'Thợ điện', 'Bảo vệ công trường', 'Chủ đầu tư đi kiểm tra', 'Nhân viên an toàn lao động'] },
    { name: 'Chợ đêm', roles: ['Chủ sạp quần áo', 'Người bán xiên bẩn', 'Khách du lịch trả giá', 'Bảo vệ khu chợ', 'Ca sĩ hát rong', 'Người bán phụ kiện điện thoại', 'Shipper', 'Vlogger ẩm thực'] },
    { name: 'Rạp xiếc', roles: ['Nghệ sĩ nhào lộn', 'Chú hề', 'Người huấn luyện sư tử', 'Nhà ảo thuật', 'MC giới thiệu tiết mục', 'Nhân viên bán vé', 'Khán giả nhí', 'Kỹ thuật viên ánh sáng'] },
    { name: 'Cắm trại trong rừng', roles: ['Trưởng đoàn phượt', 'Người nhóm lửa trại', 'Người đàn guitar hát', 'Hướng dẫn viên rừng', 'Nhiếp ảnh gia thiên nhiên', 'Người sợ côn trùng', 'Đầu bếp nướng BBQ', 'Người dựng lều'] },
    { name: 'Tiệm sửa xe', roles: ['Thợ sửa máy trưởng', 'Thợ vá lốp', 'Khách hàng hỏng xe giữa đường', 'Thu ngân', 'Học việc', 'Nhân viên rửa xe', 'Người bán phụ tùng', 'Shipper đợi sửa xe'] },
    { name: 'Văn phòng công ty', roles: ['Giám đốc (Sếp)', 'Trưởng phòng nhân sự', 'Thực tập sinh pha trà', 'Lập trình viên IT', 'Kế toán', 'Lễ tân', 'Nhân viên kinh doanh', 'Bảo vệ tòa nhà'] }
  ];

  // Bộ 15 câu hỏi thẩm vấn mẫu cho Spyfall
  const SPYFALL_QUESTIONS = [
    'Bạn có hay đến chỗ này vào ban đêm không?',
    'Đến đây thường phải mặc trang phục như thế nào?',
    'Mùi đặc trưng nhất ở nơi này là mùi gì?',
    'Hôm nay bạn đi một mình hay đi cùng ai tới đây?',
    'Ở đây thứ gì đắt tiền nhất?',
    'Trẻ con dưới 5 tuổi tới đây có hợp không?',
    'Bạn có cần mua vé hay xếp hàng trước khi vào đây không?',
    'Âm thanh bạn nghe thấy rõ nhất ở xung quanh là gì?',
    'Nếu bị mất đồ ở đây, bạn sẽ chạy đi tìm ai đầu tiên?',
    'Bạn thường ở lại chỗ này khoảng bao lâu?',
    'Trong túi bạn lúc này thường mang theo món đồ gì liên quan tới nơi đây?',
    'Ở đây có quy định cấm chụp ảnh hay cấm nói to không?',
    'Bạn thích nhất góc nào tại nơi này?',
    'Công việc của bạn ở đây có vất vả về thể lực không?',
    'Nếu trời đổ mưa to thì nơi này có bị ảnh hưởng gì không?'
  ];

  // Thử thách / Gợi ý dẫn chuyện của Bot cho từng vòng chơi Gián Điệp
  const ROUND_SPARKS = [
    'Mô tả bằng 1 câu ngắn gọn dựa trên trải nghiệm cá nhân của bạn!',
    'Không dùng từ đồng nghĩa trực tiếp — hãy nói về cảm xúc hoặc tình huống khi gặp nó!',
    'Vòng xoáy nhanh: Mỗi người chỉ được nói đúng 3 đến 5 từ để mô tả!',
    'Hãy đặt ra một giả định: "Nếu thiếu thứ này thì..." hoặc "Lần gầnশেষ bạn thấy..."!',
    'Mô tả gián tiếp: Nói thứ gì thường đi kèm hoặc đối lập với từ khóa của bạn!'
  ];

  // ---------------------------------------------------------------------------
  // [G7] BỘ ĐỀ NỘI BỘ HỘI MÌNH & [G5] LỊCH SỬ CHỐNG LẶP 50 MÃ ĐỀ (In-Memory Fallback)
  // ---------------------------------------------------------------------------

  const MAX_HISTORY = 50;
  let inMemoryStorage = {
    hq_spy_history_v4: { undercover: [], twist: [], spyfall: [] },
    hq_custom_spy_decks: { undercover: [], twist: [], spyfall: [] }
  };

  function safeLocalStorageGet(key) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const val = window.localStorage.getItem(key);
        if (val) return JSON.parse(val);
      }
    } catch (e) {
      // Fallback
    }
    return inMemoryStorage[key] || null;
  }

  function safeLocalStorageSet(key, data) {
    inMemoryStorage[key] = data;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, JSON.stringify(data));
        return true;
      }
    } catch (e) {
      // Fallback
    }
    return false;
  }

  // Lịch sử chống lặp
  function getPlayedHistory(mode) {
    const data = safeLocalStorageGet('hq_spy_history_v4') || { undercover: [], twist: [], spyfall: [] };
    if (!data[mode] || !Array.isArray(data[mode])) {
      data[mode] = [];
    }
    return data[mode];
  }

  function recordPlayedItem(mode, itemId) {
    if (!itemId) return;
    const data = safeLocalStorageGet('hq_spy_history_v4') || { undercover: [], twist: [], spyfall: [] };
    if (!data[mode] || !Array.isArray(data[mode])) {
      data[mode] = [];
    }
    data[mode] = data[mode].filter((id) => id !== itemId);
    data[mode].unshift(itemId);
    if (data[mode].length > MAX_HISTORY) {
      data[mode] = data[mode].slice(0, MAX_HISTORY);
    }
    safeLocalStorageSet('hq_spy_history_v4', data);
  }

  function clearPlayedHistory(mode) {
    const data = safeLocalStorageGet('hq_spy_history_v4') || { undercover: [], twist: [], spyfall: [] };
    if (mode && data[mode]) {
      data[mode] = [];
    } else {
      data.undercover = [];
      data.twist = [];
      data.spyfall = [];
    }
    safeLocalStorageSet('hq_spy_history_v4', data);
  }

  function makeSpyItemId(mode, item) {
    if (!item) return '';
    if (mode === 'undercover') {
      const a = String((Array.isArray(item) ? item[0] : item.wordA) || '').trim().toLowerCase();
      const b = String((Array.isArray(item) ? item[1] : item.wordB) || '').trim().toLowerCase();
      return 'uc:' + a + '|' + b;
    }
    if (mode === 'twist') {
      const a = String((Array.isArray(item) ? item[0] : item.qCivilian) || '').trim().toLowerCase();
      const b = String((Array.isArray(item) ? item[1] : item.qSpy) || '').trim().toLowerCase();
      return 'tw:' + a + '|' + b;
    }
    if (mode === 'spyfall') {
      const name = String((item && item.name) || item || '').trim().toLowerCase();
      return 'sf:' + name;
    }
    return '';
  }

  // Bộ đề nội bộ CRUD
  function getCustomSpyDecks() {
    const stored = safeLocalStorageGet('hq_custom_spy_decks');
    if (stored && typeof stored === 'object') {
      return {
        undercover: Array.isArray(stored.undercover) ? stored.undercover : [],
        twist: Array.isArray(stored.twist) ? stored.twist : [],
        spyfall: Array.isArray(stored.spyfall) ? stored.spyfall : []
      };
    }
    return { undercover: [], twist: [], spyfall: [] };
  }

  function saveCustomSpyDecks(decks) {
    safeLocalStorageSet('hq_custom_spy_decks', decks);
  }

  function generateId(prefix = 'item') {
    return prefix + '_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
  }

  function addCustomUndercoverPair(wordA, wordB, category = 'Nội bộ hội', hint = '') {
    const wA = String(wordA || '').trim().slice(0, 60);
    const wB = String(wordB || '').trim().slice(0, 60);
    const cat = String(category || 'Nội bộ hội').trim().slice(0, 40) || 'Nội bộ hội';
    const h = String(hint || '').trim().slice(0, 120);

    if (!wA || !wB || wA.toLowerCase() === wB.toLowerCase()) {
      return null;
    }

    const decks = getCustomSpyDecks();
    const exists = decks.undercover.some((item) => {
      const ia = String(item.wordA || '').trim().toLowerCase();
      const ib = String(item.wordB || '').trim().toLowerCase();
      return (ia === wA.toLowerCase() && ib === wB.toLowerCase()) || (ia === wB.toLowerCase() && ib === wA.toLowerCase());
    });

    if (exists) return null;

    const newItem = {
      id: generateId('uc'),
      wordA: wA,
      wordB: wB,
      category: cat,
      hint: h
    };

    decks.undercover.push(newItem);
    saveCustomSpyDecks(decks);
    return newItem;
  }

  function removeCustomUndercoverPair(id) {
    const decks = getCustomSpyDecks();
    const initialLen = decks.undercover.length;
    decks.undercover = decks.undercover.filter((item) => item.id !== id);
    if (decks.undercover.length !== initialLen) {
      saveCustomSpyDecks(decks);
      return true;
    }
    return false;
  }

  function addCustomTwistQuestion(qCivilian, qSpy, category = 'Nội bộ hội') {
    const qc = String(qCivilian || '').trim().slice(0, 160);
    const qs = String(qSpy || '').trim().slice(0, 160);
    const cat = String(category || 'Nội bộ hội').trim().slice(0, 40) || 'Nội bộ hội';

    if (!qc || !qs || qc.toLowerCase() === qs.toLowerCase()) {
      return null;
    }

    const decks = getCustomSpyDecks();
    const exists = decks.twist.some((item) => {
      const ia = String(item.qCivilian || '').trim().toLowerCase();
      const ib = String(item.qSpy || '').trim().toLowerCase();
      return ia === qc.toLowerCase() && ib === qs.toLowerCase();
    });

    if (exists) return null;

    const newItem = {
      id: generateId('tw'),
      qCivilian: qc,
      qSpy: qs,
      category: cat
    };

    decks.twist.push(newItem);
    saveCustomSpyDecks(decks);
    return newItem;
  }

  function removeCustomTwistQuestion(id) {
    const decks = getCustomSpyDecks();
    const initialLen = decks.twist.length;
    decks.twist = decks.twist.filter((item) => item.id !== id);
    if (decks.twist.length !== initialLen) {
      saveCustomSpyDecks(decks);
      return true;
    }
    return false;
  }

  function addCustomSpyfallLocation(name, roles) {
    const locName = String(name || '').trim().slice(0, 60);
    if (!locName) return null;

    let roleList = [];
    if (Array.isArray(roles)) {
      roleList = roles.map((r) => String(r || '').trim()).filter(Boolean);
    } else if (typeof roles === 'string') {
      roleList = roles.split(/[,;|]/).map((r) => r.trim()).filter(Boolean);
    }

    const fallbackRoles = ['Người tham gia', 'Khách mời', 'Quản lý', 'Nhân viên'];
    while (roleList.length < 4) {
      const fallback = fallbackRoles[roleList.length % fallbackRoles.length];
      if (!roleList.includes(fallback)) {
        roleList.push(fallback);
      } else {
        roleList.push('Thành viên ' + (roleList.length + 1));
      }
    }

    const decks = getCustomSpyDecks();
    const exists = decks.spyfall.some((item) => String(item.name || '').trim().toLowerCase() === locName.toLowerCase());
    if (exists) return null;

    const newItem = {
      id: generateId('sf'),
      name: locName,
      roles: roleList.map((r) => r.slice(0, 40))
    };

    decks.spyfall.push(newItem);
    saveCustomSpyDecks(decks);
    return newItem;
  }

  function removeCustomSpyfallLocation(id) {
    const decks = getCustomSpyDecks();
    const initialLen = decks.spyfall.length;
    decks.spyfall = decks.spyfall.filter((item) => item.id !== id);
    if (decks.spyfall.length !== initialLen) {
      saveCustomSpyDecks(decks);
      return true;
    }
    return false;
  }

  function importCustomSpyText(mode, rawText) {
    const lines = String(rawText || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    let added = 0;
    let skipped = 0;
    const items = [];

    for (const line of lines) {
      const parts = line.includes('|') ? line.split('|').map((p) => p.trim()) : line.split(';').map((p) => p.trim());
      if (mode === 'undercover') {
        if (parts.length >= 2) {
          const res = addCustomUndercoverPair(parts[0], parts[1], parts[2] || 'Nội bộ hội', parts[3] || '');
          if (res) {
            added++;
            items.push(res);
          } else {
            skipped++;
          }
        } else {
          skipped++;
        }
      } else if (mode === 'twist') {
        if (parts.length >= 2) {
          const res = addCustomTwistQuestion(parts[0], parts[1], parts[2] || 'Nội bộ hội');
          if (res) {
            added++;
            items.push(res);
          } else {
            skipped++;
          }
        } else {
          skipped++;
        }
      } else if (mode === 'spyfall') {
        if (parts.length >= 1) {
          const name = parts[0];
          const rolesStr = parts[1] || '';
          const res = addCustomSpyfallLocation(name, rolesStr);
          if (res) {
            added++;
            items.push(res);
          } else {
            skipped++;
          }
        } else {
          skipped++;
        }
      } else {
        skipped++;
      }
    }

    return { added, skipped, items };
  }

  function exportCustomSpyDecks() {
    return JSON.stringify(getCustomSpyDecks(), null, 2);
  }

  function clearCustomSpyDecks(mode) {
    const decks = getCustomSpyDecks();
    if (mode === 'undercover' || mode === 'twist' || mode === 'spyfall') {
      decks[mode] = [];
    } else {
      decks.undercover = [];
      decks.twist = [];
      decks.spyfall = [];
    }
    saveCustomSpyDecks(decks);
  }

  function getCustomDeckStats() {
    const decks = getCustomSpyDecks();
    const undercoverCount = decks.undercover.length;
    const twistCount = decks.twist.length;
    const spyfallCount = decks.spyfall.length;
    return {
      undercoverCount,
      twistCount,
      spyfallCount,
      total: undercoverCount + twistCount + spyfallCount
    };
  }

  function getAllTwistQuestions() {
    const custom = getCustomSpyDecks().twist.map((item) => [item.qCivilian, item.qSpy, item.category || 'Nội bộ hội']);
    return [...TWIST_QUESTION_PAIRS, ...custom];
  }

  function getAllSpyfallLocations() {
    const custom = getCustomSpyDecks().spyfall.map((item) => ({ name: item.name, roles: item.roles }));
    return [...SPYFALL_LOCATIONS, ...custom];
  }

  function getDeckPairs(deckKey) {
    const customPairs = getCustomSpyDecks().undercover.map((item) => [item.wordA, item.wordB, item.category || 'Nội bộ hội', item.hint || '']);
    
    if (deckKey === 'custom') {
      return customPairs;
    }
    if (!deckKey || deckKey === 'all') {
      const standardPairs = Object.values(UNDERCOVER_DECKS).flatMap((d) => d.pairs);
      return [...standardPairs, ...customPairs];
    }
    const standard = UNDERCOVER_DECKS[deckKey]?.pairs || UNDERCOVER_DECKS.drama.pairs;
    return standard;
  }

  // 3 hàm bốc đề thông minh không lặp
  function pickUndercoverPair(deckKey = 'all', options = {}) {
    const record = options.record !== false;
    const rng = typeof options.rng === 'function' ? options.rng : Math.random;
    const fallbackToAll = options.fallbackToAll !== false;

    let pool = getDeckPairs(deckKey);
    if ((!pool || pool.length === 0) && deckKey === 'custom' && fallbackToAll) {
      pool = getDeckPairs('all');
    }
    if (!pool || pool.length === 0) {
      return ['Lập trình viên', 'Tester', 'Công nghệ', 'Gợi ý: Bug và Fix'];
    }

    const history = getPlayedHistory('undercover');
    const normalizedPool = pool.map((item) => {
      if (Array.isArray(item)) {
        return [item[0] || '', item[1] || '', item[2] || '', item[3] || ''];
      }
      return [item.wordA || '', item.wordB || '', item.category || '', item.hint || ''];
    });

    let unplayed = normalizedPool.filter((item) => {
      const id = makeSpyItemId('undercover', item);
      return !history.includes(id);
    });

    if (unplayed.length === 0) {
      const poolIds = normalizedPool.map((item) => makeSpyItemId('undercover', item));
      const currentHistory = getPlayedHistory('undercover');
      const filteredHistory = currentHistory.filter((id) => !poolIds.includes(id));
      const data = safeLocalStorageGet('hq_spy_history_v4') || { undercover: [], twist: [], spyfall: [] };
      data.undercover = filteredHistory;
      safeLocalStorageSet('hq_spy_history_v4', data);

      unplayed = normalizedPool;
    }

    if (unplayed.length === 0) {
      unplayed = normalizedPool;
    }

    const picked = unplayed[Math.floor(rng() * unplayed.length)];
    if (record) {
      recordPlayedItem('undercover', makeSpyItemId('undercover', picked));
    }
    return picked;
  }

  function pickTwistQuestion(options = {}) {
    const record = options.record !== false;
    const rng = typeof options.rng === 'function' ? options.rng : Math.random;
    const includeCustom = options.includeCustom !== false;
    const customOnly = options.customOnly === true;

    let pool = [];
    if (customOnly) {
      pool = getCustomSpyDecks().twist.map((item) => [item.qCivilian, item.qSpy, item.category || 'Nội bộ hội']);
    } else if (includeCustom) {
      pool = getAllTwistQuestions();
    } else {
      pool = TWIST_QUESTION_PAIRS;
    }

    if (!pool || pool.length === 0) {
      pool = TWIST_QUESTION_PAIRS;
    }

    const history = getPlayedHistory('twist');
    const normalizedPool = pool.map((item) => {
      if (Array.isArray(item)) {
        return [item[0] || '', item[1] || '', item[2] || ''];
      }
      return [item.qCivilian || '', item.qSpy || '', item.category || ''];
    });

    let unplayed = normalizedPool.filter((item) => {
      const id = makeSpyItemId('twist', item);
      return !history.includes(id);
    });

    if (unplayed.length === 0) {
      const poolIds = normalizedPool.map((item) => makeSpyItemId('twist', item));
      const currentHistory = getPlayedHistory('twist');
      const filteredHistory = currentHistory.filter((id) => !poolIds.includes(id));
      const data = safeLocalStorageGet('hq_spy_history_v4') || { undercover: [], twist: [], spyfall: [] };
      data.twist = filteredHistory;
      safeLocalStorageSet('hq_spy_history_v4', data);

      unplayed = normalizedPool;
    }

    if (unplayed.length === 0) {
      unplayed = normalizedPool;
    }

    const picked = unplayed[Math.floor(rng() * unplayed.length)];
    if (record) {
      recordPlayedItem('twist', makeSpyItemId('twist', picked));
    }
    return picked;
  }

  function pickSpyfallLocation(options = {}) {
    const record = options.record !== false;
    const rng = typeof options.rng === 'function' ? options.rng : Math.random;
    const includeCustom = options.includeCustom !== false;
    const customOnly = options.customOnly === true;

    let pool = [];
    if (customOnly) {
      pool = getCustomSpyDecks().spyfall.map((item) => ({ name: item.name, roles: item.roles }));
    } else if (includeCustom) {
      pool = getAllSpyfallLocations();
    } else {
      pool = SPYFALL_LOCATIONS;
    }

    if (!pool || pool.length === 0) {
      pool = SPYFALL_LOCATIONS;
    }

    const history = getPlayedHistory('spyfall');
    const normalizedPool = pool.map((item) => {
      if (typeof item === 'string') {
        return { name: item, roles: ['Người tham gia', 'Khách mời', 'Quản lý', 'Nhân viên'] };
      }
      return {
        name: item.name || 'Địa điểm',
        roles: Array.isArray(item.roles) && item.roles.length > 0 ? item.roles : ['Người tham gia', 'Khách mời', 'Quản lý', 'Nhân viên']
      };
    });

    let unplayed = normalizedPool.filter((item) => {
      const id = makeSpyItemId('spyfall', item);
      return !history.includes(id);
    });

    if (unplayed.length === 0) {
      const poolIds = normalizedPool.map((item) => makeSpyItemId('spyfall', item));
      const currentHistory = getPlayedHistory('spyfall');
      const filteredHistory = currentHistory.filter((id) => !poolIds.includes(id));
      const data = safeLocalStorageGet('hq_spy_history_v4') || { undercover: [], twist: [], spyfall: [] };
      data.spyfall = filteredHistory;
      safeLocalStorageSet('hq_spy_history_v4', data);

      unplayed = normalizedPool;
    }

    if (unplayed.length === 0) {
      unplayed = normalizedPool;
    }

    const picked = unplayed[Math.floor(rng() * unplayed.length)];
    if (record) {
      recordPlayedItem('spyfall', makeSpyItemId('spyfall', picked));
    }
    return picked;
  }

  // Gắn trực tiếp vào GameData
  Object.assign(window.GameData, {
    SPY_CARD_THEMES,
    UNDERCOVER_DECKS,
    getDeckPairs,
    TWIST_QUESTION_PAIRS,
    SPYFALL_LOCATIONS,
    SPYFALL_QUESTIONS,
    ROUND_SPARKS,
    makeSpyItemId,
    getPlayedHistory,
    recordPlayedItem,
    clearPlayedHistory,
    pickUndercoverPair,
    pickTwistQuestion,
    pickSpyfallLocation,
    getCustomSpyDecks,
    addCustomUndercoverPair,
    removeCustomUndercoverPair,
    addCustomTwistQuestion,
    removeCustomTwistQuestion,
    addCustomSpyfallLocation,
    removeCustomSpyfallLocation,
    importCustomSpyText,
    exportCustomSpyDecks,
    clearCustomSpyDecks,
    getCustomDeckStats,
    getAllTwistQuestions,
    getAllSpyfallLocations
  });
})();
