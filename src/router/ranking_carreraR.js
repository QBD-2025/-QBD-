const express = require('express');
const router = express.Router();
const db = require('../db/conexion');

// Página del ranking por carrera
router.get('/ranking-carrera', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }

    console.log('Usuario en sesión (servidor):', req.session.user);

    res.render('rankingCarrera', {
        user: req.session.user
    });
});

// API: obtener jugadores del ranking por carrera
router.get('/api/ranking/carrera/:id_carrera', async (req, res) => {
    const { id_carrera } = req.params;

    console.log('Buscando ranking para carrera ID:', id_carrera);

    try {
        // Primero, verifica si la tabla usuario_carrera tiene datos
        const [checkCarrera] = await db.query(
            'SELECT COUNT(*) as total FROM usuario_carrera WHERE id_carrera = ?',
            [id_carrera]
        );
        
        console.log('Usuarios en esta carrera:', checkCarrera[0].total);

        // Consulta principal
        const [jugadores] = await db.query(`
            SELECT 
                u.id_usuario, 
                u.username, 
                u.puntos, 
                u.foto_perfil
            FROM usuario u
            INNER JOIN usuario_carrera uc ON u.id_usuario = uc.id_usuario
            WHERE uc.id_carrera = ?
            ORDER BY u.puntos DESC
            LIMIT 100
        `, [id_carrera]);

        console.log('Jugadores encontrados:', jugadores.length);

        // Si no hay jugadores, intenta una consulta alternativa
        if (jugadores.length === 0) {
            console.log('No se encontraron jugadores. Verificando estructura de datos...');
            
            // Consulta alternativa sin JOIN (por si id_carrera está directo en usuario)
            const [jugadoresAlt] = await db.query(`
                SELECT 
                    id_usuario, 
                    username, 
                    puntos, 
                    foto_perfil
                FROM usuario
                WHERE id_carrera = ?
                ORDER BY puntos DESC
                LIMIT 100
            `, [id_carrera]);
            
            console.log('Jugadores con consulta alternativa:', jugadoresAlt.length);
            return res.json(jugadoresAlt);
        }

        res.json(jugadores);
    } catch (error) {
        console.error('Error en /api/ranking/carrera:', error);
        res.status(500).json({ 
            message: 'Error al obtener ranking de carrera',
            error: error.message 
        });
    }
});

module.exports = router;