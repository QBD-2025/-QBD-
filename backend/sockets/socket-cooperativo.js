// src/sockets/socket-cooperativo.js
const { obtenerPalabraRandom } = require('../utils/palabras.js'); // Función para sacar palabra al azar

// Guardar partidas en memoria (puedes cambiar a DB si quieres)
const partidas = {};

module.exports = (io, socket) => {
    socket.on('unirseSala', ({ salaId, usuario, idMateria }) => {
        socket.join(salaId);
        if (!partidas[salaId]) {
            partidas[salaId] = {
                palabraSecreta: obtenerPalabraRandom(idMateria),
                letrasCorrectas: [],
                letrasIncorrectas: [],
                pista: 'Pista inicial...' // Opcional
            };
        }
        io.to(salaId).emit('estadoPartida', partidas[salaId]);
    });

    socket.on('intentarLetra', ({ salaId, letra }) => {
        const partida = partidas[salaId];
        if (!partida) return;

        letra = letra.toUpperCase();
        if (partida.letrasCorrectas.includes(letra) || partida.letrasIncorrectas.includes(letra)) return;

        if (partida.palabraSecreta.includes(letra)) {
            partida.letrasCorrectas.push(letra);
        } else {
            partida.letrasIncorrectas.push(letra);
        }

        io.to(salaId).emit('estadoPartida', partida);

        // Revisar fin de juego
        const ganada = partida.palabraSecreta.split('').every(l => partida.letrasCorrectas.includes(l));
        if (ganada || partida.letrasIncorrectas.length >= 10) {
            io.to(salaId).emit('juegoTerminado', {
                ganador: ganada,
                palabra: partida.palabraSecreta
            });
            delete partidas[salaId]; // Limpiar la partida
        }
    });

    socket.on('reiniciarJuego', ({ salaId, idMateria }) => {
        partidas[salaId] = {
            palabraSecreta: obtenerPalabraRandom(idMateria),
            letrasCorrectas: [],
            letrasIncorrectas: [],
            pista: 'Pista inicial...'
        };
        io.to(salaId).emit('estadoPartida', partidas[salaId]);
    });
};
