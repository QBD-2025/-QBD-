const express = require('express');
const router = express.Router();
const db = require('../db/conexion'); // Ajusta según tu estructura de proyecto


router.get('/materias', async (req, res) => {
  try {
    const [materias] = await db.query('SELECT id_materia, descripcion FROM materias');
    res.render('materias', { materias });
  } catch (err) {
    console.error('Error al obtener materias:', err);
    res.status(500).send('Error al cargar materias');
  }
});



module.exports = router;