// views/settings.js v2

const SettingsView = (() => {
  const render = () => {
    const s = DB.getSettings();
    let html = `<div class="view">
      <div class="section-hd"><span class="section-lbl">Settings</span></div>
      <div class="card">
        <div class="settings-item" onclick="SettingsView.toggleTheme()">
          <div class="settings-item-info">
            <div class="settings-item-title">Theme</div>
            <div class="settings-item-sub">${s.theme==='dark'?'Dark':'Light'} mode</div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--text3)"><polyline points="9 18 15 12 9 6"/></svg>
        </div>
      </div>

      <div class="section-hd"><span class="section-lbl">Data</span></div>
      <div class="card">
        <div class="settings-item" onclick="SettingsView.exportCSV()">
          <div class="settings-item-info">
            <div class="settings-item-title">Export Sessions (CSV)</div>
            <div class="settings-item-sub">All session data as a spreadsheet</div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--text3)"><polyline points="9 18 15 12 9 6"/></svg>
        </div>
        <div class="settings-item" onclick="SettingsView.exportJSON()">
          <div class="settings-item-info">
            <div class="settings-item-title">Export Backup (JSON)</div>
            <div class="settings-item-sub">Full backup of all data</div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--text3)"><polyline points="9 18 15 12 9 6"/></svg>
        </div>
        <div class="settings-item" onclick="SettingsView.importJSON()">
          <div class="settings-item-info">
            <div class="settings-item-title">Restore from Backup</div>
            <div class="settings-item-sub">Import a JSON backup file</div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--text3)"><polyline points="9 18 15 12 9 6"/></svg>
        </div>
      </div>

      <div class="section-hd"><span class="section-lbl">About</span></div>
      <div class="card">
        <div class="card-body">
          <div style="font-family:var(--display);font-size:1.1rem;font-weight:800;color:var(--accent);margin-bottom:6px;">TRAIN v2</div>
          <div style="font-size:0.9rem;color:var(--text2);line-height:1.5;">Your iron ledger. All data stored locally on this device.</div>
          <div style="font-family:var(--mono);font-size:0.68rem;color:var(--text3);margin-top:12px;">
            ${DB.getSessions().length} sessions · ${DB.getExercises().length} exercises · ${DB.getTemplates().length} templates
          </div>
        </div>
      </div>

      <div class="section-hd"><span class="section-lbl">Danger Zone</span></div>
      <div class="card" style="border-color:var(--red);">
        <div class="settings-item" onclick="SettingsView.clearAll()" style="color:var(--red);">
          <div class="settings-item-info">
            <div class="settings-item-title" style="color:var(--red);">Clear All Data</div>
            <div class="settings-item-sub">Permanently delete everything</div>
          </div>
        </div>
      </div>
    </div>`;
    return html;
  };

  const toggleTheme = () => { App.toggleTheme(); App.navigate('settings'); };

  const exportCSV = () => {
    const sessions = DB.getSessions().sort((a,b)=>new Date(a.date)-new Date(b.date));
    const rows = [['Date','Session','Group','Pair Label','Exercise','Set','Reps','Seconds','Weight(lbs)','Progression','Distance','RPE','RIR','SIR','Hold(s)','Tempo','Assistance','Resistance','Notes','Session RPE','BW(lbs)','Duration(min)']];
    sessions.forEach(sess => {
      (sess.groups||[]).forEach(g => {
        (g.exercises||[]).forEach(ex => {
          const exDef = DB.getExercise(ex.exerciseId);
          (ex.sets||[]).forEach((set,i) => {
            rows.push([sess.date,sess.name||'',g.label||'',ex.name||exDef?.name||'',exDef?.name||'',i+1,
              set.reps||'',set.seconds||'',set.weight||'',set.progression||'',set.distance||'',
              set.rpe||'',set.rir||'',set.sir||'',set.holdDuration||'',set.tempo||'',
              set.assistance||'',set.resistance||'',set.notes||'',
              sess.sessionRPE||'',sess.bodyweight||'',sess.duration||''
            ]);
          });
        });
      });
    });
    const csv = rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    _dl('train-sessions.csv', csv, 'text/csv');
    UI.toast('CSV exported!');
  };

  const exportJSON = () => {
    _dl('train-backup.json', JSON.stringify(DB.exportAll(),null,2), 'application/json');
    UI.toast('Backup exported!');
  };

  const importJSON = () => {
    const inp = document.createElement('input');
    inp.type='file'; inp.accept='.json';
    inp.onchange = e => {
      const f = e.target.files[0]; if(!f) return;
      const r = new FileReader();
      r.onload = ev => {
        try {
          const data = JSON.parse(ev.target.result);
          UI.confirm('This will overwrite all current data. Sure?', () => {
            DB.importAll(data); UI.toast('Restored!'); App.navigate('home');
          });
        } catch { UI.alert('Invalid backup file.'); }
      };
      r.readAsText(f);
    };
    inp.click();
  };

  const clearAll = () => {
    UI.confirm('Permanently delete ALL data? This cannot be undone.', () => {
      DB.keys().forEach(k=>DB.remove(k));
      UI.toast('All data cleared.'); App.navigate('home');
    });
  };

  const _dl = (name, content, type) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([content],{type}));
    a.download = name; a.click();
    URL.revokeObjectURL(a.href);
  };

  return { render, toggleTheme, exportCSV, exportJSON, importJSON, clearAll };
})();
