const cron = require('node-cron');
const db   = require('../config/database');
const { sendPushNotification, storeNotification } = require('./notificationService');

const INACTIVITY_MONTHS = 18;

async function expireInactivePoints() {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - INACTIVITY_MONTHS);

  const staleRes = await db.query(
    `SELECT id, points_balance, push_token FROM members
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
    return;
  } finally {
    client.release();
  }

  // Notify affected members after committing
  for (const member of staleRes.rows) {
    const title = 'Your points have expired';
    const body = `${member.points_balance} Common Points expired after 18 months of inactivity. Visit a partner business to start earning again.`;
    if (member.push_token) sendPushNotification(member.push_token, title, body, { type: 'points_expired' });
    storeNotification(member.id, title, body, 'points_expired');
  }
}

// Warn members 30 days before their points expire
async function warnExpiringPoints() {
  // Find members who crossed the 17-month inactivity threshold in the last 24 hours
  const res = await db.query(
    `SELECT id, points_balance, push_token FROM members
     WHERE last_activity_at  < NOW() - INTERVAL '17 months'
       AND last_activity_at >= NOW() - INTERVAL '17 months' - INTERVAL '1 day'
       AND points_balance > 0
       AND push_token IS NOT NULL`,
  );

  for (const member of res.rows) {
    const title = 'Your points expire in 30 days';
    const body = `You have ${member.points_balance} Common Points that will expire due to inactivity. Visit any partner business to keep them.`;
    sendPushNotification(member.push_token, title, body, { type: 'points_expiring_soon' });
    storeNotification(member.id, title, body, 'points_expiring_soon');
  }

  if (res.rows.length) {
    console.log(`[breakage] Sent expiry warnings to ${res.rows.length} member(s).`);
  }
}

function startBreakageScheduler() {
  cron.schedule('0 2 * * *', () => {
    console.log('[breakage] Running nightly expiration check...');
    expireInactivePoints().catch(console.error);
  });

  cron.schedule('0 3 * * *', () => {
    console.log('[breakage] Running nightly expiry warning check...');
    warnExpiringPoints().catch(console.error);
  });

  console.log('[breakage] Scheduler started (expiry at 02:00, warnings at 03:00).');
}

module.exports = { startBreakageScheduler, expireInactivePoints, warnExpiringPoints };
