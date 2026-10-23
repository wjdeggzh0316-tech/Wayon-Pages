// Presentation only. Existing room/seat handlers and cloud identities stay intact.
(() => {
  if (typeof document === 'undefined' || document.getElementById('wayon-room-layout')) return;
  const style = document.createElement('style');
  style.id = 'wayon-room-layout';
  style.textContent = `
  .wayon-workbench:has(#classroom-frame) .app-brand{padding:12px 28px!important;border-radius:0 0 16px 16px;align-items:center;height:78px}
  .wayon-workbench:has(#classroom-frame) .app-brand .brand-title{font-size:52px!important;line-height:1!important;letter-spacing:-.06em}
  .wayon-workbench:has(#classroom-frame) .workspace-heading{display:none!important}
  .wayon-workbench:has(#classroom-frame) .main-content{max-width:none!important;padding:12px 24px 18px!important}
  .wayon-workbench:has(#classroom-frame) #list{width:100%;max-width:none!important;columns:1}
  .wayon-workbench #classroom-frame{width:100%!important;max-width:none!important;height:calc(100dvh - 144px)!important;min-height:620px!important;border:0!important;border-radius:16px!important}
  body.wayon-room{background:var(--card);padding:16px!important;gap:10px!important}
  .wayon-room .top{gap:8px 12px;min-height:44px;padding-bottom:10px;flex:none}
  .wayon-room .top>b{font-size:18px}.wayon-room #cf{font-size:13px;line-height:1.4}
  .wayon-room .days{order:3;gap:4px}.wayon-room .days button{min-height:36px;height:36px;padding:0 13px;font-size:13px}
  .wayon-room .legend{gap:6px 14px;font-size:12px;min-height:20px;align-items:center;flex:none}
  .wayon-room .legend span{white-space:nowrap}.wayon-room .legend i{width:10px;height:10px;border-radius:3px}
  .wayon-room .room-scroll{border-radius:12px;scrollbar-width:thin;scrollbar-color:var(--line) transparent}
  .wayon-room .room-scroll>.grid{min-width:1000px!important;min-height:590px;grid-template-columns:76px repeat(5,minmax(120px,1fr)) minmax(230px,1.3fr)!important;grid-template-rows:32px repeat(4,minmax(130px,1fr))!important;gap:8px!important}
  .wayon-room .grid>.h{font-size:14px;line-height:1.4;padding-bottom:4px}
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
  @media(max-width:700px){.wayon-workbench:has(#classroom-frame) .app-brand{height:58px;padding:10px 16px!important}.wayon-workbench:has(#classroom-frame) .app-brand .brand-title{font-size:36px!important}.wayon-workbench:has(#classroom-frame) .main-content{padding:8px!important}.wayon-workbench #classroom-frame{min-height:680px!important;height:calc(100dvh - 104px)!important}body.wayon-room{padding:10px!important}.wayon-room .top>b{font-size:17px}.wayon-room #cf{font-size:12px}.wayon-room .days{order:4;flex-basis:100%;margin:0}.wayon-room .days button{min-height:44px;height:44px;flex:1}.room-info>summary{width:44px;height:44px}.room-info-panel{right:0;width:min(320px,calc(100vw - 32px))}.wayon-room .room-scroll>.grid{min-height:600px}.wayon-room .legend{font-size:11px;gap:5px 10px}.wayon-room .c.seat,.wayon-room .k.chip,.wayon-room .hallbox>.seat.room-seat-add{min-height:44px}}
  .wayon-workbench:has(#classroom-frame) #workflow-tools,.wayon-workbench:has(#classroom-frame) .sidebar #sync{display:none!important}
  .wayon-room .sheet{max-height:calc(100dvh - 16px);overflow-y:auto}
  @media(max-width:700px){.wayon-workbench:has(#classroom-frame) .sidebar{padding:8px 16px!important;gap:4px!important}.wayon-workbench:has(#classroom-frame) .sidebar-top{display:none!important}.wayon-workbench:has(#classroom-frame) .sidebar-footer{padding:0!important;gap:0!important}.wayon-workbench #classroom-frame{height:calc(100dvh - 220px)!important;min-height:480px!important}.wayon-room .sheet button{min-height:44px}}
  @media(max-width:700px){.wayon-workbench:has(#classroom-frame) .app-layout{display:block!important}.wayon-workbench:has(#classroom-frame) .sidebar{position:relative!important;top:auto!important;left:auto!important;width:100%!important;height:auto!important;overflow:visible!important;display:flex!important;flex-direction:column!important;border-right:0}.wayon-workbench:has(#classroom-frame) #tabs{flex-direction:row!important;justify-content:space-between}.wayon-workbench:has(#classroom-frame) #tabs button{width:auto!important;flex:1;justify-content:center}.wayon-workbench:has(#classroom-frame) .main-content{margin-left:0!important}.wayon-workbench:has(#classroom-frame) .sidebar-footer{position:static!important;display:flex!important;flex-direction:row!important;align-items:center}.wayon-workbench:has(#classroom-frame) .sidebar .cloud-panel{position:static!important;max-height:none!important}}
  `;
  document.head.append(style);
  const setup = () => {
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
