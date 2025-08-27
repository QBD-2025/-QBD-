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
      ultimoExamen // ✅ ahora sí lo pasamos a la vista
    });

  } catch (err) {
    console.error(err);
    res.status(500).send('Error al generar el examen');
  }
});

// 📌 Resultados EXANI con porcentaje, suma de puntos al usuario y último resultado
router.post('/resultados_admision', async (req, res) => {
  try {
    const respuestasUsuario = JSON.parse(req.body.respuestas || '[]');
    const idsPreguntas = JSON.parse(req.body.idsPreguntas || '[]');

    if (respuestasUsuario.length !== idsPreguntas.length) {
      return res.status(400).send('Datos de respuestas incompletos');
    }

    const id_usuario = req.session.user?.id_usuario; // <- obtenemos usuario de la sesión

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

    for (let i = 0; i < idsPreguntas.length; i++) {
      const idPregunta = idsPreguntas[i];
      const indiceRespuestaUsuario = respuestasUsuario[i];

      const preguntaData = preguntasMap.get(idPregunta);
      if (!preguntaData) continue;

      const respuestaSeleccionada = preguntaData.respuestas[indiceRespuestaUsuario];
      const esCorrecta = respuestaSeleccionada ? respuestaSeleccionada.correcta : false;
      if (esCorrecta) puntosTotales++;

      preguntasParaResultado.push({
        pregunta: preguntaData.pregunta,
        respuestas: preguntaData.respuestas,
        esCorrecta,
        textoSeleccionado: respuestaSeleccionada ? respuestaSeleccionada.respuesta : 'No respondida'
      });
    }

    // 🔹 Calcular porcentaje
    const totalPreguntas = idsPreguntas.length;
    const porcentaje = ((puntosTotales / totalPreguntas) * 100).toFixed(2);

    // 🔹 Guardar y obtener último resultado si el usuario está logueado
    if (id_usuario) {
      // Guardar el resultado actual en una tabla de historial
      await db.query(
        `INSERT INTO resultados (id_usuario, puntaje, total, porcentaje, fecha) 
         VALUES (?, ?, ?, ?, NOW())`,
        [id_usuario, puntosTotales, totalPreguntas, porcentaje]
      );

      // Obtener el último resultado guardado
      const [rowsUltimo] = await db.query(
        `SELECT puntaje, total, porcentaje, fecha 
         FROM resultados 
         WHERE id_usuario = ? 
         ORDER BY fecha DESC 
         LIMIT 1`,
        [id_usuario]
      );

      // Sumar puntos al usuario
      await db.query(
        `UPDATE usuario
         SET puntos = puntos + ?, ultimo_examen = ?
         WHERE id_usuario = ?`,
        [puntosTotales, porcentaje, id_usuario]
      );
    }

    res.render('resultados_admision', {
      materia: materiaNombre,
      puntosTotales,
      totalPreguntas,
      porcentaje,
      preguntas: preguntasParaResultado,
      ultimoExamen
    });

  } catch (error) {
    console.error(error);
    res.status(500).send('Error al procesar resultados');
  }
});

module.exports = router;