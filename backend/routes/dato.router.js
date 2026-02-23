const express = require('express');
const router = express.Router();
const { mostrarEleccion, mostrarDatosPorMateria, mostrarDatoAleatorio } = require('../controllers/dato.controller');
const { isAuthenticated } = require('../middlewares/auth');

router.get('/eleccion-dato', isAuthenticated, mostrarEleccion);
router.get('/dato-curioso/:idMateria', isAuthenticated, mostrarDatosPorMateria);
router.get('/dato-sesion', isAuthenticated, mostrarDatoAleatorio);

module.exports = router;
