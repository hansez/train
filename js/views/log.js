// views/log.js v3 — Full session logging rewrite
// Fixes: expanded by default, per-exercise actions, paired set clarity,
// per-exercise notes panel, session notes, cleaner template list

const LogView = (() => {
  let timerInterval = null;

  const newSet = () => ({
    id: DB.uid(), reps:'', seconds:'', weight:'', progression:'', distance:'',
    rpe:'', rir:'', sir:'', notes:'', holdDuration:'', tempo:'',
    assistance:'', resistance:'', heightAdj:'', done:false, showAdv:false,
  });

  const escapeHtml = (s) => String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  // ---- Render ----
  const render = () => {
    const draft = State.getSessionDraft();
    return draft ? renderSession(draft) : renderNoSession();
  };

  // ============================================
  // NO ACTIVE SESSION — Start screen
  // ============================================
  const renderNoSession = () => {
    const templates = DB.getTemplates();
    let html = `<div class="view">`;

    // Templates section with edit + start
    html += `<div class="section-hd">
      <span class="section-lbl">Session Templates</span>
      <span class="section-act" onclick="LogView.newTemplate()">+ NEW</span>
    </div>`;

    if (!templates.length) {
      html += `
        <div class="empty-state" style="padding:30px 24px;">
          <div class="empty-title">No Templates</div>
          <div class="empty-sub">Create a session template to plan your workouts.</div>
          <button class="btn btn-primary" style="margin-top:12px" onclick="LogView.newTemplate()">Create Template</button>
        </div>`;
    } else {
      templates.forEach(t => {
        const exCount = (t.groups||[]).reduce((n,g)=>n+(g.exercises||[]).length, 0);
        html += `
          <div class="card">
            <div class="card-body" style="display:flex;align-items:center;gap:10px;">
              <div style="flex:1;cursor:pointer;" onclick="App.startSession('${t.id}')">
                <div style="font-family:var(--display);font-size:1rem;font-weight:700;">${escapeHtml(t.name)}</div>
                <div style="font-family:var(--mono);font-size:0.68rem;color:var(--text3);margin-top:3px;">${t.estimatedDuration||60} min · ${exCount} exercise${exCount!==1?'s':''}</div>
              </div>
              <button class="btn btn-primary btn-sm" onclick="App.startSession('${t.id}')">START</button>
              <button class="icon-btn" onclick="LogView.editTemplate('${t.id}')" title="Edit">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button class="icon-btn" style="color:var(--red);" onclick="LogView.deleteTemplate('${t.id}')" title="Delete">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
              </button>
            </div>
          </div>`;
      });
    }

    // Free session
    html += `
      <div class="section-hd"><span class="section-lbl">Or</span></div>
      <div style="padding:0 14px 18px;">
        <button class="btn btn-secondary btn-full" onclick="LogView.startFree()">Start Free Session</button>
      </div>`;

    html += `</div>`;
    return html;
  };

  // ============================================
  // ACTIVE SESSION
  // ============================================
  const renderSession = (draft) => {
    const elapsed = draft.startedAt ? Math.floor((Date.now() - draft.startedAt) / 1000) : 0;
    const mm = String(Math.floor(elapsed/60)).padStart(2,'0');
    const ss = String(elapsed%60).padStart(2,'0');

    let html = `<div class="view">`;

    // Topbar
    html += `
      <div class="session-topbar">
        <div class="session-info">
          <div class="session-name">${escapeHtml(draft.name||'Session')}</div>
          <div class="session-meta" id="session-elapsed">${mm}:${ss}</div>
        </div>
        <div style="display:flex;gap:6px;">
          <button class="icon-btn" onclick="LogView.editSessionNotes()" title="Session notes" style="color:${draft.sessionNotes?'var(--accent)':'var(--text2)'}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
          </button>
          <button class="btn btn-primary btn-sm" onclick="LogView.finishSession()">FINISH</button>
          <button class="icon-btn" onclick="LogView.discard()" style="color:var(--red);" title="Discard">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
          </button>
        </div>
      </div>`;

    // Session notes banner (if any)
    if (draft.sessionNotes) {
      html += `<div style="margin:10px 14px 0;padding:10px 14px;background:var(--bg2);border-left:3px solid var(--accent);border-radius:var(--radius-sm);font-size:0.88rem;color:var(--text2);cursor:pointer;" onclick="LogView.editSessionNotes()">
        <div style="font-family:var(--mono);font-size:0.6rem;letter-spacing:0.1em;color:var(--text3);margin-bottom:4px;">SESSION NOTES</div>
        ${escapeHtml(draft.sessionNotes)}
      </div>`;
    }

    // Groups
    if (!(draft.groups||[]).length) {
      html += `<div class="empty-state" style="padding:40px 24px;">
        <div class="empty-title">No Exercises Yet</div>
        <div class="empty-sub">Add your first exercise to start logging.</div>
      </div>`;
    } else {
      (draft.groups||[]).forEach((g, gi) => {
        html += renderGroup(draft, g, gi);
      });
    }

    // Add buttons
    html += `<div style="margin:14px;display:flex;gap:8px;">
      <button class="btn btn-secondary flex-1" onclick="LogView.addGroup(false)">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        EXERCISE
      </button>
      <button class="btn btn-secondary flex-1" onclick="LogView.addGroup(true)">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        PAIRED SET
      </button>
    </div>`;

    html += `</div>`;
    return html;
  };

  const renderGroup = (draft, g, gi) => {
    const isPaired = (g.exercises||[]).length > 1;
    const totalGroups = (draft.groups||[]).length;
    let html = `<div class="set-group">`;

    // Group header — only show "PAIRED SET" label for actual pairs
    if (isPaired) {
      html += `<div class="set-group-label" style="display:flex;align-items:center;justify-content:space-between;">
        <span>PAIRED SET · ${g.label||''}</span>
        <div style="display:flex;gap:2px;">
          ${gi>0?`<button class="icon-btn" style="width:24px;height:24px;color:var(--text3);" onclick="LogView.reorderGroup(${gi},-1)" title="Move up">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15"/></svg>
          </button>`:''}
          ${gi<totalGroups-1?`<button class="icon-btn" style="width:24px;height:24px;color:var(--text3);" onclick="LogView.reorderGroup(${gi},1)" title="Move down">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
          </button>`:''}
          <button class="icon-btn" style="width:24px;height:24px;color:var(--text3);" onclick="LogView.addExerciseToGroup(${gi})" title="Add exercise to pair">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
        </div>
      </div>`;
    }

    (g.exercises||[]).forEach((ex, ei) => {
      html += renderExerciseBlock(draft, gi, ei, g, ex);
    });

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
    const groupCount = (g.exercises||[]).length;
    const totalGroups = (draft.groups||[]).length;
    const isOnlyExercise = groupCount === 1;

    const pres = buildPrescriptionString(ex, exDef);

    let html = `<div class="exercise-block">`;

    // Collapsed header (always visible — tap to toggle)
    html += `
      <div class="exercise-collapsed" onclick="LogView.toggleExpand(${gi},${ei})">
        <div class="exercise-pair-label">${pairLabel}</div>
        <div class="exercise-collapsed-info">
          <div class="exercise-collapsed-name">${escapeHtml(exDef.name)}</div>
          <div class="exercise-collapsed-prescription">${pres}</div>
        </div>
        <div class="exercise-collapsed-progress" style="color:${doneCount===totalSets&&totalSets>0?'var(--green)':'var(--text2)'}">
          ${doneCount}/${totalSets}
        </div>
        <svg class="expand-arrow ${expanded?'open':''}" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
      </div>`;

    if (expanded) {
      html += `<div class="exercise-expanded">`;

      // Action toolbar
      html += `<div style="display:flex;align-items:center;gap:4px;padding:6px 0 8px;border-bottom:1px dashed var(--border);margin-bottom:8px;flex-wrap:wrap;">
        <button class="btn-xs btn btn-ghost" style="padding:4px 8px;font-size:0.62rem;" onclick="LogView.toggleNotes(${gi},${ei})">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
          INFO
        </button>`;

      // Reorder within group (paired only)
      if (isPaired) {
        if (ei > 0) html += `<button class="icon-btn" style="width:24px;height:24px;color:var(--text3);" onclick="LogView.reorderExercise(${gi},${ei},-1)" title="Up in pair">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15"/></svg>
        </button>`;
        if (ei < groupCount - 1) html += `<button class="icon-btn" style="width:24px;height:24px;color:var(--text3);" onclick="LogView.reorderExercise(${gi},${ei},1)" title="Down in pair">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
        </button>`;
      }

      // Reorder solo group
      if (isOnlyExercise) {
        if (gi > 0) html += `<button class="icon-btn" style="width:24px;height:24px;color:var(--text3);" onclick="LogView.reorderGroup(${gi},-1)" title="Move up">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15"/></svg>
        </button>`;
        if (gi < totalGroups - 1) html += `<button class="icon-btn" style="width:24px;height:24px;color:var(--text3);" onclick="LogView.reorderGroup(${gi},1)" title="Move down">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
        </button>`;
      }

      html += `<div style="flex:1;"></div>
        <button class="btn-xs btn btn-ghost" style="padding:4px 8px;font-size:0.62rem;color:var(--red);" onclick="LogView.removeExercise(${gi},${ei})">
          REMOVE
        </button>
      </div>`;

      // Notes panel (toggle)
      if (ex.showInfo) {
        html += renderInfoPanel(exDef, ex);
      }

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

  const renderInfoPanel = (exDef, ex) => {
    // Find last session that included this exercise
    const sessions = DB.getSessions().filter(s=>(s.groups||[]).some(g=>(g.exercises||[]).some(e=>e.exerciseId===ex.exerciseId))).sort((a,b)=>new Date(b.date)-new Date(a.date));
    const lastSess = sessions[0];
    let lastSummary = '<em style="color:var(--text3)">No previous data</em>';
    if (lastSess) {
      const lastEx = (lastSess.groups||[]).flatMap(g=>g.exercises||[]).find(e=>e.exerciseId===ex.exerciseId);
      if (lastEx) {
        const setStrs = (lastEx.sets||[]).map((s,i) => {
          const parts = [];
          if (s.reps) parts.push(`${s.reps}r`);
          if (s.seconds) parts.push(`${s.seconds}s`);
          if (s.weight) parts.push(`${s.weight}lb`);
          if (s.progression) parts.push(s.progression);
          return parts.join(' ');
        }).filter(Boolean);
        lastSummary = `<span style="font-family:var(--mono);font-size:0.72rem;color:var(--text2);">${lastSess.date} · ${setStrs.join(' | ')}</span>`;
      }
    }

    return `
      <div style="background:var(--bg3);border-radius:var(--radius-sm);padding:10px 12px;margin-bottom:10px;">
        ${exDef.notes ? `
          <div style="font-family:var(--mono);font-size:0.6rem;letter-spacing:0.1em;color:var(--text3);margin-bottom:4px;">NOTES</div>
          <div style="font-size:0.85rem;color:var(--text2);line-height:1.5;margin-bottom:8px;">${escapeHtml(exDef.notes)}</div>
        ` : ''}
        <div style="font-family:var(--mono);font-size:0.6rem;letter-spacing:0.1em;color:var(--text3);margin-bottom:4px;">LAST SESSION</div>
        <div>${lastSummary}</div>
      </div>`;
  };

  const buildPrescriptionString = (ex, exDef) => {
    const parts = [];
    const t = exDef.type || 'dynamic_weighted';
    const range = (a,b) => a===b||!b ? a : `${a||'?'}-${b||'?'}`;

    // Reps or seconds (depending on type)
    if (t==='dynamic_weighted'||t==='dynamic_bodyweight') {
      if (ex.targetRepsMin||ex.targetRepsMax) parts.push(`${range(ex.targetRepsMin, ex.targetRepsMax)} reps`);
    }
    if (t==='static_weighted'||t==='static_bodyweight') {
      if (ex.targetSecondsMin||ex.targetSecondsMax) parts.push(`${range(ex.targetSecondsMin, ex.targetSecondsMax)}s`);
    }

    // Sets
    if (ex.targetSetsMin||ex.targetSetsMax) parts.push(`× ${range(ex.targetSetsMin, ex.targetSetsMax)}`);

    // Weight or progression
    if ((t==='dynamic_weighted'||t==='static_weighted') && ex.targetWeight) parts.push(`× ${ex.targetWeight} lbs`);
    if ((t==='dynamic_bodyweight'||t==='static_bodyweight') && ex.targetProgression) parts.push(`× ${ex.targetProgression}`);

    // Effort
    if (ex.targetRPEMin||ex.targetRPEMax) parts.push(`@ RPE ${range(ex.targetRPEMin, ex.targetRPEMax)}`);
    else if (ex.targetRIRMin||ex.targetRIRMax) parts.push(`@ ${range(ex.targetRIRMin, ex.targetRIRMax)} RIR`);
    else if (ex.targetSIRMin||ex.targetSIRMax) parts.push(`@ ${range(ex.targetSIRMin, ex.targetSIRMax)}s SIR`);

    if (ex.heightAdj) parts.push(`${ex.heightAdj}h`);

    return parts.join(' ').trim() || '—';
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

    if (isDyn) html += miniField('Reps', `LogView.updateSet(${gi},${ei},${si},'reps',this.value)`, set.reps, 'number');
    if (isStatic) html += miniField('Sec', `LogView.updateSet(${gi},${ei},${si},'seconds',this.value)`, set.seconds, 'number');
    if (isWeighted) html += miniField('lbs', `LogView.updateSet(${gi},${ei},${si},'weight',this.value)`, set.weight, 'number', true);
    if (isBW && progs.length) {
      html += `<div class="set-mini-field">
        <div class="set-mini-lbl">Prog</div>
        <select class="set-mini-select" onchange="LogView.updateSet(${gi},${ei},${si},'progression',this.value)">
          <option value="">—</option>
          ${progs.map(p=>`<option value="${escapeHtml(p.name)}" ${set.progression===p.name?'selected':''}>${escapeHtml(p.name)}</option>`).join('')}
        </select>
      </div>`;
    }
    if (t==='static_bodyweight' && exDef.progressionMeasure==='distance') {
      html += miniField('Dist', `LogView.updateSet(${gi},${ei},${si},'distance',this.value)`, set.distance, 'text', true);
    }
    if (metrics.includes('RIR')) html += miniField('RIR', `LogView.updateSet(${gi},${ei},${si},'rir',this.value)`, set.rir, 'number');
    if (metrics.includes('SIR')) html += miniField('SIR', `LogView.updateSet(${gi},${ei},${si},'sir',this.value)`, set.sir, 'number');
    if (metrics.includes('RPE')) html += miniField('RPE', `LogView.updateSet(${gi},${ei},${si},'rpe',this.value)`, set.rpe, 'number');

    html += `</div>
      <div class="set-check-btn ${set.done?'done':''}" onclick="LogView.toggleDone(${gi},${ei},${si})">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
    </div>`;

    // Notes inline
    html += `<div style="padding:2px 26px 4px;">
      <input style="width:100%;font-family:var(--mono);font-size:0.74rem;color:var(--text2);background:transparent;border:none;border-bottom:1px dashed var(--border);padding:3px 0;outline:none;" 
        placeholder="Notes…" value="${escapeHtml(set.notes||'')}"
        onchange="LogView.updateSet(${gi},${ei},${si},'notes',this.value)" />
    </div>`;

    // Advanced toggle + remove set
    html += `<div style="display:flex;align-items:center;gap:8px;padding-left:26px;">
      <div class="adv-toggle" onclick="LogView.toggleAdv(${gi},${ei},${si})" style="flex:1;">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="${set.showAdv?'18 15 12 9 6 15':'6 9 12 15 18 9'}"/></svg>
        ${set.showAdv?'HIDE ADVANCED':'ADVANCED'}
      </div>
      <button class="icon-btn" style="width:24px;height:24px;color:var(--red);opacity:0.7;" onclick="LogView.removeSet(${gi},${ei},${si})" title="Remove set">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </button>
    </div>`;

    if (set.showAdv) {
      html += `<div class="adv-fields" style="padding-left:26px;padding-right:8px;">`;
      if (isDyn) html += miniField('Hold(s)', `LogView.updateSet(${gi},${ei},${si},'holdDuration',this.value)`, set.holdDuration, 'number', true);
      if (exDef.useTempo || isDyn) html += miniField('Tempo', `LogView.updateSet(${gi},${ei},${si},'tempo',this.value)`, set.tempo, 'text', true);
      if (exDef.assistanceOptions?.length) {
        html += `<div class="set-mini-field">
          <div class="set-mini-lbl">Assist</div>
          <select class="set-mini-select" onchange="LogView.updateSet(${gi},${ei},${si},'assistance',this.value)">
            <option value="">—</option>
            ${exDef.assistanceOptions.map(o=>`<option value="${escapeHtml(o)}" ${set.assistance===o?'selected':''}>${escapeHtml(o)}</option>`).join('')}
          </select>
        </div>`;
      }
      if (exDef.resistanceOptions?.length) {
        html += `<div class="set-mini-field">
          <div class="set-mini-lbl">Resist</div>
          <select class="set-mini-select" onchange="LogView.updateSet(${gi},${ei},${si},'resistance',this.value)">
            <option value="">—</option>
            ${exDef.resistanceOptions.map(o=>`<option value="${escapeHtml(o)}" ${set.resistance===o?'selected':''}>${escapeHtml(o)}</option>`).join('')}
          </select>
        </div>`;
      }
      html += miniField('Height', `LogView.updateSet(${gi},${ei},${si},'heightAdj',this.value)`, set.heightAdj, 'text', true);
      html += `</div>`;
    }

    return html;
  };

  const miniField = (lbl, onchange, val, type='number', wide=false) => `
    <div class="set-mini-field">
      <div class="set-mini-lbl">${lbl}</div>
      <input class="set-mini-input${wide?' wide':''}" type="${type}" value="${escapeHtml(val||'')}" placeholder="—"
        onchange="${onchange}" ${type==='number'?'step="0.5"':''} />
    </div>`;

  // ============================================
  // ACTIONS
  // ============================================

  const toggleExpand = (gi, ei) => {
    const draft = State.getSessionDraft(); if(!draft) return;
    draft.groups[gi].exercises[ei].expanded = !(draft.groups[gi].exercises[ei].expanded !== false);
    State.setSessionDraft(draft); App.navigate('log');
  };

  const toggleNotes = (gi, ei) => {
    const draft = State.getSessionDraft(); if(!draft) return;
    draft.groups[gi].exercises[ei].showInfo = !draft.groups[gi].exercises[ei].showInfo;
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

  const removeSet = (gi, ei, si) => {
    const draft = State.getSessionDraft(); if(!draft) return;
    if (draft.groups[gi].exercises[ei].sets.length <= 1) {
      UI.toast('Each exercise must have at least 1 set');
      return;
    }
    draft.groups[gi].exercises[ei].sets.splice(si, 1);
    State.setSessionDraft(draft); App.navigate('log');
  };

  const reorderExercise = (gi, ei, dir) => {
    const draft = State.getSessionDraft(); if(!draft) return;
    const arr = draft.groups[gi].exercises;
    const newIdx = ei + dir;
    if (newIdx < 0 || newIdx >= arr.length) return;
    [arr[ei], arr[newIdx]] = [arr[newIdx], arr[ei]];
    State.setSessionDraft(draft); App.navigate('log');
  };

  const reorderGroup = (gi, dir) => {
    const draft = State.getSessionDraft(); if(!draft) return;
    const newIdx = gi + dir;
    if (newIdx < 0 || newIdx >= draft.groups.length) return;
    [draft.groups[gi], draft.groups[newIdx]] = [draft.groups[newIdx], draft.groups[gi]];
    // Re-letter
    _relabel(draft);
    State.setSessionDraft(draft); App.navigate('log');
  };

  const removeExercise = (gi, ei) => {
    const draft = State.getSessionDraft(); if(!draft) return;
    UI.confirm('Remove this exercise?', () => {
      draft.groups[gi].exercises.splice(ei, 1);
      // If group is now empty, remove it
      if (!draft.groups[gi].exercises.length) draft.groups.splice(gi, 1);
      _relabel(draft);
      State.setSessionDraft(draft); App.navigate('log');
    });
  };

  const _relabel = (draft) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    (draft.groups||[]).forEach((g, i) => {
      g.label = chars[i] || 'X';
    });
  };

  const addGroup = (paired) => {
    const draft = State.getSessionDraft(); if(!draft) return;
    const exes = DB.getExercises();
    if (!exes.length) { UI.alert('Add exercises to your library first.'); return; }
    _pickExercise((exId) => {
      const ex = DB.getExercise(exId);
      if (!draft.groups) draft.groups = [];
      const newGroup = {
        id: DB.uid(),
        label: '',
        exercises: [{ exerciseId: exId, name: ex?.name||'', expanded: true, sets: [newSet()] }]
      };
      draft.groups.push(newGroup);
      _relabel(draft);
      if (paired) {
        State.setSessionDraft(draft);
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

  const _pickExercise = (cb) => {
    const exercises = DB.getExercises();
    if (!exercises.length) { UI.alert('No exercises in library.'); return; }
    const cats = ['main','accessory','flexibility'];
    let html = `<div>
      <div style="padding:10px 18px;">
        <input class="lib-search-input" type="search" placeholder="Search…" id="picker-search" oninput="LogView._filterPicker(this.value)" />
      </div>
      <div id="picker-list">`;
    cats.forEach(cat => {
      const group = exercises.filter(e=>e.category===cat);
      if (!group.length) return;
      html += `<div style="padding:8px 18px 4px;font-family:var(--mono);font-size:0.62rem;letter-spacing:0.12em;color:var(--text3);">${cat.toUpperCase()}</div>`;
      group.forEach(ex => {
        html += `<div class="exercise-item picker-item" data-name="${escapeHtml(ex.name.toLowerCase())}" onclick="LogView._cbExercise('${ex.id}')">
          <div class="exercise-item-info">
            <div class="exercise-item-name">${escapeHtml(ex.name)}</div>
            <div class="exercise-item-meta">${(ex.type||'').replace(/_/g,' ')}</div>
          </div>
        </div>`;
      });
    });
    html += `</div></div>`;
    window._exPickCb = cb;
    UI.sheet({ title: 'SELECT EXERCISE', body: html });
  };

  const _filterPicker = (val) => {
    const v = val.toLowerCase().trim();
    document.querySelectorAll('.picker-item').forEach(el => {
      el.style.display = !v || el.dataset.name.includes(v) ? '' : 'none';
    });
  };

  const _cbExercise = (id) => {
    const cb = window._exPickCb;
    window._exPickCb = null;
    UI.closeModal();
    if (cb) cb(id);
  };

  // ---- Session-level actions ----
  const startFree = () => {
    const today = new Date().toISOString().slice(0,10);
    const draft = { id:DB.uid(), name:'Free Session', date:today, startedAt:Date.now(), groups:[], sessionNotes:'' };
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

  const editSessionNotes = () => {
    const draft = State.getSessionDraft(); if(!draft) return;
    UI.modal({
      title: 'SESSION NOTES',
      body: `
        <div class="field">
          <label class="field-label">Notes</label>
          <textarea class="field-input" id="sess-notes" rows="6" style="resize:vertical;font-family:var(--sans);" placeholder="How did it feel? Any observations?">${escapeHtml(draft.sessionNotes||'')}</textarea>
        </div>`,
      actions: [
        { label: 'Save', primary: true, action: () => {
          draft.sessionNotes = document.getElementById('sess-notes').value;
          State.setSessionDraft(draft);
          UI.closeModal(); App.navigate('log');
        }},
        { label: 'Cancel', action: () => UI.closeModal() }
      ]
    });
  };

  const finishSession = () => {
    const draft = State.getSessionDraft(); if(!draft) return;
    const duration = draft.startedAt ? Math.round((Date.now()-draft.startedAt)/60000) : null;
    const latestBW = DB.getLatestBodyweight();

    UI.modal({
      title: 'FINISH SESSION',
      body: `
        <div style="margin-bottom:14px;font-family:var(--mono);font-size:0.82rem;color:var(--text2);">${duration?`Session time: ${duration} min`:'Good work!'}</div>
        <div class="field">
          <label class="field-label">Bodyweight (lbs)</label>
          <input class="field-input" id="fin-bw" type="number" step="0.1" value="${latestBW?.weight||''}" placeholder="e.g. 175.5" />
        </div>
        <div class="field">
          <label class="field-label">Session RPE (1–10)</label>
          <input class="field-input" id="fin-rpe" type="number" min="1" max="10" step="0.5" placeholder="Overall effort" />
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

  // ============================================
  // TEMPLATE EDITOR — full template editing
  // ============================================
  const newTemplate = () => {
    const t = { id: DB.uid(), name:'', estimatedDuration: 90, groups:[] };
    _editTemplateFull(t, true);
  };

  const editTemplate = (id) => {
    const t = DB.getTemplate(id); if(!t) return;
    _editTemplateFull(t, false);
  };

  const deleteTemplate = (id) => {
    const t = DB.getTemplate(id);
    UI.confirm(`Delete template "${t?.name||''}"?`, () => {
      DB.deleteTemplate(id); App.navigate('log');
    });
  };

  const _editTemplateFull = (t, isNew) => {
    window._editingTpl = JSON.parse(JSON.stringify(t));
    _renderTemplateEditor(isNew);
  };

  const _renderTemplateEditor = (isNew) => {
    const t = window._editingTpl;
    let html = `
      <div class="field">
        <label class="field-label">Session Name *</label>
        <input class="field-input" id="tpl-name" type="text" value="${escapeHtml(t.name||'')}" placeholder="e.g. Day 1 — Pull/Levers" />
      </div>
      <div class="field">
        <label class="field-label">Estimated Duration (min)</label>
        <input class="field-input" id="tpl-dur" type="number" value="${t.estimatedDuration||90}" placeholder="90" />
      </div>
      <div class="divider"></div>
      <div style="font-family:var(--mono);font-size:0.62rem;letter-spacing:0.12em;color:var(--text3);margin-bottom:8px;">EXERCISES</div>`;

    (t.groups||[]).forEach((g, gi) => {
      const isPaired = (g.exercises||[]).length > 1;
      html += `<div style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px;margin-bottom:8px;">`;
      if (isPaired) html += `<div style="font-family:var(--mono);font-size:0.6rem;letter-spacing:0.1em;color:var(--text3);margin-bottom:6px;">PAIRED · ${g.label||''}</div>`;
      (g.exercises||[]).forEach((ex, ei) => {
        const exDef = DB.getExercise(ex.exerciseId)||{name:'?', type:'dynamic_weighted'};
        const t2 = exDef.type||'dynamic_weighted';
        const isDyn = t2==='dynamic_weighted'||t2==='dynamic_bodyweight';
        const isStatic = t2==='static_weighted'||t2==='static_bodyweight';
        const isWeighted = t2==='dynamic_weighted'||t2==='static_weighted';
        const isBW = t2==='dynamic_bodyweight'||t2==='static_bodyweight';

        html += `<div style="display:flex;align-items:center;gap:6px;padding:6px 0;border-bottom:${ei<g.exercises.length-1?'1px solid var(--border)':'none'};">
          <span style="font-family:var(--display);font-size:0.78rem;font-weight:700;color:var(--accent);min-width:24px;">${g.label||''}${isPaired?ei+1:''}</span>
          <div style="flex:1;">
            <div style="font-size:0.88rem;font-weight:500;">${escapeHtml(exDef.name)}</div>
            <div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px;font-family:var(--mono);font-size:0.65rem;color:var(--text3);">
              <span>Sets:</span>
              ${tplRangeInput(gi,ei,'targetSetsMin', ex.targetSetsMin, '#')}
              <span>-</span>
              ${tplRangeInput(gi,ei,'targetSetsMax', ex.targetSetsMax, '#')}`;
        if (isDyn) html += `<span>×</span><span>Reps:</span>${tplRangeInput(gi,ei,'targetRepsMin',ex.targetRepsMin,'#')}<span>-</span>${tplRangeInput(gi,ei,'targetRepsMax',ex.targetRepsMax,'#')}`;
        if (isStatic) html += `<span>×</span><span>Sec:</span>${tplRangeInput(gi,ei,'targetSecondsMin',ex.targetSecondsMin,'s')}<span>-</span>${tplRangeInput(gi,ei,'targetSecondsMax',ex.targetSecondsMax,'s')}`;
        if (isWeighted) html += `<span>×</span><span>lbs:</span>${tplRangeInput(gi,ei,'targetWeight',ex.targetWeight,'lbs',64)}`;
        if (isBW && (exDef.progressions||[]).length) {
          html += `<span>×</span><select onchange="LogView._tplUpdateEx(${gi},${ei},'targetProgression',this.value)" style="font-family:var(--mono);font-size:0.7rem;padding:2px 4px;border:1px solid var(--border);border-radius:3px;background:var(--surface);color:var(--text);"><option value="">Prog…</option>${exDef.progressions.map(p=>`<option value="${escapeHtml(p.name)}" ${ex.targetProgression===p.name?'selected':''}>${escapeHtml(p.name)}</option>`).join('')}</select>`;
        }
        html += `<span>@RPE</span>${tplRangeInput(gi,ei,'targetRPEMin',ex.targetRPEMin,'')}<span>-</span>${tplRangeInput(gi,ei,'targetRPEMax',ex.targetRPEMax,'')}
            </div>
          </div>
          <button class="icon-btn" style="width:24px;height:24px;color:var(--red);" onclick="LogView._tplRemoveEx(${gi},${ei})" title="Remove">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>`;
      });
      // Add to pair button
      html += `<div style="margin-top:6px;display:flex;gap:6px;">
        <button class="btn-xs btn btn-ghost" style="padding:3px 8px;font-size:0.6rem;" onclick="LogView._tplAddEx(${gi})">+ Add to ${isPaired?'pair':'this'}</button>
      </div>`;
      html += `</div>`;
    });

    html += `<div style="display:flex;gap:6px;margin-top:8px;">
      <button class="btn btn-secondary btn-sm flex-1" onclick="LogView._tplAddGroup(false)">+ Exercise</button>
      <button class="btn btn-secondary btn-sm flex-1" onclick="LogView._tplAddGroup(true)">+ Paired Set</button>
    </div>`;

    UI.sheet({
      title: isNew ? 'NEW TEMPLATE' : 'EDIT TEMPLATE',
      body: html,
      actions: [
        { label: 'Save', primary: true, action: () => {
          const name = document.getElementById('tpl-name').value.trim();
          if (!name) { UI.toast('Name required'); return; }
          window._editingTpl.name = name;
          window._editingTpl.estimatedDuration = parseInt(document.getElementById('tpl-dur').value)||90;
          DB.saveTemplate(window._editingTpl);
          window._editingTpl = null;
          UI.closeModal(); App.navigate('log');
        }},
        { label: 'Cancel', action: () => { window._editingTpl = null; UI.closeModal(); } }
      ]
    });
  };

  const tplRangeInput = (gi, ei, field, val, suffix, width=36) => {
    return `<input type="text" value="${escapeHtml(val||'')}" placeholder="${suffix||'#'}" style="width:${width}px;font-family:var(--mono);font-size:0.7rem;padding:2px 4px;border:1px solid var(--border);border-radius:3px;background:var(--surface);color:var(--text);text-align:center;" onchange="LogView._tplUpdateEx(${gi},${ei},'${field}',this.value)" />`;
  };

  const _tplUpdateEx = (gi, ei, field, val) => {
    if (!window._editingTpl) return;
    window._editingTpl.groups[gi].exercises[ei][field] = val;
  };

  const _tplRemoveEx = (gi, ei) => {
    if (!window._editingTpl) return;
    window._editingTpl.groups[gi].exercises.splice(ei,1);
    if (!window._editingTpl.groups[gi].exercises.length) window._editingTpl.groups.splice(gi,1);
    _tplRelabel();
    UI.closeModal();
    setTimeout(()=>_renderTemplateEditor(false), 50);
  };

  const _tplAddEx = (gi) => {
    _pickExercise((exId) => {
      window._editingTpl.groups[gi].exercises.push({ exerciseId: exId });
      UI.closeModal();
      setTimeout(()=>_renderTemplateEditor(false), 50);
    });
  };

  const _tplAddGroup = (paired) => {
    _pickExercise((exId) => {
      const newGroup = { id: DB.uid(), label: '', exercises: [{ exerciseId: exId }] };
      if (!window._editingTpl.groups) window._editingTpl.groups = [];
      window._editingTpl.groups.push(newGroup);
      _tplRelabel();
      if (paired) {
        UI.closeModal();
        setTimeout(()=>{
          _pickExercise((exId2) => {
            newGroup.exercises.push({ exerciseId: exId2 });
            UI.closeModal();
            setTimeout(()=>_renderTemplateEditor(false), 50);
          });
        }, 50);
      } else {
        UI.closeModal();
        setTimeout(()=>_renderTemplateEditor(false), 50);
      }
    });
  };

  const _tplRelabel = () => {
    if (!window._editingTpl) return;
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    (window._editingTpl.groups||[]).forEach((g,i) => g.label = chars[i] || 'X');
  };

  return {
    render, newSet,
    toggleExpand, toggleNotes, updateSet, toggleDone, toggleAdv,
    addSet, removeSet,
    addGroup, addExerciseToGroup, removeExercise, reorderExercise, reorderGroup,
    _cbExercise, _filterPicker,
    startFree, startTimer, finishSession, discard, editSessionNotes,
    newTemplate, editTemplate, deleteTemplate,
    _tplUpdateEx, _tplRemoveEx, _tplAddEx, _tplAddGroup,
  };
})();
