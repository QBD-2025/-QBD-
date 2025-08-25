const express = require('express');
const router = express.Router();
const db = require('../db/conexion'); // Ajusta esta ruta a tu conexión real

// Mostrar examen para una materia específica
router.get('/examen/:id_materia', async (req, res) => {
  const { id_materia } = req.params;

  try {
    // Obtener descripción de la materia
    const [[materiaRow]] = await db.query(
      'SELECT descripcion FROM materias WHERE id_materia = ?',
      [id_materia]
    );

    // Obtener preguntas para la materia
    const [preguntas] = await db.query(`
      SELECT id_pregunta, pregunta, retroalimentacion
      FROM pregunta
      WHERE id_materia = ?
      LIMIT 20
    `, [id_materia]);

    // Por cada pregunta, obtener sus respuestas
    for (let pregunta of preguntas) {
      const [respuestas] = await db.query(`
        SELECT id_respuesta, respuesta, correcta, puntos
        FROM respuesta
        WHERE id_pregunta = ?
      `, [pregunta.id_pregunta]); 

      pregunta.respuestas = respuestas;
    }

    // Renderizar vista examen
    res.render('examen', {
      preguntas,
      materia: materiaRow?.descripcion || 'Materia desconocida',
      id_materia,
      layout: false
    });

  } catch (error) {
    console.error('Error cargando preguntas del examen:', error);
    res.status(500).send('Error cargando el examen');
  }
});

// Mostrar lista de materias para elegir examen
router.get('/eleccion_examen', async (req, res) => {
  try {
    const [materias] = await db.query('SELECT id_materia, descripcion FROM materias');
    res.render('eleccion-examen', { materias, layout: false });
  } catch (err) {
    console.error('Error al obtener materias:', err);
    res.status(500).send('Error al cargar materias');
  }
});

// 📌 Resultados de examen por materia
router.post('/resultados', async (req, res) => {
  try {
    let respuestasUsuario = req.body.respuestas;
    const id_materia = req.body.id_materia;
    const id_usuario = req.session.user?.id_usuario;

    if (!id_usuario) {
      return res.status(400).send('Falta id_usuario en la petición');
    }

    if (typeof respuestasUsuario === 'string') {
      respuestasUsuario = JSON.parse(respuestasUsuario);
    }

    const [[materiaRow]] = await db.query(
      'SELECT descripcion FROM materias WHERE id_materia = ?',
      [id_materia]
    );

    const [preguntas] = await db.query(`
      SELECT id_pregunta, pregunta
      FROM pregunta
      WHERE id_materia = ?
      LIMIT 20
    `, [id_materia]);

    let puntosTotales = 0;

    for (let i = 0; i < preguntas.length; i++) {
      const [respuestasBD] = await db.query(`
        SELECT respuesta, correcta
        FROM respuesta
        WHERE id_pregunta = ?
      `, [preguntas[i].id_pregunta]);

      preguntas[i].respuestas = respuestasBD;

      const seleccionadaIdx = respuestasUsuario[i];
      preguntas[i].seleccionada = seleccionadaIdx;
      preguntas[i].textoSeleccionado = respuestasBD[seleccionadaIdx]?.respuesta || 'No respondida';
      preguntas[i].esCorrecta = respuestasBD[seleccionadaIdx]?.correcta === 1;

      if (preguntas[i].esCorrecta) {
        puntosTotales += 1;
      }
    }

    // 🔹 Sumar puntos directamente al id_usuario enviado
    await db.query(`
      UPDATE usuario
      SET puntos = puntos + ?
      WHERE id_usuario = ?
    `, [puntosTotales, id_usuario]);

    const totalPreguntas = preguntas.length;
    const porcentaje = ((puntosTotales / totalPreguntas) * 100).toFixed(2);

    res.render('resultados', {
      materia: materiaRow?.descripcion || 'Materia desconocida',
      preguntas,
      puntosTotales,
      porcentaje,
      layout: false
    });

  } catch (error) {
    console.error('Error generando resultados:', error);
    res.status(500).send('Error mostrando resultados');
  }
});

// 📌 Resultados examen aleatorio
router.post('/resultados-aleatorio', async (req, res) => {
  try {
    let respuestasUsuario = req.body.respuestas;
    const id_usuario = req.session.user?.id_usuario;

    if (!id_usuario) {
      return res.status(400).send('Falta id_usuario en la petición');
    }

    if (typeof respuestasUsuario === 'string') {
      respuestasUsuario = JSON.parse(respuestasUsuario);
    }

    const preguntas = req.session.preguntasAleatorias || [];
    let puntosTotales = 0;

    for (let i = 0; i < preguntas.length; i++) {
      const respuestasBD = preguntas[i].respuestas;

      const seleccionadaIdx = respuestasUsuario[i];
      preguntas[i].seleccionada = seleccionadaIdx;
      preguntas[i].textoSeleccionado = respuestasBD[seleccionadaIdx]?.respuesta || 'No respondida';
      preguntas[i].esCorrecta = respuestasBD[seleccionadaIdx]?.correcta === 1;

      if (preguntas[i].esCorrecta) {
        puntosTotales += 1;
      }
    }

    // 🔹 Sumar puntos directamente al id_usuario
    await db.query(`
      UPDATE usuario
      SET puntos = puntos + ?
      WHERE id_usuario = ?
    `, [puntosTotales, id_usuario]);

    const totalPreguntas = preguntas.length;
    const porcentaje = ((puntosTotales / totalPreguntas) * 100).toFixed(2);

    res.render('resultados', {
      materia: "Examen Aleatorio",
      preguntas,
      puntosTotales,
      porcentaje,
      layout: false
    });

  } catch (error) {
    console.error('Error generando resultados del examen aleatorio:', error);
    res.status(500).send('Error mostrando resultados');
  }
});


module.exports = router;
