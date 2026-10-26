import { clone, clean, SYSTEMS, todayShanghai, inspectTask, taskLines, manualTask, setManual, validateDraft } from './rules-model.mjs?v=20261026-studio2';
import { canonical, saveCatalog } from './rules-store.mjs?v=20261026-studio2';
import { buildRuleEntities, entityStatus, setEntityStatus, findEntityForRule, ruleEntityDisplayName } from './rules-entities.mjs?v=20261026-studio2';
import { STYLE } from './rules-studio-style.mjs?v=20261026-studio2';

const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const same = (a, b) => canonical(a) === canonical(b);
const WEEKDAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
const LABELS = { ...SYSTEMS, school: '校内' };
const EDIT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m16 3 5 5-12 12-6 1 1-6Z"/><path d="m14 5 5 5"/></svg>';
const CLOSE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6"/></svg>';

// These are projections of the catalog, never replacement business records.
export function attendanceItems(payload, entity) {
  const result = [];
  for (const key of entity.attendanceKeys) {
    const rule = payload.attendance_rules?.[key];
    if (!rule) continue;
    const add = (text, kind, subject, index) => result.push({ ref: JSON.stringify([key, kind, subject, index]), text, rule, key, kind, subject, index });
    if (rule.vocab_task) add(rule.vocab_task, 'vocab', '通用', 0);
    (rule.attendance_tasks || []).forEach((text, index) => add(text, 'common', '通用', index));
    for (const [subject, texts] of Object.entries(rule.subject_rules || {})) texts.forEach((text, index) => add(text, 'subject', subject, index));
  }
  return result;
}
export function checkinItems(payload, entity) {
  return (payload.frequency_rows || []).filter(row => entity.frequencyIds.includes(row.id)).flatMap(row =>
    taskLines(row['任务内容']).map((text, index) => ({ ref: JSON.stringify([row.id, index]), text, rule: row, rowId: row.id, index })));
}
function authored(rule, scope) {
  return scope === 'checkin' ? taskLines(rule['任务内容']) : [rule.vocab_task, ...(rule.attendance_tasks || []), ...Object.values(rule.subject_rules || {}).flat()].filter(Boolean);
}
function updateManual(rule, scope, before, after, manual) {
  if (before && before !== after && !authored(rule, scope).includes(before) && manualTask(rule, before)) setManual(rule, before, false);
  if (after && manualTask(rule, after) !== manual) setManual(rule, after, manual);
}
const uuid = () => globalThis.crypto?.randomUUID?.() || 'rule-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
const dateLabel = value => value ? String(value).slice(0, 10).replace(/^\d{4}-(\d{2})-(\d{2})$/, (_, month, day) => Number(month) + '月' + Number(day) + '日') : '';
function frequency(row) {
  return row['重复'] === '每周固定几天' ? '每周' + (row['周几'] || []).map(day => String(day).replace(/^周/, '')).join('、') : row['重复'] === '随课/每天' ? '有课日' : row['重复'] || '未设频率';
}

export async function mountRules({ document, client, container, onClose }) {
  if (!document.getElementById('wayon-rules-studio-style')) {
    const style = document.createElement('style'); style.id = 'wayon-rules-studio-style'; style.textContent = STYLE;
    document.head.append(style);
  }
  const host = container || document.getElementById('rules') || document.body;
  const root = document.createElement('div'); root.className = 'rules-studio app'; host.replaceChildren(root);
  const q = selector => root.querySelector(selector);
  const state = { owner: null, base: null, draft: null, view: 'people', selected: null, query: '', system: 'all', status: 'all', expanded: new Set(), busy: false, message: '正在读取规则…', error: false, editor: null, known: [] };
  let dialog, toastTimer;
  const dirty = () => !!state.base && !!state.draft && !same(state.base.payload, state.draft);
  const entities = () => buildRuleEntities(state.draft || {});
  const selectedEntity = key => entities().find(entity => entity.key === key) || state.known.find(entity => entity.key === key);
  const items = (entity, scope) => scope === 'attendance' ? attendanceItems(state.draft, entity) : checkinItems(state.draft, entity);
  function setMessage(text, error = false) {
    state.message = text; state.error = error;
    const element = q('.save-state');
    if (element) { element.textContent = text; element.classList.toggle('dirty', dirty()); element.classList.toggle('error', error); }
  }
  function footer() {
    const status = q('.save-state');
    if (!status) return;
    status.textContent = state.message || (dirty() ? '有未保存的修改' : '已读取最新规则');
    status.classList.toggle('dirty', dirty()); status.classList.toggle('error', state.error);
    for (const action of ['save', 'discard', 'diff']) { const button = q(`[data-action="${action}"]`); if (button) button.disabled = state.busy || !dirty(); }
  }
  function modified() { setMessage('有未保存的修改，保存后由下一次例行读取。'); footer(); }
  function toast(text) {
    const element = q('.toast'); if (!element) return;
    element.textContent = text; element.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { element.hidden = true; }, 2800);
  }
  function setBusy(value) {
    state.busy = value;
    if (value) root.querySelectorAll('button,input,select,textarea').forEach(element => { element.dataset.wasDisabled = String(element.disabled); element.disabled = true; });
    else root.querySelectorAll('[data-was-disabled]').forEach(element => { element.disabled = element.dataset.wasDisabled === 'true'; delete element.dataset.wasDisabled; });
    footer();
  }
  function statusSwitch(entity) {
    const status = entityStatus(entity, state.draft), enabled = status === 'on';
    return `<button type="button" class="status-switch ${enabled ? '' : 'is-off'} ${status === 'mixed' ? 'is-mixed' : ''}" role="switch" aria-checked="${enabled}" data-action="toggle-status" data-person="${escape(entity.key)}" aria-label="${escape(entity.name)}的打卡任务总开关" ${status === 'empty' ? 'disabled title="添加打卡任务后可切换状态"' : status === 'mixed' ? 'title="现有安排中有进行中和暂停；点击统一开启"' : ''}><span class="switch-track" aria-hidden="true"><span class="switch-knob"></span></span><span>${status === 'mixed' ? '部分暂停' : enabled ? '正在进行' : '暂停'}</span></button>`;
  }
  function taskMeta(item, scope, entity) {
    const inspected = inspectTask(item.text, item.rule.system || entity.system, manualTask(item.rule, item.text));
    if (scope === 'attendance') return inspected.label;
    const row = item.rule, parts = [frequency(row), row['形式'] || '', row['date:下次日期:start'] ? dateLabel(row['date:下次日期:start']) + '起' : '', row['date:重复截止:start'] ? '至' + dateLabel(row['date:重复截止:start']) : '', inspected.label];
    if (row['本次已完成'] === true || row['本次已完成'] === '__YES__') parts.push('本次已人工确认完成');
    if (entityStatus(entity, state.draft) === 'mixed') parts.push(row['状态'] === '进行中' ? '本安排正在进行' : '本安排暂停');
    if (row['单词布置方式'] && row['单词布置方式'] !== '跟随任务内容') parts.push(row['单词布置方式']);
    if (row['特殊阅读规则'] && row['特殊阅读规则'] !== '跟随默认') parts.push(row['特殊阅读规则']);
    return parts.filter(Boolean).join(' · ');
  }
  function taskRow(entity, scope, item) {
    return `<div class="task-row" data-task="${escape(item.ref)}"><div class="task-main"><div class="task-name">${escape(item.text)}</div><div class="task-meta">${escape(taskMeta(item, scope, entity))}</div></div><div class="task-actions"><button type="button" class="icon-btn" data-action="edit-task" data-person="${escape(entity.key)}" data-scope="${scope}" data-task="${escape(item.ref)}" aria-label="编辑${escape(item.text)}" title="编辑任务">${EDIT}</button></div></div>`;
  }
  function relatedOverrides(entity) {
    return (state.draft.overrides || []).map((rule, index) => ({ rule, index })).filter(({ rule }) => (!rule.system || rule.system === entity.system) && entity.names.some(name => clean(name) === clean(rule.student)));
  }
  function specialNotes(entity) {
    return relatedOverrides(entity).map(({ rule, index }) => `<div class="special-note"><span>${escape((rule.subject || (rule.kind === 'vocab' ? '单词' : '自动任务')) + ' · ' + (rule.action === 'pause' ? '暂停' : '交老师处理') + ' · ' + (rule.start || '立即') + ' 至 ' + (rule.end || '另行恢复'))}${rule.reason ? '<br>' + escape(rule.reason) : ''}</span><button type="button" class="icon-btn" data-action="edit-override" data-index="${index}" aria-label="编辑特殊安排">${EDIT}</button></div>`).join('');
  }
  function taskContents(entity, scope) {
    const list = items(entity, scope);
    let html = '';
    if (!list.length) html = `<div class="empty-state">还没有${scope === 'attendance' ? '随课' : '打卡'}任务</div>`;
    else if (scope === 'attendance') {
      const subjects = [...new Set(list.map(item => item.subject))].sort((a, b) => a === '通用' ? -1 : b === '通用' ? 1 : 0);
      html = subjects.map(subject => `<div class="task-group"><h3 class="group-caption">${subject === '通用' ? '每节课' : escape(subject) + '课'}</h3>${list.filter(item => item.subject === subject).map(item => taskRow(entity, scope, item)).join('')}</div>`).join('');
    } else html = list.map(item => taskRow(entity, scope, item)).join('');
    html += specialNotes(entity);
    html += `<button type="button" class="add-btn" data-action="add-task" data-person="${escape(entity.key)}" data-scope="${scope}">＋ 添加${scope === 'attendance' ? '随课' : '打卡'}任务</button>`;
    return html;
  }
  function taskSection(entity, scope, overview = false) {
    const key = (overview ? 'overview:' : 'detail:') + entity.key + ':' + scope, collapsed = !state.expanded.has(key);
    const title = overview ? entity.name : scope === 'attendance' ? '随课任务' : '打卡任务';
    return `<section class="task-section ${collapsed ? 'collapsed' : ''}" data-person="${escape(entity.key)}" data-scope="${scope}"><div class="section-heading"><button type="button" class="section-toggle" data-action="collapse" data-key="${escape(key)}" aria-expanded="${!collapsed}"><span class="chevron" aria-hidden="true">${collapsed ? '›' : '⌄'}</span><span class="section-title">${escape(title)}</span>${overview ? '<span class="system-pill">' + escape(entity.systemLabel) + '</span>' : ''}</button><div class="section-controls">${scope === 'checkin' ? statusSwitch(entity) : ''}${overview ? `<button type="button" class="icon-btn" data-action="open-person" data-person="${escape(entity.key)}" aria-label="查看${escape(entity.name)}的全部规则" title="查看完整规则">↗</button>` : ''}</div></div><div class="section-body" ${collapsed ? 'hidden' : ''}>${taskContents(entity, scope)}</div></section>`;
  }
  function renderContent() {
    const content = q('.content'); if (!content || !state.draft) return;
    const scroll = content.scrollTop;
    if (state.selected) {
      const entity = selectedEntity(state.selected);
      if (!entity) { state.selected = null; render(); return; }
      content.innerHTML = `<div class="detail-head"><button type="button" class="back-btn" data-action="back">‹ 返回${state.view === 'people' ? '名单' : '总览'}</button><h2 class="detail-title">${escape(entity.name)}<span class="system-pill">${escape(entity.systemLabel)}</span></h2></div><div class="detail-sections">${taskSection(entity, 'attendance')}${taskSection(entity, 'checkin')}</div>`;
    } else {
      const query = state.query.trim().toLocaleLowerCase();
      const list = entities().filter(entity => (state.system === 'all' || entity.system === state.system) && (state.view !== 'checkin' || state.status === 'all' || entityStatus(entity, state.draft) === state.status) && (!query || (entity.name + ' ' + (state.view === 'people' ? '' : items(entity, state.view === 'attendance' ? 'attendance' : 'checkin').map(item => item.text).join(' '))).toLocaleLowerCase().includes(query)));
      if (!list.length) content.innerHTML = '<div class="empty-state">没有找到符合条件的学员或班级</div>';
      else if (state.view === 'people') content.innerHTML = `<div class="roster-grid">${list.map(entity => `<button type="button" class="person-card" data-action="open-person" data-person="${escape(entity.key)}"><span class="person-name">${escape(entity.name)}</span><span class="system-pill">${escape(entity.systemLabel)}</span><span class="chevron" aria-hidden="true">›</span></button>`).join('')}</div>`;
      else content.innerHTML = list.map(entity => taskSection(entity, state.view === 'attendance' ? 'attendance' : 'checkin', true)).join('');
    }
    content.scrollTop = scroll;
  }
  function render() {
    const ready = !!state.owner && !!state.draft;
    root.innerHTML = `<header class="topbar"><span class="brand">Wayon</span><h1 class="page-title">任务规则</h1><div class="header-actions"><button type="button" class="icon-btn" data-action="reload" title="重新读取规则" aria-label="重新读取规则">↻</button>${ready ? '<button type="button" class="icon-btn" data-action="specials" title="特殊安排" aria-label="管理特殊安排">⋯</button>' : ''}<button type="button" class="icon-btn" data-action="close" aria-label="关闭任务规则">${CLOSE}</button></div></header>
      ${ready ? `<nav class="view-tabs" aria-label="规则视图">${[['people', '学员／班级'], ['attendance', '全部随课任务'], ['checkin', '全部打卡任务']].map(([key, text]) => `<button type="button" class="view-tab ${state.view === key ? 'active' : ''}" aria-current="${state.view === key ? 'page' : 'false'}" data-action="view" data-view="${key}">${text}</button>`).join('')}</nav><div class="toolbar" ${state.selected ? 'hidden' : ''}><label class="search"><span class="sr-only">搜索规则</span><input type="search" data-field="search" aria-label="搜索规则" placeholder="${state.view === 'people' ? '搜索姓名或班级' : '搜索姓名、班级或任务'}" value="${escape(state.query)}"></label><select class="filter-select" data-field="system" aria-label="筛选体系"><option value="all">全部体系</option>${[...new Set(entities().map(entity => entity.system))].map(system => `<option value="${escape(system)}" ${state.system === system ? 'selected' : ''}>${escape(LABELS[system] || system)}</option>`).join('')}</select>${state.view === 'checkin' ? `<select class="filter-select" data-field="status" aria-label="筛选打卡状态">${[['all', '全部状态'], ['on', '正在进行'], ['off', '暂停'], ...((state.status === 'mixed' || entities().some(entity => entityStatus(entity, state.draft) === 'mixed')) ? [['mixed', '部分暂停']] : [])].map(([key, label]) => `<option value="${key}" ${state.status === key ? 'selected' : ''}>${label}</option>`).join('')}</select>` : ''}</div>` : ''}
      <main class="content ${state.selected ? 'person-detail' : ''}" aria-label="规则内容">${ready ? '' : state.owner ? '<div class="empty-state">规则未能读取。<button type="button" class="button" data-action="reload">重试读取</button></div>' : '<form class="login-form"><h2>登录后查看任务规则</h2><label class="field">邮箱<input name="email" type="email" autocomplete="username" required></label><label class="field">密码<input name="password" type="password" autocomplete="current-password" required></label><button type="submit" class="button primary">登录</button></form>'}</main>
      <footer class="footer"><div class="save-state" role="status" aria-live="polite"></div><div class="footer-actions">${ready ? '<button type="button" class="button ghost" data-action="diff">查看变更</button><button type="button" class="button ghost" data-action="discard">放弃修改</button><button type="button" class="button primary" data-action="save">保存修改</button>' : ''}</div></footer><dialog class="drawer-backdrop" aria-labelledby="rules-drawer-title"></dialog><div class="toast" role="status" aria-live="polite" hidden></div>`;
    dialog = q('dialog');
    dialog.addEventListener('close', () => { state.editor = null; });
    dialog.addEventListener('click', event => { if (event.target === dialog) closeDrawer(); });
    if (ready) renderContent(); footer();
  }
  function closeDrawer() { if (dialog?.open) dialog.close(); state.editor = null; }
  function showDrawer(title, body, buttons = '<button type="button" class="button primary" data-action="close-drawer">知道了</button>') {
    dialog.innerHTML = `<section class="drawer"><header class="drawer-head"><h2 id="rules-drawer-title">${escape(title)}</h2><button type="button" class="icon-btn" data-action="close-drawer" aria-label="关闭编辑">${CLOSE}</button></header><div class="drawer-body">${body}</div><footer class="drawer-foot">${buttons}</footer></section>`;
    if (!dialog.open) dialog.showModal();
  }
  const field = (label, control, full = false) => `<label class="field ${full ? 'full' : ''}"><span>${label}</span>${control}</label>`;
  function options(values, current) {
    const rows = values.map(value => Array.isArray(value) ? value : [value, value]);
    if (current && !rows.some(([value]) => value === current)) rows.push([current, current]);
    return rows.map(([value, text]) => `<option value="${escape(value)}" ${current === value ? 'selected' : ''}>${escape(text)}</option>`).join('');
  }
  function openEditor(entityKey, scope, reference) {
    const entity = selectedEntity(entityKey); if (!entity) return;
    const item = items(entity, scope).find(item => item.ref === reference);
    const row = item?.rule || {};
    state.editor = { type: 'task', entityKey, scope, reference, days: [...(row['周几'] || ['周一', '周三', '周五'])] };
    const subjects = [...new Set(['通用', '听力', '阅读', '写作', '口语', '语法', ...attendanceItems(state.draft, entity).map(item => item.subject)])];
    const manual = item ? manualTask(row, item.text) || inspectTask(item.text, row.system || entity.system).mode === 'manual' : true;
    const body = `<p class="editor-person">${escape(entity.name)} <span class="system-pill">${escape(entity.systemLabel)}</span></p><form id="rules-task-form"><div class="field-grid">${field('任务内容', `<textarea id="task-title" name="title" aria-label="任务内容" required placeholder="写清具体任务与数量">${escape(item?.text || '')}</textarea>`, true)}${scope === 'attendance' ? field('适用课程', `<select data-field="task-subject" aria-label="适用课程">${options([...subjects.map(subject => [subject, subject === '通用' ? '每节课' : subject + '课']), ['custom', '自定义课程…']], item?.subject || '通用')}</select>`) : field('重复频率', `<select data-field="task-repeat" aria-label="重复频率">${options([['每天', '每天'], ['每周固定几天', '每周固定几天'], ['随课/每天', '有课日（历史规则）']], row['重复'] || '每天')}</select>`)}${field('处理方式', `<select data-field="task-handler" aria-label="处理方式">${options([['teacher', '老师／助教处理'], ['system', '自动识别']], manual ? 'teacher' : 'system')}</select>`)}${scope === 'attendance' ? '<label class="field full" data-custom-subject hidden><span>课程名称</span><input data-field="custom-subject" aria-label="课程名称" placeholder="填写课程名称"></label>' : `<div class="field full" data-weekdays ${row['重复'] === '每周固定几天' ? '' : 'hidden'}><span>执行日</span><div class="weekday-picker" role="group" aria-label="每周执行日">${WEEKDAYS.map(day => `<button type="button" class="${state.editor.days.includes(day) ? 'active' : ''}" data-action="weekday" data-day="${day}" aria-pressed="${state.editor.days.includes(day)}">${day.slice(1)}</button>`).join('')}</div></div>${field('开始日期', `<input type="date" data-field="task-start" aria-label="开始日期" value="${escape((row['date:下次日期:start'] || '').slice(0, 10))}">`)}${field('结束日期（含当天）', `<input type="date" data-field="task-end" aria-label="结束日期" value="${escape((row['date:重复截止:start'] || '').slice(0, 10))}">`)}${taskLines(row['任务内容']).length > 1 ? `<p class="small-note field full">本安排包含 ${taskLines(row['任务内容']).length} 项任务，频率与日期对这些任务共同生效。</p>` : ''}<details class="field full advanced-options"><summary>更多安排</summary>${field('形式', `<select data-field="task-form">${options(['线上', '自习', '线下'], row['形式'] || '线上')}</select>`)}${field('单词方式', `<select data-field="vocab-mode">${options(['跟随任务内容', '仅听力', '仅阅读', '听读交替', '两科分别布置'], row['单词布置方式'] || '跟随任务内容')}</select>`)}${field('阅读方式', `<select data-field="reading-mode">${options(['跟随默认', '完整原卷', '仅同卷P1/P2', '跨卷P1/P2三篇', '老师安排'], row['特殊阅读规则'] || '跟随默认')}</select>`)}${field('备注', `<textarea data-field="task-note">${escape(row['备注'] || '')}</textarea>`)}${row['本次已完成'] === true || row['本次已完成'] === '__YES__' ? '<p class="small-note">本次已人工确认完成；此记录保留。</p>' : ''}</details>`}</div><p class="small-note task-inspection"></p><p class="editor-error" role="alert" hidden></p></form>`;
    showDrawer((item ? '编辑' : '添加') + (scope === 'attendance' ? '随课任务' : '打卡任务'), body, `${item ? '<button type="button" class="button danger delete-task-button" data-action="delete-task">删除任务</button>' : ''}<button type="button" class="button" data-action="close-drawer">取消</button><button type="submit" form="rules-task-form" class="button primary">完成</button>`);
    inspection(); q('textarea[name="title"]').focus();
  }
  function inspection() {
    if (state.editor?.type !== 'task') return;
    const entity = selectedEntity(state.editor.entityKey);
    const result = inspectTask(q('textarea[name="title"]').value, entity.system, q('[data-field="task-handler"]').value === 'teacher');
    q('.task-inspection').textContent = result.label;
  }
  function formError(message) { const error = q('.editor-error'); error.textContent = message; error.hidden = false; }
  function removeAttendance(item) {
    if (item.kind === 'vocab') item.rule.vocab_task = '';
    else if (item.kind === 'common') item.rule.attendance_tasks.splice(item.index, 1);
    else item.rule.subject_rules[item.subject].splice(item.index, 1);
  }
  function addAttendance(entity, text, subject) {
    const key = entity.attendanceKeys[0] || entity.rawLabels[0];
    if (!key) throw Error('规则缺少原身份，请重新读取。');
    state.draft.attendance_rules ??= {};
    const rule = state.draft.attendance_rules[key] ||= { name: key, system: entity.system, vocab_task: '', attendance_tasks: [], subject_rules: {} };
    if (subject === '通用') { rule.attendance_tasks ??= []; rule.attendance_tasks.push(text); }
    else { rule.subject_rules ??= {}; rule.subject_rules[subject] ??= []; rule.subject_rules[subject].push(text); }
    return rule;
  }
  function submitTask(event) {
    event.preventDefault(); if (state.busy || state.editor?.type !== 'task') return;
    const editor = state.editor, entity = selectedEntity(editor.entityKey), item = items(entity, editor.scope).find(item => item.ref === editor.reference);
    const text = q('textarea[name="title"]').value.trim(), manual = q('[data-field="task-handler"]').value === 'teacher';
    if (taskLines(text).length !== 1) return formError('一项任务只填一条；多项任务请分别添加。');
    const inspected = inspectTask(text, entity.system, manual);
    const unchangedAuthored = item && item.text === text && manualTask(item.rule, item.text) === manual;
    if (inspected.mode === 'invalid' || (!unchangedAuthored && inspected.mode === 'unknown')) return formError(inspected.label);
    let subject, repeat, start, end;
    if (editor.scope === 'attendance') {
      subject = q('[data-field="task-subject"]').value;
      if (subject === 'custom') subject = q('[data-field="custom-subject"]').value.trim().replace(/课$/, '');
      if (!subject || ['__proto__', 'prototype', 'constructor'].includes(subject)) return formError('请填写有效课程名称。');
    } else {
      repeat = q('[data-field="task-repeat"]').value; start = q('[data-field="task-start"]').value; end = q('[data-field="task-end"]').value;
      if (repeat === '每周固定几天' && !editor.days.length) return formError('请至少选择一个执行日。');
      if (start && end && start > end) return formError('结束日期不能早于开始日期。');
    }
    let rule;
    if (editor.scope === 'attendance') {
      if (item && item.subject === subject) {
        rule = item.rule;
        if (item.kind === 'vocab') rule.vocab_task = text;
        else if (item.kind === 'common') rule.attendance_tasks[item.index] = text;
        else rule.subject_rules[subject][item.index] = text;
      } else {
        if (item) removeAttendance(item);
        rule = addAttendance(entity, text, subject);
      }
    } else {
      if (item) { rule = item.rule; const lines = taskLines(rule['任务内容']); lines[item.index] = text; rule['任务内容'] = lines.join('\n'); }
      else {
        rule = { id: uuid(), 学员: entity.rawLabels.find(label => state.draft.frequency_rows.some(row => row['学员'] === label)) || entity.rawLabels[0], system: entity.system, 任务: entity.name + '-打卡任务', 任务内容: text, 状态: entityStatus(entity, state.draft) === 'off' ? '暂停' : '进行中', _canonical_state: true, 形式: '线上', 重复: '每天', 周几: [] };
        state.draft.frequency_rows.push(rule);
      }
      const previousRepeat = rule['重复'];
      rule['重复'] = repeat;
      if (repeat === '每周固定几天') rule['周几'] = WEEKDAYS.filter(day => editor.days.includes(day));
      else if (!item || repeat !== previousRepeat) rule['周几'] = [];
      for (const [key, value] of [['date:下次日期:start', start], ['date:重复截止:start', end]]) {
        if (String(rule[key] || '').slice(0, 10) === value) continue;
        if (value) rule[key] = value;
        else if (rule[key]) delete rule[key];
      }
      rule['形式'] = q('[data-field="task-form"]').value;
      const vocab = q('[data-field="vocab-mode"]').value, reading = q('[data-field="reading-mode"]').value;
      if (vocab !== (rule['单词布置方式'] || '跟随任务内容')) { if (vocab === '跟随任务内容') delete rule['单词布置方式']; else rule['单词布置方式'] = vocab; }
      if (reading !== (rule['特殊阅读规则'] || '跟随默认')) { if (reading === '跟随默认') delete rule['特殊阅读规则']; else rule['特殊阅读规则'] = reading; }
      const note = q('[data-field="task-note"]').value;
      if (note !== String(rule['备注'] || '')) rule['备注'] = note;
    }
    updateManual(rule, editor.scope, item?.text, text, manual);
    if (item && rule !== item.rule) updateManual(item.rule, editor.scope, item.text, null, false);
    closeDrawer(); renderContent(); modified();
  }
  function deleteTask() {
    const editor = state.editor; if (editor?.type !== 'task') return;
    const entity = selectedEntity(editor.entityKey), item = items(entity, editor.scope).find(item => item.ref === editor.reference);
    if (!item) return;
    if (editor.scope === 'attendance') removeAttendance(item);
    else { const lines = taskLines(item.rule['任务内容']); lines.splice(item.index, 1); if (lines.length) item.rule['任务内容'] = lines.join('\n'); else state.draft.frequency_rows = state.draft.frequency_rows.filter(row => row !== item.rule); }
    updateManual(item.rule, editor.scope, item.text, null, false);
    closeDrawer(); renderContent(); modified();
  }
  function diff() {
    const before = state.base.payload, after = state.draft, changes = [];
    const describeProfile = rule => rule ? [rule.vocab_task, ...(rule.attendance_tasks || []), ...Object.entries(rule.subject_rules || {}).flatMap(([subject, texts]) => texts.map(text => subject + '课：' + text)), rule.manual_tasks?.length ? '老师处理：' + rule.manual_tasks.join('；') : ''].filter(Boolean).join('；') || '无任务' : '未设置';
    for (const key of new Set([...Object.keys(before.attendance_rules || {}), ...Object.keys(after.attendance_rules || {})])) if (!same(before.attendance_rules?.[key], after.attendance_rules?.[key])) changes.push({ name: ruleEntityDisplayName(after.attendance_rules?.[key]?.name || before.attendance_rules?.[key]?.name || key), type: '随课任务', before: describeProfile(before.attendance_rules?.[key]), after: describeProfile(after.attendance_rules?.[key]) });
    const rowDetail = row => row ? [row['任务内容'], row['状态'] === '进行中' ? '正在进行' : row['状态'], frequency(row), row['形式'], '开始：' + (row['date:下次日期:start'] || '未设'), '结束：' + (row['date:重复截止:start'] || '未设'), row['单词布置方式'], row['特殊阅读规则'], row['备注'], row.manual_tasks?.length ? '老师处理：' + row.manual_tasks.join('；') : ''].filter(Boolean).join(' · ') : '未设置';
    const oldRows = new Map((before.frequency_rows || []).map(row => [row.id, row])), newRows = new Map((after.frequency_rows || []).map(row => [row.id, row]));
    for (const id of new Set([...oldRows.keys(), ...newRows.keys()])) if (!same(oldRows.get(id), newRows.get(id))) changes.push({ name: ruleEntityDisplayName(newRows.get(id)?.['学员'] || oldRows.get(id)?.['学员']), type: '打卡任务', before: rowDetail(oldRows.get(id)), after: rowDetail(newRows.get(id)) });
    if (!same(before.overrides || [], after.overrides || [])) changes.push({ name: '特殊安排', type: '', before: JSON.stringify(before.overrides || []), after: JSON.stringify(after.overrides || []) });
    showDrawer('查看变更', `<div class="diff-list">${changes.map(change => `<article class="diff-item"><h4>${escape(change.name)} ${escape(change.type)}</h4><div class="before">之前：${escape(change.before)}</div><div class="after">现在：${escape(change.after)}</div></article>`).join('')}</div>`, '<button type="button" class="button primary" data-action="close-drawer">继续编辑</button>');
  }
  function listOverrides() {
    showDrawer('特殊安排', `<div class="diff-list">${(state.draft.overrides || []).map((rule, index) => `<article class="diff-item"><strong>${escape(rule.student)}</strong><p>${escape((rule.subject || rule.kind || '自动任务') + ' · ' + (rule.action === 'pause' ? '暂停' : '交老师处理'))}</p><p class="small-note">${escape((rule.start || '立即') + ' 至 ' + (rule.end || '另行恢复'))}</p><button type="button" class="button" data-action="edit-override" data-index="${index}">编辑安排</button></article>`).join('') || '<p class="small-note">暂无特殊安排。</p>'}</div>`, '<button type="button" class="button" data-action="close-drawer">关闭</button><button type="button" class="button primary" data-action="new-override">添加安排</button>');
  }
  function editOverride(index) {
    const rule = state.draft.overrides?.[index] || { student: '', kind: 'automatic', action: 'pause', start: todayShanghai(), end: '', reason: '' };
    const scope = rule.kind === 'suite' ? rule.subject : rule.kind || 'automatic';
    state.editor = { type: 'override', index, originalScope: scope };
    showDrawer(index === undefined ? '添加特殊安排' : '编辑特殊安排', `<form id="rules-override-form"><div class="field-grid">${field('确切学员／班级', `<input data-field="override-student" required ${index !== undefined ? 'readonly' : ''} value="${escape(rule.student)}">`, true)}${field('任务范围', `<select data-field="override-scope">${options([['automatic', '自动任务'], ['vocab', '单词'], ...['听力', '口语', '阅读', '写作'].map(subject => [subject, subject])], scope)}</select>`)}${field('处理方式', `<select data-field="override-action">${options([['pause', '暂停'], ['teacher', '交老师处理']], rule.action)}</select>`)}${field('开始日期', `<input type="date" data-field="override-start" value="${escape(String(rule.start || '').slice(0, 10))}">`)}${field('结束日期（含当天）', `<input type="date" data-field="override-end" value="${escape(String(rule.end || '').slice(0, 10))}">`)}${field('说明', `<textarea data-field="override-reason">${escape(rule.reason || '')}</textarea>`, true)}</div><p class="small-note">按现有任务范围生效，可能同时适用于随课与打卡任务。</p><p class="editor-error" role="alert" hidden></p></form>`, `${index !== undefined ? '<button type="button" class="button danger delete-task-button" data-action="delete-override">恢复原规则</button>' : ''}<button type="button" class="button" data-action="close-drawer">取消</button><button type="submit" form="rules-override-form" class="button primary">完成</button>`);
  }
  function submitOverride(event) {
    event.preventDefault(); const editor = state.editor; if (editor?.type !== 'override') return;
    const student = q('[data-field="override-student"]').value.trim(), start = q('[data-field="override-start"]').value, end = q('[data-field="override-end"]').value;
    if (!student) return formError('请填写确切学员或班级。'); if (start && end && start > end) return formError('结束日期不能早于开始日期。');
    const scope = q('[data-field="override-scope"]').value, previous = state.draft.overrides?.[editor.index];
    const rule = { ...(previous || {}), student, action: q('[data-field="override-action"]').value };
    for (const [key, value] of [['start', start], ['end', end]]) if (!previous || String(previous[key] || '').slice(0, 10) !== value) rule[key] = value || null;
    const reason = q('[data-field="override-reason"]').value.trim();
    if (!previous || reason !== String(previous.reason || '')) rule.reason = reason;
    if (!previous || scope !== editor.originalScope) {
      if (['automatic', 'vocab'].includes(scope)) { rule.kind = scope; delete rule.subject; } else { rule.kind = 'suite'; rule.subject = scope; }
    }
    state.draft.overrides ??= []; if (previous) state.draft.overrides[editor.index] = rule; else state.draft.overrides.push(rule);
    closeDrawer(); renderContent(); modified();
  }
  async function save() {
    if (state.busy || !dirty()) return;
    const submitted = clone(state.draft), errors = validateDraft(submitted, state.base.payload);
    if (errors.length) { setMessage('规则尚未保存，请核对提示。', true); showDrawer('请先完善规则', `<div class="error-copy">${errors.map(error => '<p>' + escape(error) + '</p>').join('')}</div>`); return; }
    setBusy(true); setMessage('正在保存规则…');
    try { const result = await saveCatalog(client, state.owner, state.base, submitted); state.base = clone(result); state.draft = clone(result.payload); state.known = entities(); setMessage('规则已保存，下一次例行读取生效。'); renderContent(); }
    catch (error) { setMessage(error.message === 'CONFLICT' ? '版本冲突，修改已保留。请核对最新规则后再保存。' : error.message === 'READBACK_FAILED' ? '保存结果尚未核实，修改已保留。请重新读取核对。' : '保存未成功，修改已保留，请稍后重试。', true); }
    finally { setBusy(false); }
  }
  async function load() {
    if (state.busy) return;
    setBusy(true); setMessage('正在读取规则…');
    try {
      const result = await client.auth.getSession(), session = result.data?.session;
      if (!session) { state.owner = null; state.base = null; state.draft = null; state.message = '登录后查看本人规则。'; render(); return; }
      if (state.owner !== session.user.id) { state.base = null; state.draft = null; state.selected = null; }
      state.owner = session.user.id;
      const read = await client.from('wayon_rule_catalog').select('revision,payload').eq('owner_id', state.owner).maybeSingle();
      if (read.error || !read.data) throw Error('READ_FAILED');
      state.base = clone(read.data); state.draft = clone(read.data.payload); state.known = entities(); state.error = false; state.message = '已读取最新规则。'; render();
    } catch { setMessage('规则未能读取，当前修改已保留，请稍后重试。', true); if (!state.draft) render(); }
    finally { setBusy(false); }
  }
  async function refreshIfClean() {
    if (state.busy) return { refreshed: false, reason: 'busy' };
    state.expanded.clear();
    if (state.draft) renderContent();
    try {
      const auth = await client.auth.getSession();
      if (auth.error) throw Error('AUTH_UNKNOWN');
      const owner = auth.data?.session?.user?.id || null;
      if (owner !== state.owner) {
        closeDrawer(); state.owner = null; state.base = null; state.draft = null; state.known = []; state.selected = null;
        render(); await load(); return { refreshed: !!state.draft, reason: 'account-changed' };
      }
    } catch { setMessage('登录状态未能核实，当前修改已保留，请稍后重试。', true); return { refreshed: false, reason: 'auth-unknown' }; }
    if (dirty() || dialog?.open) return { refreshed: false, reason: 'draft-preserved' };
    await load(); return { refreshed: !!state.draft };
  }
  root.addEventListener('click', event => {
    const button = event.target.closest('[data-action]'); if (!button || !root.contains(button) || state.busy) return;
    const action = button.dataset.action;
    if (action === 'view') { state.expanded.clear(); state.view = button.dataset.view; state.selected = null; state.query = ''; state.system = 'all'; state.status = 'all'; render(); }
    else if (action === 'open-person') { state.expanded.clear(); state.selected = button.dataset.person; render(); }
    else if (action === 'back') { state.expanded.clear(); state.selected = null; render(); }
    else if (action === 'collapse') { const key = button.dataset.key; state.expanded.has(key) ? state.expanded.delete(key) : state.expanded.add(key); const collapsed = !state.expanded.has(key), section = button.closest('.task-section'); section.classList.toggle('collapsed', collapsed); section.querySelector('.section-body').hidden = collapsed; button.setAttribute('aria-expanded', String(!collapsed)); button.querySelector('.chevron').textContent = collapsed ? '›' : '⌄'; }
    else if (action === 'toggle-status') { const entity = selectedEntity(button.dataset.person); setEntityStatus(state.draft, entity, entityStatus(entity, state.draft) !== 'on'); renderContent(); modified(); [...root.querySelectorAll('[data-action="toggle-status"]')].find(element => element.dataset.person === entity.key)?.focus({ preventScroll: true }); }
    else if (action === 'add-task' || action === 'edit-task') openEditor(button.dataset.person, button.dataset.scope, button.dataset.task);
    else if (action === 'weekday' && state.editor?.type === 'task') { const values = new Set(state.editor.days), day = button.dataset.day; values.has(day) ? values.delete(day) : values.add(day); state.editor.days = WEEKDAYS.filter(day => values.has(day)); button.classList.toggle('active', values.has(day)); button.setAttribute('aria-pressed', String(values.has(day))); }
    else if (action === 'delete-task') deleteTask();
    else if (action === 'close-drawer') closeDrawer();
    else if (action === 'diff') diff();
    else if (action === 'discard') { state.draft = clone(state.base.payload); state.error = false; state.message = '已恢复到上次读取或保存的规则。'; closeDrawer(); renderContent(); footer(); }
    else if (action === 'save') void save();
    else if (action === 'reload') { if (dirty()) showDrawer('重新读取规则', '<p>重新读取会放弃本页未保存的修改。可以先查看变更，或继续保留当前修改。</p>', '<button type="button" class="button" data-action="close-drawer">保留修改</button><button type="button" class="button primary" data-action="confirm-reload">放弃并重新读取</button>'); else void load(); }
    else if (action === 'confirm-reload') { closeDrawer(); void load(); }
    else if (action === 'specials') listOverrides();
    else if (action === 'edit-override') editOverride(Number(button.dataset.index));
    else if (action === 'new-override') editOverride(undefined);
    else if (action === 'delete-override' && state.editor?.type === 'override') { state.draft.overrides.splice(state.editor.index, 1); closeDrawer(); renderContent(); modified(); }
    else if (action === 'close') onClose?.();
  });
  root.addEventListener('input', event => {
    if (state.busy) return;
    if (event.target.dataset.field === 'search') { state.query = event.target.value; renderContent(); }
    else if (event.target.name === 'title') inspection();
  });
  root.addEventListener('change', event => {
    if (state.busy) return;
    const field = event.target.dataset.field;
    if (field === 'system') { state.system = event.target.value; renderContent(); }
    else if (field === 'status') { state.status = event.target.value; state.expanded.clear(); renderContent(); }
    else if (field === 'task-repeat') q('[data-weekdays]').hidden = event.target.value !== '每周固定几天';
    else if (field === 'task-subject') q('[data-custom-subject]').hidden = event.target.value !== 'custom';
    else if (field === 'task-handler') inspection();
  });
  root.addEventListener('submit', async event => {
    if (event.target.id === 'rules-task-form') submitTask(event);
    else if (event.target.id === 'rules-override-form') submitOverride(event);
    else if (event.target.classList.contains('login-form')) {
      event.preventDefault(); if (state.busy) return;
      const email = event.target.elements.email.value, password = event.target.elements.password.value; event.target.elements.password.value = '';
      setBusy(true); try { const result = await client.auth.signInWithPassword({ email, password }); if (result.error) setMessage('登录未成功，请核对账号。', true); else { state.busy = false; await load(); } } catch { setMessage('登录未成功，请稍后重试。', true); } finally { setBusy(false); }
    }
  });
  document.defaultView?.addEventListener('beforeunload', event => { if (dirty()) { event.preventDefault(); event.returnValue = ''; } });
  render(); await load();
  return { getDraft: () => clone(state.draft), getBase: () => clone(state.base), reload: () => load(), refreshIfClean };
}
