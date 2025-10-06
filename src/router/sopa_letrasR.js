const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const pool = require('../db/conexion');

// Ruta para obtener materias (similar al ahorcado)
router.get('/sopa/materias', async (req, res) => {
    try {
        const [materias] = await pool.query(
            `SELECT DISTINCT m.id_materia, m.descripcion
            FROM materias m
            INNER JOIN palabras p ON m.id_materia = p.id_materia;`
        );
        res.json(materias);
    } catch (error) {
        console.error("Error al obtener las materias:", error);
        res.status(500).json([]);
    }
});

// Ruta principal para crear nueva sala
router.get('/sopa', (req, res) => {
    const nuevaSalaId = uuidv4();
    res.redirect(`/sopa-letras/${nuevaSalaId}`);
});

// Ruta para unirse a sala existente
router.get('/sopa/:salaId', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login?returnTo=' + req.originalUrl);
    }
    res.render('sopa-letras', {
        title: 'Sopa de Letras Multijugador',
        layout: "main",
        user: req.session.user,
        salaId: req.params.salaId
    });
});

// Ruta para obtener palabras por categoría
router.get('/sopa/palabras/:idMateria', async (req, res) => {
    try {
        const [palabras] = await pool.query(
            `SELECT palabra, pista FROM palabras 
            WHERE id_materia = ? 
            ORDER BY RAND() LIMIT 10`,
            [req.params.idMateria]
        );
        res.json(palabras.map(p => ({
            word: p.palabra.toUpperCase(),
            hint: p.pista
        })));
    } catch (error) {
        console.error("Error al obtener palabras:", error);
        res.status(500).json([]);
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

router.get('/sopa-letras/:salaId', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login?returnTo=' + req.originalUrl);
  }
  res.render('sopa-letras', {
    title: 'Sopa de Letras Multijugador',
    layout: "main",
    user: req.session.user,
    salaId: req.params.salaId
  });
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

        // Insertar notificación en la base de datos
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

        // Emitir evento de socket para notificación en tiempo real
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

// RUTA: Desafiar a un jugador (crea nueva sala de enfrentamiento de Sopa)
router.post('/enfrentar/:idJugador', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ message: 'No autenticado' });
    }

    try {
        const { idJugador } = req.params;
        const { juego } = req.body;
        const retador = req.session.user.username;
        const idRetador = req.session.user.id_usuario;
        
        // Crear nueva sala para el enfrentamiento
        const nuevaSalaId = uuidv4();

        // Insertar notificación en la base de datos
        await pool.query(
            `INSERT INTO notificaciones (id_usuario_destinatario, id_usuario_remitente, tipo, mensaje, extra_data)
             VALUES (?, ?, 'invitacion', ?, ?)`,
            [
                idJugador,
                idRetador,
                `${retador} te ha desafiado a ${juego}`,
                JSON.stringify({ 
                    salaId: nuevaSalaId, 
                    juego, 
                    modo: 'enfrentamiento'
                })
            ]
        );

        // Emitir evento de socket para notificación en tiempo real
        const io = req.app.get('io');
        if (io) {
            io.emit('notificacion_recibida', { userId: idJugador });
        }

        res.json({ 
            success: true,
            salaId: nuevaSalaId,
            modo: 'enfrentamiento',
            message: 'Desafío enviado exitosamente'
        });
    } catch (error) {
        console.error('Error al enviar desafío:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error al enviar el desafío' 
        });
    }
});

module.exports = router;