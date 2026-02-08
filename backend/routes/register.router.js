// routes/registerR.js
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { enviarCorreoVerificacion } = require('../utils/mail.js');

router.get('/register', (req, res) => {
    const error = req.query.error;
    res.render('register', { error, layout: 'auth-layout', title: 'Registro de Usuario' });
});

router.post('/register', async (req, res) => {
    const { username, email, password, confirm_password } = req.body;
    let errorMessage = '';
    const emailRegex = /^[^\s@]+@[^\s@]+\.(com|mx)$/i;

    // Validaciones básicas
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
        // Verificar si el email ya existe
        const [existingUsers] = await req.pool.query(
            'SELECT id_usuario from usuario WHERE email = ?',
            [email]
        );
        if (existingUsers.length > 0) {
            const [existingVerified] = await req.pool.query(
                'SELECT verificado from usuario WHERE email = ?',
                [email]
            );
            if (existingVerified[0].verificado == 1) {
                return res.redirect('/register?error=emailExists');
            } else {
                return res.redirect('/register?error=emailUnverified');
            }
        }

        // Hashear la contraseña y generar token
        const hashedPassword = await bcrypt.hash(password, 10);
        const token = crypto.randomBytes(16).toString('hex');
        const tokenExpires = new Date(Date.now() + 1000 * 60 * 10); // 10 min
        const points = 100;

        // Insertar usuario
        const [result] = await req.pool.query(
            'INSERT INTO usuario (username, email, password, verificado, token, token_expira, puntos, id_tp_usuario, id_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [username, email, hashedPassword, 0, token, tokenExpires, points, 1, 1]
        );

        const id_usuario = result.insertId; // ID real del usuario

        console.log('=== DEBUG REGISTRO ===');
        console.log('Usuario registrado con ID:', id_usuario);
        console.log('Carrera en sesión:', req.session.carreraSeleccionada);

        // --- INSERTAR en usuario_carrera si hay carrera seleccionada ---
        const carreraSeleccionada = req.session.carreraSeleccionada;
        if (carreraSeleccionada) {
            console.log('Insertando carrera en usuario_carrera...');
            
            await req.pool.query(
                'INSERT INTO usuario_carrera (id_usuario, id_carrera) VALUES (?, ?)',
                [id_usuario, carreraSeleccionada]
            );
            
            console.log('Carrera insertada correctamente');
            
            // Limpiar sesión
            delete req.session.carreraSeleccionada;
            delete req.session.tempUserId;
            delete req.session.encuestaTemporal;
        } else {
            console.log('WARNING: No hay carrera seleccionada en sesión');
        }

        // Enviar correo de verificación
        const mailResult = await enviarCorreoVerificacion(email, token);
        if (mailResult.ok) {
            res.redirect(`/verificacion?correo=${encodeURIComponent(email)}`);
            console.log(`Correo de verificación enviado a ${email}`);
        } else {
            // Si falla el envío, eliminar usuario recién creado
            await req.pool.query('DELETE from usuario WHERE email = ?', [email]);
            return res.redirect('/register?error=emailSendFailed');
        }
    } catch (err) {
        console.error('Error al registrar usuario:', err);
        res.redirect('/register?error=serverError');
    }
});

module.exports = router;
