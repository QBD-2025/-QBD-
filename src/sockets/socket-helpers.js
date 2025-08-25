async function seleccionarPalabraAleatoria(pool, idMateria) {
    try {
        const [palabras] = await pool.query(
            "SELECT palabra, pista FROM palabras WHERE id_materia = ? ORDER BY RAND() LIMIT 1",
            [idMateria]
        );
        if (palabras.length === 0) {
            return { palabra: "ERROR", pista: "No se encontraron palabras para esta categoría." };
        }
        return {
            palabra: palabras[0].palabra.toUpperCase(),
            pista: palabras[0].pista
        };
    } catch (error) {
        console.error("Error seleccionando palabra de la BD:", error);
        return { palabra: "DATABASE", pista: "Error al conectar con la base de datos." };
    }
}

module.exports = {
    seleccionarPalabraAleatoria
};