# Sistema de Notificaciones en Tiempo Real

## Campana de Notificaciones 🔔

La app ahora tiene un sistema completo de notificaciones que detecta automáticamente cuando envías o recibes dinero.

## Características

### 1. Detección Automática
- ✅ Detecta transacciones entrantes (cuando recibes POL)
- ✅ Detecta transacciones salientes (cuando envías POL)
- ✅ Actualización en tiempo real sin recargar
- ✅ Notificaciones del navegador

### 2. Campana en el Header
```
┌─────────────────────────────┐
│  🔔 (3)  📖  🔄  🔒  ⚙️    │
│  ↑                          │
│  Badge con contador         │
└─────────────────────────────┘
```

**Ubicación:** Header del wallet, primera posición
**Badge rojo:** Muestra cantidad de notificaciones no leídas
**Animación:** Pulsa cuando hay notificaciones nuevas

### 3. Dropdown de Notificaciones

Al hacer clic en la campana se abre un dropdown con:

```
┌──────────────────────────────┐
│ Notificaciones      ✓  🗑️   │
├──────────────────────────────┤
│ ↓ Recibiste POL              │
│   0.5000 POL                 │
│   14:32:15            🔗     │
├──────────────────────────────┤
│ ↑ Enviaste POL               │
│   1.2500 POL                 │
│   14:28:42            🔗     │
└──────────────────────────────┘
```

**Elementos:**
- ✓ Marcar todas como leídas
- 🗑️ Limpiar todas
- ↓ Icono verde para transacciones entrantes
- ↑ Icono naranja para transacciones salientes
- 🔗 Link a PolygonScan para ver detalles

### 4. Notificaciones del Navegador

Cuando recibes o envías POL, aparece una notificación del sistema:

```
┌─────────────────────────────┐
│ Elyon Wallet                │
│ Recibiste 0.5000 POL        │
└─────────────────────────────┘
```

**Requisitos:**
- Permiso de notificaciones del navegador
- Se solicita automáticamente al cargar la app

## Cómo Funciona

### 1. Listener en Tiempo Real
```typescript
listenToIncomingTransactions(wallet.address, (tx) => {
  // Se ejecuta automáticamente cuando hay una transacción
  const isIncoming = tx.to === wallet.address;
  const amount = ethers.formatEther(tx.value);
  
  // Crear notificación
  addNotification({
    type: isIncoming ? 'incoming' : 'outgoing',
    amount,
    hash: tx.hash,
    timestamp: Date.now()
  });
});
```

### 2. Detección de Transacciones
```typescript
// Escucha cada nuevo bloque
wsProvider.on('block', async (blockNumber) => {
  const block = await wsProvider.getBlock(blockNumber, true);
  
  // Busca transacciones a tu dirección
  for (const tx of block.transactions) {
    if (tx.to === wallet.address) {
      // ¡Transacción entrante detectada!
      notifyUser(tx);
    }
  }
});
```

### 3. Almacenamiento Local
```typescript
// Guarda últimas 10 notificaciones
const [notifications, setNotifications] = useState<Notification[]>([]);

// Agrega nueva notificación al inicio
setNotifications(prev => [newNotif, ...prev].slice(0, 10));
```

## Estados de Notificación

### No Leída
- Fondo púrpura claro
- Badge rojo en la campana
- Contador actualizado

### Leída
- Fondo normal
- Sin badge
- Contador en 0

## Tipos de Notificación

### Incoming (Entrante)
```typescript
{
  type: 'incoming',
  icon: '↓',
  color: 'green',
  message: 'Recibiste POL'
}
```

### Outgoing (Saliente)
```typescript
{
  type: 'outgoing',
  icon: '↑',
  color: 'orange',
  message: 'Enviaste POL'
}
```

## Acciones Disponibles

### 1. Marcar como Leída
```typescript
const markAllAsRead = () => {
  setNotifications(prev => 
    prev.map(n => ({ ...n, read: true }))
  );
  setUnreadCount(0);
};
```

### 2. Limpiar Todas
```typescript
const clearAll = () => {
  setNotifications([]);
  setUnreadCount(0);
};
```

### 3. Ver en PolygonScan
```typescript
<a href={`https://polygonscan.com/tx/${hash}`} target="_blank">
  Ver detalles
</a>
```

## Permisos del Navegador

### Solicitar Permiso
```typescript
if ('Notification' in window) {
  Notification.requestPermission().then(permission => {
    if (permission === 'granted') {
      // Puede mostrar notificaciones
    }
  });
}
```

### Mostrar Notificación
```typescript
new Notification('Elyon Wallet', {
  body: 'Recibiste 0.5000 POL',
  icon: '/matic-logo.png',
  badge: '/matic-logo.png'
});
```

## Estilos

### Campana
- Tamaño: 40x40px
- Fondo: Transparente con borde
- Hover: Púrpura con escala 1.05
- Badge: Rojo con animación de pulso

### Dropdown
- Ancho: 360px
- Altura máxima: 500px
- Scroll: Personalizado púrpura
- Backdrop: Blur 10px

### Notificación Item
- Padding: 16px 20px
- Hover: Fondo claro
- No leída: Fondo púrpura
- Transición: 0.05s

## Optimizaciones

### 1. Límite de Notificaciones
```typescript
// Solo guarda últimas 10
.slice(0, 10)
```

### 2. Filtro de Cantidad
```typescript
// Solo notifica si amount > 0
if (parseFloat(amount) > 0) {
  notify();
}
```

### 3. Debouncing
```typescript
// Evita duplicados por hash
if (!notifications.find(n => n.id === tx.hash)) {
  addNotification();
}
```

## Casos de Uso

### Recibir Pago
1. Alguien te envía 1 POL
2. WebSocket detecta la transacción
3. Aparece badge rojo con "1"
4. Notificación del navegador
5. Sonido (opcional)
6. Dropdown muestra "Recibiste 1.0000 POL"

### Enviar Pago
1. Envías 0.5 POL a alguien
2. Transacción se confirma
3. Badge se actualiza
4. Notificación "Enviaste 0.5000 POL"
5. Link a PolygonScan disponible

### Múltiples Transacciones
1. Recibes 3 transacciones
2. Badge muestra "3"
3. Dropdown lista las 3
4. Click en ✓ marca todas como leídas
5. Badge desaparece

## Troubleshooting

### Notificaciones no aparecen
```javascript
// Verificar permiso
console.log(Notification.permission); // Debe ser "granted"

// Verificar listener
console.log('Listener activo:', !!unsubscribe);
```

### Badge no actualiza
```javascript
// Verificar contador
console.log('Unread count:', unreadCount);

// Forzar actualización
setUnreadCount(notifications.filter(n => !n.read).length);
```

### Dropdown no abre
```javascript
// Verificar estado
console.log('Show dropdown:', showDropdown);

// Toggle manual
setShowDropdown(true);
```

## Próximas Mejoras

- [ ] Sonido personalizado para notificaciones
- [ ] Filtros por tipo (entrante/saliente)
- [ ] Búsqueda de notificaciones
- [ ] Exportar historial
- [ ] Notificaciones para tokens (USDT, USDC)
- [ ] Notificaciones de swap completado
- [ ] Configuración de notificaciones (on/off)
- [ ] Vibración en móviles

## Compatibilidad

### Navegadores
- ✅ Chrome/Edge: Full support
- ✅ Firefox: Full support
- ✅ Safari: Full support (iOS 16+)
- ✅ Opera: Full support

### Plataformas
- ✅ Desktop: Windows, Mac, Linux
- ✅ Mobile: Android, iOS (PWA)
- ✅ Tablet: iPad, Android tablets

## Referencias

- Notification API: https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API
- WebSocket Events: https://docs.ethers.org/v6/api/providers/#WebSocketProvider
- PolygonScan: https://polygonscan.com/
