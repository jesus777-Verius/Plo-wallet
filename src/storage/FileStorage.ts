import fs from 'fs/promises';
import path from 'path';
import { EncryptionUtils, PasswordUtils } from '../middleware/security';

export interface UserData {
    id: string;
    passwordHash: string;
    encryptedPrivateKey?: string;
    address?: string;
    createdAt: Date;
    lastLogin?: Date;
    settings: {
        autoLock: boolean;
        rememberSession: boolean;
        lockTimeout: number;
    };
}

export class FileStorage {
    private dataDir: string;
    private userFile: string;
    private sessionsFile: string;

    constructor() {
        // En Render, usar el disco persistente montado
        this.dataDir = process.env.NODE_ENV === 'production' 
            ? path.join(process.cwd(), 'data')
            : path.join(process.cwd(), 'data');
        this.userFile = path.join(this.dataDir, 'user.json');
        this.sessionsFile = path.join(this.dataDir, 'sessions.json');
        this.ensureDataDir();
    }

    private async ensureDataDir() {
        try {
            await fs.access(this.dataDir);
        } catch {
            await fs.mkdir(this.dataDir, { recursive: true, mode: 0o700 });
            console.log(`📁 Directorio de datos creado: ${this.dataDir}`);
        }
    }

    // Guardar datos del usuario (encriptados)
    async saveUser(userData: UserData, masterPassword: string): Promise<void> {
        try {
            await this.ensureDataDir();
            
            // Encriptar todos los datos sensibles
            const encryptedData = EncryptionUtils.encryptPrivateKey(
                JSON.stringify(userData), 
                masterPassword
            );

            const fileData = {
                data: encryptedData,
                timestamp: new Date().toISOString(),
                version: '2.0.0'
            };

            await fs.writeFile(this.userFile, JSON.stringify(fileData), { mode: 0o600 });
            console.log('💾 Datos de usuario guardados de forma segura');

        } catch (error: any) {
            console.error('❌ Error guardando usuario:', error);
            throw new Error(`Error guardando usuario: ${error.message}`);
        }
    }

    // Cargar datos del usuario
    async loadUser(masterPassword: string): Promise<UserData | null> {
        try {
            const fileContent = await fs.readFile(this.userFile, 'utf8');
            const { data } = JSON.parse(fileContent);
            
            const decryptedData = EncryptionUtils.decryptPrivateKey(data, masterPassword);
            const userData = JSON.parse(decryptedData);
            
            // Convertir fechas de string a Date
            userData.createdAt = new Date(userData.createdAt);
            if (userData.lastLogin) {
                userData.lastLogin = new Date(userData.lastLogin);
            }
            
            return userData;
            
        } catch (error: any) {
            if (error.code === 'ENOENT') {
                return null; // Archivo no existe
            }
            console.error('❌ Error cargando usuario:', error);
            throw new Error('Error desencriptando datos - contraseña incorrecta');
        }
    }

    // Verificar si existe configuración
    async hasUser(): Promise<boolean> {
        try {
            await fs.access(this.userFile);
            return true;
        } catch {
            return false;
        }
    }

    // Guardar sesiones activas
    async saveSessions(sessions: Set<string>): Promise<void> {
        try {
            await this.ensureDataDir();
            
            const sessionData = {
                sessions: Array.from(sessions),
                timestamp: new Date().toISOString()
            };
            
            await fs.writeFile(this.sessionsFile, JSON.stringify(sessionData), { mode: 0o600 });
        } catch (error) {
            console.error('❌ Error guardando sesiones:', error);
        }
    }

    // Cargar sesiones activas
    async loadSessions(): Promise<Set<string>> {
        try {
            const fileContent = await fs.readFile(this.sessionsFile, 'utf8');
            const { sessions, timestamp } = JSON.parse(fileContent);
            
            // Limpiar sesiones viejas (más de 7 días)
            const sessionAge = Date.now() - new Date(timestamp).getTime();
            const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 días
            
            if (sessionAge > maxAge) {
                console.log('🧹 Limpiando sesiones viejas');
                return new Set();
            }
            
            return new Set(sessions);
        } catch {
            return new Set();
        }
    }

    // Limpiar datos (reset completo)
    async clearAll(): Promise<void> {
        try {
            await fs.unlink(this.userFile).catch(() => {});
            await fs.unlink(this.sessionsFile).catch(() => {});
            console.log('🗑️ Todos los datos eliminados');
        } catch (error) {
            console.error('❌ Error limpiando datos:', error);
        }
    }

    // Crear backup
    async createBackup(masterPassword: string): Promise<string> {
        try {
            const userData = await this.loadUser(masterPassword);
            if (!userData) throw new Error('No hay datos para respaldar');

            const backupData = {
                user: userData,
                timestamp: new Date().toISOString(),
                version: '2.0.0'
            };

            const backupFile = path.join(this.dataDir, `backup_${Date.now()}.json`);
            await fs.writeFile(backupFile, JSON.stringify(backupData, null, 2), { mode: 0o600 });
            
            console.log(`💾 Backup creado: ${backupFile}`);
            return backupFile;
        } catch (error: any) {
            throw new Error(`Error creando backup: ${error.message}`);
        }
    }

    // Restaurar desde backup
    async restoreFromBackup(backupFile: string, masterPassword: string): Promise<void> {
        try {
            const backupContent = await fs.readFile(backupFile, 'utf8');
            const { user } = JSON.parse(backupContent);
            
            await this.saveUser(user, masterPassword);
            console.log('✅ Backup restaurado exitosamente');
        } catch (error: any) {
            throw new Error(`Error restaurando backup: ${error.message}`);
        }
    }

    // Obtener estadísticas del almacenamiento
    async getStorageStats(): Promise<any> {
        try {
            const stats: any = {
                hasUser: await this.hasUser(),
                dataDir: this.dataDir,
                files: []
            };

            try {
                const files = await fs.readdir(this.dataDir);
                for (const file of files) {
                    const filePath = path.join(this.dataDir, file);
                    const stat = await fs.stat(filePath);
                    stats.files.push({
                        name: file,
                        size: stat.size,
                        modified: stat.mtime
                    });
                }
            } catch (e) {
                // Directorio no existe aún
            }

            return stats;
        } catch (error: any) {
            return { error: error.message };
        }
    }
}