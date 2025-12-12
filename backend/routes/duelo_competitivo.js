// En: src/router/duelo_competitivoR.js(duelos rapidos)
const express = require('express');
const router = express.Router();
const pool = require('../db/conexion');

// --- RUTA PARA LA "SALA DE DUELOS" 1V1 ---
router.get('/matchmaking', async (req, res) => {
    try {
        const userId = req.session.user.id_usuario;
        
        const [userData] = await pool.query(
            `SELECT 
                u.puntos,
                COUNT(h.id_duelo) AS duelos_jugados,
                COALESCE(SUM(CASE WHEN h.id_ganador = u.id_usuario THEN 1 ELSE 0 END), 0) AS victorias,
                COALESCE(SUM(CASE WHEN h.id_ganador IS NOT NULL AND h.id_ganador != u.id_usuario THEN 1 ELSE 0 END), 0) AS derrotas
            FROM 
                usuario u
            LEFT JOIN 
                historial_duelos h ON u.id_usuario = h.id_retador OR u.id_usuario = h.id_defensor
            WHERE 
                u.id_usuario = ?
            GROUP BY
                u.id_usuario, u.puntos`,
            [userId]
        );

        // El resultado estará en userData[0]
        // Calcular ranking (posición en el ranking global)
        const [rankingData] = await pool.query(
            `SELECT COUNT(*) + 1 as rank
             FROM usuario 
             WHERE puntos > (SELECT puntos FROM usuario WHERE id_usuario = ?)`,
            [userId]
        );

        // Calcular progreso hacia el siguiente rango (ejemplo simple)
        const currentPoints = userData[0]?.puntos || 0;
        const nextRankPoints = Math.ceil((currentPoints + 100) / 100) * 100;
        const progressPercent = ((currentPoints % 100) / 100) * 100;

        const stats = {
            ...userData[0],
            rank: rankingData[0]?.rank || 1,
            progress_percent: progressPercent,
            points_needed: nextRankPoints - currentPoints
        };
        
        res.render('matchmaking', {
            layout: 'main',
            user: req.session.user,
            stats: stats
        });

    } catch (error) {
        console.error("Error al cargar la sala de duelos:", error);
        res.redirect('/menu_principal');
    }
});

// --- RUTAS API (RANKINGS, DESAFÍOS, ETC.) ---

router.get('/api/ranking/global/com', async (req, res) => {
    try {
        const [jugadores] = await pool.query(`
            SELECT u.id_usuario, u.username, u.foto_perfil, u.puntos
            FROM usuario u 
            WHERE u.id_usuario != ?
            ORDER BY u.puntos DESC LIMIT 100;
        `, [req.session.user?.id_usuario || 0]);
        res.json(jugadores);
    } catch (error) {
        console.error('Error al obtener ranking global:', error);
        res.status(500).json({ error: 'Error al obtener el ranking global' });
    }
});

router.get('/com/api/usuario/carreras', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'No autorizado' });
    }

    try {
        const userId = req.session.user.id_usuario;
        
        const [carreras] = await pool.query(`
            SELECT DISTINCT c.id_carrera, c.descripcion 
            FROM carrera c
            INNER JOIN usuario_carrera uc ON c.id_carrera = uc.id_carrera
            WHERE uc.id_usuario = ?
            ORDER BY c.descripcion ASC
        `, [userId]);
        
        console.log(`[CARRERAS]: ${carreras.length} carreras encontradas para usuario ${userId}`);
        
        res.json(carreras);
        
    } catch (error) {
        console.error('[CARRERAS ERROR]:', error);
        res.status(500).json({ error: 'Error al obtener carreras' });
    }
});

// ✅ ENDPOINT: Ranking por carrera específica
router.get('/com/api/ranking/carrera/:idCarrera', async (req, res) => {
    const { idCarrera } = req.params;
    
    if (!idCarrera) {
        return res.status(400).json({ error: 'ID de carrera requerido' });
    }
    
    try {
        console.log(`[RANKING CARRERA]: Consultando carrera ${idCarrera}`);
        
        const [jugadores] = await pool.query(`
            SELECT 
                u.id_usuario, 
                u.username, 
                COALESCE(u.foto_perfil, '/uploads/default_avatar.png') as foto_perfil,
                COALESCE(upc.puntos, 0) as puntos,
                uc.id_carrera
            FROM usuario u
            INNER JOIN usuario_carrera uc ON u.id_usuario = uc.id_usuario
            LEFT JOIN usuario_puntos_carrera upc ON u.id_usuario = upc.id_usuario AND upc.id_carrera = uc.id_carrera
            WHERE uc.id_carrera = ?
            ORDER BY COALESCE(upc.puntos, 0) DESC
            LIMIT 100
        `, [idCarrera]);
        
        console.log(`[RANKING CARRERA]: ${jugadores.length} jugadores encontrados para carrera ${idCarrera}`);
        
        res.json(jugadores);
        
    } catch (error) {
        console.error('[RANKING CARRERA ERROR]:', error);
        res.status(500).json({ error: 'Error al obtener ranking de carrera' });
    }
});


// ✅ NUEVA RUTA PARA PROCESAR ACEPTACIÓN DE DESAFÍO DESDE NOTIFICACIONES
router.post('/api/desafio/procesar/:idNotificacion', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: 'Debes iniciar sesión' });
    }

    const { idNotificacion } = req.params;
    const { accion } = req.body; // 'aceptar' o 'rechazar'
    const userId = req.session.user.id_usuario;

    try {
        // Obtener la notificación
        const [notificaciones] = await pool.query(
            `SELECT * FROM notificaciones WHERE id_notificacion = ? AND id_usuario_destinatario = ?`,
            [idNotificacion, userId]
        );

        if (notificaciones.length === 0) {
            return res.status(404).json({ success: false, message: 'Notificación no encontrada' });
        }

        const notificacion = notificaciones[0];
        
        if (notificacion.tipo !== 'desafio_duelo') {
            return res.status(400).json({ success: false, message: 'Tipo de notificación inválida' });
        }

        // Eliminar la notificación procesada
        await pool.query("DELETE FROM notificaciones WHERE id_notificacion = ?", [idNotificacion]);

        if (accion === 'aceptar') {
            // Si acepta, redirigir al usuario al portal de duelos con un parámetro especial
            res.json({ 
                success: true, 
                redirect: `/competitivo/matchmaking?desafio=${notificacion.id_usuario_remitente}`,
                message: 'Desafío aceptado. Redirigiendo...' 
            });
        } else {
            // Si rechaza, simplemente confirmar
            res.json({ 
                success: true, 
                message: 'Desafío rechazado' 
            });
        }

    } catch (err) {
        console.error('Error procesando desafío:', err);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

// ✅ RUTA PARA OBTENER ESTADÍSTICAS DE USUARIO ESPECÍFICO
router.get('/api/usuario/:idUsuario/stats', async (req, res) => {
    try {
        const { idUsuario } = req.params;
        
        const [stats] = await pool.query(`
            SELECT 
                u.username,
                u.foto_perfil,
                u.puntos,
                COUNT(h.id_duelo) as duelos_jugados,
                SUM(CASE WHEN h.id_ganador = u.id_usuario THEN 1 ELSE 0 END) as victorias,
                SUM(CASE WHEN h.id_ganador != u.id_usuario AND h.id_ganador IS NOT NULL THEN 1 ELSE 0 END) as derrotas
            FROM usuario u
            LEFT JOIN historial_duelos h ON (h.id_retador = u.id_usuario OR h.id_defensor = u.id_usuario)
            WHERE u.id_usuario = ?
            GROUP BY u.id_usuario`, 
            [idUsuario]
        );

        if (stats.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.json(stats[0]);
    } catch (error) {
        console.error('Error al obtener stats del usuario:', error);
        res.status(500).json({ error: 'Error al obtener estadísticas del usuario' });
    }
});

// ✅ RUTA PARA BUSCAR USUARIOS PARA DESAFÍO
router.get('/api/buscar/usuarios', async (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'No autorizado' });
    
    try {
        const { q } = req.query; // Query de búsqueda
        let query = `
            SELECT u.id_usuario, u.username, u.foto_perfil, u.puntos
            FROM usuario u
            WHERE u.id_usuario != ?
        `;
        let params = [req.session.user.id_usuario];

        if (q && q.trim()) {
            query += ` AND u.username LIKE ?`;
            params.push(`%${q.trim()}%`);
        }

        query += ` ORDER BY u.puntos DESC LIMIT 20`;

        const [usuarios] = await pool.query(query, params);
        res.json(usuarios);
    } catch (error) {
        console.error('Error buscando usuarios:', error);
        res.status(500).json({ error: 'Error al buscar usuarios' });
    }
});

// ✅ RUTA PARA HISTORIAL DE DUELOS
router.get('/api/usuario/historial', async (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'No autorizado' });
    
    try {
        const [historial] = await pool.query(`
            SELECT 
                h.*,
                u1.username as retador_username,
                u1.foto_perfil as retador_foto,
                u2.username as defensor_username,  
                u2.foto_perfil as defensor_foto,
                ug.username as ganador_username,
                c.descripcion as carrera_nombre
            FROM historial_duelos h
            LEFT JOIN usuario u1 ON h.id_retador = u1.id_usuario
            LEFT JOIN usuario u2 ON h.id_defensor = u2.id_usuario  
            LEFT JOIN usuario ug ON h.id_ganador = ug.id_usuario
            LEFT JOIN carrera c ON h.id_carrera = c.id_carrera
            WHERE h.id_retador = ? OR h.id_defensor = ?
            ORDER BY h.fecha_duelo DESC
            LIMIT 50
        `, [req.session.user.id_usuario, req.session.user.id_usuario]);
        
        res.json(historial);
    } catch (error) {
        console.error('Error al obtener historial:', error);
        res.status(500).json({ error: 'Error al obtener historial de duelos' });
    }
});

// ✅ MIDDLEWARE DE ERROR HANDLING
router.use((err, req, res, next) => {
    console.error('Error en rutas competitivas:', err);
    res.status(500).json({ 
        error: 'Error interno del servidor',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Error interno'
    });
});
// ✅ MIDDLEWARE: Validar que la sala exista antes de renderizar
// ================================================================
// AGREGAR/REEMPLAZAR EN duelo_competitivoR.js
// DESPUÉS DE LA RUTA '/competitivo/sala/:salaId'
// ================================================================

// ✅ RUTA MEJORADA: Sala de Duelo con manejo unificado
router.get('/competitivo/sala/:salaId', async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/');
    }

    try {
        const { salaId } = req.params;
        const userId = req.session.user.id_usuario;
        
        console.log(`[ROUTER SALA]: 📥 Usuario ${userId} accediendo a sala ${salaId}`);
        console.log(`[ROUTER SALA]: 🔍 Origen: ${req.query.origen || 'directo'}`);
        
        // ✅ Validar formato UUID
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(salaId)) {
            console.log(`[ROUTER SALA]: ❌ UUID inválido: ${salaId}`);
            req.session.errorMsg = 'ID de sala inválido.';
            return res.redirect('/matchmaking');
        }

        // ✅ ESPERAR para que el socket cree/prepare la sala
        // CRÍTICO para invitaciones BD donde la sala puede crearse milisegundos antes
        console.log(`[ROUTER SALA]: ⏳ Esperando sincronización inicial (1500ms)...`);
        await new Promise(resolve => setTimeout(resolve, 1500));

        // ✅ Buscar sala con retry logic
        const salasPendientes = global.salasPendientes || new Map();
        const salasEspera = global.salasEspera || new Map();
        
        let sala = null;
        let salaKey = null;
        let intentos = 0;
        const maxIntentos = 8; // 8 intentos * 400ms = 3.2 segundos total
        
        while (!sala && intentos < maxIntentos) {
            intentos++;
            
            // Buscar en ambos maps (case-insensitive)
            for (const [key, value] of [...salasPendientes.entries(), ...salasEspera.entries()]) {
                if (key.toLowerCase() === salaId.toLowerCase()) {
                    sala = value;
                    salaKey = key;
                    break;
                }
            }
            
            if (!sala && intentos < maxIntentos) {
                console.log(`[ROUTER SALA]: ⏳ Buscando... (${intentos}/${maxIntentos})`);
                await new Promise(resolve => setTimeout(resolve, 400));
            }
        }
        
        // ✅ Cargar stats del usuario (SIEMPRE, incluso si la sala no existe)
        const [userData] = await pool.query(
            `SELECT 
                u.puntos,
                COUNT(h.id_duelo) AS duelos_jugados,
                COALESCE(SUM(CASE WHEN h.id_ganador = u.id_usuario THEN 1 ELSE 0 END), 0) AS victorias,
                COALESCE(SUM(CASE WHEN h.id_ganador IS NOT NULL AND h.id_ganador != u.id_usuario THEN 1 ELSE 0 END), 0) AS derrotas
            FROM usuario u
            LEFT JOIN historial_duelos h ON u.id_usuario = h.id_retador OR u.id_usuario = h.id_defensor
            WHERE u.id_usuario = ?
            GROUP BY u.id_usuario, u.puntos`,
            [userId]
        );

        const [rankingData] = await pool.query(
            `SELECT COUNT(*) + 1 as rank
             FROM usuario 
             WHERE puntos > (SELECT puntos FROM usuario WHERE id_usuario = ?)`,
            [userId]
        );

        const currentPoints = userData[0]?.puntos || 0;
        const nextRankPoints = Math.ceil((currentPoints + 100) / 100) * 100;
        const progressPercent = ((currentPoints % 100) / 100) * 100;

        const stats = {
            ...userData[0],
            rank: rankingData[0]?.rank || 1,
            progress_percent: progressPercent,
            points_needed: nextRankPoints - currentPoints,
            racha: 0
        };
        
        // ✅ SI NO SE ENCUENTRA LA SALA DESPUÉS DE REINTENTOS
        if (!sala) {
            console.log(`[ROUTER SALA]: ⚠️ Sala ${salaId} no encontrada después de ${intentos} intentos`);
            console.log(`[ROUTER SALA]: 📊 Estado global:`);
            console.log(`  - Salas pendientes: ${salasPendientes.size}`);
            console.log(`  - Salas espera: ${salasEspera.size}`);
            
            // Listar todas las salas disponibles para debug
            if (salasPendientes.size > 0) {
                console.log(`[ROUTER SALA]: 📋 Salas disponibles:`);
                for (const [key, value] of salasPendientes.entries()) {
                    console.log(`  - ${key}: ${value.estado} (${value.tipo})`);
                }
            }
            
            // ✅ Renderizar en modo "esperando conexión"
            // El frontend intentará conectarse vía socket
            console.log(`[ROUTER SALA]: 🔄 Renderizando en modo esperando conexión`);
            
            return res.render('matchmaking', {
                layout: 'main',
                user: req.session.user,
                stats: stats,
                salaId: salaId,
                enSala: true,
                esperandoConexion: true,
                intentosRealizados: intentos,
                modoDebug: process.env.NODE_ENV === 'development'
            });
        }

        console.log(`[ROUTER SALA]: ✅ Sala ${salaId} encontrada (intento ${intentos})`);

        // ✅ Verificar pertenencia del usuario
        const retadorId = parseInt(sala.retador || sala.idRetador);
        const retadoId = parseInt(sala.retado || sala.idRetado);
        const userIdInt = parseInt(userId);
        
        console.log(`[ROUTER SALA]: 🔍 Verificando autorización`);
        console.log(`  - Retador: ${retadorId}`);
        console.log(`  - Retado: ${retadoId}`);
        console.log(`  - Usuario actual: ${userIdInt}`);
        
        if (userIdInt !== retadorId && userIdInt !== retadoId) {
            console.log(`[ROUTER SALA]: ❌ Usuario ${userId} NO autorizado`);
            req.session.errorMsg = 'No tienes acceso a esta sala.';
            return res.redirect('/matchmaking');
        }

        console.log(`[ROUTER SALA]: ✅ Usuario ${userId} AUTORIZADO`);
        console.log(`[ROUTER SALA]: 📊 Detalles de sala:`);
        console.log(`  - Estado: ${sala.estado}`);
        console.log(`  - Tipo: ${sala.tipo}`);
        console.log(`  - Modo: ${sala.modo || 'general'}`);
        console.log(`  - Dificultad: ${sala.dificultad || 'N/A'}`);
        console.log(`  - Jugadores conectados: ${sala.jugadoresConectados?.size || 0}/2`);
        console.log(`  - Jugadores aceptados: ${sala.jugadoresAceptados?.size || 0}/2`);
        
        // ✅ Determinar si venimos de una aceptación BD
        const esDesdeNotificacion = sala.tipo === 'notificacion_bd';
        
        console.log(`[ROUTER SALA]: 🎯 Origen: ${esDesdeNotificacion ? 'NOTIFICACIÓN BD' : 'LOBBY/MATCHMAKING'}`);
        console.log(`[ROUTER SALA]: ✅ Renderizando vista para usuario ${userId}`);
        
        res.render('matchmaking', {
            layout: 'main',
            user: req.session.user,
            stats: stats,
            salaId: salaId,
            enSala: true,
            modo: sala.modo || 'general',
            dificultad: sala.dificultad || null,
            tipoSala: sala.tipo || 'desconocido',
            esperandoConexion: false,
            esDesdeNotificacion: esDesdeNotificacion,
            estadoSala: sala.estado,
            modoDebug: process.env.NODE_ENV === 'development'
        });

    } catch (error) {
        console.error("[ROUTER SALA ERROR]:", error);
        console.error("  - Stack:", error.stack);
        req.session.errorMsg = 'Error al cargar la sala de duelo.';
        res.redirect('/matchmaking');
    }
});

// ================================================================
// ✅ ENDPOINT DEBUG: Estado de sala específica
// ================================================================

router.get('/api/sala/estado/:salaId', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'No autorizado' });
    }

    const { salaId } = req.params;

    try {
        const salasPendientes = global.salasPendientes || new Map();
        const salasEspera = global.salasEspera || new Map();
        
        let sala = salasPendientes.get(salaId) || salasEspera.get(salaId);
        
        // Buscar case-insensitive
        if (!sala) {
            for (const [key, value] of [...salasPendientes.entries(), ...salasEspera.entries()]) {
                if (key.toLowerCase() === salaId.toLowerCase()) {
                    sala = value;
                    break;
                }
            }
        }
        
        if (!sala) {
            return res.json({ 
                existe: false, 
                mensaje: 'Sala no encontrada o expirada',
                salasActivas: {
                    pendientes: salasPendientes.size,
                    espera: salasEspera.size
                }
            });
        }

        res.json({
            existe: true,
            estado: sala.estado,
            tipo: sala.tipo,
            modo: sala.modo,
            dificultad: sala.dificultad,
            jugadoresConectados: Array.from(sala.jugadoresConectados || []),
            totalConectados: sala.jugadoresConectados?.size || 0,
            jugadoresAceptados: Array.from(sala.jugadoresAceptados || []),
            totalAceptados: sala.jugadoresAceptados?.size || 0,
            dueloCreado: sala.dueloCreado,
            retador: sala.retador || sala.idRetador,
            retado: sala.retado || sala.idRetado,
            timestamp: sala.timestamp,
            tiempoTranscurrido: Date.now() - sala.timestamp
        });
        
    } catch (error) {
        console.error('[ESTADO SALA ERROR]:', error);
        res.status(500).json({ error: 'Error al consultar estado de sala' });
    }
});
// ================================================================
// ✅ ENDPOINT: Forzar limpieza de sala (solo desarrollo)
// ================================================================

if (process.env.NODE_ENV === 'development') {
    router.post('/api/sala/limpiar/:salaId', async (req, res) => {
        if (!req.session.user || req.session.user.id_tp_usuario < 3) {
            return res.status(403).json({ error: 'No autorizado' });
        }

        const { salaId } = req.params;

        try {
            const salasPendientes = global.salasPendientes || new Map();
            const salasEspera = global.salasEspera || new Map();
            
            const sala = salasPendientes.get(salaId) || salasEspera.get(salaId);
            
            if (sala?.timeoutId) {
                clearTimeout(sala.timeoutId);
            }
            
            salasPendientes.delete(salaId);
            salasEspera.delete(salaId);
            
            res.json({ 
                success: true, 
                mensaje: `Sala ${salaId} eliminada` 
            });
            
        } catch (error) {
            console.error('[LIMPIAR SALA ERROR]:', error);
            res.status(500).json({ error: 'Error al limpiar sala' });
        }
    });
}

module.exports = router;