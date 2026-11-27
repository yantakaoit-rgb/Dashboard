const sec=(n,t,s,body,cls='')=>`<section class="s ${cls}" id="sec${String(n).replace('.','_')}"><div class="h"><b>${n}</b><h2>${t}</h2><span>${s}</span></div>${body}</section>`;
const spark=(pts,c,lb)=>{if(pts.length<2)return '';const v=pts.map(e=>e[1]),m=Math.max(...v),n=Math.min(...v),r=m-n||1,w=100/v.length;return `<svg viewBox="0 0 100 26" width="100%" height="26" preserveAspectRatio="none" aria-label="แนวโน้ม ${lb}"><polyline fill="none" stroke="${c}" stroke-width="1.8" vector-effect="non-scaling-stroke" points="${v.map((x,i)=>(i/(v.length-1)*100).toFixed(1)+','+(24-(x-n)/r*22).toFixed(1)).join(' ')}"/>${pts.map((e,i)=>`<rect class="hit" x="${(i*w).toFixed(2)}" y="0" width="${w.toFixed(2)}" height="26" data-tip="${esc(`<b>${fd(e[0])}</b><div class="tr"><span>${lb}</span><b>${fm(e[1],e[1]<100?1:0)}</b></div>`)}"/>`).join('')}</svg>`};
const NARROW=()=>innerWidth<640; // จอแคบ (มือถือ)
let LAST=null; // อาร์กิวเมนต์ render ล่าสุด ไว้วาดใหม่เมื่อขนาดจอข้ามจุดเปลี่ยน
let CMP={len:1,pa:'',pb:''}; // ช่วงเปรียบเทียบ (จำนวนวัน + วันที่เริ่ม/สิ้นสุดของช่วงก่อนหน้า) ตั้งค่าใหม่ทุกครั้งที่ค้นหา
const cmpDate=t=>t?`${t.slice(8)}/${t.slice(5,7)}/${+t.slice(0,4)+543}`:'';
const cmpTxt=()=>`เทียบ ${CMP.len} วัน · ${cmpDate(CMP.pa)}${CMP.len>1?' – '+cmpDate(CMP.pb):''}`;
const NOCMP='<em style="color:var(--mut);font-weight:500">ไม่มีช่วงเปรียบเทียบ</em>';
const delta=(c,p,inv,u='')=>{if(!p)return NOCMP+`<small class="pv">${cmpTxt()}</small>`;const d=(c-p)/p*100,g=inv?d<0:d>0;return `<em class="${g?'up':'dn'}">${d>=0?'▲':'▼'} ${fm(Math.abs(d),1)}% vs ช่วงก่อน</em><small class="pv">ช่วงก่อน <b>${fm(p)}</b> ${u}<br>${cmpTxt()}</small>`};
const kpi=(l,v,u,c,p,inv,sr,col='#0b7a8a')=>`<div class="k"><i>${l}</i><strong>${v}<u>${u}</u></strong>${delta(c,p,inv,u)}${sr?spark(sr,col,l):''}</div>`;
const bars=(rows,unit)=>{const m=Math.max(...rows.map(r=>r[1]),1);return rows.length?rows.map(r=>`<div class="bar"><span>${r[0]}</span><div><u style="width:${r[1]/m*100}%;background:${r[2]||'linear-gradient(90deg,#0b7a8a,#14a3a8)'}"></u></div><span>${fm(r[1],unit?1:0)}${unit||''}</span></div>`).join(''):'<div class="nd">ไม่มีข้อมูล</div>'};
const group=(a,kf,vf)=>{const m={};a.forEach(r=>{const k=kf(r);m[k]=(m[k]||0)+num(vf(r))});return Object.entries(m).sort((x,y)=>y[1]-x[1])};
const donut=(parts,cols,center,size=132,o={})=>{
  const T=parts.reduce((s,p)=>s+p[1],0)||1,R=15.9155,gap=parts.filter(p=>p[1]>0).length>1?.9:0,dark=o.dark,trk=dark?'#ffffff1f':'#eaf0f5',tx=dark?'#fff':'#0e2235',ms=dark?'#9fb4c6':'#5d7186';
  let off=25;const seg=parts.map((p,i)=>{const l=p[1]/T*100,vis=Math.max(l-gap,0),c=cols[i%cols.length],
    tip=esc(`<b>${p[0]}</b><div class="tr"><span><i style="background:${c}"></i>สัดส่วน</span><b>${fm(l,1)}%</b></div>${o.fmtv?`<div class="tr"><span>มูลค่า</span><b>${o.fmtv(p[1])}</b></div>`:''}`),
    e=l>0?`<circle class="dsg" cx="21" cy="21" r="${R}" fill="none" stroke="${c}" stroke-width="6" stroke-linecap="butt" stroke-dasharray="${vis.toFixed(3)} ${(100-vis).toFixed(3)}" stroke-dashoffset="${(off-gap/2).toFixed(3)}" data-tip="${tip}" data-i="${i}"/>`:'';off-=l;return e}).join('');
  const tgt=o.target!=null?(()=>{const a=o.target/100*2*Math.PI-Math.PI/2,x1=21+Math.cos(a)*12.2,y1=21+Math.sin(a)*12.2,x2=21+Math.cos(a)*19.2,y2=21+Math.sin(a)*19.2;return `<line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" stroke="${dark?'#f5b441':'#0e2235'}" stroke-width="1.1" stroke-linecap="round" data-tip="${esc(`<b>เป้าหมาย</b><div class="tr"><span>ไม่เกิน</span><b>${o.target}%</b></div>`)}"/>`})():'';
  return `<svg viewBox="0 0 42 42" width="${size}" height="${size}" role="img" aria-label="${esc(o.label||'แผนภูมิโดนัท')}: ${esc(parts.map(p=>p[0]+' '+fm(p[1]/T*100,1)+'%').join(', '))}"><circle cx="21" cy="21" r="${R}" fill="none" stroke="${trk}" stroke-width="6"/>${seg}${tgt}<text x="21" y="${o.sub?21.6:23}" text-anchor="middle" font-size="${String(center).length>6?Math.max(3.4,27/String(center).length):6.6}" font-weight="700" fill="${tx}" style="letter-spacing:-.2px">${center}</text>${o.sub?`<text x="21" y="27" text-anchor="middle" font-size="2.9" fill="${ms}">${o.sub}</text>`:''}</svg>`};
const dlegend=(parts,cols,fmtv,dark)=>{const T=parts.reduce((s,p)=>s+p[1],0)||1;return `<div class="dl">${parts.map((p,i)=>`<div><i style="background:${cols[i%cols.length]}"></i><span>${p[0]}</span>${fmtv?`<b>${fmtv(p[1])}</b>`:'<b></b>'}<em>${fm(p[1]/T*100,1)}%</em></div>`).join('')}</div>`};
const PAL=['#0b7a8a','#e9a23b','#2f9e6b','#e2563c','#7c6bd6'];

function chart(keys,series,tgt,note){
  const W=NARROW()?340:620,H=220,mx=Math.max(...series.flatMap(s=>s.v),tgt||0,1),L=Math.max(44,String(fr(mx)).length*5.8+10),span=W-L-12,few=keys.length<=7,x=i=>few?L+(i+.5)*span/keys.length:L+i*span/Math.max(keys.length-1,1),y=v=>H-28-v/mx*(H-48); // ข้อมูลน้อย (≤7 จุด) วางกึ่งกลางกราฟ
  const grid=[0,.5,1].map(f=>`<line x1="${L}" x2="${W-12}" y1="${y(mx*f)}" y2="${y(mx*f)}" stroke="#dce6ee" stroke-dasharray="3 4"/><text x="${L-6}" y="${y(mx*f)+4}" font-size="10" text-anchor="end" fill="#5d7186">${fr(mx*f)}</text>`).join('');
  const area=`<polygon fill="#0b7a8a" opacity=".1" points="${x(0)},${y(0)} ${series[0].v.map((v,i)=>x(i)+','+y(v)).join(' ')} ${x(keys.length-1)},${y(0)}"/>`;
  const tg=tgt==null?'':`<line x1="${L}" x2="${W-12}" y1="${y(tgt)}" y2="${y(tgt)}" stroke="#e2563c" stroke-width="1.5" stroke-dasharray="6 4"/><text x="${W-14}" y="${y(tgt)-5}" font-size="10" text-anchor="end" fill="#e2563c">เป้าหมาย ${tgt}</text>`;
  const ln=series.map(s=>`<polyline fill="none" stroke="${s.c}" stroke-width="2.6" stroke-linejoin="round" points="${s.v.map((v,i)=>x(i)+','+y(v)).join(' ')}"/>`+(keys.length>40?'':s.v.map((v,i)=>`<circle cx="${x(i)}" cy="${y(v)}" r="3.5" fill="#fff" stroke="${s.c}" stroke-width="2"/>`).join(''))).join('');
  const bw=few?span/keys.length:span/Math.max(keys.length-1,1),hits=keys.map((k,i)=>`<rect class="hit" x="${Math.max(x(i)-bw/2,L)}" y="8" width="${bw}" height="${H-34}" data-tip="${tipOf(k,series,i,{tgt,note})}"/>`).join('');
  const step=keys.length<=8?1:Math.ceil(keys.length/8),tx=keys.map((k,i)=>i%step?'':`<text x="${x(i)}" y="${H-8}" font-size="10" text-anchor="middle" fill="#5d7186">${lab(k)}</text>`).join('');
  return `<div class="lg">${series.map(s=>`<span><i style="background:${s.c}"></i>${s.n}</span>`).join('')}</div><svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="กราฟแนวโน้ม แตะหรือชี้เพื่อดูรายละเอียด">${grid}${tg}${area}${ln}${hits}${tx}</svg>`;
}



const fd=k=>/^\d{4}-\d{2}-\d{2}$/.test(k)?new Date(k+'T00:00:00').toLocaleDateString('th-TH',{weekday:'long',day:'numeric',month:'long',year:'numeric'}):/^\d{4}-\d{2}$/.test(k)?new Date(k+'-01T00:00:00').toLocaleDateString('th-TH',{month:'long',year:'numeric'}):/^\d{2}:\d{2}$/.test(k)?k+'–'+k.slice(0,2)+':59 น.':k;
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
function tipOf(k,series,i,o={}){
  const f=v=>fm(v,o.dec??(v<100?1:0));let h=`<b>${fd(k)}</b>`;
  series.forEach(s=>{const v=s.v[i],p=i>0?s.v[i-1]:null,dl=p?(v-p)/p*100:null;h+=`<div class="tr"><span><i style="background:${s.c}"></i>${s.n}</span><b>${f(v)}${s.u||''}${dl!=null&&isFinite(dl)?`<em>${dl>=0?'▲':'▼'}${fm(Math.abs(dl),1)}%</em>`:''}</b></div>`});
  if(o.stack)h+=`<div class="tr tt"><span>รวม</span><b>${f(series.reduce((s,x)=>s+x.v[i],0))}${series[0].u||''}</b></div>`;
  if(o.tgt!=null)h+=`<div class="tr tt"><span>เป้าหมาย</span><b>${o.tgt}${series[0].u||''}</b></div>`;
  if(o.note&&k.length==7)h+=`<small>${o.note}</small>`;
  if(series[0].v.length>1&&k.length>5)h+=`<small>% = เปลี่ยนจากจุดก่อนหน้า</small>`;
  return esc(h);
}
const DOWF=['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์'],DOW=['อา.','จ.','อ.','พ.','พฤ.','ศ.','ส.'],lab=k=>k.length>7?(SHORT&&/^\d{4}-\d{2}-\d{2}$/.test(k)?DOW[new Date(k+'T00:00:00').getDay()]+' ':'')+k.slice(8)+'/'+k.slice(5,7):k.length==7?k.slice(5)+'/'+k.slice(2,4):k;
let SHORT=false;
function cols(keys,series,stack,dec=0,note){
  const W=NARROW()?340:620,H=230,n=keys.length||1,tot=keys.map((_,i)=>stack?series.reduce((s,x)=>s+x.v[i],0):Math.max(...series.map(x=>x.v[i]))),mx=Math.max(...tot,1),L=Math.max(44,String(fr(mx,dec)).length*5.8+10),y=v=>H-28-v/mx*(H-50),bw=(W-L-12)/n,g=bw*.8/series.length;
  const grid=[0,.5,1].map(f=>`<line x1="${L}" x2="${W-12}" y1="${y(mx*f)}" y2="${y(mx*f)}" stroke="#dce6ee" stroke-dasharray="3 4"/><text x="${L-6}" y="${y(mx*f)+4}" font-size="10" text-anchor="end" fill="#5d7186">${fr(mx*f,dec)}</text>`).join('');
  const bars=keys.map((k,i)=>{let acc=0;return series.map((s,j)=>{const v=s.v[i],x=L+i*bw+(stack?bw*.15:bw*.1+j*g),yy=stack?y(acc+v):y(v);acc+=v;return `<rect x="${x}" y="${yy}" width="${stack?bw*.7:g*.92}" height="${Math.max(y(0)-y(v),0)}" rx="2" fill="${s.c}"/>`}).join('')}).join('');
  const hits=keys.map((k,i)=>`<rect class="hit" x="${L+i*bw}" y="8" width="${bw}" height="${H-34}" data-tip="${tipOf(k,series,i,{stack,dec,note})}"/>`).join('');
  const st=n<=10?1:Math.ceil(n/10),tx=keys.map((k,i)=>i%st?'':`<text x="${L+i*bw+bw/2}" y="${H-8}" font-size="10" text-anchor="middle" fill="#5d7186">${lab(k)}</text>`).join('');
  return `<div class="lg">${series.map(s=>`<span><i style="background:${s.c}"></i>${s.n}</span>`).join('')}</div><svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="กราฟแท่ง แตะหรือชี้เพื่อดูรายละเอียด">${grid}${bars}${hits}${tx}</svg>`;
}
function deepCharts(cur,d,keys,keyf,erR){
  const mvA=f=>keys.map(k=>avg(d.filter(r=>keyf(r.record_date)===k),f)||0),mvS=(rows,f)=>keys.map(k=>sum(rows.filter(r=>keyf(r.record_date)===k),f));
  const dd={};[...new Set(d.map(r=>r.record_date))].forEach(s=>{const w=new Date(s).getUTCDay();dd[w]=(dd[w]||0)+1});
  const nd=Math.max(new Set(cur.hourly.map(r=>r.record_date)).size,1),H24=[...Array(24).keys()];
  const hp=t=>H24.map(h=>sum(cur.hourly.filter(r=>r.patient_type===t&&parseInt(r.time_hour)===h),r=>r.service_count)/nd);
  const heat=t=>{const m={};cur.hourly.filter(r=>r.patient_type===t).forEach(r=>{const k=new Date(r.record_date).getUTCDay()+'-'+parseInt(r.time_hour);m[k]=(m[k]||0)+num(r.service_count)});
    const v=(w,h)=>(m[w+'-'+h]||0)/(dd[w]||1),mx=Math.max(...Object.keys(m).map(k=>v(...k.split('-'))),1),rgb=t==='ER'?'226,86,60':'11,122,138';
    return `<div style="display:grid;grid-template-columns:30px repeat(24,1fr);gap:2px;font-size:10px;color:#5d7186">`+[...Array(7).keys()].map(w=>`<span style="align-self:center">${DOW[w]}</span>`+H24.map(h=>`<i style="height:22px;border-radius:3px;background:rgba(${rgb},${(.06+.94*v(w,h)/mx).toFixed(2)})" data-tip="${esc(`<b>วัน${DOWF[w]} ${String(h).padStart(2,'0')}:00–${String(h).padStart(2,'0')}:59 น.</b><div class="tr"><span>เฉลี่ย ${t}</span><b>${fm(v(w,h),1)} ราย/ชม.</b></div><small>เฉลี่ยจาก ${dd[w]||0} วัน${DOWF[w]}ในช่วงที่เลือก</small>`)}"></i>`).join('')).join('')+`<span></span>`+H24.map(h=>`<span style="text-align:center">${h%3?'':h}</span>`).join('')+`</div><p class="nd" style="padding:6px">สีเข้ม = ผู้ป่วยหนาแน่น (ค่าเฉลี่ยต่อชั่วโมง)</p>`};
  const wk=[...Array(7).keys()].map(w=>[DOW[w],(sum(d.filter(r=>new Date(r.record_date).getUTCDay()===w),r=>r.opd_daily_count))/(dd[w]||1)]);
  const E=r=>num(r.er_his_income),O=r=>num(r.opd_his_income)-E(r);
  const W=(n,t,s,b)=>sec(n,t,s,keys.length?b:'<div class="nd">ไม่มีข้อมูล</div>','w6');
  return `<div class="h" style="grid-column:span 12;margin:10px 0 -4px"><h2 style="font-size:18px">กราฟเชิงลึก</h2><span>Deep-dive Analytics</span></div>`+
   W(11,'อัตราครองเตียงเทียบเป้าหมาย (%)','Bed Occupancy vs Target',chart(keys,[{n:'อัตราครองเตียง',c:'#0b7a8a',u:'%',v:keys.map((_,i)=>{const r=d.filter(x=>keyf(x.record_date)===keys[i]),t=avg(r,x=>x.ipd_total_beds);return t?(avg(r,x=>x.ipd_current_beds)||0)/t*100:0})}],TARGET.occ,'ค่าเฉลี่ยทั้งเดือน'))+
   W(12,'รับใหม่ เทียบ จำหน่าย','Admission vs Discharge',cols(keys,[{n:'รับใหม่',c:'#2f9e6b',u:' ราย',v:mvS(d,r=>r.ipd_new_admit_daily)},{n:'จำหน่าย',c:'#7c6bd6',u:' ราย',v:mvS(d,r=>r.ipd_discharged_daily)}],false,0,'ผลรวมทั้งเดือน'))+
   W(13,'รายได้แยกประเภท (บาท)','Revenue Breakdown',cols(keys,[{n:'OPD',c:'#0b7a8a',u:' บาท',v:mvS(d,O)},{n:'IPD',c:'#2f9e6b',u:' บาท',v:mvS(d,r=>r.ipd_his_discharge_income)},{n:'ER',c:'#e2563c',u:' บาท',v:mvS(d,E)}],true,0,'ผลรวมทั้งเดือน'))+
   W(14,'เวลารอแต่ละขั้นตอน (นาที)','Waiting Time by Stage',cols(keys,[{n:'ลงทะเบียน→คัดกรอง',c:'#8aa0b3',u:' นาที',v:mvA(r=>r.avg_wait_reg_to_triage)},{n:'รอพบแพทย์',c:'#e9a23b',u:' นาที',v:mvA(r=>r.avg_wait_for_doctor)},{n:'ตรวจ',c:'#0b7a8a',u:' นาที',v:mvA(r=>r.avg_doctor_consult_time)},{n:'รอรับยา',c:'#7c6bd6',u:' นาที',v:mvA(r=>r.avg_wait_for_pharmacy)}],true,1,'ค่าเฉลี่ยทั้งเดือน'))+
   W(15,'ช่วงเวลาที่ผู้ป่วยมาใช้บริการ','Hourly Arrival Profile',chart(H24.map(h=>String(h).padStart(2,'0')+':00'),[{n:'OPD',c:'#0b7a8a',u:' ราย/ชม.',v:hp('OPD')},{n:'ER',c:'#e2563c',u:' ราย/ชม.',v:hp('ER')}]))+
   W(16,'OPD เฉลี่ยตามวันในสัปดาห์','Weekday Pattern',bars(wk.map(w=>[w[0],w[1],'linear-gradient(90deg,#0b7a8a,#14a3a8)'])))+
   W(17,'Heatmap OPD: วัน × ชั่วโมง','OPD Peak Hours',heat('OPD'))+
   W(18,'Heatmap ER: วัน × ชั่วโมง','ER Peak Hours',heat('ER'));
}

