// backend/sockets/index.js
module.exports = (io, pool, seleccionarPalabraAleatoria) => {
    console.log('🔌 Inicializando sistema de sockets...');

    // ============================
    // ✅ Verificar parámetros base
    // ============================
    if (!io) return console.error('❌ ERROR: io no está definido');
    if (!pool) return console.error('❌ ERROR: pool no está definido');
    if (!seleccionarPalabraAleatoria) return console.error('❌ ERROR: seleccionarPalabraAleatoria no está definido');

    console.log('✅ Parámetros de sockets verificados correctamente');

    // ============================
    // 🌐 Estado global de las salas
    // ============================
    const state = {
        salas: {},
        confrontationRooms: {},
        partidasGato: {}, 
        salasSerpientes: {}
    };

    // ============================
    // ⚙️ Configuración de juegos
    // ============================
    const config = {
        serpientes: { maxJugadores: 4, minJugadores: 2 },
        gato: { maxJugadores: 2, minJugadores: 2 },
        ahorcado: { maxJugadores: 10, minJugadores: 2 }
    };

    // ============================
    // 📦 Objeto base compartido
    // ============================
    const base = { io, pool, state, config };

    console.log('📦 Cargando handlers de juegos...');

    // =====================================================
    // 1️⃣ Handler de Ahorcado
    // =====================================================
    let ahorcadoSockets = {};
    try {
        ahorcadoSockets = require('../minijuegos/socket-ahorcado')({
            io,
            state,
            pool,
            seleccionarPalabraAleatoria
        }) || {};
        console.log('   ✅ Ahorcado cargado');
    } catch (error) {
        console.error('   ❌ Error al cargar Ahorcado:', error.message);
    }

    // =====================================================
    // 2️⃣ Handler de Sopa de Letras
    // =====================================================
    let sopaLetrasHandler = {};
    try {
        sopaLetrasHandler = require('../minijuegos/socket-sopa')(base) || {};
        console.log('   ✅ Sopa de Letras cargado');
    } catch (error) {
        console.error('   ❌ Error al cargar Sopa de Letras:', error.message);
    }

    // =====================================================
    // 3️⃣ Handler de Serpientes y Escaleras
    // =====================================================
    let serpientesHandler = {};
    try {
        const serpientesModule = require('../minijuegos/serpientes');
        if (typeof serpientesModule === 'function') {
            serpientesHandler = serpientesModule(base) || {};
            console.log('   ✅ Serpientes y Escaleras cargado');
            console.log('   📊 Funciones exportadas:', Object.keys(serpientesHandler));
        } else {
            console.warn('   ⚠️ El módulo de Serpientes no exporta una función válida');
        }
    } catch (error) {
        console.error('   ❌ Error al cargar Serpientes y Escaleras:', error.message);
    }

    // Asegurar que init/cleanup existan
    serpientesHandler.init = serpientesHandler.init || (() => {});
    serpientesHandler.cleanup = serpientesHandler.cleanup || (() => {});

    // =====================================================
    // 4️⃣ Handler de Gato
    // =====================================================
    let gatoHandler = {};
    try {
        gatoHandler = require('../minijuegos/socket-gato')(base) || {};
        console.log('   ✅ Gato cargado');
    } catch (error) {
        console.error('   ❌ Error al cargar Gato:', error.message);
    }

    // =====================================================
    // 🧠 Manejar conexiones Socket.IO
    // =====================================================
    io.on('connection', (socket) => {
        console.log(`\n👋 Usuario conectado: ${socket.id}`);

        // Obtener usuario autenticado (si existe)
        const session = socket.request.session;
        const user = session ? session.user : null;
        if (user) {
            console.log(`   Usuario autenticado: ${user.username} (ID: ${user.id_usuario})`);
        } else {
            console.log('   ⚠️ Usuario sin autenticar');
        }

        console.log('   🎮 Inicializando handlers para socket:', socket.id);

        // 1️⃣ Ahorcado
        if (ahorcadoSockets.init) {
            try {
                ahorcadoSockets.init(socket);
                console.log('   ✅ Ahorcado inicializado');
            } catch (error) {
                console.error('   ❌ Error al inicializar Ahorcado:', error.message);
            }
        }

        // 2️⃣ Sopa de Letras
        if (sopaLetrasHandler.init) {
            try {
                sopaLetrasHandler.init(socket);
                console.log('   ✅ Sopa de Letras inicializado');
            } catch (error) {
                console.error('   ❌ Error al inicializar Sopa:', error.message);
            }
        }

        // 3️⃣ Serpientes y Escaleras
        if (serpientesHandler.init) {
            try {
                serpientesHandler.init(socket);
                console.log('   ✅ Serpientes y Escaleras inicializado');
            } catch (error) {
                console.error('   ❌ Error al inicializar Serpientes:', error.message);
            }
        } else {
            console.log('   ⚠️ Serpientes y Escaleras no disponible');
            console.log('   🔍 Handler actual:', Object.keys(serpientesHandler));
        }

        // 4️⃣ Gato
        if (gatoHandler.init) {
            try {
                gatoHandler.init(socket);
                console.log('   ✅ Gato inicializado');
            } catch (error) {
                console.error('   ❌ Error al inicializar Gato:', error.message);
            }
        }

        // 💬 Chat general
        socket.on('mensajeChat', ({ salaId, mensaje, usuario }) => {
            console.log(`💬 [Chat] ${usuario} en sala ${salaId}: ${mensaje}`);
            io.to(salaId).emit('nuevoMensaje', { usuario, mensaje });
        });

        // 🧹 Limpieza al desconectarse
        socket.on('disconnect', () => {
            console.log(`\n👋 Usuario desconectado: ${socket.id}`);
            console.log('   🧹 Ejecutando limpieza de handlers...');

            const tryCleanup = (handler, name) => {
                if (handler && handler.cleanup) {
                    try {
                        handler.cleanup(socket);
                        console.log(`   ✅ ${name} limpiado`);
                    } catch (error) {
                        console.error(`   ❌ Error en cleanup de ${name}:`, error.message);
                    }
                }
            };

            tryCleanup(ahorcadoSockets, 'Ahorcado');
            tryCleanup(sopaLetrasHandler, 'Sopa de Letras');
            tryCleanup(serpientesHandler, 'Serpientes y Escaleras');
            tryCleanup(gatoHandler, 'Gato');

            console.log('   ✅ Limpieza completada\n');
        });
    });

    console.log('✅ Sistema de sockets inicializado correctamente\n');
};
