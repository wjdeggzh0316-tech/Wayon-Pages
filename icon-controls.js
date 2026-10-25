// Presentation only: keep original nodes, event handlers, state keys and accessible action names.
(() => {
  if(typeof document==='undefined'||globalThis.wayonIconControls)return;
  globalThis.wayonIconControls=true;
  const paths={
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
    ['Retry Copy',['⚠️','Retry Copy']],['复制失败，请重试',['⚠️','Retry Copy']],['Copy Manually',['copy','Copy Manually']],['Unmarked',['pending','Unmarked']],['未标',['pending','Unmarked']],['✅ Done',['✅','Done']],['❌ Not Done',['❌','Not Done']],
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
  const byId={'nav-today':['calendar','Today'],'nav-notice':['bell','Class Notices'],'nav-rooms':['room','Rooms'],'tab-plan':['list','Tasks'],'tab-done':['check','Progress'],'tab-quiz':['books','Vocabulary Check'],'tab-chasing':['clock','Reminders']};
  const style=document.createElement('style');style.textContent=`
    .wayon-icon-control.wayon-icon-control{display:inline-flex;align-items:center;justify-content:center;position:relative;width:40px!important;min-width:40px!important;height:40px!important;min-height:40px!important;padding:0!important;line-height:1!important;flex-shrink:0;vertical-align:middle;border-radius:10px;list-style:none}
    .wayon-icon-control[data-icon-action="Retry Copy"]{width:auto!important;min-width:54px!important;padding:0 8px!important;gap:4px;background:var(--bad-bg,#fff1f0)!important;color:var(--bad,#d93025)!important;border:1px solid var(--bad-border,#f1c8c5)!important}
    .wayon-icon-control .wayon-status-text{font-size:12px;font-weight:600;white-space:nowrap}
    #tabs button.wayon-icon-control:before{display:none}.wayon-icon-control:focus-visible{outline:2px solid var(--accent,#0071e3);outline-offset:3px}
    .wayon-icon-control svg{width:19px;height:19px;flex:none;pointer-events:none}.wayon-icon-control .wayon-emoji{font-size:19px;line-height:1;pointer-events:none}
    summary.wayon-icon-control::-webkit-details-marker{display:none}.note-disclosure[open]>summary.wayon-icon-control{background:var(--accent-subtle);color:var(--accent)}
    .wayon-icon-control.has-note:after{content:'';position:absolute;right:5px;top:5px;width:5px;height:5px;border-radius:50%;background:var(--accent)}
    @media(max-width:599px){.wayon-icon-control.wayon-icon-control{width:44px!important;min-width:44px!important;height:44px!important;min-height:44px!important}.wayon-icon-control[data-icon-action="Retry Copy"]{width:auto!important;min-width:54px!important;padding:0 8px!important}.wayon-workbench .head>.study-actions{gap:5px}}
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
      if(label==='Retry Copy'){
        const msg=document.createElement('span');msg.className='wayon-status-text';msg.textContent='重试';
        e.replaceChildren(icon,msg);
      }else{
        e.replaceChildren(icon);
      }
      e.classList.add('wayon-icon-control');e.dataset.iconAction=label;
      const input=e.closest('.note-disclosure')?.querySelector('input');e.classList.toggle('has-note',Boolean(input?.value));
    }
  };
  new MutationObserver(refresh).observe(document.body,{childList:true,subtree:true,characterData:true});refresh();
})();
