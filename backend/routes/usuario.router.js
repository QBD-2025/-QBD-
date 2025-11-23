const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuario.controller');
const { isAuthenticated, upload } = require('../middlewares/usuario.middleware');

// ==================== PERFIL ====================
router.get('/usuario', isAuthenticated, usuarioController.verPerfil);

// ==================== EDICIÓN ====================
router.get('/usuario/editar', isAuthenticated, usuarioController.vistaEditarUsuario);
router.post('/usuario/editar', isAuthenticated, upload.single('avatar'), usuarioController.editarUsuario);

// ==================== HISTORIAL ====================
router.get('/usuario/historial', isAuthenticated, usuarioController.verHistorial);
router.get('/usuario/historial/:id_examen', isAuthenticated, usuarioController.verDetalleExamen);

module.exports = router;