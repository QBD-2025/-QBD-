const express = require('express');
const router = express.Router();
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage });

const isAuthenticated = (req, res, next) => {
  if (req.session.user) return next();
  return res.redirect('/login');
};

// --- PANEL PRINCIPAL DEL EDITOR (preguntas y opciones) ---
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const [filas] = await req.pool.query(`
      SELECT 
        pe.id_pregunta, pe.id_encuesta, pe.texto AS texto_pregunta, op.texto_opcion, pe.id_estatus_p
      FROM pregunta_encuesta pe
      LEFT JOIN opcion_pregunta op ON pe.id_pregunta = op.id_pregunta
      ORDER BY pe.id_encuesta ASC, pe.id_pregunta ASC;
    `);

    const preguntasAgrupadas = {};
    filas.forEach(fila => {
      const id = fila.id_pregunta;
      if (!preguntasAgrupadas[id]) {
        preguntasAgrupadas[id] = {
          id_pregunta: id,
          id_encuesta: fila.id_encuesta,
          texto_pregunta: fila.texto_pregunta,
          id_estatus_p: fila.id_estatus_p,
          opciones: []
        };
      }
      if (fila.texto_opcion) preguntasAgrupadas[id].opciones.push(fila.texto_opcion);
    });

    const preguntas = Object.values(preguntasAgrupadas);

    res.render('editor', {
      layout: false,
      user: req.session.user,
      preguntas,
    });
  } catch (error) {
    console.error("Error cargando panel de editor:", error);
    res.status(500).send("Error interno al cargar el panel.");
  }
});

// Actualizar estatus de preguntas
router.post('/actualizar-examenes', isAuthenticated, async (req, res) => {
  const { id_pregunta, estatus } = req.body;
  if (!id_pregunta || !estatus || id_pregunta.length !== estatus.length) {
    return res.status(400).send('Datos incompletos o inválidos');
  }

  try {
    const promesas = [];
    for (let i = 0; i < id_pregunta.length; i++) {
      const id = parseInt(id_pregunta[i], 10);
      const est = parseInt(estatus[i], 10);
      if (isNaN(id) || isNaN(est)) continue;
      promesas.push(req.pool.query('UPDATE pregunta_encuesta SET id_estatus_p = ? WHERE id_pregunta = ?', [est, id]));
    }
    await Promise.all(promesas);
    res.redirect('/editor');
  } catch (error) {
    console.error('Error actualizando estatus:', error);
    res.status(500).send('Error al actualizar estatus');
  }
});

// Eliminar pregunta
router.delete('/eliminar-pregunta/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    await req.pool.query('DELETE FROM opcion_pregunta WHERE id_pregunta = ?', [id]);
    await req.pool.query('DELETE FROM pregunta_encuesta WHERE id_pregunta = ?', [id]);
    res.sendStatus(200);
  } catch (error) {
    console.error('Error eliminando pregunta:', error);
    res.status(500).send('Error eliminando pregunta');
  }
});

// Editar pregunta
router.post('/editar-pregunta', isAuthenticated, async (req, res) => {
  const { id, nuevoTexto } = req.body;
  if (!id || !nuevoTexto) return res.status(400).send('Datos incompletos');

  try {
    await req.pool.query('UPDATE pregunta_encuesta SET texto = ? WHERE id_pregunta = ?', [nuevoTexto, id]);
    res.sendStatus(200);
  } catch (error) {
    console.error('Error actualizando pregunta:', error);
    res.status(500).send('Error actualizando pregunta');
  }
});

// Opciones: eliminar, editar, agregar (igual con validación y manejo de errores)

router.post('/eliminar-opcion', isAuthenticated, async (req, res) => {
  const { index, idPregunta } = req.body;
  try {
    const [opciones] = await req.pool.query('SELECT id_opcion FROM opcion_pregunta WHERE id_pregunta = ? ORDER BY id_opcion ASC', [idPregunta]);
    const id_opcion = opciones[index]?.id_opcion;
    if (!id_opcion) return res.status(400).send('Opción no encontrada');
    await req.pool.query('DELETE FROM opcion_pregunta WHERE id_opcion = ?', [id_opcion]);
    res.sendStatus(200);
  } catch (error) {
    console.error('Error eliminando opción:', error);
    res.status(500).send('Error eliminando opción');
  }
});

router.post('/editar-opcion', isAuthenticated, async (req, res) => {
  const { index, idPregunta, nuevoTexto } = req.body;
  try {
    const [opciones] = await req.pool.query('SELECT id_opcion FROM opcion_pregunta WHERE id_pregunta = ? ORDER BY id_opcion ASC', [idPregunta]);
    const id_opcion = opciones[index]?.id_opcion;
    if (!id_opcion) return res.status(400).send('Opción no encontrada');
    await req.pool.query('UPDATE opcion_pregunta SET texto_opcion = ? WHERE id_opcion = ?', [nuevoTexto, id_opcion]);
    res.sendStatus(200);
  } catch (error) {
    console.error('Error editando opción:', error);
    res.status(500).send('Error editando opción');
  }
});

router.post('/agregar-opcion', isAuthenticated, async (req, res) => {
  const { idPregunta, nuevaOpcion } = req.body;
  if (!idPregunta || !nuevaOpcion) return res.status(400).send('Datos incompletos');

  try {
    await req.pool.query('INSERT INTO opcion_pregunta (id_pregunta, texto_opcion) VALUES (?, ?)', [idPregunta, nuevaOpcion]);
    res.sendStatus(200);
  } catch (error) {
    console.error('Error agregando opción:', error);
    res.status(500).send('Error agregando opción');
  }
});

// Agregar pregunta
router.post('/agregar-pregunta', isAuthenticated, async (req, res) => {
  const { id_encuesta, texto_pregunta } = req.body;
  if (!id_encuesta || !texto_pregunta) return res.status(400).send('Datos incompletos');

  try {
    const [result] = await req.pool.query('INSERT INTO pregunta_encuesta (id_encuesta, texto, id_estatus_p) VALUES (?, ?, 4)', [id_encuesta, texto_pregunta]);
    res.status(201).json({ id_pregunta: result.insertId });
  } catch (error) {
    console.error('Error agregando pregunta:', error);
    res.status(500).send('Error agregando pregunta');
  }
});

// --- DATOS CURIOSOS ---

// Mostrar datos curiosos
// Agregar campo "fuente" a las rutas de datos curiosos

// Mostrar datos curiosos
router.get('/datos', isAuthenticated, async (req, res) => {
  try {
    const [datos] = await req.pool.query(`
      SELECT d.id_dato, d.dato, d.imagen, d.id_materia, d.fuente
      FROM dato_curioso d
      ORDER BY d.id_materia
    `);
    res.render('editor_datos', {
      layout: false,
      user: req.session.user,
      datos
    });
  } catch (error) {
    console.error('Error cargando datos:', error);
    res.status(500).send('Error cargando datos');
  }
});

// Agregar dato curioso con imagen y fuente
router.post('/agregar-dato', isAuthenticated, upload.single('imagen'), async (req, res) => {
  try {
    const { dato, id_materia, fuente } = req.body;
    const imagenBuffer = req.file ? req.file.buffer : null;

    if (!dato || !id_materia) return res.status(400).send('Dato o materia faltante');

    await req.pool.query(
      'INSERT INTO dato_curioso (dato, imagen, id_materia, fuente) VALUES (?, ?, ?, ?)',
      [dato, imagenBuffer, id_materia, fuente || null]
    );

    res.status(201).send('Dato agregado correctamente');
  } catch (error) {
    console.error('Error agregando dato:', error);
    res.status(500).send('Error agregando dato');
  }
});

// Editar dato curioso con imagen y fuente opcional
router.post('/editar-dato-binario', isAuthenticated, upload.single('imagen'), async (req, res) => {
  if (req.file) {
    console.log('Tamaño del archivo (bytes):', req.file.size);
    const maxSize = 64 * 1024 * 1024; // 64MB
    if (req.file.size > maxSize) {
      return res.status(400).send('Archivo demasiado grande');
    }
  }

  try {
    const { id, nuevoDato, fuente } = req.body;
    const imagenBuffer = req.file ? req.file.buffer : null;

    if (!id || !nuevoDato) return res.status(400).send('Datos incompletos');

    if (imagenBuffer) {
      await req.pool.query(
        'UPDATE dato_curioso SET dato = ?, imagen = ?, fuente = ? WHERE id_dato = ?',
        [nuevoDato, imagenBuffer, fuente || null, id]
      );
    } else {
      await req.pool.query(
        'UPDATE dato_curioso SET dato = ?, fuente = ? WHERE id_dato = ?',
        [nuevoDato, fuente || null, id]
      );
    }

    res.redirect('/editor/datos');
  } catch (error) {
    console.error('Error editando dato binario:', error);
    res.status(500).send('Error editando dato binario');
  }
});

// Eliminar dato curioso
router.delete('/eliminar-dato/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    await req.pool.query('DELETE FROM dato_curioso WHERE id_dato = ?', [id]);
    res.sendStatus(200);
  } catch (error) {
    console.error('Error eliminando dato curioso:', error);
    res.status(500).send('Error eliminando dato curioso');
  }
});



module.exports = router;
