const express = require('express');
const router = express.Router();

router.get('/ranking', (req, res) => {
    res.render('ranking', {
        title: 'Ranking',
    });
});

module.exports = router;