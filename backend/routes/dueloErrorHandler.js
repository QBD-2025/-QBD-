// =============================================
// 🚨 SISTEMA DE MANEJO DE ERRORES Y ABANDONOS
// duelosErrorHandler.js - VERSIÓN UNIFICADA
// ✅ Compatible con: Duelos Rápidos + Sistema de Rangos + Estadísticas
// ✅ Diferencia correctamente: Puntos Globales vs Puntos de Carrera
// =============================================

const pool = require('../db/conexion');

// =============================================
// 📐 CONFIGURACIÓN DE TIEMPOS Y PENALIZACIONES
// =============================================

// Duelos de 48 horas (Competitivo por Notificación)
const TIEMPOS_48H = {
    RECONEXION: 30 * 60 * 1000,      // 30 minutos
    AFK_WARNING: 60 * 60 * 1000,     // 1 hora
    AFK_EXPULSION: 2 * 60 * 60 * 1000 // 2 horas
};

const PENALIZACIONES_48H = {
    ABANDONO_VOLUNTARIO: 0.30,       // 30% de la apuesta
    NAVEGACION: 0.40,                // 40% si cierra navegador
    DESCONEXION: 0.20,               // 20% por desconexión
    AFK_TIMEOUT: 0.25,               // 25% por timeout
    RENDIRSE: 0.30                   // 30% por rendirse
};

// Duelos Rápidos (Matchmaking/Lobby)
const TIEMPOS_RAPIDOS = {
    RECONEXION: 60 * 1000,           // 60 segundos
    AFK_WARNING: 30 * 1000,          // 30 segundos
    AFK_EXPULSION: 90 * 1000         // 90 segundos
};

const PENALIZACIONES_RAPIDOS = {
    ABANDONO_VOLUNTARIO: 0.50,       // 50% de la apuesta
    NAVEGACION: 0.50,                // 50% si cierra navegador
    DESCONEXION: 0.25,               // 25% por desconexión
    AFK_TIMEOUT: 0.30,               // 30% por timeout
    RENDIRSE: 0.30                   // 30% por rendirse
};

const MOTIVOS_ABANDONO = {
    VOLUNTARIO: 'voluntario',
    DESCONEXION: 'desconexion',
    NAVEGACION: 'navegacion',
    TIMEOUT: 'timeout',
    AFK: 'afk',
    RENDIRSE: 'rendirse',
    ERROR_SERVIDOR: 'error_servidor',
    EXPULSION: 'expulsion'
};

// =============================================
// 🎯 FUNCIÓN PRINCIPAL: procesarAbandono48h
// Para duelos del modo competitivo (48 horas)
// =============================================
async function procesarAbandono48h(salaId, idUsuario, motivo, io) {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        
        console.log(`[ABANDONO 48H] ==========================================`);
        console.log(`[ABANDONO 48H] Usuario ${idUsuario} abandonó duelo ${salaId}`);
        console.log(`[ABANDONO 48H] Motivo: ${motivo}`);
        
        // 1️⃣ Obtener información del duelo
        const [duelos] = await conn.query(
            'SELECT * FROM duelos WHERE id_duelo = ?',
            [salaId]
        );
        
        if (!duelos.length) {
            await conn.rollback();
            conn.release();
            throw new Error('Duelo no encontrado');
        }
        
        const duelo = duelos[0];
        const esRetador = duelo.id_retador === idUsuario;
        const idOponente = esRetador ? duelo.id_defensor : duelo.id_retador;
        const apuesta = duelo.apuesta || 0;
        const esDueloCarrera = duelo.id_carrera !== null && duelo.tipo_duelo === 'carrera';
        
        console.log(`[ABANDONO 48H] Tipo de duelo: ${esDueloCarrera ? 'CARRERA' : 'GENERAL'}`);
        console.log(`[ABANDONO 48H] Apuesta: ${apuesta} pts`);
        if (esDueloCarrera) {
            console.log(`[ABANDONO 48H] ID Carrera: ${duelo.id_carrera}`);
        }
        
        // 2️⃣ Calcular penalización según motivo
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
        
        const penalizacion = Math.floor(apuesta * porcentajePenalizacion);
        const gananciaOponente = penalizacion;
        
        console.log(`[ABANDONO 48H] Penalización: ${penalizacion} pts (${(porcentajePenalizacion * 100).toFixed(0)}%)`);
        console.log(`[ABANDONO 48H] Ganancia oponente: ${gananciaOponente} pts`);
        
        // 3️⃣ ✅✅✅ APLICAR PENALIZACIÓN Y RECOMPENSA SEGÚN MODO
        if (esDueloCarrera) {
            // 🎓 DUELO DE CARRERA
            console.log(`[ABANDONO 48H] Procesando como DUELO DE CARRERA...`);
            
            if (penalizacion > 0) {
                const [puntosCarrera] = await conn.query(
                    'SELECT puntos FROM usuario_puntos_carrera WHERE id_usuario = ? AND id_carrera = ?',
                    [idUsuario, duelo.id_carrera]
                );
                
                const puntosActuales = puntosCarrera[0]?.puntos || 0;
                const nuevosPuntos = Math.max(0, puntosActuales - penalizacion);
                
                await conn.query(
                    `INSERT INTO usuario_puntos_carrera (id_usuario, id_carrera, puntos)
                    VALUES (?, ?, ?)
                    ON DUPLICATE KEY UPDATE puntos = ?`,
                    [idUsuario, duelo.id_carrera, nuevosPuntos, nuevosPuntos]
                );
                
                console.log(`[ABANDONO 48H] Usuario ${idUsuario}: -${penalizacion} pts carrera (${puntosActuales} → ${nuevosPuntos})`);
            }
            
            if (gananciaOponente > 0) {
                const [puntosOponente] = await conn.query(
                    'SELECT puntos FROM usuario_puntos_carrera WHERE id_usuario = ? AND id_carrera = ?',
                    [idOponente, duelo.id_carrera]
                );
                
                const puntosActualesOp = puntosOponente[0]?.puntos || 0;
                const nuevosPuntosOp = puntosActualesOp + gananciaOponente;
                
                await conn.query(
                    `INSERT INTO usuario_puntos_carrera (id_usuario, id_carrera, puntos)
                    VALUES (?, ?, ?)
                    ON DUPLICATE KEY UPDATE puntos = ?`,
                    [idOponente, duelo.id_carrera, nuevosPuntosOp, nuevosPuntosOp]
                );
                
                console.log(`[ABANDONO 48H] Oponente ${idOponente}: +${gananciaOponente} pts carrera (${puntosActualesOp} → ${nuevosPuntosOp})`);
            }
        } else {
            // 🌐 DUELO GENERAL
            console.log(`[ABANDONO 48H] Procesando como DUELO GENERAL...`);
            
            if (penalizacion > 0) {
                await conn.query(
                    'UPDATE usuario SET puntos = GREATEST(0, puntos - ?) WHERE id_usuario = ?',
                    [penalizacion, idUsuario]
                );
                console.log(`[ABANDONO 48H] Usuario ${idUsuario}: -${penalizacion} pts globales`);
            }
            
            if (gananciaOponente > 0) {
                await conn.query(
                    'UPDATE usuario SET puntos = puntos + ? WHERE id_usuario = ?',
                    [gananciaOponente, idOponente]
                );
                console.log(`[ABANDONO 48H] Oponente ${idOponente}: +${gananciaOponente} pts globales`);
            }
        }
        
        // 4️⃣ Registrar en historial
        await conn.query(`
            INSERT INTO historial_duelos 
            (id_duelo, id_retador, id_defensor, id_ganador, 
             puntos_retador, puntos_defensor, 
             fecha_duelo, motivo_abandono, penalizacion_aplicada,
             tipo_duelo, id_carrera)
            VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?, ?)
        `, [
            salaId, duelo.id_retador, duelo.id_defensor, idOponente,
            esRetador ? -penalizacion : gananciaOponente,
            esRetador ? gananciaOponente : -penalizacion,
            motivo, penalizacion,
            esDueloCarrera ? 'carrera' : 'general',
            duelo.id_carrera || null
        ]);
        
        // 5️⃣ Marcar duelo como abandonado y limpiar
        await conn.query('UPDATE duelos SET estado = ? WHERE id_duelo = ?', ['abandonado', salaId]);
        await conn.query('DELETE FROM duelos_preguntas WHERE id_duelo = ?', [salaId]);
        await conn.query('DELETE FROM duelos_respuestas WHERE id_duelo = ?', [salaId]);
        await conn.query(`
            DELETE FROM notificaciones 
            WHERE tipo = 'desafio_duelo' 
            AND JSON_EXTRACT(extra_data, '$.id_duelo') = ?
        `, [salaId]);
        
        await conn.commit();
        conn.release();
        
        // 6️⃣ Notificar vía Socket.IO
        if (io) {
            const [abandonadorInfo] = await pool.query(
                'SELECT username FROM usuario WHERE id_usuario = ?',
                [idUsuario]
            );
            
            const nombreAbandono = abandonadorInfo[0]?.username || 'Usuario';
            
            await pool.query(`
                INSERT INTO notificaciones 
                (id_usuario_destinatario, id_usuario_remitente, tipo, mensaje, extra_data)
                VALUES (?, ?, 'duelo_abandonado', ?, ?)
            `, [
                idOponente, idUsuario,
                `¡${nombreAbandono} abandonó el duelo! Ganaste ${gananciaOponente} puntos ${esDueloCarrera ? 'de carrera' : 'globales'} 🏆`,
                JSON.stringify({ 
                    id_duelo: salaId, 
                    motivo: motivo,
                    ganancia: gananciaOponente,
                    tipo_duelo: esDueloCarrera ? 'carrera' : 'general'
                })
            ]);
            
            io.to(idOponente.toString()).emit('duelo:oponenteAbandono', {
                salaId, ganaste: true,
                mensaje: `${nombreAbandono} ha abandonado el duelo`,
                gananciaOponente, motivo,
                tipoDuelo: esDueloCarrera ? 'carrera' : 'general'
            });
            
            io.to(idOponente.toString()).emit('notificacion_recibida');
            
            io.to(idUsuario.toString()).emit('duelo:abandonoConfirmado', {
                salaId, penalizacion, motivo,
                mensaje: `Has abandonado el duelo. Penalización: -${penalizacion} puntos ${esDueloCarrera ? 'de carrera' : 'globales'}`,
                tipoDuelo: esDueloCarrera ? 'carrera' : 'general'
            });
        }
        
        console.log(`[ABANDONO 48H] ✅ Proceso completado`);
        
        return {
            success: true,
            penalizacion,
            gananciaOponente,
            motivo,
            tipoDuelo: esDueloCarrera ? 'carrera' : 'general'
        };
        
    } catch (error) {
        await conn.rollback();
        conn.release();
        console.error('❌ [ABANDONO 48H] Error:', error);
        throw error;
    }
}

// =============================================
// 🔌 REGISTRO DE DESCONEXIÓN PARA DUELOS 48H
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
        
        console.log(`[DESCONEXIÓN 48H] Registrada para usuario ${idUsuario}`);
        return { success: true };
    } catch (error) {
        console.error('❌ Error registrando desconexión 48h:', error);
        throw error;
    }
}

// =============================================
// 🔄 RESTAURAR DUELO AL RECONECTAR (48H)
// =============================================
async function restaurarDuelo48h(idUsuario, salaId) {
    try {
        const [desconexion] = await pool.query(`
            SELECT * FROM duelos_desconexiones 
            WHERE id_duelo = ? AND id_usuario = ?
            ORDER BY timestamp_desconexion DESC LIMIT 1
        `, [salaId, idUsuario]);
        
        if (!desconexion.length) {
            return { success: false, error: 'No hay registro de desconexión' };
        }
        
        const registro = desconexion[0];
        const tiempoTranscurrido = Date.now() - new Date(registro.timestamp_desconexion).getTime();
        
        if (tiempoTranscurrido > TIEMPOS_48H.RECONEXION) {
            console.log(`[RECONEXIÓN 48H] ⏰ Tiempo expirado para usuario ${idUsuario}`);
            await procesarAbandono48h(salaId, idUsuario, MOTIVOS_ABANDONO.TIMEOUT, null);
            return { success: false, error: 'Tiempo de reconexión expirado' };
        }
        
        const estadoDuelo = JSON.parse(registro.estado_duelo);
        
        await pool.query(
            'DELETE FROM duelos_desconexiones WHERE id_duelo = ? AND id_usuario = ?',
            [salaId, idUsuario]
        );
        
        console.log(`[RECONEXIÓN 48H] ✅ Usuario ${idUsuario} reconectado`);
        
        return {
            success: true,
            estadoDuelo,
            tiempoDesconectado: Math.floor(tiempoTranscurrido / 1000)
        };
        
    } catch (error) {
        console.error('❌ Error restaurando duelo 48h:', error);
        throw error;
    }
}

// =============================================
// ⚡ FUNCIÓN PARA DUELOS RÁPIDOS
// =============================================
async function procesarAbandonoRapido(salaId, idUsuario, motivo, io, activeDuels) {
    console.log(`[ABANDONO RÁPIDO] Usuario ${idUsuario} abandonó sala ${salaId}, motivo: ${motivo}`);
    
    const duelo = activeDuels.get(salaId);
    
    if (!duelo) {
        throw new Error('Duelo no encontrado');
    }
    
    const jugador = duelo.jugadores[idUsuario];
    const oponenteId = Object.keys(duelo.jugadores).find(id => id !== idUsuario.toString());
    const oponente = duelo.jugadores[oponenteId];
    
    if (!jugador || !oponente) {
        throw new Error('Jugadores no encontrados');
    }
    
    const apuesta = duelo.apuesta || 0;
    const esDueloCarrera = duelo.modo === 'carrera' && duelo.idCarrera;
    
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        
        let porcentajePenalizacion = 0;
        
        switch (motivo) {
            case 'voluntario':
            case 'rendirse':
                porcentajePenalizacion = PENALIZACIONES_RAPIDOS.RENDIRSE;
                break;
            case 'abandonar':
            case 'navegacion':
                porcentajePenalizacion = PENALIZACIONES_RAPIDOS.NAVEGACION;
                break;
            case 'desconexion':
                porcentajePenalizacion = PENALIZACIONES_RAPIDOS.DESCONEXION;
                break;
            case 'afk':
            case 'timeout':
                porcentajePenalizacion = PENALIZACIONES_RAPIDOS.AFK_TIMEOUT;
                break;
            default:
                porcentajePenalizacion = PENALIZACIONES_RAPIDOS.ABANDONO_VOLUNTARIO;
                break;
        }
        
        const penalizacion = Math.floor(apuesta * porcentajePenalizacion);
        const gananciaOponente = penalizacion;
        
        console.log(`[ABANDONO RÁPIDO] Penalización: ${penalizacion} pts, Ganancia: ${gananciaOponente} pts`);
        
        if (esDueloCarrera) {
            console.log(`[ABANDONO RÁPIDO] Procesando DUELO DE CARRERA...`);
            
            if (penalizacion > 0) {
                const [[puntosCarrera]] = await connection.query(
                    'SELECT puntos FROM usuario_puntos_carrera WHERE id_usuario = ? AND id_carrera = ?',
                    [idUsuario, duelo.idCarrera]
                );
                
                const puntosActuales = puntosCarrera?.puntos || 0;
                const nuevosPuntos = Math.max(0, puntosActuales - penalizacion);
                
                await connection.query(
                    `INSERT INTO usuario_puntos_carrera (id_usuario, id_carrera, puntos)
                    VALUES (?, ?, ?)
                    ON DUPLICATE KEY UPDATE puntos = ?`,
                    [idUsuario, duelo.idCarrera, nuevosPuntos, nuevosPuntos]
                );
            }
            
            if (gananciaOponente > 0) {
                await connection.query(
                    `INSERT INTO usuario_puntos_carrera (id_usuario, id_carrera, puntos)
                    VALUES (?, ?, ?)
                    ON DUPLICATE KEY UPDATE puntos = puntos + VALUES(puntos)`,
                    [oponenteId, duelo.idCarrera, gananciaOponente]
                );
            }
        } else {
            console.log(`[ABANDONO RÁPIDO] Procesando DUELO GENERAL...`);
            
            if (penalizacion > 0) {
                await connection.query(
                    'UPDATE usuario SET puntos = GREATEST(0, puntos - ?) WHERE id_usuario = ?',
                    [penalizacion, idUsuario]
                );
            }
            
            if (gananciaOponente > 0) {
                await connection.query(
                    'UPDATE usuario SET puntos = puntos + ? WHERE id_usuario = ?',
                    [gananciaOponente, oponenteId]
                );
            }
        }
        
        const jugadoresIds = Object.keys(duelo.jugadores);
        const tipoOrigen = duelo.esMatchmaking ? 'matchmaking' : 
                        (duelo.tipo === 'lobby_directo' ? 'lobby' : 'notificacion_bd');
        
        await connection.query(
            `INSERT INTO historial_duelos 
            (id_sala, id_retador, id_defensor, id_ganador, 
             puntos_retador, puntos_defensor, 
             fecha_duelo, apuesta, tipo_duelo, modo_duelo, id_carrera,
             motivo_abandono, penalizacion_aplicada)
            VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?, ?, ?, ?)`,
            [
                salaId,
                duelo.jugadores[jugadoresIds[0]]?.id_usuario || jugadoresIds[0],
                duelo.jugadores[jugadoresIds[1]]?.id_usuario || jugadoresIds[1],
                oponenteId,
                duelo.puntuaciones?.[jugadoresIds[0]] || 0,
                duelo.puntuaciones?.[jugadoresIds[1]] || 0,
                apuesta,
                esDueloCarrera ? 'carrera' : 'general',
                tipoOrigen,
                duelo.idCarrera || null,
                `abandono_${motivo}`,
                penalizacion
            ]
        );
        
        await connection.commit();
        connection.release();
        
        if (io) {
            if (oponente.socketId) {
                io.to(oponente.socketId).emit('duelo:oponenteAbandono', {
                    mensaje: `¡Victoria! Ganaste ${gananciaOponente} pts ${esDueloCarrera ? 'de carrera' : 'globales'}`,
                    ganancia: gananciaOponente,
                    motivo,
                    nombreOponente: jugador.username,
                    icono: '🏆',
                    mostrarPantalla: true,
                    modoDuelo: esDueloCarrera ? 'carrera' : 'general'
                });
            }
            
            if (jugador.socketId) {
                io.to(jugador.socketId).emit('duelo:abandonoConfirmado', {
                    mensaje: `Perdiste ${penalizacion} pts ${esDueloCarrera ? 'de carrera' : 'globales'}`,
                    penalizacion, apuesta, motivo,
                    icono: '😔',
                    mostrarPantalla: true
                });
            }
        }
        
        activeDuels.delete(salaId);
        
        console.log(`[ABANDONO RÁPIDO] ✅ Proceso completado`);
        
        return {
            success: true,
            penalizacion,
            gananciaOponente,
            motivo,
            tipoDuelo: esDueloCarrera ? 'carrera' : 'general'
        };
        
    } catch (error) {
        await connection.rollback();
        connection.release();
        console.error('❌ [ABANDONO RÁPIDO] Error:', error);
        throw error;
    }
}

// =============================================
// 🔌 SISTEMA DE RECONEXIÓN RÁPIDA
// =============================================
const usuariosDesconectados = new Map();

function registrarDesconexionRapida(userId, salaId, duelo) {
    usuariosDesconectados.set(parseInt(userId), {
        salaId, timestamp: Date.now(), duelo,
        intentosReconexion: 0,
        tiempoMaximo: TIEMPOS_RAPIDOS.RECONEXION
    });
    console.log(`[DESCONEXIÓN RÁPIDA] Usuario ${userId} registrado - 60s`);
}

function verificarReconexionRapida(userId) {
    const info = usuariosDesconectados.get(parseInt(userId));
    if (!info) return null;
    
    const tiempoTranscurrido = Date.now() - info.timestamp;
    if (tiempoTranscurrido > info.tiempoMaximo) {
        usuariosDesconectados.delete(parseInt(userId));
        return null;
    }
    return info;
}

function limpiarDesconexionRapida(userId) {
    return usuariosDesconectados.delete(parseInt(userId));
}

// =============================================
// 🛡️ UTILIDADES
// =============================================
function validarDueloParaAbandono(duelo, userId) {
    if (!duelo) {
        return { valido: false, error: 'Duelo no encontrado', codigo: 'ERR_DUELO_NO_ENCONTRADO' };
    }
    if (!duelo.jugadores || !duelo.jugadores[userId]) {
        return { valido: false, error: 'No estás registrado', codigo: 'ERR_JUGADOR_NO_ENCONTRADO' };
    }
    if (duelo.estado === 'finalizado') {
        return { valido: false, error: 'Duelo ya finalizó', codigo: 'ERR_DUELO_FINALIZADO' };
    }
    return { valido: true };
}

function generarMensajeAdvertencia(apuesta, motivo, esDueloCarrera) {
    let porcentaje = PENALIZACIONES_RAPIDOS.RENDIRSE;
    let emoji = '⚠️';
    
    const penalizacion = Math.floor(apuesta * porcentaje);
    const tipoPuntos = esDueloCarrera ? 'de carrera' : 'globales';
    
    return {
        mensaje: `${emoji} Si abandonas:\n• Perderás ${penalizacion} puntos ${tipoPuntos}\n• Tu oponente ganará ${penalizacion} puntos\n• Se registrará como derrota`,
        penalizacion,
        gananciaOponente: penalizacion,
        porcentaje: porcentaje * 100,
        tipoPuntos
    };
}

async function limpiarDuelosAbandonados() {
    try {
        const [duelos] = await pool.query(`
            SELECT id_duelo FROM duelos 
            WHERE fecha_limite < DATE_SUB(NOW(), INTERVAL 7 DAY)
            AND estado NOT IN ('finalizado', 'abandonado')
        `);
        
        for (const d of duelos) {
            await pool.query('DELETE FROM duelos_preguntas WHERE id_duelo = ?', [d.id_duelo]);
            await pool.query('DELETE FROM duelos_respuestas WHERE id_duelo = ?', [d.id_duelo]);
            await pool.query('UPDATE duelos SET estado = ? WHERE id_duelo = ?', ['expirado', d.id_duelo]);
        }
        
        await pool.query(`DELETE FROM duelos_desconexiones WHERE timestamp_desconexion < DATE_SUB(NOW(), INTERVAL 7 DAY)`);
        
        console.log(`[LIMPIEZA] ✅ ${duelos.length} duelos limpiados`);
        return { limpios: duelos.length };
    } catch (error) {
        console.error('❌ Error limpiando:', error);
        throw error;
    }
}

// =============================================
// 📤 EXPORTAR
// =============================================
module.exports = {
    procesarAbandono48h,
    registrarDesconexion48h,
    restaurarDuelo48h,
    procesarAbandonoRapido,
    registrarDesconexionRapida,
    verificarReconexionRapida,
    limpiarDesconexionRapida,
    validarDueloParaAbandono,
    generarMensajeAdvertencia,
    limpiarDuelosAbandonados,
    MOTIVOS_ABANDONO,
    PENALIZACIONES_48H,
    PENALIZACIONES_RAPIDOS,
    TIEMPOS_48H,
    TIEMPOS_RAPIDOS
};