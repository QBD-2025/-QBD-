const pool = require('../db/conexion');

// ===========================
// Obtiene todas las respuestas de un usuario en un duelo específico
// ===========================
async function obtenerRespuestas(idUsuario, salaId) {
    const [respuestas] = await pool.query(`
        SELECT 
            dr.id_pregunta,
            dr.id_respuesta,
            p.pregunta,
            r.respuesta as texto_respuesta,
            r.correcta as es_correcta,
            dp.orden
        FROM duelos_respuestas dr
        INNER JOIN duelos_preguntas dp ON dr.id_duelo = dp.id_duelo AND dr.id_pregunta = dp.id_pregunta
        INNER JOIN pregunta p ON dr.id_pregunta = p.id_pregunta
        INNER JOIN respuesta r ON dr.id_respuesta = r.id_respuesta
        WHERE dr.id_duelo = ? AND dr.id_usuario = ?
        ORDER BY dp.orden
    `, [salaId, idUsuario]);
    return respuestas; // Array de respuestas del usuario
}

// ===========================
// Verifica si ambos jugadores ya respondieron todas las preguntas del duelo
// ===========================
async function verificarAmbosTerminaron(salaId) {
    const [duelo] = await pool.query(`
        SELECT respondido_retador, respondido_oponente 
        FROM duelos 
        WHERE id_duelo = ?
    `, [salaId]);
    
    if (duelo.length === 0) return false;
    return duelo[0].respondido_retador && duelo[0].respondido_oponente;
}

// ===========================
// Obtiene la información del oponente de un usuario en un duelo
// ===========================
async function obtenerOponente(idUsuario, salaId) {
    const [duelo] = await pool.query(`SELECT id_retador, id_defensor FROM duelos WHERE id_duelo = ?`, [salaId]);
    if (duelo.length === 0) return null;

    const idOponente = duelo[0].id_retador === idUsuario ? duelo[0].id_defensor : duelo[0].id_retador;
    const [oponente] = await pool.query(`SELECT id_usuario as id, username from usuario WHERE id_usuario = ?`, [idOponente]);
    return oponente[0]; // Objeto con {id, username} del oponente
}

// ===========================
// Obtiene toda la información de un duelo, incluyendo datos de los jugadores
// ===========================
async function obtenerDuelo(salaId) {
    const [duelo] = await pool.query(`
        SELECT 
            d.*,
            u1.username as retador_username,
            u1.id_usuario as retador_id,
            u2.username as defensor_username,
            u2.id_usuario as defensor_id
        FROM duelos d
        LEFT JOIN usuario u1 ON d.id_retador = u1.id_usuario
        LEFT JOIN usuario u2 ON d.id_defensor = u2.id_usuario
        WHERE d.id_duelo = ?
    `, [salaId]);
    return duelo[0]; // Objeto con información completa del duelo
}

// ===========================
// Obtiene el ranking actual de un usuario basado en sus puntos
// ===========================
async function obtenerRankingUsuario(idUsuario) {
    const [ranking] = await pool.query(`
        SELECT COUNT(*) + 1 as puesto
        FROM usuario
        WHERE puntos > (SELECT puntos from usuario WHERE id_usuario = ?)
    `, [idUsuario]);
    return ranking[0].puesto; // Número que representa la posición del usuario
}

module.exports = {
    obtenerRespuestas,
    verificarAmbosTerminaron,
    obtenerOponente,
    obtenerDuelo,
    obtenerRankingUsuario
};
