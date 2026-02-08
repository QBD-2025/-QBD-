// En tu archivo ahorcadoR.js
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const pool = require('../db/conexion'); // Asegúrate de tener la conexión

// ===================================================================
// ¡NUEVA RUTA API PARA OBTENER LAS MATERIAS DEL AHORCADO!
// ===================================================================
// En ahorcadoR.js

router.get('/ahorcado/materias', async (req, res) => {
    try {
        // En lugar de usar el 'pool' importado, usa el del request
        const [materias] = await req.pool.query(
            `SELECT DISTINCT m.id_materia, m.descripcion
            FROM materias m
            INNER JOIN palabras p ON m.id_materia = p.id_materia;`
        );
        res.json(materias);
    } catch (error) {
        console.error("Error al obtener las materias para el ahorcado:", error);
        res.status(500).json([]);
    }
});

router.get('/ahorcado', (req, res) => {
    const nuevaSalaId = uuidv4();
    res.redirect(`/ahorcado/${nuevaSalaId}`);
});

router.get('/ahorcado/:salaId', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login?returnTo=' + req.originalUrl);
    }
    res.render('ahorcado', {
        title: 'Ahorcado Multijugador',
        layout: "main",
        user: req.session.user,
        salaId: req.params.salaId
    });
});


router.get('/jugadores', async (req, res) => {
    try {
        const [jugador] = await pool.query(
            `SELECT id_usuario AS id, username
            FROM usuario`
        );
        res.json(jugador);
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

        // Insertar notificación en la base de datos con la estructura correcta
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

// RUTA: Desafiar a un jugador (crea nueva sala de enfrentamiento)
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

        // Insertar notificación en la base de datos con la estructura correcta
        await pool.query(
            `INSERT INTO notificaciones (id_usuario_destinatario, id_usuario_remitente, tipo, mensaje, extra_data)
            VALUES (?, ?, 'invitacion', ?, ?)`,
            [
                idJugador,
                idRetador,
                `${retador} te ha desafiado a ${juego}`,
                JSON.stringify({ 
                    salaId: nuevaSalaId + '?modo=enfrentamiento', 
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