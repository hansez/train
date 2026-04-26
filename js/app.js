// app.js v2 — Main controller

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
      groups: (tpl.groups||[]).map(g => ({
        ...g,
        id: DB.uid(),
        exercises: (g.exercises||[]).map(ex => ({
          ...ex,
          expanded: false,
          sets: [LogView.newSet()],
        }))
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
    // Swap icons
    document.getElementById('theme-icon-sun').classList.toggle('hidden', newTheme==='dark');
    document.getElementById('theme-icon-moon').classList.toggle('hidden', newTheme==='light');
  };

  const seedLibrary = () => {
    if (DB.getExercises().length) return;
    const exercises = [
      { id:DB.uid(), name:'Weighted Pull-Up',    type:'dynamic_weighted',   category:'main',       effortMetrics:['RIR'],       useHold:true, useTempo:false, notes:'' },
      { id:DB.uid(), name:'Front Lever Raise',   type:'dynamic_bodyweight', category:'main',       effortMetrics:['RIR'],       progressions:[{id:DB.uid(),name:'Tuck'},{id:DB.uid(),name:'Advanced Tuck'},{id:DB.uid(),name:'One-Leg'},{id:DB.uid(),name:'Straddle'},{id:DB.uid(),name:'Full'}], notes:'' },
      { id:DB.uid(), name:'Front Lever Hold',    type:'static_bodyweight',  category:'main',       effortMetrics:['SIR'],       progressions:[{id:DB.uid(),name:'Tuck'},{id:DB.uid(),name:'Advanced Tuck'},{id:DB.uid(),name:'One-Leg'},{id:DB.uid(),name:'Straddle'},{id:DB.uid(),name:'Full'}], progressionMeasure:'posture', assistanceOptions:['Light band','Medium band'], resistanceOptions:[], notes:'' },
      { id:DB.uid(), name:'Planche Lean',        type:'static_bodyweight',  category:'main',       effortMetrics:['SIR'],       progressions:[{id:DB.uid(),name:'Tuck'},{id:DB.uid(),name:'Advanced Tuck'},{id:DB.uid(),name:'Straddle'},{id:DB.uid(),name:'Full'}], progressionMeasure:'distance', assistanceOptions:[], resistanceOptions:[], notes:'Measure distance from wall' },
      { id:DB.uid(), name:'Dragon Flag Raise',   type:'dynamic_bodyweight', category:'main',       effortMetrics:['RIR'],       progressions:[{id:DB.uid(),name:'One-Leg'},{id:DB.uid(),name:'Full'}], notes:'' },
      { id:DB.uid(), name:'Cable Row',           type:'dynamic_weighted',   category:'accessory',  effortMetrics:['RIR'],       useHold:false, useTempo:false, notes:'' },
      { id:DB.uid(), name:'Front Delt Raise',    type:'dynamic_weighted',   category:'accessory',  effortMetrics:['RIR'],       useHold:false, useTempo:false, notes:'' },
      { id:DB.uid(), name:'Reverse Curl',        type:'dynamic_weighted',   category:'accessory',  effortMetrics:['RIR'],       useHold:false, useTempo:false, notes:'' },
      { id:DB.uid(), name:'Hip Flexor Stretch',  type:'static_bodyweight',  category:'flexibility',effortMetrics:['RPE'],       progressions:[{id:DB.uid(),name:'Each position'}], progressionMeasure:'posture', assistanceOptions:[], resistanceOptions:[], notes:'' },
      { id:DB.uid(), name:'Calf Stretch 3-Way',  type:'static_bodyweight',  category:'flexibility',effortMetrics:['RPE'],       progressions:[{id:DB.uid(),name:'Each position'}], progressionMeasure:'posture', notes:'' },
      { id:DB.uid(), name:'Pike Lift',           type:'dynamic_bodyweight', category:'flexibility',effortMetrics:['RPE'],       progressions:[{id:DB.uid(),name:'Standard'}], notes:'5s contract, 5s relax' },
    ];
    exercises.forEach(e=>DB.saveExercise(e));
  };

  const init = () => {
    // Apply saved theme
    const settings = DB.getSettings();
    document.documentElement.setAttribute('data-theme', settings.theme||'dark');
    const isDark = (settings.theme||'dark')==='dark';
    document.getElementById('theme-icon-sun').classList.toggle('hidden', isDark);
    document.getElementById('theme-icon-moon').classList.toggle('hidden', !isDark);

    // Nav
    document.querySelectorAll('.nav-btn').forEach(btn=>btn.addEventListener('click',()=>navigate(btn.dataset.view)));

    // Splash
    setTimeout(()=>document.getElementById('splash').classList.add('hidden'), 900);

    // Seed
    seedLibrary();

    // Boot
    navigate('home');
  };

  return { navigate, startSession, startFromScheduled, toggleTheme, init };
})();

document.addEventListener('DOMContentLoaded', ()=>App.init());

// Service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', ()=>{
    navigator.serviceWorker.register('/service-worker.js').catch(()=>{});
  });
}
