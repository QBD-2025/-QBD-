const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    res.render('presentation', { layout: 'main' });
});

router.get('/video', (req, res) => {
    res.render('presentacion', { layout: 'main' });
});

router.get('/conocenos', (req, res) => {
    res.render('conocenos', { layout: 'main' });
});

// Otras rutas generales...

module.exports = router;