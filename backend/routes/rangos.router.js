const express = require('express');
const router = express.Router();
const pool = require('../db/conexion');

const verificarAutenticacion = (req, res, next) => {
    const userId = req.session?.userId || req.session?.user?.id_usuario;
    
    if (!userId) {
        return res.status(401).json({ 
            success: false, 
            mensaje: 'Debes iniciar sesión' 
        });
    }
    req.userId = userId;
    next();
};

async function crearNotificacionPromocion(userId, puntos, conn = null) {
    const connection = conn || await pool.getConnection();
    const shouldRelease = !conn;
    
    try {
        const [usuario] = await connection.query(
            'SELECT id_tp_usuario FROM usuario WHERE id_usuario = ?',
            [userId]
        );
        
        if (usuario.length === 0) return;
        
        const id_tp_usuario = usuario[0].id_tp_usuario;
        
        let tipoPromocion = null;
        let mensaje = null;
        
        // ✅ LÓGICA CORREGIDA: Permitir notificaciones según el rol actual
        if (puntos >= 5000 && id_tp_usuario === 1) {
            // Usuario normal con 5000+ puntos → puede ser Revisor
            tipoPromocion = 'promocion_revisor_disponible';
            mensaje = 'Felicidades! Has alcanzado 5,000 puntos. Ya puedes ser Revisor';
        } else if (puntos >= 5000 && id_tp_usuario === 2) {
            // ✅ Editor con 5000+ puntos → puede ser Revisor
            tipoPromocion = 'promocion_revisor_disponible';
            mensaje = 'Felicidades! Has alcanzado 5,000 puntos. Ya puedes ser Revisor';
        } else if (puntos >= 2500 && id_tp_usuario === 1) {
            // Usuario normal con 2500+ puntos → puede ser Editor
            tipoPromocion = 'promocion_editor_disponible';
            mensaje = 'Felicidades! Has alcanzado 2,500 puntos. Ya puedes ser Editor';
        } else {
            // Admin (3) o Revisor (4) → no mostrar notificaciones
            return;
        }
        
        if (!tipoPromocion) return;
        
        const [existente] = await connection.query(`
            SELECT id_notificacion 
            FROM notificaciones 
            WHERE id_usuario_destinatario = ? 
            AND tipo = ? 
            AND leido = FALSE
        `, [userId, tipoPromocion]);
        
        if (existente.length > 0) {
            return;
        }
        
        // Si es Editor alcanzando 5000 puntos, eliminar notificación de Editor (ya no la necesita)
        if (tipoPromocion === 'promocion_revisor_disponible' && id_tp_usuario === 2) {
            await connection.query(`
                DELETE FROM notificaciones 
                WHERE id_usuario_destinatario = ? 
                AND tipo = 'promocion_editor_disponible'
            `, [userId]);
        }
        
        // Crear la nueva notificación
        await connection.query(`
            INSERT INTO notificaciones 
            (id_usuario_destinatario, id_usuario_remitente, tipo, mensaje, leido, fecha_creacion) 
            VALUES (?, ?, ?, ?, FALSE, NOW())
        `, [userId, userId, tipoPromocion, mensaje]);
        
        console.log(`[PROMOCIÓN] ✅ Notificación creada: ${tipoPromocion} para usuario ${userId}`);
        
        // Emitir evento de socket si está disponible
        const io = global.io;
        if (io) {
            io.to(userId.toString()).emit('notificacion_recibida');
        }
        
    } catch (error) {
        console.error('Error al crear notificacion de promocion:', error);
    } finally {
        if (shouldRelease) connection.release();
    }
}

async function verificarPromocionDisponible(userId, puntosNuevos = null) {
    try {
        const [usuario] = await pool.query(
            'SELECT puntos, id_tp_usuario FROM usuario WHERE id_usuario = ?',
            [userId]
        );
        
        if (usuario.length === 0) {
            return;
        }
        
        const { puntos, id_tp_usuario } = usuario[0];
        
        let rolActual = 'usuario';
        if (id_tp_usuario === 2) rolActual = 'editor';
        else if (id_tp_usuario === 3) rolActual = 'admin';
        else if (id_tp_usuario === 4) rolActual = 'revisor';
        
        let notificacionCreada = false;
        
        if (puntos >= 2500) {
            await crearNotificacionPromocion(userId, puntos);
            notificacionCreada = true;
        } else if (puntos >= 5000) {
            await crearNotificacionPromocion(userId, puntos);
            notificacionCreada = true;
        } else {
            const puntosNecesarios = 5000 - puntos;
        }
        
        if (notificacionCreada) {
        }
        
    } catch (error) {
    }
}

router.get('/verificar-promocion', verificarAutenticacion, async (req, res) => {
    try {
        const userId = req.userId;
        
        const [rows] = await pool.query(
            'SELECT puntos, id_tp_usuario FROM usuario WHERE id_usuario = ?',
            [userId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                mensaje: 'Usuario no encontrado' 
            });
        }

        const usuario = rows[0];
        
        let rolActual = 'usuario';
        if (usuario.id_tp_usuario === 2) rolActual = 'editor';
        else if (usuario.id_tp_usuario === 3) rolActual = 'admin';
        else if (usuario.id_tp_usuario === 4) rolActual = 'revisor';

        res.json({ 
            success: true, 
            puntos: usuario.puntos,
            rol_actual: rolActual,
            puede_editor: usuario.puntos >= 2500 && usuario.id_tp_usuario === 1,
            puede_revisor: usuario.puntos >= 5000 && usuario.id_tp_usuario === 1,
            puntos_faltantes_editor: Math.max(0, 2500 - usuario.puntos),
            puntos_faltantes_revisor: Math.max(0, 5000 - usuario.puntos)
        });
    } catch (err) {
        console.error('Error al verificar promocion:', err);
        res.status(500).json({ 
            success: false, 
            mensaje: 'Error al verificar estado' 
        });
    }
});

router.post('/promocionar-editor', verificarAutenticacion, async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const userId = req.userId;
        
        const [rows] = await connection.query(
            'SELECT puntos, id_tp_usuario FROM usuario WHERE id_usuario = ?',
            [userId]
        );

        if (rows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ 
                success: false, 
                mensaje: 'Usuario no encontrado' 
            });
        }

        const usuario = rows[0];

        if (usuario.puntos < 2500) {
            await connection.rollback();
            return res.status(400).json({ 
                success: false, 
                mensaje: `Necesitas 2500 puntos. Actualmente tienes: ${usuario.puntos}` 
            });
        }

        if (usuario.id_tp_usuario !== 1) {
            await connection.rollback();
            return res.status(400).json({ 
                success: false, 
                mensaje: 'Ya tienes un rol superior o no puedes ser promovido' 
            });
        }

        await connection.query(
            'UPDATE usuario SET id_tp_usuario = 2 WHERE id_usuario = ?',
            [userId]
        );
        
        await connection.query(`
            DELETE FROM notificaciones 
            WHERE id_usuario_destinatario = ? 
            AND tipo IN ('promocion_editor_disponible', 'promocion_revisor_disponible')
        `, [userId]);
        
        await connection.query(`
            INSERT INTO notificaciones 
            (id_usuario_destinatario, id_usuario_remitente, tipo, mensaje, leido, fecha_creacion) 
            VALUES (?, ?, 'promocion_completada', 'Felicidades! Ahora eres Editor', FALSE, NOW())
        `, [userId, userId]);

        await connection.commit();

        if (req.session.user) {
            req.session.user.id_tp_usuario = 2;
        }
        
        const io = global.io;
        if (io) {
            io.to(userId.toString()).emit('notificacion_recibida');
        }

        res.json({ 
            success: true, 
            mensaje: 'Felicidades! Has sido promovido a Editor',
            nuevo_rol: 'editor'
        });
    } catch (err) {
        await connection.rollback();
        console.error('Error al promocionar a editor:', err);
        res.status(500).json({ 
            success: false, 
            mensaje: 'Error al procesar la promocion' 
        });
    } finally {
        connection.release();
    }
});

router.post('/promocionar-revisor', verificarAutenticacion, async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const userId = req.userId;
        
        const [rows] = await connection.query(
            'SELECT puntos, id_tp_usuario FROM usuario WHERE id_usuario = ?',
            [userId]
        );

        if (rows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ 
                success: false, 
                mensaje: 'Usuario no encontrado' 
            });
        }

        const usuario = rows[0];

        // ✅ Validar puntos mínimos
        if (usuario.puntos < 5000) {
            await connection.rollback();
            return res.status(400).json({ 
                success: false, 
                mensaje: `Necesitas 5000 puntos. Actualmente tienes: ${usuario.puntos}` 
            });
        }

        // ✅ Permitir promoción desde Usuario (1) o Editor (2)
        if (usuario.id_tp_usuario !== 1 && usuario.id_tp_usuario !== 2) {
            await connection.rollback();
            return res.status(400).json({ 
                success: false, 
                mensaje: 'Ya tienes un rol superior o no puedes ser promovido a Revisor' 
            });
        }

        // ✅ Promover a Revisor (tipo 4)
        await connection.query(
            'UPDATE usuario SET id_tp_usuario = 4 WHERE id_usuario = ?',
            [userId]
        );
        
        // ✅ Eliminar todas las notificaciones de promoción anteriores
        await connection.query(`
            DELETE FROM notificaciones 
            WHERE id_usuario_destinatario = ? 
            AND tipo IN ('promocion_editor_disponible', 'promocion_revisor_disponible')
        `, [userId]);
        
        // ✅ Crear notificación de confirmación
        await connection.query(`
            INSERT INTO notificaciones 
            (id_usuario_destinatario, id_usuario_remitente, tipo, mensaje, leido, fecha_creacion) 
            VALUES (?, ?, 'promocion_completada', 'Felicidades! Ahora eres Revisor', FALSE, NOW())
        `, [userId, userId]);

        await connection.commit();

        // ✅ Actualizar sesión
        if (req.session.user) {
            req.session.user.id_tp_usuario = 4;
        }
        
        const io = global.io;
        if (io) {
            io.to(userId.toString()).emit('notificacion_recibida');
        }
        res.json({ 
            success: true, 
            mensaje: 'Felicidades! Has sido promovido a Revisor',
            nuevo_rol: 'revisor'
        });
    } catch (err) {
        await connection.rollback();
        console.error('Error al promocionar a Revisor:', err);
        res.status(500).json({ 
            success: false, 
            mensaje: 'Error al procesar la promocion' 
        });
    } finally {
        connection.release();
    }
});

module.exports = router;
module.exports.verificarPromocionDisponible = verificarPromocionDisponible;
module.exports.crearNotificacionPromocion = crearNotificacionPromocion;