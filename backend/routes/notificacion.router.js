// backend/routes/notificacion.router.js
const express = require('express');
const router = express.Router();
const notificacionesController = require('../controllers/notificaciones.controller');

// Montamos el controlador
router.use('/', notificacionesController);

module.exports = router;
