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
