// ============================================================================
// ส่วนที่ 08 — render() วาดทั้งหน้าแดชบอร์ด (เดิมบรรทัด 554–617 ของ index.html)
// หน้าที่: รับข้อมูลช่วงปัจจุบัน (cur) และช่วงก่อนหน้า (prev) → คำนวณตัวเลขสรุป → ประกอบ HTML ทุกการ์ด → ใส่ลง #app
// หมายเหตุ: เดิม innerHTML เป็นนิพจน์ยาวต่อกันด้วย + ชุดเดียว ตอนนี้แตกเป็นตัวแปรต่อการ์ด (s1, s2, ...) เพื่อ comment ได้ทุกบรรทัด
//          ลำดับการ์ดและเนื้อ HTML เท่าเดิมทุกตัวอักษร
// ============================================================================

function render(cur, prev, a, b) { // cur/prev = ข้อมูลช่วงปัจจุบัน/ก่อนหน้า (อ็อบเจ็กต์ของแต่ละตาราง), a/b = วันเริ่ม/สิ้นสุด
  SHORT = (new Date(b) - new Date(a)) / 864e5 <= 13; // SHORT = true ถ้าช่วงที่เลือกไม่เกิน 14 วัน (ใช้ปรับการแสดงผลกราฟ)
  const d = cur.daily; // d = ข้อมูลรายวันช่วงปัจจุบัน
  const pd = prev.daily; // pd = ข้อมูลรายวันช่วงก่อนหน้า (ไว้เทียบแนวโน้ม)
  const days = d.length || 1; // days = จำนวนวันที่มีข้อมูล (อย่างน้อย 1 กันหารศูนย์)
  const span = (new Date(b) - new Date(a)) / 864e5; // span = ความยาวช่วงที่เลือก (วัน)
  const ser = (rows, f) => group(rows, r => r.record_date, f).sort((x, y) => x[0] < y[0] ? -1 : 1); // ser = ทำอนุกรมเวลา [วันที่, ค่า] เรียงจากเก่าไปใหม่ (ใช้วาด sparkline)
  const erR = cur.hourly.filter(r => r.patient_type === 'ER'); // erR = แถวรายชั่วโมงเฉพาะผู้ป่วย ER ช่วงปัจจุบัน
  const erP = prev.hourly.filter(r => r.patient_type === 'ER'); // erP = แถว ER ช่วงก่อนหน้า
  const opd = sum(d, r => r.opd_daily_count); // opd = ผู้ป่วยนอกรวม
  const adm = sum(d, r => r.ipd_new_admit_daily); // adm = ผู้ป่วยในรับใหม่รวม
  const dis = sum(d, r => r.ipd_discharged_daily); // dis = ผู้ป่วยในจำหน่ายรวม
  const er = sum(erR, r => r.service_count); // er = ผู้ป่วยฉุกเฉินรวม
  const BO = bedStats(cur.bed_occupancy); // BO = สรุปเตียงรายหอ ช่วงปัจจุบัน (จาก hospital_bed_occupancy_stats)
  const BOp = bedStats(prev.bed_occupancy); // BOp = สรุปเตียงรายหอ ช่วงก่อนหน้า
  const hasB = BO.T > 0; // hasB = true ถ้าตารางเตียงรายหอมีข้อมูลเตียง (ถ้าไม่มีใช้ค่าจาก daily เดิม)
  const lastBeds = rs => { // lastBeds = หาจำนวนเตียงทั้งหมดล่าสุดจากตารางรายวัน (rs = แถวรายวัน)
    const r = (rs || []).filter(x => +x.ipd_total_beds > 0).reduce((m, x) => !m || String(x.record_date) > String(m.record_date) ? x : m, null); // r = แถวที่มีเตียง>0 และวันที่ล่าสุด (ไม่มีเป็น null)
    return r ? +r.ipd_total_beds : 0; // มีแถว -> คืนจำนวนเตียง, ไม่มี -> 0
  }; // เตียงทั้งหมด = ค่าล่าสุดของ ipd_total_beds ในช่วงที่เลือก
  const tot = lastBeds(d) || (hasB ? BO.T : 0); // tot = เตียงทั้งหมด (ใช้จาก daily ก่อน ถ้าไม่มีใช้จากตารางรายหอ)
  const used = hasB ? BO.U : (avg(d, r => r.ipd_current_beds) || 0); // used = เตียงที่ใช้งาน (ตารางรายหอก่อน ไม่มีใช้ค่าเฉลี่ยจาก daily)
  const occ = tot ? used / tot * 100 : 0; // occ = อัตราครองเตียง (%)
  const pt = lastBeds(pd) || (BOp.T > 0 ? BOp.T : 0); // pt = เตียงทั้งหมดช่วงก่อนหน้า
  const pocc = pt ? (BOp.T > 0 ? BOp.U : (avg(pd, r => r.ipd_current_beds) || 0)) / pt * 100 : 0; // pocc = อัตราครองเตียงช่วงก่อนหน้า (%)
  const wait = avg(d, r => r.avg_wait_for_doctor); // wait = เวลารอพบแพทย์เฉลี่ย (นาที)
  const consult = avg(d, r => r.avg_doctor_consult_time); // consult = เวลาตรวจกับแพทย์เฉลี่ย (นาที)
  const los = avg(d, r => r.ipd_avg_length_of_stay); // los = วันนอนเฉลี่ย
  const iO = sum(d, r => r.opd_his_income); // iO = รายรับ OPD รวม (บาท)
  const iI = sum(d, r => r.ipd_his_discharge_income); // iI = รายรับ IPD รวม (บาท)
  const iE = sum(d, r => r.er_his_income); // iE = รายรับ ER รวม (บาท)
  const inc = iO + iI; // inc = รายรับรวม (OPD+IPD)
  const pinc = sum(pd, r => r.opd_his_income) + sum(pd, r => r.ipd_his_discharge_income); // pinc = รายรับรวมช่วงก่อนหน้า
  const readmit = avg(d, r => r.readmit_28days_pct); // readmit = % กลับมานอนซ้ำภายใน 28 วัน (เฉลี่ย)
  const proc = avg(d, r => r.avg_total_process_time); // proc = เวลารวมทั้งกระบวนการ OPD เฉลี่ย (นาที)
  const keyf = span > 62 ? (s => s.slice(0, 7)) : (s => s); // keyf = ฟังก์ชันสร้างคีย์แกน x: ช่วงเกิน 62 วันรวมเป็นรายเดือน (YYYY-MM) ไม่เกินใช้รายวัน
  const keys = [...new Set(d.map(r => keyf(r.record_date)))].sort(); // keys = รายการคีย์แกน x ไม่ซ้ำ เรียงจากเก่าไปใหม่
  const mv = (rows, f) => keys.map(k => sum(rows.filter(r => keyf(r.record_date) === k), f)); // mv = รวมค่า f ของแต่ละคีย์ในแกน x (ใช้ทำชุดข้อมูลกราฟแนวโน้ม)
  const flow = [ // flow = ขั้นตอนเวลารอ OPD แต่ละขั้น [ชื่อขั้น, เวลาเฉลี่ย (นาที)]
    ['ลงทะเบียน→คัดกรอง', avg(d, r => r.avg_wait_reg_to_triage)], // ขั้นลงทะเบียน → คัดกรอง
    ['รอพบแพทย์', wait], // ขั้นรอพบแพทย์
    ['ตรวจโดยแพทย์', consult], // ขั้นตรวจโดยแพทย์
    ['รอรับยา', avg(d, r => r.avg_wait_for_pharmacy)], // ขั้นรอรับยา
    ['รวมทั้งกระบวนการ', proc] // เวลารวมทั้งกระบวนการ
  ]; // จบ flow
  const dep = group(cur.department, r => r.department, r => r.visit_count).slice(0, 10); // dep = ผู้ป่วยตามแผนก 10 อันดับแรก
  const tri = group(cur.er_triage, r => r.triage_level_name, r => r.patient_count).sort((x, y) => x[0] < y[0] ? -1 : 1); // tri = จำนวนผู้ป่วย ER ตามระดับ triage เรียงตามชื่อระดับ
  const trT = sum(tri, r => r[1]) || 1; // trT = ผู้ป่วย triage รวม (ใช้คิด % อย่างน้อย 1 กันหารศูนย์)
  const dr = {}; // dr = สรุปรายแพทย์ (คีย์ = รหัสแพทย์)
  cur.doctor_clinic.forEach(r => { // วนทุกแถวผลงานแพทย์/คลินิก
    const o = dr[r.doctor_code] || (dr[r.doctor_code] = { n: r.doctor_name, c: r.clinic_name, v: 0, p: 0, a: 0 }); // o = ตัวสะสมของแพทย์คนนี้ (สร้างใหม่ถ้ายังไม่มี: ชื่อ, คลินิก, ครั้ง, คน, admit)
    o.v += num(r.visit_count); // บวกจำนวนครั้งที่ตรวจ
    o.p += num(r.patient_count); // บวกจำนวนผู้ป่วย (คน)
    o.a += num(r.admit_count); // บวกจำนวน admit
  }); // จบการสะสมรายแพทย์
  const drs = Object.values(dr).sort((x, y) => y.v - x.v).slice(0, 8); // drs = แพทย์ 8 อันดับแรกตามจำนวนครั้ง
  const pay = group(cur.pttype, r => r.pttype_name, r => r.his_income); // pay = รายรับตามสิทธิการรักษา [ชื่อสิทธิ, รายรับ]
  const payT = sum(pay, r => r[1]) || 1; // payT = รายรับรวมทุกสิทธิ (ใช้คิด %)
  const al = [ // al = ตารางแจ้งเตือน [เรื่อง, ค่าปัจจุบัน, เป้าหมาย, หน่วย]
    ['อัตราการครองเตียง', occ, TARGET.occ, '%'], // อัตราครองเตียง เทียบเป้า
    ['เวลารอพบแพทย์', wait, TARGET.wait, ' นาที'], // เวลารอพบแพทย์ เทียบเป้า
    ['ระยะเวลาตรวจแพทย์', consult, TARGET.consult, ' นาที'], // เวลาตรวจแพทย์ เทียบเป้า
    ['Readmit 28 วัน', readmit, TARGET.readmit, '%'], // Readmit 28 วัน เทียบเป้า
    ['เวลารวมทั้งกระบวนการ OPD', proc, TARGET.total, ' นาที'] // เวลารวมกระบวนการ เทียบเป้า
  ]; // จบ al
  const deep = deepCharts(cur, d, keys, keyf, erR); // deep = HTML การ์ดกราฟเชิงลึก (สร้างในส่วน 05)
  const gcol = occ > TARGET.occ ? '#e2563c' : '#14a3a8'; // gcol = สีของกราฟครองเตียง: เกินเป้าแดง, ปกติเขียวน้ำทะเล

  // ---------- การ์ดที่ 1: ภาพรวมโรงพยาบาล ----------
  const kpis = // kpis = ชุดการ์ด KPI เล็กๆ ในภาพรวม (ต่อกันด้วย +)
    kpi('OPD ผู้ป่วยนอก', fm(opd), 'ครั้ง', opd, sum(pd, r => r.opd_daily_count), 0, ser(d, r => r.opd_daily_count)) + // KPI ผู้ป่วยนอก
    kpi('IPD รับไว้รักษา', fm(adm), 'ราย', adm, sum(pd, r => r.ipd_new_admit_daily), 0, ser(d, r => r.ipd_new_admit_daily), '#2f9e6b') + // KPI รับไว้รักษา (สีเขียว)
    kpi('ER ผู้ป่วยฉุกเฉิน', fm(er), 'ครั้ง', er, sum(erP, r => r.service_count), 0, ser(erR, r => r.service_count), '#e2563c') + // KPI ER (สีแดง)
    kpi('จำหน่ายผู้ป่วยใน', fm(dis), 'ราย', dis, sum(pd, r => r.ipd_discharged_daily), 0, ser(d, r => r.ipd_discharged_daily), '#7c6bd6') + // KPI จำหน่าย (สีม่วง)
    kpi('เวลารอพบแพทย์', fm(wait, 1), 'นาที', wait, avg(pd, r => r.avg_wait_for_doctor), 1, ser(d, r => r.avg_wait_for_doctor), '#e9a23b') + // KPI เวลารอ (สีส้ม)
    kpi('ระยะเวลาตรวจแพทย์', fm(consult, 1), 'นาที', consult, avg(pd, r => r.avg_doctor_consult_time), 1, ser(d, r => r.avg_doctor_consult_time), '#0b7a8a') + // KPI เวลาตรวจ (สีน้ำเงินเขียว)
    kpi('วันนอนเฉลี่ย', fm(los, 1), 'วัน', los, avg(pd, r => r.ipd_avg_length_of_stay), 1, ser(d, r => r.ipd_avg_length_of_stay), '#7c6bd6') + // KPI วันนอนเฉลี่ย (สีม่วง)
    kpi('รายได้รวม', fm(inc), 'บาท', inc, pinc, 0, ser(d, r => num(r.opd_his_income) + num(r.ipd_his_discharge_income))); // KPI รายได้รวม
  const s1 = sec(1, 'ภาพรวมโรงพยาบาล', 'Hospital KPI Summary', // s1 = การ์ดภาพรวม (หัวข้อ, ชื่ออังกฤษ, เนื้อหาด้านล่าง, ความกว้าง w12)
    `<div class="hero"><div class="gauge"><small>อัตราครองเตียง</small>` + // เปิดกล่องภาพรวม + กล่องมาตรวัด + หัวข้อเล็ก
    donut([['เตียงที่ครอง', occ], ['เตียงว่าง', Math.max(100 - occ, 0)]], [gcol, '#ffffff26'], fm(occ, 0) + '%', 160, { dark: 1, sub: 'ครองเตียง', target: TARGET.occ, label: 'อัตราครองเตียง' }) + // โดนัทอัตราครองเตียง (พื้นเข้ม มีเส้นเป้าหมาย)
    `<small style="margin-top:4px">${fm(used)} / ${fm(tot)} เตียง</small>` + // ข้อความ "ใช้อยู่ / ทั้งหมด เตียง"
    `<small style="color:${occ > TARGET.occ ? '#ff9d8a' : '#7fe0c0'};opacity:1;margin-top:2px">${occ > TARGET.occ ? '▲ เกินเป้า' : '● อยู่ในเกณฑ์'} (เป้า ≤ ${TARGET.occ}%)</small></div>` + // สถานะเทียบเป้า (เกินเป้าสีแดงอ่อน / อยู่ในเกณฑ์สีเขียวอ่อน) แล้วปิดกล่องมาตรวัด
    `<div class="kp">${kpis}</div></div>`, // กล่องการ์ด KPI ทั้งหมด แล้วปิดกล่องภาพรวม
    'w12'); // การ์ดกว้างเต็มแถว

  // ---------- การ์ด B: อาคาร 3 มิติ (กล่องว่าง b3host ให้ส่วน 14 มาเติม) ----------
  const sB = sec('B', 'อาคารโรงพยาบาล 3 มิติ', 'Hospital Campus 3D · 7.3874°N 99.6671°E', '<div id="b3host"></div>', 'w12'); // sB = การ์ดอาคาร 3 มิติ (กล่องว่างรอเติมภายหลัง)

  // ---------- การ์ดที่ 2: แนวโน้มจำนวนผู้ป่วย ----------
  const s2 = sec(2, 'แนวโน้มจำนวนผู้ป่วย', 'Patient Volume Trend', // s2 = การ์ดแนวโน้มจำนวนผู้ป่วย
    keys.length // ถ้ามีข้อมูลแกน x
      ? chart(keys, [ // วาดกราฟเส้นหลายชุด
        { n: 'OPD', c: '#0b7a8a', u: ' ครั้ง', v: mv(d, r => r.opd_daily_count) }, // ชุด OPD
        { n: 'IPD รับใหม่', c: '#2f9e6b', u: ' ราย', v: mv(d, r => r.ipd_new_admit_daily) }, // ชุด IPD รับใหม่
        { n: 'ER', c: '#e2563c', u: ' ครั้ง', v: mv(erR, r => r.service_count) } // ชุด ER
      ], null, 'ผลรวมทั้งเดือน') // ไม่ระบุเป้า, ข้อความอธิบายค่า
      : '<div class="nd">ไม่มีข้อมูล</div>', // ไม่มีข้อมูล -> แสดงข้อความแทน
    'w6'); // การ์ดครึ่งแถว

  // ---------- การ์ดที่ 3: ผู้ป่วยตามแผนก ----------
  const s3 = sec(3, 'ผู้ป่วยตามแผนก', 'Patient by Department', bars(dep), 'w6'); // s3 = การ์ดแผนก (กราฟแท่งแนวนอน 10 อันดับ)

  // ---------- การ์ดที่ 4: ระยะเวลารอ OPD ----------
  const s4 = sec(4, 'ระยะเวลารอ OPD', 'OPD Flow & Waiting Time', nowStamp(a, b) + bars(flow.map(f => [f[0], f[1] || 0, PAL[0]]), ' นาที')); // s4 = การ์ดเวลารอ: เวลาปัจจุบัน + กราฟแท่งแต่ละขั้น (ไม่ระบุความกว้าง)

  // ---------- การ์ดที่ 5: บริหารเตียงผู้ป่วยใน ----------
  const s5 = sec(5, 'บริหารเตียงผู้ป่วยใน', 'IPD & Bed Management', // s5 = การ์ดบริหารเตียง
    `<div class="dn2">` + // เปิดกล่องโดนัท+ตัวเลข
    donut([['เตียงที่ครอง', used], ['เตียงว่าง', Math.max(tot - used, 0)]], [gcol, '#c9d6e2'], fm(occ, 0) + '%', 132, { sub: 'ครองเตียง', target: TARGET.occ, label: 'อัตราครองเตียง', fmtv: v => fm(v) + ' เตียง' }) + // โดนัทเตียงครอง/ว่าง
    `<div style="flex:1;min-width:150px"><div style="color:var(--mut);font-size:12px">เตียงทั้งหมด</div><b style="font-size:24px">${fm(tot)}</b>` + // กล่องข้อความ: เตียงทั้งหมด
    dlegend([['ครอง', used], ['ว่าง', Math.max(tot - used, 0)]], [gcol, '#c9d6e2'], v => fm(v)) + // คำอธิบายสีของโดนัท
    `</div></div>` + // ปิดกล่องข้อความและกล่องโดนัท
    `<table style="margin-top:8px"><tr><th>รับใหม่</th><th>จำหน่าย</th><th>วันนอนเฉลี่ย</th></tr><tr><td>${fm(adm)}</td><td>${fm(dis)}</td><td>${fm(los, 1)} วัน</td></tr></table>` + // ตารางสรุป รับใหม่/จำหน่าย/วันนอนเฉลี่ย
    wardBedHtml(cur.bed_occupancy, IPDERR.bed_occupancy)); // ตารางการครองเตียงรายหอ (ส่วน 07) พร้อมข้อความ error ถ้ามี

  // ---------- การ์ดที่ 6: งานอุบัติเหตุฉุกเฉิน ----------
  const triColors = ['#e2563c', '#f08a3c', '#e9a23b', '#2f9e6b', '#8aa0b3']; // triColors = สีของแต่ละระดับ triage (วนซ้ำถ้ามีเกิน 5 ระดับ)
  const s6 = sec(6, 'งานอุบัติเหตุฉุกเฉิน', 'Emergency Department', // s6 = การ์ด ER
    `<div class="kp" style="grid-template-columns:1fr 1fr">` + // เปิดกล่อง KPI 2 คอลัมน์
    kpi('ผู้ป่วย ER', fm(er), 'ครั้ง', er, sum(erP, r => r.service_count), 0) + // KPI ผู้ป่วย ER รวม (เทียบช่วงก่อน)
    kpi('เฉลี่ยต่อวัน', fm(er / days, 1), 'ครั้ง', 0, 0) + // KPI ER เฉลี่ยต่อวัน
    `</div><p style="margin:12px 0 2px;font-weight:600">ระดับความเร่งด่วน (Triage)</p>` + // ปิดกล่อง KPI และใส่หัวข้อ Triage
    bars(tri.map((t, i) => [t[0] + ' (' + fm(t[1] / trT * 100, 0) + '%)', t[1], triColors[i % 5]]))); // กราฟแท่งแต่ละระดับ triage พร้อม % และสีตามลำดับ

  // ---------- การ์ดที่ 7: ผลปฏิบัติงานแพทย์/คลินิก ----------
  const s7 = sec(7, 'ผลปฏิบัติงานแพทย์/คลินิก', 'Doctor & Clinic Performance', // s7 = การ์ดแพทย์/คลินิก
    drs.length // ถ้ามีข้อมูลแพทย์
      ? `<table><tr><th>แพทย์ / คลินิก</th><th>ครั้ง</th><th>คน</th><th>Admit</th></tr>` + // เปิดตาราง + หัวตาราง
      drs.map(r => `<tr><td><b>${r.n || '-'}</b><br><small style="color:#5d7186">${r.c || ''}</small></td><td>${fm(r.v)}</td><td>${fm(r.p)}</td><td>${fm(r.a)}</td></tr>`).join('') + // แถวของแพทย์แต่ละคน: ชื่อ+คลินิก, ครั้ง, คน, admit
      `</table>` // ปิดตาราง
      : '<div class="nd">ไม่มีข้อมูล</div>'); // ไม่มีข้อมูล -> แสดงข้อความแทน

  // ---------- การ์ดที่ 8: วิเคราะห์รายได้ ----------
  const s8 = sec(8, 'วิเคราะห์รายได้', 'Financial & Revenue Analysis', // s8 = การ์ดรายได้
    `<div class="dn2">` + // เปิดกล่องโดนัท
    donut([['OPD', iO - iE], ['IPD', iI], ['ER', iE]], PAL, fm(inc), 132, { sub: 'บาท', label: 'สัดส่วนรายได้', fmtv: v => fm(v) + ' บาท' }) + // โดนัทสัดส่วนรายได้ (OPD หักส่วน ER ออก)
    dlegend([['OPD', iO - iE], ['IPD', iI], ['ER', iE]], PAL, v => fm(v) + ' บาท') + // คำอธิบายสีของโดนัท
    `</div><p style="margin:12px 0 2px;font-weight:600">ตามสิทธิการรักษา (OPD)</p>` + // ปิดกล่องโดนัท + หัวข้อสิทธิ
    bars(pay.slice(0, 5).map(p => [p[0], p[1] / payT * 100, '#2f9e6b']), '%')); // กราฟแท่ง 5 สิทธิแรกเป็น %

  // ---------- การ์ดที่ 9: คุณภาพบริการ ----------
  const s9 = sec(9, 'คุณภาพบริการ', 'Quality', // s9 = การ์ดคุณภาพ
    `<div class="kp" style="grid-template-columns:1fr">` + // เปิดกล่อง KPI 1 คอลัมน์
    kpi('อัตรากลับมารักษาซ้ำภายใน 28 วัน', fm(readmit, 1), '%', readmit, avg(pd, r => r.readmit_28days_pct), 1, ser(d, r => r.readmit_28days_pct), '#e9a23b') + // KPI readmit 28 วัน
    `</div><p class="nd">ความพึงพอใจผู้ป่วยยังไม่มีข้อมูล — เพิ่มตารางแบบสำรวจเพื่อแสดงส่วนนี้</p>`); // ปิดกล่องและแจ้งว่ายังไม่มีข้อมูลความพึงพอใจ

  // ---------- การ์ด 8.1 [เพิ่มใหม่]: รายรับแยกตามแผนก/หอผู้ป่วย/สิทธิ ----------
  const s81 = sec('8.1', 'รายรับแยกตามแผนก หอผู้ป่วย และสิทธิการรักษา', 'Revenue by Department, Ward & Patient Right', '<div id="dpc"></div>', 'w12'); // s81 = การ์ดรายรับ (เป็นกล่องว่าง #dpc แล้ว dpRender() ค่อยเติมเนื้อหา)

  // ---------- การ์ดที่ 10: แจ้งเตือนและสิ่งที่ต้องดำเนินการ ----------
  const s10 = sec(10, 'แจ้งเตือนและสิ่งที่ต้องดำเนินการ', 'Hospital Alert & Action', // s10 = การ์ดแจ้งเตือน
    `<table class="al"><tr><th>เรื่อง</th><th>ค่าปัจจุบัน</th><th>เป้าหมาย</th><th>สถานะ</th></tr>` + // เปิดตาราง + หัวตาราง
    al.map(r => { // วนแต่ละเรื่องที่ต้องเฝ้าระวัง
      const g = r[1] == null ? null : r[1] <= r[2]; // g = ผ่านเกณฑ์หรือไม่ (ไม่มีค่า = null, ค่า ≤ เป้า = true, เกินเป้า = false)
      return `<tr class="${g === false ? 'b' : ''}"><td>${r[0]}</td><td><b>${fm(r[1], 1)}${r[3]}</b></td><td>≤ ${r[2]}${r[3]}</td><td><span class="chip ${g === false ? 'bad' : 'ok'}">${g == null ? '-' : g ? 'ปกติ' : 'ต้องปรับปรุง'}</span></td></tr>`; // แถว: เรื่อง, ค่าปัจจุบัน, เป้า, ป้ายสถานะ (เกินเป้าแถวไฮไลต์ + ป้ายแดง)
    }).join('') + // ต่อทุกแถวเป็นข้อความเดียว
    `</table>`, // ปิดตาราง
    'w12'); // การ์ดกว้างเต็มแถว

  // ---------- ประกอบทุกการ์ดแล้วใส่ลงหน้าจอ ----------
  $('#app').innerHTML = s1 + sB + s2 + s3 + s4 + s5 + s6 + s7 + s8 + s9 + s81 + s10 + deep; // ต่อการ์ดตามลำดับที่แสดง แล้วต่อด้วยกราฟเชิงลึก (deep) ใส่ใน #app
  { // ส่งข้อมูลให้การ์ดอาคาร 3 มิติ: เตียงล่าสุดรายหอผู้ป่วย + ผู้ป่วยนอก/ER ของวันล่าสุดในช่วงที่เลือก
    const bw = {}; // เตียงล่าสุดของแต่ละหอ
    (cur.bed_occupancy || []).forEach(r => { // วนทุกแถวเตียงรายหอ
      const o = bw[r.ward]; // o = แถวที่เก็บไว้แล้วของหอนี้
      if (!o || String(r.record_date) > String(o.record_date)) { // ถ้ายังไม่มี หรือแถวนี้ใหม่กว่า
        bw[r.ward] = r; // เก็บแถวนี้แทน
      } // จบเงื่อนไข
    }); // เลือกแถววันที่ใหม่สุดต่อหอ
    const ld = d.reduce((m, r) => String(r.record_date) > m ? String(r.record_date) : m, ''); // วันล่าสุดในช่วงที่เลือก
    window.__b3data = { // ข้อมูลสำหรับอาคาร 3 มิติ (ส่วน 14 อ่านจากตัวแปรนี้)
      wards: Object.values(bw).map(r => ({ // รายการหอผู้ป่วยพร้อมตัวเลขเตียงล่าสุด
        code: r.ward, // รหัสหอ
        name: r.ward_name, // ชื่อหอ
        total: num(r.total_beds), // เตียงทั้งหมด
        used: num(r.used_beds), // เตียงที่ใช้
        male: num(r.male_count), // ผู้ป่วยชาย
        female: num(r.female_count), // ผู้ป่วยหญิง
        date: r.record_date // วันที่ของข้อมูลแถวนี้
      })), // จบรายการหอ
      opdLast: sum(d.filter(r => r.record_date === ld), r => r.opd_daily_count), // ผู้ป่วยนอกของวันล่าสุด
      erLast: sum(erR.filter(r => r.record_date === ld), r => r.service_count), // ผู้ป่วย ER ของวันล่าสุด
      ld, // วันล่าสุด
      opd, // ผู้ป่วยนอกรวมทั้งช่วง
      er, // ผู้ป่วย ER รวมทั้งช่วง
      date: Object.values(bw).map(r => r.record_date).sort().pop() // วันที่ล่าสุดของข้อมูลเตียง
    }; // ข้อมูลสำหรับอาคาร 3 มิติ
    window.b3Mount && window.b3Mount(); // ถ้ามีฟังก์ชัน b3Mount ให้เรียก: สั่งวาง/อัปเดตการ์ดอาคาร
  } // จบบล็อกส่งข้อมูลให้อาคาร 3 มิติ
  // [เพิ่มใหม่] ส่งข้อมูลแผนก หอผู้ป่วย และสิทธิ (ช่วงปัจจุบัน/ก่อนหน้า) เข้าสู่การ์ด
  DPS = { dept: cur.department || [], pt: cur.pttype || [], ward: cur.ward || [], ipt: cur.ipd_pttype || [] }; // ข้อมูลช่วงปัจจุบัน
  DPQ = { dept: prev.department || [], pt: prev.pttype || [], ward: prev.ward || [], ipt: prev.ipd_pttype || [] }; // ข้อมูลช่วงก่อนหน้า
  dpRender(); // วาดการ์ดลงหน้าจอ
} // จบ render


/* ===== ส่วนเพิ่มตามโครงเว็บสถิติโรงพยาบาล: รายงานรายเดือน / KPI / รับ–จำหน่ายรายวอร์ด (ข้อมูลจาก Supabase) ===== */
// XT = รายการตัวชี้วัดที่เลือกดูในรายงานรายเดือน (ส่วน 09): k=ชื่อคอลัมน์, n=ชื่อแสดง, u=หน่วย, g=วิธีรวม (sum=ผลรวม, avg=เฉลี่ย), d=ทศนิยม
const XT = [
  { k: 'opd_daily_count', n: 'ผู้ป่วยนอก (OPD)', u: 'ครั้ง', g: 'sum' }, // ผู้ป่วยนอก รวมต่อเดือน
  { k: 'ipd_new_admit_daily', n: 'รับใหม่ IPD', u: 'ราย', g: 'sum' }, // รับใหม่ผู้ป่วยใน รวมต่อเดือน
  { k: 'ipd_discharged_daily', n: 'จำหน่าย IPD', u: 'ราย', g: 'sum' }, // จำหน่ายผู้ป่วยใน รวมต่อเดือน
  { k: 'ipd_avg_length_of_stay', n: 'วันนอนเฉลี่ย', u: 'วัน', g: 'avg', d: 1 }, // วันนอนเฉลี่ย (ค่าเฉลี่ย ทศนิยม 1 ตำแหน่ง)
  { k: 'opd_his_income', n: 'รายได้ OPD', u: 'บาท', g: 'sum' }, // รายได้ OPD รวมต่อเดือน
  { k: 'ipd_cash_discharge_income', n: 'รายได้ IPD', u: 'บาท', g: 'sum' } // รายได้ IPD รวมต่อเดือน
]; // จบ XT
let XD = null, xk = XT[0]; // XD = ข้อมูลรายวันที่โหลดแล้วของรายงานรายเดือน (null = ยังไม่โหลด), xk = ตัวชี้วัดที่เลือกอยู่ (เริ่มที่ตัวแรก)
