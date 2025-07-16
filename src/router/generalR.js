const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    res.render('presentacion');
});

router.get('/inicio', (req, res) => {
    res.render('presentation');
});

router.get('/conocenos', (req, res) => {
    res.render('conocenos', { layout: 'main' });
});

// Otras rutas generales...

module.exports = router;