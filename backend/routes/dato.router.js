const express = require('express');
const router = express.Router();
const { mostrarEleccion, mostrarDatosPorMateria, mostrarDatoAleatorio } = require('../controllers/dato.controller'); 
// Rutas
router.get('/eleccion-dato', mostrarEleccion);
router.get('/dato-curioso/:idMateria', mostrarDatosPorMateria);
router.get('/dato-sesion', mostrarDatoAleatorio);

module.exports = router;
