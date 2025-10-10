// router/invitacionesR.js(actual)
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
        return res.status(400).json({ message: 'Error: Faltan datos en la invitación (salaId o juego).' });
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
        return res.status(400).json({ message: 'Error: Faltan datos del desafío (juego o materia).' });
    }

    // Genera un ID único para la sala
    const salaId = `duelo_${uuidv4()}`;
    const tiempoLimite = 48 * 60 * 60 * 1000; // 48h en ms
    const fechaExpira = new Date(Date.now() + tiempoLimite);

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
        } catch (err) {
            console.warn('⚠️ JSON inválido en extra_data:', notificacion.extra_data);
            extraData = {};
        }

        // 🔥 MANEJAR TIPOS DE NOTIFICACIÓN
        if (notificacion.tipo === 'desafio_duelo') {
            // ... (tu código existente para desafio_duelo se queda igual)
            const salaId = extraData.salaId || `duelo_${uuidv4()}`;
            const fechaLimite = new Date(Date.now() + 48 * 60 * 60 * 1000);

            await pool.query(
                `INSERT INTO duelos (id_duelo, id_retador, id_defensor, materia, fecha_limite, respondido_retador, respondido_oponente)
                 VALUES (?, ?, ?, ?, ?, 0, 0)
                 ON DUPLICATE KEY UPDATE fecha_limite = VALUES(fecha_limite)`,
                [salaId, extraData.remitente.id_usuario, userId, extraData.materia, fechaLimite]
            );

            await pool.query(`DELETE FROM notificaciones WHERE id_notificacion = ?`, [idNotificacion]);

            const notifRetadorData = JSON.stringify({ salaId, materia: extraData.materia });
            const notifDefensorData = JSON.stringify({ salaId, materia: extraData.materia });

            await pool.query(
                `INSERT INTO notificaciones (id_usuario_destinatario, id_usuario_remitente, tipo, mensaje, extra_data) 
                 VALUES (?, ?, 'duelo_aceptado', ?, ?)`,
                [
                    extraData.remitente.id_usuario,
                    userId,
                    `${req.session.user.username} aceptó tu desafío de ${extraData.materia}. Tienes 48 horas para hacer el examen.`,
                    notifRetadorData
                ]
            );

            await pool.query(
                `INSERT INTO notificaciones (id_usuario_destinatario, id_usuario_remitente, tipo, mensaje, extra_data) 
                 VALUES (?, ?, 'duelo_aceptado', ?, ?)`,
                [
                    userId,
                    extraData.remitente.id_usuario,
                    `Duelo activo contra ${extraData.remitente.username} en ${extraData.materia}. Tienes 48 horas para hacer el examen.`,
                    notifDefensorData
                ]
            );

            if (req.io) {
                req.io.to(extraData.remitente.id_usuario.toString()).emit('notificacion_recibida');
                req.io.to(userId.toString()).emit('notificacion_recibida');
            }

            return res.json({
                success: true,
                tipo: 'desafio_duelo',
                salaId,
                message: `¡Desafío aceptado! Tienes 48 horas para hacer el examen de ${extraData.materia}.`,
                mostrarEnlace: true,
                enlaceExamen: `/duelo/examen/${salaId}`,
                fechaLimite,
                id_remitente: extraData.remitente.id_usuario
            });

        } else if (notificacion.tipo === 'invitacion') {
            // 🔥 AQUÍ ESTÁ LA CORRECCIÓN
            const salaId = extraData.salaId || `sala_${uuidv4()}`;
            await pool.query(`DELETE FROM notificaciones WHERE id_notificacion = ?`, [idNotificacion]);

            // Construir la URL correctamente según el modo
            let urlRedirigir = `/${extraData.juego.toLowerCase()}/${salaId}`;
            
            // Si tiene modo enfrentamiento, añadir el parámetro
            if (extraData.modo === 'enfrentamiento') {
                urlRedirigir += '?modo=enfrentamiento';
            }

            return res.json({
                success: true,
                tipo: 'invitacion',
                salaId,
                redirigir: urlRedirigir, // 🔥 URL corregida con el parámetro modo
                message: '¡Invitación aceptada!',
                extra_data: extraData
            });
        }

        // Tipo desconocido
        await pool.query(`DELETE FROM notificaciones WHERE id_notificacion = ?`, [idNotificacion]);
        res.json({ success: true, message: 'Notificación procesada' });

    } catch (err) {
        console.error('❌ Error completo en aceptar notificación:', err);
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