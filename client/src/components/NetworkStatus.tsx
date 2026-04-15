import { useState, useEffect } from 'react';
import { getNodeInfo } from '../config/rpc';

export default function NetworkStatus() {
  const [status, setStatus] = useState({
    connected: false,
    blockNumber: 0,
    gasPrice: '0'
  });
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Actualizar info del nodo cada 10 segundos
    const updateStatus = async () => {
      const info = await getNodeInfo();
      setStatus({
        connected: info.connected,
        blockNumber: info.blockNumber,
        gasPrice: info.gasPrice
      });
    };

    updateStatus();
    const interval = setInterval(updateStatus, 10000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="network-status">
      <div 
        className="status-indicator"
        onClick={() => setShowDetails(!showDetails)}
        title="Estado de la red"
      >
        <div className={`status-dot ${status.connected ? 'connected' : 'disconnected'}`}></div>
        <span className="status-text">
          {status.connected ? 'Polygon' : 'Desconectado'}
        </span>
      </div>
      
      {showDetails && status.connected && (
        <div className="status-details">
          <div className="status-detail-item">
            <i className="fas fa-cube"></i>
            <span>Bloque: {status.blockNumber.toLocaleString()}</span>
          </div>
          <div className="status-detail-item">
            <i className="fas fa-gas-pump"></i>
            <span>Gas: {parseFloat(status.gasPrice).toFixed(2)} Gwei</span>
          </div>
          <div className="status-detail-item">
            <i className="fas fa-link"></i>
            <span>Tiempo real activo</span>
          </div>
        </div>
      )}
    </div>
  );
}
