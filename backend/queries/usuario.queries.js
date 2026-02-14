// queries/usuario.queries.js
// QUERIES RELACIONADAS CON USUARIO
// ===========================

// Obtener información básica de un usuario por su ID
const getUsuarioById = `
    SELECT id_usuario, username, email, id_tp_usuario, apodo, descripcion, foto_perfil 
    FROM usuario 
    WHERE id_usuario = ?
`;

// Actualizar datos de un usuario (sin cambiar su avatar)
const updateUsuario = `
    UPDATE usuario 
    SET email = ?, username = ?, apodo = ?, descripcion = ? 
    WHERE id_usuario = ?
`;

// Actualizar datos de un usuario incluyendo su avatar
const updateUsuarioConAvatar = `
    UPDATE usuario 
    SET email = ?, username = ?, apodo = ?, descripcion = ?, foto_perfil = ? 
    WHERE id_usuario = ?
`;

// Obtener historial de exámenes de un usuario con materia y fecha
const getHistorialExamenes = `
    SELECT ue.id_examen, ue.obtenido, ue.maximo, ue.porcentaje, ue.fecha_inicio AS fecha, 
    m.descripcion AS materia 
    FROM usuario_examen ue 
    LEFT JOIN examen e ON ue.id_examen = e.id_examen 
    LEFT JOIN materias m ON e.id_materia = m.id_materia 
    WHERE ue.id_usuario = ? 
    ORDER BY fecha DESC
`;

// Obtener detalle de un examen específico de un usuario
const getDetalleExamen = `
    SELECT ue.id_examen, ue.obtenido, ue.maximo, ue.porcentaje, ue.fecha_inicio AS fecha, 
    m.descripcion AS materia 
    FROM usuario_examen ue 
    LEFT JOIN examen e ON ue.id_examen = e.id_examen 
    LEFT JOIN materias m ON e.id_materia = m.id_materia 
    WHERE ue.id_usuario = ? AND ue.id_examen = ?
`;

module.exports = {
    getUsuarioById,
    updateUsuario,
    updateUsuarioConAvatar,
    getHistorialExamenes,
    getDetalleExamen
};
