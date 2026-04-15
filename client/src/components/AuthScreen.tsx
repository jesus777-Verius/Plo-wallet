import { useState } from 'react';
import { SecurityManager } from '../services/SecurityManager';

interface AuthScreenProps {
  security: SecurityManager;
  onLogin: (success: boolean, password?: string) => void;
  onSetupComplete: () => void;
}

export default function AuthScreen({ security, onLogin, onSetupComplete }: AuthScreenProps) {
  const [showSetup, setShowSetup] = useState(false);
  const [loginPassword, setLoginPassword] = useState('');
  const [setupPassword, setSetupPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [enableBiometric, setEnableBiometric] = useState(false);
  const [enableAutoLock, setEnableAutoLock] = useState(true);
  const [loginError, setLoginError] = useState('');
  const [setupPasswordError, setSetupPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

  const handleLogin = async () => {
    setLoginError('');
    
    if (!loginPassword) {
      setLoginError('Ingresa tu contraseña');
      return;
    }
    
    if (!security.passwordHash) {
      setLoginError('No hay configuración de seguridad. Configura primero.');
      return;
    }
    
    try {
      // Login directo sin loading wrapper para máxima velocidad
      const success = await security.login(loginPassword);
      
      if (success) {
        security.rememberSession();
        onLogin(true, loginPassword); // Pasar password para desencriptar
      }
    } catch (error: any) {
      setLoginError(error.message);
    }
  };

  const handleResetApp = () => {
    if (window.confirm('⚠️ ADVERTENCIA: Esto eliminará TODA tu información incluyendo tu wallet.\n\n¿Estás seguro de que quieres resetear la aplicación?')) {
      if (window.confirm('Esta acción NO se puede deshacer. ¿Continuar?')) {
        localStorage.clear();
        sessionStorage.clear();
        window.location.reload();
      }
    }
  };

  const handleSetupAuth = async () => {
    setSetupPasswordError('');
    setConfirmPasswordError('');
    
    if (!setupPassword || setupPassword.length < 8) {
      setSetupPasswordError('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    
    if (setupPassword !== confirmPassword) {
      setConfirmPasswordError('Las contraseñas no coinciden');
      return;
    }
    
    try {
      // Setup directo sin loading wrapper para máxima velocidad
      const success = security.setupAuth(setupPassword, {
        rememberSession: enableBiometric,
        autoLock: enableAutoLock
      });
      
      if (success) {
        onSetupComplete();
      }
    } catch (error: any) {
      setSetupPasswordError(error.message);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-container">
        <div className="logo">
          <img src="/favicon.svg" alt="Elyon" className="polygon-logo-img" />
          <h1>Elyon</h1>
          <p>Tu wallet personal segura para Polygon</p>
        </div>
        
        {!showSetup ? (
          <div className="auth-form">
            <h3>Acceder a tu Wallet</h3>
            <div className="input-group">
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                placeholder="Contraseña de acceso"
                className="auth-input"
              />
              {loginError && <div className="input-error show">{loginError}</div>}
            </div>
            <button onClick={handleLogin} className="auth-btn primary">
              <i className="fas fa-unlock"></i>
              Acceder
            </button>
            <button onClick={() => setShowSetup(true)} className="auth-btn secondary">
              <i className="fas fa-user-plus"></i>
              Registrar
            </button>
            
            {loginError && (
              <button onClick={handleResetApp} className="auth-btn danger" style={{ marginTop: '20px' }}>
                <i className="fas fa-exclamation-triangle"></i>
                ¿Olvidaste tu contraseña? Resetear App
              </button>
            )}
          </div>
        ) : (
          <div className="auth-form">
            <h3>Configurar Seguridad</h3>
            <div className="input-group">
              <label>Crear contraseña de acceso</label>
              <input
                type="password"
                value={setupPassword}
                onChange={(e) => setSetupPassword(e.target.value)}
                placeholder="Contraseña segura"
                className="auth-input"
              />
              {setupPasswordError && <div className="input-error show">{setupPasswordError}</div>}
            </div>
            <div className="input-group">
              <label>Confirmar contraseña</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSetupAuth()}
                placeholder="Repetir contraseña"
                className="auth-input"
              />
              {confirmPasswordError && <div className="input-error show">{confirmPasswordError}</div>}
            </div>
            <div className="security-options">
              <div className="option-item">
                <input
                  type="checkbox"
                  id="enableBiometric"
                  checked={enableBiometric}
                  onChange={(e) => setEnableBiometric(e.target.checked)}
                  className="option-checkbox"
                />
                <label htmlFor="enableBiometric">Recordar por 24 horas</label>
              </div>
              <div className="option-item">
                <input
                  type="checkbox"
                  id="enableAutoLock"
                  checked={enableAutoLock}
                  onChange={(e) => setEnableAutoLock(e.target.checked)}
                  className="option-checkbox"
                />
                <label htmlFor="enableAutoLock">Bloqueo automático (15 min)</label>
              </div>
            </div>
            <button onClick={handleSetupAuth} className="auth-btn primary">
              <i className="fas fa-shield-alt"></i>
              Configurar Seguridad
            </button>
            <button onClick={() => setShowSetup(false)} className="auth-btn secondary">
              <i className="fas fa-arrow-left"></i>
              Volver
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
