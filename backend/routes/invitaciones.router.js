// router/invitaciones.router.js - ✅✅✅ VERSIÓN UNIFICADA FINAL
// =============================================
// Sistema completo de invitaciones con:
// - Duelos rápidos BD con detección automática de modo
// - Duelos de 48h (carrera/general)
// - Integración con sistema de rangos
// - Notificaciones optimizadas
// =============================================

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
const pool = require('../db/conexion');

// ================================================================
// 🔍 FUNCIÓN: DETECTAR MODO AUTOMÁTICAMENTE
// ================================================================
/**
 * Detecta si dos jugadores comparten una carrera
 * @param {number} idJugador1 - ID del primer jugador
 * @param {number} idJugador2 - ID del segundo jugador
 * @param {object} poolConnection - Pool de conexiones MySQL
 * @returns {Promise<{modo: string, idCarrera: number|null}>}
 */
async function detectarModoJugadores(idJugador1, idJugador2, poolConnection) {
    try {
        console.log(`[DETECTAR MODO]: 🔍 Verificando carreras compartidas`);
        console.log(`[DETECTAR MODO]:   Jugador 1: ${idJugador1}`);
        console.log(`[DETECTAR MODO]:   Jugador 2: ${idJugador2}`);
        
        // Buscar carreras compartidas entre ambos jugadores
        const [carrerasCompartidas] = await poolConnection.query(`
            SELECT DISTINCT uc1.id_carrera, c.descripcion
            FROM usuario_carrera uc1
            INNER JOIN usuario_carrera uc2 ON uc1.id_carrera = uc2.id_carrera
            INNER JOIN carrera c ON uc1.id_carrera = c.id_carrera
            WHERE uc1.id_usuario = ? 
            AND uc2.id_usuario = ?
            LIMIT 1
        `, [idJugador1, idJugador2]);
        
        if (carrerasCompartidas.length > 0) {
            const carreraCompartida = carrerasCompartidas[0];
            console.log(`[DETECTAR MODO]: ✅ Carrera compartida encontrada: ${carreraCompartida.descripcion}`);
            return {
                modo: 'carrera',
                idCarrera: carreraCompartida.id_carrera,
                nombreCarrera: carreraCompartida.descripcion
            };
        }
        
        console.log(`[DETECTAR MODO]: ℹ️ Sin carreras compartidas → Modo GENERAL`);
        return {
            modo: 'general',
            idCarrera: null,
            nombreCarrera: null
        };
        
    } catch (error) {
        console.error('[DETECTAR MODO ERROR]:', error);
        // En caso de error, usar modo general como fallback
        return {
            modo: 'general',
            idCarrera: null,
            nombreCarrera: null
        };
    }
}

// ================================================================
// ⚔️ CREAR DESAFÍO RÁPIDO BD (CON DETECCIÓN AUTOMÁTICA DE MODO)
// ================================================================
router.post('/desafio/duelo/:idOponente', async (req, res) => {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('[DESAFÍO BD]: 🚀 INICIO');
    
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: 'No autenticado' });
    }

    const { idOponente } = req.params;
    const idRemitente = req.session.user.id_usuario;
    const usernameRemitente = req.session.user.username;
    const fotoRemitente = req.session.user.foto_perfil || '/uploads/default_avatar.png';

    console.log(`[DESAFÍO BD]: 👤 Remitente: ${idRemitente} (${usernameRemitente})`);
    console.log(`[DESAFÍO BD]: 🎯 Destinatario: ${idOponente}`);

    if (parseInt(idOponente) === idRemitente) {
        return res.status(400).json({ 
            success: false, 
            message: 'No puedes desafiarte a ti mismo' 
        });
    }

    try {
        // ════════════════════════════════════════════════════════════
        // 1️⃣ Verificar que el oponente existe
        // ════════════════════════════════════════════════════════════
        
        const [oponenteData] = await pool.query(
            'SELECT id_usuario, username FROM usuario WHERE id_usuario = ?', 
            [idOponente]
        );

        if (oponenteData.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Usuario no encontrado' 
            });
        }

        console.log(`[DESAFÍO BD]: ✅ Oponente: ${oponenteData[0].username}`);

        // ════════════════════════════════════════════════════════════
        // 2️⃣ ✅ DETECTAR MODO AUTOMÁTICAMENTE
        // ════════════════════════════════════════════════════════════
        
        const { modo, idCarrera, nombreCarrera } = await detectarModoJugadores(
            idRemitente, 
            idOponente, 
            pool
        );
        
        console.log(`[DESAFÍO BD]: ✅ Modo detectado: ${modo}`);
        if (modo === 'carrera') {
            console.log(`[DESAFÍO BD]: 📚 Carrera: ${nombreCarrera} (ID: ${idCarrera})`);
        }

        // ════════════════════════════════════════════════════════════
        // 3️⃣ Verificar cooldown (5 minutos)
        // ════════════════════════════════════════════════════════════
        
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

        // ════════════════════════════════════════════════════════════
        // 4️⃣ Obtener Socket.IO
        // ════════════════════════════════════════════════════════════
        
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

        // ════════════════════════════════════════════════════════════
        // 5️⃣ ✅ CREAR SALA CON MODO DETECTADO
        // ════════════════════════════════════════════════════════════
        
        console.log(`[DESAFÍO BD]: 🏗️ Creando sala en modo ${modo}...`);
        
        const salaId = global.crearSalaPendienteBD(
            idRemitente, 
            idOponente, 
            modo,        // ✅ MODO DETECTADO
            null,        // dificultad (null para BD)
            io
        );
        
        if (!salaId || typeof salaId !== 'string' || salaId.length < 10) {
            console.error('[DESAFÍO BD]: ❌ salaId INVÁLIDO');
            return res.status(500).json({ 
                success: false, 
                message: 'Error al crear sala'
            });
        }

        console.log(`[DESAFÍO BD]: ✅ Sala creada: ${salaId}`);

        // ✅ Actualizar sala con modo y carrera
        const salasPendientes = global.salasPendientes || new Map();
        const salasEspera = global.salasEspera || new Map();
        
        const sala = salasPendientes.get(salaId) || salasEspera.get(salaId);
        if (sala) {
            sala.modo = modo;
            sala.idCarrera = idCarrera;
            sala.nombreCarrera = nombreCarrera;
            salasPendientes.set(salaId, sala);
            salasEspera.set(salaId, sala);
            console.log('[DESAFÍO BD]: ✅ Sala actualizada con modo y carrera');
        }

        // ════════════════════════════════════════════════════════════
        // 6️⃣ Crear notificación con modo
        // ════════════════════════════════════════════════════════════
        
        const extraDataObj = {
            salaId: salaId,
            modo: modo,              // ✅ MODO DETECTADO
            dificultad: null,
            idCarrera: idCarrera,    // ✅ CARRERA DETECTADA
            nombreCarrera: nombreCarrera,
            idRemitente: idRemitente,
            usernameRemitente: usernameRemitente,
            fotoRemitente: fotoRemitente
        };

        const extraDataString = JSON.stringify(extraDataObj);
        
        const modoTexto = modo === 'carrera' 
            ? `de carrera (${nombreCarrera})` 
            : 'general';
        
        const [insertResult] = await pool.query(
            `INSERT INTO notificaciones 
             (id_usuario_destinatario, id_usuario_remitente, tipo, mensaje, extra_data) 
             VALUES (?, ?, 'desafio_duelo_rapido', ?, ?)`,
            [
                parseInt(idOponente),
                parseInt(idRemitente),
                `⚔️ ${usernameRemitente} te desafía a un duelo ${modoTexto}!`,
                extraDataString
            ]
        );

        const idNotificacion = insertResult.insertId;

        console.log('[DESAFÍO BD]: ✅ Notificación creada');
        console.log('[DESAFÍO BD]: Extra data:', JSON.stringify(extraDataObj, null, 2));

        // ════════════════════════════════════════════════════════════
        // 7️⃣ Emitir evento socket
        // ════════════════════════════════════════════════════════════
        
        const usuariosConectados = global.usuariosConectados || new Map();
        const oponenteSocketId = usuariosConectados.get(parseInt(idOponente));
        
        if (oponenteSocketId) {
            io.to(oponenteSocketId).emit('notificacion_recibida', {
                tipo: 'desafio_duelo_rapido',
                mensaje: `⚔️ ${usernameRemitente} te desafía a un duelo ${modoTexto}!`,
                id_notificacion: idNotificacion,
                salaId: salaId,
                extra_data: extraDataObj
            });
            
            console.log('[DESAFÍO BD]: ✅ Socket emitido al oponente');
        }

        console.log('═══════════════════════════════════════════════════════════');
        console.log(`[DESAFÍO BD]: ✅ COMPLETADO - Modo: ${modo}`);
        console.log('═══════════════════════════════════════════════════════════');
        
        res.json({
            success: true,
            message: `✅ Desafío ${modoTexto} enviado a ${oponenteData[0].username}`,
            salaId: salaId,
            notificacionId: idNotificacion,
            modo: modo,
            idCarrera: idCarrera,
            nombreCarrera: nombreCarrera
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
// ✅ ACEPTAR NOTIFICACIÓN - MANTIENE MODO CORRECTO
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

        // 1️⃣ Obtener notificación
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

        let extraData = {};
        try {
            extraData = JSON.parse(notificacion.extra_data || '{}');
            console.log('[ACEPTAR]: Extra data:', extraData);
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
        // ⚔️ DUELO RÁPIDO BD - ✅✅✅ MANTIENE MODO
        // ════════════════════════════════════════════════════════
        if (notificacion.tipo === 'desafio_duelo_rapido') {
            console.log('[ACEPTAR]: ⚔️ PROCESANDO DUELO RÁPIDO BD');
            
            const salaId = extraData.salaId;
            const modoOriginal = extraData.modo;
            const idCarreraOriginal = extraData.idCarrera;
            const nombreCarreraOriginal = extraData.nombreCarrera;
            
            console.log(`[ACEPTAR]: Modo detectado en notificación: ${modoOriginal}`);
            if (modoOriginal === 'carrera') {
                console.log(`[ACEPTAR]: Carrera: ${nombreCarreraOriginal} (ID: ${idCarreraOriginal})`);
            }
            
            if (!salaId) {
                console.error('[ACEPTAR]: ❌ salaId FALTANTE');
                await conn.rollback();
                conn.release();
                return res.status(400).json({
                    success: false,
                    message: 'Sala no válida'
                });
            }

            const salasPendientes = global.salasPendientes || new Map();
            const salasEspera = global.salasEspera || new Map();
            
            let sala = salasPendientes.get(salaId) || salasEspera.get(salaId);
            
            // Búsqueda case-insensitive
            if (!sala) {
                for (const [key, value] of [...salasPendientes.entries(), ...salasEspera.entries()]) {
                    if (key.toLowerCase() === salaId.toLowerCase()) {
                        sala = value;
                        break;
                    }
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

            console.log('[ACEPTAR]: ✅ Sala encontrada');
            console.log('[ACEPTAR]: Modo en sala:', sala.modo);
            
            // ✅ VERIFICAR QUE EL MODO COINCIDA
            if (sala.modo !== modoOriginal) {
                console.warn(`[ACEPTAR]: ⚠️ Modo inconsistente - Sala: ${sala.modo}, Extra: ${modoOriginal}`);
                console.warn('[ACEPTAR]: Usando modo de la notificación como referencia');
                sala.modo = modoOriginal;
                sala.idCarrera = idCarreraOriginal;
                sala.nombreCarrera = nombreCarreraOriginal;
            }

            // Marcar como aceptada
            sala.estado = 'aceptada';
            sala.jugadoresAceptados = sala.jugadoresAceptados || new Set();
            sala.jugadoresAceptados.add(parseInt(sala.retador || sala.idRetador));
            sala.jugadoresAceptados.add(parseInt(userId));
            
            salasPendientes.set(salaId, sala);
            salasEspera.set(salaId, sala);

            console.log('[ACEPTAR]: ✅ Sala actualizada');
            console.log(`[ACEPTAR]: Modo final: ${sala.modo}`);
            if (sala.modo === 'carrera') {
                console.log(`[ACEPTAR]: Carrera final: ${sala.nombreCarrera} (ID: ${sala.idCarrera})`);
            }

            // Eliminar notificación
            await conn.query(`DELETE FROM notificaciones WHERE id_notificacion = ?`, [idNotificacion]);

            // Notificar al retador
            const io = req.app.get('io') || global.io;
            const idRetador = parseInt(extraData.idRemitente);
            
            if (io && idRetador) {
                const usuariosConectados = global.usuariosConectados || new Map();
                const retadorSocketId = usuariosConectados.get(idRetador);
                
                if (retadorSocketId) {
                    io.to(retadorSocketId).emit('duelo:desafioAceptado', {
                        mensaje: `${req.session.user.username} aceptó tu desafío`,
                        salaId: salaId
                    });
                    
                    io.to(retadorSocketId).emit('duelo:redirigirASala', {
                        salaId: salaId,
                        mensaje: '¡Desafío aceptado! Redirigiendo...'
                    });
                }
            }

            await conn.commit();
            conn.release();

            const urlRedireccion = `/competitivo/sala/${salaId}?origen=socket`;

            console.log('[ACEPTAR]: ✅ COMPLETADO');
            console.log('═══════════════════════════════════════════════════════════');

            return res.json({
                success: true,
                tipo: 'desafio_duelo_rapido',
                salaId: salaId,
                modo: sala.modo,
                idCarrera: sala.idCarrera,
                nombreCarrera: sala.nombreCarrera,
                message: '¡Desafío aceptado!',
                redirigir: urlRedireccion
            });
        }
        
        // ════════════════════════════════════════════════════════
        // 📚 DUELO 48H (CON SISTEMA DE RANGOS)
        // ════════════════════════════════════════════════════════
        if (notificacion.tipo === 'desafio_duelo') {
            console.log('[ACEPTAR]: 📚 PROCESANDO DUELO DE 48 HORAS');
            
            const idDuelo = extraData.id_duelo;
            
            if (!idDuelo) {
                console.error('[ACEPTAR]: ❌ No hay id_duelo en extra_data');
                await conn.rollback();
                conn.release();
                return res.status(400).json({
                    success: false,
                    message: 'Datos de duelo incompletos'
                });
            }
            
            console.log('[ACEPTAR]: 🔍 Buscando duelo existente:', idDuelo);
            
            // ✅ VERIFICAR que el duelo EXISTA en BD
            const [duelosExistentes] = await conn.query(
                `SELECT * FROM duelos WHERE id_duelo = ? AND estado = 'activo'`,
                [idDuelo]
            );
            
            if (duelosExistentes.length === 0) {
                console.error('[ACEPTAR]: ❌ DUELO NO EXISTE O YA FINALIZÓ');
                await conn.query(`DELETE FROM notificaciones WHERE id_notificacion = ?`, [idNotificacion]);
                await conn.commit();
                conn.release();
                return res.status(404).json({
                    success: false,
                    message: 'El duelo ya no está disponible'
                });
            }
            
            const duelo = duelosExistentes[0];
            console.log('[ACEPTAR]: ✅ DUELO ENCONTRADO EN BD');
            
            // ✅ VERIFICAR que el usuario actual sea el defensor
            if (parseInt(duelo.id_defensor) !== parseInt(userId)) {
                console.error('[ACEPTAR]: ❌ Usuario no es el defensor');
                await conn.rollback();
                conn.release();
                return res.status(403).json({
                    success: false,
                    message: 'No tienes permiso para aceptar este duelo'
                });
            }
            
            // ✅ Eliminar SOLO la notificación de desafío (NO el duelo)
            await conn.query(`DELETE FROM notificaciones WHERE id_notificacion = ?`, [idNotificacion]);
            console.log('[ACEPTAR]: ✅ Notificación de desafío eliminada');
            
            // ✅ Crear notificaciones de ACEPTACIÓN para ambos jugadores
            const notifData = JSON.stringify({ 
                salaId: duelo.id_duelo,
                tipo_duelo: duelo.id_carrera ? 'carrera' : 'general',
                apuesta: duelo.apuesta,
                dificultad: duelo.dificultad
            });

            await conn.query(
                `INSERT INTO notificaciones 
                (id_usuario_destinatario, id_usuario_remitente, tipo, mensaje, extra_data) 
                VALUES (?, ?, 'duelo_aceptado', ?, ?)`,
                [duelo.id_retador, userId, '✅ Tu desafío fue aceptado', notifData]
            );
            
            await conn.query(
                `INSERT INTO notificaciones 
                (id_usuario_destinatario, id_usuario_remitente, tipo, mensaje, extra_data) 
                VALUES (?, ?, 'duelo_aceptado', ?, ?)`,
                [userId, duelo.id_retador, '⚔️ Duelo activo', notifData]
            );

            await conn.commit();
            conn.release();

            console.log('[ACEPTAR]: ✅ DUELO ACEPTADO');
            console.log('═══════════════════════════════════════════════════════════');

            return res.json({
                success: true,
                tipo: 'desafio_duelo',
                salaId: duelo.id_duelo,
                message: '¡Desafío aceptado! Tienes 48h',
                mostrarEnlace: true,
                enlaceExamen: `/duelo/examen/${duelo.id_duelo}`,
                fechaLimite: duelo.fecha_limite
            });
        }

        // ════════════════════════════════════════════════════════
        // 🎮 INVITACIONES A MINIJUEGOS
        // ════════════════════════════════════════════════════════
        if (notificacion.tipo === 'invitacion') {
            console.log('[ACEPTAR]: 🎮 PROCESANDO INVITACIÓN A MINIJUEGO');
            
            const salaId = extraData.salaId || `sala_${uuidv4()}`;
            const juego = extraData.juego || 'gato';
            
            await conn.query(`DELETE FROM notificaciones WHERE id_notificacion = ?`, [idNotificacion]);

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
        // 🔹 OTROS TIPOS
        // ════════════════════════════════════════════════════════
        await conn.query(`DELETE FROM notificaciones WHERE id_notificacion = ?`, [idNotificacion]);
        await conn.commit();
        conn.release();

        res.json({ success: true, message: 'Notificación procesada' });

    } catch (err) {
        if (conn) {
            try { await conn.rollback(); } catch(e) {}
            conn.release();
        }
        
        console.error('[ACEPTAR ERROR]:', err);
        res.status(500).json({ 
            success: false, 
            message: 'Error: ' + err.message
        });
    }
});

// ================================================================
// 🚫 RECHAZAR NOTIFICACIÓN
// ================================================================
router.post('/rechazar/:idNotificacion', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: 'No autenticado' });
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
            return res.status(404).json({ success: false, message: 'No encontrada' });
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

        // 🚫 Si es DUELO ACEPTADO (tipo: duelo_aceptado) - CANCELAR DUELO
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

                // 5️⃣ Emitir evento socket
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
        
        res.json({ success: true, message: 'Rechazada' });

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

// ================================================================
// 🎯 EXPORTAR
// ================================================================
module.exports = router;
module.exports.detectarModoJugadores = detectarModoJugadores;