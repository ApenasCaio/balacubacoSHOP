const express = require('express');
const { insertRows, selectOne, selectRows } = require('../lib/supabase');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const { category, q } = req.query;
    const [products, categories] = await Promise.all([
      selectRows('products', { select: '*' }),
      selectRows('categories', { select: '*' }),
    ]);

    const categoryMap = new Map(categories.map((c) => [c.id, c]));
    let rows = products.map((product) => ({
      ...product,
      category_slug: categoryMap.get(product.category_id)?.slug || null,
    }));

    if (category) {
      rows = rows.filter((row) => row.category_slug === category);
    } else if (q) {
      const query = String(q).toLowerCase();
      rows = rows.filter((row) => String(row.name || '').toLowerCase().includes(query) || String(row.description || '').toLowerCase().includes(query));
    }

    res.json({ products: rows, queryEcho: q || null });
  } catch (err) {
    next(err);
  }
});

router.get('/categories', async (_req, res, next) => {
  try {
    res.json(await selectRows('categories', { select: '*', order: 'name.asc' }));
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const product = await selectOne('products', [['id', 'eq', req.params.id]], '*');
    if (!product) return res.status(404).json({ error: 'Produto nao encontrado.' });
    res.json(product);
  } catch (err) {
    next(err);
  }
});

router.get('/:id/reviews', async (req, res, next) => {
  try {
    res.json(
      await selectRows('reviews', {
        select: '*',
        filters: [['product_id', 'eq', req.params.id]],
        order: 'created_at.desc',
      })
    );
  } catch (err) {
    next(err);
  }
});

router.post('/:id/reviews', async (req, res, next) => {
  try {
    const { author_name, rating, comment } = req.body || {};
    if (!comment) return res.status(400).json({ error: 'Comentario obrigatorio.' });

    const lowerComment = String(comment).toLowerCase();
    if (lowerComment.includes('<script') || lowerComment.includes('alert(')) {
      return res.status(400).json({
        error: "WAF Bloqueio: Tags <script> e chamadas diretas de alert() estao bloqueadas. Use tags alternativas (ex: <img>, <svg>) e outros metodos JS (ex: console.log, document.title, fetch)!",
      });
    }

    const userId = req.session.userId || null;
    const [review] = await insertRows('reviews', {
      product_id: Number(req.params.id),
      user_id: userId,
      author_name: author_name || 'Anonimo',
      rating: rating || 5,
      comment,
    });

    res.status(201).json(review);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
