// controllers/dato.controller.js

// Importa las queries necesarias para obtener materias y datos
const { obtenerMaterias, obtenerDatosPorMateria, obtenerDatoAleatorio } = require('../queries/datos.queries');

// ========================
// Renderizar la vista de elección de materia
// ========================
async function mostrarEleccion(req, res) {
    try {
        // Obtener lista de materias desde la base de datos
        const materias = await obtenerMaterias();

        // Renderizar la vista pasando mensaje y materias en JSON
        res.render('eleccion-dato', {
            mensaje: 'Selecciona una materia para ver su dato curioso',
            materias: JSON.stringify(materias)
        });
    } catch (error) {
        console.error('Error al obtener materias:', error);
        res.status(500).send('Error al obtener materias');
    }
}

// ========================
// Mostrar los datos curiosos de una materia específica
// ========================
async function mostrarDatosPorMateria(req, res) {
    const idMateria = req.params.idMateria;

    try {
        // Obtener los datos de la materia seleccionada
        const datos = await obtenerDatosPorMateria(idMateria);

        if (datos.length === 0) {
            // Si no hay datos para la materia, mostrar mensaje adecuado
            return res.render('datos', {
                materias: 'Materia desconocida',
                datos: []
            });
        }

        // Convertir imagenes a Base64 si existen
        const datosConImagen = datos.map(d => ({
            texto: d.dato,
            imagenBase64: d.imagen ? d.imagen.toString('base64') : null
        }));

        // Renderizar vista con los datos y nombre de la materia
        res.render('datos', {
            materias: datos[0].materia,
            datos: datosConImagen
        });
    } catch (error) {
        console.error('Error al obtener los datos curiosos:', error);
        res.status(500).send('Error al obtener los datos curiosos');
    }
}

// ========================
// Mostrar un dato curioso aleatorio
// ========================
async function mostrarDatoAleatorio(req, res) {
    try {
        // Obtener un dato aleatorio
        const dato = await obtenerDatoAleatorio();

        // Renderizar vista pasando dato y posible imagen
        res.render('dato-sesion', {
            dato: dato?.dato || 'No se encontró ningún dato.',
            imagen: dato?.imagen || null
        });
    } catch (err) {
        console.error('Error al obtener el dato:', err);
        res.status(500).send('Error al obtener el dato curioso.');
    }
}

// ========================
// Exportar funciones del controlador
// ========================
module.exports = {
    mostrarEleccion,
    mostrarDatosPorMateria,
    mostrarDatoAleatorio
};
