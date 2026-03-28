import { useState, useEffect } from 'react';
import { SecurityManager } from '../../services/SecurityManager';

interface SecurityModalProps {
  wallet: any;
  onClose: () => void;
  onLogout: () => void;
  onMessage: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

export default function SecurityModal({ wallet, onClose, onLogout, onMessage }: SecurityModalProps) {
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [showMnemonic, setShowMnemonic] = useState(false);
  const [autoLock, setAutoLock] = useState(true);
  const [rememberSession, setRememberSession] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    loadSecuritySettings();
  }, []);

  const loadSecuritySettings = () => {
    const settings = localStorage.getItem('pol_security_settings');
    if (settings) {
      const parsed = JSON.parse(settings);
      setAutoLock(parsed.autoLock ?? true);
      setRememberSession(parsed.rememberSession ?? false);
    }
  };

  const exportPrivateKey = () => {
    if (!wallet || !wallet.privateKey) {
      onMessage('No hay private key disponible', 'error');
      return;
    }
    setShowPrivateKey(true);
  };

  const copyPrivateKey = () => {
    if (!wallet || !wallet.privateKey) return;
    
    navigator.clipboard.writeText(wallet.privateKey).then(() => {
      onMessage('Private key copiada al portapapeles', 'success');
    }).catch(() => {
      onMessage('Error copiando private key', 'error');
    });
  };

  const exportMnemonic = () => {
    const walletData = localStorage.getItem('pol_wallet_data');
    if (!walletData) {
      onMessage('No hay datos de wallet', 'error');
      return;
    }

    const parsed = JSON.parse(walletData);
    if (!parsed.hasMnemonic) {
      onMessage('Esta wallet no tiene frase de recuperación (fue importada por private key)', 'warning');
      return;
    }

    setShowMnemonic(true);
  };

  const copyMnemonic = () => {
    if (!wallet || !wallet.mnemonic) return;
    
    navigator.clipboard.writeText(wallet.mnemonic).then(() => {
      onMessage('Frase de recuperación copiada al portapapeles', 'success');
    }).catch(() => {
      onMessage('Error copiando frase', 'error');
    });
  };

  const toggleAutoLock = (enabled: boolean) => {
    setAutoLock(enabled);
    const settings = localStorage.getItem('pol_security_settings');
    const parsed = settings ? JSON.parse(settings) : {};
    parsed.autoLock = enabled;
    localStorage.setItem('pol_security_settings', JSON.stringify(parsed));
    onMessage(`Auto-bloqueo ${enabled ? 'activado' : 'desactivado'}`, 'success');
  };

  const toggleRememberSession = (enabled: boolean) => {
    setRememberSession(enabled);
    const settings = localStorage.getItem('pol_security_settings');
    const parsed = settings ? JSON.parse(settings) : {};
    parsed.rememberSession = enabled;
    localStorage.setItem('pol_security_settings', JSON.stringify(parsed));
    
    if (!enabled) {
      localStorage.removeItem('pol_remember_session');
    }
    
    onMessage(`Recordar sesión ${enabled ? 'activado' : 'desactivado'}`, 'success');
  };

  const handleChangePassword = () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      onMessage('Completa todos los campos', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      onMessage('Las contraseñas nuevas no coinciden', 'error');
      return;
    }

    if (newPassword.length < 8) {
      onMessage('La nueva contraseña debe tener al menos 8 caracteres', 'error');
      return;
    }

    try {
      const securityManager = new SecurityManager();
      const success = securityManager.changePassword(oldPassword, newPassword);
      
      if (success) {
        onMessage('Contraseña cambiada exitosamente. Inicia sesión nuevamente.', 'success');
        setShowChangePassword(false);
        setTimeout(onLogout, 2000);
      }
    } catch (error: any) {
      onMessage(error.message || 'Error cambiando contraseña', 'error');
    }
  };

  const resetWallet = () => {
    const confirmation = window.confirm(
      '⚠️ ADVERTENCIA: Esto eliminará PERMANENTEMENTE tu wallet y todas las configuraciones.\n\n' +
      'Asegúrate de tener respaldo de tu private key.\n\n' +
      '¿Estás seguro de continuar?'
    );
    
    if (confirmation) {
      const securityManager = new SecurityManager();
      securityManager.reset();
      onMessage('Wallet reseteada completamente', 'info');
      setTimeout(() => window.location.reload(), 1000);
    }
  };

  return (
    <>
      <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="modal-container">
          <div className="modal-header">
            <h3>Centro de Seguridad</h3>
            <button onClick={onClose} className="modal-close">
              <i className="fas fa-times"></i>
            </button>
          </div>
          <div className="modal-body">
            <div className="security-section">
              <div className="security-item">
                <div className="security-info">
                  <i className="fas fa-key"></i>
                  <div>
                    <div className="security-title">Private Key</div>
                    <div className="security-desc">Ver y copiar tu private key</div>
                  </div>
                </div>
                <button onClick={exportPrivateKey} className="security-btn">
                  <i className="fas fa-eye"></i>
                </button>
              </div>
              <div className="security-item">
                <div className="security-info">
                  <i className="fas fa-seedling"></i>
                  <div>
                    <div className="security-title">Frase de Recuperación</div>
                    <div className="security-desc">Ver tu seed phrase (12 palabras)</div>
                  </div>
                </div>
                <button onClick={exportMnemonic} className="security-btn">
                  <i className="fas fa-eye"></i>
                </button>
              </div>
              <div className="security-item">
                <div className="security-info">
                  <i className="fas fa-lock"></i>
                  <div>
                    <div className="security-title">Cambiar Contraseña</div>
                    <div className="security-desc">Actualizar contraseña de acceso</div>
                  </div>
                </div>
                <button onClick={() => setShowChangePassword(true)} className="security-btn">
                  <i className="fas fa-edit"></i>
                </button>
              </div>
              <div className="security-item">
                <div className="security-info">
                  <i className="fas fa-clock"></i>
                  <div>
                    <div className="security-title">Auto-bloqueo</div>
                    <div className="security-desc">Bloqueo automático en 15 min</div>
                  </div>
                </div>
                <div className="security-toggle">
                  <input
                    type="checkbox"
                    id="autoLockToggle"
                    checked={autoLock}
                    onChange={(e) => toggleAutoLock(e.target.checked)}
                    className="toggle-checkbox"
                  />
                  <label htmlFor="autoLockToggle" className="toggle-label"></label>
                </div>
              </div>
              <div className="security-item">
                <div className="security-info">
                  <i className="fas fa-history"></i>
                  <div>
                    <div className="security-title">Recordar Sesión</div>
                    <div className="security-desc">Mantener sesión por 24h</div>
                  </div>
                </div>
                <div className="security-toggle">
                  <input
                    type="checkbox"
                    id="rememberToggle"
                    checked={rememberSession}
                    onChange={(e) => toggleRememberSession(e.target.checked)}
                    className="toggle-checkbox"
                  />
                  <label htmlFor="rememberToggle" className="toggle-label"></label>
                </div>
              </div>
            </div>
            <div className="security-actions">
              <button onClick={onLogout} className="modal-btn secondary">
                <i className="fas fa-lock"></i>
                Bloquear Ahora
              </button>
              <button onClick={resetWallet} className="modal-btn danger">
                <i className="fas fa-trash"></i>
                Reset Completo
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Private Key Modal */}
      {showPrivateKey && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowPrivateKey(false)}>
          <div className="modal-container">
            <div className="modal-header">
              <h3>Private Key</h3>
              <button onClick={() => setShowPrivateKey(false)} className="modal-close">
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <div className="warning-box">
                <i className="fas fa-exclamation-triangle"></i>
                <p>¡NUNCA compartas tu private key! Quien la tenga puede acceder a todos tus fondos.</p>
              </div>
              <div className="private-key-display">
                <div className="private-key-text">{wallet.privateKey}</div>
                <button onClick={copyPrivateKey} className="copy-btn">
                  <i className="fas fa-copy"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mnemonic/Seed Phrase Modal */}
      {showMnemonic && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowMnemonic(false)}>
          <div className="modal-container">
            <div className="modal-header">
              <h3>Frase de Recuperación</h3>
              <button onClick={() => setShowMnemonic(false)} className="modal-close">
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <div className="warning-box">
                <i className="fas fa-exclamation-triangle"></i>
                <p>¡NUNCA compartas tu frase de recuperación! Con estas 12 palabras cualquiera puede acceder a tu wallet.</p>
              </div>
              {wallet.mnemonic ? (
                <>
                  <div className="mnemonic-grid" style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(3, 1fr)', 
                    gap: '10px', 
                    margin: '20px 0' 
                  }}>
                    {wallet.mnemonic.split(' ').map((word: string, index: number) => (
                      <div key={index} style={{
                        padding: '10px',
                        background: '#2a2d3a',
                        borderRadius: '8px',
                        textAlign: 'center',
                        fontSize: '14px'
                      }}>
                        <span style={{ color: '#888', fontSize: '12px' }}>{index + 1}. </span>
                        <span style={{ color: '#fff' }}>{word}</span>
                      </div>
                    ))}
                  </div>
                  <button onClick={copyMnemonic} className="modal-btn primary" style={{ width: '100%' }}>
                    <i className="fas fa-copy"></i>
                    Copiar Frase Completa
                  </button>
                </>
              ) : (
                <p style={{ textAlign: 'center', color: '#888', padding: '20px' }}>
                  No hay frase de recuperación disponible
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showChangePassword && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowChangePassword(false)}>
          <div className="modal-container">
            <div className="modal-header">
              <h3>Cambiar Contraseña</h3>
              <button onClick={() => setShowChangePassword(false)} className="modal-close">
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <div className="input-group">
                <label>Contraseña Actual</label>
                <input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="Contraseña actual"
                  className="modal-input"
                  autoFocus
                />
              </div>
              <div className="input-group">
                <label>Nueva Contraseña (mínimo 8 caracteres)</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Nueva contraseña"
                  className="modal-input"
                />
              </div>
              <div className="input-group">
                <label>Confirmar Nueva Contraseña</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleChangePassword()}
                  placeholder="Confirmar contraseña"
                  className="modal-input"
                />
              </div>
              <div className="modal-actions">
                <button
                  onClick={handleChangePassword}
                  className="modal-btn primary"
                  disabled={!oldPassword || !newPassword || !confirmPassword}
                >
                  <i className="fas fa-check"></i>
                  Cambiar Contraseña
                </button>
                <button
                  onClick={() => {
                    setShowChangePassword(false);
                    setOldPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                  className="modal-btn secondary"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
