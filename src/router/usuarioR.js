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

    res.render('historialUsuario', {
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
module.exports = router;