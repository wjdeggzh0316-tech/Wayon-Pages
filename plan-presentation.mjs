// Presentation only: identity keys and saved task definitions remain untouched.
export function planDisplayName(value) {
  let text=String(value||'').trim();
  // Explicit person brackets retain the boundary before a course suffix.
  const head=text.match(/^((?:\d+[.、．]\s*)?)(?:【([^】]+)】|「([^」]+)」|\[([^\]]+)\])(?=\s*(?:$|[-－—]?\s*(?:雅思|托福|SAT|GRE|IELTS|TOEFL|英语|高中|初中|小学)))/i);
  if(head)text=head[1]+(head[2]||head[3]||head[4]);
  return text.replace(/[【】「」]/g,'').trim().replace(/(?:[-－—]\s*)?(?:(?:雅思|托福|SAT|GRE|IELTS|TOEFL|英语)\s*(?:1\s*v\s*1|一对一|1对1)(?:课程|班)?|高中同步课程|初中同步课程|小学同步课程|英语能力提升课程|雅思(?:基础|强化)?(?:课程|班)|托福(?:基础|强化)?(?:课程|班))$/i,'').trim();
}
// Explicitly bracketed roster identities map their bracket-free spelling to the person name.
export function rosterPeople(identities) {
  const people=new Map();
  for(const raw of identities||[]){
    const text=String(raw||'').trim();
    if(!/^(?:【[^】]+】|「[^」]+」|\[[^\]]+\])/.test(text))continue;
    const person=planDisplayName(text),plain=text.replace(/[【】「」\[\]]/g,'').trim();
    if(person&&plain&&plain!==person)people.set(plain,person);
  }
  return people;
}
// Presentation only: a course label is removed only after a roster-confirmed person,
// and a reversed Chinese/Latin name follows the spelling already used on the roster.
export function rosterDisplayName(value, people, names) {
  const text=planDisplayName(value),parts=text.match(/^((?:\d+[.、．]\s*)?)([\s\S]*)$/),prefix=parts[1],body=parts[2];
  const label=/^\s*[-－—]?\s*(?:雅思|托福|SAT|GRE|IELTS|TOEFL|英语)\s*(?:基础|强化|冲刺|提高|进阶|1\s*v\s*1|一对一|1对1)?\s*(?:课程|班)?(?:\s*[-－—]\s*(?:雅思|托福|SAT|GRE|IELTS|TOEFL|英语)\s*(?:基础|强化|冲刺|提高|进阶|1\s*v\s*1|一对一|1对1)?\s*(?:课程|班)?)?$/i;
  for(const [plain,person] of people||[]){
    if(body===plain||body===person)return prefix+person;
    for(const start of [plain,person])if(body.startsWith(start)&&label.test(body.slice(start.length)))return prefix+person;
  }
  // A plain roster name followed by a separated course label, e.g. 丁嘉宝-雅思基础.
  if(names&&typeof names[Symbol.iterator]==='function'&&!(typeof names.has==='function'&&names.has(body))){
    for(const known of names)if(known&&body.startsWith(known)&&/^\s*[-－—]/.test(body.slice(known.length))&&label.test(body.slice(known.length)))return prefix+known;
  }
  const swap=body.match(/^([一-鿿]{2,4})([A-Za-z]+)$/)||body.match(/^([A-Za-z]+)([一-鿿]{2,4})$/);
  if(swap&&names&&typeof names.has==='function'&&!names.has(body)&&names.has(swap[2]+swap[1]))return prefix+swap[2]+swap[1];
  return text;
}
// Only the bracketed name in the first line changes; task lines stay byte-for-byte intact.
// A header may nest the person bracket, e.g. 【【陈书进】雅思强化课程】, so match the outer pair.
export function rosterHeaderText(value, display) {
  const lines=String(value||'').split('\n');
  lines[0]=lines[0].replace(/【((?:【[^】]*】|[^【】])+)】/,(_,name)=>'【'+display(name)+'】');
  return lines.join('\n');
}
// Names only: completion marks, notes and numbered tasks must remain byte-for-byte intact.
export function studentDisplayText(value, identity) {
  const raw=String(identity||'').trim();
  const bracket=raw.match(/^(?:【([^】]+)】|「([^」]+)」|\[([^\]]+)\])\s*(?:[-－—]?\s*(?:雅思|托福|SAT|GRE|IELTS|TOEFL|英语|高中|初中|小学))/i);
  const person=bracket&&(bracket[1]||bracket[2]||bracket[3]);
  return String(value||'').split('\n').map((line,index)=>{
    if(index===0)line=line.replace(/【((?:【[^】]*】|[^【】])+)】/,(_,name)=>'【'+planDisplayName(name)+'】');
    return line.replace(/^(\s*学生[：:]\s*)(.+)$/,(_,prefix,name)=>{
      const display=planDisplayName(name);
      if(person && new RegExp('^(?:雅思|托福|SAT|GRE|IELTS|TOEFL|英语)$','i').test(display.slice(person.length)) && display.startsWith(person))return prefix+person;
      return prefix+display;
    });
  }).join('\n');
}
// A single-student card drops a leading 「本人」 marker carried over from a merged-class rule;
// merged cards keep it because it names which member the task belongs to.
export function ownTaskText(value) {
  const lines=String(value||'').split('\n');
  const person=(lines[0].match(/【([^】]+)】/)||[])[1]?.trim();
  if(!person||/[&＆/／、,，]/.test(person))return lines.join('\n');
  const own=new RegExp('^(\\s*\\d+[、.．]\\s*)[「【]'+person.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'[」】]\\s*');
  return lines.map((line,index)=>index?line.replace(own,'$1'):line).join('\n');
}
export function taskMatchKey(value) {
  const text=String(value||'').trim();
  return text.includes('口语') ? text.replace(/(?<![A-Za-z0-9])p(?:art)?\s*([123])(?![A-Za-z0-9])/gi,(_,part)=>'p'+part) : text;
}
// Select original indices only. Never rewrite saved marks or task definitions.
export function generatedTaskIndices(tasks,state={}) {
  const groups=new Map(), keep=new Set();
  tasks.forEach((task,index)=>{
    const key=taskMatchKey(typeof task==='string'?task:task[0]);
    if(!groups.has(key))groups.set(key,[]);
    groups.get(key).push(index);
  });
  for(const indices of groups.values()){
    const evidence=indices.map(i=>({i,mark:state.m?.[i]??(Array.isArray(tasks[i])?tasks[i][1]:'')??'',note:state.n?.[i]??(Array.isArray(tasks[i])?tasks[i][2]:'')??''}));
    const marks=new Set(evidence.map(x=>x.mark).filter(Boolean)),notes=new Set(evidence.map(x=>x.note).filter(Boolean));
    if(marks.size>1||notes.size>1){indices.forEach(i=>keep.add(i));continue;}
    // A mark and a note on different rows must both remain accessible.
    const selected=evidence.find(x=>(!marks.size||x.mark)&&(!notes.size||x.note));
    if(selected)keep.add(selected.i);else indices.forEach(i=>keep.add(i));
  }
  return [...keep].sort((a,b)=>a-b);
}
export function planDisplayTasks(values) {
  const tasks=values.map(x=>String(x).trim()).filter(Boolean);
  const specific=tasks.some(x=>x!=='打印课后单词带回去背'&&/打印.*(?:单词|词汇|词表)/.test(x));
  const seen=new Set();
  return tasks.filter(x=>{
    if(specific&&x==='打印课后单词带回去背')return false;
    const key=taskMatchKey(x);if(seen.has(key))return false;seen.add(key);return true;
  });
}
export function planDisplayText(value) {
  const lines=String(value||'').split('\n');
  const header=lines.shift().replace(/【((?:【[^】]*】|[^【】])+)】/,(_,name)=>'【'+planDisplayName(name)+'】');
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
   if(typeof planCard!=='function'||typeof foldRow!=='function'||document.documentElement.dataset.wayonStudentNames==='1')return;
   document.documentElement.dataset.wayonPlanDisplay='1';
   document.documentElement.dataset.wayonStudentNames='1';
   const taskMatchKey=${taskMatchKey.toString()},generatedTaskIndices=${generatedTaskIndices.toString()};
   globalThis.wayonGeneratedTaskVisible=(name,index)=>{
     const state=get(name);if(Array.isArray(state.tk))return true;
     const rows=(DATA[cur]||[]).filter(row=>row[0]===name);
     return rows.length!==1||generatedTaskIndices(rows[0][3],state).includes(index);
   };
   const base=${planDisplayName.toString()},tasks=${planDisplayTasks.toString()};
   const planDisplayName=base,planDisplayTasks=tasks,baseCopyText=${planDisplayText.toString()};
   const people=${rosterPeople.toString()},resolve=${rosterDisplayName.toString()},header=${rosterHeaderText.toString()},studentText=${studentDisplayText.toString()},own=${ownTaskText.toString()};
   const identities=()=>{
     const ids=[];
     try{
       for(const [day,rows] of Object.entries(DATA)){
         if(/^\\d{4}-\\d{2}-\\d{2}$/.test(day)&&Array.isArray(rows))for(const row of rows)if(Array.isArray(row)&&typeof row[0]==='string')ids.push(row[0]);
       }
       for(const rows of Object.values(DATA._plan||{}))if(Array.isArray(rows))for(const row of rows)if(Array.isArray(row)&&typeof row[0]==='string')ids.push(row[0]);
     }catch{}
     return ids;
   };
   const name=value=>{const ids=identities();return resolve(value,people(ids),new Set(ids.map(x=>base(x))));};
   const copyText=value=>own(header(baseCopyText(value),name));
   globalThis.wayonDisplayName=name;
   globalThis.wayonOwnTaskText=own;
   globalThis.wayonPlanCopyText=copyText;
   globalThis.wayonDisplayCopyText=(value,identity)=>own(header(studentText(value,identity),name));
   const card=planCard,fold=foldRow;
   planCard=function(title,time,text,key,group,marker){return card(name(title),time,copyText(text),key,group,marker);};
   foldRow=function(id,label,when){return fold(id,name(label),when);};
   const titles=()=>{
     for(const heading of document.querySelectorAll('#list .head .name,#list .qhead,#list .qname,#list .study-folded')){
       for(const node of heading.childNodes){
         if(node.nodeType!==3)continue;
         const text=node.textContent,split=text.indexOf(' · 自习');
         const next=split<0?name(text):name(text.slice(0,split))+text.slice(split);
         if(next!==text)node.textContent=next;
       }
     }
   };
   const list=document.getElementById('list');
   if(list)new MutationObserver(titles).observe(list,{childList:true,subtree:true,characterData:true});
   if(typeof render==='function')render();
   titles();
 })();`;
 document.body.append(script);script.remove();
})();


// Copy text helper with execCommand fallback for environments without clipboard API permission.
export function copyChasingText(text, ok, fail) {
  let copied = false;
  try {
    const tmp = document.createElement('textarea');
    tmp.value = text;
    tmp.setAttribute('readonly', '');
    tmp.style.position = 'absolute';
    tmp.style.left = '-9999px';
    document.body.append(tmp);
    tmp.select();
    copied = document.execCommand('copy') === true;
    tmp.remove();
  } catch(e) { copied = false; }
  if (copied) { ok(); }
  else if (navigator.clipboard?.writeText) { navigator.clipboard.writeText(text).then(ok, fail); }
  else { fail(); }
}

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
  return '【'+planDisplayName(name)+'】剩余未完成任务_'+label+'❗️\n\n'+items.map((item,i)=>(i+1)+'. '+item.title).join('\n');
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
    const planDisplayName=${planDisplayName.toString()},format=${formatChasingReminder.toString()},admit=${admittedReminderRows.toString()},copyText=${copyChasingText.toString()};
    const bound=new WeakSet();let busy=false,again=false;
    // The 待催 badge must count what this view will show: the same admission projection,
    // the same stop / confirmed-done / copied state as the count line under the list.
    // Read-only: has the cloud copy of this day been read? Display layers ask this instead of holding the sync object.
    globalThis.wayonCloudReady=day=>{try{return typeof checkCloud!=='undefined'&&checkCloud?.ready?.(day)===true;}catch(e){return false;}};
    globalThis.wayonChasingDue=async()=>{
      if(typeof chasingRows!=='function'||typeof CHASING==='undefined'||typeof DATA==='undefined')return undefined;
      if(DATA._chasing_status==='error'||DATA._chasing_unknown)return undefined;
      if(chDay!==today||!Object.keys(ch||{}).length)chload();
      const projection=await admit(chasingRows(CHASING||[]),DATA._reminder_admission),rows=chasingRows(projection.rows);
      // Same rule as the count line under the list: new work owed or three days since the last reminder;
      // students whose exam is over are listed but not counted.
      if(typeof chasingDue==='function'){const due=chasingDue(rows);return Math.max(0,due.open-due.chased);}
      return rows.filter(row=>{
        const ids=(row.uncompleted_details||[]).map(x=>String(x.id)),stopped=chasingStopIds(row),done=chasingDoneIds(row);
        return ids.length&&!ids.every(id=>stopped.includes(id)||done.includes(id))&&!ch[row.name];
      }).length;
    };
    const bind=async()=>{
      if(busy){again=true;return;}
      if(typeof mode==='undefined'||mode!=='chasing'||typeof chasingRows!=='function'||typeof CHASING==='undefined')return;
      busy=true;
      try{
        const root=document.getElementById('list'),anchor=root?.firstChild;if(!root)return;
        const raw=chasingRows(CHASING||[]),projection=await admit(raw,typeof DATA==='undefined'?null:DATA._reminder_admission);
        if(mode!=='chasing'||root.firstChild!==anchor){again=true;return;}
        // Mark every node of an admitted render. Another display layer may reorder the cards (ux.js moves
        // students whose exam has passed to the bottom); judging by the first child alone made the two
        // layers redraw each other without end.
        if(projection.deferred&&![...root.childNodes].some(node=>node.wayonAdmissionApplied)){
          const source=CHASING;
          try{CHASING=projection.rows;root.replaceChildren();renderChasing();}finally{CHASING=source;}
          if(!projection.rows.length)root.textContent='当前没有已到催交阶段的任务；新任务待下班核对。';
          for(const node of root.childNodes)node.wayonAdmissionApplied=true;
        }
        for(const [index,row] of projection.rows.entries()){
          const button=document.getElementById('chcopy-'+index);
          if(!button||button.disabled||bound.has(button))continue;
          const card=button.closest('.item'),heading=card?.querySelector('.head .name');
          // Open follow-ups are numbered among themselves, so match the name after the number.
          const expected=planDisplayName(row.name);
          const title=(heading?.textContent||'').replace(/^\\d+\\.\\s*/,'');
          const original=String(row.name||'').replace(/[【】]/g,'');
          if(![expected,original].some(value=>title.startsWith(value)&&(title.length===value.length||/^\\s/.test(title.slice(value.length)))))continue;
          const value=()=>{
            const stopped=chasingStopIds(row),done=chasingDoneIds(row);
            return format(row.name,chasingDisplayItems((row.uncompleted_details||[]).filter(item=>!stopped.includes(String(item.id))&&!done.includes(String(item.id)))));
          };
          const pre=card.querySelector('pre');if(pre)pre.textContent=value();
          button.onclick=()=>{
            const ok=()=>{ch[row.name]=hhmm();chsave();render();};
            const fail=()=>{button.textContent='复制失败，请重试';};
            copyText(value(),ok,fail);
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
