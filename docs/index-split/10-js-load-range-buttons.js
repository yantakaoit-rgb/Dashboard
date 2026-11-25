async function load(){
  const a=$('#from').value,b=$('#to').value;if(!a||!b||a>b){$('#msg').textContent='เลือกช่วงวันที่ให้ถูกต้อง';return}
  tip.style.display='none';const len=Math.max(1,Math.round((new Date(b)-new Date(a))/864e5)+1),pa=addD(a,-len),pb=addD(a,-1),c=cfg(),live=c.u&&c.k;CMP={len,pa,pb};
  $('#msg').textContent=live?'กำลังโหลดข้อมูล…':'กำลังแสดงข้อมูลตัวอย่าง — แก้ CONFIG ในไฟล์ หรือกด "ตั้งค่า" เพื่อเชื่อมต่อ Supabase';
  try{
    let all;
    if(live){ // โหมดเชื่อมต่อฐานข้อมูลจริง
      const r=await Promise.all(TB.map(t=>get(t,pa,b))); // ดึงตารางเดิมทั้งหมดพร้อมกัน
      all={}; // อ็อบเจ็กต์เก็บข้อมูลทุกตาราง
      TB.forEach((t,i)=>all[t]=r[i]); // จับคู่ชื่อตารางกับข้อมูลที่ดึงมา
      IPDERR={};
      for(const t of ['ward','ipd_pttype','bed_occupancy']){ // [เพิ่มใหม่] วนดึงตารางผู้ป่วยในทีละตาราง (แยกจากตารางหลัก)
        try{all[t]=await get(t,pa,b);} // ดึงจาก hospital_ward_stats / hospital_ipd_pttype_stats
        catch(e){all[t]=[];IPDERR[t]=e.message;} // ถ้าอ่านไม่ได้ ต้องไม่ทำให้ทั้งแดชบอร์ดพัง (การ์ดจะแสดงข้อความเตือนเอง)
      }
      $('#msg').textContent=''; // ล้างข้อความสถานะ "กำลังโหลด"
    }
    else all=demo(pa,b);
    const cut=(o,f)=>{const x={};TB.forEach(t=>x[t]=o[t].filter(f));return x};
    const cc=cut(all,r=>r.record_date>=a&&r.record_date<=b); // กรองทุกตารางหลักให้เหลือเฉพาะช่วงวันที่ปัจจุบัน
    const sel=(rows,x,y)=>rows?rows.filter(r=>r.record_date>=x&&r.record_date<=y):[]; // [เพิ่มใหม่] ฟังก์ชันกรองช่วงวันที่ของตารางผู้ป่วยใน (ไม่มีข้อมูล = อาร์เรย์ว่าง)
    cc.ward=sel(all.ward,a,b); // [เพิ่มใหม่] ข้อมูลหอผู้ป่วยช่วงปัจจุบัน
    cc.bed_occupancy=sel(all.bed_occupancy,a,b); // ข้อมูลเตียงรายหอ จาก hospital_bed_occupancy_stats
    cc.ipd_pttype=sel(all.ipd_pttype,a,b); // [เพิ่มใหม่] ข้อมูลสิทธิผู้ป่วยในช่วงปัจจุบัน
    const have=new Set(cc.daily.map(r=>r.record_date)).size; // นับจำนวนวันที่มีข้อมูลจริง
    const pv=cut(all,r=>r.record_date>=pa&&r.record_date<=pb); // กรองทุกตารางหลักให้เหลือเฉพาะช่วงก่อนหน้า (ไว้เปรียบเทียบ)
    pv.ward=sel(all.ward,pa,pb); // [เพิ่มใหม่] ข้อมูลหอผู้ป่วยช่วงก่อนหน้า
    pv.bed_occupancy=sel(all.bed_occupancy,pa,pb);
    pv.ipd_pttype=sel(all.ipd_pttype,pa,pb); // [เพิ่มใหม่] ข้อมูลสิทธิผู้ป่วยในช่วงก่อนหน้า
    LAST=[cc,pv,a,b];render(cc,pv,a,b); // วาดทั้งหน้าจอ (รวมการ์ดใหม่)
 xtra(); // ส่วนเพิ่ม: รายงานรายเดือน / KPI / รับ–จำหน่ายรายวอร์ด
    banner(a,b,pa,pb,len,document.querySelector('[data-d="7"]').classList.contains('on'),have); // แสดงแถบสรุปช่วงวันที่ (โค้ดเดิม)
    window.v3sync&&v3sync(b); // ซิงก์วันที่กับส่วนอื่น (โค้ดเดิม)
  }catch(e){$('#msg').textContent=(AUTO?'ไม่สามารถโหลดข้อมูลได้ในขณะนี้ กรุณาลองใหม่ภายหลัง':'โหลดข้อมูลไม่สำเร็จ: '+e.message+' — ตรวจ URL, key และสิทธิ์อ่านตาราง (RLS policy)')}
}
function logo(){const l=cfg().l;$('#logo').innerHTML=l?`<img src="${l.replace(/"/g,'')}" alt="โลโก้" onerror="this.parentNode.textContent='✚'">`:'✚'}
async function latestDay(){const c=cfg();if(!c.u||!c.k)return iso(new Date());try{const r=await fetch(`${c.u}/rest/v1/hospital_daily_stats?select=record_date&order=record_date.desc&limit=1`,{headers:{apikey:c.k,Authorization:'Bearer '+c.k}});if(!r.ok)return iso(new Date());const j=await r.json();return j[0]&&/^\d{4}-\d{2}-\d{2}$/.test(j[0].record_date)?j[0].record_date:iso(new Date())}catch(e){return iso(new Date())}}
async function setRange(n,btn){document.querySelectorAll('[data-d]').forEach(x=>x.classList.toggle('on',x===btn));const t=n===-1?new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Bangkok'}):(n&&n<=30?await latestDay():iso(new Date()));$('#to').value=t;$('#from').value=n===-1?t:(n?addD(t,-n+1):new Date().getFullYear()+'-01-01');load()} // n=-1 คือปุ่ม "วันนี้" (วันที่ปัจจุบันวันเดียว)
document.querySelectorAll('[data-d]').forEach(x=>x.onclick=()=>setRange(+x.dataset.d,x));
$('#to').value=iso(new Date());$('#from').value=addD($('#to').value,-6);
$('#go').onclick=()=>{document.querySelectorAll('[data-d]').forEach(x=>x.classList.remove('on'));load()};
$('#cfgb').onclick=()=>{const c=cfg();$('#u').value=c.u;$('#k').value=c.k;$('#lg').value=c.l;$('#dlg').showModal()};
$('#save').onclick=()=>{store.setItem('sb_u',$('#u').value.trim());store.setItem('sb_k',$('#k').value.trim());store.setItem('sb_l',$('#lg').value.trim());$('#dlg').close();logo();load()};
$('#demo').onclick=()=>{store.setItem('sb_u','');store.setItem('sb_k','');$('#dlg').close();load()};
const tip=document.createElement('div');tip.id='tip';document.body.appendChild(tip);let onEl=null;
