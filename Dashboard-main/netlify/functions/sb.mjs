// Netlify Function (v2) — ผูกเส้นทาง /api/sb/* โดยตรง ไม่ต้องใช้ redirect ใน netlify.toml
import { handleProxy } from '../../src/proxy.js';

export default (request) => handleProxy(request, process.env);

export const config = { path: ['/api/sb', '/api/sb/*'] };
