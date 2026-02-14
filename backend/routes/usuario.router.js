// =============================================
// 🔧 FIX: backend/routes/usuario.router.js
//
// PROBLEMA: El botón "Ver Todos los Logros" en perfil-publico.hbs
//           apuntaba a '/usuario/logros' pero esta ruta NO existía,
//           causando 404 → error que llegaba como 500 por el manejo
//           de errores del router.
//
// INSTRUCCIÓN: Agrega las líneas marcadas con ✅ NUEVO en tu
//              usuario.router.js existente, justo antes del
//              middleware de error al final.
// =============================================

const express = require('express');
const router  = express.Router();
const usuarioController = require('../controllers/usuario.controller');

// Middleware de autenticación
function isAuthenticated(req, res, next) {
    if (req.session && req.session.user && req.session.user.id_usuario) {
        return next();
    }
    console.warn('[AUTH]: Usuario no autenticado intentando acceder a:', req.originalUrl);
    res.redirect('/login');
}

// ─── Perfil propio ───────────────────────────────────────────
router.get('/usuario', isAuthenticated, usuarioController.verPerfil);

// ─── Perfil público ──────────────────────────────────────────
router.get('/usuario/perfil/:id_usuario', isAuthenticated, (req, res, next) => {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('[ROUTER]: 🎯 Ruta de perfil público detectada');
    console.log('[ROUTER]: ID solicitado:', req.params.id_usuario);
    console.log('[ROUTER]: Usuario actual:', req.session.user?.username);
    console.log('═══════════════════════════════════════════════════════════\n');

    const idUsuario = parseInt(req.params.id_usuario);
    if (isNaN(idUsuario) || idUsuario <= 0) {
        console.error('[ROUTER]: ❌ ID de usuario inválido:', req.params.id_usuario);
        return res.status(400).send('ID de usuario inválido');
    }

    usuarioController.verPerfilPublico(req, res, next);
});

// ─── API: Stats en tiempo real ───────────────────────────────
router.get('/api/usuario/stats/:id_usuario', isAuthenticated, (req, res) => {
    console.log('[API STATS]: Solicitadas stats para usuario:', req.params.id_usuario);
    usuarioController.obtenerStatsAPI(req, res);
});

// ─── API: Mini perfil (para modal) ───────────────────────────
router.get('/api/usuario/mini-perfil/:id_usuario', isAuthenticated, (req, res) => {
    console.log('[API MINI PERFIL]: Solicitado mini perfil para usuario:', req.params.id_usuario);
    usuarioController.obtenerMiniPerfil(req, res);
});

// ─── Edición ─────────────────────────────────────────────────
router.get('/usuario/editar',  isAuthenticated, usuarioController.vistaEditarUsuario);
router.post('/usuario/editar', isAuthenticated, usuarioController.upload.single('avatar'), usuarioController.editarUsuario);

// ─── Historial unificado ─────────────────────────────────────
router.get('/usuario/historial', isAuthenticated, usuarioController.verHistorialUnificado);

// ─── Detalle de examen ───────────────────────────────────────
router.get('/usuario/historial/examen/:id_examen', isAuthenticated, usuarioController.verDetalleExamen);

// ─── Detalle de duelo ────────────────────────────────────────
router.get('/usuario/historial/duelo/:id_duelo', isAuthenticated, (req, res) => {
    res.redirect(`/duelo/resultados/${req.params.id_duelo}`);
});

// ─────────────────────────────────────────────────────────────
// ✅ NUEVO: Página de logros del usuario
// Necesaria porque perfil-publico.hbs tiene el botón:
//   <button onclick="location.href='/usuario/logros'">
// ─────────────────────────────────────────────────────────────
router.get('/usuario/logros', isAuthenticated, async (req, res) => {
    try {
        const idUsuario = req.session.user.id_usuario;

        const {
            obtenerLogrosUsuario,
            obtenerInsigniasUsuario
        } = require('../utils/logros.utils');

        const logros   = await obtenerLogrosUsuario(idUsuario);
        const insignias = await obtenerInsigniasUsuario(idUsuario);

        const totalLogros        = logros.length;
        const desbloqueadosCount = logros.filter(l => l.desbloqueado === 1).length;

        res.render('logros-usuario', {
            layout:  'main',
            title:   'Mis Logros e Insignias',
            user:    req.session.user,
            logros,
            insignias,
            stats: {
                total_logros:       totalLogros,
                logros_desbloqueados: desbloqueadosCount,
                porcentaje:         totalLogros > 0
                    ? Math.round((desbloqueadosCount / totalLogros) * 100)
                    : 0,
                total_insignias:    insignias.length,
                insignias_desbloqueadas: insignias.filter(i => i.desbloqueada === 1).length
            }
        });

    } catch (error) {
        console.error('[LOGROS PAGE ERROR]:', error);
        res.status(500).send('Error al cargar logros: ' + error.message);
    }
});

// ─────────────────────────────────────────────────────────────
// ✅ NUEVO: API para verificar puntos actuales (usada en modal duelo)
// dueloAscenso.controller.js llama:
//   fetch('/api/usuario/puntos-actuales')
// ─────────────────────────────────────────────────────────────
router.get('/api/usuario/puntos-actuales', isAuthenticated, async (req, res) => {
    try {
        const idUsuario = req.session.user.id_usuario;
        const db = require('../db/conexion');

        const [result] = await db.query(`
            SELECT 
                COALESCE(SUM(ue.puntos), 0) AS puntos_globales
            FROM usuario_examen ue
            WHERE ue.id_usuario = ?
        `, [idUsuario]);

        res.json({
            success:        true,
            puntos_globales: result[0]?.puntos_globales || 0
        });

    } catch (error) {
        console.error('[API PUNTOS ACTUALES ERROR]:', error);
        res.status(500).json({ success: false, message: 'Error al obtener puntos' });
    }
});

// ─── API: Carreras del usuario (usada en dueloAscenso) ───────
// dueloAscenso.controller.js también llama /api/usuario/carreras
// Si ya existe en otro router está bien; si no, agrégala aquí:
router.get('/api/usuario/carreras', isAuthenticated, async (req, res) => {
    try {
        const idUsuario = req.session.user.id_usuario;
        const db = require('../db/conexion');

        const [carreras] = await db.query(`
            SELECT 
                c.id_carrera,
                c.descripcion,
                COALESCE(uc.puntos, 0) AS puntos
            FROM usuario_carrera uc
            JOIN carrera c ON uc.id_carrera = c.id_carrera
            WHERE uc.id_usuario = ?
            ORDER BY uc.puntos DESC
        `, [idUsuario]);

        res.json({ success: true, carreras });

    } catch (error) {
        console.error('[API CARRERAS ERROR]:', error);
        res.status(500).json({ success: false, message: 'Error al obtener carreras' });
    }
});

// ─── Middleware de errores ────────────────────────────────────
router.use((err, req, res, next) => {
    console.error('\n═══════════════════════════════════════════════════════════');
    console.error('[ROUTER ERROR]:', err.message);
    console.error('[ROUTER ERROR STACK]:', err.stack);
    console.error('═══════════════════════════════════════════════════════════\n');
    res.status(500).send('Error interno del servidor');
});

console.log('\n═══════════════════════════════════════════════════════════');
console.log('[ROUTER]: ✅ Rutas de usuario cargadas');
console.log('  - GET  /usuario');
console.log('  - GET  /usuario/perfil/:id_usuario');
console.log('  - GET  /api/usuario/stats/:id_usuario');
console.log('  - GET  /api/usuario/mini-perfil/:id_usuario');
console.log('  - GET  /api/usuario/puntos-actuales   ✅ NUEVO');
console.log('  - GET  /api/usuario/carreras           ✅ NUEVO');
console.log('  - GET  /usuario/logros                 ✅ NUEVO');
console.log('  - GET  /usuario/editar');
console.log('  - POST /usuario/editar');
console.log('  - GET  /usuario/historial');
console.log('  - GET  /usuario/historial/examen/:id_examen');
console.log('  - GET  /usuario/historial/duelo/:id_duelo');
console.log('═══════════════════════════════════════════════════════════\n');

module.exports = router;