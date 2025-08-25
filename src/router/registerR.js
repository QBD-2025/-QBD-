const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const bcrypt = require('bcrypt'); // ← CORRECTO
const { enviarCorreoVerificacion } = require('../public/utils/mail.js');

router.get('/register', (req, res) => {
    const error = req.query.error;
    res.render('register', { error, layout: 'auth-layout', title: 'Registro de Usuario' });
});

router.post('/register', async (req, res) => {
    const { username, email, password, confirm_password } = req.body;

    let errorMessage = '';
    const emailRegex = /^[^\s@]+@[^\s@]+\.(com|mx)$/i;

    if (!emailRegex.test(email)) {
        errorMessage = 'invalidEmail';
    }

    if (password !== confirm_password) {
        errorMessage = 'passwordMismatch';
    }

    if (errorMessage) {
        return res.redirect(`/register?error=${errorMessage}`);
    }

    try {
        const [existingUsers] = await req.pool.query('SELECT id_usuario FROM usuario WHERE email = ?', [email]);
        if (existingUsers.length > 0) {
            const [existingVerified] = await req.pool.query('SELECT verificado FROM usuario WHERE email = ?', [email]);
            if (existingVerified[0].verificado == 1) {
                return res.redirect('/register?error=emailExists');
            } else {
                return res.redirect('/register?error=emailUnverified');
            }
        }

        const hashedPassword = await bcrypt.hash(password, 10); // ← CORRECTO
        const token = crypto.randomBytes(16).toString('hex');
        const tokenExpires = new Date(Date.now() + 1000 * 60 * 10);
        const points = 0;
        const result =
        await req.pool.query(
            'INSERT INTO usuario (username, email, password, verificado, token, token_expira, puntos, id_tp_usuario, id_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [username, email, hashedPassword, 0, token, tokenExpires, points, 1, 1]
        );
        
        const mailResult = await enviarCorreoVerificacion(email, token);

        if (mailResult.ok) {
            res.redirect(`/verificacion?correo=${encodeURIComponent(email)}`);
            console.log(`Correo de verificación enviado a ${email}`);
        } else {
            await req.pool.query('DELETE FROM usuario WHERE email = ?', [email]);
            return res.redirect('/register?error=emailSendFailed');
        }
    } catch (err) {
        console.error('Error al registrar usuario:', err);
        res.redirect('/register?error=serverError');
    }
});

module.exports = router;
