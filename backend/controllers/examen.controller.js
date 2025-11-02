// controllers/examen.controller.js

const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const examenQueries = require('../queries/examen.queries');

// ========================
// GET examen por materia
// ========================
router.get('/examen/:id_materia', isAuthenticated, async (req, res) => {
    try {
        const id_materia = req.params.id_materia;
        const id_usuario = req.session.user.id_usuario;

        // Obtener descripción de la materia
        const materia = await examenQueries.obtenerDescripcionMateria(id_materia);
        if (!materia) return res.status(404).send('Materia no encontrada');

        // Obtener preguntas y último examen del usuario
        const preguntas = await examenQueries.obtenerPreguntasPorMateria(id_materia);
        const ultimoExamen = await examenQueries.obtenerUltimoExamen(id_usuario, id_materia);

        // Obtener ranking global de jugadores
        const topGlobal = await examenQueries.obtenerTopGlobal();

        // Renderizar vista del examen
        res.render('examen', {
            preguntas,
            materia: materia.descripcion,
            id_materia,
            rankingData: topGlobal,
            topPlayer: topGlobal[0] || null,
            ultimoExamen,
            layout: false
        });

    } catch (error) {
        console.error('Error cargando examen:', error);
        res.status(500).send('Error cargando el examen');
    }
});

// ========================
// POST resultados examen
// ========================
router.post('/resultados', isAuthenticated, async (req, res) => {
    try {
        const { id_materia, respuestas, fecha_inicio_str } = req.body;
        const id_usuario = req.session.user.id_usuario;
        const respuestasUsuario = JSON.parse(respuestas);

        const fechaInicio = new Date(fecha_inicio_str);
        const fechaTermino = new Date();

        // Obtener preguntas para calcular puntos
        const preguntas = await examenQueries.obtenerPreguntasPorMateria(id_materia);

        let puntosMaximos = 0;
        let puntosObtenidos = 0;
        const detallesRespuestas = [];

        // Evaluar respuestas del usuario
        for (const pregunta of preguntas) {
            puntosMaximos += pregunta.puntos;
            const respuestaUsuarioIndex = respuestasUsuario[pregunta.id_pregunta];
            const seleccionada = pregunta.respuestas[respuestaUsuarioIndex];
            const esCorrecta = seleccionada?.correcta === 1;
            if (esCorrecta) puntosObtenidos += pregunta.puntos;

            detallesRespuestas.push({
                ...pregunta,
                textoSeleccionado: seleccionada?.respuesta || 'No respondida',
                esCorrecta
            });
        }

        // Calcular duración del examen
        const duracionMs = fechaTermino.getTime() - fechaInicio.getTime();
        const duracionSegundos = Math.round(duracionMs / 1000);

        // Guardar examen y resultados
        const id_examen = await examenQueries.crearExamen(id_materia, duracionSegundos);
        const porcentaje = puntosMaximos > 0 ? parseFloat(((puntosObtenidos / puntosMaximos) * 100).toFixed(2)) : 0;

        await examenQueries.guardarUsuarioExamen(id_usuario, id_examen, puntosMaximos, puntosObtenidos, fechaInicio, fechaTermino, porcentaje);
        await examenQueries.actualizarPuntosUsuario(id_usuario, puntosObtenidos);

        // Renderizar resultados del examen
        res.render('resultados', {
            materia: preguntas[0]?.materia || 'Examen',
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

// ========================
// Exportar router
// ========================
module.exports = router;
