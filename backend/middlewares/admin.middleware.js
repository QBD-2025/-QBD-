// backend/middlewares/admin.middleware.js

// Middleware para verificar si el usuario está autenticado
const isAuthenticated = (req, res, next) => {
    if (req.session.user) return next();
    return res.redirect('/login');
};

// Middleware para verificar si el usuario es administrador (solo admin)
const isAdmin = (req, res, next) => {
    if (req.session.user?.id_tp_usuario === 3) return next(); // ✅ 3 = Admin
    return res.redirect('/');
};

// Middleware para verificar si el usuario es editor o superior
const isEditor = (req, res, next) => {
    if ([2, 3].includes(req.session.user?.id_tp_usuario)) return next(); // ✅ 2=Editor, 3=Admin
    return res.redirect('/');
};

// Middleware para verificar si el usuario es revisor o superior
const isRevisor = (req, res, next) => {
    if ([2, 3, 4].includes(req.session.user?.id_tp_usuario)) return next(); // ✅ 2=Editor, 3=Admin, 4=Revisor
    return res.redirect('/');
};

// Exportar los middlewares para usarlos en rutas
module.exports = { isAuthenticated, isAdmin, isEditor, isRevisor };