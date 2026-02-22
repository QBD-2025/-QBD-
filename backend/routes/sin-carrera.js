const express = require('express');
const router = express.Router();

// ─── Middleware de autenticación ───────────────────────────────────────────────
const isAuthenticated = (req, res, next) => {
    if (req.session.user) return next();
    return res.redirect('/login');
};

// ─── GET /sin-carrera ─────────────────────────────────────────────────────────
// Muestra la vista para elegir carrera cuando el usuario no tiene ninguna asignada
router.get('/sin-carrera', isAuthenticated, async (req, res) => {
    try {
        const [carreras] = await req.pool.query(
            `SELECT id_carrera, descripcion FROM carrera ORDER BY descripcion ASC`
        );

        return res.render('elegir_carrera', {
            layout: false,
            carreras
        });
    } catch (error) {
        console.error('[SIN-CARRERA]: Error al cargar carreras:', error);
        return res.status(500).send('Error al cargar las carreras disponibles');
    }
});

module.exports = router;