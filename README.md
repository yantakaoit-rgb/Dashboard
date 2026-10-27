# Hospital Dashboard

แดชบอร์ดสถิติโรงพยาบาล ใช้ deploy ได้ทั้ง **Netlify** และ **Cloudflare** จากโค้ดชุดเดียวกัน (ดึงจาก GitHub)

## โครงสร้าง
| ไฟล์ | หน้าที่ |
|---|---|
| `public/index.html` | หน้าเว็บ (เรียก `/api/sb/...` เหมือนกันทุกแพลตฟอร์ม) |
| `public/_headers` | Security headers — Netlify และ Cloudflare อ่านไฟล์นี้เหมือนกัน |
| `src/proxy.js` | **ตัวกลางไป Supabase (โค้ดกลาง)** แก้ logic ที่นี่ที่เดียว |
| `netlify/functions/sb.mjs` | ตัวห่อสำหรับ Netlify |
| `worker.js` + `wrangler.toml` | ตัวห่อสำหรับ Cloudflare (Workers + Static Assets) |
| `netlify.toml` | ตั้งค่า build ของ Netlify |
| `server.js` | รันทดสอบในเครื่อง (ใช้ `src/proxy.js` ตัวเดียวกัน) |

## คีย์ความลับ
**ห้ามใส่คีย์ในโค้ด หรืออัปโหลดไฟล์ `.env` / `.dev.vars` ขึ้น GitHub**
ต้องตั้งสองค่านี้บนแพลตฟอร์มที่ใช้: `SUPABASE_URL`, `SUPABASE_KEY`

## Deploy บน Netlify
1. Add new project → Import from GitHub
2. Build command เว้นว่าง, Publish directory = `public` (ตั้งใน `netlify.toml` แล้ว)
3. Project configuration → Environment variables → ใส่ `SUPABASE_URL` และ `SUPABASE_KEY` (ติ๊ก *Contains secret values*)
4. Deploy (ถ้าเพิ่งตั้งค่า ต้อง redeploy ใหม่หนึ่งครั้ง)

## Deploy บน Cloudflare
1. Workers & Pages → Create → Import a repository (เลือก repo นี้)
2. Build command เว้นว่าง, Deploy command = `npx wrangler deploy`
3. Settings → Variables and secrets → เพิ่ม `SUPABASE_URL` และ `SUPABASE_KEY` โดยเลือกชนิด **Secret** ทั้งคู่
   (หรือใช้ CLI: `npx wrangler secret put SUPABASE_KEY`)

## ตรวจว่าตั้งค่าถูกไหม
เปิด `https://<โดเมนของคุณ>/api/sb/ping` จะบอกว่า URL และ KEY อยู่ในรูปแบบที่ถูกต้องหรือไม่ (ไม่แสดงค่าจริง)

## รันในเครื่อง
- แบบง่าย: คัดลอก `.env.example` เป็น `.env` ใส่ค่าจริง แล้วรัน `node server.js` เปิด http://localhost:3000
- จำลอง Netlify: `npm run dev:netlify` (ใช้ค่าจากไฟล์ `.env` หรือที่ link กับ site)
- จำลอง Cloudflare: สร้างไฟล์ `.dev.vars` (รูปแบบเดียวกับ `.env`) แล้วรัน `npm run dev:cloudflare`

## หมายเหตุ
- ตารางที่อนุญาตให้เรียกผ่านตัวกลางมีเฉพาะชื่อแบบ `hospital_*_stats` และรับเฉพาะ GET
- การจำกัดอัตราเรียก (rate limit) มีเฉพาะใน `server.js` ตอนรันในเครื่อง บนระบบจริงให้ตั้ง Rate limiting rule ของ Cloudflare (Security → WAF) ที่ path `/api/sb/*`
