
const express = require('express');
const router = express.Router();
const db = require('../db/conexion');

const isAuthenticated = (req, res, next) => {
    if (req.session.user) return next();
    res.redirect('/login');
};

// =================================================================
// RUTA DE PERFIL
// =================================================================
router.get('/usuario', isAuthenticated, async (req, res) => {
    try {
        // ✅ CONSULTA LIMPIA
        const [userData] = await db.query(
            `SELECT id_usuario, username, email, id_tp_usuario, apodo, descripcion FROM usuario WHERE id_usuario = ?`, 
            [req.session.user.id_usuario]
        );

        if (userData.length === 0) {
            return res.status(404).send('Usuario no encontrado');
        }

        const roles = { 1: 'USUARIO', 2: 'EDITOR', 3: 'ADMIN' };
        const userProfile = {
            ...userData[0],
            role: roles[userData[0].id_tp_usuario] || 'USUARIO'
        };

        res.render('usuario', {
            layout: 'main',
            title: 'Perfil de Usuario',
            user: userProfile
        });

    } catch (error) {
        console.error('Error en la consulta:', error);
        res.status(500).send('Error al cargar el perfil');
    }
});

// =================================================================
// RUTAS DE EDICIÓN
// =================================================================
router.get('/usuario/editar', isAuthenticated, async (req, res) => {
    try {
        const [userData] = await db.query(
            `SELECT id_usuario, username, email, id_tp_usuario, apodo, descripcion FROM usuario WHERE id_usuario = ?`,
            [req.session.user.id_usuario]
        );
        if (userData.length === 0) return res.status(404).send('Usuario no encontrado');
        const roles = { 1: 'USUARIO', 2: 'EDITOR', 3: 'ADMIN' };
        res.render('editarUsuario', {
            layout: 'main',
            title: 'Editar Usuario',
            user: { ...userData[0], role: roles[userData[0].id_tp_usuario] || 'USUARIO' }
        });
    } catch (error) {
        console.error('Error al cargar la vista de edición:', error);
        res.status(500).send('Error interno del servidor');
    }
});

router.post('/usuario/editar', isAuthenticated, async (req, res) => {
    const { email, username, apodo, descripcion } = req.body;
    try {
        const query = 'UPDATE usuario SET email = ?, username = ?, apodo = ?, descripcion = ? WHERE id_usuario = ?';
        const values = [email, username, apodo, descripcion, req.session.user.id_usuario];
        await db.query(query, values);
        req.session.user.email = email;
        req.session.user.username = username;
        req.session.user.apodo = apodo;
        req.session.user.descripcion = descripcion;
        res.redirect('/usuario');
    } catch (error) {
        console.error('Error actualizando perfil:', error);
        res.status(500).send('Error al actualizar el perfil');
    }
});

// =================================================================
// RUTA DE HISTORIAL GENERAL
// =================================================================
router.get('/usuario/historial', isAuthenticated, async (req, res) => {
  try {
    const id_usuario = req.session.user.id_usuario;
    
    // ✅ CONSULTA LIMPIA
    const [historialData] = await db.query(`
SELECT ue.id_examen, ue.obtenido, ue.maximo, ue.porcentaje, ue.fecha_inicio AS fecha, m.descripcion AS materia FROM usuario_examen ue LEFT JOIN examen e ON ue.id_examen = e.id_examen LEFT JOIN materias m ON e.id_materia = m.id_materia WHERE ue.id_usuario = ? ORDER BY fecha DESC`, [id_usuario]);

    const historial = historialData.map(h => ({
        id_examen: h.id_examen,
        materia: h.materia || 'EXAMEN DE ADMISIÓN',
        puntos: h.obtenido,
        total: h.maximo,
        porcentaje: h.porcentaje,
        fecha: new Date(h.fecha).toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' })
    }));

    res.render('historialUsuario', {
      layout: 'main',
      title: 'Historial de Exámenes',
      historial
    });
  } catch (error) {
    console.error('Error al cargar el historial:', error);
    res.status(500).send('Error al cargar el historial de exámenes');
  }
});

// =================================================================
// RUTA DE DETALLE DE HISTORIAL
// =================================================================
router.get('/usuario/historial/:id_examen', isAuthenticated, async (req, res) => {
  try {
    const { id_examen } = req.params;
    const id_usuario = req.session.user.id_usuario;

    // ✅ CONSULTA LIMPIA
    const [detalles] = await db.query(`
SELECT ue.id_examen, ue.obtenido, ue.maximo, ue.porcentaje, ue.fecha_inicio AS fecha, m.descripcion AS materia FROM usuario_examen ue LEFT JOIN examen e ON ue.id_examen = e.id_examen LEFT JOIN materias m ON e.id_materia = m.id_materia WHERE ue.id_usuario = ? AND ue.id_examen = ?`, [id_usuario, id_examen]);

    if (detalles.length === 0) {
      return res.status(404).send('Examen no encontrado o no pertenece a este usuario.');
    }
    
    const examenDetalle = {
        ...detalles[0],
        materia: detalles[0].materia || 'EXAMEN DE ADMISIÓN',
        fecha: new Date(detalles[0].fecha).toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' })
    };

    res.render('historialDetalle', {
      layout: 'main',
      title: 'Detalle del Examen',
      examen: examenDetalle
    });
  } catch (error) {
    console.error('Error al cargar el detalle del examen:', error);
    res.status(500).send('Error al cargar el examen');
  }
});

module.exports = router;