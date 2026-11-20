// Service worker ขั้นที่ 1-2: ให้ติดตั้งเป็นแอปได้ และเปิดเปลือกหน้าเว็บได้แม้เน็ตสะดุด
// ขั้นที่ 3 จะเพิ่มการรับ Web Push ในไฟล์นี้
const CACHE = '2gether-shell-v33';
const SHELL = [
  './',
  'index.html',
  'css/style.css',
  'manifest.webmanifest',
  'js/app.js',
  'js/auth.js',
  'js/avatar-editor.js',
  'js/avatar.js',
  'js/bedroom.js',
  'js/bond.js',
  'js/cat-setup.js',
  'js/cat.js',
  'js/chat-store.js',
  'js/chat.js',
  'js/collection.js',
  'js/config.js',
  'js/days.js',
  'js/fx.js',
  'js/game-icons.js',
  'js/game-room.js',
  'js/game.js',
  'js/games-hub.js',
  'js/garden.js',
  'js/home.js',
  'js/host.js',
  'js/invite.js',
  'js/kitchen.js',
  'js/memory.js',
  'js/onboarding.js',
  'js/play-invite.js',
  'js/presence.js',
  'js/push.js',
  'js/room-view.js',
  'js/rooms.js',
  'js/scene.js',
  'js/season-picker.js',
  'js/settings.js',
  'js/stickers.js',
  'js/supabase.js',
  'js/vendor/supabase.js',
  'js/theme.js',
  'js/ui.js',
  'js/scenes-special.js',
  'js/perf.js',
  'js/admin.js',
  'js/media-util.js',
  'js/tv.js',
  'js/eco.js',
  'js/music.js',
  'js/games/cook-cat.js',
  'js/games/cook-together.js',
  'js/games/firefly.js',
  'js/games/fishing.js',
  'js/games/gestures.js',
  'js/games/planting.js',
  'js/games/star-catch.js',
  'js/games/util.js',
  'js/games/classic/battleship.js',
  'js/games/classic/checkers.js',
  'js/games/classic/chess.js',
  'js/games/classic/connect4.js',
  'js/games/classic/dots.js',
  'js/games/classic/hangman.js',
  'js/games/classic/index.js',
  'js/games/classic/kit.js',
  'js/games/classic/memory.js',
  'js/games/classic/othello.js',
  'js/games/classic/words-th-1.js',
  'js/games/classic/words-th-2.js',
  'js/games/classic/words-th-3.js',
  'js/games/classic/words-th-4.js',
  'js/games/classic/pong.js',
  'js/games/classic/rps.js',
  'js/games/classic/xo.js',
  'fonts/itim-thai-400-normal.woff2',
  'fonts/itim-latin-400-normal.woff2',
  'fonts/itim-latin-ext-400-normal.woff2',
  'art/rooms/bedroom.svg',
  'art/rooms/garden.svg',
  'art/rooms/kitchen.svg',
  'art/rooms/living.svg',
  'art/windows/autumn.svg',
  'art/windows/cool.svg',
  'art/windows/rain.svg',
  'art/windows/spring.svg',
  'art/windows/summer.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// เครือข่ายก่อน แคชสำรอง: แก้โค้ดแล้วเห็นของใหม่ทันที ไม่ติดของเก่า
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match('index.html'))),
  );
});

// แจ้งเตือนจากเซิร์ฟเวอร์ (Web Push)
self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { body: event.data ? event.data.text() : '' }; }
  // ตัวเลขบนไอคอนแอป = ข้อความที่ยังไม่อ่าน
  const badge = Number.isFinite(data.badge) && 'setAppBadge' in self.navigator
    ? (data.badge > 0 ? self.navigator.setAppBadge(data.badge) : self.navigator.clearAppBadge()).catch(() => {})
    : Promise.resolve();
  event.waitUntil(Promise.all([badge, self.registration.showNotification(data.title || '2gether', {
    body: data.body || 'กลับบ้านกันเถอะ',
    icon: 'icons/icon-192.png',
    badge: 'icons/icon-192.png',
    tag: data.tag || 'come-home',
    renotify: true,
    timestamp: Date.now(),
    data: { url: data.url || './' },
  })]));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || './', self.registration.scope).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ('focus' in c) {
          const hash = target.includes('#') ? target.slice(target.indexOf('#')) : '';
          if (hash) c.postMessage({ go: hash });
          return c.focus();
        }
      }
      return self.clients.openWindow(target);
    }),
  );
});
