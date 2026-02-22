const express = require('express');
const passport = require('passport');
const router = express.Router();

router.get('/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/auth/google/callback',
    (req, res, next) => {
        passport.authenticate('google', (err, user, info) => {
            if (err) {
                console.error('Error en autenticación Google:', err);
                return res.redirect('/login?error=serverError');
            }

            if (!user && info) {
                if (info.message === 'pending') {
                    return res.render('estado-cuenta', {
                        layout: false,
                        titulo: info.statusInfo?.titulo || "Cuenta pendiente",
                        mensaje: info.statusInfo?.mensaje || "Tu cuenta está pendiente de aprobación."
                    });
                }

                if (info.message === 'suspended') {
                    return res.render('estado-cuenta', {
                        layout: false,
                        titulo: info.statusInfo?.titulo || "Cuenta suspendida",
                        mensaje: info.statusInfo?.mensaje || "Tu cuenta está suspendida."
                    });
                }

                return res.redirect('/login?error=' + encodeURIComponent(info.message || 'Error al autenticar'));
            }

            if (!user) {
                return res.redirect('/login?error=Error al autenticar con Google');
            }

            req.logIn(user, async (loginErr) => {
                if (loginErr) {
                    console.error('Error al establecer sesión:', loginErr);
                    return res.redirect('/login?error=serverError');
                }

                try {
                    const [carreraResult] = await req.pool.query(
                        `SELECT c.id_carrera
                        FROM carrera c
                        INNER JOIN usuario_carrera uc ON c.id_carrera = uc.id_carrera
                        WHERE uc.id_usuario = ?
                        LIMIT 1`,
                        [user.id_usuario]
                    );

                    // Objeto de sesión base
                    const sessionData = {
                        id_usuario: user.id_usuario,
                        username: user.username,
                        email: user.email,
                        apodo: user.apodo || user.username,
                        descripcion: user.descripcion || '',
                        id_tp_usuario: user.id_tp_usuario,
                        foto_perfil: user.foto_perfil || '/uploads/default_avatar.png',
                        primer_ingreso: user.primer_ingreso || 0
                    };

                    global.sesionesActivas = global.sesionesActivas || new Set();

                    // Sin carrera → redirigir a /sin-carrera (que renderiza elegir_carrera)
                    if (!carreraResult || carreraResult.length === 0) {
                        req.session.user = { ...sessionData, id_carrera: null };
                        global.sesionesActivas.add(user.id_usuario);
                        return res.redirect('/sin-carrera');
                    }

                    // Con carrera → sesión completa
                    req.session.user = { ...sessionData, id_carrera: carreraResult[0].id_carrera };
                    global.sesionesActivas.add(user.id_usuario);

                    switch (user.id_tp_usuario) {
                        case 3:
                            return res.redirect('/admin');
                        case 2:
                            return res.redirect('/editor');
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
            });
        })(req, res, next);
    }
);

module.exports = router;