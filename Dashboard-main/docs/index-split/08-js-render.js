function render(cur,prev,a,b){
  SHORT=(new Date(b)-new Date(a))/864e5<=13;
  const d=cur.daily,pd=prev.daily,days=d.length||1,span=(new Date(b)-new Date(a))/864e5;
  const ser=(rows,f)=>group(rows,r=>r.record_date,f).sort((x,y)=>x[0]<y[0]?-1:1);
  const erR=cur.hourly.filter(r=>r.patient_type==='ER'),erP=prev.hourly.filter(r=>r.patient_type==='ER');
  const opd=sum(d,r=>r.opd_daily_count),adm=sum(d,r=>r.ipd_new_admit_daily),dis=sum(d,r=>r.ipd_discharged_daily),er=sum(erR,r=>r.service_count);
  const BO=bedStats(cur.bed_occupancy),BOp=bedStats(prev.bed_occupancy),hasB=BO.T>0; // เตียง/ใช้งานจาก hospital_bed_occupancy_stats (ถ้าไม่มีใช้ daily เดิม)
  const lastBeds=rs=>{const r=(rs||[]).filter(x=>+x.ipd_total_beds>0).reduce((m,x)=>!m||String(x.record_date)>String(m.record_date)?x:m,null);return r?+r.ipd_total_beds:0}; // เตียงทั้งหมด = ค่าล่าสุดของ ipd_total_beds ในช่วงที่เลือก
  const tot=lastBeds(d)||(hasB?BO.T:0),used=hasB?BO.U:(avg(d,r=>r.ipd_current_beds)||0),occ=tot?used/tot*100:0;
  const pt=lastBeds(pd)||(BOp.T>0?BOp.T:0),pocc=pt?(BOp.T>0?BOp.U:(avg(pd,r=>r.ipd_current_beds)||0))/pt*100:0;
  const wait=avg(d,r=>r.avg_wait_for_doctor),consult=avg(d,r=>r.avg_doctor_consult_time),los=avg(d,r=>r.ipd_avg_length_of_stay);
  const iO=sum(d,r=>r.opd_his_income),iI=sum(d,r=>r.ipd_his_discharge_income),iE=sum(d,r=>r.er_his_income),inc=iO+iI;
  const pinc=sum(pd,r=>r.opd_his_income)+sum(pd,r=>r.ipd_his_discharge_income);
  const readmit=avg(d,r=>r.readmit_28days_pct),proc=avg(d,r=>r.avg_total_process_time);
  const keyf=span>62?(s=>s.slice(0,7)):(s=>s),keys=[...new Set(d.map(r=>keyf(r.record_date)))].sort();
  const mv=(rows,f)=>keys.map(k=>sum(rows.filter(r=>keyf(r.record_date)===k),f));
  const flow=[['ลงทะเบียน→คัดกรอง',avg(d,r=>r.avg_wait_reg_to_triage)],['รอพบแพทย์',wait],['ตรวจโดยแพทย์',consult],['รอรับยา',avg(d,r=>r.avg_wait_for_pharmacy)],['รวมทั้งกระบวนการ',proc]];
  const dep=group(cur.department,r=>r.department,r=>r.visit_count).slice(0,10);
  const tri=group(cur.er_triage,r=>r.triage_level_name,r=>r.patient_count).sort((x,y)=>x[0]<y[0]?-1:1),trT=sum(tri,r=>r[1])||1;
  const dr={};cur.doctor_clinic.forEach(r=>{const o=dr[r.doctor_code]||(dr[r.doctor_code]={n:r.doctor_name,c:r.clinic_name,v:0,p:0,a:0});o.v+=num(r.visit_count);o.p+=num(r.patient_count);o.a+=num(r.admit_count)});
  const drs=Object.values(dr).sort((x,y)=>y.v-x.v).slice(0,8);
  const pay=group(cur.pttype,r=>r.pttype_name,r=>r.his_income),payT=sum(pay,r=>r[1])||1;
  const al=[['อัตราการครองเตียง',occ,TARGET.occ,'%'],['เวลารอพบแพทย์',wait,TARGET.wait,' นาที'],['ระยะเวลาตรวจแพทย์',consult,TARGET.consult,' นาที'],['Readmit 28 วัน',readmit,TARGET.readmit,'%'],['เวลารวมทั้งกระบวนการ OPD',proc,TARGET.total,' นาที']];
  const deep=deepCharts(cur,d,keys,keyf,erR);
  const gcol=occ>TARGET.occ?'#e2563c':'#14a3a8';
  $('#app').innerHTML=
   sec(1,'ภาพรวมโรงพยาบาล','Hospital KPI Summary',`<div class="hero"><div class="gauge"><small>อัตราครองเตียง</small>${donut([['เตียงที่ครอง',occ],['เตียงว่าง',Math.max(100-occ,0)]],[gcol,'#ffffff26'],fm(occ,0)+'%',160,{dark:1,sub:'ครองเตียง',target:TARGET.occ,label:'อัตราครองเตียง'})}<small style="margin-top:4px">${fm(used)} / ${fm(tot)} เตียง</small><small style="color:${occ>TARGET.occ?'#ff9d8a':'#7fe0c0'};opacity:1;margin-top:2px">${occ>TARGET.occ?'▲ เกินเป้า':'● อยู่ในเกณฑ์'} (เป้า ≤ ${TARGET.occ}%)</small></div><div class="kp">${
     kpi('OPD ผู้ป่วยนอก',fm(opd),'ครั้ง',opd,sum(pd,r=>r.opd_daily_count),0,ser(d,r=>r.opd_daily_count))+
     kpi('IPD รับไว้รักษา',fm(adm),'ราย',adm,sum(pd,r=>r.ipd_new_admit_daily),0,ser(d,r=>r.ipd_new_admit_daily),'#2f9e6b')+
     kpi('ER ผู้ป่วยฉุกเฉิน',fm(er),'ครั้ง',er,sum(erP,r=>r.service_count),0,ser(erR,r=>r.service_count),'#e2563c')+
     kpi('จำหน่ายผู้ป่วยใน',fm(dis),'ราย',dis,sum(pd,r=>r.ipd_discharged_daily),0,ser(d,r=>r.ipd_discharged_daily),'#7c6bd6')+
     kpi('เวลารอพบแพทย์',fm(wait,1),'นาที',wait,avg(pd,r=>r.avg_wait_for_doctor),1,ser(d,r=>r.avg_wait_for_doctor),'#e9a23b')+
     kpi('ระยะเวลาตรวจแพทย์',fm(consult,1),'นาที',consult,avg(pd,r=>r.avg_doctor_consult_time),1,ser(d,r=>r.avg_doctor_consult_time),'#0b7a8a')+
     kpi('วันนอนเฉลี่ย',fm(los,1),'วัน',los,avg(pd,r=>r.ipd_avg_length_of_stay),1,ser(d,r=>r.ipd_avg_length_of_stay),'#7c6bd6')+
     kpi('รายได้รวม',fm(inc),'บาท',inc,pinc,0,ser(d,r=>num(r.opd_his_income)+num(r.ipd_his_discharge_income)))}</div></div>`,'w12')+
   sec('B','อาคารโรงพยาบาล 3 มิติ','Hospital Campus 3D · 7.3874°N 99.6671°E','<div id="b3host"></div>','w12')+
   sec(2,'แนวโน้มจำนวนผู้ป่วย','Patient Volume Trend',keys.length?chart(keys,[{n:'OPD',c:'#0b7a8a',u:' ครั้ง',v:mv(d,r=>r.opd_daily_count)},{n:'IPD รับใหม่',c:'#2f9e6b',u:' ราย',v:mv(d,r=>r.ipd_new_admit_daily)},{n:'ER',c:'#e2563c',u:' ครั้ง',v:mv(erR,r=>r.service_count)}],null,'ผลรวมทั้งเดือน'):'<div class="nd">ไม่มีข้อมูล</div>','w6')+
   sec(3,'ผู้ป่วยตามแผนก','Patient by Department',bars(dep),'w6')+
   sec(4,'ระยะเวลารอ OPD','OPD Flow & Waiting Time',nowStamp(a,b)+bars(flow.map(f=>[f[0],f[1]||0,PAL[0]]),' นาที'))+
   sec(5,'บริหารเตียงผู้ป่วยใน','IPD & Bed Management',`<div class="dn2">${donut([['เตียงที่ครอง',used],['เตียงว่าง',Math.max(tot-used,0)]],[gcol,'#c9d6e2'],fm(occ,0)+'%',132,{sub:'ครองเตียง',target:TARGET.occ,label:'อัตราครองเตียง',fmtv:v=>fm(v)+' เตียง'})}<div style="flex:1;min-width:150px"><div style="color:var(--mut);font-size:12px">เตียงทั้งหมด</div><b style="font-size:24px">${fm(tot)}</b>${dlegend([['ครอง',used],['ว่าง',Math.max(tot-used,0)]],[gcol,'#c9d6e2'],v=>fm(v))}</div></div><table style="margin-top:8px"><tr><th>รับใหม่</th><th>จำหน่าย</th><th>วันนอนเฉลี่ย</th></tr><tr><td>${fm(adm)}</td><td>${fm(dis)}</td><td>${fm(los,1)} วัน</td></tr></table>${wardBedHtml(cur.bed_occupancy,IPDERR.bed_occupancy)}`)+
   sec(6,'งานอุบัติเหตุฉุกเฉิน','Emergency Department',`<div class="kp" style="grid-template-columns:1fr 1fr">${kpi('ผู้ป่วย ER',fm(er),'ครั้ง',er,sum(erP,r=>r.service_count),0)}${kpi('เฉลี่ยต่อวัน',fm(er/days,1),'ครั้ง',0,0)}</div><p style="margin:12px 0 2px;font-weight:600">ระดับความเร่งด่วน (Triage)</p>${bars(tri.map((t,i)=>[t[0]+' ('+fm(t[1]/trT*100,0)+'%)',t[1],['#e2563c','#f08a3c','#e9a23b','#2f9e6b','#8aa0b3'][i%5]]))}`)+
   sec(7,'ผลปฏิบัติงานแพทย์/คลินิก','Doctor & Clinic Performance',drs.length?`<table><tr><th>แพทย์ / คลินิก</th><th>ครั้ง</th><th>คน</th><th>Admit</th></tr>${drs.map(r=>`<tr><td><b>${r.n||'-'}</b><br><small style="color:#5d7186">${r.c||''}</small></td><td>${fm(r.v)}</td><td>${fm(r.p)}</td><td>${fm(r.a)}</td></tr>`).join('')}</table>`:'<div class="nd">ไม่มีข้อมูล</div>')+
   sec(8,'วิเคราะห์รายได้','Financial & Revenue Analysis',`<div class="dn2">${donut([['OPD',iO-iE],['IPD',iI],['ER',iE]],PAL,fm(inc),132,{sub:'บาท',label:'สัดส่วนรายได้',fmtv:v=>fm(v)+' บาท'})}${dlegend([['OPD',iO-iE],['IPD',iI],['ER',iE]],PAL,v=>fm(v)+' บาท')}</div><p style="margin:12px 0 2px;font-weight:600">ตามสิทธิการรักษา (OPD)</p>${bars(pay.slice(0,5).map(p=>[p[0],p[1]/payT*100,'#2f9e6b']),'%')}`)+
   sec(9,'คุณภาพบริการ','Quality',`<div class="kp" style="grid-template-columns:1fr">${kpi('อัตรากลับมารักษาซ้ำภายใน 28 วัน',fm(readmit,1),'%',readmit,avg(pd,r=>r.readmit_28days_pct),1,ser(d,r=>r.readmit_28days_pct),'#e9a23b')}</div><p class="nd">ความพึงพอใจผู้ป่วยยังไม่มีข้อมูล — เพิ่มตารางแบบสำรวจเพื่อแสดงส่วนนี้</p>`)+
   // [เพิ่มใหม่] การ์ดรายรับแยกตามแผนก/หอผู้ป่วย/สิทธิ (เป็นกล่องว่าง #dpc แล้ว dpRender() ค่อยเติมเนื้อหา)
   sec('8.1','รายรับแยกตามแผนก หอผู้ป่วย และสิทธิการรักษา','Revenue by Department, Ward & Patient Right','<div id="dpc"></div>','w12')+
   sec(10,'แจ้งเตือนและสิ่งที่ต้องดำเนินการ','Hospital Alert & Action',`<table class="al"><tr><th>เรื่อง</th><th>ค่าปัจจุบัน</th><th>เป้าหมาย</th><th>สถานะ</th></tr>${al.map(r=>{const g=r[1]==null?null:r[1]<=r[2];return `<tr class="${g===false?'b':''}"><td>${r[0]}</td><td><b>${fm(r[1],1)}${r[3]}</b></td><td>≤ ${r[2]}${r[3]}</td><td><span class="chip ${g===false?'bad':'ok'}">${g==null?'-':g?'ปกติ':'ต้องปรับปรุง'}</span></td></tr>`}).join('')}</table>`,'w12')+deep;
  { // ส่งข้อมูลให้การ์ดอาคาร 3 มิติ: เตียงล่าสุดรายหอผู้ป่วย + ผู้ป่วยนอก/ER ของวันล่าสุดในช่วงที่เลือก
    const bw={}; // เตียงล่าสุดของแต่ละหอ
    (cur.bed_occupancy||[]).forEach(r=>{const o=bw[r.ward];if(!o||String(r.record_date)>String(o.record_date))bw[r.ward]=r}); // เลือกแถววันที่ใหม่สุดต่อหอ
    const ld=d.reduce((m,r)=>String(r.record_date)>m?String(r.record_date):m,''); // วันล่าสุดในช่วงที่เลือก
    window.__b3data={wards:Object.values(bw).map(r=>({code:r.ward,name:r.ward_name,total:num(r.total_beds),used:num(r.used_beds),male:num(r.male_count),female:num(r.female_count),date:r.record_date})),opdLast:sum(d.filter(r=>r.record_date===ld),r=>r.opd_daily_count),erLast:sum(erR.filter(r=>r.record_date===ld),r=>r.service_count),ld,opd,er,date:Object.values(bw).map(r=>r.record_date).sort().pop()}; // ข้อมูลสำหรับอาคาร 3 มิติ
    window.b3Mount&&window.b3Mount() // สั่งวาง/อัปเดตการ์ดอาคาร
  }
  // [เพิ่มใหม่] ส่งข้อมูลแผนก หอผู้ป่วย และสิทธิ (ช่วงปัจจุบัน/ก่อนหน้า) เข้าสู่การ์ด
  DPS={dept:cur.department||[],pt:cur.pttype||[],ward:cur.ward||[],ipt:cur.ipd_pttype||[]}; // ข้อมูลช่วงปัจจุบัน
  DPQ={dept:prev.department||[],pt:prev.pttype||[],ward:prev.ward||[],ipt:prev.ipd_pttype||[]}; // ข้อมูลช่วงก่อนหน้า
  dpRender(); // วาดการ์ดลงหน้าจอ
}


/* ===== ส่วนเพิ่มตามโครงเว็บสถิติโรงพยาบาล: รายงานรายเดือน / KPI / รับ–จำหน่ายรายวอร์ด (ข้อมูลจาก Supabase) ===== */
const XT=[{k:'opd_daily_count',n:'ผู้ป่วยนอก (OPD)',u:'ครั้ง',g:'sum'},{k:'ipd_new_admit_daily',n:'รับใหม่ IPD',u:'ราย',g:'sum'},{k:'ipd_discharged_daily',n:'จำหน่าย IPD',u:'ราย',g:'sum'},{k:'ipd_avg_length_of_stay',n:'วันนอนเฉลี่ย',u:'วัน',g:'avg',d:1},{k:'opd_his_income',n:'รายได้ OPD',u:'บาท',g:'sum'},{k:'ipd_cash_discharge_income',n:'รายได้ IPD',u:'บาท',g:'sum'}];
let XD=null,xk=XT[0];
