// db/queries/admin.queries.js
const pool = require('../db/conexion');

// Obtener todos los usuarios con rol y status
async function obtenerUsuarios() {
    const [usuarios] = await pool.query(`
        SELECT u.id_usuario, u.username, u.email, 
               u.id_tp_usuario, tr.descripcion AS rol,
               u.id_status, s.descripcion AS status
        FROM usuario u
        LEFT JOIN tipo_usuario tr ON u.id_tp_usuario = tr.id_tp_usuario
        LEFT JOIN status s ON u.id_status = s.id_status
        ORDER BY u.id_usuario ASC
    `);
    return usuarios;
}

// Obtener lista de status
async function obtenerListaStatus() {
    const [status] = await pool.query('SELECT * FROM status');
    return status;
}

// Actualizar usuario
async function actualizarUsuario(id_usuario, nuevoRolId, nuevoStatusId, suspension_fin = null) {
    let query = 'UPDATE usuario SET id_tp_usuario = ?, id_status = ?';
    const params = [nuevoRolId, nuevoStatusId];

    if (nuevoStatusId === 3) { // suspendido
        query += ', suspension_fin = ?';
        params.push(suspension_fin);
    } else {
        query += ', suspension_fin = NULL';
    }

    query += ' WHERE id_usuario = ?';
    params.push(id_usuario);

    return pool.query(query, params);
}

// Eliminar usuarios
async function eliminarUsuarios(usuariosParaEliminar) {
    if (!usuariosParaEliminar || usuariosParaEliminar.length === 0) return;
    
    const placeholders = usuariosParaEliminar.map(() => '?').join(',');
    return pool.query(`DELETE FROM usuario WHERE id_usuario IN (${placeholders})`, usuariosParaEliminar);
}

// Editar usuario individual
async function editarUsuario(id_usuario, campos, valores) {
    const query = `UPDATE usuario SET ${campos.join(', ')} WHERE id_usuario = ?`;
    valores.push(id_usuario);
    return pool.query(query, valores);
}

// Agregar nuevo usuario
async function agregarUsuario(username, email, password, verificado = 0) {
    const [result] = await pool.query(
        'INSERT INTO usuario (username, email, password, verificado, id_tp_usuario, id_status) VALUES (?, ?, ?, ?, 1, 1)',
        [username, email, password, verificado]
    );
    return result.insertId;
}

module.exports = {
    obtenerUsuarios,
    obtenerListaStatus,
    actualizarUsuario,
    eliminarUsuarios,
    editarUsuario,
    agregarUsuario
};