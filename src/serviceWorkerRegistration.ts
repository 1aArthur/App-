export function registerServiceWorker() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('[Velocity Runner] Offline Service Worker registrado com sucesso:', reg.scope);
        })
        .catch((err) => {
          console.warn('[Velocity Runner] Falha ao registrar Service Worker (modo local/preview):', err);
        });
    });
  }
}
