// Middleware para rutas que requieren sesión iniciada en la web
function isLoggedIn(req, res, next) {
    // Si no hay usuario en sesión, redirigir al login
    if (!req.session.user) return res.redirect('/login');

    // Si hay usuario en sesión, continuar con la siguiente función
    next();
}

// Middleware para rutas API que requieren autenticación
function apiAuth(req, res, next) {
    // Si no hay usuario en sesión, responder con 401 No autorizado
    if (!req.session.user) return res.status(401).json({ error: 'No autorizado' });

    // Si hay usuario, continuar con la siguiente función
    next();
}

// Exportar los middlewares
module.exports = { isLoggedIn, apiAuth };
