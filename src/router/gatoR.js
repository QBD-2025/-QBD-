// EN: src/router/gatoR.js

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
// Importamos el pool aquí también, como en la corrección anterior.
// ¡ASEGÚRATE DE QUE LA RUTA SEA CORRECTA!
const pool = require('../db/conexion');

// RUTA DE ENTRADA (Sin cambios)
router.get('/gato', (req, res) => {
  const nuevaSalaId = uuidv4();
  res.redirect(`/gato/${nuevaSalaId}`);
});

// ================================================================
// RUTA DE LA SALA (MODIFICADA)
// Ahora esta ruta también cargará las materias.
// ================================================================
router.get('/gato/:salaId', async (req, res) => { // La convertimos en async
  if (!req.session.user) {
    return res.redirect('/login?returnTo=' + req.originalUrl);
  }

  try {
    // 1. Hacemos la misma consulta de materias AQUÍ MISMO.
    const sqlQuery = `
      SELECT DISTINCT m.id_materia, m.descripcion 
      FROM materias m
      INNER JOIN pregunta p ON m.id_materia = p.id_materia
      INNER JOIN respuesta r ON p.id_pregunta = r.id_pregunta
    `;
    const [materias] = await pool.query(sqlQuery);

    console.log(`[Gato Culto] Renderizando sala ${req.params.salaId} con ${materias.length} materias precargadas.`);

    // 2. Pasamos las materias directamente a la vista Handlebars.
    res.render('gato', {
      title: 'Gato Culto Multijugador',
      layout: "main",
      user: req.session.user,
      salaId: req.params.salaId,
      materias: materias // <-- ¡AQUÍ ESTÁ LA MAGIA!
    });

  } catch (error) {
    console.error("Error al cargar la sala de Gato y las materias:", error);
    // Si hay un error, redirigimos a una página de error o al menú
    res.redirect('/minijuegos'); 
  }
});

// ================================================================
// RUTA API (OPCIONAL)
// Ya no la necesitamos, pero la dejamos por si la usas en otro lado.
// Si no la usas, puedes borrarla.
// ================================================================
router.get('/gato/materias', async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ message: 'No autorizado' });
    }
    const [materias] = await pool.query(
      `SELECT DISTINCT m.id_materia, m.descripcion FROM materias m INNER JOIN pregunta p ON m.id_materia = p.id_materia INNER JOIN respuesta r ON p.id_pregunta = r.id_pregunta`
    ); 
    res.json(materias);
  } catch (error) {
    console.error('Error al cargar las materias para Gato (API):', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

router.get('/jugadores', async (req, res) => {
    try {
        const [jugadores] = await pool.query(
            `SELECT id_usuario AS id, username
            FROM usuario`
        );
        res.json(jugadores);
    } catch (error) {
        console.error("Error al obtener jugadores:", error);
        res.status(500).json([]);
    }
});

router.post('/invitar/:idJugador', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ message: 'No autenticado' });
    }

    try {
        const { idJugador } = req.params;
        const { salaId, juego } = req.body;
        const invitador = req.session.user.username;
        const idInvitador = req.session.user.id_usuario;

        await pool.query(
            `INSERT INTO notificaciones (id_usuario_destinatario, id_usuario_remitente, tipo, mensaje, extra_data)
             VALUES (?, ?, 'invitacion', ?, ?)`,
            [
                idJugador,
                idInvitador,
                `${invitador} te ha invitado a jugar ${juego}`,
                JSON.stringify({ salaId, juego })
            ]
        );

        const io = req.app.get('io');
        if (io) {
            io.emit('notificacion_recibida', { userId: idJugador });
        }

        res.json({ 
            success: true, 
            message: 'Invitación enviada exitosamente' 
        });
    } catch (error) {
        console.error('Error al enviar invitación:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error al enviar la invitación' 
        });
    }
});

module.exports = router;