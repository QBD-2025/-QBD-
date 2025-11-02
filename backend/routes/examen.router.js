// En: routes/examenR.js- ROUTER DE EXAMENES NORMALES Y DE CARRERA,NO DE LOS DUELOS COMPETITIVOS
const express = require('express');
const router = express.Router();
const db = require('../db/conexion');

// ===================================================================================
// RUTA GET PARA MOSTRAR EL EXAMEN
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
            SELECT u.username, u.apodo, u.puntos, u.foto_perfil 
            FROM usuario u
            LEFT JOIN ranking r ON u.id_usuario = r.id_usuario
            ORDER BY u.puntos DESC, r.fecha_actualizacion ASC 
            LIMIT 1
        `);

        res.render('examen', {
            preguntas,
            materia: materiaRow.descripcion,
            id_materia,
            rankingData: topGlobal,
            topPlayer: topGlobal[0] || null,
            ultimoExamen,
            layout: false
        });
    } catch (error) {
        console.error('Error cargando preguntas del examen:', error);
        res.status(500).send('Error cargando el examen');
    }
});

// ===================================================================================
// POST RESULTADOS - VERSIÓN CORREGIDA
// ===================================================================================
router.post('/resultados', async (req, res) => {
  console.log('\n🚀 ============ INICIO POST /resultados ============');
  console.log('📥 Body completo:', req.body);
  console.log('👤 Usuario en sesión:', req.session.user);
  
  try {
    const id_usuario = req.session.user?.id_usuario;
    let { id_materia, respuestas, fecha_inicio_str } = req.body;

    console.log('📊 Valores extraídos:', { 
      id_materia, 
      id_usuario, 
      respuestas_length: respuestas?.length,
      fecha_inicio_str 
    });

    if (!id_usuario) {
      console.error('❌ Usuario no identificado');
      return res.status(400).send('Usuario no identificado');
    }

    // ✅ Procesar id_materia
    if (id_materia && id_materia !== 'null' && id_materia !== '') {
      id_materia = Number(id_materia);
    } else {
      id_materia = null;
    }

    const fechaInicio = fecha_inicio_str ? new Date(fecha_inicio_str) : new Date();
    const fechaFin = new Date();
    const duracion = Math.floor((fechaFin - fechaInicio) / 1000);

    // 1️⃣ OBTENER PREGUNTAS DEL EXAMEN
    let todasLasPreguntas = [];
    if (id_materia) {
      const [preguntasDB] = await db.query(
        'SELECT id_pregunta FROM pregunta WHERE id_materia = ? LIMIT 20',
        [id_materia]
      );
      todasLasPreguntas = preguntasDB;
    } else {
      todasLasPreguntas = req.session.preguntasAleatorias || [];
    }

    const totalPreguntas = todasLasPreguntas.length;
    
    console.log(`📊 Total de preguntas: ${totalPreguntas}`);

    // 2️⃣ INSERTAR EXAMEN
    const [resExamen] = await db.query(
      'INSERT INTO examen (id_materia, duracion, fecha_inicio, fecha_termino) VALUES (?, ?, ?, ?)',
      [id_materia, duracion, fechaInicio, fechaFin]
    );

    const id_examen = resExamen.insertId;
    console.log(`✅ Examen creado con ID: ${id_examen}`);

    // 3️⃣ PROCESAR RESPUESTAS
    let puntosTotales = 0;
    const respuestasObj = respuestas ? JSON.parse(respuestas) : {};
    
    console.log(`📝 Respuestas del usuario:`, respuestasObj);

    for (const pregunta of todasLasPreguntas) {
      const id_pregunta = pregunta.id_pregunta;
      const opcionIdx = respuestasObj[id_pregunta];

      const [respuestasBD] = await db.query(
        'SELECT id_respuesta, correcta FROM respuesta WHERE id_pregunta = ?',
        [id_pregunta]
      );

      let seleccionada = null;
      let esCorrecta = false;

      if (opcionIdx !== undefined && opcionIdx !== null) {
        seleccionada = respuestasBD[opcionIdx] || null;
        esCorrecta = seleccionada?.correcta === 1;
        if (esCorrecta) puntosTotales++;
      }

      // Insertar en historial
      await db.query(`
        INSERT INTO historial (id_examen, id_usuario, id_pregunta, id_respuesta, puntos, porcentaje)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        id_examen,
        id_usuario,
        id_pregunta,
        seleccionada?.id_respuesta || null,
        esCorrecta ? 1 : 0,
        0
      ]);
    }

    const porcentaje = ((puntosTotales / totalPreguntas) * 100).toFixed(2);
    console.log(`✅ Puntos: ${puntosTotales}/${totalPreguntas} = ${porcentaje}%`);

    // 4️⃣ ACTUALIZAR PORCENTAJE EN HISTORIAL
    await db.query(`
      UPDATE historial
      SET porcentaje = ?
      WHERE id_examen = ? AND id_usuario = ?
    `, [porcentaje, id_examen, id_usuario]);

    // 5️⃣ INSERTAR EN usuario_examen
    await db.query(`
      INSERT INTO usuario_examen (id_usuario, id_examen, maximo, obtenido, fecha_inicio, fecha_termino, porcentaje)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [id_usuario, id_examen, totalPreguntas, puntosTotales, fechaInicio, fechaFin, porcentaje]);

    console.log(`✅ Registro en usuario_examen creado`);

    // 6️⃣ ACTUALIZAR PUNTOS DEL USUARIO
    await db.query(`
      UPDATE usuario
      SET puntos = puntos + ?
      WHERE id_usuario = ?
    `, [puntosTotales, id_usuario]);

    // 7️⃣ REDIRIGIR
    console.log(`🔄 Redirigiendo a /resultados/${id_examen}`);
    res.redirect(`/resultados/${id_examen}`);

  } catch (error) {
    console.error('❌ Error en POST /resultados:', error);
    res.status(500).send('Error al procesar el examen');
  }
});

// ===================================================================================
// GET RESULTADOS - VERSIÓN CORREGIDA
// ===================================================================================
router.get('/resultados/:id_examen', async (req, res) => {
  try {
    const id_examen = req.params.id_examen;
    const id_usuario = req.session.user?.id_usuario;
    
    if (!id_usuario) return res.status(400).send('Usuario no identificado');

    console.log(`\n📊 [GET RESULTADOS] Examen ${id_examen} para usuario ${id_usuario}`);

    // 1️⃣ OBTENER DATOS DEL EXAMEN
    const [usuarioExamenRows] = await db.query(`
      SELECT ue.maximo, ue.obtenido, ue.porcentaje, e.id_materia
      FROM usuario_examen ue
      JOIN examen e ON ue.id_examen = e.id_examen
      WHERE ue.id_examen = ? AND ue.id_usuario = ?
    `, [id_examen, id_usuario]);

    if (usuarioExamenRows.length === 0) {
      console.error(`❌ No se encontró el examen ${id_examen} en usuario_examen`);
      return res.status(404).send('No se encontraron resultados para este examen');
    }

    const { maximo, obtenido, porcentaje, id_materia } = usuarioExamenRows[0];
    console.log(`✅ Datos del examen:`, { maximo, obtenido, porcentaje, id_materia });

    // 2️⃣ OBTENER HISTORIAL
    const [historial] = await db.query(`
      SELECT h.id_pregunta, h.id_respuesta AS id_respuesta_usuario, h.puntos
      FROM historial h
      WHERE h.id_examen = ? AND h.id_usuario = ?
      ORDER BY h.id_pregunta
    `, [id_examen, id_usuario]);

    console.log(`📝 Historial: ${historial.length} registros`);

    // 3️⃣ CONSTRUIR PREGUNTAS CON DETALLES
    const preguntas = [];
    
    for (const h of historial) {
      const [preguntaRow] = await db.query(
        'SELECT pregunta FROM pregunta WHERE id_pregunta = ?',
        [h.id_pregunta]
      );

      if (preguntaRow.length === 0) {
        console.warn(`⚠️ Pregunta ${h.id_pregunta} no encontrada`);
        continue;
      }

      const [respuestas] = await db.query(`
        SELECT id_respuesta, respuesta, correcta
        FROM respuesta
        WHERE id_pregunta = ?
      `, [h.id_pregunta]);

      const correcta = respuestas.find(r => r.correcta === 1);
      const seleccionada = respuestas.find(r => r.id_respuesta === h.id_respuesta_usuario);

      preguntas.push({
        pregunta: preguntaRow[0].pregunta,
        textoSeleccionado: seleccionada?.respuesta || "No respondió",
        esCorrecta: h.puntos === 1,
        textoCorrecto: correcta?.respuesta || "Sin respuesta correcta",
        respuestas
      });
    }

    console.log(`✅ Preguntas procesadas: ${preguntas.length}`);

    // 4️⃣ OBTENER NOMBRE DE LA MATERIA
    let materiaNombre = "Examen Aleatorio";
    if (id_materia) {
      const [materiaRow] = await db.query(
        'SELECT descripcion FROM materias WHERE id_materia = ?', 
        [id_materia]
      );
      if (materiaRow[0]) materiaNombre = materiaRow[0].descripcion;
    }

    console.log(`📤 Enviando resultados:`, {
      materia: materiaNombre,
      totalPreguntas: maximo,
      puntosTotales: obtenido,
      porcentaje,
      preguntasMostradas: preguntas.length
    });

    // 5️⃣ RENDERIZAR
    res.render('resultados', {
      preguntas,
      puntosTotales: obtenido,
      totalPreguntas: maximo,
      porcentaje: porcentaje,
      materia: materiaNombre,
      layout: false
    });

  } catch (error) {
    console.error('❌ Error en GET /resultados:', error);
    res.status(500).send('Error mostrando resultados');
  }
});

// ===================================================================================
// EXAMEN ALEATORIO
// ===================================================================================
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
      SELECT u.username, u.apodo, u.puntos, u.foto_perfil, r.posicion, r.fecha_actualizacion
      FROM usuario u
      LEFT JOIN ranking r ON u.id_usuario = r.id_usuario
      ORDER BY u.puntos DESC, r.fecha_actualizacion ASC
      LIMIT 1
    `);

    res.render('examen', {
      preguntas,
      materia: "al azar",
      id_materia: null,
      rankingData: topGlobal,
      topPlayer: topGlobal[0] || null,
      layout: false
    });

  } catch (error) {
    console.error('Error generando examen aleatorio:', error);
    res.status(500).send('Error cargando examen aleatorio');
  }
});

// ===================================================================================
// LISTA DE MATERIAS
// ===================================================================================
router.get('/eleccion_examen', async (req, res) => {
  try {
    const [materias] = await db.query('SELECT id_materia, descripcion FROM materias');
    res.render('eleccion-examen', { materias, layout: false });
  } catch (err) {
    console.error('Error al obtener materias:', err);
    res.status(500).send('Error al cargar materias');
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
            from usuario_carrera 
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
            from usuario_carrera
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