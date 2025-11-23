/**
 * Helper para seleccionar palabras aleatorias de la base de datos
 * backend/utils/palabrasHelper.js
 */

async function seleccionarPalabraAleatoria(pool, idMateria) {
    try {
        console.log(`\n🔍 [BD] Buscando palabra para materia: ${idMateria}`);
        
        // Verificar que pool esté disponible
        if (!pool) {
            console.error('❌ [BD] Pool de conexión no está disponible');
            return { palabra: "ERROR", pista: "Pool de conexión no disponible." };
        }

        // Ejecutar consulta
        const [palabras] = await pool.query(
            "SELECT palabra, pista FROM palabras WHERE id_materia = ? ORDER BY RAND() LIMIT 1",
            [idMateria]
        );
        
        console.log(`📊 [BD] Resultados encontrados: ${palabras ? palabras.length : 0}`);
        
        // Verificar si se encontraron palabras
        if (!palabras || palabras.length === 0) {
            console.warn(`⚠️ [BD] No se encontraron palabras para materia ${idMateria}`);
            return { 
                palabra: "EJEMPLO", 
                pista: "No se encontraron palabras para esta categoría. Palabra de ejemplo." 
            };
        }
        
        // Extraer y validar la palabra
        const palabraSeleccionada = palabras[0];
        
        if (!palabraSeleccionada.palabra) {
            console.error('❌ [BD] La palabra está vacía o es null');
            return { palabra: "ERROR", pista: "Palabra inválida en la base de datos." };
        }

        const palabraFinal = palabraSeleccionada.palabra.toUpperCase().trim();
        const pistaFinal = palabraSeleccionada.pista || "Sin pista disponible";
        
        console.log(`✅ [BD] Palabra seleccionada: "${palabraFinal}" (${palabraFinal.length} letras)`);
        console.log(`💡 [BD] Pista: "${pistaFinal}"\n`);
        
        return {
            palabra: palabraFinal,
            pista: pistaFinal
        };
        
    } catch (error) {
        console.error("❌ [BD] Error ejecutando consulta:", error);
        console.error("Stack trace:", error.stack);
        return { 
            palabra: "DATABASE", 
            pista: "Error al conectar con la base de datos: " + error.message 
        };
    }
}

module.exports = {
    seleccionarPalabraAleatoria
};