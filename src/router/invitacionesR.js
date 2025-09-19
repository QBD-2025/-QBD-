// routes/invitacionesR.js
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
const pool = require('../db/conexion');

// ================================================================
// RUTA GENÉRICA PARA INVITAR A UNA SALA EXISTENTE
// (Gato, Serpientes y Escaleras, Sopa de Letras cooperativo)
// ================================================================
router.post('/invitar/:idJugador', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ message: 'No has iniciado sesión' });
    }

    const { salaId, juego } = req.body; // Recibe la sala actual y el nombre del juego
    const { idJugador } = req.params;
    const { id_usuario: idRemitente, username: usernameRemitente } = req.session.user;

    if (!salaId || !juego) {
        return res.status(400).json({ message: 'Error: Faltan datos en la invitación (salaId o juego).' });
    }

    try {
        await pool.query(
            `INSERT INTO notificaciones (id_usuario_destinatario, id_usuario_remitente, tipo, mensaje, extra_data) VALUES (?, ?, 'invitacion', ?, ?)`,
            [
                idJugador,
                idRemitente,
                `${usernameRemitente} te invita a una partida de ${juego}`,
                JSON.stringify({ salaId, juego }) // Guarda la sala existente
            ]
        );
        
        res.json({ message: 'Invitación enviada ✅' });
    } catch (err) {
        console.error('Error enviando invitación:', err);
        res.status(500).json({ message: 'Error del servidor al enviar la invitación' });
    }
});

// ================================================================
// RUTA GENÉRICA PARA CREAR UNA SALA DE ENFRENTAMIENTO NUEVA
// (Ahorcado, Sopa de Letras enfrentamiento)
// ================================================================
router.post('/enfrentar/:idJugador', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ message: 'No has iniciado sesión' });
    }

    const { juego } = req.body; // Solo necesita saber qué juego es
    const { idJugador } = req.params;
    const { id_usuario: idRemitente, username: usernameRemitente } = req.session.user;

    if (!juego) {
        return res.status(400).json({ message: 'Error: No se especificó el juego para el desafío.' });
    }
    
    // Crea una sala nueva y única para el 1 vs 1
    const salaId = `enfrentamiento_${uuidv4().split('-')[0]}`;

    try {
        await pool.query(
            `INSERT INTO notificaciones (id_usuario_destinatario, id_usuario_remitente, tipo, mensaje, extra_data) VALUES (?, ?, 'invitacion', ?, ?)`,
            [
                idJugador,
                idRemitente,
                `${usernameRemitente} te desafía a un(a) ${juego}!`,
                // Guarda la sala NUEVA con el modo 'enfrentamiento'
                JSON.stringify({
                    salaId: salaId + '?modo=enfrentamiento',
                    juego,
                    modo: 'enfrentamiento'
                })
            ]
        );
        
        // Devuelve la nueva sala al retador para que pueda redirigirse
        res.json({ 
            message: 'Desafío lanzado ⚔️', 
            salaId,
            modo: 'enfrentamiento'
        });
    } catch (err) {
        console.error('Error enviando desafío:', err);
        res.status(500).json({ message: 'Error del servidor al enviar el desafío' });
    }
});


// ================================================================
// RUTA PARA ACEPTAR (SIN CAMBIOS)
// Esta ruta es genérica y funciona para ambos casos.
// ================================================================
// ✅ CORREGIDO: Ruta para Aceptar
router.post('/aceptar/:idNotificacion', async (req, res) => {
    if (!req.session.user) { 
        return res.status(401).json({ success: false, message: 'Debes iniciar sesión' }); 
    }
    const { idNotificacion } = req.params;
    const userId = req.session.user.id_usuario;
    try {
        const [notificaciones] = await pool.query(
            `SELECT * FROM notificaciones WHERE id_notificacion = ? AND id_usuario_destinatario = ?`,
            [idNotificacion, userId]
        );

        if (notificaciones.length === 0) {
            return res.status(404).json({ success: false, message: 'Notificación no encontrada' });
        }
        
        const notificacion = notificaciones[0];
        const extraData = JSON.parse(notificacion.extra_data);
        
        await pool.query("DELETE FROM notificaciones WHERE id_notificacion = ?", [idNotificacion]);
        
        // ✅ RESPUESTA MEJORADA: Devolvemos más datos al frontend
        // para que el cliente decida qué hacer.
        res.json({ 
            success: true, 
            tipo: notificacion.tipo, // Ej: 'desafio_duelo' o 'invitacion'
            id_remitente: notificacion.id_usuario_remitente,
            extra_data: extraData,
            message: 'Notificación procesada' 
        });

    } catch (err) {
        console.error('Error en aceptar notificación:', err);
        res.status(500).json({ success: false, message: 'Error interno al procesar la aceptación' });
    }
});
module.exports = router;