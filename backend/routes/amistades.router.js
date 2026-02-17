// =============================================
// 🤝 ROUTER DE AMISTADES - QBD
// backend/routes/amistades.router.js
// =============================================

const express = require('express');
const router = express.Router();
const pool = require('../db/conexion');

// Días de espera para reenviar solicitud tras un rechazo
const DIAS_REENVIO = 7;

// ─────────────────────────────────────────────
// 🛡️ MIDDLEWARE DE AUTENTICACIÓN
// ─────────────────────────────────────────────
function requireAuth(req, res, next) {
    if (!req.session?.user) {
        return res.status(401).json({ success: false, message: 'No autorizado' });
    }
    next();
}

// ─────────────────────────────────────────────
// 🔍 HELPER: obtener estado de amistad entre dos usuarios
// Retorna: null | { id_amistad, estado, soy_solicitante, puede_reenviar_desde }
// ─────────────────────────────────────────────
async function obtenerEstadoAmistad(idUsuario, idOtro) {
    const [rows] = await pool.query(`
        SELECT 
            id_amistad,
            estado,
            id_solicitante,
            puede_reenviar_desde
        FROM amistades
        WHERE (id_solicitante = ? AND id_receptor = ?)
           OR (id_solicitante = ? AND id_receptor = ?)
        LIMIT 1
    `, [idUsuario, idOtro, idOtro, idUsuario]);

    if (rows.length === 0) return null;

    return {
        id_amistad: rows[0].id_amistad,
        estado: rows[0].estado,
        soy_solicitante: rows[0].id_solicitante === idUsuario,
        puede_reenviar_desde: rows[0].puede_reenviar_desde
    };
}

// =============================================
// 📤 POST /amistades/solicitar/:idReceptor
// Enviar solicitud de amistad
// =============================================
router.post('/amistades/solicitar/:idReceptor', requireAuth, async (req, res) => {
    const idSolicitante = req.session.user.id_usuario;
    const idReceptor = parseInt(req.params.idReceptor);

    if (idSolicitante === idReceptor) {
        return res.status(400).json({ success: false, message: 'No puedes enviarte una solicitud a ti mismo' });
    }

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // 1. Verificar que el receptor existe
        const [receptor] = await conn.query(
            'SELECT id_usuario, username FROM usuario WHERE id_usuario = ?',
            [idReceptor]
        );
        if (receptor.length === 0) {
            await conn.rollback();
            return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
        }

        // 2. Verificar estado actual de la relación
        const relacion = await obtenerEstadoAmistad(idSolicitante, idReceptor);

        if (relacion) {
            if (relacion.estado === 'aceptado') {
                await conn.rollback();
                return res.status(409).json({ success: false, message: 'Ya son amigos' });
            }

            if (relacion.estado === 'pendiente') {
                await conn.rollback();
                return res.status(409).json({ success: false, message: 'Ya existe una solicitud pendiente' });
            }

            if (relacion.estado === 'rechazado') {
                // Verificar si ya pasaron los días de espera
                if (relacion.puede_reenviar_desde && new Date() < new Date(relacion.puede_reenviar_desde)) {
                    const diasRestantes = Math.ceil(
                        (new Date(relacion.puede_reenviar_desde) - new Date()) / (1000 * 60 * 60 * 24)
                    );
                    await conn.rollback();
                    return res.status(429).json({
                        success: false,
                        message: `Puedes reenviar la solicitud en ${diasRestantes} día(s)`
                    });
                }

                // Reenvío permitido: actualizar registro existente
                await conn.query(`
                    UPDATE amistades
                    SET estado = 'pendiente',
                        id_solicitante = ?,
                        id_receptor = ?,
                        fecha_solicitud = NOW(),
                        fecha_respuesta = NULL,
                        puede_reenviar_desde = NULL
                    WHERE id_amistad = ?
                `, [idSolicitante, idReceptor, relacion.id_amistad]);
            }
        } else {
            // Insertar nueva solicitud
            await conn.query(`
                INSERT INTO amistades (id_solicitante, id_receptor, estado)
                VALUES (?, ?, 'pendiente')
            `, [idSolicitante, idReceptor]);
        }

        // 3. Limpiar notificaciones anteriores de solicitud entre estos dos
        await conn.query(`
            DELETE FROM notificaciones
            WHERE tipo = 'solicitud_amistad'
              AND id_usuario_remitente = ?
              AND id_usuario_destinatario = ?
        `, [idSolicitante, idReceptor]);

        // 4. Crear notificación para el receptor
        const solicitante = req.session.user;
        await conn.query(`
            INSERT INTO notificaciones 
                (id_usuario_destinatario, id_usuario_remitente, tipo, mensaje, extra_data)
            VALUES (?, ?, 'solicitud_amistad', ?, ?)
        `, [
            idReceptor,
            idSolicitante,
            `${solicitante.username} te envió una solicitud de amistad`,
            JSON.stringify({ id_solicitante: idSolicitante, username: solicitante.username })
        ]);

        await conn.commit();

        // 5. Emitir socket al receptor
        const io = req.app.get('io');
        if (io) {
            io.to(idReceptor.toString()).emit('notificacion_recibida');
        }

        return res.json({
            success: true,
            message: `Solicitud enviada a ${receptor[0].username}`
        });

    } catch (error) {
        await conn.rollback();
        console.error('❌ [AMISTADES] Error al enviar solicitud:', error);
        return res.status(500).json({ success: false, message: 'Error interno del servidor' });
    } finally {
        conn.release();
    }
});

// =============================================
// ✅ POST /amistades/aceptar/:idNotificacion
// Aceptar solicitud de amistad (desde notificación)
// =============================================
router.post('/amistades/aceptar/:idNotificacion', requireAuth, async (req, res) => {
    const idReceptor = req.session.user.id_usuario;
    const idNotificacion = parseInt(req.params.idNotificacion);

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // 1. Obtener la notificación
        const [notifs] = await conn.query(`
            SELECT * FROM notificaciones
            WHERE id_notificacion = ?
              AND id_usuario_destinatario = ?
              AND tipo = 'solicitud_amistad'
        `, [idNotificacion, idReceptor]);

        if (notifs.length === 0) {
            await conn.rollback();
            return res.status(404).json({ success: false, message: 'Solicitud no encontrada' });
        }

        const notif = notifs[0];
        const idSolicitante = notif.id_usuario_remitente;

        // 2. Actualizar estado en tabla amistades
        const [updateResult] = await conn.query(`
            UPDATE amistades
            SET estado = 'aceptado', fecha_respuesta = NOW()
            WHERE id_solicitante = ? AND id_receptor = ? AND estado = 'pendiente'
        `, [idSolicitante, idReceptor]);

        if (updateResult.affectedRows === 0) {
            await conn.rollback();
            return res.status(404).json({ success: false, message: 'Solicitud de amistad no encontrada o ya procesada' });
        }

        // 3. Eliminar notificación original
        await conn.query('DELETE FROM notificaciones WHERE id_notificacion = ?', [idNotificacion]);

        // 4. Notificar al solicitante que fue aceptado
        const receptorUsername = req.session.user.username;
        await conn.query(`
            INSERT INTO notificaciones 
                (id_usuario_destinatario, id_usuario_remitente, tipo, mensaje, extra_data)
            VALUES (?, ?, 'amistad_aceptada', ?, ?)
        `, [
            idSolicitante,
            idReceptor,
            `${receptorUsername} aceptó tu solicitud de amistad 🎉`,
            JSON.stringify({ id_amigo: idReceptor, username: receptorUsername })
        ]);

        await conn.commit();

        // 5. Emitir sockets
        const io = req.app.get('io');
        if (io) {
            io.to(idSolicitante.toString()).emit('notificacion_recibida');
            io.to(idReceptor.toString()).emit('amistad_actualizada');
        }

        return res.json({
            success: true,
            tipo: 'solicitud_amistad',
            message: `¡Ahora son amigos!`
        });

    } catch (error) {
        await conn.rollback();
        console.error('❌ [AMISTADES] Error al aceptar solicitud:', error);
        return res.status(500).json({ success: false, message: 'Error interno del servidor' });
    } finally {
        conn.release();
    }
});

// =============================================
// ❌ POST /amistades/rechazar/:idNotificacion
// Rechazar solicitud de amistad (desde notificación)
// =============================================
router.post('/amistades/rechazar/:idNotificacion', requireAuth, async (req, res) => {
    const idReceptor = req.session.user.id_usuario;
    const idNotificacion = parseInt(req.params.idNotificacion);

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // 1. Obtener la notificación
        const [notifs] = await conn.query(`
            SELECT * FROM notificaciones
            WHERE id_notificacion = ?
              AND id_usuario_destinatario = ?
              AND tipo = 'solicitud_amistad'
        `, [idNotificacion, idReceptor]);

        if (notifs.length === 0) {
            await conn.rollback();
            return res.status(404).json({ success: false, message: 'Solicitud no encontrada' });
        }

        const idSolicitante = notifs[0].id_usuario_remitente;

        // 2. Actualizar estado a rechazado + fijar fecha de reenvío
        await conn.query(`
            UPDATE amistades
            SET 
                estado = 'rechazado',
                fecha_respuesta = NOW(),
                puede_reenviar_desde = DATE_ADD(NOW(), INTERVAL ? DAY)
            WHERE id_solicitante = ? AND id_receptor = ? AND estado = 'pendiente'
        `, [DIAS_REENVIO, idSolicitante, idReceptor]);

        // 3. Eliminar notificación (el solicitante NO se entera del rechazo)
        await conn.query('DELETE FROM notificaciones WHERE id_notificacion = ?', [idNotificacion]);

        await conn.commit();

        return res.json({
            success: true,
            message: 'Solicitud rechazada'
        });

    } catch (error) {
        await conn.rollback();
        console.error('❌ [AMISTADES] Error al rechazar solicitud:', error);
        return res.status(500).json({ success: false, message: 'Error interno del servidor' });
    } finally {
        conn.release();
    }
});

// =============================================
// 🗑️ DELETE /amistades/eliminar/:idAmigo
// Eliminar amistad existente
// =============================================
router.delete('/amistades/eliminar/:idAmigo', requireAuth, async (req, res) => {
    const idUsuario = req.session.user.id_usuario;
    const idAmigo = parseInt(req.params.idAmigo);

    try {
        const [result] = await pool.query(`
            DELETE FROM amistades
            WHERE estado = 'aceptado'
              AND (
                (id_solicitante = ? AND id_receptor = ?)
                OR
                (id_solicitante = ? AND id_receptor = ?)
              )
        `, [idUsuario, idAmigo, idAmigo, idUsuario]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Amistad no encontrada' });
        }

        return res.json({ success: true, message: 'Amistad eliminada' });

    } catch (error) {
        console.error('❌ [AMISTADES] Error al eliminar amistad:', error);
        return res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

// =============================================
// 🔍 GET /api/amistades/estado/:idOtro
// Consultar estado de amistad con un usuario específico
// Usado por el ranking para saber qué botón mostrar
// =============================================
router.get('/api/amistades/estado/:idOtro', requireAuth, async (req, res) => {
    const idUsuario = req.session.user.id_usuario;
    const idOtro = parseInt(req.params.idOtro);

    try {
        const relacion = await obtenerEstadoAmistad(idUsuario, idOtro);

        if (!relacion) {
            return res.json({ estado: 'ninguno', puede_enviar: true });
        }

        let puedeEnviar = false;
        let diasRestantes = null;

        if (relacion.estado === 'rechazado') {
            if (!relacion.puede_reenviar_desde || new Date() >= new Date(relacion.puede_reenviar_desde)) {
                puedeEnviar = true;
            } else {
                diasRestantes = Math.ceil(
                    (new Date(relacion.puede_reenviar_desde) - new Date()) / (1000 * 60 * 60 * 24)
                );
            }
        }

        return res.json({
            estado: relacion.estado,
            soy_solicitante: relacion.soy_solicitante,
            puede_enviar: puedeEnviar,
            dias_restantes: diasRestantes
        });

    } catch (error) {
        console.error('❌ [AMISTADES] Error al consultar estado:', error);
        return res.status(500).json({ error: 'Error interno' });
    }
});

// =============================================
// 📋 GET /api/amistades/mis-amigos
// Obtener lista de amigos del usuario actual
// =============================================
router.get('/api/amistades/mis-amigos', requireAuth, async (req, res) => {
    const idUsuario = req.session.user.id_usuario;

    try {
        const [amigos] = await pool.query(`
            SELECT 
                u.id_usuario,
                u.username,
                u.foto_perfil,
                u.puntos,
                a.fecha_respuesta AS fecha_amistad
            FROM amistades a
            INNER JOIN usuario u ON (
                CASE 
                    WHEN a.id_solicitante = ? THEN a.id_receptor
                    ELSE a.id_solicitante
                END = u.id_usuario
            )
            WHERE (a.id_solicitante = ? OR a.id_receptor = ?)
              AND a.estado = 'aceptado'
            ORDER BY u.username ASC
        `, [idUsuario, idUsuario, idUsuario]);

        return res.json({ amigos });

    } catch (error) {
        console.error('❌ [AMISTADES] Error al obtener amigos:', error);
        return res.status(500).json({ error: 'Error al obtener amigos' });
    }
});

// =============================================
// 📊 GET /api/amistades/estados-bulk
// Consultar estado de amistad con múltiples usuarios a la vez
// Usado al renderizar el ranking completo (una sola petición)
// Body: { ids: [1, 2, 3, ...] }
// =============================================
router.post('/api/amistades/estados-bulk', requireAuth, async (req, res) => {
    const idUsuario = req.session.user.id_usuario;
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
        return res.json({ estados: {} });
    }

    try {
        const [rows] = await pool.query(`
            SELECT 
                id_solicitante,
                id_receptor,
                estado,
                puede_reenviar_desde
            FROM amistades
            WHERE (id_solicitante = ? AND id_receptor IN (?))
               OR (id_receptor = ? AND id_solicitante IN (?))
        `, [idUsuario, ids, idUsuario, ids]);

        // Construir mapa: { id_otro_usuario: { estado, soy_solicitante, puede_enviar } }
        const estados = {};
        rows.forEach(row => {
            const idOtro = row.id_solicitante === idUsuario ? row.id_receptor : row.id_solicitante;
            const soyYoSolicitante = row.id_solicitante === idUsuario;

            let puedeEnviar = false;
            let diasRestantes = null;

            if (row.estado === 'rechazado') {
                if (!row.puede_reenviar_desde || new Date() >= new Date(row.puede_reenviar_desde)) {
                    puedeEnviar = true;
                } else {
                    diasRestantes = Math.ceil(
                        (new Date(row.puede_reenviar_desde) - new Date()) / (1000 * 60 * 60 * 24)
                    );
                }
            }

            estados[idOtro] = {
                estado: row.estado,
                soy_solicitante: soyYoSolicitante,
                puede_enviar: puedeEnviar,
                dias_restantes: diasRestantes
            };
        });

        return res.json({ estados });

    } catch (error) {
        console.error('❌ [AMISTADES] Error bulk estados:', error);
        return res.status(500).json({ error: 'Error interno' });
    }
});

module.exports = router;