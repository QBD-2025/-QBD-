//configApp.js
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

// Configuración de Handlebars
// Configuración de Handlebars
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
        gt(a, b) { return a > b; },
        lt(a, b) { return a < b; },
        subtract(a, b) { return a - b; },
        add(a, b) { return a + b; },
        ifEquals(arg1, arg2, options) {
            return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
        },
        range(start, end) {
            const arr = [];
            for (let i = start; i <= end; i++) {
                arr.push(i);
            }
            return arr;
        },
        // AGREGAR EL HELPER ifCond AQUÍ
        ifCond(v1, operator, v2, options) {
            switch (operator) {
                case '==':
                    return (v1 == v2) ? options.fn(this) : options.inverse(this);
                case '===':
                    return (v1 === v2) ? options.fn(this) : options.inverse(this);
                case '!=':
                    return (v1 != v2) ? options.fn(this) : options.inverse(this);
                case '<':
                    return (v1 < v2) ? options.fn(this) : options.inverse(this);
                case '<=':
                    return (v1 <= v2) ? options.fn(this) : options.inverse(this);
                case '>':
                    return (v1 > v2) ? options.fn(this) : options.inverse(this);
                case '>=':
                    return (v1 >= v2) ? options.fn(this) : options.inverse(this);
                default:
                    return options.inverse(this);
            }
        }
    }
}));


app.set('view engine', '.hbs');
app.set('views', path.join(__dirname, 'src', 'views'));

app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(express.static(path.join(__dirname, 'src', 'public')));
app.use(express.static(path.join(__dirname, 'src', 'media')));
app.use('/media', express.static(path.join(__dirname, 'src', 'media')));
app.use('/Audio', express.static(path.join(__dirname, 'src', 'Audio')));
app.use('/animacion_frames_p', express.static(path.join(__dirname, 'src','media','animacion_frames_p')));
app.use('/images', express.static(path.join(__dirname, 'src', 'public', 'media', 'images')));
app.use('/src/audio', express.static(path.join(__dirname, 'src', 'audio')));


// Configuración de sesiones
const sessionMiddleware = session({
    secret: process.env.SESSION_SECRET || 'clave_segura_ganopapa',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 }
});
app.use(sessionMiddleware);
io.engine.use(sessionMiddleware);
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


app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    next();
});

// ✅ NUEVO: Middleware para cargar avatar del usuario
app.use(async (req, res, next) => {
    // Solo ejecutar si hay usuario en sesión
    if (req.session.user && req.session.user.id_usuario) {
        
        // Si ya tiene avatarUrl, no hacer nada
        if (req.session.user.avatarUrl || req.session.user.foto_perfil) {
            return next();
        }
        
        // Consultar avatar de la base de datos
        try {
            const [userData] = await pool.query(
                'SELECT foto_perfil FROM usuario WHERE id_usuario = ?',
                [req.session.user.id_usuario]
            );
            
            if (userData.length > 0) {
                const avatarPath = userData[0].foto_perfil || '/media/images/default_avatar.png';
                
                // Actualizar sesión con avatar
                req.session.user.foto_perfil = avatarPath;
                req.session.user.avatarUrl = avatarPath;
                
                console.log(`✅ Avatar cargado: ${avatarPath}`);
            } else {
                // Usuario no encontrado, usar avatar por defecto
                req.session.user.foto_perfil = '/media/images/default_avatar.png';
                req.session.user.avatarUrl = '/media/images/default_avatar.png';
            }
        } catch (error) {
            console.error('❌ Error cargando avatar:', error);
            // En caso de error, usar avatar por defecto
            req.session.user.foto_perfil = '/media/images/default_avatar.png';
            req.session.user.avatarUrl = '/media/images/default_avatar.png';
        }
    }
    
    next();
});

// Middleware existente para pool, mailer, etc.
app.use((req, res, next) => {
    req.pool = pool;
    req.mailer = mailer;
    req.bcrypt = bcrypt;
    req.io = io;
    next();
});

// Middleware existente para carrera
app.use(async (req, res, next) => {
    if (req.session.user && req.session.user.id_carrera === undefined) {
        try {
            const [carreras] = await pool.query(
                `SELECT c.id_carrera 
                 FROM carrera c
                 INNER JOIN usuario_carrera uc ON c.id_carrera = uc.id_carrera
                 WHERE uc.id_usuario = ?
                 LIMIT 1`,
                [req.session.user.id_usuario]
            );

            if (carreras.length > 0) {
                req.session.user.id_carrera = carreras[0].id_carrera;
                console.log(`✅ Carrera ${carreras[0].id_carrera} agregada a sesión`);
            } else {
                req.session.user.id_carrera = null;
                console.log(`⚠️ Usuario sin carrera asignada`);
            }

            await new Promise((resolve, reject) => {
                req.session.save((err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        } catch (error) {
            console.error('Error al cargar carrera:', error);
        }
    }
    next();
});




// Rutas
const ligasR = require('./src/router/ligasR.js');
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
const rankingR = require('./src/router/rankingR.js');
const clasificacionCarrera = require('./src/router/ranking_carreraR.js')

app.use('/', clasificacionCarrera)
app.use('/', rankingR);
app.use('/', gatoR);
app.use('/', serpEscalerasR);
app.use('/', sopaLetrasR);
app.use('/invitaciones', invitacionesR);
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



// Ruta para vista cooperativa
app.get('/ahorcado_cooperativo', (req, res) => {
    res.render('ahorcado_competitivo', { modo: 'cooperativo' });
});

// Configuración de Socket.io
require('./src/sockets/minijuegos/index.js')(io, pool); // <--- ¡CORREGIDO!
require('./src/sockets/modo_competitivo/index.js')(io, pool);

// Iniciar servidor
const PORT = process.env.PORT || 3005;  
server.listen(PORT, () => {
    console.log(`Servidor con Socket.IO corriendo en http://localhost:${PORT}`);
});