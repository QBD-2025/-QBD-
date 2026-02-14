// =============================================
// 👤 CONTROLADOR DE USUARIO - VERSIÓN CORREGIDA
// backend/controllers/usuario.controller.js
// =============================================

const db = require('../db/conexion');
const queries = require('../queries/usuario.queries');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;

// ==================== CONFIGURACIÓN DE MULTER ====================

const uploadDir = path.join(__dirname, '../../frontend/media/uploads');

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
  if (allowedTypes.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Solo se permiten imágenes JPG, PNG o WEBP'), false);
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

// ==================== FUNCIONES AUXILIARES ====================

async function eliminarAvatarAntiguo(userId) {
  try {
    const [userData] = await db.query(queries.getUsuarioById, [userId]);
    if (userData.length > 0 && userData[0].foto_perfil) {
      const oldAvatar = userData[0].foto_perfil;
      if (!oldAvatar.startsWith('http') && !oldAvatar.includes('default_avatar')) {
        const oldPath = path.join(__dirname, '/uploads', oldAvatar);
        await fs.unlink(oldPath).catch(() => console.log('Avatar anterior no encontrado'));
      }
    }
  } catch (error) {
    console.error('Error eliminando avatar antiguo:', error);
  }
}

function normalizarAvatar(avatarUrl) {
  if (!avatarUrl) return '/uploads/default_avatar.png';
  if (avatarUrl.startsWith('/') || avatarUrl.startsWith('http')) return avatarUrl;
  return `/uploads/${avatarUrl}`;
}

// ==================== VER PERFIL PROPIO ====================
async function verPerfil(req, res) {
  try {
    const [userData] = await db.query(queries.getUsuarioById, [req.session.user.id_usuario]);
    if (userData.length === 0) return res.status(404).send('Usuario no encontrado');

    const roles = { 1: 'USUARIO', 2: 'EDITOR', 3: 'ADMIN' };

    const userProfile = {
      ...userData[0],
      role: roles[userData[0].id_tp_usuario] || 'USUARIO',
      avatarUrl: normalizarAvatar(userData[0].foto_perfil),
      foto_perfil: normalizarAvatar(userData[0].foto_perfil)
    };

    res.render('usuario', { layout: 'main', title: 'Perfil de Usuario', user: userProfile });
  } catch (error) {
    console.error('Error en la consulta:', error);
    res.status(500).send('Error al cargar el perfil');
  }
}

// ==================== VISTA EDITAR USUARIO ====================
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
        avatarUrl: normalizarAvatar(userData[0].foto_perfil),
        foto_perfil: normalizarAvatar(userData[0].foto_perfil)
      }
    });
  } catch (error) {
    console.error('Error al cargar la vista de edición:', error);
    res.status(500).send('Error interno del servidor');
  }
}

// ==================== EDITAR USUARIO ====================
async function editarUsuario(req, res) {
  const { email, username, apodo, descripcion } = req.body;
  const userId = req.session.user.id_usuario;

  try {
    let avatarPath = null;

    if (req.file) {
      const optimizedFilename = `${userId}_${Date.now()}_optimized.webp`;
      const optimizedPath = path.join(uploadDir, optimizedFilename);

      await sharp(req.file.path)
        .resize(400, 400, { fit: 'cover', position: 'center' })
        .webp({ quality: 85 })
        .toFile(optimizedPath);

      await fs.unlink(req.file.path);
      avatarPath = `/uploads/${optimizedFilename}`;
      await eliminarAvatarAntiguo(userId);
    }

    if (avatarPath) {
      await db.query(queries.updateUsuarioConAvatar, [email, username, apodo, descripcion, avatarPath, userId]);
      req.session.user.foto_perfil = avatarPath;
    } else {
      await db.query(queries.updateUsuario, [email, username, apodo, descripcion, userId]);
    }

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

// ==================== HISTORIAL UNIFICADO ====================
async function verHistorialUnificado(req, res) {
  try {
    const id_usuario = req.session.user.id_usuario;
    
    // Exámenes
    const [historialExamenes] = await db.query(queries.getHistorialExamenes, [id_usuario]);
    
    const examenes = historialExamenes.map(h => ({
      id_examen: h.id_examen,
      materia: h.materia || 'EXAMEN DE ADMISIÓN',
      puntos: h.obtenido,
      total: h.maximo,
      porcentaje: h.porcentaje,
      fecha: new Date(h.fecha).toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' })
    }));
    
    // Duelos
    const [historialDuelos] = await db.query(`
      SELECT 
        hd.id_duelo,
        hd.fecha_duelo,
        hd.tipo_duelo,
        hd.id_ganador,
        hd.total_preguntas,
        hd.dificultad,
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

// ==================== DETALLE DE EXAMEN ====================
async function verDetalleExamen(req, res) {
  try {
    const { id_examen } = req.params;
    const id_usuario = req.session.user.id_usuario;

    const [detalles] = await db.query(queries.getDetalleExamen, [id_usuario, id_examen]);
    if (detalles.length === 0) {
      return res.status(404).send('Examen no encontrado o no pertenece a este usuario.');
    }

    const examenDetalle = {
      ...detalles[0],
      materia: detalles[0].materia || 'EXAMEN DE ADMISIÓN',
      fecha: new Date(detalles[0].fecha).toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' })
    };

    const [historial] = await db.query(`
      SELECT h.id_pregunta, h.id_respuesta AS id_respuesta_usuario, h.puntos
      FROM historial h
      WHERE h.id_examen = ? AND h.id_usuario = ?
      ORDER BY h.id_pregunta
    `, [id_examen, id_usuario]);

    const preguntas = [];
    
    for (const h of historial) {
      const [preguntaRow] = await db.query(
        'SELECT pregunta, retroalimentacion FROM pregunta WHERE id_pregunta = ?',
        [h.id_pregunta]
      );

      if (preguntaRow.length === 0) continue;

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

    res.render('historialDetalle', { 
      layout: 'main', 
      title: 'Detalle del Examen', 
      examen: examenDetalle,
      preguntas: preguntas
    });

  } catch (error) {
    console.error('Error al cargar el detalle del examen:', error);
    res.status(500).send('Error al cargar el examen');
  }
}

// ==================== ✅ VER PERFIL PÚBLICO - VERSIÓN CORREGIDA ====================

async function verPerfilPublico(req, res) {
    try {
        const idUsuarioVer    = parseInt(req.params.id_usuario);
        const idUsuarioActual = req.session.user.id_usuario;

        console.log(`[PERFIL PÚBLICO]: Usuario ${idUsuarioActual} → perfil de ${idUsuarioVer}`);

        if (isNaN(idUsuarioVer) || idUsuarioVer <= 0) {
            return res.status(400).render('menu_principal', {
                layout: 'main', title: 'Error',
                user: req.session.user, error: 'Usuario no válido'
            });
        }

        // ─── 1. Datos básicos del usuario ─────────────────────────
        const [usuarios] = await db.query(`
            SELECT 
                u.id_usuario,
                u.username,
                u.email,
                u.apodo,
                u.descripcion,
                u.foto_perfil,
                u.fecha_registro,
                u.ultimo_acceso,
                c.descripcion AS carrera_descripcion
            FROM usuario u
            LEFT JOIN usuario_carrera uc ON u.id_usuario  = uc.id_usuario
            LEFT JOIN carrera c          ON uc.id_carrera = c.id_carrera
            WHERE u.id_usuario = ?
            LIMIT 1
        `, [idUsuarioVer]);

        if (!usuarios || usuarios.length === 0) {
            return res.status(404).render('menu_principal', {
                layout: 'main', title: 'No Encontrado',
                user: req.session.user, error: 'El usuario no existe'
            });
        }

        const usuario = usuarios[0];
        usuario.foto_perfil = normalizarAvatar(usuario.foto_perfil);

        // ─── 2. Stats de exámenes ──────────────────────────────────
        // FIX [1]: usuario_examen usa 'obtenido', no 'puntos'
        //          Sin JOIN para evitar ambigüedad en id_usuario
        const [statsEx] = await db.query(`
            SELECT 
                COALESCE(SUM(ue.obtenido), 0)    AS puntos_totales,
                COUNT(DISTINCT ue.id_examen)      AS examenes_realizados
            FROM usuario_examen ue
            WHERE ue.id_usuario = ?
        `, [idUsuarioVer]);

        // ─── 3. Stats de duelos ────────────────────────────────────
        const [statsDuelos] = await db.query(`
            SELECT 
                COUNT(*) AS duelos_totales,
                SUM(CASE WHEN id_ganador = ?           THEN 1 ELSE 0 END) AS victorias,
                SUM(CASE WHEN id_ganador IS NULL        THEN 1 ELSE 0 END) AS empates,
                SUM(CASE WHEN id_ganador != ? AND id_ganador IS NOT NULL
                                                        THEN 1 ELSE 0 END) AS derrotas
            FROM historial_duelos
            WHERE (id_retador = ? OR id_defensor = ?)
        `, [idUsuarioVer, idUsuarioVer, idUsuarioVer, idUsuarioVer]);

        // ─── 4. Racha actual ───────────────────────────────────────
        const [rachaData] = await db.query(`
            SELECT id_ganador
            FROM historial_duelos
            WHERE (id_retador = ? OR id_defensor = ?)
            ORDER BY fecha_duelo DESC
            LIMIT 20
        `, [idUsuarioVer, idUsuarioVer]);

        let rachaVictorias = 0;
        for (const d of rachaData) {
            if (d.id_ganador === idUsuarioVer) rachaVictorias++;
            else if (d.id_ganador !== null)    break;
        }

        // ─── 5. Puntos por carrera ─────────────────────────────────
        const [puntosCarrera] = await db.query(`
            SELECT c.descripcion AS carrera, uc.puntos AS puntos_carrera
            FROM usuario_puntos_carrera uc
            JOIN carrera c ON uc.id_carrera = c.id_carrera
            WHERE uc.id_usuario = ?
        `, [idUsuarioVer]);

        // ─── 6. Últimos duelos ─────────────────────────────────────
        const [ultimosDuelos] = await db.query(`
            SELECT 
                hd.id_duelo,
                hd.fecha_duelo        AS fecha_fin,
                hd.id_ganador,
                hd.correctas_retador  AS puntaje_retador,
                hd.correctas_defensor AS puntaje_defensor,
                hd.total_preguntas,
                hd.dificultad,
                u1.username AS retador_nombre,
                u2.username AS defensor_nombre
            FROM historial_duelos hd
            JOIN usuario u1 ON hd.id_retador  = u1.id_usuario
            JOIN usuario u2 ON hd.id_defensor = u2.id_usuario
            WHERE (hd.id_retador = ? OR hd.id_defensor = ?)
            ORDER BY hd.fecha_duelo DESC
            LIMIT 5
        `, [idUsuarioVer, idUsuarioVer]);

        // ─── 7. Ranking global ─────────────────────────────────────
        // FIX [2]: ranking basado en SUM(obtenido) de usuario_examen
        let posicionGlobal = '?';
        try {
            const puntosParaRanking = statsEx[0]?.puntos_totales || 0;
            const [rankingRow] = await db.query(`
                SELECT (
                    SELECT COUNT(*) + 1
                    FROM (
                        SELECT ue2.id_usuario, COALESCE(SUM(ue2.obtenido), 0) AS total_pts
                        FROM usuario_examen ue2
                        GROUP BY ue2.id_usuario
                    ) AS sub
                    WHERE sub.total_pts > ?
                ) AS posicion_global
            `, [puntosParaRanking]);
            posicionGlobal = rankingRow[0]?.posicion_global || '?';
        } catch (err) {
            console.warn('[PERFIL PÚBLICO]: ⚠️ Ranking no disponible:', err.message);
        }

        // ─── 8. Insignias equipadas ────────────────────────────────
        let insigniasEquipadas = [];
        try {
            const [ins] = await db.query(`
                SELECT 
                    i.id_insignia,
                    i.nombre,
                    i.descripcion,
                    i.imagen,
                    i.rareza,
                    i.color_borde,
                    ui.posicion_perfil
                FROM usuario_insignias ui
                INNER JOIN insignias i ON ui.id_insignia = i.id_insignia
                WHERE ui.id_usuario = ? AND ui.equipada = 1 AND ui.desbloqueada = 1
                ORDER BY ui.posicion_perfil
                LIMIT 6
            `, [idUsuarioVer]);
            insigniasEquipadas = ins;
        } catch (err) {
            console.warn('[PERFIL PÚBLICO]: ⚠️ Tabla insignias no disponible:', err.message);
        }

        // ─── 9. Logros recientes ───────────────────────────────────
        let logrosRecientes = [];
        try {
            const [log] = await db.query(`
                SELECT 
                    l.id_logro,
                    l.nombre,
                    l.descripcion,
                    l.icono,
                    l.puntos_bonus,
                    ul.fecha_desbloqueo
                FROM usuario_logros ul
                INNER JOIN logros l ON ul.id_logro = l.id_logro
                WHERE ul.id_usuario = ? AND ul.desbloqueado = 1
                ORDER BY ul.fecha_desbloqueo DESC
                LIMIT 3
            `, [idUsuarioVer]);
            logrosRecientes = log;
        } catch (err) {
            console.warn('[PERFIL PÚBLICO]: ⚠️ Tabla logros no disponible:', err.message);
        }

        // ─── 10. Construir stats ───────────────────────────────────
        const totalDuelos = statsDuelos[0]?.duelos_totales || 0;
        const victorias   = statsDuelos[0]?.victorias      || 0;

        const stats = {
            puntos_totales:      statsEx[0]?.puntos_totales      || 0,
            examenes_realizados: statsEx[0]?.examenes_realizados  || 0,
            duelos_totales:      totalDuelos,
            victorias,
            empates:             statsDuelos[0]?.empates  || 0,
            derrotas:            statsDuelos[0]?.derrotas || 0,
            racha_victorias:     rachaVictorias,
            porcentaje_victoria: totalDuelos > 0
                ? Math.round((victorias / totalDuelos) * 100)
                : 0,
            posicion_global:     posicionGlobal,
            carreras:            puntosCarrera,
            ultimos_duelos:      ultimosDuelos,
            insignias_equipadas: insigniasEquipadas,
            logros_recientes:    logrosRecientes
        };

        console.log(`[PERFIL PÚBLICO]: ✅ OK — puntos: ${stats.puntos_totales}, insignias: ${insigniasEquipadas.length}, logros: ${logrosRecientes.length}`);

        res.render('perfil-publico', {
            layout:        'main',
            title:         `Perfil de ${usuario.username}`,
            usuario,
            stats,
            esPropioPerfil: idUsuarioVer === idUsuarioActual,
            user:           req.session.user
        });

    } catch (error) {
        console.error('[PERFIL PÚBLICO ERROR]:', error.message);
        console.error('[PERFIL PÚBLICO STACK]:', error.stack);
        res.status(500).render('menu_principal', {
            layout: 'main', title: 'Error',
            user:   req.session.user,
            error:  'Error al cargar el perfil. Intenta de nuevo.'
        });
    }
}
// ==================== API: STATS EN TIEMPO REAL ====================
async function obtenerStatsAPI(req, res) {
    try {
        const idUsuario = parseInt(req.params.id_usuario);
        
        if (!idUsuario || isNaN(idUsuario)) {
            return res.status(400).json({ 
                success: false, 
                message: 'ID de usuario inválido' 
            });
        }
        
        const [statsGenerales] = await db.query(`
            SELECT 
                COALESCE(SUM(puntos), 0) as puntos_totales,
                COUNT(DISTINCT id_examen) as examenes_realizados
            FROM usuario_examen
            WHERE id_usuario = ?
        `, [idUsuario]);
        
        const [statsDuelos] = await db.query(`
            SELECT 
                COUNT(*) as duelos_totales,
                SUM(CASE WHEN id_ganador = ? THEN 1 ELSE 0 END) as victorias,
                SUM(CASE WHEN id_ganador IS NULL THEN 1 ELSE 0 END) as empates,
                SUM(CASE WHEN id_ganador != ? AND id_ganador IS NOT NULL THEN 1 ELSE 0 END) as derrotas
            FROM historial_duelos
            WHERE (id_retador = ? OR id_defensor = ?)
        `, [idUsuario, idUsuario, idUsuario, idUsuario]);
        
        res.json({
            success: true,
            puntos_totales: statsGenerales[0].puntos_totales || 0,
            examenes_realizados: statsGenerales[0].examenes_realizados || 0,
            duelos_totales: statsDuelos[0].duelos_totales || 0,
            victorias: statsDuelos[0].victorias || 0,
            empates: statsDuelos[0].empates || 0,
            derrotas: statsDuelos[0].derrotas || 0
        });
        
    } catch (error) {
        console.error('[API STATS ERROR]:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error al obtener estadísticas' 
        });
    }
}

// ==================== API: MINI PERFIL ====================


// ─────────────────────────────────────────────────────────────
async function obtenerMiniPerfil(req, res) {
    try {
        const idUsuario = parseInt(req.params.id_usuario);

        if (!idUsuario || isNaN(idUsuario)) {
            return res.status(400).json({
                success: false,
                message: 'ID de usuario inválido'
            });
        }

        console.log(`[MINI PERFIL API]: Consultando usuario ${idUsuario}`);

        // Datos básicos del usuario
        const [usuario] = await db.query(`
            SELECT 
                u.id_usuario,
                u.username,
                u.apodo,
                u.email,
                u.foto_perfil,
                u.descripcion,
                c.descripcion as carrera_descripcion
            FROM usuario u
            LEFT JOIN usuario_carrera uc ON u.id_usuario = uc.id_usuario
            LEFT JOIN carrera c ON uc.id_carrera = c.id_carrera
            WHERE u.id_usuario = ?
            LIMIT 1
        `, [idUsuario]);

        if (!usuario || usuario.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        usuario[0].foto_perfil = normalizarAvatar(usuario[0].foto_perfil);

        // Stats del usuario (puntos desde usuario_examen, racha desde usuario)
        const [statsRow] = await db.query(`
            SELECT 
                u.racha_victorias,
                COALESCE(SUM(u.puntos), 0) as puntos_totales,
                COUNT(DISTINCT ue.id_examen)   as examenes_realizados
            FROM usuario u
            LEFT JOIN usuario_examen ue ON u.id_usuario = ue.id_usuario
            WHERE u.id_usuario = ?
            GROUP BY u.id_usuario
        `, [idUsuario]);

        const stats = statsRow[0] || { puntos_totales: 0, examenes_realizados: 0, racha_victorias: 0 };

        // Victorias totales
        const [victoriasRow] = await db.query(`
            SELECT COUNT(*) as victorias
            FROM historial_duelos
            WHERE id_ganador = ?
        `, [idUsuario]);

        // ✅ FIX: ranking correcto usando usuario_examen
        const [rankingRow] = await db.query(`
            SELECT
                (SELECT COUNT(*) + 1
                 FROM (
                     SELECT id_usuario, COALESCE(SUM(obtenido), 0) as total_puntos
                     FROM usuario_examen
                     GROUP BY id_usuario
                 ) AS subq
                 WHERE subq.total_puntos > ?) AS posicion_global
        `, [stats.puntos_totales]);

        // Insignias equipadas
        const [insignias] = await db.query(`
            SELECT 
                i.id_insignia,
                i.nombre,
                i.descripcion,
                i.imagen,
                i.rareza,
                i.color_borde,
                ui.posicion_perfil
            FROM usuario_insignias ui
            INNER JOIN insignias i ON ui.id_insignia = i.id_insignia
            WHERE ui.id_usuario = ? AND ui.equipada = 1 AND ui.desbloqueada = 1
            ORDER BY ui.posicion_perfil
            LIMIT 6
        `, [idUsuario]);

        const response = {
            success: true,
            usuario: usuario[0],
            stats: {
                puntos_totales:     stats.puntos_totales     || 0,
                examenes_realizados: stats.examenes_realizados || 0,
                victorias:          victoriasRow[0]?.victorias || 0,
                racha_victorias:    stats.racha_victorias    || 0
            },
            insignias_equipadas: insignias,
            posicion_global:     rankingRow[0]?.posicion_global || '?'
        };

        console.log(`[MINI PERFIL API]: ✅ Datos enviados para usuario ${idUsuario}`);
        res.json(response);

    } catch (error) {
        console.error('[MINI PERFIL API ERROR]:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener perfil: ' + error.message
        });
    }
}
// ==================== EXPORTACIÓN ====================
module.exports = {
  verPerfil,
  vistaEditarUsuario,
  editarUsuario,
  verHistorialUnificado,
  verDetalleExamen,
  verPerfilPublico,      // ✅ EXPORTADA
  obtenerStatsAPI,       // ✅ EXPORTADA
  obtenerMiniPerfil,     // ✅ EXPORTADA
  upload
};