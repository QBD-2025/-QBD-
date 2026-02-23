//general.router
const express = require('express');
const router = express.Router();

// Presentación pública
router.get('/', (req, res) => {
    if (req.session.user) {
        return res.redirect('/menu_principal');
    }
    res.render('presentation', {
        layout: 'main',
        currentPath: req.path,
        user: null
    });
});

// Página de video
router.get('/video', (req, res) => {
    res.render('presentacion', {
        layout: 'main',
        currentPath: req.path,
        user: req.session.user || null
    });
});

// Conócenos
router.get('/conocenos', (req, res) => {
    res.render('conocenos', {
        layout: 'main',
        currentPath: req.path,
        user: req.session.user || null
    });
});

// Login (si no hay usuario)
router.get('/login', (req, res) => {
    if (req.session.user) return res.redirect('/menu_principal');
    res.render('login', {
        layout: 'auth-layout',
        currentPath: req.path,
        user: null
    });
});

// Menú principal (requiere sesión)
router.get('/menu_principal', (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    res.render('menu_principal', {
        layout: 'main',
        currentPath: req.path,
        user: req.session.user
    });
});
// =============================================
// 🏆 ENDPOINT: Checar logros/insignias nuevos
// Agregar a tu router (ej: general.router.js o usuario.router.js)
// =============================================

// En tu archivo de rutas, agrega:
// const { verificarTodoProgreso } = require('../utils/logros.utils');

router.get('/api/logros/nuevos', async (req, res) => {
    if (!req.session.user) return res.json({ logros: [], insignias: [] });

    try {
        const idUsuario = req.session.user.id_usuario;
        const db = require('../db/conexion'); // ajusta la ruta según tu proyecto

        // Traer logros desbloqueados pero NO notificados al popup
        const [logrosNuevos] = await db.query(`
            SELECT l.id_logro, l.nombre, l.descripcion, l.icono, l.categoria,
                   l.puntos_bonus, ul.fecha_desbloqueo
            FROM logros l
            INNER JOIN usuario_logros ul ON l.id_logro = ul.id_logro
            WHERE ul.id_usuario = ?
              AND ul.desbloqueado = 1
              AND ul.notificado = 0
            ORDER BY ul.fecha_desbloqueo DESC
        `, [idUsuario]);

        // Traer insignias desbloqueadas pero NO notificadas al popup
        const [insigniasNuevas] = await db.query(`
            SELECT i.id_insignia, i.nombre, i.descripcion, i.imagen,
                   i.rareza, i.categoria, i.color_borde, i.animacion,
                   ui.fecha_desbloqueo
            FROM insignias i
            INNER JOIN usuario_insignias ui ON i.id_insignia = ui.id_insignia
            WHERE ui.id_usuario = ?
              AND ui.desbloqueada = 1
              AND ui.notificado = 0
            ORDER BY ui.fecha_desbloqueo DESC
        `, [idUsuario]);

        // Marcar como notificados inmediatamente para no repetir
        if (logrosNuevos.length > 0) {
            const ids = logrosNuevos.map(l => l.id_logro);
            await db.query(`
                UPDATE usuario_logros
                SET notificado = 1
                WHERE id_usuario = ? AND id_logro IN (?)
            `, [idUsuario, ids]);
        }

        if (insigniasNuevas.length > 0) {
            const ids = insigniasNuevas.map(i => i.id_insignia);
            await db.query(`
                UPDATE usuario_insignias
                SET notificado = 1
                WHERE id_usuario = ? AND id_insignia IN (?)
            `, [idUsuario, ids]);
        }

        res.json({
            logros: logrosNuevos,
            insignias: insigniasNuevas
        });

    } catch (error) {
        console.error('[API LOGROS NUEVOS]:', error);
        res.json({ logros: [], insignias: [] });
    }
});
module.exports = router;