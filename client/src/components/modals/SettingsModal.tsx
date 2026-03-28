import { useState, useEffect } from 'react';
import packageJson from '../../../package.json';

interface SettingsModalProps {
  wallet: any;
  onClose: () => void;
}

export default function SettingsModal({ wallet, onClose }: SettingsModalProps) {
  const [network, setNetwork] = useState<string>('Verificando...');
  const [chainId, setChainId] = useState<number | null>(null);
  const [securityStatus, setSecurityStatus] = useState<string>('Verificando...');

  useEffect(() => {
    checkNetwork();
    checkSecurity();
  }, []);

  const checkNetwork = async () => {
    try {
      const { getPolygonProvider } = await import('../../config/rpc');
      const provider = await getPolygonProvider();
      const network = await provider.getNetwork();
      
      setChainId(Number(network.chainId));
      
      if (network.chainId === 137n) {
        setNetwork('Polygon Mainnet');
      } else if (network.chainId === 80002n) {
        setNetwork('Polygon Amoy Testnet');
      } else {
        setNetwork(`Chain ID: ${network.chainId}`);
      }
    } catch (error) {
      setNetwork('Error al conectar');
    }
  };

  const checkSecurity = () => {
    const hasAuth = localStorage.getItem('pol_wallet_auth');
    const hasEncryption = localStorage.getItem('pol_wallet_password_set');
    const settings = localStorage.getItem('pol_security_settings');
    
    if (hasAuth && hasEncryption) {
      const secSettings = settings ? JSON.parse(settings) : null;
      const features = [];
      
      if (secSettings?.autoLock) features.push('Auto-lock');
      if (secSettings?.rememberSession) features.push('Sesión persistente');
      
      setSecurityStatus(features.length > 0 ? `Protegido (${features.join(', ')})` : 'Protegido');
    } else if (hasEncryption) {
      setSecurityStatus('Encriptado');
    } else {
      setSecurityStatus('Sin protección');
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-container">
        <div className="modal-header">
          <h3>Configuración</h3>
          <button onClick={onClose} className="modal-close">
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="modal-body">
          <div className="settings-section">
            <div className="setting-item">
              <div className="setting-label">
                <i className="fas fa-wallet"></i>
                Wallet Address
              </div>
              <div className="setting-value">{wallet.address}</div>
            </div>
            <div className="setting-item">
              <div className="setting-label">
                <i className="fas fa-network-wired"></i>
                Red
              </div>
              <div className="setting-value">
                {network}
                {chainId && <span style={{ fontSize: '0.85em', opacity: 0.7 }}> (ID: {chainId})</span>}
              </div>
            </div>
            <div className="setting-item">
              <div className="setting-label">
                <i className="fas fa-code-branch"></i>
                Versión
              </div>
              <div className="setting-value">{packageJson.version}</div>
            </div>
            <div className="setting-item">
              <div className="setting-label">
                <i className="fas fa-shield-alt"></i>
                Estado de Seguridad
              </div>
              <div className="setting-value security-status">{securityStatus}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
