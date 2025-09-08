// EN: src/sockets/socket-serpientes.js

module.exports = (base) => {
    const { io, state, config, pool } = base;
    const salasSerpientes = state.salasSerpientes;
    const EMOJI_DEFAULTS = ['🐵', '🐸', '🦄', '🤖', 
                            '👻', '👽', '🎃', '🐲',
                            '🐷', '🐰', '🐼', '🐨',
                            '卐'
    ];

    const emitirEstado = (salaId) => {
        if (salasSerpientes[salaId]) {
            io.to(salaId).emit('serpientes:estado', salasSerpientes[salaId]);
        }
    };

    const iniciarPartida = async (salaId, idMateria) => {
        const sala = salasSerpientes[salaId];
        if (!sala) return;

        try {
            const [rows] = await pool.query(
                `SELECT p.id_pregunta, p.pregunta, p.retroalimentacion, r.id_respuesta, r.respuesta, r.correcta 
                 FROM pregunta p JOIN respuesta r ON p.id_pregunta = r.id_pregunta 
                 WHERE p.id_materia = ?`,
                [idMateria]
            );

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
                preguntasMap.get(row.id_pregunta).opciones.push({ id: row.id_respuesta, texto: row.respuesta, correcta: !!row.correcta });
            });

            let todasLasPreguntas = Array.from(preguntasMap.values());
            if (todasLasPreguntas.length < 5) {
                io.to(salaId).emit('serpientes:error', { mensaje: `No hay suficientes preguntas (${todasLasPreguntas.length}/5) en esta categoría.` });
                sala.votacionEnProgreso = false; sala.votos = {}; sala.propuestaMateria = null;
                emitirEstado(salaId);
                return;
            }

            todasLasPreguntas.sort(() => Math.random() - 0.5);
            sala.preguntas = todasLasPreguntas;
            
            sala.jugadores.forEach(j => { j.posicion = 1; j.turnosPerdidos = 0; });
            sala.turnoActual = 0;
            sala.ganador = null;
            sala.gameStarted = true;
            sala.votacionEnProgreso = false;
            sala.estadoDelJuego = 'lanzando_dado';
            sala.turnosParaPregunta = Math.floor(Math.random() * 3) + 3;
            sala.log.push(`¡La partida de ${sala.propuestaMateria.textoMateria} ha comenzado!`);
            
            emitirEstado(salaId);

        } catch (error) {
            console.error("Error al iniciar partida de Serpientes:", error);
            io.to(salaId).emit('serpientes:error', { message: 'Error del servidor al cargar preguntas.' });
        }
    };

    return {
        init: (socket) => {
            socket.on('serpientes:unirse', ({ salaId, usuario }) => {
                socket.join(salaId);

                if (!salasSerpientes[salaId]) {
                    salasSerpientes[salaId] = {
                        jugadores: [],
                        turnoActual: 0,
                        dado: 0,
                        ganador: null,
                        gameStarted: false,
                        log: [],
                        config: config.serpientes,
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
                if (sala.gameStarted && !sala.ganador) {return;}
                if (sala.jugadores.length >= 4 && !sala.jugadores.some(p => p.id === usuario.id_usuario)) {return;}

                if (!sala.jugadores.some(p => p.id === usuario.id_usuario)) {
                    sala.jugadores.push({
                        id: usuario.id_usuario,
                        socketId: socket.id,
                        username: usuario.username,
                        posicion: 1,
                        turnosPerdidos: 0,
                        emoji: EMOJI_DEFAULTS[sala.jugadores.length] || '👽' 
                    });
                }
                
                sala.log.push(`${usuario.username} se ha unido.`);
                emitirEstado(salaId);
            });
            socket.on('serpientes:elegirFicha', ({ salaId, emoji }) => {
                const sala = salasSerpientes[salaId];
                if (!sala || sala.gameStarted) return; // No se puede cambiar si la partida empezó

                const jugador = sala.jugadores.find(j => j.socketId === socket.id);
                if (jugador) {
                    // Opcional: Prevenir que se elija un emoji ya en uso
                    const emojiEnUso = sala.jugadores.some(p => p.emoji === emoji && p.id !== jugador.id);
                    if (!emojiEnUso) {
                        jugador.emoji = emoji;
                        emitirEstado(salaId); // Notifica a todos del cambio
                    } else {
                        // Opcional: Notificar al jugador que el emoji no está disponible
                        socket.emit('serpientes:error', { mensaje: 'Ese emoji ya está en uso.' });
                    }
                }
            });
            socket.on('serpientes:proponerMateria', ({ salaId, idMateria, textoMateria }) => {
                const sala = salasSerpientes[salaId];
                const proponente = sala?.jugadores.find(j => j.socketId === socket.id);

                if (!sala || !proponente || sala.jugadores[0].id !== proponente.id) {
                    return;
                }
                
                if (sala.gameStarted || sala.votacionEnProgreso || sala.jugadores.length < 2) return;
                
                sala.votacionEnProgreso = true;
                sala.propuestaMateria = { proponente, idMateria, textoMateria };
                sala.votos = { [proponente.id]: true }; 
                
                io.to(salaId).emit('serpientes:votacionMateria', sala.propuestaMateria);
                emitirEstado(salaId);
            });
            
            socket.on('serpientes:votar', ({ salaId, voto }) => {
                const sala = salasSerpientes[salaId];
                const votante = sala?.jugadores.find(j => j.socketId === socket.id);
                if (!sala || !votante || !sala.votacionEnProgreso || sala.votos[votante.id] !== undefined) return;

                sala.votos[votante.id] = voto;
                const todosHanVotado = Object.keys(sala.votos).length === sala.jugadores.length;

                if (!voto) {
                    sala.votacionEnProgreso = false; sala.votos = {}; sala.propuestaMateria = null;
                    io.to(salaId).emit('serpientes:votacionCancelada', { motivo: `${votante.username} rechazó la categoría.` });
                    emitirEstado(salaId);
                } else if (voto && todosHanVotado) {
                    iniciarPartida(salaId, sala.propuestaMateria.idMateria);
                }
            });

            socket.on('serpientes:lanzarDado', ({ salaId, userId }) => {
                const sala = salasSerpientes[salaId];
                if (!sala || sala.ganador || !sala.gameStarted || sala.estadoDelJuego !== 'lanzando_dado') return;
                
                const jugadorActual = sala.jugadores[sala.turnoActual];
                if (Number(jugadorActual.id) !== Number(userId)) return;

                if (jugadorActual.turnosPerdidos > 0) {
                    jugadorActual.turnosPerdidos--;
                    sala.log.push(`INFO: ${jugadorActual.username} pierde su turno.`);
                    sala.turnoActual = (sala.turnoActual + 1) % sala.jugadores.length;
                    emitirEstado(salaId);
                    return;
                }
                
                const valorDado = Math.floor(Math.random() * 6) + 1;
                sala.dado = valorDado;
                sala.log.push(`DADO: ${jugadorActual.username} ha sacado un ${valorDado}.`);
                io.to(salaId).emit('serpientes:dado', { valor: valorDado });

                setTimeout(() => {
                    let posIntermedia = jugadorActual.posicion + valorDado;
                    if (posIntermedia > 100) posIntermedia = 100 - (posIntermedia - 100);
                    jugadorActual.posicion = posIntermedia;

                    // ✅ INICIO DE LA MODIFICACIÓN: USA EL MAPA DE TU IMAGEN
                    const snakesAndLadders = {
                        // Escaleras (según tu imagen)
                        5: 25, 14: 47, 22: 42, 30: 50, 49: 69, 61: 82, 70: 90, 83: 98,
                        // Serpientes (según tu imagen)
                        17: 4, 27: 7, 35: 15, 45: 65, 58: 38, 76: 56, 88: 68, 94: 74, 99: 79
                    };
                    
                    // Reemplaza la línea original por esta:
                    const especial = snakesAndLadders[jugadorActual.posicion];
                    // ✅ FIN DE LA MODIFICACIÓN

                    if (especial) {
                        const tipo = especial > jugadorActual.posicion ? 'escalera' : 'serpiente';
                        sala.log.push(`EVENTO: ¡${jugadorActual.username} encontró una ${tipo}!`);
                        jugadorActual.posicion = especial;
                    }
                    
                    sala.turnosParaPregunta--;
                    if (sala.turnosParaPregunta <= 0 && sala.preguntas.length > 0) {
                        sala.log.push(`PREGUNTA: ¡Turno de pregunta para ${jugadorActual.username}!`);
                        sala.preguntaActual = sala.preguntas.pop();
                        sala.estadoDelJuego = 'respondiendo_pregunta';
                        // ✅ CORREGIDO: Se emite a toda la sala, para que todos la vean, pero con el ID del jugador que debe responder.
                        io.to(salaId).emit('serpientes:mostrarPregunta', { pregunta: sala.preguntaActual, jugadorId: jugadorActual.id });
                    } else {
                        if (jugadorActual.posicion === 100) {
                            sala.ganador = jugadorActual;
                        } else if (valorDado !== 6) {
                            sala.turnoActual = (sala.turnoActual + 1) % sala.jugadores.length;
                        } else {
                            sala.log.push(`INFO: ${jugadorActual.username} tira de nuevo por sacar un 6.`);
                        }
                    }
                    emitirEstado(salaId);
                }, 1200);
            });
            
            socket.on('serpientes:responderPregunta', ({ salaId, respuestaId }) => {
                const sala = salasSerpientes[salaId];
                const jugadorActual = sala.jugadores[sala.turnoActual];
                
                if (!sala || !jugadorActual || socket.id !== jugadorActual.socketId || sala.estadoDelJuego !== 'respondiendo_pregunta') {
                    return;
                }

                const opcionCorrecta = sala.preguntaActual.opciones.find(opt => opt.correcta);
                const esCorrecta = (Number(respuestaId) === Number(opcionCorrecta.id));

                if (esCorrecta) {
                    sala.log.push(`INFO: ${jugadorActual.username} respondió correctamente. ¡Tira de nuevo!`);
                } else {
                    sala.log.push(`INFO: ${jugadorActual.username} respondió incorrectamente. Pierde un turno.`);
                    jugadorActual.turnosPerdidos = 1;
                    sala.turnoActual = (sala.turnoActual + 1) % sala.jugadores.length;
                }

                io.to(salaId).emit('serpientes:respuestaResultado', { esCorrecta, respuestaCorrectaTexto: opcionCorrecta.texto });
                sala.preguntaActual = null;
                sala.estadoDelJuego = 'lanzando_dado';
                sala.turnosParaPregunta = Math.floor(Math.random() * 3) + 3;
                
                // ✅ CORRECCIÓN: Añadimos un pequeño delay antes de emitir el nuevo estado.
                // Esto da tiempo a que el cliente procese el resultado de la respuesta antes de continuar.
                setTimeout(() => {
                    emitirEstado(salaId);
                }, 1500); // 1.5 segundos de pausa
            });
        },

        cleanup: (socket) => {
           for (const salaId in salasSerpientes) {
                const sala = salasSerpientes[salaId];
                const jugadorIndex = sala.jugadores.findIndex(j => j.socketId === socket.id);

                if (jugadorIndex !== -1) {
                    const jugadorDesc = sala.jugadores[jugadorIndex];
                    sala.log.push(`${jugadorDesc.username} se ha desconectado.`);
                    
                    const eraAnfitrion = jugadorIndex === 0;
                    sala.jugadores.splice(jugadorIndex, 1);
                    
                    if (sala.jugadores.length === 0) {
                        delete salasSerpientes[salaId];
                        return;
                    }

                    if (sala.votacionEnProgreso) {
                        sala.votacionEnProgreso = false; sala.votos = {}; sala.propuestaMateria = null;
                        io.to(salaId).emit('serpientes:votacionCancelada', { motivo: 'Un jugador se desconectó.' });
                    }
                    
                    if (sala.gameStarted && sala.jugadores.length < 2) {
                        sala.ganador = sala.jugadores[0]; // El que queda gana
                        sala.log.push(`FIN: ${sala.ganador.username} gana porque el oponente se desconectó.`);
                    }

                    // Asegura que el turno no quede apuntando a un jugador que no existe
                    if (sala.turnoActual >= sala.jugadores.length) {
                        sala.turnoActual = 0;
                    }
                    emitirEstado(salaId);
                }
            }
        }
    };
};