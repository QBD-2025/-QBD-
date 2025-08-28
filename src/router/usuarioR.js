const express = require('express');
const router = express.Router();

// Middleware mejorado
const isAuthenticated = (req, res, next) => {
    if (req.session.user) return next();
    res.redirect('/login');
};

// Ruta perfil de usuario
router.get('/usuario', isAuthenticated, async (req, res) => {
    try {
        const [userData] = await req.pool.query(
            `SELECT id_usuario, username, email, id_tp_usuario, apodo, descripcion
            FROM usuario WHERE id_usuario = ?`, 
            [req.session.user.id_usuario]
        );

        if (userData.length === 0) {
            return res.status(404).render('error', {
                layout: 'main',
                mensajeError: 'Usuario no encontrado en DB'
            });
        }

        // Mapear roles a texto
        const roles = {
            1: 'USUARIO',
            2: 'EDITOR',
            3: 'ADMIN'
        };

        res.render('usuario', {
            layout: 'main', // Nombre de tu archivo layout (usuario-layout.hbs)
        user: req.user,
        title: 'Perfil de Usuario',
            user: {
                ...userData[0],
                role: roles[userData[0].id_tp_usuario] || 'USUARIO'
            }
        });

    } catch (error) {
        console.error('Error en la consulta:', error);
        res.status(500).send('Error al cargar el perfil');
    }
});

router.get('/usuario/editar', isAuthenticated, async (req, res) => {
  try {
    const [userData] = await req.pool.query(
      `SELECT id_usuario, username, email, id_tp_usuario, apodo, descripcion
       FROM usuario WHERE id_usuario = ?`, 
      [req.session.user.id_usuario]
    );

    if (userData.length === 0) {
      return res.status(404).render('error', {
        layout: 'main',
        mensajeError: 'Usuario no encontrado en DB'
      });
    }

    const roles = {
      1: 'USUARIO',
      2: 'EDITOR',
      3: 'ADMIN'
    };

    res.render('editarUsuario', {
      layout: 'main',
      title: 'Editar Usuario',
      user: {
        ...userData[0],
        role: roles[userData[0].id_tp_usuario] || 'USUARIO'
      }
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

    await req.pool.query(query, values);

    req.session.user.email = email;
    req.session.user.username = username;
    req.session.user.apodo = apodo
    req.session.user.descripcion = descripcion;

    res.redirect('/usuario');
  } catch (error) {
    console.error('Error actualizando perfil:', error);
    res.status(500).send('Error al actualizar el perfil');
  }
});
 

router.get('/usuario/historial', isAuthenticated, async (req, res) => {
  try {
    const id_usuario = req.session.user.id_usuario;

    // Traer historial con materia
    const [historialRaw] = await req.pool.query(`
      SELECT 
        h.id_examen,
        SUM(h.puntos) AS puntos,
        COUNT(h.id_pregunta) AS total,
        MIN(e.fecha_inicio) AS fecha,
        GROUP_CONCAT(DISTINCT m.descripcion) AS materias
      FROM historial h
      JOIN examen e ON h.id_examen = e.id_examen
      JOIN pregunta p ON h.id_pregunta = p.id_pregunta
      JOIN materias m ON p.id_materia = m.id_materia
      WHERE h.id_usuario = ?
      GROUP BY h.id_examen
      ORDER BY fecha DESC
    `, [id_usuario]);

    const historial = historialRaw.map(h => {
      let materiaFinal = h.total > 50 ? 'ADMISIÓN' : h.materias; // Si es menos de 50 preguntas, mostrar la(s) materia(s)
      return {
        ...h,
        materia: materiaFinal
      };
    });

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



router.get('/usuario/historial/:id_examen', isAuthenticated, async (req, res) => {
  try {
    const id_examen = req.params.id_examen;
    const id_usuario = req.session.user.id_usuario;

    const [detalles] = await req.pool.query(`
      SELECT 
        p.pregunta,
        r.respuesta,
        h.puntos,
        h.porcentaje,
        m.descripcion AS materia
      FROM historial h
      JOIN pregunta p ON h.id_pregunta = p.id_pregunta
      LEFT JOIN respuesta r ON h.id_respuesta = r.id_respuesta
      JOIN materias m ON p.id_materia = m.id_materia
      WHERE h.id_usuario = ? AND h.id_examen = ?
      ORDER BY p.id_pregunta
    `, [id_usuario, id_examen]);

    if (detalles.length === 0) {
      return res.status(404).render('error', {
        layout: 'main',
        mensajeError: 'Examen no encontrado'
      });
    }

    res.render('historialDetalle', {
      layout: 'main',
      title: 'Detalle del Examen',
      examen: detalles
    });

  } catch (error) {
    console.error('Error al cargar el detalle del examen:', error);
    res.status(500).send('Error al cargar el examen');
  }
});

module.exports = router;