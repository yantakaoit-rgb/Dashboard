// เซิร์ฟเวอร์สำหรับรันทดสอบในเครื่อง (Node 18+, ไม่ต้องติดตั้งแพ็กเกจเพิ่ม)
// เสิร์ฟ index.html และใช้ตัวกลางเดียวกับที่ deploy จริง (src/proxy.js)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { handleProxy } from './src/proxy.js';

const dir = path.dirname(fileURLToPath(import.meta.url));

// โหลด .env
try {
  for (const line of fs.readFileSync(path.join(dir, '.env'), 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !line.trim().startsWith('#') && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch { console.error('ไม่พบไฟล์ .env'); process.exit(1); }

const { SUPABASE_URL, SUPABASE_KEY, PORT = 3000 } = process.env;
if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('ต้องตั้ง SUPABASE_URL และ SUPABASE_KEY ใน .env'); process.exit(1); }

// อ่าน security headers จาก public/_headers (บล็อก /*) ให้ตรงกับของจริงบน Netlify/Cloudflare
const SEC = { 'Cache-Control': 'no-store' };
try {
  let inGlobal = false;
  for (const line of fs.readFileSync(path.join(dir, 'public', '_headers'), 'utf8').split(/\r?\n/)) {
    if (/^\S/.test(line) && !line.startsWith('#')) inGlobal = line.trim() === '/*';
    else if (inGlobal) { const m = line.match(/^\s+([\w-]+):\s*(.+)$/); if (m) SEC[m[1]] = m[2]; }
  }
} catch {}

const send = (res, code, body, type = 'text/plain; charset=utf-8') => { res.writeHead(code, { ...SEC, 'Content-Type': type }); res.end(body); };

// จำกัดอัตราเรียกต่อ IP (เฉพาะรันในเครื่อง — บน Cloudflare/Netlify ให้ใช้ Rate limiting ของแพลตฟอร์ม)
const hits = new Map();
const limited = ip => { const n = Date.now(), a = (hits.get(ip) || []).filter(t => n - t < 60000); a.push(n); hits.set(ip, a); return a.length > 300; };

http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, 'http://localhost');
    if (req.method !== 'GET') return send(res, 405, 'Method Not Allowed');

    if (u.pathname === '/' || u.pathname === '/index.html')
      return send(res, 200, fs.readFileSync(path.join(dir, 'public', 'index.html')), 'text/html; charset=utf-8');

    if (u.pathname === '/api/sb' || u.pathname.startsWith('/api/sb/')) {
      if (limited(req.socket.remoteAddress)) return send(res, 429, 'Too Many Requests');
      const headers = new Headers();
      for (const h of ['range', 'range-unit']) if (typeof req.headers[h] === 'string') headers.set(h, req.headers[h]);
      const r = await handleProxy(new Request(u, { method: 'GET', headers }), process.env);
      res.writeHead(r.status, { ...SEC, ...Object.fromEntries(r.headers) });
      return res.end(Buffer.from(await r.arrayBuffer()));
    }
    send(res, 404, 'Not Found');
  } catch { send(res, 502, 'Upstream error'); }
}).listen(PORT, () => console.log('Dashboard: http://localhost:' + PORT));
