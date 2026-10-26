// Netlify Function: ตัวกลางไป Supabase — คีย์อยู่ใน Environment variables ของ Netlify ไม่อยู่ในโค้ด
const json = (code, body) => ({ statusCode: code, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }, body });

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') return json(405, 'Method Not Allowed');
  const { SUPABASE_URL, SUPABASE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_KEY) return json(500, 'Server not configured');

  const q = new URLSearchParams(event.rawQuery || '');
  const table = q.get('table') || '';
  q.delete('table');
  if (!/^hospital_[a-z_]+_stats$/.test(table)) return json(404, 'Not Found'); // อนุญาตเฉพาะตารางสถิติ

  const h = { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY };
  if (event.headers['range']) h['Range'] = event.headers['range'];
  if (event.headers['range-unit']) h['Range-Unit'] = event.headers['range-unit'];

  try {
    const r = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${table}?${q.toString()}`, { headers: h });
    return { statusCode: r.status, headers: { 'Content-Type': r.headers.get('content-type') || 'application/json', 'Cache-Control': 'no-store' }, body: await r.text() };
  } catch { return json(502, 'Upstream error'); }
};
