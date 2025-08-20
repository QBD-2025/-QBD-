const express = require('express');
const router  = express.Router();

// routes/usuario.js (o lo que uses)
router.get('/presentacion', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }

  res.render('presentacion', {
    layout: 'main',             
    user: req.session.user
  });
});

module.exports = router;