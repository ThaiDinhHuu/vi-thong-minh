// ===== Logic giao diện + sự kiện (điểm vào của app) =====
import { S, state, DEFAULT_CATS, CAT_EMOJIS, GOAL_ICONS, WALLET_ICONS, WALLET_COLORS, COLORS } from './store.js';
import { t, I18N, wdShortNames } from './i18n.js';
import { $, $$, fmt, num, escapeHtml, todayISO, isoOf, fmtDate, monthKey, monthLabel, thisMonth,
  dayHeaderInfo, catName, catInfo, walletName, walletBalance, goalSaved, debtBalance, debtOutstanding,
  monthExpense, monthExpenseByCat, applyFilters, toast, show, hide, shake, attachThousands, animateNumber } from './util.js';
import { datePicker, enhanceSelect, syncCsels, buildThemeGrid, confirmDialog, resolveConfirm } from './widgets.js';
import { firebaseConfig, initializeApp, getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup,
  createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, sendPasswordResetEmail,
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
  collection, doc, onSnapshot, addDoc, deleteDoc, updateDoc, setDoc, serverTimestamp } from './firebase.js';

let chart, barChart, db, auth, currentUser=null;
let unsubs=[];
let recurringBusy=false, walletsLoaded=false, recurringLoaded=false;

/* ===== Apply language ===== */
function applyLang(){
  document.documentElement.lang=S.lang;
  paintLangSeg();
  $('#themeBtn').title=t('nav.themeTitle');
  $('#collapseAll').title=t('list.collapseTitle');
  $$('[data-i18n]').forEach(el=>{el.textContent=t(el.getAttribute('data-i18n'));});
  $$('[data-i18n-html]').forEach(el=>{el.innerHTML=t(el.getAttribute('data-i18n-html'));});
  $$('[data-i18n-ph]').forEach(el=>{el.placeholder=t(el.getAttribute('data-i18n-ph'));});
  buildRecDayOptions();
  buildBillDayOptions();fillBillCatOptions();
  renderCatFilterOptions();
  buildThemeGrid();
  setAuthTexts();
  renderFormCats();renderRecCats();renderEtCats();
  updateCollapseAllLabel();
  renderAll();renderRecurring();renderBudget();renderCategoryManage();renderSavings();renderDebts();renderBills();
  updateNotifyBtn();
  syncCsels();
}
function setLang(l){S.lang=l;localStorage.setItem('vtm_lang',l);applyLang();}

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
      unsubs.forEach(u=>u&&u());unsubs=[];recurringBusy=false;walletsLoaded=false;recurringLoaded=false;
      state.txs=[];state.wallets=[];state.recurring=[];state.goals=[];state.debts=[];state.bills=[];state.budget={total:0,perCat:{}};
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
  unsubs.push(onSnapshot(col(uid,'categories'),snap=>{
    if(!snap.size && !localStorage.getItem('seeded_cats_'+uid)){seedCats(uid);return;}
    const ex=[],inc=[];
    snap.docs.forEach(d=>{const data=d.data();const c={docId:d.id,...data,id:data.cid||d.id};(c.type==='income'?inc:ex).push(c);});
    ex.sort((a,b)=>(a.order||0)-(b.order||0));inc.sort((a,b)=>(a.order||0)-(b.order||0));
    S.CATS={expense:ex,income:inc};
    normalizeCatSelections();
    refreshCatUI();
  },err=>console.error(err)));
  unsubs.push(onSnapshot(col(uid,'wallets'),snap=>{
    state.wallets=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(a.order||0)-(b.order||0));
    if(!snap.size && !localStorage.getItem('seeded_wallets_'+uid)){seedWallets(uid);}
    walletsLoaded=true;
    renderAll();maybeRunRecurring();
  },err=>toast(t('toast.errWallet',{code:err.code}),'danger')));

  unsubs.push(onSnapshot(col(uid,'transactions'),snap=>{
    state.txs=snap.docs.map(d=>({id:d.id,...d.data()}));
    state.txs.sort((a,b)=>{
      if(a.date!==b.date)return (b.date||'').localeCompare(a.date||'');
      const ta=a.createdAt&&a.createdAt.seconds||0, tb=b.createdAt&&b.createdAt.seconds||0;return tb-ta;
    });
    renderAll();
  },err=>toast(t('toast.errLoad',{code:err.code}),'danger')));

  unsubs.push(onSnapshot(col(uid,'recurring'),snap=>{
    state.recurring=snap.docs.map(d=>({id:d.id,...d.data()}));
    recurringLoaded=true;
    renderRecurring();maybeRunRecurring();
  }));

  unsubs.push(onSnapshot(col(uid,'goals'),snap=>{
    state.goals=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(a.order||0)-(b.order||0));
    renderSavings();renderStats();renderList();
  },err=>console.error(err)));

  unsubs.push(onSnapshot(col(uid,'debts'),snap=>{
    state.debts=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(a.order||0)-(b.order||0));
    renderDebts();renderStats();renderList();
  },err=>console.error(err)));

  unsubs.push(onSnapshot(col(uid,'bills'),snap=>{
    state.bills=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(a.day||1)-(b.day||1));
    renderBills();renderBillBanner();
  },err=>console.error(err)));

  unsubs.push(onSnapshot(doc(db,'users',uid,'settings','budget'),snap=>{
    const d=snap.data()||{};state.budget={total:d.total||0,perCat:d.perCat||{},period:d.period||'month'};
    renderBudget();renderBudgetBanner();
  }));
}

async function seedWallets(uid){
  localStorage.setItem('seeded_wallets_'+uid,'1');
  const defs=S.lang==='en'
    ?[{name:'Cash',icon:'💵',initial:0,order:0},{name:'ATM',icon:'🏦',initial:0,order:1},{name:'Credit Card',icon:'💳',initial:0,order:2}]
    :[{name:'Tiền mặt',icon:'💵',initial:0,order:0},{name:'ATM',icon:'🏦',initial:0,order:1},{name:'Thẻ tín dụng',icon:'💳',initial:0,order:2}];
  for(const w of defs){try{await addDoc(col(uid,'wallets'),{...w,createdAt:serverTimestamp()});}catch(e){console.error(e);}}
}

/* ===== Categories: seed defaults + helpers ===== */
async function seedCats(uid){
  localStorage.setItem('seeded_cats_'+uid,'1');
  let order=0;
  for(const c of DEFAULT_CATS.expense){try{await setDoc(doc(db,'users',uid,'categories','expense_'+c.id),{type:'expense',cid:c.id,vi:c.vi,en:c.en,emo:c.emo,order:order++});}catch(e){console.error(e);}}
  order=0;
  for(const c of DEFAULT_CATS.income){try{await setDoc(doc(db,'users',uid,'categories','income_'+c.id),{type:'income',cid:c.id,vi:c.vi,en:c.en,emo:c.emo,order:order++});}catch(e){console.error(e);}}
}
function normalizeCatSelections(){
  const ensure=(type,cur)=>{const list=S.CATS[type]||[];return list.some(c=>c.id===cur)?cur:(list[0]?list[0].id:'');};
  state.cat=ensure(state.txType,state.cat);
  state.recCat=ensure(state.recType,state.recCat);
  etCat=ensure(etType,etCat);
}
function refreshCatUI(){
  renderFormCats();renderRecCats();renderEtCats();
  renderCatFilterOptions();renderBudget();renderCategoryManage();
  renderList();renderChart();syncCsels();
}

/* ===== Recurring auto-run ===== */
async function maybeRunRecurring(){
  // Chỉ chạy khi CẢ ví và định kỳ đã tải xong (tránh bật cờ sai khi dữ liệu chưa về đủ).
  if(recurringBusy||!currentUser||!walletsLoaded||!recurringLoaded||!state.wallets.length)return;
  recurringBusy=true; // chống chạy chồng; việc chống ghi trùng do trường lastMonth đảm nhiệm
  try{
    const ym=thisMonth(); const today=parseInt(todayISO().slice(8,10),10);
    for(const r of state.recurring){
      if(!r.active)continue;
      if((r.lastMonth||'')>=ym)continue;
      if((r.day||1)>today)continue;
      const dd=String(Math.min(r.day||1,28)).padStart(2,'0');
      try{
        await addDoc(col(currentUser.uid,'transactions'),{
          type:r.type,cat:r.cat,desc:(r.desc||'')+t('rec.suffix'),amount:r.amount,
          date:`${ym}-${dd}`,walletId:r.walletId||'',createdAt:serverTimestamp()
        });
        await updateDoc(doc(db,'users',currentUser.uid,'recurring',r.id),{lastMonth:ym});
        toast(t('toast.autoLogged',{desc:escapeHtml(r.desc)}));
      }catch(e){console.error(e);}
    }
  }finally{recurringBusy=false;}
}

/* ===== Receipt photos (nén ảnh + lưu data URL vào Firestore) ===== */
let addPhoto=null, etPhoto=null;
function compressImage(file){
  return new Promise((resolve,reject)=>{
    const img=new Image();const url=URL.createObjectURL(file);
    img.onload=()=>{
      URL.revokeObjectURL(url);
      const max=1000;let w=img.naturalWidth||img.width, h=img.naturalHeight||img.height;
      if(w>=h&&w>max){h=Math.round(h*max/w);w=max;}else if(h>w&&h>max){w=Math.round(w*max/h);h=max;}
      const cv=document.createElement('canvas');cv.width=w;cv.height=h;
      cv.getContext('2d').drawImage(img,0,0,w,h);
      let q=0.7,data=cv.toDataURL('image/jpeg',q);
      while(data.length>700000&&q>0.3){q-=0.1;data=cv.toDataURL('image/jpeg',q);}
      resolve(data);
    };
    img.onerror=reject;img.src=url;
  });
}
function showPhoto(prefix,data){
  const thumb=$('#'+prefix+'Thumb'),btn=$('#'+prefix+'Btn'),img=$('#'+prefix+'Img');
  if(!thumb)return;
  if(data){img.src=data;thumb.style.display='';btn.style.display='none';}
  else{img.src='';thumb.style.display='none';btn.style.display='';}
}
function openLightbox(src){$('#lightboxImg').src=src;$('#photoLightbox').classList.add('show');}

/* ===== Add / delete transaction ===== */
function addTx(){
  if(!currentUser)return;
  const desc=$('#descInput').value.trim();
  const amount=num($('#amtInput').value);
  const date=datePicker.get('dateInput')||todayISO();
  const walletId=$('#walletInput').value||'';
  if(amount<=0){toast(t('toast.invalidAmount'),'warn');shake($('#amtInput'));return;}
  const type=state.txType;
  const data={type,cat:state.cat,desc,amount,date,walletId,createdAt:serverTimestamp()};
  if(addPhoto)data.photo=addPhoto;
  $('#descInput').value='';$('#amtInput').value='';addPhoto=null;showPhoto('photo',null);
  toast((type==='income'?'📈':'📉')+' '+t('toast.added',{amt:fmt(amount)}));
  addDoc(col(currentUser.uid,'transactions'),data)
    .then(()=>{if(type==='expense')checkBudgetWarning(date);})
    .catch(e=>{console.error(e);toast(t('toast.saveFail',{code:e.code}),'danger');});
}
async function removeTx(tr){
  if(!currentUser)return;
  const label=tr.type==='transfer'?t('tx.transfer'):(tr.desc||catInfo(tr.type,tr.cat).name);
  const ok=await confirmDialog(t('confirm.deleteTxMsg',{name:label}),{title:t('confirm.deleteTxTitle')});
  if(!ok)return;
  try{await deleteDoc(doc(db,'users',currentUser.uid,'transactions',tr.id));toast(t('toast.deletedTx'));}
  catch(e){console.error(e);toast(t('toast.deleteFail'),'danger');}
}

/* Chu kỳ ngân sách: tháng hoặc tuần (Thứ 2 - Chủ Nhật) */
function periodRange(){
  const now=new Date();
  if((state.budget.period||'month')==='week'){
    const day=(now.getDay()+6)%7; // Thứ 2 = 0
    const mon=new Date(now);mon.setDate(now.getDate()-day);
    const sun=new Date(mon);sun.setDate(mon.getDate()+6);
    return [isoOf(mon),isoOf(sun)];
  }
  const y=now.getFullYear(),m=now.getMonth();
  return [isoOf(new Date(y,m,1)),isoOf(new Date(y,m+1,0))];
}
function periodExpense(){const [a,b]=periodRange();return state.txs.filter(tr=>tr.type==='expense'&&(tr.date||'')>=a&&(tr.date||'')<=b).reduce((s,tr)=>s+tr.amount,0);}
function periodExpenseByCat(catId){const [a,b]=periodRange();return state.txs.filter(tr=>tr.type==='expense'&&tr.cat===catId&&(tr.date||'')>=a&&(tr.date||'')<=b).reduce((s,tr)=>s+tr.amount,0);}
function inCurrentPeriod(date){const [a,b]=periodRange();return date>=a&&date<=b;}
function checkBudgetWarning(date){
  if(!state.budget.total||!inCurrentPeriod(date))return;
  const spent=periodExpense();const limit=state.budget.total;
  const pct=spent/limit*100;
  if(spent>limit)toast(t('toast.budgetOver',{spent:fmt(spent),limit:fmt(limit)}),'danger');
  else if(pct>=80)toast(t('toast.budgetNear',{pct:Math.round(pct)}),'warn');
}

/* ===== Render: stats ===== */
function renderStats(){
  const inc=state.txs.filter(tr=>tr.type==='income').reduce((s,tr)=>s+tr.amount,0);
  const exp=state.txs.filter(tr=>tr.type==='expense').reduce((s,tr)=>s+tr.amount,0);
  const walletsTotal=state.wallets.reduce((s,w)=>s+walletBalance(w),0);
  const goalsTotal=state.goals.reduce((s,g)=>s+goalSaved(g.id),0);
  const debtsTotal=state.debts.reduce((s,d)=>s+debtBalance(d.id),0); // lend:+receivable, borrow:-payable
  const bal=walletsTotal+goalsTotal+debtsTotal;
  animateNumber($('#balanceVal'),bal);
  animateNumber($('#incomeVal'),inc);
  animateNumber($('#expenseVal'),exp);
  $('#balanceSub').textContent=t('stat.walletsN',{n:state.wallets.length})+' • '+(bal>=0?t('stat.stable'):t('stat.negative'));
  $('#incomeSub').textContent=t('stat.txCount',{n:state.txs.filter(tr=>tr.type==='income').length});
  $('#expenseSub').textContent=t('stat.txCount',{n:state.txs.filter(tr=>tr.type==='expense').length});
  const inner=$('#walletBreakInner'), toggle=$('#walletToggle');
  if(inner){
    if(!state.wallets.length && !state.goals.length && !state.debts.length){
      inner.innerHTML=`<div class="hint" style="padding:6px 0">${t('stat.noWallets')}</div>`;
      if(toggle)toggle.style.display='none';
    }else{
      if(toggle)toggle.style.display='';
      const maxAbs=Math.max(1,...state.wallets.map(w=>Math.abs(walletBalance(w))),...state.goals.map(g=>Math.abs(goalSaved(g.id))),...state.debts.map(d=>Math.abs(debtBalance(d.id))));
      const row=(emo,name,amt,c)=>`<div class="wb-row">
          <div class="wb-ic" style="background:${c}22;color:${c}">${emo}</div>
          <div class="wb-info"><div class="wb-name">${escapeHtml(name)}</div>
            <div class="wb-bar"><i style="width:${Math.round(Math.abs(amt)/maxAbs*100)}%;background:${c}"></i></div></div>
          <div class="wb-amt" style="color:${amt>=0?'#fff':'var(--red)'}">${fmt(amt)}</div>
        </div>`;
      let html=state.wallets.map(w=>row(w.icon,w.name,walletBalance(w),WALLET_COLORS[w.icon]||'#7c5cff')).join('');
      html+=state.goals.map(g=>row(g.emo,g.name,goalSaved(g.id),'#7c5cff')).join('');
      html+=state.debts.map(d=>row(d.dir==='borrow'?'🔻':'🔺',d.name,debtBalance(d.id),'#94a3b8')).join('');
      inner.innerHTML=html;
    }
  }
}

/* ===== Render: budget banner (dashboard) ===== */
function renderBudgetBanner(){
  const b=$('#budgetBanner');
  if(!state.budget.total){b.style.display='none';return;}
  b.style.display='block';
  $('#budgetBannerTitle').textContent=(state.budget.period==='week')?t('dash.budgetWeek'):t('dash.budgetMonth');
  const spent=periodExpense();const limit=state.budget.total;
  const pct=Math.min(spent/limit*100,100);const realPct=Math.round(spent/limit*100);
  $('#bgSpent').textContent=fmt(spent);$('#bgLimit').textContent=fmt(limit);
  $('#budgetPct').textContent=realPct+'%';
  const bar=$('#bgBar');bar.className='bg-bar'+(realPct>=100?' over':realPct>=80?' warn':'');
  $('#budgetPct').style.color=realPct>=100?'var(--red)':realPct>=80?'var(--amber)':'var(--green)';
  requestAnimationFrame(()=>{$('#bgFill').style.width=pct+'%';});
}

/* ===== Render: transaction list ===== */
let collapsedDays=new Set(), collapsedMonths=new Set(), seenDays=new Set();
function toggleCollapse(set,key,hdr,wrap){
  if(set.has(key)){set.delete(key);hdr.classList.remove('collapsed');wrap.classList.remove('collapsed');}
  else{set.add(key);hdr.classList.add('collapsed');wrap.classList.add('collapsed');}
}
function renderList(){
  const list=$('#txList');
  const txs=applyFilters();
  if(!txs.length){list.innerHTML=`<div class="empty"><div class="e">🪶</div>${t('list.empty')}<br>${t('list.emptyHint')}</div>`;return;}
  const months=[],mMap={};
  txs.forEach(tr=>{
    const mk=monthKey(tr.date), dk=tr.date||'(no date)';
    let m=mMap[mk];if(!m){m=mMap[mk]={key:mk,days:[],dMap:{},items:[]};months.push(m);}
    m.items.push(tr);
    let d=m.dMap[dk];if(!d){d=m.dMap[dk]={key:dk,items:[]};m.days.push(d);}
    d.items.push(tr);
  });
  list.innerHTML='';let idx=0;
  months.forEach(m=>{
    const mNet=m.items.reduce((s,tr)=>s+(tr.type==='income'?tr.amount:tr.type==='expense'?-tr.amount:0),0);
    const mCol=collapsedMonths.has(m.key);
    const block=document.createElement('div');block.className='month-block';
    const mhdr=document.createElement('div');mhdr.className='month-divider'+(mCol?' collapsed':'');
    mhdr.innerHTML=`<span class="m-caret">▾</span><span class="m-name">${monthLabel(m.key)}</span>`
      +`<span class="m-cnt">${m.items.length} ${t('count.txShort')}</span>`
      +`<span class="m-net ${mNet>=0?'in':'out'}">${mNet>=0?'+':'−'}${fmt(Math.abs(mNet))}</span>`;
    block.appendChild(mhdr);
    const mbody=document.createElement('div');mbody.className='month-body'+(mCol?' collapsed':'');
    const mInner=document.createElement('div');mInner.className='mb-inner';mbody.appendChild(mInner);
    mhdr.onclick=()=>toggleCollapse(collapsedMonths,m.key,mhdr,mbody);
    m.days.forEach(g=>{
      const net=g.items.reduce((s,tr)=>s+(tr.type==='income'?tr.amount:tr.type==='expense'?-tr.amount:0),0);
      const dh=dayHeaderInfo(g.key);
      // Mặc định: chỉ ngày hôm nay mở, các ngày khác tự thu gọn (chỉ áp dụng lần đầu thấy ngày đó)
      if(!seenDays.has(g.key)){seenDays.add(g.key);if(g.key!==todayISO())collapsedDays.add(g.key);}
      const dCol=collapsedDays.has(g.key);
      const hdr=document.createElement('div');hdr.className='month-hdr'+(dCol?' collapsed':'');
      hdr.innerHTML=`<div class="mt"><span class="day-caret">▾</span> ${dh.tag?`<span class="rel">${dh.tag}</span>`:'📅'} <span class="wd">${dh.wd}</span> ${dh.dd} <span class="cnt">${g.items.length} ${t('count.txShort')}</span></div>
        <div class="net ${net>=0?'in':'out'}">${net>=0?'+':'−'}${fmt(Math.abs(net))}</div>`;
      mInner.appendChild(hdr);
      const dayWrap=document.createElement('div');dayWrap.className='day-items'+(dCol?' collapsed':'');
      const inner=document.createElement('div');inner.className='di-inner';dayWrap.appendChild(inner);
      hdr.onclick=()=>toggleCollapse(collapsedDays,g.key,hdr,dayWrap);
      g.items.forEach(tr=>{
        const el=document.createElement('div');el.className='tx';el.style.animationDelay=(idx++*0.02)+'s';
        let emo,title,sub,amtCls,amtTxt;
        if(tr.type==='transfer'){
          emo='🔄';title=escapeHtml(tr.desc)||t('tx.transfer');
          sub=`${walletName(tr.fromWallet)} → ${walletName(tr.toWallet)}`;
          amtCls='tr';amtTxt=fmt(tr.amount);
        }else{
          const ci=catInfo(tr.type,tr.cat);emo=ci.emo;title=escapeHtml(tr.desc)||ci.name;
          sub=`${ci.name}`;amtCls=tr.type==='income'?'in':'out';
          amtTxt=(tr.type==='income'?'+':'−')+fmt(tr.amount);
        }
        const wtag=tr.type!=='transfer'&&tr.walletId?`<span class="wtag">${walletName(tr.walletId)}</span>`:'';
        el.innerHTML=`<div class="emo">${emo}</div>
          <div class="info"><div class="t">${title}</div><div class="d">${sub} ${wtag}</div></div>
          <div class="amt ${amtCls}">${amtTxt}</div>
          <div class="act">${tr.photo?`<button class="viewp" title="${t('tt.viewPhoto')}">📎</button>`:''}<button class="edit" title="${t('tt.edit')}">✎</button><button class="del" title="${t('tt.delete')}">✕</button></div>`;
        const vp0=el.querySelector('.viewp');if(vp0)vp0.onclick=()=>openLightbox(tr.photo);
        el.querySelector('.edit').onclick=()=>openTxEdit(tr);
        el.querySelector('.del').onclick=()=>removeTx(tr);
        inner.appendChild(el);
      });
      mInner.appendChild(dayWrap);
    });
    block.appendChild(mbody);
    list.appendChild(block);
  });
}

/* ===== Render: chart ===== */
function renderChart(){
  const exp=applyFilters().filter(tr=>tr.type==='expense');
  const totals={};
  exp.forEach(tr=>{const ci=catInfo('expense',tr.cat);totals[ci.name]=(totals[ci.name]||0)+tr.amount;});
  const labels=Object.keys(totals),data=Object.values(totals);
  const total=data.reduce((a,b)=>a+b,0);
  $('#chartTotal').textContent=fmt(total);
  const anyFilter=state.filter.q||state.filter.type!=='all'||state.filter.cat!=='all'||state.filter.wallet!=='all'||state.filter.from||state.filter.to;
  $('#chartScope').textContent=anyFilter?t('chart.byFilter'):t('chart.all');
  const legend=$('#legend');legend.innerHTML='';
  labels.forEach((l,i)=>{const pc=total?Math.round(data[i]/total*100):0;
    const el=document.createElement('div');el.className='leg';
    el.innerHTML=`<span class="sw" style="background:${COLORS[i%COLORS.length]}"></span><span class="nm">${l}</span><span class="pc">${pc}%</span>`;
    legend.appendChild(el);});
  if(!labels.length)legend.innerHTML=`<div style="color:var(--txt-dim);font-size:13px;text-align:center;padding:8px">${t('chart.noData')}</div>`;
  const cfg={type:'doughnut',data:{labels,datasets:[{data,backgroundColor:COLORS,borderWidth:0,hoverOffset:10,borderRadius:6,spacing:2}]},
    options:{cutout:'72%',plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>` ${c.label}: ${fmt(c.raw)}`},backgroundColor:'rgba(20,26,53,.95)',padding:12,cornerRadius:10,titleColor:'#fff',bodyColor:'#cfd6f5'}},animation:{animateScale:true,animateRotate:true,duration:700}}};
  if(chart){chart.data=cfg.data;chart.update('none');}else chart=new Chart($('#chart'),cfg);
}

/* ===== Render: reports (thu/chi theo tháng + chỉ số nhanh) ===== */
function lastMonths(n){
  const arr=[];const d=new Date();const y=d.getFullYear(),m=d.getMonth();
  for(let i=n-1;i>=0;i--){const dt=new Date(y,m-i,1);arr.push(`${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}`);}
  return arr;
}
function renderReports(){
  if(!$('#barChart'))return;
  const months=lastMonths(6);
  const inc=months.map(mk=>state.txs.filter(tr=>tr.type==='income'&&monthKey(tr.date)===mk).reduce((s,tr)=>s+tr.amount,0));
  const exp=months.map(mk=>monthExpense(mk));
  const labels=months.map(mk=>monthLabel(mk));
  const cfg={type:'bar',data:{labels,datasets:[
    {label:t('chip.income'),data:inc,backgroundColor:'#34e0a1',borderRadius:5,maxBarThickness:20},
    {label:t('chip.expense'),data:exp,backgroundColor:'#ff6b8b',borderRadius:5,maxBarThickness:20}
  ]},options:{maintainAspectRatio:false,plugins:{legend:{display:true,labels:{color:'#cfd6f5',boxWidth:12,font:{size:11}}},
    tooltip:{callbacks:{label:c=>` ${c.dataset.label}: ${fmt(c.raw)}`},backgroundColor:'rgba(20,26,53,.95)',padding:10,cornerRadius:10}},
    scales:{x:{ticks:{color:'#9aa6d6',font:{size:10}},grid:{display:false}},
      y:{ticks:{color:'#9aa6d6',font:{size:10},callback:v=>v>=1e6?(v/1e6)+'M':v>=1e3?Math.round(v/1e3)+'k':v},grid:{color:'rgba(255,255,255,.06)'}}}}};
  if(barChart){barChart.data=cfg.data;barChart.update('none');}else barChart=new Chart($('#barChart'),cfg);
  // chỉ số nhanh
  const ym=thisMonth();const todayD=parseInt(todayISO().slice(8,10),10);
  const daysInMonth=new Date(parseInt(ym.slice(0,4)),parseInt(ym.slice(5,7)),0).getDate();
  const expThis=monthExpense(ym);
  const incThis=state.txs.filter(tr=>tr.type==='income'&&monthKey(tr.date)===ym).reduce((s,tr)=>s+tr.amount,0);
  const avgDay=todayD?expThis/todayD:0, projected=avgDay*daysInMonth;
  const saveRate=incThis>0?Math.round((incThis-expThis)/incThis*100):null;
  let maxI=0;exp.forEach((v,i)=>{if(v>exp[maxI])maxI=i;});
  const stat=(label,val)=>`<div class="rstat"><div class="rl">${label}</div><div class="rv">${val}</div></div>`;
  $('#reportStats').innerHTML=
    stat(t('report.avgDay'),fmt(avgDay))+
    stat(t('report.projected'),fmt(projected))+
    stat(t('report.saveRate'),saveRate==null?'—':saveRate+'%')+
    stat(t('report.topMonth'),exp[maxI]>0?`${labels[maxI]} · ${fmt(exp[maxI])}`:'—');
}

/* ===== Calendar view ===== */
let calMonth=thisMonth(), calSelDay=null;
function calShort(n){n=Math.round(Math.abs(n));if(n>=1e9)return (n/1e9).toFixed(1)+'B';if(n>=1e6)return (n/1e6).toFixed(n>=1e7?0:1)+'M';if(n>=1e3)return Math.round(n/1e3)+'k';return ''+n;}
function calTxRow(tr){
  const el=document.createElement('div');el.className='tx';
  let emo,title,sub,amtCls,amtTxt;
  if(tr.type==='transfer'){emo='🔄';title=escapeHtml(tr.desc)||t('tx.transfer');sub=`${walletName(tr.fromWallet)} → ${walletName(tr.toWallet)}`;amtCls='tr';amtTxt=fmt(tr.amount);}
  else{const ci=catInfo(tr.type,tr.cat);emo=ci.emo;title=escapeHtml(tr.desc)||ci.name;sub=ci.name;amtCls=tr.type==='income'?'in':'out';amtTxt=(tr.type==='income'?'+':'−')+fmt(tr.amount);}
  const wtag=tr.type!=='transfer'&&tr.walletId?`<span class="wtag">${walletName(tr.walletId)}</span>`:'';
  el.innerHTML=`<div class="emo">${emo}</div><div class="info"><div class="t">${title}</div><div class="d">${sub} ${wtag}</div></div><div class="amt ${amtCls}">${amtTxt}</div><div class="act">${tr.photo?`<button class="viewp" title="${t('tt.viewPhoto')}">📎</button>`:''}<button class="edit" title="${t('tt.edit')}">✎</button><button class="del" title="${t('tt.delete')}">✕</button></div>`;
  const vp=el.querySelector('.viewp');if(vp)vp.onclick=()=>openLightbox(tr.photo);
  el.querySelector('.edit').onclick=()=>openTxEdit(tr);
  el.querySelector('.del').onclick=()=>removeTx(tr);
  return el;
}
function renderCalDay(){
  const panel=$('#calDayPanel');if(!panel)return;
  if(!calSelDay){panel.style.display='none';return;}
  panel.style.display='block';
  const dh=dayHeaderInfo(calSelDay);
  $('#calDayTitle').textContent=`${dh.tag?dh.tag+' · ':''}${dh.wd} ${dh.dd}`;
  const items=state.txs.filter(tr=>tr.date===calSelDay);
  const list=$('#calDayList');list.innerHTML='';
  if(!items.length){list.innerHTML=`<div class="hint">${t('cal.noTx')}</div>`;return;}
  items.forEach(tr=>list.appendChild(calTxRow(tr)));
}
function renderCalendar(){
  const grid=$('#calGrid');if(!grid)return;
  const [y,m]=calMonth.split('-').map(Number);
  $('#calTitle').textContent=monthLabel(calMonth);
  const totals={};
  state.txs.forEach(tr=>{if(monthKey(tr.date)!==calMonth)return;const d=parseInt((tr.date||'').slice(8,10),10);if(!d)return;if(!totals[d])totals[d]={inc:0,exp:0};if(tr.type==='income')totals[d].inc+=tr.amount;else if(tr.type==='expense')totals[d].exp+=tr.amount;});
  const first=new Date(y,m-1,1).getDay(), firstMon=(first+6)%7, days=new Date(y,m,0).getDate(), today=todayISO();
  const wd=wdShortNames(), wdMon=[1,2,3,4,5,6,0].map(i=>wd[i]);
  let html=wdMon.map(w=>`<div class="cal-wd">${w}</div>`).join('');
  for(let i=0;i<firstMon;i++)html+='<div class="cal-cell empty"></div>';
  for(let d=1;d<=days;d++){
    const iso=`${calMonth}-${String(d).padStart(2,'0')}`, tot=totals[d];
    let inner=`<div class="cd-num">${d}</div>`;
    if(tot){if(tot.exp)inner+=`<div class="cd-exp">−${calShort(tot.exp)}</div>`;if(tot.inc)inner+=`<div class="cd-inc">+${calShort(tot.inc)}</div>`;}
    html+=`<button class="cal-cell${iso===today?' today':''}${iso===calSelDay?' sel':''}" data-iso="${iso}">${inner}</button>`;
  }
  grid.innerHTML=html;
  grid.querySelectorAll('.cal-cell[data-iso]').forEach(c=>c.onclick=()=>{calSelDay=c.dataset.iso;renderCalendar();});
  renderCalDay();
}
function shiftCalMonth(delta){const [y,m]=calMonth.split('-').map(Number);const d=new Date(y,m-1+delta,1);calMonth=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;calSelDay=null;renderCalendar();}

/* ===== Render: wallets ===== */
function renderWallets(){
  const grid=$('#walletGrid');grid.innerHTML='';
  if(!state.wallets.length){grid.innerHTML=`<div class="hint">${t('wallets.empty')}</div>`;}
  state.wallets.forEach(w=>{
    const bal=walletBalance(w);const c=WALLET_COLORS[w.icon]||'#7c5cff';
    const el=document.createElement('div');el.className='glass wallet';
    el.innerHTML=`<div class="wglow" style="background:${c}"></div>
      <button class="wedit" title="${t('tt.editWallet')}">✎</button>
      <button class="wdel" title="${t('tt.deleteWallet')}">✕</button>
      <div class="wic" style="background:${c}22;color:${c}">${w.icon}</div>
      <div class="wn">${escapeHtml(w.name)}</div>
      <div class="wb" style="color:${bal>=0?'#fff':'var(--red)'}">${fmt(bal)}</div>`;
    el.querySelector('.wedit').onclick=()=>openWalletEdit(w);
    el.querySelector('.wdel').onclick=()=>removeWallet(w);
    grid.appendChild(el);
  });
  const opts=state.wallets.map(w=>`<option value="${w.id}">${w.icon} ${escapeHtml(w.name)}</option>`).join('');
  ['#walletInput','#recWallet','#trFrom','#trTo','#etWallet','#etFrom','#etTo','#gmWallet','#debtWallet','#dmWallet','#billWallet'].forEach(sel=>{
    const e=$(sel);if(!e)return;const cur=e.value;e.innerHTML=opts;
    if([...e.options].some(o=>o.value===cur))e.value=cur;
  });
  if(state.wallets.length>1&&!$('#trTo').value)$('#trTo').selectedIndex=1;
  const wf=$('#walletFilter');const curWf=wf.value;
  wf.innerHTML=`<option value="all">${t('filter.allWallets')}</option>`+opts;wf.value=curWf||'all';
}
async function removeWallet(w){
  const ok=await confirmDialog(t('confirm.deleteWalletMsg',{name:w.name}),{title:t('confirm.deleteWalletTitle')});
  if(!ok)return;
  try{await deleteDoc(doc(db,'users',currentUser.uid,'wallets',w.id));toast(t('toast.walletDeleted'));}
  catch(e){console.error(e);toast(t('toast.deleteFail'),'danger');}
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
  if(!name){toast(t('toast.enterWalletName'),'warn');shake($('#ewName'));return;}
  try{
    await updateDoc(doc(db,'users',currentUser.uid,'wallets',editWalletId),{name,icon:ewIcon,initial});
    $('#walletModal').classList.remove('show');toast(t('toast.walletUpdated'));
  }catch(e){console.error(e);toast(t('toast.updateFail'),'danger');}
}

/* ----- Edit transaction ----- */
let editTxId=null, etType='expense', etCat='food';
function renderEtCats(){buildCats('#etCats',etType,etCat,id=>{etCat=id;renderEtCats();});}
function openTxEdit(tr){
  editTxId=tr.id;
  etPhoto=tr.photo||null;showPhoto('etPhoto',etPhoto);
  const isTr=tr.type==='transfer';
  $('#etNormal').style.display=isTr?'none':'';
  $('#etTransfer').style.display=isTr?'':'none';
  $('#etWalletField').style.display=isTr?'none':'';
  $('#etDesc').value=tr.desc||'';
  $('#etAmt').value=tr.amount?Number(tr.amount).toLocaleString('en-US'):'';
  datePicker.set('etDate',tr.date||todayISO());
  if(isTr){
    $('#etFrom').value=tr.fromWallet||'';$('#etTo').value=tr.toWallet||'';
  }else{
    etType=(tr.type==='income')?'income':'expense';
    etCat=tr.cat||(S.CATS[etType][0]||{}).id||'';
    $('#etSeg').classList.toggle('exp',etType==='income');
    $('#etSeg').querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.type===etType));
    renderEtCats();
    $('#etWallet').value=tr.walletId||'';
  }
  syncCsels();
  $('#editTxModal').classList.add('show');
}
async function saveTxEdit(){
  if(!editTxId||!currentUser)return;
  const amount=num($('#etAmt').value);
  if(amount<=0){toast(t('toast.invalidAmount'),'warn');shake($('#etAmt'));return;}
  const date=datePicker.get('etDate')||todayISO();
  const desc=$('#etDesc').value.trim();
  const isTr=$('#etTransfer').style.display!=='none';
  let data;
  if(isTr){
    const from=$('#etFrom').value,to=$('#etTo').value;
    if(!from||!to||from===to){toast(t('toast.pickTwoWallets'),'warn');return;}
    data={amount,date,desc,fromWallet:from,toWallet:to};
  }else{
    data={type:etType,cat:etCat,amount,date,desc,walletId:$('#etWallet').value||''};
  }
  data.photo=etPhoto||'';
  try{
    await updateDoc(doc(db,'users',currentUser.uid,'transactions',editTxId),data);
    $('#editTxModal').classList.remove('show');toast(t('toast.txUpdated'));
    if(!isTr&&etType==='expense')checkBudgetWarning(date);
  }catch(e){console.error(e);toast(t('toast.updateFail'),'danger');}
}

async function addWallet(){
  const name=$('#wName').value.trim();const initial=num($('#wInit').value);
  if(!name){toast(t('toast.enterWalletName'),'warn');shake($('#wName'));return;}
  try{
    await addDoc(col(currentUser.uid,'wallets'),{name,icon:state.wIcon,initial,order:state.wallets.length,createdAt:serverTimestamp()});
    $('#wName').value='';$('#wInit').value='';toast(t('toast.walletCreated',{name}));
  }catch(e){console.error(e);toast(t('toast.walletCreateFail'),'danger');}
}

/* ===== Transfer ===== */
async function doTransfer(){
  const from=$('#trFrom').value,to=$('#trTo').value;
  const amount=num($('#trAmt').value);const date=datePicker.get('trDate')||todayISO();
  const desc=$('#trDesc').value.trim();
  if(from===to){toast(t('toast.pickTwoWallets'),'warn');return;}
  if(amount<=0){toast(t('toast.invalidAmount'),'warn');shake($('#trAmt'));return;}
  try{
    await addDoc(col(currentUser.uid,'transactions'),{type:'transfer',amount,fromWallet:from,toWallet:to,desc,date,createdAt:serverTimestamp()});
    closeTransfer();toast(t('toast.transferred',{amt:fmt(amount)}));
  }catch(e){console.error(e);toast(t('toast.transferFail'),'danger');}
}
function openTransfer(){if(state.wallets.length<2){toast(t('toast.need2Wallets'),'warn');return;}$('#trAmt').value='';$('#trDesc').value='';datePicker.set('trDate',todayISO());$('#transferModal').classList.add('show');}
function closeTransfer(){$('#transferModal').classList.remove('show');}

/* ===== Recurring ===== */
function renderRecurring(){
  const list=$('#recurringList');list.innerHTML='';
  if(!state.recurring.length){list.innerHTML=`<div class="hint">${t('rec.empty')}</div>`;return;}
  state.recurring.slice().sort((a,b)=>(a.day||1)-(b.day||1)).forEach(r=>{
    const ci=catInfo(r.type,r.cat);
    const el=document.createElement('div');el.className='item-row';
    const meta=`${ci.name} • ${t('rec.monthlyOn',{d:r.day||1})} • ${walletName(r.walletId)}${r.lastMonth?' • '+t('rec.lastRun',{m:monthLabel(r.lastMonth)}):''}`;
    el.innerHTML=`<div class="emo">${ci.emo}</div>
      <div class="info"><div class="t">${escapeHtml(r.desc)||ci.name}</div><div class="d">${meta}</div></div>
      <div class="amt ${r.type==='income'?'in':'out'}">${r.type==='income'?'+':'−'}${fmt(r.amount)}</div>
      <div class="ctl"><div class="switch ${r.active?'on':''}" title="${t('tt.toggle')}"></div><button class="del">🗑</button></div>`;
    el.querySelector('.switch').onclick=()=>toggleRecurring(r);
    el.querySelector('.del').onclick=()=>removeRecurring(r);
    list.appendChild(el);
  });
}
async function addRecurring(){
  const desc=$('#recDesc').value.trim();const amount=num($('#recAmt').value);
  const day=parseInt($('#recDay').value,10)||1;const walletId=$('#recWallet').value||'';
  if(amount<=0){toast(t('toast.invalidAmount'),'warn');shake($('#recAmt'));return;}
  try{
    await addDoc(col(currentUser.uid,'recurring'),{type:state.recType,cat:state.recCat,desc,amount,day,walletId,active:true,lastMonth:'',createdAt:serverTimestamp()});
    $('#recDesc').value='';$('#recAmt').value='';toast(t('toast.recCreated'));
  }catch(e){console.error(e);toast(t('toast.recCreateFail'),'danger');}
}
async function toggleRecurring(r){try{await updateDoc(doc(db,'users',currentUser.uid,'recurring',r.id),{active:!r.active});}catch(e){console.error(e);}}
async function removeRecurring(r){const ok=await confirmDialog(t('confirm.deleteRecMsg'),{title:t('confirm.deleteRecTitle')});if(!ok)return;try{await deleteDoc(doc(db,'users',currentUser.uid,'recurring',r.id));toast(t('toast.deleted'));}catch(e){console.error(e);}}

/* ===== Budget tab ===== */
function renderBudget(){
  const p=state.budget.period||'month';
  const pseg=$('#budgetPeriodSeg');
  if(pseg){pseg.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x.dataset.period===p));pseg.classList.toggle('p2',p==='week');}
  if(document.activeElement!==$('#budgetTotal'))$('#budgetTotal').value=state.budget.total?Number(state.budget.total).toLocaleString('en-US'):'';
  const wrap=$('#catBudgetList');if(!wrap)return;wrap.innerHTML='';
  S.CATS.expense.forEach(c=>{
    const lim=state.budget.perCat[c.id]||0;const spent=periodExpenseByCat(c.id);
    const pct=lim?Math.min(spent/lim*100,100):0;const realPct=lim?Math.round(spent/lim*100):0;
    const cls=realPct>=100?'over':realPct>=80?'warn':'';
    const note=lim?t('budget.spentOfLimit',{spent:fmt(spent),limit:fmt(lim)}):t('budget.spentOf',{spent:fmt(spent)});
    const row=document.createElement('div');row.className='budget-cat-row';
    row.innerHTML=`<div style="flex:1">
        <div class="nm">${c.emo} ${catName(c)} <span style="color:var(--txt-dim);font-weight:500;font-size:12px">${note}</span></div>
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
  try{await setDoc(doc(db,'users',currentUser.uid,'settings','budget'),{total},{merge:true});toast(t('toast.budgetSaved'));}
  catch(e){console.error(e);toast(t('toast.budgetSaveFail'),'danger');}
}
async function saveCatBudget(catId,val){
  try{await setDoc(doc(db,'users',currentUser.uid,'settings','budget'),{perCat:{[catId]:val}},{merge:true});toast(t('toast.catBudgetSaved'));}
  catch(e){console.error(e);}
}

/* ===== Category UI builders ===== */
function buildCats(wrapSel,type,selId,onPick){
  const wrap=$(wrapSel);if(!wrap)return;wrap.innerHTML='';
  S.CATS[type].forEach((c,i)=>{
    const el=document.createElement('div');el.className='cat'+(c.id===selId?' sel':'');
    el.innerHTML=`<span class="emo">${c.emo}</span>${catName(c)}`;
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
  const all=[...new Map([...S.CATS.expense,...S.CATS.income].map(c=>[c.id,c])).values()];
  sel.innerHTML=`<option value="all">${t('filter.allCats')}</option>`+all.map(c=>`<option value="${c.id}">${c.emo} ${catName(c)}</option>`).join('');
  sel.value=cur||'all';
}

/* ===== Category management (add/edit/delete) ===== */
let catModalType='expense', catEditDocId=null, catEmoji='🍜';
function renderCatEmojis(){
  const wrap=$('#catEmojis');if(!wrap)return;wrap.innerHTML='';
  CAT_EMOJIS.forEach(ic=>{const el=document.createElement('div');el.className='cat'+(ic===catEmoji?' sel':'');
    el.innerHTML=`<span class="emo">${ic}</span>`;el.onclick=()=>{catEmoji=ic;renderCatEmojis();};wrap.appendChild(el);});
}
function setCatModalType(type){
  catModalType=type;
  $('#catSeg').querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.type===type));
  $('#catSeg').classList.toggle('exp',type==='income');
}
function openCatAdd(type){
  catEditDocId=null;catEmoji=CAT_EMOJIS[0];
  $('#catModalTitle').textContent=t('cats.addTitle');
  $('#catNameInput').value='';$('#catSeg').style.display='';
  setCatModalType(type);renderCatEmojis();
  $('#catModal').classList.add('show');
  setTimeout(()=>$('#catNameInput').focus(),50);
}
function openCatEdit(c){
  catEditDocId=c.docId;catEmoji=c.emo||CAT_EMOJIS[0];
  $('#catModalTitle').textContent=t('cats.editTitle');
  $('#catNameInput').value=catName(c);$('#catSeg').style.display='none';
  setCatModalType(c.type);renderCatEmojis();
  $('#catModal').classList.add('show');
}
async function saveCat(){
  if(!currentUser)return;
  const name=$('#catNameInput').value.trim();
  if(!name){toast(t('cats.enterName'),'warn');shake($('#catNameInput'));return;}
  try{
    if(catEditDocId){
      await updateDoc(doc(db,'users',currentUser.uid,'categories',catEditDocId),{name,vi:name,en:name,emo:catEmoji});
      toast(t('toast.catUpdated'));
    }else{
      const cid='c'+Date.now().toString(36)+Math.floor(Math.random()*1000);
      const order=(S.CATS[catModalType]||[]).length;
      await addDoc(col(currentUser.uid,'categories'),{type:catModalType,cid,name,emo:catEmoji,order,createdAt:serverTimestamp()});
      toast(t('toast.catCreated'));
    }
    $('#catModal').classList.remove('show');
  }catch(e){console.error(e);toast(t('toast.catSaveFail'),'danger');}
}
async function deleteCat(c){
  const ok=await confirmDialog(t('confirm.deleteCatMsg',{name:catName(c)}),{title:t('confirm.deleteCatTitle')});
  if(!ok)return;
  try{await deleteDoc(doc(db,'users',currentUser.uid,'categories',c.docId));toast(t('toast.catDeleted'));}
  catch(e){console.error(e);toast(t('toast.deleteFail'),'danger');}
}
function renderCategoryManage(){
  ['expense','income'].forEach(type=>{
    const wrap=$(type==='expense'?'#expenseCatList':'#incomeCatList');if(!wrap)return;
    const list=S.CATS[type]||[];
    if(!list.length){wrap.innerHTML=`<div class="hint">${t('cats.empty')}</div>`;return;}
    wrap.innerHTML='';
    list.forEach(c=>{
      const el=document.createElement('div');el.className='item-row';
      el.innerHTML=`<div class="emo">${c.emo}</div>
        <div class="info"><div class="t">${escapeHtml(catName(c))}</div></div>
        <div class="ctl"><button class="edit">✎</button><button class="del">🗑</button></div>`;
      el.querySelector('.edit').onclick=()=>openCatEdit(c);
      el.querySelector('.del').onclick=()=>deleteCat(c);
      wrap.appendChild(el);
    });
  });
}
function buildRecDayOptions(){
  const sel=$('#recDay');const cur=sel.value;sel.innerHTML='';
  for(let d=1;d<=28;d++){const o=document.createElement('option');o.value=d;o.textContent=t('rec.dayLabel',{d});sel.appendChild(o);}
  if(cur)sel.value=cur;
}
function updateCollapseAllLabel(){
  const keys=[...new Set(applyFilters().map(tr=>monthKey(tr.date)))];
  const allCollapsed=keys.length&&keys.every(k=>collapsedMonths.has(k));
  $('#collapseAll').innerHTML=allCollapsed?t('list.expand'):t('list.collapse');
}

/* ===== Savings goals ===== */
let goalEditId=null, goalEmoji='🐷';
function renderGoalEmojis(){
  const wrap=$('#goalEmojis');if(!wrap)return;wrap.innerHTML='';
  GOAL_ICONS.forEach(ic=>{const el=document.createElement('div');el.className='cat'+(ic===goalEmoji?' sel':'');
    el.innerHTML=`<span class="emo">${ic}</span>`;el.onclick=()=>{goalEmoji=ic;renderGoalEmojis();};wrap.appendChild(el);});
}
function renderSavings(){
  const grid=$('#goalGrid');if(!grid)return;grid.innerHTML='';
  if(!state.goals.length){grid.innerHTML=`<div class="hint">${t('savings.empty')}</div>`;return;}
  state.goals.forEach(g=>{
    const saved=goalSaved(g.id), target=g.target||0;
    const pct=target?Math.min(saved/target*100,100):0, realPct=target?Math.round(saved/target*100):0;
    const done=target&&saved>=target;
    const el=document.createElement('div');el.className='glass goal'+(done?' done':'');
    el.innerHTML=`<div class="goal-top">
        <div class="goal-ic">${g.emo}</div>
        <div class="goal-meta"><div class="goal-name">${escapeHtml(g.name)}${done?' ✅':''}</div>
          <div class="goal-sub">${fmt(saved)} / ${fmt(target)}</div></div>
        <div class="goal-actions"><button class="gedit" title="${t('tt.edit')}">✎</button><button class="gdel" title="${t('tt.delete')}">🗑</button></div>
      </div>
      <div class="goal-bar"><i style="width:${pct}%"></i></div>
      <div class="goal-foot"><span class="goal-pct">${realPct}%</span>
        <div class="goal-btns"><button class="gwd">− ${t('savings.withdraw')}</button><button class="gdep btn-grad" style="box-shadow:none">＋ ${t('savings.deposit')}</button></div></div>`;
    el.querySelector('.gedit').onclick=()=>openGoalEdit(g);
    el.querySelector('.gdel').onclick=()=>deleteGoal(g);
    el.querySelector('.gdep').onclick=()=>openGoalMove(g,'deposit');
    el.querySelector('.gwd').onclick=()=>openGoalMove(g,'withdraw');
    grid.appendChild(el);
  });
}
function openGoalAdd(){
  goalEditId=null;goalEmoji=GOAL_ICONS[0];
  $('#goalModalTitle').textContent=t('savings.addTitle');
  $('#goalName').value='';$('#goalTarget').value='';renderGoalEmojis();
  $('#goalModal').classList.add('show');setTimeout(()=>$('#goalName').focus(),50);
}
function openGoalEdit(g){
  goalEditId=g.id;goalEmoji=g.emo||GOAL_ICONS[0];
  $('#goalModalTitle').textContent=t('savings.editTitle');
  $('#goalName').value=g.name;$('#goalTarget').value=g.target?Number(g.target).toLocaleString('en-US'):'';
  renderGoalEmojis();$('#goalModal').classList.add('show');
}
async function saveGoal(){
  if(!currentUser)return;
  const name=$('#goalName').value.trim();const target=num($('#goalTarget').value);
  if(!name){toast(t('savings.enterName'),'warn');shake($('#goalName'));return;}
  if(target<=0){toast(t('savings.enterTarget'),'warn');shake($('#goalTarget'));return;}
  try{
    if(goalEditId)await updateDoc(doc(db,'users',currentUser.uid,'goals',goalEditId),{name,target,emo:goalEmoji});
    else await addDoc(col(currentUser.uid,'goals'),{name,target,emo:goalEmoji,order:state.goals.length,createdAt:serverTimestamp()});
    $('#goalModal').classList.remove('show');toast(goalEditId?t('toast.goalUpdated'):t('toast.goalCreated'));
  }catch(e){console.error(e);toast(t('toast.catSaveFail'),'danger');}
}
async function deleteGoal(g){
  const saved=goalSaved(g.id), firstW=state.wallets[0];
  const msg=(saved>0&&firstW)
    ?t('confirm.deleteGoalMoneyMsg',{name:g.name,amt:fmt(saved),wallet:firstW.icon+' '+firstW.name})
    :t('confirm.deleteGoalMsg',{name:g.name});
  const ok=await confirmDialog(msg,{title:t('confirm.deleteGoalTitle')});
  if(!ok)return;
  try{
    if(saved>0&&firstW){
      await addDoc(col(currentUser.uid,'transactions'),{type:'transfer',amount:saved,fromWallet:'g:'+g.id,toWallet:firstW.id,desc:t('savings.closeDesc',{name:g.name}),date:todayISO(),createdAt:serverTimestamp()});
    }
    await deleteDoc(doc(db,'users',currentUser.uid,'goals',g.id));toast(t('toast.goalDeleted'));
  }catch(e){console.error(e);toast(t('toast.deleteFail'),'danger');}
}
let gmGoalId=null, gmMode='deposit';
function openGoalMove(g,mode){
  if(!state.wallets.length){toast(t('toast.need1Wallet'),'warn');return;}
  gmGoalId=g.id;gmMode=mode;
  $('#goalMoveTitle').textContent=(mode==='deposit'?t('savings.depositTitle'):t('savings.withdrawTitle'))+' · '+g.emo+' '+g.name;
  $('#goalMoveWalletLabel').textContent=mode==='deposit'?t('savings.fromWallet'):t('savings.toWallet');
  $('#gmAmt').value='';datePicker.set('gmDate',todayISO());
  $('#goalMoveModal').classList.add('show');syncCsels();
}
async function doGoalMove(){
  if(!currentUser||!gmGoalId)return;
  const wallet=$('#gmWallet').value;const amount=num($('#gmAmt').value);const date=datePicker.get('gmDate')||todayISO();
  const g=state.goals.find(x=>x.id===gmGoalId);if(!g)return;
  if(!wallet){toast(t('toast.pickWallet'),'warn');return;}
  if(amount<=0){toast(t('toast.invalidAmount'),'warn');shake($('#gmAmt'));return;}
  const gref='g:'+gmGoalId;let data;
  if(gmMode==='deposit'){
    data={type:'transfer',amount,fromWallet:wallet,toWallet:gref,desc:t('savings.depositDesc',{name:g.name}),date,createdAt:serverTimestamp()};
  }else{
    if(amount>goalSaved(gmGoalId)){toast(t('toast.exceedSaved'),'warn');shake($('#gmAmt'));return;}
    data={type:'transfer',amount,fromWallet:gref,toWallet:wallet,desc:t('savings.withdrawDesc',{name:g.name}),date,createdAt:serverTimestamp()};
  }
  try{await addDoc(col(currentUser.uid,'transactions'),data);$('#goalMoveModal').classList.remove('show');
    toast(gmMode==='deposit'?t('toast.deposited',{amt:fmt(amount)}):t('toast.withdrawn',{amt:fmt(amount)}));
  }catch(e){console.error(e);toast(t('toast.transferFail'),'danger');}
}

/* ===== Debts & Loans ===== */
function renderDebts(){
  [['borrow','#payableList'],['lend','#receivableList']].forEach(([dir,sel])=>{
    const wrap=$(sel);if(!wrap)return;
    const list=state.debts.filter(d=>d.dir===dir);
    if(!list.length){wrap.innerHTML=`<div class="hint">${t('debts.empty')}</div>`;return;}
    wrap.innerHTML='';
    list.forEach(d=>{
      const out=debtOutstanding(d);const settled=out<=0.5;
      const label=dir==='borrow'?t('debts.youOwe'):t('debts.owedYou');
      const actLabel=dir==='borrow'?t('debts.repay'):t('debts.collect');
      const tag=dir==='borrow'?t('debts.payable'):t('debts.receivable');
      const el=document.createElement('div');el.className='glass goal'+(settled?' done':'');
      el.innerHTML=`<div class="goal-top">
          <div class="goal-ic">${dir==='borrow'?'🔻':'🔺'}</div>
          <div class="goal-meta"><div class="goal-name">${escapeHtml(d.name)}${settled?' ✅':''}</div>
            <div class="goal-sub">${settled?t('debts.settled'):label+': '+fmt(out)}${d.note?' • '+escapeHtml(d.note):''}</div></div>
          <div class="goal-actions"><button class="gedit" title="${t('tt.edit')}">✎</button><button class="gdel" title="${t('tt.delete')}">🗑</button></div>
        </div>
        <div class="goal-foot"><span class="goal-pct" style="font-size:12.5px;color:var(--txt-dim);font-weight:600">${tag}</span>
          <div class="goal-btns">${settled?'':`<button class="gdep btn-grad" style="box-shadow:none">${actLabel}</button>`}</div></div>`;
      el.querySelector('.gedit').onclick=()=>openDebtEdit(d);
      el.querySelector('.gdel').onclick=()=>deleteDebt(d);
      const act=el.querySelector('.gdep');if(act)act.onclick=()=>openDebtMove(d);
      wrap.appendChild(el);
    });
  });
}
let debtEditId=null, debtDir='borrow';
function setDebtDir(dir){
  debtDir=dir;
  $('#debtSeg').querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.dir===dir));
  $('#debtSeg').classList.toggle('exp',dir==='lend');
  $('#debtWalletLabel').textContent=dir==='borrow'?t('debts.intoWallet'):t('debts.outWallet');
}
function openDebtAdd(dir){
  debtEditId=null;
  $('#debtModalTitle').textContent=t('debts.addTitle');
  $('#debtSeg').style.display='';$('#debtInitFields').style.display='';
  $('#debtName').value='';$('#debtAmt').value='';$('#debtNote').value='';datePicker.set('debtDate',todayISO());
  setDebtDir(dir);syncCsels();
  $('#debtModal').classList.add('show');setTimeout(()=>$('#debtName').focus(),50);
}
function openDebtEdit(d){
  debtEditId=d.id;debtDir=d.dir;
  $('#debtModalTitle').textContent=t('debts.editTitle');
  $('#debtSeg').style.display='none';$('#debtInitFields').style.display='none';
  $('#debtName').value=d.name;$('#debtNote').value=d.note||'';
  $('#debtModal').classList.add('show');
}
async function saveDebt(){
  if(!currentUser)return;
  const name=$('#debtName').value.trim();const note=$('#debtNote').value.trim();
  if(!name){toast(t('debts.enterName'),'warn');shake($('#debtName'));return;}
  try{
    if(debtEditId){
      await updateDoc(doc(db,'users',currentUser.uid,'debts',debtEditId),{name,note});
      toast(t('toast.debtUpdated'));
    }else{
      const amount=num($('#debtAmt').value);const wallet=$('#debtWallet').value;const date=datePicker.get('debtDate')||todayISO();
      if(amount<=0){toast(t('toast.invalidAmount'),'warn');shake($('#debtAmt'));return;}
      if(!wallet){toast(t('toast.pickWallet'),'warn');return;}
      const ref=await addDoc(col(currentUser.uid,'debts'),{dir:debtDir,name,note,order:state.debts.length,createdAt:serverTimestamp()});
      const dref='d:'+ref.id;
      const data=debtDir==='borrow'
        ?{type:'transfer',amount,fromWallet:dref,toWallet:wallet,desc:t('debts.borrowDesc',{name}),date,createdAt:serverTimestamp()}
        :{type:'transfer',amount,fromWallet:wallet,toWallet:dref,desc:t('debts.lendDesc',{name}),date,createdAt:serverTimestamp()};
      await addDoc(col(currentUser.uid,'transactions'),data);
      toast(t('toast.debtCreated'));
    }
    $('#debtModal').classList.remove('show');
  }catch(e){console.error(e);toast(t('toast.catSaveFail'),'danger');}
}
async function deleteDebt(d){
  const out=debtOutstanding(d), firstW=state.wallets[0];
  let msg=t('confirm.deleteDebtMsg',{name:d.name});
  if(out>0.5&&firstW){
    msg=d.dir==='borrow'
      ?t('confirm.deleteDebtPayMsg',{name:d.name,amt:fmt(out),wallet:firstW.icon+' '+firstW.name})
      :t('confirm.deleteDebtCollectMsg',{name:d.name,amt:fmt(out),wallet:firstW.icon+' '+firstW.name});
  }
  const ok=await confirmDialog(msg,{title:t('confirm.deleteDebtTitle')});
  if(!ok)return;
  try{
    if(out>0.5&&firstW){
      const dref='d:'+d.id;
      const data=d.dir==='borrow'
        ?{type:'transfer',amount:out,fromWallet:firstW.id,toWallet:dref,desc:t('debts.settleDesc',{name:d.name}),date:todayISO(),createdAt:serverTimestamp()}
        :{type:'transfer',amount:out,fromWallet:dref,toWallet:firstW.id,desc:t('debts.settleDesc',{name:d.name}),date:todayISO(),createdAt:serverTimestamp()};
      await addDoc(col(currentUser.uid,'transactions'),data);
    }
    await deleteDoc(doc(db,'users',currentUser.uid,'debts',d.id));toast(t('toast.debtDeleted'));
  }catch(e){console.error(e);toast(t('toast.deleteFail'),'danger');}
}
let dmDebtId=null;
function openDebtMove(d){
  if(!state.wallets.length){toast(t('toast.need1Wallet'),'warn');return;}
  dmDebtId=d.id;const out=debtOutstanding(d);
  $('#debtMoveTitle').textContent=(d.dir==='borrow'?t('debts.repay'):t('debts.collect'))+' · '+d.name;
  $('#debtMoveWalletLabel').textContent=d.dir==='borrow'?t('debts.fromWallet'):t('debts.intoWallet');
  $('#dmAmt').value=out?Number(Math.round(out)).toLocaleString('en-US'):'';datePicker.set('dmDate',todayISO());
  $('#debtMoveModal').classList.add('show');syncCsels();
}
async function doDebtMove(){
  if(!currentUser||!dmDebtId)return;
  const d=state.debts.find(x=>x.id===dmDebtId);if(!d)return;
  const wallet=$('#dmWallet').value;const amount=num($('#dmAmt').value);const date=datePicker.get('dmDate')||todayISO();
  if(!wallet){toast(t('toast.pickWallet'),'warn');return;}
  if(amount<=0){toast(t('toast.invalidAmount'),'warn');shake($('#dmAmt'));return;}
  if(amount>debtOutstanding(d)+0.5){toast(t('toast.exceedDebt'),'warn');shake($('#dmAmt'));return;}
  const dref='d:'+dmDebtId;
  const data=d.dir==='borrow'
    ?{type:'transfer',amount,fromWallet:wallet,toWallet:dref,desc:t('debts.repayDesc',{name:d.name}),date,createdAt:serverTimestamp()}
    :{type:'transfer',amount,fromWallet:dref,toWallet:wallet,desc:t('debts.collectDesc',{name:d.name}),date,createdAt:serverTimestamp()};
  try{await addDoc(col(currentUser.uid,'transactions'),data);$('#debtMoveModal').classList.remove('show');
    toast(d.dir==='borrow'?t('toast.repaid',{amt:fmt(amount)}):t('toast.collected',{amt:fmt(amount)}));
  }catch(e){console.error(e);toast(t('toast.transferFail'),'danger');}
}

/* ===== Bill reminders (chỉ nhắc, không tự trừ tiền) ===== */
function billStatus(b){
  const ym=thisMonth(); const todayD=parseInt(todayISO().slice(8,10),10);
  return {paid:(b.lastPaid===ym), day:b.day||1, diff:(b.day||1)-todayD};
}
function billStatusText(st){
  if(st.paid)return {txt:t('bills.paid'),cls:'ok'};
  if(st.diff<0)return {txt:t('bills.overdue',{n:-st.diff}),cls:'over'};
  if(st.diff===0)return {txt:t('bills.dueToday'),cls:'soon'};
  return {txt:t('bills.dueIn',{n:st.diff}),cls:st.diff<=3?'soon':''};
}
function updateBillBadge(){
  const n=state.bills.filter(b=>b.active!==false&&(()=>{const st=billStatus(b);return !st.paid&&st.diff<=3;})()).length;
  const el=$('#billBadge');if(!el)return;el.textContent=n||'';el.style.display=n?'inline-flex':'none';
}
function renderBills(){
  const wrap=$('#billList');if(!wrap)return;
  updateBillBadge();
  if(!state.bills.length){wrap.innerHTML=`<div class="hint">${t('bills.empty')}</div>`;return;}
  const sorted=state.bills.slice().sort((a,b)=>{const sa=billStatus(a),sb=billStatus(b);if(sa.paid!==sb.paid)return sa.paid?1:-1;return sa.diff-sb.diff;});
  wrap.innerHTML='';
  sorted.forEach(b=>{
    const st=billStatus(b),sx=billStatusText(st),ci=catInfo('expense',b.cat);
    const el=document.createElement('div');el.className='item-row bill';
    el.innerHTML=`<div class="emo">${ci.emo}</div>
      <div class="info"><div class="t">${escapeHtml(b.name)}</div>
        <div class="d"><span class="bill-status ${sx.cls}">${sx.txt}</span> • ${t('bills.dueDayShort',{d:b.day||1})}${b.walletId?' • '+walletName(b.walletId):''}${b.note?' • '+escapeHtml(b.note):''}</div></div>
      <div class="amt out">−${fmt(b.amount)}</div>
      <div class="ctl">${st.paid?'':`<button class="pay">${t('bills.pay')}</button>`}<button class="edit">✎</button><button class="del">🗑</button></div>`;
    const pay=el.querySelector('.pay');if(pay)pay.onclick=()=>payBill(b);
    el.querySelector('.edit').onclick=()=>openBillEdit(b);
    el.querySelector('.del').onclick=()=>deleteBill(b);
    wrap.appendChild(el);
  });
}
function renderBillBanner(){
  const banner=$('#billBanner');if(!banner)return;
  updateBillBadge();notifyDueBills();
  const due=state.bills.filter(b=>b.active!==false).map(b=>({b,st:billStatus(b)})).filter(o=>!o.st.paid&&o.st.diff<=7).sort((a,b)=>a.st.diff-b.st.diff);
  if(!due.length){banner.style.display='none';return;}
  banner.style.display='block';
  $('#billBannerList').innerHTML=due.map(({b,st})=>{
    const sx=billStatusText(st),ci=catInfo('expense',b.cat);
    return `<div class="bill-mini"><span class="bm-emo">${ci.emo}</span><span class="bm-name">${escapeHtml(b.name)}</span><span class="bill-status ${sx.cls}">${sx.txt}</span><span class="bm-amt">−${fmt(b.amount)}</span><button class="bm-pay" data-id="${b.id}">${t('bills.pay')}</button></div>`;
  }).join('');
  $('#billBannerList').querySelectorAll('.bm-pay').forEach(btn=>btn.onclick=()=>{const b=state.bills.find(x=>x.id===btn.dataset.id);if(b)payBill(b);});
}
async function payBill(b){
  if(!currentUser)return;
  try{
    await addDoc(col(currentUser.uid,'transactions'),{type:'expense',cat:b.cat||'bill',desc:b.name,amount:b.amount,date:todayISO(),walletId:b.walletId||'',createdAt:serverTimestamp()});
    await updateDoc(doc(db,'users',currentUser.uid,'bills',b.id),{lastPaid:thisMonth()});
    toast(t('toast.billPaid',{name:b.name}));checkBudgetWarning(todayISO());
  }catch(e){console.error(e);toast(t('toast.saveFail',{code:e.code}),'danger');}
}
let billEditId=null;
function fillBillCatOptions(){
  const sel=$('#billCat');if(!sel)return;const cur=sel.value;
  sel.innerHTML=S.CATS.expense.map(c=>`<option value="${c.id}">${c.emo} ${catName(c)}</option>`).join('');
  if(cur)sel.value=cur;
}
function buildBillDayOptions(){
  const sel=$('#billDay');if(!sel)return;const cur=sel.value;sel.innerHTML='';
  for(let d=1;d<=31;d++){const o=document.createElement('option');o.value=d;o.textContent=t('rec.dayLabel',{d});sel.appendChild(o);}
  if(cur)sel.value=cur;
}
function openBillAdd(){
  billEditId=null;
  $('#billModalTitle').textContent=t('bills.addTitle');
  $('#billName').value='';$('#billAmt').value='';$('#billNote').value='';
  fillBillCatOptions();$('#billDay').value='1';$('#billCat').selectedIndex=0;
  syncCsels();$('#billModal').classList.add('show');setTimeout(()=>$('#billName').focus(),50);
}
function openBillEdit(b){
  billEditId=b.id;
  $('#billModalTitle').textContent=t('bills.editTitle');
  $('#billName').value=b.name;$('#billAmt').value=b.amount?Number(b.amount).toLocaleString('en-US'):'';$('#billNote').value=b.note||'';
  fillBillCatOptions();$('#billDay').value=String(b.day||1);$('#billCat').value=b.cat||(S.CATS.expense[0]||{}).id;$('#billWallet').value=b.walletId||'';
  syncCsels();$('#billModal').classList.add('show');
}
async function saveBill(){
  if(!currentUser)return;
  const name=$('#billName').value.trim();const amount=num($('#billAmt').value);
  const day=parseInt($('#billDay').value,10)||1;const cat=$('#billCat').value;const walletId=$('#billWallet').value||'';const note=$('#billNote').value.trim();
  if(!name){toast(t('bills.enterName'),'warn');shake($('#billName'));return;}
  if(amount<=0){toast(t('toast.invalidAmount'),'warn');shake($('#billAmt'));return;}
  try{
    if(billEditId)await updateDoc(doc(db,'users',currentUser.uid,'bills',billEditId),{name,amount,day,cat,walletId,note});
    else await addDoc(col(currentUser.uid,'bills'),{name,amount,day,cat,walletId,note,active:true,lastPaid:'',order:state.bills.length,createdAt:serverTimestamp()});
    $('#billModal').classList.remove('show');toast(billEditId?t('toast.billUpdated'):t('toast.billCreated'));
  }catch(e){console.error(e);toast(t('toast.catSaveFail'),'danger');}
}
async function deleteBill(b){
  const ok=await confirmDialog(t('confirm.deleteBillMsg',{name:b.name}),{title:t('confirm.deleteBillTitle')});
  if(!ok)return;
  try{await deleteDoc(doc(db,'users',currentUser.uid,'bills',b.id));toast(t('toast.billDeleted'));}
  catch(e){console.error(e);toast(t('toast.deleteFail'),'danger');}
}

/* ----- Bill device notifications (PWA) ----- */
function notifSupported(){return ('Notification' in window);}
function updateNotifyBtn(){
  const btn=$('#billNotifyBtn');if(!btn)return;
  if(!notifSupported()){btn.textContent=t('bills.notifyUnsupported');btn.disabled=true;return;}
  const p=Notification.permission;
  btn.disabled=(p==='granted');
  btn.textContent=p==='granted'?t('bills.notifyOn'):p==='denied'?t('bills.notifyBlocked'):t('bills.notify');
}
function showNotif(title,body,tag){
  const opts={body,tag,icon:'favicon.svg',badge:'favicon.svg',lang:S.lang};
  if(navigator.serviceWorker&&navigator.serviceWorker.ready){
    navigator.serviceWorker.ready.then(reg=>reg.showNotification(title,opts)).catch(()=>{try{new Notification(title,opts);}catch(e){}});
  }else{try{new Notification(title,opts);}catch(e){}}
}
function notifyDueBills(){
  if(!notifSupported()||Notification.permission!=='granted')return;
  const ym=thisMonth();
  state.bills.filter(b=>b.active!==false).forEach(b=>{
    const st=billStatus(b);
    if(st.paid||st.diff>1)return; // chỉ nhắc khi còn ≤1 ngày, đến hạn, hoặc quá hạn
    const key='vtm_notified_'+b.id+'_'+ym;
    if(localStorage.getItem(key))return;
    const ci=catInfo('expense',b.cat),sx=billStatusText(st);
    showNotif(t('bills.notifyTitle'),`${ci.emo} ${b.name} · ${fmt(b.amount)} · ${sx.txt}`,b.id);
    localStorage.setItem(key,'1');
  });
}

function renderAll(){renderStats();renderWallets();renderList();renderChart();renderReports();renderCalendar();renderBudgetBanner();renderBillBanner();syncCsels();}

/* ===== CSV export ===== */
function exportCSV(){
  const txs=applyFilters();
  if(!txs.length){toast(t('toast.noExportData'),'warn');return;}
  const head=[t('csv.date'),t('csv.type'),t('csv.cat'),t('csv.desc'),t('csv.wallet'),t('csv.amount')];
  const typeLabel={income:t('chip.income'),expense:t('chip.expense'),transfer:t('chip.transfer')};
  const rows=txs.map(tr=>{
    let cat='',wallet='';
    if(tr.type==='transfer'){cat=t('tx.transfer');wallet=`${walletName(tr.fromWallet)} → ${walletName(tr.toWallet)}`;}
    else{cat=catInfo(tr.type,tr.cat).name;wallet=walletName(tr.walletId);}
    const amt=(tr.type==='expense'?'-':tr.type==='income'?'+':'')+tr.amount;
    return [tr.date,typeLabel[tr.type]||tr.type,cat,(tr.desc||''),wallet,amt];
  });
  const esc=v=>{v=String(v);return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;};
  const csv=[head,...rows].map(r=>r.map(esc).join(',')).join('\n');
  const blob=new Blob(['﻿'+csv],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob);const a=document.createElement('a');
  a.href=url;a.download=`hu_${todayISO()}.csv`;a.click();
  URL.revokeObjectURL(url);toast(t('toast.exported',{n:txs.length}));
}

/* ===== Settings: backup / restore / import ===== */
function downloadBackup(){
  const data={app:'hu',version:1,exportedAt:todayISO(),data:{
    wallets:state.wallets, transactions:state.txs,
    categories:[...S.CATS.expense,...S.CATS.income],
    recurring:state.recurring, goals:state.goals, debts:state.debts, bills:state.bills, budget:state.budget
  }};
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);const a=document.createElement('a');
  a.href=url;a.download=`hu-backup_${todayISO()}.json`;a.click();URL.revokeObjectURL(url);
  toast(t('settings.backupDone'));
}
async function restoreBackup(obj){
  if(!currentUser||!obj||!obj.data)return;
  const uid=currentUser.uid, d=obj.data;
  const writeColl=async(coll,arr,idField)=>{
    for(const item of (arr||[])){
      const id=item[idField]||item.id;if(!id)continue;
      const data={...item};delete data.id;delete data.docId;
      try{await setDoc(doc(db,'users',uid,coll,id),data);}catch(e){console.error(e);}
    }
  };
  await writeColl('wallets',d.wallets,'id');
  await writeColl('transactions',d.transactions,'id');
  await writeColl('categories',d.categories,'docId');
  await writeColl('recurring',d.recurring,'id');
  await writeColl('goals',d.goals,'id');
  await writeColl('debts',d.debts,'id');
  await writeColl('bills',d.bills,'id');
  if(d.budget){try{await setDoc(doc(db,'users',uid,'settings','budget'),d.budget,{merge:true});}catch(e){console.error(e);}}
  toast(t('settings.restoreDone'));
}
function handleRestoreFile(file){
  const r=new FileReader();
  r.onload=async()=>{
    try{
      const obj=JSON.parse(r.result);
      const cnt=((obj.data&&obj.data.transactions)||[]).length;
      const ok=await confirmDialog(t('settings.restoreConfirm',{n:cnt}),{title:t('settings.restoreTitle'),ok:t('settings.restoreOk'),danger:false});
      if(ok)restoreBackup(obj);
    }catch(e){console.error(e);toast(t('settings.fileError'),'danger');}
  };
  r.readAsText(file);
}
function parseCSV(text){
  const rows=[];let i=0,field='',row=[],inQ=false;
  text=String(text).replace(/^﻿/,'');
  while(i<text.length){const c=text[i];
    if(inQ){if(c==='"'){if(text[i+1]==='"'){field+='"';i++;}else inQ=false;}else field+=c;}
    else{if(c==='"')inQ=true;else if(c===','){row.push(field);field='';}else if(c==='\n'){row.push(field);rows.push(row);row=[];field='';}else if(c!=='\r')field+=c;}
    i++;
  }
  if(field.length||row.length){row.push(field);rows.push(row);}
  return rows;
}
async function importCsv(text){
  if(!currentUser)return;
  const rows=parseCSV(text).filter(r=>r.length>=6);
  if(rows.length<2){toast(t('settings.csvEmpty'),'warn');return;}
  const body=rows.slice(1);
  const catByName={};[...S.CATS.expense,...S.CATS.income].forEach(c=>{[catName(c),c.vi,c.en].forEach(nm=>{if(nm)catByName[nm.toLowerCase()]=c.id;});});
  const walByName={};state.wallets.forEach(w=>{walByName[w.name.toLowerCase()]=w.id;walByName[(w.icon+' '+w.name).toLowerCase()]=w.id;});
  const incomeLabels=['thu','income',t('chip.income').toLowerCase()];
  let added=0;
  for(const r of body){
    const date=(r[0]||'').trim(), typeL=(r[1]||'').trim().toLowerCase(), catL=(r[2]||'').trim(), desc=(r[3]||'').trim(), walletL=(r[4]||'').trim(), amtL=(r[5]||'').trim();
    if(typeL.includes('chuyển')||typeL.includes('transfer'))continue;
    const type=incomeLabels.includes(typeL)?'income':'expense';
    const amount=Math.abs(num(amtL));
    if(!amount||!/^\d{4}-\d{2}-\d{2}$/.test(date))continue;
    const cat=catByName[catL.toLowerCase()]||(type==='expense'?'other':'salary');
    const walletId=walByName[walletL.toLowerCase()]||'';
    try{await addDoc(col(currentUser.uid,'transactions'),{type,cat,desc,amount,date,walletId,createdAt:serverTimestamp()});added++;}catch(e){console.error(e);}
  }
  toast(t('settings.csvDone',{n:added}));
}
function handleCsvFile(file){
  const r=new FileReader();
  r.onload=async()=>{const ok=await confirmDialog(t('settings.csvConfirm'),{title:t('settings.csvTitle'),ok:t('settings.csvOk'),danger:false});if(ok)importCsv(r.result);};
  r.readAsText(file);
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
buildRecDayOptions();
attachThousands($('#amtInput'));attachThousands($('#wInit'));attachThousands($('#recAmt'));attachThousands($('#trAmt'));attachThousands($('#budgetTotal'));
renderFormCats();renderRecCats();renderWalletIcons();renderCatFilterOptions();
document.querySelectorAll('.field select').forEach(enhanceSelect);syncCsels();

// Language
function paintLangSeg(){$$('#langSeg button, #authLangSeg button').forEach(b=>b.classList.toggle('on',b.dataset.lang===S.lang));}
$$('#langSeg button, #authLangSeg button').forEach(b=>b.onclick=()=>{if(b.dataset.lang!==S.lang)setLang(b.dataset.lang);});

// Tabs
function activateTab(name){
  const btn=$(`#tabs button[data-tab="${name}"]`);
  if(!btn)name='dash';
  state.tab=name;
  localStorage.setItem('vtm_tab',name);
  $$('#tabs button').forEach(x=>x.classList.toggle('on',x.dataset.tab===name));
  $$('.tab-page').forEach(p=>p.classList.remove('on'));$('#page-'+name).classList.add('on');
  if(name==='budget')renderBudget();
  if(name==='cats')renderCategoryManage();
  if(name==='savings')renderSavings();
  if(name==='debts')renderDebts();
  if(name==='bills')renderBills();
  if(name==='calendar')renderCalendar();
  if(name==='charts'){renderChart();renderReports();requestAnimationFrame(()=>{if(chart)chart.resize();if(barChart)barChart.resize();});}
}
$$('#tabs button').forEach(b=>b.onclick=()=>activateTab(b.dataset.tab));
activateTab(localStorage.getItem('vtm_tab')||'dash');

// Sidebar collapse (desktop)
$('#appRoot').classList.toggle('collapsed',localStorage.getItem('vtm_sidebar')==='collapsed');
$('#sidebarToggle').onclick=()=>{
  const c=$('#appRoot').classList.toggle('collapsed');
  localStorage.setItem('vtm_sidebar',c?'collapsed':'expanded');
  if(chart)chart.resize();
};

// Form type segment
$('#seg').querySelectorAll('button').forEach(b=>b.onclick=()=>{
  state.txType=b.dataset.type;state.cat=(S.CATS[state.txType][0]||{}).id||'';
  $('#seg').querySelectorAll('button').forEach(x=>x.classList.remove('active'));b.classList.add('active');
  $('#seg').classList.toggle('exp',state.txType==='income');renderFormCats();
});
// Recurring type segment
$('#recSeg').querySelectorAll('button').forEach(b=>b.onclick=()=>{
  state.recType=b.dataset.type;state.recCat=(S.CATS[state.recType][0]||{}).id||'';
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
  else{const [f,t2]=rangeFor(b.dataset.range);b.classList.add('on');state.filter.from=f;state.filter.to=t2;datePicker.set('fromDate',f);datePicker.set('toDate',t2);}
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
  etType=b.dataset.type;etCat=(S.CATS[etType][0]||{}).id||'';
  $('#etSeg').querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));
  $('#etSeg').classList.toggle('exp',etType==='income');renderEtCats();
});
$('#etCancel').onclick=()=>$('#editTxModal').classList.remove('show');
$('#etSave').onclick=saveTxEdit;
$('#editTxModal').addEventListener('click',e=>{if(e.target===$('#editTxModal'))$('#editTxModal').classList.remove('show');});

// Collapse / expand all months
$('#collapseAll').onclick=()=>{
  const keys=[...new Set(applyFilters().map(tr=>monthKey(tr.date)))];
  const allCollapsed=keys.length&&keys.every(k=>collapsedMonths.has(k));
  if(allCollapsed)collapsedMonths.clear();else keys.forEach(k=>collapsedMonths.add(k));
  $('#collapseAll').innerHTML=allCollapsed?t('list.collapse'):t('list.expand');
  renderList();
};

// Confirm modal
$('#confirmCancel').onclick=()=>resolveConfirm(false);
$('#confirmOk').onclick=()=>resolveConfirm(true);
$('#confirmModal').addEventListener('click',e=>{if(e.target===$('#confirmModal'))resolveConfirm(false);});

// Recurring
$('#addRecBtn').onclick=addRecurring;

// Calendar
$('#calPrev').onclick=()=>shiftCalMonth(-1);
$('#calNext').onclick=()=>shiftCalMonth(1);

// Budget
$('#saveBudgetBtn').onclick=saveBudgetTotal;
$('#budgetPeriodSeg').querySelectorAll('button').forEach(b=>b.onclick=()=>{
  const p=b.dataset.period;
  $('#budgetPeriodSeg').querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));
  $('#budgetPeriodSeg').classList.toggle('p2',p==='week');
  state.budget.period=p;renderBudget();renderBudgetBanner();
  if(currentUser){setDoc(doc(db,'users',currentUser.uid,'settings','budget'),{period:p},{merge:true}).catch(e=>console.error(e));}
});

// Savings goals
attachThousands($('#goalTarget'));attachThousands($('#gmAmt'));datePicker.attach($('#gmDate'));
$('#addGoalBtn').onclick=openGoalAdd;
$('#goalCancel').onclick=()=>$('#goalModal').classList.remove('show');
$('#goalSave').onclick=saveGoal;
$('#goalName').addEventListener('keydown',e=>{if(e.key==='Enter')$('#goalTarget').focus();});
$('#goalModal').addEventListener('click',e=>{if(e.target===$('#goalModal'))$('#goalModal').classList.remove('show');});
$('#gmCancel').onclick=()=>$('#goalMoveModal').classList.remove('show');
$('#gmConfirm').onclick=doGoalMove;
$('#gmAmt').addEventListener('keydown',e=>{if(e.key==='Enter')doGoalMove();});
$('#goalMoveModal').addEventListener('click',e=>{if(e.target===$('#goalMoveModal'))$('#goalMoveModal').classList.remove('show');});

// Debts & loans
attachThousands($('#debtAmt'));attachThousands($('#dmAmt'));datePicker.attach($('#debtDate'));datePicker.attach($('#dmDate'));
$('#addBorrowBtn').onclick=()=>openDebtAdd('borrow');
$('#addLendBtn').onclick=()=>openDebtAdd('lend');
$('#debtSeg').querySelectorAll('button').forEach(b=>b.onclick=()=>setDebtDir(b.dataset.dir));
$('#debtCancel').onclick=()=>$('#debtModal').classList.remove('show');
$('#debtSave').onclick=saveDebt;
$('#debtModal').addEventListener('click',e=>{if(e.target===$('#debtModal'))$('#debtModal').classList.remove('show');});
$('#dmCancel').onclick=()=>$('#debtMoveModal').classList.remove('show');
$('#dmConfirm').onclick=doDebtMove;
$('#dmAmt').addEventListener('keydown',e=>{if(e.key==='Enter')doDebtMove();});
$('#debtMoveModal').addEventListener('click',e=>{if(e.target===$('#debtMoveModal'))$('#debtMoveModal').classList.remove('show');});

// Bills (reminders) + PWA / device notifications
if('serviceWorker' in navigator){navigator.serviceWorker.register('sw.js').catch(e=>console.warn('SW',e));}
updateNotifyBtn();
$('#billNotifyBtn').onclick=()=>{
  if(!('Notification' in window))return;
  Notification.requestPermission().then(p=>{updateNotifyBtn();if(p==='granted')notifyDueBills();});
};
document.addEventListener('visibilitychange',()=>{if(!document.hidden)notifyDueBills();});
setInterval(notifyDueBills,30*60*1000);
attachThousands($('#billAmt'));
$('#addBillBtn').onclick=openBillAdd;
$('#billCancel').onclick=()=>$('#billModal').classList.remove('show');
$('#billSave').onclick=saveBill;
$('#billName').addEventListener('keydown',e=>{if(e.key==='Enter')$('#billAmt').focus();});
$('#billModal').addEventListener('click',e=>{if(e.target===$('#billModal'))$('#billModal').classList.remove('show');});

// Categories
$('#addExpenseCatBtn').onclick=()=>openCatAdd('expense');
$('#addIncomeCatBtn').onclick=()=>openCatAdd('income');
$('#catSeg').querySelectorAll('button').forEach(b=>b.onclick=()=>setCatModalType(b.dataset.type));
$('#catCancel').onclick=()=>$('#catModal').classList.remove('show');
$('#catSave').onclick=saveCat;
$('#catNameInput').addEventListener('keydown',e=>{if(e.key==='Enter')saveCat();});
$('#catModal').addEventListener('click',e=>{if(e.target===$('#catModal'))$('#catModal').classList.remove('show');});

// Settings (data tools)
$('#backupBtn').onclick=downloadBackup;
$('#restoreBtn').onclick=()=>$('#restoreFile').click();
$('#restoreFile').onchange=e=>{const f=e.target.files[0];if(f)handleRestoreFile(f);e.target.value='';};
$('#importCsvBtn').onclick=()=>$('#csvFile').click();
$('#csvFile').onchange=e=>{const f=e.target.files[0];if(f)handleCsvFile(f);e.target.value='';};

// Receipt photos
$('#photoBtn').onclick=()=>$('#photoInput').click();
$('#photoInput').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{addPhoto=await compressImage(f);showPhoto('photo',addPhoto);}catch(err){console.error(err);}e.target.value='';};
$('#photoRm').onclick=()=>{addPhoto=null;showPhoto('photo',null);};
$('#photoImg').onclick=()=>{if(addPhoto)openLightbox(addPhoto);};
$('#etPhotoBtn').onclick=()=>$('#etPhotoInput').click();
$('#etPhotoInput').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{etPhoto=await compressImage(f);showPhoto('etPhoto',etPhoto);}catch(err){console.error(err);}e.target.value='';};
$('#etPhotoRm').onclick=()=>{etPhoto=null;showPhoto('etPhoto',null);};
$('#etPhotoImg').onclick=()=>{if(etPhoto)openLightbox(etPhoto);};
$('#photoLightbox').onclick=()=>$('#photoLightbox').classList.remove('show');

// Logout
$('#logoutBtn').onclick=()=>{if(auth)signOut(auth);};

/* ===== Auth UI ===== */
let signupMode=false;
function authError(e){const k='err.'+e.code;const m=(I18N[S.lang][k]||I18N.vi[k]);$('#authErr').textContent='⚠️ '+(m||e.message||t('err.generic'));}
function setAuthTexts(){
  $('#authTitle').textContent=signupMode?t('auth.signupTitle'):t('auth.welcome');
  $('#authSub').textContent=signupMode?t('auth.signupSub'):t('auth.welcomeSub');
  $('#authSubmit').textContent=signupMode?t('auth.signup'):t('auth.login');
  $('#authToggle').innerHTML=signupMode
    ?`${t('auth.hasAccount')} <a id="toggleLink">${t('auth.loginNow')}</a>`
    :`${t('auth.noAccount')} <a id="toggleLink">${t('auth.signupNow')}</a>`;
  $('#toggleLink').onclick=toggleAuthMode;
  $('#forgotWrap').style.display=signupMode?'none':'';
}
$('#forgotLink').onclick=()=>{
  if(!auth)return;
  const email=$('#email').value.trim();
  if(!email){toast(t('auth.enterEmailFirst'),'warn');shake($('#email'));return;}
  sendPasswordResetEmail(auth,email).then(()=>toast(t('auth.resetSent'))).catch(err=>authError(err));
};
function toggleAuthMode(){signupMode=!signupMode;setAuthTexts();$('#authErr').textContent='';}
$('#toggleLink').onclick=toggleAuthMode;
$('#authForm').addEventListener('submit',async e=>{
  e.preventDefault();if(!auth)return;
  const email=$('#email').value.trim(),pw=$('#password').value;const btn=$('#authSubmit');btn.disabled=true;$('#authErr').textContent='';
  try{if(signupMode)await createUserWithEmailAndPassword(auth,email,pw);else await signInWithEmailAndPassword(auth,email,pw);}
  catch(err){authError(err);}finally{btn.disabled=false;}
});
$('#googleBtn').onclick=async()=>{if(!auth)return;$('#authErr').textContent='';try{await signInWithPopup(auth,new GoogleAuthProvider());}catch(err){authError(err);}};

// Initial language paint
applyLang();
