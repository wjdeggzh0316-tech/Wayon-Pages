(() => {
  if (window.wayonRulesEntryMounted) return;
  window.wayonRulesEntryMounted = true;

  const svgIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="4" y1="21" x2="4" y2="14"></line><line x1="4" y1="10" x2="4" y2="3"></line><line x1="12" y1="21" x2="12" y2="12"></line><line x1="12" y1="8" x2="12" y2="3"></line><line x1="20" y1="21" x2="20" y2="16"></line><line x1="20" y1="12" x2="20" y2="3"></line><line x1="1" y1="14" x2="7" y2="14"></line><line x1="9" y1="8" x2="15" y2="8"></line><line x1="17" y1="16" x2="23" y2="16"></line></svg>';

  // Style for rules buttons and toolbar integration
  const entryStyle = document.createElement('style');
  entryStyle.id = 'wayon-rules-entry-style';
  entryStyle.textContent = `
    .sidebar-rules-card-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin: 10px 14px;
      padding: 10px 16px;
      min-height: 40px;
      height: 40px;
      border: 1px solid var(--line, rgba(0,0,0,0.1));
      border-radius: 12px;
      background: var(--card, #fff);
      color: var(--accent, #0071e3);
      font-size: 13px;
      font-weight: 600;
      letter-spacing: -0.01em;
      cursor: pointer;
      white-space: nowrap !important;
      box-sizing: border-box;
      width: calc(100% - 28px);
      transition: all .15s ease;
      box-shadow: 0 1px 3px rgba(0,0,0,0.03);
      flex: none;
    }
    .sidebar-rules-card-btn:hover {
      background: var(--accent-subtle, #eaf3ff);
      border-color: var(--accent, #0071e3);
      box-shadow: 0 2px 6px rgba(0,113,227,0.12);
    }
    .sidebar-rules-card-btn svg {
      width: 17px;
      height: 17px;
      flex: none;
      color: currentColor;
    }
    .wayon-workbench #wayon-rules-open-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      min-width: 36px;
      min-height: 36px;
      padding: 0;
      border: 1px solid var(--line);
      border-radius: 10px;
      background: var(--card);
      color: var(--muted);
      cursor: pointer;
      transition: all .15s ease;
      box-sizing: border-box;
    }
    .wayon-workbench #wayon-rules-open-btn:hover {
      color: var(--accent);
      border-color: var(--accent);
      background: var(--accent-subtle, #eaf3ff);
    }
    .wayon-workbench #wayon-rules-open-btn svg {
      width: 18px;
      height: 18px;
      pointer-events: none;
    }
    @media (max-width: 859px) {
      .sidebar-rules-card-btn {
        margin: 6px 8px;
        width: auto;
      }
    }
    @media (max-width: 599px) {
      .wayon-workbench #wayon-rules-open-btn {
        width: 44px;
        height: 44px;
        min-width: 44px;
        min-height: 44px;
      }
    }
  `;
  (document.head || document.documentElement).append(entryStyle);

  let dialog = null;
  let isMounted = false;

  async function openRulesModal() {
    if (!dialog) {
      dialog = document.createElement('dialog');
      dialog.id = 'wayon-rules-dialog';
      dialog.className = 'wayon-rules-dialog';
      dialog.setAttribute('aria-label', '任务规则 · Task Rules');
      document.body.append(dialog);

      // Close on backdrop click
      dialog.addEventListener('click', event => {
        if (event.target === dialog) {
          const rect = dialog.getBoundingClientRect();
          if (
            event.clientX < rect.left ||
            event.clientX > rect.right ||
            event.clientY < rect.top ||
            event.clientY > rect.bottom
          ) {
            dialog.close();
          }
        }
      });
    }

    if (!dialog.open) {
      dialog.showModal();
    }

    if (!isMounted) {
      isMounted = true;
      dialog.innerHTML = `
        <div style="padding:48px 20px;text-align:center;font-family:-apple-system,BlinkMacSystemFont,sans-serif">
          <p style="font-size:16px;font-weight:600;color:var(--fg,#1d1d1f);margin:0 0 8px">正在载入统一规则管理面板…</p>
          <div style="font-size:12px;color:var(--muted,#888)">正在连接 Supabase 规则库</div>
        </div>
      `;

      try {
        let sdk;
        try {
          sdk = await import('https://esm.sh/@supabase/supabase-js@2.49.4');
        } catch {
          try {
            sdk = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.4/+esm');
          } catch {
            sdk = await import('https://unpkg.com/@supabase/supabase-js@2.49.4/dist/module/index.js');
          }
        }

        const config = await (await fetch('./checks-public-config.json?v=' + Date.now(), { cache: 'no-store' })).json();
        const client = sdk.createClient(config.url, config.key);
        const { mountRules } = await import('./rules-editor.mjs?v=' + Date.now());
        await mountRules({
          document,
          client,
          container: dialog,
          onClose: () => dialog.close()
        });
      } catch (err) {
        console.error('Failed to load rules editor:', err);
        dialog.innerHTML = `
          <div style="padding:40px 24px;text-align:center;font-family:-apple-system,BlinkMacSystemFont,sans-serif">
            <h3 style="margin:0 0 8px;color:var(--bad,#d93025)">无法载入任务规则</h3>
            <p style="font-size:13px;color:var(--muted,#666);margin:0 0 16px">${err?.message || '请检查网络或刷新页面后重试'}</p>
            <button onclick="this.closest('dialog').close()" style="padding:8px 18px;border-radius:8px;border:1px solid #ddd;background:#fff;cursor:pointer">关闭</button>
          </div>
        `;
        isMounted = false;
      }
    }
  }

  // Expose global trigger
  window.wayonOpenRules = openRulesModal;

  const mountButtons = () => {
    // 1. Mount toolbar icon into #workflow-tools
    const tools = document.getElementById('workflow-tools');
    if (tools && !document.getElementById('wayon-rules-open-btn')) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'workflow-icon';
      btn.id = 'wayon-rules-open-btn';
      btn.title = '任务规则 · Task Rules';
      btn.setAttribute('aria-label', '任务规则 · Task Rules');
      btn.innerHTML = svgIcon;
      btn.onclick = openRulesModal;

      const refreshBtn = document.getElementById('completion-refresh');
      if (refreshBtn && refreshBtn.parentNode === tools) {
        tools.insertBefore(btn, refreshBtn);
      } else {
        tools.append(btn);
      }
    }

    // 2. Mount sidebar card button directly in .sidebar (below .nav-section)
    const sidebar = document.querySelector('.sidebar');
    if (sidebar && !document.getElementById('wayon-rules-sidebar-btn')) {
      const sBtn = document.createElement('button');
      sBtn.type = 'button';
      sBtn.className = 'sidebar-rules-card-btn';
      sBtn.id = 'wayon-rules-sidebar-btn';
      sBtn.title = '查看与编辑学员任务规则';
      sBtn.innerHTML = `${svgIcon}<span>任务规则 · Rules</span>`;
      sBtn.onclick = openRulesModal;

      const navSec = sidebar.querySelector('.nav-section');
      if (navSec && navSec.nextSibling) {
        sidebar.insertBefore(sBtn, navSec.nextSibling);
      } else {
        sidebar.append(sBtn);
      }
    }
  };

  const startObserving = () => {
    mountButtons();
    const target = document.body || document.documentElement;
    if (target) {
      new MutationObserver(mountButtons).observe(target, { childList: true, subtree: true });
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startObserving, { once: true });
    const rootEl = document.documentElement;
    if (rootEl) {
      try {
        new MutationObserver(mountButtons).observe(rootEl, { childList: true, subtree: true });
      } catch {}
    }
  } else {
    startObserving();
  }

  window.addEventListener('load', mountButtons);
})();
