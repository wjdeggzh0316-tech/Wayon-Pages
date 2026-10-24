export function canonical(value){
  if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
  if(value && typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';
  return JSON.stringify(value);
}
export async function saveCatalog(client,owner,base,payload){
  const {data,error}=await client.from('wayon_rule_catalog').update({payload,revision:base.revision+1}).eq('owner_id',owner).eq('revision',base.revision).select('revision').maybeSingle();
  if(error || !data)throw Error('CONFLICT');
  const read=await client.from('wayon_rule_catalog').select('revision,payload').eq('owner_id',owner).single();
  if(read.error || read.data.revision!==base.revision+1 || canonical(read.data.payload)!==canonical(payload))throw Error('READBACK_FAILED');
  return read.data;
}

export async function mountRules({document,client}){
  const $=id=>document.getElementById(id),state={base:null,draft:null,owner:null};
  const status=message=>{$('status').textContent=message;};
  const node=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
  function input(parent,label,value,change,type='text'){
    const wrap=node('label',label),box=node(type==='textarea'?'textarea':'input');
    if(type!=='textarea')box.type=type;box.value=value??'';box.oninput=()=>change(box.value);wrap.append(box);parent.append(wrap);return box;
  }
  function select(parent,label,value,options,change){
    const wrap=node('label',label),box=node('select');for(const v of options){const o=node('option',v);o.value=v;o.selected=v===value;box.append(o);}box.onchange=()=>change(box.value);wrap.append(box);parent.append(wrap);return box;
  }
  function section(title){const box=node('details');box.append(node('summary',title));$('rules').append(box);return box;}
  function render(){
    $('rules').replaceChildren();const p=state.draft;
    for(const r of p.frequency_rows){
      const box=section(`${r['学员']} · ${r['状态']} · ${r['重复']}`);
      select(box,'状态',r['状态'],['进行中','暂停'],v=>{r['状态']=v;r._canonical_state=true});
      select(box,'检查频率',r['重复'],['每天','每周固定几天','随课/每天'],v=>r['重复']=v);
      const days=node('fieldset');days.append(node('legend','每周执行日'));for(const day of ['周一','周二','周三','周四','周五','周六','周日']){
        const label=node('label',day),check=node('input');check.type='checkbox';check.checked=r['周几'].includes(day);check.onchange=()=>{r['周几']=check.checked?[...r['周几'],day]:r['周几'].filter(x=>x!==day);};label.append(check);days.append(label);
      }box.append(days);
      select(box,'形式',r['形式'],['线上','自习','线下'],v=>r['形式']=v);
      input(box,'开始日期',r['date:下次日期:start']?.slice(0,10),v=>r['date:下次日期:start']=v||null,'date');
      input(box,'截止日期',r['date:重复截止:start']?.slice(0,10),v=>r['date:重复截止:start']=v||null,'date');
      input(box,'任务内容（每行一项，明确数量）',r['任务内容'],v=>r['任务内容']=v,'textarea');
      select(box,'单词布置方式',r['单词布置方式']||'跟随任务内容',['跟随任务内容','仅听力','仅阅读','听读交替','听读各一份'],v=>r['单词布置方式']=v);
      select(box,'阅读规则',r['特殊阅读规则']||'跟随默认',['跟随默认','完整原卷','仅同卷P1/P2','跨卷P1/P2三篇','老师安排'],v=>r['特殊阅读规则']=v);
      input(box,'特殊要求',r['特殊要求'],v=>r['特殊要求']=v,'textarea');
      input(box,'备注',r['备注'],v=>r['备注']=v,'textarea');
    }
    const attendance=section('有课当天的任务规则');
    for(const [key,r] of Object.entries(p.attendance_rules)){
      const box=node('details');box.append(node('summary',r.name||key));attendance.append(box);
      input(box,'单词任务（空白表示不自动布置）',r.vocab_task,v=>r.vocab_task=v||null,'textarea');
      input(box,'随课任务（每行一项）',Array.isArray(r.attendance_tasks)?r.attendance_tasks.join('\n'):'',v=>r.attendance_tasks=v.split('\n').map(x=>x.trim()).filter(Boolean),'textarea');
      if(r.subject_rules)for(const [subject,tasks] of Object.entries(r.subject_rules))input(box,subject+'课后的配套任务（每行一项）',tasks.join('\n'),v=>r.subject_rules[subject]=v.split('\n').map(x=>x.trim()).filter(Boolean),'textarea');
    }
    const overrides=section('暂停或交给老师处理');overrides.open=true;
    for(const r of p.overrides||[]){
      const box=node('div');box.className='override';overrides.append(box);box.append(node('strong',`${r.student} · ${r.kind==='vocab'?'单词':r.subject||'任务'} · ${r.action==='pause'?'暂停':'老师安排'}`));
      input(box,'开始日期',r.start,v=>r.start=v||null,'date');input(box,'结束日期（留空持续生效）',r.end,v=>r.end=v||null,'date');
      input(box,'说明',r.reason,v=>r.reason=v,'textarea');
      const restore=node('button','恢复自动规则');restore.onclick=()=>{p.overrides=p.overrides.filter(x=>x!==r);render();};box.append(restore);
    }
    const add=node('button','添加暂停 / 人工安排');add.onclick=()=>{const student=prompt('学员姓名');if(!student?.trim())return;const subject=prompt('填写：单词、听力、阅读、口语或写作','单词');if(!['单词','听力','阅读','口语','写作'].includes(subject))return;p.overrides??=[];p.overrides.push({student:student.trim(),kind:subject==='单词'?'vocab':'suite',...(subject==='单词'?{}:{subject}),action:subject==='单词'?'pause':'teacher',start:new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Shanghai'}),end:null,reason:'老师在规则页面设置'});render();};overrides.append(add);
  }
  async function load(){
    const user=await client.auth.getUser();if(user.error||!user.data?.user){$('login').hidden=false;status('请用工作台账号登录');return;}
    const bound=await client.from('wayon_owner').select('user_id').eq('user_id',user.data.user.id).maybeSingle();if(bound.error||!bound.data)throw Error('OWNER');
    const result=await client.from('wayon_rule_catalog').select('revision,payload').eq('owner_id',user.data.user.id).single();if(result.error)throw Error('READ');
    state.owner=user.data.user.id;state.base=result.data;state.draft=structuredClone(result.data.payload);$('login').hidden=true;$('actions').hidden=false;render();status(`已读取统一规则 · 版本 ${state.base.revision}。保存后，下次 Action 使用此版本。`);
  }
  $('login').onsubmit=async event=>{event.preventDefault();const email=$('email').value.trim(),password=$('password').value;$('password').value='';const r=await client.auth.signInWithPassword({email,password});if(r.error){status('登录失败');return;}await load().catch(()=>status('规则读取失败，请重试'));};
  $('reload').onclick=()=>load().catch(()=>status('规则读取失败，当前输入保留'));
  $('save').onclick=async()=>{
    if(state.draft.frequency_rows.some(r=>r['重复']==='每周固定几天'&&!r['周几'].length)){status('每周规则至少选择一天');return;}
    $('save').disabled=true;status('正在保存并读回核验…');
    try{state.base=await saveCatalog(client,state.owner,state.base,state.draft);status(`已保存并核验 · 版本 ${state.base.revision}，下次 Action 生效`);}catch(e){status(e.message==='CONFLICT'?'另一设备已修改规则。当前输入保留，请重新读取后再保存。':'保存或读回未确认，当前输入保留，请重新读取核对。');}finally{$('save').disabled=false;}
  };
  await load().catch(()=>status('规则读取失败，请重试'));return state;
}
