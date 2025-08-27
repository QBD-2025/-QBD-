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

// GET /admin
router.get('/', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const [usuarios] = await req.pool.query(`
            SELECT u.id_usuario, u.username, u.email, 
                   u.id_tp_usuario, tr.descripcion AS rol,
                   u.id_status, s.descripcion AS status
            FROM usuario u
            LEFT JOIN tipo_usuario tr ON u.id_tp_usuario = tr.id_tp_usuario
            LEFT JOIN status s ON u.id_status = s.id_status
            ORDER BY u.id_usuario ASC
        `);

        const [lista_status] = await req.pool.query(`SELECT * FROM status`);

        // Convertir a números y agregar flag de sesión
        usuarios.forEach(u => {
            u.id_status = Number(u.id_status) || 1; // 1 como fallback
            u.sesion_activa = global.sesionesActivas?.has(u.id_usuario) || false;
        });

        lista_status.forEach(s => {
            s.id_status = Number(s.id_status) || 1;
        });

        res.render('admin', {
            layout: false, 
            user: req.session.user,
            usuarios,
            lista_status
        });
    } catch (error) {
        console.error("Error cargando usuarios:", error);
        res.status(500).send("Error al cargar usuarios.");
    }
});

// POST /actualizar-usuarios
router.post('/actualizar-usuarios', isAuthenticated, isAdmin, async (req, res) => {
    const { usuario_ids, nuevos_roles, nuevos_status } = req.body;
    const ID_STATUS_BAJA = 5;
    const ID_STATUS_SUSPENDIDO = 3;

    if (!usuario_ids || !nuevos_roles || !nuevos_status ||
        usuario_ids.length !== nuevos_roles.length ||
        usuario_ids.length !== nuevos_status.length) {
        return res.redirect('/admin?error=datos_inconsistentes');
    }

    try {
        const usuariosParaEliminar = [];
        const promesasDeActualizacion = [];

        for (let i = 0; i < usuario_ids.length; i++) {
            const id_usuario = usuario_ids[i] && usuario_ids[i].trim() !== '' ? Number(usuario_ids[i]) : null;
            const nuevoRolId = nuevos_roles[i] && nuevos_roles[i].trim() !== '' ? Number(nuevos_roles[i]) : null;
            const nuevoStatusId = nuevos_status[i] && nuevos_status[i].trim() !== '' ? Number(nuevos_status[i]) : null;

            // Captura la fecha de suspensión si viene
            const suspension_fin = req.body[`suspension_fin_${id_usuario}`] || null;

            if (id_usuario == null || nuevoRolId == null || nuevoStatusId == null) {
                console.warn(`Fila ${i} con valores inválidos, se omite:`, {
                    id_usuario: usuario_ids[i],
                    nuevoRolId: nuevos_roles[i],
                    nuevoStatusId: nuevos_status[i]
                });
                continue;
            }

            // Control de baja
            if (nuevoStatusId === ID_STATUS_BAJA) {
                if (id_usuario === req.session.user.id_usuario) {
                    console.warn(`El admin ${id_usuario} intentó darse de baja a sí mismo. Acción omitida.`);
                    continue;
                }
                usuariosParaEliminar.push(id_usuario);
            } else {
                // Preparar actualización con suspensión si aplica
                let query = 'UPDATE usuario SET id_tp_usuario = ?, id_status = ?';
                const params = [nuevoRolId, nuevoStatusId];

                if (nuevoStatusId === ID_STATUS_SUSPENDIDO) {
                    query += ', suspension_fin = ?';
                    params.push(suspension_fin);
                } else {
                    query += ', suspension_fin = NULL';
                }

                query += ' WHERE id_usuario = ?';
                params.push(id_usuario);

                promesasDeActualizacion.push(req.pool.query(query, params));
            }
        }

        // Ejecutar bajas
        if (usuariosParaEliminar.length > 0) {
            await req.pool.query('DELETE FROM usuario WHERE id_usuario IN (?)', [usuariosParaEliminar]);
        }

        // Ejecutar actualizaciones
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

// POST /editar-usuario
router.post('/editar-usuario', isAuthenticated, isAdmin, async (req, res) => {
    const { id_usuario, username, email, password } = req.body;

    if (!id_usuario) return res.status(400).send("ID de usuario requerido.");

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

// POST /agregar-usuario
router.post('/agregar-usuario', isAuthenticated, isAdmin, async (req, res) => {
    const { username, email, password, verificado } = req.body;

    if (!password || password.trim() === "") return res.status(400).send("La contraseña es obligatoria.");
    if (!username || !email) return res.status(400).send("Faltan datos obligatorios.");

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
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
