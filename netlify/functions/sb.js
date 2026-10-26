// Netlify Function: ตัวกลางไป Supabase — คีย์อยู่ใน Environment variables ของ Netlify ไม่อยู่ในโค้ด
const json = (code, body) => ({ statusCode: code, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }, body });

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') return json(405, 'Method Not Allowed');
  const { SUPABASE_URL, SUPABASE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_KEY) return json(500, 'Server not configured');

  // หาชื่อตารางจากหลายแหล่ง (พารามิเตอร์ที่ redirect ส่งมา หรือเส้นทางที่เบราว์เซอร์เรียก)
  let q;
  try { q = new URLSearchParams(event.rawUrl ? new URL(event.rawUrl).search : (event.rawQuery || '')); }
  catch { q = new URLSearchParams(event.rawQuery || ''); }
  const fromPath = ((event.rawUrl || '') + ' ' + (event.path || '')).match(/(hospital_[a-z_]+_stats)(?:[?\s/]|$)/);
  const table = q.get('table') || (event.queryStringParameters || {}).table || (fromPath ? fromPath[1] : '');
  q.delete('table');
  if (!/^hospital_[a-z_]+_stats$/.test(table)) return json(404, 'Not Found'); // อนุญาตเฉพาะตารางสถิติ

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
