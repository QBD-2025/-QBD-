// =============================================
// 🏆 ROUTER DE LOGROS E INSIGNIAS
// backend/routes/logros.router.js
// =============================================

const express = require('express');
const router = express.Router();
const { verificaUsuario } = require('../middlewares/authMiddleware');
const {
    obtenerLogrosUsuario,
    obtenerInsigniasUsuario,
    equiparInsignia,
    verificarTodoProgreso
} = require('../utils/logros.utils');

// =============================================
// 📊 API: OBTENER LOGROS DEL USUARIO
// =============================================
router.get('/api/logros/:id_usuario', verificaUsuario, async (req, res) => {
    try {
        const idUsuario = parseInt(req.params.id_usuario);
        
        if (!idUsuario || isNaN(idUsuario)) {
            return res.status(400).json({
                success: false,
                message: 'ID de usuario inválido'
            });
        }
        
        // Verificar que el usuario solo pueda ver sus propios logros
        // o que sea admin
        if (req.session.user.id_usuario !== idUsuario && req.session.user.id_tp_usuario !== 3) {
            return res.status(403).json({
                success: false,
                message: 'No tienes permiso para ver estos logros'
            });
        }
        
        const soloDesbloqueados = req.query.desbloqueados === 'true';
        
        const logros = await obtenerLogrosUsuario(idUsuario, soloDesbloqueados);
        
        // Calcular estadísticas de logros
        const total = logros.length;
        const desbloqueados = logros.filter(l => l.desbloqueado === 1).length;
        const porcentaje = total > 0 ? Math.round((desbloqueados / total) * 100) : 0;
        
        res.json({
            success: true,
            logros,
            stats: {
                total,
                desbloqueados,
                porcentaje
            }
        });
    } catch (error) {
        console.error('[LOGROS API ERROR]:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener logros'
        });
    }
});

// =============================================
// 🏅 API: OBTENER INSIGNIAS DEL USUARIO
// =============================================
router.get('/api/insignias/:id_usuario', verificaUsuario, async (req, res) => {
    try {
        const idUsuario = parseInt(req.params.id_usuario);
        
        if (!idUsuario || isNaN(idUsuario)) {
            return res.status(400).json({
                success: false,
                message: 'ID de usuario inválido'
            });
        }
        
        // Verificar permisos
        if (req.session.user.id_usuario !== idUsuario && req.session.user.id_tp_usuario !== 3) {
            return res.status(403).json({
                success: false,
                message: 'No tienes permiso para ver estas insignias'
            });
        }
        
        const soloDesbloqueadas = req.query.desbloqueadas === 'true';
        const soloEquipadas = req.query.equipadas === 'true';
        
        const insignias = await obtenerInsigniasUsuario(idUsuario, soloDesbloqueadas, soloEquipadas);
        
        // Calcular estadísticas por rareza
        const stats = {
            total: insignias.length,
            desbloqueadas: insignias.filter(i => i.desbloqueada === 1).length,
            equipadas: insignias.filter(i => i.equipada === 1).length,
            por_rareza: {
                comun: insignias.filter(i => i.rareza === 'comun' && i.desbloqueada === 1).length,
                rara: insignias.filter(i => i.rareza === 'rara' && i.desbloqueada === 1).length,
                epica: insignias.filter(i => i.rareza === 'epica' && i.desbloqueada === 1).length,
                legendaria: insignias.filter(i => i.rareza === 'legendaria' && i.desbloqueada === 1).length,
                especial: insignias.filter(i => i.rareza === 'especial' && i.desbloqueada === 1).length
            }
        };
        
        res.json({
            success: true,
            insignias,
            stats
        });
    } catch (error) {
        console.error('[INSIGNIAS API ERROR]:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener insignias'
        });
    }
});

// =============================================
// ⚙️ API: EQUIPAR/DESEQUIPAR INSIGNIA
// =============================================
router.post('/api/insignias/:id_insignia/equipar', verificaUsuario, async (req, res) => {
    try {
        const idUsuario = req.session.user.id_usuario;
        const idInsignia = parseInt(req.params.id_insignia);
        const equipar = req.body.equipar !== false; // Default: true
        
        if (!idInsignia || isNaN(idInsignia)) {
            return res.status(400).json({
                success: false,
                message: 'ID de insignia inválido'
            });
        }
        
        const result = await equiparInsignia(idUsuario, idInsignia, equipar);
        
        res.json(result);
    } catch (error) {
        console.error('[EQUIPAR INSIGNIA ERROR]:', error);
        res.status(500).json({
            success: false,
            message: 'Error al equipar insignia'
        });
    }
});

// =============================================
// 🔄 API: VERIFICAR PROGRESO COMPLETO
// =============================================
router.post('/api/progreso/verificar', verificaUsuario, async (req, res) => {
    try {
        const idUsuario = req.session.user.id_usuario;
        
        console.log(`[PROGRESO API]: Verificando progreso de usuario ${idUsuario}`);
        
        const resultado = await verificarTodoProgreso(idUsuario);
        
        res.json({
            success: true,
            ...resultado
        });
    } catch (error) {
        console.error('[PROGRESO API ERROR]:', error);
        res.status(500).json({
            success: false,
            message: 'Error al verificar progreso'
        });
    }
});

// =============================================
// 📊 API: RESUMEN DE LOGROS E INSIGNIAS
// =============================================
router.get('/api/perfil/:id_usuario/logros-insignias', verificaUsuario, async (req, res) => {
    try {
        const idUsuario = parseInt(req.params.id_usuario);
        
        if (!idUsuario || isNaN(idUsuario)) {
            return res.status(400).json({
                success: false,
                message: 'ID de usuario inválido'
            });
        }
        
        // Obtener logros desbloqueados
        const logros = await obtenerLogrosUsuario(idUsuario, true);
        
        // Obtener insignias equipadas
        const insignias = await obtenerInsigniasUsuario(idUsuario, false, true);
        
        // Calcular puntos bonus ganados
        const puntosBonus = logros.reduce((sum, logro) => {
            return sum + (logro.puntos_bonus || 0);
        }, 0);
        
        res.json({
            success: true,
            logros: {
                total: logros.length,
                puntos_bonus: puntosBonus
            },
            insignias: {
                equipadas: insignias,
                total_equipadas: insignias.length
            }
        });
    } catch (error) {
        console.error('[PERFIL LOGROS API ERROR]:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener datos'
        });
    }
});

// =============================================
// 🎯 API: LOGROS NO NOTIFICADOS (PARA NOTIFICACIONES)
// =============================================
router.get('/api/logros/no-notificados', verificaUsuario, async (req, res) => {
    try {
        const idUsuario = req.session.user.id_usuario;
        
        const [logros] = await req.pool.query(`
            SELECT l.*, ul.fecha_desbloqueo
            FROM logros l
            INNER JOIN usuario_logros ul ON l.id_logro = ul.id_logro
            WHERE ul.id_usuario = ? 
            AND ul.desbloqueado = 1 
            AND ul.notificado = 0
            ORDER BY ul.fecha_desbloqueo DESC
        `, [idUsuario]);
        
        const [insignias] = await req.pool.query(`
            SELECT i.*, ui.fecha_desbloqueo
            FROM insignias i
            INNER JOIN usuario_insignias ui ON i.id_insignia = ui.id_insignia
            WHERE ui.id_usuario = ? 
            AND ui.desbloqueada = 1 
            AND ui.notificado = 0
            ORDER BY ui.fecha_desbloqueo DESC
        `, [idUsuario]);
        
        res.json({
            success: true,
            logros,
            insignias
        });
    } catch (error) {
        console.error('[NOTIFICADOS API ERROR]:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener logros no notificados'
        });
    }
});

// =============================================
// ✅ API: MARCAR LOGROS COMO NOTIFICADOS
// =============================================
router.post('/api/logros/marcar-notificados', verificaUsuario, async (req, res) => {
    try {
        const idUsuario = req.session.user.id_usuario;
        const { id_logros, id_insignias } = req.body;
        
        if (id_logros && id_logros.length > 0) {
            await req.pool.query(`
                UPDATE usuario_logros
                SET notificado = 1
                WHERE id_usuario = ? AND id_logro IN (?)
            `, [idUsuario, id_logros]);
        }
        
        if (id_insignias && id_insignias.length > 0) {
            await req.pool.query(`
                UPDATE usuario_insignias
                SET notificado = 1
                WHERE id_usuario = ? AND id_insignia IN (?)
            `, [idUsuario, id_insignias]);
        }
        
        res.json({
            success: true,
            message: 'Notificaciones actualizadas'
        });
    } catch (error) {
        console.error('[MARCAR NOTIFICADOS ERROR]:', error);
        res.status(500).json({
            success: false,
            message: 'Error al marcar notificados'
        });
    }
});

// =============================================
// 📤 EXPORTAR ROUTER
// =============================================
module.exports = router;