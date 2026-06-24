// ===== Tiện ích chung + các phép tính dữ liệu =====
import { S, state } from './store.js';
import { t, wdNames, MO_EN_SHORT } from './i18n.js';

export const $=s=>document.querySelector(s);
export const $$=s=>document.querySelectorAll(s);
export const fmt=n=>new Intl.NumberFormat('vi-VN').format(Math.round(n))+'₫';
export const num=s=>parseFloat(String(s).replace(/[^\d]/g,''))||0;
export const escapeHtml=s=>(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export const todayISO=()=>{const d=new Date();return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10);};
export const isoOf=d=>new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10);
export const fmtDate=iso=>{const [y,m,d]=(iso||'').split('-');return d&&m&&y?`${d}/${m}/${y}`:iso;};
export const monthKey=iso=>(iso||'').slice(0,7);
export const monthLabel=k=>{const [y,m]=k.split('-');if(!m||!y)return k;return S.lang==='en'?`${MO_EN_SHORT[parseInt(m)-1]} ${y}`:`Tháng ${parseInt(m)}/${y}`;};
export const thisMonth=()=>todayISO().slice(0,7);
export function dayHeaderInfo(iso){
  const p=(iso||'').split('-');
  if(p.length!==3)return {wd:'',dd:iso||'',tag:''};
  const y=+p[0],m=+p[1],d=+p[2];const dt=new Date(y,m-1,d);
  const yest=isoOf(new Date(Date.now()-86400000));
  const tag=iso===todayISO()?t('rel.today'):iso===yest?t('rel.yesterday'):'';
  return {wd:wdNames()[dt.getDay()],dd:`${String(d).padStart(2,'0')}/${String(m).padStart(2,'0')}/${y}`,tag};
}

export const catFallback=()=>S.lang==='en'?'Other':'Khác';
export const catName=c=>{if(!c)return catFallback();return (S.lang==='en'?(c.en||c.name||c.vi):(c.vi||c.name||c.en))||catFallback();};
export const catInfo=(ty,id)=>{const c=(S.CATS[ty]||[]).find(x=>x.id===id);return c?{emo:c.emo,name:catName(c)}:{emo:'📦',name:catFallback()};};

export const walletById=id=>state.wallets.find(w=>w.id===id);
export const walletName=id=>{
  if(id&&id.indexOf){
    if(id.indexOf('g:')===0){const g=state.goals.find(x=>x.id===id.slice(2));return g?`${g.emo} ${g.name}`:'🐷 '+t('savings.jar');}
    if(id.indexOf('d:')===0){const d=state.debts.find(x=>x.id===id.slice(2));return d?`🤝 ${d.name}`:'🤝';}
  }
  const w=walletById(id);return w?`${w.icon} ${w.name}`:'—';
};
// refBalance trên các giao dịch chuyển: +toWallet, -fromWallet
export function refBalance(ref){let s=0;for(const tr of state.txs){if(tr.type==='transfer'){if(tr.toWallet===ref)s+=tr.amount;if(tr.fromWallet===ref)s-=tr.amount;}}return s;}
export const goalSaved=id=>refBalance('g:'+id);
export const debtBalance=id=>refBalance('d:'+id);
// outstanding (dương = còn lại): borrow -> còn nợ (-balance); lend -> còn phải thu (+balance)
export const debtOutstanding=d=>{const b=debtBalance(d.id);return d.dir==='borrow'?-b:b;};

export function walletBalance(w){
  let b=w.initial||0;
  for(const tr of state.txs){
    if(tr.type==='income'&&tr.walletId===w.id)b+=tr.amount;
    else if(tr.type==='expense'&&tr.walletId===w.id)b-=tr.amount;
    else if(tr.type==='transfer'){if(tr.toWallet===w.id)b+=tr.amount;if(tr.fromWallet===w.id)b-=tr.amount;}
  }
  return b;
}
export const monthExpense=ym=>state.txs.filter(tr=>tr.type==='expense'&&monthKey(tr.date)===ym).reduce((s,tr)=>s+tr.amount,0);
export const monthExpenseByCat=(ym,catId)=>state.txs.filter(tr=>tr.type==='expense'&&tr.cat===catId&&monthKey(tr.date)===ym).reduce((s,tr)=>s+tr.amount,0);

export function applyFilters(){
  const f=state.filter;
  return state.txs.filter(tr=>{
    if(f.type!=='all'&&tr.type!==f.type)return false;
    if(f.cat!=='all'&&tr.cat!==f.cat)return false;
    if(f.wallet!=='all'&&tr.walletId!==f.wallet&&tr.fromWallet!==f.wallet&&tr.toWallet!==f.wallet)return false;
    if(f.from&&(tr.date||'')<f.from)return false;
    if(f.to&&(tr.date||'')>f.to)return false;
    if(f.q){const q=f.q.toLowerCase();if(!(tr.desc||'').toLowerCase().includes(q))return false;}
    return true;
  });
}

export function toast(msg,kind){const el=$('#toast');el.className='toast show'+(kind?' '+kind:'');el.innerHTML=msg;clearTimeout(el._tm);el._tm=setTimeout(()=>el.classList.remove('show'),2600);}
export const show=el=>el.classList.remove('app-hidden');
export const hide=el=>el.classList.add('app-hidden');
export function shake(el){el.style.animation='none';el.offsetHeight;el.style.animation='shake .4s';el.style.borderColor='var(--red)';setTimeout(()=>el.style.borderColor='',500);}

// Định dạng dấu phẩy ngăn cách hàng nghìn cho ô text
export function attachThousands(el){
  el.addEventListener('input',e=>{
    const tg=e.target;
    const before=tg.value.slice(0,tg.selectionStart).replace(/\D/g,'').length;
    const digits=tg.value.replace(/\D/g,'');
    tg.value=digits?Number(digits).toLocaleString('en-US'):'';
    let pos=0,seen=0;
    while(pos<tg.value.length&&seen<before){if(/\d/.test(tg.value[pos]))seen++;pos++;}
    tg.setSelectionRange(pos,pos);
  });
}
export function animateNumber(el,to){
  const from=parseFloat(el.dataset.v||0);
  if(from===to){el.textContent=fmt(to);return;}
  el.dataset.v=to;
  const dur=600,start=performance.now();
  function step(now){const p=Math.min((now-start)/dur,1);const e=1-Math.pow(1-p,3);el.textContent=fmt(from+(to-from)*e);if(p<1)requestAnimationFrame(step);}
  requestAnimationFrame(step);
}
