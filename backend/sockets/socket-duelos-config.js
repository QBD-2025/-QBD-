//sockets/socket-duelos-config.js
// =============================================
// 🔌 CONFIGURACIÓN DE SOCKET.IO PARA DUELOS
// =============================================

const { 
    procesarAbandono48h, 
    registrarDesconexion48h,
    MOTIVOS_ABANDONO 
} = require('./router/competitivo.router.js');

// Map para rastrear usuarios conectados
const usuariosConectados = new Map();
const usuariosDesconectados = new Map();

module.exports = function(io) {
    io.on('connection', (socket) => {
        console.log(`[SOCKET] Usuario conectado: ${socket.id}`);
        
        // =============================================
        // 🔐 AUTENTICACIÓN Y REGISTRO
        // =============================================
        
        socket.on('duelo:registrarUsuario', (data) => {
            const { userId, salaId } = data;
            
            // Unir usuario a sala específica
            socket.join(userId.toString());
            socket.join(salaId);
            
            // Registrar en mapa de usuarios conectados
            usuariosConectados.set(userId, {
                socketId: socket.id,
                salaId,
                timestamp: Date.now()
            });
            
            console.log(`[SOCKET] Usuario ${userId} registrado en sala ${salaId}`);
            
            // Si estaba desconectado, limpiar registro
            if (usuariosDesconectados.has(userId)) {
                const infoDesconexion = usuariosDesconectados.get(userId);
                
                // Notificar al oponente que reconectó
                io.to(infoDesconexion.salaId).emit('duelo:oponenteReconecto', {
                    userId,
                    mensaje: 'Tu oponente se ha reconectado'
                });
                
                usuariosDesconectados.delete(userId);
                console.log(`[SOCKET] Usuario ${userId} reconectado exitosamente`);
            }
        });
        
        // =============================================
        // 🚪 ABANDONO VOLUNTARIO
        // =============================================
        
        socket.on('duelo:confirmarRendicion', async ({ salaId, userId }) => {
            console.log('═══════════════════════════════════════════════════════════');
            console.log('[RENDICIÓN]: 🏳️ Usuario confirma rendición');
            console.log(`   - SalaId: ${salaId}`);
            console.log(`   - UserId: ${userId}`);
            console.log('═══════════════════════════════════════════════════════════');
            
            const duelo = activeDuels.get(salaId);
            
            if (!duelo) {
                console.error('[RENDICIÓN]: ❌ Duelo no encontrado');
                return socket.emit('duelo:errorCritico', {
                    mensaje: 'El duelo no está disponible',
                    codigo: 'ERR_DUELO_NO_ENCONTRADO'
                });
            }
            
            const jugador = duelo.jugadores[userId];
            const oponenteId = Object.keys(duelo.jugadores).find(id => id !== userId.toString());
            
            if (!jugador || !oponenteId || !duelo.jugadores[oponenteId]) {
                console.error('[RENDICIÓN]: ❌ Jugadores no válidos');
                return socket.emit('duelo:errorCritico', {
                    mensaje: 'Error al procesar rendición',
                    codigo: 'ERR_JUGADORES_NO_ENCONTRADOS'
                });
            }
            
            try {
                console.log('[RENDICIÓN]: 🔄 Procesando rendición...');
                
                // ✅ PROCESAR INMEDIATAMENTE (NO esperar timeout)
                await procesarAbandono(
                    salaId, 
                    userId, 
                    MOTIVOS_ABANDONO.RENDIRSE, // 30% penalización
                    io,
                    { esRendicion: true }
                );
                
                console.log('[RENDICIÓN]: ✅ Rendición procesada');
                console.log('═══════════════════════════════════════════════════════════');
                
            } catch (error) {
                console.error('[RENDICIÓN ERROR]:', error);
                socket.emit('duelo:errorCritico', {
                    mensaje: 'Error al procesar rendición.',
                    codigo: 'ERR_RENDICION_PROCESAMIENTO'
                });
            }
        });
            
        // =============================================
        // ⚡ ABANDONO RÁPIDO (Cerrar navegador)
        // =============================================
        
        socket.on('duelo:abandonoRapido', async ({ salaId, userId }) => {
            console.log('═══════════════════════════════════════════════════════════');
            console.log('[ABANDONO RÁPIDO]: 🚪 Navegador cerrado');
            console.log(`   - SalaId: ${salaId}`);
            console.log(`   - UserId: ${userId}`);
            console.log('═══════════════════════════════════════════════════════════');
            
            try {
                // ✅✅✅ PROCESAR INMEDIATAMENTE
                await procesarAbandono(
                    salaId, 
                    userId, 
                    MOTIVOS_ABANDONO.NAVEGACION, // 50% penalización
                    io
                );
                
                console.log('[ABANDONO RÁPIDO]: ✅ Procesado');
                console.log('═══════════════════════════════════════════════════════════');
                
            } catch (error) {
                console.error('[ABANDONO RÁPIDO ERROR]:', error);
            }
        });
    
        socket.on('disconnect', async () => {
            const userId = socket.userId;
            
            if (!userId) {
                console.log('[DISCONNECT]: Socket sin userId');
                return;
            }
            
            console.log('═══════════════════════════════════════════════════════════');
            console.log('[DISCONNECT]: 📡 Usuario desconectado');
            console.log(`   - UserId: ${userId}`);
            console.log(`   - SocketId: ${socket.id}`);
            console.log('═══════════════════════════════════════════════════════════');
            
            // ✅ BUSCAR SI ESTÁ EN ALGÚN DUELO ACTIVO
            let salaActiva = null;
            let dueloActivo = null;
            
            for (const [salaId, duelo] of activeDuels.entries()) {
                if (duelo.jugadores[userId]) {
                    salaActiva = salaId;
                    dueloActivo = duelo;
                    break;
                }
            }
            
            if (salaActiva && dueloActivo) {
                console.log('[DISCONNECT]: 🎮 Usuario en duelo activo');
                console.log(`   - Sala: ${salaActiva}`);
                
                const oponenteId = Object.keys(dueloActivo.jugadores).find(id => id !== userId.toString());
                const oponente = dueloActivo.jugadores[oponenteId];
                
                if (oponenteId && oponente) {
                    console.log(`[DISCONNECT]: 👤 Oponente: ${oponente.username}`);
                    
                    // ✅✅✅ PAUSAR DUELO (detener timer, bloquear botones)
                    pausarDuelo(salaActiva, dueloActivo, io);
                    
                    // ✅ NOTIFICAR AL OPONENTE
                    if (oponente.socketId) {
                        io.to(oponente.socketId).emit('duelo:oponenteDesconectado', {
                            mensaje: `${dueloActivo.jugadores[userId].username} se desconectó`,
                            tiempoEspera: 60,
                            username: dueloActivo.jugadores[userId].username
                        });
                        
                        console.log('[DISCONNECT]: ✅ Oponente notificado');
                    }
                    
                    // ✅ REGISTRAR DESCONEXIÓN (60s para reconectar)
                    registrarDesconexion(userId, salaActiva, dueloActivo);
                    console.log('[DISCONNECT]: ⏰ Timer de reconexión iniciado (60s)');
                    
                    // ✅✅✅ TIMER: Si no reconecta en 60s → TIMEOUT
                    dueloActivo.timeoutReconexion = setTimeout(async () => {
                        const infoDesconexion = usuariosDesconectados.get(parseInt(userId));
                        
                        if (infoDesconexion) {
                            console.log('═══════════════════════════════════════════════════════════');
                            console.log('[TIMEOUT RECONEXIÓN]: ⏰ Usuario NO reconectó a tiempo');
                            console.log(`   - UserId: ${userId}`);
                            console.log(`   - Sala: ${salaActiva}`);
                            console.log('═══════════════════════════════════════════════════════════');
                            
                            try {
                                // ✅ PROCESAR COMO TIMEOUT (40% penalización)
                                await procesarAbandono(
                                    salaActiva, 
                                    userId, 
                                    MOTIVOS_ABANDONO.TIMEOUT, // 40% penalización
                                    io
                                );
                                
                                console.log('[TIMEOUT]: ✅ Abandono por timeout procesado');
                                
                            } catch (error) {
                                console.error('[TIMEOUT ERROR]:', error);
                            }
                        }
                    }, 60000); // 60 segundos
                    
                }
            } else {
                console.log('[DISCONNECT]: ℹ️ Usuario NO en duelo activo');
                
                // Limpiar normalmente
                usuariosConectados.delete(parseInt(userId));
                usuariosEnPortalCompetitivo.delete(parseInt(userId));
                
                // Remover de pools
                poolCarreraFacil = poolCarreraFacil.filter(p => p.userId !== userId);
                poolCarreraNormal = poolCarreraNormal.filter(p => p.userId !== userId);
                poolCarreraDificil = poolCarreraDificil.filter(p => p.userId !== userId);
                poolGeneral = poolGeneral.filter(p => p.userId !== userId);
            }
            
            console.log('═══════════════════════════════════════════════════════════');
        });
        
        // ================================================================
        // ✅✅✅ HANDLER: RECONEXIÓN
        // ================================================================
        

        // =============================================
        // 🔌 DESCONEXIÓN (Pérdida de conexión)
        // =============================================
        
         socket.on('duelo:reconectar', async ({ salaId, userId }) => {
            console.log('═══════════════════════════════════════════════════════════');
            console.log('[RECONEXIÓN]: 🔄 Intento de reconexión');
            console.log(`   - SalaId: ${salaId}`);
            console.log(`   - UserId: ${userId}`);
            console.log('═══════════════════════════════════════════════════════════');
            
            const duelo = activeDuels.get(salaId);
            
            if (!duelo) {
                console.error('[RECONEXIÓN]: ❌ Duelo no encontrado');
                return socket.emit('duelo:noDisponible', {
                    mensaje: 'El duelo ya no está disponible'
                });
            }
            
            if (!duelo.jugadores[userId]) {
                console.error('[RECONEXIÓN]: ❌ Usuario no autorizado');
                return socket.emit('duelo:noAutorizado', {
                    mensaje: 'No tienes acceso a este duelo'
                });
            }
            
            console.log('[RECONEXIÓN]: ✅ Usuario autorizado');
            
            // ✅ ACTUALIZAR SOCKET
            duelo.jugadores[userId].socketId = socket.id;
            usuariosConectados.set(parseInt(userId), socket.id);
            
            // ✅✅✅ CANCELAR TIMEOUT DE ABANDONO
            if (duelo.timeoutReconexion) {
                console.log('[RECONEXIÓN]: 🧹 Cancelando timeout de abandono');
                clearTimeout(duelo.timeoutReconexion);
                duelo.timeoutReconexion = null;
            }
            
            // ✅ LIMPIAR DESCONEXIÓN
            limpiarDesconexion(userId);
            
            // ✅✅✅ REANUDAR DUELO (reactivar timer, desbloquear botones)
            const exito = reanudarDuelo(salaId, duelo, io);
            
            if (exito) {
                console.log('[RECONEXIÓN]: ✅ Duelo reanudado');
            } else {
                console.log('[RECONEXIÓN]: ⚠️ Esperando segundo jugador');
            }
            
            // ✅ ENVIAR ESTADO ACTUAL
            const oponenteId = Object.keys(duelo.jugadores).find(id => id !== userId.toString());
            
            socket.emit('duelo:estadoActual', {
                estado: duelo.estado,
                preguntaActual: duelo.preguntaActual,
                totalPreguntas: duelo.examen?.length || 0,
                puntuaciones: duelo.puntuaciones,
                rachas: {
                    [userId]: duelo.jugadores[userId].racha,
                    [oponenteId]: duelo.jugadores[oponenteId].racha
                },
                oponente: {
                    username: duelo.jugadores[oponenteId].username,
                    foto_perfil: duelo.jugadores[oponenteId].foto_perfil
                },
                apuesta: duelo.apuesta,
                bloqueado: duelosBloqueados.has(salaId),
                mensaje: '✅ Reconectado exitosamente'
            });
            
            // ✅ NOTIFICAR AL OPONENTE
            if (duelo.jugadores[oponenteId]?.socketId) {
                io.to(duelo.jugadores[oponenteId].socketId).emit('duelo:oponenteReconectado', {
                    mensaje: `${duelo.jugadores[userId].username} se reconectó`,
                    username: duelo.jugadores[userId].username
                });
            }
            
            console.log('[RECONEXIÓN]: ✅ Proceso completado');
            console.log('═══════════════════════════════════════════════════════════');
        });
        // Notificar actividad (para detectar AFK)
        socket.on('duelo:actividad', (data) => {
            const { userId } = data;
            
            if (usuariosConectados.has(userId)) {
                const info = usuariosConectados.get(userId);
                info.ultimaActividad = Date.now();
                usuariosConectados.set(userId, info);
            }
        });
        
        // Ping para mantener conexión viva
        socket.on('ping', () => {
            socket.emit('pong');
        });
    });
    
    // =============================================
    // ⏰ VERIFICACIÓN PERIÓDICA DE AFK
    // =============================================
    
    setInterval(() => {
        const ahora = Date.now();
        const TIEMPO_AFK = 2 * 60 * 60 * 1000; // 2 horas
        
        for (const [userId, info] of usuariosConectados.entries()) {
            const tiempoInactivo = ahora - (info.ultimaActividad || info.timestamp);
            
            if (tiempoInactivo > TIEMPO_AFK) {
                console.log(`[SOCKET] ⚠️ Usuario ${userId} AFK detectado (${Math.floor(tiempoInactivo / 1000 / 60)} min)`);
                
                // Emitir advertencia
                io.to(userId.toString()).emit('duelo:advertenciaAFK', {
                    mensaje: 'Has estado inactivo por mucho tiempo. El duelo se abandonará automáticamente si no respondes.',
                    tiempoRestante: 5 * 60 // 5 minutos más
                });
                
                // Programar expulsión si no hay actividad en 5 minutos más
                setTimeout(async () => {
                    if (usuariosConectados.has(userId)) {
                        const infoActualizada = usuariosConectados.get(userId);
                        const nuevoTiempo = Date.now() - (infoActualizada.ultimaActividad || infoActualizada.timestamp);
                        
                        if (nuevoTiempo > TIEMPO_AFK + (5 * 60 * 1000)) {
                            console.log(`[SOCKET] 🚨 Expulsando usuario ${userId} por AFK`);
                            
                            try {
                                await procesarAbandono48h(info.salaId, userId, MOTIVOS_ABANDONO.AFK, io);
                                
                                // Desconectar socket
                                const socket = io.sockets.sockets.get(info.socketId);
                                if (socket) {
                                    socket.disconnect(true);
                                }
                                
                                usuariosConectados.delete(userId);
                                
                            } catch (error) {
                                console.error('[SOCKET] Error expulsando usuario AFK:', error);
                            }
                        }
                    }
                }, 5 * 60 * 1000);
            }
        }
    }, 60 * 1000); // Verificar cada minuto
    
    console.log('[SOCKET] ✅ Sistema de duelos configurado correctamente');
};

// Exportar mapas para uso en otras partes del servidor
module.exports.usuariosConectados = usuariosConectados;
module.exports.usuariosDesconectados = usuariosDesconectados;