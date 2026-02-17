/**
 * socket-sopa.js - VERSIÓN ULTRA-DEFENSIVA
 * Manejador para Sopa de Letras con validaciones exhaustivas
 */

module.exports = (base) => {
    const { io, pool, state } = base;

    // Asegurar que existe el objeto de salas
    if (!state.salasSopa) {
        state.salasSopa = {};
        console.log('✨ [INIT] Inicializado state.salasSopa');
    }

    const config = {
        ROWS: 14,
        COLS: 14,
        ALPHABET: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
        MAX_ERRORS_INDIVIDUAL: 4,
        TIEMPO_ENFRENTAMIENTO: 300
    };

    // --- HELPER: Validar y reparar sala ---
    function validarYRepararSala(salaId) {
        const room = state.salasSopa[salaId];
        if (!room) return null;

        // Reparar estructura si está corrupta
        if (!room.players) {
            console.warn(`⚠️ [REPARAR] Sala ${salaId} sin players array`);
            room.players = [];
        }
        if (!room.estado) {
            console.warn(`⚠️ [REPARAR] Sala ${salaId} sin estado`);
            room.estado = 'esperando_jugadores';
        }
        if (!room.modo) {
            console.warn(`⚠️ [REPARAR] Sala ${salaId} sin modo`);
            room.modo = 'enfrentamiento';
        }

        return room;
    }

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
                const startR = Math.floor(Math.random() * ROWS);
                const startC = Math.floor(Math.random() * COLS);
                
                if (canPlaceWord(word, startR, startC, dr, dc)) {
                    for (let i = 0; i < word.length; i++) {
                        grid[startR + dr * i][startC + dc * i] = word[i];
                    }
                    placed = true;
                    break;
                }
            }
            if (!placed) {
                console.warn(`⚠️ [SOPA] No se pudo colocar "${word}"`);
            }
        }

        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (grid[r][c] === "") {
                    grid[r][c] = ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
                }
            }
        }
        return grid;
    }

    const finalizarEnfrentamiento = (salaId) => {
        const room = validarYRepararSala(salaId);
        if (!room || room.estado === 'finalizado') return;
        if (!room.players || room.players.length < 2) {
            console.error(`❌ [FINALIZAR] Sala ${salaId} sin jugadores suficientes`);
            return;
        }

        if (room.timer) {
            clearInterval(room.timer);
            room.timer = null;
        }
        
        room.estado = 'finalizado';
        console.log(`🏁 [FINALIZAR] Sala ${salaId}`);
        
        const [p1, p2] = room.players;
        let ganador = null;
        let razon = "¡Es un empate!";

        const score1 = p1.palabrasEncontradas.length;
        const score2 = p2.palabrasEncontradas.length;

        if (score1 > score2) {
            ganador = p1;
            razon = `${p1.username} encontró más palabras (${score1} vs ${score2}).`;
        } else if (score2 > score1) {
            ganador = p2;
            razon = `${p2.username} encontró más palabras (${score2} vs ${score1}).`;
        } else if (p1.errores < p2.errores) {
            ganador = p1;
            razon = `Empate en palabras, ${p1.username} tuvo menos errores.`;
        } else if (p2.errores < p1.errores) {
            ganador = p2;
            razon = `Empate en palabras, ${p2.username} tuvo menos errores.`;
        }

        io.to(salaId).emit('sopa:enfrentamientoFinalizado', { 
            ganador, 
            razon, 
            player1: p1, 
            player2: p2 
        });
    };

    // --- HANDLER PRINCIPAL ---
    
    return {
        init: (socket) => {

            // ==================== CHAT ====================
            socket.on('chat:unirse', ({ salaId, usuario }) => {
                try {
                    console.log(`💬 [CHAT] ${usuario} → sala ${salaId}`);
                    socket.join(salaId);
                } catch (error) {
                    console.error(`❌ [CHAT] Error:`, error);
                }
            });

            // ==================== MODO ENFRENTAMIENTO ====================
            
            socket.on('sopa:unirseEnfrentamiento', async ({ salaId, usuario }) => {
                try {
                    socket.join(salaId);
                    console.log(`⚔️ [JOIN] ${usuario.username} (${usuario.id_usuario}) → ${salaId}`);

                    // Crear sala si no existe
                    if (!state.salasSopa[salaId]) {
                        state.salasSopa[salaId] = {
                            id: salaId, 
                            players: [], 
                            estado: 'esperando_jugadores', 
                            modo: 'enfrentamiento',
                            categoryProposal: null,
                            timer: null,
                            palabras: []
                        };
                        console.log(`✨ [CREAR] Sala ${salaId}`);
                    }

                    const room = validarYRepararSala(salaId);
                    if (!room) {
                        console.error(`❌ [JOIN] No se pudo validar sala ${salaId}`);
                        return;
                    }

                    // Verificar si ya está en la sala
                    const yaEsta = room.players.some(p => p.id === usuario.id_usuario);
                    
                    if (!yaEsta && room.players.length < 2) {
                        room.players.push({
                            id: usuario.id_usuario, 
                            username: usuario.username, 
                            socketId: socket.id,
                            tablero: [], 
                            palabrasEncontradas: [], 
                            errores: 0
                        });
                        console.log(`👤 [ADD] ${usuario.username} → ${salaId} (${room.players.length}/2)`);
                    }

                    // Solo 1 jugador: esperar
                    if (room.players.length === 1) {
                        console.log(`⏳ [WAIT] ${salaId} esperando jugador 2...`);
                        socket.emit('sopa:esperandoOponente');
                        return;
                    }

                    // 2 jugadores: iniciar votación
                    if (room.players.length === 2 && room.estado === 'esperando_jugadores') {
                        room.estado = 'votando';
                        console.log(`🗳️ [VOTE] Iniciando votación en ${salaId}`);
                        io.to(salaId).emit('sopa:iniciarVotacion');
                    }

                } catch (error) {
                    console.error(`❌ [JOIN] Error fatal:`, error);
                    socket.emit('sopa:error', { message: 'Error al unirse' });
                }
            });

            // Proponer categoría
            socket.on('sopa:proponerCategoria', ({ salaId, idMateria, materiaTexto }) => {
                try {
                    const room = validarYRepararSala(salaId);
                    if (!room || room.players.length < 2) {
                        console.error(`❌ [PROPUESTA] Sala inválida: ${salaId}`);
                        return;
                    }
                    
                    const proponente = room.players.find(p => p.socketId === socket.id);
                    if (!proponente) {
                        console.error(`❌ [PROPUESTA] Proponente no encontrado`);
                        return;
                    }
                    
                    room.categoryProposal = { idMateria, materiaTexto, proponenteId: proponente.id };
                    console.log(`📤 [PROPUESTA] ${proponente.username}: "${materiaTexto}"`);
                    
                    io.to(salaId).emit('sopa:nuevaPropuesta', {
                        proponente: proponente.username,
                        materiaTexto: materiaTexto
                    });
                } catch (error) {
                    console.error(`❌ [PROPUESTA] Error:`, error);
                }
            });

            // Votar categoría
            socket.on('sopa:votarCategoria', async ({ salaId, voto }) => {
                try {
                    const room = validarYRepararSala(salaId);
                    if (!room || room.estado !== 'votando') {
                        console.error(`❌ [VOTO] Estado inválido: ${salaId}`);
                        return;
                    }

                    const votante = room.players.find(p => p.socketId === socket.id);
                    if (!votante) {
                        console.error(`❌ [VOTO] Votante no encontrado`);
                        return;
                    }

                    console.log(`🗳️ [VOTO] ${votante.username}: ${voto}`);

                    if (voto === 'aceptado') {
                        console.log(`🎮 [START] Iniciando juego en ${salaId}`);
                        room.estado = 'jugando';

                        const [palabrasDB] = await pool.query(
                            "SELECT palabra, pista FROM palabras WHERE id_materia = ? ORDER BY RAND() LIMIT 8", 
                            [room.categoryProposal.idMateria]
                        );
                        
                        if (!palabrasDB || palabrasDB.length < 2) {
                            console.error(`❌ [START] Palabras insuficientes`);
                            io.to(salaId).emit('sopa:error', { message: 'No hay palabras para esta categoría' });
                            room.estado = 'votando';
                            room.categoryProposal = null;
                            return;
                        }

                        room.palabras = palabrasDB.map(p => ({ 
                            word: p.palabra.toUpperCase(), 
                            hint: p.pista 
                        }));

                        if (room.players.length === 2) {
                            room.players[0].tablero = generarTableroSopa(room.palabras);
                            room.players[1].tablero = generarTableroSopa(room.palabras);
                            
                            io.to(salaId).emit('sopa:enfrentamientoIniciado', { 
                                player1: room.players[0], 
                                player2: room.players[1], 
                                palabras: room.palabras,
                                gameTime: config.TIEMPO_ENFRENTAMIENTO
                            });
                            
                            let tiempoRestante = config.TIEMPO_ENFRENTAMIENTO;
                            room.timer = setInterval(() => {
                                tiempoRestante--;
                                io.to(salaId).emit('sopa:tick', { tiempoRestante });
                                if (tiempoRestante <= 0) finalizarEnfrentamiento(salaId);
                            }, 1000);
                        }
                        
                    } else {
                        console.log(`❌ [RECHAZADO] Por ${votante.username}`);
                        room.categoryProposal = null;
                        io.to(salaId).emit('sopa:propuestaRechazada', { votante: votante.username });
                    }
                } catch (error) {
                    console.error(`❌ [VOTO] Error fatal:`, error);
                }
            });

            // Palabra encontrada
            socket.on('sopa:palabraEncontradaEnfrentamiento', ({ salaId, usuario, palabra }) => {
                try {
                    const room = validarYRepararSala(salaId);
                    if (!room || room.estado !== 'jugando') return;
                    
                    const player = room.players.find(p => p.id === usuario.id_usuario);
                    if (!player) return;
                    
                    if (!player.palabrasEncontradas.includes(palabra) && 
                        room.palabras.some(p => p.word === palabra)) {
                        
                        player.palabrasEncontradas.push(palabra);
                        console.log(`✅ [PALABRA] ${usuario.username}: "${palabra}" (${player.palabrasEncontradas.length}/${room.palabras.length})`);
                        
                        io.to(salaId).emit('sopa:actualizarEnfrentamiento', { 
                            player1: room.players[0], 
                            player2: room.players[1] 
                        });
                        
                        if (player.palabrasEncontradas.length === room.palabras.length) {
                            finalizarEnfrentamiento(salaId);
                        }
                    }
                } catch (error) {
                    console.error(`❌ [PALABRA] Error:`, error);
                }
            });
            
            // Error
            socket.on('sopa:errorEnfrentamiento', ({ salaId, usuario }) => {
                try {
                    const room = validarYRepararSala(salaId);
                    if (!room || room.estado !== 'jugando') return;
                    
                    const player = room.players.find(p => p.id === usuario.id_usuario);
                    if (player) {
                        player.errores++;
                        console.log(`❌ [ERROR] ${usuario.username}: ${player.errores}`);
                        
                        io.to(salaId).emit('sopa:actualizarEnfrentamiento', { 
                            player1: room.players[0], 
                            player2: room.players[1] 
                        });
                    }
                } catch (error) {
                    console.error(`❌ [ERROR] Error:`, error);
                }
            });

            // Revancha
            socket.on('sopa:solicitarRevancha', ({ salaId, usuario }) => {
                try {
                    const room = validarYRepararSala(salaId);
                    if (!room || room.modo !== 'enfrentamiento') return;

                    const oponente = room.players.find(p => p.id !== usuario.id_usuario);
                    if (oponente) {
                        io.to(oponente.socketId).emit('sopa:revanchaSolicitada', { solicitante: usuario });
                    }
                } catch (error) {
                    console.error(`❌ [REVANCHA] Error:`, error);
                }
            });

            socket.on('sopa:responderRevancha', ({ salaId, respuesta }) => {
                try {
                    const room = validarYRepararSala(salaId);
                    if (!room) return;

                    if (respuesta === 'aceptada') {
                        room.players.forEach(p => {
                            p.tablero = [];
                            p.palabrasEncontradas = [];
                            p.errores = 0;
                        });
                        room.palabras = [];
                        room.categoryProposal = null;
                        room.estado = 'votando';
                        
                        io.to(salaId).emit('sopa:reiniciarParaVotacion');
                        io.to(salaId).emit('sopa:iniciarVotacion');
                    } else {
                        io.to(salaId).emit('sopa:revanchaRechazada');
                    }
                } catch (error) {
                    console.error(`❌ [REVANCHA] Error:`, error);
                }
            });

            // ==================== MODO INDIVIDUAL ====================
            
            socket.on('sopa:unirseIndividual', async ({ salaId, usuario, idMateria }) => {
                try {
                    socket.join(salaId);
                    console.log(`🎯 [INDIVIDUAL] ${usuario.username} → ${salaId}`);
                    
                    if (!state.salasSopa[salaId]) {
                        const [palabrasDB] = await pool.query(
                            "SELECT palabra, pista FROM palabras WHERE id_materia = ? ORDER BY RAND() LIMIT 10", 
                            [idMateria || 1]
                        );
                        
                        if (!palabrasDB || palabrasDB.length === 0) {
                            return socket.emit('sopa:error', { message: "Sin palabras" });
                        }
                        
                        const palabras = palabrasDB.map(p => ({ 
                            word: p.palabra.toUpperCase(), 
                            hint: p.pista 
                        }));
                        
                        state.salasSopa[salaId] = {
                            id: salaId, 
                            modo: 'individual', 
                            palabras, 
                            tablero: generarTableroSopa(palabras),
                            palabrasEncontradas: new Set(), 
                            errores: 0, 
                            jugadores: {}
                        };
                    }
                    
                    const room = state.salasSopa[salaId];
                    if (!room.jugadores) room.jugadores = {};
                    room.jugadores[usuario.id_usuario] = usuario.username;
                    
                    socket.emit('sopa:estadoIndividual', {
                        tablero: room.tablero, 
                        palabras: room.palabras,
                        palabrasEncontradas: Array.from(room.palabrasEncontradas), 
                        errores: room.errores
                    });
                } catch (error) {
                    console.error(`❌ [INDIVIDUAL] Error:`, error);
                    socket.emit('sopa:error', { message: 'Error al unirse' });
                }
            });

            socket.on('sopa:palabraEncontradaIndividual', ({ salaId, palabra, usuario }) => {
                try {
                    const room = state.salasSopa[salaId];
                    if (!room || room.modo !== 'individual') return;
                    
                    if (room.palabras.some(p => p.word === palabra) && 
                        !room.palabrasEncontradas.has(palabra)) {
                        
                        room.palabrasEncontradas.add(palabra);
                        
                        io.to(salaId).emit('sopa:actualizarIndividual', {
                            palabra, 
                            username: usuario.username, 
                            palabrasEncontradas: Array.from(room.palabrasEncontradas)
                        });
                        
                        if (room.palabrasEncontradas.size === room.palabras.length) {
                            io.to(salaId).emit('sopa:victoriaIndividual');
                            delete state.salasSopa[salaId];
                        }
                    }
                } catch (error) {
                    console.error(`❌ [INDIVIDUAL] Error:`, error);
                }
            });
        },

        // ==================== CLEANUP ====================
        
        cleanup: (socket) => {
            try {
                console.log(`🔌 [DISCONNECT] ${socket.id}`);
                
                for (const salaId in state.salasSopa) {
                    const room = state.salasSopa[salaId];
                    
                    if (room.modo === 'enfrentamiento' && room.players) {
                        const idx = room.players.findIndex(p => p.socketId === socket.id);
                        
                        if (idx !== -1) {
                            const player = room.players[idx];
                            console.log(`👋 [LEAVE] ${player.username} de ${salaId}`);
                            
                            if (room.estado === 'jugando') {
                                const oponente = room.players.find(p => p.socketId !== socket.id);
                                if (oponente) {
                                    io.to(salaId).emit('sopa:oponenteDesconectado', { ganador: oponente });
                                    finalizarEnfrentamiento(salaId);
                                }
                            } else {
                                room.players.splice(idx, 1);
                                if (room.players.length === 0) {
                                    if (room.timer) clearInterval(room.timer);
                                    delete state.salasSopa[salaId];
                                    console.log(`🗑️ [DELETE] ${salaId}`);
                                }
                            }
                            return;
                        }
                    }
                }
            } catch (error) {
                console.error(`❌ [CLEANUP] Error:`, error);
            }
        }
    };
};