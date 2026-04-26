// views/library.js — Exercise library view

const LibraryView = (() => {
  let searchTerm = '';
  let filterType = 'all';

  const render = () => {
    const exercises = DB.getExercises();
    let html = `<div class="view">`;

    html += `
      <div class="lib-search">
        <input class="lib-search-input" type="text" placeholder="Search exercises…" 
          value="${searchTerm}"
          oninput="LibraryView.search(this.value)" />
        <button class="btn btn-primary btn-sm" onclick="LibraryView.newExercise()">+ NEW</button>
      </div>`;

    // Type filter
    html += `
      <div style="display:flex;gap:6px;padding:0 12px 8px;overflow-x:auto;">
        ${['all','gym','calisthenics','stretching'].map(t => `
          <div class="filter-chip ${filterType===t?'active':''}" onclick="LibraryView.setFilter('${t}')">
            ${t === 'all' ? 'All' : t.charAt(0).toUpperCase()+t.slice(1)}
          </div>`).join('')}
      </div>`;

    const filtered = exercises.filter(ex => {
      const matchSearch = !searchTerm || ex.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchType = filterType === 'all' || ex.type === filterType;
      return matchSearch && matchType;
    });

    if (!exercises.length) {
      html += `
        <div class="empty-state">
          <div class="empty-icon"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></div>
          <div class="empty-title">Exercise Library Empty</div>
          <div class="empty-sub">Add your first exercise to build your library.</div>
          <button class="btn btn-primary" style="margin-top:12px" onclick="LibraryView.newExercise()">Add Exercise</button>
        </div>`;
    } else if (!filtered.length) {
      html += `
        <div class="empty-state">
          <div class="empty-title">No Matches</div>
          <div class="empty-sub">Try a different search or filter.</div>
        </div>`;
    } else {
      // Group by type
      const types = filterType === 'all' ? ['gym','calisthenics','stretching'] : [filterType];
      types.forEach(type => {
        const group = filtered.filter(e => e.type === type);
        if (!group.length) return;
        html += `
          <div class="card" style="margin:0 12px 10px;">
            <div style="padding:8px 16px 4px;font-family:var(--mono);font-size:0.62rem;letter-spacing:0.12em;color:var(--text3);border-bottom:1px solid var(--border);">${type.toUpperCase()}</div>`;
        group.forEach(ex => {
          const sessions = DB.getSessions();
          const logCount = sessions.filter(s => (s.exercises||[]).some(e=>e.exerciseId===ex.id)).length;
          const prs = DB.getPRs(ex.id);
          html += `
            <div class="exercise-item">
              <div class="exercise-item-info" onclick="LibraryView.viewExercise('${ex.id}')">
                <div class="exercise-item-name">${ex.name}</div>
                <div class="exercise-item-meta">
                  ${ex.isometric ? 'Isometric · ' : ''}${ex.useWeight===false ? 'Bodyweight' : 'Weighted'}
                  ${logCount > 0 ? ` · ${logCount} session${logCount!==1?'s':''}` : ''}
                  ${prs.maxWeight > 0 ? ` · PR: ${prs.maxWeight}lbs` : ''}
                  ${prs.maxHold > 0 ? ` · PR: ${prs.maxHold}s` : ''}
                </div>
              </div>
              <div class="exercise-item-actions">
                <button class="icon-btn" onclick="LibraryView.editExercise('${ex.id}')">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button class="icon-btn" style="color:var(--danger)" onclick="LibraryView.deleteExercise('${ex.id}')">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                </button>
              </div>
            </div>`;
        });
        html += `</div>`;
      });
    }

    html += `</div>`;
    return html;
  };

  const exerciseFormHtml = (ex = {}) => {
    const types = ['gym','calisthenics','stretching'];
    return `
      <div class="field">
        <label class="field-label">Exercise Name *</label>
        <input class="field-input" id="ex-name" type="text" value="${ex.name||''}" placeholder="e.g. Weighted Pull-Up" autofocus />
      </div>
      <div class="field">
        <label class="field-label">Type *</label>
        <select class="field-select" id="ex-type">
          ${types.map(t=>`<option value="${t}" ${ex.type===t?'selected':''}>${t.charAt(0).toUpperCase()+t.slice(1)}</option>`).join('')}
        </select>
      </div>
      <div class="field-row field-row-2">
        <div class="field">
          <label class="field-label">Uses Weight?</label>
          <select class="field-select" id="ex-useweight">
            <option value="yes" ${ex.useWeight!==false?'selected':''}>Yes</option>
            <option value="no" ${ex.useWeight===false?'selected':''}>No (bodyweight)</option>
          </select>
        </div>
        <div class="field">
          <label class="field-label">Isometric?</label>
          <select class="field-select" id="ex-isometric">
            <option value="no" ${!ex.isometric?'selected':''}>No</option>
            <option value="yes" ${ex.isometric?'selected':''}>Yes</option>
          </select>
        </div>
      </div>
      <div class="field">
        <label class="field-label">Uses Duration?</label>
        <select class="field-select" id="ex-duration">
          <option value="no" ${!ex.useDuration?'selected':''}>No</option>
          <option value="yes" ${ex.useDuration?'selected':''}>Yes</option>
        </select>
      </div>
      <div class="field">
        <label class="field-label">Notes / Description</label>
        <input class="field-input" id="ex-notes" type="text" value="${ex.notes||''}" placeholder="Optional notes" />
      </div>`;
  };

  const readExerciseForm = () => ({
    name: document.getElementById('ex-name').value.trim(),
    type: document.getElementById('ex-type').value,
    useWeight: document.getElementById('ex-useweight').value === 'yes',
    isometric: document.getElementById('ex-isometric').value === 'yes',
    useDuration: document.getElementById('ex-duration').value === 'yes',
    notes: document.getElementById('ex-notes').value.trim(),
  });

  const newExercise = () => {
    UI.modal({
      title: 'NEW EXERCISE',
      body: exerciseFormHtml(),
      actions: [
        { label: 'Add Exercise', primary: true, action: () => {
          const data = readExerciseForm();
          if (!data.name) return;
          DB.saveExercise({ id: DB.uid(), ...data, createdAt: new Date().toISOString() });
          UI.closeModal();
          App.navigate('library');
        }},
        { label: 'Cancel', action: () => UI.closeModal() }
      ]
    });
  };

  const editExercise = (id) => {
    const ex = DB.getExercise(id);
    if (!ex) return;
    UI.modal({
      title: 'EDIT EXERCISE',
      body: exerciseFormHtml(ex),
      actions: [
        { label: 'Save', primary: true, action: () => {
          const data = readExerciseForm();
          if (!data.name) return;
          DB.saveExercise({ ...ex, ...data });
          UI.closeModal();
          App.navigate('library');
        }},
        { label: 'Cancel', action: () => UI.closeModal() }
      ]
    });
  };

  const deleteExercise = (id) => {
    const ex = DB.getExercise(id);
    UI.confirm(`Delete "${ex?.name||'this exercise'}"? This cannot be undone.`, () => {
      DB.deleteExercise(id);
      App.navigate('library');
    });
  };

  const viewExercise = (id) => {
    const ex = DB.getExercise(id);
    if (!ex) return;
    const prs = DB.getPRs(id);
    const history = DB.getVolumeHistory(id);
    const sessions = DB.getSessions().filter(s=>(s.exercises||[]).some(e=>e.exerciseId===id)).length;

    let html = `
      <div style="padding:4px 0 12px;">
        <div style="display:flex;gap:6px;margin-bottom:12px;">
          <span class="chip chip-${ex.type}">${ex.type.toUpperCase()}</span>
          ${ex.isometric ? '<span class="chip" style="background:var(--bg3);color:var(--text2);">ISOMETRIC</span>' : ''}
        </div>
        ${ex.notes ? `<div style="font-size:0.875rem;color:var(--text2);margin-bottom:12px;">${ex.notes}</div>` : ''}
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:12px;">
          <div style="text-align:center;padding:10px;background:var(--bg2);border-radius:var(--radius-sm);">
            <div style="font-family:var(--mono);font-size:1.1rem;font-weight:500;">${sessions}</div>
            <div style="font-family:var(--mono);font-size:0.58rem;color:var(--text3);margin-top:2px;">SESSIONS</div>
          </div>
          <div style="text-align:center;padding:10px;background:var(--bg2);border-radius:var(--radius-sm);">
            <div style="font-family:var(--mono);font-size:1.1rem;font-weight:500;">${prs.maxWeight>0?prs.maxWeight+'lbs':prs.maxHold>0?prs.maxHold+'s':'—'}</div>
            <div style="font-family:var(--mono);font-size:0.58rem;color:var(--text3);margin-top:2px;">${ex.isometric?'MAX HOLD':'MAX WEIGHT'}</div>
          </div>
          <div style="text-align:center;padding:10px;background:var(--bg2);border-radius:var(--radius-sm);">
            <div style="font-family:var(--mono);font-size:1.1rem;font-weight:500;">${prs.maxReps>0?prs.maxReps:'—'}</div>
            <div style="font-family:var(--mono);font-size:0.58rem;color:var(--text3);margin-top:2px;">MAX REPS</div>
          </div>
        </div>
      </div>`;

    UI.sheet({
      title: ex.name,
      body: html,
      actions: [
        { label: 'Edit', primary: true, action: () => { UI.closeModal(); editExercise(id); } },
        { label: 'Close', action: () => UI.closeModal() }
      ]
    });
  };

  const search = (val) => {
    searchTerm = val;
    document.getElementById('main-content').innerHTML = render();
  };

  const setFilter = (type) => {
    filterType = type;
    App.navigate('library');
  };

  return { render, newExercise, editExercise, deleteExercise, viewExercise, search, setFilter };
})();
