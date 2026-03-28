# POL Wallet - Wallet de Autocustodia para Polygon

Una wallet web completa y segura para Polygon (POL) con encriptación AES-256, múltiples wallets, y todas las funcionalidades esenciales.

## 🚀 Inicio Rápido

### Instalación
```bash
cd client
npm install
```

### Desarrollo
```bash
npm run dev
```
La aplicación estará disponible en `http://localhost:5173`

### Producción
```bash
npm run build
npm run preview
```

## ✨ Características Principales

### 🔐 Seguridad Máxima
- **Encriptación AES-256**: Private keys y mnemonics encriptados
- **PBKDF2**: 100,000 iteraciones para derivación de claves
- **Autocustodia**: Tus claves nunca salen de tu navegador
- **Auto-lock**: Bloqueo automático después de inactividad
- **Sin Backend**: Todo funciona localmente

### 💼 Gestión de Wallets
- Crear wallets con mnemonic de 12 palabras
- Importar por private key o mnemonic
- Múltiples wallets en una sola aplicación
- Cambio rápido entre wallets
- Backup y exportación de claves

### 💸 Transacciones
- Enviar POL con estimación de gas en tiempo real
- Recibir con QR code
- Swap POL ↔ USDT vía QuickSwap DEX
- Historial de transacciones desde blockchain
- Validaciones completas

### 📚 Utilidades
- Libreta de direcciones con CRUD completo
- Búsqueda de contactos
- Integración en envíos
- Notas personalizadas

### 📊 Información Real
- Balance de POL y USDT desde blockchain
- Precio de POL desde CoinGecko
- Transacciones reales de Polygon
- Estimación de gas precisa
- Estado de red en tiempo real

## 📱 Uso de la Aplicación

### Primera Vez

1. **Configurar Seguridad**
   - Crear contraseña de acceso (8+ caracteres)
   - Elegir opciones de seguridad
   - Confirmar

2. **Crear o Importar Wallet**
   - **Crear Nueva**: Genera mnemonic automáticamente
   - **Importar Private Key**: Pega tu private key
   - **Importar Mnemonic**: Pega tus 12 palabras

3. **Encriptar Wallet**
   - Ingresar contraseña de encriptación
   - Confirmar
   - ¡Listo!

### Uso Diario

#### Enviar POL
1. Click en "Enviar"
2. Ingresar dirección (o usar libreta 📖)
3. Ingresar cantidad
4. Verificar estimación de gas
5. Confirmar

#### Recibir POL
1. Click en "Recibir"
2. Mostrar QR code o copiar dirección
3. Compartir con quien te enviará

#### Swap Tokens
1. Click en "Swap"
2. Seleccionar dirección (POL → USDT o viceversa)
3. Ingresar cantidad
4. Ver estimación
5. Confirmar swap

#### Ver Actividad
1. Click en "Actividad" (navegación inferior)
2. Ver historial de transacciones
3. Click en transacción para ver en PolygonScan

#### Gestionar Seguridad
1. Click en "Seguridad" (navegación inferior)
2. Ver private key o mnemonic
3. Cambiar contraseña
4. Configurar auto-lock
5. Reset completo (con confirmación)

#### Múltiples Wallets
1. Click en "Main Wallet" (header superior)
2. Ver lista de wallets
3. Agregar nueva wallet
4. Cambiar entre wallets
5. Renombrar o eliminar

#### Libreta de Direcciones
1. Click en icono de libreta 📖 (header)
2. Agregar contactos
3. Buscar contactos
4. Editar o eliminar
5. Usar en envíos

## 🛠️ Tecnologías

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Ethers.js v6** - Blockchain interactions
- **Vite** - Build tool
- **CryptoJS** - Encriptación AES-256
- **qrcode.react** - Generación de QR codes

## 📁 Estructura del Proyecto

```
client/
├── src/
│   ├── components/
│   │   ├── AuthScreen.tsx          # Login
│   │   ├── SetupScreen.tsx         # Crear/Importar wallet
│   │   ├── WalletScreen.tsx        # Pantalla principal
│   │   └── modals/
│   │       ├── SendModal.tsx       # Enviar POL
│   │       ├── ReceiveModal.tsx    # Recibir POL
│   │       ├── SwapModal.tsx       # Swap tokens
│   │       ├── SecurityModal.tsx   # Centro de seguridad
│   │       ├── SettingsModal.tsx   # Configuración
│   │       ├── ActivityModal.tsx   # Historial
│   │       ├── AddressBookModal.tsx # Libreta
│   │       └── WalletsModal.tsx    # Múltiples wallets
│   ├── services/
│   │   ├── EncryptionService.ts    # AES-256 encryption
│   │   ├── SecurityManager.ts      # Auth & sessions
│   │   ├── GasEstimator.ts         # Gas estimation
│   │   ├── AddressBook.ts          # Contacts management
│   │   └── WalletManager.ts        # Multi-wallet
│   ├── config/
│   │   ├── rpc.ts                  # Polygon RPC providers
│   │   └── tokens.ts               # Token contracts
│   ├── App.tsx                     # Main app
│   └── main.tsx                    # Entry point
├── FUNCIONALIDADES.md              # Features documentation
├── TESTING.md                      # Testing documentation
└── README.md                       # This file
```

## 🔒 Seguridad

### Qué se Encripta
- ✅ Private keys (AES-256)
- ✅ Mnemonics (AES-256)
- ✅ Contraseñas (PBKDF2 hash)

### Qué NO se Guarda
- ❌ Contraseñas en texto plano
- ❌ Private keys sin encriptar
- ❌ Mnemonics sin encriptar

### Dónde se Guardan los Datos
- **localStorage**: Datos encriptados de wallets
- **sessionStorage**: Token de sesión temporal
- **Memoria**: Private key desencriptada (solo durante sesión)

### Mejores Prácticas
1. Usa contraseñas fuertes (8+ caracteres)
2. Guarda tu mnemonic en lugar seguro
3. Activa auto-lock
4. No compartas tu private key
5. Verifica direcciones antes de enviar
6. Haz backup de tu mnemonic

## 🌐 Red Polygon

### Mainnet
- **Chain ID**: 137
- **RPC**: https://polygon-rpc.com
- **Explorer**: https://polygonscan.com

### Tokens Soportados
- **POL** (nativo)
- **USDT** (0xc2132D05D31c914a87C6611C10748AEb04B58e8F)

### DEX Integrado
- **QuickSwap**: Router V2 para swaps

## 📊 Datos en Tiempo Real

### Fuentes de Datos
- **Balance**: Polygon RPC
- **Transacciones**: Polygon blockchain
- **Precio POL**: CoinGecko API
- **Gas**: Polygon network
- **Tokens**: Smart contracts

### Actualización
- Balance: Cada 60 segundos
- Transacciones: Al abrir modal
- Precio: Al cargar
- Gas: En tiempo real al escribir

## 🐛 Troubleshooting

### La wallet no carga
- Verifica que tengas conexión a internet
- Revisa la consola del navegador
- Intenta refrescar la página

### Error al enviar transacción
- Verifica que tengas suficiente POL
- Verifica que la dirección sea válida
- Verifica que tengas gas suficiente

### No veo mis transacciones
- Espera unos segundos (carga desde blockchain)
- Verifica que estés en la wallet correcta
- Verifica conexión a Polygon RPC

### Olvidé mi contraseña
- Si tienes tu mnemonic: Reset completo e importa
- Si NO tienes backup: Fondos irrecuperables
- **IMPORTANTE**: Siempre guarda tu mnemonic

## 📄 Licencia

Este proyecto es de código abierto para fines educativos.

## ⚠️ Disclaimer

Esta wallet es para uso educativo. Úsala bajo tu propio riesgo. Los desarrolladores no son responsables por pérdida de fondos. Siempre haz backup de tus claves privadas y mnemonics.

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor:
1. Fork el proyecto
2. Crea una rama para tu feature
3. Commit tus cambios
4. Push a la rama
5. Abre un Pull Request

## 📞 Soporte

Para reportar bugs o sugerir features, abre un issue en el repositorio.

---

**Hecho con ❤️ para la comunidad Polygon**
