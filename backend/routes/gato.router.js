// EN: src/router/gatoR.js

const express = require('express');
const router  = express.Router();
const { v4: uuidv4 } = require('uuid');
const pool    = require('../db/conexion'); // ajusta la ruta si es necesario

// ================================================================
// RUTA DE ENTRADA
// ================================================================
router.get('/gato', (req, res) => {
  const nuevaSalaId = uuidv4();
  res.redirect(`/gato/${nuevaSalaId}`);
});

// ================================================================
// RUTA DE LA SALA
// Carga la vista con las materias precargadas.
// ================================================================
router.get('/gato/:salaId', async (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login?returnTo=' + req.originalUrl);
  }

  try {
    const sqlQuery = `
      SELECT DISTINCT m.id_materia, m.descripcion
      FROM materias m
      INNER JOIN pregunta p  ON m.id_materia  = p.id_materia
      INNER JOIN respuesta r ON p.id_pregunta = r.id_pregunta
    `;
    const [materias] = await pool.query(sqlQuery);

    console.log(`[Gato Culto] Sala ${req.params.salaId} con ${materias.length} materias.`);

    res.render('gato', {
      title:  'Gato Culto Multijugador',
      layout: 'main',
      user:   req.session.user,
      salaId: req.params.salaId,
      materias,
    });
  } catch (error) {
    console.error('Error al cargar la sala de Gato:', error);
    res.redirect('/minijuegos');
  }
});

// ================================================================
// API: MATERIAS (opcional, por si se usa en otro lugar)
// ================================================================
router.get('/gato/materias', async (req, res) => {
  if (!req.session.user) return res.status(401).json({ message: 'No autorizado' });
  try {
    const [materias] = await pool.query(`
      SELECT DISTINCT m.id_materia, m.descripcion
      FROM materias m
      INNER JOIN pregunta p  ON m.id_materia  = p.id_materia
      INNER JOIN respuesta r ON p.id_pregunta = r.id_pregunta
    `);
    res.json(materias);
  } catch (error) {
    console.error('Error al cargar materias (API):', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

// ================================================================
// API: TODOS LOS JUGADORES (para la lista "Jugadores Activos")
// ================================================================
router.get('/jugadores', async (req, res) => {
  try {
    const [jugadores] = await pool.query(
      `SELECT id_usuario AS id, username, puntos
       FROM usuario
       ORDER BY username ASC`
    );
    res.json(jugadores);
  } catch (error) {
    console.error('Error al obtener jugadores:', error);
    res.status(500).json([]);
  }
});

// ================================================================
// API: RANKING GLOBAL (ordenado por puntos, mayor a menor)
// ================================================================
router.get('/jugadoress/ranking', async (req, res) => {
  if (!req.session.user) return res.status(401).json({ message: 'No autorizado' });
  try {
    const [jugadores] = await pool.query(
      `SELECT id_usuario AS id, username, puntos
       FROM usuario
       ORDER BY puntos DESC
       LIMIT 50`
    );
    res.json(jugadores);
  } catch (error) {
    console.error('Error al obtener ranking:', error);
    res.status(500).json([]);
  }
});

// ================================================================
// API: AMIGOS DEL USUARIO ACTUAL
// Retorna la lista de amigos aceptados del usuario en sesión.
// ================================================================
router.get('/amigos', async (req, res) => {
  if (!req.session.user) return res.status(401).json({ message: 'No autorizado' });

  const idUsuario = req.session.user.id_usuario;

  try {
    // Un amigo puede ser el solicitante O el receptor de la amistad,
    // siempre que el estado sea 'aceptado'.
    const [amigos] = await pool.query(
      `SELECT
         u.id_usuario AS id,
         u.username,
         u.puntos
       FROM amistades a
       INNER JOIN usuario u
         ON u.id_usuario = CASE
              WHEN a.id_solicitante = ? THEN a.id_receptor
              ELSE a.id_solicitante
            END
       WHERE (a.id_solicitante = ? OR a.id_receptor = ?)
         AND a.estado = 'aceptado'
       ORDER BY u.username ASC`,
      [idUsuario, idUsuario, idUsuario]
    );
    res.json(amigos);
  } catch (error) {
    console.error('Error al obtener amigos:', error);
    res.status(500).json([]);
  }
});

// ================================================================
// API: ENVIAR INVITACIÓN A PARTIDA
// ================================================================
router.post('/invitar/:idJugador', async (req, res) => {
  if (!req.session.user) return res.status(401).json({ message: 'No autenticado' });

  try {
    const { idJugador }       = req.params;
    const { salaId, juego }   = req.body;
    const invitador           = req.session.user.username;
    const idInvitador         = req.session.user.id_usuario;

    await pool.query(
      `INSERT INTO notificaciones
         (id_usuario_destinatario, id_usuario_remitente, tipo, mensaje, extra_data)
       VALUES (?, ?, 'invitacion', ?, ?)`,
      [
        idJugador,
        idInvitador,
        `${invitador} te ha invitado a jugar ${juego}`,
        JSON.stringify({ salaId, juego }),
      ]
    );

    const io = req.app.get('io');
    if (io) io.emit('notificacion_recibida', { userId: idJugador });

    res.json({ success: true, message: 'Invitación enviada exitosamente' });
  } catch (error) {
    console.error('Error al enviar invitación:', error);
    res.status(500).json({ success: false, message: 'Error al enviar la invitación' });
  }
});

module.exports = router;