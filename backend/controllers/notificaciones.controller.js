// backend/controllers/notificaciones.controller.js

const express = require('express');
const router = express.Router();
const { obtenerNotificacionesSinLeer } = require('../queries/notificaciones.queries');
const { isAuthenticated } = require('../middlewares/usuario.middleware'); // <- revisa ruta correcta

// ========================
// GET notificaciones sin leer
// ========================
router.get('/', isAuthenticated, async (req, res) => {
    try {
        const id_usuario = req.session.user.id_usuario;

        // Obtener notificaciones que aún no han sido leídas para el usuario
        const notificaciones = await obtenerNotificacionesSinLeer(id_usuario);

        // Devolverlas en formato JSON
        res.json(notificaciones);
    } catch (err) {
        console.error('Error al obtener notificaciones:', err);

        // En caso de error, devolver arreglo vacío
        res.status(500).json([]);
    }
});

// ========================
// Exportar router
// ========================
module.exports = router;
