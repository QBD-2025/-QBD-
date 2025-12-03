const pool = require('../db/conexion');

// ===========================
// MATERIAS
// ===========================

// Obtener la descripción de una materia por su ID
async function obtenerDescripcionMateria(id_materia) {
    const [[materia]] = await pool.query(
        'SELECT descripcion FROM materias WHERE id_materia = ?', 
        [id_materia]
    );
    return materia; // Objeto con la descripción
}

// ===========================
// PREGUNTAS Y RESPUESTAS
// ===========================

// Obtener hasta 20 preguntas de una materia, incluyendo sus respuestas
async function obtenerPreguntasPorMateria(id_materia) {
    const [preguntas] = await pool.query(
        'SELECT id_pregunta, pregunta, retroalimentacion, puntos FROM pregunta WHERE id_materia = ? LIMIT 20',
        [id_materia]
    );

    // Para cada pregunta, obtenemos sus respuestas
    for (const pregunta of preguntas) {
        const [respuestas] = await pool.query(
            'SELECT id_respuesta, respuesta, correcta FROM respuesta WHERE id_pregunta = ?',
            [pregunta.id_pregunta]
        );
        pregunta.respuestas = respuestas; // Array de respuestas
    }

    return preguntas;
}

// ===========================
// EXÁMENES DE USUARIO
// ===========================

// Obtener el último examen de un usuario en una materia específica
async function obtenerUltimoExamen(id_usuario, id_materia) {
    const [rows] = await pool.query(`
        SELECT ue.porcentaje 
        FROM usuario_examen ue
        JOIN examen e ON ue.id_examen = e.id_examen
        WHERE ue.id_usuario = ? AND e.id_materia = ?
        ORDER BY ue.fecha_termino DESC
        LIMIT 1
    `, [id_usuario, id_materia]);
    return rows[0]?.porcentaje || null; // Retorna porcentaje o null si no hay examen
}

// ===========================
// RANKING
// ===========================

// Obtener el top global de usuarios por puntos
async function obtenerTopGlobal() {
    const [topGlobal] = await pool.query(`
        SELECT u.username, u.apodo, u.puntos, u.foto_perfil
        FROM usuario u
        LEFT JOIN ranking r ON u.id_usuario = r.id_usuario
        ORDER BY u.puntos DESC, r.fecha_actualizacion ASC
        LIMIT 1
    `);
    return topGlobal; // Array con el usuario líder
}

// ===========================
// CREAR Y GUARDAR EXÁMENES
// ===========================

// Crear un examen y retornar su ID
async function crearExamen(id_materia, duracion) {
    const [result] = await pool.query(
        'INSERT INTO examen (id_materia, duracion) VALUES (?, ?)',
        [id_materia, duracion]
    );
    return result.insertId;
}

// Guardar el resultado de un usuario en un examen
async function guardarUsuarioExamen(id_usuario, id_examen, maximo, obtenido, fecha_inicio, fecha_termino, porcentaje) {
    await pool.query(
        `INSERT INTO usuario_examen (id_usuario, id_examen, maximo, obtenido, fecha_inicio, fecha_termino, porcentaje)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id_usuario, id_examen, maximo, obtenido, fecha_inicio, fecha_termino, porcentaje]
    );
}

// ===========================
// PUNTOS DE USUARIO
// ===========================

// Actualizar los puntos acumulados de un usuario
async function actualizarPuntosUsuario(id_usuario, puntos) {
    await pool.query(
        'UPDATE usuario SET puntos = puntos + ? WHERE id_usuario = ?',
        [puntos, id_usuario]
    );
    await verificarPromocionDisponible(id_usuario, puntos);
}

module.exports = {
    obtenerDescripcionMateria,
    obtenerPreguntasPorMateria,
    obtenerUltimoExamen,
    obtenerTopGlobal,
    crearExamen,
    guardarUsuarioExamen,
    actualizarPuntosUsuario
};
