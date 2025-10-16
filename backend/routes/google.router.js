const express = require('express');
const passport = require('passport');
const router = express.Router();

router.get('/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login?error=authFailedForNotVerification' }),
    async (req, res) => {
        const user = req.user; // Usuario autenticado

        try {
            // Verificar si el usuario ya tiene carrera
            const [carreraResult] = await req.pool.query(
                `SELECT c.id_carrera
                FROM carrera c
                INNER JOIN usuario_carrera uc ON c.id_carrera = uc.id_carrera
                WHERE uc.id_usuario = ?
                LIMIT 1`,
                [user.id_usuario]
            );

            // Crear sesión parcial si no tiene carrera
            if (!carreraResult || carreraResult.length === 0) {
                req.session.user = {
                    id_usuario: user.id_usuario,
                    username: user.username,
                    email: user.email,
                    id_tp_usuario: user.id_tp_usuario,
                    avatarUrl: user.foto_perfil || '/media/images/default_avatar.png',
                    id_carrera: null
                };
                global.sesionesActivas.add(user.id_usuario);
                return res.redirect('/sin-carrera');
            }

            // Crear sesión completa si ya tiene carrera
            req.session.user = {
                id_usuario: user.id_usuario,
                username: user.username,
                email: user.email,
                id_tp_usuario: user.id_tp_usuario,
                avatarUrl: user.foto_perfil || '/media/images/default_avatar.png',
                id_carrera: carreraResult[0].id_carrera
            };

            global.sesionesActivas.add(user.id_usuario);

            // Redirección según rol
            switch (user.id_tp_usuario) {
                case 3:
                    return res.redirect('/admin');
                case 2:
                    return res.redirect('/editor/panel');
                default:
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

        } catch (error) {
            console.error('Error al verificar carrera del usuario Google:', error);
            return res.redirect('/login?error=serverError');
        }
    }
);

module.exports = router;