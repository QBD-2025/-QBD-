const { seleccionarPalabraAleatoria } = require('./socket-helpers');

module.exports = (io, pool) => {
    let salas = {};
    let confrontationRooms = {};
    let salasSerpientes = {}; 
    let salasSopaLetras = {}; // Nuevo: Para manejar salas de sopa de letras

    const configSerpientes = {
        winPosition: 100,
        snakesAndLadders: {
            98: 78, 95: 75, 73: 53, 55: 35, 44: 24, 30: 10, 92: 62, 64: 34, 48: 18, 36: 6, 25: 5,
            2: 22, 7: 27, 15: 35, 28: 48, 51: 71, 60: 80, 5: 35, 12: 42, 21: 51, 37: 67, 45: 75, 68: 98
        }
    };

    // Configuración para Sopa de Letras
    const configSopaLetras = {
        ROWS: 10,
        COLS: 10,
        ALPHABET: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
        MAX_ERRORS: 4
    };

    function endConfrontationGame(salaId) {
        const room = confrontationRooms[salaId];
        if (!room || !room.gameState) return;
        if (room.timer) clearInterval(room.timer);

        const p1 = room.gameState.player1;
        const p2 = room.gameState.player2;
        
        const score1 = (p1.completed ? 100 : 0) - p1.letrasIncorrectas.length;
        const score2 = (p2.completed ? 100 : 0) - p2.letrasIncorrectas.length;

        let winner = null;
        if (score1 > score2) winner = p1.id;
        else if (score2 > score1) winner = p2.id;
        
        io.to(salaId).emit('gameOver', { winner });
        delete confrontationRooms[salaId];
    }

    // Funciones para Sopa de Letras
    function generarTableroSopa(palabras) {
        const grid = Array.from({length: configSopaLetras.ROWS}, () => 
            Array(configSopaLetras.COLS).fill(""));
        
        // Intentar colocar cada palabra
        palabras.forEach(({word}) => {
            const tries = 300;
            for (let t = 0; t < tries; t++) {
                const {dr, dc} = directions[Math.floor(Math.random() * directions.length)];
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

        // Rellenar espacios vacíos
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
            if (rr < 0 || cc < 0 || rr >= configSopaLetras.ROWS || cc >= configSopaLetras.COLS) {
                return false;
            }
            if (grid[rr][cc] !== "" && grid[rr][cc] !== word[i]) {
                return false;
            }
        }
        return true;
    }

    const directions = [
        { dr: 0, dc: 1 },   // Horizontal →
        { dr: 1, dc: 0 },    // Vertical ↓
        { dr: 1, dc: 1 },    // Diagonal ↘
        { dr: 1, dc: -1 }    // Diagonal ↙
    ];

    io.on('connection', (socket) => {
        console.log('Jugador conectado', socket.id);

        // --- LÓGICA MODO COOPERATIVO (AHORCADO) ---
        socket.on('unirseSala', async ({ salaId, usuario, idMateria }) => {
            socket.join(salaId);
            if (!salas[salaId]) {
                const { palabra, pista } = await seleccionarPalabraAleatoria(pool, idMateria);
                salas[salaId] = {
                    palabraSecreta: palabra,
                    pista: pista,
                    letrasCorrectas: [],
                    letrasIncorrectas: [],
                    jugadores: [],
                    idMateria: idMateria 
                };
            }
            io.to(salaId).emit('estadoPartida', salas[salaId]);
        });

        // [Mantener todas las funciones existentes de ahorcado...]

        // --- LÓGICA SOPA DE LETRAS ---
        socket.on('sopa:unirse', async ({ salaId, usuario, idMateria }) => {
            socket.join(salaId);

            if (!salasSopaLetras[salaId]) {
                // Obtener palabras de la categoría seleccionada
                const [palabras] = await pool.query(
                    "SELECT palabra, pista FROM palabras WHERE id_materia = ? ORDER BY RAND() LIMIT 5",
                    [idMateria]
                );

                if (palabras.length === 0) {
                    socket.emit('sopa:error', { message: "No hay palabras para esta categoría" });
                    return;
                }

                const palabrasFormateadas = palabras.map(p => ({
                    word: p.palabra.toUpperCase(),
                    hint: p.pista
                }));

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

            // Añadir jugador si no existe
            if (!salasSopaLetras[salaId].jugadores.some(j => j.id === usuario.id_usuario)) {
                salasSopaLetras[salaId].jugadores.push({
                    id: usuario.id_usuario,
                    username: usuario.username
                });
            }

            io.to(salaId).emit('sopa:estado', salasSopaLetras[salaId]);
        });

        socket.on('sopa:seleccion', ({ salaId, usuario, seleccion }) => {
            const sala = salasSopaLetras[salaId];
            if (!sala) return;

            // Verificar si la selección coincide con alguna palabra
            const palabraEncontrada = sala.palabras.find(p => 
                !sala.palabrasEncontradas.includes(p.word) && 
                verificarSeleccion(sala.tablero, seleccion, p.word)
            );

            if (palabraEncontrada) {
                sala.palabrasEncontradas.push(palabraEncontrada.word);
                // Marcar celdas como encontradas
                seleccion.forEach(({r, c}) => {
                    sala.tablero[r][c].encontrada = true;
                });
                
                if (sala.palabrasEncontradas.length === sala.palabras.length) {
                    io.to(salaId).emit('sopa:fin', { ganador: true, usuario });
                } else {
                    io.to(salaId).emit('sopa:palabraEncontrada', { 
                        palabra: palabraEncontrada.word,
                        usuario,
                        tablero: sala.tablero,
                        palabrasEncontradas: sala.palabrasEncontradas
                    });
                }
            } else {
                sala.errores++;
                if (sala.errores >= configSopaLetras.MAX_ERRORS) {
                    io.to(salaId).emit('sopa:fin', { ganador: false });
                } else {
                    io.to(salaId).emit('sopa:errorSeleccion', {
                        usuario,
                        erroresRestantes: configSopaLetras.MAX_ERRORS - sala.errores
                    });
                }
            }
        });

        socket.on('sopa:reiniciar', async ({ salaId, idMateria }) => {
            if (salasSopaLetras[salaId]) {
                // Volver a generar el tablero con nuevas palabras
                const [palabras] = await pool.query(
                    "SELECT palabra, pista FROM palabras WHERE id_materia = ? ORDER BY RAND() LIMIT 5",
                    [idMateria]
                );

                if (palabras.length > 0) {
                    const palabrasFormateadas = palabras.map(p => ({
                        word: p.palabra.toUpperCase(),
                        hint: p.pista
                    }));

                    salasSopaLetras[salaId] = {
                        tablero: generarTableroSopa(palabrasFormateadas),
                        palabras: palabrasFormateadas,
                        palabrasEncontradas: [],
                        jugadores: salasSopaLetras[salaId].jugadores,
                        errores: 0,
                        idMateria
                    };

                    io.to(salaId).emit('sopa:estado', salasSopaLetras[salaId]);
                }
            }
        });

        // Funciones auxiliares para Sopa de Letras
        function verificarSeleccion(tablero, seleccion, palabra) {
            // Verificar que la selección coincide con la palabra
            const letrasSeleccionadas = seleccion.map(({r, c}) => tablero[r][c]);
            return letrasSeleccionadas.join('') === palabra;
        }

        // [Mantener todas las demás funciones existentes...]

        socket.on('disconnect', () => {
            console.log('Jugador desconectado', socket.id);
            
            // Limpiar salas de sopa de letras al desconectarse
            for (let salaId in salasSopaLetras) {
                const sala = salasSopaLetras[salaId];
                sala.jugadores = sala.jugadores.filter(j => j.socketId !== socket.id);
                
                if (sala.jugadores.length === 0) {
                    delete salasSopaLetras[salaId];
                }
            }
        });
    });
};