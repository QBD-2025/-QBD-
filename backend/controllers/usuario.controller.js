// backend/controllers/usuario.controller.js

const db = require('../db/conexion');
const queries = require('../queries/usuario.queries');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;

// ==================== CONFIGURACIÓN DE MULTER ====================

// Carpeta donde se guardarán los avatares subidos
const uploadDir = path.join(__dirname, '../../frontend/media/uploads');

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
        const oldPath = path.join(__dirname, '/uploads', oldAvatar);
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

    let avatarUrl=userData[0].foto_perfil || '/uploads/default_avatar.png'

    if (avatarUrl && !avatarUrl.startsWith('/') && !avatarUrl.startsWith('http')) {
      avatarUrl='/uploads/${avatarUrl}';
    }

    const userProfile = {
      ...userData[0],
      role: roles[userData[0].id_tp_usuario] || 'USUARIO',
      avatarUrl: userData[0].foto_perfil || '/uploads/default_avatar.png',
      foto_perfil:avatarUrl
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

    let avatarUrl=userData[0].foto_perfil || '/uploads/default_avatar.png'

    if (avatarUrl && !avatarUrl.startsWith('/') && !avatarUrl.startsWith('http')) {
      avatarUrl = `/uploads/${avatarUrl}`;
    }

    res.render('editarUsuario', {
      layout: 'main',
      title: 'Editar Usuario',
      user: {
        ...userData[0],
        role: roles[userData[0].id_tp_usuario] || 'USUARIO',
        avatarUrl: userData[0].foto_perfil || '/uploads/default_avatar.png',
        foto_perfil: avatarUrl
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
      avatarPath = `/uploads/${optimizedFilename}`;
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
async function verDetalleExamen(req, res) {
  try {
    const { id_examen } = req.params;
    const id_usuario = req.session.user.id_usuario;

    // 1️⃣ OBTENER DATOS GENERALES DEL EXAMEN
    const [detalles] = await db.query(queries.getDetalleExamen, [id_usuario, id_examen]);
    if (detalles.length === 0) {
      return res.status(404).send('Examen no encontrado o no pertenece a este usuario.');
    }

    const examenDetalle = {
      ...detalles[0],
      materia: detalles[0].materia || 'EXAMEN DE ADMISIÓN',
      fecha: new Date(detalles[0].fecha).toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' })
    };

    // 2️⃣ OBTENER LAS PREGUNTAS Y RESPUESTAS DEL HISTORIAL
    const [historial] = await db.query(`
      SELECT h.id_pregunta, h.id_respuesta AS id_respuesta_usuario, h.puntos
      FROM historial h
      WHERE h.id_examen = ? AND h.id_usuario = ?
      ORDER BY h.id_pregunta
    `, [id_examen, id_usuario]);

    console.log('📊 Historial encontrado:', historial.length, 'registros');

    // 3️⃣ CONSTRUIR ARRAY DE PREGUNTAS CON DETALLES
    const preguntas = [];
    
    for (const h of historial) {
      // Obtener texto de la pregunta
      const [preguntaRow] = await db.query(
        'SELECT pregunta, retroalimentacion FROM pregunta WHERE id_pregunta = ?',
        [h.id_pregunta]
      );

      if (preguntaRow.length === 0) continue;

      // Obtener todas las respuestas de esta pregunta
      const [respuestas] = await db.query(`
        SELECT id_respuesta, respuesta, correcta
        FROM respuesta
        WHERE id_pregunta = ?
      `, [h.id_pregunta]);

      const correcta = respuestas.find(r => r.correcta === 1);
      const seleccionada = respuestas.find(r => r.id_respuesta === h.id_respuesta_usuario);

      preguntas.push({
        pregunta: preguntaRow[0].pregunta,
        retroalimentacion: preguntaRow[0].retroalimentacion,
        textoSeleccionado: seleccionada?.respuesta || "No respondió",
        esCorrecta: h.puntos === 1,
        textoCorrecto: correcta?.respuesta || "Sin respuesta correcta"
      });
    }

    console.log('✅ Preguntas procesadas:', preguntas.length);

    // 4️⃣ RENDERIZAR CON AMBOS DATOS
    res.render('historialDetalle', { 
      layout: 'main', 
      title: 'Detalle del Examen', 
      examen: examenDetalle,
      preguntas: preguntas  // ✅ Array separado
    });

  } catch (error) {
    console.error('Error al cargar el detalle del examen:', error);
    res.status(500).send('Error al cargar el examen');
  }
}
async function verHistorialUnificado(req, res) {
  try {
    const id_usuario = req.session.user.id_usuario;
    
    // 1️⃣ Obtener historial de EXÁMENES
    const [historialExamenes] = await db.query(queries.getHistorialExamenes, [id_usuario]);
    
    const examenes = historialExamenes.map(h => ({
      id_examen: h.id_examen,
      materia: h.materia || 'EXAMEN DE ADMISIÓN',
      puntos: h.obtenido,
      total: h.maximo,
      porcentaje: h.porcentaje,
      fecha: new Date(h.fecha).toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' })
    }));
    
    // 2️⃣ Obtener historial de DUELOS
    const [historialDuelos] = await db.query(`
      SELECT 
        hd.id_duelo,
        hd.fecha_duelo,
        hd.tipo_duelo,
        hd.id_ganador,
        hd.total_preguntas,
        hd.Id_dificultad,
        hd.apuesta,
        CASE 
          WHEN hd.id_retador = ? THEN hd.correctas_retador 
          ELSE hd.correctas_defensor 
        END as mis_correctas,
        CASE 
          WHEN hd.id_retador = ? THEN hd.porcentaje_retador 
          ELSE hd.porcentaje_defensor 
        END as mi_porcentaje,
        CASE 
          WHEN hd.id_ganador = ? THEN 'Victoria'
          WHEN hd.id_ganador IS NULL THEN 'Empate'
          ELSE 'Derrota'
        END as resultado,
        CASE 
          WHEN hd.id_retador = ? THEN u2.username 
          ELSE u1.username 
        END as oponente
      FROM historial_duelos hd
      LEFT JOIN usuario u1 ON hd.id_retador = u1.id_usuario
      LEFT JOIN usuario u2 ON hd.id_defensor = u2.id_usuario
      WHERE hd.id_retador = ? OR hd.id_defensor = ?
      ORDER BY hd.fecha_duelo DESC
      LIMIT 50
    `, [id_usuario, id_usuario, id_usuario, id_usuario, id_usuario, id_usuario]);
    
    const duelos = historialDuelos.map(d => ({
      id_duelo: d.id_duelo,
      tipo: d.tipo_duelo,
      oponente: d.oponente,
      resultado: d.resultado,
      mis_correctas: d.mis_correctas,
      total: d.total_preguntas,
      porcentaje: d.mi_porcentaje,
      dificultad: d.dificultad === 1 ? 'Fácil' : d.dificultad === 2 ? 'Medio' : 'Difícil',
      apuesta: d.apuesta,
      fecha: new Date(d.fecha_duelo).toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' })
    }));
    
    // 3️⃣ Renderizar vista unificada
    res.render('historialUsuario', {
      layout: 'main',
      title: 'Historial y Estadísticas',
      user: req.session.user,
      examenes: examenes,
      duelos: duelos,
      tieneExamenes: examenes.length > 0,
      tieneDuelos: duelos.length > 0
    });
    
  } catch (error) {
    console.error('❌ Error al cargar historial unificado:', error);
    res.status(500).send('Error al cargar el historial');
  }
}
// ==================== EXPORTACIÓN ====================
module.exports = {
  verPerfil,
  vistaEditarUsuario,
  editarUsuario,
  verHistorial,
  verHistorialUnificado,
  verDetalleExamen,
  upload // exportamos también multer si quieres usarlo desde las rutas
};
