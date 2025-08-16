// routes/invitacionesR.js
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// Enviar invitación con salaId
router.post('/enfrentar/:idJugador', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ message: 'No has iniciado sesión' });
    }

    const { idJugador } = req.params;
    const idRemitente = req.session.user.id_usuario;
    const usernameRemitente = req.session.user.username;
    const salaId = uuidv4(); // Genera sala única

    try {
        await req.pool.query(
            `INSERT INTO notificaciones 
             (id_usuario_destinatario, id_usuario_remitente, tipo, mensaje, extra_data) 
             VALUES (?, ?, 'invitacion', ?, ?)`,
            [idJugador, idRemitente, `${usernameRemitente} te ha desafiado a una partida rapida`, salaId]
        );

        res.json({ message: 'Desafio lanzado 😈', salaId });
    } catch (err) {
        console.error('Error enviando desafio:', err);
        res.status(500).json({ message: 'Error enviando desafio' });
    }
});

// Aceptar invitación y devolver salaId
router.post('/aceptar/:idNotificacion', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ message: 'No has iniciado sesión' });
    }

    const idNotificacion = req.params.idNotificacion;

    try {
        const [rows] = await req.pool.query(
            "SELECT extra_data FROM notificaciones WHERE id_notificacion = ?",
            [idNotificacion]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Desafio no encontrado' });
        }

        const salaId = rows[0].extra_data;

        await req.pool.query(
            "DELETE FROM notificaciones WHERE id_notificacion = ?",
            [idNotificacion]
        );

        res.json({ success: true, salaId });
    } catch (err) {
        console.error('Error aceptando invitación:', err);
        res.status(500).json({ message: 'Error aceptando invitación' });
    }
});

module.exports = router;
