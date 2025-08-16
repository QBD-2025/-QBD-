// 🟢 CÓDIGO CORREGIDO Y UNIFICADO

const express = require('express');
const exphbs = require('express-handlebars');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();
const mysql = require("mysql2/promise");
const bcrypt = require("bcrypt");
const session = require("express-session");
const mailer = require('./src/public/utils/mail.js');
const passport = require('passport');
require('./src/config/passport-config');

// ================== MYSQL ==================
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'quebuendato',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// ================== EXPRESS + HTTP SERVER ==================
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:3005",
        methods: ["GET", "POST"]
    }
});

// ================== HANDLEBARS ==================
app.engine('.hbs', exphbs.engine({
    defaultLayout: 'main',
    layoutsDir: path.join(__dirname, 'src', 'views', 'layouts'),
    partialsDir: path.join(__dirname, 'src', 'views', 'partials'),
    extname: '.hbs',
    helpers: {
        eq: (a, b) => a === b,
        lower: (str) => str.toLowerCase(),
        inc: (value) => parseInt(value) + 1,
        json: context => JSON.stringify(context),
        sum: (a, b) => a + b
    }
}));
app.set('view engine', '.hbs');
app.set('views', path.join(__dirname, 'src', 'views'));

// ================== MIDDLEWARES ==================
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'src', 'public')));
app.use(express.static(path.join(__dirname, 'src', 'media')));
app.use('/media', express.static(path.join(__dirname, 'src', 'media')));
app.use('/Audio', express.static(path.join(__dirname, 'src', 'Audio')));
app.use('/animacion_frames_p', express.static(path.join(__dirname, 'src','media','animacion_frames_p')));
app.use('/images', express.static(path.join(__dirname, 'src', 'public', 'media', 'images')));

// ================== SESIONES Y PASSPORT ==================
app.use(session({
    secret: process.env.SESSION_SECRET || 'clave_segura_ganopapa',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 }
}));
app.use(passport.initialize());
app.use(passport.session());

// ================== MIDDLEWARES PERSONALIZADOS ==================
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    next();
});

app.use((req, res, next) => {
    req.pool = pool;
    req.mailer = mailer;
    req.bcrypt = bcrypt;
    // Adjuntamos 'io' al request para poder usarlo en los routers
    req.io = io;
    next();
});

// ================== RUTAS ==================
const gatoR = require('./src/router/gatoR.js');
const serpEscalerasR = require("./src/router/Escaleras_serpientes.js");
const sopaLetrasR = require("./src/router/sopa_letrasR.js");
const invitacionesR = require('./src/router/invitacionesR.js');
const ahorcadoR = require('./src/router/ahorcadoR.js');
// ... (resto de tus rutas)
const examenAdmisionR = require('./src/router/examen-admision.js');
const simuladorR = require('./src/router/simuladorR');
const editorR = require('./src/router/editorR');
const usuarioR = require('./src/router/usuarioR');
const formulario1R = require('./src/router/formulario1');
const adminR = require('./src/router/adminR');
const generalR = require('./src/router/generalR');
const googleR = require('./src/router/googleR');
const loginR = require('./src/router/loginR');
const registerR = require('./src/router/registerR');
const verifyR = require('./src/router/verificationR');
const recoveryR = require('./src/router/passResetR');
const profileR = require('./src/router/profileR');
const materiasR = require('./src/router/materiasR');
const minijuegosR = require('./src/router/minijuegosR');
const datoR = require('./src/router/datoR.js');
const examenR = require('./src/router/examenR');
const competitivoR = require('./src/router/competitivoR.js');
const notificacionesR = require('./src/router/notificacionesR.js');


app.use('/', gatoR);
app.use('/', serpEscalerasR);
app.use('/', sopaLetrasR);
app.use('/', invitacionesR);
app.use('/', ahorcadoR);
// ... (resto de tus app.use)
app.use('/', examenAdmisionR);
app.use('/', notificacionesR);
app.use('/', competitivoR);
app.use('/', simuladorR);
app.use('/', examenR);
app.use('/', datoR);
app.use('/editor', editorR);
app.use('/', usuarioR);
app.use('/', formulario1R);
app.use('/admin', adminR);
app.use('/', googleR);
app.use('/', loginR);
app.use('/', registerR);
app.use('/', verifyR);
app.use('/', recoveryR);
app.use('/', profileR);
app.use('/', generalR);
app.use('/', materiasR);
app.use('/', minijuegosR);


// Ruta para vista cooperativa
app.get('/ahorcado_cooperativo', (req, res) => {
    res.render('ahorcado_competitivo', { modo: 'cooperativo' });
});

// ================== SOCKET.IO ==================
// Variables para gestionar las salas de los juegos
let salas = {};
let confrontationRooms = {};

const palabrasPorCategoria = {
    programacion: ["VARIABLE", "FUNCION", "JAVASCRIPT", "PYTHON", "HTML", "CSS", "ALGORITMO"],
    basededatos: ["TABLA", "COLUMNA", "SQL", "PRIMARYKEY", "FOREIGNKEY", "RELACION", "INDEX"]
};

function seleccionarPalabraAleatoria(categoria = 'programacion') {
    const palabras = palabrasPorCategoria[categoria] || palabrasPorCategoria.programacion;
    return palabras[Math.floor(Math.random() * palabras.length)];
}

// 🟢 INICIA EL ÚNICO BLOQUE io.on('connection')
io.on('connection', (socket) => {
    console.log('Jugador conectado', socket.id);

    // --- Lógica del modo Cooperativo ---
    socket.on('unirseSala', ({ salaId, usuario, categoria }) => {
        try {
            if (!salaId) throw new Error('No se proporcionó salaId');
            socket.join(salaId);
            console.log(`Usuario ${usuario} intentando unirse a sala cooperativa ${salaId}`);

            if (!salas[salaId]) {
                const palabraSecreta = seleccionarPalabraAleatoria(categoria);
                salas[salaId] = {
                    palabraSecreta: palabraSecreta,
                    letrasCorrectas: [],
                    letrasIncorrectas: [],
                    jugadores: [],
                    categoria: categoria || 'programacion'
                };
                console.log(`Nueva sala cooperativa creada: ${salaId} con palabra: ${palabraSecreta}`);
            }

            if (!salas[salaId].jugadores.includes(socket.id)) {
                salas[salaId].jugadores.push(socket.id);
            }

            io.to(salaId).emit('estadoPartida', salas[salaId]);
            io.to(salaId).emit('nuevoMensaje', { usuario: 'Sistema', mensaje: `${usuario} se ha unido al juego` });
        } catch (error) {
            console.error('Error en unirseSala:', error.message);
            socket.emit('error', { mensaje: error.message });
        }
    });

    socket.on('reiniciarJuego', ({ salaId, categoria }) => {
        try {
            const sala = salas[salaId];
            if (!sala) throw new Error('Sala no encontrada para reiniciar');
            sala.palabraSecreta = seleccionarPalabraAleatoria(categoria || sala.categoria);
            sala.letrasCorrectas = [];
            sala.letrasIncorrectas = [];
            io.to(salaId).emit('estadoPartida', sala);
            io.to(salaId).emit('nuevoMensaje', { usuario: 'Sistema', mensaje: 'El juego ha sido reiniciado' });
        } catch (error) {
            console.error('Error al reiniciar juego:', error.message);
        }
    });

    // --- Lógica del modo Enfrentamiento ---
    socket.on('joinConfrontation', ({ salaId, usuario, userId, categoria }) => {
        try {
            if (!salaId) throw new Error('Sala ID no proporcionada para enfrentamiento');
            socket.join(salaId);

            if (!confrontationRooms[salaId]) {
                confrontationRooms[salaId] = { players: [], gameState: null, timer: null, started: false };
            }

            const room = confrontationRooms[salaId];
            const playerExists = room.players.some(p => p.id === userId);
            if (!playerExists) {
                room.players.push({ id: userId, username: usuario, socketId: socket.id });
            }

            if (room.players.length === 2 && !room.started) {
                room.started = true;
                const palabra1 = seleccionarPalabraAleatoria(categoria);
                const palabra2 = seleccionarPalabraAleatoria(categoria);
                
                room.gameState = {
                    player1: { id: room.players[0].id, palabraSecreta: palabra1, letrasCorrectas: [], letrasIncorrectas: [], score: 0 },
                    player2: { id: room.players[1].id, palabraSecreta: palabra2, letrasCorrectas: [], letrasIncorrectas: [], score: 0 },
                    gameTime: 120, // 2 minutos
                };

                room.timer = setInterval(() => {
                    if (room.gameState) {
                        room.gameState.gameTime--;
                        if (room.gameState.gameTime <= 0) {
                            clearInterval(room.timer);
                            endConfrontationGame(salaId);
                        }
                        io.to(salaId).emit('confrontationUpdate', { gameState: room.gameState, gameStarted: true });
                    } else {
                        clearInterval(room.timer);
                    }
                }, 1000);
            }

            io.to(salaId).emit('confrontationUpdate', {
                opponent: room.players.find(p => p.id !== userId),
                gameState: room.gameState,
                gameStarted: room.started
            });
        } catch (error) {
            console.error('Error en joinConfrontation:', error);
        }
    });

    // --- Lógica Común para ambos modos ---
    socket.on('intentarLetra', ({ salaId, letra }) => {
        letra = letra.toUpperCase();

        // Determina si es una sala cooperativa o de enfrentamiento
        if (salas[salaId]) {
            // Lógica para modo cooperativo
            const sala = salas[salaId];
            if (sala.palabraSecreta.includes(letra)) {
                if (!sala.letrasCorrectas.includes(letra)) sala.letrasCorrectas.push(letra);
            } else {
                if (!sala.letrasIncorrectas.includes(letra)) sala.letrasIncorrectas.push(letra);
            }
            
            const palabraCompleta = sala.palabraSecreta.split('').every(l => sala.letrasCorrectas.includes(l));
            const perdieron = sala.letrasIncorrectas.length >= 9;

            if (palabraCompleta) {
                io.to(salaId).emit('juegoTerminado', { ganador: true, palabra: sala.palabraSecreta });
            } else if (perdieron) {
                io.to(salaId).emit('juegoTerminado', { ganador: false, palabra: sala.palabraSecreta });
            } else {
                io.to(salaId).emit('estadoPartida', sala);
            }
        } else if (confrontationRooms[salaId]) {
            // Lógica para modo enfrentamiento (si es necesario manejarlo aquí)
            // Esta lógica ya está en tu cliente, pero podrías validarla en el servidor si quisieras.
        }
    });
    
    socket.on('mensajeChat', ({ salaId, mensaje, usuario }) => {
        try {
            if (!salaId || !mensaje || !usuario) return;
            io.to(salaId).emit('nuevoMensaje', { usuario, mensaje });
        } catch (error) {
            console.error('Error en mensajeChat:', error);
        }
    });

    // --- Lógica de Desconexión ---
    socket.on('disconnect', () => {
        console.log('Jugador desconectado', socket.id);
        // Limpiar de salas cooperativas
        for (let salaId in salas) {
            salas[salaId].jugadores = salas[salaId].jugadores.filter(id => id !== socket.id);
            if (salas[salaId].jugadores.length === 0) {
                console.log(`Eliminando sala cooperativa vacía: ${salaId}`);
                delete salas[salaId];
            }
        }
        // Limpiar de salas de enfrentamiento
        for (let salaId in confrontationRooms) {
            const room = confrontationRooms[salaId];
            const playerIndex = room.players.findIndex(p => p.socketId === socket.id);
            if (playerIndex !== -1) {
                console.log(`Jugador desconectado del enfrentamiento en sala: ${salaId}`);
                // Notificar al otro jugador que el oponente se fue
                socket.to(salaId).emit('opponentDisconnected');
                // Limpiar la sala
                if (room.timer) clearInterval(room.timer);
                delete confrontationRooms[salaId];
            }
        }
    });

    // Función auxiliar para el modo enfrentamiento
    function endConfrontationGame(salaId) {
        const room = confrontationRooms[salaId];
        if (!room || !room.gameState) return;
        
        let winner = null;
        if (room.gameState.player1.score > room.gameState.player2.score) {
            winner = room.gameState.player1.id;
        } else if (room.gameState.player2.score > room.gameState.player1.score) {
            winner = room.gameState.player2.id;
        }
        
        io.to(salaId).emit('gameOver', { winner });
        
        // Limpiar la sala
        if (room.timer) clearInterval(room.timer);
        delete confrontationRooms[salaId];
    }
});
// 🔴 FIN DEL ÚNICO BLOQUE io.on('connection')


// ================== LEVANTAR SERVIDOR ==================
const PORT = process.env.PORT || 3005;
server.listen(PORT, () => {
    console.log(`Servidor con Socket.IO corriendo en http://localhost:${PORT}`);
});