const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middlewares/auth');

router.get('/simulador', isAuthenticated, (req, res) => {
  res.render('simulador', {
    layout: 'main',
    user: req.session.user
  });
});

module.exports = router;
