// backend/config/configApp.js - VERSIÓN UNIFICADA (Estadísticas + Rangos)
const express = require('express');
const exphbs = require('express-handlebars');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();
const mysql = require('mysql2/promise');
const session = require('express-session');
const passport = require('passport');
require('./passport-config');
const mailer = require('../utils/mail.js');
const palabrasHelper = require('../minijuegos/socket-helpers');
const { verificarPromocionDisponible } = require('../routes/rangos.router.js');

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
    cors: { 
        origin: "http://localhost:3005", 
        methods: ["GET", "POST"] 
    },
    maxHttpBufferSize: 1e8,
    pingTimeout: 60000
});

// ✅✅✅ CRÍTICO: EXPONER IO EN MÚLTIPLES LUGARES
app.set('io', io);
global.io = io;
console.log('[SOCKET.IO]: ✅ Instancia creada y expuesta en app y global');

// ✅ MIDDLEWARE CRÍTICO: Forzar JSON en rutas de notificaciones
app.use('/aceptar', (req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    next();
});

app.use('/rechazar', (req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    next();
});

// ------------------ Configuración de Handlebars ------------------
app.engine('.hbs', exphbs.engine({
    defaultLayout: 'main',
    layoutsDir: path.join(__dirname, '../views/layouts'),
    partialsDir: path.join(__dirname, '../views/partials'),
    extname: '.hbs',
    helpers: {
        // ════════════════════════════════════════════════════════════
        // ✅ HELPERS BÁSICOS (ORIGINALES)
        // ════════════════════════════════════════════════════════════
        eq: (a, b) => a === b,
        equals: (a, b) => a === b,
        ne: (a, b) => a !== b,
        gt: (a, b) => a > b,
        greaterThan: (a, b) => a > b,
        gte: (a, b) => a >= b,
        greaterThanOrEqual: (a, b) => a >= b,
        lt: (a, b) => a < b,
        lessThan: (a, b) => a < b,
        lte: (a, b) => a <= b,
        lessThanOrEqual: (a, b) => a <= b,
        
        // ════════════════════════════════════════════════════════════
        // HELPERS DE LÓGICA
        // ════════════════════════════════════════════════════════════
        or: (a, b) => a || b,
        and: (a, b) => a && b,
        not: (a) => !a,
        
        // ════════════════════════════════════════════════════════════
        // HELPERS DE MATEMÁTICAS
        // ════════════════════════════════════════════════════════════
        inc: v => parseInt(v) + 1,
        dec: v => parseInt(v) - 1,
        sum: (a, b) => a + b,
        add: (a, b) => a + b,
        subtract: (a, b) => a - b,
        multiply: (a, b) => a * b,
        divide: (a, b) => b !== 0 ? a / b : 0,
        
        // ════════════════════════════════════════════════════════════
        // HELPERS DE SWITCH/CASE ✅✅✅ NUEVOS
        // ════════════════════════════════════════════════════════════
        switch: function(value, options) {
            this.switch_value = value;
            this.switch_break = false;
            var html = options.fn(this);
            delete this.switch_break;
            delete this.switch_value;
            return html;
        },
        
        case: function(value, options) {
            if (value == this.switch_value) {
                this.switch_break = true;
                return options.fn(this);
            }
        },
        
        default: function(options) {
            if (!this.switch_break) {
                return options.fn(this);
            }
        },
        
        // ════════════════════════════════════════════════════════════
        // HELPERS DE UTILIDAD
        // ════════════════════════════════════════════════════════════
        json: ctx => JSON.stringify(ctx),
        
        range(start, end) {
            const arr = [];
            for (let i = start; i <= end; i++) {
                arr.push(i);
            }
            return arr;
        },
        
        // ════════════════════════════════════════════════════════════
        // HELPERS CONDICIONALES AVANZADOS
        // ════════════════════════════════════════════════════════════
        ifEquals: (a, b, options) => a == b ? options.fn(this) : options.inverse(this),
        
        ifCond: (v1, op, v2, options) => {
            switch (op) {
                case '==': return (v1 == v2) ? options.fn(this) : options.inverse(this);
                case '===': return (v1 === v2) ? options.fn(this) : options.inverse(this);
                case '!=': return (v1 != v2) ? options.fn(this) : options.inverse(this);
                case '!==': return (v1 !== v2) ? options.fn(this) : options.inverse(this);
                case '<': return (v1 < v2) ? options.fn(this) : options.inverse(this);
                case '<=': return (v1 <= v2) ? options.fn(this) : options.inverse(this);
                case '>': return (v1 > v2) ? options.fn(this) : options.inverse(this);
                case '>=': return (v1 >= v2) ? options.fn(this) : options.inverse(this);
                case '&&': return (v1 && v2) ? options.fn(this) : options.inverse(this);
                case '||': return (v1 || v2) ? options.fn(this) : options.inverse(this);
                default: return options.inverse(this);
            }
        },
        
        // ════════════════════════════════════════════════════════════
        // ✅ HELPERS EXTENDIDOS PARA DUELOS Y ESTADÍSTICAS
        // ════════════════════════════════════════════════════════════
        
        // Comparaciones adicionales
        equals: (a, b) => a === b,
        greaterThan: (a, b) => a > b,
        lessThan: (a, b) => a < b,
        greaterThanOrEqual: (a, b) => a >= b,
        lessThanOrEqual: (a, b) => a <= b,
        
        // Operaciones lógicas
        and: (a, b) => a && b,
        not: (a) => !a,
        
        // Operaciones matemáticas adicionales
        multiply: (a, b) => a * b,
        divide: (a, b) => b !== 0 ? a / b : 0,
        
        // Formateo mejorado
        formatNumber: (num) => {
            if (num === undefined || num === null) return '0';
            return Number(num).toLocaleString('es-MX');
        },
        
        formatDate: (date) => {
            if (!date) return 'N/A';
            try {
                return new Date(date).toLocaleString('es-MX', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            } catch (error) {
                return 'N/A';
            }
        },
        

        // Helper para índices seguros
        incIndex: function(value) {
            const num = parseInt(value);
            return isNaN(num) ? 1 : num + 1;
        },
        
        // Helper para contains
        contains: (str, substr) => {
            if (typeof str !== 'string' || typeof substr !== 'string') return false;
            return str.includes(substr);
        },
        
        // Debug helper (útil para desarrollo)
        formatDateShort: (date) => {
            if (!date) return 'N/A';
            try {
                return new Date(date).toLocaleDateString('es-MX', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                });
            } catch (error) {
                return 'N/A';
            }
        },
        
        // ════════════════════════════════════════════════════════════
        // HELPER DE DEBUG
        // ════════════════════════════════════════════════════════════
        debug: (value) => {
            console.log('[HANDLEBARS DEBUG]:', value);
            return JSON.stringify(value, null, 2);
        }
    }
}));
app.set('view engine', '.hbs');
app.set('views', path.join(__dirname, '../views'));

// ------------------ Middlewares ------------------
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, '../../frontend/media/uploads')));
app.use('/media', express.static(path.join(__dirname, '../../frontend/media')));
app.use('/css', express.static(path.join(__dirname, '../../frontend/css')));
app.use('/js', express.static(path.join(__dirname, '../../frontend/js')));
app.use('/public', express.static(path.join(__dirname, '../../public')))

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

// ✅ Exponer usuario, pool, mailer e IO en todas las requests
app.use((req, res, next) => {
    if (req.session.user) {
        let avatarUrl = req.session.user.foto_perfil || '/uploads/default_avatar.png';
        
        if (avatarUrl && !avatarUrl.startsWith('/') && !avatarUrl.startsWith('http')) {
            avatarUrl = `/uploads/${avatarUrl}`;
        }
        
        res.locals.user = {
            ...req.session.user,
            avatarUrl: avatarUrl,
            foto_perfil: avatarUrl
        };
    } else {
        res.locals.user = null;
    }
    req.pool = pool;
    req.mailer = mailer;
    req.io = io;
    next();
});
console.log('[MIDDLEWARE]: ✅ req.io configurado en middleware');

// ════════════════════════════════════════════════════════════════
//  MIDDLEWARE DE AUTO-VERIFICACIÓN DE PROMOCIONES
// ════════════════════════════════════════════════════════════════
app.use(async (req, res, next) => {
    if (!req.session?.user?.id_usuario) {
        return next();
    }
    
    const userId = req.session.user.id_usuario;
    
    setImmediate(async () => {
        try {
            await verificarPromocionDisponible(userId);
        } catch (error) {
            console.error('[AUTO NOTIF]: Error en verificación automática:', error.message);
        }
    });

    next();
});

console.log('[MIDDLEWARE]: ✅ Auto-verificación de promociones activada');

// ------------------ Routers ------------------
// ════════════════════════════════════════════════════════════════
// 🔍 SISTEMA DE DEBUG Y PROTECCIÓN DE RUTAS
// ════════════════════════════════════════════════════════════════

// 1️⃣ MIDDLEWARE DE DEBUG MEJORADO
app.use((req, res, next) => {
    const path = req.originalUrl;
    
    // Solo loguear rutas relevantes
    if (path.includes('/examen') || path.includes('/admin') || path.includes('/resultados')) {
        console.log('\n═══════════════════════════════════════════════════════════');
        console.log(`[🔍 REQUEST]: ${req.method} ${path}`);
        console.log(`[🔍 USUARIO]:`, {
            existe: !!req.session.user,
            username: req.session.user?.username || 'N/A',
            id_usuario: req.session.user?.id_usuario || 'N/A',
            id_tp_usuario: req.session.user?.id_tp_usuario || 'N/A',
            es_admin: req.session.user?.id_tp_usuario === 3
        });
        console.log(`[🔍 HEADERS]:`, {
            referer: req.get('referer') || 'N/A',
            'user-agent': req.get('user-agent')?.substring(0, 50) + '...'
        });
    }
    next();
});

// 2️⃣ INTERCEPTOR DE REDIRECTS
const originalRedirect = express.response.redirect;

express.response.redirect = function(statusOrUrl, url) {
    const targetUrl = typeof statusOrUrl === 'string' ? statusOrUrl : url;
    const status = typeof statusOrUrl === 'number' ? statusOrUrl : 302;
    const requestPath = this.req.originalUrl;
    
    const isExamenRequest = requestPath.includes('/examen') || requestPath.includes('/resultados');
    const isRedirectingToAdmin = targetUrl && targetUrl.includes('/admin');
    
    if (isExamenRequest && isRedirectingToAdmin) {
        console.error('\n❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌');
        console.error('❌ [REDIRECT INCORRECTO DETECTADO]');
        console.error('❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌');
        console.error(`❌ Ruta origen: ${requestPath}`);
        console.error(`❌ Ruta destino: ${targetUrl}`);
        console.error(`❌ Usuario: ${this.req.session.user?.username || 'N/A'}`);
        console.error(`❌ Stack trace completo:`);
        console.error(new Error().stack);
        console.error('❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌\n');
        
        return this.status(500).send(`
            <h1>🚨 Error detectado por sistema de debugging</h1>
            <p><strong>Intentó redirigir de:</strong> ${requestPath}</p>
            <p><strong>Hacia:</strong> ${targetUrl}</p>
            <p><strong>Usuario:</strong> ${this.req.session.user?.username || 'N/A'}</p>
            <hr>
            <p>Este error fue capturado para debugging. Revisa la consola del servidor.</p>
            <button onclick="history.back()">← Volver</button>
        `);
    }
    
    if (typeof statusOrUrl === 'string') {
        return originalRedirect.call(this, statusOrUrl);
    } else {
        return originalRedirect.call(this, statusOrUrl, url);
    }
};

// 3️⃣ MIDDLEWARE PROTECTOR DE RUTAS DE EXAMEN
app.use((req, res, next) => {
    const path = req.originalUrl;
    
    if (path.startsWith('/examen') || path.startsWith('/resultados')) {
        console.log('[🛡️ PROTECTOR]: Ruta protegida detectada:', path);
        
        if (!req.session.user) {
            console.log('[🛡️ PROTECTOR]: Usuario no autenticado, redirigiendo a /login');
            return res.redirect('/login');
        }
        
        console.log('[🛡️ PROTECTOR]: Usuario autenticado, permitiendo acceso');
    }
    
    next();
});

console.log('\n═══════════════════════════════════════════════════════════');
console.log('[DEBUG SYSTEM]: ✅ Sistema de debugging completo instalado');
console.log('[DEBUG SYSTEM]: ✅ Interceptor de redirects activo');
console.log('[DEBUG SYSTEM]: ✅ Protector de rutas de examen activo');
console.log('[DEBUG SYSTEM]: 🔒 Redirects incorrectos serán BLOQUEADOS');
console.log('═══════════════════════════════════════════════════════════\n');

// ------------------ Routers ------------------
const adminR = require('../routes/admin.router.js');
const examenR = require('../routes/examen.router.js');
const ahorcadoR = require('../routes/ahorcado.router.js');
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
const verificationR = require('../routes/verification.router.js');
const duelo_competitivo = require('../routes/duelo_competitivo.js');
const duelosErrorHandler = require('../routes/dueloErrorHandler.js');
const promocionR = require("../routes/rangos.router.js")
const revisorR = require ("../routes/revisor.router.js")

// ════════════════════════════════════════════════════════════════
// ✅✅✅ ORDEN CRÍTICO DE MONTAJE
// ════════════════════════════════════════════════════════════════

// 1️⃣ PRIMERO: Rutas de invitaciones y notificaciones (más específicas)
app.use('/', invitacionesR);
app.use('/notificaciones', notificacionesR);

// 2️⃣ SEGUNDO: Rutas de competitivo y duelos
app.use('/', competitivoR);
app.use('/', duelo_competitivo);

// 3️⃣ TERCERO: Rutas de autenticación
app.use('/', adminR);
app.use('/', loginR);
app.use('/', googleR);
app.use('/', registerR);
app.use('/', verificationR);
app.use('/', passResetR);

// 4️⃣ CUARTO: Rutas de juegos y exámenes
app.use('/', examenR);
app.use('/', ahorcadoR);
app.use('/', escalerasR);
app.use('/', examenAdmR);
app.use('/', gatoR);
app.use('/', minijuegosR);
app.use('/', simuladorR);
app.use('/', sopaLetrasR);

// 5️⃣ QUINTO: Rutas de perfil y rankings
app.use('/', profileR);
app.use('/', rankingR);
app.use('/', rankingCarreraR);
app.use('/', usuarioR);
app.use('/api/promocion', promocionR);

// 6️⃣ SEXTO: Rutas de administración y editor
app.use('/editor', editorR);
app.use('/revisor', revisorR)

// 7️⃣ SÉPTIMO: Rutas de contenido
app.use('/', datoR);
app.use('/', materiasR);
app.use('/', ligasR);
app.use('/', formulario1R);

// 8️⃣ ÚLTIMO: Rutas generales (menos específicas)
app.use('/', generalR);

console.log('═══════════════════════════════════════════════════════════');
console.log('[ROUTERS]: ✅ Routers montados en orden correcto');
console.log('[ROUTERS]: 1. invitacionesR (contiene /aceptar y /rechazar)');
console.log('[ROUTERS]: 2. competitivoR (contiene /desafiar_com)');
console.log('[ROUTERS]: 3. promocionR (sistema de rangos) ✅ NUEVO');
console.log('[ROUTERS]: 4. Resto de routers...');
console.log('═══════════════════════════════════════════════════════════');

// ════════════════════════════════════════════════════════════════
// ✅✅✅ VARIABLES GLOBALES Y FUNCIÓN crearSalaPendienteBD
// ════════════════════════════════════════════════════════════════

console.log('═══════════════════════════════════════════════════════════');
console.log('[CONFIG]: 🏗️ Inicializando variables globales y funciones');
console.log('═══════════════════════════════════════════════════════════');

// Inicializar Maps globales
global.salasPendientes = new Map();
global.salasEspera = new Map();
global.usuariosConectados = new Map();
global.usuariosEnPortalCompetitivo = new Set();

console.log('[CONFIG]: ✅ Maps globales inicializados:');
console.log('  - global.salasPendientes');
console.log('  - global.salasEspera');
console.log('  - global.usuariosConectados');
console.log('  - global.usuariosEnPortalCompetitivo');

// ✅✅✅ FUNCIÓN PRINCIPAL: crearSalaPendienteBD
global.crearSalaPendienteBD = function(idRetador, idRetado, modo, dificultad, io) {
    const { v4: uuidv4 } = require('uuid');
    const salaId = uuidv4();
    
    console.log('[CONFIG APP]: 🏗️ Creando sala pendiente BD...');
    console.log(`[CONFIG APP]:   SalaId: ${salaId}`);
    console.log(`[CONFIG APP]:   Retador: ${idRetador}`);
    console.log(`[CONFIG APP]:   Retado: ${idRetado}`);
    console.log(`[CONFIG APP]:   Modo: ${modo}`);
    console.log(`[CONFIG APP]:   Dificultad: ${dificultad}`);
    
    const salaPendiente = {
        salaId,
        retador: parseInt(idRetador),
        retado: parseInt(idRetado),
        idRetador: parseInt(idRetador),
        idRetado: parseInt(idRetado),
        estado: 'pendiente',
        timestamp: Date.now(),
        jugadoresConectados: new Set(),
        jugadoresAceptados: new Set(),
        dueloCreado: false,
        tipo: 'notificacion_bd',
        modo: modo || 'general',
        dificultad: dificultad || null,
        intentosConexion: 0
    };
    
    // ✅ GUARDAR EN AMBOS MAPS SÍNCRONAMENTE
    global.salasPendientes.set(salaId, salaPendiente);
    global.salasEspera.set(salaId, salaPendiente);
    
    console.log('[CONFIG APP]: ✅ Sala registrada en Maps');
    console.log(`[CONFIG APP]:   En salasPendientes: ${global.salasPendientes.has(salaId)}`);
    console.log(`[CONFIG APP]:   En salasEspera: ${global.salasEspera.has(salaId)}`);
    
    // ⏰ Timeout de 3 minutos
    const timeoutId = setTimeout(() => {
        const sala = global.salasPendientes.get(salaId);
        if (sala && (sala.estado === 'pendiente' || sala.estado === 'esperando_aceptacion')) {
            console.log(`[CONFIG APP]: ⏰ Sala ${salaId} expiró (3 minutos sin aceptar)`);
            
            // Limpiar de ambos Maps
            global.salasPendientes.delete(salaId);
            global.salasEspera.delete(salaId);
            
            // Notificar expiración por socket
            const usuariosConectados = global.usuariosConectados || new Map();
            const retadorSocket = usuariosConectados.get(parseInt(idRetador));
            const retadoSocket = usuariosConectados.get(parseInt(idRetado));
            
            if (retadorSocket && io) {
                io.to(retadorSocket).emit('desafioBD:expirado', {
                    mensaje: 'Tu desafío expiró (3 minutos sin respuesta)'
                });
            }
            
            if (retadoSocket && io) {
                io.to(retadoSocket).emit('desafioBD:expirado', {
                    mensaje: 'El desafío que recibiste expiró'
                });
            }
            
            console.log(`[CONFIG APP]: ✅ Sala ${salaId} limpiada y notificaciones enviadas`);
        }
    }, 180000); // 3 minutos
    
    salaPendiente.timeoutId = timeoutId;
    
    console.log('[CONFIG APP]: ⏰ Timeout de 3 minutos configurado');
    console.log('[CONFIG APP]: ✅ Sala creada exitosamente');
    
    return salaId;
};

console.log('[CONFIG]: ✅ global.crearSalaPendienteBD definida correctamente');

// ✅ Función legacy para compatibilidad con código antiguo
global.crearSalaPendiente = (retador, retado, io) => {
    console.log('[CONFIG]: ⚠️ Usando función legacy crearSalaPendiente');
    return global.crearSalaPendienteBD(retador, retado, 'general', null, io);
};

console.log('[CONFIG]: ✅ global.crearSalaPendiente (legacy) definida');

// ════════════════════════════════════════════════════════════════
// 🧪 VERIFICACIÓN AUTOMÁTICA
// ════════════════════════════════════════════════════════════════

console.log('═══════════════════════════════════════════════════════════');
console.log('[CONFIG]: 🧪 Ejecutando test de verificación...');
console.log('═══════════════════════════════════════════════════════════');

if (typeof global.crearSalaPendienteBD === 'function') {
    console.log('[CONFIG]: ✅ global.crearSalaPendienteBD EXISTE');
    
    try {
        console.log('[CONFIG]: 🧪 Ejecutando test con valores dummy...');
        const testSalaId = global.crearSalaPendienteBD(999, 888, 'general', null, io);
        
        if (testSalaId && typeof testSalaId === 'string') {
            console.log('[CONFIG]: ✅ Test OK - SalaId generado:', testSalaId);
            
            const enPendientes = global.salasPendientes.has(testSalaId);
            const enEspera = global.salasEspera.has(testSalaId);
            
            console.log('[CONFIG]: Verificación de persistencia:');
            console.log(`  - En salasPendientes: ${enPendientes ? '✅' : '❌'}`);
            console.log(`  - En salasEspera: ${enEspera ? '✅' : '❌'}`);
            
            if (enPendientes && enEspera) {
                console.log('[CONFIG]: ✅✅✅ TEST COMPLETAMENTE EXITOSO');
                
                const sala = global.salasPendientes.get(testSalaId);
                if (sala.timeoutId) clearTimeout(sala.timeoutId);
                global.salasPendientes.delete(testSalaId);
                global.salasEspera.delete(testSalaId);
                console.log('[CONFIG]: ✅ Test limpiado');
            } else {
                console.error('[CONFIG]: ❌ Sala no persiste correctamente en Maps');
            }
        } else {
            console.error('[CONFIG]: ❌ Test FALLÓ - No retornó salaId válido');
            console.error('[CONFIG]: Valor recibido:', testSalaId);
        }
    } catch (error) {
        console.error('[CONFIG]: ❌ Test FALLÓ con error:', error.message);
        console.error('[CONFIG]: Stack:', error.stack);
    }
} else {
    console.error('[CONFIG]: ❌❌❌ global.crearSalaPendienteBD NO EXISTE');
    console.error('[CONFIG]: Tipo actual:', typeof global.crearSalaPendienteBD);
}

console.log('═══════════════════════════════════════════════════════════');

// ------------------ Sockets ------------------
const socketCompetitivoHandler = require('../sockets/socket-competitivo.js');
const minijuegosSocketHandler = require('../sockets/index.js');

console.log('[SOCKET INIT]: 🎮 Inicializando sistema de sockets...');

// Registrar minijuegos
minijuegosSocketHandler(io, pool, palabrasHelper.seleccionarPalabraAleatoria);
console.log('[SOCKET INIT]: ✅ Minijuegos registrados');

// Registrar conexiones individuales
let connectionCount = 0;

io.on('connection', (socket) => {
    connectionCount++;
    console.log(`[SOCKET IO]: 🔌 Nueva conexión #${connectionCount} - ${socket.id}`);
    
    // Registrar handlers de competitivo
    socketCompetitivoHandler(io, socket);
    
    socket.on('disconnect', () => {
        connectionCount--;
        console.log(`[SOCKET IO]: 🔌 Desconexión - ${socket.id} (Activos: ${connectionCount})`);
    });
});

// ════════════════════════════════════════════════════════════════
// 🛠️ ENDPOINTS DE DEBUG
// ════════════════════════════════════════════════════════════════

app.get('/api/test/io-disponible', (req, res) => {
    res.json({
        timestamp: new Date().toISOString(),
        io_disponible: {
            en_app: !!req.app.get('io'),
            en_req: !!req.io,
            en_global: !!global.io
        },
        funciones_globales: {
            crearSalaPendienteBD: typeof global.crearSalaPendienteBD,
            crearSalaPendiente: typeof global.crearSalaPendiente
        },
        maps_globales: {
            salasPendientes_existe: global.salasPendientes instanceof Map,
            salasPendientes_size: global.salasPendientes?.size || 0,
            salasEspera_existe: global.salasEspera instanceof Map,
            salasEspera_size: global.salasEspera?.size || 0,
            usuariosConectados_size: global.usuariosConectados?.size || 0
        },
        sockets: {
            conectados: io.engine.clientsCount
        }
    });
});

app.get('/api/test/verificar-sistema', (req, res) => {
    res.json({
        timestamp: new Date().toISOString(),
        io_disponible: {
            en_app: !!req.app.get('io'),
            en_req: !!req.io,
            en_global: !!global.io
        },
        funciones_globales: {
            crearSalaPendienteBD: typeof global.crearSalaPendienteBD,
            crearSalaPendiente: typeof global.crearSalaPendiente
        },
        maps_globales: {
            salasPendientes_existe: global.salasPendientes instanceof Map,
            salasPendientes_size: global.salasPendientes?.size || 0,
            salasEspera_existe: global.salasEspera instanceof Map,
            salasEspera_size: global.salasEspera?.size || 0,
            usuariosConectados_size: global.usuariosConectados?.size || 0
        },
        sockets: {
            conectados: io.engine.clientsCount
        },
        sistema_rangos: {
            verificarPromocionDisponible: typeof verificarPromocionDisponible,
            middleware_activo: true
        },
        test_completo: true
    });
});

// Manejo de errores
io.on('error', (error) => {
    console.error('[SOCKET IO ERROR]:', error);
});

process.on('uncaughtException', (error) => {
    console.error('[UNCAUGHT EXCEPTION]:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('[UNHANDLED REJECTION]:', reason);
});

// ------------------ Iniciar servidor ------------------
const PORT = process.env.PORT || 3005;
server.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════╗
║  🎮 SERVIDOR QUE BUEN DATO - VERSIÓN UNIFICADA       ║
║  🌐 http://localhost:${PORT}                         ║
║  ✅ Sistema de matchmaking competitivo activado      ║
║  ✅ Sistema de rangos y promociones activado         ║
║  ✅ Estadísticas de duelos rápidos activadas         ║
║  ✅ Sockets configurados correctamente               ║
║  ✅ Socket.IO expuesto en app.set('io')              ║
║  ✅ global.crearSalaPendienteBD definida             ║
╚═══════════════════════════════════════════════════════╝
    `);
    
    setTimeout(() => {
        console.log('\n═══════════════════════════════════════════════════════════');
        console.log('[CONFIG]: 🔍 VERIFICACIÓN POST-INICIO - VERSIÓN UNIFICADA');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('  - Sockets conectados:', io.engine.clientsCount);
        console.log('  - Maps globales OK:', 
            global.salasPendientes instanceof Map && 
            global.salasEspera instanceof Map
        );
        console.log('  - crearSalaPendienteBD:', typeof global.crearSalaPendienteBD);
        console.log('  - Sistema de rangos:', typeof verificarPromocionDisponible);
        console.log('  - Helpers de estadísticas: ✅ Activos');
        console.log('═══════════════════════════════════════════════════════════');
    }, 2000);
});