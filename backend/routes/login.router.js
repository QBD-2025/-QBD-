const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { enviarCorreoRecuperacion } = require('../utils/mail.js');

// ----------------- Sesiones activas -----------------
global.sesionesActivas = new Set();

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
router.get('/menu_principal', isAuthenticated, async (req, res) => {
    try {
        // ✨ VERIFICAR SI ES PRIMER INGRESO
        const [userData] = await req.pool.query(
            'SELECT primer_ingreso, puntos FROM usuario WHERE id_usuario = ?',
            [req.session.user.id_usuario]
        );

        const esPrimerIngreso = userData[0]?.primer_ingreso === 1;
        const puntosActuales = userData[0]?.puntos || 0;

        // Si es primer ingreso, marcar como visto
        if (esPrimerIngreso) {
            await req.pool.query(
                'UPDATE usuario SET primer_ingreso = 0 WHERE id_usuario = ?',
                [req.session.user.id_usuario]
            );
        }

        res.render('menu_principal', {
            layout: 'main',
            title: 'Perfil',
            user: req.session.user,
            mostrarBienvenida: esPrimerIngreso, // ✨ Pasar flag a la vista
            puntosActuales: puntosActuales
        });

    } catch (error) {
        console.error('Error al cargar menú principal:', error);
        res.render('menu_principal', {
            layout: 'main',
            title: 'Perfil',
            user: req.session.user,
            mostrarBienvenida: false,
            puntosActuales: 0
        });
    }
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

router.get('/sin-carrera', async (req, res) =>{
    try {
        const [carreras] = await req.pool.query(
            `SELECT id_carrera, descripcion
            FROM carrera`
            );
    res.render('eleccion-carrera', {carreras, layout:false});
    } catch (error) {
        console.error(error)
        res.status(500).send('Error al cargar carreras')
    }
})

// Procesar login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const [rows] = await req.pool.query(
            `SELECT id_usuario, username, email, password, verificado, 
            id_tp_usuario, id_status, suspension_fin, foto_perfil, apodo, descripcion, primer_ingreso
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
            return res.redirect(`/verificacion?correo=${encodeURIComponent(email)}&error=Cuenta no verificada`);
        }

        // Validar contraseña
        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.redirect('/login?error=Contraseña incorrecta');

        // ⭐ OBTENER LA CARRERA DEL USUARIO
        const [carreraResult] = await req.pool.query(
            `SELECT c.id_carrera 
            FROM carrera c
            INNER JOIN usuario_carrera uc ON c.id_carrera = uc.id_carrera
            WHERE uc.id_usuario = ?
            LIMIT 1`,
            [user.id_usuario]
        );

        if (!carreraResult || carreraResult.length === 0){
            // ✅ CORREGIDO: usar foto_perfil en lugar de avatarUrl
            req.session.user = {
                id_usuario: user.id_usuario,
                username: user.username,
                email: user.email,
                apodo: user.apodo || user.username,
                descripcion: user.descripcion || '',
                foto_perfil: user.foto_perfil || '/uploads/default_avatar.png',
                id_tp_usuario: user.id_tp_usuario,
                id_carrera: null,
                primer_ingreso: user.primer_ingreso || 0 // ✨ Agregar flag
            };

            const [carreras] = await req.pool.query(
                `SELECT id_carrera, descripcion
                FROM carrera`
            );

            return res.redirect('/sin-carrera');
        }

        // ✅ CORREGIDO: Crear sesión completa con todos los campos
        req.session.user = {
            id_usuario: user.id_usuario,
            username: user.username,
            email: user.email,
            apodo: user.apodo || user.username,
            descripcion: user.descripcion || '',
            foto_perfil: user.foto_perfil || '/uploads/default_avatar.png',
            id_tp_usuario: user.id_tp_usuario,
            id_carrera: carreraResult.length > 0 ? carreraResult[0].id_carrera : null,
            primer_ingreso: user.primer_ingreso || 0 // ✨ Agregar flag
        };

        console.log('✅ Usuario logueado:', {
            id: req.session.user.id_usuario,
            username: req.session.user.username,
            foto_perfil: req.session.user.foto_perfil,
            carrera: req.session.user.id_carrera,
            primer_ingreso: req.session.user.primer_ingreso
        });

        // Marcar usuario activo
        if (user.id_status !== 1) {
            await req.pool.query('UPDATE usuario SET id_status = 1 WHERE id_usuario = ?', [user.id_usuario]);
        }

        // Agregar a sesiones activas
        global.sesionesActivas.add(user.id_usuario);

        req.session.save(async (err) => {
            if (err) {
                console.error('Error guardando sesión:', err);
                return res.redirect('/login?error=serverError');
            }

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

// ✨ RUTA MEJORADA: Asignar carrera + otorgar puntos
router.post('/asignar-carrera', isAuthenticated, async (req, res) => {
    const userId = req.session.user?.id_usuario;
    const { id_carrera } = req.body;
    console.log('userId:', userId, 'id_carrera:', id_carrera);

    if (!userId || !id_carrera) {
        return res.status(400).send('Usuario o carrera no definidos');
    }

    try {
        // Insertar carrera
        await req.pool.query(
            'INSERT INTO usuario_carrera (id_usuario, id_carrera) VALUES (?, ?)',
            [userId, id_carrera]
        );  
        
        // ✨ OTORGAR PUNTOS INICIALES (50 generales + 50 de carrera)
        console.log('🎁 Otorgando puntos de bienvenida...');
        await req.pool.query(
            'CALL sp_inicializar_puntos_nuevo_usuario(?, ?)',
            [userId, id_carrera]
        );
        
        // ✅ Actualizar sesión con carrera
        req.session.user.id_carrera = id_carrera;

        console.log('✅ Carrera asignada y puntos otorgados');

        switch (req.session.user.id_tp_usuario) {
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
    res.render('editor/panel', {
        layout: 'editor-layout',
        title: 'Panel de Editor',
        user: req.session.user,
    });
});

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
            // Redirige siempre a la página pública
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