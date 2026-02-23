const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middlewares/auth');

router.get('/ligas', isAuthenticated, (req, res) => {
    res.render('ligas', {
        layout: 'main',
        user: req.session.user
    });
});

module.exports = router;
