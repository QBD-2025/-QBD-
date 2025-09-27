// routes/invitacionesR.js
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
// ⚔️ CREAR NUEVA SALA DE ENFRENTAMIENTO 1vs1 (asincrónico)
// ================================================================
router.post('/enfrentar/:idJugador', async (req, res) => {
    if (!req.session.user) return res.status(401).json({ message: 'No has iniciado sesión' });

    const { juego } = req.body;
    const { idJugador } = req.params;
    const { id_usuario: idRemitente, username: usernameRemitente } = req.session.user;

    if (!juego) {
        return res.status(400).json({ message: 'Error: Faltan datos del desafío (juego).' });
    }

    // Genera un ID único para la sala
    const salaId = `duelo_${uuidv4().split('-')[0]}`;
    const tiempoLimite = 48 * 60 * 60 * 1000; // 48h en ms
    const fechaExpira = new Date(Date.now() + tiempoLimite);

    try {
        const extraData = JSON.stringify({
            salaId,
            juego,
            modo: 'enfrentamiento',
            remitente: req.session.user,
            fechaExpira
        });

        await pool.query(
            `INSERT INTO notificaciones (id_usuario_destinatario, id_usuario_remitente, tipo, mensaje, extra_data) 
             VALUES (?, ?, 'desafio_duelo', ?, ?)`,
            [
                idJugador,
                idRemitente,
                `${usernameRemitente} te desafía a un duelo. Tienes 48h para responder.`,
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
// ✅ ACEPTAR INVITACIÓN O DESAFÍO (duelos asincrónicos) - CON DEBUGGING
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

        // 🔥 MANEJAR DIFERENTES TIPOS DE NOTIFICACIÓN
        if (notificacion.tipo === 'desafio_duelo') {
            // ⚔️ DUELO DE ASCENSO
            if (!extraData.remitente || !extraData.remitente.id_usuario) {
                console.error('❌ La notificación no tiene datos de remitente válidos:', extraData);
                return res.status(400).json({ success: false, message: 'Datos de desafío inválidos' });
            }

            const salaId = `duelo_${Date.now()}_${userId}_${extraData.remitente.id_usuario}`;
            const fechaLimite = new Date(Date.now() + 48 * 60 * 60 * 1000);

            console.log('🔄 Procesando aceptación de duelo...');
            console.log('📊 Datos del duelo:', {
                salaId,
                userId,
                remitenteId: extraData.remitente.id_usuario,
                remitente: extraData.remitente.username,
                fechaLimite
            }); 

            // Crear duelo asincrónico
            await pool.query(
                `INSERT INTO duelos (id_duelo, id_retador, id_defensor, fecha_limite, respondido_retador, respondido_oponente)
                 VALUES (?, ?, ?, ?, 0, 0)
                 ON DUPLICATE KEY UPDATE fecha_limite = VALUES(fecha_limite)`,
                [salaId, extraData.remitente.id_usuario, userId, fechaLimite]
            );

            console.log('✅ Duelo creado en BD');

            // 🧹 Borrar notificación aceptada
            await pool.query(`DELETE FROM notificaciones WHERE id_notificacion = ?`, [idNotificacion]);
            console.log('🧹 Notificación original eliminada');

            // Preparar datos para las nuevas notificaciones
            const notifRetadorData = JSON.stringify({ salaId});
            const notifDefensorData = JSON.stringify({ salaId});
            
            console.log('📤 Extra data para notificaciones:', {
                retador: notifRetadorData,
                defensor: notifDefensorData
            });

            try {
                // Crear notificación para el retador
                const resultRetador = await pool.query(
                    `INSERT INTO notificaciones (id_usuario_destinatario, id_usuario_remitente, tipo, mensaje, extra_data) 
                     VALUES (?, ?, 'duelo_aceptado', ?, ?)`,
                    [
                        extraData.remitente.id_usuario,
                        userId,
                        `${req.session.user.username} aceptó tu desafío de. Tienes 48 horas para hacer el examen.`,
                        notifRetadorData
                    ]
                );
                console.log('✅ Notificación para retador creada:', resultRetador[0].insertId);

                // Crear notificación para el defensor
                const resultDefensor = await pool.query(
                    `INSERT INTO notificaciones (id_usuario_destinatario, id_usuario_remitente, tipo, mensaje, extra_data) 
                     VALUES (?, ?, 'duelo_aceptado', ?, ?)`,
                    [
                        userId,
                        extraData.remitente.id_usuario,
                        `Duelo activo contra ${extraData.remitente.username} Tienes 48 horas para hacer el examen.`,
                        notifDefensorData
                    ]
                );
                console.log('✅ Notificación para defensor creada:', resultDefensor[0].insertId);

                // Verificar que las notificaciones se guardaron correctamente
                const [verificacion] = await pool.query(
                    `SELECT id_notificacion, tipo, mensaje, extra_data 
                     FROM notificaciones 
                     WHERE id_notificacion IN (?, ?) 
                     ORDER BY id_notificacion DESC`,
                    [resultRetador[0].insertId, resultDefensor[0].insertId]
                );
                console.log('🔍 Verificación de notificaciones guardadas:', verificacion);

            } catch (notifError) {
                console.error('❌ Error al crear notificaciones duelo_aceptado:', notifError);
                // Continuar con la respuesta aunque fallen las notificaciones
            }

            // Emitir eventos socket
            if (req.io) {
                req.io.to(extraData.remitente.id_usuario.toString()).emit('notificacion_recibida');
                req.io.to(userId.toString()).emit('notificacion_recibida');
                console.log('📡 Eventos socket emitidos');
            }

            res.json({
                success: true,
                tipo: 'desafio_duelo',
                salaId,
                message: `¡Desafío aceptado! Tienes 48 horas para hacer el examen. Ve a las notificaciones para unirte.`,
                mostrarEnlace: true,
                enlaceExamen: `/duelo/examen/${salaId}`,
                fechaLimite: fechaLimite,
                id_remitente: extraData.remitente.id_usuario
            });

        } else if (notificacion.tipo === 'invitacion') {
            // 🎮 INVITACIÓN A MINIJUEGO NORMAL
            const salaId = extraData.salaId || `sala_${Date.now()}_${userId}`;
            
            // Borrar notificación
            await pool.query(`DELETE FROM notificaciones WHERE id_notificacion = ?`, [idNotificacion]);

            res.json({
                success: true,
                tipo: 'invitacion',
                salaId,
                redirigir: `/${extraData.juego}/${salaId}`,
                message: '¡Invitación aceptada!',
                extra_data: extraData
            });

        } else {
            // Tipo desconocido
            await pool.query(`DELETE FROM notificaciones WHERE id_notificacion = ?`, [idNotificacion]);
            res.json({
                success: true,
                message: 'Notificación procesada'
            });
        }

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

router.delete('/notificaciones/eliminar/:idNotificacion', async (req, res) => {
    if (!req.session.user) return res.status(401).json({ success: false, error: 'No autorizado' });
    
    const { idNotificacion } = req.params;
    const userId = req.session.user.id_usuario;
    
    try {
        const resultado = await pool.query(
            `DELETE FROM notificaciones 
            WHERE id_notificacion = ? AND id_usuario_destinatario = ?`,
            [idNotificacion, userId]
        );
        
        res.json({ 
            success: true, 
            message: 'Notificación eliminada',
            eliminadas: resultado[0].affectedRows 
        });
    } catch (error) {
        console.error('Error al eliminar notificación:', error);
        res.status(500).json({ success: false, error: 'Error del servidor' });
    }
});

module.exports = router;