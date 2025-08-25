const baseSocket = require('./socket-server.js'); // <--- ¡CORREGIDO!
const ahorcadoSocket = require('./socket-ahorcado.js');
const serpientesSocket = require('./serpientes.js');
const chatSocket = require('./socket-chat.js');
const SopaLetrasSocket = require('./socket-sopa.js');
// const GatoSocket=require('./socket-gato.js')
// Importar otros handlers...


module.exports = (io, pool) => {
  // Inicializar base
  const base = baseSocket(io, pool);
  
  // Inicializar todos los handlers
  const handlers = {
    ahorcado: ahorcadoSocket(base),
    serpientes: serpientesSocket(base),
    chat: chatSocket(base),
    sopaLetras: SopaLetrasSocket(base),
    //gato: gatoSocket(base), // <-- AÑADIR ESTA LÍNEA
    // Agregar otros handlers aquí...
  };

  io.on('connection', (socket) => {
    console.log('Jugador conectado', socket.id);
    
    // Inicializar todos los handlers
    Object.values(handlers).forEach(handler => handler.init(socket));
    
    socket.on('disconnect', () => {
      console.log('Jugador desconectado', socket.id);
      
      // Limpiar todos los handlers
      Object.values(handlers).forEach(handler => handler.cleanup(socket));
    });
  });
};