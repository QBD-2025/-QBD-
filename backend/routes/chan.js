// router/invitacionesR.js
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
const pool = require('../db/conexion');

// ================================================================
// 📨 INVITAR A UNA SALA EXISTENTE (cooperativo o casual)
// ================================================================
router.post('/invitar/:idJugador', async (req, res) => {
    if (!req.session.user) return res.status(401).json({ message: 'No has iniciado sesión' });

    const { salaId, juego } = req.body;
    const { idJugador } = req.params;
    const { id_usuario: idRemitente, username: usernameRemitente } = req.session.user;

    if (!salaId || !juego) {
        return res.status(400).json({ message: 'Faltan datos en la invitación (salaId o juego).' });
    }

    try {
        const extraData = JSON.stringify({ salaId, juego });
        await pool.query(
            `INSERT INTO notificaciones (id_usuario_destinatario, id_usuario_remitente, tipo, mensaje, extra_data) 
             VALUES (?, ?, 'invitacion', ?, ?)`,
            [
                idJugador,
                idRemitente,
                `${usernameRemitente} te invita a una partida de ${juego}`,
                extraData
            ]
        );
        res.json({ message: 'Invitación enviada ✅' });
    } catch (err) {
        console.error('Error enviando invitación:', err);
        res.status(500).json({ message: 'Error del servidor al enviar la invitación' });
    }
});

// ================================================================
// ⚔️ CREAR NUEVA SALA DE ENFRENTAMIENTO 1vs1
// ================================================================
router.post('/enfrentar/:idJugador', async (req, res) => {
    if (!req.session.user) return res.status(401).json({ message: 'No has iniciado sesión' });

    const { juego, materia } = req.body;
    const { idJugador } = req.params;
    const { id_usuario: idRemitente, username: usernameRemitente } = req.session.user;

    if (!juego || !materia) {
        return res.status(400).json({ message: 'Faltan datos del desafío (juego o materia).' });
    }

    const salaId = `duelo_${uuidv4()}`;
    const fechaExpira = Date.now() + 48 * 60 * 60 * 1000; // 48h

    try {
        const extraData = JSON.stringify({
            salaId,
            juego,
            modo: 'enfrentamiento',
            materia,
            remitente: req.session.user,
            fechaExpira
        });

        await pool.query(
            `INSERT INTO notificaciones (id_usuario_destinatario, id_usuario_remitente, tipo, mensaje, extra_data) 
             VALUES (?, ?, 'desafio_duelo', ?, ?)`,
            [
                idJugador,
                idRemitente,
                `${usernameRemitente} te desafía a un duelo de ${materia}. Tienes 48h para responder.`,
                extraData
            ]
        );

        res.json({ message: 'Desafío enviado ⚔️', salaId, modo: 'enfrentamiento' });
    } catch (err) {
        console.error('Error enviando desafío:', err);
        res.status(500).json({ message: 'Error del servidor al enviar el desafío' });
    }
});

// ================================================================
// ✅ ACEPTAR INVITACIÓN O DESAFÍO
// ================================================================
router.post('/aceptar/:idNotificacion', async (req, res) => {
    if (!req.session.user) return res.status(401).json({ success: false, message: 'Debes iniciar sesión' });

    const { idNotificacion } = req.params;
    const userId = req.session.user.id_usuario;

    try {
        const [notificaciones] = await pool.query(
            `SELECT * FROM notificaciones WHERE id_notificacion = ? AND id_usuario_destinatario = ?`,
            [idNotificacion, userId]
        );

        if (notificaciones.length === 0) {
            return res.status(404).json({ success: false, message: 'Notificación no encontrada' });
        }

        const notificacion = notificaciones[0];

        let extraData = {};
        try {
            extraData = JSON.parse(notificacion.extra_data || '{}');
        } catch {
            extraData = {};
        }

        // 🔥 Determinar remitente seguro
        const remitente = extraData.remitente || { id_usuario: null, username: 'Desconocido' };
        const salaId = extraData.salaId || `sala_${uuidv4()}`;

        // 🔥 Manejar tipos
        if (notificacion.tipo === 'desafio_duelo') {
            const fechaLimite = new Date(Date.now() + 48 * 60 * 60 * 1000);

            await pool.query(
                `INSERT INTO duelos (id_duelo, id_retador, id_defensor, materia, fecha_limite, respondido_retador, respondido_oponente)
                 VALUES (?, ?, ?, ?, ?, 0, 0)
                 ON DUPLICATE KEY UPDATE fecha_limite = VALUES(fecha_limite)`,
                [salaId, remitente.id_usuario, userId, extraData.materia, fechaLimite]
            );

            await pool.query(`DELETE FROM notificaciones WHERE id_notificacion = ?`, [idNotificacion]);

            const notifData = JSON.stringify({ salaId, materia: extraData.materia });

            // Notificación al retador
            if (remitente.id_usuario) {
                await pool.query(
                    `INSERT INTO notificaciones (id_usuario_destinatario, id_usuario_remitente, tipo, mensaje, extra_data) 
                     VALUES (?, ?, 'duelo_aceptado', ?, ?)`,
                    [
                        remitente.id_usuario,
                        userId,
                        `${req.session.user.username} aceptó tu desafío de ${extraData.materia}. Tienes 48h para hacer el examen.`,
                        notifData
                    ]
                );
            }

            // Notificación al defensor
            await pool.query(
                `INSERT INTO notificaciones (id_usuario_destinatario, id_usuario_remitente, tipo, mensaje, extra_data) 
                 VALUES (?, ?, 'duelo_aceptado', ?, ?)`,
                [
                    userId,
                    remitente.id_usuario,
                    `Duelo activo contra ${remitente.username} en ${extraData.materia}. Tienes 48h para hacer el examen.`,
                    notifData
                ]
            );

            if (req.io) {
                if (remitente.id_usuario) req.io.to(remitente.id_usuario.toString()).emit('notificacion_recibida');
                req.io.to(userId.toString()).emit('notificacion_recibida');
            }

            return res.json({
                success: true,
                tipo: 'desafio_duelo',
                salaId,
                message: `¡Desafío aceptado! Tienes 48h para hacer el examen de ${extraData.materia}.`,
                mostrarEnlace: true,
                enlaceExamen: `/duelo/examen/${salaId}`,
                fechaLimite,
                id_remitente: remitente.id_usuario
            });

        } else if (notificacion.tipo === 'invitacion') {
            await pool.query(`DELETE FROM notificaciones WHERE id_notificacion = ?`, [idNotificacion]);

            let urlRedirigir = `/${(extraData.juego || 'juego').toLowerCase()}/${salaId}`;
            if (extraData.modo === 'enfrentamiento') urlRedirigir += '?modo=enfrentamiento';

            if (req.io && remitente.id_usuario) {
                req.io.to(remitente.id_usuario.toString()).emit('notificacion_recibida');
                req.io.to(userId.toString()).emit('notificacion_recibida');
            }

            return res.json({
                success: true,
                tipo: 'invitacion',
                salaId,
                redirigir: urlRedirigir,
                message: '¡Invitación aceptada!',
                extra_data: extraData
            });
        }

        // Tipo desconocido
        await pool.query(`DELETE FROM notificaciones WHERE id_notificacion = ?`, [idNotificacion]);
        res.json({ success: true, message: 'Notificación procesada' });

    } catch (err) {
        console.error('❌ Error aceptando notificación:', err);
        res.status(500).json({ success: false, message: 'Error interno al aceptar la notificación' });
    }
});

// ================================================================
// 🚫 RECHAZAR INVITACIÓN O DESAFÍO
// ================================================================
router.post('/rechazar/:idNotificacion', async (req, res) => {
    if (!req.session.user) return res.status(401).json({ success: false, message: 'Debes iniciar sesión' });

    const { idNotificacion } = req.params;
    const userId = req.session.user.id_usuario;

    try {
        const [rows] = await pool.query(
            `SELECT * FROM notificaciones WHERE id_notificacion = ? AND id_usuario_destinatario = ?`,
            [idNotificacion, userId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Notificación no encontrada' });
        }

        await pool.query(`DELETE FROM notificaciones WHERE id_notificacion = ?`, [idNotificacion]);
        res.json({ success: true, message: 'Notificación rechazada y eliminada 🧹' });

    } catch (err) {
        console.error('Error al rechazar notificación:', err);
        res.status(500).json({ success: false, message: 'Error interno al rechazar la notificación' });
    }
});

module.exports = router;
