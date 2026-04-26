// views/settings.js

const SettingsView = (() => {
  const render = () => {
    const settings = DB.getSettings();
    let html = `<div class="view">`;

    html += `<div class="section-header"><span class="section-label">Settings</span></div>`;

    // General
    html += `
      <div class="card" style="margin:0 12px 10px;">
        <div class="settings-item" onclick="SettingsView.editWeightUnit()">
          <div class="settings-item-info">
            <div class="settings-item-title">Weight Unit</div>
            <div class="settings-item-sub">${settings.weightUnit || 'lbs'}</div>
          </div>
          <svg class="settings-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
        </div>
      </div>`;

    // Data
    html += `
      <div class="section-header"><span class="section-label">Data</span></div>
      <div class="card" style="margin:0 12px 10px;">
        <div class="settings-item" onclick="SettingsView.exportCSV()">
          <div class="settings-item-info">
            <div class="settings-item-title">Export Sessions (CSV)</div>
            <div class="settings-item-sub">Download all session data as a spreadsheet</div>
          </div>
          <svg class="settings-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
        </div>
        <div class="settings-item" onclick="SettingsView.exportJSON()">
          <div class="settings-item-info">
            <div class="settings-item-title">Export All Data (JSON)</div>
            <div class="settings-item-sub">Full backup of all programs, exercises, and sessions</div>
          </div>
          <svg class="settings-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
        </div>
        <div class="settings-item" onclick="SettingsView.importJSON()">
          <div class="settings-item-info">
            <div class="settings-item-title">Restore from Backup</div>
            <div class="settings-item-sub">Import a JSON backup file</div>
          </div>
          <svg class="settings-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
        </div>
      </div>`;

    // About
    html += `
      <div class="section-header"><span class="section-label">About</span></div>
      <div class="card" style="margin:0 12px 10px;">
        <div class="card-body">
          <div style="font-family:var(--mono);font-size:0.72rem;letter-spacing:0.1em;color:var(--accent);margin-bottom:4px;">TRAIN v1.0</div>
          <div style="font-size:0.82rem;color:var(--text2);">Your personal iron ledger. Data stored locally on this device.</div>
          <div style="margin-top:10px;">
            <div style="font-family:var(--mono);font-size:0.62rem;color:var(--text3);">${DB.getSessions().length} sessions · ${DB.getExercises().length} exercises · ${DB.getPrograms().length} programs</div>
          </div>
        </div>
      </div>`;

    // Danger zone
    html += `
      <div class="section-header"><span class="section-label">Danger Zone</span></div>
      <div class="card" style="margin:0 12px 20px;border-color:var(--danger);">
        <div class="settings-item" onclick="SettingsView.clearAllData()" style="color:var(--danger);">
          <div class="settings-item-info">
            <div class="settings-item-title" style="color:var(--danger);">Clear All Data</div>
            <div class="settings-item-sub">Permanently delete everything. Cannot be undone.</div>
          </div>
        </div>
      </div>`;

    html += `</div>`;
    return html;
  };

  const editWeightUnit = () => {
    const settings = DB.getSettings();
    UI.modal({
      title: 'WEIGHT UNIT',
      body: `
        <div class="field">
          <select class="field-select" id="unit-sel">
            <option value="lbs" ${settings.weightUnit==='lbs'?'selected':''}>lbs</option>
            <option value="kg" ${settings.weightUnit==='kg'?'selected':''}>kg</option>
          </select>
        </div>`,
      actions: [
        { label: 'Save', primary: true, action: () => {
          settings.weightUnit = document.getElementById('unit-sel').value;
          DB.saveSettings(settings);
          UI.closeModal();
          App.navigate('settings');
        }},
        { label: 'Cancel', action: () => UI.closeModal() }
      ]
    });
  };

  const exportCSV = () => {
    const sessions = DB.getSessions().sort((a,b)=>new Date(a.date)-new Date(b.date));
    const rows = [['Date','Program','Day','Exercise','Set','Reps','Weight','RIR','SIR','RPE','Hold(s)','Assistance','HeightAdj','Tempo','Notes']];
    sessions.forEach(sess => {
      (sess.exercises||[]).forEach(ex => {
        const exDef = DB.getExercise(ex.exerciseId);
        (ex.sets||[]).forEach((set, i) => {
          rows.push([
            sess.date, sess.programName||'', sess.dayName||'',
            exDef?.name||ex.name||'', i+1,
            set.reps||'', set.weight||'', set.rir||'', set.sir||'', set.rpe||'',
            set.holdDuration||'', set.assistance||'', set.heightAdj||'', set.tempo||'', set.notes||''
          ]);
        });
      });
    });
    const csv = rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    download('train-sessions.csv', csv, 'text/csv');
    UI.toast('CSV exported!');
  };

  const exportJSON = () => {
    const data = DB.exportAll();
    download('train-backup.json', JSON.stringify(data, null, 2), 'application/json');
    UI.toast('Backup exported!');
  };

  const importJSON = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target.result);
          UI.confirm('This will overwrite all current data. Are you sure?', () => {
            DB.importAll(data);
            UI.toast('Backup restored!');
            App.navigate('home');
          });
        } catch {
          UI.alert('Invalid backup file.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const clearAllData = () => {
    UI.confirm('This will permanently delete ALL your data. Are you absolutely sure?', () => {
      DB.keys().forEach(k => DB.remove(k));
      UI.toast('All data cleared.');
      App.navigate('home');
    });
  };

  const download = (filename, content, type) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([content], { type }));
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return { render, editWeightUnit, exportCSV, exportJSON, importJSON, clearAllData };
})();
