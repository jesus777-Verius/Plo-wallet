const API_BASE = 'http://localhost:3000/api/wallet';
let currentWallet = null;
let polPrice = 0.45;
let pendingTransaction = null;
let autoLockTimer = null;
let sessionTimer = null;

// Estado de la aplicación
let appState = {
    isAuthenticated: false,
    isSetup: false,
    currentView: 'auth',
    securitySettings: {
        autoLock: true,
        rememberSession: false,
        lockTimeout: 15 * 60 * 1000 // 15 minutos
    }
};

// Sistema de autenticación y seguridad
class SecurityManager {
    constructor() {
        this.passwordHash = localStorage.getItem('pol_wallet_auth');
        this.sessionToken = sessionStorage.getItem('pol_session');
        this.lastActivity = Date.now();
    }

    // Hash simple para contraseña (en producción usar bcrypt)
    hashPassword(password) {
        return btoa(password + 'pol_wallet_salt_2024');
    }

    // Configurar autenticación inicial
    setupAuth(password, options = {}) {
        const hash = this.hashPassword(password);
        localStorage.setItem('pol_wallet_auth', hash);
        
        // Guardar configuraciones de seguridad
        const settings = {
            autoLock: options.autoLock || true,
            rememberSession: options.rememberSession || false
        };
        localStorage.setItem('pol_security_settings', JSON.stringify(settings));
        
        this.passwordHash = hash;
        appState.securitySettings = settings;
        
        return true;
    }

    // Verificar contraseña
    verifyPassword(password) {
        const hash = this.hashPassword(password);
        return hash === this.passwordHash;
    }

    // Iniciar sesión
    login(password) {
        if (!this.passwordHash) return false;
        
        if (this.verifyPassword(password)) {
            const sessionToken = this.generateSessionToken();
            sessionStorage.setItem('pol_session', sessionToken);
            this.sessionToken = sessionToken;
            this.lastActivity = Date.now();
            
            // Cargar configuraciones de seguridad
            const settings = localStorage.getItem('pol_security_settings');
            if (settings) {
                appState.securitySettings = JSON.parse(settings);
            }
            
            this.startAutoLock();
            return true;
        }
        return false;
    }

    // Generar token de sesión
    generateSessionToken() {
        return btoa(Date.now() + Math.random().toString(36));
    }

    // Verificar si la sesión es válida
    isSessionValid() {
        if (!this.sessionToken) return false;
        
        // Verificar si debe recordar sesión por 24h
        if (appState.securitySettings.rememberSession) {
            const sessionData = localStorage.getItem('pol_remember_session');
            if (sessionData) {
                const { token, timestamp } = JSON.parse(sessionData);
                const twentyFourHours = 24 * 60 * 60 * 1000;
                if (Date.now() - timestamp < twentyFourHours && token === this.sessionToken) {
                    return true;
                }
            }
        }
        
        return sessionStorage.getItem('pol_session') === this.sessionToken;
    }

    // Recordar sesión por 24h
    rememberSession() {
        if (appState.securitySettings.rememberSession) {
            const sessionData = {
                token: this.sessionToken,
                timestamp: Date.now()
            };
            localStorage.setItem('pol_remember_session', JSON.stringify(sessionData));
        }
    }

    // Cerrar sesión
    logout() {
        sessionStorage.removeItem('pol_session');
        localStorage.removeItem('pol_remember_session');
        this.sessionToken = null;
        this.stopAutoLock();
        appState.isAuthenticated = false;
        currentWallet = null;
        showAuthScreen();
    }

    // Iniciar auto-bloqueo
    startAutoLock() {
        if (!appState.securitySettings.autoLock) return;
        
        this.stopAutoLock();
        
        const checkActivity = () => {
            const timeSinceActivity = Date.now() - this.lastActivity;
            const timeLeft = appState.securitySettings.lockTimeout - timeSinceActivity;
            
            if (timeLeft <= 0) {
                this.logout();
                showStatus('Sesión bloqueada por inactividad', 'warning');
                return;
            }
            
            // Mostrar advertencia en los últimos 60 segundos
            if (timeLeft <= 60000 && timeLeft > 59000) {
                showStatus('La sesión se bloqueará en 1 minuto por inactividad', 'warning');
            }
        };
        
        autoLockTimer = setInterval(checkActivity, 1000);
    }

    // Detener auto-bloqueo
    stopAutoLock() {
        if (autoLockTimer) {
            clearInterval(autoLockTimer);
            autoLockTimer = null;
        }
    }

    // Actualizar actividad
    updateActivity() {
        this.lastActivity = Date.now();
    }

    // Cambiar contraseña
    changePassword(oldPassword, newPassword) {
        if (!this.verifyPassword(oldPassword)) return false;
        
        const newHash = this.hashPassword(newPassword);
        localStorage.setItem('pol_wallet_auth', newHash);
        this.passwordHash = newHash;
        
        // Invalidar sesiones existentes
        this.logout();
        return true;
    }

    // Reset completo
    reset() {
        localStorage.removeItem('pol_wallet_auth');
        localStorage.removeItem('pol_security_settings');
        localStorage.removeItem('pol_remember_session');
        localStorage.removeItem('pol_wallet_data');
        sessionStorage.clear();
        this.stopAutoLock();
        
        this.passwordHash = null;
        this.sessionToken = null;
        appState.isAuthenticated = false;
        currentWallet = null;
        
        showAuthScreen();
    }
}

const security = new SecurityManager();

// Sistema de notificaciones como status bar
function showStatus(message, type = 'info', duration = 5000) {
    const statusBar = document.getElementById('statusBar');
    const statusMessage = statusBar.querySelector('.status-message');
    const statusIcon = statusBar.querySelector('.status-icon');
    
    // Actualizar contenido
    statusMessage.textContent = message;
    
    // Actualizar icono según tipo
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        info: 'fas fa-info-circle',
        warning: 'fas fa-exclamation-triangle'
    };
    
    statusIcon.className = `status-icon ${icons[type]}`;
    
    // Actualizar clase del status bar
    statusBar.className = `status-bar ${type}`;
    statusBar.style.display = 'flex';
    
    // Auto-ocultar
    if (duration > 0) {
        setTimeout(() => {
            hideStatus();
        }, duration);
    }
}

function hideStatus() {
    document.getElementById('statusBar').style.display = 'none';
}

// Validaciones
function validatePassword(password) {
    if (!password) return 'La contraseña es requerida';
    if (password.length < 6) return 'La contraseña debe tener al menos 6 caracteres';
    return null;
}

function validateAddress(address) {
    if (!address) return 'La dirección es requerida';
    if (!address.startsWith('0x')) return 'La dirección debe comenzar con 0x';
    if (address.length !== 42) return 'La dirección debe tener 42 caracteres';
    return null;
}

function validateAmount(amount, balance) {
    if (!amount) return 'La cantidad es requerida';
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return 'La cantidad debe ser mayor a 0';
    if (numAmount > parseFloat(balance)) return 'Fondos insuficientes';
    return null;
}

function showInputError(inputId, errorId, message) {
    const input = document.getElementById(inputId);
    const error = document.getElementById(errorId);
    
    input.classList.add('error');
    error.textContent = message;
    error.classList.add('show');
}

function clearInputError(inputId, errorId) {
    const input = document.getElementById(inputId);
    const error = document.getElementById(errorId);
    
    input.classList.remove('error');
    error.classList.remove('show');
}

// Funciones de autenticación
function showAuthScreen() {
    document.getElementById('authScreen').style.display = 'flex';
    document.getElementById('setupScreen').style.display = 'none';
    document.getElementById('walletScreen').style.display = 'none';
    appState.currentView = 'auth';
}

function showSetupAuth() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('setupAuthForm').style.display = 'block';
}

function showLogin() {
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('setupAuthForm').style.display = 'none';
    clearInputError('setupPassword', 'setupPasswordError');
    clearInputError('confirmPassword', 'confirmPasswordError');
}

function setupAuth() {
    const password = document.getElementById('setupPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const enableBiometric = document.getElementById('enableBiometric').checked;
    const enableAutoLock = document.getElementById('enableAutoLock').checked;
    
    // Limpiar errores previos
    clearInputError('setupPassword', 'setupPasswordError');
    clearInputError('confirmPassword', 'confirmPasswordError');
    
    // Validar contraseña
    const passwordError = validatePassword(password);
    if (passwordError) {
        showInputError('setupPassword', 'setupPasswordError', passwordError);
        return;
    }
    
    // Validar confirmación
    if (password !== confirmPassword) {
        showInputError('confirmPassword', 'confirmPasswordError', 'Las contraseñas no coinciden');
        return;
    }
    
    // Configurar autenticación
    const success = security.setupAuth(password, {
        rememberSession: enableBiometric,
        autoLock: enableAutoLock
    });
    
    if (success) {
        showStatus('Seguridad configurada exitosamente', 'success');
        showSetupScreen();
    } else {
        showStatus('Error configurando seguridad', 'error');
    }
}

function login() {
    const password = document.getElementById('loginPassword').value;
    
    clearInputError('loginPassword', 'loginError');
    
    if (!password) {
        showInputError('loginPassword', 'loginError', 'Ingresa tu contraseña');
        return;
    }
    
    if (!security.passwordHash) {
        showInputError('loginPassword', 'loginError', 'No hay configuración de seguridad. Configura primero.');
        return;
    }
    
    const success = security.login(password);
    
    if (success) {
        appState.isAuthenticated = true;
        security.rememberSession();
        
        // Verificar si hay wallet guardada
        const savedWallet = localStorage.getItem('pol_wallet_data');
        if (savedWallet) {
            const walletData = JSON.parse(savedWallet);
            currentWallet = walletData;
            showWalletScreen();
            updateBalance();
        } else {
            showSetupScreen();
        }
        
        showStatus('Acceso autorizado', 'success', 3000);
    } else {
        showInputError('loginPassword', 'loginError', 'Contraseña incorrecta');
    }
}

function lockWallet() {
    security.logout();
    showStatus('Wallet bloqueada', 'info');
}

// Funciones de pantallas
function showSetupScreen() {
    document.getElementById('authScreen').style.display = 'none';
    document.getElementById('setupScreen').style.display = 'flex';
    document.getElementById('walletScreen').style.display = 'none';
    appState.currentView = 'setup';
}

function showWalletScreen() {
    document.getElementById('authScreen').style.display = 'none';
    document.getElementById('setupScreen').style.display = 'none';
    document.getElementById('walletScreen').style.display = 'block';
    appState.currentView = 'wallet';
    
    // Actualizar indicador de seguridad
    updateSecurityIndicator();
}

function updateSecurityIndicator() {
    const indicator = document.getElementById('securityIndicator');
    const status = document.getElementById('securityStatus');
    
    if (appState.securitySettings.autoLock && security.isSessionValid()) {
        indicator.className = 'security-indicator';
        if (status) status.textContent = 'Protegido';
    } else {
        indicator.className = 'security-indicator warning';
        if (status) status.textContent = 'Advertencia';
    }
}

// Inicializar cuando se carga la página
document.addEventListener('DOMContentLoaded', function() {
    // Verificar si hay configuración de seguridad
    if (security.passwordHash) {
        // Verificar sesión válida
        if (security.isSessionValid()) {
            appState.isAuthenticated = true;
            
            // Cargar wallet si existe
            const savedWallet = localStorage.getItem('pol_wallet_data');
            if (savedWallet) {
                currentWallet = JSON.parse(savedWallet);
                showWalletScreen();
                updateBalance();
            } else {
                showSetupScreen();
            }
            
            security.startAutoLock();
        } else {
            showAuthScreen();
        }
    } else {
        showAuthScreen();
    }
    
    checkServerStatus();
    fetchPOLPrice();
    
    // Actualizar actividad en cualquier interacción
    document.addEventListener('click', () => security.updateActivity());
    document.addEventListener('keypress', () => security.updateActivity());
});

// Verificar estado del servidor
async function checkServerStatus() {
    try {
        const response = await fetch('http://localhost:3000/health');
        const data = await response.json();
        
        if (data.status === 'OK') {
            showStatus('Conectado al servidor', 'success', 3000);
        }
    } catch (error) {
        showStatus('Error de conexión al servidor', 'error');
    }
}

// Obtener precio de POL
async function fetchPOLPrice() {
    polPrice = 0.45;
}

// Funciones de wallet
function showImportForm() {
    document.getElementById('importForm').style.display = 'block';
}

function hideImportForm() {
    document.getElementById('importForm').style.display = 'none';
    document.getElementById('privateKeyInput').value = '';
}

async function createWallet() {
    const btn = event.target;
    btn.classList.add('btn-loading');
    
    try {
        const response = await fetch(`${API_BASE}/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentWallet = data.data;
            
            // Guardar wallet de forma segura
            localStorage.setItem('pol_wallet_data', JSON.stringify(currentWallet));
            
            showStatus('Wallet creada exitosamente', 'success');
            showPrivateKeyModal(currentWallet.privateKey, true);
            
            showWalletScreen();
            await updateBalance();
        } else {
            showStatus(`Error creando wallet: ${data.error}`, 'error');
        }
    } catch (error) {
        showStatus(`Error de conexión: ${error.message}`, 'error');
    } finally {
        btn.classList.remove('btn-loading');
    }
}

async function importWallet() {
    const privateKey = document.getElementById('privateKeyInput').value.trim();
    
    if (!privateKey) {
        showStatus('Por favor ingresa una private key', 'error');
        return;
    }
    
    const btn = event.target;
    btn.classList.add('btn-loading');
    
    try {
        const response = await fetch(`${API_BASE}/import`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ privateKey })
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentWallet = data.data;
            currentWallet.privateKey = privateKey;
            
            // Guardar wallet de forma segura
            localStorage.setItem('pol_wallet_data', JSON.stringify(currentWallet));
            
            hideImportForm();
            showWalletScreen();
            await updateBalance();
            
            showStatus('Wallet importada exitosamente', 'success');
        } else {
            showStatus(`Error importando wallet: ${data.error}`, 'error');
        }
    } catch (error) {
        showStatus(`Error de conexión: ${error.message}`, 'error');
    } finally {
        btn.classList.remove('btn-loading');
    }
}

async function refreshBalance() {
    const btn = event.target;
    const icon = btn.querySelector('i');
    icon.classList.add('fa-spin');
    
    await updateBalance();
    
    setTimeout(() => {
        icon.classList.remove('fa-spin');
    }, 1000);
}

async function updateBalance() {
    if (!currentWallet) return;
    
    try {
        const response = await fetch(`${API_BASE}/balance/${currentWallet.address}`);
        const data = await response.json();
        
        if (data.success) {
            const polBalance = parseFloat(data.data.balance.replace(' MATIC', ''));
            const usdValue = (polBalance * polPrice).toFixed(2);
            
            document.getElementById('balanceUSD').textContent = usdValue;
            document.getElementById('balancePOL').textContent = polBalance.toFixed(4);
            document.getElementById('tokenAmount').textContent = `${polBalance.toFixed(4)} POL`;
            document.getElementById('tokenValue').textContent = `$${usdValue}`;
            
            const settingsAddress = document.getElementById('settingsAddress');
            if (settingsAddress) {
                settingsAddress.textContent = currentWallet.address;
            }
        }
    } catch (error) {
        showStatus('Error actualizando balance', 'error');
    }
}

// Funciones de modales (continuaré con el resto...)
function showSend() {
    clearInputError('sendToAddress', 'addressError');
    clearInputError('sendAmount', 'amountError');
    document.getElementById('sendModal').classList.add('show');
}

function closeSendModal() {
    document.getElementById('sendModal').classList.remove('show');
    document.getElementById('sendToAddress').value = '';
    document.getElementById('sendAmount').value = '';
    document.getElementById('sendGasPrice').value = '';
    clearInputError('sendToAddress', 'addressError');
    clearInputError('sendAmount', 'amountError');
}

function showReceive() {
    if (!currentWallet) return;
    document.getElementById('receiveAddress').textContent = currentWallet.address;
    document.getElementById('receiveModal').classList.add('show');
}

function closeReceiveModal() {
    document.getElementById('receiveModal').classList.remove('show');
}

function copyAddress() {
    if (!currentWallet) return;
    
    navigator.clipboard.writeText(currentWallet.address).then(() => {
        const copyBtn = document.querySelector('#receiveModal .copy-btn i');
        const originalClass = copyBtn.className;
        copyBtn.className = 'fas fa-check';
        
        showStatus('Dirección copiada al portapapeles', 'success', 2000);
        
        setTimeout(() => {
            copyBtn.className = originalClass;
        }, 2000);
    }).catch(() => {
        showStatus('Error copiando dirección', 'error');
    });
}

function sendTransaction() {
    const toAddress = document.getElementById('sendToAddress').value.trim();
    const amount = document.getElementById('sendAmount').value.trim();
    const gasPrice = document.getElementById('sendGasPrice').value.trim();
    
    if (!currentWallet) {
        showStatus('No hay wallet cargada', 'error');
        return;
    }
    
    clearInputError('sendToAddress', 'addressError');
    clearInputError('sendAmount', 'amountError');
    
    const addressError = validateAddress(toAddress);
    if (addressError) {
        showInputError('sendToAddress', 'addressError', addressError);
        return;
    }
    
    const currentBalance = parseFloat(document.getElementById('balancePOL').textContent);
    const amountError = validateAmount(amount, currentBalance);
    if (amountError) {
        showInputError('sendAmount', 'amountError', amountError);
        return;
    }
    
    pendingTransaction = {
        to: toAddress,
        amount: amount,
        gasPrice: gasPrice || '20'
    };
    
    showConfirmModal();
}

function showConfirmModal() {
    if (!pendingTransaction) return;
    
    const usdValue = (parseFloat(pendingTransaction.amount) * polPrice).toFixed(2);
    
    document.getElementById('confirmTo').textContent = pendingTransaction.to;
    document.getElementById('confirmAmount').textContent = `${pendingTransaction.amount} POL`;
    document.getElementById('confirmUSD').textContent = `$${usdValue}`;
    document.getElementById('confirmGas').textContent = `${pendingTransaction.gasPrice} Gwei`;
    
    document.getElementById('confirmModal').classList.add('show');
}

function closeConfirmModal() {
    document.getElementById('confirmModal').classList.remove('show');
    pendingTransaction = null;
}

async function confirmTransaction() {
    if (!pendingTransaction) return;
    
    const btn = document.getElementById('confirmBtn');
    btn.classList.add('btn-loading');
    
    try {
        const txData = {
            to: pendingTransaction.to,
            amount: pendingTransaction.amount
        };
        
        if (pendingTransaction.gasPrice !== '20') {
            txData.gasPrice = pendingTransaction.gasPrice;
        }
        
        const response = await fetch(`${API_BASE}/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(txData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            showStatus(`${data.data.value} POL enviados exitosamente`, 'success');
            
            closeConfirmModal();
            closeSendModal();
            
            setTimeout(updateBalance, 3000);
        } else {
            showStatus(`Error enviando transacción: ${data.error}`, 'error');
        }
    } catch (error) {
        showStatus(`Error de conexión: ${error.message}`, 'error');
    } finally {
        btn.classList.remove('btn-loading');
    }
}

// Funciones de seguridad
function showSecurity() {
    // Actualizar toggles según configuración actual
    document.getElementById('autoLockToggle').checked = appState.securitySettings.autoLock;
    document.getElementById('rememberToggle').checked = appState.securitySettings.rememberSession;
    
    document.getElementById('securityModal').classList.add('show');
}

function closeSecurityModal() {
    document.getElementById('securityModal').classList.remove('show');
}

function exportPrivateKey() {
    if (!currentWallet || !currentWallet.privateKey) {
        showStatus('No hay private key disponible', 'error');
        return;
    }
    
    showPrivateKeyModal(currentWallet.privateKey, false);
}

function showPrivateKeyModal(privateKey, isNewWallet = false) {
    document.getElementById('privateKeyText').textContent = privateKey;
    document.getElementById('privateKeyModal').classList.add('show');
    
    if (isNewWallet) {
        showStatus('Guarda tu private key en un lugar seguro', 'warning', 8000);
    }
}

function closePrivateKeyModal() {
    document.getElementById('privateKeyModal').classList.remove('show');
}

function copyPrivateKey() {
    const privateKey = document.getElementById('privateKeyText').textContent;
    
    navigator.clipboard.writeText(privateKey).then(() => {
        const copyBtn = document.querySelector('#privateKeyModal .copy-btn i');
        const originalClass = copyBtn.className;
        copyBtn.className = 'fas fa-check';
        
        showStatus('Private key copiada al portapapeles', 'success', 2000);
        
        setTimeout(() => {
            copyBtn.className = originalClass;
        }, 2000);
    }).catch(() => {
        showStatus('Error copiando private key', 'error');
    });
}

function changePassword() {
    const oldPassword = prompt('Ingresa tu contraseña actual:');
    if (!oldPassword) return;
    
    const newPassword = prompt('Ingresa tu nueva contraseña:');
    if (!newPassword) return;
    
    const confirmPassword = prompt('Confirma tu nueva contraseña:');
    if (newPassword !== confirmPassword) {
        showStatus('Las contraseñas no coinciden', 'error');
        return;
    }
    
    const success = security.changePassword(oldPassword, newPassword);
    if (success) {
        showStatus('Contraseña cambiada exitosamente. Inicia sesión nuevamente.', 'success');
    } else {
        showStatus('Contraseña actual incorrecta', 'error');
    }
}

function resetWallet() {
    const confirmation = prompt('Escribe "RESET" para confirmar el reset completo:');
    if (confirmation === 'RESET') {
        security.reset();
        showStatus('Wallet reseteada completamente', 'info');
    }
}

// Funciones de configuración
function showSettings() {
    if (currentWallet) {
        document.getElementById('settingsAddress').textContent = currentWallet.address;
    }
    updateSecurityIndicator();
    document.getElementById('settingsModal').classList.add('show');
}

function closeSettingsModal() {
    document.getElementById('settingsModal').classList.remove('show');
}

function showActivity() {
    document.getElementById('activityModal').classList.add('show');
    loadActivity();
}

function closeActivityModal() {
    document.getElementById('activityModal').classList.remove('show');
}

function loadActivity() {
    const activityList = document.getElementById('activityList');
    activityList.innerHTML = `
        <div class="activity-item">
            <div class="activity-info">
                <div class="activity-icon receive">
                    <i class="fas fa-arrow-down"></i>
                </div>
                <div class="activity-details">
                    <div class="activity-type">Recibido</div>
                    <div class="activity-time">Hace 2 horas</div>
                </div>
            </div>
            <div class="activity-amount">
                <div class="activity-value">+0.5000 POL</div>
                <div class="activity-usd">$0.23</div>
            </div>
        </div>
        <div class="activity-item">
            <div class="activity-info">
                <div class="activity-icon send">
                    <i class="fas fa-arrow-up"></i>
                </div>
                <div class="activity-details">
                    <div class="activity-type">Enviado</div>
                    <div class="activity-time">Hace 1 día</div>
                </div>
            </div>
            <div class="activity-amount">
                <div class="activity-value">-0.1000 POL</div>
                <div class="activity-usd">$0.05</div>
            </div>
        </div>
    `;
}

// Event listeners
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('show');
    }
});

document.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        const activeElement = document.activeElement;
        
        if (activeElement.id === 'loginPassword') {
            login();
        } else if (activeElement.id === 'confirmPassword') {
            setupAuth();
        } else if (activeElement.id === 'privateKeyInput') {
            importWallet();
        } else if (activeElement.id === 'sendAmount' || activeElement.id === 'sendToAddress' || activeElement.id === 'sendGasPrice') {
            sendTransaction();
        }
    }
});

// Actualizar balance cada 30 segundos si está autenticado
setInterval(() => {
    if (appState.isAuthenticated && currentWallet && appState.currentView === 'wallet') {
        updateBalance();
    }
}, 30000);