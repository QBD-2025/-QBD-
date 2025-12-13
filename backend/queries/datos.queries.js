const pool = require('../db/conexion');

// ===========================
// Obtiene todas las materias disponibles
// ===========================
async function obtenerMaterias() {
    const [materias] = await pool.query('SELECT id_materia, descripcion FROM materias');
    return materias; // Array de objetos {id_materia, descripcion}
}

// ===========================
// Obtiene todos los datos curiosos asociados a una materia específica
// ===========================
async function obtenerDatosPorMateria(idMateria) {
    const [datos] = await pool.query(`
        SELECT dc.dato, dc.imagen, m.descripcion AS materia
        FROM dato_curioso dc
        JOIN materias m ON dc.id_materia = m.id_materia
        WHERE dc.id_materia = ? and dc.id_estatus_p = 1
    `, [idMateria]);
    return datos; // Array de objetos {dato, imagen, materia}
}

// ===========================
// Obtiene un dato curioso aleatorio de toda la base de datos
// ===========================
async function obtenerDatoAleatorio() {
    const [rows] = await pool.query('SELECT dato, imagen FROM dato_curioso where id_estatus_p = 1 ORDER BY RAND() LIMIT 1');
    return rows[0]; // Objeto {dato, imagen}
}

module.exports = {
    obtenerMaterias,
    obtenerDatosPorMateria,
    obtenerDatoAleatorio
};
