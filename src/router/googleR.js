// googleR.js - VERSIÓN CORREGIDA

const express = require('express');
const passport = require('passport');
const router = express.Router();

router.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    // ✨ 1. Guardamos el usuario COMPLETO en la sesión, incluyendo su rol
    req.session.user = {
      id_usuario: req.user.id_usuario,
      username: req.user.username,
      email: req.user.email,
      id_tp_usuario: req.user.id_tp_usuario // ¡Esta línea es clave!
    };

    // ✨ 2. Usamos la misma lógica de redirección que en tu loginR.js
    //    Usamos los IDs numéricos (3 para Admin, 2 para Editor).
    console.log('Usuario autenticado con Google:', req.session.user);
    switch (req.user.id_tp_usuario) {
      case 3: // ID para 'ADMINISTRADOR'
        return res.redirect('/admin');
      case 2: // ID para 'EDITOR'
        return res.redirect('/editor/panel');
      default: // ID 1 para 'USUARIO'
        return res.redirect('/perfil2');
    }
  }
);

module.exports = router;