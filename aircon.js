// The same published schedule snapshot drives this view; private copy marks stay in owner day fields.
(() => {
  if (globalThis.wayonAircon) return;
  const iso = d => /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(d+'T12:00:00Z')) && new Date(d+'T12:00:00Z').toISOString().slice(0,10)===d;
  const shift = (d,n) => { const t=new Date(d+'T12:00:00Z');t.setUTCDate(t.getUTCDate()+n);return t.toISOString().slice(0,10); };
  const minutes = value => /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value) ? Number(value.slice(0,2))*60+Number(value.slice(3)) : NaN;
  const clock = n => String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');
  const label = d => { const p=d.split('-');return Number(p[1])+'月'+Number(p[2])+'日'; };
  function buildRequest(data,day) {
    if (!iso(day)) return {status:'unknown',days:[],text:''};
    const weekday=new Date(day+'T12:00:00Z').getUTCDay();
    const days=weekday===6?[day,shift(day,1)]:[day];
    const slots=[];const occupied=[];
    for (const date of days) {
      const cooling=data._aircon_schedule?.[date];
      const sessions=cooling ? (Array.isArray(cooling.slots)?cooling.slots.map(time=>['',time,'','','线下']):null) : data._sess?.[date];
      const status=cooling?.status || data._schedule_status?.[date]?.status;
      if (status!=='verified' || !Array.isArray(sessions)) return {status:'unknown',days,text:''};
      let offline=false;
      for (const row of sessions) {
        if (!Array.isArray(row) || !['线上','线下'].includes(row[4])) return {status:'unknown',days,text:''};
        if (row[4]==='线上') continue;
        const pair=typeof row[1]==='string'?row[1].split('-'):[];
        const start=minutes(pair[0]||''),end=minutes(pair[1]||'');
        if (pair.length!==2 || !Number.isFinite(start) || !Number.isFinite(end) || start>=end) return {status:'unknown',days,text:''};
        slots.push([start,end]);offline=true;
      }
      if (offline) occupied.push(date);
    }
    if (!slots.length) return {status:'none',days,text:''};
    const end=Math.max(...slots.map(s=>s[1]));
    const weekend=weekday===0 || weekday===6;
    if (!weekend && end<=1080) return {status:'none',days,text:''};
    const start=weekend?Math.min(510,...slots.map(s=>s[0])):1080;
    const stop=weekend && end<=1060?1050:end;
    const text=['申请空调加时信息如下：','开启房号：C1108','开启日期：'+occupied.map(label).join('/'),'开启时间：'+clock(start)+'-'+clock(stop),'区域：全部'].join('\n');
    return {status:'ready',days,id:days.join('/'),text};
  }
  const read = day => {try {const v=JSON.parse(localStorage.getItem('wayon-aircon-'+day)||'{}');return v && typeof v==='object' && !Array.isArray(v)?v:{};}catch{return {};}};
  const write = (day,value) => {try{localStorage.setItem('wayon-aircon-'+day,JSON.stringify(value));}catch{}};
  function capture(day) {
    const fields={};
    for (const [id,value] of Object.entries(read(day))) if(value && typeof value.copied_at==='string' && typeof value.signature==='string') fields[JSON.stringify(['aircon-copy-v1',id])]=value;
    return fields;
  }
  function apply(day,fields) {
    const marks={};
    for(const [raw,value] of Object.entries(fields)) {
      let key;try{key=JSON.parse(raw);}catch{continue;}
      if(Array.isArray(key) && key.length===2 && key[0]==='aircon-copy-v1' && value && typeof value.copied_at==='string' && typeof value.signature==='string')marks[key[1]]=value;
    }
    write(day,marks);
    if(open && day===selected)render();
  }
  let open=false,selected='',root=null,lastSnapshot='';
  const opened=new Set();
  const data = () => {try{return DATA;}catch{return {};}};
  const cloud = () => {try{return checkCloud;}catch{return null;}};
  function watch(day) {
    const c=cloud();if(!c || opened.has(day))return;
    opened.add(day);Promise.resolve(c.open(day)).catch(()=>opened.delete(day));
  }
  function save(day,marks) {write(day,marks);cloud()?.observe(day);}
  globalThis.wayonAircon={buildRequest,capture,apply,currentDay:()=>open?selected:null};
  if(typeof document==='undefined')return;
  const make=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
  const style=make('style');style.textContent=`
    #nav-aircon:before{display:none!important}#nav-aircon svg{width:19px;height:19px;flex:none}
    body[data-aircon-open] #tabs button:not(#nav-aircon){background:transparent!important;color:var(--fg-secondary)!important}
    body[data-aircon-open] #list,body[data-aircon-open] .workspace-top-bar,body[data-aircon-open] .workspace-sub-bar,body[data-aircon-open] .sidebar-footer .bar{display:none!important}
    #aircon-panel{width:100%}#aircon-panel[hidden]{display:none!important}
    .aircon-heading{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:20px}
    .aircon-heading h2{font-size:24px;letter-spacing:-.025em;margin:0}.aircon-heading select{max-width:100%;min-height:44px;border:1px solid var(--line-strong);border-radius:10px;background:var(--card);color:var(--fg);padding:8px 12px;font:inherit}
    .aircon-hint{font-size:12px;color:var(--muted);line-height:1.6;margin:0 0 16px}.aircon-empty{padding:24px;border:1px solid var(--line);border-radius:16px;background:var(--card);color:var(--muted)}
    #aircon-panel pre{margin:16px 0 0;padding:16px;border-radius:12px;background:var(--code-bg);font:15px/1.8 var(--sans);white-space:pre-wrap;overflow-wrap:anywhere}
    #aircon-panel .aircon-card.folded{padding:0!important;display:block!important;height:auto;min-height:44px}
    #aircon-panel summary{cursor:pointer;padding:12px 16px;min-height:44px;list-style:none;font-size:14px}
    #aircon-panel .aircon-detail{padding:0 16px 16px}#aircon-panel .aircon-feedback{font-size:13px;color:var(--bad);margin:10px 0 0}
    #aircon-panel .aircon-feedback:empty{display:none}
  `;document.head.append(style);
  function copyText(text,ok,fail) {
    const area=make('textarea');area.value=text;area.setAttribute('aria-label','空调加时申请文本');
    area.style.cssText='position:fixed;left:-9999px;top:0';document.body.append(area);area.select();
    try{if(document.execCommand('copy')){area.remove();ok();return;}}catch{}
    area.remove();
    try{Promise.resolve(navigator.clipboard.writeText(text)).then(ok,fail);}catch{fail();}
  }
  function render() {
    if(!root || !open)return;
    const snapshot=data();lastSnapshot=JSON.stringify([snapshot._sess,snapshot._schedule_status,snapshot._aircon_schedule]);
    root.replaceChildren();watch(selected);
    const heading=make('div','aircon-heading');heading.append(make('h2','','空调加时'));
    const picker=make('select');picker.id='aircon-day-picker';picker.setAttribute('aria-label','空调开启日期');
    const today=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Shanghai'});
    const dates=[...new Set([today,shift(today,1),selected,...Object.keys(snapshot._sess||{}),...Object.keys(snapshot._aircon_schedule||{})])].filter(iso).sort();
    for(const day of dates){const o=make('option','',(day===today?'今天 · ':day===shift(today,1)?'明天 · ':'')+label(day));o.value=day;o.selected=day===selected;picker.append(o);}
    picker.onchange=()=>{selected=picker.value;render();};heading.append(picker);root.append(heading);
    root.append(make('p','aircon-hint','复制后自动收纳，可展开查看或撤销。周末申请合并周六、周日；已复制仅表示复制过申请文本。'));
    const request=buildRequest(snapshot,selected);
    if(request.status!=='ready') {
      const text=request.status==='none'?'这天空调无需加时。':'课表尚未核实，暂时无法生成加时申请。请先刷新课表；周末需要周六、周日两天的核对结果。';
      const empty=make('div','aircon-empty',text);empty.setAttribute('role','status');root.append(empty);return;
    }
    const saved=read(selected)[request.id];const copied=saved?.signature===request.text && saved.copied_at;
    const card=make(copied?'details':'div','item aircon-card'+(copied?' copied folded':''));
    if(copied){const summary=make('summary','','空调加时 · '+request.days.map(label).join('/')+' · ✓ 已复制 '+copied+' · 展开');card.append(summary);}
    const content=make('div',copied?'aircon-detail':'');const head=make('div','head');
    head.append(make('div','name','C1108 · 空调加时'),make('div','meta',request.days.map(label).join('/')));
    const feedback=make('p','aircon-feedback');feedback.setAttribute('role','status');
    const pre=make('pre','',request.text);
    const button=make('button','copy',copied?'再次复制':'复制');button.type='button';button.id='aircon-copy';
    button.onclick=()=>{const copyDay=selected;copyText(request.text,()=>{
      // A schedule refresh during the permission prompt must not mark a different version as copied.
      const marks=read(copyDay);marks[request.id]={signature:request.text,copied_at:new Date().toLocaleTimeString('zh-CN',{timeZone:'Asia/Shanghai',hour:'2-digit',minute:'2-digit'})};
      save(copyDay,marks);render();
    },()=>{button.textContent='复制失败，请重试';feedback.textContent='复制未成功，请重试，或手动选中下方文字复制。';});};
    head.append(button);
    if(copied){const undo=make('button','small','撤销');undo.type='button';undo.id='aircon-undo';undo.onclick=()=>{const marks=read(selected);delete marks[request.id];save(selected,marks);render();};head.append(undo);}
    content.append(head,pre,feedback);card.append(content);root.append(card);
    const verified=request.days.map(day=>snapshot._aircon_schedule?.[day]?.checked_at || snapshot._schedule_status?.[day]?.checked_at).filter(Boolean);
    if(verified.length)root.append(make('p','aircon-hint','课表核对时间：'+verified.map(t=>new Date(t).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false})).join(' / ')));
  }
  function mount() {
    const tabs=document.getElementById('tabs'),list=document.getElementById('list');if(!tabs || !list)return;
    if(!root){root=make('section');root.id='aircon-panel';root.hidden=true;root.setAttribute('aria-label','空调加时');list.before(root);}
    if(!document.getElementById('nav-aircon')) {
      const button=make('button','wayon-icon-control'+(open?' on':''));button.id='nav-aircon';button.type='button';button.title='空调加时';button.setAttribute('aria-label','空调加时');button.setAttribute('aria-pressed',String(open));
      button.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2v20 M3.34 7l17.32 10 M3.34 17L20.66 7 M8 4l4 4 4-4 M8 20l4-4 4 4 M3 11l5-1-1-5 M17 19l-1-5 5-1 M3 13l5 1-1 5 M17 5l-1 5 5 1"/></svg>';
      button.onclick=()=>{open=true;document.body.dataset.airconOpen='true';root.hidden=false;button.classList.add('on');button.setAttribute('aria-pressed','true');render();};tabs.append(button);
    }
    if(open){watch(selected);if(lastSnapshot!==JSON.stringify([data()._sess,data()._schedule_status,data()._aircon_schedule]))render();}
  }
  function start() {
    selected=shift(new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Shanghai'}),1);mount();
    document.addEventListener('click',event=>{
      const nav=event.target.closest?.('#tabs button');
      if(open && nav && nav.id!=='nav-aircon'){open=false;root.hidden=true;delete document.body.dataset.airconOpen;const ac=document.getElementById('nav-aircon');ac?.classList.remove('on');ac?.setAttribute('aria-pressed','false');}
    },true);
    new MutationObserver(mount).observe(document.body,{childList:true,subtree:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
