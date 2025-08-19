const express = require('express');
const router = express.Router();

router.get("/minijuegos", (req, res) => {
    res.render("minijuego", {
        title: "Minijuegos",
        user: req.session.user || null
    });
});

module.exports = router;
