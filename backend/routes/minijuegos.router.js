const { isAuthenticated } = require('../middlewares/auth');
const express = require('express');
const router = express.Router();

router.get('/minijuegos', isAuthenticated, (req, res) => {
    res.render("minijuego", {
        title: "Minijuegos",
        user: req.session.user || null,
        layout: 'main'
    });
});

module.exports = router;

