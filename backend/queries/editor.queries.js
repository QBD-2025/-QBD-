// EXÁMENES

async function obtenerMaterias(pool) {
  const [materias] = await pool.query(
    'SELECT id_materia, descripcion FROM materias ORDER BY descripcion'
  );
  return materias;
}

// TEMÁTICAS
async function obtenerTematicas(pool, idMateria = null) {
  let query = 'SELECT id_tematica, descripcion, id_carrera FROM tematica';
  let params = [];
  
  if (idMateria) {
    query += ' WHERE id_carrera = ?';
    params.push(idMateria);
  }
  
  query += ' ORDER BY descripcion';
  
  const [tematicas] = await pool.query(query, params);
  return tematicas;
}

// Obtiene un conjunto de preguntas con paginación
async function obtenerPreguntas(pool, limit, offset) {
  const [preguntas] = await pool.query(
    'SELECT id_pregunta, id_materia, id_tematica, pregunta, retroalimentacion FROM pregunta ORDER BY id_materia, id_pregunta LIMIT ? OFFSET ?',
    [limit, offset]
  );
  return preguntas; // Array de preguntas
}

// Cuenta el total de preguntas en la base de datos
async function contarPreguntas(pool) {
  const [countResult] = await pool.query('SELECT COUNT(*) AS total FROM pregunta');
  return countResult[0].total; // Número total de preguntas
}

// RESPUESTAS

// Obtiene las respuestas asociadas a un conjunto de preguntas
async function obtenerRespuestas(pool, idsPreguntas) {
  if (!idsPreguntas.length) return []; // Retorna vacío si no hay IDs
  const [respuestas] = await pool.query(
    'SELECT id_respuesta, id_pregunta, respuesta, correcta, puntos FROM respuesta WHERE id_pregunta IN (?) ORDER BY id_respuesta',
    [idsPreguntas]
  );
  return respuestas; // Array de respuestas
}

async function agregarPregunta(pool, preguntaData) {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    // Insertar la pregunta CON id_tematica
    const [resultadoPregunta] = await connection.query(
      'INSERT INTO pregunta (id_materia, id_tematica, pregunta, retroalimentacion, id_estatus_p) VALUES (?, ?, ?, ?, ?)',
      [
        preguntaData.id_materia, 
        preguntaData.id_tematica || null,  // ← Nuevo campo
        preguntaData.pregunta, 
        preguntaData.retroalimentacion || '', 
        4
      ]
    );
    
    const idPregunta = resultadoPregunta.insertId;

    // Insertar respuestas
    if (preguntaData.respuestas && preguntaData.respuestas.length > 0) {
      const valoresRespuestas = preguntaData.respuestas.map(resp => [
        idPregunta,
        resp.respuesta,
        resp.correcta || 0,
        resp.puntos || 0
      ]);
      
      await connection.query(
        'INSERT INTO respuesta (id_pregunta, respuesta, correcta, puntos) VALUES ?',
        [valoresRespuestas]
      );
    }

    await connection.commit();
    return { 
      idPregunta, 
      insertado: true,
      mensaje: 'Pregunta agregada exitosamente'
    };
    
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function editarPregunta(pool, preguntaData) {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    // Actualizar la pregunta CON id_tematica
    await connection.query(
      'UPDATE pregunta SET id_materia = ?, id_tematica = ?, pregunta = ?, retroalimentacion = ? WHERE id_pregunta = ?',
      [
        preguntaData.id_materia, 
        preguntaData.id_tematica || null,  // ← Nuevo campo
        preguntaData.pregunta, 
        preguntaData.retroalimentacion, 
        preguntaData.id_pregunta
      ]
    );

    // Eliminar respuestas antiguas y agregar las nuevas
    if (preguntaData.respuestas && preguntaData.respuestas.length > 0) {
      await connection.query('DELETE FROM respuesta WHERE id_pregunta = ?', [preguntaData.id_pregunta]);
      
      const valoresRespuestas = preguntaData.respuestas.map(resp => [
        preguntaData.id_pregunta,
        resp.respuesta,
        resp.correcta || 0,
        resp.puntos || 0
      ]);
      
      await connection.query(
        'INSERT INTO respuesta (id_pregunta, respuesta, correcta, puntos) VALUES ?',
        [valoresRespuestas]
      );
    }

    await connection.commit();
    return { actualizado: true };
    
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// ELIMINAR PREGUNTA
async function eliminarPregunta(pool, idPregunta) {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    // Eliminar respuestas primero
    await connection.query('DELETE FROM respuesta WHERE id_pregunta = ?', [idPregunta]);
    
    // Eliminar la pregunta
    await connection.query('DELETE FROM pregunta WHERE id_pregunta = ?', [idPregunta]);

    await connection.commit();
    return { eliminado: true };
    
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// DATOS CURIOSOS

// Obtiene todos los datos curiosos de la base de datos
async function obtenerDatos(pool) {
  const [datos] = await pool.query('SELECT id_dato, dato, imagen, id_materia, fuente FROM dato_curioso ORDER BY id_materia');
  return datos; // Array de datos curiosos
}

async function agregarDato(pool, datoData) {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    const [resultadoDato] = await connection.query(
      'INSERT INTO dato_curioso (id_materia, dato, imagen, fuente, id_estatus_p) VALUES (?, ?, ?, ?, ?)',
      [
        datoData.id_materia, 
        datoData.dato, 
        datoData.imagen || null,
        datoData.fuente, 
        4
      ]
    );

    const idDato = resultadoDato.insertId;

    await connection.commit();
    return { 
      idDato, 
      insertado: true,
      mensaje: 'Dato agregado exitosamente'
    };
    
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}


async function modificarDato(pool, datoData) {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    // Si hay nueva imagen, actualizar todo; si no, mantener la imagen anterior
    let query, params;
    
    if (datoData.imagen !== undefined) {
      // Actualizar con nueva imagen (puede ser null si se eliminó)
      query = 'UPDATE dato_curioso SET id_materia = ?, dato = ?, imagen = ?, fuente = ? WHERE id_dato = ?';
      params = [datoData.id_materia, datoData.dato, datoData.imagen, datoData.fuente, datoData.id_dato];
    } else {
      // No modificar la imagen, solo actualizar otros campos
      query = 'UPDATE dato_curioso SET id_materia = ?, dato = ?, fuente = ? WHERE id_dato = ?';
      params = [datoData.id_materia, datoData.dato, datoData.fuente, datoData.id_dato];
    }

    await connection.query(query, params);

    await connection.commit();
    return { 
      actualizado: true,
      mensaje: 'Dato actualizado exitosamente'
    };
    
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function eliminarDato(pool, idDato) {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    // Eliminar la pregunta
    await connection.query('DELETE FROM dato_curioso WHERE id_dato = ?', [idDato]);

    await connection.commit();
    return { eliminado: true };
    
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  obtenerPreguntas,
  contarPreguntas,
  obtenerRespuestas,
  obtenerDatos,
  agregarPregunta,
  eliminarPregunta,
  editarPregunta,
  agregarDato,
  modificarDato,
  eliminarDato,
  obtenerMaterias,
  obtenerTematicas
};
