// ===== Widget giao diện: date picker, custom select, theme, hộp thoại =====
import { $, todayISO } from './util.js';
import { t, moNames, wdShortNames } from './i18n.js';
import { THEMES } from './store.js';

/* ----- Date picker (glass, thay popup mặc định) ----- */
export const datePicker=(function(){
  let pop=null, active=null, mode='days';
  const view={y:2000,m:0}, reg={};
  const parseIso=iso=>{const p=(iso||'').split('-');return p.length===3?{y:+p[0],m:+p[1]-1,d:+p[2]}:null;};
  const toIso=(y,m,d)=>`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  const fmtDisp=iso=>{const o=parseIso(iso);return o?`${String(o.d).padStart(2,'0')}/${String(o.m+1).padStart(2,'0')}/${o.y}`:'';};
  function ensure(){
    if(pop)return;
    pop=document.createElement('div');pop.className='dp-pop';document.body.appendChild(pop);
    pop.addEventListener('mousedown',e=>e.preventDefault());
    pop.addEventListener('click',e=>e.stopPropagation());
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
        +`<div class="dp-months">${moNames().map((mo,i)=>`<button class="dp-mo${selO&&selO.y===y&&selO.m===i?' sel':''}" data-mo="${i}">${mo}</button>`).join('')}</div>`;
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
      +`<button class="dp-title" data-title>${moNames()[m]} ${y}</button><button class="dp-nav" data-nav="1">›</button></div>`
      +`<div class="dp-grid">${wdShortNames().map(w=>`<div class="dp-wd">${w}</div>`).join('')}${cells}</div>`
      +`<div class="dp-foot"><button class="dp-clear" data-clear>${t('dp.clear')}</button><button data-today>${t('dp.today')}</button></div>`;
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

/* ----- Custom select (danh sách bo tròn; vẫn giữ native select làm nguồn dữ liệu) ----- */
export function enhanceSelect(sel){
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
export function closeAllCsel(){document.querySelectorAll('.csel.open').forEach(w=>w.classList.remove('open'));}
export function syncCsels(){document.querySelectorAll('select.csel-native').forEach(s=>s._cselSync&&s._cselSync());}
document.addEventListener('click',()=>closeAllCsel());

/* ----- Theme màu ----- */
const themeName=th=>t('theme.'+th.key);
export const currentTheme=()=>document.documentElement.dataset.theme||'';
// Lan toả hình tròn từ một nút: expand=true → mọc ra; false → co vào nút
export function circleReveal(originEl,changeFn,opts={}){
  const {expand=true,duration=1100}=opts;
  const reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(!document.startViewTransition||reduce||!originEl){changeFn();return;}
  const r=originEl.getBoundingClientRect();
  const x=r.left+r.width/2, y=r.top+r.height/2;
  const end=Math.hypot(Math.max(x,innerWidth-x),Math.max(y,innerHeight-y));
  const root=document.documentElement;
  root.classList.add('mode-anim',expand?'mode-expand':'mode-collapse');
  const vt=document.startViewTransition(changeFn);
  vt.ready.then(()=>{
    // Mép gợn sóng MỀM: nhiều điểm (cạnh mượt như đường cong), tần số thấp (búi sóng to tròn),
    // và nhiều khung trung gian có xoay pha để mép uốn lượn khi lan ra.
    const N=84, amp=0.3, reach=end*1.12;
    const s1=Math.random()*6.28, s2=Math.random()*6.28, s3=Math.random()*6.28;
    const blob=(R,ph)=>{
      let p=[];
      for(let i=0;i<N;i++){
        const a=i/N*Math.PI*2;
        // tần số thấp + lệch pha → lượn sóng to, mềm; ph làm mép xoay/uốn theo thời gian
        const w=(Math.sin(a*2+s1+ph)+Math.sin(a*3+s2+ph*1.25)+Math.sin(a*5+s3-ph*0.6))/3; // [-1,1]
        const r=R*(1+amp*(w*0.5+0.5)); // f∈[1,1+amp] → đáy sóng vẫn phủ kín
        p.push(`${(x+Math.cos(a)*r).toFixed(1)}px ${(y+Math.sin(a)*r).toFixed(1)}px`);
      }
      return `polygon(${p.join(',')})`;
    };
    const F=8, frames=[];
    for(let k=0;k<=F;k++){
      const tt=k/F;
      const e=1-Math.pow(1-tt,3);          // easeOutCubic cho bán kính → giãn nở mượt, chậm dần
      const R=Math.max(0.001,reach*e);
      const ph=tt*Math.PI*1.1;             // pha trôi dần → mép sóng uốn lượn trong lúc lan
      frames.push(blob(R,ph));
    }
    const seq=expand?frames:frames.slice().reverse();
    root.animate({clipPath:seq},
      {duration,easing:'linear',pseudoElement:expand?'::view-transition-new(root)':'::view-transition-old(root)'});
  });
  vt.finished.finally(()=>root.classList.remove('mode-anim','mode-expand','mode-collapse'));
}
export function applyTheme(key){
  const doChange=()=>{
    if(key)document.documentElement.dataset.theme=key;else delete document.documentElement.dataset.theme;
    try{localStorage.setItem('vtm_theme',key);}catch(e){}
    const tc=document.querySelector('meta[name=theme-color]');
    if(tc)tc.setAttribute('content',getComputedStyle(document.documentElement).getPropertyValue('--bg-0').trim()||'#0b1020');
    buildThemeGrid();
  };
  circleReveal(document.getElementById('themeBtn'),doChange,{expand:true,duration:1450});
}
export function buildThemeGrid(){
  const grid=$('#themeGrid');if(!grid)return;const cur=currentTheme();grid.innerHTML='';
  THEMES.forEach(th=>{
    const b=document.createElement('button');b.type='button';b.className='theme-sw'+(th.key===cur?' on':'');
    b.innerHTML=`<span class="dot" style="background:linear-gradient(135deg,${th.c1},${th.c2})"></span>${themeName(th)}<span class="chk">✓</span>`;
    b.onclick=()=>applyTheme(th.key);
    grid.appendChild(b);
  });
}

/* ----- Hộp thoại xác nhận (thay window.confirm) ----- */
let confirmResolver=null;
export function confirmDialog(msg,opt){
  opt=opt||{};
  $('#confirmTitle').textContent=opt.title||t('confirm.title');
  $('#confirmMsg').textContent=msg;
  const okBtn=$('#confirmOk');okBtn.textContent=opt.ok||t('btn.delete');
  okBtn.style.background=opt.danger===false?'':'linear-gradient(135deg,var(--red),#e0476a)';
  $('#confirmModal').classList.add('show');
  return new Promise(res=>{confirmResolver=res;});
}
export function resolveConfirm(v){$('#confirmModal').classList.remove('show');if(confirmResolver){confirmResolver(v);confirmResolver=null;}}
