// =============================================
// 🚨 SISTEMA DE MANEJO DE ERRORES Y ABANDONOS
// duelosErrorHandler.js
// =============================================

const pool = require('../db/conexion');

// Configuración de tiempos y penalizaciones para duelos 48h
const TIEMPOS_48H = {
    RECONEXION: 30 * 60 * 1000,      // 30 minutos
    AFK_WARNING: 60 * 60 * 1000,     // 1 hora
    AFK_EXPULSION: 2 * 60 * 60 * 1000 // 2 horas
};

const PENALIZACIONES_48H = {
    ABANDONO_VOLUNTARIO: 0.30,       // 30% de puntos perdidos
    NAVEGACION: 0.40,                // 40% si cierra navegador
    DESCONEXION: 0.20,               // 20% por desconexión
    AFK_TIMEOUT: 0.25,               // 25% por timeout
    RENDIRSE: 0.30                   // 30% por rendirse
};

const MOTIVOS_ABANDONO = {
    VOLUNTARIO: 'voluntario',
    DESCONEXION: 'desconexion',
    NAVEGACION: 'navegacion',
    TIMEOUT: 'timeout',
    AFK: 'afk',
    RENDIRSE: 'rendirse'
};

// =============================================
// 📝 FUNCIÓN CENTRAL: procesarAbandono48h
// =============================================
async function procesarAbandono48h(salaId, idUsuario, motivo, io) {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        
        console.log(`[ABANDONO 48H] Usuario ${idUsuario} abandonó duelo ${salaId} por ${motivo}`);
        
        // 1️⃣ Obtener información del duelo
        const [duelos] = await conn.query(
            'SELECT * FROM duelos WHERE id_duelo = ?',
            [salaId]
        );
        
        if (!duelos.length) {
            await conn.rollback();
            await conn.release();
            throw new Error('Duelo no encontrado');
        }
        
        const duelo = duelos[0];
        const esRetador = duelo.id_retador === idUsuario;
        const idOponente = esRetador ? duelo.id_defensor : duelo.id_retador;
        
        // 2️⃣ Obtener puntos actuales del usuario
        const [usuarioData] = await conn.query(
            'SELECT puntos FROM usuario WHERE id_usuario = ?',
            [idUsuario]
        );
        
        const puntosActuales = usuarioData[0]?.puntos || 0;
        
        // 3️⃣ Calcular penalización según motivo
        let penalizacion = 0;
        let gananciaOponente = 50; // Valor base si no hay puntos
        
        if (puntosActuales > 0) {
            let porcentajePenalizacion = 0;
            
            switch (motivo) {
                case MOTIVOS_ABANDONO.VOLUNTARIO:
                case MOTIVOS_ABANDONO.RENDIRSE:
                    porcentajePenalizacion = PENALIZACIONES_48H.ABANDONO_VOLUNTARIO;
                    break;
                    
                case MOTIVOS_ABANDONO.NAVEGACION:
                    porcentajePenalizacion = PENALIZACIONES_48H.NAVEGACION;
                    break;
                    
                case MOTIVOS_ABANDONO.DESCONEXION:
                case MOTIVOS_ABANDONO.TIMEOUT:
                    porcentajePenalizacion = PENALIZACIONES_48H.DESCONEXION;
                    break;
                    
                case MOTIVOS_ABANDONO.AFK:
                    porcentajePenalizacion = PENALIZACIONES_48H.AFK_TIMEOUT;
                    break;
                    
                default:
                    porcentajePenalizacion = PENALIZACIONES_48H.ABANDONO_VOLUNTARIO;
            }
            
            penalizacion = Math.floor(puntosActuales * porcentajePenalizacion);
            gananciaOponente = penalizacion;
        }
        
        console.log(`[ABANDONO 48H] Penalización: -${penalizacion} pts | Ganancia oponente: +${gananciaOponente} pts`);
        
        // 4️⃣ Aplicar penalización al usuario que abandona
        await conn.query(
            'UPDATE usuario SET puntos = GREATEST(0, puntos - ?) WHERE id_usuario = ?',
            [penalizacion, idUsuario]
        );
        
        // 5️⃣ Recompensar al oponente
        await conn.query(
            'UPDATE usuario SET puntos = puntos + ? WHERE id_usuario = ?',
            [gananciaOponente, idOponente]
        );
        
        // 6️⃣ Registrar en historial
        await conn.query(`
            INSERT INTO historial_duelos 
            (id_duelo, id_retador, id_defensor, id_ganador, puntos_retador, puntos_defensor, 
             fecha_duelo, motivo_abandono, penalizacion_aplicada)
            VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, ?)
        `, [
            salaId,
            duelo.id_retador,
            duelo.id_defensor,
            idOponente, // El oponente gana
            esRetador ? -penalizacion : gananciaOponente,
            esRetador ? gananciaOponente : -penalizacion,
            motivo,
            penalizacion
        ]);
        
        // 7️⃣ Marcar duelo como finalizado
        await conn.query(
            'UPDATE duelos SET estado = ? WHERE id_duelo = ?',
            ['abandonado', salaId]
        );
        
        // 8️⃣ Limpiar datos del duelo
        await conn.query('DELETE FROM duelos_preguntas WHERE id_duelo = ?', [salaId]);
        await conn.query('DELETE FROM duelos_respuestas WHERE id_duelo = ?', [salaId]);
        
        await conn.commit();
        await conn.release();
        
        // 9️⃣ Notificar a ambos jugadores vía socket
        if (io) {
            const [abandonador] = await pool.query(
                'SELECT username FROM usuario WHERE id_usuario = ?',
                [idUsuario]
            );
            
            const nombreAbandono = abandonador[0]?.username || 'Usuario';
            
            // Notificar al oponente
            io.to(idOponente.toString()).emit('duelo:oponenteAbandono', {
                salaId,
                ganaste: true,
                mensaje: `${nombreAbandono} ha abandonado el duelo`,
                gananciaOponente,
                motivo
            });
            
            // Notificar al que abandonó
            io.to(idUsuario.toString()).emit('duelo:abandonoConfirmado', {
                salaId,
                penalizacion,
                motivo,
                mensaje: `Has abandonado el duelo. Penalización: -${penalizacion} puntos`
            });
        }
        
        console.log(`[ABANDONO 48H] ✅ Proceso completado exitosamente`);
        
        return {
            success: true,
            penalizacion,
            gananciaOponente,
            motivo
        };
        
    } catch (error) {
        await conn.rollback();
        await conn.release();
        console.error('❌ Error procesando abandono 48h:', error);
        throw error;
    }
}

// =============================================
// 🔌 REGISTRO DE DESCONEXIÓN
// =============================================
async function registrarDesconexion48h(idUsuario, salaId, estadoDuelo) {
    try {
        await pool.query(`
            INSERT INTO duelos_desconexiones 
            (id_duelo, id_usuario, timestamp_desconexion, estado_duelo)
            VALUES (?, ?, NOW(), ?)
            ON DUPLICATE KEY UPDATE 
            timestamp_desconexion = NOW(),
            estado_duelo = VALUES(estado_duelo)
        `, [salaId, idUsuario, JSON.stringify(estadoDuelo)]);
        
        console.log(`[DESCONEXIÓN 48H] Registrada para usuario ${idUsuario} en duelo ${salaId}`);
        
        return { success: true };
    } catch (error) {
        console.error('❌ Error registrando desconexión:', error);
        throw error;
    }
}

// =============================================
// 🔄 RESTAURAR DUELO AL RECONECTAR
// =============================================
async function restaurarDuelo48h(idUsuario, salaId) {
    try {
        const [desconexion] = await pool.query(`
            SELECT * FROM duelos_desconexiones 
            WHERE id_duelo = ? AND id_usuario = ?
            ORDER BY timestamp_desconexion DESC
            LIMIT 1
        `, [salaId, idUsuario]);
        
        if (!desconexion.length) {
            return { success: false, error: 'No hay registro de desconexión' };
        }
        
        const registro = desconexion[0];
        const tiempoTranscurrido = Date.now() - new Date(registro.timestamp_desconexion).getTime();
        
        // Verificar si excedió el tiempo de reconexión (30 minutos)
        if (tiempoTranscurrido > TIEMPOS_48H.RECONEXION) {
            console.log(`[RECONEXIÓN 48H] ⏰ Tiempo expirado para usuario ${idUsuario}`);
            // Aplicar penalización por timeout
            await procesarAbandono48h(salaId, idUsuario, MOTIVOS_ABANDONO.TIMEOUT, null);
            return { success: false, error: 'Tiempo de reconexión expirado' };
        }
        
        // Restaurar estado del duelo
        const estadoDuelo = JSON.parse(registro.estado_duelo);
        
        // Eliminar registro de desconexión
        await pool.query(
            'DELETE FROM duelos_desconexiones WHERE id_duelo = ? AND id_usuario = ?',
            [salaId, idUsuario]
        );
        
        console.log(`[RECONEXIÓN 48H] ✅ Usuario ${idUsuario} reconectado exitosamente`);
        
        return {
            success: true,
            estadoDuelo,
            tiempoDesconectado: Math.floor(tiempoTranscurrido / 1000) // en segundos
        };
        
    } catch (error) {
        console.error('❌ Error restaurando duelo:', error);
        throw error;
    }
}

// Exportar funciones para uso en otros módulos
module.exports = {
    procesarAbandono48h,
    registrarDesconexion48h,
    restaurarDuelo48h,
    MOTIVOS_ABANDONO,
    PENALIZACIONES_48H,
    TIEMPOS_48H
};