const jwt = require('jsonwebtoken');

const WINDOW_SECONDS = 60;
const GRACE_WINDOWS  = 1; // accept 1 previous window for clock skew

function generateQRToken(memberId) {
  const window = Math.floor(Date.now() / (WINDOW_SECONDS * 1000));
  return jwt.sign(
    { sub: memberId, type: 'qr', w: window },
    process.env.JWT_SECRET,
    { expiresIn: `${WINDOW_SECONDS + 30}s` },
  );
}

// Returns memberId if valid, throws otherwise
function validateQRToken(token) {
  const payload = jwt.verify(token, process.env.JWT_SECRET);
  if (payload.type !== 'qr') throw new Error('Not a QR token');
  const currentWindow = Math.floor(Date.now() / (WINDOW_SECONDS * 1000));
  if (currentWindow - payload.w > GRACE_WINDOWS) throw new Error('QR code expired');
  return payload.sub;
}

module.exports = { generateQRToken, validateQRToken };
