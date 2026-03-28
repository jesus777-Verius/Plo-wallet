import { EncryptionService } from './EncryptionService';

export class SecurityManager {
  passwordHash: string | null;
  sessionToken: string | null;
  lastActivity: number;
  autoLockTimer: NodeJS.Timeout | null = null;
  loginAttempts: number = 0;
  maxAttempts: number = 3; // Reducido para mayor seguridad
  lockoutTime: number = 15 * 60 * 1000; // 15 minutos
  lastFailedAttempt: number = 0;
  securitySettings: {
    autoLock: boolean;
    rememberSession: boolean;
    lockTimeout: number;
    requireBiometric: boolean;
    sessionTimeout: number;
  };
  private activityListeners: (() => void)[] = [];

  constructor() {
    this.passwordHash = localStorage.getItem('pol_wallet_auth');
    this.sessionToken = sessionStorage.getItem('pol_session');
    this.lastActivity = Date.now();
    
    const settings = localStorage.getItem('pol_security_settings');
    this.securitySettings = settings ? JSON.parse(settings) : {
      autoLock: true,
      rememberSession: false,
      lockTimeout: 10 * 60 * 1000, // 10 minutos por defecto
      requireBiometric: false,
      sessionTimeout: 30 * 60 * 1000 // 30 minutos
    };
    
    // Cargar intentos de login desde localStorage para persistencia
    const attempts = localStorage.getItem('pol_login_attempts');
    if (attempts) {
      const data = JSON.parse(attempts);
      this.loginAttempts = data.count || 0;
      this.lastFailedAttempt = data.lastAttempt || 0;
    }
    
    this.setupActivityListeners();
  }

  setupAuth(password: string, options: { 
    autoLock?: boolean; 
    rememberSession?: boolean;
    requireBiometric?: boolean;
  } = {}): boolean {
    // Validar contraseña fuerte usando EncryptionService
    if (!EncryptionService.isStrongPassword(password)) {
      throw new Error('La contraseña debe tener al menos 12 caracteres con mayúsculas, minúsculas, números y símbolos');
    }
    
    const hash = EncryptionService.hashPassword(password);
    localStorage.setItem('pol_wallet_auth', hash);
    
    const settings = {
      autoLock: options.autoLock ?? true,
      rememberSession: options.rememberSession ?? false,
      lockTimeout: 10 * 60 * 1000, // 10 minutos
      requireBiometric: options.requireBiometric ?? false,
      sessionTimeout: 30 * 60 * 1000
    };
    localStorage.setItem('pol_security_settings', JSON.stringify(settings));
    
    this.passwordHash = hash;
    this.securitySettings = settings;
    this.loginAttempts = 0;
    this.clearLoginAttempts();
    
    return true;
  }

  verifyPassword(password: string): boolean {
    if (!this.passwordHash) return false;
    return EncryptionService.verifyPassword(password, this.passwordHash);
  }

  async login(password: string): Promise<boolean> {
    if (!this.passwordHash) return false;
    
    // Verificar lockout por intentos fallidos
    if (this.isLockedOut()) {
      const timeLeft = Math.ceil((this.lockoutTime - (Date.now() - this.lastFailedAttempt)) / 1000 / 60);
      throw new Error(`Demasiados intentos fallidos. Intenta en ${timeLeft} minutos.`);
    }
    
    // Verificar rate limiting
    if (this.isRateLimited()) {
      throw new Error('Demasiados intentos. Espera 30 segundos.');
    }
    
    if (this.verifyPassword(password)) {
      const sessionToken = EncryptionService.generateSecureToken();
      
      // Almacenar sesión con timestamp y metadata
      const sessionData = {
        token: sessionToken,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        ip: await this.getClientIP()
      };
      
      sessionStorage.setItem('pol_session', JSON.stringify(sessionData));
      this.sessionToken = sessionToken;
      this.lastActivity = Date.now();
      this.loginAttempts = 0;
      this.clearLoginAttempts();
      
      const settings = localStorage.getItem('pol_security_settings');
      if (settings) {
        this.securitySettings = JSON.parse(settings);
      }
      
      // Log evento de login exitoso
      this.logSecurityEvent('login_success');
      
      return true;
    }
    
    // Incrementar intentos fallidos
    this.loginAttempts++;
    this.lastFailedAttempt = Date.now();
    this.saveLoginAttempts();
    
    // Log evento de login fallido
    this.logSecurityEvent('login_failed', { attempts: this.loginAttempts });
    
    if (this.loginAttempts >= this.maxAttempts) {
      this.logSecurityEvent('account_locked');
      throw new Error(`Demasiados intentos fallidos. Bloqueado por ${this.lockoutTime / 60000} minutos.`);
    }
    
    throw new Error(`Contraseña incorrecta. Intentos restantes: ${this.maxAttempts - this.loginAttempts}`);
  }

  isLockedOut(): boolean {
    if (this.loginAttempts < this.maxAttempts) return false;
    
    const timeSinceLastAttempt = Date.now() - this.lastFailedAttempt;
    if (timeSinceLastAttempt > this.lockoutTime) {
      this.loginAttempts = 0;
      this.clearLoginAttempts();
      return false;
    }
    
    return true;
  }

  isRateLimited(): boolean {
    const now = Date.now();
    const timeSinceLastAttempt = now - this.lastFailedAttempt;
    
    // Rate limiting: máximo 1 intento cada 30 segundos después del primer fallo
    if (this.loginAttempts > 0 && timeSinceLastAttempt < 30000) {
      return true;
    }
    
    return false;
  }

  isSessionValid(): boolean {
    if (!this.sessionToken) return false;
    
    try {
      const sessionData = sessionStorage.getItem('pol_session');
      if (!sessionData) return false;
      
      const session = JSON.parse(sessionData);
      
      // Verificar token
      if (session.token !== this.sessionToken) return false;
      
      // Verificar timeout de sesión
      const sessionAge = Date.now() - session.timestamp;
      if (sessionAge > this.securitySettings.sessionTimeout) {
        this.logout();
        return false;
      }
      
      // Verificar User Agent (detección de session hijacking)
      if (session.userAgent && session.userAgent !== navigator.userAgent) {
        this.logSecurityEvent('session_hijack_attempt');
        this.logout();
        return false;
      }
      
      // Verificar sesión recordada
      if (this.securitySettings.rememberSession) {
        const rememberData = localStorage.getItem('pol_remember_session');
        if (rememberData) {
          const remember = JSON.parse(rememberData);
          const twentyFourHours = 24 * 60 * 60 * 1000;
          if (Date.now() - remember.timestamp < twentyFourHours && remember.token === this.sessionToken) {
            return true;
          }
        }
      }
      
      return true;
    } catch (error) {
      this.logSecurityEvent('session_validation_error');
      return false;
    }
  }

  rememberSession(): void {
    if (this.securitySettings.rememberSession && this.sessionToken) {
      const sessionData = {
        token: this.sessionToken,
        timestamp: Date.now(),
        userAgent: navigator.userAgent
      };
      localStorage.setItem('pol_remember_session', JSON.stringify(sessionData));
    }
  }

  logout(): void {
    this.logSecurityEvent('logout');
    
    sessionStorage.removeItem('pol_session');
    localStorage.removeItem('pol_remember_session');
    this.sessionToken = null;
    this.stopAutoLock();
    this.removeActivityListeners();
  }

  startAutoLock(onLock: () => void): void {
    if (!this.securitySettings.autoLock) return;
    
    this.stopAutoLock();
    
    const checkActivity = () => {
      const timeSinceActivity = Date.now() - this.lastActivity;
      const timeLeft = this.securitySettings.lockTimeout - timeSinceActivity;
      
      if (timeLeft <= 0) {
        this.logSecurityEvent('auto_lock');
        this.logout();
        onLock();
        return;
      }
    };
    
    this.autoLockTimer = setInterval(checkActivity, 1000);
  }

  stopAutoLock(): void {
    if (this.autoLockTimer) {
      clearInterval(this.autoLockTimer);
      this.autoLockTimer = null;
    }
  }

  updateActivity(): void {
    this.lastActivity = Date.now();
    
    // Notificar a listeners
    this.activityListeners.forEach(listener => {
      try {
        listener();
      } catch (error) {
        console.error('Error in activity listener:', error);
      }
    });
  }

  changePassword(oldPassword: string, newPassword: string): boolean {
    if (!this.verifyPassword(oldPassword)) {
      this.logSecurityEvent('password_change_failed');
      return false;
    }
    
    // Validar nueva contraseña
    if (!EncryptionService.isStrongPassword(newPassword)) {
      throw new Error('La nueva contraseña debe tener al menos 12 caracteres con mayúsculas, minúsculas, números y símbolos');
    }
    
    const newHash = EncryptionService.hashPassword(newPassword);
    localStorage.setItem('pol_wallet_auth', newHash);
    this.passwordHash = newHash;
    
    this.logSecurityEvent('password_changed');
    this.logout();
    return true;
  }

  reset(): void {
    this.logSecurityEvent('wallet_reset');
    
    localStorage.removeItem('pol_wallet_auth');
    localStorage.removeItem('pol_security_settings');
    localStorage.removeItem('pol_remember_session');
    localStorage.removeItem('pol_wallet_data');
    localStorage.removeItem('pol_wallets');
    localStorage.removeItem('pol_active_wallet');
    localStorage.removeItem('pol_login_attempts');
    localStorage.removeItem('pol_security_log');
    sessionStorage.clear();
    this.stopAutoLock();
    this.removeActivityListeners();
    
    this.passwordHash = null;
    this.sessionToken = null;
    this.loginAttempts = 0;
  }

  // Métodos privados para seguridad adicional
  private setupActivityListeners(): void {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const activityHandler = () => this.updateActivity();
    
    events.forEach(event => {
      document.addEventListener(event, activityHandler, true);
    });
    
    this.activityListeners.push(() => {
      // Listener personalizado para actividad
    });
  }

  private removeActivityListeners(): void {
    // Los event listeners se limpian automáticamente al cerrar la página
    this.activityListeners = [];
  }

  private saveLoginAttempts(): void {
    const data = {
      count: this.loginAttempts,
      lastAttempt: this.lastFailedAttempt
    };
    localStorage.setItem('pol_login_attempts', JSON.stringify(data));
  }

  private clearLoginAttempts(): void {
    localStorage.removeItem('pol_login_attempts');
  }

  private async getClientIP(): Promise<string> {
    try {
      // Usar un servicio público para obtener IP (opcional)
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip || 'unknown';
    } catch {
      return 'unknown';
    }
  }

  private logSecurityEvent(event: string, data?: any): void {
    try {
      const log = {
        event,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        data: data || {}
      };
      
      const existingLogs = localStorage.getItem('pol_security_log');
      const logs = existingLogs ? JSON.parse(existingLogs) : [];
      
      logs.push(log);
      
      // Mantener solo los últimos 100 eventos
      if (logs.length > 100) {
        logs.splice(0, logs.length - 100);
      }
      
      localStorage.setItem('pol_security_log', JSON.stringify(logs));
    } catch (error) {
      console.error('Error logging security event:', error);
    }
  }

  getSecurityLogs(): any[] {
    try {
      const logs = localStorage.getItem('pol_security_log');
      return logs ? JSON.parse(logs) : [];
    } catch {
      return [];
    }
  }

  // Detección de ataques
  detectSuspiciousActivity(): boolean {
    const logs = this.getSecurityLogs();
    const recentLogs = logs.filter(log => Date.now() - log.timestamp < 60000); // Último minuto
    
    // Detectar múltiples intentos de login fallidos
    const failedLogins = recentLogs.filter(log => log.event === 'login_failed');
    if (failedLogins.length > 5) {
      this.logSecurityEvent('suspicious_activity_detected', { type: 'multiple_failed_logins' });
      return true;
    }
    
    return false;
  }
}
