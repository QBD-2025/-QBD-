// En: routes/examenR.js
const express = require('express');
const router = express.Router();
const db = require('../db/conexion');

// ===================================================================================
// RUTA GET PARA MOSTRAR EL EXAMEN (AJUSTADA)
// ===================================================================================
router.get('/examen/:id_materia', async (req, res) => {
    const { id_materia } = req.params;
    const id_usuario = req.session.user?.id_usuario;

    try {
        const [[materiaRow]] = await db.query('SELECT descripcion FROM materias WHERE id_materia = ?', [id_materia]);
        if (!materiaRow) return res.status(404).send('Materia no encontrada');

        const [preguntas] = await db.query(
            'SELECT id_pregunta, pregunta, retroalimentacion, puntos FROM pregunta WHERE id_materia = ? LIMIT 20',
            [id_materia]
        );

        for (let pregunta of preguntas) {
            const [respuestas] = await db.query(
                'SELECT id_respuesta, respuesta, correcta FROM respuesta WHERE id_pregunta = ?',
                [pregunta.id_pregunta]
            );
            pregunta.respuestas = respuestas;
        }
        
        let ultimoExamen = null;
        if (id_usuario) {
            // ✅ CAMBIO 1: Se busca el último examen DE ESTA MATERIA en la tabla `usuario_examen`
            const [ultimoExamenRow] = await db.query(`
                SELECT ue.porcentaje 
                FROM usuario_examen ue
                JOIN examen e ON ue.id_examen = e.id_examen
                WHERE ue.id_usuario = ? AND e.id_materia = ?
                ORDER BY ue.fecha_termino DESC 
                LIMIT 1
            `, [id_usuario, id_materia]);
            
            if (ultimoExamenRow.length > 0) {
                ultimoExamen = ultimoExamenRow[0].porcentaje;
            }
        }

        const [topGlobal] = await db.query(`
            SELECT u.username, u.apodo, u.puntos,u.foto_perfil FROM usuario u
            LEFT JOIN ranking r ON u.id_usuario = r.id_usuario
            ORDER BY u.puntos DESC, r.fecha_actualizacion ASC LIMIT 1
        `);

        res.render('examen', {
            preguntas,
            materia: materiaRow.descripcion,
            id_materia,
            rankingData: topGlobal,
            topPlayer: topGlobal[0] || null,
            ultimoExamen, // Se envía el porcentaje del último intento de esta materia
            layout: false
        });
    } catch (error) {
        console.error('Error cargando preguntas del examen:', error);
        res.status(500).send('Error cargando el examen');
    }
});

// Examen aleatorio
router.get('/examen-aleatorio', async (req, res) => {
  try {
    const id_usuario = req.session.user?.id_usuario;
    if (!id_usuario) return res.status(400).send('Usuario no identificado');

    const [preguntas] = await db.query(`
      SELECT id_pregunta, pregunta, retroalimentacion
      FROM pregunta
      ORDER BY RAND()
      LIMIT 20
    `);

    for (let pregunta of preguntas) {
      const [respuestas] = await db.query(`
        SELECT id_respuesta, respuesta, correcta, puntos
        FROM respuesta
        WHERE id_pregunta = ?
      `, [pregunta.id_pregunta]);
      pregunta.respuestas = respuestas.sort(() => Math.random() - 0.5);
    }

    req.session.preguntasAleatorias = preguntas;

    const [topGlobal] = await db.query(`
      SELECT 
        u.id_usuario,
        u.username,
        u.apodo,
        u.puntos,
        r.posicion,
        u.foto_perfil,
        r.fecha_actualizacion
      FROM usuario u
      LEFT JOIN ranking r ON u.id_usuario = r.id_usuario
      ORDER BY u.puntos DESC, r.fecha_actualizacion ASC
      LIMIT 1
    `);

    // Obtener último examen
    const [usuarioRow] = await db.query(`
      SELECT ultimo_examen
      FROM usuario
      WHERE id_usuario = ?
    `, [id_usuario]);
    const ultimoExamen = usuarioRow[0]?.ultimo_examen || null;

    res.render('examen', {
      preguntas,
      materia: "al azar",
      id_materia: 0,
      rankingData: topGlobal,
      topPlayer: topGlobal[0] || null,
      ultimoExamen,
      layout: false
    });

  } catch (error) {
    console.error('Error generando examen aleatorio:', error);
    res.status(500).send('Error cargando examen aleatorio');
  }
});

// Lista de materias
router.get('/eleccion_examen', async (req, res) => {
  try {
    const [materias] = await db.query('SELECT id_materia, descripcion FROM materias');
    res.render('eleccion-examen', { materias, layout: false });
  } catch (err) {
    console.error('Error al obtener materias:', err);
    res.status(500).send('Error al cargar materias');
  }
});

router.post('/resultados', async (req, res) => {
    try {
        const { id_materia, respuestas, fecha_inicio_str } = req.body;
        const id_usuario = req.session.user?.id_usuario;
        
        if (!id_usuario) return res.status(400).send('Falta id_usuario en la petición.');
        
        const respuestasUsuario = JSON.parse(respuestas);
        const fechaInicio = new Date(fecha_inicio_str);
        const fechaTermino = new Date();

        const [preguntas] = await db.query(
            'SELECT id_pregunta, pregunta, puntos FROM pregunta WHERE id_materia = ? LIMIT 20',
            [id_materia]
        );

        let puntosMaximos = 0;
        let puntosObtenidos = 0;
        const detallesRespuestas = [];

        for (const pregunta of preguntas) {
            puntosMaximos += pregunta.puntos;
            const [respuestasBD] = await db.query(
                'SELECT id_respuesta, respuesta, correcta FROM respuesta WHERE id_pregunta = ?',
                [pregunta.id_pregunta]
            );

            const respuestaUsuarioIndex = respuestasUsuario[pregunta.id_pregunta];
            const respuestaSeleccionada = respuestasBD[respuestaUsuarioIndex];
            
            const esCorrecta = respuestaSeleccionada?.correcta === 1;
            if (esCorrecta) {
                puntosObtenidos += pregunta.puntos;
            }

            detallesRespuestas.push({
                ...pregunta,
                respuestas: respuestasBD,
                textoSeleccionado: respuestaSeleccionada?.respuesta || 'No respondida',
                esCorrecta: esCorrecta,
            });
        }
        
        const duracionMs = fechaTermino.getTime() - fechaInicio.getTime();
        const duracionSegundos = Math.round(duracionMs / 1000);

        const [examenResult] = await db.query(
            'INSERT INTO examen (id_materia, duracion) VALUES (?, ?)',
            [id_materia, duracionSegundos]
        );
        const id_examen = examenResult.insertId;
        
        const porcentaje = puntosMaximos > 0 ? parseFloat(((puntosObtenidos / puntosMaximos) * 100).toFixed(2)) : 0;

        // ✅ CAMBIO 2: Se añade la columna `porcentaje` en la inserción
        await db.query(
            `INSERT INTO usuario_examen (id_usuario, id_examen, maximo, obtenido, fecha_inicio, fecha_termino, porcentaje)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [id_usuario, id_examen, puntosMaximos, puntosObtenidos, fechaInicio, fechaTermino, porcentaje]
        );

        // ✅ CAMBIO 3: Se elimina la actualización de la columna `ultimo_examen` en la tabla `usuario`
        await db.query(
            'UPDATE usuario SET puntos = puntos + ? WHERE id_usuario = ?',
            [puntosObtenidos, id_usuario]
        );
        
        const [[materiaRow]] = await db.query('SELECT descripcion FROM materias WHERE id_materia = ?', [id_materia]);

        res.render('resultados', {
            materia: materiaRow.descripcion,
            preguntas: detallesRespuestas,
            puntosTotales: puntosObtenidos,
            totalPreguntas: preguntas.length,
            porcentaje,
            layout: false
        });

    } catch (error) {
        console.error('Error generando resultados:', error);
        res.status(500).send('Error mostrando resultados');
    }
});


// Resultados examen aleatorio
router.post('/resultados-aleatorio', async (req, res) => {
  try {
    let respuestasUsuario = req.body.respuestas;
    const id_usuario = req.session.user?.id_usuario;
    if (!id_usuario) return res.status(400).send('Falta id_usuario en la petición');
    if (typeof respuestasUsuario === 'string') respuestasUsuario = JSON.parse(respuestasUsuario);

    const preguntas = req.session.preguntasAleatorias || [];
    let puntosTotales = 0;

    // 1️⃣ Crear registro de examen
    const fechaInicio = new Date();
    const duracion = 60;
    const fechaTermino = new Date(fechaInicio.getTime() + duracion * 60000);

    const [examenResult] = await db.query(
      `INSERT INTO examen (fecha_inicio, fecha_termino, duracion, puntuacion_competencia)
       VALUES (?, ?, ?, ?)`,
      [fechaInicio, fechaTermino, duracion, 0]
    );
    const id_examen = examenResult.insertId;

    // 2️⃣ Procesar respuestas y guardar en historial
    for (let i = 0; i < preguntas.length; i++) {
      const respuestasBD = preguntas[i].respuestas;
      const seleccionadaIdx = respuestasUsuario[i];
      const seleccionada = respuestasBD[seleccionadaIdx] || null;
      const esCorrecta = seleccionada?.correcta === 1;
      if (esCorrecta) puntosTotales++;

      preguntas[i].seleccionada = seleccionadaIdx;
      preguntas[i].textoSeleccionado = seleccionada?.respuesta || 'No respondida';
      preguntas[i].esCorrecta = esCorrecta;

      await db.query(`
        INSERT INTO historial (id_examen, id_usuario, id_pregunta, id_respuesta, puntos, porcentaje)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [id_examen, id_usuario, preguntas[i].id_pregunta, seleccionada?.id_respuesta || null, esCorrecta ? 1 : 0, 0]);
    }

    const totalPreguntas = preguntas.length;
    const porcentaje = ((puntosTotales / totalPreguntas) * 100).toFixed(2);

    // 3️⃣ Actualizar porcentaje en historial
    await db.query(`
      UPDATE historial
      SET porcentaje = ?
      WHERE id_examen = ? AND id_usuario = ?
    `, [porcentaje, id_examen, id_usuario]);

    // 4️⃣ Actualizar puntos y último examen
    await db.query(`
      UPDATE usuario
      SET puntos = puntos + ?, ultimo_examen = ?
      WHERE id_usuario = ?
    `, [puntosTotales, porcentaje, id_usuario]);

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


////////////////////////////////////////////// Examenes de carrera ////////////////////////////////////////
router.get('/examen_carrera', async (req, res) => {
    try {
        const id_usuario = req.session.user?.id_usuario;
        if (!id_usuario) return res.status(400).send('Usuario no identificado');

        // 1️⃣ Obtener la carrera del usuario
        const [[usuarioCarrera]] = await db.query(`
            SELECT id_carrera 
            FROM usuario_carrera 
            WHERE id_usuario = ?
        `, [id_usuario]);

        if (!usuarioCarrera) return res.status(404).send('No se encontró la carrera del usuario');

        const id_carrera = usuarioCarrera.id_carrera;

        // 2️⃣ Obtener las materias de esa carrera
        const [materias] = await db.query(`
            SELECT id_materia, descripcion 
            FROM materias 
            WHERE id_carrera = ?
        `, [id_carrera]);

        if (materias.length === 0) return res.status(404).send('No hay materias asignadas a esta carrera');

        // 3️⃣ (Opcional) Obtener las preguntas de todas las materias de esta carrera
        // Por ejemplo, seleccionando hasta 10 preguntas por materia
        const preguntasPorMateria = [];
        for (const materia of materias) {
            const [preguntas] = await db.query(`
                SELECT id_pregunta, pregunta, retroalimentacion, puntos 
                FROM pregunta 
                WHERE id_materia = ? 
                LIMIT 10
            `, [materia.id_materia]);

            for (let pregunta of preguntas) {
                const [respuestas] = await db.query(`
                    SELECT id_respuesta, respuesta, correcta 
                    FROM respuesta 
                    WHERE id_pregunta = ?
                `, [pregunta.id_pregunta]);

                pregunta.respuestas = respuestas.sort(() => Math.random() - 0.5); // Barajar respuestas
            }

            preguntasPorMateria.push({
                materia: materia.descripcion,
                preguntas
            });
        }

        // 4️⃣ Renderizar la vista
        res.render('examen-carrera', {
            materias,
            preguntasPorMateria,
            layout: false
        });

    } catch (error) {
        console.error('Error cargando examen de carrera:', error);
        res.status(500).send('Error cargando examen de carrera');
    }
});

// En routes/examenR.js
router.get('/materias_carrera', async (req, res) => {
    try {
        const id_usuario = req.session.user?.id_usuario;
        if (!id_usuario) return res.status(400).send('Usuario no identificado');

        // Obtener la carrera del usuario
        const [[usuarioCarrera]] = await db.query(`
            SELECT id_carrera 
            FROM usuario_carrera
            WHERE id_usuario = ?
        `, [id_usuario]);

        if (!usuarioCarrera) return res.status(404).send('No se encontró la carrera del usuario');

        const id_carrera = usuarioCarrera.id_carrera;

        // Obtener las materias de esta carrera
        const [materias] = await db.query(`
          SELECT m.id_materia, m.descripcion
          FROM carrera_materia cm
          JOIN materias m ON cm.id_materia = m.id_materia
          WHERE cm.id_carrera = ?`, [id_carrera]);
        console.log('Materias de carrera', materias);
        res.render('materias-carrera', {
            materias,
            layout: false
        });

    } catch (error) {
        console.error('Error cargando materias de carrera:', error);
        res.status(500).send('Error cargando materias de carrera');
    }
});


module.exports = router;