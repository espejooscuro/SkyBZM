# 🔐 Web Authentication Fix

## Problema Corregido

Anteriormente, la página de login tenía una contraseña hardcodeada (`skybzm2024`) en lugar de verificar contra la contraseña configurada en `config.json`.

## Solución Implementada

### 1. **LoginPage.tsx**
- ✅ Eliminada la contraseña hardcodeada
- ✅ Ahora hace una petición POST a `/api/login` con la contraseña ingresada
- ✅ Verifica la respuesta del servidor antes de permitir el acceso
- ✅ Muestra mensajes de error si la contraseña es incorrecta
- ✅ Guarda la sesión en `sessionStorage` solo si la autenticación es exitosa

### 2. **server.cjs**
- ✅ Ya existía el endpoint `/api/login` que verifica contra `config.webPassword`
- ✅ Retorna `401 Unauthorized` si la contraseña es incorrecta
- ✅ Retorna `200 OK` con `success: true` si la contraseña es correcta

### 3. **App.tsx**
- ✅ Verifica la sesión en `sessionStorage` al cargar
- ✅ Solo muestra el Dashboard si está autenticado
- ✅ Muestra LoginPage si no está autenticado
- ✅ Función `handleLogout` limpia la sesión correctamente

### 4. **lib/api.ts**
- ✅ Añadida función `login(password)` para la autenticación

## Cómo Funciona Ahora

1. **Primera Carga:**
   - La aplicación verifica si existe `skybzm-auth` en `sessionStorage`
   - Si NO existe → Muestra `LoginPage`
   - Si existe → Muestra `Dashboard`

2. **Login:**
   - Usuario ingresa su contraseña
   - Se hace POST a `/api/login` con la contraseña
   - El servidor verifica contra `config.json → webPassword`
   - Si es correcta → Guarda sesión y muestra Dashboard
   - Si es incorrecta → Muestra error

3. **Logout:**
   - Se elimina `skybzm-auth` de `sessionStorage`
   - Vuelve a mostrar `LoginPage`

## Configuración de la Contraseña

La contraseña se configura en el archivo `config.json`:

```json
{
  "webPassword": "tu_contraseña_aquí",
  "accounts": [...]
}
```

## Cómo Probar

1. **Borrar la sesión actual:**
   ```javascript
   // En la consola del navegador (F12)
   sessionStorage.clear();
   location.reload();
   ```

2. **Verificar que pide contraseña:**
   - Debería mostrar la página de login
   - Intenta con una contraseña incorrecta → Debe mostrar error
   - Intenta con la contraseña correcta (la de `config.json`) → Debe entrar al Dashboard

3. **Verificar persistencia:**
   - Recarga la página (F5)
   - No debería pedir contraseña de nuevo (usa sessionStorage)

4. **Verificar logout:**
   - Click en el botón de logout en el Dashboard
   - Debería volver a la página de login

## Archivos Modificados

- ✅ `src/web/src/pages/LoginPage.tsx` - Autenticación real contra el servidor
- ✅ `src/web/src/App.tsx` - Manejo correcto de sesión
- ✅ `src/web/src/lib/api.ts` - Función de login añadida

## Notas de Seguridad

- 🔒 La contraseña se envía por POST (no por GET/URL)
- 🔒 La sesión se guarda en `sessionStorage` (se borra al cerrar el navegador)
- 🔒 No hay contraseña hardcodeada en el código del frontend
- 🔒 El servidor verifica la contraseña desde `config.json`

## Estado Actual

✅ **CORREGIDO** - La aplicación ahora usa la contraseña de `config.json` y siempre pide autenticación cuando no hay sesión activa.
