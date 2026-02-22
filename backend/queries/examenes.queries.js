//examenes-queries.js - ACTUALIZADO CON FUNCIONES DE CARRERA
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
// CARRERAS
// ===========================

// Obtener todas las carreras disponibles
async function obtenerCarreras() {
    const [carreras] = await pool.query(
        'SELECT id_carrera, descripcion FROM carrera ORDER BY descripcion'
    );
    return carreras;
}

// Obtener la descripción de una carrera por su ID
async function obtenerDescripcionCarrera(id_carrera) {
    const [[carrera]] = await pool.query(
        'SELECT descripcion FROM carrera WHERE id_carrera = ?',
        [id_carrera]
    );
    return carrera; // Objeto con la descripción
}

// ===========================
// TEMÁTICAS
// ===========================

// Obtener todas las temáticas de una carrera
async function obtenerTematicasPorCarrera(id_carrera) {
    const [tematicas] = await pool.query(
        'SELECT id_tematica, descripcion FROM tematica WHERE id_carrera = ? ORDER BY descripcion',
        [id_carrera]
    );
    return tematicas;
}

// Obtener la descripción de una temática por su ID
async function obtenerDescripcionTematica(id_tematica) {
    const [[tematica]] = await pool.query(
        'SELECT descripcion FROM tematica WHERE id_tematica = ?',
        [id_tematica]
    );
    return tematica;
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

// Obtener preguntas por materia y dificultad
async function obtenerPreguntasPorMateriaDificultad(id_materia, id_dificultad, limite = 20) {
    const [preguntas] = await pool.query(
        `SELECT id_pregunta, pregunta, retroalimentacion, puntos 
        FROM pregunta 
        WHERE id_materia = ? AND id_dificultad = ?
        ORDER BY RAND() 
        LIMIT ?`,
        [id_materia, id_dificultad, limite]
    );

    // Para cada pregunta, obtenemos sus respuestas
    for (const pregunta of preguntas) {
        const [respuestas] = await pool.query(
            'SELECT id_respuesta, respuesta, correcta FROM respuesta WHERE id_pregunta = ?',
            [pregunta.id_pregunta]
        );
        pregunta.respuestas = respuestas;
    }

    return preguntas;
}

// Obtener preguntas por carrera, temática y dificultad
async function obtenerPreguntasPorCarreraTematicaDificultad(id_carrera, id_tematica, id_dificultad, limite = 20) {
    const [preguntas] = await pool.query(
        `SELECT id_pregunta, pregunta, retroalimentacion, puntos_carrera as puntos 
        FROM pregunta 
        WHERE id_carrera = ? AND id_tematica = ? AND id_dificultad = ?
        ORDER BY RAND() 
        LIMIT ?`,
        [id_carrera, id_tematica, id_dificultad, limite]
    );

    // Para cada pregunta, obtenemos sus respuestas
    for (const pregunta of preguntas) {
        const [respuestas] = await pool.query(
            'SELECT id_respuesta, respuesta, correcta FROM respuesta WHERE id_pregunta = ?',
            [pregunta.id_pregunta]
        );
        pregunta.respuestas = respuestas;
    }

    return preguntas;
}

// Contar preguntas disponibles por carrera, temática y dificultad
async function contarPreguntasPorCarreraTematicaDificultad(id_carrera, id_tematica, id_dificultad) {
    const [[result]] = await pool.query(
        `SELECT COUNT(*) as total 
        FROM pregunta 
        WHERE id_carrera = ? AND id_tematica = ? AND id_dificultad = ?`,
        [id_carrera, id_tematica, id_dificultad]
    );
    return result.total;
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

// Obtener el último examen de un usuario en una carrera específica
async function obtenerUltimoExamenCarrera(id_usuario, id_carrera) {
    const [rows] = await pool.query(`
        SELECT ue.porcentaje 
        FROM usuario_examen ue
        JOIN examen e ON ue.id_examen = e.id_examen
        WHERE ue.id_usuario = ? AND e.id_carrera = ?
        ORDER BY ue.fecha_termino DESC
        LIMIT 1
    `, [id_usuario, id_carrera]);
    return rows[0]?.porcentaje || null;
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

// Crear un examen y retornar su ID (para materias generales)
async function crearExamen(id_materia, duracion, fecha_inicio, fecha_termino) {
    const [result] = await pool.query(
        'INSERT INTO examen (id_materia, duracion, fecha_inicio, fecha_termino) VALUES (?, ?, ?, ?)',
        [id_materia, duracion, fecha_inicio, fecha_termino]
    );
    return result.insertId;
}

// Crear un examen de carrera y retornar su ID
async function crearExamenCarrera(id_carrera, duracion, fecha_inicio, fecha_termino) {
    const [result] = await pool.query(
        'INSERT INTO examen (id_carrera, duracion, fecha_inicio, fecha_termino) VALUES (?, ?, ?, ?)',
        [id_carrera, duracion, fecha_inicio, fecha_termino]
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
}

module.exports = {
    // Materias
    obtenerDescripcionMateria,
    obtenerPreguntasPorMateria,
    obtenerPreguntasPorMateriaDificultad,
    
    // Carreras
    obtenerCarreras,
    obtenerDescripcionCarrera,
    
    // Temáticas
    obtenerTematicasPorCarrera,
    obtenerDescripcionTematica,
    
    // Preguntas de carrera
    obtenerPreguntasPorCarreraTematicaDificultad,
    contarPreguntasPorCarreraTematicaDificultad,
    
    // Exámenes
    obtenerUltimoExamen,
    obtenerUltimoExamenCarrera,
    crearExamen,
    crearExamenCarrera,
    guardarUsuarioExamen,
    
    // Ranking
    obtenerTopGlobal,
    
    // Usuario
    actualizarPuntosUsuario
};