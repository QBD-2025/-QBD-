module.exports = (base) => {
  const { io, state, config } = base;

  return {
    init: (socket) => {
      socket.on('serpientes:unirse', ({ salaId, usuario }) => {
        socket.join(salaId);

        if (!state.salasSerpientes[salaId]) {
          state.salasSerpientes[salaId] = {
            jugadores: [],
            turnoActual: 0,
            dado: 0,
            ganador: null,
            config: config.serpientes
          };
        }

        const sala = state.salasSerpientes[salaId];
        if (sala.jugadores.length < 4 && !sala.jugadores.some(p => p.id === usuario.id_usuario)) {
          sala.jugadores.push({
            id: usuario.id_usuario,
            username: usuario.username,
            posicion: 1
          });
        }
        
        io.to(salaId).emit('serpientes:estado', sala);
      });
      
      socket.on('serpientes:lanzarDado', ({ salaId, userId }) => {
        const sala = state.salasSerpientes[salaId];
        if (!sala || sala.ganador) return;

        const jugadorActual = sala.jugadores[sala.turnoActual];
        if (jugadorActual.id !== userId) return;
        
        const valorDado = Math.floor(Math.random() * 6) + 1;
        sala.dado = valorDado;
        
        const posicionPotencial = jugadorActual.posicion + valorDado;
        
        if (posicionPotencial > sala.config.winPosition) {
          const casillasDeRebote = posicionPotencial - sala.config.winPosition;
          jugadorActual.posicion = sala.config.winPosition - casillasDeRebote;
        } else {
          jugadorActual.posicion = posicionPotencial;
        }

        if (sala.config.snakesAndLadders[jugadorActual.posicion]) {
          jugadorActual.posicion = sala.config.snakesAndLadders[jugadorActual.posicion];
        }
        
        if (jugadorActual.posicion === sala.config.winPosition) {
          sala.ganador = jugadorActual;
        } else {
          if (valorDado !== 6) {
            sala.turnoActual = (sala.turnoActual + 1) % sala.jugadores.length;
          }
        }
        
        io.to(salaId).emit('serpientes:estado', sala);
      });

      socket.on('serpientes:reiniciar', ({ salaId }) => {
        const sala = state.salasSerpientes[salaId];
        if (!sala) return;

        sala.jugadores.forEach(j => j.posicion = 1);
        sala.turnoActual = 0;
        sala.ganador = null;
        sala.dado = 0;
        
        io.to(salaId).emit('serpientes:estado', sala);
      });
    },

    cleanup: (socket) => {
      // Limpieza de salas de serpientes al desconectarse
      for (let salaId in state.salasSerpientes) {
        const sala = state.salasSerpientes[salaId];
        sala.jugadores = sala.jugadores.filter(j => j.socketId !== socket.id);
        
        if (sala.jugadores.length === 0) {
          delete state.salasSerpientes[salaId];
        }
      }
    }
  };
};