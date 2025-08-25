const express = require('express');
const { v4: uuidv4 } = require('uuid'); // Necesitarás uuid para crear salas
const router = express.Router();

// Ruta para IR a una sala específica
router.get('/serpientes_escaleras/:salaId', (req, res) => {
    // Si el usuario no ha iniciado sesión, no puede entrar
    if (!req.session.user) {
        return res.redirect('/login');
    }

    res.render('serpientes_escaleras', {
        layout: 'main', // Usamos un layout sin header/footer estándar si quieres
        salaId: req.params.salaId,
        user: req.session.user
    });
});

// Ruta para CREAR una nueva sala y redirigir
router.get('/serpientes_escaleras', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    // Crea un ID de sala único y corto
    const nuevaSalaId = `se_${uuidv4().split('-')[0]}`;
    res.redirect(`/serpientes_escaleras/${nuevaSalaId}`);
});

module.exports = router;