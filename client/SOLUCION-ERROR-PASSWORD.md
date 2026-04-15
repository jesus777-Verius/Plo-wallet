# 🔧 Solución: Error de Contraseña Incorrecta

## Problema

Ves este error al intentar hacer login:
```
Error desencriptando wallet: Error: Contraseña incorrecta
```

## ¿Por qué ocurre?

Este error ocurre porque:

1. **Tienes una wallet guardada** con una contraseña de encriptación
2. **Estás usando una contraseña diferente** para hacer login
3. **La wallet no se puede desencriptar** con la contraseña incorrecta

## Soluciones

### Opción 1: Usar la Contraseña Correcta ✅

**Si recuerdas la contraseña que usaste al crear/importar la wallet:**

1. Haz clic en "Cancelar" cuando aparezca el mensaje de error
2. Intenta hacer login con la contraseña CORRECTA
3. La contraseña debe ser la MISMA que usaste cuando:
   - Creaste la wallet, O
   - Importaste la wallet

**Nota:** La contraseña de encriptación es la MISMA que la contraseña de login.

---

### Opción 2: Resetear la Aplicación ⚠️

**Si NO recuerdas la contraseña:**

1. Haz clic en "OK" cuando aparezca el mensaje de error
2. La aplicación se reseteará completamente
3. Perderás la wallet actual
4. Podrás crear una nueva wallet

**⚠️ ADVERTENCIA:** 
- Perderás acceso a la wallet actual
- Perderás todos los fondos si no tienes backup
- Solo hazlo si NO tienes fondos o tienes backup

---

### Opción 3: Recuperar con Backup 🔑

**Si tienes tu private key o frase de recuperación:**

1. Resetea la aplicación (Opción 2)
2. Crea una nueva contraseña de acceso
3. Ve a "Importar Wallet"
4. Ingresa tu private key o frase de recuperación
5. Usa la MISMA contraseña que acabas de crear

**Importante:** Guarda tu private key o frase de recuperación en un lugar seguro.

---

## Prevención Futura

### Para Evitar Este Problema:

1. **Usa UNA SOLA contraseña** para todo:
   - Login
   - Encriptación de wallet
   
2. **Guarda tu contraseña** en un lugar seguro:
   - Gestor de contraseñas (recomendado)
   - Papel en lugar seguro
   - NUNCA en archivos digitales sin encriptar

3. **Guarda tu backup** SIEMPRE:
   - Private key
   - Frase de recuperación (12 palabras)
   - Guárdalos en lugar seguro OFFLINE

---

## Cómo Funciona la Encriptación

### Sistema Actual:

```
1. Creas/Importas wallet
   ↓
2. Ingresas contraseña
   ↓
3. Wallet se encripta con esa contraseña
   ↓
4. Se guarda encriptada en localStorage
   ↓
5. Para acceder, necesitas LA MISMA contraseña
```

### Una Sola Contraseña:

- ✅ Contraseña de login = Contraseña de encriptación
- ✅ Más simple de recordar
- ✅ Menos confusión

---

## Resetear Manualmente (Avanzado)

Si prefieres resetear manualmente sin usar el botón:

### Opción A: Desde la Consola del Navegador

1. Abre la consola (F12)
2. Ejecuta:
```javascript
localStorage.clear();
sessionStorage.clear();
location.reload();
```

### Opción B: Desde Configuración del Navegador

1. Ve a Configuración → Privacidad
2. Busca "Borrar datos de navegación"
3. Selecciona "Cookies y datos de sitios"
4. Selecciona solo este sitio
5. Borra los datos

---

## Preguntas Frecuentes

### ¿Puedo recuperar mi wallet sin la contraseña?

**NO.** Si no tienes:
- La contraseña correcta, Y
- Tu private key o frase de recuperación

Entonces NO puedes recuperar la wallet. Por eso es CRÍTICO guardar backups.

### ¿La contraseña se puede cambiar?

**SÍ**, pero necesitas:
1. La contraseña actual (para desencriptar)
2. Luego puedes cambiarla desde Seguridad

### ¿Qué pasa con mis fondos si reseteo?

- Si NO tienes backup → **Pierdes los fondos** ❌
- Si tienes backup → **Puedes recuperarlos** ✅

### ¿Por qué no hay "recuperar contraseña"?

Porque la wallet es de **autocustodia**:
- No hay servidor central
- No hay "admin" que pueda resetear
- Solo TÚ tienes control (y responsabilidad)

---

## Mejores Prácticas

### Siempre:

1. ✅ **Guarda tu frase de recuperación** (12 palabras)
2. ✅ **Guarda tu private key** (como backup adicional)
3. ✅ **Usa un gestor de contraseñas** para la contraseña
4. ✅ **Prueba tu backup** antes de depositar fondos grandes
5. ✅ **Mantén backups en múltiples lugares** seguros

### Nunca:

1. ❌ Compartas tu private key con nadie
2. ❌ Guardes backups en la nube sin encriptar
3. ❌ Tomes screenshots de tu private key
4. ❌ Envíes tu frase de recuperación por email/chat
5. ❌ Confíes en "soporte técnico" que pida tus claves

---

## Soporte

Si sigues teniendo problemas:

1. Verifica que estás usando la contraseña correcta
2. Intenta recordar si usaste una contraseña diferente
3. Busca tus backups (private key o frase)
4. Como último recurso, resetea y crea nueva wallet

**Recuerda:** La seguridad de autocustodia significa que SOLO TÚ tienes control. No hay forma de "recuperar" sin la contraseña o backup.

---

## Resumen Rápido

| Situación | Solución |
|-----------|----------|
| Recuerdo la contraseña | Úsala para login |
| No recuerdo, pero tengo backup | Resetea e importa con backup |
| No recuerdo y no tengo backup | ⚠️ Fondos perdidos, resetea |
| Quiero prevenir esto | Guarda contraseña + backup |

---

**¡Mantén tus backups seguros!** 🔐
