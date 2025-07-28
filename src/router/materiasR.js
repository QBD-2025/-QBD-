const express = require('express');
const router = express.Router();

router.get('/materias', (req, res) => {
  const opciones = ["Geografía", "Historia", "Matemáticas"];
  res.render('materias', { opciones: JSON.stringify(opciones) });
});

module.exports = router;
