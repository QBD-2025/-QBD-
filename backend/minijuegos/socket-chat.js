module.exports = (base) => {
  const { io, state } = base;
  
  // Creamos un historial de mensajes por sala en memoria
  const chatSalas = state.chatSalas || {};
  state.chatSalas = chatSalas;

  return {
    init: (socket) => {
      // Escuchar mensajes del chat
      socket.on('mensajeChat', ({ salaId, mensaje, usuario }) => {
        if (!salaId || !mensaje || !usuario) return;

        // Crear historial si no existe
        if (!chatSalas[salaId]) chatSalas[salaId] = [];

        const nuevoMensaje = {
          usuario,
          mensaje,
          fecha: new Date().toISOString()
        };

        chatSalas[salaId].push(nuevoMensaje);

        // Limitar historial a últimos 50 mensajes
        if (chatSalas[salaId].length > 50) chatSalas[salaId].shift();

        // Emitir mensaje a todos en la sala
        io.to(salaId).emit('mensajeChat', nuevoMensaje);
      });
    },

    cleanup: (socket) => {
      // No es necesario limpiar nada específico para el chat
    }
  };
};
