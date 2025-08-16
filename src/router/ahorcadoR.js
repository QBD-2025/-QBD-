// 🟢 CORREGIDO: routes/ahorcadoR.js
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

// RUTA PARA INICIAR UN JUEGO NUEVO
router.get('/ahorcado', (req, res) => {
    const nuevaSalaId = uuidv4();
    // Por defecto, una nueva partida es cooperativa. 
    // Si se quisiera iniciar en modo enfrentamiento, se añadiría ?modo=enfrentamiento
    res.redirect(`/ahorcado/${nuevaSalaId}`);
});


// RUTA PARA ENTRAR A UNA SALA EXISTENTE (COOPERATIVA O ENFRENTAMIENTO)
router.get('/ahorcado/:salaId', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login?returnTo=' + req.originalUrl);
    }
    
    // Obtenemos el modo desde los parámetros de la URL (?modo=...)
    // Si no viene, asumimos que es 'cooperativo'
    const modoJuego = req.query.modo || 'cooperativo';

    res.render('ahorcado', {
        title: 'Ahorcado Multijugador',
        layout: "main",
        user: req.session.user,
        salaId: req.params.salaId,
        // ¡LA LÍNEA CLAVE! Pasamos el modo a la plantilla.
        modo: modoJuego 
    });
});

module.exports = router;