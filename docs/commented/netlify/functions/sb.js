// ============================================================================
// netlify/functions/sb.js — ตัวกลางรุ่นเก่า (v3) สไตล์ CommonJS
// หมายเหตุ: เป็นไฟล์รุ่นเก่า ปัจจุบันใช้ sb.mjs + src/proxy.js แทนแล้ว
//          (package.json ตั้ง "type":"module" ทำให้ไฟล์ .js ที่ใช้ exports.handler แบบนี้ไม่เข้ากัน
//           และมีชื่อซ้ำกับ sb.mjs → แนะนำให้ลบไฟล์นี้เพื่อลดความสับสน)
// ============================================================================

// Netlify Function: ตัวกลางไป Supabase — คีย์อยู่ใน Environment variables ของ Netlify ไม่อยู่ในโค้ด
const json = (code, body) => ({ // ฟังก์ชันช่วยสร้างคำตอบแบบข้อความ (รูปแบบของ Netlify Function รุ่นแรก)
  statusCode: code, // รหัสสถานะ HTTP
  headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }, // ชนิดเนื้อหาเป็นข้อความ UTF-8 และห้ามแคช
  body, // เนื้อหาที่ตอบ
}); // จบ json

exports.handler = async (event) => { // ฟังก์ชันหลักที่ Netlify เรียกเมื่อมีคำขอ (event = ข้อมูลคำขอ)
  if (event.httpMethod !== 'GET') return json(405, 'Method Not Allowed'); // รับเฉพาะ GET
  const { SUPABASE_URL, SUPABASE_KEY } = process.env; // อ่านค่าตั้งค่าจากตัวแปรสภาพแวดล้อม
  if (!SUPABASE_URL || !SUPABASE_KEY) return json(500, 'Server not configured: ตั้ง SUPABASE_URL และ SUPABASE_KEY ที่ Netlify แล้วหรือยัง'); // ถ้าขาดค่าใด ตอบ 500

  // หาชื่อตารางจากหลายแหล่ง (พารามิเตอร์ที่ redirect ส่งมา หรือเส้นทางที่เบราว์เซอร์เรียก)
  let q; // ตัวแปรเก็บ query string ที่แยกเป็นคู่ชื่อ/ค่า
  try { q = new URLSearchParams(event.rawUrl ? new URL(event.rawUrl).search : (event.rawQuery || '')); } // ถ้ามี rawUrl ใช้ส่วน ?... ของมัน ไม่งั้นใช้ rawQuery
  catch { q = new URLSearchParams(event.rawQuery || ''); } // ถ้า rawUrl อ่านไม่ได้ ถอยไปใช้ rawQuery
  const fromPath = ((event.rawUrl || '') + ' ' + (event.path || '')).match(/(hospital_[a-z_]+_stats)(?:[?\s/]|$)/); // ค้นชื่อตารางจากตัว URL/path เอง
  const table = q.get('table') || (event.queryStringParameters || {}).table || (fromPath ? fromPath[1] : ''); // ลำดับความสำคัญ: ?table= → queryStringParameters → ชื่อใน path
  q.delete('table'); // เอาพารามิเตอร์ table ออก เพื่อไม่ส่งต่อไป Supabase
  if (q.get('ping') !== null && !table) { // ถ้าเรียก ?ping โดยไม่มีชื่อตาราง = ขอตรวจการตั้งค่า
    const k = SUPABASE_KEY.trim(); // คีย์ที่ตัดช่องว่างแล้ว
    return json(200, `sb function v3 OK | URL: ${/^https:\/\/[a-z0-9]+\.supabase\.co\/?$/.test(SUPABASE_URL.trim()) ? 'รูปแบบถูกต้อง' : 'รูปแบบผิด (ต้องเป็น https://xxxx.supabase.co)'} | KEY: ${k.startsWith('sb_') ? 'แบบ sb_ (publishable)' : k.startsWith('eyJ') ? 'แบบ JWT (anon)' : 'รูปแบบไม่รู้จัก'}, ยาว ${k.length} ตัวอักษร`); // ตอบสถานะการตั้งค่า (ไม่เปิดเผยค่าจริง บอกแค่ความยาวคีย์)
  } // จบ ping
  if (!/^hospital_[a-z_]+_stats$/.test(table)) return json(404, 'sb v3: ตารางไม่ได้รับอนุญาต (ได้รับ: "' + String(table).replace(/[^A-Za-z0-9_]/g, '').slice(0, 40) + '")'); // อนุญาตเฉพาะตารางสถิติ ถ้าไม่ผ่านตอบ 404 (แสดงชื่อที่ได้รับแบบกรองอักขระแล้ว)

  const key = SUPABASE_KEY.trim(); // คีย์ที่ตัดช่องว่างแล้ว
  const h = { apikey: key }; // header ที่จะส่งไป Supabase เริ่มด้วย apikey
  if (!key.startsWith('sb_')) h.Authorization = 'Bearer ' + key; // คีย์แบบใหม่ (sb_...) ไม่ใช่ JWT ห้ามส่งใน Authorization
  if (event.headers['range']) h['Range'] = event.headers['range']; // ส่งต่อ header Range (แบ่งหน้า) ถ้ามี
  if (event.headers['range-unit']) h['Range-Unit'] = event.headers['range-unit']; // ส่งต่อ header Range-Unit ถ้ามี

  try { // ดักข้อผิดพลาดเครือข่าย
    const r = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${table}?${q.toString()}`, { headers: h }); // เรียก Supabase ที่ตารางนั้นพร้อม query ที่เหลือ
    return { statusCode: r.status, headers: { 'Content-Type': r.headers.get('content-type') || 'application/json', 'Cache-Control': 'no-store' }, body: await r.text() }; // ส่งสถานะและเนื้อหาของ Supabase กลับ
  } catch { return json(502, 'Upstream error'); } // เรียกไม่สำเร็จ ตอบ 502
}; // จบ handler
