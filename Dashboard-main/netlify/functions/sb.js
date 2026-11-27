// Netlify Function: ตัวกลางไป Supabase — คีย์อยู่ใน Environment variables ของ Netlify ไม่อยู่ในโค้ด
const json = (code, body) => ({ statusCode: code, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }, body });

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') return json(405, 'Method Not Allowed');
  const { SUPABASE_URL, SUPABASE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_KEY) return json(500, 'Server not configured: ตั้ง SUPABASE_URL และ SUPABASE_KEY ที่ Netlify แล้วหรือยัง');

  // หาชื่อตารางจากหลายแหล่ง (พารามิเตอร์ที่ redirect ส่งมา หรือเส้นทางที่เบราว์เซอร์เรียก)
  let q;
  try { q = new URLSearchParams(event.rawUrl ? new URL(event.rawUrl).search : (event.rawQuery || '')); }
  catch { q = new URLSearchParams(event.rawQuery || ''); }
  const fromPath = ((event.rawUrl || '') + ' ' + (event.path || '')).match(/(hospital_[a-z_]+_stats)(?:[?\s/]|$)/);
  const table = q.get('table') || (event.queryStringParameters || {}).table || (fromPath ? fromPath[1] : '');
  q.delete('table');
  if (q.get('ping') !== null && !table) {
    const k = SUPABASE_KEY.trim();
    return json(200, `sb function v3 OK | URL: ${/^https:\/\/[a-z0-9]+\.supabase\.co\/?$/.test(SUPABASE_URL.trim()) ? 'รูปแบบถูกต้อง' : 'รูปแบบผิด (ต้องเป็น https://xxxx.supabase.co)'} | KEY: ${k.startsWith('sb_') ? 'แบบ sb_ (publishable)' : k.startsWith('eyJ') ? 'แบบ JWT (anon)' : 'รูปแบบไม่รู้จัก'}, ยาว ${k.length} ตัวอักษร`);
  }
  if (!/^hospital_[a-z_]+_stats$/.test(table)) return json(404, 'sb v3: ตารางไม่ได้รับอนุญาต (ได้รับ: "' + String(table).replace(/[^A-Za-z0-9_]/g, '').slice(0, 40) + '")'); // อนุญาตเฉพาะตารางสถิติ

  const key = SUPABASE_KEY.trim();
  const h = { apikey: key };
  if (!key.startsWith('sb_')) h.Authorization = 'Bearer ' + key; // คีย์แบบใหม่ (sb_...) ไม่ใช่ JWT ห้ามส่งใน Authorization
  if (event.headers['range']) h['Range'] = event.headers['range'];
  if (event.headers['range-unit']) h['Range-Unit'] = event.headers['range-unit'];

  try {
    const r = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${table}?${q.toString()}`, { headers: h });
    return { statusCode: r.status, headers: { 'Content-Type': r.headers.get('content-type') || 'application/json', 'Cache-Control': 'no-store' }, body: await r.text() };
  } catch { return json(502, 'Upstream error'); }
};
