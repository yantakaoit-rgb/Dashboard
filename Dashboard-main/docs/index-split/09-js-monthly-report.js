const xmon=k=>['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'][+k.slice(5)-1]+' '+String(+k.slice(0,4)+543).slice(2);
function xbars(ser,lab,d=0){
  const W=NARROW()?360:700,H=270,B=30,T=16,n=lab.length,single=ser.length===1,top=Math.max(1,...ser.flatMap(x=>x.v));
  const vt=single?ser[0].v.map(v=>fm(v,d)):[],maxLen=vt.length?Math.max(...vt.map(t=>t.length)):0;
  const cw0=(W-62)/Math.max(n,1),rot=single&&n<=14&&cw0*.96/(maxLen*.58)<7.5; // ตัวเลขยาวเกินช่อง -> หมุนแนวตั้ง
  const room=rot?(maxLen*6+14)/(H-T-B):.12,mx=top*(1+Math.max(room,.12));
  const ticks=[0,1,2,3,4].map(i=>fr(mx*(1-i/4),mx<10?1:0));
  const L=Math.max(46,Math.max(...ticks.map(t=>t.length))*6.4+12),cw=(W-L)/Math.max(n,1),bw=Math.min(40,cw*.72/ser.length);let g='';
  ticks.forEach((t,i)=>{const y=T+(H-T-B)*i/4;g+=`<line x1="${L}" x2="${W}" y1="${y}" y2="${y}" stroke="#e2eaf2"/><text x="${L-6}" y="${y+4}" font-size="11" text-anchor="end" fill="#60758a">${t}</text>`});
  ser.forEach((x,si)=>x.v.forEach((v,i)=>{const h=(H-T-B)*v/mx,px=L+cw*i+(cw-bw*ser.length)/2+bw*si,y=H-B-h;
    g+=`<rect x="${px}" y="${y}" width="${bw-2}" height="${h}" rx="5" fill="${x.c}"><title>${lab[i]}: ${fm(v,d)}</title></rect>`;
    if(single&&n<=14){const cx=L+cw*i+cw/2,t=vt[i];
      g+=rot?`<text transform="rotate(-90 ${cx+4} ${y-6})" x="${cx+4}" y="${y-6}" font-size="10.5" fill="#0b1f33">${t}</text>`
            :`<text x="${cx}" y="${y-6}" font-size="${Math.min(11,cw*.96/(t.length*.58)).toFixed(2)}" text-anchor="middle" fill="#0b1f33">${t}</text>`}}));
  const st=Math.ceil(n/14);lab.forEach((l,i)=>{if(i%st==0)g+=`<text x="${L+cw*i+cw/2}" y="${H-10}" font-size="11" text-anchor="middle" fill="#60758a">${l}</text>`});
  return `<svg viewBox="0 0 ${W} ${H}" width="100%"><defs><linearGradient id="xg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2dd4bf"/><stop offset="1" stop-color="#2563eb"/></linearGradient></defs>${g}</svg>`;
}
const xsec=(n,t,s,b)=>`<section class="s w12" id="sec${n}"><div class="h"><b>${n}</b><h2>${t}</h2><span>${s}</span></div>${b}</section>`;
function xmonthly(rows,t){const m={};rows.forEach(r=>{const v=r[t.k];if(v===''||v==null||isNaN(+v))return;const k=String(r.record_date).slice(0,7),o=m[k]??={s:0,n:0};o.s+=+v;o.n++});return Object.keys(m).sort().map(k=>({k,n:m[k].n,v:t.g=='sum'?m[k].s:m[k].s/m[k].n}))}
function xDraw(){
  const ms=xmonthly(XD.daily,xk);
  $('#xchips').innerHTML=XT.map(t=>`<button class="${t===xk?'on':''}" data-k="${t.k}">${t.n}</button>`).join('');
  $('#xchart').innerHTML=ms.length?xbars([{v:ms.map(x=>x.v),c:'url(#xg)'}],ms.map(x=>xmon(x.k)),xk.d||0):'<div class="nd">ไม่มีข้อมูล</div>';
  $('#xtab').innerHTML=`<tr><th>เดือน</th><th>${xk.u}${xk.g=='avg'?' (เฉลี่ย/วัน)':' (รวม)'}</th><th>เทียบเดือนก่อน</th><th>วันที่มีข้อมูล</th></tr>`+ms.map((x,i)=>{const p=i?ms[i-1].v:0,c=p?(x.v-p)/p*100:null;return `<tr><td>${xmon(x.k)}</td><td><b>${fm(x.v,xk.d||0)}</b></td><td class="${c==null?'':c>=0?'up':'dn'}">${c==null?'-':(c>=0?'▲ ':'▼ ')+fm(Math.abs(c),1)+'%'}</td><td>${x.n}</td></tr>`}).reverse().join('');
}
async function xtra(){
  document.querySelectorAll('.xs').forEach(e=>e.remove());
  const host=document.querySelector('main');if(!host)return;
  const mk=h=>{const d=document.createElement('div');d.className='xs';d.style.display='contents';d.innerHTML=h;host.append(d)};
  try{
    if(!XD){const a='2025-10-01',b=iso(new Date());XD={daily:await get('daily',a,b)}}
    if(!XD.daily.length){mk(xsec(19,'รายงานรายเดือน','Monthly Report','<div class="nd">ยังไม่มีข้อมูลรายเดือน</div>'));return}
        mk(xsec(19,'รายงานรายเดือน','Monthly Report',`<div class="tg" id="xchips" style="margin-bottom:12px"></div><div id="xchart"></div><div style="overflow-x:auto;margin-top:12px"><table id="xtab"></table></div>`));
    $('#xchips').onclick=e=>{const k=e.target.dataset.k;if(k){xk=XT.find(t=>t.k===k);xDraw()}};
    xDraw();
  }catch(e){mk(xsec(19,'รายงานรายเดือน','Monthly Report',`<div class="nd">โหลดข้อมูลไม่สำเร็จ: ${String(e.message).replace(/[<>]/g,'')}</div>`))}
}
