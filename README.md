# 🌙 Ma Sói — Hội Quán Party Game (v3.3)

Ứng dụng web chơi nhóm **5–10 người** tại nhà — **tất cả mọi người đều là người chơi**, Bot làm Quản Trò, **miễn phí 100%** khi đăng lên **GitHub Pages**. Gồm 2 game: **Ma Sói** và **Gián Điệp**.

> **v3.2 — "Một phòng, không bao giờ mất ván"**: cả hội dùng chung **một phòng cố định**, không còn mã phòng. Rớt mạng, lỡ tắt trình duyệt hay máy Quản Trò lỡ F5 đều vào lại đúng ván đang chơi.

---

## ✨ Có gì mới ở v3.3

- **⚙️ Cài đặt ván** (phòng chờ của máy Quản Trò, dưới phần cấu hình vai trò — nhớ lại cho các ván sau, nút *Mặc định* để trả về ban đầu):
  - **⏰ Giới hạn thời gian bỏ phiếu ban ngày**: Không giới hạn *(mặc định)* / 1 / 1,5 / 2 / 3 / 5 phút. Hết giờ Bot chốt theo phiếu hiện có; còn 30 giây Bot nhắc; đồng hồ hiện trên laptop và điện thoại.
  - **🤝 Khi hòa phiếu**: bỏ phiếu lại 1 lần *(mặc định)* hoặc không ai bị treo cổ.
  - **⚖️ Chốt phiếu**: tự chốt khi mọi người đã vote *(mặc định)* hoặc Quản Trò tự bấm chốt.
  - **🌙 Nhịp đêm**: Nhanh / Vừa *(mặc định)* / Chậm.
- **Đêm khó đoán hơn**: vai đã chết (hoặc bot thử nghiệm) giờ "suy nghĩ" một khoảng ngẫu nhiên 5–15 giây (tùy vai) thay vì 2–7 giây cố định; người còn sống bấm quá nhanh cũng phải chờ tối thiểu một nhịp — không còn đoán được vai nào đã chết nhờ tốc độ Bot chuyển lượt.
- **Lật thẻ không còn tiếng động** (Ma Sói lẫn Gián Điệp) để không lộ ai đang xem vai.

## Có gì mới ở v3.2

### 🚪 Một phòng cố định — luôn vào lại được
- **Không còn mã phòng 4 số.** Laptop bấm *Mở phòng*, điện thoại mở app bấm **Vào phòng** là xong.
- **Điện thoại nhớ bạn là ai**: rớt mạng, khoá màn hình, lỡ tắt trình duyệt → mở lại app là tự vào đúng ván, đúng vai.
- **Máy Quản Trò không bao giờ tự reset ván**: lỡ F5 / tắt trình duyệt / rớt mạng → mở lại, chạm **"▶ Chạm để Bot tiếp tục dẫn ván"** là Bot dẫn tiếp từ đúng bước đang dở. Ván chỉ kết thúc khi bấm **🔄 Reset ván** hoặc **Thoát** (có hỏi xác nhận).
- Đổi điện thoại giữa ván: vào lại bằng **đúng tên cũ** là nhận lại vai.
- Quản Trò chuyển Ma Sói ↔ Gián Điệp thì điện thoại tự chuyển theo.

### 📲 Lưu app ra màn hình chính iPhone
- Mở link bằng **Safari** → nút **Chia sẻ** → **Thêm vào Màn hình chính**. App hiện với icon và tên **"Ma Sói"**, mở toàn màn hình như app thật.

### 🐺 Ma Sói dễ chơi hơn
- **Bầy Sói chọn mồi bằng cách "nạp màu" nút**: mỗi Sói chạm tên con mồi, nút tô màu dần; cả bầy chạm trùng một người thì nút đầy màu và tự chốt sau 3 giây. Không cần nút xác nhận.
- **Nút xác nhận nhấp nháy** và luôn ghim ở đáy màn hình — không còn cảnh quên bấm làm cả ván đứng hình.
- **Se duyên hiện thật to trong thẻ bài**, kèm thông báo "🔔 Thẻ bài có tin mới". Sói sẽ thấy cảnh báo 💘 nếu con mồi là người yêu của mình (luật gốc: một người chết, người kia chết theo).
- **Bot tự chốt phiếu treo cổ** khi cả làng vote xong (đếm ngược 8 giây, hòa thì vote lại 1 lần) — không ai phải ra bấm laptop.
- **Màn hình Quản Trò to, rõ**: bàn chơi hiện ai còn sống / mất kết nối / đã vote; cuối ván lật toàn bộ vai trò theo phe.
- **📜 Nhật ký ván đấu**: xem lại từng đêm, từng ngày. Hành động bí mật ban đêm chỉ hiện sau khi ván kết thúc. Có nút xem lại ván trước.
- Sửa lỗi Thợ Săn chết theo người yêu không được bắn; sửa lỗi vào lại bằng máy khác làm hỏng cặp đôi và phiếu vote.

### 🧪 Thử nhiều người chơi trên một máy
Mở thêm tab với `?p=1`, `?p=2`… (ví dụ `http://localhost:4173/?p=1`) — mỗi tab là một người chơi riêng.

---

## 🗂️ Các bản trước (v3.1)

### 🔧 Bản vá v3.1
- **Sửa lỗi chỉ có nhạc nền/hiệu ứng mà không có giọng đọc:** chuyển sang Cloud TTS (Flowery/Azure voices) phát được trực tiếp trong Chrome/Safari/Edge, có 2 giọng dự phòng và tự fallback. Cấu hình âm thanh cũ được làm mới để bật lại giọng đọc.
- **Thêm lựa chọn giọng Nữ/Nam:** nữ mặc định (Hoài My/Linh), nam (Nam Minh/Minh), áp dụng cho cả Cloud và giọng trình duyệt.
- **Sửa lỗi thẻ bài bị lật ngược/soi gương chữ:** bỏ hoàn toàn `rotateY(180deg)` + `backface-visibility`; dùng animation lật 2D an toàn, chữ luôn đọc đúng chiều trên mọi trình duyệt.
- Thêm cảnh báo rõ ràng nếu giọng đọc đang bị tắt.

### 🔊 Sửa lỗi âm thanh Ma Sói bị đọc thành tiếng Anh
- **Chốt chặn tuyệt đối:** Bot chỉ chấp nhận giọng có `lang` bắt đầu bằng `vi`. Không bao giờ chọn giọng tiếng Anh để đọc văn bản tiếng Việt.
- **Cloud TTS Tiếng Việt** (Flowery/Azure voices) phát trực tiếp trong Chrome, Safari, Edge; có giọng **Nữ (Hoài My/Linh)** và **Nam (Nam Minh/Minh)**.
- Tự tách câu dài thành đoạn ngắn, có 2 giọng dự phòng cho mỗi giới tính và fallback sang giọng trình duyệt.
- **Dự phòng thông minh:** Nếu máy chưa cài giọng Việt hoặc mất mạng, Bot hiển thị phụ đề thay vì đọc sai tiếng Anh.
- **Lưu cài đặt** giọng đọc, tốc độ, cao độ, hiệu ứng và nhạc nền vào `localStorage` cho lần chơi sau.
- **Nút “Đọc lại”** trên màn hình Quản Trò để cả hội nghe lại thông báo vừa rồi.

> **Nếu Bot vẫn đọc tiếng Anh trên máy của bạn:** mở `🔊 Giọng & Âm thanh` → chọn **Tự động — luôn là giọng Tiếng Việt** (hoặc **Cloud Tiếng Việt**) → chọn **Nữ/Nam** → bấm **Thử giọng Bot**. Trên Windows, hãy mở bằng **Microsoft Edge** hoặc cài thêm gói giọng nói Tiếng Việt trong `Settings → Time & Language → Speech → Add voices`. Bản v3.1 không bao giờ chọn giọng tiếng Anh để đọc tiếng Việt nữa.

### 🎬 Hoạt cảnh & chuyển động điện ảnh
- **Màn chuyển cảnh toàn màn hình:** Đêm buông, bình minh, chia vai và phán quyết — kèm vòng sáng, icon và tiêu đề lớn.
- **Bầu trời sao sống động** phía sau giao diện, tự giảm tải khi chuyển tab và tôn trọng `prefers-reduced-motion`.
- **Pháo giấy chiến thắng**, tia sáng khi mở thẻ, rung màn hình khi Thợ Săn nổ súng và chớp đỏ khi có người thiệt mạng.
- **Thẻ bài 3D nghiêng theo con trỏ**, ánh kim chạy qua thẻ, ảnh vai trò zoom chậm và badge phe phái màu riêng.
- **Nhạc nền không gian ban đêm** rất nhỏ trên Laptop Host (có thể tắt trong Cài đặt âm thanh).

### 🖥️ Giao diện & trải nghiệm
- **Chủ đề “Lunar Ritual”**: nền đêm sao, kính mờ, gradient tím–lam–hổ phách, typography Be Vietnam Pro hỗ trợ đầy đủ dấu tiếng Việt.
- **Trang chủ mới**: hero điện ảnh với tranh Ma Sói, thẻ game có dải tranh vai trò, chip tính năng và hướng dẫn “Chơi trong 3 bước”.
- **Kho vai trò (`🎭 Vai trò`)**: xem nhanh cả 11 vai trò kèm tranh, phe phái và mô tả ngay trong ứng dụng.
- **Phụ đề Bot trên điện thoại**: người chơi luôn đọc được thông báo mới nhất kể cả khi tắt âm thanh hoặc đang ở xa loa.
- **Bảng vote trực quan**: thanh phần trăm phiếu, avatar người vote, ai đang dẫn đầu và trạng thái “đã vote”.
- **Gián Điệp có phiếu thăm dò trên điện thoại**: người chơi chọn người nghi ngờ, Quản Trò thấy tổng hợp phiếu trực tiếp trước khi chốt.
- **Tối ưu mobile**: vùng chạm lớn, thẻ bài cao hơn, bố cục một cột, an toàn với tai thỏ và thanh địa chỉ động.

### 🎮 Nội dung & luật chơi
- **11 vai trò Ma Sói**: Ma Sói, Sói Đầu Đàn, Tiên Tri, Bảo Vệ, Phù Thủy, Thợ Săn, Thần Tình Yêu, Già Làng, Thằng Ngố, Sát Nhân Độc Hành, Dân Làng.
- **3 chế độ Gián Điệp**: Ai Là Gián Điệp (125+ cặp từ, 5 chủ đề, Mr. White), Điệp Viên Hỏi Xoáy (36 cặp câu hỏi lệch pha), Spyfall (30 địa điểm + 15 câu thẩm vấn).
- **Không đếm giờ tranh luận**, không ai phải làm quản trò. Bot lo chia vai, gọi lượt, đọc kết quả và phán quyết thắng thua.

---

## 🚀 Hướng dẫn đưa lên GitHub Pages (Miễn phí 100%)

### Cách 1: Kéo-thả trực tiếp trên trình duyệt (Nhanh nhất, không cần gõ lệnh)
1. Đăng nhập [GitHub.com](https://github.com) → bấm dấu **`+`** góc trên bên phải → chọn **New repository**.
2. Đặt tên repository (ví dụ: `party-game`), chọn **Public** → bấm **Create repository**.
3. Ở trang vừa tạo, bấm dòng **uploading an existing file**.
4. Mở thư mục dự án `Game-Web-App` trên máy tính, chọn toàn bộ: `index.html`, `manifest.webmanifest`, `sw.js`, `README.md`, thư mục `css`, thư mục `js`, thư mục `assets` rồi **kéo thả** vào trình duyệt (chú ý giữ nguyên cấu trúc thư mục `assets/roles/...`).
5. Đợi upload xong → bấm **Commit changes**.
6. Vào tab **Settings** (bánh răng) của repository → mục **Pages** ở cột trái:
   - Tại **Build and deployment → Source**: chọn **Deploy from a branch**.
   - Tại **Branch**: chọn **`main`** và **`/ (root)`** → bấm **Save**.
7. Đợi khoảng **1 phút** rồi F5 lại trang **Pages**, GitHub sẽ hiện đường dẫn chính thức dạng:
   `https://<ten-github-cua-ban>.github.io/party-game/`
8. Mở link đó trên Laptop bấm **Mở phòng**; bạn bè mở cùng link trên điện thoại (hoặc quét QR), lưu ra màn hình chính rồi bấm **Vào phòng**.

### Cách 2: Đẩy bằng Git CLI (đã khởi tạo sẵn nhánh `main`)
Sau khi tạo repo trống trên GitHub (không tích README):
```sh
git remote add origin https://github.com/<ten-github-cua-ban>/<ten-repo>.git
git push -u origin main
```
Sau đó bật **Settings → Pages → Branch: `main` / `(root)`** như bước 6 ở trên.

---

## 💻 Chạy thử ngay trên máy tính (không cần GitHub)
```sh
python -m http.server 4173
```
Mở trình duyệt vào `http://localhost:4173`.
