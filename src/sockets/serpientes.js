// En: src/sockets/serpientes.js
module.exports = (base) => {
    const { io, state, config } = base;

    // Función para emitir el estado actualizado a la sala
    const emitirEstado = (salaId) => {
        io.to(salaId).emit('serpientes:estado', state.salasSerpientes[salaId]);
    };

    return {
        init: (socket) => {
            socket.on('serpientes:unirse', ({ salaId, usuario }) => {
                socket.join(salaId);

                // Si la sala no existe, la creamos
                if (!state.salasSerpientes[salaId]) {
                    state.salasSerpientes[salaId] = {
                        jugadores: [],
                        turnoActualIndex: 0,
                        dado: 0,
                        ganador: null,
                        log: [], // Novedad: Log de eventos para el cliente
                        config: config.serpientes
                    };
                }

                const sala = state.salasSerpientes[salaId];

                // Novedad: Manejo de sala llena
                if (sala.jugadores.length >= 4 && !sala.jugadores.some(p => p.id === usuario.id_usuario)) {
                    socket.emit('serpientes:error', { mensaje: 'La sala está llena.' });
                    return;
                }

                // Añadir jugador si no existe
                if (!sala.jugadores.some(p => p.id === usuario.id_usuario)) {
                    sala.jugadores.push({
                        id: usuario.id_usuario,
                        socketId: socket.id, // Novedad: Guardamos el socket.id para el cleanup
                        username: usuario.username,
                        posicion: 1
                    });
                }
                
                sala.log.push(`${usuario.username} se ha unido a la partida.`);
                emitirEstado(salaId);
            });
            
            socket.on('serpientes:lanzarDado', ({ salaId, userId }) => {
                const sala = state.salasSerpientes[salaId];
                if (!sala || sala.ganador) return;

                const jugadorActual = sala.jugadores[sala.turnoActualIndex];
                if (jugadorActual.id !== userId) return; // No es su turno
                
                const valorDado = Math.floor(Math.random() * 6) + 1;
                sala.dado = valorDado;
                sala.log.push(`${jugadorActual.username} ha sacado un ${valorDado}.`);

                let posicionAnterior = jugadorActual.posicion;
                let posicionPotencial = posicionAnterior + valorDado;
                
                // Lógica de rebote si se pasa de 100
                if (posicionPotencial > sala.config.winPosition) {
                    posicionPotencial = sala.config.winPosition - (posicionPotencial - sala.config.winPosition);
                }
                
                jugadorActual.posicion = posicionPotencial;

                // Novedad: Revisar serpientes y escaleras y añadir al log
                const especial = sala.config.snakesAndLadders[jugadorActual.posicion];
                if (especial) {
                    const tipo = especial > jugadorActual.posicion ? 'escalera' : 'serpiente';
                    sala.log.push(`¡${jugadorActual.username} encontró una ${tipo}!`);
                    jugadorActual.posicion = especial;
                }
                
                // Revisar si hay un ganador
                if (jugadorActual.posicion === sala.config.winPosition) {
                    sala.ganador = jugadorActual;
                    sala.log.push(`🎉 ¡${jugadorActual.username} ha ganado la partida! 🎉`);
                } else {
                    // Pasar el turno (si no sacó 6)
                    if (valorDado !== 6) {
                        sala.turnoActualIndex = (sala.turnoActualIndex + 1) % sala.jugadores.length;
                    } else {
                        sala.log.push(`${jugadorActual.username} saca de nuevo por obtener un 6.`);
                    }
                }
                
                emitirEstado(salaId);
            });
            // Puedes añadir el 'serpientes:reiniciar' aquí si quieres esa funcionalidad
        },

        cleanup: (socket) => {
            // Novedad: Lógica de limpieza mejorada
            for (const salaId in state.salasSerpientes) {
                const sala = state.salasSerpientes[salaId];
                const jugadorIndex = sala.jugadores.findIndex(j => j.socketId === socket.id);

                if (jugadorIndex !== -1) {
                    const jugadorDesconectado = sala.jugadores[jugadorIndex];
                    sala.log.push(`${jugadorDesconectado.username} se ha desconectado.`);
                    
                    // Eliminar al jugador
                    sala.jugadores.splice(jugadorIndex, 1);
                    
                    // Si ya no hay jugadores, eliminar la sala
                    if (sala.jugadores.length === 0) {
                        delete state.salasSerpientes[salaId];
                        console.log(`Sala ${salaId} de Serpientes eliminada por estar vacía.`);
                        return; // Salimos del bucle
                    }

                    // Si era el turno del jugador desconectado, pasar al siguiente
                    if (sala.turnoActualIndex === jugadorIndex) {
                        // El nuevo índice será el mismo, pero ahora apuntará al siguiente jugador
                        // porque el array se acortó. Hay que asegurarse de no pasarse del límite.
                        sala.turnoActualIndex = sala.turnoActualIndex % sala.jugadores.length;
                    }

                    emitirEstado(salaId);
                }
            }
        }
    };
};

// diego ocupas ayuda??????