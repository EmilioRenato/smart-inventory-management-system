// client/src/serviceWorkerRegistration.js

export function register() {
  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .catch(err => console.log('Service Worker error:', err));
    });
  }
}