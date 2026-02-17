const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const pool = require('../db/conexion');

// ==================== RUTAS DE API (primero las específicas) ====================

// 🔹 Obtener materias disponibles
router.get('/sopa/materias', async (req, res) => {
    try {
        const [materias] = await pool.query(
            `SELECT DISTINCT m.id_materia, m.descripcion
            FROM materias m
            INNER JOIN palabras p ON m.id_materia = p.id_materia`
        );
        res.json(materias);
    } catch (error) {
        console.error("Error al obtener materias:", error);
        res.status(500).json([]);
    }
});

// 🔹 Obtener palabras por categoría
router.get('/sopa/palabras/:idMateria', async (req, res) => {
    try {
        const [palabras] = await pool.query(
            `SELECT palabra, pista FROM palabras 
            WHERE id_materia = ? 
            ORDER BY RAND() LIMIT 10`,
            [req.params.idMateria]
        );
        res.json(palabras.map(p => ({
            word: p.palabra.toUpperCase(),
            hint: p.pista
        })));
    } catch (error) {
        console.error("Error al obtener palabras:", error);
        res.status(500).json([]);
    }
});


// =============================================
// 👥 GET /jugadores/amigos
// Lista de amigos del usuario actual para el panel de minijuegos.
// Devuelve: id, username, foto_perfil, puntos, en_linea (si tienes presencia)
// =============================================
router.get('/jugadoresa/amigos', async (req, res) => {
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
        console.error('❌ [JUGADORES/AMIGOS] Error:', error);
        res.status(500).json({ success: false, amigos: [] });
    }
});

// =============================================
// 🏆 GET /jugadores/ranking
// Top jugadores ordenados por puntos (para el panel de minijuegos).
// Separa: primero tus amigos (marcados), luego el resto.
// Query params:
//   ?limit=20   → cuántos traer (default 20, max 50)
//   ?offset=0   → paginación
// =============================================
router.get('/jugadoresa/ranking', async (req, res) => {
    const idUsuario = req.session.user.id_usuario;
    const limit  = Math.min(parseInt(req.query.limit)  || 20, 50);
    const offset = parseInt(req.query.offset) || 0;

    try {
        // 1. Traer jugadores ordenados por puntos con bandera de amistad
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
                /* Posición global */
                (
                    SELECT COUNT(*) + 1
                    FROM usuario u2
                    WHERE u2.puntos > u.puntos
                ) AS posicion
            FROM usuario u
            LEFT JOIN amistades a ON (
                (a.id_solicitante = ? AND a.id_receptor = u.id_usuario AND a.estado = 'aceptado')
                OR
                (a.id_receptor = ? AND a.id_solicitante = u.id_usuario AND a.estado = 'aceptado')
            )
            WHERE u.id_status = 1  /* Solo usuarios activos */
            ORDER BY u.puntos DESC, u.username ASC
            LIMIT ? OFFSET ?
        `, [idUsuario, idUsuario, idUsuario, limit, offset]);

        // 2. Total para saber si hay más páginas
        const [[{ total }]] = await pool.query(
            `SELECT COUNT(*) AS total FROM usuario WHERE id_status = 1`
        );

        // 3. Posición del usuario actual (para mostrar "Tu posición: #X")
        const [[{ mi_posicion }]] = await pool.query(`
            SELECT COUNT(*) + 1 AS mi_posicion
            FROM usuario
            WHERE puntos > (
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
                has_more: offset + limit < total,
                mi_posicion: mi_posicion + 1
            }
        });
    } catch (error) {
        console.error('❌ [JUGADORES/RANKING] Error:', error);
        res.status(500).json({ success: false, jugadores: [], meta: {} });
    }
});
// ==================== RUTAS DE INVITACIONES ====================

router.get('/jugadores', async (req, res) => {
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
                (a.id_receptor = ? AND a.id_solicitante = u.id_usuario AND a.estado = 'aceptado')
            )
            WHERE u.id_usuario != ?
              AND u.id_status = 1
            ORDER BY es_amigo DESC, u.puntos DESC
        `, [idUsuario, idUsuario, idUsuario]);

        res.json(jugadores);
    } catch (error) {
        console.error('Error al obtener jugadores:', error);
        res.status(500).json([]);
    }
});
// 🔹 Invitar a un jugador a una sala existente
router.post('/invitar/:idJugador', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ message: 'No autenticado' });
    }

    try {
        const { idJugador } = req.params;
        const { salaId, juego } = req.body;
        const invitador = req.session.user.username;
        const idInvitador = req.session.user.id_usuario;

        // Insertar notificación en la base de datos
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

        // Emitir evento de socket para notificación en tiempo real
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

// 🔹 Desafiar a un jugador (crea nueva sala de enfrentamiento)
router.post('/enfrentar/:idJugador', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ message: 'No autenticado' });
    }

    try {
        const { idJugador } = req.params;
        const { juego } = req.body;
        const retador = req.session.user.username;
        const idRetador = req.session.user.id_usuario;
        
        // Crear nueva sala para el enfrentamiento
        const nuevaSalaId = uuidv4();

        // Insertar notificación en la base de datos
        await pool.query(
            `INSERT INTO notificaciones (id_usuario_destinatario, id_usuario_remitente, tipo, mensaje, extra_data)
             VALUES (?, ?, 'invitacion', ?, ?)`,
            [
                idJugador,
                idRetador,
                `${retador} te ha desafiado a ${juego}`,
                JSON.stringify({ 
                    salaId: nuevaSalaId, 
                    juego, 
                    modo: 'enfrentamiento'
                })
            ]
        );

        // Emitir evento de socket para notificación en tiempo real
        const io = req.app.get('io');
        if (io) {
            io.emit('notificacion_recibida', { userId: idJugador });
        }

        res.json({ 
            success: true,
            salaId: nuevaSalaId,
            modo: 'enfrentamiento',
            message: 'Desafío enviado exitosamente'
        });
    } catch (error) {
        console.error('Error al enviar desafío:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error al enviar el desafío' 
        });
    }
});

// ==================== RUTAS DE VISTAS (al final, orden importa) ====================

// 🔹 Ruta para crear nueva sala (redirige con UUID)
router.get('/sopa', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login?returnTo=/sopa');
    }
    const nuevaSalaId = uuidv4();
    res.redirect(`/sopa/${nuevaSalaId}`);
});

// 🔹 Ruta para unirse a sala existente o crear nueva con modo enfrentamiento
router.get('/sopa/:salaId', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login?returnTo=' + req.originalUrl);
    }
    
    const { salaId } = req.params;
    const modo = req.query.modo || 'normal'; // Detectar si es enfrentamiento
    
    console.log(`[ROUTER] Usuario ${req.session.user.username} accediendo a sala ${salaId} en modo: ${modo}`);
    
    res.render('sopa-letras', {
        title: modo === 'enfrentamiento' ? 'Sopa de Letras - Enfrentamiento' : 'Sopa de Letras Multijugador',
        layout: "main",
        user: req.session.user,
        salaId: salaId
    });
});

module.exports = router;