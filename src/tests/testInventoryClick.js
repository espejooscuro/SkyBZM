// test.js

const mineflayer = require('mineflayer')
const ContainerManager = require('../utils/ContainerManager')   // ← tu archivo original

// Helper (puedes tenerlo en otro archivo o usar esta versión inline)
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

// ────────────────────────────────────────────────
//  Configuración del bot
// ────────────────────────────────────────────────

const BOT_USERNAME = 'NotSoGoldenHour'          // cámbialo
const SERVER_HOST = 'mc.hypixel.net'          // o tu servidor
const SERVER_PORT = 25565
const MINECRAFT_VERSION = '1.8.9'             // típico Hypixel Skyblock

const bot = mineflayer.createBot({
  host: SERVER_HOST,
  port: SERVER_PORT,
  username: BOT_USERNAME,
  version: MINECRAFT_VERSION,
  // auth: 'microsoft',         // descomenta si usas cuenta Microsoft
  // password: '',              // si es necesario
})

bot.on('login', () => {
  console.log(`[${bot.username}] Conectado`)
})

bot.on('spawn', async () => {
  console.log(`[${bot.username}] Spawn completado → iniciando prueba`)

  // Instanciamos TU ContainerManager (con tus delays por defecto o personalizados)
  const manager = new ContainerManager(bot, 300, 700)   // o los valores que uses normalmente

  console.log(`[${bot.username}] Esperando 5 segundos antes de comandos...`)
  await delay(5000)

  bot.chat('/skyblock')
  console.log('→ /skyblock')
  await delay(5000)

  bot.chat('/is')
  console.log('→ /is')
  await delay(5000)

  console.log(`[${bot.username}] Consideramos que está "ready"`)
  await delay(2000)

  // ─── Abrir bazaar ─────────────────────────────────────
  console.log(`[${bot.username}] Ejecutando /bz ...`)
  bot.chat('/bz')
  await delay(4500)   // tiempo típico para que cargue la interfaz de bazaar

  // Leer nombre del contenedor
  let containerName = manager.getOpenContainerName()
  console.log(`[${bot.username}] Nombre contenedor después de /bz →`, containerName || '(no detectado)')

  if (!containerName) {
    console.warn(`[${bot.username}] No se abrió ninguna ventana → abortando click`)
    return
  }

  // ─── Intentar click en item que contenga "oak log" ───
  console.log(`[${bot.username}] Intentando click con filtro: contains "oak log" ...`)

  const clickSuccess = await manager.click({
    contains: 'oak log'     // usa el filtro que ya tienes implementado en _matchesFilters
  })

  if (clickSuccess) {
    console.log(`[${bot.username}] Click realizado con éxito`)
  } else {
    console.log(`[${bot.username}] No se encontró ningún item con "oak log"`)
    // Opcional: mostrar debug
    console.log('Inventario actual (JSON):')
    console.log(manager.getInventory())
  }

  // Esperar reacción del servidor (nueva ventana / actualización)
  await delay(3000)

  // Volver a leer el nombre del contenedor
  containerName = manager.getOpenContainerName()
  console.log(`[${bot.username}] Nombre contenedor DESPUÉS del click →`, containerName || '(no detectado / cerrado)')

  console.log(`\n[${bot.username}] Prueba terminada.\n`)
})

// Logs útiles
bot.on('message', (jsonMsg) => {
  const text = jsonMsg.toString().trim()
  if (text) console.log(`[CHAT] ${text}`)
})

bot.on('error', err => console.error('Error:', err))
bot.on('kicked', reason => console.log('Kickeado:', reason))
bot.on('end', () => console.log('Conexión cerrada'))