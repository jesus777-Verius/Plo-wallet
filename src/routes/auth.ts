import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { PasswordUtils, JWTUtils, EncryptionUtils, logSecurityEvent } from '../middleware/security';

const router = Router();

// Almacenamiento temporal (en producción usar base de datos)
const users = new Map<string, {
    id: string;
    passwordHash: string;
    encryptedPrivateKey?: string;
    address?: string;
    createdAt: Date;
    lastLogin?: Date;
}>();

const refreshTokens = new Set<string>();

// Registro/Configuración inicial
router.post('/setup', [
    body('password').isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres'),
    body('privateKey').optional().matches(/^0x[a-fA-F0-9]{64}$/).withMessage('Private key inválida')
], async (req: Request, res: Response) => {
    try {
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
            // Derivar address del private key (simplificado)
            address = privateKey; // En producción, derivar correctamente
        }

        // Guardar usuario
        users.set(userId, {
            id: userId,
            passwordHash,
            encryptedPrivateKey,
            address,
            createdAt: new Date()
        });

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

        // Buscar usuario (simplificado - en producción usar base de datos)
        let user;
        for (const [id, userData] of users.entries()) {
            if (await PasswordUtils.verifyPassword(password, userData.passwordHash)) {
                user = userData;
                break;
            }
        }

        if (!user) {
            logSecurityEvent('LOGIN_FAILED', { reason: 'invalid_password' }, req);
            return res.status(401).json({
                success: false,
                error: 'Credenciales inválidas'
            });
        }

        // Generar tokens
        const accessToken = JWTUtils.generateAccessToken(user.id, user.address || '');
        const refreshToken = JWTUtils.generateRefreshToken(user.id);

        refreshTokens.add(refreshToken);

        // Actualizar último login
        user.lastLogin = new Date();

        logSecurityEvent('LOGIN_SUCCESS', { userId: user.id }, req);

        res.json({
            success: true,
            data: {
                accessToken,
                refreshToken,
                user: {
                    id: user.id,
                    address: user.address,
                    hasWallet: !!user.encryptedPrivateKey
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
        const user = users.get(decoded.userId);

        if (!user) {
            return res.status(403).json({
                success: false,
                error: 'Usuario no encontrado'
            });
        }

        const newAccessToken = JWTUtils.generateAccessToken(user.id, user.address || '');

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
], (req: Request, res: Response) => {
    const { refreshToken } = req.body;
    refreshTokens.delete(refreshToken);

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
        const userId = (req as any).user?.userId;

        const user = users.get(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'Usuario no encontrado'
            });
        }

        // Verificar contraseña actual
        const isValidPassword = await PasswordUtils.verifyPassword(currentPassword, user.passwordHash);
        if (!isValidPassword) {
            logSecurityEvent('PASSWORD_CHANGE_FAILED', { userId, reason: 'invalid_current_password' }, req);
            return res.status(401).json({
                success: false,
                error: 'Contraseña actual incorrecta'
            });
        }

        // Hash nueva contraseña
        const newPasswordHash = await PasswordUtils.hashPassword(newPassword);

        // Re-encriptar private key con nueva contraseña si existe
        if (user.encryptedPrivateKey) {
            const decryptedKey = EncryptionUtils.decryptPrivateKey(user.encryptedPrivateKey, currentPassword);
            user.encryptedPrivateKey = EncryptionUtils.encryptPrivateKey(decryptedKey, newPassword);
        }

        user.passwordHash = newPasswordHash;

        // Invalidar todos los refresh tokens
        for (const token of refreshTokens) {
            try {
                const decoded = JWTUtils.verifyRefreshToken(token);
                if (decoded.userId === userId) {
                    refreshTokens.delete(token);
                }
            } catch (e) {
                // Token ya inválido
            }
        }

        logSecurityEvent('PASSWORD_CHANGED', { userId }, req);

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

export default router;