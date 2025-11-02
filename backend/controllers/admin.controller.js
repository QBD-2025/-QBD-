// controller/admin.controller.js

// Importa bcrypt para el hashing de contraseñas
const bcrypt = require('bcrypt');
// Importa las consultas a la base de datos relacionadas con el admin
const adminQueries = require('../queries/admin.queries');

// Función para renderizar la página de administración
async function renderAdminPage(req, res) {
    try {
        console.log("🔵 1. Iniciando renderAdminPage");
        console.log("🔵 2. Usuario en sesión:", req.session.user);
        
        const usuarios = await adminQueries.obtenerUsuarios();
        console.log("🟢 3. Usuarios obtenidos:", usuarios ? usuarios.length : 'null');
        
        const lista_status = await adminQueries.obtenerListaStatus();
        console.log("🟢 4. Status obtenidos:", lista_status ? lista_status.length : 'null');

        if (!usuarios) {
            console.error("❌ ERROR: usuarios es null o undefined");
            return res.status(500).send("Error: usuarios es null");
        }

        usuarios.forEach(u => {
            u.id_status = Number(u.id_status) || 1;
            u.sesion_activa = global.sesionesActivas?.has(u.id_usuario) || false;
        });

        lista_status.forEach(s => s.id_status = Number(s.id_status) || 1);

        console.log("🟡 5. Datos normalizados");
        console.log("🟡 6. Renderizando con datos:", { 
            usuariosCount: usuarios.length,
            statusCount: lista_status.length,
            userLogged: req.session.user?.username
        });
        
        res.render('admin', { 
            layout: false, 
            user: req.session.user, 
            usuarios, 
            lista_status 
        });
        
        console.log("✅ 7. Vista renderizada exitosamente");
    } catch (error) {
        console.error("❌ ERROR CRÍTICO en renderAdminPage:", error);
        console.error("Stack:", error.stack);
        res.status(500).send("Error: " + error.message);
    } 
}

// Función para actualizar múltiples usuarios
async function actualizarUsuarios(req, res) {
    // Extrae los datos enviados desde el formulario
    const { usuario_ids, nuevos_roles, nuevos_status } = req.body;
    const ID_STATUS_BAJA = 5; // Status de baja
    const ID_STATUS_SUSPENDIDO = 3; // Status suspendido

    // Valida que los arrays existan y tengan la misma longitud
    if (!usuario_ids || !nuevos_roles || !nuevos_status ||
        usuario_ids.length !== nuevos_roles.length ||
        usuario_ids.length !== nuevos_status.length) {
        return res.redirect('/admin?error=datos_inconsistentes');
    }

    try {
        const usuariosParaEliminar = []; // Lista de usuarios a eliminar
        const promesasDeActualizacion = []; // Lista de promesas de actualización

        // Recorre cada usuario y prepara la actualización
        for (let i = 0; i < usuario_ids.length; i++) {
            const id_usuario = Number(usuario_ids[i]);
            const nuevoRolId = Number(nuevos_roles[i]);
            const nuevoStatusId = Number(nuevos_status[i]);
            const suspension_fin = req.body[`suspension_fin_${id_usuario}`] || null;

            // Si el usuario está de baja y no es el actual, se agrega a eliminar
            if (nuevoStatusId === ID_STATUS_BAJA && id_usuario !== req.session.user.id_usuario) {
                usuariosParaEliminar.push(id_usuario);
            } else {
                // Agrega promesa de actualización
                promesasDeActualizacion.push(
                    adminQueries.actualizarUsuario(id_usuario, nuevoRolId, nuevoStatusId, suspension_fin)
                );
            }
        }

        // Elimina los usuarios marcados para baja
        await adminQueries.eliminarUsuarios(usuariosParaEliminar);
        // Ejecuta todas las actualizaciones simultáneamente
        await Promise.all(promesasDeActualizacion);

        // Mensaje de éxito en la sesión
        req.session.mensaje = "Cambios guardados exitosamente.";
        res.redirect('/admin');
    } catch (error) {
        console.error("Error masivo al actualizar usuarios:", error);
        res.status(500).send("Error al guardar los cambios.");
    }
}

// Función para editar un solo usuario
async function editarUsuario(req, res) {
    const { id_usuario, username, email, password } = req.body;
    if (!id_usuario) return res.status(400).send("ID de usuario requerido.");

    try {
        const campos = []; // Campos a actualizar
        const valores = []; // Valores correspondientes

        // Solo agrega los campos que vienen en la petición
        if (username) { campos.push("username = ?"); valores.push(username); }
        if (email) { campos.push("email = ?"); valores.push(email); }
        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10); // Hashea la contraseña
            campos.push("password = ?");
            valores.push(hashedPassword);
        }

        if (campos.length === 0) return res.status(400).send("No se enviaron campos para actualizar.");

        // Llama a la query para actualizar el usuario
        await adminQueries.editarUsuario(id_usuario, campos, valores);
        res.status(200).send("Usuario actualizado.");
    } catch (error) {
        console.error("Error al editar usuario:", error);
        res.status(500).send("Error interno al editar usuario.");
    }
}

// Función para agregar un nuevo usuario
async function agregarUsuario(req, res) {
    const { username, email, password, verificado } = req.body;
    if (!password || !username || !email) return res.status(400).send("Faltan datos obligatorios.");

    try {
        const hashedPassword = await bcrypt.hash(password, 10); // Hashea la contraseña
        const id_usuario = await adminQueries.agregarUsuario(username, email, hashedPassword, verificado || 0);
        res.status(201).json({ id_usuario }); // Devuelve el id del nuevo usuario
    } catch (error) {
        console.error('Error agregando usuario:', error);
        res.sendStatus(500);
    }
}

// Exporta las funciones para ser usadas en rutas
module.exports = { renderAdminPage, actualizarUsuarios, editarUsuario, agregarUsuario };
