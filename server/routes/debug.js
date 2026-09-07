const express = require('express');
const os = require('os');
const path = require('path');
const { generateFlag, resolveHandle } = require('../utils/flags');

const router = express.Router();

router.get('/info', (req, res) => {
  const handle = resolveHandle(req);
  res.json({
    warning: 'Este endpoint nao deveria existir em producao.',
    node_version: process.version,
    platform: os.platform(),
    hostname: os.hostname(),
    uptime_seconds: process.uptime(),
    cwd: process.cwd(),
    db_path: process.env.DB_PATH || path.join(__dirname, '..', '..', 'data', 'balacubaco.db'),
    env: {
      NODE_ENV: process.env.NODE_ENV,
      SESSION_SECRET: process.env.SESSION_SECRET || 'balacubaco123',
      LAB_MODE: process.env.LAB_MODE,
    },
    flag: generateFlag('m08', handle),
  });
});

module.exports = router;
