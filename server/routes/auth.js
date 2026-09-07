const express = require('express');
const crypto = require('crypto');
const { insertRows, selectOne } = require('../lib/supabase');
const { generateFlag, resolveHandle } = require('../utils/flags');

const router = express.Router();

function weakHash(plain) {
  return crypto.createHash('sha256').update(plain).digest('hex');
}

function looksLikeBypassPayload(email) {
  const value = String(email || '');
  return /('|--|\/\*|\bor\b\s*1\s*=\s*1|\b2\s*>\s*1\b|\b'a'\s*=\s*'a'\b)/i.test(value);
}

router.post('/login', async (req, res, next) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Informe email e senha.' });
  }

  // WAF Anti-IA: Bloqueia a assinatura padrao "'1'='1'" e o comentario "--"
  if (email.includes("'1'='1'") || email.includes('--')) {
    return res.status(400).json({
      error: "WAF Bloqueio: Assinatura de payload padrao ('1'='1' ou '--') detectada. Tente um bypass alternativo (ex: 2>1 ou 'a'='a' e comentario /*)!",
    });
  }

  try {
    const bypass = looksLikeBypassPayload(email);
    const user = bypass
      ? await selectOne('users', [['role', 'eq', 'admin']], 'id,name,email,role,password')
      : await selectOne('users', [['email', 'eq', email]], 'id,name,email,role,password');
    if (!user) {
      return res.status(401).json({ error: 'Credenciais invalidas.' });
    }

    if (!bypass && user.password !== weakHash(password)) {
      return res.status(401).json({ error: 'Credenciais invalidas.' });
    }

    req.session.userId = user.id;
    req.session.role = user.role;
    req.saveSession();

    res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
  } catch (err) {
    next(err);
  }
});

router.post('/register', async (req, res, next) => {
  const { name, email, password, role, is_admin, access_level, secret_note } = req.body || {};
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Nome, email e senha sao obrigatorios.' });
  }

  if (role) {
    return res.status(400).json({
      error: 'WAF Bloqueio: O campo "role" nao e aceito diretamente no cadastro. Faca fuzzing de outros parametros JSON para escalar privilegios!',
    });
  }

  try {
    const existing = await selectOne('users', [['email', 'eq', email]], 'id');
    if (existing) {
      return res.status(409).json({ error: 'Email ja cadastrado.' });
    }

    const assignedRole = (is_admin === true || is_admin === 'true' ? 'admin' : (Number(access_level) >= 99 ? 'admin' : 'customer'));

    const [created] = await insertRows('users', {
      name,
      email,
      password: weakHash(password),
      role: assignedRole,
      secret_note: secret_note || null,
    });

    req.session.userId = created.id;
    req.session.role = created.role;
    req.saveSession();

    res.status(201).json({ id: created.id, name: created.name, email: created.email, role: created.role });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', (req, res) => {
  req.destroySession();
  res.json({ ok: true });
});

router.get('/me', async (req, res, next) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Nao autenticado.' });
  try {
    const user = await selectOne('users', [['id', 'eq', req.session.userId]], 'id,name,email,role,avatar_url,secret_note');
    if (!user) return res.status(401).json({ error: 'Sessao invalida.' });

    if (user.role === 'admin' || user.id === 1) {
      const handle = resolveHandle(req);
      user.secret_note = `Nota interna (RH): revisar acessos no proximo sprint. Flag do laboratorio - Missao 01 (SQL Injection / Autenticacao): ${generateFlag('m01', handle)}`;
    }

    res.json(user);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
