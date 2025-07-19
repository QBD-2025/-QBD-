const express = require('express');
const router = express.Router();

// Middleware mejorado
const isAuthenticated = (req, res, next) => {
    if (req.session.user) return next();
    res.redirect('/login');
};

// Ruta perfil de usuario
router.get('/usuario', isAuthenticated, async (req, res) => {
    try {
        const [userData] = await req.pool.query(
            `SELECT id_usuario, username, email, id_tp_usuario 
            FROM usuario WHERE id_usuario = ?`, 
            [req.session.user.id_usuario]
        );

        if (userData.length === 0) {
            return res.status(404).render('error', {
                layout: 'main',
                mensajeError: 'Usuario no encontrado en DB'
            });
        }

        // Mapear roles a texto
        const roles = {
            1: 'USUARIO',
            2: 'EDITOR',
            3: 'ADMIN'
        };

        res.render('usuario', {
            layout: 'main', // Nombre de tu archivo layout (usuario-layout.hbs)
        user: req.user,
        title: 'Perfil de Usuario',
            user: {
                ...userData[0],
                role: roles[userData[0].id_tp_usuario] || 'USUARIO'
            }
        });

    } catch (error) {
        console.error('Error en la consulta:', error);
        res.status(500).send('Error al cargar el perfil');
    }
});

module.exports = router;