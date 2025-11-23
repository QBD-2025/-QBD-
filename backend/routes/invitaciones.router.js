// router/invitaciones.router.js - ✅ VERSIÓN FINAL CORREGIDA (DUELOS 48H)
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
const pool = require('../db/conexion');

// ================================================================
// ⚔️ DUELO RÁPIDO BD - CREAR DESAFÍO (NO TOCAR - FUNCIONA BIEN)
// ================================================================
router.post('/desafio/duelo/:idOponente', async (req, res) => {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('[DESAFÍO BD]: 🚀 INICIO DEL PROCESO');
    console.log('═══════════════════════════════════════════════════════════');
    
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: 'No autenticado' });
    }

    const { idOponente } = req.params;
    const { modo = 'general', dificultad = null } = req.body;
    const idRemitente = req.session.user.id_usuario;
    const usernameRemitente = req.session.user.username;
    const fotoRemitente = req.session.user.foto_perfil || '/uploads/default_avatar.png';

    console.log(`[DESAFÍO BD]: 👤 Remitente: ${idRemitente} (${usernameRemitente})`);
    console.log(`[DESAFÍO BD]: 🎯 Destinatario: ${idOponente}`);

    if (parseInt(idOponente) === idRemitente) {
        return res.status(400).json({ success: false, message: 'No puedes desafiarte a ti mismo' });
    }

    try {
        const [oponenteData] = await pool.query(
            'SELECT id_usuario, username FROM usuario WHERE id_usuario = ?', 
            [idOponente]
        );

        if (oponenteData.length === 0) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
        }

        console.log(`[DESAFÍO BD]: ✅ Oponente: ${oponenteData[0].username}`);

        const [desafioExistente] = await pool.query(
            `SELECT id_notificacion FROM notificaciones 
             WHERE id_usuario_destinatario = ? 
             AND id_usuario_remitente = ? 
             AND tipo = 'desafio_duelo_rapido'
             AND fecha_creacion > DATE_SUB(NOW(), INTERVAL 5 MINUTE)`,
            [idOponente, idRemitente]
        );

        if (desafioExistente.length > 0) {
            return res.status(429).json({ 
                success: false, 
                message: '⏱️ Ya enviaste un desafío recientemente. Espera 5 minutos.' 
            });
        }

        const io = req.app.get('io') || req.io || global.io;
        
        if (!io) {
            console.error('[DESAFÍO BD]: ❌ Socket.IO NO DISPONIBLE');
            return res.status(500).json({ 
                success: false, 
                message: 'Sistema no disponible' 
            });
        }

        if (typeof global.crearSalaPendienteBD !== 'function') {
            console.error('[DESAFÍO BD]: ❌ crearSalaPendienteBD NO EXISTE');
            return res.status(500).json({ 
                success: false, 
                message: 'Sistema no inicializado' 
            });
        }

        console.log('[DESAFÍO BD]: 🏗️ Creando sala...');
        
        const salaId = global.crearSalaPendienteBD(
            idRemitente, 
            idOponente, 
            modo, 
            dificultad, 
            io
        );
        
        if (!salaId || typeof salaId !== 'string' || salaId.length < 10) {
            console.error('[DESAFÍO BD]: ❌❌❌ salaId INVÁLIDO');
            return res.status(500).json({ 
                success: false, 
                message: 'Error al crear sala'
            });
        }

        console.log(`[DESAFÍO BD]: ✅✅✅ Sala creada: ${salaId}`);

        await new Promise(resolve => setTimeout(resolve, 2000));

        const salasPendientes = global.salasPendientes || new Map();
        const salasEspera = global.salasEspera || new Map();
        
        const enPendientes = salasPendientes.has(salaId);
        const enEspera = salasEspera.has(salaId);

        if (!enPendientes && !enEspera) {
            console.error('[DESAFÍO BD]: ❌ SALA NO PERSISTE');
            return res.status(500).json({ 
                success: false, 
                message: 'La sala no se guardó correctamente'
            });
        }

        const extraDataObj = {
            salaId: salaId,
            modo: modo,
            dificultad: dificultad,
            idRemitente: idRemitente,
            usernameRemitente: usernameRemitente,
            fotoRemitente: fotoRemitente
        };

        const extraDataString = JSON.stringify(extraDataObj);
        
        const [insertResult] = await pool.query(
            `INSERT INTO notificaciones 
             (id_usuario_destinatario, id_usuario_remitente, tipo, mensaje, extra_data) 
             VALUES (?, ?, 'desafio_duelo_rapido', ?, ?)`,
            [
                parseInt(idOponente),
                parseInt(idRemitente),
                `⚔️ ${usernameRemitente} te desafía a un duelo rápido!`,
                extraDataString
            ]
        );

        const idNotificacion = insertResult.insertId;

        const usuariosConectados = global.usuariosConectados || new Map();
        const oponenteSocketId = usuariosConectados.get(parseInt(idOponente));
        
        if (oponenteSocketId) {
            io.to(oponenteSocketId).emit('notificacion_recibida', {
                tipo: 'desafio_duelo_rapido',
                mensaje: `⚔️ ${usernameRemitente} te desafía a un duelo rápido!`,
                id_notificacion: idNotificacion,
                salaId: salaId,
                extra_data: extraDataObj
            });
        }

        console.log('═══════════════════════════════════════════════════════════');
        console.log('[DESAFÍO BD]: ✅✅✅ PROCESO COMPLETADO');
        console.log('═══════════════════════════════════════════════════════════');
        
        res.json({
            success: true,
            message: `✅ Desafío enviado a ${oponenteData[0].username}`,
            salaId: salaId,
            notificacionId: idNotificacion
        });
        
    } catch (err) {
        console.error('[DESAFÍO BD]: ❌ ERROR:', err);
        res.status(500).json({ 
            success: false, 
            message: 'Error: ' + err.message
        });
    }
});

// ================================================================
// ✅ ACEPTAR NOTIFICACIÓN - ✅✅✅ VERSIÓN FINAL CORREGIDA
// ================================================================
router.post('/aceptar/:idNotificacion', async (req, res) => {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('[ACEPTAR]: 🚀 INICIO');
    console.log('═══════════════════════════════════════════════════════════');
    
    res.setHeader('Content-Type', 'application/json');
    
    if (!req.session?.user) {
        return res.status(401).json({ success: false, message: 'No autenticado' });
    }

    const { idNotificacion } = req.params;
    const userId = req.session.user.id_usuario;

    console.log(`[ACEPTAR]: Notificación: ${idNotificacion}, Usuario: ${userId}`);

    let conn;
    try {
        conn = await pool.getConnection();
        await conn.beginTransaction();

        const [notificaciones] = await conn.query(
            `SELECT * FROM notificaciones 
             WHERE id_notificacion = ? AND id_usuario_destinatario = ?`,
            [parseInt(idNotificacion), parseInt(userId)]
        );

        if (notificaciones.length === 0) {
            await conn.rollback();
            conn.release();
            return res.status(404).json({ 
                success: false, 
                message: 'Notificación no encontrada' 
            });
        }

        const notificacion = notificaciones[0];
        console.log(`[ACEPTAR]: ✅ Encontrada - Tipo: ${notificacion.tipo}`);

        if (!notificacion.extra_data) {
            console.error('[ACEPTAR]: ❌ extra_data es NULL');
            await conn.rollback();
            conn.release();
            return res.status(500).json({ 
                success: false, 
                message: 'Datos corruptos' 
            });
        }
        
        let extraData = {};
        try {
            extraData = JSON.parse(notificacion.extra_data);
            console.log('[ACEPTAR]: ✅ Extra data parseado');
            console.log('[ACEPTAR]: Keys:', Object.keys(extraData));
        } catch (parseError) {
            console.error('[ACEPTAR]: ❌ Error parseando:', parseError);
            await conn.rollback();
            conn.release();
            return res.status(500).json({ 
                success: false, 
                message: 'JSON inválido' 
            });
        }

        // ════════════════════════════════════════════════════════
        // ⚔️ DUELO RÁPIDO BD (MODO 1 - NO TOCAR)
        // ════════════════════════════════════════════════════════
        if (notificacion.tipo === 'desafio_duelo_rapido') {
            console.log('[ACEPTAR]: ⚔️ PROCESANDO DUELO RÁPIDO BD');
            
            const salaId = extraData.salaId;
            
            if (!salaId || typeof salaId !== 'string' || salaId.length < 10) {
                console.error('[ACEPTAR]: ❌ salaId INVÁLIDO');
                await conn.rollback();
                conn.release();
                return res.status(400).json({
                    success: false,
                    message: 'Sala no válida'
                });
            }

            const salasPendientes = global.salasPendientes || new Map();
            const salasEspera = global.salasEspera || new Map();
            
            let sala = null;
            let salaKey = null;
            let intentos = 0;
            const maxIntentos = 20;
            
            while (!sala && intentos < maxIntentos) {
                intentos++;
                
                for (const [key, value] of [...salasPendientes.entries(), ...salasEspera.entries()]) {
                    if (key.toLowerCase() === salaId.toLowerCase()) {
                        sala = value;
                        salaKey = key;
                        break;
                    }
                }
                
                if (!sala && intentos < maxIntentos) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }

            if (!sala) {
                console.error('[ACEPTAR]: ❌ SALA NO ENCONTRADA');
                await conn.query(
                    `DELETE FROM notificaciones WHERE id_notificacion = ?`, 
                    [idNotificacion]
                );
                await conn.commit();
                conn.release();
                
                return res.status(410).json({
                    success: false,
                    message: 'El desafío expiró'
                });
            }

            sala.estado = 'aceptada';
            sala.jugadoresAceptados = sala.jugadoresAceptados || new Set();
            sala.jugadoresAceptados.add(parseInt(sala.retador || sala.idRetador));
            sala.jugadoresAceptados.add(parseInt(userId));
            
            salasPendientes.set(salaKey, sala);
            salasEspera.set(salaKey, sala);
            global.salasPendientes.set(salaKey, sala);
            global.salasEspera.set(salaKey, sala);

            await conn.query(`DELETE FROM notificaciones WHERE id_notificacion = ?`, [idNotificacion]);
            await conn.query(`DELETE FROM notificaciones WHERE id_usuario_destinatario = ? OR id_usuario_remitente = ?`, [extraData.idRemitente, extraData.idRemitente]);

            const io = req.app.get('io') || global.io;
            const idRetador = parseInt(extraData.idRemitente);
            
            if (io && idRetador) {
                const usuariosConectados = global.usuariosConectados || new Map();
                const retadorSocketId = usuariosConectados.get(idRetador);
                
                if (retadorSocketId) {
                    io.to(retadorSocketId).emit('duelo:desafioAceptado', {
                        mensaje: `${req.session.user.username} aceptó tu desafío`,
                        salaId: salaKey
                    });
                    
                    io.to(retadorSocketId).emit('duelo:redirigirASala', {
                        salaId: salaKey,
                        mensaje: '¡Desafío aceptado! Redirigiendo...'
                    });
                }
            }

            await conn.commit();
            conn.release();

            const urlRedireccion = `/competitivo/sala/${salaKey}?origen=socket`;

            return res.json({
                success: true,
                tipo: 'desafio_duelo_rapido',
                salaId: salaKey,
                message: '¡Desafío aceptado!',
                redirigir: urlRedireccion
            });
        }
        
         // 🔥 Determinar remitente seguro
        const remitente = extraData.remitente || { id_usuario: null, username: 'Desconocido' };
        const salaId = extraData.salaId || `sala_${uuidv4()}`;

        // ════════════════════════════════════════════════════════
        // 📚 DUELO POR EXAMEN 48 HORAS (MODO 2) - ✅✅✅ CORREGIDO
        // ════════════════════════════════════════════════════════
         if (notificacion.tipo === 'desafio_duelo') {
            const fechaLimite = new Date(Date.now() + 48 * 60 * 60 * 1000);

            await pool.query(
                `INSERT INTO duelos (id_duelo, id_retador, id_defensor, fecha_limite, respondido_retador, respondido_oponente)
                 VALUES (?, ?, ?, ?, 0, 0)
                 ON DUPLICATE KEY UPDATE fecha_limite = VALUES(fecha_limite)`,
                [salaId, remitente.id_usuario, userId, fechaLimite]
            );

            await pool.query(`DELETE FROM notificaciones WHERE id_notificacion = ?`, [idNotificacion]);
            await pool.query(`DELETE FROM notificaciones WHERE id_usuario_destinatario = ? OR id_usuario_remitente = ?`, [remitente.id_usuario, remitente.id_usuario]);

            const notifData = JSON.stringify({ salaId});

            // Notificación al retador
            if (remitente.id_usuario) {
                await pool.query(
                    `INSERT INTO notificaciones (id_usuario_destinatario, id_usuario_remitente, tipo, mensaje, extra_data) 
                    VALUES (?, ?, 'duelo_aceptado', ?, ?)`,
                    [
                        remitente.id_usuario,
                        userId,
                        `${req.session.user.username} aceptó tu desafío. Tienes 48h para hacer el examen.`,
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
                    `Duelo activo contra ${remitente.username}. Tienes 48h para hacer el examen.`,
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
                message: `¡Desafío aceptado! Tienes 48h para hacer el examen`,
                mostrarEnlace: true,
                enlaceExamen: `/duelo/examen/${salaId}`,
                fechaLimite,
                id_remitente: remitente.id_usuario
            });
        }
        // ════════════════════════════════════════════════════════
        // 🎮 INVITACIONES A MINIJUEGOS
        // ════════════════════════════════════════════════════════
        if (notificacion.tipo === 'invitacion') {
            console.log('[ACEPTAR]: 🎮 PROCESANDO INVITACIÓN A MINIJUEGO');
            
            const salaId = extraData.salaId || `sala_${uuidv4()}`;
            const juego = extraData.juego || 'gato';
            
            console.log(`[ACEPTAR INVITACIÓN]: Sala: ${salaId}, Juego: ${juego}`);
            
            await conn.query(`DELETE FROM notificaciones WHERE id_notificacion = ?`, [idNotificacion]);

            console.log('[ACEPTAR INVITACIÓN]: ✅ Notificación eliminada');

            let urlRedirigir = `/${juego.toLowerCase()}/${salaId}`;
            
            await conn.commit();
            conn.release();

            console.log('[ACEPTAR]: ✅ INVITACIÓN ACEPTADA');
            console.log('═══════════════════════════════════════════════════════════');

            return res.json({
                success: true,
                tipo: 'invitacion',
                salaId,
                juego,
                redirigir: urlRedirigir,
                message: '¡Invitación aceptada!'
            });
        }

        // ════════════════════════════════════════════════════════
        // 🔹 OTROS TIPOS DE NOTIFICACIONES
        // ════════════════════════════════════════════════════════
        console.log('[ACEPTAR]: ℹ️ Tipo no específico, eliminando notificación');
        
        await conn.query(
            `DELETE FROM notificaciones WHERE id_notificacion = ?`, 
            [idNotificacion]
        );
        await conn.commit();
        conn.release();

        res.json({ 
            success: true, 
            message: 'Notificación procesada' 
        });

    } catch (err) {
        if (conn) {
            try { await conn.rollback(); } catch(e) {}
            conn.release();
        }
        
        console.error('═══════════════════════════════════════════════════════════');
        console.error('[ACEPTAR]: ❌ ERROR FATAL:', err);
        console.error('═══════════════════════════════════════════════════════════');
        
        res.status(500).json({ 
            success: false, 
            message: 'Error: ' + err.message
        });
    }
});

// ================================================================
// 🚫 RECHAZAR NOTIFICACIÓN - ✅ CON LÓGICA PARA duelo_aceptado
// ================================================================
router.post('/rechazar/:idNotificacion', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ 
            success: false, 
            message: 'No autenticado' 
        });
    }

    const { idNotificacion } = req.params;
    const userId = req.session.user.id_usuario;
    const username = req.session.user.username;

    console.log('[RECHAZAR] ID Notificación:', idNotificacion);
    console.log('[RECHAZAR] Usuario:', userId);

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const [rows] = await conn.query(
            `SELECT * FROM notificaciones 
             WHERE id_notificacion = ? AND id_usuario_destinatario = ?`,
            [idNotificacion, userId]
        );

        if (rows.length === 0) {
            await conn.rollback();
            conn.release();
            return res.status(404).json({ 
                success: false, 
                message: 'No encontrada' 
            });
        }

        const notificacion = rows[0];
        let extraData = {};

        try {
            extraData = JSON.parse(notificacion.extra_data || '{}');
        } catch (e) {
            console.warn('No se pudo parsear extra_data:', e.message);
            extraData = {};
        }

        console.log('[RECHAZAR] Tipo:', notificacion.tipo);

        // ⚔️ Si es un desafío rápido BD, limpiar sala
        if (notificacion.tipo === 'desafio_duelo_rapido' && extraData.salaId) {
            console.log('[RECHAZAR] Limpiando sala de duelo rápido:', extraData.salaId);
            
            const salasPendientes = global.salasPendientes;
            const salasEspera = global.salasEspera;
            
            const sala = salasPendientes?.get(extraData.salaId);
            
            if (sala?.timeoutId) {
                clearTimeout(sala.timeoutId);
            }
            
            if (salasPendientes) salasPendientes.delete(extraData.salaId);
            if (salasEspera) salasEspera.delete(extraData.salaId);

            const io = req.app.get('io') || req.io || global.io;
            if (io && extraData.idRemitente) {
                const retadorSocketId = global.usuariosConectados?.get(parseInt(extraData.idRemitente));
                if (retadorSocketId) {
                    io.to(retadorSocketId).emit('duelo:desafioRechazado', {
                        mensaje: `${username} rechazó tu desafío`
                    });
                }
            }
        }

        // 📚 Si es un duelo de 48 horas PENDIENTE, eliminar el duelo completo
        if (notificacion.tipo === 'desafio_duelo' && extraData.id_duelo) {
            console.log('[RECHAZAR] Eliminando duelo de 48h:', extraData.id_duelo);
            
            await conn.query(`DELETE FROM duelos_preguntas WHERE id_duelo = ?`, [extraData.id_duelo]);
            await conn.query(`DELETE FROM duelos_respuestas WHERE id_duelo = ?`, [extraData.id_duelo]);
            await conn.query(`DELETE FROM duelos WHERE id_duelo = ?`, [extraData.id_duelo]);
            
            const io = req.app.get('io') || global.io;
            if (io && extraData.remitente?.id_usuario) {
                const retadorSocketId = global.usuariosConectados?.get(parseInt(extraData.remitente.id_usuario));
                if (retadorSocketId) {
                    io.to(retadorSocketId).emit('duelo:desafioRechazado', {
                        mensaje: `${username} rechazó tu desafío`
                    });
                }
            }
        }

        // 🆕 ════════════════════════════════════════════════════════
        // 🚫 Si es DUELO ACEPTADO (tipo: duelo_aceptado) - CANCELAR DUELO
        // ════════════════════════════════════════════════════════
        if (notificacion.tipo === 'duelo_aceptado') {
            console.log('[RECHAZAR] 🚫 CANCELANDO DUELO ACEPTADO');
            console.log('[RECHAZAR] Extra data:', extraData);
            
            const salaId = extraData.salaId;
            
            if (!salaId) {
                console.error('[RECHAZAR] ❌ No hay salaId en duelo_aceptado');
                await conn.rollback();
                conn.release();
                return res.status(400).json({
                    success: false,
                    message: 'Datos de duelo incompletos'
                });
            }

            // 1️⃣ Eliminar el duelo de la BD
            console.log('[RECHAZAR] Eliminando duelo:', salaId);
            
            await conn.query(`DELETE FROM duelos_preguntas WHERE id_duelo = ?`, [salaId]);
            await conn.query(`DELETE FROM duelos_respuestas WHERE id_duelo = ?`, [salaId]);
            
            // Obtener info del duelo antes de eliminarlo
            const [dueloInfo] = await conn.query(
                `SELECT id_retador, id_defensor FROM duelos WHERE id_duelo = ?`,
                [salaId]
            );
            
            await conn.query(`DELETE FROM duelos WHERE id_duelo = ?`, [salaId]);
            
            console.log('[RECHAZAR] ✅ Duelo eliminado de BD');

            // 2️⃣ Eliminar TODAS las notificaciones relacionadas al duelo
            await conn.query(
                `DELETE FROM notificaciones 
                 WHERE tipo = 'duelo_aceptado' 
                 AND extra_data LIKE ?`,
                [`%"salaId":"${salaId}"%`]
            );
            
            console.log('[RECHAZAR] ✅ Notificaciones duelo_aceptado eliminadas');

            // 3️⃣ Determinar quién es el oponente
            let idOponente = null;
            
            if (dueloInfo.length > 0) {
                const { id_retador, id_defensor } = dueloInfo[0];
                idOponente = (parseInt(userId) === parseInt(id_retador)) ? id_defensor : id_retador;
            } else {
                // Si no se encontró en BD, buscar en la notificación
                idOponente = notificacion.id_usuario_remitente;
            }

            console.log('[RECHAZAR] ID Oponente:', idOponente);

            // 4️⃣ Crear notificación de CANCELACIÓN para el oponente
            if (idOponente && idOponente !== userId) {
                const mensajeCancelacion = `🚫 ${username} canceló el duelo`;
                
                await conn.query(
                    `INSERT INTO notificaciones 
                    (id_usuario_destinatario, id_usuario_remitente, tipo, mensaje, extra_data) 
                    VALUES (?, ?, 'duelo_cancelado', ?, ?)`,
                    [
                        idOponente,
                        userId,
                        mensajeCancelacion,
                        JSON.stringify({ salaId, canceladoPor: username })
                    ]
                );

                console.log('[RECHAZAR] ✅ Notificación de cancelación enviada');

                // 5️⃣ Emitir evento socket para notificar en tiempo real
                const io = req.app.get('io') || global.io;
                if (io) {
                    const usuariosConectados = global.usuariosConectados || new Map();
                    const oponenteSocketId = usuariosConectados.get(parseInt(idOponente));
                    
                    if (oponenteSocketId) {
                        io.to(oponenteSocketId).emit('notificacion_recibida', {
                            tipo: 'duelo_cancelado',
                            mensaje: mensajeCancelacion
                        });
                        
                        io.to(oponenteSocketId).emit('duelo:cancelado', {
                            salaId,
                            mensaje: `${username} canceló el duelo`
                        });
                    }
                }
            }

            await conn.commit();
            conn.release();
            
            console.log('[RECHAZAR] ✅ DUELO CANCELADO EXITOSAMENTE');
            
            return res.json({ 
                success: true, 
                message: 'Duelo cancelado exitosamente' 
            });
        }

        // ════════════════════════════════════════════════════════
        // 🔹 OTROS TIPOS - Eliminar normalmente
        // ════════════════════════════════════════════════════════
        await conn.query(`DELETE FROM notificaciones WHERE id_notificacion = ?`, [idNotificacion]);
        
        console.log('[RECHAZAR] ✅ Notificación eliminada');

        await conn.commit();
        conn.release();
        
        res.json({ 
            success: true, 
            message: 'Rechazada' 
        });

    } catch (err) {
        await conn.rollback();
        conn.release();
        console.error('[RECHAZAR ERROR]:', err);
        res.status(500).json({ 
            success: false, 
            message: 'Error: ' + err.message
        });
    }
});

// ================================================================
// 📨 INVITAR A MINIJUEGO
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
            `INSERT INTO notificaciones 
             (id_usuario_destinatario, id_usuario_remitente, tipo, mensaje, extra_data) 
             VALUES (?, ?, 'invitacion', ?, ?)`,
            [
                idJugador,
                idRemitente,
                `${usernameRemitente} te invita a ${juego}`,
                extraData
            ]
        );
        
        console.log(`[INVITAR] ✅ Invitación enviada a usuario ${idJugador}`);
        
        res.json({ message: 'Invitación enviada ✅' });
    } catch (err) {
        console.error('[INVITAR ERROR]:', err);
        res.status(500).json({ message: 'Error del servidor' });
    }
});

module.exports = router;