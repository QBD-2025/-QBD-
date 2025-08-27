const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { enviarCorreoRecuperacion } = require('../public/utils/mail.js');

// ----------------- Sesiones activas -----------------
global.sesionesActivas = new Set(); // Para saber quién está en sesión

// ----------------- Middlewares -----------------
const isAuthenticated = (req, res, next) => {
    if (req.session.user) return next();
    return res.redirect('/login');
};

const isAdmin = (req, res, next) => {
    if (req.session.user?.id_tp_usuario === 3) return next();
    return res.status(403).render('error', {
        layout: 'main',
        mensajeError: 'Acceso reservado para administradores',
    });
};

const isEditor = (req, res, next) => {
    if (req.session.user?.id_tp_usuario === 2 || req.session.user?.id_tp_usuario === 3) return next();
    return res.status(403).render('error', {
        layout: 'main',
        mensajeError: 'Acceso reservado para editores',
    });
};

// ----------------- Rutas -----------------

// Menú principal
router.get('/menu_principal', isAuthenticated, (req, res) => {
    res.render('menu_principal', {
        layout: 'main',
        title: 'Perfil',
        user: req.session.user,
    });
});

// Login - vista
router.get('/login', (req, res) => {
    res.render('login', {
        error: req.query.error,
        verificado: req.query.verificado,
        layout: 'auth-layout',
        title: 'Iniciar Sesión',
    });
});

// Procesar login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const [rows] = await req.pool.query(
            `SELECT id_usuario, username, email, password, verificado, 
                    id_tp_usuario, id_status, suspension_fin 
             FROM usuario WHERE email = ?`,
            [email]
        );

        if (rows.length === 0) return res.redirect('/login?error=El usuario no existe');

        const user = rows[0];

        // Usuario pendiente
        if (user.id_status === 4) {
            return res.render('estado-cuenta', {
                layout: false,
                titulo: "Cuenta pendiente",
                mensaje: "Tu cuenta está pendiente de aprobación. Contacta con el administrador."
            });
        }

        // Usuario suspendido
        if (user.id_status === 3) {
            if (user.suspension_fin && new Date(user.suspension_fin) > new Date()) {
                return res.render('estado-cuenta', {
                    layout: false,
                    titulo: "Cuenta suspendida",
                    mensaje: `Tu cuenta está suspendida hasta el ${user.suspension_fin}`
                });
            } else {
                // Reactivar si ya venció la suspensión
                await req.pool.query(
                    'UPDATE usuario SET id_status = 1, suspension_fin = NULL WHERE id_usuario = ?',
                    [user.id_usuario]
                );
                user.id_status = 1;
            }
        }

        // Usuario no verificado
        if (user.verificado === 0) {
            return res.redirect(`/verificacion?correo=${encodeURIComponent(email)}&error=Cuenta no verificada`);
        }

        // Validar contraseña
        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.redirect('/login?error=Contraseña incorrecta');

        // Crear sesión
        req.session.user = {
            id_usuario: user.id_usuario,
            username: user.username,
            email: user.email,
            id_tp_usuario: user.id_tp_usuario,
        };

        // Marcar usuario activo
        if (user.id_status !== 1) {
            await req.pool.query('UPDATE usuario SET id_status = 1 WHERE id_usuario = ?', [user.id_usuario]);
        }

        // Agregar a sesiones activas
        global.sesionesActivas.add(user.id_usuario);

        req.session.save(async (err) => {
            if (err) return res.redirect('/login?error=serverError');

            // Redirecciones según rol
            switch (user.id_tp_usuario) {
                case 3:
                    return res.redirect('/admin');
                case 2:
                    return res.redirect('/editor/panel');
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
        });

    } catch (error) {
        console.error('Error al iniciar sesión:', error);
        return res.redirect('/login?error=serverError');
    }
});

// Presentación
router.get('/presentacion', (req, res) => {
    res.render('presentacion', {
        user: req.session.user,
        layout: 'main',
        title: 'Bienvenida',
    });
});

// Panel admin
router.get('/admin', isAuthenticated, isAdmin, (req, res) => {
    res.render('admin', {
        layout: 'admin-layout',
        title: 'Panel de Administración',
        user: req.session.user,
    });
});

// Panel editor
router.get('/editor/panel', isAuthenticated, isEditor, (req, res) => {
    res.render('editor/panel', {
        layout: 'editor-layout',
        title: 'Panel de Editor',
        user: req.session.user,
    });
});

// Logout
router.get('/logout', async (req, res) => {
    try {
        if (req.session.user) {
            const userId = req.session.user.id_usuario;

            // Marcar usuario inactivo
            await req.pool.query('UPDATE usuario SET id_status = 2 WHERE id_usuario = ?', [userId]);

            // Eliminar de sesiones activas
            global.sesionesActivas.delete(userId);
        }

        req.session.destroy((err) => {
            res.clearCookie('connect.sid');
            return res.redirect('/');
        });
    } catch (dbError) {
        console.error('Error logout:', dbError);
        req.session.destroy(() => {
            res.clearCookie('connect.sid');
            return res.redirect('/');
        });
    }
});

module.exports = router;
