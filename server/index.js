const path = require('path');
const express = require('express');

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

app.listen(PORT, () => {
  console.log('==============================================');
  console.log(' BalacubacoSHOP - Laboratorio de Seguranca Web');
  console.log(`   Rodando em http://localhost:${PORT}`);
  console.log(`   LAB_MODE: ${LAB_MODE}`);
  console.log('   Uso educacional/isolado. Nao exponha na internet.');
  console.log('==============================================');
});
