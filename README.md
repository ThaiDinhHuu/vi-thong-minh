# 💎 Ví Thông Minh

Ứng dụng quản lý chi tiêu cá nhân với giao diện hiện đại (glassmorphism, nhiều hiệu ứng), đồng bộ dữ liệu thời gian thực qua **Firebase**.

## ✨ Tính năng

- 🔐 **Đăng nhập** bằng Google hoặc Email/mật khẩu
- ☁️ **Đồng bộ đa thiết bị** qua Firestore (có cache cục bộ, dùng được offline)
- 💳 **Nhiều ví** (Tiền mặt, ATM, Thẻ tín dụng…) + **chuyển tiền** giữa các ví
- 📊 Thống kê thu/chi, **biểu đồ phân tích** theo danh mục
- 🗓️ Lịch sử **nhóm theo tháng**, kèm số dư ròng mỗi tháng
- 🎯 **Ngân sách**: đặt hạn mức/tháng + theo danh mục, cảnh báo khi sắp vượt
- 🔁 **Giao dịch định kỳ**: tự ghi nhận khoản lặp hàng tháng (tiền nhà, lương…)
- 🔍 **Tìm kiếm & lọc** nâng cao (mô tả, danh mục, ví, khoảng ngày)
- ⬇ **Xuất CSV/Excel** theo bộ lọc

## 🚀 Chạy thử

App dùng ES Module nên **không mở trực tiếp file** — cần chạy qua web server cục bộ:

```bash
npx http-server . -p 8080
# rồi mở http://localhost:8080
```

## ⚙️ Cấu hình Firebase

Sao chép cấu hình dự án Firebase của bạn vào `firebase-config.js`. Xem hướng dẫn chi tiết từng bước trong [HUONG-DAN.md](HUONG-DAN.md).

> Luật bảo mật Firestore nằm trong [firestore.rules](firestore.rules) — mỗi người dùng chỉ đọc/ghi được dữ liệu của chính mình.

## 🛠️ Công nghệ

HTML/CSS/JS thuần · Firebase Authentication · Cloud Firestore · Chart.js
