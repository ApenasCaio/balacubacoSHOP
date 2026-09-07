const express = require('express');
const { generateFlag, resolveHandle } = require('../utils/flags');
const { insertRows, selectOne, selectRows, updateRows } = require('../lib/supabase');

const router = express.Router();

function requireLogin(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'Faca login para continuar.' });
  next();
}

router.get('/', requireLogin, async (req, res, next) => {
  try {
    const orders = await selectRows('orders', { filters: [['user_id', 'eq', req.session.userId]], order: 'created_at.desc' });
    res.json(orders);
  } catch (err) {
    next(err);
  }
});

router.post('/', requireLogin, async (req, res, next) => {
  try {
    const { items, shipping_address } = req.body || {};
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Carrinho vazio.' });
    }

    const productIds = items.map((item) => Number(item.productId)).filter((id) => Number.isInteger(id));
    const products = await selectRows('products', { select: 'id,name,price' });
    const productMap = new Map(products.map((product) => [Number(product.id), product]));

    let total = 0;
    const resolvedItems = [];
    for (const item of items) {
      const product = productMap.get(Number(item.productId));
      if (!product) continue;
      const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
      total += Number(product.price) * qty;
      resolvedItems.push({ product_id: product.id, quantity: qty, price: product.price });
    }

    const [order] = await insertRows('orders', {
      user_id: req.session.userId,
      status: 'processando',
      total,
      shipping_address: shipping_address || '',
    });

    if (resolvedItems.length) {
      await insertRows('order_items', resolvedItems.map((item) => ({
        order_id: order.id,
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.price,
      })));
    }

    res.status(201).json({ id: order.id, total });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', requireLogin, async (req, res, next) => {
  try {
    const order = await selectOne('orders', [['id', 'eq', req.params.id]], '*');
    if (!order) return res.status(404).json({ error: 'Pedido nao encontrado.' });
    const items = await selectRows('order_items', { filters: [['order_id', 'eq', order.id]], order: 'id.asc' });

    if (String(order.id) === '3' || order.user_id === 1) {
      const handle = resolveHandle(req);
      order.internal_note = `Pedido de teste interno. NAO enviar para producao. Flag do laboratorio - Missao 06 (IDOR / Pedidos): ${generateFlag('m06', handle)}`;
    }

    res.json({ ...order, items });
  } catch (err) {
    next(err);
  }
});

router.all('/:id/cancel', requireLogin, async (req, res, next) => {
  try {
    const order = await selectOne('orders', [['id', 'eq', req.params.id]], 'id');
    if (!order) return res.status(404).json({ error: 'Pedido nao encontrado.' });
    await updateRows('orders', [['id', 'eq', order.id]], { status: 'cancelado' });
    res.json({ ok: true, id: order.id, status: 'cancelado' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
