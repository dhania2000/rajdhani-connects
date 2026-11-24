// Service worker for the installable contractor app ("Add shortcut" / Add to Home Screen).
// It caches nothing: every request goes to the network, so data is always live.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))
