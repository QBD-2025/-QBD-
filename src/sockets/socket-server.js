// EN: src/sockets/socket-server.js

const { seleccionarPalabraAleatoria } = require('./socket-helpers');

module.exports = (io, pool) => {
  // Estado compartido entre todos los juegos
  const state = {
    salas: {},
    confrontationRooms: {},
    salasSerpientes: {},
    salasSopa: {},
    partidasGato: {} // <-- AÑADIDO: Estado específico para las partidas de Gato
  };

  // Configuraciones comunes
  const config = {
    sopaLetras: {
      ROWS: 10,
      COLS: 10,
      ALPHABET: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
      MAX_ERRORS: 4
    }
  };

  // Funciones comunes (se quedan igual)
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

  // ===================================================================
  // ¡FUNCIÓN ESENCIAL AÑADIDA!
  // Busca el socket de un usuario a partir de su ID de la base de datos.
  // Es crucial para enviar invitaciones o mensajes directos.
  // NOTA: Esto solo funciona si compartes la sesión de Express con Socket.IO en tu app.js
  // ===================================================================
  const findSocketByUserId = async (userId) => {
    const sockets = await io.fetchSockets();
    const userIdNum = parseInt(userId, 10);

    for (const socket of sockets) {
      if (socket.request.session.user && socket.request.session.user.id_usuario === userIdNum) {
        // Añadimos el username al objeto socket para fácil acceso
        socket.username = socket.request.session.user.username;
        return socket;
      }
    }
    return null; // No se encontró
  };

  // Exportamos todo lo que los demás módulos puedan necesitar
  return {
    io,
    pool,
    state,
    config,
    seleccionarPalabraAleatoria,
    endConfrontationGame,
    findSocketByUserId // <-- ¡Exportamos la nueva función!
  };
};