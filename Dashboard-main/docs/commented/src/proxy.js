// ============================================================================
// src/proxy.js — ตัวกลาง (proxy) ไปยัง Supabase ที่ใช้ร่วมกันทุกแพลตฟอร์ม
// หลักการ: เบราว์เซอร์ไม่เคยเห็นคีย์จริง → เรียก /api/sb/... → ไฟล์นี้ใส่คีย์ให้ → ส่งต่อไป Supabase
// ============================================================================

// ---------- ส่วนที่ 1: ค่าคงที่ ----------

const PREFIX = '/api/sb'; // คำนำหน้า path ที่เบราว์เซอร์เรียก ใช้ตัดทิ้งเพื่อให้เหลือ path ที่จะส่งต่อ
const TABLE_RE = /^hospital_[a-z_]+_(stats|log)$/; // ชื่อตารางที่อนุญาต: ขึ้นต้น hospital_ ลงท้าย _stats หรือ _log เท่านั้น

// ---------- ส่วนที่ 2: ฟังก์ชันช่วยตอบกลับข้อความธรรมดา ----------

const reply = (status, body, extra = {}) => // สร้าง Response ข้อความ: รับรหัสสถานะ, เนื้อหา, header เพิ่มเติม (ไม่บังคับ)
  new Response(body, { // สร้างอ็อบเจ็กต์ Response มาตรฐาน (Web API)
    status, // กำหนดรหัส HTTP เช่น 200, 404, 500
    headers: { // กลุ่ม header ที่แนบไปกับทุกคำตอบ
      'Content-Type': 'text/plain; charset=utf-8', // บอกว่าเป็นข้อความล้วน เข้ารหัส UTF-8 (แสดงภาษาไทยได้)
      'Cache-Control': 'no-store', // ห้ามเบราว์เซอร์/CDN เก็บแคช เพื่อให้ข้อมูลสดเสมอ
      'X-Content-Type-Options': 'nosniff', // ห้ามเบราว์เซอร์เดาชนิดไฟล์เอง (ป้องกันการตีความผิด)
      ...extra, // ผสม header เพิ่มเติมที่ผู้เรียกส่งมา (เช่น Allow)
    }, // จบกลุ่ม headers
  }); // จบการสร้าง Response

// ---------- ส่วนที่ 3: ฟังก์ชันหลัก (ทุกแพลตฟอร์มเรียกตัวนี้) ----------

export async function handleProxy(request, env = {}) { // รับคำขอ (Request) กับตัวแปรสภาพแวดล้อม (env) ที่แต่ละแพลตฟอร์มส่งมา

  // --- 3.1 อนุญาตเฉพาะ GET (อ่านอย่างเดียว) ---
  if (request.method !== 'GET') return reply(405, 'Method Not Allowed', { Allow: 'GET' }); // วิธีอื่น (POST/PUT/DELETE) ปฏิเสธทันที ป้องกันการแก้ข้อมูล

  // --- 3.2 อ่านค่าตั้งค่าและแยก path ---
  const base = String(env.SUPABASE_URL || '').trim().replace(/\/+$/, ''); // อ่าน URL โปรเจกต์ Supabase ตัดช่องว่างและเครื่องหมาย / ท้ายสุดออก
  const key = String(env.SUPABASE_KEY || '').trim(); // อ่านคีย์ Supabase และตัดช่องว่างหัวท้าย
  const rest = new URL(request.url).pathname.slice(PREFIX.length).replace(/^\/+|\/+$/g, ''); // ตัด /api/sb ออก แล้วตัด / หัวท้าย เหลือเช่น "rest/v1/hospital_daily_stats"

  // --- 3.3 เส้นทางตรวจสอบการตั้งค่า: GET /api/sb/ping ---
  if (rest === 'ping') { // ถ้าเรียก /api/sb/ping
    const urlOk = /^https:\/\/[a-z0-9]+\.supabase\.co$/.test(base); // เช็กว่า URL อยู่ในรูป https://xxxx.supabase.co
    const keyKind = key.startsWith('sb_') ? 'แบบ sb_ (publishable)' // ถ้าคีย์ขึ้นต้น sb_ = คีย์รูปแบบใหม่
      : key.startsWith('eyJ') ? 'แบบ JWT (anon)' // ถ้าขึ้นต้น eyJ = คีย์แบบ JWT (anon เดิม)
      : key ? 'รูปแบบไม่รู้จัก' // มีค่าแต่ไม่ตรงสองแบบข้างต้น
      : 'ยังไม่ได้ตั้งค่า'; // ไม่มีค่าเลย
    return reply(200, `sb proxy OK | URL: ${base ? (urlOk ? 'รูปแบบถูกต้อง' : 'รูปแบบผิด (ต้องเป็น https://xxxx.supabase.co)') : 'ยังไม่ได้ตั้งค่า'} | KEY: ${keyKind}`); // ตอบสถานะ โดยไม่เปิดเผยค่าจริงของ URL/คีย์
  } // จบ ping

  // --- 3.4 ตรวจว่าตั้งค่าครบ ---
  if (!base || !key) return reply(500, 'Server not configured: ตั้ง SUPABASE_URL และ SUPABASE_KEY ใน Environment variables ของแพลตฟอร์มที่ใช้ deploy แล้วหรือยัง'); // ถ้าขาดอย่างใดอย่างหนึ่ง ตอบ 500 พร้อมคำแนะนำ

  // --- 3.5 ตรวจ path และชื่อตาราง (allowlist) ---
  const m = rest.match(/^rest\/v1\/([^/]+)$/); // path ต้องเป็นรูป rest/v1/<ชื่อตาราง> เท่านั้น จับชื่อตารางไว้ใน m[1]
  if (!m || !TABLE_RE.test(m[1])) return reply(404, 'Not Found: ตารางไม่ได้รับอนุญาต'); // ถ้ารูปแบบผิด หรือชื่อตารางไม่ผ่านรูปแบบที่อนุญาต → 404

  // --- 3.6 เตรียม header ที่จะส่งไป Supabase ---
  const headers = { apikey: key }; // ใส่คีย์ในหัวข้อ apikey (Supabase ต้องใช้)
  if (!key.startsWith('sb_')) headers.Authorization = 'Bearer ' + key; // คีย์แบบ JWT ต้องส่งใน Authorization ด้วย ส่วนคีย์ sb_ ห้ามส่ง
  for (const h of ['range', 'range-unit']) { // วนสอง header ที่ใช้แบ่งหน้าข้อมูล (pagination)
    const v = request.headers.get(h); // อ่านค่า header นั้นจากคำขอของเบราว์เซอร์
    if (v) headers[h] = v; // ถ้ามีค่า ก็ส่งต่อไปด้วย
  } // จบการวน

  // --- 3.7 ส่งต่อไป Supabase แล้วคืนผล ---
  try { // ดักข้อผิดพลาดตอนเรียกเครือข่าย
    const r = await fetch(`${base}/rest/v1/${m[1]}${new URL(request.url).search}`, { headers }); // เรียก Supabase: URL + ชื่อตาราง + query string เดิม (select, order, filter)
    const out = { // header ที่จะส่งกลับให้เบราว์เซอร์
      'Content-Type': r.headers.get('content-type') || 'application/json', // ใช้ชนิดเนื้อหาจาก Supabase ถ้าไม่มีให้เป็น JSON
      'Cache-Control': 'no-store', // ห้ามแคช
      'X-Content-Type-Options': 'nosniff', // ห้ามเดาชนิดไฟล์
    }; // จบ header
    const cr = r.headers.get('content-range'); // อ่านช่วงข้อมูลที่ Supabase ตอบ (เช่น 0-999/5000)
    if (cr) out['Content-Range'] = cr; // ถ้ามี ก็ส่งต่อให้เบราว์เซอร์
    return new Response(r.body, { status: r.status, headers: out }); // คืนเนื้อหาและสถานะเดิมของ Supabase
  } catch { // ถ้าเรียกไม่สำเร็จ (เครือข่ายล่ม ฯลฯ)
    return reply(502, 'Upstream error'); // ตอบ 502 = ต้นทางมีปัญหา
  } // จบ try/catch
} // จบฟังก์ชัน handleProxy
