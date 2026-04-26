// app.js v3 — Main controller with seeded templates

const App = (() => {
  const views = { home:HomeView, log:LogView, calendar:CalendarView, progress:ProgressView, library:LibraryView, settings:SettingsView };
  const titles = { home:'TRAIN', log:'LOG', calendar:'CALENDAR', progress:'PROGRESS', library:'LIBRARY', settings:'SETTINGS' };

  const navigate = (view) => {
    State.setView(view);
    const main = document.getElementById('main-content');
    const v = views[view];
    if (!v) return;
    main.innerHTML = v.render();
    document.querySelectorAll('.nav-btn').forEach(btn=>btn.classList.toggle('active', btn.dataset.view===view));
    document.getElementById('topbar-title').textContent = titles[view]||'TRAIN';
    if (view==='progress') setTimeout(()=>ProgressView.drawAll(), 60);
    if (view==='log') {
      const draft = State.getSessionDraft();
      if (draft) LogView.startTimer();
    }
    main.scrollTop = 0;
  };

  const startSession = (templateId) => {
    const existing = State.getSessionDraft();
    if (existing) {
      UI.confirm('You have an active session. Start a new one? (Current will be discarded)', () => {
        State.clearSessionDraft(); _buildFromTemplate(templateId);
      });
      return;
    }
    _buildFromTemplate(templateId);
  };

  const _buildFromTemplate = (templateId) => {
    const tpl = DB.getTemplate(templateId);
    if (!tpl) return;
    const today = new Date().toISOString().slice(0,10);
    const draft = {
      id: DB.uid(),
      name: tpl.name,
      templateId,
      date: today,
      startedAt: Date.now(),
      sessionNotes: '',
      groups: (tpl.groups||[]).map(g => ({
        id: DB.uid(),
        label: g.label,
        exercises: (g.exercises||[]).map(ex => {
          const exDef = DB.getExercise(ex.exerciseId);
          return {
            ...ex,
            name: exDef?.name || '',
            expanded: true,  // EXPANDED BY DEFAULT (fix #5)
            sets: [LogView.newSet()],
          };
        })
      }))
    };
    State.setSessionDraft(draft);
    navigate('log');
    LogView.startTimer();
  };

  const startFromScheduled = (scheduledId) => {
    const s = DB.getScheduled().find(x=>x.id===scheduledId);
    if (!s) return;
    startSession(s.templateId);
  };

  const toggleTheme = () => {
    const settings = DB.getSettings();
    const newTheme = settings.theme==='dark'?'light':'dark';
    settings.theme = newTheme;
    DB.saveSettings(settings);
    document.documentElement.setAttribute('data-theme', newTheme);
    document.getElementById('theme-icon-sun').classList.toggle('hidden', newTheme==='dark');
    document.getElementById('theme-icon-moon').classList.toggle('hidden', newTheme==='light');
  };

  const seedLibrary = () => {
    if (DB.getExercises().length) return;
    const ex = (overrides) => ({ id: DB.uid(), useTempo: false, useHold: false, notes: '', ...overrides });
    const exercises = [
      ex({ name:'Weighted Pull-Up',    type:'dynamic_weighted',   category:'main',       effortMetrics:['RIR'],       useHold:true }),
      ex({ name:'Front Lever Raise',   type:'dynamic_bodyweight', category:'main',       effortMetrics:['RIR','RPE'], progressions:[{id:DB.uid(),name:'Tuck'},{id:DB.uid(),name:'Adv. Tuck'},{id:DB.uid(),name:'One-Leg'},{id:DB.uid(),name:'Straddle'},{id:DB.uid(),name:'Full'}], useHold:true }),
      ex({ name:'Front Lever Hold',    type:'static_bodyweight',  category:'main',       effortMetrics:['SIR','RPE'], progressions:[{id:DB.uid(),name:'Tuck'},{id:DB.uid(),name:'Adv. Tuck'},{id:DB.uid(),name:'One-Leg'},{id:DB.uid(),name:'Straddle'},{id:DB.uid(),name:'Full'}], progressionMeasure:'posture', assistanceOptions:['Light band','Medium band'], resistanceOptions:[] }),
      ex({ name:'Planche Lean',        type:'static_bodyweight',  category:'main',       effortMetrics:['SIR','RPE'], progressions:[{id:DB.uid(),name:'Tuck'},{id:DB.uid(),name:'Adv. Tuck'},{id:DB.uid(),name:'Straddle'},{id:DB.uid(),name:'Full'}], progressionMeasure:'distance', assistanceOptions:[], resistanceOptions:[], notes:'Measure distance from wall' }),
      ex({ name:'Dragon Flag Raise',   type:'dynamic_bodyweight', category:'main',       effortMetrics:['RIR','RPE'], progressions:[{id:DB.uid(),name:'One-Leg'},{id:DB.uid(),name:'Full'}] }),
      ex({ name:'Cable Row',           type:'dynamic_weighted',   category:'accessory',  effortMetrics:['RIR'] }),
      ex({ name:'Front Delt Raise',    type:'dynamic_weighted',   category:'accessory',  effortMetrics:['RIR'] }),
      ex({ name:'Reverse Curl',        type:'dynamic_weighted',   category:'accessory',  effortMetrics:['RIR'] }),
      ex({ name:'Hip Flexor Stretch',  type:'static_bodyweight',  category:'flexibility',effortMetrics:['RPE'],       progressions:[{id:DB.uid(),name:'Each position'}], progressionMeasure:'posture' }),
      ex({ name:'Calf Stretch 3-Way',  type:'static_bodyweight',  category:'flexibility',effortMetrics:['RPE'],       progressions:[{id:DB.uid(),name:'Each position'}], progressionMeasure:'posture' }),
      ex({ name:'Pike Lift',           type:'dynamic_bodyweight', category:'flexibility',effortMetrics:['RPE'],       progressions:[{id:DB.uid(),name:'Standard'}], notes:'5s contract, 5s relax' }),
      ex({ name:'Hip IR (lying)',      type:'dynamic_bodyweight', category:'flexibility',effortMetrics:['RPE'],       progressions:[{id:DB.uid(),name:'Standard'}] }),
    ];
    exercises.forEach(e=>DB.saveExercise(e));
  };

  const seedTemplates = () => {
    if (DB.getTemplates().length) return;
    const exes = DB.getExercises();
    const find = (name) => exes.find(e=>e.name===name);
    if (!exes.length) return;

    // Helper to build a target-set entry from an exercise
    const targets = (exName, t) => {
      const e = find(exName);
      if (!e) return null;
      const ex = { exerciseId: e.id };
      Object.assign(ex, t);
      return ex;
    };

    const templates = [
      {
        id: DB.uid(),
        name: 'Day 1 — Pull / Levers',
        estimatedDuration: 90,
        groups: [
          { id: DB.uid(), label: 'A', exercises: [
            targets('Front Lever Raise', { targetSetsMin:3, targetSetsMax:3, targetRepsMin:1, targetRepsMax:1, targetProgression:'Adv. Tuck', targetRPEMin:6, targetRPEMax:7 })
          ]},
          { id: DB.uid(), label: 'B', exercises: [
            targets('Front Lever Hold', { targetSetsMin:3, targetSetsMax:3, targetSecondsMin:3, targetSecondsMax:5, targetProgression:'Tuck', targetRPEMin:6, targetRPEMax:6 })
          ]},
          { id: DB.uid(), label: 'C', exercises: [
            targets('Cable Row', { targetSetsMin:3, targetSetsMax:3, targetRepsMin:8, targetRepsMax:15, targetWeight:155, targetRIRMin:1, targetRIRMax:2 })
          ]},
          { id: DB.uid(), label: 'D', exercises: [
            targets('Front Delt Raise', { targetSetsMin:2, targetSetsMax:2, targetRepsMin:8, targetRepsMax:11, targetWeight:5, targetRIRMin:1, targetRIRMax:2 }),
            targets('Reverse Curl',     { targetSetsMin:2, targetSetsMax:2, targetRepsMin:8, targetRepsMax:11, targetWeight:38, targetRIRMin:1, targetRIRMax:2 }),
          ]},
        ].filter(g => g.exercises.every(Boolean))
      },
      {
        id: DB.uid(),
        name: 'Day 2 — Push / Planche',
        estimatedDuration: 90,
        groups: [
          { id: DB.uid(), label: 'A', exercises: [
            targets('Planche Lean', { targetSetsMin:3, targetSetsMax:3, targetSecondsMin:3, targetSecondsMax:5, targetProgression:'Tuck', targetRPEMin:6, targetRPEMax:7 })
          ]},
          { id: DB.uid(), label: 'B', exercises: [
            targets('Weighted Pull-Up', { targetSetsMin:3, targetSetsMax:3, targetRepsMin:5, targetRepsMax:8, targetWeight:25, targetRIRMin:1, targetRIRMax:2 })
          ]},
          { id: DB.uid(), label: 'C', exercises: [
            targets('Dragon Flag Raise', { targetSetsMin:3, targetSetsMax:3, targetRepsMin:5, targetRepsMax:8, targetProgression:'One-Leg', targetRPEMin:6, targetRPEMax:7 })
          ]},
        ].filter(g => g.exercises.every(Boolean))
      },
      {
        id: DB.uid(),
        name: 'Day 3 — Mobility / Flexibility',
        estimatedDuration: 60,
        groups: [
          { id: DB.uid(), label: 'A', exercises: [
            targets('Hip Flexor Stretch', { targetSetsMin:2, targetSetsMax:2, targetSecondsMin:90, targetSecondsMax:90, targetProgression:'Each position', targetRPEMin:6, targetRPEMax:7 })
          ]},
          { id: DB.uid(), label: 'B', exercises: [
            targets('Calf Stretch 3-Way', { targetSetsMin:2, targetSetsMax:3, targetSecondsMin:90, targetSecondsMax:90, targetProgression:'Each position', targetRPEMin:6, targetRPEMax:7 })
          ]},
          { id: DB.uid(), label: 'C', exercises: [
            targets('Pike Lift',     { targetSetsMin:2, targetSetsMax:3, targetRepsMin:5, targetRepsMax:5, targetProgression:'Standard', targetRPEMin:6, targetRPEMax:7 }),
            targets('Hip IR (lying)',{ targetSetsMin:2, targetSetsMax:3, targetRepsMin:3, targetRepsMax:3, targetProgression:'Standard', targetRPEMin:6, targetRPEMax:7 }),
          ]},
        ].filter(g => g.exercises.every(Boolean))
      },
    ];

    templates.forEach(t => DB.saveTemplate(t));
  };

  const init = () => {
    const settings = DB.getSettings();
    document.documentElement.setAttribute('data-theme', settings.theme||'dark');
    const isDark = (settings.theme||'dark')==='dark';
    document.getElementById('theme-icon-sun').classList.toggle('hidden', isDark);
    document.getElementById('theme-icon-moon').classList.toggle('hidden', !isDark);

    document.querySelectorAll('.nav-btn').forEach(btn=>btn.addEventListener('click',()=>navigate(btn.dataset.view)));

    setTimeout(()=>document.getElementById('splash').classList.add('hidden'), 900);

    seedLibrary();
    seedTemplates();

    navigate('home');
  };

  return { navigate, startSession, startFromScheduled, toggleTheme, init };
})();

document.addEventListener('DOMContentLoaded', ()=>App.init());

if ('serviceWorker' in navigator) {
  window.addEventListener('load', ()=>{
    navigator.serviceWorker.register('/service-worker.js').catch(()=>{});
  });
}
