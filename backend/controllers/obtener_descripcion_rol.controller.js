// backend/contorllers/obtener_descripcion_rol.controller.js

// ========================
// Obtener descripción de un rol por su ID
// ========================
async function obtenerDescripcionRol(pool, id_tp_usuario) {
  // Ejecutar consulta para obtener la descripción del tipo de usuario
  const [rows] = await pool.query(
    'SELECT descripcion FROM tipo_usuario WHERE id_tp_usuario = ?',
    [id_tp_usuario]
  );

  // Retornar la descripción si existe, o "Desconocido" si no se encuentra
  return rows[0]?.descripcion || 'Desconocido';
}

// ========================
// Exportar función
// ========================
module.exports = obtenerDescripcionRol;
