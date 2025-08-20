// En tu archivo ahorcadoR.js

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const pool = require('../db/conexion'); // Asegúrate de tener la conexión

// ===================================================================
// ¡NUEVA RUTA API PARA OBTENER LAS MATERIAS DEL AHORCADO!
// ===================================================================
// En ahorcadoR.js

// ...
router.get('/ahorcado/materias', async (req, res) => {
    try {
        // En lugar de usar el 'pool' importado, usa el del request
        const [materias] = await req.pool.query(
            `SELECT DISTINCT m.id_materia, m.descripcion
             FROM materias m
             INNER JOIN palabras p ON m.id_materia = p.id_materia;`
        );
        res.json(materias);
    } catch (error) {
        console.error("Error al obtener las materias para el ahorcado:", error);
        res.status(500).json([]);
    }
});
// ...


// ... (El resto de tus rutas /ahorcado y /ahorcado/:salaId se quedan igual) ...

router.get('/ahorcado', (req, res) => {
    const nuevaSalaId = uuidv4();
    res.redirect(`/ahorcado/${nuevaSalaId}`);
});

router.get('/ahorcado/:salaId', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login?returnTo=' + req.originalUrl);
    }
    res.render('ahorcado', {
        title: 'Ahorcado Multijugador',
        layout: "main",
        user: req.session.user,
        salaId: req.params.salaId
    });
});

module.exports = router;