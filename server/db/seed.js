// Standalone reseed script: `npm run seed`
// Deletes the existing database file and lets database.js recreate + seed it.
const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', '..', 'data', 'balacubaco.db');

for (const suffix of ['', '-wal', '-shm']) {
  const file = DB_PATH + suffix;
  if (fs.existsSync(file)) fs.unlinkSync(file);
}

require('./database');
console.log('[BalacubacoSHOP] Reseed concluido em', DB_PATH);
