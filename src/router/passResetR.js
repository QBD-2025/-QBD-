const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt'); // Agrega esta línea para importar bcrypt directamente

router.get('/buscar-correo', (req, res) => {
    const error = req.query.error;
    res.render('buscar-correo', { error, layout: 'main', title: 'Buscar Correo' });
});

router.get('/cambiar-contrasena', (req, res) => {
    const error = req.query.error;
    res.render('cambiar-contrasena', { error, layout: 'main', title: 'Cambiar Contraseña' });
});

router.post('/solicitar-recuperacion', async (req, res) => {
    const { correo } = req.body;
    const pool = req.pool; // Obtener pool de la solicitud
    
    try {
        const [users] = await pool.query('SELECT * FROM usuario WHERE email = ?', [correo]);

        if (users.length === 0) {
            return res.render('buscar-correo', {
                layout: 'main',
                mensaje: 'Si tu correo está registrado con nosotros, recibirás un enlace para restablecer tu contraseña.'
            });
        }

        const crypto = require('crypto');
        const token = crypto.randomBytes(20).toString('hex');
        const expiracion = new Date(Date.now() + 3600000); // 1 hora

        await pool.query(
            'UPDATE usuario SET token_reseteo = ?, token_reseteo_expira = ? WHERE email = ?',
            [token, expiracion, correo]
        );
        
        const { enviarCorreoRecuperacion } = require('../public/utils/mail.js');
        await enviarCorreoRecuperacion(correo, token);
        
        res.render('buscar-correo', {
            layout: 'main',
            mensaje: 'Si tu correo está registrado, recibirás un enlace para restablecer tu contraseña. Revisa tu bandeja de entrada o spam.'
        });

    } catch (error) {
        console.error("Error en solicitar-recuperacion:", error);
        res.render('buscar-correo', {
            layout: 'main',
            error: 'Ocurrió un error. Por favor, inténtalo de nuevo.'
        });
    }
});

router.get('/restablecer-contrasena', async (req, res) => {
    const { token } = req.query;
    const pool = req.pool; // Obtener pool de la solicitud

    if (!token) {
        return res.redirect('/login');
    }

    try {
        const [users] = await pool.query(
            'SELECT * FROM usuario WHERE token_reseteo = ? AND token_reseteo_expira > NOW()',
            [token]
        );

        if (users.length === 0) {
            return res.render('error', {
                layout: 'main',
                mensajeError: 'El enlace para restablecer la contraseña es inválido o ha expirado. Por favor, solicita uno nuevo.'
            });
        }
        
        res.render('cambiar-contrasena', {
            layout: 'main',
            token: token
        });

    } catch (error) {
        console.error("Error al verificar el token de reseteo:", error);
        res.status(500).render('error', {
            layout: 'main',
            mensajeError: 'Error del servidor'
        });
    }
});

router.post('/restablecer-contrasena', async (req, res) => {
    const { token, password, confirmPassword } = req.body;
    const pool = req.pool; // Obtener pool de la solicitud

    // Verificar que las contraseñas coincidan
    if (password !== confirmPassword) {
        return res.render('cambiar-contrasena', {
            layout: 'main',
            token: token,
            error: 'Las contraseñas no coinciden'
        });
    }

    try {
        const [users] = await pool.query(
            'SELECT * FROM usuario WHERE token_reseteo = ? AND token_reseteo_expira > NOW()',
            [token]
        );
        
        if (users.length === 0) {
            return res.render('error', {
                layout: 'main',
                mensajeError: 'El enlace para restablecer la contraseña es inválido o ha expirado.'
            });
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        await pool.query(
            'UPDATE usuario SET password = ?, token_reseteo = NULL, token_reseteo_expira = NULL WHERE id_usuario = ?',
            [hashedPassword, users[0].id_usuario] // Usar id_usuario en lugar de id
        );

        res.redirect('/login?passwordRestablecido=true');

    } catch (error) {
        console.error("Error al restablecer la contraseña:", error);
        res.render('cambiar-contrasena', {
            layout: 'main',
            token: token,
            error: 'Ocurrió un error al actualizar tu contraseña. Inténtalo de nuevo.'
        });
    }
});   

module.exports = router;