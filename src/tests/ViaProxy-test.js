// test-mineflayer.js
const mineflayer = require('mineflayer');

const bot = mineflayer.createBot({
  host: 'mp.lifestealsmp.com',   // servidor Java
  port: 25565,               // puerto
  username: 'Neckruz',       // nombre del bot
  auth: 'microsoft',         // 'offline' si el server acepta bots offline
  version: '1.21.11'          // versión de Minecraft
});

// Evento cuando el bot se conecta
bot.once('spawn', () => {
  console.log('✅ Bot conectado al servidor sin ViaProxy');
  bot.chat('¡Hola desde Mineflayer normal!');
});

// Evento de chat
bot.on('chat', (username, message) => {
  if (username === bot.username) return;
  console.log(`<${username}> ${message}`);
});

// Errores
bot.on('error', (err) => console.error('❌ Error:', err));

// Desconexión
bot.on('end', () => console.log('🔌 Bot desconectado'));
