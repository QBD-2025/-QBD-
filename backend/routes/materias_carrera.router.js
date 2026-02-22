// routes/materiasCarrera.routes.js
const express = require('express');
const router = express.Router();
const db = require('../db/conexion');
const { isAuthenticated } = require('../middlewares/auth');

// ===================================================================================
// GET LISTA DE CARRERAS (Carrusel)
// ===================================================================================
router.get('/materias_carrera', async (req, res) => {
    try {
        console.log('\n🎓 === CARGANDO CARRERAS ===');
        
        const [carreras] = await db.query('SELECT id_carrera, descripcion FROM carrera ORDER BY descripcion');
        
        console.log(`✅ Carreras cargadas: ${carreras.length}`);
        
        res.render('eleccion-carrera', { 
            materias: carreras, // Usar 'materias' para compatibilidad con el controlador JS
            layout: false 
        });
        
    } catch (err) {
        console.error('❌ Error al obtener carreras:', err);
        res.status(500).send('Error al cargar carreras');
    }
});

// ===================================================================================
// GET TEMÁTICAS DE UNA CARRERA
// ===================================================================================
router.get('/carrera/:id_carrera/tematicas', async (req, res) => {
    const { id_carrera } = req.params;
    
    try {
        console.log(`\n📚 === CARGANDO TEMÁTICAS DE CARRERA ${id_carrera} ===`);
        
        const [tematicas] = await db.query(
            'SELECT id_tematica, descripcion FROM tematica WHERE id_carrera = ? ORDER BY descripcion',
            [id_carrera]
        );
        
        console.log(`✅ Temáticas encontradas: ${tematicas.length}`);
        
        res.json({ tematicas });
        
    } catch (err) {
        console.error('❌ Error al obtener temáticas:', err);
        res.status(500).json({ error: 'Error al cargar temáticas' });
    }
});

// ===================================================================================
// GET EXAMEN POR CARRERA - CON SELECCIÓN DE TEMÁTICA Y DIFICULTAD
// ===================================================================================
router.get('/examen-carrera/:id_carrera', async (req, res) => {
    const { id_carrera } = req.params;
    const { tematica, dificultad } = req.query;
    const id_usuario = req.session.user?.id_usuario;

    try {
        console.log(`\n🎯 === INICIO GET EXAMEN CARRERA ===`);
        console.log(`🎓 ID Carrera: ${id_carrera}`);
        console.log(`📚 Temática: ${tematica || 'No seleccionada'}`);
        console.log(`⚡ Dificultad: ${dificultad || 'No seleccionada'}`);
        console.log(`👤 ID Usuario: ${id_usuario || 'No autenticado'}`);

        // 1️⃣ Verificar que la carrera existe
        const [[carreraRow]] = await db.query(
            'SELECT descripcion FROM carrera WHERE id_carrera = ?', 
            [id_carrera]
        );
        
        if (!carreraRow) {
            console.error(`❌ Carrera ${id_carrera} no encontrada`);
            return res.status(404).send('Carrera no encontrada');
        }

        console.log(`✅ Carrera encontrada: ${carreraRow.descripcion}`);

        // 2️⃣ Obtener temáticas disponibles de esta carrera
        const [tematicas] = await db.query(
            'SELECT id_tematica, descripcion FROM tematica WHERE id_carrera = ?',
            [id_carrera]
        );

        console.log(`📚 Temáticas disponibles: ${tematicas.length}`);

        // 3️⃣ Obtener último examen del usuario en esta carrera
        let ultimoExamen = null;
        if (id_usuario) {
            const [ultimoExamenRow] = await db.query(`
                SELECT ue.porcentaje 
                FROM usuario_examen ue
                JOIN examen e ON ue.id_examen = e.id_examen
                WHERE ue.id_usuario = ? AND e.id_carrera = ?
                ORDER BY ue.fecha_termino DESC 
                LIMIT 1
            `, [id_usuario, id_carrera]);
            
            if (ultimoExamenRow.length > 0) {
                ultimoExamen = ultimoExamenRow[0].porcentaje;
                console.log(`📊 Último examen: ${ultimoExamen}%`);
            }
        }

        // 4️⃣ Obtener top player
        const [topGlobal] = await db.query(`
            SELECT u.username, u.apodo, u.puntos, u.foto_perfil 
            FROM usuario u
            LEFT JOIN ranking r ON u.id_usuario = r.id_usuario
            ORDER BY u.puntos DESC, r.fecha_actualizacion ASC 
            LIMIT 1
        `);

        console.log(`🏆 Top player obtenido: ${topGlobal[0]?.username || 'Ninguno'}`);

        // 5️⃣ SI HAY TEMÁTICA Y DIFICULTAD, CARGAR PREGUNTAS
        let preguntas = [];
        let mostrarModal = true;
        let errorMsg = null;
        let nombreTematica = null;

        if (tematica && dificultad) {
            console.log(`\n🔍 === CARGANDO PREGUNTAS ===`);
            console.log(`📊 Buscando preguntas - Carrera: ${id_carrera}, Temática: ${tematica}, Dificultad: ${dificultad}`);
            
            // Obtener nombre de la temática
            const [[tematicaRow]] = await db.query(
                'SELECT descripcion FROM tematica WHERE id_tematica = ?',
                [tematica]
            );
            nombreTematica = tematicaRow?.descripcion || 'Temática';

            // Verificar cuántas preguntas existen
            const [[countRow]] = await db.query(
                `SELECT COUNT(*) as total 
                FROM pregunta 
                WHERE id_carrera = ? AND id_tematica = ? AND id_dificultad = ?`,
                [id_carrera, tematica, dificultad]
            );
            
            console.log(`📈 Total preguntas disponibles: ${countRow.total}`);

            if (countRow.total === 0) {
                console.warn(`⚠️ No hay preguntas para esta combinación`);
                errorMsg = `No hay preguntas disponibles para esta temática y dificultad. Por favor, selecciona otra combinación.`;
            } else {
                // Cargar preguntas aleatorias
                [preguntas] = await db.query(
                    `SELECT id_pregunta, pregunta, retroalimentacion, puntos_carrera as puntos 
                    FROM pregunta 
                    WHERE id_carrera = ? AND id_tematica = ? AND id_dificultad = ?
                    ORDER BY RAND() 
                    LIMIT 20`,
                    [id_carrera, tematica, dificultad]
                );

                console.log(`✅ Preguntas cargadas: ${preguntas.length}`);

                if (preguntas.length === 0) {
                    console.warn(`⚠️ Query no retornó preguntas`);
                    errorMsg = `Error al cargar preguntas. Intenta de nuevo.`;
                } else {
                    // Cargar respuestas para cada pregunta
                    for (let pregunta of preguntas) {
                        const [respuestas] = await db.query(
                            'SELECT id_respuesta, respuesta, correcta FROM respuesta WHERE id_pregunta = ?',
                            [pregunta.id_pregunta]
                        );
                        pregunta.respuestas = respuestas;
                        console.log(`  ✓ Pregunta ${pregunta.id_pregunta}: ${respuestas.length} respuestas`);
                    }

                    // Guardar en sesión
                    req.session.preguntasExamen = preguntas.map(p => ({
                        id_pregunta: p.id_pregunta
                    }));
                    req.session.dificultadExamen = parseInt(dificultad);
                    req.session.tematicaExamen = parseInt(tematica);
                    req.session.carreraExamen = parseInt(id_carrera);
                    
                    console.log(`💾 Guardado en sesión:`);
                    console.log(`   - Preguntas: ${req.session.preguntasExamen.length}`);
                    console.log(`   - Dificultad: ${req.session.dificultadExamen}`);
                    console.log(`   - Temática: ${req.session.tematicaExamen}`);
                    console.log(`   - Carrera: ${req.session.carreraExamen}`);

                    mostrarModal = false; // No mostrar modal si hay preguntas
                }
            }
        } else {
            console.log(`📋 Sin temática o dificultad seleccionada, mostrar modal`);
        }

        // 6️⃣ RENDERIZAR VISTA
        console.log(`\n🎨 === RENDERIZANDO VISTA ===`);
        console.log(`📊 Datos a renderizar:`);
        console.log(`   - Preguntas: ${preguntas.length}`);
        console.log(`   - Mostrar modal: ${mostrarModal}`);
        console.log(`   - Error: ${errorMsg || 'Ninguno'}`);
        console.log(`   - Temática: ${tematica || 'No seleccionada'}`);
        console.log(`   - Dificultad: ${dificultad || 'No seleccionada'}`);

        res.render('examen-carrera', {
            preguntas,
            carrera: carreraRow.descripcion,
            tematicaNombre: nombreTematica,
            id_carrera,
            tematicas,
            rankingData: topGlobal,
            topPlayer: topGlobal[0] || null,
            ultimoExamen,
            mostrarModal,
            errorMsg,
            tematica: tematica || null,
            dificultad: dificultad || null,
            layout: false
        });

        console.log(`✅ === FIN GET EXAMEN CARRERA ===\n`);

    } catch (error) {
        console.error('❌ ERROR en GET /examen-carrera:', error);
        console.error('Stack:', error.stack);
        res.status(500).send('Error cargando el examen');
    }
});

// ===================================================================================
// POST RESULTADOS CARRERA
// ===================================================================================
router.post('/resultados-carrera', isAuthenticated, async (req, res) => {
    try {
        console.log(`\n📊 === INICIO POST RESULTADOS CARRERA ===`);
        
        const { id_carrera, respuestas, fecha_inicio_str } = req.body;
        const id_usuario = req.session.user.id_usuario;
        const respuestasUsuario = JSON.parse(respuestas);
        const id_dificultad = req.session.dificultadExamen || 2;
        const id_tematica = req.session.tematicaExamen;

        console.log(`📝 Datos recibidos:`);
        console.log(`   - Usuario: ${id_usuario}`);
        console.log(`   - Carrera: ${id_carrera}`);
        console.log(`   - Temática: ${id_tematica}`);
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
                `SELECT id_pregunta, pregunta, retroalimentacion, puntos_carrera as puntos 
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

        // Guardar examen (agregar id_carrera a la tabla examen)
        const [resExamen] = await db.query(
            'INSERT INTO examen (id_carrera, duracion, fecha_inicio, fecha_termino) VALUES (?, ?, ?, ?)',
            [id_carrera, duracionSegundos, fechaInicio, fechaTermino]
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
        console.log(`✅ === FIN POST RESULTADOS CARRERA ===\n`);

        // Obtener nombre de carrera
        const [[carreraRow]] = await db.query(
            'SELECT descripcion FROM carrera WHERE id_carrera = ?',
            [id_carrera]
        );

        // Renderizar resultados
        res.render('resultados', {
            materia: carreraRow?.descripcion || 'Examen de Carrera',
            preguntas: detallesRespuestas,
            puntosTotales: puntosObtenidos,
            totalPreguntas: puntosMaximos,
            porcentaje,
            layout: false
        });

    } catch (error) {
        console.error('❌ ERROR en POST /resultados-carrera:', error);
        console.error('Stack:', error.stack);
        res.status(500).send('Error mostrando resultados');
    }
});

module.exports = router;