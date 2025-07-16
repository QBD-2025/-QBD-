const express = require('express');
const router  = express.Router();

// routes/usuario.js (o lo que uses)

router.get('/perfil', (req, res) => {

router.get('/presentacion', (req, res) => {

  if (!req.session.user) {
    return res.redirect('/login');
  }


  res.render('perfil', {

  res.render('presentacion', {

    layout: false,                // ⬅️ 🔥 ¡ESTO es lo importante!
    user: req.session.user
  });
});

module.exports = router;