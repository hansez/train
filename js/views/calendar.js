// views/calendar.js v2

const CalendarView = (() => {
  let currentYear = new Date().getFullYear();
  let currentMonth = new Date().getMonth();
  let selectedDate = new Date().toISOString().slice(0,10);

  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  const render = () => {
    const today = new Date().toISOString().slice(0,10);
    const sessions = DB.getSessions();
    const scheduled = DB.getScheduled();

    // Build calendar grid
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth+1, 0).getDate();
    const daysInPrev = new Date(currentYear, currentMonth, 0).getDate();

    let html = `<div class="view">`;

    // Calendar header
    html += `
      <div class="cal-header">
        <button class="icon-btn" onclick="CalendarView.prevMonth()">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div class="cal-month">${MONTHS[currentMonth]} ${currentYear}</div>
        <button class="icon-btn" onclick="CalendarView.nextMonth()">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>`;

    // Day headers
    html += `<div class="cal-grid">`;
    DAYS.forEach(d => { html += `<div class="cal-day-header">${d}</div>`; });

    // Fill grid
    const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
    for (let i=0; i<totalCells; i++) {
      let dayNum, dateStr, isCurrentMonth=true;
      if (i < firstDay) {
        dayNum = daysInPrev - firstDay + i + 1;
        const d = new Date(currentYear, currentMonth-1, dayNum);
        dateStr = d.toISOString().slice(0,10);
        isCurrentMonth = false;
      } else if (i >= firstDay + daysInMonth) {
        dayNum = i - firstDay - daysInMonth + 1;
        const d = new Date(currentYear, currentMonth+1, dayNum);
        dateStr = d.toISOString().slice(0,10);
        isCurrentMonth = false;
      } else {
        dayNum = i - firstDay + 1;
        dateStr = `${currentYear}-${String(currentMonth+1).padStart(2,'0')}-${String(dayNum).padStart(2,'0')}`;
      }

      const hasSession = sessions.some(s=>s.date===dateStr);
      const hasScheduled = scheduled.some(s=>s.date===dateStr);
      const isToday = dateStr === today;
      const isSelected = dateStr === selectedDate;

      html += `
        <div class="cal-day ${!isCurrentMonth?'other-month':''} ${isToday?'today':''}" 
          style="${isSelected&&!isToday?'background:var(--bg3);border-radius:8px;':''}"
          onclick="CalendarView.selectDate('${dateStr}')">
          <div class="cal-day-num">${dayNum}</div>
          <div style="display:flex;gap:2px;">
            ${hasSession?`<div class="cal-dot"></div>`:''}
            ${hasScheduled?`<div class="cal-dot scheduled"></div>`:''}
          </div>
        </div>`;
    }
    html += `</div>`;

    // Legend
    html += `
      <div style="display:flex;gap:14px;padding:10px 18px 0;font-family:var(--mono);font-size:0.62rem;color:var(--text3);">
        <div style="display:flex;align-items:center;gap:5px;"><div class="cal-dot"></div> Logged</div>
        <div style="display:flex;align-items:center;gap:5px;"><div class="cal-dot scheduled"></div> Scheduled</div>
      </div>`;

    // Selected date panel
    html += renderDatePanel(selectedDate, sessions, scheduled, today);

    html += `</div>`;
    return html;
  };

  const renderDatePanel = (dateStr, sessions, scheduled, today) => {
    const dayScheduled = scheduled.filter(s=>s.date===dateStr);
    const dayLogged = sessions.filter(s=>s.date===dateStr);
    const [y,m,d] = dateStr.split('-');
    const dateObj = new Date(parseInt(y), parseInt(m)-1, parseInt(d));
    const dayLabel = `${['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][dateObj.getDay()]}, ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][parseInt(m)-1]} ${parseInt(d)}`;
    const isPast = dateStr < today;

    let html = `
      <div style="padding:16px 14px 0;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
          <div style="font-family:var(--display);font-size:0.9rem;font-weight:700;">${dayLabel}</div>
          ${!isPast ? `<button class="btn btn-secondary btn-sm" onclick="CalendarView.scheduleSession('${dateStr}')">+ Schedule</button>` : ''}
        </div>`;

    if (!dayScheduled.length && !dayLogged.length) {
      html += `<div style="font-family:var(--mono);font-size:0.75rem;color:var(--text3);padding:12px 0;">${isPast?'No sessions logged.':'Nothing scheduled.'}</div>`;
    }

    // Scheduled (future)
    if (dayScheduled.length) {
      html += `<div style="font-family:var(--mono);font-size:0.62rem;letter-spacing:0.1em;color:var(--text3);margin-bottom:6px;">SCHEDULED</div>`;
      dayScheduled.forEach(s => {
        html += `
          <div style="background:var(--surface);border:1.5px solid var(--accent2);border-radius:var(--radius-sm);padding:12px 14px;margin-bottom:8px;display:flex;align-items:center;gap:10px;">
            <div style="width:8px;height:8px;border-radius:50%;background:var(--accent2);flex-shrink:0;"></div>
            <div style="flex:1;">
              <div style="font-weight:600;font-size:0.92rem;">${s.templateName||'Session'}</div>
              <div style="font-family:var(--mono);font-size:0.68rem;color:var(--text3);margin-top:2px;">${s.time||''} · ${s.duration||60} min</div>
            </div>
            <div style="display:flex;gap:4px;">
              <button class="btn btn-primary btn-xs" onclick="App.startFromScheduled('${s.id}')">Start</button>
              <button class="icon-btn" style="width:28px;height:28px;color:var(--red);" onclick="CalendarView.deleteScheduled('${s.id}')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          </div>`;
      });
    }

    // Logged sessions
    if (dayLogged.length) {
      html += `<div style="font-family:var(--mono);font-size:0.62rem;letter-spacing:0.1em;color:var(--text3);margin-bottom:6px;margin-top:${dayScheduled.length?8:0}px;">LOGGED</div>`;
      dayLogged.forEach(s => {
        const vol = DB.getSessionTotalVolume(s);
        html += `
          <div style="background:var(--surface);border:1.5px solid var(--border);border-radius:var(--radius-sm);padding:12px 14px;margin-bottom:8px;display:flex;align-items:center;gap:10px;cursor:pointer;" onclick="HomeView.viewSession('${s.id}')">
            <div style="width:8px;height:8px;border-radius:50%;background:var(--accent);flex-shrink:0;"></div>
            <div style="flex:1;">
              <div style="font-weight:600;font-size:0.92rem;">${s.name||'Session'}</div>
              <div style="font-family:var(--mono);font-size:0.68rem;color:var(--text3);margin-top:2px;">${s.duration?s.duration+' min · ':''}${vol>0?vol.toFixed(0)+' lbs':''}${s.sessionRPE?' · RPE '+s.sessionRPE:''}</div>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--text3)"><polyline points="9 18 15 12 9 6"/></svg>
          </div>`;
      });
    }

    html += `</div>`;

    // Export ICS button
    html += `
      <div style="padding:14px 14px 6px;border-top:1.5px solid var(--border);margin-top:14px;display:flex;justify-content:space-between;align-items:center;">
        <div style="font-family:var(--mono);font-size:0.65rem;color:var(--text3);">${DB.getScheduled().length} scheduled event${DB.getScheduled().length!==1?'s':''}</div>
        <button class="btn btn-secondary btn-sm" onclick="CalendarView.exportICS()">Export .ics</button>
      </div>`;

    return html;
  };

  const selectDate = (dateStr) => {
    selectedDate = dateStr;
    App.navigate('calendar');
  };

  const prevMonth = () => {
    currentMonth--;
    if (currentMonth < 0) { currentMonth=11; currentYear--; }
    App.navigate('calendar');
  };

  const nextMonth = () => {
    currentMonth++;
    if (currentMonth > 11) { currentMonth=0; currentYear++; }
    App.navigate('calendar');
  };

  const scheduleSession = (dateStr) => {
    const templates = DB.getTemplates();
    if (!templates.length) {
      UI.alert('Create a session template first in the Log tab.');
      return;
    }
    const tplOptions = templates.map(t=>`<option value="${t.id}">${t.name} (${t.estimatedDuration||60} min)</option>`).join('');
    UI.modal({
      title: 'SCHEDULE SESSION',
      body: `
        <div class="field">
          <label class="field-label">Template</label>
          <select class="field-select" id="sch-tpl">${tplOptions}</select>
        </div>
        <div class="field-row field-row-2">
          <div class="field">
            <label class="field-label">Date</label>
            <input class="field-input" id="sch-date" type="date" value="${dateStr}" />
          </div>
          <div class="field">
            <label class="field-label">Time</label>
            <input class="field-input" id="sch-time" type="time" value="07:00" />
          </div>
        </div>`,
      actions: [
        { label: 'Schedule', primary: true, action: () => {
          const tplId = document.getElementById('sch-tpl').value;
          const date = document.getElementById('sch-date').value;
          const time = document.getElementById('sch-time').value;
          const tpl = DB.getTemplate(tplId);
          if (!tpl||!date) return;
          DB.saveScheduled({ id:DB.uid(), templateId:tplId, templateName:tpl.name, date, time, duration:tpl.estimatedDuration||60 });
          UI.closeModal();
          App.navigate('calendar');
        }},
        { label: 'Cancel', action: () => UI.closeModal() }
      ]
    });
  };

  const deleteScheduled = (id) => {
    UI.confirm('Remove this scheduled session?', () => {
      DB.deleteScheduled(id);
      App.navigate('calendar');
    });
  };

  const exportICS = () => {
    const scheduled = DB.getScheduled();
    if (!scheduled.length) { UI.alert('No scheduled sessions to export.'); return; }
    const ics = DB.exportICS();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
    a.download = 'train-schedule.ics';
    a.click();
    URL.revokeObjectURL(a.href);
    UI.toast('Calendar exported!');
  };

  return { render, selectDate, prevMonth, nextMonth, scheduleSession, deleteScheduled, exportICS };
})();
