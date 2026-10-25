import { RULE_SPEC } from "./rules-contract.mjs?v=20261024-ux2";
export const clone = (x) => structuredClone(x);
export const clean = (x) =>
  String(x || "")
    .replace(/[【】「」\s]/g, "")
    .toLowerCase();
export const todayShanghai = () =>
  new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Shanghai" });
export const SYSTEMS = {
  ielts: "IELTS",
  toefl: "TOEFL",
  sat: "SAT",
  ability: "Ability",
  other: "Other",
};
const re = (k) => new RegExp(RULE_SPEC[k], "i");
export function inspectTask(text, system, manual = false) {
  text = String(text || "").trim();
  if (!text) return { mode: "invalid", label: "请填写任务内容" };
  if (re("placeholder").test(text))
    return { mode: "invalid", label: "请把占位文字改成具体任务" };
  if (manual || re("manual").test(text))
    return { mode: "manual", label: "老师处理" };
  if (system === "toefl" && re("redo").test(text))
    return { mode: "auto", kind: "vocab", subject: "单词", label: "自动布置" };
  if (/重做|重新做/.test(text))
    return { mode: "unknown", label: "重做需明确原作业，请交老师处理" };
  if (re("vocabulary").test(text)) {
    const declared = /SAT/i.test(text)
      ? "sat"
      : /托福|TOEFL/i.test(text)
        ? "toefl"
        : /雅思|王陆|真经/.test(text)
          ? "ielts"
          : null;
    if (declared && declared !== system)
      return { mode: "unknown", label: "单词体系与所选课程不一致" };
    if (!re("quantity").test(text))
      return { mode: "unknown", label: "请写明每次词数" };
    if (!["ielts", "toefl", "sat"].includes(system))
      return { mode: "unknown", label: "请选择词汇体系或交老师处理" };
    return { mode: "auto", kind: "vocab", subject: "单词", label: "自动布置" };
  }
  if (/完形/.test(text) && !/(一套阅读|阅读一套)/.test(text))
    return system === "toefl" && re("cloze").test(text)
      ? { mode: "auto", kind: "cloze", subject: "完形", label: "自动布置" }
      : { mode: "unknown", label: "自动完形目前支持托福5篇" };
  for (const subject of ["听力", "阅读", "口语", "写作"])
    if (text.includes(subject) && re("suite").test(text)) {
      if (
        !["ielts", "toefl"].includes(system) ||
        (system === "ielts" && subject === "口语")
      )
        return { mode: "unknown", label: "此项请交老师处理" };
      return { mode: "auto", kind: "suite", subject, label: "自动布置" };
    }
  return { mode: "unknown", label: "未识别，请写明数量/套数或选老师处理" };
}
export function taskLines(value) {
  return String(value || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .split(/\r?\n/)
    .map((x) => x.trim().replace(/^\d+[、.．]\s*/, ""))
    .filter(Boolean);
}
export function expandedLines(row, day) {
  const result = [];
  for (const line of taskLines(row["任务内容"])) {
    if (
      /听[、，\s]*说[、，\s]*读[、，\s]*写各一套|听力、口语、阅读、写作各一套/.test(
        line,
      )
    ) {
      const system =
        row.system === "ielts" || /雅思/.test(line + String(row["课程"] || ""))
          ? "雅思"
          : "托福";
      result.push(
        ...["听力", "口语", "阅读", "写作"].map((x) => system + x + "一套"),
      );
      const tail = line.match(/系统内.+/);
      if (tail) result.push(tail[0]);
      else if (
        /周末(?:加)?50词/.test(line) &&
        [0, 6].includes(new Date(day + "T12:00:00Z").getUTCDay())
      )
        result.push("系统内50个单词");
    } else result.push(line);
  }
  return [...new Set(result)];
}
export function manualTask(rule, text) {
  return (rule.manual_tasks || []).includes(text);
}
export function setManual(rule, text, value) {
  const values = new Set(rule.manual_tasks || []);
  value ? values.add(text) : values.delete(text);
  rule.manual_tasks = [...values];
}
export function moveManual(rule, oldText, text) {
  if (manualTask(rule, oldText)) {
    setManual(rule, oldText, false);
    setManual(rule, text, true);
  }
}
export function frequencyReason(row, day) {
  if (row["状态"] !== "进行中") return "规则已暂停";
  if (row["本次已完成"] === true || row["本次已完成"] === "__YES__")
    return "本次已完成";
  if (
    row["date:下次日期:start"] &&
    day < row["date:下次日期:start"].slice(0, 10)
  )
    return "尚未到开始日期";
  if (
    row["date:重复截止:start"] &&
    day > row["date:重复截止:start"].slice(0, 10)
  )
    return "已过截止日期";
  const weekday =
    RULE_SPEC.weekdays[(new Date(day + "T12:00:00Z").getUTCDay() + 6) % 7];
  if (row["重复"] === "每周固定几天" && !(row["周几"] || []).includes(weekday))
    return "不是约定执行日";
  return "";
}
export function changedOwners(base, draft) {
  const result = [];
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  for (const key of new Set([
    ...Object.keys(base.attendance_rules || {}),
    ...Object.keys(draft.attendance_rules || {}),
  ]))
    if (!same(base.attendance_rules?.[key], draft.attendance_rules?.[key]))
      result.push(
        draft.attendance_rules?.[key]?.name ||
          base.attendance_rules?.[key]?.name ||
          key,
      );
  const before = new Map((base.frequency_rows || []).map((x) => [x.id, x]));
  const after = new Map((draft.frequency_rows || []).map((x) => [x.id, x]));
  for (const id of new Set([...before.keys(), ...after.keys()]))
    if (!same(before.get(id), after.get(id)))
      result.push(
        after.get(id)?.["学员"] || before.get(id)?.["学员"] || "定期任务",
      );
  if (!same(base.overrides || [], draft.overrides || []))
    result.push("临时暂停与人工安排");
  return [...new Set(result)];
}
function authored(rule, kind) {
  if (kind === "frequency") return expandedLines(rule, todayShanghai());
  return [
    rule.vocab_task,
    ...(Array.isArray(rule.attendance_tasks) ? rule.attendance_tasks : []),
    ...Object.values(rule.subject_rules || {}).flat(),
  ].filter((x) => x !== null && x !== undefined && x !== "");
}
export function validateDraft(payload, base = {}) {
  const errors = [];
  const ids = new Set();
  const check = (rule, previous, kind, label) => {
    const old = new Set(authored(previous || {}, kind));
    const text = String(rule["课程"] || "") + " " + String(rule["任务"] || "");
    const related = Object.entries(payload.attendance_rules || {}).find(
      ([k, r]) => clean(r.name || k) === clean(rule["学员"]),
    );
    const system =
      rule.system ||
      previous?.system ||
      related?.[1]?.system ||
      (/SAT/i.test(text)
        ? "sat"
        : /雅思|IELTS/i.test(text)
          ? "ielts"
          : /托福|TOEFL/i.test(text)
            ? "toefl"
            : "other");
    const values = authored(rule, kind);
    if (
      kind === "attendance" &&
      [
        ...(rule.attendance_tasks || []),
        ...Object.values(rule.subject_rules || {}).flat(),
      ].some((x) => !String(x).trim())
    )
      errors.push(label + "：请填完新增任务");
    for (const text of values) {
      const inspected = inspectTask(text, system, manualTask(rule, text));
      const unchanged =
        old.has(text) &&
        manualTask(rule, text) === manualTask(previous || {}, text) &&
        rule.system === previous?.system;
      if (
        inspected.mode === "invalid" ||
        (!unchanged && inspected.mode === "unknown")
      )
        errors.push(label + "：" + text + "（" + inspected.label + "）");
    }
  };
  for (const [key, rule] of Object.entries(payload.attendance_rules || {}))
    check(rule, base.attendance_rules?.[key], "attendance", rule.name || key);
  for (const row of payload.frequency_rows || []) {
    const label = row["学员"] || "未命名规则";
    if (!row.id || ids.has(row.id)) errors.push(label + "：规则编号缺失或重复");
    ids.add(row.id);
    if (
      !String(row["学员"] || "").trim() ||
      !String(row["任务内容"] || "").trim()
    )
      errors.push(label + "：姓名和任务内容都需要填写");
    if (row["重复"] === "每周固定几天" && !(row["周几"] || []).length)
      errors.push(label + "：请选择执行日");
    if (
      row["date:下次日期:start"] &&
      row["date:重复截止:start"] &&
      row["date:下次日期:start"].slice(0, 10) >
        row["date:重复截止:start"].slice(0, 10)
    )
      errors.push(label + "：截止日期不能早于开始日期");
    check(
      row,
      (base.frequency_rows || []).find((x) => x.id === row.id),
      "frequency",
      label,
    );
  }
  return [...new Set(errors)];
}
export function previewRules(
  payload,
  {
    day = todayShanghai(),
    attendanceKey,
    studentName,
    subjects = [],
    hasClass = false,
    facts = [],
  } = {},
) {
  const profile = payload.attendance_rules?.[attendanceKey] || {};
  const name = studentName || profile.name || attendanceKey || "";
  const result = [];
  const add = (text, rule, source) => {
    const inspection = inspectTask(
      text,
      rule.system || profile.system || "other",
      manualTask(rule, text),
    );
    let mode = inspection.mode,
      reason = inspection.label;
    if (
      source === "定期任务" &&
      hasClass &&
      inspection.kind === "vocab" &&
      profile.vocab_task
    ) {
      mode = "blocked";
      reason = "有课日已有基础词量，定期单词不重复叠加";
    }
    if (
      source === "定期任务" &&
      hasClass &&
      inspection.kind === "suite" &&
      subjects.some((x) => x.includes(inspection.subject))
    ) {
      mode = "manual";
      reason = "当日该科由任课老师安排，不另发布套卷";
    }
    if (
      hasClass &&
      (profile.system === "sat" ||
        subjects.some((x) => /SAT|语法/.test(x) || x === "数学")) &&
      !/郭璟|Jack/i.test(name)
    ) {
      mode = "manual";
      reason = "此课程由老师处理，不自动向系统发布";
    }
    const policy = (payload.overrides || []).find(
      (x) =>
        clean(x.student) === clean(name) &&
        (!x.start || x.start <= day) &&
        (!x.end || x.end >= day) &&
        (!x.system || x.system === (rule.system || profile.system)) &&
        (!x.kind ||
          (x.kind === "automatic" && ["auto", "unknown"].includes(mode)) ||
          x.kind === inspection.kind) &&
        (!x.subject || x.subject === inspection.subject),
    );
    if (policy) {
      mode = policy.action === "pause" ? "blocked" : "manual";
      reason = policy.reason || "临时规则";
    }
    const fact = facts.find(
      (x) => clean(x.name) === clean(name) && x.text === text,
    );
    if (mode === "auto") {
      if (fact?.status === "verified" || fact?.status === "verified_existing") {
        mode = "existing";
        reason =
          "工作台有同名已核验记录；是否复用仍须在例行中按原ID、接收人与配方核对";
      } else if (fact?.status === "blocked") {
        mode = "blocked";
        reason = fact.reason || "上次核验按规则停发";
      } else {
        reason = "满足上一批完成核验后才会布置；当前预览未读取实时完成状态";
      }
    }
    const key = JSON.stringify([text, mode]);
    if (!result.some((x) => x.key === key))
      result.push({ key, text, mode, reason, source });
  };
  if (hasClass) {
    if (profile.vocab_task) add(profile.vocab_task, profile, "有课日基础任务");
    for (const text of profile.attendance_tasks || [])
      add(text, profile, "有课日基础任务");
    for (const subject of subjects)
      for (const [key, tasks] of Object.entries(profile.subject_rules || {}))
        if (subject.includes(key))
          for (const text of tasks) add(text, profile, subject + "课附加");
  }
  for (const row of payload.frequency_rows || []) {
    if (clean(row["学员"]) !== clean(name) && row.id !== attendanceKey)
      continue;
    const reason = frequencyReason(row, day);
    if ((row["形式"] === "线下" || row["重复"] === "随课/每天") && !hasClass)
      continue;
    for (const text of expandedLines(row, day)) {
      if (reason) {
        result.push({ text, mode: "blocked", reason, source: "定期任务" });
      } else add(text, row, "定期任务");
    }
  }
  return result;
}

export function contextFromData(data, day) {
  const plans = data._plan?.[day] || [];
  const lessons = plans
    .filter((r) => Array.isArray(r) && r[1] !== "自习")
    .map((r) => ({
      name: r[0],
      time: r[1],
      subjects: [
        ...new Set(
          (r[3] || [])
            .filter(
              (x) =>
                typeof x === "string" &&
                x.endsWith("课") &&
                !x.includes("课后"),
            )
            .map((x) => x.slice(0, -1)),
        ),
      ],
    }));
  const record = data._assigned?.[day];
  const facts = [];
  if (["verified", "partial"].includes(record?.status))
    for (const student of record.students || [])
      for (const task of student.tasks || [])
        facts.push({
          name: student.name,
          text: task.text,
          status: "verified_existing",
        });
  return {
    scheduleKnown: Object.hasOwn(data._plan || {}, day),
    lessons,
    facts,
    days: Object.keys(data).filter((x) => /^\d{4}-\d{2}-\d{2}$/.test(x)),
  };
}
export function publicData(source) {
  const match = /\bconst\s+DATA\s*=\s*/.exec(source);
  if (!match) throw Error("课表快照未找到");
  const start = match.index + match[0].length;
  let depth = 0,
    string = false,
    escaped = false;
  for (let i = start; i < source.length && i < start + 8000000; i++) {
    const ch = source[i];
    if (string) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') string = false;
      continue;
    }
    if (ch === '"') string = true;
    else if (ch === "{") depth++;
    else if (ch === "}" && !--depth)
      return JSON.parse(source.slice(start, i + 1));
  }
  throw Error("课表快照未完整读取");
}
export async function publishedContext(day) {
  const response = await fetch(
    "./workspace-source.html?rules-preview=" + Date.now(),
    { cache: "no-store", credentials: "omit" },
  );
  if (!response.ok) throw Error("课表尚未读取");
  return contextFromData(publicData(await response.text()), day);
}

