# ⚡ ZeroTraceCode - Hệ Sinh Thái Học Lập Trình & Luyện Code Chuyên Sâu

> **Nền tảng Cloud IDE & Luyện giải thuật độc lập, vĩnh viễn của MRZXN (ZeroTrace Team).**  
> Chuyển đổi và tối ưu hóa từ lõi Semeko C++ IDE thành Web App sẵn sàng triển khai 1-click lên **Vercel**, hỗ trợ học tập và code trên mọi thiết bị (PC, Laptop, iPad, Mobile).  
> Tích hợp: **Trình biên dịch đám mây siêu tốc (C++, C, Python, Java, C#)**, **Giáo trình C++ chuẩn hóa song ngữ Anh - Việt**, **Thư viện sách lập trình & cấu trúc dữ liệu**, **Trình duyệt bài tập (Codeforces, LeetCode, HackerRank)**, **Hệ thống chấm bài tự động (Judge AC/WA)**, **Xác thực Google OAuth 2.0**, **Lá chắn bảo mật Whitelist / Anti-Bruteforce** và **Đồng bộ tiến độ đa thiết bị qua Firebase Firestore**.

---

## 🔒 1. Cơ Chế Bảo Mật & Quản Lý Đa Tài Khoản (ZeroTrace Security Engine)

Kế thừa trực tiếp kiến trúc bảo mật cấp doanh nghiệp từ **ZeroTraceEnglish**:

### 🛡️ 1.1. Triệt Tiêu Nguy Cơ Tấn Công Bruteforce / Burp Suite
* **Xác thực Google OAuth 2.0:** Hệ thống **hoàn toàn không lưu mật khẩu** trong cơ sở dữ liệu. Mọi thao tác xác thực do máy chủ bảo mật Google (`accounts.google.com`) trực tiếp xử lý với xác thực 2 bước (2FA), CAPTCHA và kiểm soát hành vi người dùng.
* **Lá chắn Whitelist nghiêm ngặt (`js/firebase-config.js`):**
  * `adminEmail`: `trinhtruong.work@gmail.com` (Toàn quyền VIP tối cao).
  * `allowPublicGoogleLogin: false`: Bắt buộc Email phải có tên trong danh sách `allowedEmails` thì mới được truy cập hệ thống. Người lạ dù đăng nhập Google thành công cũng sẽ bị cổng bảo vệ chặn ngay lập tức!
* **Security Shield tầng Client:**
  * Giám sát tần suất thao tác: Giới hạn tối đa 6 lần thao tác nhạy cảm/phút.
  * Chống bot click chuột siêu tốc (ngưỡng 400ms).
  * Tự động khóa bảo mật 10 phút nếu phát hiện hành vi quét hoặc dội request liên tục.
* **Header Bảo Mật Máy Chủ (`vercel.json`):** Tích hợp sẵn `X-Frame-Options: SAMEORIGIN` (chống nhúng trộm iframe / Clickjacking), `X-Content-Type-Options: nosniff`, và HSTS mã hóa đường truyền.

### ☁️ 1.2. Đồng Bộ Đa Thiết Bị Thời Gian Thực (Multi-Device Cloud Sync)
* **Tiến độ và mã nguồn độc lập 100%:** Khi bạn (`trinhtruong.work@gmail.com`) đăng nhập, hệ thống sẽ tải toàn bộ mã nguồn trong Virtual File System (VFS), tiến độ làm bài tập và lịch sử chấm code của riêng bạn.
* **Lưu trữ đám mây Firebase Firestore:** Viết code trên máy tính bàn ở nhà, mở điện thoại hoặc laptop ngoài quán cà phê đăng nhập -> Toàn bộ file `.cpp`, `.py` và bài đang giải dở tự động tải về nguyên vẹn!
* **Chế độ Ngoại tuyến (Offline Local Storage):** Khi không có mạng hoặc chưa đăng nhập, hệ thống tự động lưu vào bộ nhớ cục bộ theo phiên khách riêng biệt.

---

## 🚀 2. Điểm Nổi Bật Về Tính Năng Của ZeroTraceCode

1. **Trình soạn thảo Monaco Editor (Lõi VS Code):**
   * Hỗ trợ đầy đủ Syntax Highlighting, phím tắt chuẩn VS Code và chế độ Vim Mode.
   * Tự động hoàn thành code, gợi ý template và snippets lập trình thi đấu.
   * Chế độ chia đôi màn hình (Split Editor), nhiều tab đồng thời.
2. **Trình biên dịch đám mây ZeroTrace Cloud Engine:**
   * Hỗ trợ C++, C, Python, Java, C#, Rust, Go, Node.js qua backend đám mây hiệu năng cao (Wandbox API + Vercel Serverless Function `/api/run`).
   * Hỗ trợ đầy đủ `stdin` và `stdout/stderr` theo thời gian thực trong cửa sổ Terminal.
3. **Giáo trình C++ Toàn Diện (Cpp Course Content):**
   * Hệ thống bài học chuẩn hóa từ cơ bản đến nâng cao: Nhập xuất dữ liệu, cấu trúc rẽ nhánh, vòng lặp, hàm, mảng, con trỏ & quản lý bộ nhớ, OOP, STL và thuật toán.
   * Kèm bài tập tự luyện có test cases và lời giải chi tiết song ngữ (Việt - Anh).
4. **Trình Duyệt Bài Tập & Luyện Đề (Problem Browser):**
   * Tích hợp tìm kiếm bài tập trực tiếp từ Codeforces, LeetCode và HackerRank.
   * Chế độ Batch Testing tự động chạy hàng loạt test cases, kiểm tra kết quả theo chuẩn `AC` (Accepted), `WA` (Wrong Answer), `TLE` (Time Limit Exceeded).
5. **Thư Viện Sách & Công Cụ Nghiên Cứu (Tech Library & Book Study):**
   * Tích hợp kho tài liệu lập trình, cẩm nang thuật toán và công cụ hỗ trợ chuyển dịch đề bài.

---

## 💻 3. Cách Mở Chạy Nhanh Trên Máy Tính (Offline)

### Cách 1: Mở Trực Tiếp Trình Duyệt (Không cần cài thêm gì)
* Mở thư mục `D:\ZeroTrace_Team\ZeroTraceCode`.
* Nhấp đúp chuột vào tệp `index.html`. Trình duyệt (Chrome, Edge, Brave, Cốc Cốc) sẽ tự động mở giao diện IDE.

### Cách 2: Chạy Bằng Local Server
Nếu muốn trải nghiệm đầy đủ các tính năng Service Worker (PWA):
```bash
cd D:\ZeroTrace_Team\ZeroTraceCode
python -m http.server 3000
```
Truy cập: `http://localhost:3000`

---

## 🌐 4. Hướng Dẫn Đưa Lên GitHub & Deploy Vercel (Online 24/7)

### Bước 1: Khởi Tạo Git & Đẩy Lên GitHub
Mở terminal tại thư mục dự án:
```bash
cd D:\ZeroTrace_Team\ZeroTraceCode
git init
git add .
git commit -m "feat: Initial release ZeroTraceCode Cloud IDE v2.0"
git branch -M main
git remote add origin https://github.com/<tai-khoan-github-cua-ban>/ZeroTraceCode.git
git push -u origin main
```

### Bước 2: Deploy Lên Vercel (Miễn Phí 100%)
1. Truy cập [https://vercel.com](https://vercel.com) và đăng nhập bằng GitHub.
2. Bấm **Add New...** ➔ **Project**.
3. Chọn repository `ZeroTraceCode` vừa tạo và nhấn **Import**.
4. Cấu hình triển khai:
   * **Framework Preset:** Chọn `Other`.
   * **Root Directory:** Để nguyên `./`.
5. Nhấn **Deploy**. Sau khoảng 30 giây, Vercel sẽ cung cấp đường link trực tuyến (ví dụ: `https://zerotrace-code.vercel.app`).

### Bước 3: Cấu Hình Firebase Domain Cho Google Login
Để tính năng đăng nhập Google hoạt động trên tên miền Vercel:
1. Truy cập [Firebase Console](https://console.firebase.google.com).
2. Vào dự án `zerotraceenglish` ➔ **Authentication** ➔ Chọn tab **Settings** ➔ **Authorized domains**.
3. Bấm **Add domain** ➔ Điền tên miền Vercel của bạn (ví dụ: `zerotrace-code.vercel.app`) ➔ Bấm **Save**.

---

## 📁 5. Cấu Trúc Thư Mục Hệ Thống

```
D:\ZeroTrace_Team\ZeroTraceCode\
├── index.html                  # Điểm khởi chạy gốc (tự động điều hướng và tương thích Vercel)
├── vercel.json                 # Cấu hình Vercel, Security Headers & Điều hướng Rewrite
├── package.json                # Định nghĩa gói và dependency frontend
├── manifest.json               # Cấu hình PWA cài đặt ứng dụng trên Mobile/PC
├── sw.js                       # Service Worker phục vụ Offline Cache
├── README.md                   # Tài liệu hướng dẫn sử dụng & triển khai
├── api/
│   └── run.js                  # Vercel Serverless Function Proxy biên dịch mã nguồn đám mây
├── js/
│   ├── firebase-config.js      # Cấu hình Firebase & danh sách Whitelist bảo mật VIP
│   ├── auth.js                 # Bộ xử lý xác thực, phân quyền & SecurityShield
│   └── web-electron-bridge.js  # Cầu nối Web Electron Bridge (VFS, Cloud Runner, Judge)
├── node_modules/               # Thư viện client: KaTeX, xterm, marked, dompurify, gsap
└── src/                        # Toàn bộ mã nguồn giao diện, tính năng học tập & Monaco Editor
    ├── index.html              # Trang ứng dụng IDE chính
    ├── assets/                 # Phông chữ, biểu tượng, video hình nền
    ├── features/               # Khóa học C++, Problem Browser, Thư viện luyện thi
    ├── renderer/               # Monaco bundle, giao diện và logic hệ thống
    ├── styles/                 # Hệ thống CSS Dark/Cyberpunk đa chủ đề
    └── vendor/                 # Bundle Monaco Editor tối ưu hóa
```

---

*Hệ thống được phát triển và vận hành bởi MRZXN - ZeroTrace Team.*  
**Executed under ZeroTrace.**
