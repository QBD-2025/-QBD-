const express=require('express')
const router = express.Router();

router.get('/gato', (req, res) => {
    res.render('gato')
})

module.exports= router


