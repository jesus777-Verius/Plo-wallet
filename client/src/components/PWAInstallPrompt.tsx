import { useState, useEffect } from 'react';

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Mostrar prompt solo si no se ha instalado antes
      const hasInstalled = localStorage.getItem('pwa_installed');
      if (!hasInstalled) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Detectar si ya está instalado
    if (window.matchMedia('(display-mode: standalone)').matches) {
      localStorage.setItem('pwa_installed', 'true');
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      localStorage.setItem('pwa_installed', 'true');
    }

    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Recordar que el usuario rechazó por esta sesión
    sessionStorage.setItem('pwa_dismissed', 'true');
  };

  if (!showPrompt || sessionStorage.getItem('pwa_dismissed')) {
    return null;
  }

  return (
    <div className="pwa-install-prompt">
      <i className="fas fa-mobile-alt"></i>
      <div className="content">
        <h4>Instalar Elyon</h4>
        <p>Accede más rápido desde tu pantalla de inicio</p>
      </div>
      <button onClick={handleInstall}>
        Instalar
      </button>
      <button className="close-btn" onClick={handleDismiss}>
        <i className="fas fa-times"></i>
      </button>
    </div>
  );
}
