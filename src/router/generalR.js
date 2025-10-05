const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    res.render('presentation', { layout: 'main', currentPath: req.path });
});

router.get('/video', (req, res) => {
    res.render('presentacion', { layout: 'main', currentPath: req.path });
});

router.get('/conocenos', (req, res) => {
    res.render('conocenos', { layout: 'main', currentPath: req.path });
});

router.get('/login', (req, res) => {
    res.render('login', { layout: 'main', currentPath: req.path });
});

router.get('/menu_principal', (req, res) => {
    res.render('menu_principal', { layout: 'main', currentPath: req.path });
});

module.exports = router;