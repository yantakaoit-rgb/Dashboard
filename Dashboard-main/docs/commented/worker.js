// ============================================================================
// worker.js — ตัวห่อ (wrapper) สำหรับ Cloudflare Workers
// หน้าที่: แยกคำขอ 2 ประเภท → /api/sb/* ส่งให้ proxy, นอกนั้นให้ไฟล์หน้าเว็บ (public/) จัดการ
// ============================================================================

// Cloudflare Worker — เสิร์ฟ API ที่ /api/sb/* ส่วนไฟล์หน้าเว็บให้ Static Assets (โฟลเดอร์ public) จัดการ
import { handleProxy } from './src/proxy.js'; // นำเข้าฟังก์ชันตัวกลางกลาง (ใช้ร่วมกับ Netlify และ server.js)

export default { // ส่งออกอ็อบเจ็กต์หลักที่ Cloudflare จะเรียกทุกครั้งที่มีคำขอเข้ามา
  async fetch(request, env) { // request = คำขอ, env = ตัวแปร/Secret/binding ของ Worker (SUPABASE_URL, SUPABASE_KEY, ASSETS)
    const { pathname } = new URL(request.url); // ดึงเฉพาะ path ของ URL เช่น /api/sb/ping
    if (pathname === '/api/sb' || pathname.startsWith('/api/sb/')) return handleProxy(request, env); // ถ้าเป็น path ของ API → ส่งให้ตัวกลางทำงานต่อ
    return env.ASSETS.fetch(request); // นอกจากนั้นให้ Static Assets เสิร์ฟไฟล์ใน public/ (เช่น index.html)
  }, // จบเมธอด fetch
}; // จบ export default
