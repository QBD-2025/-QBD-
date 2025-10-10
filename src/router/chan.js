// routes/invitacionesR.js - SISTEMA UNIFICADO
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
const pool = require('../db/conexion');

// ================================================================
// FUNCIONES AUXILIARES (de tu código anterior)
// ================================================================
function parseJsonSafe(jsonString) {
    if (!jsonString) {
        console.log('[PARSE]: JSON vacío o null');
        return null;
    }
    
    if (typeof jsonString !== 'string') {
        console.log('[PARSE]: Ya es objeto, devolviendo directamente');
        return jsonString;
    }
    
    const cleaned = jsonString
        .trim()
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
    
    try {
        const parsed = JSON.parse(cleaned);
        console.log('[PARSE]: ✅ JSON parseado correctamente');
        return parsed;
    } catch (error) {
        console.error('[PARSE ERROR]:', error.message);
        
        try {
            let repaired = cleaned;
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
    
    const sanitized = JSON.parse(JSON.stringify(extraData));
    
    if (sanitized.remitente && sanitized.remitente.foto_perfil) {
        let url = sanitized.remitente.foto_perfil;
        
        if (!url || url.trim() === '') {
            sanitized.remitente.foto_perfil = null;
            return sanitized;
        }
        
        if (url.includes('googleusercontent.com')) {
            const baseUrl = url.split('?')[0].split('=')[0];
            sanitized.remitente.foto_perfil = baseUrl + '=s96-c';
        } else if (url.length > 200) {
            sanitized.remitente.foto_perfil = url.substring(0, 200);
        }
        
        if (sanitized.remitente.foto_perfil) {
            sanitized.remitente.foto_perfil = sanitized.remitente.foto_perfil
                .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
                .replace(/\\/g, '/')
                .trim();
        }
    }
    
    return sanitized;
}

// ================================================================
// OBTENER NOTIFICACIONES
// ================================================================
router.get('/notificaciones', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'No autorizado' });
    }

    try {
        const [notificaciones] = await pool.query(
            `SELECT id_notificacion, id_usuario_remitente, tipo, mensaje, extra_data, fecha_creacion 
             FROM notificaciones 
             WHERE id_usuario_destinatario = ? 
             ORDER BY fecha_creacion DESC 
             LIMIT 20`,
            [req.session.user.id_usuario]
        );

        const notificacionesProcesadas = notificaciones.map(notif => {
            let extraDataParsed = parseJsonSafe(notif.extra_data);
            
            return {
                id_notificacion: notif.id_notificacion,
                id_usuario_remitente: notif.id_usuario_remitente,
                tipo: notif.tipo,
                mensaje: notif.mensaje,
                extra_data: extraDataParsed,
                fecha_creacion: notif.fecha_creacion
            };
        });

        res.json(notificacionesProcesadas);
    } catch (error) {
        console.error('[NOTIF ERROR]:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// ================================================================
// CONTEO DE NOTIFICACIONES
// ================================================================
router.get('/notificaciones/count', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'No autorizado' });
    }

    try {
        const [[result]] = await pool.query(
            'SELECT COUNT(*) as count FROM notificaciones WHERE id_usuario_destinatario = ?',
            [req.session.user.id_usuario]
        );

        res.json({ count: result.count });
    } catch (error) {
        console.error('[COUNT ERROR]:', error);
        res.status(500).json({ error: 'Error al obtener conteo' });
    }
});

// ================================================================
// 📨 INVITAR A UNA SALA EXISTENTE (cooperativo/casual/minijuegos)
// ================================================================
router.post('/invitar/:idJugador', async (req, res) => {
    if (!req.session.user) return res.status(401).json({ message: 'No has iniciado sesión' });

    const { salaId, juego, modo } = req.body;
    const { idJugador } = req.params;
    const { id_usuario: idRemitente, username: usernameRemitente } = req.session.user;

    if (!salaId || !juego) {
        return res.status(400).json({ message: 'Error: Faltan datos en la invitación (salaId o juego).' });
    }

    try {
        const extraData = JSON.stringify({ 
            salaId, 
            juego,
            modo: modo || 'cooperativo' // Por defecto cooperativo si no se especifica
        });
        
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
// ⚔️ ENVIAR DESAFÍO DE DUELO BD (TU CÓDIGO ADAPTADO)
// ================================================================
router.post('/desafio/duelo/:idOponente', async (req, res) => {
    console.log('[DESAFÍO BD INICIO]: Recibida petición');
    console.log('[DESAFÍO BD]: idOponente:', req.params.idOponente);
    console.log('[DESAFÍO BD]: body:', req.body);

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
            return res.status(500).json({ 
                message: 'Error del servidor al crear el desafío' 
            });
        }

        // Crear extra_data con información mínima
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
            
            // Verificar que el JSON sea válido parseándolo de nuevo
            const testParse = JSON.parse(extraDataString);
            console.log(`[DESAFÍO BD]: JSON válido confirmado. salaId: ${testParse.salaId}`);
            
        } catch (jsonError) {
            console.error('[DESAFÍO BD ERROR JSON]:', jsonError);
            
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
        
        // Validar que el string no sea demasiado largo para MySQL
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
// ✅ ACEPTAR NOTIFICACIÓN - SISTEMA UNIFICADO
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
        
        const notificacion = notificaciones[0];
        console.log(`[ACEPTAR]: Usuario ${userId} acepta notificación ${idNotificacion}`);
        console.log(`[ACEPTAR]: Tipo: ${notificacion.tipo}`);

        // Parsear extra_data con manejo de errores robusto
        let extraData = null;
        try {
            extraData = parseJsonSafe(notificacion.extra_data);
            console.log(`[ACEPTAR]: extra_data parseado exitosamente`);
            console.log(`[ACEPTAR]: salaId extraído:`, extraData?.salaId);
        } catch (parseError) {
            console.error(`[ACEPTAR ERROR PARSE]:`, parseError);
        }
        
        // Eliminar notificación procesada
        await pool.query("DELETE FROM notificaciones WHERE id_notificacion = ?", [idNotificacion]);
        
        // ================================================================
        // PROCESAR DESAFÍO DE DUELO BD (TU CÓDIGO)
        // ================================================================
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
            
            // ✅ DEVOLVER ÉXITO CON SALA ID - EL SOCKET MANEJARÁ EL RESTO
            return res.json({ 
                success: true, 
                tipo: 'desafio_duelo',
                message: 'Desafío aceptado!',
                salaId: salaId
            });
        }
        // ================================================================
        // PROCESAR INVITACIÓN DE MINIJUEGO (CÓDIGO ACTUAL)
        // ================================================================
        else if (notificacion.tipo === 'invitacion') {
            const salaId = extraData.salaId || `sala_${uuidv4()}`;
            
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
                redirigir: urlRedirigir,
                message: '¡Invitación aceptada!',
                extra_data: extraData
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
// 🚫 RECHAZAR NOTIFICACIÓN
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
// UTILIDAD: LIMPIAR NOTIFICACIONES CORRUPTAS (ADMIN)
// ================================================================
router.post('/notificaciones/limpiar-corruptas', async (req, res) => {
    if (!req.session.user || req.session.user.id_tp_usuario < 3) {
        return res.status(403).json({ success: false, message: 'No autorizado' });
    }

    try {
        const [notificaciones] = await pool.query('SELECT id_notificacion, extra_data FROM notificaciones');
        
        let corruptas = 0;
        for (const notif of notificaciones) {
            if (notif.extra_data) {
                try {
                    JSON.parse(notif.extra_data);
                } catch (error) {
                    await pool.query('DELETE FROM notificaciones WHERE id_notificacion = ?', [notif.id_notificacion]);
                    corruptas++;
                }
            }
        }

        res.json({ success: true, message: `${corruptas} notificaciones corruptas eliminadas` });
    } catch (error) {
        console.error('[LIMPIAR ERROR]:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
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

// ================================================================
// NOTAS DE INTEGRACIÓN
// ================================================================
/*
PUNTOS CLAVE DE LA UNIFICACIÓN:

1. **Rutas Mantenidas:**
   - POST /desafio/duelo/:idOponente → Crea sala pendiente + notificación BD
   - POST /invitar/:idJugador → Para minijuegos (cooperativo/enfrentamiento)
   - POST /aceptar/:idNotificacion → Maneja AMBOS tipos
   - POST /rechazar/:idNotificacion → Limpia salas si es desafío BD

2. **Tipos de Notificación:**
   - 'desafio_duelo' → Duelo de Ascenso (tu modo)
   - 'invitacion' → Minijuegos (modo de tus compañeros)

3. **Flujo Desafío BD:**
   Cliente → POST /desafio/duelo/:id 
   → Crea sala pendiente (global.crearSalaPendiente)
   → Guarda en BD con salaId
   → Retado acepta → Cliente emite duelo:aceptarDesafioBD
   → Socket maneja unión → Ambos redirigen a /competitivo/sala/:salaId

4. **Diferencias con Lobby:**
   - Lobby: Invitación en memoria, expira rápido, modal directo
   - BD: Persiste en base de datos, expira en 3 min (sala), panel de notificaciones

5. **Dependencias del Socket (server.js):**
   - global.crearSalaPendiente(retador, retado, io) → Debe existir
   - global.salasPendientes → Map con salas pendientes
   - global.usuariosConectados → Map de userId → socketId
   - Listener: 'duelo:aceptarDesafioBD' → Une usuarios a sala

6. **Ruta en Express (app.js o similar):**
   app.use('/competitivo/invitaciones', invitacionesRouter);
   // O la ruta que uses actualmente
*/