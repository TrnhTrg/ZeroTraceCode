/**
 * ZeroTraceCode - Vercel Serverless Function
 * Cloud Compiler & Code Execution Proxy
 * Supports C++, C, Python, Java, C#, Rust, Go, Node.js
 */

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(200).json({ status: 'ready', engine: 'ZeroTrace Cloud Compiler' });
  }

  try {
    const { code, compiler = 'gcc-head', stdin = '', options = '' } = req.body || {};

    if (!code) {
      return res.status(400).json({ error: 'Source code is required' });
    }

    const payload = {
      code,
      compiler,
      stdin,
      options: options || undefined
    };

    const response = await fetch('https://wandbox.org/api/compile.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(502).json({ error: `Compiler upstream error: ${errText}` });
    }

    const result = await response.json();
    return res.status(200).json(result);
  } catch (error) {
    console.error('[ZeroTraceCode Runner Error]', error);
    return res.status(500).json({ error: error.message || 'Execution error' });
  }
}
