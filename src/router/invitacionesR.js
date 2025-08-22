// routes/invitacionesR.js
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
const pool = require('../db/conexion');

// ----------------------------------------------------------------
// RUTA PARA ENVIAR INVITACIÓN (MODIFICADA)
// ----------------------------------------------------------------
router.post('/invitar/:idJugador', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ message: 'No has iniciado sesión' });
    }

    // 1. Obtenemos el salaId del cuerpo de la petición (enviado desde el cliente)
    const { salaId } = req.body; 
    const { idJugador } = req.params;
    const idRemitente = req.session.user.id_usuario;
    const usernameRemitente = req.session.user.username;

    // 2. Validación: Si el cliente no nos envía un salaId, devolvemos un error.
    if (!salaId) {
        return res.status(400).json({ message: 'Error: No se proporcionó un ID de sala.' });
    }

    // 3. ¡Ya NO creamos un nuevo salaId con uuidv4()! Usamos el que recibimos.

    try {
        await pool.query(
            `INSERT INTO notificaciones 
              (id_usuario_destinatario, id_usuario_remitente, tipo, mensaje, extra_data) 
              VALUES (?, ?, 'invitacion', ?, ?)`,
            [
                idJugador, 
                idRemitente, 
                `${usernameRemitente} te ha invitado a una partida de Ahorcado`, 
                // Guardamos el salaId recibido en la notificación
                JSON.stringify({
                    salaId: salaId,
                    juego: 'ahorcado'
                })
            ]
        );
        
        res.json({ 
            message: 'Invitación enviada ✅', 
            salaId: salaId // Devolvemos el mismo salaId para confirmación
        });
    } catch (err) {
        console.error('Error enviando invitación:', err);
        res.status(500).json({ message: 'Error enviando invitación' });
    }
});
router.post('/invitar_s/:idJugador', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ message: 'No has iniciado sesión' });
    }

    // 1. Obtenemos el salaId del cuerpo de la petición (enviado desde el cliente)
    const { salaId } = req.body; 
    const { idJugador } = req.params;
    const idRemitente = req.session.user.id_usuario;
    const usernameRemitente = req.session.user.username;

    // 2. Validación: Si el cliente no nos envía un salaId, devolvemos un error.
    if (!salaId) {
        return res.status(400).json({ message: 'Error: No se proporcionó un ID de sala.' });
    }

    // 3. ¡Ya NO creamos un nuevo salaId con uuidv4()! Usamos el que recibimos.

    try {
        await pool.query(
            `INSERT INTO notificaciones 
              (id_usuario_destinatario, id_usuario_remitente, tipo, mensaje, extra_data) 
              VALUES (?, ?, 'invitacion', ?, ?)`,
            [
                idJugador, 
                idRemitente, 
                `${usernameRemitente} te ha invitado a una partida de Serpientes y Escaleras`, 
                // Guardamos el salaId recibido en la notificación
                JSON.stringify({
                    salaId: salaId,
                    juego: 'serpientes_escaleras'
                })
            ]
        );
        
        res.json({ 
            message: 'Invitación enviada ✅', 
            salaId: salaId // Devolvemos el mismo salaId para confirmación
        });
    } catch (err) {
        console.error('Error enviando invitación:', err);
        res.status(500).json({ message: 'Error enviando invitación' });
    }
});
// ... (resto del código)
router.post('/invitar_sop/:idJugador', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ message: 'No has iniciado sesión' });
    }

    // 1. Obtenemos el salaId del cuerpo de la petición (enviado desde el cliente)
    const { salaId } = req.body; 
    const { idJugador } = req.params;
    const idRemitente = req.session.user.id_usuario;
    const usernameRemitente = req.session.user.username;

    // 2. Validación: Si el cliente no nos envía un salaId, devolvemos un error.
    if (!salaId) {
        return res.status(400).json({ message: 'Error: No se proporcionó un ID de sala.' });
    }

    // 3. ¡Ya NO creamos un nuevo salaId con uuidv4()! Usamos el que recibimos.

    try {
        await pool.query(
            `INSERT INTO notificaciones 
              (id_usuario_destinatario, id_usuario_remitente, tipo, mensaje, extra_data) 
              VALUES (?, ?, 'invitacion', ?, ?)`,
            [
                idJugador, 
                idRemitente, 
                `${usernameRemitente} te ha invitado a una partida de Sopa de Letras`, 
                // Guardamos el salaId recibido en la notificación
                JSON.stringify({
                    salaId: salaId,
                    juego: 'sopa'
                })
            ]
        );
        
        res.json({ 
            message: 'Invitación enviada ✅', 
            salaId: salaId // Devolvemos el mismo salaId para confirmación
        });
    } catch (err) {
        console.error('Error enviando invitación:', err);
        res.status(500).json({ message: 'Error enviando invitación' });
    }
});
// ----------------------------------------------------------------
// RUTA PARA ENVIAR DESAFÍO (MODO RÁPIDO)
// ----------------------------------------------------------------
router.post('/enfrentar/:idJugador', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ message: 'No has iniciado sesión' });
    }

    const { idJugador } = req.params;
    const idRemitente = req.session.user.id_usuario;
    const usernameRemitente = req.session.user.username;
    
    // 1. Generamos un ID de sala único para este enfrentamiento.
    const salaId = `enfrentamiento_${uuidv4().split('-')[0]}`;

    try {
        await pool.query(
            `INSERT INTO notificaciones 
              (id_usuario_destinatario, id_usuario_remitente, tipo, mensaje, extra_data) 
             VALUES (?, ?, 'invitacion', ?, ?)`, // Usamos el tipo 'invitacion' para que la ruta /aceptar lo maneje
            [
                idJugador, 
                idRemitente, 
                `${usernameRemitente} te ha desafiado a un Ahorcado!`, 
                // 2. ¡La clave está aquí! Guardamos un JSON con el modo de juego.
                JSON.stringify({
                    salaId: salaId + '?modo=enfrentamiento', // Agregamos el modo al final del ID de sala
                    juego: 'ahorcado',
                    modo: 'enfrentamiento' // <--- Este campo es el que lo cambia todo
                })
            ]
        );
        
        // 3. Devolvemos el salaId para que el retador pueda unirse a su lado del juego.
        res.json({ 
            message: 'Desafío lanzado 😈', 
            salaId: salaId,
            modo: 'enfrentamiento' // Devolvemos el modo para que el cliente sepa a dónde ir
        });

    } catch (err) {
        console.error('Error enviando desafío:', err);
        res.status(500).json({ message: 'Error enviando desafío' });
    }
});
router.post('/enfrentar_sop/:idJugador', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ message: 'No has iniciado sesión' });
    }

    const { idJugador } = req.params;
    const idRemitente = req.session.user.id_usuario;
    const usernameRemitente = req.session.user.username;
    
    // 1. Generamos un ID de sala único para este enfrentamiento.
    const salaId = `enfrentamiento_${uuidv4().split('-')[0]}`;

    try {
        await pool.query(
            `INSERT INTO notificaciones 
              (id_usuario_destinatario, id_usuario_remitente, tipo, mensaje, extra_data) 
             VALUES (?, ?, 'invitacion', ?, ?)`, // Usamos el tipo 'invitacion' para que la ruta /aceptar lo maneje
            [
                idJugador, 
                idRemitente, 
                `${usernameRemitente} te ha desafiado a un Sopa de letras viejito!`, 
                // 2. ¡La clave está aquí! Guardamos un JSON con el modo de juego.
                JSON.stringify({
                    salaId: salaId + '?modo=enfrentamiento', // Agregamos el modo al final del ID de sala
                    juego: 'sopa',
                    modo: 'enfrentamiento' // <--- Este campo es el que lo cambia todo
                })
            ]
        );
        
        // 3. Devolvemos el salaId para que el retador pueda unirse a su lado del juego.
        res.json({ 
            message: 'Desafío lanzado 😈', 
            salaId: salaId,
            modo: 'enfrentamiento' // Devolvemos el modo para que el cliente sepa a dónde ir
        });

    } catch (err) {
        console.error('Error enviando desafío:', err);
        res.status(500).json({ message: 'Error enviando desafío' });
    }
});


// ... (Tu ruta /aceptar/:idNotificacion está perfecta, no necesita cambios, 
// ya que leerá el JSON y el nuevo campo 'modo' sin problemas)
// ----------------------------------------------------------------
// RUTA PARA ACEPTAR CUALQUIER NOTIFICACIÓN (INVITACIÓN O DESAFÍO)
// ----------------------------------------------------------------
// routes/invitacionesR.js
// En tu archivo de rutas (invitacionesR.js o notificacionesR.js)

router.post('/aceptar/:idNotificacion', async (req, res) => {
    console.log('Solicitud para aceptar notificación:', req.params.idNotificacion);
    
    if (!req.session.user) {
        console.log('Intento de aceptación sin sesión');
        return res.status(401).json({ 
            success: false,
            message: 'Debes iniciar sesión para aceptar notificaciones' 
        });
    }

    const { idNotificacion } = req.params;
    const userId = req.session.user.id_usuario;

    try {
        // 1. Obtener la notificación con información del remitente
        const [notificaciones] = await pool.query(
            `SELECT n.*, u.username as remitente_username 
            FROM notificaciones n
            JOIN usuario u ON n.id_usuario_remitente = u.id_usuario
            WHERE n.id_notificacion = ? AND n.id_usuario_destinatario = ?`,
            [idNotificacion, userId]
        );

        if (notificaciones.length === 0) {
            console.log('Notificación no encontrada para el usuario:', userId);
            return res.status(404).json({ 
                success: false,
                message: 'Notificación no encontrada o no tienes permiso para aceptarla' 
            });
        }

        const notificacion = notificaciones[0];
        
        // 2. Parsear correctamente el extra_data (manejar tanto JSON como string)
        let extraData;
        try {
            extraData = typeof notificacion.extra_data === 'string' ? 
                JSON.parse(notificacion.extra_data) : 
                notificacion.extra_data;
        } catch (error) {
            console.error('Error parseando extra_data:', notificacion.extra_data);
            return res.status(400).json({ 
                success: false,
                message: 'Formato de notificación inválido' 
            });
        }

        // 3. Eliminar la notificación
        await pool.query(
            "DELETE FROM notificaciones WHERE id_notificacion = ?",
            [idNotificacion]
        );

        // 4. Notificar via Socket.IO si es una invitación a juego
        if (notificacion.tipo === 'invitacion' && extraData.salaId) {
            try {
                // Enviar al destinatario
                req.io.to(userId.toString()).emit('redirigirASala', {
                    salaId: extraData.salaId,
                    juego: extraData.juego || 'ahorcado',
                    modo: extraData.modo || 'cooperativo',
                    remitente: notificacion.remitente_username,
                    categoria: extraData.categoria || 'programacion'
                });

                // Notificar al remitente que su invitación fue aceptada
                req.io.to(notificacion.id_usuario_remitente.toString()).emit('invitacionAceptada', {
                    salaId: extraData.salaId,
                    destinatario: req.session.user.username
                });

                console.log(`Invitación aceptada. Sala: ${extraData.salaId}, Remitente: ${notificacion.id_usuario_remitente}, Destinatario: ${userId}`);
            } catch (socketError) {
                console.error('Error en notificación Socket.IO:', socketError);
                // No fallar la operación solo por error de socket
            }
        }
        res.json({ 
            success: true, 
            salaId: extraData.salaId,
            // 👇 ¡AQUÍ ESTÁ LA LÍNEA CLAVE! 👇
            juego: extraData.juego, // Agregamos el nombre del juego a la respuesta
            message: 'Invitación aceptada con éxito'
        });
    } catch (err) {
        console.error('Error en aceptar notificación:', err);
        res.status(500).json({ 
            success: false,
            message: 'Error interno al procesar la aceptación',
            error: err.message 
        });
    }
});

module.exports = router;