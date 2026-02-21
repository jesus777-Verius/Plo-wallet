# 🚀 Guía de Despliegue Seguro - POL Wallet

## ⚠️ IMPORTANTE: Mejoras de Seguridad Requeridas

### 1. HTTPS Obligatorio
```bash
# Usar certificados SSL/TLS
# Nunca desplegar sin HTTPS en producción
```

### 2. Encriptación de Private Keys
```javascript
// Implementar encriptación AES-256
const CryptoJS = require('crypto-js');

function encryptPrivateKey(privateKey, password) {
    return CryptoJS.AES.encrypt(privateKey, password).toString();
}

function decryptPrivateKey(encryptedKey, password) {
    const bytes = CryptoJS.AES.decrypt(encryptedKey, password);
    return bytes.toString(CryptoJS.enc.Utf8);
}
```

### 3. Autenticación JWT Segura
```javascript
// Implementar JWT con refresh tokens
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

// Hash seguro de contraseñas
const hashPassword = async (password) => {
    return await bcrypt.hash(password, 12);
};
```

### 4. Rate Limiting
```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100 // máximo 100 requests por IP
});
```

## 🌐 Opciones de Despliegue

### Opción 1: Vercel + Railway (Recomendado)

#### Frontend (Vercel)
```bash
# 1. Instalar Vercel CLI
npm i -g vercel

# 2. Desplegar frontend
cd public
vercel --prod
```

#### Backend (Railway)
```bash
# 1. Crear cuenta en Railway.app
# 2. Conectar repositorio
# 3. Configurar variables de entorno
```

### Opción 2: VPS Completo (Más Control)

#### Configuración de Servidor
```bash
# 1. Servidor Ubuntu/CentOS
# 2. Instalar Node.js, PM2, Nginx
# 3. Configurar SSL con Let's Encrypt
# 4. Configurar firewall

# Instalar dependencias
sudo apt update
sudo apt install nodejs npm nginx certbot
npm install -g pm2

# Configurar SSL
sudo certbot --nginx -d tudominio.com
```

#### Nginx Configuration
```nginx
server {
    listen 443 ssl;
    server_name tudominio.com;
    
    ssl_certificate /etc/letsencrypt/live/tudominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tudominio.com/privkey.pem;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 🔐 Variables de Entorno para Producción

```env
# .env.production
NODE_ENV=production
PORT=3000
POLYGON_RPC_URL=https://polygon-mainnet.infura.io/v3/TU_API_KEY
JWT_SECRET=tu_jwt_secret_muy_seguro_aqui
ENCRYPTION_KEY=tu_clave_de_encriptacion_aes256
ALLOWED_ORIGINS=https://tudominio.com
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=900000
```

## 🛡️ Checklist de Seguridad

### Antes de Desplegar:
- [ ] HTTPS configurado
- [ ] Private keys encriptadas con AES-256
- [ ] Contraseñas hasheadas con bcrypt
- [ ] JWT con refresh tokens
- [ ] Rate limiting implementado
- [ ] CORS configurado correctamente
- [ ] Variables de entorno seguras
- [ ] Logs de seguridad activados
- [ ] Backup de configuración

### Después de Desplegar:
- [ ] Probar todas las funcionalidades
- [ ] Verificar HTTPS funciona
- [ ] Probar con pequeñas cantidades primero
- [ ] Configurar monitoreo
- [ ] Documentar accesos y credenciales

## 💰 Costos Estimados

### Opción Gratuita (Limitada)
- **Vercel**: Gratis (con límites)
- **Railway**: $5/mes
- **Total**: ~$5/mes

### Opción VPS (Recomendada)
- **DigitalOcean Droplet**: $6-12/mes
- **Dominio**: $10-15/año
- **SSL**: Gratis (Let's Encrypt)
- **Total**: ~$8-15/mes

## ⚡ Pasos Rápidos para Desplegar

### 1. Preparar Código
```bash
# Clonar y preparar
git clone tu-repo
cd pol-wallet
npm install
npm run build
```

### 2. Configurar Seguridad
```bash
# Instalar dependencias de seguridad
npm install bcrypt jsonwebtoken crypto-js express-rate-limit helmet cors
```

### 3. Desplegar
```bash
# Opción A: Vercel + Railway
vercel --prod

# Opción B: VPS
pm2 start dist/index.js --name "pol-wallet"
pm2 startup
pm2 save
```

## 🚨 ADVERTENCIAS IMPORTANTES

1. **NUNCA uses la versión actual en producción sin las mejoras de seguridad**
2. **SIEMPRE prueba con cantidades pequeñas primero**
3. **MANTÉN backups de tus private keys fuera de la aplicación**
4. **USA dominios HTTPS únicamente**
5. **CONFIGURA monitoreo y alertas**
6. **ACTUALIZA dependencias regularmente**

## 📞 Soporte

Si necesitas ayuda con el despliegue:
1. Revisa los logs de error
2. Verifica configuración de red
3. Confirma variables de entorno
4. Prueba conexión a Polygon RPC