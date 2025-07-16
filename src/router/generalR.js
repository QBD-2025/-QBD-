const express = require('express');
const router = express.Router();

router.get('/video', (req, res) => {
    res.render('presentacion');
});

router.get('/', (req, res) => {
    res.render('presentation');
});

router.get('/conocenos', (req, res) => {
    res.render('conocenos', { layout: 'main' });
});

module.exports = router;