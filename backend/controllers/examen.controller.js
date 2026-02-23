// controllers/examen.controladores_simultaneos.js

const express = require('express');
const router = express.Router();
const db = require('../db/conexion'); // ✅ AGREGAR ESTA IMPORTACIÓN
const { isAuthenticated } = require('../middleware/auth');
const examenQueries = require('../queries/examen.queries');

// ========================
// GET examen por materia
// ========================
router.get('/examen/:id_materia', async (req, res) => {
    const { id_materia } = req.params;
    const { dificultad } = req.query;
    const id_usuario = req.session.user?.id_usuario;

    try {
        console.log(`🎯 Cargando examen - Materia: ${id_materia}, Dificultad: ${dificultad}`);

        const [[materiaRow]] = await db.query('SELECT descripcion FROM materias WHERE id_materia = ?', [id_materia]);
        if (!materiaRow) {
            console.error(`❌ Materia ${id_materia} no encontrada`);
            return res.status(404).send('Materia no encontrada');
        }

        let preguntas = [];
        let mostrarModal = !dificultad; // Si NO hay dificultad, mostrar modal

        // ✅ Si hay dificultad seleccionada, cargar preguntas
        if (dificultad) {
            console.log(`📊 Buscando preguntas para materia ${id_materia} con dificultad ${dificultad}`);
            
            [preguntas] = await db.query(
                `SELECT id_pregunta, pregunta, retroalimentacion, puntos 
                FROM pregunta 
                WHERE id_materia = ? AND id_dificultad = ?
                ORDER BY RAND() 
                LIMIT 20`,
                [id_materia, dificultad]
            );

            console.log(`✅ Preguntas encontradas: ${preguntas.length}`);

            // ✅ VALIDAR que haya preguntas suficientes
            if (preguntas.length === 0) {
                console.warn(`⚠️ No hay preguntas para materia ${id_materia} con dificultad ${dificultad}`);
                
                const [topGlobal] = await db.query(`
                    SELECT u.username, u.apodo, u.puntos, u.foto_perfil 
                    FROM usuario u
                    LEFT JOIN ranking r ON u.id_usuario = r.id_usuario
                    ORDER BY u.puntos DESC, r.fecha_actualizacion ASC 
                    LIMIT 1
                `);
                
                return res.render('examen', {
                    preguntas: [],
                    materia: materiaRow.descripcion,
                    id_materia,
                    rankingData: topGlobal,
                    topPlayer: topGlobal[0] || null,
                    ultimoExamen: null,
                    mostrarModal: true,
                    errorMsg: `No hay preguntas disponibles para esta dificultad. Por favor, selecciona otra.`,
                    layout: false
                });
            }

            // Cargar respuestas para cada pregunta
            for (let pregunta of preguntas) {
                const [respuestas] = await db.query(
                    'SELECT id_respuesta, respuesta, correcta FROM respuesta WHERE id_pregunta = ?',
                    [pregunta.id_pregunta]
                );
                pregunta.respuestas = respuestas;
            }
            
            // Guardar en sesión
            req.session.preguntasExamen = preguntas.map(p => ({id_pregunta: p.id_pregunta}));
            req.session.dificultadExamen = parseInt(dificultad);
            req.session.id_materia;
        }
        
        // Obtener último examen del usuario
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

        // Obtener top player
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
            mostrarModal,
            dificultad: dificultad || null,
            layout: false
        });
    } catch (error) {
        console.error('❌ Error cargando preguntas del examen:', error);
        res.status(500).send('Error cargando el examen');
    }
});

// ========================
// POST resultados examen
// ========================
router.post('/resultados', isAuthenticated, async (req, res) => {
    try {
        const {respuestas, fecha_inicio_str } = req.body;
        const id_usuario = req.session.user.id_usuario;
        const respuestasUsuario = JSON.parse(respuestas);
        const id_dificultad = req.session.dificultadExamen || 2; // Default: Normal
        const id_materia = req.body.id_materia || req.session.idMateriaExamen;

        console.log(`📊 Procesando resultados - Usuario: ${id_usuario}, Dificultad: ${id_dificultad}`);

        const fechaInicio = new Date(fecha_inicio_str);
        const fechaTermino = new Date();

        // ✅ Obtener preguntas CON SUS PUNTOS de la sesión
        const preguntasIds = req.session.preguntasExamen || [];
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

        console.log(`✅ Preguntas cargadas: ${preguntas.length}`);

        let puntosMaximos = 0;
        let puntosObtenidos = 0;
        const detallesRespuestas = [];

        // Evaluar respuestas del usuario
        for (const pregunta of preguntas) {
            puntosMaximos += pregunta.puntos; // ✅ Usar puntos según dificultad
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

        console.log(`✅ Puntos: ${puntosObtenidos}/${puntosMaximos}`);

        // Calcular duración del examen
        const duracionMs = fechaTermino.getTime() - fechaInicio.getTime();
        const duracionSegundos = Math.round(duracionMs / 1000);

        // Guardar examen
        const [resExamen] = await db.query(
            'INSERT INTO examen (id_materia, duracion, fecha_inicio, fecha_termino) VALUES (?, ?, ?, ?)',
            [id_materia, duracionSegundos, fechaInicio, fechaTermino]
        );
        
        const id_examen = resExamen.insertId;
        const porcentaje = puntosMaximos > 0 ? parseFloat(((puntosObtenidos / puntosMaximos) * 100).toFixed(2)) : 0;

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

        console.log(`✅ Examen guardado con ID: ${id_examen}`);

        const [[materiaRow]] = await db.query(
            'SELECT descripcion FROM materias WHERE id_materia = ?',
            [id_materia]
        );

        res.render('resultados', {
            materia: materiaRow?.descripcion || 'Examen',
            preguntas: detallesRespuestas,
            puntosTotales: puntosObtenidos,
            totalPreguntas: puntosMaximos,
            porcentaje,
            layout: false
        });

    } catch (error) {
        console.error('❌ Error generando resultados:', error);
        res.status(500).send('Error mostrando resultados');
    }
});

// ========================
// Exportar router
// ========================
module.exports = router;