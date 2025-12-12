// backend/routes/usuario.router.js
const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuario.controller');
const { isAuthenticated, upload } = require('../middlewares/usuario.middleware');

// ==================== PERFIL ====================
router.get('/usuario', isAuthenticated, usuarioController.verPerfil);

// ==================== EDICIÓN ====================
router.get('/usuario/editar', isAuthenticated, usuarioController.vistaEditarUsuario);
router.post('/usuario/editar', isAuthenticated, upload.single('avatar'), usuarioController.editarUsuario);

// ==================== HISTORIAL UNIFICADO (NUEVO) ====================
// ✅ Esta ruta REEMPLAZA a /usuario/historial
router.get('/usuario/historial', isAuthenticated, usuarioController.verHistorialUnificado);

// ==================== DETALLE DE EXAMEN ====================
router.get('/usuario/historial/examen/:id_examen', isAuthenticated, usuarioController.verDetalleExamen);

// ==================== DETALLE DE DUELO ====================
// ✅ Esta ruta redirige al módulo de duelos
router.get('/usuario/historial/duelo/:id_duelo', isAuthenticated, (req, res) => {
  res.redirect(`/duelo/resultados/${req.params.id_duelo}`);
});

module.exports = router;