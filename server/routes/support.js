const express = require('express');
const { insertRows } = require('../lib/supabase');

const router = express.Router();

router.post('/', async (req, res, next) => {
  try {
    const { name, email, subject, message } = req.body || {};
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ error: 'Preencha todos os campos.' });
    }
    const userId = req.session.userId || null;
    const [ticket] = await insertRows('support_tickets', {
      user_id: userId,
      name,
      email,
      subject,
      message,
    });
    res.status(201).json({ id: ticket.id });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
