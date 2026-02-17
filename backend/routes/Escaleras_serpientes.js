// EN: src/router/serpientes-escalerasR.js

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router  = express.Router();
const pool    = require('../db/conexion');

// ======================================================
// MIDDLEWARE DE AUTENTICACIÓN (helper rápido)
// ======================================================
function requireAuth(req, res, next) {
    if (!req.session?.user) {
        return res.status(401).json({ success: false, message: 'No autenticado' });
    }
    next();
}

// ======================================================
// RUTAS DE VISTAS
// ======================================================

// Crear sala nueva y redirigir
router.get('/serpientes_escaleras', (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    const nuevaSalaId = `se_${uuidv4().split('-')[0]}`;
    res.redirect(`/serpientes_escaleras/${nuevaSalaId}`);
});

// Ir a sala específica
router.get('/serpientes_escaleras/:salaId', async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login?returnTo=' + req.originalUrl);
    }
    try {
        const [materias] = await pool.query(
            `SELECT m.id_materia, m.descripcion 
             FROM materias m
             JOIN pregunta p ON m.id_materia = p.id_materia
             GROUP BY m.id_materia, m.descripcion
             HAVING COUNT(p.id_pregunta) >= 5`
        );
        res.render('serpientes_escaleras', {
            layout: 'main',
            title:  'Serpientes y Escaleras',
            salaId: req.params.salaId,
            user:   req.session.user,
            materias
        });
    } catch (error) {
        console.error('[Serpientes] Error al cargar materias:', error);
        res.status(500).send('Error al cargar el juego');
    }
});

// ======================================================
// RUTAS DE API - JUGADORES
// ======================================================

// ─────────────────────────────────────────────────────
// GET /jugadores/amigos
// Lista de amigos del usuario actual para el panel lateral.
// IMPORTANTE: Esta ruta debe ir ANTES de GET /jugadores
// para que Express no la interprete como /:id
// ─────────────────────────────────────────────────────
router.get('/jugadores/amigos', requireAuth, async (req, res) => {
    const idUsuario = req.session.user.id_usuario;

    try {
        const [amigos] = await pool.query(`
            SELECT
                u.id_usuario   AS id,
                u.username,
                u.foto_perfil,
                u.puntos,
                u.racha_victorias,
                a.fecha_respuesta AS amigos_desde
            FROM amistades a
            INNER JOIN usuario u ON (
                CASE
                    WHEN a.id_solicitante = ? THEN a.id_receptor
                    ELSE a.id_solicitante
                END = u.id_usuario
            )
            WHERE (a.id_solicitante = ? OR a.id_receptor = ?)
              AND a.estado = 'aceptado'
            ORDER BY u.puntos DESC, u.username ASC
        `, [idUsuario, idUsuario, idUsuario]);

        res.json({ success: true, amigos });
    } catch (error) {
        console.error('[Serpientes][/jugadores/amigos] Error:', error);
        res.status(500).json({ success: false, amigos: [] });
    }
});

// ─────────────────────────────────────────────────────
// GET /jugadores/ranking
// Top jugadores ordenados por puntos con paginación.
// Query params:
//   ?limit=8    → jugadores por página (default 8, max 20)
//   ?offset=0   → paginación
// ─────────────────────────────────────────────────────
router.get('/jugadores/ranking', requireAuth, async (req, res) => {
    const idUsuario = req.session.user.id_usuario;
    const limit     = Math.min(parseInt(req.query.limit) || 8, 20);
    const offset    = parseInt(req.query.offset) || 0;

    try {
        // 1. Jugadores ordenados por puntos con bandera de amistad
        const [jugadores] = await pool.query(`
            SELECT
                u.id_usuario   AS id,
                u.username,
                u.foto_perfil,
                u.puntos,
                u.racha_victorias,
                CASE
                    WHEN a.id_amistad IS NOT NULL THEN TRUE
                    ELSE FALSE
                END AS es_amigo,
                CASE
                    WHEN u.id_usuario = ? THEN TRUE
                    ELSE FALSE
                END AS soy_yo,
                (
                    SELECT COUNT(*) + 1
                    FROM usuario u2
                    WHERE u2.puntos > u.puntos
                      AND u2.id_status = 1
                ) AS posicion
            FROM usuario u
            LEFT JOIN amistades a ON (
                (a.id_solicitante = ? AND a.id_receptor = u.id_usuario AND a.estado = 'aceptado')
                OR
                (a.id_receptor   = ? AND a.id_solicitante = u.id_usuario AND a.estado = 'aceptado')
            )
            WHERE u.id_status = 1
            ORDER BY u.puntos DESC, u.username ASC
            LIMIT ? OFFSET ?
        `, [idUsuario, idUsuario, idUsuario, limit, offset]);

        // 2. Total para paginación
        const [[{ total }]] = await pool.query(
            `SELECT COUNT(*) AS total FROM usuario WHERE id_status = 1`
        );

        // 3. Posición propia del usuario (para mostrar "Tu posición: #X")
        const [[{ mi_posicion }]] = await pool.query(`
            SELECT COUNT(*) + 1 AS mi_posicion
            FROM usuario
            WHERE id_status = 1
              AND puntos > (
                SELECT puntos FROM usuario WHERE id_usuario = ?
              )
        `, [idUsuario]);

        res.json({
            success: true,
            jugadores,
            meta: {
                total,
                limit,
                offset,
                has_more:    offset + limit < total,
                mi_posicion: mi_posicion  // ya viene +1 de la query
            }
        });
    } catch (error) {
        console.error('[Serpientes][/jugadores/ranking] Error:', error);
        res.status(500).json({ success: false, jugadores: [], meta: {} });
    }
});

// ─────────────────────────────────────────────────────
// GET /jugadores
// Lista general de usuarios activos (excluyendo al actual)
// Se mantiene por compatibilidad, aunque el nuevo panel
// ya no lo usa directamente.
// ─────────────────────────────────────────────────────
router.get('/jugadores', requireAuth, async (req, res) => {
    const idUsuario = req.session.user.id_usuario;
    try {
        const [jugadores] = await pool.query(`
            SELECT
                u.id_usuario AS id,
                u.username,
                u.foto_perfil,
                u.puntos,
                CASE
                    WHEN a.id_amistad IS NOT NULL THEN TRUE
                    ELSE FALSE
                END AS es_amigo
            FROM usuario u
            LEFT JOIN amistades a ON (
                (a.id_solicitante = ? AND a.id_receptor = u.id_usuario AND a.estado = 'aceptado')
                OR
                (a.id_receptor   = ? AND a.id_solicitante = u.id_usuario AND a.estado = 'aceptado')
            )
            WHERE u.id_usuario != ?
              AND u.id_status  = 1
            ORDER BY es_amigo DESC, u.puntos DESC
        `, [idUsuario, idUsuario, idUsuario]);

        res.json(jugadores);
    } catch (error) {
        console.error('[Serpientes][/jugadores] Error:', error);
        res.status(500).json([]);
    }
});

// ─────────────────────────────────────────────────────
// POST /invitar/:idJugador
// Enviar invitación a una sala existente
// ─────────────────────────────────────────────────────
router.post('/invitar/:idJugador', requireAuth, async (req, res) => {
    const { idJugador }     = req.params;
    const { salaId, juego } = req.body;
    const invitador  = req.session.user.username;
    const idInvitador = req.session.user.id_usuario;

    try {
        await pool.query(
            `INSERT INTO notificaciones 
                (id_usuario_destinatario, id_usuario_remitente, tipo, mensaje, extra_data)
             VALUES (?, ?, 'invitacion', ?, ?)`,
            [
                idJugador,
                idInvitador,
                `${invitador} te ha invitado a jugar ${juego}`,
                JSON.stringify({ salaId, juego })
            ]
        );

        const io = req.app.get('io');
        if (io) io.emit('notificacion_recibida', { userId: idJugador });

        res.json({ success: true, message: 'Invitación enviada exitosamente' });
    } catch (error) {
        console.error('[Serpientes][/invitar] Error:', error);
        res.status(500).json({ success: false, message: 'Error al enviar la invitación' });
    }
});

module.exports = router;