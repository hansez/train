// views/library.js v2 — Exercise library with full decision tree

const LibraryView = (() => {
  let searchTerm = '';
  let filterCat = 'all';

  const render = () => {
    const exercises = DB.getExercises();
    const filtered = exercises.filter(ex => {
      const matchSearch = !searchTerm || ex.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCat = filterCat==='all' || ex.category===filterCat;
      return matchSearch && matchCat;
    });

    let html = `<div class="view">`;

    html += `
      <div class="lib-search-wrap">
        <input class="lib-search-input" type="search" placeholder="Search exercises…" 
          value="${searchTerm}" id="lib-search-input"
          oninput="LibraryView._search(this.value)" />
        <button class="btn btn-primary btn-sm" onclick="LibraryView.newExercise()">+ NEW</button>
      </div>
      <div class="filter-row">
        ${['all','main','accessory','flexibility'].map(c=>`
          <div class="filter-chip ${filterCat===c?'active':''}" onclick="LibraryView.setFilter('${c}')">
            ${c==='all'?'All':c.charAt(0).toUpperCase()+c.slice(1)}
          </div>`).join('')}
      </div>`;

    if (!exercises.length) {
      html += `
        <div class="empty-state">
          <div class="empty-title">Library Empty</div>
          <div class="empty-sub">Add your first exercise to get started.</div>
          <button class="btn btn-primary" style="margin-top:14px" onclick="LibraryView.newExercise()">Add Exercise</button>
        </div>`;
    } else if (!filtered.length) {
      html += `<div class="empty-state"><div class="empty-title">No Matches</div></div>`;
    } else {
      const cats = filterCat==='all' ? ['main','accessory','flexibility'] : [filterCat];
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
                <div class="exercise-item-name">${ex.name}</div>
                <div class="exercise-item-meta">
                  ${typeLabel(ex.type)}
                  ${(ex.effortMetrics||[]).join(' · ')}
                  ${logCount>0?' · '+logCount+' sessions':''}
                  ${prStr?' · '+prStr:''}
                </div>
              </div>
              <div class="exercise-item-actions">
                <button class="icon-btn" onclick="LibraryView.editExercise('${ex.id}')">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button class="icon-btn" style="color:var(--red);" onclick="LibraryView.deleteExercise('${ex.id}')">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
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

  const typeLabel = (t) => {
    const map = { dynamic_weighted:'Dynamic Weighted', dynamic_bodyweight:'Dynamic Bodyweight', static_weighted:'Static Weighted', static_bodyweight:'Static Bodyweight' };
    return map[t]||t||'';
  };

  // ---- Decision Tree Exercise Creator ----
  const newExercise = () => _openDecisionTree({}, true);
  const editExercise = (id) => { const ex = DB.getExercise(id); if(ex) _openDecisionTree(ex, false); };

  const _openDecisionTree = (ex={}, isNew) => {
    // Step 1: Choose type
    UI.modal({
      title: isNew ? 'NEW EXERCISE — TYPE' : 'EDIT EXERCISE',
      body: `
        <div class="field">
          <label class="field-label">Exercise Name *</label>
          <input class="field-input" id="ex-name" type="text" value="${ex.name||''}" placeholder="e.g. Front Lever Raise" autofocus />
        </div>
        <div class="field">
          <label class="field-label">Category</label>
          <select class="field-select" id="ex-cat">
            ${['main','accessory','flexibility'].map(c=>`<option value="${c}" ${ex.category===c?'selected':''}>${c.charAt(0).toUpperCase()+c.slice(1)}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label class="field-label">Type *</label>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
            ${[
              {val:'dynamic_weighted',   lbl:'Dynamic Weighted',   sub:'Reps × Weight'},
              {val:'dynamic_bodyweight', lbl:'Dynamic Bodyweight',  sub:'Reps × Progression'},
              {val:'static_weighted',    lbl:'Static Weighted',     sub:'Seconds × Weight'},
              {val:'static_bodyweight',  lbl:'Static Bodyweight',   sub:'Seconds × Progression'},
            ].map(opt=>`
              <div class="type-option ${ex.type===opt.val?'selected':''}" data-val="${opt.val}" onclick="LibraryView._selectType(this)" style="border:1.5px solid ${ex.type===opt.val?'var(--accent)':'var(--border)'};border-radius:var(--radius-sm);padding:12px;cursor:pointer;transition:all 160ms ease;">
                <div style="font-family:var(--display);font-size:0.82rem;font-weight:700;${ex.type===opt.val?'color:var(--accent)':''}">${opt.lbl}</div>
                <div style="font-family:var(--mono);font-size:0.65rem;color:var(--text3);margin-top:3px;">${opt.sub}</div>
              </div>`).join('')}
          </div>
          <input type="hidden" id="ex-type" value="${ex.type||''}" />
        </div>`,
      actions: [
        { label: 'Next →', primary: true, action: () => {
          const name = document.getElementById('ex-name').value.trim();
          const type = document.getElementById('ex-type').value;
          const cat = document.getElementById('ex-cat').value;
          if (!name||!type) { UI.toast('Name and type required'); return; }
          UI.closeModal();
          _openStep2({ ...ex, name, type, category: cat }, isNew);
        }},
        { label: 'Cancel', action: () => UI.closeModal() }
      ]
    });
  };

  const _selectType = (el) => {
    document.querySelectorAll('.type-option').forEach(o => {
      o.style.borderColor = 'var(--border)';
      o.querySelector('div').style.color = '';
    });
    el.style.borderColor = 'var(--accent)';
    el.querySelector('div').style.color = 'var(--accent)';
    document.getElementById('ex-type').value = el.dataset.val;
  };

  const _openStep2 = (ex, isNew) => {
    const t = ex.type;
    const isDynBW = t==='dynamic_bodyweight';
    const isStatBW = t==='static_bodyweight';
    const isBW = isDynBW||isStatBW;
    const isStatic = t==='static_weighted'||t==='static_bodyweight';

    // Build effort metric options
    const availMetrics = isStatic ? ['SIR','RPE'] : ['RIR','RPE'];
    const selMetrics = ex.effortMetrics||[];

    let body = `
      <div style="font-family:var(--mono);font-size:0.68rem;letter-spacing:0.1em;color:var(--accent);margin-bottom:14px;">${typeLabel(t).toUpperCase()}</div>

      <div class="field">
        <label class="field-label">Effort Tracking * (choose at least one)</label>
        <div class="check-group" id="effort-group">
          ${availMetrics.map(m=>`
            <div class="check-item ${selMetrics.includes(m)?'selected':''}" onclick="LibraryView._toggleMetric(this)" data-val="${m}">
              <input type="checkbox" ${selMetrics.includes(m)?'checked':''} /> ${m}
            </div>`).join('')}
        </div>
      </div>`;

    // Optional fields shared
    if (!isStatic) {
      body += `
        <div class="field">
          <label class="field-label">Optional: Tempo logging</label>
          <select class="field-select" id="ex-tempo">
            <option value="no" ${!ex.useTempo?'selected':''}>No</option>
            <option value="yes" ${ex.useTempo?'selected':''}>Yes</option>
          </select>
        </div>
        <div class="field">
          <label class="field-label">Optional: Last-rep isometric hold</label>
          <select class="field-select" id="ex-hold">
            <option value="no" ${!ex.useHold?'selected':''}>No</option>
            <option value="yes" ${ex.useHold?'selected':''}>Yes</option>
          </select>
        </div>`;
    }

    // Bodyweight-specific
    if (isBW) {
      const progs = (ex.progressions||[]);
      body += `
        <div class="field">
          <label class="field-label">Progressions (one per line)</label>
          <textarea class="field-input" id="ex-progs" rows="4" style="resize:vertical;" placeholder="e.g.\nTuck\nAdvanced Tuck\nStraddle\nFull">${progs.map(p=>p.name).join('\n')}</textarea>
          <div class="field-hint">These appear as a dropdown when logging sets</div>
        </div>`;
    }

    if (isStatBW) {
      body += `
        <div class="field">
          <label class="field-label">Progression measured by</label>
          <select class="field-select" id="ex-progmeasure">
            <option value="posture" ${ex.progressionMeasure!=='distance'?'selected':''}>Posture (e.g. Advanced Tuck)</option>
            <option value="distance" ${ex.progressionMeasure==='distance'?'selected':''}>Distance (e.g. 43 in from wall)</option>
          </select>
        </div>
        <div class="field">
          <label class="field-label">Assistance options (one per line, optional)</label>
          <textarea class="field-input" id="ex-assist" rows="3" style="resize:vertical;" placeholder="e.g.\nLight band\nMedium band\nHeavy band">${(ex.assistanceOptions||[]).join('\n')}</textarea>
        </div>
        <div class="field">
          <label class="field-label">Resistance options (one per line, optional)</label>
          <textarea class="field-input" id="ex-resist" rows="3" style="resize:vertical;" placeholder="e.g.\nAnkle weights 2.5lbs\nAnkle weights 5lbs">${(ex.resistanceOptions||[]).join('\n')}</textarea>
        </div>`;
    }

    body += `
      <div class="field">
        <label class="field-label">Notes (optional)</label>
        <input class="field-input" id="ex-notes" type="text" value="${ex.notes||''}" placeholder="Any cues or notes" />
      </div>`;

    UI.modal({
      title: (isNew?'NEW EXERCISE':'EDIT EXERCISE') + ' — DETAILS',
      body,
      actions: [
        { label: 'Save Exercise', primary: true, action: () => {
          const metrics = [...document.querySelectorAll('#effort-group .check-item.selected')].map(el=>el.dataset.val);
          if (!metrics.length) { UI.toast('Select at least one effort metric'); return; }

          const updated = { ...ex, effortMetrics: metrics };
          if (!ex.id) updated.id = DB.uid();

          if (!isStatic) {
            updated.useTempo = document.getElementById('ex-tempo')?.value==='yes';
            updated.useHold = document.getElementById('ex-hold')?.value==='yes';
          }
          if (isBW) {
            const progLines = (document.getElementById('ex-progs')?.value||'').split('\n').map(s=>s.trim()).filter(Boolean);
            updated.progressions = progLines.map((name,i)=>({ id: ex.progressions?.[i]?.id||DB.uid(), name }));
          }
          if (isStatBW) {
            updated.progressionMeasure = document.getElementById('ex-progmeasure')?.value||'posture';
            const aLines = (document.getElementById('ex-assist')?.value||'').split('\n').map(s=>s.trim()).filter(Boolean);
            const rLines = (document.getElementById('ex-resist')?.value||'').split('\n').map(s=>s.trim()).filter(Boolean);
            updated.assistanceOptions = aLines;
            updated.resistanceOptions = rLines;
          }
          updated.notes = document.getElementById('ex-notes')?.value||'';
          updated.createdAt = updated.createdAt||new Date().toISOString();

          DB.saveExercise(updated);
          UI.closeModal();
          App.navigate('library');
        }},
        { label: '← Back', action: () => { UI.closeModal(); _openDecisionTree(ex, isNew); } }
      ]
    });
  };

  const _toggleMetric = (el) => {
    el.classList.toggle('selected');
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
      <div style="padding:12px 18px;border-bottom:1.5px solid var(--border);">
        <div style="display:flex;gap:6px;margin-bottom:8px;">
          <span class="chip chip-${ex.category}">${(ex.category||'').toUpperCase()}</span>
        </div>
        <div style="font-family:var(--mono);font-size:0.75rem;color:var(--text2);">${typeLabel(ex.type)}</div>
        <div style="font-family:var(--mono);font-size:0.72rem;color:var(--text3);margin-top:4px;">Effort: ${(ex.effortMetrics||[]).join(', ')}</div>
        ${ex.notes?`<div style="font-size:0.9rem;color:var(--text2);margin-top:8px;">${ex.notes}</div>`:''}
      </div>
      <div style="padding:12px 18px;border-bottom:1.5px solid var(--border);display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">
        <div style="text-align:center;"><div style="font-family:var(--display);font-size:1.3rem;font-weight:800;">${logCount}</div><div style="font-family:var(--mono);font-size:0.58rem;color:var(--text3);">SESSIONS</div></div>
        <div style="text-align:center;"><div style="font-family:var(--display);font-size:1.3rem;font-weight:800;">${prs.maxWeight>0?prs.maxWeight:prs.maxHold>0?prs.maxHold+'s':'—'}</div><div style="font-family:var(--mono);font-size:0.58rem;color:var(--text3);">${ex.type?.includes('static')?'MAX HOLD':'MAX WEIGHT'}</div></div>
        <div style="text-align:center;"><div style="font-family:var(--display);font-size:1.3rem;font-weight:800;">${prs.maxReps>0?prs.maxReps:'—'}</div><div style="font-family:var(--mono);font-size:0.58rem;color:var(--text3);">MAX REPS</div></div>
      </div>
      ${ex.progressions?.length?`<div style="padding:12px 18px;border-bottom:1.5px solid var(--border);"><div style="font-family:var(--mono);font-size:0.62rem;color:var(--text3);margin-bottom:8px;">PROGRESSIONS</div>${ex.progressions.map(p=>`<div style="font-size:0.9rem;padding:4px 0;border-bottom:1px solid var(--border);">${p.name}</div>`).join('')}</div>`:''}
    </div>`;
    UI.sheet({ title: ex.name, body: html, actions: [
      { label: 'Edit', primary: true, action: () => { UI.closeModal(); editExercise(id); }},
      { label: 'Close', action: () => UI.closeModal() }
    ]});
  };

  const _search = (val) => {
    searchTerm = val;
    const main = document.getElementById('main-content');
    if (main) main.innerHTML = render();
    // Restore focus
    const inp = document.getElementById('lib-search-input');
    if (inp) { inp.focus(); inp.setSelectionRange(val.length, val.length); }
  };

  const setFilter = (cat) => { filterCat = cat; App.navigate('library'); };

  return { render, newExercise, editExercise, deleteExercise, viewExercise, _search, _selectType, _toggleMetric, setFilter };
})();
