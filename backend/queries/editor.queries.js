// ===========================
// EXÁMENES
// ===========================

// Obtiene un conjunto de preguntas con paginación
async function obtenerPreguntas(pool, limit, offset) {
  const [preguntas] = await pool.query(
    'SELECT id_pregunta, id_materia, pregunta, retroalimentacion FROM pregunta ORDER BY id_materia, id_pregunta LIMIT ? OFFSET ?',
    [limit, offset]
  );
  return preguntas; // Array de preguntas
}

// Cuenta el total de preguntas en la base de datos
async function contarPreguntas(pool) {
  const [countResult] = await pool.query('SELECT COUNT(*) AS total FROM pregunta');
  return countResult[0].total; // Número total de preguntas
}

// ===========================
// RESPUESTAS
// ===========================

// Obtiene las respuestas asociadas a un conjunto de preguntas
async function obtenerRespuestas(pool, idsPreguntas) {
  if (!idsPreguntas.length) return []; // Retorna vacío si no hay IDs
  const [respuestas] = await pool.query(
    'SELECT id_respuesta, id_pregunta, respuesta, correcta, puntos FROM respuesta WHERE id_pregunta IN (?) ORDER BY id_respuesta',
    [idsPreguntas]
  );
  return respuestas; // Array de respuestas
}

// ===========================
// DATOS CURIOSOS
// ===========================

// Obtiene todos los datos curiosos de la base de datos
async function obtenerDatos(pool) {
  const [datos] = await pool.query('SELECT id_dato, dato, imagen, id_materia, fuente FROM dato_curioso ORDER BY id_materia');
  return datos; // Array de datos curiosos
}

// ===========================
// ENCUESTAS
// ===========================

// Obtiene las preguntas de encuestas con sus opciones
async function obtenerPreguntasEncuesta(pool) {
  const [preguntas] = await pool.query(`
    SELECT p.id_pregunta, p.id_encuesta, p.texto as texto,
           GROUP_CONCAT(o.texto_opcion ORDER BY o.id_opcion ASC) AS opciones
    FROM pregunta_encuesta p
    LEFT JOIN opcion_pregunta o ON p.id_pregunta = o.id_pregunta
    GROUP BY p.id_pregunta
    ORDER BY p.id_encuesta, p.id_pregunta
  `);
  // Convierte las opciones concatenadas en un array
  return preguntas.map(p => ({ ...p, opciones: p.opciones ? p.opciones.split(',') : [] }));
}

module.exports = {
  obtenerPreguntas,
  contarPreguntas,
  obtenerRespuestas,
  obtenerDatos,
  obtenerPreguntasEncuesta
};
