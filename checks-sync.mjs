// Public module: no service-role key or Notion credential belongs here.
export const same = (a,b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
export function difference(before, after) {
  const patch = {};
  for (const k of new Set([...Object.keys(before), ...Object.keys(after)]))
    if (!same(before[k],after[k])) patch[k] = {before:before[k] ?? null, after:after[k] ?? null};
  return patch;
}
export function overlay(fields, operations) {
  const result = {...fields};
  for (const op of operations) for (const [k,v] of Object.entries(op.patch)) {
    if (v.after === null) delete result[k]; else result[k]=v.after;
  }
  return result;
}
export class CheckSync {
  constructor({client,owner,storage,capture,apply,status,uuid}) {
    Object.assign(this,{client,owner,storage,capture,apply,status,uuid});
    this.days = new Map(); this.running=false;
  }
  storageKey(day) {return `wayon-cloud-v1:${this.owner}:${day}`;}
  recoveryKey(day) {return this.storageKey(day)+':recovery';}
  preserveLocal(day,fields) {
    if(!Object.keys(fields).length) return;
    const key=this.recoveryKey(day),raw=this.storage.getItem(key);
    const backup=raw ? JSON.parse(raw) : {schema:1,owner:this.owner,day,snapshots:[]};
    if(backup.schema!==1 || backup.owner!==this.owner || backup.day!==day || !Array.isArray(backup.snapshots)) throw Error('RECOVERY_INVALID');
    if(same(backup.snapshots.at(-1)?.fields,fields)) return;
    backup.snapshots.push({captured_at:new Date().toISOString(),fields});
    this.storage.setItem(key,JSON.stringify(backup));
  }
  persist(day) {this.storage.setItem(this.storageKey(day),JSON.stringify(this.days.get(day).queue));}
  async read(day) {
    const {data,error}=await this.client.from('wayon_days').select('day,fields,revision').eq('owner_id',this.owner).eq('day',day).maybeSingle();
    if(error) throw Error('READ_FAILED');
    return data || {day,fields:{},revision:0};
  }
  async open(day) {
    if(this.days.has(day)) {const s=this.days.get(day); if(s.ready) this.show(day); return;}
    const s={ready:false,queue:[],view:this.capture(day)};this.days.set(day,s);
    try {
      const remote=await this.read(day);
      s.queue=JSON.parse(this.storage.getItem(this.storageKey(day)) || '[]');
      if(!Array.isArray(s.queue)) throw Error('QUEUE_INVALID');
      s.base=remote;
      const draft=difference(s.view,this.capture(day));
      s.ready=true;
      if(Object.keys(draft).length) {
        const current=overlay(remote.fields,s.queue);
        for(const [k,v] of Object.entries(draft)) v.before=current[k] ?? null;
        s.queue.push({id:this.uuid(),patch:draft});this.persist(day);
      }
      // Reconnecting a previously disabled build must not destroy unuploaded local input.
      // Keep a recovery copy; do not silently apply old marks to current tasks or upload them.
      this.preserveLocal(day,this.capture(day));
      this.show(day);await this.flush();
    } catch(e) {this.status('云端读取失败；本机输入保留，请重试');this.days.delete(day);}
  }
  show(day) {
    const s=this.days.get(day);if(!s?.ready) return;
    this.apply(day,overlay(s.base.fields,s.queue));s.view=this.capture(day);
  }
  observe(day) {
    const s=this.days.get(day);if(!s?.ready) {this.status('尚未连接云端，本机已保存');return;}
    const view=this.capture(day), delta=difference(s.view,view);
    if(!Object.keys(delta).length) return;
    const optimistic=overlay(s.base.fields,s.queue);
    for(const [k,v] of Object.entries(delta)) v.before=optimistic[k] ?? null;
    s.queue.push({id:this.uuid(),patch:delta});s.view=view;
    try {this.persist(day);} catch(e) {this.status('本机存储已满，尚未上传；请勿关闭网页');return;}
    this.status('正在保存云端记录…');void this.flush();
  }
  async flush() {
    if(this.running) return;this.running=true;let wrote=false;
    try {
      for(const [day,s] of this.days) while(s.ready && s.queue.length) {
        const op=s.queue[0];
        const {data,error}=await this.client.rpc('wayon_apply_patch',{p_day:day,p_operation:op.id,p_patch:op.patch});
        if(error) {this.status(error.code==='40001' ? '另一设备已修改同一项；本机输入保留，点击「处理冲突」' : '云端保存失败，本机待上传；联网后自动重试');return;}
        // Never replace the user's draft with an older in-flight snapshot.
        s.base=data;s.queue.shift();this.persist(day);wrote=true;
      }
      this.status(wrote ? '已保存云端记录' : '已读取云端记录');
    } catch(e) {this.status('云端保存失败，本机待上传；联网后自动重试');}
    finally {this.running=false;}
  }
  async refresh(day) {
    const s=this.days.get(day);if(!s?.ready) return this.open(day);
    if(s.queue.length) return this.flush();
    try {s.base=await this.read(day);this.show(day);this.status('已读取云端记录');}
    catch(e) {this.status('云端暂不可读，本机记录保留');}
  }
  async resolve(day) {
    const s=this.days.get(day);if(!s?.queue.length || this.running) return;
    const remote=await this.read(day), desired=overlay(remote.fields,s.queue), patch=difference(remote.fields,desired);
    s.base=remote;s.queue=Object.keys(patch).length ? [{id:this.uuid(),patch}] : [];
    this.persist(day);await this.flush();
  }
}
export async function passwordLogin({client,emailInput,passwordInput,status,connect}) {
  const email=emailInput.value.trim(), password=passwordInput.value;
  // Clear the DOM immediately; never put a password in localStorage, status or logs.
  passwordInput.value='';
  if(!email || !password) {status('请输入邮箱和密码');return false;}
  try {
    const {data,error}=await client.auth.signInWithPassword({email,password});
    if(error || !data?.session) {status('登录失败，请检查邮箱和密码');return false;}
    return (await connect(data.session)) !== false;
  } catch(e) {status('登录暂不可用，请重试');return false;}
}
export async function readChasingHistory(client,owner,through) {
  const rows=[],seen=new Set(),stops={};
  for(let offset=0;offset<100000;offset+=100){
    const {data,error}=await client.from('wayon_days').select('owner_id,day,fields').eq('owner_id',owner).lte('day',through).order('day',{ascending:false}).range(offset,offset+99);
    if(error || !Array.isArray(data))throw Error('HISTORY_UNKNOWN');
    for(const row of data){
      if(row.owner_id!==owner || typeof row.day!=='string' || row.day>through || seen.has(row.day) || !row.fields || typeof row.fields!=='object')throw Error('HISTORY_SCOPE');
      seen.add(row.day);rows.push(row);
    }
    if(data.length<100){
      rows.sort((a,b)=>b.day.localeCompare(a.day));
      for(const row of rows)for(const [raw,value] of Object.entries(row.fields)){
        let k;try{k=JSON.parse(raw);}catch(e){continue;}
        if(k?.[0]==='chasing-stop' && k.length===2 && !Object.hasOwn(stops,k[1])){
          const ids=Array.isArray(value)?value:value?.stopped_ids;if(!Array.isArray(ids))throw Error('STOP_UNKNOWN');
          stops[k[1]]={stopped_ids:ids.map(String)};
        }
      }
      const manual=[];
      for(const row of rows)for(const [raw,value] of Object.entries(row.fields)){
        if(value!=='no')continue;let k;try{k=JSON.parse(raw);}catch(e){continue;}
        if(!Array.isArray(k)||k.length!==7||k[0]!=='task'||k.at(-1)!=='mark')continue;
        const bytes=new TextEncoder().encode(JSON.stringify([row.day,...k.slice(0,-1)]));
        const digest=await crypto.subtle.digest('SHA-256',bytes);
        manual.push({name:k[1],id:'manual:'+Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join(''),title:k[4],date:row.day,source:'manual'});
      }
      // Self-study definitions and marks are private fields, not published source DATA.
      const uid=v=>typeof v==='string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(v);
      for(const row of rows)for(const [raw,value] of Object.entries(row.fields)){
        if(value!=='no')continue;let k;try{k=JSON.parse(raw);}catch{continue;}
        if(!Array.isArray(k)||k.length!==3||k[0]!=='study-mark'||!uid(k[1])||!uid(k[2]))continue;
        const card=row.fields[JSON.stringify(['study-card',k[1]])],task=row.fields[JSON.stringify(['study-task',k[1],k[2]])];
        if(!card||card.archivedAt||typeof card.studentName!=='string'||!card.studentName.trim()||typeof task?.text!=='string')continue;
        manual.push({name:card.studentName,id:`manual:study:${row.day}:${k[1]}:${k[2]}`,title:task.text,date:row.day,source:'manual'});
      }
      return {stops,manual};
    }
  }
  throw Error('HISTORY_LIMIT');
}
export async function boot({config,capture,apply,status,currentDay,hydrate}) {
  if(!config.enabled) {status('本机已保存；云端保存尚未配置');return null;}
  const panel=document.createElement('details');panel.className='cloud-panel';panel.open=true;
  const heading=document.createElement('summary');heading.textContent='账户与连接';
  const email=document.createElement('input');email.type='email';email.placeholder='你的登录邮箱';email.autocomplete='email';
  const password=document.createElement('input');password.type='password';password.placeholder='你的工作台密码';password.autocomplete='current-password';
  const button=(label,action)=>{const b=document.createElement('button');b.textContent=label;b.type='button';b.onclick=()=>Promise.resolve(action()).catch(()=>status('操作失败，请重试'));return b;};
  const sdk=await import('https://esm.sh/@supabase/supabase-js@2.49.4');
  const client=sdk.createClient(config.url,config.key);
  let engine=null, user=null;
  const login=button('登录',()=>passwordLogin({client,emailInput:email,passwordInput:password,status,connect}));
  password.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();login.click();}});
  const retry=button('重新连接',async()=>{if(engine) await engine.refresh(currentDay());else await connect((await client.auth.getSession()).data.session);});
  const conflict=button('处理冲突',async()=>{
    if(engine && confirm('将当前设备保留的修改保存到云端？其他未修改项目保持原样。')) await engine.resolve(currentDay());
  });
  const legacy=button('下载旧本机记录',()=>{
    const day=currentDay(),old=localStorage.getItem('wayon-before-cloud-'+day);
    const recovery=engine && localStorage.getItem(engine.recoveryKey(day));
    if(!old && !recovery){status('当天没有旧本机恢复副本');return;}
    const raw=JSON.stringify({legacy:old ? JSON.parse(old) : null,cloud_recovery:recovery ? JSON.parse(recovery) : null});
    const a=document.createElement('a'),url=URL.createObjectURL(new Blob([raw],{type:'application/json'}));
    a.href=url;a.download=`wayon-local-backup-${day}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  const logout=button('退出',async()=>{await client.auth.signOut();location.reload();});
  panel.append(heading,email,password,login,retry,conflict,legacy,logout);document.getElementById('sync').after(panel);
  async function connect(session) {
    if(!session) {panel.open=true;engine=null;email.hidden=password.hidden=login.hidden=false;status('请登录以保存云端记录；现有本机记录保留');return false;}
    const {data,error}=await client.from('wayon_owner').select('user_id');
    if(error || data?.length!==1 || data[0].user_id!==session.user.id) {panel.open=true;engine=null;email.hidden=password.hidden=login.hidden=false;status('此账号没有工作台权限');return false;}
    if(user && user!==session.user.id) {location.reload();return;}
    user=session.user.id;
    if(!engine) {
      if(hydrate) await hydrate(client,user);
      engine=new CheckSync({client,owner:user,storage:localStorage,capture,apply,status,uuid:()=>crypto.randomUUID()});
      email.hidden=password.hidden=login.hidden=true;panel.open=false;
      await engine.open(currentDay());
    }
  }
  await connect((await client.auth.getSession()).data.session);
  client.auth.onAuthStateChange((event,session)=>{
    // Avoid awaiting SDK calls while its auth lock is held.
    if(event==='SIGNED_IN' || event==='TOKEN_REFRESHED') setTimeout(()=>void connect(session),0);
    if(event==='SIGNED_OUT') void connect(null);
  });
  setInterval(()=>{if(engine && !document.activeElement?.matches('input,textarea')) void engine.refresh(currentDay());},15000);
  window.addEventListener('online',()=>void engine?.flush());
  window.addEventListener('focus',()=>{if(engine && !document.activeElement?.matches('input,textarea')) void engine.refresh(currentDay());});
  return {observe:day=>engine?.observe(day),open:day=>engine?.open(day),ready:day=>Boolean(engine?.days.get(day)?.ready)};
}
