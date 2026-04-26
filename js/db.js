// db.js v2 — Full data layer

const DB = (() => {
  const P = 'trainv2_';
  const get = (k) => { try { const r = localStorage.getItem(P+k); return r ? JSON.parse(r) : null; } catch { return null; } };
  const set = (k, v) => { try { localStorage.setItem(P+k, JSON.stringify(v)); return true; } catch { return false; } };
  const remove = (k) => localStorage.removeItem(P+k);
  const keys = () => Object.keys(localStorage).filter(k=>k.startsWith(P)).map(k=>k.slice(P.length));
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,6);

  // ---- Exercise Library ----
  // Exercise types: dynamic_weighted | dynamic_bodyweight | static_weighted | static_bodyweight
  // effortMetrics: array of 'RIR' | 'SIR' | 'RPE' (at least one required)
  // category: 'main' | 'accessory' | 'flexibility'
  // For dynamic_bodyweight / static_bodyweight: progressions = [{id, name}]
  // For static_bodyweight: progressionMeasure = 'distance' | 'posture', assistanceOptions, resistanceOptions
  const getExercises = () => get('exercises') || [];
  const saveExercise = (ex) => { const all=getExercises(); const i=all.findIndex(e=>e.id===ex.id); i>=0?all[i]=ex:all.push(ex); set('exercises',all); };
  const deleteExercise = (id) => set('exercises', getExercises().filter(e=>e.id!==id));
  const getExercise = (id) => getExercises().find(e=>e.id===id)||null;

  // ---- Session Templates ----
  // Template = { id, name, estimatedDuration (min), groups: [{id, label, exercises:[{exerciseId, targetSetsMin, targetSetsMax, targetRepsMin, targetRepsMax, targetProgressionId, targetSecondsMin, targetSecondsMax, targetRPEMin, targetRPEMax, notes}]}] }
  const getTemplates = () => get('templates') || [];
  const saveTemplate = (t) => { const all=getTemplates(); const i=all.findIndex(x=>x.id===t.id); i>=0?all[i]=t:all.push(t); set('templates',all); };
  const deleteTemplate = (id) => set('templates', getTemplates().filter(t=>t.id!==id));
  const getTemplate = (id) => getTemplates().find(t=>t.id===id)||null;

  // ---- Scheduled Sessions ----
  // { id, date (YYYY-MM-DD), time (HH:MM), templateId, templateName, duration (min) }
  const getScheduled = () => get('scheduled') || [];
  const saveScheduled = (s) => { const all=getScheduled(); const i=all.findIndex(x=>x.id===s.id); i>=0?all[i]=s:all.push(s); set('scheduled',all); };
  const deleteScheduled = (id) => set('scheduled', getScheduled().filter(s=>s.id!==id));
  const getScheduledForDate = (date) => getScheduled().filter(s=>s.date===date);

  // ---- Sessions (logged) ----
  const getSessions = () => get('sessions') || [];
  const saveSession = (s) => { const all=getSessions(); const i=all.findIndex(x=>x.id===s.id); i>=0?all[i]=s:all.push(s); set('sessions',all); return s; };
  const deleteSession = (id) => set('sessions', getSessions().filter(s=>s.id!==id));
  const getSession = (id) => getSessions().find(s=>s.id===id)||null;
  const getRecentSessions = (n=10) => getSessions().sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,n);
  const getSessionsForDate = (date) => getSessions().filter(s=>s.date===date);

  // ---- Bodyweight ----
  const getBodyweights = () => get('bodyweights') || [];
  const saveBodyweight = (e) => { const all=getBodyweights(); const i=all.findIndex(x=>x.date===e.date); i>=0?all[i]=e:all.push(e); set('bodyweights',all); };
  const getBodyweight = (date) => getBodyweights().find(e=>e.date===date)||null;
  const getLatestBodyweight = () => getBodyweights().sort((a,b)=>new Date(b.date)-new Date(a.date))[0]||null;

  // ---- Settings ----
  const getSettings = () => get('settings') || { theme: 'dark', weightUnit: 'lbs' };
  const saveSettings = (s) => set('settings', s);

  // ---- Active Session Draft ----
  const getActiveSession = () => get('active_session')||null;
  const setActiveSession = (s) => s ? set('active_session',s) : remove('active_session');

  // ---- Analytics ----
  const getPRs = (exerciseId) => {
    let maxWeight=0, maxReps=0, maxHold=0, maxVol=0;
    getSessions().forEach(sess => {
      (sess.groups||[]).forEach(g => {
        (g.exercises||[]).forEach(ex => {
          if (ex.exerciseId!==exerciseId) return;
          let vol=0;
          (ex.sets||[]).forEach(s => {
            if (parseFloat(s.weight)>maxWeight) maxWeight=parseFloat(s.weight);
            if (parseInt(s.reps)>maxReps) maxReps=parseInt(s.reps);
            if (parseFloat(s.seconds)>maxHold) maxHold=parseFloat(s.seconds);
            vol+=(parseFloat(s.weight)||0)*(parseInt(s.reps)||1);
          });
          if (vol>maxVol) maxVol=vol;
        });
      });
    });
    return { maxWeight, maxReps, maxHold, maxVol };
  };

  const getExerciseHistory = (exerciseId, metric='volume') => {
    return getSessions()
      .filter(s=>(s.groups||[]).some(g=>(g.exercises||[]).some(e=>e.exerciseId===exerciseId)))
      .sort((a,b)=>new Date(a.date)-new Date(b.date))
      .map(sess => {
        let val=0;
        (sess.groups||[]).forEach(g=>{
          (g.exercises||[]).forEach(ex=>{
            if (ex.exerciseId!==exerciseId) return;
            if (metric==='volume') (ex.sets||[]).forEach(s=>{ val+=(parseFloat(s.weight)||0)*(parseInt(s.reps)||1); });
            else if (metric==='weight') (ex.sets||[]).forEach(s=>{ const w=parseFloat(s.weight)||0; if(w>val)val=w; });
            else if (metric==='reps') (ex.sets||[]).forEach(s=>{ const r=parseInt(s.reps)||0; if(r>val)val=r; });
            else if (metric==='seconds') (ex.sets||[]).forEach(s=>{ const sc=parseFloat(s.seconds)||0; if(sc>val)val=sc; });
            else if (metric==='rpe') { const rpes=(ex.sets||[]).map(s=>parseFloat(s.rpe)||0).filter(v=>v>0); if(rpes.length) val=rpes.reduce((a,b)=>a+b,0)/rpes.length; }
          });
        });
        return { date: sess.date, val };
      }).filter(p=>p.val>0);
  };

  const getSessionTotalVolume = (sess) => {
    let vol=0;
    (sess.groups||[]).forEach(g=>(g.exercises||[]).forEach(ex=>(ex.sets||[]).forEach(s=>{ vol+=(parseFloat(s.weight)||0)*(parseInt(s.reps)||1); })));
    return vol;
  };

  // ---- Export / Import ----
  const exportAll = () => { const d={}; keys().forEach(k=>{d[k]=get(k);}); return d; };
  const importAll = (data) => Object.entries(data).forEach(([k,v])=>set(k,v));

  // ---- ICS Export ----
  const exportICS = () => {
    const scheduled = getScheduled();
    const lines = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Train//Iron Ledger//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH'];
    scheduled.forEach(s => {
      const [y,mo,d] = s.date.split('-');
      const [h,min] = (s.time||'07:00').split(':');
      const pad = n => String(n).padStart(2,'0');
      const dtStart = `${y}${pad(mo)}${pad(d)}T${pad(h)}${pad(min)}00`;
      const endMin = parseInt(min) + (s.duration||60);
      const endH = parseInt(h) + Math.floor(endMin/60);
      const dtEnd = `${y}${pad(mo)}${pad(d)}T${pad(endH%24)}${pad(endMin%60)}00`;
      lines.push('BEGIN:VEVENT',`UID:${s.id}@train`,`DTSTART:${dtStart}`,`DTEND:${dtEnd}`,`SUMMARY:🏋️ ${s.templateName||'Training'}`,`DESCRIPTION:${s.duration||60} min session`,`LOCATION:Gym`,'END:VEVENT');
    });
    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
  };

  return {
    get, set, remove, keys, uid,
    getExercises, saveExercise, deleteExercise, getExercise,
    getTemplates, saveTemplate, deleteTemplate, getTemplate,
    getScheduled, saveScheduled, deleteScheduled, getScheduledForDate,
    getSessions, saveSession, deleteSession, getSession, getRecentSessions, getSessionsForDate,
    getBodyweights, saveBodyweight, getBodyweight, getLatestBodyweight,
    getSettings, saveSettings,
    getActiveSession, setActiveSession,
    getPRs, getExerciseHistory, getSessionTotalVolume,
    exportAll, importAll, exportICS,
  };
})();
