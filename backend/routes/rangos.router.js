const express = require('express');
const router = express.Router();
const pool = require('../db/conexion');

const verificarAutenticacion = (req, res, next) => {
    // ✅ Verificar ambas formas de almacenar el ID de usuario
    const userId = req.session?.userId || req.session?.user?.id_usuario;
    
    if (!userId) {
        console.log('[AUTH]: ❌ Usuario no autenticado');
        console.log('[AUTH]: req.session.userId:', req.session?.userId);
        console.log('[AUTH]: req.session.user?.id_usuario:', req.session?.user?.id_usuario);
        return res.status(401).json({ 
            success: false, 
            mensaje: 'Debes iniciar sesión' 
        });
    }
    
    // ✅ Guardar en req para uso posterior
    req.userId = userId;
    next();
};

async function crearNotificacionPromocion(userId, puntos, conn = null) {
    const connection = conn || await pool.getConnection();
    const shouldRelease = !conn;
    
    try {
        let tipoPromocion = null;
        let mensaje = null;
        
        if (puntos >= 2500) {
            tipoPromocion = 'promocion_editor_disponible';
            mensaje = ' ¡Felicidades! Has alcanzado 2,500 puntos. Ya puedes ser Editor';
        }

        if (puntos >= 5000) {
            tipoPromocion = 'promocion_revisor_disponible';
            mensaje = ' ¡Felicidades! Has alcanzado 5,000 puntos. Ya puedes ser Revisor';
        }
        
        if (!tipoPromocion) return;
        
        // Verificar si ya existe una notificación de este tipo sin leer
        const [existente] = await connection.query(`
            SELECT id_notificacion 
            FROM notificaciones 
            WHERE id_usuario_destinatario = ? 
            AND tipo = ? 
            AND leido = FALSE
        `, [userId, tipoPromocion]);
        
        if (existente.length > 0) {
            console.log('[NOTIF PROMOCIÓN]: Ya existe notificación sin leer');
            return;
        }
        
        // ✅ CORRECCIÓN: 4 placeholders = 4 valores
        await connection.query(`
            INSERT INTO notificaciones 
            (id_usuario_destinatario, id_usuario_remitente, tipo, mensaje, leido, fecha_creacion) 
            VALUES (?, ?, ?, ?, FALSE, NOW())
        `, [userId, userId, tipoPromocion, mensaje]);  // ✅ 4 valores: userId, userId, tipo, mensaje
        
        console.log(`[NOTIF PROMOCIÓN]: ✅ Creada para usuario ${userId} - Tipo: ${tipoPromocion}`);
        
        const io = global.io;
        if (io) {
            io.to(userId.toString()).emit('notificacion_recibida');
            console.log(`[NOTIF PROMOCIÓN]: 📡 Socket emitido a usuario ${userId}`);
        }
        
    } catch (error) {
        console.error('[NOTIF PROMOCIÓN ERROR]:', error);
    } finally {
        if (shouldRelease) connection.release();
    }
}

// ✅✅✅ FUNCIÓN CORREGIDA - SIEMPRE CONSULTA PUNTOS TOTALES
async function verificarPromocionDisponible(userId, puntosNuevos = null) {
    try {
        
        // ✅ SIEMPRE consultar los puntos TOTALES actuales del usuario
        const [usuario] = await pool.query(
            'SELECT puntos, id_tp_usuario FROM usuario WHERE id_usuario = ?',
            [userId]
        );
        
        if (usuario.length === 0) {
            return;
        }
        
        const { puntos, id_tp_usuario } = usuario[0];
        
        // ✅ Mapear id_tp_usuario a rol legible
        let rolActual = 'usuario';
        if (id_tp_usuario === 2) rolActual = 'editor';
        else if (id_tp_usuario === 3) rolActual = 'admin';
        else if (id_tp_usuario === 4) rolActual = 'revisor'
        
        
        // Si ya es admin, no hacer nada
        if (id_tp_usuario === 3) {
            return;
        }
        
        // Verificar umbrales CON LOS PUNTOS TOTALES
        let notificacionCreada = false;
        
        if (id_tp_usuario === 1 && puntos >= 5000) {
            await crearNotificacionPromocion(userId, puntos);
            notificacionCreada = true;
        } else if (id_tp_usuario === 2 && puntos >= 5000) {
            await crearNotificacionPromocion(userId, puntos);
            notificacionCreada = true;
        } else {
            const puntosNecesarios = id_tp_usuario === 1 ? 2500 - puntos : 5000 - puntos;
            console.log(`  - Necesita ${puntosNecesarios} puntos más para ${id_tp_usuario === 1 ? 'Editor' : 'Revisor'}`);
        }
        
        if (notificacionCreada) {
        }
        
        console.log(`═══════════════════════════════════════════════════════════\n`);
        
    } catch (error) {
        console.error('\n❌❌❌ [VERIFICAR PROMOCIÓN ERROR] ❌❌❌');
        console.error('Error:', error.message);
        console.error('Stack:', error.stack);
        console.error('═══════════════════════════════════════════════════════════\n');
    }
}

router.get('/verificar-promocion', verificarAutenticacion, async (req, res) => {
    try {
        const userId = req.userId; // ✅ Usar el ID verificado del middleware
        
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
        
        // Mapear id_tp_usuario a rol
        let rolActual = 'usuario';
        if (usuario.id_tp_usuario === 2) rolActual = 'editor';
        else if (usuario.id_tp_usuario === 4) rolActual = 'revisor';

        res.json({ 
            success: true, 
            puntos: usuario.puntos,
            rol_actual: rolActual,
            puede_editor: usuario.puntos >= 2500 && usuario.id_tp_usuario === 1,
            puede_admin: usuario.puntos >= 5000 && usuario.id_tp_usuario !== 4,
            puntos_faltantes_editor: Math.max(0, 2500 - usuario.puntos),
            puntos_faltantes_admin: Math.max(0, 5000 - usuario.puntos)
        });
    } catch (err) {
        console.error('Error al verificar promoción:', err);
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
        
        const userId = req.userId; // ✅ Usar el ID verificado del middleware
        
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

        // Actualizar a editor (id_tp_usuario = 2)
        await connection.query(
            'UPDATE usuario SET id_tp_usuario = 2 WHERE id_usuario = ?',
            [userId]
        );
        
        await connection.query(`
            DELETE FROM notificaciones 
            WHERE id_usuario_destinatario = ? 
            AND tipo = 'promocion_editor_disponible'
        `, [userId]);
        
        await connection.query(`
            INSERT INTO notificaciones 
            (id_usuario_destinatario, id_usuario_remitente, tipo, mensaje, leido, fecha_creacion) 
            VALUES (?, ?, 'promocion_completada', '🎉 ¡Felicidades! Ahora eres Editor', FALSE, NOW())
        `, [userId, userId]);

        await connection.commit();

        // ✅ Actualizar sesión correctamente
        if (req.session.user) {
            req.session.user.id_tp_usuario = 2;
        }
        
        const io = global.io;
        if (io) {
            io.to(userId.toString()).emit('notificacion_recibida');
        }

        res.json({ 
            success: true, 
            mensaje: '¡Felicidades! Has sido promovido a Editor',
            nuevo_rol: 'editor'
        });
    } catch (err) {
        await connection.rollback();
        console.error('Error al promocionar a editor:', err);
        res.status(500).json({ 
            success: false, 
            mensaje: 'Error al procesar la promoción' 
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

        if (usuario.puntos < 5000) {
            await connection.rollback();
            return res.status(400).json({ 
                success: false, 
                mensaje: `Necesitas 5000 puntos. Actualmente tienes: ${usuario.puntos}` 
            });
        }

        if (usuario.id_tp_usuario === 4) {
            await connection.rollback();
            return res.status(400).json({ 
                success: false, 
                mensaje: 'Ya eres revisor' 
            });
        }


        await connection.query(
            'UPDATE usuario SET id_tp_usuario = 4 WHERE id_usuario = ?',
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
            VALUES (?, ?, 'promocion_completada', '🎉 ¡Felicidades! Ahora eres Revisor', FALSE, NOW())
        `, [userId, userId]);

        await connection.commit();

        // ✅ Actualizar sesión correctamente
        if (req.session.user) {
            req.session.user.id_tp_usuario = 3;
        }
        
        const io = global.io;
        if (io) {
            io.to(userId.toString()).emit('notificacion_recibida');
        }

        res.json({ 
            success: true, 
            mensaje: '¡Felicidades! Has sido promovido a Revisor',
            nuevo_rol: 'admin'
        });
    } catch (err) {
        await connection.rollback();
        console.error('Error al promocionar a admin:', err);
        res.status(500).json({ 
            success: false, 
            mensaje: 'Error al procesar la promoción' 
        });
    } finally {
        connection.release();
    }
});

module.exports = router;
module.exports.verificarPromocionDisponible = verificarPromocionDisponible;
module.exports.crearNotificacionPromocion = crearNotificacionPromocion;