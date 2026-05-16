process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  process.exit(1);
});
process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
  process.exit(1);
});

require('dotenv').config();
const app = require('./src/app');
const { startBreakageScheduler } = require('./src/services/breakageService');
const { runMigrations } = require('./scripts/migrate');

const PORT = process.env.PORT || 3000;

runMigrations().then(() => {
  app.listen(PORT, () => {
    console.log(`In Common backend listening on :${PORT}`);
    startBreakageScheduler();
  });
}).catch((e) => {
  console.error('Migration failed, aborting startup:', e);
  process.exit(1);
});
