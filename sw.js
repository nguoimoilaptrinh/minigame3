// Service worker Hội Quán Party Game v4.0 — Tối ưu hóa hoàn toàn cho Shell, Media & Audio Range requests.
const SHELL_CACHE = 'hoiquan-shell-v4.0-6';
const MEDIA_CACHE = 'hoiquan-media-v4.0-1';
const MAX_MEDIA_ENTRIES = 120;

const PRECACHE = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/base.css',
  'css/home-lobby.css',
  'css/host-stage.css',
  'css/mobile-play.css',
  'css/styles.css',
  'css/ww-views.css',
  'css/leaderboard.css',
  'js/vendor/mqtt.min.js',
  'js/vendor/peerjs.min.js',
  'js/vendor/qrcode.js',
  'js/data-roles.js',
  'js/data-spy.js',
  'js/data-stories.js',
  'js/data.js',
  'js/audio-voicepack.js',
  'js/audio.js',
  'js/network.js',
  'js/fx.js',
  'js/fx-mobile.js',
  'js/stats-awards.js',
  'js/ww-views.js',
  'js/ww-engine.js',
  'js/ww-host-ui.js',
  'js/ww-player-ui.js',
  'js/werewolf.js',
  'js/spy.js',
  'js/app.js',
  'assets/icons/icon-192.png'
];

const SWR_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];
const NETWORK_TIMEOUT = 3500;

// Giới hạn số lượng entry trong MEDIA_CACHE
async function trimMediaCache() {
  try {
    const cache = await caches.open(MEDIA_CACHE);
    const keys = await cache.keys();
    if (keys.length > MAX_MEDIA_ENTRIES) {
      const excess = keys.length - MAX_MEDIA_ENTRIES;
      for (let i = 0; i < excess; i++) {
        await cache.delete(keys[i]);
      }
    }
  } catch (err) {
    // Bỏ qua lỗi dọn dẹp cache
  }
}

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
      Promise.all(PRECACHE.map((url) => cache.add(new Request(url)).catch(() => {})))
    )
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== SHELL_CACHE && k !== MEDIA_CACHE)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

function putInShellCache(request, response) {
  if (!response || !(response.ok || response.type === 'opaque')) return;
  const copy = response.clone();
  caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
}

function putInMediaCache(request, response) {
  if (!response || response.status !== 200 || !response.ok) return Promise.resolve();
  const copy = response.clone();
  return caches.open(MEDIA_CACHE).then(async (cache) => {
    await cache.put(request, copy);
    await trimMediaCache();
  }).catch(() => {});
}

function networkFirst(request, isNavigation) {
  return new Promise((resolve) => {
    let settled = false;
    const fallback = () =>
      caches
        .match(request, { ignoreSearch: true })
        .then((hit) => hit || (isNavigation ? caches.match('index.html', { ignoreSearch: true }) : null))
        .then((hit) => hit || caches.match('./', { ignoreSearch: true }));
    const finishWithCache = () => {
      if (settled) return;
      fallback().then((hit) => {
        if (settled) return;
        if (hit) {
          settled = true;
          resolve(hit);
        }
      });
    };
    const timer = setTimeout(finishWithCache, NETWORK_TIMEOUT);
    fetch(request, { cache: 'no-cache' })
      .then((res) => {
        clearTimeout(timer);
        if (settled) {
          putInShellCache(request, res);
          return;
        }
        settled = true;
        putInShellCache(request, res);
        resolve(res);
      })
      .catch(() => {
        clearTimeout(timer);
        if (settled) return;
        fallback().then((hit) => {
          if (settled) return;
          settled = true;
          resolve(hit || Response.error());
        });
      });
  });
}

// Pure cacheFirst cho ảnh (không gọi fetch ngầm)
async function handleImageRequest(request) {
  let cached = await caches.match(request, { ignoreSearch: true, cacheName: MEDIA_CACHE });
  if (!cached) {
    cached = await caches.match(request, { ignoreSearch: true });
  }
  if (cached) {
    return cached;
  }
  try {
    const res = await fetch(request);
    if (res && res.ok && res.status === 200) {
      await putInMediaCache(request, res);
    }
    return res;
  } catch (err) {
    return Response.error();
  }
}

// Xử lý request âm thanh hỗ trợ Range requests (206 Partial Content)
async function handleAudioRequest(request, event) {
  const url = new URL(request.url);
  const cacheKey = new Request(url.href);
  const rangeHeader = request.headers.get('range');

  let cached = await caches.match(cacheKey, { ignoreSearch: true, cacheName: MEDIA_CACHE });
  if (!cached) {
    cached = await caches.match(cacheKey, { ignoreSearch: true });
  }

  if (cached && cached.status === 200) {
    if (rangeHeader) {
      try {
        const buf = await cached.arrayBuffer();
        const totalSize = buf.byteLength;
        let start = 0;
        let end = totalSize - 1;

        const parts = rangeHeader.replace(/bytes=/, '').split('-');
        if (parts[0] === '' && parts[1] !== '') {
          const suffixLen = parseInt(parts[1], 10);
          start = Math.max(0, totalSize - suffixLen);
          end = totalSize - 1;
        } else {
          if (parts[0] !== '') {
            start = parseInt(parts[0], 10);
          }
          if (parts[1] !== '') {
            end = parseInt(parts[1], 10);
          }
        }

        if (isNaN(start)) start = 0;
        if (isNaN(end) || end >= totalSize) end = totalSize - 1;

        if (start > end || start >= totalSize) {
          return new Response(null, {
            status: 416,
            statusText: 'Range Not Satisfiable',
            headers: { 'Content-Range': 'bytes */' + totalSize }
          });
        }

        const slice = buf.slice(start, end + 1);
        return new Response(slice, {
          status: 206,
          statusText: 'Partial Content',
          headers: {
            'Content-Type': cached.headers.get('Content-Type') || 'audio/mpeg',
            'Accept-Ranges': 'bytes',
            'Content-Range': `bytes ${start}-${end}/${totalSize}`,
            'Content-Length': String(slice.byteLength)
          }
        });
      } catch (err) {
        return cached;
      }
    } else {
      return cached;
    }
  }

  // Chưa có trong cache
  if (rangeHeader) {
    event.waitUntil(
      fetch(url.href).then((res) => {
        if (res && res.ok && res.status === 200) {
          return putInMediaCache(cacheKey, res);
        }
      }).catch(() => {})
    );
    try {
      return await fetch(request);
    } catch (err) {
      return Response.error();
    }
  } else {
    try {
      const res = await fetch(request);
      if (res && res.ok && res.status === 200) {
        await putInMediaCache(cacheKey, res);
      }
      return res;
    } catch (err) {
      return Response.error();
    }
  }
}

async function staleWhileRevalidate(request) {
  const hit = await caches.match(request);
  const refresh = fetch(request)
    .then((res) => {
      if (res && (res.ok || res.type === 'opaque')) {
        const copy = res.clone();
        caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
      }
      return res;
    })
    .catch(() => null);
  return hit || (await refresh) || Response.error();
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  if (url.origin === self.location.origin) {
    const isNav = request.mode === 'navigate';
    if (
      isNav ||
      /\.(html|js|css|webmanifest)$/i.test(url.pathname) ||
      /\/assets\/voices\/manifest\.json$/i.test(url.pathname) ||
      url.pathname.endsWith('/')
    ) {
      event.respondWith(networkFirst(request, isNav));
      return;
    }
    if (request.destination === 'image' || /\.(png|jpe?g|webp|gif|svg|ico)$/i.test(url.pathname)) {
      event.respondWith(handleImageRequest(request));
      return;
    }
    if (request.destination === 'audio' || /\.(mp3|webm|ogg|wav)$/i.test(url.pathname)) {
      event.respondWith(handleAudioRequest(request, event));
      return;
    }
    return;
  }

  if (SWR_HOSTS.includes(url.hostname)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});
