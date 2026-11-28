(function(){
const $=s=>document.querySelector(s),app=$('#app');
const LS={g(k){try{return localStorage.getItem(k)}catch(e){return null}},s(k,v){try{localStorage.setItem(k,v)}catch(e){}},d(k){try{localStorage.removeItem(k)}catch(e){}}};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const gr=p=>p>=86?5:p>=71?4:p>=56?3:2;
/* Firebase Realtime Database manzili (GitHub Pages uchun). */
const FB_URL='https://milli-test-660c8-default-rtdb.firebaseio.com';
let mode='local',db=null,isT=false,T=null,st={};
const clr=()=>clearInterval(T);

/* ---- saqlash (Claude db / Firebase / mahalliy) ---- */
async function G(p){if(mode==='claude'){const d=await db.doc(p).get();return d.exists?JSON.parse(d.data().j):null}
 if(mode==='fb'){const j=await(await fetch(FB_URL+'/'+p+'.json')).json();return j&&j.j?JSON.parse(j.j):null}
 return JSON.parse(LS.g('k_'+p)||'null')}
async function P(p,o){const j=JSON.stringify(o);if(mode==='claude')await db.doc(p).set({j});
 else if(mode==='fb'){const r=await fetch(FB_URL+'/'+p+'.json',{method:'PUT',body:JSON.stringify({j})});if(!r.ok)throw new Error('Baza ruxsat bermadi ('+r.status+')')}else LS.s('k_'+p,j)}
async function putP(c,pl){if(mode==='claude')await db.doc('players/'+c+'_'+pl.id).set(Object.assign({code:c},pl));
 else if(mode==='fb'){const r=await fetch(FB_URL+'/players/'+c+'/'+pl.id+'.json',{method:'PUT',body:JSON.stringify(pl)});if(!r.ok)throw new Error('Baza xatosi '+r.status)}
 else{const a=JSON.parse(LS.g('pl_'+c)||'{}');a[pl.id]=pl;LS.s('pl_'+c,JSON.stringify(a))}}
async function listP(c){if(mode==='claude')return(await db.collection('players').where('code','==',c).get()).docs.map(d=>d.data());
 if(mode==='fb'){const o=await(await fetch(FB_URL+'/players/'+c+'.json')).json();return Object.values(o||{})}
 return Object.values(JSON.parse(LS.g('pl_'+c)||'{}'))}

/* ---- parser, tekshiruv, variantlar, rasmlar ---- */
function parseAll(txt){const qs=[];let cur=null;
 for(const raw of txt.replace(/\r/g,'').split('\n')){const l=raw.trim();if(!l)continue;let m;
  if(cur&&(m=l.match(/^\[(?:rasm|img)\s*:\s*(.+?)\]$/i))){if(/^(https:\/\/|data:image)/i.test(m[1]))cur.u=m[1];continue}
  if(cur&&(m=l.match(/^(?:javob|answer|t[oö]['‘’ʻ]?[gğ]['‘’ʻ]?ri)\s*[:\-]\s*([A-Da-d ,;]+)/i))){cur.a=(m[1].toUpperCase().match(/[A-D]/g)||[]).map(x=>x.charCodeAt(0)-65);continue}
  if(cur&&(m=l.match(/^([*+])?\s*([A-Da-d])[\.\)]\s*(.+)$/))){const i=m[2].toUpperCase().charCodeAt(0)-65;cur.o[i]=m[3];if(m[1]&&!cur.a.includes(i))cur.a.push(i);continue}
  if((m=l.match(/^(\d+)\s*[\.\)]\s*(.+)$/))){cur={q:m[2],k:+m[1],o:[],a:[]};qs.push(cur);continue}
  if(cur&&!cur.o.length)cur.q+=' '+l}
 return qs}
function parse(txt){const ok=[],bad=[];parseAll(txt).forEach(q=>{let w='';
 if(q.o.filter(Boolean).length<2)w='kamida 2 ta variant kerak';else if(!q.a.length)w='töğri javob belgilanmagan';else if(!q.a.every(i=>q.o[i]))w='javob körsatilgan variant mavjud emas';
 if(w)bad.push({k:q.k,q:q.q,w});else ok.push(q)});return{ok,bad}}
function shuf(a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function mix(q){const ix=shuf(q.o.map((_,i)=>i).filter(i=>q.o[i]));return{q:q.q,k:q.k,u:q.u,o:ix.map(i=>q.o[i]),a:q.a.map(x=>ix.indexOf(x))}}
function makeVariants(qs,n){return Array.from({length:n},(_,v)=>({id:v+1,qs:shuf(qs).map(mix)}))}
function pers(v){return{id:v.id,qs:shuf(v.qs).map(mix)}}
const okq=(q,s)=>{s=s||[];return s.length===q.a.length&&q.a.every(x=>s.includes(x))};
async function readFile(f){if(/\.docx$/i.test(f.name)){const r=await mammoth.extractRawText({arrayBuffer:await f.arrayBuffer()});return r.value}return await f.text()}
function rd(f){return new Promise(res=>{const fr=new FileReader();fr.onload=()=>{const im=new Image();im.onload=()=>{const k=Math.min(1,900/Math.max(im.width,im.height)),c=document.createElement('canvas');c.width=im.width*k;c.height=im.height*k;c.getContext('2d').drawImage(im,0,0,c.width,c.height);res(c.toDataURL('image/jpeg',.75))};im.onerror=()=>res(null);im.src=fr.result};fr.onerror=()=>res(null);fr.readAsDataURL(f)})}
async function readImgs(fs){const o={};for(const f of fs){const n=parseInt(f.name);if(n){const d=await rd(f);if(d)o[n]=d}}return o}

/* ---- mavzu, konfeti, arxiv, CSV, pauza oynasi ---- */
(function(){const t=LS.g('tp_theme');if(t)document.documentElement.dataset.theme=t;$('#th').onclick=()=>{const d=document.documentElement,n=(d.dataset.theme||(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'))==='dark'?'light':'dark';d.dataset.theme=n;LS.s('tp_theme',n)}})();
function confetti(){const e=['🎉','✨','🌟','🎊'];for(let i=0;i<30;i++){const x=document.createElement('span');x.className='cf';x.textContent=e[i%4];x.style.left=Math.random()*100+'vw';x.style.animationDuration=(2+Math.random()*2.5)+'s';document.body.appendChild(x);setTimeout(()=>x.remove(),5000)}}
function ov(on){let e=$('#pzo');if(on&&!e){e=document.createElement('div');e.id='pzo';e.className='ov';e.innerHTML='<div><div style="font-size:3rem">⏸</div><b>Test vaqtinça töxtatildi</b><p>Öqituvçi davom ettirişini kuting</p></div>';document.body.appendChild(e)}if(!on&&e)e.remove()}
function arch(c,t){let a=[];try{a=JSON.parse(LS.g('tp_rooms')||'[]')}catch(e){}a.unshift({c,t,ts:Date.now()});LS.s('tp_rooms',JSON.stringify(a.slice(0,30)))}
function archHtml(){let a=[];try{a=JSON.parse(LS.g('tp_rooms')||'[]')}catch(e){}
 return a.length?a.map(x=>'<div class="ar"><button class="btn sm" data-ar="'+esc(x.c)+'">Oçiş</button><b>'+esc(x.t)+'</b><span class="mut">'+esc(x.c)+' • '+new Date(x.ts).toLocaleDateString()+'</span></div>').join(''):'<p class="mut">Hozirça testlar yöq.</p>'}
function csv(ps,c){const rows=[['Ism','Variant','Holat','Ball','Jami','Foiz','Baho','Çiqişlar']].concat(ps.map(p=>[p.name,p.variant||'',p.status,p.score==null?'':p.score,p.total==null?'':p.total,p.p==null?'':p.p,p.grade==null?'':p.grade,p.leaves||0]));
 const t='\ufeff'+rows.map(r=>r.map(x=>'"'+String(x).replace(/"/g,'""')+'"').join(',')).join('\n');
 const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([t],{type:'text/csv;charset=utf-8'}));a.download='natijalar_'+c+'.csv';document.body.appendChild(a);a.click();a.remove()}

/* ---- bosh sahifa ---- */
function home(){clr();ov(false);
 app.innerHTML='<div class="card c"><h2>Xuş kelibsiz!</h2><p class="mut">Rolni tanlang</p><div class="roles"><button class="role" id="b1"><span>👨‍🎓</span><b>Öquvçi</b><small>Kod yoki QR orqali testga kiriş</small></button>'+
 (mode==='claude'&&!isT?'':'<button class="role" id="b2"><span>👨‍🏫</span><b>Öqituvçi</b><small>Test yaratiş va natijalarni kuzatiş</small></button>')+'</div></div>';
 $('#b1').onclick=sJoin;const b2=$('#b2');if(b2)b2.onclick=()=>{if(unlock())tHome()}}
function unlock(){if(isT)return true;if(mode==='claude')return false;let p=LS.g('tp_pin');
 if(!p){p=prompt('Öqituvçi uçun yangi PIN-kod yarating:');if(!p)return false;LS.s('tp_pin',p)}
 else{const x=prompt('Öqituvçi PIN-kodi:');if(x!==p){alert('PIN notöğri');return false}}
 isT=true;return true}

/* ---- öqituvçi: test joylaş ---- */
function prev(){const t=$('#tx').value,box=$('#pv');if(!t.trim()){box.innerHTML='';return}
 const r=parse(t);let h='<div class="'+(r.bad.length?'warn':'okb')+'"><b>'+r.ok.length+' ta savol töğri öqildi</b>'+(r.bad.length?' • <span style="color:var(--bad)">'+r.bad.length+' tasida xato bor</span>':' ✓')+'</div>';
 h+=r.bad.map(b=>'<div class="dq">⚠ <b>'+(b.k||'?')+'-savol:</b> '+esc(b.w)+'<div class="mut">'+esc(b.q.slice(0,70))+'</div></div>').join('');
 if(r.ok.length)h+='<details><summary>Savollarni köriş ('+r.ok.length+')</summary>'+r.ok.map(q=>'<div class="dq"><b>'+q.k+'.</b> '+esc(q.q)+(q.u?' 🖼':'')+q.o.map((o,j)=>o?'<div class="'+(q.a.includes(j)?'okt':'mut')+'">'+'ABCDEFGH'[j]+') '+esc(o)+(q.a.includes(j)?' ✓':'')+'</div>':'').join('')+'</div>').join('')+'</details>';
 box.innerHTML=h}
function tHome(){clr();ov(false);const last=LS.g('tp_last');
 app.innerHTML='<div class="card"><h2>Yangi test yaratiş</h2>'+
 (mode==='local'?'<div class="warn">Baza ulanmagan: test faqat şu qurilmada işlaydi.</div>':'')+
 '<label>Test nomi</label><input id="ti" placeholder="Masalan: Marketing — 1-nazorat">'+
 '<label>Fayl yuklang (.txt yoki .docx)</label><input type="file" id="fi" accept=".txt,.docx">'+
 '<label>yoki savollarni şu yerga joylang</label><textarea id="tx" placeholder="1. Savol?&#10;A) Javob&#10;*B) Töğri javob&#10;C) Javob&#10;D) Javob"></textarea><div id="pv" style="margin-top:8px"></div>'+
 '<label>Savol rasmlari (ixtiyoriy). Fayl nomi savol raqami: 3.jpg</label><input type="file" id="im" accept="image/*" multiple>'+
 '<label>Variantlar soni</label><input type="number" id="nv" value="4" min="1" max="20">'+
 '<label>Test vaqti (daqiqa; 0 = çeklovsiz)</label><input type="number" id="mn" value="20" min="0" max="300">'+
 '<label class="chk"><input type="checkbox" id="ap"> Har bir öquvçiga öqituvçi qölda ruxsat bersin</label>'+
 '<button class="btn" id="go">Xona yaratiş (kod va QR oliş)</button><div id="ms" class="mut" style="margin-top:8px"></div>'+
 (last?'<button class="btn alt2" id="lr">Oxirgi xonaga qaytiş ('+esc(last)+')</button>':'')+'</div>'+
 '<div class="card"><h2>Test arxivi</h2>'+archHtml()+'</div>'+
 '<div class="card"><h2>Fayl formati</h2><pre>1. Savol matni?\nA) Variant\n*B) Töğri javob (yulduzça bilan)\nC) Variant\nD) Variant\n\n2. Bir neçta töğri javob\n*A) Töğri\nB) Notöğri\n*C) Töğri\n[rasm: https://...jpg]\n\n3. Yana savol\nA) ...\nB) ...\nJavob: A, C</pre></div><button class="btn alt2" id="hm">← Boş sahifa</button>';
 $('#hm').onclick=home;if(last)$('#lr').onclick=()=>tRoom(last);document.querySelectorAll('[data-ar]').forEach(b=>b.onclick=()=>tRoom(b.dataset.ar));
 $('#tx').oninput=prev;
 $('#fi').onchange=async e=>{const f=e.target.files[0];if(f){try{$('#tx').value=await readFile(f);$('#ms').textContent='Fayl öqildi: '+f.name;prev()}catch(x){$('#ms').textContent='Faylni öqib bölmadi'}}};
 $('#go').onclick=async()=>{const R=parse($('#tx').value),qs=R.ok,n=Math.max(1,Math.min(20,+$('#nv').value||1)),m=$('#ms');
  if(!qs.length){m.textContent='Savollar topilmadi. Har bir savolda töğri javob belgilangan bölsin.';return}
  if(R.bad.length&&!confirm(R.bad.length+' ta savol xato bölgani uçun ötkazib yuboriladi. Davom etasizmi?'))return;
  const A='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let c='';for(let i=0;i<6;i++)c+=A[Math.floor(Math.random()*A.length)];
  m.textContent='Yuklanmoqda…';
  try{const imgs=await readImgs($('#im').files);await P('tests/'+c,{variants:makeVariants(qs,n),imgs});
   await P('rooms/'+c,{title:$('#ti').value.trim()||'Test',min:Math.max(0,Math.min(300,+$('#mn').value||0)),status:'lobby',approve:$('#ap').checked,allow:{},block:{},n:qs.length,extra:0,pz:{on:false}});
   LS.s('tp_last',c);arch(c,$('#ti').value.trim()||'Test');tRoom(c)}catch(e){m.textContent='Saqlab bölmadi: '+(e.message||'xato')}}}

/* ---- öqituvçi: xona (kod, QR, jonli iştirokçilar) ---- */
function dview(p){const d=p.dt||[];return'<div class="card"><h2>'+esc(p.name)+(p.score!=null?' — '+p.score+'/'+p.total+' • baho '+p.grade:'')+'</h2>'+
 (d.length?d.map((x,i)=>'<div class="dq"><b style="color:var('+(x.ok?'--ok':'--bad')+')">'+(x.ok?'✓':'✗')+'</b> '+(i+1)+'. '+esc(x.q)+'<div class="mut">Javobi: '+(x.s.length?esc(x.s.join(', ')):'—')+(x.ok?'':' • Töğri: <b style="color:var(--ok)">'+esc(x.k.join(', '))+'</b>')+'</div></div>').join(''):'<p class="mut">Javoblar tafsiloti yöq (öquvçi hali topşirmagan).</p>')+
 '<button class="btn alt2" id="dx">Yopiş</button></div>'}
async function tRoom(c){clr();ov(false);let r;try{r=await G('rooms/'+c)}catch(e){}
 if(!r){alert('Xona topilmadi');return tHome()}
 const link=location.href.split('#')[0]+'#'+c;
 app.innerHTML='<div class="card c"><div class="mut">Test kodi</div><div class="code">'+c+'</div><div class="qr" id="qr"></div>'+
 '<p class="mut" style="word-break:break-all">'+esc(link)+'</p><b>'+esc(r.title)+'</b> <span class="mut">• '+r.n+' ta savol • '+(r.min?r.min+' daqiqa':'vaqt çeklanmagan')+(r.approve?' • ruxsat bilan':'')+'</span>'+
 '<div><button class="btn" id="st1">▶ Testni boşlaş</button><button class="btn alt" id="st2">■ Yakunlaş</button><button class="btn alt2" id="st3">✔ Hammaga ruxsat</button></div>'+
 '<div><button class="btn alt2" id="st4">⏸ Pauza</button><button class="btn alt2" id="st5">+5 daqiqa</button></div><div id="ss" class="mut" style="margin-top:8px"></div></div>'+
 '<div class="stats" id="sx"></div><div id="dv"></div><div class="card"><h2>Savollar tahlili</h2><div id="qa" class="mut"></div></div><div class="card"><h2>Iştirokçilar <span id="cn" class="mut"></span></h2><div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px"><input id="sq" placeholder="Ism böyiça qidiriş" style="flex:1;min-width:140px"><select id="so" style="width:auto"><option value="j">Kiriş tartibi</option><option value="b">Ball böyiça</option></select><button class="btn sm" id="dl" style="margin:0">⬇ Excel (CSV)</button></div><div class="tw"><table id="pt"></table></div></div>'+
 '<button class="btn alt2" id="nw">+ Yangi test</button>';
 try{new QRCode($('#qr'),{text:link,width:190,height:190})}catch(e){}
 const lab={lobby:'Kutiş xonasi: öquvçilar kirmoqda',running:'Test davom etmoqda',closed:'Test yakunlangan'};
 const show=()=>{const pz=(r.pz||{}).on;$('#ss').textContent=(pz?'⏸ Pauza. ':'')+lab[r.status]+(r.extra?' • +'+r.extra+' daqiqa qöşildi':'');$('#st4').textContent=pz?'▶ Davom ettiriş':'⏸ Pauza'};show();
 const save=async()=>{await P('rooms/'+c,r);show()};
 $('#st1').onclick=async()=>{r.status='running';await save()};
 $('#st2').onclick=async()=>{if(confirm('Testni yakunlaysizmi?')){r.status='closed';await save()}};
 $('#st3').onclick=async()=>{(await listP(c)).forEach(p=>{if(!r.block[p.id])r.allow[p.id]=1});r.approve=false;await save();poll()};
 $('#st4').onclick=async()=>{r.pz=r.pz||{};r.pz.on=!r.pz.on;await save()};
 $('#st5').onclick=async()=>{r.extra=(r.extra||0)+5;await save()};
 let cur=[];$('#nw').onclick=tHome;$('#dl').onclick=()=>csv(cur,c);
 const poll=async()=>{try{const ps=(await listP(c)).sort((a,b)=>a.joined-b.joined);cur=ps;const fq=($('#sq').value||'').toLowerCase();let vs=ps.filter(p=>p.name.toLowerCase().includes(fq));if($('#so').value==='b')vs=vs.slice().sort((a,b)=>(b.p==null?-1:b.p)-(a.p==null?-1:a.p));
  const dn=ps.filter(p=>p.status==='done'),done=dn.length;$('#cn').textContent='— '+ps.length+' ta';
  $('#sx').innerHTML='<div class="stat"><b>'+ps.length+'</b>iştirokçi</div><div class="stat"><b>'+done+'</b>topşirgan</div><div class="stat"><b>'+(done?Math.round(dn.reduce((a,p)=>a+p.p,0)/done)+'%':'—')+'</b>örtaça</div><div class="stat"><b>'+(done?Math.max.apply(null,dn.map(p=>p.p))+'%':'—')+'</b>eng yuqori</div>';
  const wc={};dn.forEach(p=>(p.wr||[]).forEach(t=>{wc[t]=(wc[t]||0)+1}));const top=Object.entries(wc).sort((a,b)=>b[1]-a[1]).slice(0,5);
  $('#qa').innerHTML=done?(top.length?'<p class="mut">Eng köp xato qilingan savollar:</p>'+top.map(x=>'<div style="padding:6px 0;border-bottom:1px solid var(--line);color:var(--ink)"><b style="color:var(--bad)">'+x[1]+'/'+done+'</b> '+esc(x[0])+'</div>').join(''):'Hamma savolga töğri javob berilgan 🎉'):'Ma’lumot topşirganlardan keyin çiqadi.';
  $('#pt').innerHTML='<tr><th>#</th><th>Ism</th><th>Holat</th><th>Ball</th><th>Foiz</th><th>Baho</th><th>Çiqiş</th><th>Ruxsat</th></tr>'+(vs.length?vs.map((p,i)=>{
   const bl=r.block[p.id],al=!r.approve||r.allow[p.id];
   const h=bl?'<span class="pill bad">Çetlatilgan</span>':p.status==='done'?'<span class="pill ok">Topşirdi</span>':p.status==='working'?'<span class="pill b">Işlayapti</span>':al?'<span class="pill w">Kutmoqda</span>':'<span class="pill bad">Ruxsat kutmoqda</span>';
   return'<tr><td>'+(i+1)+'</td><td><button class="lnk" data-v="'+p.id+'">'+esc(p.name)+'</button></td><td>'+h+'</td><td>'+(p.status==='done'?p.score+'/'+p.total:'—')+'</td><td>'+(p.status==='done'?p.p+'%':'—')+'</td><td><b>'+(p.status==='done'?p.grade:'—')+'</b></td><td>'+(p.leaves?'<span class="pill bad">⚠ '+p.leaves+'</span>':'—')+'</td><td>'+
   (bl?'<button class="btn sm ok" data-a="un" data-i="'+p.id+'">Qaytariş</button>':(al?'':'<button class="btn sm ok" data-a="al" data-i="'+p.id+'">Ruxsat</button>')+(p.status==='done'?'':'<button class="btn sm bad" data-a="bl" data-i="'+p.id+'">Blok</button>'))+'</td></tr>'}).join(''):'<tr><td colspan="8" class="mut">Hozirça heç kim kirmadi. Kodni yoki QR’ni öquvçilarga bering.</td></tr>');
  document.querySelectorAll('#pt button[data-a]').forEach(b=>b.onclick=async()=>{const i=b.dataset.i,a=b.dataset.a;
   if(a==='al')r.allow[i]=1;if(a==='bl'){r.block[i]=1;delete r.allow[i]}if(a==='un')delete r.block[i];await save();poll()});
  document.querySelectorAll('.lnk').forEach(b=>b.onclick=()=>{const p=cur.find(x=>x.id===b.dataset.v);if(!p)return;$('#dv').innerHTML=dview(p);$('#dx').onclick=()=>{$('#dv').innerHTML=''};$('#dv').scrollIntoView({behavior:'smooth'})})}catch(e){}};
 poll();T=setInterval(poll,3000)}

/* ---- öquvçi ---- */
function sJoin(){clr();const c0=(location.hash||'').slice(1).toUpperCase();
 app.innerHTML='<div class="card"><h2>Testga kiriş</h2><label>Test kodi</label><input id="sc" maxlength="8" value="'+esc(c0)+'" style="text-transform:uppercase;letter-spacing:5px;font-size:1.4rem;text-align:center">'+
 '<label>Ism va familiyangiz</label><input id="sn" value="'+esc(LS.g('tp_name')||'')+'" placeholder="Masalan: Aliyev Vali"><button class="btn" id="sg">Kiriş</button><div id="sm" class="mut" style="margin-top:8px"></div></div><button class="btn alt2" id="hm">← Boş sahifa</button>';
 $('#hm').onclick=home;
 $('#sg').onclick=async()=>{const c=$('#sc').value.trim().toUpperCase(),nm=$('#sn').value.trim(),m=t=>$('#sm').textContent=t;
  if(!c)return m('Test kodini kiriting');if(nm.length<3)return m('Ism-familiyangizni kiriting');
  if(LS.g('done_'+c))return m('Siz bu testni topşirib bölgansiz');
  try{const r=await G('rooms/'+c);if(!r)return m('Bunday kod topilmadi');if(await tryResume(c,r))return;if(r.status==='closed')return m('Bu test yakunlangan');
   LS.s('tp_name',nm);let id=LS.g('pid_'+c);if(!id){id=Math.random().toString(36).slice(2,9);LS.s('pid_'+c,id)}
   st={code:c,name:nm,id,joined:Date.now()};await putP(c,{id,name:nm,status:'waiting',joined:st.joined});sWait()}catch(e){m('Ulanişda xato: '+(e.message||''))}}}
function msg(h,t){clr();ov(false);app.innerHTML='<div class="card c"><h2>'+h+'</h2><p class="mut">'+t+'</p></div>'}
function sWait(){clr();app.innerHTML='<div class="card c"><h2>Siz röyxatdasiz ✅</h2><p><b>'+esc(st.name)+'</b></p><p class="mut" id="wt">Öqituvçi testni boşlaşini kuting…</p><div style="font-size:2rem">⏳</div></div>';
 const chk=async()=>{try{const r=await G('rooms/'+st.code);if(!r)return;
  if(r.block&&r.block[st.id]){return msg('⛔ Çetlatildingiz','Öqituvçi sizga ruxsat bermadi.')}
  if(r.status==='closed')return msg('Test yakunlandi','Kiriş yopilgan.');
  if(r.status==='running'){if(r.approve&&!r.allow[st.id]){$('#wt').textContent='Öqituvçi sizga ruxsat berişini kuting…';return}clr();startTest(r)}}catch(e){}};
 chk();T=setInterval(chk,2500)}
function sv(){LS.s('sess_'+st.code,JSON.stringify({id:st.id,name:st.name,joined:st.joined,v:st.v,ans:Array.from(st.ans,x=>x||[]),end:st.end,idx:st.idx,leaves:st.leaves||0,pt:st.pt||0}))}
function hook(){document.onvisibilitychange=()=>{if(document.hidden&&st.v&&!st.done){st.leaves=(st.leaves||0)+1;sv();putP(st.code,{id:st.id,name:st.name,status:'working',joined:st.joined,variant:st.v.id,leaves:st.leaves}).catch(()=>{})}}}
async function tryResume(c,r){const s=JSON.parse(LS.g('sess_'+c)||'null');if(!s||LS.g('done_'+c))return false;
 if(r.block&&r.block[s.id]){msg('⛔ Çetlatildingiz','Öqituvçi sizga ruxsat bermadi.');return true}
 let t=null;try{t=await G('tests/'+c)}catch(e){}
 st=Object.assign(s,{code:c,room:r,imgs:(t&&t.imgs)||{},done:0,ps:0});LS.s('tp_name',s.name);
 if(r.status==='closed'||(r.min&&Date.now()>=st.end+(r.extra||0)*60000+(st.pt||0))){finish(true);return true}
 renderQ();startTimer();hook();return true}
async function startTest(r){let t;try{t=await G('tests/'+st.code)}catch(e){}
 if(!t)return msg('Xato','Test yuklanmadi. Qayta urinib köring.');
 st.room=r;st.imgs=t.imgs||{};st.v=pers(t.variants[Math.floor(Math.random()*t.variants.length)]);st.ans=[];st.idx=0;st.leaves=0;st.done=0;st.pt=0;st.ps=0;st.end=r.min?Date.now()+r.min*60000:0;sv();
 try{await putP(st.code,{id:st.id,name:st.name,status:'working',joined:st.joined,variant:st.v.id})}catch(e){}
 renderQ();startTimer();hook()}
function startTimer(){let k=0;st.pt=st.pt||0;st.tk=async()=>{const r=st.room,pz=r.pz||{};
  if(pz.on&&!st.ps)st.ps=Date.now();if(!pz.on&&st.ps){st.pt+=Date.now()-st.ps;st.ps=0;sv()}
  ov(!!pz.on&&!st.done);
  if(r.min&&!st.done){const sh=(r.extra||0)*60000+st.pt+(st.ps?Date.now()-st.ps:0),s=Math.max(0,Math.round((st.end+sh-Date.now())/1000)),el=$('#tm');
   if(el){el.textContent='⏱ '+String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');el.style.color=s<60?'var(--bad)':''}
   if(s<=0&&!pz.on){clr();alert('Vaqt tugadi! Natijangiz yuborilmoqda.');return finish(true)}}
  if(++k%3===0&&!st.done){try{const x=await G('rooms/'+st.code);if(x){st.room=x;if(x.block&&x.block[st.id]){clr();st.done=1;msg('⛔ Çetlatildingiz','Öqituvçi testni töxtatdi.')}}}catch(e){}}};
 clr();T=setInterval(st.tk,1000);st.tk()}
function renderQ(keep){const v=st.v,r=st.room,n=v.qs.length,i=st.idx,q=v.qs[i],sel=st.ans[i]||[],mu=q.a.length>1,img=q.u||(st.imgs||{})[q.k],dn=st.ans.filter(x=>x&&x.length).length;
 app.innerHTML='<div class="tb"><span class="chip">'+(i+1)+' / '+n+'</span><span class="chip" id="tm" style="'+(r.min?'':'display:none')+'"></span></div><div class="bar"><i style="width:'+(dn/n*100)+'%"></i></div>'+
 '<div class="card"><div class="mut">'+esc(r.title)+' • '+v.id+'-variant</div><h3 class="qt">'+esc(q.q)+'</h3>'+(mu?'<div class="hint">Bir neçta töğri javobni belgilang</div>':'')+(img?'<img class="qi" src="'+esc(img)+'" alt="">':'')+
 q.o.map((o,j)=>'<button class="opt'+(sel.includes(j)?' sel':'')+(mu?' mu':'')+'" data-j="'+j+'"><span class="mk">'+'ABCDEFGH'[j]+'</span><span>'+esc(o)+'</span></button>').join('')+'</div>'+
 '<div class="nav"><button class="btn alt2" id="pv"'+(i?'':' disabled')+'>← Oldingi</button>'+(i<n-1?'<button class="btn" id="nx">Keyingi →</button>':'<button class="btn ok" id="fn">Yakunlaş ✓</button>')+'</div>'+
 '<div class="nbs">'+v.qs.map((_,k)=>'<button class="nb'+(k===i?' cur':'')+((st.ans[k]&&st.ans[k].length)?' dn':'')+'" data-k="'+k+'">'+(k+1)+'</button>').join('')+'</div><div class="c"><button class="btn alt" id="fn2">Testni yakunlaş</button></div>';
 if(!keep)scrollTo(0,0);
 document.querySelectorAll('.opt').forEach(b=>b.onclick=()=>{const j=+b.dataset.j;let a=st.ans[i]||[];a=mu?(a.includes(j)?a.filter(x=>x!==j):a.concat(j)):[j];st.ans[i]=a;sv();renderQ(true)});
 const go=k=>{st.idx=k;sv();renderQ()};
 $('#pv').onclick=()=>go(i-1);const nx=$('#nx');if(nx)nx.onclick=()=>go(i+1);const fn=$('#fn');if(fn)fn.onclick=()=>finish();
 $('#fn2').onclick=()=>finish();document.querySelectorAll('.nb').forEach(b=>b.onclick=()=>go(+b.dataset.k));
 if(st.tk)st.tk()}
async function finish(force){if(st.done&&!force)return;const v=st.v,n=v.qs.length,A=i=>st.ans[i]||[],un=v.qs.filter((q,i)=>!A(i).length).length;
 if(un&&!force&&!confirm(un+' ta savolga javob berilmadi. Baribir yakunlaysizmi?'))return;clr();ov(false);document.onvisibilitychange=null;st.done=1;
 const dt=v.qs.map((q,i)=>({q:q.q.slice(0,90),s:A(i).map(j=>(q.o[j]||'').slice(0,60)),k:q.a.map(j=>(q.o[j]||'').slice(0,60)),ok:okq(q,A(i))?1:0})),
 wr=dt.filter(d=>!d.ok).map(d=>d.q),sc=n-wr.length,p=Math.round(sc/n*100),g=gr(p);let saved=true;
 try{await putP(st.code,{id:st.id,name:st.name,status:'done',joined:st.joined,variant:v.id,score:sc,total:n,p,grade:g,wr,dt,leaves:st.leaves||0});LS.s('done_'+st.code,'1');LS.d('sess_'+st.code)}catch(e){saved=false}
 let h='<div class="card c"><div class="ring" style="--p:'+p+'"><div><b style="font-size:2.8rem;line-height:1">'+g+'</b><span class="mut">baho</span></div></div><div class="score" style="font-size:1.6rem;margin-top:8px">'+sc+' / '+n+' • '+p+'%</div><p class="mut">'+(g==5?'A’lo! Tabriklaymiz! 🎉':g==4?'Yaxshi natija 👍':g==3?'Qoniqarli':'Köproq tayyorlaning')+'</p>'+(saved?'':'<div class="warn">Natija öqituvçiga yuborilmadi (internet muammosi).</div>')+'</div><div class="card"><h2>Javoblar tahlili</h2>';
 v.qs.forEach((q,i)=>{h+='<div style="margin:14px 0"><b>'+(i+1)+'. '+esc(q.q)+'</b>'+q.o.map((o,j)=>'<div class="opt '+(q.a.includes(j)?'ok':A(i).includes(j)?'no':'')+'"><span class="mk">'+'ABCDEFGH'[j]+'</span><span>'+esc(o)+(q.a.includes(j)?' ✓':A(i).includes(j)?' ✗':'')+'</span></div>').join('')+'</div>'});
 app.innerHTML=h+'</div>';scrollTo(0,0);if(g==5)confetti()}

/* ---- ishga tushirish ---- */
(async()=>{try{if(window.claude&&claude.use){const d=await claude.use('db');if(d){db=d;mode='claude';try{const u=await claude.use('user');isT=u?await u.isOwner():false}catch(e){}}}}catch(e){}
 if(mode!=='claude')mode=FB_URL?'fb':'local';
 if(location.hash.length>1){const c=location.hash.slice(1).toUpperCase();let r=null;try{r=await G('rooms/'+c)}catch(e){}if(r&&await tryResume(c,r))return;sJoin()}else home()})();
})();
