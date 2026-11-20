// ZeroTraceCode - Firebase & Security Whitelist Configuration
// Đồng bộ hệ sinh thái ZeroTrace của MRZXN
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyCO9bFJ-ulZjwiR6l5Ezi_DBNppX36ACk0",
  authDomain: "zerotraceenglish.firebaseapp.com",
  projectId: "zerotraceenglish",
  storageBucket: "zerotraceenglish.firebasestorage.app",
  messagingSenderId: "852622448260",
  appId: "1:852622448260:web:217f9de719355c38bbd4d1",
  measurementId: "G-HJ66K69LQP"
};

// ========================================================
// CẤU HÌNH DANH SÁCH EMAIL ĐƯỢC PHÉP TRUY CẬP (WHITELIST)
// ========================================================
window.SECURITY_CONFIG = {
  // Quản trị viên tối cao (Full VIP & Toàn quyền)
  adminEmail: "trinhtruong.work@gmail.com",
  adminName: "Trường Trịnh (MRZXN)",

  // CHẾ ĐỘ BẢO MẬT VIP NGHIÊM NGẶT (WHITELIST):
  // false = BẮT BUỘC EMAIL PHẢI CÓ TRONG DANH SÁCH allowedEmails THÌ MỚI ĐƯỢC VÀO HỌC/LUYỆN CODE!
  // true  = Mở công khai cho mọi người
  allowPublicGoogleLogin: false,

  // DANH SÁCH EMAIL ĐƯỢC CẤP QUYỀN TRUY CẬP:
  allowedEmails: [
    "trinhtruong.work@gmail.com"
  ],

  // Lá chắn chống Bruteforce, spam request & tấn công Burp Suite
  antiBruteforce: {
    maxAttemptsPerMinute: 6,
    lockoutDurationMinutes: 10,
    rapidClickThresholdMs: 400
  }
};
