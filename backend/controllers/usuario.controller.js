// backend/controllers/usuario.controller.js

const db = require('../db/conexion');
const queries = require('../queries/usuario.queries');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;

// ==================== CONFIGURACIÓN DE MULTER ====================

// Carpeta donde se guardarán los avatares subidos
const uploadDir = path.join(__dirname, '../public/uploads/avatars');

// Configuración de almacenamiento de multer
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      await fs.mkdir(uploadDir, { recursive: true }); // Crear carpeta si no existe
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    // Nombre único con id_usuario y timestamp
    const uniqueName = `${req.session.user.id_usuario}_${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// Filtro de tipos de archivos permitidos
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Solo se permiten imágenes JPG, PNG o WEBP'), false);
};

// Límite de tamaño y configuración completa de multer
const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

// ==================== FUNCIONES ====================

// Eliminar avatar antiguo del usuario
async function eliminarAvatarAntiguo(userId) {
  try {
    const [userData] = await db.query(queries.getUsuarioById, [userId]);
    if (userData.length > 0 && userData[0].foto_perfil) {
      const oldAvatar = userData[0].foto_perfil;
      // Evitar borrar avatares externos o el por defecto
      if (!oldAvatar.startsWith('http') && !oldAvatar.includes('default_avatar')) {
        const oldPath = path.join(__dirname, '../public', oldAvatar);
        await fs.unlink(oldPath).catch(() => console.log('Avatar anterior no encontrado'));
      }
    }
  } catch (error) {
    console.error('Error eliminando avatar antiguo:', error);
  }
}

// Ver perfil del usuario
async function verPerfil(req, res) {
  try {
    const [userData] = await db.query(queries.getUsuarioById, [req.session.user.id_usuario]);
    if (userData.length === 0) return res.status(404).send('Usuario no encontrado');

    const roles = { 1: 'USUARIO', 2: 'EDITOR', 3: 'ADMIN' };
    const userProfile = {
      ...userData[0],
      role: roles[userData[0].id_tp_usuario] || 'USUARIO',
      avatarUrl: userData[0].foto_perfil || '/media/uploads/default_avatar.png'
    };

    res.render('usuario', { layout: 'main', title: 'Perfil de Usuario', user: userProfile });
  } catch (error) {
    console.error('Error en la consulta:', error);
    res.status(500).send('Error al cargar el perfil');
  }
}

// Vista para editar usuario
async function vistaEditarUsuario(req, res) {
  try {
    const [userData] = await db.query(queries.getUsuarioById, [req.session.user.id_usuario]);
    if (userData.length === 0) return res.status(404).send('Usuario no encontrado');

    const roles = { 1: 'USUARIO', 2: 'EDITOR', 3: 'ADMIN' };
    res.render('editarUsuario', {
      layout: 'main',
      title: 'Editar Usuario',
      user: {
        ...userData[0],
        role: roles[userData[0].id_tp_usuario] || 'USUARIO',
        avatarUrl: userData[0].foto_perfil || '/uploads/default_avatar.png'
      }
    });
  } catch (error) {
    console.error('Error al cargar la vista de edición:', error);
    res.status(500).send('Error interno del servidor');
  }
}

// Editar usuario
async function editarUsuario(req, res) {
  const { email, username, apodo, descripcion } = req.body;
  const userId = req.session.user.id_usuario;

  try {
    let avatarPath = null;

    // Procesar imagen si se subió
    if (req.file) {
      const optimizedFilename = `${userId}_${Date.now()}_optimized.webp`;
      const optimizedPath = path.join(uploadDir, optimizedFilename);

      await sharp(req.file.path)
        .resize(400, 400, { fit: 'cover', position: 'center' })
        .webp({ quality: 85 })
        .toFile(optimizedPath);

      await fs.unlink(req.file.path); // borrar imagen original
      avatarPath = `/uploads/avatars/${optimizedFilename}`;
      await eliminarAvatarAntiguo(userId); // borrar avatar previo
    }

    // Actualizar base de datos
    if (avatarPath) {
      await db.query(queries.updateUsuarioConAvatar, [email, username, apodo, descripcion, avatarPath, userId]);
      req.session.user.foto_perfil = avatarPath;
    } else {
      await db.query(queries.updateUsuario, [email, username, apodo, descripcion, userId]);
    }

    // Actualizar sesión
    req.session.user.email = email;
    req.session.user.username = username;
    req.session.user.apodo = apodo;
    req.session.user.descripcion = descripcion;

    res.redirect('/usuario');
  } catch (error) {
    console.error('Error actualizando perfil:', error);
    res.status(500).send('Error al actualizar el perfil: ' + error.message);
  }
}

// Ver historial de exámenes del usuario
async function verHistorial(req, res) {
  try {
    const id_usuario = req.session.user.id_usuario;
    const [historialData] = await db.query(queries.getHistorialExamenes, [id_usuario]);

    const historial = historialData.map(h => ({
      id_examen: h.id_examen,
      materia: h.materia || 'EXAMEN DE ADMISIÓN',
      puntos: h.obtenido,
      total: h.maximo,
      porcentaje: h.porcentaje,
      fecha: new Date(h.fecha).toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' })
    }));

    res.render('historialUsuario', { layout: false, title: 'Historial de Exámenes', historial });
  } catch (error) {
    console.error('Error al cargar el historial:', error);
    res.status(500).send('Error al cargar el historial de exámenes');
  }
}

// Ver detalle de un examen específico
async function verDetalleExamen(req, res) {
  try {
    const { id_examen } = req.params;
    const id_usuario = req.session.user.id_usuario;

    const [detalles] = await db.query(queries.getDetalleExamen, [id_usuario, id_examen]);
    if (detalles.length === 0) return res.status(404).send('Examen no encontrado o no pertenece a este usuario.');

    const examenDetalle = {
      ...detalles[0],
      materia: detalles[0].materia || 'EXAMEN DE ADMISIÓN',
      fecha: new Date(detalles[0].fecha).toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' })
    };

    res.render('historialDetalle', { layout: 'main', title: 'Detalle del Examen', examen: examenDetalle });
  } catch (error) {
    console.error('Error al cargar el detalle del examen:', error);
    res.status(500).send('Error al cargar el examen');
  }
}

// ==================== EXPORTACIÓN ====================
module.exports = {
  verPerfil,
  vistaEditarUsuario,
  editarUsuario,
  verHistorial,
  verDetalleExamen,
  upload // exportamos también multer si quieres usarlo desde las rutas
};
