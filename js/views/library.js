// views/library.js v3 — Single-modal decision tree, stable search

const LibraryView = (() => {
  let searchTerm = '';
  let filterCat = 'all';

  // ---- Render: split into static shell + dynamic list ----
  const render = () => {
    let html = `<div class="view">`;
    html += `
      <div class="lib-search-wrap">
        <input class="lib-search-input" type="search" placeholder="Search exercises…" 
          value="${escapeHtml(searchTerm)}" id="lib-search-input"
          oninput="LibraryView._search(this.value)" />
        <button class="btn btn-primary btn-sm" onclick="LibraryView.newExercise()">+ NEW</button>
      </div>
      <div class="filter-row">
        ${['all','main','accessory','flexibility'].map(c=>`
          <div class="filter-chip ${filterCat===c?'active':''}" onclick="LibraryView.setFilter('${c}')">
            ${c==='all'?'All':c.charAt(0).toUpperCase()+c.slice(1)}
          </div>`).join('')}
      </div>
      <div id="lib-list">${renderList()}</div>
    </div>`;
    return html;
  };

  const renderList = () => {
    const exercises = DB.getExercises();
    const filtered = exercises.filter(ex => {
      const matchSearch = !searchTerm || ex.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCat = filterCat==='all' || ex.category===filterCat;
      return matchSearch && matchCat;
    });

    if (!exercises.length) {
      return `<div class="empty-state">
        <div class="empty-title">Library Empty</div>
        <div class="empty-sub">Add your first exercise to get started.</div>
        <button class="btn btn-primary" style="margin-top:14px" onclick="LibraryView.newExercise()">Add Exercise</button>
      </div>`;
    }
    if (!filtered.length) {
      return `<div class="empty-state"><div class="empty-title">No Matches</div></div>`;
    }

    const cats = filterCat==='all' ? ['main','accessory','flexibility'] : [filterCat];
    let html = '';
    cats.forEach(cat => {
      const group = filtered.filter(e=>e.category===cat);
      if (!group.length) return;
      html += `<div class="card">
        <div style="padding:8px 18px 4px;border-bottom:1.5px solid var(--border);">
          <span class="chip chip-${cat}">${cat.toUpperCase()}</span>
        </div>`;
      group.forEach(ex => {
        const sessions = DB.getSessions();
        const logCount = sessions.filter(s=>(s.groups||[]).some(g=>(g.exercises||[]).some(e=>e.exerciseId===ex.id))).length;
        const prs = DB.getPRs(ex.id);
        const prStr = prs.maxWeight>0?`PR: ${prs.maxWeight}lbs`:prs.maxHold>0?`PR: ${prs.maxHold}s`:'';
        html += `
          <div class="exercise-item">
            <div class="exercise-item-info" onclick="LibraryView.viewExercise('${ex.id}')">
              <div class="exercise-item-name">${escapeHtml(ex.name)}</div>
              <div class="exercise-item-meta">
                ${typeLabel(ex.type)} · ${(ex.effortMetrics||[]).join(', ')}${logCount>0?' · '+logCount+' sessions':''}${prStr?' · '+prStr:''}
              </div>
            </div>
            <div class="exercise-item-actions">
              <button class="icon-btn" onclick="LibraryView.editExercise('${ex.id}')" title="Edit">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button class="icon-btn" style="color:var(--red);" onclick="LibraryView.deleteExercise('${ex.id}')" title="Delete">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
              </button>
            </div>
          </div>`;
      });
      html += `</div>`;
    });
    return html;
  };

  const escapeHtml = (s) => String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  const typeLabel = (t) => ({ dynamic_weighted:'Dynamic Weighted', dynamic_bodyweight:'Dynamic Bodyweight', static_weighted:'Static Weighted', static_bodyweight:'Static Bodyweight' })[t]||t||'';

  // ---- Search: only update list, never replace input ----
  const _search = (val) => {
    searchTerm = val;
    const list = document.getElementById('lib-list');
    if (list) list.innerHTML = renderList();
  };

  const setFilter = (cat) => { filterCat = cat; App.navigate('library'); };

  // ============================================
  // SINGLE-MODAL DECISION TREE
  // ============================================
  const newExercise = () => _openEditor({}, true);
  const editExercise = (id) => { const ex = DB.getExercise(id); if(ex) _openEditor(ex, false); };

  const _openEditor = (ex={}, isNew) => {
    window._exEditing = { ...ex };

    const types = [
      {val:'dynamic_weighted',   lbl:'Dynamic Weighted',   sub:'Reps × Weight'},
      {val:'dynamic_bodyweight', lbl:'Dynamic Bodyweight', sub:'Reps × Progression'},
      {val:'static_weighted',    lbl:'Static Weighted',    sub:'Seconds × Weight'},
      {val:'static_bodyweight',  lbl:'Static Bodyweight',  sub:'Seconds × Progression'},
    ];

    const body = `
      <div class="field">
        <label class="field-label">Exercise Name *</label>
        <input class="field-input" id="ex-name" type="text" value="${escapeHtml(ex.name||'')}" placeholder="e.g. Front Lever Raise" autofocus />
      </div>

      <div class="field">
        <label class="field-label">Category</label>
        <select class="field-select" id="ex-cat">
          ${['main','accessory','flexibility'].map(c=>`<option value="${c}" ${ex.category===c?'selected':''}>${c.charAt(0).toUpperCase()+c.slice(1)}</option>`).join('')}
        </select>
      </div>

      <div class="field">
        <label class="field-label">Type *</label>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;" id="type-tiles">
          ${types.map(opt=>`
            <div class="type-tile ${ex.type===opt.val?'selected':''}" data-val="${opt.val}" 
                 onclick="LibraryView._selectType('${opt.val}')"
                 style="border:1.5px solid ${ex.type===opt.val?'var(--accent)':'var(--border)'};border-radius:var(--radius-sm);padding:12px;cursor:pointer;transition:all 160ms ease;">
              <div class="type-tile-lbl" style="font-family:var(--display);font-size:0.82rem;font-weight:700;${ex.type===opt.val?'color:var(--accent)':''}">${opt.lbl}</div>
              <div style="font-family:var(--mono);font-size:0.62rem;color:var(--text3);margin-top:3px;">${opt.sub}</div>
            </div>`).join('')}
        </div>
        <input type="hidden" id="ex-type" value="${ex.type||''}" />
      </div>

      <div id="conditional-fields"></div>
    `;

    UI.modal({
      title: isNew ? 'NEW EXERCISE' : 'EDIT EXERCISE',
      body,
      actions: [
        { label: 'Save', primary: true, action: () => _saveExercise(ex, isNew) },
        { label: 'Cancel', action: () => { window._exEditing = null; UI.closeModal(); } }
      ]
    });

    if (ex.type) _renderConditional(ex.type, ex);
  };

  const _selectType = (val) => {
    document.querySelectorAll('.type-tile').forEach(t => {
      const sel = t.dataset.val === val;
      t.style.borderColor = sel ? 'var(--accent)' : 'var(--border)';
      const lbl = t.querySelector('.type-tile-lbl');
      if (lbl) lbl.style.color = sel ? 'var(--accent)' : '';
    });
    document.getElementById('ex-type').value = val;
    _renderConditional(val, window._exEditing || {});
  };

  const _renderConditional = (type, ex) => {
    const isStatic = type==='static_weighted'||type==='static_bodyweight';
    const isBW = type==='dynamic_bodyweight'||type==='static_bodyweight';
    const isStatBW = type==='static_bodyweight';
    const availMetrics = isStatic ? ['SIR','RPE'] : ['RIR','RPE'];
    const selMetrics = ex.effortMetrics||[];
    const progs = ex.progressions||[];

    let html = `
      <div class="field">
        <label class="field-label">Effort Tracking * (at least one)</label>
        <div class="check-group" id="effort-group">
          ${availMetrics.map(m=>`
            <div class="check-item ${selMetrics.includes(m)?'selected':''}" data-val="${m}"
                 onclick="this.classList.toggle('selected')">
              ${m}
            </div>`).join('')}
        </div>
      </div>`;

    if (!isStatic) {
      html += `
        <div class="field-row field-row-2">
          <div class="field">
            <label class="field-label">Tempo logging</label>
            <select class="field-select" id="ex-tempo">
              <option value="no" ${!ex.useTempo?'selected':''}>No</option>
              <option value="yes" ${ex.useTempo?'selected':''}>Yes</option>
            </select>
          </div>
          <div class="field">
            <label class="field-label">Last-rep iso hold</label>
            <select class="field-select" id="ex-hold">
              <option value="no" ${!ex.useHold?'selected':''}>No</option>
              <option value="yes" ${ex.useHold?'selected':''}>Yes</option>
            </select>
          </div>
        </div>`;
    }

    if (isBW) {
      html += `
        <div class="field">
          <label class="field-label">Progressions (one per line)</label>
          <textarea class="field-input" id="ex-progs" rows="4" style="resize:vertical;font-family:var(--sans);" placeholder="Tuck&#10;Advanced Tuck&#10;Straddle&#10;Full">${escapeHtml(progs.map(p=>p.name).join('\n'))}</textarea>
          <div class="field-hint">Available as a dropdown when logging</div>
        </div>`;
    }

    if (isStatBW) {
      html += `
        <div class="field">
          <label class="field-label">Progression measured by</label>
          <select class="field-select" id="ex-progmeasure">
            <option value="posture" ${ex.progressionMeasure!=='distance'?'selected':''}>Posture (e.g. Advanced Tuck)</option>
            <option value="distance" ${ex.progressionMeasure==='distance'?'selected':''}>Distance (e.g. 43 in from wall)</option>
          </select>
        </div>
        <div class="field-row field-row-2">
          <div class="field">
            <label class="field-label">Assistance options</label>
            <textarea class="field-input" id="ex-assist" rows="3" style="resize:vertical;font-family:var(--sans);" placeholder="One per line">${escapeHtml((ex.assistanceOptions||[]).join('\n'))}</textarea>
          </div>
          <div class="field">
            <label class="field-label">Resistance options</label>
            <textarea class="field-input" id="ex-resist" rows="3" style="resize:vertical;font-family:var(--sans);" placeholder="One per line">${escapeHtml((ex.resistanceOptions||[]).join('\n'))}</textarea>
          </div>
        </div>`;
    }

    html += `
      <div class="field">
        <label class="field-label">Notes (optional)</label>
        <textarea class="field-input" id="ex-notes" rows="2" style="resize:vertical;font-family:var(--sans);" placeholder="Cues, technique notes, etc.">${escapeHtml(ex.notes||'')}</textarea>
      </div>`;

    document.getElementById('conditional-fields').innerHTML = html;
  };

  const _saveExercise = (ex, isNew) => {
    const name = document.getElementById('ex-name').value.trim();
    const type = document.getElementById('ex-type').value;
    const cat = document.getElementById('ex-cat').value;
    if (!name) { UI.toast('Name required'); return; }
    if (!type) { UI.toast('Select a type'); return; }

    const metrics = [...document.querySelectorAll('#effort-group .check-item.selected')].map(el=>el.dataset.val);
    if (!metrics.length) { UI.toast('Select at least one effort metric'); return; }

    const updated = { ...ex, name, type, category: cat, effortMetrics: metrics };
    if (!ex.id) updated.id = DB.uid();

    const isStatic = type==='static_weighted'||type==='static_bodyweight';
    const isBW = type==='dynamic_bodyweight'||type==='static_bodyweight';
    const isStatBW = type==='static_bodyweight';

    if (!isStatic) {
      updated.useTempo = document.getElementById('ex-tempo')?.value==='yes';
      updated.useHold = document.getElementById('ex-hold')?.value==='yes';
    } else {
      updated.useTempo = false;
      updated.useHold = false;
    }

    if (isBW) {
      const progLines = (document.getElementById('ex-progs')?.value||'').split('\n').map(s=>s.trim()).filter(Boolean);
      updated.progressions = progLines.map((nm,i)=>({ id: ex.progressions?.[i]?.id||DB.uid(), name: nm }));
    } else {
      updated.progressions = [];
    }

    if (isStatBW) {
      updated.progressionMeasure = document.getElementById('ex-progmeasure')?.value||'posture';
      updated.assistanceOptions = (document.getElementById('ex-assist')?.value||'').split('\n').map(s=>s.trim()).filter(Boolean);
      updated.resistanceOptions = (document.getElementById('ex-resist')?.value||'').split('\n').map(s=>s.trim()).filter(Boolean);
    }

    updated.notes = document.getElementById('ex-notes')?.value.trim()||'';
    updated.createdAt = updated.createdAt||new Date().toISOString();

    DB.saveExercise(updated);
    window._exEditing = null;
    UI.closeModal();
    App.navigate('library');
  };

  const deleteExercise = (id) => {
    const ex = DB.getExercise(id);
    UI.confirm(`Delete "${ex?.name||'this exercise'}"?`, () => {
      DB.deleteExercise(id); App.navigate('library');
    });
  };

  const viewExercise = (id) => {
    const ex = DB.getExercise(id); if(!ex) return;
    const prs = DB.getPRs(id);
    const logCount = DB.getSessions().filter(s=>(s.groups||[]).some(g=>(g.exercises||[]).some(e=>e.exerciseId===id))).length;
    let html = `<div style="padding:0 0 8px;">
      <div style="padding:14px 18px;border-bottom:1.5px solid var(--border);">
        <div style="display:flex;gap:6px;margin-bottom:10px;">
          <span class="chip chip-${ex.category}">${(ex.category||'').toUpperCase()}</span>
        </div>
        <div style="font-family:var(--mono);font-size:0.78rem;color:var(--text2);">${typeLabel(ex.type)}</div>
        <div style="font-family:var(--mono);font-size:0.72rem;color:var(--text3);margin-top:4px;">Effort: ${(ex.effortMetrics||[]).join(', ')}</div>
        ${ex.notes?`<div style="font-size:0.92rem;color:var(--text2);margin-top:10px;line-height:1.5;">${escapeHtml(ex.notes)}</div>`:''}
      </div>
      <div style="padding:14px 18px;border-bottom:1.5px solid var(--border);display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">
        <div style="text-align:center;"><div style="font-family:var(--display);font-size:1.4rem;font-weight:800;">${logCount}</div><div style="font-family:var(--mono);font-size:0.58rem;color:var(--text3);">SESSIONS</div></div>
        <div style="text-align:center;"><div style="font-family:var(--display);font-size:1.4rem;font-weight:800;">${prs.maxWeight>0?prs.maxWeight:prs.maxHold>0?prs.maxHold+'s':'—'}</div><div style="font-family:var(--mono);font-size:0.58rem;color:var(--text3);">${ex.type?.includes('static')?'MAX HOLD':'MAX WEIGHT'}</div></div>
        <div style="text-align:center;"><div style="font-family:var(--display);font-size:1.4rem;font-weight:800;">${prs.maxReps>0?prs.maxReps:'—'}</div><div style="font-family:var(--mono);font-size:0.58rem;color:var(--text3);">MAX REPS</div></div>
      </div>
      ${ex.progressions?.length?`<div style="padding:14px 18px;"><div style="font-family:var(--mono);font-size:0.62rem;color:var(--text3);margin-bottom:8px;">PROGRESSIONS</div>${ex.progressions.map(p=>`<div style="font-size:0.92rem;padding:6px 0;border-bottom:1px solid var(--border);">${escapeHtml(p.name)}</div>`).join('')}</div>`:''}
    </div>`;
    UI.sheet({ title: ex.name, body: html, actions: [
      { label: 'Edit', primary: true, action: () => { UI.closeModal(); editExercise(id); }},
      { label: 'Close', action: () => UI.closeModal() }
    ]});
  };

  return { render, newExercise, editExercise, deleteExercise, viewExercise, _search, _selectType, _renderConditional, setFilter };
})();
