const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
// 1. Asegúrate de que el pool de la base de datos esté disponible aquí
const pool = require('../db/conexion'); 

// Ruta para IR a una sala específica (MODIFICADA)
router.get('/serpientes_escaleras/:salaId', async (req, res) => { // La hacemos async
    if (!req.session.user) {
        return res.redirect('/login');
    }

    try {
        // 2. Obtenemos las materias que tienen al menos 5 preguntas (como requiere tu socket)
        const [materias] = await pool.query(
            `SELECT m.id_materia, m.descripcion FROM materias m
             JOIN pregunta p ON m.id_materia = p.id_materia
             GROUP BY m.id_materia
             HAVING COUNT(p.id_pregunta) >= 5`
        );

        // 3. Pasamos las materias a la vista
        res.render('serpientes_escaleras', {
            layout: 'main',
            salaId: req.params.salaId,
            user: req.session.user,
            materias: materias // <-- ¡Aquí está la magia!
        });
    } catch (error) {
        console.error("Error al cargar materias para Serpientes y Escaleras:", error);
        res.status(500).send("Error al cargar el juego");
    }
});

// Ruta para CREAR una nueva sala y redirigir (sin cambios)
router.get('/serpientes_escaleras', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    const nuevaSalaId = `se_${uuidv4().split('-')[0]}`;
    res.redirect(`/serpientes_escaleras/${nuevaSalaId}`);
});

module.exports = router;