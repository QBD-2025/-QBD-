const express = require('express');
const router = express.Router();

// Middleware para autenticación y roles
const isAuthenticated = (req, res, next) => {
    if (req.session.user) return next();
    return res.redirect('/login');
};

const isAdmin = (req, res, next) => {
    if (req.session.user?.id_tp_usuario === 3) return next(); // 3 = admin
    return res.status(403).render('error', {
        layout: 'main',
        mensajeError: 'Acceso reservado para administradores',
    });
};

router.get('/admin', isAuthenticated, isAdmin, async (req, res) => {
    console.log('Cargando usuarios para admin:', req.session.user?.id_usuario);
    const [usuarios] = await req.pool.query(`
        SELECT id_usuario, username, email, id_tp_usuario FROM usuario
    `);

    // 🔍 Verifica qué contiene esto
    console.log('Usuarios cargados:', usuarios);

    res.render('admin', {
        layout: 'admin-layout',
        user: req.session.user,
        usuarios
    });
});

router.post('/admin/cambiar-rol', isAuthenticated, isAdmin, async (req, res) => {
    const rolesActualizados = req.body.roles;
    console.log('Roles actualizados:', rolesActualizados);
    console.log('BODY COMPLETO:', req.body)
    try {
        for (const id_usuario in rolesActualizados) {
            const nuevoRol = parseInt(rolesActualizados[id_usuario], 10);

            // Validación de rol válido
            if (![1, 2, 3].includes(nuevoRol)) {
                console.warn(`Rol inválido para usuario ${id_usuario}: ${nuevoRol}`);
                continue;
            }

            // Consulta del rol actual
            const [[usuario]] = await req.pool.query(
                'SELECT id_tp_usuario FROM usuario WHERE id_usuario = ?',
                [id_usuario]
            );

            if (!usuario) {
                console.warn(`Usuario no encontrado: ${id_usuario}`);
                continue;
            }

            const rolActual = usuario.id_tp_usuario;

            // Solo actualizar si el rol cambió
            if (rolActual !== nuevoRol) {
                console.log(`Actualizando usuario ${id_usuario} de rol ${rolActual} a ${nuevoRol}`);
                await req.pool.query(
                    'UPDATE usuario SET id_tp_usuario = ? WHERE id_usuario = ?',
                    [nuevoRol, id_usuario]
                );
            } else {
                console.log(`Sin cambios para usuario ${id_usuario}`);
            }
        }

        // Mensaje de éxito para mostrar en la vista
        req.session.mensaje = "Roles actualizados correctamente.";
        res.redirect('/admin');

    } catch (error) {
        console.error("Error actualizando roles:", error);
        res.status(500).render('error', {
            layout: 'main',
            mensajeError: 'Error al actualizar los roles de los usuarios.',
        });
    }
});

module.exports = router;