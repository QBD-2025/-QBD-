// En: src/sockets/serpientes.js
module.exports = (base) => {
    const { io, state, config } = base;

    // Función para emitir el estado actualizado a la sala
    const emitirEstado = (salaId) => {
        if (state.salasSerpientes[salaId]) {
            io.to(salaId).emit('serpientes:estado', state.salasSerpientes[salaId]);
        }
    };

    // === NUEVA FUNCIÓN PARA REINICIAR EL JUEGO ===
    // Esta función resetea la sala a su estado inicial, pero manteniendo a los jugadores.
    const reiniciarJuego = (salaId) => {
        const sala = state.salasSerpientes[salaId];
        if (!sala) return;

        sala.jugadores.forEach(jugador => {
            jugador.posicion = 1;
        });

        sala.turnoActual = 0;
        sala.dado = 0;
        sala.ganador = null;
        sala.gameStarted = true; // El juego continúa, solo se reinicia
        sala.votacionEnProgreso = false;
        sala.tipoVotacion = null;
        sala.votos = {};
        sala.log.push('¡La partida ha sido reiniciada por votación!');
        
        emitirEstado(salaId);
    };


    return {
        init: (socket) => {
            socket.on('serpientes:unirse', ({ salaId, usuario }) => {
                socket.join(salaId);

                if (!state.salasSerpientes[salaId]) {
                    state.salasSerpientes[salaId] = {
                        jugadores: [],
                        turnoActual: 0,
                        dado: 0,
                        ganador: null,
                        gameStarted: false,
                        votacionEnProgreso: false,
                        tipoVotacion: null, // Para saber si es de 'inicio' o 'reinicio'
                        votos: {},
                        log: [],
                        config: config.serpientes
                    };
                }

                const sala = state.salasSerpientes[salaId];
                
                // Si el juego ya empezó Y NO HAY UN GANADOR, no dejamos entrar a nadie más
                if (sala.gameStarted && !sala.ganador) {
                    socket.emit('serpientes:error', { mensaje: 'Esta partida ya ha comenzado.' });
                    return;
                }

                if (sala.jugadores.length >= 4 && !sala.jugadores.some(p => p.id === usuario.id_usuario)) {
                    socket.emit('serpientes:error', { mensaje: 'La sala está llena.' });
                    return;
                }

                if (!sala.jugadores.some(p => p.id === usuario.id_usuario)) {
                    sala.jugadores.push({
                        id: usuario.id_usuario,
                        socketId: socket.id,
                        username: usuario.username,
                        posicion: 1
                    });
                }
                
                sala.log.push(`${usuario.username} se ha unido a la partida.`);
                emitirEstado(salaId);
            });
            
            socket.on('serpientes:proponerInicio', ({ salaId }) => {
                const sala = state.salasSerpientes[salaId];
                const jugadorProponente = sala?.jugadores.find(j => j.socketId === socket.id);

                if (!sala || !jugadorProponente || sala.gameStarted || sala.votacionEnProgreso) return;
                if (sala.jugadores[0].id !== jugadorProponente.id) return;
                if (sala.jugadores.length < 2) return;

                sala.votacionEnProgreso = true;
                sala.tipoVotacion = 'inicio'; // Especificamos el tipo
                sala.votos = {};
                
                io.to(salaId).emit('serpientes:votacionInicio', { proponente: jugadorProponente.username });
            });

            // === CAMBIO CLAVE 1: LÓGICA DE REINICIO AÑADIDA ===
            socket.on('serpientes:proponerReinicio', ({ salaId }) => {
                const sala = state.salasSerpientes[salaId];
                const jugadorProponente = sala?.jugadores.find(j => j.socketId === socket.id);
                
                // Se puede proponer reinicio si el juego ha empezado y no hay otra votación
                if (!sala || !jugadorProponente || !sala.gameStarted || sala.votacionEnProgreso) return;

                sala.votacionEnProgreso = true;
                sala.tipoVotacion = 'reinicio'; // Especificamos el tipo
                sala.votos = {};
                
                // El frontend escuchará este evento
                io.to(salaId).emit('serpientes:votacionReinicio', { proponente: jugadorProponente.username });
            });

            // === CAMBIO CLAVE 2: MANEJO DE VOTOS MEJORADO ===
            socket.on('serpientes:votar', ({ salaId, voto, tipoVotacion }) => {
                const sala = state.salasSerpientes[salaId];
                const jugadorVotante = sala?.jugadores.find(j => j.socketId === socket.id);

                // La votación debe estar activa y ser del tipo correcto
                if (!sala || !jugadorVotante || !sala.votacionEnProgreso || sala.tipoVotacion !== tipoVotacion || sala.votos[jugadorVotante.id] !== undefined) {
                    return;
                }

                sala.votos[jugadorVotante.id] = voto;
                
                if (Object.keys(sala.votos).length === sala.jugadores.length) {
                    sala.votacionEnProgreso = false;
                    const todosVotaronSi = Object.values(sala.votos).every(v => v === true);

                    if (todosVotaronSi) {
                        // AQUÍ ESTÁ LA MAGIA: decidimos qué hacer según el tipo de votación
                        if (sala.tipoVotacion === 'inicio') {
                            sala.gameStarted = true;
                            sala.log.push('¡Todos los jugadores están listos! El juego comienza.');
                            emitirEstado(salaId);
                        } else if (sala.tipoVotacion === 'reinicio') {
                            reiniciarJuego(salaId); // Llamamos a la nueva función de reinicio
                        }
                    } else {
                        sala.votos = {};
                        sala.tipoVotacion = null;
                        io.to(salaId).emit('serpientes:votacionCancelada', { motivo: 'Alguien votó que no.' });
                    }
                }
            });

            socket.on('serpientes:lanzarDado', ({ salaId, userId }) => {
                // ... (El resto de esta función no necesita cambios, está bien como la tenías)
                const sala = state.salasSerpientes[salaId];
                if (!sala || sala.ganador || !sala.gameStarted) return;
                const jugadorActual = sala.jugadores[sala.turnoActual];
                if (jugadorActual.id !== userId) return;
                
                const valorDado = Math.floor(Math.random() * 6) + 1;
                sala.dado = valorDado;
                sala.log.push(`${jugadorActual.username} ha sacado un ${valorDado}.`);

                // Emitir el valor del dado INMEDIATAMENTE para que el frontend pueda animarlo.
                io.to(salaId).emit('serpientes:dado', { jugador: jugadorActual.username, valor: valorDado });

                // Esperar un poco para que la animación se vea antes de mover la ficha
                setTimeout(() => {
                    let posicionPotencial = jugadorActual.posicion + valorDado;
                    if (posicionPotencial > sala.config.winPosition) {
                        posicionPotencial = sala.config.winPosition - (posicionPotencial - sala.config.winPosition);
                    }
                    jugadorActual.posicion = posicionPotencial;

                    const especial = sala.config.snakesAndLadders[jugadorActual.posicion];
                    if (especial) {
                        const tipo = especial > jugadorActual.posicion ? 'escalera' : 'serpiente';
                        sala.log.push(`¡${jugadorActual.username} encontró una ${tipo}!`);
                        jugadorActual.posicion = especial;
                    }
                    
                    if (jugadorActual.posicion === sala.config.winPosition) {
                        sala.ganador = jugadorActual;
                        sala.log.push(`🎉 ¡${jugadorActual.username} ha ganado la partida! 🎉`);
                    } else {
                        if (valorDado !== 6) {
                            sala.turnoActual = (sala.turnoActual + 1) % sala.jugadores.length;
                        } else {
                            sala.log.push(`${jugadorActual.username} saca de nuevo por obtener un 6.`);
                        }
                    }
                    
                    emitirEstado(salaId);
                }, 1200); // 1.2 segundos, un poco más que la animación del dado.
            });
            
            // Eliminé el 'proponerReinicio' que tenías duplicado. Ya está arriba con su lógica completa.
        },

        cleanup: (socket) => {
           // ... (Tu función de cleanup está bien, sin cambios)
           for (const salaId in state.salasSerpientes) {
                const sala = state.salasSerpientes[salaId];
                const jugadorIndex = sala.jugadores.findIndex(j => j.socketId === socket.id);

                if (jugadorIndex !== -1) {
                    const jugadorDesconectado = sala.jugadores[jugadorIndex];
                    sala.log.push(`${jugadorDesconectado.username} se ha desconectado.`);
                    
                    sala.jugadores.splice(jugadorIndex, 1);
                    
                    if (sala.jugadores.length === 0) {
                        delete state.salasSerpientes[salaId];
                        console.log(`Sala ${salaId} de Serpientes eliminada por estar vacía.`);
                        return;
                    }
                    if (sala.votacionEnProgreso) {
                        sala.votacionEnProgreso = false;
                        sala.votos = {};
                        io.to(salaId).emit('serpientes:votacionCancelada', { motivo: 'Un jugador se desconectó.' });
                    }
                    if (sala.turnoActual === jugadorIndex) {
                        sala.turnoActual = sala.turnoActual % sala.jugadores.length;
                    }
                    emitirEstado(salaId);
                }
            }
        }
    };
};