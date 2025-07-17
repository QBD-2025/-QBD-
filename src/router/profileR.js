const express = require('express');
const router  = express.Router();

// routes/usuario.js (o lo que uses)
router.get('/presentacion', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }

  res.render('presentacion', {
    layout: false,                // ⬅️ 🔥 ¡ESTO es lo importante!
    user: req.session.user
  });
});

module.exports = router;