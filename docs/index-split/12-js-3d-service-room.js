function init3D(){
const LIVE3D={win:15,pad:60,speed:1}; // win=ความยาวช่วงย้อนหลังที่เล่นซ้ำ (นาที) · pad=ดึงข้อมูลก่อนช่วงเล่นเพิ่มกี่นาที (ใช้รู้ว่าใครนั่งรออยู่ตอนเริ่ม และตัดผู้ป่วยค้างเก่าที่เงียบไปนานออก) · speed=ความเร็วรีเพลย์ (1 = เวลาจริง: เล่นจบ 15 นาทีพอดีเมื่อเวลาจริงผ่านไป 15 นาที ช่วงถัดไปจึงต่อกันพอดี · 5 = วนเล่น 15 นาทีล่าสุดซ้ำทุก 3 นาที)
const nowSec=()=>(Date.now()/1000+25200)%86400; // เวลาปัจจุบันเป็นวินาทีนับจากเที่ยงคืน (เวลาไทย UTC+7)
const rwin=()=>{const e=nowSec();return[Math.max(0,e-LIVE3D.win*60),e]}; // ช่วงย้อนหลัง [เริ่ม,จบ] ณ ตอนนี้ เป็นวินาทีนับจากเที่ยงคืนเวลาไทย
const hhmm=t=>{t=Math.max(0,Math.floor(t))%86400;return String(Math.floor(t/3600)).padStart(2,'0')+':'+String(Math.floor(t%3600/60)).padStart(2,'0')}; // แปลงวินาทีเป็น HH:MM
const TG={triage:10,doctor:20,consult:15,pharm:15,cash:15,total:60,occ:85}; // เป้าหมายเวลา (นาที) / % เตียง
const $=s=>document.querySelector('#v3 '+s),n=v=>+v||0,fm=(v,d=0)=>v==null?'-':v.toLocaleString('th-TH',{maximumFractionDigits:2});
const val=v=>v===null||v===undefined||v===''||!isFinite(+v)?null:+v;

/* ---------- data ---------- */
const sb=async p=>{const c=cfg(),r=await fetch(c.u+'/rest/v1/'+p,{headers:{apikey:c.k,Authorization:'Bearer '+c.k}});if(!r.ok){let m='';try{m=(await r.text()).replace(/\s+/g,' ').slice(0,160)}catch(e){}throw new Error(p.split('?')[0]+' HTTP '+r.status+(m?' — '+m:''))}return san(await r.json())};
async function loadData(day){
  if(!cfg().u||!cfg().k){const R=x=>Math.round(Math.random()*x);return{day:day||new Date().toISOString().slice(0,10),demo:1,q:demoQ(day||new Date().toISOString().slice(0,10)),er:48+R(10),
    d:{opd_daily_count:260+R(40),ipd_current_beds:62,ipd_total_beds:80,ipd_new_admit_daily:18,ipd_discharged_daily:16,ipd_avg_length_of_stay:3.8,readmit_28days_pct:7.2,avg_wait_reg_to_triage:9,avg_wait_for_doctor:26,avg_doctor_consult_time:12,avg_wait_for_pharmacy:17,avg_total_process_time:58},
    oh:Array.from({length:24},(_,h)=>({time_hour:String(h).padStart(2,'0')+':00',service_count:String(h<7||h>20?R(3):12+R(20))})),
    st:[[1,150],[2,22],[3,9],[4,14],[5,31],[6,3],[7,0]].map(a=>({stage_order:a[0],patient_count:a[1]})),
    tr:[[1,2],[2,9],[3,22],[4,15],[5,5]].map(a=>({triage_level_id:a[0],triage_level_name:'Level '+a[0],patient_count:a[1]}))}}
  day=day||new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Bangkok'}); // 3D แสดงข้อมูลของวันนี้ (เวลาไทย) เสมอ ไม่เลือกวันย้อนหลัง
  /* ข้อมูลเส้นทางผู้ป่วย: อ่านจาก hospital_visit_flow_stats เป็นหลัก — ถ้าว่าง/อ่านไม่ได้ ค่อยถอยไปใช้ hospital_queue_call_log_stats */
  let qerr=null,qsrc=FLOW_TABLE,flowErr=null; // qerr=ข้อความ error, qsrc=ชื่อตารางที่ใช้จริง, flowErr=error ของตารางเส้นทาง
  const [d,st,tr,hr,oh,fr]=await Promise.all([ // ดึงข้อมูลทุกตารางพร้อมกัน
    sb(`hospital_daily_stats?record_date=eq.${day}&limit=1`).catch(()=>[]), // สถิติรายวัน (พลาดให้เป็นว่าง)
    sb(`hospital_service_stage_stats?record_date=eq.${day}`).catch(()=>[]), // สถิติแต่ละขั้นตอนบริการ
    sb(`hospital_er_triage_stats?record_date=eq.${day}`).catch(()=>[]), // สถิติคัดกรอง ER
    sb(`hospital_hourly_stats?record_date=eq.${day}&patient_type=eq.ER`).catch(()=>[]), // สถิติ ER รายชั่วโมง
    sb(`hospital_hourly_stats?record_date=eq.${day}&patient_type=eq.OPD&order=time_hour`).catch(()=>[]), // สถิติ OPD รายชั่วโมง
    loadFlow(day).catch(e=>{flowErr=e.message;return null}) // เส้นทางผู้ป่วยรายคน (พลาดให้จด error แล้วคืน null)
  ]);
  let q=null,fa=null; // q=เหตุการณ์เรียกคิวที่แปลงแล้ว, fa=ค่าเฉลี่ยที่คำนวณจากตาราง
  if(fr&&fr.length){ // ถ้าตารางเส้นทางมีข้อมูลของวันนั้น
    q=flowToLog(fr,day); // แปลงเป็นเหตุการณ์ให้ฉาก 3D ใช้
    fa=flowStats(fr) // คำนวณค่าเฉลี่ยเวลารอ
  }else{ // ไม่มีข้อมูล → ถอยไปใช้ตารางบันทึกการเรียกคิวเดิม
    qsrc=QLOG_TABLE; // จดว่าใช้ตารางเดิม
    q=await loadQ(day).catch(e=>{qerr=e.message;return null}); // อ่านตารางเดิม ถ้าพลาดจด error ไว้
    if(!q&&flowErr){qsrc=FLOW_TABLE;qerr=flowErr+' · '+qerr} // พลาดทั้งคู่ → รายงาน error ของตารางหลักรวมกับของตารางเดิม
  }
  const base=d[0]||{},dm=fa?{...base,...fa.d}:base; // base=สถิติรายวัน, dm=ค่าที่ทับด้วยค่าเฉลี่ยจากตารางเส้นทาง
  if(fa&&!n(base.opd_daily_count))dm.opd_daily_count=fa.n; // ไม่มียอด OPD รายวัน → ใช้จำนวน vn แทน
  const todayTH=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Bangkok'}); // วันที่วันนี้ตามเวลาไทย
  return{day,d:dm,st,tr,er:hr.reduce((s,r)=>s+n(r.service_count),0),oh:fa?fa.oh:(oh||[]),q,qerr,qsrc,fa,live:day===todayTH}; // ส่งข้อมูลทั้งหมดให้ฉาก 3D
}
function derive(D){
  const d=D.d,sg=o=>n((D.st.find(r=>+r.stage_order===o)||{}).patient_count),opd=n(d.opd_daily_count);
  const tri=val(d.avg_wait_reg_to_triage),doc=val(d.avg_wait_for_doctor),con=val(d.avg_doctor_consult_time),ph=val(d.avg_wait_for_pharmacy),tot=val(d.avg_total_process_time);
  const used=n(d.ipd_current_beds),beds=n(d.ipd_total_beds),occ=beds?used/beds*100:null,trT=D.tr.reduce((s,r)=>s+n(r.patient_count),0);
  const S=[
   {id:'reg',name:'ลงทะเบียน',en:'Registration',v:opd,u:'ครั้ง/วัน',w:null,tg:null,cnt:opd,rows:[['ผู้ป่วยนอกวันนี้',fm(opd)+' ครั้ง'],['ผู้ป่วย ER',fm(D.er)+' ครั้ง']]},
   {id:'tri',name:'คัดกรอง',en:'Triage',v:tri,u:'นาที (รอคัดกรอง)',w:tri,tg:TG.triage,cnt:trT,rows:[['เวลารอหลังลงทะเบียน',tri==null?'-':fm(tri,1)+' นาที'],['เป้าหมาย','≤ '+TG.triage+' นาที'],...D.tr.sort((a,b)=>a.triage_level_id-b.triage_level_id).map(r=>[r.triage_level_name,fm(n(r.patient_count))+' ราย'])]},
   {id:'doc',name:'พบแพทย์',en:'Doctor',v:doc,u:'นาที (รอพบแพทย์)',w:doc,tg:TG.doctor,cnt:sg(2),rows:[['เวลารอพบแพทย์',doc==null?'-':fm(doc,1)+' นาที'],['เป้าหมาย','≤ '+TG.doctor+' นาที'],['กำลังตรวจรักษา',fm(sg(2))+' ราย']]},
   {id:'trt',name:'ตรวจรักษา',en:'Treatment',v:con,u:'นาที (ตรวจโดยแพทย์)',w:con,tg:TG.consult,cnt:D.er,rows:[['เวลาตรวจเฉลี่ย',con==null?'-':fm(con,1)+' นาที'],['ผู้ป่วยฉุกเฉินวันนี้',fm(D.er)+' ครั้ง'],['Admit/สังเกตอาการ',fm(sg(3))+' ราย']]},
   {id:'lab',name:'ห้องยา / Lab',en:'Pharmacy & Lab',v:ph,u:'นาที (รอรับยา)',w:ph,tg:TG.pharm,cnt:sg(4)+sg(5),rows:[['เวลารอรับยา',ph==null?'-':fm(ph,1)+' นาที'],['รอผลตรวจ',fm(sg(4))+' ราย'],['รอรับยา',fm(sg(5))+' ราย']]},
   {id:'ipd',name:'ผู้ป่วยใน',en:'Inpatient',v:occ,u:'% ครองเตียง',w:occ,tg:TG.occ,cnt:used,pct:1,rows:[['เตียงครอง / ทั้งหมด',fm(used)+' / '+fm(beds)],['รับใหม่',fm(n(d.ipd_new_admit_daily))+' ราย'],['วันนอนเฉลี่ย',d.ipd_avg_length_of_stay==null?'-':fm(+d.ipd_avg_length_of_stay,1)+' วัน']]},
   {id:'dis',name:'จำหน่าย / ติดตาม',en:'Discharge & Follow-up',v:tot,u:'นาที (ทั้งกระบวนการ)',w:tot,tg:TG.total,cnt:sg(1),rows:[['ตรวจเสร็จสิ้น',fm(sg(1))+' ราย'],['เวลารวมทั้งกระบวนการ',tot==null?'-':fm(tot,1)+' นาที'],['จำหน่ายผู้ป่วยใน',fm(n(d.ipd_discharged_daily))+' ราย'],['ส่งต่อ / เสียชีวิต',fm(sg(6))+' / '+fm(sg(7))],['Readmit 28 วัน',d.readmit_28days_pct==null?'-':fm(+d.readmit_28days_pct,1)+'%']]}];
  S.forEach(s=>{s.ratio=s.w!=null&&s.tg?s.w/s.tg:null;s.st=s.ratio==null?'ok':s.ratio<=1?'ok':s.ratio<=1.3?'warn':'bad';s.h=s.ratio!=null?1.2+Math.min(s.ratio,1.8)*2.2:1.2+Math.min(s.cnt/300,1)*3});
  return{S,opd,occ,tot,er:D.er};
}

/* ---------- 3D scene: ห้องโรงพยาบาลจำลอง (ห้องบัตร → ซักประวัติ 7 โต๊ะ → ห้องตรวจ 6 ห้อง → จ่ายยา 1 ช่อง) ---------- */
const COL={ok:0x2fd08a,warn:0xf5b441,bad:0xff5d4a,na:0x8da4b8},CSS={ok:'#2fd08a',warn:'#f5b441',bad:'#ff5d4a',na:'#8da4b8'},STT={ok:'ปกติ',warn:'เฝ้าระวัง',bad:'เกินเป้าหมาย',na:'ยังไม่มีเวลาในระบบ'};
const V=document.querySelector('#v3'),cv=$('#vc'),R=new THREE.WebGLRenderer({canvas:cv,antialias:true});R.setPixelRatio(Math.min(devicePixelRatio,2));R.shadowMap.enabled=true;
const SC=new THREE.Scene();SC.background=new THREE.Color(0x0a1626);SC.fog=new THREE.Fog(0x0a1626,110,240);
const CAM=new THREE.PerspectiveCamera(42,1,.1,300);
SC.add(new THREE.HemisphereLight(0xffffff,0x6d7f90,.95));
const sun=new THREE.DirectionalLight(0xffffff,.75);sun.position.set(-18,42,26);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-54,right:54,top:40,bottom:-40,near:1,far:160});SC.add(sun);
const MC={},MT=(c,o)=>o?new THREE.MeshStandardMaterial({color:c,roughness:.7,...o}):(MC[c]||(MC[c]=new THREE.MeshStandardMaterial({color:c,roughness:.7})));
const box=(w,h,d,c,x,y,z,par,o)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),MT(c,o));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;(par||SC).add(m);return m};
/* พื้น / ผนัง */
const fc=document.createElement('canvas');fc.width=fc.height=64;{const x=fc.getContext('2d');x.fillStyle='#d6dfe5';x.fillRect(0,0,64,64);x.strokeStyle='#bccad4';x.lineWidth=2;x.strokeRect(0,0,64,64)}
const ftex=new THREE.CanvasTexture(fc);ftex.wrapS=ftex.wrapT=THREE.RepeatWrapping;ftex.repeat.set(42,21);
const fl=new THREE.Mesh(new THREE.PlaneGeometry(84,42),new THREE.MeshStandardMaterial({map:ftex,roughness:.9}));fl.rotation.x=-Math.PI/2;fl.position.set(0,0,5);fl.receiveShadow=true;SC.add(fl);
box(86,.6,44,0x13283b,0,-.31,5);


/* พื้นโซน (ผังใหม่ ขยายพื้นที่): บัตรซ้ายหน้า · ซักประวัติกลางหน้า · ตำแหน่ง 1 เก้าอี้กลาง · ตำแหน่ง 2 ข้างเก้าอี้ขวา · ตำแหน่ง 3 หน้าห้องเก็บเงิน/ห้องยา · ห้องตรวจขวา · ทางออกซ้ายบน */
box(22,.05,9,0xdceaf0,-31,.04,16);box(36,.05,8,0xe3e8f3,0,.04,17);box(36,.05,8,0xd9ebdf,0,.04,8.5);box(17,.05,36,0xe8f2e4,31.5,.04,4);box(36,.05,9,0xf0e8dc,3,.04,-11.5);
box(10,.05,10,0xf5e9c8,11,.045,0);box(10,.05,10,0xf5e9c8,-5,.045,0);
box(50,.04,.5,0x2fd08a,-14,.06,-7.2,null,{transparent:true,opacity:.4,emissive:0x2fd08a,emissiveIntensity:.4});box(3.2,.05,3.2,0x2fd08a,-40.2,.07,-12,null,{transparent:true,opacity:.5});
/* เก้าอี้นั่งรอ 16 ตัว (ตำแหน่ง 1) */
const CHS=[];[7,10].forEach(z=>[-10.5,-7.5,-4.5,-1.5,1.5,4.5,7.5,10.5].forEach(x=>{box(.9,.12,.9,0x3f9fd0,x,.5,z);box(.9,.7,.12,0x3f9fd0,x,.95,z-.45);box(.16,.5,.16,0x8a97a3,x,.25,z);CHS.push([x,z])}));
/* เก้าอี้ฝั่งห้องตรวจ/ห้องยา/ห้องเก็บเงิน (แบบเดียวกับตำแหน่ง 1 แต่หมุนตามทิศที่หัน) */
const chairAt=(x,z,ry)=>{const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=ry;SC.add(g);box(.9,.12,.9,0x3f9fd0,0,.5,0,g);box(.9,.7,.12,0x3f9fd0,0,.95,-.45,g);box(.16,.5,.16,0x8a97a3,0,.25,0,g)};
const CHR=[],CHP=[],CHC=[]; // เก้าอี้รอหน้าห้องตรวจ (ห้องละ 2 ตัว) · หน้าห้องยา · หน้าห้องเก็บเงิน
[17,11.8,6.6,1.4,-3.8,-9].forEach(zr=>[28.8,26.4].forEach(cx=>[-1.1,1.1].forEach(d=>{chairAt(cx,zr+d,Math.PI/2);CHR.push([cx,zr+d])}))); // ห้องละ 4 ตัว (2 แถว x 2) ถอยห่างจากประตูห้อง
[[11,CHP],[-5,CHC]].forEach(([c0,arr])=>[-3.6,-1.2,1.2,3.6].forEach(z=>[-3,-1,1,3].forEach(dx=>{chairAt(c0+dx,z,Math.PI);arr.push([c0+dx,z])})));
/* ป้ายเขียว */
const signs=[];
function paintSign(m){const{c,t,t1,t2}=m.userData,x=c.getContext('2d'),W=c.width,H=c.height;x.fillStyle='#1d6b34';x.fillRect(0,0,W,H);x.fillStyle='#fff';x.textAlign='center';x.font=`700 ${Math.round(H*.40)}px "IBM Plex Sans Thai",sans-serif`;x.fillText(t1,W/2,H*.52);x.fillRect(W*.18,H*.6,W*.64,3);x.font=`500 ${Math.round(H*.24)}px "IBM Plex Sans Thai",sans-serif`;x.fillText(t2,W/2,H*.88);t.needsUpdate=true}
function sign(w,h,t1,t2,x,y,z,ry,posts){const c=document.createElement('canvas');c.width=512;c.height=Math.round(512*h/w);const t=new THREE.CanvasTexture(c),m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:t}));m.userData={c,t,t1,t2};m.position.set(x,y,z);m.rotation.y=ry||0;SC.add(m);const m2=new THREE.Mesh(m.geometry,m.material);m2.position.set(x,y,z);m2.rotation.y=(ry||0)+Math.PI;SC.add(m2);signs.push(m);paintSign(m);
  if(posts){const dx=Math.cos(ry||0)*w/2,dz=-Math.sin(ry||0)*w/2;[-1,1].forEach(s=>{const p=new THREE.Mesh(new THREE.CylinderGeometry(.07,.07,y,6),MT(0x8a97a3));p.position.set(x+dx*s,y/2,z+dz*s);SC.add(p)})}return m}
sign(7,2,'ห้องบัตร','Registration',-30,6.4,12.2,0,1);
sign(8,2,'ซักประวัติ','History talking',0,6.8,12.6,0,1);
sign(7,2,'พื้นที่นั่งรอ','Waiting Area',0,5.8,3.2,0,1);
sign(10,2,'ห้องตรวจ','Examination Rooms',41.8,6.6,5,-Math.PI/2,1);
sign(7,2,'จ่ายยา','Pharmacy',11,6.4,-15.9,0,1);
sign(7,2,'ห้องเก็บเงิน','Cashier',-5,6.4,-15.9,0,1);
/* ฟิกเกอร์คน */
const bodyG=new THREE.CylinderGeometry(.22,.28,.8,10),headG=new THREE.SphereGeometry(.22,12,10);
const HM={};const MTc=c=>HM[c]||(HM[c]=MT(c));
const SKIN=[0xf2c9a0,0xe6b88c,0xcf9a6e,0x9b6b47,0x6f4a32],HAIR=[0x1b1410,0x2b1d14,0x4a3222,0x7a5530,0xb8892b,0x8d8d92],SHIRT=[0xe85d75,0x3f9fd0,0x5fb760,0xf0b84a,0x9a7bd6,0xe9ecef,0xe07a3c,0x4aa8a0,0xd6457f,0x2f7fb8],PANT=[0x2d3a5a,0x3d3d44,0x5a4632,0x23405a,0x6b6b72,0x3a2f4a];
const HG={thigh:new THREE.CylinderGeometry(.078,.066,.34,8),shin:new THREE.CylinderGeometry(.062,.05,.36,8),torsoM:new THREE.CylinderGeometry(.21,.18,.56,10),torsoF:new THREE.CylinderGeometry(.18,.15,.5,10),arm:new THREE.CylinderGeometry(.055,.047,.5,8),head:new THREE.SphereGeometry(.17,14,12),hair:new THREE.SphereGeometry(.19,14,10,0,Math.PI*2,0,Math.PI*.55),skirt:new THREE.CylinderGeometry(.16,.28,.3,12),neck:new THREE.CylinderGeometry(.055,.055,.1,8),pony:new THREE.SphereGeometry(.085,8,8),hand:new THREE.SphereGeometry(.055,8,6),shoe:new THREE.BoxGeometry(.11,.07,.2),eye:new THREE.SphereGeometry(.02,6,6)};
/* คนหนึ่งคน: kind = 'm' ชาย | 'f' หญิง | 'c' เด็ก — มีหัว ผม ตา ลำตัว แขน มือ ขา (ต้นขา+หน้าแข้ง) รองเท้า หญิงมีกระโปรงและผมมัด */
function human(shirt,kind,seed){
  let sd=((seed==null?Math.random()*1e5:seed)|0)+7;const rr=()=>{sd=(sd*9301+49297)%233280;return sd/233280},pick=a=>a[Math.floor(rr()*a.length)];
  const f=kind==='f',c=kind==='c',skin=MTc(pick(SKIN)),hairM=MTc(pick(HAIR)),top=MTc(shirt),pantC=pick(PANT),bot=MTc(pantC),shoeM=MTc(0x24242a),g=new THREE.Group(),hip=.7;
  const add=(geo,mat,x,y,z,par)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);(par||g).add(m);return m};
  const leg=x=>{const th=new THREE.Group();th.position.set(x,hip,0);add(HG.thigh,f?skin:bot,0,-.17,0,th);const sh=new THREE.Group();sh.position.y=-.34;add(HG.shin,f?skin:bot,0,-.18,0,sh);add(HG.shoe,shoeM,0,-.375,.04,sh);th.add(sh);g.add(th);return{th,sh}};
  const arm=x=>{const a=new THREE.Group();a.position.set(x,hip+.5,0);add(HG.arm,top,0,-.25,0,a);add(HG.hand,skin,0,-.52,0,a);g.add(a);return a};
  const legs=[leg(-.09),leg(.09)],arms=[arm(-.27),arm(.27)];
  add(f?HG.torsoF:HG.torsoM,top,0,hip+.27,0).castShadow=true;
  if(f)add(HG.skirt,MTc(pantC),0,hip+.02,0);
  add(HG.neck,skin,0,hip+.6,0);
  const hd=new THREE.Group();hd.position.set(0,hip+.78,0);g.add(hd);
  add(HG.head,skin,0,0,0,hd);add(HG.hair,hairM,0,.01,-.01,hd);add(HG.eye,MTc(0x1a1a1a),-.06,.02,.155,hd);add(HG.eye,MTc(0x1a1a1a),.06,.02,.155,hd);
  if(f){add(HG.pony,hairM,0,-.07,-.19,hd).scale.set(1,1.8,1);add(HG.hair,hairM,0,-.05,-.07,hd).scale.set(1,1.2,1)}
  if(c)hd.scale.setScalar(1.22);
  const sc=c?.6:f?.88:.94;g.scale.setScalar(sc);g.userData={legs,arms,s:sc};return g}
const kindOf=n=>{n=Math.abs(n|0);return n%20===7?'c':(n%2?'m':'f')}; // เด็ก 1 ใน 20 = 5% (คนยืนรอคิวกำหนดตามตำแหน่ง)
function person(c,x,z,par,ry,seed){const g=human(c,kindOf(seed|0),seed);g.position.set(x,0,z);g.rotation.y=ry||0;(par||SC).add(g);return g}

/* ===== queue_call_log: called_at, station_id, station_name, queue_no ===== */
const QLOG_TABLE='hospital_queue_call_log_stats'; // ตาราง/วิวที่อ่านคิว (ต้องอยู่ในรายการที่ตัวกลาง /api/sb อนุญาต)
const QSID={}; // กำหนดเองได้: station_id → รหัสจุด เช่น {1:'reg',11:'hx1',21:'ex1',31:'ph',32:'cash'} (ถ้าไม่กำหนดจะแยกจาก station_name)
const hsh=s=>{s=String(s==null?'':s);let h=7;for(let i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))>>>0;return h};
const kindQ=q=>{const h=hsh(q);return h%20===7?'c':(h%2?'m':'f')}; // เลขคิวเดิม = ตัวการ์ตูนหน้าตาเดิมเสมอ
function hmOf(s){s=String(s||'');const m=s.match(/(?:T|\s)(\d\d):(\d\d)/);if(!m)return '';if(/(Z|[+-]\d\d(:?\d\d)?)$/.test(s)){const d=new Date(s);if(!isNaN(d))return new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Bangkok',hour:'2-digit',minute:'2-digit',hour12:false}).format(d)}return m[1]+':'+m[2]}
const hourOf=s=>hmOf(s).slice(0,2);
function stKey(r){const id=r.station_id,nm=String(r.station_name||'');if(QSID[id])return QSID[id];
  const num=(nm.match(/\d+/)||[])[0],pn=num!=null?+num:+id;
  if(/เก็บเงิน|การเงิน|cashier|cash/i.test(nm))return 'cash';
  if(/จ่ายยา|ห้องยา|รับยา|เภสัช|pharm|drug/i.test(nm))return 'ph';
  if(/ห้องตรวจ|exam|room/i.test(nm)){if(num!=null&&(pn<1||pn>6))return null;return 'ex'+((isFinite(pn)&&pn>0?pn-1:hsh(id))%6+1)}
  if(/ซักประวัติ|คัดกรอง|triage|history|screen/i.test(nm)){if(num!=null&&(pn<1||pn>7))return null;return 'hx'+((isFinite(pn)&&pn>0?pn-1:hsh(id))%7+1)}
  if(/บัตร|ลงทะเบียน|regist|card/i.test(nm))return 'reg';
  return null}
function aggLog(rows,w0,w1){ // สรุปเหตุการณ์เรียกคิว: รายชั่วโมงทั้งวัน + เฉพาะหน้าต่างเวลา w0..w1 (วินาที)
  const hrs=Array(24).fill(0),unm={}; // hrs=จำนวนเรียกคิวรายชั่วโมง, unm=ชื่อสถานีที่แมปไม่ได้
  rows.forEach(r=>{ // วนทุกเหตุการณ์
    r._k=stKey(r); // รหัสจุดบริการ
    r._h=hourOf(r.called_at); // ชั่วโมงของเหตุการณ์
    r._s=secOf(r.called_at); // เวลาเป็นวินาที
    const hi=+r._h; // เลขชั่วโมง
    if(r._h!==''&&hi>=0&&hi<24)hrs[hi]++; // นับเข้าช่องชั่วโมงนั้น
    if(!r._k){const u=String(r.station_name||r.station_id);unm[u]=(unm[u]||0)+1} // สถานีที่ไม่รู้จัก
  });
  const inW=r=>r._s>w0&&r._s<=w1; // เหตุการณ์อยู่ในหน้าต่าง 15 นาทีล่าสุดหรือไม่
  const byKey={}; // byKey[จุด]={h:เหตุการณ์ในหน้าต่าง, d:ทั้งวัน}
  rows.forEach(r=>{ // นับต่อจุดบริการ
    if(!r._k)return; // จุดที่แมปไม่ได้ ข้าม
    const b=byKey[r._k]||(byKey[r._k]={h:[],d:0}); // สร้างตัวนับของจุดนี้ถ้ายังไม่มี
    b.d++; // นับทั้งวัน
    if(inW(r))b.h.push(r) // อยู่ในหน้าต่าง → เก็บไว้
  });
  const rh=rows.filter(r=>r._k&&inW(r)); // เหตุการณ์ในหน้าต่างที่แมปจุดได้
  const pool=rh.filter(r=>/^(ex|hx)\d$/.test(r._k)); // เหตุการณ์ซักประวัติ/ห้องตรวจ ใช้เป็นตัวแทนจำนวนคน
  return{hrs,hh:String(Math.floor(w1/3600)).padStart(2,'0'),win:hhmm(w0)+'–'+hhmm(w1),byKey,unm,total:rows.length,rowsH:rows.filter(inW),pool:pool.length?pool:rh} // hh=ชั่วโมงปัจจุบัน, win=ข้อความช่วงเวลา, rowsH=เหตุการณ์ในหน้าต่าง
}
const QTX={};
function qtag(text){let m=QTX[text];if(!m){const c=document.createElement('canvas');c.width=256;c.height=96;const x=c.getContext('2d');x.fillStyle='#0f2236f2';x.beginPath();x.roundRect?x.roundRect(4,4,248,88,22):x.rect(4,4,248,88);x.fill();x.strokeStyle='#27c4cf';x.lineWidth=4;x.stroke();x.fillStyle='#fff';x.textAlign='center';x.textBaseline='middle';x.font='700 54px "IBM Plex Sans Thai",sans-serif';x.fillText(text,128,50,230);m=QTX[text]=new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),transparent:true,depthTest:false})}
  const s=new THREE.Sprite(m);s.scale.set(3.3,1.24,1);s.renderOrder=8;return s}
function addTag(g,text){const t=qtag(String(text)),k=g.userData.s||1;t.scale.multiplyScalar(1/k);t.position.set(0,1.7+.85/k,0);g.add(t);return t} // ป้ายเลขคิวลอยเหนือหัว
async function loadQ(day){const c=cfg(),rng=`called_at=gte.${day}T00:00:00%2B07:00&called_at=lt.${addD(day,1)}T00:00:00%2B07:00&order=called_at.asc`;
  const pg=async f=>{const out=[];for(let o=0;o<80000;o+=1000){const r=await fetch(c.u+'/rest/v1/'+f,{headers:{apikey:c.k,Authorization:'Bearer '+c.k,'Range-Unit':'items',Range:`${o}-${o+999}`}});
    if(!r.ok){let m='';try{m=(await r.text()).replace(/\s+/g,' ').slice(0,140)}catch(e){}throw new Error(QLOG_TABLE+' HTTP '+r.status+(m?' — '+m:''))}
    const j=san(await r.json());out.push(...j);if(j.length<1000)break}return out};
  try{return await pg(`${QLOG_TABLE}?select=called_at,station_id,station_name,queue_no,hn,vn&${rng}`)} // ต้องมี hn, vn เพื่อแยก 1 คน = 1 vn
  catch(e){if(!/HTTP 400/.test(e.message))throw e;return await pg(`${QLOG_TABLE}?select=called_at,station_id,station_name,queue_no&${rng}`)}} // ไม่มีคอลัมน์ hn/vn → แยกคนด้วย queue_no
function demoQ(day){const R=x=>Math.floor(Math.random()*x),out=[],hh=t=>`${day}T${String(Math.floor(t/3600)).padStart(2,'0')}:${String(Math.floor(t%3600/60)).padStart(2,'0')}:${String(Math.floor(t%60)).padStart(2,'0')}+07:00`;
  const add=(n,t,sid,nm)=>out.push({called_at:hh(t),station_id:sid,station_name:nm,queue_no:'A'+String(n).padStart(3,'0'),hn:'HN'+String(1000+n),vn:'VN'+String(n)});
  for(let n=1;n<=220;n++){let t=7*3600+30*60+Math.floor((n/220)*12*3600*(.8+Math.random()*.2));
    add(n,t,1,'ห้องบัตร');t+=120+R(300);const d=1+R(7);add(n,t,1+d,'ซักประวัติ '+d);t+=600+R(2400);const r=1+R(6);add(n,t,8+r,'ห้องตรวจ '+r);
    t+=600+R(1500);if(Math.random()<.5){add(n,t,15,'ห้องเก็บเงิน');t+=300+R(600);add(n,t,14,'จ่ายยา')}else{add(n,t,14,'จ่ายยา');t+=300+R(600);if(Math.random()<.4)add(n,t,15,'ห้องเก็บเงิน')}}
  return out.sort((a,b)=>a.called_at<b.called_at?-1:1)}
/* ===== hospital_visit_flow_stats: 1 แถว = 1 vn มีเวลาแต่ละขั้น (t_register → t_screen_start → t_exam_start → t_cashier → t_drug_finish) ===== */
const FLOW_TABLE='hospital_visit_flow_stats'; // ชื่อตารางเส้นทางผู้ป่วยรายคน (ต้องอยู่ในรายการที่ตัวกลาง /api/sb อนุญาต)
async function loadFlow(day){ // ดึงแถวของวันที่ระบุทั้งหมด (แบ่งหน้าครั้งละ 1000 แถว)
  const c=cfg(),out=[]; // c=ค่าเชื่อมต่อ Supabase, out=แถวที่ดึงมาสะสมไว้
  const f='select=vn,hn,oqueue,vstdate,cur_department,t_register,t_send_screen,t_screen_start,t_screen_end,t_exam_start,t_exam_end,t_cashier,t_drug_finish,wait_screen_min,dur_screen_min,wait_exam_min,dur_exam_min,wait_drug_min,wait_cash_min,total_min&vstdate=eq.'+day+'&order=t_register.asc'; // เลือกคอลัมน์ที่ใช้ + กรองเฉพาะวันนั้น + เรียงตามเวลาลงทะเบียน
  for(let o=0;o<20000;o+=1000){ // วนขอทีละ 1000 แถว สูงสุด 20,000 แถว
    const r=await fetch(c.u+'/rest/v1/'+FLOW_TABLE+'?'+f,{headers:{apikey:c.k,Authorization:'Bearer '+c.k,'Range-Unit':'items',Range:`${o}-${o+999}`}}); // ขอแถวช่วง o ถึง o+999
    if(!r.ok){ // ถ้าเซิร์ฟเวอร์ตอบ error
      let m=''; // ข้อความรายละเอียดของ error
      try{m=(await r.text()).replace(/\s+/g,' ').slice(0,140)}catch(e){} // อ่านเนื้อความ error แบบสั้น ๆ
      throw new Error(FLOW_TABLE+' HTTP '+r.status+(m?' — '+m:'')) // โยน error พร้อมรหัสสถานะ
    }
    const j=san(await r.json()); // แปลง JSON และกรองอักขระอันตรายออก
    out.push(...j); // เก็บแถวที่ได้
    if(j.length<1000)break // ได้น้อยกว่า 1000 แถว = หน้าสุดท้ายแล้ว หยุดขอ
  }
  return out // คืนทุกแถวของวันนั้น
}
/* ค่าเฉลี่ยจริงของวัน (นาที) จากตาราง ใช้แทนค่าจาก hospital_daily_stats ใน KPI และสีสถานะของจุดบริการ */
function flowStats(rows){ // สรุปค่าเฉลี่ยจากทุกแถวของวัน
  const avg=k=>{ // ฟังก์ชันหาค่าเฉลี่ยของคอลัมน์ k
    const a=rows.map(r=>r[k]).filter(v=>v!=null&&v!==''&&isFinite(+v)).map(Number); // เอาเฉพาะค่าที่เป็นตัวเลข
    return a.length?a.reduce((s,v)=>s+v,0)/a.length:null // หาค่าเฉลี่ย ถ้าไม่มีค่าเลยคืน null
  };
  const d={ // ค่าที่จะทับลงในสถิติรายวัน
    avg_wait_reg_to_triage:avg('wait_screen_min'), // เวลารอคัดกรอง
    avg_wait_for_doctor:avg('wait_exam_min'), // เวลารอพบแพทย์
    avg_doctor_consult_time:avg('dur_exam_min'), // เวลาตรวจกับแพทย์
    avg_wait_for_pharmacy:avg('wait_drug_min'), // เวลารอรับยา
    avg_total_process_time:avg('total_min') // เวลารวมทั้งกระบวนการ
  };
  Object.keys(d).forEach(k=>{if(d[k]==null)delete d[k]}); // ตัดค่าที่คำนวณไม่ได้ออก จะได้ไม่ไปทับค่าเดิม
  const hc=Array(24).fill(0); // ตัวนับผู้ป่วยลงทะเบียนรายชั่วโมง 24 ช่อง
  rows.forEach(r=>{ // วนทุกแถว
    const h=+String(r.t_register||'').slice(11,13); // ตัดเลขชั่วโมงจากข้อความเวลา
    if(h>=0&&h<24)hc[h]++ // นับเข้าช่องชั่วโมงนั้น
  });
  return{ // คืนผลสรุป
    d, // ค่าเฉลี่ยสำหรับ KPI
    n:rows.length, // จำนวน vn ทั้งวัน
    cash:avg('wait_cash_min'), // เวลารอชำระเงินเฉลี่ย
    nCash:rows.filter(r=>r.t_cashier).length, // จำนวนคนที่ผ่านการเงินแล้ว
    oh:hc.map((c,h)=>({time_hour:String(h).padStart(2,'0')+':00',service_count:String(c)})) // จำนวนรายชั่วโมงในรูปแบบเดียวกับตารางสถิติรายชั่วโมง
  }
}
/* แปลง 1 แถว/vn → เหตุการณ์ "เรียกคิว" ที่จุดต่าง ๆ ให้ aggLog/buildVisits ใช้ต่อได้ทันที
   · เลขโต๊ะซักประวัติ/ห้องตรวจ ตารางไม่มี → กระจายแบบโต๊ะที่ว่างนานที่สุดก่อน · ผู้ป่วยที่ยังอยู่ในโรงพยาบาล (วันนี้) จะนั่งรอที่จุดถัดไปแทนที่จะเดินออก */
function flowToLog(rows,day){ // แปลงแถวรายคนเป็นเหตุการณ์ที่แต่ละจุดบริการ
  const todayTH=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Bangkok'}); // วันที่วันนี้ตามเวลาไทย
  const live=day===todayTH; // live=กำลังดูข้อมูลของวันนี้
  const ts=s=>{ // แปลงข้อความเวลาเป็นวินาทีนับจากเที่ยงคืน
    const m=String(s||'').match(/(\d\d):(\d\d)(?::(\d\d))?/); // ดึง ชั่วโมง:นาที:วินาที ออกมา
    return m?+m[1]*3600+ +m[2]*60+(+m[3]||0):NaN // คำนวณเป็นวินาที ไม่มีเวลาคืน NaN
  };
  const cl=(v,a,b,d)=>isFinite(v)?Math.min(b,Math.max(a,v)):d; // จำกัดค่า v ให้อยู่ช่วง a..b ถ้าไม่ใช่ตัวเลขใช้ค่า d
  const out=[],pend=[],hxL=[],exL=[]; // out=เหตุการณ์, pend=คนที่ยังอยู่ในโรงพยาบาล, hxL/exL=รายการรอจัดโต๊ะซักประวัติ/ห้องตรวจ
  const hxF=Array(7).fill(0),exF=Array(6).fill(0); // เวลาที่โต๊ะซักประวัติ (7) และห้องตรวจ (6) ว่างล่าสุด
  const alloc=(F,t,e)=>{ // เลือกโต๊ะ/ห้องที่ว่างนานที่สุด
    let b=0; // ดัชนีที่เลือก
    for(let i=1;i<F.length;i++)if(F[i]<F[b])b=i; // หาตัวที่เวลาว่างน้อยที่สุด
    F[b]=isFinite(e)?e:t+300; // จดเวลาที่จะว่างอีกครั้ง (ไม่รู้เวลาจบให้ +5 นาที)
    return b+1 // คืนเลขโต๊ะ/ห้อง (เริ่มที่ 1)
  };
  rows.forEach(r=>{ // วนทุกแถว (ทุก vn)
    const q=String(r.oqueue||String(r.vn||'').slice(-4)); // หมายเลขคิว ถ้าไม่มีใช้ 4 หลักท้ายของ vn
    const base={hn:r.hn,vn:r.vn,queue_no:q}; // ข้อมูลระบุตัวผู้ป่วยที่ทุกเหตุการณ์ใช้ร่วมกัน
    const hs=r.t_screen_start||r.t_screen_end; // เวลาเริ่มซักประวัติ (ไม่มีใช้เวลาจบแทน)
    const add=(t,id,nm,dw)=>{if(t)out.push({...base,called_at:t,station_id:id,station_name:nm,_dw:dw})}; // เพิ่มเหตุการณ์ถ้ามีเวลา (dw=วินาทีที่อยู่ที่จุดนั้น)
    add(r.t_register,1,'ห้องบัตร',cl(ts(r.t_send_screen)-ts(r.t_register),45,180,90)); // ลงทะเบียน อยู่จนส่งไปคัดกรอง (45–180 วินาที)
    if(hs)hxL.push({base,t:ts(hs),raw:hs,e:ts(r.t_screen_end),dw:cl(ts(r.t_screen_end)-ts(r.t_screen_start),60,600,180)}); // ซักประวัติ: เก็บไว้รอจัดโต๊ะ
    if(r.t_exam_start)exL.push({base,t:ts(r.t_exam_start),raw:r.t_exam_start,e:ts(r.t_exam_end),dw:cl(ts(r.t_exam_end)-ts(r.t_exam_start),120,1500,420)}); // ตรวจ: เก็บไว้รอจัดห้อง
    add(r.t_cashier,15,'ห้องเก็บเงิน',120); // การเงิน อยู่ 2 นาที
    add(r.t_drug_finish,14,'จ่ายยา',120); // จ่ายยา อยู่ 2 นาที
    if(live&&r.cur_department!=='กลับบ้าน'&&!r.t_drug_finish){ // วันนี้ ยังไม่กลับบ้านและยังไม่ได้ยา = ยังอยู่ในโรงพยาบาล
      let k=null; // จุดที่กำลังรออยู่ (null = อยู่ในห้องตรวจ)
      if(!hs&&!r.t_exam_start)k='hx'+(1+hsh(r.vn)%7); // ยังไม่ได้ซักประวัติ → รอที่โต๊ะซักประวัติ (สุ่มโต๊ะจาก vn)
      else if(!r.t_exam_start)k='ex'+(1+hsh(r.vn)%6); // ซักประวัติแล้วแต่ยังไม่ตรวจ → รอหน้าห้องตรวจ
      else if(r.t_cashier)k='ph'; // จ่ายเงินแล้วแต่ยังไม่ได้ยา → รอรับยา
      else if(r.t_exam_end)k='cash'; // ตรวจเสร็จแต่ยังไม่จ่ายเงิน → รอชำระเงิน
      pend.push({vn:r.vn,hn:r.hn,q,k}) // บันทึกว่าคนนี้ค้างอยู่ที่ไหน
    }
  });
  hxL.sort((a,b)=>a.t-b.t).forEach(x=>{ // เรียงตามเวลาแล้วจัดโต๊ะซักประวัติทีละคน
    const n=alloc(hxF,x.t,x.e); // เลือกโต๊ะที่ว่างนานที่สุด
    out.push({...x.base,called_at:x.raw,station_id:1+n,station_name:'ซักประวัติ '+n,_dw:x.dw}) // เพิ่มเหตุการณ์ที่โต๊ะนั้น
  });
  exL.sort((a,b)=>a.t-b.t).forEach(x=>{ // เรียงตามเวลาแล้วจัดห้องตรวจทีละคน
    const n=alloc(exF,x.t,x.e); // เลือกห้องที่ว่างนานที่สุด
    out.push({...x.base,called_at:x.raw,station_id:8+n,station_name:'ห้องตรวจ '+n,_dw:x.dw}) // เพิ่มเหตุการณ์ที่ห้องนั้น
  });
  out.sort((a,b)=>a.called_at<b.called_at?-1:a.called_at>b.called_at?1:0); // เรียงเหตุการณ์ทั้งหมดตามเวลา
  out.pend=pend; // แนบรายชื่อคนที่ยังค้างไว้กับอาร์เรย์
  return out // คืนเหตุการณ์ทั้งหมด
}
/* ป้ายลอยเหนือจุดบริการ */
function label(sx,sy){const c=document.createElement('canvas');c.width=512;c.height=170;const t=new THREE.CanvasTexture(c),s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true,depthTest:false}));s.scale.set(sx,sy,1);s.renderOrder=9;s.userData={c,t};return s}
function paint(sp,l1,l2,col){const c=sp.userData.c,x=c.getContext('2d');x.clearRect(0,0,512,170);x.fillStyle='#0f2236ee';x.beginPath();x.roundRect?x.roundRect(8,8,496,154,26):x.rect(8,8,496,154);x.fill();x.strokeStyle=col;x.lineWidth=5;x.stroke();x.textAlign='center';x.fillStyle='#fff';x.font='700 56px "IBM Plex Sans Thai",sans-serif';x.fillText(l1,256,72);x.fillStyle=col;x.font='700 50px "IBM Plex Sans Thai",sans-serif';x.fillText(l2,256,138);sp.userData.t.needsUpdate=true}
/* รายการจุดบริการ 13 จุด */
const ITEMS=[],pick=[],XD=[-13.5,-9,-4.5,0,4.5,9,13.5],XR=[17,11.8,6.6,1.4,-3.8,-9],ZD=17,RX=35,CASHP=1; // XR = ตำแหน่ง z ของห้องตรวจ 6 ห้อง (เรียงแนวตั้งด้านขวา) · CASHP = สัดส่วนผู้ป่วยที่ไปห้องเก็บเงิน
function reg(o,pw,ph,pd,ly,lw,lh){const g=new THREE.Group();g.position.set(o.x,0,o.z);SC.add(g);o.g=g;o.i=ITEMS.length;
  const pk=new THREE.Mesh(new THREE.BoxGeometry(pw,ph,pd),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));pk.position.y=ph/2;pk.userData.i=o.i;g.add(pk);pick.push(pk);
  const lb=label(lw,lh);lb.position.y=ly;g.add(lb);o.lb=lb;ITEMS.push(o);return g}
const statMat=()=>new THREE.MeshStandardMaterial({color:0x2fd08a,emissive:0x2fd08a,emissiveIntensity:.6,roughness:.4});
/* 0 ห้องบัตร */
{const o={id:'reg',kind:'reg',name:'ห้องบัตร',en:'Registration',x:-30,z:17},g=reg(o,3.6,3,10.5,4.9,6,2);g.rotation.y=Math.PI/2;
  box(1.4,1.5,10,0x5b3a29,0,.75,0,g);box(1.9,.14,10.4,0xf4f4f0,0,1.57,0,g);box(.1,.9,10,0x111820,.5,2.1,0,g,{transparent:true,opacity:.55});
  
  o.stat=new THREE.Mesh(new THREE.BoxGeometry(.18,.18,10.4),statMat());o.stat.position.set(.95,1.4,0);g.add(o.stat);
  [[-40,10],[-40,7.5]].forEach(([x,z])=>{const k=new THREE.Group();k.position.set(x,0,z);SC.add(k);box(.9,2.6,.9,0xf6f2e6,0,1.3,0,k);box(.06,.8,.7,0x2fb2a0,-.46,2.0,0,k,{emissive:0x2fb2a0,emissiveIntensity:.8});box(1.1,.15,1.1,0x1d6b34,0,.08,0,k)})}
/* 1-7 โต๊ะซักประวัติ */
XD.forEach((x,k)=>{const o={id:'hx'+(k+1),kind:'desk',no:k+1,name:'ซักประวัติ '+(k+1),en:'History talking · โต๊ะ '+(k+1),x,z:ZD},g=reg(o,3,3,3.4,3.7,3.5,1.18);
  box(2.8,1.05,1.3,0xf3f1ea,0,.52,0,g);box(1.1,.85,.5,0xf4b6cb,0,1.5,-.15,g);box(2.8,.06,.06,0xffe45c,0,1.08,.66,g);
  box(.9,.12,.9,0x3f9fd0,0,.55,-1.3,g);box(.9,.9,.12,0x3f9fd0,0,1.05,-1.8,g);
  o.stat=new THREE.Mesh(new THREE.BoxGeometry(2.8,.12,.18),statMat());o.stat.position.set(0,.05,.9);g.add(o.stat)});
/* 6-11 ห้องตรวจ */
XR.forEach((x,k)=>{const o={id:'ex'+(k+1),kind:'room',no:k+1,name:'ห้องตรวจ '+(k+1),en:'Examination room '+(k+1),x:RX,z:x},g=reg(o,4.2,3.2,4.2,4.2,4.2,1.4);g.rotation.y=-Math.PI/2;
  box(4.2,.1,4,0xe9f0f4,0,.05,0,g);box(4.2,3,.15,0xf7f9fb,0,1.5,-2,g);box(.15,3,4,0xf7f9fb,-2.1,1.5,0,g);box(.15,3,4,0xf7f9fb,2.1,1.5,0,g);
  box(1.2,3,.15,0xf7f9fb,-1.5,1.5,2,g);box(1.2,3,.15,0xf7f9fb,1.5,1.5,2,g);
  box(1,.5,2.2,0x8ec3d8,-1,.4,-.5,g);box(1,.8,.6,0xc79a5b,1.2,.4,-1.5,g);
  o.stat=new THREE.Mesh(new THREE.BoxGeometry(2,.5,.18),statMat());o.stat.position.set(0,2.75,2);g.add(o.stat)});
/* 12 ห้องยา (ขวา) · 13 ห้องเก็บเงิน (ซ้าย — สลับตำแหน่งแล้ว) ติดผนังหลัง หันหน้าเข้าหาตำแหน่ง 3 */
[{id:'ph',kind:'ph',name:'รับยา',en:'Pharmacy · Dispensary',x:11,z:-13.5,c:[0xf4f4f0,0xdfe8e0,0x2fb27a]},{id:'cash',kind:'cash',name:'ห้องเก็บเงิน',en:'Cashier',x:-5,z:-13.5,c:[0xf6efdc,0xe9e0c8,0xf5a623]}].forEach(o=>{const g=reg(o,2.6,3.4,8.4,3.2,4,1.35);g.rotation.y=Math.PI/2;
  box(1.8,1.2,8,o.c[0],0,.6,0,g);box(1.2,3.6,8,o.c[1],2.1,1.8,0,g);box(.15,1.5,2.2,o.c[2],-.95,1.9,0,g,{emissive:o.c[2],emissiveIntensity:.45});
  o.stat=new THREE.Mesh(new THREE.BoxGeometry(.18,.18,8),statMat());o.stat.position.set(-.95,1.3,0);g.add(o.stat)});
/* ทางเข้า-ออก */
{const a=label(3.4,1.15);a.position.set(-41,2.2,14);paint(a,'ทางเข้า','Entrance','#27c4cf');SC.add(a);const b=label(3.4,1.15);b.position.set(-40,2.2,-12);paint(b,'ทางออก','Exit','#27c4cf');SC.add(b)}
/* วงความหนาแน่นใต้จุดบริการ (สีตามจำนวนครั้งที่เรียกคิวในชั่วโมงที่เลือก) */
const HPAD=ITEMS.map(o=>{const r=o.kind==='reg'?4.4:o.kind==='room'?2.9:o.kind==='desk'?2.4:3,m=new THREE.Mesh(new THREE.CircleGeometry(r,40),new THREE.MeshBasicMaterial({color:0x2fd08a,transparent:true,opacity:0,depthWrite:false}));m.rotation.x=-Math.PI/2;m.position.set(o.x,.13,o.z);SC.add(m);return m});
const TP={};
function tplate(k,x,y,z){const l=label(5.4,1.8);l.position.set(x,y,z);SC.add(l);TP[k]=l}
tplate('reg',-30,4.4,12.2);tplate('desk',0,5.4,12.6);tplate('room',40.4,5.2,5);tplate('ph',11,4.8,-15.6);tplate('exit',-38.6,4.3,-12);
function paintT(sp,txt,col){const c=sp.userData.c,x=c.getContext('2d');x.clearRect(0,0,512,170);x.fillStyle='#0f2236ee';x.beginPath();x.roundRect?x.roundRect(8,24,496,122,30):x.rect(8,24,496,122);x.fill();x.strokeStyle=col;x.lineWidth=5;x.stroke();x.textAlign='center';x.fillStyle=col;x.font='700 54px "IBM Plex Sans Thai",sans-serif';x.fillText(txt,256,102);sp.userData.t.needsUpdate=true}
const selR=new THREE.Mesh(new THREE.RingGeometry(2.4,2.7,48),new THREE.MeshBasicMaterial({color:0xffffff,side:THREE.DoubleSide,transparent:true,opacity:.85}));selR.rotation.x=-Math.PI/2;selR.position.y=.12;selR.visible=false;SC.add(selR);
/* คิวผู้ป่วย (1 รูป = unit ราย) */
const qG=new THREE.Group();SC.add(qG);let unit=1;
function qpos(o,k){const c=k%2,r=Math.floor(k/2);
  if(o.kind==='desk')return[o.x+(c?.5:-.5),ZD-3.4-r*.85];
  if(o.kind==='room')return[o.x-11.8-r*.85,o.z+(c?.55:-.55)];
  if(o.kind==='ph'||o.kind==='cash')return[o.x+(c?.8:-.8),o.z+2.4+r*.85];
  return[-35+k*1.2,14.5]}
function drawCrowd(){while(qG.children.length)qG.remove(qG.children[0]);if(!LG||RP.on)return;
  const mx=Math.max(1,...ITEMS.map(o=>(LG.byKey[o.id]||{h:[]}).h.length));unit=Math.max(1,Math.ceil(mx/10)); // 1 ตัวที่ยืนรอ = unit ครั้งที่เรียก
  ITEMS.forEach(o=>{const rs=(LG.byKey[o.id]||{h:[]}).h,f=Math.min(10,Math.ceil(rs.length/unit));
    for(let k=0;k<f;k++){const r=rs[rs.length-1-k],[x,z]=qpos(o,k),q=r.queue_no,g=human(SHIRT[hsh(q)%SHIRT.length],kindQ(q),hsh(q));
      g.position.set(x,0,z);g.rotation.y=o.kind==='room'?Math.PI/2:(o.kind==='ph'||o.kind==='cash')?Math.PI:0;addTag(g,q);qG.add(g)}})}
function renderQ(){ // แผงคิวที่เรียกในช่วง 15 นาทีล่าสุด (ข้อมูลจากฐานข้อมูล)
  const q=$('#vq'); // กล่องแผงคิว
  if(!LG){q.style.display='none';return} // ไม่มีข้อมูล → ซ่อนแผง
  q.style.display=''; // แสดงแผง
  const mx=Math.max(1,...LG.hrs),last=LG.rowsH.slice(-5).reverse(); // mx=ค่าสูงสุดรายชั่วโมง (ปรับความสูงแท่ง), last=คิวล่าสุด 5 รายการ
  q.innerHTML=`<div class="qh"><b>คิวที่เรียก ${LIVE3D.win} นาทีล่าสุด</b><span>${LG.win} น. · ${fm(LG.rowsH.length)} ครั้ง · ทั้งวัน ${fm(LG.total)}</span></div><div class="qb">${LG.hrs.map((c,h)=>{const s=String(h).padStart(2,'0');return `<i data-h="${s}" class="${s===LG.hh?'on':''}" style="height:${Math.max(c?8:2,c/mx*100)}%" title="${s}:00 · ${c} ครั้ง"></i>`}).join('')}</div><div class="qa"><span>00</span><span>06</span><span>12</span><span>18</span><span>23</span></div><div class="ql">${last.length?last.map(r=>`<div><span>${hmOf(r.called_at)} · ${r.station_name||r.station_id}</span><b>${r.queue_no}</b></div>`).join(''):'<div><span>ไม่มีการเรียกคิวใน '+LIVE3D.win+' นาทีล่าสุด</span></div>'}</div><div class="lg2"><span><i style="background:#2fd08a"></i>เบาบาง</span><span><i style="background:#f5b441"></i>ปานกลาง</span><span><i style="background:#ff5d4a"></i>หนาแน่น</span></div>`; // วาดแผง: หัวข้อ แท่งรายชั่วโมง คิวล่าสุด และคำอธิบายสี
}
/* ผู้ป่วยเดินในโรงพยาบาล */
const pats=[],pm=new THREE.MeshStandardMaterial({color:0x27c4cf,roughness:.5,emissive:0x0a5a62,emissiveIntensity:.4});
let RT=(()=>{try{return localStorage.getItem('v3rt')!=='0'}catch(e){return true}})(); // โหมดเวลาจริง (เปิดเป็นค่าเริ่มต้น)
let baseEvery=6,W2={reg:2,c1:3,tri:3,ec:2,room:4,pc:2,pc1:2,cc:2,cash:3,pc2:2,rec:3}; // W2 = เวลานั่งรอ/รับบริการของแต่ละจุด (วินาที)
let LG=null,lgc=0,M=null,spawnT=0,spawnEvery=1,dc=0,rcn=0,targetPop=20,WT={reg:2,desk:3,q:2,room:4,ph:3};
const pmF=new THREE.MeshStandardMaterial({color:0xf5b441,roughness:.5,emissive:0x8a5a00,emissiveIntensity:.5});let flowT=0;
function mk(P,m,j){const g=new THREE.Group(),b=new THREE.Mesh(bodyG,m),h=new THREE.Mesh(headG,m);b.position.y=.5;h.position.y=1.12;g.add(b,h);g.position.set(P[0][0],0,P[0][1]);SC.add(g);pats.push({g,P,i:1,w:0,j,sp:3+Math.random()*.8})}
function spawnFlow(o){if(pats.length>=95)return;const j=(Math.random()-.5)*.5;let P;
  if(o.kind==='desk')P=[[-19.5,11,0],[o.x,11,0],[o.x,5.6,1.5],[o.x,9.5,0]];
  else if(o.kind==='room')P=[[-13.2,9.5,0],[-13.2,.5,0],[o.x,.5,0],[o.x,-5.8,1],[o.x,-9,2],[o.x,-5.8,0],[o.x,.5,0]];
  else P=[[14,.5,0],[21.2,.5,0],[21.2,-1,1.5],[21.2,11,0]];
  mk(P,pmF,j)}
let simT=0,pn=0;
/* ระบบคิว: GQ = คิวเรียกตัวต่อไปของแต่ละแผนก (เรียงตามลำดับมาถึง FIFO · เดินทีละตัว ห่างกัน ≥2 วินาที) · SO = จำนวนคนที่ใช้จุดบริการอยู่ · CAP = ช่องบริการสูงสุด (ห้องตรวจ/โต๊ะซักประวัติ = 1) · OC = จำนวนคนนั่งในเก้าอี้แต่ละตัว */
const GQ={},SO={},OC={},CAP={reg:2,ph:3,ca:2};
function spawn(){if(pats.length>=(RT?120:60))return;const j=(Math.random()-.5)*.5,row=LG&&LG.pool.length?LG.pool[lgc++%LG.pool.length]:null,isH=!!row&&/^hx\d$/.test(row._k||""),dk=isH?+row._k.slice(2)-1:null,ri=row&&/^ex\d$/.test(row._k||"")?+row._k.slice(2)-1:rcn++%6,zr=XR[ri],phX=11+(Math.random()-.5)*5,caX=-5+(Math.random()-.5)*5,sy=-10.9;dc++;
  /* รูปแบบจุดหยุด T = [x,z,รอ(วิ),นั่ง?,ประตูคิว,ทิศหน้า,จองจุดบริการ,คืนจุดบริการ,รายการเก้าอี้(เลือกตัวว่างอัตโนมัติ),เริ่ม,จำนวน]
     ทางเข้า → ห้องบัตร → เก้าอี้รอซักประวัติ → โต๊ะซักประวัติ → เก้าอี้หน้าห้องตรวจ → ห้องตรวจ → เก้าอี้ห้องยา → เคาน์เตอร์ห้องยา → เก้าอี้ห้องเก็บเงิน → เคาน์เตอร์ห้องเก็บเงิน → เก้าอี้ห้องยา → เคาน์เตอร์ห้องยา(รับยา) → ทางออก
     ทุกแผนก: เรียกจากเก้าอี้ทีละคนตามคิว เดินทีละตัว และต้องมีช่องบริการว่างก่อน */
  const P=[[-42.2,14,0],[-40.5,14,.01,0,'rg'],[-34+Math.random()*8,14.4,W2.reg,0,null,0,'reg','reg'],[0,0,W2.c1,1,'tri',0,null,null,'CHS'],[0,0,0],[0,0,W2.tri,1,null,0],
    [0,0,W2.ec,1,'rm'+ri,Math.PI/2,null,null,'CHR',ri*4,4],[RX-3.8,zr,0,0,null,null,'r'+ri],[RX-.4,zr,W2.room,0,null,Math.PI/2,null,'r'+ri],[RX-3.8,zr,0],
    [0,0,W2.pc,1,'ph1',Math.PI,null,null,'CHP'],[phX,sy,W2.pc1,0,null,Math.PI,'ph','ph'],[0,0,W2.cc,1,'ca',Math.PI,null,null,'CHC'],[caX,sy,W2.cash,0,'ca2',Math.PI,'ca','ca'],
    [0,0,W2.pc2,1,'ph2',Math.PI,null,null,'CHP'],[phX,sy,W2.rec,0,null,Math.PI,'ph','ph'],[11,-7.2,0,0,'ex'],[-37,-7.2,0],[-41.5,-12,0]];
  let P2=P;
  if(row){const out=[[-13.2,9.5,0],[-13.2,-7.2,0],[-37,-7.2,0],[-41.5,-12,0]];
    if(isH)P2=P.slice(0,6).concat(out); // station_name = ซักประวัติ N → เดินไปโต๊ะ N แล้วออก
    else P2=P.slice(0,3).concat(P.slice(6)); // station_name = ห้องตรวจ N → เดินไปห้อง N ตรงๆ
    P2[2][2]=6;P2[3][2]=6}
  const kind=row?kindQ(row.queue_no):((pn++%20)===9?'c':(Math.random()<.5?'m':'f')),sd=row?hsh(row.queue_no):(Math.random()*1e5)|0,w=mkWalker(P2,j,kind,SHIRT[sd%SHIRT.length],sd);if(row){w.q=String(row.queue_no);w.dk=dk;addTag(w.g,w.q)}}
/* สร้างตัวละครเดินหนึ่งตัวจากเส้นทาง P (ใช้ทั้งตอนเกิดใหม่และตอนกู้คืนสถานะ) */
function mkWalker(P,j,kind,shirt,sd){const g=human(shirt,kind,sd);g.position.set(P[0][0],0,P[0][1]);SC.add(g);const p={g,P,i:1,w:0,j,sp:3+Math.random()*.8,kind,shirt,seed:sd,ph0:Math.random()*6};pats.push(p);return p}
function sitP(p,on){p.sit=on?1:0;p.g.position.y=on?Math.max(0,.62-.7*(p.g.userData.s||1)):0} // นั่ง: ยกตัวเด็กให้ถึงเบาะ
function pose(p,mv){const u=p.g.userData;if(!u.legs)return;
  if(p.sit){u.legs.forEach(l=>{l.th.rotation.x=-1.5;l.sh.rotation.x=1.5});u.arms.forEach(a=>a.rotation.x=-.55);return}
  if(mv){const ph=simT*p.sp*2.7+p.ph0,a=Math.sin(ph)*.65;u.legs[0].th.rotation.x=-a;u.legs[1].th.rotation.x=a;u.legs[0].sh.rotation.x=Math.max(0,Math.sin(ph+1.6))*.8;u.legs[1].sh.rotation.x=Math.max(0,-Math.sin(ph+1.6))*.8;u.arms[0].rotation.x=a*.75;u.arms[1].rotation.x=-a*.75;p.g.position.y=Math.abs(Math.cos(ph))*.03*(u.s||1)}
  else{u.legs.forEach(l=>{l.th.rotation.x=0;l.sh.rotation.x=0});u.arms.forEach(a=>a.rotation.x=0);p.g.position.y=0}}
function pickChair(p,T){const L=T[8]==='CHS'?CHS:T[8]==='CHP'?CHP:T[8]==='CHC'?CHC:CHR,a=T[9]||0,n=T[10]||L.length,oc=OC[T[8]]||(OC[T[8]]=L.map(()=>0));let b=a;for(let i=a;i<a+n;i++)if(oc[i]<oc[b])b=i; // เลือกเก้าอี้ว่างตัวแรก (เรียงจากหน้าไปหลัง)
  oc[b]++;p.cl=T[8];p.ci=b;T[0]=L[b][0];T[1]=L[b][1];T.r=1}
function tryGo(p){const g=GQ[p.gk],T=p.P[p.i];if(!g)return true;if(p.tk===undefined)p.tk=g.n++;
  if(p.tk!==g.s||simT<g.t||(g.w&&g.w.mv&&p.gk!=='ex'))return false; // ถึงคิวของตัวเอง + ห่างจากตัวก่อน ≥2 วินาที + ตัวก่อนเดินถึงที่หมายแล้ว
  if(p.gk==='tri'){let k=-1;if(p.dk!=null&&p.dk>=0&&p.dk<XD.length){if(!SO['d'+p.dk])k=p.dk}else for(let i=0;i<XD.length;i++)if(!SO['d'+i]){k=i;break}if(k<0)return false; // โต๊ะซักประวัติว่างโต๊ะแรก
    SO['d'+k]=1;p.P[p.i]=[XD[k],ZD-3.8,0];p.P[p.i+1]=[XD[k],ZD-1.3,p.dk!=null?W2.tri||3:3,1,null,0,null,'d'+k]}
  else if(T&&T[6]){if((SO[T[6]]||0)>=(CAP[T[6]]||1))return false;SO[T[6]]=(SO[T[6]]||0)+1}
  g.s++;g.t=simT+2;g.w=p;p.mv=true;return true}
function leave(p){const T=p.P[p.i-1];if(T&&T[7])SO[T[7]]=Math.max(0,(SO[T[7]]||0)-1);if(p.cl){OC[p.cl][p.ci]--;p.cl=null}p.gk=null;if(p.sit)sitP(p,0)}
function step(dt){simT+=dt; // ขยับฉากทุกเฟรม (dt=วินาทีจริงตั้งแต่เฟรมก่อน)
  if(RP.on){ // มีผู้ป่วยจากฐานข้อมูลให้แสดง
    rstep(dt); // ขยับผู้ป่วยตามเวลาปัจจุบัน
    return}
  return // ไม่มีข้อมูลเส้นทางผู้ป่วยของวันนี้ → ไม่สร้างตัวละครจำลองสุ่ม แสดงเฉพาะข้อมูลจากฐานข้อมูล
  spawnT+=dt;if(spawnT>spawnEvery){spawnT=0;if(RT||pats.length<targetPop)spawn();spawnEvery=baseEvery*(.6+Math.random()*.8)} // เกิดใหม่เฉพาะเมื่อคนในฉากน้อยกว่าจำนวนจากข้อมูลรายชั่วโมง
  for(let k=pats.length-1;k>=0;k--){const p=pats[k];
    if(p.w>0){p.w-=dt;if(p.w<=0){if(p.gk&&!tryGo(p)){p.w=.15;pose(p,false);continue}leave(p)}pose(p,false);continue}
    const T=p.P[p.i];if(T[8]&&!T.r)pickChair(p,T);
    const t=new THREE.Vector3(T[0]+(T[3]?0:p.j),0,T[1]),v=t.clone().sub(p.g.position);v.y=0;const d=v.length();
    if(d<.2){p.mv=false;p.w=T[2]*(.6+Math.random()*.8);p.gk=T[4]||null;if(p.gk){const g=GQ[p.gk]||(GQ[p.gk]={n:0,s:0,t:0,w:null});p.tk=g.n++;if(p.w<=0)p.w=.01}if(T[5]!=null)p.g.rotation.y=T[5];if(T[3]&&p.w>0)sitP(p,1);p.i++;if(p.i>=p.P.length){p.mv=false;leave(p);SC.remove(p.g);pats.splice(k,1)}}
    else{let dy=Math.atan2(v.x,v.z)-p.g.rotation.y;dy=Math.atan2(Math.sin(dy),Math.cos(dy));p.g.rotation.y+=dy*Math.min(1,dt*9);p.g.position.addScaledVector(v.normalize(),Math.min(p.sp*dt,d));pose(p,true)}}}
/* ===== คงสถานะผู้ป่วยที่เดินอยู่ข้ามการรีเฟรช: บันทึกตำแหน่ง/เส้นทางทุก 2 วินาที แล้วกู้คืนเมื่อเปิดใหม่ (อายุไม่เกิน 10 นาที) ===== */
const WKEY='v3walk12',WTTL=6e5;let warmed=false;
function saveW(){try{if(!pats.length)return;localStorage.setItem(WKEY,JSON.stringify({t:Date.now(),rt:RT?1:0,dc,rcn,spawnT,flowT,pats:pats.map(p=>({P:p.P,i:p.i,w:p.w,j:p.j,sp:p.sp,x:+p.g.position.x.toFixed(2),z:+p.g.position.z.toFixed(2),k:p.kind,sh:p.shirt,sd:p.seed,q:p.q||null,dk:p.dk==null?null:p.dk,s:p.sit?1:0}))}))}catch(e){}}
function restoreW(){try{const o=JSON.parse(localStorage.getItem(WKEY)||'null');if(!o||Date.now()-o.t>WTTL||!Array.isArray(o.pats)||(o.rt?1:0)!==(RT?1:0))return false;
  dc=o.dc|0;rcn=o.rcn|0;spawnT=+o.spawnT||0;flowT=+o.flowT||0;
  o.pats.slice(0,95).forEach(q=>{if(!Array.isArray(q.P)||!q.P.length)return;const w=mkWalker(q.P,q.j,q.k||'m',q.sh||SHIRT[0],q.sd|0);w.g.position.set(q.x,0,q.z);w.i=q.i;w.w=q.w;w.sp=q.sp;if(q.dk!=null)w.dk=q.dk;if(q.q){w.q=q.q;addTag(w.g,q.q)}if(q.s)sitP(w,1)});
  return pats.length>0}catch(e){return false}}
function warmW(){} // ไม่มีตัวละครจำลองสุ่มแล้ว: ฉากแสดงเฉพาะผู้ป่วยจากฐานข้อมูล
/* ===== เล่นซ้ำเส้นทางจริงจากข้อมูล (queue_call_log): 1 คน = 1 vn (ถ้าไม่มี vn ใช้ hn/queue_no) · เดินตามลำดับจุดและเวลาเรียกคิวจริง
   ไม่สุ่ม ไม่ผูกกับเวลาจริง · เร่ง/หน่วง/ข้ามเวลาได้ · ก่อนถูกเรียกจะรอที่เก้าอี้หน้าจุดถัดไป → ถูกเรียก = เดินไปจุดบริการ → เรียกจุดถัดไป = เดินต่อ ===== */
const RP={on:false,visits:[],nx:0,t:0,w0:0,w1:0,loop:0,all:[],play:true,speed:1,day:'',sig:'',pick:null,act:[],oT:0,uT:0}; // สถานะฉาก: on=มีข้อมูลให้แสดง, visits=ผู้ป่วยที่เกี่ยวข้องกับช่วงเล่น, t=นาฬิกาในฉาก(วินาที), w0..w1=ช่วงย้อนหลังที่กำลังเล่น, loop=รอบที่เล่น, all=เหตุการณ์ทั้งวันจาก hospital_visit_flow_stats
const GN={},GE={};
function gnode(id,x,z){if(!GN[id]){GN[id]=[x,z];GE[id]=[]}return id}
function gedge(a,b){const d=Math.hypot(GN[a][0]-GN[b][0],GN[a][1]-GN[b][1]);GE[a].push([b,d]);GE[b].push([a,d])}
function glane(ids){for(let i=1;i<ids.length;i++)if(ids[i]!==ids[i-1])gedge(ids[i-1],ids[i])}
const LZ1=12,LX1=-13.2,LX2=21.2,LZ3=-7.2,phSp=[9,10.5,12,13.5],caSp=[-7.5,-6,-4.5,-3];
/* ทางเดินในโรงพยาบาล: ทางเข้า→ห้องบัตร→แนวหน้าโต๊ะ (z=12)→ทางเดินตั้งซ้าย/ขวา→ทางเดินล่าง (z=-7.2)→ทางออก */
(function(){
  ['ENT|-42.2|14','B|-40.5|14','R1|-26|13.2','J1|-19.5|12','J2|-13.2|12','J3|21.2|12','K1|-13.2|-7.2','K2|21.2|-7.2','X0|-37|-7.2','EXIT|-41.5|-12'].forEach(q=>{const a=q.split('|');gnode(a[0],+a[1],+a[2])});
  glane(['ENT','B','R1','J1']);glane(['J2','K1']);glane(['X0','EXIT']);
  const lane=(items,hor,fix)=>{const m=new Map();items.forEach(([id,c])=>m.set(id,c));const a=[...m.entries()].sort((p,q)=>p[1]-q[1]);a.forEach(([id,c])=>hor?gnode(id,c,fix):gnode(id,fix,c));glane(a.map(e=>e[0]))};
  lane([['J1',-19.5],['J2',LX1],['J3',LX2],...XD.map(x=>['H1:'+x,x]),...CHS.map(c=>['H1:'+c[0],c[0]])],true,LZ1);
  lane([['J3',LZ1],['K2',LZ3],...XR.map(z=>['V2:'+z,z])],false,LX2);
  lane([['X0',-37],['K1',LX1],['K2',LX2],...caSp.map(x=>['H3:'+x,x]),...CHC.map(c=>['H3:'+c[0],c[0]]),...phSp.map(x=>['H3:'+x,x]),...CHP.map(c=>['H3:'+c[0],c[0]])],true,LZ3);
})();
function groute(a,b){if(a===b)return[a];const d={},pv={},q=new Set(Object.keys(GN));for(const k of q)d[k]=1e9;d[a]=0;
  while(q.size){let u=null;for(const k of q)if(u===null||d[k]<d[u])u=k;if(u===b||d[u]>=1e9)break;q.delete(u);for(const [v,w] of GE[u])if(q.has(v)&&d[u]+w<d[v]){d[v]=d[u]+w;pv[v]=u}}
  const r=[];let c=b;while(c!==undefined){r.unshift(c);c=pv[c]}return r[0]===a?r:[a,b]}
const RCH={S:Array(CHS.length).fill(0),R:Array(CHR.length).fill(0),P:Array(CHP.length).fill(0),C:Array(CHC.length).fill(0)},RCL={S:CHS,R:CHR,P:CHP,C:CHC};
function chairPick(kind,a,n){const oc=RCH[kind];let b=a;for(let i=a;i<a+n;i++)if(oc[i]<oc[b])b=i;oc[b]++;return b}
/* ตำแหน่งหนึ่งจุด = {node: จุดต่อทางเดิน, tail: จุดเดินต่อจากทางเดิน, face, sit, st: จุดบริการที่นับคน, ch: เก้าอี้ที่จอง} */
function mkLoc(p,key,wait){const m=/^(ex|hx)(\d+)$/.exec(key),h=p.seed;
  if(key==='ENT')return{node:'ENT',tail:[],face:0};
  if(key==='EXIT')return{node:'EXIT',tail:[],face:0,exit:1};
  if(key==='reg')return{node:'R1',tail:[[-34+(h%80)/10,14.4]],face:0,st:'reg'};
  if(m&&m[1]==='hx'){const k=+m[2]-1;if(wait){const i=chairPick('S',0,CHS.length),c=CHS[i];return{node:'H1:'+c[0],tail:[[c[0],c[1]]],face:0,sit:1,st:key,ch:['S',i]}}
    const x=XD[k];return{node:'H1:'+x,tail:[[x,ZD-3.8],[x,ZD-1.3]],face:0,sit:1,st:key}}
  if(m&&m[1]==='ex'){const r=+m[2]-1,zr=XR[r];if(wait){const i=chairPick('R',r*4,4),c=CHR[i];return{node:'V2:'+zr,tail:[[c[0],c[1]]],face:Math.PI/2,sit:1,st:key,ch:['R',i]}}
    return{node:'V2:'+zr,tail:[[RX-3.8,zr],[RX-.4,zr]],face:Math.PI/2,st:key}}
  if(key==='ph'){if(wait){const i=chairPick('P',0,CHP.length),c=CHP[i];return{node:'H3:'+c[0],tail:[[c[0],c[1]]],face:Math.PI,sit:1,st:key,ch:['P',i]}}
    const x=phSp[h%phSp.length];return{node:'H3:'+x,tail:[[x,-10.9]],face:Math.PI,st:key}}
  if(key==='cash'){if(wait){const i=chairPick('C',0,CHC.length),c=CHC[i];return{node:'H3:'+c[0],tail:[[c[0],c[1]]],face:Math.PI,sit:1,st:key,ch:['C',i]}}
    const x=caSp[h%caSp.length];return{node:'H3:'+x,tail:[[x,-10.9]],face:Math.PI,st:key}}
  return{node:'ENT',tail:[],face:0}}
function mkPath(a,b){const pts=[];if(a.tail.length){for(let i=a.tail.length-2;i>=0;i--)pts.push(a.tail[i]);pts.push(GN[a.node])}
  const r=groute(a.node,b.node);for(let i=1;i<r.length;i++)pts.push(GN[r[i]]);b.tail.forEach(t=>pts.push(t));return pts}
/* เวลาไทย (วินาทีนับจากเที่ยงคืน) ของ called_at */
function secOf(s){s=String(s||'');const m=s.match(/(?:T|\s)(\d\d):(\d\d)(?::(\d\d))?/);if(!m)return NaN;
  if(/(Z|[+-]\d\d(:?\d\d)?)$/.test(s)){const d=new Date(s);if(!isNaN(d)){const p=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Bangkok',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).formatToParts(d),g=t=>+p.find(x=>x.type===t).value;return (g('hour')%24)*3600+g('minute')*60+g('second')}}
  return +m[1]*3600+ +m[2]*60+(+m[3]||0)}
const DW={reg:120,hx:240,ex:480,ph:180,cash:120},dwOf=k=>DW[k.slice(0,2)==='hx'?'hx':k.slice(0,2)==='ex'?'ex':k]||180; // เวลาอยู่ที่จุดโดยประมาณ (วินาที) ก่อนเดินไปรอจุดถัดไป
function schedule(c,v){ // สร้างตารางเวลาเดินของผู้ป่วย 1 คน จากรายการเรียกคิว c (v=ข้อมูลผู้ป่วย)
  const s=[]; // รายการจุดที่ผู้ป่วยต้องไปตามเวลา
  s.push({t:c[0].t-(c[0].k==='reg'?60:150),k:'ENT'}); // เดินเข้ามาทางประตูก่อนเหตุการณ์แรก (60 วินาที ถ้าเริ่มที่ห้องบัตร ไม่งั้น 150)
  c.forEach((x,i)=>{ // วนทุกครั้งที่ถูกเรียก
    if(x.k!=='reg'){ // ห้องบัตรไม่ต้องนั่งรอ
      let tw=null; // เวลาที่เริ่มนั่งรอ
      if(i===0)tw=x.t-120; // เหตุการณ์แรกที่ไม่ใช่ห้องบัตร → มานั่งรอก่อน 2 นาที
      else{ // มีจุดก่อนหน้า
        const pr=c[i-1],gap=x.t-pr.t; // pr=จุดก่อนหน้า, gap=ช่องว่างเวลาระหว่างสองจุด
        if(gap>120)tw=pr.t+Math.min(pr.dw||dwOf(pr.k),gap-90) // ห่างเกิน 2 นาที → นั่งรอหลังเสร็จจุดก่อนหน้า
      }
      if(tw!=null&&tw<x.t-5)s.push({t:tw,k:x.k,w:1,q:x.q}) // เพิ่มช่วงนั่งรอที่เก้าอี้หน้าจุดที่กำลังจะถูกเรียก
    }
    s.push({t:x.t,k:x.k,q:x.q}) // ถูกเรียกคิว → เดินไปจุดบริการ
  });
  const l=c[c.length-1]; // เหตุการณ์สุดท้าย
  if(v&&v.open){ // ผู้ป่วยยังอยู่ในโรงพยาบาล
    if(v.pend)s.push({t:l.t+Math.min(l.dw||dwOf(l.k),90),k:v.pend,w:1,q:l.q}); // นั่งรอที่จุดถัดไป
    return s // ไม่เดินออก
  }
  s.push({t:l.t+(l.dw||dwOf(l.k)),k:'EXIT'}); // เสร็จแล้วเดินออกหลังอยู่ครบเวลา
  return s // คืนตารางเวลา
}
function buildVisits(rows){ // รวมเหตุการณ์เป็นรายผู้ป่วย แล้วสร้างตารางเวลาเดิน
  const m=new Map(),PD=new Map(); // m=ผู้ป่วยแยกตามรหัส, PD=ผู้ป่วยที่ยังค้างอยู่ในโรงพยาบาล
  (rows.pend||[]).forEach(p=>PD.set('v'+p.vn,p)); // จัดรายชื่อคนที่ค้างตามรหัส vn
  rows.forEach(r=>{ // วนทุกเหตุการณ์
    if(!r._k)return; // จุดที่แมปไม่ได้ ข้าม
    const key=r.vn!=null&&r.vn!==''?'v'+r.vn:r.hn!=null&&r.hn!==''?'h'+r.hn:'q'+r.queue_no; // รหัสผู้ป่วย: ใช้ vn ก่อน → hn → หมายเลขคิว
    let v=m.get(key); // หาผู้ป่วยที่เคยสร้างไว้แล้ว
    if(!v){v={id:key,q:String(r.queue_no),calls:[]};m.set(key,v)} // ยังไม่มีให้สร้างใหม่
    v.calls.push({t:secOf(r.called_at),k:r._k,q:String(r.queue_no),dw:r._dw}) // เพิ่มเหตุการณ์ (เวลาเป็นวินาที, จุด, คิว, เวลาอยู่ที่จุด)
  });
  const out=[]; // ผู้ป่วยที่สร้างเสร็จแล้ว
  m.forEach(v=>{ // วนทุกผู้ป่วย
    v.calls.sort((a,b)=>a.t-b.t); // เรียงเหตุการณ์ตามเวลา
    const c=[]; // เหตุการณ์ที่ใช้จริงหลังกรอง
    v.calls.forEach(x=>{ // กรองเหตุการณ์
      if(!isFinite(x.t))return; // เวลาไม่ถูกต้อง ข้าม
      if(c.length&&c[c.length-1].k===x.k)return; // เรียกจุดเดิมซ้ำติดกัน ข้าม
      c.push(x) // เก็บเหตุการณ์
    });
    if(!c.length)return; // ไม่เหลือเหตุการณ์เลย ข้ามผู้ป่วยคนนี้
    v.q=c[0].q; // หมายเลขคิวที่แสดงบนตัวละคร
    v.seed=hsh(v.id); // เมล็ดสุ่มคงที่ (หน้าตา/ตำแหน่งยืนเหมือนเดิมทุกครั้ง)
    const pd=PD.get(v.id); // ผู้ป่วยคนนี้ยังค้างอยู่ในโรงพยาบาลไหม
    if(pd){v.open=1;v.pend=pd.k} // ค้างอยู่ → ไม่เดินออก และจดจุดที่กำลังรอ
    v.sched=schedule(c,v); // สร้างตารางเวลาเดิน
    v.t0=v.sched[0].t; // เวลาเข้าฉาก
    v.t1=v.sched[v.sched.length-1].t; // เวลาออกจากฉาก
    out.push(v) // เก็บผู้ป่วย
  });
  out.forEach(v=>{if(v.open)v.t1=Infinity}); // คนที่ยังอยู่ในโรงพยาบาลคงอยู่ในฉากจนกว่าข้อมูลใหม่จะบอกว่ากลับบ้านแล้ว
  return out.sort((a,b)=>a.t0-b.t0) // เรียงตามเวลาเข้าฉาก
}
function rnew(v){const sd=v.seed,g=human(SHIRT[sd%SHIRT.length],kindQ(v.q),sd);g.position.set(GN.ENT[0],0,GN.ENT[1]);SC.add(g);
  const p={g,v,ti:0,loc:null,dest:null,wp:[],sp:5,ph0:Math.random()*6,seed:sd,sit:0};p.tag=addTag(g,v.q);RP.act.push(p);return p}
const setTag=(p,t)=>{p.tag.material=qtag(t).material};
function rclear(){RP.act.forEach(p=>SC.remove(p.g));RP.act.length=0;for(const k in RCH)RCH[k].fill(0)}
function rremove(p){if(p.loc&&p.loc.ch)RCH[p.loc.ch[0]][p.loc.ch[1]]--;SC.remove(p.g);const i=RP.act.indexOf(p);if(i>=0)RP.act.splice(i,1)}
function rarrive(p){p.loc=p.dest;p.g.rotation.y=p.loc.face||0;if(p.loc.sit)sitP(p,1);else p.g.position.y=0;pose(p,false);if(p.loc.exit)rremove(p)}
function rgo(p,s){const old=p.loc;if(old&&old.ch){RCH[old.ch[0]][old.ch[1]]--;old.ch=null}if(p.sit)sitP(p,0);
  const nl=mkLoc(p,s.k,s.w);if(s.q)setTag(p,s.q);p.dest=nl;p.wp=mkPath(old,nl).map(a=>[a[0],a[1]]);if(!p.wp.length)rarrive(p)}
function rseek(T){rclear();const V=RP.visits;RP.nx=0;while(RP.nx<V.length&&V[RP.nx].t0<=T)RP.nx++;
  for(let i=0;i<RP.nx;i++){const v=V[i];if(v.t1<=T)continue;let j=0;while(j+1<v.sched.length&&v.sched[j+1].t<=T)j++;
    const p=rnew(v),s=v.sched[j];p.ti=j;const l=mkLoc(p,s.k,s.w);if(s.q)setTag(p,s.q);p.loc=l;p.dest=l;const e=l.tail.length?l.tail[l.tail.length-1]:GN[l.node];
    p.g.position.set(e[0],0,e[1]);p.g.rotation.y=l.face||0;if(l.sit)sitP(p,1)}
  rocc()}
/* ความหนาแน่นสด: จำนวนคนที่อยู่/กำลังไปรอที่แต่ละจุด ณ เวลาที่เล่นอยู่ */
function rocc(){const o={};RP.act.forEach(p=>{const st=p.dest&&p.dest.st;if(st)o[st]=(o[st]||0)+1});
  ITEMS.forEach((it,k)=>{const n=o[it.id]||0;if(it._n===n)return;it._n=n;const dk=!n?'na':n<=2?'ok':n<=4?'warn':'bad';HPAD[k].material.color.setHex(COL[dk]);HPAD[k].material.opacity=n?.2+Math.min(1,n/6)*.4:0;paint(it.lb,it.name,n+' คน',CSS[dk])})}
/* ===== รีเพลย์ย้อนหลัง LIVE3D.win นาที (15) จากตาราง hospital_visit_flow_stats =====
   · ช่วงเล่น = [ตอนนี้ − 15 นาที, ตอนนี้] ใช้นาฬิกาของฉากเอง (RP.t) เดินจากต้นช่วงไปปลายช่วงด้วยความเร็ว LIVE3D.speed
   · เล่นจบแล้วขึ้นช่วงใหม่ทันที: speed=1 → ช่วงใหม่ต่อจากช่วงเดิมพอดี คนในฉากเดินต่อโดยไม่กระตุก · speed>1 → วนเล่น 15 นาทีล่าสุดซ้ำ
   · แสดงเฉพาะผู้ป่วยที่มีความเคลื่อนไหวภายใน LIVE3D.pad นาทีก่อนช่วงเล่น → visit ค้างเก่า (ไม่มีเวลาจ่ายยาแต่กลับบ้านไปแล้ว) ไม่ไปนั่งค้างในฉาก */
const vkey=r=>r.vn!=null&&r.vn!==''?'v'+r.vn:r.hn!=null&&r.hn!==''?'h'+r.hn:'q'+r.queue_no; // รหัสผู้ป่วย (ต้องตรงกับที่ buildVisits ใช้)
function winRows(all,w0,w1){ // เลือกเหตุการณ์ของผู้ป่วยที่ยังเกี่ยวข้องกับช่วง w0..w1
  const last=new Map(),pad=LIVE3D.pad*60; // last = เวลาเหตุการณ์ล่าสุดของผู้ป่วยแต่ละคน (วินาที)
  all.forEach(r=>{const t=secOf(r.called_at),k=vkey(r);if(isFinite(t)&&!(last.get(k)>=t))last.set(k,t)});
  const rows=all.filter(r=>last.get(vkey(r))>=w0-pad); // เงียบไปนานกว่า pad ก่อนเริ่มช่วง = กลับไปแล้ว ไม่ต้องอยู่ในฉาก
  rows.pend=(all.pend||[]).filter(p=>last.get('v'+p.vn)>=w1-pad); // ผู้ป่วยที่ ยังค้างอยู่ ต้องมีความเคลื่อนไหวภายใน pad ก่อนจบช่วง ไม่งั้นถือว่าข้อมูลค้างเก่า
  return rows}
const rsig=rows=>RP.day+'|'+RP.w0+'|'+rows.length+'|'+(rows.length?rows[rows.length-1].called_at:'')+'|'+(rows.pend||[]).length; // ลายเซ็นข้อมูลของช่วงเล่น ถ้าไม่เปลี่ยนไม่ต้องสร้างใหม่
function rnext(){ // เล่นจบช่วงแล้ว → ขึ้นช่วงใหม่ = ย้อนดู 15 นาทีล่าสุด ณ ตอนนี้
  const old=RP.w1,[a,b]=rwin(),cont=Math.abs(a-old)<=90; // cont = ช่วงใหม่ต่อจากช่วงที่เพิ่งเล่นจบพอดี (เล่น 1 เท่า)
  RP.w0=cont?old:a;RP.w1=b;RP.loop++;
  const rows=winRows(RP.all,RP.w0,RP.w1);RP.visits=buildVisits(rows);RP.sig=rsig(rows);
  if(cont){ // ต่อเนื่อง: ไม่วางตัวละครใหม่ ให้คนที่อยู่ในฉากใช้ตารางเดินจากข้อมูลล่าสุดแทน
    const T=RP.t,m=new Map(RP.visits.map(v=>[v.id,v]));
    for(let k=RP.act.length-1;k>=0;k--){const p=RP.act[k],nv=p.v&&m.get(p.v.id);if(!nv||nv.t1<=T)rremove(p);else{p.v=nv;p.ti=Math.min(p.ti,nv.sched.length-1)}}
    RP.nx=0;while(RP.nx<RP.visits.length&&RP.visits[RP.nx].t0<=T)RP.nx++
  }else{RP.t=RP.w0;rseek(RP.t)} // ไม่ต่อเนื่อง (วนเล่นซ้ำ/แท็บถูกพักไว้): กลับไปต้นช่วงแล้ววางตัวละครตามเวลา
  rui()}
function rstep(dt){ // ขยับผู้ป่วยตามนาฬิการีเพลย์ (ย้อนหลัง LIVE3D.win นาที)
  RP.t+=dt*LIVE3D.speed; // นาฬิกาในฉากเดินจากต้นช่วงไปปลายช่วง
  if(RP.t>=RP.w1){rnext();return} // เล่นจบช่วงแล้ว → ขึ้นช่วงใหม่
  const T=RP.t,V=RP.visits;while(RP.nx<V.length&&V[RP.nx].t0<=T){const v=V[RP.nx++];if(v.t1<=T)continue;const p=rnew(v);p.loc=mkLoc(p,'ENT');p.dest=p.loc}
  const spd=4*Math.min(3,Math.max(1,Math.sqrt(LIVE3D.speed))); // เล่นเร็วขึ้น คนเดินเร็วขึ้นตาม (สูงสุด 3 เท่า)
  for(let k=RP.act.length-1;k>=0;k--){const p=RP.act[k];if(!p||!p.v)continue;p.sp=spd;
    if(!p.wp.length){let j=p.ti;while(j+1<p.v.sched.length&&p.v.sched[j+1].t<=T)j++;if(j>p.ti){p.ti=j;rgo(p,p.v.sched[j]);if(!RP.act.includes(p))continue}}
    if(p.wp.length){const pt=p.wp[0],dx=pt[0]-p.g.position.x,dz=pt[1]-p.g.position.z,d=Math.hypot(dx,dz);
      if(d<.15){p.wp.shift();if(!p.wp.length)rarrive(p)}
      else{let dy=Math.atan2(dx,dz)-p.g.rotation.y;dy=Math.atan2(Math.sin(dy),Math.cos(dy));p.g.rotation.y+=dy*Math.min(1,dt*9);const st=Math.min(spd*dt,d);p.g.position.x+=dx/d*st;p.g.position.z+=dz/d*st;pose(p,true)}}
    else pose(p,false)}
  RP.oT+=dt;if(RP.oT>.4){RP.oT=0;rocc()}RP.uT+=dt;if(RP.uT>.15){RP.uT=0;rui()}}
const hms=t=>{t=Math.max(0,Math.floor(t))%86400;return String(Math.floor(t/3600)).padStart(2,'0')+':'+String(Math.floor(t%3600/60)).padStart(2,'0')+':'+String(t%60).padStart(2,'0')};
let MSG='กำลังโหลดข้อมูล…',PRE='',SRC='',UNM=[]; // MSG=ข้อความผิดพลาด/กำลังโหลด, PRE=คำนำหน้า (ข้อมูลตัวอย่าง), SRC=ตารางที่ใช้จริง, UNM=สถานีที่ไม่รู้จัก
function rui(){ // อัปเดตข้อความสถานะ (ไม่มีแผงควบคุมการเล่นแล้ว)
  const el=$('#vmsg'); // กล่องข้อความสถานะ
  let tx; // ข้อความที่จะแสดง
  if(MSG)tx=MSG; // มีข้อความพิเศษ (กำลังโหลด/ผิดพลาด) → แสดงอันนั้น
  else if(RP.on){const n0=RP.visits.filter(v=>v.t1>RP.w0&&v.t0<RP.w1).length,pc=Math.min(100,Math.max(0,Math.round((RP.t-RP.w0)/Math.max(1,RP.w1-RP.w0)*100)));tx=PRE+SRC+' · รีเพลย์ย้อนหลัง '+LIVE3D.win+' นาที '+hhmm(RP.w0)+'–'+hhmm(RP.w1)+' น. · กำลังเล่น '+hms(RP.t)+' น. ('+pc+'%)'+(LIVE3D.speed!==1?' · เร็ว ×'+LIVE3D.speed:'')+' · ในฉาก '+fm(RP.act.length)+' คน · ผู้ป่วยในช่วงนี้ '+fm(n0)+' คน'+(UNM.length?' · ไม่รู้จักสถานี: '+UNM.slice(0,3).join(', '):'')} // กำลังรีเพลย์ข้อมูลจริง
  else tx=PRE+'วันนี้ยังไม่มีข้อมูลเส้นทางผู้ป่วยในตาราง '+(SRC||FLOW_TABLE); // ไม่มีข้อมูลของวันนี้
  if(el.textContent!==tx)el.textContent=tx // เปลี่ยนเฉพาะเมื่อข้อความต่างจากเดิม (ลดการแตะ DOM)
}
function rsetup(D){ // ตั้งฉากจากข้อมูลวันนี้ (เรียกทุกครั้งที่โหลดข้อมูลใหม่ ทุก 60 วินาที)
  const all=D.q||[]; // เหตุการณ์ทั้งวันที่แปลงจากแถวใน hospital_visit_flow_stats
  RP.all=all; // เก็บไว้ให้ rnext ใช้สร้างช่วงถัดไปโดยไม่ต้องรอโหลดใหม่
  if(!RP.on||!RP.w1||RP.day!==D.day){[RP.w0,RP.w1]=rwin();RP.t=RP.w0;RP.loop=0;RP.sig=''} // เริ่มช่วงเล่นใหม่ (ครั้งแรก / เพิ่งมีข้อมูล / ขึ้นวันใหม่) ถ้ากำลังเล่นอยู่ให้เล่นต่อในช่วงเดิม
  RP.day=D.day; // จำวันที่
  const rows=winRows(all,RP.w0,RP.w1),sig=rsig(rows); // เหตุการณ์ของช่วงที่กำลังเล่น + ลายเซ็น
  let ch=false; // ch=ต้องวางตัวละครใหม่ไหม
  if(sig!==RP.sig){ // มีข้อมูลใหม่จาก n8n ที่เกี่ยวกับช่วงนี้
    RP.visits=buildVisits(rows); // สร้างตารางเดินของผู้ป่วยในช่วงนี้ใหม่
    RP.sig=sig; // จำลายเซ็นไว้เทียบรอบหน้า
    ch=true // ต้องวางตัวละครใหม่
  }
  RP.on=all.length>0&&!!D.live; // วันนี้มีข้อมูลเส้นทางผู้ป่วย (ช่วง 15 นาทีว่างก็ยังเล่น เพื่อรอผู้ป่วยรายใหม่)
  if(RP.on){ // มีข้อมูลให้แสดง
    if(pats.length){pats.forEach(p=>SC.remove(p.g));pats.length=0} // ลบตัวละครสุ่มเดิม (ถ้ามี)
    if(ch)rseek(RP.t) // วางตัวละครตามเวลาในฉาก
  }else rclear(); // ไม่มีข้อมูล → ล้างฉาก
  rui() // อัปเดตข้อความสถานะ
}
restoreW();setInterval(saveW,2000);addEventListener('pagehide',saveW);document.addEventListener('visibilitychange',()=>{if(document.hidden)saveW()});
/* กล้อง */
const HOME={th:.28,ph:.8,rad:66,t:[0,0,3]};let camTouched=false,WZ=false; // camTouched = ผู้ใช้ซูม/หมุนเองแล้ว (ไม่ปรับระยะกล้องอัตโนมัติอีก)
let th=HOME.th,ph=HOME.ph,rad=HOME.rad,tgt=new THREE.Vector3(...HOME.t); // มุมกล้องเริ่มต้นคงที่ ไม่หมุนอัตโนมัติ
function cam(){CAM.position.set(tgt.x+rad*Math.sin(ph)*Math.sin(th),tgt.y+rad*Math.cos(ph),tgt.z+rad*Math.sin(ph)*Math.cos(th));CAM.lookAt(tgt)}
let drag=null,moved=0;const pts=new Map();
cv.addEventListener('pointerdown',e=>{cv.setPointerCapture(e.pointerId);pts.set(e.pointerId,[e.clientX,e.clientY]);drag=[e.clientX,e.clientY];moved=0});
cv.addEventListener('pointermove',e=>{
  if(pts.size===2&&pts.has(e.pointerId)){const o=[...pts.entries()].find(a=>a[0]!==e.pointerId)[1],p=pts.get(e.pointerId),d0=Math.hypot(p[0]-o[0],p[1]-o[1]);pts.set(e.pointerId,[e.clientX,e.clientY]);camTouched=true;rad=Math.min(150,Math.max(16,rad*d0/Math.hypot(e.clientX-o[0],e.clientY-o[1])));moved=9;return}
  if(pts.has(e.pointerId))pts.set(e.pointerId,[e.clientX,e.clientY]);
  if(drag&&pts.size===1){const dx=e.clientX-drag[0],dy=e.clientY-drag[1];moved+=Math.abs(dx)+Math.abs(dy);if(moved>6){camTouched=true;th-=dx*.006;ph=Math.min(1.5,Math.max(.12,ph-dy*.005))}drag=[e.clientX,e.clientY]}
  else hover(e)});
cv.addEventListener('pointerup',e=>{pts.delete(e.pointerId);if(moved<6&&pts.size===0)clickAt(e);drag=null});
cv.addEventListener('wheel',e=>{if(!(WZ||e.ctrlKey||e.metaKey))return;e.preventDefault();camTouched=true;rad=Math.min(150,Math.max(16,rad*(1+Math.max(-120,Math.min(120,e.deltaY))*.001)))},{passive:false}); // ล้อเมาส์ซูมเมื่อเปิดปุ่ม 🖱 (ไม่งั้นต้องกด Ctrl ค้าง)
const rc=new THREE.Raycaster(),mv=new THREE.Vector2();
function hit(e){const b=cv.getBoundingClientRect();mv.set((e.clientX-b.left)/b.width*2-1,-((e.clientY-b.top)/b.height)*2+1);rc.setFromCamera(mv,CAM);const h=rc.intersectObjects(pick)[0];return h?h.object.userData.i:null}
function hover(e){cv.style.cursor=hit(e)!=null?'pointer':'grab'}
function clickAt(e){const i=hit(e);if(i!=null)select(i)}

/* ---------- UI / ข้อมูล ---------- */
/* เปิด/ปิดแถบเครื่องมือทั้งหมด (สถิติด้านบน รายการซ้าย รายละเอียดขวา คำแนะนำ ปุ่มซูม) */
{ // บล็อกสลับการแสดง/ซ่อนแถบเครื่องมือ
  const tb=()=>{ // คืน true ถ้าควรซ่อนแถบเครื่องมือ
    if(/[?&]tools=1/.test(location.search))return false; // URL มี ?tools=1 → แสดงแถบ
    try{ // อ่านค่าที่ผู้ใช้เคยเลือกไว้
      const v=store.getItem('v3tb'); // '0'=ซ่อน, '1'=แสดง, null=ยังไม่เคยเลือก
      return v===null?true:v==='0' // ยังไม่เคยเลือก → ซ่อน (โหมดอัตโนมัติ)
    }catch(e){return true} // อ่านไม่ได้ → ซ่อน
  };
  const ap=h=>{ // ใช้สถานะซ่อน/แสดง (h=true คือซ่อน)
    V.classList.toggle('tbh',h); // เปิด/ปิดคลาส tbh ที่ซ่อนแถบเครื่องมือ
    $('#vtg').textContent=h?'☰ แสดงแถบเครื่องมือ':'✕ ซ่อนแถบเครื่องมือ'; // ข้อความบนปุ่มสลับ
    $('#vtg').title=h?'แสดงแถบเครื่องมือ':'ซ่อนแถบเครื่องมือ' // คำอธิบายเมื่อชี้เมาส์
  };
  ap(tb()); // ใช้สถานะเริ่มต้นตอนเปิดหน้า
  $('#vtg').onclick=()=>{ // กดปุ่มสลับ
    const h=!V.classList.contains('tbh'); // สถานะใหม่ = ตรงข้ามกับปัจจุบัน
    ap(h); // ใช้สถานะใหม่
    try{store.setItem('v3tb',h?'0':'1')}catch(e){} // จำตัวเลือกของผู้ใช้ไว้
  }
}
let sel=null,hT;const vl=$('#vlist');
function showL(){vl.classList.remove('hid');clearTimeout(hT);hT=setTimeout(()=>{if(vl.matches(':hover'))showL();else vl.classList.add('hid')},4000)}
V.addEventListener('pointermove',showL);V.addEventListener('pointerdown',showL);showL();
const stt=(w,tg)=>w==null?'ok':w<=tg?'ok':w<=tg*1.3?'warn':'bad';
const split=(t,k)=>Array.from({length:k},(_,i)=>Math.floor(t/k)+(i<t%k?1:0));
function model(D){const d=D.d,opd=n(d.opd_daily_count),adm=n(d.ipd_new_admit_daily),dis=n(d.ipd_discharged_daily),net=Math.max(opd-adm-dis,0);
  const tri=val(d.avg_wait_reg_to_triage),doc=val(d.avg_wait_for_doctor),con=val(d.avg_doctor_consult_time),pha=val(d.avg_wait_for_pharmacy),tot=val(d.avg_total_process_time);
  const dk=split(net,7),rm=split(net,6),mn=v=>v==null?'-':fm(v,1)+' นาที';
  const info=ITEMS.map(o=>{
    if(o.kind==='reg')return{cnt:opd,big:opd,st:'ok',u:'ราย (เปิดบัตรวันนี้)',rows:[['ผู้ป่วยนอกทั้งหมด',fm(opd)+' ราย'],['หัก: รับเป็นผู้ป่วยใน','− '+fm(adm)+' ราย'],['หัก: จำหน่ายออก','− '+fm(dis)+' ราย'],['คงเหลือเข้าระบบตรวจ',fm(net)+' ราย'],['ผู้ป่วย ER',fm(D.er)+' ครั้ง']]};
    if(o.kind==='desk')return{cnt:dk[o.no-1],tm:tri,big:tri==null?'-':fm(tri,1),st:tri==null?'na':stt(tri,TG.triage),u:'นาที (รอคัดกรอง/ซักประวัติ)',rows:[['คนที่ต้องซักประวัติ',fm(dk[o.no-1])+' ราย'],['สัดส่วน','1 ใน 7 โต๊ะ ('+fm(net?dk[o.no-1]/net*100:0,1)+'%)'],['เวลารอคัดกรอง',mn(tri)],['เป้าหมาย','≤ '+TG.triage+' นาที'],['ฐานคำนวณ','OPD − IPD − จำหน่าย = '+fm(net)]]};
    if(o.kind==='room')return{cnt:rm[o.no-1],tm:doc,big:doc==null?'-':fm(doc,1),st:doc==null?'na':stt(doc,TG.doctor),u:'นาที (รอพบแพทย์)',rows:[['คนที่ต้องเข้าตรวจ',fm(rm[o.no-1])+' ราย'],['สัดส่วน','1 ใน 6 ห้อง ('+fm(net?rm[o.no-1]/net*100:0,1)+'%)'],['เวลารอพบแพทย์',mn(doc)],['เป้าหมาย','≤ '+TG.doctor+' นาที'],['เวลาตรวจเฉลี่ย',mn(con)]]};
    if(o.kind==='cash'){ // จุดห้องเก็บเงิน
      const c=Math.round(net*CASHP),fa=D.fa,cw=fa&&fa.cash!=null?fa.cash:null; // c=จำนวนผู้ชำระโดยประมาณ, fa=ค่าเฉลี่ยจากตารางเส้นทาง, cw=เวลารอชำระเงินเฉลี่ย (นาที)
      if(cw!=null)return{ // มีเวลารอจริงจากตาราง → แสดงค่าจริง
        cnt:fa.nCash, // จำนวนผู้ชำระเงินวันนี้
        tm:cw, // เวลารอ (นาที) ใช้กำหนดสี
        big:fm(cw,1), // ตัวเลขใหญ่บนป้าย
        st:stt(cw,TG.cash), // สถานะสีเทียบกับเป้าหมาย
        u:'นาที (รอชำระเงิน)', // หน่วย/คำอธิบาย
        rows:[['ผู้ชำระเงินวันนี้',fm(fa.nCash)+' ราย'],['เวลารอชำระเงิน',mn(cw)],['เป้าหมาย','≤ '+TG.cash+' นาที']] // แถวรายละเอียดในแผง
      };
      return{ // ไม่มีเวลาจริง → แสดงค่าประมาณเหมือนเดิม
        cnt:c, // จำนวนโดยประมาณ
        big:'-', // ไม่มีตัวเลขเวลา
        st:'na', // สถานะเทา (ยังไม่มีเวลา)
        u:'ยังไม่มีเวลาในระบบ', // ข้อความอธิบาย
        rows:[['ผู้ใช้บริการชำระเงิน (ประมาณ)',fm(c)+' ราย'],['สัดส่วน',fm(CASHP*100)+'% ของผู้ป่วยนอก'],['เวลารอ','ยังไม่มีข้อมูลในระบบ']] // แถวรายละเอียดในแผง
      }
    }
    return{cnt:net,tm:pha,big:pha==null?'-':fm(pha,1),st:pha==null?'na':stt(pha,TG.pharm),u:'นาที (รอรับยา)',rows:[['ผู้รับยา',fm(net)+' ราย'],['เวลารอรับยา',mn(pha)],['เป้าหมาย','≤ '+TG.pharm+' นาที'],['เวลารวมทั้งกระบวนการ',mn(tot)],['เป้าหมายรวม','≤ '+TG.total+' นาที']]}});
  return{opd,adm,dis,net,info,per5:net/7,per6:net/6}}
function select(i){sel=i;const o=ITEMS[i];
  document.querySelectorAll('#vlist button').forEach((b,k)=>b.classList.toggle('on',k===i));
  $('#vdet').innerHTML=`<h2>${o.name}</h2><small style="color:var(--mut)">${o.en}</small><div style="margin:10px 0 2px"><span class="chip" style="background:${CSS[o.st]}">${STT[o.st]}</span></div><div class="big">${o.big}</div><div style="color:var(--mut)">${o.u}</div><table>${o.rows.map(r=>`<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('')}</table>`;
  tgt.set(o.x*.7,0,o.z*.6+1);selR.visible=true;selR.position.x=o.x;selR.position.z=o.z;selR.scale.setScalar(o.kind==='desk'?.75:o.kind==='room'?.9:1.4)}
/* จำนวนคนในฉาก = service_count ของแถว OPD ที่ time_hour ตรงกับชั่วโมงปัจจุบัน (เวลาไทย) จากตาราง hospital_hourly_stats
   */
function hourOPD(D){const pick=document.querySelector('#vhr')?document.querySelector('#vhr').value:'',hh=pick||new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Bangkok',hour:'2-digit',hour12:false}).format(new Date()).slice(0,2),
  rows=(D.oh||[]).map(r=>({h:String(r.time_hour||'').slice(0,2),c:n(r.service_count)}));
  let r=rows.find(x=>x.h===hh);if(!r){const later=pick||rows.some(x=>x.h>hh),p=rows.filter(x=>x.h<hh).sort((a,b)=>a.h<b.h?1:-1)[0];r=later||!p?{h:hh,c:0}:{h:p.h,c:p.c,fb:1}}if(pick)r.sel=1;return r} // ชั่วโมงที่ไม่มีแถวแต่มีข้อมูลชั่วโมงหลังจากนั้น = 0 ราย · ถ้ายังไม่มีข้อมูลชั่วโมงนี้เลย (ข้อมูลยังไม่เข้า) ใช้ชั่วโมงล่าสุด
function build(D){
  M=derive(D);const m=model(D);M.m=m;
  const hrO=hourOPD(D);M.hr=hrO;targetPop=Math.max(0,Math.min(60,Math.round(hrO.c)));
  LG=D.q?aggLog(D.q,nowSec()-LIVE3D.win*60,nowSec()):null;M.lg=LG;if(LG)targetPop=Math.min(60,LG.pool.length);
  (m.info[0].rows||(m.info[0].rows=[])).push(['OPD ชั่วโมง '+hrO.h+':00'+(hrO.sel?' (เลือกเอง)':hrO.fb?' (ล่าสุด)':''),fm(hrO.c)+' ราย → แสดง '+fm(targetPop)+' ตัว']);
  const mxL=LG?Math.max(1,...ITEMS.map(o=>(LG.byKey[o.id]||{h:[]}).h.length)):1;
  ITEMS.forEach((o,k)=>{const f=m.info[k];o.tm=undefined;Object.assign(o,f);let dk=o.st;
    if(LG){const bq=LG.byKey[o.id]||{h:[],d:0},l=bq.h[bq.h.length-1];o.qh=bq.h.length;o.cnt=o.qh;o.dr=o.qh/mxL;dk=!o.qh?'na':o.dr<.34?'ok':o.dr<.67?'warn':'bad';
      o.rows=[['เรียกคิว '+LIVE3D.win+' นาทีล่าสุด ('+LG.win+')',fm(o.qh)+' ครั้ง'],['เรียกคิวทั้งวัน',fm(bq.d)+' ครั้ง'],['คิวล่าสุดที่เรียก',l?l.queue_no+' · '+hmOf(l.called_at)+' น.':'-'],['ความหนาแน่น',fm(o.dr*100)+'% ของจุดที่แน่นที่สุด'],...f.rows];
      HPAD[k].material.color.setHex(COL[dk]);HPAD[k].material.opacity=o.qh?.2+o.dr*.4:0}
    else HPAD[k].material.opacity=0;
    o.lbl=LG?fm(o.cnt)+' คิว ('+LG.win+')':(o.kind==='reg'?fm(o.cnt)+' ราย':(o.tm==null?'รอข้อมูลเวลา':fm(o.tm,1)+' นาที'));o.flow=o.kind!=='reg'&&o.tm==null;const c=COL[o.st];o.stat.material.color.setHex(c);o.stat.material.emissive.setHex(c);
    if(LG)paint(o.lb,o.name,fm(o.cnt)+' คิว',CSS[dk]);
    else (o.kind==='desk'||o.kind==='room')?paintT(o.lb,o.name,CSS[o.st]):paint(o.lb,o.name,fm(o.cnt)+' ราย',CSS[o.st])});
  if(LG)rsetup(D);else{RP.on=false;RP.sig='';RP.day='';rclear();rui()} // มีข้อมูลเหตุการณ์ → ตั้งฉากจากข้อมูล ไม่มี → ล้างฉาก
  if(RP.on){ITEMS.forEach(it=>it._n=-1);rocc()}
  drawCrowd();renderQ();
  signs.forEach(paintSign);
  {const d=D.d,tm=(v,t)=>v==null?'รอข้อมูลเวลา':t+' '+fm(v,1)+' นาที';
   paintT(TP.reg,'เปิดบัตร '+fm(m.opd)+' ราย','#27c4cf');
   paintT(TP.desk,tm(val(d.avg_wait_reg_to_triage),'รอคัดกรอง'),CSS[ITEMS[1].st]);
   paintT(TP.room,tm(val(d.avg_wait_for_doctor),'รอพบแพทย์'),CSS[ITEMS[6].st]);
   paintT(TP.ph,tm(val(d.avg_wait_for_pharmacy),'รอรับยา'),CSS[ITEMS[12].st]);
{const tt=val(d.avg_total_process_time);paintT(TP.exit,tt==null?'รอข้อมูลเวลา':'เฉลี่ย '+fm(tt,1)+' นาที',tt==null?'#27c4cf':CSS[stt(tt,TG.total)])}}
  
  const tri=val(D.d.avg_wait_reg_to_triage),doc=val(D.d.avg_wait_for_doctor),con=val(D.d.avg_doctor_consult_time),pha=val(D.d.avg_wait_for_pharmacy);
  WT={reg:2,desk:tri==null?9:Math.min(8,1.5+tri/3),q:doc==null?9:Math.min(8,1+doc/6),room:Math.min(9,2+(con||10)/3),ph:pha==null?9:Math.min(8,1.5+pha/4)}; // ไม่มีเวลา = ให้คนเดินไปยืนรอที่จุดบริการนานขึ้น แทนตัวสีเหลือง
  {const mm=(v,d)=>v==null?d:v,pa=mm(pha,10);
   W2=RT?{reg:60,c1:mm(tri,10)*60,tri:120,ec:mm(doc,5)*60,room:mm(con,5)*60,pc:pa*30,pc1:45,cc:pa*15,cash:90,pc2:pa*15,rec:60}
        :{reg:WT.reg,c1:WT.desk,tri:3,ec:2,room:WT.room,pc:2,pc1:2,cc:2,cash:3,pc2:2,rec:WT.ph};
   baseEvery=RT?(LG?(LG.pool.length?3600/LG.pool.length:1e9):hrO.c>0?3600/hrO.c:1e9):Math.min(8,Math.max(6,.5+120/Math.max(M.opd,40)*.6));spawnEvery=baseEvery} /* ไม่ให้คนมาถึงห้องยาเร็วกว่าอัตราเรียกทีละคน (~2 วินาที) จะได้ไม่แออัดที่เก้าอี้ */warmW();
  $('#vlist').innerHTML=ITEMS.map((o,i)=>`<button data-i="${i}"><i style="background:${CSS[o.st]}"></i><span>${o.name}<small>${o.kind==='reg'?'เปิดบัตร ':''}${o.lbl}${o.flow?' · รอข้อมูลเวลา':''}</small></span></button>`).join('');
  document.querySelectorAll('#vlist button').forEach(b=>b.onclick=()=>select(+b.dataset.i));
  {const d=D.d,t=v=>{v=val(v);return v==null?'-':fm(v,1)};$('#vkc').innerHTML=`<div><i>ผู้ป่วยนอก (ราย)</i><b>${fm(m.opd)}</b></div><div><i>รอคัดกรอง เฉลี่ย (นาที)</i><b>${t(d.avg_wait_reg_to_triage)}</b></div><div><i>รอพบแพทย์ เฉลี่ย (นาที)</i><b>${t(d.avg_wait_for_doctor)}</b></div><div><i>ตรวจโดยแพทย์ เฉลี่ย (นาที)</i><b>${t(d.avg_doctor_consult_time)}</b></div><div><i>รอรับยา เฉลี่ย (นาที)</i><b>${t(d.avg_wait_for_pharmacy)}</b></div><div><i>เวลารวม เฉลี่ย (นาที)</i><b>${t(d.avg_total_process_time)}</b></div>`}
  $('#vhint').textContent=`ลากเพื่อหมุนได้รอบ 360° · Ctrl + ล้อเมาส์ หรือปุ่ม ＋ − เพื่อซูม · คลิกจุดบริการเพื่อดูข้อมูล · รายการซ้ายซ่อนอัตโนมัติ ขยับเมาส์/แตะเพื่อแสดง · แถบสี เขียว/เหลือง/แดง = สถานะเวลารอ · เทา + คนยืนรอที่จุดบริการ = ยังไม่มีเวลาในระบบ`;
  MSG=D.qerr?'โหลด '+(D.qsrc||QLOG_TABLE)+' ไม่สำเร็จ ('+D.qerr+')'+(/404|403/.test(D.qerr)?' · ต้องเพิ่ม '+(D.qsrc||QLOG_TABLE)+' ในรายการตารางที่ตัวกลาง /api/sb อนุญาต':''):''; // ข้อความผิดพลาดจากการโหลด (ว่าง = ปกติ)
  PRE=D.demo?'ข้อมูลตัวอย่าง · ':''; // คำนำหน้าเมื่อยังไม่ได้ตั้งค่าเชื่อมต่อจริง
  SRC=D.qsrc||QLOG_TABLE; // ชื่อตารางที่ใช้จริง
  UNM=LG?Object.keys(LG.unm):[]; // สถานีที่แมปไม่ได้
  rui(); // แสดงข้อความสถานะ
  if(sel!=null)select(sel)}

async function load(){ // โหลดข้อมูลของวันนี้จากฐานข้อมูล แล้ววาดฉาก
  try{build(await loadData(null))} // loadData(null) = วันนี้ตามเวลาไทย
  catch(e){MSG='โหลดข้อมูลไม่สำเร็จ: '+e.message+' — ตรวจตารางและสิทธิ์อ่าน (RLS)';rui()} // พลาด → แสดงข้อผิดพลาด
}
const resetScene=()=>{pats.forEach(p=>SC.remove(p.g));pats.length=0;[GQ,SO,OC].forEach(o=>{for(const k in o)delete o[k]});warmed=false;try{localStorage.removeItem(WKEY)}catch(e){}if(window._D)build({...window._D})};
/* ===== เครื่องมือย่อ/ขยาย: ปุ่ม ＋ −, แถบเลื่อน, % ซูม, ดูทั้งหมด, ล้อเมาส์, แป้นพิมพ์ (+ − 0) ===== */
fsBox(V,$('#vfs')); // ปุ่มขยายเต็มจอ ⇄ ย่อกลับ
$('#vcl3').onclick=()=>{const s=document.querySelector('#s3d');if(s._cl){s._cl(true,true);s.scrollIntoView({block:'nearest'})}}; // ปุ่มปิดการแสดงผล 3D
const ZMIN=16,ZMAX=150,zs=$('#vzs'),zp=$('#vzp'); // ระยะกล้องใกล้สุด/ไกลสุด (ชุดเดียวกับการลาก/บีบนิ้ว)
let zdrag=false,zhov=false; // zdrag=กำลังลากแถบเลื่อน, zhov=เมาส์อยู่บนฉาก
const zset=r=>{camTouched=true;rad=Math.min(ZMAX,Math.max(ZMIN,r))};
const zr2v=r=>Math.round(Math.log(ZMAX/r)/Math.log(ZMAX/ZMIN)*100),zv2r=v=>ZMAX*Math.pow(ZMIN/ZMAX,v/100); // ระยะ ⇄ ค่าแถบเลื่อน 0..100 (สเกลลอการิทึม)
function zsync(){const p=Math.round(HOME.rad/rad*100)+'%';if(zp.textContent!==p)zp.textContent=p;if(!zdrag){const v=String(zr2v(rad));if(zs.value!==v)zs.value=v}} // อัปเดต % และตำแหน่งแถบเลื่อน (100% = พอดีกรอบ)
zs.oninput=()=>{zdrag=true;zset(zv2r(+zs.value))};zs.onchange=zs.onpointerup=()=>{zdrag=false};
$('#vzi').onclick=()=>zset(rad*.8);$('#vzo').onclick=()=>zset(rad/.8);
$('#vzf').onclick=()=>{camTouched=false;resize();rad=HOME.rad;tgt.set(...HOME.t)}; // ดูทั้งหมด: ถอย/เข้าให้พอดีกรอบ คงมุมหมุนไว้
$('#vzw').onclick=e=>{WZ=!WZ;e.currentTarget.classList.toggle('on',WZ);e.currentTarget.setAttribute('aria-pressed',WZ)}; // เปิด/ปิดล้อเมาส์ซูม
V.addEventListener('pointerenter',()=>{zhov=true});V.addEventListener('pointerleave',()=>{zhov=false});
document.addEventListener('keydown',e=>{if(!zhov||e.ctrlKey||e.metaKey||e.altKey||/INPUT|SELECT|TEXTAREA/.test(e.target.tagName||''))return;
  if(e.key==='+'||e.key==='=')zset(rad*.8);else if(e.key==='-'||e.key==='_')zset(rad/.8);else if(e.key==='0')$('#vzf').click();else return;e.preventDefault()});
$('#vzr').onclick=()=>{camTouched=false;resize();rad=HOME.rad;th=HOME.th;ph=HOME.ph;tgt.set(...HOME.t);sel=null;selR.visible=false;document.querySelectorAll('#vlist button').forEach(b=>b.classList.remove('on'))};
window.v3sync=()=>{}; // 3D แสดงเวลาปัจจุบันเสมอ ไม่ซิงก์วันที่จากแดชบอร์ด
document.fonts.ready.then(()=>{if(M)build({...window._D})});
function resize(){const w=V.clientWidth||800,h=V.clientHeight||600;R.setSize(w,h,false);CAM.aspect=w/h;CAM.updateProjectionMatrix();if(!camTouched)HOME.rad=rad=Math.max(56,Math.min(150,128/(w/h)))} /* ระยะกล้องพอดีกับความกว้างกรอบ ฉากเต็มกรอบ */ if(window.ResizeObserver)new ResizeObserver(resize).observe(V);resize();let vis=true;if(window.IntersectionObserver)new IntersectionObserver(es=>{vis=es[0].isIntersecting}).observe(V);
const clock=new THREE.Clock();
(function tick(){requestAnimationFrame(tick);if(!vis)return;const dt=Math.min(clock.getDelta(),.05),t=clock.elapsedTime;
  cam();zsync();
  selR.rotation.z=t*.8;if(sel!=null)selR.material.opacity=.6+Math.sin(t*4)*.25;
  if(M)step(dt);R.render(SC,CAM)})();
const _lb=loadData;loadData=async d=>{const r=await _lb(d);window._D=r;return r};
load();setInterval(load,60000); // ดึงข้อมูลใหม่ทุก 60 วินาที (n8n เติมข้อมูลทุก 15 นาที)

}
let v3on=0;
function boot3D(){if(v3on)return;v3on=1;const err=()=>{document.querySelector('#vmsg').textContent='โหลด three.js ไม่สำเร็จ — ตรวจอินเทอร์เน็ต'};if(window.loadThree){window.loadThree(init3D,err);return} /* ใช้ตัวโหลดร่วมกับการ์ดอาคาร 3 มิติ (โหลด three.js ครั้งเดียว) */ const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';s.onload=init3D;s.onerror=err;document.head.appendChild(s)}
if(window.IntersectionObserver)new IntersectionObserver(es=>{if(es[0].isIntersecting)boot3D()},{rootMargin:'400px'}).observe(document.querySelector('#v3'));else boot3D();
$('#to3d').onclick=()=>{const s=document.querySelector('#s3d');if(s._cl&&s.classList.contains('cl3'))s._cl(false,true);s.scrollIntoView({behavior:'smooth'});boot3D()};
if(AUTO)$('#cfgb').style.display='none';
logo();setRange(7,document.querySelector('[data-d="7"]'));
</script>
