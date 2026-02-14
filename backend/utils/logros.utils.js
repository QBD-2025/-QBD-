// =============================================
// 🏆 SISTEMA DE LOGROS E INSIGNIAS
// backend/utils/logros.utils.js
// =============================================

const db = require('../db/conexion');

// =============================================
// 🎯 INICIALIZAR LOGROS DEL USUARIO
// =============================================
async function inicializarLogrosUsuario(idUsuario) {
    try {
        // Crear registros para todos los logros activos si no existen
        await db.query(`
            INSERT IGNORE INTO usuario_logros (id_usuario, id_logro, progreso_actual, desbloqueado)
            SELECT ?, id_logro, 0, 0
            FROM logros
            WHERE activo = 1
        `, [idUsuario]);
        
        console.log(`[LOGROS]: ✅ Logros inicializados para usuario ${idUsuario}`);
        return true;
    } catch (error) {
        console.error('[LOGROS ERROR]: Error inicializando logros:', error);
        return false;
    }
}

// =============================================
// 🎯 INICIALIZAR INSIGNIAS DEL USUARIO
// =============================================
async function inicializarInsigniasUsuario(idUsuario) {
    try {
        await db.query(`
            INSERT IGNORE INTO usuario_insignias (id_usuario, id_insignia, progreso_actual, desbloqueada)
            SELECT ?, id_insignia, 0, 0
            FROM insignias
            WHERE activo = 1
        `, [idUsuario]);
        
        console.log(`[INSIGNIAS]: ✅ Insignias inicializadas para usuario ${idUsuario}`);
        return true;
    } catch (error) {
        console.error('[INSIGNIAS ERROR]: Error inicializando insignias:', error);
        return false;
    }
}

// =============================================
// 📊 VERIFICAR Y ACTUALIZAR LOGROS
// =============================================
async function verificarLogros(idUsuario, categoria = null) {
    try {
        console.log(`[LOGROS]: 🔍 Verificando logros para usuario ${idUsuario}${categoria ? ` (${categoria})` : ''}`);
        
        // Obtener estadísticas actuales del usuario
        const [stats] = await obtenerEstadisticasUsuario(idUsuario);
        
        // Obtener logros no desbloqueados del usuario
        const query = categoria ? 
            `SELECT l.*, ul.progreso_actual, ul.id_usuario_logro
             FROM logros l
             INNER JOIN usuario_logros ul ON l.id_logro = ul.id_logro
             WHERE ul.id_usuario = ? AND ul.desbloqueado = 0 AND l.activo = 1 AND l.categoria = ?` :
            `SELECT l.*, ul.progreso_actual, ul.id_usuario_logro
             FROM logros l
             INNER JOIN usuario_logros ul ON l.id_logro = ul.id_logro
             WHERE ul.id_usuario = ? AND ul.desbloqueado = 0 AND l.activo = 1`;
        
        const params = categoria ? [idUsuario, categoria] : [idUsuario];
        const [logros] = await db.query(query, params);
        
        const logrosDesbloqueados = [];
        
        for (const logro of logros) {
            let cumpleRequisito = false;
            let progresoActual = 0;
            
            // Verificar según tipo de requisito y categoría
            switch (logro.categoria) {
                case 'examenes':
                    if (logro.tipo_requisito === 'cantidad') {
                        progresoActual = stats.examenes_realizados || 0;
                        cumpleRequisito = progresoActual >= logro.valor_requerido;
                    } else if (logro.tipo_requisito === 'porcentaje') {
                        progresoActual = stats.examenes_perfectos || 0;
                        cumpleRequisito = progresoActual >= logro.valor_requerido;
                    }
                    break;
                    
                case 'duelos':
                    if (logro.tipo_requisito === 'cantidad') {
                        progresoActual = stats.victorias || 0;
                        cumpleRequisito = progresoActual >= logro.valor_requerido;
                    } else if (logro.tipo_requisito === 'racha') {
                        progresoActual = stats.racha_victorias || 0;
                        cumpleRequisito = progresoActual >= logro.valor_requerido;
                    }
                    break;
                    
                case 'minijuegos':
                    progresoActual = stats.minijuegos_completados || 0;
                    cumpleRequisito = progresoActual >= logro.valor_requerido;
                    break;
                    
                case 'ranking':
                    progresoActual = stats.posicion_ranking || 9999;
                    cumpleRequisito = progresoActual <= logro.valor_requerido;
                    break;
                    
                case 'social':
                    if (logro.nombre === 'Bienvenido') {
                        cumpleRequisito = stats.perfil_completo === 1;
                        progresoActual = cumpleRequisito ? 1 : 0;
                    } else if (logro.nombre === 'Desafiante') {
                        progresoActual = stats.desafios_enviados || 0;
                        cumpleRequisito = progresoActual >= logro.valor_requerido;
                    } else if (logro.nombre === 'Popular') {
                        progresoActual = stats.desafios_recibidos || 0;
                        cumpleRequisito = progresoActual >= logro.valor_requerido;
                    }
                    break;
            }
            
            // Actualizar progreso
            await db.query(`
                UPDATE usuario_logros 
                SET progreso_actual = ?
                WHERE id_usuario_logro = ?
            `, [progresoActual, logro.id_usuario_logro]);
            
            // Si cumple requisito, desbloquear
            if (cumpleRequisito) {
                await desbloquearLogro(idUsuario, logro.id_logro, logro.puntos_bonus);
                logrosDesbloqueados.push(logro);
            }
        }
        
        console.log(`[LOGROS]: ✅ ${logrosDesbloqueados.length} logros desbloqueados`);
        return logrosDesbloqueados;
        
    } catch (error) {
        console.error('[LOGROS ERROR]: Error verificando logros:', error);
        return [];
    }
}

// =============================================
// 📊 VERIFICAR Y ACTUALIZAR INSIGNIAS
// =============================================
async function verificarInsignias(idUsuario, categoria = null) {
    try {
        console.log(`[INSIGNIAS]: 🔍 Verificando insignias para usuario ${idUsuario}${categoria ? ` (${categoria})` : ''}`);
        
        const [stats] = await obtenerEstadisticasUsuario(idUsuario);
        
        const query = categoria ? 
            `SELECT i.*, ui.progreso_actual, ui.id_usuario_insignia
             FROM insignias i
             INNER JOIN usuario_insignias ui ON i.id_insignia = ui.id_insignia
             WHERE ui.id_usuario = ? AND ui.desbloqueada = 0 AND i.activo = 1 AND i.categoria = ?` :
            `SELECT i.*, ui.progreso_actual, ui.id_usuario_insignia
             FROM insignias i
             INNER JOIN usuario_insignias ui ON i.id_insignia = ui.id_insignia
             WHERE ui.id_usuario = ? AND ui.desbloqueada = 0 AND i.activo = 1`;
        
        const params = categoria ? [idUsuario, categoria] : [idUsuario];
        const [insignias] = await db.query(query, params);
        
        const insigniasDesbloqueadas = [];
        
        for (const insignia of insignias) {
            let cumpleRequisito = false;
            let progresoActual = 0;
            
            // Mapear tipo_requisito a estadística
            switch (insignia.tipo_requisito) {
                case 'examenes_realizados':
                    progresoActual = stats.examenes_realizados || 0;
                    break;
                case 'victorias_duelos':
                    progresoActual = stats.victorias || 0;
                    break;
                case 'racha_victorias':
                    progresoActual = stats.racha_victorias || 0;
                    break;
                case 'minijuegos_jugados':
                    progresoActual = stats.minijuegos_completados || 0;
                    break;
                case 'ranking_posicion':
                    progresoActual = stats.posicion_ranking || 9999;
                    cumpleRequisito = progresoActual <= insignia.valor_requerido;
                    break;
                case 'examenes_80_porciento':
                    progresoActual = stats.examenes_80_mas || 0;
                    break;
                case 'examenes_90_porciento':
                    progresoActual = stats.examenes_90_mas || 0;
                    break;
                case 'examenes_95_porciento':
                    progresoActual = stats.examenes_95_mas || 0;
                    break;
            }
            
            if (!cumpleRequisito) {
                cumpleRequisito = progresoActual >= insignia.valor_requerido;
            }
            
            // Actualizar progreso
            await db.query(`
                UPDATE usuario_insignias 
                SET progreso_actual = ?
                WHERE id_usuario_insignia = ?
            `, [progresoActual, insignia.id_usuario_insignia]);
            
            // Si cumple requisito, desbloquear
            if (cumpleRequisito) {
                await desbloquearInsignia(idUsuario, insignia.id_insignia);
                insigniasDesbloqueadas.push(insignia);
            }
        }
        
        console.log(`[INSIGNIAS]: ✅ ${insigniasDesbloqueadas.length} insignias desbloqueadas`);
        return insigniasDesbloqueadas;
        
    } catch (error) {
        console.error('[INSIGNIAS ERROR]: Error verificando insignias:', error);
        return [];
    }
}

// =============================================
// 🔓 DESBLOQUEAR LOGRO
// =============================================
async function desbloquearLogro(idUsuario, idLogro, puntosBonus = 0) {
    try {
        await db.query(`
            UPDATE usuario_logros
            SET desbloqueado = 1, fecha_desbloqueo = NOW(), notificado = 0
            WHERE id_usuario = ? AND id_logro = ?
        `, [idUsuario, idLogro]);
        
        // Otorgar puntos bonus si aplica
        if (puntosBonus > 0) {
            await db.query(`
                UPDATE usuario
                SET puntos = puntos + ?
                WHERE id_usuario = ?
            `, [puntosBonus, idUsuario]);
        }
        
        console.log(`[LOGROS]: 🎉 Logro ${idLogro} desbloqueado para usuario ${idUsuario} (+${puntosBonus} pts)`);
        
        // Notificar por socket si está disponible
        if (global.io) {
            const [logro] = await db.query('SELECT * FROM logros WHERE id_logro = ?', [idLogro]);
            
            global.io.emit('logro:desbloqueado', {
                idUsuario,
                logro: logro[0],
                puntosBonus
            });
        }
        
        return true;
    } catch (error) {
        console.error('[LOGROS ERROR]: Error desbloqueando logro:', error);
        return false;
    }
}

// =============================================
// 🔓 DESBLOQUEAR INSIGNIA
// =============================================
async function desbloquearInsignia(idUsuario, idInsignia) {
    try {
        await db.query(`
            UPDATE usuario_insignias
            SET desbloqueada = 1, fecha_desbloqueo = NOW(), notificado = 0
            WHERE id_usuario = ? AND id_insignia = ?
        `, [idUsuario, idInsignia]);
        
        console.log(`[INSIGNIAS]: 🎉 Insignia ${idInsignia} desbloqueada para usuario ${idUsuario}`);
        
        // Notificar por socket
        if (global.io) {
            const [insignia] = await db.query('SELECT * FROM insignias WHERE id_insignia = ?', [idInsignia]);
            
            global.io.emit('insignia:desbloqueada', {
                idUsuario,
                insignia: insignia[0]
            });
        }
        
        return true;
    } catch (error) {
        console.error('[INSIGNIAS ERROR]: Error desbloqueando insignia:', error);
        return false;
    }
}

// =============================================
// 📊 OBTENER ESTADÍSTICAS DEL USUARIO
// =============================================
async function obtenerEstadisticasUsuario(idUsuario) {
    try {
        const [result] = await db.query(`
            SELECT 
                u.id_usuario,
                u.puntos,
                u.racha_victorias,
                u.foto_perfil,
                u.descripcion,
                
                -- Exámenes
                COUNT(DISTINCT ue.id_examen) as examenes_realizados,
                SUM(CASE WHEN ue.porcentaje = 100 THEN 1 ELSE 0 END) as examenes_perfectos,
                SUM(CASE WHEN ue.porcentaje >= 80 THEN 1 ELSE 0 END) as examenes_80_mas,
                SUM(CASE WHEN ue.porcentaje >= 90 THEN 1 ELSE 0 END) as examenes_90_mas,
                SUM(CASE WHEN ue.porcentaje >= 95 THEN 1 ELSE 0 END) as examenes_95_mas,
                
                -- Duelos
                (SELECT COUNT(*) FROM historial_duelos hd 
                 WHERE (hd.id_retador = u.id_usuario OR hd.id_defensor = u.id_usuario) 
                 AND hd.id_ganador = u.id_usuario) as victorias,
                
                -- Minijuegos (estimación básica - ajustar según tu estructura)
                0 as minijuegos_completados,
                
                -- Ranking
                (SELECT COUNT(*) + 1 FROM usuario u2 WHERE u2.puntos > u.puntos) as posicion_ranking,
                
                -- Social
                CASE WHEN u.foto_perfil IS NOT NULL AND u.descripcion IS NOT NULL THEN 1 ELSE 0 END as perfil_completo,
                
                (SELECT COUNT(*) FROM duelo d WHERE d.id_retador = u.id_usuario) as desafios_enviados,
                (SELECT COUNT(*) FROM duelo d WHERE d.id_defensor = u.id_usuario) as desafios_recibidos
                
            FROM usuario u
            LEFT JOIN usuario_examen ue ON u.id_usuario = ue.id_usuario
            WHERE u.id_usuario = ?
            GROUP BY u.id_usuario
        `, [idUsuario]);
        
        return result;
    } catch (error) {
        console.error('[STATS ERROR]:', error);
        return [{}];
    }
}

// =============================================
// 🎯 VERIFICACIÓN COMPLETA (LLAMAR DESPUÉS DE ACCIONES)
// =============================================
async function verificarTodoProgreso(idUsuario) {
    try {
        console.log(`[SISTEMA]: 🔍 Verificación completa para usuario ${idUsuario}`);
        
        const logros = await verificarLogros(idUsuario);
        const insignias = await verificarInsignias(idUsuario);
        
        return {
            logros_desbloqueados: logros,
            insignias_desbloqueadas: insignias
        };
    } catch (error) {
        console.error('[SISTEMA ERROR]:', error);
        return { logros_desbloqueados: [], insignias_desbloqueadas: [] };
    }
}

// =============================================
// 📋 OBTENER LOGROS DEL USUARIO
// =============================================
async function obtenerLogrosUsuario(idUsuario, soloDesbloqueados = false) {
    try {
        const query = soloDesbloqueados ?
            `SELECT l.*, ul.progreso_actual, ul.desbloqueado, ul.fecha_desbloqueo
             FROM logros l
             INNER JOIN usuario_logros ul ON l.id_logro = ul.id_logro
             WHERE ul.id_usuario = ? AND ul.desbloqueado = 1
             ORDER BY ul.fecha_desbloqueo DESC` :
            `SELECT l.*, ul.progreso_actual, ul.desbloqueado, ul.fecha_desbloqueo
             FROM logros l
             INNER JOIN usuario_logros ul ON l.id_logro = ul.id_logro
             WHERE ul.id_usuario = ?
             ORDER BY ul.desbloqueado DESC, l.categoria, l.valor_requerido`;
        
        const [logros] = await db.query(query, [idUsuario]);
        return logros;
    } catch (error) {
        console.error('[LOGROS ERROR]:', error);
        return [];
    }
}

// =============================================
// 📋 OBTENER INSIGNIAS DEL USUARIO
// =============================================
async function obtenerInsigniasUsuario(idUsuario, soloDesbloqueadas = false, soloEquipadas = false) {
    try {
        let query = `
            SELECT i.*, ui.progreso_actual, ui.desbloqueada, ui.equipada, 
                   ui.posicion_perfil, ui.fecha_desbloqueo
            FROM insignias i
            INNER JOIN usuario_insignias ui ON i.id_insignia = ui.id_insignia
            WHERE ui.id_usuario = ?
        `;
        
        if (soloEquipadas) {
            query += ' AND ui.equipada = 1';
        } else if (soloDesbloqueadas) {
            query += ' AND ui.desbloqueada = 1';
        }
        
        query += ' ORDER BY ui.equipada DESC, ui.desbloqueada DESC, i.rareza DESC, ui.posicion_perfil';
        
        const [insignias] = await db.query(query, [idUsuario]);
        return insignias;
    } catch (error) {
        console.error('[INSIGNIAS ERROR]:', error);
        return [];
    }
}

// =============================================
// ⚙️ EQUIPAR/DESEQUIPAR INSIGNIA
// =============================================
async function equiparInsignia(idUsuario, idInsignia, equipar = true) {
    try {
        // Verificar que la insignia esté desbloqueada
        const [insignia] = await db.query(`
            SELECT * FROM usuario_insignias
            WHERE id_usuario = ? AND id_insignia = ? AND desbloqueada = 1
        `, [idUsuario, idInsignia]);
        
        if (insignia.length === 0) {
            return { success: false, message: 'Insignia no desbloqueada' };
        }
        
        if (equipar) {
            // Verificar límite de insignias equipadas (máximo 6)
            const [equipadas] = await db.query(`
                SELECT COUNT(*) as total FROM usuario_insignias
                WHERE id_usuario = ? AND equipada = 1
            `, [idUsuario]);
            
            if (equipadas[0].total >= 6) {
                return { success: false, message: 'Máximo 6 insignias equipadas' };
            }
            
            // Obtener siguiente posición
            const [maxPos] = await db.query(`
                SELECT COALESCE(MAX(posicion_perfil), 0) + 1 as siguiente
                FROM usuario_insignias
                WHERE id_usuario = ? AND equipada = 1
            `, [idUsuario]);
            
            await db.query(`
                UPDATE usuario_insignias
                SET equipada = 1, posicion_perfil = ?, fecha_equipamiento = NOW()
                WHERE id_usuario = ? AND id_insignia = ?
            `, [maxPos[0].siguiente, idUsuario, idInsignia]);
            
            console.log(`[INSIGNIAS]: ✅ Insignia ${idInsignia} equipada en posición ${maxPos[0].siguiente}`);
        } else {
            await db.query(`
                UPDATE usuario_insignias
                SET equipada = 0, posicion_perfil = NULL
                WHERE id_usuario = ? AND id_insignia = ?
            `, [idUsuario, idInsignia]);
            
            // Reordenar posiciones
            await db.query(`
                SET @pos = 0;
                UPDATE usuario_insignias
                SET posicion_perfil = (@pos := @pos + 1)
                WHERE id_usuario = ? AND equipada = 1
                ORDER BY posicion_perfil
            `, [idUsuario]);
            
            console.log(`[INSIGNIAS]: ✅ Insignia ${idInsignia} desequipada`);
        }
        
        return { success: true, message: equipar ? 'Insignia equipada' : 'Insignia desequipada' };
    } catch (error) {
        console.error('[INSIGNIAS ERROR]:', error);
        return { success: false, message: 'Error al equipar insignia' };
    }
}

// =============================================
// 📤 EXPORTAR FUNCIONES
// =============================================
module.exports = {
    inicializarLogrosUsuario,
    inicializarInsigniasUsuario,
    verificarLogros,
    verificarInsignias,
    verificarTodoProgreso,
    desbloquearLogro,
    desbloquearInsignia,
    obtenerEstadisticasUsuario,
    obtenerLogrosUsuario,
    obtenerInsigniasUsuario,
    equiparInsignia
};