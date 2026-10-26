// Presentation joins only. Original attendance keys and frequency row IDs are
// retained so editing a view never rewrites identities or migrates catalog data.
const SYSTEM_LABELS = {
  ielts: "IELTS",
  toefl: "TOEFL",
  sat: "SAT",
  ability: "Ability",
  school: "校内",
  other: "Other",
};

const text = (value) => String(value ?? "").trim();
const exact = (value) => {
  let result = text(value).normalize("NFC");
  const wrapped = result.match(/^(?:【([^】]+)】|「([^」]+)」|\[([^\]]+)\])$/);
  if (wrapped) result = wrapped[1] || wrapped[2] || wrapped[3];
  return result.replace(/\s+/g, " ").trim().toLocaleLowerCase();
};

const COURSE_SUFFIX = /^(?:[-－—]\s*)?(?:(?:雅思|托福|SAT|GRE|IELTS|TOEFL|英语)\s*(?:1\s*v\s*1|一对一|1对1)(?:课程|班)?|高中同步课程|初中同步课程|小学同步课程|英语能力提升课程|雅思(?:基础|强化)?(?:课程|班)|托福(?:基础|强化)?(?:课程|班))$/i;

function explicitHead(value) {
  const match = text(value).match(/^(?:【([^】]+)】|「([^」]+)」|\[([^\]]+)\])\s*(.*)$/);
  if (!match || (match[4] && !COURSE_SUFFIX.test(match[4]))) return null;
  return text(match[1] || match[2] || match[3]);
}

export function ruleEntityDisplayName(value) {
  const original = text(value);
  const headed = explicitHead(original);
  if (headed) return headed;
  // A class name may itself end with a course word. Preserve the whole label
  // unless an explicit one-to-one suffix supplies the learner boundary.
  if (/[&＆/／、]|\s+and\s+|班|小组|多人|三人/i.test(original) && !/(?:1\s*v\s*1|一对一|1对1)(?:课程|班)?$/i.test(original)) return original;
  // This cleanup does not participate in joins. A same-looking label alone is
  // never evidence that separate classes or learners own the same rule.
  const cleaned = original.replace(/(?:[-－—]\s*)?(?:(?:雅思|托福|SAT|GRE|IELTS|TOEFL|英语)\s*(?:1\s*v\s*1|一对一|1对1)(?:课程|班)?|高中同步课程|初中同步课程|小学同步课程|英语能力提升课程|雅思(?:基础|强化)?(?:课程|班)|托福(?:基础|强化)?(?:课程|班))$/i, "").trim();
  return cleaned || original || "未命名学员／班级";
}

function systemOf(rule) {
  if (text(rule?.system)) return text(rule.system).toLowerCase();
  const source = text(rule?.["课程"]) + " " + text(rule?.["任务内容"]) + " " + text(rule?.vocab_task);
  if (/SAT/i.test(source)) return "sat";
  if (/托福|TOEFL/i.test(source)) return "toefl";
  if (/雅思|IELTS|王陆|真经/.test(source)) return "ielts";
  if (/校内/.test(source)) return "school";
  return "other";
}

function unitOf(labels, rules = []) {
  if (rules.some((rule) => rule?.is_group === true || (Array.isArray(rule?.group_members) && rule.group_members.length > 1))) return "class";
  // Unit filters are presentation only: they do not create a member roster.
  return labels.some((label) => /[&＆/／、]|\s+and\s+|班|小组|多人|三人/i.test(explicitHead(label) || text(label))) ? "class" : "student";
}

function appendUnique(values, incoming) {
  for (const value of incoming) if (((typeof value === "string" && value.trim()) || (typeof value === "number" && Number.isFinite(value))) && !values.includes(value)) values.push(value);
}

export function buildRuleEntities(payload = {}) {
  const entities = [];
  const attendance = [];
  for (const [attendanceKey, rule] of Object.entries(payload.attendance_rules || {})) {
    const labels = [...new Set([attendanceKey, rule?.name].filter((value) => typeof value === "string" && value.trim()))];
    const system = systemOf(rule);
    const entity = {
      key: "attendance:" + attendanceKey,
      id: "attendance:" + attendanceKey,
      name: ruleEntityDisplayName(rule?.name || attendanceKey),
      system,
      systemLabel: SYSTEM_LABELS[system] || system,
      unit: unitOf(labels, [rule]),
      attendanceKeys: [attendanceKey],
      frequencyIds: [],
      names: [...labels],
      rawLabels: [...labels],
    };
    entities.push(entity);
    attendance.push(entity);
  }

  // Raw labels are deliberately not passed through display-name cleanup. Two
  // similarly named classes retain their own rows unless a unique profile owns
  // an exact label or a trusted, explicit bracketed learner label.
  const buckets = new Map();
  for (const row of payload.frequency_rows || []) {
    const label = String(row?.["学员"] ?? "");
    const system = systemOf(row);
    const bucketKey = JSON.stringify([label, system]);
    if (!buckets.has(bucketKey)) buckets.set(bucketKey, { label, system, rows: [] });
    buckets.get(bucketKey).rows.push(row);
  }
  for (const { label, system, rows } of buckets.values()) {
    let candidates = attendance.filter((entity) => entity.system === system && entity.names.some((name) => exact(name) === exact(label)));
    if (!candidates.length) {
      const head = explicitHead(label);
      if (head) candidates = attendance.filter((entity) => entity.system === system && entity.names.some((name) => exact(name) === exact(head)));
    }
    let entity = candidates.length === 1 ? candidates[0] : null;
    if (!entity) {
      const key = "frequency:" + encodeURIComponent(JSON.stringify([label, system]));
      entity = {
        key,
        id: key,
        name: ruleEntityDisplayName(label),
        system,
        systemLabel: SYSTEM_LABELS[system] || system,
        unit: unitOf([label], rows),
        attendanceKeys: [],
        frequencyIds: [],
        names: [],
        rawLabels: [],
      };
      if (candidates.length > 1) entity.ambiguous = true;
      entities.push(entity);
    }
    appendUnique(entity.frequencyIds, rows.map((row) => row.id));
    appendUnique(entity.names, [label]);
    appendUnique(entity.rawLabels, [label]);
  }
  return entities.sort((a, b) => a.name.localeCompare(b.name, "zh-CN") || a.system.localeCompare(b.system) || a.key.localeCompare(b.key));
}

function frequencyRows(entity, payload) {
  const ids = new Set(entity?.frequencyIds || []);
  return (payload?.frequency_rows || []).filter((row) => ids.has(row.id));
}

export function entityStatus(entity, payload) {
  const rows = frequencyRows(entity, payload);
  if (!rows.length) return "empty";
  // Owner-catalog state is authoritative: task_rule_catalog.apply_runtime marks
  // these rows canonical. Historical reminder titles, date windows and manual
  // completion are separate from this user-controlled ON/OFF state.
  if (rows.every((row) => row["状态"] === "进行中")) return "on";
  if (rows.every((row) => row["状态"] === "暂停")) return "off";
  return "mixed";
}

export function setEntityStatus(payload, entity, enabled) {
  if (typeof enabled !== "boolean") throw new TypeError("打卡状态需要明确的 ON/OFF 值");
  for (const row of frequencyRows(entity, payload)) {
    row["状态"] = enabled ? "进行中" : "暂停";
    row._canonical_state = true;
  }
  return payload;
}

export function findEntityForRule(entities, { attendanceKey, rowId } = {}) {
  if (attendanceKey === undefined && rowId === undefined) return null;
  const found = entities.filter((entity) =>
    (attendanceKey === undefined || entity.attendanceKeys.includes(attendanceKey)) &&
    (rowId === undefined || entity.frequencyIds.includes(rowId)));
  return found.length === 1 ? found[0] : null;
}
