// --------------------- rankingR.js -----------------
const express = require('express');
const router = express.Router();
const pool = require('../db/conexion');

router.get('/ranking', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT 
                u.id_usuario,
                u.username,
                u.apodo,
                u.puntos,
                u.foto_perfil,
                r.posicion,
                r.fecha_actualizacion
            FROM usuario u
            LEFT JOIN ranking r ON u.id_usuario = r.id_usuario
            ORDER BY u.puntos DESC, r.fecha_actualizacion ASC
            LIMIT 100
        `);

        const usuariosConAvatar = rows.map((user, index) => {
            let foto_perfil = user.foto_perfil;
            
            if (!foto_perfil || foto_perfil.trim() === '') {
                foto_perfil = '/uploads/default_avatar.png';
            }
            else if (!foto_perfil.startsWith('/') && !foto_perfil.startsWith('http')) {
                foto_perfil = `/uploads/${foto_perfil}`;
            }
            
            return {
                ...user,
                foto_perfil: foto_perfil,
                posicion_real: index + 1
            };
        });

        res.render('ranking', {
            title: 'Ranking',
            usuarios: usuariosConAvatar,
            layout: false
        });
    } catch (err) {
        console.error('Error al obtener ranking:', err);
        res.status(500).send('Error al obtener ranking');
    }
}); 

module.exports = router;