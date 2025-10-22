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
// ✅ ENDPOINT: Verificar estado de sala (útil para debugging)
router.get('/api/sala/estado/:salaId', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'No autorizado' });
    }

    const { salaId } = req.params;

    try {
        // Buscar en maps globales
        const sala = global.salasPendientes.get(salaId) || global.salasEspera.get(salaId);
        
        if (!sala) {
            return res.json({ 
                existe: false, 
                mensaje: 'Sala no encontrada o expirada' 
            });
        }

        res.json({
            existe: true,
            estado: sala.estado,
            tipo: sala.tipo,
            jugadoresConectados: Array.from(sala.jugadoresConectados || []),
            dueloCreado: sala.dueloCreado,
            retador: sala.retador || sala.idRetador,
            retado: sala.retado || sala.idRetado
        });
        
    } catch (error) {
        console.error('[ESTADO SALA ERROR]:', error);
        res.status(500).json({ error: 'Error al consultar estado de sala' });
    }
});

// ✅ RUTA MEJORADA PARA DESAFÍOS DIRECTOS (LEGACY - mantener compatibilidad)
router.post('/desafiar_com/duelo/:idOponente', async (req, res) => {
    if (!req.session.user) return res.status(401).json({ message: 'No has iniciado sesión' });
    
    const { idOponente } = req.params;
    const { id_usuario: idRemitente, username: usernameRemitente } = req.session.user;

    try {
        await pool.query(
            `INSERT INTO notificaciones (id_usuario_destinatario, id_usuario_remitente, tipo, mensaje, extra_data) 
             VALUES (?, ?, 'desafio_duelo', ?, ?)`,
            [idOponente, idRemitente, `${usernameRemitente} te desafía a un Duelo de Ascenso!`, JSON.stringify({ remitente: req.session.user })]
        );
        
        // Notificar por socket si existe el servicio
        if (req.io) {
            req.io.to(idOponente.toString()).emit('notificacion_recibida', {
                tipo: 'desafio_duelo',
                mensaje: `${usernameRemitente} te desafía a un Duelo de Ascenso!`,
                id_remitente: idRemitente
            });
        }
        
        res.json({ message: '¡Desafío enviado!' });
    } catch (err) {
        console.error('Error enviando desafío:', err);
        res.status(500).json({ message: 'Error del servidor al enviar el desafío' });
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
                redirect: `/competitivo/portal?desafio=${notificacion.id_usuario_remitente}`,
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
                ug.username as ganador_username
            FROM historial_duelos h
            LEFT JOIN usuario u1 ON h.id_retador = u1.id_usuario
            LEFT JOIN usuario u2 ON h.id_defensor = u2.id_usuario  
            LEFT JOIN usuario ug ON h.id_ganador = ug.id_usuario
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
router.get('/sala/:salaId', async (req, res, next) => {
    if (!req.session.user) {
        return res.redirect('/');
    }

    try {
        const { salaId } = req.params;
        const userId = req.session.user.id_usuario;
        
        // Validar UUID
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(salaId)) {
            console.log(`[ROUTER]: UUID inválido: ${salaId}`);
            return res.redirect('/competitivo/portal');
        }

        // ✅ VERIFICAR QUE LA SALA EXISTA EN EL SERVIDOR
        const salasPendientes = global.salasPendientes;
        const salasEspera = global.salasEspera || new Map();
        
        const salaExiste = salasPendientes.has(salaId) || salasEspera.has(salaId);
        
        if (!salaExiste) {
            console.log(`[ROUTER]: Sala ${salaId} no encontrada en servidor`);
            req.session.errorMsg = 'La sala no existe o expiró. Solicita una nueva invitación.';
            return res.redirect('/competitivo/portal');
        }

        const sala = salasPendientes.get(salaId) || salasEspera.get(salaId);
        
        // Verificar que el usuario sea parte de la sala
        const retadorId = sala.retador || sala.idRetador;
        const retadoId = sala.retado || sala.idRetado;
        
        if (parseInt(userId) !== parseInt(retadorId) && parseInt(userId) !== parseInt(retadoId)) {
            console.log(`[ROUTER]: Usuario ${userId} no es parte de la sala ${salaId}`);
            req.session.errorMsg = 'No tienes acceso a esta sala.';
            return res.redirect('/competitivo/portal');
        }

        console.log(`[ROUTER]: ✅ Sala ${salaId} válida para usuario ${userId}`);

        // CONTINUAR CON EL CÓDIGO ORIGINAL...
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
            points_needed: nextRankPoints - currentPoints
        };
        
        res.render('duelodelascenso', {
            layout: 'main',
            user: req.session.user,
            stats: stats,
            salaId: salaId,
            enSala: true
        });

    } catch (error) {
        console.error("[ROUTER ERROR] al cargar sala:", error);
        res.redirect('/competitivo/portal');
    }
});
module.exports = router;