import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { createRateLimit, securityHeaders } from './middleware/security';
import walletRoutes from './routes/wallet';
import authRoutes from './routes/auth-file';

// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares de seguridad
app.use(securityHeaders);
app.use(createRateLimit());

// CORS configurado para producción
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
app.use(cors({
    origin: function (origin, callback) {
        // Permitir requests sin origin (mobile apps, etc.)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
            callback(null, true);
        } else {
            callback(new Error('No permitido por CORS'));
        }
    },
    credentials: true
}));

// Middlewares básicos
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, '../public')));

// Rutas principales
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/wallet', walletRoutes);

// Health check para Render
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'POL Wallet funcionando en Render',
        timestamp: new Date().toISOString(),
        version: '2.0.0'
    });
});

// Manejo de errores
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Error:', err);
    res.status(500).json({
        success: false,
        error: process.env.NODE_ENV === 'production' ? 'Error interno del servidor' : err.message
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint no encontrado'
    });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 POL Wallet corriendo en puerto ${PORT}`);
    console.log(`🌐 Modo: ${process.env.NODE_ENV || 'development'}`);
    console.log(`💎 Conectado a Polygon Mainnet`);
    console.log(`🔒 Seguridad: Activada`);
});

export default app;