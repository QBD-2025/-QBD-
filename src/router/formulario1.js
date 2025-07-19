const express = require('express');
const router = express.Router();

router.get('/formulario1', async (req, res) => {
  try {
    const [preguntas] = await req.pool.query(`
      SELECT p.id_pregunta, p.texto AS pregunta, o.id_opcion, o.texto_opcion
      FROM pregunta_encuesta p
      JOIN opcion_pregunta o ON p.id_pregunta = o.id_pregunta
      WHERE p.id_encuesta = ?
      ORDER BY p.id_pregunta, o.id_opcion
    `, [1]); // ← Cambia el ID por el de tu encuesta actual

    // Agrupar por pregunta
    const preguntasFormateadas = [];
    let currentPregunta = null;

    for (const row of preguntas) {
      if (!currentPregunta || currentPregunta.id_pregunta !== row.id_pregunta) {
        currentPregunta = {
          id_pregunta: row.id_pregunta,
          pregunta: row.pregunta,
          opciones: [],
        };
        preguntasFormateadas.push(currentPregunta);
      }
      currentPregunta.opciones.push({
        id_opcion: row.id_opcion,
        texto_opcion: row.texto_opcion,
      });
    }

    res.render('formulario1', { preguntas: preguntasFormateadas });
  } catch (error) {
    console.error('Error al cargar preguntas:', error);
    res.status(500).send('Error al cargar el formulario');
  }
});

router.post('/procesar-formulario', async (req, res) => {
  try {
    const userId = req.session.user.id_usuario;
    const body = req.body;

    for (const key in body) {
      if (key.startsWith('respuesta_')) {
        const id_pregunta = key.replace('respuesta_', '');
        const id_opcion = body[key];

        // Insertar en respuesta_encuesta
        await req.pool.query(
          `INSERT INTO respuesta_encuesta (id_usuario, id_pregunta, id_opcion) VALUES (?, ?, ?)`,
          [userId, id_pregunta, id_opcion]
        );
      }
    }

    res.redirect('/perfil2');
  } catch (err) {
    console.error('Error al guardar respuestas:', err.sqlMessage || err.message || err);
    res.status(500).send('Error al procesar el formulario');
  }
});


module.exports = router;