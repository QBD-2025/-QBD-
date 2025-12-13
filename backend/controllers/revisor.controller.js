const { obtenerPreguntas, contarPreguntas, obtenerRespuestas, obtenerDatos} = require('../queries/editor.queries.js');
const { 
  obtenerPreguntasEnRevision,
  obtenerRespuestasRevision,
  obtenerDatosEnRevision,
  aprobarPregunta,
  rechazarPregunta,
  aprobarDato,
  rechazarDato
} = require('../queries/revisor.queries.js');

// ==================== TUS FUNCIONES EXISTENTES ====================
async function mostrarEncuesta(req, res) {
  try {
    res.render('revisor', { layout: 'main', user: req.session.user});
  } catch (err) {
    console.error('Error cargando encuesta:', err);
    res.status(500).send('Error cargando encuesta');
  }
}

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
    const preguntasAgrupadas = preguntasPage.map(p => ({
      ...p,
      retroalimentacion: p.retroalimentacion || '',
      respuestas: filas.filter(r => r.id_pregunta === p.id_pregunta)
    }));
    res.render('revisor', { 
      layout: 'main', 
      user: req.session.user, 
      preguntas: preguntasAgrupadas, 
      page, 
      totalPages 
    });
  } catch (err) {
    console.error('Error cargando exámenes:', err);
    res.status(500).send('Error cargando exámenes');
  }
}

async function mostrarDatos(req, res) {
  try {
    const datos = await obtenerDatos(req.pool);
    res.render('revisor_datos', { 
      layout: 'main', 
      user: req.session.user, 
      datos 
    });
  } catch (err) {
    console.error('Error cargando datos:', err);
    res.status(500).send('Error cargando datos');
  }
}

// ==================== NUEVAS FUNCIONES PARA REVISIÓN ====================
async function mostrarPanelRevisor(req, res) {
  try {
    const preguntas = await obtenerPreguntasEnRevision(req.pool);
    
    res.render('revisor', { 
      layout: 'main', 
      user: req.session.user,
      preguntas
    });
  } catch (err) {
    console.error('Error cargando panel revisor:', err);
    res.status(500).send('Error cargando panel revisor');
  }
}

async function mostrarPreguntasRevision(req, res) {
  try {
    const preguntas = await obtenerPreguntasEnRevision(req.pool);
    const idsPreguntas = preguntas.map(p => p.id_pregunta);
    const respuestas = await obtenerRespuestasRevision(req.pool, idsPreguntas);
    
    const preguntasConRespuestas = preguntas.map(p => ({
      ...p,
      respuestas: respuestas.filter(r => r.id_pregunta === p.id_pregunta)
    }));
    
    res.render('revisor-preguntas', { 
      layout: 'main', 
      user: req.session.user,
      preguntas: preguntasConRespuestas
    });
  } catch (err) {
    console.error('Error cargando preguntas en revisión:', err);
    res.status(500).send('Error cargando preguntas');
  }
}

async function mostrarDatosRevision(req, res) {
  try {
    const datos = await obtenerDatosEnRevision(req.pool);
    
    res.render('revisor_datos', { 
      layout: 'main', 
      user: req.session.user,
      datos
    });
  } catch (err) {
    console.error('Error cargando datos en revisión:', err);
    res.status(500).send('Error cargando datos');
  }
}

async function aprobarPreguntaHandler(req, res) {
  try {
    const idPregunta = req.params.id;
    
    if (!idPregunta) {
      return res.status(400).json({ 
        success: false, 
        error: 'ID de pregunta no proporcionado' 
      });
    }
    
    await aprobarPregunta(req.pool, idPregunta);
    
    res.json({ 
      success: true, 
      mensaje: 'Pregunta aprobada y publicada correctamente' 
    });
  } catch (err) {
    console.error('Error aprobando pregunta:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Error al aprobar la pregunta',
      detalles: err.message
    });
  }
}

async function rechazarPreguntaHandler(req, res) {
  try {
    const idPregunta = req.params.id;
    
    if (!idPregunta) {
      return res.status(400).json({ 
        success: false, 
        error: 'ID de pregunta no proporcionado' 
      });
    }
    
    await rechazarPregunta(req.pool, idPregunta);
    
    res.json({ 
      success: true, 
      mensaje: 'Pregunta rechazada y eliminada correctamente' 
    });
  } catch (err) {
    console.error('Error rechazando pregunta:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Error al rechazar la pregunta',
      detalles: err.message
    });
  }
}

async function aprobarDatoHandler(req, res) {
  try {
    const idDato = req.params.id;
    
    if (!idDato) {
      return res.status(400).json({ 
        success: false, 
        error: 'ID de dato no proporcionado' 
      });
    }
    
    await aprobarDato(req.pool, idDato);
    
    res.json({ 
      success: true, 
      mensaje: 'Dato aprobado y publicado correctamente' 
    });
  } catch (err) {
    console.error('Error aprobando dato:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Error al aprobar el dato',
      detalles: err.message
    });
  }
}

async function rechazarDatoHandler(req, res) {
  try {
    const idDato = req.params.id;
    
    if (!idDato) {
      return res.status(400).json({ 
        success: false, 
        error: 'ID de dato no proporcionado' 
      });
    }
    
    await rechazarDato(req.pool, idDato);
    
    res.json({ 
      success: true, 
      mensaje: 'Dato rechazado y eliminado correctamente' 
    });
  } catch (err) {
    console.error('Error rechazando dato:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Error al rechazar el dato',
      detalles: err.message
    });
  }
}

// ==================== EXPORTAR TODO ====================
module.exports = { 
  mostrarEncuesta,
  mostrarExamenes,
  mostrarDatos,
  mostrarPanelRevisor,
  mostrarPreguntasRevision,
  mostrarDatosRevision,
  aprobarPreguntaHandler,
  rechazarPreguntaHandler,
  aprobarDatoHandler,
  rechazarDatoHandler
};