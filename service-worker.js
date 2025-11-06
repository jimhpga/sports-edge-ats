self.addEventListener('install', (e)=>{
  e.waitUntil(caches.open('sports-edge-v3').then(cache => cache.addAll([
    './','./index.html','./app.js','./manifest.json',
    './data/week-01.json','./data/week-02.json'
  ])));
});
self.addEventListener('fetch', (e)=>{
  e.respondWith(caches.match(e.request).then(resp => resp || fetch(e.request)));
});
// bump 20251031060723

// bump 20251031060838
