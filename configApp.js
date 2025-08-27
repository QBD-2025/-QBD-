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
global.sesionesActivas = new Set();

// Configuración de la base de datos
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'quebuendato',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Configuración de Express
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:3005",
        methods: ["GET", "POST"]
    }
});

// Configuración de Handlebars con helpers de paginación
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
        sum: (a, b) => a + b,
        calcularProgreso: (puntos) => {
            const maxPuntos = 5000;
            return Math.min(Math.round((puntos / maxPuntos) * 100), 100);
        },
        indexPlusOne: (index) => index + 1,

        // ---------- Helpers de paginación ----------
        add: (a, b) => a + b,
        subtract: (a, b) => a - b,
        gt: (a, b) => a > b,
        lt: (a, b) => a < b,
        ifEquals: (a, b, options) => a == b ? options.fn(this) : options.inverse(this),
        range: (from, to) => {
            let arr = [];
            for (let i = from; i <= to; i++) arr.push(i);
            return arr;
        }
    }
}));
app.set('view engine', '.hbs');
app.set('views', path.join(__dirname, 'src', 'views'));

// Middlewares
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'src', 'public')));
app.use(express.static(path.join(__dirname, 'src', 'media')));
app.use('/media', express.static(path.join(__dirname, 'src', 'media')));
app.use('/Audio', express.static(path.join(__dirname, 'src', 'Audio')));
app.use('/animacion_frames_p', express.static(path.join(__dirname,'src','media','animacion_frames_p')));
app.use('/images', express.static(path.join(__dirname, 'src', 'public', 'media', 'images')));

// Configuración de sesiones
app.use(session({
    secret: process.env.SESSION_SECRET || 'clave_segura_ganopapa',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 }
}));
app.use(passport.initialize());
app.use(passport.session());

// Middlewares personalizados
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    next();
});

app.use((req, res, next) => {
    req.pool = pool;
    req.mailer = mailer;
    req.bcrypt = bcrypt;
    req.io = io;
    next();
});

// ---------- Rutas ----------
const ligasR = require('./src/router/ligasR.js');
const sopaR = require('./src/router/sopaR.js');
const gatoR = require('./src/router/gatoR.js');
const serpEscalerasR = require("./src/router/Escaleras_serpientes.js");
const sopaLetrasR = require("./src/router/sopa_letrasR.js");
const invitacionesR = require('./src/router/invitacionesR.js');
const ahorcadoR = require('./src/router/ahorcadoR.js');
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
const rankingR = require('./src/router/rankingR');

// Registrar rutas
app.use('/', rankingR);
app.use('/', sopaR);
app.use('/', gatoR);
app.use('/', serpEscalerasR);
app.use('/', sopaLetrasR);
app.use('/', invitacionesR);
app.use('/', ahorcadoR);
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
app.use('/', ligasR);

// Ruta ejemplo para cooperativo
app.get('/ahorcado_cooperativo', (req, res) => {
    res.render('ahorcado_competitivo', { modo: 'cooperativo' });
});

// Configuración de Socket.io
require('./src/sockets/index.js')(io, pool);

// Iniciar servidor
const PORT = process.env.PORT || 3005;
server.listen(PORT, () => {
    console.log(`Servidor con Socket.IO corriendo en http://localhost:${PORT}`);
});
