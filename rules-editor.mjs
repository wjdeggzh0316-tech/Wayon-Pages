export function canonical(value){
  if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
  if(value && typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';
  return JSON.stringify(value);
}

export async function saveCatalog(client,owner,base,payload){
  const {data,error}=await client.from('wayon_rule_catalog')
    .update({payload,revision:base.revision+1})
    .eq('owner_id',owner)
    .eq('revision',base.revision)
    .select('revision')
    .maybeSingle();
  if(error || !data)throw Error('CONFLICT');
  const read=await client.from('wayon_rule_catalog')
    .select('revision,payload')
    .eq('owner_id',owner)
    .single();
  if(read.error || read.data.revision!==base.revision+1 || canonical(read.data.payload)!==canonical(payload))throw Error('READBACK_FAILED');
  return read.data;
}

const SYSTEM_LABELS = {
  ielts: '雅思 IELTS',
  toefl: '托福 TOEFL',
  sat: 'SAT',
  school: '校内 School',
  highschool: '高中 School',
  ability: '能力 Ability',
  general: '通用 General'
};

const SYSTEM_COLORS = {
  ielts: { bg: '#eaf3ff', fg: '#0071e3', border: 'rgba(0,113,227,0.2)' },
  toefl: { bg: '#f3e8ff', fg: '#7c3aed', border: 'rgba(124,58,237,0.2)' },
  sat: { bg: '#fef3c7', fg: '#b45309', border: 'rgba(180,83,9,0.2)' },
  school: { bg: '#dcfce7', fg: '#15803d', border: 'rgba(21,128,61,0.2)' },
  general: { bg: '#f3f4f6', fg: '#4b5563', border: 'rgba(75,85,99,0.2)' }
};

function injectStyles(document) {
  if (document.getElementById('wayon-rules-editor-styles')) return;
  const style = document.createElement('style');
  style.id = 'wayon-rules-editor-styles';
  style.textContent = `
.wayon-rules-dialog{box-sizing:border-box;width:min(1100px,calc(100vw - 24px));height:min(90vh,920px);max-height:90vh;padding:0;border:1px solid var(--line-strong,rgba(0,0,0,0.12));border-radius:20px;background:var(--bg,#f5f5f7);color:var(--fg,#1d1d1f);box-shadow:0 28px 90px rgba(0,0,0,0.3);display:flex;flex-direction:column;overflow:hidden;font-family:var(--sans,-apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue","PingFang SC",sans-serif)}
.wayon-rules-dialog::backdrop{background:rgba(0,0,0,0.45);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)}
.rules-wrapper{display:flex;flex-direction:column;height:100%;min-height:0;width:100%;overflow:hidden;background:var(--bg,#f5f5f7)}
.rules-header{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 22px;background:var(--card,#fff);border-bottom:1px solid var(--line,rgba(0,0,0,0.08));flex:none}
.rules-title-box{display:flex;align-items:center;gap:10px;min-width:0}
.rules-title{font-size:19px;font-weight:650;letter-spacing:-.02em;margin:0;color:var(--fg,#1d1d1f);white-space:nowrap}
.rules-rev{display:inline-flex;align-items:center;gap:4px;font-size:11.5px;font-weight:600;padding:2px 8px;border-radius:6px;background:var(--accent-subtle,#eaf3ff);color:var(--accent,#0071e3);font-variant-numeric:tabular-nums}
.rules-close{width:32px;height:32px;border-radius:50%;border:0;background:var(--line,rgba(0,0,0,0.06));color:var(--muted,#666);font-size:18px;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;transition:all .15s ease}
.rules-close:hover{background:var(--line-strong,rgba(0,0,0,0.12));color:var(--fg,#1d1d1f)}
.rules-nav-bar{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px 14px;padding:10px 22px;background:var(--card,#fff);border-bottom:1px solid var(--line,rgba(0,0,0,0.08));flex:none}
.rules-search{position:relative;flex:1 1 200px;max-width:320px}
.rules-search input{width:100%;height:34px;padding:0 10px 0 32px;border:1px solid var(--line-strong,rgba(0,0,0,0.15));border-radius:9px;background:var(--bg,#f5f5f7);color:var(--fg,#1d1d1f);font-size:13px;outline:none;box-sizing:border-box}
.rules-search input:focus{border-color:var(--accent,#0071e3);box-shadow:0 0 0 2px var(--accent-subtle,#eaf3ff)}
.rules-search svg{position:absolute;left:10px;top:9px;width:15px;height:15px;color:var(--muted,#888);pointer-events:none}
.rules-filter-pills{display:flex;align-items:center;gap:5px;overflow-x:auto;scrollbar-width:none;flex:2 1 auto}
.rules-pill{min-height:30px;height:30px;padding:0 12px;border-radius:8px;border:1px solid transparent;background:transparent;color:var(--muted,#666);font-size:12.5px;font-weight:500;cursor:pointer;white-space:nowrap;transition:all .15s}
.rules-pill:hover{background:var(--line,rgba(0,0,0,0.04));color:var(--fg,#1d1d1f)}
.rules-pill.active{background:var(--line,rgba(0,0,0,0.08));color:var(--fg,#1d1d1f);border-color:var(--line-strong,rgba(0,0,0,0.15));font-weight:600}
.rules-actions{display:flex;align-items:center;gap:8px;flex:none}
.rules-btn-save{min-height:34px;height:34px;padding:0 16px;border-radius:8px;border:0;background:var(--accent,#0071e3);color:#fff;font-size:13px;font-weight:600;cursor:pointer;transition:all .15s;display:inline-flex;align-items:center;gap:6px}
.rules-btn-save:hover{filter:brightness(1.08)}
.rules-btn-save:disabled{opacity:.5;cursor:default}
.rules-btn-reload{min-height:34px;height:34px;padding:0 12px;border-radius:8px;border:1px solid var(--line-strong,rgba(0,0,0,0.15));background:var(--card,#fff);color:var(--fg,#1d1d1f);font-size:13px;font-weight:500;cursor:pointer}
.rules-btn-reload:hover{background:var(--line,rgba(0,0,0,0.05))}
.rules-status-bar{padding:8px 22px;background:var(--card,#fff);border-bottom:1px solid var(--line,rgba(0,0,0,0.06));font-size:12px;line-height:1.45;color:var(--muted,#666);display:flex;align-items:center;justify-content:space-between;flex:none}
.rules-status-bar.alert{color:var(--bad,#d93025);background:#fff1f0}
.rules-content{flex:1;overflow-y:auto;padding:20px 22px;display:flex;flex-direction:column;gap:16px;overscroll-behavior:contain}
.rules-card{background:var(--card,#fff);border:1px solid var(--line,rgba(0,0,0,0.08));border-radius:16px;padding:18px 20px;box-shadow:0 1px 3px rgba(0,0,0,0.02);display:flex;flex-direction:column;gap:14px;transition:border-color .15s}
.rules-card.is-paused{background:rgba(250,250,252,0.7);opacity:0.9}
.rules-card.has-override{border-color:#f0a46e;box-shadow:0 0 0 1px #f0a46e}
.rules-card-head{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
.rules-student-badge{display:flex;align-items:center;gap:8px}
.rules-name{font-size:18px;font-weight:650;letter-spacing:-.015em;margin:0;color:var(--fg,#1d1d1f)}
.rules-sys-tag{font-size:11px;font-weight:600;padding:2px 7px;border-radius:6px;border:1px solid transparent}
.rules-state-toggle{display:inline-flex;align-items:center;gap:5px;height:28px;padding:0 10px;border-radius:7px;border:1px solid transparent;font-size:12px;font-weight:600;cursor:pointer;transition:all .15s}
.rules-state-toggle.running{background:#edf7ef;color:#207535;border-color:#cce6d2}
.rules-state-toggle.paused{background:#fff1f0;color:#b3261e;border-color:#f1c8c5}
.rules-card-grid{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);gap:16px;padding-top:12px;border-top:1px solid var(--line,rgba(0,0,0,0.06))}
@media(max-width:859px){.rules-card-grid{grid-template-columns:1fr}}
.rules-panel{background:var(--bg,#f8f8fa);border-radius:12px;padding:14px 16px;display:flex;flex-direction:column;gap:10px}
.rules-panel-title{font-size:12px;font-weight:650;color:var(--fg-secondary,#555);margin:0;display:flex;align-items:center;gap:6px}
.rules-field{display:flex;flex-direction:column;gap:4px}
.rules-label{font-size:11.5px;font-weight:550;color:var(--muted,#666)}
.rules-input,.rules-select,.rules-textarea{box-sizing:border-box;width:100%;border:1px solid var(--line-strong,rgba(0,0,0,0.12));border-radius:8px;background:var(--card,#fff);color:var(--fg,#1d1d1f);font-size:13px;padding:7px 9px;outline:none;font-family:inherit}
.rules-input:focus,.rules-select:focus,.rules-textarea:focus{border-color:var(--accent,#0071e3);box-shadow:0 0 0 2px var(--accent-subtle,#eaf3ff)}
.rules-textarea{min-height:58px;resize:vertical;line-height:1.5}
.rules-seg-buttons{display:flex;gap:4px;flex-wrap:wrap}
.rules-seg-btn{height:28px;padding:0 10px;border-radius:6px;border:1px solid var(--line-strong,rgba(0,0,0,0.12));background:var(--card,#fff);color:var(--muted,#666);font-size:12px;font-weight:500;cursor:pointer;transition:all .15s}
.rules-seg-btn.on{background:var(--accent,#0071e3);color:#fff;border-color:var(--accent,#0071e3);font-weight:600}
.rules-day-pills{display:flex;gap:4px;flex-wrap:wrap}
.rules-day-pill{width:28px;height:28px;border-radius:6px;border:1px solid var(--line-strong,rgba(0,0,0,0.12));background:var(--card,#fff);color:var(--muted,#666);font-size:11.5px;font-weight:500;cursor:pointer;display:inline-flex;align-items:center;justify-content:center}
.rules-day-pill.on{background:var(--accent,#0071e3);color:#fff;border-color:var(--accent,#0071e3);font-weight:600}
.rules-override-box{background:#fff8e8;border:1px solid #f0cc81;border-radius:10px;padding:10px 14px;display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:12px;color:#805300}
.rules-override-box strong{color:#5c3b00}
.rules-restore-btn{height:26px;padding:0 8px;border-radius:6px;border:1px solid #f0cc81;background:#fff;color:#805300;font-size:11.5px;font-weight:600;cursor:pointer}
.rules-overrides-section{background:var(--card,#fff);border:1px solid var(--line,rgba(0,0,0,0.08));border-radius:16px;padding:20px;display:flex;flex-direction:column;gap:14px}
.rules-form-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px}
.rules-auth-card{max-width:380px;margin:40px auto;padding:24px;border-radius:16px;border:1px solid var(--line,rgba(0,0,0,0.1));background:var(--card,#fff);box-shadow:0 10px 30px rgba(0,0,0,0.05);display:flex;flex-direction:column;gap:14px}
.rules-auth-card h3{margin:0;font-size:17px;font-weight:650}
`;
  document.head.append(style);
}

const clean = s => String(s || '').trim().replace(/[【】「」\s]/g, '').toLowerCase();
const clone = obj => typeof structuredClone === 'function' ? structuredClone(obj) : JSON.parse(JSON.stringify(obj));

export async function mountRules({ document, client, container, onClose }) {
  injectStyles(document);
  const root = container || document.getElementById('rules') || document.body;
  const state = {
    base: null,
    draft: null,
    owner: null,
    search: '',
    filter: 'all', // all | ielts | toefl | sat | school | paused | overrides
    status: '正在连接…',
    isAlert: false
  };

  const status = (msg, isAlert = false) => {
    state.status = msg;
    state.isAlert = isAlert;
    const bar = root.querySelector('.rules-status-bar');
    if (bar) {
      bar.textContent = msg;
      bar.classList.toggle('alert', isAlert);
    }
    const revEl = root.querySelector('.rules-rev');
    if (revEl && state.base) {
      revEl.textContent = `v${state.base.revision}`;
    }
  };

  function parseDraftGroups() {
    if (!state.draft) return [];
    const p = state.draft;
    const groups = new Map();

    // 1. Process frequency rows
    for (const r of p.frequency_rows || []) {
      const name = (r['学员'] || '').trim();
      const key = clean(name);
      if (!groups.has(key)) {
        groups.set(key, { name, key, freqRows: [], attRule: null, attKey: null, overrides: [] });
      }
      groups.get(key).freqRows.push(r);
    }

    // 2. Process attendance rules
    for (const [key, att] of Object.entries(p.attendance_rules || {})) {
      const name = (att.name || key || '').trim();
      const k = clean(name);
      if (!groups.has(k)) {
        groups.set(k, { name, key: k, freqRows: [], attRule: att, attKey: key, overrides: [] });
      } else {
        const g = groups.get(k);
        g.attRule = att;
        g.attKey = key;
      }
    }

    // 3. Process overrides
    for (const ov of p.overrides || []) {
      const k = clean(ov.student);
      if (groups.has(k)) {
        groups.get(k).overrides.push(ov);
      }
    }

    // Infer system & status
    for (const g of groups.values()) {
      let sys = g.attRule?.system;
      if (!sys) {
        const text = g.freqRows.map(r => r['任务内容'] || '').join(' ');
        if (text.includes('雅思') || text.includes('真经') || text.includes('王陆')) sys = 'ielts';
        else if (text.includes('托福') || text.includes('完形')) sys = 'toefl';
        else if (text.includes('SAT')) sys = 'sat';
        else if (text.includes('校内')) sys = 'school';
        else sys = 'general';
      }
      g.system = sys;
      g.isPaused = g.freqRows.length > 0 && g.freqRows.every(r => r['状态'] === '暂停');
      g.hasOverride = g.overrides.length > 0;
    }

    return Array.from(groups.values()).sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
  }

  function render() {
    root.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.className = 'rules-wrapper';

    // 1. Header
    const header = document.createElement('div');
    header.className = 'rules-header';
    const titleBox = document.createElement('div');
    titleBox.className = 'rules-title-box';
    const h2 = document.createElement('h2');
    h2.className = 'rules-title';
    h2.textContent = '任务规则 · Task Rules';
    const revSpan = document.createElement('span');
    revSpan.className = 'rules-rev';
    revSpan.textContent = state.base ? `v${state.base.revision}` : '连接中';
    titleBox.append(h2, revSpan);

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'rules-close';
    closeBtn.title = '关闭 (Esc)';
    closeBtn.innerHTML = '×';
    closeBtn.onclick = () => {
      if (typeof onClose === 'function') onClose();
      else if (typeof root.close === 'function') root.close();
      else root.style.display = 'none';
    };
    header.append(titleBox, closeBtn);

    // If not authenticated, render login
    if (!state.owner) {
      wrapper.append(header);
      const authBox = document.createElement('div');
      authBox.className = 'rules-auth-card';
      authBox.innerHTML = `
        <h3>登录工作台账号</h3>
        <p style="font-size:13px;color:var(--muted);margin:0">规则库受本人权限保护，请先登录账号查看与编辑统一规则。</p>
        <form id="rules-login-form" style="display:flex;flex-direction:column;gap:10px;margin-top:6px">
          <div class="rules-field">
            <span class="rules-label">邮箱</span>
            <input class="rules-input" id="rules-email" type="email" autocomplete="username" required>
          </div>
          <div class="rules-field">
            <span class="rules-label">密码</span>
            <input class="rules-input" id="rules-password" type="password" autocomplete="current-password" required>
          </div>
          <button class="rules-btn-save" style="justify-content:center;margin-top:4px" type="submit">登录并加载规则</button>
        </form>
      `;
      wrapper.append(authBox);
      root.append(wrapper);

      authBox.querySelector('#rules-login-form').onsubmit = async event => {
        event.preventDefault();
        const email = authBox.querySelector('#rules-email').value.trim();
        const password = authBox.querySelector('#rules-password').value;
        status('正在登录…');
        const r = await client.auth.signInWithPassword({ email, password });
        if (r.error) {
          status('登录失败：' + (r.error.message || '请检查邮箱密码'), true);
          return;
        }
        await load();
      };
      return;
    }

    // 2. Navigation Bar (Search, Pills, Actions)
    const groups = parseDraftGroups();
    const navBar = document.createElement('div');
    navBar.className = 'rules-nav-bar';

    // Search input
    const searchBox = document.createElement('div');
    searchBox.className = 'rules-search';
    searchBox.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>
      </svg>
    `;
    const searchInput = document.createElement('input');
    searchInput.type = 'search';
    searchInput.placeholder = '搜索学员姓名...';
    searchInput.value = state.search;
    searchInput.oninput = () => {
      state.search = searchInput.value.trim().toLowerCase();
      renderContentList(contentArea, groups);
    };
    searchBox.append(searchInput);

    // Filter pills
    const pillBar = document.createElement('div');
    pillBar.className = 'rules-filter-pills';

    const counts = {
      all: groups.length,
      ielts: groups.filter(g => g.system === 'ielts').length,
      toefl: groups.filter(g => g.system === 'toefl').length,
      sat: groups.filter(g => g.system === 'sat').length,
      school: groups.filter(g => g.system === 'school').length,
      paused: groups.filter(g => g.isPaused).length,
      overrides: (state.draft?.overrides || []).length
    };

    const filters = [
      ['all', `全部 (${counts.all})`],
      ['ielts', `雅思 (${counts.ielts})`],
      ['toefl', `托福 (${counts.toefl})`],
      ['sat', `SAT (${counts.sat})`],
      ['school', `校内 (${counts.school})`],
      ['paused', `⏸️ 暂停 (${counts.paused})`],
      ['overrides', `⚡ 特殊覆盖 (${counts.overrides})`]
    ];

    for (const [key, label] of filters) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'rules-pill' + (state.filter === key ? ' active' : '');
      btn.textContent = label;
      btn.onclick = () => {
        state.filter = key;
        pillBar.querySelectorAll('.rules-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderContentList(contentArea, groups);
      };
      pillBar.append(btn);
    }

    // Actions
    const actionBox = document.createElement('div');
    actionBox.className = 'rules-actions';

    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.className = 'rules-btn-save';
    saveBtn.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
        <polyline points="17 21 17 13 7 13 7 21"></polyline>
        <polyline points="7 3 7 8 15 8"></polyline>
      </svg>
      保存规则
    `;
    saveBtn.onclick = async () => {
      // Validate frequency rows
      if (state.draft.frequency_rows.some(r => r['重复'] === '每周固定几天' && (!r['周几'] || !r['周几'].length))) {
        status('每周固定几天规则至少需要选择一天！', true);
        return;
      }
      saveBtn.disabled = true;
      status('正在保存并读回核验…');
      try {
        state.base = await saveCatalog(client, state.owner, state.base, state.draft);
        status(`✓ 统一规则已保存并核验 · 当前版本 v${state.base.revision}，下次 Action 生效`);
        render();
      } catch (e) {
        status(
          e.message === 'CONFLICT'
            ? '⚠️ 另一设备已修改规则（版本冲突）。当前输入保留，请重新读取后再次保存。'
            : '⚠️ 保存核验未通过，当前输入已保留，请重新读取核对。',
          true
        );
      } finally {
        saveBtn.disabled = false;
      }
    };

    const reloadBtn = document.createElement('button');
    reloadBtn.type = 'button';
    reloadBtn.className = 'rules-btn-reload';
    reloadBtn.textContent = '重新读取';
    reloadBtn.onclick = () => {
      load().catch(() => status('重新读取失败，当前输入已保留', true));
    };

    actionBox.append(reloadBtn, saveBtn);
    navBar.append(searchBox, pillBar, actionBox);

    // 3. Status Bar
    const statusBar = document.createElement('div');
    statusBar.className = 'rules-status-bar' + (state.isAlert ? ' alert' : '');
    statusBar.textContent = state.status;

    // 4. Content Area
    const contentArea = document.createElement('div');
    contentArea.className = 'rules-content';
    renderContentList(contentArea, groups);

    wrapper.append(header, navBar, statusBar, contentArea);
    root.append(wrapper);
  }

  function renderContentList(container, groups) {
    container.innerHTML = '';

    // If Overrides view selected
    if (state.filter === 'overrides') {
      renderOverridesManager(container, groups);
      return;
    }

    // Filter by category and search query
    let filtered = groups;
    if (state.filter === 'ielts') filtered = filtered.filter(g => g.system === 'ielts');
    else if (state.filter === 'toefl') filtered = filtered.filter(g => g.system === 'toefl');
    else if (state.filter === 'sat') filtered = filtered.filter(g => g.system === 'sat');
    else if (state.filter === 'school') filtered = filtered.filter(g => g.system === 'school');
    else if (state.filter === 'paused') filtered = filtered.filter(g => g.isPaused);

    if (state.search) {
      filtered = filtered.filter(g =>
        g.name.toLowerCase().includes(state.search) ||
        g.freqRows.some(r => (r['任务内容'] || '').toLowerCase().includes(state.search))
      );
    }

    if (!filtered.length) {
      const empty = document.createElement('div');
      empty.style.cssText = 'padding:48px 20px;text-align:center;color:var(--muted);font-size:14px;background:var(--card);border-radius:16px;border:1px solid var(--line)';
      empty.textContent = state.search ? `未找到匹配学员「${state.search}」` : '此分类下暂无学员规则';
      container.append(empty);
      return;
    }

    for (const g of filtered) {
      container.append(renderStudentCard(g));
    }
  }

  function renderStudentCard(g) {
    const card = document.createElement('div');
    card.className = 'rules-card' + (g.isPaused ? ' is-paused' : '') + (g.hasOverride ? ' has-override' : '');

    // Card Header
    const head = document.createElement('div');
    head.className = 'rules-card-head';

    const nameBox = document.createElement('div');
    nameBox.className = 'rules-student-badge';
    const nameEl = document.createElement('h3');
    nameEl.className = 'rules-name';
    nameEl.textContent = g.name;

    const sysTag = document.createElement('span');
    sysTag.className = 'rules-sys-tag';
    const color = SYSTEM_COLORS[g.system] || SYSTEM_COLORS.general;
    sysTag.style.background = color.bg;
    sysTag.style.color = color.fg;
    sysTag.style.borderColor = color.border;
    sysTag.textContent = SYSTEM_LABELS[g.system] || g.system;

    nameBox.append(nameEl, sysTag);

    // Status switch pill
    const stateBtn = document.createElement('button');
    stateBtn.type = 'button';
    stateBtn.className = 'rules-state-toggle ' + (g.isPaused ? 'paused' : 'running');
    stateBtn.innerHTML = g.isPaused ? '⏸️ 已暂停' : '🟢 进行中';
    stateBtn.title = '点击切换进行中与暂停状态';
    stateBtn.onclick = () => {
      const next = g.isPaused ? '进行中' : '暂停';
      for (const r of g.freqRows) {
        r['状态'] = next;
        r._canonical_state = true;
      }
      g.isPaused = next === '暂停';
      stateBtn.className = 'rules-state-toggle ' + (g.isPaused ? 'paused' : 'running');
      stateBtn.innerHTML = g.isPaused ? '⏸️ 已暂停' : '🟢 进行中';
      card.classList.toggle('is-paused', g.isPaused);
      status(`已将【${g.name}】状态切换为「${next}」，请点击右上角保存。`);
    };

    head.append(nameBox, stateBtn);
    card.append(head);

    // Active Overrides Banner on Card
    if (g.overrides.length > 0) {
      for (const ov of g.overrides) {
        const ovBox = document.createElement('div');
        ovBox.className = 'rules-override-box';
        const actionLabel = ov.action === 'pause' ? '⏸️ 暂停自动布置' : '👨‍🏫 交由老师安排';
        const subj = ov.kind === 'vocab' ? '单词' : (ov.subject || '全科');
        const dates = ov.start ? (ov.start + (ov.end ? ` ~ ${ov.end}` : ' 起持续生效')) : '持续生效';
        ovBox.innerHTML = `<span>⚠️ <strong>特殊规则生效中</strong>：${subj} · ${actionLabel}（${dates}）<br><small style="color:#805300;opacity:0.85">${ov.reason || '无备注'}</small></span>`;

        const restoreBtn = document.createElement('button');
        restoreBtn.type = 'button';
        restoreBtn.className = 'rules-restore-btn';
        restoreBtn.textContent = '恢复自动规则';
        restoreBtn.onclick = () => {
          state.draft.overrides = state.draft.overrides.filter(x => x !== ov);
          render();
          status(`已移除【${g.name}】的特殊规则，请点击右上角保存。`);
        };
        ovBox.append(restoreBtn);
        card.append(ovBox);
      }
    }

    // Card Grid: Section A (Baseline / Frequency) and Section B (Attendance)
    const grid = document.createElement('div');
    grid.className = 'rules-card-grid';

    // Panel 1: Frequency Rule
    const freqPanel = document.createElement('div');
    freqPanel.className = 'rules-panel';
    const freqTitle = document.createElement('h4');
    freqTitle.className = 'rules-panel-title';
    freqTitle.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line>
      </svg>
      自习与打底任务规则
    `;
    freqPanel.append(freqTitle);

    if (g.freqRows.length > 0) {
      const r = g.freqRows[0]; // primary baseline row

      // 1. Frequency segmented control
      const freqField = document.createElement('div');
      freqField.className = 'rules-field';
      const freqLbl = document.createElement('span');
      freqLbl.className = 'rules-label';
      freqLbl.textContent = '检查频率';
      const freqBtns = document.createElement('div');
      freqBtns.className = 'rules-seg-buttons';

      const dayPillsBox = document.createElement('div');
      dayPillsBox.className = 'rules-field';
      dayPillsBox.style.display = r['重复'] === '每周固定几天' ? 'flex' : 'none';
      const dayLbl = document.createElement('span');
      dayLbl.className = 'rules-label';
      dayLbl.textContent = '每周执行日';
      const dayPills = document.createElement('div');
      dayPills.className = 'rules-day-pills';

      const weekdays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
      for (const d of weekdays) {
        const pill = document.createElement('button');
        pill.type = 'button';
        pill.className = 'rules-day-pill' + ((r['周几'] || []).includes(d) ? ' on' : '');
        pill.textContent = d.replace('周', '');
        pill.onclick = () => {
          r['周几'] = r['周几'] || [];
          if (r['周几'].includes(d)) {
            r['周几'] = r['周几'].filter(x => x !== d);
            pill.classList.remove('on');
          } else {
            r['周几'].push(d);
            pill.classList.add('on');
          }
        };
        dayPills.append(pill);
      }
      dayPillsBox.append(dayLbl, dayPills);

      for (const opt of ['随课/每天', '每天', '每周固定几天']) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'rules-seg-btn' + (r['重复'] === opt ? ' on' : '');
        b.textContent = opt;
        b.onclick = () => {
          r['重复'] = opt;
          freqBtns.querySelectorAll('.rules-seg-btn').forEach(btn => btn.classList.remove('on'));
          b.classList.add('on');
          dayPillsBox.style.display = opt === '每周固定几天' ? 'flex' : 'none';
        };
        freqBtns.append(b);
      }
      freqField.append(freqLbl, freqBtns);

      // 2. Format pills
      const formatField = document.createElement('div');
      formatField.className = 'rules-field';
      const formatLbl = document.createElement('span');
      formatLbl.className = 'rules-label';
      formatLbl.textContent = '执行形式';
      const formatBtns = document.createElement('div');
      formatBtns.className = 'rules-seg-buttons';
      for (const opt of ['线上', '自习', '线下']) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'rules-seg-btn' + (r['形式'] === opt ? ' on' : '');
        b.textContent = opt;
        b.onclick = () => {
          r['形式'] = opt;
          formatBtns.querySelectorAll('.rules-seg-btn').forEach(btn => btn.classList.remove('on'));
          b.classList.add('on');
        };
        formatBtns.append(b);
      }
      formatField.append(formatLbl, formatBtns);

      // 3. Task content textarea
      const taskField = document.createElement('div');
      taskField.className = 'rules-field';
      const taskLbl = document.createElement('span');
      taskLbl.className = 'rules-label';
      taskLbl.textContent = '任务内容（支持具体数量，如：50个单词）';
      const taskArea = document.createElement('textarea');
      taskArea.className = 'rules-textarea';
      taskArea.rows = 2;
      taskArea.value = r['任务内容'] || '';
      taskArea.oninput = () => { r['任务内容'] = taskArea.value; };
      taskField.append(taskLbl, taskArea);

      // 4. Vocab & Reading dropdown row
      const ruleRow = document.createElement('div');
      ruleRow.className = 'rules-form-row';

      const vocabField = document.createElement('div');
      vocabField.className = 'rules-field';
      const vocabLbl = document.createElement('span');
      vocabLbl.className = 'rules-label';
      vocabLbl.textContent = '单词布置方式';
      const vocabSel = document.createElement('select');
      vocabSel.className = 'rules-select';
      for (const opt of ['跟随任务内容', '仅听力', '仅阅读', '听读交替', '听读各一份']) {
        const o = document.createElement('option');
        o.value = opt;
        o.textContent = opt;
        o.selected = (r['单词布置方式'] || '跟随任务内容') === opt;
        vocabSel.append(o);
      }
      vocabSel.onchange = () => { r['单词布置方式'] = vocabSel.value; };
      vocabField.append(vocabLbl, vocabSel);

      const readField = document.createElement('div');
      readField.className = 'rules-field';
      const readLbl = document.createElement('span');
      readLbl.className = 'rules-label';
      readLbl.textContent = '特殊阅读规则';
      const readSel = document.createElement('select');
      readSel.className = 'rules-select';
      for (const opt of ['跟随默认', '完整原卷', '仅同卷P1/P2', '跨卷P1/P2三篇', '老师安排']) {
        const o = document.createElement('option');
        o.value = opt;
        o.textContent = opt;
        o.selected = (r['特殊阅读规则'] || '跟随默认') === opt;
        readSel.append(o);
      }
      readSel.onchange = () => { r['特殊阅读规则'] = readSel.value; };
      readField.append(readLbl, readSel);

      ruleRow.append(vocabField, readField);

      // 5. Date inputs
      const dateRow = document.createElement('div');
      dateRow.className = 'rules-form-row';

      const startField = document.createElement('div');
      startField.className = 'rules-field';
      const startLbl = document.createElement('span');
      startLbl.className = 'rules-label';
      startLbl.textContent = '下次日期';
      const startInp = document.createElement('input');
      startInp.type = 'date';
      startInp.className = 'rules-input';
      startInp.value = (r['date:下次日期:start'] || '').slice(0, 10);
      startInp.oninput = () => { r['date:下次日期:start'] = startInp.value || null; };
      startField.append(startLbl, startInp);

      const endField = document.createElement('div');
      endField.className = 'rules-field';
      const endLbl = document.createElement('span');
      endLbl.className = 'rules-label';
      endLbl.textContent = '截止日期';
      const endInp = document.createElement('input');
      endInp.type = 'date';
      endInp.className = 'rules-input';
      endInp.value = (r['date:重复截止:start'] || '').slice(0, 10);
      endInp.oninput = () => { r['date:重复截止:start'] = endInp.value || null; };
      endField.append(endLbl, endInp);

      dateRow.append(startField, endField);

      freqPanel.append(freqField, dayPillsBox, formatField, taskField, ruleRow, dateRow);
    } else {
      const emptyFreq = document.createElement('p');
      emptyFreq.style.cssText = 'color:var(--muted);font-size:12.5px;margin:8px 0';
      emptyFreq.textContent = '该学员目前仅有随课任务，无固定日常自习打底规则。';
      freqPanel.append(emptyFreq);
    }

    // Panel 2: Attendance Rule
    const attPanel = document.createElement('div');
    attPanel.className = 'rules-panel';
    const attTitle = document.createElement('h4');
    attTitle.className = 'rules-panel-title';
    attTitle.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
      </svg>
      有课当天配套规则
    `;
    attPanel.append(attTitle);

    const att = g.attRule;
    if (att) {
      // 1. Vocab task on class days
      const vocabField = document.createElement('div');
      vocabField.className = 'rules-field';
      const vocabLbl = document.createElement('span');
      vocabLbl.className = 'rules-label';
      vocabLbl.textContent = '随课单词任务（留空表示有课当天不布置单词打底）';
      const vocabInp = document.createElement('input');
      vocabInp.type = 'text';
      vocabInp.className = 'rules-input';
      vocabInp.value = att.vocab_task || '';
      vocabInp.placeholder = '例：系统内单词：听力*50+阅读*50 或 校内单词背诵';
      vocabInp.oninput = () => { att.vocab_task = vocabInp.value.trim() || null; };
      vocabField.append(vocabLbl, vocabInp);

      // 2. Attendance tasks
      const tasksField = document.createElement('div');
      tasksField.className = 'rules-field';
      const tasksLbl = document.createElement('span');
      tasksLbl.className = 'rules-label';
      tasksLbl.textContent = '随课公共配套任务（每行一项）';
      const tasksArea = document.createElement('textarea');
      tasksArea.className = 'rules-textarea';
      tasksArea.rows = 2;
      tasksArea.value = Array.isArray(att.attendance_tasks) ? att.attendance_tasks.join('\n') : '';
      tasksArea.placeholder = '例：随课作业';
      tasksArea.oninput = () => {
        att.attendance_tasks = tasksArea.value.split('\n').map(x => x.trim()).filter(Boolean);
      };
      tasksField.append(tasksLbl, tasksArea);

      attPanel.append(vocabField, tasksField);

      // 3. Subject rules (if any)
      if (att.subject_rules && Object.keys(att.subject_rules).length > 0) {
        const subBox = document.createElement('div');
        subBox.className = 'rules-field';
        const subLbl = document.createElement('span');
        subLbl.className = 'rules-label';
        subLbl.textContent = '科目专属配套任务';
        subBox.append(subLbl);

        for (const [subj, tasks] of Object.entries(att.subject_rules)) {
          const sField = document.createElement('div');
          sField.style.marginTop = '4px';
          const sLbl = document.createElement('span');
          sLbl.style.cssText = 'font-size:11px;color:var(--muted);font-weight:600';
          sLbl.textContent = `${subj}课后：`;
          const sArea = document.createElement('textarea');
          sArea.className = 'rules-textarea';
          sArea.rows = 2;
          sArea.value = Array.isArray(tasks) ? tasks.join('\n') : '';
          sArea.oninput = () => {
            att.subject_rules[subj] = sArea.value.split('\n').map(x => x.trim()).filter(Boolean);
          };
          sField.append(sLbl, sArea);
          subBox.append(sField);
        }
        attPanel.append(subBox);
      }
    } else {
      const emptyAtt = document.createElement('p');
      emptyAtt.style.cssText = 'color:var(--muted);font-size:12.5px;margin:8px 0';
      emptyAtt.textContent = '未登记专属有课配套规则，默认跟随通用课程安排。';
      attPanel.append(emptyAtt);
    }

    grid.append(freqPanel, attPanel);
    card.append(grid);
    return card;
  }

  function renderOverridesManager(container, groups) {
    const sec = document.createElement('div');
    sec.className = 'rules-overrides-section';

    const h3 = document.createElement('h3');
    h3.style.cssText = 'margin:0;font-size:16px;font-weight:650;color:var(--fg)';
    h3.textContent = '暂停与老师人工安排（Overrides）';
    const desc = document.createElement('p');
    desc.style.cssText = 'font-size:12.5px;color:var(--muted);margin:0 0 10px;line-height:1.5';
    desc.textContent = '在此设置阶段性暂停或交由任课老师安排。覆盖生效期间，对应学员的该科目将不会自动发布作业；若设置为老师安排，将由任课老师在课后手动布置。';
    sec.append(h3, desc);

    const overrides = state.draft?.overrides || [];
    if (overrides.length > 0) {
      const list = document.createElement('div');
      list.style.cssText = 'display:flex;flex-direction:column;gap:10px';

      for (const ov of overrides) {
        const item = document.createElement('div');
        item.className = 'rules-override-box';
        const actionLabel = ov.action === 'pause' ? '⏸️ 暂停自动布置' : '👨‍🏫 交由老师安排';
        const subj = ov.kind === 'vocab' ? '单词' : (ov.subject || '全科');
        const dates = ov.start ? (ov.start + (ov.end ? ` ~ ${ov.end}` : ' 起持续生效')) : '持续生效';

        item.innerHTML = `
          <div>
            <strong>【${ov.student}】 · ${subj} · ${actionLabel}</strong>
            <div style="font-size:11.5px;color:var(--fg-secondary);margin-top:2px">有效期：${dates}</div>
            <div style="font-size:11px;color:var(--muted);margin-top:2px">说明：${ov.reason || '无说明'}</div>
          </div>
        `;

        const restoreBtn = document.createElement('button');
        restoreBtn.type = 'button';
        restoreBtn.className = 'rules-restore-btn';
        restoreBtn.textContent = '恢复自动规则';
        restoreBtn.onclick = () => {
          state.draft.overrides = state.draft.overrides.filter(x => x !== ov);
          render();
          status(`已恢复【${ov.student}】的自动规则，请点击右上角保存。`);
        };
        item.append(restoreBtn);
        list.append(item);
      }
      sec.append(list);
    } else {
      const empty = document.createElement('p');
      empty.style.cssText = 'color:var(--muted);font-size:13px;padding:12px 0;margin:0';
      empty.textContent = '当前没有生效中的暂停或人工安排规则。所有学员均按系统统一规则执行。';
      sec.append(empty);
    }

    // Add Override Form (No prompt()!)
    const formBox = document.createElement('div');
    formBox.style.cssText = 'border-top:1px solid var(--line);padding-top:16px;margin-top:8px;display:flex;flex-direction:column;gap:12px';

    const formTitle = document.createElement('h4');
    formTitle.style.cssText = 'margin:0;font-size:14px;font-weight:600;color:var(--fg)';
    formTitle.textContent = '+ 添加暂停或老师人工安排';

    const row1 = document.createElement('div');
    row1.className = 'rules-form-row';

    // Student select
    const sField = document.createElement('div');
    sField.className = 'rules-field';
    sField.innerHTML = '<span class="rules-label">学员姓名</span>';
    const sSel = document.createElement('select');
    sSel.className = 'rules-select';
    for (const g of groups) {
      const o = document.createElement('option');
      o.value = g.name;
      o.textContent = g.name;
      sSel.append(o);
    }
    sField.append(sSel);

    // Subject select
    const subField = document.createElement('div');
    subField.className = 'rules-field';
    subField.innerHTML = '<span class="rules-label">科目 / 项目</span>';
    const subSel = document.createElement('select');
    subSel.className = 'rules-select';
    for (const s of ['单词', '听力', '阅读', '口语', '写作']) {
      const o = document.createElement('option');
      o.value = s;
      o.textContent = s;
      subSel.append(o);
    }
    subField.append(subSel);

    // Action select
    const actField = document.createElement('div');
    actField.className = 'rules-field';
    actField.innerHTML = '<span class="rules-label">操作类型</span>';
    const actSel = document.createElement('select');
    actSel.className = 'rules-select';
    actSel.innerHTML = `
      <option value="pause">暂停自动布置 (Pause)</option>
      <option value="teacher">交由任课老师安排 (Teacher Handoff)</option>
    `;
    actField.append(actSel);

    row1.append(sField, subField, actField);

    const row2 = document.createElement('div');
    row2.className = 'rules-form-row';

    // Dates
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Shanghai' });
    const startField = document.createElement('div');
    startField.className = 'rules-field';
    startField.innerHTML = '<span class="rules-label">开始日期</span>';
    const startInp = document.createElement('input');
    startInp.type = 'date';
    startInp.className = 'rules-input';
    startInp.value = todayStr;
    startField.append(startInp);

    const endField = document.createElement('div');
    endField.className = 'rules-field';
    endField.innerHTML = '<span class="rules-label">结束日期（留空为持续生效）</span>';
    const endInp = document.createElement('input');
    endInp.type = 'date';
    endInp.className = 'rules-input';
    endField.append(endInp);

    const reasonField = document.createElement('div');
    reasonField.className = 'rules-field';
    reasonField.innerHTML = '<span class="rules-label">设置原因</span>';
    const reasonInp = document.createElement('input');
    reasonInp.type = 'text';
    reasonInp.className = 'rules-input';
    reasonInp.placeholder = '例：本周冲刺校内期中考';
    reasonField.append(reasonInp);

    row2.append(startField, endField, reasonField);

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'rules-btn-save';
    addBtn.style.alignSelf = 'flex-start';
    addBtn.textContent = '添加特殊规则';
    addBtn.onclick = () => {
      const student = sSel.value;
      const subj = subSel.value;
      const action = actSel.value;
      const start = startInp.value || todayStr;
      const end = endInp.value || null;
      const reason = reasonInp.value.trim() || '老师在工作台规则面板设置';

      state.draft.overrides = state.draft.overrides || [];
      state.draft.overrides.push({
        student,
        kind: subj === '单词' ? 'vocab' : 'suite',
        ...(subj === '单词' ? {} : { subject: subj }),
        action,
        start,
        end,
        reason
      });
      render();
      status(`已添加【${student}】的特殊规则，请点击右上角保存。`);
    };

    formBox.append(formTitle, row1, row2, addBtn);
    sec.append(formBox);
    container.append(sec);
  }

  async function load() {
    status('正在读取统一规则…');
    const userRes = await client.auth.getUser();
    if (userRes.error || !userRes.data?.user) {
      state.owner = null;
      render();
      status('请登录工作台账号以管理统一规则');
      return;
    }

    const bound = await client.from('wayon_owner')
      .select('user_id')
      .eq('user_id', userRes.data.user.id)
      .maybeSingle();
    if (bound.error || !bound.data) throw Error('OWNER_NOT_BOUND');

    const result = await client.from('wayon_rule_catalog')
      .select('revision,payload')
      .eq('owner_id', userRes.data.user.id)
      .single();
    if (result.error) throw Error('READ_FAILED');

    state.owner = userRes.data.user.id;
    state.base = result.data;
    state.draft = clone(result.data.payload);
    render();
    status(`已读取统一规则 · 版本 v${state.base.revision}。修改并保存后，下次 Action 自动使用最新版本。`);
  }

  await load().catch(err => {
    console.error('Rules load error:', err);
    status('规则读取失败，请检查账号权限或网络后重试', true);
  });

  return state;
}
