const express = require('express');
const router = express.Router();

router.get('/ligas', (req, res) => {
    // Tu lógica aquí
    res.render('ligas', { 
        layout: "main",
        user: req.session.user 
    });
});

module.exports = router;