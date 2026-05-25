const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

async function sendPushNotification(pushToken, title, body, data = {}) {
  if (!pushToken || !pushToken.startsWith('ExponentPushToken[')) return;

  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ to: pushToken, sound: 'default', title, body, data }),
    });
    const json = await res.json();
    if (json.data?.status === 'error') {
      console.warn('[push] Expo error:', json.data.message);
    }
  } catch (e) {
    console.warn('[push] Failed to send notification:', e.message);
  }
}

// Send to many tokens, batched in groups of 100 (Expo API limit).
// Returns { sent, failed, no_token }.
async function sendBulkPushNotifications(tokens, title, body, data = {}) {
  const valid    = tokens.filter(t => t && t.startsWith('ExponentPushToken['));
  const no_token = tokens.length - valid.length;

  let sent = 0, failed = 0;

  // Chunk into batches of 100
  for (let i = 0; i < valid.length; i += 100) {
    const batch = valid.slice(i, i + 100).map(to => ({
      to, sound: 'default', title, body, data,
    }));
    try {
      const res  = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(batch),
      });
      const json = await res.json();
      const results = Array.isArray(json.data) ? json.data : [];
      for (const r of results) {
        r.status === 'ok' ? sent++ : failed++;
      }
      // If Expo returned fewer results than we sent, count remainder as sent
      if (results.length < batch.length) sent += batch.length - results.length;
    } catch (e) {
      console.warn('[push] Batch failed:', e.message);
      failed += batch.length;
    }
  }

  return { sent, failed, no_token };
}

module.exports = { sendPushNotification, sendBulkPushNotifications };
