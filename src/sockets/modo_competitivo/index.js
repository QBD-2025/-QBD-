// En: src/sockets/index.js
const competitivoHandler = require('./socket-competitivo.js');
// ... probablemente tengas otros handlers aquí ...

module.exports = (io, pool) => { // Asegúrate de que pool esté disponible si lo necesitas
    io.on('connection', (socket) => {
        console.log(`Socket conectado: ${socket.id}`);

        // Registramos el manejador para eventos competitivos
        competitivoHandler(io, socket);

        // Aquí puedes registrar otros manejadores (chat, minijuegos, etc.)
        // otroHandler(io, socket);
        // ...

        socket.on('disconnect', () => {
            console.log(`Socket desconectado: ${socket.id}`);
        });
    });
};