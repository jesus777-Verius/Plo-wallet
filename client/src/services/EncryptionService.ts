import CryptoJS from 'crypto-js';

/**
 * Servicio de encriptación seguro para private keys
 * Usa AES-256 con derivación de clave PBKDF2
 */
export class EncryptionService {
  private static readonly ITERATIONS = 500000; // Aumentado para mayor seguridad
  private static readonly KEY_SIZE = 256 / 32; // 256 bits
  private static readonly MIN_PASSWORD_LENGTH = 12; // Contraseñas más fuertes
  
  /**
   * Encripta la private key con la contraseña del usuario
   */
  static encryptPrivateKey(privateKey: string, password: string): string {
    try {
      // Validar entrada
      if (!privateKey || !password) {
        throw new Error('Private key y contraseña son requeridos');
      }
      
      if (password.length < this.MIN_PASSWORD_LENGTH) {
        throw new Error(`La contraseña debe tener al menos ${this.MIN_PASSWORD_LENGTH} caracteres`);
      }
      
      // Generar salt aleatorio más grande
      const salt = CryptoJS.lib.WordArray.random(256 / 8); // 32 bytes
      
      // Derivar clave con PBKDF2 más fuerte
      const key = CryptoJS.PBKDF2(password, salt, {
        keySize: this.KEY_SIZE,
        iterations: this.ITERATIONS,
        hasher: CryptoJS.algo.SHA512 // Usar SHA-512
      });
      
      // Generar IV aleatorio
      const iv = CryptoJS.lib.WordArray.random(128 / 8);
      
      // Encriptar con AES-256-CBC
      const encrypted = CryptoJS.AES.encrypt(privateKey, key, {
        iv: iv,
        padding: CryptoJS.pad.Pkcs7,
        mode: CryptoJS.mode.CBC
      });
      
      // Generar HMAC para autenticación (ya que no tenemos GCM)
      const hmacKey = CryptoJS.PBKDF2(password + 'hmac', salt, {
        keySize: 256 / 32,
        iterations: this.ITERATIONS,
        hasher: CryptoJS.algo.SHA512
      });
      
      const hmac = CryptoJS.HmacSHA256(salt.toString() + iv.toString() + encrypted.toString(), hmacKey);
      
      // Combinar salt + iv + ciphertext + hmac con versión
      const version = 'v2:';
      const combined = version + salt.toString() + iv.toString() + encrypted.toString() + hmac.toString();
      
      // Limpiar memoria sensible
      this.clearSensitiveData([key, iv, hmacKey, hmac]);
      
      return combined;
    } catch (error) {
      throw new Error('Error encriptando private key: ' + (error as Error).message);
    }
  }
  
  /**
   * Desencripta la private key con la contraseña del usuario
   */
  static decryptPrivateKey(encryptedData: string, password: string): string {
    try {
      if (!encryptedData || !password) {
        throw new Error('Datos encriptados y contraseña son requeridos');
      }
      
      // Verificar versión
      let data = encryptedData;
      let iterations = this.ITERATIONS;
      let hasher = CryptoJS.algo.SHA512;
      let saltSize = 64; // 32 bytes = 64 hex chars
      let hasHmac = false;
      
      if (encryptedData.startsWith('v2:')) {
        data = encryptedData.substring(3);
        hasHmac = true;
      } else {
        // Compatibilidad con versión anterior
        iterations = 100000;
        hasher = CryptoJS.algo.SHA256;
        saltSize = 32; // 16 bytes = 32 hex chars
      }
      
      // Extraer salt
      const salt = CryptoJS.enc.Hex.parse(data.substr(0, saltSize));
      
      // Extraer IV
      const iv = CryptoJS.enc.Hex.parse(data.substr(saltSize, 32));
      
      let ciphertext, hmac;
      if (hasHmac) {
        // Extraer ciphertext y HMAC (HMAC son los últimos 64 caracteres)
        const remainingData = data.substring(saltSize + 32);
        ciphertext = remainingData.substring(0, remainingData.length - 64);
        hmac = remainingData.substring(remainingData.length - 64);
        
        // Verificar HMAC
        const hmacKey = CryptoJS.PBKDF2(password + 'hmac', salt, {
          keySize: 256 / 32,
          iterations: iterations,
          hasher: hasher
        });
        
        const expectedHmac = CryptoJS.HmacSHA256(salt.toString() + iv.toString() + ciphertext, hmacKey);
        
        if (hmac !== expectedHmac.toString()) {
          throw new Error('Datos corruptos o contraseña incorrecta (HMAC inválido)');
        }
      } else {
        // Extraer ciphertext (resto)
        ciphertext = data.substring(saltSize + 32);
      }
      
      // Derivar clave con PBKDF2
      const key = CryptoJS.PBKDF2(password, salt, {
        keySize: this.KEY_SIZE,
        iterations: iterations,
        hasher: hasher
      });
      
      // Desencriptar
      const decrypted = CryptoJS.AES.decrypt(ciphertext, key, {
        iv: iv,
        padding: CryptoJS.pad.Pkcs7,
        mode: CryptoJS.mode.CBC // Usar CBC consistentemente
      });
      
      const privateKey = decrypted.toString(CryptoJS.enc.Utf8);
      
      if (!privateKey || !this.isValidPrivateKey(privateKey)) {
        throw new Error('Contraseña incorrecta o datos corruptos');
      }
      
      // Limpiar memoria sensible
      this.clearSensitiveData([key, iv, decrypted]);
      
      return privateKey;
    } catch (error) {
      throw new Error('Error desencriptando private key - Contraseña incorrecta');
    }
  }
  
  /**
   * Hash seguro de contraseña con salt más fuerte
   */
  static hashPassword(password: string): string {
    if (password.length < this.MIN_PASSWORD_LENGTH) {
      throw new Error(`La contraseña debe tener al menos ${this.MIN_PASSWORD_LENGTH} caracteres`);
    }
    
    // Validar complejidad de contraseña
    if (!this.isStrongPassword(password)) {
      throw new Error('La contraseña debe contener mayúsculas, minúsculas, números y símbolos');
    }
    
    const salt = CryptoJS.lib.WordArray.random(256 / 8); // 32 bytes
    const hash = CryptoJS.PBKDF2(password, salt, {
      keySize: 512 / 32,
      iterations: this.ITERATIONS,
      hasher: CryptoJS.algo.SHA512
    });
    
    return 'v2:' + salt.toString() + hash.toString();
  }
  
  /**
   * Verifica contraseña contra hash
   */
  static verifyPassword(password: string, storedHash: string): boolean {
    try {
      let hash = storedHash;
      let iterations = this.ITERATIONS;
      let hasher = CryptoJS.algo.SHA512;
      let saltSize = 64;
      
      if (storedHash.startsWith('v2:')) {
        hash = storedHash.substring(3);
      } else {
        // Compatibilidad con versión anterior
        iterations = 100000;
        hasher = CryptoJS.algo.SHA256;
        saltSize = 32;
      }
      
      const salt = CryptoJS.enc.Hex.parse(hash.substr(0, saltSize));
      const originalHash = hash.substring(saltSize);
      
      const computedHash = CryptoJS.PBKDF2(password, salt, {
        keySize: 512 / 32,
        iterations: iterations,
        hasher: hasher
      });
      
      const result = computedHash.toString() === originalHash;
      
      // Limpiar memoria
      this.clearSensitiveData([computedHash]);
      
      return result;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Valida que la contraseña sea fuerte
   */
  static isStrongPassword(password: string): boolean {
    const minLength = this.MIN_PASSWORD_LENGTH;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSymbols = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
    
    return password.length >= minLength && hasUpperCase && hasLowerCase && hasNumbers && hasSymbols;
  }
  
  /**
   * Valida private key de Ethereum
   */
  static isValidPrivateKey(privateKey: string): boolean {
    return /^0x[a-fA-F0-9]{64}$/.test(privateKey) || /^[a-fA-F0-9]{64}$/.test(privateKey);
  }
  
  /**
   * Sanitiza input para prevenir XSS
   */
  static sanitizeInput(input: string): string {
    if (typeof input !== 'string') return '';
    
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }
  
  /**
   * Valida dirección de Ethereum con checksum
   */
  static isValidEthereumAddress(address: string): boolean {
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return false;
    }
    
    // Validar checksum si está presente
    if (address === address.toLowerCase() || address === address.toUpperCase()) {
      return true; // Sin checksum
    }
    
    // Validar checksum EIP-55
    return this.validateAddressChecksum(address);
  }
  
  /**
   * Valida checksum de dirección Ethereum (EIP-55)
   */
  private static validateAddressChecksum(address: string): boolean {
    const addr = address.slice(2);
    const hash = CryptoJS.SHA3(addr.toLowerCase()).toString();
    
    for (let i = 0; i < 40; i++) {
      const char = addr[i];
      const hashChar = hash[i];
      
      if (parseInt(hashChar, 16) >= 8) {
        if (char !== char.toUpperCase()) return false;
      } else {
        if (char !== char.toLowerCase()) return false;
      }
    }
    
    return true;
  }
  
  /**
   * Limpia datos sensibles de la memoria
   */
  private static clearSensitiveData(data: any[]): void {
    data.forEach(item => {
      if (item && typeof item === 'object') {
        try {
          // Intentar limpiar propiedades del objeto
          Object.keys(item).forEach(key => {
            if (item[key]) {
              item[key] = null;
            }
          });
        } catch (e) {
          // Ignorar errores de limpieza
        }
      }
    });
  }
  
  /**
   * Genera token seguro para sesiones
   */
  static generateSecureToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }
  
  /**
   * Valida entrada numérica para transacciones
   */
  static validateAmount(amount: string): boolean {
    if (!amount || typeof amount !== 'string') return false;
    
    const num = parseFloat(amount);
    return !isNaN(num) && num > 0 && num < Number.MAX_SAFE_INTEGER && /^\d+(\.\d+)?$/.test(amount);
  }
}
