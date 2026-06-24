# 🫙 Hũ — Quản lý chi tiêu

Ứng dụng quản lý chi tiêu cá nhân với giao diện hiện đại (glassmorphism, nhiều hiệu ứng), song ngữ **Việt – Anh**, đồng bộ thời gian thực qua **Firebase** và **cài được lên điện thoại** (PWA).

> Tên "Hũ" lấy từ *hũ tiết kiệm* — gợi cảm giác ghi chép thu chi gọn gàng, minh bạch.

---

## ✨ Tính năng

**Cốt lõi**
- 🔐 Đăng nhập **Google** hoặc **Email/mật khẩu** (có **quên mật khẩu**)
- ☁️ Đồng bộ **đa thiết bị** qua Firestore, có **cache cục bộ** → dùng được **offline**
- 💳 **Nhiều ví** (Tiền mặt, ATM, Thẻ tín dụng…) + **chuyển tiền** giữa các ví
- ✏️ Thêm / **sửa** / xoá giao dịch; **đính kèm ảnh hóa đơn**
- 📂 **Danh mục tự tạo**: thêm/sửa/xoá, đổi icon tuỳ ý
- 🔁 **Giao dịch định kỳ**: tự ghi nhận khoản lặp hằng tháng (tiền nhà, lương…)

**Lập kế hoạch**
- 🎯 **Ngân sách** theo **tháng hoặc tuần**, tổng + theo từng danh mục, cảnh báo khi tới 80% / vượt hạn mức
- 🐷 **Hũ tích lũy** (mục tiêu tiết kiệm) với thanh tiến độ; nạp/rút từ ví
- 🤝 **Nợ & cho vay** (phải trả / phải thu), trả/thu một phần hoặc tất toán
- 🔔 **Nhắc hóa đơn** đến hạn + **thông báo đẩy trên thiết bị** (PWA)

**Phân tích & dữ liệu**
- 📊 **Biểu đồ**: phân tích chi theo danh mục + cột **Thu/Chi 6 tháng** + chỉ số nhanh (chi TB/ngày, dự báo cuối tháng, tỉ lệ tiết kiệm…)
- 📅 **Xem theo lịch** — lưới tháng, bấm ngày để xem giao dịch
- 🔍 **Tìm kiếm & lọc** nâng cao (mô tả, loại, danh mục, ví, khoảng ngày, mốc nhanh)
- 💾 **Sao lưu/Khôi phục** toàn bộ dữ liệu (JSON) · **Xuất/Nhập CSV**

**Trải nghiệm**
- 🌐 Chuyển ngôn ngữ **Việt – Anh** tức thì
- 🎨 **7 bộ theme màu**; **sidebar thu gọn được**; giao diện **responsive**
- 📱 **PWA** — cài lên màn hình chính như app thật

---

## 📁 Cấu trúc dự án

```
index.html            khung HTML (gắn nhãn data-i18n)
firebase-config.js    cấu hình Firebase của bạn
manifest.json         PWA manifest
sw.js                 Service Worker (PWA + thông báo)
favicon.svg           logo cái hũ
css/
  base.css            biến màu, theme, layout shell/sidebar/tabs, form, nút
  components.css      bộ lọc, date picker, danh sách giao dịch
  features.css        ví, ngân sách, hũ/nợ, hóa đơn, lịch, ảnh, modal, auth…
js/                   ES modules (phụ thuộc một chiều, không vòng lặp)
  firebase.js         khai báo Firebase SDK
  store.js            state + hằng số dùng chung
  i18n.js             từ điển dịch Việt–Anh + hàm t()
  util.js             tiện ích + tính toán (số dư, lọc, ngày)
  widgets.js          date picker, custom select, theme, hộp thoại
  app.js              logic giao diện + sự kiện (điểm vào)
```

---

## 🚀 Chạy thử (local)

App dùng **ES Module** nên **không mở trực tiếp file** — cần chạy qua web server cục bộ:

```bash
npx http-server . -p 8080
# rồi mở http://localhost:8080
```

---

## ⚙️ Cấu hình Firebase

Sao chép cấu hình dự án Firebase của bạn vào `firebase-config.js`. Xem hướng dẫn chi tiết từng bước trong [HUONG-DAN.md](HUONG-DAN.md) (tạo project, bật Authentication + Firestore, dán cấu hình).

> Luật bảo mật Firestore nằm trong [firestore.rules](firestore.rules) — mỗi người dùng chỉ đọc/ghi được dữ liệu của chính mình.

Sau khi deploy (vd Vercel), nhớ thêm tên miền vào **Firebase → Authentication → Settings → Authorized domains** để đăng nhập hoạt động.

---

## 🛠️ Công nghệ

HTML/CSS/JS thuần (ES Modules) · Firebase **Authentication** + **Cloud Firestore** · **Chart.js** · **PWA** (Service Worker + Web Notifications)

> Ảnh hóa đơn được nén client-side và lưu thẳng vào Firestore — không cần Firebase Storage.
