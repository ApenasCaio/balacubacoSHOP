// Sessao simplificada para o laboratorio.


const COOKIE_NAME = 'balacubaco_sid';

const sessions = new Map();
let nextSessionId = 1000;

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  header.split(';').forEach((pair) => {
    const idx = pair.indexOf('=');
    if (idx === -1) return;
    const key = pair.slice(0, idx).trim();
    const val = pair.slice(idx + 1).trim();
    out[key] = decodeURIComponent(val);
  });
  return out;
}

function sessionMiddleware(req, res, next) {
  const cookies = parseCookies(req.headers.cookie);
  let sid = cookies[COOKIE_NAME];

  if (!sid || !sessions.has(sid)) {
    sid = String(nextSessionId++); // predictable, sequential session id
    sessions.set(sid, {});
    // Intentionally NOT HttpOnly, NOT Secure, NOT SameSite=Strict.
    res.setHeader('Set-Cookie', `${COOKIE_NAME}=${sid}; Path=/`);
  }

  req.sessionId = sid;
  req.session = sessions.get(sid);
  if (cookies.balacubaco_handle) {
    req.session.handle = decodeURIComponent(cookies.balacubaco_handle);
  }
  if (req.headers['x-lab-handle']) {
    req.session.handle = req.headers['x-lab-handle'].toString().trim();
  }
  req.saveSession = () => sessions.set(sid, req.session);
  req.destroySession = () => sessions.delete(sid);

  next();
}

module.exports = { sessionMiddleware, sessions, COOKIE_NAME };
