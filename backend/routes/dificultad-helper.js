// ================================================================
// 🔧 HELPER: Mapeo de Dificultades
// Convierte strings de dificultad a IDs para la base de datos
// ================================================================

const DIFICULTAD_MAP = {
    'facil': 1,
    'fácil': 1,
    'easy': 1,
    'normal': 2,
    'medio': 2,
    'medium': 2,
    'dificil': 3,
    'difícil': 3,
    'hard': 3,
    'difficult': 3
};

/**
 * Convierte texto de dificultad a ID numérico
 * @param {string|number|null} dificultad - Texto o ID de dificultad
 * @returns {number|null} - ID numérico o null
 */
function obtenerIdDificultad(dificultad) {
    // Si ya es un número válido, devolverlo
    if (typeof dificultad === 'number') {
        return [1, 2, 3].includes(dificultad) ? dificultad : 2; // Default: normal
    }
    
    // Si es null o undefined, devolver null
    if (!dificultad) {
        return null;
    }
    
    // Si es string, normalizar y buscar en el mapa
    const dificultadNormalizada = dificultad.toString().toLowerCase().trim();
    
    return DIFICULTAD_MAP[dificultadNormalizada] || 2; // Default: normal (2)
}

/**
 * Obtiene el texto de dificultad desde un ID
 * @param {number} idDificultad - ID numérico
 * @returns {string} - Texto descriptivo
 */
function obtenerTextoDificultad(idDificultad) {
    const textos = {
        1: 'Fácil',
        2: 'Normal',
        3: 'Difícil'
    };
    
    return textos[idDificultad] || 'Normal';
}

/**
 * Valida que una dificultad sea válida
 * @param {string|number} dificultad
 * @returns {boolean}
 */
function esDificultadValida(dificultad) {
    if (typeof dificultad === 'number') {
        return [1, 2, 3].includes(dificultad);
    }
    
    if (typeof dificultad === 'string') {
        const normalizada = dificultad.toLowerCase().trim();
        return DIFICULTAD_MAP.hasOwnProperty(normalizada);
    }
    
    return false;
}

module.exports = {
    obtenerIdDificultad,
    obtenerTextoDificultad,
    esDificultadValida,
    DIFICULTAD_MAP
};