const express = require ('express');
const router = express.Router();

const isAdmin = (req, res, next) => {
    if (req.session.user?.id_tp_usuario === 3) return next();
    return res.status(403).render('error', {
        layout: 'main',
        mensajeError: 'Acceso reservado para administradores',
    });
};

module.exports = router;