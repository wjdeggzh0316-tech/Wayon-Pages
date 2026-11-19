// 入学模考入口: lazy-mounted standalone exam catalog inside an isolated iframe,
// with a one-click colleague share link and zero interference from workbench sync/translation.
(() => {
  if (globalThis.wayonMockExams || typeof document === 'undefined') return;
  const STAMP = '20261119-01';
  const IFRAME_SRC = './mock-exams.html?embed=1&v=' + STAMP;
  const MIN_FRAME_HEIGHT = 360;
  const MAX_FRAME_HEIGHT = 50000;
  const COPY_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
  const CHECK_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 13l4 4L19 7"/></svg>';
  const NAV_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 10L12 5 2 10l10 5 10-5z M6 12v5c0 1.6 2.7 3 6 3s6-1.4 6-3v-5 M22 10v5"/></svg>';
  const make = (tag, cls, text) => {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text !== undefined) el.textContent = text;
    return el;
  };
  const shareUrl = () => {
    try {
      const base = globalThis.location?.href;
      if (base && /^https?:|^file:/i.test(base)) return new URL('./mock-exams.html', base).href;
    } catch {}
    return 'https://wjdeggzh0316-tech.github.io/Wayon-Pages/mock-exams.html';
  };

  let open = false, root = null, frame = null, fallbackBox = null, fallbackInput = null;
  let mountObserver = null, mounting = false, copyTimer = 0, lastStatusMsg = '', lastFrameHeight = 0;

  const style = make('style');
  style.id = 'wayon-mocks-style';
  style.textContent = `
    #nav-mocks:before{display:none!important}#nav-mocks svg{width:19px;height:19px;flex:none}
    body[data-mocks-open] #tabs button:not(#nav-mocks){background:transparent!important;color:var(--fg-secondary)!important}
    body[data-mocks-open] #list,body[data-mocks-open] .workspace-top-bar,body[data-mocks-open] .workspace-sub-bar,body[data-mocks-open] #aircon-panel,body[data-mocks-open] #memo-panel,body[data-mocks-open] #feedback-panel,body[data-mocks-open] .sidebar-footer .bar{display:none!important}
    body[data-aircon-open] #mocks-panel,body[data-memo-open] #mocks-panel,body[data-feedback-open] #mocks-panel{display:none!important}
    body[data-mocks-open] .main-content{padding-top:16px!important;padding-bottom:24px!important}
    #mocks-panel{display:flex;flex-direction:column;gap:8px;width:100%;min-width:0}
    #mocks-panel[hidden]{display:none!important}
    .mocks-bar{display:flex;align-items:center;justify-content:space-between;gap:10px 14px;flex-wrap:wrap;min-width:0}
    .mocks-title{margin:0;font-size:22px;line-height:1.25;letter-spacing:-.025em;font-weight:650;color:var(--fg);text-wrap:balance}
    .mocks-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-left:auto;min-width:0}
    .mocks-copy-wrap{position:relative;display:inline-flex;align-items:center;gap:8px}
    .mocks-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-inline-size:36px;min-block-size:36px;padding:0 13px;border-radius:10px;border:1px solid var(--line-strong,rgba(30,30,40,.18));background:var(--card,#fff);color:var(--fg,#1d1d1f);font:550 13px/1 var(--sans,inherit);letter-spacing:-.01em;text-decoration:none;white-space:nowrap;cursor:pointer;transition:background .15s ease,border-color .15s ease,color .15s ease}
    .mocks-btn-copy{background:var(--accent,#0071e3);border-color:var(--accent,#0071e3);color:#fff}
    .mocks-btn-copy[data-copied]{background:var(--done,#248a3d);border-color:var(--done,#248a3d);color:#fff}
    .mocks-btn-copy[data-failed]{background:var(--bad-bg,#fff1f0);border-color:var(--bad-border,#f1c8c5);color:var(--bad,#d93025)}
    .mocks-btn-ico{display:inline-flex;align-items:center;justify-content:center;width:15px;height:15px;flex:none;pointer-events:none}
    .mocks-btn-ico svg{width:15px;height:15px;pointer-events:none}
    .mocks-btn:focus-visible{outline:3px solid var(--accent,#0071e3);outline-offset:2px}
    @media(hover:hover){
      .mocks-btn-copy:hover{background:var(--accent-hover,#0064cb);border-color:var(--accent-hover,#0064cb)}
      .mocks-btn-copy[data-copied]:hover{background:var(--done,#248a3d);border-color:var(--done,#248a3d)}
      .mocks-btn-link:hover{border-color:var(--accent,#0071e3);color:var(--accent,#0071e3)}
    }
    .mocks-copy-status{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap;border:0}
    .mocks-fallback{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:10px 12px;border:1px solid var(--line-strong);border-radius:10px;background:var(--card);font-size:12px;color:var(--muted)}
    .mocks-fallback[hidden]{display:none!important}
    .mocks-fallback input{flex:1 1 220px;min-width:0;min-block-size:36px;padding:6px 10px;border:1px solid var(--line-strong);border-radius:8px;background:var(--code-bg);color:var(--fg);font:inherit;font-size:14px}
    .mocks-frame{display:block;width:calc(100% + 12px);margin-inline:-6px;height:600px;min-height:360px;border:0;border-radius:0;background:transparent;overflow:hidden;overflow:clip}
    @media(pointer:coarse),(max-width:599px){
      .mocks-title{font-size:20px}
      .mocks-btn{min-inline-size:44px;min-block-size:44px;padding:0 12px;font-size:13px}
      .mocks-fallback input{min-block-size:44px;font-size:16px}
      .mocks-frame{min-height:360px;border-radius:0}
    }
    @media(prefers-reduced-motion:reduce){
      .mocks-btn{transition:none}
    }
  `;
  document.head.append(style);

  function legacyCopy(text) {
    const field = document.createElement('textarea');
    field.value = text;
    field.setAttribute('readonly', '');
    field.setAttribute('aria-label', '同事分享链接');
    field.style.cssText = 'position:fixed;inset-block-start:0;inset-inline-start:0;opacity:0';
    document.body.append(field);
    field.focus?.();
    field.select?.();
    try {
      return document.execCommand?.('copy') === true;
    } catch {
      return false;
    } finally {
      field.remove();
    }
  }

  function reportCopy(button, iconEl, labelEl, liveEl, ok, url) {
    clearTimeout(copyTimer);
    button.removeAttribute('data-copied');
    button.removeAttribute('data-failed');
    let announcement = ok ? '已复制同事链接' : '复制失败，请手动复制下方链接';
    if (announcement === lastStatusMsg) announcement += '\u00A0';
    lastStatusMsg = announcement;
    liveEl.textContent = '';
    if (ok) {
      button.setAttribute('data-copied', '');
      iconEl.innerHTML = CHECK_ICON;
      labelEl.textContent = '✓ 已复制';
      if (fallbackBox) fallbackBox.hidden = true;
    } else {
      button.setAttribute('data-failed', '');
      iconEl.innerHTML = COPY_ICON;
      labelEl.textContent = '复制失败';
      if (fallbackBox && fallbackInput) {
        fallbackInput.value = url;
        fallbackBox.hidden = false;
        fallbackInput.focus?.();
        fallbackInput.select?.();
      }
    }
    const announce = () => { liveEl.textContent = announcement; };
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(announce);
    else announce();
    copyTimer = setTimeout(() => {
      button.removeAttribute('data-copied');
      button.removeAttribute('data-failed');
      iconEl.innerHTML = COPY_ICON;
      labelEl.textContent = '复制同事链接';
      liveEl.textContent = '';
    }, 2200);
  }

  async function copyShareLink(button, iconEl, labelEl, liveEl) {
    const url = shareUrl();
    let ok = false;
    if (globalThis.navigator?.clipboard?.writeText) {
      try {
        await globalThis.navigator.clipboard.writeText(url);
        ok = true;
      } catch {
        ok = legacyCopy(url);
      }
    } else {
      ok = legacyCopy(url);
    }
    reportCopy(button, iconEl, labelEl, liveEl, ok, url);
    return ok;
  }

  function frameTargetOrigin() {
    const origin = globalThis.location?.origin;
    return origin && origin !== 'null' ? origin : '*';
  }

  function applyFrameHeight(rawHeight) {
    if (!frame) return false;
    const n = Number(rawHeight);
    if (!Number.isFinite(n) || n <= 0 || n > MAX_FRAME_HEIGHT) return false;
    const next = Math.max(MIN_FRAME_HEIGHT, Math.ceil(n) + 2);
    if (next === lastFrameHeight && frame.style.height === next + 'px') return true;
    lastFrameHeight = next;
    frame.style.height = next + 'px';
    return true;
  }

  function measureFrameSameOrigin() {
    if (!frame) return 0;
    try {
      const doc = frame.contentDocument;
      if (!doc) return 0;
      const page = doc.querySelector?.('.page');
      if (page) {
        const rectH = page.getBoundingClientRect?.().height || 0;
        const scrollH = page.scrollHeight || 0;
        const offsetH = page.offsetHeight || 0;
        const h = Math.ceil(Math.max(rectH, scrollH, offsetH));
        if (h > 0) return h;
      }
      const bodyH = doc.body?.scrollHeight || 0;
      if (bodyH > 0) return Math.ceil(bodyH);
    } catch {}
    return 0;
  }

  function requestFrameMeasure() {
    if (!open || !frame || !frame.contentWindow) return;
    try {
      frame.contentWindow.postMessage({type: 'wayon-mocks-measure'}, frameTargetOrigin());
    } catch {}
  }

  function syncFrameTheme() {
    if (!frame || !frame.contentWindow) return;
    const theme = document.documentElement?.getAttribute?.('data-theme');
    if (theme !== 'dark' && theme !== 'light') return;
    try {
      frame.contentWindow.postMessage({type: 'wayon-theme', theme}, frameTargetOrigin());
    } catch {}
  }

  function fitFrame() {
    if (!open || !frame) return;
    const measured = measureFrameSameOrigin();
    if (measured > 0) {
      applyFrameHeight(measured);
      return;
    }
    requestFrameMeasure();
    if (!lastFrameHeight) {
      const rect = frame.getBoundingClientRect?.();
      const vh = globalThis.innerHeight || document.documentElement?.clientHeight || 0;
      if (rect && Number.isFinite(rect.top) && rect.top >= 0 && vh > 0) {
        const avail = Math.floor(vh - rect.top - 24);
        frame.style.height = Math.max(MIN_FRAME_HEIGHT, Math.min(avail, 720)) + 'px';
      }
    }
  }

  function onWindowMessage(e) {
    if (!frame || !e || !e.data || typeof e.data !== 'object') return;
    if (e.data.type !== 'wayon-mocks-height') return;
    if (!frame.contentWindow || e.source !== frame.contentWindow) return;
    const expectedOrigin = globalThis.location?.origin;
    if (expectedOrigin && expectedOrigin !== 'null' && e.origin !== expectedOrigin) return;
    applyFrameHeight(e.data.height);
  }

  function ensureFrame() {
    if (frame || !root) return;
    frame = make('iframe', 'mocks-frame');
    frame.id = 'mocks-frame';
    frame.title = '维安教育入学模考';
    frame.src = IFRAME_SRC;
    frame.setAttribute('allow', 'clipboard-write');
    frame.addEventListener?.('load', () => {
      syncFrameTheme();
      fitFrame();
      requestFrameMeasure();
    });
    root.append(frame);
  }

  function buildPanel() {
    const section = make('section');
    section.id = 'mocks-panel';
    section.hidden = !open;
    section.setAttribute('aria-label', '入学模考');

    const bar = make('div', 'mocks-bar');
    bar.append(make('h2', 'mocks-title', '入学模考'));

    const actions = make('div', 'mocks-actions');
    const copyWrap = make('span', 'mocks-copy-wrap');
    const copyBtn = make('button', 'mocks-btn mocks-btn-copy');
    copyBtn.id = 'mocks-copy-link';
    copyBtn.type = 'button';
    const iconEl = make('span', 'mocks-btn-ico');
    iconEl.setAttribute('aria-hidden', 'true');
    iconEl.innerHTML = COPY_ICON;
    const labelEl = make('span', 'mocks-btn-txt', '复制同事链接');
    copyBtn.append(iconEl, labelEl);
    const liveEl = make('span', 'mocks-copy-status');
    liveEl.id = 'mocks-copy-status';
    liveEl.setAttribute('role', 'status');
    copyBtn.onclick = () => void copyShareLink(copyBtn, iconEl, labelEl, liveEl);
    copyWrap.append(copyBtn, liveEl);

    const openLink = make('a', 'mocks-btn mocks-btn-link', '新窗口打开 ↗');
    openLink.id = 'mocks-open-link';
    openLink.href = './mock-exams.html';
    openLink.target = '_blank';
    openLink.rel = 'noopener noreferrer';

    actions.append(copyWrap, openLink);
    bar.append(actions);

    fallbackBox = make('div', 'mocks-fallback');
    fallbackBox.hidden = true;
    fallbackBox.append(make('span', '', '请手动复制链接：'));
    fallbackInput = make('input');
    fallbackInput.type = 'text';
    fallbackInput.readOnly = true;
    fallbackInput.setAttribute('aria-label', '同事分享链接');
    fallbackBox.append(fallbackInput);

    section.append(bar, fallbackBox);
    return section;
  }

  function openPanel() {
    mount();
    open = true;
    document.body.dataset.mocksOpen = 'true';
    if (root) {
      root.hidden = false;
      ensureFrame();
    }
    const b = document.getElementById('nav-mocks');
    if (b) {
      b.classList.add('on');
      b.setAttribute('aria-pressed', 'true');
    }
    const refreshHeight = () => {
      fitFrame();
      requestFrameMeasure();
    };
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(refreshHeight);
    else refreshHeight();
  }

  function close() {
    if (!open && !document.body.dataset.mocksOpen) return;
    open = false;
    if (root) root.hidden = true;
    delete document.body.dataset.mocksOpen;
    const b = document.getElementById('nav-mocks');
    b?.classList.remove('on');
    b?.setAttribute('aria-pressed', 'false');
  }

  function mount() {
    if (mounting) return;
    mounting = true;
    try {
      const tabs = document.getElementById('tabs');
      const list = document.getElementById('list');
      if (!tabs || !list) return;
      if (!root) {
        root = buildPanel();
        list.before(root);
      } else if (!root.parentNode) {
        list.before(root);
      }
      const notice = list.parentNode && [...list.parentNode.children].find(e => e.classList?.contains('wayon-sync-notice'));
      if (notice && typeof root.compareDocumentPosition === 'function' && (root.compareDocumentPosition(notice) & 4)) {
        notice.after(root);
      }
      let b = document.getElementById('nav-mocks');
      if (!b) {
        b = make('button', 'wayon-icon-control' + (open ? ' on' : ''));
        b.id = 'nav-mocks';
        b.type = 'button';
        b.title = '模考链接';
        b.setAttribute('aria-label', '模考链接');
        b.setAttribute('aria-pressed', String(open));
        b.innerHTML = NAV_ICON;
        b.onclick = () => openPanel();
        tabs.append(b);
      } else {
        if (open && !b.classList.contains('on')) {
          b.classList.add('on');
          b.setAttribute('aria-pressed', 'true');
        }
        const memo = document.getElementById('nav-memo');
        if (memo && memo.parentNode === tabs && b.parentNode === tabs && typeof b.compareDocumentPosition === 'function' && (b.compareDocumentPosition(memo) & 4)) {
          memo.after(b);
        }
      }
    } finally {
      mountObserver?.takeRecords?.();
      mounting = false;
    }
  }

  function start() {
    mount();
    document.addEventListener('click', e => {
      const nav = e.target?.closest?.('#tabs button');
      if (open && nav && nav.id !== 'nav-mocks') close();
    }, true);
    if (typeof MutationObserver === 'function') {
      mountObserver = new MutationObserver(mount);
      mountObserver.observe(document.body, {childList: true, subtree: true});
      new MutationObserver(() => {
        const ds = document.body.dataset || {};
        if (open && (ds.airconOpen || ds.memoOpen || ds.feedbackOpen)) close();
      }).observe(document.body, {attributes: true, attributeFilter: ['data-aircon-open', 'data-memo-open', 'data-feedback-open']});
    }
    globalThis.addEventListener?.('message', onWindowMessage);
    globalThis.addEventListener?.('resize', fitFrame);
  }

  globalThis.wayonMockExams = {open: openPanel, close, isOpen: () => open, shareUrl, iframeSrc: IFRAME_SRC, fitFrame};
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once: true});
  else start();
})();
