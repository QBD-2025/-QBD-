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
router.get('/menu_principal', (req, res) => {
    console.log('Usuario en sesión:', req.session.user); // Aquí imprime
    res.render('menu_principal', {
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

            req.session.save(async (err) => {
    if (err) {
        console.error('Error al guardar sesión:', err);
        return res.redirect('/login?error=serverError');
    }

    // 🔹 Marcar usuario como ACTIVO
    await req.pool.query(
        'UPDATE usuario SET id_status = ? WHERE id_usuario = ?',
        [1, user.id_usuario]
    );

    console.log('Usuario autenticado:', req.session.user);

    try {
        switch (user.id_tp_usuario) {
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
    });
    } catch (error) {
        console.error('Error al iniciar sesión:', error);
        return res.redirect('/login?error=serverError');
    }});

   

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

// loginR.js - Ruta /logout corregida

// ... (El resto de tu código de loginR.js queda igual) ...

router.get('/logout', async (req, res) => { // 1. Hacemos la función asíncrona
    try {
        // 2. Verificamos si hay un usuario en la sesión
        if (req.session.user) {
            const userId = req.session.user.id_usuario;
            console.log(`Cerrando sesión para el usuario ID: ${userId}. Actualizando estatus a Inactivo (2).`);

            // 3. Actualizamos el estatus en la BD ANTES de destruir la sesión
            await req.pool.query(
                'UPDATE usuario SET id_status = ? WHERE id_usuario = ?',
                [2, userId] // Usamos el ID del usuario de la sesión
            );
        }

        // 4. Ahora sí, destruimos la sesión
        req.session.destroy((err) => {
            if (err) {
                console.error('Error al destruir la sesión:', err);
                // Aún si hay un error, intentamos redirigir al usuario
                return res.redirect('/');
            }

            // 5. Limpiamos la cookie de la sesión y redirigimos al inicio
            res.clearCookie('connect.sid');
            return res.redirect('/');
        });

    } catch (dbError) {
        console.error('Error de base de datos al intentar cerrar sesión:', dbError);
        // En caso de un error de BD, de todos modos intentamos destruir la sesión
        // para no dejar al usuario en un estado inconsistente.
        req.session.destroy((err) => {
            res.clearCookie('connect.sid');
            return res.redirect('/');
        });
    }
});

// ... (El resto de tus rutas y el module.exports quedan igual) ...

// EXPORTA EL ROUTER
module.exports = router;