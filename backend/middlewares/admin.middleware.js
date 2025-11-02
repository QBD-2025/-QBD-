// backend/middlewares/admin.middleware.js

// Middleware para verificar si el usuario está autenticado
const isAuthenticated = (req, res, next) => {
    // Si hay usuario en sesión, permitir continuar
    if (req.session.user) return next();

    // Si no hay usuario en sesión, redirigir al login
    return res.redirect('/login');
};

// Middleware para verificar si el usuario es administrador
const isAdmin = (req, res, next) => {
    // Comprobar si el usuario en sesión tiene rol de administrador (id_tp_usuario === 3)
    if (req.session.user?.id_tp_usuario === 3) return next();

    // Si no es admin, mostrar error 403 con mensaje
    return res.status(403).render('error', { mensajeError: 'Acceso reservado para administradores' });
};

// Exportar los middlewares para usarlos en rutas
module.exports = { isAuthenticated, isAdmin };
