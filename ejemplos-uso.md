# Ejemplos de Uso - Polygon Wallet

## 1. Verificar que el servidor esté funcionando
```bash
curl http://localhost:3000/health
```

## 2. Crear una nueva wallet
```bash
curl -X POST http://localhost:3000/api/wallet/create -H "Content-Type: application/json"
```

## 3. Importar wallet existente
```bash
curl -X POST http://localhost:3000/api/wallet/import \
  -H "Content-Type: application/json" \
  -d '{"privateKey": "0x1234567890123456789012345678901234567890123456789012345678901234"}'
```

## 4. Obtener balance de una dirección
```bash
curl http://localhost:3000/api/wallet/balance/0x2e988A386a799F506693793c6A5AF6B54dfAaBfB
```

## 5. Obtener información de la wallet actual
```bash
curl http://localhost:3000/api/wallet/info
```

## 6. Enviar transacción (requiere wallet con fondos)
```bash
curl -X POST http://localhost:3000/api/wallet/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "0x742d35Cc6634C0532925a3b8D400e5e5c8c8b8b8",
    "amount": "0.01",
    "gasLimit": "21000",
    "gasPrice": "20"
  }'
```

## 7. Consultar información de transacción
```bash
curl http://localhost:3000/api/wallet/transaction/0x123...
```

## Comandos PowerShell (Windows)

### Crear wallet
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/wallet/create" -Method POST -ContentType "application/json"
```

### Importar wallet
```powershell
$body = @{ privateKey = "0x1234567890123456789012345678901234567890123456789012345678901234" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3000/api/wallet/import" -Method POST -ContentType "application/json" -Body $body
```

### Obtener balance
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/wallet/balance/0x2e988A386a799F506693793c6A5AF6B54dfAaBfB" -Method GET
```

## Notas de Seguridad

⚠️ **IMPORTANTE**: 
- Esta es una wallet caliente para desarrollo/uso personal
- Nunca uses private keys de wallets con fondos importantes
- Guarda tus private keys de forma segura
- En producción, usa HTTPS y autenticación adicional