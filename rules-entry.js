(() => {
  if (window.wayonRulesEntryMounted) return;
  window.wayonRulesEntryMounted = true;

  const svgIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="4" y1="21" x2="4" y2="14"></line><line x1="4" y1="10" x2="4" y2="3"></line><line x1="12" y1="21" x2="12" y2="12"></line><line x1="12" y1="8" x2="12" y2="3"></line><line x1="20" y1="21" x2="20" y2="16"></line><line x1="20" y1="12" x2="20" y2="3"></line><line x1="1" y1="14" x2="7" y2="14"></line><line x1="9" y1="8" x2="15" y2="8"></line><line x1="17" y1="16" x2="23" y2="16"></line></svg>';

  // Style for rules buttons and toolbar integration
  const entryStyle = document.createElement('style');
  entryStyle.id = 'wayon-rules-entry-style';
  entryStyle.textContent = `
    .sidebar-rules-icon-btn {
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      width: 40px !important;
      min-width: 40px !important;
      height: 40px !important;
      min-height: 40px !important;
      padding: 0 !important;
      border: 1px solid var(--line, rgba(30,30,40,.09)) !important;
      border-radius: 10px !important;
      background: var(--card, #fff) !important;
      color: var(--muted, #6e6e73) !important;
      cursor: pointer !important;
      flex: none !important;
      box-sizing: border-box !important;
      transition: all .15s ease !important;
      text-decoration: none !important;
      line-height: 1 !important;
    }
    .sidebar-rules-icon-btn:hover {
      color: var(--accent, #0071e3) !important;
      border-color: var(--accent, #0071e3) !important;
      background: var(--accent-subtle, #eaf3ff) !important;
    }
    .sidebar-rules-icon-btn svg {
      width: 19px !important;
      height: 19px !important;
      flex: none !important;
      pointer-events: none !important;
    }
    .sidebar-rules-card-btn,
    .rules-subbar-pill,
    .wayon-workbench #wayon-rules-open-btn {
      display: none !important;
    }
    @media (max-width: 1023px) {
      .sidebar-rules-icon-btn {
        width: 40px !important;
        min-width: 40px !important;
        height: 40px !important;
        min-height: 40px !important;
      }
    }
    @media (max-width: 599px) {
      .sidebar-rules-icon-btn {
        width: 44px !important;
        min-width: 44px !important;
        height: 44px !important;
        min-height: 44px !important;
        border-radius: 10px !important;
      }
    }
    .wayon-rules-dialog:not([open]) {
      display: none !important;
    }
    .wayon-rules-dialog[open] {
      position: fixed !important;
      inset: 0 !important;
      margin: auto !important;
      z-index: 99999 !important;
      display: flex !important;
      flex-direction: column !important;
      box-sizing: border-box;
      width: min(1100px, calc(100vw - 24px));
      height: min(90vh, 920px);
      max-height: 90vh;
      padding: 0;
      border: 1px solid var(--line-strong, rgba(0,0,0,0.12));
      border-radius: 20px;
      background: var(--bg, #f5f5f7);
      color: var(--fg, #1d1d1f);
      box-shadow: 0 28px 90px rgba(0,0,0,0.35);
      overflow: hidden;
      font-family: var(--sans, -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", "PingFang SC", sans-serif);
    }
    .wayon-rules-dialog::backdrop {
      background: rgba(0, 0, 0, 0.45);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
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
            <p style="font-size:13px;color:var(--muted,#666);margin:0 0 16px">请检查网络或刷新页面后重试；当前页面数据保持原样。</p>
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
    // 1. Clean up any deprecated or extra buttons
    document.getElementById('wayon-rules-open-btn')?.remove();
    document.getElementById('wayon-rules-sidebar-btn')?.remove();
    document.getElementById('wayon-rules-subbar-btn')?.remove();

    // 2. Mount single icon-only button near Settings in .sidebar-footer
    if (!document.getElementById('wayon-rules-btn')) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.id = 'wayon-rules-btn';
      btn.className = 'sidebar-rules-icon-btn';
      btn.title = '任务规则 · Task Rules';
      btn.setAttribute('aria-label', '任务规则 · Task Rules');
      btn.innerHTML = svgIcon;
      btn.onclick = openRulesModal;

      const settings = document.getElementById('account-settings');
      const footer = document.querySelector('.sidebar-footer');
      if (settings && settings.parentNode) {
        settings.parentNode.insertBefore(btn, settings);
      } else if (footer) {
        footer.append(btn);
      } else {
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) sidebar.append(btn);
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
