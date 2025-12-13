 const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { enviarCorreoVerificacion } = require('../utils/mail.js');
const crypto = require("crypto");
const { isAuthenticated, isAdmin, isEditor, isRevisor } = require('../middlewares/admin.middleware.js');


// ----------------- Sesiones activas -----------------
global.sesionesActivas = new Set();

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
        mensaje: req.query.mensaje || null,
        verificado: req.query.verificado,
        layout: 'auth-layout',
        title: 'Iniciar Sesión',
    });
});

router.get('/sin-carrera', async (req, res) =>{
    try {
        const [carreras] = await req.pool.query(
            `SELECT id_carrera, descripcion
            FROM carrera`
        );

        res.render('eleccion-carrera', { carreras, layout:false });

    } catch (error) {
        console.error(error);
        res.status(500).send('Error al cargar carreras');
    }
});

router.post('/login', async (req, res) => {

    const { email, password } = req.body;

    try {
        const [rows] = await req.pool.query(
            `SELECT id_usuario, username, email, password, verificado, 
            id_tp_usuario, id_status, suspension_fin, foto_perfil, apodo, descripcion
            from usuario WHERE email = ?`,
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
                await req.pool.query(
                    'UPDATE usuario SET id_status = 1, suspension_fin = NULL WHERE id_usuario = ?',
                    [user.id_usuario]
                );
                user.id_status = 1;
            }
        }

        // Usuario no verificado
        if (user.verificado === 0) {

            const token = crypto.randomBytes(16).toString('hex');
            const tokenExpires = new Date(Date.now() + 1000 * 60 * 10);

            await req.pool.query(
                'UPDATE usuario SET token = ?, token_expira = ? WHERE id_usuario = ?',
                [token, tokenExpires, user.id_usuario]
            );

            const mailResult = await enviarCorreoVerificacion(user.email, token);

            if (mailResult.ok) {
                return res.redirect(`/verificacion?correo=${encodeURIComponent(email)}&resent=true`);
            }

            return res.redirect('/login?error=No se pudo reenviar el codigo');
        }

        // Verificar contraseña
        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.redirect('/login?error=Contraseña incorrecta');

        // Obtener carrera
        const [carreraResult] = await req.pool.query(
            `SELECT c.id_carrera 
            FROM carrera c
            INNER JOIN usuario_carrera uc ON c.id_carrera = uc.id_carrera
            WHERE uc.id_usuario = ?
            LIMIT 1`,
            [user.id_usuario]
        );

        // Crear sesión sin carrera
        if (!carreraResult || carreraResult.length === 0){
            req.session.user = {
                id_usuario: user.id_usuario,
                username: user.username,
                email: user.email,
                apodo: user.apodo || user.username,
                descripcion: user.descripcion || '',
                foto_perfil: user.foto_perfil || '/uploads/default_avatar.png',
                id_tp_usuario: user.id_tp_usuario,
                id_carrera: null
            };

            return res.redirect('/sin-carrera');
        }

        // Crear sesión normal
        req.session.user = {
            id_usuario: user.id_usuario,
            username: user.username,
            email: user.email,
            apodo: user.apodo || user.username,
            descripcion: user.descripcion || '',
            foto_perfil: user.foto_perfil || '/uploads/default_avatar.png', 
            id_tp_usuario: user.id_tp_usuario,
            id_carrera: carreraResult.length > 0 ? carreraResult[0].id_carrera : null
        };

        global.sesionesActivas.add(user.id_usuario);

        req.session.save(async (err) => {
            if (err) {
                console.error('Error guardando sesión:', err);
                return res.redirect('/login?error=serverError');
            }

            // CORREGIDO: redirecciones según rol
            switch (user.id_tp_usuario) {

                case 4:
                    return res.redirect('/revisor');

                case 3:
                    return res.redirect('/editor');

                case 2:
                    return res.redirect('/admin');

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

router.post('/asignar-carrera', isAuthenticated, async (req,res) =>{
    const userId = req.session.user?.id_usuario;
    const {id_carrera} = req.body;

    if (!userId || !id_carrera) {
        return res.status(400).send('Usuario o carrera no definidos');
    }

    try{
        await req.pool.query(
            'INSERT INTO usuario_carrera (id_usuario, id_carrera) VALUES (?, ?)',
            [userId, id_carrera]
        );  
        req.session.user.id_carrera=id_carrera;

        switch (req.session.user.id_tp_usuario) {

            case 4: 
                return res.redirect('/revisor');

            case 3: 
                return res.redirect('/editor');

            case 2:
                return res.redirect('/admin');

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
        console.error('Error al guardar carrera:', error);
        res.status(500).send('Error al asignar carrera');
    }
});

// Presentación
router.get('/presentacion', (req, res) => {
    res.render('presentacion', {
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
    res.render('editor', {
        layout: 'editor-layout',
        title: 'Panel de Editor',
        user: req.session.user,
    });
});

// Panel revisor
router.get("/revisor/panel", isAuthenticated, isRevisor, (req, res) => {
    res.render("revisor", {
        user: req.session.user
    });
});

// Logout
router.get('/logout', async (req, res) => {
    try {
        if (req.session.user) {
            const userId = req.session.user.id_usuario;
            await req.pool.query('UPDATE usuario SET id_status = 2 WHERE id_usuario = ?', [userId]);
            global.sesionesActivas.delete(userId);
        }

        req.session.destroy(err => {
            if (err) console.error('Error al destruir sesión:', err);
            res.clearCookie('connect.sid');
            return res.redirect('/');
        });

    } catch (error) {
        console.error('Error logout:', error);
        req.session.destroy(() => {
            res.clearCookie('connect.sid');
            return res.redirect('/');
        });
    }
});

module.exports = router;
