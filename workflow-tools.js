/* Read-only homework refresh through the authenticated backend. No teaching mutations. */
(() => {
  if (window.wayonWorkflowTools || !document.body.classList.contains('wayon-workbench')) return;
  window.wayonWorkflowTools = true;
  const workflowUrl = 'https://github.com/wjdeggzh0316-tech/Wayon/actions/workflows/wayon_completion_refresh.yml';
  const svg = path => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+path+'</svg>';
  const refreshIcon = svg('<path d="M20 7v5h-5M4 17v-5h5"/><path d="M6.1 6a8 8 0 0 1 13.2 3M4.7 15A8 8 0 0 0 18 18"/>');
  const listIcon = svg('<path d="m3 6 1 1 2-2M9 6h12M3 12l1 1 2-2M9 12h12M3 18l1 1 2-2M9 18h12"/>');
  const style = document.createElement('style');
  style.textContent = '.wayon-workbench #workflow-tools{display:flex;align-items:center;gap:6px;flex:none}.wayon-workbench .workflow-icon{display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;padding:0;border:1px solid var(--line);border-radius:10px;background:var(--card);color:var(--muted);cursor:pointer;text-decoration:none}.wayon-workbench .workflow-icon:hover{color:var(--accent);border-color:var(--accent)}.wayon-workbench .workflow-icon svg{width:19px;height:19px;pointer-events:none}.wayon-workbench #workflow-guide{box-sizing:border-box;width:min(460px,calc(100vw - 32px));max-height:85vh;padding:24px;border:1px solid var(--line);border-radius:20px;background:var(--card);color:var(--fg);box-shadow:0 20px 80px #0003;font:inherit}.wayon-workbench #workflow-guide::backdrop{background:#0005}.wayon-workbench #workflow-guide h2{font-size:21px;margin:0 0 18px;letter-spacing:-.025em}.wayon-workbench #workflow-guide h3{font-size:13px;color:var(--muted);margin:18px 0 8px}.wayon-workbench #workflow-guide ul{list-style:none;padding:0;margin:0;display:grid;gap:6px}.wayon-workbench #workflow-guide li button{display:block;width:100%;min-height:44px;text-align:left;border:0;border-radius:9px;padding:10px 12px;background:var(--bg);color:var(--fg);font:inherit;cursor:pointer}.wayon-workbench #workflow-guide .workflow-close{float:right}.wayon-workbench #workflow-guide p{font-size:12px;color:var(--muted);line-height:1.65}.wayon-workbench #completion-refresh-state:empty{display:none}.wayon-workbench #completion-refresh-state{font-size:11px;color:var(--muted);line-height:1.5;margin:0;max-width:320px}.wayon-workbench #completion-refresh-state[data-state="unknown"]{color:var(--warn,#9a6700)}@media(max-width:599px){.wayon-workbench .workflow-icon{width:44px;height:44px}.wayon-workbench .workspace-sub-bar{flex-wrap:wrap}.wayon-workbench #completion-refresh-state{max-width:100%;flex-basis:100%}}';
  document.head.append(style);
  const layoutStyle=document.createElement('style');layoutStyle.id='workflow-layout';layoutStyle.textContent="\n.wayon-workbench .workspace-sub-bar{align-items:flex-start;gap:8px}\n.wayon-workbench #workflow-tools{margin-left:auto;align-items:center;position:relative}\n.wayon-workbench #workflow-checks{position:static;flex:none}\n.wayon-workbench #workflow-checks[hidden]{display:none}\n.wayon-workbench #workflow-checks>summary{list-style:none}\n.wayon-workbench #workflow-checks>summary::-webkit-details-marker{display:none}\n.wayon-workbench #workflow-checks[open]>summary{color:var(--accent);border-color:var(--accent)}\n.wayon-workbench #workflow-checks-panel{position:absolute;right:0;top:calc(100% + 8px);z-index:60;box-sizing:border-box;width:min(380px,calc(100vw - 32px));padding:14px 16px;display:grid;gap:9px;border:1px solid var(--line);border-radius:14px;background:var(--card);box-shadow:0 12px 36px #0002;text-align:left}\n.wayon-workbench #workflow-checks:not([open])>#workflow-checks-panel{display:none}\n.wayon-workbench #workflow-checks-panel #schedule-health,.wayon-workbench #workflow-checks-panel #completion-refresh-state{margin:0;padding:0;max-width:none;min-width:0;font-size:12px;line-height:1.6;overflow-wrap:anywhere;white-space:normal}\n.wayon-workbench #workflow-checks-panel #schedule-health:empty,.wayon-workbench #workflow-checks-panel #completion-refresh-state:empty{display:none!important}\n.wayon-workbench #workflow-checks-panel #schedule-health.health-ok{display:flex;align-items:baseline;gap:6px}\n@media(max-width:599px){.wayon-workbench #workflow-tools{gap:6px}.wayon-workbench #workflow-checks-panel{width:min(340px,calc(100vw - 32px))}}\n";document.head.append(layoutStyle);
  const guide = document.createElement('dialog'); guide.id = 'workflow-guide'; guide.setAttribute('aria-labelledby','workflow-guide-title');
  const close = document.createElement('button');close.type='button';close.className='workflow-icon workflow-close';close.title='Close';close.setAttribute('aria-label','Close workflow guide');close.textContent='×';close.onclick=()=>guide.close();
  const heading=document.createElement('h2');heading.id='workflow-guide-title';heading.textContent='Daily Workflow';guide.append(close,heading);
  for (const [title, entries] of [
    ['Before work', [['Tasks · 核对今日安排','tab-plan'],['Assigned · 查看实际已布置','tab-assigned'],['Follow-ups · 处理待催作业','tab-chasing']]],
    ['During & after work', [['Progress · 记录完成情况与备注','tab-done'],['Vocabulary · 记录线下抽背','tab-quiz'],['Notices · 核对明日课程通知','nav-notice'],['Rooms · 核对教室冲突','nav-rooms']]]
  ]) {
    const h=document.createElement('h3');h.textContent=title;const ul=document.createElement('ul');
    for(const [text,id] of entries){const li=document.createElement('li'),b=document.createElement('button');b.type='button';b.textContent=text;b.onclick=()=>{guide.close();if(id.startsWith('tab-'))document.getElementById('nav-today')?.click();document.getElementById(id)?.click();};li.append(b);ul.append(li);}guide.append(h,ul);
  }
  const note=document.createElement('p');note.textContent='此处是操作顺序。复制不等于已发送，页面展示不等于归档成功；18:10 归档结果以当次报告为准。';guide.append(note);
  const refreshNote=document.createElement('p');refreshNote.textContent='刷新作业状态：打开 GitHub → Run workflow。只重新读取已登记作业，不布置作业、不发微信。完成后重新加载工作台查看核对时间。';guide.append(refreshNote);document.body.append(guide);
  guide.addEventListener('click',event=>{if(event.target===guide){const r=guide.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)guide.close();}});
  const tools=document.createElement('div');tools.id='workflow-tools';
  let refresh=document.createElement('a');refresh.id='completion-refresh';refresh.className='workflow-icon';refresh.href=workflowUrl;refresh.target='_blank';refresh.rel='noopener noreferrer';refresh.title='Refresh homework status · 在 GitHub 点击 Run workflow';refresh.setAttribute('aria-label','Refresh homework status: open GitHub, then Run workflow');refresh.innerHTML=refreshIcon;
  const button=document.createElement('button');button.type='button';button.className='workflow-icon';button.id='workflow-guide-open';button.title='Daily workflow · 上下班操作顺序';button.setAttribute('aria-label','Open daily workflow');button.innerHTML=listIcon;button.onclick=()=>guide.showModal();tools.append(button,refresh);
  const status=document.createElement('p');status.id='completion-refresh-state';status.setAttribute('role','status');
  const checks=document.createElement('details');checks.id='workflow-checks';
  const checksToggle=document.createElement('summary');checksToggle.className='workflow-icon';checksToggle.title='Check times';checksToggle.setAttribute('aria-label','Check times · 查看核对时间');checksToggle.setAttribute('aria-controls','workflow-checks-panel');
  checksToggle.innerHTML=svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>');
  const checksPanel=document.createElement('div');checksPanel.id='workflow-checks-panel';checksPanel.setAttribute('role','group');checksPanel.setAttribute('aria-label','核对时间与刷新进度');
  checks.append(checksToggle,checksPanel);tools.prepend(checks);
  let closeChecks=0;
  checks.addEventListener('mouseenter',()=>{clearTimeout(closeChecks);if(matchMedia('(hover:hover)').matches)checks.open=true;});
  checks.addEventListener('mouseleave',()=>{clearTimeout(closeChecks);closeChecks=setTimeout(()=>{if(!checks.contains(document.activeElement))checks.open=false;},150);});
  checks.addEventListener('focusout',()=>queueMicrotask(()=>{if(!checks.contains(document.activeElement))checks.open=false;}));
  document.addEventListener('pointerdown',event=>{if(!checks.contains(event.target))checks.open=false;});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&checks.open){checks.open=false;checksToggle.focus();}});

  let working=false,pending=null;
  const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const message=(text,state='unknown')=>{status.textContent=text;status.dataset.state=state;checks.open=true;};
  const runRefresh=async()=>{
    if(working)return;
    const api=globalThis.wayonRefreshAPI;if(!api?.enabled)return;
    working=true;refresh.disabled=true;refresh.setAttribute('aria-busy','true');
    const deadline=Date.now()+12*60*1000;
    try{
      if(!pending){
        pending=crypto.randomUUID();
        message('正在请求刷新…');
        const result=await api.start(pending);
        if(result.state==='busy'){pending=null;message('已有状态刷新正在运行，请稍后查看。');return;}
        if(result.request_id)pending=result.request_id;
        if(result.state==='failed'){pending=null;message('后台未能启动刷新，请检查部署权限。');return;}
      }
      while(Date.now()<deadline){
        const result=await api.status(pending);
        if(result.state==='failed'){pending=null;message('刷新未全部完成；请以最近核对时间为准。');return;}
        if(result.state==='succeeded'){
          message('核对已完成，正在更新页面…');
          const response=await fetch('completion-refresh-status.json?v='+Date.now(),{cache:'no-store',credentials:'omit'});
          const value=response.ok?await response.json():null;
          if(value?.request_id===pending){
            if(value.status!=='verified'||value.page_rebuilt!==true){pending=null;message('本次核对未完整完成，保留上次结果。');return;}
            const date=new Date(value.checked_at);
            if(!Number.isFinite(date.valueOf()))throw Error('RESULT_UNKNOWN');
            const applied=Date.parse(await api.reloadPublished());
            if(!Number.isFinite(applied)||applied<date.valueOf()){await pause(4000);continue;}
            message('作业状态已更新 · '+date.toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false}),'verified');pending=null;return;
          }
        }else message(result.state==='running'?'正在核对作业完成情况…':result.state==='unknown'?'启动结果待确认，正在查询；不会重复启动。':'刷新正在排队…');
        await pause(document.visibilityState==='hidden'?10000:4000);
      }
      message('刷新仍未结束；稍后再点此按钮会继续查询进度。');
    }catch(error){
      if(error.message==='DISPATCH_DENIED'){pending=null;message('后台没有启动权限，未执行刷新。');}
      else if(error.message==='LOGIN_REQUIRED')message('请先登录工作台，再查询刷新进度。');
      else if(error.message==='REQUEST_NOT_FOUND'){pending=null;message('尚未找到刷新请求，请再点一次。');}
      else message('刷新结果尚未确认；再点此按钮会查询进度，不会重复启动。');
    }finally{working=false;refresh.disabled=false;refresh.removeAttribute('aria-busy');configureRefresh();}
  };
  const configureRefresh=()=>{
    if(working)return;
    const enabled=globalThis.wayonRefreshAPI?.enabled===true;
    if((refresh.tagName==='BUTTON')===enabled)return;
    const next=document.createElement(enabled?'button':'a');next.id='completion-refresh';next.className='workflow-icon';next.innerHTML=refreshIcon;
    if(enabled){next.type='button';next.title='Refresh homework status';next.setAttribute('aria-label','Refresh homework status');next.onclick=runRefresh;refreshNote.textContent='点刷新即可重新核对已登记作业；排队、进度和结果会在工作台显示，不布置新作业、不发微信。';}
    else {next.href=workflowUrl;next.target='_blank';next.rel='noopener noreferrer';next.title='Refresh homework status · 在 GitHub 点击 Run workflow';next.setAttribute('aria-label','Refresh homework status: open GitHub, then Run workflow');}
    refresh.replaceWith(next);refresh=next;
  };
  window.addEventListener('wayon-refresh-ready',configureRefresh);configureRefresh();
  const mount=()=>{
    const bar=document.querySelector('.workspace-sub-bar')||document.querySelector('.workspace-top-bar');
    const rooms=document.body.dataset.mode==='classroom';
    const target=rooms?(document.querySelector('.sidebar-footer')||document.querySelector('.sidebar')):bar;
    tools.style.flexDirection=rooms?'column':'row';
    if(target&&tools.parentNode!==target)target.append(tools);
    checks.hidden=rooms;
    const health=document.getElementById('schedule-health');
    if(health&&health.parentNode!==checksPanel)checksPanel.prepend(health);
    if(status.parentNode!==checksPanel)checksPanel.append(status);
  };
  new MutationObserver(mount).observe(document.body,{childList:true,subtree:true});mount();
  // One read per page load; this does not start a refresh or poll a backend.
  fetch('completion-refresh-status.json?v='+Date.now(),{cache:'no-store',credentials:'omit'}).then(r=>r.ok?r.json():null).then(value=>{
    if(working || pending || !value||!['verified','unknown','error'].includes(value.status))return;
    const stamp=value.status==='verified'?value.checked_at:value.last_success_at;
    const date=typeof stamp==='string'?new Date(stamp):null;
    const time=date&&!Number.isNaN(date.valueOf())?date.toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false}):'未核实';
    status.dataset.state=value.status==='verified'?'verified':'unknown';
    status.textContent=value.status==='verified'?'作业核对（北京时间）：'+time:'最近一次刷新未完成；上次成功核对：'+time;
  }).catch(()=>{});
})();
