require('dotenv').config();
const app = require('./src/app');
const { startBreakageScheduler } = require('./src/services/breakageService');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`In Common backend listening on :${PORT}`);
  startBreakageScheduler();
});
