// app.js — Main app controller

const App = (() => {
  const views = {
    home: HomeView,
    log: LogView,
    progress: ProgressView,
    programs: ProgramsView,
    library: LibraryView,
    settings: SettingsView,
  };

  const titles = {
    home: 'TRAIN',
    log: 'LOG',
    progress: 'PROGRESS',
    programs: 'PROGRAMS',
    library: 'LIBRARY',
    settings: 'SETTINGS',
  };

  const navigate = (view) => {
    State.setView(view);
    const main = document.getElementById('main-content');
    const v = views[view];
    if (!v) return;
    main.innerHTML = v.render();

    // Update nav
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === view);
    });

    // Update topbar title
    document.getElementById('topbar-title').textContent = titles[view] || 'TRAIN';

    // Post-render hooks
    if (view === 'progress') {
      setTimeout(() => ProgressView.drawCharts(), 50);
    }

    // Scroll to top
    main.scrollTop = 0;
  };

  const startSession = (progId, dayId) => {
    // Check for existing active session
    const existing = State.getSessionDraft();
    if (existing) {
      UI.confirm('You have an unfinished session. Start a new one? (The previous one will be discarded)', () => {
        State.clearSessionDraft();
        _buildSession(progId, dayId);
      });
      return;
    }
    _buildSession(progId, dayId);
  };

  const _buildSession = (progId, dayId) => {
    const prog = DB.getProgram(progId);
    if (!prog) return;
    const day = prog.days.find(d => d.id === dayId);
    if (!day) return;

    const todayStr = new Date().toISOString().slice(0,10);
    const exercises = (day.exercises || []).map(ex => {
      const exDef = DB.getExercise(ex.exerciseId);
      return {
        exerciseId: ex.exerciseId,
        name: exDef?.name || '?',
        targetSets: ex.targetSets,
        targetReps: ex.targetReps,
        sets: [LogView.newSetData()],
      };
    });

    const draft = {
      id: DB.uid(),
      date: todayStr,
      programId: progId,
      programName: prog.name,
      programDayId: dayId,
      dayName: day.name,
      exercises,
    };
    State.setSessionDraft(draft);
    navigate('log');
  };

  const viewSession = (sessId) => {
    const sess = DB.getSession(sessId);
    if (!sess) return;
    const vol = DB.getSessionVolume(sessId);
    const exCount = (sess.exercises||[]).length;
    const setCount = (sess.exercises||[]).reduce((n,ex)=>n+(ex.sets||[]).length,0);

    let html = `
      <div style="padding:0;">
        <div style="padding:12px 16px;border-bottom:1px solid var(--border);">
          <div style="font-family:var(--mono);font-size:0.62rem;letter-spacing:0.1em;color:var(--text3);">${sess.programName||'FREE SESSION'}</div>
          <div style="font-size:1.1rem;font-weight:600;margin-top:2px;">${sess.dayName||'Session'}</div>
          <div style="font-family:var(--mono);font-size:0.65rem;color:var(--text3);margin-top:4px;">${sess.date} · ${exCount} exercises · ${setCount} sets · ${vol>0?vol.toFixed(0)+' lbs':'no weight'}</div>
        </div>`;

    (sess.exercises||[]).forEach(ex => {
      const exDef = DB.getExercise(ex.exerciseId);
      html += `
        <div style="padding:10px 16px;border-bottom:1px solid var(--border);">
          <div style="font-weight:600;margin-bottom:6px;">${exDef?.name||ex.name||'Exercise'}</div>`;
      (ex.sets||[]).forEach((set,i) => {
        const parts = [];
        if (set.reps) parts.push(`${set.reps} reps`);
        if (set.weight) parts.push(`${set.weight} lbs`);
        if (set.holdDuration) parts.push(`${set.holdDuration}s hold`);
        if (set.rpe) parts.push(`RPE ${set.rpe}`);
        if (set.rir) parts.push(`${set.rir} RIR`);
        if (set.sir) parts.push(`${set.sir}s SIR`);
        html += `<div style="font-family:var(--mono);font-size:0.72rem;color:var(--text2);margin-top:3px;">
          <span style="color:var(--text3);">Set ${i+1}</span> ${parts.join(' · ')}
          ${set.notes?`<span style="color:var(--text3);"> — ${set.notes}</span>`:''}
        </div>`;
      });
      html += `</div>`;
    });
    html += `</div>`;

    UI.sheet({ title: 'SESSION DETAIL', body: html, actions: [{ label: 'Close', action: () => UI.closeModal() }] });
  };

  const init = () => {
    // Nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => navigate(btn.dataset.view));
    });

    // Settings button
    document.getElementById('settings-btn').addEventListener('click', () => navigate('settings'));

    // Splash
    setTimeout(() => {
      document.getElementById('splash').classList.add('hidden');
    }, 900);

    // Seed sample data for first-time users
    if (!DB.getExercises().length) seedLibrary();

    // Start on home
    navigate('home');
  };

  const seedLibrary = () => {
    const exercises = [
      { id: DB.uid(), name: 'Pull-Up', type: 'calisthenics', useWeight: false, isometric: false, useDuration: false, notes: '' },
      { id: DB.uid(), name: 'Weighted Pull-Up', type: 'calisthenics', useWeight: true, isometric: false, useDuration: false, notes: '' },
      { id: DB.uid(), name: 'Push-Up', type: 'calisthenics', useWeight: false, isometric: false, useDuration: false, notes: '' },
      { id: DB.uid(), name: 'Dip', type: 'calisthenics', useWeight: false, isometric: false, useDuration: false, notes: '' },
      { id: DB.uid(), name: 'Hollow Body Hold', type: 'calisthenics', useWeight: false, isometric: true, useDuration: true, notes: '' },
      { id: DB.uid(), name: 'Planche Lean', type: 'calisthenics', useWeight: false, isometric: true, useDuration: true, notes: '' },
      { id: DB.uid(), name: 'Bench Press', type: 'gym', useWeight: true, isometric: false, useDuration: false, notes: '' },
      { id: DB.uid(), name: 'Squat', type: 'gym', useWeight: true, isometric: false, useDuration: false, notes: '' },
      { id: DB.uid(), name: 'Deadlift', type: 'gym', useWeight: true, isometric: false, useDuration: false, notes: '' },
      { id: DB.uid(), name: 'Overhead Press', type: 'gym', useWeight: true, isometric: false, useDuration: false, notes: '' },
      { id: DB.uid(), name: 'Romanian Deadlift', type: 'gym', useWeight: true, isometric: false, useDuration: false, notes: '' },
      { id: DB.uid(), name: 'Hip Flexor Stretch', type: 'stretching', useWeight: false, isometric: false, useDuration: true, notes: '' },
      { id: DB.uid(), name: 'Hamstring Stretch', type: 'stretching', useWeight: false, isometric: false, useDuration: true, notes: '' },
      { id: DB.uid(), name: 'Shoulder Dislocates', type: 'stretching', useWeight: false, isometric: false, useDuration: false, notes: '' },
    ];
    exercises.forEach(ex => DB.saveExercise(ex));
  };

  return { navigate, startSession, viewSession, init };
})();

// Boot
document.addEventListener('DOMContentLoaded', () => App.init());

// Register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .catch(err => console.log('SW registration failed (expected in local dev):', err));
  });
}
