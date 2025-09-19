// googleR.js - VERSIÓN FINAL Y MÁS LIGERA

const express = require('express');
const passport = require('passport');
const router = express.Router();
const pool = require('../db/conexion'); // Importamos el pool para la consulta de datos

router.get('/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login?error=authFailedForNotVerification' }),
    async (req, res) => {
        // Autenticación exitosa. El usuario está en req.user
        req.session.user = {
            id_usuario: req.user.id_usuario,
            username: req.user.username,
            email: req.user.email,
            id_tp_usuario: req.user.id_tp_usuario,
            foto_perfil: req.user.foto_perfil,
        };

        global.sesionesActivas.add(req.user.id_usuario);
        
        // Lógica de redirección según el rol
        switch (req.user.id_tp_usuario) {
            case 3:
                return res.redirect('/admin');
            case 2:
                return res.redirect('/editor/panel');
            default: {
                try {
                    const [datos] = await req.pool.query('SELECT dato, imagen FROM dato_curioso ORDER BY RAND() LIMIT 1');
                    const datoCurioso = datos[0];
                    return res.render('dato-sesion', {
                        layout: false,
                        dato: datoCurioso.dato,
                        imagen: datoCurioso.imagen ? datoCurioso.imagen.toString('base64') : null,
                    });
                } catch (error) {
                    console.error('Error al obtener dato curioso:', error);
                    return res.redirect('/menu_principal');
                }
            }
        }
    }
);

module.exports = router;