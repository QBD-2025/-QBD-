const express = require('express');
const exphbs = require('express-handlebars');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();
const mysql = require("mysql2/promise");
const bcrypt = require("bcrypt");
const session = require("express-session");
const mailer = require('./src/public/utils/mail.js');
const passport = require('passport');
require('./src/config/passport-config');

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'quebuendato',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// 1. Configuración inicial de Express
const app = express();

// 2. Configuración del motor de vistas (Handlebars) - ¡PERMANECE IGUAL!
app.engine('.hbs', exphbs.engine({
    defaultLayout: 'main',
    layoutsDir: path.join(__dirname, 'src', 'views', 'layouts'),
    partialsDir: path.join(__dirname, 'src', 'views', 'partials'),
    extname: '.hbs',
    helpers: {
        eq: (a, b) => a === b
    }
}));

app.set('view engine', '.hbs');
app.set('views', path.join(__dirname, 'src', 'views'));


// 3. Middlewares - ¡PERMANECEN IGUALES!
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'src', 'public')));
app.use(express.static(path.join(__dirname, 'src', 'media')));
app.use('/media', express.static(path.join(__dirname, 'src', 'media')));
app.use('/Audio', express.static(path.join(__dirname, 'src', 'Audio')));
app.use('/animacion_frames_p', express.static(path.join(__dirname, 'src','media','animacion_frames_p')));
app.use('/images', express.static(path.join(__dirname, 'src', 'public', 'media', 'images'))); // Asegúrate de que la ruta sea correcta

// 4. Configuración de sesión y Passport - ¡PERMANECE IGUAL!
app.use(session({
    secret: process.env.SESSION_SECRET || 'clave_segura_ganopapa',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24
    }
}));
app.use(passport.initialize());
app.use(passport.session());

// 5. Middlewares personalizados - ¡PERMANECEN IGUALES!
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    next();
});


app.use((req, res, next) => {
    req.pool = pool;
    req.mailer = mailer;
    req.bcrypt = bcrypt; 
    next();
});


 // o el nombre correcto del archivo


// Configuración de routers
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

// 7. Uso de routers (ORDEN RECOMENDADO)
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

// 8. Configuración de puerto - ¡PERMANECE IGUAL!
const PORT = process.env.PORT || 3005;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});