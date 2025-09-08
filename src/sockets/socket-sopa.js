/**
 * socket-sopa.js
 * * Manejador completo y ESTRUCTURALMENTE CORRECTO para Sopa de Letras.
 * Adaptado para funcionar con la arquitectura de handlers del index.js principal.
 * Incluye lógica para modo Individual/Cooperativo y modo Enfrentamiento.
 */

// Variable global para mantener el estado de las salas de juego.
let gameRooms = {};

// Se exporta una función que recibe el objeto 'base' con io y pool.
module.exports = (base) => {
    const { io, pool } = base; // Obtenemos io y pool del objeto base.

    // Configuración general del juego, accesible en todo el módulo.
    const config = {
        ROWS: 14,
        COLS: 14,
        ALPHABET: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
        MAX_ERRORS_INDIVIDUAL: 4,
        TIEMPO_ENFRENTAMIENTO: 300 // 5 minutos en segundos
    };

    // --- FUNCIONES AUXILIARES DE LÓGICA DEL JUEGO ---

    /**
     * Genera un tablero de Sopa de Letras con palabras.
     * @param {Array} palabras - Un array de objetos { word, hint }.
     * @returns {Array<Array<string>>} - La matriz (grid) del tablero generado.
     */
    function generarTableroSopa(palabras) {
        const { ROWS, COLS, ALPHABET } = config;
        const grid = Array.from({ length: ROWS }, () => Array(COLS).fill(""));
        const directions = [
            { dr: 0, dc: 1 }, { dr: 0, dc: -1 }, { dr: 1, dc: 0 }, { dr: -1, dc: 0 },
            { dr: 1, dc: 1 }, { dr: 1, dc: -1 }, { dr: -1, dc: 1 }, { dr: -1, dc: -1 }
        ];

        const canPlaceWord = (word, r, c, dr, dc) => {
            for (let i = 0; i < word.length; i++) {
                const rr = r + dr * i, cc = c + dc * i;
                if (rr < 0 || cc < 0 || rr >= ROWS || cc >= COLS) return false;
                if (grid[rr][cc] !== "" && grid[rr][cc] !== word[i]) return false;
            }
            return true;
        };

        for (const { word } of palabras) {
            let placed = false;
            for (let tries = 0; tries < 200; tries++) {
                const { dr, dc } = directions[Math.floor(Math.random() * directions.length)];
                const startR = Math.floor(Math.random() * ROWS), startC = Math.floor(Math.random() * COLS);
                if (canPlaceWord(word, startR, startC, dr, dc)) {
                    for (let i = 0; i < word.length; i++) {
                        grid[startR + dr * i][startC + dc * i] = word[i];
                    }
                    placed = true;
                    break;
                }
            }
            if (!placed) console.warn(`ADVERTENCIA: No se pudo colocar la palabra "${word}".`);
        }

        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (grid[r][c] === "") grid[r][c] = ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
            }
        }
        return grid;
    }

    /**
     * Finaliza una partida de enfrentamiento, calcula el ganador y notifica a los clientes.
     * @param {string} salaId - El ID de la sala a finalizar.
     */
    const finalizarEnfrentamiento = (salaId) => {
        const room = gameRooms[salaId];
        if (!room || room.estado === 'finalizado') return;

        clearInterval(room.timer);
        room.estado = 'finalizado';
        console.log(`Finalizando enfrentamiento para la sala: ${salaId}`);
        const [p1, p2] = room.players;
        let ganador = null;
        let razon = "¡Es un empate!";

        if (p1.palabrasEncontradas.length > p2.palabrasEncontradas.length) {
            ganador = p1;
            razon = `${p1.username} encontró más palabras.`;
        } else if (p2.palabrasEncontradas.length > p1.palabrasEncontradas.length) {
            ganador = p2;
            razon = `${p2.username} encontró más palabras.`;
        } else if (p1.errores < p2.errores) {
            ganador = p1;
            razon = `Empate en palabras, pero ${p1.username} cometió menos errores.`;
        } else if (p2.errores < p1.errores) {
            ganador = p2;
            razon = `Empate en palabras, pero ${p2.username} cometió menos errores.`;
        }

        io.to(salaId).emit('sopa:enfrentamientoFinalizado', { ganador, razon, player1: p1, player2: p2 });
        setTimeout(() => {
            delete gameRooms[salaId];
            console.log(`Sala de enfrentamiento ${salaId} eliminada.`);
        }, 30000); // 30 segundos para ver resultados
    };


    // --- OBJETO HANDLER QUE SE EXPORTA AL index.js ---
    
    return {
        /**
         * Inicializa todos los listeners de Sopa de Letras para un nuevo socket.
         * Esta función es llamada por index.js para cada jugador que se conecta.
         * @param {Socket} socket - El objeto socket del jugador.
         */
        init: (socket) => {

            // --- LISTENERS DEL CHAT (Funcionan para cualquier sala de sopa) ---
            socket.on('chat:unirse', ({ salaId, usuario }) => {
                console.log(`[CHAT] ${usuario} se ha unido al chat de la sala ${salaId}`);
                socket.join(salaId); // Asegurarse de que el socket está en la sala de chat
            });

            socket.on('mensajeChat', ({ salaId, mensaje, usuario }) => {
                io.to(salaId).emit('nuevoMensaje', { usuario, mensaje });
            });
            
            // --- LISTENERS DEL MODO ENFRENTAMIENTO ---
            socket.on('sopa:unirseEnfrentamiento', async ({ salaId, usuario }) => {
                await socket.join(salaId);
                console.log(`[SERVIDOR] Jugador '${usuario.username}' se une a enfrentamiento '${salaId}'.`);

                if (!gameRooms[salaId]) {
                    gameRooms[salaId] = {
                        id: salaId, players: [], estado: 'esperando_jugadores', modo: 'enfrentamiento'
                    };
                }
                const room = gameRooms[salaId];
                if (room.players.length < 2 && !room.players.some(p => p.id === usuario.id_usuario)) {
                    room.players.push({
                        id: usuario.id_usuario, username: usuario.username, socketId: socket.id,
                        tablero: [], palabrasEncontradas: [], errores: 0
                    });
                    io.to(salaId).emit('sopa:mensajeSistema', `${usuario.username} se ha unido. Esperando oponente...`);
                }
                if (room.players.length === 2 && room.estado === 'esperando_jugadores') {
                    room.estado = 'votando';
                    // El primer jugador en la lista es el anfitrión
                    const anfitrion = room.players[0];
                    io.to(anfitrion.socketId).emit('sopa:eresAnfitrion');
                    const invitado = room.players[1];
                    io.to(invitado.socketId).emit('sopa:mensajeSistema', 'Esperando que el anfitrión elija una categoría...');
                }
            });

            // --- NUEVO LISTENER PARA PROPUESTAS ---
            socket.on('sopa:proponerCategoria', ({ salaId, idMateria, materiaTexto }) => {
                const room = gameRooms[salaId];
                if (!room || room.estado !== 'votando') return;
                
                // Guardamos la propuesta actual en la sala
                room.propuestaActual = { idMateria, materiaTexto };
                
                const proponente = room.players.find(p => p.socketId === socket.id);
                
                // Enviamos la propuesta a TODOS en la sala para que la vean en el chat
                io.to(salaId).emit('sopa:propuestaRecibida', { proponente, materiaTexto, idMateria });
            });

            // --- NUEVO LISTENER PARA VOTOS ---
            socket.on('sopa:votar', async ({ salaId, voto, idMateria }) => {
                const room = gameRooms[salaId];
                if (!room || room.estado !== 'votando') return;

                if (voto === 'si') {
                    // VOTO ACEPTADO - INICIAMOS EL JUEGO
                    console.log(`[SERVIDOR] Voto aceptado. Iniciando juego para '${salaId}' con materia ${idMateria}.`);
                    room.estado = 'jugando';

                    // Usamos el idMateria aceptado para buscar las palabras
                    try {
                        const [palabrasDB] = await pool.query("SELECT palabra, pista FROM palabras WHERE id_materia = ? ORDER BY RAND() LIMIT 8", [idMateria]);
                        if (palabrasDB.length < 2) {
                            io.to(salaId).emit('sopa:error', { message: `No hay suficientes palabras.` });
                            return delete gameRooms[salaId];
                        }
                        room.palabras = palabrasDB.map(p => ({ word: p.palabra.toUpperCase(), hint: p.pista }));
                        room.players[0].tablero = generarTableroSopa(room.palabras);
                        room.players[1].tablero = generarTableroSopa(room.palabras);
                        const gameData = { player1: room.players[0], player2: room.players[1], palabras: room.palabras };
                        io.to(salaId).emit('sopa:enfrentamientoIniciado', gameData); // ¡EL EVENTO QUE YA TIENES!
                        
                        // Iniciar timer
                        let tiempoRestante = config.TIEMPO_ENFRENTAMIENTO;
                        room.timer = setInterval(() => {
                            tiempoRestante--;
                            io.to(salaId).emit('sopa:tick', { tiempoRestante });
                            if (tiempoRestante <= 0) finalizarEnfrentamiento(salaId);
                        }, 1000);
                    } catch (error) {
                        console.error(`[ERROR FATAL] al iniciar juego para sala ${salaId}:`, error);
                    }
                } else {
                    // VOTO RECHAZADO
                    io.to(salaId).emit('sopa:propuestaRechazada');
                    // Devolvemos al anfitrión al estado de elegir
                    const anfitrion = room.players[0];
                    io.to(anfitrion.socketId).emit('sopa:eresAnfitrion');
                }
            });
            // EN: socket-sopa.js
            // Dentro de: init: (socket) => { ... }

            // --- NUEVOS LISTENERS PARA LA REVANCHA ---

            socket.on('sopa:solicitarRevancha', ({ salaId, usuario }) => {
                const room = gameRooms[salaId];
                if (!room || room.modo !== 'enfrentamiento') return;

                // Notificar al otro jugador que se ha solicitado una revancha
                const oponente = room.players.find(p => p.id !== usuario.id_usuario);
                if (oponente) {
                    io.to(oponente.socketId).emit('sopa:revanchaSolicitada', { solicitante: usuario });
                }
            });

            socket.on('sopa:responderRevancha', ({ salaId, respuesta }) => {
                const room = gameRooms[salaId];
                if (!room) return;

                if (respuesta === 'aceptada') {
                    // AMBOS ACEPTARON - Reiniciamos la sala al estado de votación
                    room.players.forEach(player => {
                        player.tablero = [];
                        player.palabrasEncontradas = [];
                        player.errores = 0;
                    });
                    room.palabras = [];
                    room.estado = 'votando'; // Cambiamos el estado para volver a elegir categoría
                    
                    io.to(salaId).emit('sopa:reiniciarParaVotacion');
                    
                    // El anfitrión (jugador 1) puede proponer de nuevo
                    const anfitrion = room.players[0];
                    io.to(anfitrion.socketId).emit('sopa:eresAnfitrion');
                    
                    const invitado = room.players[1];
                    io.to(invitado.socketId).emit('sopa:mensajeSistema', '¡Revancha! Esperando que el anfitrión elija categoría...');

                } else {
                    // Uno de los jugadores rechazó
                    io.to(salaId).emit('sopa:revanchaRechazada');
                }
            });
            socket.on('sopa:palabraEncontradaEnfrentamiento', ({ salaId, usuario, palabra }) => {
                const room = gameRooms[salaId];
                if (!room || room.estado !== 'jugando' || room.modo !== 'enfrentamiento') return;
                const player = room.players.find(p => p.id === usuario.id_usuario);
                if (player && !player.palabrasEncontradas.includes(palabra) && room.palabras.some(p => p.word === palabra)) {
                    player.palabrasEncontradas.push(palabra);
                    io.to(salaId).emit('sopa:actualizarEnfrentamiento', { player1: room.players[0], player2: room.players[1] });
                    if (player.palabrasEncontradas.length === room.palabras.length) finalizarEnfrentamiento(salaId);
                }
            });
            
            socket.on('sopa:errorEnfrentamiento', ({ salaId, usuario }) => {
                const room = gameRooms[salaId];
                if (!room || room.estado !== 'jugando' || room.modo !== 'enfrentamiento') return;
                const player = room.players.find(p => p.id === usuario.id_usuario);
                if (player) {
                    player.errores++;
                    io.to(salaId).emit('sopa:actualizarEnfrentamiento', { player1: room.players[0], player2: room.players[1] });
                }
            });

            // --- LISTENERS DEL MODO INDIVIDUAL ---
            socket.on('sopa:unirseIndividual', async ({ salaId, usuario, idMateria }) => {
                await socket.join(salaId);
                if (!gameRooms[salaId]) {
                    try {
                        const [palabrasDB] = await pool.query("SELECT palabra, pista FROM palabras WHERE id_materia = ? ORDER BY RAND() LIMIT 10", [idMateria || 1]);
                        if (palabrasDB.length === 0) {
                            return socket.emit('sopa:error', { message: "No hay palabras para esta categoría." });
                        }
                        const palabras = palabrasDB.map(p => ({ word: p.palabra.toUpperCase(), hint: p.pista }));
                        gameRooms[salaId] = {
                            id: salaId, modo: 'individual', palabras, tablero: generarTableroSopa(palabras),
                            palabrasEncontradas: new Set(), errores: 0, jugadores: {}
                        };
                    } catch (error) {
                        console.error("Error al crear sala individual:", error);
                        return socket.emit('sopa:error', { message: "Error al preparar el juego." });
                    }
                }
                const room = gameRooms[salaId];
                if (room.modo !== 'individual') return; // Evita que alguien se una a una sala de enfrentamiento con este evento
                if (!room.jugadores[usuario.id_usuario]) {
                    room.jugadores[usuario.id_usuario] = usuario.username;
                }
                socket.emit('sopa:estadoIndividual', {
                    tablero: room.tablero, palabras: room.palabras,
                    palabrasEncontradas: Array.from(room.palabrasEncontradas), errores: room.errores
                });
            });

            socket.on('sopa:palabraEncontradaIndividual', ({ salaId, palabra, usuario }) => {
                const room = gameRooms[salaId];
                if (!room || room.modo !== 'individual') return;
                if (room.palabras.some(p => p.word === palabra) && !room.palabrasEncontradas.has(palabra)) {
                    room.palabrasEncontradas.add(palabra);
                    const data = {
                        palabra, username: usuario.username, palabrasEncontradas: Array.from(room.palabrasEncontradas)
                    };
                    io.to(salaId).emit('sopa:actualizarIndividual', data);
                    if (room.palabrasEncontradas.size === room.palabras.length) {
                        io.to(salaId).emit('sopa:victoriaIndividual');
                        delete gameRooms[salaId];
                    }
                }
            });
        },

        /**
         * Limpia la sala cuando un jugador se desconecta.
         * @param {Socket} socket - El objeto socket del jugador que se desconectó.
         */
        cleanup: (socket) => {
            for (const salaId in gameRooms) {
                const room = gameRooms[salaId];
                if (room.modo === 'enfrentamiento' && room.players) {
                    const playerIndex = room.players.findIndex(p => p.socketId === socket.id);
                    if (playerIndex !== -1) {
                        const player = room.players[playerIndex];
                        console.log(`Jugador ${player.username} desconectado de sala de enfrentamiento ${salaId}`);
                        if (room.estado === 'jugando') {
                            const oponente = room.players.find(p => p.socketId !== socket.id);
                            io.to(salaId).emit('sopa:oponenteDesconectado', { ganador: oponente });
                            finalizarEnfrentamiento(salaId);
                        } else {
                            room.players.splice(playerIndex, 1);
                            if (room.players.length === 0) delete gameRooms[salaId];
                        }
                        return; // Salimos del bucle
                    }
                }
                // Aquí puedes agregar lógica de limpieza para el modo individual si es necesario
            }
        }
    };
};