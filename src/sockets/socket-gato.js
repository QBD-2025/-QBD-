// En: src/sockets/gato-socket.js

// Lista de preguntas para no depender del cliente
const questions = [
    { question: "¿Cuál es la capital de Francia?", options: ["Londres", "París", "Madrid", "Berlín"], answer: 1 },
    { question: "¿Quién pintó la Mona Lisa?", options: ["Picasso", "van Gogh", "da Vinci", "Monet"], answer: 2 },
    { question: "¿Cuál es el río más largo del mundo?", options: ["Nilo", "Amazonas", "Yangtsé", "Misisipi"], answer: 1 },
    { question: "¿En qué año llegó el hombre a la Luna?", options: ["1965", "1969", "1972", "1958"], answer: 1 },
    { question: "¿Qué planeta es conocido como el 'planeta rojo'?", options: ["Venus", "Júpiter", "Marte", "Saturno"], answer: 2 }
];

const getNewGameState = (player1, player2) => ({
    board: Array(9).fill(null),
    players: [
        { id: player1.userId, username: player1.username, symbol: 'X' },
        { id: player2.userId, username: player2.username, symbol: 'O' }
    ],
    scores: { [player1.userId]: 0, [player2.userId]: 0 },
    currentPlayerIndex: 0,
    gameOver: false,
    winner: null,
    isTie: false,
});

function checkWinner(board) {
    const winningCombinations = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
        [0, 4, 8], [2, 4, 6]            // diagonals
    ];
    for (const combo of winningCombinations) {
        const [a, b, c] = combo;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return board[a]; // Retorna el símbolo ganador ('X' o 'O')
        }
    }
    if (!board.includes(null)) {
        return 'tie'; // Es un empate
    }
    return null; // No hay ganador todavía
}


module.exports = (base) => {
    const { io, state } = base;

    // Inicializamos el contenedor para las salas de Gato si no existe
    if (!state.gatoRooms) {
        state.gatoRooms = {};
    }

    return {
        init: (socket) => {
            // Unirse a una sala de Gato
            socket.on('gato:unirse', ({ salaId, usuario }) => {
                socket.join(salaId);
                let room = state.gatoRooms[salaId];

                if (!room) {
                    // Si la sala no existe, el jugador 1 la crea
                    state.gatoRooms[salaId] = {
                        players: [{ userId: usuario.id_usuario, username: usuario.username, socketId: socket.id }],
                        gameState: null // El juego no empieza hasta que haya 2 jugadores
                    };
                    io.to(salaId).emit('gato:notification', { message: `${usuario.username} ha creado la sala. Esperando oponente...` });
                } else if (room.players.length === 1 && room.players[0].userId !== usuario.id_usuario) {
                    // Si hay 1 jugador, el jugador 2 se une
                    room.players.push({ userId: usuario.id_usuario, username: usuario.username, socketId: socket.id });
                    room.gameState = getNewGameState(room.players[0], room.players[1]);
                    io.to(salaId).emit('gato:notification', { message: `${usuario.username} se ha unido. ¡Que comience el juego!` });
                }
                
                // Enviamos el estado actual a todos en la sala
                if (state.gatoRooms[salaId].gameState) {
                    io.to(salaId).emit('gato:updateState', state.gatoRooms[salaId].gameState);
                }
            });

            // El jugador en turno quiere hacer un movimiento
            socket.on('gato:prepararMovimiento', ({ salaId, index }) => {
                const room = state.gatoRooms[salaId];
                if (!room || !room.gameState || room.gameState.gameOver) return;
                
                const player = room.players[room.gameState.currentPlayerIndex];
                if (socket.id !== player.socketId) return; // No es su turno

                const question = questions[Math.floor(Math.random() * questions.length)];
                room.currentQuestion = { ...question, cellIndex: index };

                io.to(socket.id).emit('gato:pregunta', room.currentQuestion);
            });

            // El jugador responde la pregunta
            socket.on('gato:responder', ({ salaId, answerIndex }) => {
                const room = state.gatoRooms[salaId];
                if (!room || !room.currentQuestion) return;

                const { question, options, answer, cellIndex } = room.currentQuestion;
                const gameState = room.gameState;
                const player = gameState.players[gameState.currentPlayerIndex];

                if (answerIndex === answer) {
                    // Respuesta correcta
                    gameState.board[cellIndex] = player.symbol;
                    const winnerSymbol = checkWinner(gameState.board);
                    if (winnerSymbol) {
                        gameState.gameOver = true;
                        if (winnerSymbol === 'tie') {
                            gameState.isTie = true;
                        } else {
                            gameState.winner = player;
                            gameState.scores[player.id]++;
                        }
                    } else {
                        // Cambiar turno
                        gameState.currentPlayerIndex = (gameState.currentPlayerIndex + 1) % 2;
                    }
                } else {
                    // Respuesta incorrecta, pierde turno
                    gameState.currentPlayerIndex = (gameState.currentPlayerIndex + 1) % 2;
                    io.to(salaId).emit('gato:notification', { message: `${player.username} falló la pregunta y pierde su turno.` });
                }

                delete room.currentQuestion;
                io.to(salaId).emit('gato:updateState', gameState);
            });
            
            // Jugar de nuevo
            socket.on('gato:nuevoJuego', ({ salaId }) => {
                const room = state.gatoRooms[salaId];
                if (!room || room.players.length < 2) return;

                // Reiniciamos el tablero, pero mantenemos jugadores y puntajes
                const oldScores = room.gameState.scores;
                room.gameState = getNewGameState(room.players[0], room.players[1]);
                room.gameState.scores = oldScores;
                
                io.to(salaId).emit('gato:updateState', room.gameState);
            });
        },
        cleanup: (socket) => {
            // Manejar desconexión
            for (const salaId in state.gatoRooms) {
                const room = state.gatoRooms[salaId];
                const playerIndex = room.players.findIndex(p => p.socketId === socket.id);

                if (playerIndex !== -1) {
                    io.to(salaId).emit('gato:notification', { message: `${room.players[playerIndex].username} se ha desconectado.` });
                    delete state.gatoRooms[salaId];
                    break;
                }
            }
        }
    };
};