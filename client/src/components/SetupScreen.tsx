import { useState } from 'react';
import { ethers } from 'ethers';
import { EncryptionService } from '../services/EncryptionService';

interface SetupScreenProps {
  onWalletCreated: (wallet: any) => void;
}

export default function SetupScreen({ onWalletCreated }: SetupScreenProps) {
  const [showImport, setShowImport] = useState(false);
  const [importType, setImportType] = useState<'privateKey' | 'mnemonic'>('privateKey');
  const [privateKeyInput, setPrivateKeyInput] = useState('');
  const [mnemonicInput, setMnemonicInput] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [pendingWallet, setPendingWallet] = useState<any>(null);

  const createWallet = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Crear wallet localmente en el navegador (como MetaMask)
      const wallet = ethers.Wallet.createRandom();
      
      const walletData = {
        address: wallet.address,
        privateKey: wallet.privateKey,
        mnemonic: wallet.mnemonic?.phrase || null
      };
      
      // Mostrar prompt para encriptar
      setPendingWallet(walletData);
      setShowPasswordPrompt(true);
    } catch (err: any) {
      setError(`Error creando wallet: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const importWallet = async () => {
    if (importType === 'privateKey') {
      if (!privateKeyInput.trim()) {
        setError('Por favor ingresa una private key');
        return;
      }
      
      setLoading(true);
      setError('');
      
      try {
        // Validar e importar wallet localmente
        const wallet = new ethers.Wallet(privateKeyInput);
        
        const walletData = {
          address: wallet.address,
          privateKey: wallet.privateKey,
          mnemonic: null
        };
        
        // Mostrar prompt para encriptar
        setPendingWallet(walletData);
        setShowPasswordPrompt(true);
      } catch (err: any) {
        setError(`Error importando wallet: ${err.message}`);
      } finally {
        setLoading(false);
      }
    } else {
      // Importar por mnemonic
      if (!mnemonicInput.trim()) {
        setError('Por favor ingresa tu frase de recuperación');
        return;
      }
      
      setLoading(true);
      setError('');
      
      try {
        // Validar e importar wallet desde mnemonic
        const wallet = ethers.Wallet.fromPhrase(mnemonicInput.trim());
        
        const walletData = {
          address: wallet.address,
          privateKey: wallet.privateKey,
          mnemonic: wallet.mnemonic?.phrase || null
        };
        
        // Mostrar prompt para encriptar
        setPendingWallet(walletData);
        setShowPasswordPrompt(true);
      } catch (err: any) {
        setError(`Error importando wallet: ${err.message}. Verifica que la frase sea correcta.`);
      } finally {
        setLoading(false);
      }
    }
  };

  const saveEncryptedWallet = () => {
    if (!password || password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    
    if (!pendingWallet) return;
    
    try {
      // Encriptar private key con AES-256
      const encryptedPrivateKey = EncryptionService.encryptPrivateKey(
        pendingWallet.privateKey,
        password
      );
      
      // Encriptar mnemonic si existe
      const encryptedMnemonic = pendingWallet.mnemonic 
        ? EncryptionService.encryptPrivateKey(pendingWallet.mnemonic, password)
        : null;
      
      const secureWallet = {
        address: pendingWallet.address,
        encryptedPrivateKey: encryptedPrivateKey,
        encryptedMnemonic: encryptedMnemonic,
        hasMnemonic: !!pendingWallet.mnemonic
      };
      
      // Guardar wallet encriptada SOLO en localStorage del usuario (autocustodia)
      localStorage.setItem('pol_wallet_data', JSON.stringify(secureWallet));
      localStorage.setItem('pol_wallet_password_set', 'true');
      
      // Pasar wallet con private key desencriptada temporalmente para uso inmediato
      onWalletCreated({
        ...secureWallet,
        privateKey: pendingWallet.privateKey,
        mnemonic: pendingWallet.mnemonic
      });
      
      setShowPasswordPrompt(false);
      setPendingWallet(null);
      setPassword('');
    } catch (err: any) {
      setError(`Error guardando wallet: ${err.message}`);
    }
  };

  return (
    <>
      <div className="setup-screen">
        <div className="setup-container">
          <div className="logo">
            <img src="/favicon.svg" alt="Elyon" className="polygon-logo-img" />
            <h1>Elyon</h1>
            <p>Tu wallet personal para Polygon</p>
          </div>
          
          {error && (
            <div className="warning-box" style={{ marginBottom: '20px' }}>
              <i className="fas fa-exclamation-triangle"></i>
              <p>{error}</p>
            </div>
          )}
          
          <div className="setup-actions">
            <button 
              onClick={createWallet} 
              className={`setup-btn primary ${loading ? 'btn-loading' : ''}`}
              disabled={loading || showPasswordPrompt}
            >
              <i className="fas fa-plus"></i>
              Crear Nueva Wallet
            </button>
            
            <button 
              onClick={() => setShowImport(!showImport)} 
              className="setup-btn secondary"
              disabled={loading || showPasswordPrompt}
            >
              <i className="fas fa-download"></i>
              Importar Wallet
            </button>
          </div>

          {showImport && !showPasswordPrompt && (
            <div className="import-form">
              <div className="import-tabs" style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                <button
                  onClick={() => setImportType('privateKey')}
                  className={`setup-btn ${importType === 'privateKey' ? 'primary' : 'secondary'}`}
                  style={{ flex: 1 }}
                >
                  Private Key
                </button>
                <button
                  onClick={() => setImportType('mnemonic')}
                  className={`setup-btn ${importType === 'mnemonic' ? 'primary' : 'secondary'}`}
                  style={{ flex: 1 }}
                >
                  Frase de Recuperación
                </button>
              </div>
              
              {importType === 'privateKey' ? (
                <input
                  type="password"
                  value={privateKeyInput}
                  onChange={(e) => setPrivateKeyInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && importWallet()}
                  placeholder="Ingresa tu Private Key"
                  className="import-input"
                />
              ) : (
                <textarea
                  value={mnemonicInput}
                  onChange={(e) => setMnemonicInput(e.target.value)}
                  placeholder="Ingresa tu frase de recuperación (12 o 24 palabras)"
                  className="import-input"
                  style={{ minHeight: '80px', resize: 'vertical' }}
                />
              )}
              
              <div className="import-actions">
                <button 
                  onClick={importWallet} 
                  className={`setup-btn primary ${loading ? 'btn-loading' : ''}`}
                  disabled={loading}
                >
                  Importar
                </button>
                <button 
                  onClick={() => {
                    setShowImport(false);
                    setPrivateKeyInput('');
                    setMnemonicInput('');
                    setError('');
                  }} 
                  className="setup-btn secondary"
                  disabled={loading}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Password Encryption Prompt */}
      {showPasswordPrompt && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3>🔐 Protege tu Wallet</h3>
            </div>
            <div className="modal-body">
              <div className="warning-box">
                <i className="fas fa-shield-alt"></i>
                <p>Tu private key será encriptada con AES-256. Esta contraseña es diferente a tu contraseña de acceso.</p>
              </div>
              <div className="input-group">
                <label>Contraseña de encriptación (mínimo 8 caracteres)</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && saveEncryptedWallet()}
                  placeholder="Contraseña segura"
                  className="modal-input"
                  autoFocus
                />
              </div>
              <button
                onClick={saveEncryptedWallet}
                className="modal-btn primary"
                disabled={password.length < 8}
              >
                <i className="fas fa-lock"></i>
                Encriptar y Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
