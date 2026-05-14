const cron = require('node-cron');
const db   = require('../config/database');

const INACTIVITY_MONTHS = 18;

async function expireInactivePoints() {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - INACTIVITY_MONTHS);

  const staleRes = await db.query(
    `SELECT id, points_balance FROM members
     WHERE last_activity_at < $1 AND points_balance > 0`,
    [cutoff],
  );

  if (!staleRes.rows.length) return;

  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    for (const member of staleRes.rows) {
      await client.query(
        `INSERT INTO transactions (member_id, type, points, description)
         VALUES ($1,'expire',$2,'Points expired after 18 months of inactivity')`,
        [member.id, -member.points_balance],
      );
      await client.query(
        `UPDATE members SET points_balance=0, tier='Seedling' WHERE id=$1`,
        [member.id],
      );
    }
    await client.query('COMMIT');
    console.log(`[breakage] Expired points for ${staleRes.rows.length} inactive member(s).`);
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('[breakage] Error during expiration:', e.message);
  } finally {
    client.release();
  }
}

function startBreakageScheduler() {
  // Run daily at 02:00
  cron.schedule('0 2 * * *', () => {
    console.log('[breakage] Running nightly expiration check...');
    expireInactivePoints().catch(console.error);
  });
  console.log('[breakage] Scheduler started (daily at 02:00).');
}

module.exports = { startBreakageScheduler, expireInactivePoints };
