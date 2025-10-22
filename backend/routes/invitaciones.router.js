// router/invitaciones.router.js - VERSIÓN CORREGIDA
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
const pool = require('../db/conexion');

// ================================================================
// ✅ ACEPTAR NOTIFICACIÓN - VERSIÓN CORREGIDA
// ================================================================
router.post('/aceptar/:idNotificacion', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ 
            success: false, 
            message: 'Debes iniciar sesión' 
        });
    }

    const { idNotificacion } = req.params;
    const userId = req.session.user.id_usuario;

    console.log('===========================================');
    console.log('[ACEPTAR] ID Notificación:', idNotificacion);
    console.log('[ACEPTAR] Usuario:', userId);
    console.log('===========================================');

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // 1️⃣ Obtener notificación
        const [notificaciones] = await conn.query(
            `SELECT * FROM notificaciones WHERE id_notificacion = ? AND id_usuario_destinatario = ?`,
            [idNotificacion, userId]
        );

        if (notificaciones.length === 0) {
            await conn.rollback();
            await conn.release();
            return res.status(404).json({ 
                success: false, 
                message: 'Notificación no encontrada' 
            });
        }

        const notificacion = notificaciones[0];
        let extraData = {};

        try {
            extraData = JSON.parse(notificacion.extra_data || '{}');
        } catch (err) {
            console.warn('⚠️ JSON inválido en extra_data');
            extraData = {};
        }

        console.log('[ACEPTAR] Tipo:', notificacion.tipo);
        console.log('[ACEPTAR] Extra Data:', extraData);

        // ════════════════════════════════════════════════════════
        // 🎯 DUELO DE ASCENSO (ASÍNCRONO 48H)
        // ════════════════════════════════════════════════════════
        if (notificacion.tipo === 'desafio_duelo' && extraData.id_duelo) {
            const id_duelo = extraData.id_duelo;

            console.log('[ACEPTAR DUELO ASCENSO] ID Duelo:', id_duelo);

            // Verificar que el duelo existe y está pendiente
            const [dueloInfo] = await conn.query(`
                SELECT * FROM duelos WHERE id_duelo = ?
            `, [id_duelo]);

            if (dueloInfo.length === 0) {
                // Duelo no existe, eliminar notificación
                await conn.query(`DELETE FROM notificaciones WHERE id_notificacion = ?`, [idNotificacion]);
                await conn.commit();
                await conn.release();

                return res.status(410).json({
                    success: false,
                    message: 'El duelo ya no existe o expiró'
                });
            }

            const duelo = dueloInfo[0];

            // Verificar fecha límite
            if (new Date() > new Date(duelo.fecha_limite)) {
                // Duelo expirado
                await conn.query(`DELETE FROM notificaciones WHERE id_notificacion = ?`, [idNotificacion]);
                await conn.query(`DELETE FROM duelos WHERE id_duelo = ?`, [id_duelo]);
                await conn.commit();
                await conn.release();

                return res.status(410).json({
                    success: false,
                    message: 'El duelo ha expirado (más de 48 horas)'
                });
            }

            // ✅ ELIMINAR LA NOTIFICACIÓN (CRÍTICO)
            await conn.query(`DELETE FROM notificaciones WHERE id_notificacion = ?`, [idNotificacion]);

            console.log('[ACEPTAR DUELO ASCENSO] ✅ Notificación eliminada');

            // Actualizar estado del duelo a 'en_progreso' (opcional)
            await conn.query(`
                UPDATE duelos SET estado = 'en_progreso' WHERE id_duelo = ?
            `, [id_duelo]);

            // Notificar al retador (opcional)
            const io = req.app.get('io');
            if (io && extraData.remitente?.id_usuario) {
                io.to(extraData.remitente.id_usuario.toString()).emit('duelo:aceptado', {
                    mensaje: `${req.session.user.username} aceptó tu duelo`,
                    id_duelo
                });
            }

            await conn.commit();
            await conn.release();

            return res.json({
                success: true,
                tipo: 'desafio_duelo',
                id_duelo,
                message: '¡Duelo aceptado! Tienes 48h para completarlo.',
                redirigir: `/duelo/examen/${id_duelo}`
            });
        }

        // ════════════════════════════════════════════════════════
        // ⚔️ DUELO RÁPIDO (TIEMPO REAL)
        // ════════════════════════════════════════════════════════
        if (notificacion.tipo === 'desafio_duelo' && extraData.subtipo === 'duelo_rapido') {
            console.log('[ACEPTAR DUELO RÁPIDO] Sala:', extraData.salaId);

            const salaId = extraData.salaId;

            if (!salaId) {
                await conn.rollback();
                await conn.release();
                return res.status(400).json({
                    success: false,
                    message: 'Sala no encontrada en la notificación'
                });
            }

            // Verificar que la sala existe
            const salasPendientes = global.salasPendientes || new Map();
            const sala = salasPendientes.get(salaId);

            if (!sala) {
                // Sala expirada
                await conn.query(`DELETE FROM notificaciones WHERE id_notificacion = ?`, [idNotificacion]);
                await conn.commit();
                await conn.release();
                
                return res.status(410).json({
                    success: false,
                    message: 'El desafío expiró. Solicita uno nuevo.'
                });
            }

            // Marcar sala como aceptada
            sala.estado = 'aceptada';
            salasPendientes.set(salaId, sala);

            // ✅ ELIMINAR NOTIFICACIÓN
            await conn.query(`DELETE FROM notificaciones WHERE id_notificacion = ?`, [idNotificacion]);

            console.log('[ACEPTAR DUELO RÁPIDO] ✅ Notificación eliminada');

            // Notificar al retador
            const io = req.app.get('io');
            if (io && extraData.remitente?.id_usuario) {
                io.to(extraData.remitente.id_usuario.toString()).emit('duelo:desafioAceptado', {
                    mensaje: `${req.session.user.username} aceptó tu desafío`,
                    salaId
                });
            }

            await conn.commit();
            await conn.release();

            return res.json({
                success: true,
                tipo: 'desafio_duelo',
                subtipo: 'duelo_rapido',
                salaId,
                message: '¡Desafío aceptado! Redirigiendo...',
                redirigir: `/competitivo/sala/${salaId}`
            });
        }

        // ════════════════════════════════════════════════════════
        // 🎮 INVITACIONES A MINIJUEGOS
        // ════════════════════════════════════════════════════════
        if (notificacion.tipo === 'invitacion') {
            const salaId = extraData.salaId || `sala_${uuidv4()}`;
            
            // ✅ ELIMINAR NOTIFICACIÓN
            await conn.query(`DELETE FROM notificaciones WHERE id_notificacion = ?`, [idNotificacion]);

            let urlRedirigir = `/${extraData.juego.toLowerCase()}/${salaId}`;
            
            await conn.commit();
            await conn.release();

            return res.json({
                success: true,
                tipo: 'invitacion',
                salaId,
                redirigir: urlRedirigir,
                message: '¡Invitación aceptada!'
            });
        }

        // ════════════════════════════════════════════════════════
        // 🔹 OTROS TIPOS DE NOTIFICACIONES
        // ════════════════════════════════════════════════════════
        
        // Por defecto, eliminar la notificación
        await conn.query(`DELETE FROM notificaciones WHERE id_notificacion = ?`, [idNotificacion]);
        
        await conn.commit();
        await conn.release();

        res.json({ 
            success: true, 
            message: 'Notificación procesada' 
        });

    } catch (err) {
        await conn.rollback();
        await conn.release();
        console.error('❌ Error al aceptar notificación:', err);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor: ' + err.message 
        });
    }
});

// ================================================================
// 🚫 RECHAZAR NOTIFICACIÓN - VERSIÓN CORREGIDA
// ================================================================
router.post('/rechazar/:idNotificacion', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ 
            success: false, 
            message: 'Debes iniciar sesión' 
        });
    }

    const { idNotificacion } = req.params;
    const userId = req.session.user.id_usuario;

    console.log('[RECHAZAR] ID Notificación:', idNotificacion);
    console.log('[RECHAZAR] Usuario:', userId);

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const [rows] = await conn.query(
            `SELECT * FROM notificaciones WHERE id_notificacion = ? AND id_usuario_destinatario = ?`,
            [idNotificacion, userId]
        );

        if (rows.length === 0) {
            await conn.rollback();
            await conn.release();
            return res.status(404).json({ 
                success: false, 
                message: 'Notificación no encontrada' 
            });
        }

        const notificacion = rows[0];
        let extraData = {};

        try {
            extraData = JSON.parse(notificacion.extra_data || '{}');
        } catch (e) {
            console.warn('No se pudo parsear extra_data:', e.message);
        }

        console.log('[RECHAZAR] Tipo:', notificacion.tipo);
        console.log('[RECHAZAR] Extra Data:', extraData);

        // Si es un desafío de ascenso, podemos eliminar el duelo también
        if (notificacion.tipo === 'desafio_duelo' && extraData.id_duelo) {
            console.log('[RECHAZAR] Eliminando duelo:', extraData.id_duelo);
            
            // Eliminar duelo completo (preguntas, respuestas, duelo)
            await conn.query(`DELETE FROM duelos_preguntas WHERE id_duelo = ?`, [extraData.id_duelo]);
            await conn.query(`DELETE FROM duelos_respuestas WHERE id_duelo = ?`, [extraData.id_duelo]);
            await conn.query(`DELETE FROM duelos WHERE id_duelo = ?`, [extraData.id_duelo]);
        }

        // Si es un desafío rápido, limpiar la sala pendiente
        if (extraData.subtipo === 'duelo_rapido' && extraData.salaId) {
            const salasPendientes = global.salasPendientes;
            const salasEspera = global.salasEspera;
            
            if (salasPendientes) salasPendientes.delete(extraData.salaId);
            if (salasEspera) salasEspera.delete(extraData.salaId);
            
            console.log('[RECHAZAR] Sala eliminada:', extraData.salaId);

            // Notificar al retador
            const io = req.app.get('io');
            if (io && extraData.remitente?.id_usuario) {
                io.to(extraData.remitente.id_usuario.toString()).emit('duelo:desafioRechazado', {
                    mensaje: `${req.session.user.username} rechazó tu desafío`
                });
            }
        }

        // Eliminar notificación
        await conn.query(`DELETE FROM notificaciones WHERE id_notificacion = ?`, [idNotificacion]);
        
        console.log('[RECHAZAR] ✅ Notificación eliminada');

        await conn.commit();
        await conn.release();
        
        res.json({ 
            success: true, 
            message: 'Notificación rechazada' 
        });

    } catch (err) {
        await conn.rollback();
        await conn.release();
        console.error('❌ Error al rechazar notificación:', err);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor: ' + err.message 
        });
    }
});

// ================================================================
// 📨 INVITACIONES A MINIJUEGOS
// ================================================================
router.post('/invitar/:idJugador', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ message: 'No has iniciado sesión' });
    }

    const { salaId, juego } = req.body;
    const { idJugador } = req.params;
    const { id_usuario: idRemitente, username: usernameRemitente } = req.session.user;

    if (!salaId || !juego) {
        return res.status(400).json({ 
            message: 'Error: Faltan datos (salaId o juego)' 
        });
    }

    try {
        const extraData = JSON.stringify({ salaId, juego });
        await pool.query(
            `INSERT INTO notificaciones (id_usuario_destinatario, id_usuario_remitente, tipo, mensaje, extra_data) 
             VALUES (?, ?, 'invitacion', ?, ?)`,
            [
                idJugador,
                idRemitente,
                `${usernameRemitente} te invita a ${juego}`,
                extraData
            ]
        );
        res.json({ message: 'Invitación enviada ✅' });
    } catch (err) {
        console.error('Error enviando invitación:', err);
        res.status(500).json({ message: 'Error del servidor' });
    }
});

// ================================================================
// 🎮 DESAFÍO RÁPIDO BD (DUELOS EN TIEMPO REAL)
// ================================================================
router.post('/desafio/duelo/:idOponente', async (req, res) => {
    console.log('[DESAFIO RAPIDO] POST recibido');
    
    if (!req.session.user) {
        return res.status(401).json({ 
            success: false, 
            message: 'No has iniciado sesión' 
        });
    }

    const { idOponente } = req.params;
    const { modo, dificultad } = req.body;
    const idRetador = req.session.user.id_usuario;
    const usernameRetador = req.session.user.username;

    if (parseInt(idRetador) === parseInt(idOponente)) {
        return res.status(400).json({ 
            success: false, 
            message: 'No puedes desafiarte a ti mismo' 
        });
    }

    try {
        // Verificar que el oponente existe
        const [oponente] = await pool.query(
            'SELECT id_usuario, username, foto_perfil FROM usuario WHERE id_usuario = ?',
            [idOponente]
        );

        if (oponente.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Usuario no encontrado' 
            });
        }

        // Verificar límite de desafíos pendientes
        const [desafiosPendientes] = await pool.query(`
            SELECT COUNT(*) as total 
            FROM notificaciones 
            WHERE id_usuario_remitente = ? 
            AND tipo = 'desafio_duelo' 
            AND JSON_EXTRACT(extra_data, '$.subtipo') = 'duelo_rapido'
            AND fecha_creacion > DATE_SUB(NOW(), INTERVAL 5 MINUTE)
        `, [idRetador]);

        if (desafiosPendientes[0].total >= 3) {
            return res.status(429).json({
                success: false,
                message: 'Ya tienes desafíos pendientes. Espera 5 minutos.'
            });
        }

        // Crear sala
        if (!global.crearSalaPendiente) {
            return res.status(500).json({
                success: false,
                message: 'Sistema de salas no inicializado'
            });
        }

        const io = req.app.get('io');
        const salaId = global.crearSalaPendiente(idRetador, parseInt(idOponente), io);

        console.log(`[DESAFIO RAPIDO] ✅ Sala creada: ${salaId}`);

        // Crear notificación
        const extraData = JSON.stringify({
            salaId,
            modo: modo || 'general',
            dificultad: dificultad || null,
            subtipo: 'duelo_rapido',
            remitente: {
                id_usuario: idRetador,
                username: usernameRetador,
                foto_perfil: req.session.user.foto_perfil
            }
        });

        await pool.query(`
            INSERT INTO notificaciones 
            (id_usuario_destinatario, id_usuario_remitente, tipo, mensaje, extra_data) 
            VALUES (?, ?, 'desafio_duelo', ?, ?)
        `, [
            idOponente,
            idRetador,
            `⚔️ ${usernameRetador} te desafía a un duelo rápido!`,
            extraData
        ]);

        console.log(`[DESAFIO RAPIDO] ✅ Notificación creada`);

        // Emitir socket
        if (io) {
            io.to(idOponente.toString()).emit('notificacion_recibida', {
                tipo: 'desafio_duelo',
                mensaje: `${usernameRetador} te desafió`,
                salaId
            });
        }

        res.json({
            success: true,
            message: `✅ Desafío enviado a ${oponente[0].username}`,
            salaId,
            modo,
            oponente: oponente[0]
        });

    } catch (error) {
        console.error('[DESAFIO RAPIDO ERROR]:', error);
        res.status(500).json({
            success: false,
            message: 'Error del servidor: ' + error.message
        });
    }
});

module.exports = router;