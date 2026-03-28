import { EncryptionService } from './EncryptionService';

export interface Contact {
  id: string;
  name: string;
  address: string;
  note?: string;
  createdAt: number;
  lastUsed?: number;
  version: string;
}

export class AddressBook {
  private static STORAGE_KEY = 'pol_address_book';
  private static MAX_CONTACTS = 100; // Límite de contactos
  private static MAX_NAME_LENGTH = 50;
  private static MAX_NOTE_LENGTH = 200;
  private static CURRENT_VERSION = '2.0';

  /**
   * Obtener todos los contactos con validación
   */
  static getContacts(): Contact[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      if (!data) return [];
      
      const contacts = JSON.parse(data);
      
      // Validar estructura de datos
      if (!Array.isArray(contacts)) {
        console.error('Invalid contacts data structure');
        return [];
      }
      
      // Filtrar contactos válidos
      return contacts.filter(contact => this.isValidContact(contact));
    } catch (error) {
      console.error('Error loading contacts:', error);
      return [];
    }
  }

  /**
   * Validar estructura de contacto
   */
  private static isValidContact(contact: any): boolean {
    return (
      contact &&
      typeof contact.id === 'string' &&
      typeof contact.name === 'string' &&
      typeof contact.address === 'string' &&
      EncryptionService.isValidEthereumAddress(contact.address) &&
      contact.name.length > 0 &&
      contact.name.length <= this.MAX_NAME_LENGTH &&
      (!contact.note || contact.note.length <= this.MAX_NOTE_LENGTH)
    );
  }

  /**
   * Agregar nuevo contacto con validaciones de seguridad
   */
  static addContact(name: string, address: string, note?: string): Contact {
    // Validar y sanitizar inputs
    if (!name || typeof name !== 'string') {
      throw new Error('Nombre es requerido');
    }
    
    const sanitizedName = EncryptionService.sanitizeInput(name.trim());
    if (sanitizedName.length === 0 || sanitizedName.length > this.MAX_NAME_LENGTH) {
      throw new Error(`Nombre debe tener entre 1 y ${this.MAX_NAME_LENGTH} caracteres`);
    }
    
    if (!address || !EncryptionService.isValidEthereumAddress(address)) {
      throw new Error('Dirección de Ethereum inválida');
    }
    
    let sanitizedNote = '';
    if (note) {
      sanitizedNote = EncryptionService.sanitizeInput(note.trim());
      if (sanitizedNote.length > this.MAX_NOTE_LENGTH) {
        throw new Error(`Nota no puede exceder ${this.MAX_NOTE_LENGTH} caracteres`);
      }
    }
    
    const contacts = this.getContacts();
    
    // Verificar límite de contactos
    if (contacts.length >= this.MAX_CONTACTS) {
      throw new Error(`Máximo ${this.MAX_CONTACTS} contactos permitidos`);
    }
    
    // Verificar si ya existe la dirección
    const existingAddress = contacts.find(c => c.address.toLowerCase() === address.toLowerCase());
    if (existingAddress) {
      throw new Error('Esta dirección ya está en tus contactos');
    }
    
    // Verificar si ya existe el nombre
    const existingName = contacts.find(c => c.name.toLowerCase() === sanitizedName.toLowerCase());
    if (existingName) {
      throw new Error('Ya existe un contacto con este nombre');
    }

    const newContact: Contact = {
      id: this.generateSecureId(),
      name: sanitizedName,
      address: address,
      note: sanitizedNote || undefined,
      createdAt: Date.now(),
      lastUsed: Date.now(),
      version: this.CURRENT_VERSION
    };

    contacts.push(newContact);
    this.saveContacts(contacts);
    return newContact;
  }

  /**
   * Generar ID seguro para contacto
   */
  private static generateSecureId(): string {
    const timestamp = Date.now().toString();
    const random = EncryptionService.generateSecureToken();
    return `contact_${timestamp}_${random.substring(0, 16)}`;
  }

  /**
   * Actualizar contacto con validaciones
   */
  static updateContact(id: string, updates: Partial<Contact>): void {
    if (!id || typeof id !== 'string') {
      throw new Error('ID de contacto inválido');
    }
    
    const contacts = this.getContacts();
    const index = contacts.findIndex(c => c.id === id);
    
    if (index === -1) {
      throw new Error('Contacto no encontrado');
    }

    // Validar actualizaciones
    if (updates.name !== undefined) {
      const sanitizedName = EncryptionService.sanitizeInput(updates.name.trim());
      if (sanitizedName.length === 0 || sanitizedName.length > this.MAX_NAME_LENGTH) {
        throw new Error(`Nombre debe tener entre 1 y ${this.MAX_NAME_LENGTH} caracteres`);
      }
      
      // Verificar nombre duplicado
      const existingName = contacts.find(c => c.id !== id && c.name.toLowerCase() === sanitizedName.toLowerCase());
      if (existingName) {
        throw new Error('Ya existe un contacto con este nombre');
      }
      
      updates.name = sanitizedName;
    }
    
    if (updates.address !== undefined) {
      if (!EncryptionService.isValidEthereumAddress(updates.address)) {
        throw new Error('Dirección de Ethereum inválida');
      }
      
      // Verificar dirección duplicada
      const existingAddress = contacts.find(c => c.id !== id && c.address.toLowerCase() === updates.address!.toLowerCase());
      if (existingAddress) {
        throw new Error('Esta dirección ya está en tus contactos');
      }
    }
    
    if (updates.note !== undefined) {
      const sanitizedNote = EncryptionService.sanitizeInput(updates.note.trim());
      if (sanitizedNote.length > this.MAX_NOTE_LENGTH) {
        throw new Error(`Nota no puede exceder ${this.MAX_NOTE_LENGTH} caracteres`);
      }
      updates.note = sanitizedNote || undefined;
    }

    contacts[index] = { ...contacts[index], ...updates, lastUsed: Date.now() };
    this.saveContacts(contacts);
  }

  /**
   * Eliminar contacto
   */
  static deleteContact(id: string): void {
    if (!id || typeof id !== 'string') {
      throw new Error('ID de contacto inválido');
    }
    
    const contacts = this.getContacts();
    const filtered = contacts.filter(c => c.id !== id);
    
    if (filtered.length === contacts.length) {
      throw new Error('Contacto no encontrado');
    }
    
    this.saveContacts(filtered);
  }

  /**
   * Buscar contacto por dirección
   */
  static findByAddress(address: string): Contact | undefined {
    if (!address || !EncryptionService.isValidEthereumAddress(address)) {
      return undefined;
    }
    
    const contacts = this.getContacts();
    const contact = contacts.find(c => c.address.toLowerCase() === address.toLowerCase());
    
    if (contact) {
      // Actualizar último uso
      contact.lastUsed = Date.now();
      this.saveContacts(contacts);
    }
    
    return contact;
  }

  /**
   * Buscar contactos por nombre con sanitización
   */
  static searchByName(query: string): Contact[] {
    if (!query || typeof query !== 'string') {
      return [];
    }
    
    const sanitizedQuery = EncryptionService.sanitizeInput(query.trim().toLowerCase());
    if (sanitizedQuery.length === 0) {
      return [];
    }
    
    const contacts = this.getContacts();
    return contacts.filter(c => c.name.toLowerCase().includes(sanitizedQuery));
  }

  /**
   * Guardar contactos de forma segura
   */
  private static saveContacts(contacts: Contact[]): void {
    try {
      // Validar todos los contactos antes de guardar
      const validContacts = contacts.filter(contact => this.isValidContact(contact));
      
      if (validContacts.length !== contacts.length) {
        console.warn('Some invalid contacts were filtered out');
      }
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(validContacts));
    } catch (error) {
      throw new Error('Error guardando contactos: ' + (error as Error).message);
    }
  }

  /**
   * Obtener estadísticas de contactos
   */
  static getContactStats(): {
    totalContacts: number;
    recentlyUsed: number;
    oldestContact: number;
    newestContact: number;
  } {
    const contacts = this.getContacts();
    const now = Date.now();
    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    
    const recentlyUsed = contacts.filter(c => 
      c.lastUsed && (now - c.lastUsed) < oneWeek
    ).length;
    
    return {
      totalContacts: contacts.length,
      recentlyUsed,
      oldestContact: contacts.length > 0 ? Math.min(...contacts.map(c => c.createdAt)) : 0,
      newestContact: contacts.length > 0 ? Math.max(...contacts.map(c => c.createdAt)) : 0
    };
  }

  /**
   * Limpiar contactos inválidos
   */
  static cleanupInvalidContacts(): number {
    const contacts = this.getContacts();
    const validContacts = contacts.filter(contact => this.isValidContact(contact));
    const removedCount = contacts.length - validContacts.length;
    
    if (removedCount > 0) {
      this.saveContacts(validContacts);
      console.log(`Removed ${removedCount} invalid contacts`);
    }
    
    return removedCount;
  }

  /**
   * Exportar contactos (para backup)
   */
  static exportContacts(): string {
    const contacts = this.getContacts();
    return JSON.stringify({
      version: this.CURRENT_VERSION,
      exportDate: Date.now(),
      contacts: contacts
    }, null, 2);
  }

  /**
   * Importar contactos (desde backup)
   */
  static importContacts(data: string): number {
    try {
      const parsed = JSON.parse(data);
      
      if (!parsed.contacts || !Array.isArray(parsed.contacts)) {
        throw new Error('Formato de datos inválido');
      }
      
      const currentContacts = this.getContacts();
      let importedCount = 0;
      
      for (const contact of parsed.contacts) {
        if (this.isValidContact(contact)) {
          // Verificar si ya existe
          const exists = currentContacts.find(c => 
            c.address.toLowerCase() === contact.address.toLowerCase()
          );
          
          if (!exists && currentContacts.length + importedCount < this.MAX_CONTACTS) {
            currentContacts.push({
              ...contact,
              id: this.generateSecureId(), // Nuevo ID para evitar conflictos
              createdAt: Date.now(),
              version: this.CURRENT_VERSION
            });
            importedCount++;
          }
        }
      }
      
      if (importedCount > 0) {
        this.saveContacts(currentContacts);
      }
      
      return importedCount;
    } catch (error) {
      throw new Error('Error importando contactos: ' + (error as Error).message);
    }
  }
}
