/**
 * socket-sopa.js
 * Manejador completo y ESTRUCTURALMENTE CORRECTO para Sopa de Letras.
 * VERSIÓN CORREGIDA con sistema de votación democrático.
 */

// Variable global para mantener el estado de las salas de juego.
let gameRooms = {};

// Se exporta una función que recibe el objeto 'base' con io y pool.
module.exports = (base) => {
    const { io, pool } = base;

    // Configuración general del juego
    const config = {
        ROWS: 14,
        COLS: 14,
        ALPHABET: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
        MAX_ERRORS_INDIVIDUAL: 4,
        TIEMPO_ENFRENTAMIENTO: 300 // 5 minutos en segundos
    };

    // --- FUNCIONES AUXILIARES ---

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

    const finalizarEnfrentamiento = (salaId) => {
        const room = gameRooms[salaId];
        if (!room || room.estado === 'finalizado') return;

        clearInterval(room.timer);
        room.estado = 'finalizado';
        console.log(`[FINALIZAR] Enfrentamiento para sala: ${salaId}`);
        
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
    };

    // --- HANDLER PRINCIPAL ---
    
    return {
        init: (socket) => {

            // --- CHAT ---
            socket.on('chat:unirse', ({ salaId, usuario }) => {
                console.log(`[CHAT] ${usuario} unido a sala ${salaId}`);
                socket.join(salaId);
            });

            // --- MODO ENFRENTAMIENTO ---
            
            // 🔹 PASO 1: Jugador se une a la sala de enfrentamiento
            socket.on('sopa:unirseEnfrentamiento', async ({ salaId, usuario }) => {
                socket.join(salaId);
                console.log(`[ENFRENTAMIENTO] ${usuario.username} (ID: ${usuario.id_usuario}) se une a sala ${salaId}`);

                // Crear sala si no existe
                if (!gameRooms[salaId]) {
                    gameRooms[salaId] = {
                        id: salaId, 
                        players: [], 
                        estado: 'esperando_jugadores', 
                        modo: 'enfrentamiento',
                        categoryProposal: null
                    };
                    console.log(`[SALA CREADA] ${salaId} - Estado inicial: esperando_jugadores`);
                }

                const room = gameRooms[salaId];
                
                // Verificar el estado actual de la sala
                console.log(`[DEBUG] Estado de sala ${salaId}:`, {
                    estado: room.estado,
                    cantidadJugadores: room.players.length,
                    modo: room.modo
                });
                
                // Agregar jugador si no está ya en la sala
                const yaEstaEnSala = room.players.some(p => p.id === usuario.id_usuario);
                
                if (!yaEstaEnSala && room.players.length < 2) {
                    room.players.push({
                        id: usuario.id_usuario, 
                        username: usuario.username, 
                        socketId: socket.id,
                        tablero: [], 
                        palabrasEncontradas: [], 
                        errores: 0
                    });
                    console.log(`[JUGADOR AGREGADO] ${usuario.username} a sala ${salaId}. Total jugadores: ${room.players.length}`);
                    console.log(`[DEBUG] Jugadores en sala:`, room.players.map(p => p.username));
                }

                // 🔹 CASO 1: Solo hay 1 jugador (esperando oponente)
                if (room.players.length === 1) {
                    console.log(`[ESPERANDO] Sala ${salaId} tiene 1 jugador, esperando oponente...`);
                    socket.emit('sopa:esperandoOponente');
                    return; // Importante: salir aquí para no ejecutar el siguiente bloque
                }

                // 🔹 CASO 2: Ya hay 2 jugadores (iniciar votación)
                if (room.players.length === 2) {
                    console.log(`[DEBUG] Verificando condiciones para iniciar votación...`);
                    console.log(`[DEBUG] - Jugadores: ${room.players.length}`);
                    console.log(`[DEBUG] - Estado actual: ${room.estado}`);
                    
                    if (room.estado === 'esperando_jugadores') {
                        room.estado = 'votando';
                        console.log(`[VOTACIÓN INICIADA] ✅ Sala ${salaId} - Ambos jugadores presentes`);
                        console.log(`[DEBUG] Emitiendo sopa:iniciarVotacion a sala ${salaId}`);
                        
                        // Notificar a AMBOS jugadores que pueden proponer
                        io.to(salaId).emit('sopa:iniciarVotacion');
                        
                        // Verificar que el evento se emitió
                        console.log(`[DEBUG] ✅ Evento sopa:iniciarVotacion emitido a ${room.players.length} jugadores`);
                    } else {
                        console.log(`[ADVERTENCIA] Sala ${salaId} no está en estado 'esperando_jugadores' (estado actual: ${room.estado})`);
                    }
                }
            });

            // 🔹 PASO 2: Un jugador propone una categoría
            socket.on('sopa:proponerCategoria', ({ salaId, idMateria, materiaTexto }) => {
                const room = gameRooms[salaId];
                if (!room || room.players.length < 2) {
                    console.log(`[ERROR PROPUESTA] Sala ${salaId} no válida o sin suficientes jugadores`);
                    return;
                }
                
                const proponente = room.players.find(p => p.socketId === socket.id);
                if (!proponente) {
                    console.log(`[ERROR PROPUESTA] Proponente no encontrado en sala ${salaId}`);
                    return;
                }
                
                // Guardar la propuesta en la sala
                room.categoryProposal = { idMateria, materiaTexto, proponenteId: proponente.id };
                
                console.log(`[PROPUESTA] ${proponente.username} propone "${materiaTexto}" (ID: ${idMateria}) en sala ${salaId}`);
                
                // Notificar a TODA la sala sobre la nueva propuesta
                io.to(salaId).emit('sopa:nuevaPropuesta', {
                    proponente: proponente.username,
                    materiaTexto: materiaTexto
                });
            });

            // 🔹 PASO 3: El otro jugador vota (acepta o rechaza)
            socket.on('sopa:votarCategoria', async ({ salaId, voto }) => {
                const room = gameRooms[salaId];
                if (!room || room.estado !== 'votando') {
                    console.log(`[ERROR VOTO] Sala ${salaId} no está en estado de votación`);
                    return;
                }

                const votante = room.players.find(p => p.socketId === socket.id);
                if (!votante) {
                    console.log(`[ERROR VOTO] Votante no encontrado en sala ${salaId}`);
                    return;
                }

                console.log(`[VOTO] ${votante.username} votó "${voto}" en sala ${salaId}`);

                if (voto === 'aceptado') {
                    // ✅ VOTO ACEPTADO - INICIAMOS EL JUEGO
                    console.log(`[INICIANDO JUEGO] Sala ${salaId} con categoría ID: ${room.categoryProposal.idMateria}`);
                    room.estado = 'jugando';

                    try {
                        const [palabrasDB] = await pool.query(
                            "SELECT palabra, pista FROM palabras WHERE id_materia = ? ORDER BY RAND() LIMIT 8", 
                            [room.categoryProposal.idMateria]
                        );
                        
                        if (palabrasDB.length < 2) {
                            console.log(`[ERROR] No hay suficientes palabras para categoría ${room.categoryProposal.idMateria}`);
                            io.to(salaId).emit('sopa:error', { message: `No hay suficientes palabras para esta categoría.` });
                            return delete gameRooms[salaId];
                        }

                        room.palabras = palabrasDB.map(p => ({ word: p.palabra.toUpperCase(), hint: p.pista }));
                        console.log(`[PALABRAS CARGADAS] ${room.palabras.length} palabras para sala ${salaId}`);
                        
                        // Generar tableros diferentes para cada jugador
                        room.players[0].tablero = generarTableroSopa(room.palabras);
                        room.players[1].tablero = generarTableroSopa(room.palabras);
                        
                        const gameData = { 
                            player1: room.players[0], 
                            player2: room.players[1], 
                            palabras: room.palabras,
                            gameTime: config.TIEMPO_ENFRENTAMIENTO
                        };
                        
                        console.log(`[EMITIENDO] sopa:enfrentamientoIniciado a sala ${salaId}`);
                        io.to(salaId).emit('sopa:enfrentamientoIniciado', gameData);
                        
                        // Iniciar temporizador
                        let tiempoRestante = config.TIEMPO_ENFRENTAMIENTO;
                        room.timer = setInterval(() => {
                            tiempoRestante--;
                            io.to(salaId).emit('sopa:tick', { tiempoRestante });
                            if (tiempoRestante <= 0) {
                                finalizarEnfrentamiento(salaId);
                            }
                        }, 1000);
                        
                    } catch (error) {
                        console.error(`[ERROR FATAL] Al iniciar juego para sala ${salaId}:`, error);
                        io.to(salaId).emit('sopa:error', { message: 'Error al iniciar el juego' });
                    }
                    
                } else if (voto === 'rechazado') {
                    // ❌ VOTO RECHAZADO - Volver a proponer
                    console.log(`[PROPUESTA RECHAZADA] Por ${votante.username} en sala ${salaId}`);
                    
                    room.categoryProposal = null; // Limpiar la propuesta
                    
                    // Notificar a todos sobre el rechazo
                    io.to(salaId).emit('sopa:propuestaRechazada', { votante: votante.username });
                }
            });

            // 🔹 Palabra encontrada en enfrentamiento
            socket.on('sopa:palabraEncontradaEnfrentamiento', ({ salaId, usuario, palabra }) => {
                const room = gameRooms[salaId];
                if (!room || room.estado !== 'jugando' || room.modo !== 'enfrentamiento') return;
                
                const player = room.players.find(p => p.id === usuario.id_usuario);
                if (player && !player.palabrasEncontradas.includes(palabra) && room.palabras.some(p => p.word === palabra)) {
                    player.palabrasEncontradas.push(palabra);
                    console.log(`[PALABRA] ${usuario.username} encontró "${palabra}" en sala ${salaId}`);
                    
                    io.to(salaId).emit('sopa:actualizarEnfrentamiento', { 
                        player1: room.players[0], 
                        player2: room.players[1] 
                    });
                    
                    // Verificar si alguien ganó
                    if (player.palabrasEncontradas.length === room.palabras.length) {
                        finalizarEnfrentamiento(salaId);
                    }
                }
            });
            
            // 🔹 Error en enfrentamiento
            socket.on('sopa:errorEnfrentamiento', ({ salaId, usuario }) => {
                const room = gameRooms[salaId];
                if (!room || room.estado !== 'jugando' || room.modo !== 'enfrentamiento') return;
                
                const player = room.players.find(p => p.id === usuario.id_usuario);
                if (player) {
                    player.errores++;
                    console.log(`[ERROR] ${usuario.username} cometió error en sala ${salaId}. Total: ${player.errores}`);
                    
                    io.to(salaId).emit('sopa:actualizarEnfrentamiento', { 
                        player1: room.players[0], 
                        player2: room.players[1] 
                    });
                }
            });

            // 🔹 SISTEMA DE REVANCHA
            socket.on('sopa:solicitarRevancha', ({ salaId, usuario }) => {
                const room = gameRooms[salaId];
                if (!room || room.modo !== 'enfrentamiento') return;

                console.log(`[REVANCHA] ${usuario.username} solicita revancha en sala ${salaId}`);
                
                const oponente = room.players.find(p => p.id !== usuario.id_usuario);
                if (oponente) {
                    io.to(oponente.socketId).emit('sopa:revanchaSolicitada', { solicitante: usuario });
                }
            });

            socket.on('sopa:responderRevancha', ({ salaId, respuesta }) => {
                const room = gameRooms[salaId];
                if (!room) return;

                console.log(`[REVANCHA] Respuesta "${respuesta}" en sala ${salaId}`);

                if (respuesta === 'aceptada') {
                    // Reiniciar sala al estado de votación
                    room.players.forEach(player => {
                        player.tablero = [];
                        player.palabrasEncontradas = [];
                        player.errores = 0;
                    });
                    room.palabras = [];
                    room.categoryProposal = null;
                    room.estado = 'votando';
                    
                    io.to(salaId).emit('sopa:reiniciarParaVotacion');
                    io.to(salaId).emit('sopa:iniciarVotacion');
                    
                } else {
                    io.to(salaId).emit('sopa:revanchaRechazada');
                }
            });

            // --- MODO INDIVIDUAL ---
            socket.on('sopa:unirseIndividual', async ({ salaId, usuario, idMateria }) => {
                socket.join(salaId);
                console.log(`[INDIVIDUAL] ${usuario.username} se une a sala individual ${salaId}`);
                
                if (!gameRooms[salaId]) {
                    try {
                        const [palabrasDB] = await pool.query(
                            "SELECT palabra, pista FROM palabras WHERE id_materia = ? ORDER BY RAND() LIMIT 10", 
                            [idMateria || 1]
                        );
                        
                        if (palabrasDB.length === 0) {
                            return socket.emit('sopa:error', { message: "No hay palabras para esta categoría." });
                        }
                        
                        const palabras = palabrasDB.map(p => ({ word: p.palabra.toUpperCase(), hint: p.pista }));
                        gameRooms[salaId] = {
                            id: salaId, 
                            modo: 'individual', 
                            palabras, 
                            tablero: generarTableroSopa(palabras),
                            palabrasEncontradas: new Set(), 
                            errores: 0, 
                            jugadores: {}
                        };
                    } catch (error) {
                        console.error("[ERROR] Al crear sala individual:", error);
                        return socket.emit('sopa:error', { message: "Error al preparar el juego." });
                    }
                }
                
                const room = gameRooms[salaId];
                if (room.modo !== 'individual') return;
                
                if (!room.jugadores[usuario.id_usuario]) {
                    room.jugadores[usuario.id_usuario] = usuario.username;
                }
                
                socket.emit('sopa:estadoIndividual', {
                    tablero: room.tablero, 
                    palabras: room.palabras,
                    palabrasEncontradas: Array.from(room.palabrasEncontradas), 
                    errores: room.errores
                });
            });

            socket.on('sopa:palabraEncontradaIndividual', ({ salaId, palabra, usuario }) => {
                const room = gameRooms[salaId];
                if (!room || room.modo !== 'individual') return;
                
                if (room.palabras.some(p => p.word === palabra) && !room.palabrasEncontradas.has(palabra)) {
                    room.palabrasEncontradas.add(palabra);
                    const data = {
                        palabra, 
                        username: usuario.username, 
                        palabrasEncontradas: Array.from(room.palabrasEncontradas)
                    };
                    io.to(salaId).emit('sopa:actualizarIndividual', data);
                    
                    if (room.palabrasEncontradas.size === room.palabras.length) {
                        io.to(salaId).emit('sopa:victoriaIndividual');
                        delete gameRooms[salaId];
                    }
                }
            });
        },

        // --- CLEANUP AL DESCONECTAR ---
        cleanup: (socket) => {
            for (const salaId in gameRooms) {
                const room = gameRooms[salaId];
                
                if (room.modo === 'enfrentamiento' && room.players) {
                    const playerIndex = room.players.findIndex(p => p.socketId === socket.id);
                    
                    if (playerIndex !== -1) {
                        const player = room.players[playerIndex];
                        console.log(`[DESCONEXIÓN] ${player.username} de sala ${salaId}`);
                        
                        if (room.estado === 'jugando') {
                            const oponente = room.players.find(p => p.socketId !== socket.id);
                            io.to(salaId).emit('sopa:oponenteDesconectado', { ganador: oponente });
                            finalizarEnfrentamiento(salaId);
                        } else {
                            room.players.splice(playerIndex, 1);
                            if (room.players.length === 0) {
                                delete gameRooms[salaId];
                                console.log(`[SALA ELIMINADA] ${salaId} por falta de jugadores`);
                            }
                        }
                        return;
                    }
                }
            }
        }
    };
};