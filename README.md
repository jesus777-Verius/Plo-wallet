# 💎 POL Wallet - Tu Wallet Personal para Polygon

Una wallet segura y moderna para manejar POL/MATIC en la red de Polygon, diseñada para uso personal con máxima seguridad.

## ✨ Características

- 🔐 **Seguridad Avanzada**: Encriptación AES-256, autenticación JWT, bcrypt
- 💰 **Dinero Real**: Conectada a Polygon Mainnet - envía y recibe POL real
- 🌐 **Desplegable en la Nube**: Optimizada para Render, Vercel, VPS
- 📱 **Interfaz Moderna**: Diseño responsive tipo mobile-first
- 🔒 **Sin Base de Datos**: Almacenamiento seguro en archivos encriptados
- ⚡ **Auto-bloqueo**: Protección automática por inactividad
- 💾 **Backups**: Sistema de respaldo automático

## 🚀 Despliegue Rápido en Render (GRATIS)

### 1. Preparar Repositorio
```bash
git init
git add .
git commit -m "POL Wallet lista para Render"
git remote add origin https://github.com/TU_USUARIO/pol-wallet.git
git push -u origin main
```

### 2. Desplegar en Render
1. Ve a [render.com](https://render.com) y regístrate
2. **New Web Service** → Conecta tu repositorio
3. **Configuración**:
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
   - Add Disk: `pol-wallet-data` → `/opt/render/project/src/data` (1GB)

### 3. Variables de Entorno
Render configurará automáticamente:
- `NODE_ENV=production`
- `POLYGON_RPC_URL=https://1rpc.io/matic`
- `JWT_SECRET` (auto-generado)
- `JWT_REFRESH_SECRET` (auto-generado)
- `ENCRYPTION_SALT` (auto-generado)

### 4. ¡Listo!
Tu wallet estará disponible en: `https://tu-wallet.onrender.com`

## 💻 Desarrollo Local

```bash
# Instalar dependencias
npm install

# Desarrollo
npm run dev

# Compilar
npm run build

# Producción
npm start
```

## 🔒 Seguridad

### Implementada:
- ✅ Private keys encriptadas con AES-256
- ✅ Contraseñas hasheadas con bcrypt (12 rounds)
- ✅ Autenticación JWT con refresh tokens
- ✅ Rate limiting (100 req/15min)
- ✅ Headers de seguridad (Helmet.js)
- ✅ CORS configurado
- ✅ Auto-bloqueo por inactividad
- ✅ Validación de entrada
- ✅ Logs de seguridad

### Recomendaciones:
- 🔐 Usa contraseñas fuertes (8+ caracteres)
- 💾 Guarda backup de private key fuera de la app
- 🌐 Accede solo desde dispositivos seguros
- 💰 Prueba con cantidades pequeñas primero

## 📱 Uso

### Primera vez:
1. Accede a tu wallet desplegada
2. **Configurar Seguridad** → Crea contraseña maestra
3. **Crear Wallet** o **Importar** con private key existente
4. ¡Listo para enviar/recibir POL real!

### Siguientes veces:
1. Ingresa tu contraseña maestra
2. Accede a tu wallet automáticamente
3. Gestiona tu POL de forma segura

## 🌐 Opciones de Despliegue

| Plataforma | Costo | Tiempo Setup | SSL | Recomendado |
|------------|-------|--------------|-----|-------------|
| **Render** | Gratis | 10 min | ✅ | ⭐⭐⭐⭐⭐ |
| Railway | $5/mes | 15 min | ✅ | ⭐⭐⭐⭐ |
| Vercel + Railway | $5/mes | 20 min | ✅ | ⭐⭐⭐ |
| VPS | $6-12/mes | 45 min | ✅ | ⭐⭐⭐⭐ |

## ⚠️ Limitaciones Render Gratuito

- Se duerme tras 15 min sin uso (tarda ~30s en despertar)
- 750 horas/mes de uso
- Reinicio automático cada 24-48h
- **NO afecta recepción de dinero** (blockchain siempre activa)
- **Datos seguros** en disco persistente

## 🔧 API Endpoints

### Autenticación
- `POST /api/auth/setup` - Configuración inicial
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/logout` - Cerrar sesión
- `POST /api/auth/change-password` - Cambiar contraseña

### Wallet
- `POST /api/wallet/create` - Crear nueva wallet
- `POST /api/wallet/import` - Importar wallet
- `GET /api/wallet/balance/:address` - Consultar balance
- `POST /api/wallet/send` - Enviar transacción
- `GET /api/wallet/transaction/:hash` - Info de transacción

## 📊 Tecnologías

- **Backend**: Node.js + Express + TypeScript
- **Frontend**: HTML5 + CSS3 + JavaScript
- **Blockchain**: ethers.js + Polygon Mainnet
- **Seguridad**: bcrypt + JWT + AES-256 + Helmet
- **Almacenamiento**: Archivos encriptados (sin DB)

## 🆘 Soporte

### Problemas Comunes:
- **Wallet no carga**: Espera 30s (puede estar despertando)
- **Transacción lenta**: Normal en plan gratuito
- **Olvidé contraseña**: Necesitarás tu private key para recuperar

### Logs:
```bash
# En Render, ve a tu servicio → Logs
# Localmente:
npm start
```

## 📄 Licencia

Uso personal únicamente. No redistribuir sin autorización.

## ⚡ Quick Start

```bash
# 1. Clonar y configurar
git clone https://github.com/TU_USUARIO/pol-wallet.git
cd pol-wallet
npm install

# 2. Desarrollo local
npm run dev
# Abre http://localhost:3000

# 3. Desplegar en Render
# Sigue la guía en RENDER-DEPLOYMENT.md
```

---

**⚠️ IMPORTANTE**: Esta wallet maneja dinero real. Úsala responsablemente y mantén tus private keys seguras.