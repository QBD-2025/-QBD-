// Middleware para verificar si el usuario está autenticado
function isAuthenticated(req, res, next) {
    // Si hay un usuario en sesión, permitir continuar
    if (req.session.user) return next();

    // Si no hay usuario en sesión, redirigir al login
    res.redirect('/login');
}

// Middleware para verificar si el usuario es administrador
function isAdmin(req, res, next) {
    // Comprobar si el usuario en sesión tiene rol 'admin'
    if (req.session.user?.rol === 'admin') return next();

    // Si no es admin, responder con 403 No autorizado
    res.status(403).send('No autorizado');
}

// Exportar los middlewares para usarlos en rutas
module.exports = { isAuthenticated, isAdmin };
