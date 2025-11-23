// EN: src/router/serpientes-escalerasR.js

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
const pool = require('../db/conexion'); 

// ==================== RUTAS DE VISTAS ====================

// Ruta para CREAR una nueva sala y redirigir
router.get('/serpientes_escaleras', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    // Creamos un ID de sala más corto y legible
    const nuevaSalaId = `se_${uuidv4().split('-')[0]}`;
    res.redirect(`/serpientes_escaleras/${nuevaSalaId}`);
});

// Ruta para IR a una sala específica
router.get('/serpientes_escaleras/:salaId', async (req, res) => {
    if (!req.session.user) {
        // Guardamos la URL a la que querían ir para redirigirlos después del login
        return res.redirect('/login?returnTo=' + req.originalUrl);
    }

    try {
        // Obtenemos las materias que tienen al menos 5 preguntas
        const [materias] = await pool.query(
            `SELECT m.id_materia, m.descripcion 
             FROM materias m
             JOIN pregunta p ON m.id_materia = p.id_materia
             GROUP BY m.id_materia, m.descripcion
             HAVING COUNT(p.id_pregunta) >= 5`
        );

        console.log(`[Serpientes] Renderizando sala ${req.params.salaId} con ${materias.length} materias precargadas.`);

        // IMPORTANTE: Asegúrate de que el nombre coincida con tu archivo .hbs
        res.render('serpientes_escaleras', { // ← Usa 'serpientes-escaleras' o 'serpientes_escaleras' según tu archivo
            layout: 'main',
            title: 'Serpientes y Escaleras',
            salaId: req.params.salaId,
            user: req.session.user,
            materias: materias
        });
    } catch (error) {
        console.error("Error al cargar materias para Serpientes y Escaleras:", error);
        res.status(500).send("Error al cargar el juego");
    }
});

// ==================== RUTAS DE API ====================

// 🔹 Obtener lista de jugadores activos (si no la tienes en otro router)
router.get('/jugadores', async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ message: 'No autenticado' });
        }

        const [jugadores] = await pool.query(
            `SELECT id_usuario AS id, username
             FROM usuario
             WHERE id_usuario != ?`,
            [req.session.user.id_usuario]
        );
        
        res.json(jugadores);
    } catch (error) {
        console.error("Error al obtener jugadores:", error);
        res.status(500).json([]);
    }
});

// 🔹 Invitar a un jugador a una sala
router.post('/invitar/:idJugador', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ message: 'No autenticado' });
    }

    try {
        const { idJugador } = req.params;
        const { salaId, juego } = req.body;
        const invitador = req.session.user.username;
        const idInvitador = req.session.user.id_usuario;

        await pool.query(
            `INSERT INTO notificaciones (id_usuario_destinatario, id_usuario_remitente, tipo, mensaje, extra_data)
             VALUES (?, ?, 'invitacion', ?, ?)`,
            [
                idJugador,
                idInvitador,
                `${invitador} te ha invitado a jugar ${juego}`,
                JSON.stringify({ salaId, juego })
            ]
        );

        // Emitir notificación en tiempo real
        const io = req.app.get('io');
        if (io) {
            io.emit('notificacion_recibida', { userId: idJugador });
        }

        res.json({ 
            success: true, 
            message: 'Invitación enviada exitosamente' 
        });
    } catch (error) {
        console.error('Error al enviar invitación:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error al enviar la invitación' 
        });
    }
});

module.exports = router;