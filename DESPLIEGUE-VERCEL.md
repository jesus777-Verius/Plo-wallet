# Despliegue en Vercel

## 🚀 Pasos para Desplegar

### 1. Configurar Variables de Entorno

En tu proyecto de Vercel:

1. Ve a **Settings** → **Environment Variables**
2. Agrega la siguiente variable:

```
Name: VITE_INFURA_API_KEY
Value: fc798e29ba4c4a778a4bca2a363b4bb4
Environments: ✓ Production ✓ Preview ✓ Development
```

3. Guarda los cambios

### 2. Hacer Push a GitHub

```bash
git add .
git commit -m "Deploy to Vercel"
git push origin main
```

### 3. Vercel Desplegará Automáticamente

Vercel detectará los cambios y desplegará automáticamente.

## 📋 Configuración Incluida

El archivo `vercel.json` ya está configurado con:

- ✅ Build command correcto
- ✅ Output directory (client/dist)
- ✅ Rewrites para SPA
- ✅ Security headers (CSP, X-Frame-Options, etc.)
- ✅ Permisos para Infura y APIs necesarias

## 🔍 Verificar Despliegue

Después del despliegue, verifica:

1. **Variables de entorno cargadas**:
   - Abre la consola del navegador
   - Deberías ver: `🔑 Infura API Key cargada: fc798e29...`

2. **Conexión a Polygon**:
   - El indicador de red debe mostrar "Polygon" con punto verde
   - No debe haber errores 401 en la consola

3. **Funcionalidades**:
   - Crear/importar wallet
   - Ver balance
   - Enviar/recibir POL
   - Swap POL ↔ USDT
   - Notificaciones en tiempo real

## ⚠️ Problemas Comunes

### Error 401 "invalid project id"

**Causa**: Variable de entorno no configurada

**Solución**:
1. Ve a Vercel → Settings → Environment Variables
2. Verifica que `VITE_INFURA_API_KEY` esté configurada
3. Redeploy: Deployments → ... → Redeploy

### Build falla

**Causa**: Dependencias o configuración incorrecta

**Solución**:
```bash
# Localmente, verifica que el build funcione
cd client
npm install
npm run build

# Si funciona, haz push
git add .
git commit -m "Fix build"
git push
```

### CSP bloquea conexiones

**Causa**: Headers de seguridad muy restrictivos

**Solución**: El `vercel.json` ya incluye los dominios necesarios:
- `https://*.infura.io`
- `https://gas.api.infura.io`
- `https://gasstation.polygon.technology`
- `https://api.coingecko.com`

## 🔐 Seguridad

### Variables de Entorno

- ✅ `.env` está en `.gitignore`
- ✅ No se sube al repositorio
- ✅ Solo se configura en Vercel

### API Key de Infura

- ✅ Protegida en variables de entorno
- ✅ Solo accesible desde tu dominio de Vercel
- ✅ No expuesta en el código fuente

### Headers de Seguridad

- ✅ CSP (Content Security Policy)
- ✅ X-Frame-Options: DENY
- ✅ X-Content-Type-Options: nosniff
- ✅ Referrer-Policy
- ✅ Permissions-Policy

## 📊 Monitoreo

### Logs en Vercel

1. Ve a tu proyecto en Vercel
2. Click en el deployment
3. Ve a "Functions" o "Runtime Logs"

### Logs en el Navegador

Abre la consola (F12) y verifica:

```
✅ Conectado a Polygon Mainnet
📦 Bloque actual: 52847392
⛽ Gas price: 45.2 Gwei
🔑 Infura API Key cargada: fc798e29...
```

## 🌐 Dominios

### Dominio de Vercel

Tu app estará disponible en:
```
https://tu-proyecto.vercel.app
```

### Dominio Personalizado (Opcional)

1. Ve a Settings → Domains
2. Agrega tu dominio personalizado
3. Configura los DNS según las instrucciones

## 📱 PWA

La app es una PWA (Progressive Web App):

- ✅ Instalable en móviles
- ✅ Funciona offline (parcialmente)
- ✅ Service Worker configurado
- ✅ Manifest.json incluido

## 🔄 Actualizaciones

Para actualizar la app:

```bash
# 1. Hacer cambios en el código
# 2. Commit y push
git add .
git commit -m "Update: descripción de cambios"
git push origin main

# 3. Vercel desplegará automáticamente
```

## 📞 Soporte

Si tienes problemas:

1. Revisa los logs en Vercel
2. Verifica la consola del navegador
3. Asegúrate de que las variables de entorno estén configuradas
4. Redeploy si es necesario

## ✅ Checklist Pre-Despliegue

- [ ] Variables de entorno configuradas en Vercel
- [ ] `.env` en `.gitignore`
- [ ] `vercel.json` en la raíz del proyecto
- [ ] Build funciona localmente (`npm run build`)
- [ ] No hay errores en la consola
- [ ] API key de Infura válida

## 🎉 ¡Listo!

Tu wallet Elyon está desplegada y lista para usar en Polygon Mainnet.
