// 备忘录: follow-ups for the workbench. Owner-only rows in wayon_memos; a local copy keeps working offline
// and is uploaded (by its own id) once the cloud is reachable. Nothing here touches schedules or homework.
(() => {
  if (globalThis.wayonMemo || typeof document === 'undefined') return;
  globalThis.wayonMemo = true;
  const CACHE = 'wayon-memos-v1', GONE = 'wayon-memos-deleted-v1';
  const make = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
  const today = () => new Date().toLocaleDateString('en-CA', {timeZone: 'Asia/Shanghai'});
  const shift = (d, n) => { const t = new Date(d + 'T12:00:00Z'); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };
  const uuid = () => globalThis.crypto?.randomUUID ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); });
  const read = (k, fallback) => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v ?? fallback; } catch { return fallback; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
  let items = read(CACHE, []), gone = read(GONE, []), open = false, root = null, cloudState = 'local', busy = false, showDone = false;
  const persist = () => { write(CACHE, items); write(GONE, gone); };
  const client = () => globalThis.wayonSupabaseClient?.client || null;
  const FIELDS = 'id,text,due_date,done,done_at,created_at,updated_at';
  const row = m => ({id: m.id, text: m.text, due_date: m.due_date || null, done: !!m.done, done_at: m.done_at || null});

  // Cloud: push local changes first (upsert by id, then deletions), then read the owner's rows back.
  async function sync() {
    const c = client(); if (!c || busy) { if (!c) setState('local'); return; }
    busy = true;
    try {
      const {data: session} = await c.auth.getSession();
      if (!session?.session) { setState('signedout'); return; }
      const dirty = items.filter(m => m.dirty);
      if (dirty.length) {
        const {error} = await c.from('wayon_memos').upsert(dirty.map(row), {onConflict: 'id'});
        if (error) throw error;
      }
      if (gone.length) {
        const {error} = await c.from('wayon_memos').delete().in('id', gone);
        if (error) throw error;
        gone = [];
      }
      const {data, error} = await c.from('wayon_memos').select(FIELDS).order('created_at', {ascending: true});
      if (error) throw error;
      const pending = items.filter(m => m.dirty && !data.some(r => r.id === m.id));
      items = [...data.map(r => ({...r})), ...pending];
      persist(); setState('cloud');
    } catch (e) {
      const missing = /wayon_memos|PGRST205|42P01|does not exist|schema cache/i.test(String(e?.message || e?.code || e));
      setState(missing ? 'notable' : 'error', e);
    } finally { busy = false; if (open) render(); }
  }
  function setState(s, err) { cloudState = s; if (err) console.warn('memo sync:', err); if (open) render(); }
  function change(mutator) { mutator(); persist(); render(); void sync(); }
  const add = (text, due) => change(() => items.push({id: uuid(), text, due_date: due || null, done: false, done_at: null, created_at: new Date().toISOString(), dirty: true}));
  const update = (id, patch) => change(() => { const m = items.find(x => x.id === id); if (m) Object.assign(m, patch, {dirty: true}); });
  const remove = id => change(() => { const m = items.find(x => x.id === id); items = items.filter(x => x.id !== id); if (m && !(m.dirty && !m.updated_at)) gone.push(id); });

  const style = make('style'); style.id = 'wayon-memo-style'; style.textContent = `
    #nav-memo:before{display:none!important}#nav-memo svg{width:19px;height:19px;flex:none}
    body[data-memo-open] #tabs button:not(#nav-memo){background:transparent!important;color:var(--fg-secondary)!important}
    body[data-memo-open] #list,body[data-memo-open] .workspace-top-bar,body[data-memo-open] .workspace-sub-bar,body[data-memo-open] #aircon-panel,body[data-memo-open] .sidebar-footer .bar{display:none!important}
    #memo-panel{width:100%;max-width:880px}#memo-panel[hidden]{display:none!important}
    .memo-head{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;margin-bottom:16px}
    .memo-head h2{font-size:24px;letter-spacing:-.025em;margin:0}.memo-count{font-size:13px;color:var(--muted)}
    .memo-state{margin-left:auto;font-size:12px;color:var(--muted)}.memo-state.warn{color:var(--warning-fg,#9a6700)}
    .memo-add{display:flex;gap:8px;flex-wrap:wrap;padding:12px;border:1px solid var(--line);border-radius:14px;background:var(--card);box-shadow:var(--shadow-card);margin-bottom:18px}
    .memo-add input[type=text]{flex:1 1 260px;min-width:0;min-height:44px;padding:8px 12px;border:1px solid var(--line-strong);border-radius:10px;background:var(--code-bg);color:var(--fg);font:inherit;font-size:15px}
    .memo-add input[type=date],.memo-item input[type=date]{min-height:44px;padding:6px 10px;border:1px solid var(--line-strong);border-radius:10px;background:var(--code-bg);color:var(--fg);font:inherit;font-size:14px}
    .memo-add button{min-height:44px;padding:0 18px;border:0;border-radius:10px;background:var(--accent);color:#fff;font:inherit;font-size:14px;font-weight:600;cursor:pointer}
    .memo-list{display:flex;flex-direction:column;border:1px solid var(--line);border-radius:14px;background:var(--card);overflow:hidden}
    .memo-list:empty{display:none}
    .memo-empty{padding:28px;text-align:center;color:var(--muted);font-size:14px;border:1px dashed var(--line-strong);border-radius:14px}
    .memo-item{display:grid;grid-template-columns:32px minmax(0,1fr) auto 36px;align-items:center;gap:6px 10px;padding:10px 12px;border-bottom:1px solid var(--line)}
    .memo-item:last-child{border-bottom:0}
    .memo-check{width:24px;height:24px;border-radius:50%;border:1.5px solid var(--line-strong);background:transparent;cursor:pointer;display:grid;place-items:center;padding:0;color:#fff;font-size:14px;line-height:1}
    .memo-check:hover{border-color:var(--accent)}.memo-item.done .memo-check{background:var(--done);border-color:var(--done)}
    .memo-text{min-width:0;width:100%;border:1px solid transparent;border-radius:8px;padding:6px 8px;background:transparent;color:var(--fg);font:inherit;font-size:15px;line-height:1.5;resize:none;overflow:hidden}
    .memo-text:focus{border-color:var(--accent);background:var(--code-bg);outline:none}
    .memo-item.done .memo-text{color:var(--muted);text-decoration:line-through}
    .memo-due{display:inline-flex;align-items:center;gap:4px;white-space:nowrap;font-size:12px;font-weight:550;padding:4px 9px;border-radius:999px;background:var(--code-bg);color:var(--fg-secondary);border:0;cursor:pointer;font-family:inherit;min-height:28px}
    .memo-due.none{color:var(--muted);background:transparent;border:1px dashed var(--line-strong)}
    .memo-due.today{background:var(--warning-bg,#fff8e8);color:var(--warning-fg,#805300)}
    .memo-due.late{background:var(--bad-bg);color:var(--bad-dark)}
    .memo-item.done .memo-due{opacity:.6}
    .memo-del{width:32px;height:32px;border:0;border-radius:8px;background:transparent;color:var(--muted);font-size:18px;cursor:pointer}
    .memo-del:hover{background:var(--bad-bg);color:var(--bad)}
    .memo-done-toggle{margin:18px 0 8px;border:0;background:transparent;color:var(--muted);font:inherit;font-size:13px;cursor:pointer;padding:6px 0;min-height:36px}
    .memo-item input[type=date]{min-height:32px;font-size:13px}
    @media(max-width:599px){.memo-item{grid-template-columns:32px minmax(0,1fr) 36px}.memo-item .memo-due,.memo-item input[type=date]{grid-column:2;justify-self:start}.memo-del{grid-column:3;grid-row:1}}
  `; document.head.append(style);

  const weekday = d => '日一二三四五六'[new Date(d + 'T12:00:00Z').getUTCDay()];
  function dueLabel(d) {
    if (!d) return {text: '＋ 截止日期', cls: 'none'};
    const t = today(), md = Number(d.slice(5, 7)) + '/' + Number(d.slice(8, 10));
    if (d < t) return {text: '已逾期 · ' + md, cls: 'late'};
    if (d === t) return {text: '今天截止', cls: 'today'};
    if (d === shift(t, 1)) return {text: '明天 · ' + md, cls: ''};
    return {text: md + ' 周' + weekday(d), cls: ''};
  }
  const grow = a => { a.style.height = 'auto'; a.style.height = a.scrollHeight + 'px'; };
  function itemRow(m) {
    const li = make('div', 'memo-item' + (m.done ? ' done' : ''));
    const check = make('button', 'memo-check', m.done ? '✓' : ''); check.type = 'button';
    check.setAttribute('aria-label', (m.done ? '标为未完成：' : '标为完成：') + m.text);
    check.onclick = () => update(m.id, {done: !m.done, done_at: m.done ? null : new Date().toISOString()});
    const text = make('textarea', 'memo-text'); text.rows = 1; text.value = m.text; text.setAttribute('aria-label', '备忘内容');
    text.oninput = () => grow(text);
    text.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); text.blur(); } if (e.key === 'Escape') { text.value = m.text; text.blur(); } };
    text.onblur = () => { const v = text.value.trim(); if (!v) { text.value = m.text; return; } if (v !== m.text) update(m.id, {text: v}); };
    const due = dueLabel(m.due_date), badge = make('button', 'memo-due ' + due.cls, due.text); badge.type = 'button';
    badge.title = m.due_date ? '截止 ' + m.due_date + '（点一下修改）' : '添加截止日期';
    badge.onclick = () => {
      const picker = make('input'); picker.type = 'date'; picker.value = m.due_date || ''; picker.setAttribute('aria-label', '截止日期');
      const done = () => { const v = picker.value || null; if (v !== (m.due_date || null)) update(m.id, {due_date: v}); else render(); };
      picker.onchange = done; picker.onblur = done; badge.replaceWith(picker); picker.focus(); try { picker.showPicker?.(); } catch {}
    };
    const del = make('button', 'memo-del', '×'); del.type = 'button'; del.setAttribute('aria-label', '删除：' + m.text);
    del.onclick = () => { if (confirm('删除这条备忘？\n' + m.text)) remove(m.id); };
    li.append(check, text, badge, del);
    requestAnimationFrame(() => grow(text));
    return li;
  }
  function render() {
    if (!root) return;
    const active = document.activeElement, editing = active && root.contains(active) && active.matches('.memo-text,input[type=date]');
    if (editing) return;   // never rebuild under the cursor; the next change re-renders
    root.textContent = '';
    const todo = items.filter(m => !m.done).sort((a, b) => (a.due_date || '9999') .localeCompare(b.due_date || '9999') || String(a.created_at).localeCompare(String(b.created_at)));
    const finished = items.filter(m => m.done).sort((a, b) => String(b.done_at || '').localeCompare(String(a.done_at || '')));
    const head = make('div', 'memo-head'); head.append(make('h2', '', '备忘录'), make('span', 'memo-count', todo.length ? todo.length + ' 件待跟进' : '全部完成'));
    const states = {cloud: ['已同步云端', ''], local: ['仅保存在本机，登录云端后自动上传', 'warn'], signedout: ['未登录：先存本机，登录后自动上传', 'warn'],
      notable: ['云端备忘录表尚未开通：先存本机，开通后自动上传', 'warn'], error: ['云端暂时连不上：先存本机，稍后自动重试', 'warn']};
    const [msg, cls] = states[cloudState] || states.local; head.append(make('span', 'memo-state ' + cls, msg)); root.append(head);
    const form = make('form', 'memo-add'), input = make('input'), date = make('input'), btn = make('button', '', '添加');
    input.type = 'text'; input.placeholder = '需要跟进的事…（回车添加）'; input.maxLength = 1000; input.setAttribute('aria-label', '新备忘');
    date.type = 'date'; date.setAttribute('aria-label', '截止日期（可选）'); date.title = '截止日期（可选）'; btn.type = 'submit';
    form.onsubmit = e => { e.preventDefault(); const v = input.value.trim(); if (!v) { input.focus(); return; } add(v, date.value); requestAnimationFrame(() => root.querySelector('.memo-add input[type=text]')?.focus()); };
    form.append(input, date, btn); root.append(form);
    if (!todo.length && !finished.length) root.append(make('div', 'memo-empty', '还没有备忘。把需要跟进的事写在上面，完成后点圆圈勾掉。'));
    const list = make('div', 'memo-list'); todo.forEach(m => list.append(itemRow(m))); root.append(list);
    if (finished.length) {
      const toggle = make('button', 'memo-done-toggle', (showDone ? '▾ ' : '▸ ') + '已完成 ' + finished.length); toggle.type = 'button';
      toggle.onclick = () => { showDone = !showDone; render(); }; root.append(toggle);
      if (showDone) { const done = make('div', 'memo-list'); finished.forEach(m => done.append(itemRow(m))); root.append(done); }
    }
  }
  function close() {
    open = false; if (root) root.hidden = true; delete document.body.dataset.memoOpen;
    const b = document.getElementById('nav-memo'); b?.classList.remove('on'); b?.setAttribute('aria-pressed', 'false');
  }
  function mount() {
    const tabs = document.getElementById('tabs'), list = document.getElementById('list'); if (!tabs || !list) return;
    if (!root) { root = make('section'); root.id = 'memo-panel'; root.hidden = !open; root.setAttribute('aria-label', '备忘录'); list.before(root); }
    // Keep the cloud notice above the panel, matching the other views.
    const notice = list.parentNode && [...list.parentNode.children].find(e => e.classList.contains('wayon-sync-notice'));
    if (notice && root.compareDocumentPosition(notice) & Node.DOCUMENT_POSITION_FOLLOWING) notice.after(root);
    if (!document.getElementById('nav-memo')) {
      const b = make('button', 'wayon-icon-control' + (open ? ' on' : '')); b.id = 'nav-memo'; b.type = 'button'; b.title = '备忘录'; b.setAttribute('aria-label', '备忘录'); b.setAttribute('aria-pressed', String(open));
      b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 4h6v3H9z M7 5H5v16h14V5h-2 M8.5 12l1.5 1.5 3-3 M8.5 17h7"/></svg>';
      b.onclick = () => { open = true; document.body.dataset.memoOpen = 'true'; root.hidden = false; b.classList.add('on'); b.setAttribute('aria-pressed', 'true'); render(); void sync(); };
      tabs.append(b);
    }
  }
  function start() {
    mount();
    document.addEventListener('click', e => { const nav = e.target.closest?.('#tabs button'); if (open && nav && nav.id !== 'nav-memo') close(); }, true);
    new MutationObserver(mount).observe(document.body, {childList: true, subtree: true});
    // The workspace publishes its Supabase client after login; sync once it appears and on focus/online.
    let tries = 0; const wait = setInterval(() => { if (client() || ++tries > 60) { clearInterval(wait); void sync(); } }, 1000);
    addEventListener('focus', () => void sync()); addEventListener('online', () => void sync());
    client()?.auth?.onAuthStateChange?.(() => void sync());
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once: true}); else start();
})();
