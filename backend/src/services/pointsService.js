const db = require('../config/database');
const { sendPushNotification, storeNotification } = require('./notificationService');

const TIERS = [
  { name: 'Seedling', min: 0    },
  { name: 'Olive',    min: 500  },
  { name: 'Cedar',    min: 2000 },
  { name: 'Keffiyeh', min: 5000 },
];

function getTier(points) {
  let tier = TIERS[0].name;
  for (const t of TIERS) {
    if (points >= t.min) tier = t.name;
  }
  return tier;
}

const TIER_SQL = `CASE
  WHEN points_balance + $1 >= 5000 THEN 'Keffiyeh'
  WHEN points_balance + $1 >= 2000 THEN 'Cedar'
  WHEN points_balance + $1 >= 500  THEN 'Olive'
  ELSE 'Seedling'
END`;

const TIER_EMOJI = { Seedling: '🌱', Olive: '🫒', Cedar: '🌲', Keffiyeh: '🏅' };

async function earnPoints(memberId, businessId, staffId, points, description) {
  if (!Number.isInteger(points) || points <= 0)
    throw Object.assign(new Error('Points must be a positive integer'), { status: 400 });

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const before = await client.query('SELECT tier, push_token FROM members WHERE id=$1', [memberId]);
    const oldTier    = before.rows[0].tier;
    const pushToken  = before.rows[0].push_token;

    await client.query(
      `INSERT INTO transactions (member_id, business_id, staff_id, type, points, description)
       VALUES ($1,$2,$3,'earn',$4,$5)`,
      [memberId, businessId, staffId, points, description || 'Points awarded'],
    );
    const updated = await client.query(
      `UPDATE members
       SET points_balance   = points_balance + $1,
           last_activity_at = NOW(),
           tier = CASE
             WHEN points_balance + $1 >= 5000 THEN 'Keffiyeh'
             WHEN points_balance + $1 >= 2000 THEN 'Cedar'
             WHEN points_balance + $1 >= 500  THEN 'Olive'
             ELSE 'Seedling'
           END
       WHERE id = $2
       RETURNING points_balance, tier`,
      [points, memberId],
    );
    await client.query('COMMIT');

    const newTier = updated.rows[0].tier;
    if (newTier !== oldTier) {
      const emoji = TIER_EMOJI[newTier] || '🎉';
      const title = `${emoji} You've reached ${newTier}!`;
      const body = `Congratulations — keep earning at partner businesses to climb higher.`;
      if (pushToken) sendPushNotification(pushToken, title, body, { type: 'tier_upgrade', tier: newTier });
      storeNotification(memberId, title, body, 'tier_upgrade');
    }

    return { points, newBalance: updated.rows[0].points_balance, tier: newTier };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

async function redeemPoints(memberId, businessId, staffId, points) {
  if (!Number.isInteger(points) || points <= 0)
    throw Object.assign(new Error('Points must be a positive integer'), { status: 400 });

  const memberRes = await db.query('SELECT points_balance FROM members WHERE id=$1', [memberId]);
  if (!memberRes.rows.length) throw Object.assign(new Error('Member not found'), { status: 404 });
  const balance = memberRes.rows[0].points_balance;
  if (balance < points)
    throw Object.assign(new Error(`Not enough points. Have ${balance}, need ${points}`), { status: 400 });

  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO transactions (member_id, business_id, staff_id, type, points, description)
       VALUES ($1,$2,$3,'redeem',$4,$5)`,
      [memberId, businessId, staffId, -points, `Redeemed ${points} pts`],
    );
    const updated = await client.query(
      `UPDATE members
       SET points_balance   = points_balance - $1,
           last_activity_at = NOW(),
           tier = CASE
             WHEN points_balance - $1 >= 5000 THEN 'Keffiyeh'
             WHEN points_balance - $1 >= 2000 THEN 'Cedar'
             WHEN points_balance - $1 >= 500  THEN 'Olive'
             ELSE 'Seedling'
           END
       WHERE id = $2
       RETURNING points_balance, tier`,
      [points, memberId],
    );
    await client.query('COMMIT');
    return { pointsRedeemed: points, newBalance: updated.rows[0].points_balance, tier: updated.rows[0].tier };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

async function reverseTransaction(txId, staffId, businessId) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const txRes = await client.query(
      'SELECT * FROM transactions WHERE id=$1 FOR UPDATE',
      [txId],
    );
    if (!txRes.rows.length) throw Object.assign(new Error('Transaction not found'), { status: 404 });

    const tx = txRes.rows[0];

    if (tx.type === 'reversal') throw Object.assign(new Error('Cannot reverse a reversal'), { status: 400 });
    if (tx.type === 'expire')   throw Object.assign(new Error('Cannot reverse an expiry'), { status: 400 });
    if (businessId && tx.business_id !== businessId)
      throw Object.assign(new Error('Transaction not at your business'), { status: 403 });

    const already = await client.query('SELECT id FROM transactions WHERE reversal_of=$1', [txId]);
    if (already.rows.length) throw Object.assign(new Error('Transaction already reversed'), { status: 400 });

    const pointsDelta = -tx.points;

    if (tx.type === 'earn') {
      const memberRes = await client.query('SELECT points_balance FROM members WHERE id=$1', [tx.member_id]);
      const balance = memberRes.rows[0].points_balance;
      if (balance < tx.points)
        throw Object.assign(
          new Error(`Cannot reverse: member only has ${balance} pts but transaction was ${tx.points} pts`),
          { status: 400 },
        );
    }

    await client.query(
      `INSERT INTO transactions (member_id, business_id, staff_id, type, points, description, reversal_of)
       VALUES ($1,$2,$3,'reversal',$4,$5,$6)`,
      [tx.member_id, tx.business_id, staffId, pointsDelta, `Reversal of ${tx.type} (${staffId ? 'staff' : 'admin'})`, txId],
    );

    const updated = await client.query(
      `UPDATE members
       SET points_balance   = points_balance + $1,
           last_activity_at = NOW(),
           tier = CASE
             WHEN points_balance + $1 >= 5000 THEN 'Keffiyeh'
             WHEN points_balance + $1 >= 2000 THEN 'Cedar'
             WHEN points_balance + $1 >= 500  THEN 'Olive'
             ELSE 'Seedling'
           END
       WHERE id = $2
       RETURNING points_balance, tier`,
      [pointsDelta, tx.member_id],
    );

    await client.query('COMMIT');
    return { reversed: true, newBalance: updated.rows[0].points_balance, tier: updated.rows[0].tier };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

module.exports = { earnPoints, redeemPoints, reverseTransaction, getTier, TIERS };
