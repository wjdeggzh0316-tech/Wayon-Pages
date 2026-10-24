import {
  clone,
  clean,
  SYSTEMS,
  todayShanghai,
  inspectTask,
  taskLines,
  manualTask,
  setManual,
  moveManual,
  changedOwners,
  validateDraft,
  previewRules,
  publishedContext,
} from "./rules-model.mjs?v=20261024-ux2";
export function canonical(value) {
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (value && typeof value === "object")
    return (
      "{" +
      Object.keys(value)
        .sort()
        .map((k) => JSON.stringify(k) + ":" + canonical(value[k]))
        .join(",") +
      "}"
    );
  return JSON.stringify(value);
}
export async function saveCatalog(client, owner, base, payload) {
  const { data, error } = await client
    .from("wayon_rule_catalog")
    .update({ payload, revision: base.revision + 1 })
    .eq("owner_id", owner)
    .eq("revision", base.revision)
    .select("revision")
    .maybeSingle();
  if (error || !data) throw Error("CONFLICT");
  const read = await client
    .from("wayon_rule_catalog")
    .select("revision,payload")
    .eq("owner_id", owner)
    .single();
  if (
    read.error ||
    !read.data ||
    read.data.revision !== base.revision + 1 ||
    canonical(read.data.payload) !== canonical(payload)
  )
    throw Error("READBACK_FAILED");
  return read.data;
}
export function inferStudentSystem(name, rule, text) {
  if (rule?.system) return rule.system;
  const value = String(text || "") + " " + String(rule?.["课程"] || "");
  if (/SAT/i.test(value)) return "sat";
  if (/托福|TOEFL/i.test(value)) return "toefl";
  if (/雅思|IELTS|王陆|真经/.test(value)) return "ielts";
  return "other";
}
// Presentation only: no alias cleanup or rule migration runs while loading.
export const MULTI_CLASS_SPECS = [];
const WEEKDAYS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
const PRESETS = [
  ["30个单词", "30个单词"],
  ["50个单词", "50个单词"],
  ["IELTS 听读各50词", "系统内单词任务（听力*50+阅读*50）"],
  ["TOEFL 100词", "系统内托福单词100个（50*2）"],
  ["SAT 100词", "系统内单词任务（SAT核心词汇100词，选择题模式）"],
  ["完整阅读一套", "一套完整阅读"],
  ["听力一套", "一套听力"],
  ["写作一套", "一套写作"],
  ["TOEFL口语一套", "托福口语一套"],
  ["TOEFL完形5篇", "5篇完形填空"],
  ["校内单词背诵", "校内单词背诵"],
];
const STYLE = `
.wayon-rules-dialog:not([open]){display:none!important}
.wayon-rules-dialog[open]{position:fixed!important;inset:0!important;margin:auto!important;padding:0!important;border:1px solid #dfe4ec;border-radius:20px;width:min(1180px,calc(100vw - 32px))!important;max-width:calc(100vw - 32px)!important;height:min(92dvh,960px)!important;max-height:92dvh!important;overflow:hidden!important;background:#f6f8fb;color:#202b3c;box-shadow:0 30px 100px #12213e40}
.wayon-rules-dialog::backdrop{background:#17243c70;backdrop-filter:blur(5px)}
.rules-wrapper{height:100%;min-height:0;display:flex;flex-direction:column;overflow:hidden;background:#f6f8fb;color:#202b3c;font:14px/1.5 -apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC',sans-serif;text-align:left}
.rules-wrapper *{box-sizing:border-box}.rules-wrapper button,.rules-wrapper input,.rules-wrapper select,.rules-wrapper textarea{font:inherit}.rules-wrapper button{cursor:pointer}.rules-wrapper button:disabled{opacity:.5;cursor:default}
.rules-header{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;padding:20px 24px 14px;background:white;border-bottom:1px solid #e6eaf0;flex:none}.rules-title{margin:0;font-size:22px;letter-spacing:-.035em;font-weight:650}.rules-subtitle{margin:3px 0 0;color:#68758a;font-size:12px}.rules-close{width:40px;height:40px;border:1px solid #e3e8ef;border-radius:12px;background:#fff;color:#58677c;font-size:22px}
.rules-main-tabs{display:flex;gap:8px;flex-wrap:wrap;margin-top:13px;grid-column:1/-1}.rules-main-tab{border:1px solid #dfe5ed;background:#fff;color:#607087;padding:8px 14px;border-radius:10px;min-height:38px}.rules-main-tab.active{background:#edf3ff;border-color:#b8ccf4;color:#2454a5;font-weight:600}
.rules-toolbar>.rules-select{width:auto;min-width:130px;max-width:200px}.rules-toolbar .rules-search{max-width:480px}.wayon-rules-dialog[open]{outline:none}.rules-toolbar{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:14px 24px;background:#fff;flex:none}.rules-search{flex:1 1 200px;min-width:0}.rules-search input{width:100%}.rules-control,.rules-search input{border:1px solid #dce3ec;border-radius:9px;background:#fff;padding:8px 10px;color:#26364c;min-height:38px;max-width:100%}.rules-btn{border:1px solid #dce3ec;background:#fff;color:#40536d;border-radius:9px;padding:8px 12px;min-height:38px}.rules-btn:hover,.rules-close:hover{background:#f0f4fa}.rules-btn-primary,.rules-btn-save{background:#285cba;color:white;border:1px solid #285cba;font-weight:600}.rules-btn-save{border-radius:10px;padding:10px 18px;min-height:42px;white-space:nowrap}.rules-btn-danger{color:#a13636;background:#fff7f7;border-color:#efd4d4}.rules-btn-small{font-size:12px;padding:5px 9px;min-height:30px}
.rules-status-bar{padding:0 24px 12px;color:#64758d;font-size:12px;background:white;flex:none}.rules-status-bar.alert{color:#ad3636}.rules-content{overflow:auto;min-height:0;flex:1;padding:20px 24px;overscroll-behavior:contain}.rules-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;align-items:start}
.rules-card{background:#fff;border:1px solid #e0e6ef;border-radius:15px;min-width:0;overflow:hidden}.rules-card.is-paused{background:#fafbfc}.rules-card-summary{display:flex;gap:12px;align-items:center;padding:17px 18px;cursor:pointer;list-style:none}.rules-card-summary::-webkit-details-marker{display:none}.rules-card-summary:after{content:'›';margin-left:auto;font-size:24px;color:#8e9db0;transform:rotate(0deg)}.rules-card[open]>.rules-card-summary:after{transform:rotate(90deg)}.rules-card-heading{min-width:0;flex:1}.rules-card-title{font-size:17px;line-height:1.45;font-weight:650;margin:0;overflow-wrap:anywhere;letter-spacing:-.02em}.rules-card-meta{display:flex;flex-wrap:wrap;gap:5px;margin:6px 0}.rules-tag{font-size:11px;line-height:1.4;padding:3px 7px;border-radius:6px;background:#eff3f8;color:#596c86;white-space:nowrap}.rules-tag.good{background:#eaf5ef;color:#2c7650}.rules-tag.warn{background:#fff4df;color:#946015}.rules-tag.bad{background:#fff0f0;color:#a23d3d}.rules-card-brief{font-size:12px;color:#7a879a;line-height:1.5}.rules-card-body{padding:0 18px 18px;border-top:1px solid #edf0f5}.rules-section{margin-top:18px}.rules-section-title{display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:13px;font-weight:650;margin:0 0 9px}.rules-hint{font-size:12px;color:#7a879a;margin:5px 0;line-height:1.6}.rules-fields{display:grid;grid-template-columns:1fr 1fr;gap:10px}.rules-field{display:flex;flex-direction:column;gap:5px;min-width:0}.rules-field>span{font-size:12px;color:#65778e}.rules-input,.rules-select,.rules-textarea{width:100%;min-width:0;border:1px solid #dce3ec;border-radius:9px;padding:8px 10px;background:#fff;color:#283a53;outline:none}.rules-input:focus,.rules-select:focus,.rules-textarea:focus{border-color:#6896e9;box-shadow:0 0 0 3px #e9f1ff}.rules-textarea{resize:vertical;min-height:90px}.rules-task-row{display:grid;grid-template-columns:minmax(0,1fr) 94px 36px;gap:6px;margin:7px 0;align-items:start}.rules-task-row .rules-input{font-size:13px}.rules-mode{font-size:11px;padding:9px 4px}.rules-delete{border:0;border-radius:8px;background:#f6f8fb;color:#a56a6a;min-height:36px;font-size:20px}.rules-task-message{grid-column:1/-1;font-size:11px;margin:0;color:#8b5d1b}.rules-subject{background:#f8fafd;border:1px solid #e5eaf2;border-radius:11px;padding:10px;margin:10px 0}.rules-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.rules-days{display:flex;gap:5px;flex-wrap:wrap}.rules-day{border:1px solid #e0e6ef;background:white;color:#63748c;border-radius:8px;min-width:32px;min-height:32px}.rules-day[aria-pressed=true]{background:#eaf1ff;color:#2454a5;border-color:#b5caf1}.rules-card-foot{display:flex;gap:8px;flex-wrap:wrap;justify-content:space-between;border-top:1px solid #edf0f5;padding-top:14px;margin-top:18px}
.rules-footer{display:flex;justify-content:space-between;align-items:center;gap:14px;background:#fff;border-top:1px solid #e1e6ef;padding:14px 24px;flex:none;box-shadow:0 -4px 18px #23385705}.rules-save-note{font-size:12px;color:#6f7f95}.rules-changes{margin:0;max-width:500px}.rules-changes summary{cursor:pointer;color:#344e74;font-size:13px}.rules-changes p{margin:5px 0;color:#78869a;font-size:12px}.rules-error-list{background:#fff6f5;color:#a03b33;border:1px solid #f0d5d0;border-radius:10px;padding:12px 16px;font-size:12px;grid-column:1/-1}.rules-error-list:empty{display:none}.rules-empty{text-align:center;padding:40px 15px;color:#8190a4;grid-column:1/-1}
.rules-preview{border:1px solid #dce6f5;border-radius:14px;background:white;padding:16px;margin-bottom:18px}.rules-preview h3{margin:0 0 9px;font-size:16px}.rules-preview-rows{margin-top:12px;display:flex;flex-direction:column;gap:8px}.rules-preview-row{padding:9px 11px;border-radius:9px;background:#f5f8fc;font-size:13px;overflow-wrap:anywhere}.rules-preview-row small{display:block;color:#70819a;font-size:11px;margin-top:3px}.rules-auth{max-width:380px;margin:40px auto;display:flex;flex-direction:column;gap:12px}.rules-auth h3{margin:0}.rules-override{border:1px solid #e0e7f0;border-radius:12px;padding:14px;background:white;margin-bottom:12px}.rules-override-head{display:flex;justify-content:space-between;gap:10px;align-items:start}.rules-checkbox{display:flex;align-items:center;gap:6px;font-size:12px;color:#62748d}.rules-preview-selects{display:flex;flex-wrap:wrap;align-items:end;gap:10px}
@media(max-width:780px){.rules-toolbar .rules-search{max-width:none}.rules-grid{grid-template-columns:1fr}.rules-header{padding:16px}.rules-toolbar{padding:12px 16px}.rules-status-bar{padding:0 16px 10px}.rules-content{padding:14px 16px}.rules-footer{padding:12px 16px}.rules-title{font-size:20px}.rules-main-tab{padding:7px 10px;flex:1;text-align:center}.rules-main-tabs{gap:5px}.rules-search{flex-basis:100%}.rules-card-summary{padding:14px}.rules-card-body{padding:0 14px 16px}}
@media(max-width:480px){.wayon-rules-dialog[open]{width:100vw!important;max-width:100vw!important;height:100dvh!important;max-height:100dvh!important;border:0;border-radius:0}.rules-task-row{grid-template-columns:minmax(0,1fr) 44px}.rules-task-row .rules-mode{grid-column:1;font-size:12px;min-height:36px}.rules-task-row .rules-delete{grid-column:2;grid-row:1/3;min-height:44px}.rules-footer{display:grid;grid-template-columns:1fr;gap:8px;align-items:center;padding-bottom:max(12px,env(safe-area-inset-bottom))}.rules-footer>.rules-actions{display:grid;grid-template-columns:1fr 1.3fr;width:100%}.rules-footer .rules-changes{max-width:none}.rules-changes{max-width:180px}.rules-btn,.rules-control,.rules-input,.rules-select,.rules-close,.rules-btn-save{min-height:44px}.rules-btn-small{min-height:36px}.rules-fields{grid-template-columns:1fr}.rules-preview-selects .rules-field{width:100%}.rules-control{min-width:0}.rules-save-note{font-size:10px}.rules-main-tab{font-size:12px}.rules-close{width:44px}}
@media(prefers-reduced-motion:no-preference){.rules-btn,.rules-card-summary{transition:background .15s ease}}
`;

export async function mountRules({
  document,
  client,
  container,
  onClose,
  getContext = publishedContext,
}) {
  if (!document.getElementById("wayon-rules-editor-styles")) {
    const style = document.createElement("style");
    style.id = "wayon-rules-editor-styles";
    style.textContent = STYLE;
    document.head.append(style);
  }
  const root = container || document.getElementById("rules") || document.body;
  const state = {
    base: null,
    draft: null,
    owner: null,
    tab: "attendance",
    search: "",
    system: "all",
    filter: "all",
    open: new Set(),
    status: "正在读取规则…",
    alert: false,
    errors: [],
    preview: false,
    previewKey: "",
    day: todayShanghai(),
    subject: "",
    context: {},
    busy: false,
  };
  const node = (tag, text, cls) => {
    const e = document.createElement(tag);
    if (text !== undefined) e.textContent = text;
    if (cls) e.className = cls;
    return e;
  };
  const button = (text, fn, cls = "") => {
    const e = node("button", text, "rules-btn " + cls);
    e.type = "button";
    e.onclick = fn;
    return e;
  };
  const tag = (text, tone = "") => node("span", text, "rules-tag " + tone);
  const status = (text, alert = false) => {
    state.status = text;
    state.alert = alert;
    const s = root.querySelector(".rules-status-bar");
    if (s) {
      s.textContent = text;
      s.classList.toggle("alert", alert);
    }
  };
  const owners = () =>
    state.base && state.draft
      ? changedOwners(state.base.payload, state.draft)
      : [];
  function updateDirty() {
    const names = [
        ...new Set([
          ...owners(),
          ...Array.from(state.blankFrequency?.keys() || []).map(
            (id) =>
              state.draft.frequency_rows.find((r) => r.id === id)?.["学员"] ||
              "新增定期任务",
          ),
        ]),
      ],
      summary = root.querySelector(".rules-change-summary"),
      detail = root.querySelector(".rules-change-detail"),
      save = root.querySelector(".rules-btn-save");
    if (summary)
      summary.textContent = names.length
        ? "有 " + names.length + " 处规则未保存"
        : "所有修改已保存";
    if (detail) detail.textContent = names.join("、");
    if (save) save.disabled = state.busy || !names.length;
  }
  const modified = () => {
    state.errors = [];
    updateDirty();
    status("修改尚未保存；保存后在下一次例行读取时生效。");
  };
  const input = (value, change, type = "text") => {
    const e = node("input");
    e.type = type;
    e.className = "rules-input";
    e.value = value ?? "";
    e.oninput = () => {
      change(e.value);
      modified();
    };
    return e;
  };
  const field = (label, control) => {
    const e = node("label", undefined, "rules-field");
    if (!control.getAttribute('aria-label')) control.setAttribute('aria-label', label);
    e.append(node("span", label), control);
    return e;
  };
  const select = (values, value, change) => {
    const e = node("select", undefined, "rules-select");
    for (const [v, l] of values) {
      const o = node("option", l);
      o.value = v;
      o.selected = v === value;
      e.append(o);
    }
    e.onchange = () => {
      const before = state.draft ? canonical(state.draft) : "";
      change(e.value);
      if (state.draft && canonical(state.draft) !== before) modified();
    };
    return e;
  };
  const systemSelect = (rule, name, text) =>
    select(
      Object.entries(SYSTEMS),
      rule.system === "school" ? "other" : inferStudentSystem(name, rule, text),
      (value) => {
        rule.system = value;
        if ("学员" in rule) rule["课程"] = SYSTEMS[value];
        renderList();
      },
    );
  function keepRender(fn) {
    const scroll = root.querySelector(".rules-content")?.scrollTop || 0;
    fn();
    const c = root.querySelector(".rules-content");
    if (c) c.scrollTop = scroll;
  }
  function summaryText(rule) {
    const common = [rule.vocab_task, ...(rule.attendance_tasks || [])].filter(
      Boolean,
    );
    const subjects = Object.keys(rule.subject_rules || {});
    return (
      (common.length
        ? common.slice(0, 2).join(" · ") +
          (common.length > 2 ? " 等" + common.length + "项" : "")
        : "暂无基础任务") +
      (subjects.length ? " · " + subjects.length + "种课型附加" : "")
    );
  }
  function taskRow(rule, text, change, remove, { vocabulary = false } = {}) {
    const row = node("div", undefined, "rules-task-row");
    let current = text;
    const control = input(text, (value) => {
      const old = current;
      change(value);
      moveManual(rule, old, value);
      current = value;
      showInspection();
    });
    control.setAttribute(
      "aria-label",
      vocabulary ? "随课单词任务" : "任务内容",
    );
    control.placeholder = vocabulary
      ? "不布置单词可留空"
      : "填写具体任务，例如：一套听力";
    const mode = select(
      [
        ["auto", "自动识别"],
        ["manual", "老师处理"],
      ],
      manualTask(rule, text) ? "manual" : "auto",
      (value) => {
        setManual(rule, current, value === "manual");
        showInspection();
      },
    );
    mode.classList.add("rules-mode");
    mode.setAttribute("aria-label", "任务处理方式");
    const info = node("p", undefined, "rules-task-message");
    const showInspection = () => {
      if (vocabulary && !current.trim()) {
        info.textContent = "未设置随课单词任务";
        return;
      }
      const s = inspectTask(
        current,
        rule.system || "other",
        manualTask(rule, current),
      );
      info.textContent = s.label;
      info.style.color = ["unknown", "invalid"].includes(s.mode)
        ? "#a16117"
        : "#73849c";
    };
    const del = button(
      "×",
      () => {
        setManual(rule, current, false);
        remove();
        modified();
        keepRender(renderList);
      },
      "rules-delete",
    );
    del.setAttribute("aria-label", vocabulary ? "取消随课单词" : "删除任务");
    row.append(control, mode, del, info);
    showInspection();
    return row;
  }
  function presetControl(rule, setText) {
    const p = select(
      [
        ["", "常用任务…"],
        ...PRESETS.filter(
          ([label, value]) =>
            !rule.system || inspectTask(value, rule.system).mode !== "unknown",
        ).map(([label, value]) => [value, label]),
      ],
      "",
      (value) => {
        if (value) {
          setText(value);
          modified();
          keepRender(renderList);
        }
      },
    );
    p.classList.add("rules-preset-select");
    p.setAttribute("aria-label", "选择常用任务");
    return p;
  }
  function section(title) {
    const e = node("section", undefined, "rules-section");
    e.append(node("h4", title, "rules-section-title"));
    return e;
  }
  function newTask(rule, list, subject = null) {
    list.push("");
    modified();
    keepRender(renderList);
    const card = root.querySelector(
      '[data-rule-key="' + CSS.escape(state.lastCard || "") + '"]',
    );
    const section = subject
      ? [...(card?.querySelectorAll(".rules-subject") || [])].find(
          (x) =>
            x.querySelector(".rules-section-title span")?.textContent ===
            subject + "课",
        )
      : card?.querySelector(".rules-section");
    const inputs = section?.querySelectorAll('input[aria-label="任务内容"]');
    const last = inputs?.[inputs.length - 1];
    last?.focus();
  }
  function cardShell(id, name, tags, brief) {
    const card = node("details", undefined, "rules-card");
    card.dataset.ruleKey = id;
    card.open = state.open.has(id);
    const head = node("summary", undefined, "rules-card-summary"),
      heading = node("div", undefined, "rules-card-heading"),
      title = node("h3", name, "rules-card-title"),
      meta = node("div", undefined, "rules-card-meta");
    meta.append(...tags);
    heading.append(title, meta, node("div", brief, "rules-card-brief"));
    head.append(heading);
    card.append(head);
    card.addEventListener("toggle", () => {
      if (!card.isConnected) return;
      if (card.open) state.open.add(id);
      else state.open.delete(id);
    });
    const body = node("div", undefined, "rules-card-body");
    card.append(body);
    return { card, body };
  }
  function attendanceCard(key, rule) {
    const id = "attendance:" + key,
      name = rule.name || key,
      common = [rule.vocab_task, ...(rule.attendance_tasks || [])].filter(
        Boolean,
      ),
      subjs = Object.keys(rule.subject_rules || {});
    const { card, body } = cardShell(
      id,
      name,
      [
        tag(SYSTEMS[rule.system] || "Other"),
        tag(common.length + "项基础任务"),
        tag(subjs.length + "种课型"),
      ],
      summaryText(rule),
    );
    const main = section("有课日基础任务");
    main.append(
      node(
        "p",
        "这些任务在有课日加入清单；系统作业仍须通过完成核验。",
        "rules-hint",
      ),
    );
    main.append(field("任务体系", systemSelect(rule, name, rule.vocab_task)));
    main.append(
      taskRow(
        rule,
        rule.vocab_task || "",
        (value) => (rule.vocab_task = value),
        () => (rule.vocab_task = ""),
        { vocabulary: true },
      ),
    );
    const list = Array.isArray(rule.attendance_tasks)
      ? rule.attendance_tasks
      : [];
    list.forEach((text, i) =>
      main.append(
        taskRow(
          rule,
          text,
          (value) => (list[i] = value),
          () => list.splice(i, 1),
        ),
      ),
    );
    const actions = node("div", undefined, "rules-actions");
    actions.append(
      button(
        "添加基础任务",
        () => {
          rule.attendance_tasks = list;
          state.lastCard = id;
          newTask(rule, list);
        },
        "rules-btn-small",
      ),
      presetControl(rule, (value) => {
        rule.attendance_tasks = [...list, value];
      }),
    );
    main.append(actions);
    const extra = section("按课程附加");
    extra.append(
      node("p", "有对应课程时追加；没有该课程则不加入当天清单。", "rules-hint"),
    );
    for (const [subject, tasks] of Object.entries(rule.subject_rules || {})) {
      const box = node("div", undefined, "rules-subject"),
        header = node("div", undefined, "rules-section-title");
      header.append(
        node("span", subject + "课"),
        button(
          "删除课型",
          () => {
            delete rule.subject_rules[subject];
            modified();
            keepRender(renderList);
          },
          "rules-btn-small rules-btn-danger",
        ),
      );
      box.append(header);
      tasks.forEach((text, i) =>
        box.append(
          taskRow(
            rule,
            text,
            (v) => (tasks[i] = v),
            () => tasks.splice(i, 1),
          ),
        ),
      );
      box.append(
        button(
          "添加" + subject + "课任务",
          () => {
            state.lastCard = id;
            newTask(rule, tasks, subject);
          },
          "rules-btn-small",
        ),
      );
      extra.append(box);
    }
    const subjects =
      rule.system === "sat"
        ? ["阅读", "语法", "数学"]
        : rule.system === "ability"
          ? ["听说", "读写", "词汇与语言应用", "语法"]
          : ["听力", "口语", "阅读", "写作"];
    const addSubject = select(
      [
        ["", "添加课程类型…"],
        ...subjects
          .filter((x) => !Object.hasOwn(rule.subject_rules || {}, x))
          .map((x) => [x, x + "课"]),
        ["custom", "自定义课程类型"],
      ],
      "",
      (value) => {
        if (!value) return;
        const name =
          value === "custom"
            ? globalThis.prompt("课程名称，例如：词汇与语言应用")
            : value;
        if (!name?.trim()) return;
        const subject = name.trim().replace(/课$/, "");
        if (
          !subject ||
          ["__proto__", "constructor", "prototype"].includes(subject) ||
          Object.hasOwn(rule.subject_rules || {}, subject)
        )
          return;
        rule.subject_rules ??= {};
        rule.subject_rules[subject] = [];
        modified();
        keepRender(renderList);
      },
    );
    extra.append(addSubject);
    const foot = node("div", undefined, "rules-card-foot");
    foot.append(
      button("预览布置结果", () => showPreview(key), "rules-btn-small"),
      button(
        "临时暂停 / 老师安排",
        () => {
          state.overrideStudent = name;
          state.tab = "overrides";
          render();
        },
        "rules-btn-small",
      ),
    );
    body.append(main, extra, foot);
    return card;
  }
  function frequencyCard(row) {
    const id = "frequency:" + row.id,
      paused = row["状态"] !== "进行中",
      days =
        row["重复"] === "每周固定几天"
          ? (row["周几"] || []).join("、")
          : row["重复"];
    const { card, body } = cardShell(
      id,
      row["学员"] || "新规则",
      [
        tag(
          SYSTEMS[row.system] ||
            inferStudentSystem(row["学员"], row, row["任务内容"]).toUpperCase(),
        ),
        tag(paused ? "已暂停" : "进行中", paused ? "warn" : "good"),
        tag(days || "未设频率"),
      ],
      taskLines(row["任务内容"]).slice(0, 2).join(" · ") || "请填写任务内容",
    );
    if (paused) card.classList.add("is-paused");
    const basics = section("执行安排"),
      fields = node("div", undefined, "rules-fields");
    fields.append(
      field(
        "学员 / 班级",
        input(row["学员"], (v) => (row["学员"] = v)),
      ),
      field("任务体系", systemSelect(row, row["学员"], row["任务内容"])),
      field(
        "状态",
        select(
          [
            ["进行中", "进行中"],
            ["暂停", "暂停"],
          ],
          row["状态"],
          (v) => {
            row["状态"] = v;
            row._canonical_state = true;
            keepRender(renderList);
          },
        ),
      ),
      field(
        "形式",
        select(
          [
            ["线上", "线上"],
            ["自习", "自习"],
            ["线下", "线下（历史规则）"],
          ],
          row["形式"],
          (v) => (row["形式"] = v),
        ),
      ),
      field(
        "频率",
        select(
          [
            ["每天", "每天"],
            ["每周固定几天", "每周固定几天"],
            ["随课/每天", "仅有课日（历史规则）"],
          ],
          row["重复"],
          (v) => {
            row["重复"] = v;
            keepRender(renderList);
          },
        ),
      ),
    );
    basics.append(fields);
    if (row["重复"] === "每周固定几天") {
      const ds = node("div", undefined, "rules-days");
      WEEKDAYS.forEach((day) => {
        const b = button(
          day.slice(1),
          () => {
            const values = new Set(row["周几"] || []);
            values.has(day) ? values.delete(day) : values.add(day);
            row["周几"] = WEEKDAYS.filter((x) => values.has(x));
            b.setAttribute("aria-pressed", String(values.has(day)));
            modified();
          },
          "rules-day",
        );
        b.setAttribute("aria-label", day);
        b.setAttribute(
          "aria-pressed",
          String((row["周几"] || []).includes(day)),
        );
        ds.append(b);
      });
      basics.append(node("p", "执行日", "rules-hint"), ds);
    }
    const dateFields = node("div", undefined, "rules-fields");
    dateFields.style.marginTop = "12px";
    dateFields.append(
      field(
        "开始日期",
        input(
          (row["date:下次日期:start"] || "").slice(0, 10),
          (v) => {
            if (v) row["date:下次日期:start"] = v;
            else delete row["date:下次日期:start"];
          },
          "date",
        ),
      ),
      field(
        "截止日期（含当天）",
        input(
          (row["date:重复截止:start"] || "").slice(0, 10),
          (v) => {
            if (v) row["date:重复截止:start"] = v;
            else delete row["date:重复截止:start"];
          },
          "date",
        ),
      ),
    );
    basics.append(dateFields);
    const complete = node("label", undefined, "rules-checkbox"),
      cb = node("input");
    cb.type = "checkbox";
    cb.checked = row["本次已完成"] === true || row["本次已完成"] === "__YES__";
    cb.onchange = () => {
      row["本次已完成"] = cb.checked;
      modified();
    };
    complete.append(cb, document.createTextNode("本次已完成（保留人工确认）"));
    basics.append(complete);
    const tasks = section("定期任务");
    let lines = taskLines(row["任务内容"]);
    lines.forEach((text, i) =>
      tasks.append(
        taskRow(
          row,
          text,
          (value) => {
            lines[i] = value;
            row["任务内容"] = lines.join("\n");
          },
          () => {
            lines.splice(i, 1);
            row["任务内容"] = lines.join("\n");
          },
        ),
      ),
    );
    tasks.append(
      button(
        "添加定期任务",
        () => {
          state.blankFrequency.set(row.id, "");
          modified();
          keepRender(renderList);
        },
        "rules-btn-small",
      ),
      presetControl(row, (value) => {
        row["任务内容"] = [...taskLines(row["任务内容"]), value].join("\n");
      }),
    );
    if (state.blankFrequency.has(row.id)) {
      tasks.append(
        taskRow(
          row,
          state.blankFrequency.get(row.id),
          (value) => {
            state.blankFrequency.set(row.id, value);
          },
          () => {
            state.blankFrequency.delete(row.id);
          },
        ),
      );
    }
    const special = section("布置细节"),
      specialFields = node("div", undefined, "rules-fields");
    specialFields.append(
      field(
        "单词方式",
        select(
          ["跟随任务内容", "仅听力", "仅阅读", "听读交替", "两科分别布置"].map(
            (x) => [x, x],
          ),
          row["单词布置方式"] || "跟随任务内容",
          (v) => {
            if (v === "跟随任务内容") delete row["单词布置方式"];
            else row["单词布置方式"] = v;
          },
        ),
      ),
      field(
        "阅读方式",
        select(
          [
            "跟随默认",
            "完整原卷",
            "仅同卷P1/P2",
            "跨卷P1/P2三篇",
            "老师安排",
          ].map((x) => [x, x]),
          row["特殊阅读规则"] || "跟随默认",
          (v) => {
            if (v === "跟随默认") delete row["特殊阅读规则"];
            else row["特殊阅读规则"] = v;
          },
        ),
      ),
    );
    special.append(specialFields);
    const foot = node("div", undefined, "rules-card-foot");
    foot.append(
      button("预览布置结果", () => showPreview(row.id), "rules-btn-small"),
      button(
        "移除此规则",
        () => {
          if (!globalThis.confirm("确定移除这条规则？已发布的作业不会删除。"))
            return;
          state.draft.frequency_rows = state.draft.frequency_rows.filter(
            (x) => x !== row,
          );
          modified();
          keepRender(renderList);
        },
        "rules-btn-small rules-btn-danger",
      ),
    );
    body.append(basics, tasks, special, foot);
    return card;
  }
  async function showPreview(key) {
    state.preview = true;
    state.previewKey = key;
    try {
      state.context = (await getContext(state.day)) || {};
      state.contextUnknown = false;
    } catch {
      state.context = {};
      state.contextUnknown = true;
    }
    keepRender(renderList);
    root.querySelector(".rules-preview")?.scrollIntoView({ block: "nearest" });
  }
  function previewPanel() {
    const box = node("section", undefined, "rules-preview");
    box.append(
      node("h3", "布置预览"),
      node(
        "p",
        "只读取规则与工作台已有回执，不发布作业、不查询实时完成状态。待核验的项目是否新增，由下一次例行决定。",
        "rules-hint",
      ),
    );
    if (state.contextUnknown || state.context.scheduleKnown === false)
      box.append(
        node(
          "p",
          "课表快照未读取或该日尚无快照。下面选择的课型仅用于模拟，不表示当天无课。",
          "rules-hint",
        ),
      );
    const options = [
      ...Object.entries(state.draft.attendance_rules || {}).map(([k, v]) => [
        k,
        v.name || k,
      ]),
      ...(state.draft.frequency_rows || []).map((r) => [
        r.id,
        r["学员"] + " · 定期任务",
      ]),
    ];
    if (!options.some(([k]) => k === state.previewKey))
      state.previewKey = options[0]?.[0] || "";
    const fields = node("div", undefined, "rules-preview-selects");
    const date = input(
      state.day,
      (v) => {
        if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
          state.day = v;
          void showPreview(state.previewKey);
        }
      },
      "date",
    );
    date.oninput = null;
    date.onchange = () => {
      if (date.value) {
        state.day = date.value;
        void showPreview(state.previewKey);
      }
    };
    fields.append(
      field("日期", date),
      field(
        "规则",
        select(options, state.previewKey, (value) => {
          state.previewKey = value;
          state.subject = "";
          void showPreview(value);
        }),
      ),
    );
    const profile = state.draft.attendance_rules?.[state.previewKey];
    const name = profile?.name || state.previewKey;
    const available = Object.keys(profile?.subject_rules || {});
    const lessonSubjects = (state.context.lessons || [])
      .filter(
        (x) =>
          clean(x.name) === clean(name) ||
          name.split(/[&/、]/).some((n) => clean(n) === clean(x.name)),
      )
      .flatMap((x) => x.subjects || []);
    fields.append(
      field(
        "预览课型",
        select(
          [
            ["none", "仅预览定期任务"],
            ...new Set([
              ...lessonSubjects,
              ...available,
              ...["听力", "口语", "阅读", "写作", "语法"],
            ]),
          ].map((x) => (Array.isArray(x) ? x : [x, x + "课"])),
          state.subject || lessonSubjects[0] || "none",
          (value) => {
            state.subject = value;
            keepRender(renderList);
          },
        ),
      ),
    );
    box.append(fields);
    const subject = state.subject || lessonSubjects[0] || "none";
    const hasClass = subject !== "none";
    const memberNames =
      profile?.name
        ?.split(/[&/、]/)
        .map((x) => x.trim())
        .filter(Boolean) || [];
    const names = memberNames.length > 1 ? memberNames : [profile?.name || ""];
    const rows = [];
    if (profile)
      for (const studentName of names) {
        const list = previewRules(state.draft, {
          day: state.day,
          attendanceKey: state.previewKey,
          studentName,
          subjects: hasClass ? [subject] : [],
          hasClass,
          facts: state.context.facts || [],
        });
        for (const r of list) rows.push({ ...r, name: studentName });
      }
    if (!profile) {
      const r = state.draft.frequency_rows.find(
        (x) => x.id === state.previewKey,
      );
      if (r) {
        const dummy = {
          ...state.draft,
          attendance_rules: {
            [r.id]: { name: r["学员"], system: r.system, attendance_tasks: [] },
          },
        };
        rows.push(
          ...previewRules(dummy, {
            day: state.day,
            attendanceKey: r.id,
            hasClass: false,
            facts: state.context.facts || [],
          }),
        );
      }
    }
    const area = node("div", undefined, "rules-preview-rows");
    const labels = {
      auto: "待核验后新增",
      existing: "已有同名记录",
      blocked: "按规则停发",
      manual: "老师处理",
      invalid: "内容未完成",
      unknown: "待配置",
    };
    for (const r of rows) {
      const line = node("div", undefined, "rules-preview-row");
      line.append(
        tag(
          labels[r.mode] || "待配置",
          ["invalid", "unknown"].includes(r.mode)
            ? "warn"
            : r.mode === "existing"
              ? "good"
              : "",
        ),
        document.createTextNode(
          " " + (names.length > 1 ? r.name + "：" : "") + r.text,
        ),
        node("small", r.source + " · " + r.reason),
      );
      area.append(line);
    }
    if (!rows.length)
      area.append(
        node("p", "所选日期与课程没有符合条件的任务。", "rules-hint"),
      );
    box.append(
      area,
      button(
        "收起预览",
        () => {
          state.preview = false;
          keepRender(renderList);
        },
        "rules-btn-small",
      ),
    );
    return box;
  }
  function overrideContent(host) {
    for (const r of state.draft.overrides || []) {
      const card = node("div", undefined, "rules-override"),
        head = node("div", undefined, "rules-override-head");
      head.append(
        node(
          "strong",
          r.student +
            " · " +
            (r.subject || (r.kind === "vocab" && "单词") || "自动任务"),
        ),
        button(
          "恢复自动规则",
          () => {
            state.draft.overrides = state.draft.overrides.filter(
              (x) => x !== r,
            );
            modified();
            keepRender(renderList);
          },
          "rules-btn-small",
        ),
      );
      card.append(
        head,
        node(
          "p",
          (r.action === "pause" ? "暂停" : "老师处理") +
            " · " +
            (r.start || "立即") +
            " 至 " +
            (r.end || "另行恢复"),
          "rules-hint",
        ),
      );
      const fs = node("div", undefined, "rules-fields");
      fs.append(
        field(
          "开始日期",
          input(r.start || "", (v) => (r.start = v || null), "date"),
        ),
        field(
          "结束日期（含当天）",
          input(r.end || "", (v) => (r.end = v || null), "date"),
        ),
        field(
          "说明",
          input(r.reason || "", (v) => (r.reason = v)),
        ),
      );
      card.append(fs);
      host.append(card);
    }
    const card = node("div", undefined, "rules-override");
    card.append(node("h3", "添加临时安排"));
    const form = node("form");
    const name = input(state.overrideStudent || "", () => {});
    name.oninput = null;
    name.required = true;
    name.placeholder = "填写确切学员姓名";
    const subject = select(
      [
        ["all", "全部自动任务"],
        ["单词", "单词"],
        ...["听力", "口语", "阅读", "写作"].map((x) => [x, x]),
      ],
      "all",
      () => {},
    );
    subject.onchange = null;
    const action = select(
      [
        ["pause", "暂停"],
        ["teacher", "交老师处理"],
      ],
      "pause",
      () => {},
    );
    action.onchange = null;
    const fields = node("div", undefined, "rules-fields");
    fields.append(
      field("学员", name),
      field("任务范围", subject),
      field("处理方式", action),
    );
    form.append(fields);
    const add = node("button", "添加临时安排", "rules-btn rules-btn-primary");
    add.type = "submit";
    form.append(add);
    form.onsubmit = (e) => {
      e.preventDefault();
      if (!name.value.trim()) return;
      const item = {
        student: name.value.trim(),
        action: action.value,
        start: todayShanghai(),
        end: null,
        reason: "老师设置的临时安排",
      };
      if (subject.value === "all") item.kind = "automatic";
      else if (subject.value === "单词") item.kind = "vocab";
      else {
        item.kind = "suite";
        item.subject = subject.value;
      }
      state.draft.overrides ??= [];
      state.draft.overrides.push(item);
      modified();
      keepRender(renderList);
    };
    card.append(form);
    host.append(card);
  }
  function captureOpen() {
    for (const card of root.querySelectorAll('.rules-card')) {
      if (card.open) state.open.add(card.dataset.ruleKey);
      else state.open.delete(card.dataset.ruleKey);
    }
  }
  function renderList() {
    captureOpen();
    const host = root.querySelector(".rules-content");
    if (!host || !state.draft) return;
    host.replaceChildren();
    if (state.preview) host.append(previewPanel());
    const errors = node("div", undefined, "rules-error-list");
    for (const text of state.errors) errors.append(node("div", text));
    host.append(errors);
    if (state.tab === "overrides") {
      overrideContent(host);
      return;
    }
    const grid = node("div", undefined, "rules-grid"),
      q = state.search.toLowerCase();
    if (state.tab === "attendance") {
      for (const [key, rule] of Object.entries(
        state.draft.attendance_rules || {},
      ).sort((a, b) =>
        (a[1].name || a[0]).localeCompare(b[1].name || b[0], "zh-CN"),
      )) {
        if (
          q &&
          !(
            (rule.name || key) +
            " " +
            JSON.stringify(rule.subject_rules || {}) +
            " " +
            rule.vocab_task
          )
            .toLowerCase()
            .includes(q)
        )
          continue;
        if (
          state.system !== "all" &&
          (rule.system === "school" ? "other" : rule.system) !== state.system
        )
          continue;
        grid.append(attendanceCard(key, rule));
      }
    } else {
      for (const r of state.draft.frequency_rows || []) {
        if (q && !(r["学员"] + " " + r["任务内容"]).toLowerCase().includes(q))
          continue;
        if (state.system !== "all" && r.system !== state.system) continue;
        if (state.filter !== "all" && r["状态"] !== state.filter) continue;
        grid.append(frequencyCard(r));
      }
    }
    if (!grid.childElementCount)
      grid.append(node("div", "没有符合筛选条件的规则。", "rules-empty"));
    host.append(grid);
    updateDirty();
  }
  async function save() {
    const submitted = clone(state.draft);
    for (const [id, text] of state.blankFrequency) {
      const row = submitted.frequency_rows.find((r) => r.id === id);
      if (row && text.trim())
        row["任务内容"] = [...taskLines(row["任务内容"]), text.trim()].join(
          "\n",
        );
    }
    state.errors = validateDraft(submitted, state.base.payload);
    if ([...state.blankFrequency.values()].some((x) => !x.trim()))
      state.errors.unshift("请填完新增的定期任务，或删除空白行。");
    if (state.errors.length) {
      status("还有内容需要补充，已保留当前修改。", true);
      renderList();
      root
        .querySelector(".rules-error-list")
        ?.scrollIntoView({ block: "nearest" });
      return;
    }
    state.busy = true;
    updateDirty();
    status("正在保存并读回核验…");
    const pending = new Map(state.blankFrequency);
    try {
      const base = await saveCatalog(
        client,
        state.owner,
        state.base,
        submitted,
      );
      state.base = base;
      for (const [id, text] of pending)
        if (state.blankFrequency.get(id) === text) {
          const row = state.draft.frequency_rows.find((r) => r.id === id);
          if (row)
            row["任务内容"] = submitted.frequency_rows.find((r) => r.id === id)[
              "任务内容"
            ];
          state.blankFrequency.delete(id);
        }
      status("保存成功。将在下一次例行读取时生效；本次没有发布作业。");
    } catch (e) {
      status(
        e.message === "CONFLICT"
          ? "另一设备已修改规则。当前输入已保留，请先查看最新版本再合并。"
          : "保存读回未核实。当前输入已保留，请重读核对，不要反复保存。",
        true,
      );
    } finally {
      state.busy = false;
      updateDirty();
    }
  }
  function render() {
    captureOpen();
    root.replaceChildren();
    const wrap = node("div", undefined, "rules-wrapper"),
      header = node("header", undefined, "rules-header"),
      title = node("div");
    title.append(
      node("h2", "作业布置规则", "rules-title"),
      node("p", "先看摘要，展开编辑；保存后下一次例行生效。", "rules-subtitle"),
    );
    header.append(
      title,
      button(
        "×",
        () => {
          if (
            root.tagName !== "DIALOG" &&
            owners().length &&
            !globalThis.confirm(
              "有未保存的修改，关闭后仍可在本页重新打开继续编辑。确定关闭？",
            )
          )
            return;
          onClose?.();
        },
        "rules-close",
      ),
    );
    if (state.owner && state.draft) {
      const tabs = node("div", undefined, "rules-main-tabs");
      for (const [key, label] of [
        ["attendance", "随课规则"],
        ["frequency", "定期任务"],
        ["overrides", "临时安排"],
      ]) {
        const b = button(
          label,
          () => {
            state.tab = key;
            state.search = "";
            state.system = "all";
            render();
          },
          "rules-main-tab " + (state.tab === key ? "active" : ""),
        );
        b.setAttribute("aria-pressed", String(state.tab === key));
        tabs.append(b);
      }
      header.append(tabs);
    }
    wrap.append(header);
    if (state.owner && state.draft) {
      const tools = node("div", undefined, "rules-toolbar"),
        searchBox = node("div", undefined, "rules-search"),
        search = input(state.search, (v) => {
          state.search = v;
          renderList();
        });
      search.oninput = () => {
        state.search = search.value;
        renderList();
      };
      search.placeholder = "搜索学员、班级或任务";
      search.setAttribute("aria-label", "搜索规则");
      searchBox.append(search);
      tools.append(searchBox);
      if (state.tab !== "overrides") {
        tools.append(
          select(
            [["all", "全部体系"], ...Object.entries(SYSTEMS)],
            state.system,
            (v) => {
              state.system = v;
              renderList();
            },
          ),
        );
        if (state.tab === "frequency")
          tools.append(
            select(
              [
                ["all", "全部状态"],
                ["进行中", "进行中"],
                ["暂停", "暂停"],
              ],
              state.filter,
              (v) => {
                state.filter = v;
                renderList();
              },
            ),
            button(
              "新增定期规则",
              () => {
                const id = crypto.randomUUID();
                state.draft.frequency_rows.unshift({
                  id,
                  学员: "",
                  任务内容: "",
                  状态: "进行中",
                  形式: "线上",
                  重复: "每天",
                  周几: [],
                  system: "ielts",
                  _canonical_state: true,
                });
                state.open.add("frequency:" + id);
                state.blankFrequency.set(id, "");
                modified();
                renderList();
              },
              "rules-btn-primary",
            ),
          );
        tools.append(
          button("预览布置结果", () =>
            showPreview(
              state.previewKey ||
                Object.keys(state.draft.attendance_rules || {})[0] ||
                state.draft.frequency_rows?.[0]?.id,
            ),
          ),
        );
      }
      wrap.append(tools);
    }
    wrap.append(
      node(
        "div",
        state.status,
        "rules-status-bar" + (state.alert ? " alert" : ""),
      ),
    );
    const content = node("main", undefined, "rules-content");
    wrap.append(content);
    if (state.owner && !state.draft)
      content.append(button("重试读取", () => void load()));
    if (!state.owner) {
      const form = node("form", undefined, "rules-auth"),
        email = input("", () => {}, "email"),
        password = input("", () => {}, "password");
      email.oninput = null;
      password.oninput = null;
      email.required = true;
      email.autocomplete = "username";
      password.required = true;
      password.autocomplete = "current-password";
      form.append(
        node("h3", "登录工作台账号"),
        field("邮箱", email),
        field("密码", password),
      );
      const submit = node(
        "button",
        "登录并读取规则",
        "rules-btn rules-btn-primary",
      );
      submit.type = "submit";
      form.append(submit);
      form.onsubmit = async (e) => {
        e.preventDefault();
        submit.disabled = true;
        try {
          const r = await client.auth.signInWithPassword({
            email: email.value,
            password: password.value,
          });
          password.value = "";
          if (r.error) status("登录未成功，请核对账号。", true);
          else await load();
        } finally {
          submit.disabled = false;
        }
      };
      content.append(form);
    }
    if (state.owner && state.draft) {
      const footer = node("footer", undefined, "rules-footer"),
        left = node("div"),
        changes = node("details", undefined, "rules-changes");
      changes.append(
        node("summary", "", "rules-change-summary"),
        node("p", "", "rules-change-detail"),
      );
      left.append(
        changes,
        node("div", "只保存规则，不触发布置或微信推送。", "rules-save-note"),
      );
      const buttons = node("div", undefined, "rules-actions");
      buttons.append(
        button("重新读取", () => void load(true), "rules-btn-reload"),
        button("保存修改", () => void save(), "rules-btn-save"),
      );
      footer.append(left, buttons);
      wrap.append(footer);
    }
    root.append(wrap);
    if (state.owner && state.draft) {
      renderList();
      updateDirty();
    }
  }
  async function load(confirmDiscard = false) {
    if (
      confirmDiscard &&
      owners().length &&
      !globalThis.confirm("重新读取会放弃尚未保存的修改，是否继续？")
    )
      return;
    status("正在读取规则…");
    try {
      const session = await client.auth.getSession();
      if (!session.data?.session) {
        state.owner = null;
        render();
        return;
      }
      state.owner = session.data.session.user.id;
      const result = await client
        .from("wayon_rule_catalog")
        .select("revision,payload")
        .eq("owner_id", state.owner)
        .maybeSingle();
      if (result.error || !result.data) throw Error("READ_FAILED");
      state.base = clone(result.data);
      state.draft = clone(result.data.payload);
      state.blankFrequency = new Map();
      state.errors = [];
      state.status = "已读取最新规则。展开卡片即可编辑。";
      state.alert = false;
      render();
    } catch {
      status("规则未能读取，保留当前输入，请稍后重试。", true);
      if (!state.draft) render();
    }
  }
  state.blankFrequency = new Map();
  await load();
  return {
    getDraft: () => clone(state.draft),
    getBase: () => clone(state.base),
    reload: () => load(true),
  };
}
