const bcrypt = require('bcrypt');
const express = require('express');
const router = express.Router();

// Middleware para autenticación y roles
const isAuthenticated = (req, res, next) => {
    if (req.session.user) return next();
    return res.redirect('/login');
};

const isAdmin = (req, res, next) => {
    if (req.session.user?.id_tp_usuario === 3) return next();
    return res.status(403).render('error', {
        mensajeError: 'Acceso reservado para administradores',
    });
};

// GET / -> Ruta para mostrar el panel de administración
router.get('/', isAuthenticated, isAdmin, async (req, res) => {
    try {
        // ✨ CONSULTA CORREGIDA: Hacemos JOIN para obtener los nombres de rol y estatus
        const [usuarios] = await req.pool.query(`
            SELECT 
                u.id_usuario, u.username, u.email, 
                u.id_tp_usuario, tr.descripcion,
                u.id_status, s.descripcion
            FROM usuario u
            LEFT JOIN tipo_usuario tr ON u.id_tp_usuario = tr.id_tp_usuario
            LEFT JOIN status s ON u.id_status = s.id_status
            ORDER BY u.id_usuario ASC
        `);

        // Consulta para obtener la lista de todos los estatus posibles
        const [lista_status] = await req.pool.query('SELECT id_status, descripcion FROM status');

        // Renderizamos la vista con todos los datos necesarios
        res.render('admin', {
            layout: false, // Tu admin.hbs ya es un HTML completo
            user: req.session.user,
            usuarios: usuarios,
            lista_status: lista_status
        });

    } catch (error) {
        console.error("Error cargando el panel de admin:", error);
        res.status(500).send("Error interno del servidor al cargar el panel.");
    }
});

// POST /actualizar-usuarios -> Ruta para procesar los cambios del formulario
router.post('/actualizar-usuarios', isAuthenticated, isAdmin, async (req, res) => {
    const { usuario_ids, nuevos_roles, nuevos_status } = req.body;
    
    // IMPORTANTE: Asumimos que el ID para "Baja" en tu tabla status es 5.
    // Si es diferente, cámbialo aquí.
    const ID_STATUS_BAJA = 5; 

    if (!usuario_ids || !nuevos_roles || !nuevos_status || usuario_ids.length !== nuevos_roles.length || usuario_ids.length !== nuevos_status.length) {
        return res.redirect('/admin?error=datos_inconsistentes');
    }

    try {
        const usuariosParaEliminar = [];
        const promesasDeActualizacion = [];

        for (let i = 0; i < usuario_ids.length; i++) {
            const id_usuario = parseInt(usuario_ids[i], 10);
            const nuevoRolId = parseInt(nuevos_roles[i], 10);
            const nuevoStatusId = parseInt(nuevos_status[i], 10);

            // Si el estatus es "Baja", lo agregamos a la lista para eliminar
            if (nuevoStatusId === ID_STATUS_BAJA) {
                // Evitar que un admin se elimine a sí mismo
                if (id_usuario === req.session.user.id_usuario) {
                    console.warn(`El admin ${id_usuario} intentó darse de baja a sí mismo. Acción omitida.`);
                    continue;
                }
                usuariosParaEliminar.push(id_usuario);
            } 
            // Si no, lo actualizamos
            else {
                const promesa = req.pool.query(
                    'UPDATE usuario SET id_tp_usuario = ?, id_status = ? WHERE id_usuario = ?',
                    [nuevoRolId, nuevoStatusId, id_usuario]
                );
                promesasDeActualizacion.push(promesa);
            };
        }

        // Ejecutamos las eliminaciones
        if (usuariosParaEliminar.length > 0) {
            await req.pool.query('DELETE FROM usuario WHERE id_usuario IN (?)', [usuariosParaEliminar]);
        }

        // Ejecutamos las actualizaciones
        if (promesasDeActualizacion.length > 0) {
            await Promise.all(promesasDeActualizacion);
        }

        req.session.mensaje = "Cambios guardados exitosamente.";
        res.redirect('/admin');

    } catch (error) {
        console.error("Error masivo al actualizar usuarios:", error);
        res.status(500).send("Error al guardar los cambios.");
    }
});


router.post('/editar-usuario', isAuthenticated, isAdmin, async (req, res) => {
    const { id_usuario, username, email, password } = req.body;

    if (!id_usuario) {
        return res.status(400).send("ID de usuario requerido.");
    }

    try {
        const campos = [];
        const valores = [];

        if (username && username.trim() !== '') {
            campos.push("username = ?");
            valores.push(username);
        }

        if (email && email.trim() !== '') {
            campos.push("email = ?");
            valores.push(email);
        }

        if (password && password.trim() !== '') {
            const hashedPassword = await bcrypt.hash(password, 10);
            campos.push("password = ?");
            valores.push(hashedPassword);
        }

        if (campos.length === 0) {
            return res.status(400).send("No se enviaron campos para actualizar.");
        }

        valores.push(id_usuario);

        const query = `UPDATE usuario SET ${campos.join(', ')} WHERE id_usuario = ?`;
        await req.pool.query(query, valores);

        res.status(200).send("Usuario actualizado.");
    } catch (error) {
        console.error("Error al editar usuario:", error);
        res.status(500).send("Error interno al editar usuario.");
    }
});


router.post('/agregar-usuario', isAuthenticated, isAdmin, async (req, res) => {
    const { username, email, password, verificado } = req.body;

    if (!password || password.trim() === "") {
        return res.status(400).send("La contraseña es obligatoria.");
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        if (!username || !email || !password) {
        return res.status(400).send("Faltan datos obligatorios.");
    }
        const [result] = await req.pool.query(
            
            'INSERT INTO usuario (username, email, password, verificado, id_tp_usuario, id_status) VALUES (?, ?, ?, ?, 1, 1)',
            [username, email, hashedPassword, verificado || 0]
        );

        res.status(201).json({ id_usuario: result.insertId });
    } catch (error) {
        console.error('Error agregando usuario:', error);
        res.sendStatus(500);
    }
});


module.exports = router;