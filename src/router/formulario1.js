// routes/encuestaR.js
const express = require('express');
const router = express.Router();
const crypto = require('crypto');

// Flujo condicional según la opción seleccionada
const flujoCondicional = {
    5: 2,  // Ingeniería (opción 5) → /pregunta2
    6: 4,  // Medicina (opción 6) → /pregunta4
    7: 3   // Licenciatura (opción 7) → /pregunta3
};

// Mapeo de opciones a carreras (id_carrera en tu BD)
const mapeoCarreras = {
    8: 1,   // Ing. Software
    9: 2,   // Ing. Informática
    10: 3,  // Ing. Civil
    11: 4,  // Ing. Eléctrica
    12: 5,  // Admin. de Empresas
    13: 6,  // Derecho
    14: 7,  // Med. General
    15: 8   // Psicología Clínica
};

// Función para cargar preguntas
async function cargarPregunta(pool, idPregunta) {
    const [preguntas] = await pool.query(`
        SELECT p.id_pregunta, p.texto AS pregunta, o.id_opcion, o.texto_opcion
        FROM pregunta_encuesta p
        JOIN opcion_pregunta o ON p.id_pregunta = o.id_pregunta
        WHERE p.id_encuesta = 1 AND p.id_estatus_p = 1 AND p.id_pregunta = ?
        ORDER BY p.id_pregunta, o.id_opcion
    `, [idPregunta]);

    const preguntasFormateadas = [];
    let currentPregunta = null;

    for (const row of preguntas) {
        if (!currentPregunta || currentPregunta.id_pregunta !== row.id_pregunta) {
            currentPregunta = {
                id_pregunta: row.id_pregunta,
                pregunta: row.pregunta,
                opciones: []
            };
            preguntasFormateadas.push(currentPregunta);
        }
        currentPregunta.opciones.push({
            id_opcion: row.id_opcion,
            texto_opcion: row.texto_opcion
        });
    }

    return preguntasFormateadas;
}

// --- GET: Formulario inicial (Pregunta 2: Tipo de carrera)
router.get('/formulario1', async (req, res) => {
    try {
        // Generar temp_id si no existe
        if (!req.session.tempUserId) {
            req.session.tempUserId = crypto.randomBytes(16).toString('hex');
        }

        const preguntas = await cargarPregunta(req.pool, 2);
        res.render('formulario1', { preguntas, layout: false });
    } catch (error) {
        console.error('Error al cargar preguntas:', error);
        res.status(500).send('Error al cargar el formulario');
    }
});

// GET: Pregunta 2 (Pregunta 3: Ingeniería)
router.get('/pregunta2', async (req, res) => {
    try {
        const preguntas = await cargarPregunta(req.pool, 3);
        res.render('pregunta2', { preguntas, layout: false });
    } catch (error) {
        console.error('Error al cargar pregunta2:', error);
        res.status(500).send('Error al cargar la pregunta');
    }
});

// GET: Pregunta 3 (Pregunta 4: Licenciatura)
router.get('/pregunta3', async (req, res) => {
    try {
        const preguntas = await cargarPregunta(req.pool, 4);
        res.render('pregunta3', { preguntas, layout: false });
    } catch (error) {
        console.error('Error al cargar pregunta3:', error);
        res.status(500).send('Error al cargar la pregunta');
    }
});

// GET: Pregunta 4 (Pregunta 5: Medicina)
router.get('/pregunta4', async (req, res) => {
    try {
        const preguntas = await cargarPregunta(req.pool, 5);
        res.render('pregunta4', { preguntas, layout: false });
    } catch (error) {
        console.error('Error al cargar pregunta4:', error);
        res.status(500).send('Error al cargar la pregunta');
    }
});

// GET: Pregunta 5 (Pregunta 15: Nivel de conocimiento)
router.get('/pregunta5', async (req, res) => {
    try {
        const preguntas = await cargarPregunta(req.pool, 15);
        res.render('pregunta5', { preguntas, layout: false });
    } catch (error) {
        console.error('Error al cargar pregunta5:', error);
        res.status(500).send('Error al cargar la pregunta');
    }
});

// POST: Procesar formulario
router.post('/procesar-formulario', async (req, res) => {
    try {
        const body = req.body;
        const tempUserId = req.session.tempUserId;

        console.log('=== DEBUG PROCESAR FORMULARIO ===');
        console.log('Body recibido:', body);
        console.log('Temp User ID:', tempUserId);

        if (!tempUserId) {
            console.log('ERROR: No hay temp_id en sesión');
            return res.redirect('/formulario1');
        }

        // Inicializar sesión temporal si no existe
        req.session.encuestaTemporal = req.session.encuestaTemporal || [];
        
        let siguientePregunta = null;
        let carreraSeleccionada = null;

        for (const key in body) {
            if (key.startsWith('respuesta_')) {
                const id_pregunta = parseInt(key.replace('respuesta_', ''));
                const id_opcion = parseInt(body[key]);

                console.log(`Procesando: Pregunta ${id_pregunta}, Opción ${id_opcion}`);

                // Guardar la opción en sesión
                req.session.encuestaTemporal.push({ 
                    id_pregunta,
                    id_opcion 
                });

                // Revisar si es una carrera específica (preguntas 3, 4, 5)
                if (mapeoCarreras[id_opcion]) {
                    carreraSeleccionada = mapeoCarreras[id_opcion];
                    console.log('Carrera encontrada en mapeo:', carreraSeleccionada);
                    
                    // GUARDAR EN SESIÓN en lugar de BD
                    req.session.carreraSeleccionada = carreraSeleccionada;
                }

                // Revisar flujo condicional (pregunta 2)
                if (flujoCondicional[id_opcion]) {
                    siguientePregunta = flujoCondicional[id_opcion];
                    console.log('Siguiente pregunta según flujo:', siguientePregunta);
                }
            }
        }

        console.log('Carrera final en sesión:', req.session.carreraSeleccionada);
        console.log('Siguiente pregunta:', siguientePregunta);

        // Si se seleccionó una carrera, ir a pregunta 5
        if (carreraSeleccionada) {
            return res.redirect('/pregunta5');
        }

        // Si hay flujo condicional, redirigir a la siguiente pregunta
        if (siguientePregunta) {
            return res.redirect(`/pregunta${siguientePregunta}`);
        }

        // Si terminamos la encuesta (pregunta 5), ir al registro
        res.redirect('/register');
    } catch (err) {
        console.error('Error al procesar formulario:', err);
        res.status(500).send('Error al procesar el formulario');
    }
});

module.exports = router;