function onPtr(e){
  const el=e.target.closest?e.target.closest('[data-tip]'):null;if(onEl)onEl.classList.remove('on');
  if(!el){tip.style.display='none';onEl=null;return}
  el.classList.add('on');onEl=el;tip.innerHTML=el.dataset.tip;tip.style.display='block';
  const r=tip.getBoundingClientRect();let l=e.clientX+16,t=e.clientY+16;
  if(l+r.width>innerWidth-8)l=e.clientX-r.width-16;if(t+r.height>innerHeight-8)t=e.clientY-r.height-16;
  tip.style.left=Math.max(8,l)+'px';tip.style.top=Math.max(8,t)+'px';
}
document.addEventListener('pointermove',onPtr);document.addEventListener('pointerdown',onPtr);
document.addEventListener('scroll',()=>{tip.style.display='none'},true);

/* ===== ส่วน 3D (โหลดเมื่อเลื่อนมาถึง) ===== */
/* ===== ปุ่มย่อ/ขยายการแสดงผล 3D: ขยายเต็มจอ ⇄ ย่อกลับขนาดเดิม (ใช้ร่วมกันทั้งฉากห้องบริการและการ์ดอาคาร) =====
   ย้ายกล่องไปไว้ชั้นนอกสุดของหน้าชั่วคราว (เหลือตัวกั้นที่ไว้ที่เดิม) จึงไม่ถูกการ์ดแม่บัง · กด Esc หรือกดปุ่มเดิมเพื่อย่อกลับ
   ถ้าเบราว์เซอร์ไม่รองรับโหมดเต็มจอจริง (เช่น iPhone) จะขยายเต็มหน้าต่างแทน · el=กล่องที่จะขยาย, btn=ปุ่ม, back=ฟังก์ชันคืนที่วางสำรองถ้าตัวกั้นหาย */
function fsBox(el,btn,back){
  if(!el||!btn)return;
  const root=document.documentElement,on=()=>el.classList.contains('fsx');
  const paint=()=>{const f=on(),s=f?'ย่อกลับขนาดเดิม (Esc)':'ขยายเต็มจอ';btn.textContent=f?'⤡ ย่อกลับ':'⛶ เต็มจอ';btn.title=s;btn.setAttribute('aria-label',s);btn.setAttribute('aria-pressed',f?'true':'false')};
  function enter(){if(on()||!el.parentNode)return;
    const ph=document.createElement('div');ph.style.cssText='width:100%;height:'+el.offsetHeight+'px'; // ตัวกั้นที่ไว้ไม่ให้หน้าเลื่อนกระโดด
    el.parentNode.insertBefore(ph,el);el._fsph=ph;document.body.appendChild(el);
    el.classList.add('fsx');root.classList.add('fsx-lock');
    if(root.requestFullscreen)root.requestFullscreen().catch(()=>{}); // เต็มจอจริงถ้าทำได้ ไม่ได้ก็ใช้เต็มหน้าต่าง
    paint()}
  function leave(){if(!on())return;
    el.classList.remove('fsx');root.classList.remove('fsx-lock');
    const ph=el._fsph;el._fsph=null;
    if(ph&&ph.isConnected)ph.replaceWith(el);else{const h=back&&back();if(h)h.appendChild(el)} // ตัวกั้นหาย (หน้าถูกวาดใหม่) → ใช้ที่วางสำรอง
    if(document.fullscreenElement&&document.exitFullscreen)document.exitFullscreen().catch(()=>{});
    paint()}
  btn.addEventListener('click',()=>on()?leave():enter());
  document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement&&on())leave()}); // กด Esc ออกจากเต็มจอจริง → ย่อกลับด้วย
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&on())leave()}); // โหมดเต็มหน้าต่าง
  paint()}
/* ===== ปุ่มย่อ/ขยาย = ปิด/เปิดการแสดงผล 3D (ติดที่หัวการ์ด ปุ่มอยู่ตลอดแม้ปิดอยู่) =====
   ปิด → ซ่อนฉาก 3D ทั้งหมด เหลือแต่หัวการ์ด · ฉากหยุดวาดอัตโนมัติ (ประหยัด CPU/GPU) และถ้ายังไม่เคยเปิดจะไม่โหลด three.js
   จำค่าที่เลือกไว้ในเบราว์เซอร์ (key) · sec=การ์ดที่มีหัว .h */
function clBox(sec,key){
  const h=sec&&sec.querySelector('.h');if(!h)return;
  let b=h.querySelector('.cltg');
  function set(c,save){ // c=true → ปิดการแสดงผล
    sec.classList.toggle('cl3',c);
    b.textContent=c?'▸ เปิดการแสดงผล 3D':'▾ ปิดการแสดงผล 3D';
    b.title=c?'เปิดการแสดงผล 3D อีกครั้ง':'ปิดการแสดงผล 3D (ซ่อนฉาก ประหยัดเครื่อง)';
    b.setAttribute('aria-expanded',c?'false':'true');
    if(save)try{localStorage.setItem(key,c?'1':'0')}catch(e){}}
  if(!b){b=document.createElement('button');b.type='button';b.className='cltg';h.appendChild(b)}
  b.onclick=()=>set(!sec.classList.contains('cl3'),true);
  sec._cl=set; // ให้ส่วนอื่นสั่งเปิด/ปิดได้ (เช่นปุ่ม 3D ▾ บนหัวหน้า)
  let c0=false;try{c0=localStorage.getItem(key)==='1'}catch(e){}
  set(c0,false)}
clBox(document.getElementById('s3d'),'v3cl'); // การ์ดห้องบริการ 3 มิติ
