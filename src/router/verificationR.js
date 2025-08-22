const express = require('express');
const router = express.Router();

// Ruta GET para la pantalla de verificación (renderiza verificacion.hbs)
router.get('/verificacion', (req, res) => {
    const correo = req.query.correo;
    const error = req.query.error;
    res.render('verificacion', { correo, error });
    console.log('Ruta de verificación cargada');
});

// Ruta GET para verificar la cuenta (cuando el usuario hace clic en el enlace del correo)
router.get('/verificar-cuenta', async (req, res) => {
    const { correo, token } = req.query;

    if (!correo || !token) {
        return res.status(400).send('Faltan parámetros de verificación.');
    }

    try {
        const [rows] = await req.pool.query(
            'SELECT id_usuario, verificado, token, token_expira FROM usuario WHERE email = ?',
            [correo]
        );

        if (rows.length === 0) {
            return res.status(404).send('Usuario no encontrado.');
        }

        const user = rows[0];

        if (user.verificado) {
            return res.status(200).send('Tu cuenta ya ha sido verificada. Puedes iniciar sesión.');
        }

        // Verifica el token y su expiración
        if (user.token !== token || new Date() > new Date(user.token_expira)) {
            return res.status(400).send('Token inválido o expirado. Por favor, solicita un nuevo correo de verificación.');
        }

        // Marcar la cuenta como verificada
        await req.pool.query(
            'UPDATE usuario SET verificado = 1, token = NULL, token_expira = NULL WHERE id_usuario = ?',
            [user.id_usuario]
            
        );

        res.redirect('/login?verificado=true'); // Redirige al login con un mensaje de éxito

    } catch (err) {
        console.error('Error al verificar cuenta:', err);
        res.status(500).send('Error del servidor al verificar la cuenta.');
    }
});

// Ruta POST para reenviar el correo de verificación (llamada desde JS del cliente en verificacion.hbs)
router.post('/reenviar-verificacion', async (req, res) => {
    const { correo } = req.body;

    if (!correo) {
        return res.status(400).json({ ok: false, mensaje: 'Correo no proporcionado.' });
    }

    try {
        const [rows] = await req.pool.query('SELECT id_usuario, verificado FROM usuario WHERE email = ?', [correo]);

        if (rows.length === 0) {
            return res.status(404).json({ ok: false, mensaje: 'Usuario no encontrado.' });
        }

        const user = rows[0];

        if (user.verificado) {
            return res.status(200).json({ ok: true, mensaje: 'Tu cuenta ya está verificada.' });
        }

        const newToken = crypto.randomBytes(16).toString('hex');
        const newExpiration = new Date(Date.now() + 1000 * 60 * 10); // 10 minutos para el nuevo token

        await req.pool.query(
            'UPDATE usuario SET token = ?, token_expira = ? WHERE id_usuario = ?',
            [newToken, newExpiration, user.id_usuario]
        );

        const mailResult = await enviarCorreoVerificacion(correo, newToken);

        if (mailResult.ok) {
            res.status(200).json({ ok: true, mensaje: 'Correo de verificación reenviado exitosamente.' });
        } else {
            res.status(500).json({ ok: false, mensaje: 'Error al reenviar el correo.' });
        }

    } catch (err) {
        console.error('Error al reenviar verificación:', err);
        res.status(500).json({ ok: false, mensaje: 'Error del servidor.' });
    }
});

module.exports = router;    