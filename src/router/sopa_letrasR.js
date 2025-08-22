const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const pool = require('../db/conexion');

// Ruta para obtener materias
router.get('/sopa/materias', async (req, res) => {
    try {
        const [materias] = await pool.query(
            `SELECT DISTINCT m.id_materia, m.descripcion
            FROM materias m
            INNER JOIN palabras p ON m.id_materia = p.id_materia;`
        );
        res.json(materias);
    } catch (error) {
        console.error("Error al obtener las materias:", error);
        res.status(500).json([]);
    }
});

// Ruta principal para crear nueva sala
router.get('/sopa', (req, res) => {
    const nuevaSalaId = uuidv4();
    res.redirect(`/sopa/${nuevaSalaId}`);
});

// Ruta para unirse a sala existente
router.get('/sopa/:salaId', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login?returnTo=' + req.originalUrl);
    }
    res.render('sopa-letras', {
        title: 'Sopa de Letras Multijugador',
        layout: "main",
        user: req.session.user,
        salaId: req.params.salaId
    });
});

// Ruta para obtener palabras por categoría
router.get('/sopa/palabras/:idMateria', async (req, res) => {
    try {
        const [palabras] = await pool.query(
            `SELECT palabra, pista FROM palabras 
            WHERE id_materia = ? 
            ORDER BY RAND() LIMIT 10`,
            [req.params.idMateria]
        );
        res.json(palabras.map(p => ({
            word: p.palabra.toUpperCase(),
            hint: p.pista
        })));
    } catch (error) {
        console.error("Error al obtener palabras:", error);
        res.status(500).json([]);
    }
});

module.exports = router;