// backend/config/configApp.js
const express = require('express');
const exphbs = require('express-handlebars');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();
const mysql = require('mysql2/promise');
const session = require('express-session');
const passport = require('passport');
require('./passport-config'); // Configuración de Passport
const mailer = require('../utils/mail.js');
const palabrasHelper = require('../minijuegos/socket-helpers'); // Ajusta la ruta según tu estructura

// ------------------ Configuración de la base de datos ------------------
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'quebuendato',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// ------------------ Inicialización de Express ------------------
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "http://localhost:3005", methods: ["GET", "POST"] }
});

// ------------------ Configuración de Handlebars ------------------
app.engine('.hbs', exphbs.engine({
    defaultLayout: 'main',
    layoutsDir: path.join(__dirname, '../views/layouts'),
    partialsDir: path.join(__dirname, '../views/partials'),
    extname: '.hbs',
    helpers: {
            eq: (a, b) => a === b,
            ne: (a, b) => a !== b,
            gt: (a, b) => a > b,
            gte: (a, b) => a >= b,
            lt: (a, b) => a < b,
            lte: (a, b) => a <= b,
            inc: v => parseInt(v) + 1,
            dec: v => parseInt(v) - 1,
            sum: (a, b) => a + b,
            subtract: (a, b) => a - b,
            add: (a, b) => a + b,
            json: ctx => JSON.stringify(ctx),
            ifEquals: (a, b, options) => a == b ? options.fn(this) : options.inverse(this),
            range(start, end) {
            const arr = [];
            for (let i = start; i <= end; i++) {
                arr.push(i);
            }
            return arr;
            },
            ifCond: (v1, op, v2, options) => {
                switch (op) {
                    case '==': return (v1 == v2) ? options.fn(this) : options.inverse(this);
                    case '===': return (v1 === v2) ? options.fn(this) : options.inverse(this);
                    case '!=': return (v1 != v2) ? options.fn(this) : options.inverse(this);
                    case '<': return (v1 < v2) ? options.fn(this) : options.inverse(this);
                    case '<=': return (v1 <= v2) ? options.fn(this) : options.inverse(this);
                    case '>': return (v1 > v2) ? options.fn(this) : options.inverse(this);
                    case '>=': return (v1 >= v2) ? options.fn(this) : options.inverse(this);
                    default: return options.inverse(this);
                }
            }
        }
}));
app.set('view engine', '.hbs');
app.set('views', path.join(__dirname, '../views'));

// ------------------ Middlewares ------------------
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, '../../frontend/uploads')));
app.use('/media', express.static(path.join(__dirname, '../../frontend/media')));
app.use('/css', express.static(path.join(__dirname, '../../frontend/css')));
app.use('/js', express.static(path.join(__dirname, '../../frontend/js')));

// ------------------ Configuración de sesiones ------------------
const sessionMiddleware = session({
    secret: process.env.SESSION_SECRET || 'clave_segura_ganopapa',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 }
});
app.use(sessionMiddleware);
io.engine.use(sessionMiddleware);

// ------------------ Passport ------------------
app.use(passport.initialize());
app.use(passport.session());

// Exponer usuario en vistas
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    req.pool = pool;
    req.mailer = mailer;
    req.io = io;
    next();
});

// ------------------ Routers ------------------
const adminR = require('../routes/admin.router.js');
const examenR = require('../routes/examen.router.js');
const ahorcadoR = require('../routes/ahorcado.router.js');
const chanR = require('../routes/chan.js');
const competitivoR = require('../routes/competitivo.router.js');
const datoR = require('../routes/dato.router.js');
const editorR = require('../routes/editor.router.js');
const escalerasR = require('../routes/Escaleras_serpientes.js');
const examenAdmR = require('../routes/examen-admision.js');
const formulario1R = require('../routes/formulario1.js');
const gatoR = require('../routes/gato.router.js');
const generalR = require('../routes/general.router.js');
const googleR = require('../routes/google.router.js');
const invitacionesR = require('../routes/invitaciones.router.js');
const ligasR = require('../routes/ligas.router.js');
const loginR = require('../routes/login.router.js');
const materiasR = require('../routes/materias.router.js');
const minijuegosR = require('../routes/minijuegos.router.js');
const notificacionesR = require('../routes/notificacion.router.js');
const passResetR = require('../routes/passReset.router.js');
const profileR = require('../routes/profile.router.js');
const rankingR = require('../routes/ranking.router.js');
const rankingCarreraR = require('../routes/ranking_carrera.router.js');
const registerR = require('../routes/register.router.js');
const simuladorR = require('../routes/simulador.router.js');
const sopaLetrasR = require('../routes/sopa_letras.router.js');
const usuarioR = require('../routes/usuario.router.js');
const verificaAdminR = require('../routes/verificaAdmin.router.js');
const verificationR = require('../routes/verification.router.js');

// Montar routers
app.use('/', generalR);
app.use('/', adminR);
app.use('/', examenR);
app.use('/', ahorcadoR);
app.use('/', chanR);
app.use('/', competitivoR);
app.use('/', datoR);
app.use('/editor', editorR);
app.use('/', escalerasR);
app.use('/', examenAdmR);
app.use('/', formulario1R);
app.use('/', gatoR);
app.use('/', googleR);
app.use('/', invitacionesR);
app.use('/', ligasR);
app.use('/', loginR);
app.use('/', materiasR);
app.use('/', minijuegosR);
app.use('/notificaciones', notificacionesR);
app.use('/', passResetR);
app.use('/', profileR);
app.use('/', rankingR);
app.use('/', rankingCarreraR);
app.use('/', registerR);
app.use('/', simuladorR);
app.use('/', sopaLetrasR);
app.use('/', usuarioR);
app.use('/', verificaAdminR);
app.use('/', verificationR);

// ------------------ Sockets ------------------
require('../sockets/index.js')(io, pool, palabrasHelper.seleccionarPalabraAleatoria);
require('../sockets/socket-competitivo.js')(io, pool);

// ------------------ Variables globales ------------------
global.salasPendientes = new Map();
global.usuariosConectados = new Map();
global.crearSalaPendiente = (retador, retado, io) => {
    const salaId = require('uuid').v4();
    global.salasPendientes.set(salaId, {
        retador,
        retado,
        estado: 'pendiente',
        timestamp: Date.now(),
        timeoutId: setTimeout(() => {
            global.salasPendientes.delete(salaId);
        }, 3 * 60 * 1000)
    });
    return salaId;
};

// ------------------ Iniciar servidor ------------------
const PORT = process.env.PORT || 3005;
server.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
