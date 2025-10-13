const express = require('express');
const router = express.Router();
const { isAuthenticated, isAdmin } = require('../middlewares/admin.middleware');
const adminController = require('../controllers/admin.controller');

// LOG PARA DEBUGGING
router.get('/admin', (req, res, next) => {
    console.log("RUTA /admin ACCEDIDA");
    console.log("Usuario en sesión:", req.session.user);
    console.log("ID tipo usuario:", req.session.user?.id_tp_usuario);
    next();
}, isAuthenticated, isAdmin, adminController.renderAdminPage);

router.post('/admin/actualizar-usuarios', isAuthenticated, isAdmin, adminController.actualizarUsuarios);
router.post('/admin/editar-usuario', isAuthenticated, isAdmin, adminController.editarUsuario);
router.post('/admin/agregar-usuario', isAuthenticated, isAdmin, adminController.agregarUsuario);

module.exports = router;