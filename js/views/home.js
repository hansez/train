// views/home.js

const HomeView = (() => {
  const DAYS_OF_WEEK = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const FULL_DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

  const today = () => {
    const d = new Date();
    return d.toISOString().slice(0,10);
  };

  const todayName = () => FULL_DAYS[new Date().getDay()];

  const formatDate = () => {
    const d = new Date();
    return `${DAYS_OF_WEEK[d.getDay()]} ${d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}`;
  };

  const getStreak = () => {
    const sessions = DB.getSessions().sort((a,b)=>new Date(b.date)-new Date(a.date));
    if (!sessions.length) return 0;
    let streak = 0;
    let check = new Date(); check.setHours(0,0,0,0);
    const todayStr = check.toISOString().slice(0,10);
    // if no session today, start from yesterday
    const hasToday = sessions.some(s => s.date === todayStr);
    if (!hasToday) check.setDate(check.getDate()-1);
    for (let i = 0; i < 30; i++) {
      const ds = check.toISOString().slice(0,10);
      if (sessions.some(s => s.date === ds)) { streak++; check.setDate(check.getDate()-1); }
      else break;
    }
    return streak;
  };

  const getLast7 = () => {
    const result = [];
    const sessions = DB.getSessions();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate()-i); d.setHours(0,0,0,0);
      const ds = d.toISOString().slice(0,10);
      const isToday = i === 0;
      result.push({ date: ds, day: DAYS_OF_WEEK[d.getDay()], trained: sessions.some(s=>s.date===ds), isToday });
    }
    return result;
  };

  const getNextDay = () => {
    const settings = DB.getSettings();
    const prog = settings.activeProgram ? DB.getProgram(settings.activeProgram) : null;
    if (!prog || !prog.days || !prog.days.length) return null;
    const sessions = DB.getSessions().sort((a,b)=>new Date(b.date)-new Date(a.date));
    if (!sessions.length) return prog.days[0];
    const lastSess = sessions[0];
    if (!lastSess.programDayId) return prog.days[0];
    const lastIdx = prog.days.findIndex(d=>d.id===lastSess.programDayId);
    return prog.days[(lastIdx+1) % prog.days.length] || prog.days[0];
  };

  const render = () => {
    const settings = DB.getSettings();
    const prog = settings.activeProgram ? DB.getProgram(settings.activeProgram) : null;
    const recent = DB.getRecentSessions(5);
    const streak = getStreak();
    const last7 = getLast7();
    const nextDay = getNextDay();
    const active = DB.getActiveSession();
    const todayStr = today();
    const todayBW = DB.getBodyweight(todayStr);

    let html = `<div class="view">`;

    // Hero
    html += `
      <div class="home-hero">
        <div class="home-date">${formatDate()}</div>
        <div class="home-greeting">${todayName()}</div>
      </div>`;

    // Active session banner
    if (active) {
      html += `
        <div style="margin:0 12px 8px;background:var(--accent-dim);border:1px solid var(--accent);border-radius:var(--radius);padding:12px 14px;display:flex;align-items:center;gap:10px;">
          <div style="flex:1">
            <div style="font-family:var(--mono);font-size:0.68rem;letter-spacing:0.1em;color:var(--accent);">SESSION IN PROGRESS</div>
            <div style="font-size:0.875rem;font-weight:500;margin-top:2px;">${active.dayName || 'Active Session'}</div>
          </div>
          <button class="btn btn-primary btn-sm" onclick="App.navigate('log')">RESUME</button>
        </div>`;
    }

    // Stats row
    const totalSessions = DB.getSessions().length;
    const lastBWs = DB.getBodyweights().sort((a,b)=>new Date(b.date)-new Date(a.date));
    const lastBW = lastBWs[0];
    html += `<div class="stat-grid">
      <div class="stat-card">
        <div class="stat-val">${streak}<span> days</span></div>
        <div class="stat-lbl">Current Streak</div>
      </div>
      <div class="stat-card">
        <div class="stat-val">${totalSessions}</div>
        <div class="stat-lbl">Total Sessions</div>
      </div>
    </div>`;

    // Bodyweight
    if (lastBW) {
      html += `<div class="stat-grid" style="grid-template-columns:1fr 1fr;">
        <div class="stat-card">
          <div class="stat-val">${lastBW.weight}<span> lbs</span></div>
          <div class="stat-lbl">Bodyweight · ${lastBW.date}</div>
        </div>
        <div class="stat-card" style="display:flex;align-items:center;justify-content:center;cursor:pointer;" onclick="HomeView.logBW()">
          <div style="text-align:center;color:var(--text3)">
            <div style="font-family:var(--mono);font-size:0.68rem;letter-spacing:0.1em;">UPDATE WEIGHT</div>
          </div>
        </div>
      </div>`;
    }

    // Last 7 days streak bar
    html += `
      <div style="margin:0 12px 8px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:12px 14px;">
        <div style="font-family:var(--mono);font-size:0.62rem;letter-spacing:0.12em;color:var(--text3);margin-bottom:8px;">LAST 7 DAYS</div>
        <div style="display:flex;gap:4px;">
          ${last7.map(d=>`
            <div style="flex:1;text-align:center;">
              <div style="height:28px;border-radius:4px;background:${d.trained?(d.isToday?'var(--accent2)':'var(--accent)'):'var(--bg3)'};" title="${d.date}"></div>
              <div style="font-family:var(--mono);font-size:0.52rem;color:var(--text3);margin-top:3px;">${d.day}</div>
            </div>`).join('')}
        </div>
      </div>`;

    // Next up
    if (prog && nextDay) {
      html += `
        <div class="section-header"><span class="section-label">Next Up</span></div>
        <div class="card" style="margin:0 12px 8px;">
          <div class="card-body">
            <div style="display:flex;align-items:center;gap:10px;">
              <div style="flex:1;">
                <div style="font-family:var(--mono);font-size:0.65rem;letter-spacing:0.1em;color:var(--text3);">${prog.name.toUpperCase()}</div>
                <div style="font-size:1rem;font-weight:600;margin-top:2px;">${nextDay.name}</div>
                <div style="font-family:var(--mono);font-size:0.65rem;color:var(--text3);margin-top:3px;">${(nextDay.exercises||[]).length} exercises${nextDay.weekday?' · '+nextDay.weekday:''}</div>
              </div>
              <button class="btn btn-primary" onclick="App.startSession('${prog.id}','${nextDay.id}')">START</button>
            </div>
          </div>
        </div>`;
    } else if (!prog) {
      html += `
        <div class="card" style="margin:0 12px 8px;">
          <div class="card-body" style="text-align:center;padding:20px;">
            <div style="font-family:var(--mono);font-size:0.72rem;letter-spacing:0.1em;color:var(--text3);margin-bottom:10px;">NO ACTIVE PROGRAM</div>
            <button class="btn btn-secondary" onclick="App.navigate('programs')">Set Up Program</button>
          </div>
        </div>`;
    }

    // Recent sessions
    if (recent.length) {
      html += `<div class="section-header"><span class="section-label">Recent</span></div>`;
      recent.forEach(sess => {
        const vol = DB.getSessionVolume(sess.id);
        const exCount = (sess.exercises||[]).length;
        html += `
          <div class="card" style="margin:0 12px 8px;">
            <div class="card-body" style="display:flex;align-items:center;gap:10px;cursor:pointer;" onclick="App.viewSession('${sess.id}')">
              <div style="flex:1;">
                <div style="font-size:0.875rem;font-weight:500;">${sess.dayName || 'Session'}</div>
                <div style="font-family:var(--mono);font-size:0.62rem;color:var(--text3);margin-top:2px;">${sess.date} · ${exCount} exercise${exCount!==1?'s':''} · ${vol>0?vol.toFixed(0)+' lbs vol':''}</div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--text3)"><polyline points="9 18 15 12 9 6"/></svg>
            </div>
          </div>`;
      });
    }

    html += `</div>`;
    return html;
  };

  const logBW = () => {
    const todayStr = new Date().toISOString().slice(0,10);
    const existing = DB.getBodyweight(todayStr);
    UI.modal({
      title: 'LOG BODYWEIGHT',
      body: `
        <div class="field">
          <label class="field-label">Weight (lbs)</label>
          <input class="field-input" id="bw-val" type="number" step="0.1" placeholder="e.g. 175.5" value="${existing?.weight||''}">
        </div>`,
      actions: [
        { label: 'Save', primary: true, action: () => {
          const val = parseFloat(document.getElementById('bw-val').value);
          if (!val || isNaN(val)) return;
          DB.saveBodyweight({ date: todayStr, weight: val });
          UI.closeModal();
          App.navigate('home');
        }},
        { label: 'Cancel', action: () => UI.closeModal() }
      ]
    });
  };

  return { render, logBW };
})();
