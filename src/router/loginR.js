const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { enviarCorreoRecuperacion } = require('../public/utils/mail.js');

router.get('/perfil', (req, res) => {
    res.render('perfil');
});

router.get('/login', (req, res) => {
    const error = req.query.error;
    const verificado = req.query.verificado;
    res.render('login', { error, verificado, layout: 'auth-layout', title: 'Iniciar Sesión' });
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const [rows] = await req.pool.query('SELECT * FROM usuario WHERE email = ?', [email]);

        if (rows.length === 0) {
            return res.redirect('/login?error=userNotFound');
        }

        const user = rows[0];

        if (user.verificado == 0) {
            return res.redirect(`/verificacion?correo=${encodeURIComponent(email)}&error=unverifiedAccount`);
        }

        const match = await req.bcrypt.compare(password, user.password);
        if (!match) {
            return res.render('error-contraseña');
        }

        req.session.user = {
            id: user.id,
            username: user.username,
            email: user.email,
        };
        res.redirect('/perfil');
    } catch (err) {
        console.error('Error al iniciar sesión:', err);
        res.redirect('/login?error=serverError');
    }
});

router.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error("Error al cerrar sesión:", err);
            return res.redirect('/perfil');
        }
        res.clearCookie('connect.sid');
        res.redirect('/login');
    });
});

router.post('/solicitar-recuperacion', async (req, res) => {
    const { correo } = req.body;
    const pool = req.pool; // Obtenemos el pool del request

    try {
        console.log("correo recibido en solicitud:", correo);
        const [users] = await pool.query('SELECT * FROM usuario WHERE email = ?', [correo]);

        if (users.length === 0) {
            // Por seguridad, no revelamos si el correo existe o no.
            return res.render('buscar-correo', {
                layout: 'main',
                mensaje: 'Si tu correo está registrado con nosotros, recibirás un enlace para restablecer tu contraseña.'
            });
            
        }

        const token = crypto.randomBytes(20).toString('hex');
        const expiracion = new Date(Date.now() + 3600000); // Expira en 1 hora

        await pool.query(
            'UPDATE usuario SET token_reseteo = ?, token_reseteo_expira = ? WHERE email = ?',
            [token, expiracion, correo]
        );
        
        console.log("Intentando enviar correo de recuperación a:", correo);
        // Usamos la nueva función del mailer que pasamos en req
        await enviarCorreoRecuperacion(correo, token);
        
        res.render('buscar-correo', {
            layout: 'main',
            mensaje: 'Si tu correo está registrado, recibirás un enlace para restablecer tu contraseña. Revisa tu bandeja de entrada o spam.'
        });

    } catch (error) {
        console.error("Error en solicitar-recuperacion:", error);
        res.render('buscar-correo', {
            layout: 'auth-layout',
            error: 'Ocurrió un error. Por favor, inténtalo de nuevo.'
        });
    }
});


router.post('/cambiar-contrasena', async (req, res) => {
    const { token, password, confirmPassword } = req.body;
    const pool = req.pool;
    const bcrypt = req.bcrypt;

    if (password !== confirmPassword) {
        return res.render('cambiar-contrasena', {
            layout: 'auth-layout',
            token: token,
            error: 'Las contraseñas no coinciden.'
        });
    }

    try {
        const [users] = await pool.query(
            'SELECT * FROM usuario WHERE token_reseteo = ? AND token_reseteo_expira > NOW()',
            [token]
        );
        
        if (users.length === 0) {
            return res.render('error', {
                layout: 'auth-layout',
                mensajeError: 'El enlace para restablecer la contraseña es inválido o ha expirado.'
            });
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        const [resultado] = await pool.query(
        'UPDATE usuario SET password = ?, token_reseteo = NULL, token_reseteo_expira = NULL WHERE id = ? AND token_reseteo = ?',
        [hashedPassword, users[0].id, token]
        );
        const [check] = await pool.query('SELECT password FROM usuario WHERE id = ?', [users[0].id]);
        console.log('Hash guardado en BD:', check[0].password);

        // Redirigir al login con un mensaje de éxito
        res.redirect('/login?passwordRestablecido=true');

    } catch (error) {
        console.error("Error al restablecer la contraseña:", error);
        res.render('cambiar-contrasena', {
            layout: 'auth-layout',
            token: token,
            error: 'Ocurrió un error al actualizar tu contraseña. Inténtalo de nuevo.'
        });
    }
});

router.get('/cambiar-contrasena', async (req, res) => {
    const token = req.query.token;

    if (!token) {
        return res.render('error', {
            layout: 'auth-layout',
            mensajeError: 'Token no proporcionado o inválido.'
        });
    }

    // Puedes verificar aquí si el token es válido y no ha expirado
    try {
        const [rows] = await req.pool.query(
            'SELECT id FROM usuario WHERE token_reseteo = ? AND token_reseteo_expira > NOW()',
            [token]
        );

        if (rows.length === 0) {
            return res.render('error', {
                layout: 'auth-layout',
                mensajeError: 'El enlace para restablecer la contraseña es inválido o ha expirado.'
            });
        }

        // Si el token es válido, renderiza el formulario
        res.render('cambiar-contrasena', {
            layout: 'auth-layout',
            token // se pasa el token para que el form lo use
        });

    } catch (error) {
        console.error('Error al validar el token de cambio de contraseña:', error);
        res.render('error', {
            layout: 'auth-layout',
            mensajeError: 'Hubo un error al verificar el token.'
        });
    }
});

module.exports = router;