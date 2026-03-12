# 🎨 SkyBZM Web Interface - Complete Redesign

## 📋 Resumen de Cambios

He creado una **aplicación web completamente nueva** desde cero usando **React 18 + Vite** con una interfaz moderna y profesional.

## ✨ Características Principales

### 🎨 Diseño Moderno
- ✅ **Colores pastel** personalizados (rosa, púrpura, azul)
- ✅ **Tema claro y oscuro** con transiciones suaves
- ✅ **Interfaz responsive** adaptable a móviles y tablets
- ✅ **Animaciones fluidas** y efectos de hover
- ✅ **Diseño limpio** tipo dashboard moderno

### 🔐 Autenticación
- ✅ Página de login elegante con validación
- ✅ Manejo de sesión con Context API
- ✅ Logout funcional

### 🎮 Control del Bot
- ✅ **Estado en tiempo real** (Online/Offline)
- ✅ **Botones de acción**: Start, Stop, Restart
- ✅ **Información de la cuenta**
- ✅ **Polling automático** cada 3 segundos

### 📊 Estadísticas
- ✅ **Purse actual** con formato de números
- ✅ **Profit total** con color dinámico (verde/rojo)
- ✅ **Coins por hora**
- ✅ **Runtime** con formato legible
- ✅ **Activity logs** en tiempo real (últimos 50)
- ✅ **Auto-refresh** cada 5 segundos

### ⚙️ Configuración General
- ✅ **Username** (solo lectura)
- ✅ **Sell Timeout** en **MINUTOS** (no ms)
- ✅ **Purse** editable
- ✅ **Auto Cookie** toggle
- ✅ **Guardar cambios** con feedback visual

### 🌐 Configuración de Proxy
- ✅ **Enable/Disable** proxy
- ✅ **Host y Port**
- ✅ **Username y Password** para autenticación (NUEVO)
- ✅ **Validación visual** cuando está deshabilitado
- ✅ **Nota informativa** sobre reinicio del bot

### 💰 Configuración de Flips (COMPLETAMENTE RENOVADO)

#### Sistema Modular de Flips
- ✅ **Sidebar con lista** de configuraciones
- ✅ **Agregar múltiples flips** del mismo tipo
- ✅ **Toggle enable/disable** por flip
- ✅ **Eliminar flips** con confirmación
- ✅ **Indicadores visuales** de estado

#### 🏪 NPC Flip
- ✅ **Item** (ID del item)
- ✅ **Min Spread** (spread mínimo requerido)
- ✅ **Force Sell After** (en minutos)

#### 🐱 Kat Flip
- ✅ **Pet** (selección de mascota)
- ✅ **Use Kat Flower** (toggle sí/no)

#### 🔨 Craft Flip (NUEVO - Minecraft Style)
- ✅ **Matriz 3x3** tipo mesa de crafteo de Minecraft
- ✅ **9 slots configurables**
- ✅ **Item y cantidad** (1-64) por slot
- ✅ **Preview visual** de la grid
- ✅ **Botón Clear Grid** para limpiar
- ✅ **Diseño responsivo**

#### ⚒️ Forge Flip
- ✅ **Item** (selección del item a forgear)

## 🏗️ Arquitectura Técnica

### Stack Tecnológico
```
Frontend:
- React 18.3.1
- Vite 5.4.2 (Build tool ultra-rápido)
- CSS Variables (Sistema de temas)
- Context API (State management)

Backend:
- Express.js (ya existente)
- API REST endpoints
```

### Estructura de Archivos
```
src/web/public/
├── src/
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Button.jsx/css        # Botón reutilizable
│   │   │   ├── Card.jsx/css          # Tarjetas
│   │   │   └── Input.jsx/css         # Inputs, Select, Textarea, Switch
│   │   ├── layout/
│   │   │   ├── Sidebar.jsx/css       # Menú lateral
│   │   │   └── Header.jsx/css        # Barra superior
│   │   └── sections/
│   │       ├── BotControl.jsx/css    # Control del bot
│   │       ├── BotStats.jsx/css      # Estadísticas
│   │       ├── GeneralConfig.jsx/css # Config general
│   │       ├── ProxyConfig.jsx/css   # Config proxy
│   │       ├── FlipsConfig.jsx/css   # Config flips
│   │       └── flips/
│   │           ├── NPCFlipConfig.jsx
│   │           ├── KatFlipConfig.jsx
│   │           ├── CraftFlipConfig.jsx (⭐ NUEVO)
│   │           ├── ForgeFlipConfig.jsx
│   │           └── FlipConfig.css
│   ├── contexts/
│   │   ├── ThemeContext.jsx          # Manejo de tema
│   │   └── AuthContext.jsx           # Autenticación
│   ├── pages/
│   │   ├── Login.jsx/css             # Página de login
│   │   └── Dashboard.jsx/css         # Dashboard principal
│   ├── styles/
│   │   └── globals.css               # Estilos globales + temas
│   ├── App.jsx                       # Componente raíz
│   └── main.jsx                      # Entry point
├── dist/                             # Build de producción
├── index.html                        # HTML template
├── package.json
├── vite.config.js
└── README.md
```

## 🎨 Sistema de Diseño

### Colores Pastel

#### Tema Claro
- **Background**: `#fef6f9` (Rosa muy suave)
- **Primary**: `#fb7185` (Rosa pastel)
- **Secondary**: `#c084fc` (Púrpura pastel)
- **Tertiary**: `#60a5fa` (Azul pastel)
- **Success**: `#86efac` (Verde pastel)
- **Warning**: `#fcd34d` (Amarillo pastel)
- **Error**: `#fca5a5` (Rojo pastel)

#### Tema Oscuro
- **Background**: `#0f172a` (Azul oscuro)
- **Surface**: `#1e293b`
- Los acentos mantienen su vibra pastel

### Componentes UI

#### Button
- Variantes: primary, secondary, success, warning, danger, ghost
- Tamaños: sm, md, lg
- Estados: normal, hover, disabled, loading
- Soporte para iconos

#### Input/Select/Textarea/Switch
- Estilos consistentes
- Validación visual de errores
- Helper text
- Disabled states
- Switch con animación suave

#### Card
- Bordes redondeados
- Sombras sutiles
- Hover effects opcionales
- Header, Body, Footer sections

## 🔌 Integración con Backend

### Endpoints Utilizados
```javascript
POST   /api/login                                    # Login
GET    /api/config                                   # Obtener config
PUT    /api/account/:index                           # Actualizar cuenta
POST   /api/account/:index/flips                     # Crear flip
PATCH  /api/account/:index/flips/:flipIndex          # Toggle flip
DELETE /api/account/:index/flips/:flipIndex          # Eliminar flip
PATCH  /api/account/:index/flips/:flipIndex/config   # Actualizar config flip
POST   /api/bot/:index/start                         # Iniciar bot
POST   /api/bot/:index/stop                          # Detener bot
POST   /api/bot/:index/restart                       # Reiniciar bot
GET    /api/bot/:index/status                        # Estado del bot
GET    /api/bot/:index/stats                         # Estadísticas
GET    /api/bot/:index/logs                          # Logs de actividad
```

### Autenticación
- Header `x-password` en todas las peticiones protegidas
- Manejo de errores 401 (Unauthorized)

## 📦 Comandos Disponibles

### Desarrollo
```bash
cd src/web/public
npm install          # Instalar dependencias
npm run dev          # Dev server con hot reload (puerto 3000)
```

### Producción
```bash
npm run build        # Compilar para producción (output en dist/)
```

### Iniciar Bot con Web
```bash
cd SkyBZM
node src/Launcher.js
# El servidor Express servirá automáticamente desde dist/
```

## 🚀 Mejoras sobre la Versión Anterior

### Lo que se eliminó
- ❌ Código jQuery antiguo
- ❌ CSS desorganizado
- ❌ HTML estático
- ❌ Módulos separados sin cohesión
- ❌ Configuración de flips mezclada con general

### Lo que se agregó
- ✅ Framework React moderno
- ✅ Sistema de componentes reutilizables
- ✅ Estado centralizado con Context API
- ✅ Hot Module Replacement (HMR)
- ✅ Build optimizado con Vite
- ✅ Configuración de flips modular
- ✅ UI/UX profesional y moderna
- ✅ Temas claro/oscuro
- ✅ Responsive design
- ✅ Craft grid estilo Minecraft
- ✅ Proxy con autenticación

## 🎯 Puntos Clave Implementados

### Sell Timeout en Minutos ✅
```javascript
// En GeneralConfig.jsx
<Input
  label="Sell Timeout (minutes)"
  type="number"
  value={Math.floor((localConfig.sellTimeout || 0) / 60000)}
  onChange={(e) => handleChange('sellTimeout', Number(e.target.value) * 60000)}
/>
```

### Proxy con Username/Password ✅
```javascript
// En ProxyConfig.jsx
<Input
  label="Username"
  value={proxy.username || ''}
  onChange={(e) => handleChange('username', e.target.value)}
/>
<Input
  label="Password"
  type="password"
  value={proxy.password || ''}
  onChange={(e) => handleChange('password', e.target.value)}
/>
```

### Config de Flips Separada ✅
- General Config: Solo configuración básica (username, sellTimeout, purse, autoCookie)
- Flips Config: Toda la configuración de flips en su propia sección

### NPC Flip ✅
```javascript
{
  minSpread: number,
  item: string,
  forceSellAfter: number (en minutos)
}
```

### Kat Flip ✅
```javascript
{
  useKatFlower: boolean,
  pet: string
}
```

### Craft Flip (Minecraft Style) ✅
```javascript
{
  craftGrid: [
    { item: string, amount: 1-64 },  // Slot 1
    { item: string, amount: 1-64 },  // Slot 2
    ...                               // 9 slots total (3x3)
  ]
}
```

### Forge Flip ✅
```javascript
{
  item: string
}
```

## 🌟 Características Especiales

### Tema Pastel Personalizado
- Degradados suaves
- Transiciones fluidas
- Colores armoniosos
- Alta legibilidad

### Craft Grid Innovador
- Preview en tiempo real
- Diseño intuitivo
- Validación de cantidad (1-64)
- Clear button para limpiar

### UX Mejorada
- Loading states en botones
- Success/error feedback
- Tooltips informativos
- Animaciones sutiles
- Scroll suave
- Estados vacíos descriptivos

## 📱 Responsive Design

- ✅ Desktop (> 1024px): Sidebar fijo, grid completo
- ✅ Tablet (768px - 1024px): Sidebar compacto
- ✅ Mobile (< 768px): Sidebar con iconos, grids en columna

## 🔒 Seguridad

- ✅ Autenticación en cada request
- ✅ Validación de password
- ✅ No expone credenciales en cliente
- ✅ Headers CORS configurados

## 📝 Próximos Pasos Sugeridos

1. Agregar analytics de flips por tipo
2. Exportar/importar configuraciones
3. Timeline de actividad del bot
4. Sistema de notificaciones
5. Multi-account view en dashboard
6. Whitelist/Blacklist management UI
7. Gráficas de profit over time

## 🎉 Conclusión

He creado una **aplicación web moderna, profesional y completamente funcional** que:

- ✅ Usa **React moderno** con mejores prácticas
- ✅ Tiene **colores pastel** hermosos
- ✅ Soporta **tema claro y oscuro**
- ✅ Está **totalmente integrada** con el backend
- ✅ Tiene **todas las funcionalidades** solicitadas
- ✅ Es **responsive** y funciona en todos los dispositivos
- ✅ Tiene una **UX excepcional** con feedback visual
- ✅ Está **lista para producción**

¡La aplicación está lista para usar! 🚀
