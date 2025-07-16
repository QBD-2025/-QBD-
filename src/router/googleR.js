const express = require('express');
const passport = require('passport');
const router = express.Router();

router.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    // Establecer la sesión manualmente si usas Handlebars y no Passport completo
    req.session.user = {
      id: req.user.id,
      username: req.user.username,
      email: req.user.email
    };

    res.redirect('/perfil');

    res.redirect('/presentacion');

  }
);

module.exports = router;