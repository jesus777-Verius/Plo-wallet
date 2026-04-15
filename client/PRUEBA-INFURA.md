# Prueba de Conexión Infura

## Configuración Actual

**API Key**: `fc798e29ba4c4a778a4bca2a363b4bb4`

**URL RPC**: `https://polygon-mainnet.infura.io/v3/fc798e29ba4c4a778a4bca2a363b4bb4`

**Gas API**: `https://gas.api.infura.io/v3/fc798e29ba4c4a778a4bca2a363b4bb4`

## Implementación

### 1. RPC Provider (rpc.ts)
```typescript
const INFURA_RPC_URL = `https://polygon-mainnet.infura.io/v3/${INFURA_API_KEY}`;
const provider = new ethers.JsonRpcProvider(INFURA_RPC_URL);
```

### 2. Gas API (GasEstimator.ts)
```typescript
const GAS_API_URL = `https://gas.api.infura.io/v3/${INFURA_API_KEY}`;
const response = await fetch(`${GAS_API_URL}/networks/137/suggestedGasFees`);
```

## Prueba Manual con cURL

```bash
# Obtener número de bloque actual
curl --url https://polygon-mainnet.infura.io/v3/fc798e29ba4c4a778a4bca2a363b4bb4 \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'

# Obtener precios de gas
curl https://gas.api.infura.io/v3/fc798e29ba4c4a778a4bca2a363b4bb4/networks/137/suggestedGasFees
```

## Verificación en la App

1. Abre la consola del navegador (F12)
2. Ejecuta:
```javascript
// Verificar que la API key está cargada
console.log('API Key:', import.meta.env.VITE_INFURA_API_KEY);

// Probar conexión RPC
const provider = new ethers.JsonRpcProvider('https://polygon-mainnet.infura.io/v3/fc798e29ba4c4a778a4bca2a363b4bb4');
const blockNumber = await provider.getBlockNumber();
console.log('Bloque actual:', blockNumber);

// Probar Gas API
const response = await fetch('https://gas.api.infura.io/v3/fc798e29ba4c4a778a4bca2a363b4bb4/networks/137/suggestedGasFees');
const gasData = await response.json();
console.log('Precios de gas:', gasData);
```

## Funcionalidades Implementadas

✅ RPC Provider usando Infura exclusivamente
✅ Gas API para estimaciones precisas de gas
✅ CSP headers actualizados para permitir conexiones
✅ Singleton pattern para reutilizar conexiones
✅ Validación de red (Chain ID 137 = Polygon)
✅ Fallback automático si Gas API falla

## Archivos Modificados

- `client/.env` - API key configurada
- `client/src/config/rpc.ts` - Provider con Infura
- `client/src/services/GasEstimator.ts` - Integración Gas API
- `client/index.html` - CSP headers
- `client/vite.config.ts` - CSP headers para dev/preview

## Próximos Pasos

1. Reinicia el servidor de desarrollo:
   ```bash
   cd client
   npm run dev
   ```

2. Limpia el cache del navegador:
   ```javascript
   localStorage.clear();
   sessionStorage.clear();
   location.reload();
   ```

3. Prueba crear una wallet y hacer transacciones

## Notas de Seguridad

- La API key está en `.env` (no se sube a Git)
- Solo se usa HTTPS
- CSP headers restringen conexiones solo a Infura
- Validación de Chain ID para evitar redes incorrectas
