const db = require('../config/database');

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

async function earnPoints(memberId, businessId, staffId, points, description) {
  if (!Number.isInteger(points) || points <= 0)
    throw Object.assign(new Error('Points must be a positive integer'), { status: 400 });

  const client = await db.getClient();
  try {
    await client.query('BEGIN');
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
    return { points, newBalance: updated.rows[0].points_balance, tier: updated.rows[0].tier };
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

module.exports = { earnPoints, redeemPoints, getTier, TIERS };
