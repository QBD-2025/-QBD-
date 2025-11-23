const db = require('../db/conexion');
const { v4: uuidv4 } = require('uuid');
const { GestorPuntuacion, SISTEMA_PUNTOS } = require('../routes/duelo_puntos');

const MOTIVOS_ABANDONO = {
    VOLUNTARIO: 'voluntario',
    DESCONEXION: 'desconexion',
    ERROR_SERVIDOR: 'error_servidor',
    TIMEOUT: 'timeout',
    EXPULSION: 'expulsion',
    AFK: 'afk',
    NAVEGACION: 'navegacion',
    RENDIRSE: 'rendirse'
};

const PENALIZACIONES = {
    ABANDONO_VOLUNTARIO: 0.5,        
    DESCONEXION_RAPIDA: 0.25,        
    ABANDONO_CON_APUESTA: 1.0,       
    SIN_APUESTA: 0,                  
    AFK_TIMEOUT: 0.3,               
    NAVEGACION_ACCIDENTAL: 0.40
};

// ================================================================
// SISTEMA DE RECONEXIÓN
// ================================================================

const usuariosDesconectados = new Map();

function registrarDesconexion(userId, salaId, duelo) {
    const timestamp = Date.now();
    
    usuariosDesconectados.set(parseInt(userId), {
        salaId,
        timestamp,
        duelo,
        intentosReconexion: 0,
        tiempoMaximo: 60000 // 60 segundos para reconectar
    });
    
    console.log(`[DESCONEXIÓN]: Usuario ${userId} registrado - 60s para reconectar`);
}

function verificarReconexion(userId) {
    const info = usuariosDesconectados.get(parseInt(userId));
    
    if (!info) return null;
    
    const tiempoTranscurrido = Date.now() - info.timestamp;
    
    if (tiempoTranscurrido > info.tiempoMaximo) {
        usuariosDesconectados.delete(parseInt(userId));
        return null;
    }
    
    return info;
}

function limpiarDesconexion(userId) {
    const resultado = usuariosDesconectados.delete(parseInt(userId));
    if (resultado) {
        console.log(`[DESCONEXIÓN]: Usuario ${userId} limpiado de lista`);
    }
    return resultado;
}

// ================================================================
// ✅ FUNCIÓN MEJORADA: Procesar Abandono (CON id_sala)
// ================================================================

async function procesarAbandono(salaId, userId, motivo, io, detallesExtra = {}) {
    console.log('');
    console.log('▓ [procesarAbandono] FUNCIÓN EJECUTÁNDOSE');
    console.log(`📥 Parámetros recibidos:`);
    console.log(`   - salaId: ${salaId}`);
    console.log(`   - userId: ${userId} (tipo: ${typeof userId})`);
    console.log(`   - motivo: ${motivo}`);
    console.log(`   - detallesExtra:`, detallesExtra);
    console.log('');
    
    const duelo = activeDuels.get(salaId);
    
    if (!duelo) {
        console.error(`❌ ERROR: Duelo ${salaId} no encontrado en activeDuels`);
        throw new Error('Duelo no encontrado');
    }
    
    console.log('✅ Duelo encontrado en procesarAbandono');
    console.log(`   - Apuesta: ${duelo.apuesta} pts`);
    console.log('');
    
    const jugador = duelo.jugadores[userId];
    const oponenteId = Object.keys(duelo.jugadores).find(id => id !== userId.toString());
    const oponente = duelo.jugadores[oponenteId];
    
    if (!jugador || !oponente) {
        throw new Error('Jugadores no encontrados');
    }
    
    const apuesta = duelo.apuesta || 0;
    
    try {
        let penalizacion = 0;
        let gananciaOponente = 0;
        let mensajeAbandono = '';
        let mensajeOponente = '';
        let iconoAbandono = '🚪';
        let iconoOponente = '🏆';

        if (apuesta > 0) {
            switch (motivo) {
                case 'voluntario':
                case 'rendirse':
                    penalizacion = Math.floor(apuesta * 0.30);
                    gananciaOponente = penalizacion;
                    iconoAbandono = '🏳️';
                    mensajeAbandono = `Te rendiste en el duelo. Perdiste ${penalizacion} puntos (30% de ${apuesta} pts apostados).`;
                    mensajeOponente = `¡Victoria! Tu oponente se rindió. Ganaste ${gananciaOponente} puntos.`;
                    console.log(`   ✅ Rendición voluntaria: 30% = ${penalizacion} pts`);
                    break;
                    
                case 'abandonar':
                case 'navegacion':
                    penalizacion = Math.floor(apuesta * 0.50);
                    gananciaOponente = penalizacion;
                    iconoAbandono = '🚪';
                    mensajeAbandono = `Abandonaste el duelo. Perdiste ${penalizacion} puntos (50% de ${apuesta} pts apostados).`;
                    mensajeOponente = `¡Victoria! Tu oponente abandonó. Ganaste ${gananciaOponente} puntos.`;
                    console.log(`   ✅ Abandono: 50% = ${penalizacion} pts`);
                    break;
                    
                case 'desconexion':
                    penalizacion = Math.floor(apuesta * 0.25);
                    gananciaOponente = penalizacion;
                    iconoAbandono = '📡';
                    mensajeAbandono = `Se perdió la conexión. Perdiste ${penalizacion} puntos (25% de ${apuesta} pts apostados).`;
                    mensajeOponente = `¡Victoria! Tu oponente se desconectó. Ganaste ${gananciaOponente} puntos.`;
                    console.log(`   ✅ Desconexión: 25% = ${penalizacion} pts`);
                    break;
                    
                case 'afk':
                case 'timeout':
                    penalizacion = Math.floor(apuesta * 0.30);
                    gananciaOponente = penalizacion;
                    iconoAbandono = '⏰';
                    mensajeAbandono = `Fuiste expulsado por inactividad. Perdiste ${penalizacion} puntos (30% de ${apuesta} pts apostados).`;
                    mensajeOponente = `¡Victoria! Tu oponente fue expulsado por inactividad. Ganaste ${gananciaOponente} puntos.`;
                    console.log(`   ✅ AFK/Timeout: 30% = ${penalizacion} pts`);
                    break;
                    
                case 'error_servidor':
                    penalizacion = 0;
                    gananciaOponente = apuesta;
                    iconoAbandono = '❌';
                    iconoOponente = '💰';
                    mensajeAbandono = 'Hubo un error del servidor. Tu apuesta ha sido devuelta.';
                    mensajeOponente = 'Hubo un error del servidor. Tu apuesta ha sido devuelta.';
                    console.log('   ℹ️ Error servidor - Devolviendo apuestas');
                    break;
                    
                default:
                    penalizacion = Math.floor(apuesta * 0.30);
                    gananciaOponente = penalizacion;
                    mensajeAbandono = `Abandonaste el duelo. Perdiste ${penalizacion} puntos.`;
                    mensajeOponente = `¡Victoria! Tu oponente abandonó. Ganaste ${gananciaOponente} puntos.`;
                    console.log(`   ⚠️ Motivo desconocido, usando 30%: ${penalizacion} pts`);
                    break;
            }
        } else {
            iconoAbandono = '😔';
            mensajeAbandono = 'Te rendiste en el duelo.';
            mensajeOponente = '¡Victoria! Tu oponente se rindió.';
            gananciaOponente = 50;
            console.log('   ℹ️ Duelo sin apuesta - Ganancia básica: 50 pts');
        }

        const connection = await db.getConnection();
        
        try {
            await connection.beginTransaction();
            console.log('   📝 Transacción iniciada...');

            if (penalizacion > 0) {
                const [resultPenalizacion] = await connection.query(
                    'UPDATE usuario SET puntos = GREATEST(0, puntos - ?) WHERE id_usuario = ?',
                    [penalizacion, userId]
                );
            }
            
            // ✅ CORREGIDO: Recompensar al oponente
            if (gananciaOponente > 0) {
                const [resultRecompensa] = await connection.query(
                    'UPDATE usuario SET puntos = puntos + ? WHERE id_usuario = ?',
                    [gananciaOponente, oponenteId]
                );
            }

            const jugadoresIds = Object.keys(duelo.jugadores);
            const [resultHistorial] = await connection.query(
                `INSERT INTO historial_duelos 
                (id_retador, id_defensor, id_ganador, puntos_retador, puntos_defensor, 
                fecha_duelo)
                VALUES (?, ?, ?, ?, ?, NOW())`,
                [
                    duelo.jugadores[jugadoresIds[0]]?.id_usuario || jugadoresIds[0],
                    duelo.jugadores[jugadoresIds[1]]?.id_usuario || jugadoresIds[1],
                    oponenteId,
                    duelo.puntuaciones?.[jugadoresIds[0]] || 0,
                    duelo.puntuaciones?.[jugadoresIds[1]] || 0,
                    apuesta,
                    duelo.modo || 'general',
                    `abandono_${motivo}`,
                    `Usuario ${jugador.username} (${userId}) abandonó. Motivo: ${motivo}. Penalización: ${penalizacion} pts. Ganancia oponente: ${gananciaOponente} pts.`
                ]
            );

            await connection.commit();

        } catch (dbError) {
            await connection.rollback();
            throw dbError;
        } finally {
            connection.release();
            console.log('   🔓 Conexión liberada');
        }

        // Notificar al que abandonó
        const socketAbandono = usuariosConectados.get(parseInt(userId));
        if (socketAbandono) {
            io.to(socketAbandono).emit('duelo:abandonoConfirmado', {
                mensaje: mensajeAbandono,
                penalizacion,
                apuesta,
                motivo,
                icono: iconoAbandono,
                mostrarPantalla: true
            });
        }
        
        // Notificar al oponente
        const socketOponente = oponente.socketId;
        if (socketOponente) {
            io.to(socketOponente).emit('duelo:oponenteAbandono', {
                mensaje: mensajeOponente,
                ganancia: gananciaOponente,
                motivo,
                nombreOponente: jugador.username,
                icono: iconoOponente,
                mostrarPantalla: true
            });
        }
        
        // Limpiar timers
        if (duelo.timer) {
            clearTimeout(duelo.timer);
        }
        if (duelo.timeoutReconexion) {
            clearTimeout(duelo.timeoutReconexion);
        }
        
        // Eliminar de mapas
        activeDuels.delete(salaId);
        
        if (typeof salasPendientes !== 'undefined') {
            salasPendientes.delete(salaId);
        }
        if (typeof salasEspera !== 'undefined') {
            salasEspera.delete(salaId);
        }
        
        if (typeof limpiarDesconexion === 'function') {
            limpiarDesconexion(userId);
        }
    } catch (error) {

        
        // ✅ CORREGIDO: Notificar error correcto
        const socketAbandono = usuariosConectados.get(parseInt(userId));
        const socketOponente = oponente?.socketId;
        
        if (socketAbandono) {
            io.to(socketAbandono).emit('duelo:errorCritico', {
                mensaje: 'Error al procesar abandono. Por favor recarga la página.',
                codigo: 'ERR_ABANDONO_PROCESAMIENTO',
                detalles: error.message
            });
        }
        
        if (socketOponente) {
            io.to(socketOponente).emit('duelo:errorCritico', {
                mensaje: 'Hubo un problema con el duelo. Tu apuesta ha sido devuelta.',
                codigo: 'ERR_ABANDONO_PROCESAMIENTO'
            });
        }
        
        throw error;
    }
}

module.exports = (io, socket) => {
    
    // ================================================================
    // ✅ HANDLER: Solicitar salir del duelo con advertencia
    // ================================================================
    
    socket.on('duelo:solicitarSalida', ({ salaId, userId }) => {
        const duelo = activeDuels.get(salaId);
        
        if (!duelo) {
            return socket.emit('duelo:error', { 
                mensaje: 'Duelo no encontrado' 
            });
        }
        
        const apuesta = duelo.apuesta || 0;
        let penalizacion = 0;
        let mensaje = '';
        
        if (apuesta > 0) {
            penalizacion = Math.floor(apuesta * PENALIZACIONES.RENDIRSE);
            mensaje = `⚠️ Si te rindes:\n\n` +
                    `• Perderás ${penalizacion} puntos (30% de apuesta)\n` +
                    `• Tu oponente ganará ${penalizacion} puntos\n` +
                    `• Se registrará como derrota\n\n` +
                    `💡 Consejo: Si continúas jugando, aún puedes ganar.`;
        } else {
            mensaje = `⚠️ Si te rindes:\n\n` +
                    `• Se registrará como derrota\n` +
                    `• Tu oponente ganará automáticamente\n` +
                    `• Perderás tu racha actual\n\n` +
                    `¿Estás seguro?`;
        }
        
        socket.emit('duelo:confirmarSalida', {
            mensaje,
            penalizacion,
            apuesta,
            tieneApuesta: apuesta > 0
        });
    });

socket.on('duelo:confirmarRendicion', async ({ salaId, userId }) => {
    
    const duelo = activeDuels.get(salaId);
    
    if (!duelo) {
        return socket.emit('duelo:errorCritico', {
            mensaje: 'El duelo no está disponible',
            codigo: 'ERR_DUELO_NO_ENCONTRADO'
        });
    }
    
    const jugador = duelo.jugadores[userId];
    const oponenteId = Object.keys(duelo.jugadores).find(id => id !== userId.toString());
    
    if (!jugador || !oponenteId || !duelo.jugadores[oponenteId]) {
        return socket.emit('duelo:errorCritico', {
            mensaje: 'Error al procesar rendición',
            codigo: 'ERR_JUGADORES_NO_ENCONTRADOS'
        });
    }
    try {
        await procesarAbandono(
            salaId, 
            userId, 
            'voluntario',
            io,
            { esRendicion: true }
        );

    } catch (error) {
        
        socket.emit('duelo:errorCritico', {
            mensaje: 'Error al procesar rendición.',
            codigo: 'ERR_RENDICION_PROCESAMIENTO'
        });
    }
});
    
    // ================================================================
    // Confirmar abandono voluntario
    // ================================================================
    
    socket.on('duelo:confirmarAbandono', async ({ salaId, userId, motivo }) => {
        const motivoFinal = motivo || MOTIVOS_ABANDONO.VOLUNTARIO;
        
        try {
            await procesarAbandono(salaId, userId, motivoFinal, io);
        } catch (error) {
            console.error('[ABANDONO ERROR]:', error);
            socket.emit('duelo:errorCritico', { 
                mensaje: 'Error al procesar abandono',
                codigo: 'ERR_ABANDONO'
            });
        }
    });
    socket.on('disconnect', async () => {
        const userId = socket.userId;
        
        if (!userId) return;
        
        
        // Buscar si está en algún duelo activo
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
            console.log(`[DISCONNECT]: Usuario ${userId} estaba en duelo ${salaActiva}`);
            
            const oponenteId = Object.keys(dueloActivo.jugadores).find(id => id !== userId.toString());
            
            // Notificar al oponente
            if (oponenteId && dueloActivo.jugadores[oponenteId]?.socketId) {
                io.to(dueloActivo.jugadores[oponenteId].socketId).emit('duelo:oponenteDesconectado', {
                    mensaje: `${dueloActivo.jugadores[userId].username} se desconectó`,
                    tiempoEspera: 60
                });
            }
            
            // Registrar para reconexión
            registrarDesconexion(userId, salaActiva, dueloActivo);
            
            // Timer de 60 segundos
            dueloActivo.timeoutReconexion = setTimeout(async () => {
                const infoDesconexion = usuariosDesconectados.get(parseInt(userId));
                
                if (infoDesconexion) {
                    console.log(`[TIMEOUT RECONEXIÓN]: Usuario ${userId} no se reconectó a tiempo`);
                    
                    await procesarAbandono(
                        salaActiva, 
                        userId, 
                        MOTIVOS_ABANDONO.TIMEOUT,
                        io
                    );
                }
            }, 60000);
            
        } else {
            // No está en duelo, limpiar normalmente
            usuariosConectados.delete(parseInt(userId));
            usuariosEnPortalCompetitivo.delete(parseInt(userId));
        }
    });
    
    console.log('[SISTEMA ABANDONOS]: ✅ Handlers de servidor registrados');
};



// Exportar funciones para uso global
module.exports.procesarAbandono = procesarAbandono;
module.exports.registrarDesconexion = registrarDesconexion;
module.exports.verificarReconexion = verificarReconexion;
module.exports.limpiarDesconexion = limpiarDesconexion;
module.exports.MOTIVOS_ABANDONO = MOTIVOS_ABANDONO;
module.exports.PENALIZACIONES = PENALIZACIONES;

const APUESTAS = SISTEMA_PUNTOS.APUESTA;
const RECOMPENSAS = SISTEMA_PUNTOS.RECOMPENSA;
// ================================================================
// CONSTANTES
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
        notificacion: '💀 RONDA DE RIESGO: Si fallas pierdes -25 puntos',
        duracion: 10,
        penalizacionError: -25
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
// FUNCIONES AUXILIARES
// ================================================================



function otorgarPowerUp() {
    const powerUpsArray = Object.values(POWER_UPS);
    const randomIndex = Math.floor(Math.random() * powerUpsArray.length);
    return powerUpsArray[randomIndex];
}

function seleccionarEventoAleatorio() {
    if (Math.random() < 0.3) {
        const randomIndex = Math.floor(Math.random() * EVENTOS_ESPECIALES.length);
        return EVENTOS_ESPECIALES[randomIndex];
    }
    return null;
}

// ================================================================
// ✅ CREAR SALA MATCHMAKING CORREGIDO
// ================================================================

async function crearSalaMatchmaking(jugadorA, jugadorB, modo, dificultad, apuesta, io) {
    const salaId = uuidv4();
    
    console.log(`[MATCHMAKING]: 🎯 Creando sala ${salaId}`);
    console.log(`[MATCHMAKING]: Modo: ${modo}, Dificultad: ${dificultad}, Apuesta: ${apuesta}`);
    
    // ✅ VALIDAR PUNTOS ANTES DE CREAR SALA
    try {
        const validacion = await GestorPuntuacion.validarApuesta(
            jugadorA.userId,
            jugadorB.userId,
            apuesta
        );
        
        if (!validacion.valido) {
            console.error(`[MATCHMAKING]: ❌ ${validacion.mensaje}`);
            
            // Notificar a ambos jugadores
            io.to(jugadorA.socketId).emit('duelo:error', {
                mensaje: `No se puede crear duelo: ${validacion.mensaje}`
            });
            io.to(jugadorB.socketId).emit('duelo:error', {
                mensaje: `No se puede crear duelo: ${validacion.mensaje}`
            });
            
            return null;
        }
        
        console.log(`[MATCHMAKING]: ✅ Validación de apuesta exitosa (max: ${validacion.puntosMaximos})`);
        
    } catch (error) {
        console.error(`[MATCHMAKING]: Error validando apuesta:`, error);
        return null;
    }
    
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
// ✅ VERIFICAR E INICIAR DUELO - CORREGIDO
// ================================================================

async function verificarEIniciarDuelo(salaId, io) {
    const sala = salasPendientes.get(salaId) || salasEspera.get(salaId);
    
    if (!sala) {
        console.error(`[VERIFICAR]: ❌ Sala ${salaId} no encontrada`);
        return false;
    }

    console.log(`[VERIFICAR]: 🔍 Analizando sala ${salaId}`);
    console.log(`[VERIFICAR]: Jugadores conectados: ${sala.jugadoresConectados?.size || 0}/2`);
    console.log(`[VERIFICAR]: Estado: ${sala.estado}`);

    // ✅ Verificar que hay exactamente 2 jugadores
    if (!sala.jugadoresConectados || sala.jugadoresConectados.size < 2) {
        sala.intentosConexion = (sala.intentosConexion || 0) + 1;
        
        if (sala.intentosConexion < 8) { // Aumentar a 8 intentos
            console.log(`[VERIFICAR]: ⏳ Esperando jugadores... (intento ${sala.intentosConexion}/8)`);
            setTimeout(() => {
                verificarEIniciarDuelo(salaId, io);
            }, 1000);
            return false;
        } else {
            console.error(`[VERIFICAR]: ❌ Timeout esperando jugadores`);
            io.to(salaId).emit('sala:error', {
                mensaje: 'El otro jugador no se conectó a tiempo.'
            });
            return false;
        }
    }

    // ✅ Prevenir múltiples ejecuciones
    if (sala.dueloCreado) {
        console.log(`[VERIFICAR]: ⚠️ Duelo ya creado para sala ${salaId}`);
        return false;
    }

    // ✅ Marcar como creado ANTES de hacer consultas
    sala.dueloCreado = true;
    sala.estado = 'iniciando_duelo';
    salasPendientes.set(salaId, sala);
    salasEspera.set(salaId, sala);

    console.log(`[VERIFICAR]: ✅ INICIANDO DUELO en sala ${salaId}`);

    try {
        const retadorId = parseInt(sala.retador || sala.idRetador);
        const retadoId = parseInt(sala.retado || sala.idRetado);

        // ✅ Cargar datos completos de ambos jugadores
        const [retadorData] = await db.query(
            'SELECT id_usuario, username, foto_perfil, puntos FROM usuario WHERE id_usuario = ?', 
            [retadorId]
        );
        
        const [retadoData] = await db.query(
            'SELECT id_usuario, username, foto_perfil, puntos FROM usuario WHERE id_usuario = ?', 
            [retadoId]
        );

        if (retadorData.length === 0 || retadoData.length === 0) {
            throw new Error('Usuario no encontrado en base de datos');
        }

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
            throw new Error('Sockets no encontrados para los jugadores');
        }

        const socketA = io.sockets.sockets.get(retadorSocketId);
        const socketB = io.sockets.sockets.get(retadoSocketId);

        if (!socketA || !socketB) {
            throw new Error('No se pudieron obtener los objetos socket');
        }

        // ✅ Unir a sala
        socketA.join(salaId);
        socketB.join(salaId);

        console.log(`[VERIFICAR]: ✅ Sockets unidos a sala ${salaId}`);

        
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
            tiemposRespuesta: {},
            // ✅ AGREGAR ESTAS LÍNEAS:
            desglosePuntos: {},
            respuestasCorrectas: {},
            negociacionApuesta: null,
            jugadoresQuierenApostar: {}
        });
        if (sala.timeoutId) {
            clearTimeout(sala.timeoutId);
        }

        // ✅ Cambiar estado de sala
        sala.estado = 'duelo_creado';
        salasPendientes.set(salaId, sala);
        salasEspera.set(salaId, sala);

        console.log(`[VERIFICAR]: ✅ Duelo creado en activeDuels`);

        // ✅ Notificar información del duelo
        io.to(salaId).emit('duelo:informacionInicial', {
            apuesta,
            bote: apuesta * 2,
            recompensaBase: RECOMPENSAS[sala.dificultad] || RECOMPENSAS.normal,
            dificultad: sala.dificultad
        });

        // ✅ Notificar que el duelo está listo
        io.to(salaId).emit('duelo:dueloListo', { salaId });
        
        console.log(`[VERIFICAR]: ✅ Eventos emitidos correctamente`);

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
// CREAR SALA BD
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
            console.log(`[CLEANUP]: Sala ${salaId} eliminada por timeout`);
        }
    }
}, 5 * 60 * 1000);

// ================================================================
// MÓDULO PRINCIPAL
// ================================================================

module.exports = (io, socket) => {
    
    // ================================================================
    // REGISTRO DE USUARIOS
    // ================================================================
    
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
        console.log(`[PORTAL]: Usuario ${userIdInt} entró al portal competitivo`);
    });

    socket.on('competitivo:salirPortal', (userId) => {
        if (!userId) return;
        
        const userIdInt = parseInt(userId);
        usuariosEnPortalCompetitivo.delete(userIdInt);
        console.log(`[PORTAL]: Usuario ${userIdInt} salió del portal competitivo`);
    });

    // ================================================================
    // ✅ HANDLER: sala:unirse
    // ================================================================
    
    socket.on('sala:unirse', async ({ salaId }) => {
        const userId = socket.userId;
        
        if (!userId) {
            console.error('[SALA:UNIRSE]: Usuario no identificado');
            return socket.emit('sala:error', { mensaje: 'Usuario no identificado' });
        }

        console.log(`[SALA:UNIRSE]: Usuario ${userId} intentando unirse a sala ${salaId}`);

        let sala = null;
        let salaKey = null;
        let intentos = 0;
        const maxIntentos = 10;
        
        // Buscar sala con reintentos
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
                console.log(`[SALA:UNIRSE]: Intento ${intentos}/${maxIntentos} - Esperando...`);
                await new Promise(r => setTimeout(r, 500));
            }
        }
        
        if (!sala) {
            console.error(`[SALA:UNIRSE]: ❌ Sala ${salaId} no encontrada después de ${intentos} intentos`);
            return socket.emit('sala:error', { mensaje: 'Sala no encontrada o expiró' });
        }

        console.log(`[SALA:UNIRSE]: ✅ Sala ${salaId} encontrada en intento ${intentos}`);

        const retadorId = parseInt(sala.retador || sala.idRetador);
        const retadoId = parseInt(sala.retado || sala.idRetado);
        const userIdInt = parseInt(userId);

        if (userIdInt !== retadorId && userIdInt !== retadoId) {
            console.error(`[SALA:UNIRSE]: ❌ Usuario ${userId} no autorizado`);
            return socket.emit('sala:error', { mensaje: 'No autorizado para esta sala' });
        }

        console.log(`[SALA:UNIRSE]: ✅ Usuario ${userId} autorizado`);

        usuariosConectados.set(userIdInt, socket.id);

        if (!sala.jugadoresConectados) {
            sala.jugadoresConectados = new Set();
        }
        
        sala.jugadoresConectados.add(userIdInt);
        
        salasPendientes.set(salaKey, sala);
        salasEspera.set(salaKey, sala);

        socket.join(salaId);

        console.log(`[SALA:UNIRSE]: Jugadores conectados: ${sala.jugadoresConectados.size}/2`);

        socket.emit('sala:conectado', { 
            salaId,
            mensaje: `Conectado a sala (${sala.jugadoresConectados.size}/2)`
        });

        // ✅ SI AMBOS ESTÁN CONECTADOS, INICIAR DUELO
        if (sala.jugadoresConectados.size === 2 && !sala.dueloCreado) {
            console.log(`[SALA:UNIRSE]: ✅ AMBOS JUGADORES CONECTADOS - Iniciando duelo...`);
            
            const delay = sala.tipo === 'matchmaking' ? 2000 : 1000;
            
            setTimeout(async () => {
                await verificarEIniciarDuelo(salaKey, io);
            }, delay);
        }
    });
    // ================================================================
    // ✅ HANDLER: duelo:clienteListo
    // ================================================================
    
    socket.on('duelo:clienteListo', async ({ salaId, userId }) => {
        console.log('═══════════════════════════════════════════════════════════');
        console.log(`[CLIENT LISTO]: 🎯 Usuario ${userId} se reporta listo`);
        console.log(`[CLIENT LISTO]: Sala: ${salaId}`);
        console.log('═══════════════════════════════════════════════════════════');
        
        const duelo = activeDuels.get(salaId);
        
        if (!duelo) {
            console.error(`[CLIENT LISTO]: ❌ Duelo no encontrado en activeDuels`);
            console.error(`[CLIENT LISTO]: SalaId recibido: ${salaId}`);
            console.error(`[CLIENT LISTO]: Duelos activos: ${activeDuels.size}`);
            
            // Listar duelos activos para debug
            if (activeDuels.size > 0) {
                console.log('[CLIENT LISTO]: Duelos disponibles:');
                for (const [key] of activeDuels.entries()) {
                    console.log(`  - ${key}`);
                }
            }
            
            return socket.emit('duelo:errorDraft', { 
                mensaje: 'El duelo no está listo. Recargando...' 
            });
        }

        console.log(`[CLIENT LISTO]: ✅ Duelo encontrado`);
        console.log(`[CLIENT LISTO]: Estado: ${duelo.estado}`);
        console.log(`[CLIENT LISTO]: Jugadores en duelo: ${Object.keys(duelo.jugadores).length}`);

        // ✅ Si el jugador no existe en el duelo, cargarlo
        if (!duelo.jugadores[userId]) {
            console.log(`[CLIENT LISTO]: ⚠️ Jugador ${userId} no está en duelo, cargando...`);
            
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
                        escudoActivo: false,
                        gambitoActivado: false,
                        gambitoExitoso: false
                    };
                    
                    console.log(`[CLIENT LISTO]: ✅ Usuario ${userId} agregado al duelo`);
                } else {
                    throw new Error('Usuario no encontrado en BD');
                }
            } catch (error) {
                console.error(`[CLIENT LISTO ERROR]:`, error);
                return socket.emit('duelo:errorDraft', { 
                    mensaje: 'Error al cargar datos del jugador.' 
                });
            }
        }

        // ✅ Actualizar socket y marcar como listo
        duelo.jugadores[userId].socketId = socket.id;
        duelo.jugadores[userId].listo = true;
        
        const jugadoresIds = Object.keys(duelo.jugadores);
        const jugadoresListos = jugadoresIds.filter(id => duelo.jugadores[id].listo);
        
        console.log(`[CLIENT LISTO]: Jugadores listos: ${jugadoresListos.length}/${jugadoresIds.length}`);
        console.log(`[CLIENT LISTO]: IDs listos: ${jugadoresListos.join(', ')}`);
        
        // ✅ Emitir estado a toda la sala
        io.to(salaId).emit('duelo:estadoDraft', {
            jugadoresListos: jugadoresListos.length,
            totalJugadores: jugadoresIds.length
        });
        
        const todosListos = jugadoresIds.length === 2 && jugadoresListos.length === 2;

        // ✅ SI AMBOS ESTÁN LISTOS, INICIAR DRAFT
        if (todosListos) {
            console.log(`[CLIENT LISTO]: ✅✅✅ AMBOS JUGADORES LISTOS - INICIANDO DRAFT ✅✅✅`);
            
            // Enviar info del oponente a cada jugador
            jugadoresIds.forEach(playerId => {
                const oponenteId = jugadoresIds.find(id => id !== playerId);
                const oponenteData = duelo.jugadores[oponenteId];
                const playerSocket = duelo.jugadores[playerId].socketId;
                
                if (playerSocket && oponenteData) {
                    console.log(`[CLIENT LISTO]: 📤 Enviando info de oponente ${oponenteId} → jugador ${playerId}`);
                    
                    io.to(playerSocket).emit('duelo:oponenteInfo', {
                        oponenteId,
                        oponente: { 
                            username: oponenteData.username, 
                            foto_perfil: oponenteData.foto_perfil || '/uploads/default_avatar.png'
                        }
                    });
                }
            });

            // ✅ Esperar 1 segundo antes de cargar categorías
            await new Promise(resolve => setTimeout(resolve, 1000));

            const [jugadorA_id, jugadorB_id] = jugadoresIds;
            let categorias;

            try {
                // ✅ CARGAR CATEGORÍAS SEGÚN MODO
                if (duelo.modo === 'carrera') {
                    console.log(`[DRAFT]: 🎓 Modo CARRERA - Cargando temáticas comunes`);
                    
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
                    console.log(`[DRAFT]: 🌍 Modo GENERAL - Cargando materias generales`);
                    
                    [categorias] = await db.query(`
                        SELECT m.id_materia AS id, m.descripcion 
                        FROM materias m
                        WHERE (SELECT COUNT(*) FROM pregunta WHERE id_materia = m.id_materia AND id_carrera IS NULL) >= 5
                        ORDER BY RAND() LIMIT 3
                    `);
                }

                console.log(`[DRAFT]: ✅ ${categorias.length} categorías cargadas`);

                if (categorias.length < 1) {
                    console.error('[DRAFT]: ❌ No hay categorías disponibles');
                    io.to(salaId).emit('duelo:errorDraft', { 
                        mensaje: 'No hay categorías disponibles para este duelo.' 
                    });
                    activeDuels.delete(salaId);
                    return;
                }

                duelo.categoriasDraft = categorias;
                duelo.estado = 'draft_iniciado';
                
                // ✅ ENVIAR DRAFT A AMBOS JUGADORES
                console.log(`[DRAFT]: 📤📤 Enviando categorías a ambos jugadores...`);
                
                const dataDraft = { 
                    categorias: categorias.map(c => ({ 
                        id: c.id, 
                        descripcion: c.descripcion 
                    })),
                    permitirGambito: true
                };
                
                console.log('[DRAFT]: Data a enviar:', JSON.stringify(dataDraft, null, 2));
                
                io.to(salaId).emit('duelo:iniciarMiniDraft', dataDraft);
                
                console.log(`[DRAFT]: ✅✅✅ DRAFT ENVIADO EXITOSAMENTE ✅✅✅`);
                console.log('═══════════════════════════════════════════════════════════');
                
            } catch (error) {
                console.error(`[DRAFT ERROR]:`, error);
                console.error('Stack:', error.stack);
                io.to(salaId).emit('duelo:errorDraft', { 
                    mensaje: 'Error preparando categorías: ' + error.message 
                });
                activeDuels.delete(salaId);
            }
        } else {
            console.log(`[CLIENT LISTO]: ⏳ Esperando más jugadores (${jugadoresListos.length}/2)`);
        }
        
        console.log('═══════════════════════════════════════════════════════════');
    });

    // ================================================================
    // ✅ SELECCIÓN DE CATEGORÍA CON GAMBITO
    // ================================================================
    
    socket.on('duelo:seleccionarCategoria', async ({ salaId, userId, idCategoria, gambitoActivado, quiereApostar }) => {
        const duelo = activeDuels.get(salaId);
        if (!duelo || duelo.selecciones[userId]) return;

        console.log(`[SELECCIÓN]: Usuario ${userId} seleccionó categoría ${idCategoria}`);
        console.log(`[SELECCIÓN]: Gambito: ${gambitoActivado ? 'SÍ' : 'NO'}`);
        console.log(`[SELECCIÓN]: Quiere Apostar: ${quiereApostar ? 'SÍ' : 'NO'}`);

        duelo.selecciones[userId] = idCategoria;
        duelo.gambitoSelecciones[userId] = gambitoActivado || false;
        
        // Guardar si el jugador quiere apostar
        if (!duelo.jugadoresQuierenApostar) {
            duelo.jugadoresQuierenApostar = {};
        }
        duelo.jugadoresQuierenApostar[userId] = quiereApostar || false;
        
        if (gambitoActivado) {
            duelo.jugadores[userId].gambitoActivado = true;
            duelo.jugadores[userId].gambitoExitoso = true;
        }
        
        const oponenteId = Object.keys(duelo.jugadores).find(id => id !== userId);
        if (oponenteId) {
            io.to(duelo.jugadores[oponenteId].socketId).emit('duelo:oponenteSelecciono', {
                gambitoActivado: gambitoActivado || false,
                quiereApostar: quiereApostar || false
            });
        }

        const seleccionesCount = Object.keys(duelo.selecciones).length;
        console.log(`[SELECCIÓN]: Selecciones: ${seleccionesCount}/2`);

        // SI AMBOS SELECCIONARON
        if (seleccionesCount === 2) {
            console.log(`[SELECCIÓN]: ✅ AMBOS SELECCIONARON`);
            
            const jugadoresIds = Object.keys(duelo.jugadores);
            const [jugadorA, jugadorB] = jugadoresIds;
            
            const jugadorAQuiereApostar = duelo.jugadoresQuierenApostar[jugadorA];
            const jugadorBQuiereApostar = duelo.jugadoresQuierenApostar[jugadorB];
            
            console.log(`[APUESTA]: Jugador A quiere apostar: ${jugadorAQuiereApostar}`);
            console.log(`[APUESTA]: Jugador B quiere apostar: ${jugadorBQuiereApostar}`);
            
            // SI AMBOS QUIEREN APOSTAR, INICIAR NEGOCIACIÓN
            if (jugadorAQuiereApostar && jugadorBQuiereApostar) {
                console.log(`[APUESTA]: 🎰 Iniciando negociación de apuesta`);
                
                // Verificar puntos de ambos
                const [puntosA] = await db.query(
                    'SELECT puntos FROM usuario WHERE id_usuario = ?',
                    [jugadorA]
                );
                const [puntosB] = await db.query(
                    'SELECT puntos FROM usuario WHERE id_usuario = ?',
                    [jugadorB]
                );
                
                const puntosJugadorA = puntosA[0]?.puntos || 0;
                const puntosJugadorB = puntosB[0]?.puntos || 0;
                const puntosMaximos = Math.min(puntosJugadorA, puntosJugadorB, 100);
                
                if (puntosMaximos < 10) {
                    console.log(`[APUESTA]: ❌ No hay suficientes puntos para apostar`);
                    
                    io.to(salaId).emit('duelo:apuestaRechazadaPorPuntos', {
                        mensaje: 'Alguno de los jugadores no tiene suficientes puntos (mínimo 10 pts)',
                        puntosActuales: Math.min(puntosJugadorA, puntosJugadorB),
                        puntosMinimos: 10
                    });
                    
                    // Continuar sin apuesta
                    duelo.apuesta = 0;
                    duelo.estado = 'en_juego';
                    
                    io.to(salaId).emit('duelo:miniDraftFinalizado', { 
                        selecciones: duelo.selecciones,
                        gambitos: duelo.gambitoSelecciones,
                        apuesta: 0,
                        mensaje: '🎮 Continuando sin apuesta'
                    });
                    
                    setTimeout(() => {
                        iniciarPartida(salaId, duelo);
                    }, 2000);
                    
                    return;
                }
                
                // Inicializar negociación
                duelo.negociacionApuesta = {
                    activa: true,
                    rondaActual: 1,
                    maxRondas: 3,
                    proponenteActual: jugadorA,
                    respondedor: jugadorB,
                    propuestaActual: null,
                    puntosMaximos: puntosMaximos,
                    timestamp: Date.now()
                };
                
                // Notificar a ambos jugadores
                io.to(duelo.jugadores[jugadorA].socketId).emit('duelo:iniciarNegociacionApuesta', {
                    esProponente: true,
                    oponente: {
                        username: duelo.jugadores[jugadorB].username,
                        foto_perfil: duelo.jugadores[jugadorB].foto_perfil
                    },
                    puntosMaximos
                });
                
                io.to(duelo.jugadores[jugadorB].socketId).emit('duelo:iniciarNegociacionApuesta', {
                    esProponente: false,
                    oponente: {
                        username: duelo.jugadores[jugadorA].username,
                        foto_perfil: duelo.jugadores[jugadorA].foto_perfil
                    },
                    puntosMaximos
                });
                
                // Timeout de 60 segundos
                setTimeout(() => {
                    if (duelo.negociacionApuesta && duelo.negociacionApuesta.activa) {
                        console.log(`[APUESTA]: ⏰ Timeout - Apuesta por defecto`);
                        
                        duelo.negociacionApuesta.activa = false;
                        duelo.apuesta = 20;
                        duelo.estado = 'en_juego';
                        
                        io.to(salaId).emit('duelo:negociacionFinalizada', {
                            apuestaFinal: 20,
                            motivo: 'timeout'
                        });
                        
                        io.to(salaId).emit('duelo:miniDraftFinalizado', { 
                            selecciones: duelo.selecciones,
                            gambitos: duelo.gambitoSelecciones,
                            apuesta: 20,
                            mensaje: '⏰ Apuesta por defecto: 20 pts'
                        });
                        
                        setTimeout(() => {
                            iniciarPartida(salaId, duelo);
                        }, 2000);
                    }
                }, 60000);
                
            } else {
                // AL MENOS UNO NO QUIERE APOSTAR - INICIAR SIN APUESTA
                console.log(`[APUESTA]: ℹ️ Se jugará sin apuesta`);
                
                duelo.apuesta = 0;
                duelo.estado = 'en_juego';
                
                io.to(salaId).emit('duelo:miniDraftFinalizado', { 
                    selecciones: duelo.selecciones,
                    gambitos: duelo.gambitoSelecciones,
                    apuesta: 0,
                    mensaje: '🎮 Duelo sin apuesta'
                });
                
                salasPendientes.delete(salaId);
                salasEspera.delete(salaId);
                
                setTimeout(() => {
                    iniciarPartida(salaId, duelo);
                }, 1000);
            }
        }
     });
     
    
    
    
    // ================================================================
        // HANDLERS DE APUESTAS - VERSIÓN CORREGIDA Y COMPLETA
        // ================================================================

        // 🔔 NUEVO: Handler para notificar que un jugador quiere apostar
        socket.on('duelo:notificarQuieroApostar', ({ salaId, userId, username, foto_perfil }) => {
            const duelo = activeDuels.get(salaId);
            if (!duelo) return;

            console.log(`[APUESTA NOTIF]: Usuario ${userId} (${username}) quiere apostar`);

            // Guardar la decisión
            if (!duelo.jugadoresQuierenApostar) {
                duelo.jugadoresQuierenApostar = {};
            }
            duelo.jugadoresQuierenApostar[userId] = true;

            // Notificar al oponente
            const jugadoresIds = Object.keys(duelo.jugadores);
            const oponenteId = jugadoresIds.find(id => id !== userId);

            if (oponenteId && duelo.jugadores[oponenteId]) {
                io.to(duelo.jugadores[oponenteId].socketId).emit('duelo:oponenteQuiereApostar', {
                    username,
                    foto_perfil: foto_perfil || '/uploads/default_avatar.png'
                });

                console.log(`[APUESTA NOTIF]: ✅ Notificación enviada al oponente ${oponenteId}`);
            }
        });

        // 🔔 NUEVO: Handler cuando un jugador cancela querer apostar
        socket.on('duelo:cancelarQuieroApostar', ({ salaId, userId }) => {
            const duelo = activeDuels.get(salaId);
            if (!duelo) return;

            console.log(`[APUESTA NOTIF]: Usuario ${userId} canceló querer apostar`);

            if (duelo.jugadoresQuierenApostar) {
                duelo.jugadoresQuierenApostar[userId] = false;
            }

            // Notificar al oponente
            const jugadoresIds = Object.keys(duelo.jugadores);
            const oponenteId = jugadoresIds.find(id => id !== userId);

            if (oponenteId && duelo.jugadores[oponenteId]) {
                io.to(duelo.jugadores[oponenteId].socketId).emit('duelo:oponenteCanceloApuesta');
            }
        });

        // 🔔 NUEVO: Handler cuando el oponente acepta la apuesta inicial
        socket.on('duelo:aceptarApuestaInicial', ({ salaId, userId }) => {
            const duelo = activeDuels.get(salaId);
            if (!duelo) return;

            console.log(`[APUESTA NOTIF]: Usuario ${userId} aceptó apostar`);

            if (!duelo.jugadoresQuierenApostar) {
                duelo.jugadoresQuierenApostar = {};
            }
            duelo.jugadoresQuierenApostar[userId] = true;
        });

        // 🔔 NUEVO: Handler cuando el oponente rechaza la apuesta inicial
        socket.on('duelo:rechazarApuestaInicial', ({ salaId, userId }) => {
            const duelo = activeDuels.get(salaId);
            if (!duelo) return;

            console.log(`[APUESTA NOTIF]: Usuario ${userId} rechazó apostar`);

            if (!duelo.jugadoresQuierenApostar) {
                duelo.jugadoresQuierenApostar = {};
            }
            duelo.jugadoresQuierenApostar[userId] = false;

            // Si alguien rechaza, notificar al otro
            const jugadoresIds = Object.keys(duelo.jugadores);
            const oponenteId = jugadoresIds.find(id => id !== userId);

            if (oponenteId && duelo.jugadores[oponenteId]) {
                io.to(duelo.jugadores[oponenteId].socketId).emit('duelo:oponenteCanceloApuesta');
            }
        });

        // ================================================================
        // ✅ CORREGIDO: Enviar propuesta con validación de puntos
        // ================================================================

        socket.on('duelo:propuestaApuesta', async ({ salaId, userId, cantidad, ronda }) => {
        const duelo = activeDuels.get(salaId);
        if (!duelo || !duelo.negociacionApuesta || !duelo.negociacionApuesta.activa) {
            return;
        }

        const jugadoresIds = Object.keys(duelo.jugadores);
        
        // ✅ USAR GestorPuntuacion.validarApuesta()
        const validacion = await GestorPuntuacion.validarApuesta(
            jugadoresIds[0],
            jugadoresIds[1],
            cantidad
        );
        
        if (!validacion.valido) {
            return socket.emit('duelo:errorApuesta', {
                mensaje: validacion.mensaje
            });
        }
        
    // Continuar con lógica normal...
    const negociacion = duelo.negociacionApuesta;
    negociacion.propuestaActual = cantidad;
    
            
            // ✅ VALIDACIÓN DE PUNTOS EN TIEMPO REAL
            try {
                const jugadoresIds = Object.keys(duelo.jugadores);
                
                // Consultar puntos actuales de ambos jugadores
                const [puntosA] = await db.query(
                    'SELECT puntos FROM usuario WHERE id_usuario = ?',
                    [jugadoresIds[0]]
                );
                const [puntosB] = await db.query(
                    'SELECT puntos FROM usuario WHERE id_usuario = ?',
                    [jugadoresIds[1]]
                );
                
                const puntosJugadorA = puntosA[0]?.puntos || 0;
                const puntosJugadorB = puntosB[0]?.puntos || 0;
                
                console.log(`[PROPUESTA VALIDACIÓN]: Jugador A tiene ${puntosJugadorA} pts`);
                console.log(`[PROPUESTA VALIDACIÓN]: Jugador B tiene ${puntosJugadorB} pts`);
                
                // Validar que ambos tengan suficientes puntos
                if (puntosJugadorA < cantidad || puntosJugadorB < cantidad) {
                    const jugadorSinPuntos = puntosJugadorA < cantidad ? jugadorA_id : jugadorB_id;
                    const puntosDisponibles = Math.min(puntosJugadorA, puntosJugadorB);
                    
                    console.log(`[PROPUESTA]: ❌ Puntos insuficientes - Máximo: ${puntosDisponibles}`);
                    
                    socket.emit('duelo:errorApuesta', {
                        mensaje: `La apuesta debe ser máximo ${puntosDisponibles} puntos (algún jugador no tiene suficientes)`
                    });
                    return;
                }
                
                // ✅ Validar rango permitido
                const maxApuesta = Math.min(puntosJugadorA, puntosJugadorB, 100);
                
                if (cantidad < 10 || cantidad > maxApuesta) {
                    console.log(`[PROPUESTA]: ❌ Cantidad fuera de rango: ${cantidad}`);
                    socket.emit('duelo:errorApuesta', {
                        mensaje: `La apuesta debe estar entre 10 y ${maxApuesta} puntos`
                    });
                    return;
                }
                
                // ✅ Actualizar propuesta
                negociacion.propuestaActual = cantidad;
                
                const oponenteId = jugadoresIds.find(id => id != userId);
                const oponenteSocket = duelo.jugadores[oponenteId].socketId;
                
                console.log(`[PROPUESTA]: ✅ Enviando propuesta de ${cantidad} pts al oponente ${oponenteId}`);
                console.log(`[PROPUESTA]: Socket del oponente: ${oponenteSocket}`);
                
                // ✅ Enviar propuesta al oponente
                io.to(oponenteSocket).emit('duelo:recibirPropuestaApuesta', {
                    cantidad,
                    proponente: {
                        username: duelo.jugadores[userId].username,
                        foto_perfil: duelo.jugadores[userId].foto_perfil || '/uploads/default_avatar.png'
                    },
                    ronda: negociacion.rondaActual
                });
                
                console.log(`[PROPUESTA]: ✅ Propuesta enviada exitosamente`);
                
            } catch (error) {
                console.error('[PROPUESTA ERROR]:', error);
                socket.emit('duelo:errorApuesta', {
                    mensaje: 'Error al validar puntos. Intenta de nuevo.'
                });
            }
        });

        // ================================================================
        // ✅ CORREGIDO: Responder a propuesta con validación completa
        // ================================================================

        socket.on('duelo:respuestaApuesta', async ({ salaId, userId, acepta }) => {
            const duelo = activeDuels.get(salaId);
            if (!duelo || !duelo.negociacionApuesta || !duelo.negociacionApuesta.activa) {
                console.error('[RESPUESTA]: Negociación no activa');
                return;
            }

            const negociacion = duelo.negociacionApuesta;
            const cantidadPropuesta = negociacion.propuestaActual;
            
            console.log(`[RESPUESTA]: Usuario ${userId} ${acepta ? 'ACEPTA' : 'RECHAZA'} ${cantidadPropuesta} pts`);

            if (acepta) {
                // ✅ VALIDACIÓN FINAL DE PUNTOS ANTES DE ACEPTAR
                try {
                    const jugadoresIds = Object.keys(duelo.jugadores);
                    
                    // Consultar puntos actuales
                    const [puntosA] = await db.query(
                        'SELECT puntos FROM usuario WHERE id_usuario = ?',
                        [jugadoresIds[0]]
                    );
                    const [puntosB] = await db.query(
                        'SELECT puntos FROM usuario WHERE id_usuario = ?',
                        [jugadoresIds[1]]
                    );
                    
                    const puntosJugadorA = puntosA[0]?.puntos || 0;
                    const puntosJugadorB = puntosB[0]?.puntos || 0;
                    
                    console.log(`[RESPUESTA VALIDACIÓN]: A=${puntosJugadorA}, B=${puntosJugadorB}, Apuesta=${cantidadPropuesta}`);
                    
                    // ✅ Verificar que ambos tengan puntos suficientes
                    if (puntosJugadorA < cantidadPropuesta || puntosJugadorB < cantidadPropuesta) {
                        console.log(`[RESPUESTA]: ❌ PUNTOS INSUFICIENTES para apuesta de ${cantidadPropuesta}`);
                        
                        // Notificar a ambos jugadores
                        io.to(salaId).emit('duelo:apuestaRechazadaPorPuntos', {
                            mensaje: 'Uno de los jugadores ya no tiene suficientes puntos para esta apuesta',
                            puntosActuales: Math.min(puntosJugadorA, puntosJugadorB),
                            puntosMinimos: cantidadPropuesta
                        });
                        
                        // Cerrar negociación y continuar sin apuesta
                        negociacion.activa = false;
                        duelo.apuesta = 0;
                        duelo.bote = 0;
                        duelo.estado = 'en_juego';
                        
                        io.to(salaId).emit('duelo:negociacionFinalizada', {
                            apuestaFinal: 0,
                            motivo: 'puntos_insuficientes'
                        });
                        
                        io.to(salaId).emit('duelo:miniDraftFinalizado', { 
                            selecciones: duelo.selecciones,
                            gambitos: duelo.gambitoSelecciones,
                            apuesta: 0,
                            mensaje: '⚠️ No hay suficientes puntos - Duelo sin apuesta'
                        });
                        
                        setTimeout(() => {
                            iniciarPartida(salaId, duelo);
                        }, 2000);
                        
                        return;
                    }
                    
                    // ✅ APUESTA ACEPTADA Y VALIDADA
                    console.log(`[RESPUESTA]: ✅ APUESTA ACEPTADA - ${cantidadPropuesta} pts`);
                    
                    negociacion.activa = false;
                    duelo.apuesta = cantidadPropuesta;
                    duelo.bote = cantidadPropuesta * 2;
                    duelo.estado = 'en_juego';
                    
                    io.to(salaId).emit('duelo:negociacionFinalizada', {
                        apuestaFinal: cantidadPropuesta,
                        motivo: 'aceptada'
                    });
                    
                    io.to(salaId).emit('duelo:miniDraftFinalizado', { 
                        selecciones: duelo.selecciones,
                        gambitos: duelo.gambitoSelecciones,
                        apuesta: cantidadPropuesta,
                        mensaje: `💰 Apuesta acordada: ${cantidadPropuesta} pts (Bote: ${cantidadPropuesta * 2})`
                    });
                    
                    salasPendientes.delete(salaId);
                    salasEspera.delete(salaId);
                    
                    setTimeout(() => {
                        iniciarPartida(salaId, duelo);
                    }, 2000);
                    
                } catch (error) {
                    console.error('[RESPUESTA ERROR]:', error);
                    socket.emit('duelo:errorApuesta', {
                        mensaje: 'Error al validar puntos. Intenta de nuevo.'
                    });
                }
                
            } else {
                // ❌ RECHAZADA - Contraoferta
                negociacion.rondaActual++;
                
                console.log(`[RESPUESTA]: ❌ Rechazada - Nueva ronda: ${negociacion.rondaActual}`);
                
                if (negociacion.rondaActual > negociacion.maxRondas) {
                    // Máximo de rondas alcanzado
                    console.log(`[RESPUESTA]: ⚠️ Máximo de rondas - Duelo sin apuesta`);
                    
                    negociacion.activa = false;
                    duelo.apuesta = 0;
                    duelo.bote = 0;
                    duelo.estado = 'en_juego';
                    
                    io.to(salaId).emit('duelo:negociacionFinalizada', {
                        apuestaFinal: 0,
                        motivo: 'max_rondas'
                    });
                    
                    io.to(salaId).emit('duelo:miniDraftFinalizado', { 
                        selecciones: duelo.selecciones,
                        gambitos: duelo.gambitoSelecciones,
                        apuesta: 0,
                        mensaje: '🤝 No hubo acuerdo - Duelo sin apuesta'
                    });
                    
                    setTimeout(() => {
                        iniciarPartida(salaId, duelo);
                    }, 2000);
                    
                    return;
                }
                
                // ✅ Cambiar turno
                const jugadoresIds = Object.keys(duelo.jugadores);
                const proponenteAnterior = negociacion.proponenteActual;
                const nuevoProponente = jugadoresIds.find(id => id != proponenteAnterior);
                
                negociacion.proponenteActual = nuevoProponente;
                negociacion.respondedor = proponenteAnterior;
                
                console.log(`[RESPUESTA]: ♻️ Turno cambiado: ${proponenteAnterior} → ${nuevoProponente}`);
                
                // Notificar al que rechazó que el otro está preparando contraoferta
                io.to(duelo.jugadores[proponenteAnterior].socketId).emit('duelo:respuestaPropuestaApuesta', {
                    acepta: false,
                    siguienteRonda: negociacion.rondaActual
                });
                
                // Notificar al nuevo proponente que es su turno
                io.to(duelo.jugadores[nuevoProponente].socketId).emit('duelo:tuTurnoProponer', {
                    ronda: negociacion.rondaActual,
                    oponente: {
                        username: duelo.jugadores[proponenteAnterior].username,
                        foto_perfil: duelo.jugadores[proponenteAnterior].foto_perfil || '/uploads/default_avatar.png'
                    }
                });
                
                console.log(`[RESPUESTA]: ✅ Contraoferta iniciada (Ronda ${negociacion.rondaActual})`);
            }
        });

        // ================================================================
        // ✅ LOGS DE DEBUG MEJORADOS
        // ================================================================

        console.log('[APUESTAS]: ✅ Todos los handlers de apuestas registrados');
        console.log('[APUESTAS]: - duelo:notificarQuieroApostar');
        console.log('[APUESTAS]: - duelo:cancelarQuieroApostar');
        console.log('[APUESTAS]: - duelo:aceptarApuestaInicial');
        console.log('[APUESTAS]: - duelo:rechazarApuestaInicial');
        console.log('[APUESTAS]: - duelo:propuestaApuesta (con validación de puntos)');
        console.log('[APUESTAS]: - duelo:respuestaApuesta (con validación de puntos)');

// ================================================================
// FUNCIÓN AUXILIAR: Mostrar advertencia de puntos insuficientes
// ================================================================

    function mostrarNotificacionAdvertencia(titulo, mensaje, tipo) {
        return {
            titulo,
            mensaje,
            tipo,
            duracion: 5000
        };
    }
    // ================================================================
    // ✅ INICIAR PARTIDA CON LÓGICA DE PREGUNTAS CORREGIDA
    // ================================================================

    async function iniciarPartida(salaId, duelo) {
        console.log(`[PARTIDA ${salaId}]: 🎮 Iniciando partida...`);
        
        try {
            const [idJugadorA, idJugadorB] = Object.keys(duelo.jugadores);
            const idCategoriaA = duelo.selecciones[idJugadorA];
            const idCategoriaB = duelo.selecciones[idJugadorB];
            
            console.log(`[PARTIDA]: Jugador A (${idJugadorA}) eligió: ${idCategoriaA}`);
            console.log(`[PARTIDA]: Jugador B (${idJugadorB}) eligió: ${idCategoriaB}`);
            
            let queryField = duelo.modo === 'carrera' ? 'id_tematica' : 'id_materia';
            let preguntas = [];

            // ✅ CASO 1: MISMA CATEGORÍA (Duelo de Expertos)
            if (idCategoriaA === idCategoriaB) {
                console.log(`[PARTIDA]: 🎓 MISMA CATEGORÍA - Duelo de Expertos`);
                
                // Cargar 10 preguntas de la categoría seleccionada
                const [preguntasCategoria] = await db.query(
                    `SELECT p.id_pregunta, p.pregunta, p.retroalimentacion, p.puntos, p.puntos_carrera 
                    FROM pregunta p
                    WHERE p.${queryField} = ?
                    ORDER BY RAND() LIMIT 10`, 
                    [idCategoriaA]
                );
                
                if (preguntasCategoria.length < 10) {
                    console.warn(`[PARTIDA]: ⚠️ Solo ${preguntasCategoria.length} preguntas disponibles`);
                }
                
                // Multiplicar puntos x1.5 para duelo de expertos
                preguntas = preguntasCategoria.map(p => ({
                    ...p,
                    puntos: Math.floor(p.puntos * 1.5),
                    puntos_carrera: Math.floor(p.puntos_carrera * 1.5),
                    tipo: 'experto',
                    categoria: idCategoriaA
                }));
                
                io.to(salaId).emit('duelo:notificacionEspecial', {
                    titulo: '🎓 DUELO DE EXPERTOS',
                    mensaje: 'Ambos eligieron la misma categoría. ¡10 preguntas de expertos, puntos x1.5!'
                });
                
            } 
            // ✅ CASO 2: DIFERENTES CATEGORÍAS (Duelo Mixto) - CORREGIDO
            else {
                console.log(`[PARTIDA]: 🔀 CATEGORÍAS DIFERENTES - Duelo Mixto`);
                
                // ✅ 3 preguntas de categoría A (antes era 5)
                const [preguntasA] = await db.query(
                    `SELECT id_pregunta, pregunta, retroalimentacion, puntos, puntos_carrera 
                    FROM pregunta WHERE ${queryField} = ? ORDER BY RAND() LIMIT 3`, 
                    [idCategoriaA]
                );
                
                // ✅ 3 preguntas de categoría B (antes era 5)
                const [preguntasB] = await db.query(
                    `SELECT id_pregunta, pregunta, retroalimentacion, puntos, puntos_carrera 
                    FROM pregunta WHERE ${queryField} = ? ORDER BY RAND() LIMIT 3`, 
                    [idCategoriaB]
                );

                // ✅ 4 PREGUNTAS DE UNA TERCERA CATEGORÍA ALEATORIA
                console.log(`[PARTIDA]: Cargando 4 preguntas de categoría aleatoria...`);
                
                let preguntasAleatorias = [];
                
                if (duelo.modo === 'carrera') {
                    // Buscar otra temática de la misma carrera
                    const [otraTematica] = await db.query(`
                        SELECT DISTINCT t.id_tematica AS id
                        FROM tematica t
                        INNER JOIN pregunta p ON t.id_tematica = p.id_tematica
                        WHERE t.id_carrera IN (
                            SELECT id_carrera FROM usuario_carrera WHERE id_usuario = ?
                        )
                        AND t.id_tematica NOT IN (?, ?)
                        AND (SELECT COUNT(*) FROM pregunta WHERE id_tematica = t.id_tematica) >= 4
                        ORDER BY RAND() LIMIT 1
                    `, [idJugadorA, idCategoriaA, idCategoriaB]);
                    
                    if (otraTematica.length > 0) {
                        [preguntasAleatorias] = await db.query(`
                            SELECT id_pregunta, pregunta, retroalimentacion, puntos, puntos_carrera 
                            FROM pregunta 
                            WHERE id_tematica = ?
                            ORDER BY RAND() LIMIT 4
                        `, [otraTematica[0].id]);
                    }
                } else {
                    // Modo general: otra materia aleatoria
                    const [otraMateria] = await db.query(`
                        SELECT m.id_materia AS id
                        FROM materias m
                        WHERE m.id_materia NOT IN (?, ?)
                        AND (SELECT COUNT(*) FROM pregunta WHERE id_materia = m.id_materia AND id_carrera IS NULL) >= 4
                        ORDER BY RAND() LIMIT 1
                    `, [idCategoriaA, idCategoriaB]);
                    
                    if (otraMateria.length > 0) {
                        [preguntasAleatorias] = await db.query(`
                            SELECT id_pregunta, pregunta, retroalimentacion, puntos, puntos_carrera 
                            FROM pregunta 
                            WHERE id_materia = ? AND id_carrera IS NULL
                            ORDER BY RAND() LIMIT 4
                        `, [otraMateria[0].id]);
                    }
                }
                
                console.log(`[PARTIDA]: Preguntas A: ${preguntasA.length}`);
                console.log(`[PARTIDA]: Preguntas B: ${preguntasB.length}`);
                console.log(`[PARTIDA]: Preguntas aleatorias: ${preguntasAleatorias.length}`);

                // Combinar todas las preguntas (3+3+4 = 10 total)
                preguntas = [
                    ...preguntasA.map(p => ({ ...p, tipo: 'categoria_a', categoria: idCategoriaA })),
                    ...preguntasB.map(p => ({ ...p, tipo: 'categoria_b', categoria: idCategoriaB })),
                    ...preguntasAleatorias.map(p => ({ ...p, tipo: 'aleatoria', categoria: null }))
                ];
                
                io.to(salaId).emit('duelo:notificacionEspecial', {
                    titulo: '🔀 DUELO MIXTO',
                    mensaje: `3 preguntas de cada categoría + 4 preguntas sorpresa`
                });
            }

            console.log(`[PARTIDA]: Total de preguntas cargadas: ${preguntas.length}`);

            if (preguntas.length === 0) {
                console.error('[PARTIDA]: ❌ No hay preguntas disponibles');
                io.to(salaId).emit('duelo:error', { mensaje: 'No hay preguntas disponibles.' });
                activeDuels.delete(salaId);
                return;
            }

            // Mezclar preguntas aleatoriamente
            duelo.examen = preguntas.sort(() => Math.random() - 0.5);
            duelo.preguntaActual = 0;
            duelo.respuestas = {};
            duelo.tiemposRespuesta = {};

            console.log(`[PARTIDA]: ✅ Iniciando preguntas en 3 segundos...`);
            
            setTimeout(() => enviarSiguientePregunta(salaId, duelo), 3000);
            
        } catch (error) {
            console.error(`[PARTIDA ${salaId}] ERROR:`, error);
            io.to(salaId).emit('duelo:error', { mensaje: 'Error preparando preguntas.' });
        }
    }
    // ================================================================
    // ✅ ENVIAR SIGUIENTE PREGUNTA CON EVENTOS ESPECIALES
    // ================================================================

    async function enviarSiguientePregunta(salaId, duelo) {
        if (!duelo || !duelo.examen || duelo.preguntaActual >= duelo.examen.length) {
            finalizarDuelo(salaId, duelo);
            return;
        }

        const preguntaActual = duelo.examen[duelo.preguntaActual];
        const numeroPregunta = duelo.preguntaActual + 1;
        
        console.log(`[PREGUNTA ${numeroPregunta}/${duelo.examen.length}]: Enviando pregunta ${preguntaActual.id_pregunta}`);
        
        // ✅ ACTIVAR EVENTO ALEATORIO (30% probabilidad en preguntas 3-7)
        if (numeroPregunta >= 3 && numeroPregunta <= 7 && Math.random() < 0.3) {
            preguntaActual.evento = seleccionarEventoAleatorio();
            if (preguntaActual.evento) {
                console.log(`[PREGUNTA]: ⚡ Evento especial: ${preguntaActual.evento.nombre}`);
            }
        }
        
        try {
            const [respuestas] = await db.query(
                'SELECT id_respuesta, respuesta, correcta FROM respuesta WHERE id_pregunta = ? ORDER BY RAND()', 
                [preguntaActual.id_pregunta]
            );

            if (respuestas.length < 2) {
                console.error('[PREGUNTA]: ❌ Pregunta sin suficientes respuestas');
                duelo.preguntaActual++;
                setTimeout(() => enviarSiguientePregunta(salaId, duelo), 1000);
                return;
            }

            // Guardar respuesta correcta
            const respuestaCorrecta = respuestas.find(r => r.correcta === 1);
            duelo.respuestasCorrectas = duelo.respuestasCorrectas || {};
            duelo.respuestasCorrectas[preguntaActual.id_pregunta] = respuestaCorrecta?.id_respuesta;

            const jugadoresIds = Object.keys(duelo.jugadores);

            // Enviar pregunta a cada jugador
            jugadoresIds.forEach(jugadorId => {
                let opcionesParaJugador = [...respuestas];

                // ✅ Aplicar efecto 50/50 si está activo
                if (duelo.jugadores[jugadorId].efecto5050) {
                    const correcta = opcionesParaJugador.find(r => r.correcta === 1);
                    const incorrectas = opcionesParaJugador.filter(r => r.correcta !== 1);
                    
                    const incorrectaRandom = incorrectas[Math.floor(Math.random() * incorrectas.length)];
                    opcionesParaJugador = [correcta, incorrectaRandom].sort(() => Math.random() - 0.5);
                    
                    duelo.jugadores[jugadorId].efecto5050 = false;
                    console.log(`[PREGUNTA]: 🎯 50/50 aplicado a jugador ${jugadorId}`);
                }

                // Calcular duración
                let duracionBase = 15; // 15 segundos base
                
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
            
            const duracionMaxima = preguntaActual.evento?.duracion || 15;
            duelo.tiempoInicioPregunta = Date.now();
            
            duelo.timer = setTimeout(() => {
                console.log(`[PREGUNTA]: ⏰ Timeout - pasando a siguiente pregunta`);
                
                // Penalizar a quienes no respondieron
                Object.keys(duelo.jugadores).forEach(jugadorId => {
                    if (!duelo.respuestas[preguntaActual.id_pregunta]?.[jugadorId]) {
                        duelo.puntuaciones[jugadorId] = Math.max(0, duelo.puntuaciones[jugadorId] - 10);
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
            console.error(`[PREGUNTA ERROR]:`, error);
            io.to(salaId).emit('duelo:error', { mensaje: 'Error cargando pregunta.' });
        }
    }

    // ================================================================
    // ✅ PROCESAR RESPUESTA
    // ================================================================
    socket.on('duelo:responder', async ({ salaId, userId, idPregunta, idRespuesta, tiempoRespuesta }) => {
        const duelo = activeDuels.get(salaId);
        if (!duelo || duelo.estado !== 'en_juego') return;

        const preguntaActual = duelo.examen[duelo.preguntaActual];
        if (preguntaActual.id_pregunta !== idPregunta || (duelo.respuestas[idPregunta]?.[userId])) return;

        if (!tiempoRespuesta) {
            tiempoRespuesta = (Date.now() - duelo.tiempoInicioPregunta) / 1000;
        }

        console.log(`[RESPUESTA]: Usuario ${userId} respondió en ${tiempoRespuesta.toFixed(2)}s`);

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
                duelo.jugadores[userId].racha++;
                
                // ✅ USAR GestorPuntuacion
                const resultadoPregunta = GestorPuntuacion.calcularPuntosPregunta({
                    esCorrecta: true,
                    tiempoRespuesta: tiempoRespuesta,
                    racha: duelo.jugadores[userId].racha,
                    eventoEspecial: preguntaActual.evento?.id || null
                }, {
                    puntos: puntosBase,
                    puntos_carrera: preguntaActual.puntos_carrera || 0
                });
                
                puntosGanados = resultadoPregunta.puntosTotales;
                
                // Guardar desglose para resultado final
                if (!duelo.desglosePuntos) duelo.desglosePuntos = {};
                if (!duelo.desglosePuntos[userId]) duelo.desglosePuntos[userId] = [];
                duelo.desglosePuntos[userId].push({
                    pregunta: preguntaActual.id_pregunta,
                    desglose: resultadoPregunta.desglose
                });
                
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
                duelo.jugadores[userId].racha = 0;
                duelo.jugadores[userId].gambitoExitoso = false;
                
                // ✅ USAR GestorPuntuacion para penalizaciones
                const resultadoPregunta = GestorPuntuacion.calcularPuntosPregunta({
                    esCorrecta: false,
                    tiempoRespuesta: tiempoRespuesta,
                    racha: 0,
                    eventoEspecial: preguntaActual.evento?.id || null
                }, {
                    puntos: puntosBase,
                    puntos_carrera: 0
                });
                
                puntosGanados = resultadoPregunta.puntosTotales;
                
                // Guardar desglose
                if (!duelo.desglosePuntos) duelo.desglosePuntos = {};
                if (!duelo.desglosePuntos[userId]) duelo.desglosePuntos[userId] = [];
                duelo.desglosePuntos[userId].push({
                    pregunta: preguntaActual.id_pregunta,
                    desglose: resultadoPregunta.desglose
                });
                
                // Penalizar gambito fallido
                if (duelo.jugadores[userId].gambitoActivado) {
                    const penalizacion = Math.floor(puntosBase * SISTEMA_PUNTOS.GAMBITO.PENALIZACION_FALLA);
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

                console.log(`[RESPUESTA]: Ambos jugadores respondieron - siguiente pregunta`);

                // Verificar gambito
                const [j1Id, j2Id] = Object.keys(duelo.jugadores);
                
                for (const jId of [j1Id, j2Id]) {
                    if (duelo.jugadores[jId].gambitoActivado) {
                        const respJ = duelo.respuestas[idPregunta][jId];
                        const tiempoJ = duelo.tiemposRespuesta[idPregunta][jId];
                        const otroId = jId === j1Id ? j2Id : j1Id;
                        const tiempoOtro = duelo.tiemposRespuesta[idPregunta][otroId];
                        
                        if (respJ.esCorrecta && tiempoJ < tiempoOtro) {
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

                // Actualizar estado
                const jugadoresIds = Object.keys(duelo.jugadores);
                io.to(salaId).emit('duelo:actualizarEstado', {
                    puntuaciones: duelo.puntuaciones,
                    rachas: {
                        [jugadoresIds[0]]: duelo.jugadores[jugadoresIds[0]].racha,
                        [jugadoresIds[1]]: duelo.jugadores[jugadoresIds[1]].racha
                    },
                    powerUps: {
                        [jugadoresIds[0]]: duelo.jugadores[jugadoresIds[0]].powerUp?.id || null,
                        [jugadoresIds[1]]: duelo.jugadores[jugadoresIds[1]].powerUp?.id || null
                    }
                });

                duelo.preguntaActual++;
                setTimeout(() => enviarSiguientePregunta(salaId, duelo), 3000);
            }
        } catch (error) {
            console.error(`[RESPUESTA ERROR]:`, error);
            socket.emit('duelo:error', { mensaje: 'Error procesando respuesta.' });
        }
    });

    // ================================================================
    // ✅ ACTIVAR POWER-UP
    // ================================================================
    
    socket.on('duelo:activarPowerUp', ({ salaId, userId, idPowerUp }) => {
        const duelo = activeDuels.get(salaId);
        if (!duelo || !duelo.jugadores[userId].powerUp) return;

        const powerUp = duelo.jugadores[userId].powerUp;
        
        if (powerUp.id !== idPowerUp) return;

        const oponenteId = Object.keys(duelo.jugadores).find(id => id !== userId);
        
        console.log(`[POWER-UP]: Usuario ${userId} activa ${powerUp.nombre}`);

        // Verificar escudo del oponente
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
    // ✅ FINALIZAR DUELO CON SISTEMA COMPLETO
    // ================================================================

    async function finalizarDuelo(salaId, duelo) {
        console.log(`[FINALIZAR ${salaId}]: 🏁 Delegando a GestorPuntuacion...`);
        
        try {
            const resultado = await GestorPuntuacion.finalizarDuelo(salaId, duelo);
            
            // Emitir resultado a clientes
            io.to(salaId).emit('duelo:finalizado', resultado);
            
            console.log(`[FINALIZAR]: ✅ Resultado emitido`);
            
            // Limpiar duelo después de 30s
            setTimeout(() => {
                activeDuels.delete(salaId);
                console.log(`[FINALIZAR]: Duelo ${salaId} eliminado de memoria`);
            }, 30000);
            
        } catch (error) {
            console.error(`[FINALIZAR ERROR]:`, error);
            
            if (error.message.includes('ERROR_APUESTA_INVALIDA')) {
                io.to(salaId).emit('duelo:apuestaRechazadaPorPuntos', {
                    mensaje: 'Algún jugador ya no tiene puntos suficientes',
                    detalles: error.message
                });
            } else {
                io.to(salaId).emit('duelo:error', { 
                    mensaje: 'Error procesando resultado del duelo' 
                });
            }
        }
    }
    // ================================================================
    // DESAFÍOS BD - ACEPTAR
    // ================================================================
    
    socket.on('duelo:aceptarDesafioBD', async ({ salaId, idRetado }) => {
        console.log('═══════════════════════════════════════════════════════════');
        console.log('[ACEPTAR BD]: 🚀 EVENTO RECIBIDO');
        console.log(`[ACEPTAR BD]: SalaId: ${salaId}`);
        console.log(`[ACEPTAR BD]: ID Retado: ${idRetado}`);
        console.log('═══════════════════════════════════════════════════════════');
        
        if (!salaId || !idRetado) {
            console.error('[ACEPTAR BD]: ❌ Parámetros faltantes');
            return socket.emit('duelo:error', { mensaje: 'Error: Datos incompletos' });
        }

        try {
            let sala = salasPendientes.get(salaId) || salasEspera.get(salaId);
            
            // Búsqueda case-insensitive
            if (!sala) {
                for (const [key, value] of [...salasPendientes.entries(), ...salasEspera.entries()]) {
                    if (key.toLowerCase() === salaId.toLowerCase()) {
                        sala = value;
                        salaId = key;
                        break;
                    }
                }
            }
            
            if (!sala) {
                console.error('[ACEPTAR BD]: ❌ Sala no encontrada');
                return socket.emit('sala:error', {
                    mensaje: 'La sala de duelo no está disponible o expiró.'
                });
            }

            console.log(`[ACEPTAR BD]: ✅ Sala encontrada - Estado: ${sala.estado}`);

            const estadosValidos = ['pendiente', 'esperando_aceptacion', 'aceptada'];
            if (!estadosValidos.includes(sala.estado)) {
                console.error(`[ACEPTAR BD]: ❌ Estado no válido: ${sala.estado}`);
                return socket.emit('duelo:error', {
                    mensaje: 'Este desafío ya fue procesado o expiró.'
                });
            }

            const retadorId = parseInt(sala.retador || sala.idRetador);
            const retadoId = parseInt(sala.retado || sala.idRetado);
            const idRetadoInt = parseInt(idRetado);
            
            if (idRetadoInt !== retadoId) {
                console.error('[ACEPTAR BD]: ❌ Usuario no autorizado');
                return socket.emit('duelo:error', { mensaje: 'No puedes aceptar este desafío.' });
            }

            console.log('[ACEPTAR BD]: ✅ Usuario autorizado');

            // Cargar datos del retador
            const [retadorData] = await db.query(
                'SELECT id_usuario, username, foto_perfil FROM usuario WHERE id_usuario = ?', 
                [retadorId]
            );
            
            if (retadorData.length === 0) {
                console.error('[ACEPTAR BD]: ❌ Retador no encontrado');
                return socket.emit('duelo:error', { mensaje: 'Error: Usuario retador no encontrado.' });
            }

            console.log(`[ACEPTAR BD]: ✅ Retador: ${retadorData[0].username}`);

            // Marcar sala como aceptada
            sala.estado = 'aceptada';
            sala.jugadoresAceptados = sala.jugadoresAceptados || new Set();
            sala.jugadoresAceptados.add(retadorId);
            sala.jugadoresAceptados.add(idRetadoInt);
            
            salasPendientes.set(salaId, sala);
            salasEspera.set(salaId, sala);

            console.log('[ACEPTAR BD]: ✅ Sala marcada como aceptada');

            // Notificar al retador
            const retadorSocketId = usuariosConectados.get(retadorId);
            if (retadorSocketId) {
                io.to(retadorSocketId).emit('duelo:desafioAceptado', {
                    mensaje: `Tu desafío fue aceptado`,
                    salaId: salaId
                });
                
                io.to(retadorSocketId).emit('duelo:redirigirASala', { 
                    salaId,
                    mensaje: '¡Desafío aceptado! Redirigiendo...'
                });
                
                console.log('[ACEPTAR BD]: ✅ Retador notificado');
            }

            // Confirmar al retado
            socket.emit('duelo:redirigirASala', { 
                salaId,
                mensaje: 'Desafío aceptado. Conectando...'
            });

            console.log('[ACEPTAR BD]: ✅ Retado confirmado');
            console.log('═══════════════════════════════════════════════════════════');

        } catch (error) {
            console.error('═══════════════════════════════════════════════════════════');
            console.error('[ACEPTAR BD]: ❌ ERROR');
            console.error(error);
            console.error('═══════════════════════════════════════════════════════════');
            
            socket.emit('duelo:error', { mensaje: 'Error al procesar aceptación: ' + error.message });
        }
    });

    // ================================================================
    // INVITACIONES DE LOBBY
    // ================================================================
    
    socket.on('duelo:invitarLobby', async ({ idOponente, usernameOponente }) => {
        const idRetador = socket.userId;
        
        if (!idRetador || idRetador === parseInt(idOponente)) {
            return socket.emit('duelo:invitacionLobbyError', { 
                mensaje: 'No puedes desafiarte a ti mismo.' 
            });
        }

        try {
            const [retadorData] = await db.query('SELECT username, foto_perfil FROM usuario WHERE id_usuario = ?', [idRetador]);
            if (retadorData.length === 0) {
                return socket.emit('duelo:invitacionLobbyError', { mensaje: 'Error: Usuario no encontrado.' });
            }

            const usernameRetador = retadorData[0].username;
            const fotoRetador = retadorData[0].foto_perfil || '/uploads/default_avatar.png';
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

            console.log(`[LOBBY]: Invitación enviada - Sala ${salaId}`);

            io.to(oponenteSocketId).emit('duelo:recibirInvitacionLobby', {
                mensaje: `${usernameRetador} te desafía a un duelo!`,
                id_retador: idRetador,
                username_retador: usernameRetador,
                foto_retador: fotoRetador,
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

        console.log(`[LOBBY]: Invitación aceptada - Sala ${salaId}`);

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

    // ================================================================
    // MATCHMAKING
    // ================================================================
    
   const buscarPareja = (pool, modo, dificultad = null, apuesta = APUESTAS.DEFAULT) => {
        if (pool.length < 2) return;
        
        const jugadorA = pool.shift();
        const jugadorB = pool.shift();
        
        console.log(`[MATCHMAKING]: 🎯 Pareja encontrada`);
        console.log(`[MATCHMAKING]:   - Jugador A: ${jugadorA.userId} (apuesta: ${jugadorA.apuesta || apuesta})`);
        console.log(`[MATCHMAKING]:   - Jugador B: ${jugadorB.userId} (apuesta: ${jugadorB.apuesta || apuesta})`);
        
        // ✅ Usar la apuesta del parámetro o la mínima de ambos jugadores
        const apuestaFinal = Math.min(
            jugadorA.apuesta || APUESTAS.DEFAULT,
            jugadorB.apuesta || APUESTAS.DEFAULT,
            apuesta
        );
        
        console.log(`[MATCHMAKING]:   - Apuesta final: ${apuestaFinal}`);
        
        crearSalaMatchmaking(jugadorA, jugadorB, modo, dificultad, apuestaFinal, io);
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

            // ✅ USAR LA CONSTANTE IMPORTADA CORRECTAMENTE
            const apuestaValidada = Math.min(
                Math.max(apuesta || APUESTAS.DEFAULT, APUESTAS.MIN), 
                APUESTAS.MAX
            );

            console.log(`[MATCHMAKING CARRERA]: Usuario ${user.id_usuario} busca con apuesta ${apuestaValidada}`);

            let pool;
            if (dificultad === 'facil') pool = poolCarreraFacil;
            else if (dificultad === 'normal') pool = poolCarreraNormal;
            else pool = poolCarreraDificil;

            if (!pool.some(p => p.userId === user.id_usuario)) {
                console.log(`[MATCHMAKING CARRERA]: Usuario ${user.id_usuario} agregado al pool (${dificultad})`);
                
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
            console.error("[MATCHMAKING CARRERA ERROR]:", error);
            socket.emit('duelo:error', { mensaje: 'Error al buscar pareja' });
        }
    });

    socket.on('duelo_com:buscar:general', ({ user, apuesta }) => {
        try {
            // ✅ USAR LA CONSTANTE IMPORTADA CORRECTAMENTE
            const apuestaValidada = Math.min(
                Math.max(apuesta || APUESTAS.DEFAULT, APUESTAS.MIN), 
                APUESTAS.MAX
            );
            
            console.log(`[MATCHMAKING GENERAL]: Usuario ${user.id_usuario} busca con apuesta ${apuestaValidada}`);
            
            if (!poolGeneral.some(p => p.userId === user.id_usuario)) {
                console.log(`[MATCHMAKING GENERAL]: Usuario ${user.id_usuario} agregado al pool`);
                
                poolGeneral.push({ 
                    userId: user.id_usuario, 
                    user, 
                    socketId: socket.id,
                    apuesta: apuestaValidada
                });
                
                buscarPareja(poolGeneral, 'general', null, apuestaValidada);
            }
        } catch (error) {
            console.error("[MATCHMAKING GENERAL ERROR]:", error);
            socket.emit('duelo:error', { mensaje: 'Error al buscar pareja' });
        }
    });
    socket.on('duelo:cancelarBusqueda', (userId) => {
            poolCarreraFacil = poolCarreraFacil.filter(p => p.userId !== userId);
            poolCarreraNormal = poolCarreraNormal.filter(p => p.userId !== userId);
            poolCarreraDificil = poolCarreraDificil.filter(p => p.userId !== userId);
            poolGeneral = poolGeneral.filter(p => p.userId !== userId);
            
            console.log(`[MATCHMAKING]: Usuario ${userId} canceló búsqueda`);
    });

    // ================================================================
    // ABANDONO Y DISCONNECT
    // ================================================================
    
    socket.on('duelo:abandonar', async ({ salaId, userId }) => {
        const duelo = activeDuels.get(salaId);
        if (!duelo) return;

        console.log(`[ABANDONO]: Usuario ${userId} abandonó sala ${salaId}`);

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

    socket.on('disconnect', async () => {
    const userId = socket.userId;
    
    if (!userId) {
        console.log('[DISCONNECT]: Socket sin userId');
        return;
    }
    
    // ✅ BUSCAR SI ESTÁ EN ALGÚN DUELO ACTIVO
    let salaActiva = null;
    let dueloActivo = null;
    
    console.log('[DISCONNECT]: 🔍 Buscando duelos activos...');
    console.log(`[DISCONNECT]: Total de duelos activos: ${activeDuels.size}`);
    
    for (const [salaId, duelo] of activeDuels.entries()) {
        if (duelo.jugadores[userId]) {
            salaActiva = salaId;
            dueloActivo = duelo;
            break;
        }
    }
    
    if (salaActiva && dueloActivo) {
        
        const oponenteId = Object.keys(dueloActivo.jugadores).find(id => id !== userId.toString());
        const oponente = dueloActivo.jugadores[oponenteId];
        
        if (oponenteId && oponente) {
            console.log(`[DISCONNECT]: Oponente: ${oponente.username} (${oponenteId})`);
            
            // ✅ NOTIFICAR AL OPONENTE QUE SE DESCONECTÓ
            if (oponente.socketId) {
                io.to(oponente.socketId).emit('duelo:oponenteDesconectado', {
                    mensaje: `${dueloActivo.jugadores[userId].username} se desconectó`,
                    tiempoEspera: 60
                });
                
                console.log('[DISCONNECT]: ✅ Oponente notificado de desconexión');
            }
            
            // ✅ REGISTRAR PARA POSIBLE RECONEXIÓN (60 segundos)
            registrarDesconexion(userId, salaActiva, dueloActivo);
            console.log('[DISCONNECT]: ⏰ Timer de reconexión iniciado (60s)');
            
            // ✅ TIMER: Si no se reconecta en 60s, PROCESAR ABANDONO
            dueloActivo.timeoutReconexion = setTimeout(async () => {
                const infoDesconexion = usuariosDesconectados.get(parseInt(userId));
                
                if (infoDesconexion) {
                    
                    try {
                        await procesarAbandono(
                            salaActiva, 
                            userId, 
                            MOTIVOS_ABANDONO.DESCONEXION, // 25% penalización
                            io
                        );
                        
                        console.log('[TIMEOUT RECONEXIÓN]: ✅ Abandono procesado exitosamente');
                        
                    } catch (error) {
                        console.error('[TIMEOUT RECONEXIÓN]: ❌ Error procesando abandono:', error);
                    }
                }
            }, 60000); // 60 segundos
            
        } else {
            console.warn('[DISCONNECT]: ⚠️ No se encontró oponente válido');
        }
        
    } else {
        console.log('[DISCONNECT]: ℹ️ Usuario no estaba en duelo activo');
        
        // Limpiar normalmente
        usuariosConectados.delete(parseInt(userId));
        usuariosEnPortalCompetitivo.delete(parseInt(userId));
        
        // Remover de pools de matchmaking
        poolCarreraFacil = poolCarreraFacil.filter(p => p.userId !== userId);
        poolCarreraNormal = poolCarreraNormal.filter(p => p.userId !== userId);
        poolCarreraDificil = poolCarreraDificil.filter(p => p.userId !== userId);
        poolGeneral = poolGeneral.filter(p => p.userId !== userId);
    }
});

socket.on('duelo:reconectar', async ({ salaId, userId }) => {
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
    
    // ✅ ACTUALIZAR SOCKET Y LIMPIAR DESCONEXIÓN
    duelo.jugadores[userId].socketId = socket.id;
    usuariosConectados.set(parseInt(userId), socket.id);
    
    // ✅ CRÍTICO: Limpiar timeout de abandono ANTES de limpiar desconexión
    if (duelo.timeoutReconexion) {
        console.log('[RECONEXIÓN]: 🧹 Cancelando timeout de abandono');
        clearTimeout(duelo.timeoutReconexion);
        duelo.timeoutReconexion = null;
    }
    
    // Ahora sí limpiar desconexión
    const desconexionLimpiada = limpiarDesconexion(userId);
    console.log(`[RECONEXIÓN]: ${desconexionLimpiada ? '✅' : '⚠️'} Desconexión limpiada`);
    
    // ✅ ENVIAR ESTADO ACTUAL DEL DUELO
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
        mensaje: '✅ Reconectado exitosamente'
    });
    
    console.log('[RECONEXIÓN]: ✅ Estado enviado al usuario');
    
    // ✅ NOTIFICAR AL OPONENTE
    if (duelo.jugadores[oponenteId]?.socketId) {
        io.to(duelo.jugadores[oponenteId].socketId).emit('duelo:oponenteReconectado', {
            mensaje: `${duelo.jugadores[userId].username} se reconectó`
        });
        
        console.log('[RECONEXIÓN]: ✅ Oponente notificado de reconexión');
    }
});

    console.log(`[SOCKET]: ✅ Handlers registrados para socket ${socket.id}`);
};