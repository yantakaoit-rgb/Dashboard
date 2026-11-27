function bedField(r,kind){ // อ่านค่าเตียงจากแถวหอผู้ป่วย: ลองชื่อคอลัมน์ที่พบบ่อยก่อน แล้วค่อยเดาจากคำว่า bed
  const list=kind==='tot'?BED_TOT:BED_USE;
  for(const k of list)if(r[k]!=null&&r[k]!==''&&isFinite(+r[k]))return +r[k];
  const re=kind==='tot'?/total|all|count|qty|cap|^beds?$/i:/used|occup|current|census|inuse/i,ex=kind==='tot'?/used|occup|current|rate|pct|percent/i:/rate|pct|percent|total/i;
  const k=Object.keys(r).find(k=>/bed/i.test(k)&&re.test(k)&&!ex.test(k)&&r[k]!=null&&r[k]!==''&&isFinite(+r[k]));
  return k?+r[k]:null;
}
const bedNum=v=>v===''||v==null||isNaN(+v)?null:+v;
function bedStats(rows){ // สรุปเตียงรายหอจาก hospital_bed_occupancy_stats: เตียง=ค่าล่าสุด, ใช้งาน/ชาย/หญิง=เฉลี่ยต่อวัน
  const m=new Map();(rows||[]).forEach(r=>{const k=r.ward||r.ward_name||'ไม่ระบุ';if(!m.has(k))m.set(k,{n:r.ward_name||r.ward||'ไม่ระบุ',rows:[]});m.get(k).rows.push(r)});
  const av=(rs,f)=>{const v=rs.map(f).filter(x=>x!=null);return v.length?v.reduce((a,b)=>a+b,0)/v.length:null};
  const ws=[...m.values()].map(w=>{const last=w.rows.reduce((x,y)=>String(y.record_date)>String(x.record_date)?y:x);
    return{n:w.n,tot:bedNum(last.total_beds)??bedField(last,'tot'),used:av(w.rows,r=>bedNum(r.used_beds)??bedField(r,'use')),male:av(w.rows,r=>bedNum(r.male_count)),female:av(w.rows,r=>bedNum(r.female_count))}}).sort((x,y)=>String(x.n).localeCompare(String(y.n),'th'));
  const sm=k=>ws.reduce((s,w)=>s+(w[k]||0),0);
  return{ws,T:sm('tot'),U:sm('used'),M:sm('male'),F:sm('female')};
}
function wardBedHtml(rows,err){
  const h='<p style="margin:16px 0 4px;font-weight:600">การใช้งานเตียงแต่ละหอผู้ป่วย</p>';
  if(err)return h+'<div class="nd">โหลดตาราง <b>hospital_bed_occupancy_stats</b> ไม่ได้ — ตรวจสิทธิ์อ่าน (RLS policy)<br><small style="color:#b42318">'+esc(err)+'</small></div>';
  if(!rows||!rows.length)return h+'<div class="nd">ไม่มีข้อมูลเตียงรายหอผู้ป่วยในช่วงที่เลือก (hospital_bed_occupancy_stats)</div>';
  const B=bedStats(rows),ws=B.ws;
  if(!ws.some(w=>w.tot!=null||w.used!=null))return h+'<div class="nd">ตาราง hospital_bed_occupancy_stats ไม่พบคอลัมน์จำนวนเตียง</div>';
  const col=p=>p>100?'#c2371f':p>=90?'#e2563c':p>=75?'#e9a23b':'#2f9e6b',f1=v=>v==null?'-':fm(v,1);
  const gT=B.M+B.F,mp=gT?B.M/gT*100:0,fp=gT?B.F/gT*100:0;
  const gender=gT?`<div style="margin:6px 0 2px;font-size:12px;color:var(--mut)">ผู้ป่วยที่ครองเตียงแยกเพศ (เฉลี่ยต่อวัน)</div><div class="gb"><i style="width:${mp}%;background:#2563eb" title="ชาย"></i><i style="width:${fp}%;background:#d6457f" title="หญิง"></i></div><div class="gl"><span style="color:#2563eb">● ชาย <b>${f1(B.M)}</b> ราย (${fm(mp,1)}%)</span><span style="color:#d6457f">● หญิง <b>${f1(B.F)}</b> ราย (${fm(fp,1)}%)</span></div>`:'';
  const row=(n,tot,used,m,f,b)=>{const p=tot?used/tot*100:null;return `<tr${b?' style="font-weight:700;background:#f4f8fb"':''}><td>${esc(n)}</td><td style="text-align:right">${fm(tot)}</td><td style="text-align:right">${f1(used)}</td><td style="text-align:right;color:#2563eb">${f1(m)}</td><td style="text-align:right;color:#d6457f">${f1(f)}</td><td style="min-width:140px">${p==null?'-':`<div style="display:flex;align-items:center;gap:6px"><div style="flex:1;height:10px;border-radius:9px;background:#e8eef5;overflow:hidden"><div style="height:100%;width:${Math.min(p,100)}%;background:${col(p)};border-radius:9px"></div></div><span style="min-width:42px;text-align:right">${fm(p,0)}%</span></div>${p>100?`<small style="color:#c2371f">เกินจำนวนเตียง ${fm(used-tot,1)}</small>`:''}`}</td></tr>`};
  return h+gender+'<div style="overflow-x:auto;margin-top:8px"><table><tr><th>หอผู้ป่วย</th><th style="text-align:right">เตียง</th><th style="text-align:right">ใช้งาน</th><th style="text-align:right">ชาย</th><th style="text-align:right">หญิง</th><th>ครองเตียง</th></tr>'+ws.map(w=>row(w.n,w.tot,w.used,w.male,w.female)).join('')+row('รวมทุกหอ',B.T,B.U,B.M,B.F,true)+'</table></div><small style="color:var(--mut)">เตียง = ค่าล่าสุดในช่วงที่เลือก · ใช้งาน/ชาย/หญิง = เฉลี่ยต่อวัน (ชาย+หญิง = ผู้ป่วยที่ครองเตียง) · ครองเตียงเกิน 100% = ผู้ป่วยมากกว่าจำนวนเตียงที่ตั้งไว้</small>';
}
function nowStamp(a,b){ // เวลาปัจจุบัน ณ ตอนกดค้นหา — ค่าเปลี่ยนเฉพาะเมื่อเลือกวันที่แล้วค้นหา/โหลดใหม่
  const t=new Intl.DateTimeFormat('th-TH',{timeZone:'Asia/Bangkok',day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(new Date()).replace(/\s+(?=\d{2}:)/,' · ');
  return `<div class="now"><span class="nd0" style="animation:none"></span>เวลาปัจจุบัน ณ ตอนค้นหา <b>${t} น.</b><span>· ข้อมูลวันที่ ${a===b?a:a+' ถึง '+b}</span></div>`}
