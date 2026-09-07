const express = require('express');
const { selectOne, selectRows } = require('../lib/supabase');
const { generateFlag, resolveHandle } = require('../utils/flags');

const router = express.Router();

async function getSessionUser(req) {
  if (!req.session.userId) return null;
  return selectOne('users', [['id', 'eq', req.session.userId]], 'id,name,email,role');
}

router.get('/dashboard', async (req, res, next) => {
  try {
    const headerRole = req.headers['x-role'];
    const cookieRole = (req.headers.cookie || '')
      .split(';')
      .map((c) => c.trim())
      .find((c) => c.startsWith('bala_role='));
    const claimedRole = headerRole || (cookieRole ? cookieRole.split('=')[1] : null);

    if (claimedRole !== 'admin') {
      return res.status(403).json({ error: 'Acesso restrito ao administrador.' });
    }

    const [users, orders] = await Promise.all([
      selectRows('users', { select: 'id' }),
      selectRows('orders', { select: 'total' }),
    ]);

    const totalUsers = users.length;
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((acc, order) => acc + Number(order.total || 0), 0);
    const handle = resolveHandle(req);

    res.json({
      totalUsers,
      totalOrders,
      totalRevenue,
      flag: generateFlag('m04', handle),
    });
  } catch (err) {
    next(err);
  }
});

router.get('/flag', async (req, res, next) => {
  try {
    const user = await getSessionUser(req);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Acesso restrito ao administrador.' });
    }
    const handle = resolveHandle(req);
    res.json({ flag: generateFlag('m07', handle) });
  } catch (err) {
    next(err);
  }
});

router.get('/users', async (req, res, next) => {
  try {
    const user = await getSessionUser(req);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Acesso restrito ao administrador.' });
    }
    const users = await selectRows('users', { select: 'id,name,email,role,phone,created_at', order: 'id.asc' });
    res.json(users);
  } catch (err) {
    next(err);
  }
});

router.get('/reviews', async (req, res, next) => {
  try {
    const user = await getSessionUser(req);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Acesso restrito ao administrador.' });
    }

    const [reviews, products] = await Promise.all([
      selectRows('reviews', { select: '*', order: 'created_at.desc' }),
      selectRows('products', { select: 'id,name' }),
    ]);
    const productMap = new Map(products.map((product) => [Number(product.id), product.name]));
    const normalized = reviews.map((review) => ({
      ...review,
      product_name: productMap.get(Number(review.product_id)) || null,
    }));

    res.json(normalized);
  } catch (err) {
    next(err);
  }
});

router.get('/tickets', async (req, res, next) => {
  try {
    const user = await getSessionUser(req);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Acesso restrito ao administrador.' });
    }
    const tickets = await selectRows('support_tickets', { select: '*', order: 'created_at.desc' });
    res.json(tickets);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
