// ui.js — UI helpers: modals, toasts, confirms

const UI = (() => {
  const container = () => document.getElementById('modals');

  const modal = ({ title, body, actions = [] }) => {
    closeModal();
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'active-modal';
    overlay.innerHTML = `
      <div class="modal-sheet-centered">
        <div class="modal-header">
          <div class="modal-title">${title}</div>
          <button class="icon-btn" onclick="UI.closeModal()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="modal-body">${body}</div>
        ${actions.length ? `<div class="modal-footer">${actions.map((a,i) =>
          `<button class="btn ${a.primary?'btn-primary':a.danger?'btn-danger':'btn-secondary'} ${a.primary||a.danger?'flex-1':''}" onclick="UI._action(${i})">${a.label}</button>`
        ).join('')}</div>` : ''}
      </div>`;
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
    container().appendChild(overlay);
    window._modalActions = actions;
    // Auto focus first input
    setTimeout(() => overlay.querySelector('input, select')?.focus(), 100);
  };

  const sheet = ({ title, body, actions = [] }) => {
    closeModal();
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'active-modal';
    overlay.innerHTML = `
      <div class="modal-sheet">
        <div class="modal-handle"></div>
        <div class="modal-header">
          <div class="modal-title">${title}</div>
          <button class="icon-btn" onclick="UI.closeModal()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="modal-body" style="padding:0">${body}</div>
        ${actions.length ? `<div class="modal-footer">${actions.map((a,i) =>
          `<button class="btn ${a.primary?'btn-primary':a.danger?'btn-danger':'btn-secondary'} ${a.primary?'flex-1':''}" onclick="UI._action(${i})">${a.label}</button>`
        ).join('')}</div>` : ''}
      </div>`;
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
    container().appendChild(overlay);
    window._modalActions = actions;
  };

  const _action = (i) => {
    const action = (window._modalActions || [])[i];
    if (action?.action) action.action();
  };

  const closeModal = () => {
    const el = document.getElementById('active-modal');
    if (el) el.remove();
    window._modalActions = null;
  };

  const confirm = (message, onYes, onNo) => {
    modal({
      title: 'CONFIRM',
      body: `<p style="font-size:0.875rem;line-height:1.5;color:var(--text2);">${message}</p>`,
      actions: [
        { label: 'Confirm', primary: true, action: () => { closeModal(); if (onYes) onYes(); } },
        { label: 'Cancel', action: () => { closeModal(); if (onNo) onNo(); } }
      ]
    });
  };

  const alert = (message) => {
    modal({
      title: 'NOTICE',
      body: `<p style="font-size:0.875rem;line-height:1.5;color:var(--text2);">${message}</p>`,
      actions: [{ label: 'OK', primary: true, action: () => closeModal() }]
    });
  };

  let toastTimeout;
  const toast = (message, duration = 2400) => {
    let el = document.getElementById('toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast';
      el.style.cssText = `
        position:fixed;bottom:calc(var(--nav-h)+16px);left:50%;transform:translateX(-50%);
        background:var(--text);color:var(--bg);padding:10px 18px;border-radius:30px;
        font-family:var(--mono);font-size:0.75rem;letter-spacing:0.06em;
        z-index:200;transition:opacity 300ms ease;white-space:nowrap;
        box-shadow:0 4px 20px rgba(0,0,0,0.3);max-width:calc(100vw - 48px);text-align:center;`;
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.style.opacity = '1';
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => { el.style.opacity = '0'; }, duration);
  };

  return { modal, sheet, closeModal, confirm, alert, toast, _action };
})();
