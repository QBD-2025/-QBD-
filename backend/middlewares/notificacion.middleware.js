// Middleware para rutas que requieren que el usuario esté autenticado
function isAuthenticated(req, res, next) {
    // Si hay usuario en sesión, continuar con la siguiente función
    if (req.session.user) return next();

    // Si no hay usuario, responder con 401 No autorizado
    res.status(401).json({ error: 'No autorizado' });
}

// Exportar el middleware
module.exports = { isAuthenticated };
