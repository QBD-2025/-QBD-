// En: src/router/gatoR.js

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

// Cuando alguien entra a /gato, crea una sala única y lo redirige
router.get('/gato', (req, res) => {
    const nuevaSalaId = uuidv4();
    res.redirect(`/gato/${nuevaSalaId}`);
});

// Renderiza el juego en la sala específica
router.get('/gato/:salaId', (req, res) => {
    if (!req.session.user) {
        // Si no ha iniciado sesión, lo mandamos al login
        return res.redirect('/login?returnTo=' + req.originalUrl);
    }
    res.render('gato', {
        layout: "main", // o el layout que uses
        title: 'Gato Culto Multijugador',
        user: req.session.user,
        salaId: req.params.salaId
    });
});

module.exports = router;