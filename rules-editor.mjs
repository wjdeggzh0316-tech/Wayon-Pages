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

const SYSTEM_CONFIG = {
  ielts: { label: '雅思', en: 'IELTS', category: 'ielts', bg: '#eaf3ff', fg: '#0071e3', border: 'rgba(0,113,227,0.25)' },
  toefl: { label: '托福', en: 'TOEFL', category: 'toefl', bg: '#f3e8ff', fg: '#7c3aed', border: 'rgba(124,58,237,0.25)' },
  sat: { label: 'SAT', en: 'SAT', category: 'sat', bg: '#fef3c7', fg: '#b45309', border: 'rgba(180,83,9,0.25)' },
  ability: { label: '语言能力提升', en: 'Ability', category: 'other', bg: '#ecfdf5', fg: '#059669', border: 'rgba(5,150,105,0.25)' },
  school: { label: '校内英语', en: 'School', category: 'other', bg: '#dcfce7', fg: '#15803d', border: 'rgba(21,128,61,0.25)' },
  other: { label: '其他', en: 'Other', category: 'other', bg: '#f3f4f6', fg: '#4b5563', border: 'rgba(75,85,99,0.25)' },
  general: { label: '其他', en: 'General', category: 'other', bg: '#f3f4f6', fg: '#4b5563', border: 'rgba(75,85,99,0.25)' }
};

const STUDENT_SYSTEM_MAP = {
  // 雅思
  '黄子珊': 'ielts', '聂彦如': 'ielts', '陈书进': 'ielts', '周家琪': 'ielts',
  '潘韬薄': 'ielts', '苏顺平': 'ielts', '戴荧': 'ielts', '汤馨然': 'ielts',
  '马浩岚': 'ielts', '岳璐宇': 'ielts', '祝乐言': 'ielts', '徐嘉言': 'ielts',
  '李培生': 'ielts', '李培生雅思体验课': 'ielts', '陈芊妤': 'ielts',
  // 托福
  'frank': 'toefl', 'leo': 'toefl', 'iven': 'toefl', 'dana': 'toefl',
  '王子居': 'toefl', 'andy': 'toefl', '何昊隆': 'toefl', 'dino': 'toefl',
  '黄号然': 'toefl', 'tiger': 'toefl', '卢泰戈': 'toefl',
  // SAT
  'charlotte': 'sat', 'jack': 'sat', '郭璟jack': 'sat', 'george': 'sat',
  'george吴洋亿': 'sat', '盛馨雨': 'sat', '沈思齐': 'sat',
  // 语言能力提升 (Leo 2026-10-24：代佳鸣、赖晨曦为语言能力提升)
  '丁嘉宝': 'ability', '赵梓轩': 'ability', '代佳鸣': 'ability', '赖晨曦': 'ability',
  '李洪睿': 'ability', '李洪睿john': 'ability', '王明泽': 'ability', '李子熙': 'ability',
  'ray': 'ability',
  // 校内 / 高中 (归入其他)
  'amy': 'school'
};

// 2026-10-24 Leo 铁律：随课任务以班级为单位，合班学员不拆开（Leo&Iven、彦如&陈书进等）
export const MULTI_CLASS_SPECS = [
  {
    key: 'leo&iven',
    name: 'Leo & Iven',
    system: 'toefl',
    members: ['leo', 'iven', 'ivan', 'leo&ivan', 'leo&iven', 'leo&iven-托福强化班'],
    defaultRule: {
      name: 'Leo & Iven',
      system: 'toefl',
      vocab_task: '系统内托福单词100个（50*2）',
      attendance_tasks: [],
      subject_rules: {
        '口语': ['托福阅读一套', '托福听力一套'],
        '阅读': ['托福听力一套', '托福口语一套'],
        '听力': ['5篇完形填空', '托福口语一套'],
        '写作': ['5篇完形填空', '托福口语一套', '托福听力一套']
      }
    }
  },
  {
    key: '聂彦如&陈书进',
    name: '聂彦如 & 陈书进',
    system: 'ielts',
    members: ['聂彦如', '陈书进', '彦如', '书进', '张彦如', '陈书进/聂彦如', '聂彦如&陈书进', '聂彦如&陈书进-雅思强化班'],
    defaultRule: {
      name: '聂彦如 & 陈书进',
      system: 'ielts',
      vocab_task: '系统内单词任务（听力*50+阅读*50）',
      attendance_tasks: []
    }
  },
  {
    key: '周家琪/潘韬薄/苏顺平',
    name: '周家琪 / 潘韬薄 / 苏顺平',
    system: 'ielts',
    members: ['周家琪', '潘韬薄', '苏顺平', '周家琪/潘韬薄/苏顺平', '三人班', '雅思基础班', '26年秋季雅思基础班'],
    defaultRule: {
      name: '周家琪 / 潘韬薄 / 苏顺平',
      system: 'ielts',
      vocab_task: '系统内单词任务（听力*50+阅读*50）',
      attendance_tasks: []
    }
  },
  {
    key: '戴荧&汤馨然',
    name: '戴荧 & 汤馨然',
    system: 'ielts',
    members: ['戴荧', '汤馨然', '戴荧&汤馨然', '戴荧&汤馨然-雅思强化'],
    defaultRule: {
      name: '戴荧 & 汤馨然',
      system: 'ielts',
      vocab_task: '系统内单词任务（听力*15+阅读*15）',
      attendance_tasks: []
    }
  },
  {
    key: '王明泽&李子熙',
    name: '王明泽 & 李子熙',
    system: 'ability',
    members: ['王明泽', '李子熙', '王明泽&李子熙', '王明泽&李子熙-sat'],
    defaultRule: {
      name: '王明泽 & 李子熙',
      system: 'ability',
      vocab_task: null,
      attendance_tasks: []
    }
  },
  {
    key: '王子居&andy',
    name: '王子居 & Andy',
    system: 'toefl',
    members: ['王子居', 'andy', '王子居&andy', '王子居&andy-sat'],
    defaultRule: {
      name: '王子居 & Andy',
      system: 'toefl',
      vocab_task: '系统内托福单词100个（50*2）',
      attendance_tasks: []
    }
  }
];

const clean = s => String(s || '').trim().replace(/[【】「」\s]/g, '').toLowerCase();
const clone = obj => typeof structuredClone === 'function' ? structuredClone(obj) : JSON.parse(JSON.stringify(obj));

export function inferStudentSystem(name, attRule, taskText) {
  if (attRule && typeof attRule === 'object') {
    if (attRule.system && SYSTEM_CONFIG[attRule.system]) {
      return attRule.system;
    }
    const c = String(attRule['课程'] || '').toLowerCase();
    if (c.includes('雅思')) return 'ielts';
    if (c.includes('托福')) return 'toefl';
    if (c.includes('sat')) return 'sat';
    if (c.includes('能力') || c.includes('提升') || c.includes('语法')) return 'ability';
    if (c.includes('校内') || c.includes('高中')) return 'school';
  }
  const k = clean(name);
  if (STUDENT_SYSTEM_MAP[k]) return STUDENT_SYSTEM_MAP[k];
  for (const [key, sys] of Object.entries(STUDENT_SYSTEM_MAP)) {
    if (k.includes(key) || key.includes(k)) return sys;
  }
  const text = String(taskText || '').toLowerCase();
  if (text.includes('雅思') || text.includes('真经') || text.includes('王陆') || text.includes('听力*50')) return 'ielts';
  if (text.includes('托福') || text.includes('完形')) return 'toefl';
  if (text.includes('sat')) return 'sat';
  if (text.includes('能力') || text.includes('提升') || text.includes('语法课')) return 'ability';
  if (text.includes('校内') || text.includes('高中')) return 'school';
  return 'other';
}

function injectStyles(document) {
  if (document.getElementById('wayon-rules-editor-styles')) return;
  const style = document.createElement('style');
  style.id = 'wayon-rules-editor-styles';
  style.textContent = `
.wayon-rules-dialog:not([open]){display:none!important}
.wayon-rules-dialog[open]{position:fixed!important;inset:0!important;margin:auto!important;z-index:99999!important;display:flex!important;flex-direction:column!important;box-sizing:border-box;width:min(1140px,calc(100vw - 24px));height:min(92vh,940px);max-height:92vh;padding:0;border:1px solid var(--line-strong,rgba(0,0,0,0.12));border-radius:20px;background:var(--bg,#f5f5f7);color:var(--fg,#1d1d1f);box-shadow:0 28px 90px rgba(0,0,0,0.35);overflow:hidden;font-family:var(--sans,-apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue","PingFang SC",sans-serif)}
.wayon-rules-dialog::backdrop{background:rgba(0,0,0,0.45);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)}

.rules-wrapper{display:flex;flex-direction:column;height:100%;min-height:0;width:100%;overflow:hidden;background:var(--bg,#f5f5f7)}

/* Top Header */
.rules-header{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:12px 22px;background:var(--card,#fff);border-bottom:1px solid var(--line,rgba(0,0,0,0.08));flex:none;box-sizing:border-box}
.rules-title-box{display:flex;align-items:center;gap:10px;min-width:0;flex:none}
.rules-title{font-size:18px;font-weight:700;letter-spacing:-.02em;margin:0;color:var(--fg,#1d1d1f);white-space:nowrap}
.rules-rev{display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:650;padding:2px 7px;border-radius:6px;background:var(--accent-subtle,#eaf3ff);color:var(--accent,#0071e3);font-variant-numeric:tabular-nums}

/* Two Primary Categories: Segmented Tabs in Header */
.rules-main-tabs{display:inline-flex;align-items:center;padding:3px;background:var(--bg,#f0f0f2);border-radius:10px;border:1px solid var(--line,rgba(0,0,0,0.06));gap:2px}
.rules-main-tab{display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 14px;border:0;border-radius:8px;background:transparent;color:var(--muted,#666);font-size:13px;font-weight:550;cursor:pointer;transition:all .15s ease;white-space:nowrap}
.rules-main-tab:hover{color:var(--fg,#1d1d1f)}
.rules-main-tab.active{background:var(--card,#fff);color:var(--fg,#1d1d1f);font-weight:650;box-shadow:0 1px 3px rgba(0,0,0,0.08)}
.rules-main-tab .tab-badge{display:inline-block;padding:1px 6px;border-radius:10px;background:rgba(0,0,0,0.06);color:var(--muted,#555);font-size:11px;font-weight:600}
.rules-main-tab.active .tab-badge{background:var(--accent-subtle,#eaf3ff);color:var(--accent,#0071e3)}

.rules-header-actions{display:flex;align-items:center;gap:8px;flex:none}
.rules-btn-save{min-height:32px;height:32px;padding:0 14px;border-radius:8px;border:0;background:var(--accent,#0071e3);color:#fff;font-size:12.5px;font-weight:600;cursor:pointer;transition:all .15s;display:inline-flex;align-items:center;gap:6px}
.rules-btn-save:hover{filter:brightness(1.08)}
.rules-btn-save:disabled{opacity:.5;cursor:default}
.rules-btn-reload{min-height:32px;height:32px;padding:0 10px;border-radius:8px;border:1px solid var(--line-strong,rgba(0,0,0,0.15));background:var(--card,#fff);color:var(--fg,#1d1d1f);font-size:12.5px;font-weight:500;cursor:pointer}
.rules-btn-reload:hover{background:var(--line,rgba(0,0,0,0.05))}
.rules-close{width:30px;height:30px;border-radius:50%;border:0;background:var(--line,rgba(0,0,0,0.06));color:var(--muted,#666);font-size:18px;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;transition:all .15s ease;line-height:1}
.rules-close:hover{background:var(--line-strong,rgba(0,0,0,0.12));color:var(--fg,#1d1d1f)}

/* Status Bar */
.rules-status-bar{padding:6px 22px;background:var(--card,#fff);border-bottom:1px solid var(--line,rgba(0,0,0,0.06));font-size:11.5px;line-height:1.4;color:var(--muted,#666);display:flex;align-items:center;justify-content:space-between;flex:none}
.rules-status-bar.alert{color:var(--bad,#d93025);background:#fff1f0}

/* Sub-toolbar with filter clusters */
.rules-toolbar{display:flex;flex-wrap:wrap;align-items:center;gap:10px 14px;padding:10px 22px;background:var(--card,#fff);border-bottom:1px solid var(--line,rgba(0,0,0,0.08));flex:none}
.rules-search{position:relative;width:190px;min-width:150px;flex:none}
.rules-search input{width:100%;height:30px;padding:0 10px 0 28px;border:1px solid var(--line-strong,rgba(0,0,0,0.15));border-radius:8px;background:var(--bg,#f5f5f7);color:var(--fg,#1d1d1f);font-size:12px;outline:none;box-sizing:border-box}
.rules-search input:focus{border-color:var(--accent,#0071e3);box-shadow:0 0 0 2px var(--accent-subtle,#eaf3ff)}
.rules-search svg{position:absolute;left:8px;top:8px;width:14px;height:14px;color:var(--muted,#888);pointer-events:none}

.filter-cluster{display:flex;align-items:center;gap:10px;flex-wrap:wrap;flex:1 1 auto}
.filter-group{display:inline-flex;align-items:center;gap:5px}
.filter-label{font-size:11px;font-weight:600;color:var(--muted,#777);text-transform:uppercase;letter-spacing:.02em;white-space:nowrap}
.filter-pills{display:inline-flex;align-items:center;gap:2px;background:var(--bg,#f0f0f2);padding:2px;border-radius:8px;border:1px solid var(--line,rgba(0,0,0,0.05))}
.filter-pill{height:25px;padding:0 9px;border-radius:6px;border:0;background:transparent;color:var(--muted,#666);font-size:11.5px;font-weight:500;cursor:pointer;white-space:nowrap;transition:all .12s ease}
.filter-pill:hover{color:var(--fg,#1d1d1f)}
.filter-pill.active{background:var(--card,#fff);color:var(--accent,#0071e3);font-weight:650;box-shadow:0 1px 2px rgba(0,0,0,0.06)}

.rules-btn-add{margin-left:auto;height:28px;padding:0 10px;border-radius:7px;border:1px dashed var(--accent,#0071e3);background:var(--accent-subtle,#eaf3ff);color:var(--accent,#0071e3);font-size:11.5px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:4px;transition:all .15s;white-space:nowrap}
.rules-btn-add:hover{background:var(--accent,#0071e3);color:#fff}

/* Content Area */
.rules-content{flex:1;overflow-y:auto;padding:18px 22px;display:flex;flex-direction:column;gap:16px;overscroll-behavior:contain}
.rules-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(420px,1fr));gap:16px}
@media(max-width:599px){.rules-grid{grid-template-columns:1fr}}

/* Generic Rule Card */
.rules-card{background:var(--card,#fff);border:1px solid var(--line,rgba(0,0,0,0.08));border-radius:16px;padding:18px 20px;box-shadow:0 1px 3px rgba(0,0,0,0.02);display:flex;flex-direction:column;gap:12px;transition:all .15s ease}
.rules-card:hover{border-color:var(--line-strong,rgba(0,0,0,0.18));box-shadow:0 3px 12px rgba(0,0,0,0.04)}
.rules-card.is-paused{background:rgba(250,250,252,0.8);border-color:rgba(0,0,0,0.06)}
.rules-card.is-paused .rules-card-title{color:var(--muted,#777)}

.rules-card-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:2px}
.rules-student-badge{display:flex;align-items:center;gap:8px;min-width:0;flex-wrap:wrap}
.rules-card-title{font-size:19px;font-weight:700;letter-spacing:-.015em;margin:0;color:var(--fg,#1d1d1f);white-space:nowrap}
.rules-sys-tag{font-size:11.5px;font-weight:600;padding:2px 8px;border-radius:6px;border:1px solid transparent;white-space:nowrap}

/* Universal vs Special Rule Tag */
.rule-type-tag{font-size:11px;font-weight:600;padding:2px 7px;border-radius:6px;white-space:nowrap}
.rule-type-tag.standard{background:#f3f4f6;color:#6b7280}
.rule-type-tag.special{background:#fff8e8;color:#b45309;border:1px solid #fde68a}

/* Status Pill Toggle */
.rules-state-toggle{display:inline-flex;align-items:center;gap:4px;height:28px;padding:0 10px;border-radius:7px;border:1px solid transparent;font-size:12px;font-weight:600;cursor:pointer;transition:all .15s ease;white-space:nowrap}
.rules-state-toggle.active{background:#edf7ef;color:#1e7e34;border-color:#c3e6cb}
.rules-state-toggle.paused{background:#fff1f0;color:#c53030;border-color:#fed7d7}

.rules-section-hdr{display:flex;align-items:center;gap:6px;font-size:13.5px;font-weight:650;color:var(--fg,#1d1d1f);margin:2px 0 0}
.rules-section-hdr svg{width:15px;height:15px;color:var(--muted,#666)}

/* Form controls inside cards */
.rules-field{display:flex;flex-direction:column;gap:5px}
.rules-label{font-size:12px;font-weight:600;color:var(--muted,#666);display:flex;align-items:center;justify-content:space-between}
.rules-input,.rules-textarea,.rules-select{box-sizing:border-box;width:100%;border:1px solid var(--line-strong,rgba(0,0,0,0.14));border-radius:8px;background:var(--bg,#f8f8fa);color:var(--fg,#1d1d1f);font-size:13px;padding:7px 10px;outline:none;font-family:inherit;transition:border-color .15s}
.rules-input:focus,.rules-textarea:focus,.rules-select:focus{border-color:var(--accent,#0071e3);background:#fff;box-shadow:0 0 0 2px var(--accent-subtle,#eaf3ff)}
.rules-textarea{min-height:64px;resize:vertical;line-height:1.5}

/* Execution frequency / format buttons */
.rules-seg-group{display:flex;align-items:center;gap:4px;flex-wrap:wrap}
.rules-seg-btn{height:28px;padding:0 12px;border-radius:6px;border:1px solid var(--line-strong,rgba(0,0,0,0.14));background:var(--card,#fff);color:var(--muted,#666);font-size:12px;font-weight:500;cursor:pointer;transition:all .12s}
.rules-seg-btn:hover{color:var(--fg,#1d1d1f);background:var(--line,rgba(0,0,0,0.04))}
.rules-seg-btn.on{background:var(--accent,#0071e3);color:#fff;border-color:var(--accent,#0071e3);font-weight:600;box-shadow:0 1px 3px rgba(0,113,227,0.25)}

.rules-days-group{display:flex;gap:4px;align-items:center;flex-wrap:wrap;margin-top:4px}
.rules-day-btn{width:28px;height:28px;padding:0;border-radius:6px;border:1px solid var(--line-strong,rgba(0,0,0,0.14));background:var(--card,#fff);color:var(--muted,#666);font-size:12px;font-weight:550;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;transition:all .12s}
.rules-day-btn.on{background:var(--accent,#0071e3);color:#fff;border-color:var(--accent,#0071e3);font-weight:650;box-shadow:0 1px 3px rgba(0,113,227,0.25)}

.rules-dates-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
@media(max-width:480px){.rules-dates-row{grid-template-columns:1fr}}

/* Special text rule banner (replaces bulky dropdowns) */
.rules-special-box{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 12px;background:#fff8e8;border:1px solid #fde68a;border-radius:8px;font-size:12px;color:#854d0e}
.rules-special-box .sp-left{display:flex;align-items:center;gap:6px;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rules-special-box .sp-actions{display:flex;gap:6px;flex:none}
.rules-special-btn{background:transparent;border:0;color:var(--accent,#0071e3);font-size:11.5px;font-weight:600;cursor:pointer;padding:0}
.rules-special-btn.reset{color:var(--muted,#666)}
.rules-special-btn:hover{text-decoration:underline}

.rules-special-drawer{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:10px;background:var(--bg,#f8f8fa);border-radius:8px;border:1px dashed var(--line-strong,rgba(0,0,0,0.15));margin-top:2px}
@media(max-width:480px){.rules-special-drawer{grid-template-columns:1fr}}

.rules-card-foot{display:flex;align-items:center;justify-content:space-between;padding-top:10px;border-top:1px solid var(--line,rgba(0,0,0,0.06));margin-top:4px}
.rules-btn-del{border:0;background:transparent;color:var(--bad,#d93025);font-size:12px;font-weight:550;cursor:pointer;padding:4px 8px;border-radius:5px;transition:all .12s}
.rules-btn-del:hover{background:#fff1f0}

/* Attendance card specifics */
.rules-att-tasks{display:flex;flex-direction:column;gap:6px;margin-top:2px}
.rules-att-task-row{display:flex;align-items:center;gap:6px}
.rules-task-badge{font-size:10.5px;font-weight:600;padding:2px 6px;border-radius:4px;background:rgba(0,0,0,0.05);color:var(--muted,#666);flex-shrink:0;letter-spacing:0.02em}
.rules-task-badge.vocab{background:var(--accent-subtle,#eaf3ff);color:var(--accent,#0071e3)}
.rules-att-task-del{width:24px;height:24px;border:0;background:transparent;color:var(--muted,#888);cursor:pointer;border-radius:4px;display:inline-flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0}
.rules-att-task-del:hover{color:var(--bad,#d93025);background:#fff1f0}
.rules-quick-presets{display:flex;gap:5px;flex-wrap:wrap;margin-top:3px;margin-bottom:6px}
.rules-preset-chip{height:24px;padding:0 8px;border-radius:5px;border:1px solid var(--line-strong,rgba(0,0,0,0.14));background:var(--card,#fff);color:var(--muted,#555);font-size:11.5px;font-weight:500;cursor:pointer;display:inline-flex;align-items:center;transition:all .12s}
.rules-preset-chip:hover{color:var(--accent,#0071e3);border-color:var(--accent,#0071e3);background:var(--accent-subtle,#eaf3ff)}
.rules-quick-sel{height:28px;padding:0 6px;font-size:11.5px;font-weight:550;color:var(--muted,#555);background:var(--card,#fff);border:1px solid var(--line-strong,rgba(0,0,0,0.14));border-radius:6px;cursor:pointer;flex-shrink:0;width:auto;min-width:96px;transition:all .15s ease}
.rules-quick-sel:hover{color:var(--accent,#0071e3);border-color:var(--accent,#0071e3);background:var(--accent-subtle,#eaf3ff)}

/* Subject Rules */
.rules-subj-section{margin-top:10px;padding-top:10px;border-top:1px dashed var(--line,rgba(0,0,0,0.1));display:flex;flex-direction:column;gap:8px}
.rules-subj-header{display:flex;align-items:center;justify-content:space-between;font-size:12px;font-weight:650;color:var(--ink,#1d1d1f)}
.rules-subj-box{background:var(--bg,#f8f8fa);border:1px solid var(--line,rgba(0,0,0,0.08));border-radius:8px;padding:8px 10px;display:flex;flex-direction:column;gap:6px}
.rules-subj-box-head{display:flex;align-items:center;justify-content:space-between}
.rules-subj-tag{font-size:11.5px;font-weight:600;padding:2px 7px;border-radius:4px;background:#eef5fc;color:#185abc;border:1px solid #d2e3fc}
.rules-subj-remove{font-size:11.5px;color:var(--bad,#d93025);background:none;border:none;cursor:pointer;padding:2px 5px;border-radius:4px}
.rules-subj-remove:hover{background:#fff1f0}
.rules-subj-chips{display:flex;gap:5px;flex-wrap:wrap;align-items:center;margin-top:4px}

/* Auth form */
.rules-auth-card{max-width:380px;margin:50px auto;padding:24px;border-radius:16px;border:1px solid var(--line,rgba(0,0,0,0.1));background:var(--card,#fff);box-shadow:0 10px 30px rgba(0,0,0,0.05);display:flex;flex-direction:column;gap:14px}
.rules-auth-card h3{margin:0;font-size:17px;font-weight:650}

.rules-empty-state{padding:48px 20px;text-align:center;color:var(--muted);font-size:13.5px;background:var(--card);border-radius:14px;border:1px solid var(--line,rgba(0,0,0,0.08));grid-column:1/-1}
`;
  document.head.append(style);
}

export async function mountRules({ document, client, container, onClose }) {
  injectStyles(document);
  const root = container || document.getElementById('rules') || document.body;

  const state = {
    base: null,
    draft: null,
    owner: null,
    category: 'attendance', // 'attendance' (随课规则) | 'frequency' (非随课规则)
    // Non-attendance (frequency) filters requested by Leo:
    // 1: 状态 (全部 | 进行中 | 暂停)
    freqStatus: 'all', // 'all' | 'active' | 'paused'
    // 2: 通用学科分类 (全部 | 雅思 | 托福 | SAT | 其他)
    freqSystem: 'all', // 'all' | 'ielts' | 'toefl' | 'sat' | 'other'
    // 3: 形式 (全部 | 自习 | 线上 - 线下即自习，仅保留自习与线上)
    freqMode: 'all', // 'all' | '自习' | '线上'
    // Attendance filters:
    attSystem: 'all',
    search: '',
    status: '正在连接…',
    isAlert: false,
    modified: false
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

  async function load() {
    status('正在读取统一规则库…');
    const { data: { session } } = await client.auth.getSession();
    if (!session) {
      state.owner = null;
      render();
      return;
    }
    state.owner = session.user.id;
    const { data, error } = await client
      .from('wayon_rule_catalog')
      .select('revision, payload')
      .eq('owner_id', state.owner)
      .maybeSingle();

    if (error || !data) {
      status('未找到规则数据，请核对权限或网络配置', true);
      render();
      return;
    }

    state.base = data;
    state.draft = clone(data.payload);

    // 自动清洗与规范化随课及非随课规则
    if (state.draft && state.draft.attendance_rules) {
      const att = state.draft.attendance_rules;
      // 1. 历史笔误矫正：张彦如 -> 聂彦如
      if (att['张彦如']) {
        const r = att['张彦如'];
        r.name = '聂彦如';
        r.system = 'ielts';
        att['聂彦如'] = r;
        delete att['张彦如'];
        state.modified = true;
      }
      // 2. 清理重复别名（解决多张 Ray / Jack 卡片问题）
      if (att['ray英文综合能力提升']) {
        delete att['ray英文综合能力提升'];
        state.modified = true;
      }
      if (att['郭璟jack'] && att['郭璟jack-sat']) {
        delete att['郭璟jack'];
        state.modified = true;
      }
      // 3. 学科体系归属对齐（Leo 2026-10-24 明确指示）
      if (att['代佳鸣']) att['代佳鸣'].system = 'ability';
      if (att['赖晨曦']) att['赖晨曦'].system = 'ability';
      if (att['何昊隆']) att['何昊隆'].system = 'toefl';
      if (att['黄号然']) att['黄号然'].system = 'toefl';
      if (att['tiger']) att['tiger'].system = 'toefl';
      if (att['Tiger']) att['Tiger'].system = 'toefl';
      // 4. 随课任务以班级为单位，合班学员不拆开（Leo 2026-10-24 明确指示）
      for (const spec of MULTI_CLASS_SPECS) {
        let targetRule = att[spec.key];
        if (!targetRule) {
          for (const m of spec.members) {
            if (att[m]) {
              targetRule = { ...att[m], name: spec.name, system: spec.system };
              break;
            }
          }
        }
        if (!targetRule) {
          targetRule = clone(spec.defaultRule);
        } else {
          targetRule.name = spec.name;
          if (!targetRule.system) targetRule.system = spec.system;
          if (spec.key === 'leo&iven' && !targetRule.subject_rules && spec.defaultRule.subject_rules) {
            targetRule.subject_rules = clone(spec.defaultRule.subject_rules);
            state.modified = true;
          }
        }
        att[spec.key] = targetRule;

        // 彻底删除班内单人拆开的随课规则条目（leo/iven/彦如/陈书进等）
        for (const m of spec.members) {
          if (m !== spec.key && att[m]) {
            delete att[m];
            state.modified = true;
          }
        }
      }
    }

    // 非随课规则去重与清洗（解决多张陈芊妤/马浩岚卡片问题）
    if (state.draft && Array.isArray(state.draft.frequency_rows)) {
      let seenCQY = false;
      const seenSignatures = new Set();
      const cleanedRows = [];
      for (const r of state.draft.frequency_rows) {
        const stu = clean(r['学员']);
        const task = clean(r['任务内容']);

        // 0. 赖晨曦为纯随课规则（在 attendance_rules 中维护），不属于非随课任务，彻底排除
        if (stu.includes('赖晨曦')) {
          state.modified = true;
          continue;
        }

        // 1. 陈芊妤历史重复条目去重：只保留 1 条
        if (stu.includes('陈芊妤') || stu.includes('芊妤')) {
          if (seenCQY) {
            state.modified = true;
            continue;
          }
          seenCQY = true;
        }

        // 2. 马浩岚（浩然）：剔除旧的单纯「每天50个单词」过期条目，保留最新的综合自习任务
        if (stu.includes('马浩岚') || stu.includes('马浩然') || stu.includes('浩岚') || stu.includes('浩然')) {
          if (task.includes('每天50个单词') || r['重复'] === '每天') {
            state.modified = true;
            continue;
          }
        }

        // 3. 通用完全重复保护
        const sig = `${stu}||${task}||${r['形式']}||${r['重复']}`;
        if (seenSignatures.has(sig)) {
          state.modified = true;
          continue;
        }
        seenSignatures.add(sig);

        // 学科体系对齐
        if (stu === '何昊隆' || stu === '黄号然' || stu === 'tiger' || stu === '卢泰戈') {
          if (!r.system) r.system = 'toefl';
        } else if (stu === '代佳鸣') {
          if (!r.system) r.system = 'ability';
        }

        cleanedRows.push(r);
      }
      state.draft.frequency_rows = cleanedRows;
    }

    state.modified = false;
    status(`✓ 已加载统一规则 · 版本 v${data.revision}`);
    render();
  }

  function markModified() {
    state.modified = true;
    const saveBtn = root.querySelector('.rules-btn-save');
    if (saveBtn) {
      saveBtn.style.boxShadow = '0 0 0 2px #fff, 0 0 0 4px var(--accent,#0071e3)';
    }
  }

  function render() {
    root.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.className = 'rules-wrapper';

    // 1. Header with title, 2 main categories, actions
    const header = document.createElement('div');
    header.className = 'rules-header';

    const titleBox = document.createElement('div');
    titleBox.className = 'rules-title-box';
    const h2 = document.createElement('h2');
    h2.className = 'rules-title';
    h2.textContent = '任务规则配置';
    const revSpan = document.createElement('span');
    revSpan.className = 'rules-rev';
    revSpan.textContent = state.base ? `v${state.base.revision}` : '连接中';
    titleBox.append(h2, revSpan);

    // If authenticated: show Category Tabs in Header
    if (state.owner && state.draft) {
      const attCount = Object.keys(state.draft.attendance_rules || {}).length;
      const freqCount = (state.draft.frequency_rows || []).length;

      const mainTabs = document.createElement('div');
      mainTabs.className = 'rules-main-tabs';
      mainTabs.setAttribute('role', 'tablist');

      // 1. 随课规则 Tab
      const attTab = document.createElement('button');
      attTab.type = 'button';
      attTab.className = 'rules-main-tab' + (state.category === 'attendance' ? ' active' : '');
      attTab.innerHTML = `随课规则 <span class="tab-badge">${attCount}</span>`;
      attTab.onclick = () => {
        state.category = 'attendance';
        render();
      };

      // 2. 非随课规则 Tab
      const freqTab = document.createElement('button');
      freqTab.type = 'button';
      freqTab.className = 'rules-main-tab' + (state.category === 'frequency' ? ' active' : '');
      freqTab.innerHTML = `非随课规则 <span class="tab-badge">${freqCount}</span>`;
      freqTab.onclick = () => {
        state.category = 'frequency';
        render();
      };

      mainTabs.append(attTab, freqTab);
      header.append(titleBox, mainTabs);
    } else {
      header.append(titleBox);
    }

    // Actions & Close
    const actBox = document.createElement('div');
    actBox.className = 'rules-header-actions';

    if (state.owner) {
      const reloadBtn = document.createElement('button');
      reloadBtn.type = 'button';
      reloadBtn.className = 'rules-btn-reload';
      reloadBtn.textContent = '重新读取';
      reloadBtn.onclick = () => load();

      const saveBtn = document.createElement('button');
      saveBtn.type = 'button';
      saveBtn.className = 'rules-btn-save';
      saveBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
          <polyline points="17 21 17 13 7 13 7 21"></polyline>
          <polyline points="7 3 7 8 15 8"></polyline>
        </svg>
        保存修改
      `;
      saveBtn.onclick = async () => {
        // Validate weekly rows
        for (const r of state.draft.frequency_rows || []) {
          if (r['重复'] === '每周固定几天' && (!r['周几'] || !r['周几'].length)) {
            status(`学员「${r['学员']}」的每周规则必须选择至少一个周几！`, true);
            return;
          }
        }
        saveBtn.disabled = true;
        status('正在保存并读回核验…');
        try {
          state.base = await saveCatalog(client, state.owner, state.base, state.draft);
          state.modified = false;
          status(`✓ 规则已更新并读回核验 · 当前版本 v${state.base.revision}，下次调度即时生效`);
          render();
        } catch (e) {
          status(
            e.message === 'CONFLICT'
              ? '⚠️ 另一设备已修改规则（版本冲突）。当前修改已保留，请重新读取后再次保存。'
              : '⚠️ 保存核验未通过，当前修改已保留，请重新读取核对。',
            true
          );
        } finally {
          saveBtn.disabled = false;
        }
      };

      actBox.append(reloadBtn, saveBtn);
    }

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
    actBox.append(closeBtn);
    header.append(actBox);

    wrapper.append(header);

    // If unauthenticated: render login
    if (!state.owner) {
      const authBox = document.createElement('div');
      authBox.className = 'rules-auth-card';
      authBox.innerHTML = `
        <h3>登录工作台账号</h3>
        <p style="font-size:13px;color:var(--muted);margin:0">统一规则库受鉴权保护，请先登录账号查看与编辑规则。</p>
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

    // Status bar
    const statusBar = document.createElement('div');
    statusBar.className = 'rules-status-bar' + (state.isAlert ? ' alert' : '');
    statusBar.textContent = state.status;
    wrapper.append(statusBar);

    // Sub-toolbar with filters & search
    const toolbar = document.createElement('div');
    toolbar.className = 'rules-toolbar';

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
    searchInput.placeholder = '搜索学员或任务内容...';
    searchInput.value = state.search;
    searchInput.oninput = () => {
      state.search = searchInput.value.trim().toLowerCase();
      renderContentList(contentArea);
    };
    searchBox.append(searchInput);
    toolbar.append(searchBox);

    const cluster = document.createElement('div');
    cluster.className = 'filter-cluster';

    if (state.category === 'frequency') {
      // ─────────────────────────────────────────────────────────────────────────────
      // 非随课规则三大 Filter 组 (Leo 明确要求: 1进行中/暂停, 2学科分类[雅思/托福/SAT/其他], 3自习或线上)
      // ─────────────────────────────────────────────────────────────────────────────

      // 1. 状态筛选 (进行中 / 暂停)
      const statusGrp = document.createElement('div');
      statusGrp.className = 'filter-group';
      statusGrp.innerHTML = '<span class="filter-label">状态:</span>';
      const statusPills = document.createElement('div');
      statusPills.className = 'filter-pills';
      for (const [val, lbl] of [['all', '全部'], ['active', '● 进行中'], ['paused', '⏸ 暂停']]) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'filter-pill' + (state.freqStatus === val ? ' active' : '');
        btn.textContent = lbl;
        btn.onclick = () => {
          state.freqStatus = val;
          render();
        };
        statusPills.append(btn);
      }
      statusGrp.append(statusPills);

      // 2. 学科分类按钮 (通用分类: 雅思、托福、SAT、其他)
      const sysGrp = document.createElement('div');
      sysGrp.className = 'filter-group';
      sysGrp.innerHTML = '<span class="filter-label">学科:</span>';
      const sysPills = document.createElement('div');
      sysPills.className = 'filter-pills';
      for (const [val, lbl] of [
        ['all', '全部学科'],
        ['ielts', '雅思'],
        ['toefl', '托福'],
        ['sat', 'SAT'],
        ['other', '其他']
      ]) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'filter-pill' + (state.freqSystem === val ? ' active' : '');
        btn.textContent = lbl;
        btn.onclick = () => {
          state.freqSystem = val;
          render();
        };
        sysPills.append(btn);
      }
      sysGrp.append(sysPills);

      // 3. 形式筛选 (Leo: 线下就是自习，留一个就行，只留自习与线上)
      const modeGrp = document.createElement('div');
      modeGrp.className = 'filter-group';
      modeGrp.innerHTML = '<span class="filter-label">形式:</span>';
      const modePills = document.createElement('div');
      modePills.className = 'filter-pills';
      for (const [val, lbl] of [['all', '全部形式'], ['自习', '自习'], ['线上', '线上']]) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'filter-pill' + (state.freqMode === val ? ' active' : '');
        btn.textContent = lbl;
        btn.onclick = () => {
          state.freqMode = val;
          render();
        };
        modePills.append(btn);
      }
      modeGrp.append(modePills);

      cluster.append(statusGrp, sysGrp, modeGrp);

      // + 新增非随课规则按钮
      const addBtn = document.createElement('button');
      addBtn.type = 'button';
      addBtn.className = 'rules-btn-add';
      addBtn.innerHTML = `
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
        新增非随课规则
      `;
      addBtn.onclick = () => {
        const newRow = {
          id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : 'row_' + Date.now(),
          学员: '新学员',
          任务内容: '新打底任务',
          状态: '进行中',
          重复: '每天',
          周几: [],
          形式: '自习'
        };
        state.draft.frequency_rows.unshift(newRow);
        markModified();
        render();
      };
      toolbar.append(cluster, addBtn);
    } else {
      // ─────────────────────────────────────────────────────────────────────────────
      // 随课规则 Filter (学科分类: 雅思、托福、SAT、其他)
      // ─────────────────────────────────────────────────────────────────────────────
      const sysGrp = document.createElement('div');
      sysGrp.className = 'filter-group';
      sysGrp.innerHTML = '<span class="filter-label">学科分类:</span>';
      const sysPills = document.createElement('div');
      sysPills.className = 'filter-pills';
      for (const [val, lbl] of [
        ['all', '全部学科'],
        ['ielts', '雅思'],
        ['toefl', '托福'],
        ['sat', 'SAT'],
        ['other', '其他']
      ]) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'filter-pill' + (state.attSystem === val ? ' active' : '');
        btn.textContent = lbl;
        btn.onclick = () => {
          state.attSystem = val;
          render();
        };
        sysPills.append(btn);
      }
      sysGrp.append(sysPills);
      cluster.append(sysGrp);
      toolbar.append(cluster);
    }

    wrapper.append(toolbar);

    // Content Area
    const contentArea = document.createElement('div');
    contentArea.className = 'rules-content';
    renderContentList(contentArea);

    wrapper.append(contentArea);
    root.append(wrapper);
  }

  function renderContentList(container) {
    container.innerHTML = '';
    const p = state.draft;
    if (!p) return;

    if (state.category === 'frequency') {
      // ─────────────────────────────────────────────────────────────────────────────
      // Render 非随课规则 (frequency_rows)
      // ─────────────────────────────────────────────────────────────────────────────
      let rows = (p.frequency_rows || []).slice();

      // 1. Status Filter
      if (state.freqStatus === 'active') {
        rows = rows.filter(r => r['状态'] === '进行中');
      } else if (state.freqStatus === 'paused') {
        rows = rows.filter(r => r['状态'] === '暂停');
      }

      // 2. System / Subject Filter (ielts, toefl, sat, other)
      if (state.freqSystem !== 'all') {
        rows = rows.filter(r => {
          const att = p.attendance_rules ? p.attendance_rules[clean(r['学员'])] : null;
          const sys = inferStudentSystem(r['学员'], att, r['任务内容']);
          const conf = SYSTEM_CONFIG[sys] || SYSTEM_CONFIG.other;
          return conf.category === state.freqSystem;
        });
      }

      // 3. Mode Filter (自习或线上，线下归入自习)
      if (state.freqMode === '自习') {
        rows = rows.filter(r => r['形式'] === '自习' || r['形式'] === '线下');
      } else if (state.freqMode === '线上') {
        rows = rows.filter(r => r['形式'] === '线上');
      }

      // 4. Search Filter
      if (state.search) {
        const q = state.search;
        rows = rows.filter(r =>
          String(r['学员'] || '').toLowerCase().includes(q) ||
          String(r['任务内容'] || '').toLowerCase().includes(q)
        );
      }

      if (!rows.length) {
        const empty = document.createElement('div');
        empty.className = 'rules-empty-state';
        empty.textContent = state.search ? `未找到符合条件的非随课规则「${state.search}」` : '此筛选条件下暂无非随课规则';
        container.append(empty);
        return;
      }

      const grid = document.createElement('div');
      grid.className = 'rules-grid';
      for (const r of rows) {
        grid.append(renderFrequencyCard(r));
      }
      container.append(grid);
    } else {
      // ─────────────────────────────────────────────────────────────────────────────
      // Render 随课规则 (attendance_rules)
      // ─────────────────────────────────────────────────────────────────────────────
      let entries = Object.entries(p.attendance_rules || {});

      // 1. System Filter (ielts, toefl, sat, other)
      if (state.attSystem !== 'all') {
        entries = entries.filter(([k, rule]) => {
          const sys = inferStudentSystem(rule.name || k, rule, rule.vocab_task);
          const conf = SYSTEM_CONFIG[sys] || SYSTEM_CONFIG.other;
          return conf.category === state.attSystem;
        });
      }

      // 2. Search Filter
      if (state.search) {
        const q = state.search;
        entries = entries.filter(([k, rule]) =>
          String(rule.name || k).toLowerCase().includes(q) ||
          String(rule.vocab_task || '').toLowerCase().includes(q) ||
          (Array.isArray(rule.attendance_tasks) && rule.attendance_tasks.some(t => String(t).toLowerCase().includes(q))) ||
          (rule.subject_rules && Object.values(rule.subject_rules).some(arr => Array.isArray(arr) && arr.some(t => String(t).toLowerCase().includes(q))))
        );
      }

      // 随课规则以班级为单位：过滤掉任何属于合班成员的单人条目（防残留，合班不拆开）
      const classMemberSet = new Set();
      for (const spec of MULTI_CLASS_SPECS) {
        for (const m of spec.members) {
          if (m !== spec.key) classMemberSet.add(clean(m));
        }
      }
      entries = entries.filter(([k, rule]) => {
        const kClean = clean(k);
        const nameClean = clean(rule.name || k);
        return !classMemberSet.has(kClean) && !classMemberSet.has(nameClean);
      });

      // Sort alphabetically by name
      entries.sort((a, b) => (a[1].name || a[0]).localeCompare(b[1].name || b[0], 'zh-CN'));

      if (!entries.length) {
        const empty = document.createElement('div');
        empty.className = 'rules-empty-state';
        empty.textContent = state.search ? `未找到匹配学员「${state.search}」的随课规则` : '此筛选条件下暂无随课规则';
        container.append(empty);
        return;
      }

      const grid = document.createElement('div');
      grid.className = 'rules-grid';
      const seenNames = new Set();
      for (const [key, rule] of entries) {
        let normName = clean(rule.name || key);
        if (normName === 'ivan') normName = 'iven';
        if (normName === 'leo&ivan') normName = 'leo&iven';
        if (seenNames.has(normName)) continue;
        seenNames.add(normName);
        grid.append(renderAttendanceCard(key, rule));
      }
      container.append(grid);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 非随课规则单卡片组件 (还原截图并移除多余下拉按钮，特殊规则转为优雅文字)
  // ─────────────────────────────────────────────────────────────────────────────
  function renderFrequencyCard(r) {
    const card = document.createElement('div');
    const isPaused = r['状态'] === '暂停';
    card.className = 'rules-card' + (isPaused ? ' is-paused' : '');

    const att = state.draft.attendance_rules ? state.draft.attendance_rules[clean(r['学员'])] : null;
    const sys = inferStudentSystem(r['学员'], att, r['任务内容']);
    const sysConf = SYSTEM_CONFIG[sys] || SYSTEM_CONFIG.general;

    // Check if this student has special non-default rules (特殊规则)
    const hasSpecialVocab = r['单词布置方式'] && r['单词布置方式'] !== '跟随任务内容';
    const hasSpecialReading = r['特殊阅读规则'] && r['特殊阅读规则'] !== '跟随默认';
    const isSpecialRule = hasSpecialVocab || hasSpecialReading;

    // Card Head: Student Name + System Pill + Standard/Special Pill + State Toggle
    const head = document.createElement('div');
    head.className = 'rules-card-head';

    const bLeft = document.createElement('div');
    bLeft.className = 'rules-student-badge';

    const nameInp = document.createElement('input');
    nameInp.className = 'rules-input';
    nameInp.style.cssText = 'font-size:18px;font-weight:700;width:120px;padding:3px 6px;height:32px;background:transparent;border-color:transparent';
    nameInp.value = r['学员'] || '';
    nameInp.title = '点击修改学员姓名';
    nameInp.onfocus = () => { nameInp.style.background = '#fff'; nameInp.style.borderColor = 'var(--line-strong)'; };
    nameInp.onblur = () => { nameInp.style.background = 'transparent'; nameInp.style.borderColor = 'transparent'; };
    nameInp.onchange = () => {
      r['学员'] = nameInp.value.trim() || r['学员'];
      markModified();
    };

    // Editable Subject / System Select
    const sysSel = document.createElement('select');
    sysSel.className = 'rules-select rules-sys-select';
    sysSel.title = '修改学科分类（雅思/托福/SAT/能力提升等）';
    sysSel.style.cssText = 'font-size:11.5px;padding:2px 8px;height:26px;width:auto;font-weight:600;border-radius:6px;cursor:pointer;transition:all .15s ease';
    for (const [k, conf] of Object.entries(SYSTEM_CONFIG)) {
      if (k === 'general') continue;
      const opt = document.createElement('option');
      opt.value = k;
      opt.textContent = conf.label + ' ' + conf.en;
      opt.selected = (r.system || sys) === k;
      sysSel.append(opt);
    }
    const applySysStyle = (k) => {
      const c = SYSTEM_CONFIG[k] || SYSTEM_CONFIG.general;
      sysSel.style.background = c.bg;
      sysSel.style.color = c.fg;
      sysSel.style.borderColor = c.border;
    };
    applySysStyle(r.system || sys);

    sysSel.onchange = () => {
      r.system = sysSel.value;
      const conf = SYSTEM_CONFIG[sysSel.value];
      if (conf) {
        r['课程'] = conf.label;
      }
      applySysStyle(sysSel.value);
      markModified();
      const stClean = clean(r['学员']);
      if (stClean) {
        STUDENT_SYSTEM_MAP[stClean] = sysSel.value;
      }
    };

    const typeTag = document.createElement('span');
    typeTag.className = 'rule-type-tag ' + (isSpecialRule ? 'special' : 'standard');
    typeTag.textContent = isSpecialRule ? '⚡ 特殊规则' : '通用规则';

    bLeft.append(nameInp, sysSel, typeTag);

    // State Toggle Button (● 进行中 / ⏸ 暂停)
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'rules-state-toggle ' + (isPaused ? 'paused' : 'active');
    toggle.textContent = isPaused ? '⏸ 暂停' : '● 进行中';
    toggle.title = isPaused ? '点击恢复进行中' : '点击暂停此规则';
    toggle.onclick = () => {
      r['状态'] = isPaused ? '进行中' : '暂停';
      markModified();
      renderContentList(root.querySelector('.rules-content'));
    };

    head.append(bLeft, toggle);

    // Section Title: 📅 自习与打底任务规则
    const secHdr = document.createElement('div');
    secHdr.className = 'rules-section-hdr';
    secHdr.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
        <line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line>
      </svg>
      自习与打底任务规则
    `;

    // 1. 检查频率 (Leo 指示: 随课分离出去了，按钮去掉！只保留「每天」和「每周固定几天」)
    const repField = document.createElement('div');
    repField.className = 'rules-field';
    const repLbl = document.createElement('span');
    repLbl.className = 'rules-label';
    repLbl.textContent = '检查频率';

    const repGroup = document.createElement('div');
    repGroup.className = 'rules-seg-group';
    // If old data was '随课/每天', normalize to '每天'
    if (r['重复'] === '随课/每天') r['重复'] = '每天';

    for (const opt of ['每天', '每周固定几天']) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'rules-seg-btn' + (r['重复'] === opt ? ' on' : '');
      b.textContent = opt;
      b.onclick = () => {
        r['重复'] = opt;
        if (opt === '每周固定几天' && (!r['周几'] || !r['周几'].length)) {
          r['周几'] = ['周五'];
        }
        markModified();
        renderContentList(root.querySelector('.rules-content'));
      };
      repGroup.append(b);
    }
    repField.append(repLbl, repGroup);

    // If 每周固定几天: 每周执行日
    if (r['重复'] === '每周固定几天') {
      const daysLbl = document.createElement('span');
      daysLbl.className = 'rules-label';
      daysLbl.style.marginTop = '4px';
      daysLbl.textContent = '每周执行日';

      const daysGroup = document.createElement('div');
      daysGroup.className = 'rules-days-group';
      const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
      const shortDays = ['一', '二', '三', '四', '五', '六', '日'];
      days.forEach((day, idx) => {
        const curDays = Array.isArray(r['周几']) ? r['周几'] : [];
        const isSelected = curDays.includes(day);
        const dB = document.createElement('button');
        dB.type = 'button';
        dB.className = 'rules-day-btn' + (isSelected ? ' on' : '');
        dB.textContent = shortDays[idx];
        dB.title = day;
        dB.onclick = () => {
          if (!Array.isArray(r['周几'])) r['周几'] = [];
          if (r['周几'].includes(day)) {
            r['周几'] = r['周几'].filter(d => d !== day);
          } else {
            r['周几'].push(day);
          }
          markModified();
          dB.classList.toggle('on', r['周几'].includes(day));
        };
        daysGroup.append(dB);
      });
      repField.append(daysLbl, daysGroup);
    }

    // 2. 执行形式 (Leo 指示: 线下就是自习，留一个就行！只保留「线上」和「自习」两个按钮)
    const modeField = document.createElement('div');
    modeField.className = 'rules-field';
    const modeLbl = document.createElement('span');
    modeLbl.className = 'rules-label';
    modeLbl.textContent = '执行形式';

    const modeGroup = document.createElement('div');
    modeGroup.className = 'rules-seg-group';
    // Normalize '线下' to '自习'
    const curMode = (r['形式'] === '线上') ? '线上' : '自习';

    for (const m of ['线上', '自习']) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'rules-seg-btn' + (curMode === m ? ' on' : '');
      b.textContent = m;
      b.onclick = () => {
        r['形式'] = m;
        markModified();
        modeGroup.querySelectorAll('.rules-seg-btn').forEach(btn => btn.classList.remove('on'));
        b.classList.add('on');
      };
      modeGroup.append(b);
    }
    modeField.append(modeLbl, modeGroup);

    // 3. 任务内容（支持具体数量，如：50个单词）
    const taskField = document.createElement('div');
    taskField.className = 'rules-field';
    const taskLbl = document.createElement('span');
    taskLbl.className = 'rules-label';
    taskLbl.textContent = '任务内容（支持具体数量，如：50个单词）';
    const taskTa = document.createElement('textarea');
    taskTa.className = 'rules-textarea';
    taskTa.value = r['任务内容'] || '';
    taskTa.placeholder = '输入任务详细描述…';
    taskTa.oninput = () => {
      r['任务内容'] = taskTa.value;
      markModified();
    };
    taskField.append(taskLbl, taskTa);

    // 4. 特殊规则设定 (转为优雅轻量文字提示，不放置多余的大下拉框！)
    let specialContainer = document.createElement('div');
    specialContainer.className = 'rules-field';

    const renderSpecialRuleUI = () => {
      specialContainer.innerHTML = '';
      const vMode = r['单词布置方式'];
      const rMode = r['特殊阅读规则'];
      const hasCustom = (vMode && vMode !== '跟随任务内容') || (rMode && rMode !== '跟随默认');

      if (hasCustom) {
        // Show clean, elegant text box instead of multiple bulky buttons
        const spBox = document.createElement('div');
        spBox.className = 'rules-special-box';
        const spLeft = document.createElement('div');
        spLeft.className = 'sp-left';
        spLeft.innerHTML = `<strong>⚡ 特殊规则：</strong>${vMode ? `单词: ${vMode} ` : ''}${rMode ? `阅读: ${rMode}` : ''}`;

        const spActions = document.createElement('div');
        spActions.className = 'sp-actions';

        const editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.className = 'rules-special-btn';
        editBtn.textContent = '修改';
        editBtn.onclick = () => showSpecialDrawer();

        const resetBtn = document.createElement('button');
        resetBtn.type = 'button';
        resetBtn.className = 'rules-special-btn reset';
        resetBtn.textContent = '重置为通用默认';
        resetBtn.onclick = () => {
          delete r['单词布置方式'];
          delete r['特殊阅读规则'];
          markModified();
          renderSpecialRuleUI();
          typeTag.className = 'rule-type-tag standard';
          typeTag.textContent = '通用规则';
        };

        spActions.append(editBtn, resetBtn);
        spBox.append(spLeft, spActions);
        specialContainer.append(spBox);
      } else {
        // If standard/default: discreet inline text button to avoid cluttering
        const addSpBtn = document.createElement('button');
        addSpBtn.type = 'button';
        addSpBtn.style.cssText = 'background:transparent;border:0;color:var(--muted);font-size:11.5px;text-align:left;cursor:pointer;padding:2px 0;text-decoration:underline';
        addSpBtn.textContent = '+ 设定特殊规则（单词布置方式 / 特殊阅读规则）';
        addSpBtn.onclick = () => showSpecialDrawer();
        specialContainer.append(addSpBtn);
      }
    };

    const showSpecialDrawer = () => {
      specialContainer.innerHTML = '';
      const drawer = document.createElement('div');
      drawer.className = 'rules-special-drawer';

      // 单词布置方式
      const vDiv = document.createElement('div');
      vDiv.className = 'rules-field';
      vDiv.innerHTML = '<span class="rules-label">单词布置方式</span>';
      const vSel = document.createElement('select');
      vSel.className = 'rules-select';
      for (const opt of ['跟随任务内容', '仅听力', '仅阅读', '听读交替', '两科分别布置']) {
        const o = document.createElement('option');
        o.value = opt;
        o.textContent = opt;
        o.selected = (r['单词布置方式'] || '跟随任务内容') === opt;
        vSel.append(o);
      }
      vSel.onchange = () => {
        if (vSel.value === '跟随任务内容') delete r['单词布置方式'];
        else r['单词布置方式'] = vSel.value;
        markModified();
      };
      vDiv.append(vSel);

      // 特殊阅读规则
      const rDiv = document.createElement('div');
      rDiv.className = 'rules-field';
      rDiv.innerHTML = '<span class="rules-label">特殊阅读规则</span>';
      const rSel = document.createElement('select');
      rSel.className = 'rules-select';
      for (const opt of ['跟随默认', '完整原卷', '仅同卷P1/P2', '跨卷P1/P2三篇', '老师安排']) {
        const o = document.createElement('option');
        o.value = opt;
        o.textContent = opt;
        o.selected = (r['特殊阅读规则'] || '跟随默认') === opt;
        rSel.append(o);
      }
      rSel.onchange = () => {
        if (rSel.value === '跟随默认') delete r['特殊阅读规则'];
        else r['特殊阅读规则'] = rSel.value;
        markModified();
      };
      rDiv.append(rSel);

      const doneBtn = document.createElement('button');
      doneBtn.type = 'button';
      doneBtn.className = 'rules-seg-btn on';
      doneBtn.style.gridColumn = '1/-1';
      doneBtn.textContent = '完成特殊规则设定';
      doneBtn.onclick = () => {
        renderSpecialRuleUI();
        const hasCustom = r['单词布置方式'] || r['特殊阅读规则'];
        typeTag.className = 'rule-type-tag ' + (hasCustom ? 'special' : 'standard');
        typeTag.textContent = hasCustom ? '⚡ 特殊规则' : '通用规则';
      };

      drawer.append(vDiv, rDiv, doneBtn);
      specialContainer.append(drawer);
    };

    renderSpecialRuleUI();

    // 5. 下次日期 & 截止日期
    const datesRow = document.createElement('div');
    datesRow.className = 'rules-dates-row';

    // 下次日期
    const nextField = document.createElement('div');
    nextField.className = 'rules-field';
    const nextLbl = document.createElement('span');
    nextLbl.className = 'rules-label';
    nextLbl.textContent = '下次日期';
    const nextInp = document.createElement('input');
    nextInp.type = 'date';
    nextInp.className = 'rules-input';
    nextInp.value = (r['date:下次日期:start'] || '').slice(0, 10);
    nextInp.onchange = () => {
      if (nextInp.value) r['date:下次日期:start'] = nextInp.value;
      else delete r['date:下次日期:start'];
      markModified();
    };
    nextField.append(nextLbl, nextInp);

    // 截止日期
    const dueField = document.createElement('div');
    dueField.className = 'rules-field';
    const dueLbl = document.createElement('span');
    dueLbl.className = 'rules-label';
    dueLbl.textContent = '截止日期';
    const dueInp = document.createElement('input');
    dueInp.type = 'date';
    dueInp.className = 'rules-input';
    dueInp.value = (r['date:重复截止:start'] || '').slice(0, 10);
    dueInp.onchange = () => {
      if (dueInp.value) r['date:重复截止:start'] = dueInp.value;
      else delete r['date:重复截止:start'];
      markModified();
    };
    dueField.append(dueLbl, dueInp);

    datesRow.append(nextField, dueField);

    // Card Foot: Delete button
    const foot = document.createElement('div');
    foot.className = 'rules-card-foot';
    const idHint = document.createElement('span');
    idHint.style.cssText = 'font-size:11px;color:var(--muted);font-family:monospace';
    idHint.textContent = r.id ? r.id.slice(0, 8) : '';

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'rules-btn-del';
    delBtn.textContent = '× 移除此项规则';
    delBtn.onclick = () => {
      if (confirm(`确定要移除学员「${r['学员']}」的此项规则吗？`)) {
        state.draft.frequency_rows = state.draft.frequency_rows.filter(item => item !== r);
        markModified();
        renderContentList(root.querySelector('.rules-content'));
      }
    };
    foot.append(idHint, delBtn);

    card.append(head, secHdr, repField, modeField, taskField, specialContainer, datesRow, foot);
    return card;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 随课规则单卡片组件
  // ─────────────────────────────────────────────────────────────────────────────
  function renderAttendanceCard(key, rule) {
    const card = document.createElement('div');
    card.className = 'rules-card';

    let displayName = rule.name || key;
    if (displayName.toLowerCase() === 'ivan') displayName = 'Iven';
    if (displayName.toLowerCase() === 'leo & ivan') displayName = 'Leo & Iven';
    const sys = inferStudentSystem(displayName, rule, rule.vocab_task);
    const sysConf = SYSTEM_CONFIG[sys] || SYSTEM_CONFIG.general;

    // Head: Student Name + System Select
    const head = document.createElement('div');
    head.className = 'rules-card-head';

    const bLeft = document.createElement('div');
    bLeft.className = 'rules-student-badge';
    const nameEl = document.createElement('h3');
    nameEl.className = 'rules-card-title';
    nameEl.textContent = displayName;

    const sysSel = document.createElement('select');
    sysSel.className = 'rules-select rules-sys-select';
    sysSel.title = '修改学科分类（雅思/托福/SAT/能力提升等）';
    sysSel.style.cssText = 'font-size:11.5px;padding:2px 8px;height:26px;width:auto;font-weight:600;border-radius:6px;cursor:pointer;transition:all .15s ease';
    for (const [k, conf] of Object.entries(SYSTEM_CONFIG)) {
      if (k === 'general') continue;
      const opt = document.createElement('option');
      opt.value = k;
      opt.textContent = conf.label + ' ' + conf.en;
      opt.selected = (rule.system || sys) === k;
      sysSel.append(opt);
    }
    const applyAttSysStyle = (k) => {
      const c = SYSTEM_CONFIG[k] || SYSTEM_CONFIG.general;
      sysSel.style.background = c.bg;
      sysSel.style.color = c.fg;
      sysSel.style.borderColor = c.border;
    };
    applyAttSysStyle(rule.system || sys);

    sysSel.onchange = () => {
      rule.system = sysSel.value;
      applyAttSysStyle(sysSel.value);
      markModified();
      const stClean = clean(displayName);
      if (stClean) {
        STUDENT_SYSTEM_MAP[stClean] = sysSel.value;
      }
    };

    bLeft.append(nameEl, sysSel);
    head.append(bLeft);

    // 1. 随课常驻任务规则（合并单词与常驻任务，一体化连贯呈现）
    const baseField = document.createElement('div');
    baseField.className = 'rules-field';
    baseField.style.marginTop = '4px';

    const bLbl = document.createElement('span');
    bLbl.className = 'rules-label';
    bLbl.textContent = '随课常驻任务（每节课必做）';
    baseField.append(bLbl);

    const baseList = document.createElement('div');
    baseList.className = 'rules-att-tasks';

    // 单词任务行
    const vRow = document.createElement('div');
    vRow.className = 'rules-att-task-row';

    const vBadge = document.createElement('span');
    vBadge.className = 'rules-task-badge vocab';
    vBadge.textContent = '单词';

    const vInput = document.createElement('input');
    vInput.className = 'rules-input';
    vInput.style.cssText = 'font-size:12px;flex:1';
    vInput.value = rule.vocab_task || '';
    vInput.placeholder = '输入随课单词任务（如留空则课上免背）';
    vInput.oninput = () => {
      rule.vocab_task = vInput.value;
      markModified();
    };

    // 快捷填入单行极简下拉菜单（收纳隐藏平铺按键，单行不占额外空间）
    const vQuickSel = document.createElement('select');
    vQuickSel.className = 'rules-quick-sel';
    vQuickSel.title = '从常用预设中快捷填入单词任务';

    const defaultOpt = document.createElement('option');
    defaultOpt.value = '';
    defaultOpt.textContent = '⚡ 快捷填入 ▾';
    defaultOpt.disabled = true;
    defaultOpt.selected = true;
    vQuickSel.append(defaultOpt);

    const presetItems = [
      ['雅思双词书 (听50+阅50)', '系统内单词任务（听力*50+阅读*50）'],
      ['托福100词 (50*2)', '系统内托福单词100个（50*2）'],
      ['校内单词背诵', '校内单词背诵'],
      ['四级词汇*2组', '系统内单词任务（四级词汇*两组，每组30词）'],
      ['免背 / 课上无单词', '']
    ];
    presetItems.forEach(([label, val]) => {
      const opt = document.createElement('option');
      opt.value = val;
      opt.textContent = label;
      vQuickSel.append(opt);
    });

    vQuickSel.onchange = () => {
      vInput.value = vQuickSel.value;
      rule.vocab_task = vQuickSel.value;
      markModified();
      vQuickSel.selectedIndex = 0;
    };

    vRow.append(vBadge, vInput, vQuickSel);
    baseList.append(vRow);

    // 其它随课常驻任务行
    if (!Array.isArray(rule.attendance_tasks)) {
      rule.attendance_tasks = [];
    }

    rule.attendance_tasks.forEach((task, idx) => {
      const row = document.createElement('div');
      row.className = 'rules-att-task-row';

      const tBadge = document.createElement('span');
      tBadge.className = 'rules-task-badge';
      tBadge.textContent = '常驻';

      const tInp = document.createElement('input');
      tInp.className = 'rules-input';
      tInp.style.fontSize = '12px';
      tInp.value = task;
      tInp.placeholder = '输入常驻任务内容';
      tInp.oninput = () => {
        rule.attendance_tasks[idx] = tInp.value;
        markModified();
      };

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'rules-att-task-del';
      delBtn.innerHTML = '×';
      delBtn.title = '删除此任务';
      delBtn.onclick = () => {
        rule.attendance_tasks.splice(idx, 1);
        markModified();
        renderContentList(root.querySelector('.rules-content'));
      };

      row.append(tBadge, tInp, delBtn);
      baseList.append(row);
    });

    const addBaseTaskBtn = document.createElement('button');
    addBaseTaskBtn.type = 'button';
    addBaseTaskBtn.className = 'rules-preset-chip';
    addBaseTaskBtn.style.marginTop = '4px';
    addBaseTaskBtn.textContent = '+ 添加一项常驻任务';
    addBaseTaskBtn.onclick = () => {
      rule.attendance_tasks.push('新常驻任务');
      markModified();
      renderContentList(root.querySelector('.rules-content'));
    };

    baseField.append(baseList, addBaseTaskBtn);

    // 2. 分科目专属随课任务 (subject_rules，当天排课自动附加)
    const subjSection = document.createElement('div');
    subjSection.className = 'rules-subj-section';

    const subjHdr = document.createElement('div');
    subjHdr.className = 'rules-subj-header';
    subjHdr.innerHTML = `
      <span>按科目专属任务（根据当天排课自动附加）</span>
    `;
    subjSection.append(subjHdr);

    if (!rule.subject_rules || typeof rule.subject_rules !== 'object') {
      rule.subject_rules = {};
    }

    const currentSubjects = Object.keys(rule.subject_rules);

    currentSubjects.forEach(subj => {
      const tasks = rule.subject_rules[subj] || [];
      const box = document.createElement('div');
      box.className = 'rules-subj-box';

      const boxHead = document.createElement('div');
      boxHead.className = 'rules-subj-box-head';

      const tag = document.createElement('span');
      tag.className = 'rules-subj-tag';
      tag.textContent = `【${subj}课】专属任务`;

      const removeSubjBtn = document.createElement('button');
      removeSubjBtn.type = 'button';
      removeSubjBtn.className = 'rules-subj-remove';
      removeSubjBtn.textContent = '删除该科目规则';
      removeSubjBtn.onclick = () => {
        if (confirm(`确定要移除「${subj}课」的专属随课任务吗？`)) {
          delete rule.subject_rules[subj];
          markModified();
          renderContentList(root.querySelector('.rules-content'));
        }
      };

      boxHead.append(tag, removeSubjBtn);

      const sTaskList = document.createElement('div');
      sTaskList.className = 'rules-att-tasks';

      tasks.forEach((st, sIdx) => {
        const sRow = document.createElement('div');
        sRow.className = 'rules-att-task-row';

        const sInp = document.createElement('input');
        sInp.className = 'rules-input';
        sInp.style.fontSize = '12px';
        sInp.value = st;
        sInp.placeholder = `输入${subj}课专属任务`;
        sInp.oninput = () => {
          tasks[sIdx] = sInp.value;
          markModified();
        };

        const sDelBtn = document.createElement('button');
        sDelBtn.type = 'button';
        sDelBtn.className = 'rules-att-task-del';
        sDelBtn.innerHTML = '×';
        sDelBtn.title = '删除此任务';
        sDelBtn.onclick = () => {
          tasks.splice(sIdx, 1);
          markModified();
          renderContentList(root.querySelector('.rules-content'));
        };

        sRow.append(sInp, sDelBtn);
        sTaskList.append(sRow);
      });

      const addSubjTaskBtn = document.createElement('button');
      addSubjTaskBtn.type = 'button';
      addSubjTaskBtn.className = 'rules-preset-chip';
      addSubjTaskBtn.style.marginTop = '4px';
      addSubjTaskBtn.textContent = `+ 添加一项${subj}课任务`;
      addSubjTaskBtn.onclick = () => {
        tasks.push(`新${subj}任务`);
        markModified();
        renderContentList(root.querySelector('.rules-content'));
      };

      box.append(boxHead, sTaskList, addSubjTaskBtn);
      subjSection.append(box);
    });

    // Quick add subject toolbar
    const addSubjBar = document.createElement('div');
    addSubjBar.className = 'rules-subj-chips';
    const promptLbl = document.createElement('span');
    promptLbl.style.cssText = 'font-size:11.5px;color:var(--muted,#777)';
    promptLbl.textContent = '＋ 定制科目任务：';
    addSubjBar.append(promptLbl);

    const recSubjs = ['听力', '写作', '阅读', '口语'];
    recSubjs.forEach(s => {
      if (!rule.subject_rules[s]) {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'rules-preset-chip';
        chip.textContent = `+ ${s}课`;
        chip.onclick = () => {
          rule.subject_rules[s] = [`${s}课课后专属任务`];
          markModified();
          renderContentList(root.querySelector('.rules-content'));
        };
        addSubjBar.append(chip);
      }
    });

    const customChip = document.createElement('button');
    customChip.type = 'button';
    customChip.className = 'rules-preset-chip';
    customChip.textContent = '+ 自定义科目…';
    customChip.onclick = () => {
      const name = prompt('请输入要定制随课任务的科目名称（如：语法、词汇与语言应用、听说等）：');
      if (name && name.trim()) {
        const cleanName = name.trim().replace(/课$/, '');
        if (!rule.subject_rules[cleanName]) {
          rule.subject_rules[cleanName] = ['新定制任务'];
          markModified();
          renderContentList(root.querySelector('.rules-content'));
        }
      }
    };
    addSubjBar.append(customChip);
    subjSection.append(addSubjBar);

    card.append(head, baseField, subjSection);
    return card;
  }

  // Initial load
  await load();
}
