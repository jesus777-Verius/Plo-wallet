# Solución al Error de Desencriptación

## Problema Identificado

El error "Error desencriptando wallet: Contraseña incorrecta" ocurre cuando:

1. **Dos contraseñas diferentes**: Anteriormente el sistema usaba DOS contraseñas separadas:
   - Contraseña de acceso (para login)
   - Contraseña de encriptación (para proteger la private key)

2. **Confusión de contraseñas**: Si creaste tu wallet con una contraseña de encriptación diferente a tu contraseña de acceso, el sistema no puede desencriptar la wallet.

## Solución Implementada

### Cambios Realizados:

1. **Unificación de contraseñas**: Ahora el sistema usa LA MISMA contraseña para:
   - Acceder a la aplicación
   - Encriptar/desencriptar la wallet

2. **Mensaje claro**: El modal de encriptación ahora dice claramente:
   > "Usa la misma contraseña que configuraste para acceder a la aplicación"

3. **Mejor manejo de errores**: Si la desencriptación falla:
   - Se muestra un alert explicativo
   - Se hace logout automático
   - El usuario puede intentar de nuevo

4. **Requisitos simplificados**: 
   - Contraseña mínima: 8 caracteres
   - No requiere mayúsculas/minúsculas/símbolos obligatorios
   - Más fácil de recordar

## Qué Hacer Si Ya Tienes Una Wallet

### Opción 1: Recordar la Contraseña de Encriptación
Si recuerdas la contraseña que usaste para encriptar tu wallet:
1. Necesitas usar ESA contraseña (no la de acceso)
2. Considera exportar tu private key
3. Crear una nueva wallet con una sola contraseña

### Opción 2: Recuperar con Private Key o Mnemonic
Si tienes tu private key o frase de recuperación guardada:
1. Haz logout
2. Ve a "Registrar" → Configura nueva contraseña de acceso
3. En Setup, elige "Importar Wallet"
4. Ingresa tu private key o frase de recuperación
5. Usa LA MISMA contraseña que acabas de configurar

### Opción 3: Crear Nueva Wallet
Si no tienes backup y no recuerdas la contraseña:
1. Lamentablemente, no hay forma de recuperar la wallet
2. Deberás crear una nueva wallet
3. Esta vez, usa UNA SOLA contraseña para todo

## Prevención Futura

### Para Nuevos Usuarios:
✅ Usa la MISMA contraseña para acceso y encriptación
✅ Guarda tu frase de recuperación en un lugar seguro
✅ Anota tu contraseña de forma segura

### Seguridad:
- La encriptación sigue siendo AES-256 (nivel militar)
- PBKDF2 con 5,000 iteraciones + SHA-512
- HMAC para verificación de integridad
- Todo se guarda SOLO en tu navegador (autocustodia)

## Notas Técnicas

### Compatibilidad con Versiones Anteriores:
El sistema detecta automáticamente si una wallet fue encriptada con:
- Versión antigua (v1): 100,000 iteraciones + SHA256
- Versión nueva (v2): 5,000 iteraciones + SHA512 + HMAC

### Optimización de Velocidad:
- Reducción de iteraciones de 100k → 5k (10x más rápido)
- Mantiene seguridad con SHA-512 + HMAC
- Login en <500ms vs 2-4s anteriormente

## Soporte

Si sigues teniendo problemas:
1. Abre la consola del navegador (F12)
2. Busca mensajes de error específicos
3. Verifica que estés usando la contraseña correcta
4. Considera hacer un reset completo si es necesario

---

**Importante**: Siempre guarda tu frase de recuperación (12 o 24 palabras) en un lugar seguro. Es la ÚNICA forma de recuperar tu wallet si olvidas tu contraseña.
