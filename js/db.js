// db.js — Local storage data layer
// All data stored in localStorage under namespaced keys

const DB = (() => {
  const PREFIX = 'train_';

  const get = (key) => {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  };

  const set = (key, value) => {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
      return true;
    } catch { return false; }
  };

  const remove = (key) => {
    localStorage.removeItem(PREFIX + key);
  };

  const keys = () => {
    return Object.keys(localStorage)
      .filter(k => k.startsWith(PREFIX))
      .map(k => k.slice(PREFIX.length));
  };

  // ---- Programs ----
  const getPrograms = () => get('programs') || [];
  const setPrograms = (p) => set('programs', p);
  const saveProgram = (prog) => {
    const all = getPrograms();
    const idx = all.findIndex(p => p.id === prog.id);
    if (idx >= 0) all[idx] = prog;
    else all.push(prog);
    setPrograms(all);
  };
  const deleteProgram = (id) => setPrograms(getPrograms().filter(p => p.id !== id));
  const getProgram = (id) => getPrograms().find(p => p.id === id) || null;

  // ---- Exercise Library ----
  const getExercises = () => get('exercises') || [];
  const setExercises = (e) => set('exercises', e);
  const saveExercise = (ex) => {
    const all = getExercises();
    const idx = all.findIndex(e => e.id === ex.id);
    if (idx >= 0) all[idx] = ex;
    else all.push(ex);
    setExercises(all);
  };
  const deleteExercise = (id) => setExercises(getExercises().filter(e => e.id !== id));
  const getExercise = (id) => getExercises().find(e => e.id === id) || null;

  // ---- Sessions ----
  const getSessions = () => get('sessions') || [];
  const setSessions = (s) => set('sessions', s);
  const saveSession = (sess) => {
    const all = getSessions();
    const idx = all.findIndex(s => s.id === sess.id);
    if (idx >= 0) all[idx] = sess;
    else all.push(sess);
    setSessions(all);
    return sess;
  };
  const deleteSession = (id) => setSessions(getSessions().filter(s => s.id !== id));
  const getSession = (id) => getSessions().find(s => s.id === id) || null;
  const getSessionsByDate = (dateStr) => getSessions().filter(s => s.date === dateStr);
  const getRecentSessions = (n = 10) => {
    return getSessions()
      .sort((a,b) => new Date(b.date) - new Date(a.date))
      .slice(0, n);
  };

  // ---- Bodyweight ----
  const getBodyweights = () => get('bodyweights') || [];
  const saveBodyweight = (entry) => {
    const all = getBodyweights();
    const idx = all.findIndex(e => e.date === entry.date);
    if (idx >= 0) all[idx] = entry;
    else all.push(entry);
    set('bodyweights', all);
  };
  const getBodyweight = (date) => getBodyweights().find(e => e.date === date) || null;

  // ---- Settings ----
  const getSettings = () => get('settings') || {
    activeProgram: null,
    weightUnit: 'lbs',
  };
  const saveSettings = (s) => set('settings', s);

  // ---- Active Session ----
  const getActiveSession = () => get('active_session') || null;
  const setActiveSession = (s) => s ? set('active_session', s) : remove('active_session');

  // ---- Backup / Export ----
  const exportAll = () => {
    const data = {};
    keys().forEach(k => { data[k] = get(k); });
    return data;
  };
  const importAll = (data) => {
    Object.entries(data).forEach(([k, v]) => set(k, v));
  };

  // ---- IDs ----
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  // ---- Analytics ----
  const getPRs = (exerciseId) => {
    const sessions = getSessions();
    let maxWeight = 0, maxReps = 0, maxHold = 0, maxVolume = 0;
    sessions.forEach(sess => {
      (sess.exercises || []).forEach(ex => {
        if (ex.exerciseId !== exerciseId) return;
        let sessVol = 0;
        (ex.sets || []).forEach(s => {
          if (s.weight && parseFloat(s.weight) > maxWeight) maxWeight = parseFloat(s.weight);
          if (s.reps && parseInt(s.reps) > maxReps) maxReps = parseInt(s.reps);
          if (s.holdDuration && parseFloat(s.holdDuration) > maxHold) maxHold = parseFloat(s.holdDuration);
          const vol = (parseFloat(s.weight)||0) * (parseInt(s.reps)||1);
          sessVol += vol;
        });
        if (sessVol > maxVolume) maxVolume = sessVol;
      });
    });
    return { maxWeight, maxReps, maxHold, maxVolume };
  };

  const getVolumeHistory = (exerciseId) => {
    return getSessions()
      .filter(s => (s.exercises||[]).some(e => e.exerciseId === exerciseId))
      .sort((a,b) => new Date(a.date) - new Date(b.date))
      .map(sess => {
        let vol = 0;
        (sess.exercises||[]).forEach(ex => {
          if (ex.exerciseId !== exerciseId) return;
          (ex.sets||[]).forEach(s => {
            vol += (parseFloat(s.weight)||0) * (parseInt(s.reps)||1);
          });
        });
        return { date: sess.date, volume: vol };
      });
  };

  const getSessionVolume = (sessId) => {
    const sess = getSession(sessId);
    if (!sess) return 0;
    let vol = 0;
    (sess.exercises||[]).forEach(ex => {
      (ex.sets||[]).forEach(s => {
        vol += (parseFloat(s.weight)||0) * (parseInt(s.reps)||1);
      });
    });
    return vol;
  };

  return {
    get, set, remove, keys, uid,
    getPrograms, setPrograms, saveProgram, deleteProgram, getProgram,
    getExercises, setExercises, saveExercise, deleteExercise, getExercise,
    getSessions, saveSession, deleteSession, getSession,
    getSessionsByDate, getRecentSessions,
    getBodyweights, saveBodyweight, getBodyweight,
    getSettings, saveSettings,
    getActiveSession, setActiveSession,
    exportAll, importAll,
    getPRs, getVolumeHistory, getSessionVolume,
  };
})();
