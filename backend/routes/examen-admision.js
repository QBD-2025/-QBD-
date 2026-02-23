const express = require('express');
const router = express.Router();
const db = require('../db/conexion');
//.................
    router.get('/examen-exani', async (req, res) => {
        try {
            const preguntasPorMateria = 20;
            const id_usuario = req.session.user?.id_usuario;
            const [materias] = await db.query(`SELECT * FROM materias WHERE id_materia IN (1, 2, 3, 4, 5) ORDER BY id_materia ASC`);
            let preguntasFinales = [];

    for (const materia of materias) {
        // ✅ CORRECCIÓN AQUÍ: Se limpió la consulta SELECT para quitar espacios
    const [preguntas] = await db.query(
        `SELECT id_pregunta, id_materia, pregunta, retroalimentacion, puntos FROM pregunta WHERE id_materia = ? ORDER BY RAND() LIMIT ?`,
        [materia.id_materia, preguntasPorMateria]
    );
    for (const p of preguntas) {
        const [respuestas] = await db.query(
        `SELECT id_respuesta, respuesta, correcta FROM respuesta WHERE id_pregunta = ?`,
        [p.id_pregunta]
        );
        preguntasFinales.push({ ...p, materia: materia.descripcion, respuestas });
    }
    }

    const [topGlobal] = await db.query(`SELECT u.username, u.apodo, u.puntos from usuario u LEFT JOIN ranking r ON u.id_usuario = r.id_usuario ORDER BY u.puntos DESC, r.fecha_actualizacion ASC LIMIT 1`);
    let ultimoExamen = null;
    if (id_usuario) {
    const [ultimoExamenRow] = await db.query(
        'SELECT porcentaje from usuario_examen WHERE id_usuario = ? ORDER BY fecha_termino DESC LIMIT 1', 
        [id_usuario]
    );
    if (ultimoExamenRow.length > 0) {
        ultimoExamen = ultimoExamenRow[0].porcentaje;
    }
    }

    res.render('examen-admision', {
    title: 'Examen de Admisión',
    preguntas: preguntasFinales,
    layout: "main",
    rankingData: topGlobal,
    topPlayer: topGlobal[0] || null,
    ultimoExamen
    });
    } catch (err) {
    console.error(err);
    res.status(500).send('Error al generar el examen');
    }
    });


    router.post('/resultados_admision', async (req, res) => {
    try {
    const { respuestas, fecha_inicio_str, todosLosIds } = req.body;
    const id_usuario = req.session.user?.id_usuario;

    if (!id_usuario) return res.status(400).send('Falta id_usuario en la petición.');

    const respuestasUsuario = JSON.parse(respuestas);
    const idsDelExamen = JSON.parse(todosLosIds);
    const fechaInicio = new Date(fecha_inicio_str);
    const fechaTermino = new Date();

    if (!idsDelExamen || idsDelExamen.length === 0) {
    return res.status(400).send('No se encontraron preguntas en el examen.');
    }

    const [preguntasCompletas] = await db.query(
    'SELECT id_pregunta, pregunta, puntos FROM pregunta WHERE id_pregunta IN (?)',
    [idsDelExamen]
    );

        const [todasLasRespuestas] = await db.query(
        'SELECT id_pregunta, id_respuesta, respuesta, correcta FROM respuesta WHERE id_pregunta IN (?)',
        [idsDelExamen]
        );

        const respuestasMap = new Map();
        for(const resp of todasLasRespuestas) {
            if(!respuestasMap.has(resp.id_pregunta)){
                respuestasMap.set(resp.id_pregunta, []);
            }
            respuestasMap.get(resp.id_pregunta).push(resp);
        }

    const puntosMaximos = preguntasCompletas.reduce((sum, p) => sum + p.puntos, 0);
    let puntosObtenidos = 0;
    const preguntasParaResultado = [];

    for (const pregunta of preguntasCompletas) {
        const respuestasBD = respuestasMap.get(pregunta.id_pregunta) || [];
    let esCorrecta = false;
    let textoSeleccionado = 'No respondida';
    if (respuestasUsuario[pregunta.id_pregunta] !== undefined) {
        const respuestaUsuarioIndex = respuestasUsuario[pregunta.id_pregunta];
        const respuestaSeleccionada = respuestasBD[respuestaUsuarioIndex];
        textoSeleccionado = respuestaSeleccionada ? respuestaSeleccionada.respuesta : 'Inválida';
        if (respuestaSeleccionada?.correcta === 1) {
        puntosObtenidos += pregunta.puntos;
        esCorrecta = true;
        }
    }
    preguntasParaResultado.push({
        pregunta: pregunta.pregunta,
        respuestas: respuestasBD,
        esCorrecta,
        textoSeleccionado
    });
    }

    const duracionMs = fechaTermino.getTime() - fechaInicio.getTime();
    const duracionSegundos = Math.round(duracionMs / 1000);
    // Convertir segundos a formato TIME que espera MySQL (HH:MM:SS)
    const horas = Math.floor(duracionSegundos / 3600);
    const minutos = Math.floor((duracionSegundos % 3600) / 60);
    const segundos = duracionSegundos % 60;
    const duracionTime = `${String(horas).padStart(2,'0')}:${String(minutos).padStart(2,'0')}:${String(segundos).padStart(2,'0')}`;

    const [examenResult] = await db.query(
        'INSERT INTO examen (id_materia, duracion, fecha_inicio, fecha_termino) VALUES (NULL, ?, ?, ?)',
        [duracionTime, fechaInicio, fechaTermino]
    );
    const id_examen = examenResult.insertId;
    const porcentaje = puntosMaximos > 0 ? parseFloat(((puntosObtenidos / puntosMaximos) * 100).toFixed(2)) : 0;

    await db.query(
    `INSERT INTO usuario_examen (id_usuario, id_examen, maximo, obtenido, fecha_inicio, fecha_termino, porcentaje) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id_usuario, id_examen, puntosMaximos, puntosObtenidos, fechaInicio, fechaTermino, porcentaje]
    );

    await db.query(
    'UPDATE usuario SET puntos = puntos + ? WHERE id_usuario = ?',
    [puntosObtenidos, id_usuario]
    );

    res.render('resultados_admision', {
        porcentaje,
        puntosTotales: puntosObtenidos,
        totalPreguntas: preguntasCompletas.length,
        preguntas: preguntasParaResultado,
        layout: false
        });

    } catch (error) {
    console.error('Error generando resultados de admisión:', error);
    res.status(500).send('Error mostrando resultados');
    }
    });

    module.exports = router;