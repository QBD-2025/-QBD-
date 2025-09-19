module.exports = (base) => {
  const { io } = base;

  return {
    init: (socket) => {
      socket.on('mensajeChat', ({ salaId, mensaje, usuario }) => {
      });
    },
    
    cleanup: (socket) => {
      // No se necesita limpieza específica para el chat
    }
  };
};