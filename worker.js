// Cloudflare Worker — เสิร์ฟ API ที่ /api/sb/* ส่วนไฟล์หน้าเว็บให้ Static Assets (โฟลเดอร์ public) จัดการ
import { handleProxy } from './src/proxy.js';

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname === '/api/sb' || pathname.startsWith('/api/sb/')) return handleProxy(request, env);
    return env.ASSETS.fetch(request);
  },
};
