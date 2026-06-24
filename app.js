
import { firebaseConfig } from './firebase-config.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup,
  createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
  collection, doc, onSnapshot,
  addDoc, deleteDoc, updateDoc, setDoc, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* ===== Static data ===== */
const CATS={
  expense:[
    {id:'food',emo:'🍜',name:'Ăn uống'},{id:'shop',emo:'🛍️',name:'Mua sắm'},
    {id:'transport',emo:'🚕',name:'Đi lại'},{id:'home',emo:'🏠',name:'Nhà cửa'},
    {id:'fun',emo:'🎮',name:'Giải trí'},{id:'health',emo:'💊',name:'Sức khoẻ'},
    {id:'edu',emo:'📚',name:'Học tập'},{id:'bill',emo:'🧾',name:'Hoá đơn'},
    {id:'other',emo:'📦',name:'Khác'},
  ],
  income:[
    {id:'salary',emo:'💵',name:'Lương'},{id:'bonus',emo:'🎁',name:'Thưởng'},
    {id:'invest',emo:'📊',name:'Đầu tư'},{id:'gift',emo:'💝',name:'Được tặng'},
    {id:'freelance',emo:'💻',name:'Freelance'},{id:'other',emo:'📦',name:'Khác'},
  ]
};
const WALLET_ICONS=['💵','🏦','💳','📱','🪙','💰','🏧','🐷'];
const WALLET_COLORS={'💵':'#34e0a1','🏦':'#60a5fa','💳':'#ff6b8b','📱':'#a78bfa','🪙':'#ffb86b','💰':'#22d3ee','🏧':'#7c5cff','🐷':'#ff6bcb'};
const COLORS=['#7c5cff','#22d3ee','#34e0a1','#ffb86b','#ff6b8b','#ff6bcb','#a78bfa','#60a5fa','#f472b6'];

let state={
  tab:'dash',
  txType:'expense', cat:'food', walletInput:'',
  recType:'expense', recCat:'food', recIcon:'💵',
  wIcon:'💵',
  filter:{q:'',type:'all',cat:'all',wallet:'all',from:'',to:''},
  txs:[], wallets:[], recurring:[], budget:{total:0,perCat:{}},
};
let chart, db, auth, currentUser=null;
let unsubs=[];
let recurringRan=false;

const $=s=>document.querySelector(s);
const $$=s=>document.querySelectorAll(s);
const fmt=n=>new Intl.NumberFormat('vi-VN').format(Math.round(n))+'₫';
const num=s=>parseFloat(String(s).replace(/[^\d]/g,''))||0;
const catInfo=(t,id)=>(CATS[t]||[]).find(c=>c.id===id)||{emo:'📦',name:'Khác'};
const todayISO=()=>{const d=new Date();return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10);};
const isoOf=d=>new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10);
const fmtDate=iso=>{const [y,m,d]=(iso||'').split('-');return d&&m&&y?`${d}/${m}/${y}`:iso;};
const monthKey=iso=>(iso||'').slice(0,7);
const monthLabel=k=>{const [y,m]=k.split('-');return m&&y?`Tháng ${parseInt(m)}/${y}`:k;};
const thisMonth=()=>todayISO().slice(0,7);
const VN_WD=['Chủ Nhật','Thứ Hai','Thứ Ba','Thứ Tư','Thứ Năm','Thứ Sáu','Thứ Bảy'];
const VN_WD_SHORT=['CN','T2','T3','T4','T5','T6','T7'];
const VN_MO=['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6','Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'];
function dayHeaderInfo(iso){
  const p=(iso||'').split('-');
  if(p.length!==3)return {wd:'',dd:iso||'',tag:''};
  const y=+p[0],m=+p[1],d=+p[2];const dt=new Date(y,m-1,d);
  const yest=isoOf(new Date(Date.now()-86400000));
  const tag=iso===todayISO()?'Hôm nay':iso===yest?'Hôm qua':'';
  return {wd:VN_WD[dt.getDay()],dd:`${String(d).padStart(2,'0')}/${String(m).padStart(2,'0')}/${y}`,tag};
}

/* ===== Custom date picker (glass theme, replaces native popup) ===== */
const datePicker=(function(){
  let pop=null, active=null, mode='days';
  const view={y:2000,m:0}, reg={};
  const parseIso=iso=>{const p=(iso||'').split('-');return p.length===3?{y:+p[0],m:+p[1]-1,d:+p[2]}:null;};
  const toIso=(y,m,d)=>`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  const fmtDisp=iso=>{const o=parseIso(iso);return o?`${String(o.d).padStart(2,'0')}/${String(o.m+1).padStart(2,'0')}/${o.y}`:'';};
  function ensure(){
    if(pop)return;
    pop=document.createElement('div');pop.className='dp-pop';document.body.appendChild(pop);
    pop.addEventListener('mousedown',e=>e.preventDefault());
    document.addEventListener('click',e=>{if(active&&pop&&!pop.contains(e.target)&&e.target!==active.input)close();});
    window.addEventListener('resize',close);window.addEventListener('scroll',close,true);
  }
  function place(){
    const r=active.input.getBoundingClientRect(),w=300,vw=document.documentElement.clientWidth;
    let left=r.left+window.scrollX;
    if(left+w>window.scrollX+vw-8)left=window.scrollX+vw-w-8;
    if(left<window.scrollX+8)left=window.scrollX+8;
    pop.style.left=left+'px';pop.style.top=(r.bottom+window.scrollY+8)+'px';pop.style.width=w+'px';
  }
  function render(){
    if(mode==='months'){
      const {y}=view, selO=parseIso(active.iso);
      pop.innerHTML=`<div class="dp-head"><button class="dp-nav" data-nav="-1">‹</button>`
        +`<button class="dp-title" data-title>${y}</button><button class="dp-nav" data-nav="1">›</button></div>`
        +`<div class="dp-months">${VN_MO.map((mo,i)=>`<button class="dp-mo${selO&&selO.y===y&&selO.m===i?' sel':''}" data-mo="${i}">${mo}</button>`).join('')}</div>`;
      return bind();
    }
    const {y,m}=view, sel=active.iso, today=todayISO();
    const first=new Date(y,m,1).getDay(), days=new Date(y,m+1,0).getDate(), prevDays=new Date(y,m,0).getDate();
    let cells='';
    for(let i=0;i<first;i++){const d=prevDays-first+1+i;cells+=`<button class="dp-day dim" data-off="-1" data-d="${d}">${d}</button>`;}
    for(let d=1;d<=days;d++){const iso=toIso(y,m,d);let c='dp-day';if(iso===today)c+=' today';if(iso===sel)c+=' sel';cells+=`<button class="${c}" data-d="${d}">${d}</button>`;}
    const trail=(7-(first+days)%7)%7;
    for(let i=1;i<=trail;i++)cells+=`<button class="dp-day dim" data-off="1" data-d="${i}">${i}</button>`;
    pop.innerHTML=`<div class="dp-head"><button class="dp-nav" data-nav="-1">‹</button>`
      +`<button class="dp-title" data-title>${VN_MO[m]} ${y}</button><button class="dp-nav" data-nav="1">›</button></div>`
      +`<div class="dp-grid">${VN_WD_SHORT.map(w=>`<div class="dp-wd">${w}</div>`).join('')}${cells}</div>`
      +`<div class="dp-foot"><button class="dp-clear" data-clear>Xoá</button><button data-today>Hôm nay</button></div>`;
    bind();
  }
  function bind(){
    pop.querySelectorAll('[data-nav]').forEach(b=>b.onclick=()=>{const dir=+b.dataset.nav;
      if(mode==='months'){view.y+=dir;}else{view.m+=dir;if(view.m<0){view.m=11;view.y--;}if(view.m>11){view.m=0;view.y++;}}render();});
    const title=pop.querySelector('[data-title]');if(title)title.onclick=()=>{mode=mode==='months'?'days':'months';render();};
    pop.querySelectorAll('[data-mo]').forEach(b=>b.onclick=()=>{view.m=+b.dataset.mo;mode='days';render();});
    pop.querySelectorAll('.dp-day:not(.dim)').forEach(b=>b.onclick=()=>pick(toIso(view.y,view.m,+b.dataset.d)));
    pop.querySelectorAll('.dp-day.dim').forEach(b=>b.onclick=()=>{let yy=view.y,mm=view.m+(+b.dataset.off);
      if(mm<0){mm=11;yy--;}if(mm>11){mm=0;yy++;}pick(toIso(yy,mm,+b.dataset.d));});
    const c=pop.querySelector('[data-clear]');if(c)c.onclick=()=>pick('');
    const td=pop.querySelector('[data-today]');if(td)td.onclick=()=>pick(todayISO());
  }
  function pick(iso){
    active.iso=iso;active.input.value=fmtDisp(iso);active.input.dataset.iso=iso;
    if(active.onChange)active.onChange(iso);
    close();
  }
  function open(rec){
    ensure();active=rec;mode='days';
    const o=parseIso(rec.iso)||parseIso(todayISO());view.y=o.y;view.m=o.m;
    render();place();requestAnimationFrame(()=>pop.classList.add('show'));
  }
  function close(){if(pop)pop.classList.remove('show');active=null;}
  return {
    attach(input,onChange){
      input.type='text';input.readOnly=true;input.autocomplete='off';input.classList.add('dp-input');
      if(!input.placeholder)input.placeholder='dd/mm/yyyy';
      const rec={input,iso:input.dataset.iso||'',onChange};reg[input.id]=rec;
      if(rec.iso)input.value=fmtDisp(rec.iso);
      input.addEventListener('click',e=>{e.stopPropagation();if(active===rec)close();else open(rec);});
      return rec;
    },
    set(id,iso){const r=reg[id];if(!r)return;r.iso=iso||'';r.input.value=fmtDisp(iso);r.input.dataset.iso=iso||'';},
    get(id){const r=reg[id];return r?r.iso:'';}
  };
})();

/* ===== Custom select (rounded option list; native select kept hidden as data source) ===== */
function enhanceSelect(sel){
  if(!sel||sel.dataset.enhanced)return;sel.dataset.enhanced='1';
  const wrap=document.createElement('div');wrap.className='csel';
  sel.parentNode.insertBefore(wrap,sel);wrap.appendChild(sel);sel.classList.add('csel-native');
  const trigger=document.createElement('button');trigger.type='button';trigger.className='csel-trigger';
  const lbl=document.createElement('span'),arr=document.createElement('span');arr.className='csel-arr';arr.textContent='▾';
  trigger.appendChild(lbl);trigger.appendChild(arr);
  const list=document.createElement('div');list.className='csel-list';
  wrap.appendChild(trigger);wrap.appendChild(list);
  const sync=()=>{const o=sel.options[sel.selectedIndex];lbl.textContent=o?o.textContent:'—';};
  const build=()=>{list.innerHTML='';[...sel.options].forEach((o,i)=>{
    const it=document.createElement('div');it.className='csel-item'+(i===sel.selectedIndex?' sel':'');it.textContent=o.textContent;
    it.onclick=()=>{sel.selectedIndex=i;sel.dispatchEvent(new Event('change',{bubbles:true}));sync();close();};
    list.appendChild(it);});};
  const close=()=>wrap.classList.remove('open');
  const open=()=>{closeAllCsel();build();wrap.classList.add('open');};
  trigger.onclick=e=>{e.stopPropagation();wrap.classList.contains('open')?close():open();};
  sel.addEventListener('change',sync);sel._cselSync=sync;sync();
}
function closeAllCsel(){document.querySelectorAll('.csel.open').forEach(w=>w.classList.remove('open'));}
function syncCsels(){document.querySelectorAll('select.csel-native').forEach(s=>s._cselSync&&s._cselSync());}
document.addEventListener('click',()=>closeAllCsel());

/* ===== Color themes ===== */
const THEMES=[
  {key:'',        name:'Tím',       c1:'#7c5cff',c2:'#22d3ee'},
  {key:'ocean',   name:'Đại dương', c1:'#3b82f6',c2:'#22d3ee'},
  {key:'forest',  name:'Rừng xanh', c1:'#10b981',c2:'#34e0a1'},
  {key:'sunset',  name:'Hoàng hôn', c1:'#fb7185',c2:'#fbbf24'},
  {key:'sakura',  name:'Anh đào',   c1:'#ec4899',c2:'#a78bfa'},
  {key:'ruby',    name:'Hồng ngọc', c1:'#ef4444',c2:'#fb923c'},
  {key:'midnight',name:'Đêm',       c1:'#64748b',c2:'#38bdf8'}
];
const currentTheme=()=>document.documentElement.dataset.theme||'';
function applyTheme(key){
  if(key)document.documentElement.dataset.theme=key;else delete document.documentElement.dataset.theme;
  try{localStorage.setItem('vtm_theme',key);}catch(e){}
  const tc=document.querySelector('meta[name=theme-color]');
  if(tc)tc.setAttribute('content',getComputedStyle(document.documentElement).getPropertyValue('--bg-0').trim()||'#0b1020');
  buildThemeGrid();
}
function buildThemeGrid(){
  const grid=$('#themeGrid');if(!grid)return;const cur=currentTheme();grid.innerHTML='';
  THEMES.forEach(t=>{
    const b=document.createElement('button');b.type='button';b.className='theme-sw'+(t.key===cur?' on':'');
    b.innerHTML=`<span class="dot" style="background:linear-gradient(135deg,${t.c1},${t.c2})"></span>${t.name}<span class="chk">✓</span>`;
    b.onclick=()=>applyTheme(t.key);
    grid.appendChild(b);
  });
}

const escapeHtml=s=>(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const walletById=id=>state.wallets.find(w=>w.id===id);
const walletName=id=>{const w=walletById(id);return w?`${w.icon} ${w.name}`:'—';};

function toast(msg,kind){const t=$('#toast');t.className='toast show'+(kind?' '+kind:'');t.innerHTML=msg;clearTimeout(t._tm);t._tm=setTimeout(()=>t.classList.remove('show'),2600);}
const show=el=>el.classList.remove('app-hidden');
const hide=el=>el.classList.add('app-hidden');

/* Attach thousand-separator formatting to a text input */
function attachThousands(el){
  el.addEventListener('input',e=>{
    const t=e.target;
    const before=t.value.slice(0,t.selectionStart).replace(/\D/g,'').length;
    const digits=t.value.replace(/\D/g,'');
    t.value=digits?Number(digits).toLocaleString('en-US'):'';
    let pos=0,seen=0;
    while(pos<t.value.length&&seen<before){if(/\d/.test(t.value[pos]))seen++;pos++;}
    t.setSelectionRange(pos,pos);
  });
}

/* ===== Firebase init ===== */
function configReady(){return firebaseConfig.apiKey && !firebaseConfig.apiKey.startsWith('PASTE_');}
if(!configReady()){hide($('#loadingCard'));show($('#setupCard'));}
else{
  const app=initializeApp(firebaseConfig);
  auth=getAuth(app);
  // Cache cục bộ (IndexedDB): đọc/ghi tức thì, hoạt động cả khi offline rồi đồng bộ sau.
  db=initializeFirestore(app,{localCache:persistentLocalCache({tabManager:persistentMultipleTabManager()})});
  onAuthStateChanged(auth,user=>{
    currentUser=user;
    if(user){
      hide($('#authCard'));hide($('#loadingCard'));$('#overlay').classList.add('hide');show($('#appRoot'));
      paintUser(user);subscribeAll(user.uid);
    }else{
      unsubs.forEach(u=>u&&u());unsubs=[];recurringRan=false;
      state.txs=[];state.wallets=[];state.recurring=[];state.budget={total:0,perCat:{}};
      renderAll();hide($('#appRoot'));hide($('#loadingCard'));$('#overlay').classList.remove('hide');show($('#authCard'));
    }
  });
}

function paintUser(u){
  const name=u.displayName||u.email.split('@')[0];
  $('#userName').childNodes[0].nodeValue=name;
  $('#userEmail').textContent=u.email||'';
  const av=$('#userAv');
  if(u.photoURL)av.innerHTML=`<img src="${u.photoURL}" alt="">`;
  else av.textContent=(name[0]||'U').toUpperCase();
}

/* ===== Firestore subscriptions ===== */
function col(uid,name){return collection(db,'users',uid,name);}
function subscribeAll(uid){
  unsubs.forEach(u=>u&&u());unsubs=[];
  unsubs.push(onSnapshot(col(uid,'wallets'),snap=>{
    state.wallets=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(a.order||0)-(b.order||0));
    if(!snap.size && !localStorage.getItem('seeded_wallets_'+uid)){seedWallets(uid);}
    renderAll();maybeRunRecurring();
  },err=>toast('⚠️ Lỗi ví: '+err.code,'danger')));

  unsubs.push(onSnapshot(col(uid,'transactions'),snap=>{
    state.txs=snap.docs.map(d=>({id:d.id,...d.data()}));
    state.txs.sort((a,b)=>{
      if(a.date!==b.date)return (b.date||'').localeCompare(a.date||'');
      const ta=a.createdAt&&a.createdAt.seconds||0, tb=b.createdAt&&b.createdAt.seconds||0;return tb-ta;
    });
    renderAll();
  },err=>toast('⚠️ Lỗi tải dữ liệu: '+err.code,'danger')));

  unsubs.push(onSnapshot(col(uid,'recurring'),snap=>{
    state.recurring=snap.docs.map(d=>({id:d.id,...d.data()}));
    renderRecurring();maybeRunRecurring();
  }));

  unsubs.push(onSnapshot(doc(db,'users',uid,'settings','budget'),snap=>{
    const d=snap.data()||{};state.budget={total:d.total||0,perCat:d.perCat||{}};
    renderBudget();renderBudgetBanner();
  }));
}

async function seedWallets(uid){
  localStorage.setItem('seeded_wallets_'+uid,'1');
  const defs=[
    {name:'Tiền mặt',icon:'💵',initial:0,order:0},
    {name:'ATM',icon:'🏦',initial:0,order:1},
    {name:'Thẻ tín dụng',icon:'💳',initial:0,order:2},
  ];
  for(const w of defs){try{await addDoc(col(uid,'wallets'),{...w,createdAt:serverTimestamp()});}catch(e){console.error(e);}}
}

/* ===== Recurring auto-run ===== */
async function maybeRunRecurring(){
  if(recurringRan||!currentUser||!state.wallets.length)return;
  recurringRan=true;
  const ym=thisMonth(); const today=parseInt(todayISO().slice(8,10),10);
  for(const r of state.recurring){
    if(!r.active)continue;
    if((r.lastMonth||'')>=ym)continue;
    if((r.day||1)>today)continue;
    const dd=String(Math.min(r.day||1,28)).padStart(2,'0');
    try{
      await addDoc(col(currentUser.uid,'transactions'),{
        type:r.type,cat:r.cat,desc:(r.desc||'')+' (định kỳ)',amount:r.amount,
        date:`${ym}-${dd}`,walletId:r.walletId||'',createdAt:serverTimestamp()
      });
      await updateDoc(doc(db,'users',currentUser.uid,'recurring',r.id),{lastMonth:ym});
      toast('🔁 Đã tự ghi: '+escapeHtml(r.desc));
    }catch(e){console.error(e);}
  }
}

/* ===== Compute ===== */
function walletBalance(w){
  let b=w.initial||0;
  for(const t of state.txs){
    if(t.type==='income'&&t.walletId===w.id)b+=t.amount;
    else if(t.type==='expense'&&t.walletId===w.id)b-=t.amount;
    else if(t.type==='transfer'){if(t.toWallet===w.id)b+=t.amount;if(t.fromWallet===w.id)b-=t.amount;}
  }
  return b;
}
function monthExpense(ym){return state.txs.filter(t=>t.type==='expense'&&monthKey(t.date)===ym).reduce((s,t)=>s+t.amount,0);}
function monthExpenseByCat(ym,catId){return state.txs.filter(t=>t.type==='expense'&&t.cat===catId&&monthKey(t.date)===ym).reduce((s,t)=>s+t.amount,0);}

/* ===== Filtering ===== */
function applyFilters(){
  const f=state.filter;
  return state.txs.filter(t=>{
    if(f.type!=='all'&&t.type!==f.type)return false;
    if(f.cat!=='all'&&t.cat!==f.cat)return false;
    if(f.wallet!=='all'&&t.walletId!==f.wallet&&t.fromWallet!==f.wallet&&t.toWallet!==f.wallet)return false;
    if(f.from&&(t.date||'')<f.from)return false;
    if(f.to&&(t.date||'')>f.to)return false;
    if(f.q){const q=f.q.toLowerCase();if(!(t.desc||'').toLowerCase().includes(q))return false;}
    return true;
  });
}

/* ===== Add / delete transaction ===== */
function addTx(){
  if(!currentUser)return;
  const desc=$('#descInput').value.trim();
  const amount=num($('#amtInput').value);
  const date=datePicker.get('dateInput')||todayISO();
  const walletId=$('#walletInput').value||'';
  if(amount<=0){toast('⚠️ Nhập số tiền hợp lệ','warn');shake($('#amtInput'));return;}
  const type=state.txType;
  // Optimistic: xoá ô nhập & báo ngay, ghi Firestore chạy nền (snapshot tự cập nhật danh sách).
  $('#descInput').value='';$('#amtInput').value='';
  toast((type==='income'?'📈':'📉')+' Đã thêm '+fmt(amount));
  addDoc(col(currentUser.uid,'transactions'),{type,cat:state.cat,desc,amount,date,walletId,createdAt:serverTimestamp()})
    .then(()=>{if(type==='expense')checkBudgetWarning(date);})
    .catch(e=>{console.error(e);toast('⚠️ Không lưu được: '+e.code,'danger');});
}
async function removeTx(id){
  if(!currentUser)return;
  try{await deleteDoc(doc(db,'users',currentUser.uid,'transactions',id));toast('🗑️ Đã xoá giao dịch');}
  catch(e){console.error(e);toast('⚠️ Xoá thất bại','danger');}
}

function checkBudgetWarning(date){
  if(!state.budget.total||monthKey(date)!==thisMonth())return;
  const spent=monthExpense(thisMonth());const limit=state.budget.total;
  const pct=spent/limit*100;
  if(spent>limit)toast(`🚨 Đã VƯỢT hạn mức tháng! Chi ${fmt(spent)} / ${fmt(limit)}`,'danger');
  else if(pct>=80)toast(`⚠️ Sắp chạm hạn mức: đã dùng ${Math.round(pct)}%`,'warn');
}

/* ===== Render: stats ===== */
function animateNumber(el,to){
  const from=parseFloat(el.dataset.v||0);
  if(from===to){el.textContent=fmt(to);return;}
  el.dataset.v=to;
  const dur=600,start=performance.now();
  function step(now){const p=Math.min((now-start)/dur,1);const e=1-Math.pow(1-p,3);el.textContent=fmt(from+(to-from)*e);if(p<1)requestAnimationFrame(step);}
  requestAnimationFrame(step);
}
function renderStats(){
  const inc=state.txs.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
  const exp=state.txs.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
  const bal=state.wallets.reduce((s,w)=>s+walletBalance(w),0);
  animateNumber($('#balanceVal'),bal);
  animateNumber($('#incomeVal'),inc);
  animateNumber($('#expenseVal'),exp);
  $('#balanceSub').textContent=state.wallets.length+' ví • '+(bal>=0?'✨ ổn định':'⚠️ âm');
  $('#incomeSub').textContent=state.txs.filter(t=>t.type==='income').length+' giao dịch';
  $('#expenseSub').textContent=state.txs.filter(t=>t.type==='expense').length+' giao dịch';
  // per-wallet breakdown
  const inner=$('#walletBreakInner'), toggle=$('#walletToggle');
  if(inner){
    if(!state.wallets.length){
      inner.innerHTML='<div class="hint" style="padding:6px 0">Chưa có ví nào.</div>';
      if(toggle)toggle.style.display='none';
    }else{
      if(toggle)toggle.style.display='';
      const maxAbs=Math.max(1,...state.wallets.map(w=>Math.abs(walletBalance(w))));
      inner.innerHTML=state.wallets.map(w=>{
        const b=walletBalance(w), c=WALLET_COLORS[w.icon]||'#7c5cff', pct=Math.round(Math.abs(b)/maxAbs*100);
        return `<div class="wb-row">
          <div class="wb-ic" style="background:${c}22;color:${c}">${w.icon}</div>
          <div class="wb-info"><div class="wb-name">${escapeHtml(w.name)}</div>
            <div class="wb-bar"><i style="width:${pct}%;background:${c}"></i></div></div>
          <div class="wb-amt" style="color:${b>=0?'#fff':'var(--red)'}">${fmt(b)}</div>
        </div>`;
      }).join('');
    }
  }
}

/* ===== Render: budget banner (dashboard) ===== */
function renderBudgetBanner(){
  const b=$('#budgetBanner');
  if(!state.budget.total){b.style.display='none';return;}
  b.style.display='block';
  const spent=monthExpense(thisMonth());const limit=state.budget.total;
  const pct=Math.min(spent/limit*100,100);const realPct=Math.round(spent/limit*100);
  $('#bgSpent').textContent=fmt(spent);$('#bgLimit').textContent=fmt(limit);
  $('#budgetPct').textContent=realPct+'%';
  const bar=$('#bgBar');bar.className='bg-bar'+(realPct>=100?' over':realPct>=80?' warn':'');
  $('#budgetPct').style.color=realPct>=100?'var(--red)':realPct>=80?'var(--amber)':'var(--green)';
  requestAnimationFrame(()=>{$('#bgFill').style.width=pct+'%';});
}

/* ===== Render: transaction list (filtered, grouped by day, divided by month) ===== */
function renderList(){
  const list=$('#txList');
  const txs=applyFilters();
  if(!txs.length){list.innerHTML=`<div class="empty"><div class="e">🪶</div>Không có giao dịch phù hợp.<br>Thử đổi bộ lọc hoặc thêm giao dịch mới.</div>`;return;}
  // group by month -> day
  const months=[],mMap={};
  txs.forEach(t=>{
    const mk=monthKey(t.date), dk=t.date||'(không ngày)';
    let m=mMap[mk];if(!m){m=mMap[mk]={key:mk,days:[],dMap:{},items:[]};months.push(m);}
    m.items.push(t);
    let d=m.dMap[dk];if(!d){d=m.dMap[dk]={key:dk,items:[]};m.days.push(d);}
    d.items.push(t);
  });
  list.innerHTML='';let idx=0;
  months.forEach(m=>{
    const mNet=m.items.reduce((s,t)=>s+(t.type==='income'?t.amount:t.type==='expense'?-t.amount:0),0);
    const mCol=collapsedMonths.has(m.key);
    const block=document.createElement('div');block.className='month-block';
    const mhdr=document.createElement('div');mhdr.className='month-divider'+(mCol?' collapsed':'');
    mhdr.innerHTML=`<span class="m-caret">▾</span><span class="m-name">${monthLabel(m.key)}</span>`
      +`<span class="m-cnt">${m.items.length} GD</span>`
      +`<span class="m-net ${mNet>=0?'in':'out'}">${mNet>=0?'+':'−'}${fmt(Math.abs(mNet))}</span>`;
    block.appendChild(mhdr);
    const mbody=document.createElement('div');mbody.className='month-body'+(mCol?' collapsed':'');
    const mInner=document.createElement('div');mInner.className='mb-inner';mbody.appendChild(mInner);
    mhdr.onclick=()=>toggleCollapse(collapsedMonths,m.key,mhdr,mbody);
    m.days.forEach(g=>{
      const net=g.items.reduce((s,t)=>s+(t.type==='income'?t.amount:t.type==='expense'?-t.amount:0),0);
      const dh=dayHeaderInfo(g.key);
      const dCol=collapsedDays.has(g.key);
      const hdr=document.createElement('div');hdr.className='month-hdr'+(dCol?' collapsed':'');
      hdr.innerHTML=`<div class="mt"><span class="day-caret">▾</span> ${dh.tag?`<span class="rel">${dh.tag}</span>`:'📅'} <span class="wd">${dh.wd}</span> ${dh.dd} <span class="cnt">${g.items.length} GD</span></div>
        <div class="net ${net>=0?'in':'out'}">${net>=0?'+':'−'}${fmt(Math.abs(net))}</div>`;
      mInner.appendChild(hdr);
      const dayWrap=document.createElement('div');dayWrap.className='day-items'+(dCol?' collapsed':'');
      const inner=document.createElement('div');inner.className='di-inner';dayWrap.appendChild(inner);
      hdr.onclick=()=>toggleCollapse(collapsedDays,g.key,hdr,dayWrap);
      g.items.forEach(t=>{
        const el=document.createElement('div');el.className='tx';el.style.animationDelay=(idx++*0.02)+'s';
        let emo,title,sub,amtCls,amtTxt;
        if(t.type==='transfer'){
          emo='🔄';title=escapeHtml(t.desc)||'Chuyển tiền';
          sub=`${walletName(t.fromWallet)} → ${walletName(t.toWallet)}`;
          amtCls='tr';amtTxt=fmt(t.amount);
        }else{
          const ci=catInfo(t.type,t.cat);emo=ci.emo;title=escapeHtml(t.desc)||ci.name;
          sub=`${ci.name}`;amtCls=t.type==='income'?'in':'out';
          amtTxt=(t.type==='income'?'+':'−')+fmt(t.amount);
        }
        const wtag=t.type!=='transfer'&&t.walletId?`<span class="wtag">${walletName(t.walletId)}</span>`:'';
        el.innerHTML=`<div class="emo">${emo}</div>
          <div class="info"><div class="t">${title}</div><div class="d">${sub} ${wtag}</div></div>
          <div class="amt ${amtCls}">${amtTxt}</div>
          <div class="act"><button class="edit" title="Sửa">✎</button><button class="del" title="Xoá">✕</button></div>`;
        el.querySelector('.edit').onclick=()=>openTxEdit(t);
        el.querySelector('.del').onclick=()=>removeTx(t.id);
        inner.appendChild(el);
      });
      mInner.appendChild(dayWrap);
    });
    block.appendChild(mbody);
    list.appendChild(block);
  });
}
let collapsedDays=new Set(), collapsedMonths=new Set();
function toggleCollapse(set,key,hdr,wrap){
  if(set.has(key)){set.delete(key);hdr.classList.remove('collapsed');wrap.classList.remove('collapsed');}
  else{set.add(key);hdr.classList.add('collapsed');wrap.classList.add('collapsed');}
}

/* ===== Render: chart (based on filtered expenses) ===== */
function renderChart(){
  const exp=applyFilters().filter(t=>t.type==='expense');
  const totals={};
  exp.forEach(t=>{const ci=catInfo('expense',t.cat);totals[ci.name]=(totals[ci.name]||0)+t.amount;});
  const labels=Object.keys(totals),data=Object.values(totals);
  const total=data.reduce((a,b)=>a+b,0);
  $('#chartTotal').textContent=fmt(total);
  const anyFilter=state.filter.q||state.filter.type!=='all'||state.filter.cat!=='all'||state.filter.wallet!=='all'||state.filter.from||state.filter.to;
  $('#chartScope').textContent=anyFilter?'theo bộ lọc':'tất cả';
  const legend=$('#legend');legend.innerHTML='';
  labels.forEach((l,i)=>{const pc=total?Math.round(data[i]/total*100):0;
    const el=document.createElement('div');el.className='leg';
    el.innerHTML=`<span class="sw" style="background:${COLORS[i%COLORS.length]}"></span><span class="nm">${l}</span><span class="pc">${pc}%</span>`;
    legend.appendChild(el);});
  if(!labels.length)legend.innerHTML='<div style="color:var(--txt-dim);font-size:13px;text-align:center;padding:8px">Chưa có chi tiêu để phân tích</div>';
  const cfg={type:'doughnut',data:{labels,datasets:[{data,backgroundColor:COLORS,borderWidth:0,hoverOffset:10,borderRadius:6,spacing:2}]},
    options:{cutout:'72%',plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>` ${c.label}: ${fmt(c.raw)}`},backgroundColor:'rgba(20,26,53,.95)',padding:12,cornerRadius:10,titleColor:'#fff',bodyColor:'#cfd6f5'}},animation:{animateScale:true,animateRotate:true,duration:700}}};
  if(chart){chart.data=cfg.data;chart.update('none');}else chart=new Chart($('#chart'),cfg);
}

/* ===== Render: wallets ===== */
function renderWallets(){
  const grid=$('#walletGrid');grid.innerHTML='';
  if(!state.wallets.length){grid.innerHTML='<div class="hint">Chưa có ví nào. Tạo ví đầu tiên bên dưới.</div>';}
  state.wallets.forEach(w=>{
    const bal=walletBalance(w);const c=WALLET_COLORS[w.icon]||'#7c5cff';
    const el=document.createElement('div');el.className='glass wallet';
    el.innerHTML=`<div class="wglow" style="background:${c}"></div>
      <button class="wedit" title="Sửa ví">✎</button>
      <button class="wdel" title="Xoá ví">✕</button>
      <div class="wic" style="background:${c}22;color:${c}">${w.icon}</div>
      <div class="wn">${escapeHtml(w.name)}</div>
      <div class="wb" style="color:${bal>=0?'#fff':'var(--red)'}">${fmt(bal)}</div>`;
    el.querySelector('.wedit').onclick=()=>openWalletEdit(w);
    el.querySelector('.wdel').onclick=()=>removeWallet(w);
    grid.appendChild(el);
  });
  // populate wallet selectors
  const opts=state.wallets.map(w=>`<option value="${w.id}">${w.icon} ${escapeHtml(w.name)}</option>`).join('');
  ['#walletInput','#recWallet','#trFrom','#trTo','#etWallet','#etFrom','#etTo'].forEach(sel=>{
    const e=$(sel);if(!e)return;const cur=e.value;e.innerHTML=opts;
    if([...e.options].some(o=>o.value===cur))e.value=cur;
  });
  if(state.wallets.length>1)$('#trTo').selectedIndex=1;
  // wallet filter dropdown
  const wf=$('#walletFilter');const curWf=wf.value;
  wf.innerHTML='<option value="all">Tất cả ví</option>'+opts;wf.value=curWf;
}
async function removeWallet(w){
  const ok=await confirmDialog(`Xoá ví "${w.name}"? Giao dịch cũ vẫn còn nhưng sẽ không thuộc ví nào.`,{title:'🗑️ Xoá ví'});
  if(!ok)return;
  try{await deleteDoc(doc(db,'users',currentUser.uid,'wallets',w.id));toast('🗑️ Đã xoá ví');}
  catch(e){console.error(e);toast('⚠️ Xoá thất bại','danger');}
}

/* ----- Edit wallet ----- */
let editWalletId=null, ewIcon='💵';
function renderEwIcons(){
  const wrap=$('#ewIcons');wrap.innerHTML='';
  WALLET_ICONS.forEach(ic=>{const el=document.createElement('div');el.className='cat'+(ic===ewIcon?' sel':'');
    el.innerHTML=`<span class="emo">${ic}</span>`;el.onclick=()=>{ewIcon=ic;renderEwIcons();};wrap.appendChild(el);});
}
function openWalletEdit(w){
  editWalletId=w.id;ewIcon=w.icon||'💵';
  $('#ewName').value=w.name;
  $('#ewInit').value=w.initial?Number(w.initial).toLocaleString('en-US'):'';
  renderEwIcons();$('#walletModal').classList.add('show');
}
async function saveWalletEdit(){
  if(!editWalletId)return;
  const name=$('#ewName').value.trim();const initial=num($('#ewInit').value);
  if(!name){toast('⚠️ Nhập tên ví','warn');shake($('#ewName'));return;}
  try{
    await updateDoc(doc(db,'users',currentUser.uid,'wallets',editWalletId),{name,icon:ewIcon,initial});
    $('#walletModal').classList.remove('show');toast('💾 Đã cập nhật ví');
  }catch(e){console.error(e);toast('⚠️ Cập nhật thất bại','danger');}
}

/* ----- Edit transaction ----- */
let editTxId=null, etType='expense', etCat='food';
function renderEtCats(){buildCats('#etCats',etType,etCat,id=>{etCat=id;renderEtCats();});}
function openTxEdit(t){
  editTxId=t.id;
  const isTr=t.type==='transfer';
  $('#etNormal').style.display=isTr?'none':'';
  $('#etTransfer').style.display=isTr?'':'none';
  $('#etWalletField').style.display=isTr?'none':'';
  $('#etDesc').value=t.desc||'';
  $('#etAmt').value=t.amount?Number(t.amount).toLocaleString('en-US'):'';
  datePicker.set('etDate',t.date||todayISO());
  if(isTr){
    $('#etFrom').value=t.fromWallet||'';$('#etTo').value=t.toWallet||'';
  }else{
    etType=(t.type==='income')?'income':'expense';
    etCat=t.cat||CATS[etType][0].id;
    $('#etSeg').classList.toggle('exp',etType==='income');
    $('#etSeg').querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.type===etType));
    renderEtCats();
    $('#etWallet').value=t.walletId||'';
  }
  syncCsels();
  $('#editTxModal').classList.add('show');
}
async function saveTxEdit(){
  if(!editTxId||!currentUser)return;
  const amount=num($('#etAmt').value);
  if(amount<=0){toast('⚠️ Nhập số tiền hợp lệ','warn');shake($('#etAmt'));return;}
  const date=datePicker.get('etDate')||todayISO();
  const desc=$('#etDesc').value.trim();
  const isTr=$('#etTransfer').style.display!=='none';
  let data;
  if(isTr){
    const from=$('#etFrom').value,to=$('#etTo').value;
    if(!from||!to||from===to){toast('⚠️ Chọn hai ví khác nhau','warn');return;}
    data={amount,date,desc,fromWallet:from,toWallet:to};
  }else{
    data={type:etType,cat:etCat,amount,date,desc,walletId:$('#etWallet').value||''};
  }
  try{
    await updateDoc(doc(db,'users',currentUser.uid,'transactions',editTxId),data);
    $('#editTxModal').classList.remove('show');toast('💾 Đã cập nhật giao dịch');
    if(!isTr&&etType==='expense')checkBudgetWarning(date);
  }catch(e){console.error(e);toast('⚠️ Cập nhật thất bại','danger');}
}

/* ----- Confirm dialog (thay window.confirm) ----- */
let confirmResolver=null;
function confirmDialog(msg,opt){
  opt=opt||{};
  $('#confirmTitle').textContent=opt.title||'Xác nhận';
  $('#confirmMsg').textContent=msg;
  const okBtn=$('#confirmOk');okBtn.textContent=opt.ok||'Xoá';
  okBtn.style.background=opt.danger===false?'':'linear-gradient(135deg,var(--red),#e0476a)';
  $('#confirmModal').classList.add('show');
  return new Promise(res=>{confirmResolver=res;});
}
function resolveConfirm(v){$('#confirmModal').classList.remove('show');if(confirmResolver){confirmResolver(v);confirmResolver=null;}}
async function addWallet(){
  const name=$('#wName').value.trim();const initial=num($('#wInit').value);
  if(!name){toast('⚠️ Nhập tên ví','warn');shake($('#wName'));return;}
  try{
    await addDoc(col(currentUser.uid,'wallets'),{name,icon:state.wIcon,initial,order:state.wallets.length,createdAt:serverTimestamp()});
    $('#wName').value='';$('#wInit').value='';toast('💳 Đã tạo ví '+name);
  }catch(e){console.error(e);toast('⚠️ Không tạo được ví','danger');}
}

/* ===== Transfer ===== */
async function doTransfer(){
  const from=$('#trFrom').value,to=$('#trTo').value;
  const amount=num($('#trAmt').value);const date=datePicker.get('trDate')||todayISO();
  const desc=$('#trDesc').value.trim();
  if(from===to){toast('⚠️ Chọn hai ví khác nhau','warn');return;}
  if(amount<=0){toast('⚠️ Nhập số tiền hợp lệ','warn');shake($('#trAmt'));return;}
  try{
    await addDoc(col(currentUser.uid,'transactions'),{type:'transfer',amount,fromWallet:from,toWallet:to,desc,date,createdAt:serverTimestamp()});
    closeTransfer();toast('🔄 Đã chuyển '+fmt(amount));
  }catch(e){console.error(e);toast('⚠️ Chuyển thất bại','danger');}
}
function openTransfer(){if(state.wallets.length<2){toast('⚠️ Cần ít nhất 2 ví để chuyển','warn');return;}$('#trAmt').value='';$('#trDesc').value='';datePicker.set('trDate',todayISO());$('#transferModal').classList.add('show');}
function closeTransfer(){$('#transferModal').classList.remove('show');}

/* ===== Recurring ===== */
function renderRecurring(){
  const list=$('#recurringList');list.innerHTML='';
  if(!state.recurring.length){list.innerHTML='<div class="hint">Chưa có khoản định kỳ nào.</div>';return;}
  state.recurring.slice().sort((a,b)=>(a.day||1)-(b.day||1)).forEach(r=>{
    const ci=catInfo(r.type,r.cat);
    const el=document.createElement('div');el.className='item-row';
    el.innerHTML=`<div class="emo">${ci.emo}</div>
      <div class="info"><div class="t">${escapeHtml(r.desc)||ci.name}</div>
        <div class="d">${ci.name} • ngày ${r.day||1} hằng tháng • ${walletName(r.walletId)}${r.lastMonth?' • lần cuối '+monthLabel(r.lastMonth):''}</div></div>
      <div class="amt ${r.type==='income'?'in':'out'}">${r.type==='income'?'+':'−'}${fmt(r.amount)}</div>
      <div class="ctl"><div class="switch ${r.active?'on':''}" title="Bật/tắt"></div><button class="del">🗑</button></div>`;
    el.querySelector('.switch').onclick=()=>toggleRecurring(r);
    el.querySelector('.del').onclick=()=>removeRecurring(r);
    list.appendChild(el);
  });
}
async function addRecurring(){
  const desc=$('#recDesc').value.trim();const amount=num($('#recAmt').value);
  const day=parseInt($('#recDay').value,10)||1;const walletId=$('#recWallet').value||'';
  if(amount<=0){toast('⚠️ Nhập số tiền hợp lệ','warn');shake($('#recAmt'));return;}
  try{
    await addDoc(col(currentUser.uid,'recurring'),{type:state.recType,cat:state.recCat,desc,amount,day,walletId,active:true,lastMonth:'',createdAt:serverTimestamp()});
    $('#recDesc').value='';$('#recAmt').value='';toast('🔁 Đã tạo khoản định kỳ');
  }catch(e){console.error(e);toast('⚠️ Không tạo được','danger');}
}
async function toggleRecurring(r){try{await updateDoc(doc(db,'users',currentUser.uid,'recurring',r.id),{active:!r.active});}catch(e){console.error(e);}}
async function removeRecurring(r){const ok=await confirmDialog('Xoá khoản định kỳ này?',{title:'🗑️ Xoá định kỳ'});if(!ok)return;try{await deleteDoc(doc(db,'users',currentUser.uid,'recurring',r.id));toast('🗑️ Đã xoá');}catch(e){console.error(e);}}

/* ===== Budget tab ===== */
function renderBudget(){
  if(document.activeElement!==$('#budgetTotal'))$('#budgetTotal').value=state.budget.total?Number(state.budget.total).toLocaleString('en-US'):'';
  const wrap=$('#catBudgetList');wrap.innerHTML='';
  CATS.expense.forEach(c=>{
    const lim=state.budget.perCat[c.id]||0;const spent=monthExpenseByCat(thisMonth(),c.id);
    const pct=lim?Math.min(spent/lim*100,100):0;const realPct=lim?Math.round(spent/lim*100):0;
    const cls=realPct>=100?'over':realPct>=80?'warn':'';
    const row=document.createElement('div');row.className='budget-cat-row';
    row.innerHTML=`<div style="flex:1">
        <div class="nm">${c.emo} ${c.name} <span style="color:var(--txt-dim);font-weight:500;font-size:12px">(đã chi ${fmt(spent)}${lim?' / '+fmt(lim):''})</span></div>
        <div class="mini-bar"><div class="f ${cls}" style="width:${pct}%"></div></div>
      </div>
      <input type="text" inputmode="numeric" data-cat="${c.id}" placeholder="∞" value="${lim?Number(lim).toLocaleString('en-US'):''}" />`;
    const inp=row.querySelector('input');attachThousands(inp);
    inp.addEventListener('change',()=>saveCatBudget(c.id,num(inp.value)));
    wrap.appendChild(row);
  });
}
async function saveBudgetTotal(){
  const total=num($('#budgetTotal').value);
  try{await setDoc(doc(db,'users',currentUser.uid,'settings','budget'),{total},{merge:true});toast('💾 Đã lưu hạn mức tháng');}
  catch(e){console.error(e);toast('⚠️ Lưu thất bại','danger');}
}
async function saveCatBudget(catId,val){
  try{await setDoc(doc(db,'users',currentUser.uid,'settings','budget'),{perCat:{[catId]:val}},{merge:true});toast('💾 Đã lưu hạn mức danh mục');}
  catch(e){console.error(e);}
}

/* ===== Category UI builders ===== */
function buildCats(wrapSel,type,selId,onPick){
  const wrap=$(wrapSel);wrap.innerHTML='';
  CATS[type].forEach((c,i)=>{
    const el=document.createElement('div');el.className='cat'+(c.id===selId?' sel':'');
    el.innerHTML=`<span class="emo">${c.emo}</span>${c.name}`;
    el.onclick=()=>onPick(c.id);el.style.animation=`pop .3s ${i*0.03}s both`;
    wrap.appendChild(el);
  });
}
function renderFormCats(){buildCats('#cats',state.txType,state.cat,id=>{state.cat=id;renderFormCats();});}
function renderRecCats(){buildCats('#recCats',state.recType,state.recCat,id=>{state.recCat=id;renderRecCats();});}
function renderWalletIcons(){
  const wrap=$('#wIcons');wrap.innerHTML='';
  WALLET_ICONS.forEach(ic=>{
    const el=document.createElement('div');el.className='cat'+(ic===state.wIcon?' sel':'');
    el.innerHTML=`<span class="emo">${ic}</span>`;
    el.onclick=()=>{state.wIcon=ic;renderWalletIcons();};
    wrap.appendChild(el);
  });
}
function renderCatFilterOptions(){
  const sel=$('#catFilter');const cur=sel.value;
  const all=[...new Map([...CATS.expense,...CATS.income].map(c=>[c.id,c])).values()];
  sel.innerHTML='<option value="all">Tất cả danh mục</option>'+all.map(c=>`<option value="${c.id}">${c.emo} ${c.name}</option>`).join('');
  sel.value=cur||'all';
}

function renderAll(){renderStats();renderWallets();renderList();renderChart();renderBudgetBanner();syncCsels();}

function shake(el){el.style.animation='none';el.offsetHeight;el.style.animation='shake .4s';el.style.borderColor='var(--red)';setTimeout(()=>el.style.borderColor='',500);}

/* ===== CSV export ===== */
function exportCSV(){
  const txs=applyFilters();
  if(!txs.length){toast('Không có dữ liệu để xuất','warn');return;}
  const head=['Ngày','Loại','Danh mục','Mô tả','Ví / Chuyển','Số tiền'];
  const typeLabel={income:'Thu',expense:'Chi',transfer:'Chuyển ví'};
  const rows=txs.map(t=>{
    let cat='',wallet='';
    if(t.type==='transfer'){cat='Chuyển tiền';wallet=`${walletName(t.fromWallet)} → ${walletName(t.toWallet)}`;}
    else{cat=catInfo(t.type,t.cat).name;wallet=walletName(t.walletId);}
    const amt=(t.type==='expense'?'-':t.type==='income'?'+':'')+t.amount;
    return [t.date,typeLabel[t.type]||t.type,cat,(t.desc||''),wallet,amt];
  });
  const esc=v=>{v=String(v);return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;};
  const csv=[head,...rows].map(r=>r.map(esc).join(',')).join('\n');
  const blob=new Blob(['﻿'+csv],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob);const a=document.createElement('a');
  a.href=url;a.download=`vi-thong-minh_${todayISO()}.csv`;a.click();
  URL.revokeObjectURL(url);toast('⬇ Đã xuất '+txs.length+' giao dịch');
}

/* ===================== UI WIRING ===================== */
$('#dateInput').dataset.iso=todayISO();$('#trDate').dataset.iso=todayISO();
function placeWalletPop(){
  const btn=$('#walletToggle'),pop=$('#walletBreakdown');if(!pop.classList.contains('open'))return;
  const r=btn.getBoundingClientRect(),w=300,vw=document.documentElement.clientWidth;
  let left=r.left;if(left+w>vw-10)left=vw-w-10;if(left<10)left=10;
  pop.style.left=left+'px';pop.style.top=(r.bottom+8)+'px';
}
function closeWalletPop(){$('#walletToggle').classList.remove('open');$('#walletBreakdown').classList.remove('open');}
$('#walletToggle').onclick=e=>{
  e.stopPropagation();
  const open=$('#walletToggle').classList.toggle('open');
  $('#walletBreakdown').classList.toggle('open',open);
  if(open)placeWalletPop();
};
document.addEventListener('click',e=>{const pop=$('#walletBreakdown');if(pop.classList.contains('open')&&!pop.contains(e.target)&&e.target!==$('#walletToggle'))closeWalletPop();});
window.addEventListener('resize',closeWalletPop);
window.addEventListener('scroll',()=>{if($('#walletBreakdown').classList.contains('open'))placeWalletPop();},true);

// Theme picker
function placeThemePop(){
  const btn=$('#themeBtn'),pop=$('#themePop');if(!pop.classList.contains('open'))return;
  const r=btn.getBoundingClientRect(),w=248,vw=document.documentElement.clientWidth;
  let left=r.right-w;if(left+w>vw-10)left=vw-w-10;if(left<10)left=10;
  pop.style.left=left+'px';pop.style.top=(r.bottom+8)+'px';
}
function closeThemePop(){$('#themePop').classList.remove('open');}
$('#themeBtn').onclick=e=>{e.stopPropagation();const open=$('#themePop').classList.toggle('open');if(open){buildThemeGrid();placeThemePop();}};
document.addEventListener('click',e=>{const p=$('#themePop'),b=$('#themeBtn');if(p.classList.contains('open')&&!p.contains(e.target)&&!b.contains(e.target))closeThemePop();});
window.addEventListener('resize',closeThemePop);
window.addEventListener('scroll',()=>{if($('#themePop').classList.contains('open'))placeThemePop();},true);
buildThemeGrid();
for(let d=1;d<=28;d++){const o=document.createElement('option');o.value=d;o.textContent='Ngày '+d;$('#recDay').appendChild(o);}
attachThousands($('#amtInput'));attachThousands($('#wInit'));attachThousands($('#recAmt'));attachThousands($('#trAmt'));attachThousands($('#budgetTotal'));
renderFormCats();renderRecCats();renderWalletIcons();renderCatFilterOptions();
document.querySelectorAll('.field select').forEach(enhanceSelect);syncCsels();

// Tabs
function activateTab(name){
  const btn=$(`#tabs button[data-tab="${name}"]`);
  if(!btn)name='dash';
  state.tab=name;
  localStorage.setItem('vtm_tab',name);
  $$('#tabs button').forEach(x=>x.classList.toggle('on',x.dataset.tab===name));
  $$('.tab-page').forEach(p=>p.classList.remove('on'));$('#page-'+name).classList.add('on');
  if(name==='budget')renderBudget();
}
$$('#tabs button').forEach(b=>b.onclick=()=>activateTab(b.dataset.tab));
// Khôi phục tab đã xem trước khi F5
activateTab(localStorage.getItem('vtm_tab')||'dash');

// Form type segment
$('#seg').querySelectorAll('button').forEach(b=>b.onclick=()=>{
  state.txType=b.dataset.type;state.cat=CATS[state.txType][0].id;
  $('#seg').querySelectorAll('button').forEach(x=>x.classList.remove('active'));b.classList.add('active');
  $('#seg').classList.toggle('exp',state.txType==='income');renderFormCats();
});
// Recurring type segment
$('#recSeg').querySelectorAll('button').forEach(b=>b.onclick=()=>{
  state.recType=b.dataset.type;state.recCat=CATS[state.recType][0].id;
  $('#recSeg').querySelectorAll('button').forEach(x=>x.classList.remove('active'));b.classList.add('active');
  $('#recSeg').classList.toggle('exp',state.recType==='income');renderRecCats();
});

// Filters
let searchTm;
$('#searchInput').addEventListener('input',e=>{
  const v=e.target.value.trim();
  clearTimeout(searchTm);
  searchTm=setTimeout(()=>{state.filter.q=v;renderList();renderChart();},140);
});
$('#typeChips').querySelectorAll('button').forEach(b=>b.onclick=()=>{
  state.filter.type=b.dataset.f;$('#typeChips').querySelectorAll('button').forEach(x=>x.classList.remove('on'));b.classList.add('on');renderList();renderChart();
});
$('#catFilter').addEventListener('change',e=>{state.filter.cat=e.target.value;renderList();renderChart();});
$('#walletFilter').addEventListener('change',e=>{state.filter.wallet=e.target.value;renderList();renderChart();});
// Custom date pickers (fromDate/toDate update filter live)
datePicker.attach($('#fromDate'),iso=>{state.filter.from=iso;clearDatePresets();renderList();renderChart();});
datePicker.attach($('#toDate'),iso=>{state.filter.to=iso;clearDatePresets();renderList();renderChart();});
datePicker.attach($('#dateInput'));
datePicker.attach($('#trDate'));

// Date range presets (chips)
function rangeFor(key){
  const now=new Date();const y=now.getFullYear(),m=now.getMonth();
  switch(key){
    case 'today':return [isoOf(now),isoOf(now)];
    case '7d':{const f=new Date(now);f.setDate(f.getDate()-6);return [isoOf(f),isoOf(now)];}
    case '30d':{const f=new Date(now);f.setDate(f.getDate()-29);return [isoOf(f),isoOf(now)];}
    case 'month':return [isoOf(new Date(y,m,1)),isoOf(new Date(y,m+1,0))];
    case 'lastmonth':return [isoOf(new Date(y,m-1,1)),isoOf(new Date(y,m,0))];
    case 'year':return [isoOf(new Date(y,0,1)),isoOf(new Date(y,11,31))];
  }
  return ['',''];
}
function clearDatePresets(){$('#datePresets').querySelectorAll('button').forEach(x=>x.classList.remove('on'));}
$('#datePresets').querySelectorAll('button').forEach(b=>b.onclick=()=>{
  const wasOn=b.classList.contains('on');
  clearDatePresets();
  if(wasOn){state.filter.from='';state.filter.to='';datePicker.set('fromDate','');datePicker.set('toDate','');}
  else{const [f,t]=rangeFor(b.dataset.range);b.classList.add('on');state.filter.from=f;state.filter.to=t;datePicker.set('fromDate',f);datePicker.set('toDate',t);}
  renderList();renderChart();
});
$('#clearFilter').onclick=()=>{
  state.filter={q:'',type:'all',cat:'all',wallet:'all',from:'',to:''};
  $('#searchInput').value='';$('#catFilter').value='all';$('#walletFilter').value='all';datePicker.set('fromDate','');datePicker.set('toDate','');
  $('#typeChips').querySelectorAll('button').forEach(x=>x.classList.remove('on'));$('#typeChips').querySelector('[data-f=all]').classList.add('on');
  clearDatePresets();syncCsels();
  renderList();renderChart();
};
$('#exportBtn').onclick=exportCSV;

// Add transaction (with ripple)
$('#addBtn').onclick=function(e){
  const r=document.createElement('span');r.className='ripple';const rect=this.getBoundingClientRect();const d=Math.max(rect.width,rect.height);
  r.style.width=r.style.height=d+'px';r.style.left=(e.clientX-rect.left-d/2)+'px';r.style.top=(e.clientY-rect.top-d/2)+'px';
  this.appendChild(r);setTimeout(()=>r.remove(),600);addTx();
};
$('#amtInput').addEventListener('keydown',e=>{if(e.key==='Enter')$('#addBtn').click();});
$('#descInput').addEventListener('keydown',e=>{if(e.key==='Enter')$('#amtInput').focus();});

// Wallets
$('#addWalletBtn').onclick=addWallet;
$('#transferBtn').onclick=openTransfer;
$('#trCancel').onclick=closeTransfer;
$('#trConfirm').onclick=doTransfer;
$('#transferModal').addEventListener('click',e=>{if(e.target===$('#transferModal'))closeTransfer();});

// Edit wallet modal
attachThousands($('#ewInit'));
$('#ewCancel').onclick=()=>$('#walletModal').classList.remove('show');
$('#ewSave').onclick=saveWalletEdit;
$('#walletModal').addEventListener('click',e=>{if(e.target===$('#walletModal'))$('#walletModal').classList.remove('show');});

// Edit transaction modal
attachThousands($('#etAmt'));datePicker.attach($('#etDate'));
$('#etSeg').querySelectorAll('button').forEach(b=>b.onclick=()=>{
  etType=b.dataset.type;etCat=CATS[etType][0].id;
  $('#etSeg').querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));
  $('#etSeg').classList.toggle('exp',etType==='income');renderEtCats();
});
$('#etCancel').onclick=()=>$('#editTxModal').classList.remove('show');
$('#etSave').onclick=saveTxEdit;
$('#editTxModal').addEventListener('click',e=>{if(e.target===$('#editTxModal'))$('#editTxModal').classList.remove('show');});

// Collapse / expand all months
$('#collapseAll').onclick=()=>{
  const keys=[...new Set(applyFilters().map(t=>monthKey(t.date)))];
  const allCollapsed=keys.length&&keys.every(k=>collapsedMonths.has(k));
  if(allCollapsed)collapsedMonths.clear();else keys.forEach(k=>collapsedMonths.add(k));
  $('#collapseAll').innerHTML=allCollapsed?'⊟ Thu gọn':'⊞ Mở rộng';
  renderList();
};

// Confirm modal
$('#confirmCancel').onclick=()=>resolveConfirm(false);
$('#confirmOk').onclick=()=>resolveConfirm(true);
$('#confirmModal').addEventListener('click',e=>{if(e.target===$('#confirmModal'))resolveConfirm(false);});

// Recurring
$('#addRecBtn').onclick=addRecurring;

// Budget
$('#saveBudgetBtn').onclick=saveBudgetTotal;

// Logout
$('#logoutBtn').onclick=()=>{if(auth)signOut(auth);};

/* ===== Auth UI ===== */
let signupMode=false;
const errMap={
  'auth/invalid-email':'Email không hợp lệ','auth/user-not-found':'Tài khoản không tồn tại',
  'auth/wrong-password':'Sai mật khẩu','auth/invalid-credential':'Email hoặc mật khẩu không đúng',
  'auth/email-already-in-use':'Email đã được đăng ký','auth/weak-password':'Mật khẩu quá yếu (tối thiểu 6 ký tự)',
  'auth/popup-closed-by-user':'Bạn đã đóng cửa sổ đăng nhập','auth/operation-not-allowed':'Phương thức này chưa được bật trong Firebase',
  'auth/unauthorized-domain':'Tên miền chưa được cho phép trong Firebase Auth',
};
function authError(e){$('#authErr').textContent='⚠️ '+(errMap[e.code]||e.message||'Đã xảy ra lỗi');}
function toggleAuthMode(){
  signupMode=!signupMode;
  $('#authTitle').textContent=signupMode?'Tạo tài khoản mới':'Chào mừng trở lại';
  $('#authSub').textContent=signupMode?'Đăng ký để bắt đầu quản lý chi tiêu':'Đăng nhập để đồng bộ chi tiêu trên mọi thiết bị';
  $('#authSubmit').textContent=signupMode?'Đăng ký':'Đăng nhập';
  $('#authToggle').innerHTML=signupMode?'Đã có tài khoản? <a id="toggleLink">Đăng nhập</a>':'Chưa có tài khoản? <a id="toggleLink">Đăng ký ngay</a>';
  $('#toggleLink').onclick=toggleAuthMode;$('#authErr').textContent='';
}
$('#toggleLink').onclick=toggleAuthMode;
$('#authForm').addEventListener('submit',async e=>{
  e.preventDefault();if(!auth)return;
  const email=$('#email').value.trim(),pw=$('#password').value;const btn=$('#authSubmit');btn.disabled=true;$('#authErr').textContent='';
  try{if(signupMode)await createUserWithEmailAndPassword(auth,email,pw);else await signInWithEmailAndPassword(auth,email,pw);}
  catch(err){authError(err);}finally{btn.disabled=false;}
});
$('#googleBtn').onclick=async()=>{if(!auth)return;$('#authErr').textContent='';try{await signInWithPopup(auth,new GoogleAuthProvider());}catch(err){authError(err);}};
