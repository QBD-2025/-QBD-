// passport-config.js - VERSIÓN FINAL

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const pool = require("../db/conexion");

// Configuración de Passport para Google OAuth
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: '/auth/google/callback',
}, async (accessToken, refreshToken, profile, done) => {
    try {
        const email = profile.emails[0].value;
        const nombre = profile.displayName;
        const foto = profile.photos && profile.photos.length > 0 ? profile.photos[0].value : null;

        // Buscar si el usuario ya existe
        const [rows] = await pool.query('SELECT * from usuario WHERE email = ?', [email]);

        if (rows.length > 0) {
            const usuario = rows[0];
            if (usuario.verificado === 0) {
                return done(null, false, { message: 'Cuenta no verificada' });
            }
            return done(null, usuario);
        }

        // Usuario no existe, insertarlo
        const points = 0;
        const tp_user = 1;
        const status = 1;

        const result = await pool.query(
            'INSERT INTO usuario (username, email, verificado, puntos, id_tp_usuario, id_status, foto_perfil) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [nombre, email, 1, points, tp_user, status, foto]
        );

        const [nuevoUsuario] = await pool.query('SELECT * from usuario WHERE id_usuario = ?', [result[0].insertId]);
        return done(null, nuevoUsuario[0]);

    } catch (error) {
        console.error('Error en verificación de Google:', error);
        return done(error);
    }
}));

// Guardar usuario en sesión
passport.serializeUser((user, done) => {
    done(null, user.id_usuario); // Mejor práctica: guardar solo el ID
});

// Obtener usuario de sesión
passport.deserializeUser(async (id, done) => {
    try {
        const [rows] = await pool.query('SELECT * from usuario WHERE id_usuario = ?', [id]);
        if (rows.length > 0) {
            done(null, rows[0]);
        } else {
            done(new Error('Usuario no encontrado'));
        }
    } catch (error) {
        done(error);
    }
});