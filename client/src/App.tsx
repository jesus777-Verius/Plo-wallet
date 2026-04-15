import { useState, useEffect } from 'react';
import AuthScreen from './components/AuthScreen.tsx';
import SetupScreen from './components/SetupScreen.tsx';
import WalletScreen from './components/WalletScreen.tsx';
import PWAInstallPrompt from './components/PWAInstallPrompt.tsx';
import { SecurityManager } from './services/SecurityManager.ts';
import { EncryptionService } from './services/EncryptionService.ts';
import './App.css';

const security = new SecurityManager();

function App() {
  const [currentView, setCurrentView] = useState<'auth' | 'setup' | 'wallet'>('auth');
  const [currentWallet, setCurrentWallet] = useState<any>(null);
  const [encryptionPassword, setEncryptionPassword] = useState<string>('');
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = () => {
    try {
      // Verificar si hay configuración de seguridad
      if (security.passwordHash) {
        // Verificar sesión válida
        if (security.isSessionValid()) {
          // Cargar wallet si existe
          const savedWallet = localStorage.getItem('pol_wallet_data');
          if (savedWallet) {
            setCurrentWallet(JSON.parse(savedWallet));
            setCurrentView('wallet');
          } else {
            setCurrentView('setup');
          }
          
          security.startAutoLock(() => {
            setCurrentWallet(null);
            setEncryptionPassword('');
            setCurrentView('auth');
          });
        }
      }
    } catch (error) {
      console.error('Error initializing app:', error);
    } finally {
      setIsInitialized(true);
    }
  };

  const handleLogin = async (success: boolean, password?: string) => {
    if (success) {
      const savedWallet = localStorage.getItem('pol_wallet_data');
      if (savedWallet) {
        const walletData = JSON.parse(savedWallet);
        
        // Desencriptar private key y mnemonic INSTANTÁNEAMENTE (sin loading)
        if (password && walletData.encryptedPrivateKey) {
          try {
            const privateKey = EncryptionService.decryptPrivateKey(walletData.encryptedPrivateKey, password);
            const mnemonic = walletData.encryptedMnemonic 
              ? EncryptionService.decryptPrivateKey(walletData.encryptedMnemonic, password)
              : null;
            
            setCurrentWallet({
              ...walletData,
              privateKey,
              mnemonic
            });
            setEncryptionPassword(password);
          } catch (err) {
            console.error('Error desencriptando wallet:', err);
            
            const shouldReset = confirm(
              '❌ Error: Contraseña incorrecta para desencriptar la wallet.\n\n' +
              '⚠️ IMPORTANTE: Usa la MISMA contraseña que usaste al crear/importar la wallet.\n\n' +
              '¿Quieres RESETEAR la aplicación? (Perderás la wallet actual)\n\n' +
              '✅ Haz clic en OK para resetear\n' +
              '❌ Haz clic en Cancelar para intentar de nuevo'
            );
            
            if (shouldReset) {
              // Resetear todo
              localStorage.clear();
              sessionStorage.clear();
              security.logout();
              alert('✅ Aplicación reseteada. Ahora puedes crear una nueva wallet.');
              window.location.reload();
            } else {
              security.logout();
              setCurrentView('auth');
            }
            return;
          }
        } else {
          setCurrentWallet(walletData);
        }
        
        setCurrentView('wallet');
      } else {
        setCurrentView('setup');
      }
    }
  };

  const handleSetupComplete = () => {
    setCurrentView('setup');
  };

  const handleWalletCreated = (wallet: any) => {
    setCurrentWallet(wallet);
    setCurrentView('wallet');
  };

  const handleLogout = () => {
    security.logout();
    setCurrentWallet(null);
    setCurrentView('auth');
  };

  // Inicialización instantánea
  if (!isInitialized) {
    return null; // Render instantáneo sin loading
  }

  return (
    <>
      <PWAInstallPrompt />
      
      {currentView === 'auth' && (
        <AuthScreen 
          security={security} 
          onLogin={handleLogin}
          onSetupComplete={handleSetupComplete}
        />
      )}
      
      {currentView === 'setup' && (
        <SetupScreen 
          onWalletCreated={handleWalletCreated}
        />
      )}
      
      {currentView === 'wallet' && currentWallet && (
        <WalletScreen 
          wallet={currentWallet}
          onLogout={handleLogout}
          onUpdateWallet={setCurrentWallet}
          encryptionPassword={encryptionPassword}
        />
      )}
    </>
  );
}

export default App;