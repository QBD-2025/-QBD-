// routes/examenR.js - ROUTER CORREGIDO
const express = require('express');
const router = express.Router();
const db = require('../db/conexion');
const { isAuthenticated } = require('../middlewares/auth');

function hasValidAnswerCount(respuestas) {
    return Array.isArray(respuestas) && respuestas.length > 0 && respuestas.length <= 4;
}

// ===================================================================================
// GET EXAMEN - PANTALLA INICIAL O CON PREGUNTAS SEGÚN DIFICULTAD
// ===================================================================================
router.get('/examen/:id_materia', isAuthenticated, async (req, res) => {
    const { id_materia } = req.params;
    const { dificultad } = req.query; // Obtener dificultad de la URL
    const id_usuario = req.session.user?.id_usuario;

    try {
        console.log(`\n🎯 === INICIO GET EXAMEN ===`);
        console.log(`📚 ID Materia: ${id_materia}`);
        console.log(`⚡ Dificultad: ${dificultad || 'No seleccionada'}`);
        console.log(`👤 ID Usuario: ${id_usuario || 'No autenticado'}`);

        // 1️⃣ Verificar que la materia existe
        const [[materiaRow]] = await db.query(
            'SELECT descripcion FROM materias WHERE id_materia = ?', 
            [id_materia]
        );
        
        if (!materiaRow) {
            console.error(`❌ Materia ${id_materia} no encontrada`);
            return res.status(404).send('Materia no encontrada');
        }

        console.log(`✅ Materia encontrada: ${materiaRow.descripcion}`);

        // 2️⃣ Obtener último examen del usuario
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
                console.log(`📊 Último examen: ${ultimoExamen}%`);
            }
        }

        // 3️⃣ Obtener top player
        const [topGlobal] = await db.query(`
            SELECT u.username, u.apodo, u.puntos, u.foto_perfil 
            FROM usuario u
            LEFT JOIN ranking r ON u.id_usuario = r.id_usuario
            ORDER BY u.puntos DESC, r.fecha_actualizacion ASC 
            LIMIT 1
        `);

        console.log(`🏆 Top player obtenido: ${topGlobal[0]?.username || 'Ninguno'}`);

        // 4️⃣ SI HAY DIFICULTAD, CARGAR PREGUNTAS
        let preguntas = [];
        let mostrarModal = true;
        let errorMsg = null;

        if (dificultad) {
            console.log(`\n🔍 === CARGANDO PREGUNTAS ===`);
            console.log(`📊 Buscando preguntas para dificultad: ${dificultad}`);
            
            // Primero verificar cuántas preguntas existen
            const [[countRow]] = await db.query(
                `SELECT COUNT(*) as total 
                FROM pregunta p
                WHERE p.id_materia = ? 
                  AND p.id_dificultad = ?
                  AND (
                    SELECT COUNT(*) 
                    FROM respuesta r 
                    WHERE r.id_pregunta = p.id_pregunta
                  ) BETWEEN 1 AND 4`,
                [id_materia, dificultad]
            );
            
            console.log(`📈 Total preguntas disponibles: ${countRow.total}`);

            if (countRow.total < 10) {
                console.warn(`No hay suficientes preguntas para esta combinacion`);
                errorMsg = `No hay suficientes preguntas validas para esta dificultad (se requieren 10 con entre 1 y 4 respuestas).`;
            } else {
                // Cargar preguntas aleatorias
                [preguntas] = await db.query(
                    `SELECT p.id_pregunta, p.pregunta, p.retroalimentacion, p.puntos 
                    FROM pregunta p
                    WHERE p.id_materia = ? 
                      AND p.id_dificultad = ?
                      AND (
                        SELECT COUNT(*) 
                        FROM respuesta r 
                        WHERE r.id_pregunta = p.id_pregunta
                      ) BETWEEN 1 AND 4
                    ORDER BY RAND() 
                    LIMIT 10`,
                    [id_materia, dificultad]
                );

                console.log(`✅ Preguntas cargadas: ${preguntas.length}`);

                if (preguntas.length === 0) {
                    console.warn(`⚠️ Query no retornó preguntas`);
                    errorMsg = `Error al cargar preguntas. Intenta de nuevo.`;
                } else {
                    // Cargar respuestas para cada pregunta y filtrar inv?lidas
                    for (let pregunta of preguntas) {
                        const [respuestas] = await db.query(
                            'SELECT id_respuesta, respuesta, correcta FROM respuesta WHERE id_pregunta = ?',
                            [pregunta.id_pregunta]
                        );
                        if (!hasValidAnswerCount(respuestas)) {
                            continue;
                        }
                        pregunta.respuestas = respuestas;
                        console.log(`  ??? Pregunta ${pregunta.id_pregunta}: ${respuestas.length} respuestas`);
                    }

                    preguntas = preguntas.filter(p => hasValidAnswerCount(p.respuestas));

                    // Guardar en sesi??n
                    req.session.preguntasExamen = preguntas.map(p => ({
                        id_pregunta: p.id_pregunta
                    }));
                    req.session.dificultadExamen = parseInt(dificultad);
                    
                    console.log(`???? Guardado en sesi??n:`);
                    console.log(`   - Preguntas: ${req.session.preguntasExamen.length}`);
                    console.log(`   - Dificultad: ${req.session.dificultadExamen}`);

                    if (preguntas.length > 0) {
                        mostrarModal = false; // No mostrar modal si hay preguntas
                    } else {
                        mostrarModal = true;
                        errorMsg = `No hay suficientes preguntas validas para esta dificultad (se requieren 10 con entre 1 y 4 respuestas).`;
                    }
                }
            }
        } else {
            console.log(`📋 Sin dificultad seleccionada, mostrar modal`);
        }

        // 5️⃣ RENDERIZAR VISTA
        console.log(`\n🎨 === RENDERIZANDO VISTA ===`);
        console.log(`📊 Datos a renderizar:`);
        console.log(`   - Preguntas: ${preguntas.length}`);
        console.log(`   - Mostrar modal: ${mostrarModal}`);
        console.log(`   - Error: ${errorMsg || 'Ninguno'}`);
        console.log(`   - Dificultad: ${dificultad || 'No seleccionada'}`);

        res.render('examen', {
            preguntas,
            materia: materiaRow.descripcion,
            id_materia,
            rankingData: topGlobal,
            topPlayer: topGlobal[0] || null,
            ultimoExamen,
            mostrarModal,
            errorMsg,
            dificultad: dificultad || null,
            layout: false
        });

        console.log(`✅ === FIN GET EXAMEN ===\n`);

    } catch (error) {
        console.error('❌ ERROR en GET /examen:', error);
        console.error('Stack:', error.stack);
        res.status(500).send('Error cargando el examen');
    }
});

// ===================================================================================
// POST RESULTADOS
// ===================================================================================
router.post('/resultados', isAuthenticated, async (req, res) => {
    try {
        console.log(`\n📊 === INICIO POST RESULTADOS ===`);
        
        const { id_materia, respuestas, fecha_inicio_str } = req.body;
        const id_usuario = req.session.user.id_usuario;
        const respuestasUsuario = JSON.parse(respuestas);
        const id_dificultad = req.session.dificultadExamen || 2;

        console.log(`📝 Datos recibidos:`);
        console.log(`   - Usuario: ${id_usuario}`);
        console.log(`   - Materia: ${id_materia}`);
        console.log(`   - Dificultad: ${id_dificultad}`);
        console.log(`   - Respuestas: ${Object.keys(respuestasUsuario).length}`);

        const fechaInicio = new Date(fecha_inicio_str);
        const fechaTermino = new Date();

        // Obtener preguntas con puntos de la sesión
        const preguntasIds = req.session.preguntasExamen || [];
        console.log(`📚 Preguntas en sesión: ${preguntasIds.length}`);

        const preguntas = [];
        
        for (const p of preguntasIds) {
            const [[pregunta]] = await db.query(
                `SELECT id_pregunta, pregunta, retroalimentacion, puntos 
                FROM pregunta 
                WHERE id_pregunta = ?`,
                [p.id_pregunta]
            );
            
            if (pregunta) {
                const [respuestas] = await db.query(
                    'SELECT id_respuesta, respuesta, correcta FROM respuesta WHERE id_pregunta = ?',
                    [pregunta.id_pregunta]
                );
                pregunta.respuestas = respuestas;
                preguntas.push(pregunta);
            }
        }

        console.log(`✅ Preguntas cargadas para evaluación: ${preguntas.length}`);

        let puntosMaximos = 0;
        let puntosObtenidos = 0;
        const detallesRespuestas = [];

        // Evaluar respuestas
        for (const pregunta of preguntas) {
            puntosMaximos += pregunta.puntos;
            const respuestaUsuarioIndex = respuestasUsuario[pregunta.id_pregunta];
            const seleccionada = pregunta.respuestas[respuestaUsuarioIndex];
            const esCorrecta = seleccionada?.correcta === 1;
            
            if (esCorrecta) {
                puntosObtenidos += pregunta.puntos;
            }

            detallesRespuestas.push({
                pregunta: pregunta.pregunta,
                textoSeleccionado: seleccionada?.respuesta || 'No respondida',
                esCorrecta,
                textoCorrecto: pregunta.respuestas.find(r => r.correcta === 1)?.respuesta || 'N/A',
                respuestas: pregunta.respuestas
            });
        }

        console.log(`📊 Puntuación: ${puntosObtenidos}/${puntosMaximos}`);

        // Calcular duración
        const duracionMs = fechaTermino.getTime() - fechaInicio.getTime();
        const duracionSegundos = Math.round(duracionMs / 1000);

        // Guardar examen
        const [resExamen] = await db.query(
            'INSERT INTO examen (id_materia, duracion, fecha_inicio, fecha_termino) VALUES (?, ?, ?, ?)',
            [id_materia, duracionSegundos, fechaInicio, fechaTermino]
        );
        
        const id_examen = resExamen.insertId;
        const porcentaje = puntosMaximos > 0 ? parseFloat(((puntosObtenidos / puntosMaximos) * 100).toFixed(2)) : 0;

        console.log(`✅ Examen guardado con ID: ${id_examen}, Porcentaje: ${porcentaje}%`);

        // Guardar en usuario_examen
        await db.query(`
            INSERT INTO usuario_examen (id_usuario, id_examen, maximo, obtenido, fecha_inicio, fecha_termino, porcentaje)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [id_usuario, id_examen, puntosMaximos, puntosObtenidos, fechaInicio, fechaTermino, porcentaje]);

        // Actualizar puntos del usuario
        await db.query(`
            UPDATE usuario
            SET puntos = puntos + ?
            WHERE id_usuario = ?
        `, [puntosObtenidos, id_usuario]);

        console.log(`💰 Puntos actualizados: +${puntosObtenidos}`);
        console.log(`✅ === FIN POST RESULTADOS ===\n`);

        const [[materiaRow]] = await db.query(
            'SELECT descripcion FROM materias WHERE id_materia = ?',
            [id_materia]
        );

        // Renderizar resultados
        res.render('resultados', {
            materia: materiaRow?.descripcion || 'Examen',
            preguntas: detallesRespuestas,
            puntosTotales: puntosObtenidos,
            totalPreguntas: puntosMaximos,
            porcentaje,
            layout: false
        });

    } catch (error) {
        console.error('❌ ERROR en POST /resultados:', error);
        console.error('Stack:', error.stack);
        res.status(500).send('Error mostrando resultados');
    }
});

// ===================================================================================
// LISTA DE MATERIAS
// ===================================================================================
router.get('/eleccion_examen', isAuthenticated, async (req, res) => {
    try {
        const [materias] = await db.query('SELECT id_materia, descripcion FROM materias');
        res.render('eleccion-examen', { materias, layout: false });
    } catch (err) {
        console.error('Error al obtener materias:', err);
        res.status(500).send('Error al cargar materias');
    }
});

// ===================================================================================
// EXAMEN ALEATORIO
// ===================================================================================
router.get('/examen-aleatorio', isAuthenticated, async (req, res) => {
    try {
        const id_usuario = req.session.user?.id_usuario;
        if (!id_usuario) return res.status(400).send('Usuario no identificado');

        const [preguntas] = await db.query(`
            SELECT p.id_pregunta, p.pregunta, p.retroalimentacion, p.puntos
            FROM pregunta p
            WHERE (
                SELECT COUNT(*)
                FROM respuesta r
                WHERE r.id_pregunta = p.id_pregunta
            ) BETWEEN 1 AND 4
            ORDER BY RAND()
            LIMIT 10
        `);

        const preguntasValidas = [];
        for (let pregunta of preguntas) {
            const [respuestas] = await db.query(`
                SELECT id_respuesta, respuesta, correcta
                FROM respuesta
                WHERE id_pregunta = ?
            `, [pregunta.id_pregunta]);

            if (!hasValidAnswerCount(respuestas)) {
                continue;
            }

            pregunta.respuestas = respuestas.sort(() => Math.random() - 0.5);
            preguntasValidas.push(pregunta);
        }

        if (preguntasValidas.length < 10) {
            return res.status(400).send('No hay preguntas validas disponibles para examen aleatorio.');
        }

        req.session.preguntasAleatorias = preguntasValidas;

        const [topGlobal] = await db.query(`
            SELECT u.username, u.apodo, u.puntos, u.foto_perfil
            FROM usuario u
            LEFT JOIN ranking r ON u.id_usuario = r.id_usuario
            ORDER BY u.puntos DESC, r.fecha_actualizacion ASC
            LIMIT 1
        `);

        res.render('examen', {
            preguntas: preguntasValidas,
            materia: "al azar",
            id_materia: null,
            rankingData: topGlobal,
            topPlayer: topGlobal[0] || null,
            ultimoExamen: null,
            mostrarModal: false,
            layout: false
        });

    } catch (error) {
        console.error('Error generando examen aleatorio:', error);
        res.status(500).send('Error cargando examen aleatorio');
    }
});

module.exports = router;


