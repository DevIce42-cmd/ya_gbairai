const { PORT, HOST } = require('./config/env');
const { createApp } = require('./app');

const app = createApp();

const server = app.listen(PORT, HOST, () => {
  console.log(`\n🔥 Y'A GBAIRAI ! lancé sur http://${HOST}:${PORT}`);
  console.log(`📡 API REST v1 : http://${HOST}:${PORT}/api/v1/health\n`);
});

function shutdown() {
  console.log("\nArrêt propre de Y'A GBAIRAI !...");
  server.close(() => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
