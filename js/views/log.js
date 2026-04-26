// views/log.js — Session logging view

const LogView = (() => {
  const WEEKDAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

  const newSetData = () => ({
    id: DB.uid(),
    reps: '',
    weight: '',
    duration: '',
    rpe: '',
    rir: '',
    sir: '',
    notes: '',
    holdDuration: '',
    assistance: '',
    heightAdj: '',
    tempo: '',
    contractRelax: '',
    done: false,
    showAdvanced: false,
  });

  const render = () => {
    const draft = State.getSessionDraft();
    if (!draft) return renderNoSession();
    return renderSession(draft);
  };

  const renderNoSession = () => {
    const settings = DB.getSettings();
    const programs = DB.getPrograms();
    let html = `<div class="view">`;

    html += `<div class="section-header"><span class="section-label">Start Session</span></div>`;

    if (programs.length) {
      programs.forEach(prog => {
        html += `
          <div class="program-card">
            <div class="program-card-header">
              <div>
                <div class="program-name">${prog.name}</div>
                <div class="program-meta">${(prog.days||[]).length} days</div>
              </div>
            </div>`;
        (prog.days || []).forEach(day => {
          html += `
            <div class="day-row" onclick="App.startSession('${prog.id}','${day.id}')">
              <div class="day-label">${day.label || 'Day'}</div>
              <div class="day-info">
                <div class="day-name">${day.name}</div>
                <div class="day-exercises">${(day.exercises||[]).length} exercise${(day.exercises||[]).length!==1?'s':''}</div>
              </div>
              ${day.weekday ? `<div class="day-weekday">${day.weekday}</div>` : ''}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--text3)"><polyline points="9 18 15 12 9 6"/></svg>
            </div>`;
        });
        html += `</div>`;
      });
    } else {
      html += `
        <div class="empty-state">
          <div class="empty-icon"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div>
          <div class="empty-title">No Programs Yet</div>
          <div class="empty-sub">Create a program first, then come back to start a session.</div>
          <button class="btn btn-primary" style="margin-top:8px" onclick="App.navigate('programs')">Create Program</button>
        </div>`;
    }

    // Quick free-form session
    html += `
      <div class="section-header"><span class="section-label">Or</span></div>
      <div style="padding:0 12px 12px;">
        <button class="btn btn-secondary btn-full" onclick="LogView.startFreeSession()">Start Free-Form Session</button>
      </div>`;

    html += `</div>`;
    return html;
  };

  const renderSession = (draft) => {
    const todayStr = new Date().toISOString().slice(0,10);
    const todayBW = DB.getBodyweight(todayStr);
    let html = `<div class="view">`;

    // Session header
    html += `
      <div class="session-header">
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <div>
            <div class="session-title">${draft.programName || 'FREE SESSION'}</div>
            <div class="session-day">${draft.dayName || 'Training'}</div>
          </div>
          <div style="font-family:var(--mono);font-size:0.68rem;color:var(--text3);">${draft.date}</div>
        </div>
      </div>`;

    // Bodyweight prompt
    if (!todayBW) {
      html += `
        <div class="bw-prompt">
          <div class="bw-prompt-label">LOG BODYWEIGHT</div>
          <div class="bw-input-wrap">
            <input class="bw-input" type="number" step="0.1" id="bw-quick" placeholder="---" />
            <span class="bw-unit">lbs</span>
          </div>
          <button class="btn btn-primary btn-sm" onclick="LogView.saveBW()">Save</button>
        </div>`;
    } else {
      html += `
        <div style="margin:0 12px 8px;padding:8px 12px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);display:flex;justify-content:space-between;align-items:center;">
          <span style="font-family:var(--mono);font-size:0.65rem;letter-spacing:0.08em;color:var(--text3);">BODYWEIGHT</span>
          <span style="font-family:var(--mono);font-size:0.85rem;font-weight:500;">${todayBW.weight} lbs <button class="btn-ghost btn-sm" style="padding:2px 6px;font-size:0.6rem;" onclick="HomeView.logBW()">edit</button></span>
        </div>`;
    }

    // Exercise blocks
    (draft.exercises || []).forEach((ex, exIdx) => {
      const exDef = DB.getExercise(ex.exerciseId) || { name: ex.name || 'Exercise', type: 'gym' };
      html += renderExerciseBlock(ex, exIdx, exDef);
    });

    // Add exercise
    html += `
      <div class="add-exercise-btn" onclick="LogView.addExercise()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        ADD EXERCISE
      </div>`;

    // Session actions
    html += `
      <div class="session-actions">
        <button class="btn btn-primary flex-1" onclick="LogView.finishSession()">FINISH SESSION</button>
        <button class="btn btn-secondary" onclick="LogView.discardSession()" title="Discard">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
        </button>
      </div>`;

    html += `</div>`;
    return html;
  };

  const renderExerciseBlock = (ex, exIdx, exDef) => {
    const chipClass = `chip-${exDef.type || 'gym'}`;
    const isIsometric = exDef.isometric;
    let html = `
      <div class="exercise-block" id="exblock-${exIdx}">
        <div class="exercise-block-header">
          <div>
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;">
              <span class="chip ${chipClass}">${(exDef.type||'gym').toUpperCase()}</span>
            </div>
            <div class="exercise-block-name">${exDef.name}</div>
            ${ex.targetSets ? `<div class="exercise-block-target">Target: ${ex.targetSets}×${ex.targetReps||'?'}</div>` : ''}
          </div>
          <div style="display:flex;gap:4px;">
            <button class="icon-btn" onclick="LogView.reorderExercise(${exIdx},-1)" title="Move up" style="width:28px;height:28px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"/></svg>
            </button>
            <button class="icon-btn" onclick="LogView.removeExercise(${exIdx})" title="Remove" style="width:28px;height:28px;color:var(--danger);">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>`;

    // Set rows
    (ex.sets || []).forEach((set, setIdx) => {
      html += renderSetRow(set, setIdx, exIdx, exDef);
    });

    // Add set
    html += `<div class="add-set-btn" onclick="LogView.addSet(${exIdx})">+ ADD SET</div>`;
    html += `</div>`;
    return html;
  };

  const renderSetRow = (set, setIdx, exIdx, exDef) => {
    const isIsometric = exDef.isometric;
    const isStretching = exDef.type === 'stretching';
    const useWeight = exDef.useWeight !== false && !isStretching;

    let html = `
      <div class="set-row" id="set-${exIdx}-${setIdx}">
        <div class="set-num ${set.done?'done':''}">${setIdx+1}</div>
        <div style="flex:1;">
          <div class="set-fields">`;

    // Core fields
    if (!isIsometric) {
      html += `
        <div class="set-field">
          <div class="set-field-lbl">Reps</div>
          <input class="set-field-input" type="number" value="${set.reps||''}" placeholder="—" 
            onchange="LogView.updateSet(${exIdx},${setIdx},'reps',this.value)" />
        </div>`;
    }
    if (!isStretching) {
      html += `
        <div class="set-field">
          <div class="set-field-lbl">${isIsometric?'Hold (s)':'Weight (lbs)'}</div>
          <input class="set-field-input ${useWeight?'':'wide'}" type="number" step="0.5" value="${isIsometric?(set.holdDuration||''):(set.weight||'')}" placeholder="—"
            onchange="LogView.updateSet(${exIdx},${setIdx},'${isIsometric?'holdDuration':'weight'}',this.value)" />
        </div>`;
    }
    if (!isIsometric) {
      html += `
        <div class="set-field">
          <div class="set-field-lbl">RIR</div>
          <input class="set-field-input" type="number" value="${set.rir||''}" placeholder="—"
            onchange="LogView.updateSet(${exIdx},${setIdx},'rir',this.value)" />
        </div>`;
    } else {
      html += `
        <div class="set-field">
          <div class="set-field-lbl">SIR (s)</div>
          <input class="set-field-input" type="number" value="${set.sir||''}" placeholder="—"
            onchange="LogView.updateSet(${exIdx},${setIdx},'sir',this.value)" />
        </div>`;
    }
    html += `
        <div class="set-field">
          <div class="set-field-lbl">RPE</div>
          <input class="set-field-input" type="number" min="1" max="10" step="0.5" value="${set.rpe||''}" placeholder="—"
            onchange="LogView.updateSet(${exIdx},${setIdx},'rpe',this.value)" />
        </div>`;

    // Duration
    if (isStretching || exDef.useDuration) {
      html += `
        <div class="set-field">
          <div class="set-field-lbl">Duration</div>
          <input class="set-field-input wide" type="text" value="${set.duration||''}" placeholder="—"
            onchange="LogView.updateSet(${exIdx},${setIdx},'duration',this.value)" />
        </div>`;
    }

    // Done check
    html += `
            <div class="set-check ${set.done?'done':''}" onclick="LogView.toggleDone(${exIdx},${setIdx})">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
          </div>`;

    // Notes inline
    html += `
          <div style="padding:0 10px 4px;">
            <input class="field-input" type="text" placeholder="Notes…" value="${set.notes||''}" 
              style="font-size:0.78rem;padding:4px 8px;background:transparent;border:none;border-bottom:1px dashed var(--border);border-radius:0;"
              onchange="LogView.updateSet(${exIdx},${setIdx},'notes',this.value)" />
          </div>`;

    // Advanced toggle
    html += `
          <div class="advanced-toggle" onclick="LogView.toggleAdvanced(${exIdx},${setIdx})">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="${set.showAdvanced?'18 15 12 9 6 15':'6 9 12 15 18 9'}"/></svg>
            ${set.showAdvanced?'HIDE ADVANCED':'ADVANCED'}
          </div>`;

    if (set.showAdvanced) {
      html += `<div class="advanced-fields">`;
      if (!isIsometric) {
        html += `
          <div class="set-field">
            <div class="set-field-lbl">Hold End (s)</div>
            <input class="set-field-input wide" type="number" value="${set.holdDuration||''}" placeholder="—"
              onchange="LogView.updateSet(${exIdx},${setIdx},'holdDuration',this.value)" />
          </div>`;
      }
      html += `
          <div class="set-field">
            <div class="set-field-lbl">Assistance</div>
            <input class="set-field-input wide" type="text" value="${set.assistance||''}" placeholder="—"
              onchange="LogView.updateSet(${exIdx},${setIdx},'assistance',this.value)" />
          </div>
          <div class="set-field">
            <div class="set-field-lbl">Height Adj</div>
            <input class="set-field-input wide" type="text" value="${set.heightAdj||''}" placeholder="—"
              onchange="LogView.updateSet(${exIdx},${setIdx},'heightAdj',this.value)" />
          </div>
          <div class="set-field">
            <div class="set-field-lbl">Tempo</div>
            <input class="set-field-input wide" type="text" value="${set.tempo||''}" placeholder="e.g. 3-1-2"
              onchange="LogView.updateSet(${exIdx},${setIdx},'tempo',this.value)" />
          </div>`;
      if (isStretching) {
        html += `
          <div class="set-field">
            <div class="set-field-lbl">Contract (s)</div>
            <input class="set-field-input wide" type="number" value="${set.contractRelax||''}" placeholder="—"
              onchange="LogView.updateSet(${exIdx},${setIdx},'contractRelax',this.value)" />
          </div>`;
      }
      html += `</div>`;
    }

    html += `</div></div>`;
    return html;
  };

  // ---- Actions ----

  const saveBW = () => {
    const input = document.getElementById('bw-quick');
    const val = parseFloat(input?.value);
    if (!val || isNaN(val)) return;
    const todayStr = new Date().toISOString().slice(0,10);
    DB.saveBodyweight({ date: todayStr, weight: val });
    App.navigate('log');
  };

  const updateSet = (exIdx, setIdx, field, value) => {
    const draft = State.getSessionDraft();
    if (!draft) return;
    if (!draft.exercises[exIdx]) return;
    if (!draft.exercises[exIdx].sets[setIdx]) return;
    draft.exercises[exIdx].sets[setIdx][field] = value;
    State.setSessionDraft(draft);
  };

  const toggleDone = (exIdx, setIdx) => {
    const draft = State.getSessionDraft();
    if (!draft) return;
    draft.exercises[exIdx].sets[setIdx].done = !draft.exercises[exIdx].sets[setIdx].done;
    State.setSessionDraft(draft);
    App.navigate('log');
  };

  const toggleAdvanced = (exIdx, setIdx) => {
    const draft = State.getSessionDraft();
    if (!draft) return;
    draft.exercises[exIdx].sets[setIdx].showAdvanced = !draft.exercises[exIdx].sets[setIdx].showAdvanced;
    State.setSessionDraft(draft);
    App.navigate('log');
  };

  const addSet = (exIdx) => {
    const draft = State.getSessionDraft();
    if (!draft) return;
    // Copy last set as template
    const sets = draft.exercises[exIdx].sets;
    const lastSet = sets.length ? { ...sets[sets.length-1], done: false, id: DB.uid() } : newSetData();
    draft.exercises[exIdx].sets.push(lastSet);
    State.setSessionDraft(draft);
    App.navigate('log');
  };

  const removeExercise = (exIdx) => {
    const draft = State.getSessionDraft();
    if (!draft) return;
    draft.exercises.splice(exIdx, 1);
    State.setSessionDraft(draft);
    App.navigate('log');
  };

  const reorderExercise = (exIdx, dir) => {
    const draft = State.getSessionDraft();
    if (!draft) return;
    const newIdx = exIdx + dir;
    if (newIdx < 0 || newIdx >= draft.exercises.length) return;
    const temp = draft.exercises[exIdx];
    draft.exercises[exIdx] = draft.exercises[newIdx];
    draft.exercises[newIdx] = temp;
    State.setSessionDraft(draft);
    App.navigate('log');
  };

  const addExercise = () => {
    // Show library picker
    const exercises = DB.getExercises();
    if (!exercises.length) {
      UI.alert('No exercises in library yet. Add some in the Library tab first.');
      return;
    }
    let html = `<div style="padding:0;">`;
    // Group by type
    const types = ['gym','calisthenics','stretching'];
    types.forEach(type => {
      const group = exercises.filter(e=>e.type===type);
      if (!group.length) return;
      html += `<div style="padding:6px 16px 2px;font-family:var(--mono);font-size:0.6rem;letter-spacing:0.12em;color:var(--text3);">${type.toUpperCase()}</div>`;
      group.forEach(ex => {
        html += `
          <div class="exercise-item" onclick="LogView.addExerciseToSession('${ex.id}');UI.closeModal()">
            <div class="exercise-item-info">
              <div class="exercise-item-name">${ex.name}</div>
              <div class="exercise-item-meta">${ex.isometric?'Isometric · ':''}${ex.useWeight===false?'Bodyweight':'Weighted'}</div>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </div>`;
      });
    });
    html += `</div>`;
    UI.sheet({ title: 'ADD EXERCISE', body: html });
  };

  const addExerciseToSession = (exId) => {
    const draft = State.getSessionDraft();
    if (!draft) return;
    const ex = DB.getExercise(exId);
    if (!ex) return;
    draft.exercises.push({
      exerciseId: exId,
      name: ex.name,
      sets: [newSetData()],
    });
    State.setSessionDraft(draft);
    App.navigate('log');
  };

  const startFreeSession = () => {
    const todayStr = new Date().toISOString().slice(0,10);
    const draft = {
      id: DB.uid(),
      date: todayStr,
      dayName: 'Free Session',
      exercises: [],
    };
    State.setSessionDraft(draft);
    App.navigate('log');
  };

  const finishSession = () => {
    const draft = State.getSessionDraft();
    if (!draft) return;
    draft.completed = true;
    draft.completedAt = new Date().toISOString();
    DB.saveSession(draft);
    State.clearSessionDraft();
    UI.toast('Session saved! 💪');
    App.navigate('home');
  };

  const discardSession = () => {
    UI.confirm('Discard this session? All data will be lost.', () => {
      State.clearSessionDraft();
      App.navigate('log');
    });
  };

  return {
    render,
    saveBW,
    updateSet,
    toggleDone,
    toggleAdvanced,
    addSet,
    removeExercise,
    reorderExercise,
    addExercise,
    addExerciseToSession,
    startFreeSession,
    finishSession,
    discardSession,
    newSetData,
  };
})();
