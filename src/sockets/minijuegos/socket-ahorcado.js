module.exports = (base) => {
    const { io, state, pool, seleccionarPalabraAleatoria } = base;
    const MAX_ERRORES = 10;

    // =========================================================================
    // ▼▼▼ LA FUNCIÓN PARA TERMINAR EL JUEGO AHORA VIVE AQUÍ DENTRO ▼▼▼
    // Al estar aquí, tiene acceso automático a 'state' e 'io' sin
    // necesidad de pasarlos como argumentos.
    // =========================================================================
    function endConfrontationGame(salaId) {
        const room = state.confrontationRooms[salaId];
        // Evita que el juego termine dos veces (por tiempo y por jugadas)
        if (!room || room.finished) {
            return;
        }
        room.finished = true; // Marcamos la sala como finalizada

        // Limpiamos el temporizador del servidor para que no se ejecute si el juego ya acabó
        if (room.timer) {
            clearTimeout(room.timer);
        }

        const p1 = room.gameState.player1;
        const p2 = room.gameState.player2;

        // Lógica de puntuación: 100 si completaste la palabra, -10 por cada error.
        const score1 = (p1.completed ? 100 : 0) - (p1.letrasIncorrectas.length * 10);
        const score2 = (p2.completed ? 100 : 0) - (p2.letrasIncorrectas.length * 10);

        let winner = null;
        if (score1 > score2) {
            winner = p1.id;
        } else if (score2 > score1) {
            winner = p2.id;
        } // Si son iguales, winner se queda como null (empate)

        console.log(`Partida terminada en sala ${salaId}. P1: ${score1}, P2: ${score2}. Ganador: ${winner || 'Empate'}`);

        // Enviamos el resultado final a los clientes
        io.to(salaId).emit('gameOver', { winner });

        // Eliminamos la sala de la memoria después de un momento
        setTimeout(() => {
            delete state.confrontationRooms[salaId];
        }, 5000); // 5 segundos de gracia
    }
    // =========================================================================
    // ▲▲▲ LA FUNCIÓN CORREGIDA TERMINA AQUÍ ▲▲▲
    // =========================================================================

    return {
        init: (socket) => {
            // --- LÓGICA MODO COOPERATIVO ---
            socket.on('unirseSala', async ({ salaId, usuario, idMateria }) => {
                socket.join(salaId);
                if (!state.salas[salaId]) {
                    const { palabra, pista } = await seleccionarPalabraAleatoria(pool, idMateria);
                    state.salas[salaId] = {
                        palabraSecreta: palabra,
                        pista: pista,
                        letrasCorrectas: [],
                        letrasIncorrectas: [],
                        jugadores: [],
                        idMateria: idMateria
                    };
                }
                io.to(salaId).emit('estadoPartida', state.salas[salaId]);
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
                }
            });

            socket.on('reiniciarJuego', async ({ salaId, idMateria }) => {
                const sala = state.salas[salaId];
                if (!sala) return;
                const { palabra, pista } = await seleccionarPalabraAleatoria(pool, idMateria);
                sala.palabraSecreta = palabra;
                sala.pista = pista;
                sala.letrasCorrectas = [];
                sala.letrasIncorrectas = [];
                io.to(salaId).emit('estadoPartida', sala);
            });

            // --- LÓGICA MODO ENFRENTAMIENTO ---
            socket.on('joinConfrontation', ({ salaId, usuario, userId }) => {
                socket.join(salaId);

                if (!state.confrontationRooms[salaId]) {
                    state.confrontationRooms[salaId] = { players: [], started: false, categoryProposal: null };
                    console.log(`Sala de enfrentamiento ${salaId} creada.`);
                }
                const room = state.confrontationRooms[salaId];

                const playerExists = room.players.some(p => p.userId === userId);
                if (!playerExists && room.players.length < 2) {
                    room.players.push({ socketId: socket.id, userId, username: usuario });
                    console.log(`Jugador ${usuario} se unió a ${salaId}. Jugadores: ${room.players.length}`);
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
                if (!room || room.players.length < 2) {
                    console.log(`Error: Sala ${salaId} no encontrada o sin suficientes jugadores.`);
                    return;
                }
                const proponente = room.players.find(p => p.socketId === socket.id);
                if (!proponente) return;
                room.categoryProposal = { idMateria, textoMateria };
                console.log(`Jugador "${proponente.username}" propuso la materia: "${textoMateria}" en la sala ${salaId}`);
                io.to(salaId).emit('enfrentamiento:nuevaPropuesta', {
                    proponente: proponente.username,
                    textoMateria: textoMateria
                });
            });

            socket.on('enfrentamiento:votarCategoria', async ({ salaId, voto }) => {
                const room = state.confrontationRooms[salaId];
                if (!room || !room.categoryProposal || room.players.length < 2) {
                    return console.log("Error: No se puede votar en esta sala.");
                }

                if (voto === 'aceptado') {
                    console.log(`Propuesta aceptada en la sala ${salaId}. Iniciando juego.`);
                    room.started = true;
                    const idMateria = room.categoryProposal.idMateria;

                    const [p1, p2] = await Promise.all([
                        seleccionarPalabraAleatoria(pool, idMateria),
                        seleccionarPalabraAleatoria(pool, idMateria)
                    ]);

                    room.gameState = {
                        gameTime: 120, // 2 minutos en segundos
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

                    // Esta llamada ahora funcionará porque endConfrontationGame está en el mismo "scope"
                    room.timer = setTimeout(() => {
                        console.log(`Tiempo agotado para la sala ${salaId}.`);
                        endConfrontationGame(salaId);
                    }, room.gameState.gameTime * 1000 + 1000);

                    io.to(salaId).emit('confrontationUpdate', {
                        gameState: room.gameState,
                        gameStarted: true
                    });

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
                if (!room || !room.gameState || !room.started) {
                    return;
                }

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

                if (p1Termino && p2Termino) {
                    endConfrontationGame(salaId); // Esta llamada también es correcta ahora
                } else {
                    io.to(salaId).emit('confrontationUpdate', {
                        gameState: gameState,
                        gameStarted: true
                    });
                }
            });
        },

        cleanup: (socket) => {
            for (let salaId in state.salas) {
                if (state.salas[salaId].jugadores.some(j => j.socketId === socket.id)) {
                    socket.to(salaId).emit('jugadorDesconectado', { socketId: socket.id });
                    delete state.salas[salaId];
                }
            }

            for (let salaId in state.confrontationRooms) {
                const room = state.confrontationRooms[salaId];
                if (!room) continue; // Si la sala ya fue eliminada, saltar
                const playerIndex = room.players.findIndex(p => p.socketId === socket.id);

                if (playerIndex !== -1) {
                    // Si un jugador se desconecta, el otro gana automáticamente
                    const winner = room.players[playerIndex === 0 ? 1 : 0]?.userId;
                    if(winner) {
                        io.to(salaId).emit('gameOver', { winner, message: "Tu oponente se ha desconectado." });
                    }
                    
                    if (room.timer) clearTimeout(room.timer);
                    delete state.confrontationRooms[salaId];
                }
            }
        }
    };
};