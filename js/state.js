// state.js v2

const State = (() => {
  let currentView = 'home';
  let sessionDraft = null;
  const listeners = {};
  const on = (e,fn) => { if(!listeners[e])listeners[e]=[]; listeners[e].push(fn); };
  const emit = (e,d) => (listeners[e]||[]).forEach(fn=>fn(d));
  const setView = (v) => { currentView=v; emit('viewChange',v); };
  const getView = () => currentView;
  const setSessionDraft = (s) => { sessionDraft=s; DB.setActiveSession(s); emit('sessionChange',s); };
  const getSessionDraft = () => { if(!sessionDraft) sessionDraft=DB.getActiveSession(); return sessionDraft; };
  const clearSessionDraft = () => { sessionDraft=null; DB.setActiveSession(null); emit('sessionChange',null); };
  return { on, emit, setView, getView, setSessionDraft, getSessionDraft, clearSessionDraft };
})();
