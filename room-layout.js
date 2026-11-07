// Presentation only. Existing room/seat handlers and cloud identities stay intact.
(() => {
  if (typeof document === 'undefined' || document.getElementById('wayon-room-layout')) return;
  const style = document.createElement('style');
  style.id = 'wayon-room-layout';
  style.textContent = `
  .wayon-workbench:has(#classroom-frame) #list{columns:1;max-width:none!important}
  .wayon-workbench:has(#classroom-frame) .main-content{max-width:none!important}
  .wayon-workbench:has(#classroom-frame) .main-content{padding-bottom:18px!important}
  @media(min-width:1024px){.wayon-workbench:has(#classroom-frame) .sidebar{height:calc(100dvh - var(--room-shell-height,172px))}}
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
  .wayon-room .hallbox{grid-template-columns:repeat(auto-fill,minmax(84px,1fr))!important;grid-auto-rows:minmax(36px,auto);gap:5px;padding:4px;align-content:start;overflow:auto;border-radius:12px}
  .wayon-room .hallbox>.seat.free{display:none}.wayon-room .hallbox>.seat.room-seat-add{display:flex;opacity:1;min-height:36px;cursor:pointer;background:transparent;color:var(--accent);border:1px dashed var(--line-strong);font-size:12px}
  .wayon-room .c.seat{min-height:36px;border-radius:7px;padding:0}
  .wayon-room .k.chip{padding:6px 5px;border-radius:7px;min-height:36px;width:100%}
  .wayon-room .k.chip .w{font-size:12px;font-weight:550;line-height:1.3;white-space:normal;overflow:visible;text-overflow:clip;overflow-wrap:anywhere;word-break:normal}
  .wayon-room .k.chip.pre{border-color:var(--hallb);background:var(--hall)!important;opacity:.85}
  .wayon-room .k.chip .x{border-radius:0 7px 7px 0;padding:0 6px;min-width:24px}
  .wayon-room .room-cont{display:flex;flex-direction:column;justify-content:center;gap:2px;height:100%;min-height:48px;padding:10px 12px;border-radius:10px;border:1px dashed var(--line-strong,rgba(0,0,0,.18));color:var(--muted);font-size:12px;line-height:1.4;box-sizing:border-box}
  .wayon-room .room-cont b{color:var(--fg);font-weight:600;font-size:13px;overflow-wrap:anywhere}
  .wayon-room .room-scroll-hint{display:none;font-size:12px;color:var(--muted);flex:none;margin:-2px 0 2px}
  .wayon-room.room-overflow .room-scroll-hint{display:block}
  .wayon-room .foot{font-size:12px;line-height:1.5;padding-top:2px;flex:none}.wayon-room .foot:empty{display:none}
  .room-info{position:relative;order:2;margin-left:auto;flex:none;font-size:12px}
  .room-info>summary{display:grid;place-items:center;list-style:none;width:36px;height:36px;border:1px solid var(--line);border-radius:9px;color:var(--muted);cursor:pointer;font-size:16px}
  .room-info>summary::-webkit-details-marker{display:none}.room-info>summary:hover{color:var(--accent);background:var(--accent-subtle)}
  .room-info-panel{display:none;position:absolute;right:0;top:100%;z-index:20;width:min(340px,calc(100vw - 32px));padding:14px;border:1px solid var(--line);border-radius:12px;background:var(--card);box-shadow:0 8px 32px rgba(0,0,0,.12);font-size:12px;line-height:1.7;color:var(--fg-secondary);overflow-wrap:anywhere}
  .room-info[open]>.room-info-panel,.room-info:hover>.room-info-panel,.room-info:focus-within>.room-info-panel{display:block}
  .room-info-panel p{margin:0 0 8px}.room-info-panel [role=status]{padding:8px 0 0!important;background:transparent!important;border:0!important;font-size:11px!important}
  .room-info-panel #sync{white-space:normal;display:block;margin-top:6px}
  .wayon-room .sheet{max-height:calc(100dvh - 16px);overflow-y:auto}
  @media(max-height:650px) and (min-width:880px){body.wayon-room{padding:12px!important;gap:6px!important}.wayon-room .top{padding-bottom:6px;min-height:38px}.wayon-room .legend{font-size:11px}.wayon-room .k{padding:7px 9px;gap:1px}.wayon-room .k .w{font-size:14px;line-height:1.3}.wayon-room .k .s{font-size:12px;line-height:1.3}.wayon-room .k .tt,.wayon-room .room-teacher{font-size:11px}.wayon-room .hallbox{grid-template-columns:repeat(auto-fill,minmax(84px,1fr))!important;gap:3px;grid-auto-rows:minmax(28px,auto)}.wayon-room .c.seat,.wayon-room .k.chip,.wayon-room .hallbox>.seat.room-seat-add{min-height:28px}.wayon-room .k.chip{padding:3px 5px}.wayon-room .foot{font-size:11px}}
  @media(max-width:1023px){.wayon-workbench:has(#classroom-frame) #list>div:has(>a[target="_blank"]){min-height:44px!important}.wayon-workbench .sidebar #workflow-tools{position:absolute;left:14px;top:calc(100% + 8px);flex-direction:row!important;gap:4px!important;margin:0!important;z-index:4}}
  @media(max-width:700px){body.wayon-room{padding:10px!important}.wayon-room .top>b{font-size:17px}.wayon-room #cf{font-size:12px}.wayon-room .days{order:4;flex-basis:100%;margin:0}.wayon-room .days button{min-height:44px;height:44px;flex:1}.room-info>summary{width:44px;height:44px}.room-info-panel{right:0;width:min(320px,calc(100vw - 32px))}.wayon-room .room-scroll>.grid{min-height:540px;grid-template-rows:42px repeat(4,minmax(116px,1fr))!important}.wayon-room .legend{font-size:11px;gap:5px 10px}.wayon-room .c.seat,.wayon-room .k.chip,.wayon-room .hallbox>.seat.room-seat-add{min-height:44px}.wayon-room .sheet button{min-height:44px}}
  `;
  document.head.append(style);
  const timelineStyle = document.createElement('style');
  timelineStyle.id = 'wayon-room-timeline';
  timelineStyle.textContent = `
  /* Header: title + status pill on the left, segmented day picker and info on the right. */
  body.wayon-room{gap:8px!important}
  .wayon-room .top{display:flex;align-items:center;flex-wrap:wrap;gap:10px 12px;min-height:40px;padding:0!important;border-bottom:0!important}
  .wayon-room .top>b{font-size:20px!important;font-weight:650!important;letter-spacing:-.02em;order:0}
  .wayon-room .top #cf{order:1;display:inline-flex;align-items:center;height:24px;padding:0 10px;border-radius:999px;font-size:12px!important;font-weight:550;background:var(--done-bg);color:var(--done-dark)}
  .wayon-room .top #cf.no,.wayon-room .top #cf.miss{background:var(--bad-bg);color:var(--bad-dark)}
  .wayon-room .top #cf:empty{display:none}
  .wayon-room .top .days{order:2;margin-left:auto!important;display:inline-flex;gap:2px!important;padding:3px;border-radius:10px;background:var(--code-bg);border:1px solid var(--line)}
  .wayon-room .top .days button{height:30px!important;min-height:30px!important;padding:0 14px!important;border:0!important;border-radius:7px!important;background:transparent!important;color:var(--muted)!important;box-shadow:none!important;font-size:13px!important;font-weight:550!important;font-variant-numeric:tabular-nums}
  .wayon-room .top .days button:hover{color:var(--fg)!important}
  .wayon-room .top .days button.on{background:var(--card)!important;color:var(--fg)!important;box-shadow:0 1px 3px rgba(0,0,0,.12)!important;font-weight:650!important}
  .wayon-room .top .room-info{order:3;margin-left:0}
  .wayon-room .top .room-info>summary{width:34px;height:34px;border-radius:9px;font-size:15px}
  .wayon-room .legend{gap:4px 14px!important;font-size:12px!important;color:var(--muted);padding:0 0 4px}
  .wayon-room .legend i{width:8px!important;height:8px!important;border-radius:50%!important}
  .wayon-room .legend .lg-hall-note{margin-left:auto;opacity:.85}
  /* Column headers: one line each, aligned, with a hairline under them. */
  .wayon-room .grid.tl>.h{flex-direction:row!important;align-items:center!important;justify-content:center!important;gap:6px;font-size:13px!important;font-weight:600;padding:0 0 6px!important;border-bottom:1px solid var(--line-strong);white-space:nowrap}
  .wayon-room .grid.tl>.h small{display:inline;font-size:11px!important;font-weight:400;color:var(--muted)}
  .wayon-room .grid.tl>.h.man::after{content:"✎";font-size:11px}
  .wayon-room .grid.tl>.h.tl-corner{border-bottom-color:transparent}
  @media(max-width:700px){.wayon-room .top .days{order:4;flex-basis:100%;margin-left:0!important}.wayon-room .top .days button{flex:1;height:38px!important;min-height:38px!important}.wayon-room .top .room-info{margin-left:auto}.wayon-room .top .room-info>summary{width:40px;height:40px}.wayon-room .legend .lg-hall-note{margin-left:0}}
  .wayon-room .room-scroll>.grid.tl{height:auto!important;min-height:0!important;row-gap:0!important;column-gap:8px!important;align-items:stretch}
  .wayon-room .grid.tl>.h{position:sticky;top:0;z-index:4;background:var(--card);padding-bottom:6px}
  .wayon-room .grid.tl>.h.man::after{content:" ✎";color:var(--edit);font-size:12px}
  .wayon-room .grid.tl>.h.tl-corner{left:0;z-index:5}
  .wayon-room .tl-time{position:sticky;left:0;z-index:2;background:var(--card);font-size:11px;line-height:1;color:var(--muted);text-align:right;padding-right:8px;font-variant-numeric:tabular-nums;transform:translateY(-5px);white-space:nowrap}
  .wayon-room .tl-time.first{transform:none}
  .wayon-room .tl-time.hour{color:var(--fg-secondary);font-weight:600;font-size:12px}
  .wayon-room .tl-slot{border-top:1px solid var(--line);cursor:copy;min-width:0}
  .wayon-room .tl-slot.half{border-top-style:dashed}
  .wayon-room .tl-slot.off{background:repeating-linear-gradient(135deg,transparent 0 6px,var(--line) 6px 7px)}
  .wayon-room .tl-slot:hover{background:var(--accent-subtle)}
  .wayon-room .k.tl-lesson{position:relative;z-index:1;justify-self:start;margin:1px 0;padding:6px 9px;border-radius:8px;gap:1px;overflow:hidden;justify-content:flex-start;box-shadow:0 1px 2px rgba(0,0,0,.06)}
  .wayon-room .k.tl-lesson .tt{order:-1}
  .wayon-room .k.tl-lesson.short{padding:2px 8px;flex-direction:row;align-items:center;gap:6px}
  .wayon-room .k.tl-lesson.short .s{display:none}.wayon-room .k.tl-lesson.short .w{font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .wayon-room .k.tl-lesson.man{outline:1.5px solid var(--edit);outline-offset:-1.5px}
  .wayon-room .k.tl-lesson.man::after{content:"✎";position:absolute;top:3px;right:6px;font-size:10px;color:var(--edit)}
  .wayon-room .k.tl-lesson.bad{outline:2px solid var(--bad);outline-offset:-2px}
  .wayon-room .k.tl-lesson:focus-visible{outline:3px solid var(--accent);outline-offset:1px}
  .wayon-room .tl-preview{z-index:3;border:2px dashed var(--accent);border-radius:8px;background:var(--accent-subtle);color:var(--accent);font-size:12px;font-weight:600;padding:4px 8px;pointer-events:none;font-variant-numeric:tabular-nums;margin:1px 0}
  .wayon-room .grid.tl .hallbox{margin:2px 0;border:1px dashed var(--line-strong);grid-auto-rows:minmax(28px,auto)!important;grid-template-columns:repeat(auto-fill,minmax(72px,1fr))!important}
  .wayon-room .grid.tl .c.seat,.wayon-room .grid.tl .k.chip,.wayon-room .grid.tl .hallbox>.seat.room-seat-add{min-height:28px}
  .wayon-room .grid.tl .k.chip{padding:3px 5px}
  .wayon-room .tl-hall-label{font-size:11px;color:var(--muted);grid-column:1/-1;padding:2px 4px 0}
  .wayon-room .tl-now{z-index:3;height:2px;background:var(--bad);align-self:start;pointer-events:none;position:relative}
  .wayon-room .tl-now::before{content:"";position:absolute;left:-4px;top:-3px;width:8px;height:8px;border-radius:50%;background:var(--bad)}
  .wayon-room .tl-hallband{border-top:1px solid var(--line);background:color-mix(in srgb,var(--hall) 38%,transparent);border-radius:0 0 8px 8px;cursor:copy;position:relative;margin-bottom:2px}
  .wayon-room .tl-hallband:hover{background:color-mix(in srgb,var(--hall) 70%,transparent)}
  .wayon-room .tl-hallband.over{background:var(--bad-bg);box-shadow:inset 0 0 0 1.5px var(--bad)}
  .wayon-room .tl-hallband.man::after{content:"✎";position:absolute;right:6px;bottom:3px;font-size:10px;color:var(--edit)}
  .wayon-room .tl-hallcount{position:absolute;right:6px;top:3px;font-size:10.5px;color:var(--muted);font-variant-numeric:tabular-nums;pointer-events:none}
  .wayon-room .tl-hallband.over .tl-hallcount{color:var(--bad);font-weight:700}
  .wayon-room .tl-hallbar{z-index:1;justify-self:start;display:flex;flex-direction:column;gap:2px;margin:18px 0 3px;padding:6px 7px;border-radius:7px;background:var(--hall);border:1px solid var(--hallb);border-left-width:3px;color:var(--fg);font-size:12.5px;font-weight:600;line-height:1.25;overflow:hidden;cursor:pointer;min-width:0;box-sizing:border-box}
  .wayon-room .tl-hallbar.pre{background:transparent;border-style:dashed;border-left-width:1px;color:var(--fg-secondary)}
  .wayon-room .tl-hallbar.vertical{align-items:center;padding:6px 0}
  .wayon-room .tl-hallbar.vertical .tl-hallname{writing-mode:vertical-rl;text-orientation:mixed;letter-spacing:.06em;white-space:nowrap}
  .wayon-room .tl-hallname{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .wayon-room .tl-hallmeta{font-size:10.5px;font-weight:400;color:var(--muted)}
  .wayon-room .tl-hallbar:focus-visible{outline:3px solid var(--accent);outline-offset:1px}
  .wayon-room #tlhall .tl-fields{display:grid;grid-template-columns:1fr;gap:8px}
  .wayon-room #tlhall label{display:flex;flex-direction:column;gap:3px;font-size:12px;color:var(--muted)}
  .wayon-room #tlhall input:not([type=checkbox]){font:inherit;font-size:16px;min-height:40px;padding:6px 8px;border:1px solid var(--line-strong);border-radius:8px;background:var(--bg);color:var(--fg)}
  .wayon-room #tlhall .tl-hallsegs{display:flex;flex-wrap:wrap;gap:8px}
  .wayon-room #tlhall .tl-hallseg{flex-direction:row;align-items:center;gap:6px;min-height:40px;padding:0 12px;border:1px solid var(--line-strong);border-radius:9px;font-size:13px;color:var(--fg);cursor:pointer}
  .wayon-room #tlhall .tl-hallseg:has(input:checked){border-color:var(--accent);background:var(--accent-subtle)}
  .wayon-room #tlhall .tl-hallseg input{width:18px;height:18px;margin:0}
  .wayon-room #tlhall .tl-err{color:var(--bad);font-size:13px;min-height:1em}
  .wayon-room #tlsh .tl-fields{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px}
  .wayon-room #tlsh label{display:flex;flex-direction:column;gap:3px;font-size:12px;color:var(--muted)}
  .wayon-room #tlsh input,.wayon-room #tlsh select{font:inherit;font-size:16px;min-height:40px;padding:6px 8px;border:1px solid var(--line-strong);border-radius:8px;background:var(--bg);color:var(--fg);min-width:0}
  .wayon-room #tlsh .tl-err{color:var(--bad);font-size:13px;min-height:1em}
  @media(max-width:700px){.wayon-room .tl-time{font-size:10px;padding-right:4px}.wayon-room .k.tl-lesson{padding:4px 6px}.wayon-room .k.tl-lesson .w{font-size:13px}.wayon-room .k.tl-lesson .s,.wayon-room .k.tl-lesson .tt{font-size:11px}}
  `;
  document.head.append(timelineStyle);
  // Calendar view: rooms on a real time axis instead of four fixed two-hour cells.
  // Storage is unchanged: a lesson still lives in every A–D cell it overlaps, with its exact time in x[3].
  function installTimeline(grid) {
    if (typeof render !== 'function' || typeof items !== 'function' || typeof setCell !== 'function') return;
    const STEP = 5, SNAP = 10, MIN_ROW = 6, MAX_ROW = 11;   // grid rows are 5 minutes; dragging snaps to 10
    const toM = t => { const m = /^(\d{1,2}):(\d{2})$/.exec(String(t || '').trim()); return m ? +m[1] * 60 + +m[2] : NaN; };
    const toT = m => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
    const plain = value => String(value || '').replace(/[【】「」]/g, '').trim();
    // The page data matches D up to 21:30 while showing 15:40–17:40 (same rule as the generator).
    const segStop = si => S[si][0] === 'D' ? '21:30' : S[si][2];
    const spanOf = (x, si) => { const m = /^(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})$/.exec(String(x[3] || '').trim()); return m ? [m[1], m[2]] : [S[si][1], S[si][2]]; };
    const idOf = (x, si) => { const [a, b] = spanOf(x, si); return JSON.stringify([x[0] || '', x[1] || '', x[2] || '', a, b]); };
    const rooms = R.map((_, i) => i).filter(i => i !== HALL);
    const lessonsOf = (ri, source) => {
      const out = [];
      S.forEach((_, si) => (source(ri, si) || []).forEach(x => {
        if (!x) return;
        const id = idOf(x, si);
        let lesson = out.find(l => l.id === id);
        if (!lesson) { const [a, b] = spanOf(x, si); lesson = {id, x, a, b, ri, segs: []}; out.push(lesson); }
        if (!lesson.segs.includes(si)) lesson.segs.push(si);
      }));
      return out.sort((p, q) => p.a.localeCompare(q.a) || p.b.localeCompare(q.b));
    };
    function removeLesson(lesson) {
      lesson.segs.forEach(si => setCell(lesson.ri, si, items(lesson.ri, si).filter(x => !(x && idOf(x, si) === lesson.id))));
    }
    function addLesson(ri, who, subject, teacher, a, b) {
      let targets = S.map((_, si) => si).filter(si => a < segStop(si) && b > S[si][1]);
      if (!targets.length) {   // e.g. a lunch-time lesson: keep it in the nearest cell, shown at its real time
        const mid = (toM(a) + toM(b)) / 2, dist = si => Math.min(Math.abs(mid - toM(S[si][1])), Math.abs(mid - toM(S[si][2])));
        targets = [S.map((_, si) => si).sort((p, q) => dist(p) - dist(q))[0]];
      }
      targets.forEach(si => {
        const time = a === S[si][1] && b === S[si][2] ? '' : a + '-' + b;
        setCell(ri, si, items(ri, si).concat([[who, subject, teacher, time]]));
      });
    }
    let view = null, tdrag = null, sheetLesson = null;
    const scroller = grid.closest('.room-scroll');
    function rowHeight(rows) {
      const head = 34, room = scroller ? scroller.clientHeight - head - 8 : 0;
      return Math.max(MIN_ROW, Math.min(MAX_ROW, Math.floor(room / rows) || MIN_ROW));
    }
    const lineOf = m => Math.round((m - view.lo) / STEP) + 2;
    const place = (node, row1, row2, col) => { node.style.gridRow = row1 + ' / ' + row2; node.style.gridColumn = String(col); return node; };
    // Hall: one whole-day board. Each person is a bar running through the periods they sit in the hall.
    // Storage is unchanged: one seat entry per A–D period, as before.
    function hallPeople() {
      const people = new Map();
      S.forEach((_, si) => items(HALL, si).forEach(x => {
        if (!x) return;
        const name = String(x[0] || '').trim(); if (!name) return;
        if (!people.has(name)) people.set(name, {name, segs: new Map()});
        people.get(name).segs.set(si, x);
      }));
      return [...people.values()].sort((p, q) => Math.min(...p.segs.keys()) - Math.min(...q.segs.keys()) || p.name.localeCompare(q.name, 'zh'));
    }
    function setHallPerson(oldName, name, wanted, confirm) {
      S.forEach((_, si) => {
        const arr = items(HALL, si).slice(), at = arr.findIndex(x => x && String(x[0] || '').trim() === oldName);
        if (wanted.has(si)) {
          const prev = at >= 0 ? arr[at] : null;
          const status = prev ? (confirm && prev[1] === '课后' ? '确定' : prev[1]) : '自习';
          const entry = [name, status || '自习', prev ? prev[2] || '' : '', prev ? prev[3] || '' : ''];
          if (at >= 0) arr[at] = entry; else { const free = arr.findIndex(x => !x); if (free < 0) arr.push(entry); else arr[free] = entry; }
        } else if (at >= 0) arr[at] = null;
        setCell(HALL, si, arr);
      });
    }
    function hallBoard(col) {
      let maxHall = 0;
      S.forEach((s, si) => {   // period bands: counts, capacity, click to add someone
        const n = seated(items(HALL, si)); if (n > maxHall) maxHall = n;
        const band = el('div', 'tl-hallband' + (n > SEATS ? ' over' : '') + (has(key(HALL, si)) ? ' man' : ''));
        band.append(el('span', 'tl-hallcount', s[0] + ' · ' + n + '/' + SEATS));
        band.title = '大厅 ' + s[0] + ' 段 ' + s[1] + '–' + s[2] + '：已坐 ' + n + ' / ' + SEATS + '（点空白处添加自习）';
        band.onclick = () => openHall(null, si);
        place(band, lineOf(toM(s[1])), lineOf(Math.min(toM(s[2]), view.hi)), col); grid.append(band);
      });
      const people = hallPeople(), lanes = Math.max(1, people.length);
      const width = view.cols[HALL] ? view.cols[HALL].getBoundingClientRect().width : 200;
      const vertical = width / lanes < 64;
      people.forEach((person, lane) => {
        const segs = [...person.segs.keys()].sort((a, b) => a - b), runs = [];
        segs.forEach(si => { const last = runs[runs.length - 1]; if (last && last[last.length - 1] === si - 1) last.push(si); else runs.push([si]); });
        runs.forEach(run => {
          const pre = run.every(si => person.segs.get(si)[1] === '课后');
          const from = S[run[0]][1], to = S[run[run.length - 1]][2];
          const bar = el('div', 'tl-hallbar' + (pre ? ' pre' : '') + (vertical ? ' vertical' : ''));
          bar.append(el('span', 'tl-hallname', plain(person.name)));
          if (!vertical) bar.append(el('span', 'tl-hallmeta', run.map(si => S[si][0]).join(' ')));
          bar.style.width = 'calc(' + (100 / lanes) + '% - 3px)';
          bar.style.marginLeft = 'calc(' + (100 * lane / lanes) + '%)';
          bar.tabIndex = 0; bar.setAttribute('role', 'button');
          const label = plain(person.name) + ' 大厅 ' + run.map(si => S[si][0]).join('、') + ' 段 ' + from + '–' + to + (pre ? '，预占（上完课自动放入，点一下确认）' : '');
          bar.title = label; bar.setAttribute('aria-label', label);
          const act = () => {
            if (pre) { const before = JSON.stringify(ed); setHallPerson(person.name, person.name, new Set(person.segs.keys()), true); commit(before); }
            else openHall(person);
          };
          bar.onclick = e => { e.stopPropagation(); act(); };
          bar.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(); } };
          place(bar, lineOf(toM(from)), lineOf(Math.min(toM(to), view.hi)), col); grid.append(bar);
        });
      });
      return maxHall;
    }
    function lessonNode(lesson, col, lane, lanes, man, bad) {
      const x = lesson.x, minutes = toM(lesson.b) - toM(lesson.a);
      // Borrowed rooms ("（课表外）") read like lessons — student, then subject·teacher — and are always grey.
      // A booking label "易赛 老师👉学生" splits into teacher and student; the stored entry is unchanged.
      const borrowed = /（课表外）$/.test(String(x[1] || ''));
      let who = plain(x[0]), subject = x[1] || '', teacher = x[2] || '';
      if (borrowed) {
        subject = subject.replace(/（课表外）$/, '').trim();
        const arrow = who.indexOf('👉');
        if (arrow >= 0) { teacher = who.slice(0, arrow).trim() || teacher; who = who.slice(arrow + 2).trim() || who; }
      }
      const tone = borrowed ? '5' : tcol[x[2]] || '5';
      const node = el('div', 'k tl-lesson' + (borrowed ? ' borrowed' : '') + (minutes < 45 ? ' short' : '') + (man ? ' man' : '') + (bad ? ' bad' : ''));
      node.style.background = 'var(--t' + tone + ')';
      node.style.borderLeftColor = 'var(--t' + tone + 'b)';
      node.append(el('div', 'tt', lesson.a + '–' + lesson.b));
      node.append(el('div', 'w', who));
      const sub = [subject, teacher].filter(Boolean).join('·');
      if (sub) node.append(el('div', 's', sub));
      node.tabIndex = 0; node.setAttribute('role', 'button');
      node.setAttribute('aria-label', R[lesson.ri] + ' ' + lesson.a + '到' + lesson.b + ' ' + who + (sub ? ' ' + sub : '') + (borrowed ? '，借用教室' : '') + (bad ? '，时间冲突' : ''));
      node.title = who + ' ' + lesson.a + '–' + lesson.b + (sub ? '\n' + sub : '') + (borrowed ? '\n借用教室（课表外）' : '') + (bad ? '\n⚠️ 与同教室另一节课时间重叠' : '');
      node.style.width = 'calc(' + (100 / lanes) + '% - ' + (lanes > 1 ? 3 : 0) + 'px)';
      node.style.marginLeft = 'calc(' + (100 * lane / lanes) + '%)';
      place(node, lineOf(toM(lesson.a)), lineOf(toM(lesson.b)), col);
      node.addEventListener('pointerdown', e => lessonDown(e, node, lesson));
      node.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLesson(lesson); } };
      return node;
    }
    function timelineRender() {
      grid.textContent = ''; grid.classList.add('tl');
      const current = rooms.map(ri => lessonsOf(ri, items));
      let lo = toM(S[0][1]), hi = toM(S[S.length - 1][2]);
      current.flat().forEach(l => { lo = Math.min(lo, toM(l.a)); hi = Math.max(hi, toM(l.b)); });
      lo = Math.floor(lo / 30) * 30; hi = Math.ceil(hi / 30) * 30;
      const rows = (hi - lo) / STEP, rowH = rowHeight(rows), hallCol = R.length + 1;
      view = {lo, hi, rowH, cols: {}};
      grid.style.setProperty('grid-template-columns', '52px repeat(' + rooms.length + ',minmax(104px,1fr)) minmax(190px,1.15fr)', 'important');
      grid.style.setProperty('grid-template-rows', '34px repeat(' + rows + ',' + rowH + 'px)', 'important');
      const corner = el('div', 'h tl-corner', ''); place(corner, 1, 2, 1); grid.append(corner);
      R.forEach((name, ri) => {
        const head = el('div', 'h', name.replace('教室', '').replace('（自习）', ''));
        if (ri === HALL) head.append(el('small', '', SEATS + ' 座'));
        if (ri === HALL) head.title = '大厅按 A–D 段排座：虚线 = 课后预占（点一下确认），实色 = 已确认';
        else if (S.some((_, si) => has(key(ri, si)))) { head.classList.add('man'); head.title = '这间教室今天手动改过'; }
        place(head, 1, 2, ri + 2); grid.append(head);
        view.cols[ri] = head;
      });
      const gaps = [];
      for (let i = 0; i + 1 < S.length; i++) gaps.push([toM(S[i][2]), toM(S[i + 1][1])]);
      const off = m => gaps.some(([a, b]) => m >= a && m < b);
      for (let m = lo; m < hi; m += 30) {
        const label = el('div', 'tl-time' + (m % 60 ? '' : ' hour') + (m === lo ? ' first' : ''), toT(m));
        place(label, lineOf(m), lineOf(m) + 2, 1); grid.append(label);
        rooms.forEach(ri => {
          for (let part = 0; part < 30; part += 10) {
            const t = m + part, slot = el('div', 'tl-slot' + (part ? ' sub' : m % 60 ? ' half' : '') + (off(t) ? ' off' : ''));
            if (part) slot.style.borderTopColor = 'transparent';
            slot.setAttribute('aria-hidden', 'true');
            slot.onclick = () => { if (!tdrag) openLesson(null, ri, toT(t)); };
            place(slot, lineOf(t), lineOf(t + 10), ri + 2); grid.append(slot);
          }
        });
      }
      let bad = 0, maxHall = 0;
      rooms.forEach((ri, i) => {
        const list = current[i], originals = new Set(lessonsOf(ri, orig).map(l => l.id));
        // Overlapping lessons in one room sit side by side and are flagged as a conflict.
        const lane = [], clusters = [];
        list.forEach(l => {
          let c = clusters[clusters.length - 1];
          if (!c || l.a >= c.end) { c = {end: l.b, ends: []}; clusters.push(c); }
          if (l.b > c.end) c.end = l.b;
          let j = c.ends.findIndex(e => e <= l.a); if (j < 0) j = c.ends.length;
          c.ends[j] = l.b; lane.push([c, j]);
        });
        list.forEach((l, k) => {
          const [c, j] = lane[k], conflict = c.ends.length > 1;
          if (conflict) bad++;
          grid.append(lessonNode(l, ri + 2, j, c.ends.length, !originals.has(l.id), conflict));
        });
      });
      maxHall = hallBoard(hallCol);
      if (curD === today) {
        const now = new Date(new Date().toLocaleString('en-US', {timeZone: 'Asia/Shanghai'})), m = now.getHours() * 60 + now.getMinutes();
        if (m >= lo && m < hi) {
          const line = el('div', 'tl-now'); line.style.marginTop = ((m - lo) % STEP) / STEP * rowH + 'px';
          line.setAttribute('aria-hidden', 'true'); place(line, lineOf(m - (m - lo) % STEP), lineOf(m - (m - lo) % STEP) + 1, '2 / ' + hallCol); grid.append(line);
        }
      }
      const legend = $('lg'), anyBorrowed = !!grid.querySelector('.tl-lesson.borrowed');
      if (legend && anyBorrowed && !legend.querySelector('.lg-borrowed')) {
        const item = el('span', 'lg-borrowed'), dot = el('i'); dot.style.background = 'var(--t5b)';
        item.append(dot, document.createTextNode('借用教室')); legend.prepend(item);
      } else if (legend && !anyBorrowed) legend.querySelector('.lg-borrowed')?.remove();
      const pairs = Math.ceil(bad / 2);
      $('cf').className = DATA.missing ? 'miss' : (bad || maxHall > SEATS) ? 'no' : 'ok';
      $('cf').textContent = DATA.missing ? (DATA.booking_preview ? '课表待更新；已显示借用预留' : '这天还没生成')
        : (bad ? '⚠️ ' + pairs + ' 处教室时间重叠' : '✓ 无冲突') + (maxHall > SEATS ? ' · ⚠️ 大厅超员' : ' · 大厅最多 ' + maxHall + '/' + SEATS);
      const dl = $('days'); dl.textContent = '';
      [...new Set([today, tomorrow, ...Object.keys(ALL).filter(d => d >= today)])].sort().slice(0, 7).forEach(d => {
        const b = el('button', d === curD ? 'on' : '', relD(d) + mdD(d)); b.type = 'button'; b.onclick = () => { if (d !== curD) useDay(d); }; dl.append(b); });
    }
    // Drag a lesson to another room or time; the preview snaps to 10 minutes and keeps the length.
    function lessonDown(e, node, lesson) {
      if (e.button !== undefined && e.button !== 0) return;
      e.stopPropagation();
      const r = node.getBoundingClientRect();
      tdrag = {node, lesson, x0: e.clientX, y0: e.clientY, grab: e.clientY - r.top, moved: false, preview: null, target: null, raf: 0, px: 0, py: 0};
      try { node.setPointerCapture(e.pointerId); } catch (_) {}
      node.onpointermove = lessonMove; node.onpointerup = lessonUp; node.onpointercancel = () => finishDrag(false);
    }
    function dropAt(px, py) {
      const length = toM(tdrag.lesson.b) - toM(tdrag.lesson.a);
      const ri = rooms.find(r => { const box = view.cols[r].getBoundingClientRect(); return px >= box.left - 4 && px <= box.right + 4; });
      if (ri === undefined) return null;
      const top = view.cols[ri].getBoundingClientRect().bottom;
      let start = view.lo + Math.round((py - tdrag.grab - top) / (view.rowH * SNAP / STEP)) * SNAP;
      start = Math.max(view.lo, Math.min(view.hi - length, start));
      return {ri, a: toT(start), b: toT(start + length)};
    }
    function paintDrag() {
      tdrag.raf = 0;
      const target = dropAt(tdrag.px, tdrag.py);
      tdrag.target = target;
      if (!target) { if (tdrag.preview) tdrag.preview.hidden = true; return; }
      if (!tdrag.preview) { tdrag.preview = el('div', 'tl-preview'); grid.append(tdrag.preview); }
      tdrag.preview.hidden = false;
      tdrag.preview.textContent = R[target.ri].replace('教室', '') + ' ' + target.a + '–' + target.b;
      place(tdrag.preview, lineOf(toM(target.a)), lineOf(toM(target.b)), target.ri + 2);
    }
    function lessonMove(e) {
      if (!tdrag) return;
      tdrag.px = e.clientX; tdrag.py = e.clientY;
      if (!tdrag.moved) { if (Math.hypot(e.clientX - tdrag.x0, e.clientY - tdrag.y0) < 5) return; tdrag.moved = true; tdrag.node.classList.add('dragging'); }
      if (!tdrag.raf) tdrag.raf = requestAnimationFrame(paintDrag);
    }
    function finishDrag(apply, quiet) {
      const d = tdrag; if (!d) return;
      if (d.raf) cancelAnimationFrame(d.raf);
      d.node.onpointermove = d.node.onpointerup = d.node.onpointercancel = null;
      setTimeout(() => { tdrag = null; }, 0);
      const t = d.target, l = d.lesson;
      if (apply && t && (t.ri !== l.ri || t.a !== l.a)) {
        const before = JSON.stringify(ed);
        removeLesson(l); addLesson(t.ri, l.x[0] || '', l.x[1] || '', l.x[2] || '', t.a, t.b);
        commit(before);
      } else if (!quiet) render();
    }
    function lessonUp(e) {
      if (!tdrag) return;
      if (!tdrag.moved) { const lesson = tdrag.lesson; finishDrag(false, true); openLesson(lesson); return; }
      tdrag.px = e.clientX; tdrag.py = e.clientY; paintDrag(); finishDrag(true);
    }
    // Lesson editor: who / subject / teacher / room / start / end. Only this page's table changes.
    const sheet = el('div', 'sheet'); sheet.id = 'tlsh'; sheet.setAttribute('role', 'dialog'); sheet.setAttribute('aria-modal', 'false');
    const title = el('div', 't'), fields = el('div', 'tl-fields'), err = el('div', 'tl-err');
    const field = (label, input) => { const box = el('label', '', label); box.append(input); fields.append(box); return input; };
    const inWho = field('学生 / 班级', el('input')), inSub = field('科目', el('input')), inTeacher = field('老师', el('input'));
    const inRoom = field('教室', el('select')), inA = field('开始', el('input')), inB = field('结束', el('input'));
    inA.type = inB.type = 'time'; inA.step = inB.step = 600;
    const teacherList = el('datalist'); teacherList.id = 'tl-teachers'; inTeacher.setAttribute('list', teacherList.id);
    rooms.forEach(ri => { const o = el('option', '', R[ri]); o.value = String(ri); inRoom.append(o); });
    const row = el('div', 'row'), bSave = el('button', 'pri', '保存'), bDel = el('button', '', '删除这节'), bReset = el('button', '', '恢复这间教室原样'), bCancel = el('button', '', '取消');
    [bSave, bDel, bReset, bCancel].forEach(b => { b.type = 'button'; row.append(b); });
    const hint = el('div', 'hint', '只改这张表，不会改小SaaS 课表、不写备忘录。时间按 10 分钟对齐；同一教室时间重叠会标红。');
    sheet.append(title, fields, err, row, hint, teacherList); document.body.append(sheet);
    function openLesson(lesson, ri, start) {
      sheetLesson = lesson;
      teacherList.textContent = ''; (DATA.teachers || []).forEach(t => { const o = el('option'); o.value = t; teacherList.append(o); });
      const r = lesson ? lesson.ri : ri, a = lesson ? lesson.a : start;
      const b = lesson ? lesson.b : toT(Math.min(toM(start) + 60, view.hi + 120));
      title.textContent = lesson ? '修改课程' : '添加课程 · ' + R[r] + ' ' + a;
      inWho.value = lesson ? lesson.x[0] || '' : '';
      inSub.value = lesson ? lesson.x[1] || '' : ''; inTeacher.value = lesson ? lesson.x[2] || '' : '';
      inRoom.value = String(r); inA.value = a; inB.value = b; err.textContent = '';
      bDel.hidden = !lesson; bReset.hidden = !S.some((_, si) => has(key(r, si)));
      sheet.classList.add('on'); (lesson ? inA : inWho).focus();
    }
    const closeLesson = () => { sheet.classList.remove('on'); sheetLesson = null; };
    bCancel.onclick = closeLesson;
    bSave.onclick = () => {
      const who = inWho.value.trim(), a = inA.value, b = inB.value, ri = +inRoom.value;
      if (!who) { err.textContent = '请填写学生或班级'; inWho.focus(); return; }
      if (!/^\d{2}:\d{2}$/.test(a) || !/^\d{2}:\d{2}$/.test(b) || a >= b) { err.textContent = '结束时间要晚于开始时间'; inB.focus(); return; }
      const before = JSON.stringify(ed);
      if (sheetLesson) removeLesson(sheetLesson);
      addLesson(ri, who, inSub.value.trim(), inTeacher.value.trim(), a, b);
      closeLesson(); commit(before);
    };
    bDel.onclick = () => { if (!sheetLesson) return; const before = JSON.stringify(ed); removeLesson(sheetLesson); closeLesson(); commit(before); };
    bReset.onclick = () => { const ri = sheetLesson ? sheetLesson.ri : +inRoom.value, before = JSON.stringify(ed); S.forEach((_, si) => setCell(ri, si, null)); closeLesson(); commit(before); };
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && sheet.classList.contains('on')) closeLesson(); });
    // Hall editor: a name and the periods that person sits in the hall.
    const hallSheet = el('div', 'sheet'); hallSheet.id = 'tlhall'; hallSheet.setAttribute('role', 'dialog');
    const hTitle = el('div', 't'), hFields = el('div', 'tl-fields'), hErr = el('div', 'tl-err'), hSegs = el('div', 'tl-hallsegs');
    const hName = el('input'); { const box = el('label', '', '姓名'); box.append(hName); hFields.append(box); }
    const hChecks = S.map((s, si) => { const box = el('label', 'tl-hallseg'), c = el('input'); c.type = 'checkbox'; c.value = String(si); box.append(c, document.createTextNode(s[0] + ' 段 ' + s[1] + '–' + s[2])); hSegs.append(box); return c; });
    const hRow = el('div', 'row'), hSave = el('button', 'pri', '保存'), hDel = el('button', '', '从大厅移除'), hCancel = el('button', '', '取消');
    [hSave, hDel, hCancel].forEach(b => { b.type = 'button'; hRow.append(b); });
    hallSheet.append(hTitle, hFields, hSegs, hErr, hRow, el('div', 'hint', '勾选这个人在大厅的时段；每段最多 ' + SEATS + ' 座，超出会标红。只改这张表。'));
    document.body.append(hallSheet);
    let hallPerson = null;
    function openHall(person, si) {
      hallPerson = person;
      hTitle.textContent = person ? '大厅 · ' + plain(person.name) : '添加到大厅';
      hName.value = person ? person.name : '';
      hChecks.forEach((c, i) => { c.checked = person ? person.segs.has(i) : i === si; });
      hDel.hidden = !person; hErr.textContent = '';
      hallSheet.classList.add('on'); hName.focus();
    }
    const closeHall = () => { hallSheet.classList.remove('on'); hallPerson = null; };
    hCancel.onclick = closeHall;
    hSave.onclick = () => {
      const name = hName.value.trim(), wanted = new Set(hChecks.filter(c => c.checked).map(c => +c.value));
      if (!name) { hErr.textContent = '请填写姓名'; hName.focus(); return; }
      if (!wanted.size) { hErr.textContent = '至少勾选一个时段；不在大厅请点「从大厅移除」'; return; }
      const before = JSON.stringify(ed);
      if (hallPerson && hallPerson.name !== name) setHallPerson(hallPerson.name, name, new Set(), false);
      setHallPerson(hallPerson && hallPerson.name === name ? hallPerson.name : name, name, wanted, false);
      closeHall(); commit(before);
    };
    hDel.onclick = () => { if (!hallPerson) return; const before = JSON.stringify(ed); setHallPerson(hallPerson.name, hallPerson.name, new Set(), false); closeHall(); commit(before); };
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && hallSheet.classList.contains('on')) closeHall(); });
    render = timelineRender;   // the page's own commit/useDay/cloud apply call render()
    if (scroller && typeof ResizeObserver === 'function') {
      let last = 0;
      new ResizeObserver(() => { if (!view || tdrag) return; const next = rowHeight((view.hi - view.lo) / STEP); if (next !== view.rowH && next !== last) { last = next; render(); } }).observe(scroller);
    }
    setInterval(() => { if (!tdrag && !sheet.classList.contains('on') && !hallSheet.classList.contains('on') && curD === today) render(); }, 300000);
    render();
  }
  const setup = () => {
    if (document.body.classList.contains('wayon-workbench')) {
      let scheduled=false;
      const fit=()=>{
        scheduled=false;
        const frame=document.getElementById('classroom-frame');if(!frame)return;
        const top=frame.getBoundingClientRect().top+window.scrollY;
        const brand=document.querySelector('.app-brand');
        if(brand)document.body.style.setProperty('--room-shell-height',brand.getBoundingClientRect().height+'px');
        const minimum=window.innerWidth<=700?620:360;
        const bottom=parseFloat(getComputedStyle(frame.closest('.main-content')).paddingBottom)||18;
        const height=Math.max(minimum,Math.floor(window.innerHeight-top-Math.max(18,bottom)));
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
    const help=document.createElement('p');help.textContent='课程按真实时间排列：点空白时间可添加课程，点课程可改时间或教室，按住课程块可拖到别的教室或时间（10 分钟对齐）。大厅虚线姓名为课后预占，点一下确认；“＋ 加座”可填写空座。';
    panel.append(help);const status=document.querySelector('body>[role="status"]');if(status)panel.append(status);
    const sync=document.getElementById('sync');if(sync)panel.append(sync);info.append(summary,panel);top.append(info);
    const plain = value => String(value||'').replace(/[【】「」]/g,'').trim();
    const decorate = () => {
      // Names only: brackets around a student name are presentation, never stored data.
      grid.querySelectorAll('.k .w').forEach(node => {const next=plain(node.textContent);if(next!==node.textContent)node.textContent=next;});
      // A lesson that continues from the previous slot is shown as a continuation, not a blank cell.
      grid.querySelectorAll('.c.used:not(.seat)').forEach(cell => {
        if(cell.querySelector('.k,.room-cont'))return;
        let list=[];
        try{if(typeof items==='function')list=items(Number(cell.dataset.ri),Number(cell.dataset.si))||[];}catch(_){list=[];}
        const lessons=list.filter(Boolean);
        const box=document.createElement('div');box.className='room-cont';
        if(!lessons.length){box.textContent='占用中';cell.append(box);return;}
        for(const x of lessons){
          const line=document.createElement('div');
          const who=document.createElement('b');who.textContent=plain(x[0])||'课程';
          const end=String(x[3]||'').split('-')[1];
          line.append(who,document.createTextNode(' 接上节'+(end?' · 至 '+end.trim():'')));
          box.append(line);
        }
        cell.setAttribute('aria-label','上一时段课程延续：'+lessons.map(x=>plain(x[0])).join('、'));
        cell.append(box);
      });
      grid.querySelectorAll('.k:not(.chip) .s').forEach(node => {
        if(node.dataset.roomLayout)return;
        node.dataset.roomLayout='1';const text=node.textContent,i=text.lastIndexOf('·');if(i<0)return;
        const subject=document.createElement('span'),teacher=document.createElement('span');subject.className='room-subject';teacher.className='room-teacher';subject.textContent=text.slice(0,i);teacher.textContent=text.slice(i+1);node.replaceChildren(subject,teacher);
      });
      grid.querySelectorAll('.hallbox').forEach(box=>{
        const free=box.querySelector('.seat.free');if(free&&!free.classList.contains('room-seat-add')){free.classList.add('room-seat-add');free.textContent='＋ 加座';free.title=free.getAttribute('aria-label')+'：添加自习';}
      });
      // Hall notes collapse into one quiet item at the end of the legend.
      const legend=document.getElementById('lg');
      if(legend&&legend.querySelector('.lg-pre,.lg-ok')){
        const notes=[...legend.children].filter(span=>span.querySelector('.lg-pre,.lg-ok'));
        const note=document.createElement('span');note.className='lg-hall-note';note.textContent='大厅：虚线预占 · 实色已确认';note.title=notes.map(span=>span.textContent).join('；');
        notes.forEach(span=>span.remove());legend.append(note);
      }
      const foot=document.getElementById('f');if(foot&&foot.textContent.includes('按住课程块'))foot.textContent=foot.textContent.split('按住课程块')[0].trim();
    };
    installTimeline(grid);
    decorate();new MutationObserver(decorate).observe(grid,{childList:true});
    // Narrow screens: say that the room table scrolls sideways, and hide the hint at the end.
    const scroller=grid.closest('.room-scroll');
    if(scroller){
      const hint=document.createElement('div');hint.className='room-scroll-hint';hint.setAttribute('aria-hidden','true');hint.textContent='← 左右滑动查看全部教室 →';
      scroller.before(hint);
      const update=()=>{const more=scroller.scrollWidth-scroller.clientWidth>4;document.body.classList.toggle('room-overflow',more);hint.style.visibility=more&&scroller.scrollLeft+scroller.clientWidth<scroller.scrollWidth-4?'visible':'hidden';};
      scroller.addEventListener('scroll',update,{passive:true});window.addEventListener('resize',update);
      if(typeof ResizeObserver==='function')new ResizeObserver(update).observe(scroller);
      update();
    }
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
})();
