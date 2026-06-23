# 💎 Ví Thông Minh — Hướng dẫn cài đặt Firebase

App lưu dữ liệu trên **Firebase (Google Cloud)** nên bạn cần tạo một dự án Firebase miễn phí và dán cấu hình vào. Mất khoảng **3–5 phút**.

---

## ⚠️ Lưu ý quan trọng trước khi chạy

App dùng **ES Module** (`import ...`), nên **KHÔNG mở trực tiếp file `index.html`** bằng cách nhấp đúp (đường dẫn `file://`) — trình duyệt sẽ chặn vì lý do bảo mật.

👉 Phải chạy qua một **web server cục bộ**. Cách dễ nhất (chọn 1):

| Cách | Lệnh / Thao tác |
|---|---|
| **VS Code** | Cài extension **Live Server** → chuột phải `index.html` → *Open with Live Server* |
| **Node.js** | Mở terminal tại thư mục này, chạy: `npx serve` rồi mở link hiện ra |
| **Python** | `python -m http.server 8080` rồi mở `http://localhost:8080` |

> `localhost` đã được Firebase cho phép sẵn, nên đăng nhập Google sẽ hoạt động ngay.

---

## Bước 1 — Tạo dự án Firebase

1. Vào **https://console.firebase.google.com** → đăng nhập Google.
2. Bấm **Add project** → đặt tên (vd: *vi-thong-minh*) → Continue.
3. Có thể **tắt Google Analytics** cho gọn → **Create project**.

## Bước 2 — Bật Đăng nhập (Authentication)

1. Menu trái → **Build → Authentication** → **Get started**.
2. Tab **Sign-in method** → bật 2 cái:
   - **Email/Password** → Enable → Save
   - **Google** → Enable → chọn email hỗ trợ → Save

## Bước 3 — Bật Cơ sở dữ liệu (Firestore)

1. Menu trái → **Build → Firestore Database** → **Create database**.
2. Chọn vị trí gần bạn (vd *asia-southeast1*) → chọn **Production mode** → Enable.
3. Vào tab **Rules**, dán đoạn dưới rồi **Publish** (xem file `firestore.rules`):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/transactions/{txId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```
> Quy tắc này đảm bảo **mỗi người chỉ đọc/ghi dữ liệu của chính mình**.

## Bước 4 — Lấy cấu hình & dán vào app

1. Bấm ⚙️ (góc trên trái) → **Project settings**.
2. Kéo xuống mục **Your apps** → bấm biểu tượng **Web** `</>`.
3. Đặt nickname bất kỳ → **Register app**.
4. Sẽ hiện đoạn `const firebaseConfig = { ... }`. Copy các giá trị.
5. Mở file **`firebase-config.js`** trong thư mục này, thay các chỗ `PASTE_...` bằng giá trị tương ứng. Ví dụ:

```js
export const firebaseConfig = {
  apiKey: "AIzaSyD....",
  authDomain: "vi-thong-minh.firebaseapp.com",
  projectId: "vi-thong-minh",
  storageBucket: "vi-thong-minh.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123",
};
```

## Bước 5 — Chạy app

Mở app qua web server (xem phần ⚠️ ở trên) → màn hình đăng nhập hiện ra → đăng nhập bằng Google hoặc email.

🎉 Xong! Mọi giao dịch giờ được lưu trên cloud và **tự đồng bộ** giữa mọi thiết bị đăng nhập cùng tài khoản.

---

## ❓ Gặp lỗi thường gặp

| Lỗi | Cách xử lý |
|---|---|
| Hiện màn hình "Cần cấu hình Firebase" | Bạn chưa dán config, hoặc còn chữ `PASTE_` trong `firebase-config.js` |
| `auth/operation-not-allowed` | Chưa bật phương thức đăng nhập tương ứng ở Bước 2 |
| `auth/unauthorized-domain` | Đang chạy bằng `file://`. Hãy chạy qua `localhost` (xem phần ⚠️) |
| Trang trắng, lỗi CORS trong Console | Bạn đang mở bằng nhấp đúp file. Hãy dùng web server |
| `Missing or insufficient permissions` | Chưa dán Rules ở Bước 3, hoặc chưa Publish |

---

## 🔒 API key có cần giấu không?

`apiKey` của Firebase **không phải mật khẩu** — nó công khai được, an toàn để đặt trong code web. Việc bảo vệ dữ liệu nằm ở **Firestore Rules** (Bước 3), không phải ở key. Đây là thiết kế chính thức của Firebase.
