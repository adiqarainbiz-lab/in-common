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

module.exports = { sendPushNotification };
