import { useState, useEffect, memo, useCallback } from 'react';
import { ethers } from 'ethers';
import { getPolygonProvider, POL_PRICE } from '../config/rpc';
import { TOKENS, ERC20_ABI } from '../config/tokens';
import SendModal from './modals/SendModal';
import ReceiveModal from './modals/ReceiveModal';
import SecurityModal from './modals/SecurityModal';
import SettingsModal from './modals/SettingsModal';
import ActivityModal from './modals/ActivityModal';
import SwapModal from './modals/SwapModal';
import AddressBookModal from './modals/AddressBookModal';
import WalletsModal from './modals/WalletsModal';
import NetworkStatus from './NetworkStatus';
import NotificationBell from './NotificationBell';

interface WalletScreenProps {
  wallet: any;
  onLogout: () => void;
  onUpdateWallet: (wallet: any) => void;
  encryptionPassword?: string;
}

function WalletScreen({ wallet, onLogout, onUpdateWallet, encryptionPassword }: WalletScreenProps) {
  const [balance, setBalance] = useState({ pol: '0.0000', usd: '0.00', usdt: '0.00' });
  const [showSendModal, setShowSendModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [showAddressBook, setShowAddressBook] = useState(false);
  const [showWallets, setShowWallets] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState<'success' | 'error' | 'info' | 'warning'>('info');
  const [showStatus, setShowStatus] = useState(false);
  const [provider, setProvider] = useState<ethers.JsonRpcProvider | null>(null);

  useEffect(() => {
    // Obtener provider de Infura
    const provider = getPolygonProvider();
    setProvider(provider);
    updateBalance(provider);
    
    // Importar funciones de tiempo real
    import('../config/rpc').then(({ listenToBalanceChanges, getNodeInfo }) => {
      // Actualizar balance en tiempo real
      const unsubscribe = listenToBalanceChanges(wallet.address, (newBalance) => {
        const polBalance = parseFloat(newBalance);
        const usdValue = (polBalance * POL_PRICE).toFixed(2);
        
        setBalance(prev => ({
          ...prev,
          pol: polBalance.toFixed(4),
          usd: usdValue
        }));
        
        // Mostrar notificación de cambio
        showStatusMessage('Balance actualizado en tiempo real', 'success');
      });
      
      // Obtener info del nodo
      getNodeInfo().then(info => {
        if (info.connected) {
          console.log('✅ Conectado a Polygon Mainnet');
          console.log(`📦 Bloque actual: ${info.blockNumber}`);
          console.log(`⛽ Gas price: ${info.gasPrice} Gwei`);
        }
      });
      
      return () => {
        unsubscribe();
      };
    });
    
    // Actualizar USDT cada 30 segundos (no hay WebSocket para tokens)
    const usdtInterval = setInterval(() => updateUSDTBalance(provider), 30000);
    
    return () => {
      clearInterval(usdtInterval);
    };
  }, [wallet]);

  const updateUSDTBalance = useCallback(async (rpcProvider: ethers.JsonRpcProvider) => {
    try {
      const usdtContract = new ethers.Contract(TOKENS.USDT.address, ERC20_ABI, rpcProvider);
      const usdtBalanceWei = await usdtContract.balanceOf(wallet.address);
      const usdtBalance = parseFloat(ethers.formatUnits(usdtBalanceWei, TOKENS.USDT.decimals)).toFixed(2);
      
      setBalance(prev => ({
        ...prev,
        usdt: usdtBalance
      }));
    } catch (error) {
      // Silenciar errores
    }
  }, [wallet]);

  const updateBalance = useCallback(async (rpcProvider?: ethers.JsonRpcProvider) => {
    if (!wallet) return;
    
    try {
      const currentProvider = rpcProvider || provider;
      if (!currentProvider) return;
      
      // Obtener balance de POL en paralelo con USDT
      const [polBalanceWei, usdtBalanceWei] = await Promise.all([
        currentProvider.getBalance(wallet.address),
        (async () => {
          try {
            const usdtContract = new ethers.Contract(TOKENS.USDT.address, ERC20_ABI, currentProvider);
            return await usdtContract.balanceOf(wallet.address);
          } catch {
            return 0n;
          }
        })()
      ]);
      
      const polBalance = parseFloat(ethers.formatEther(polBalanceWei));
      const usdValue = (polBalance * POL_PRICE).toFixed(2);
      const usdtBalance = parseFloat(ethers.formatUnits(usdtBalanceWei, TOKENS.USDT.decimals)).toFixed(2);
      
      setBalance({
        pol: polBalance.toFixed(4),
        usd: usdValue,
        usdt: usdtBalance
      });
    } catch (error: any) {
      // Silenciar todos los errores para máxima velocidad
    }
  }, [wallet, provider]);

  const refreshBalance = useCallback(async () => {
    updateBalance(); // Sin await para respuesta instantánea
    showStatusMessage('Actualizando balance...', 'info', 1000);
  }, [updateBalance]);

  const showStatusMessage = useCallback((message: string, type: 'success' | 'error' | 'info' | 'warning', duration = 5000) => {
    setStatusMessage(message);
    setStatusType(type);
    setShowStatus(true);
    
    if (duration > 0) {
      setTimeout(() => setShowStatus(false), duration);
    }
  }, []);

  return (
    <div className="wallet-screen">
      {/* Network Status Indicator */}
      <NetworkStatus />
      
      {/* Status Bar */}
      {showStatus && (
        <div className={`status-bar ${statusType}`}>
          <div className="status-content">
            <i className={`status-icon fas ${
              statusType === 'success' ? 'fa-check-circle' :
              statusType === 'error' ? 'fa-exclamation-circle' :
              statusType === 'warning' ? 'fa-exclamation-triangle' :
              'fa-info-circle'
            }`}></i>
            <span className="status-message">{statusMessage}</span>
            <button className="status-close" onClick={() => setShowStatus(false)}>
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="wallet-header">
        <div className="wallet-selector">
          <div onClick={() => setShowWallets(true)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <i className="fas fa-wallet"></i>
            <span>Main Wallet</span>
            <div className="security-indicator">
              <i className="fas fa-shield-alt"></i>
            </div>
          </div>
          <div className="header-actions">
            <NotificationBell wallet={wallet} provider={provider!} />
            <button onClick={() => setShowAddressBook(true)} className="icon-btn" title="Libreta de direcciones">
              <i className="fas fa-address-book"></i>
            </button>
            <button onClick={refreshBalance} className="icon-btn" title="Actualizar balance">
              <i className="fas fa-sync-alt"></i>
            </button>
            <button onClick={onLogout} className="icon-btn lock-btn" title="Bloquear">
              <i className="fas fa-lock"></i>
            </button>
            <button onClick={() => setShowSettingsModal(true)} className="icon-btn" title="Configuración">
              <i className="fas fa-cog"></i>
            </button>
          </div>
        </div>
      </div>

      {/* Balance Section */}
      <div className="balance-section">
        <div className="balance-amount">
          <span className="currency-symbol">$</span>
          <span>{balance.usd}</span>
          <span className="currency">USD</span>
        </div>
        <div className="balance-crypto">
          <span>{balance.pol}</span> POL
        </div>
      </div>

      {/* Action Buttons */}
      <div className="action-buttons">
        <button onClick={() => setShowReceiveModal(true)} className="action-btn receive">
          <i className="fas fa-arrow-down"></i>
          Recibir
        </button>
        <button onClick={() => setShowSwapModal(true)} className="action-btn swap">
          <i className="fas fa-exchange-alt"></i>
          Swap
        </button>
        <button onClick={() => setShowSendModal(true)} className="action-btn send">
          <i className="fas fa-arrow-up"></i>
          Enviar
        </button>
      </div>

      {/* Token List */}
      <div className="token-section">
        <div className="section-header">
          <h3>Mis Tokens</h3>
          <span className="token-count">2 tokens</span>
        </div>
        <div className="token-item active">
          <div className="token-info">
            <div className="token-icon polygon">
              <img src="/matic-logo.png" alt="POL" className="token-logo" />
            </div>
            <div className="token-details">
              <div className="token-name">Polygon</div>
              <div className="token-network">Polygon</div>
            </div>
          </div>
          <div className="token-balance">
            <div className="token-amount">{balance.pol} POL</div>
            <div className="token-value">${balance.usd}</div>
          </div>
        </div>
        
        <div className="token-item">
          <div className="token-info">
            <div className="token-icon" style={{background: 'linear-gradient(135deg, #26A17B, #009393)'}}>
              <span style={{fontSize: '1.2rem'}}>₮</span>
            </div>
            <div className="token-details">
              <div className="token-name">Tether USD</div>
              <div className="token-network">Polygon</div>
            </div>
          </div>
          <div className="token-balance">
            <div className="token-amount">{balance.usdt} USDT</div>
            <div className="token-value">${balance.usdt}</div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="bottom-nav">
        <button className="nav-item active">
          <i className="fas fa-wallet"></i>
          <span>Wallet</span>
        </button>
        <button className="nav-item" onClick={() => setShowActivityModal(true)}>
          <i className="fas fa-history"></i>
          <span>Actividad</span>
        </button>
        <button className="nav-item" onClick={() => setShowSecurityModal(true)}>
          <i className="fas fa-shield-alt"></i>
          <span>Seguridad</span>
        </button>
        <button className="nav-item" onClick={() => setShowSettingsModal(true)}>
          <i className="fas fa-cog"></i>
          <span>Config</span>
        </button>
      </div>

      {/* Modals */}
      {showSendModal && provider && (
        <SendModal
          wallet={wallet}
          balance={balance.pol}
          provider={provider}
          onClose={() => setShowSendModal(false)}
          onSuccess={() => {
            setShowSendModal(false);
            showStatusMessage('Transacción enviada exitosamente', 'success');
            setTimeout(() => updateBalance(), 3000);
          }}
          onError={(error) => showStatusMessage(error, 'error')}
        />
      )}

      {showReceiveModal && (
        <ReceiveModal
          address={wallet.address}
          onClose={() => setShowReceiveModal(false)}
          onCopy={() => showStatusMessage('Dirección copiada al portapapeles', 'success', 2000)}
        />
      )}

      {showSecurityModal && (
        <SecurityModal
          wallet={wallet}
          onClose={() => setShowSecurityModal(false)}
          onLogout={onLogout}
          onMessage={showStatusMessage}
        />
      )}

      {showSettingsModal && (
        <SettingsModal
          wallet={wallet}
          onClose={() => setShowSettingsModal(false)}
        />
      )}

      {showActivityModal && (
        <ActivityModal
          wallet={wallet}
          onClose={() => setShowActivityModal(false)}
        />
      )}

      {showSwapModal && provider && (
        <SwapModal
          wallet={wallet}
          provider={provider}
          onClose={() => setShowSwapModal(false)}
          onSuccess={() => {
            setShowSwapModal(false);
            showStatusMessage('Swap completado exitosamente', 'success');
            setTimeout(() => updateBalance(), 3000);
          }}
          onError={(error) => showStatusMessage(error, 'error')}
        />
      )}

      {showAddressBook && (
        <AddressBookModal
          onClose={() => setShowAddressBook(false)}
          onMessage={(message, type) => showStatusMessage(message, type)}
        />
      )}

      {showWallets && (
        <WalletsModal
          currentWallet={wallet}
          onClose={() => setShowWallets(false)}
          onSwitchWallet={(newWallet) => {
            onUpdateWallet(newWallet);
            setShowWallets(false);
          }}
          onMessage={(message, type) => showStatusMessage(message, type)}
          encryptionPassword={encryptionPassword || ''}
        />
      )}
    </div>
  );
}

// Memoize component to prevent unnecessary re-renders
export default memo(WalletScreen);
