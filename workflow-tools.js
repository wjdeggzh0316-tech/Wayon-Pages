/* Read-only homework and schedule refresh through the authenticated backend. No teaching mutations. */
(() => {
  if (window.wayonWorkflowTools || !document.body.classList.contains('wayon-workbench')) return;
  window.wayonWorkflowTools = true;
  const workflowUrl = 'https://github.com/wjdeggzh0316-tech/Wayon/actions/workflows/wayon_completion_refresh.yml';
  const svg = path => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+path+'</svg>';
  const refreshIcon = svg('<path d="M20 7v5h-5M4 17v-5h5"/><path d="M6.1 6a8 8 0 0 1 13.2 3M4.7 15A8 8 0 0 0 18 18"/>');
  const listIcon = svg('<path d="m3 6 1 1 2-2M9 6h12M3 12l1 1 2-2M9 12h12M3 18l1 1 2-2M9 18h12"/>');
  const style = document.createElement('style');
  style.textContent = '.wayon-workbench #workflow-tools{display:flex;align-items:center;gap:6px;flex:none}.wayon-workbench .workflow-icon{display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;padding:0;border:1px solid var(--line);border-radius:10px;background:var(--card);color:var(--muted);cursor:pointer;text-decoration:none}.wayon-workbench .workflow-icon:hover:not(:disabled){color:var(--accent);border-color:var(--accent)}.wayon-workbench .workflow-icon svg{width:19px;height:19px;pointer-events:none}.wayon-workbench .schedule-refresh-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:36px;padding:0 12px;border:1px solid rgba(0,113,227,.28);border-radius:10px;background:var(--accent-subtle,#eaf3ff);color:var(--accent,#0071e3);font:550 13px/1 var(--sans,inherit);letter-spacing:-.01em;white-space:nowrap;cursor:pointer;transition:background .15s ease,border-color .15s ease,color .15s ease}.wayon-workbench .schedule-refresh-btn:hover:not(:disabled){background:var(--accent,#0071e3);border-color:var(--accent,#0071e3);color:#fff}.wayon-workbench .schedule-refresh-btn:disabled,.wayon-workbench .workflow-icon:disabled{opacity:.58;cursor:default}.wayon-workbench .schedule-refresh-btn .schedule-refresh-icon{display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;flex:none;pointer-events:none}.wayon-workbench .schedule-refresh-btn svg{width:16px;height:16px;pointer-events:none}@keyframes wayon-spin{to{transform:rotate(360deg)}}.wayon-workbench .schedule-refresh-btn[data-running="true"] svg,.wayon-workbench #completion-refresh[aria-busy="true"] svg{animation:wayon-spin .9s linear infinite}.wayon-workbench #workflow-guide{box-sizing:border-box;width:min(460px,calc(100vw - 32px));max-height:85vh;padding:24px;border:1px solid var(--line);border-radius:20px;background:var(--card);color:var(--fg);box-shadow:0 20px 80px #0003;font:inherit}.wayon-workbench #workflow-guide::backdrop{background:#0005}.wayon-workbench #workflow-guide h2{font-size:21px;margin:0 0 18px;letter-spacing:-.025em}.wayon-workbench #workflow-guide h3{font-size:13px;color:var(--muted);margin:18px 0 8px}.wayon-workbench #workflow-guide ul{list-style:none;padding:0;margin:0;display:grid;gap:6px}.wayon-workbench #workflow-guide li button{display:block;width:100%;min-height:44px;text-align:left;border:0;border-radius:9px;padding:10px 12px;background:var(--bg);color:var(--fg);font:inherit;cursor:pointer}.wayon-workbench #workflow-guide .workflow-close{float:right}.wayon-workbench #workflow-guide p{font-size:12px;color:var(--muted);line-height:1.65}.wayon-workbench #completion-refresh-state:empty{display:none}.wayon-workbench #completion-refresh-state{font-size:11px;color:var(--muted);line-height:1.5;margin:0;max-width:320px}.wayon-workbench #completion-refresh-state[data-state="unknown"]{color:var(--warn,#9a6700)}@media(max-width:599px){.wayon-workbench .workflow-icon{width:44px;height:44px}.wayon-workbench .schedule-refresh-btn{height:44px;padding:0 12px;font-size:13px}.wayon-workbench .workspace-sub-bar{flex-wrap:wrap}.wayon-workbench #completion-refresh-state{max-width:100%;flex-basis:100%}}';
  document.head.append(style);
  const layoutStyle=document.createElement('style');layoutStyle.id='workflow-layout';layoutStyle.textContent=`
.wayon-workbench .workspace-sub-bar{align-items:flex-start;gap:8px}
.wayon-workbench #workflow-tools{margin-left:auto;align-items:center;position:relative}
.wayon-workbench #workflow-checks{position:static;flex:none}
.wayon-workbench #workflow-checks[hidden],.wayon-workbench #schedule-refresh[hidden],body.wayon-workbench:not([data-mode="notice"]) #schedule-refresh,body.wayon-workbench[data-aircon-open] #schedule-refresh,body.wayon-workbench[data-memo-open] #schedule-refresh,body.wayon-workbench[data-feedback-open] #schedule-refresh{display:none!important}
.wayon-workbench #workflow-checks>summary{list-style:none}
.wayon-workbench #workflow-checks>summary::-webkit-details-marker{display:none}
.wayon-workbench #workflow-checks[open]>summary{color:var(--accent);border-color:var(--accent)}
.wayon-workbench #workflow-checks-panel{position:absolute;right:0;top:calc(100% + 8px);z-index:60;box-sizing:border-box;width:min(380px,calc(100vw - 32px));padding:14px 16px;display:grid;gap:9px;border:1px solid var(--line);border-radius:14px;background:var(--card);box-shadow:0 12px 36px #0002;text-align:left}
.wayon-workbench #workflow-checks:not([open])>#workflow-checks-panel{display:none}
.wayon-workbench #workflow-checks-panel #schedule-health,.wayon-workbench #workflow-checks-panel #completion-refresh-state{margin:0;padding:0;max-width:none;min-width:0;font-size:12px;line-height:1.6;overflow-wrap:anywhere;white-space:normal}
.wayon-workbench #workflow-checks-panel #schedule-health:empty,.wayon-workbench #workflow-checks-panel #completion-refresh-state:empty{display:none!important}
.wayon-workbench #workflow-checks-panel #schedule-health.health-ok{display:flex;align-items:baseline;gap:6px}
@media(max-width:599px){.wayon-workbench #workflow-tools{gap:6px}.wayon-workbench #workflow-checks-panel{width:min(340px,calc(100vw - 32px))}.wayon-workbench[data-mode="notice"] .main-content .date-section{flex:1 1 100%!important}.wayon-workbench[data-mode="notice"] .main-content #workflow-tools{margin-left:auto!important;max-width:100%}}
`;document.head.append(layoutStyle);
  const guide = document.createElement('dialog'); guide.id = 'workflow-guide'; guide.setAttribute('aria-labelledby','workflow-guide-title');
  const close = document.createElement('button');close.type='button';close.className='workflow-icon workflow-close';close.title='Close';close.setAttribute('aria-label','Close workflow guide');close.textContent='×';close.onclick=()=>guide.close();
  const heading=document.createElement('h2');heading.id='workflow-guide-title';heading.textContent='Daily Workflow';guide.append(close,heading);
  for (const [title, entries] of [
    ['Before work', [['Tasks · 核对今日安排','tab-plan'],['Assigned · 在今日安排查看卡片布置状态','tab-plan'],['Follow-ups · 处理待催作业','tab-chasing']]],
    ['During & after work', [['Progress · 记录完成情况与备注','tab-done'],['Vocabulary · 记录线下抽背','tab-quiz'],['Notices · 核对明日课程通知','nav-notice'],['Rooms · 核对教室冲突','nav-rooms']]]
  ]) {
    const h=document.createElement('h3');h.textContent=title;const ul=document.createElement('ul');
    for(const [text,id] of entries){const li=document.createElement('li'),b=document.createElement('button');b.type='button';b.textContent=text;b.onclick=()=>{guide.close();if(id.startsWith('tab-'))document.getElementById('nav-today')?.click();document.getElementById(id)?.click();};li.append(b);ul.append(li);}guide.append(h,ul);
  }
  const note=document.createElement('p');note.textContent='此处是操作顺序。复制不等于已发送，页面展示不等于归档成功；18:10 归档结果以当次报告为准。';guide.append(note);
  const refreshNote=document.createElement('p');refreshNote.textContent='刷新作业状态：打开 GitHub → Run workflow。只重新读取已登记作业，不布置作业、不发微信。完成后重新加载工作台查看核对时间。';guide.append(refreshNote);document.body.append(guide);
  guide.addEventListener('click',event=>{if(event.target===guide){const r=guide.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)guide.close();}});
  const tools=document.createElement('div');tools.id='workflow-tools';
  const scheduleBtn=document.createElement('button');scheduleBtn.type='button';scheduleBtn.id='schedule-refresh';scheduleBtn.className='schedule-refresh-btn';scheduleBtn.title='仅刷新课表与课程通知';scheduleBtn.setAttribute('aria-label','仅刷新课表');
  const scheduleIcon=document.createElement('span');scheduleIcon.className='schedule-refresh-icon';scheduleIcon.setAttribute('aria-hidden','true');scheduleIcon.innerHTML=refreshIcon;
  const scheduleLabel=document.createElement('span');scheduleLabel.className='schedule-refresh-label';scheduleLabel.textContent='仅刷新课表';
  scheduleBtn.append(scheduleIcon,scheduleLabel);scheduleBtn.hidden=true;
  let refresh=document.createElement('a');refresh.id='completion-refresh';refresh.className='workflow-icon';refresh.href=workflowUrl;refresh.target='_blank';refresh.rel='noopener noreferrer';refresh.title='Refresh homework status · 在 GitHub 点击 Run workflow';refresh.setAttribute('aria-label','Refresh homework status: open GitHub, then Run workflow');refresh.innerHTML=refreshIcon;
  const button=document.createElement('button');button.type='button';button.className='workflow-icon';button.id='workflow-guide-open';button.title='Daily workflow · 上下班操作顺序';button.setAttribute('aria-label','Open daily workflow');button.innerHTML=listIcon;button.onclick=()=>guide.showModal();
  const status=document.createElement('p');status.id='completion-refresh-state';status.setAttribute('role','status');
  const checks=document.createElement('details');checks.id='workflow-checks';
  const checksToggle=document.createElement('summary');checksToggle.className='workflow-icon';checksToggle.title='Check times';checksToggle.setAttribute('aria-label','Check times · 查看核对时间');checksToggle.setAttribute('aria-controls','workflow-checks-panel');
  checksToggle.innerHTML=svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>');
  const checksPanel=document.createElement('div');checksPanel.id='workflow-checks-panel';checksPanel.setAttribute('role','group');checksPanel.setAttribute('aria-label','核对时间与刷新进度');
  checks.append(checksToggle,checksPanel);tools.append(scheduleBtn,checks,button,refresh);
  let closeChecks=0,hoverOpenedAt=0;
  checks.addEventListener('mouseenter',()=>{clearTimeout(closeChecks);if(matchMedia('(hover:hover)').matches&&!checks.open){checks.open=true;hoverOpenedAt=Date.now();}});
  // A click right after hover opened the panel must keep it open instead of toggling it shut.
  checksToggle.addEventListener('click',event=>{if(checks.open&&Date.now()-hoverOpenedAt<800){event.preventDefault();hoverOpenedAt=0;}});
  checks.addEventListener('mouseleave',()=>{clearTimeout(closeChecks);closeChecks=setTimeout(()=>{if(!checks.contains(document.activeElement))checks.open=false;},150);});
  checks.addEventListener('focusout',()=>queueMicrotask(()=>{if(!checks.contains(document.activeElement))checks.open=false;}));
  document.addEventListener('pointerdown',event=>{if(!checks.contains(event.target))checks.open=false;});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&checks.open){checks.open=false;checksToggle.focus();}});

  let working=false,pending=null,pendingScope='all';
  const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const formatTime=value=>{const d=value instanceof Date?value:(typeof value==='string'||typeof value==='number'?new Date(value):null);return d&&Number.isFinite(d.valueOf())?d.toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false}):'未核实';};
  const message=(text,state='unknown')=>{status.textContent=text;status.dataset.state=state;checks.open=true;};
  const syncBusyUI=scope=>{
    refresh.disabled=working;scheduleBtn.disabled=working;
    if(!working){
      refresh.removeAttribute('aria-busy');scheduleBtn.removeAttribute('aria-busy');
      delete scheduleBtn.dataset.running;scheduleLabel.textContent='仅刷新课表';
      return;
    }
    if(scope==='schedule'){
      refresh.removeAttribute('aria-busy');
      scheduleBtn.dataset.running='true';scheduleBtn.setAttribute('aria-busy','true');
      scheduleLabel.textContent='刷新课表中…';
    }else{
      delete scheduleBtn.dataset.running;scheduleBtn.removeAttribute('aria-busy');
      scheduleLabel.textContent='仅刷新课表';refresh.setAttribute('aria-busy','true');
    }
  };
  const runRefresh=async(options)=>{
    if(working)return;
    const api=globalThis.wayonRefreshAPI;if(!api?.enabled)return;
    const requestedScope=options?.scope==='schedule'?'schedule':'all';
    let activeScope=pending?pendingScope:requestedScope,appliedScheduleStamp='';
    working=true;syncBusyUI(activeScope);
    const deadline=Date.now()+12*60*1000;
    try{
      if(!pending){
        pending=crypto.randomUUID();pendingScope=activeScope;
        message(activeScope==='schedule'?'正在请求快速刷新课表…':'正在请求刷新…');
        const result=activeScope==='schedule'?await api.start(pending,'schedule'):await api.start(pending);
        if(result.state==='busy'){pending=null;pendingScope='all';message('已有状态刷新正在运行，请稍后查看。');return;}
        if(result.request_id)pending=result.request_id;
        if(result.scope==='schedule'||result.scope==='all'){activeScope=result.scope;pendingScope=activeScope;syncBusyUI(activeScope);}
        if(result.state==='failed'){pending=null;pendingScope='all';message('后台未能启动刷新，请检查部署权限。');return;}
      }
      let terminalAt=0;
      const applyResult=async(effectiveScope)=>{
        const response=await fetch('completion-refresh-status.json?v='+Date.now(),{cache:'no-store',credentials:'omit'});
        const value=response.ok?await response.json():null;
        if(value?.request_id!==pending)return 'waiting';
        const full=value.status==='verified',scheduleOnly=!full&&value.schedule_status==='verified';
        if(value.page_rebuilt!==true || !full&&!scheduleOnly)return 'failed';
        const date=new Date(full?value.checked_at:value.schedule_checked_at);
        if(!Number.isFinite(date.valueOf()))throw Error('RESULT_UNKNOWN');
        const applied=Date.parse(await api.reloadPublished());
        if(!Number.isFinite(applied)||applied<date.valueOf())return 'waiting';
        const time=formatTime(date);
        const fastSchedule=scheduleOnly&&(value.status==='skipped'||value.scope==='schedule'||effectiveScope==='schedule');
        message(full?'课表与作业状态已更新 · '+time:fastSchedule?'课表与课程通知已更新 · '+time:
          '课表及课程通知已更新 · '+time+'；部分作业未能核实，待催清单保留上次结果。',full||fastSchedule?'verified':'unknown');
        pending=null;pendingScope='all';window.dispatchEvent(new CustomEvent('wayon-refresh-updated'));return 'updated';
      };
      while(Date.now()<deadline){
        const result=await api.status(pending);
        if(result.scope==='schedule'||result.scope==='all'){activeScope=result.scope;pendingScope=activeScope;syncBusyUI(activeScope);}
        const effectiveScope=(result.scope==='schedule'||result.schedule_payload?.scope==='schedule')?'schedule':activeScope;
        const payload=result.schedule_payload;
        if(payload?.schedule_status==='verified'&&payload?.snapshot&&payload.schedule_checked_at!==appliedScheduleStamp){
          const checkedMs=Date.parse(payload.schedule_checked_at);
          try{
            const applied=Date.parse(await api.reloadPublished({snapshot:payload.snapshot}));
            if(Number.isFinite(checkedMs)&&Number.isFinite(applied)&&applied>=checkedMs){
              appliedScheduleStamp=payload.schedule_checked_at;
              if(effectiveScope==='schedule'){
                message('课表与课程通知已更新 · '+formatTime(checkedMs),'verified');
                pending=null;pendingScope='all';
                window.dispatchEvent(new CustomEvent('wayon-refresh-updated'));
                return;
              }
              window.dispatchEvent(new CustomEvent('wayon-refresh-updated'));
            }
          }catch{}
        }
        if(result.state==='failed'||result.state==='succeeded'){
          const applied=await applyResult(effectiveScope);
          if(applied==='updated')return;
          if(applied==='failed'){
            pending=null;pendingScope='all';message('本次核对未完整完成，未将未知作业标为完成；请查看最近核对时间。');return;
          }
          terminalAt ||= Date.now();
          if(Date.now()-terminalAt>60000){pending=null;pendingScope='all';message('后台已结束，网页更新暂未确认，请稍后重新打开页面。');return;}
          message('后台已结束，正在等待网页发布…');
        }else message(result.phase==='queued'?'后台正在排队，启动后会自动更新进度…':
          result.state==='running'?(effectiveScope==='schedule'?'正在快速刷新课表…':'正在刷新课表并核对作业…'):
          result.state==='unknown'?'启动结果待确认，正在查询；不会重复启动。':'请求已接收，等待后台启动…');
        await pause(document.visibilityState==='hidden'?10000:4000);
      }
      message('刷新仍未结束；稍后再点此按钮会继续查询进度。');
    }catch(error){
      if(error.message==='DISPATCH_DENIED'){pending=null;pendingScope='all';message('后台没有启动权限，未执行刷新。');}
      else if(error.message==='LOGIN_REQUIRED')message('请先登录工作台，再查询刷新进度。');
      else if(error.message==='REQUEST_NOT_FOUND'){pending=null;pendingScope='all';message('尚未找到刷新请求，请再点一次。');}
      else message('刷新结果尚未确认；再点此按钮会查询进度，不会重复启动。');
    }finally{working=false;syncBusyUI('all');configureRefresh();}
  };
  scheduleBtn.onclick=()=>{
    if(!globalThis.wayonRefreshAPI?.enabled){
      message(globalThis.wayonRefreshAPI?'后台刷新暂未启用，请通过右侧按钮在 GitHub 运行刷新。':'请先登录工作台，再刷新课表。');
      return;
    }
    void runRefresh({scope:'schedule'});
  };
  const syncScheduleVisibility=()=>{
    const ds=document.body.dataset||{};
    scheduleBtn.hidden=!(ds.mode==='notice'&&!ds.airconOpen&&!ds.memoOpen&&!ds.feedbackOpen);
  };
  const configureRefresh=()=>{
    syncScheduleVisibility();
    if(working)return;
    const enabled=globalThis.wayonRefreshAPI?.enabled===true;
    if((refresh.tagName==='BUTTON')===enabled)return;
    const next=document.createElement(enabled?'button':'a');next.id='completion-refresh';next.className='workflow-icon';next.innerHTML=refreshIcon;
    if(enabled){next.type='button';next.title='刷新课表与作业状态';next.setAttribute('aria-label','刷新课表与作业状态');next.onclick=()=>void runRefresh();refreshNote.textContent='点刷新更新课表和课程通知，并核对已登记作业；在「通知」页可点「仅刷新课表」快速同步最新排课。';}
    else {next.href=workflowUrl;next.target='_blank';next.rel='noopener noreferrer';next.title='Refresh homework status · 在 GitHub 点击 Run workflow';next.setAttribute('aria-label','Refresh homework status: open GitHub, then Run workflow');}
    refresh.replaceWith(next);refresh=next;
  };
  window.addEventListener('wayon-refresh-ready',configureRefresh);configureRefresh();
  // A saved rule only changes the catalog. Recompile today's and tomorrow's plan through the
  // same owner-only, read-only refresh the button uses; it never assigns work or sends WeChat.
  window.addEventListener('wayon-rules-saved',()=>{if(globalThis.wayonRefreshAPI?.enabled===true)void runRefresh();});
  const mount=()=>{
    const bar=document.querySelector('.workspace-sub-bar')||document.querySelector('.workspace-top-bar');
    const rooms=document.body.dataset.mode==='classroom';
    const target=rooms?(document.querySelector('.sidebar-footer')||document.querySelector('.sidebar')):bar;
    tools.style.flexDirection=rooms?'column':'row';
    if(target&&tools.parentNode!==target)target.append(tools);
    checks.hidden=rooms;
    syncScheduleVisibility();
    const health=document.getElementById('schedule-health');
    if(health&&health.parentNode!==checksPanel)checksPanel.prepend(health);
    if(status.parentNode!==checksPanel)checksPanel.append(status);
  };
  new MutationObserver(mount).observe(document.body,{childList:true,subtree:true});
  new MutationObserver(syncScheduleVisibility).observe(document.body,{attributes:true,attributeFilter:['data-mode','data-aircon-open','data-memo-open','data-feedback-open']});
  mount();
  // One read per page load; this does not start a refresh or poll a backend.
  fetch('completion-refresh-status.json?v='+Date.now(),{cache:'no-store',credentials:'omit'}).then(r=>r.ok?r.json():null).then(value=>{
    if(working || pending || !value)return;
    const skippedHomework=value.status==='skipped'||(value.scope==='schedule'&&value.schedule_status==='verified');
    if(!skippedHomework&&!['verified','unknown','error'].includes(value.status))return;
    const stamp=value.status==='verified'?value.checked_at:value.last_success_at;
    const time=typeof stamp==='string'?formatTime(stamp):'未核实';
    status.dataset.state=(value.status==='verified'||skippedHomework)?'verified':'unknown';
    status.textContent=value.status==='verified'?'作业核对（北京时间）：'+time:skippedHomework?'上次作业核对（北京时间）：'+time:'最近一次刷新未完成；上次成功核对：'+time;
  }).catch(()=>{});
})();
