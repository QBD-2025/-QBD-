const express = require('express');
const router = express.Router();
const pool = require('../db/conexion'); // importa el pool

router.get('/ranking', async (req, res) => {
    try {
        // Seleccionamos datos del usuario y su ranking
        const [rows] = await pool.query(`
            SELECT 
                u.id_usuario,
                u.username,
                u.apodo,
                u.puntos,
                r.posicion,
                r.fecha_actualizacion
            FROM usuario u
            LEFT JOIN ranking r ON u.id_usuario = r.id_usuario
            ORDER BY u.puntos DESC, r.fecha_actualizacion ASC
            LIMIT 100
        `);

        res.render('ranking', {
            title: 'Ranking',
            usuarios: rows,
            layout: false
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al obtener ranking');
    }
}); 

module.exports = router;
