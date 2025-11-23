// index.js (así es como debe quedar)
const baseSocket = require('./socket-server.js');
const ahorcadoSocket = require('./socket-ahorcado.js');
const serpientesSocket = require('./serpientes.js');
const chatSocket = require('./socket-chat.js');
const SopaLetrasSocket = require('./socket-sopa.js'); // El que acabamos de corregir
const gatoSocket = require('./socket-gato.js'); // Asegúrate de que este archivo existe

module.exports = (io, pool) => {
    const base = baseSocket(io, pool);
    
    // Inicializar TODOS los handlers, incluyendo el de la sopa
    const handlers = {
        ahorcado: ahorcadoSocket(base),
        serpientes: serpientesSocket(base),
        chat: chatSocket(base),
        sopaLetras: SopaLetrasSocket(base), // ¡Correcto!
        gato: gatoSocket(base) // Nuevo handler para el juego del gato
    };

    io.on('connection', (socket) => {
        console.log('Jugador conectado', socket.id);
        
        // Ejecutar la función 'init' de cada handler para el nuevo socket
        Object.values(handlers).forEach(handler => handler.init(socket));
        
        socket.on('disconnect', () => {
            console.log('Jugador desconectado', socket.id);
            
            // Ejecutar la función 'cleanup' de cada handler
            Object.values(handlers).forEach(handler => handler.cleanup(socket));
        });
    });
}; 