// ui.js v2 — modals, sheets, toasts

const UI = (() => {
  const container = () => document.getElementById('modals');

  const _build = (centered, { title, body, actions=[] }) => {
    closeModal();
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'active-modal';
    const cls = centered ? 'modal-centered' : 'modal-sheet';
    overlay.innerHTML = `
      <div class="${cls}">
        ${!centered ? '<div class="modal-handle"></div>' : ''}
        <div class="modal-header">
          <div class="modal-title">${title}</div>
          <button class="icon-btn" onclick="UI.closeModal()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="modal-body" style="${centered?'':'padding:0;'}">${body}</div>
        ${actions.length ? `<div class="modal-footer">${actions.map((a,i)=>
          `<button class="btn ${a.primary?'btn-primary':a.danger?'btn-danger':'btn-secondary'} ${a.primary||a.danger?'flex-1':''}" onclick="UI._act(${i})">${a.label}</button>`
        ).join('')}</div>` : ''}
      </div>`;
    overlay.addEventListener('click', e => { if(e.target===overlay) closeModal(); });
    container().appendChild(overlay);
    window._uiActions = actions;
    setTimeout(() => overlay.querySelector('input,select')?.focus(), 120);
  };

  const modal = (opts) => _build(true, opts);
  const sheet = (opts) => _build(false, opts);

  const _act = (i) => { const a=(window._uiActions||[])[i]; if(a?.action) a.action(); };

  const closeModal = () => { document.getElementById('active-modal')?.remove(); window._uiActions=null; };

  const confirm = (msg, onYes) => modal({
    title: 'CONFIRM',
    body: `<p style="font-size:1rem;line-height:1.6;color:var(--text2);">${msg}</p>`,
    actions: [
      { label: 'Confirm', primary: true, action: () => { closeModal(); onYes?.(); } },
      { label: 'Cancel', action: () => closeModal() }
    ]
  });

  const alert = (msg) => modal({
    title: 'NOTICE',
    body: `<p style="font-size:1rem;line-height:1.6;color:var(--text2);">${msg}</p>`,
    actions: [{ label: 'OK', primary: true, action: () => closeModal() }]
  });

  let _tt;
  const toast = (msg, dur=2600) => {
    let el = document.getElementById('ui-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'ui-toast';
      el.style.cssText='position:fixed;bottom:calc(var(--nav-h)+18px);left:50%;transform:translateX(-50%);background:var(--text);color:var(--bg);padding:11px 22px;border-radius:40px;font-family:var(--mono);font-size:0.78rem;letter-spacing:0.06em;z-index:300;transition:opacity 300ms ease;white-space:nowrap;box-shadow:var(--shadow-lg);max-width:calc(100vw - 40px);text-align:center;';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.style.opacity = '1';
    clearTimeout(_tt);
    _tt = setTimeout(() => el.style.opacity='0', dur);
  };

  return { modal, sheet, closeModal, confirm, alert, toast, _act };
})();
