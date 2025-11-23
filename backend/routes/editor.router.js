const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const { mostrarExamenes, mostrarDatos, mostrarEncuesta } = require('../controllers/editor.controller.js');

const isAuthenticated = (req, res, next) => req.session.user ? next() : res.redirect('/login');

// Panel principal
router.get('/', isAuthenticated, (req, res) => res.redirect('/editor/examenes'));

// Exámenes
router.get('/examenes', isAuthenticated, mostrarExamenes);

// Datos curiosos
router.get('/datos', isAuthenticated, mostrarDatos);

// Encuesta
router.get('/encuesta', isAuthenticated, mostrarEncuesta);

// Aquí agregarías los POST/DELETE para CRUD, usando controladores separados para cada acción.
module.exports = router;
