// =============================================
// ROUTER AHORCADO - ahorcadoR.js
// =============================================
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const pool = require('../db/conexion');

// ─────────────────────────────────────────────
// GET /ahorcado/materias
// Devuelve las materias/categorías disponibles
// ─────────────────────────────────────────────
router.get('/ahorcado/materias', async (req, res) => {
    try {
        const [materias] = await req.pool.query(
            `SELECT DISTINCT m.id_materia, m.descripcion
             FROM materias m
             INNER JOIN palabras p ON m.id_materia = p.id_materia;`
        );
        res.json(materias);
    } catch (error) {
        console.error("Error al obtener las materias para el ahorcado:", error);
        res.status(500).json([]);
    }
});

// ─────────────────────────────────────────────
// GET /ahorcado
// Redirige a una sala nueva con UUID
// ─────────────────────────────────────────────
router.get('/ahorcado', (req, res) => {
    const nuevaSalaId = uuidv4();
    res.redirect(`/ahorcado/${nuevaSalaId}`);
});

// ─────────────────────────────────────────────
// GET /ahorcado/:salaId
// Renderiza la vista del ahorcado
// ─────────────────────────────────────────────
router.get('/ahorcado/:salaId', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login?returnTo=' + req.originalUrl);
    }
    res.render('ahorcado', {
        title: 'Ahorcado Multijugador',
        layout: "main",
        user: req.session.user,
        salaId: req.params.salaId
    });
});

// ─────────────────────────────────────────────
// GET /jugadores
// Lista de jugadores ordenados por puntos (ranking)
// Excluye al usuario actual si está en sesión
// ─────────────────────────────────────────────
router.get('/jugadores', async (req, res) => {
    try {
        const idActual = req.session?.user?.id_usuario || null;

        // Ordenar por puntos descendente; excluir usuario actual si existe
        let query = `
            SELECT id_usuario AS id, username, puntos
            FROM usuario
        `;
        const params = [];

        if (idActual) {
            query += ` WHERE id_usuario != ?`;
            params.push(idActual);
        }

        query += ` ORDER BY puntos DESC LIMIT 50`;

        const [jugadores] = await pool.query(query, params);
        res.json(jugadores);
    } catch (error) {
        console.error("Error al obtener jugadores:", error);
        res.status(500).json([]);
    }
});

// ─────────────────────────────────────────────
// POST /invitar/:idJugador
// Envía una notificación de invitación a una sala
// ─────────────────────────────────────────────
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

        const io = req.app.get('io');
        if (io) {
            io.to(idJugador.toString()).emit('notificacion_recibida', { userId: idJugador });
        }

        res.json({ success: true, message: 'Invitación enviada exitosamente' });
    } catch (error) {
        console.error('Error al enviar invitación:', error);
        res.status(500).json({ success: false, message: 'Error al enviar la invitación' });
    }
});

// ─────────────────────────────────────────────
// POST /enfrentar/:idJugador
// Crea sala de enfrentamiento y notifica al retado
// ─────────────────────────────────────────────
router.post('/enfrentar/:idJugador', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ message: 'No autenticado' });
    }

    try {
        const { idJugador } = req.params;
        const { juego } = req.body;
        const retador = req.session.user.username;
        const idRetador = req.session.user.id_usuario;
        const nuevaSalaId = uuidv4();

        await pool.query(
            `INSERT INTO notificaciones (id_usuario_destinatario, id_usuario_remitente, tipo, mensaje, extra_data)
             VALUES (?, ?, 'invitacion', ?, ?)`,
            [
                idJugador,
                idRetador,
                `${retador} te ha desafiado a ${juego}`,
                JSON.stringify({
                    salaId: nuevaSalaId + '?modo=enfrentamiento',
                    juego,
                    modo: 'enfrentamiento'
                })
            ]
        );

        const io = req.app.get('io');
        if (io) {
            io.to(idJugador.toString()).emit('notificacion_recibida', { userId: idJugador });
        }

        res.json({
            success: true,
            salaId: nuevaSalaId,
            modo: 'enfrentamiento',
            message: 'Desafío enviado exitosamente'
        });
    } catch (error) {
        console.error('Error al enviar desafío:', error);
        res.status(500).json({ success: false, message: 'Error al enviar el desafío' });
    }
});

module.exports = router;