// Component-scoped presentation for the task rules editor.
export const STYLE = String.raw`
.rules-studio {
  color-scheme: light;
  --bg: #f5f5f7;
  --surface: #fff;
  --ink: #1d1d1f;
  --muted: #818189;
  --secondary: #5d6069;
  --line: #e8e8ed;
  --line-strong: #d8d9df;
  --blue: #0071e3;
  --blue-soft: #edf5ff;
  --orange: #a86a13;
  --orange-soft: #fff7e9;
  --red: #b64141;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-synthesis: none;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}
.rules-studio, .rules-studio * { box-sizing: border-box; }
.rules-studio { margin: 0; background: var(--bg); color: var(--ink); font-size: 14px; line-height: 1.5; }
.rules-studio button, .rules-studio input, .rules-studio textarea, .rules-studio select { font: inherit; }
.rules-studio button { cursor: pointer; -webkit-tap-highlight-color: transparent; }
.rules-studio button:disabled { cursor: default; opacity: .45; }
.rules-studio button, .rules-studio a, .rules-studio input, .rules-studio select, .rules-studio textarea { outline-offset: 4px; }
.rules-studio :focus-visible { outline: 3px solid #a5cefa; }
.rules-studio[hidden], .rules-studio [hidden] { display: none !important; }
.rules-studio button, .rules-studio input, .rules-studio select, .rules-studio textarea { max-width: 100%; }
.rules-studio button { color: inherit; }
.rules-studio a { color: var(--blue); text-decoration: none; }
.rules-studio svg { display: block; flex: none; }
.rules-studio.app { width: min(1280px, calc(100% - 80px)); min-height: 100dvh; margin: 0 auto; padding: 30px 0 0; display: flex; flex-direction: column; }
.rules-studio .topbar { display: flex; align-items: center; gap: 18px; min-height: 48px; padding-bottom: 24px; }
.rules-studio .brand { font-size: 24px; font-weight: 750; letter-spacing: -.065em; color: var(--ink); line-height: 1; }
.rules-studio .page-title { font-size: 19px; font-weight: 600; letter-spacing: -.035em; margin: 0; padding-left: 18px; border-left: 1px solid var(--line-strong); }
.rules-studio .demo-pill { margin-left: auto; display: inline-flex; align-items: center; gap: 5px; font-size: 11px; color: #777b85; padding: 4px 8px; border: 1px solid #e0e1e7; border-radius: 6px; white-space: nowrap; background: #f0f0f3; }
.rules-studio .view-tabs { display: flex; gap: 28px; border-bottom: 1px solid var(--line-strong); }
.rules-studio .view-tab { border: 0; background: transparent; color: #85858d; font-weight: 500; padding: 12px 1px 15px; position: relative; white-space: nowrap; font-size: 14px; min-height: 48px; }
.rules-studio .view-tab:hover { color: var(--ink); }
.rules-studio .view-tab.active { color: var(--ink); font-weight: 650; }
.rules-studio .view-tab.active::after { content: ""; position: absolute; left: 0; right: 0; bottom: -1px; height: 2px; border-radius: 2px; background: var(--ink); }
.rules-studio .toolbar { display: flex; align-items: center; gap: 10px; padding: 24px 0; flex-wrap: wrap; }
.rules-studio .search { width: 260px; min-width: 0; position: relative; }
.rules-studio .search input, .rules-studio input.search { width: 100%; min-height: 40px; border: 1px solid #e1e2e7; border-radius: 9px; padding: 9px 12px; background: var(--surface); color: var(--ink); outline-offset: 2px; }
.rules-studio .search input::placeholder, .rules-studio input.search::placeholder { color: #9b9da6; }
.rules-studio .filter-select { min-height: 40px; padding: 8px 32px 8px 12px; border: 1px solid #e1e2e7; border-radius: 9px; color: var(--secondary); background: var(--surface); }
.rules-studio .toolbar-note { margin-left: auto; font-size: 12px; color: var(--muted); }
.rules-studio .content { flex: 1; min-width: 0; padding-bottom: 40px; }
.rules-studio .roster-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
.rules-studio .person-card { width: 100%; min-width: 0; min-height: 108px; border: 1px solid #e6e6eb; border-radius: 14px; background: var(--surface); padding: 24px; display: flex; align-items: center; text-align: left; gap: 12px; box-shadow: 0 1px 2px #1d1d1f02; }
.rules-studio .person-card:hover { border-color: #cbd5e5; box-shadow: 0 4px 16px #192e4e06; background: #fefeff; }
.rules-studio .person-name { font-size: 19px; font-weight: 600; letter-spacing: -.025em; line-height: 1.4; overflow-wrap: anywhere; min-width: 0; }
.rules-studio .system-pill { display: inline-flex; align-items: center; justify-content: center; border-radius: 5px; padding: 3px 7px; line-height: 1.3; background: #f2f3f6; color: #858995; font-size: 10px; font-weight: 550; letter-spacing: .02em; flex: none; white-space: nowrap; }
.rules-studio .person-card > .system-pill { margin-left: auto; }
.rules-studio .chevron { margin-left: auto; color: #b3b6bf; font-size: 21px; font-weight: 400; flex: none; }
.rules-studio .person-card > .system-pill + .chevron { margin-left: 1px; }
.rules-studio .detail-head { display: flex; align-items: center; gap: 14px; margin: 1px 0 24px; min-height: 44px; }
.rules-studio .back-btn { border: 0; background: transparent; color: var(--secondary); padding: 7px 0; font-size: 13px; display: inline-flex; align-items: center; gap: 6px; min-height: 40px; white-space: nowrap; }
.rules-studio .back-btn:hover { color: var(--blue); }
.rules-studio .detail-title { margin: 0; display: flex; align-items: center; gap: 10px; font-size: 24px; font-weight: 650; letter-spacing: -.045em; line-height: 1.35; }
.rules-studio .detail-head > .detail-title { margin-left: 4px; }
.rules-studio .task-section { border: 1px solid #e2e3e9; background: var(--surface); border-radius: 16px; margin: 0 0 18px; overflow: clip; }
.rules-studio .section-heading { display: flex; align-items: center; gap: 16px; padding: 21px 24px; min-height: 85px; }
.rules-studio .section-toggle { flex: 1; min-width: 0; border: 0; padding: 0; background: transparent; display: flex; align-items: center; text-align: left; gap: 12px; }
.rules-studio .section-toggle > .chevron { margin-left: 0; font-size: 17px; color: #9dA2ae; width: 16px; text-align: center; }
.rules-studio .section-title { font-size: 18px; font-weight: 650; letter-spacing: -.025em; margin: 0; }
.rules-studio .section-subtitle { color: var(--muted); font-size: 12px; margin-top: 3px; font-weight: 400; }
.rules-studio .section-count { color: #a1a4af; font-size: 12px; font-weight: 400; margin-left: 8px; }
.rules-studio .section-controls { display: flex; align-items: center; gap: 10px; flex: none; }
.rules-studio .status-toggle { display: inline-flex; padding: 3px; gap: 2px; background: #f0f1f4; border-radius: 9px; flex: none; }
.rules-studio .status-toggle button { border: 0; min-height: 32px; padding: 5px 12px; border-radius: 6px; color: #8a8d98; background: transparent; font-size: 12px; white-space: nowrap; }
.rules-studio .status-toggle button.active { background: #fff; color: var(--blue); font-weight: 600; box-shadow: 0 1px 4px #232b3c12; }
.rules-studio .status-toggle button.pause.active { color: #777c87; }
.rules-studio .status-switch { display: inline-flex; align-items: center; gap: 8px; border: 0; background: transparent; padding: 5px 0 5px 7px; min-height: 40px; color: var(--blue); font-size: 12px; font-weight: 500; white-space: nowrap; }
.rules-studio .switch-track { display: inline-flex; align-items: center; width: 36px; height: 22px; padding: 2px; background: var(--blue); border-radius: 999px; flex: none; }
.rules-studio .switch-knob { display: block; width: 18px; height: 18px; border-radius: 50%; background: #fff; transform: translateX(14px); box-shadow: 0 1px 3px #20304921; }
.rules-studio .status-switch.is-off { color: #9297a2; }
.rules-studio .status-switch.is-off .switch-track { background: #d3d6dd; }
.rules-studio .status-switch.is-off .switch-knob { transform: translateX(0); }
.rules-studio .section-body { border-top: 1px solid #eff0f4; padding: 6px 24px 22px; }
.rules-studio .task-section.collapsed > .section-body { display: none; }
.rules-studio .task-group { padding-top: 19px; }
.rules-studio .group-caption { margin: 0 0 8px; font-size: 12px; color: #898d99; font-weight: 500; }
.rules-studio .task-row { display: flex; align-items: center; gap: 16px; padding: 15px 0; border-bottom: 1px solid #eff0f4; min-height: 64px; }
.rules-studio .task-row:last-child { border-bottom: 0; }
.rules-studio .task-main { flex: 1; min-width: 0; }
.rules-studio .task-name { font-size: 15px; line-height: 1.55; font-weight: 500; overflow-wrap: anywhere; }
.rules-studio .task-meta, .rules-studio .rule-meta { font-size: 12px; color: #9396a1; line-height: 1.65; margin-top: 4px; overflow-wrap: anywhere; }
.rules-studio .task-actions { display: flex; align-items: center; gap: 5px; flex: none; }
.rules-studio .icon-btn { border: 0; color: #8f95a1; border-radius: 8px; width: 34px; height: 34px; padding: 8px; display: inline-flex; align-items: center; justify-content: center; background: transparent; }
.rules-studio .icon-btn:hover { background: #f0f4fa; color: var(--blue); }
.rules-studio .icon-btn svg { width: 17px; height: 17px; }
.rules-studio .rule-card { padding: 17px 0; border-bottom: 1px solid #eff0f4; }
.rules-studio .rule-card:last-child { border-bottom: 0; }
.rules-studio .rule-head { display: flex; align-items: center; gap: 12px; }
.rules-studio .rule-head > .task-name { flex: 1; min-width: 0; }
.rules-studio .rule-body { margin-top: 9px; }
.rules-studio .rule-status { font-size: 11px; color: #9397a2; display: inline-flex; align-items: center; gap: 5px; white-space: nowrap; }
.rules-studio .rule-status::before { content: ""; width: 5px; height: 5px; background: currentColor; border-radius: 50%; }
.rules-studio .rule-status.active { color: var(--blue); }
.rules-studio .rule-status.pause, .rules-studio .rule-status.paused { color: #9297a2; }
.rules-studio .add-btn { color: var(--blue); background: transparent; border: 0; padding: 9px 0; min-height: 38px; margin-top: 9px; font-size: 13px; font-weight: 500; display: inline-flex; align-items: center; gap: 5px; }
.rules-studio .add-btn:hover { color: #0057b5; }
.rules-studio .empty-state { padding: 42px 20px; text-align: center; color: #9096a2; font-size: 13px; }
.rules-studio .empty-icon { color: #c6cad3; font-size: 30px; margin-bottom: 8px; }
.rules-studio .section-body > .empty-state { padding: 27px 20px 15px; }
.rules-studio .button { display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-height: 38px; border: 1px solid #dfe2e9; border-radius: 9px; background: var(--surface); padding: 8px 14px; color: var(--secondary); font-size: 13px; font-weight: 500; text-decoration: none; white-space: nowrap; }
.rules-studio .button:hover { background: #f5f7fa; }
.rules-studio .button.primary { background: var(--blue); color: #fff; border-color: var(--blue); box-shadow: 0 1px 2px #0071e31a; }
.rules-studio .button.primary:hover { background: #0066cf; }
.rules-studio .button.ghost { background: transparent; border-color: transparent; color: #7c8492; }
.rules-studio .button.ghost:hover { background: #edf0f5; }
.rules-studio .button.danger { color: var(--red); background: #fff; border-color: #eadada; }
.rules-studio .overview-group { background: #fff; border: 1px solid #e3e4ea; border-radius: 14px; margin-bottom: 14px; overflow: clip; }
.rules-studio .overview-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 17px 22px; border-bottom: 1px solid #eff0f4; background: #fdfdfe; }
.rules-studio .overview-name { display: flex; align-items: center; gap: 9px; min-width: 0; font-size: 16px; font-weight: 600; }
.rules-studio .overview-name > button { border: 0; background: transparent; padding: 0; color: inherit; font-weight: inherit; text-align: left; }
.rules-studio .overview-name > button:hover { color: var(--blue); }
.rules-studio .overview-body { padding: 1px 22px 10px; }
.rules-studio .overview-body .task-row { padding: 12px 0; }
.rules-studio .overview-body .task-name { font-size: 14px; }
.rules-studio .footer { display: flex; align-items: center; justify-content: space-between; gap: 16px; min-height: 80px; padding: 18px 0; border-top: 1px solid #dedfe6; position: sticky; bottom: 0; background: #f5f5f7f5; backdrop-filter: blur(12px); z-index: 8; }
.rules-studio .save-state { font-size: 12px; color: #9498a3; line-height: 1.6; }
.rules-studio .save-state.dirty { color: var(--orange); }
.rules-studio .footer-actions { display: flex; align-items: center; gap: 8px; flex: none; }
.rules-studio .toast { position: fixed; z-index: 100; bottom: 96px; left: 50%; transform: translateX(-50%); max-width: calc(100% - 32px); padding: 11px 18px; color: #fff; border-radius: 11px; background: #333945f5; box-shadow: 0 5px 22px #17203320; font-size: 13px; text-align: center; pointer-events: none; }
.rules-studio .small-note { color: #9397a1; font-size: 11px; line-height: 1.6; }
.rules-studio .badge { display: inline-flex; padding: 2px 6px; background: #f2f3f6; color: #858a97; border-radius: 4px; font-size: 10px; font-weight: 500; white-space: nowrap; }
.rules-studio .info-note { margin: 12px 0; padding: 11px 13px; border: 1px solid #e1e9f6; border-radius: 9px; background: #f6f9ff; color: #71819b; font-size: 12px; line-height: 1.7; }
.rules-studio .special-note { margin: 16px 0 2px; padding: 12px 14px; border: 1px solid #f0e2cb; border-radius: 9px; background: #fffbf3; color: #9a783e; font-size: 12px; line-height: 1.7; }
.rules-studio .drawer-backdrop { position: fixed; inset: 0; z-index: 40; background: #18243645; display: flex; justify-content: flex-end; }
.rules-studio .drawer { width: min(520px, 100%); height: 100dvh; background: #fff; display: flex; flex-direction: column; overflow: hidden; box-shadow: -10px 0 50px #16203912; }
.rules-studio .drawer-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; border-bottom: 1px solid var(--line); padding: 25px 28px 20px; flex: none; }
.rules-studio .drawer-head h2, .rules-studio .drawer-head h3 { margin: 0; font-size: 19px; font-weight: 650; letter-spacing: -.03em; }
.rules-studio .drawer-body { flex: 1; min-height: 0; overflow: auto; overscroll-behavior: contain; padding: 25px 28px; }
.rules-studio .drawer-foot { flex: none; display: flex; align-items: center; justify-content: flex-end; gap: 9px; padding: 18px 28px max(18px, env(safe-area-inset-bottom)); border-top: 1px solid var(--line); background: #fff; }
.rules-studio .field-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px 14px; }
.rules-studio .field { display: flex; flex-direction: column; min-width: 0; gap: 7px; color: #707887; font-size: 12px; }
.rules-studio .field.full { grid-column: 1 / -1; }
.rules-studio .field input, .rules-studio .field select, .rules-studio .field textarea { width: 100%; min-width: 0; min-height: 42px; padding: 10px 11px; border: 1px solid #dbdfe7; border-radius: 8px; background: #fff; color: #343b48; font-size: 14px; }
.rules-studio .field input:focus, .rules-studio .field select:focus, .rules-studio .field textarea:focus { border-color: #79aef0; outline: 3px solid #eaf3ff; outline-offset: 0; }
.rules-studio .field textarea { min-height: 100px; line-height: 1.6; resize: vertical; }
.rules-studio .field input::placeholder, .rules-studio .field textarea::placeholder { color: #b1b5bf; }
.rules-studio .weekday-picker { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 6px; }
.rules-studio .weekday-picker button { width: 100%; min-height: 37px; border: 1px solid #e4e6ec; background: #fff; color: #9a9fa9; border-radius: 7px; padding: 7px 0; font-size: 12px; }
.rules-studio .weekday-picker button.active { color: var(--blue); background: var(--blue-soft); border-color: #c7ddfa; font-weight: 600; }
.rules-studio .diff-list { display: flex; flex-direction: column; gap: 13px; }
.rules-studio .diff-item { border: 1px solid #e5e7ed; border-radius: 10px; padding: 14px 15px; font-size: 13px; line-height: 1.7; }
.rules-studio .diff-item h4, .rules-studio .diff-item strong { font-weight: 600; }
.rules-studio .diff-item h4 { margin: 0 0 8px; }
.rules-studio .before { color: #9c8e8e; background: #faf5f5; padding: 5px 8px; border-radius: 5px; margin: 6px 0; }
.rules-studio .after { color: #4774a7; background: #f0f6fd; padding: 5px 8px; border-radius: 5px; margin: 6px 0; }
.rules-studio .preview-panel { border: 1px solid #e0e6ef; background: #fff; border-radius: 12px; padding: 20px; margin: 20px 0 0; }
.rules-studio .preview-date { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; font-size: 13px; font-weight: 500; }
.rules-studio .preview-date input { border: 1px solid #dfe2e9; padding: 7px 9px; border-radius: 7px; min-height: 38px; color: #62748b; background: #fff; }
.rules-studio .preview-result { margin-top: 16px; }
.rules-studio .preview-item { border-top: 1px solid #eff1f5; padding: 12px 0; font-size: 14px; }
.rules-studio .preview-item:last-child { padding-bottom: 0; }
.rules-studio .preview-reason { font-size: 11px; color: #959dab; margin-top: 4px; line-height: 1.6; }
@media (max-width: 1020px) {
  .rules-studio.app { width: calc(100% - 48px); padding-top: 24px; }
  .rules-studio .roster-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .rules-studio .person-card { padding: 22px; }
  .rules-studio .task-section { margin-bottom: 16px; }
}
@media (max-width: 600px) {
  .rules-studio { font-size: 14px; }
  .rules-studio.app { width: calc(100% - 32px); padding-top: 20px; }
  .rules-studio .topbar { gap: 13px; flex-wrap: wrap; padding-bottom: 19px; }
  .rules-studio .brand { font-size: 23px; }
  .rules-studio .page-title { font-size: 18px; padding-left: 13px; }
  .rules-studio .demo-pill { font-size: 9px; padding: 3px 5px; }
  .rules-studio .view-tabs { gap: 0; justify-content: space-between; }
  .rules-studio .view-tab { padding: 11px 0 14px; font-size: 12px; min-height: 46px; }
  .rules-studio .toolbar { padding: 19px 0; gap: 8px; }
  .rules-studio .search { flex: 1; width: auto; min-width: 0; }
  .rules-studio .search input, .rules-studio input.search, .rules-studio .filter-select { min-height: 44px; font-size: 13px; }
  .rules-studio .filter-select { max-width: 110px; padding-left: 10px; padding-right: 24px; }
  .rules-studio .toolbar-note { flex-basis: 100%; margin: 0; padding-top: 2px; font-size: 11px; }
  .rules-studio .content { padding-bottom: 24px; }
  .rules-studio .roster-grid { grid-template-columns: minmax(0, 1fr); gap: 10px; }
  .rules-studio .person-card { min-height: 86px; padding: 19px 20px; border-radius: 12px; }
  .rules-studio .person-name { font-size: 18px; }
  .rules-studio .detail-head { flex-wrap: wrap; gap: 4px 12px; margin-bottom: 18px; }
  .rules-studio .back-btn { min-height: 44px; font-size: 12px; }
  .rules-studio .detail-title { font-size: 22px; }
  .rules-studio .detail-head > .detail-title { margin-left: auto; }
  .rules-studio .task-section { border-radius: 13px; }
  .rules-studio .section-heading { padding: 17px 16px; gap: 10px; flex-wrap: wrap; min-height: 78px; }
  .rules-studio .section-toggle { min-height: 44px; gap: 7px; }
  .rules-studio .section-title { font-size: 17px; }
  .rules-studio .section-subtitle { font-size: 11px; }
  .rules-studio .section-count { margin-left: 4px; font-size: 11px; }
  .rules-studio .section-controls { gap: 6px; }
  .rules-studio .status-toggle { padding: 2px; }
  .rules-studio .status-toggle button { min-height: 40px; padding: 7px 8px; font-size: 11px; }
  .rules-studio .status-switch { min-height: 44px; font-size: 11px; gap: 6px; }
  .rules-studio .section-body { padding: 2px 16px 16px; }
  .rules-studio .task-row { gap: 7px; padding: 13px 0; }
  .rules-studio .task-name { font-size: 14px; }
  .rules-studio .task-meta, .rules-studio .rule-meta { font-size: 11px; }
  .rules-studio .task-actions { gap: 0; }
  .rules-studio .icon-btn { width: 44px; height: 44px; padding: 12px; }
  .rules-studio .task-actions .button { min-height: 44px; padding: 8px; font-size: 12px; }
  .rules-studio .rule-head { gap: 7px; flex-wrap: wrap; }
  .rules-studio .rule-status { font-size: 10px; }
  .rules-studio .add-btn { min-height: 44px; font-size: 12px; }
  .rules-studio .button { min-height: 44px; padding: 10px 12px; font-size: 12px; }
  .rules-studio .overview-head { padding: 14px 16px; gap: 8px; flex-wrap: wrap; }
  .rules-studio .overview-name { font-size: 15px; }
  .rules-studio .overview-body { padding: 1px 16px 8px; }
  .rules-studio .overview-body .task-name { font-size: 13px; }
  .rules-studio .footer { min-height: 86px; padding: 14px 0 max(14px, env(safe-area-inset-bottom)); gap: 9px; flex-wrap: wrap; }
  .rules-studio .save-state { font-size: 11px; flex: 1; min-width: 115px; }
  .rules-studio .footer-actions { gap: 4px; }
  .rules-studio .footer-actions .button { padding: 9px 10px; }
  .rules-studio .drawer { width: 100%; }
  .rules-studio .drawer-head { padding: 18px 20px; }
  .rules-studio .drawer-body { padding: 23px 20px; }
  .rules-studio .drawer-foot { padding: 16px 20px max(16px, env(safe-area-inset-bottom)); }
  .rules-studio .drawer-foot .button { min-width: 100px; }
  .rules-studio .field-grid { grid-template-columns: minmax(0, 1fr); gap: 17px; }
  .rules-studio .field input, .rules-studio .field select, .rules-studio .field textarea { min-height: 46px; font-size: 16px; }
  .rules-studio .weekday-picker { gap: 4px; }
  .rules-studio .weekday-picker button { min-height: 44px; }
  .rules-studio .preview-panel { padding: 16px; }
  .rules-studio .preview-date input { min-height: 44px; }
}
@media (prefers-reduced-motion: no-preference) {
  .rules-studio .person-card, .rules-studio .button, .rules-studio .icon-btn, .rules-studio .view-tab, .rules-studio .status-toggle button, .rules-studio .switch-track { transition: background-color .15s ease, border-color .15s ease, color .15s ease, box-shadow .15s ease; }
  .rules-studio .switch-knob { transition: transform .15s ease; }
}
@media print {
  .rules-studio { background: white; }
  .rules-studio.app { width: 100%; min-height: 0; padding: 0; }
  .rules-studio .footer, .rules-studio .drawer-backdrop, .rules-studio .toast, .rules-studio .task-actions, .rules-studio .toolbar { display: none; }
  .rules-studio .person-card, .rules-studio .task-section, .rules-studio .overview-group { box-shadow: none; break-inside: avoid; }
}
.rules-studio .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
.rules-studio .detail-sections { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); align-items: start; gap: 18px; }
.rules-studio .detail-sections > .task-section { min-width: 0; }
.rules-studio .task-group { padding-top: 14px; }
.rules-studio .group-caption { margin-bottom: 2px; }
.rules-studio .help-button { margin-left: -10px; font-size: 20px; }
.rules-studio .task-note { display: block; margin-top: 3px; }
.rules-studio .person-detail { padding-top: 24px; }
.rules-studio .editor-person { display: flex; align-items: center; gap: 8px; margin: 0 0 22px; color: var(--secondary); }
.rules-studio .field .note-input { min-height: 72px; }
.rules-studio .editor-error { padding: 10px 12px; background: #fff4f3; color: var(--red); border-radius: 8px; font-size: 13px; }
.rules-studio .delete-task-button { margin-right: auto; }
.rules-studio .about-copy p { margin: 0 0 20px; }
.rules-studio dialog.drawer-backdrop { width: 100vw; height: 100dvh; max-width: none; max-height: none; border: 0; padding: 0; margin: 0; background: transparent; overflow: hidden; }
.rules-studio dialog.drawer-backdrop:not([open]) { display: none; }
.rules-studio dialog.drawer-backdrop::backdrop { background: #18243645; }
.rules-studio .drawer { text-align: left; }
@media (max-width: 1000px) {
  .rules-studio .detail-sections { grid-template-columns: minmax(0, 1fr); gap: 0; }
}
@media (max-width: 600px) {
  .rules-studio .toolbar .search { flex-basis: 100%; }
  .rules-studio .toolbar .filter-select { flex: 1; max-width: none; }
  .rules-studio .footer { display: grid; grid-template-columns: 1fr; gap: 8px; min-height: 100px; }
  .rules-studio .footer-actions { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); width: 100%; }
  .rules-studio .footer-actions .button { padding: 9px 4px; font-size: 11px; }
  .rules-studio .drawer-foot { gap: 6px; }
  .rules-studio .drawer-foot .button { min-width: 0; }
  .rules-studio .person-detail { padding-top: 14px; }
}

/* The rules dialog is the only host selector changed outside the component. */
.wayon-rules-dialog:not([open]) { display: none !important; }
.wayon-rules-dialog[open] {
  position: fixed !important;
  inset: 0 !important;
  margin: auto !important;
  padding: 0 !important;
  display: flex !important;
  flex-direction: column !important;
  width: min(1280px, calc(100vw - 32px)) !important;
  max-width: calc(100vw - 32px) !important;
  height: 92dvh !important;
  max-height: 92dvh !important;
  overflow: hidden !important;
  border: 1px solid #dfe2e9 !important;
  border-radius: 18px !important;
  background: #f5f5f7 !important;
  color: #1d1d1f !important;
  box-shadow: 0 28px 90px #14203935 !important;
}
.wayon-rules-dialog::backdrop { background: #17243c70; backdrop-filter: blur(5px); }
.rules-studio.app {
  width: 100%;
  max-width: none;
  height: calc(100dvh - 130px);
  max-height: none;
  min-height: 0;
  margin: 0;
  padding: 24px 28px 0;
  overflow: hidden;
  background: var(--bg);
  color: var(--ink);
  font: 14px/1.5 -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", "PingFang SC", "Microsoft YaHei", sans-serif;
  text-align: left;
  isolation: isolate;
}
.wayon-rules-dialog .rules-studio.app { height: 100%; max-height: 100%; }
.rules-studio .topbar { flex: none; min-height: 42px; padding-bottom: 18px; }
.rules-studio .topbar > .icon-btn:last-child { margin-left: auto; }
.rules-studio .header-actions { margin-left: auto; display: flex; align-items: center; gap: 3px; }
.rules-studio .save-state.error { color: #a34036; }
.rules-studio .login-form { width: min(380px, 100%); margin: 32px auto; display: flex; flex-direction: column; gap: 16px; }
.rules-studio .login-form h2 { font-size: 19px; margin: 0; }
.rules-studio .special-note { display: flex; align-items: center; gap: 8px; }
.rules-studio .special-note > span { flex: 1; min-width: 0; overflow-wrap: anywhere; }
.rules-studio .advanced-options > summary { cursor: pointer; margin: 5px 0 12px; }
.rules-studio .advanced-options .field { margin: 12px 0; }
.rules-studio .diff-item .before, .rules-studio .diff-item .after { white-space: pre-wrap; overflow-wrap: anywhere; }
.rules-studio .is-mixed .switch-track { background: #b99763; }
.rules-studio .drawer-foot .delete-task-button { margin-right: auto; }
.rules-studio .view-tabs, .rules-studio .toolbar { flex: none; }
.rules-studio .toolbar { padding: 18px 0; }
.rules-studio .content {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding-bottom: 22px;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
}
.rules-studio .footer {
  position: static;
  flex: none;
  min-height: 74px;
  padding: 16px 0;
  margin: 0;
  background: var(--bg);
  backdrop-filter: none;
  z-index: auto;
}
.rules-studio .detail-sections { gap: 18px; }
.rules-studio dialog.drawer-backdrop {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100dvh;
  max-width: none;
  max-height: none;
  margin: 0;
  padding: 0;
  border: 0;
  overflow: hidden;
  background: transparent;
  color: var(--ink);
  font: inherit;
}
.rules-studio dialog.drawer-backdrop:not([open]) { display: none !important; }
.rules-studio dialog.drawer-backdrop[open] { display: flex; align-items: stretch; justify-content: flex-end; }
.rules-studio .drawer { margin: 0; max-height: 100dvh; color: var(--ink); background: var(--surface); }
.rules-studio .drawer-head, .rules-studio .drawer-foot { flex-shrink: 0; }
.rules-studio .drawer-body { overflow-x: hidden; }
.rules-studio .task-actions, .rules-studio .section-controls { white-space: nowrap; }
.rules-studio .editor-error[hidden] { display: none; }
.rules-studio .status-message { padding: 10px 12px; border-radius: 9px; color: var(--secondary); background: #edf1f7; font-size: 12px; }
.rules-studio .status-message.error { color: #a34036; background: #fff2f0; }
.rules-studio .auth-form { width: min(380px, 100%); margin: 32px auto; display: flex; flex-direction: column; gap: 16px; }
.rules-studio .auth-form h2 { margin: 0; font-size: 20px; }
.rules-studio .auth-form p { margin: 0; }
@media (max-width: 1000px) {
  .rules-studio .detail-sections { grid-template-columns: minmax(0, 1fr); gap: 0; }
}
@media (max-width: 600px) {
  .wayon-rules-dialog[open] {
    width: 100vw !important;
    max-width: 100vw !important;
    height: 100dvh !important;
    max-height: 100dvh !important;
    border: 0 !important;
    border-radius: 0 !important;
  }
  .rules-studio.app { padding: 18px 16px 0; height: calc(100dvh - 100px); }
  .wayon-rules-dialog .rules-studio.app { height: 100%; }
  .rules-studio .topbar { gap: 10px; padding-bottom: 14px; }
  .rules-studio .page-title { font-size: 17px; }
  .rules-studio .toolbar { padding: 16px 0; }
  .rules-studio .search input, .rules-studio .filter-select { font-size: 16px; }
  .rules-studio .content { padding-bottom: 16px; scrollbar-gutter: auto; }
  .rules-studio .footer { min-height: 92px; padding: 12px 0 max(12px, env(safe-area-inset-bottom)); }
  .rules-studio .detail-title { font-size: 21px; }
  .rules-studio .drawer-head { padding-top: max(18px, env(safe-area-inset-top)); }
}
@media print {
  .rules-studio.app { height: auto; max-height: none; overflow: visible; padding: 0; background: white; }
  .rules-studio .content { overflow: visible; }
  .rules-studio .footer { display: none; }
}

`;
