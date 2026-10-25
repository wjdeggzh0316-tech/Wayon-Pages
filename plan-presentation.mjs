// Presentation only: identity keys and saved task definitions remain untouched.
export function planDisplayName(value) {
  return String(value||'').replace(/[【】「」]/g,'').replace(/(?:[-－—]\s*)?(?:高中同步课程|初中同步课程|小学同步课程|英语能力提升课程|雅思(?:基础|强化)?(?:课程|班)|托福(?:基础|强化)?(?:课程|班))$/,'').trim();
}
export function planDisplayTasks(values) {
  const tasks=values.map(x=>String(x).trim()).filter(Boolean);
  const specific=tasks.some(x=>x!=='打印课后单词带回去背'&&/打印.*(?:单词|词汇|词表)/.test(x));
  return [...new Set(tasks.filter(x=>!(specific&&x==='打印课后单词带回去背')))];
}
export function planDisplayText(value) {
  const lines=String(value||'').split('\n');
  const header=lines.shift().replace(/【([^】]+)】/,(_,name)=>'【'+planDisplayName(name)+'】');
  const numbered=lines.filter(x=>/^\s*\d+[、.．]\s*/.test(x));
  if(!numbered.length)return [header,...lines].join('\n');
  // Only rewrite a generated numbered list, never a free-form teacher paragraph.
  if(lines.some(x=>x.trim()&&!/^\s*\d+[、.．]\s*/.test(x)))return [header,...lines].join('\n');
  const tasks=planDisplayTasks(numbered.map(x=>x.replace(/^\s*\d+[、.．]\s*/,'')));
  return header+'\n\n'+tasks.map((x,i)=>(i+1)+'、'+x).join('\n');
}
(() => {
 if(typeof document==='undefined')return;
 const script=document.createElement('script');
 script.textContent=`(() => {
   if(typeof planCard!=='function'||typeof foldRow!=='function'||document.documentElement.dataset.wayonPlanDisplay==='1')return;
   document.documentElement.dataset.wayonPlanDisplay='1';
   const name=${planDisplayName.toString()},tasks=${planDisplayTasks.toString()};
   const planDisplayName=name,planDisplayTasks=tasks,copyText=${planDisplayText.toString()};
   const card=planCard,fold=foldRow;
   planCard=function(title,time,text,key,group){return card(name(title),time,copyText(text),key,group);};
   foldRow=function(id,label,when){return fold(id,String(id).startsWith('plan:')?name(label):label,when);};
   if(typeof mode!=='undefined'&&mode==='plan'&&typeof render==='function')render();
 })();`;
 document.body.append(script);script.remove();
})();


// Copy format only. Dates come from the remaining items, never the device clock.
export function formatChasingReminder(name,items) {
  if(!items.length)return '当前没有需要催交的项目。';
  const dates=items.map(item=>{
    const value=String(item.date||'').slice(0,10);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;
    const stamp=new Date(value+'T00:00:00Z');
    return Number.isFinite(stamp.getTime())&&stamp.toISOString().slice(0,10)===value?value:null;
  });
  const md=value=>value.split('-').slice(1).map(Number).join('/');
  let label='日期待核实';
  if(dates.every(Boolean)){
    const ordered=[...new Set(dates)].sort(),first=ordered[0],last=ordered.at(-1);
    label=first===last?md(first):md(first)+'-'+md(last);
  }
  return '【'+String(name||'').replace(/[【】「」]/g,'').trim()+'】剩余未完成任务_'+label+'❗️\n\n'+items.map((item,i)=>(i+1)+'. '+item.title).join('\n');
}

// Admission is a projection, never a change to completion or manual state.
export async function admittedReminderRows(rows,policy) {
  const activeFrom='2026-10-25';
  const proofs=new Set(policy?.schema===1&&policy.active_from===activeFrom&&Array.isArray(policy.tokens)?policy.tokens.filter(x=>/^[a-f0-9]{64}$/.test(x)):[]);
  const output=[];let deferred=0;
  for(const original of rows){
    const details=[];
    for(const item of original.uncompleted_details||[]){
      const date=String(item.date||''),id=String(item.id||'');
      const stamp=new Date(date+'T00:00:00Z');
      let allowed=/^\d{4}-\d{2}-\d{2}$/.test(date)&&id&&Number.isFinite(stamp.getTime())&&stamp.toISOString().slice(0,10)===date&&date<activeFrom;
      if(!allowed&&/^\d{4}-\d{2}-\d{2}$/.test(date)&&id&&proofs.size){
        const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('wayon-reminder-v1:'+date+':'+id));
        allowed=proofs.has(Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join(''));
      }
      if(allowed)details.push({...item});else deferred++;
    }
    if(!details.length)continue;
    const ids=details.map(x=>String(x.id)),stopped=(original.stopped_ids||[]).map(String).filter(x=>ids.includes(x)),done=(original.teacher_completed_ids||[]).map(String).filter(x=>ids.includes(x));
    output.push({...original,uncompleted_details:details,uncompleted:details.map(x=>x.title),uncompleted_ids:ids,prev_date:details.map(x=>x.date).sort()[0],stopped_ids:stopped,teacher_completed_ids:done,stopped:ids.every(x=>stopped.includes(x)),reminders_resolved:ids.every(x=>stopped.includes(x)||done.includes(x))});
  }
  return {rows:output,deferred};
}
(() => {
  if(typeof document==='undefined')return;
  const script=document.createElement('script');
  script.textContent=`(() => {
    if(globalThis.wayonChasingCopyFormatInstalled)return;
    globalThis.wayonChasingCopyFormatInstalled=true;
    const format=${formatChasingReminder.toString()},admit=${admittedReminderRows.toString()};
    const bound=new WeakSet();let busy=false,again=false;
    const bind=async()=>{
      if(busy){again=true;return;}
      if(typeof mode==='undefined'||mode!=='chasing'||typeof chasingRows!=='function'||typeof CHASING==='undefined')return;
      busy=true;
      try{
        const root=document.getElementById('list'),anchor=root?.firstChild;if(!root)return;
        const raw=chasingRows(CHASING||[]),projection=await admit(raw,typeof DATA==='undefined'?null:DATA._reminder_admission);
        if(mode!=='chasing'||root.firstChild!==anchor){again=true;return;}
        if(projection.deferred&&!root.firstChild?.wayonAdmissionApplied){
          const source=CHASING;
          try{CHASING=projection.rows;root.replaceChildren();renderChasing();}finally{CHASING=source;}
          if(!projection.rows.length)root.textContent='当前没有已到催交阶段的任务；新任务待下班核对。';
          if(root.firstChild)root.firstChild.wayonAdmissionApplied=true;
        }
        for(const [index,row] of projection.rows.entries()){
          const button=document.getElementById('chcopy-'+index);
          if(!button||button.disabled||bound.has(button))continue;
          const card=button.closest('.item'),heading=card?.querySelector('.head .name');
          const expected=(index+1)+'. '+String(row.name||'').replace(/[【】]/g,'');
          const title=heading?.textContent||'';
          if(!title.startsWith(expected)||(title.length>expected.length&&!/^\\s/.test(title.slice(expected.length))))continue;
          const value=()=>{
            const stopped=chasingStopIds(row),done=chasingDoneIds(row);
            return format(row.name,chasingDisplayItems((row.uncompleted_details||[]).filter(item=>!stopped.includes(String(item.id))&&!done.includes(String(item.id)))));
          };
          const pre=card.querySelector('pre');if(pre)pre.textContent=value();
          button.onclick=()=>{
            const ok=()=>{ch[row.name]=hhmm();chsave();render();};
            const fail=()=>{button.textContent='复制失败，请重试';};
            try{navigator.clipboard.writeText(value()).then(ok,fail);}catch{fail();}
          };
          bound.add(button);
        }
      }finally{busy=false;if(again){again=false;queueMicrotask(bind);}}
    };
    const start=()=>{const list=document.getElementById('list');if(!list)return;new MutationObserver(bind).observe(list,{childList:true});bind();};
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  })();`;
  document.body.append(script);script.remove();
})();
