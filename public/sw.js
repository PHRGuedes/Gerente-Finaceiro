// Service Worker para PWA do Gerente Financeiro
const CACHE_NAME = 'gerente-financeiro-cache-v1'

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        )
      })
      .then(() => self.clients.claim())
  )
})

// O listener de 'fetch' é OBRIGATÓRIO pelo Google Chrome para liberar a compilação do WebAPK nativo
self.addEventListener('fetch', (event) => {
  // Ignora requisições não-GET ou esquemas não-HTTP (ex: chrome-extension)
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) {
    return
  }

  // Estratégia Network-First: garante dados em tempo real do banco Supabase
  event.respondWith(
    fetch(event.request).catch(async () => {
      const cachedResponse = await caches.match(event.request)
      if (cachedResponse) {
        return cachedResponse
      }
      return new Response('Sem conexão com a internet', {
        status: 503,
        statusText: 'Service Unavailable',
        headers: new Headers({ 'Content-Type': 'text/plain; charset=utf-8' }),
      })
    })
  )
})
