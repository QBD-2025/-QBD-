module.exports = (base) => {
    const { io, state, pool, seleccionarPalabraAleatoria } = base;
    const MAX_ERRORES = 10;

    function endConfrontationGame(salaId) {
        const room = state.confrontationRooms[salaId];
        if (!room || room.finished) return;
        room.finished = true;

        if (room.timer) clearTimeout(room.timer);

        const p1 = room.gameState.player1;
        const p2 = room.gameState.player2;
        const score1 = (p1.completed ? 100 : 0) - (p1.letrasIncorrectas.length * 10);
        const score2 = (p2.completed ? 100 : 0) - (p2.letrasIncorrectas.length * 10);

        let winner = null;
        if (score1 > score2) winner = p1.id;
        else if (score2 > score1) winner = p2.id;

        io.to(salaId).emit('gameOver', { winner });
        setTimeout(() => delete state.confrontationRooms[salaId], 5000);
    }

    return {
        init: (socket) => {
            socket.on('unirseSala', async ({ salaId, usuario, idMateria }) => {
                try {
                    socket.join(salaId);
                    
                    if (!state.salas[salaId]) {
                        const resultado = await seleccionarPalabraAleatoria(pool, idMateria);
                        if (!resultado || !resultado.palabra) {
                            socket.emit('error', { mensaje: 'Error al obtener palabra de la base de datos' });
                            return;
                        }
                        
                        state.salas[salaId] = {
                            palabraSecreta: resultado.palabra,
                            pista: resultado.pista,
                            letrasCorrectas: [],
                            letrasIncorrectas: [],
                            jugadores: [],
                            idMateria: idMateria
                        };
                    }
                    
                    if (!state.salas[salaId].jugadores.some(j => j.socketId === socket.id)) {
                        state.salas[salaId].jugadores.push({ socketId: socket.id, usuario });
                    }
                    
                    socket.emit('estadoPartida', state.salas[salaId]);
                    socket.to(salaId).emit('nuevoMensaje', {
                        usuario: 'Sistema',
                        mensaje: `${usuario} se ha unido a la sala`
                    });
                } catch (error) {
                    console.error('Error al unirse a sala cooperativa:', error);
                    socket.emit('error', { mensaje: 'Error al unirse a la sala' });
                }
            });

            socket.on('intentarLetra', ({ salaId, letra }) => {
                const sala = state.salas[salaId];
                if (!sala) return;
                
                letra = letra.toUpperCase();

                if (sala.palabraSecreta.includes(letra)) {
                    if (!sala.letrasCorrectas.includes(letra)) sala.letrasCorrectas.push(letra);
                } else {
                    if (!sala.letrasIncorrectas.includes(letra)) sala.letrasIncorrectas.push(letra);
                }

                const palabraCompleta = sala.palabraSecreta.split('').every(l => sala.letrasCorrectas.includes(l));
                const perdieron = sala.letrasIncorrectas.length >= MAX_ERRORES;

                if (palabraCompleta) {
                    io.to(salaId).emit('juegoTerminado', { ganador: true, palabra: sala.palabraSecreta });
                } else if (perdieron) {
                    io.to(salaId).emit('juegoTerminado', { ganador: false, palabra: sala.palabraSecreta });
                } else {
                    io.to(salaId).emit('estadoPartida', sala);
                    
                    // Si ya alcanzaron el máximo de errores después de emitir el estado
                    if (sala.letrasIncorrectas.length >= MAX_ERRORES) {
                        setTimeout(() => {
                            io.to(salaId).emit('juegoTerminado', { ganador: false, palabra: sala.palabraSecreta });
                        }, 100);
                    }
                }
            });

            socket.on('reiniciarJuego', async ({ salaId, idMateria }) => {
                try {
                    const sala = state.salas[salaId];
                    if (!sala) return;
                    
                    const { palabra, pista } = await seleccionarPalabraAleatoria(pool, idMateria);
                    sala.palabraSecreta = palabra;
                    sala.pista = pista;
                    sala.letrasCorrectas = [];
                    sala.letrasIncorrectas = [];
                    sala.idMateria = idMateria;
                    
                    io.to(salaId).emit('estadoPartida', sala);
                } catch (error) {
                    console.error('Error al reiniciar juego:', error);
                }
            });

            socket.on('joinConfrontation', ({ salaId, usuario, userId }) => {
                socket.join(salaId);

                if (!state.confrontationRooms[salaId]) {
                    state.confrontationRooms[salaId] = { 
                        players: [], 
                        started: false, 
                        categoryProposal: null,
                        finished: false
                    };
                }
                const room = state.confrontationRooms[salaId];

                const playerExists = room.players.some(p => p.userId === userId);
                if (!playerExists && room.players.length < 2) {
                    room.players.push({ socketId: socket.id, userId, username: usuario });
                }

                if (room.players.length === 1) {
                    io.to(socket.id).emit('enfrentamiento:esperandoOponente');
                }
                if (room.players.length === 2) {
                    const proposer = room.players[0];
                    const voter = room.players[1];

                    io.to(proposer.socketId).emit('enfrentamiento:iniciarVotacion');
                    io.to(voter.socketId).emit('enfrentamiento:nuevaPropuesta', {
                        proponente: 'Oponente',
                        textoMateria: 'Esperando propuesta...'
                    });
                }
            });

            socket.on('enfrentamiento:proponerCategoria', ({ salaId, idMateria, textoMateria }) => {
                const room = state.confrontationRooms[salaId];
                if (!room || room.players.length < 2) return;
                
                const proponente = room.players.find(p => p.socketId === socket.id);
                if (!proponente) return;
                
                room.categoryProposal = { idMateria, textoMateria };
                io.to(salaId).emit('enfrentamiento:nuevaPropuesta', {
                    proponente: proponente.username,
                    textoMateria: textoMateria
                });
            });

            socket.on('enfrentamiento:votarCategoria', async ({ salaId, voto }) => {
                const room = state.confrontationRooms[salaId];
                if (!room || !room.categoryProposal || room.players.length < 2) return;

                if (voto === 'aceptado') {
                    room.started = true;
                    const idMateria = room.categoryProposal.idMateria;

                    try {
                        const [p1, p2] = await Promise.all([
                            seleccionarPalabraAleatoria(pool, idMateria),
                            seleccionarPalabraAleatoria(pool, idMateria)
                        ]);

                        room.gameState = {
                            gameTime: 120,
                            player1: {
                                id: room.players[0].userId,
                                username: room.players[0].username,
                                palabraSecreta: p1.palabra,
                                pista: p1.pista,
                                letrasCorrectas: [],
                                letrasIncorrectas: [],
                                completed: false
                            },
                            player2: {
                                id: room.players[1].userId,
                                username: room.players[1].username,
                                palabraSecreta: p2.palabra,
                                pista: p2.pista,
                                letrasCorrectas: [],
                                letrasIncorrectas: [],
                                completed: false
                            }
                        };

                        room.timer = setTimeout(() => {
                            endConfrontationGame(salaId);
                        }, room.gameState.gameTime * 1000 + 1000);

                        io.to(salaId).emit('confrontationUpdate', {
                            gameState: room.gameState,
                            gameStarted: true
                        });
                    } catch (error) {
                        console.error('Error al iniciar juego de enfrentamiento:', error);
                        io.to(salaId).emit('error', { mensaje: 'Error al iniciar el juego' });
                    }

                } else {
                    const votante = room.players.find(p => p.socketId === socket.id);
                    io.to(salaId).emit('enfrentamiento:propuestaRechazada', {
                        votante: votante ? votante.username : 'El oponente'
                    });

                    room.categoryProposal = null;
                    io.to(room.players[0].socketId).emit('enfrentamiento:iniciarVotacion');
                    io.to(room.players[1].socketId).emit('enfrentamiento:nuevaPropuesta', {
                        proponente: 'Oponente',
                        textoMateria: 'Esperando propuesta...'
                    });
                }
            });

            socket.on('enfrentamiento:intentarLetra', ({ salaId, letra }) => {
                const room = state.confrontationRooms[salaId];
                if (!room || !room.gameState || !room.started) return;

                const playerSocket = room.players.find(p => p.socketId === socket.id);
                if (!playerSocket) return;

                const gameState = room.gameState;
                const playerState = (gameState.player1.id === playerSocket.userId)
                    ? gameState.player1
                    : gameState.player2;

                letra = letra.toUpperCase();
                
                if (playerState.letrasCorrectas.includes(letra) || playerState.letrasIncorrectas.includes(letra)) {
                    return;
                }

                if (playerState.palabraSecreta.includes(letra)) {
                    playerState.letrasCorrectas.push(letra);
                } else {
                    playerState.letrasIncorrectas.push(letra);
                }

                const palabraCompleta = playerState.palabraSecreta.split('').every(l => playerState.letrasCorrectas.includes(l));
                if (palabraCompleta) {
                    playerState.completed = true;
                }

                const p1 = gameState.player1;
                const p2 = gameState.player2;
                const p1Termino = p1.completed || p1.letrasIncorrectas.length >= MAX_ERRORES;
                const p2Termino = p2.completed || p2.letrasIncorrectas.length >= MAX_ERRORES;

                // Emitir actualización primero para que se vea el último dibujo
                io.to(salaId).emit('confrontationUpdate', {
                    gameState: gameState,
                    gameStarted: true
                });

                // Si ambos terminaron, finalizar el juego
                if (p1Termino && p2Termino) {
                    setTimeout(() => {
                        endConfrontationGame(salaId);
                    }, 100);
                }
            });
        },

        cleanup: (socket) => {
            for (let salaId in state.salas) {
                const sala = state.salas[salaId];
                if (sala.jugadores && sala.jugadores.some(j => j.socketId === socket.id)) {
                    socket.to(salaId).emit('jugadorDesconectado', { socketId: socket.id });
                    sala.jugadores = sala.jugadores.filter(j => j.socketId !== socket.id);
                    if (sala.jugadores.length === 0) {
                        delete state.salas[salaId];
                    }
                }
            }

            for (let salaId in state.confrontationRooms) {
                const room = state.confrontationRooms[salaId];
                if (!room) continue;
                
                const playerIndex = room.players.findIndex(p => p.socketId === socket.id);

                if (playerIndex !== -1) {
                    const winner = room.players[playerIndex === 0 ? 1 : 0]?.userId;
                    if(winner && !room.finished) {
                        io.to(salaId).emit('gameOver', { 
                            winner, 
                            message: "Tu oponente se ha desconectado." 
                        });
                    }
                    
                    if (room.timer) clearTimeout(room.timer);
                    delete state.confrontationRooms[salaId];
                }
            }
        }
    };
};