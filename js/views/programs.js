// views/programs.js — Program management view

const ProgramsView = (() => {
  const WEEKDAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

  const render = () => {
    const programs = DB.getPrograms();
    const settings = DB.getSettings();
    let html = `<div class="view">`;

    html += `
      <div class="section-header">
        <span class="section-label">Programs</span>
        <button class="btn btn-ghost btn-sm" onclick="ProgramsView.newProgram()">+ NEW</button>
      </div>`;

    if (!programs.length) {
      html += `
        <div class="empty-state">
          <div class="empty-icon"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div>
          <div class="empty-title">No Programs</div>
          <div class="empty-sub">Create your first training program to get started.</div>
          <button class="btn btn-primary" style="margin-top:12px" onclick="ProgramsView.newProgram()">Create Program</button>
        </div>`;
    }

    programs.forEach(prog => {
      const isActive = settings.activeProgram === prog.id;
      html += `
        <div class="program-card">
          <div class="program-card-header">
            <div style="flex:1;">
              <div style="display:flex;align-items:center;gap:8px;">
                <div class="program-name">${prog.name}</div>
                ${isActive ? `<span style="font-family:var(--mono);font-size:0.58rem;background:var(--accent-dim);color:var(--accent);padding:2px 7px;border-radius:10px;">ACTIVE</span>` : ''}
              </div>
              <div class="program-meta">${(prog.days||[]).length} days${prog.description?' · '+prog.description:''}</div>
            </div>
            <div style="display:flex;gap:4px;">
              ${!isActive ? `<button class="btn btn-secondary btn-sm" onclick="ProgramsView.setActive('${prog.id}')">Set Active</button>` : ''}
              <button class="icon-btn" onclick="ProgramsView.editProgram('${prog.id}')">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button class="icon-btn" style="color:var(--danger)" onclick="ProgramsView.deleteProgram('${prog.id}')">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
              </button>
            </div>
          </div>`;

      (prog.days || []).forEach((day, i) => {
        html += `
          <div class="day-row" onclick="ProgramsView.editDay('${prog.id}','${day.id}')">
            <div class="day-label">${day.label || `Day ${i+1}`}</div>
            <div class="day-info">
              <div class="day-name">${day.name}</div>
              <div class="day-exercises">${(day.exercises||[]).length} exercise${(day.exercises||[]).length!==1?'s':''}</div>
            </div>
            ${day.weekday ? `<div class="day-weekday">${day.weekday}</div>` : ''}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--text3)"><polyline points="9 18 15 12 9 6"/></svg>
          </div>`;
      });

      html += `
          <div style="padding:10px 16px;">
            <button class="btn btn-secondary btn-sm" onclick="ProgramsView.addDay('${prog.id}')">+ Add Day</button>
          </div>
        </div>`;
    });

    html += `</div>`;
    return html;
  };

  const newProgram = () => {
    UI.modal({
      title: 'NEW PROGRAM',
      body: `
        <div class="field">
          <label class="field-label">Program Name</label>
          <input class="field-input" id="prog-name" type="text" placeholder="e.g. Push Pull Legs" autofocus />
        </div>
        <div class="field">
          <label class="field-label">Description (optional)</label>
          <input class="field-input" id="prog-desc" type="text" placeholder="e.g. 3-day strength cycle" />
        </div>`,
      actions: [
        { label: 'Create', primary: true, action: () => {
          const name = document.getElementById('prog-name').value.trim();
          if (!name) return;
          const prog = {
            id: DB.uid(),
            name,
            description: document.getElementById('prog-desc').value.trim(),
            days: [],
            createdAt: new Date().toISOString(),
          };
          DB.saveProgram(prog);
          UI.closeModal();
          App.navigate('programs');
        }},
        { label: 'Cancel', action: () => UI.closeModal() }
      ]
    });
  };

  const editProgram = (progId) => {
    const prog = DB.getProgram(progId);
    if (!prog) return;
    UI.modal({
      title: 'EDIT PROGRAM',
      body: `
        <div class="field">
          <label class="field-label">Program Name</label>
          <input class="field-input" id="prog-name" type="text" value="${prog.name}" />
        </div>
        <div class="field">
          <label class="field-label">Description</label>
          <input class="field-input" id="prog-desc" type="text" value="${prog.description||''}" />
        </div>`,
      actions: [
        { label: 'Save', primary: true, action: () => {
          prog.name = document.getElementById('prog-name').value.trim() || prog.name;
          prog.description = document.getElementById('prog-desc').value.trim();
          DB.saveProgram(prog);
          UI.closeModal();
          App.navigate('programs');
        }},
        { label: 'Cancel', action: () => UI.closeModal() }
      ]
    });
  };

  const setActive = (progId) => {
    const settings = DB.getSettings();
    settings.activeProgram = progId;
    DB.saveSettings(settings);
    App.navigate('programs');
  };

  const deleteProgram = (progId) => {
    UI.confirm('Delete this program? Sessions already logged will not be affected.', () => {
      const settings = DB.getSettings();
      if (settings.activeProgram === progId) {
        settings.activeProgram = null;
        DB.saveSettings(settings);
      }
      DB.deleteProgram(progId);
      App.navigate('programs');
    });
  };

  const addDay = (progId) => {
    const prog = DB.getProgram(progId);
    if (!prog) return;
    const dayNum = (prog.days||[]).length + 1;

    const weekdayOptions = WEEKDAYS.map(w => `<option value="${w}">${w}</option>`).join('');

    UI.modal({
      title: 'ADD DAY',
      body: `
        <div class="field">
          <label class="field-label">Day Label</label>
          <input class="field-input" id="day-label" type="text" value="Day ${dayNum}" placeholder="Day ${dayNum}" />
        </div>
        <div class="field">
          <label class="field-label">Day Name</label>
          <input class="field-input" id="day-name" type="text" placeholder="e.g. Upper Body Push" autofocus />
        </div>
        <div class="field">
          <label class="field-label">Assigned Weekday (optional)</label>
          <select class="field-select" id="day-weekday">
            <option value="">No fixed day</option>
            ${weekdayOptions}
          </select>
        </div>`,
      actions: [
        { label: 'Add Day', primary: true, action: () => {
          const name = document.getElementById('day-name').value.trim();
          if (!name) return;
          const day = {
            id: DB.uid(),
            label: document.getElementById('day-label').value.trim() || `Day ${dayNum}`,
            name,
            weekday: document.getElementById('day-weekday').value || null,
            exercises: [],
          };
          if (!prog.days) prog.days = [];
          prog.days.push(day);
          DB.saveProgram(prog);
          UI.closeModal();
          editDay(progId, day.id);
        }},
        { label: 'Cancel', action: () => UI.closeModal() }
      ]
    });
  };

  const editDay = (progId, dayId) => {
    const prog = DB.getProgram(progId);
    if (!prog) return;
    const day = prog.days.find(d => d.id === dayId);
    if (!day) return;
    const exercises = DB.getExercises();
    const weekdayOptions = ['', ...WEEKDAYS].map(w =>
      `<option value="${w}" ${day.weekday===w?'selected':''}>${w||'No fixed day'}</option>`
    ).join('');

    let html = `
      <div class="field">
        <label class="field-label">Day Label</label>
        <input class="field-input" id="edit-day-label" type="text" value="${day.label||''}" />
      </div>
      <div class="field">
        <label class="field-label">Day Name</label>
        <input class="field-input" id="edit-day-name" type="text" value="${day.name||''}" />
      </div>
      <div class="field">
        <label class="field-label">Assigned Weekday</label>
        <select class="field-select" id="edit-day-weekday">${weekdayOptions}</select>
      </div>
      <div class="divider"></div>
      <div style="font-family:var(--mono);font-size:0.65rem;letter-spacing:0.12em;color:var(--text3);margin-bottom:8px;">EXERCISES</div>
      <div id="day-exercise-list">`;

    (day.exercises || []).forEach((ex, i) => {
      const exDef = DB.getExercise(ex.exerciseId) || { name: ex.name || '?', type: 'gym' };
      html += `
        <div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--border);">
          <div style="flex:1;">
            <div style="font-size:0.875rem;font-weight:500;">${exDef.name}</div>
            <div style="display:flex;gap:6px;margin-top:4px;flex-wrap:wrap;">
              <div style="font-family:var(--mono);font-size:0.6rem;color:var(--text3);">Target sets:</div>
              <input type="number" min="1" max="20" value="${ex.targetSets||''}" placeholder="sets"
                style="width:40px;font-family:var(--mono);font-size:0.75rem;border:1px solid var(--border);border-radius:3px;padding:2px 4px;background:var(--bg2);color:var(--text);"
                onchange="ProgramsView._updateDayEx('${progId}','${dayId}',${i},'targetSets',this.value)" />
              <div style="font-family:var(--mono);font-size:0.6rem;color:var(--text3);">×</div>
              <input type="text" value="${ex.targetReps||''}" placeholder="reps"
                style="width:50px;font-family:var(--mono);font-size:0.75rem;border:1px solid var(--border);border-radius:3px;padding:2px 4px;background:var(--bg2);color:var(--text);"
                onchange="ProgramsView._updateDayEx('${progId}','${dayId}',${i},'targetReps',this.value)" />
            </div>
          </div>
          <button class="icon-btn" style="color:var(--danger);width:28px;height:28px;" onclick="ProgramsView._removeDayEx('${progId}','${dayId}',${i})">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>`;
    });

    html += `</div>`;
    html += `<button class="btn btn-secondary btn-sm" style="margin-top:10px;width:100%" onclick="ProgramsView._addExToDay('${progId}','${dayId}')">+ Add Exercise</button>`;

    UI.sheet({
      title: `EDIT: ${day.name}`,
      body: html,
      actions: [
        { label: 'Save Day', primary: true, action: () => {
          day.label = document.getElementById('edit-day-label').value.trim() || day.label;
          day.name = document.getElementById('edit-day-name').value.trim() || day.name;
          day.weekday = document.getElementById('edit-day-weekday').value || null;
          DB.saveProgram(prog);
          UI.closeModal();
          App.navigate('programs');
        }},
        { label: 'Delete Day', danger: true, action: () => {
          UI.confirm('Remove this day from the program?', () => {
            prog.days = prog.days.filter(d => d.id !== dayId);
            DB.saveProgram(prog);
            UI.closeModal();
            App.navigate('programs');
          });
        }}
      ]
    });
  };

  const _updateDayEx = (progId, dayId, exIdx, field, value) => {
    const prog = DB.getProgram(progId);
    if (!prog) return;
    const day = prog.days.find(d => d.id === dayId);
    if (!day || !day.exercises[exIdx]) return;
    day.exercises[exIdx][field] = value;
    DB.saveProgram(prog);
  };

  const _removeDayEx = (progId, dayId, exIdx) => {
    const prog = DB.getProgram(progId);
    if (!prog) return;
    const day = prog.days.find(d => d.id === dayId);
    if (!day) return;
    day.exercises.splice(exIdx, 1);
    DB.saveProgram(prog);
    // Re-open the day editor
    UI.closeModal();
    setTimeout(() => editDay(progId, dayId), 100);
  };

  const _addExToDay = (progId, dayId) => {
    const exercises = DB.getExercises();
    if (!exercises.length) {
      UI.alert('No exercises in your library yet. Add exercises in the Library tab first.');
      return;
    }
    let html = `<div>`;
    const types = ['gym','calisthenics','stretching'];
    types.forEach(type => {
      const group = exercises.filter(e => e.type === type);
      if (!group.length) return;
      html += `<div style="padding:6px 16px 2px;font-family:var(--mono);font-size:0.6rem;letter-spacing:0.12em;color:var(--text3);">${type.toUpperCase()}</div>`;
      group.forEach(ex => {
        html += `
          <div class="exercise-item" onclick="ProgramsView._confirmAddExToDay('${progId}','${dayId}','${ex.id}')">
            <div class="exercise-item-info">
              <div class="exercise-item-name">${ex.name}</div>
              <div class="exercise-item-meta">${ex.isometric?'Isometric · ':''}${ex.useWeight===false?'Bodyweight':'Weighted'}</div>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </div>`;
      });
    });
    html += `</div>`;
    UI.sheet({ title: 'SELECT EXERCISE', body: html });
  };

  const _confirmAddExToDay = (progId, dayId, exId) => {
    const prog = DB.getProgram(progId);
    if (!prog) return;
    const day = prog.days.find(d => d.id === dayId);
    if (!day) return;
    if (!day.exercises) day.exercises = [];
    day.exercises.push({ exerciseId: exId, targetSets: '', targetReps: '' });
    DB.saveProgram(prog);
    UI.closeModal();
    setTimeout(() => editDay(progId, dayId), 100);
  };

  return {
    render,
    newProgram,
    editProgram,
    setActive,
    deleteProgram,
    addDay,
    editDay,
    _updateDayEx,
    _removeDayEx,
    _addExToDay,
    _confirmAddExToDay,
  };
})();
