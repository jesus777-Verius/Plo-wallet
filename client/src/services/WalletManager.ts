import { EncryptionService } from './EncryptionService';

export interface WalletAccount {
  id: string;
  name: string;
  address: string;
  encryptedPrivateKey: string;
  encryptedMnemonic?: string;
  hasMnemonic: boolean;
  createdAt: number;
  isActive: boolean;
  lastUsed: number;
  version: string;
}

export class WalletManager {
  private static STORAGE_KEY = 'pol_wallets';
  private static ACTIVE_KEY = 'pol_active_wallet';
  private static MAX_WALLETS = 10; // Límite de wallets por seguridad
  private static CURRENT_VERSION = '2.0';

  /**
   * Obtener todas las wallets con validación
   */
  static getWallets(): WalletAccount[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      if (!data) return [];
      
      const wallets = JSON.parse(data);
      
      // Validar estructura de datos
      if (!Array.isArray(wallets)) {
        console.error('Invalid wallets data structure');
        return [];
      }
      
      // Filtrar wallets válidas
      return wallets.filter(wallet => this.isValidWallet(wallet));
    } catch (error) {
      console.error('Error loading wallets:', error);
      return [];
    }
  }

  /**
   * Validar estructura de wallet
   */
  private static isValidWallet(wallet: any): boolean {
    return (
      wallet &&
      typeof wallet.id === 'string' &&
      typeof wallet.name === 'string' &&
      typeof wallet.address === 'string' &&
      typeof wallet.encryptedPrivateKey === 'string' &&
      EncryptionService.isValidEthereumAddress(wallet.address) &&
      wallet.name.length > 0 &&
      wallet.name.length <= 50
    );
  }

  /**
   * Agregar nueva wallet con validaciones de seguridad
   */
  static addWallet(
    name: string,
    address: string,
    encryptedPrivateKey: string,
    encryptedMnemonic?: string,
    hasMnemonic: boolean = false
  ): WalletAccount {
    // Validar inputs
    if (!name || name.length === 0 || name.length > 50) {
      throw new Error('Nombre de wallet inválido (1-50 caracteres)');
    }
    
    if (!EncryptionService.isValidEthereumAddress(address)) {
      throw new Error('Dirección de Ethereum inválida');
    }
    
    if (!encryptedPrivateKey || encryptedPrivateKey.length === 0) {
      throw new Error('Private key encriptada requerida');
    }
    
    // Sanitizar nombre
    const sanitizedName = EncryptionService.sanitizeInput(name.trim());
    
    const wallets = this.getWallets();
    
    // Verificar límite de wallets
    if (wallets.length >= this.MAX_WALLETS) {
      throw new Error(`Máximo ${this.MAX_WALLETS} wallets permitidas`);
    }
    
    // Verificar que no exista una wallet con la misma dirección
    const existingWallet = wallets.find(w => w.address.toLowerCase() === address.toLowerCase());
    if (existingWallet) {
      throw new Error('Ya existe una wallet con esta dirección');
    }
    
    // Verificar que no exista una wallet con el mismo nombre
    const existingName = wallets.find(w => w.name.toLowerCase() === sanitizedName.toLowerCase());
    if (existingName) {
      throw new Error('Ya existe una wallet con este nombre');
    }
    
    const newWallet: WalletAccount = {
      id: this.generateSecureId(),
      name: sanitizedName,
      address: address,
      encryptedPrivateKey,
      encryptedMnemonic,
      hasMnemonic,
      createdAt: Date.now(),
      lastUsed: Date.now(),
      isActive: wallets.length === 0, // Primera wallet es activa por defecto
      version: this.CURRENT_VERSION
    };

    wallets.push(newWallet);
    this.saveWallets(wallets);
    
    if (newWallet.isActive) {
      this.setActiveWallet(newWallet.id);
    }
    
    return newWallet;
  }

  /**
   * Generar ID seguro para wallet
   */
  private static generateSecureId(): string {
    const timestamp = Date.now().toString();
    const random = EncryptionService.generateSecureToken();
    return `wallet_${timestamp}_${random.substring(0, 16)}`;
  }

  /**
   * Obtener wallet activa con validación
   */
  static getActiveWallet(): WalletAccount | null {
    try {
      const activeId = localStorage.getItem(this.ACTIVE_KEY);
      if (!activeId) return null;
      
      const wallets = this.getWallets();
      const wallet = wallets.find(w => w.id === activeId);
      
      if (wallet) {
        // Actualizar último uso
        wallet.lastUsed = Date.now();
        this.saveWallets(wallets);
      }
      
      return wallet || null;
    } catch (error) {
      console.error('Error getting active wallet:', error);
      return null;
    }
  }

  /**
   * Establecer wallet activa con validación
   */
  static setActiveWallet(id: string): void {
    if (!id || typeof id !== 'string') {
      throw new Error('ID de wallet inválido');
    }
    
    const wallets = this.getWallets();
    const wallet = wallets.find(w => w.id === id);
    
    if (!wallet) {
      throw new Error('Wallet no encontrada');
    }

    // Desactivar todas
    wallets.forEach(w => w.isActive = false);
    
    // Activar la seleccionada
    wallet.isActive = true;
    wallet.lastUsed = Date.now();
    
    this.saveWallets(wallets);
    localStorage.setItem(this.ACTIVE_KEY, id);
  }

  /**
   * Actualizar nombre de wallet con validación
   */
  static updateWalletName(id: string, name: string): void {
    if (!name || name.length === 0 || name.length > 50) {
      throw new Error('Nombre inválido (1-50 caracteres)');
    }
    
    const sanitizedName = EncryptionService.sanitizeInput(name.trim());
    const wallets = this.getWallets();
    const wallet = wallets.find(w => w.id === id);
    
    if (!wallet) {
      throw new Error('Wallet no encontrada');
    }
    
    // Verificar que no exista otra wallet con el mismo nombre
    const existingName = wallets.find(w => w.id !== id && w.name.toLowerCase() === sanitizedName.toLowerCase());
    if (existingName) {
      throw new Error('Ya existe una wallet con este nombre');
    }

    wallet.name = sanitizedName;
    this.saveWallets(wallets);
  }

  /**
   * Eliminar wallet con validaciones de seguridad
   */
  static deleteWallet(id: string): void {
    const wallets = this.getWallets();
    const walletToDelete = wallets.find(w => w.id === id);
    
    if (!walletToDelete) {
      throw new Error('Wallet no encontrada');
    }
    
    const filtered = wallets.filter(w => w.id !== id);
    
    if (filtered.length === 0) {
      throw new Error('No puedes eliminar la última wallet');
    }

    this.saveWallets(filtered);
    
    // Si era la activa, activar la más reciente
    const activeId = localStorage.getItem(this.ACTIVE_KEY);
    if (activeId === id && filtered.length > 0) {
      // Ordenar por último uso y activar la más reciente
      const mostRecent = filtered.sort((a, b) => b.lastUsed - a.lastUsed)[0];
      this.setActiveWallet(mostRecent.id);
    }
  }

  /**
   * Guardar wallets de forma segura
   */
  private static saveWallets(wallets: WalletAccount[]): void {
    try {
      // Validar todas las wallets antes de guardar
      const validWallets = wallets.filter(wallet => this.isValidWallet(wallet));
      
      if (validWallets.length !== wallets.length) {
        console.warn('Some invalid wallets were filtered out');
      }
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(validWallets));
    } catch (error) {
      throw new Error('Error guardando wallets: ' + (error as Error).message);
    }
  }

  /**
   * Migrar wallet antigua al nuevo sistema con validación
   */
  static migrateOldWallet(): void {
    try {
      const oldWallet = localStorage.getItem('pol_wallet_data');
      if (!oldWallet) return;

      const wallets = this.getWallets();
      if (wallets.length > 0) return; // Ya migrado

      const parsed = JSON.parse(oldWallet);
      
      // Validar datos de la wallet antigua
      if (!parsed.address || !parsed.encryptedPrivateKey) {
        console.error('Invalid old wallet data');
        return;
      }
      
      if (!EncryptionService.isValidEthereumAddress(parsed.address)) {
        console.error('Invalid address in old wallet');
        return;
      }
      
      this.addWallet(
        'Main Wallet',
        parsed.address,
        parsed.encryptedPrivateKey,
        parsed.encryptedMnemonic,
        parsed.hasMnemonic || false
      );

      console.log('Old wallet migrated successfully');
    } catch (error) {
      console.error('Error migrating old wallet:', error);
    }
  }

  /**
   * Obtener estadísticas de wallets
   */
  static getWalletStats(): {
    totalWallets: number;
    activeWallet: string | null;
    oldestWallet: number;
    newestWallet: number;
  } {
    const wallets = this.getWallets();
    const activeWallet = this.getActiveWallet();
    
    return {
      totalWallets: wallets.length,
      activeWallet: activeWallet?.name || null,
      oldestWallet: wallets.length > 0 ? Math.min(...wallets.map(w => w.createdAt)) : 0,
      newestWallet: wallets.length > 0 ? Math.max(...wallets.map(w => w.createdAt)) : 0
    };
  }

  /**
   * Limpiar wallets inválidas
   */
  static cleanupInvalidWallets(): number {
    const wallets = this.getWallets();
    const validWallets = wallets.filter(wallet => this.isValidWallet(wallet));
    const removedCount = wallets.length - validWallets.length;
    
    if (removedCount > 0) {
      this.saveWallets(validWallets);
      console.log(`Removed ${removedCount} invalid wallets`);
    }
    
    return removedCount;
  }
}
