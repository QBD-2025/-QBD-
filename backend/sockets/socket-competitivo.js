// src/sockets/modo_competitivo/socket-competitivo.js (COMPLETO Y CORREGIDO)
const db = require('../db/conexion');
const { v4: uuidv4 } = require('uuid');

const ESTADOS_SALA = {
    ESPERANDO_INVITACION: 'esperando_aceptacion',
    ACEPTADA: 'aceptada', 
    CONECTANDO: 'conectando',
    LISTA: 'lista',
    EN_JUEGO: 'en_juego',
    EXPIRADA: 'expirada',
    CANCELADA: 'cancelada',
    PENDIENTE: 'pendiente'
};

// Pools de matchmaking
let poolCarreraFacil = [];
let poolCarreraNormal = [];
let poolCarreraDificil = [];
let poolGeneral = [];

// Maps para gestionar salas y usuarios
const salasEspera = new Map();
const activeDuels = new Map();
const usuariosConectados = new Map();
const usuariosEnPortalCompetitivo = new Set();
const desafiosPendientes = new Map();
const salasPendientes = new Map();

// Hacer disponible globalmente
global.usuariosConectados = usuariosConectados;
global.usuariosEnPortalCompetitivo = usuariosEnPortalCompetitivo;
global.salasPendientes = salasPendientes;
global.salasEspera = salasEspera;

// ================================================================
// FUNCIÓN AUXILIAR: Verificar e iniciar duelo si ambos están listos
// ================================================================
async function verificarEIniciarDuelo(salaId, io) {
    const sala = salasPendientes.get(salaId) || salasEspera.get(salaId);
    
    if (!sala) {
        console.error(`[VERIFICAR DUELO]: Sala ${salaId} no encontrada`);
        return false;
    }

    console.log(`[VERIFICAR DUELO]: Sala ${salaId}`);
    console.log(`  - Estado: ${sala.estado}`);
    console.log(`  - Jugadores conectados: ${sala.jugadoresConectados?.size || 0}/2`);
    console.log(`  - IDs conectados:`, Array.from(sala.jugadoresConectados || []));
    console.log(`  - Duelo creado: ${sala.dueloCreado}`);

    // Verificar estado válido
    const estadosValidos = ['aceptada', 'pendiente', 'esperando_aceptacion', ESTADOS_SALA.ACEPTADA, ESTADOS_SALA.PENDIENTE];
    
    if (!estadosValidos.includes(sala.estado)) {
        console.log(`[VERIFICAR DUELO]: Estado no válido: ${sala.estado}`);
        return false;
    }

    // Verificar que ambos jugadores estén conectados
    if (!sala.jugadoresConectados || sala.jugadoresConectados.size < 2) {
        console.log(`[VERIFICAR DUELO]: Faltan jugadores (${sala.jugadoresConectados?.size || 0}/2)`);
        return false;
    }

    // Evitar duplicación
    if (sala.dueloCreado) {
        console.log(`[VERIFICAR DUELO]: Duelo ya fue creado para sala ${salaId}`);
        return false;
    }

    // Marcar como creado inmediatamente para evitar duplicados
    sala.dueloCreado = true;
    sala.estado = 'en_juego';
    salasPendientes.set(salaId, sala);
    salasEspera.set(salaId, sala);

    console.log(`[VERIFICAR DUELO]: ✅ Iniciando creación de duelo para sala ${salaId}`);

    try {
        const retadorId = parseInt(sala.retador || sala.idRetador);
        const retadoId = parseInt(sala.retado || sala.idRetado);

        console.log(`[CREAR DUELO]: IDs - Retador: ${retadorId}, Retado: ${retadoId}`);

        // Cargar datos de BD
        const [retadorData] = await db.query(
            'SELECT id_usuario, username, foto_perfil from usuario WHERE id_usuario = ?', 
            [retadorId]
        );
        
        const [retadoData] = await db.query(
            'SELECT id_usuario, username, foto_perfil from usuario WHERE id_usuario = ?', 
            [retadoId]
        );

        if (retadorData.length === 0 || retadoData.length === 0) {
            throw new Error('Usuario no encontrado en BD');
        }

        // Obtener sockets actualizados
        const retadorSocketId = usuariosConectados.get(retadorId);
        const retadoSocketId = usuariosConectados.get(retadoId);

        console.log(`[CREAR DUELO]: Sockets - Retador: ${retadorSocketId}, Retado: ${retadoSocketId}`);

        if (!retadorSocketId || !retadoSocketId) {
            throw new Error(`Sockets no encontrados - Retador: ${retadorSocketId}, Retado: ${retadoSocketId}`);
        }

        // Obtener objetos socket
        const socketA = io.sockets.sockets.get(retadorSocketId);
        const socketB = io.sockets.sockets.get(retadoSocketId);

        if (!socketA || !socketB) {
            throw new Error('No se pudieron obtener los objetos socket');
        }

        // Unir a la sala de Socket.IO
        socketA.join(salaId);
        socketB.join(salaId);

        console.log(`[CREAR DUELO]: Sockets unidos a sala ${salaId}`);

        // Crear duelo en activeDuels
        activeDuels.set(salaId, {
            modo: sala.modo || 'general',
            jugadores: {
                [retadorId]: { 
                    ...retadorData[0], 
                    socketId: retadorSocketId, 
                    listo: false, 
                    racha: 0 
                },
                [retadoId]: { 
                    ...retadoData[0], 
                    socketId: retadoSocketId, 
                    listo: false, 
                    racha: 0 
                }
            },
            estado: 'minidraft_start',
            puntuaciones: { [retadorId]: 0, [retadoId]: 0 },
            selecciones: {},
            esInvitacion: true,
            fechaCreacion: new Date()
        });

        console.log(`[CREAR DUELO]: ✅ Duelo creado en activeDuels para sala ${salaId}`);

        // Limpiar timeout
        if (sala.timeoutId) {
            clearTimeout(sala.timeoutId);
        }
        
        // Emitir evento de duelo listo
        io.to(salaId).emit('duelo:dueloListo', { salaId });
        
        console.log(`[CREAR DUELO]: ✅ Evento duelo:dueloListo emitido a sala ${salaId}`);

        return true;

    } catch (error) {
        console.error(`[CREAR DUELO ERROR]:`, error);
        
        // Revertir flags
        sala.dueloCreado = false;
        sala.estado = 'aceptada';
        salasPendientes.set(salaId, sala);
        salasEspera.set(salaId, sala);
        
        io.to(salaId).emit('sala:error', { 
            mensaje: 'Error al iniciar duelo: ' + error.message 
        });
        
        return false;
    }
}

// ================================================================
// FUNCIÓN: Crear sala pendiente para notificaciones BD
// ================================================================
global.crearSalaPendiente = function(idRetador, idRetado, io) {
    const salaId = uuidv4();
    
    const salaPendiente = {
        salaId,
        retador: parseInt(idRetador),
        retado: parseInt(idRetado),
        idRetador: parseInt(idRetador),
        idRetado: parseInt(idRetado),
        estado: ESTADOS_SALA.PENDIENTE,
        timestamp: Date.now(),
        jugadoresConectados: new Set(),
        jugadoresAceptados: new Set(),
        dueloCreado: false,
        tipo: 'notificacion_bd',
        modo: 'general'
    };
    
    salasPendientes.set(salaId, salaPendiente);
    salasEspera.set(salaId, salaPendiente);
    
    console.log(`[SALA PENDIENTE BD]: Creada ${salaId} | Retador: ${idRetador} → Retado: ${idRetado}`);
    
    // Timeout de 3 minutos
    const timeoutId = setTimeout(() => {
        const sala = salasPendientes.get(salaId);
        if (sala && (sala.estado === ESTADOS_SALA.PENDIENTE || sala.estado === ESTADOS_SALA.ESPERANDO_INVITACION)) {
            salasPendientes.delete(salaId);
            salasEspera.delete(salaId);
            console.log(`[SALA PENDIENTE BD]: Expiró ${salaId}`);
            
            const retadorSocket = usuariosConectados.get(parseInt(idRetador));
            const retadoSocket = usuariosConectados.get(parseInt(idRetado));
            
            if (retadorSocket) {
                io.to(retadorSocket).emit('desafio:expirado', {
                    mensaje: 'Tu desafío expiró (3 minutos sin respuesta)'
                });
            }
            
            if (retadoSocket) {
                io.to(retadoSocket).emit('desafio:expirado', {
                    mensaje: 'El desafío que recibiste expiró'
                });
            }
        }
    }, 180000);
    
    salaPendiente.timeoutId = timeoutId;
    
    return salaId;
};

// ================================================================
// FUNCIÓN: Crear duelo para matchmaking
// ================================================================
function crearDuelo(jugadorA, jugadorB, modo, io, esInvitacion = false) {
    const salaId = uuidv4();
    console.log(`${esInvitacion ? 'Duelo por invitación' : 'Matchmaking'} (${modo}): ${jugadorA.user.username} vs ${jugadorB.user.username}. Sala: ${salaId}`);
    
    const socketA = io.sockets.sockets.get(jugadorA.socketId);
    const socketB = io.sockets.sockets.get(jugadorB.socketId);
    
    if (socketA && socketB) {
        socketA.join(salaId);
        socketB.join(salaId);
        
        activeDuels.set(salaId, {
            modo: modo,
            jugadores: {
                [jugadorA.userId]: { 
                    ...jugadorA.user, 
                    socketId: jugadorA.socketId, 
                    listo: false, 
                    racha: 0 
                },
                [jugadorB.userId]: { 
                    ...jugadorB.user, 
                    socketId: jugadorB.socketId, 
                    listo: false, 
                    racha: 0 
                }
            },
            estado: 'minidraft_start',
            puntuaciones: { [jugadorA.userId]: 0, [jugadorB.userId]: 0 },
            selecciones: {},
            esInvitacion: esInvitacion,
            fechaCreacion: new Date()
        });
        
        io.to(jugadorA.socketId).emit('duelo:iniciarDesafio', { salaId });
        io.to(jugadorB.socketId).emit('duelo:iniciarDesafio', { salaId });
        
        console.log(`[CREAR DUELO]: ✅ Duelo ${salaId} creado y notificado a ambos jugadores`);
    } else {
        console.error(`[CREAR DUELO]: No se pudieron obtener los sockets para crear el duelo.`);
        // Devolver jugadores a la pool si no se pudo crear el duelo
        if (modo === 'general') {
            poolGeneral.unshift(jugadorA, jugadorB);
        } else {
            // Determinar qué pool de carrera usar
            let pool;
            if (jugadorA.dificultad === 'facil') pool = poolCarreraFacil;
            else if (jugadorA.dificultad === 'normal') pool = poolCarreraNormal;
            else pool = poolCarreraDificil;
            pool.unshift(jugadorA, jugadorB);
        }
    }
}

// ================================================================
// FUNCIÓN: Buscar parejas en las colas (MEJORADA)
// ================================================================
function buscarPareja(pool, modo) {
    console.log(`[MATCHMAKING ${modo}]: Buscando pareja. En cola: ${pool.length}`);
    
    if (pool.length >= 2) {
        const jugadorA = pool.shift();
        const jugadorB = pool.shift();
        
        // Verificar que ambos sigan conectados
        const socketA = io.sockets.sockets.get(jugadorA.socketId);
        const socketB = io.sockets.sockets.get(jugadorB.socketId);
        
        if (socketA && socketB && socketA.connected && socketB.connected) {
            console.log(`[MATCHMAKING ${modo}]: ✅ Pareja encontrada - ${jugadorA.user.username} vs ${jugadorB.user.username}`);
            crearDuelo(jugadorA, jugadorB, modo, io);
        } else {
            console.log(`[MATCHMAKING ${modo}]: ❌ Uno o ambos jugadores desconectados, devolviendo a cola`);
            // Devolver a la cola solo los que estén conectados
            if (socketA && socketA.connected) pool.unshift(jugadorA);
            if (socketB && socketB.connected) pool.unshift(jugadorB);
        }
    } else {
        console.log(`[MATCHMAKING ${modo}]: Esperando más jugadores... (${pool.length}/2)`);
    }
}

// ================================================================
// FUNCIÓN: Verificar colas periódicamente (NUEVA)
// ================================================================
function verificarColasPeriodicamente(io) {
    setInterval(() => {
        console.log(`[ESTADO COLAS]: 
            General: ${poolGeneral.length}
            Carrera Fácil: ${poolCarreraFacil.length}
            Carrera Normal: ${poolCarreraNormal.length}
            Carrera Difícil: ${poolCarreraDificil.length}
            Duelos Activos: ${activeDuels.size}
            Usuarios Conectados: ${usuariosConectados.size}`
        );
        
        // Forzar búsqueda de parejas periódicamente
        buscarPareja(poolGeneral, 'general');
        buscarPareja(poolCarreraFacil, 'carrera');
        buscarPareja(poolCarreraNormal, 'carrera');
        buscarPareja(poolCarreraDificil, 'carrera');
        
    }, 5000); // Cada 5 segundos
}

// ================================================================
// FUNCIÓN: Actualizar puntos de carrera
// ================================================================
async function actualizarPuntosCarrera(userId, puntosObtenidos, modo) {
    try {
        if (modo === 'carrera') {
            const [carreraUsuario] = await db.query(
                'SELECT id_carrera from usuario_carrera WHERE id_usuario = ?', 
                [userId]
            );

            if (carreraUsuario.length > 0) {
                const idCarrera = carreraUsuario[0].id_carrera;
                
                const [puntosExistentes] = await db.query(
                    'SELECT puntos from usuario_puntos_carrera WHERE id_usuario = ? AND id_carrera = ?',
                    [userId, idCarrera]
                );

                if (puntosExistentes.length > 0) {
                    await db.query(
                        'UPDATE usuario_puntos_carrera SET puntos = puntos + ? WHERE id_usuario = ? AND id_carrera = ?',
                        [puntosObtenidos, userId, idCarrera]
                    );
                } else {
                    await db.query(
                        'INSERT INTO usuario_puntos_carrera (id_usuario, id_carrera, puntos) VALUES (?, ?, ?)',
                        [userId, idCarrera, puntosObtenidos]
                    );
                }
            }
        } else {
            const [carrerasUsuario] = await db.query(
                'SELECT id_carrera from usuario_carrera WHERE id_usuario = ?', 
                [userId]
            );

            for (const carrera of carrerasUsuario) {
                const idCarrera = carrera.id_carrera;
                
                const [puntosExistentes] = await db.query(
                    'SELECT puntos from usuario_puntos_carrera WHERE id_usuario = ? AND id_carrera = ?',
                    [userId, idCarrera]
                );

                if (puntosExistentes.length > 0) {
                    await db.query(
                        'UPDATE usuario_puntos_carrera SET puntos = puntos + ? WHERE id_usuario = ? AND id_carrera = ?',
                        [puntosObtenidos, userId, idCarrera]
                    );
                } else {
                    await db.query(
                        'INSERT INTO usuario_puntos_carrera (id_usuario, id_carrera, puntos) VALUES (?, ?, ?)',
                        [userId, idCarrera, puntosObtenidos]
                    );
                }
            }
        }
    } catch (error) {
        console.error(`[ERROR PUNTOS]: Usuario ${userId}:`, error);
    }
}

// ================================================================
// FUNCIÓN: Calcular bonus de puntos
// ================================================================
function calcularBonusPuntos(puntuacionFinal, totalPreguntas, esGanador) {
    let bonus = 0;
    if (esGanador) bonus += 100;
    
    const porcentaje = (puntuacionFinal / (totalPreguntas * 100)) * 100;
    if (porcentaje >= 90) bonus += 50;
    else if (porcentaje >= 75) bonus += 30;
    else if (porcentaje >= 50) bonus += 15;
    
    return bonus;
}

// ================================================================
// CLEANUP: Salas expiradas
// ================================================================
setInterval(() => {
    const ahora = Date.now();
    const TIMEOUT = 5 * 60 * 1000;
    
    for (const [salaId, sala] of salasEspera.entries()) {
        if (ahora - sala.timestamp > TIMEOUT) {
            salasEspera.delete(salaId);
            console.log(`[CLEANUP]: Sala ${salaId} eliminada`);
        }
    }
}, 5 * 60 * 1000);

// ================================================================
// MÓDULO PRINCIPAL - EVENTOS DE SOCKET
// ================================================================
module.exports = (io, socket) => {
    console.log(`[NUEVA CONEXIÓN]: Socket ${socket.id} conectado`);
    
    // Iniciar verificación periódica de colas
    if (!global.colasIniciadas) {
        verificarColasPeriodicamente(io);
        global.colasIniciadas = true;
    }
    
    // ============================================================
    // REGISTRO DE USUARIO
    // ============================================================
    socket.on('usuario:registrar', (userId) => {
        if (!userId) return;
        
        const userIdInt = parseInt(userId);
        usuariosConectados.set(userIdInt, socket.id);
        socket.userId = userIdInt;
        console.log(`[REGISTRO]: Usuario ${userIdInt} registrado con socket ${socket.id}`);
    });

    socket.on('competitivo:entrarPortal', (userId) => {
        if (!userId) return;
        
        const userIdInt = parseInt(userId);
        usuariosEnPortalCompetitivo.add(userIdInt);
        usuariosConectados.set(userIdInt, socket.id);
        socket.userId = userIdInt;
        
        console.log(`[PORTAL]: Usuario ${userIdInt} entró. Total: ${usuariosEnPortalCompetitivo.size}`);
    });

    socket.on('competitivo:salirPortal', (userId) => {
        if (!userId) return;
        
        const userIdInt = parseInt(userId);
        usuariosEnPortalCompetitivo.delete(userIdInt);
        console.log(`[PORTAL]: Usuario ${userIdInt} salió. Total: ${usuariosEnPortalCompetitivo.size}`);
    });

    // ============================================================
    // MATCHMAKING NORMAL - CORREGIDO
    // ============================================================
    socket.on('duelo:buscar:general', (userData) => {
        try {
            console.log('[MATCHMAKING GENERAL]: Usuario buscando:', userData);
            
            // Verificar que el usuario esté conectado
            if (!usuariosConectados.has(userData.id_usuario)) {
                console.error(`[MATCHMAKING GENERAL]: Usuario ${userData.id_usuario} no está conectado`);
                return socket.emit('duelo:error', { 
                    mensaje: 'Error de conexión. Recarga la página.' 
                });
            }

            // Evitar duplicados
            if (poolGeneral.some(p => p.userId === userData.id_usuario)) {
                console.log(`[MATCHMAKING GENERAL]: Usuario ${userData.id_usuario} ya está en cola`);
                return socket.emit('duelo:enCola', { 
                    mensaje: 'Ya estás en cola de búsqueda.', 
                    enCola: true 
                });
            }

            const jugador = { 
                userId: userData.id_usuario, 
                user: userData, 
                socketId: socket.id 
            };

            poolGeneral.push(jugador);
            console.log(`[MATCHMAKING GENERAL]: ${userData.username} en cola. Total: ${poolGeneral.length}`);
            
            // Buscar pareja inmediatamente
            buscarPareja(poolGeneral, 'general');
            
            socket.emit('duelo:enCola', { 
                mensaje: 'Buscando oponente...', 
                enCola: true 
            });

        } catch (error) {
            console.error('[MATCHMAKING GENERAL ERROR]:', error);
            socket.emit('duelo:error', { 
                mensaje: 'Error al buscar partida: ' + error.message 
            });
        }
    });

    socket.on('duelo:buscar:carrera', async ({ user, dificultad }) => {
        try {
            console.log('[MATCHMAKING CARRERA]: Usuario buscando:', user.username, 'Dificultad:', dificultad);
            
            // Verificar carrera
            const [[{ count }]] = await db.query(
                'SELECT COUNT(*) as count from usuario_carrera WHERE id_usuario = ?', 
                [user.id_usuario]
            );
            
            if (count === 0) {
                return socket.emit('duelo:error:sinCarrera', { 
                    mensaje: 'Debes registrar una carrera en tu perfil.' 
                });
            }

            let pool;
            if (dificultad === 'facil') pool = poolCarreraFacil;
            else if (dificultad === 'normal') pool = poolCarreraNormal;
            else if (dificultad === 'dificil') pool = poolCarreraDificil;
            else {
                return socket.emit('duelo:error', { 
                    mensaje: 'Dificultad no válida.' 
                });
            }

            // Evitar duplicados
            if (pool.some(p => p.userId === user.id_usuario)) {
                console.log(`[MATCHMAKING CARRERA]: Usuario ${user.id_usuario} ya está en cola`);
                return socket.emit('duelo:enCola', { 
                    mensaje: `Ya estás en cola de carrera ${dificultad}.`, 
                    enCola: true 
                });
            }

            const jugador = { 
                userId: user.id_usuario, 
                user, 
                socketId: socket.id, 
                dificultad 
            };

            pool.push(jugador);
            console.log(`[MATCHMAKING CARRERA]: ${user.username} en cola ${dificultad}. Total: ${pool.length}`);
            
            // Buscar pareja inmediatamente
            buscarPareja(pool, 'carrera');
            
            socket.emit('duelo:enCola', { 
                mensaje: `Buscando oponente en ${dificultad}...`, 
                enCola: true 
            });

        } catch (error) {
            console.error("[MATCHMAKING CARRERA ERROR]:", error);
            socket.emit('duelo:error', { 
                mensaje: 'Error al buscar partida: ' + error.message 
            });
        }
    });
    
    socket.on('duelo:cancelarBusqueda', (userId) => {
        const userIdInt = parseInt(userId);
        
        // Remover de todas las pools
        poolCarreraFacil = poolCarreraFacil.filter(p => p.userId !== userIdInt);
        poolCarreraNormal = poolCarreraNormal.filter(p => p.userId !== userIdInt);
        poolCarreraDificil = poolCarreraDificil.filter(p => p.userId !== userIdInt);
        poolGeneral = poolGeneral.filter(p => p.userId !== userIdInt);
        
        console.log(`[MATCHMAKING]: Usuario ${userId} canceló búsqueda`);
        socket.emit('duelo:busquedaCancelada', { 
            mensaje: 'Búsqueda cancelada.' 
        });
    });

    // ============================================================
    // 📨 INVITACIÓN DE LOBBY
    // ============================================================
    socket.on('duelo:invitarLobby', async ({ idOponente, usernameOponente }) => {
        const idRetador = socket.userId;
        
        if (!idRetador || idRetador === parseInt(idOponente)) {
            return socket.emit('duelo:invitacionLobbyError', { 
                mensaje: 'No puedes desafiarte a ti mismo.' 
            });
        }

        try {
            // Obtener datos del retador
            const [retadorData] = await db.query(
                'SELECT username, foto_perfil from usuario WHERE id_usuario = ?', 
                [idRetador]
            );
            
            if (retadorData.length === 0) {
                return socket.emit('duelo:invitacionLobbyError', { 
                    mensaje: 'Error: Usuario no encontrado.' 
                });
            }

            const usernameRetador = retadorData[0].username;
            const fotoRetador = retadorData[0].foto_perfil;
            const oponenteSocketId = usuariosConectados.get(parseInt(idOponente));
            
            // Verificar que el oponente esté conectado
            if (!oponenteSocketId) {
                return socket.emit('duelo:invitacionLobbyError', { 
                    mensaje: `${usernameOponente} no está conectado.` 
                });
            }

            // Verificar que el oponente esté en el portal competitivo
            if (!usuariosEnPortalCompetitivo.has(parseInt(idOponente))) {
                return socket.emit('duelo:invitacionLobbyError', { 
                    mensaje: `${usernameOponente} no está en el portal competitivo.` 
                });
            }

            const salaId = uuidv4();
            const timestamp = Date.now();

            // ✅ CREAR SALA TEMPORAL (solo para tracking)
            const nuevaSala = {
                salaId,
                idRetador: parseInt(idRetador),
                idRetado: parseInt(idOponente),
                retador: parseInt(idRetador),
                retado: parseInt(idOponente),
                usernameRetador,
                usernameRetado: usernameOponente,
                estado: ESTADOS_SALA.ESPERANDO_INVITACION,
                timestamp,
                tipo: 'lobby_directo',
                modo: 'general'
            };

            salasEspera.set(salaId, nuevaSala);

            console.log(`[LOBBY]: ✅ Sala ${salaId} creada - ${usernameRetador} → ${usernameOponente}`);

            // Enviar invitación al oponente
            io.to(oponenteSocketId).emit('duelo:recibirInvitacionLobby', {
                mensaje: `${usernameRetador} te desafía a un duelo!`,
                id_retador: idRetador,
                username_retador: usernameRetador,
                foto_retador: fotoRetador,
                salaId,
                timestamp
            });
            
            // Confirmar al retador
            socket.emit('duelo:invitacionLobbyEnviada', { 
                mensaje: `Invitación enviada a ${usernameOponente}. Esperando respuesta...`,
                salaId
            });

            // Timeout de 30 segundos
            const timeoutId = setTimeout(() => {
                const sala = salasEspera.get(salaId);
                if (sala && sala.estado === ESTADOS_SALA.ESPERANDO_INVITACION) {
                    sala.estado = ESTADOS_SALA.EXPIRADA;
                    salasEspera.delete(salaId);
                    
                    console.log(`[LOBBY]: Invitación ${salaId} expiró`);
                    
                    socket.emit('duelo:invitacionExpirada', { 
                        mensaje: 'La invitación expiró sin respuesta (30 segundos).' 
                    });
                    
                    const currentOponenteSocketId = usuariosConectados.get(parseInt(idOponente));
                    if (currentOponenteSocketId) {
                        io.to(currentOponenteSocketId).emit('duelo:invitacionExpirada', { 
                            mensaje: 'Desafío expiró.' 
                        });
                    }
                }
            }, 30000);
            
            nuevaSala.timeoutId = timeoutId;

        } catch (error) {
            console.error('[LOBBY ERROR]:', error);
            socket.emit('duelo:invitacionLobbyError', { 
                mensaje: 'Error del servidor: ' + error.message 
            });
        }
    });

    // ============================================================
    // ✅ ACEPTAR INVITACIÓN - SOLUCIÓN A (Iniciar duelo directo)
    // ============================================================
    socket.on('duelo:aceptarInvitacionLobby', async ({ salaId }) => {
        const idRetado = socket.userId;
        
        if (!idRetado) {
            return socket.emit('duelo:error', { 
                mensaje: 'Usuario no identificado.' 
            });
        }

        console.log(`[LOBBY]: Usuario ${idRetado} acepta invitación ${salaId}`);

        const sala = salasEspera.get(salaId);
        
        if (!sala) {
            return socket.emit('duelo:error', { 
                mensaje: 'Invitación no encontrada o expiró.' 
            });
        }

        // Verificar que el usuario sea el retado
        if (sala.idRetado !== idRetado && sala.retado !== idRetado) {
            return socket.emit('duelo:error', { 
                mensaje: 'No tienes permiso para aceptar esta invitación.' 
            });
        }

        // Verificar estado de la sala
        if (sala.estado !== ESTADOS_SALA.ESPERANDO_INVITACION) {
            return socket.emit('duelo:error', { 
                mensaje: 'Esta invitación ya no está disponible.' 
            });
        }

        try {
            // Limpiar timeout
            if (sala.timeoutId) {
                clearTimeout(sala.timeoutId);
                sala.timeoutId = null;
            }

            const retadorId = sala.idRetador || sala.retador;
            const retadorSocketId = usuariosConectados.get(retadorId);
            
            // Verificar que ambos estén conectados
            if (!retadorSocketId) {
                console.error(`[LOBBY]: Retador ${retadorId} desconectado`);
                return socket.emit('duelo:error', { 
                    mensaje: 'El retador ya no está conectado.' 
                });
            }

            // ✅ OBTENER DATOS DE BD PARA AMBOS JUGADORES
            const [retadorData] = await db.query(
                'SELECT id_usuario, username, foto_perfil from usuario WHERE id_usuario = ?', 
                [retadorId]
            );
            
            const [retadoData] = await db.query(
                'SELECT id_usuario, username, foto_perfil from usuario WHERE id_usuario = ?', 
                [idRetado]
            );

            if (retadorData.length === 0 || retadoData.length === 0) {
                throw new Error('Usuario no encontrado en BD');
            }

            console.log(`[LOBBY]: ✅ Invitación ${salaId} aceptada - Creando duelo`);

            // ✅ UNIR SOCKETS A LA SALA
            const socketRetador = io.sockets.sockets.get(retadorSocketId);
            const socketRetado = socket;

            if (socketRetador && socketRetado) {
                socketRetador.join(salaId);
                socketRetado.join(salaId);
                console.log(`[LOBBY]: Sockets unidos a sala ${salaId}`);
            }

            // ✅ CREAR DUELO EN activeDuels (igual que matchmaking)
            activeDuels.set(salaId, {
                modo: 'general',
                jugadores: {
                    [retadorId]: { 
                        ...retadorData[0], 
                        socketId: retadorSocketId, 
                        listo: false, 
                        racha: 0 
                    },
                    [idRetado]: { 
                        ...retadoData[0], 
                        socketId: socket.id, 
                        listo: false, 
                        racha: 0 
                    }
                },
                estado: 'esperando_listos',
                puntuaciones: { [retadorId]: 0, [idRetado]: 0 },
                selecciones: {},
                esInvitacion: true,
                fechaCreacion: new Date()
            });

            console.log(`[LOBBY]: ✅ Duelo creado en activeDuels`);

            // ✅ EMITIR duelo:iniciarDesafio (IGUAL QUE MATCHMAKING)
            io.to(retadorSocketId).emit('duelo:iniciarDesafio', { salaId });
            socket.emit('duelo:iniciarDesafio', { salaId });

            console.log(`[LOBBY]: ✅ Eventos duelo:iniciarDesafio emitidos`);

            // Limpiar sala temporal de salasEspera
            salasEspera.delete(salaId);

        } catch (error) {
            console.error('[LOBBY ACEPTAR ERROR]:', error);
            socket.emit('duelo:error', { 
                mensaje: 'Error al aceptar la invitación: ' + error.message 
            });
        }
    });

    // ============================================================
    // ❌ RECHAZAR INVITACIÓN
    // ============================================================
    socket.on('duelo:rechazarInvitacionLobby', ({ salaId }) => {
        const idRetado = socket.userId;
        
        console.log(`[LOBBY]: Usuario ${idRetado} rechaza invitación ${salaId}`);

        const sala = salasEspera.get(salaId);
        
        if (!sala) {
            return socket.emit('duelo:error', { 
                mensaje: 'Invitación no encontrada.' 
            });
        }

        if (sala.idRetado !== idRetado && sala.retado !== idRetado) {
            return socket.emit('duelo:error', { 
                mensaje: 'No tienes permiso para rechazar esta invitación.' 
            });
        }

        // Limpiar timeout
        if (sala.timeoutId) {
            clearTimeout(sala.timeoutId);
        }

        // Notificar al retador
        const retadorSocketId = usuariosConectados.get(sala.idRetador);
        if (retadorSocketId) {
            io.to(retadorSocketId).emit('duelo:invitacionLobbyRechazada', {
                mensaje: `${sala.usernameRetado} rechazó tu invitación.`
            });
        }

        // Limpiar sala
        sala.estado = ESTADOS_SALA.CANCELADA;
        salasEspera.delete(salaId);

        console.log(`[LOBBY]: Invitación ${salaId} rechazada y eliminada`);

        socket.emit('duelo:invitacionRechazada', { 
            mensaje: 'Invitación rechazada.' 
        });
    });

    // ============================================================
    // EVENTO CRÍTICO: sala:unirse
    // ============================================================
    socket.on('sala:unirse', async ({ salaId }) => {
        const userId = socket.userId;
        
        if (!userId) {
            console.error(`[SALA ${salaId}]: Usuario sin ID intentó unirse`);
            return socket.emit('sala:error', { mensaje: 'Usuario no identificado.' });
        }

        console.log(`[SALA ${salaId}]: Usuario ${userId} intenta unirse (socket: ${socket.id})`);

        // Buscar sala (normalizar UUID)
        const salaIdLower = salaId.toLowerCase();
        let sala = null;
        let salaKey = null;
        
        for (const [key, value] of [...salasPendientes.entries(), ...salasEspera.entries()]) {
            if (key.toLowerCase() === salaIdLower) {
                sala = value;
                salaKey = key;
                break;
            }
        }
        
        if (!sala) {
            console.error(`[SALA ${salaId}]: No existe`);
            return socket.emit('sala:error', { mensaje: 'Sala no existe o expiró.' });
        }
        
        console.log(`[SALA ${salaId}]: ✅ Encontrada - Estado: ${sala.estado}`);

        const retadorId = parseInt(sala.retador || sala.idRetador);
        const retadoId = parseInt(sala.retado || sala.idRetado);
        const userIdInt = parseInt(userId);

        // Verificar pertenencia
        if (userIdInt !== retadorId && userIdInt !== retadoId) {
            console.error(`[SALA ${salaId}]: Usuario ${userId} no pertenece (Retador: ${retadorId}, Retado: ${retadoId})`);
            return socket.emit('sala:error', { mensaje: 'No tienes acceso a esta sala.' });
        }

        // Actualizar socket ID del usuario (CRÍTICO)
        usuariosConectados.set(userIdInt, socket.id);
        console.log(`[SALA ${salaId}]: Socket actualizado - Usuario ${userId}: ${socket.id}`);

        // Inicializar Set si no existe
        if (!sala.jugadoresConectados) {
            sala.jugadoresConectados = new Set();
        }
        
        // Agregar jugador
        sala.jugadoresConectados.add(userIdInt);
        
        // Actualizar en ambos maps
        salasPendientes.set(salaKey, sala);
        salasEspera.set(salaKey, sala);

        console.log(`[SALA ${salaId}]: Usuario ${userId} conectado (${sala.jugadoresConectados.size}/2)`);
        console.log(`[SALA ${salaId}]: Jugadores: [${Array.from(sala.jugadoresConectados).join(', ')}]`);

        // Unir socket a la sala
        socket.join(salaId);

        // Notificar al usuario
        socket.emit('sala:conectado', { 
            salaId,
            mensaje: `Conectado a la sala (${sala.jugadoresConectados.size}/2)`
        });

       // ✅ VERIFICAR SI DEBEMOS INICIAR EL DUELO (MEJORADO)
        if (sala.jugadoresConectados.size === 2) {
            console.log(`[SALA ${salaId}]: ✅ Ambos jugadores conectados`);
            console.log(`[SALA ${salaId}]: Tipo de sala: ${sala.tipo || 'matchmaking'}`);
            
            // Pequeño delay para asegurar sincronización
            setTimeout(async () => {
                const resultado = await verificarEIniciarDuelo(salaKey, io);
                
                if (resultado) {
                    console.log(`[SALA ${salaId}]: ✅ Duelo iniciado correctamente`);
                } else {
                    console.error(`[SALA ${salaId}]: ❌ No se pudo iniciar el duelo`);
                }
            }, 500);
        } else {
            console.log(`[SALA ${salaId}]: Esperando jugadores (${sala.jugadoresConectados.size}/2)`);
        }
    });

    // ============================================================
    // ACEPTAR DESAFÍO BD (NOTIFICACIÓN)
    // ============================================================
    socket.on('duelo:aceptarDesafioBD', async ({ salaId, idRetado }) => {
    console.log(`[DESAFÍO BD]: Usuario ${idRetado} acepta sala ${salaId}`);
    
    // Buscar sala (normalizar UUID)
    const salaIdLower = salaId.toLowerCase();
    let sala = null;
    let salaKey = null;
    
    for (const [key, value] of [...salasPendientes.entries(), ...salasEspera.entries()]) {
        if (key.toLowerCase() === salaIdLower) {
            sala = value;
            salaKey = key;
            break;
        }
    }
    
    if (!sala) {
        console.error(`[DESAFÍO BD]: Sala ${salaId} no encontrada`);
        return socket.emit('duelo:error', { 
            mensaje: 'El desafío expiró o es inválido.' 
        });
    }
    
    const estadosAceptables = ['pendiente', 'esperando_aceptacion', ESTADOS_SALA.PENDIENTE];
    if (!estadosAceptables.includes(sala.estado)) {
        console.error(`[DESAFÍO BD]: Sala ${salaId} ya procesada (estado: ${sala.estado})`);
        return socket.emit('duelo:error', { 
            mensaje: 'Este desafío ya fue procesado.' 
        });
    }
    
    const retadorId = parseInt(sala.retador || sala.idRetador);
    const retadoId = parseInt(sala.retado || sala.idRetado);
    const idRetadoInt = parseInt(idRetado);
    
    if (idRetadoInt !== retadoId) {
        console.error(`[DESAFÍO BD]: Usuario ${idRetado} no es el retado (${retadoId})`);
        return socket.emit('duelo:error', { mensaje: 'No puedes aceptar este desafío.' });
    }
    
    const retadorSocketId = usuariosConectados.get(retadorId);
    
    if (!retadorSocketId) {
        console.error(`[DESAFÍO BD]: Retador ${retadorId} no conectado`);
        if (sala.timeoutId) clearTimeout(sala.timeoutId);
        salasPendientes.delete(salaKey);
        salasEspera.delete(salaKey);
        return socket.emit('duelo:error', { 
            mensaje: 'El retador ya no está conectado.' 
        });
    }
    
    // ✅ MARCAR SALA COMO ACEPTADA
    sala.estado = ESTADOS_SALA.ACEPTADA;
    
    // ✅ INICIALIZAR jugadoresConectados si no existe
    if (!sala.jugadoresConectados) {
        sala.jugadoresConectados = new Set();
    }
    
    // ✅ AGREGAR AL RETADO (el que aceptó)
    sala.jugadoresConectados.add(idRetadoInt);
    usuariosConectados.set(idRetadoInt, socket.id);
    
    // Actualizar en ambos maps
    salasPendientes.set(salaKey, sala);
    salasEspera.set(salaKey, sala);
    
    console.log(`[DESAFÍO BD]: ✅ Sala ${salaId} aceptada`);
    console.log(`[DESAFÍO BD]: Jugadores conectados: ${sala.jugadoresConectados.size}/2`);
    
    // Limpiar timeout
    if (sala.timeoutId) {
        clearTimeout(sala.timeoutId);
        sala.timeoutId = null;
    }
    
    // ✅ NOTIFICAR AL RETADOR
    io.to(retadorSocketId).emit('duelo:desafioAceptado', {
        mensaje: '¡Tu desafío fue aceptado!',
        salaId: salaKey
    });
    
    // ✅ REDIRIGIR AMBOS USUARIOS A LA SALA
    io.to(retadorSocketId).emit('duelo:redirigirASala', { 
        salaId: salaKey,
        mensaje: '¡Desafío aceptado! Redirigiendo...'
    });
    
    socket.emit('duelo:redirigirASala', { 
        salaId: salaKey,
        mensaje: 'Desafío aceptado. Redirigiendo...'
    });
    
    console.log(`[DESAFÍO BD]: Redirecciones enviadas para sala ${salaKey}`);
});

    socket.on('sala:salir', ({ salaId }) => {
        const sala = salasEspera.get(salaId);
        if (sala && socket.userId) {
            sala.jugadoresConectados.delete(socket.userId);
            console.log(`[SALA]: Usuario ${socket.userId} salió de sala ${salaId}`);
            
            if (sala.jugadoresConectados.size === 0) {
                salasEspera.delete(salaId);
                console.log(`[SALA]: Sala ${salaId} eliminada (sin jugadores)`);
            }
        }
    });
    
    // ============================================================
    // EVENTOS DEL JUEGO
    // ============================================================
    socket.on('duelo:clienteListo', async ({ salaId, userId }) => {
        const duelo = activeDuels.get(salaId);
        if (!duelo) {
            console.error(`[CLIENT READY]: Duelo ${salaId} no existe en activeDuels`);
            return;
        }

        console.log(`[CLIENT READY]: Usuario ${userId} listo en sala ${salaId}`);

        // Verificar si el jugador existe en el duelo
        if (!duelo.jugadores[userId] || !duelo.jugadores[userId].username) {
            console.log(`[CLIENT READY]: Cargando datos de usuario ${userId} desde BD`);
            try {
                const [userData] = await db.query(
                    'SELECT id_usuario, username, foto_perfil from usuario WHERE id_usuario = ?', 
                    [userId]
                );
                if (userData.length > 0) {
                    duelo.jugadores[userId] = { 
                        ...userData[0], 
                        socketId: socket.id, 
                        listo: false, 
                        racha: 0 
                    };
                    console.log(`[CLIENT READY]: ✅ Datos cargados para ${userData[0].username}`);
                } else {
                    console.error(`[CLIENT READY]: Usuario ${userId} no encontrado en BD`);
                    return;
                }
            } catch (error) {
                console.error(`[CLIENT READY ERROR]: ${error}`);
                return;
            }
        }

        // Actualizar socket ID por si cambió
        duelo.jugadores[userId].socketId = socket.id;
        duelo.jugadores[userId].listo = true;
        
        const jugadoresIds = Object.keys(duelo.jugadores);
        const todosListos = jugadoresIds.every(id => duelo.jugadores[id].listo);

        console.log(`[CLIENT READY]: Jugadores listos: ${jugadoresIds.filter(id => duelo.jugadores[id].listo).length}/${jugadoresIds.length}`);

        if (todosListos && jugadoresIds.length === 2) {
            console.log(`[DUELO ${salaId}]: ✅ TODOS LISTOS! Iniciando Mini-Draft...`);
            
            // Enviar info del oponente a cada jugador
            jugadoresIds.forEach(playerId => {
                const oponenteId = jugadoresIds.find(id => id !== playerId);
                const oponenteData = duelo.jugadores[oponenteId];
                const playerSocket = duelo.jugadores[playerId].socketId;
                
                if (playerSocket && oponenteData) {
                    io.to(playerSocket).emit('duelo:oponenteInfo', {
                        oponenteId,
                        oponente: { 
                            username: oponenteData.username, 
                            foto_perfil: oponenteData.foto_perfil 
                        }
                    });
                    console.log(`[DUELO ${salaId}]: Info de oponente enviada a ${playerId}`);
                }
            });

            const [jugadorA_id, jugadorB_id] = jugadoresIds;
            let categorias;

            try {
                if (duelo.modo === 'carrera') {
                    [categorias] = await db.query(`
                        SELECT DISTINCT t.id_tematica AS id, t.descripcion 
                        FROM tematica t
                        INNER JOIN pregunta p ON t.id_tematica = p.id_tematica
                        WHERE t.id_carrera IN (
                            SELECT uc1.id_carrera from usuario_carrera uc1
                            INNER JOIN usuario_carrera uc2 ON uc1.id_carrera = uc2.id_carrera
                            WHERE uc1.id_usuario = ? AND uc2.id_usuario = ?
                        )
                        AND (SELECT COUNT(*) FROM pregunta WHERE id_tematica = t.id_tematica) >= 1 
                        ORDER BY RAND() LIMIT 3
                    `, [jugadorA_id, jugadorB_id]);
                } else {
                    [categorias] = await db.query(`
                        SELECT m.id_materia AS id, m.descripcion FROM materias m
                        WHERE (SELECT COUNT(*) FROM pregunta WHERE id_materia = m.id_materia AND id_carrera IS NULL) >= 10
                        ORDER BY RAND() LIMIT 3
                    `);
                }

                if (categorias.length < 1) {
                    console.error(`[DUELO ${salaId}]: No hay categorías suficientes`);
                    io.to(salaId).emit('duelo:error', { mensaje: 'No hay categorías suficientes.' });
                    activeDuels.delete(salaId);
                    return;
                }

                console.log(`[DUELO ${salaId}]: ${categorias.length} categorías obtenidas para draft`);

                duelo.categoriasDraft = categorias;
                io.to(salaId).emit('duelo:iniciarMiniDraft', { 
                    categorias: categorias.map(c => ({ id: c.id, descripcion: c.descripcion })) 
                });
                
                console.log(`[DUELO ${salaId}]: ✅ Mini-Draft iniciado`);
                
            } catch (error) {
                console.error(`[DUELO ${salaId}] Error obteniendo categorías:`, error);
                io.to(salaId).emit('duelo:error', { mensaje: 'Error preparando categorías.' });
                activeDuels.delete(salaId);
            }
        }
    });

    socket.on('duelo:seleccionarCategoria', async ({ salaId, userId, idCategoria }) => {
        const duelo = activeDuels.get(salaId);
        if (!duelo || duelo.selecciones[userId]) return;

        console.log(`[DRAFT ${salaId}]: Usuario ${userId} seleccionó categoría ${idCategoria}`);

        duelo.selecciones[userId] = idCategoria;
        
        const oponenteId = Object.keys(duelo.jugadores).find(id => id !== userId);
        if (oponenteId) {
            io.to(duelo.jugadores[oponenteId].socketId).emit('duelo:oponenteSelecciono');
        }

        const seleccionesCount = Object.keys(duelo.selecciones).length;
        console.log(`[DRAFT ${salaId}]: Selecciones: ${seleccionesCount}/2`);

        if (seleccionesCount === 2) {
            console.log(`[DRAFT ${salaId}]: ✅ Draft completo, iniciando partida...`);
            duelo.estado = 'en_juego';
            io.to(salaId).emit('duelo:miniDraftFinalizado', { selecciones: duelo.selecciones });
            
            // Limpiar las salas temporales AHORA que el duelo comenzó
            salasPendientes.delete(salaId);
            salasEspera.delete(salaId);
            console.log(`[DRAFT ${salaId}]: Salas temporales limpiadas`);
            
            setTimeout(() => {
                iniciarPartida(salaId, duelo);
            }, 1000);
        }
    });

    async function iniciarPartida(salaId, duelo) {
        console.log(`[PARTIDA ${salaId}]: Iniciando...`);
        
        try {
            const [idJugadorA, idJugadorB] = Object.keys(duelo.jugadores);
            const idTematicaA = duelo.selecciones[idJugadorA];
            const idTematicaB = duelo.selecciones[idJugadorB];
            
            let queryField = duelo.modo === 'carrera' ? 'id_tematica' : 'id_materia';

            const [preguntasA] = await db.query(
                `SELECT id_pregunta, pregunta, retroalimentacion FROM pregunta WHERE ${queryField} = ? ORDER BY RAND() LIMIT 5`, 
                [idTematicaA]
            );
            const [preguntasB] = await db.query(
                `SELECT id_pregunta, pregunta, retroalimentacion FROM pregunta WHERE ${queryField} = ? ORDER BY RAND() LIMIT 5`, 
                [idTematicaB]
            );

            if (preguntasA.length === 0 || preguntasB.length === 0) {
                console.error(`[PARTIDA ${salaId}]: No se encontraron preguntas suficientes`);
                io.to(salaId).emit('duelo:error', { mensaje: 'No hay preguntas disponibles para las categorías seleccionadas.' });
                activeDuels.delete(salaId);
                return;
            }

            duelo.examen = [...preguntasA, ...preguntasB].sort(() => Math.random() - 0.5);
            duelo.preguntaActual = 0;
            duelo.respuestas = {};

            console.log(`[PARTIDA ${salaId}]: ${duelo.examen.length} preguntas preparadas`);

            setTimeout(() => enviarSiguientePregunta(salaId, duelo), 3000);
        } catch (error) {
            console.error(`[PARTIDA ${salaId}] Error:`, error);
            io.to(salaId).emit('duelo:error', { mensaje: 'Error preparando preguntas.' });
        }
    }

    socket.on('duelo:responder', async ({ salaId, userId, idPregunta, idRespuesta }) => {
        const duelo = activeDuels.get(salaId);
        if (!duelo || duelo.estado !== 'en_juego') return;

        const preguntaActual = duelo.examen[duelo.preguntaActual];
        if (preguntaActual.id_pregunta !== idPregunta || (duelo.respuestas[idPregunta]?.[userId])) return;

        const oponenteId = Object.keys(duelo.jugadores).find(id => id !== userId);
        if (oponenteId) {
            io.to(duelo.jugadores[oponenteId].socketId).emit('duelo:oponenteRespondio');
        }

        try {
            const [[respuestaData]] = await db.query(
                'SELECT correcta, (SELECT retroalimentacion FROM pregunta WHERE id_pregunta = ?) AS retro FROM respuesta WHERE id_respuesta = ?', 
                [idPregunta, idRespuesta]
            );

            const esCorrecta = respuestaData?.correcta === 1;
            const retroalimentacion = respuestaData?.retro || "Pregunta no encontrada.";
            
            if (!duelo.respuestas[idPregunta]) duelo.respuestas[idPregunta] = {};
            duelo.respuestas[idPregunta][userId] = { esCorrecta, idRespuesta };

            let puntosGanados = 0;
            const eventoActual = preguntaActual.evento;

            if (esCorrecta) {
                duelo.jugadores[userId].racha++;
                let puntosBase = 100;
                if (eventoActual?.tipo === 'Pregunta Rápida') puntosBase *= 2;
                if (eventoActual?.tipo === 'Pregunta Crítica') puntosBase *= 1.5;
                puntosGanados = puntosBase + (duelo.jugadores[userId].racha * 10);
            } else {
                duelo.jugadores[userId].racha = 0;
                puntosGanados = eventoActual?.tipo === 'Pregunta Segura' ? 0 : -50;
                if (eventoActual?.tipo === 'Pregunta Crítica') puntosGanados *= 1.5;
            }
            duelo.puntuaciones[userId] += puntosGanados;

            socket.emit('duelo:resultadoRespuesta', { esCorrecta, retroalimentacion, idPregunta });

            if (Object.keys(duelo.respuestas[idPregunta]).length === 2) {
                if (duelo.timer) clearTimeout(duelo.timer);

                const oponenteRespuesta = duelo.respuestas[idPregunta][oponenteId];
                const [[oponenteRetro]] = await db.query('SELECT retroalimentacion FROM pregunta WHERE id_pregunta = ?', [idPregunta]);

                io.to(duelo.jugadores[oponenteId].socketId).emit('duelo:resultadoRespuesta', {
                    esCorrecta: oponenteRespuesta.esCorrecta,
                    retroalimentacion: oponenteRetro.retroalimentacion,
                    idPregunta
                });

                io.to(salaId).emit('duelo:actualizarEstado', {
                    puntuaciones: duelo.puntuaciones,
                    rachas: {
                        [userId]: duelo.jugadores[userId].racha,
                        [oponenteId]: duelo.jugadores[oponenteId].racha
                    }
                });

                duelo.preguntaActual++;
                setTimeout(() => enviarSiguientePregunta(salaId, duelo), 2500);
            }
        } catch (error) {
            console.error(`Error procesando respuesta:`, error);
            socket.emit('duelo:error', { mensaje: 'Error procesando respuesta.' });
        }
    });

    async function enviarSiguientePregunta(salaId, duelo) {
        if (!duelo || !duelo.examen || duelo.preguntaActual >= duelo.examen.length) {
            finalizarDuelo(salaId, duelo);
            return;
        }

        const preguntaActual = duelo.examen[duelo.preguntaActual];
        
        if (Math.random() < 0.20) {
            const eventos = [
                { tipo: 'Pregunta Rápida', duracion: 8, notificacion: '¡PUNTOS DOBLES, TIEMPO REDUCIDO!' },
                { tipo: 'Pregunta Segura', duracion: 15, notificacion: '¡PREGUNTA SEGURA! No pierdes puntos si fallas.' },
                { tipo: 'Pregunta Crítica', duracion: 15, notificacion: '¡PREGUNTA CRÍTICA! Los puntos se multiplican x1.5.' }
            ];
            preguntaActual.evento = eventos[Math.floor(Math.random() * eventos.length)];
        }
        
        try {
            const [respuestas] = await db.query('SELECT id_respuesta, respuesta FROM respuesta WHERE id_pregunta = ? ORDER BY RAND()', [preguntaActual.id_pregunta]);

            io.to(salaId).emit('duelo:nuevaPregunta', {
                pregunta: preguntaActual,
                opciones: respuestas,
                numeroPregunta: duelo.preguntaActual + 1,
                totalPreguntas: duelo.examen.length,
                evento: preguntaActual.evento
            });
            
            if (duelo.timer) clearTimeout(duelo.timer);
            
            const duracion = preguntaActual.evento?.duracion || 15;
            duelo.timer = setTimeout(() => {
                Object.keys(duelo.jugadores).forEach(jugadorId => {
                    if (!duelo.respuestas[preguntaActual.id_pregunta]?.[jugadorId]) {
                        duelo.puntuaciones[jugadorId] -= 25;
                    }
                });

                io.to(salaId).emit('duelo:actualizarEstado', { puntuaciones: duelo.puntuaciones });
                duelo.preguntaActual++;
                setTimeout(() => enviarSiguientePregunta(salaId, duelo), 2000);
            }, duracion * 1000);
        } catch (error) {
            console.error(`Error enviando pregunta:`, error);
            io.to(salaId).emit('duelo:error', { mensaje: 'Error cargando pregunta.' });
        }
    }
    
    async function finalizarDuelo(salaId, duelo) {
        console.log(`[Duelo ${salaId}]: Finalizado.`);
        
        try {
            const jugadoresIds = Object.keys(duelo.jugadores);
            const [jugadorA_id, jugadorB_id] = jugadoresIds;
            
            const puntosA = duelo.puntuaciones[jugadorA_id] || 0;
            const puntosB = duelo.puntuaciones[jugadorB_id] || 0;
            
            let ganadorId = null;
            if (puntosA > puntosB) ganadorId = jugadorA_id;
            else if (puntosB > puntosA) ganadorId = jugadorB_id;
            
            const totalPreguntas = duelo.examen.length;
            
            for (const jugadorId of jugadoresIds) {
                const puntuacionFinal = duelo.puntuaciones[jugadorId] || 0;
                const esGanador = ganadorId === jugadorId || ganadorId === null;
                const puntosBase = Math.max(0, puntuacionFinal);
                const bonus = calcularBonusPuntos(puntuacionFinal, totalPreguntas, esGanador);
                const puntosFinales = puntosBase + bonus;
                
                await actualizarPuntosCarrera(jugadorId, puntosFinales, duelo.modo);
            }
            
            const resultado = {
                ganadorId,
                puntuaciones: duelo.puntuaciones,
                estadisticas: { totalPreguntas, jugadores: {} }
            };
            
            for (const jugadorId of jugadoresIds) {
                let respuestasCorrectas = 0;
                let respuestasIncorrectas = 0;
                
                for (const respuestas of Object.values(duelo.respuestas)) {
                    if (respuestas[jugadorId]) {
                        if (respuestas[jugadorId].esCorrecta) respuestasCorrectas++;
                        else respuestasIncorrectas++;
                    }
                }
                
                const puntuacionFinal = duelo.puntuaciones[jugadorId] || 0;
                const esGanador = ganadorId === jugadorId || ganadorId === null;
                const bonus = calcularBonusPuntos(puntuacionFinal, totalPreguntas, esGanador);
                const puntosFinales = Math.max(0, puntuacionFinal) + bonus;
                
                resultado.estadisticas.jugadores[jugadorId] = {
                    username: duelo.jugadores[jugadorId].username,
                    respuestasCorrectas,
                    respuestasIncorrectas,
                    puntuacionPartida: puntuacionFinal,
                    bonusObtenido: bonus,
                    puntosCarreraGanados: puntosFinales
                };
            }
            
            io.to(salaId).emit('duelo:finalizado', resultado);
            
            setTimeout(() => {
                activeDuels.delete(salaId);
            }, 30000);
            
        } catch (error) {
            console.error(`Error finalizando duelo:`, error);
            io.to(salaId).emit('duelo:error', { mensaje: 'Error procesando resultado.' });
        }
    }

    socket.on('duelo:abandonar', async ({ salaId, userId }) => {
        const duelo = activeDuels.get(salaId);
        if (!duelo) return;

        const oponenteId = Object.keys(duelo.jugadores).find(id => id !== userId);
        
        if (oponenteId) {
            const oponenteSocketId = duelo.jugadores[oponenteId].socketId;
            io.to(oponenteSocketId).emit('duelo:oponenteAbandono', {
                mensaje: `${duelo.jugadores[userId].username} abandonó. ¡Ganaste!`
            });
            
            await actualizarPuntosCarrera(oponenteId, 200, duelo.modo);
        }
        
        if (duelo.timer) clearTimeout(duelo.timer);
        activeDuels.delete(salaId);
    });

    socket.on('duelo:estadoColas', () => {
        socket.emit('duelo:estadoColas', {
            poolCarreraFacil: poolCarreraFacil.length,
            poolCarreraNormal: poolCarreraNormal.length,
            poolCarreraDificil: poolCarreraDificil.length,
            poolGeneral: poolGeneral.length,
            duelosActivos: activeDuels.size,
            usuariosConectados: usuariosConectados.size,
            usuariosEnPortal: usuariosEnPortalCompetitivo.size,
            salasEspera: salasEspera.size
        });
    });

    socket.on('disconnect', () => {
        if (socket.userId) {
            const userId = socket.userId;
            
            // Remover de todas las pools de matchmaking
            poolCarreraFacil = poolCarreraFacil.filter(p => p.userId !== userId);
            poolCarreraNormal = poolCarreraNormal.filter(p => p.userId !== userId);
            poolCarreraDificil = poolCarreraDificil.filter(p => p.userId !== userId);
            poolGeneral = poolGeneral.filter(p => p.userId !== userId);
            
            usuariosConectados.delete(userId);
            usuariosEnPortalCompetitivo.delete(userId);
            console.log(`Usuario ${userId} desconectado`);
        }
    });
};