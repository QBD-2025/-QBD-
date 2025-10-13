const pool = require('../db/conexion');

// ===========================
// NOTIFICACIONES
// ===========================

// Obtener todas las notificaciones no leídas de un usuario específico
async function obtenerNotificacionesSinLeer(id_usuario) {
    const [rows] = await pool.query(
        "SELECT * FROM notificaciones WHERE id_usuario_destinatario = ? AND leido = 0 ORDER BY fecha_creacion DESC",
        [id_usuario]
    );
    return rows; // Retorna un array de notificaciones pendientes
}

module.exports = {
    obtenerNotificacionesSinLeer
};
