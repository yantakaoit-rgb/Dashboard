// ============================================================================
// server.js — เซิร์ฟเวอร์สำหรับรันทดสอบในเครื่อง (Node 18+, ไม่ต้องติดตั้งแพ็กเกจเพิ่ม)
// หน้าที่: เสิร์ฟ index.html + ใช้ตัวกลางเดียวกับของจริง (src/proxy.js) + จำกัดอัตราเรียกต่อ IP
// ============================================================================

// เซิร์ฟเวอร์สำหรับรันทดสอบในเครื่อง (Node 18+, ไม่ต้องติดตั้งแพ็กเกจเพิ่ม)
// เสิร์ฟ index.html และใช้ตัวกลางเดียวกับที่ deploy จริง (src/proxy.js)

// ---------- ส่วนที่ 1: นำเข้าโมดูล ----------
import http from 'node:http'; // โมดูลสร้างเว็บเซิร์ฟเวอร์ของ Node
import fs from 'node:fs'; // โมดูลอ่านไฟล์
import path from 'node:path'; // โมดูลจัดการเส้นทางไฟล์
import { fileURLToPath } from 'node:url'; // แปลง URL ของไฟล์นี้ให้เป็น path บนดิสก์
import { handleProxy } from './src/proxy.js'; // ตัวกลางไป Supabase (โค้ดเดียวกับที่ใช้ตอน deploy)

const dir = path.dirname(fileURLToPath(import.meta.url)); // โฟลเดอร์ที่ไฟล์ server.js อยู่ (ใช้อ้างอิงไฟล์อื่น)

// ---------- ส่วนที่ 2: โหลดไฟล์ .env เข้าตัวแปรสภาพแวดล้อม ----------
// โหลด .env
try { // ถ้าอ่านไฟล์ไม่ได้ จะไปที่ catch
  for (const line of fs.readFileSync(path.join(dir, '.env'), 'utf8').split(/\r?\n/)) { // อ่าน .env ทั้งไฟล์ แล้วแยกทีละบรรทัด (รองรับ \n และ \r\n)
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/); // จับรูปแบบ "ชื่อ=ค่า" โดย m[1]=ชื่อ, m[2]=ค่า
    if (m && !line.trim().startsWith('#') && !(m[1] in process.env)) // ใช้เฉพาะบรรทัดที่ตรงรูปแบบ, ไม่ใช่ comment, และยังไม่มีตัวแปรนี้อยู่แล้ว
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, ''); // เก็บค่าเข้า process.env โดยตัดเครื่องหมายคำพูดหัวท้ายออก
  } // จบการวนอ่านบรรทัด
} catch { console.error('ไม่พบไฟล์ .env'); process.exit(1); } // ถ้าไม่มี .env แจ้งแล้วหยุดโปรแกรม

// ---------- ส่วนที่ 3: ตรวจค่าที่จำเป็น ----------
const { SUPABASE_URL, SUPABASE_KEY, PORT = 3000 } = process.env; // ดึงค่า URL, คีย์, พอร์ต (ถ้าไม่ตั้งพอร์ตใช้ 3000)
if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('ต้องตั้ง SUPABASE_URL และ SUPABASE_KEY ใน .env'); process.exit(1); } // ถ้าขาดค่าใดค่าหนึ่ง แจ้งแล้วหยุดโปรแกรม

// ---------- ส่วนที่ 4: อ่าน security headers จาก public/_headers ----------
// อ่าน security headers จาก public/_headers (บล็อก /*) ให้ตรงกับของจริงบน Netlify/Cloudflare
const SEC = { 'Cache-Control': 'no-store' }; // ตั้งต้นด้วยห้ามแคช แล้วเติม header ความปลอดภัยต่อ
try { // ถ้าไม่มีไฟล์ _headers ก็ข้ามไป
  let inGlobal = false; // ธงบอกว่าตอนนี้อยู่ในบล็อก "/*" หรือไม่
  for (const line of fs.readFileSync(path.join(dir, 'public', '_headers'), 'utf8').split(/\r?\n/)) { // อ่านไฟล์ _headers ทีละบรรทัด
    if (/^\S/.test(line) && !line.startsWith('#')) inGlobal = line.trim() === '/*'; // บรรทัดที่ไม่ย่อหน้า = หัวบล็อก path → เปิดธงเฉพาะเมื่อเป็น "/*"
    else if (inGlobal) { const m = line.match(/^\s+([\w-]+):\s*(.+)$/); if (m) SEC[m[1]] = m[2]; } // บรรทัดย่อหน้าในบล็อก /* → แยก "ชื่อ: ค่า" แล้วเก็บเข้า SEC
  } // จบการวน
} catch {} // ไม่มีไฟล์ _headers → ไม่ต้องทำอะไร

// ---------- ส่วนที่ 5: ฟังก์ชันช่วยส่งคำตอบ ----------
const send = (res, code, body, type = 'text/plain; charset=utf-8') => { // ส่งคำตอบ: res, รหัสสถานะ, เนื้อหา, ชนิดเนื้อหา (ค่าเริ่มต้นข้อความธรรมดา)
  res.writeHead(code, { ...SEC, 'Content-Type': type }); // เขียน header: security headers + ชนิดเนื้อหา
  res.end(body); // ส่งเนื้อหาแล้วปิดการตอบ
}; // จบฟังก์ชัน send

// ---------- ส่วนที่ 6: จำกัดอัตราเรียกต่อ IP (เฉพาะตอนรันในเครื่อง) ----------
// จำกัดอัตราเรียกต่อ IP (เฉพาะรันในเครื่อง — บน Cloudflare/Netlify ให้ใช้ Rate limiting ของแพลตฟอร์ม)
const hits = new Map(); // ตารางเก็บเวลาที่แต่ละ IP เรียกเข้ามา (key=IP, value=รายการเวลา)
const limited = ip => { // คืน true ถ้า IP นี้เรียกเกินกำหนด
  const n = Date.now(), // เวลาปัจจุบัน (มิลลิวินาที)
    a = (hits.get(ip) || []).filter(t => n - t < 60000); // ดึงรายการเก่าของ IP นี้ เก็บเฉพาะที่อยู่ใน 60 วินาทีล่าสุด
  a.push(n); // บันทึกการเรียกครั้งนี้
  hits.set(ip, a); // เก็บรายการที่อัปเดตกลับเข้าตาราง
  return a.length > 300; // เกิน 300 ครั้งต่อนาที = ถูกจำกัด
}; // จบฟังก์ชัน limited

// ---------- ส่วนที่ 7: สร้างและเริ่มเซิร์ฟเวอร์ ----------
http.createServer(async (req, res) => { // สร้างเซิร์ฟเวอร์ ทุกคำขอเข้ามาที่ฟังก์ชันนี้
  try { // ดักข้อผิดพลาดทุกกรณีไม่ให้เซิร์ฟเวอร์ล่ม
    const u = new URL(req.url, 'http://localhost'); // แปลง path ที่เข้ามาเป็นอ็อบเจ็กต์ URL (ต้องมี base เพราะ req.url เป็นแค่ path)
    if (req.method !== 'GET') return send(res, 405, 'Method Not Allowed'); // รับเฉพาะ GET

    // --- 7.1 เสิร์ฟหน้าเว็บ ---
    if (u.pathname === '/' || u.pathname === '/index.html') // ถ้าขอหน้าแรกหรือ index.html
      return send(res, 200, fs.readFileSync(path.join(dir, 'public', 'index.html')), 'text/html; charset=utf-8'); // อ่านไฟล์ public/index.html ส่งกลับเป็น HTML

    // --- 7.2 เสิร์ฟ API ตัวกลาง ---
    if (u.pathname === '/api/sb' || u.pathname.startsWith('/api/sb/')) { // ถ้า path ขึ้นต้น /api/sb
      if (limited(req.socket.remoteAddress)) return send(res, 429, 'Too Many Requests'); // เช็กอัตราเรียกของ IP → เกินให้ตอบ 429
      const headers = new Headers(); // สร้างกลุ่ม header สำหรับคำขอที่จะส่งให้ตัวกลาง
      for (const h of ['range', 'range-unit']) if (typeof req.headers[h] === 'string') headers.set(h, req.headers[h]); // คัดลอกเฉพาะ header แบ่งหน้า (range, range-unit)
      const r = await handleProxy(new Request(u, { method: 'GET', headers }), process.env); // สร้าง Request มาตรฐานแล้วเรียกตัวกลางตัวเดียวกับของจริง
      res.writeHead(r.status, { ...SEC, ...Object.fromEntries(r.headers) }); // เขียน header: security headers + header จากตัวกลาง
      return res.end(Buffer.from(await r.arrayBuffer())); // อ่านเนื้อหาที่ตัวกลางตอบ แล้วส่งให้เบราว์เซอร์
    } // จบการจัดการ /api/sb

    send(res, 404, 'Not Found'); // path อื่นทั้งหมดไม่รู้จัก → 404
  } catch { send(res, 502, 'Upstream error'); } // ถ้าเกิดข้อผิดพลาดใดๆ ตอบ 502
}).listen(PORT, () => console.log('Dashboard: http://localhost:' + PORT)); // เริ่มรับคำขอที่พอร์ตที่กำหนด แล้วแสดงที่อยู่ในเทอร์มินัล
