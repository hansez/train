// views/log.js v2 — Session logging with paired sets, exercise decision tree, session timer

const LogView = (() => {
  let timerInterval = null;

  const newSet = () => ({
    id: DB.uid(), reps:'', seconds:'', weight:'', progression:'', distance:'',
    rpe:'', rir:'', sir:'', notes:'', holdDuration:'', tempo:'',
    assistance:'', resistance:'', done:false, showAdv:false,
  });

  // ---- Render ----
  const render = () => {
    const draft = State.getSessionDraft();
    return draft ? renderSession(draft) : renderNoSession();
  };

  const renderNoSession = () => {
    const templates = DB.getTemplates();
    let html = `<div class="view">`;
    html += `<div class="section-hd"><span class="section-lbl">Start Session</span></div>`;

    if (templates.length) {
      templates.forEach(t => {
        html += `
          <div class="card" style="cursor:pointer;">
            <div class="card-body" style="display:flex;align-items:center;gap:12px;">
              <div style="flex:1;">
                <div style="font-family:var(--display);font-size:1rem;font-weight:700;">${t.name}</div>
                <div style="font-family:var(--mono);font-size:0.68rem;color:var(--text3);margin-top:3px;">${t.estimatedDuration||60} min · ${(t.groups||[]).length} group${(t.groups||[]).length!==1?'s':''}</div>
              </div>
              <button class="btn btn-primary btn-sm" onclick="App.startSession('${t.id}')">START</button>
            </div>
          </div>`;
      });
    }

    html += `
      <div class="section-hd"><span class="section-lbl">Or</span></div>
      <div style="padding:0 14px 14px;display:flex;gap:8px;">
        <button class="btn btn-secondary flex-1" onclick="LogView.startFree()">Free Session</button>
      </div>
      <div class="section-hd" style="padding-top:8px;"><span class="section-lbl">Session Templates</span><span class="section-act" onclick="LogView.newTemplate()">+ New</span></div>`;

    if (!templates.length) {
      html += `
        <div class="empty-state" style="padding:30px 24px;">
          <div class="empty-title">No Templates Yet</div>
          <div class="empty-sub">Create a session template to plan your workouts.</div>
          <button class="btn btn-primary" style="margin-top:12px" onclick="LogView.newTemplate()">Create Template</button>
        </div>`;
    } else {
      html += `<div style="padding:0 14px 14px;display:flex;gap:8px;flex-wrap:wrap;">`;
      templates.forEach(t => {
        html += `
          <div style="display:flex;align-items:center;gap:6px;background:var(--surface);border:1.5px solid var(--border);border-radius:var(--radius-sm);padding:8px 12px;cursor:pointer;" onclick="LogView.editTemplate('${t.id}')">
            <span style="font-family:var(--mono);font-size:0.75rem;">${t.name}</span>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--text3)"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </div>`;
      });
      html += `</div>`;
    }

    html += `</div>`;
    return html;
  };

  const renderSession = (draft) => {
    const elapsed = draft.startedAt ? Math.floor((Date.now() - draft.startedAt) / 1000) : 0;
    const mm = String(Math.floor(elapsed/60)).padStart(2,'0');
    const ss = String(elapsed%60).padStart(2,'0');

    let html = `<div class="view">`;

    // Session topbar
    html += `
      <div class="session-topbar">
        <div class="session-info">
          <div class="session-name">${draft.name||'Session'}</div>
          <div class="session-meta" id="session-elapsed">${mm}:${ss}</div>
        </div>
        <div style="display:flex;gap:6px;">
          <button class="btn btn-primary btn-sm" onclick="LogView.finishSession()">FINISH</button>
          <button class="icon-btn" onclick="LogView.discard()" style="color:var(--red);">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
          </button>
        </div>
      </div>`;

    // Exercise groups
    (draft.groups||[]).forEach((g, gi) => {
      const isPaired = (g.exercises||[]).length > 1;
      html += `<div class="set-group">`;
      if (isPaired) {
        html += `<div class="set-group-label">PAIRED SET · ${g.label||''}</div>`;
      }
      (g.exercises||[]).forEach((ex, ei) => {
        html += renderExerciseBlock(draft, gi, ei, g, ex);
      });
      // Add exercise to group
      html += `<div style="padding:8px 14px;border-top:1.5px solid var(--border);display:flex;gap:6px;">
        <button class="btn btn-ghost btn-xs" onclick="LogView.addExerciseToGroup(${gi})">+ Exercise</button>
        ${!isPaired ? `<button class="btn btn-ghost btn-xs" style="color:var(--text3);" onclick="LogView.addExerciseToGroup(${gi})">+ Pair</button>` : ''}
        <button class="btn btn-ghost btn-xs" style="color:var(--red);" onclick="LogView.removeGroup(${gi})">Remove Group</button>
      </div>`;
      html += `</div>`;
    });

    // Add group buttons
    html += `
      <div class="add-block-btn" onclick="LogView.addGroup(false)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        ADD EXERCISE
      </div>
      <div class="add-block-btn" onclick="LogView.addGroup(true)" style="margin-top:-4px;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        ADD PAIRED SET
      </div>`;

    html += `</div>`;
    return html;
  };

  const renderExerciseBlock = (draft, gi, ei, g, ex) => {
    const exDef = DB.getExercise(ex.exerciseId) || { name: ex.name||'?', type:'dynamic_weighted', effortMetrics:['RPE'], category:'main' };
    const expanded = ex.expanded !== false;
    const isPaired = (g.exercises||[]).length > 1;
    const pairLabel = isPaired ? `${g.label||''}${ei+1}` : (g.label||'');
    const doneCount = (ex.sets||[]).filter(s=>s.done).length;
    const totalSets = (ex.sets||[]).length;

    // Build prescription string
    const pres = buildPrescriptionString(ex, exDef);

    let html = `<div class="exercise-block">`;

    // Collapsed header
    html += `
      <div class="exercise-collapsed" onclick="LogView.toggleExpand(${gi},${ei})">
        <div class="exercise-pair-label">${pairLabel}</div>
        <div class="exercise-collapsed-info">
          <div class="exercise-collapsed-name">${exDef.name}</div>
          <div class="exercise-collapsed-prescription">${pres}</div>
        </div>
        <div class="exercise-collapsed-progress" style="color:${doneCount===totalSets&&totalSets>0?'var(--green)':'var(--text2)'}">
          ${doneCount}/${totalSets}
        </div>
        <svg class="expand-arrow ${expanded?'open':''}" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
      </div>`;

    if (expanded) {
      html += `<div class="exercise-expanded">`;
      // Set rows
      (ex.sets||[]).forEach((set, si) => {
        html += renderSetRow(set, si, gi, ei, exDef);
      });
      html += `</div>`;
      // Add set
      html += `<div class="add-set-row" onclick="LogView.addSet(${gi},${ei})">+ ADD SET</div>`;
    }

    html += `</div>`;
    return html;
  };

  const buildPrescriptionString = (ex, exDef) => {
    const parts = [];
    const t = exDef.type || 'dynamic_weighted';
    if (ex.targetSetsMin||ex.targetSetsMax) {
      const sets = ex.targetSetsMin===ex.targetSetsMax ? ex.targetSetsMin : `${ex.targetSetsMin||'?'}-${ex.targetSetsMax||'?'}`;
      parts.push(`${sets} sets`);
    }
    if (t==='dynamic_weighted'||t==='dynamic_bodyweight') {
      if (ex.targetRepsMin||ex.targetRepsMax) {
        const reps = ex.targetRepsMin===ex.targetRepsMax ? ex.targetRepsMin : `${ex.targetRepsMin||'?'}-${ex.targetRepsMax||'?'}`;
        parts.push(`${reps} reps`);
      }
    }
    if (t==='static_weighted'||t==='static_bodyweight') {
      if (ex.targetSecondsMin||ex.targetSecondsMax) {
        const secs = ex.targetSecondsMin===ex.targetSecondsMax ? ex.targetSecondsMin : `${ex.targetSecondsMin||'?'}-${ex.targetSecondsMax||'?'}`;
        parts.push(`${secs}s`);
      }
    }
    if (t==='dynamic_weighted'||t==='static_weighted') {
      if (ex.targetWeight) parts.push(`${ex.targetWeight} lbs`);
    }
    if ((t==='dynamic_bodyweight'||t==='static_bodyweight') && ex.targetProgressionId) {
      const prog = (exDef.progressions||[]).find(p=>p.id===ex.targetProgressionId);
      if (prog) parts.push(prog.name);
    }
    if (ex.targetRPEMin||ex.targetRPEMax) {
      const rpe = ex.targetRPEMin===ex.targetRPEMax ? ex.targetRPEMin : `${ex.targetRPEMin||'?'}-${ex.targetRPEMax||'?'}`;
      parts.push(`@ RPE ${rpe}`);
    }
    if (ex.targetRIR) parts.push(`${ex.targetRIR} RIR`);
    if (ex.heightAdj) parts.push(`${ex.heightAdj}h`);
    return parts.join(' × ') || '—';
  };

  const renderSetRow = (set, si, gi, ei, exDef) => {
    const t = exDef.type||'dynamic_weighted';
    const metrics = exDef.effortMetrics||['RPE'];
    const progs = exDef.progressions||[];
    const isDyn = t==='dynamic_weighted'||t==='dynamic_bodyweight';
    const isWeighted = t==='dynamic_weighted'||t==='static_weighted';
    const isBW = t==='dynamic_bodyweight'||t==='static_bodyweight';
    const isStatic = t==='static_weighted'||t==='static_bodyweight';

    let html = `<div class="set-row-log">
      <div class="set-num-badge ${set.done?'done':''}">${si+1}</div>
      <div class="set-fields-row">`;

    // Core fields based on type
    if (isDyn) {
      html += miniField('Reps', `LogView.updateSet(${gi},${ei},${si},'reps',this.value)`, set.reps, 'number');
    }
    if (isStatic) {
      html += miniField('Sec', `LogView.updateSet(${gi},${ei},${si},'seconds',this.value)`, set.seconds, 'number');
    }
    if (isWeighted) {
      html += miniField('lbs', `LogView.updateSet(${gi},${ei},${si},'weight',this.value)`, set.weight, 'number', true);
    }
    if (isBW && progs.length) {
      // Progression dropdown
      html += `<div class="set-mini-field">
        <div class="set-mini-lbl">Prog</div>
        <select class="set-mini-select" onchange="LogView.updateSet(${gi},${ei},${si},'progression',this.value)">
          <option value="">—</option>
          ${progs.map(p=>`<option value="${p.name}" ${set.progression===p.name?'selected':''}>${p.name}</option>`).join('')}
        </select>
      </div>`;
    }
    if (t==='static_bodyweight' && exDef.progressionMeasure==='distance') {
      html += miniField('Dist', `LogView.updateSet(${gi},${ei},${si},'distance',this.value)`, set.distance, 'text', true);
    }

    // Effort metrics
    if (metrics.includes('RIR')) html += miniField('RIR', `LogView.updateSet(${gi},${ei},${si},'rir',this.value)`, set.rir, 'number');
    if (metrics.includes('SIR')) html += miniField('SIR', `LogView.updateSet(${gi},${ei},${si},'sir',this.value)`, set.sir, 'number');
    if (metrics.includes('RPE')) html += miniField('RPE', `LogView.updateSet(${gi},${ei},${si},'rpe',this.value)`, set.rpe, 'number');

    html += `</div>
      <div class="set-check-btn ${set.done?'done':''}" onclick="LogView.toggleDone(${gi},${ei},${si})">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
    </div>`;

    // Notes line
    html += `<div style="padding:2px 26px 4px;">
      <input style="width:100%;font-family:var(--mono);font-size:0.72rem;color:var(--text2);background:transparent;border:none;border-bottom:1px dashed var(--border);padding:3px 0;outline:none;" 
        placeholder="Notes…" value="${set.notes||''}"
        onchange="LogView.updateSet(${gi},${ei},${si},'notes',this.value)" />
    </div>`;

    // Advanced toggle
    html += `<div class="adv-toggle" style="padding-left:26px;" onclick="LogView.toggleAdv(${gi},${ei},${si})">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="${set.showAdv?'18 15 12 9 6 15':'6 9 12 15 18 9'}"/></svg>
      ${set.showAdv?'HIDE ADVANCED':'ADVANCED'}
    </div>`;

    if (set.showAdv) {
      html += `<div class="adv-fields" style="padding-left:26px;padding-right:8px;">`;
      if (isDyn) html += miniField('Hold(s)', `LogView.updateSet(${gi},${ei},${si},'holdDuration',this.value)`, set.holdDuration, 'number', true);
      html += miniField('Tempo', `LogView.updateSet(${gi},${ei},${si},'tempo',this.value)`, set.tempo, 'text', true);
      if (exDef.assistanceOptions?.length) {
        html += `<div class="set-mini-field">
          <div class="set-mini-lbl">Assist</div>
          <select class="set-mini-select" onchange="LogView.updateSet(${gi},${ei},${si},'assistance',this.value)">
            <option value="">—</option>
            ${exDef.assistanceOptions.map(o=>`<option value="${o}" ${set.assistance===o?'selected':''}>${o}</option>`).join('')}
          </select>
        </div>`;
      }
      if (exDef.resistanceOptions?.length) {
        html += `<div class="set-mini-field">
          <div class="set-mini-lbl">Resist</div>
          <select class="set-mini-select" onchange="LogView.updateSet(${gi},${ei},${si},'resistance',this.value)">
            <option value="">—</option>
            ${exDef.resistanceOptions.map(o=>`<option value="${o}" ${set.resistance===o?'selected':''}>${o}</option>`).join('')}
          </select>
        </div>`;
      }
      if (t==='static_bodyweight') {
        html += miniField('HeightAdj', `LogView.updateSet(${gi},${ei},${si},'heightAdj',this.value)`, set.heightAdj, 'text', true);
      }
      html += `</div>`;
    }

    return html;
  };

  const miniField = (lbl, onchange, val, type='number', wide=false) => `
    <div class="set-mini-field">
      <div class="set-mini-lbl">${lbl}</div>
      <input class="set-mini-input${wide?' wide':''}" type="${type}" value="${val||''}" placeholder="—"
        onchange="${onchange}" ${type==='number'?'step="0.5"':''} />
    </div>`;

  // ---- Actions ----

  const toggleExpand = (gi, ei) => {
    const draft = State.getSessionDraft(); if(!draft) return;
    draft.groups[gi].exercises[ei].expanded = !draft.groups[gi].exercises[ei].expanded;
    State.setSessionDraft(draft); App.navigate('log');
  };

  const updateSet = (gi, ei, si, field, val) => {
    const draft = State.getSessionDraft(); if(!draft) return;
    draft.groups[gi].exercises[ei].sets[si][field] = val;
    State.setSessionDraft(draft);
  };

  const toggleDone = (gi, ei, si) => {
    const draft = State.getSessionDraft(); if(!draft) return;
    draft.groups[gi].exercises[ei].sets[si].done = !draft.groups[gi].exercises[ei].sets[si].done;
    State.setSessionDraft(draft); App.navigate('log');
  };

  const toggleAdv = (gi, ei, si) => {
    const draft = State.getSessionDraft(); if(!draft) return;
    draft.groups[gi].exercises[ei].sets[si].showAdv = !draft.groups[gi].exercises[ei].sets[si].showAdv;
    State.setSessionDraft(draft); App.navigate('log');
  };

  const addSet = (gi, ei) => {
    const draft = State.getSessionDraft(); if(!draft) return;
    const sets = draft.groups[gi].exercises[ei].sets;
    const last = sets.length ? {...sets[sets.length-1], done:false, id:DB.uid()} : newSet();
    sets.push(last);
    State.setSessionDraft(draft); App.navigate('log');
  };

  const addGroup = (paired) => {
    const draft = State.getSessionDraft(); if(!draft) return;
    const exes = DB.getExercises();
    if (!exes.length) { UI.alert('Add exercises to your library first.'); return; }
    _pickExercise((exId) => {
      const label = _nextGroupLabel(draft);
      const ex = DB.getExercise(exId);
      const newGroup = {
        id: DB.uid(), label,
        exercises: [{ exerciseId: exId, name: ex?.name||'', expanded: true, sets: [newSet()] }]
      };
      draft.groups = draft.groups || [];
      draft.groups.push(newGroup);
      if (paired) {
        _pickExercise((exId2) => {
          const ex2 = DB.getExercise(exId2);
          newGroup.exercises.push({ exerciseId: exId2, name: ex2?.name||'', expanded: true, sets: [newSet()] });
          State.setSessionDraft(draft); App.navigate('log');
        });
      } else {
        State.setSessionDraft(draft); App.navigate('log');
      }
    });
  };

  const addExerciseToGroup = (gi) => {
    const draft = State.getSessionDraft(); if(!draft) return;
    _pickExercise((exId) => {
      const ex = DB.getExercise(exId);
      draft.groups[gi].exercises.push({ exerciseId: exId, name: ex?.name||'', expanded: true, sets: [newSet()] });
      State.setSessionDraft(draft); App.navigate('log');
    });
  };

  const removeGroup = (gi) => {
    const draft = State.getSessionDraft(); if(!draft) return;
    UI.confirm('Remove this exercise group?', () => {
      draft.groups.splice(gi,1); State.setSessionDraft(draft); App.navigate('log');
    });
  };

  const _nextGroupLabel = (draft) => {
    const labels = (draft.groups||[]).map(g=>g.label||'').filter(Boolean);
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (let i=0;i<chars.length;i++) if (!labels.includes(chars[i])) return chars[i];
    return 'X';
  };

  const _pickExercise = (cb) => {
    const exercises = DB.getExercises();
    if (!exercises.length) { UI.alert('No exercises in library.'); return; }
    const cats = ['main','accessory','flexibility'];
    let html = `<div>`;
    cats.forEach(cat => {
      const group = exercises.filter(e=>e.category===cat);
      if (!group.length) return;
      html += `<div style="padding:8px 18px 4px;font-family:var(--mono);font-size:0.62rem;letter-spacing:0.12em;color:var(--text3);">${cat.toUpperCase()}</div>`;
      group.forEach(ex => {
        html += `<div class="exercise-item" onclick="LogView._cbExercise('${ex.id}')">
          <div class="exercise-item-info">
            <div class="exercise-item-name">${ex.name}</div>
            <div class="exercise-item-meta">${ex.type?.replace(/_/g,' ')||''}</div>
          </div>
        </div>`;
      });
    });
    html += `</div>`;
    window._exPickCb = cb;
    UI.sheet({ title: 'SELECT EXERCISE', body: html });
  };

  let _exPickCb = null;
  const _cbExercise = (id) => {
    UI.closeModal();
    const cb = window._exPickCb;
    window._exPickCb = null;
    if (cb) cb(id);
  };

  const startFree = () => {
    const today = new Date().toISOString().slice(0,10);
    const draft = { id:DB.uid(), name:'Free Session', date:today, startedAt:Date.now(), groups:[] };
    State.setSessionDraft(draft);
    startTimer();
    App.navigate('log');
  };

  const startTimer = () => {
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      const draft = State.getSessionDraft();
      if (!draft) { clearInterval(timerInterval); return; }
      const elapsed = Math.floor((Date.now() - draft.startedAt) / 1000);
      const el = document.getElementById('session-elapsed');
      if (el) {
        const mm = String(Math.floor(elapsed/60)).padStart(2,'0');
        const ss = String(elapsed%60).padStart(2,'0');
        el.textContent = `${mm}:${ss}`;
      }
    }, 1000);
  };

  const finishSession = () => {
    const draft = State.getSessionDraft(); if(!draft) return;
    const duration = draft.startedAt ? Math.round((Date.now()-draft.startedAt)/60000) : null;
    const latestBW = DB.getLatestBodyweight();

    UI.modal({
      title: 'FINISH SESSION',
      body: `
        <div style="margin-bottom:14px;font-family:var(--mono);font-size:0.8rem;color:var(--text2);">${duration?`Session time: ${duration} min`:'Good work!'}</div>
        <div class="field">
          <label class="field-label">Bodyweight (lbs)</label>
          <input class="field-input" id="fin-bw" type="number" step="0.1" value="${latestBW?.weight||''}" placeholder="e.g. 175.5" />
        </div>
        <div class="field">
          <label class="field-label">Session RPE (1–10)</label>
          <input class="field-input" id="fin-rpe" type="number" min="1" max="10" step="0.5" placeholder="How hard was it overall?" />
        </div>`,
      actions: [
        { label: 'Save Session', primary: true, action: () => {
          const bw = parseFloat(document.getElementById('fin-bw').value);
          const rpe = parseFloat(document.getElementById('fin-rpe').value);
          const today = new Date().toISOString().slice(0,10);
          if (bw && !isNaN(bw)) DB.saveBodyweight({ date: today, weight: bw });
          draft.completed = true;
          draft.completedAt = new Date().toISOString();
          draft.duration = duration;
          draft.bodyweight = bw||null;
          draft.sessionRPE = rpe||null;
          DB.saveSession(draft);
          clearInterval(timerInterval);
          State.clearSessionDraft();
          UI.closeModal();
          UI.toast('Session saved! 💪');
          App.navigate('home');
        }},
        { label: 'Cancel', action: () => UI.closeModal() }
      ]
    });
  };

  const discard = () => {
    UI.confirm('Discard this session? All data will be lost.', () => {
      clearInterval(timerInterval);
      State.clearSessionDraft();
      App.navigate('log');
    });
  };

  // ---- Template Editor ----
  const newTemplate = () => {
    const t = { id: DB.uid(), name:'', estimatedDuration: 90, groups:[] };
    _editTemplate(t, true);
  };

  const editTemplate = (id) => {
    const t = DB.getTemplate(id);
    if (!t) return;
    _editTemplate(t, false);
  };

  const _editTemplate = (t, isNew) => {
    UI.modal({
      title: isNew ? 'NEW TEMPLATE' : 'EDIT TEMPLATE',
      body: `
        <div class="field">
          <label class="field-label">Session Name *</label>
          <input class="field-input" id="tpl-name" type="text" value="${t.name||''}" placeholder="e.g. Day 1 — Upper Push" autofocus />
        </div>
        <div class="field">
          <label class="field-label">Estimated Duration (min)</label>
          <input class="field-input" id="tpl-dur" type="number" value="${t.estimatedDuration||90}" placeholder="90" />
        </div>`,
      actions: [
        { label: isNew?'Create':'Save', primary: true, action: () => {
          const name = document.getElementById('tpl-name').value.trim();
          if (!name) return;
          t.name = name;
          t.estimatedDuration = parseInt(document.getElementById('tpl-dur').value)||90;
          DB.saveTemplate(t);
          UI.closeModal();
          App.navigate('log');
        }},
        { label: 'Cancel', action: () => UI.closeModal() }
      ]
    });
  };

  return {
    render,
    toggleExpand, updateSet, toggleDone, toggleAdv,
    addSet, addGroup, addExerciseToGroup, removeGroup,
    _cbExercise,
    startFree, startTimer, finishSession, discard,
    newTemplate, editTemplate,
  };
})();
