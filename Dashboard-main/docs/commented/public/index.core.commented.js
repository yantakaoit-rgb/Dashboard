// ============================================================================
// index.core.commented.js — แกนหลักของ public/index.html (<script> บล็อกแรก)
// ครอบคลุมบรรทัดเดิม 216–245 (ตั้งค่า + ฟังก์ชันช่วย + ดึงข้อมูล) และ 655–699 (โหลด/เลือกช่วงวันที่/ปุ่ม)
// หมายเหตุ: นี่คือไฟล์อธิบาย ไม่ได้ใช้รันจริง (ต้องอยู่ในหน้าเว็บที่มี #msg, #from, #to ฯลฯ)
// ============================================================================

// ---------- ส่วนที่ A: ตั้งค่า (เดิมบรรทัด 217–224) ----------
/* ===== ตั้งค่าครั้งเดียวตรงนี้ แล้วนำไฟล์ขึ้นเว็บ — ผู้ใช้ทุกคนจะเชื่อมต่ออัตโนมัติ ===== */
const CONFIG = { // อ็อบเจ็กต์ตั้งค่าการเชื่อมต่อ
  url: '/api/sb', // เรียกผ่านตัวกลางของเรา (Netlify Function / Cloudflare Worker / server.js) — คีย์จริงอยู่ฝั่งเซิร์ฟเวอร์ ไม่อยู่ในไฟล์นี้
  key: 'proxy',   // ค่าตัวแทน ไม่ใช่คีย์จริง (ใส่ไว้เพื่อให้โค้ดเดิมที่ตรวจว่า "มีคีย์" ทำงานได้)
  logo: ''        // ลิงก์โลโก้ (ว่าง = ใช้สัญลักษณ์ ✚)
}; // จบ CONFIG
const AUTO = !/YOUR_/.test(CONFIG.url + CONFIG.key) && CONFIG.url && CONFIG.key; // โหมดอัตโนมัติ: จริงเมื่อไม่มีคำว่า YOUR_ (ยังไม่ได้แก้ค่าตัวอย่าง) และมีทั้ง url และ key
const TARGET = { occ: 85, wait: 20, consult: 15, readmit: 10, total: 60 }; // เป้าหมายส่วนแจ้งเตือน (แก้ได้): ครองเตียง %, รอพบแพทย์ นาที, ตรวจ นาที, กลับมานอนซ้ำ %, ใช้เวลารวม นาที
const $ = s => document.querySelector(s), // ตัวช่วยย่อ: เลือกองค์ประกอบ HTML ตัวแรกที่ตรงกับ selector
  TB = ['daily', 'hourly', 'department', 'pttype', 'er_triage', 'doctor_clinic']; // รายชื่อตารางหลักที่ดึงพร้อมกัน (จะกลายเป็น hospital_<ชื่อ>_stats)

// ---------- ส่วนที่ B: ฟังก์ชันช่วยคำนวณ/จัดรูปแบบ (เดิมบรรทัด 226–234) ----------
const num = v => +v || 0, // แปลงเป็นตัวเลข ถ้าแปลงไม่ได้/ว่างให้เป็น 0
  sum = (a, f) => a.reduce((s, r) => s + num(f(r)), 0); // ผลรวม: วนอาร์เรย์ a แล้วบวกค่าที่ f(r) ดึงจากแต่ละแถว
const avg = (a, f) => { // ค่าเฉลี่ย (ข้ามค่าว่าง/ไม่ใช่ตัวเลข)
  const x = a.map(f) // ดึงค่าจากแต่ละแถวด้วย f
    .filter(v => v !== null && v !== '' && v !== undefined && isFinite(+v)) // เก็บเฉพาะค่าที่เป็นตัวเลขจริง
    .map(Number); // แปลงเป็น Number
  return x.length ? x.reduce((s, v) => s + v, 0) / x.length : null; // มีข้อมูล → รวมแล้วหารจำนวน ไม่มี → null
}; // จบ avg
const fm = (v, d = 0) => v == null ? '-' : v.toLocaleString('th-TH', { maximumFractionDigits: 2 }); // จัดรูปแบบตัวเลขแบบไทย (มีคอมมา) ทศนิยมไม่เกิน 2 ตำแหน่ง; null → "-" (พารามิเตอร์ d ถูกละไว้)
const fr = (v, d = 0) => v == null ? '-' : v.toLocaleString('th-TH', { maximumFractionDigits: d }); // จัดรูปแบบเหมือน fm แต่ใช้จำนวนทศนิยม d ที่กำหนด (ใช้บนแกนกราฟ)
const iso = d => d.toISOString().slice(0, 10), // แปลงวันที่เป็นข้อความ "YYYY-MM-DD"
  addD = (s, n) => { const d = new Date(s); d.setDate(d.getDate() + n); return iso(d); }; // บวก/ลบวัน: รับ "YYYY-MM-DD" กับจำนวนวัน n คืนวันใหม่ในรูปแบบเดียวกัน
let store; // ที่เก็บค่าในเบราว์เซอร์
try { store = localStorage; } catch (e) { store = { getItem() {}, setItem() {} }; } // ใช้ localStorage ถ้าได้ ถ้าถูกบล็อกให้ใช้ตัวปลอมที่ไม่ทำอะไร (กันโปรแกรมพัง)
const cfg = () => AUTO // ฟังก์ชันคืนค่าการเชื่อมต่อปัจจุบัน
  ? { u: CONFIG.url.replace(/\/$/, ''), k: CONFIG.key, l: CONFIG.logo } // โหมดอัตโนมัติ: ใช้ค่าใน CONFIG (ตัด / ท้าย URL)
  : { u: (store.getItem('sb_u') || '').replace(/\/$/, ''), k: store.getItem('sb_k') || '', l: store.getItem('sb_l') || '' }; // โหมดกรอกเอง: อ่านค่าที่ผู้ใช้บันทึกไว้ใน localStorage

const san = v => typeof v === 'string' // ล้างข้อมูล (sanitize) กันการแทรก HTML/สคริปต์
  ? v.replace(/[<>"'`]/g, '’') // ข้อความ: แทนอักขระอันตราย < > " ' ` ด้วย ’
  : Array.isArray(v) ? v.map(san) // อาร์เรย์: ล้างทีละสมาชิก (เรียกซ้ำ)
  : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, san(x)])) // อ็อบเจ็กต์: ล้างทุกค่าในนั้น (เรียกซ้ำ)
  : v; // ชนิดอื่น (ตัวเลข, null, boolean) ปล่อยผ่าน

// ---------- ส่วนที่ C: ดึงข้อมูลจากตาราง (เดิมบรรทัด 235–245) ----------
async function get(t, a, b) { // ดึงตาราง hospital_<t>_stats ช่วงวันที่ a..b (ครั้งละ 1000 แถวจนครบ)
  const c = cfg(), out = []; let ord = 'key_id'; // c = ค่าเชื่อมต่อ, out = ผลรวมทุกหน้า, ord = คอลัมน์ที่ใช้เรียง // เรียงตาม key_id ก่อน ถ้าตารางไม่มีคอลัมน์นี้ (HTTP 400) จะถอยไปเรียงตามวันที่
  for (let o = 0; ; o += 1000) { // วนทีละหน้า: o = ตำแหน่งแถวเริ่มต้น (0, 1000, 2000, …)
    const u = od => `${c.u}/rest/v1/hospital_${t}_stats?select=*&record_date=gte.${a}&record_date=lte.${b}&order=${od}`, // สร้าง URL: เลือกทุกคอลัมน์, วันที่ ≥ a และ ≤ b, เรียงตาม od
      hd = { headers: { apikey: c.k, Authorization: 'Bearer ' + c.k, 'Range-Unit': 'items', Range: `${o}-${o + 999}` } }; // header: คีย์ + ขอแถวที่ o ถึง o+999 (ส่วน Authorization ตัวกลางไม่ใช้)
    let r = await fetch(u(ord), hd); // เรียกดึงข้อมูลหน้านี้
    if (r.status === 400 && ord === 'key_id') { ord = 'record_date'; r = await fetch(u(ord), hd); } // ถ้า 400 เพราะไม่มี key_id → เปลี่ยนไปเรียงตามวันที่แล้วเรียกใหม่ // ตารางผู้ป่วยในอาจไม่มี key_id ทำให้เดิมโหลดไม่ได้และแสดงว่าไม่พบข้อมูล
    if (!r.ok) { // ถ้าตอบไม่สำเร็จ (ไม่ใช่ 2xx)
      let m = ''; // ข้อความข้อผิดพลาดจากเซิร์ฟเวอร์
      try { m = (await r.text()).replace(/\s+/g, ' ').slice(0, 160); } catch (e) {} // อ่านข้อความ ย่อช่องว่าง และตัดไม่เกิน 160 ตัวอักษร
      throw new Error(`${t}: HTTP ${r.status}${m ? ' — ' + m : ''}`); // โยนข้อผิดพลาดบอกชื่อตาราง สถานะ และรายละเอียด
    } // จบการจัดการข้อผิดพลาด
    const j = san(await r.json()); out.push(...j); // แปลงผลเป็น JSON ล้างอักขระอันตราย แล้วต่อท้ายผลรวม
    if (j.length < 1000) break; // ถ้าได้น้อยกว่า 1000 แถว = หน้าสุดท้าย หยุดวน
  } // จบ for
  return out; // คืนแถวทั้งหมด
} // จบ get

// ---------- ส่วนที่ D: โหลดข้อมูลและวาดหน้าจอ (เดิมบรรทัด 655–689) ----------
async function load() { // ฟังก์ชันหลักของแดชบอร์ด: ดึงข้อมูลช่วงที่เลือก + ช่วงก่อนหน้า แล้ววาด
  const a = $('#from').value, b = $('#to').value; // a = วันที่เริ่ม, b = วันที่สิ้นสุด จากช่องกรอกวันที่
  if (!a || !b || a > b) { $('#msg').textContent = 'เลือกช่วงวันที่ให้ถูกต้อง'; return; } // ถ้าว่าง หรือเริ่มหลังสิ้นสุด → แจ้งเตือนแล้วหยุด
  tip.style.display = 'none'; // ซ่อนกล่องคำอธิบายลอย (tooltip) ของกราฟ
  const len = Math.max(1, Math.round((new Date(b) - new Date(a)) / 864e5) + 1), // len = จำนวนวันในช่วงที่เลือก (อย่างน้อย 1; 864e5 = มิลลิวินาทีต่อวัน)
    pa = addD(a, -len), // pa = วันเริ่มของ "ช่วงก่อนหน้า" ที่ยาวเท่ากัน
    pb = addD(a, -1), // pb = วันสุดท้ายของช่วงก่อนหน้า (ก่อนวันเริ่ม 1 วัน)
    c = cfg(), // ค่าเชื่อมต่อปัจจุบัน
    live = c.u && c.k; // live = มี url และ key ครบ → ใช้ข้อมูลจริง ไม่งั้นใช้ข้อมูลตัวอย่าง
  CMP = { len, pa, pb }; // เก็บข้อมูลช่วงเปรียบเทียบไว้ให้ส่วนวาดใช้ (ตัวแปรโกลบอลประกาศที่อื่น)
  $('#msg').textContent = live ? 'กำลังโหลดข้อมูล…' : 'กำลังแสดงข้อมูลตัวอย่าง — แก้ CONFIG ในไฟล์ หรือกด "ตั้งค่า" เพื่อเชื่อมต่อ Supabase'; // แสดงสถานะตามโหมด
  try { // ดักข้อผิดพลาดการโหลด/วาด
    let all; // ตัวแปรเก็บข้อมูลทุกตาราง (ช่วงก่อนหน้า + ปัจจุบัน)
    if (live) { // โหมดเชื่อมต่อฐานข้อมูลจริง
      const r = await Promise.all(TB.map(t => get(t, pa, b))); // ดึงตารางหลักทั้งหมดพร้อมกัน ตั้งแต่ต้นช่วงก่อนหน้าถึงสิ้นช่วงปัจจุบัน
      all = {}; // อ็อบเจ็กต์เก็บข้อมูลทุกตาราง
      TB.forEach((t, i) => all[t] = r[i]); // จับคู่ชื่อตารางกับข้อมูลที่ดึงมา
      IPDERR = {}; // ล้างรายการข้อผิดพลาดของตารางผู้ป่วยใน
      for (const t of ['ward', 'ipd_pttype', 'bed_occupancy']) { // [เพิ่มใหม่] วนดึงตารางผู้ป่วยในทีละตาราง (แยกจากตารางหลัก)
        try { all[t] = await get(t, pa, b); } // ดึงจาก hospital_ward_stats / hospital_ipd_pttype_stats / hospital_bed_occupancy_stats
        catch (e) { all[t] = []; IPDERR[t] = e.message; } // ถ้าอ่านไม่ได้ ต้องไม่ทำให้ทั้งแดชบอร์ดพัง (การ์ดจะแสดงข้อความเตือนเอง)
      } // จบการวน
      $('#msg').textContent = ''; // ล้างข้อความสถานะ "กำลังโหลด"
    } // จบโหมดจริง
    else all = demo(pa, b); // โหมดข้อมูลตัวอย่าง: สร้างข้อมูลสุ่มแทน
    const cut = (o, f) => { const x = {}; TB.forEach(t => x[t] = o[t].filter(f)); return x; }; // ตัวช่วยกรอง: คืนข้อมูลตารางหลักทุกตารางที่ผ่านเงื่อนไข f
    const cc = cut(all, r => r.record_date >= a && r.record_date <= b); // cc = ข้อมูล "ช่วงปัจจุบัน" (กรองวันที่อยู่ระหว่าง a..b)
    const sel = (rows, x, y) => rows ? rows.filter(r => r.record_date >= x && r.record_date <= y) : []; // [เพิ่มใหม่] กรองช่วงวันที่ของตารางผู้ป่วยใน (ไม่มีข้อมูล = อาร์เรย์ว่าง)
    cc.ward = sel(all.ward, a, b); // [เพิ่มใหม่] ข้อมูลหอผู้ป่วยช่วงปัจจุบัน
    cc.bed_occupancy = sel(all.bed_occupancy, a, b); // ข้อมูลเตียงรายหอ จาก hospital_bed_occupancy_stats
    cc.ipd_pttype = sel(all.ipd_pttype, a, b); // [เพิ่มใหม่] ข้อมูลสิทธิผู้ป่วยในช่วงปัจจุบัน
    const have = new Set(cc.daily.map(r => r.record_date)).size; // นับจำนวนวันที่มีข้อมูลจริง (Set กันวันซ้ำ)
    const pv = cut(all, r => r.record_date >= pa && r.record_date <= pb); // pv = ข้อมูล "ช่วงก่อนหน้า" ไว้เปรียบเทียบ
    pv.ward = sel(all.ward, pa, pb); // [เพิ่มใหม่] ข้อมูลหอผู้ป่วยช่วงก่อนหน้า
    pv.bed_occupancy = sel(all.bed_occupancy, pa, pb); // ข้อมูลเตียงรายหอช่วงก่อนหน้า
    pv.ipd_pttype = sel(all.ipd_pttype, pa, pb); // [เพิ่มใหม่] ข้อมูลสิทธิผู้ป่วยช่วงก่อนหน้า
    LAST = [cc, pv, a, b]; render(cc, pv, a, b); // จำข้อมูลล่าสุดไว้ (ให้ส่วนอื่นวาดซ้ำได้) แล้ววาดทั้งหน้าจอ
    xtra(); // ส่วนเพิ่ม: รายงานรายเดือน / KPI / รับ–จำหน่ายรายวอร์ด
    banner(a, b, pa, pb, len, document.querySelector('[data-d="7"]').classList.contains('on'), have); // แสดงแถบสรุปช่วงวันที่ (ส่งธงว่าปุ่ม "7 วัน" ถูกเลือกอยู่หรือไม่)
    window.v3sync && v3sync(b); // ถ้ามีฟังก์ชันซิงก์ของฉาก 3D ให้เรียกเพื่อปรับวันที่ให้ตรงกัน
  } catch (e) { $('#msg').textContent = (AUTO ? 'ไม่สามารถโหลดข้อมูลได้ในขณะนี้ กรุณาลองใหม่ภายหลัง' : 'โหลดข้อมูลไม่สำเร็จ: ' + e.message + ' — ตรวจ URL, key และสิทธิ์อ่านตาราง (RLS policy)'); } // ถ้าพลาด: โหมดอัตโนมัติแสดงข้อความสั้น (ไม่เผยรายละเอียด) โหมดกรอกเอง แสดงสาเหตุ
} // จบ load

// ---------- ส่วนที่ E: โลโก้ / วันที่ล่าสุด / ปุ่มช่วงเวลา / ปุ่มต่างๆ (เดิมบรรทัด 690–698) ----------
function logo() { // ใส่โลโก้ในหัวเว็บ
  const l = cfg().l; // ลิงก์โลโก้จากการตั้งค่า
  $('#logo').innerHTML = l ? `<img src="${l.replace(/"/g, '')}" alt="โลโก้" onerror="this.parentNode.textContent='✚'">` : '✚'; // มีลิงก์ → ใส่รูป (ตัด " กัน HTML แทรก, รูปเสียให้กลับเป็น ✚) ไม่มี → แสดง ✚
} // จบ logo
async function latestDay() { // หาวันที่ล่าสุดที่มีข้อมูลในฐานข้อมูล
  const c = cfg(); // ค่าเชื่อมต่อ
  if (!c.u || !c.k) return iso(new Date()); // ไม่ได้เชื่อมต่อ → ใช้วันนี้
  try { // ถ้าเรียกพลาดให้ใช้วันนี้
    const r = await fetch(`${c.u}/rest/v1/hospital_daily_stats?select=record_date&order=record_date.desc&limit=1`, { headers: { apikey: c.k, Authorization: 'Bearer ' + c.k } }); // ขอแถวเดียวที่ record_date มากที่สุด
    if (!r.ok) return iso(new Date()); // ตอบไม่สำเร็จ → วันนี้
    const j = await r.json(); // แปลงผลเป็น JSON
    return j[0] && /^\d{4}-\d{2}-\d{2}$/.test(j[0].record_date) ? j[0].record_date : iso(new Date()); // มีแถวและรูปแบบวันที่ถูกต้อง → ใช้ค่านั้น ไม่งั้นใช้วันนี้
  } catch (e) { return iso(new Date()); } // เกิดข้อผิดพลาด → วันนี้
} // จบ latestDay
async function setRange(n, btn) { // ตั้งช่วงวันที่ตามปุ่มที่กด (n = จำนวนวันย้อนหลัง, btn = ปุ่มที่ถูกกด)
  document.querySelectorAll('[data-d]').forEach(x => x.classList.toggle('on', x === btn)); // ไฮไลต์เฉพาะปุ่มที่กด (เปิด class "on" ที่ปุ่มนั้น ปิดที่ปุ่มอื่น)
  const t = n === -1 ? new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' }) // n=-1 ("วันนี้"): ใช้วันที่ปัจจุบันตามเวลาไทย (รูปแบบ en-CA = YYYY-MM-DD)
    : (n && n <= 30 ? await latestDay() : iso(new Date())); // ช่วงสั้น (≤30 วัน) ใช้วันล่าสุดที่มีข้อมูล ช่วงยาว/ปีนี้ ใช้วันนี้
  $('#to').value = t; // ใส่วันสิ้นสุด
  $('#from').value = n === -1 ? t : (n ? addD(t, -n + 1) : new Date().getFullYear() + '-01-01'); // วันเริ่ม: "วันนี้" = วันเดียวกัน, มี n = ย้อนหลัง n วัน (รวมวันสิ้นสุด), n=0 ("ปีนี้") = 1 ม.ค. ของปีนี้
  load(); // โหลดและวาดใหม่ // n=-1 คือปุ่ม "วันนี้" (วันที่ปัจจุบันวันเดียว)
} // จบ setRange
document.querySelectorAll('[data-d]').forEach(x => x.onclick = () => setRange(+x.dataset.d, x)); // ผูกปุ่มช่วงเวลาทุกปุ่ม: กดแล้วเรียก setRange ด้วยค่า data-d ของปุ่มนั้น
$('#to').value = iso(new Date()); $('#from').value = addD($('#to').value, -6); // ค่าเริ่มต้นตอนเปิดหน้า: วันสิ้นสุด = วันนี้, วันเริ่ม = ย้อนหลัง 6 วัน (รวม 7 วัน)
$('#go').onclick = () => { document.querySelectorAll('[data-d]').forEach(x => x.classList.remove('on')); load(); }; // ปุ่ม "โหลด": ยกเลิกไฮไลต์ปุ่มช่วงเวลา (เพราะเลือกวันเอง) แล้วโหลด
$('#cfgb').onclick = () => { const c = cfg(); $('#u').value = c.u; $('#k').value = c.k; $('#lg').value = c.l; $('#dlg').showModal(); }; // ปุ่ม "ตั้งค่า": ใส่ค่าปัจจุบันลงในฟอร์ม แล้วเปิดกล่องโต้ตอบ
$('#save').onclick = () => { store.setItem('sb_u', $('#u').value.trim()); store.setItem('sb_k', $('#k').value.trim()); store.setItem('sb_l', $('#lg').value.trim()); $('#dlg').close(); logo(); load(); }; // ปุ่ม "บันทึกและโหลด": เก็บ URL/คีย์/โลโก้ลง localStorage ปิดกล่อง อัปเดตโลโก้ แล้วโหลดข้อมูล
$('#demo').onclick = () => { store.setItem('sb_u', ''); store.setItem('sb_k', ''); $('#dlg').close(); load(); }; // ปุ่ม "ใช้ข้อมูลตัวอย่าง": ล้าง URL/คีย์ที่เก็บไว้ ปิดกล่อง แล้วโหลด (จะเข้าโหมดตัวอย่าง)
