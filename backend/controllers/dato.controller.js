// controllers/dato.controller.js

const { obtenerMaterias, obtenerDatosPorMateria, obtenerDatoAleatorio } = require('../queries/datos.queries');

// ========================
// Renderizar la vista de elección de materia
// ========================
async function mostrarEleccion(req, res) {
    try {
        // Obtener lista de materias desde la base de datos
        const materias = await obtenerMaterias();
        
        // ✅ DEBUG: Ver qué se está obteniendo
        console.log('[DATO CONTROLLER]: Materias obtenidas:', materias);
        console.log('[DATO CONTROLLER]: Total de materias:', materias?.length);

        // ✅ CORREGIDO: Pasar el objeto directamente, NO como string
        res.render('eleccion-dato', {
            mensaje: 'Selecciona una materia para ver su dato curioso',
            materias: materias  // ✅ Pasar el array directamente
        });
    } catch (error) {
        console.error('[DATO CONTROLLER ERROR]:', error);
        res.status(500).send('Error al obtener materias');
    }
}

// ========================
// Mostrar los datos curiosos de una materia específica
// ========================
async function mostrarDatosPorMateria(req, res) {
    const idMateria = req.params.idMateria;

    try {
        const datos = await obtenerDatosPorMateria(idMateria);

        if (datos.length === 0) {
            return res.render('datos', {
                materias: 'Materia desconocida',
                datos: []
            });
        }

        const datosConImagen = datos.map(d => ({
            texto: d.dato,
            imagenBase64: d.imagen ? d.imagen.toString('base64') : null
        }));

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
        const dato = await obtenerDatoAleatorio();

        res.render('dato-sesion', {
            dato: dato?.dato || 'No se encontró ningún dato.',
            imagen: dato?.imagen || null
        });
    } catch (err) {
        console.error('Error al obtener el dato:', err);
        res.status(500).send('Error al obtener el dato curioso.');
    }
}

module.exports = {
    mostrarEleccion,
    mostrarDatosPorMateria,
    mostrarDatoAleatorio
};