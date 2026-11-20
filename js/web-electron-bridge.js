/**
 * ZeroTraceCode - Web Electron Bridge Polyfill
 * Translates desktop Electron IPC into Web Browser Native APIs
 * Powers Monaco Editor, Wandbox Cloud Compiler, Virtual File System & Multi-device Storage
 * Executed under ZeroTrace
 */

(function () {
  'use strict';

  console.log('⚡ [ZeroTraceCode] Khởi tạo Web Electron Bridge...');

  // Event bus for Electron-style IPC events
  const eventBus = new EventTarget();
  function emit(channel, data) {
    eventBus.dispatchEvent(new CustomEvent(channel, { detail: data }));
  }
  function on(channel, callback) {
    const handler = (e) => callback(e.detail);
    eventBus.addEventListener(channel, handler);
    return () => eventBus.removeEventListener(channel, handler);
  }

  // ========================================================
  // 1. VIRTUAL FILE SYSTEM (VFS)
  // ========================================================
  const VFS = {
    getKey() {
      const email = (window.AuthManager && window.AuthManager.currentUser ? window.AuthManager.currentUser.email : (localStorage.getItem('zt_code_active_email') || 'guest')).toLowerCase().trim();
      return 'zt_code_vfs_' + email.replace(/[.#$[\]/]/g, '_');
    },

    load() {
      try {
        const raw = localStorage.getItem(this.getKey());
        if (raw) return JSON.parse(raw);
      } catch (e) {
        console.warn('VFS load error:', e);
      }
      const defaults = this.getDefaultFiles();
      this.save(defaults);
      return defaults;
    },

    save(vfs) {
      try {
        localStorage.setItem(this.getKey(), JSON.stringify(vfs));
        if (window.AuthManager && window.AuthManager.currentUser) {
          window.AuthManager.syncToCloud();
        }
      } catch (e) {
        console.warn('VFS save error:', e);
      }
    },

    getDefaultFiles() {
      return {
        '/workspace': { isDir: true, mtime: Date.now() },
        '/workspace/main.cpp': {
          isDir: false,
          mtime: Date.now(),
          content: `#include <iostream>

int main() {
    std::cout << "⚡ Chao mung den voi ZeroTraceCode Cloud IDE!\\n";
    std::cout << "He thong bien dich dam may C/C++ da san sang.\\n\\n";
    
    std::cout << "Nhap hai so nguyen a va b: ";
    long long a, b;
    if (std::cin >> a >> b) {
        std::cout << "\\n[*] Tong a + b = " << a + b << "\\n";
        std::cout << "[*] Tich a * b = " << a * b << "\\n";
    } else {
        std::cout << "\\n[!] Ban chua nhap du lieu o tab Input/Expected.\\n";
        std::cout << "[*] Ban hay mo panel Input, dien '10 25' roi bam Run nhe!\\n";
    }
    return 0;
}
`
        },
        '/workspace/solution.cpp': {
          isDir: false,
          mtime: Date.now(),
          content: `#include <bits/stdc++.h>
using namespace std;

// ZeroTraceCode Competitive Programming Template
int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    int t = 1;
    // if (cin >> t)
    while (t--) {
        long long a, b;
        if (cin >> a >> b) {
            cout << a + b << "\\n";
        }
    }
    return 0;
}
`
        },
        '/workspace/python_demo.py': {
          isDir: false,
          mtime: Date.now(),
          content: `# ZeroTraceCode Python Runner
print("⚡ ZeroTraceCode Python Engine Online")
for i in range(1, 6):
    print(f"[*] Buoc {i}: He thong chay on dinh")
`
        }
      };
    },

    read(path) {
      const vfs = this.load();
      const norm = this.norm(path);
      return vfs[norm] && !vfs[norm].isDir ? vfs[norm].content : null;
    },

    write(path, content) {
      const vfs = this.load();
      const norm = this.norm(path);
      const parts = norm.split('/').filter(Boolean);
      let curr = '';
      for (let i = 0; i < parts.length - 1; i++) {
        curr += '/' + parts[i];
        if (!vfs[curr]) vfs[curr] = { isDir: true, mtime: Date.now() };
      }
      vfs[norm] = { isDir: false, content: String(content ?? ''), mtime: Date.now() };
      this.save(vfs);
      return true;
    },

    delete(path) {
      const vfs = this.load();
      const norm = this.norm(path);
      delete vfs[norm];
      // Xóa các file con nếu là thư mục
      for (const k in vfs) {
        if (k.startsWith(norm + '/')) delete vfs[k];
      }
      this.save(vfs);
      return true;
    },

    createDir(path) {
      const vfs = this.load();
      const norm = this.norm(path);
      vfs[norm] = { isDir: true, mtime: Date.now() };
      this.save(vfs);
      return true;
    },

    listDir(dirPath) {
      const vfs = this.load();
      const norm = this.norm(dirPath);
      const prefix = norm === '/' ? '/' : norm + '/';
      const items = [];
      const seen = new Set();

      for (const p in vfs) {
        if (p.startsWith(prefix) && p !== norm) {
          const rest = p.slice(prefix.length);
          const topSeg = rest.split('/')[0];
          if (!seen.has(topSeg)) {
            seen.add(topSeg);
            const isDir = rest.includes('/') || vfs[p].isDir;
            items.push({
              name: topSeg,
              isDirectory: isDir,
              isFile: !isDir,
              size: isDir ? 0 : (vfs[p].content ? vfs[p].content.length : 0)
            });
          }
        }
      }
      return items;
    },

    norm(p) {
      if (!p) return '/workspace';
      let clean = String(p).replace(/\\/g, '/');
      if (!clean.startsWith('/')) clean = '/' + clean;
      return clean.replace(/\/+/g, '/').replace(/\/$/, '') || '/';
    }
  };

  // State caches
  let currentCompiled = {
    code: '',
    filePath: '',
    compiler: 'gcc-head'
  };

  let activeAbortController = null;
  let currentStdinBuffer = '';

  // Language mapping for Wandbox (Stable production versions)
  function detectCompiler(filePath, content) {
    const ext = (filePath || '').split('.').pop().toLowerCase();
    if (ext === 'c') return 'gcc-13.2.0-c';
    if (ext === 'py') return 'cpython-3.12.7';
    if (ext === 'java') return 'openjdk-head';
    if (ext === 'cs') return 'dotnetcore-head';
    if (ext === 'rs') return 'rust-head';
    if (ext === 'go') return 'go-head';
    if (ext === 'js' || ext === 'ts') return 'nodejs-head';
    return 'gcc-13.2.0'; // Mặc định C++ ổn định
  }

  function detectJudge0LanguageId(filePath, compiler) {
    const ext = (filePath || '').split('.').pop().toLowerCase();
    if (ext === 'c') return 103; // C (GCC 14.1.0)
    if (ext === 'py') return 100; // Python 3.12.5
    if (ext === 'java') return 91; // Java JDK 17
    if (ext === 'cs') return 51; // C# Mono
    if (ext === 'rs') return 108; // Rust 1.85.0
    if (ext === 'go') return 107; // Go 1.23.5
    if (ext === 'js' || ext === 'ts') return 102; // Node.js 22
    return 105; // C++ (GCC 14.1.0)
  }

  // ========================================================
  // 2. RUNNER & JUDGE ENGINE (JUDGE0 CE + WANDBOX + VERCEL API)
  // ========================================================
  async function executeOnCloud(code, compiler, stdin = '', filePath = '') {
    if (!code || !code.trim()) {
      return { program_output: '', status: '0' };
    }

    activeAbortController = new AbortController();

    // 1. Thử qua Judge0 CE (Siêu tốc, hỗ trợ đầy đủ bits/stdc++.h và mọi thư viện)
    try {
      const langId = detectJudge0LanguageId(filePath || currentCompiled.filePath, compiler);
      const judgeRes = await fetch('https://ce.judge0.com/submissions?base64_encoded=false&wait=true', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_code: code,
          language_id: langId,
          stdin: stdin || ''
        }),
        signal: AbortSignal.timeout ? AbortSignal.timeout(15000) : activeAbortController.signal
      });

      if (judgeRes.ok) {
        const jData = await judgeRes.json();
        const isOk = jData.status && (jData.status.id === 3 || jData.status.id === 0);
        return {
          status: isOk ? '0' : String(jData.status?.id || '1'),
          program_output: jData.stdout || '',
          program_error: jData.stderr || '',
          compiler_error: jData.compile_output || '',
          compiler_message: jData.message || (isOk ? '' : (jData.status?.description || '')),
          execution_time: Math.round(parseFloat(jData.time || '0') * 1000)
        };
      }
    } catch (err) {
      console.warn('[ZeroTraceCode] Judge0 CE bận, chuyển sang Wandbox:', err);
    }

    // 2. Dự phòng qua Wandbox API
    const compilersToTry = [compiler];
    if (compiler === 'gcc-13.2.0') compilersToTry.push('gcc-12.3.0', 'gcc-head');
    if (compiler === 'cpython-3.12.7') compilersToTry.push('cpython-3.11.10', 'cpython-head');

    let lastError = null;
    for (const comp of compilersToTry) {
      try {
        const payload = { code, compiler: comp, stdin };
        const timeoutSignal = AbortSignal.timeout ? AbortSignal.timeout(30000) : activeAbortController.signal;
        const res = await fetch('https://wandbox.org/api/compile.json', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: timeoutSignal
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.compiler_error && data.compiler_error.includes('Resource temporarily unavailable')) {
            console.warn(`[ZeroTraceCode] ${comp} bận tài nguyên, thử compiler dự phòng...`);
            continue;
          }
          return data;
        }
      } catch (e) {
        if (e.name === 'AbortError') continue;
        lastError = e;
      }
    }

    // 3. Dự phòng qua Vercel Serverless Function `/api/run` (khi deploy trên Vercel)
    try {
      const res2 = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, compiler, stdin }),
        signal: AbortSignal.timeout ? AbortSignal.timeout(15000) : activeAbortController.signal
      });
      if (res2.ok) {
        return await res2.json();
      }
    } catch (_) {}

    if (lastError) throw lastError;
    throw new Error('Không thể kết nối máy chủ biên dịch đám mây.');
  }

  // Judge Normalization Utility
  function normalizeJudgeOutput(text) {
    return String(text ?? '')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .split('\n')
      .map(l => l.trimEnd())
      .join('\n')
      .trim();
  }

  // ========================================================
  // 3. DEFINE WINDOW.ELECTRONAPI POLYFILL
  // ========================================================
  window.electronAPI = {
    // App & System Info
    getAppInfo: async () => ({
      name: 'ZeroTraceCode',
      version: '2.0.0-web',
      isWeb: true,
      platform: 'web',
      author: 'MRZXN / ZeroTrace Team'
    }),
    getCurrentVersion: async () => '2.0.0-web',
    checkForUpdates: async () => ({ hasUpdate: false }),
    getSystemVersions: () => ({ node: '20.0.0', chrome: '124.0.0', electron: '32.0.0' }),
    openExternalLink: async (url) => { window.open(url, '_blank'); },

    // Settings
    loadSettings: () => {
      try {
        const stored = localStorage.getItem('ide-settings');
        return stored ? JSON.parse(stored) : null;
      } catch (e) {
        return null;
      }
    },
    saveSettings: async (settings) => {
      try {
        localStorage.setItem('ide-settings', JSON.stringify(settings));
        if (window.AuthManager) window.AuthManager.syncToCloud();
        return { success: true };
      } catch (e) {
        return { success: false, error: e.message };
      }
    },

    // State Read/Write (Multi-user isolated)
    stateRead: async (name) => {
      const userKey = window.AuthManager ? window.AuthManager.getUserKey() : 'guest';
      const key = `zt_code_state_${name}_${userKey}`;
      try {
        const val = localStorage.getItem(key);
        return val ? JSON.parse(val) : null;
      } catch (e) {
        return null;
      }
    },
    stateWrite: async (name, data) => {
      const userKey = window.AuthManager ? window.AuthManager.getUserKey() : 'guest';
      const key = `zt_code_state_${name}_${userKey}`;
      try {
        localStorage.setItem(key, JSON.stringify(data));
        return { success: true };
      } catch (e) {
        return { success: false, error: e.message };
      }
    },
    stateWriteSync: (name, data) => {
      const userKey = window.AuthManager ? window.AuthManager.getUserKey() : 'guest';
      const key = `zt_code_state_${name}_${userKey}`;
      try {
        localStorage.setItem(key, JSON.stringify(data));
        return { success: true };
      } catch (e) {
        return { success: false, error: e.message };
      }
    },
    stateDelete: async (name) => {
      const userKey = window.AuthManager ? window.AuthManager.getUserKey() : 'guest';
      localStorage.removeItem(`zt_code_state_${name}_${userKey}`);
      return { success: true };
    },

    saveThemeAsset: async (dataUrl) => ({ success: true, url: dataUrl }),
    releaseBrowserRestore: () => null,

    // File Operations
    readDirectory: async (dirPath) => VFS.listDir(dirPath),
    readFile: async (filePath) => {
      const content = VFS.read(filePath);
      return content !== null ? { content } : { error: 'File not found' };
    },
    saveFile: async (payload, maybeContent) => {
      let filePath, content;
      if (typeof payload === 'string') {
        filePath = payload;
        content = maybeContent;
      } else {
        filePath = payload?.path;
        content = payload?.content;
      }
      if (!filePath) return { success: false, error: 'Path is required' };
      VFS.write(filePath, content || '');
      return { success: true };
    },
    saveFileDialog: async (payload) => {
      // Cho phép người dùng tải tệp mã nguồn về máy tính cá nhân
      const blob = new Blob([payload.content || ''], { type: 'text/plain;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = payload.defaultPath ? payload.defaultPath.split('/').pop() : 'main.cpp';
      a.click();
      URL.revokeObjectURL(a.href);
      return { success: true, filePath: a.download };
    },
    deleteFile: async (filePath) => {
      VFS.delete(filePath);
      return { success: true };
    },
    deleteFolder: async (folderPath) => {
      VFS.delete(folderPath);
      return { success: true };
    },
    createDirectory: async (dirPath) => {
      VFS.createDir(dirPath);
      return { success: true };
    },
    renameFile: async ({ oldPath, newPath }) => {
      const content = VFS.read(oldPath);
      if (content !== null) {
        VFS.write(newPath, content);
        VFS.delete(oldPath);
        return { success: true };
      }
      return { success: false, error: 'Old file not found' };
    },
    copyFile: async ({ src, dest }) => {
      const content = VFS.read(src);
      if (content !== null) {
        VFS.write(dest, content);
        return { success: true };
      }
      return { success: false, error: 'Source file not found' };
    },
    moveFile: async ({ src, dest }) => {
      const content = VFS.read(src);
      if (content !== null) {
        VFS.write(dest, content);
        VFS.delete(src);
        return { success: true };
      }
      return { success: false, error: 'Source file not found' };
    },
    missingFiles: async (paths) => {
      const vfs = VFS.load();
      return (paths || []).filter(p => !vfs[VFS.norm(p)]);
    },
    showOpenDialog: async (options) => {
      // Mở dialog tải tệp từ máy lên VFS
      return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.onchange = async (e) => {
          const file = e.target.files[0];
          if (!file) return resolve({ canceled: true, filePaths: [] });
          const text = await file.text();
          const targetPath = '/workspace/' + file.name;
          VFS.write(targetPath, text);
          resolve({ canceled: false, filePaths: [targetPath] });
        };
        input.click();
      });
    },
    openFile: async (options) => {
      return window.electronAPI.showOpenDialog(options);
    },
    getLaunchFiles: async () => ['/workspace/main.cpp'],
    showItemInFolder: async () => {},

    // Local History
    createHistoryBackup: async (data) => {
      try {
        const histKey = 'zt_code_hist_' + (data.filePath || 'untitled');
        const list = JSON.parse(localStorage.getItem(histKey) || '[]');
        list.unshift({ timestamp: Date.now(), content: data.content });
        if (list.length > 20) list.pop();
        localStorage.setItem(histKey, JSON.stringify(list));
      } catch (e) {}
    },
    getFileHistory: async (filePath) => {
      const histKey = 'zt_code_hist_' + (filePath || 'untitled');
      return JSON.parse(localStorage.getItem(histKey) || '[]');
    },
    getHistoryContent: async (backupPath) => backupPath,
    clearFileHistory: async (filePath) => {
      localStorage.removeItem('zt_code_hist_' + (filePath || 'untitled'));
    },

    // Compiler Status & Execution
    getCompilerStatus: async () => ({
      found: true,
      bundled: false,
      version: 'ZeroTrace Cloud Compiler (Wandbox / Online Engine)',
      path: 'cloud-runner'
    }),

    cleanPCHCache: async () => ({ success: true }),

    compile: async (data, maybeOptions) => {
      const startTime = Date.now();
      let filePath = typeof data === 'string' ? data : (data?.filePath || data?.fileName);
      let content = typeof data === 'string' ? maybeOptions?.content : (data?.content || (filePath && VFS.read(filePath)));
      if (!content && filePath) {
        content = VFS.read(filePath) || VFS.read(filePath.replace(/\.exe$/i, '.cpp')) || '';
      }
      if (!content && typeof App !== 'undefined' && App.editor) {
        content = App.editor.getValue();
      }
      const code = content || '';
      const compiler = detectCompiler(filePath, code);

      currentCompiled = {
        code,
        filePath: filePath || '/workspace/main.cpp',
        compiler
      };

      if (!code.trim()) {
        return { success: false, error: 'Mã nguồn rỗng, không thể biên dịch!', time: 10 };
      }

      // Giả lập biên dịch thành công cho đám mây
      return {
        success: true,
        cached: false,
        message: 'Mã nguồn đã sẵn sàng cho ZeroTrace Cloud Runner!',
        outputPath: currentCompiled.filePath,
        compiler: 'ZeroTrace Cloud GCC',
        time: Date.now() - startTime
      };
    },

    run: async (opts) => {
      let exePath = typeof opts === 'string' ? opts : opts?.exePath;
      let code = currentCompiled.code || '';
      if (!code && exePath) {
        code = VFS.read(exePath) || VFS.read(exePath.replace(/\.exe$/i, '.cpp')) || '';
      }
      if (!code && typeof App !== 'undefined' && App.editor) {
        code = App.editor.getValue();
      }
      const compiler = currentCompiled.compiler || detectCompiler(exePath, code);

      if (!code.trim()) {
        emit('process-error', { text: 'Không tìm thấy mã nguồn để chạy!' });
        return { success: false, error: 'No code to run' };
      }

      emit('process-started', {});
      const startTime = Date.now();

      // Đọc stdin từ I/O panel nếu có
      const inputEl = document.getElementById('input-area') || document.getElementById('io-input-text');
      const stdin = (inputEl ? inputEl.value : '') || currentStdinBuffer || '';

      try {
        const result = await executeOnCloud(code, compiler, stdin);
        const elapsed = Date.now() - startTime;

        if (result.compiler_error || (result.status !== '0' && result.compiler_message)) {
          emit('process-error', result.compiler_error || result.compiler_message);
        }

        if (result.program_output) {
          emit('process-output', result.program_output);
        }

        if (result.program_error) {
          emit('process-error', result.program_error);
        }

        const exitCode = parseInt(result.status || '0', 10);
        emit('process-exit', {
          code: exitCode,
          executionTime: elapsed,
          memoryKB: 1024
        });

        return { success: true, pid: 1001 };
      } catch (err) {
        emit('process-error', { text: `Lỗi thực thi: ${err.message}` });
        emit('process-exit', { code: 1, executionTime: Date.now() - startTime, memoryKB: 0 });
        return { success: false, error: err.message };
      }
    },

    stopProcess: async () => {
      if (activeAbortController) {
        activeAbortController.abort();
        activeAbortController = null;
      }
      emit('process-stopped', {});
      emit('process-exit', { code: -1, executionTime: 0, memoryKB: 0 });
      return { success: true };
    },

    sendInput: async (input) => {
      currentStdinBuffer += input;
      return { success: true };
    },
    endInput: async () => {
      return { success: true };
    },
    sendInputFile: async () => ({ success: true }),
    inputFileInfo: async () => ({ exists: false, size: 0 }),

    // Batch Competitive Testing / Course Judge
    runTest: async (options, maybeInput, maybeExpected, maybeTimeLimit) => {
      let exePath = (typeof options === 'object' && options !== null) ? options.exePath : options;
      let input = (typeof options === 'object' && options !== null) ? options.input : maybeInput;
      let expectedOutput = (typeof options === 'object' && options !== null) ? options.expectedOutput : maybeExpected;
      let timeLimit = (typeof options === 'object' && options !== null) ? options.timeLimit : maybeTimeLimit;

      let code = currentCompiled.code || '';
      if (!code && exePath) {
        code = VFS.read(exePath) || VFS.read(exePath.replace(/\.exe$/i, '.cpp')) || '';
      }
      if (!code && typeof App !== 'undefined' && App.editor) {
        code = App.editor.getValue();
      }
      if (!code.trim()) {
        return {
          success: false,
          status: 'CE',
          output: 'Mã nguồn rỗng, vui lòng nhập code trước khi nộp bài!',
          expected: expectedOutput,
          executionTime: 0
        };
      }
      const compiler = currentCompiled.compiler || detectCompiler(exePath, code);
      const startTime = Date.now();

      try {
        const result = await executeOnCloud(code, compiler, input || '');
        const elapsed = Date.now() - startTime;
        const actualOutput = result.program_output || '';

        const normActual = normalizeJudgeOutput(actualOutput);
        const normExpected = normalizeJudgeOutput(expectedOutput);
        const matched = normActual === normExpected;

        let status = 'AC';
        if (result.status !== '0' && result.compiler_error) status = 'CE';
        else if (!matched) status = 'WA';

        return {
          success: true,
          status: status,
          passed: matched,
          output: actualOutput,
          expected: expectedOutput,
          executionTime: elapsed,
          memoryKB: 1024
        };
      } catch (err) {
        return {
          success: false,
          status: 'RE',
          output: err.message,
          expected: expectedOutput,
          executionTime: Date.now() - startTime
        };
      }
    },

    judgeNormalizeOutput: (text) => normalizeJudgeOutput(text),

    // Event Registration Hooks
    onProcessStarted: (cb) => on('process-started', cb),
    onProcessExternalStarted: (cb) => on('process-started', cb),
    onProcessExternalExit: (cb) => on('process-exit', cb),
    onProcessOutput: (cb) => on('process-output', cb),
    onProcessError: (cb) => on('process-error', cb),
    onProcessExit: (cb) => on('process-exit', cb),
    onProcessStopped: (cb) => on('process-stopped', cb),
    onFileOpened: (cb) => on('file-opened', cb),
    onFileChangedExternal: (cb) => on('file-changed', cb),
    onSystemMessage: (cb) => on('system-message', cb),
    onProblemReceived: (cb) => on('problem-received', cb),
    onUpdateStatus: (cb) => on('update-status', cb),
    onLanguageDiagnostics: (cb) => on('language-diagnostics', cb),

    // Live Language Check
    liveLanguageCheck: async () => ({ diagnostics: [] }),
    syntaxCheck: async () => ({ errors: [] }),
    getClangdCompletions: async () => [],
    getClangdHover: async () => null,
    clangdCloseDocument: async () => {},

    // Contest & .sameko
    readSameko: async () => ({ exists: false, data: null }),
    writeSameko: async () => ({ success: true }),
    createContest: async () => ({ success: true }),

    // Account & Official Submissions
    accountInfo: async () => ({ github: null }),
    accountLink: async () => ({ success: true }),
    accountUnlink: async () => ({ success: true }),
    accountStatus: async () => ({}),
    onOfficialSubmission: (cb) => () => {},
    officialSubmit: async () => ({}),
    officialRefresh: async () => ({}),
    officialOpenResult: async () => ({}),

    // Runtime Center
    onRuntimeCenterEvent: (cb) => () => {},
    runtimeCenterStatus: async () => ({}),
    runtimeCenterInstall: async () => ({ success: true }),
    runtimeCenterSmoke: async () => ({ success: true }),

    // Language Tools & Diagnostics
    languageTools: async () => [],
    languageWorkspace: async () => ({}),
    languageRequest: async () => null,
    languageClose: async () => {},
    languageRestart: async () => {},

    // Debugger & MI Events
    onDebugRunning: (cb) => on('debug-running', cb),
    onDebugStopped: (cb) => on('debug-stopped', cb),
    onDebugOutput: (cb) => on('debug-output', cb),
    onDebugConsole: (cb) => on('debug-console', cb),
    onDebugProgramExited: (cb) => on('debug-program-exited', cb),
    onDebugTerminated: (cb) => on('debug-terminated', cb),
    onDebugError: (cb) => on('debug-error', cb),
    onDebugNotify: (cb) => on('debug-notify', cb),
    debugStart: async () => ({ success: true }),
    debugStop: async () => ({ success: true }),
    debugContinue: async () => ({ success: true }),
    debugStepOver: async () => ({ success: true }),
    debugStepInto: async () => ({ success: true }),
    debugStepOut: async () => ({ success: true }),
    debugSetBreakpoint: async () => ({ success: true }),
    debugRemoveBreakpoint: async () => ({ success: true }),
    debugEnableBreakpoint: async () => ({ success: true }),
    debugDisableBreakpoint: async () => ({ success: true }),
    debugSetBreakpointCondition: async () => ({ success: true }),
    debugRunToLine: async () => ({ success: true }),
    debugVarSetFormat: async () => ({ success: true }),
    debugEvaluate: async () => ({ value: '' }),
    debugVarChildren: async () => [],
    debugVarUpdate: async () => [],
    debugVarCreateMany: async () => [],
    debugVarDeleteMany: async () => [],

    // Window controls
    minimizeWindow: () => {},
    maximizeWindow: () => {},
    closeWindow: () => {},

    // Productivity & Updates
    productivitySnapshot: async () => {},
    productivitySnapshotSync: () => {},
    productivityRecovery: async () => null,
    formatCode: async (code) => ({ success: true, formatted: code }),
    watchFile: async () => ({ success: true }),
    unwatchFile: async () => ({ success: true }),
    reloadFile: async (filePath) => window.electronAPI.readFile(filePath)
  };

  // Lắng nghe sự kiện chuyển đổi Gmail để tự động nạp lại không gian VFS
  if (window.AuthManager) {
    window.AuthManager.onUserChange(() => {
      if (typeof FileExplorer !== 'undefined' && FileExplorer.currentFolder) {
        FileExplorer.openFolder(FileExplorer.currentFolder).catch(() => {});
      }
    });
  }

  console.log('⚡ [ZeroTraceCode] Web Electron Bridge đã sẵn sàng 100%!');
})();
