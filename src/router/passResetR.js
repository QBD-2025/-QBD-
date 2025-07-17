const express = require('express');
const router = express.Router();

router.get('/buscar-correo', (req, res) => {
    const error = req.query.error;
    res.render('buscar-correo', { error, layout: 'main', title: 'Buscar Correo' });
});
router.get('/cambiar-contrasena', (req, res) => {
    const error = req.query.error;
    res.render('cambiar-contrasena', { error, layout: 'main', title: 'cambiar_contrasena' });
});


router.post('/solicitar-recuperacion', async (req, res) => {
    const { correo } = req.body;
    
    try {
        // ... (lógica de recuperación)
        res.render('buscar-correo', {
            layout: 'main',
            mensaje: 'Si tu correo está registrado, recibirás un enlace...'
        });
    } catch (error) {
        console.error("Error en solicitar-recuperacion:", error);
        res.render('buscar-correo', {
            layout: 'auth-layout',
            error: 'Ocurrió un error. Por favor, inténtalo de nuevo.'
        });
    }
});

router.get('/restablecer-contrasena', async (req, res) => {
    const { token } = req.query;

    if (!token) {
        return res.redirect('/login');
    }

    try {
        const [users] = await pool.query(
            'SELECT * FROM usuario WHERE token_reseteo = ? AND token_reseteo_expira > NOW()',
            [token]
        );

        if (users.length === 0) {
            // El token es inválido o ha expirado
            return res.render('error', { // Crea una vista de error simple si no la tienes
                layout: 'auth-layout',
                mensajeError: 'El enlace para restablecer la contraseña es inválido o ha expirado. Por favor, solicita uno nuevo.'
            });
        }
        
        // El token es válido, renderizamos el formulario para cambiar la contraseña
        res.render('cambiar-contrasena', {
            layout: 'main',
            token: token // Pasamos el token a la vista para incluirlo en el form
        });

    } catch (error) {
        console.error("Error al verificar el token de reseteo:", error);
        res.status(500).send("Error del servidor");
    }
});

router.post('/restablecer-contrasena', async (req, res) => {
    const { token, password, confirmPassword } = req.body;
    const pool = req.pool;
    const bcrypt = req.bcrypt;

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
        'UPDATE usuario SET password = ?, token_reseteo = NULL, token_reseteo_expira = NULL WHERE id_usuario = ? AND token_reseteo = ?',
        [hashedPassword, users[0].id, token]
        );
        const [check] = await pool.query('SELECT password FROM usuario WHERE id_usuario = ?', [users[0].id]);
        console.log('Hash guardado en BD:', check[0].password);

        // Redirigir al login con un mensaje de éxito
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