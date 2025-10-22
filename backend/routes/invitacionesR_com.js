// routes/invitacionesR.js

const express = require('express');
const router = express.Router();
const pool = require('../db/conexion');

// ================================================================
// FUNCIONES AUXILIARES
// ================================================================
// En invitacionesR.js - REEMPLAZAR parseJsonSafe

function parseJsonSafe(jsonString) {
    if (!jsonString) {
        console.log('[PARSE]: JSON vacío o null');
        return null;
    }
    
    if (typeof jsonString !== 'string') {
        console.log('[PARSE]: Ya es objeto, devolviendo directamente');
        return jsonString;
    }
    
    // Limpiar string antes de parsear
    const cleaned = jsonString
        .trim()
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, ''); // Eliminar caracteres de control
    
    try {
        const parsed = JSON.parse(cleaned);
        console.log('[PARSE]: ✅ JSON parseado correctamente');
        return parsed;
    } catch (error) {
        console.error('[PARSE ERROR]:', error.message);
        console.error('[PARSE]: Posición del error:', error.message.match(/position (\d+)/)?.[1]);
        console.error('[PARSE]: String problemático (primeros 300 chars):', cleaned.substring(0, 300));
        console.error('[PARSE]: String problemático (últimos 100 chars):', cleaned.substring(cleaned.length - 100));
        
        // Intentar reparar JSON común
        try {
            // Intentar agregar comillas faltantes o cerrar llaves
            let repaired = cleaned;
            
            // Si termina abruptamente, intentar cerrar
            if (!repaired.endsWith('}')) {
                repaired += '}';
            }
            
            const parsed = JSON.parse(repaired);
            console.log('[PARSE]: ⚠️ JSON reparado y parseado');
            return parsed;
            
        } catch (repairError) {
            console.error('[PARSE]: No se pudo reparar el JSON');
            return null;
        }
    }
}

function sanitizeExtraData(extraData) {
    if (typeof extraData !== 'object' || extraData === null) {
        return extraData;
    }
    
    // Crear copia profunda para no modificar el original
    const sanitized = JSON.parse(JSON.stringify(extraData));
    
    if (sanitized.remitente && sanitized.remitente.foto_perfil) {
        let url = sanitized.remitente.foto_perfil;
        
        // Si es string vacío o null, usar null
        if (!url || url.trim() === '') {
            sanitized.remitente.foto_perfil = null;
            return sanitized;
        }
        
        // Limpiar URL de Google
        if (url.includes('googleusercontent.com')) {
            // Extraer solo hasta el primer parámetro y agregar tamaño pequeño
            const baseUrl = url.split('?')[0].split('=')[0];
            sanitized.remitente.foto_perfil = baseUrl + '=s96-c';
        } 
        // Para URLs muy largas, truncar y asegurar que sea válida
        else if (url.length > 200) {
            sanitized.remitente.foto_perfil = url.substring(0, 200);
        }
        
        // Eliminar caracteres problemáticos que pueden romper JSON
        if (sanitized.remitente.foto_perfil) {
            sanitized.remitente.foto_perfil = sanitized.remitente.foto_perfil
                .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Control characters
                .replace(/\\/g, '/') // Backslashes
                .trim();
        }
    }
    
    return sanitized;
}


// ================================================================
// ENVIAR DESAFÍO DE DUELO (CON SALA PENDIENTE)
// ================================================================

// En invitacionesR.js - línea ~140
router.post('/desafio/duelo/:idOponente', async (req, res) => {
    console.log('[DESAFÍO BD INICIO]: Recibida petición');
    console.log('[DESAFÍO BD]: idOponente:', req.params.idOponente);
    console.log('[DESAFÍO BD]: body:', req.body);
    console.log('[DESAFÍO BD]: session.user:', req.session.user?.id_usuario);

    if (!req.session.user) {
        console.error('[DESAFÍO BD ERROR]: Sin sesión');
        return res.status(401).json({ message: 'No has iniciado sesión' });
    }

    const { idOponente } = req.params;
    const { modo = 'general', dificultad = null } = req.body;
    const { id_usuario: idRemitente, username: usernameRemitente } = req.session.user;

    console.log(`[DESAFÍO BD]: ${idRemitente} (${usernameRemitente}) → ${idOponente}`);

    if (parseInt(idOponente) === idRemitente) {
        console.error('[DESAFÍO BD ERROR]: Auto-desafío detectado');
        return res.status(400).json({ message: 'No puedes desafiarte a ti mismo' });
    }

    try {
        // Verificar que el oponente existe
        const [oponenteData] = await pool.query(
            'SELECT id_usuario, username FROM usuario WHERE id_usuario = ?',
            [idOponente]
        );

        if (oponenteData.length === 0) {
            console.error('[DESAFÍO BD ERROR]: Oponente no encontrado');
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        console.log(`[DESAFÍO BD]: Oponente encontrado: ${oponenteData[0].username}`);

        // Verificar cooldown de 5 minutos
        const [desafioExistente] = await pool.query(
            `SELECT id_notificacion FROM notificaciones 
             WHERE id_usuario_destinatario = ? 
             AND id_usuario_remitente = ? 
             AND tipo = 'desafio_duelo' 
             AND fecha_creacion > DATE_SUB(NOW(), INTERVAL 5 MINUTE)`,
            [idOponente, idRemitente]
        );

        if (desafioExistente.length > 0) {
            console.error('[DESAFÍO BD ERROR]: Cooldown activo');
            return res.status(409).json({ 
                message: 'Ya tienes un desafío pendiente. Espera 5 minutos.' 
            });
        }

        console.log('[DESAFÍO BD]: Cooldown OK, creando sala...');

        // ✅ CREAR SALA PENDIENTE
        let salaId = null;
        
        if (req.io && global.crearSalaPendiente) {
            salaId = global.crearSalaPendiente(idRemitente, idOponente, req.io);
            console.log(`[DESAFÍO BD]: ✅ Sala pendiente creada: ${salaId}`);
        } else {
            console.error('[DESAFÍO BD ERROR]: crearSalaPendiente no disponible');
            console.error('[DESAFÍO BD]: req.io existe?', !!req.io);
            console.error('[DESAFÍO BD]: global.crearSalaPendiente existe?', !!global.crearSalaPendiente);
            
            return res.status(500).json({ 
                message: 'Error del servidor al crear el desafío' 
            });
        }

        // Crear extra_data
        // Crear extra_data con información MÍNIMA necesaria
        const extraDataObj = { 
            tipo_desafio: 'duelo_ascenso',
            id_retador: idRemitente,
            username_retador: usernameRemitente,
            modo: modo,
            dificultad: dificultad,
            timestamp: Date.now(),
            salaId: salaId,
            remitente: {
                id_usuario: idRemitente,
                username: usernameRemitente,
                // ✅ SIMPLIFICADO: Si no hay foto, usar null directamente
                foto_perfil: req.session.user.foto_perfil || null
            }
        };

        // Sanitizar ANTES de convertir a string
        const sanitizedExtraData = sanitizeExtraData(extraDataObj);

        // Convertir a JSON con manejo de errores
        let extraDataString;
        try {
            extraDataString = JSON.stringify(sanitizedExtraData);
            console.log(`[DESAFÍO BD]: extra_data preparado (length: ${extraDataString.length})`);
            
            // ✅ CRÍTICO: Verificar que el JSON sea válido parseándolo de nuevo
            const testParse = JSON.parse(extraDataString);
            console.log(`[DESAFÍO BD]: JSON válido confirmado. salaId: ${testParse.salaId}`);
            
        } catch (jsonError) {
            console.error('[DESAFÍO BD ERROR JSON]:', jsonError);
            console.error('[DESAFÍO BD]: Objeto que causó el error:', sanitizedExtraData);
            
            // Fallback: crear un JSON mínimo sin foto de perfil
            extraDataString = JSON.stringify({
                tipo_desafio: 'duelo_ascenso',
                id_retador: idRemitente,
                username_retador: usernameRemitente,
                salaId: salaId,
                timestamp: Date.now()
            });
            
            console.log('[DESAFÍO BD]: Usando extra_data mínimo de fallback');
        }
        
        // ✅ VALIDAR que el string no sea demasiado largo para MySQL
        if (extraDataString.length > 5000) {
            console.error(`[DESAFÍO BD ERROR]: extra_data muy largo (${extraDataString.length} chars)`);
            return res.status(500).json({ 
                message: 'Error: Datos de perfil demasiado largos' 
            });
        }

        // Insertar en BD
        await pool.query(
            `INSERT INTO notificaciones (id_usuario_destinatario, id_usuario_remitente, tipo, mensaje, extra_data) 
            VALUES (?, ?, 'desafio_duelo', ?, ?)`,
            [idOponente, idRemitente, `${usernameRemitente} te desafía a un Duelo de Ascenso!`, extraDataString]
        );

        
        console.log(`[DESAFÍO BD]: ✅ Notificación guardada en BD para usuario ${idOponente}`);
        
        // Notificar por socket si está online
        if (req.io && global.usuariosConectados) {
            const oponenteSocketId = global.usuariosConectados.get(parseInt(idOponente));
            if (oponenteSocketId) {
                req.io.to(oponenteSocketId).emit('notificacion_recibida', {
                    tipo: 'desafio_duelo',
                    mensaje: `${usernameRemitente} te desafía a un Duelo de Ascenso!`,
                    id_remitente: idRemitente,
                    salaId: salaId,
                    extra_data: sanitizedExtraData
                });
                console.log(`[DESAFÍO BD]: ✅ Socket enviado a ${oponenteSocketId}`);
            } else {
                console.log(`[DESAFÍO BD]: Usuario ${idOponente} no conectado (solo BD)`);
            }
        }
        
        console.log(`[DESAFÍO BD]: ✅✅✅ TODO COMPLETADO - Sala: ${salaId}`);
        
        res.json({ 
            success: true,
            message: 'Desafío enviado correctamente.',
            salaId: salaId 
        });
        
    } catch (err) {
        console.error('[DESAFÍO BD ERROR FATAL]:', err);
        res.status(500).json({ message: 'Error del servidor: ' + err.message });
    }
});
// ================================================================
// ACEPTAR NOTIFICACIÓN
// ================================================================
router.post('/aceptar/:idNotificacion', async (req, res) => {
    if (!req.session.user) { 
        return res.status(401).json({ success: false, message: 'Debes iniciar sesión' }); 
    }
    
    const { idNotificacion } = req.params;
    const userId = req.session.user.id_usuario;
    
    try {
        const [notificaciones] = await pool.query(
            `SELECT * FROM notificaciones WHERE id_notificacion = ? AND id_usuario_destinatario = ?`,
            [idNotificacion, userId]
        );

        if (notificaciones.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Notificación no encontrada' 
            });
        }
        
        // En invitacionesR.js - dentro de POST /aceptar/:idNotificacion

        const notificacion = notificaciones[0];
        console.log(`[ACEPTAR]: Usuario ${userId} acepta notificación ${idNotificacion}`);
        console.log(`[ACEPTAR]: Tipo: ${notificacion.tipo}`);
        console.log(`[ACEPTAR]: extra_data raw (primeros 300 chars):`, 
            notificacion.extra_data ? notificacion.extra_data.substring(0, 300) : 'null');

        // Parsear extra_data con manejo de errores robusto
        let extraData = null;
        try {
            extraData = parseJsonSafe(notificacion.extra_data);
            console.log(`[ACEPTAR]: extra_data parseado exitosamente`);
            console.log(`[ACEPTAR]: salaId extraído:`, extraData?.salaId);
        } catch (parseError) {
            console.error(`[ACEPTAR ERROR PARSE]:`, parseError);
            console.error(`[ACEPTAR]: extra_data corrupto:`, notificacion.extra_data);
        }
        
        // Eliminar notificación procesada
        await pool.query("DELETE FROM notificaciones WHERE id_notificacion = ?", [idNotificacion]);
        
        // ================================================================
        // PROCESAR DESAFÍO DE DUELO
        // ================================================================
        // En la sección de desafio_duelo del /aceptar
        if (notificacion.tipo === 'desafio_duelo') {
            const salaId = extraData?.salaId;
            
            if (!salaId) {
                return res.status(400).json({
                    success: false,
                    message: 'Desafío inválido o expirado.'
                });
            }

            // Verificar que la sala sigue activa
            if (global.salasPendientes) {
                const sala = global.salasPendientes.get(salaId);
                
                if (!sala) {
                    return res.status(410).json({
                        success: false,
                        message: 'Este desafío expiró (3 minutos).'
                    });
                }
                
                if (sala.estado !== 'pendiente') {
                    return res.status(410).json({
                        success: false,
                        message: 'Este desafío ya fue procesado.'
                    });
                }
            }
            
            // ✅ SOLO DEVOLVER ÉXITO CON SALA ID - EL SOCKET MANEJARÁ EL RESTO
            res.json({ 
                success: true, 
                tipo: 'desafio_duelo',
                message: 'Desafío aceptado!',
                salaId: salaId
            });
        }
        // ================================================================
        // PROCESAR INVITACIÓN DE MINIJUEGO
        // ================================================================
        else if (notificacion.tipo === 'invitacion') {
            res.json({ 
                success: true, 
                tipo: 'invitacion',
                id_remitente: notificacion.id_usuario_remitente,
                extra_data: extraData,
                message: 'Invitación aceptada!' 
            });
        } 
        // ================================================================
        // OTROS TIPOS
        // ================================================================
        else {
            res.json({ 
                success: true, 
                tipo: notificacion.tipo,
                message: 'Notificación procesada' 
            });
        }

    } catch (err) {
        console.error('[ACEPTAR ERROR]:', err);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno al procesar' 
        });
    }
});

// ================================================================
// RECHAZAR NOTIFICACIÓN
// ================================================================
router.post('/rechazar/:idNotificacion', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: 'Debes iniciar sesión' });
    }

    const { idNotificacion } = req.params;
    const userId = req.session.user.id_usuario;

    try {
        const [notificaciones] = await pool.query(
            `SELECT * FROM notificaciones WHERE id_notificacion = ? AND id_usuario_destinatario = ?`,
            [idNotificacion, userId]
        );

        if (notificaciones.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Notificación no encontrada' 
            });
        }

        const notificacion = notificaciones[0];
        
        // Si es desafío de duelo, limpiar sala pendiente
        if (notificacion.tipo === 'desafio_duelo' && notificacion.extra_data) {
            try {
                const extraData = JSON.parse(notificacion.extra_data);
                if (extraData.salaId && global.salasPendientes) {
                    const sala = global.salasPendientes.get(extraData.salaId);
                    if (sala) {
                        clearTimeout(sala.timeoutId);
                        global.salasPendientes.delete(extraData.salaId);
                        console.log(`[RECHAZAR]: Sala ${extraData.salaId} eliminada`);
                    }
                }
            } catch (e) {
                console.error('[RECHAZAR ERROR parsing]:', e);
            }
        }

        await pool.query("DELETE FROM notificaciones WHERE id_notificacion = ?", [idNotificacion]);
        
        res.json({ success: true, message: 'Notificación rechazada' });
    } catch (err) {
        console.error('[RECHAZAR ERROR]:', err);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor' 
        });
    }
});

// ================================================================
// DEBUG: ESTADO DE SALAS PENDIENTES (DESARROLLO)
// ================================================================
router.get('/debug/salas-pendientes', (req, res) => {
    if (!req.session.user || req.session.user.id_tp_usuario < 3) {
        return res.status(403).json({ error: 'No autorizado' });
    }

    if (global.salasPendientes) {
        const salas = Array.from(global.salasPendientes.entries()).map(([id, sala]) => ({
            salaId: id,
            retador: sala.retador,
            retado: sala.retado,
            estado: sala.estado,
            timestamp: new Date(sala.timestamp).toISOString(),
            tiempoRestante: Math.max(0, 180 - Math.floor((Date.now() - sala.timestamp) / 1000))
        }));

        res.json({
            totalSalas: salas.length,
            salas: salas
        });
    } else {
        res.json({ error: 'Sistema de salas pendientes no inicializado' });
    }
});

module.exports = router;