module.exports = (base) => {
    const { io, pool, state } = base;
    const partidasGato = state.partidasGato;

    const emitirEstado = (salaId) => { if (partidasGato[salaId]) { io.to(salaId).emit('gato:estado', partidasGato[salaId]); } };
    const checkWinner = (tablero) => { const c = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]]; for(const i of c){if(tablero[i[0]]&&tablero[i[0]]===tablero[i[1]]&&tablero[i[0]]===tablero[i[2]])return tablero[i[0]];} if(!tablero.includes(null))return'empate'; return null; };
    
    const iniciarPartida = async (salaId, idMateria) => {
        const partida = partidasGato[salaId]; if (!partida) return;
        try {
            // ================================================================
            // MEJORA: Añadimos p.retroalimentacion a la consulta SQL
            // ================================================================
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
                        retroalimentacion: row.retroalimentacion, // Guardamos la retroalimentación
                        opciones: [] 
                    }); 
                } 
                preguntasMap.get(row.id_pregunta).opciones.push({ id: row.id_respuesta, texto: row.respuesta, correcta: Number(row.correcta) }); 
            });

            let todasLasPreguntas = Array.from(preguntasMap.values());
            if (todasLasPreguntas.length < 9) { 
                io.to(salaId).emit('gato:error', { message: `No hay suficientes preguntas (${todasLasPreguntas.length}/9) en esta categoría.` }); 
                partida.votacionEnProgreso = false; partida.votos = {}; partida.propuestaPor = null; partida.propuestaMateriaTexto = null; emitirEstado(salaId); return; 
            }
            todasLasPreguntas.sort(() => Math.random() - 0.5);
            partida.preguntas = todasLasPreguntas.slice(0, 9); 
            partida.gameStarted = true; partida.votacionEnProgreso = false; partida.votos = {}; partida.propuestaPor = null; partida.propuestaMateriaTexto = null; partida.log.push('¡La partida ha comenzado!'); 
            emitirEstado(salaId);
        } catch (error) { console.error("Error al iniciar partida de Gato:", error); io.to(salaId).emit('gato:error', { message: 'Error del servidor al cargar las preguntas.' }); }
    };

    return {
        init: (socket) => {
            socket.on('gato:unirse', ({ salaId, usuario }) => {
                if (!usuario || !usuario.id_usuario) { return console.error("Unión a Gato rechazada: 'usuario' no fue proporcionado."); }
                socket.join(salaId);
                if (!partidasGato[salaId]) {
                    partidasGato[salaId] = { jugadores: [], tablero: Array(9).fill(null), turno: 0, gameStarted: false, gameOver: false, ganador: null, idMateria: null, preguntas: [], preguntaActual: null, celdaPendiente: null, log: [], votacionEnProgreso: false, votos: {}, propuestaPor: null, propuestaMateriaTexto: null };
                }
                const partida = partidasGato[salaId];
                if (partida.gameStarted && !partida.ganador) { return socket.emit('gato:error', { message: 'Esta partida ya ha comenzado.' }); }
                if (partida.jugadores.length >= 2 && !partida.jugadores.some(p => p.id === usuario.id_usuario)) { return socket.emit('gato:error', { message: 'La sala está llena.' }); }
                if (!partida.jugadores.some(p => p.id === usuario.id_usuario)) {
                    partida.jugadores.push({ id: usuario.id_usuario, socketId: socket.id, username: usuario.username, simbolo: partida.jugadores.length === 0 ? 'X' : 'O' });
                }
                partida.log.push(`${usuario.username} se ha unido a la sala.`);
                emitirEstado(salaId);
            });

            socket.on('gato:proponerInicio', ({ salaId, idMateria, textoMateria }) => {
                const partida = partidasGato[salaId];
                const proponente = partida?.jugadores.find(j => j.socketId === socket.id);
                if (!partida || !proponente || partida.gameStarted || partida.votacionEnProgreso || partida.jugadores.length !== 2 || !idMateria) return;
                partida.votacionEnProgreso = true;
                partida.idMateria = idMateria;
                partida.votos = { [proponente.id]: true };
                partida.propuestaPor = proponente.username;
                partida.propuestaMateriaTexto = textoMateria;
                emitirEstado(salaId);
            });
            
            socket.on('gato:votar', ({ salaId, voto }) => {
                const partida = partidasGato[salaId];
                const votante = partida?.jugadores.find(j => j.socketId === socket.id);
                if (!partida || !votante || !partida.votacionEnProgreso || partida.votos[votante.id] !== undefined) return;
                
                partida.votos[votante.id] = voto;
                const todosHanVotado = Object.keys(partida.votos).length === partida.jugadores.length;

                if (!voto) {
                    partida.votacionEnProgreso = false; partida.votos = {}; partida.propuestaPor = null; partida.propuestaMateriaTexto = null;
                    io.to(salaId).emit('gato:votacionCancelada', { motivo: `${votante.username} ha rechazado el inicio.` });
                    emitirEstado(salaId);
                } else if (voto && todosHanVotado) {
                    iniciarPartida(salaId, partida.idMateria);
                }
            });

            socket.on('gato:movimiento', ({ salaId, celda }) => {
                const partida = partidasGato[salaId]; if (!partida || partida.gameOver || partida.preguntaActual) return;
                const jugadorActual = partida.jugadores[partida.turno]; if (jugadorActual.socketId !== socket.id || partida.tablero[celda] !== null) return;
                if (partida.preguntas.length === 0) { partida.gameOver = true; partida.ganador = 'empate'; emitirEstado(salaId); return; }
                partida.celdaPendiente = celda; partida.preguntaActual = partida.preguntas.pop();
                socket.emit('gato:mostrarPregunta', partida.preguntaActual);
            });

            socket.on('gato:respuesta', ({ salaId, respuestaId }) => {
                const partida = partidasGato[salaId]; if (!partida || !partida.preguntaActual) return;
                const jugadorActual = partida.jugadores[partida.turno]; if (jugadorActual.socketId !== socket.id) return;
                
                const opcionCorrecta = partida.preguntaActual.opciones.find(opt => opt.correcta === 1);
                const esCorrecta = (respuestaId == opcionCorrecta.id);

                partida.ultimaJugada = {
                    jugador: jugadorActual,
                    esCorrecta: esCorrecta,
                    preguntaRespondida: partida.preguntaActual,
                    respuestaCorrectaTexto: opcionCorrecta.texto
                };

                if (esCorrecta) {
                    partida.tablero[partida.celdaPendiente] = jugadorActual.simbolo;
                    const resultado = checkWinner(partida.tablero);
                    if (resultado) { 
                        partida.gameOver = true; 
                        partida.ganador = (resultado === 'empate') ? 'empate' : jugadorActual; 
                    }
                }
                
                if (!partida.gameOver) { 
                    partida.turno = (partida.turno + 1) % 2; 
                }
                
                partida.preguntaActual = null; 
                partida.celdaPendiente = null;
                emitirEstado(salaId);
            });
        },
        cleanup: (socket) => {
             for (const salaId in partidasGato) {
                const partida = partidasGato[salaId];
                const jugadorIndex = partida.jugadores.findIndex(j => j.socketId === socket.id);
                if (jugadorIndex !== -1) {
                    const jugadorDesconectado = partida.jugadores[jugadorIndex];
                    partida.jugadores.splice(jugadorIndex, 1);
                    if (partida.jugadores.length === 0) { delete partidasGato[salaId]; console.log(`Sala de Gato ${salaId} eliminada.`); return; }
                    if (partida.gameStarted) {
                        partida.gameOver = true; partida.ganador = null;
                        io.to(salaId).emit('gato:error', { message: `${jugadorDesconectado.username} se ha desconectado.` });
                    }
                    emitirEstado(salaId);
                }
            }
        }
    };
};