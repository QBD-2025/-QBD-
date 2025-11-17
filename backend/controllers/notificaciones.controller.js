// backend/controllers/notificaciones.controller.js
const express = require('express');
const router = express.Router();
const { obtenerNotificacionesSinLeer } = require('../queries/notificaciones.queries');
const { isAuthenticated } = require('../middlewares/usuario.middleware');

// ========================
// GET notificaciones sin leer
// ========================
router.get('/', isAuthenticated, async (req, res) => {
    try {
        const id_usuario = req.session.user.id_usuario;
        const notificaciones = await obtenerNotificacionesSinLeer(id_usuario);
        res.json(notificaciones);
    } catch (err) {
        console.error('Error al obtener notificaciones:', err);
        res.status(500).json([]);
    }
});

module.exports = router;