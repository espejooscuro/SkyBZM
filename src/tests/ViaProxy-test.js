const mineflayer = require('mineflayer');

const bot = mineflayer.createBot({
  host: 'mc.hypixel.net',   // o el host del ViaProxy
  port: 25565,
  username: 'Notdtguy',
  auth: 'microsoft',
  version: "1.21.9"
});

bot._client.on('connect', () => {
  console.log('🟢 TCP conectado');
});

bot._client.on('state', (newState) => {
  console.log('🔁 Estado protocolo ->', newState);
});

bot._client.on('packet', (data, meta) => {
  //console.log(`📥 [${bot._client.state}] Paquete entrante:`, meta.name);
});
bot._client.on('packet', (data, meta) => {
  if (bot._client.state === 'configuration') {
    console.log('CONFIG packet:', meta.name, data);

    if (meta.name === 'finish_configuration') {
      // algunos servidores esperan respuesta explícita
      bot._client.write('finish_configuration', {});
    }
  }
});



bot._client.on('writePacket', (name, params) => {
  //console.log(`📤 [${bot._client.state}] Paquete saliente:`, name);
});

bot._client.on('end', () => {
  console.log('🔌 Socket cerrado (end)');
});

bot._client.on('close', () => {
  console.log('🔌 Socket cerrado (close)');
});

bot.on('kicked', (reason, loggedIn) => {
  console.log('⛔ Kick del servidor:', reason, 'loggedIn:', loggedIn);
});

bot.on('error', (err) => {
  console.error('❌ Error del bot:', err);
});

bot.on('end', (reason) => {
  console.log('🔌 Bot desconectado. Razón:', reason);
});
