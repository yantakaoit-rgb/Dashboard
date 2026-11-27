<script>
/* ===== ตั้งค่าครั้งเดียวตรงนี้ แล้วนำไฟล์ขึ้นเว็บ — ผู้ใช้ทุกคนจะเชื่อมต่ออัตโนมัติ ===== */
const CONFIG={
  url:'/api/sb', // เรียกผ่านตัวกลางของเรา (Netlify Function / Cloudflare Worker / server.js) — คีย์จริงอยู่ฝั่งเซิร์ฟเวอร์ ไม่อยู่ในไฟล์นี้
  key:'proxy',   // ค่าตัวแทน ไม่ใช่คีย์จริง
  logo:''
};
const AUTO=!/YOUR_/.test(CONFIG.url+CONFIG.key)&&CONFIG.url&&CONFIG.key;
const TARGET={occ:85,wait:20,consult:15,readmit:10,total:60}; // เป้าหมายส่วนแจ้งเตือน (แก้ได้)
const $=s=>document.querySelector(s),TB=['daily','hourly','department','pttype','er_triage','doctor_clinic'];
const num=v=>+v||0,sum=(a,f)=>a.reduce((s,r)=>s+num(f(r)),0);
const avg=(a,f)=>{const x=a.map(f).filter(v=>v!==null&&v!==''&&v!==undefined&&isFinite(+v)).map(Number);return x.length?x.reduce((s,v)=>s+v,0)/x.length:null};
const fm=(v,d=0)=>v==null?'-':v.toLocaleString('th-TH',{maximumFractionDigits:2}); // แสดงทศนิยมไม่เกิน 2 ตำแหน่ง (พารามิเตอร์ d ถูกละไว้)
const fr=(v,d=0)=>v==null?'-':v.toLocaleString('th-TH',{maximumFractionDigits:d}); // ใช้เฉพาะตัวเลขบนแกนกราฟ
const iso=d=>d.toISOString().slice(0,10),addD=(s,n)=>{const d=new Date(s);d.setDate(d.getDate()+n);return iso(d)};
let store;try{store=localStorage}catch(e){store={getItem(){},setItem(){}}}
const cfg=()=>AUTO?{u:CONFIG.url.replace(/\/$/,''),k:CONFIG.key,l:CONFIG.logo}:{u:(store.getItem('sb_u')||'').replace(/\/$/,''),k:store.getItem('sb_k')||'',l:store.getItem('sb_l')||''};

const san=v=>typeof v==='string'?v.replace(/[<>"'`]/g,'’'):Array.isArray(v)?v.map(san):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,x])=>[k,san(x)])):v;
async function get(t,a,b){
  const c=cfg(),out=[];let ord='key_id'; // เรียงตาม key_id ก่อน ถ้าตารางไม่มีคอลัมน์นี้ (HTTP 400) จะถอยไปเรียงตามวันที่
  for(let o=0;;o+=1000){
    const u=od=>`${c.u}/rest/v1/hospital_${t}_stats?select=*&record_date=gte.${a}&record_date=lte.${b}&order=${od}`,hd={headers:{apikey:c.k,Authorization:'Bearer '+c.k,'Range-Unit':'items',Range:`${o}-${o+999}`}};
    let r=await fetch(u(ord),hd);
    if(r.status===400&&ord==='key_id'){ord='record_date';r=await fetch(u(ord),hd)} // ตารางผู้ป่วยในอาจไม่มี key_id ทำให้เดิมโหลดไม่ได้และแสดงว่าไม่พบข้อมูล
    if(!r.ok){let m='';try{m=(await r.text()).replace(/\s+/g,' ').slice(0,160)}catch(e){}throw new Error(`${t}: HTTP ${r.status}${m?' — '+m:''}`)}
    const j=san(await r.json());out.push(...j);if(j.length<1000)break;
  }
  return out;
}
