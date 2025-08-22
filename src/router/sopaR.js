// En tu archivo de rutas (ej. sopa_letrasR.js)
const express = require('express');
const router = express.Router();

// Asegúrate de tener esta ruta para manejar salas dinámicas
router.get('/sopa-letras/:salaId', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login?returnTo=' + req.originalUrl);
  }
  res.render('sopa-letras', {
    title: 'Sopa de Letras Multijugador',
    layout: "main",
    user: req.session.user,
    salaId: req.params.salaId
  });
});

module.exports = router;