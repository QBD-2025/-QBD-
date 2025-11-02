
// socket-competitivo.js - VERSIÓN AVANZADA CON TODAS LAS MEJORAS
// ================================================================
// SISTEMA DE APUESTAS, POWER-UPS Y EVENTOS ESPECIALES
// ================================================================

const db = require('../db/conexion');
const { v4: uuidv4 } = require('uuid');

// ================================================================
// CONSTANTES DEL SISTEMA DE JUEGO
// ================================================================

const ESTADOS_SALA = {
    ESPERANDO_INVITACION: 'esperando_aceptacion',
    ACEPTADA: 'aceptada',
    CONECTANDO: 'conectando',
    LISTA: 'lista',
    EN_JUEGO: 'en_juego',
    EXPIRADA: 'expirada',
    CANCELADA: 'cancelada',
    PENDIENTE: 'pendiente',
    MATCHMAKING: 'matchmaking'
};

// ✅ SISTEMA DE APUESTAS
const APUESTAS = {
    MIN: 10,
    DEFAULT: 20,
    MAX: 100
};

// ✅ RECOMPENSAS BASE POR DIFICULTAD
const RECOMPENSAS = {
    facil: 20,
    normal: 30,
    dificil: 50
};

// ✅ MULTIPLICADORES DE VELOCIDAD
const MULTIPLICADORES_VELOCIDAD = {
    RAPIDA: 1.25,    // 0-3 segundos
    NORMAL: 1.0,     // 3-6 segundos
    LENTA: 0.75      // 6-10 segundos
};

// ✅ POWER-UPS DISPONIBLES
const POWER_UPS = {
    CONGELAR: {
        id: 'congelar',
        nombre: '❄️ Congelar',
        descripcion: 'Quita 3 segundos al rival',
        duracion: 3000
    },
    CINCUENTA_CINCUENTA: {
        id: '50_50',
        nombre: '🎯 50/50',
        descripcion: 'Elimina 2 opciones incorrectas',
        duracion: null
    },
    ESCUDO: {
        id: 'escudo',
        nombre: '🛡️ Escudo',
        descripcion: 'Bloquea el próximo power-up rival',
        duracion: null
    },
    TIEMPO_EXTRA: {
        id: 'tiempo_extra',
        nombre: '⏱️ Tiempo Extra',
        descripcion: '+5 segundos para responder',
        duracion: null
    }
};

// ✅ EVENTOS ALEATORIOS
const EVENTOS_ESPECIALES = [
    {
        id: 'rapida',
        nombre: 'Ronda Rápida',
        notificacion: '⚡ RONDA RÁPIDA: 5 segundos, puntos x2',
        duracion: 5,
        multiplicador: 2.0
    },
    {
        id: 'riesgo',
        nombre: 'Ronda de Riesgo',
        notificacion: '💀 RONDA DE RIESGO: Si fallas pierdes -50 puntos',
        duracion: 10,
        penalizacionError: -50
    },
    {
        id: 'oculta',
        nombre: 'Ronda Oculta',
        notificacion: '👻 RONDA OCULTA: Opciones borrosas 2 segundos',
        duracion: 10,
        efectoVisual: 'blur',
        tiempoEfecto: 2000
    },
    {
        id: 'critica',
        nombre: 'Ronda Crítica',
        notificacion: '🔥 RONDA CRÍTICA: Puntos x1.5',
        duracion: 10,
        multiplicador: 1.5
    }
];

// ================================================================
// VARIABLES GLOBALES
// ================================================================

let poolCarreraFacil = [];
let poolCarreraNormal = [];
let poolCarreraDificil = [];
let poolGeneral = [];

const salasEspera = new Map();
const activeDuels = new Map();
const usuariosConectados = new Map();
const usuariosEnPortalCompetitivo = new Set();
const desafiosPendientes = new Map();
const salasPendientes = new Map();

global.usuariosConectados = usuariosConectados;
global.usuariosEnPortalCompetitivo = usuariosEnPortalCompetitivo;
global.salasPendientes = salasPendientes;
global.salasEspera = salasEspera;

// ================================================================
// FUNCIONES DE CÁLCULO DE PUNTOS
// ================================================================

function calcularPuntosPorVelocidad(tiempoRespuesta, puntosBase) {
    let multiplicador = MULTIPLICADORES_VELOCIDAD.NORMAL;
    
    if (tiempoRespuesta <= 3) {
        multiplicador = MULTIPLICADORES_VELOCIDAD.RAPIDA;
    } else if (tiempoRespuesta >= 6) {
        multiplicador = MULTIPLICADORES_VELOCIDAD.LENTA;
    }
    
    return Math.floor(puntosBase * multiplicador);
}

function calcularBonusRacha(racha) {
    return racha * 10; // 10 puntos por cada respuesta en racha
}

function otorgarPowerUp() {
    const powerUpsArray = Object.values(POWER_UPS);
    const randomIndex = Math.floor(Math.random() * powerUpsArray.length);
    return powerUpsArray[randomIndex];
}

function seleccionarEventoAleatorio() {
    // 30% de probabilidad de evento especial
    if (Math.random() < 0.3) {
        const randomIndex = Math.floor(Math.random() * EVENTOS_ESPECIALES.length);
        return EVENTOS_ESPECIALES[randomIndex];
    }
    return null;
}

// ================================================================
// FUNCIÓN: Crear sala para matchmaking CON APUESTAS
// ================================================================

function crearSalaMatchmaking(jugadorA, jugadorB, modo, dificultad, apuesta, io) {
    const salaId = uuidv4();
    
    console.log(`[MATCHMAKING]: 🎯 Creando sala ${salaId} con apuesta de ${apuesta} puntos`);
    
    const sala = {
        salaId,
        retador: jugadorA.userId,
        retado: jugadorB.userId,
        idRetador: jugadorA.userId,
        idRetado: jugadorB.userId,
        estado: ESTADOS_SALA.MATCHMAKING,
        timestamp: Date.now(),
        jugadoresConectados: new Set(),
        jugadoresAceptados: new Set([jugadorA.userId, jugadorB.userId]),
        dueloCreado: false,
        tipo: 'matchmaking',
        modo: modo,
        dificultad: dificultad,
        apuesta: apuesta,
        bote: apuesta * 2,
        socketIdA: jugadorA.socketId,
        socketIdB: jugadorB.socketId,
        intentosConexion: 0
    };
    
    salasPendientes.set(salaId, sala);
    salasEspera.set(salaId, sala);
    
    const urlSala = `/competitivo/sala/${salaId}`;
    
    io.to(jugadorA.socketId).emit('matchmaking:salaCreada', { 
        salaId,
        urlSala,
        mensaje: `¡Oponente encontrado! Apuesta: ${apuesta} pts`,
        apuesta,
        bote: sala.bote,
        delay: 0
    });
    
    io.to(jugadorB.socketId).emit('matchmaking:salaCreada', { 
        salaId,
        urlSala,
        mensaje: `¡Oponente encontrado! Apuesta: ${apuesta} pts`,
        apuesta,
        bote: sala.bote,
        delay: 0
    });
    
    const timeoutId = setTimeout(() => {
        const salaActual = salasPendientes.get(salaId);
        
        if (salaActual && salaActual.jugadoresConectados.size < 2) {
            console.log(`[MATCHMAKING]: ⏰ Timeout sala ${salaId}`);
            
            // Devolver apuestas si no se conectan
            io.to(salaId).emit('sala:error', {
                mensaje: 'El oponente no se conectó. Tu apuesta ha sido devuelta.'
            });
            
            salasPendientes.delete(salaId);
            salasEspera.delete(salaId);
        }
    }, 60000);

    sala.timeoutId = timeoutId;
    return salaId;
}

// ================================================================
// FUNCIÓN: Verificar e iniciar duelo CON SISTEMA COMPLETO
// ================================================================

async function verificarEIniciarDuelo(salaId, io) {
    const sala = salasPendientes.get(salaId) || salasEspera.get(salaId);
    
    if (!sala) {
        console.error(`[VERIFICAR]: ❌ Sala ${salaId} no encontrada`);
        return false;
    }

    console.log(`[VERIFICAR]: 🔍 Analizando sala ${salaId}`);

    if (!sala.jugadoresConectados || sala.jugadoresConectados.size < 2) {
        sala.intentosConexion = (sala.intentosConexion || 0) + 1;
        
        if (sala.intentosConexion < 3) {
            setTimeout(() => {
                verificarEIniciarDuelo(salaId, io);
            }, 1000);
            return false;
        } else {
            return false;
        }
    }

    if (sala.dueloCreado) {
        console.log(`[VERIFICAR]: ⚠️ Duelo ya creado`);
        return false;
    }

    sala.dueloCreado = true;
    sala.estado = 'en_juego';
    salasPendientes.set(salaId, sala);
    salasEspera.set(salaId, sala);

    console.log(`[VERIFICAR]: ✅ ¡INICIANDO DUELO AVANZADO!`);

    try {
        const retadorId = parseInt(sala.retador || sala.idRetador);
        const retadoId = parseInt(sala.retado || sala.idRetado);

        const [retadorData] = await db.query(
            'SELECT id_usuario, username, foto_perfil, puntos FROM usuario WHERE id_usuario = ?', 
            [retadorId]
        );
        
        const [retadoData] = await db.query(
            'SELECT id_usuario, username, foto_perfil, puntos FROM usuario WHERE id_usuario = ?', 
            [retadoId]
        );

        if (retadorData.length === 0 || retadoData.length === 0) {
            throw new Error('Usuario no encontrado');
        }

        // ✅ Verificar que ambos jugadores tengan puntos suficientes
        const apuesta = sala.apuesta || APUESTAS.DEFAULT;
        
        if (retadorData[0].puntos < apuesta || retadoData[0].puntos < apuesta) {
            io.to(salaId).emit('duelo:error', {
                mensaje: 'Uno de los jugadores no tiene puntos suficientes para la apuesta.'
            });
            sala.dueloCreado = false;
            return false;
        }

        const retadorSocketId = usuariosConectados.get(retadorId);
        const retadoSocketId = usuariosConectados.get(retadoId);

        if (!retadorSocketId || !retadoSocketId) {
            throw new Error('Sockets no encontrados');
        }

        const socketA = io.sockets.sockets.get(retadorSocketId);
        const socketB = io.sockets.sockets.get(retadoSocketId);

        if (!socketA || !socketB) {
            throw new Error('No se pudieron obtener los objetos socket');
        }

        socketA.join(salaId);
        socketB.join(salaId);

        // ✅ CREAR DUELO CON SISTEMA AVANZADO
        activeDuels.set(salaId, {
            modo: sala.modo || 'general',
            dificultad: sala.dificultad || null,
            apuesta: apuesta,
            bote: apuesta * 2,
            recompensaBase: RECOMPENSAS[sala.dificultad] || RECOMPENSAS.normal,
            jugadores: {
                [retadorId]: { 
                    ...retadorData[0], 
                    socketId: retadorSocketId, 
                    listo: false, 
                    racha: 0,
                    powerUp: null,
                    escudoActivo: false,
                    gambitoActivado: false,
                    gambitoExitoso: false
                },
                [retadoId]: { 
                    ...retadoData[0], 
                    socketId: retadoSocketId, 
                    listo: false, 
                    racha: 0,
                    powerUp: null,
                    escudoActivo: false,
                    gambitoActivado: false,
                    gambitoExitoso: false
                }
            },
            estado: 'esperando_listos',
            puntuaciones: { [retadorId]: 0, [retadoId]: 0 },
            selecciones: {},
            gambitoSelecciones: {},
            esMatchmaking: sala.tipo === 'matchmaking',
            fechaCreacion: new Date(),
            respuestas: {},
            tiemposRespuesta: {}
        });

        if (sala.timeoutId) {
            clearTimeout(sala.timeoutId);
        }

        // ✅ Notificar información del duelo
        io.to(salaId).emit('duelo:informacionInicial', {
            apuesta,
            bote: apuesta * 2,
            recompensaBase: RECOMPENSAS[sala.dificultad] || RECOMPENSAS.normal,
            dificultad: sala.dificultad
        });

        io.to(salaId).emit('duelo:dueloListo', { salaId });
        console.log(`[VERIFICAR]: ✅ DUELO AVANZADO INICIALIZADO`);

        return true;

    } catch (error) {
        console.error(`[VERIFICAR ERROR]:`, error);
        
        sala.dueloCreado = false;
        sala.estado = sala.tipo === 'matchmaking' ? ESTADOS_SALA.MATCHMAKING : 'aceptada';
        salasPendientes.set(salaId, sala);
        salasEspera.set(salaId, sala);
        
        io.to(salaId).emit('sala:error', { 
            mensaje: 'Error al iniciar duelo. Recargando...' 
        });
        
        return false;
    }
}

// ================================================================
// FUNCIÓN: Crear sala BD
// ================================================================

function crearSalaPendienteBD_Internal(idRetador, idRetado, modo, dificultad, io) {
    const salaId = uuidv4();
    
    console.log(`[SALA BD]: 🏗️ Creando sala ${salaId}`);
    
    const sala = {
        salaId,
        retador: parseInt(idRetador),
        retado: parseInt(idRetado),
        idRetador: parseInt(idRetador),
        idRetado: parseInt(idRetado),
        estado: 'pendiente',
        timestamp: Date.now(),
        jugadoresConectados: new Set(),
        jugadoresAceptados: new Set(),
        dueloCreado: false,
        tipo: 'notificacion_bd',
        modo: modo || 'general',
        dificultad: dificultad || null,
        apuesta: APUESTAS.DEFAULT,
        intentosConexion: 0
    };
    
    salasPendientes.set(salaId, sala);
    salasEspera.set(salaId, sala);
    global.salasPendientes.set(salaId, sala);
    global.salasEspera.set(salaId, sala);
    
    const timeoutId = setTimeout(() => {
        const salaActual = salasPendientes.get(salaId);
        if (salaActual && (salaActual.estado === 'pendiente' || salaActual.estado === 'esperando_aceptacion')) {
            salasPendientes.delete(salaId);
            salasEspera.delete(salaId);
            global.salasPendientes.delete(salaId);
            global.salasEspera.delete(salaId);
            
            const retadorSocketId = usuariosConectados.get(parseInt(idRetador));
            const retadoSocketId = usuariosConectados.get(parseInt(idRetado));
            
            if (retadorSocketId) {
                io.to(retadorSocketId).emit('desafioBD:expirado', {
                    mensaje: 'Tu desafío expiró (3 minutos sin respuesta)'
                });
            }
            
            if (retadoSocketId) {
                io.to(retadoSocketId).emit('desafioBD:expirado', {
                    mensaje: 'El desafío que recibiste expiró'
                });
            }
        }
    }, 180000);
    
    sala.timeoutId = timeoutId;
    return salaId;
}

global.crearSalaPendienteBD = crearSalaPendienteBD_Internal;

// ================================================================
// CLEANUP
// ================================================================

setInterval(() => {
    const ahora = Date.now();
    const TIMEOUT = 5 * 60 * 1000;
    
    for (const [salaId, sala] of salasEspera.entries()) {
        if (ahora - sala.timestamp > TIMEOUT) {
            salasEspera.delete(salaId);
            salasPendientes.delete(salaId);
            console.log(`[CLEANUP]: Sala ${salaId} eliminada`);
        }
    }
}, 5 * 60 * 1000);

// ================================================================
// MÓDULO PRINCIPAL
// ================================================================

module.exports = (io, socket) => {
    
    // Registro de usuarios
    socket.on('usuario:registrar', (userId) => {
        if (!userId) return;
        
        const userIdInt = parseInt(userId);
        usuariosConectados.set(userIdInt, socket.id);
        socket.userId = userIdInt;
        console.log(`[REGISTRO]: Usuario ${userIdInt} registrado`);
    });

    socket.on('competitivo:entrarPortal', (userId) => {
        if (!userId) return;
        
        const userIdInt = parseInt(userId);
        usuariosEnPortalCompetitivo.add(userIdInt);
        usuariosConectados.set(userIdInt, socket.id);
        socket.userId = userIdInt;
    });

    socket.on('competitivo:salirPortal', (userId) => {
        if (!userId) return;
        
        const userIdInt = parseInt(userId);
        usuariosEnPortalCompetitivo.delete(userIdInt);
    });

    // ✅ HANDLER: sala:unirse
    socket.on('sala:unirse', async ({ salaId }) => {
        const userId = socket.userId;
        
        if (!userId) {
            return socket.emit('sala:error', { mensaje: 'Usuario no identificado' });
        }

        let sala = null;
        let salaKey = null;
        let intentos = 0;
        const maxIntentos = 10;
        
        while (!sala && intentos < maxIntentos) {
            intentos++;
            
            for (const [key, value] of [...salasPendientes.entries(), ...salasEspera.entries()]) {
                if (key.toLowerCase() === salaId.toLowerCase()) {
                    sala = value;
                    salaKey = key;
                    break;
                }
            }
            
            if (!sala && intentos < maxIntentos) {
                await new Promise(r => setTimeout(r, 500));
            }
        }
        
        if (!sala) {
            return socket.emit('sala:error', { mensaje: 'Sala no encontrada' });
        }

        const retadorId = parseInt(sala.retador || sala.idRetador);
        const retadoId = parseInt(sala.retado || sala.idRetado);
        const userIdInt = parseInt(userId);

        if (userIdInt !== retadorId && userIdInt !== retadoId) {
            return socket.emit('sala:error', { mensaje: 'No autorizado' });
        }

        usuariosConectados.set(userIdInt, socket.id);

        if (!sala.jugadoresConectados) {
            sala.jugadoresConectados = new Set();
        }
        
        sala.jugadoresConectados.add(userIdInt);
        
        salasPendientes.set(salaKey, sala);
        salasEspera.set(salaKey, sala);

        socket.join(salaId);

        socket.emit('sala:conectado', { 
            salaId,
            mensaje: `Conectado (${sala.jugadoresConectados.size}/2)`
        });

        if (sala.jugadoresConectados.size === 2) {
            const delay = sala.tipo === 'matchmaking' ? 1500 : 500;
            
            setTimeout(async () => {
                await verificarEIniciarDuelo(salaKey, io);
            }, delay);
        }
    });

    // ============================================================
    // 8.3 DESAFÍOS BD
    // ============================================================
    
    socket.on('duelo:aceptarDesafioBD', async ({ salaId, idRetado }) => {
        console.log('═══════════════════════════════════════════════════════════');
        console.log('[SOCKET ACEPTAR BD]: 🚀 EVENTO RECIBIDO');
        console.log('═══════════════════════════════════════════════════════════');
        console.log(`[SOCKET ACEPTAR BD]: SalaId: ${salaId}`);
        console.log(`[SOCKET ACEPTAR BD]: ID Retado: ${idRetado}`);
        console.log(`[SOCKET ACEPTAR BD]: Socket ID: ${socket.id}`);
        console.log(`[SOCKET ACEPTAR BD]: Usuario socket: ${socket.userId}`);
        
        // ═══ PASO 1: Validaciones básicas ═══
        if (!salaId) {
            console.error('[SOCKET ACEPTAR BD]: ❌ salaId no proporcionado');
            return socket.emit('duelo:error', { 
                mensaje: 'Error: ID de sala no válido' 
            });
        }

        if (!idRetado) {
            console.error('[SOCKET ACEPTAR BD]: ❌ idRetado no proporcionado');
            return socket.emit('duelo:error', { 
                mensaje: 'Error: Usuario no identificado' 
            });
        }

        try {
            // ═══ PASO 2: Buscar sala ═══
            console.log('[SOCKET ACEPTAR BD]: 🔍 PASO 2 - Buscando sala...');
            
            let sala = salasPendientes.get(salaId) || salasEspera.get(salaId);
            
            // Búsqueda case-insensitive
            if (!sala) {
                console.log('[SOCKET ACEPTAR BD]: Buscando case-insensitive...');
                for (const [key, value] of [...salasPendientes.entries(), ...salasEspera.entries()]) {
                    if (key.toLowerCase() === salaId.toLowerCase()) {
                        sala = value;
                        salaId = key; // Usar el ID correcto
                        console.log('[SOCKET ACEPTAR BD]: ✅ Sala encontrada (case-insensitive):', key);
                        break;
                    }
                }
            }
            
            if (!sala) {
                console.error('[SOCKET ACEPTAR BD]: ❌ SALA NO ENCONTRADA');
                console.error('[SOCKET ACEPTAR BD]: SalaId buscado:', salaId);
                console.error('[SOCKET ACEPTAR BD]: Salas pendientes:', salasPendientes.size);
                console.error('[SOCKET ACEPTAR BD]: Salas espera:', salasEspera.size);
                
                // Listar salas disponibles
                if (salasPendientes.size > 0) {
                    console.error('[SOCKET ACEPTAR BD]: Salas en salasPendientes:');
                    for (const [key, value] of salasPendientes.entries()) {
                        console.error(`[SOCKET ACEPTAR BD]:   - ${key}: ${value.estado} (${value.tipo})`);
                    }
                }
                
                return socket.emit('sala:error', {
                    mensaje: 'La sala de duelo no está disponible o expiró. Por favor, solicita un nuevo desafío.'
                });
            }

            console.log('[SOCKET ACEPTAR BD]: ✅ Sala encontrada');
            console.log('[SOCKET ACEPTAR BD]: Estado actual:', sala.estado);
            console.log('[SOCKET ACEPTAR BD]: Tipo:', sala.tipo);

            // ═══ PASO 3: Verificar estados válidos ═══
            console.log('[SOCKET ACEPTAR BD]: 🔍 PASO 3 - Verificando estado...');
            
            const estadosValidos = ['pendiente', 'esperando_aceptacion', 'aceptada'];
            if (!estadosValidos.includes(sala.estado)) {
                console.error('[SOCKET ACEPTAR BD]: ❌ Estado no válido:', sala.estado);
                return socket.emit('duelo:error', {
                    mensaje: 'Este desafío ya fue procesado o expiró.'
                });
            }
            
            console.log('[SOCKET ACEPTAR BD]: ✅ Estado válido');

            // ═══ PASO 4: Verificar pertenencia del usuario ═══
            console.log('[SOCKET ACEPTAR BD]: 🔍 PASO 4 - Verificando pertenencia...');
            
            const retadorId = parseInt(sala.retador || sala.idRetador);
            const retadoId = parseInt(sala.retado || sala.idRetado);
            const idRetadoInt = parseInt(idRetado);
            
            console.log('[SOCKET ACEPTAR BD]: Retador:', retadorId);
            console.log('[SOCKET ACEPTAR BD]: Retado esperado:', retadoId);
            console.log('[SOCKET ACEPTAR BD]: Usuario actual:', idRetadoInt);
            
            if (idRetadoInt !== retadoId) {
                console.error('[SOCKET ACEPTAR BD]: ❌ Usuario no autorizado');
                console.error(`[SOCKET ACEPTAR BD]:   Esperado: ${retadoId}, Recibido: ${idRetadoInt}`);
                return socket.emit('duelo:error', { 
                    mensaje: 'No puedes aceptar este desafío.' 
                });
            }
            
            console.log('[SOCKET ACEPTAR BD]: ✅ Usuario autorizado');

            // ═══ PASO 5: Cargar datos del retador desde BD ═══
            console.log('[SOCKET ACEPTAR BD]: 💾 PASO 5 - Cargando datos del retador...');
            
            const [retadorData] = await db.query(
                'SELECT id_usuario, username, foto_perfil FROM usuario WHERE id_usuario = ?', 
                [retadorId]
            );
            
            if (retadorData.length === 0) {
                console.error('[SOCKET ACEPTAR BD]: ❌ Retador no encontrado en BD');
                return socket.emit('duelo:error', { 
                    mensaje: 'Error: Usuario retador no encontrado.' 
                });
            }
            
            console.log('[SOCKET ACEPTAR BD]: ✅ Datos del retador cargados:', retadorData[0].username);

            // ═══ PASO 6: Marcar sala como aceptada ═══
            console.log('[SOCKET ACEPTAR BD]: 🏷️ PASO 6 - Actualizando estado de sala...');
            
            sala.estado = 'aceptada';
            sala.jugadoresAceptados = sala.jugadoresAceptados || new Set();
            sala.jugadoresAceptados.add(retadorId);
            sala.jugadoresAceptados.add(idRetadoInt);
            
            salasPendientes.set(salaId, sala);
            salasEspera.set(salaId, sala);
            
            console.log('[SOCKET ACEPTAR BD]: ✅ Sala marcada como aceptada');
            console.log('[SOCKET ACEPTAR BD]: Jugadores aceptados:', Array.from(sala.jugadoresAceptados));

            // ═══ PASO 7: Notificar al retador ═══
            console.log('[SOCKET ACEPTAR BD]: 📡 PASO 7 - Notificando al retador...');
            
            const retadorSocketId = usuariosConectados.get(retadorId);
            console.log('[SOCKET ACEPTAR BD]: Socket del retador:', retadorSocketId || 'NO CONECTADO');
            
            if (retadorSocketId) {
                console.log('[SOCKET ACEPTAR BD]: 📤 Emitiendo duelo:desafioAceptado...');
                io.to(retadorSocketId).emit('duelo:desafioAceptado', {
                    mensaje: `Tu desafío fue aceptado`,
                    salaId: salaId
                });
                
                console.log('[SOCKET ACEPTAR BD]: 📤 Emitiendo duelo:redirigirASala al retador...');
                io.to(retadorSocketId).emit('duelo:redirigirASala', { 
                    salaId,
                    mensaje: '¡Desafío aceptado! Redirigiendo a la sala...'
                });
                
                console.log('[SOCKET ACEPTAR BD]: ✅ Retador notificado');
            } else {
                console.log('[SOCKET ACEPTAR BD]: ℹ️ Retador no conectado');
            }

            // ═══ PASO 8: Confirmar al retado (quien aceptó) ═══
            console.log('[SOCKET ACEPTAR BD]: 📤 PASO 8 - Confirmando al retado...');
            
            socket.emit('duelo:redirigirASala', { 
                salaId,
                mensaje: 'Desafío aceptado. Conectando a la sala...'
            });
            
            console.log('[SOCKET ACEPTAR BD]: ✅ Retado confirmado');

            console.log('═══════════════════════════════════════════════════════════');
            console.log('[SOCKET ACEPTAR BD]: ✅✅✅ PROCESO COMPLETADO ✅✅✅');
            console.log('[SOCKET ACEPTAR BD]: 📋 Resumen:');
            console.log(`[SOCKET ACEPTAR BD]:   - SalaId: ${salaId}`);
            console.log(`[SOCKET ACEPTAR BD]:   - Estado: ${sala.estado}`);
            console.log(`[SOCKET ACEPTAR BD]:   - Retador notificado: ${retadorSocketId ? 'SÍ' : 'NO'}`);
            console.log(`[SOCKET ACEPTAR BD]:   - URL: /competitivo/sala/${salaId}`);
            console.log('═══════════════════════════════════════════════════════════');

        } catch (error) {
            console.error('═══════════════════════════════════════════════════════════');
            console.error('[SOCKET ACEPTAR BD]: ❌❌❌ ERROR FATAL ❌❌❌');
            console.error('[SOCKET ACEPTAR BD]: Error:', error.message);
            console.error('[SOCKET ACEPTAR BD]: Stack:', error.stack);
            console.error('═══════════════════════════════════════════════════════════');
            
            socket.emit('duelo:error', { 
                mensaje: 'Error al procesar aceptación: ' + error.message 
            });
        }
    });

    // ============================================================
    // 8.4 INVITACIONES DE LOBBY
    // ============================================================
    
    socket.on('duelo:invitarLobby', async ({ idOponente, usernameOponente }) => {
        const idRetador = socket.userId;
        
        if (!idRetador || idRetador === parseInt(idOponente)) {
            return socket.emit('duelo:invitacionLobbyError', { 
                mensaje: 'No puedes desafiarte a ti mismo.' 
            });
        }

        try {
            const [retadorData] = await db.query('SELECT username FROM usuario WHERE id_usuario = ?', [idRetador]);
            if (retadorData.length === 0) {
                return socket.emit('duelo:invitacionLobbyError', { mensaje: 'Error: Usuario no encontrado.' });
            }

            const usernameRetador = retadorData[0].username;
            const oponenteSocketId = usuariosConectados.get(parseInt(idOponente));
            
            if (!oponenteSocketId) {
                return socket.emit('duelo:invitacionLobbyError', { 
                    mensaje: `${usernameOponente} no está conectado.` 
                });
            }

            const salaId = uuidv4();
            const timestamp = Date.now();

            const nuevaSala = {
                salaId,
                idRetador: parseInt(idRetador),
                idRetado: parseInt(idOponente),
                retador: parseInt(idRetador),
                retado: parseInt(idOponente),
                usernameRetador,
                usernameRetado: usernameOponente,
                estado: 'esperando_aceptacion',
                timestamp,
                jugadoresConectados: new Set(),
                jugadoresAceptados: new Set([parseInt(idRetador)]),
                dueloCreado: false,
                tipo: 'lobby_directo',
                modo: 'general'
            };

            salasEspera.set(salaId, nuevaSala);
            salasPendientes.set(salaId, nuevaSala);

            console.log(`[LOBBY]: Sala ${salaId} creada - ${usernameRetador} → ${usernameOponente}`);

            io.to(oponenteSocketId).emit('duelo:recibirInvitacionLobby', {
                mensaje: `${usernameRetador} te desafía a un duelo!`,
                id_retador: idRetador,
                username_retador: usernameRetador,
                salaId,
                timestamp
            });
            
            socket.emit('duelo:invitacionLobbyEnviada', { 
                mensaje: `Invitación enviada a ${usernameOponente}.`,
                salaId
            });

            // Timeout de 30 segundos
            const timeoutId = setTimeout(() => {
                const sala = salasEspera.get(salaId);
                if (sala && sala.estado === 'esperando_aceptacion') {
                    sala.estado = 'expirada';
                    salasEspera.delete(salaId);
                    salasPendientes.delete(salaId);
                    
                    socket.emit('duelo:invitacionExpirada', { mensaje: 'Invitación expiró.' });
                    
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

    socket.on('duelo:aceptarInvitacionLobby', ({ salaId }) => {
        const id_retado = socket.userId;
        if (!id_retado) return;

        const sala = salasEspera.get(salaId);
        if (!sala || (sala.idRetado !== id_retado && sala.retado !== id_retado)) {
            return socket.emit('duelo:error', { mensaje: 'Invitación inválida.' });
        }

        sala.estado = 'aceptada';
        salasEspera.set(salaId, sala);
        salasPendientes.set(salaId, sala);

        console.log(`[LOBBY]: Invitación aceptada en sala ${salaId}`);

        const retadorId = sala.idRetador || sala.retador;
        const retadorSocketId = usuariosConectados.get(retadorId);
        
        if (retadorSocketId) {
            io.to(retadorSocketId).emit('duelo:redirigirASala', { 
                salaId,
                mensaje: '¡Invitación aceptada! Redirigiendo...'
            });
        }
        
        socket.emit('duelo:redirigirASala', { 
            salaId,
            mensaje: 'Invitación aceptada. Redirigiendo...'
        });
    });

    socket.on('duelo:rechazarInvitacionLobby', ({ salaId }) => {
        const sala = salasEspera.get(salaId);
        if (sala) {
            const retadorSocketId = usuariosConectados.get(sala.idRetador);
            if (retadorSocketId) {
                io.to(retadorSocketId).emit('duelo:invitacionLobbyRechazada', {
                    mensaje: 'Tu invitación fue rechazada.'
                });
            }
            salasEspera.delete(salaId);
            salasPendientes.delete(salaId);
        }
    });

    // ============================================================
    // 8.5 MATCHMAKING
    // ============================================================
    
    const buscarPareja = (pool, modo, dificultad = null, apuesta = APUESTAS.DEFAULT) => {
        if (pool.length < 2) return;
        
        const jugadorA = pool.shift();
        const jugadorB = pool.shift();
        
        crearSalaMatchmaking(jugadorA, jugadorB, modo, dificultad, apuesta, io);
    };

    socket.on('duelo_com:buscar:carrera', async ({ user, dificultad, apuesta }) => {
        try {
            const [[{ count }]] = await db.query(
                'SELECT COUNT(*) as count FROM usuario_carrera WHERE id_usuario = ?', 
                [user.id_usuario]
            );
            
            if (count === 0) {
                return socket.emit('duelo:error:sinCarrera', { 
                    mensaje: 'Debes registrar una carrera en tu perfil.' 
                });
            }

            // Validar apuesta
            const apuestaValidada = Math.min(Math.max(apuesta || APUESTAS.DEFAULT, APUESTAS.MIN), APUESTAS.MAX);

            let pool;
            if (dificultad === 'facil') pool = poolCarreraFacil;
            else if (dificultad === 'normal') pool = poolCarreraNormal;
            else pool = poolCarreraDificil;

            if (!pool.some(p => p.userId === user.id_usuario)) {
                pool.push({ 
                    userId: user.id_usuario, 
                    user, 
                    socketId: socket.id, 
                    dificultad,
                    apuesta: apuestaValidada
                });
                buscarPareja(pool, 'carrera', dificultad, apuestaValidada);
            }
        } catch (error) {
            console.error("[MATCHMAKING ERROR]:", error);
            socket.emit('duelo:error', { mensaje: 'Error al buscar pareja' });
        }
    });

    socket.on('duelo_com:buscar:general', (user, apuesta) => {
        const apuestaValidada = Math.min(Math.max(apuesta || APUESTAS.DEFAULT, APUESTAS.MIN), APUESTAS.MAX);
        
        if (!poolGeneral.some(p => p.userId === user.id_usuario)) {
            poolGeneral.push({ 
                userId: user.id_usuario, 
                user, 
                socketId: socket.id,
                apuesta: apuestaValidada
            });
            buscarPareja(poolGeneral, 'general', null, apuestaValidada);
        }
    });

    // ================================================================
    // ✅ EVENTOS DEL JUEGO MEJORADOS
    // ================================================================

    socket.on('duelo:clienteListo', async ({ salaId, userId }) => {
        const duelo = activeDuels.get(salaId);
        
        if (!duelo) {
            return socket.emit('duelo:error', { 
                mensaje: 'Duelo no encontrado.' 
            });
        }

        if (!duelo.jugadores[userId]) {
            try {
                const [userData] = await db.query(
                    'SELECT id_usuario, username, foto_perfil FROM usuario WHERE id_usuario = ?', 
                    [userId]
                );
                
                if (userData.length > 0) {
                    duelo.jugadores[userId] = { 
                        ...userData[0], 
                        socketId: socket.id, 
                        listo: false, 
                        racha: 0,
                        powerUp: null,
                        escudoActivo: false
                    };
                }
            } catch (error) {
                console.error(`[CLIENT READY ERROR]:`, error);
            }
        }

        duelo.jugadores[userId].socketId = socket.id;
        duelo.jugadores[userId].listo = true;
        
        const jugadoresIds = Object.keys(duelo.jugadores);
        const jugadoresListos = jugadoresIds.filter(id => duelo.jugadores[id].listo);
        
        const todosListos = jugadoresIds.length === 2 && jugadoresListos.length === 2;

        if (todosListos) {
            // Enviar info del oponente
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
                            SELECT uc1.id_carrera FROM usuario_carrera uc1
                            INNER JOIN usuario_carrera uc2 ON uc1.id_carrera = uc2.id_carrera
                            WHERE uc1.id_usuario = ? AND uc2.id_usuario = ?
                        )
                        AND (SELECT COUNT(*) FROM pregunta WHERE id_tematica = t.id_tematica) >= 5 
                        ORDER BY RAND() LIMIT 3
                    `, [jugadorA_id, jugadorB_id]);
                    
                } else {
                    [categorias] = await db.query(`
                        SELECT m.id_materia AS id, m.descripcion 
                        FROM materias m
                        WHERE (SELECT COUNT(*) FROM pregunta WHERE id_materia = m.id_materia AND id_carrera IS NULL) >= 5
                        ORDER BY RAND() LIMIT 3
                    `);
                }

                if (categorias.length < 1) {
                    io.to(salaId).emit('duelo:error', { 
                        mensaje: 'No hay categorías disponibles.' 
                    });
                    activeDuels.delete(salaId);
                    return;
                }

                duelo.categoriasDraft = categorias;
                
                // ✅ Enviar categorías CON opción de GAMBITO
                io.to(salaId).emit('duelo:iniciarMiniDraft', { 
                    categorias: categorias.map(c => ({ 
                        id: c.id, 
                        descripcion: c.descripcion 
                    })),
                    permitirGambito: true
                });
                
            } catch (error) {
                console.error(`[DUELO] Error:`, error);
                io.to(salaId).emit('duelo:error', { 
                    mensaje: 'Error preparando categorías.' 
                });
                activeDuels.delete(salaId);
            }
        }
    });

    // ✅ SELECCIÓN CON GAMBITO
    socket.on('duelo:seleccionarCategoria', async ({ salaId, userId, idCategoria, gambitoActivado }) => {
        const duelo = activeDuels.get(salaId);
        if (!duelo || duelo.selecciones[userId]) return;

        duelo.selecciones[userId] = idCategoria;
        duelo.gambitoSelecciones[userId] = gambitoActivado || false;
        
        if (gambitoActivado) {
            duelo.jugadores[userId].gambitoActivado = true;
            duelo.jugadores[userId].gambitoExitoso = true; // Asume éxito hasta que falle
        }
        
        const oponenteId = Object.keys(duelo.jugadores).find(id => id !== userId);
        if (oponenteId) {
            io.to(duelo.jugadores[oponenteId].socketId).emit('duelo:oponenteSelecciono', {
                gambitoActivado: gambitoActivado || false
            });
        }

        const seleccionesCount = Object.keys(duelo.selecciones).length;

        if (seleccionesCount === 2) {
            console.log(`[DRAFT ${salaId}]: ✅ Draft completo, iniciando partida...`);
            duelo.estado = 'en_juego';
            io.to(salaId).emit('duelo:miniDraftFinalizado', { 
                selecciones: duelo.selecciones,
                gambitos: duelo.gambitoSelecciones
            });
            
            salasPendientes.delete(salaId);
            salasEspera.delete(salaId);
            
            setTimeout(() => {
                iniciarPartida(salaId, duelo);
            }, 1000);
        }
    });

    // ✅ ACTIVAR POWER-UP
    socket.on('duelo:activarPowerUp', ({ salaId, userId, idPowerUp }) => {
        const duelo = activeDuels.get(salaId);
        if (!duelo || !duelo.jugadores[userId].powerUp) return;

        const powerUp = duelo.jugadores[userId].powerUp;
        
        if (powerUp.id !== idPowerUp) return;

        const oponenteId = Object.keys(duelo.jugadores).find(id => id !== userId);
        
        console.log(`[POWER-UP]: Usuario ${userId} activa ${powerUp.nombre}`);

        // Verificar si el oponente tiene escudo
        if (duelo.jugadores[oponenteId].escudoActivo) {
            duelo.jugadores[oponenteId].escudoActivo = false;
            duelo.jugadores[oponenteId].powerUp = null;
            
            io.to(duelo.jugadores[oponenteId].socketId).emit('duelo:powerUpBloqueado', {
                mensaje: '🛡️ Tu escudo bloqueó el power-up rival'
            });
            
            socket.emit('duelo:powerUpBloqueado', {
                mensaje: '❌ El oponente bloqueó tu power-up con un escudo'
            });
            
            duelo.jugadores[userId].powerUp = null;
            return;
        }

        // Aplicar efecto según tipo
        switch (powerUp.id) {
            case 'congelar':
                io.to(duelo.jugadores[oponenteId].socketId).emit('duelo:efectoCongelamiento', {
                    duracion: 3000,
                    mensaje: '❄️ ¡Congelado! -3 segundos'
                });
                break;

            case '50_50':
                // El frontend maneja esto
                socket.emit('duelo:efecto5050Activado', {
                    mensaje: '🎯 50/50 activado en la próxima pregunta'
                });
                duelo.jugadores[userId].efecto5050 = true;
                break;

            case 'escudo':
                duelo.jugadores[userId].escudoActivo = true;
                socket.emit('duelo:escudoActivado', {
                    mensaje: '🛡️ Escudo activo'
                });
                break;

            case 'tiempo_extra':
                socket.emit('duelo:tiempoExtra', {
                    tiempo: 5,
                    mensaje: '⏱️ +5 segundos para la próxima pregunta'
                });
                duelo.jugadores[userId].tiempoExtra = 5;
                break;
        }

        duelo.jugadores[userId].powerUp = null;

        io.to(salaId).emit('duelo:actualizarPowerUps', {
            [userId]: null,
            [oponenteId]: duelo.jugadores[oponenteId].powerUp?.id || null
        });
    });

    // ================================================================
    // ✅ INICIAR PARTIDA CON SISTEMA COMPLETO
    // ================================================================

    async function iniciarPartida(salaId, duelo) {
        console.log(`[PARTIDA ${salaId}]: Iniciando con sistema avanzado...`);
        
        try {
            const [idJugadorA, idJugadorB] = Object.keys(duelo.jugadores);
            const idTematicaA = duelo.selecciones[idJugadorA];
            const idTematicaB = duelo.selecciones[idJugadorB];
            
            let queryField = duelo.modo === 'carrera' ? 'id_tematica' : 'id_materia';
            let preguntas = [];

            // ✅ LÓGICA DE SELECCIÓN MEJORADA
            if (idTematicaA === idTematicaB) {
                // DUELO DE EXPERTOS: Misma categoría, preguntas difíciles
                console.log(`[PARTIDA ${salaId}]: 🎓 DUELO DE EXPERTOS`);
                
                const [preguntasExperto] = await db.query(
                    `SELECT p.id_pregunta, p.pregunta, p.retroalimentacion, p.puntos, p.puntos_carrera 
                    FROM pregunta p
                    WHERE p.${queryField} = ? AND p.id_dificultad >= 2
                    ORDER BY RAND() LIMIT 5`, 
                    [idTematicaA]
                );
                
                // Multiplicar puntos x1.5 para duelo de expertos
                preguntas = preguntasExperto.map(p => ({
                    ...p,
                    puntos: Math.floor(p.puntos * 1.5),
                    puntos_carrera: Math.floor(p.puntos_carrera * 1.5),
                    tipo: 'experto'
                }));
                
                io.to(salaId).emit('duelo:notificacionEspecial', {
                    titulo: '🎓 DUELO DE EXPERTOS',
                    mensaje: 'Ambos eligieron la misma categoría. ¡Preguntas difíciles, puntos x1.5!'
                });
                
            } else {
                // DUELO MIXTO: 2+2+1
                console.log(`[PARTIDA ${salaId}]: 🔀 DUELO MIXTO`);
                
                const [preguntasA] = await db.query(
                    `SELECT id_pregunta, pregunta, retroalimentacion, puntos, puntos_carrera 
                    FROM pregunta WHERE ${queryField} = ? ORDER BY RAND() LIMIT 2`, 
                    [idTematicaA]
                );
                
                const [preguntasB] = await db.query(
                    `SELECT id_pregunta, pregunta, retroalimentacion, puntos, puntos_carrera 
                    FROM pregunta WHERE ${queryField} = ? ORDER BY RAND() LIMIT 2`, 
                    [idTematicaB]
                );

                // 1 pregunta general/de carrera
                let preguntaGeneral = [];
                if (duelo.modo === 'carrera') {
                    [preguntaGeneral] = await db.query(
                        `SELECT p.id_pregunta, p.pregunta, p.retroalimentacion, p.puntos, p.puntos_carrera 
                        FROM pregunta p
                        WHERE p.id_carrera IN (
                            SELECT id_carrera FROM usuario_carrera WHERE id_usuario = ?
                        )
                        ORDER BY RAND() LIMIT 1`,
                        [idJugadorA]
                    );
                } else {
                    [preguntaGeneral] = await db.query(
                        `SELECT id_pregunta, pregunta, retroalimentacion, puntos, puntos_carrera 
                        FROM pregunta 
                        WHERE id_materia IS NOT NULL AND id_carrera IS NULL
                        ORDER BY RAND() LIMIT 1`
                    );
                }

                preguntas = [...preguntasA, ...preguntasB, ...preguntaGeneral].map(p => ({
                    ...p,
                    tipo: 'mixto'
                }));
                
                io.to(salaId).emit('duelo:notificacionEspecial', {
                    titulo: '🔀 DUELO MIXTO',
                    mensaje: '2 preguntas de cada categoría + 1 general'
                });
            }

            if (preguntas.length === 0) {
                io.to(salaId).emit('duelo:error', { mensaje: 'No hay preguntas disponibles.' });
                activeDuels.delete(salaId);
                return;
            }

            // Mezclar preguntas
            duelo.examen = preguntas.sort(() => Math.random() - 0.5);
            duelo.preguntaActual = 0;
            duelo.respuestas = {};
            duelo.tiemposRespuesta = {};

            setTimeout(() => enviarSiguientePregunta(salaId, duelo), 3000);
        } catch (error) {
            console.error(`[PARTIDA ${salaId}] Error:`, error);
            io.to(salaId).emit('duelo:error', { mensaje: 'Error preparando preguntas.' });
        }
    }

    // ================================================================
    // ✅ ENVIAR PREGUNTA CON EVENTOS ESPECIALES
    // ================================================================

    async function enviarSiguientePregunta(salaId, duelo) {
        if (!duelo || !duelo.examen || duelo.preguntaActual >= duelo.examen.length) {
            finalizarDuelo(salaId, duelo);
            return;
        }

        const preguntaActual = duelo.examen[duelo.preguntaActual];
        const numeroPregunta = duelo.preguntaActual + 1;
        
        // ✅ ACTIVAR EVENTO ALEATORIO (pregunta 3 o 4)
        if (numeroPregunta === 3 || numeroPregunta === 4) {
            preguntaActual.evento = seleccionarEventoAleatorio();
        }
        
        try {
            const [respuestas] = await db.query(
                'SELECT id_respuesta, respuesta, correcta FROM respuesta WHERE id_pregunta = ? ORDER BY RAND()', 
                [preguntaActual.id_pregunta]
            );

            // Guardar respuesta correcta en el duelo
            const respuestaCorrecta = respuestas.find(r => r.correcta === 1);
            duelo.respuestasCorrectas = duelo.respuestasCorrectas || {};
            duelo.respuestasCorrectas[preguntaActual.id_pregunta] = respuestaCorrecta?.id_respuesta;

            const jugadoresIds = Object.keys(duelo.jugadores);

            // Enviar pregunta a cada jugador (con 50/50 si tienen el efecto)
            jugadoresIds.forEach(jugadorId => {
                let opcionesParaJugador = [...respuestas];

                // Aplicar 50/50 si lo tiene activo
                if (duelo.jugadores[jugadorId].efecto5050) {
                    const correcta = opcionesParaJugador.find(r => r.correcta === 1);
                    const incorrectas = opcionesParaJugador.filter(r => r.correcta !== 1);
                    
                    // Mantener correcta + 1 incorrecta aleatoria
                    const incorrectaRandom = incorrectas[Math.floor(Math.random() * incorrectas.length)];
                    opcionesParaJugador = [correcta, incorrectaRandom].sort(() => Math.random() - 0.5);
                    
                    duelo.jugadores[jugadorId].efecto5050 = false;
                }

                // Calcular duración base
                let duracionBase = 10;
                
                if (duelo.jugadores[jugadorId].tiempoExtra) {
                    duracionBase += duelo.jugadores[jugadorId].tiempoExtra;
                    duelo.jugadores[jugadorId].tiempoExtra = 0;
                }

                if (preguntaActual.evento) {
                    duracionBase = preguntaActual.evento.duracion;
                }

                io.to(duelo.jugadores[jugadorId].socketId).emit('duelo:nuevaPregunta', {
                    pregunta: {
                        id_pregunta: preguntaActual.id_pregunta,
                        pregunta: preguntaActual.pregunta,
                        tipo: preguntaActual.tipo
                    },
                    opciones: opcionesParaJugador.map(r => ({
                        id_respuesta: r.id_respuesta,
                        respuesta: r.respuesta
                    })),
                    numeroPregunta,
                    totalPreguntas: duelo.examen.length,
                    evento: preguntaActual.evento,
                    duracion: duracionBase,
                    efectoVisual: preguntaActual.evento?.efectoVisual || null,
                    tiempoEfecto: preguntaActual.evento?.tiempoEfecto || 0
                });
            });

            // Timer global
            if (duelo.timer) clearTimeout(duelo.timer);
            
            const duracionMaxima = preguntaActual.evento?.duracion || 10;
            duelo.tiempoInicioPregunta = Date.now();
            
            duelo.timer = setTimeout(() => {
                // Penalizar a quienes no respondieron
                Object.keys(duelo.jugadores).forEach(jugadorId => {
                    if (!duelo.respuestas[preguntaActual.id_pregunta]?.[jugadorId]) {
                        duelo.puntuaciones[jugadorId] += SISTEMA_PUNTOS.PENALIZACION_TIMEOUT;
                        duelo.jugadores[jugadorId].racha = 0;
                    }
                });

                io.to(salaId).emit('duelo:actualizarEstado', { 
                    puntuaciones: duelo.puntuaciones,
                    rachas: {
                        [jugadoresIds[0]]: duelo.jugadores[jugadoresIds[0]].racha,
                        [jugadoresIds[1]]: duelo.jugadores[jugadoresIds[1]].racha
                    }
                });
                
                duelo.preguntaActual++;
                setTimeout(() => enviarSiguientePregunta(salaId, duelo), 2000);
            }, duracionMaxima * 1000);
            
        } catch (error) {
            console.error(`Error enviando pregunta:`, error);
            io.to(salaId).emit('duelo:error', { mensaje: 'Error cargando pregunta.' });
        }
    }

    // ================================================================
    // ✅ PROCESAR RESPUESTA CON SISTEMA COMPLETO
    // ================================================================

    socket.on('duelo:responder', async ({ salaId, userId, idPregunta, idRespuesta }) => {
        const duelo = activeDuels.get(salaId);
        if (!duelo || duelo.estado !== 'en_juego') return;

        const preguntaActual = duelo.examen[duelo.preguntaActual];
        if (preguntaActual.id_pregunta !== idPregunta || (duelo.respuestas[idPregunta]?.[userId])) return;

        // Calcular tiempo de respuesta
        const tiempoRespuesta = (Date.now() - duelo.tiempoInicioPregunta) / 1000;

        const oponenteId = Object.keys(duelo.jugadores).find(id => id !== userId);
        if (oponenteId) {
            io.to(duelo.jugadores[oponenteId].socketId).emit('duelo:oponenteRespondio');
        }

        try {
            const [[respuestaData]] = await db.query(
                'SELECT correcta FROM respuesta WHERE id_respuesta = ?', 
                [idRespuesta]
            );

            const esCorrecta = respuestaData?.correcta === 1;
            
            if (!duelo.respuestas[idPregunta]) duelo.respuestas[idPregunta] = {};
            if (!duelo.tiemposRespuesta[idPregunta]) duelo.tiemposRespuesta[idPregunta] = {};
            
            duelo.respuestas[idPregunta][userId] = { esCorrecta, idRespuesta };
            duelo.tiemposRespuesta[idPregunta][userId] = tiempoRespuesta;

            let puntosGanados = 0;
            const eventoActual = preguntaActual.evento;
            const puntosBase = preguntaActual.puntos || 100;

            if (esCorrecta) {
                // ✅ RESPUESTA CORRECTA
                duelo.jugadores[userId].racha++;
                
                // Calcular puntos con velocidad
                puntosGanados = calcularPuntosPorVelocidad(tiempoRespuesta, puntosBase);
                
                // Aplicar multiplicador de evento
                if (eventoActual?.multiplicador) {
                    puntosGanados = Math.floor(puntosGanados * eventoActual.multiplicador);
                }
                
                // Bonus de racha
                const bonusRacha = calcularBonusRacha(duelo.jugadores[userId].racha);
                puntosGanados += bonusRacha;
                
                // ✅ VERIFICAR GAMBITO
                if (duelo.jugadores[userId].gambitoActivado) {
                    // Para cumplir gambito: debe ser más rápido que el oponente Y correcta
                    // Verificaremos esto cuando ambos respondan
                }
                
                // Otorgar power-up cada 3 respuestas correctas
                if (duelo.jugadores[userId].racha % 3 === 0 && !duelo.jugadores[userId].powerUp) {
                    const powerUp = otorgarPowerUp();
                    duelo.jugadores[userId].powerUp = powerUp;
                    
                    socket.emit('duelo:powerUpObtenido', {
                        powerUp: {
                            id: powerUp.id,
                            nombre: powerUp.nombre,
                            descripcion: powerUp.descripcion
                        },
                        mensaje: `🎁 ¡Racha x${duelo.jugadores[userId].racha}! Obtuviste: ${powerUp.nombre}`
                    });
                }
                
            } else {
                // ✅ RESPUESTA INCORRECTA
                duelo.jugadores[userId].racha = 0;
                duelo.jugadores[userId].gambitoExitoso = false;
                
                if (eventoActual?.id === 'riesgo') {
                    puntosGanados = eventoActual.penalizacionError;
                } else if (eventoActual?.id !== 'segura') {
                    puntosGanados = 0;
                }
                
                // Penalizar gambito fallido
                if (duelo.jugadores[userId].gambitoActivado) {
                    const penalizacion = Math.floor(puntosBase * 0.25);
                    puntosGanados -= penalizacion;
                }
            }
            
            duelo.puntuaciones[userId] = (duelo.puntuaciones[userId] || 0) + puntosGanados;

            socket.emit('duelo:resultadoRespuesta', { 
                esCorrecta, 
                retroalimentacion: preguntaActual.retroalimentacion,
                puntosGanados,
                racha: duelo.jugadores[userId].racha,
                tiempoRespuesta: tiempoRespuesta.toFixed(2)
            });

            // Si ambos respondieron
            if (Object.keys(duelo.respuestas[idPregunta]).length === 2) {
                if (duelo.timer) clearTimeout(duelo.timer);

                // ✅ VERIFICAR GAMBITO
                const [j1Id, j2Id] = Object.keys(duelo.jugadores);
                
                for (const jId of [j1Id, j2Id]) {
                    if (duelo.jugadores[jId].gambitoActivado) {
                        const respJ = duelo.respuestas[idPregunta][jId];
                        const tiempoJ = duelo.tiemposRespuesta[idPregunta][jId];
                        const otroId = jId === j1Id ? j2Id : j1Id;
                        const tiempoOtro = duelo.tiemposRespuesta[idPregunta][otroId];
                        
                        // Cumple si: es correcta Y más rápida
                        if (respJ.esCorrecta && tiempoJ < tiempoOtro) {
                            // Gambito exitoso: +50% bonus
                            const bonus = Math.floor((preguntaActual.puntos || 100) * 0.5);
                            duelo.puntuaciones[jId] += bonus;
                            
                            io.to(duelo.jugadores[jId].socketId).emit('duelo:gambitoExitoso', {
                                mensaje: `🎲 ¡GAMBITO EXITOSO! +${bonus} puntos bonus`,
                                bonus
                            });
                        } else if (!respJ.esCorrecta || tiempoJ >= tiempoOtro) {
                            duelo.jugadores[jId].gambitoExitoso = false;
                        }
                    }
                }

                // Notificar resultados al oponente
                const oponenteRespuesta = duelo.respuestas[idPregunta][oponenteId];
                
                io.to(duelo.jugadores[oponenteId].socketId).emit('duelo:resultadoRespuesta', {
                    esCorrecta: oponenteRespuesta.esCorrecta,
                    retroalimentacion: preguntaActual.retroalimentacion,
                    puntosGanados: 0, // Ya se calculó
                    racha: duelo.jugadores[oponenteId].racha,
                    tiempoRespuesta: duelo.tiemposRespuesta[idPregunta][oponenteId].toFixed(2)
                });

                // Actualizar estado
                io.to(salaId).emit('duelo:actualizarEstado', {
                    puntuaciones: duelo.puntuaciones,
                    rachas: {
                        [userId]: duelo.jugadores[userId].racha,
                        [oponenteId]: duelo.jugadores[oponenteId].racha
                    },
                    powerUps: {
                        [userId]: duelo.jugadores[userId].powerUp?.id || null,
                        [oponenteId]: duelo.jugadores[oponenteId].powerUp?.id || null
                    }
                });

                duelo.preguntaActual++;
                setTimeout(() => enviarSiguientePregunta(salaId, duelo), 3000);
            }
        } catch (error) {
            console.error(`Error procesando respuesta:`, error);
            socket.emit('duelo:error', { mensaje: 'Error procesando respuesta.' });
        }
    });

    // ================================================================
    // ✅ FINALIZAR DUELO CON SISTEMA COMPLETO DE PUNTOS
    // ================================================================

    async function finalizarDuelo(salaId, duelo) {
        console.log(`[DUELO ${salaId}]: 🏁 Finalizando con sistema avanzado...`);
        
        const connection = await db.getConnection();
        
        try {
            await connection.beginTransaction();
            
            const jugadoresIds = Object.keys(duelo.jugadores);
            const [jugadorA_id, jugadorB_id] = jugadoresIds;
            
            const puntosA = duelo.puntuaciones[jugadorA_id] || 0;
            const puntosB = duelo.puntuaciones[jugadorB_id] || 0;
            
            // ✅ GUARDAR PUNTOS INICIALES ANTES DEL DUELO
            const [[puntosInicialesA]] = await connection.query(
                'SELECT puntos FROM usuario WHERE id_usuario = ?',
                [jugadorA_id]
            );
            const [[puntosInicialesB]] = await connection.query(
                'SELECT puntos FROM usuario WHERE id_usuario = ?',
                [jugadorB_id]
            );
            
            let ganadorId = null;
            const esEmpate = puntosA === puntosB;
            
            if (!esEmpate) {
                ganadorId = puntosA > puntosB ? jugadorA_id : jugadorB_id;
            }
            
            const apuesta = duelo.apuesta || 20;
            const bote = apuesta * 2;
            const recompensaBase = duelo.recompensaBase || 30;
            
            // ================================================================
            // CALCULAR PUNTOS DETALLADOS PARA CADA JUGADOR
            // ================================================================
            
            const resultadosDetallados = {};
            
            for (const jugadorId of jugadoresIds) {
                const puntuacionPartida = duelo.puntuaciones[jugadorId] || 0;
                const esGanador = !esEmpate && jugadorId === ganadorId;
                const puntosIniciales = jugadorId === jugadorA_id ? 
                    puntosInicialesA.puntos : puntosInicialesB.puntos;
                
                // Contar respuestas correctas
                let respuestasCorrectas = 0;
                for (const respuestas of Object.values(duelo.respuestas)) {
                    if (respuestas[jugadorId]?.esCorrecta) {
                        respuestasCorrectas++;
                    }
                }
                
                const porcentaje = (respuestasCorrectas / duelo.examen.length) * 100;
                
                // Bonus de rendimiento
                let bonusRendimiento = 0;
                if (porcentaje >= 90) bonusRendimiento = 50;
                else if (porcentaje >= 75) bonusRendimiento = 30;
                else if (porcentaje >= 50) bonusRendimiento = 15;
                
                // ✅ CALCULAR DESGLOSE COMPLETO
                let desglose = [];
                let cambioTotal = 0;
                
                // 1. Puntos de la partida
                desglose.push({
                    concepto: '🎮 Puntos de Partida',
                    valor: puntuacionPartida,
                    esPositivo: true
                });
                cambioTotal += puntuacionPartida;
                
                // 2. Bonus de rendimiento
                if (bonusRendimiento > 0) {
                    desglose.push({
                        concepto: `⭐ Bonus Rendimiento (${porcentaje.toFixed(0)}%)`,
                        valor: bonusRendimiento,
                        esPositivo: true
                    });
                    cambioTotal += bonusRendimiento;
                }
                
                // 3. Apuesta
                if (esGanador) {
                    desglose.push({
                        concepto: '🎰 Bote de Apuesta',
                        valor: bote,
                        esPositivo: true
                    });
                    cambioTotal += bote;
                    
                    // 4. Recompensa base
                    desglose.push({
                        concepto: '💎 Recompensa Base',
                        valor: recompensaBase,
                        esPositivo: true
                    });
                    cambioTotal += recompensaBase;
                    
                    // 5. Bonus victoria
                    desglose.push({
                        concepto: '👑 Bonus Victoria',
                        valor: 100,
                        esPositivo: true
                    });
                    cambioTotal += 100;
                    
                } else if (esEmpate) {
                    desglose.push({
                        concepto: '🤝 Devolución Apuesta',
                        valor: apuesta,
                        esPositivo: true
                    });
                    cambioTotal += apuesta;
                    
                    desglose.push({
                        concepto: '💰 Recompensa Empate',
                        valor: Math.floor(recompensaBase / 2),
                        esPositivo: true
                    });
                    cambioTotal += Math.floor(recompensaBase / 2);
                    
                } else {
                    // Perdedor: pierde apuesta
                    desglose.push({
                        concepto: '💔 Pérdida Apuesta',
                        valor: apuesta,
                        esPositivo: false
                    });
                    cambioTotal -= apuesta;
                }
                
                // 6. Bonus de Gambito (si aplica)
                if (duelo.jugadores[jugadorId].gambitoActivado && 
                    duelo.jugadores[jugadorId].gambitoExitoso) {
                    const bonusGambito = Math.floor(puntuacionPartida * 0.25);
                    desglose.push({
                        concepto: '🎲 Bonus Gambito Exitoso',
                        valor: bonusGambito,
                        esPositivo: true
                    });
                    cambioTotal += bonusGambito;
                }
                
                // No permitir puntos negativos totales
                cambioTotal = Math.max(-puntosIniciales, cambioTotal);
                
                resultadosDetallados[jugadorId] = {
                    puntosIniciales,
                    puntuacionPartida,
                    desglose,
                    cambioTotal,
                    puntosFinal: puntosIniciales + cambioTotal,
                    respuestasCorrectas,
                    respuestasIncorrectas: duelo.examen.length - respuestasCorrectas,
                    rachaMaxima: duelo.jugadores[jugadorId].rachaMaxima || duelo.jugadores[jugadorId].racha || 0,
                    porcentaje: porcentaje.toFixed(1)
                };
                
                // ✅ ACTUALIZAR BASE DE DATOS
                await connection.query(
                    `UPDATE usuario 
                    SET puntos = GREATEST(0, puntos + ?),
                        racha_victorias = CASE 
                            WHEN ? THEN racha_victorias + 1 
                            ELSE 0 
                        END
                    WHERE id_usuario = ?`,
                    [cambioTotal, esGanador, jugadorId]
                );
                
                console.log(`[FINALIZAR]: Usuario ${jugadorId}`);
                console.log(`  - Inicial: ${puntosIniciales}`);
                console.log(`  - Cambio: ${cambioTotal > 0 ? '+' : ''}${cambioTotal}`);
                console.log(`  - Final: ${puntosIniciales + cambioTotal}`);
            }
            
            // ================================================================
            // REGISTRAR EN HISTORIAL
            // ================================================================
            
            await connection.query(
                `INSERT INTO historial_duelos 
                (id_retador, id_defensor, id_ganador, puntos_retador, puntos_defensor, fecha_duelo)
                VALUES (?, ?, ?, ?, ?, NOW())`,
                [jugadorA_id, jugadorB_id, ganadorId, puntosA, puntosB]
            );
            
            await connection.commit();
            
            // ================================================================
            // ✅ EMITIR RESULTADO CON DESGLOSE COMPLETO
            // ================================================================
            
            io.to(salaId).emit('duelo:finalizado', {
                ganadorId,
                esEmpate,
                puntuaciones: duelo.puntuaciones,
                apuesta,
                bote,
                recompensaBase,
                resultados: resultadosDetallados,
                jugadores: jugadoresIds.map(jId => ({
                    userId: jId,
                    username: duelo.jugadores[jId].username,
                    foto_perfil: duelo.jugadores[jId].foto_perfil,
                    puntuacionFinal: duelo.puntuaciones[jId],
                    racha: duelo.jugadores[jId].racha,
                    // ✅ DATOS PARA LA VENTANA ANIMADA
                    puntosIniciales: resultadosDetallados[jId].puntosIniciales,
                    puntosFinal: resultadosDetallados[jId].puntosFinal,
                    cambioTotal: resultadosDetallados[jId].cambioTotal,
                    desglose: resultadosDetallados[jId].desglose,
                    respuestasCorrectas: resultadosDetallados[jId].respuestasCorrectas,
                    respuestasIncorrectas: resultadosDetallados[jId].respuestasIncorrectas,
                    porcentaje: resultadosDetallados[jId].porcentaje
                }))
            });
            
            setTimeout(() => {
                activeDuels.delete(salaId);
            }, 30000);
            
        } catch (error) {
            await connection.rollback();
            console.error(`Error finalizando duelo:`, error);
            io.to(salaId).emit('duelo:error', { mensaje: 'Error procesando resultado.' });
        } finally {
            connection.release();
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
        }
        
        if (duelo.timer) clearTimeout(duelo.timer);
        activeDuels.delete(salaId);
    });

    socket.on('disconnect', () => {
        if (socket.userId) {
            usuariosConectados.delete(socket.userId);
            usuariosEnPortalCompetitivo.delete(socket.userId);
        }
        
        poolCarreraFacil = poolCarreraFacil.filter(p => p.socketId !== socket.id);
        poolCarreraNormal = poolCarreraNormal.filter(p => p.socketId !== socket.id);
        poolCarreraDificil = poolCarreraDificil.filter(p => p.socketId !== socket.id);
        poolGeneral = poolGeneral.filter(p => p.socketId !== socket.id);
    });
};