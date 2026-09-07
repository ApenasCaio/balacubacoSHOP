const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { updateRows } = require('../lib/supabase');
const { generateFlag, resolveHandle } = require('../utils/flags');

const router = express.Router();

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads', 'avatars');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

function requireLogin(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'Faca login para continuar.' });
  next();
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const unsafeName = `${req.session.userId}_${file.originalname}`;
    cb(null, unsafeName);
  },
});
const upload = multer({ storage });

router.post('/avatar', requireLogin, upload.single('avatar'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    const publicPath = `/uploads/avatars/${req.file.filename}`;
    await updateRows('users', [['id', 'eq', req.session.userId]], { avatar_url: publicPath });
    res.status(201).json({ url: publicPath });
  } catch (err) {
    next(err);
  }
});

router.get('/download', (req, res) => {
  const { name } = req.query;
  if (!name) return res.status(400).json({ error: 'Parametro "name" e obrigatorio.' });

  const sanitized = name.replace(/\.\.\//g, '');
  const hasDirectTraversal = name.includes('../');
  const hasBypass = name.includes('....//') || name.includes('..\\');
  if (hasDirectTraversal && !hasBypass) {
    return res.status(400).json({
      error: "WAF Bloqueio: Sequencia '../' detectada e neutralizada. Tente um bypass de filtro (ex: duplicacao '....//' ou barras invertidas)!",
    });
  }

  const effectiveName = hasBypass ? sanitized : name;
  const filePath = path.join(UPLOADS_DIR, effectiveName);

  if (filePath.endsWith('flag_m05.txt') || filePath.includes('private')) {
    const handle = resolveHandle(req);
    const flag = generateFlag('m05', handle);
    return res.type('text/plain').send(`BalacubacoSHOP Security Lab - Flag da Missao 05:\n${flag}\n\nGuarde esta flag e submeta no painel do laboratorio.\n`);
  }

  res.sendFile(filePath, (err) => {
    if (err) res.status(404).json({ error: 'Arquivo nao encontrado.', path: filePath });
  });
});

module.exports = router;
