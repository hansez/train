// views/home.js v2

const HomeView = (() => {
  const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  const todayStr = () => new Date().toISOString().slice(0,10);

  const formatDate = () => {
    const d = new Date();
    return `${DAYS[d.getDay()].slice(0,3).toUpperCase()} · ${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  };

  const render = () => {
    const today = todayStr();
    const active = DB.getActiveSession();
    const recent = DB.getRecentSessions(4);
    const totalSessions = DB.getSessions().length;
    const latestBW = DB.getLatestBodyweight();
    const scheduled = DB.getScheduledForDate(today);

    let html = `<div class="view">`;

    // Hero
    html += `
      <div class="home-hero">
        <div class="home-date">${formatDate()}</div>
        <div class="home-day">${DAYS[new Date().getDay()]}</div>
      </div>`;

    // Active session banner
    if (active) {
      const elapsed = active.startedAt ? Math.floor((Date.now() - active.startedAt) / 60000) : 0;
      html += `
        <div class="active-session-banner">
          <div style="flex:1;">
            <div style="font-family:var(--mono);font-size:0.68rem;letter-spacing:0.12em;color:var(--accent);">SESSION IN PROGRESS</div>
            <div style="font-family:var(--display);font-size:1rem;font-weight:700;margin-top:2px;">${active.name||'Training'}</div>
            <div style="font-family:var(--mono);font-size:0.7rem;color:var(--text2);margin-top:2px;">${elapsed} min elapsed</div>
          </div>
          <button class="btn btn-primary btn-sm" onclick="App.navigate('log')">RESUME</button>
        </div>`;
    }

    // Stats
    html += `
      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-val">${totalSessions}</div>
          <div class="stat-lbl">Total Sessions</div>
        </div>
        <div class="stat-card">
          <div class="stat-val">${latestBW ? latestBW.weight : '—'}<span>${latestBW ? ' lbs' : ''}</span></div>
          <div class="stat-lbl">${latestBW ? 'Bodyweight · ' + latestBW.date : 'No BW logged'}</div>
        </div>
      </div>`;

    // Today's scheduled sessions
    if (scheduled.length) {
      html += `<div class="section-hd"><span class="section-lbl">Today</span></div>`;
      scheduled.forEach(s => {
        html += `
          <div class="next-up-card">
            <div style="flex:1;">
              <div style="font-family:var(--mono);font-size:0.65rem;letter-spacing:0.1em;color:var(--text3);">${s.time||''} · ${s.duration||60} MIN</div>
              <div style="font-family:var(--display);font-size:1.05rem;font-weight:700;margin-top:3px;">${s.templateName||'Session'}</div>
            </div>
            <button class="btn btn-primary btn-sm" onclick="App.startFromScheduled('${s.id}')">START</button>
          </div>`;
      });
    } else if (!active) {
      html += `
        <div class="section-hd"><span class="section-lbl">Today</span></div>
        <div class="next-up-card" style="justify-content:center;">
          <div style="text-align:center;">
            <div style="font-family:var(--mono);font-size:0.7rem;color:var(--text3);margin-bottom:10px;">NOTHING SCHEDULED</div>
            <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;">
              <button class="btn btn-secondary btn-sm" onclick="App.navigate('log')">Start Free Session</button>
              <button class="btn btn-ghost btn-sm" onclick="App.navigate('calendar')">Schedule</button>
            </div>
          </div>
        </div>`;
    }

    // Recent sessions
    if (recent.length) {
      html += `<div class="section-hd"><span class="section-lbl">Recent</span></div>`;
      recent.forEach(sess => {
        const vol = DB.getSessionTotalVolume(sess);
        const dur = sess.duration ? `${sess.duration} min` : '';
        const groups = (sess.groups||[]).length;
        html += `
          <div class="card" style="cursor:pointer;" onclick="HomeView.viewSession('${sess.id}')">
            <div class="card-body" style="display:flex;align-items:center;gap:12px;">
              <div style="flex:1;">
                <div style="font-family:var(--display);font-size:0.95rem;font-weight:700;">${sess.name||'Session'}</div>
                <div style="font-family:var(--mono);font-size:0.68rem;color:var(--text3);margin-top:3px;">
                  ${sess.date}${dur?' · '+dur:''}${vol>0?' · '+vol.toFixed(0)+' lbs vol':''}${sess.sessionRPE?' · RPE '+sess.sessionRPE:''}
                </div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--text3)"><polyline points="9 18 15 12 9 6"/></svg>
            </div>
          </div>`;
      });
    }

    html += `</div>`;
    return html;
  };

  const viewSession = (id) => {
    const sess = DB.getSession(id);
    if (!sess) return;
    const vol = DB.getSessionTotalVolume(sess);
    let html = `<div>
      <div style="padding:12px 18px;border-bottom:1.5px solid var(--border);">
        <div style="font-family:var(--mono);font-size:0.65rem;color:var(--text3);">${sess.date}${sess.duration?' · '+sess.duration+' min':''}</div>
        ${sess.bodyweight ? `<div style="font-family:var(--mono);font-size:0.75rem;color:var(--text2);margin-top:2px;">BW: ${sess.bodyweight} lbs</div>` : ''}
        ${sess.sessionRPE ? `<div style="font-family:var(--mono);font-size:0.75rem;color:var(--text2);">Session RPE: ${sess.sessionRPE}</div>` : ''}
        ${vol>0 ? `<div style="font-family:var(--mono);font-size:0.75rem;color:var(--text2);">Volume: ${vol.toFixed(0)} lbs</div>` : ''}
      </div>`;

    (sess.groups||[]).forEach(g => {
      html += `<div style="padding:10px 18px;border-bottom:1.5px solid var(--border);">
        <div style="font-family:var(--mono);font-size:0.62rem;color:var(--accent);margin-bottom:6px;">${g.label||''}</div>`;
      (g.exercises||[]).forEach(ex => {
        const exDef = DB.getExercise(ex.exerciseId)||{name:ex.name||'?'};
        html += `<div style="margin-bottom:8px;">
          <div style="font-weight:600;font-size:0.92rem;">${exDef.name}</div>`;
        (ex.sets||[]).forEach((s,i) => {
          const parts = [];
          if (s.reps) parts.push(`${s.reps} reps`);
          if (s.seconds) parts.push(`${s.seconds}s`);
          if (s.weight) parts.push(`${s.weight} lbs`);
          if (s.progression) parts.push(s.progression);
          if (s.distance) parts.push(s.distance);
          if (s.rpe) parts.push(`RPE ${s.rpe}`);
          if (s.rir) parts.push(`${s.rir} RIR`);
          if (s.sir) parts.push(`${s.sir}s SIR`);
          html += `<div style="font-family:var(--mono);font-size:0.7rem;color:var(--text2);margin-top:2px;"><span style="color:var(--text3)">Set ${i+1}</span> ${parts.join(' · ')}${s.notes?` — ${s.notes}`:''}</div>`;
        });
        html += `</div>`;
      });
      html += `</div>`;
    });
    html += `</div>`;
    UI.sheet({ title: sess.name||'SESSION', body: html, actions: [{ label: 'Close', action: () => UI.closeModal() }] });
  };

  return { render, viewSession };
})();
