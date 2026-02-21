import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { PasswordUtils, JWTUtils, EncryptionUtils, logSecurityEvent } from '../middleware/security';
import { FileStorage, UserData } from '../storage/FileStorage';

const router = Router();
const storage = new FileStorage();

// Sesiones activas en memoria (se persisten en archivo)
let refreshTokens = new Set<string>();

// Cargar sesiones al iniciar
storage.loadSessions().then(sessions => {
    refreshTokens = sessions;
});

// Guardar sesiones periódicamente
setInterval(() => {
    storage.saveSessions(refreshTokens);
}, 60000); // Cada minuto

// Verificar si ya existe configuración
router.get('/status', async (req: Request, res: Response) => {
    try {
        const hasUser = await storage.hasUser();
        
        res.json({
            success: true,
            data: {
                configured: hasUser,
                requiresSetup: !hasUser
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Error verificando estado'
        });
    }
});

// Configuración inicial (solo si no existe usuario)
router.post('/setup', [
    body('password').isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres'),
    body('privateKey').optional().matches(/^0x[a-fA-F0-9]{64}$/).withMessage('Private key inválida')
], async (req: Request, res: Response) => {
    try {
        // Verificar si ya existe configuración
        const hasUser = await storage.hasUser();
        if (hasUser) {
            return res.status(400).json({
                success: false,
                error: 'Ya existe una configuración. Usa /reset para reiniciar.'
            });
        }

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { password, privateKey } = req.body;
        const userId = 'user_' + Date.now();

        // Hash de la contraseña
        const passwordHash = await PasswordUtils.hashPassword(password);

        // Encriptar private key si se proporciona
        let encryptedPrivateKey;
        let address;
        
        if (privateKey) {
            encryptedPrivateKey = EncryptionUtils.encryptPrivateKey(privateKey, password);
            // En una implementación real, derivarías la address del private key
            address = privateKey.slice(0, 42); // Simplificado
        }

        // Crear datos del usuario
        const userData: UserData = {
            id: userId,
            passwordHash,
            encryptedPrivateKey,
            address,
            createdAt: new Date(),
            settings: {
                autoLock: true,
                rememberSession: false,
                lockTimeout: 15 * 60 * 1000 // 15 minutos
            }
        };

        // Guardar de forma segura
        await storage.saveUser(userData, password);

        logSecurityEvent('USER_SETUP', { userId }, req);

        res.json({
            success: true,
            message: 'Configuración completada exitosamente'
        });

    } catch (error: any) {
        logSecurityEvent('SETUP_ERROR', { error: error.message }, req);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// Login
router.post('/login', [
    body('password').notEmpty().withMessage('Contraseña requerida')
], async (req: Request, res: Response) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { password } = req.body;

        // Intentar cargar usuario con la contraseña
        let userData: UserData | null;
        try {
            userData = await storage.loadUser(password);
            if (!userData) {
                throw new Error('Usuario no encontrado');
            }
        } catch (error: any) {
            logSecurityEvent('LOGIN_FAILED', { reason: 'invalid_password' }, req);
            return res.status(401).json({
                success: false,
                error: 'Credenciales inválidas'
            });
        }

        // Verificar hash de contraseña como segunda capa
        const isValidPassword = await PasswordUtils.verifyPassword(password, userData.passwordHash);
        if (!isValidPassword) {
            logSecurityEvent('LOGIN_FAILED', { reason: 'password_hash_mismatch' }, req);
            return res.status(401).json({
                success: false,
                error: 'Credenciales inválidas'
            });
        }

        // Generar tokens
        const accessToken = JWTUtils.generateAccessToken(userData.id, userData.address || '');
        const refreshToken = JWTUtils.generateRefreshToken(userData.id);

        refreshTokens.add(refreshToken);

        // Actualizar último login
        userData.lastLogin = new Date();
        await storage.saveUser(userData, password);

        logSecurityEvent('LOGIN_SUCCESS', { userId: userData.id }, req);

        res.json({
            success: true,
            data: {
                accessToken,
                refreshToken,
                user: {
                    id: userData.id,
                    address: userData.address,
                    hasWallet: !!userData.encryptedPrivateKey,
                    settings: userData.settings
                }
            }
        });

    } catch (error: any) {
        logSecurityEvent('LOGIN_ERROR', { error: error.message }, req);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// Refresh token
router.post('/refresh', [
    body('refreshToken').notEmpty().withMessage('Refresh token requerido')
], async (req: Request, res: Response) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshTokens.has(refreshToken)) {
            return res.status(403).json({
                success: false,
                error: 'Refresh token inválido'
            });
        }

        const decoded = JWTUtils.verifyRefreshToken(refreshToken);
        
        // Verificar que el usuario aún existe
        const hasUser = await storage.hasUser();
        if (!hasUser) {
            return res.status(403).json({
                success: false,
                error: 'Usuario no encontrado'
            });
        }

        const newAccessToken = JWTUtils.generateAccessToken(decoded.userId, '');

        res.json({
            success: true,
            data: {
                accessToken: newAccessToken
            }
        });

    } catch (error) {
        res.status(403).json({
            success: false,
            error: 'Refresh token inválido'
        });
    }
});

// Logout
router.post('/logout', [
    body('refreshToken').notEmpty().withMessage('Refresh token requerido')
], async (req: Request, res: Response) => {
    const { refreshToken } = req.body;
    refreshTokens.delete(refreshToken);
    
    // Guardar sesiones actualizadas
    await storage.saveSessions(refreshTokens);

    logSecurityEvent('LOGOUT', {}, req);

    res.json({
        success: true,
        message: 'Logout exitoso'
    });
});

// Cambiar contraseña
router.post('/change-password', [
    body('currentPassword').notEmpty().withMessage('Contraseña actual requerida'),
    body('newPassword').isLength({ min: 8 }).withMessage('La nueva contraseña debe tener al menos 8 caracteres')
], async (req: Request, res: Response) => {
    try {
        const { currentPassword, newPassword } = req.body;

        // Cargar usuario con contraseña actual
        let userData: UserData | null;
        try {
            userData = await storage.loadUser(currentPassword);
            if (!userData) {
                throw new Error('Contraseña incorrecta');
            }
        } catch (error: any) {
            logSecurityEvent('PASSWORD_CHANGE_FAILED', { reason: 'invalid_current_password' }, req);
            return res.status(401).json({
                success: false,
                error: 'Contraseña actual incorrecta'
            });
        }

        // Hash nueva contraseña
        const newPasswordHash = await PasswordUtils.hashPassword(newPassword);

        // Re-encriptar private key con nueva contraseña si existe
        if (userData.encryptedPrivateKey) {
            const decryptedKey = EncryptionUtils.decryptPrivateKey(userData.encryptedPrivateKey, currentPassword);
            userData.encryptedPrivateKey = EncryptionUtils.encryptPrivateKey(decryptedKey, newPassword);
        }

        userData.passwordHash = newPasswordHash;

        // Guardar con nueva contraseña
        await storage.saveUser(userData, newPassword);

        // Invalidar todos los refresh tokens
        refreshTokens.clear();
        await storage.saveSessions(refreshTokens);

        logSecurityEvent('PASSWORD_CHANGED', { userId: userData.id }, req);

        res.json({
            success: true,
            message: 'Contraseña cambiada exitosamente'
        });

    } catch (error: any) {
        logSecurityEvent('PASSWORD_CHANGE_ERROR', { error: error.message }, req);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// Reset completo (eliminar todo)
router.post('/reset', [
    body('confirmReset').equals('RESET').withMessage('Debes escribir RESET para confirmar')
], async (req: Request, res: Response) => {
    try {
        await storage.clearAll();
        refreshTokens.clear();

        logSecurityEvent('SYSTEM_RESET', {}, req);

        res.json({
            success: true,
            message: 'Sistema reseteado completamente'
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Error reseteando sistema'
        });
    }
});

// Crear backup
router.post('/backup', [
    body('password').notEmpty().withMessage('Contraseña requerida para backup')
], async (req: Request, res: Response) => {
    try {
        const { password } = req.body;
        
        const backupFile = await storage.createBackup(password);
        
        logSecurityEvent('BACKUP_CREATED', { backupFile }, req);

        res.json({
            success: true,
            message: 'Backup creado exitosamente',
            data: {
                backupFile: backupFile.split('/').pop() // Solo el nombre del archivo
            }
        });

    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

export default router;