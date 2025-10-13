// controllers/editor.controller.js

// Importa las queries necesarias para exámenes, respuestas, datos y encuestas
const { obtenerPreguntas, contarPreguntas, obtenerRespuestas, obtenerDatos, obtenerPreguntasEncuesta } = require('../queries/editor.queries.js');

// ========================
// Mostrar listado de exámenes con paginación
// ========================
async function mostrarExamenes(req, res) {
  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const offset = (page - 1) * limit;

  try {
    // Contar total de preguntas para paginación
    const totalPreguntas = await contarPreguntas(req.pool);
    const totalPages = Math.ceil(totalPreguntas / limit);

    // Obtener preguntas de la página actual
    const preguntasPage = await obtenerPreguntas(req.pool, limit, offset);

    // Obtener respuestas asociadas a esas preguntas
    const idsPreguntas = preguntasPage.map(p => p.id_pregunta);
    const filas = await obtenerRespuestas(req.pool, idsPreguntas);

    // Agrupar preguntas con sus respuestas y retroalimentación
    const preguntasAgrupadas = preguntasPage.map(p => ({
      ...p,
      retroalimentacion: p.retroalimentacion || '',
      respuestas: filas.filter(r => r.id_pregunta === p.id_pregunta)
    }));

    // Renderizar vista pasando datos y paginación
    res.render('editor_examen', { layout: false, user: req.session.user, preguntas: preguntasAgrupadas, page, totalPages });
  } catch (err) {
    console.error('Error cargando exámenes:', err);
    res.status(500).send('Error cargando exámenes');
  }
}

// ========================
// Mostrar datos curiosos para el editor
// ========================
async function mostrarDatos(req, res) {
  try {
    const datos = await obtenerDatos(req.pool);
    res.render('editor_datos', { layout: false, user: req.session.user, datos });
  } catch (err) {
    console.error('Error cargando datos:', err);
    res.status(500).send('Error cargando datos');
  }
}

// ========================
// Mostrar preguntas de la encuesta
// ========================
async function mostrarEncuesta(req, res) {
  try {
    const preguntas = await obtenerPreguntasEncuesta(req.pool);
    res.render('editor', { layout: false, user: req.session.user, preguntas });
  } catch (err) {
    console.error('Error cargando encuesta:', err);
    res.status(500).send('Error cargando encuesta');
  }
}

// ========================
// Exportar funciones del controlador
// ========================
module.exports = { mostrarExamenes, mostrarDatos, mostrarEncuesta };
