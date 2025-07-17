const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { enviarCorreoVerificacion } = require('../public/utils/mail.js');

router.get('/register', (req, res) => {
    const error = req.query.error;
    res.render('register', { error, layout: 'auth-layout', title: 'Registro de Usuario' });
});

router.post('/register', async (req, res) => {
    const { username, email, password, confirm_password } = req.body;

    let errorMessage = '';
    const emailRegex = /^[^\s@]+@[^\s@]+\.(com|mx)$/i;

    // Validaciones...
    if (!emailRegex.test(email)) {
        errorMessage = 'invalidEmail';
    } // ... (resto de validaciones)

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

        const hashedPassword = await req.bcrypt.hash(password, 10);
        const token = crypto.randomBytes(16).toString('hex');
        const tokenExpires = new Date(Date.now() + 1000 * 60 * 10);
        const points=0
        const tp_user = 1; // Cambiado a 0 para indicar que el usuario no está verificado
        const status=1
        

        await req.pool.query(
            'INSERT INTO usuario (username, email, password, verificado, token, token_expira,puntos,id_tp_usuario,id_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [username, email, hashedPassword, 0, token, tokenExpires,points, tp_user, status]
        );

        const mailResult = await enviarCorreoVerificacion(email, token);

        if (mailResult.ok) {
            res.redirect(`/verificacion?correo=${encodeURIComponent(email)}`);
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