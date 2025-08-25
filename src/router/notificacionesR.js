// routes/notificacionesR.js
const express = require('express'); 
const router = express.Router();
const pool = require('../db/conexion'); // <--- AÑADIR ESTA LÍNEA

router.get('/notificaciones', async (req, res) => {
    if (!req.session.user) return res.json([]);
    try {
        const [rows] = await pool.query( // <--- CAMBIAR req.pool por pool
            "SELECT * FROM notificaciones WHERE id_usuario_destinatario = ? AND leido = 0 ORDER BY fecha_creacion DESC",
            [req.session.user.id_usuario]
        );
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json([]);
    }
});

module.exports = router;