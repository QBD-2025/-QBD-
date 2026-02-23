// ==================== PREGUNTAS EN REVISIÓN ====================
async function obtenerPreguntasEnRevision(pool) {
  const [preguntas] = await pool.query(`
    SELECT 
      p.id_pregunta,
      p.id_materia,
      p.pregunta,
      p.retroalimentacion,
      p.id_estatus_p,
      m.descripcion as nombre_materia,
      COUNT(r.id_respuesta) as opciones
    FROM pregunta p
    LEFT JOIN materias m ON p.id_materia = m.id_materia
    LEFT JOIN respuesta r ON p.id_pregunta = r.id_pregunta
    WHERE p.id_estatus_p = 4
    GROUP BY p.id_pregunta
    ORDER BY p.id_pregunta DESC
  `);
  
  return preguntas;
}

// Obtener respuestas de preguntas en revisión
async function obtenerRespuestasRevision(pool, idsPreguntas) {
  if (!idsPreguntas.length) return [];
  
  const [respuestas] = await pool.query(
    'SELECT id_respuesta, id_pregunta, respuesta, correcta, puntos FROM respuesta WHERE id_pregunta IN (?) ORDER BY id_respuesta',
    [idsPreguntas]
  );
  
  return respuestas;
}

// ==================== DATOS EN REVISIÓN ====================
async function obtenerDatosEnRevision(pool) {
  const [datos] = await pool.query(`
    SELECT 
      dc.id_dato,
      dc.dato,
      dc.imagen,
      dc.id_materia,
      dc.fuente,
      dc.id_estatus_p,
      m.descripcion as nombre_materia
    FROM dato_curioso dc
    LEFT JOIN materias m ON dc.id_materia = m.id_materia
    WHERE dc.id_estatus_p = 4
    ORDER BY dc.id_dato DESC
  `);
  
  return datos;
}

// ==================== APROBAR / RECHAZAR ====================
// Aprobar pregunta (cambiar estado a 1 = Publicado)
async function aprobarPregunta(pool, idPregunta) {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    await connection.query(
      'UPDATE pregunta SET id_estatus_p = 1 WHERE id_pregunta = ?',
      [idPregunta]
    );
    
    await connection.commit();
    return { aprobado: true };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// Rechazar pregunta (eliminar completamente)
async function rechazarPregunta(pool, idPregunta) {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // Eliminar respuestas primero
    await connection.query('DELETE FROM respuesta WHERE id_pregunta = ?', [idPregunta]);
    
    // Eliminar la pregunta
    await connection.query('DELETE FROM pregunta WHERE id_pregunta = ?', [idPregunta]);
    
    await connection.commit();
    return { rechazado: true };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// Aprobar dato (cambiar estado a 1 = Publicado)
async function aprobarDato(pool, idDato) {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    await connection.query(
      'UPDATE dato_curioso SET id_estatus_p = 1 WHERE id_dato = ?',
      [idDato]
    );
    
    await connection.commit();
    return { aprobado: true };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// Rechazar dato (eliminar completamente)
async function rechazarDato(pool, idDato) {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // Eliminar el dato
    await connection.query('DELETE FROM dato_curioso WHERE id_dato = ?', [idDato]);
    
    await connection.commit();
    return { rechazado: true };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  obtenerPreguntasEnRevision,
  obtenerRespuestasRevision,
  obtenerDatosEnRevision,
  aprobarPregunta,
  rechazarPregunta,
  aprobarDato,
  rechazarDato
};