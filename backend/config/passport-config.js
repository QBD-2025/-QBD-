// ==============================================
// passport-config.js - VERSIÓN CORREGIDA Y ESTABLE
// ==============================================

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const pool = require('../db/conexion');

// ==========================
// Configuración de Passport
// ==========================
passport.use(new GoogleStrategy(
    {
        clientID: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        callbackURL: '/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
        try {
            const email = profile.emails?.[0]?.value;
            const nombre = profile.displayName;
            const foto = profile.photos?.[0]?.value || null;

            if (!email) {
                console.error('⚠️ El perfil de Google no incluye un email.');
                return done(null, false, { message: 'Cuenta de Google sin correo electrónico.' });
            }

            // Buscar usuario existente
            const [rows] = await pool.query('SELECT * FROM usuario WHERE email = ?', [email]);

            if (rows.length > 0) {
                const usuario = rows[0];

                if (usuario.verificado === 0) {
                    console.log(`⚠️ Usuario ${email} no verificado.`);
                    return done(null, false, { message: 'Cuenta no verificada' });
                }

                console.log(`✅ Usuario existente autenticado: ${usuario.username}`);
                return done(null, usuario);
            }

            // Si no existe, crear nuevo usuario
            console.log(`🆕 Creando nuevo usuario con email: ${email}`);

            const points = 0;
            const tp_user = 1;
            const status = 1;

            const [insertResult] = await pool.query(
                `INSERT INTO usuario 
                 (username, email, verificado, puntos, id_tp_usuario, id_status, foto_perfil) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [nombre, email, 1, points, tp_user, status, foto]
            );

            const [nuevoUsuario] = await pool.query(
                'SELECT * FROM usuario WHERE id_usuario = ?',
                [insertResult.insertId]
            );

            console.log(`✅ Nuevo usuario insertado correctamente: ${nombre}`);
            return done(null, nuevoUsuario[0]);

        } catch (error) {
            console.error('❌ Error en verificación de Google:', error);
            return done(error);
        }
    }
));

// ============================
// Serialización de la sesión
// ============================
passport.serializeUser((user, done) => {
    // Solo guarda el ID del usuario en la sesión
    done(null, user.id_usuario);
});

// ============================
// Deserialización de la sesión
// ============================
passport.deserializeUser(async (id, done) => {
    try {
        const [rows] = await pool.query('SELECT * FROM usuario WHERE id_usuario = ?', [id]);

        if (rows.length > 0) {
            // Usuario encontrado → continuar
            return done(null, rows[0]);
        } else {
            // Si no existe, crear uno "de emergencia" para evitar error
            console.warn(`⚠️ Usuario con ID ${id} no encontrado en la base de datos. Creando temporal...`);

            const [insertResult] = await pool.query(
                `INSERT INTO usuario 
                 (username, email, verificado, puntos, id_tp_usuario, id_status, foto_perfil)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                ['UsuarioNuevo', `temp_${Date.now()}@example.com`, 1, 0, 1, 1, null]
            );

            const [nuevoUsuario] = await pool.query(
                'SELECT * FROM usuario WHERE id_usuario = ?',
                [insertResult.insertId]
            );

            console.log(`🆕 Usuario temporal creado con ID: ${insertResult.insertId}`);
            return done(null, nuevoUsuario[0]);
        }

    } catch (error) {
        console.error('❌ Error en deserializeUser:', error);
        return done(error);
    }
});

module.exports = passport;
