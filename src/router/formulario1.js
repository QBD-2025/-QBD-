const express = require('express');
const router = express.Router();

router.get('/formulario1', async (req, res) => {
  try {
    const [preguntas] = await req.pool.query(`
      SELECT p.id_pregunta, p.texto AS pregunta, o.id_opcion, o.texto_opcion
      FROM pregunta_encuesta p
      JOIN opcion_pregunta o ON p.id_pregunta = o.id_pregunta
      WHERE p.id_encuesta = 1 and p.id_estatus_p = 1 and p.id_pregunta=2
      ORDER BY p.id_pregunta, o.id_opcion
    `, [1]);

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

    // Detectar si es para overlay (AJAX) o página completa
    if (req.xhr || req.query.partial) {
      res.render('formulario1', { preguntas: preguntasFormateadas, layout: false });
    } else {
      res.render('formulario1', { preguntas: preguntasFormateadas, layout: false });
    }
  } catch (error) {
    console.error('Error al cargar preguntas:', error);
    res.status(500).send('Error al cargar el formulario');
  }
});


router.post('/procesar-formulario', async (req, res) => {
  try {
    const body = req.body;

    for (const key in body) {
      if (key.startsWith('respuesta_')) {
        const id_pregunta = key.replace('respuesta_', '');
        const id_opcion = body[key];

        // Insertar en respuesta_encuesta
        await req.pool.query(
          `INSERT INTO respuesta_encuesta (id_pregunta, id_opcion) VALUES ( ?, ?)`,
          [ id_pregunta, id_opcion]
        );
      }
    }

    res.redirect('/register');
  } catch (err) {
    console.error('Error al guardar respuestas:', err.sqlMessage || err.message || err);
    res.status(500).send('Error al procesar el formulario');
  }
});

router.get('/pregunta2', async (req, res) => {
  try {
    const [preguntas] = await req.pool.query(`
      SELECT p.id_pregunta, p.texto AS pregunta, o.id_opcion, o.texto_opcion
      FROM pregunta_encuesta p
      JOIN opcion_pregunta o ON p.id_pregunta = o.id_pregunta
      WHERE p.id_encuesta = 1 and p.id_estatus_p = 1 and p.id_pregunta=3
      ORDER BY p.id_pregunta, o.id_opcion
    `);

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

    res.render('pregunta2', { preguntas: preguntasFormateadas, layout: false });
  } catch (error) {
    console.error('Error al cargar preguntas:', error);
    res.status(500).send('Error al cargar la pregunta');
  }
});


router.get('/pregunta3', async (req, res) => {
  try {
    const [preguntas] = await req.pool.query(`
      SELECT p.id_pregunta, p.texto AS pregunta, o.id_opcion, o.texto_opcion
      FROM pregunta_encuesta p
      JOIN opcion_pregunta o ON p.id_pregunta = o.id_pregunta
      WHERE p.id_encuesta = 1 and p.id_estatus_p = 1 and p.id_pregunta=4
      ORDER BY p.id_pregunta, o.id_opcion
    `);
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
    res.render('pregunta3', { preguntas: preguntasFormateadas, layout: false });
  } catch (error) {
    console.error('Error al cargar preguntas:', error);
    res.status(500).send('Error al cargar la pregunta');
  }
});

router.get('/pregunta4', async (req, res) => {
  try {
    const [preguntas] = await req.pool.query(`
      SELECT p.id_pregunta, p.texto AS pregunta, o.id_opcion, o.texto_opcion
      FROM pregunta_encuesta p
      JOIN opcion_pregunta o ON p.id_pregunta = o.id_pregunta
      WHERE p.id_encuesta = 1 and p.id_estatus_p = 1 and p.id_pregunta=5
      ORDER BY p.id_pregunta, o.id_opcion
    `);
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
    res.render('pregunta4', { preguntas: preguntasFormateadas, layout: false });
  } catch (error) {
    console.error('Error al cargar preguntas:', error);
    res.status(500).send('Error al cargar la pregunta');
  }
});

router.get('/pregunta5', async (req, res) => {
  try {
    const [preguntas] = await req.pool.query(`
      SELECT p.id_pregunta, p.texto AS pregunta, o.id_opcion, o.texto_opcion
      FROM pregunta_encuesta p
      JOIN opcion_pregunta o ON p.id_pregunta = o.id_pregunta
      WHERE p.id_encuesta = 1 and p.id_estatus_p = 1 and p.id_pregunta=15
      ORDER BY p.id_pregunta, o.id_opcion
    `);
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
    res.render('pregunta5', { preguntas: preguntasFormateadas, layout: false });
  } catch (error) {
    console.error('Error al cargar preguntas:', error);
    res.status(500).send('Error al cargar la pregunta');
  }
});

module.exports = router;