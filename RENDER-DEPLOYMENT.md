# 🚀 Guía de Despliegue en Render (GRATIS)

## ✅ **SÍ, podrás enviar y recibir dinero real desde Render**

Tu wallet estará conectada a **Polygon Mainnet** y manejará **POL/MATIC real**.

## 📋 **Pasos para Desplegar en Render**

### **1. Preparar tu Repositorio**

```bash
# 1. Crear repositorio en GitHub
git init
git add .
git commit -m "POL Wallet lista para Render"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/pol-wallet.git
git push -u origin main
```

### **2. Crear Cuenta en Render**

1. Ve a [render.com](https://render.com)
2. Regístrate con tu cuenta de GitHub
3. Conecta tu repositorio

### **3. Configurar el Servicio**

1. **New Web Service**
2. **Connect Repository**: Selecciona tu repo `pol-wallet`
3. **Configuración**:
   - **Name**: `pol-wallet`
   - **Environment**: `Node`
   - **Region**: `Oregon (US West)` (más rápido)
   - **Branch**: `main`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`

### **4. Variables de Entorno**

En la sección **Environment**, agrega:

```
NODE_ENV=production
POLYGON_RPC_URL=https://1rpc.io/matic
JWT_SECRET=[Render generará automáticamente]
JWT_REFRESH_SECRET=[Render generará automáticamente]
ENCRYPTION_SALT=[Render generará automáticamente]
```

### **5. Configurar Disco Persistente**

1. En **Settings** → **Disks**
2. **Add Disk**:
   - **Name**: `pol-wallet-data`
   - **Mount Path**: `/opt/render/project/src/data`
   - **Size**: `1 GB` (gratis)

### **6. Desplegar**

1. Click **Create Web Service**
2. Render automáticamente:
   - Clonará tu repo
   - Instalará dependencias
   - Compilará TypeScript
   - Iniciará tu aplicación

## 🔗 **Acceder a tu Wallet**

Una vez desplegado, tendrás:
- **URL**: `https://pol-wallet-XXXX.onrender.com`
- **SSL**: Automático y gratis
- **Uptime**: 24/7 (con limitaciones en plan gratuito)

## ⚠️ **Limitaciones del Plan Gratuito**

### **Render Free Tier:**
- ✅ **SSL gratis** incluido
- ✅ **750 horas/mes** de uso
- ✅ **1GB disco persistente**
- ⚠️ **Se duerme después de 15 min** sin actividad
- ⚠️ **Tarda ~30 segundos** en despertar
- ⚠️ **Reinicio automático** cada 24-48 horas

### **¿Afecta el envío/recepción de dinero?**
- ✅ **Recibir dinero**: NO afecta (la blockchain siempre funciona)
- ⚠️ **Enviar dinero**: Puede tardar 30 seg si está dormida
- ✅ **Datos seguros**: El disco persistente mantiene todo

## 🔄 **Mantener la Wallet Activa**

### **Opción 1: Ping Automático (Gratis)**
```javascript
// Agregar a tu código (opcional)
setInterval(() => {
    fetch('https://tu-wallet.onrender.com/health')
        .catch(() => {}); // Mantiene activa
}, 14 * 60 * 1000); // Cada 14 minutos
```

### **Opción 2: Upgrade a Paid ($7/mes)**
- Sin límite de tiempo activa
- Sin reinicios automáticos
- Mejor rendimiento

## 🔒 **Seguridad en Render**

### **Automático:**
- ✅ HTTPS con certificado SSL
- ✅ Firewall integrado
- ✅ Aislamiento de contenedores
- ✅ Actualizaciones de seguridad

### **Tu configuración:**
- ✅ Private keys encriptadas con AES-256
- ✅ Contraseñas hasheadas con bcrypt
- ✅ JWT con secrets seguros
- ✅ Rate limiting activado

## 📱 **Usar tu Wallet**

### **Primera vez:**
1. Ve a `https://tu-wallet.onrender.com`
2. Configura tu contraseña maestra
3. Crea o importa tu wallet
4. ¡Listo para usar!

### **Siguientes veces:**
1. Ingresa tu contraseña
2. Accede a tu wallet
3. Envía/recibe POL real

## 🆙 **Actualizar tu Wallet**

```bash
# Hacer cambios en tu código
git add .
git commit -m "Actualización"
git push

# Render automáticamente redesplegará
```

## 🚨 **Importante para Producción**

### **Antes de usar con dinero real:**
1. **Prueba todo** con cantidades pequeñas
2. **Guarda backup** de tu private key fuera de la app
3. **Anota tu URL** de Render
4. **Configura contraseña fuerte**

### **Recomendaciones:**
- Empieza con $1-5 para probar
- Usa la wallet desde dispositivos seguros
- No compartas tu URL con nadie
- Considera upgrade a plan pagado para uso frecuente

## 💡 **Troubleshooting**

### **Si la wallet no carga:**
1. Espera 30 segundos (puede estar despertando)
2. Refresca la página
3. Verifica que el servicio esté activo en Render

### **Si pierdes acceso:**
1. Tu private key está segura en el disco persistente
2. Solo necesitas tu contraseña maestra
3. Los datos persisten entre reinicios

## 🎯 **¿Listo para desplegar?**

1. ✅ Código preparado para Render
2. ✅ Configuración automática
3. ✅ Seguridad implementada
4. ✅ Disco persistente configurado

**Solo necesitas:**
1. Subir código a GitHub
2. Conectar con Render
3. Configurar variables de entorno
4. ¡Desplegar!

¿Necesitas ayuda con algún paso específico?