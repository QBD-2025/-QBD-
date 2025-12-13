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
        
        socket.on('duelo:confirmarRendicion', async (data) => {
            const { salaId, userId } = data;
            
            try {
                console.log(`[SOCKET] Procesando rendición de usuario ${userId} en sala ${salaId}`);
                
                await procesarAbandono48h(salaId, userId, MOTIVOS_ABANDONO.RENDIRSE, io);
                
                // Limpiar conexión
                usuariosConectados.delete(userId);
                
            } catch (error) {
                console.error('[SOCKET] Error procesando rendición:', error);
                socket.emit('duelo:error', {
                    mensaje: 'Error al procesar rendición',
                    error: error.message
                });
            }
        });
        
        // =============================================
        // ⚡ ABANDONO RÁPIDO (Cerrar navegador)
        // =============================================
        
        socket.on('duelo:abandonoRapido', async (data) => {
            const { salaId, userId } = data;
            
            try {
                console.log(`[SOCKET] Procesando abandono rápido de usuario ${userId}`);
                
                await procesarAbandono48h(salaId, userId, MOTIVOS_ABANDONO.NAVEGACION, io);
                
                // Limpiar conexión
                usuariosConectados.delete(userId);
                
            } catch (error) {
                console.error('[SOCKET] Error procesando abandono rápido:', error);
            }
        });
        
        // =============================================
        // 🔌 DESCONEXIÓN (Pérdida de conexión)
        // =============================================
        
        socket.on('disconnect', async () => {
            console.log(`[SOCKET] Usuario desconectado: ${socket.id}`);
            
            // Buscar usuario por socket ID
            let usuarioDesconectado = null;
            for (const [userId, info] of usuariosConectados.entries()) {
                if (info.socketId === socket.id) {
                    usuarioDesconectado = { userId, ...info };
                    break;
                }
            }
            
            if (!usuarioDesconectado) {
                console.log('[SOCKET] Usuario no encontrado en registro');
                return;
            }
            
            const { userId, salaId } = usuarioDesconectado;
            
            // Registrar desconexión con timer de 30 minutos
            usuariosDesconectados.set(userId, {
                salaId,
                timestamp: Date.now(),
                timeout: setTimeout(async () => {
                    console.log(`[SOCKET] ⏰ Timeout de reconexión para usuario ${userId}`);
                    
                    try {
                        // Aplicar penalización por timeout
                        await procesarAbandono48h(salaId, userId, MOTIVOS_ABANDONO.TIMEOUT, io);
                        
                        // Limpiar registros
                        usuariosDesconectados.delete(userId);
                        usuariosConectados.delete(userId);
                        
                    } catch (error) {
                        console.error('[SOCKET] Error en timeout de reconexión:', error);
                    }
                }, 30 * 60 * 1000) // 30 minutos
            });
            
            // Notificar al oponente sobre la desconexión
            io.to(salaId).emit('duelo:oponenteDesconectado', {
                userId,
                mensaje: 'Tu oponente se desconectó. Esperando reconexión (30 minutos)...',
                tiempoEspera: 30 * 60 // en segundos
            });
            
            // Registrar en base de datos
            try {
                await registrarDesconexion48h(userId, salaId, {});
                console.log(`[SOCKET] Desconexión registrada en BD para usuario ${userId}`);
            } catch (error) {
                console.error('[SOCKET] Error registrando desconexión:', error);
            }
            
            // Remover de usuarios conectados
            usuariosConectados.delete(userId);
        });
        
        // =============================================
        // 💬 EVENTOS ADICIONALES
        // =============================================
        
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