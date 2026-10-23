// Presentation only. Existing room/seat handlers and cloud identities stay intact.
(() => {
  if (typeof document === 'undefined' || document.getElementById('wayon-room-layout')) return;
  const style = document.createElement('style');
  style.id = 'wayon-room-layout';
  style.textContent = `
  body.wayon-workbench .app-layout{grid-template-rows:78px minmax(0,1fr)}
  body.wayon-workbench .app-layout .app-brand{box-sizing:border-box;padding:12px 28px!important;border-radius:0 0 16px 16px;align-items:center;height:78px;min-height:78px}
  body.wayon-workbench .app-layout .app-brand .brand-title{font-size:52px!important;line-height:1!important;letter-spacing:-.06em}
  body.wayon-workbench .app-layout .workspace-heading{display:none!important}
  body.wayon-workbench .app-layout .main-content{max-width:none!important;padding:12px 24px 18px!important;min-height:0}
  body.wayon-workbench .app-layout #list{width:100%;max-width:none!important}
  .wayon-workbench:has(#classroom-frame) #list{columns:1}
  body.wayon-workbench .app-layout #classroom-frame{display:block;width:100%!important;max-width:none!important;height:var(--room-frame-height,calc(100dvh - 140px))!important;min-height:0!important;border:0!important;border-radius:16px!important}
  body.wayon-room{background:var(--card);padding:16px!important;gap:10px!important}
  .wayon-room .top{gap:8px 12px;min-height:44px;padding-bottom:10px;flex:none}
  .wayon-room .top>b{font-size:18px}.wayon-room #cf{font-size:13px;line-height:1.4}
  .wayon-room .days{order:3;gap:4px}.wayon-room .days button{min-height:36px;height:36px;padding:0 13px;font-size:13px}
  .wayon-room .legend{gap:6px 14px;font-size:12px;min-height:20px;align-items:center;flex:none}
  .wayon-room .legend span{white-space:nowrap}.wayon-room .legend i{width:10px;height:10px;border-radius:3px}
  .wayon-room .room-scroll{border-radius:12px;scrollbar-width:thin;scrollbar-color:var(--line) transparent}
  .wayon-room .room-scroll>.grid{min-width:880px!important;min-height:0;grid-template-columns:72px repeat(5,minmax(100px,1fr)) minmax(210px,1.2fr)!important;grid-template-rows:42px repeat(4,minmax(0,1fr))!important;gap:8px!important}
  .wayon-room .grid>.h{font-size:14px;line-height:20px;padding:2px 0 4px;align-self:stretch;display:flex;flex-direction:column;justify-content:flex-end;overflow:visible}.wayon-room .grid>.h small{font-size:11px;line-height:14px}
  .wayon-room .grid>.r{font-size:14px;line-height:1.45;position:sticky;left:0;background:var(--card);z-index:2}
  .wayon-room .r .hcnt{font-size:11px;font-weight:400;white-space:nowrap}
  .wayon-room .c{border-radius:12px;padding:5px;font-size:14px;line-height:1.45}
  .wayon-room .c.free{font-size:12px;background:var(--code-bg);border-color:var(--line);opacity:.75}
  .wayon-room .c.used{padding:0}.wayon-room .c.man{padding:4px}.wayon-room .c.man::after{right:8px;top:4px}
  .wayon-room .k{padding:12px;border-radius:10px;border-left-width:4px;gap:3px;min-width:0}
  .wayon-room .k .w{font-size:15px;line-height:1.45;font-weight:650;word-break:normal;overflow-wrap:anywhere}
  .wayon-room .k .s{font-size:13px;line-height:1.45;word-break:normal;overflow-wrap:anywhere}
  .wayon-room .room-teacher{display:block;font-size:12px;opacity:.75;white-space:nowrap}
  .wayon-room .room-subject{display:block}.wayon-room .k .tt{font-size:12px;line-height:1.4;white-space:nowrap;font-variant-numeric:tabular-nums}
  .wayon-room .hallbox{grid-template-columns:repeat(3,minmax(0,1fr))!important;grid-auto-rows:minmax(36px,auto);gap:5px;padding:4px;align-content:start;overflow:auto;border-radius:12px}
  .wayon-room .hallbox>.seat.free{display:none}.wayon-room .hallbox>.seat.room-seat-add{display:flex;opacity:1;min-height:36px;cursor:pointer;background:transparent;color:var(--accent);border:1px dashed var(--line-strong);font-size:12px}
  .wayon-room .c.seat{min-height:36px;border-radius:7px;padding:0}
  .wayon-room .k.chip{padding:6px 7px;border-radius:7px;min-height:36px;width:100%}
  .wayon-room .k.chip .w{font-size:12px;font-weight:550;line-height:1.4;white-space:nowrap;text-overflow:ellipsis;overflow:hidden}
  .wayon-room .k.chip.pre{border-color:var(--hallb);background:var(--hall)!important;opacity:.85}
  .wayon-room .k.chip .x{border-radius:0 7px 7px 0;padding:0 6px;min-width:24px}
  .wayon-room .foot{font-size:12px;line-height:1.5;padding-top:2px;flex:none}.wayon-room .foot:empty{display:none}
  .room-info{position:relative;order:2;margin-left:auto;flex:none;font-size:12px}
  .room-info>summary{display:grid;place-items:center;list-style:none;width:36px;height:36px;border:1px solid var(--line);border-radius:9px;color:var(--muted);cursor:pointer;font-size:16px}
  .room-info>summary::-webkit-details-marker{display:none}.room-info>summary:hover{color:var(--accent);background:var(--accent-subtle)}
  .room-info-panel{display:none;position:absolute;right:0;top:100%;z-index:20;width:min(340px,calc(100vw - 32px));padding:14px;border:1px solid var(--line);border-radius:12px;background:var(--card);box-shadow:0 8px 32px rgba(0,0,0,.12);font-size:12px;line-height:1.7;color:var(--fg-secondary);overflow-wrap:anywhere}
  .room-info[open]>.room-info-panel,.room-info:hover>.room-info-panel,.room-info:focus-within>.room-info-panel{display:block}
  .room-info-panel p{margin:0 0 8px}.room-info-panel [role=status]{padding:8px 0 0!important;background:transparent!important;border:0!important;font-size:11px!important}
  .room-info-panel #sync{white-space:normal;display:block;margin-top:6px}
  @media(min-width:1024px){body.wayon-workbench .app-layout .sidebar{height:calc(100dvh - 78px)}}
  .wayon-room .sheet{max-height:calc(100dvh - 16px);overflow-y:auto}
  @media(max-height:650px) and (min-width:880px){body.wayon-room{padding:12px!important;gap:6px!important}.wayon-room .top{padding-bottom:6px;min-height:38px}.wayon-room .legend{font-size:11px}.wayon-room .k{padding:7px 9px;gap:1px}.wayon-room .k .w{font-size:14px;line-height:1.3}.wayon-room .k .s{font-size:12px;line-height:1.3}.wayon-room .k .tt,.wayon-room .room-teacher{font-size:11px}.wayon-room .hallbox{gap:3px;grid-auto-rows:minmax(28px,auto)}.wayon-room .c.seat,.wayon-room .k.chip,.wayon-room .hallbox>.seat.room-seat-add{min-height:28px}.wayon-room .k.chip{padding:3px 5px}.wayon-room .foot{font-size:11px}}
  @media(max-width:1023px){body.wayon-workbench .sidebar-footer{gap:6px!important}body.wayon-workbench .sidebar #workflow-tools{flex-direction:row!important;gap:4px!important;margin:0!important}body.wayon-workbench .app-layout .app-brand{padding:12px 16px!important}body.wayon-workbench .app-layout .main-content{padding:12px 14px 18px!important}}
  @media(max-width:700px){body.wayon-workbench .app-layout .app-brand{height:58px;min-height:58px;padding:10px 16px!important}body.wayon-workbench .app-layout .app-brand .brand-title{font-size:36px!important}body.wayon-workbench .app-layout .main-content{padding:8px!important}body.wayon-room{padding:10px!important}.wayon-room .top>b{font-size:17px}.wayon-room #cf{font-size:12px}.wayon-room .days{order:4;flex-basis:100%;margin:0}.wayon-room .days button{min-height:44px;height:44px;flex:1}.room-info>summary{width:44px;height:44px}.room-info-panel{right:0;width:min(320px,calc(100vw - 32px))}.wayon-room .room-scroll>.grid{min-height:540px;grid-template-rows:42px repeat(4,minmax(116px,1fr))!important}.wayon-room .legend{font-size:11px;gap:5px 10px}.wayon-room .c.seat,.wayon-room .k.chip,.wayon-room .hallbox>.seat.room-seat-add{min-height:44px}.wayon-room .sheet button{min-height:44px}}
  `;
  document.head.append(style);
  const setup = () => {
    if (document.body.classList.contains('wayon-workbench')) {
      let scheduled=false;
      const fit=()=>{
        scheduled=false;
        const frame=document.getElementById('classroom-frame');if(!frame)return;
        const top=frame.getBoundingClientRect().top+window.scrollY;
        const minimum=window.innerWidth<=700?620:430;
        const height=Math.max(minimum,Math.floor(window.innerHeight-top-18));
        const value=height+'px';if(frame.style.getPropertyValue('--room-frame-height')!==value)frame.style.setProperty('--room-frame-height',value);
      };
      const schedule=()=>{if(!scheduled){scheduled=true;requestAnimationFrame(fit);}};
      new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});
      new ResizeObserver(schedule).observe(document.querySelector('.app-layout')||document.body);
      window.addEventListener('resize',schedule);schedule();return;
    }
    if (!document.body.classList.contains('wayon-room')) return;
    const top = document.querySelector('.top'), grid = document.getElementById('g');
    if (!top || !grid) return;
    const info = document.createElement('details');info.className='room-info';
    const summary = document.createElement('summary');summary.textContent='ⓘ';summary.setAttribute('aria-label','课表状态与操作说明');
    const panel = document.createElement('div');panel.className='room-info-panel';
    const help=document.createElement('p');help.textContent='点击课程格可编辑；按住课程块可拖动。大厅虚线姓名为课后预占，点一下确认；“＋ 加座”可填写空座。';
    panel.append(help);const status=document.querySelector('body>[role="status"]');if(status)panel.append(status);
    const sync=document.getElementById('sync');if(sync)panel.append(sync);info.append(summary,panel);top.append(info);
    const decorate = () => {
      grid.querySelectorAll('.k:not(.chip) .s').forEach(node => {
        if(node.dataset.roomLayout)return;
        node.dataset.roomLayout='1';const text=node.textContent,i=text.lastIndexOf('·');if(i<0)return;
        const subject=document.createElement('span'),teacher=document.createElement('span');subject.className='room-subject';teacher.className='room-teacher';subject.textContent=text.slice(0,i);teacher.textContent=text.slice(i+1);node.replaceChildren(subject,teacher);
      });
      grid.querySelectorAll('.hallbox').forEach(box=>{
        const free=box.querySelector('.seat.free');if(free&&!free.classList.contains('room-seat-add')){free.classList.add('room-seat-add');free.textContent='＋ 加座';free.title=free.getAttribute('aria-label')+'：添加自习';}
      });
      const legend=document.getElementById('lg');if(legend)legend.querySelectorAll('span').forEach(span=>{if(span.querySelector('.lg-pre,.lg-ok')){span.title=span.textContent;span.textContent=span.querySelector('.lg-pre')?'虚线：预占':'实色：已确认';}});
      const foot=document.getElementById('f');if(foot&&foot.textContent.includes('按住课程块'))foot.textContent=foot.textContent.split('按住课程块')[0].trim();
    };
    decorate();new MutationObserver(decorate).observe(grid,{childList:true});
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
})();
