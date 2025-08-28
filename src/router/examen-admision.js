const express = require('express');
const router = express.Router();
const db = require('../db/conexion'); // promisificado

// Generar examen EXANI (varias materias)
router.get('/examen-exani', async (req, res) => {
  try {
    const preguntasPorMateria = 20;
    const id_usuario = req.session.user?.id_usuario;

    const [materias] = await db.query(`
      SELECT * FROM materias 
      WHERE id_materia IN (1, 2, 3, 4, 5)
      ORDER BY id_materia ASC
    `);

    const preguntasFinales = [];

    for (const materia of materias) {
      const [preguntas] = await db.query(
        `SELECT * FROM pregunta WHERE id_materia = ? ORDER BY RAND() LIMIT ?`,
        [materia.id_materia, preguntasPorMateria]
      );

      for (const p of preguntas) {
        const [respuestas] = await db.query(
          `SELECT id_respuesta, respuesta, correcta FROM respuesta WHERE id_pregunta = ?`,
          [p.id_pregunta]
        );

        preguntasFinales.push({
          ...p,
          materia: materia.descripcion,
          respuestas
        });
      }
    }

    const [topGlobal] = await db.query(`
      SELECT 
        u.id_usuario,
        u.username,
        u.apodo,
        u.puntos,
        r.posicion,
        r.fecha_actualizacion
      FROM usuario u
      LEFT JOIN ranking r ON u.id_usuario = r.id_usuario
      ORDER BY u.puntos DESC, r.fecha_actualizacion ASC
      LIMIT 1
    `);

    preguntasFinales.sort((a, b) => a.id_materia - b.id_materia);

    // Obtener porcentaje del último examen del usuario
    let ultimoExamen = null;
    if (id_usuario) {
      const [usuarioRow] = await db.query(`
        SELECT ultimo_examen
        FROM usuario
        WHERE id_usuario = ?
      `, [id_usuario]);
      ultimoExamen = usuarioRow[0]?.ultimo_examen || null;
    }

    res.render('examen-admision', {
      title: 'Examen de Admisión',
      preguntas: preguntasFinales,
      layout: false,
      preguntasIds: preguntasFinales.map(p => p.id_pregunta),
      rankingData: topGlobal,
      topPlayer: topGlobal[0] || null,
      ultimoExamen
    });

  } catch (err) {
    console.error(err);
    res.status(500).send('Error al generar el examen');
  }
});

// Resultados EXANI con porcentaje y guardado en historial
router.post('/resultados_admision', async (req, res) => {
  try {
    const respuestasUsuario = JSON.parse(req.body.respuestas || '[]');
    const idsPreguntas = JSON.parse(req.body.idsPreguntas || '[]');

    if (respuestasUsuario.length !== idsPreguntas.length) {
      return res.status(400).send('Datos de respuestas incompletos');
    }

    const id_usuario = req.session.user?.id_usuario;

    const [filas] = await db.query(
      `SELECT p.id_pregunta, p.pregunta, r.id_respuesta, r.respuesta, r.correcta, m.descripcion AS materia
       FROM pregunta p
       JOIN respuesta r ON p.id_pregunta = r.id_pregunta
       JOIN materias m ON p.id_materia = m.id_materia
       WHERE p.id_pregunta IN (?)
       ORDER BY p.id_pregunta, r.id_respuesta`,
      [idsPreguntas]
    );

    const preguntasMap = new Map();
    let materiaNombre = 'General';

    for (const fila of filas) {
      if (!preguntasMap.has(fila.id_pregunta)) {
        preguntasMap.set(fila.id_pregunta, {
          id_pregunta: fila.id_pregunta,
          pregunta: fila.pregunta,
          materia: fila.materia,
          respuestas: []
        });
        materiaNombre = fila.materia;
      }
      preguntasMap.get(fila.id_pregunta).respuestas.push({
        id_respuesta: fila.id_respuesta,
        respuesta: fila.respuesta,
        correcta: fila.correcta === 1
      });
    }

    let puntosTotales = 0;
    const preguntasParaResultado = [];

    // 1️⃣ Crear registro de examen
    let id_examen = null;
    if (id_usuario) {
      const fechaInicio = new Date();
      const duracion = 60; // duración en minutos
      const fechaTermino = new Date(fechaInicio.getTime() + duracion * 60000);

      const [examenResult] = await db.query(
        `INSERT INTO examen 
          (fecha_inicio, fecha_termino, duracion, puntuacion_competencia)
         VALUES (?, ?, ?, ?)`,
        [ fechaInicio, fechaTermino, duracion, 0]
      );

      id_examen = examenResult.insertId;
    }

    // 2️⃣ Procesar cada respuesta
    for (let i = 0; i < idsPreguntas.length; i++) {
      const idPregunta = idsPreguntas[i];
      const indiceRespuestaUsuario = respuestasUsuario[i];

      const preguntaData = preguntasMap.get(idPregunta);
      if (!preguntaData) continue;

      const respuestaSeleccionada = preguntaData.respuestas[indiceRespuestaUsuario] || null;
      const respuestaId = respuestaSeleccionada ? respuestaSeleccionada.id_respuesta : null;
      const esCorrecta = respuestaSeleccionada ? respuestaSeleccionada.correcta : false;
      if (esCorrecta) puntosTotales++;

      preguntasParaResultado.push({
        pregunta: preguntaData.pregunta,
        respuestas: preguntaData.respuestas,
        esCorrecta,
        textoSeleccionado: respuestaSeleccionada ? respuestaSeleccionada.respuesta : 'No respondida'
      });

      // 3️⃣ Guardar en historial
      if (id_usuario && id_examen) {
        await db.query(
          `INSERT INTO historial (id_examen, id_usuario, id_pregunta, id_respuesta, puntos, porcentaje)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [id_examen, id_usuario, idPregunta, respuestaId, esCorrecta ? 1 : 0, 0]
        );
      }
    }

    const totalPreguntas = idsPreguntas.length;
    const porcentaje = ((puntosTotales / totalPreguntas) * 100).toFixed(2);

    // 4️⃣ Actualizar porcentaje en historial de este examen
    if (id_usuario && id_examen) {
      await db.query(
        `UPDATE historial
         SET porcentaje = ?
         WHERE id_examen = ? AND id_usuario = ?`,
        [porcentaje, id_examen, id_usuario]
      );
    }

    res.render('resultados_admision', {
      materia: materiaNombre,
      puntosTotales,
      totalPreguntas,
      porcentaje,
      preguntas: preguntasParaResultado,
      ultimoExamen: porcentaje
    });

  } catch (error) {
    console.error(error);
    res.status(500).send('Error al procesar resultados');
  }
});

module.exports = router;
