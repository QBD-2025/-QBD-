const express = require('express');
const router = express.Router();

// Presentación pública
router.get('/', (req, res) => {
    if (req.session.user) {
        return res.redirect('/menu_principal');
    }
    res.render('presentation', {
        layout: 'main',
        currentPath: req.path,
        user: null
    });
});

// Página de video
router.get('/video', (req, res) => {
    res.render('presentacion', {
        layout: 'main',
        currentPath: req.path,
        user: req.session.user || null
    });
});

// Conócenos
router.get('/conocenos', (req, res) => {
    res.render('conocenos', {
        layout: 'main',
        currentPath: req.path,
        user: req.session.user || null
    });
});

// Login (si no hay usuario)
router.get('/login', (req, res) => {
    if (req.session.user) return res.redirect('/menu_principal');
    res.render('login', {
        layout: 'auth-layout',
        currentPath: req.path,
        user: null
    });
});

// Menú principal (requiere sesión)
router.get('/menu_principal', (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    res.render('menu_principal', {
        layout: 'main',
        currentPath: req.path,
        user: req.session.user
    });
});

module.exports = router;
