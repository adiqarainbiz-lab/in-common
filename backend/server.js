process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  process.exit(1);
});
// Don't crash on unhandled rejections from async migration retries
process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
});

require('dotenv').config();
const app = require('./src/app');
const { startBreakageScheduler } = require('./src/services/breakageService');
const { runMigrations } = require('./scripts/migrate');

const PORT = process.env.PORT || 3000;

// Start listening immediately so Render's health check passes during deploy.
// Migrations run in the background — the DB may need a moment to wake up
// on the free tier, and that's fine as long as the HTTP server is up first.
app.listen(PORT, () => {
  console.log(`In Common backend listening on :${PORT}`);

  runMigrations()
    .then(() => {
      console.log('Migrations complete — starting scheduler.');
      startBreakageScheduler();
    })
    .catch((e) => {
      console.error('Migration failed after retries:', e.message);
      // Don't exit — server is healthy, scheduler just won't run.
      // The next deploy will retry migrations.
    });
});
