module.exports = (base) => {
    console.log('🎮 [GATO] Módulo socket-gato.js cargado');
    console.log('🔍 [GATO] Base recibido:', { hasIo: !!base.io, hasPool: !!base.pool, hasState: !!base.state });
    
    const { io, pool, state } = base;

    if (!io || !pool || !state) {
        console.error('❌ [GATO] ERROR CRÍTICO: io, pool o state no están definidos');
        return { init: () => {}, cleanup: () => {} };
    }

    // Usar el estado compartido
    if (!state.partidasGato) {
        state.partidasGato = {};
    }
    const partidasGato = state.partidasGato;

    // Función para emitir el estado de la sala a todos los jugadores
    const emitirEstado = (salaId) => { 
        if (partidasGato[salaId]) {
            console.log(`[GATO] Emitiendo estado de sala ${salaId}:`, {
                jugadores: partidasGato[salaId].jugadores.length,
                gameStarted: partidasGato[salaId].gameStarted,
                gameOver: partidasGato[salaId].gameOver
            });
            io.to(salaId).emit('gato:estado', partidasGato[salaId]); 
        } 
    };

    // Función para verificar ganador o empate
    const checkWinner = (tablero) => { 
        // Combinaciones ganadoras
        const c = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
        for(const i of c){
            if(tablero[i[0]] && tablero[i[0]]===tablero[i[1]] && tablero[i[0]]===tablero[i[2]]) 
                return tablero[i[0]]; // Retorna 'X' o 'O'
        } 
        if(!tablero.includes(null)) return 'empate'; // Tablero lleno, sin ganador
        return null; // Aún no hay ganador
    };
    
    // Función para iniciar la partida cargando preguntas
    const iniciarPartida = async (salaId, idMateria) => {
        const partida = partidasGato[salaId]; 
        if (!partida) return;
        
        console.log(`[GATO] Iniciando partida en sala ${salaId} con materia ${idMateria}`);
        
        try {
            // Consulta SQL para obtener preguntas y respuestas
            const [rows] = await pool.query(
                `SELECT p.id_pregunta, p.pregunta, p.retroalimentacion, r.id_respuesta, r.respuesta, r.correcta 
                 FROM pregunta p JOIN respuesta r ON p.id_pregunta = r.id_pregunta 
                 WHERE p.id_materia = ?`, 
                [idMateria]
            );

            console.log(`[GATO] Preguntas obtenidas: ${rows.length} filas para materia ${idMateria}`);

            // Map para agrupar preguntas con sus opciones
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
                    correcta: Number(row.correcta) 
                }); 
            });

            let todasLasPreguntas = Array.from(preguntasMap.values());
            console.log(`[GATO] Total preguntas únicas: ${todasLasPreguntas.length}`);

            // Verifica si hay suficientes preguntas
            if (todasLasPreguntas.length < 9) { 
                console.log(`[GATO] ❌ No hay suficientes preguntas (${todasLasPreguntas.length}/9)`);
                io.to(salaId).emit('gato:error', { 
                    message: `No hay suficientes preguntas (${todasLasPreguntas.length}/9) en esta categoría.` 
                }); 
                partida.votacionEnProgreso = false; 
                partida.votos = {}; 
                partida.propuestaPor = null; 
                partida.propuestaMateriaTexto = null; 
                emitirEstado(salaId); 
                return; 
            }

            // Mezcla preguntas y selecciona las 9 primeras
            todasLasPreguntas.sort(() => Math.random() - 0.5);
            partida.preguntas = todasLasPreguntas.slice(0, 9); 

            // Inicializa estado de la partida
            partida.gameStarted = true; 
            partida.votacionEnProgreso = false; 
            partida.votos = {}; 
            partida.propuestaPor = null; 
            partida.propuestaMateriaTexto = null; 
            partida.log.push('¡La partida ha comenzado!'); 

            console.log(`[GATO] ✅ Partida iniciada en sala ${salaId}`);
            emitirEstado(salaId);

        } catch (error) { 
            console.error("[GATO] Error al iniciar partida:", error); 
            io.to(salaId).emit('gato:error', { 
                message: 'Error del servidor al cargar las preguntas.' 
            }); 
        }
    };

    return {
        init: (socket) => {
            console.log(`[GATO INIT] 🎮 Socket conectado: ${socket.id}`);

            // Evento para unirse a la sala
            socket.on('gato:unirse', ({ salaId, usuario }) => {
                console.log(`[GATO] ${usuario.username} intenta unirse a sala ${salaId}`);
                
                if (!usuario || !usuario.id_usuario) {
                    console.error("[GATO] ❌ Unión rechazada: 'usuario' no fue proporcionado.");
                    return;
                }
                
                socket.join(salaId);

                // Crea la sala si no existe
                if (!partidasGato[salaId]) {
                    console.log(`[GATO] Creando nueva sala ${salaId}`);
                    partidasGato[salaId] = { 
                        jugadores: [], 
                        tablero: Array(9).fill(null), 
                        turno: 0, 
                        gameStarted: false, 
                        gameOver: false, 
                        ganador: null, 
                        idMateria: null, 
                        preguntas: [], 
                        preguntaActual: null, 
                        celdaPendiente: null, 
                        log: [], 
                        votacionEnProgreso: false, 
                        votos: {}, 
                        propuestaPor: null, 
                        propuestaMateriaTexto: null 
                    };
                }

                const partida = partidasGato[salaId];

                // Evita unirse si ya comenzó la partida
                if (partida.gameStarted && !partida.ganador) {
                    console.log(`[GATO] ❌ ${usuario.username} no puede unirse - partida en curso`);
                    return socket.emit('gato:error', { 
                        message: 'Esta partida ya ha comenzado.' 
                    });
                }

                // Limita a 2 jugadores
                if (partida.jugadores.length >= 2 && !partida.jugadores.some(p => p.id === usuario.id_usuario)) {
                    console.log(`[GATO] ❌ ${usuario.username} no puede unirse - sala llena`);
                    return socket.emit('gato:error', { 
                        message: 'La sala está llena.' 
                    });
                }

                // Añade jugador si no estaba
                if (!partida.jugadores.some(p => p.id === usuario.id_usuario)) {
                    const simbolo = partida.jugadores.length === 0 ? 'X' : 'O';
                    partida.jugadores.push({ 
                        id: usuario.id_usuario, 
                        socketId: socket.id, 
                        username: usuario.username, 
                        simbolo 
                    });
                    console.log(`[GATO] ✅ ${usuario.username} agregado como ${simbolo} - Total jugadores: ${partida.jugadores.length}`);
                }

                partida.log.push(`${usuario.username} se ha unido a la sala.`);
                emitirEstado(salaId);
            });

            // Evento para proponer inicio con materia
            socket.on('gato:proponerInicio', ({ salaId, idMateria, textoMateria }) => {
                console.log(`[GATO] Propuesta de inicio en sala ${salaId} - Materia: ${textoMateria} (${idMateria})`);
                
                const partida = partidasGato[salaId];
                const proponente = partida?.jugadores.find(j => j.socketId === socket.id);
                
                if (!partida || !proponente) {
                    console.log(`[GATO] ❌ Propuesta rechazada - sala o proponente no encontrado`);
                    return;
                }
                
                if (partida.gameStarted || partida.votacionEnProgreso || partida.jugadores.length !== 2 || !idMateria) {
                    console.log(`[GATO] ❌ Propuesta rechazada - condiciones no cumplidas`);
                    return;
                }

                // Marca votación en progreso y guarda la propuesta
                partida.votacionEnProgreso = true;
                partida.idMateria = idMateria;
                partida.votos = { [proponente.id]: true };
                partida.propuestaPor = proponente.username;
                partida.propuestaMateriaTexto = textoMateria;
                
                console.log(`[GATO] ✅ Votación iniciada por ${proponente.username}`);
                emitirEstado(salaId);
            });
            
            // Evento para votar la propuesta
            socket.on('gato:votar', ({ salaId, voto }) => {
                console.log(`[GATO] Voto recibido en sala ${salaId}: ${voto}`);
                
                const partida = partidasGato[salaId];
                const votante = partida?.jugadores.find(j => j.socketId === socket.id);
                
                if (!partida || !votante || !partida.votacionEnProgreso || partida.votos[votante.id] !== undefined) {
                    console.log(`[GATO] ❌ Voto rechazado`);
                    return;
                }

                partida.votos[votante.id] = voto;
                const todosHanVotado = Object.keys(partida.votos).length === partida.jugadores.length;
                
                console.log(`[GATO] Votos actuales:`, partida.votos);

                if (!voto) {
                    // Si alguien rechaza, se cancela la votación
                    console.log(`[GATO] ❌ Votación rechazada por ${votante.username}`);
                    partida.votacionEnProgreso = false; 
                    partida.votos = {}; 
                    partida.propuestaPor = null; 
                    partida.propuestaMateriaTexto = null;
                    io.to(salaId).emit('gato:votacionCancelada', { 
                        motivo: `${votante.username} ha rechazado el inicio.` 
                    });
                    emitirEstado(salaId);
                } else if (voto && todosHanVotado) {
                    // Todos aceptaron, iniciar partida
                    console.log(`[GATO] ✅ Todos votaron a favor - iniciando partida`);
                    iniciarPartida(salaId, partida.idMateria);
                }
            });

            // Evento de movimiento en el tablero
            socket.on('gato:movimiento', ({ salaId, celda }) => {
                console.log(`[GATO] Movimiento en sala ${salaId}, celda ${celda}`);
                
                const partida = partidasGato[salaId]; 
                if (!partida || partida.gameOver || partida.preguntaActual) {
                    console.log(`[GATO] ❌ Movimiento rechazado - condiciones no cumplidas`);
                    return;
                }
                
                const jugadorActual = partida.jugadores[partida.turno]; 
                if (jugadorActual.socketId !== socket.id || partida.tablero[celda] !== null) {
                    console.log(`[GATO] ❌ Movimiento rechazado - no es su turno o celda ocupada`);
                    return;
                }

                // Si no quedan preguntas, empate
                if (partida.preguntas.length === 0) {
                    console.log(`[GATO] ⚠️  No quedan preguntas - empate`);
                    partida.gameOver = true; 
                    partida.ganador = 'empate'; 
                    emitirEstado(salaId); 
                    return; 
                }

                // Asigna pregunta pendiente
                partida.celdaPendiente = celda; 
                partida.preguntaActual = partida.preguntas.pop();
                
                console.log(`[GATO] 📝 Pregunta asignada a ${jugadorActual.username} - Quedan ${partida.preguntas.length} preguntas`);
                socket.emit('gato:mostrarPregunta', partida.preguntaActual);
            });

            // Evento de responder pregunta
            socket.on('gato:respuesta', ({ salaId, respuestaId }) => {
                console.log(`[GATO] Respuesta recibida en sala ${salaId}: ${respuestaId}`);
                
                const partida = partidasGato[salaId]; 
                if (!partida || !partida.preguntaActual) {
                    console.log(`[GATO] ❌ Respuesta rechazada - no hay pregunta activa`);
                    return;
                }
                
                const jugadorActual = partida.jugadores[partida.turno]; 
                if (jugadorActual.socketId !== socket.id) {
                    console.log(`[GATO] ❌ Respuesta rechazada - no es el jugador correcto`);
                    return;
                }
                
                const opcionCorrecta = partida.preguntaActual.opciones.find(opt => opt.correcta === 1);
                const esCorrecta = (respuestaId == opcionCorrecta.id);

                console.log(`[GATO] Respuesta ${esCorrecta ? '✅ correcta' : '❌ incorrecta'}`);

                // Guardar información de la jugada
                partida.ultimaJugada = {
                    jugador: jugadorActual,
                    esCorrecta: esCorrecta,
                    preguntaRespondida: partida.preguntaActual,
                    respuestaCorrectaTexto: opcionCorrecta.texto,
                    timestamp: Date.now()
                };

                // Si es correcta, marca la celda
                if (esCorrecta) {
                    partida.tablero[partida.celdaPendiente] = jugadorActual.simbolo;
                    const resultado = checkWinner(partida.tablero);
                    if (resultado) {
                        console.log(`[GATO] 🏆 Fin del juego: ${resultado === 'empate' ? 'Empate' : jugadorActual.username + ' gana'}`);
                        partida.gameOver = true; 
                        partida.ganador = (resultado === 'empate') ? 'empate' : jugadorActual; 
                    }
                }

                // Cambia turno si no terminó la partida
                if (!partida.gameOver) { 
                    partida.turno = (partida.turno + 1) % 2; 
                    console.log(`[GATO] Turno cambiado a: ${partida.jugadores[partida.turno].username}`);
                }

                // Resetea pregunta pendiente
                partida.preguntaActual = null; 
                partida.celdaPendiente = null;
                
                // Emite estado actualizado
                emitirEstado(salaId);
            });
        },

        // Limpieza cuando un jugador se desconecta
        cleanup: (socket) => {
            console.log(`[GATO CLEANUP] 🧹 Limpiando socket ${socket.id}`);
            
            for (const salaId in partidasGato) {
                const partida = partidasGato[salaId];
                const jugadorIndex = partida.jugadores.findIndex(j => j.socketId === socket.id);
                
                if (jugadorIndex !== -1) {
                    const jugadorDesconectado = partida.jugadores[jugadorIndex];
                    console.log(`[GATO] 👋 ${jugadorDesconectado.username} desconectado de sala ${salaId}`);
                    
                    partida.jugadores.splice(jugadorIndex, 1);

                    // Si ya no quedan jugadores, elimina la sala
                    if (partida.jugadores.length === 0) { 
                        delete partidasGato[salaId]; 
                        console.log(`[GATO] 🗑️  Sala ${salaId} eliminada - sin jugadores`); 
                        return; 
                    }

                    // Si la partida estaba en curso, la termina
                    if (partida.gameStarted) {
                        partida.gameOver = true; 
                        partida.ganador = null;
                        io.to(salaId).emit('gato:error', { 
                            message: `${jugadorDesconectado.username} se ha desconectado.` 
                        });
                    }

                    emitirEstado(salaId);
                    return;
                }
            }
        }
    };
};