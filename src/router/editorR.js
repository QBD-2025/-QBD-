const express = require('express');
const router = express.Router();
const conn = require('../db/conexion');

const isAuthenticated = (req, res, next) => {
    if (req.session.user) return next();
    return res.redirect('/login');
};

router.get('/', isAuthenticated, async (req, res) => {
    try {
        // Consulta que trae preguntas y opciones
        const [filas] = await req.pool.query(`
            SELECT 
                pe.id_pregunta, pe.id_encuesta, pe.texto AS texto_pregunta, op.texto_opcion, pe.id_estatus_p
            FROM pregunta_encuesta pe
            LEFT JOIN opcion_pregunta op ON pe.id_pregunta = op.id_pregunta
            ORDER BY pe.id_encuesta ASC, pe.id_pregunta ASC;
        `);

        // Agrupar opciones por pregunta
        const preguntasAgrupadas = {};

        filas.forEach(fila => {
            const id = fila.id_pregunta;
            if (!preguntasAgrupadas[id]) {
                preguntasAgrupadas[id] = {
                    id_pregunta: id,
                    id_encuesta: fila.id_encuesta,
                    texto_pregunta: fila.texto_pregunta,
                    id_estatus_p: fila.id_estatus_p,
                    opciones: []
                };
            }
            preguntasAgrupadas[id].opciones.push(fila.texto_opcion);
        });

        const preguntas = Object.values(preguntasAgrupadas);

        res.render('editor', {
            layout: false,
            user: req.session.user,
            preguntas: preguntas,
        });

    } catch (error) {
        console.error("Error cargando el panel de editor:", error);
        res.status(500).send("Error interno del servidor al cargar el panel.");
    }
});

router.post('/actualizar-examenes', isAuthenticated, async (req, res) => {
    const { id_pregunta, estatus } = req.body;

    console.log('Datos recibidos en POST /actualizar-examenes');
    console.log('id_pregunta:', id_pregunta);
    console.log('estatus:', estatus);

    if (!id_pregunta || !estatus || id_pregunta.length !== estatus.length) {
        return res.status(400).send('Datos incompletos o inválidos');
    }

    try {
        const promesasActualizacion = [];

        for (let i = 0; i < id_pregunta.length; i++) {
            const idP = parseInt(id_pregunta[i], 10);
            const est = parseInt(estatus[i], 10);

            if (isNaN(idP) || isNaN(est)) {
                console.warn(`Omitiendo actualización con datos inválidos: id_pregunta='${id_pregunta[i]}', estatus='${estatus[i]}'`);
                continue;
            }

            promesasActualizacion.push(
                req.pool.query(
                    'UPDATE pregunta_encuesta SET id_estatus_p = ? WHERE id_pregunta = ?',
                    [est, idP]
                )
            );
        }

        await Promise.all(promesasActualizacion);
        res.redirect('/editor');
    } catch (error) {
        console.error('Error actualizando estatus de preguntas:', error);
        res.status(500).send('Error al actualizar estatus de preguntas');
    }
});

// Eliminar una pregunta
router.delete('/eliminar-pregunta/:id', isAuthenticated, async (req, res) => {
    try {
        const { id } = req.params;

        await req.pool.query('DELETE FROM opcion_pregunta WHERE id_pregunta = ?', [id]);
        await req.pool.query('DELETE FROM pregunta_encuesta WHERE id_pregunta = ?', [id]);

        res.sendStatus(200);
    } catch (error) {
        console.error('Error eliminando pregunta:', error);
        res.sendStatus(500);
    }
});

// Editar pregunta
router.post('/editar-pregunta', isAuthenticated, async (req, res) => {
    const { id, nuevoTexto } = req.body;

    try {
        await req.pool.query('UPDATE pregunta_encuesta SET texto = ? WHERE id_pregunta = ?', [nuevoTexto, id]);
        res.sendStatus(200);
    } catch (error) {
        console.error('Error actualizando texto de pregunta:', error);
        res.sendStatus(500);
    }
});

// Eliminar opción por índice (posición)
router.post('/eliminar-opcion', isAuthenticated, async (req, res) => {
    const { index, idPregunta } = req.body;

    try {
        const [opciones] = await req.pool.query(
            'SELECT id_opcion FROM opcion_pregunta WHERE id_pregunta = ? ORDER BY id_opcion ASC',
            [idPregunta]
        );

        const id_opcion = opciones[index]?.id_opcion;
        if (!id_opcion) return res.sendStatus(400);

        await req.pool.query('DELETE FROM opcion_pregunta WHERE id_opcion = ?', [id_opcion]);
        res.sendStatus(200);
    } catch (error) {
        console.error('Error eliminando opción:', error);
        res.sendStatus(500);
    }
});

// Editar texto de una opción
router.post('/editar-opcion', isAuthenticated, async (req, res) => {
    const { index, idPregunta, nuevoTexto } = req.body;

    try {
        const [opciones] = await req.pool.query(
            'SELECT id_opcion FROM opcion_pregunta WHERE id_pregunta = ? ORDER BY id_opcion ASC',
            [idPregunta]
        );

        const id_opcion = opciones[index]?.id_opcion;
        if (!id_opcion) return res.sendStatus(400);

        await req.pool.query('UPDATE opcion_pregunta SET texto_opcion = ? WHERE id_opcion = ?', [nuevoTexto, id_opcion]);
        res.sendStatus(200);
    } catch (error) {
        console.error('Error editando opción:', error);
        res.sendStatus(500);
    }
});

// Agregar nueva opción
// Agregar nueva opción
router.post('/agregar-opcion', isAuthenticated, async (req, res) => {
    const { idPregunta, nuevaOpcion } = req.body;

    try {
        await req.pool.query(
            'INSERT INTO opcion_pregunta (id_pregunta, texto_opcion) VALUES (?, ?)', 
            [idPregunta, nuevaOpcion]
        );
        res.sendStatus(200);
    } catch (error) {
        console.error('Error agregando opción:', error);
        res.sendStatus(500);
    }
});

// Agregar nueva pregunta
router.post('/agregar-pregunta', isAuthenticated, async (req, res) => {
    const { id_encuesta, texto_pregunta } = req.body;

    try {
        const [result] = await req.pool.query(
            'INSERT INTO pregunta_encuesta (id_encuesta, texto, id_estatus_p) VALUES (?, ?, 4 )',
            [id_encuesta, texto_pregunta]
        );

        res.status(201).json({ id_pregunta: result.insertId });
    } catch (error) {
        console.error('Error agregando pregunta:', error);
        res.sendStatus(500);
    }
});

module.exports = router;

