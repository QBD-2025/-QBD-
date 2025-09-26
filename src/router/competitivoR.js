// En: src/router/competitivoR.js
const express = require('express');
const router = express.Router();
const pool = require('../db/conexion');

// --- RUTA PARA LA "SALA DE DUELOS" 1V1 ---
router.get('/portal', async (req, res) => {
    try {
        const [userData] = await pool.query(
            `SELECT 
                u.puntos,
                (SELECT COUNT(*) FROM historial_duelos WHERE id_retador = u.id_usuario OR id_defensor = u.id_usuario) AS duelos_jugados,
                (SELECT COUNT(*) FROM historial_duelos WHERE id_ganador = u.id_usuario) AS victorias
             FROM usuario u WHERE u.id_usuario = ?`,
            [req.session.user.id_usuario]
        );
        
        res.render('duelodelascenso', {
            layout: 'main',
            user: req.session.user,
            stats: userData[0] || { puntos: 0, duelos_jugados: 0, victorias: 0 }
        });

    } catch (error) {
        console.error("Error al cargar la sala de duelos:", error);
        res.redirect('/menu_principal');
    }
});

// --- RUTA PARA LA VISTA DEL ENFRENTAMIENTO EN SÍ (LA QUE FALLABA) ---
router.get('/duelo/enfrentamiento/:salaId', (req, res) => {
    // Esta ruta renderiza la página del juego para ambos jugadores.
    res.render('duelo_enfrentamiento', { // Asegúrate de tener un archivo duelo_enfrentamiento.hbs
        layout: 'main',
        user: req.session.user,
        salaId: req.params.salaId
    });
});


// --- RUTAS API (RANKINGS, DESAFÍOS, ETC.) ---

router.get('/api/ranking/global', async (req, res) => {
    try {
        const [jugadores] = await pool.query(`
            SELECT u.id_usuario, u.username, u.foto_perfil, u.puntos
            FROM usuario u ORDER BY u.puntos DESC LIMIT 100;
        `);
        res.json(jugadores);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener el ranking global' });
    }
});

router.get('/api/ranking/carrera/:id_carrera', async (req, res) => {
    try {
        const { id_carrera } = req.params;
        const [jugadores] = await pool.query(`
            SELECT u.id_usuario, u.username, u.foto_perfil, upc.puntos
            FROM usuario u
            INNER JOIN usuario_puntos_carrera upc ON u.id_usuario = upc.id_usuario
            WHERE upc.id_carrera = ?
            ORDER BY upc.puntos DESC LIMIT 100;
        `, [id_carrera]);
        res.json(jugadores);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener el ranking de carrera' });
    }
});

router.get('/api/usuario/carreras', async (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'No autorizado' });
    try {
        const [carreras] = await pool.query(`
            SELECT c.id_carrera, c.descripcion 
            FROM carrera c
            INNER JOIN usuario_carrera uc ON c.id_carrera = uc.id_carrera
            WHERE uc.id_usuario = ?;
        `, [req.session.user.id_usuario]);
        res.json(carreras);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener las carreras del usuario' });
    }
});

router.post('/desafiar/duelo/:idOponente', async (req, res) => {
    if (!req.session.user) return res.status(401).json({ message: 'No has iniciado sesión' });
    
    const { idOponente } = req.params;
    const { materia } = req.body;
    const tiempoLimite = 2 * 24 * 60 * 60; // 2 días en segundos
    const { id_usuario: idRemitente, username: usernameRemitente } = req.session.user;

    try {
        const extraData = {
            remitente: req.session.user,
            materia,
            tiempoLimite,
            fecha_expira: new Date(Date.now() + tiempoLimite * 1000) // fecha límite exacta
        };

        await pool.query(
            `INSERT INTO notificaciones 
            (id_usuario_destinatario, id_usuario_remitente, tipo, mensaje, extra_data) 
            VALUES (?, ?, 'desafio_duelo', ?, ?)`,
            [
                idOponente,
                idRemitente,
                `${usernameRemitente} te desafía a un Duelo de Ascenso en ${materia}!`,
                JSON.stringify(extraData)
            ]
        );
        
        req.io.to(idOponente.toString()).emit('notificacion_recibida');
        res.json({ success: true, message: '¡Desafío enviado!', extraData });
    } catch (err) {
        console.error('Error enviando desafío:', err);
        res.status(500).json({ message: 'Error del servidor al enviar el desafío' });
    }
});


// ✅ ¡LA LÍNEA MÁS IMPORTANTE VA AL FINAL DE TODO!
module.exports = router;