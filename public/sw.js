/**
 * ============================================================================
 *  Service Worker — Sistema Eléctrico Futuro v2
 * ============================================================================
 *  Estrategia: cache-first para assets estáticos, network-first para APIs.
 *  Los nombres de assets se resuelven dinámicamente (no rutas fijas).
 * ============================================================================
 */

const CACHE_NAME = 'sef-v2-v3';
const API_CACHE = 'sef-v2-api-v1';

// ─── Instalación: toma el control inmediatamente ────────────────────────────

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// ─── Activación: limpia caches antiguas ────────────────────────────────────

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME && k !== API_CACHE)
          .map((k) => caches.delete(k)),
      ),
    ).then(() => self.clients.claim()),
  );
});

// ─── Fetch: estrategia según tipo de recurso ────────────────────────────────

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // ── APIs externas (Open-Meteo): network-first ──
  if (url.hostname.includes('open-meteo.com')) {
    event.respondWith(networkFirst(event.request, API_CACHE));
    return;
  }

  // ── Solo cachear recursos del mismo origen ──
  if (url.origin !== self.location.origin) {
    event.respondWith(fetch(event.request));
    return;
  }

  // ── Assets estáticos (JS, CSS, HTML, fonts): cache-first ──
  event.respondWith(cacheFirst(event.request));
});

// ─── Estrategias de cache ──────────────────────────────────────────────────

/**
 * Cache-first: sirve desde cache si existe, si no fetch + guardar.
 */
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // Si falla la red y no hay cache, devolver error
    return new Response('Offline', { status: 503 });
  }
}

/**
 * Network-first: intenta fetch, si falla usa cache.
 */
async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response('Offline', { status: 503 });
  }
}