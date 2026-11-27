// ============================================================================
// ส่วนที่ 07 — เตียง/หอผู้ป่วย (เดิมบรรทัด 523–553 ของ index.html)
// หน้าที่: อ่านจำนวนเตียงจากตาราง hospital_bed_occupancy_stats, สรุปรายหอ, สร้าง HTML ตารางการครองเตียง
// หมายเหตุ: แตกบรรทัดที่เดิมอัดหลายคำสั่งให้เป็นหนึ่งคำสั่งต่อบรรทัด เพื่อ comment ได้ทุกบรรทัด (พฤติกรรมเท่าเดิม)
// ============================================================================

function bedField(r, kind) { // อ่านค่าเตียงจากแถวหอผู้ป่วย: ลองชื่อคอลัมน์ที่พบบ่อยก่อน แล้วค่อยเดาจากคำว่า bed
  // r = แถวข้อมูล 1 แถว, kind = 'tot' (เตียงทั้งหมด) หรืออย่างอื่น (เตียงที่ใช้งาน)
  const list = kind === 'tot' ? BED_TOT : BED_USE; // เลือกรายชื่อคอลัมน์ที่น่าจะใช่ตามชนิดที่ขอ
  for (const k of list) { // วนลองทีละชื่อคอลัมน์
    if (r[k] != null && r[k] !== '' && isFinite(+r[k])) { // ถ้าคอลัมน์นั้นมีค่าและเป็นตัวเลขได้
      return +r[k]; // คืนค่าตัวเลขทันที
    } // จบเงื่อนไข
  } // จบการวนรายชื่อคอลัมน์ที่รู้จัก
  const re = kind === 'tot' // re = รูปแบบชื่อคอลัมน์ที่ "ควรมี" (ใช้เดาเมื่อไม่พบชื่อมาตรฐาน)
    ? /total|all|count|qty|cap|^beds?$/i // กรณีเตียงทั้งหมด: ชื่อมักมี total/all/count/qty/cap หรือ bed(s) เฉยๆ
    : /used|occup|current|census|inuse/i; // กรณีเตียงที่ใช้งาน: ชื่อมักมี used/occup/current/census/inuse
  const ex = kind === 'tot' // ex = รูปแบบชื่อคอลัมน์ที่ "ต้องตัดออก" (กันเดาผิดไปหยิบคอลัมน์ผิดชนิด)
    ? /used|occup|current|rate|pct|percent/i // เตียงทั้งหมด: ตัดชื่อที่เป็นการใช้งาน/อัตรา/เปอร์เซ็นต์
    : /rate|pct|percent|total/i; // เตียงใช้งาน: ตัดชื่อที่เป็นอัตรา/เปอร์เซ็นต์/ยอดรวม
  const k = Object.keys(r).find(k => // หาชื่อคอลัมน์แรกที่เข้าเงื่อนไขทั้งหมดด้านล่าง
    /bed/i.test(k) && // ชื่อต้องมีคำว่า bed
    re.test(k) && // ต้องตรงรูปแบบที่ควรมี
    !ex.test(k) && // ต้องไม่ตรงรูปแบบที่ต้องตัดออก
    r[k] != null && r[k] !== '' && isFinite(+r[k])); // ค่าต้องไม่ว่างและเป็นตัวเลขได้
  return k ? +r[k] : null; // เจอคอลัมน์ -> คืนเป็นตัวเลข, ไม่เจอ -> null
} // จบ bedField

const bedNum = v => v === '' || v == null || isNaN(+v) ? null : +v; // แปลงเป็นตัวเลข ถ้าว่าง/ไม่ใช่ตัวเลขให้เป็น null

function bedStats(rows) { // สรุปเตียงรายหอจาก hospital_bed_occupancy_stats: เตียง=ค่าล่าสุด, ใช้งาน/ชาย/หญิง=เฉลี่ยต่อวัน
  const m = new Map(); // m = แผนที่ ชื่อหอ -> {ชื่อ, แถวทั้งหมดของหอนั้น}
  (rows || []).forEach(r => { // วนทุกแถว (ถ้า rows ว่างหรือ undefined ให้ใช้อาร์เรย์ว่าง)
    const k = r.ward || r.ward_name || 'ไม่ระบุ'; // k = คีย์ของหอ (ใช้ ward ก่อน, ไม่มีใช้ ward_name, ไม่มีเลยใช้ "ไม่ระบุ")
    if (!m.has(k)) { // ถ้ายังไม่เคยเจอหอนี้
      m.set(k, { n: r.ward_name || r.ward || 'ไม่ระบุ', rows: [] }); // สร้างรายการหอใหม่ พร้อมชื่อที่ใช้แสดง และอาร์เรย์แถวว่าง
    } // จบเงื่อนไขสร้างหอใหม่
    m.get(k).rows.push(r); // เก็บแถวนี้ไว้ในหอของมัน
  }); // จบการจัดกลุ่มแถวตามหอ
  const av = (rs, f) => { // av = ฟังก์ชันหาค่าเฉลี่ยของ f(แถว) จากกลุ่มแถว rs
    const v = rs.map(f).filter(x => x != null); // ดึงค่าจากทุกแถว แล้วตัดค่า null ทิ้ง
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; // มีค่า -> ผลรวมหารจำนวน, ไม่มีเลย -> null
  }; // จบ av
  const ws = [...m.values()].map(w => { // ws = รายการสรุปของแต่ละหอ (แปลงจาก Map เป็นอาร์เรย์แล้ววนทีละหอ)
    const last = w.rows.reduce((x, y) => String(y.record_date) > String(x.record_date) ? y : x); // last = แถวที่วันที่ล่าสุดของหอนี้
    return { // คืนอ็อบเจ็กต์สรุปของหอนี้
      n: w.n, // ชื่อหอ
      tot: bedNum(last.total_beds) ?? bedField(last, 'tot'), // เตียงทั้งหมด = ค่าล่าสุด (ลอง total_beds ก่อน ไม่ได้ค่อยเดาจากชื่อคอลัมน์)
      used: av(w.rows, r => bedNum(r.used_beds) ?? bedField(r, 'use')), // เตียงที่ใช้งาน = ค่าเฉลี่ยต่อวัน
      male: av(w.rows, r => bedNum(r.male_count)), // ผู้ป่วยชายที่ครองเตียง = ค่าเฉลี่ยต่อวัน
      female: av(w.rows, r => bedNum(r.female_count)) // ผู้ป่วยหญิงที่ครองเตียง = ค่าเฉลี่ยต่อวัน
    }; // จบอ็อบเจ็กต์สรุปของหอนี้
  }).sort((x, y) => String(x.n).localeCompare(String(y.n), 'th')); // เรียงชื่อหอตามลำดับตัวอักษรไทย
  const sm = k => ws.reduce((s, w) => s + (w[k] || 0), 0); // sm = ผลรวมของฟิลด์ k ทุกหอ (ค่า null นับเป็น 0)
  return { ws, T: sm('tot'), U: sm('used'), M: sm('male'), F: sm('female') }; // คืนรายหอ + ยอดรวม เตียง/ใช้งาน/ชาย/หญิง
} // จบ bedStats

function wardBedHtml(rows, err) { // สร้าง HTML ส่วน "การใช้งานเตียงแต่ละหอผู้ป่วย" (rows = ข้อมูล, err = ข้อความผิดพลาดถ้าโหลดไม่ได้)
  const h = '<p style="margin:16px 0 4px;font-weight:600">การใช้งานเตียงแต่ละหอผู้ป่วย</p>'; // h = หัวข้อส่วนนี้
  if (err) { // ถ้าโหลดตารางไม่สำเร็จ
    return h + '<div class="nd">โหลดตาราง <b>hospital_bed_occupancy_stats</b> ไม่ได้ — ตรวจสิทธิ์อ่าน (RLS policy)<br><small style="color:#b42318">' + esc(err) + '</small></div>'; // แสดงข้อความผิดพลาด (esc = กัน HTML แทรก)
  } // จบเงื่อนไขกรณี error
  if (!rows || !rows.length) { // ถ้าไม่มีข้อมูลเลย
    return h + '<div class="nd">ไม่มีข้อมูลเตียงรายหอผู้ป่วยในช่วงที่เลือก (hospital_bed_occupancy_stats)</div>'; // แจ้งว่าไม่มีข้อมูลในช่วงที่เลือก
  } // จบเงื่อนไขกรณีไม่มีข้อมูล
  const B = bedStats(rows), ws = B.ws; // B = สรุปทั้งหมด, ws = รายการสรุปรายหอ
  if (!ws.some(w => w.tot != null || w.used != null)) { // ถ้าไม่มีหอไหนมีค่าเตียงเลย
    return h + '<div class="nd">ตาราง hospital_bed_occupancy_stats ไม่พบคอลัมน์จำนวนเตียง</div>'; // แจ้งว่าไม่พบคอลัมน์จำนวนเตียง
  } // จบเงื่อนไขกรณีไม่พบคอลัมน์
  const col = p => p > 100 ? '#c2371f' : p >= 90 ? '#e2563c' : p >= 75 ? '#e9a23b' : '#2f9e6b'; // col = เลือกสีแถบตาม % ครองเตียง (เกิน100 แดงเข้ม, ≥90 แดง, ≥75 ส้ม, ที่เหลือเขียว)
  const f1 = v => v == null ? '-' : fm(v, 1); // f1 = จัดรูปตัวเลข 1 ทศนิยม ถ้าไม่มีค่าแสดง "-"
  const gT = B.M + B.F; // gT = ผู้ป่วยชายรวมหญิง (ผู้ครองเตียงทั้งหมด)
  const mp = gT ? B.M / gT * 100 : 0; // mp = สัดส่วนชาย (%)
  const fp = gT ? B.F / gT * 100 : 0; // fp = สัดส่วนหญิง (%)
  const gender = gT // gender = HTML แถบสัดส่วนชาย/หญิง (ว่างถ้าไม่มีข้อมูลเพศ)
    ? `<div style="margin:6px 0 2px;font-size:12px;color:var(--mut)">ผู้ป่วยที่ครองเตียงแยกเพศ (เฉลี่ยต่อวัน)</div>` + // คำอธิบายเหนือแถบ
      `<div class="gb"><i style="width:${mp}%;background:#2563eb" title="ชาย"></i><i style="width:${fp}%;background:#d6457f" title="หญิง"></i></div>` + // แถบสองสี ความกว้างตามสัดส่วนชาย(น้ำเงิน)/หญิง(ชมพู)
      `<div class="gl"><span style="color:#2563eb">● ชาย <b>${f1(B.M)}</b> ราย (${fm(mp, 1)}%)</span><span style="color:#d6457f">● หญิง <b>${f1(B.F)}</b> ราย (${fm(fp, 1)}%)</span></div>` // คำอธิบายจำนวนและ % ของชาย/หญิง
    : ''; // ไม่มีข้อมูลเพศ -> ไม่แสดงอะไร
  const row = (n, tot, used, m, f, b) => { // row = สร้างแถวตาราง 1 แถว (n=ชื่อ, tot=เตียง, used=ใช้งาน, m=ชาย, f=หญิง, b=true ถ้าเป็นแถวรวมให้ตัวหนา)
    const p = tot ? used / tot * 100 : null; // p = % ครองเตียง (ไม่มีจำนวนเตียงให้เป็น null)
    const bar = p == null ? '-' : // bar = ช่อง "ครองเตียง": ไม่มีค่าแสดง "-"
      `<div style="display:flex;align-items:center;gap:6px"><div style="flex:1;height:10px;border-radius:9px;background:#e8eef5;overflow:hidden"><div style="height:100%;width:${Math.min(p, 100)}%;background:${col(p)};border-radius:9px"></div></div><span style="min-width:42px;text-align:right">${fm(p, 0)}%</span></div>` + // แถบความคืบหน้า (กว้างสูงสุด 100%) + ตัวเลข %
      (p > 100 ? `<small style="color:#c2371f">เกินจำนวนเตียง ${fm(used - tot, 1)}</small>` : ''); // ถ้าเกิน 100% แจ้งจำนวนที่เกิน
    return `<tr${b ? ' style="font-weight:700;background:#f4f8fb"' : ''}>` + // เปิดแถว (แถวรวมใส่ตัวหนาและพื้นหลังอ่อน)
      `<td>${esc(n)}</td>` + // ช่องชื่อหอ
      `<td style="text-align:right">${fm(tot)}</td>` + // ช่องจำนวนเตียง
      `<td style="text-align:right">${f1(used)}</td>` + // ช่องเตียงที่ใช้งาน
      `<td style="text-align:right;color:#2563eb">${f1(m)}</td>` + // ช่องชาย (สีน้ำเงิน)
      `<td style="text-align:right;color:#d6457f">${f1(f)}</td>` + // ช่องหญิง (สีชมพู)
      `<td style="min-width:140px">${bar}</td></tr>`; // ช่องแถบครองเตียง แล้วปิดแถว
  }; // จบ row
  return h + gender + // คืน: หัวข้อ + แถบเพศ +
    '<div style="overflow-x:auto;margin-top:8px"><table>' + // กล่องเลื่อนแนวนอนและเปิดตาราง
    '<tr><th>หอผู้ป่วย</th><th style="text-align:right">เตียง</th><th style="text-align:right">ใช้งาน</th><th style="text-align:right">ชาย</th><th style="text-align:right">หญิง</th><th>ครองเตียง</th></tr>' + // แถวหัวตาราง
    ws.map(w => row(w.n, w.tot, w.used, w.male, w.female)).join('') + // แถวข้อมูลของทุกหอ
    row('รวมทุกหอ', B.T, B.U, B.M, B.F, true) + // แถวรวมทุกหอ (ตัวหนา)
    '</table></div>' + // ปิดตารางและกล่อง
    '<small style="color:var(--mut)">เตียง = ค่าล่าสุดในช่วงที่เลือก · ใช้งาน/ชาย/หญิง = เฉลี่ยต่อวัน (ชาย+หญิง = ผู้ป่วยที่ครองเตียง) · ครองเตียงเกิน 100% = ผู้ป่วยมากกว่าจำนวนเตียงที่ตั้งไว้</small>'; // หมายเหตุอธิบายวิธีคิดตัวเลข
} // จบ wardBedHtml

function nowStamp(a, b) { // เวลาปัจจุบัน ณ ตอนกดค้นหา — ค่าเปลี่ยนเฉพาะเมื่อเลือกวันที่แล้วค้นหา/โหลดใหม่ (a=วันเริ่ม, b=วันสิ้นสุด)
  const t = new Intl.DateTimeFormat('th-TH', { // t = ข้อความเวลาปัจจุบัน จัดรูปแบบภาษาไทย
    timeZone: 'Asia/Bangkok', // ใช้เขตเวลากรุงเทพฯ
    day: 'numeric', month: 'short', year: 'numeric', // แสดงวัน เดือนย่อ ปี (พ.ศ.)
    hour: '2-digit', minute: '2-digit', second: '2-digit', // แสดง ชั่วโมง:นาที:วินาที
    hour12: false // ใช้ระบบ 24 ชั่วโมง
  }).format(new Date()).replace(/\s+(?=\d{2}:)/, ' · '); // จัดรูปเวลาตอนนี้ แล้วแทนช่องว่างก่อนเวลาด้วยจุดคั่น " · "
  return `<div class="now"><span class="nd0" style="animation:none"></span>เวลาปัจจุบัน ณ ตอนค้นหา <b>${t} น.</b><span>· ข้อมูลวันที่ ${a === b ? a : a + ' ถึง ' + b}</span></div>`; // คืนกล่องเวลา + ช่วงวันที่ของข้อมูล (วันเดียวแสดงวันเดียว)
} // จบ nowStamp
