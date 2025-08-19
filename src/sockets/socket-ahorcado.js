module.exports = (base) => {
  const { io, state, pool, seleccionarPalabraAleatoria } = base;

  return {
    init: (socket) => {
      // --- LÓGICA MODO COOPERATIVO ---
      socket.on('unirseSala', async ({ salaId, usuario, idMateria }) => {
        socket.join(salaId);
        if (!state.salas[salaId]) {
          const { palabra, pista } = await seleccionarPalabraAleatoria(pool, idMateria);
          state.salas[salaId] = {
            palabraSecreta: palabra,
            pista: pista,
            letrasCorrectas: [],
            letrasIncorrectas: [],
            jugadores: [],
            idMateria: idMateria 
          };
        }
        io.to(salaId).emit('estadoPartida', state.salas[salaId]);
      });

      socket.on('intentarLetra', ({ salaId, letra }) => {
        const sala = state.salas[salaId];
        if (!sala) return;
        letra = letra.toUpperCase();

        if (sala.palabraSecreta.includes(letra)) {
          if (!sala.letrasCorrectas.includes(letra)) sala.letrasCorrectas.push(letra);
        } else {
          if (!sala.letrasIncorrectas.includes(letra)) sala.letrasIncorrectas.push(letra);
        }
        
        const palabraCompleta = sala.palabraSecreta.split('').every(l => sala.letrasCorrectas.includes(l));
        const perdieron = sala.letrasIncorrectas.length >= 10;

        if (palabraCompleta) {
          io.to(salaId).emit('juegoTerminado', { ganador: true, palabra: sala.palabraSecreta });
        } else if (perdieron) {
          io.to(salaId).emit('juegoTerminado', { ganador: false, palabra: sala.palabraSecreta });
        } else {
          io.to(salaId).emit('estadoPartida', sala);
        }
      });
      
      socket.on('reiniciarJuego', async ({ salaId, idMateria }) => {
        const sala = state.salas[salaId];
        if (!sala) return;
        const { palabra, pista } = await seleccionarPalabraAleatoria(pool, idMateria);
        sala.palabraSecreta = palabra;
        sala.pista = pista;
        sala.letrasCorrectas = [];
        sala.letrasIncorrectas = [];
        io.to(salaId).emit('estadoPartida', sala);
      });

      // --- LÓGICA MODO ENFRENTAMIENTO ---
      socket.on('joinConfrontation', ({ salaId, usuario, userId }) => {
        socket.join(salaId);

        if (!state.confrontationRooms[salaId]) {
          state.confrontationRooms[salaId] = { players: [], started: false, categoryProposal: null };
          console.log(`Sala de enfrentamiento ${salaId} creada.`);
        }
        const room = state.confrontationRooms[salaId];

        const playerExists = room.players.some(p => p.userId === userId);
        if (!playerExists && room.players.length < 2) {
          room.players.push({ socketId: socket.id, userId, username: usuario });
          console.log(`Jugador ${usuario} se unió a ${salaId}. Jugadores: ${room.players.length}`);
        }

        if (room.players.length === 1) {
          io.to(socket.id).emit('enfrentamiento:esperandoOponente');
        }
        if (room.players.length === 2) {
          const proposer = room.players[0];
          const voter = room.players[1];
          
          io.to(proposer.socketId).emit('enfrentamiento:iniciarVotacion');
          io.to(voter.socketId).emit('enfrentamiento:nuevaPropuesta', {
            proponente: 'Oponente',
            textoMateria: 'Esperando propuesta...'
          });
        }
      });

      // ... (resto de los eventos del ahorcado)
    },

    cleanup: (socket) => {
      // Limpieza de salas de ahorcado al desconectarse
      for (let salaId in state.salas) {
        if (state.salas[salaId].jugadores.some(j => j.socketId === socket.id)) {
          socket.to(salaId).emit('jugadorDesconectado', { socketId: socket.id });
          delete state.salas[salaId];
        }
      }
      
      // Limpieza de salas de enfrentamiento
      for (let salaId in state.confrontationRooms) {
        const room = state.confrontationRooms[salaId];
        const playerIndex = room.players.findIndex(p => p.socketId === socket.id);
        if (playerIndex !== -1) {
          socket.to(salaId).emit('gameOver', { winner: null, message: "Tu oponente se ha desconectado." });
          if (room.timer) clearInterval(room.timer);
          delete state.confrontationRooms[salaId];
        }
      }
    }
  };
};