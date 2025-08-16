const express = require('express');
const router = express.Router();

router.get('/sopa_letras', (req,res) => {
    res.render('sopa-letras', {
        title: 'Sopa de letras',
        layout: 'main'
    });
});

module.exports = router;