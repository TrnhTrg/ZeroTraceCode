// ZeroTraceCode - Firebase & Security Configuration
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
// CẤU HÌNH TÀI KHOẢN & PHÂN QUYỀN (CHUẨN HÓA ZEROTRACE)
// ========================================================
window.SECURITY_CONFIG = {
  // Danh sách Email Quản trị viên tối cao (Full VIP & Toàn quyền)
  adminEmails: [
    "trinhminhtruong2006@gmail.com",
    "trinhtruong.work@gmail.com"
  ],
  adminEmail: "trinhminhtruong2006@gmail.com",
  adminName: "Trường Trịnh (MRZXN)",

  // Mở tự do cho mọi tài khoản Gmail vào học, tự động cách ly dữ liệu
  allowPublicGoogleLogin: true,

  // Danh sách email (để trống vì cho phép mọi email vào học)
  allowedEmails: [],

  // TẮT HOÀN TOÀN KHÓA 10 PHÚT
  antiBruteforce: {
    enabled: false
  }
};
