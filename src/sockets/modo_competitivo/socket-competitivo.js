// En: src/sockets/modo_competitivo/socket-competitivo.js
const db = require('../../db/conexion');
const { v4: uuidv4 } = require('uuid');

let poolCarreraFacil = [];
let poolCarreraNormal = [];
let poolCarreraDificil = [];
let poolGeneral = [];
const activeDuels = new Map();

// (La función crearDuelo se queda exactamente igual)
function crearDuelo(jugadorA, jugadorB, modo, io) {
    const salaId = uuidv4();
    console.log(`Pareja encontrada (${modo}): ${jugadorA.user.username} vs ${jugadorB.user.username}. Creando sala: ${salaId}`);
    const socketA = io.sockets.sockets.get(jugadorA.socketId);
    const socketB = io.sockets.sockets.get(jugadorB.socketId);
    if (socketA && socketB) {
        socketA.join(salaId);
        socketB.join(salaId);
        activeDuels.set(salaId, {
            modo: modo,
            jugadores: {
                [jugadorA.userId]: { ...jugadorA.user, socketId: jugadorA.socketId, listo: false, racha: 0 },
                [jugadorB.userId]: { ...jugadorB.user, socketId: jugadorB.socketId, listo: false, racha: 0 }
            },
            estado: 'minidraft_start',
            puntuaciones: { [jugadorA.userId]: 0, [jugadorB.userId]: 0 },
            selecciones: {}
        });
        io.to(salaId).emit('duelo:encontrado', {
            salaId: salaId,
            oponente: {
                [jugadorA.userId]: jugadorB.user,
                [jugadorB.userId]: jugadorA.user
            }
        });
    } else {
        const pool = modo === 'carrera' ? (jugadorA.dificultad === 'facil' ? poolCarreraFacil : jugadorA.dificultad === 'normal' ? poolCarreraNormal : poolCarreraDificil) : poolGeneral;
        if (socketA) pool.unshift(jugadorA);
        if (socketB) pool.unshift(jugadorB);
    }
}


module.exports = (io, socket) => {
    
    const buscarPareja = (pool, modo) => {
        console.log(`Buscando pareja en la cola ${modo}. Jugadores en cola: ${pool.length}`);
        if (pool.length < 2) return;
        const jugadorA = pool.shift();
        const jugadorB = pool.shift();
        crearDuelo(jugadorA, jugadorB, modo, io);
    };

    socket.on('duelo:buscar:carrera', async ({ user, dificultad }) => {
        try {
            const [[{ count }]] = await db.query('SELECT COUNT(*) as count FROM usuario_carrera WHERE id_usuario = ?', [user.id_usuario]);
            if (count === 0) {
                return socket.emit('duelo:error:sinCarrera', { mensaje: 'Debes registrar una carrera en tu perfil para este modo.' });
            }

            let pool;
            let poolName = `Carrera ${dificultad}`;
            if (dificultad === 'facil') pool = poolCarreraFacil;
            else if (dificultad === 'normal') pool = poolCarreraNormal;
            else pool = poolCarreraDificil;

            if (!pool.some(p => p.userId === user.id_usuario)) {
                // Añadimos la dificultad al objeto del jugador para referencia futura
                pool.push({ userId: user.id_usuario, user, socketId: socket.id, dificultad: dificultad });
                console.log(`${user.username} se unió a la cola ${poolName}. Jugadores ahora: ${pool.length}`);
                buscarPareja(pool, 'carrera');
            }
        } catch (error) {
            console.error("Error al verificar carrera:", error);
        }
    });

    socket.on('duelo:buscar:general', (user) => {
        if (!poolGeneral.some(p => p.userId === user.id_usuario)) {
            poolGeneral.push({ userId: user.id_usuario, user, socketId: socket.id });
            console.log(`${user.username} se unió a la cola General. Jugadores ahora: ${poolGeneral.length}`);
            buscarPareja(poolGeneral, 'general');
        }
    });
    
    // El resto de tu archivo socket-competitivo.js se queda igual...
    // ... (duelo:cancelarBusqueda, duelo:clienteListo, etc.)
    // No lo pego todo para no hacer una respuesta enorme, pero no necesita cambios.
    socket.on('duelo:cancelarBusqueda', (userId) => {
        poolCarreraFacil = poolCarreraFacil.filter(p => p.userId !== userId);
        poolCarreraNormal = poolCarreraNormal.filter(p => p.userId !== userId);
        poolCarreraDificil = poolCarreraDificil.filter(p => p.userId !== userId);
        poolGeneral = poolGeneral.filter(p => p.userId !== userId);
        console.log(`Jugador ${userId} canceló la búsqueda.`);
    });


    socket.on('duelo:clienteListo', async ({ salaId, userId }) => {
        const duelo = activeDuels.get(salaId);
        if (!duelo) return;

        duelo.jugadores[userId].listo = true;
        const todosListos = Object.values(duelo.jugadores).every(p => p.listo);

        if (todosListos) {
            console.log(`[Duelo ${salaId}]: Iniciando Mini-Draft.`);
            const [jugadorA_id, jugadorB_id] = Object.keys(duelo.jugadores);
            let categorias;

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
                    AND (SELECT COUNT(*) FROM pregunta WHERE id_tematica = t.id_tematica) >= 1 
                    ORDER BY RAND() LIMIT 3;
                `, [jugadorA_id, jugadorB_id]);
            } else {
                [categorias] = await db.query(`
                    SELECT m.id_materia AS id, m.descripcion FROM materias m
                    WHERE (SELECT COUNT(*) FROM pregunta WHERE id_materia = m.id_materia AND id_carrera IS NULL) >= 10
                    ORDER BY RAND() LIMIT 3;
                `);
            }

            if (categorias.length < 1) {
                console.log(`[Duelo ${salaId}]: No se encontraron categorías suficientes. Duelo cancelado.`);
                io.to(salaId).emit('duelo:error', { mensaje: 'No hay suficientes categorías en común para el duelo.' });
                return;
            }

            duelo.categoriasDraft = categorias;
            io.to(salaId).emit('duelo:iniciarMiniDraft', { 
                categorias: categorias.map(c => ({ id: c.id, descripcion: c.descripcion })) 
            });
        }
    });
    socket.on('duelo:seleccionarCategoria', async ({ salaId, userId, idCategoria }) => {
        const duelo = activeDuels.get(salaId);
        if (!duelo || duelo.selecciones[userId]) return;

        duelo.selecciones[userId] = idCategoria;
        
        const oponenteId = Object.keys(duelo.jugadores).find(id => id !== userId);
        if (oponenteId && duelo.jugadores[oponenteId]) {
            const oponenteSocketId = duelo.jugadores[oponenteId].socketId;
            io.to(oponenteSocketId).emit('duelo:oponenteSelecciono');
        }

        if (Object.keys(duelo.selecciones).length === 2) {
            console.log(`[Duelo ${salaId}]: Ambos seleccionaron. Construyendo examen.`);
            duelo.estado = 'en_juego';
            io.to(salaId).emit('duelo:miniDraftFinalizado', { selecciones: duelo.selecciones });
            
            iniciarPartida(salaId, duelo);
        }
    });

    async function iniciarPartida(salaId, duelo) {
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

            const examenCompleto = [...preguntasA, ...preguntasB].sort(() => Math.random() - 0.5);
            
            duelo.examen = examenCompleto;
            duelo.preguntaActual = 0;
            duelo.respuestas = {};

            setTimeout(() => {
                enviarSiguientePregunta(salaId, duelo);
            }, 3000);

        } catch (error) {
            console.error(`[Duelo ${salaId}]: Error al iniciar partida:`, error);
            io.to(salaId).emit('duelo:error', { mensaje: 'Error al preparar las preguntas del duelo.' });
        }
    }
    socket.on('duelo:aceptarDesafio', ({ id_retador }) => {
        const id_retado = socket.request.session.user.id_usuario;
        
        const salaId = `desafio_${uuidv4()}`;
        console.log(`Desafío aceptado entre ${id_retador} y ${id_retado}. Creando sala: ${salaId}`);

        const retadorSocket = findSocketById(io, id_retador);
        
        if (retadorSocket) {
            socket.join(salaId);
            retadorSocket.join(salaId);

            activeDuels.set(salaId, {
                modo: 'general',
                jugadores: {
                    [id_retador]: { ...retadorSocket.request.session.user, socketId: retadorSocket.id, listo: false, racha: 0 },
                    [id_retado]: { ...socket.request.session.user, socketId: socket.id, listo: false, racha: 0 }
                },
                estado: 'minidraft_start',
                puntuaciones: { [id_retador]: 0, [id_retado]: 0 },
                selecciones: {}
            });

            io.to(salaId).emit('duelo:iniciarDesafio', { salaId });
        } else {
            console.log(`No se pudo encontrar el socket del retador ${id_retador}`);
        }
    });

    function findSocketById(io, userId) {
        for (const [_, socket] of io.sockets.sockets) {
            if (socket.request.session.user?.id_usuario === userId) {
                return socket;
            }
        }
        return null;
    }

    socket.on('duelo:responder', async ({ salaId, userId, idPregunta, idRespuesta }) => {
        const duelo = activeDuels.get(salaId);
        if (!duelo || duelo.estado !== 'en_juego') return;

        const preguntaActual = duelo.examen[duelo.preguntaActual];
        if (preguntaActual.id_pregunta !== idPregunta || (duelo.respuestas[idPregunta] && duelo.respuestas[idPregunta][userId])) return;

        // ✅ DINAMISMO: Notificar al oponente que ya respondiste
        const oponenteId = Object.keys(duelo.jugadores).find(id => id !== userId);
        if (oponenteId) {
            const oponenteSocketId = duelo.jugadores[oponenteId].socketId;
            io.to(oponenteSocketId).emit('duelo:oponenteRespondio');
        }

        const [[respuestaData]] = await db.query(
            'SELECT correcta, (SELECT retroalimentacion FROM pregunta WHERE id_pregunta = ?) AS retro FROM respuesta WHERE id_respuesta = ?', 
            [idPregunta, idRespuesta]
        );

        const esCorrecta = respuestaData && respuestaData.correcta === 1;
        const retroalimentacion = respuestaData ? respuestaData.retro : "No se encontró la pregunta para esta respuesta.";
        
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
            puntosGanados = (eventoActual?.tipo === 'Pregunta Segura') ? 0 : -50;
            if (eventoActual?.tipo === 'Pregunta Crítica') puntosGanados *= 1.5;
        }
        duelo.puntuaciones[userId] += puntosGanados;

        // Feedback para el jugador que acaba de responder
        socket.emit('duelo:resultadoRespuesta', {
            esCorrecta,
            retroalimentacion,
            idPregunta
        });

        if (Object.keys(duelo.respuestas[idPregunta]).length === 2) {
            if (duelo.timer) clearTimeout(duelo.timer);

            // Enviar el resultado al oponente que estaba esperando
            const oponenteRespuesta = duelo.respuestas[idPregunta][oponenteId];
            const [[oponenteRetro]] = await db.query('SELECT retroalimentacion FROM pregunta WHERE id_pregunta = ?', [idPregunta]);

            io.to(duelo.jugadores[oponenteId].socketId).emit('duelo:resultadoRespuesta', {
                esCorrecta: oponenteRespuesta.esCorrecta,
                retroalimentacion: oponenteRetro.retroalimentacion,
                idPregunta
            });

            // Actualizar estado para todos
            io.to(salaId).emit('duelo:actualizarEstado', {
                puntuaciones: duelo.puntuaciones,
                rachas: {
                    [userId]: duelo.jugadores[userId].racha,
                    [oponenteId]: duelo.jugadores[oponenteId].racha
                }
            });

            duelo.preguntaActual++;
            // ✅ DINAMISMO: Transición más ágil
            setTimeout(() => enviarSiguientePregunta(salaId, duelo), 2500); // 2.5s para leer la retroalimentación
        }
    });

    async function enviarSiguientePregunta(salaId, duelo) {
        if (!duelo || !duelo.examen || duelo.preguntaActual >= duelo.examen.length) {
            finalizarDuelo(salaId, duelo);
            return;
        }

        const preguntaActual = duelo.examen[duelo.preguntaActual];
        
        // ✅ DINAMISMO: Lógica de eventos aleatorios
        const chance = Math.random();
        if (chance < 0.20) { // 20% de probabilidad de evento
             const eventos = [
                { tipo: 'Pregunta Rápida', duracion: 8, notificacion: '¡PUNTOS DOBLES, TIEMPO REDUCIDO!' },
                { tipo: 'Pregunta Segura', duracion: 15, notificacion: '¡PREGUNTA SEGURA! No pierdes puntos si fallas.' },
                { tipo: 'Pregunta Crítica', duracion: 15, notificacion: '¡PREGUNTA CRÍTICA! Los puntos se multiplican x1.5.' }
            ];
            preguntaActual.evento = eventos[Math.floor(Math.random() * eventos.length)];
        } else {
            delete preguntaActual.evento; // Asegurarse de que no haya evento
        }
        
        const [respuestas] = await db.query('SELECT id_respuesta, respuesta FROM respuesta WHERE id_pregunta = ? ORDER BY RAND()', [preguntaActual.id_pregunta]);

        io.to(salaId).emit('duelo:nuevaPregunta', {
            pregunta: preguntaActual,
            opciones: respuestas,
            numeroPregunta: duelo.preguntaActual + 1,
            totalPreguntas: duelo.examen.length,
            evento: preguntaActual.evento // Enviar info del evento al cliente
        });
        
        if (duelo.timer) clearTimeout(duelo.timer);
        
        const duracion = preguntaActual.evento?.duracion || 15;
        duelo.timer = setTimeout(() => {
            console.log(`[Duelo ${salaId}]: Tiempo agotado para la pregunta ${preguntaActual.id_pregunta}`);
            Object.keys(duelo.jugadores).forEach(jugadorId => {
                if (!duelo.respuestas[preguntaActual.id_pregunta] || !duelo.respuestas[preguntaActual.id_pregunta][jugadorId]) {
                    duelo.puntuaciones[jugadorId] -= 25;
                }
            });

            io.to(salaId).emit('duelo:actualizarEstado', { puntuaciones: duelo.puntuaciones });
            duelo.preguntaActual++;
            setTimeout(() => enviarSiguientePregunta(salaId, duelo), 2000);
        }, duracion * 1000);
    }
    

    // Función para finalizar el duelo (Futuro)
    function finalizarDuelo(salaId, duelo) {
        console.log(`[Duelo ${salaId}]: Duelo finalizado.`);
        // Lógica para determinar ganador, actualizar BBDD, etc.
        io.to(salaId).emit('duelo:finalizado', { /* datos del resultado */ });
    }

     // ... (resto de tu código de socket)
 
    
    // Función vacía para comodines (Futuro para Propuesta 3)
    socket.on('duelo:usarComodin', ({ salaId, userId, comodin }) => {
        const duelo = activeDuels.get(salaId);
        if (!duelo) return;
        // Lógica futura para activar un comodín
        console.log(`[Duelo ${salaId}]: ${userId} intentó usar el comodín ${comodin}`);
    });

    // ...
};