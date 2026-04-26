const CACHE = 'train-v3';
const ASSETS = ['/','/index.html','/manifest.json','/css/style.css','/js/db.js','/js/state.js','/js/ui.js','/js/app.js','/js/views/home.js','/js/views/log.js','/js/views/calendar.js','/js/views/progress.js','/js/views/library.js','/js/views/settings.js'];
self.addEventListener('install', e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate', e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch', e=>{
  if(e.request.method!=='GET') return;
  e.respondWith(caches.match(e.request).then(cached=>{
    if(cached) return cached;
    return fetch(e.request).then(resp=>{
      if(resp&&resp.status===200) { const cl=resp.clone(); caches.open(CACHE).then(c=>c.put(e.request,cl)); }
      return resp;
    });
  }).catch(()=>caches.match('/index.html')));
});
