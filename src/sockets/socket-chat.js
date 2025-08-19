module.exports = (base) => {
  const { io } = base;

  return {
    init: (socket) => {
      socket.on('mensajeChat', ({ salaId, mensaje, usuario }) => {
        io.to(salaId).emit('nuevoMensaje', { usuario, mensaje });
      });
    },
    
    cleanup: (socket) => {
      // No se necesita limpieza específica para el chat
    }
  };
};