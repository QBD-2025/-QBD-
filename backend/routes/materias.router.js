// routes/materias.router
const express = require('express');
const router = express.Router();
const db = require('../db/conexion');
const { isAuthenticated } = require('../middlewares/auth');

router.get('/materias', isAuthenticated, async (req, res) => {
  try {
    const [materias] = await db.query('SELECT id_materia, descripcion FROM materias');
    res.render('materias', {
      materias,
      layout: 'main',
      user: req.session.user
    });
  } catch (err) {
    console.error('Error al obtener materias:', err);
    res.status(500).send('Error al cargar materias');
  }
});

module.exports = router;
