const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { enviarCorreoRecuperacion } = require('../public/utils/mail.js');

// Middlewares de verificación de roles

const isAuthenticated = (req, res, next) => {
    if (req.session.user) return next();
    return res.redirect('/login');
};

const isAdmin = (req, res, next) => {
    console.log('Verificando rol admin:', req.session.user?.id_tp_usuario);
    if (req.session.user?.id_tp_usuario === 3) return next();
    return res.status(403).render('error', {
        layout: 'main',
        mensajeError: 'Acceso reservado para administradores',
    });
};

const isEditor = (req, res, next) => {
    if (
        req.session.user?.id_tp_usuario === 2 ||
        req.session.user?.id_tp_usuario === 3
    )
        return next();
    return res.status(403).render('error', {
        layout: 'main',
        mensajeError: 'Acceso reservado para editores',
    });
};

// Rutas
router.get('/perfil2', (req, res) => {
    res.render('perfil2', {
        layout: 'main',
        title: 'Perfil',
    });
});

router.get('/login', (req, res) => {
    const error = req.query.error;
    const verificado = req.query.verificado;
    res.render('login', {
        error,
        verificado,
        layout: 'auth-layout',
        title: 'Iniciar Sesión',
    });
});

router.get('/presentacion', (req, res) => {
    res.render('presentacion', {
        user: req.session.user,
        layout: 'main',
        title: 'Bienvenida',
    });
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    console.log('Datos de inicio de sesión recibidos:', { email, password });

    try {
        const [rows] = await req.pool.query(
            'SELECT id_usuario, username, email, password, verificado, id_tp_usuario FROM usuario WHERE email = ?',
            [email]
        );

        if (rows.length === 0) {
            return res.redirect('/login?error=El usuario no existe');
        }
        const user = rows[0];

        if (user.verificado == 0) {
            return res.redirect(
                `/verificacion?correo=${encodeURIComponent(email)}&error=Cuenta no verificada`
            );
        }

        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.redirect('/login?error=Contraseña incorrecta');
        }

        req.session.user = {
            id_usuario: user.id_usuario,
            username: user.username,
            email: user.email,
            id_tp_usuario: user.id_tp_usuario,
        };

        req.session.save((err) => {
            if (err) {
                console.error('Error al guardar sesión:', err);
                return res.redirect('/login?error=serverError');
            }

            // Redirección basada en el id_tp_usuario
            console.log('Usuario autenticado:', req.session.user);
            switch (user.id_tp_usuario) {
                case 'ADMINISTRADOR':
                    return res.redirect('/admin');
                case 'EDITOR':
                    return res.redirect('/editor/panel');
                default: // USUARIO
                    return res.redirect('/perfil2');
            }
        });
    } catch (err) {
        console.error('Error al iniciar sesión:', err);
        return res.redirect('/login?error=serverError');
    }
});

// Rutas de administrador con orden correcto de middlewares
router.get('/admin', isAuthenticated, isAdmin, (req, res) => {
    res.render('admin', {
        layout: 'admin-layout',
        title: 'Panel de Administración',
        user: req.session.user,
    });
});

// Rutas de editor con orden correcto
router.get('/editor/panel', isAuthenticated, isEditor, (req, res) => {
    res.render('editor/panel', {
        layout: 'editor-layout',
        title: 'Panel de Editor',
        user: req.session.user,
    });
});

router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error al cerrar sesión:', err);
            return res.redirect('/perfil2');
        }
        res.clearCookie('connect.sid');
        return res.redirect('/');
    });
});

// Resto de rutas (recuperación y cambio de contraseña)
// ... (igual que en tu código actual, no modificado para brevedad)

// EXPORTA EL ROUTER
module.exports = router;
