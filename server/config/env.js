const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const envPath = path.join(__dirname, '..', '..', '.env');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = val;
    }
  }
}

const ADMIN_KEY = process.env.ADMIN_KEY || 'GBAIRAI-ADMIN-2026';
const AUTH_SECRET =
  process.env.AUTH_SECRET ||
  crypto.createHash('sha256').update(`ya-gbairai-auth-${ADMIN_KEY}`).digest('hex');

module.exports = {
  PORT: Number(process.env.PORT) || 3000,
  HOST: process.env.HOST || '0.0.0.0',
  ADMIN_KEY,
  AUTH_SECRET,
  NODE_ENV: process.env.NODE_ENV || 'development',
};
