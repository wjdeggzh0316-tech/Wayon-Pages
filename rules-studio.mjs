import { clone, clean, todayShanghai, inspectTask, taskLines, manualTask, setManual, validateDraft, publicData } from './rules-model.mjs?v=20261111-studio4';
import { canonical, saveCatalog } from './rules-store.mjs?v=20261111-studio4';
import { buildRuleEntities, entityStatus, setEntityStatus, ruleEntityDisplayName } from './rules-entities.mjs?v=20261111-studio4';
import { STYLE } from './rules-studio-style.mjs?v=20261111-studio4';
import { parseTaskUnits, replaceTaskUnit, removeTaskUnit } from './rule-task-text.mjs?v=20261111-studio4';

const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const same = (a, b) => canonical(a) === canonical(b);
const WEEKDAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
const CLOSE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6"/></svg>';
const EDIT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m16 3 5 5-12 12-6 1 1-6Z"/><path d="m14 5 5 5"/></svg>';
const FILTERS = [['all', '全部'], ['on', '打卡中'], ['off', '打卡暂停']];
const VIEWS = [['person', '按学员'], ['attendance', '全部随课'], ['checkin', '全部打卡']];
const ONE_TASK = '一项任务只填一条；多项任务请分别添加。';

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
    for (const window of rule.lesson_windows || []) {
      const subject = window.weekdays.map(day => WEEKDAYS[day]).join('、') + ' ' + window.start + '–' + window.end + '（' + window.effective_from + '起；周末汇总）';
      window.tasks.forEach((task, index) => {
        add(task.text, 'window', subject, index);
        result.at(-1).window = window;
      });
    }
  }
  return result;
}
export function checkinItems(payload, entity) {
  return (payload.frequency_rows || []).filter(row => entity.frequencyIds.includes(row.id)).flatMap(row =>
    parseTaskUnits(row['任务内容']).map((unit, index) => ({ ref: JSON.stringify([row.id, index]), text: unit.text, unit, rule: row, rowId: row.id, index })));
}
function authored(rule, scope) {
  return scope === 'checkin' ? taskLines(rule['任务内容']) : [rule.vocab_task, ...(rule.attendance_tasks || []), ...Object.values(rule.subject_rules || {}).flat(), ...(rule.lesson_windows || []).flatMap(window => window.tasks.map(task => task.text))].filter(Boolean);
}
export function updateManual(rule, scope, before, after, manual) {
  // An old line-level flag may apply to more than one logical parent. Preserve
  // every other task's explicit teacher treatment before removing that flag.
  let targetSkipped = false;
  const preserve = authored(rule, scope).filter(text => {
    if (!targetSkipped && text === after) { targetSkipped = true; return false; }
    return manualTask(rule, text);
  });
  if (before && before !== after && !authored(rule, scope).includes(before) && manualTask(rule, before)) setManual(rule, before, false);
  if (after && manualTask(rule, after) !== manual) setManual(rule, after, manual);
  for (const text of preserve) if (!manualTask(rule, text)) setManual(rule, text, true);
}
const uuid = () => globalThis.crypto?.randomUUID?.() || 'rule-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
const dateLabel = value => value ? String(value).slice(0, 10).replace(/^\d{4}-(\d{2})-(\d{2})$/, (_, month, day) => Number(month) + '月' + Number(day) + '日') : '';
const completed = row => row['本次已完成'] === true || row['本次已完成'] === '__YES__';
function frequency(row) {
  return row['重复'] === '每周固定几天' ? '每周' + (row['周几'] || []).map(day => String(day).replace(/^周/, '')).join('、') : row['重复'] === '随课/每天' ? '有课日' : row['重复'] || '未设频率';
}
function rowSummary(row) {
  return [frequency(row), row['形式'] || '', row['date:下次日期:start'] ? dateLabel(row['date:下次日期:start']) + '起' : '', row['date:重复截止:start'] ? '至' + dateLabel(row['date:重复截止:start']) : '', completed(row) ? '本次已人工确认完成' : ''].filter(Boolean).join(' · ');
}

// Plain-language change list. It only reads the two payloads.
function multisetChanges(before, after) {
  const left = [...before], right = [];
  for (const text of after) { const at = left.indexOf(text); if (at >= 0) left.splice(at, 1); else right.push(text); }
  const lines = [];
  const pairs = left.length === right.length ? left.length : 0;
  for (let i = 0; i < pairs; i++) lines.push('「' + left[i] + '」改成「' + right[i] + '」');
  if (!pairs) { for (const text of left) lines.push('删除「' + text + '」'); for (const text of right) lines.push('新增「' + text + '」'); }
  return lines;
}
function manualChanges(beforeRule, afterRule, beforeTexts, afterTexts) {
  return afterTexts.filter(text => beforeTexts.includes(text) && manualTask(beforeRule, text) !== manualTask(afterRule, text))
    .map(text => '「' + text + '」改为' + (manualTask(afterRule, text) ? '交老师处理' : '自动识别'));
}
export function describeChanges(before = {}, after = {}) {
  const groups = new Map();
  const push = (name, line) => { if (!groups.has(name)) groups.set(name, []); groups.get(name).push(line); };
  for (const key of new Set([...Object.keys(before.attendance_rules || {}), ...Object.keys(after.attendance_rules || {})])) {
    const old = before.attendance_rules?.[key], next = after.attendance_rules?.[key];
    if (same(old, next)) continue;
    const name = ruleEntityDisplayName(next?.name || old?.name || key);
    if (!old) push(name, '新增随课规则');
    if (!next) { push(name, '删除随课规则'); continue; }
    const section = (label, a, b) => { for (const line of multisetChanges(a, b)) push(name, '随课 · ' + label + '：' + line); };
    section('单词', old?.vocab_task ? [old.vocab_task] : [], next.vocab_task ? [next.vocab_task] : []);
    section('每节课', old?.attendance_tasks || [], next.attendance_tasks || []);
    for (const subject of new Set([...Object.keys(old?.subject_rules || {}), ...Object.keys(next.subject_rules || {})])) section(subject + '课', old?.subject_rules?.[subject] || [], next.subject_rules?.[subject] || []);
    section('周中时段', (old?.lesson_windows || []).flatMap(window => window.tasks.map(task => task.text)), (next.lesson_windows || []).flatMap(window => window.tasks.map(task => task.text)));
    for (const line of manualChanges(old || {}, next, authored(old || {}, 'attendance'), authored(next, 'attendance'))) push(name, '随课：' + line);
    const known = ['name', 'system', 'vocab_task', 'attendance_tasks', 'subject_rules', 'lesson_windows', 'manual_tasks'];
    if (old && Object.keys({ ...old, ...next }).some(field => !known.includes(field) && !same(old[field], next[field]))) push(name, '随课：其他设置有改动');
  }
  const oldRows = new Map((before.frequency_rows || []).map(row => [row.id, row])), newRows = new Map((after.frequency_rows || []).map(row => [row.id, row]));
  for (const id of new Set([...oldRows.keys(), ...newRows.keys()])) {
    const old = oldRows.get(id), next = newRows.get(id);
    if (same(old, next)) continue;
    const name = ruleEntityDisplayName(next?.['学员'] || old?.['学员']);
    if (!old) { push(name, '新增打卡任务：' + taskLines(next['任务内容']).map(text => '「' + text + '」').join('、') + '（' + rowSummary(next) + '）'); continue; }
    if (!next) { push(name, '删除打卡安排：' + taskLines(old['任务内容']).map(text => '「' + text + '」').join('、')); continue; }
    for (const line of multisetChanges(taskLines(old['任务内容']), taskLines(next['任务内容']))) push(name, '打卡：' + line);
    for (const line of manualChanges(old, next, taskLines(old['任务内容']), taskLines(next['任务内容']))) push(name, '打卡：' + line);
    const status = row => row['状态'] === '进行中' ? '正在进行' : row['状态'] || '未设';
    if (old['状态'] !== next['状态']) push(name, '打卡：' + status(old) + ' → ' + status(next));
    const fields = [['频率', frequency], ['形式', row => row['形式'] || '未设'], ['开始日期', row => dateLabel(row['date:下次日期:start']) || '未设'], ['结束日期', row => dateLabel(row['date:重复截止:start']) || '未设'], ['单词方式', row => row['单词布置方式'] || '跟随任务内容'], ['阅读方式', row => row['特殊阅读规则'] || '跟随默认'], ['备注', row => row['备注'] || '无']];
    for (const [label, read] of fields) if (read(old) !== read(next)) push(name, '打卡' + label + '：' + read(old) + ' → ' + read(next));
  }
  const oldOverrides = (before.overrides || []).map(canonical), newOverrides = (after.overrides || []).map(canonical);
  if (!same(oldOverrides, newOverrides)) {
    const describe = value => { const rule = JSON.parse(value); return (rule.student || '未填写') + '：' + (rule.subject || (rule.kind === 'vocab' ? '单词' : '自动任务')) + (rule.action === 'pause' ? '暂停' : '交老师处理') + '，' + (rule.start || '立即') + ' 至 ' + (rule.end || '另行恢复'); };
    for (const value of oldOverrides.filter(value => !newOverrides.includes(value))) push('特殊安排', '去掉 ' + describe(value));
    for (const value of newOverrides.filter(value => !oldOverrides.includes(value))) push('特殊安排', '设置 ' + describe(value));
  }
  return [...groups].map(([name, lines]) => ({ name, lines }));
}

// ---- Published plan: read-only view of what the Python compiler already produced.
const planKey = value => ruleEntityDisplayName(String(value ?? '')).replace(/[【】「」\[\]\s]/g, '').toLocaleLowerCase();
export function addDays(day, count) {
  const date = new Date(day + 'T12:00:00Z'); date.setUTCDate(date.getUTCDate() + count);
  return date.toISOString().slice(0, 10);
}
export const ASSIGN_LABELS = { sent: '已布置', waiting: '等上一批完成', not_sent: '还没发', decision: '需决定', check: '需核对' };
function planNames(entity) {
  const names = new Set();
  for (const value of [entity.name, ...(entity.rawLabels || [])]) {
    names.add(planKey(value));
    for (const part of String(ruleEntityDisplayName(value)).split(/\s*(?:[&＆/／、]|\band\b)\s*/i)) if (part.trim()) names.add(planKey(part));
  }
  names.delete('');
  return names;
}
function labelMatches(label, names) {
  const key = planKey(label);
  if (names.has(key)) return true;
  // "George吴洋亿SAT一对一" belongs to "George". Only a Latin name may carry such a tail, and the
  // tail must not continue the name (Leonard is not Leo); Chinese names must match exactly (李培 is not 李培生).
  return [...names].some(name => /^[a-z][a-z0-9]+$/.test(name) && key.startsWith(name) && !/^[a-z0-9]/.test(key.slice(name.length)));
}
export function planFor(data, entity, day) {
  const names = planNames(entity);
  const known = Array.isArray(data?.[day]);
  const rows = (known ? data[day] : []).filter(row => Array.isArray(row) && labelMatches(row[0], names)).map(row => ({
    label: String(row[0] ?? ''),
    time: String(row[1] ?? ''),
    tasks: (Array.isArray(row[3]) ? row[3] : []).map(task => Array.isArray(task) ? String(task[0] ?? '') : String(task ?? '')).filter(Boolean),
  }));
  const states = data?._assign_state?.[day];
  const assign = states && typeof states === 'object'
    ? Object.entries(states).filter(([name]) => labelMatches(name, names)).flatMap(([name, lines]) => (Array.isArray(lines) ? lines : []).map(([text, state]) => ({ name, text: String(text), state: String(state) })))
    : null;
  return { known, rows, assign };
}

export async function mountRules({ document, client, container, onClose }) {
  if (!document.getElementById('wayon-rules-studio-style')) {
    const style = document.createElement('style'); style.id = 'wayon-rules-studio-style'; style.textContent = STYLE;
    document.head.append(style);
  }
  const host = container || document.getElementById('rules') || document.body;
  const root = document.createElement('div'); root.className = 'rules-studio app'; host.replaceChildren(root);
  const q = selector => root.querySelector(selector);
  const state = { owner: null, base: null, draft: null, selected: null, query: '', filter: 'all', busy: false, message: '正在读取规则…', error: false, editor: null, known: [], pending: null, settings: new Set(), rowErrors: new Map(), showDetail: false, view: 'person', plan: { status: 'idle', data: null, modified: null, rebuilding: false } };
  let dialog, toastTimer, pointerActive = false, deferred = null;
  const dirty = () => !!state.base && !!state.draft && !same(state.base.payload, state.draft);
  const entities = () => buildRuleEntities(state.draft || {});
  const selectedEntity = key => entities().find(entity => entity.key === key) || state.known.find(entity => entity.key === key);
  const items = (entity, scope) => scope === 'attendance' ? attendanceItems(state.draft, entity) : checkinItems(state.draft, entity);
  const changeCount = () => dirty() ? describeChanges(state.base.payload, state.draft).reduce((sum, group) => sum + group.lines.length, 0) || 1 : 0;

  // A blur commit must not rebuild the row the pointer is pressing on, or the click is lost.
  root.addEventListener('pointerdown', () => { pointerActive = true; }, true);
  document.addEventListener('pointerup', () => { pointerActive = false; if (deferred) { const run = deferred; deferred = null; setTimeout(run, 0); } }, true);
  const later = fn => { if (pointerActive) deferred = fn; else fn(); };

  function setMessage(text, error = false) { state.message = text; state.error = error; footer(); }
  function footer() {
    const status = q('.save-state');
    if (!status) return;
    const count = changeCount();
    status.textContent = state.error || !count ? (state.message || '已读取最新规则') : count + ' 处修改未保存';
    status.classList.toggle('dirty', !!count); status.classList.toggle('error', state.error);
    for (const action of ['save', 'discard', 'diff']) { const button = q(`.footer [data-action="${action}"]`); if (button) button.disabled = state.busy || !count; }
  }
  function modified() { state.error = false; state.message = ''; footer(); renderRoster(); }
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
    return `<button type="button" class="status-switch ${enabled ? '' : 'is-off'} ${status === 'mixed' ? 'is-mixed' : ''}" role="switch" aria-checked="${enabled}" data-action="toggle-status" data-person="${escape(entity.key)}" aria-label="${escape(entity.name)}的打卡任务总开关" ${status === 'empty' ? 'disabled title="添加打卡任务后可切换状态"' : status === 'mixed' ? 'title="现有安排中有进行中和暂停；点击统一开启"' : ''}><span class="switch-track" aria-hidden="true"><span class="switch-knob"></span></span><span>${status === 'empty' ? '未设打卡' : status === 'mixed' ? '部分暂停' : enabled ? '正在进行' : '暂停'}</span></button>`;
  }

  // ---- Left: every learner/class, never paged or folded.
  function visibleEntities() {
    const query = state.query.trim().toLocaleLowerCase();
    return entities().filter(entity => {
      const status = entityStatus(entity, state.draft);
      if (state.filter === 'on' && !['on', 'mixed'].includes(status)) return false;
      if (state.filter === 'off' && !['off', 'mixed'].includes(status)) return false;
      if (!query) return true;
      const text = [entity.name, ...entity.rawLabels, ...items(entity, 'attendance').map(item => item.text), ...items(entity, 'checkin').map(item => item.text)].join(' ');
      return text.toLocaleLowerCase().includes(query);
    });
  }
  function renderRoster() {
    const list = q('.roster-list'); if (!list || !state.draft) return;
    const visible = visibleEntities();
    list.innerHTML = visible.length ? visible.map(entity => {
      const status = entityStatus(entity, state.draft), active = entity.key === state.selected;
      return `<li><button type="button" class="roster-item ${active ? 'active' : ''}" data-action="select" data-person="${escape(entity.key)}" aria-current="${active}"><span class="roster-name">${escape(entity.name)}</span><span class="roster-meta">${status === 'off' || status === 'mixed' ? `<span class="roster-status">${status === 'off' ? '打卡暂停' : '部分暂停'}</span>` : ''}<span class="system-pill">${escape(entity.systemLabel)}</span></span></button></li>`;
    }).join('') : '<li class="empty-state">没有找到符合条件的学员或班级</li>';
    const count = q('.roster-count'); if (count) count.textContent = visible.length + ' / ' + entities().length;
  }

  // ---- Right: the selected learner's complete rules, expanded and editable in place.
  // One control shows both the recognition result and the teacher override.
  function handler(text, system, manual, disabled = false) {
    if (disabled) return '<span class="handler-fixed">老师安排</span>';
    const found = inspectTask(text, system, false);
    const label = !String(text).trim() ? '自动识别' : found.mode === 'auto' ? '自动布置' : found.mode === 'manual' ? '老师处理（按内容）' : found.mode === 'invalid' ? '需填写' : '未识别';
    const state = manual ? 'manual' : String(text).trim() ? found.mode : 'empty';
    return `<select class="handler-select state-${state}" data-field="task-handler" aria-label="处理方式" title="识别结果；可改为交老师处理"><option value="system" ${manual ? '' : 'selected'}>${label}</option><option value="teacher" ${manual ? 'selected' : ''}>交老师处理</option></select>`;
  }
  function inputRows(text) { return Math.max(1, String(text).split('\n').length); }
  function taskRow(entity, scope, item) {
    const window = item.kind === 'window';
    const pending = state.rowErrors.get(item.ref);
    const text = pending?.text ?? item.text;
    const manual = manualTask(item.rule, item.text);
    const inspected = window ? { mode: 'manual', label: '老师安排' } : inspectTask(text, item.rule.system || entity.system, manual);
    const problem = ['unknown', 'invalid'].includes(inspected.mode);
    const hint = pending?.message || (window ? (item.window.tasks[item.index].weekend ? '老师安排 · 周末完成并汇总' : '老师安排 · 按当天课程') : problem ? inspected.label : '');
    return `<div class="task-row ${pending ? 'has-error' : ''}" data-task="${escape(item.ref)}" data-scope="${scope}" data-person="${escape(entity.key)}">
      <div class="task-main"><textarea class="task-input" data-field="task-text" rows="${inputRows(text)}" aria-label="任务内容" spellcheck="false">${escape(text)}</textarea>${hint ? `<div class="task-hint ${pending || problem ? 'warn' : ''}">${escape(hint)}</div>` : ''}</div>
      <div class="task-actions">${item.kind === 'vocab' ? '<span class="task-kind">单词</span>' : ''}${handler(text, item.rule.system || entity.system, manual, window)}<button type="button" class="icon-btn delete-btn" data-action="delete-task" aria-label="删除${escape(item.text)}" title="删除这项任务">${CLOSE}</button></div></div>`;
  }
  function pendingRow(entity, scope, subject) {
    const pending = state.pending;
    if (!pending || pending.choosingSubject || pending.entityKey !== entity.key || pending.scope !== scope || (scope === 'attendance' && pending.subject !== subject)) return '';
    const inspected = pending.text.trim() ? inspectTask(pending.text, entity.system, pending.manual) : null;
    const hint = pending.message || (inspected && ['unknown', 'invalid'].includes(inspected.mode) ? inspected.label : '');
    return `<div class="task-row is-new ${pending.message ? 'has-error' : ''}" data-task="new" data-scope="${scope}" data-person="${escape(entity.key)}"><div class="task-main"><textarea class="task-input" data-field="task-text" rows="${inputRows(pending.text)}" aria-label="新任务内容" placeholder="写清具体任务与数量，回车确认，Esc 取消" spellcheck="false">${escape(pending.text)}</textarea>${hint ? `<div class="task-hint warn">${escape(hint)}</div>` : ''}</div><div class="task-actions">${handler(pending.text, entity.system, pending.manual)}<button type="button" class="icon-btn delete-btn" data-action="cancel-new" aria-label="取消新任务" title="取消">${CLOSE}</button></div></div>`;
  }
  function attendanceBlock(entity, head = '<div><h3>随课任务</h3><p class="block-sub">有课当天，课后布置</p></div>') {
    const list = items(entity, 'attendance');
    const pendingHere = state.pending?.entityKey === entity.key && state.pending.scope === 'attendance' && !state.pending.choosingSubject;
    const subjects = [...new Set(['通用', ...list.map(item => item.subject), ...(pendingHere ? [state.pending.subject] : [])])];
    const groups = subjects.map(subject => {
      const rows = list.filter(item => item.subject === subject).map(item => taskRow(entity, 'attendance', item)).join('') + pendingRow(entity, 'attendance', subject);
      if (!rows && subject !== '通用') return '';
      const isWindow = list.some(item => item.subject === subject && item.kind === 'window');
      return `<div class="task-group" data-subject="${escape(subject)}"><h4 class="group-caption">${subject === '通用' ? '每节课' : escape(subject) + (isWindow ? '' : '课')}</h4>${rows || '<p class="empty-line">还没有随课任务</p>'}${subject !== '通用' && !isWindow ? `<button type="button" class="add-inline" data-action="add-task" data-scope="attendance" data-subject="${escape(subject)}">＋ 添加${escape(subject)}课任务</button>` : ''}</div>`;
    }).join('');
    const choosing = state.pending?.entityKey === entity.key && state.pending.choosingSubject;
    return `<section class="rule-block" data-scope="attendance" data-person="${escape(entity.key)}"><header class="block-head">${head}</header>${groups}<div class="block-actions"><button type="button" class="add-btn" data-action="add-task" data-scope="attendance" data-subject="通用">＋ 添加任务</button>${choosing ? `<span class="subject-picker"><input data-field="new-subject" aria-label="科目名称" list="rules-subjects" placeholder="科目，如 听力"><datalist id="rules-subjects">${['听力', '阅读', '写作', '口语', '语法'].map(subject => `<option value="${subject}">`).join('')}</datalist><button type="button" class="button small primary" data-action="confirm-subject">确定</button><button type="button" class="button small ghost" data-action="cancel-subject">取消</button></span>` : '<button type="button" class="add-btn" data-action="choose-subject">＋ 按科目加任务</button>'}</div></section>`;
  }
  const options = (values, current) => {
    const rows = values.map(value => Array.isArray(value) ? value : [value, value]);
    if (current && !rows.some(([value]) => value === current)) rows.push([current, current]);
    return rows.map(([value, text]) => `<option value="${escape(value)}" ${current === value ? 'selected' : ''}>${escape(text)}</option>`).join('');
  };
  function rowSettings(row) {
    const id = escape(row.id), days = row['周几'] || [];
    return `<div class="row-settings" data-row="${id}">
      <label class="field"><span>频率</span><select data-field="row-repeat" data-row="${id}">${options([['每天', '每天'], ['每周固定几天', '每周固定几天'], ['随课/每天', '有课日（历史规则）']], row['重复'] || '每天')}</select></label>
      <div class="field wide" ${row['重复'] === '每周固定几天' ? '' : 'hidden'}><span>执行日</span><div class="weekday-picker" role="group" aria-label="每周执行日">${WEEKDAYS.map(day => `<button type="button" class="${days.includes(day) ? 'active' : ''}" data-action="weekday" data-row="${id}" data-day="${day}" aria-pressed="${days.includes(day)}">${day.slice(1)}</button>`).join('')}</div></div>
      <label class="field"><span>开始日期</span><input type="date" data-field="row-start" data-row="${id}" value="${escape(String(row['date:下次日期:start'] || '').slice(0, 10))}"></label>
      <label class="field"><span>结束日期（含当天）</span><input type="date" data-field="row-end" data-row="${id}" value="${escape(String(row['date:重复截止:start'] || '').slice(0, 10))}"></label>
      <label class="field"><span>形式</span><select data-field="row-form" data-row="${id}">${options(['线上', '自习'], row['形式'] || '线上')}</select></label>
      <label class="field"><span>单词方式</span><select data-field="row-vocab" data-row="${id}">${options(['跟随任务内容', '仅听力', '仅阅读', '听读交替', '两科分别布置'], row['单词布置方式'] || '跟随任务内容')}</select></label>
      <label class="field"><span>阅读方式</span><select data-field="row-reading" data-row="${id}">${options(['跟随默认', '完整原卷', '仅同卷P1/P2', '跨卷P1/P2三篇', '老师安排'], row['特殊阅读规则'] || '跟随默认')}</select></label>
      <label class="field wide"><span>备注</span><textarea data-field="row-note" data-row="${id}" rows="2">${escape(row['备注'] || '')}</textarea></label>
      ${completed(row) ? '<p class="small-note wide">本次已人工确认完成；此记录保留。</p>' : ''}</div>`;
  }
  function checkinBlock(entity, head = '<div><h3>打卡任务</h3><p class="block-sub">按下面的频率布置</p></div>') {
    const list = items(entity, 'checkin');
    const rows = (state.draft.frequency_rows || []).filter(row => entity.frequencyIds.includes(row.id));
    const mixed = entityStatus(entity, state.draft) === 'mixed';
    const groups = rows.map(row => {
      const open = state.settings.has(String(row.id));
      const units = list.filter(item => item.rowId === row.id).map(item => taskRow(entity, 'checkin', item)).join('');
      const own = mixed ? ` · <span class="${row['状态'] === '进行中' ? 'on' : 'off'}">${row['状态'] === '进行中' ? '本安排进行中' : '本安排暂停'}</span>` : '';
      return `<div class="freq-group" data-row="${escape(row.id)}"><div class="freq-head"><span class="freq-summary">${escape(rowSummary(row))}${own}</span><button type="button" class="link-btn" data-action="toggle-settings" data-row="${escape(row.id)}" aria-expanded="${open}">${open ? '收起设置' : '频率与更多设置'}</button></div>${open ? rowSettings(row) : ''}${units}</div>`;
    }).join('');
    const pendingHere = state.pending?.scope === 'checkin' && state.pending.entityKey === entity.key;
    return `<section class="rule-block" data-scope="checkin" data-person="${escape(entity.key)}"><header class="block-head">${head}${statusSwitch(entity)}</header>${groups || (pendingHere ? '' : '<p class="empty-line">还没有打卡任务</p>')}${pendingRow(entity, 'checkin')}<div class="block-actions"><button type="button" class="add-btn" data-action="add-task" data-scope="checkin">＋ 添加打卡任务</button></div></section>`;
  }
  function relatedOverrides(entity) {
    return (state.draft.overrides || []).map((rule, index) => ({ rule, index })).filter(({ rule }) => (!rule.system || rule.system === entity.system) && entity.names.some(name => clean(name) === clean(rule.student)));
  }
  function specialsBlock(entity) {
    const list = relatedOverrides(entity);
    return `<section class="rule-block specials" data-scope="specials"><header class="block-head"><div><h3>特殊安排${list.length ? '（' + list.length + '）' : ''}</h3><p class="block-sub">某段时间暂停或改交老师处理</p></div></header>${list.map(({ rule, index }) => `<div class="special-note"><span>${escape((rule.subject || (rule.kind === 'vocab' ? '单词' : '自动任务')) + ' · ' + (rule.action === 'pause' ? '暂停' : '交老师处理') + ' · ' + (rule.start || '立即') + ' 至 ' + (rule.end || '另行恢复'))}${rule.reason ? '<br>' + escape(rule.reason) : ''}</span><button type="button" class="icon-btn" data-action="edit-override" data-index="${index}" aria-label="编辑特殊安排">${EDIT}</button></div>`).join('')}<div class="block-actions"><button type="button" class="add-btn" data-action="new-override" data-person="${escape(entity.key)}">＋ 添加特殊安排</button></div></section>`;
  }
  const dayLabel = day => { const date = new Date(day + 'T12:00:00Z'); return (date.getUTCMonth() + 1) + '月' + date.getUTCDate() + '日 ' + ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getUTCDay()]; };
  const timeLabel = value => { const date = new Date(value); return Number.isFinite(date.valueOf()) ? date.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) : ''; };
  function planDay(entity, day, title) {
    const { known, rows, assign } = planFor(state.plan.data, entity, day);
    const visits = rows.map(row => `<div class="plan-visit"><div class="plan-when">${escape(row.time === '自习' ? '来校自习' : row.time + ' 有课')}${planKey(row.label) !== planKey(entity.name) ? ` <span class="plan-source">（${escape(ruleEntityDisplayName(row.label))}）</span>` : ''}</div><ul>${row.tasks.map(task => '<li>' + escape(task) + '</li>').join('') || '<li class="muted">没有列出任务</li>'}</ul></div>`).join('');
    const system = assign === null ? '' : assign.length ? `<div class="plan-visit"><div class="plan-when">系统作业</div><ul>${assign.map(item => `<li><span>${escape(item.text)}</span><span class="assign-state state-${escape(item.state)}">${escape(ASSIGN_LABELS[item.state] || item.state)}</span></li>`).join('')}</ul></div>` : '';
    const empty = !known ? '这天的计划还没生成。' : !rows.length && !system ? (assign === null ? '这天不来校。线上作业当天早班才编排，这里暂时看不到。' : '这天没有安排。') : '';
    return `<div class="plan-day"><h4>${escape(title)} · ${escape(dayLabel(day))}</h4>${visits}${system}${empty ? `<p class="empty-line">${escape(empty)}</p>` : ''}</div>`;
  }
  function planBlock(entity) {
    const plan = state.plan, today = todayShanghai();
    let body;
    if (plan.status === 'loading' && !plan.data) body = '<p class="empty-line">正在读取工作台计划…</p>';
    else if (plan.status === 'error' && !plan.data) body = '<p class="empty-line">工作台计划没读到。<button type="button" class="link-btn" data-action="reload-plan">重试</button></p>';
    else if (!plan.data) body = '';
    else body = `<div class="plan-days">${planDay(entity, today, '今天')}${planDay(entity, addDays(today, 1), '明天')}</div>`;
    const notes = [];
    if (plan.rebuilding) notes.push('<p class="plan-note">规则已保存，正在按新规则重编；完成后这里自动更新。</p>');
    else if (dirty()) notes.push('<p class="plan-note">下面是修改前的计划。保存规则后会重编今天和明天的计划。</p>');
    const stamp = plan.modified ? '工作台数据 ' + timeLabel(plan.modified) + ' 更新' : '';
    return `<section class="rule-block plan-block" data-scope="plan"><header class="block-head"><div><h3>今天和明天的计划</h3><p class="block-sub">按规则排出的结果，计划不等于已布置${stamp ? ' · ' + escape(stamp) : ''}</p></div><button type="button" class="link-btn" data-action="reload-plan" ${plan.status === 'loading' ? 'disabled' : ''}>${plan.status === 'loading' ? '读取中…' : '重新读取'}</button></header>${notes.join('')}${body}</section>`;
  }
  async function loadPlan() {
    if (state.plan.status === 'loading') return;
    state.plan.status = 'loading'; renderDetail();
    try {
      const response = await fetch('./workspace-source.html?rules-plan=' + Date.now(), { cache: 'no-store', credentials: 'omit' });
      if (!response.ok) throw Error('PLAN_UNAVAILABLE');
      const text = await response.text();
      state.plan.data = publicData(text);
      state.plan.modified = response.headers.get('last-modified') || null;
      state.plan.status = 'ready';
    } catch { state.plan.status = 'error'; }
    renderDetail();
  }
  function focusKey(element) {
    if (!element || !root.contains(element) || !element.closest('.detail-pane')) return null;
    const row = element.closest('[data-task]');
    return { task: row?.dataset.task, person: row?.dataset.person, field: element.dataset.field, action: element.dataset.action, rowId: element.dataset.row, start: element.selectionStart, end: element.selectionEnd };
  }
  function restoreFocus(key) {
    if (!key) return;
    let element = null;
    if (key.task) element = [...root.querySelectorAll('.detail-pane [data-task]')].find(row => row.dataset.task === key.task && row.dataset.person === key.person)?.querySelector(key.field ? `[data-field="${key.field}"]` : `[data-action="${key.action}"]`);
    else if (key.field) element = [...root.querySelectorAll(`.detail-pane [data-field="${key.field}"]`)].find(item => item.dataset.row === key.rowId);
    else if (key.action) element = [...root.querySelectorAll(`.detail-pane [data-action="${key.action}"]`)].find(item => item.dataset.row === key.rowId);
    if (!element) return;
    element.focus({ preventScroll: true });
    if (typeof key.start === 'number' && element.setSelectionRange) try { element.setSelectionRange(key.start, key.end); } catch {}
  }
  // Cross-learner views: every learner with tasks of one kind, expanded and editable in place.
  function hasTasks(entity, scope) {
    if (state.pending?.entityKey === entity.key && state.pending.scope === scope) return true;
    return scope === 'attendance' ? items(entity, 'attendance').length > 0 : entity.frequencyIds.length > 0;
  }
  function overviewHtml(scope) {
    const visible = visibleEntities(), shown = visible.filter(entity => hasTasks(entity, scope));
    const head = entity => `<div class="ov-name"><button type="button" class="ov-open" data-action="open-person" data-person="${escape(entity.key)}" title="查看${escape(entity.name)}的全部规则">${escape(entity.name)} ›</button><span class="system-pill">${escape(entity.systemLabel)}</span></div>`;
    const cards = shown.map(entity => `<article class="ov-card ${entity.key === state.selected ? 'is-current' : ''}" data-entity="${escape(entity.key)}">${scope === 'attendance' ? attendanceBlock(entity, head(entity)) : checkinBlock(entity, head(entity))}</article>`).join('');
    const hidden = visible.length - shown.length;
    const kind = scope === 'attendance' ? '随课' : '打卡';
    return `<div class="detail-head"><button type="button" class="back-btn" data-action="back">‹ 名单</button><h2 class="detail-title">全部${kind}任务<span class="system-pill">${shown.length} 个</span></h2></div>${cards || `<div class="empty-state">没有符合条件的${kind}任务</div>`}${hidden > 0 ? `<p class="ov-hidden">另有 ${hidden} 个学员或班级没有${kind}任务，未列出；在「按学员」里可以为他们添加。</p>` : ''}`;
  }
  function renderDetail() {
    const pane = q('.detail-pane'); if (!pane || !state.draft) return;
    const scroll = pane.scrollTop, focus = focusKey(document.activeElement);
    if (state.view !== 'person') {
      pane.innerHTML = overviewHtml(state.view);
      pane.scrollTop = scroll;
      restoreFocus(focus);
      const fresh = pane.querySelector('[data-task="new"] textarea');
      if (state.pending?.focus && fresh) { fresh.focus(); state.pending.focus = false; }
      return;
    }
    const entity = state.selected && selectedEntity(state.selected);
    if (!entity) { pane.innerHTML = '<div class="empty-state">在左侧选择一个学员或班级</div>'; return; }
    pane.innerHTML = `<div class="detail-head"><button type="button" class="back-btn" data-action="back">‹ 名单</button><h2 class="detail-title">${escape(entity.name)}<span class="system-pill">${escape(entity.systemLabel)}</span></h2></div>${attendanceBlock(entity)}${checkinBlock(entity)}${planBlock(entity)}${specialsBlock(entity)}`;
    pane.scrollTop = scroll;
    restoreFocus(focus);
    const fresh = pane.querySelector('[data-task="new"] textarea');
    if (state.pending?.focus && fresh) { fresh.focus(); state.pending.focus = false; }
  }
  function renderAll() { renderRoster(); renderDetail(); footer(); }
  function selectEntity(key, { focusRoster = false } = {}) {
    if (state.pending && !state.pending.text.trim()) state.pending = null;
    state.selected = key; state.showDetail = true;
    if (state.view !== 'person') {
      const card = [...root.querySelectorAll('.ov-card')].find(item => item.dataset.entity === key);
      if (card) {
        q('.studio-body')?.classList.add('show-detail');
        root.querySelectorAll('.ov-card').forEach(item => item.classList.toggle('is-current', item === card));
        renderRoster(); card.scrollIntoView?.({ block: 'start' });
        if (focusRoster) [...root.querySelectorAll('.roster-item')].find(item => item.dataset.person === key)?.focus();
        return;
      }
      state.view = 'person'; syncViewTabs();  // no card of this kind: show the learner's full rules
    }
    q('.studio-body')?.classList.add('show-detail');
    renderRoster(); renderDetail();
    q('.detail-pane')?.scrollTo?.(0, 0);
    if (focusRoster) [...root.querySelectorAll('.roster-item')].find(item => item.dataset.person === key)?.focus();
  }
  function syncViewTabs() {
    root.querySelectorAll('.view-seg button').forEach(button => { const on = button.dataset.view === state.view; button.classList.toggle('active', on); button.setAttribute('aria-pressed', String(on)); });
  }
  function render() {
    const ready = !!state.owner && !!state.draft;
    if (ready && !(state.selected && selectedEntity(state.selected))) state.selected = visibleEntities()[0]?.key || entities()[0]?.key || null;
    root.innerHTML = `<header class="topbar"><span class="brand">Wayon</span><h1 class="page-title">任务规则</h1>${ready ? `<div class="view-seg" role="group" aria-label="视图">${VIEWS.map(([key, text]) => `<button type="button" class="${state.view === key ? 'active' : ''}" data-action="view" data-view="${key}" aria-pressed="${state.view === key}">${text}</button>`).join('')}</div>` : ''}<div class="header-actions"><button type="button" class="icon-btn" data-action="reload" title="重新读取规则" aria-label="重新读取规则">↻</button>${ready ? '<button type="button" class="icon-btn" data-action="specials" title="全部特殊安排" aria-label="管理全部特殊安排">⋯</button>' : ''}<button type="button" class="icon-btn" data-action="close" aria-label="关闭任务规则">${CLOSE}</button></div></header>
      ${ready ? `<div class="studio-body ${state.showDetail ? 'show-detail' : ''}"><aside class="roster-pane" aria-label="学员和班级"><label class="search"><span class="sr-only">搜索</span><input type="search" data-field="search" aria-label="搜索姓名或任务" placeholder="搜索姓名或任务" value="${escape(state.query)}"></label><div class="filter-chips" role="group" aria-label="筛选">${FILTERS.map(([key, text]) => `<button type="button" class="chip ${state.filter === key ? 'active' : ''}" data-action="filter" data-filter="${key}" aria-pressed="${state.filter === key}">${text}</button>`).join('')}</div><div class="roster-count" aria-live="polite"></div><ul class="roster-list"></ul></aside><main class="detail-pane content" aria-label="规则内容"></main></div>`
        : `<main class="content" aria-label="规则内容">${state.owner ? '<div class="empty-state">规则未能读取。<button type="button" class="button" data-action="reload">重试读取</button></div>' : '<form class="login-form"><h2>登录后查看任务规则</h2><label class="field">邮箱<input name="email" type="email" autocomplete="username" required></label><label class="field">密码<input name="password" type="password" autocomplete="current-password" required></label><button type="submit" class="button primary">登录</button></form>'}</main>`}
      <footer class="footer"><div class="save-state" role="status" aria-live="polite"></div><div class="footer-actions">${ready ? '<button type="button" class="button ghost" data-action="diff">查看变更</button><button type="button" class="button ghost" data-action="discard">放弃</button><button type="button" class="button primary" data-action="save">保存修改</button>' : ''}</div></footer><dialog class="drawer-backdrop" aria-labelledby="rules-drawer-title"></dialog><div class="toast" role="status" aria-live="polite" hidden></div>`;
    dialog = q('dialog');
    dialog.addEventListener('close', () => { state.editor = null; });
    dialog.addEventListener('click', event => { if (event.target === dialog) closeDrawer(); });
    if (ready) renderAll(); else footer();
  }
  function closeDrawer() { if (dialog?.open) dialog.close(); state.editor = null; }
  function showDrawer(title, body, buttons = '<button type="button" class="button primary" data-action="close-drawer">知道了</button>') {
    dialog.innerHTML = `<section class="drawer"><header class="drawer-head"><h2 id="rules-drawer-title">${escape(title)}</h2><button type="button" class="icon-btn" data-action="close-drawer" aria-label="关闭">${CLOSE}</button></header><div class="drawer-body">${body}</div><footer class="drawer-foot">${buttons}</footer></section>`;
    if (!dialog.open) dialog.showModal();
  }
  const field = (label, control, full = false) => `<label class="field ${full ? 'full' : ''}"><span>${label}</span>${control}</label>`;
  function formError(message) { const error = q('.editor-error'); error.textContent = message; error.hidden = false; }

  // ---- In-place edits. Each writes the draft only; nothing is saved here.
  function findItem(row) {
    const entity = selectedEntity(row.dataset.person);
    if (!entity) return {};
    return { entity, item: items(entity, row.dataset.scope).find(item => item.ref === row.dataset.task) };
  }
  function rowError(row, text, message) {
    state.rowErrors.set(row.dataset.task, { text, message });
    row.classList.add('has-error');
    let hint = row.querySelector('.task-hint');
    if (!hint) { hint = document.createElement('div'); row.querySelector('.task-main').append(hint); }
    hint.className = 'task-hint warn'; hint.textContent = message;
    footer();
  }
  function commitText(row, value) {
    if (row.dataset.task === 'new') return commitNew(value);
    const { item } = findItem(row); if (!item) return;
    const text = value.trim();
    if (text === item.text) { if (state.rowErrors.delete(item.ref)) later(renderDetail); return; }
    if (!text) return rowError(row, value, '内容不能为空；要删除这项请点右侧 ×。');
    if (taskLines(text).length !== 1) return rowError(row, value, ONE_TASK);
    const manual = manualTask(item.rule, item.text);
    if (row.dataset.scope === 'attendance') {
      const rule = item.rule;
      if (item.kind === 'vocab') rule.vocab_task = text;
      else if (item.kind === 'common') rule.attendance_tasks[item.index] = text;
      else if (item.kind === 'window') item.window.tasks[item.index].text = text;
      else rule.subject_rules[item.subject][item.index] = text;
    } else {
      const before = parseTaskUnits(item.rule['任务内容']), next = replaceTaskUnit(item.rule['任务内容'], item.index, text), after = parseTaskUnits(next);
      if (after.length !== before.length || after[item.index]?.text !== text) return rowError(row, value, '这样写会和相邻任务连成一项，请换个写法。');
      item.rule['任务内容'] = next;
    }
    updateManual(item.rule, row.dataset.scope, item.text, text, manual);
    state.rowErrors.delete(item.ref);
    modified(); later(renderDetail);
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
  function commitNew(value) {
    const pending = state.pending; if (!pending || pending.choosingSubject) return;
    const entity = selectedEntity(pending.entityKey), text = value.trim();
    pending.text = value;
    if (!text) { state.pending = null; later(renderDetail); return; }
    if (taskLines(text).length !== 1) { pending.message = ONE_TASK; later(renderDetail); footer(); return; }
    let rule;
    if (pending.scope === 'attendance') rule = addAttendance(entity, text, pending.subject);
    else {
      rule = { id: uuid(), 学员: entity.rawLabels.find(label => (state.draft.frequency_rows || []).some(row => row['学员'] === label)) || entity.rawLabels[0], system: entity.system, 任务: entity.name + '-打卡任务', 任务内容: text, 状态: entityStatus(entity, state.draft) === 'off' ? '暂停' : '进行中', _canonical_state: true, 形式: '线上', 重复: '每天', 周几: [] };
      state.draft.frequency_rows ??= [];
      state.draft.frequency_rows.push(rule);
    }
    updateManual(rule, pending.scope, undefined, text, pending.manual);
    state.pending = null;
    modified(); later(renderDetail);
  }
  function startNew(entity, scope, subject = '通用') {
    if (!entity) return;
    state.pending = { entityKey: entity.key, scope, subject, text: '', manual: true, handlerTouched: false, focus: true, message: '' };
    renderDetail();
  }
  function setHandler(row, manual) {
    if (row.dataset.task === 'new') { if (state.pending) { state.pending.manual = manual; state.pending.handlerTouched = true; } return later(renderDetail); }
    const { item } = findItem(row); if (!item || item.kind === 'window') return;
    updateManual(item.rule, row.dataset.scope, item.text, item.text, manual);
    modified(); later(renderDetail);
  }
  function removeAttendance(item) {
    if (item.kind === 'vocab') item.rule.vocab_task = '';
    else if (item.kind === 'common') item.rule.attendance_tasks.splice(item.index, 1);
    else if (item.kind === 'window') item.window.tasks.splice(item.index, 1);
    else item.rule.subject_rules[item.subject].splice(item.index, 1);
  }
  function deleteTask(row) {
    const { item } = findItem(row); if (!item) return;
    if (row.dataset.scope === 'attendance') removeAttendance(item);
    else { const remaining = removeTaskUnit(item.rule['任务内容'], item.index); if (taskLines(remaining).length) item.rule['任务内容'] = remaining; else state.draft.frequency_rows = state.draft.frequency_rows.filter(rule => rule !== item.rule); }
    updateManual(item.rule, row.dataset.scope, item.text, null, false);
    state.rowErrors.clear();
    modified(); renderDetail();
  }
  const rowById = id => (state.draft.frequency_rows || []).find(row => String(row.id) === id);
  function setRowField(element) {
    const row = rowById(element.dataset.row); if (!row) return;
    const value = element.value, kind = element.dataset.field;
    if (kind === 'row-repeat') {
      if (value === row['重复']) return;
      row['重复'] = value;
      if (value !== '每周固定几天') row['周几'] = [];
    } else if (kind === 'row-start' || kind === 'row-end') {
      const key = kind === 'row-start' ? 'date:下次日期:start' : 'date:重复截止:start';
      if (String(row[key] || '').slice(0, 10) === value) return;
      if (value) row[key] = value; else delete row[key];
    } else if (kind === 'row-form') { if (value === row['形式']) return; row['形式'] = value; }
    else if (kind === 'row-vocab') { if (value === (row['单词布置方式'] || '跟随任务内容')) return; if (value === '跟随任务内容') delete row['单词布置方式']; else row['单词布置方式'] = value; }
    else if (kind === 'row-reading') { if (value === (row['特殊阅读规则'] || '跟随默认')) return; if (value === '跟随默认') delete row['特殊阅读规则']; else row['特殊阅读规则'] = value; }
    else if (kind === 'row-note') { if (value === String(row['备注'] || '')) return; row['备注'] = value; }
    modified(); later(renderDetail);
  }

  function diff() {
    const groups = describeChanges(state.base.payload, state.draft);
    showDrawer('查看变更', groups.length ? `<div class="diff-list">${groups.map(group => `<article class="diff-item"><h4>${escape(group.name)}</h4><ul>${group.lines.map(line => '<li>' + escape(line) + '</li>').join('')}</ul></article>`).join('')}</div>` : '<p class="small-note">没有未保存的修改。</p>', '<button type="button" class="button primary" data-action="close-drawer">继续编辑</button>');
  }
  function listOverrides() {
    showDrawer('全部特殊安排', `<div class="diff-list">${(state.draft.overrides || []).map((rule, index) => `<article class="diff-item"><strong>${escape(rule.student)}</strong><p>${escape((rule.subject || rule.kind || '自动任务') + ' · ' + (rule.action === 'pause' ? '暂停' : '交老师处理'))}</p><p class="small-note">${escape((rule.start || '立即') + ' 至 ' + (rule.end || '另行恢复'))}</p><button type="button" class="button" data-action="edit-override" data-index="${index}">编辑安排</button></article>`).join('') || '<p class="small-note">暂无特殊安排。</p>'}</div>`, '<button type="button" class="button" data-action="close-drawer">关闭</button><button type="button" class="button primary" data-action="new-override">添加安排</button>');
  }
  function editOverride(index, student = '') {
    const rule = state.draft.overrides?.[index] || { student, kind: 'automatic', action: 'pause', start: todayShanghai(), end: '', reason: '' };
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
    closeDrawer(); renderDetail(); modified();
  }
  async function save() {
    if (state.busy || !dirty()) return;
    const active = document.activeElement;
    if (active?.dataset?.field === 'task-text' && root.contains(active)) active.blur();
    if (state.rowErrors.size || state.pending?.message) { setMessage('有任务还没改好（标红的行），请先改好或放弃。', true); return; }
    const submitted = clone(state.draft), errors = validateDraft(submitted, state.base.payload);
    if (errors.length) { setMessage('规则尚未保存，请核对提示。', true); showDrawer('请先完善规则', `<div class="error-copy">${errors.map(error => '<p>' + escape(error) + '</p>').join('')}</div>`); return; }
    setBusy(true); setMessage('正在保存规则…');
    try { const result = await saveCatalog(client, state.owner, state.base, submitted); state.base = clone(result); state.draft = clone(result.payload); state.known = entities(); state.pending = null; const refreshing = globalThis.wayonRefreshAPI?.enabled === true;
      setMessage(refreshing ? '规则已保存，正在重编今天和明天的计划。保存不等于已布置：今天已发的作业不变；今天需要补发的，用「指定学员补布置」。'
        : '规则已保存。保存不等于已布置：今天的计划要在工作台点「刷新」后才更新；今天需要补发的，用「指定学员补布置」。');
      state.plan.rebuilding = refreshing; try { globalThis.dispatchEvent?.(new Event('wayon-rules-saved')); } catch {} setBusy(false); renderAll(); toast('规则已保存'); }
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
      state.base = clone(read.data); state.draft = clone(read.data.payload); state.known = entities(); state.pending = null; state.rowErrors.clear(); state.error = false; state.message = '已读取最新规则。'; render();
    } catch { setMessage('规则未能读取，当前修改已保留，请稍后重试。', true); if (!state.draft) render(); }
    finally { setBusy(false); }
  }
  async function refreshIfClean() {
    if (state.busy) return { refreshed: false, reason: 'busy' };
    try {
      const auth = await client.auth.getSession();
      if (auth.error) throw Error('AUTH_UNKNOWN');
      const owner = auth.data?.session?.user?.id || null;
      if (owner !== state.owner) {
        closeDrawer(); state.owner = null; state.base = null; state.draft = null; state.known = []; state.selected = null;
        render(); await load(); return { refreshed: !!state.draft, reason: 'account-changed' };
      }
    } catch { setMessage('登录状态未能核实，当前修改已保留，请稍后重试。', true); return { refreshed: false, reason: 'auth-unknown' }; }
    if (dirty() || dialog?.open || state.pending || state.rowErrors.size) return { refreshed: false, reason: 'draft-preserved' };
    await load(); return { refreshed: !!state.draft };
  }

  root.addEventListener('click', event => {
    const button = event.target.closest('[data-action]'); if (!button || !root.contains(button) || state.busy) return;
    const action = button.dataset.action, row = button.closest('[data-task]');
    const current = () => selectedEntity(button.closest('[data-person]')?.dataset.person || state.pending?.entityKey || state.selected);
    if (action === 'select') selectEntity(button.dataset.person);
    else if (action === 'view') { if (state.pending && !state.pending.text.trim()) state.pending = null; state.view = button.dataset.view; state.showDetail = true; q('.studio-body')?.classList.add('show-detail'); syncViewTabs(); renderDetail(); q('.detail-pane')?.scrollTo?.(0, 0); if (state.view !== 'person') [...root.querySelectorAll('.ov-card')].find(item => item.dataset.entity === state.selected)?.scrollIntoView?.({ block: 'start' }); }
    else if (action === 'open-person') { state.view = 'person'; syncViewTabs(); selectEntity(button.dataset.person); }
    else if (action === 'filter') { state.filter = button.dataset.filter; root.querySelectorAll('.chip').forEach(chip => { const on = chip.dataset.filter === state.filter; chip.classList.toggle('active', on); chip.setAttribute('aria-pressed', String(on)); }); renderRoster(); if (state.view !== 'person') renderDetail(); }
    else if (action === 'back') { state.showDetail = false; q('.studio-body')?.classList.remove('show-detail'); }
    else if (action === 'toggle-status') { const entity = selectedEntity(button.dataset.person); setEntityStatus(state.draft, entity, entityStatus(entity, state.draft) !== 'on'); modified(); renderDetail(); [...root.querySelectorAll('.detail-pane [data-action="toggle-status"]')].find(item => item.dataset.person === entity.key)?.focus({ preventScroll: true }); }
    else if (action === 'add-task') startNew(current(), button.dataset.scope, button.dataset.subject || '通用');
    else if (action === 'choose-subject') { state.pending = { entityKey: current()?.key || state.selected, choosingSubject: true, scope: 'attendance', subject: '', text: '', manual: true }; renderDetail(); q('[data-field="new-subject"]')?.focus(); }
    else if (action === 'cancel-subject' || action === 'cancel-new') { state.pending = null; renderDetail(); footer(); }
    else if (action === 'confirm-subject') {
      const subject = (q('[data-field="new-subject"]')?.value || '').trim().replace(/课$/, '');
      if (!subject || subject === '通用' || ['__proto__', 'prototype', 'constructor'].includes(subject)) { toast('请填写有效的科目名称'); return; }
      startNew(current(), 'attendance', subject);
    }
    else if (action === 'delete-task' && row) deleteTask(row);
    else if (action === 'toggle-settings') { const id = button.dataset.row; state.settings.has(id) ? state.settings.delete(id) : state.settings.add(id); renderDetail(); }
    else if (action === 'weekday') { const rule = rowById(button.dataset.row); if (!rule) return; const values = new Set(rule['周几'] || []), day = button.dataset.day; values.has(day) ? values.delete(day) : values.add(day); rule['周几'] = WEEKDAYS.filter(item => values.has(item)); modified(); renderDetail(); }
    else if (action === 'close-drawer') closeDrawer();
    else if (action === 'diff') diff();
    else if (action === 'discard') { state.draft = clone(state.base.payload); state.pending = null; state.rowErrors.clear(); state.error = false; state.message = '已恢复到上次读取或保存的规则。'; closeDrawer(); renderAll(); }
    else if (action === 'save') void save();
    else if (action === 'reload') { if (dirty()) showDrawer('重新读取规则', '<p>重新读取会放弃本页未保存的修改。可以先查看变更，或继续保留当前修改。</p>', '<button type="button" class="button" data-action="close-drawer">保留修改</button><button type="button" class="button primary" data-action="confirm-reload">放弃并重新读取</button>'); else void load(); }
    else if (action === 'confirm-reload') { closeDrawer(); void load(); }
    else if (action === 'specials') listOverrides();
    else if (action === 'edit-override') editOverride(Number(button.dataset.index));
    else if (action === 'new-override') editOverride(undefined, button.dataset.person ? (selectedEntity(button.dataset.person)?.rawLabels[0] || '') : '');
    else if (action === 'delete-override' && state.editor?.type === 'override') { state.draft.overrides.splice(state.editor.index, 1); closeDrawer(); renderDetail(); modified(); }
    else if (action === 'reload-plan') void loadPlan();
    else if (action === 'close') onClose?.();
  });
  root.addEventListener('focusout', event => {
    const target = event.target;
    if (state.busy || target.dataset?.field !== 'task-text' || target.dataset.cancelled) return;
    const row = target.closest('[data-task]'); if (row) commitText(row, target.value);
  });
  root.addEventListener('keydown', event => {
    const target = event.target;
    if (target.dataset?.field === 'task-text') {
      if (event.key === 'Enter' && !event.shiftKey && !event.isComposing && event.keyCode !== 229) { event.preventDefault(); target.blur(); }
      else if (event.key === 'Escape') {
        event.preventDefault(); event.stopPropagation();
        const row = target.closest('[data-task]');
        target.dataset.cancelled = '1';
        if (row.dataset.task === 'new') state.pending = null;
        else state.rowErrors.delete(row.dataset.task);
        target.blur(); renderDetail(); footer();
      }
      return;
    }
    if (target.dataset?.field === 'new-subject' && event.key === 'Enter' && !event.isComposing) { event.preventDefault(); q('[data-action="confirm-subject"]')?.click(); return; }
    if (target.classList?.contains('roster-item') && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      event.preventDefault();
      const buttons = [...root.querySelectorAll('.roster-item')], at = buttons.indexOf(target), next = buttons[at + (event.key === 'ArrowDown' ? 1 : -1)];
      if (next) selectEntity(next.dataset.person, { focusRoster: true });
    }
    if (target.dataset?.field === 'search' && event.key === 'ArrowDown') { event.preventDefault(); root.querySelector('.roster-item')?.focus(); }
  });
  root.addEventListener('input', event => {
    if (state.busy) return;
    const target = event.target;
    if (target.dataset.field === 'search') { state.query = target.value; renderRoster(); if (state.view !== 'person') renderDetail(); }
    else if (target.dataset.field === 'task-text') {
      target.rows = inputRows(target.value);
      const row = target.closest('[data-task]');
      if (row?.dataset.task === 'new' && state.pending) {
        state.pending.text = target.value; state.pending.message = '';
        const entity = selectedEntity(state.pending.entityKey);
        if (!state.pending.handlerTouched) state.pending.manual = inspectTask(target.value, entity?.system, false).mode !== 'auto';
        const select = row.querySelector('[data-field="task-handler"]');
        if (select) select.outerHTML = handler(target.value, entity?.system, state.pending.manual);
      }
    }
  });
  root.addEventListener('change', event => {
    if (state.busy) return;
    const target = event.target, kind = target.dataset.field;
    if (kind === 'task-handler') setHandler(target.closest('[data-task]'), target.value === 'teacher');
    else if (kind?.startsWith('row-')) setRowField(target);
  });
  root.addEventListener('submit', async event => {
    if (event.target.id === 'rules-override-form') submitOverride(event);
    else if (event.target.classList.contains('login-form')) {
      event.preventDefault(); if (state.busy) return;
      const email = event.target.elements.email.value, password = event.target.elements.password.value; event.target.elements.password.value = '';
      setBusy(true); try { const result = await client.auth.signInWithPassword({ email, password }); if (result.error) setMessage('登录未成功，请核对账号。', true); else { state.busy = false; await load(); } } catch { setMessage('登录未成功，请稍后重试。', true); } finally { setBusy(false); }
    }
  });
  document.defaultView?.addEventListener('beforeunload', event => { if (dirty()) { event.preventDefault(); event.returnValue = ''; } });
  // The workbench announces a finished refresh; re-read the plan it just published.
  const onRefreshed = () => { if (!root.isConnected) { document.defaultView?.removeEventListener('wayon-refresh-updated', onRefreshed); return; } state.plan.rebuilding = false; void loadPlan(); };
  document.defaultView?.addEventListener('wayon-refresh-updated', onRefreshed);
  render(); await load();
  if (state.draft) void loadPlan();
  return { getDraft: () => clone(state.draft), getBase: () => clone(state.base), reload: () => load(), refreshIfClean };
}
