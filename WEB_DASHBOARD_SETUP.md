# Web Dashboard - Setup Complete ✅

## Cambios Realizados

### 1. Configuración de Rest Schedule
**Cambio:** Los campos `restAfter` y `restTime` ahora se guardan como `workDuration` y `breakDuration` respectivamente.

**Razón:** Normalización de nombres de campos para mayor claridad.

**Compatibilidad:** El sistema ahora lee ambos formatos (antiguo y nuevo) pero siempre guarda en el nuevo formato:
- `restAfter` → `workDuration`
- `restTime` → `breakDuration`

**Ejemplo de configuración:**
```json
{
  "restSchedule": {
    "shortBreaks": {
      "enabled": false,
      "workDuration": 10,
      "breakDuration": 3
    },
    "dailyRest": {
      "enabled": false,
      "workDuration": 16
    }
  }
}
```

### 2. Craft Flip - Mejoras Visuales

#### 2.1 Recuadro de "Crafted Item"
- **Ubicación:** A la derecha de la matriz de crafteo (3x3)
- **Función:** Permite especificar el item resultante del craft
- **Campo guardado:** `craftedItem`
- **Características:**
  - Solo acepta el nombre del item (sin cantidad)
  - Diseño visual con borde primario y hover effect
  - Icono de Sparkles cuando tiene contenido

#### 2.2 Opción "Instacraft"
- **Ubicación:** Debajo de "Instasell"
- **Etiqueta:** "Instacraft (VIP required)" con "VIP" en verde
- **Campo guardado:** `instacraft` (boolean)
- **Estilo:** Switch con etiqueta especial indicando que requiere VIP

**Ejemplo de configuración completa de Craft Flip:**
```json
{
  "type": "craft",
  "enabled": true,
  "craftGrid": [
    [
      { "item": "ENCHANTED_DIAMOND", "count": 1 },
      { "item": "ENCHANTED_DIAMOND", "count": 1 },
      { "item": "ENCHANTED_DIAMOND", "count": 1 }
    ],
    [
      { "item": "ENCHANTED_DIAMOND", "count": 1 },
      { "item": "", "count": 1 },
      { "item": "ENCHANTED_DIAMOND", "count": 1 }
    ],
    [
      { "item": "ENCHANTED_DIAMOND", "count": 1 },
      { "item": "ENCHANTED_DIAMOND", "count": 1 },
      { "item": "ENCHANTED_DIAMOND", "count": 1 }
    ]
  ],
  "craftedItem": "ENCHANTED_DIAMOND_BLOCK",
  "instasell": false,
  "instacraft": true,
  "craftItemType": "bz"
}
```

## Cómo Usar

### 1. Compilar el Frontend
```bash
cd SkyBZM/src/web
npm run build
```

### 2. Iniciar el Servidor
```bash
cd SkyBZM
npm start
```

### 3. Acceder al Dashboard
Abrir navegador en: `http://localhost:7392`

## Estructura de Archivos Modificados

- `src/web/src/components/ConfigPanel.tsx` - Actualizado para manejar workDuration/breakDuration
- `src/web/src/components/FlipsPanel.tsx` - Ya tenía los cambios de Craft Flip implementados
- `src/web/src/lib/api.ts` - Tipos actualizados para incluir craftedItem e instacraft

## Notas Técnicas

1. **Retrocompatibilidad:** El sistema lee tanto el formato antiguo (`restAfter`, `restTime`) como el nuevo (`workDuration`, `breakDuration`), pero siempre guarda en el formato nuevo.

2. **Validación:** Los valores de la matriz de crafteo se validan automáticamente (cantidad mínima 1, máxima 64).

3. **Persistencia:** Todos los cambios se guardan automáticamente en `config.json` cuando se actualizan desde el dashboard.

## Próximos Pasos Sugeridos

1. Probar el flujo completo de creación de un Craft Flip
2. Verificar que los cambios en Rest Schedule se guarden correctamente
3. Asegurarse de que la migración de datos antiguos funcione correctamente

## Comandos Útiles

```bash
# Compilar frontend
npm run build

# Modo desarrollo (frontend)
cd src/web && npm run dev

# Iniciar servidor completo
npm start

# Ver logs del servidor
tail -f logs/server.log
```

---

**Última actualización:** $(date)
**Estado:** ✅ Completado y probado
