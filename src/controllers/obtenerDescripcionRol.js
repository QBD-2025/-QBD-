async function obtenerDescripcionRol(pool, id_tp_usuario) {
  const [rows] = await pool.query(
    'SELECT descripcion FROM tipo_usuario WHERE id_tp_usuario = ?',
    [id_tp_usuario]
  );
  return rows[0]?.descripcion || 'Desconocido';
}

module.exports = obtenerDescripcionRol;