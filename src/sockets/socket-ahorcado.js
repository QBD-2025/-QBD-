const { generarTableroSopa, seleccionarPalabraAleatoria } = require('../sockets/sopa-helper.js');

module.exports = (base) => {
    const { io, pool, state } = base;
    const MAX_ERRORES = 4;

    // ======================================================
    // ▼▼▼ FUNCIONES AUXILIARES ▼▼▼
    // ======================================================
    function verificarSeleccion(tablero, seleccion, palabra) {
        const letras = seleccion.map(({ r, c }) => tablero[r][c]);
        return letras.join('') === palabra;
    }

    // ======================================================
    // ▼▼▼ FUNCIÓN PARA TERMINAR PARTIDA COOPERATIVA ▼▼▼
    // ======================================================
    function finalizarCooperativo(salaId, ganador = false, usuario = null) {
        const sala = state.salasSopa[salaId];
        if (!sala || sala.finished) return;

        sala.finished = true;
        io.to(salaId).emit('sopa:fin', { ganador, usuario, tablero: sala.tablero, palabrasEncontradas: sala.palabrasEncontradas });
        setTimeout(() => delete state.salasSopa[salaId], 5000);
    }

    // ======================================================
    // ▼▼▼ MÓDULO PRINCIPAL ▼▼▼
    // ======================================================
    return {
        init: (socket) => {
            console.log('Jugador conectado (Sopa)', socket.id);

            // --- UNIRSE A SALA COOPERATIVA ---
            socket.on('sopa:unirse', async ({ salaId, usuario, idMateria }) => {
                socket.join(salaId);

                if (!state.salasSopa) state.salasSopa = {};
                if (!state.salasSopa[salaId]) {
                    const [palabras] = await pool.query(
                        "SELECT palabra, pista FROM palabras WHERE id_materia = ? ORDER BY RAND() LIMIT 5",
                        [idMateria]
                    );

                    if (!palabras.length) return socket.emit('sopa:error', { message: "No hay palabras disponibles" });

                    const palabrasFormateadas = palabras.map(p => ({ word: p.palabra.toUpperCase(), hint: p.pista }));
                    const tablero = generarTableroSopa(palabrasFormateadas);

                    state.salasSopa[salaId] = {
                        tablero,
                        palabras: palabrasFormateadas,
                        palabrasEncontradas: [],
                        jugadores: [],
                        errores: 0,
                        letrasSeleccionadas: [],
                        idMateria,
                        finished: false
                    };
                }

                const sala = state.salasSopa[salaId];
                if (!sala.jugadores.some(j => j.id === usuario.id_usuario)) {
                    sala.jugadores.push({ id: usuario.id_usuario, username: usuario.username, socketId: socket.id });
                }

                // Emitir estado inicial
                io.to(salaId).emit('sopa:estado', sala);
            });

            // --- SELECCIÓN DE LETRA ---
            socket.on('sopa:seleccionarLetra', ({ salaId, r, c, usuario }) => {
                const sala = state.salasSopa[salaId];
                if (!sala || sala.finished) return;

                // Evitar duplicados
                if (!sala.letrasSeleccionadas.some(l => l.r === r && l.c === c)) {
                    sala.letrasSeleccionadas.push({ r, c, usuario: usuario.username });
                }

                io.to(salaId).emit('sopa:letrasActualizadas', sala.letrasSeleccionadas);
            });

            // --- SELECCIÓN DE PALABRA COMPLETA ---
            socket.on('sopa:seleccion', ({ salaId, usuario, seleccion }) => {
                const sala = state.salasSopa[salaId];
                if (!sala || sala.finished) return;

                const palabraEncontrada = sala.palabras.find(p =>
                    !sala.palabrasEncontradas.includes(p.word) &&
                    verificarSeleccion(sala.tablero, seleccion, p.word)
                );

                if (palabraEncontrada) {
                    sala.palabrasEncontradas.push(palabraEncontrada.word);
                    io.to(salaId).emit('sopa:palabraEncontrada', {
                        palabra: palabraEncontrada.word,
                        usuario,
                        tablero: sala.tablero,
                        palabrasEncontradas: sala.palabrasEncontradas
                    });

                    if (sala.palabrasEncontradas.length === sala.palabras.length) {
                        finalizarCooperativo(salaId, true, usuario);
                    }
                } else {
                    sala.errores++;
                    if (sala.errores >= MAX_ERRORES) {
                        finalizarCooperativo(salaId, false);
                    } else {
                        io.to(salaId).emit('sopa:errorSeleccion', {
                            usuario,
                            erroresRestantes: MAX_ERRORES - sala.errores
                        });
                    }
                }
            });

            // --- REINICIAR JUEGO ---
            socket.on('sopa:reiniciar', async ({ salaId, idMateria }) => {
                const sala = state.salasSopa[salaId];
                if (!sala) return;

                const [palabras] = await pool.query(
                    "SELECT palabra, pista FROM palabras WHERE id_materia = ? ORDER BY RAND() LIMIT 5",
                    [idMateria]
                );

                const palabrasFormateadas = palabras.map(p => ({ word: p.palabra.toUpperCase(), hint: p.pista }));
                sala.tablero = generarTableroSopa(palabrasFormateadas);
                sala.palabras = palabrasFormateadas;
                sala.palabrasEncontradas = [];
                sala.errores = 0;
                sala.letrasSeleccionadas = [];
                sala.finished = false;

                io.to(salaId).emit('sopa:estado', sala);
            });

            // --- LIMPIEZA AL DESCONECTAR ---
            socket.on('disconnect', () => {
                if (!state.salasSopa) return;
                for (const salaId in state.salasSopa) {
                    const sala = state.salasSopa[salaId];
                    sala.jugadores = sala.jugadores.filter(j => j.socketId !== socket.id);
                    if (sala.jugadores.length === 0) delete state.salasSopa[salaId];
                }
            });
        }
    };
};
