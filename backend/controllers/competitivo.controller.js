// controllers/competitivo.controller.js

// Importa la conexión a la base de datos
const pool = require('../db/conexion');

// Importa funciones de las queries específicas del módulo competitivo
const { 
    obtenerRespuestas, 
    verificarAmbosTerminaron, 
    obtenerOponente, 
    obtenerDuelo,
    obtenerRankingUsuario
} = require('../queries/competitivo.queries');

// ========================
// Calcular puntaje de respuestas correctas
// ========================
function calcularPuntaje(respuestas) {
    // Filtra solo las respuestas correctas y devuelve la cantidad
    return respuestas.filter(r => r.es_correcta).length;
}

// ========================
// Calcular puntos según ranking y resultado del duelo
// ========================
function calcularPuntosSegunRanking(puestoRetador, puestoDefensor, ganoRetador) {
    // Constantes de puntajes y límites
    const PUNTOS_BASE_VICTORIA = 10;
    const BONUS_POR_PUESTO = 2;
    const PENALIZACION_POR_PUESTO = 1;
    const PUNTOS_MINIMOS = 5;
    const BONUS_MAXIMO = 20;
    const PUNTOS_PERDIDA = -5;
    const PUNTOS_PERDIDA_CONTRA_PEOR = -8;

    const diferencia = puestoDefensor - puestoRetador;
    let puntosRetador = 0;
    let puntosDefensor = 0;

    if (ganoRetador) {
        // Si gana el retador, se calculan puntos según diferencia de ranking
        puntosRetador = diferencia < 0
            ? Math.min(Math.abs(diferencia) * BONUS_POR_PUESTO + PUNTOS_BASE_VICTORIA, BONUS_MAXIMO)
            : Math.max(PUNTOS_BASE_VICTORIA - (diferencia * PENALIZACION_POR_PUESTO), PUNTOS_MINIMOS);
        puntosDefensor = diferencia < 0 ? PUNTOS_PERDIDA_CONTRA_PEOR : PUNTOS_PERDIDA;
    } else {
        // Si gana el defensor, se calcula de forma inversa
        puntosDefensor = diferencia > 0
            ? Math.min(diferencia * BONUS_POR_PUESTO + PUNTOS_BASE_VICTORIA, BONUS_MAXIMO)
            : Math.max(PUNTOS_BASE_VICTORIA - (Math.abs(diferencia) * PENALIZACION_POR_PUESTO), PUNTOS_MINIMOS);
        puntosRetador = diferencia > 0 ? PUNTOS_PERDIDA_CONTRA_PEOR : PUNTOS_PERDIDA;
    }

    // Retorna los puntos calculados para ambos jugadores
    return { puntosRetador, puntosDefensor };
}

// ========================
// Finalizar duelo y actualizar historial y puntos
// ========================
async function finalizarDuelo(salaId, idGanador, idPerdedor, puntajeGanador, puntajePerdedor) {
    // Obtener conexión de la pool
    const conn = await pool.getConnection();
    try {
        // Iniciar transacción
        await conn.beginTransaction();

        // Obtener los datos del duelo
        const [duelo] = await conn.query('SELECT * FROM duelos WHERE id_duelo = ?', [salaId]);
        if (!duelo.length) throw new Error('Duelo no encontrado');

        // Determinar si el retador fue el ganador
        const esRetadorGanador = duelo[0].id_retador === idGanador;

        // Obtener rankings de ambos jugadores
        const puestoRetador = await obtenerRankingUsuario(duelo[0].id_retador);
        const puestoDefensor = await obtenerRankingUsuario(duelo[0].id_defensor);

        // Calcular puntos según ranking
        const { puntosRetador, puntosDefensor } = calcularPuntosSegunRanking(puestoRetador, puestoDefensor, esRetadorGanador);

        // Actualizar puntos en tabla usuario
        await conn.query('UPDATE usuario SET puntos = puntos + ? WHERE id_usuario = ?', [puntosRetador, duelo[0].id_retador]);
        await conn.query('UPDATE usuario SET puntos = puntos + ? WHERE id_usuario = ?', [puntosDefensor, duelo[0].id_defensor]);

        // Registrar el duelo en el historial
        await conn.query(`
            INSERT INTO historial_duelos 
            (id_duelo, id_retador, id_defensor, id_ganador, puntos_retador, puntos_defensor, fecha_duelo)
            VALUES (?, ?, ?, ?, ?, ?, NOW())
        `, [
            salaId, duelo[0].id_retador, duelo[0].id_defensor, idGanador,
            esRetadorGanador ? puntajeGanador : puntajePerdedor,
            esRetadorGanador ? puntajePerdedor : puntajeGanador
        ]);

        // Marcar duelo como finalizado
        await conn.query('UPDATE duelos SET estado = ? WHERE id_duelo = ?', ['finalizado', salaId]);

        // Commit y liberar conexión
        await conn.commit();
        await conn.release();

        // Retornar puntos y rankings calculados
        return { puntosRetador, puntosDefensor, puestoRetador, puestoDefensor };
    } catch (error) {
        // Rollback en caso de error y liberar conexión
        await conn.rollback();
        await conn.release();
        throw error;
    }
}

// ========================
// Exportar funciones del controlador
// ========================
module.exports = {
    calcularPuntaje,
    calcularPuntosSegunRanking,
    finalizarDuelo
};
