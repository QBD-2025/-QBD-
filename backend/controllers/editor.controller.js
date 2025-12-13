// controllers/editor.controller.js

// Importa las queries necesarias para exámenes, respuestas, datos
const { errorMonitor } = require('nodemailer/lib/xoauth2/index.js');
const { obtenerPreguntas, contarPreguntas, obtenerRespuestas, obtenerDatos, agregarPregunta, eliminarPregunta, editarPregunta, agregarDato, modificarDato, eliminarDato, obtenerMaterias, obtenerTematicas} = require('../queries/editor.queries.js');
const { json } = require('body-parser');


// Mostrar listado de exámenes con paginación

async function mostrarExamenes(req, res) {
  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const offset = (page - 1) * limit;

  try {
    const totalPreguntas = await contarPreguntas(req.pool);
    const totalPages = Math.ceil(totalPreguntas / limit);
    const preguntasPage = await obtenerPreguntas(req.pool, limit, offset);
    const idsPreguntas = preguntasPage.map(p => p.id_pregunta);
    const filas = await obtenerRespuestas(req.pool, idsPreguntas);

    // ✅ Obtener materias y temáticas
    const materias = await obtenerMaterias(req.pool);
    const tematicas = await obtenerTematicas(req.pool);

    const preguntasAgrupadas = preguntasPage.map(p => ({
      ...p,
      retroalimentacion: p.retroalimentacion || '',
      respuestas: filas.filter(r => r.id_pregunta === p.id_pregunta)
    }));

    res.render('editor_examen', { 
      layout: false, 
      user: req.session.user, 
      preguntas: preguntasAgrupadas, 
      materias,      // ← Pasar materias a la vista
      tematicas,     // ← Pasar temáticas a la vista
      page, 
      totalPages 
    });
  } catch (err) {
    console.error('Error cargando exámenes:', err);
    res.status(500).send('Error cargando exámenes');
  }
}

// Mostrar datos curiosos para el editor

async function mostrarDatos(req, res) {
  try {
    const datos = await obtenerDatos(req.pool);
    res.render('editor_datos', { layout: false, user: req.session.user, datos });
  } catch (err) {
    console.error('Error cargando datos:', err);
    res.status(500).send('Error cargando datos');
  }
}

async function agregarPreguntaExamen(req, res) {
  try {
    const preguntaData = {
      id_materia: parseInt(req.body.id_materia),
      id_tematica: req.body.id_tematica ? parseInt(req.body.id_tematica) : null, // ← Nuevo
      pregunta: req.body.pregunta,
      retroalimentacion: req.body.retroalimentacion || '',
      respuestas: req.body.respuestas
    };

    if (!preguntaData.id_materia || !preguntaData.pregunta) {
      return res.status(400).json({ 
        success: false, 
        error: 'Faltan datos requeridos (id_materia y pregunta)' 
      });
    }

    const resultado = await agregarPregunta(req.pool, preguntaData);

    res.json({ 
      success: true, 
      mensaje: resultado.mensaje,
      idPregunta: resultado.idPregunta
    });
  } catch (err) {
    console.error('Error agregando pregunta:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Error al agregar la pregunta',
      detalles: err.message
    });
  }
}

async function editarPreguntaExamen(req, res) {
  try {
    const { id_pregunta, id_materia, id_tematica, pregunta, retroalimentacion, respuestas } = req.body;

    if (!id_pregunta || !id_materia || !pregunta) {
      return res.status(400).json({ 
        success: false, 
        error: 'Faltan datos requeridos' 
      });
    }

    await editarPregunta(req.pool, {
      id_pregunta,
      id_materia,
      id_tematica: id_tematica || null,  // ← Nuevo
      pregunta,
      retroalimentacion,
      respuestas
    });

    res.json({ 
      success: true, 
      mensaje: 'Pregunta actualizada correctamente' 
    });
  } catch (err) {
    console.error('Error editando pregunta:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Error al editar la pregunta',
      detalles: err.message
    });
  }
}

async function eliminarPreguntaExamen(req, res) {
  try {
    const idPregunta = req.params.id;

    if (!idPregunta) {
      return res.status(400).json({ 
        success: false, 
        error: 'ID de pregunta no proporcionado' 
      });
    }

    await eliminarPregunta(req.pool, idPregunta);

    res.json({ 
      success: true, 
      mensaje: 'Pregunta eliminada correctamente' 
    });
  } catch (err) {
    console.error('Error eliminando pregunta:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Error al eliminar la pregunta',
      detalles: err.message
    });
  }
}

async function borrarDato(req, res) {
  try {
    const idDato = req.params.id;

    if (!idDato) {
      return res.status(400), json ({
        success: false,
        error: "ID de dato no proporcionado"
      });
    }

    await eliminarDato(req.pool, idDato);

    res.json ({
      success:true,
      mensaje: "Dato eliminado correctamente"
    });
  } catch (err) {
    console.error("Error al eliminar dato:", err)
    res.status(500).json({
      success:false,
      error: "Error al eleminar el dato",
      detalles: err.message
    })
  }
}

async function agregardato(req, res) {
  try {
    console.log('========== AGREGAR DATO ==========');
    console.log('Body:', req.body);
    console.log('Archivo:', req.file);
    console.log('==================================');

    const datoData = {
      id_materia: parseInt(req.body.id_materia),
      dato: req.body.dato,
      imagen: req.file ? req.file.buffer : null, // Buffer de la imagen
      fuente: req.body.fuente || ''
    };

    if (!datoData.id_materia || !datoData.dato || !datoData.fuente) {
      return res.status(400).json({ 
        success: false, 
        error: 'Faltan datos requeridos (id_materia, dato y fuente)' 
      });
    }

    const resultadoDato = await agregarDato(req.pool, datoData);

    res.json({
      success: true,
      mensaje: resultadoDato.mensaje,
      idDato: resultadoDato.idDato
    });
  } catch (err) {
    console.error('Error agregando dato:', err);
    res.status(500).json({
      success: false,
      error: 'Error al agregar el dato',
      detalles: err.message
    });
  }
}

async function editarDato(req, res) {
  try {
    console.log('========== EDITAR DATO ==========');
    console.log('Body:', req.body);
    console.log('Archivo:', req.file);
    console.log('=================================');

    const datoData = {
      id_dato: parseInt(req.body.id_dato),
      id_materia: parseInt(req.body.id_materia),
      dato: req.body.dato,
      fuente: req.body.fuente || ''
    };

    // Solo agregar imagen si se subió un archivo nuevo
    if (req.file) {
      datoData.imagen = req.file.buffer;
    } else if (req.body.eliminar_imagen === 'true') {
      // Si se marcó eliminar imagen
      datoData.imagen = null;
    }
    // Si no hay archivo ni se marca eliminar, no se incluye 'imagen' 
    // y la query mantendrá la imagen anterior

    if (!datoData.id_dato || !datoData.id_materia || !datoData.fuente) {
      return res.status(400).json({
        success: false,
        error: "Faltan datos requeridos"
      });
    }

    const resultado = await modificarDato(req.pool, datoData);

    res.json({
      success: true,
      mensaje: resultado.mensaje
    });
  } catch (err) {
    console.error("Error editando el dato:", err);
    res.status(500).json({
      success: false,
      error: "Error al editar el dato",
      detalles: err.message
    });
  }
}

module.exports = { eliminarPreguntaExamen, editarPreguntaExamen, mostrarExamenes, mostrarDatos, agregarPreguntaExamen, agregardato, editarDato, borrarDato};
