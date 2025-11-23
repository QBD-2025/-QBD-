module.exports = (base) => {
    console.log('🐍 [SERPIENTES] Módulo socket-serpientes.js cargado');
    console.log('🔍 [SERPIENTES] Base recibido:', { 
        hasIo: !!base.io, 
        hasPool: !!base.pool, 
        hasState: !!base.state,
        hasConfig: !!base.config 
    });
    
    const { io, state, config, pool } = base;

    if (!io || !pool || !state) {
        console.error('❌ [SERPIENTES] ERROR CRÍTICO: io, pool o state no están definidos');
        return { init: () => {}, cleanup: () => {} };
    }

    // Usar el estado compartido
    if (!state.salasSerpientes) {
        state.salasSerpientes = {};
    }
    const salasSerpientes = state.salasSerpientes;

    // Emojis por defecto para los jugadores
    const EMOJI_DEFAULTS = ['🐵', '🐸', '🦄', '🤖', 
                            '👻', '👽', '🎃', '🐲',
                            '🐷', '🐰', '🐼', '🐨'
    ];

    // Función para emitir el estado de la sala a todos los jugadores
    const emitirEstado = (salaId) => {
        if (salasSerpientes[salaId]) {
            console.log(`[SERPIENTES] Emitiendo estado de sala ${salaId}:`, {
                jugadores: salasSerpientes[salaId].jugadores.length,
                gameStarted: salasSerpientes[salaId].gameStarted,
                turnoActual: salasSerpientes[salaId].turnoActual
            });
            io.to(salaId).emit('serpientes:estado', salasSerpientes[salaId]);
        }
    };

    // Iniciar partida cargando preguntas de la base de datos
    const iniciarPartida = async (salaId, idMateria) => {
        const sala = salasSerpientes[salaId];
        if (!sala) return;

        console.log(`[SERPIENTES] Iniciando partida en sala ${salaId} con materia ${idMateria}`);

        try {
            // Obtener preguntas y respuestas de la materia
            const [rows] = await pool.query(
                `SELECT p.id_pregunta, p.pregunta, p.retroalimentacion, r.id_respuesta, r.respuesta, r.correcta 
                 FROM pregunta p JOIN respuesta r ON p.id_pregunta = r.id_pregunta 
                 WHERE p.id_materia = ?`,
                [idMateria]
            );

            console.log(`[SERPIENTES] Preguntas obtenidas: ${rows.length} filas para materia ${idMateria}`);

            // Organizar preguntas y respuestas
            const preguntasMap = new Map();
            rows.forEach(row => {
                if (!preguntasMap.has(row.id_pregunta)) {
                    preguntasMap.set(row.id_pregunta, {
                        id_pregunta: row.id_pregunta,
                        pregunta: row.pregunta,
                        retroalimentacion: row.retroalimentacion,
                        opciones: []
                    });
                }
                preguntasMap.get(row.id_pregunta).opciones.push({ 
                    id: row.id_respuesta, 
                    texto: row.respuesta, 
                    correcta: !!row.correcta 
                });
            });

            let todasLasPreguntas = Array.from(preguntasMap.values());
            console.log(`[SERPIENTES] Total preguntas únicas: ${todasLasPreguntas.length}`);

            // Validar que haya al menos 5 preguntas
            if (todasLasPreguntas.length < 5) {
                console.log(`[SERPIENTES] ❌ No hay suficientes preguntas (${todasLasPreguntas.length}/5)`);
                io.to(salaId).emit('serpientes:error', { 
                    mensaje: `No hay suficientes preguntas (${todasLasPreguntas.length}/5) en esta categoría.` 
                });
                sala.votacionEnProgreso = false;
                sala.votos = {};
                sala.propuestaMateria = null;
                emitirEstado(salaId);
                return;
            }

            // Mezclar preguntas aleatoriamente
            todasLasPreguntas.sort(() => Math.random() - 0.5);
            sala.preguntas = todasLasPreguntas;

            // Inicializar posiciones y estado de la sala
            sala.jugadores.forEach(j => { 
                j.posicion = 1; 
                j.turnosPerdidos = 0; 
            });
            sala.turnoActual = 0;
            sala.ganador = null;
            sala.gameStarted = true;
            sala.votacionEnProgreso = false;
            sala.estadoDelJuego = 'lanzando_dado';
            sala.turnosParaPregunta = Math.floor(Math.random() * 3) + 3;
            sala.log.push(`¡La partida de ${sala.propuestaMateria.textoMateria} ha comenzado!`);

            console.log(`[SERPIENTES] ✅ Partida iniciada en sala ${salaId}`);
            emitirEstado(salaId);

        } catch (error) {
            console.error("[SERPIENTES] Error al iniciar partida:", error);
            io.to(salaId).emit('serpientes:error', { 
                message: 'Error del servidor al cargar preguntas.' 
            });
        }
    };

    return {
        // Inicializar eventos para un socket conectado
        init: (socket) => {
            console.log(`[SERPIENTES INIT] 🐍 Socket conectado: ${socket.id}`);

            // ==================== UNIRSE A LA SALA ====================
            socket.on('serpientes:unirse', ({ salaId, usuario }) => {
                console.log(`[SERPIENTES] ${usuario.username} intenta unirse a sala ${salaId}`);
                socket.join(salaId);

                // Crear sala si no existe
                if (!salasSerpientes[salaId]) {
                    console.log(`[SERPIENTES] Creando nueva sala ${salaId}`);
                    salasSerpientes[salaId] = {
                        jugadores: [],
                        turnoActual: 0,
                        dado: 0,
                        ganador: null,
                        gameStarted: false,
                        log: [],
                        config: config?.serpientes || {},
                        votacionEnProgreso: false,
                        votos: {},
                        idMateria: null,
                        preguntas: [],
                        preguntaActual: null,
                        estadoDelJuego: 'esperando_materia',
                        turnosParaPregunta: 0,
                        propuestaMateria: null,
                    };
                }

                const sala = salasSerpientes[salaId];

                // Verificar si la partida ya comenzó
                if (sala.gameStarted && !sala.ganador) {
                    console.log(`[SERPIENTES] ❌ ${usuario.username} no puede unirse - partida en curso`);
                    socket.emit('serpientes:error', { mensaje: 'La partida ya ha comenzado' });
                    return;
                }
                
                // Verificar si la sala está llena
                if (sala.jugadores.length >= 4 && !sala.jugadores.some(p => p.id === usuario.id_usuario)) {
                    console.log(`[SERPIENTES] ❌ ${usuario.username} no puede unirse - sala llena`);
                    socket.emit('serpientes:error', { mensaje: 'La sala está llena (máximo 4 jugadores)' });
                    return;
                }

                // Verificar si el jugador ya está en la sala (reconexión)
                const jugadorExistente = sala.jugadores.find(p => p.id === usuario.id_usuario);
                
                if (jugadorExistente) {
                    // Actualizar solo el socketId en caso de reconexión
                    jugadorExistente.socketId = socket.id;
                    console.log(`[SERPIENTES] ♻️ ${usuario.username} reconectado - Total jugadores: ${sala.jugadores.length}`);
                    sala.log.push(`${usuario.username} se ha reconectado.`);
                } else {
                    // Agregar nuevo jugador
                    const nuevoJugador = {
                        id: usuario.id_usuario,
                        socketId: socket.id,
                        username: usuario.username,
                        posicion: 1,
                        turnosPerdidos: 0,
                        emoji: EMOJI_DEFAULTS[sala.jugadores.length] || '👽' 
                    };
                    sala.jugadores.push(nuevoJugador);
                    console.log(`[SERPIENTES] ✅ ${usuario.username} agregado con emoji ${nuevoJugador.emoji} - Total jugadores: ${sala.jugadores.length}`);
                    sala.log.push(`${usuario.username} se ha unido.`);
                }

                // ✅ CRÍTICO: Emitir el estado actualizado a todos los jugadores
                emitirEstado(salaId);
            });

            // ==================== ELEGIR FICHA/EMOJI ====================
            socket.on('serpientes:elegirFicha', ({ salaId, emoji }) => {
                console.log(`[SERPIENTES] Jugador intenta elegir ficha: ${emoji} en sala ${salaId}`);
                
                const sala = salasSerpientes[salaId];
                if (!sala || sala.gameStarted) {
                    console.log(`[SERPIENTES] ❌ No se puede cambiar ficha - sala no existe o juego ya comenzó`);
                    return;
                }

                const jugador = sala.jugadores.find(j => j.socketId === socket.id);
                if (jugador) {
                    const emojiEnUso = sala.jugadores.some(p => p.emoji === emoji && p.id !== jugador.id);
                    if (!emojiEnUso) {
                        console.log(`[SERPIENTES] ✅ ${jugador.username} cambió su ficha a ${emoji}`);
                        jugador.emoji = emoji;
                        emitirEstado(salaId);
                    } else {
                        console.log(`[SERPIENTES] ❌ Emoji ${emoji} ya está en uso`);
                        socket.emit('serpientes:error', { mensaje: 'Ese emoji ya está en uso.' });
                    }
                }
            });

            // ==================== PROPONER MATERIA ====================
            socket.on('serpientes:proponerMateria', ({ salaId, idMateria, textoMateria }) => {
                console.log(`[SERPIENTES] Propuesta de materia en sala ${salaId} - ${textoMateria} (${idMateria})`);
                
                const sala = salasSerpientes[salaId];
                const proponente = sala?.jugadores.find(j => j.socketId === socket.id);

                // Solo el anfitrión puede proponer materia
                if (!sala || !proponente || sala.jugadores[0].id !== proponente.id) {
                    console.log(`[SERPIENTES] ❌ Propuesta rechazada - no es el anfitrión`);
                    socket.emit('serpientes:error', { mensaje: 'Solo el anfitrión puede proponer categorías' });
                    return;
                }

                if (sala.gameStarted || sala.votacionEnProgreso || sala.jugadores.length < 2) {
                    console.log(`[SERPIENTES] ❌ Propuesta rechazada - condiciones no cumplidas`);
                    socket.emit('serpientes:error', { mensaje: 'No se puede iniciar la votación en este momento' });
                    return;
                }

                sala.votacionEnProgreso = true;
                sala.propuestaMateria = { proponente, idMateria, textoMateria };
                sala.votos = { [proponente.id]: true }; // Proponente ya votó sí

                console.log(`[SERPIENTES] ✅ Votación iniciada por ${proponente.username}`);
                io.to(salaId).emit('serpientes:votacionMateria', sala.propuestaMateria);
                emitirEstado(salaId);
            });

            // ==================== VOTACIÓN DE MATERIA ====================
            socket.on('serpientes:votar', ({ salaId, voto }) => {
                console.log(`[SERPIENTES] Voto recibido en sala ${salaId}: ${voto}`);
                
                const sala = salasSerpientes[salaId];
                const votante = sala?.jugadores.find(j => j.socketId === socket.id);
                
                if (!sala || !votante || !sala.votacionEnProgreso) {
                    console.log(`[SERPIENTES] ❌ Voto rechazado - condiciones no válidas`);
                    return;
                }

                // Verificar si ya votó
                if (sala.votos[votante.id] !== undefined) {
                    console.log(`[SERPIENTES] ❌ ${votante.username} ya había votado`);
                    return;
                }

                sala.votos[votante.id] = voto;
                const todosHanVotado = Object.keys(sala.votos).length === sala.jugadores.length;
                
                console.log(`[SERPIENTES] Votos actuales:`, sala.votos);

                if (!voto) {
                    // Si algún jugador rechaza, cancelar votación
                    console.log(`[SERPIENTES] ❌ Votación rechazada por ${votante.username}`);
                    sala.votacionEnProgreso = false; 
                    sala.votos = {}; 
                    sala.propuestaMateria = null;
                    io.to(salaId).emit('serpientes:votacionCancelada', { 
                        motivo: `${votante.username} rechazó la categoría.` 
                    });
                    emitirEstado(salaId);
                } else if (voto && todosHanVotado) {
                    // Si todos votan sí, iniciar partida
                    console.log(`[SERPIENTES] ✅ Todos votaron a favor - iniciando partida`);
                    iniciarPartida(salaId, sala.propuestaMateria.idMateria);
                }
            });

            // ==================== LANZAR DADO ====================
            socket.on('serpientes:lanzarDado', ({ salaId, userId }) => {
                console.log(`[SERPIENTES] Intento de lanzar dado en sala ${salaId} por usuario ${userId}`);
                
                const sala = salasSerpientes[salaId];
                if (!sala || sala.ganador || !sala.gameStarted || sala.estadoDelJuego !== 'lanzando_dado') {
                    console.log(`[SERPIENTES] ❌ Lanzamiento rechazado - condiciones no cumplidas`);
                    return;
                }

                const jugadorActual = sala.jugadores[sala.turnoActual];
                if (Number(jugadorActual.id) !== Number(userId)) {
                    console.log(`[SERPIENTES] ❌ No es el turno de este jugador`);
                    return;
                }

                // Saltar turno si tiene turnos perdidos
                if (jugadorActual.turnosPerdidos > 0) {
                    jugadorActual.turnosPerdidos--;
                    console.log(`[SERPIENTES] ⏭️ ${jugadorActual.username} pierde su turno`);
                    sala.log.push(`INFO: ${jugadorActual.username} pierde su turno.`);
                    sala.turnoActual = (sala.turnoActual + 1) % sala.jugadores.length;
                    emitirEstado(salaId);
                    return;
                }

                const valorDado = Math.floor(Math.random() * 6) + 1;
                sala.dado = valorDado;
                console.log(`[SERPIENTES] 🎲 ${jugadorActual.username} sacó un ${valorDado}`);
                sala.log.push(`DADO: ${jugadorActual.username} ha sacado un ${valorDado}.`);
                io.to(salaId).emit('serpientes:dado', { valor: valorDado });

                setTimeout(() => {
                    // Actualizar posición del jugador
                    let posIntermedia = jugadorActual.posicion + valorDado;
                    if (posIntermedia > 100) posIntermedia = 100 - (posIntermedia - 100);
                    jugadorActual.posicion = posIntermedia;

                    console.log(`[SERPIENTES] 📍 ${jugadorActual.username} se mueve a posición ${jugadorActual.posicion}`);

                    // Escaleras y serpientes según el tablero
                    const snakesAndLadders = {
                        5: 25, 14: 47, 22: 42, 30: 50, 49: 69, 61: 82, 70: 90, 83: 98,
                        17: 4, 27: 7, 35: 15, 45: 65, 58: 38, 76: 56, 88: 68, 94: 74, 99: 79
                    };
                    const especial = snakesAndLadders[jugadorActual.posicion];
                    if (especial) {
                        const tipo = especial > jugadorActual.posicion ? 'escalera' : 'serpiente';
                        console.log(`[SERPIENTES] ⚡ ${jugadorActual.username} encontró una ${tipo}! (${jugadorActual.posicion} → ${especial})`);
                        sala.log.push(`EVENTO: ¡${jugadorActual.username} encontró una ${tipo}!`);
                        jugadorActual.posicion = especial;
                    }

                    // Turno de pregunta
                    sala.turnosParaPregunta--;
                    if (sala.turnosParaPregunta <= 0 && sala.preguntas.length > 0) {
                        console.log(`[SERPIENTES] 🧠 Turno de pregunta para ${jugadorActual.username}`);
                        sala.log.push(`PREGUNTA: ¡Turno de pregunta para ${jugadorActual.username}!`);
                        sala.preguntaActual = sala.preguntas.pop();
                        sala.estadoDelJuego = 'respondiendo_pregunta';
                        io.to(salaId).emit('serpientes:mostrarPregunta', { 
                            pregunta: sala.preguntaActual, 
                            jugadorId: jugadorActual.id 
                        });
                    } else {
                        if (jugadorActual.posicion === 100) {
                            console.log(`[SERPIENTES] 🏆 ${jugadorActual.username} ha ganado!`);
                            sala.ganador = jugadorActual;
                        } else if (valorDado !== 6) {
                            sala.turnoActual = (sala.turnoActual + 1) % sala.jugadores.length;
                            console.log(`[SERPIENTES] ➡️ Turno cambia a: ${sala.jugadores[sala.turnoActual].username}`);
                        } else {
                            console.log(`[SERPIENTES] 🎲 ${jugadorActual.username} tira de nuevo por sacar un 6`);
                            sala.log.push(`INFO: ${jugadorActual.username} tira de nuevo por sacar un 6.`);
                        }
                    }
                    emitirEstado(salaId);
                }, 1200);
            });

            // ==================== RESPONDER PREGUNTA ====================
            socket.on('serpientes:responderPregunta', ({ salaId, respuestaId }) => {
                console.log(`[SERPIENTES] Respuesta recibida en sala ${salaId}: ${respuestaId}`);
                
                const sala = salasSerpientes[salaId];
                if (!sala) {
                    console.log(`[SERPIENTES] ❌ Sala no encontrada`);
                    return;
                }

                const jugadorActual = sala.jugadores[sala.turnoActual];
                
                if (!jugadorActual || socket.id !== jugadorActual.socketId || sala.estadoDelJuego !== 'respondiendo_pregunta') {
                    console.log(`[SERPIENTES] ❌ Respuesta rechazada - condiciones no cumplidas`);
                    return;
                }

                const opcionCorrecta = sala.preguntaActual.opciones.find(opt => opt.correcta);
                const esCorrecta = (Number(respuestaId) === Number(opcionCorrecta.id));

                console.log(`[SERPIENTES] Respuesta ${esCorrecta ? '✅ correcta' : '❌ incorrecta'}`);

                if (esCorrecta) {
                    sala.log.push(`INFO: ${jugadorActual.username} respondió correctamente. ¡Tira de nuevo!`);
                } else {
                    sala.log.push(`INFO: ${jugadorActual.username} respondió incorrectamente. Pierde un turno.`);
                    jugadorActual.turnosPerdidos = 1;
                    sala.turnoActual = (sala.turnoActual + 1) % sala.jugadores.length;
                }

                io.to(salaId).emit('serpientes:respuestaResultado', { 
                    esCorrecta, 
                    respuestaCorrectaTexto: opcionCorrecta.texto 
                });
                
                sala.preguntaActual = null;
                sala.estadoDelJuego = 'lanzando_dado';
                sala.turnosParaPregunta = Math.floor(Math.random() * 3) + 3;

                setTimeout(() => emitirEstado(salaId), 1500);
            });
        },

        // ==================== CLEANUP - LIMPIAR JUGADOR DESCONECTADO ====================
        cleanup: (socket) => {
            console.log(`[SERPIENTES CLEANUP] 🧹 Limpiando socket ${socket.id}`);
            
            for (const salaId in salasSerpientes) {
                const sala = salasSerpientes[salaId];
                const jugadorIndex = sala.jugadores.findIndex(j => j.socketId === socket.id);

                if (jugadorIndex !== -1) {
                    const jugadorDesc = sala.jugadores[jugadorIndex];
                    console.log(`[SERPIENTES] 👋 ${jugadorDesc.username} desconectado de sala ${salaId}`);
                    
                    sala.log.push(`${jugadorDesc.username} se ha desconectado.`);
                    sala.jugadores.splice(jugadorIndex, 1);

                    // Si no quedan jugadores, eliminar la sala
                    if (sala.jugadores.length === 0) {
                        delete salasSerpientes[salaId];
                        console.log(`[SERPIENTES] 🗑️  Sala ${salaId} eliminada - sin jugadores`);
                        return;
                    }

                    // Cancelar votación si está en progreso
                    if (sala.votacionEnProgreso) {
                        sala.votacionEnProgreso = false; 
                        sala.votos = {}; 
                        sala.propuestaMateria = null;
                        io.to(salaId).emit('serpientes:votacionCancelada', { 
                            motivo: 'Un jugador se desconectó.' 
                        });
                    }

                    // Si la partida ya comenzó y solo queda 1 jugador, ese jugador gana
                    if (sala.gameStarted && sala.jugadores.length < 2 && !sala.ganador) {
                        sala.ganador = sala.jugadores[0];
                        sala.log.push(`FIN: ${sala.ganador.username} gana porque el oponente se desconectó.`);
                    }

                    // Ajustar el turno actual si es necesario
                    if (sala.turnoActual >= sala.jugadores.length) {
                        sala.turnoActual = 0;
                    }
                    
                    emitirEstado(salaId);
                    return;
                }
            }
        }
    };
};