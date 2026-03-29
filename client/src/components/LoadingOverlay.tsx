import { useEffect, useState } from 'react';

interface LoadingOverlayProps {
  show: boolean;
  message?: string;
  progress?: number;
  timeout?: number;
}

export default function LoadingOverlay({ 
  show, 
  message = 'Cargando...', 
  progress,
  timeout = 30000 // 30 segundos timeout por defecto
}: LoadingOverlayProps) {
  const [dots, setDots] = useState('');
  const [timeoutReached, setTimeoutReached] = useState(false);

  useEffect(() => {
    if (!show) {
      setTimeoutReached(false);
      return;
    }

    // Animación de puntos
    const dotsInterval = setInterval(() => {
      setDots(prev => {
        if (prev === '...') return '';
        return prev + '.';
      });
    }, 500);

    // Timeout de seguridad
    const timeoutTimer = setTimeout(() => {
      setTimeoutReached(true);
    }, timeout);

    return () => {
      clearInterval(dotsInterval);
      clearTimeout(timeoutTimer);
    };
  }, [show, timeout]);

  if (!show) return null;

  return (
    <div className="loading-overlay">
      <div className="loading-container">
        <div className="loading-spinner">
          <div className="spinner-ring"></div>
          <div className="spinner-ring"></div>
          <div className="spinner-ring"></div>
        </div>
        
        <div className="loading-content">
          <h3 className="loading-message">
            {timeoutReached ? 'Procesando...' : message}{dots}
          </h3>
          
          {progress !== undefined && (
            <div className="loading-progress">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                ></div>
              </div>
              <span className="progress-text">{Math.round(progress)}%</span>
            </div>
          )}
          
          {timeoutReached && (
            <p className="loading-timeout">
              <i className="fas fa-clock"></i>
              La operación está tomando más tiempo del esperado...
            </p>
          )}
        </div>
      </div>
    </div>
  );
}