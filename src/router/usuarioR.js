const express = require('express');
const router = express.Router();
const db = require('../db/conexion');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;

// ==================== CONFIGURACIÓN DE MULTER ====================
const uploadDir = path.join(__dirname, '../public/uploads/avatars');

const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        try {
            await fs.mkdir(uploadDir, { recursive: true });
            cb(null, uploadDir);
        } catch (error) {
            cb(error);
        }
    },
    filename: (req, file, cb) => {
        const uniqueName = `${req.session.user.id_usuario}_${Date.now()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Solo se permiten imágenes JPG, PNG o WEBP'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

const isAuthenticated = (req, res, next) => {
    if (req.session.user) return next();
    res.redirect('/login');
};

// ==================== FUNCIÓN AUXILIAR ====================
async function eliminarAvatarAntiguo(userId) {
    try {
        const [userData] = await db.query(
            'SELECT foto_perfil FROM usuario WHERE id_usuario = ?',
            [userId]
        );

        if (userData.length > 0 && userData[0].foto_perfil) {
            const oldAvatar = userData[0].foto_perfil;
            
            // Solo eliminar si no es URL externa (Google, etc.)
            if (!oldAvatar.startsWith('http') && !oldAvatar.includes('default_avatar')) {
                const oldPath = path.join(__dirname, '../public', oldAvatar);
                await fs.unlink(oldPath).catch(() => {
                    console.log('Avatar anterior no encontrado');
                });
            }
        }
    } catch (error) {
        console.error('Error eliminando avatar antiguo:', error);
    }
}

// =================================================================
// RUTA DE PERFIL
// =================================================================
router.get('/usuario', isAuthenticated, async (req, res) => {
    try {
        const [userData] = await db.query(
            `SELECT id_usuario, username, email, id_tp_usuario, apodo, descripcion, foto_perfil 
             FROM usuario WHERE id_usuario = ?`, 
            [req.session.user.id_usuario]
        );

        if (userData.length === 0) {
            return res.status(404).send('Usuario no encontrado');
        }

        const roles = { 1: 'USUARIO', 2: 'EDITOR', 3: 'ADMIN' };
        const userProfile = {
            ...userData[0],
            role: roles[userData[0].id_tp_usuario] || 'USUARIO',
            avatarUrl: userData[0].foto_perfil || '/media/images/default_avatar.png'
        };

        res.render('usuario', {
            layout: 'main',
            title: 'Perfil de Usuario',
            user: userProfile
        });

    } catch (error) {
        console.error('Error en la consulta:', error);
        res.status(500).send('Error al cargar el perfil');
    }
});

// =================================================================
// RUTAS DE EDICIÓN
// =================================================================
router.get('/usuario/editar', isAuthenticated, async (req, res) => {
    try {
        const [userData] = await db.query(
            `SELECT id_usuario, username, email, id_tp_usuario, apodo, descripcion, foto_perfil 
             FROM usuario WHERE id_usuario = ?`,
            [req.session.user.id_usuario]
        );
        
        if (userData.length === 0) return res.status(404).send('Usuario no encontrado');
        
        const roles = { 1: 'USUARIO', 2: 'EDITOR', 3: 'ADMIN' };
        
        res.render('editarUsuario', {
            layout: 'main',
            title: 'Editar Usuario',
            user: { 
                ...userData[0], 
                role: roles[userData[0].id_tp_usuario] || 'USUARIO',
                avatarUrl: userData[0].foto_perfil || '/media/images/default_avatar.png'
            }
        });
    } catch (error) {
        console.error('Error al cargar la vista de edición:', error);
        res.status(500).send('Error interno del servidor');
    }
});

// ⭐ CAMBIO PRINCIPAL: Ahora usa upload.single('avatar')
router.post('/usuario/editar', isAuthenticated, upload.single('avatar'), async (req, res) => {
    const { email, username, apodo, descripcion } = req.body;
    const userId = req.session.user.id_usuario;
    
    try {
        let avatarPath = null;

        // Si se subió una imagen
        if (req.file) {
            console.log('📸 Imagen recibida:', req.file.filename);

            // Optimizar con Sharp
            const optimizedFilename = `${userId}_${Date.now()}_optimized.webp`;
            const optimizedPath = path.join(uploadDir, optimizedFilename);

            await sharp(req.file.path)
                .resize(400, 400, {
                    fit: 'cover',
                    position: 'center'
                })
                .webp({ quality: 85 })
                .toFile(optimizedPath);

            // Eliminar archivo original
            await fs.unlink(req.file.path);

            // Ruta para guardar en BD
            avatarPath = `/uploads/avatars/${optimizedFilename}`;

            // Eliminar avatar antiguo
            await eliminarAvatarAntiguo(userId);
        }

        // Actualizar base de datos
        let query, values;
        
        if (avatarPath) {
            query = `UPDATE usuario 
                     SET email = ?, username = ?, apodo = ?, descripcion = ?, foto_perfil = ? 
                     WHERE id_usuario = ?`;
            values = [email, username, apodo, descripcion, avatarPath, userId];
        } else {
            query = `UPDATE usuario 
                     SET email = ?, username = ?, apodo = ?, descripcion = ? 
                     WHERE id_usuario = ?`;
            values = [email, username, apodo, descripcion, userId];
        }
        
        await db.query(query, values);
        
        // Actualizar sesión
        req.session.user.email = email;
        req.session.user.username = username;
        req.session.user.apodo = apodo;
        req.session.user.descripcion = descripcion;
        
        if (avatarPath) {
            req.session.user.foto_perfil = avatarPath;
        }
        
        console.log('✅ Perfil actualizado correctamente');
        res.redirect('/usuario');
        
    } catch (error) {
        console.error('Error actualizando perfil:', error);
        res.status(500).send('Error al actualizar el perfil: ' + error.message);
    }
});

// =================================================================
// RUTA DE HISTORIAL GENERAL
// =================================================================
router.get('/usuario/historial', isAuthenticated, async (req, res) => {
    try {
        const id_usuario = req.session.user.id_usuario;
        
        const [historialData] = await db.query(`
            SELECT ue.id_examen, ue.obtenido, ue.maximo, ue.porcentaje, ue.fecha_inicio AS fecha, 
                   m.descripcion AS materia 
            FROM usuario_examen ue 
            LEFT JOIN examen e ON ue.id_examen = e.id_examen 
            LEFT JOIN materias m ON e.id_materia = m.id_materia 
            WHERE ue.id_usuario = ? 
            ORDER BY fecha DESC
        `, [id_usuario]);

        const historial = historialData.map(h => ({
            id_examen: h.id_examen,
            materia: h.materia || 'EXAMEN DE ADMISIÓN',
            puntos: h.obtenido,
            total: h.maximo,
            porcentaje: h.porcentaje,
            fecha: new Date(h.fecha).toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' })
        }));

        res.render('historialUsuario', {
            layout: false,
            title: 'Historial de Exámenes',
            historial
        });
    } catch (error) {
        console.error('Error al cargar el historial:', error);
        res.status(500).send('Error al cargar el historial de exámenes');
    }
});

// =================================================================
// RUTA DE DETALLE DE HISTORIAL
// =================================================================
router.get('/usuario/historial/:id_examen', isAuthenticated, async (req, res) => {
    try {
        const { id_examen } = req.params;
        const id_usuario = req.session.user.id_usuario;

        const [detalles] = await db.query(`
            SELECT ue.id_examen, ue.obtenido, ue.maximo, ue.porcentaje, ue.fecha_inicio AS fecha, 
                   m.descripcion AS materia 
            FROM usuario_examen ue 
            LEFT JOIN examen e ON ue.id_examen = e.id_examen 
            LEFT JOIN materias m ON e.id_materia = m.id_materia 
            WHERE ue.id_usuario = ? AND ue.id_examen = ?
        `, [id_usuario, id_examen]);

        if (detalles.length === 0) {
            return res.status(404).send('Examen no encontrado o no pertenece a este usuario.');
        }
        
        const examenDetalle = {
            ...detalles[0],
            materia: detalles[0].materia || 'EXAMEN DE ADMISIÓN',
            fecha: new Date(detalles[0].fecha).toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' })
        };

        res.render('historialDetalle', {
            layout: 'main',
            title: 'Detalle del Examen',
            examen: examenDetalle
        });
    } catch (error) {
        console.error('Error al cargar el detalle del examen:', error);
        res.status(500).send('Error al cargar el examen');
    }
});

module.exports = router;