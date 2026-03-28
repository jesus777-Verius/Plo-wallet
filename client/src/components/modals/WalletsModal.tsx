import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { WalletManager, type WalletAccount } from '../../services/WalletManager';
import { EncryptionService } from '../../services/EncryptionService';

interface WalletsModalProps {
  currentWallet: any;
  onClose: () => void;
  onSwitchWallet: (wallet: any) => void;
  onMessage: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  encryptionPassword: string;
}

export default function WalletsModal({ 
  onClose, 
  onSwitchWallet, 
  onMessage,
  encryptionPassword 
}: WalletsModalProps) {
  const [wallets, setWallets] = useState<WalletAccount[]>([]);
  const [showAddWallet, setShowAddWallet] = useState(false);
  const [walletName, setWalletName] = useState('');
  const [importType, setImportType] = useState<'create' | 'privateKey' | 'mnemonic'>('create');
  const [privateKeyInput, setPrivateKeyInput] = useState('');
  const [mnemonicInput, setMnemonicInput] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    WalletManager.migrateOldWallet();
    loadWallets();
  }, []);

  const loadWallets = () => {
    const allWallets = WalletManager.getWallets();
    setWallets(allWallets);
  };

  const handleCreateWallet = async () => {
    if (!walletName.trim()) {
      onMessage('Ingresa un nombre para la wallet', 'error');
      return;
    }

    if (!encryptionPassword) {
      onMessage('No hay contraseña de encriptación disponible', 'error');
      return;
    }

    setLoading(true);

    try {
      let wallet;

      if (importType === 'create') {
        wallet = ethers.Wallet.createRandom();
      } else if (importType === 'privateKey') {
        if (!privateKeyInput.trim()) {
          onMessage('Ingresa una private key', 'error');
          setLoading(false);
          return;
        }
        wallet = new ethers.Wallet(privateKeyInput);
      } else {
        if (!mnemonicInput.trim()) {
          onMessage('Ingresa una frase de recuperación', 'error');
          setLoading(false);
          return;
        }
        wallet = ethers.Wallet.fromPhrase(mnemonicInput.trim());
      }

      const encryptedPrivateKey = EncryptionService.encryptPrivateKey(
        wallet.privateKey,
        encryptionPassword
      );

      const encryptedMnemonic = (wallet as any).mnemonic?.phrase
        ? EncryptionService.encryptPrivateKey((wallet as any).mnemonic.phrase, encryptionPassword)
        : undefined;

      WalletManager.addWallet(
        walletName,
        wallet.address,
        encryptedPrivateKey,
        encryptedMnemonic,
        !!(wallet as any).mnemonic
      );

      loadWallets();
      resetForm();
      onMessage('Wallet agregada exitosamente', 'success');
    } catch (error: any) {
      onMessage(`Error: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchWallet = (walletAccount: WalletAccount) => {
    if (!encryptionPassword) {
      onMessage('No hay contraseña de encriptación disponible', 'error');
      return;
    }

    try {
      const privateKey = EncryptionService.decryptPrivateKey(
        walletAccount.encryptedPrivateKey,
        encryptionPassword
      );

      const mnemonic = walletAccount.encryptedMnemonic
        ? EncryptionService.decryptPrivateKey(walletAccount.encryptedMnemonic, encryptionPassword)
        : null;

      WalletManager.setActiveWallet(walletAccount.id);

      onSwitchWallet({
        ...walletAccount,
        privateKey,
        mnemonic
      });

      onMessage(`Cambiado a ${walletAccount.name}`, 'success');
      onClose();
    } catch (error: any) {
      onMessage(`Error al cambiar wallet: ${error.message}`, 'error');
    }
  };

  const handleDeleteWallet = (id: string) => {
    if (window.confirm('¿Eliminar esta wallet? Asegúrate de tener respaldo de la private key.')) {
      try {
        WalletManager.deleteWallet(id);
        loadWallets();
        onMessage('Wallet eliminada', 'info');
      } catch (error: any) {
        onMessage(error.message, 'error');
      }
    }
  };

  const handleRenameWallet = (id: string, currentName: string) => {
    const newName = prompt('Nuevo nombre:', currentName);
    if (newName && newName.trim()) {
      WalletManager.updateWalletName(id, newName.trim());
      loadWallets();
      onMessage('Nombre actualizado', 'success');
    }
  };

  const resetForm = () => {
    setShowAddWallet(false);
    setWalletName('');
    setPrivateKeyInput('');
    setMnemonicInput('');
    setImportType('create');
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-container">
        <div className="modal-header">
          <h3>Mis Wallets</h3>
          <button onClick={onClose} className="modal-close">
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="modal-body">
          {!showAddWallet ? (
            <>
              <button
                onClick={() => setShowAddWallet(true)}
                className="modal-btn primary"
                style={{ marginBottom: '15px' }}
              >
                <i className="fas fa-plus"></i>
                Agregar Wallet
              </button>

              <div className="wallets-list" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {wallets.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
                    <i className="fas fa-wallet" style={{ fontSize: '48px', marginBottom: '10px' }}></i>
                    <p>No hay wallets</p>
                  </div>
                ) : (
                  wallets.map(wallet => (
                    <div
                      key={wallet.id}
                      className="wallet-item"
                      style={{
                        padding: '15px',
                        background: wallet.isActive ? '#3a2d5a' : '#2a2d3a',
                        borderRadius: '8px',
                        marginBottom: '10px',
                        border: wallet.isActive ? '2px solid #8247e5' : 'none'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                            {wallet.name}
                            {wallet.isActive && (
                              <span style={{ 
                                marginLeft: '10px', 
                                fontSize: '0.75em', 
                                color: '#8247e5',
                                background: '#8247e533',
                                padding: '2px 8px',
                                borderRadius: '4px'
                              }}>
                                Activa
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.85em', color: '#888', wordBreak: 'break-all' }}>
                            {wallet.address}
                          </div>
                          <div style={{ fontSize: '0.75em', color: '#aaa', marginTop: '5px' }}>
                            {wallet.hasMnemonic ? '🌱 Con frase de recuperación' : '🔑 Solo private key'}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '5px', marginLeft: '10px' }}>
                          {!wallet.isActive && (
                            <button
                              onClick={() => handleSwitchWallet(wallet)}
                              className="icon-btn"
                              title="Usar esta wallet"
                            >
                              <i className="fas fa-check"></i>
                            </button>
                          )}
                          <button
                            onClick={() => handleRenameWallet(wallet.id, wallet.name)}
                            className="icon-btn"
                            title="Renombrar"
                          >
                            <i className="fas fa-edit"></i>
                          </button>
                          <button
                            onClick={() => handleDeleteWallet(wallet.id)}
                            className="icon-btn"
                            title="Eliminar"
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <>
              <div className="input-group">
                <label>Nombre de la Wallet</label>
                <input
                  type="text"
                  value={walletName}
                  onChange={(e) => setWalletName(e.target.value)}
                  placeholder="Ej: Mi Wallet Personal"
                  className="modal-input"
                  autoFocus
                />
              </div>

              <div className="import-tabs" style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                <button
                  onClick={() => setImportType('create')}
                  className={`setup-btn ${importType === 'create' ? 'primary' : 'secondary'}`}
                  style={{ flex: 1, padding: '10px' }}
                >
                  Crear Nueva
                </button>
                <button
                  onClick={() => setImportType('privateKey')}
                  className={`setup-btn ${importType === 'privateKey' ? 'primary' : 'secondary'}`}
                  style={{ flex: 1, padding: '10px' }}
                >
                  Private Key
                </button>
                <button
                  onClick={() => setImportType('mnemonic')}
                  className={`setup-btn ${importType === 'mnemonic' ? 'primary' : 'secondary'}`}
                  style={{ flex: 1, padding: '10px' }}
                >
                  Frase
                </button>
              </div>

              {importType === 'privateKey' && (
                <div className="input-group">
                  <label>Private Key</label>
                  <input
                    type="password"
                    value={privateKeyInput}
                    onChange={(e) => setPrivateKeyInput(e.target.value)}
                    placeholder="0x..."
                    className="modal-input"
                  />
                </div>
              )}

              {importType === 'mnemonic' && (
                <div className="input-group">
                  <label>Frase de Recuperación</label>
                  <textarea
                    value={mnemonicInput}
                    onChange={(e) => setMnemonicInput(e.target.value)}
                    placeholder="Ingresa las 12 o 24 palabras"
                    className="modal-input"
                    style={{ minHeight: '80px', resize: 'vertical' }}
                  />
                </div>
              )}

              <div className="modal-actions">
                <button
                  onClick={handleCreateWallet}
                  className={`modal-btn primary ${loading ? 'btn-loading' : ''}`}
                  disabled={loading}
                >
                  <i className="fas fa-plus"></i>
                  {loading ? 'Agregando...' : 'Agregar Wallet'}
                </button>
                <button onClick={resetForm} className="modal-btn secondary">
                  Cancelar
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
