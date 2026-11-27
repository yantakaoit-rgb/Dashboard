// ============================================================================
// netlify/functions/sb.mjs — ตัวห่อ (wrapper) สำหรับ Netlify Functions v2
// หน้าที่: รับคำขอที่ /api/sb และ /api/sb/* แล้วส่งให้ตัวกลางกลาง (src/proxy.js)
// ============================================================================

// Netlify Function (v2) — ผูกเส้นทาง /api/sb/* โดยตรง ไม่ต้องใช้ redirect ใน netlify.toml
import { handleProxy } from '../../src/proxy.js'; // นำเข้าตัวกลางกลาง (ขึ้นไป 2 ระดับโฟลเดอร์แล้วเข้า src/)

export default (request) => handleProxy(request, process.env); // ฟังก์ชันหลัก: ส่งคำขอพร้อมตัวแปรสภาพแวดล้อมของ Netlify (process.env) ให้ตัวกลาง

export const config = { path: ['/api/sb', '/api/sb/*'] }; // บอก Netlify ว่าให้ฟังก์ชันนี้รับ path ไหนบ้าง (ผูกเส้นทางที่นี่เลย)
