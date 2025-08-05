const express = require('express');
const router = express.Router();
const pool = require('../db/conexion'); // Asegúrate de importar tu pool de conexión MySQL configurado



// Ruta base que muestra un mensaje o una vista simple
router.get('/eleccion-dato', async (req, res) => {
  
  try {
    const [materias] = await pool.query('SELECT id_materia, descripcion FROM materias');
    res.render('eleccion-dato', {
      mensaje: 'Selecciona una materia para ver su dato curioso',
      materias: JSON.stringify(materias) // importante pasarlo como string JSON
    });
  } catch (error) {
    console.error('Error al obtener materias:', error);
    res.status(500).send('Error al obtener materias');
  }
});


// Ruta que recibe idMateria por params y muestra dato curioso con imagen
router.get('/dato-curioso/:idMateria', async (req, res) => {
  const idMateria = req.params.idMateria;

  try {
    const [datos] = await pool.query(
      `SELECT dc.dato, dc.imagen, m.descripcion AS materia
       FROM dato_curioso dc
       JOIN materias m ON dc.id_materia = m.id_materia
       WHERE dc.id_materia = ?`,
      [idMateria]
    );

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
});

router.get('/dato-sesion', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT dato, imagen FROM dato_curioso ORDER BY RAND() LIMIT 1');
    const dato = rows[0];

    res.render('dato-sesion', {
      dato: dato?.dato || 'No se encontró ningún dato.',
      imagen: dato?.imagen || null
    });
  } catch (err) {
    console.error('Error al obtener el dato:', err);
    res.status(500).send('Error al obtener el dato curioso.');
  }
});

module.exports = router;
