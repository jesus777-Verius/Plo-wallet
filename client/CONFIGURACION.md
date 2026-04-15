# 🔧 Configuración de la Aplicación

## Variables de Entorno

### VITE_INFURA_API_KEY

**Descripción:** API key de Infura para acceso prioritario a los RPCs de Polygon.

**¿Es obligatoria?** No. La aplicación funciona perfectamente sin ella usando RPCs públicos.

**¿Por qué usarla?**
- ✅ Mejor rendimiento y velocidad
- ✅ Mayor confiabilidad (99.9% uptime)
- ✅ Sin límites de rate limiting (en plan gratuito: 100k requests/día)
- ✅ Prioridad en la cola de requests
- ✅ Soporte técnico de Infura

### Cómo Obtener tu API Key de Infura

1. **Regístrate en Infura:**
   - Ve a [https://infura.io/](https://infura.io/)
   - Crea una cuenta gratuita
   - Verifica tu email

2. **Crea un Proyecto:**
   - En el dashboard, haz clic en "Create New Key"
   - Selecciona "Web3 API"
   - Dale un nombre a tu proyecto (ej: "Elyon Wallet")
   - Haz clic en "Create"

3. **Obtén tu API Key:**
   - En la página del proyecto, verás tu "API Key"
   - Copia la API key (formato: `3547687b36d94be0a21a7c34b2d5e3e7`)

4. **Configura la Variable de Entorno:**
   ```bash
   # En la carpeta client/
   cp .env.example .env
   ```
   
   Edita el archivo `.env`:
   ```env
   VITE_INFURA_API_KEY=tu_api_key_aqui
   ```

5. **Reinicia el Servidor:**
   ```bash
   npm run dev
   ```

### Verificar que Funciona

Abre la consola del navegador (F12) y busca el mensaje:
```
Conectado a RPC: https://polygon-mainnet.infura.io/v3/...
```

Si ves este mensaje, Infura está funcionando correctamente.

---

## RPCs Disponibles

La aplicación usa múltiples RPCs con fallback automático:

### Con Infura (Prioritario):
1. `https://polygon-mainnet.infura.io/v3/{API_KEY}` ⭐ (Prioritario)
2. `https://polygon-rpc.com`
3. `https://rpc-mainnet.matic.network`
4. `https://matic-mainnet.chainstacklabs.com`
5. `https://rpc-mainnet.maticvigil.com`
6. `https://polygon-bor-rpc.publicnode.com`

### RPCs de Respaldo:
7. `https://polygon.llamarpc.com`
8. `https://polygon.blockpi.network/v1/rpc/public`

### Sistema de Fallback:
- Si un RPC falla, automáticamente prueba el siguiente
- Health checks cada 60 segundos
- Solo usa RPCs que respondan en <10 segundos
- Verifica que sea Polygon Mainnet (chainId: 137)

---

## Configuración Avanzada

### Cambiar el Puerto de Desarrollo

Por defecto, la app corre en el puerto 5173. Para cambiarlo:

```bash
npm run dev -- --port 3000
```

O edita `vite.config.ts`:
```typescript
export default defineConfig({
  server: {
    port: 3000
  }
})
```

### Configurar Proxy (Opcional)

Si necesitas un proxy para desarrollo, edita `vite.config.ts`:

```typescript
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true
      }
    }
  }
})
```

### Variables de Entorno por Ambiente

Puedes crear diferentes archivos `.env` para cada ambiente:

- `.env` - Variables por defecto
- `.env.local` - Variables locales (no se suben a Git)
- `.env.development` - Solo en desarrollo
- `.env.production` - Solo en producción

**Ejemplo `.env.production`:**
```env
VITE_INFURA_API_KEY=tu_api_key_de_produccion
```

---

## Seguridad

### ⚠️ IMPORTANTE: Protege tu API Key

1. **NUNCA subas el archivo `.env` a Git**
   - Ya está en `.gitignore`
   - Solo sube `.env.example`

2. **No compartas tu API key públicamente**
   - No la pongas en código
   - No la compartas en screenshots
   - No la publiques en foros

3. **Usa diferentes API keys para desarrollo y producción**
   - Crea proyectos separados en Infura
   - Facilita el debugging
   - Mejor control de uso

4. **Monitorea el uso de tu API key**
   - Revisa el dashboard de Infura regularmente
   - Configura alertas de uso
   - Rota la key si sospechas compromiso

### Regenerar API Key Comprometida

Si tu API key fue expuesta:

1. Ve al dashboard de Infura
2. Selecciona tu proyecto
3. Haz clic en "Settings"
4. Haz clic en "Regenerate API Key"
5. Actualiza tu archivo `.env` local
6. Reinicia el servidor

---

## Troubleshooting

### La app no usa Infura

**Problema:** La consola muestra RPCs públicos en lugar de Infura.

**Soluciones:**
1. Verifica que el archivo `.env` esté en `client/.env`
2. Verifica que la variable se llame `VITE_INFURA_API_KEY` (con el prefijo `VITE_`)
3. Reinicia el servidor de desarrollo (`Ctrl+C` y `npm run dev`)
4. Verifica que la API key sea válida en el dashboard de Infura

### Error: "Invalid API Key"

**Problema:** Infura rechaza la API key.

**Soluciones:**
1. Verifica que copiaste la API key completa
2. Verifica que no haya espacios al inicio o final
3. Verifica que el proyecto esté activo en Infura
4. Regenera la API key en el dashboard

### Error: "Rate Limit Exceeded"

**Problema:** Has excedido el límite de requests.

**Soluciones:**
1. Espera unos minutos (el límite se resetea)
2. Actualiza a un plan superior en Infura
3. La app automáticamente usará RPCs públicos como fallback

### RPCs públicos muy lentos

**Problema:** Los RPCs públicos tienen alta latencia.

**Soluciones:**
1. Configura Infura (recomendado)
2. Usa una VPN si estás en una región con mala conectividad
3. Verifica tu conexión a internet
4. Los RPCs públicos pueden estar saturados, intenta más tarde

---

## Mejores Prácticas

### Para Desarrollo:
- ✅ Usa Infura para desarrollo local
- ✅ Mantén `.env` en `.gitignore`
- ✅ Documenta las variables en `.env.example`
- ✅ Usa diferentes API keys para cada desarrollador

### Para Producción:
- ✅ Usa variables de entorno del hosting (Vercel, Netlify, etc.)
- ✅ Nunca hardcodees API keys en el código
- ✅ Monitorea el uso de la API
- ✅ Configura alertas de límite de uso

### Para Usuarios Finales:
- ✅ La app funciona sin configuración
- ✅ Los RPCs públicos son suficientes para uso normal
- ✅ Solo configura Infura si necesitas mejor rendimiento

---

## Recursos Adicionales

- [Documentación de Infura](https://docs.infura.io/)
- [Polygon RPC Endpoints](https://wiki.polygon.technology/docs/pos/reference/rpc-endpoints/)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [Infura Dashboard](https://infura.io/dashboard)

---

## Soporte

Si tienes problemas con la configuración:

1. Revisa este documento
2. Verifica los logs de la consola del navegador
3. Revisa el dashboard de Infura
4. Abre un issue en GitHub con los detalles

---

**Nota:** La configuración de Infura es completamente opcional. La aplicación está diseñada para funcionar perfectamente sin ella usando RPCs públicos gratuitos.
