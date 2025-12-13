const express = require('express');
const router = express.Router();

const { 
  mostrarPanelRevisor,
  mostrarPreguntasRevision,
  mostrarDatosRevision,
  aprobarPreguntaHandler,
  rechazarPreguntaHandler,
  aprobarDatoHandler,
  rechazarDatoHandler
} = require('../controllers/revisor.controller.js');

// Middleware de autenticación
const isAuthenticated = (req, res, next) => {
  if (req.session.user) {
    next();
  } else {
    res.redirect('/login');
  }
};

// ==================== PANEL PRINCIPAL ====================
router.get('/', isAuthenticated, mostrarPanelRevisor);

// ==================== REVISIÓN DE PREGUNTAS ====================
router.get('/preguntas', isAuthenticated, mostrarPreguntasRevision);
router.post('/aprobar-pregunta/:id', isAuthenticated, aprobarPreguntaHandler);
router.delete('/rechazar-pregunta/:id', isAuthenticated, rechazarPreguntaHandler);

// ==================== REVISIÓN DE DATOS ====================
router.get('/datos', isAuthenticated, mostrarDatosRevision);
router.post('/aprobar-dato/:id', isAuthenticated, aprobarDatoHandler);
router.delete('/rechazar-dato/:id', isAuthenticated, rechazarDatoHandler);

module.exports = router;