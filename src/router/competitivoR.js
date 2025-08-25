// routes/competitivoR.js
const express = require('express'); 
const router = express.Router();

// Cambia esta línea:
// const pool = require('../database'); // <-- RUTA ANTERIOR INCORRECTA
const pool = require('../db/conexion'); // <-- ¡ESTA ES LA RUTA CORRECTA!

// El resto de tu código ya está bien y no necesita cambios
router.get('/competitivo', async (req, res) => {
    try {
        const [jugadores] = await pool.query(`
            SELECT id_usuario as id, username 
            FROM usuario 
            WHERE id_status = 1
            AND id_usuario != ?
            ORDER BY username
        `, [req.user?.id_usuario || 0]);
        
        res.json(jugadores);

    } catch (error) {
        console.error('Error obteniendo jugadores activos:', error);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

module.exports = router;