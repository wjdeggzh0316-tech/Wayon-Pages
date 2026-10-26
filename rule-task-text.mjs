// Logical task text projection. Offsets are native JS string indices; catalog
// text is never rewritten by parsing. Python's counterpart uses native indices.
const SEPARATOR_SOURCE = '<br\\s*/?>|\\r\\n|\\r|\\n';
const separators = () => new RegExp(SEPARATOR_SOURCE, 'gi');
const MARKER = /^[\t \u3000]*\d+(?:、|[.．](?!\d))[\t \u3000]*/;
const VOCAB_HEADING = /^(?:系统内\s*)?(?:单词|词汇)(?:任务)?\s*[：:]/i;
const SPEECH_HEADING = /^口语(?:任务|练习)?\s*[：:]/i;
const QUOTA = /^(?:听力|阅读|听|读)\s*[*×xX：:]?\s*\d+(?:\.\d+)?\s*(.*)$/;
const QUOTA_REST = /^(?:个|词|单词|[（(+＋]|$)/;
const SUBSTEP = /^(?:\d\uFE0F?\u20E3|[①②③④⑤⑥⑦⑧⑨⑩])/;
const NOTE = /^(?:备注|说明|检查时间|检查安排|布置时间|布置安排)\s*[：:]/;
const WEEKDAY = /^(?:每?周|星期)[一二三四五六日天]/;
const string = value => value == null ? '' : String(value);
const normalized = value => value.replace(separators(), '\n');

function lines(value) {
  const result = [];
  let start = 0;
  for (const separator of value.matchAll(separators())) {
    result.push({ start, end: separator.index, next: separator.index + separator[0].length, raw: value.slice(start, separator.index) });
    start = separator.index + separator[0].length;
  }
  result.push({ start, end: value.length, next: value.length, raw: value.slice(start) });
  return result;
}
function quota(value) { const match = value.match(QUOTA); return !!match && QUOTA_REST.test(match[1]); }
function footer(value) { return NOTE.test(value) || (WEEKDAY.test(value) && value.includes('布置') && /检查|核对/.test(value)); }
function mode(value) {
  if (VOCAB_HEADING.test(value)) return 'vocab';
  if (SPEECH_HEADING.test(value)) return 'speech';
  return quota(value) && /[+＋]\s*$/.test(value) ? 'vocab' : null;
}
function makeUnit(value, group, end) {
  if (!group.length) return null;
  const marker = group[0].raw.match(MARKER);
  const bodyStart = group[0].start + (marker?.[0].length || 0);
  let contentStart = null, contentEnd = null;
  for (const line of group) {
    const start = Math.max(line.start, bodyStart), body = value.slice(start, line.end);
    if (body.trim()) {
      const left = body.length - body.trimStart().length;
      if (contentStart === null) contentStart = start + left;
      contentEnd = start + body.trimEnd().length;
    }
  }
  if (contentStart === null) return null;
  return { text: normalized(value.slice(contentStart, contentEnd)).trim(), start: group[0].start, end, contentStart, contentEnd };
}
function unnumbered(value, source, end) {
  const result = [];
  let current = [], currentMode = null;
  for (const line of source) {
    const body = line.raw.trim();
    if (!body) { if (current.length) current.push(line); continue; }
    const continuation = current.length && (footer(body) || (currentMode === 'vocab' && quota(body)) || (currentMode === 'speech' && SUBSTEP.test(body)));
    if (current.length && !continuation) {
      const unit = makeUnit(value, current, line.start);
      if (unit) result.push(unit);
      current = [];
    }
    if (!current.length) currentMode = mode(body);
    current.push(line);
  }
  const unit = makeUnit(value, current, end);
  if (unit) result.push(unit);
  return result;
}

export function parseTaskUnits(input) {
  const value = string(input), source = lines(value);
  const numbered = source.map((line, index) => MARKER.test(line.raw) ? index : -1).filter(index => index >= 0);
  if (!numbered.length) return unnumbered(value, source, value.length);
  const result = unnumbered(value, source.slice(0, numbered[0]), source[numbered[0]].start);
  numbered.forEach((index, offset) => {
    const following = numbered[offset + 1] ?? source.length;
    const end = following < source.length ? source[following].start : value.length;
    const unit = makeUnit(value, source.slice(index, following), end);
    if (unit) result.push(unit);
  });
  return result;
}
export function taskUnitTexts(value) { return parseTaskUnits(value).map(unit => unit.text); }
function selected(value, index) {
  const units = parseTaskUnits(value);
  if (!Number.isInteger(index) || index < 0 || index >= units.length) throw new RangeError('Task unit index is out of range');
  return units[index];
}
export function replaceTaskUnit(input, index, newText) {
  const value = string(input), unit = selected(value, index);
  const separator = value.slice(unit.contentStart, unit.contentEnd).match(separators())?.[0]
    || value.slice(unit.start, unit.end).match(separators())?.[0] || value.match(separators())?.[0] || '\n';
  const replacement = normalized(string(newText)).trim().split('\n').join(separator);
  return value.slice(0, unit.contentStart) + replacement + value.slice(unit.contentEnd);
}
export function removeTaskUnit(input, index) {
  const value = string(input), unit = selected(value, index);
  return value.slice(0, unit.start) + value.slice(unit.end);
}
