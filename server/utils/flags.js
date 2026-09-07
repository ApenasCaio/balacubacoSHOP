const crypto = require('crypto');

const SECRET = process.env.LAB_SECRET || 'balacubaco_sec_key_2026';

const BASE_FLAGS = {
  m01: 'sql_1nj3ct10n_l0g1n',
  m02: '1d0r_perfil_usuario',
  m03: 'xss_avaliacoes',
  m04: 'broken_access_admin',
  m05: 'upload_inseguro',
  m06: 'idor_pedidos',
  m07: 'api_sem_autorizacao',
  m08: 'informacao_exposta',
};

function normalizeHandle(handle) {
  return String(handle || '')
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '');
}

function generateFlag(missionCode, handle) {
  const normalizedMissionCode = String(missionCode || '').trim().toLowerCase();
  const base = BASE_FLAGS[normalizedMissionCode] || 'flag';
  const cleanHandle = normalizeHandle(handle);
  if (!cleanHandle) {
    return `BALACUBACO{${base}}`;
  }
  const hash = crypto.createHmac('sha256', SECRET)
    .update(`${cleanHandle}_${normalizedMissionCode}`)
    .digest('hex')
    .slice(0, 8);
  return `BALACUBACO{${base}_${cleanHandle}_${hash}}`;
}

function validateFlag(missionCode, handle, submittedFlag) {
  if (!submittedFlag) return false;
  const cleanHandle = normalizeHandle(handle);
  if (!cleanHandle) return false;
  const trimmed = submittedFlag.trim();
  const dynamicFlag = generateFlag(missionCode, cleanHandle);
  return trimmed === dynamicFlag;
}

function resolveHandle(req) {
  if (!req) return '';
  const fromHeader = req.headers && req.headers['x-lab-handle'];
  const cookies = (req.headers && req.headers.cookie) || '';
  const fromCookie = cookies.split(';').map((c) => c.trim()).find((c) => c.startsWith('balacubaco_handle='));
  const handleCookie = fromCookie ? decodeURIComponent(fromCookie.split('=')[1]) : null;
  const fromQuery = req.query && req.query.handle;
  const fromSession = req.session && req.session.handle;
  return normalizeHandle(fromHeader || handleCookie || fromQuery || fromSession || '');
}

module.exports = { generateFlag, validateFlag, resolveHandle, BASE_FLAGS, normalizeHandle };
