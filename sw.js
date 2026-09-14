const CACHE='vanes-shell-v1';
const APP_SHELL=['/','/index.html','/styles.css','/vanes-enhancements.css','/vanes-brand.css','/app.js','/full-chat.js','/vanes-enhancements.js','/vanes-brand.js','/assets/vanes-logo.svg','/assets/ob-technologies-lab.svg'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(APP_SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{if(event.request.method!=='GET')return;const url=new URL(event.request.url);if(url.origin!==location.origin)return;event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));return response;}).catch(()=>caches.match('/index.html'))));});
