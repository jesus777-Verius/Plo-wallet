import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import CryptoJS from 'crypto-js';

// Rate limiting
export const createRateLimit = (windowMs: number = 15 * 60 * 1000, max: number = 100) => {
    return rateLimit({
        windowMs,
        max,
        message: {
            error: 'Demasiadas peticiones, intenta más tarde',
            retryAfter: Math.ceil(windowMs / 1000)
        },
        standardHeaders: true,
        legacyHeaders: false
    });
};

// Helmet para headers de seguridad
export const securityHeaders = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "https://polygon-rpc.com", "https://1rpc.io"],
            fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"]
        }
    },
    crossOriginEmbedderPolicy: false
});

// Middleware de autenticación JWT
export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ 
            success: false, 
            error: 'Token de acceso requerido' 
        });
    }

    jwt.verify(token, process.env.JWT_SECRET!, (err: any, user: any) => {
        if (err) {
            return res.status(403).json({ 
                success: false, 
                error: 'Token inválido o expirado' 
            });
        }
        (req as any).user = user;
        next();
    });
};

// Utilidades de encriptación
export class EncryptionUtils {
    private static readonly ALGORITHM = 'AES';
    
    static encryptPrivateKey(privateKey: string, password: string): string {
        const key = CryptoJS.PBKDF2(password, 'pol_wallet_salt', {
            keySize: 256/32,
            iterations: 10000
        });
        
        return CryptoJS.AES.encrypt(privateKey, key.toString()).toString();
    }
    
    static decryptPrivateKey(encryptedKey: string, password: string): string {
        try {
            const key = CryptoJS.PBKDF2(password, 'pol_wallet_salt', {
                keySize: 256/32,
                iterations: 10000
            });
            
            const bytes = CryptoJS.AES.decrypt(encryptedKey, key.toString());
            return bytes.toString(CryptoJS.enc.Utf8);
        } catch (error) {
            throw new Error('Error desencriptando private key');
        }
    }
}

// Utilidades de hash de contraseñas
export class PasswordUtils {
    static async hashPassword(password: string): Promise<string> {
        const saltRounds = 12;
        return await bcrypt.hash(password, saltRounds);
    }
    
    static async verifyPassword(password: string, hash: string): Promise<boolean> {
        return await bcrypt.compare(password, hash);
    }
}

// Utilidades JWT
export class JWTUtils {
    static generateAccessToken(userId: string, address: string): string {
        return jwt.sign(
            { userId, address },
            process.env.JWT_SECRET!,
            { expiresIn: '15m' }
        );
    }
    
    static generateRefreshToken(userId: string): string {
        return jwt.sign(
            { userId },
            process.env.JWT_REFRESH_SECRET!,
            { expiresIn: '7d' }
        );
    }
    
    static verifyRefreshToken(token: string): any {
        return jwt.verify(token, process.env.JWT_REFRESH_SECRET!);
    }
}

// Validación de entrada
export const validateWalletAddress = (address: string): boolean => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
};

export const validateAmount = (amount: string): boolean => {
    const num = parseFloat(amount);
    return !isNaN(num) && num > 0 && num < 1000000;
};

export const validatePrivateKey = (privateKey: string): boolean => {
    return /^0x[a-fA-F0-9]{64}$/.test(privateKey);
};

// Middleware de validación
export const validateTransaction = (req: Request, res: Response, next: NextFunction) => {
    const { to, amount } = req.body;
    
    if (!validateWalletAddress(to)) {
        return res.status(400).json({
            success: false,
            error: 'Dirección de destino inválida'
        });
    }
    
    if (!validateAmount(amount)) {
        return res.status(400).json({
            success: false,
            error: 'Cantidad inválida'
        });
    }
    
    next();
};

// Logging de seguridad
export const logSecurityEvent = (event: string, details: any, req: Request) => {
    console.log(`[SECURITY] ${new Date().toISOString()} - ${event}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        ...details
    });
};