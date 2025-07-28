const express = require('express');
const router = express.Router();

router.get('/dato', (req, res) => {
  res.render('datos');
});

module.exports = router;