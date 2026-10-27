// ตัวกลางไป Supabase — โค้ดกลางที่ใช้ร่วมกันทุกแพลตฟอร์ม (Netlify / Cloudflare / Node ในเครื่อง)
// ใช้เฉพาะ Web-standard API (Request, Response, fetch, URL) จึงไม่ผูกกับแพลตฟอร์มใด
// คีย์ความลับอ่านจาก `env` ที่แต่ละแพลตฟอร์มส่งเข้ามา — ไม่อยู่ในโค้ด

const PREFIX = '/api/sb';
const TABLE_RE = /^hospital_[a-z_]+_stats$/; // อนุญาตเฉพาะตารางสถิติ

const reply = (status, body, extra = {}) =>
  new Response(body, {
    status,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...extra,
    },
  });

export async function handleProxy(request, env = {}) {
  if (request.method !== 'GET') return reply(405, 'Method Not Allowed', { Allow: 'GET' });

  const base = String(env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
  const key = String(env.SUPABASE_KEY || '').trim();
  const rest = new URL(request.url).pathname.slice(PREFIX.length).replace(/^\/+|\/+$/g, '');

  // ตรวจการตั้งค่า: GET /api/sb/ping (ไม่เปิดเผยค่าคีย์)
  if (rest === 'ping') {
    const urlOk = /^https:\/\/[a-z0-9]+\.supabase\.co$/.test(base);
    const keyKind = key.startsWith('sb_') ? 'แบบ sb_ (publishable)' : key.startsWith('eyJ') ? 'แบบ JWT (anon)' : key ? 'รูปแบบไม่รู้จัก' : 'ยังไม่ได้ตั้งค่า';
    return reply(200, `sb proxy OK | URL: ${base ? (urlOk ? 'รูปแบบถูกต้อง' : 'รูปแบบผิด (ต้องเป็น https://xxxx.supabase.co)') : 'ยังไม่ได้ตั้งค่า'} | KEY: ${keyKind}`);
  }

  if (!base || !key) return reply(500, 'Server not configured: ตั้ง SUPABASE_URL และ SUPABASE_KEY ใน Environment variables ของแพลตฟอร์มที่ใช้ deploy แล้วหรือยัง');

  const m = rest.match(/^rest\/v1\/([^/]+)$/);
  if (!m || !TABLE_RE.test(m[1])) return reply(404, 'Not Found: ตารางไม่ได้รับอนุญาต');

  const headers = { apikey: key };
  if (!key.startsWith('sb_')) headers.Authorization = 'Bearer ' + key; // คีย์แบบใหม่ (sb_...) ไม่ใช่ JWT ห้ามส่งใน Authorization
  for (const h of ['range', 'range-unit']) {
    const v = request.headers.get(h);
    if (v) headers[h] = v;
  }

  try {
    const r = await fetch(`${base}/rest/v1/${m[1]}${new URL(request.url).search}`, { headers });
    const out = {
      'Content-Type': r.headers.get('content-type') || 'application/json',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    };
    const cr = r.headers.get('content-range');
    if (cr) out['Content-Range'] = cr;
    return new Response(r.body, { status: r.status, headers: out });
  } catch {
    return reply(502, 'Upstream error');
  }
}
