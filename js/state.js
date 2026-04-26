// state.js — App state and navigation

const State = (() => {
  let currentView = 'home';
  let currentModal = null;
  let sessionDraft = null; // in-progress session

  const listeners = {};

  const on = (event, fn) => {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(fn);
  };

  const emit = (event, data) => {
    (listeners[event] || []).forEach(fn => fn(data));
  };

  const setView = (view) => {
    currentView = view;
    emit('viewChange', view);
  };

  const getView = () => currentView;

  const setSessionDraft = (s) => {
    sessionDraft = s;
    DB.setActiveSession(s);
    emit('sessionChange', s);
  };

  const getSessionDraft = () => {
    if (!sessionDraft) {
      sessionDraft = DB.getActiveSession();
    }
    return sessionDraft;
  };

  const clearSessionDraft = () => {
    sessionDraft = null;
    DB.setActiveSession(null);
    emit('sessionChange', null);
  };

  return { on, emit, setView, getView, setSessionDraft, getSessionDraft, clearSessionDraft };
})();
