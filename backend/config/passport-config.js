
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

                return done(null, false, { message: 'Cuenta de Google sin correo electrónico.' });
            }
            const [rows] = await pool.query('SELECT * FROM usuario WHERE email = ?', [email]);

            if (rows.length > 0) {
                const usuario = rows[0];

                if (usuario.id_status === 4) {
                    return done(null, false, { 
                        message: 'pending',
                        statusInfo: {
                            titulo: "Cuenta pendiente",
                            mensaje: "Tu cuenta está pendiente de aprobación. Contacta con el administrador."
                        }
                    });
                }

                if (usuario.id_status === 3) {
                    if (usuario.suspension_fin && new Date(usuario.suspension_fin) > new Date()) {
                        return done(null, false, { 
                            message: 'suspended',
                            statusInfo: {
                                titulo: "Cuenta suspendida",
                                mensaje: `Tu cuenta está suspendida hasta el ${usuario.suspension_fin.toLocaleDateString()}`
                            }
                        });
                    } else {
                        await pool.query(
                            'UPDATE usuario SET id_status = 1, suspension_fin = NULL WHERE id_usuario = ?',
                            [usuario.id_usuario]
                        );
                        usuario.id_status = 1;
                    }
                }

                if (usuario.id_status !== 1) {
                    await pool.query(
                        'UPDATE usuario SET id_status = 1 WHERE id_usuario = ?',
                        [usuario.id_usuario]
                    );
                    usuario.id_status = 1;
                }

                global.sesionesActivas.add(usuario.id_usuario);

                return done(null, usuario);
            }

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

            return done(null, nuevoUsuario[0]);

        } catch (error) {
            console.error('❌ Error en verificación de Google:', error);
            return done(error);
        }
    }
));

passport.serializeUser((user, done) => {
    done(null, user.id_usuario);
});

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