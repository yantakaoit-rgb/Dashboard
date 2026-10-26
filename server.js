// เซิร์ฟเวอร์เล็ก ๆ ไม่ต้องติดตั้งแพ็กเกจเพิ่ม (Node 18+)
// หน้าที่: เสิร์ฟ index.html และเป็นตัวกลางไป Supabase โดยใส่คีย์จาก .env ให้เอง
const http = require('http'), fs = require('fs'), path = require('path');

// โหลด .env
try {
  for (const line of fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !line.trim().startsWith('#') && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch { console.error('ไม่พบไฟล์ .env'); process.exit(1); }

const { SUPABASE_URL, SUPABASE_KEY, PORT = 3000 } = process.env;
if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('ต้องตั้ง SUPABASE_URL และ SUPABASE_KEY ใน .env'); process.exit(1); }
const BASE = SUPABASE_URL.replace(/\/$/, '');

const SEC = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Cache-Control': 'no-store',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self'; frame-ancestors 'none'"
};
const send = (res, code, body, type = 'text/plain; charset=utf-8') => { res.writeHead(code, { ...SEC, 'Content-Type': type }); res.end(body); };

// จำกัดอัตราเรียกต่อ IP (ป้องกันการยิงถี่)
const hits = new Map();
const limited = ip => { const n = Date.now(), a = (hits.get(ip) || []).filter(t => n - t < 60000); a.push(n); hits.set(ip, a); return a.length > 300; };

http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, 'http://x');
    if (req.method !== 'GET') return send(res, 405, 'Method Not Allowed');

    if (u.pathname === '/' || u.pathname === '/index.html')
      return send(res, 200, fs.readFileSync(path.join(__dirname, 'public', 'index.html')), 'text/html; charset=utf-8');

    const m = u.pathname.match(/^\/api\/sb\/rest\/v1\/(hospital_[a-z_]+_stats)$/); // อนุญาตเฉพาะตารางสถิติ
    if (m) {
      if (limited(req.socket.remoteAddress)) return send(res, 429, 'Too Many Requests');
      const h = { apikey: SUPABASE_KEY.trim() };
      if (!SUPABASE_KEY.trim().startsWith('sb_')) h.Authorization = 'Bearer ' + SUPABASE_KEY.trim();
      if (req.headers['range']) h['Range'] = req.headers['range'];
      if (req.headers['range-unit']) h['Range-Unit'] = req.headers['range-unit'];
      const r = await fetch(`${BASE}/rest/v1/${m[1]}${u.search}`, { headers: h });
      return send(res, r.status, Buffer.from(await r.arrayBuffer()), r.headers.get('content-type') || 'application/json');
    }
    send(res, 404, 'Not Found');
  } catch (e) { send(res, 502, 'Upstream error'); }
}).listen(PORT, () => console.log('Dashboard: http://localhost:' + PORT));
