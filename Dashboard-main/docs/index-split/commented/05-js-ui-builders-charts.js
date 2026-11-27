// ============================================================================
// ส่วนที่ 05 — ตัวสร้างส่วนประกอบหน้าจอและกราฟ (เดิมบรรทัด 288–365 ของ index.html)
// หลักการ: ทุกฟังก์ชันรับข้อมูลแล้วคืน "ข้อความ HTML/SVG" ให้ render() นำไปใส่ใน innerHTML
//          ไม่ได้ใช้ไลบรารีกราฟ — วาดเส้น/แท่ง/โดนัทด้วย SVG เอง
// คำอธิบายตัวย่อที่พบบ่อย: n=หมายเลขการ์ด, t=หัวข้อ, s=หัวข้อรอง, c=ค่าปัจจุบัน, p=ค่าช่วงก่อน,
//                         keys=ป้ายแกน x, series=ชุดข้อมูล [{n:ชื่อ, c:สี, v:[ค่า...], u:หน่วย}]
// ============================================================================

// ---------- A. โครงการ์ด ----------
const sec = (n, t, s, body, cls = '') => // สร้างกล่องการ์ด 1 ใบ: n=เลขการ์ด, t=หัวข้อ, s=หัวข้อรอง, body=เนื้อหา HTML, cls=class เพิ่ม
  `<section class="s ${cls}" id="sec${String(n).replace('.', '_')}"><div class="h"><b>${n}</b><h2>${t}</h2><span>${s}</span></div>${body}</section>`; // คืน HTML: id = "sec" + เลขการ์ด (จุดแทนด้วย _)

// ---------- B. กราฟเส้นเล็ก (sparkline) ใต้ตัวเลข KPI ----------
const spark = (pts, c, lb) => { // pts=[[วันที่,ค่า],...], c=สีเส้น, lb=ชื่อตัวชี้วัด
  if (pts.length < 2) return ''; // มีจุดน้อยกว่า 2 จุดวาดเส้นไม่ได้ → ไม่แสดง
  const v = pts.map(e => e[1]), m = Math.max(...v), n = Math.min(...v), r = m - n || 1, w = 100 / v.length; // v=ค่าทั้งหมด, m=สูงสุด, n=ต่ำสุด, r=ช่วงค่า (กันหารศูนย์ด้วย ||1), w=ความกว้างต่อจุด
  return `<svg viewBox="0 0 100 26" width="100%" height="26" preserveAspectRatio="none" aria-label="แนวโน้ม ${lb}"><polyline fill="none" stroke="${c}" stroke-width="1.8" vector-effect="non-scaling-stroke" points="${v.map((x, i) => (i / (v.length - 1) * 100).toFixed(1) + ',' + (24 - (x - n) / r * 22).toFixed(1)).join(' ')}"/>${pts.map((e, i) => `<rect class="hit" x="${(i * w).toFixed(2)}" y="0" width="${w.toFixed(2)}" height="26" data-tip="${esc(`<b>${fd(e[0])}</b><div class="tr"><span>${lb}</span><b>${fm(e[1], e[1] < 100 ? 1 : 0)}</b></div>`)}"/>`).join('')}</svg>`; // วาดเส้น polyline (พิกัด x ตามลำดับ, y กลับด้านตามค่า) + สี่เหลี่ยมโปร่งใสรายจุดไว้ให้ชี้แล้วขึ้น tooltip (data-tip)
}; // จบ spark

// ---------- C. ตัวแปรสถานะและตัวช่วยการเปรียบเทียบช่วงก่อนหน้า ----------
const NARROW = () => innerWidth < 640; // จอแคบ (มือถือ) = กว้างน้อยกว่า 640px
let LAST = null; // อาร์กิวเมนต์ render ล่าสุด ไว้วาดใหม่เมื่อขนาดจอข้ามจุดเปลี่ยน
let CMP = { len: 1, pa: '', pb: '' }; // ช่วงเปรียบเทียบ (จำนวนวัน + วันที่เริ่ม/สิ้นสุดของช่วงก่อนหน้า) ตั้งค่าใหม่ทุกครั้งที่ค้นหา
const cmpDate = t => t ? `${t.slice(8)}/${t.slice(5, 7)}/${+t.slice(0, 4) + 543}` : ''; // แปลง "YYYY-MM-DD" เป็น "วว/ดด/ปีพุทธศักราช" (ปี + 543)
const cmpTxt = () => `เทียบ ${CMP.len} วัน · ${cmpDate(CMP.pa)}${CMP.len > 1 ? ' – ' + cmpDate(CMP.pb) : ''}`; // ข้อความ "เทียบ N วัน · วันเริ่ม – วันสิ้นสุด" (ถ้า 1 วันแสดงวันเดียว)
const NOCMP = '<em style="color:var(--mut);font-weight:500">ไม่มีช่วงเปรียบเทียบ</em>'; // ข้อความเมื่อช่วงก่อนหน้าไม่มีข้อมูล
const delta = (c, p, inv, u = '') => { // สร้างป้าย ▲/▼ % เปลี่ยนแปลง: c=ปัจจุบัน, p=ก่อนหน้า, inv=true ถ้า "ลดลงคือดี" (เช่น เวลารอ), u=หน่วย
  if (!p) return NOCMP + `<small class="pv">${cmpTxt()}</small>`; // ไม่มีค่าก่อนหน้า (0/ว่าง) → แสดง "ไม่มีช่วงเปรียบเทียบ"
  const d = (c - p) / p * 100, g = inv ? d < 0 : d > 0; // d = % เปลี่ยนแปลง, g = ผลเป็นไปในทางดี (ถ้า inv กลับเงื่อนไข)
  return `<em class="${g ? 'up' : 'dn'}">${d >= 0 ? '▲' : '▼'} ${fm(Math.abs(d), 1)}% vs ช่วงก่อน</em><small class="pv">ช่วงก่อน <b>${fm(p)}</b> ${u}<br>${cmpTxt()}</small>`; // class up/dn = สีเขียว/แดง ตามดีหรือไม่ดี; ลูกศรตามเครื่องหมายของ d
}; // จบ delta

// ---------- D. การ์ดตัวเลข KPI และแท่งแนวนอน ----------
const kpi = (l, v, u, c, p, inv, sr, col = '#0b7a8a') => // l=ชื่อ, v=ค่าที่แสดง, u=หน่วย, c/p=ค่าปัจจุบัน/ก่อนหน้า, inv=ลดแล้วดี, sr=ข้อมูล sparkline, col=สีเส้น
  `<div class="k"><i>${l}</i><strong>${v}<u>${u}</u></strong>${delta(c, p, inv, u)}${sr ? spark(sr, col, l) : ''}</div>`; // ชื่อ + ตัวเลขใหญ่ + ป้ายเปลี่ยนแปลง + sparkline (ถ้ามีข้อมูล)
const bars = (rows, unit) => { // กราฟแท่งแนวนอน: rows=[[ชื่อ,ค่า,สี(ไม่บังคับ)],...], unit=หน่วยท้ายตัวเลข
  const m = Math.max(...rows.map(r => r[1]), 1); // ค่าสูงสุด (อย่างน้อย 1) ใช้คิดความยาวแท่งเป็น %
  return rows.length ? rows.map(r => `<div class="bar"><span>${r[0]}</span><div><u style="width:${r[1] / m * 100}%;background:${r[2] || 'linear-gradient(90deg,#0b7a8a,#14a3a8)'}"></u></div><span>${fm(r[1], unit ? 1 : 0)}${unit || ''}</span></div>`).join('') : '<div class="nd">ไม่มีข้อมูล</div>'; // มีข้อมูล → วาดทีละแถว (ชื่อ, แท่ง, ตัวเลข) ไม่มี → "ไม่มีข้อมูล"
}; // จบ bars
const group = (a, kf, vf) => { // จัดกลุ่มและรวมค่า: a=แถวข้อมูล, kf=ฟังก์ชันหาคีย์กลุ่ม, vf=ฟังก์ชันหาค่าที่จะรวม
  const m = {}; // ตารางคีย์ → ผลรวม
  a.forEach(r => { const k = kf(r); m[k] = (m[k] || 0) + num(vf(r)); }); // วนแต่ละแถว บวกค่าเข้ากลุ่มของมัน
  return Object.entries(m).sort((x, y) => y[1] - x[1]); // คืน [[คีย์, ผลรวม],...] เรียงจากมากไปน้อย
}; // จบ group

// ---------- E. กราฟโดนัทและคำอธิบายสี ----------
const donut = (parts, cols, center, size = 132, o = {}) => { // parts=[[ชื่อ,ค่า],...], cols=ชุดสี, center=ข้อความกลางวง, size=ขนาด px, o=ตัวเลือก (dark, target, sub, label, fmtv)
  const T = parts.reduce((s, p) => s + p[1], 0) || 1, R = 15.9155, gap = parts.filter(p => p[1] > 0).length > 1 ? .9 : 0, dark = o.dark, trk = dark ? '#ffffff1f' : '#eaf0f5', tx = dark ? '#fff' : '#0e2235', ms = dark ? '#9fb4c6' : '#5d7186'; // T=ผลรวม, R=รัศมี (เส้นรอบวง = 100 พอดี), gap=ช่องว่างระหว่างส่วน, trk=สีรางพื้น, tx=สีตัวหนังสือกลาง, ms=สีข้อความรอง (ตามโหมดมืด/สว่าง)
  let off = 25; // จุดเริ่มวาดบนวงกลม (25 = ตำแหน่งบนสุด)
  const seg = parts.map((p, i) => { // วาดแต่ละส่วนของโดนัทเป็น <circle> ที่ใช้ stroke-dasharray ตัดเป็นส่วนโค้ง
    const l = p[1] / T * 100, vis = Math.max(l - gap, 0), c = cols[i % cols.length], // l=สัดส่วน %, vis=ความยาวที่มองเห็น (หักช่องว่าง), c=สี (วนซ้ำถ้าสีไม่พอ)
      tip = esc(`<b>${p[0]}</b><div class="tr"><span><i style="background:${c}"></i>สัดส่วน</span><b>${fm(l, 1)}%</b></div>${o.fmtv ? `<div class="tr"><span>มูลค่า</span><b>${o.fmtv(p[1])}</b></div>` : ''}`), // tip = HTML ของ tooltip (ชื่อ, สัดส่วน, มูลค่าถ้ามี) หลังแปลงอักขระพิเศษ
      e = l > 0 ? `<circle class="dsg" cx="21" cy="21" r="${R}" fill="none" stroke="${c}" stroke-width="6" stroke-linecap="butt" stroke-dasharray="${vis.toFixed(3)} ${(100 - vis).toFixed(3)}" stroke-dashoffset="${(off - gap / 2).toFixed(3)}" data-tip="${tip}" data-i="${i}"/>` : ''; // e = วงกลมของส่วนนี้ (ถ้าสัดส่วน > 0); dasharray = ยาวที่เห็น + ที่เหลือ, dashoffset = ตำแหน่งเริ่ม
    off -= l; return e; // เลื่อนจุดเริ่มถอยไปตามสัดส่วนที่ใช้แล้ว แล้วคืนวงกลม
  }).join(''); // รวมทุกส่วนเป็นข้อความเดียว
  const tgt = o.target != null ? (() => { // ถ้ามีเป้าหมาย (%) → วาดขีดเป้าหมายบนวง
    const a = o.target / 100 * 2 * Math.PI - Math.PI / 2, x1 = 21 + Math.cos(a) * 12.2, y1 = 21 + Math.sin(a) * 12.2, x2 = 21 + Math.cos(a) * 19.2, y2 = 21 + Math.sin(a) * 19.2; // a=มุมของเป้าหมาย (เริ่มบนสุด), (x1,y1)-(x2,y2) = ปลายในและนอกของขีด
    return `<line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" stroke="${dark ? '#f5b441' : '#0e2235'}" stroke-width="1.1" stroke-linecap="round" data-tip="${esc(`<b>เป้าหมาย</b><div class="tr"><span>ไม่เกิน</span><b>${o.target}%</b></div>`)}"/>`; // เส้นขีดพร้อม tooltip "เป้าหมาย ไม่เกิน N%"
  })() : ''; // ไม่มีเป้าหมาย → ไม่วาด
  return `<svg viewBox="0 0 42 42" width="${size}" height="${size}" role="img" aria-label="${esc(o.label || 'แผนภูมิโดนัท')}: ${esc(parts.map(p => p[0] + ' ' + fm(p[1] / T * 100, 1) + '%').join(', '))}"><circle cx="21" cy="21" r="${R}" fill="none" stroke="${trk}" stroke-width="6"/>${seg}${tgt}<text x="21" y="${o.sub ? 21.6 : 23}" text-anchor="middle" font-size="${String(center).length > 6 ? Math.max(3.4, 27 / String(center).length) : 6.6}" font-weight="700" fill="${tx}" style="letter-spacing:-.2px">${center}</text>${o.sub ? `<text x="21" y="27" text-anchor="middle" font-size="2.9" fill="${ms}">${o.sub}</text>` : ''}</svg>`; // ประกอบ SVG: รางพื้น + ส่วนต่างๆ + ขีดเป้าหมาย + ข้อความกลาง (ลดขนาดฟอนต์ถ้ายาว) + ข้อความรอง; aria-label สำหรับโปรแกรมอ่านหน้าจอ
}; // จบ donut
const dlegend = (parts, cols, fmtv, dark) => { // คำอธิบายสีข้างโดนัท: ชื่อ, มูลค่า (ถ้ามี fmtv), สัดส่วน %
  const T = parts.reduce((s, p) => s + p[1], 0) || 1; // ผลรวมทั้งหมด (กันหารศูนย์)
  return `<div class="dl">${parts.map((p, i) => `<div><i style="background:${cols[i % cols.length]}"></i><span>${p[0]}</span>${fmtv ? `<b>${fmtv(p[1])}</b>` : '<b></b>'}<em>${fm(p[1] / T * 100, 1)}%</em></div>`).join('')}</div>`; // แถวละส่วน: จุดสี + ชื่อ + มูลค่า + %
}; // จบ dlegend
const PAL = ['#0b7a8a', '#e9a23b', '#2f9e6b', '#e2563c', '#7c6bd6']; // จานสีมาตรฐาน: เขียวน้ำเงิน, เหลือง, เขียว, แดง, ม่วง

// ---------- F. กราฟเส้น ----------
function chart(keys, series, tgt, note) { // กราฟเส้นหลายชุด: keys=ป้ายแกน x, series=ชุดข้อมูล, tgt=เส้นเป้าหมาย (ไม่บังคับ), note=หมายเหตุใน tooltip
  const W = NARROW() ? 340 : 620, H = 220, mx = Math.max(...series.flatMap(s => s.v), tgt || 0, 1), L = Math.max(44, String(fr(mx)).length * 5.8 + 10), span = W - L - 12, few = keys.length <= 7, x = i => few ? L + (i + .5) * span / keys.length : L + i * span / Math.max(keys.length - 1, 1), y = v => H - 28 - v / mx * (H - 48); // W/H=ขนาดผืนวาด, mx=ค่าสูงสุดของแกน y, L=ขอบซ้ายเผื่อตัวเลขแกน, span=ความกว้างพื้นที่กราฟ, x(i)=พิกัดแนวนอนของจุดที่ i, y(v)=พิกัดแนวตั้งของค่า v // ข้อมูลน้อย (≤7 จุด) วางกึ่งกลางกราฟ
  const grid = [0, .5, 1].map(f => `<line x1="${L}" x2="${W - 12}" y1="${y(mx * f)}" y2="${y(mx * f)}" stroke="#dce6ee" stroke-dasharray="3 4"/><text x="${L - 6}" y="${y(mx * f) + 4}" font-size="10" text-anchor="end" fill="#5d7186">${fr(mx * f)}</text>`).join(''); // เส้นตารางประ 3 เส้น (0, ครึ่ง, สูงสุด) พร้อมตัวเลขแกน y
  const area = `<polygon fill="#0b7a8a" opacity=".1" points="${x(0)},${y(0)} ${series[0].v.map((v, i) => x(i) + ',' + y(v)).join(' ')} ${x(keys.length - 1)},${y(0)}"/>`; // พื้นที่ใต้เส้นของชุดแรก (รูปหลายเหลี่ยมสีจาง)
  const tg = tgt == null ? '' : `<line x1="${L}" x2="${W - 12}" y1="${y(tgt)}" y2="${y(tgt)}" stroke="#e2563c" stroke-width="1.5" stroke-dasharray="6 4"/><text x="${W - 14}" y="${y(tgt) - 5}" font-size="10" text-anchor="end" fill="#e2563c">เป้าหมาย ${tgt}</text>`; // เส้นเป้าหมายสีแดงประ + ป้ายข้อความ (ถ้ามี tgt)
  const ln = series.map(s => `<polyline fill="none" stroke="${s.c}" stroke-width="2.6" stroke-linejoin="round" points="${s.v.map((v, i) => x(i) + ',' + y(v)).join(' ')}"/>` + (keys.length > 40 ? '' : s.v.map((v, i) => `<circle cx="${x(i)}" cy="${y(v)}" r="3.5" fill="#fff" stroke="${s.c}" stroke-width="2"/>`).join(''))).join(''); // เส้นของแต่ละชุด + จุดกลม (ไม่วาดจุดถ้ามีเกิน 40 จุด เพื่อไม่ให้แน่น)
  const bw = few ? span / keys.length : span / Math.max(keys.length - 1, 1), hits = keys.map((k, i) => `<rect class="hit" x="${Math.max(x(i) - bw / 2, L)}" y="8" width="${bw}" height="${H - 34}" data-tip="${tipOf(k, series, i, { tgt, note })}"/>`).join(''); // bw=ความกว้างโซนชี้ต่อจุด, hits=สี่เหลี่ยมโปร่งใสทับทุกจุดให้ชี้แล้วเห็น tooltip
  const step = keys.length <= 8 ? 1 : Math.ceil(keys.length / 8), tx = keys.map((k, i) => i % step ? '' : `<text x="${x(i)}" y="${H - 8}" font-size="10" text-anchor="middle" fill="#5d7186">${lab(k)}</text>`).join(''); // แสดงป้ายแกน x ไม่เกินราว 8 ป้าย (ข้ามตามระยะ step)
  return `<div class="lg">${series.map(s => `<span><i style="background:${s.c}"></i>${s.n}</span>`).join('')}</div><svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="กราฟแนวโน้ม แตะหรือชี้เพื่อดูรายละเอียด">${grid}${tg}${area}${ln}${hits}${tx}</svg>`; // ประกอบ: คำอธิบายสีชุดข้อมูล + SVG (ตาราง, เป้าหมาย, พื้นที่, เส้น, โซนชี้, ป้ายแกน)
} // จบ chart

// ---------- G. ตัวช่วยจัดรูปแบบวันที่ / ป้ายแกน / tooltip ----------
const fd = k => /^\d{4}-\d{2}-\d{2}$/.test(k) // จัดรูปแบบคีย์เป็นข้อความอ่านง่าย: ถ้าเป็น "YYYY-MM-DD"
  ? new Date(k + 'T00:00:00').toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) // → "วันจันทร์ 1 ธันวาคม 2569" (รูปแบบไทย)
  : /^\d{4}-\d{2}$/.test(k) ? new Date(k + '-01T00:00:00').toLocaleDateString('th-TH', { month: 'long', year: 'numeric' }) // ถ้าเป็น "YYYY-MM" → "ธันวาคม 2569"
  : /^\d{2}:\d{2}$/.test(k) ? k + '–' + k.slice(0, 2) + ':59 น.' // ถ้าเป็น "HH:MM" → "08:00–08:59 น."
  : k; // รูปแบบอื่นแสดงตามเดิม
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); // แปลงอักขระพิเศษของ HTML เพื่อฝังข้อความใน attribute ได้อย่างปลอดภัย
function tipOf(k, series, i, o = {}) { // สร้าง HTML ของ tooltip ณ จุดที่ i: k=ป้ายจุด, o=ตัวเลือก (dec, stack, tgt, note)
  const f = v => fm(v, o.dec ?? (v < 100 ? 1 : 0)); let h = `<b>${fd(k)}</b>`; // f=จัดรูปตัวเลข (ค่าน้อยกว่า 100 แสดงทศนิยม 1 ตำแหน่ง), h=HTML เริ่มจากหัวข้อ
  series.forEach(s => { // วนแต่ละชุดข้อมูล เพิ่มหนึ่งบรรทัด
    const v = s.v[i], p = i > 0 ? s.v[i - 1] : null, dl = p ? (v - p) / p * 100 : null; // v=ค่าจุดนี้, p=ค่าจุดก่อนหน้า, dl=% เปลี่ยนจากจุดก่อนหน้า
    h += `<div class="tr"><span><i style="background:${s.c}"></i>${s.n}</span><b>${f(v)}${s.u || ''}${dl != null && isFinite(dl) ? `<em>${dl >= 0 ? '▲' : '▼'}${fm(Math.abs(dl), 1)}%</em>` : ''}</b></div>`; // บรรทัด: จุดสี + ชื่อชุด + ค่า + หน่วย + ▲▼ % (ถ้าคำนวณได้)
  }); // จบการวนชุด
  if (o.stack) h += `<div class="tr tt"><span>รวม</span><b>${f(series.reduce((s, x) => s + x.v[i], 0))}${series[0].u || ''}</b></div>`; // กราฟแท่งซ้อน → เพิ่มบรรทัด "รวม"
  if (o.tgt != null) h += `<div class="tr tt"><span>เป้าหมาย</span><b>${o.tgt}${series[0].u || ''}</b></div>`; // มีเป้าหมาย → เพิ่มบรรทัด "เป้าหมาย"
  if (o.note && k.length == 7) h += `<small>${o.note}</small>`; // คีย์เป็นรายเดือน (ยาว 7 ตัว "YYYY-MM") → แสดงหมายเหตุ
  if (series[0].v.length > 1 && k.length > 5) h += `<small>% = เปลี่ยนจากจุดก่อนหน้า</small>`; // มีหลายจุดและไม่ใช่ป้ายชั่วโมง → อธิบายความหมายของ %
  return esc(h); // แปลงอักขระพิเศษก่อนคืน (นำไปใส่ใน data-tip)
} // จบ tipOf
const DOWF = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'], // ชื่อวันเต็ม (ดัชนี 0 = อาทิตย์)
  DOW = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'], // ชื่อวันย่อ
  lab = k => k.length > 7 // ป้ายแกน x: ถ้าคีย์ยาวกว่า 7 ตัว (เป็นวันที่ "YYYY-MM-DD")
    ? (SHORT && /^\d{4}-\d{2}-\d{2}$/.test(k) ? DOW[new Date(k + 'T00:00:00').getDay()] + ' ' : '') + k.slice(8) + '/' + k.slice(5, 7) // → "วว/ดด" (ช่วงสั้น ≤14 วัน ใส่ชื่อวันย่อนำหน้า)
    : k.length == 7 ? k.slice(5) + '/' + k.slice(2, 4) // คีย์รายเดือน "YYYY-MM" → "ดด/ปป"
    : k; // อื่นๆ (เช่น ชั่วโมง) แสดงตามเดิม
let SHORT = false; // ธง: ช่วงที่เลือกสั้น (≤ 13 วัน) หรือไม่ ตั้งค่าใน render()

// ---------- H. กราฟแท่งแนวตั้ง ----------
function cols(keys, series, stack, dec = 0, note) { // กราฟแท่ง: stack=true ซ้อนกัน, false วางเคียงกัน; dec=จำนวนทศนิยมแกน
  const W = NARROW() ? 340 : 620, H = 230, n = keys.length || 1, tot = keys.map((_, i) => stack ? series.reduce((s, x) => s + x.v[i], 0) : Math.max(...series.map(x => x.v[i]))), mx = Math.max(...tot, 1), L = Math.max(44, String(fr(mx, dec)).length * 5.8 + 10), y = v => H - 28 - v / mx * (H - 50), bw = (W - L - 12) / n, g = bw * .8 / series.length; // W/H=ขนาด, n=จำนวนกลุ่ม, tot=ความสูงรวมของแต่ละกลุ่ม, mx=ค่าสูงสุดของแกน, L=ขอบซ้าย, y(v)=พิกัดแนวตั้ง, bw=ความกว้างต่อกลุ่ม, g=ความกว้างแท่งเดี่ยว (กรณีวางเคียง)
  const grid = [0, .5, 1].map(f => `<line x1="${L}" x2="${W - 12}" y1="${y(mx * f)}" y2="${y(mx * f)}" stroke="#dce6ee" stroke-dasharray="3 4"/><text x="${L - 6}" y="${y(mx * f) + 4}" font-size="10" text-anchor="end" fill="#5d7186">${fr(mx * f, dec)}</text>`).join(''); // เส้นตารางประ 3 เส้นพร้อมตัวเลขแกน y
  const bars = keys.map((k, i) => { let acc = 0; return series.map((s, j) => { const v = s.v[i], x = L + i * bw + (stack ? bw * .15 : bw * .1 + j * g), yy = stack ? y(acc + v) : y(v); acc += v; return `<rect x="${x}" y="${yy}" width="${stack ? bw * .7 : g * .92}" height="${Math.max(y(0) - y(v), 0)}" rx="2" fill="${s.c}"/>`; }).join(''); }).join(''); // วาดแท่งทุกกลุ่ม/ทุกชุด: acc=ความสูงสะสม (กรณีซ้อน), x=ตำแหน่งแนวนอน, yy=ขอบบนของแท่ง, ความสูง = y(0) − y(v) (ไม่ติดลบ)
  const hits = keys.map((k, i) => `<rect class="hit" x="${L + i * bw}" y="8" width="${bw}" height="${H - 34}" data-tip="${tipOf(k, series, i, { stack, dec, note })}"/>`).join(''); // โซนโปร่งใสให้ชี้แล้วขึ้น tooltip ทุกกลุ่ม
  const st = n <= 10 ? 1 : Math.ceil(n / 10), tx = keys.map((k, i) => i % st ? '' : `<text x="${L + i * bw + bw / 2}" y="${H - 8}" font-size="10" text-anchor="middle" fill="#5d7186">${lab(k)}</text>`).join(''); // ป้ายแกน x ไม่เกินราว 10 ป้าย
  return `<div class="lg">${series.map(s => `<span><i style="background:${s.c}"></i>${s.n}</span>`).join('')}</div><svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="กราฟแท่ง แตะหรือชี้เพื่อดูรายละเอียด">${grid}${bars}${hits}${tx}</svg>`; // ประกอบ: คำอธิบายสี + SVG (ตาราง, แท่ง, โซนชี้, ป้ายแกน)
} // จบ cols

// ---------- I. กราฟเชิงลึก (การ์ดหมายเลข 11–18) ----------
function deepCharts(cur, d, keys, keyf, erR) { // cur=ข้อมูลช่วงปัจจุบัน, d=แถวรายวัน, keys=ป้ายกลุ่มเวลา, keyf=ฟังก์ชันแปลงวันที่เป็นคีย์กลุ่ม (วัน/เดือน), erR=แถว ER รายชั่วโมง
  const mvA = f => keys.map(k => avg(d.filter(r => keyf(r.record_date) === k), f) || 0), // mvA = ค่าเฉลี่ยของ f ในแต่ละกลุ่มเวลา (ไม่มี = 0)
    mvS = (rows, f) => keys.map(k => sum(rows.filter(r => keyf(r.record_date) === k), f)); // mvS = ผลรวมของ f ในแต่ละกลุ่มเวลา
  const dd = {}; [...new Set(d.map(r => r.record_date))].forEach(s => { const w = new Date(s).getUTCDay(); dd[w] = (dd[w] || 0) + 1; }); // dd = จำนวนวันที่มีข้อมูลของแต่ละวันในสัปดาห์ (0=อาทิตย์) ไว้หารเป็นค่าเฉลี่ย
  const nd = Math.max(new Set(cur.hourly.map(r => r.record_date)).size, 1), H24 = [...Array(24).keys()]; // nd = จำนวนวันที่มีข้อมูลรายชั่วโมง (อย่างน้อย 1), H24 = [0..23]
  const hp = t => H24.map(h => sum(cur.hourly.filter(r => r.patient_type === t && parseInt(r.time_hour) === h), r => r.service_count) / nd); // hp(t) = จำนวนผู้ป่วยชนิด t (OPD/ER) เฉลี่ยต่อวัน ของแต่ละชั่วโมง
  const heat = t => { // สร้างแผนที่ความร้อน (heatmap) วัน × ชั่วโมง ของผู้ป่วยชนิด t
    const m = {}; cur.hourly.filter(r => r.patient_type === t).forEach(r => { const k = new Date(r.record_date).getUTCDay() + '-' + parseInt(r.time_hour); m[k] = (m[k] || 0) + num(r.service_count); }); // m["วัน-ชั่วโมง"] = ผลรวมจำนวนผู้ป่วย
    const v = (w, h) => (m[w + '-' + h] || 0) / (dd[w] || 1), mx = Math.max(...Object.keys(m).map(k => v(...k.split('-'))), 1), rgb = t === 'ER' ? '226,86,60' : '11,122,138'; // v(w,h)=ค่าเฉลี่ยต่อวัน, mx=ค่าสูงสุด (ใช้ปรับความเข้มสี), rgb=สี ER แดง / OPD เขียวน้ำเงิน
    return `<div style="display:grid;grid-template-columns:30px repeat(24,1fr);gap:2px;font-size:10px;color:#5d7186">` // เริ่มตาราง grid: คอลัมน์ชื่อวัน 30px + 24 คอลัมน์ชั่วโมง
      + [...Array(7).keys()].map(w => `<span style="align-self:center">${DOW[w]}</span>` + H24.map(h => `<i style="height:22px;border-radius:3px;background:rgba(${rgb},${(.06 + .94 * v(w, h) / mx).toFixed(2)})" data-tip="${esc(`<b>วัน${DOWF[w]} ${String(h).padStart(2, '0')}:00–${String(h).padStart(2, '0')}:59 น.</b><div class="tr"><span>เฉลี่ย ${t}</span><b>${fm(v(w, h), 1)} ราย/ชม.</b></div><small>เฉลี่ยจาก ${dd[w] || 0} วัน${DOWF[w]}ในช่วงที่เลือก</small>`)}"></i>`).join('')).join('') // 7 แถว (วัน) × 24 ช่อง: ความเข้มสี = ค่าเฉลี่ย ÷ ค่าสูงสุด (ต่ำสุด .06) พร้อม tooltip
      + `<span></span>` + H24.map(h => `<span style="text-align:center">${h % 3 ? '' : h}</span>`).join('') + `</div><p class="nd" style="padding:6px">สีเข้ม = ผู้ป่วยหนาแน่น (ค่าเฉลี่ยต่อชั่วโมง)</p>`; // แถวป้ายชั่วโมงล่างสุด (แสดงทุก 3 ชั่วโมง) + คำอธิบายสี
  }; // จบ heat
  const wk = [...Array(7).keys()].map(w => [DOW[w], (sum(d.filter(r => new Date(r.record_date).getUTCDay() === w), r => r.opd_daily_count)) / (dd[w] || 1)]); // wk = [ชื่อวันย่อ, OPD เฉลี่ย] ของแต่ละวันในสัปดาห์
  const E = r => num(r.er_his_income), O = r => num(r.opd_his_income) - E(r); // E = รายรับ ER, O = รายรับ OPD เฉพาะนอก ER (OPD รวม − ER)
  const W = (n, t, s, b) => sec(n, t, s, keys.length ? b : '<div class="nd">ไม่มีข้อมูล</div>', 'w6'); // W = การ์ดครึ่งความกว้าง (class w6); ไม่มีข้อมูลให้แสดง "ไม่มีข้อมูล"
  return `<div class="h" style="grid-column:span 12;margin:10px 0 -4px"><h2 style="font-size:18px">กราฟเชิงลึก</h2><span>Deep-dive Analytics</span></div>` + // หัวข้อกลุ่ม "กราฟเชิงลึก" เต็มความกว้าง
    W(11, 'อัตราครองเตียงเทียบเป้าหมาย (%)', 'Bed Occupancy vs Target', chart(keys, [{ n: 'อัตราครองเตียง', c: '#0b7a8a', u: '%', v: keys.map((_, i) => { const r = d.filter(x => keyf(x.record_date) === keys[i]), t = avg(r, x => x.ipd_total_beds); return t ? (avg(r, x => x.ipd_current_beds) || 0) / t * 100 : 0; }) }], TARGET.occ, 'ค่าเฉลี่ยทั้งเดือน')) + // การ์ด 11: กราฟเส้น % ครองเตียง = เตียงที่ใช้ ÷ เตียงทั้งหมด × 100 พร้อมเส้นเป้าหมาย
    W(12, 'รับใหม่ เทียบ จำหน่าย', 'Admission vs Discharge', cols(keys, [{ n: 'รับใหม่', c: '#2f9e6b', u: ' ราย', v: mvS(d, r => r.ipd_new_admit_daily) }, { n: 'จำหน่าย', c: '#7c6bd6', u: ' ราย', v: mvS(d, r => r.ipd_discharged_daily) }], false, 0, 'ผลรวมทั้งเดือน')) + // การ์ด 12: แท่งเคียงกัน รับใหม่ vs จำหน่าย
    W(13, 'รายได้แยกประเภท (บาท)', 'Revenue Breakdown', cols(keys, [{ n: 'OPD', c: '#0b7a8a', u: ' บาท', v: mvS(d, O) }, { n: 'IPD', c: '#2f9e6b', u: ' บาท', v: mvS(d, r => r.ipd_his_discharge_income) }, { n: 'ER', c: '#e2563c', u: ' บาท', v: mvS(d, E) }], true, 0, 'ผลรวมทั้งเดือน')) + // การ์ด 13: แท่งซ้อน รายได้ OPD/IPD/ER
    W(14, 'เวลารอแต่ละขั้นตอน (นาที)', 'Waiting Time by Stage', cols(keys, [{ n: 'ลงทะเบียน→คัดกรอง', c: '#8aa0b3', u: ' นาที', v: mvA(r => r.avg_wait_reg_to_triage) }, { n: 'รอพบแพทย์', c: '#e9a23b', u: ' นาที', v: mvA(r => r.avg_wait_for_doctor) }, { n: 'ตรวจ', c: '#0b7a8a', u: ' นาที', v: mvA(r => r.avg_doctor_consult_time) }, { n: 'รอรับยา', c: '#7c6bd6', u: ' นาที', v: mvA(r => r.avg_wait_for_pharmacy) }], true, 1, 'ค่าเฉลี่ยทั้งเดือน')) + // การ์ด 14: แท่งซ้อน เวลารอแต่ละขั้นตอน (ค่าเฉลี่ย ทศนิยม 1 ตำแหน่ง)
    W(15, 'ช่วงเวลาที่ผู้ป่วยมาใช้บริการ', 'Hourly Arrival Profile', chart(H24.map(h => String(h).padStart(2, '0') + ':00'), [{ n: 'OPD', c: '#0b7a8a', u: ' ราย/ชม.', v: hp('OPD') }, { n: 'ER', c: '#e2563c', u: ' ราย/ชม.', v: hp('ER') }])) + // การ์ด 15: กราฟเส้น 24 ชั่วโมง OPD vs ER
    W(16, 'OPD เฉลี่ยตามวันในสัปดาห์', 'Weekday Pattern', bars(wk.map(w => [w[0], w[1], 'linear-gradient(90deg,#0b7a8a,#14a3a8)']))) + // การ์ด 16: แท่งแนวนอน OPD เฉลี่ยตามวันในสัปดาห์
    W(17, 'Heatmap OPD: วัน × ชั่วโมง', 'OPD Peak Hours', heat('OPD')) + // การ์ด 17: heatmap OPD
    W(18, 'Heatmap ER: วัน × ชั่วโมง', 'ER Peak Hours', heat('ER')); // การ์ด 18: heatmap ER (จบ return)
} // จบ deepCharts
