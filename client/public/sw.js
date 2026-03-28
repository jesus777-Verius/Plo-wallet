const CACHE_NAME = 'elyon-wallet-v2-secure';
const CACHE_VERSION = '2.0.0';
const urlsToCache = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/matic-logo.png',
  '/manifest.json'
];

// URLs que nunca deben ser cacheadas (datos sensibles)
const NEVER_CACHE = [
  '/api/',
  'chrome-extension://',
  'moz-extension://',
  'safari-extension://'
];

// Dominios permitidos para requests
const ALLOWED_DOMAINS = [
  'polygon-rpc.com',
  'rpc-mainnet.matic.network',
  'matic-mainnet.chainstacklabs.com',
  'rpc-mainnet.maticvigil.com',
  'polygon-bor-rpc.publicnode.com',
  'api.ipify.org',
  'cdnjs.cloudflare.com'
];

// Instalación del Service Worker
self.addEventListener('install', (event) => {
  console.log('SW instalando versión:', CACHE_VERSION);
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache abierto:', CACHE_NAME);
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('Error durante la instalación del SW:', error);
      })
  );
  
  // Forzar activación inmediata
  self.skipWaiting();
});

// Activación del Service Worker
self.addEventListener('activate', (event) => {
  console.log('SW activando versión:', CACHE_VERSION);
  
  event.waitUntil(
    Promise.all([
      // Limpiar caches antiguos
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('Eliminando cache antiguo:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      
      // Tomar control de todos los clientes
      self.clients.claim()
    ])
  );
  
  // Notificar a los clientes sobre la actualización
  self.clients.matchAll().then((clients) => {
    clients.forEach((client) => {
      client.postMessage({
        type: 'CACHE_UPDATED',
        version: CACHE_VERSION
      });
    });
  });
});

// Validar si una URL debe ser cacheada
function shouldCache(url) {
  try {
    const urlObj = new URL(url);
    
    // No cachear URLs sensibles
    for (const pattern of NEVER_CACHE) {
      if (url.includes(pattern)) {
        return false;
      }
    }
    
    // Solo cachear recursos de nuestro dominio o dominios permitidos
    if (urlObj.origin === self.location.origin) {
      return true;
    }
    
    return ALLOWED_DOMAINS.some(domain => urlObj.hostname.includes(domain));
  } catch (error) {
    console.error('Error validando URL para cache:', error);
    return false;
  }
}

// Validar si un request es seguro
function isSecureRequest(request) {
  try {
    const url = new URL(request.url);
    
    // Solo HTTPS (excepto localhost en desarrollo)
    if (url.protocol !== 'https:' && !url.hostname.includes('localhost') && !url.hostname.includes('127.0.0.1')) {
      return false;
    }
    
    // Verificar dominios permitidos para requests externos
    if (url.origin !== self.location.origin) {
      return ALLOWED_DOMAINS.some(domain => url.hostname.includes(domain));
    }
    
    return true;
  } catch (error) {
    console.error('Error validando request:', error);
    return false;
  }
}

// Estrategia de cache segura
self.addEventListener('fetch', (event) => {
  // Solo manejar requests seguros
  if (!isSecureRequest(event.request)) {
    console.warn('Request bloqueado por seguridad:', event.request.url);
    return;
  }
  
  // Para requests de navegación, siempre ir a la red primero
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          // Fallback a index.html para SPA
          return caches.match('/index.html');
        })
    );
    return;
  }
  
  // Para otros recursos, usar estrategia Network First con validaciones
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Validar respuesta antes de cachear
        if (response && response.status === 200 && response.type === 'basic') {
          // Solo cachear si es seguro hacerlo
          if (shouldCache(event.request.url)) {
            const responseToCache = response.clone();
            
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            }).catch((error) => {
              console.error('Error guardando en cache:', error);
            });
          }
        }
        
        return response;
      })
      .catch((error) => {
        console.log('Network failed, trying cache:', event.request.url);
        
        // Fallback a cache solo para recursos seguros
        if (shouldCache(event.request.url)) {
          return caches.match(event.request);
        }
        
        // Para requests que fallan y no están en cache, retornar error
        throw error;
      })
  );
});

// Manejar mensajes del cliente
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({
      version: CACHE_VERSION,
      cacheName: CACHE_NAME
    });
  }
});

// Manejar errores del SW
self.addEventListener('error', (event) => {
  console.error('Error en Service Worker:', event.error);
});

// Manejar errores no capturados
self.addEventListener('unhandledrejection', (event) => {
  console.error('Promise rechazada en SW:', event.reason);
  event.preventDefault();
});

// Limpiar cache periódicamente (cada 24 horas)
self.addEventListener('sync', (event) => {
  if (event.tag === 'cleanup-cache') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }
          })
        );
      })
    );
  }
});

console.log('Service Worker cargado - Versión:', CACHE_VERSION);
