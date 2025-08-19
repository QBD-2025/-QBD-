const { seleccionarPalabraAleatoria } = require('./socket-helpers');

module.exports = (io, pool) => {
  // Estado compartido entre todos los juegos
  const state = {
    salas: {},
    confrontationRooms: {},
    salasSerpientes: {},
    salasSopa: {}
  };

  // Configuraciones comunes
  const config = {
    serpientes: {
      winPosition: 100,
      snakesAndLadders: {
        98: 78, 95: 75, 73: 53, 55: 35, 44: 24, 30: 10, 
        92: 62, 64: 34, 48: 18, 36: 6, 25: 5,
        2: 22, 7: 27, 15: 35, 28: 48, 51: 71, 60: 80, 
        5: 35, 12: 42, 21: 51, 37: 67, 45: 75, 68: 98
      }
    },
    sopaLetras: {
      ROWS: 10,
      COLS: 10,
      ALPHABET: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
      MAX_ERRORS: 4
    }
  };

  // Funciones comunes
  function endConfrontationGame(salaId) {
    const room = state.confrontationRooms[salaId];
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
    delete state.confrontationRooms[salaId];
  }

  return {
    io,
    pool,
    state,
    config,
    seleccionarPalabraAleatoria,
    endConfrontationGame
  };
};