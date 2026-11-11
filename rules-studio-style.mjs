// Component-scoped presentation for the task rules editor.
// Desktop first (1280–1440): roster on the left, the chosen learner's rules on the right.
export const STYLE = String.raw`
.rules-studio {
  color-scheme: light;
  --bg: #f5f5f7;
  --surface: #fff;
  --ink: #1d1d1f;
  --muted: #8a8d96;
  --secondary: #5d6069;
  --line: #e8e8ed;
  --line-strong: #d8d9df;
  --blue: #0071e3;
  --blue-soft: #edf5ff;
  --orange: #a86a13;
  --orange-soft: #fff7e9;
  --red: #b64141;
  --red-soft: #fff3f2;
  --green: #2f7d4f;
  --green-soft: #eef8f1;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-synthesis: none;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}
.rules-studio, .rules-studio * { box-sizing: border-box; }
.rules-studio button, .rules-studio input, .rules-studio textarea, .rules-studio select { font: inherit; max-width: 100%; }
.rules-studio button { cursor: pointer; color: inherit; -webkit-tap-highlight-color: transparent; }
.rules-studio button:disabled { cursor: default; opacity: .45; }
.rules-studio :focus-visible { outline: 3px solid #a5cefa; outline-offset: 2px; }
.rules-studio [hidden] { display: none !important; }
.rules-studio svg { display: block; flex: none; }
.rules-studio .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }

/* ---- Frame */
.rules-studio.app {
  width: 100%; height: calc(100dvh - 130px); min-height: 0; margin: 0; padding: 18px 24px 0;
  display: flex; flex-direction: column; overflow: hidden;
  background: var(--bg); color: var(--ink); font-size: 14px; line-height: 1.5; text-align: left; isolation: isolate;
}
.wayon-rules-dialog .rules-studio.app { height: 100%; max-height: 100%; }
.rules-studio .topbar { flex: none; display: flex; align-items: center; gap: 16px; min-height: 40px; padding-bottom: 14px; }
.rules-studio .brand { font-size: 22px; font-weight: 750; letter-spacing: -.065em; line-height: 1; }
.rules-studio .page-title { margin: 0; padding-left: 16px; border-left: 1px solid var(--line-strong); font-size: 18px; font-weight: 600; letter-spacing: -.03em; }
.rules-studio .header-actions { margin-left: auto; display: flex; align-items: center; gap: 2px; }
.rules-studio .content { min-width: 0; }
.rules-studio > .content { flex: 1; min-height: 0; overflow: auto; }
.rules-studio .studio-body { flex: 1; min-height: 0; display: grid; grid-template-columns: 248px minmax(0, 1fr); gap: 20px; }

/* ---- Roster */
.rules-studio .roster-pane { min-height: 0; display: flex; flex-direction: column; gap: 10px; }
.rules-studio .search input { width: 100%; min-height: 38px; padding: 8px 12px; border: 1px solid #e1e2e7; border-radius: 9px; background: var(--surface); color: var(--ink); }
.rules-studio .search input::placeholder { color: #9b9da6; }
.rules-studio .filter-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.rules-studio .chip { border: 1px solid #e1e3e9; background: var(--surface); color: var(--secondary); border-radius: 999px; padding: 4px 11px; min-height: 30px; font-size: 12px; white-space: nowrap; }
.rules-studio .chip:hover { border-color: #c5d3e8; }
.rules-studio .chip.active { background: var(--ink); color: #fff; border-color: var(--ink); }
.rules-studio .roster-count { font-size: 11px; color: var(--muted); padding: 0 2px; }
.rules-studio .roster-list { list-style: none; margin: 0; padding: 4px; flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain; background: var(--surface); border: 1px solid #e4e5ea; border-radius: 12px; }
.rules-studio .roster-list .empty-state { padding: 24px 10px; }
.rules-studio .roster-item { width: 100%; display: flex; align-items: center; gap: 8px; min-height: 40px; padding: 7px 10px; border: 0; border-radius: 8px; background: transparent; text-align: left; }
.rules-studio .roster-item:hover { background: #f3f5f8; }
.rules-studio .roster-item.active { background: var(--blue-soft); color: #00449a; }
.rules-studio .roster-name { flex: 1; min-width: 0; font-size: 14px; font-weight: 550; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rules-studio .roster-meta { display: inline-flex; align-items: center; gap: 6px; flex: none; }
.rules-studio .roster-status { font-size: 11px; color: #8d8f98; white-space: nowrap; }
.rules-studio .system-pill { display: inline-flex; align-items: center; border-radius: 5px; padding: 2px 6px; background: #f0f1f4; color: #7e8390; font-size: 10px; font-weight: 600; letter-spacing: .02em; white-space: nowrap; flex: none; }
.rules-studio .roster-item.active .system-pill { background: #dcebff; color: #2c63a8; }

/* ---- Detail */
.rules-studio .detail-pane { min-height: 0; overflow-y: auto; overflow-x: hidden; overscroll-behavior: contain; padding: 0 4px 24px 0; scrollbar-gutter: stable; }
.rules-studio .detail-head { display: flex; align-items: center; gap: 12px; margin: 2px 0 14px; min-height: 36px; }
.rules-studio .detail-title { margin: 0; display: flex; align-items: center; gap: 10px; font-size: 22px; font-weight: 650; letter-spacing: -.04em; line-height: 1.3; overflow-wrap: anywhere; }
.rules-studio .back-btn { display: none; border: 0; background: transparent; color: var(--blue); padding: 6px 0; min-height: 40px; font-size: 14px; white-space: nowrap; }
.rules-studio .rule-block { background: var(--surface); border: 1px solid #e2e3e9; border-radius: 14px; padding: 14px 18px 10px; margin-bottom: 14px; }
.rules-studio .block-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding-bottom: 6px; }
.rules-studio .block-head h3 { margin: 0; font-size: 16px; font-weight: 650; letter-spacing: -.02em; }
.rules-studio .block-sub { margin: 1px 0 0; font-size: 12px; color: var(--muted); }
.rules-studio .task-group { padding-top: 8px; }
.rules-studio .group-caption { margin: 4px 0 2px; font-size: 11px; font-weight: 600; color: #8b8f9a; letter-spacing: .02em; }
.rules-studio .freq-group { margin-top: 8px; padding-top: 8px; border-top: 1px dashed #e6e7ec; }
.rules-studio .freq-group:first-of-type { border-top: 0; padding-top: 0; }
.rules-studio .freq-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.rules-studio .freq-summary { font-size: 12px; color: var(--secondary); font-weight: 550; }
.rules-studio .freq-summary .off { color: var(--orange); }
.rules-studio .freq-summary .on { color: var(--green); }
.rules-studio .link-btn { border: 0; background: transparent; color: var(--blue); font-size: 12px; padding: 4px 0; min-height: 28px; }
.rules-studio .link-btn:hover { text-decoration: underline; }
.rules-studio .row-settings { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px 12px; margin: 8px 0 6px; padding: 12px; border-radius: 10px; background: #f7f8fa; }
.rules-studio .row-settings .wide { grid-column: 1 / -1; }

.rules-studio .task-row { display: flex; align-items: flex-start; gap: 12px; padding: 6px 0; border-bottom: 1px solid #f0f1f4; }
.rules-studio .task-row:last-child { border-bottom: 0; }
.rules-studio .task-main { flex: 1; min-width: 0; }
.rules-studio .task-input {
  display: block; width: 100%; min-height: 34px; margin: 0; padding: 6px 8px; resize: none; overflow: hidden;
  border: 1px solid transparent; border-radius: 7px; background: transparent; color: var(--ink);
  font-size: 14.5px; line-height: 1.5; font-weight: 500; field-sizing: content;
}
.rules-studio .task-input:hover { background: #f6f7f9; }
.rules-studio .task-input:focus { background: #fff; border-color: #79aef0; outline: 3px solid #eaf3ff; outline-offset: 0; }
.rules-studio .task-input::placeholder { color: #a9adb6; font-weight: 400; }
.rules-studio .task-row.is-new .task-input { background: #fff; border-color: #c9dcf6; }
.rules-studio .task-row.has-error .task-input { border-color: #e4a4a0; background: var(--red-soft); }
.rules-studio .task-hint { padding: 1px 8px 3px; font-size: 12px; color: var(--muted); line-height: 1.5; }
.rules-studio .task-hint.warn { color: var(--red); }
.rules-studio .task-actions { display: flex; align-items: center; gap: 6px; flex: none; padding-top: 3px; }
.rules-studio .task-kind { font-size: 11px; color: #6b7280; background: #f0f1f4; border-radius: 5px; padding: 2px 6px; }
.rules-studio .handler-select { min-height: 30px; max-width: 150px; padding: 3px 22px 3px 8px; border: 1px solid #e1e3e9; border-radius: 7px; background: var(--surface); color: var(--secondary); font-size: 12px; font-weight: 600; }
.rules-studio .handler-select.state-auto { color: var(--green); background: var(--green-soft); border-color: #cfe8d8; }
.rules-studio .handler-select.state-manual { color: #4c5a71; background: #eef1f6; border-color: #dde2ea; }
.rules-studio .handler-select.state-unknown, .rules-studio .handler-select.state-invalid { color: var(--red); background: var(--red-soft); border-color: #f0cfcc; }
.rules-studio .handler-fixed { font-size: 12px; font-weight: 600; color: #4c5a71; background: #eef1f6; border-radius: 7px; padding: 5px 9px; white-space: nowrap; }
.rules-studio .icon-btn { border: 0; color: #8f95a1; border-radius: 8px; width: 32px; height: 32px; padding: 7px; display: inline-flex; align-items: center; justify-content: center; background: transparent; }
.rules-studio .icon-btn:hover { background: #f0f4fa; color: var(--blue); }
.rules-studio .icon-btn svg { width: 17px; height: 17px; }
.rules-studio .delete-btn:hover { color: var(--red); background: var(--red-soft); }
.rules-studio .empty-line { margin: 4px 0; padding: 6px 8px; font-size: 13px; color: var(--muted); }
.rules-studio .block-actions { display: flex; align-items: center; flex-wrap: wrap; gap: 4px 18px; padding: 6px 0 2px; }
.rules-studio .add-btn, .rules-studio .add-inline { border: 0; background: transparent; color: var(--blue); padding: 6px 0; min-height: 32px; font-size: 13px; font-weight: 500; }
.rules-studio .add-inline { font-size: 12px; padding: 4px 8px; min-height: 28px; }
.rules-studio .add-btn:hover, .rules-studio .add-inline:hover { color: #0057b5; }
.rules-studio .subject-picker { display: inline-flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.rules-studio .subject-picker input { width: 150px; min-height: 32px; padding: 5px 9px; border: 1px solid #dbdfe7; border-radius: 7px; }
.rules-studio .special-note { display: flex; align-items: center; gap: 8px; margin: 6px 0; padding: 10px 12px; border: 1px solid #f0e2cb; border-radius: 9px; background: #fffbf3; color: #8d6c33; font-size: 12px; line-height: 1.7; }
.rules-studio .special-note > span { flex: 1; min-width: 0; overflow-wrap: anywhere; }

.rules-studio .plan-block .block-head .link-btn { flex: none; }
.rules-studio .plan-days { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; padding: 6px 0 4px; }
.rules-studio .plan-day { background: #f7f8fa; border-radius: 10px; padding: 10px 12px; min-width: 0; }
.rules-studio .plan-day h4 { margin: 0 0 6px; font-size: 13px; font-weight: 650; }
.rules-studio .plan-visit + .plan-visit { margin-top: 8px; }
.rules-studio .plan-when { font-size: 12px; font-weight: 600; color: var(--secondary); }
.rules-studio .plan-source { font-weight: 400; color: var(--muted); }
.rules-studio .plan-visit ul { margin: 3px 0 0; padding-left: 18px; font-size: 13px; line-height: 1.65; }
.rules-studio .plan-visit li { overflow-wrap: anywhere; white-space: pre-line; }
.rules-studio .plan-visit li .assign-state { margin-left: 8px; }
.rules-studio .plan-visit .muted { color: var(--muted); list-style: none; margin-left: -18px; }
.rules-studio .assign-state { font-size: 11px; font-weight: 600; border-radius: 5px; padding: 1px 6px; white-space: nowrap; color: #4c5a71; background: #e9edf3; }
.rules-studio .assign-state.state-sent { color: var(--green); background: var(--green-soft); }
.rules-studio .assign-state.state-waiting { color: var(--orange); background: var(--orange-soft); }
.rules-studio .assign-state.state-decision, .rules-studio .assign-state.state-check { color: var(--red); background: var(--red-soft); }
.rules-studio .plan-note { margin: 4px 0 6px; padding: 8px 10px; border-radius: 8px; background: var(--orange-soft); color: #8a5a12; font-size: 12px; }
.rules-studio .plan-day .empty-line { padding: 2px 0; margin: 0; }

/* ---- Switch */
.rules-studio .status-switch { display: inline-flex; align-items: center; gap: 8px; border: 0; background: transparent; padding: 4px 0; min-height: 34px; color: var(--blue); font-size: 12px; font-weight: 600; white-space: nowrap; flex: none; }
.rules-studio .switch-track { display: inline-flex; align-items: center; width: 36px; height: 22px; padding: 2px; background: var(--blue); border-radius: 999px; flex: none; }
.rules-studio .switch-knob { display: block; width: 18px; height: 18px; border-radius: 50%; background: #fff; transform: translateX(14px); box-shadow: 0 1px 3px #20304921; transition: transform .15s; }
.rules-studio .status-switch.is-off { color: #8d929d; }
.rules-studio .status-switch.is-off .switch-track { background: #d3d6dd; }
.rules-studio .status-switch.is-off .switch-knob { transform: translateX(0); }
.rules-studio .is-mixed .switch-track { background: #b99763; }

/* ---- Shared controls */
.rules-studio .empty-state { padding: 40px 20px; text-align: center; color: #9096a2; font-size: 13px; }
.rules-studio .button { display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-height: 36px; border: 1px solid #dfe2e9; border-radius: 9px; background: var(--surface); padding: 7px 14px; color: var(--secondary); font-size: 13px; font-weight: 550; white-space: nowrap; }
.rules-studio .button.small { min-height: 30px; padding: 4px 10px; font-size: 12px; }
.rules-studio .button:hover { background: #f5f7fa; }
.rules-studio .button.primary { background: var(--blue); color: #fff; border-color: var(--blue); }
.rules-studio .button.primary:hover { background: #0066cf; }
.rules-studio .button.ghost { background: transparent; border-color: transparent; color: #6f7684; }
.rules-studio .button.ghost:hover { background: #e9ecf1; }
.rules-studio .button.danger { color: var(--red); background: #fff; border-color: #eadada; }
.rules-studio .small-note { color: #8f939d; font-size: 11px; line-height: 1.6; margin: 0; }
.rules-studio .field { display: flex; flex-direction: column; min-width: 0; gap: 5px; color: #6f7684; font-size: 12px; }
.rules-studio .field.full { grid-column: 1 / -1; }
.rules-studio .field input, .rules-studio .field select, .rules-studio .field textarea { width: 100%; min-width: 0; min-height: 36px; padding: 7px 10px; border: 1px solid #dbdfe7; border-radius: 8px; background: #fff; color: #343b48; font-size: 13px; }
.rules-studio .field textarea { min-height: 56px; line-height: 1.6; resize: vertical; }
.rules-studio .field input:focus, .rules-studio .field select:focus, .rules-studio .field textarea:focus { border-color: #79aef0; outline: 3px solid #eaf3ff; outline-offset: 0; }
.rules-studio .weekday-picker { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 6px; max-width: 420px; }
.rules-studio .weekday-picker button { min-height: 32px; border: 1px solid #e4e6ec; background: #fff; color: #9a9fa9; border-radius: 7px; padding: 4px 0; font-size: 12px; }
.rules-studio .weekday-picker button.active { color: var(--blue); background: var(--blue-soft); border-color: #c7ddfa; font-weight: 600; }

/* ---- Footer */
.rules-studio .footer { flex: none; display: flex; align-items: center; justify-content: space-between; gap: 16px; min-height: 64px; padding: 12px 0; margin-top: 4px; border-top: 1px solid #dedfe6; background: var(--bg); }
.rules-studio .save-state { font-size: 12px; color: #8f939d; line-height: 1.6; min-width: 0; }
.rules-studio .save-state.dirty { color: var(--orange); font-weight: 600; }
.rules-studio .save-state.error { color: var(--red); font-weight: 500; }
.rules-studio .footer-actions { display: flex; align-items: center; gap: 8px; flex: none; }
.rules-studio .toast { position: fixed; z-index: 100; bottom: 90px; left: 50%; transform: translateX(-50%); max-width: calc(100% - 32px); padding: 10px 18px; color: #fff; border-radius: 11px; background: #333945f5; font-size: 13px; }
.rules-studio .login-form { width: min(380px, 100%); margin: 32px auto; display: flex; flex-direction: column; gap: 16px; }
.rules-studio .login-form h2 { font-size: 19px; margin: 0; }

/* ---- Drawer (diff, special arrangements, save errors) */
.rules-studio dialog.drawer-backdrop { position: fixed; inset: 0; width: 100vw; height: 100dvh; max-width: none; max-height: none; border: 0; padding: 0; margin: 0; background: transparent; overflow: hidden; }
.rules-studio dialog.drawer-backdrop:not([open]) { display: none !important; }
.rules-studio dialog.drawer-backdrop[open] { display: flex; align-items: stretch; justify-content: flex-end; }
.rules-studio dialog.drawer-backdrop::backdrop { background: #18243645; }
.rules-studio .drawer { width: min(520px, 100%); height: 100dvh; margin: 0; background: #fff; color: var(--ink); display: flex; flex-direction: column; overflow: hidden; box-shadow: -10px 0 50px #16203912; text-align: left; }
.rules-studio .drawer-head { flex: none; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 22px 26px 16px; border-bottom: 1px solid var(--line); }
.rules-studio .drawer-head h2 { margin: 0; font-size: 18px; font-weight: 650; }
.rules-studio .drawer-body { flex: 1; min-height: 0; overflow: auto; overflow-x: hidden; padding: 20px 26px; }
.rules-studio .drawer-foot { flex: none; display: flex; align-items: center; justify-content: flex-end; gap: 9px; padding: 16px 26px max(16px, env(safe-area-inset-bottom)); border-top: 1px solid var(--line); }
.rules-studio .drawer-foot .delete-task-button { margin-right: auto; }
.rules-studio .field-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px 14px; }
.rules-studio .editor-error { padding: 10px 12px; background: var(--red-soft); color: var(--red); border-radius: 8px; font-size: 13px; }
.rules-studio .diff-list { display: flex; flex-direction: column; gap: 12px; }
.rules-studio .diff-item { border: 1px solid #e5e7ed; border-radius: 10px; padding: 12px 14px; font-size: 13px; line-height: 1.7; overflow-wrap: anywhere; }
.rules-studio .diff-item h4 { margin: 0 0 4px; font-weight: 650; }
.rules-studio .diff-item ul { margin: 0; padding-left: 18px; }
.rules-studio .error-copy p { margin: 0 0 10px; color: var(--red); }

/* The rules dialog is the only host selector changed outside the component. */
.wayon-rules-dialog:not([open]) { display: none !important; }
.wayon-rules-dialog[open] {
  position: fixed !important; inset: 0 !important; margin: auto !important; padding: 0 !important;
  display: flex !important; flex-direction: column !important;
  width: min(1440px, calc(100vw - 32px)) !important; max-width: calc(100vw - 32px) !important;
  height: 94dvh !important; max-height: 94dvh !important; overflow: hidden !important;
  border: 1px solid #dfe2e9 !important; border-radius: 18px !important;
  background: #f5f5f7 !important; color: #1d1d1f !important; box-shadow: 0 28px 90px #14203935 !important;
}
.wayon-rules-dialog::backdrop { background: #17243c70; backdrop-filter: blur(5px); }

@media (max-width: 1100px) {
  .rules-studio .row-settings { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
/* Phone: usable, not dense. Roster first; a learner opens full width with a back button. */
@media (max-width: 760px) {
  .wayon-rules-dialog[open] { width: 100vw !important; max-width: 100vw !important; height: 100dvh !important; max-height: 100dvh !important; border: 0 !important; border-radius: 0 !important; }
  .rules-studio.app { padding: 14px 16px 0; height: calc(100dvh - 90px); }
  .wayon-rules-dialog .rules-studio.app { height: 100%; }
  .rules-studio .topbar { gap: 10px; padding-bottom: 10px; }
  .rules-studio .page-title { font-size: 16px; padding-left: 10px; }
  .rules-studio .studio-body { grid-template-columns: minmax(0, 1fr); }
  .rules-studio .studio-body.show-detail .roster-pane { display: none; }
  .rules-studio .studio-body:not(.show-detail) .detail-pane { display: none; }
  .rules-studio .back-btn { display: inline-flex; }
  .rules-studio .detail-head { flex-wrap: wrap; gap: 2px 10px; }
  .rules-studio .detail-title { font-size: 20px; }
  .rules-studio .search input { font-size: 16px; min-height: 44px; }
  .rules-studio .roster-item { min-height: 48px; }
  .rules-studio .rule-block { padding: 12px 12px 8px; }
  .rules-studio .task-row { flex-direction: column; gap: 2px; }
  .rules-studio .task-input { font-size: 16px; }
  .rules-studio .task-actions { align-self: flex-end; padding-top: 0; }
  .rules-studio .icon-btn { width: 40px; height: 40px; padding: 10px; }
  .rules-studio .handler-select { min-height: 36px; }
  .rules-studio .row-settings { grid-template-columns: minmax(0, 1fr); }
  .rules-studio .plan-days { grid-template-columns: minmax(0, 1fr); }
  .rules-studio .footer { flex-wrap: wrap; gap: 8px; padding: 10px 0 max(10px, env(safe-area-inset-bottom)); }
  .rules-studio .footer-actions { width: 100%; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .rules-studio .footer-actions .button { padding: 8px 4px; }
  .rules-studio .field-grid { grid-template-columns: minmax(0, 1fr); }
  .rules-studio .drawer-head { padding-top: max(18px, env(safe-area-inset-top)); }
}
@media print {
  .rules-studio.app { height: auto; overflow: visible; padding: 0; background: white; }
  .rules-studio .footer, .rules-studio .roster-pane { display: none; }
}
`;
