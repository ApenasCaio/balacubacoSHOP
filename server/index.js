const path = require('path');
const express = require('express');
const os = require('os');

const { sessionMiddleware } = require('./middleware/session');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const fileRoutes = require('./routes/files');
const adminRoutes = require('./routes/admin');
const debugRoutes = require('./routes/debug');
const labRoutes = require('./routes/lab');
const supportRoutes = require('./routes/support');

const app = express();
const PORT = process.env.PORT || 3000;
const LAB_MODE = process.env.LAB_MODE !== 'false';

// Process --host command line flag, process.env.npm_config_host, or process.env.HOST
let HOST = process.env.HOST || null;
if (!HOST && process.env.npm_config_host) {
  HOST = (process.env.npm_config_host === 'true' || process.env.npm_config_host === '') ? '0.0.0.0' : process.env.npm_config_host;
}

const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--host' || arg === '-h') {
    const nextArg = args[i + 1];
    if (nextArg && !nextArg.startsWith('-')) {
      HOST = nextArg;
    } else {
      HOST = '0.0.0.0';
    }
  } else if (arg.startsWith('--host=')) {
    HOST = arg.split('=')[1] || '0.0.0.0';
  }
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(sessionMiddleware);

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/debug', debugRoutes);
app.use('/api/lab', labRoutes);
app.use('/api/support', supportRoutes);

app.get('/api/health', (_req, res) => res.json({ status: 'ok', lab: 'BalacubacoSHOP', mode: LAB_MODE ? 'lab' : 'strict' }));

app.use('/api', (_req, res) => res.status(404).json({ error: 'Endpoint nao encontrado.' }));


app.use((err, req, res, _next) => {
  console.error(err);
  if (LAB_MODE) {
    return res.status(500).json({
      error: err.message,
      stack: err.stack,
      sqlQuery: err.sqlQuery || null,
      hint: 'Ambiente de laboratorio (LAB_MODE=true): mensagens de erro verbosas propositalmente habilitadas.',
    });
  }
  res.status(500).json({ error: 'Erro interno do servidor.' });
});

function getLocalIPs() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        addresses.push(net.address);
      }
    }
  }
  return addresses;
}

const listenArgs = [PORT];
if (HOST) {
  listenArgs.push(HOST);
}

listenArgs.push(() => {
  console.log('==============================================');
  console.log(' BalacubacoSHOP - Laboratorio de Seguranca Web');
  console.log(`   Local:   http://localhost:${PORT}`);
  if (HOST === '0.0.0.0') {
    const localIPs = getLocalIPs();
    if (localIPs.length > 0) {
      localIPs.forEach(ip => {
        console.log(`   Rede:    http://${ip}:${PORT}`);
      });
    } else {
      console.log(`   Rede:    http://0.0.0.0:${PORT}`);
    }
  } else if (HOST && HOST !== '127.0.0.1' && HOST !== 'localhost') {
    console.log(`   Rede:    http://${HOST}:${PORT}`);
  }
  console.log(`   LAB_MODE: ${LAB_MODE}`);
  console.log('   Uso educacional/isolado. Nao exponha na internet.');
  console.log('==============================================');
});

app.listen(...listenArgs);

