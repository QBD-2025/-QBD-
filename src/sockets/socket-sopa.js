const { seleccionarPalabraAleatoria } = require('../sockets/sopa-helper.js');

module.exports = (base) => {
    const { io, pool, state } = base;

    const MAX_ERRORES = 4;
    let salas = {}; // Cooperativo
    let confrontationRooms = {}; // Enfrentamiento
    let salasSopaLetras = {}; // Sopa de letras

    const configSopaLetras = {
        ROWS: 10,
        COLS: 10,
        ALPHABET: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
        MAX_ERRORS: MAX_ERRORES
    };

    // ======================================================
    // Función para terminar enfrentamiento
    // ======================================================
    function endConfrontationGame(salaId) {
        const room = confrontationRooms[salaId];
        if (!room || !room.gameState) return;
        if (room.timer) clearTimeout(room.timer);

        const p1 = room.gameState.player1;
        const p2 = room.gameState.player2;

        const score1 = (p1.completed ? 100 : 0) - p1.letrasIncorrectas.length * 10;
        const score2 = (p2.completed ? 100 : 0) - p2.letrasIncorrectas.length * 10;

        let winner = null;
        if (score1 > score2) winner = p1.id;
        else if (score2 > score1) winner = p2.id;

        io.to(salaId).emit('gameOver', { winner });
        delete confrontationRooms[salaId];
    }

    // ======================================================
    // Funciones auxiliares Sopa de Letras
    // ======================================================
    const directions = [
        { dr: 0, dc: 1 },
        { dr: 1, dc: 0 },
        { dr: 1, dc: 1 },
        { dr: 1, dc: -1 }
    ];

    function generarTableroSopa(palabras) {
        const grid = Array.from({ length: configSopaLetras.ROWS }, () =>
            Array(configSopaLetras.COLS).fill("")
        );

        palabras.forEach(({ word }) => {
            for (let t = 0; t < 300; t++) {
                const { dr, dc } = directions[Math.floor(Math.random() * directions.length)];
                const startR = Math.floor(Math.random() * configSopaLetras.ROWS);
                const startC = Math.floor(Math.random() * configSopaLetras.COLS);

                if (canPlaceWord(grid, word, startR, startC, dr, dc)) {
                    for (let i = 0; i < word.length; i++) {
                        grid[startR + dr * i][startC + dc * i] = word[i];
                    }
                    break;
                }
            }
        });

        // Rellenar vacíos
        for (let r = 0; r < configSopaLetras.ROWS; r++) {
            for (let c = 0; c < configSopaLetras.COLS; c++) {
                if (grid[r][c] === "") {
                    grid[r][c] = configSopaLetras.ALPHABET[
                        Math.floor(Math.random() * configSopaLetras.ALPHABET.length)
                    ];
                }
            }
        }

        return grid;
    }

    function canPlaceWord(grid, word, r, c, dr, dc) {
        for (let i = 0; i < word.length; i++) {
            const rr = r + dr * i;
            const cc = c + dc * i;
            if (rr < 0 || cc < 0 || rr >= configSopaLetras.ROWS || cc >= configSopaLetras.COLS) return false;
            if (grid[rr][cc] !== "" && grid[rr][cc] !== word[i]) return false;
        }
        return true;
    }

    function verificarSeleccion(tablero, seleccion, palabra) {
        const letrasSeleccionadas = seleccion.map(({ r, c }) => tablero[r][c]);
        return letrasSeleccionadas.join('') === palabra;
    }

    // ======================================================
    // Exportar init y cleanup
    // ======================================================
    return {
        init: (socket) => {
            console.log('Jugador conectado (Sopa)', socket.id);

            // ----------------------
            // Cooperativo (Ahorcado)
            // ----------------------
            socket.on('unirseSala', async ({ salaId, usuario, idMateria }) => {
                socket.join(salaId);

                if (!salas[salaId]) {
                    const { palabra, pista } = await seleccionarPalabraAleatoria(pool, idMateria);
                    salas[salaId] = {
                        palabraSecreta: palabra,
                        pista,
                        letrasCorrectas: [],
                        letrasIncorrectas: [],
                        jugadores: [],
                        idMateria
                    };
                }

                if (!salas[salaId].jugadores.some(j => j.socketId === socket.id)) {
                    salas[salaId].jugadores.push({ socketId: socket.id, username: usuario });
                }

                io.to(salaId).emit('estadoPartida', salas[salaId]);
            });

            socket.on('intentarLetra', ({ salaId, letra }) => {
                const sala = salas[salaId];
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
                const sala = salas[salaId];
                if (!sala) return;
                const { palabra, pista } = await seleccionarPalabraAleatoria(pool, idMateria);
                sala.palabraSecreta = palabra;
                sala.pista = pista;
                sala.letrasCorrectas = [];
                sala.letrasIncorrectas = [];
                io.to(salaId).emit('estadoPartida', sala);
            });

            // ----------------------
            // Enfrentamiento (Ahorcado)
            // ----------------------
            socket.on('joinConfrontation', ({ salaId, usuario, userId }) => {
                socket.join(salaId);

                if (!confrontationRooms[salaId]) {
                    confrontationRooms[salaId] = { players: [], started: false, categoryProposal: null };
                }
                const room = confrontationRooms[salaId];

                if (!room.players.some(p => p.userId === userId) && room.players.length < 2) {
                    room.players.push({ socketId: socket.id, userId, username: usuario });
                }

                if (room.players.length === 2 && !room.started) {
                    const p1 = room.players[0];
                    const p2 = room.players[1];

                    room.started = true;

                    // Seleccionar palabras
                    Promise.all([seleccionarPalabraAleatoria(pool, 1), seleccionarPalabraAleatoria(pool, 1)])
                        .then(([pal1, pal2]) => {
                            room.gameState = {
                                gameTime: 120,
                                player1: { id: p1.userId, username: p1.username, palabraSecreta: pal1.palabra, pista: pal1.pista, letrasCorrectas: [], letrasIncorrectas: [], completed: false },
                                player2: { id: p2.userId, username: p2.username, palabraSecreta: pal2.palabra, pista: pal2.pista, letrasCorrectas: [], letrasIncorrectas: [], completed: false }
                            };

                            room.timer = setTimeout(() => endConfrontationGame(salaId), room.gameState.gameTime * 1000);

                            io.to(salaId).emit('confrontationUpdate', { gameState: room.gameState, gameStarted: true });
                        });
                }
            });

            socket.on('enfrentamiento:intentarLetra', ({ salaId, letra }) => {
                const room = confrontationRooms[salaId];
                if (!room || !room.gameState) return;

                const player = room.players.find(p => p.socketId === socket.id);
                if (!player) return;

                const gameState = room.gameState;
                const playerState = gameState.player1.id === player.userId ? gameState.player1 : gameState.player2;

                letra = letra.toUpperCase();
                if (!playerState.letrasCorrectas.includes(letra) && !playerState.letrasIncorrectas.includes(letra)) {
                    if (playerState.palabraSecreta.includes(letra)) playerState.letrasCorrectas.push(letra);
                    else playerState.letrasIncorrectas.push(letra);
                }

                if (playerState.palabraSecreta.split('').every(l => playerState.letrasCorrectas.includes(l))) {
                    playerState.completed = true;
                }

                const p1Termino = gameState.player1.completed || gameState.player1.letrasIncorrectas.length >= MAX_ERRORES;
                const p2Termino = gameState.player2.completed || gameState.player2.letrasIncorrectas.length >= MAX_ERRORES;

                if (p1Termino && p2Termino) endConfrontationGame(salaId);
                else io.to(salaId).emit('confrontationUpdate', { gameState, gameStarted: true });
            });

            // ----------------------
            // Sopa de Letras
            // ----------------------
            socket.on('sopa:unirse', async ({ salaId, usuario, idMateria }) => {
                socket.join(salaId);

                if (!salasSopaLetras[salaId]) {
                    const [palabras] = await pool.query(
                        "SELECT palabra, pista FROM palabras WHERE id_materia = ? ORDER BY RAND() LIMIT 5",
                        [idMateria]
                    );

                    if (palabras.length === 0) return socket.emit('sopa:error', { message: "No hay palabras" });

                    const palabrasFormateadas = palabras.map(p => ({ word: p.palabra.toUpperCase(), hint: p.pista }));
                    const tablero = generarTableroSopa(palabrasFormateadas);

                    salasSopaLetras[salaId] = {
                        tablero,
                        palabras: palabrasFormateadas,
                        palabrasEncontradas: [],
                        jugadores: [],
                        errores: 0,
                        idMateria
                    };
                }

                if (!salasSopaLetras[salaId].jugadores.some(j => j.id === usuario.id_usuario)) {
                    salasSopaLetras[salaId].jugadores.push({ id: usuario.id_usuario, username: usuario.username });
                }

                io.to(salaId).emit('sopa:estado', salasSopaLetras[salaId]);
            });

            socket.on('sopa:seleccion', ({ salaId, usuario, seleccion }) => {
                const sala = salasSopaLetras[salaId];
                if (!sala) return;

                const palabraEncontrada = sala.palabras.find(p =>
                    !sala.palabrasEncontradas.includes(p.word) &&
                    verificarSeleccion(sala.tablero, seleccion, p.word)
                );

                if (palabraEncontrada) {
                    sala.palabrasEncontradas.push(palabraEncontrada.word);
                    if (sala.palabrasEncontradas.length === sala.palabras.length)
                        io.to(salaId).emit('sopa:fin', { ganador: true, usuario });
                    else io.to(salaId).emit('sopa:palabraEncontrada', { palabra: palabraEncontrada.word, usuario, tablero: sala.tablero, palabrasEncontradas: sala.palabrasEncontradas });
                } else {
                    sala.errores++;
                    if (sala.errores >= configSopaLetras.MAX_ERRORS)
                        io.to(salaId).emit('sopa:fin', { ganador: false });
                    else io.to(salaId).emit('sopa:errorSeleccion', { usuario, erroresRestantes: configSopaLetras.MAX_ERRORS - sala.errores });
                }
            });

            socket.on('sopa:reiniciar', async ({ salaId, idMateria }) => {
                if (!salasSopaLetras[salaId]) return;

                const [palabras] = await pool.query(
                    "SELECT palabra, pista FROM palabras WHERE id_materia = ? ORDER BY RAND() LIMIT 5",
                    [idMateria]
                );

                const palabrasFormateadas = palabras.map(p => ({ word: p.palabra.toUpperCase(), hint: p.pista }));
                salasSopaLetras[salaId] = {
                    tablero: generarTableroSopa(palabrasFormateadas),
                    palabras: palabrasFormateadas,
                    palabrasEncontradas: [],
                    jugadores: salasSopaLetras[salaId].jugadores,
                    errores: 0,
                    idMateria
                };

                io.to(salaId).emit('sopa:estado', salasSopaLetras[salaId]);
            });
        },

        cleanup: (socket) => {
            // Quitar jugador de salas cooperativo
            for (let salaId in salas) {
                salas[salaId].jugadores = salas[salaId].jugadores.filter(j => j.socketId !== socket.id);
                if (salas[salaId].jugadores.length === 0) delete salas[salaId];
            }

            // Quitar jugador de salas de sopa
            for (let salaId in salasSopaLetras) {
                salasSopaLetras[salaId].jugadores = salasSopaLetras[salaId].jugadores.filter(j => j.socketId !== socket.id && j.id !== socket.id);
                if (salasSopaLetras[salaId].jugadores.length === 0) delete salasSopaLetras[salaId];
            }

            // Quitar jugador de enfrentamiento
            for (let salaId in confrontationRooms) {
                const room = confrontationRooms[salaId];
                room.players = room.players.filter(p => p.socketId !== socket.id);
                if (room.players.length === 0) delete confrontationRooms[salaId];
            }
        }
    };
};
