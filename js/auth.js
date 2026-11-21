/**
 * ZeroTraceCode - Authentication, Multi-User Workspace Isolation & Cloud Sync
 * Kiến trúc đồng bộ hệ sinh thái ZeroTrace của MRZXN
 * - Cổng ZeroTrace Portal: Nhập Gmail để vào học & lưu mã nguồn riêng biệt theo từng tài khoản
 * - Admin tối cao: trinhminhtruong2006@gmail.com & trinhtruong.work@gmail.com (Trường Trịnh - MRZXN)
 * - Tách biệt 100% không gian code (VFS), bài tập và cấu hình theo từng Gmail
 * - Đã tắt bỏ hoàn toàn khóa bảo mật 10 phút và nút Google OAuth theo yêu cầu
 */

(function () {
  'use strict';

  // Tự động giải phóng mọi khóa bảo mật cũ nếu còn tồn tại trong bộ nhớ trình duyệt
  try {
    localStorage.removeItem('zt_code_lockout');
    localStorage.removeItem('zt_security_lockout');
    const oldModal = document.getElementById('zt-security-modal');
    if (oldModal) oldModal.remove();
  } catch (_) {}

  const AUTH_VERSION = 'v3_zerotrace_code';
  const ADMIN_EMAILS = [
    'trinhminhtruong2006@gmail.com',
    'trinhtruong.work@gmail.com'
  ];
  const ADMIN_NAME = 'Trường Trịnh (MRZXN)';

  // ========================================================
  // 1. SECURITY SHIELD (TOAST NOTIFIER - KHÔNG KHÓA MÀN HÌNH)
  // ========================================================
  const SecurityShield = {
    init() {
      try {
        localStorage.removeItem('zt_code_lockout');
        localStorage.removeItem('zt_security_lockout');
        const m = document.getElementById('zt-security-modal');
        if (m) m.remove();
      } catch (_) {}
    },

    recordFailedAttempt() {
      // Đã tắt khóa 10 phút theo yêu cầu
      return true;
    },

    resetFailedAttempts() {
      try {
        localStorage.removeItem('zt_code_lockout');
        localStorage.removeItem('zt_security_lockout');
      } catch (_) {}
    },

    checkCanAct() {
      return true;
    },

    showLockoutUI() {
      // Đã tắt hoàn toàn khóa màn hình
    },

    showWarningToast(msg) {
      let toast = document.getElementById('zt-code-toast');
      if (!toast) {
        toast = document.createElement('div');
        toast.id = 'zt-code-toast';
        toast.style.cssText = 'position:fixed;bottom:24px;right:24px;background:#0f172a;color:#f8fafc;padding:12px 20px;border-radius:10px;border:1px solid #00ffcc;box-shadow:0 10px 25px rgba(0,0,0,0.6);font-size:0.9rem;font-weight:600;z-index:999999;transition:all 0.3s ease;transform:translateY(100px);opacity:0;';
        document.body.appendChild(toast);
      }
      toast.textContent = msg;
      toast.style.transform = 'translateY(0)';
      toast.style.opacity = '1';
      setTimeout(() => {
        toast.style.transform = 'translateY(100px)';
        toast.style.opacity = '0';
      }, 3500);
    }
  };

  // ========================================================
  // 2. AUTH MANAGER: GMAIL ISOLATION & CLOUD SYNC ENGINE
  // ========================================================
  const AuthManager = {
    currentUser: null,
    listeners: [],
    isFirebaseReady: false,

    getUserKey(optionalEmail) {
      const e = (optionalEmail || (this.currentUser ? this.currentUser.email : '') || '').toLowerCase().trim();
      return e ? e.replace(/[.#$[\]/]/g, '_') : 'guest';
    },

    isAdminEmail(email) {
      if (!email) return false;
      const clean = email.toLowerCase().trim();
      return ADMIN_EMAILS.some(adm => adm.toLowerCase() === clean);
    },

    onUserChange(fn) {
      if (typeof fn === 'function') {
        this.listeners.push(fn);
      }
    },

    notifyListeners() {
      this.listeners.forEach(fn => {
        try { fn(this.currentUser); } catch (e) { console.error(e); }
      });
    },

    getRegisteredUsers() {
      try {
        const raw = localStorage.getItem('zt_code_registered_users');
        return raw ? JSON.parse(raw) : {};
      } catch (e) {
        return {};
      }
    },

    saveRegisteredUsers(users) {
      localStorage.setItem('zt_code_registered_users', JSON.stringify(users));
    },

    init() {
      SecurityShield.init();

      if (localStorage.getItem('zt_code_auth_version') !== AUTH_VERSION) {
        localStorage.setItem('zt_code_auth_version', AUTH_VERSION);
      }

      // Khôi phục tài khoản đã đăng nhập trước đó
      const savedEmail = (localStorage.getItem('zt_code_active_email') || '').trim().toLowerCase();
      const savedName = localStorage.getItem('zt_code_active_name') || '';

      if (this.isAdminEmail(savedEmail)) {
        this.currentUser = {
          uid: 'admin_mrzxn',
          email: savedEmail,
          displayName: ADMIN_NAME,
          role: 'admin',
          isVIP: true
        };
      } else if (savedEmail) {
        const registered = this.getRegisteredUsers();
        const info = registered[savedEmail] || {};
        this.currentUser = {
          uid: this.getUserKey(savedEmail),
          email: savedEmail,
          displayName: info.name || savedName || savedEmail.split('@')[0],
          role: 'student',
          isVIP: true
        };
      } else {
        this.currentUser = null;
      }

      this.updateHeaderUI();
      this.initFirebase();

      // Nếu chưa có tài khoản nào đăng nhập -> Mở cổng đăng nhập ZeroTrace Portal
      if (!this.currentUser) {
        setTimeout(() => this.showGatekeeperScreen(), 300);
      }
    },

    initFirebase() {
      if (typeof firebase === 'undefined') return;
      if (!window.FIREBASE_CONFIG || !window.FIREBASE_CONFIG.apiKey) return;

      try {
        if (!firebase.apps.length) {
          firebase.initializeApp(window.FIREBASE_CONFIG);
        }
        this.firebaseAuth = firebase.auth();
        this.firestore = firebase.firestore();
        this.isFirebaseReady = true;

        if (this.currentUser && this.currentUser.email) {
          this.syncFromCloud(this.currentUser.email);
        }
      } catch (e) {
        console.warn('[ZeroTraceCode] Firebase init skipped:', e);
      }
    },

    // ----------------------------------------------------
    // ĐĂNG NHẬP TRỰC TIẾP BẰNG GMAIL (NHANH CHÓNG, MỞ TỰ DO)
    // ----------------------------------------------------
    loginWithEmailDirect(email) {
      if (!email) return false;
      email = email.toLowerCase().trim();

      if (!email.includes('@') || !email.includes('.')) {
        SecurityShield.showWarningToast('⚠️ Vui lòng nhập địa chỉ Gmail hợp lệ!');
        return false;
      }

      SecurityShield.resetFailedAttempts();

      const isAdmin = this.isAdminEmail(email);
      const name = isAdmin ? ADMIN_NAME : email.split('@')[0];

      this.currentUser = {
        uid: isAdmin ? 'admin_mrzxn' : this.getUserKey(email),
        email: email,
        displayName: name,
        role: isAdmin ? 'admin' : 'student',
        isVIP: true,
        photoURL: null
      };

      // Lưu tài khoản đang active
      localStorage.setItem('zt_code_active_email', email);
      localStorage.setItem('zt_code_active_name', this.currentUser.displayName);
      localStorage.setItem('zt_code_active_role', this.currentUser.role);

      // Lưu vào danh sách tài khoản đã dùng trên máy
      const registeredUsers = this.getRegisteredUsers();
      registeredUsers[email] = {
        name: this.currentUser.displayName,
        email: email,
        role: this.currentUser.role,
        isVIP: true,
        lastLogin: Date.now()
      };
      this.saveRegisteredUsers(registeredUsers);

      // Đóng modal cổng đăng nhập
      this.closeGatekeeperScreen();

      // Cập nhật giao diện thanh tiêu đề
      this.updateHeaderUI();
      this.notifyListeners();

      // Đồng bộ từ Firestore nếu có kết nối
      if (this.firestore) {
        this.syncFromCloud(email);
      }

      SecurityShield.showWarningToast(isAdmin
        ? `👑 Chào mừng Quản trị viên tối cao ${this.currentUser.displayName}!`
        : `🎉 Xin chào ${this.currentUser.displayName}! Không gian code của bạn đã sẵn sàng.`
      );

      return true;
    },

    signOut() {
      if (this.firebaseAuth) {
        try { this.firebaseAuth.signOut(); } catch (e) {}
      }
      localStorage.removeItem('zt_code_active_email');
      localStorage.removeItem('zt_code_active_name');
      localStorage.removeItem('zt_code_active_role');
      this.currentUser = null;

      this.updateHeaderUI();
      this.notifyListeners();

      SecurityShield.showWarningToast('Đã đăng xuất khỏi tài khoản.');
      this.showGatekeeperScreen();
    },

    // ----------------------------------------------------
    // ĐỒNG BỘ FIRESTORE THEO TỪNG GMAIL (MULTI-USER)
    // ----------------------------------------------------
    async syncFromCloud(email) {
      if (!this.firestore || !email) return;
      this.updateSyncBadge('syncing');
      try {
        const docId = this.getUserKey(email);
        const docRef = this.firestore.collection('zerotrace_code_users').doc(docId);
        const doc = await docRef.get();

        if (doc.exists) {
          const data = doc.data();
          if (data.vfs) {
            localStorage.setItem('zt_code_vfs_' + docId, JSON.stringify(data.vfs));
          }
          if (data.practiceLibrary) {
            localStorage.setItem('zt_code_state_practice-library_' + docId, JSON.stringify(data.practiceLibrary));
          }
          if (data.settings) {
            localStorage.setItem('zt_code_settings_' + docId, JSON.stringify(data.settings));
          }
          this.updateSyncBadge('synced');
          this.notifyListeners();
        } else {
          await this.syncToCloud();
        }
      } catch (err) {
        console.warn('[ZeroTraceCode Cloud] Lưu trữ cục bộ active:', err);
        this.updateSyncBadge('local');
      }
    },

    async syncToCloud() {
      if (!this.firestore || !this.currentUser || !this.currentUser.email) return;
      this.updateSyncBadge('syncing');
      try {
        const docId = this.getUserKey(this.currentUser.email);
        const docRef = this.firestore.collection('zerotrace_code_users').doc(docId);

        const vfs = JSON.parse(localStorage.getItem('zt_code_vfs_' + docId) || '{}');
        const practiceLibrary = JSON.parse(localStorage.getItem('zt_code_state_practice-library_' + docId) || '[]');
        const settings = JSON.parse(localStorage.getItem('zt_code_settings_' + docId) || '{}');

        await docRef.set({
          email: this.currentUser.email,
          displayName: this.currentUser.displayName,
          role: this.currentUser.role,
          updatedAt: Date.now(),
          vfs: vfs,
          practiceLibrary: practiceLibrary,
          settings: settings
        }, { merge: true });

        this.updateSyncBadge('synced');
      } catch (err) {
        this.updateSyncBadge('local');
      }
    },

    updateSyncBadge(status) {
      const badge = document.getElementById('zt-cloud-sync-badge');
      if (!badge) return;
      if (status === 'syncing') {
        badge.innerHTML = '🔄 <span style="font-size:11px;">Đang đồng bộ...</span>';
        badge.style.color = '#38bdf8';
      } else if (status === 'synced') {
        badge.innerHTML = '🟢 <span style="font-size:11px;">Đã đồng bộ Cloud</span>';
        badge.style.color = '#4ade80';
      } else {
        badge.innerHTML = '☁️ <span style="font-size:11px;">Lưu cục bộ</span>';
        badge.style.color = '#94a3b8';
      }
    },

    updateHeaderUI() {
      const btn = document.getElementById('btn-header-login');
      if (!btn) return;

      if (this.currentUser) {
        const isAdmin = this.currentUser.role === 'admin';
        const icon = isAdmin ? '👑' : '⚡';
        btn.innerHTML = `<span style="color:#00ffcc;font-weight:700;">${icon} ${this.currentUser.displayName}</span>`;
        btn.title = `Gmail: ${this.currentUser.email} (Bấm để xem hồ sơ / đổi tài khoản)`;
        btn.onclick = () => this.showProfileOrAdminModal();
      } else {
        btn.innerHTML = `🔑 <span style="font-weight:700;">Đăng Nhập</span>`;
        btn.title = 'Bấm để nhập Gmail vào học';
        btn.onclick = () => this.showGatekeeperScreen();
      }
    },

    // ========================================================
    // CỔNG XÁC THỰC: ZEROTRACE PORTAL (TRỰC TIẾP BẰNG GMAIL)
    // ========================================================
    showGatekeeperScreen() {
      let screen = document.getElementById('zt-gatekeeper-modal');
      if (!screen) {
        screen = document.createElement('div');
        screen.id = 'zt-gatekeeper-modal';
        screen.style.cssText = 'position:fixed;inset:0;background:rgba(5,8,16,0.9);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;z-index:99999;font-family:inherit;';
        document.body.appendChild(screen);
      }

      screen.innerHTML = `
        <div style="background:#0f172a;border:1px solid #00ffcc;border-radius:18px;max-width:420px;width:90%;padding:2.25rem 2rem;position:relative;box-shadow:0 0 40px rgba(0,255,204,0.25);color:#f8fafc;">
          <!-- Nút đóng ✕ -->
          <button id="btn-close-gatekeeper" type="button" style="position:absolute;top:16px;right:16px;background:#1e293b;border:none;font-size:1.1rem;width:32px;height:32px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-weight:bold;">✕</button>

          <!-- Logo & Header -->
          <div style="text-align:center;margin-bottom:1.5rem;">
            <div style="width:56px;height:56px;border-radius:16px;margin:0 auto 0.75rem;font-size:1.8rem;background:linear-gradient(135deg,#00ffcc,#38bdf8);display:flex;align-items:center;justify-content:center;color:#0a0d14;box-shadow:0 8px 25px rgba(0,255,204,0.35);font-weight:900;">⚡</div>
            <h2 style="font-size:1.4rem;font-weight:800;color:#00ffcc;margin:0 0 0.35rem;letter-spacing:0.5px;">ZeroTrace Portal</h2>
            <p style="font-size:0.875rem;color:#94a3b8;margin:0;">Nhập Gmail để vào học &amp; lưu mã nguồn, bài tập riêng biệt</p>
          </div>

          <!-- Form đăng nhập trực tiếp bằng Gmail -->
          <form id="form-direct-login" onsubmit="event.preventDefault();" style="display:flex;flex-direction:column;gap:1rem;">
            <div>
              <label for="input-direct-login-email" style="display:block;font-size:0.825rem;font-weight:700;color:#cbd5e1;margin-bottom:0.4rem;">
                Địa chỉ Gmail của bạn:
              </label>
              <input type="email" id="input-direct-login-email" placeholder="Ví dụ: trinhminhtruong2006@gmail.com" autofocus
                style="width:100%;padding:0.85rem 1rem;border-radius:10px;border:1.5px solid #334155;background:#1e293b;color:#fff;font-size:0.95rem;font-weight:600;outline:none;transition:border-color 0.2s;box-sizing:border-box;">
            </div>

            <button type="submit" id="btn-direct-login-submit" style="width:100%;padding:0.85rem 1rem;font-size:1rem;font-weight:800;border-radius:10px;cursor:pointer;background:linear-gradient(135deg,#00ffcc,#0ea5e9);color:#0a0d14;border:none;box-shadow:0 4px 18px rgba(0,255,204,0.35);transition:all 0.2s ease;">
              🚀 Vào Học Ngay
            </button>
          </form>

          <div style="margin-top:1.25rem;text-align:center;font-size:0.775rem;color:#94a3b8;line-height:1.5;">
            ✨ Tự động tách biệt và lưu trữ mã nguồn theo từng tài khoản Gmail.<br>
            💾 Dữ liệu lưu an toàn trên máy &amp; đồng bộ đám mây đa thiết bị.
          </div>
        </div>
      `;

      screen.style.display = 'flex';

      const btnClose = document.getElementById('btn-close-gatekeeper');
      if (btnClose) {
        btnClose.onclick = () => this.closeGatekeeperScreen();
      }

      const handleLogin = () => {
        const inp = document.getElementById('input-direct-login-email');
        if (!inp) return;
        const val = inp.value.trim().toLowerCase();
        if (!val || !val.includes('@') || !val.includes('.')) {
          SecurityShield.showWarningToast('Vui lòng nhập địa chỉ Gmail hợp lệ!');
          return;
        }
        this.loginWithEmailDirect(val);
      };

      const btnSubmit = document.getElementById('btn-direct-login-submit');
      const form = document.getElementById('form-direct-login');
      if (btnSubmit) btnSubmit.onclick = handleLogin;
      if (form) form.onsubmit = (e) => { e.preventDefault(); handleLogin(); };

      setTimeout(() => {
        const inp = document.getElementById('input-direct-login-email');
        if (inp) inp.focus();
      }, 50);
    },

    closeGatekeeperScreen() {
      const screen = document.getElementById('zt-gatekeeper-modal');
      if (screen) screen.style.display = 'none';
    },

    // ========================================================
    // MODAL HỒ SƠ & QUẢN TRỊ TÀI KHOẢN (PROFILE / ADMIN MODAL)
    // ========================================================
    showProfileOrAdminModal() {
      let modal = document.getElementById('zt-account-modal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'zt-account-modal';
        modal.style.cssText = 'position:fixed;inset:0;background:rgba(5,8,16,0.88);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;z-index:99999;font-family:inherit;';
        document.body.appendChild(modal);
      }

      const isAdmin = this.currentUser && this.currentUser.role === 'admin';
      const users = this.getRegisteredUsers();
      const userList = Object.values(users);
      const myEmail = this.currentUser ? this.currentUser.email : '';
      const userKey = this.getUserKey();

      // Thống kê tài nguyên của Gmail hiện tại
      const vfs = JSON.parse(localStorage.getItem('zt_code_vfs_' + userKey) || '{}');
      const fileCount = Object.keys(vfs).filter(k => !vfs[k].isDir).length;
      const practiceLib = JSON.parse(localStorage.getItem('zt_code_state_practice-library_' + userKey) || '[]');
      const solvedCount = practiceLib.filter(p => p.status === 'solved').length;

      let bodyContent = '';

      if (isAdmin) {
        bodyContent = `
          <div style="background:rgba(245,158,11,0.15);border:1px solid #f59e0b;border-radius:10px;padding:0.85rem;margin-bottom:1rem;display:flex;align-items:center;gap:0.75rem;">
            <span style="font-size:1.8rem;">👑</span>
            <div>
              <div style="font-weight:800;color:#f59e0b;font-size:0.95rem;">QUẢN TRỊ VIÊN TỐI CAO: ${ADMIN_NAME}</div>
              <div style="font-size:0.8rem;color:#cbd5e1;">Gmail: <strong style="color:#00ffcc;">${myEmail}</strong> | Toàn quyền kiểm soát hệ thống</div>
            </div>
          </div>

          <div style="margin-bottom:1rem;">
            <div style="font-weight:700;color:#e2e8f0;font-size:0.85rem;margin-bottom:0.5rem;display:flex;justify-content:space-between;align-items:center;">
              <span>📋 Danh Sách Tài Khoản Gmail Đã Đăng Nhập (${userList.length} tài khoản):</span>
              <span style="font-size:0.75rem;color:#4ade80;font-weight:700;">✅ Mở Khóa Full VIP</span>
            </div>

            <div style="max-height:220px;overflow-y:auto;border:1px solid #334155;border-radius:8px;background:#1e293b;">
              ${userList.length === 0 ? `
                <div style="padding:1.25rem;text-align:center;color:#94a3b8;font-size:0.8rem;">Chưa có tài khoản nào khác.</div>
              ` : `
                <table style="width:100%;border-collapse:collapse;font-size:0.8rem;">
                  <thead>
                    <tr style="background:#0f172a;border-bottom:1px solid #334155;color:#94a3b8;text-align:left;">
                      <th style="padding:8px 10px;">Gmail</th>
                      <th style="padding:8px 10px;">Tài Nguyên Code</th>
                      <th style="padding:8px 10px;text-align:center;">Hành Động</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${userList.map(u => {
                      const uKey = u.email.toLowerCase().replace(/[.#$[\]/]/g, '_');
                      const uVfs = JSON.parse(localStorage.getItem('zt_code_vfs_' + uKey) || '{}');
                      const uFiles = Object.keys(uVfs).filter(k => !uVfs[k].isDir).length;
                      return `
                        <tr style="border-bottom:1px solid #334155;">
                          <td style="padding:8px 10px;">
                            <div style="font-weight:700;color:#f8fafc;">${u.name}</div>
                            <div style="font-size:0.725rem;color:#94a3b8;">${u.email}</div>
                          </td>
                          <td style="padding:8px 10px;">
                            <span style="background:rgba(0,255,204,0.1);color:#00ffcc;font-weight:800;padding:2px 8px;border-radius:999px;font-size:0.7rem;border:1px solid rgba(0,255,204,0.3);">
                              ${uFiles} tệp tin VFS
                            </span>
                          </td>
                          <td style="padding:8px 10px;text-align:center;">
                            <button onclick="window.AuthManager.deleteUser('${u.email}')" style="background:rgba(239,68,68,0.2);border:1px solid #ef4444;color:#fca5a5;padding:3px 8px;border-radius:4px;font-size:0.7rem;font-weight:700;cursor:pointer;">Xóa</button>
                          </td>
                        </tr>
                      `;
                    }).join('')}
                  </tbody>
                </table>
              `}
            </div>
          </div>
        `;
      } else {
        bodyContent = `
          <div style="background:#1e293b;border:1px solid #334155;border-radius:12px;padding:1.25rem;margin-bottom:1.25rem;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.4rem;">
              <span style="font-weight:800;color:#00ffcc;font-size:1.15rem;">⚡ ${this.currentUser ? this.currentUser.displayName : ''}</span>
              <span style="background:rgba(74,222,128,0.15);color:#4ade80;border:1px solid #4ade80;font-weight:800;padding:3px 10px;border-radius:999px;font-size:0.75rem;">MỞ KHÓA FULL</span>
            </div>
            <div style="font-size:0.85rem;color:#94a3b8;">📧 Gmail: <strong style="color:#f8fafc;">${myEmail}</strong></div>

            <div style="margin-top:1rem;padding-top:0.85rem;border-top:1px dashed #334155;display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;text-align:center;">
              <div style="background:#0f172a;padding:0.75rem;border-radius:8px;border:1px solid #334155;">
                <div style="font-size:1.3rem;font-weight:800;color:#00ffcc;">${fileCount}</div>
                <div style="font-size:0.725rem;color:#94a3b8;margin-top:2px;">Tệp mã nguồn VFS</div>
              </div>
              <div style="background:#0f172a;padding:0.75rem;border-radius:8px;border:1px solid #334155;">
                <div style="font-size:1.3rem;font-weight:800;color:#38bdf8;">${solvedCount}</div>
                <div style="font-size:0.725rem;color:#94a3b8;margin-top:2px;">Bài tập đã Accepted</div>
              </div>
            </div>
          </div>
        `;
      }

      modal.innerHTML = `
        <div style="background:#0f172a;border:1px solid #00ffcc;border-radius:18px;max-width:500px;width:92%;padding:2rem;position:relative;box-shadow:0 0 40px rgba(0,255,204,0.25);color:#f8fafc;">
          <button onclick="document.getElementById('zt-account-modal').style.display='none'" style="position:absolute;top:16px;right:16px;background:#1e293b;border:none;font-size:1.1rem;width:32px;height:32px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-weight:bold;">✕</button>

          <div style="display:flex;align-items:center;gap:12px;margin-bottom:1.25rem;">
            <div style="font-size:2rem;">⚡</div>
            <div>
              <h3 style="margin:0;font-size:1.3rem;color:#00ffcc;">Hồ Sơ Tài Khoản ZeroTraceCode</h3>
              <p style="margin:2px 0 0;font-size:0.8rem;color:#94a3b8;">Không gian lưu trữ độc lập theo Gmail</p>
            </div>
          </div>

          ${bodyContent}

          <div style="display:flex;gap:10px;margin-top:1.25rem;">
            <button onclick="window.AuthManager.syncToCloud(); SecurityShield.showWarningToast('Đang gửi dữ liệu lên Firestore Cloud...');" style="flex:1;background:rgba(0,255,204,0.15);border:1px solid #00ffcc;color:#00ffcc;font-weight:700;padding:10px;border-radius:10px;cursor:pointer;">
              🔄 Đồng Bộ Cloud
            </button>
            <button onclick="document.getElementById('zt-account-modal').style.display='none'; window.AuthManager.showGatekeeperScreen();" style="flex:1;background:#1e293b;border:1px solid #334155;color:#38bdf8;font-weight:700;padding:10px;border-radius:10px;cursor:pointer;">
              🔄 Đổi Gmail Khác
            </button>
            <button onclick="document.getElementById('zt-account-modal').style.display='none'; window.AuthManager.signOut();" style="flex:0.8;background:rgba(239,68,68,0.15);border:1px solid #ef4444;color:#fca5a5;font-weight:700;padding:10px;border-radius:10px;cursor:pointer;">
              🚪 Đăng Xuất
            </button>
          </div>
        </div>
      `;

      modal.style.display = 'flex';
    },

    deleteUser(email) {
      if (!confirm(`Bạn có chắc chắn muốn xóa tài khoản: ${email}?`)) return;
      const users = this.getRegisteredUsers();
      delete users[email];
      this.saveRegisteredUsers(users);

      const userKey = email.toLowerCase().replace(/[.#$[\]/]/g, '_');
      localStorage.removeItem('zt_code_vfs_' + userKey);
      localStorage.removeItem('zt_code_state_practice-library_' + userKey);
      localStorage.removeItem('zt_code_settings_' + userKey);

      SecurityShield.showWarningToast(`Đã xóa tài khoản: ${email}`);
      this.showProfileOrAdminModal();
    },

    getCurrentUser() {
      return this.currentUser;
    }
  };

  window.SecurityShield = SecurityShield;
  window.AuthManager = AuthManager;
  window.auth = AuthManager; // Alias

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => AuthManager.init());
  } else {
    AuthManager.init();
  }
})();
