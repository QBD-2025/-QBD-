// googleR.js - VERSIÓN CORREGIDA

const express = require('express');
const passport = require('passport');
const router = express.Router();

router.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }
  ), async (req, res) => { 
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

    try {
      // Usamos el objeto de sesión, no una variable inexistente
      switch (req.session.user.id_tp_usuario) {
        case 3:
          return res.redirect('/admin');
        case 2:
          return res.redirect('/editor');
        default: {
          const [datos] = await req.pool.query('SELECT dato, imagen FROM dato_curioso ORDER BY RAND() LIMIT 1');
          const datoCurioso = datos[0];

          return res.render('dato-sesion', {
            layout: false,
            dato: datoCurioso.dato,
            imagen: datoCurioso.imagen ? datoCurioso.imagen.toString('base64') : null,
          });
        }
      }
    } catch (error) {
      console.error('Error al obtener dato curioso:', error);
      return res.redirect('/menu_principal');
    }
  }
);


module.exports = router;