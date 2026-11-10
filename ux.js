// Workspace clarity layer (2026-11-10). Display only: it reads the page's data and the
// existing views' own counters, and never writes task, schedule, homework or cloud state.
//   - Chinese text labels and "still to do" badges on the navigation and view tabs
//   - per card: has the system work for that day actually gone out
//   - notices carry the air-conditioning request; the separate entry and the
//     "assigned today" tab are folded into those two places
//   - reminders: students whose exam date has passed are collapsed at the bottom
//   - tap a student's name for one page about that student
//   - confirm before a task is deleted; phone navigation no longer overlaps
(() => {
  if (globalThis.wayonUX || typeof document === 'undefined') return;
  globalThis.wayonUX = true;
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const make = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
  // The page keeps its state in top-level bindings; read them defensively.
  const page = {
    get data() { try { return DATA; } catch { return {}; } },
    get mode() { try { return mode; } catch { return ''; } },
    set mode(v) { try { mode = v; } catch {} },
    get cur() { try { return cur; } catch { return ''; } },
    get today() { try { return today; } catch { return new Date().toLocaleDateString('en-CA', {timeZone: 'Asia/Shanghai'}); } },
    get tomorrow() { try { return tomorrow; } catch { return ''; } },
    get chasing() { try { return CHASING; } catch { return []; } },
    render() { try { render(); } catch (e) { console.warn('ux render:', e); } },
  };
  const clean = v => String(v || '').replace(/[【】「」\s]/g, '');
  const shown = v => clean(globalThis.wayonDisplayName?.(v) || v);
  const members = v => String(v || '').replace(/^\d+\.\s*/, '').replace(/（.*?）/g, '').split(/[&＆/／、]/).map(shown).filter(Boolean);
  const md = d => { const p = String(d).split('-'); return Number(p[1]) + '月' + Number(p[2]) + '日'; };

  const NAV = {'nav-today': ['今天', '今天的任务'], 'nav-notice': ['通知', '课程通知与空调加时'], 'nav-rooms': ['教室', '教室使用'],
    'nav-feedback': ['反馈', '课堂反馈'], 'nav-memo': ['备忘', '备忘录'], 'wayon-rules-btn': ['规则', '任务规则']};
  const TAB = {'tab-plan': ['安排', '任务安排：复制发群'], 'tab-done': ['完成', '完成记录：勾选完成情况'],
    'tab-quiz': ['抽背', '课前 / 课后抽背'], 'tab-chasing': ['待催', '待催作业']};
  const STATE = {sent: ['已布置', 'ok'], waiting: ['上批未完成', 'wait'], not_sent: ['未布置', 'todo'], decision: ['待老师安排', 'wait'], check: ['需核对', 'bad']};

  const style = make('style'); style.id = 'wayon-ux-style'; style.textContent = `
    .ux-label{display:block;font-size:10px;line-height:1.1;letter-spacing:0;font-weight:500;color:inherit;opacity:.85;margin-top:2px;pointer-events:none}
    #tabs button,#wayon-rules-btn{position:relative}
    .wayon-workbench #tabs button.ux-labelled,.wayon-workbench #wayon-rules-btn.ux-labelled{display:flex!important;flex-direction:column;align-items:center;justify-content:center;height:48px!important;min-height:48px;padding-top:4px;padding-bottom:3px}
    .wayon-workbench #subtabs button.ux-labelled{display:inline-flex!important;align-items:center;gap:6px;width:auto!important;min-width:44px;padding:0 12px!important;position:relative}
    #subtabs .ux-label{display:inline;font-size:13px;margin:0;opacity:1}
    .ux-badge{position:absolute;top:-3px;right:-5px;min-width:16px;height:16px;padding:0 4px;border-radius:8px;background:var(--bad,#d93025);color:#fff;font:600 10px/16px -apple-system,BlinkMacSystemFont,sans-serif;text-align:center;pointer-events:none;box-sizing:border-box}
    #subtabs .ux-badge{position:static;margin-left:-2px}
    #subtabs .ux-label{white-space:nowrap}
    .ux-badge[data-zero]{display:none}
    #nav-aircon,#tab-assigned{display:none!important}
    body[data-aircon-open] #nav-notice{background:var(--accent-soft,rgba(0,113,227,.12))!important;color:var(--accent,#0071e3)!important}
    .wayon-workbench .item .head .meta{font-size:12px}
    .ux-assign{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin:2px 0 10px}
    .ux-chip{display:inline-flex;align-items:center;gap:4px;min-height:26px;padding:2px 10px;border-radius:13px;border:1px solid var(--line,#d2d2d7);background:transparent;font:500 12px/1.3 inherit;color:var(--fg-secondary,#555);cursor:pointer}
    .ux-chip[data-kind=ok]{color:#1a7f37;border-color:#1a7f3755;background:#1a7f370f}
    .ux-chip[data-kind=todo]{color:#b35900;border-color:#b3590066;background:#b3590012}
    .ux-chip[data-kind=wait]{color:#8a6100;border-color:#8a610055;background:#8a61000f}
    .ux-chip[data-kind=bad]{color:var(--bad,#d93025);border-color:currentColor}
    .ux-assign-detail{flex:1 1 100%;margin:2px 0 0;padding:8px 12px;border-radius:10px;background:var(--bg-secondary,rgba(0,0,0,.035));font-size:12.5px;line-height:1.6}
    .ux-assign-detail div{display:flex;gap:8px;justify-content:space-between}.ux-assign-detail small{display:block;color:var(--muted,#888)}
    .ux-assign-detail b{font-weight:500;white-space:nowrap}
    #list .item .head .name{cursor:pointer}@media(hover:hover){#list .item .head .name:hover{text-decoration:underline;text-underline-offset:3px}}
    .ux-aircon{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:12px 16px;margin:0 0 12px;border:1px solid var(--line,#d2d2d7);border-radius:14px;background:var(--card,#fff);font-size:13.5px}
    .ux-aircon b{font-weight:600}.ux-aircon span{color:var(--muted,#888)}.ux-aircon button{margin-left:auto;min-height:36px;padding:6px 14px;border-radius:10px;border:1px solid var(--line,#d2d2d7);background:transparent;font:inherit;cursor:pointer;color:inherit}
    .ux-aircon[data-copied] b:after{content:' · 已复制';color:#1a7f37;font-weight:500}
    .ux-past{margin:8px 0 0;border:1px dashed var(--line,#d2d2d7);border-radius:14px;padding:4px 12px}
    .ux-past>summary{cursor:pointer;padding:10px 4px;font-size:13.5px;color:var(--muted,#888);list-style-position:inside}
    .ux-past[open]>summary{margin-bottom:8px}
    .wayon-workbench[data-mode=chasing] .task.no>button.small{width:44px;min-width:44px;justify-self:end}
    .wayon-workbench[data-mode=done] .del-btn{opacity:.45}.wayon-workbench[data-mode=done] .del-btn:hover,.wayon-workbench[data-mode=done] .del-btn:focus-visible{opacity:1}
    #ux-student{width:min(720px,calc(100vw - 24px));max-height:min(86vh,900px);padding:0;border:1px solid var(--line,#d2d2d7);border-radius:18px;background:var(--card,#fff);color:inherit;box-shadow:0 20px 60px #0003}
    #ux-student::backdrop{background:#0006}
    .ux-st-head{position:sticky;top:0;display:flex;align-items:center;gap:12px;padding:16px 20px;background:var(--card,#fff);border-bottom:1px solid var(--line,#d2d2d7)}
    .ux-st-head h2{margin:0;font-size:20px;letter-spacing:-.02em}.ux-st-head button{margin-left:auto;min-width:44px;min-height:44px;border:0;background:transparent;font-size:20px;cursor:pointer;color:inherit}
    .ux-st-body{padding:8px 20px 20px}.ux-st-body h3{margin:18px 0 8px;font-size:13px;font-weight:600;color:var(--muted,#888)}
    .ux-st-row{display:flex;gap:10px;align-items:baseline;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--line,#eee);font-size:14px;line-height:1.5}
    .ux-st-row:last-child{border-bottom:0}.ux-st-row small{color:var(--muted,#888);white-space:nowrap}.ux-st-row em{font-style:normal;white-space:nowrap}
    .ux-st-row em[data-kind=ok]{color:#1a7f37}.ux-st-row em[data-kind=todo]{color:#b35900}.ux-st-row em[data-kind=wait]{color:#8a6100}.ux-st-row em[data-kind=bad]{color:var(--bad,#d93025)}
    .ux-st-empty{color:var(--muted,#888);font-size:13.5px;padding:6px 0}.ux-st-note{margin-top:16px;font-size:12px;color:var(--muted,#888)}
    @media(min-width:1024px){
      .wayon-workbench .main-content{display:flex;flex-wrap:wrap;align-items:center;align-content:flex-start;column-gap:10px}
      .wayon-workbench .main-content>*{flex:0 0 100%;min-width:0;box-sizing:border-box}
      .wayon-workbench .main-content>.workspace-top-bar,.wayon-workbench .main-content>.workspace-sub-bar{display:contents}
      .wayon-workbench .main-content #subtabs{order:-6;flex:0 0 auto;margin:0 0 14px!important}
      .wayon-workbench .main-content #study-slot{order:-5;flex:0 0 auto;margin:0 0 14px}
      .wayon-workbench .main-content #workflow-tools{order:-4;flex:0 0 auto;margin:0 0 14px auto!important}
      .wayon-workbench .main-content .date-section{order:-3;flex:0 0 auto;margin:0 0 14px!important;width:auto!important}
      .wayon-workbench .main-content #study-slot .meta{display:none}
    }
    @media(max-width:1023px){
      .wayon-workbench #subtabs button.ux-labelled{padding:0 10px!important}
      .wayon-workbench .workspace-sub-bar #study-slot .meta{display:none}
    }
    @media(max-width:599px){
      .wayon-workbench .sidebar{padding:6px 8px!important;gap:4px!important}
      .wayon-workbench #tabs{gap:2px!important}.wayon-workbench .sidebar-footer{gap:4px!important}
      .wayon-workbench #tabs button.ux-labelled,.wayon-workbench #wayon-rules-btn.ux-labelled{width:44px!important;min-width:44px!important;position:relative!important;left:auto!important;right:auto!important}
      .wayon-workbench .main-content{display:flex;flex-wrap:wrap;align-items:center;gap:0 8px}
      .wayon-workbench .main-content>*{flex:0 0 100%;min-width:0;box-sizing:border-box}
      .wayon-workbench .main-content>.workspace-top-bar,.wayon-workbench .main-content>.workspace-sub-bar{display:contents}
      .wayon-workbench .main-content #subtabs{order:-6;flex:0 0 100%;margin:0 0 8px!important;display:flex}
      .wayon-workbench .main-content #subtabs button{flex:1 1 0;justify-content:center;gap:5px!important;padding:0 4px!important}
      .wayon-workbench .main-content #subtabs button.ux-labelled>span[aria-hidden]:not(.ux-badge){display:none!important}
      .wayon-workbench .main-content #subtabs button.ux-labelled:before{display:none!important}
      .wayon-workbench .main-content .date-section{order:-5;flex:1 1 120px!important;margin:0 0 10px!important;width:auto!important}
      .wayon-workbench .main-content .date-section #day-picker{width:100%}
      .wayon-workbench .main-content #study-slot{order:-4;flex:0 0 auto;margin:0 0 10px}
      .wayon-workbench .main-content #workflow-tools{order:-3;flex:0 0 auto;margin:0 0 10px!important}
    }
    @media(prefers-color-scheme:dark){.ux-chip[data-kind=ok],.ux-aircon[data-copied] b:after,.ux-st-row em[data-kind=ok]{color:#4ac26b}.ux-chip[data-kind=todo],.ux-st-row em[data-kind=todo]{color:#f0883e}.ux-chip[data-kind=wait],.ux-st-row em[data-kind=wait]{color:#d4a72c}}
  `;
  document.head.append(style);

  // ---- still-to-do counts: every view already states "n / total" in #count ----------
  const left = {};
  const readCount = m => {
    const text = $('#count')?.textContent || '', pair = text.match(/(\d+)\s*\/\s*(\d+)/), people = text.match(/^(\d+)\s*人待催/);
    if (pair) left[m] = Math.max(0, Number(pair[2]) - Number(pair[1]));
    else if (people) left[m] = Number(people[1]);
    else if (/未知/.test(text)) delete left[m];
  };
  const airconPending = () => {
    const day = page.tomorrow, api = globalThis.wayonAircon;
    if (!api?.buildRequest || !day) return null;
    const request = api.buildRequest(page.data, day);
    if (request.status !== 'ready') return null;
    let saved = {}; try { saved = JSON.parse(localStorage.getItem('wayon-aircon-' + day) || '{}') || {}; } catch {}
    return {request, copied: saved[request.id]?.signature === request.text};
  };
  let probing = false, probed = 0;
  // Ask each view for its own count once, in one synchronous pass the browser never paints.
  function probe() {
    const active = document.activeElement;
    if (probing || !page.mode || page.mode === 'classroom' || document.body.dataset.airconOpen || document.body.dataset.memoOpen
        || $('dialog[open]') || (active && /^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName))) return;
    const saved = page.mode, y = scrollY; probing = true;
    try { for (const m of ['plan', 'done', 'quiz', 'chasing', 'notice']) { page.mode = m; page.render(); readCount(m); } }
    finally { page.mode = saved; page.render(); probing = false; scrollTo(0, y); probed = Date.now(); }
  }

  function badge(button, n) {
    let b = $(':scope > .ux-badge', button);
    if (n === undefined) { b?.remove(); return; }
    if (!b) { b = make('span', 'ux-badge'); b.setAttribute('aria-hidden', 'true'); button.append(b); }
    const text = n > 99 ? '99+' : String(n);
    if (b.textContent !== text) b.textContent = text;
    if (n) b.removeAttribute('data-zero'); else b.setAttribute('data-zero', '');
  }
  function label(button, [short, long], count) {
    if (!$(':scope > .ux-label', button)) { button.append(make('span', 'ux-label', short)); button.classList.add('ux-labelled'); }
    const title = long + (count ? '（还有 ' + count + ' 项）' : '');
    if (button.title !== title) button.title = title;
    if (button.getAttribute('aria-label') !== title) button.setAttribute('aria-label', title);
  }
  function decorateNav() {
    const air = airconPending();
    const noticeLeft = left.notice === undefined && !air ? undefined : (left.notice || 0) + (air && !air.copied ? 1 : 0);
    const todayLeft = ['plan', 'done', 'quiz', 'chasing'].some(m => left[m] !== undefined)
      ? (left.plan || 0) + (left.quiz || 0) : undefined;   // what is due today; reminders keep their own count
    for (const [id, text] of Object.entries(NAV)) {
      const b = document.getElementById(id); if (!b) continue;
      const n = id === 'nav-notice' ? noticeLeft : id === 'nav-today' ? todayLeft : undefined;
      label(b, text, n); if (n !== undefined) badge(b, n);
    }
    for (const [id, text] of Object.entries(TAB)) {
      const b = document.getElementById(id); if (!b) continue;
      const n = left[id.slice(4)];
      label(b, text, n); badge(b, n);
    }
  }

  // ---- has the system work gone out: one word per card ----------------------------
  function assignLines(names, day) {
    const state = page.data._assign_state?.[day]; if (!state) return [];
    const byName = new Map(Object.entries(state).map(([name, lines]) => [clean(name), lines]));
    const sent = new Map((page.data._assigned?.[day]?.students || []).map(s => [clean(s.name), s.tasks || []]));
    const out = [];
    for (const name of names) for (const [text, key] of byName.get(name) || [])
      out.push({name, text, key, details: (sent.get(name) || []).find(t => clean(t.text) === clean(text))?.details || []});
    return out;
  }
  function decorateCards() {
    const m = page.mode, day = page.cur;
    if (!['plan', 'done'].includes(m)) return;
    for (const card of $$('#list > .item, #list .item:not(.aircon-card)')) {
      const nameEl = $('.head .name', card); if (!nameEl || card.classList.contains('folded')) continue;
      const names = members(nameEl.textContent), sig = day + '|' + names.join(',');
      const lines = assignLines(names, day), existing = $(':scope > .ux-assign', card);
      const summary = JSON.stringify(lines);
      if (existing?.dataset.sig === sig + summary) continue;
      existing?.remove(); if (!lines.length) continue;
      const row = make('div', 'ux-assign'); row.dataset.sig = sig + summary;
      const groups = {};
      for (const line of lines) (groups[line.key] ||= []).push(line);
      const detail = make('div', 'ux-assign-detail'); detail.hidden = true;
      for (const line of lines) {
        const item = make('div'), left = make('span');
        left.append((names.length > 1 ? line.name + '：' : '') + line.text);
        for (const d of line.details) left.append(make('small', '', d));
        const word = make('b', '', STATE[line.key][0]); word.dataset.kind = STATE[line.key][1];
        item.append(left, word); detail.append(item);
      }
      for (const key of ['check', 'not_sent', 'waiting', 'decision', 'sent']) {
        if (!groups[key]) continue;
        const chip = make('button', 'ux-chip', (key === 'sent' ? '✓ ' : '') + STATE[key][0] + (groups[key].length > 1 || key !== 'sent' ? ' ' + groups[key].length + ' 项' : ''));
        chip.type = 'button'; chip.dataset.kind = STATE[key][1]; chip.title = '系统作业布置情况，点开看明细';
        chip.setAttribute('aria-expanded', 'false');
        chip.onclick = () => { detail.hidden = !detail.hidden; $$('.ux-chip', row).forEach(c => c.setAttribute('aria-expanded', String(!detail.hidden))); };
        row.append(chip);
      }
      row.append(detail); $('.head', card).after(row);
    }
  }

  // ---- notices carry the air-conditioning request ---------------------------------
  function decorateNotice() {
    const old = $('#list > .ux-aircon');
    if (page.mode !== 'notice') { old?.remove(); return; }
    const air = airconPending(), sig = air ? air.request.text + '|' + air.copied : '';
    if (old?.dataset.sig === sig) return;
    old?.remove(); if (!air) return;
    const row = make('div', 'ux-aircon'); row.dataset.sig = sig; if (air.copied) row.dataset.copied = '';
    const when = (air.request.text.match(/开启时间：(.+)/) || [])[1] || '';
    row.append(make('b', '', '空调加时申请'), make('span', '', air.request.days.map(md).join('/') + (when ? ' · ' + when : '')));
    const open = make('button', '', air.copied ? '查看' : '去复制'); open.type = 'button';
    open.onclick = () => document.getElementById('nav-aircon')?.click();
    row.append(open); $('#list').prepend(row);
  }

  // ---- reminders: exam already over goes to the bottom, collapsed -------------------
  function decorateChasing() {
    if (page.mode !== 'chasing') return;
    const list = $('#list'); if (!list) return;
    const past = $$(':scope > .item', list).filter(card => {
      const date = ($('.head .name', card)?.textContent.match(/考期[：:]\s*(\d{4}-\d{2}-\d{2})/) || [])[1];
      return date && date < page.today;
    });
    let box = $(':scope > .ux-past', list);
    if (!past.length) { if (box && !$('.item', box)) box.remove(); return; }
    if (!box) { box = make('details', 'ux-past'); box.append(make('summary')); }
    for (const card of past) box.append(card);
    list.append(box);
    // Keep the visible numbering continuous now that some cards moved.
    [...$$(':scope > .item', list), ...$$('.item', box)].forEach((card, i) => {
      const name = $('.head .name', card), text = name?.textContent.replace(/^\d+\.\s*/, (i + 1) + '. ');
      if (name && name.textContent !== text) name.textContent = text;
    });
    $('summary', box).textContent = '考期已过 · ' + $$('.item', box).length + ' 人（展开查看；仍可复制催交或停止催交）';
  }

  // ---- one page about one student --------------------------------------------------
  let dialog = null;
  function studentPage(raw) {
    const names = members(raw); if (!names.length) return;
    const data = page.data, mine = v => String(v || '').split(/[&＆/／、]/).some(n => names.includes(shown(n)));
    dialog ||= (() => { const d = make('dialog'); d.id = 'ux-student'; d.addEventListener('click', e => { if (e.target === d) d.close(); }); document.body.append(d); return d; })();
    dialog.replaceChildren();
    const head = make('div', 'ux-st-head'), close = make('button', '', '×'); close.type = 'button'; close.setAttribute('aria-label', '关闭'); close.onclick = () => dialog.close();
    head.append(make('h2', '', names.join(' & ')), close);
    const body = make('div', 'ux-st-body');
    const section = (title, rows, empty) => {
      body.append(make('h3', '', title));
      if (!rows.length) { body.append(make('div', 'ux-st-empty', empty)); return; }
      for (const [main, side, kind] of rows) { const r = make('div', 'ux-st-row'); r.append(make('span', '', main)); if (side) { const e = make(kind ? 'em' : 'small', '', side); if (kind) e.dataset.kind = kind; r.append(e); } body.append(r); }
    };
    const days = Object.keys(data).filter(k => /^\d{4}-\d{2}-\d{2}$/.test(k)).sort();
    const tasks = [];
    for (const day of days) for (const row of data[day] || []) {
      if (!mine(row[0])) continue;
      let marks = {}; try { marks = (JSON.parse(localStorage.getItem('wayon-done-' + day) || '{}') || {})[row[0]] || {}; } catch {}
      const own = Array.isArray(marks.tk) ? marks.tk.map(t => [t, '', '']) : row[3] || [];
      own.forEach((t, i) => { const mark = (marks.m || {})[i] ?? t[1]; tasks.push([(day === page.today ? '今天 ' : md(day) + ' ') + (typeof t === 'string' ? t : t[0]), mark === 'ok' ? '✅ 完成' : mark === 'no' ? '❌ 未完成' : day > page.today ? '' : '未标', mark === 'ok' ? 'ok' : mark === 'no' ? 'bad' : '']); });
    }
    section('任务与完成情况', tasks, '页面里这几天没有这位学生的任务。');
    const system = [];
    for (const day of days) for (const line of assignLines(names, day))
      system.push([(day === page.today ? '今天 ' : md(day) + ' ') + line.text + (line.details.length ? '（' + line.details.join('；') + '）' : ''), STATE[line.key][0], STATE[line.key][1]]);
    section('系统作业布置', system, '这几天没有需要系统布置的作业。');
    const owed = [];
    for (const row of page.chasing || []) if (mine(row.name)) for (const d of row.uncompleted_details || (row.uncompleted || []).map(title => ({title})))
      owed.push([d.title || '', (d.date || row.prev_date || '') + ' 布置', '']);
    section('欠交作业', owed, '没有欠交。');
    const lessons = [];
    for (const day of Object.keys(data._sess || {}).sort()) for (const s of data._sess[day] || [])
      if (mine(s[0])) lessons.push([(day === page.today ? '今天' : day === page.tomorrow ? '明天' : md(day)) + ' ' + s[1] + ' · ' + (s[2] || '') + (s[3] ? ' · ' + s[3] : ''), s[4] || '', '']);
    section('近期课程', lessons.reverse(), '近期课表里没有这位学生的课。');
    body.append(make('div', 'ux-st-note', '只汇总本页面已有的数据：任务为昨天到明天，课程为最近一周；完成标记取自本机记录。'));
    dialog.append(head, body);
    if (!dialog.open) dialog.showModal();
  }
  document.addEventListener('click', event => {
    const name = event.target.closest?.('#list .item .head .name');
    if (name && !event.target.closest('button,a,input,textarea,summary')) { studentPage(name.textContent); return; }
  });
  // A task delete sits right beside the completion mark: ask first.
  document.addEventListener('click', event => {
    const del = event.target.closest?.('#list .del-btn');
    if (!del || del.dataset.uxConfirmed) return;
    const text = del.closest('.task')?.querySelector('textarea,.txt')?.value || '这项任务';
    if (!globalThis.confirm('删除「' + String(text).slice(0, 40) + '」？\n删除后今天的清单里不再显示这一项。')) { event.preventDefault(); event.stopImmediatePropagation(); }
  }, true);

  // ---- keep everything applied as the page re-renders --------------------------------
  let queued = false;
  function apply() {
    queued = false;
    if (probing) return;
    if (page.mode && !document.body.dataset.airconOpen && !document.body.dataset.memoOpen) readCount(page.mode);
    try { decorateNav(); decorateCards(); decorateNotice(); decorateChasing(); } catch (e) { console.warn('ux:', e); }
  }
  const schedule = () => { if (!queued && !probing) { queued = true; requestAnimationFrame(apply); } };
  function start() {
    new MutationObserver(schedule).observe(document.body, {childList: true, subtree: true, characterData: true});
    apply();
    setTimeout(() => { probe(); apply(); }, 1200);
    // Local marks may have changed elsewhere (another tab, a cloud sync): recount when the page is looked at again.
    const again = () => { if (document.visibilityState === 'visible' && Date.now() - probed > 60000) { probe(); apply(); } };
    document.addEventListener('visibilitychange', again); window.addEventListener('focus', again);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once: true}); else start();
})();
