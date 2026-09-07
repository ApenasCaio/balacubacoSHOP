const express = require('express');
const { selectOne, selectRows, updateRows, deleteRows } = require('../lib/supabase');
const { generateFlag, resolveHandle } = require('../utils/flags');

const router = express.Router();
const MASTER_PASSWORD = process.env.LAB_MASTER_PASSWORD || 'b@cubaco1!';

function requireLogin(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'Faca login para continuar.' });
  next();
}

router.get('/:id', requireLogin, async (req, res, next) => {
  try {
    const user = await selectOne(
      'users',
      [['id', 'eq', req.params.id]],
      'id,name,email,role,cpf,phone,address,avatar_url,idor_flag,secret_note'
    );

    if (!user) return res.status(404).json({ error: 'Usuario nao encontrado.' });

    const handle = resolveHandle(req);
    if (user.id === 1 || user.role === 'admin') {
      user.idor_flag = generateFlag('m02', handle);
      user.secret_note = `Nota interna (RH): revisar acessos no proximo sprint. Flag do laboratorio - Missao 01 (SQL Injection / Autenticacao): ${generateFlag('m01', handle)}`;
    }

    res.json(user);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', requireLogin, async (req, res, next) => {
  try {
    const { name, phone, address } = req.body || {};
    const updated = await updateRows('users', [['id', 'eq', req.params.id]], {
      name,
      phone,
      address,
    });
    const user = Array.isArray(updated) ? updated[0] : updated;
    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      cpf: user.cpf,
      phone: user.phone,
      address: user.address,
      avatar_url: user.avatar_url,
    });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireLogin, async (req, res, next) => {
  try {
    if (req.session.role !== 'admin') {
      return res.status(403).json({ error: 'Apenas administradores podem excluir usuarios.' });
    }

    const userId = Number(req.params.id);
    if (!Number.isInteger(userId)) {
      return res.status(400).json({ error: 'Usuario invalido.' });
    }
    if (userId === 1) {
      return res.status(403).json({ error: 'Registro protegido.' });
    }

    const { masterPassword } = req.body || {};
    if (masterPassword !== MASTER_PASSWORD) {
      return res.status(401).json({ error: 'Senha mestre incorreta.' });
    }

    const user = await selectOne('users', [['id', 'eq', userId]], 'id,role');
    if (!user) {
      return res.status(404).json({ error: 'Usuario nao encontrado.' });
    }

    const [reviews, tickets, orders] = await Promise.all([
      selectOne('reviews', [['user_id', 'eq', userId]], 'id'),
      selectOne('support_tickets', [['user_id', 'eq', userId]], 'id'),
      selectRows('orders', { select: 'id', filters: [['user_id', 'eq', userId]] }),
    ]);

    if (reviews) {
      await deleteRows('reviews', [['user_id', 'eq', userId]]);
    }

    if (tickets) {
      await deleteRows('support_tickets', [['user_id', 'eq', userId]]);
    }

    if (orders && orders.length) {
      for (const order of orders) {
        await deleteRows('order_items', [['order_id', 'eq', order.id]]);
        await deleteRows('orders', [['id', 'eq', order.id]]);
      }
    }

    await deleteRows('users', [['id', 'eq', userId]]);

    if (req.session.userId === userId) {
      req.destroySession();
    }

    res.json({ ok: true, deletedUserId: userId, role: user.role });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
