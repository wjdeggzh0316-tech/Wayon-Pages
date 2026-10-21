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
    if(this.days.has(day)) {const s=this.days.get(day); if(s.ready) return this.refresh(day); return;}
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
    if(s.refreshing) return s.refreshing;
    s.refreshing=(async()=>{
      try {
        const remote=await this.read(day);
        // A foreground read may finish after a new local edit or a newer RPC.
        // Leave pending drafts and newer revisions intact; the next read catches up.
        if(s.queue.length || this.running || remote.revision<s.base.revision) return;
        if(remote.revision!==s.base.revision || !same(remote.fields,s.base.fields)) {
          s.base=remote;this.show(day);
        }
        this.status('已读取云端记录');
      } catch(e) {this.status('云端暂不可读，本机记录保留');}
    })();
    try {await s.refreshing;} finally {s.refreshing=null;}
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
  const rows=[],seen=new Set(),stops={},completed={};
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
        if(k?.[0]==='chasing-done' && k.length===2 && !Object.hasOwn(completed,k[1])){
          const ids=value?.completed_ids;if(!Array.isArray(ids))throw Error('COMPLETION_UNKNOWN');
          completed[k[1]]={completed_ids:ids.map(String)};
        }
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
      return {stops,manual,completed};
    }
  }
  throw Error('HISTORY_LIMIT');
}
// Parse the existing public source as JSON, never execute any fetched script.
export function publishedChasing(source) {
  const match=/\bconst DATA\s*=\s*/.exec(source);
  if(!match || source[match.index+match[0].length]!=='{')throw Error('PAGE_DATA_INVALID');
  const start=match.index+match[0].length;
  let depth=0,quoted=false,escaped=false,end=-1;
  for(let i=start;i<source.length;i++){
    const c=source[i];
    if(quoted){if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c==='"')quoted=false;continue;}
    if(c==='"')quoted=true;else if(c==='{')depth++;else if(c==='}'&&--depth===0){end=i+1;break;}
  }
  if(end<0)throw Error('PAGE_DATA_INVALID');
  const data=JSON.parse(source.slice(start,end));
  if(!Array.isArray(data._chasing) || !Number.isFinite(Date.parse(data._chasing_checked_at)) ||
     data._chasing.some(row=>!row || typeof row.name!=='string' || !Array.isArray(row.uncompleted_details) ||
       row.uncompleted_details.some(item=>!item || typeof item.title!=='string' || !['string','number'].includes(typeof item.id))))throw Error('CHASING_DATA_INVALID');
  return Object.fromEntries(['_chasing','_chasing_checked_at','_chasing_status','_chasing_unknown'].filter(k=>Object.hasOwn(data,k)).map(k=>[k,data[k]]));
}
export async function boot({config,capture,apply,status,currentDay,hydrate,refreshPublished}) {
  if(!config.enabled) {status('本机已保存；云端保存尚未配置');return null;}
  const panel=document.createElement('details');panel.className='cloud-panel';panel.open=false;
  const heading=document.createElement('summary');heading.textContent='账户与连接';
  const email=document.createElement('input');email.type='email';email.placeholder='你的登录邮箱';email.autocomplete='email';
  const password=document.createElement('input');password.type='password';password.placeholder='你的工作台密码';password.autocomplete='current-password';
  const button=(label,action)=>{const b=document.createElement('button');b.textContent=label;b.type='button';b.onclick=()=>Promise.resolve(action()).catch(()=>status('操作失败，请重试'));return b;};
  let sdk;
  try { sdk = await import('https://esm.sh/@supabase/supabase-js@2.49.4'); }
  catch(e1) {
    try { sdk = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.4/+esm'); }
    catch(e2) { sdk = await import('https://unpkg.com/@supabase/supabase-js@2.49.4/dist/module/index.js'); }
  }
  const client=sdk.createClient(config.url,config.key);
  let engine=null, user=null;
  const announceRefresh=async()=>{
    if(typeof client.functions?.invoke!=='function' || !engine || !user)return;
    const invoke=async(action,request_id)=>{
      if(!engine || !user)throw Error('LOGIN_REQUIRED');
      const {data,error}=await client.functions.invoke('wayon-refresh',{body:{action,...(request_id?{request_id}: {})}});
      if(error || !data){
        let code='BACKEND_UNAVAILABLE';try{code=(await error?.context?.json())?.error||code;}catch{}
        throw Error(code);
      }
      return data;
    };
    const api={enabled:false,start:id=>invoke('start',id),status:id=>invoke('status',id),
      reloadPublished:async()=>{if(!refreshPublished)throw Error('PAGE_UNAVAILABLE');return refreshPublished();}};
    globalThis.wayonRefreshAPI=api;
    try{api.enabled=(await invoke('capabilities')).enabled===true;}catch{}
    window.dispatchEvent(new Event('wayon-refresh-ready'));
  };
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
  panel.append(heading,email,password,login,retry,conflict,legacy,logout);
  const settings=document.getElementById('account-settings');
  const syncMount=document.getElementById('sync');
  if(settings) settings.append(panel);
  else if(!document.body.classList.contains('wayon-room')) {
    if(syncMount) syncMount.after(panel);
    else document.body.append(panel);
  }
  async function connect(session) {
    if(!session) {delete globalThis.wayonRefreshAPI;window.dispatchEvent(new Event('wayon-refresh-ready'));if(settings)settings.open=true;panel.open=true;engine=null;email.hidden=password.hidden=login.hidden=false;status('请登录以保存云端记录；现有本机记录保留');return false;}
    const {data,error}=await client.from('wayon_owner').select('user_id');
    if(error || data?.length!==1 || data[0].user_id!==session.user.id) {delete globalThis.wayonRefreshAPI;window.dispatchEvent(new Event('wayon-refresh-ready'));if(settings)settings.open=true;panel.open=true;engine=null;email.hidden=password.hidden=login.hidden=false;status('此账号没有工作台权限');return false;}
    if(user && user!==session.user.id) {location.reload();return;}
    user=session.user.id;
    if(!engine) {
      if(hydrate) await hydrate(client,user);
      const uuidGen=()=>(typeof crypto!=='undefined'&&typeof crypto.randomUUID==='function')?crypto.randomUUID():'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.random()*16|0;return (c==='x'?r:(r&0x3|0x8)).toString(16);});
      engine=new CheckSync({client,owner:user,storage:localStorage,capture,apply,status,uuid:uuidGen});
      email.hidden=password.hidden=login.hidden=true;panel.open=false;
      await engine.open(currentDay());
    }
    void announceRefresh();
  }
  await connect((await client.auth.getSession()).data.session);
  client.auth.onAuthStateChange((event,session)=>{
    // Avoid awaiting SDK calls while its auth lock is held.
    if(event==='SIGNED_IN' || event==='TOKEN_REFRESHED') setTimeout(()=>void connect(session),0);
    if(event==='SIGNED_OUT') void connect(null);
  });
  let publishedAt=0,publishedBusy=false;
  const refresh=async()=>{
    if(document.visibilityState==='hidden')return;
    if(engine && !document.activeElement?.matches('input,textarea'))await engine.refresh(currentDay());
    if(refreshPublished && !publishedBusy && Date.now()-publishedAt>=60000){
      publishedBusy=true;publishedAt=Date.now();
      try{await refreshPublished();}catch(e){/* Keep the last dated snapshot on transport failure. */}
      finally{publishedBusy=false;}
    }
  };
  setInterval(()=>void refresh(),15000);
  window.addEventListener('online',async()=>{if(engine)await engine.flush();await refresh();});
  window.addEventListener('focus',()=>void refresh());
  window.addEventListener('pageshow',()=>void refresh());
  window.addEventListener('wayon-refresh-published',()=>{publishedAt=0;void refresh();});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')void refresh();});
  document.addEventListener('focusout',()=>setTimeout(()=>void refresh(),0));
  void refresh();
  return {observe:day=>engine?.observe(day),open:day=>engine?.open(day),ready:day=>Boolean(engine?.days.get(day)?.ready)};
}

// Code-only presentation update: existing page DATA stays on the page, never transmitted.
(() => {
 if(typeof document==='undefined')return;
 const script=document.createElement('script');script.textContent="(() => {\n if(document.documentElement.dataset.wayonPresentation==='v2')return;\n document.documentElement.dataset.wayonPresentation='v2';\n const style=document.createElement('style');style.textContent=`\n.wayon-workbench .assigned-tasks{margin:14px 0 0;padding-left:22px;display:flex;flex-direction:column;gap:14px}\n.wayon-workbench .assigned-task{padding-left:2px;overflow-wrap:anywhere}\n.wayon-workbench .assigned-text{font-size:15px;line-height:1.6;white-space:pre-wrap}\n.wayon-workbench .assigned-details{margin:5px 0 0;padding-left:18px;color:var(--muted);font-size:12px;line-height:1.65}\n.wayon-workbench .assigned-status{column-span:all;margin:0 0 14px;color:var(--muted);font-size:12px;line-height:1.6}\n.wayon-workbench .assigned-copy{display:inline-flex;align-items:center;justify-content:center;width:40px;min-width:40px;height:40px;padding:0}\n.wayon-workbench .assigned-copy svg{width:19px;height:19px;pointer-events:none}\n.wayon-workbench .assigned-copy-status{margin-top:10px;font-size:12px;color:var(--muted)}\n.wayon-workbench .assigned-copy-status:empty{display:none}\n.wayon-workbench .assigned-copy-fallback{margin-top:10px}\n.wayon-workbench[data-mode=\"assigned\"] .bar-lbl,.wayon-workbench[data-mode=\"assigned\"] .track{display:none}\n@media(max-width:599px){.wayon-workbench .assigned-copy{width:44px;min-width:44px;height:44px}.wayon-workbench .assigned-text{font-size:16px}}\n\\n/* Card hierarchy: larger student name, bulk actions at top right, copy last. */\\n.wayon-workbench .head{justify-content:flex-end;align-items:center;gap:8px}\\n.wayon-workbench .head>.name{font-size:24px;line-height:1.35;font-weight:650;flex:1 1 180px;order:0}\\n.wayon-workbench .head>.meta{order:1}.wayon-workbench .head>.state{order:2}\\n.wayon-workbench .head>.small{order:3}.wayon-workbench .head>.study-actions{order:4;display:flex;align-items:center;flex-wrap:nowrap;gap:6px;margin:0}\\n.wayon-workbench .head>.copy{order:10;margin-left:2px}\\n.wayon-workbench .study-card .head{margin-bottom:0}\\n@media(max-width:599px){.wayon-workbench .head>.name{flex-basis:100%;font-size:22px;text-align:left}.wayon-workbench .head{gap:6px}.wayon-workbench .head>.meta{flex:1 1 100%;text-align:right}.wayon-workbench .head .small,.wayon-workbench .head .copy{padding:7px 9px;font-size:12px;min-height:40px}.wayon-workbench .head>.study-actions{gap:5px}}\\n\\n.wayon-workbench button,.wayon-workbench summary{letter-spacing:-.01em}.wayon-workbench .head .small,.wayon-workbench .head .copy{border-radius:10px;font-weight:500}.wayon-workbench .head>.study-actions{gap:6px}@media(max-width:599px){.wayon-workbench .head .small,.wayon-workbench .head .copy{font-size:11px;padding:7px 8px}.wayon-workbench .head>.study-actions{gap:4px}.wayon-workbench .view-switch button{font-size:12px;padding:8px 9px}.wayon-workbench .note-disclosure>summary{font-size:11px}}\\n\\n/* Apple system typography and a full-width wordmark. */\\n:root{--sans:-apple-system,BlinkMacSystemFont,\\'SF Pro Text\\',\\'Helvetica Neue\\',\\'PingFang SC\\',\\'Noto Sans CJK SC\\',\\'Microsoft YaHei\\',sans-serif}\\nbody.wayon-workbench{font-family:var(--sans);font-size:14px;font-weight:400;letter-spacing:-.012em;text-rendering:optimizeLegibility;-webkit-font-smoothing:antialiased}\\n.wayon-workbench button,.wayon-workbench input,.wayon-workbench textarea,.wayon-workbench select,.wayon-workbench summary{font-family:var(--sans);font-weight:400}\\n.wayon-workbench .app-layout{grid-template-rows:auto minmax(0,1fr)}\\n.wayon-workbench .app-brand{grid-column:1/-1;padding:clamp(10px,1.4vw,18px) clamp(24px,5vw,64px) clamp(6px,1vw,12px);border-bottom:1px solid var(--line);border-radius:0 0 20px 20px;overflow:hidden;background:var(--card);box-shadow:0 4px 20px rgba(0,0,0,.03);display:flex;align-items:flex-end;justify-content:space-between;gap:20px;position:relative}\n.wayon-workbench .brand-title{font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display','Inter','Helvetica Neue',sans-serif;font-size:clamp(76px,15vw,175px);line-height:.82;letter-spacing:-.065em;font-weight:550;color:var(--fg);margin:0;white-space:nowrap;user-select:none;-webkit-font-smoothing:antialiased}\n.wayon-workbench .brand-title:before{display:none!important;content:none!important}\n.wayon-workbench .brand-meta{font-size:13px;font-weight:500;letter-spacing:-.01em;color:var(--muted);align-self:flex-start;padding-top:6px;white-space:nowrap}\n.wayon-workbench .sidebar{grid-column:1;grid-row:2;padding-top:24px}.wayon-workbench .main-content{grid-column:2;grid-row:2}\n.wayon-workbench .head>.name{font-size:24px;font-weight:600;letter-spacing:-.025em;line-height:1.4}\n.wayon-workbench .task .txt,.wayon-workbench .study-task-text{font-size:15px;line-height:1.55;font-weight:400}\n.wayon-workbench .head button{font-weight:500}.wayon-workbench #view-title{font-weight:600;letter-spacing:-.035em}\n@media(max-width:859px){.wayon-workbench .app-brand{padding:10px 20px 8px;border-radius:0 0 16px 16px}.wayon-workbench .brand-title{font-size:clamp(52px,13vw,80px);line-height:.82}.wayon-workbench .brand-meta{font-size:12px}.wayon-workbench .sidebar-top{display:none}.wayon-workbench #tabs button{font-size:12px;padding:8px 5px}.wayon-workbench .head>.name{font-size:22px}}\n@media(max-width:599px){.wayon-workbench .app-brand{padding:8px 16px 6px;border-radius:0 0 14px 14px}.wayon-workbench .brand-title{font-size:clamp(42px,14vw,54px);line-height:.82}.wayon-workbench .brand-meta{display:none}}\n\n.wayon-workbench .sidebar-top,.wayon-workbench .nav-section:not(.date-section)>.section-label{display:none}\\n.wayon-workbench #tabs{display:flex;flex-direction:column;gap:5px;padding:0 4px}\n.wayon-workbench #tabs button{display:flex;align-items:center;gap:11px;min-height:40px;width:100%;padding:8px 14px;border:0;border-radius:10px;text-align:left;background:transparent;color:var(--fg-secondary);font-size:14px;font-weight:500;letter-spacing:-.015em;white-space:nowrap;transition:background .15s ease,color .15s ease}\n.wayon-workbench #tabs button:hover{background:var(--line);color:var(--fg)}\n.wayon-workbench #tabs button.on{background:var(--accent-subtle);color:var(--accent);font-weight:600}\n.wayon-workbench #tabs button:before{content:'';width:18px;height:18px;flex:none;background:currentColor;mask:var(--nav-icon) center/contain no-repeat;-webkit-mask:var(--nav-icon) center/contain no-repeat;opacity:.75}\n.wayon-workbench #tabs button.on:before{opacity:1}\n#nav-today{--nav-icon:url(data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22black%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Crect%20x%3D%223%22%20y%3D%224%22%20width%3D%2218%22%20height%3D%2218%22%20rx%3D%222%22%20ry%3D%222%22%2F%3E%3Cline%20x1%3D%2216%22%20y1%3D%222%22%20x2%3D%2216%22%20y2%3D%226%22%2F%3E%3Cline%20x1%3D%228%22%20y1%3D%222%22%20x2%3D%228%22%20y2%3D%226%22%2F%3E%3Cline%20x1%3D%223%22%20y1%3D%2210%22%20x2%3D%2221%22%20y2%3D%2210%22%2F%3E%3Ccircle%20cx%3D%2212%22%20cy%3D%2215%22%20r%3D%221.5%22%20fill%3D%22black%22%2F%3E%3C%2Fsvg%3E)}\n#nav-notice{--nav-icon:url(data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22black%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22M18%208A6%206%200%200%200%206%208c0%207-3%209-3%209h18s-3-2-3-9%22%2F%3E%3Cpath%20d%3D%22M13.73%2021a2%202%200%200%201-3.46%200%22%2F%3E%3C%2Fsvg%3E)}\n#nav-rooms{--nav-icon:url(data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22black%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Crect%20x%3D%223%22%20y%3D%223%22%20width%3D%2218%22%20height%3D%2218%22%20rx%3D%222%22%20ry%3D%222%22%2F%3E%3Cline%20x1%3D%223%22%20y1%3D%229%22%20x2%3D%2221%22%20y2%3D%229%22%2F%3E%3Cline%20x1%3D%229%22%20y1%3D%2221%22%20x2%3D%229%22%20y2%3D%229%22%2F%3E%3C%2Fsvg%3E)}\n.wayon-workbench .workspace-heading,.wayon-workbench .eyebrow,.wayon-workbench #view-title,.wayon-workbench #view-subtitle{display:none!important}\n.wayon-workbench .workspace-top-bar{display:flex;align-items:center;justify-content:space-between;gap:16px;margin:0 0 10px;flex-wrap:wrap}\n.wayon-workbench .workspace-top-bar .view-switch{margin:0}\n.wayon-workbench .workspace-top-bar .date-section{margin-left:auto;display:flex;align-items:center}\n.wayon-workbench .workspace-top-bar .date-section .section-label{display:none!important}\n.wayon-workbench .workspace-top-bar #days{display:inline-flex;flex-direction:row;align-items:center;gap:8px;padding:0}\n.wayon-workbench .workspace-sub-bar{display:flex;align-items:center;justify-content:flex-end;gap:12px;margin:0 0 16px auto;width:100%}\n.wayon-workbench #schedule-health{margin:0;font-size:11.5px;color:var(--muted);line-height:1.4}\n.wayon-workbench #schedule-health.health-ok{display:inline-flex;align-items:center;gap:5px;padding:3px 8px;border-radius:6px;background:transparent;color:var(--muted)}\n.wayon-workbench #schedule-health.health-ok::before{content:'';width:6px;height:6px;border-radius:50%;background:var(--done);flex:none}\n.wayon-workbench .study-slot{display:inline-flex;align-items:center}\n.wayon-workbench .study-toolbar{display:inline-flex;align-items:center;gap:8px;padding:0;margin:0}\n.wayon-workbench .study-toolbar .meta{display:none!important}\n.wayon-workbench #study-add{height:32px;min-height:32px;padding:0 12px;border-radius:8px;font-size:12px;font-weight:550;border:1px solid var(--line-strong);background:var(--card);color:var(--fg);box-shadow:0 1px 2px rgba(0,0,0,.03);cursor:pointer;white-space:nowrap;transition:all .15s ease}\n.wayon-workbench #study-add:hover{background:var(--line);color:var(--fg)}\n#day-picker{width:100%;min-height:42px;border:1px solid var(--line-strong);border-radius:10px;padding:8px 32px 8px 36px;background-color:var(--card);background-image:url(data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236e6e73%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Crect%20x%3D%223%22%20y%3D%224%22%20width%3D%2218%22%20height%3D%2218%22%20rx%3D%222%22%20ry%3D%222%22%2F%3E%3Cline%20x1%3D%2216%22%20y1%3D%222%22%20x2%3D%2216%22%20y2%3D%226%22%2F%3E%3Cline%20x1%3D%228%22%20y1%3D%222%22%20x2%3D%228%22%20y2%3D%226%22%2F%3E%3Cline%20x1%3D%223%22%20y1%3D%2210%22%20x2%3D%2221%22%20y2%3D%2210%22%2F%3E%3C%2Fsvg%3E),url(data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236e6e73%22%20stroke-width%3D%222.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%2F%3E%3C%2Fsvg%3E);background-position:left 11px center,right 11px center;background-repeat:no-repeat;background-size:15px 15px,11px 11px;appearance:none;-webkit-appearance:none;-moz-appearance:none;color:var(--fg);font:inherit;font-size:13.5px;font-weight:550;letter-spacing:-.01em;box-shadow:0 1px 3px rgba(0,0,0,.03);cursor:pointer;transition:border-color .15s ease,box-shadow .15s ease}\n#day-picker:hover{border-color:var(--accent)}\n#day-picker:focus{outline:none;border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-subtle)}\n.wayon-workbench #days .home-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;width:100%;min-height:34px;padding:6px 12px;border:1px solid rgba(0,113,227,.25);border-radius:9px;background:var(--accent-subtle);color:var(--accent);font-size:12px;font-weight:550;cursor:pointer;transition:all .16s ease}\n.wayon-workbench #days .home-btn:hover{background:var(--accent);color:#fff;border-color:var(--accent)}\n@media(max-width:859px){\n.wayon-workbench #tabs button{justify-content:center;min-height:44px;gap:6px;font-size:13px}\n.wayon-workbench #days .home-btn{width:auto;flex:none;min-height:40px;padding:8px 12px}\n}`;document.head.append(style);\n // Translate interface controls only. Student data, copy text, state and aria identities stay intact.\n(() => {\n  const labels = new Map(Object.entries({\n    '今天':'Today','待催':'Follow-ups','安排':'Planning',\n    '任务安排':'Tasks','完成记录':'Progress','课前 / 课后抽背':'Vocabulary Check',\n    '明日课程':'Tomorrow’s Classes','课程通知':'Class Notices','教室':'Rooms','教室使用':'Rooms',\n    '回到今天':'Today','回到明天':'Tomorrow','⟲ 回到今天':'⟲ Back to Today','⟲ 回到明天':'⟲ Back to Tomorrow',\n    '全部完成':'All Done','全部✅':'All Done','全部未完成':'All Not Done',\n    '复制':'Copy','再次复制':'Copy Again','再复制一次':'Copy Again',\n    '复制催交信息':'Copy Reminder','复制失败，请重试':'Retry Copy',\n    '请手动选中下方文字复制':'Copy Manually','已复制并收纳 · 展开':'Copied · Expand',\n    '停止催缴':'Stop Reminders','恢复催缴':'Resume Reminders',\n    '重置复制标记':'Reset Copy','移除':'Remove','撤销':'Undo','收起':'Collapse','收起 ▴':'Collapse',\n    '添加备注':'Add Note','查看 / 编辑备注':'Edit Note',\n    '＋ 新增自习任务':'+ Self-study Task','+ 添加一项任务':'+ Add Task',\n    '保存到今日任务':'Save Tasks','取消':'Cancel','关闭':'Close',\n    '收起编辑':'Close Editor','✎ 编辑/粘贴任务':'Edit Tasks',\n    '⚡ 识别并应用任务':'Apply Tasks','⚡ 识别并替换完成情况':'Apply Progress',\n    '恢复默认任务':'Restore Default','重置当前板块记录':'Reset View',\n    '设置与账户':'Settings & Account','账户与连接':'Account & Connection',\n    '登录':'Sign In','重新连接':'Reconnect','处理冲突':'Resolve Conflict',\n    '下载旧本机记录':'Download Backup','退出':'Sign Out',\n    '未标':'Unmarked','✅ 完成':'✅ Done','❌ 未完成':'❌ Not Done',\n    '清空':'Clear','从大厅删除':'Remove from Hall'\n  }));\n  const translate = () => {\n    for (const e of document.querySelectorAll('button, summary')) {\n      // Do not replace controls containing child widgets or user-supplied task text.\n      if (e.children.length) continue;\n      const text=e.textContent.trim();\n      const value=labels.get(text) || (/^(?:✅ |☐ )?课前$/.test(text)?'Before Class'+(text.includes('✅')?' ✓':''):\n        /^(?:✅ |☐ )?课后$/.test(text)?'After Class'+(text.includes('✅')?' ✓':''):null);\n      if (value && value!==text) e.textContent=value;\n    }\n  };\n  new MutationObserver(translate).observe(document.body,{subtree:true,childList:true,characterData:true});\n  translate();\n})();\n\n if(!document.body.classList.contains('wayon-workbench') || document.querySelector('.app-brand'))return;\n const layout=document.querySelector('.app-layout'),brand=document.createElement('header');brand.className='app-brand';\n const wordmark=document.createElement('h1');wordmark.className='brand-title';wordmark.textContent='Wayon';brand.append(wordmark);const meta=document.createElement('span');meta.className='brand-meta';meta.textContent='Teaching Workspace';brand.append(meta);layout.prepend(brand);\n document.querySelector('.sidebar-top .brand-title')?.remove();\n// Display only: assignment evidence never changes manual marks or cloud fields.\nfunction renderAssigned(){\n  const record=(DATA._assigned||{})[cur];\n  const status=['verified','partial','unavailable'].includes(record?.status)?record.status:'unavailable';\n  const count=document.getElementById('count');document.getElementById('fill').style.width='0%';\n  const message=value=>{const p=document.createElement('div');p.className='sub';p.textContent=value;list.append(p);};\n  if(status==='unavailable'){count.textContent='布置记录未读取';message('该日布置记录尚未读取');return;}\n  const students=(Array.isArray(record.students)?record.students:[]).map(student=>({\n    name:typeof student.name==='string'?student.name.replace(/[【】「」]/g,'').trim():'',\n    tasks:(Array.isArray(student.tasks)?student.tasks:[]).filter(task=>typeof task.text==='string'&&task.text.trim()).map(task=>({\n      text:task.text.trim(),details:[...new Set((Array.isArray(task.details)?task.details:[]).filter(value=>typeof value==='string'&&value.trim()).map(value=>value.trim()))]\n    }))\n  })).filter(student=>student.name&&student.tasks.length);\n  const taskCount=students.reduce((total,student)=>total+student.tasks.length,0);\n  count.textContent=students.length+' 人 · '+taskCount+' 项已布置';\n  if(status==='partial'){const p=document.createElement('p');p.className='assigned-status';p.setAttribute('role','status');p.textContent='以下为已核验的布置记录，其他记录尚未完整读取。';list.append(p);}\n  if(!students.length){message(status==='verified'?'该日没有已核验的布置记录':'暂无可显示的已核验布置记录');return;}\n  for(const student of students){\n    const card=document.createElement('section');card.className='item assigned-card';\n    const head=document.createElement('div');head.className='head';\n    const name=document.createElement('div');name.className='name';name.textContent=student.name;\n    const meta=document.createElement('div');meta.className='meta';meta.textContent=student.tasks.length+' 项已布置';\n    const copy=document.createElement('button');copy.type='button';copy.className='copy assigned-copy';copy.title='复制已布置任务';copy.setAttribute('aria-label','复制已布置任务');\n    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');svg.setAttribute('stroke-width','1.7');svg.setAttribute('aria-hidden','true');\n    const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d','M8 8h12v12H8z M16 8V4H4v12h4');svg.append(path);copy.append(svg);\n    const feedback=document.createElement('div');feedback.className='assigned-copy-status';feedback.setAttribute('role','status');\n    const fallback=document.createElement('pre');fallback.className='assigned-copy-fallback';fallback.hidden=true;fallback.tabIndex=0;fallback.setAttribute('aria-label','可手动复制的已布置任务');\n    copy.onclick=()=>{\n      const value=['【'+student.name+'】'+cur+' 已布置任务','',...student.tasks.flatMap((task,i)=>[(i+1)+'、'+task.text,...task.details.map(detail=>'  '+detail)])].join('\\n');\n      const success=()=>{feedback.textContent='已复制';fallback.hidden=true;};\n      const fail=()=>{feedback.textContent='复制失败，请手动选中下方文字复制。';fallback.textContent=value;fallback.hidden=false;};\n      try{if(navigator.clipboard?.writeText){navigator.clipboard.writeText(value).then(success,fail);return;}}catch{}\n      const temporary=document.createElement('textarea');temporary.value=value;temporary.style.position='fixed';temporary.style.opacity='0';document.body.append(temporary);temporary.focus();temporary.select();\n      let copied=false;try{copied=document.execCommand('copy')===true;}catch{}temporary.remove();if(copied)success();else fail();\n    };\n    head.append(name,meta,copy);card.append(head);\n    const tasks=document.createElement('ol');tasks.className='assigned-tasks';\n    for(const task of student.tasks){\n      const row=document.createElement('li');row.className='assigned-task';\n      const text=document.createElement('div');text.className='assigned-text';text.textContent=task.text;row.append(text);\n      if(task.details.length){const details=document.createElement('ul');details.className='assigned-details';for(const detail of task.details){const item=document.createElement('li');item.textContent=detail;details.append(item);}row.append(details);}\n      tasks.append(row);\n    }\n    card.append(tasks,feedback,fallback);list.append(card);\n  }\n}\n\n const renderNew = function render(){\n  if (mode === 'classroom' && document.getElementById('classroom-frame')) return;\n  const rows = DATA[cur] || [];\n  const shown = mode === \"notice\" ? curN : cur;\n  document.getElementById(\"d\").textContent = rel(shown) + mdOf(shown);\n  const group = mode === 'notice' ? 'notice' : mode === 'classroom' ? 'rooms' : 'today';\n  const days = document.getElementById('days'); days.textContent = '';\n  const dlist = mode === 'notice' ? [...new Set([...Object.keys(NOTICE),tomorrow,curN])].sort() : [...new Set([...DAYS,...(mode==='assigned'?Object.keys(DATA._assigned||{}):[]),today,cur])].sort();\n  const picker=document.createElement('select');picker.id='day-picker';picker.setAttribute('aria-label','查看日期');\n  for(const day of dlist){const o=document.createElement('option');o.value=day;o.textContent=rel(day)+mdOf(day);o.selected=day===shown;picker.append(o);}\n  picker.onchange=()=>{if(mode==='notice'){curN=picker.value;nload();render();nwatch();}else{cur=picker.value;load();pload();render();watch();}};\n  const isDefaultDay = shown === (mode === 'notice' ? tomorrow : today);\n  const home=document.createElement('button');home.type='button';home.className='home-btn';\n  home.textContent=mode==='notice'?'⟲ 回到明天':'⟲ 回到今天';\n  home.hidden=isDefaultDay;\n  home.onclick=()=>{if(mode==='notice'){curN=tomorrow;nload();render();nwatch();}else{cur=today;load();pload();render();watch();}};\n  let topBar=document.querySelector('.workspace-top-bar');if(!topBar){topBar=document.createElement('div');topBar.className='workspace-top-bar';const subtabs=document.getElementById('subtabs');subtabs?.parentNode?.insertBefore(topBar,subtabs);if(subtabs)topBar.append(subtabs);const dateSec=document.querySelector('.date-section');if(dateSec)topBar.append(dateSec);}\n  let subBar=document.querySelector('.workspace-sub-bar');if(!subBar){subBar=document.createElement('div');subBar.className='workspace-sub-bar';const health=document.getElementById('schedule-health');health?.parentNode?.insertBefore(subBar,health);if(health)subBar.append(health);const slot=document.createElement('div');slot.id='study-slot';slot.className='study-slot';subBar.append(slot);}\n  days.append(picker,home);document.querySelector('.date-section').hidden=['chasing','classroom'].includes(mode);\n  const studySlot=document.getElementById('study-slot');if(studySlot){studySlot.textContent='';studySlot.style.display=['plan','done'].includes(mode)?'':'none';}\n  const tabs=document.getElementById('tabs');tabs.textContent='';\n  for(const [id,label,initial] of [['today','今天',bjHour<13?'plan':'done'],['notice','课程通知','notice'],['rooms','教室','classroom']]){\n    const b=document.createElement('button');b.type='button';b.id='nav-'+id;b.textContent=label;b.className=group===id?'on':'';b.setAttribute('aria-pressed',String(group===id));\n    b.onclick=()=>{mode=initial;render();};tabs.append(b);\n  }\n  const subtabs=document.getElementById('subtabs');subtabs.textContent='';\n  const sections=group==='today'?[['plan','任务安排'],['done','完成记录'],['quiz','课前 / 课后抽背'],['assigned','今日已布置'],['chasing','待催']]:[];\n  for(const [id,label] of sections){const b=document.createElement('button');b.type='button';b.id='tab-'+id;b.textContent=label;b.title=label;b.setAttribute('aria-label',label);b.className=mode===id?'on':'';b.setAttribute('aria-pressed',String(mode===id));b.onclick=()=>{mode=id;render();};subtabs.append(b);}\n  subtabs.hidden=!sections.length;\n  document.getElementById(\"ttl\").textContent = mode === \"plan\" ? \"任务安排\" : mode === \"quiz\" ? \"单词抽背情况\" : mode === \"notice\" ? \"课程通知\" : mode === \"assigned\" ? \"今日已布置\" : mode === \"chasing\" ? \"待催作业\" : mode === \"classroom\" ? \"教室使用\" : \"任务完成情况\";\n  document.getElementById('view-title').textContent={today:'今天',notice:'课程通知',rooms:'教室使用'}[group];\n  document.getElementById(\"view-subtitle\").textContent=rel(shown)+mdOf(shown)+\" · \"+document.getElementById(\"ttl\").textContent;\n  document.getElementById(\"sub\").textContent = mode === \"notice\"\n    ? \"每个有课的学生一张卡片（默认显示明天的课）。点「复制」发给学生 / 家长，卡片记下已复制时间。\"\n    : mode === \"quiz\"\n    ? \"只用来记录今天有没有给学生抽背：一个学生 + 一节课一行（班课拆开每人一行），课前抽了点「课前」，课后抽了点「课后」，再点一下取消。\"\n    : mode === \"plan\"\n    ? \"每人一份当天计划，点「复制」贴到群里。系统是否已布置见卡片提示，完成情况另行记录。\"\n    : mode === \"chasing\"\n    ? \"本系统发布台账与老师明确未完成的任务催缴清单，点「复制催交信息」贴到群里催缴，复制后卡片自动收纳到底部。\"\n    : mode === \"classroom\"\n    ? \"各教室排课与自习占用情况（支持点击格子修改、拖拽排课与时间重叠两两冲突检测）。\"\n    : \"点每条任务右边的按钮切换 未标 → ✅ → ❌；需要说明就写在备注里。标完点「复制」，贴到群里。任务以备忘录里的最新内容为准。\";\n  list.textContent = \"\";\n  document.getElementById('reset').hidden=mode==='assigned';\n  const healthDay = mode === \"notice\" ? curN : cur;\n  const health = (DATA._schedule_status || {})[healthDay];\n  const healthBox = document.getElementById(\"schedule-health\");\n  const showHealth = !['assigned', 'chasing', 'classroom'].includes(mode) && health;\n  healthBox.className=\"health-box \"+(health?.status==='error'?'health-error':'health-ok');\n  const shTime = value => value ? new Date(value).toLocaleString(\"zh-CN\", {timeZone:\"Asia/Shanghai\", hour12:false}) : \"未记录\";\n  healthBox.textContent = !showHealth ? \"\" : health.status === \"error\"\n    ? \"⚠️ \" + healthDay + \" 课表／页面未确认更新；旧内容仅供参考。上次成功核对：\" + shTime(health.last_success_at) + \"；本次检查：\" + shTime(health.checked_at)\n    : \"课表核对时间（北京时间）：\" + shTime(health.checked_at);\n  if(typeof study!=='undefined' && ['plan','done'].includes(mode)){study.toolbar(list,cur,[...(DATA[cur]||[]).map(r=>r[0]),...(PLAN[cur]||[]).map(r=>r[0])]);const bar=list.querySelector('.study-toolbar');if(bar&&studySlot)studySlot.append(bar);}\n  if(mode==='assigned'){\n    document.body.setAttribute('data-mode',mode);\n    document.querySelector('.bar').style.display='';document.getElementById('days').style.display='';\n    renderAssigned();return;\n  }\n  if (showHealth && health.status === \"error\" && !(mode === \"notice\" ? (NOTICE[healthDay] || []).length : rows.length)) {\n    const warning = document.createElement(\"div\"); warning.className = \"sub\";\n    warning.textContent = \"读取或刷新失败，无法确认是否有课／有任务；没有可显示的旧记录。\";\n    list.append(warning); document.getElementById(\"count\").textContent = \"状态未知\";\n    document.getElementById(\"fill\").style.width = \"0%\";\n    if(typeof study!=='undefined' && ['plan','done'].includes(mode))study.renderCards(list,cur,mode);\n    return;\n  }\n  document.body.setAttribute(\"data-mode\", mode);\n  if (mode === \"classroom\") { document.querySelector(\".bar\").style.display = \"none\";\n    document.getElementById(\"days\").style.display = \"none\";\n    if (!document.getElementById(\"classroom-frame\")) {\n      list.textContent = \"\";\n      renderClassroom();\n    }\n    return; } else {\n    document.querySelector(\".bar\").style.display = \"\";\n    document.getElementById(\"days\").style.display = \"\";\n  }\n  if (mode === \"notice\") { renderNotice(); return; }\n  if (mode === \"plan\") { renderPlan(); return; }\n  if (mode === \"chasing\") { renderChasing(); return; }\n  if (mode === \"quiz\") { renderQuiz(rows); const qr = quizRows(rows), n = qr.filter(r => qget(qk(r)).pre && qget(qk(r)).post).length;\n    document.getElementById(\"count\").textContent = n + \" / \" + qr.length + \" 课前课后都抽了\";\n    document.getElementById(\"fill\").style.width = (qr.length ? n / qr.length * 100 : 0) + \"%\"; return; }\n  if(typeof study!=='undefined')study.renderCards(list,cur,'done');\n  if (!rows.length) { if(typeof study!=='undefined' && study.cards(cur).length){summary(rows);return;} const e = document.createElement(\"div\"); e.className = \"sub\"; e.textContent = (cur in DATA) ? (\"🎉 \" + rel(cur) + mdOf(cur) + \" 暂无排课与自习任务，全天无任务安排。\") : (\"这天还没生成（\" + rel(cur) + mdOf(cur) + \" 的任务清单要先跑 tasks / sync-notes）。\"); list.append(e); summary(rows); return; }\n  const bottomD = [];\n  rows.forEach((r, ri) => {\n    const s = get(r[0]);\n    const currentTasks = getTasks(r[0], r[3]);\n    const el = document.createElement(\"div\"); el.className = \"item\" + (s.c ? \" copied\" : \"\");\n    const head = document.createElement(\"div\"); head.className = \"head\";\n    const name = document.createElement(\"div\"); name.className = \"name\"; name.textContent = (ri+1) + \". \" + r[0].replace(/[【】「」]/g, \"\");\n    const okn = currentTasks.filter((t,i) => taskVisible(r[0],t) && mk(s,t,i) === \"ok\").length;\n    const meta = document.createElement(\"div\"); meta.className = \"meta\"; meta.textContent = r[1] + \" · 完成 \" + okn + \"/\" + currentTasks.filter(t => taskVisible(r[0],t)).length;\n    head.append(name, meta);\n    if (s.c){ const x = document.createElement(\"div\"); x.className = \"state\"; x.textContent = \"✓ 已复制 \" + s.c; head.append(x); }\n    const pre = document.createElement(\"pre\"); pre.hidden = true; pre.textContent = text(r);\n    const b = document.createElement(\"button\"); b.type = \"button\"; b.className = \"copy\"; b.id = \"copy-\" + ri;\n    b.textContent = s.c ? \"再复制一次\" : \"复制\";\n    b.onclick = () => {\n      const mark = () => { s.c = new Date().toLocaleTimeString(\"zh-CN\",{hour:\"2-digit\",minute:\"2-digit\"}); save(); render(); };\n      const fail = () => { b.textContent = \"请手动选中下方文字复制\"; pre.textContent = text(r); pre.hidden = false; };\n      try { navigator.clipboard.writeText(text(r)).then(mark, fail); } catch(e) { fail(); }\n    };\n    head.append(b);\n    const all = document.createElement(\"button\"); all.type = \"button\"; all.className = \"small\"; all.textContent = \"全部✅\";\n    all.onclick = () => { currentTasks.forEach((t,i) => { if(taskVisible(r[0],t)) s.m[i] = \"ok\"; }); s.c = \"\"; save(); render(); };\n    head.append(all);\n    const none=document.createElement('button');none.type='button';none.className='small';none.textContent='全部未完成';\n    none.onclick=()=>{currentTasks.forEach((t,i)=>{if(taskVisible(r[0],t))s.m[i]='no';});s.c='';save();render();};head.append(none);\n    const editBtn = document.createElement(\"button\"); editBtn.type = \"button\"; editBtn.className = \"small edit-btn\";\n    editBtn.textContent = openEditors.has(r[0]) ? \"收起编辑\" : \"✎ 编辑/粘贴任务\";\n    editBtn.onclick = () => {\n      if (openEditors.has(r[0])) openEditors.delete(r[0]);\n      else openEditors.add(r[0]);\n      render();\n    };\n    head.append(editBtn);\n    el.append(head);\n    if (openEditors.has(r[0])) {\n      const editor = document.createElement(\"div\"); editor.className = \"task-editor\";\n      const tip = document.createElement(\"div\"); tip.className = \"sub\"; tip.style.marginBottom = \"6px\"; tip.style.fontWeight = \"600\";\n      tip.textContent = \"📋 粘贴任务文本自动识别替换（支持整段微信/群聊通知）：\";\n      const ta = document.createElement(\"textarea\"); ta.className = \"editor-area\"; ta.rows = 4;\n      ta.placeholder = \"可直接粘贴群内任务安排，例如：\\n【\" + r[0] + \"】10月17日任务安排\\n1、单词抽背\\n2、听力精练\\n3、课后作业\";\n      const btnRow = document.createElement(\"div\"); btnRow.style.display = \"flex\"; btnRow.style.gap = \"8px\"; btnRow.style.marginTop = \"6px\"; btnRow.style.flexWrap = \"wrap\";\n      const applyBtn = document.createElement(\"button\"); applyBtn.type = \"button\"; applyBtn.className = \"small\";\n      applyBtn.style.background = \"var(--accent)\"; applyBtn.style.color = \"#ffffff\"; applyBtn.style.borderColor = \"var(--accent)\"; applyBtn.style.fontWeight = \"600\";\n      applyBtn.textContent = \"⚡ 识别并替换完成情况\";\n      applyBtn.onclick = () => {\n        const parsed = parseTasks(ta.value);\n        if (!parsed.length) { alert(\"未能识别出有效任务行，请直接粘贴每行一项任务或带编号的文本。\"); return; }\n        s.tk = parsed.map(x => x.text);\n        s.m = {}; s.n = {};\n        parsed.forEach((x, idx) => {\n          if (x.mark) s.m[idx] = x.mark;\n          if (x.note) s.n[idx] = x.note;\n        });\n        s.c = \"\"; openEditors.delete(r[0]); save(); render();\n      };\n      const resetBtn = document.createElement(\"button\"); resetBtn.type = \"button\"; resetBtn.className = \"small\";\n      resetBtn.textContent = \"恢复默认任务\";\n      resetBtn.onclick = () => {\n        delete s.tk; s.m = {}; s.n = {}; s.c = \"\"; openEditors.delete(r[0]); save(); render();\n      };\n      const closeBtn = document.createElement(\"button\"); closeBtn.type = \"button\"; closeBtn.className = \"small\";\n      closeBtn.textContent = \"关闭\";\n      closeBtn.onclick = () => { openEditors.delete(r[0]); render(); };\n      btnRow.append(applyBtn, resetBtn, closeBtn);\n      editor.append(tip, ta, btnRow);\n      el.append(editor);\n    }\n    const tasks = document.createElement(\"div\"); tasks.className = \"tasks\";\n    currentTasks.forEach((t, i) => {\n      if (!taskVisible(r[0], t)) return;\n      const v = mk(s, t, i);\n      const row = document.createElement(\"div\"); row.className = \"task \" + v;\n      const m = document.createElement(\"button\"); m.type = \"button\"; m.className = \"mark\"; m.id = \"m-\" + ri + \"-\" + i;\n      m.textContent = v === \"ok\" ? \"✅ 完成\" : v === \"no\" ? \"❌ 未完成\" : \"未标\";\n      m.onclick = () => { s.m[i] = !v ? \"ok\" : v === \"ok\" ? \"no\" : \"\"; s.c = \"\"; save(); render(); };\n      const tx = document.createElement(\"textarea\"); tx.rows=1; tx.className = \"txt\"; tx.id = \"tx-\" + ri + \"-\" + i;\n      tx.value = t[0];\n      tx.title = \"点击可直接编辑修改任务\";\n      tx.setAttribute(\"aria-label\",r[0]+\"的第\"+(i+1)+\"项任务\");\n      const sizeText=()=>{tx.style.height=\"auto\";tx.style.height=tx.scrollHeight+\"px\";};\n      tx.oninput=sizeText;requestAnimationFrame(sizeText);\n      tx.onchange = () => {\n        const next = tx.value.trim() || t[0];\n        if (next === t[0]) return;\n        if (!Array.isArray(s.tk)) s.tk = currentTasks.map(x => x[0]);\n        s.tk[i] = next;\n        if (s.m) delete s.m[i];\n        if (s.n) delete s.n[i];\n        s.c = \"\"; save(); pre.textContent = text(r); summary(rows);\n      };\n      const note = document.createElement(\"input\"); note.className = \"note\"; note.id = \"n-\" + ri + \"-\" + i; note.placeholder = \"备注（可不填）\"; note.value = nt(s, t, i); note.setAttribute(\"aria-label\",r[0]+\"的第\"+(i+1)+\"项备注\");\n      note.oninput = () => { s.n[i] = note.value; if (s.c) { s.c = \"\"; } save(); pre.textContent = text(r); summary(rows); };\n      const del = document.createElement(\"button\"); del.type = \"button\"; del.className = \"del-btn\"; del.id = \"del-\" + ri + \"-\" + i;\n      del.textContent = \"×\"; del.title = \"删除此任务\";del.setAttribute(\"aria-label\",\"删除第\"+(i+1)+\"项任务\");\n      del.onclick = () => {\n        if (!Array.isArray(s.tk)) s.tk = currentTasks.map(x => x[0]);\n        s.tk.splice(i, 1);\n        const newM = {}, newN = {};\n        Object.keys(s.m || {}).forEach(k => {\n          const idx = Number(k);\n          if (idx < i) newM[idx] = s.m[idx];\n          else if (idx > i) newM[idx - 1] = s.m[idx];\n        });\n        Object.keys(s.n || {}).forEach(k => {\n          const idx = Number(k);\n          if (idx < i) newN[idx] = s.n[idx];\n          else if (idx > i) newN[idx - 1] = s.n[idx];\n        });\n        s.m = newM; s.n = newN; s.c = \"\"; save(); render();\n      };\n      row.append(m, tx, noteDisclosure(note), del); tasks.append(row);\n    });\n    const opRow = document.createElement(\"div\"); opRow.style.display = \"flex\"; opRow.style.gap = \"8px\"; opRow.style.marginTop = \"4px\"; opRow.style.alignItems = \"center\"; opRow.style.flexWrap = \"wrap\";\n    const addBtn = document.createElement(\"button\"); addBtn.type = \"button\"; addBtn.className = \"small add-btn\";\n    addBtn.textContent = \"+ 添加一项任务\";\n    addBtn.onclick = () => {\n      if (!Array.isArray(s.tk)) s.tk = currentTasks.map(x => x[0]);\n      s.tk.push(\"新任务\");\n      s.c = \"\"; save(); render();\n    };\n    opRow.append(addBtn);\n    if (Array.isArray(s.tk)) {\n      const customTag = document.createElement(\"span\"); customTag.className = \"sub\"; customTag.style.color = \"var(--accent)\"; customTag.textContent = \"(已自定义 \" + s.tk.length + \" 项任务)\";\n      opRow.append(customTag);\n    }\n    tasks.append(opRow);\n    el.append(tasks, pre);\n    placeCard(el, !!s.c, \"done:\" + cur + \":\" + r[0], (ri+1) + \". \" + r[0].replace(/[【】「」]/g, \"\"), s.c, bottomD);\n  });\n  bottomD.forEach(e => list.append(e));\n  summary(rows);\n};\n globalThis.render=function(){renderNew();for(const card of document.querySelectorAll('.study-card')){const head=card.querySelector('.head'),batch=card.querySelector('.study-actions');if(head&&batch&&!head.contains(batch))head.append(batch);}};\n globalThis.render();\n})();";
 document.body.append(script);script.remove();
})();

// Data-free room runtime patch: preserve iframe before parent clears its list.
(() => {if(typeof document==='undefined')return;const script=document.createElement('script');script.textContent="(() => {\n if(!document.body.classList.contains('wayon-workbench')||globalThis.wayonRoomRuntimeFixed)return;\n globalThis.wayonRoomRuntimeFixed=true;\n const original=globalThis.render;\n globalThis.render=function(){if(mode==='classroom'&&document.getElementById('classroom-frame'))return;return original();};\n globalThis.renderClassroom=function renderClassroom(){\n  document.querySelector(\".bar\").style.display = \"none\";\n  document.getElementById(\"days\").style.display = \"none\";\n  if (document.getElementById(\"classroom-frame\")) return;\n  const topBar = document.createElement(\"div\");\n  topBar.style.display = \"flex\";\n  topBar.style.justifyContent = \"flex-end\";\n  topBar.style.alignItems = \"center\";\n  topBar.style.marginBottom = \"8px\";\n  const fullLink = document.createElement(\"a\");\n  fullLink.href = \"./rooms.html?v=20261018-07\";\n  fullLink.target = \"_blank\";\n  fullLink.style.fontSize = \"13px\";\n  fullLink.style.color = \"var(--accent)\";\n  fullLink.style.textDecoration = \"none\";\n  fullLink.style.fontWeight = \"600\";\n  fullLink.textContent = \"全屏新窗口打开 ↗\";\n  topBar.append(fullLink);\n  const frame = document.createElement(\"iframe\");\n  frame.id = \"classroom-frame\";\n  frame.src = \"./rooms.html?v=20261018-07\";\n  frame.style.width = \"100%\";\n  frame.style.height = \"85vh\";\n  frame.style.minHeight = \"720px\";\n  frame.style.border = \"1px solid var(--line)\";\n  frame.style.borderRadius = \"8px\";\n  frame.style.background = \"var(--card)\";\n  list.append(topBar, frame);\n};\n})();";document.body.append(script);script.remove();})();

// Presentation only: keep original nodes, event handlers, state keys and accessible action names.
(() => {
  if(typeof document==='undefined'||globalThis.wayonIconControls)return;
  globalThis.wayonIconControls=true;
  const paths={
    assigned:'M7 3h10v4H7z M5 5H3v17h18V5h-2 M7 14l3 3 7-7',
    pending:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
    clock:'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0 M12 5v7l-4 4',books:'M3 3h4v18H3z M10 3h4v18h-4z M17 3h4v18h-4z',
    copy:'M8 8h12v12H8z M16 8V4H4v12h4',
    edit:'M4 20l4-1L20 7l-3-3L5 16z M14 7l3 3',
    trash:'M4 7h16 M9 7V4h6v3 M6 7l1 13h10l1-13 M10 10v7 M14 10v7',
    plus:'M12 5v14 M5 12h14',
    down:'M5 9l7 7 7-7',up:'M5 15l7-7 7 7',
    note:'M20 15a3 3 0 0 1-3 3H9l-5 3V6a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3z M8 8h8 M8 12h5',
    settings:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M10 3h4l1 3 3 1 3-1 2 4-2 2v3l2 2-2 4-3-1-3 1-1 3h-4l-1-3-3-1-3 1-2-4 2-2v-3l-2-2 2-4 3 1 3-1z',
    undo:'M9 5L4 10l5 5 M4 10h9a7 7 0 0 1 7 7',
    check:'M5 12l4 4L20 5',close:'M6 6l12 12 M18 6L6 18',refresh:'M20 7v5h-5 M20 12a8 8 0 1 0-2 6',login:'M14 3h6v18h-6 M3 12h13 M11 7l5 5-5 5',download:'M12 3v12 M7 10l5 5 5-5 M4 17v4h16v-4',calendar:'M3 5h18v16H3z M7 3v4 M17 3v4 M3 10h18',room:'M3 3h18v18H3z M3 9h18 M9 9v12',bell:'M6 9a6 6 0 0 1 12 0c0 6 3 8 3 8H3s3-2 3-8 M10 21h4',list:'M9 6h12 M9 12h12 M9 18h12 M3 6h1 M3 12h1 M3 18h1',
    before:'M4 17h16 M12 3v3 M5 7l2 2 M19 7l-2 2 M5 14a7 7 0 0 1 14 0 M9 11l3-3 3 3 M12 8v6',after:'M4 17h16 M12 3v3 M5 7l2 2 M19 7l-2 2 M5 14a7 7 0 0 1 14 0 M9 11l3 3 3-3 M12 8v6',
    play:'M8 4l12 8-12 8z'
  };
  const actions=new Map([
    ['Retry Copy',['copy','Retry Copy']],['复制失败，请重试',['copy','Retry Copy']],['Copy Manually',['copy','Copy Manually']],['Unmarked',['pending','Unmarked']],['未标',['pending','Unmarked']],['✅ Done',['✅','Done']],['❌ Not Done',['❌','Not Done']],
    ['All Done',['✅','All Done']],['全部完成',['✅','All Done']],['全部✅',['✅','All Done']],
    ['All Not Done',['❌','All Not Done']],['全部未完成',['❌','All Not Done']],
    ['Stop Reminders',['✋','Stop Reminders']],['停止催缴',['✋','Stop Reminders']],
    ['Resume Reminders',['play','Resume Reminders']],['恢复催缴',['play','Resume Reminders']],
    ['Copy',['copy','Copy']],['复制',['copy','Copy']],
    ['Copy Again',['copy','Copy Again']],['再次复制',['copy','Copy Again']],['再复制一次',['copy','Copy Again']],
    ['Copy Reminder',['copy','Copy Reminder']],['复制催交信息',['copy','Copy Reminder']],
    ['Edit Tasks',['edit','Edit Tasks']],['✎ 编辑/粘贴任务',['edit','Edit Tasks']],
    ['Remove',['trash','Remove']],['移除',['trash','Remove']],
    ['+ Add Task',['plus','Add Task']],['+ 添加一项任务',['plus','Add Task']],
    ['+ Self-study Task',['plus','Add Self-study Task']],['＋ 新增自习任务',['plus','Add Self-study Task']],
    ['Collapse',['up','Collapse']],['收起',['up','Collapse']],['收起 ▴',['up','Collapse']],
    ['Add Note',['note','Add Note']],['添加备注',['note','Add Note']],
    ['Edit Note',['note','Edit Note']],['查看 / 编辑备注',['note','Edit Note']],
    ['Settings & Account',['settings','Settings & Account']],['设置与账户',['settings','Settings & Account']],
    ['Reset Copy',['undo','Reset Copy']],['重置复制标记',['undo','Reset Copy']],['Undo',['undo','Undo']],['撤销',['undo','Undo']]
  ]);
  const aliases=[
    ['check','Save',['保存','Save','保存到今日任务','Save to Today','Save Tasks','⚡ 识别并应用任务','Apply Tasks','Apply Progress','⚡ 识别并替换完成情况']],
    ['close','Cancel',['取消','Cancel','关闭','Close','Close Editor','收起编辑']],
    ['trash','Clear',['清空','Clear','从大厅删除']],
    ['refresh','Restore Default',['恢复默认任务','Restore Default','恢复课表原样','Restore Schedule']],
    ['refresh','Reconnect',['重新连接','Reconnect']],
    ['edit','Resolve Conflict',['处理冲突','Resolve Conflict']],
    ['download','Download Backup',['下载旧本机记录','Download Backup']],
    ['login','Sign In',['登录','Sign In']],['login','Sign Out',['退出','Sign Out']],
    ['undo','Reset View',['重置当前板块记录','Reset View']],
    ['calendar','⟲ Back to Today',['⟲ 回到今天','⟲ Back to Today']],['calendar','⟲ Back to Tomorrow',['⟲ 回到明天','⟲ Back to Tomorrow']],
    ['settings','Account & Connection',['账户与连接','Account & Connection']]
  ];
  for(const [kind,label,keys] of aliases)for(const key of keys)actions.set(key,[kind,label]);
  const byId={'nav-today':['calendar','Today'],'nav-notice':['bell','Class Notices'],'nav-rooms':['room','Rooms'],'tab-plan':['list','Tasks'],'tab-done':['check','Progress'],'tab-quiz':['books','Vocabulary Check'],'tab-assigned':['assigned','今日已布置'],'tab-chasing':['clock','Reminders']};
  const style=document.createElement('style');style.textContent=`
    .wayon-icon-control.wayon-icon-control{display:inline-flex;align-items:center;justify-content:center;position:relative;width:40px!important;min-width:40px!important;height:40px!important;min-height:40px!important;padding:0!important;line-height:1!important;flex-shrink:0;vertical-align:middle;border-radius:10px;list-style:none}
    #tabs button.wayon-icon-control:before{display:none}.wayon-icon-control:focus-visible{outline:2px solid var(--accent,#0071e3);outline-offset:3px}
    .wayon-icon-control svg{width:19px;height:19px;flex:none;pointer-events:none}.wayon-icon-control .wayon-emoji{font-size:19px;line-height:1;pointer-events:none}
    summary.wayon-icon-control::-webkit-details-marker{display:none}.note-disclosure[open]>summary.wayon-icon-control{background:var(--accent-subtle);color:var(--accent)}
    .wayon-icon-control.has-note:after{content:'';position:absolute;right:5px;top:5px;width:5px;height:5px;border-radius:50%;background:var(--accent)}
    @media(max-width:599px){.wayon-icon-control.wayon-icon-control{width:44px!important;min-width:44px!important;height:44px!important;min-height:44px!important}.wayon-workbench .head>.study-actions{gap:5px}}
  `;document.head.append(style);
  const refresh=()=>{
    for(const e of document.querySelectorAll('button,summary')){
      // Source renderers replace text when an action changes; reapply only to known action labels.
      const raw=e.textContent.trim();
      const quiz=/^(?:Before Class|After Class)(?: ✓)?$/.test(raw)?[raw.startsWith('Before')?'before':'after',raw]:null;
      const action=byId[e.id]||actions.get(raw)||quiz;if(!action){if(e.getAttribute('aria-label')&&!e.title)e.title=e.getAttribute('aria-label');continue;}
      if(e.dataset.iconAction===action[1]&&e.querySelector(':scope > span[aria-hidden]'))continue;
      const [kind,label]=action;e.title=label;e.setAttribute('aria-label',label);
      const icon=document.createElement('span');icon.setAttribute('aria-hidden','true');
      if(paths[kind]){
        const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');svg.setAttribute('stroke-width','1.7');svg.setAttribute('stroke-linecap','round');svg.setAttribute('stroke-linejoin','round');
        const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',paths[kind]);svg.append(path);icon.append(svg);
      }else{icon.className='wayon-emoji';icon.textContent=kind;}
      e.replaceChildren(icon);e.classList.add('wayon-icon-control');e.dataset.iconAction=label;
      const input=e.closest('.note-disclosure')?.querySelector('input');e.classList.toggle('has-note',Boolean(input?.value));
    }
  };
  new MutationObserver(refresh).observe(document.body,{childList:true,subtree:true,characterData:true});refresh();
})();

// Presentation only: remove empty room toolbars; keep the editor iframe mounted.
(() => {
  if(typeof document==='undefined')return;
  const style=document.createElement('style');style.id='wayon-room-spacing';
  style.textContent=`
    .wayon-workbench .brand-meta{display:none!important}
    .wayon-workbench #schedule-health:empty{display:none!important}
    .wayon-workbench:has(#classroom-frame) .workspace-top-bar,
    .wayon-workbench:has(#classroom-frame) .workspace-sub-bar{display:none!important}
    .wayon-workbench:has(#classroom-frame) .main-content{padding-top:8px!important}
    .wayon-workbench:has(#classroom-frame) #list>div:has(>a[target="_blank"]){margin:0 0 4px!important;min-height:28px}
  `;
  document.head.append(style);
})();

// Compact desktop navigation; mobile keeps its horizontal navigation.
(() => {
 if(typeof document==='undefined')return;
 const style=document.createElement('style');style.id='wayon-compact-sidebar';style.textContent=`
 .wayon-workbench .sidebar #sync{font-size:0;line-height:0;min-height:12px;padding:0;max-width:40px}
 .wayon-workbench .sidebar #sync:before{content:'';display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--muted)}
 .wayon-workbench .sidebar #sync[data-connection='saved']:before{background:var(--done)}
 .wayon-workbench .sidebar #sync[data-connection='error']:before{background:var(--bad)}
 .wayon-workbench .sidebar .bar{display:none!important}
 @media(max-width:1023px){
  .wayon-workbench .app-brand{padding:12px 16px 10px!important}
  .wayon-workbench .brand-title{font-size:clamp(44px,8vw,72px)!important;line-height:.95!important}
  .wayon-workbench .sidebar{display:flex!important;flex-direction:row!important;justify-content:space-between;align-items:center;width:100%;height:auto;min-height:0;padding:8px 14px!important;gap:12px}
  .wayon-workbench .sidebar .nav-section{width:auto;min-width:0;flex:0 1 auto}
  .wayon-workbench #tabs{display:flex!important;flex-direction:row!important;align-items:center;width:auto!important;padding:0;gap:8px}
  .wayon-workbench .sidebar-footer{display:flex!important;flex-direction:row!important;align-items:center;gap:12px;width:auto;min-width:0;margin:0!important;padding:0!important;border:0}
  .wayon-workbench .sidebar #account-settings{width:44px;min-width:0;padding:0}
  .wayon-workbench .sidebar #account-settings[open]{position:absolute;right:14px;top:100%;width:min(360px,calc(100vw - 28px));padding:14px;z-index:100;background:var(--card);border:1px solid var(--line);border-radius:14px;box-shadow:0 10px 40px #0002}
  .wayon-workbench .main-content{padding:14px 14px 32px!important}
  .wayon-workbench .workspace-top-bar{gap:8px;margin-bottom:8px}
  .wayon-workbench .workspace-top-bar .view-switch{margin:0!important}
  .wayon-workbench .workspace-top-bar .date-section{width:auto!important;margin-left:auto}
  .wayon-workbench .workspace-top-bar #days{width:auto;gap:6px}
  .wayon-workbench #day-picker{min-width:0;width:170px;max-width:100%;font-size:13px}
  .wayon-workbench .workspace-sub-bar{gap:8px;margin-bottom:12px}
  .wayon-workbench #schedule-health{min-width:0;font-size:10px;line-height:1.4;overflow-wrap:anywhere}
 }
 @media(max-width:599px){
  .wayon-workbench .workspace-top-bar .date-section{flex:1 1 100%}
  .wayon-workbench .workspace-top-bar #days{width:100%}
  .wayon-workbench #day-picker{width:auto;flex:1}
  .wayon-workbench #subtabs{gap:2px;padding:3px}
 }
 @media(min-width:1024px){
  .wayon-workbench .app-layout{grid-template-columns:64px minmax(0,1fr)}
  .wayon-workbench .sidebar{width:64px;min-width:0;padding:18px 12px;align-items:center;gap:16px}
  .wayon-workbench .sidebar .nav-section{width:40px;min-width:0}
  .wayon-workbench #tabs{padding:0;align-items:center;gap:8px}
  .wayon-workbench .sidebar-footer{width:40px;min-width:0;display:flex;flex-direction:column;align-items:center;padding:12px 0 0;gap:12px}
  .wayon-workbench .sidebar #sync{font-size:0;line-height:0;min-height:12px;padding:0;max-width:40px}
  .wayon-workbench .sidebar #sync:before{content:'';display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--muted)}
  .wayon-workbench .sidebar #sync[data-connection='saved']:before{background:var(--done)}
  .wayon-workbench .sidebar #sync[data-connection='error']:before{background:var(--bad)}
  .wayon-workbench .sidebar #account-settings{width:40px;padding:0;min-width:0}
  .wayon-workbench .sidebar #account-settings[open]{position:fixed;left:76px;bottom:16px;width:min(360px,calc(100vw - 96px));padding:16px;z-index:100;background:var(--card);border:1px solid var(--line);border-radius:14px;box-shadow:0 10px 40px #0002}
  .wayon-workbench .main-content{padding-left:24px;padding-right:24px}
 }
 `;document.head.append(style);
 const sync=document.getElementById('sync');if(sync){const update=()=>{const t=sync.textContent;sync.title=t;sync.dataset.connection=/失败|不可用|冲突|未配置/.test(t)?'error':/已保存云端|已读取云端/.test(t)?'saved':'pending';};new MutationObserver(update).observe(sync,{childList:true,characterData:true,subtree:true});update();}
})();

// Data-free reminder renderer; teacher completion stays in owner-scoped cloud fields.
(() => {
 if(typeof document==='undefined')return;
 const script=document.createElement('script');script.textContent="(() => {\n if(!document.body.classList.contains('wayon-workbench') || globalThis.wayonStoppedRemindersFixed)return;\n globalThis.wayonStoppedRemindersFixed=true;\nfunction chasingText(r,stoppedIds){\n  const items=chasingDisplayItems((r.uncompleted_details||[]).filter(d=>!stoppedIds.includes(String(d.id)) && !chasingDoneIds(r).includes(String(d.id))));\n  return items.length ? [\"【\"+r.name+\" 任务催交提醒】\",...items.map((d,i)=>(i+1)+\". \"+d.title+\"（\"+d.date+\"）\"),\"请完成后回复，谢谢！\"].join(\"\\n\") : \"当前没有需要催交的项目。\";\n}\nfunction chasingName(name){\n  // Exact alias confirmed by the owner; never infer identity from a shared prefix.\n  return name === \"朱宸萱MAP阅读\" ? \"朱宸萱\" : name;\n}\nfunction chasingDisplayItems(items){\n  const seen=new Set();\n  return items.filter(d=>{\n    // Presentation grouping only: all underlying IDs remain in the row and stop state.\n    const key=String(d.id).startsWith('manual:') && d.date && d.title\n      ? JSON.stringify(['manual',d.date,d.title]) : JSON.stringify(['id',String(d.id)]);\n    if(seen.has(key))return false;seen.add(key);return true;\n  });\n}\nfunction chasingRows(rows){\n  const merged=new Map();\n  for(const raw of rows){\n    const name=chasingName(raw.name);\n    let row=merged.get(name);\n    if(!row){row={...raw,name,chasing_aliases:[],uncompleted_details:[],uncompleted_ids:[],uncompleted:[]};merged.set(name,row);}\n    row.chasing_aliases=[...new Set([...row.chasing_aliases,raw.name,...(name==='朱宸萱'?['朱宸萱','朱宸萱MAP阅读']:[]),...(raw.chasing_aliases||[])])];\n    const seen=new Set(row.uncompleted_details.map(d=>String(d.id)));\n    for(const d of raw.uncompleted_details||[])if(!seen.has(String(d.id))){row.uncompleted_details.push({...d});seen.add(String(d.id));}\n    row.uncompleted_ids=[...new Set([...row.uncompleted_ids,...(raw.uncompleted_ids||[]).map(String),...row.uncompleted_details.map(d=>String(d.id))])];\n    row.uncompleted=[...row.uncompleted,...(raw.uncompleted||[])];\n  }\n  return [...merged.values()];\n}\nfunction chasingStopIds(row){\n  return [...new Set([row.name,...(row.chasing_aliases||[])].flatMap(name=>{\n    const value=cstops[name];return (Array.isArray(value)?value:value?.stopped_ids||[]).map(String);\n  }))];\n}\nfunction setChasingStops(row,ids){\n  const value={stopped_ids:ids,changed_at:new Date().toISOString()};\n  for(const name of new Set([row.name,...(row.chasing_aliases||[])]))cstops[name]={...value,stopped_ids:[...ids]};\n}\nfunction chasingDoneIds(row){\n  const state=globalThis.wayonChasingDone||{};\n  return [...new Set([row.name,...(row.chasing_aliases||[])].flatMap(name=>(state[name]?.completed_ids||[]).map(String)))];\n}\nfunction chasingDoneReady(){return typeof checkCloud!=='undefined' && checkCloud?.ready?.(today)===true;}\nfunction setChasingDone(row,ids){\n  if(!chasingDoneReady()){if(typeof setSync==='function')setSync('请先登录并连接云端；此项尚未确认完成');return;}\n  const state=globalThis.wayonChasingDone ||= {};\n  for(const name of new Set([row.name,...(row.chasing_aliases||[])]))state[name]={completed_ids:[...ids],changed_at:new Date().toISOString()};\n  try{localStorage.setItem('wayon-chasing-completed',JSON.stringify(state));}catch(e){}\n  checkCloud?.observe(today);render();\n}\nfunction chasingSameTask(a,b){\n  return String(a.id)===String(b.id) || (String(a.id).startsWith('manual:') && String(b.id).startsWith('manual:') && a.date===b.date && a.title===b.title);\n}\n\n if(!globalThis.wayonChasingDoneBridge){\n  globalThis.wayonChasingDoneBridge=true;\n  try{globalThis.wayonChasingDone=JSON.parse(localStorage.getItem('wayon-chasing-completed')||'{}')||{};}catch(e){globalThis.wayonChasingDone={};}\n  const capture=globalThis.captureChecks,apply=globalThis.applyChecks,hydrate=globalThis.hydrateChasing;\n  globalThis.captureChecks=function(day){const fields=capture(day);if(day===today)for(const [name,value] of Object.entries(globalThis.wayonChasingDone||{}))fields[JSON.stringify(['chasing-done',name])]=value;return fields;};\n  globalThis.applyChecks=function(day,fields){if(day===today){for(const [raw,value] of Object.entries(fields)){let k;try{k=JSON.parse(raw);}catch(e){continue;}if(k?.[0]==='chasing-done'&&k.length===2){if(Array.isArray(value?.completed_ids))(globalThis.wayonChasingDone||={})[k[1]]=value;else if(value===null)delete globalThis.wayonChasingDone[k[1]];}}localStorage.setItem('wayon-chasing-completed',JSON.stringify(globalThis.wayonChasingDone||{}));}return apply(day,fields);};\n  globalThis.hydrateChasing=async function(module,client,owner){return hydrate({...module,readChasingHistory:async(...args)=>{const history=await module.readChasingHistory(...args);globalThis.wayonChasingDone=history.completed||{};localStorage.setItem('wayon-chasing-completed',JSON.stringify(globalThis.wayonChasingDone));return history;}},client,owner);};\n }\n\n globalThis.chasingText=chasingText;\n globalThis.renderChasing=function renderChasing(){\n  const freshness=document.createElement('div');freshness.className='sub';\n  const checked=DATA._chasing_checked_at;\n  freshness.textContent='完成状态上次核对：'+(checked?new Date(checked).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false}):'未记录')+'；新提交以系统下次核对为准。';\n  list.append(freshness);\n  if (chDay !== today) chload();\n  const isErr = (DATA._chasing_status === \"error\" || DATA._chasing_unknown);\n  if (isErr) {\n    const errBox = document.createElement(\"div\"); errBox.className = \"sub\"; errBox.style.color = \"var(--bad)\"; errBox.style.fontWeight = \"600\";\n    errBox.textContent = \"⚠️ 作业状态未知：部分或全部作业状态未能与系统完整确认，未盲目标记全员完成。\";\n    list.append(errBox);\n    document.getElementById(\"count\").textContent = \"状态未知\";\n    document.getElementById(\"fill\").style.width = \"0%\";\n  }\n  const rows = chasingRows(CHASING || []);\n  if (!rows.length) {\n    if (!isErr) {\n      const e = document.createElement(\"div\"); e.className = \"sub\"; e.textContent = \"当前暂无欠交作业的线上学员，全员进度良好！\"; list.append(e);\n      document.getElementById(\"count\").textContent = \"0 人待催\"; document.getElementById(\"fill\").style.width = \"100%\";\n    }\n    return;\n  }\n  const bottomC = [];\n  const stoppedShelf = document.createElement(\"details\"); stoppedShelf.className = \"chasing-stopped\";\n  const stoppedHeading = document.createElement(\"summary\"); stoppedShelf.append(stoppedHeading);\n  let stoppedStudents = 0, completedStudents = 0;\n  rows.forEach((r, i) => {\n    const sname = r.name || (\"学员\" + (i+1));\n    const done = ch[sname];\n    const uids = r.uncompleted_details?.length ? r.uncompleted_details.map(x=>String(x.id)) : (r.uncompleted_ids || []).map(String);\n    const stoppedIds = chasingStopIds(r);\n    const completedIds = chasingDoneIds(r);\n    const completedDetails = (r.uncompleted_details || []).filter(d => completedIds.includes(String(d.id)));\n    const remainingIds = uids.filter(id => !completedIds.includes(id));\n    const isCompleted = uids.length > 0 && !remainingIds.length;\n    const isStopped = !isCompleted && remainingIds.length > 0 && remainingIds.every(id => stoppedIds.includes(id));\n    const activeDetails = (r.uncompleted_details || []).filter(d => !stoppedIds.includes(String(d.id)) && !completedIds.includes(String(d.id)));\n    const stoppedDetails = (r.uncompleted_details || []).filter(d => stoppedIds.includes(String(d.id)) && !completedIds.includes(String(d.id)));\n    const activeCount = r.uncompleted_details?.length ? chasingDisplayItems(activeDetails).length : uids.filter(id => !stoppedIds.includes(id)).length;\n    const el = document.createElement(\"div\"); el.className = \"item\" + (done ? \" copied\" : \"\") + (isStopped || isCompleted ? \" folded\" : \"\");\n    const head = document.createElement(\"div\"); head.className = \"head\";\n    const name = document.createElement(\"div\"); name.className = \"name\";\n    name.textContent = (i+1) + \". \" + sname.replace(/[【】]/g, \"\") + (r.countdown_tag ? (\" \" + r.countdown_tag) : \"\") + (isCompleted ? \" [本人已确认完成]\" : isStopped ? \" [已停止催缴]\" : \"\");\n    if (r.is_urgent && !isStopped) name.style.color = \"var(--bad)\";\n    const meta = document.createElement(\"div\"); meta.className = \"meta\";\n    meta.textContent = (r.prev_date ? r.prev_date + \"布置 · \" : \"\") + (isCompleted ? \"本人已确认完成 \" + chasingDisplayItems(completedDetails).length : isStopped ? \"已停止 \" + chasingDisplayItems(stoppedDetails).length : \"欠交 \" + activeCount) + \" 项\" + (isStopped ? \" (已停止提醒；布置门禁保持)\" : \"\");\n    head.append(name, meta);\n    if (done && !isStopped) { const x = document.createElement(\"div\"); x.className = \"state\"; x.textContent = \"✓ 已复制 \" + done; head.append(x); }\n    const pre = document.createElement(\"pre\"); pre.textContent = chasingText(r,stoppedIds);\n    const b = document.createElement(\"button\"); b.type = \"button\"; b.className = \"copy\"; b.id = \"chcopy-\" + i;\n    b.textContent = done ? \"再复制一次\" : \"复制催交信息\";\n    b.onclick = () => {\n      const ok = () => { ch[sname] = hhmm(); chsave(); render(); };\n      const fail = () => { b.textContent = \"复制失败，请重试\"; };\n      try { navigator.clipboard.writeText(chasingText(r,stoppedIds)).then(ok, fail); } catch(e) { fail(); }\n    };\n    b.disabled = isStopped || isCompleted;\n    if (!isStopped && !isCompleted) head.append(b);\n    const stopBtn = document.createElement(\"button\"); stopBtn.type = \"button\"; stopBtn.className = \"small\";\n    stopBtn.textContent = isStopped ? \"恢复催缴\" : \"停止催缴\";\n    stopBtn.onclick = () => {\n      if (isStopped) { setChasingStops(r,stoppedIds.filter(id => !uids.includes(id))); }\n      else { setChasingStops(r,[...new Set([...stoppedIds,...uids])]); }\n      cssave(); render();\n    };\n    if (!isCompleted) head.append(stopBtn);\n    if (done) {\n      const u = document.createElement(\"button\"); u.type = \"button\"; u.className = \"small\"; u.textContent = \"撤销\";\n      u.onclick = () => { delete ch[sname]; chsave(); render(); };\n      head.append(u);\n    }\n    const listDetails = document.createElement(\"div\"); listDetails.className = \"tasks\";\n    if (r.uncompleted_details && r.uncompleted_details.length) {\n      chasingDisplayItems(isStopped ? stoppedDetails : activeDetails).forEach(item => {\n        const dRow = document.createElement(\"div\"); dRow.className = \"task no\";\n        const dTag = document.createElement(\"div\"); dTag.className = \"mark\"; dTag.textContent = stoppedIds.includes(String(item.id)) ? \"已停止\" : \"欠交\" + item.elapsed_days + \"天\";\n        const dTxt = document.createElement(\"div\"); dTxt.className = \"txt\"; dTxt.textContent = item.title;\n        const doneButton = document.createElement(\"button\"); doneButton.type=\"button\";doneButton.className=\"small\";\n        doneButton.disabled=!chasingDoneReady();doneButton.textContent=\"✅\";doneButton.title=\"确认这项作业已完成\";doneButton.setAttribute(\"aria-label\",\"确认已完成：\"+item.title);\n        doneButton.onclick=()=>setChasingDone(r,[...new Set([...completedIds,...r.uncompleted_details.filter(d=>chasingSameTask(d,item)).map(d=>String(d.id))])]);\n        dRow.append(dTag, dTxt, doneButton); listDetails.append(dRow);\n      });\n    }\n    el.append(head, listDetails);\n    if (!isStopped && stoppedDetails.length) {\n      const stopped = document.createElement(\"details\"); stopped.className = \"chasing-stopped-items\";\n      const summary = document.createElement(\"summary\"); summary.textContent = \"Stopped · \" + stoppedDetails.length;\n      const restore = document.createElement(\"button\"); restore.type = \"button\"; restore.className = \"small\";\n      restore.textContent = \"恢复催缴\";\n      restore.onclick = () => {\n        const ids = stoppedDetails.map(d => String(d.id));\n        setChasingStops(r,stoppedIds.filter(id => !ids.includes(id)));\n        cssave(); render();\n      };\n      stopped.append(summary, restore); el.append(stopped);\n    }\n    if(completedDetails.length){\n      const completed=document.createElement(\"details\");completed.className=\"chasing-completed-items\";\n      const summary=document.createElement(\"summary\");summary.textContent=\"Completed · \"+chasingDisplayItems(completedDetails).length;completed.append(summary);\n      chasingDisplayItems(completedDetails).forEach(item=>{\n        const row=document.createElement(\"div\");row.className=\"task ok\";\n        const text=document.createElement(\"div\");text.className=\"txt\";text.textContent=item.title;\n        const undo=document.createElement(\"button\");undo.type=\"button\";undo.className=\"small\";undo.disabled=!chasingDoneReady();undo.textContent=\"↶\";undo.title=\"撤销人工完成确认\";undo.setAttribute(\"aria-label\",\"撤销已完成：\"+item.title);\n        undo.onclick=()=>{const ids=completedDetails.filter(d=>chasingSameTask(d,item)).map(d=>String(d.id));setChasingDone(r,completedIds.filter(id=>!ids.includes(id)));};\n        row.append(text,undo);completed.append(row);\n      });el.append(completed);\n    }\n    if (isStopped || isCompleted) { stoppedShelf.append(el); stoppedStudents++; if(isCompleted)completedStudents++; return; }\n    placeCard(el, !!done || isStopped, \"chasing:\" + today + \":\" + sname, (i+1) + \". \" + sname.replace(/[【】]/g, \"\"), isStopped ? \"[已停止]\" : done, bottomC);\n  });\n  bottomC.forEach(e => list.append(e));\n  if (stoppedStudents) { stoppedHeading.textContent = (completedStudents ? \"Closed reminders · \" : \"Stopped reminders · \") + stoppedStudents; list.append(stoppedShelf); }\n  if (!isErr) {\n    const active = rows.filter(r => {\n      const uids = r.uncompleted_details?.length ? r.uncompleted_details.map(x=>String(x.id)) : (r.uncompleted_ids || []).map(String);\n      const sids = chasingStopIds(r);\n      return !(uids.length > 0 && uids.every(id => sids.includes(id) || chasingDoneIds(r).includes(id)));\n    });\n    const n = active.filter(r => ch[r.name]).length;\n    document.getElementById(\"count\").textContent = n + \" / \" + active.length + \" 已催\" + (rows.length > active.length ? \" (\" + (rows.length - active.length) + (completedStudents ? \"人已完成/停止)\" : \"人停止)\") : \"\");\n    document.getElementById(\"fill\").style.width = (active.length ? n / active.length * 100 : 100) + \"%\";\n  }\n};\n if(typeof globalThis.render==='function')globalThis.render();\n})();";
 document.body.append(script);script.remove();
})();

