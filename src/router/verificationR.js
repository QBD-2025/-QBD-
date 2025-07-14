const express = require('express');
const router = express.Router();

router.get('/verificacion', (req, res) => {
    const correo = req.query.correo;
    const error = req.query.error;
    res.render('verificacion', { correo, error });
});

router.get('/verificar-cuenta', async (req, res) => {
    const { correo, token } = req.query;

    if (!correo || !token) {
        return res.status(400).send('Faltan parámetros de verificación.');
    }

    try {
        const [rows] = await req.pool.query(
            'SELECT id, verificado, token, token_expira FROM usuario WHERE email = ?',
            [correo]
        );

        // ... (resto de la lógica de verificación)
        
        res.redirect('/login?verificado=true');
    } catch (err) {
        console.error('Error al verificar cuenta:', err);
        res.status(500).send('Error del servidor al verificar la cuenta.');
    }
});

router.post('/reenviar-verificacion', async (req, res) => {
    const { correo } = req.body;

    if (!correo) {
        return res.status(400).json({ ok: false, mensaje: 'Correo no proporcionado.' });
    }

    // ... (resto de la lógica de reenvío)
});

module.exports = router;