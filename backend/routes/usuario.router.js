// backend/routes/usuario.router.js - VERSIÓN COMPLETA ACTUALIZADA

const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuario.controller');
const { isAuthenticated, upload } = require('../middlewares/usuario.middleware');

// ==================== PERFIL ====================
router.get('/usuario', isAuthenticated, usuarioController.verPerfil);

// ==================== PERFIL PÚBLICO ====================
router.get('/usuario/perfil/:id_usuario', isAuthenticated, usuarioController.verPerfilPublico);

// ==================== API: STATS EN TIEMPO REAL ====================
router.get('/api/usuario/stats/:id_usuario', isAuthenticated, usuarioController.obtenerStatsAPI);

// ==================== EDICIÓN ====================
router.get('/usuario/editar', isAuthenticated, usuarioController.vistaEditarUsuario);
router.post('/usuario/editar', isAuthenticated, upload.single('avatar'), usuarioController.editarUsuario);

// ==================== HISTORIAL UNIFICADO ====================
router.get('/usuario/historial', isAuthenticated, usuarioController.verHistorialUnificado);

// ==================== DETALLE DE EXAMEN ====================
router.get('/usuario/historial/examen/:id_examen', isAuthenticated, usuarioController.verDetalleExamen);

// ==================== DETALLE DE DUELO ====================
router.get('/usuario/historial/duelo/:id_duelo', isAuthenticated, (req, res) => {
  res.redirect(`/duelo/resultados/${req.params.id_duelo}`);
});

module.exports = router;