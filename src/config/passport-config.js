const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const pool=require ("../db/conexion")
// Configuración de Passport para Google OAuth
passport.use(new GoogleStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: '/auth/google/callback',
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails[0].value;
    const nombre = profile.displayName;

    // Buscar si el usuario ya existe
    const [rows] = await pool.query('SELECT * FROM usuario WHERE email = ?', [email]);

    if (rows.length > 0) {
      const usuario = rows[0];

      // Aquí puedes validar si está verificado
      if (usuario.verificado === 0) {
        return done(null, false, { message: 'Cuenta no verificada' });
      }

      // Usuario ya existe y está verificado
      return done(null, usuario);
    }
    const points = 0;
    const tp_user = 1; // Cambiado a 0 para indicar que el usuario
    const status = 1; // Cambiado a 0 para indicar que el usuario no está verificado
    // Usuario no existe, insertarlo
    const result = await pool.query(
      'INSERT INTO usuario (username, email, verificado,puntos,id_tp_usuario,id_status) VALUES (?, ?, ? , ?, ?, ?)',
      [nombre, email, 1,points,tp_user,status]  // lo marcamos como verificado automáticamente
    );

    const [nuevoUsuario] = await pool.query('SELECT * FROM usuario WHERE id_usuario = ?', [result[0].insertId]);
    return done(null, nuevoUsuario[0]);

  } catch (error) {
    console.error('Error en verificación de Google:', error);
    return done(error);
  }
}));

// Guardar usuario en sesión
passport.serializeUser((user, done) => {
  done(null, user);
});

// Obtener usuario de sesión
passport.deserializeUser((user, done) => {
  done(null, user);
});