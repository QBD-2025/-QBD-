const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

// Middleware de autenticación
const isAuthenticated = (req, res, next) => {
  if (req.session.user) return next();
  return res.redirect('/login');
};

// ------------------------- PANEL PRINCIPAL -------------------------
// Redirige al panel de exámenes
router.get('/', isAuthenticated, (req, res) => {
  res.redirect('/editor/examenes');
});

// ------------------------- EXÁMENES -------------------------
router.get('/examenes', isAuthenticated, async (req, res) => {
  const page = parseInt(req.query.page) || 1; 
  const limit = 10; 
  const offset = (page - 1) * limit;

  try {
    const [countResult] = await req.pool.query('SELECT COUNT(*) AS total FROM pregunta');
    const totalPreguntas = countResult[0].total;
    const totalPages = Math.ceil(totalPreguntas / limit);

    const [preguntasPage] = await req.pool.query(
      'SELECT id_pregunta, id_materia, pregunta, retroalimentacion FROM pregunta ORDER BY id_materia, id_pregunta LIMIT ? OFFSET ?',
      [limit, offset]
    );

    const idsPreguntas = preguntasPage.map(p => p.id_pregunta);
    let filas = [];
    if(idsPreguntas.length > 0){
      [filas] = await req.pool.query(
        'SELECT id_respuesta, id_pregunta, respuesta, correcta, puntos FROM respuesta WHERE id_pregunta IN (?) ORDER BY id_respuesta',
        [idsPreguntas]
      );
    }

    const preguntasAgrupadas = preguntasPage.map(p => ({
      ...p,
      retroalimentacion: p.retroalimentacion || '',
      respuestas: filas.filter(r => r.id_pregunta === p.id_pregunta)
    }));

    res.render('editor_examen', {
      layout: false,
      user: req.session.user,
      preguntas: preguntasAgrupadas,
      page,
      totalPages
    });
  } catch (err) {
    console.error('Error cargando exámenes:', err);
    res.status(500).send('Error cargando exámenes');
  }
});


// Agregar pregunta
router.post('/agregar-pregunta', isAuthenticated, async (req, res) => {
  const { id_materia, pregunta, retroalimentacion, respuestas_texto, puntos, correcta } = req.body;
  try {
    const [result] = await req.pool.query(
      'INSERT INTO pregunta (id_materia, pregunta, retroalimentacion) VALUES (?, ?, ?)',
      [id_materia, pregunta, retroalimentacion]
    );
    const idPregunta = result.insertId;

    for (let i = 0; i < respuestas_texto.length; i++) {
      await req.pool.query(
        'INSERT INTO respuesta (id_pregunta, respuesta, puntos, correcta) VALUES (?, ?, ?, ?)',
        [idPregunta, respuestas_texto[i], puntos[i], i == correcta ? 1 : 0]
      );
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('Error agregando pregunta:', err);
    res.sendStatus(500);
  }
});

// Editar pregunta
router.post('/editar-pregunta/:id', isAuthenticated, async (req, res) => {
  const idPregunta = req.params.id;
  const { id_materia, pregunta, retroalimentacion, respuestas_id, respuestas_texto, puntos, correcta } = req.body;

  try {
    // Actualizar tabla pregunta
    await req.pool.query(
      'UPDATE pregunta SET id_materia=?, pregunta=?, retroalimentacion=? WHERE id_pregunta=?',
      [id_materia, pregunta, retroalimentacion, idPregunta]
    );

    // Actualizar respuestas
    for (let i = 0; i < respuestas_texto.length; i++) {
      await req.pool.query(
        'UPDATE respuesta SET respuesta=?, puntos=?, correcta=? WHERE id_respuesta=?',
        [respuestas_texto[i], puntos[i], i == parseInt(correcta) ? 1 : 0, respuestas_id[i]]
      );
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('Error editando pregunta:', err);
    res.sendStatus(500);
  }
});

// Eliminar pregunta
router.delete('/eliminar-preguntas/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    await req.pool.query('DELETE FROM respuesta WHERE id_pregunta = ?', [id]);
    await req.pool.query('DELETE FROM pregunta WHERE id_pregunta = ?', [id]);
    res.sendStatus(200);
  } catch (err) {
    console.error('Error eliminando pregunta:', err);
    res.status(500).send('Error eliminando pregunta');
  }
});

// ------------------------- DATOS CURIOSOS -------------------------
router.get('/datos', isAuthenticated, async (req, res) => {
  try {
    const [datos] = await req.pool.query(`
      SELECT id_dato, dato, imagen, id_materia, fuente
      FROM dato_curioso
      ORDER BY id_materia
    `);
    res.render('editor_datos', { layout: false, user: req.session.user, datos });
  } catch (err) {
    console.error('Error cargando datos:', err);
    res.status(500).send('Error cargando datos');
  }
});

router.post('/agregar-dato', isAuthenticated, upload.single('imagen'), async (req, res) => {
  try {
    const { dato, id_materia, fuente } = req.body;
    const imagenBuffer = req.file ? req.file.buffer : null;
    if (!dato || !id_materia) return res.status(400).send('Dato o materia faltante');

    await req.pool.query(
      'INSERT INTO dato_curioso (dato, imagen, id_materia, fuente) VALUES (?, ?, ?, ?)',
      [dato, imagenBuffer, id_materia, fuente || null]
    );

    res.redirect("/editor/datos")
  } catch (err) {
    console.error('Error agregando dato:', err);
    res.status(500).send('Error agregando dato');
  }
});

router.post('/editar-dato-binario', isAuthenticated, upload.single('imagen'), async (req, res) => {
  try {
    const { id, nuevoDato, fuente } = req.body;
    const imagenBuffer = req.file ? req.file.buffer : null;
    if (!id || !nuevoDato) return res.status(400).send('Datos incompletos');

    if (imagenBuffer) {
      await req.pool.query(
        'UPDATE dato_curioso SET dato=?, imagen=?, fuente=? WHERE id_dato=?',
        [nuevoDato, imagenBuffer, fuente || null, id]
      );
    } else {
      await req.pool.query(
        'UPDATE dato_curioso SET dato=?, fuente=? WHERE id_dato=?',
        [nuevoDato, fuente || null, id]
      );
    }

    res.redirect('/editor/datos');
  } catch (err) {
    console.error('Error editando dato:', err);
    res.status(500).send('Error editando dato');
  }
});

router.delete('/eliminar-dato/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    await req.pool.query('DELETE FROM dato_curioso WHERE id_dato=?', [id]);
    res.sendStatus(200);
  } catch (err) {
    console.error('Error eliminando dato:', err);
    res.status(500).send('Error eliminando dato');
  }
});



// ------------------------- PANEL ENCUESTA -------------------------
router.get('/encuesta', isAuthenticated, async (req, res) => {
  try {
    const [preguntas] = await req.pool.query(`
      SELECT p.id_pregunta, p.id_encuesta, p.texto as texto, p.id_estatus_p,
             GROUP_CONCAT(o.texto_opcion ORDER BY o.id_opcion ASC) AS opciones
      FROM pregunta_encuesta p
      LEFT JOIN opcion_pregunta o ON p.id_pregunta = o.id_pregunta
      GROUP BY p.id_pregunta
      ORDER BY p.id_encuesta, p.id_pregunta
    `);

    const preguntasFormateadas = preguntas.map(p => ({
      ...p, 
      opciones: p.opciones ? p.opciones.split(',') : []
    }));

    res.render('editor', {
      layout: false,
      user: req.session.user,
      preguntas: preguntasFormateadas
    });
  } catch (err) {
    console.error('Error cargando encuesta:', err);
    res.status(500).send('Error cargando encuesta');
  }
});

// ------------------------- PREGUNTAS -------------------------

// AGREGAR PREGUNTA DE ENCUESTA
router.post('/encuesta/agregar-pregunta', isAuthenticated, async (req, res) => {
  const { id_encuesta, texto_pregunta, opciones } = req.body;

  if (!id_encuesta || !texto_pregunta || !opciones || opciones.length < 2) {
    return res.status(400).json({ ok: false, error: 'Datos incompletos' });
  }

  try {
    // 1. Insertar pregunta
    const [result] = await req.pool.query(
      'INSERT INTO pregunta_encuesta (id_encuesta, texto) VALUES (?, ?)',
      [id_encuesta, texto_pregunta]
    );

    const id_pregunta = result.insertId;

    // 2. Insertar opciones
    for (let op of opciones) {
      await req.pool.query(
        'INSERT INTO opcion_pregunta (id_pregunta, texto_opcion) VALUES (?, ?)',
        [id_pregunta, op]
      );
    }

    res.status(200).json({ ok: true, id_pregunta });
  } catch (err) {
    console.error('Error agregando pregunta:', err);
    res.status(500).json({ ok: false, error: 'Error al agregar pregunta' });
  }
});

// Editar pregunta
router.post('/encuesta/editar-pregunta', isAuthenticated, async (req, res) => {
  const { id, nuevoTexto, opciones } = req.body;
  try {
    // 1. Actualizar texto de la pregunta
    await req.pool.query(
      'UPDATE pregunta_encuesta SET texto=? WHERE id_pregunta=?',
      [nuevoTexto, id]
    );

    // 2. Obtener opciones actuales
    const [actuales] = await req.pool.query(
      'SELECT id_opcion FROM opcion_pregunta WHERE id_pregunta=? ORDER BY id_opcion ASC',
      [id]
    );

    // 3. Actualizar / insertar / eliminar según sea necesario
    for (let i = 0; i < opciones.length; i++) {
      if (actuales[i]) {
        // ya existe → actualizar
        await req.pool.query(
          'UPDATE opcion_pregunta SET texto_opcion=? WHERE id_opcion=?',
          [opciones[i], actuales[i].id_opcion]
        );
      } else {
        // no existe → insertar
        await req.pool.query(
          'INSERT INTO opcion_pregunta (id_pregunta, texto_opcion) VALUES (?, ?)',
          [id, opciones[i]]
        );
      }
    }

    // 4. Si hay más opciones en BD que las nuevas → borrar las sobrantes
    if (actuales.length > opciones.length) {
      const idsAEliminar = actuales.slice(opciones.length).map(op => op.id_opcion);
      await req.pool.query(
        'DELETE FROM opcion_pregunta WHERE id_opcion IN (?)',
        [idsAEliminar]
      );
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('Error editando pregunta + opciones de encuesta:', err);
    res.status(500).send('Error editando pregunta');
  }
});

// Eliminar pregunta
router.delete('/encuesta/eliminar-pregunta/:id', isAuthenticated, async (req, res) => {
  const { id } = req.params;
  try {
    await req.pool.query('DELETE FROM opcion_pregunta WHERE id_pregunta=?', [id]);
    await req.pool.query('DELETE FROM pregunta_encuesta WHERE id_pregunta=?', [id]);
    res.sendStatus(200);
  } catch (err) {
    console.error('Error eliminando pregunta de encuesta:', err);
    res.status(500).send('Error eliminando pregunta');
  }
});

// ------------------------- OPCIONES -------------------------

// Agregar opción
router.post('/encuesta/agregar-opcion', isAuthenticated, async (req, res) => {
  const { idPregunta, nuevaOpcion } = req.body;
  try {
    await req.pool.query(
      'INSERT INTO opcion_pregunta (id_pregunta, texto_opcion) VALUES (?, ?)',
      [idPregunta, nuevaOpcion]
    );
    res.sendStatus(200);
  } catch (err) {
    console.error('Error agregando opción de encuesta:', err);
    res.status(500).send('Error agregando opción');
  }
});

// Editar opción
router.post('/encuesta/editar-opcion', isAuthenticated, async (req, res) => {
  const { index, idPregunta, nuevoTexto } = req.body;
  try {
    const [opciones] = await req.pool.query(
      'SELECT id_opcion FROM opcion_pregunta WHERE id_pregunta=? ORDER BY id_opcion ASC',
      [idPregunta]
    );

    if (opciones[index]) {
      await req.pool.query(
        'UPDATE opcion_pregunta SET texto_opcion=? WHERE id_opcion=?',
        [nuevoTexto, opciones[index].id_opcion]
      );
      res.sendStatus(200);
    } else {
      res.status(404).send('Opción no encontrada');
    }
  } catch (err) {
    console.error('Error editando opción de encuesta:', err);
    res.status(500).send('Error editando opción');
  }
});

// Eliminar opción
router.post('/encuesta/eliminar-opcion', isAuthenticated, async (req, res) => {
  const { index, idPregunta } = req.body;
  try {
    const [opciones] = await req.pool.query(
      'SELECT id_opcion FROM opcion_pregunta WHERE id_pregunta=? ORDER BY id_opcion ASC',
      [idPregunta]
    );

    if (opciones[index]) {
      await req.pool.query('DELETE FROM opcion_pregunta WHERE id_opcion=?', [opciones[index].id_opcion]);
      res.sendStatus(200);
    } else {
      res.status(404).send('Opción no encontrada');
    }
  } catch (err) {
    console.error('Error eliminando opción de encuesta:', err);
    res.status(500).send('Error eliminando opción');
  }
});

module.exports = router;
