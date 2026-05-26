const twilio = require('twilio');

// Lazy-init: only create the client when actually needed.
// Prevents crashes on startup when Twilio env vars are not set.
let _client = null;
function getClient() {
  if (!_client) {
    const sid   = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    if (!sid || !token) throw new Error('Twilio credentials not configured (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN)');
    _client = twilio(sid, token);
  }
  return _client;
}

async function sendOTP(phoneNumber, otp) {
  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!from) throw new Error('TWILIO_PHONE_NUMBER not configured');
  await getClient().messages.create({
    body: `Your In Common code is: ${otp}`,
    from,
    to: phoneNumber,
  });
}

module.exports = { sendOTP };
