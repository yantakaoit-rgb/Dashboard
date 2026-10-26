# Hospital Dashboard

แดชบอร์ดสถิติโรงพยาบาล โฮสต์บน Netlify ดึงโค้ดจาก GitHub

## โครงสร้าง
- `public/index.html` หน้าเว็บ
- `netlify/functions/sb.js` ตัวกลางไป Supabase (ใช้คีย์จาก Environment variables)
- `netlify.toml` ตั้งค่า deploy และ security headers
- `server.js` ใช้รันทดสอบในเครื่องเท่านั้น

## คีย์ความลับ
**ห้ามใส่คีย์ในโค้ดหรืออัปโหลดไฟล์ `.env` ขึ้น GitHub**
ตั้งค่าที่ Netlify: Project configuration → Environment variables
- `SUPABASE_URL`
- `SUPABASE_KEY` (ติ๊ก Contains secret values)

## รันในเครื่อง
คัดลอก `.env.example` เป็น `.env` ใส่ค่าจริง แล้วรัน `node server.js` เปิด http://localhost:3000
