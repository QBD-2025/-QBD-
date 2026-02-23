// backend/routes/competitivo.router.js - VERSIÓN UNIFICADA FINAL
// =============================================
// 🎮 ROUTER COMPETITIVO COMPLETO
// Con sistema de dificultad, apuestas, puntos por carrera y estadísticas avanzadas
// =============================================
const express = require('express');
const router = express.Router();
const pool = require('../db/conexion');

// =============================================
// 📊 CONFIGURACIÓN DEL SISTEMA
// =============================================
const DIFICULTADES = {
  1: { nombre: 'Fácil', apuesta: 50, preguntas: 10 },
  2: { nombre: 'Medio', apuesta: 100, preguntas: 10 },
  3: { nombre: 'Difícil', apuesta: 200, preguntas: 10 }
};

const TIEMPOS = {
  DUELO: 48 * 60 * 60 * 1000,
  EXPIRACION: 7 * 24 * 60 * 60 * 1000
};

const PENALIZACIONES = {
  DESCONEXION: 0.50,
  ABANDONO_VOLUNTARIO: 1.0
};

// Endpoint de configuración
router.get('/duelo/penalizaciones', (req, res) => {
  res.json({ penalizaciones: PENALIZACIONES, tiempos: TIEMPOS, dificultades: DIFICULTADES });
});

// =============================================
// 🛠️ FUNCIONES AUXILIARES
// =============================================
function toNumber(value, defaultValue = 0) {
  if (value === null || value === undefined || value === '') return defaultValue;
  const num = typeof value === 'string' ? parseFloat(value) : Number(value);
  return isNaN(num) ? defaultValue : num;
}

async function obtenerRespuestas(idUsuario, salaId) {
  const [respuestas] = await pool.query(`
    SELECT dp.id_pregunta, dr.id_respuesta, p.pregunta,
      r.respuesta as texto_respuesta,
      COALESCE(r.correcta, 0) as es_correcta,
      dp.orden,
      CASE WHEN dr.id_respuesta IS NULL THEN 1 ELSE 0 END as sin_responder
    FROM duelos_preguntas dp
    INNER JOIN pregunta p ON dp.id_pregunta = p.id_pregunta
    LEFT JOIN duelos_respuestas dr
      ON dr.id_duelo = dp.id_duelo
      AND dr.id_pregunta = dp.id_pregunta
      AND dr.id_usuario = ?
    LEFT JOIN respuesta r ON dr.id_respuesta = r.id_respuesta
    WHERE dp.id_duelo = ?
    ORDER BY dp.orden
  `, [idUsuario, salaId]);
  return respuestas;
}

async function verificarAmbosTerminaron(salaId) {
  const [duelo] = await pool.query(`
    SELECT respondido_retador, respondido_oponente FROM duelos WHERE id_duelo = ?
  `, [salaId]);
  if (duelo.length === 0) return false;
  return duelo[0].respondido_retador && duelo[0].respondido_oponente;
}

async function obtenerOponente(idUsuario, salaId) {
  const [duelo] = await pool.query(`
    SELECT id_retador, id_defensor FROM duelos WHERE id_duelo = ?
  `, [salaId]);
  if (duelo.length === 0) return null;
  const idOponente = duelo[0].id_retador === idUsuario ? duelo[0].id_defensor : duelo[0].id_retador;
  const [oponente] = await pool.query(`
    SELECT id_usuario as id, username FROM usuario WHERE id_usuario = ?
  `, [idOponente]);
  return oponente[0];
}

function calcularPuntaje(respuestas) {
  return respuestas.filter(r => r.id_respuesta !== null && r.es_correcta).length;
}

async function obtenerTotalPreguntasDuelo(salaId) {
  const [result] = await pool.query(`
    SELECT COUNT(*) as total FROM duelos_preguntas WHERE id_duelo = ?
  `, [salaId]);
  return result[0]?.total || 0;
}

async function obtenerRankingUsuario(idUsuario) {
  const [ranking] = await pool.query(`
    SELECT COUNT(*) + 1 as puesto FROM usuario
    WHERE puntos > (SELECT puntos FROM usuario WHERE id_usuario = ?)
  `, [idUsuario]);
  return ranking[0].puesto;
}

function calcularPuntosSegunRanking(puestoRetador, puestoDefensor, ganoRetador) {
  const PUNTOS_BASE_VICTORIA = 10;
  const BONUS_POR_PUESTO = 2;
  const PENALIZACION_POR_PUESTO = 1;
  const PUNTOS_MINIMOS = 5;
  const BONUS_MAXIMO = 20;
  const PUNTOS_PERDIDA = -5;
  const PUNTOS_PERDIDA_CONTRA_PEOR = -8;
  const diferencia = puestoDefensor - puestoRetador;
  let puntosRetador = 0;
  let puntosDefensor = 0;

  if (ganoRetador) {
    if (diferencia < 0) {
      const bonus = Math.min(Math.abs(diferencia) * BONUS_POR_PUESTO, BONUS_MAXIMO);
      puntosRetador = PUNTOS_BASE_VICTORIA + bonus;
    } else {
      puntosRetador = Math.max(PUNTOS_BASE_VICTORIA - (diferencia * PENALIZACION_POR_PUESTO), PUNTOS_MINIMOS);
    }
    puntosDefensor = diferencia < 0 ? PUNTOS_PERDIDA_CONTRA_PEOR : PUNTOS_PERDIDA;
  } else {
    if (diferencia > 0) {
      const bonus = Math.min(diferencia * BONUS_POR_PUESTO, BONUS_MAXIMO);
      puntosDefensor = PUNTOS_BASE_VICTORIA + bonus;
    } else {
      puntosDefensor = Math.max(PUNTOS_BASE_VICTORIA - (Math.abs(diferencia) * PENALIZACION_POR_PUESTO), PUNTOS_MINIMOS);
    }
    puntosRetador = diferencia > 0 ? PUNTOS_PERDIDA_CONTRA_PEOR : PUNTOS_PERDIDA;
  }

  return { puntosRetador, puntosDefensor };
}

async function finalizarDuelo(salaId, idGanador, idPerdedor, puntajeGanador, puntajePerdedor) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [duelo] = await conn.query('SELECT * FROM duelos WHERE id_duelo = ?', [salaId]);
    if (!duelo.length) throw new Error('Duelo no encontrado');
    const esRetadorGanador = duelo[0].id_retador === idGanador;
    const puestoRetador = await obtenerRankingUsuario(duelo[0].id_retador);
    const puestoDefensor = await obtenerRankingUsuario(duelo[0].id_defensor);
    const { puntosRetador, puntosDefensor } = calcularPuntosSegunRanking(puestoRetador, puestoDefensor, esRetadorGanador);

    await conn.query('UPDATE usuario SET puntos = puntos + ? WHERE id_usuario = ?', [puntosRetador, duelo[0].id_retador]);
    await conn.query('UPDATE usuario SET puntos = puntos + ? WHERE id_usuario = ?', [puntosDefensor, duelo[0].id_defensor]);
    await conn.query(`
      INSERT INTO historial_duelos (id_duelo, id_retador, id_defensor, id_ganador, puntos_retador, puntos_defensor, fecha_duelo)
      VALUES (?, ?, ?, ?, ?, ?, NOW())
    `, [salaId, duelo[0].id_retador, duelo[0].id_defensor, idGanador,
      esRetadorGanador ? puntajeGanador : puntajePerdedor,
      esRetadorGanador ? puntajePerdedor : puntajeGanador]);
    await conn.query('UPDATE duelos SET estado = ? WHERE id_duelo = ?', ['finalizado', salaId]);
    await conn.commit();
    await conn.release();
    return { puntosRetador, puntosDefensor, puestoRetador, puestoDefensor };
  } catch (error) {
    await conn.rollback();
    await conn.release();
    throw error;
  }
}

async function obtenerDuelo(salaId) {
  const [duelo] = await pool.query(`
    SELECT d.*, u1.username as retador_username, u1.id_usuario as retador_id,
      u2.username as defensor_username, u2.id_usuario as defensor_id
    FROM duelos d
    LEFT JOIN usuario u1 ON d.id_retador = u1.id_usuario
    LEFT JOIN usuario u2 ON d.id_defensor = u2.id_usuario
    WHERE d.id_duelo = ?
  `, [salaId]);
  return duelo[0];
}

async function actualizarNotificacionesAlTerminar(salaId, conn) {
  try {
    const [duelo] = await conn.query(`
      SELECT respondido_retador, respondido_oponente, id_retador, id_defensor
      FROM duelos WHERE id_duelo = ?
    `, [salaId]);
    if (duelo.length === 0) return;
    const ambosTerminaron = duelo[0].respondido_retador && duelo[0].respondido_oponente;
    if (ambosTerminaron) {
      await conn.query(`
        UPDATE notificaciones
        SET mensaje = 'Duelo completado - Ver resultados', tipo = 'duelo_completado'
        WHERE tipo = 'duelo_aceptado' AND (
          JSON_EXTRACT(extra_data, '$.salaId') = ? OR JSON_EXTRACT(extra_data, '$.id_duelo') = ?
        )
      `, [salaId, salaId]);
    }
  } catch (error) {
    console.error('❌ Error actualizando notificaciones:', error);
  }
}

// =============================================
// 🏠 PORTAL PRINCIPAL
// =============================================
router.get('/portal', async (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  try {
    const userId = req.session.user.id_usuario;
    const [carreras] = await pool.query(`
      SELECT c.id_carrera, c.descripcion FROM carrera c
      INNER JOIN usuario_carrera uc ON c.id_carrera = uc.id_carrera
      WHERE uc.id_usuario = ? LIMIT 1
    `, [userId]);
    const carrera = carreras.length > 0 ? carreras[0] : null;
    const [userData] = await pool.query(`
      SELECT u.puntos,
        COALESCE((SELECT COUNT(*) FROM historial_duelos WHERE id_retador = u.id_usuario OR id_defensor = u.id_usuario), 0) AS duelos_jugados,
        COALESCE((SELECT COUNT(*) FROM historial_duelos WHERE id_ganador = u.id_usuario), 0) AS victorias,
        COALESCE(u.racha_victorias, 0) AS racha_victorias
      FROM usuario u WHERE u.id_usuario = ?
    `, [userId]);

    let puntosCarrera = 0;
    if (carrera) {
      const [puntosCarreraData] = await pool.query(`
        SELECT puntos FROM usuario_puntos_carrera WHERE id_usuario = ? AND id_carrera = ?
      `, [userId, carrera.id_carrera]);
      puntosCarrera = puntosCarreraData.length > 0 ? puntosCarreraData[0].puntos : 0;
    }

    const userWithCarrera = {
      ...req.session.user,
      id_carrera: carrera ? carrera.id_carrera : null,
      carrera_descripcion: carrera ? carrera.descripcion : null
    };

    res.render('duelodelascenso', {
      layout: 'main',
      user: userWithCarrera,
      stats: { ...userData[0], puntos_carrera: puntosCarrera },
      dificultades: DIFICULTADES
    });
  } catch (error) {
    console.error("❌ ERROR al cargar portal:", error);
    res.redirect('/menu_principal');
  }
});

// =============================================
// 📚 API - CARRERAS DEL USUARIO
// =============================================
router.get('/api/usuario/carreras', async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'No autorizado' });
  try {
    const idUsuario = req.session.user.id_usuario;
    const [carreras] = await pool.query(`
      SELECT c.id_carrera, c.descripcion, COALESCE(upc.puntos, 0) as puntos
      FROM usuario_puntos_carrera upc
      INNER JOIN carrera c ON upc.id_carrera = c.id_carrera
      WHERE upc.id_usuario = ? ORDER BY c.descripcion
    `, [idUsuario]);
    res.json({ carreras });
  } catch (error) {
    console.error('❌ Error obteniendo carreras:', error);
    res.status(500).json({ error: 'Error al obtener carreras' });
  }
});

// =============================================
// 💰 API - PUNTOS ACTUALES
// =============================================
router.get('/api/usuario/puntos-actuales', async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'No autorizado' });
  try {
    const idUsuario = req.session.user.id_usuario;
    const [usuario] = await pool.query('SELECT puntos FROM usuario WHERE id_usuario = ?', [idUsuario]);
    if (!usuario.length) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ puntos_globales: usuario[0].puntos });
  } catch (error) {
    console.error('❌ Error obteniendo puntos:', error);
    res.status(500).json({ error: 'Error al obtener puntos' });
  }
});

// =============================================
// 📊 API - RANKINGS
// =============================================
router.get('/api/ranking/global', async (req, res) => {
  try {
    const userId = req.session?.user?.id_usuario || null;
    const [jugadores] = await pool.query(`
      SELECT u.id_usuario, u.username, u.foto_perfil, u.puntos,
        GROUP_CONCAT(DISTINCT c.descripcion SEPARATOR ', ') as carreras,
        GROUP_CONCAT(DISTINCT c.id_carrera) as ids_carreras
      FROM usuario u
      LEFT JOIN usuario_carrera uc ON u.id_usuario = uc.id_usuario
      LEFT JOIN carrera c ON uc.id_carrera = c.id_carrera
      WHERE u.verificado = 1
      GROUP BY u.id_usuario, u.username, u.foto_perfil, u.puntos
      ORDER BY u.puntos DESC LIMIT 100
    `);

    let misCarreras = [];
    if (userId) {
      const [carreras] = await pool.query('SELECT id_carrera FROM usuario_carrera WHERE id_usuario = ?', [userId]);
      misCarreras = carreras.map(c => c.id_carrera);
    }

    const jugadoresConCompatibilidad = jugadores.map(jugador => {
      let tieneCarreraComun = false;
      if (jugador.ids_carreras && misCarreras.length > 0) {
        const carrerasJugador = jugador.ids_carreras.split(',').map(id => parseInt(id));
        tieneCarreraComun = carrerasJugador.some(id => misCarreras.includes(id));
      }
      return { ...jugador, tiene_carrera_comun: tieneCarreraComun, es_yo: jugador.id_usuario === userId };
    });

    res.json(jugadoresConCompatibilidad);
  } catch (error) {
    console.error('❌ Error en ranking global:', error);
    res.status(500).json({ error: 'Error al obtener ranking' });
  }
});

router.get('/api/ranking/carrera/:id_carrera', async (req, res) => {
  try {
    const idCarrera = req.params.id_carrera;
    const [jugadores] = await pool.query(`
      SELECT DISTINCT u.id_usuario, u.username, u.foto_perfil, COALESCE(upc.puntos, 0) as puntos_carrera
      FROM usuario u
      INNER JOIN usuario_carrera uc ON u.id_usuario = uc.id_usuario
      LEFT JOIN usuario_puntos_carrera upc ON u.id_usuario = upc.id_usuario AND upc.id_carrera = ?
      WHERE uc.id_carrera = ?
      ORDER BY COALESCE(upc.puntos, 0) DESC LIMIT 100
    `, [idCarrera, idCarrera]);
    res.json(jugadores);
  } catch (error) {
    console.error('❌ Error en ranking carrera:', error);
    res.status(500).json({ error: 'Error al obtener ranking' });
  }
});

// =============================================
// 🎯 VERIFICAR DUELO ACTIVO
// =============================================
router.get('/api/duelo/verificar/:idOponente', async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'No autorizado' });
  try {
    const { idOponente } = req.params;
    const idUsuario = req.session.user.id_usuario;
    const [duelosActivos] = await pool.query(`
      SELECT id_duelo, estado, fecha_limite FROM duelos
      WHERE ((id_retador = ? AND id_defensor = ?) OR (id_retador = ? AND id_defensor = ?))
        AND estado NOT IN ('finalizado', 'abandonado')
        AND fecha_limite > NOW()
    `, [idUsuario, idOponente, idOponente, idUsuario]);

    if (duelosActivos.length > 0) {
      return res.json({ existe_duelo: true, mensaje: 'Ya existe un duelo activo con este jugador', duelo: duelosActivos[0] });
    }
    res.json({ existe_duelo: false });
  } catch (error) {
    console.error('❌ Error verificando duelo:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// =============================================
// ⚔️ CREAR DESAFÍO GENERAL (Sin carrera)
// =============================================
router.post('/desafiar/duelo-general/:idOponente', async (req, res) => {
  if (!req.session.user) return res.status(401).json({ message: 'No autorizado' });
  const { idOponente } = req.params;
  const { id_dificultad, apuesta } = req.body;
  const { id_usuario: idRemitente, username: usernameRemitente } = req.session.user;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    if (!DIFICULTADES[id_dificultad]) {
      await conn.rollback(); conn.release();
      return res.status(400).json({ message: 'Dificultad inválida' });
    }
    const dificultadConfig = DIFICULTADES[id_dificultad];
    if (parseInt(apuesta) !== dificultadConfig.apuesta) {
      await conn.rollback(); conn.release();
      return res.status(400).json({ message: `La apuesta debe ser ${dificultadConfig.apuesta} puntos` });
    }

    const [puntosUsuario] = await conn.query('SELECT puntos FROM usuario WHERE id_usuario = ?', [idRemitente]);
    if (!puntosUsuario.length) { await conn.rollback(); conn.release(); return res.status(404).json({ message: 'Usuario no encontrado' }); }
    if (puntosUsuario[0].puntos < apuesta) {
      await conn.rollback(); conn.release();
      return res.status(400).json({ message: `No tienes suficientes puntos. Necesitas ${apuesta}, tienes ${puntosUsuario[0].puntos}` });
    }

    const [carrerasComunes] = await conn.query(`
      SELECT COUNT(*) as carreras_comunes FROM usuario_carrera uc1
      INNER JOIN usuario_carrera uc2 ON uc1.id_carrera = uc2.id_carrera
      WHERE uc1.id_usuario = ? AND uc2.id_usuario = ?
    `, [idRemitente, idOponente]);
    if (carrerasComunes[0].carreras_comunes === 0) {
      await conn.rollback(); conn.release();
      return res.status(400).json({ message: 'No puedes desafiar a este jugador porque no tienen carreras en común' });
    }

    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    const id_duelo = `duelo_general_${timestamp}_${random}`;

    const [preguntas] = await conn.query(`
      SELECT DISTINCT p.id_pregunta, p.pregunta FROM pregunta p
      WHERE p.id_dificultad = ? AND p.id_carrera IS NULL
        AND p.id_pregunta IN (SELECT id_pregunta FROM respuesta GROUP BY id_pregunta HAVING COUNT(*) >= 2)
      ORDER BY RAND() LIMIT ?
    `, [id_dificultad, dificultadConfig.preguntas]);

    if (preguntas.length < dificultadConfig.preguntas) {
      await conn.rollback(); conn.release();
      return res.status(500).json({ message: `No hay suficientes preguntas generales de dificultad "${dificultadConfig.nombre}"` });
    }

    await conn.query(`
      INSERT INTO duelos (id_duelo, id_retador, id_defensor, id_carrera, dificultad, apuesta, fecha_inicio, fecha_limite, estado, tipo_duelo)
      VALUES (?, ?, ?, NULL, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 48 HOUR), 'activo', 'general')
    `, [id_duelo, idRemitente, idOponente, id_dificultad, apuesta]);

    // ✅ FIX: Limpiar preguntas previas antes de insertar (evita acumulación)
    await conn.query('DELETE FROM duelos_preguntas WHERE id_duelo = ?', [id_duelo]);

    for (let i = 0; i < preguntas.length; i++) {
      await conn.query('INSERT INTO duelos_preguntas (id_duelo, id_pregunta, orden) VALUES (?, ?, ?)',
        [id_duelo, preguntas[i].id_pregunta, i + 1]);
    }

    const extraData = {
      remitente: { id_usuario: idRemitente, username: usernameRemitente, foto_perfil: req.session.user.foto_perfil },
      id_duelo, dificultad: dificultadConfig.nombre, apuesta, tipo_duelo: 'general', id_carrera: null, tiempoLimite: 48 * 60 * 60
    };
    await conn.query(`
      INSERT INTO notificaciones (id_usuario_destinatario, id_usuario_remitente, tipo, mensaje, extra_data)
      VALUES (?, ?, 'desafio_duelo', ?, ?)
    `, [idOponente, idRemitente,
      `${usernameRemitente} te desafía a un Duelo GENERAL ${dificultadConfig.nombre} (${apuesta} pts)`,
      JSON.stringify(extraData)]);

    await conn.commit(); conn.release();

    if (req.io) req.io.to(idOponente.toString()).emit('notificacion_recibida');

    res.json({ success: true, message: '¡Desafío General enviado!', id_duelo, dificultad: dificultadConfig.nombre, apuesta, tipo: 'general' });
  } catch (err) {
    try { await conn.rollback(); } catch(e) {}
    conn.release();
    console.error('❌ [DUELO GENERAL] Error:', err);
    res.status(500).json({ message: 'Error del servidor: ' + err.message });
  }
});

// =============================================
// 📚 CREAR DESAFÍO DE CARRERA
// =============================================
router.post('/desafiar/duelo-carrera/:idOponente', async (req, res) => {
  if (!req.session.user) return res.status(401).json({ message: 'No autorizado' });
  const { idOponente } = req.params;
  const { id_dificultad, apuesta, id_carrera } = req.body;
  const { id_usuario: idRemitente, username: usernameRemitente } = req.session.user;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    if (!DIFICULTADES[id_dificultad]) {
      await conn.rollback(); conn.release();
      return res.status(400).json({ message: 'Dificultad inválida' });
    }
    const dificultadConfig = DIFICULTADES[id_dificultad];
    if (parseInt(apuesta) !== dificultadConfig.apuesta) {
      await conn.rollback(); conn.release();
      return res.status(400).json({ message: `La apuesta debe ser ${dificultadConfig.apuesta} puntos` });
    }

    const [carreraExiste] = await conn.query('SELECT id_carrera, descripcion FROM carrera WHERE id_carrera = ?', [id_carrera]);
    if (!carreraExiste.length) { await conn.rollback(); conn.release(); return res.status(400).json({ message: 'Carrera no válida' }); }
    const nombreCarrera = carreraExiste[0].descripcion;

    const [puntosRetador] = await conn.query('SELECT puntos FROM usuario_puntos_carrera WHERE id_usuario = ? AND id_carrera = ?', [idRemitente, id_carrera]);
    if (!puntosRetador.length) { await conn.rollback(); conn.release(); return res.status(400).json({ message: 'No tienes puntos en esta carrera' }); }
    if (puntosRetador[0].puntos < apuesta) {
      await conn.rollback(); conn.release();
      return res.status(400).json({ message: `No tienes suficientes puntos de carrera. Necesitas ${apuesta}, tienes ${puntosRetador[0].puntos}` });
    }

    const [puntosDefensor] = await conn.query('SELECT puntos FROM usuario_puntos_carrera WHERE id_usuario = ? AND id_carrera = ?', [idOponente, id_carrera]);
    if (!puntosDefensor.length) { await conn.rollback(); conn.release(); return res.status(400).json({ message: 'El oponente no tiene esta carrera' }); }

    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    const id_duelo = `duelo_carrera_${timestamp}_${random}`;

    const [preguntas] = await conn.query(`
      SELECT DISTINCT p.id_pregunta, p.pregunta, p.puntos_carrera FROM pregunta p
      WHERE p.id_carrera = ? AND p.id_dificultad = ?
        AND p.id_pregunta IN (SELECT id_pregunta FROM respuesta GROUP BY id_pregunta HAVING COUNT(*) >= 2)
      ORDER BY RAND() LIMIT ?
    `, [id_carrera, id_dificultad, dificultadConfig.preguntas]);

    if (preguntas.length < dificultadConfig.preguntas) {
      await conn.rollback(); conn.release();
      return res.status(500).json({ message: `No hay suficientes preguntas de "${dificultadConfig.nombre}" en ${nombreCarrera}` });
    }

    await conn.query(`
      INSERT INTO duelos (id_duelo, id_retador, id_defensor, id_carrera, dificultad, apuesta, fecha_inicio, fecha_limite, estado, tipo_duelo)
      VALUES (?, ?, ?, ?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 48 HOUR), 'activo', 'carrera')
    `, [id_duelo, idRemitente, idOponente, id_carrera, id_dificultad, apuesta]);

    // ✅ FIX: Limpiar preguntas previas antes de insertar (evita acumulación)
    await conn.query('DELETE FROM duelos_preguntas WHERE id_duelo = ?', [id_duelo]);

    for (let i = 0; i < preguntas.length; i++) {
      await conn.query('INSERT INTO duelos_preguntas (id_duelo, id_pregunta, orden) VALUES (?, ?, ?)',
        [id_duelo, preguntas[i].id_pregunta, i + 1]);
    }

    const extraData = {
      remitente: { id_usuario: idRemitente, username: usernameRemitente, foto_perfil: req.session.user.foto_perfil },
      id_duelo, dificultad: dificultadConfig.nombre, apuesta, tipo_duelo: 'carrera', id_carrera, nombre_carrera: nombreCarrera, tiempoLimite: 48 * 60 * 60
    };
    await conn.query(`
      INSERT INTO notificaciones (id_usuario_destinatario, id_usuario_remitente, tipo, mensaje, extra_data)
      VALUES (?, ?, 'desafio_duelo', ?, ?)
    `, [idOponente, idRemitente,
      `${usernameRemitente} te desafía en ${nombreCarrera} - ${dificultadConfig.nombre} (${apuesta} pts)`,
      JSON.stringify(extraData)]);

    await conn.commit(); conn.release();

    if (req.io) req.io.to(idOponente.toString()).emit('notificacion_recibida');

    res.json({ success: true, message: `¡Desafío de Carrera en ${nombreCarrera} enviado!`, id_duelo, dificultad: dificultadConfig.nombre, apuesta, tipo: 'carrera', carrera: nombreCarrera });
  } catch (err) {
    try { await conn.rollback(); } catch(e) {}
    conn.release();
    console.error('❌ [DESAFÍO CARRERA] Error:', err);
    res.status(500).json({ message: 'Error: ' + err.message });
  }
});

// =============================================
// 📝 CARGAR EXAMEN DEL DUELO
// =============================================
router.get('/duelo/examen/:salaId', async (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  const { salaId } = req.params;
  const userId = req.session.user.id_usuario;

  try {
    const [duelos] = await pool.query(`
      SELECT d.*, u1.username as retador_username, u2.username as defensor_username
      FROM duelos d
      LEFT JOIN usuario u1 ON d.id_retador = u1.id_usuario
      LEFT JOIN usuario u2 ON d.id_defensor = u2.id_usuario
      WHERE d.id_duelo = ? AND (d.id_retador = ? OR d.id_defensor = ?)
    `, [salaId, userId, userId]);

    if (!duelos.length) return res.redirect('/portal?error=duelo_no_encontrado');
    const duelo = duelos[0];
    const esRetador = duelo.id_retador === userId;

    if ((esRetador && duelo.respondido_retador) || (!esRetador && duelo.respondido_oponente)) {
      return res.redirect(`/duelo/resultados/${salaId}?mensaje=Ya completaste este examen`);
    }
    if (new Date() > new Date(duelo.fecha_limite)) {
      return res.redirect(`/duelo/resultados/${salaId}?mensaje=Tiempo expirado`);
    }

    const [preguntas] = await pool.query(`
      SELECT p.id_pregunta, p.pregunta, p.id_carrera, dp.orden
      FROM duelos_preguntas dp
      INNER JOIN pregunta p ON dp.id_pregunta = p.id_pregunta
      WHERE dp.id_duelo = ?
      ORDER BY dp.orden
    `, [salaId]);

    if (!preguntas.length) return res.redirect('/portal?error=no_hay_preguntas');

    for (let pregunta of preguntas) {
      const [respuestas] = await pool.query(`
        SELECT id_respuesta, respuesta, correcta FROM respuesta WHERE id_pregunta = ? ORDER BY RAND()
      `, [pregunta.id_pregunta]);
      pregunta.respuestas = respuestas;
    }

    res.render('examen-duelo-individual', {
      layout: 'main',
      user: req.session.user,
      duelo: { ...duelo, dificultad_nombre: DIFICULTADES[duelo.dificultad]?.nombre || 'Desconocida' },
      preguntas,
      esRetador,
      tiempoRestante: Math.max(0, new Date(duelo.fecha_limite) - new Date())
    });
  } catch (error) {
    console.error('❌ [EXAMEN] Error:', error);
    res.redirect('/portal?error=error_servidor');
  }
});

// =============================================
// 💾 GUARDAR RESPUESTAS
// =============================================
router.post('/duelo/responder/:salaId', async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'No autorizado' });
  const { salaId } = req.params;
  const { respuestas } = req.body;
  const id_usuario = req.session.user.id_usuario;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const respuestasObj = typeof respuestas === 'string' ? JSON.parse(respuestas) : respuestas;

    const [duelos] = await conn.query(`
      SELECT * FROM duelos WHERE id_duelo = ? AND (id_retador = ? OR id_defensor = ?)
    `, [salaId, id_usuario, id_usuario]);

    if (!duelos.length) { await conn.rollback(); conn.release(); return res.status(404).json({ error: 'Duelo no encontrado' }); }
    const duelo = duelos[0];
    const esRetador = duelo.id_retador === id_usuario;

    if ((esRetador && duelo.respondido_retador) || (!esRetador && duelo.respondido_oponente)) {
      await conn.rollback(); conn.release();
      return res.status(400).json({ error: 'Ya completaste este examen' });
    }

    await conn.query('DELETE FROM duelos_respuestas WHERE id_duelo = ? AND id_usuario = ?', [salaId, id_usuario]);

    for (const [id_pregunta, id_respuesta] of Object.entries(respuestasObj)) {
      await conn.query('INSERT INTO duelos_respuestas (id_duelo, id_usuario, id_pregunta, id_respuesta) VALUES (?, ?, ?, ?)',
        [salaId, id_usuario, id_pregunta, id_respuesta]);
    }

    if (esRetador) {
      await conn.query('UPDATE duelos SET respondido_retador = 1 WHERE id_duelo = ?', [salaId]);
    } else {
      await conn.query('UPDATE duelos SET respondido_oponente = 1 WHERE id_duelo = ?', [salaId]);
    }

    await actualizarNotificacionesAlTerminar(salaId, conn);
    await conn.commit(); conn.release();

    res.redirect(`/duelo/resultados/${salaId}`);
  } catch (error) {
    await conn.rollback(); conn.release();
    console.error('❌ Error guardando respuestas:', error);
    res.status(500).json({ error: 'Error del servidor: ' + error.message });
  }
});

// =============================================
// 🏆 RESULTADOS DEL DUELO
// =============================================
router.get('/duelo/resultados/:salaId', async (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  const { salaId } = req.params;
  const idUsuario = req.session.user.id_usuario;

  console.log(`[RESULTADOS] ==========================================`);
  console.log(`[RESULTADOS] 📊 Sala: ${salaId}, Usuario: ${idUsuario}`);

  try {
    const [duelos] = await pool.query(`
      SELECT d.*, u1.username as retador_username, u1.id_usuario as retador_id,
        u2.username as defensor_username, u2.id_usuario as defensor_id,
        c.descripcion as nombre_carrera
      FROM duelos d
      LEFT JOIN usuario u1 ON d.id_retador = u1.id_usuario
      LEFT JOIN usuario u2 ON d.id_defensor = u2.id_usuario
      LEFT JOIN carrera c ON d.id_carrera = c.id_carrera
      WHERE d.id_duelo = ?
    `, [salaId]);

    if (!duelos.length) return res.redirect('/portal?error=duelo_no_encontrado');
    const duelo = duelos[0];
    const esRetador = duelo.id_retador === idUsuario;
    const esDueloCarrera = duelo.id_carrera !== null && duelo.tipo_duelo === 'carrera';
    const idOponente = esRetador ? duelo.id_defensor : duelo.id_retador;

    const [todasPreguntas] = await pool.query(`
      SELECT dp.id_pregunta, p.pregunta, p.puntos_carrera, dp.orden
      FROM duelos_preguntas dp
      INNER JOIN pregunta p ON dp.id_pregunta = p.id_pregunta
      WHERE dp.id_duelo = ?
      ORDER BY dp.orden
    `, [salaId]);

    if (!todasPreguntas.length) return res.redirect('/portal?error=sin_preguntas');

    const [misRespuestas] = await pool.query(`
      SELECT dr.id_pregunta, dr.id_respuesta, r.respuesta as texto_respuesta, r.correcta as es_correcta
      FROM duelos_respuestas dr
      INNER JOIN respuesta r ON dr.id_respuesta = r.id_respuesta
      WHERE dr.id_duelo = ? AND dr.id_usuario = ?
    `, [salaId, idUsuario]);

    const [respuestasOponente] = await pool.query(`
      SELECT dr.id_pregunta, dr.id_respuesta, r.respuesta as texto_respuesta, r.correcta as es_correcta
      FROM duelos_respuestas dr
      INNER JOIN respuesta r ON dr.id_respuesta = r.id_respuesta
      WHERE dr.id_duelo = ? AND dr.id_usuario = ?
    `, [salaId, idOponente]);

    const mapaMisRespuestas = {};
    misRespuestas.forEach(r => { mapaMisRespuestas[r.id_pregunta] = r; });
    const mapaRespuestasOponente = {};
    respuestasOponente.forEach(r => { mapaRespuestasOponente[r.id_pregunta] = r; });

    const respuestasCombinadas = todasPreguntas.map((pregunta, index) => {
      const miResp = mapaMisRespuestas[pregunta.id_pregunta];
      const respOp = mapaRespuestasOponente[pregunta.id_pregunta];
      return {
        orden: index + 1,
        pregunta: pregunta.pregunta,
        mi_respuesta_texto: miResp ? miResp.texto_respuesta : null,
        mi_correcta: miResp ? miResp.es_correcta : false,
        mi_respondio: !!miResp,
        oponente_respuesta_texto: respOp ? respOp.texto_respuesta : null,
        oponente_correcta: respOp ? respOp.es_correcta : false,
        oponente_respondio: !!respOp
      };
    });

    const miPuntaje = respuestasCombinadas.filter(r => r.mi_respondio && r.mi_correcta).length;
    const oponentePuntaje = respuestasCombinadas.filter(r => r.oponente_respondio && r.oponente_correcta).length;

    const miPuntosCarrera = esDueloCarrera
      ? todasPreguntas.reduce((sum, p) => {
          const miResp = mapaMisRespuestas[p.id_pregunta];
          return sum + (miResp && miResp.es_correcta ? (p.puntos_carrera || 0) : 0);
        }, 0) : 0;

    const oponentePuntosCarrera = esDueloCarrera
      ? todasPreguntas.reduce((sum, p) => {
          const respOp = mapaRespuestasOponente[p.id_pregunta];
          return sum + (respOp && respOp.es_correcta ? (p.puntos_carrera || 0) : 0);
        }, 0) : 0;

    console.log(`[RESULTADOS] 🎯 Mi puntaje: ${miPuntaje}/${todasPreguntas.length}`);
    console.log(`[RESULTADOS] 🎯 Oponente: ${oponentePuntaje}/${todasPreguntas.length}`);

    // ✅ SIEMPRE releer el estado actualizado del duelo para saber si ambos terminaron
    const [dueloActualizado] = await pool.query(
      'SELECT estado, respondido_retador, respondido_oponente FROM duelos WHERE id_duelo = ?',
      [salaId]
    );
    const estadoActual = dueloActualizado[0]?.estado;
    const ambosTerminaron = dueloActualizado[0]?.respondido_retador && dueloActualizado[0]?.respondido_oponente;

    const nombreOponente = esRetador ? duelo.defensor_username : duelo.retador_username;
    let resultado = null;
    let puntosGanados = 0;
    let puntosCarreraGanados = 0;

    if (ambosTerminaron) {
      if (estadoActual !== 'finalizado') {
        // ✅ Aún no finalizado: finalizar ahora
        resultado = await finalizarDueloConCarrera(
          salaId, duelo, idUsuario, idOponente,
          miPuntaje, oponentePuntaje,
          miPuntosCarrera, oponentePuntosCarrera
        );
        // ✅ FIX: usar los valores directamente del resultado, sin condición esDueloCarrera
        // La función ya devuelve el campo correcto según el tipo de duelo
        puntosGanados = toNumber(resultado.puntosGanados);
        puntosCarreraGanados = toNumber(resultado.puntosCarreraGanados);
      } else {
        // ✅ FIX PRINCIPAL: Duelo ya finalizado — leer puntos del historial correctamente
        const [historial] = await pool.query(
          'SELECT * FROM historial_duelos WHERE id_duelo = ? ORDER BY fecha_duelo DESC LIMIT 1',
          [salaId]
        );
        if (historial.length > 0) {
          const hist = historial[0];
          // ✅ Determinar si soy el retador en el historial
          const soyRetadorEnHistorial = hist.id_retador === idUsuario;
          // ✅ Leer el delta de puntos correcto (puede ser positivo o negativo)
          const puntosDelta = toNumber(soyRetadorEnHistorial ? hist.puntos_retador : hist.puntos_defensor);

          resultado = { ganador: hist.id_ganador, esDueloCarrera };

          if (esDueloCarrera) {
            puntosCarreraGanados = puntosDelta;   // positivo = ganó, negativo = perdió
          } else {
            puntosGanados = puntosDelta;           // positivo = ganó, negativo = perdió
          }
        }
      }
    }

    // Limpiar notificaciones
    try {
      await pool.query(`
        DELETE FROM notificaciones
        WHERE (id_usuario_destinatario = ? OR id_usuario_remitente = ?)
          AND tipo = 'desafio_duelo'
          AND JSON_EXTRACT(extra_data, '$.id_duelo') = ?
      `, [idUsuario, idUsuario, salaId]);
    } catch (cleanupError) {
      console.warn('⚠️ No se pudieron limpiar las notificaciones');
    }

    console.log(`[RESULTADOS] puntosGanados: ${puntosGanados}, puntosCarreraGanados: ${puntosCarreraGanados}`);
    console.log(`[RESULTADOS] ==========================================`);

    res.render('resultados-duelo', {
      layout: 'main',
      user: req.session.user,
      duelo: { ...duelo, nombre_carrera: duelo.nombre_carrera || null },
      tipoDuelo: esDueloCarrera ? 'carrera' : 'general',
      miPuntaje,
      oponentePuntaje,
      nombreOponente,
      respuestas: respuestasCombinadas,
      ambosTerminaron,
      esRetador,
      correctas: miPuntaje,
      totalPreguntas: todasPreguntas.length,
      puntosGanados,           // puede ser positivo (ganó) o negativo (perdió) o 0 (empate)
      puntosCarreraGanados,    // igual
      dificultad: DIFICULTADES[duelo.dificultad]?.nombre || 'Desconocida',
      apuesta: duelo.apuesta
    });
  } catch (error) {
    console.error('❌ [RESULTADOS] Error:', error);
    res.status(500).send(`<h1>Error al mostrar resultados</h1><p>${error.message}</p><a href="/portal">Volver al portal</a>`);
  }
});

// =============================================
// 🏁 FINALIZAR DUELO CON CARRERA
// =============================================
async function finalizarDueloConCarrera(
  salaId, duelo, idUsuario, idOponente,
  miPuntaje, oponentePuntaje,
  miPuntosCarrera, oponentePuntosCarrera
) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    console.log(`[FINALIZAR DUELO] 🏁 Iniciando finalización...`);

    const esRetador = duelo.id_retador === idUsuario;
    const apuesta = duelo.apuesta;
    const esDueloCarrera = duelo.id_carrera !== null && duelo.tipo_duelo === 'carrera';

    const [totalPreguntasRes] = await conn.query('SELECT COUNT(*) as total FROM duelos_preguntas WHERE id_duelo = ?', [salaId]);
    const numPreguntas = totalPreguntasRes[0].total;

    const correctasRetador = esRetador ? miPuntaje : oponentePuntaje;
    const correctasDefensor = esRetador ? oponentePuntaje : miPuntaje;
    const porcentajeRetador = numPreguntas > 0 ? ((correctasRetador / numPreguntas) * 100).toFixed(2) : 0;
    const porcentajeDefensor = numPreguntas > 0 ? ((correctasDefensor / numPreguntas) * 100).toFixed(2) : 0;

    let idGanador = null;
    let puntosRetador = 0;
    let puntosDefensor = 0;
    let puntosCarreraRetador = 0;
    let puntosCarreraDefensor = 0;

    if (correctasRetador > correctasDefensor) idGanador = duelo.id_retador;
    else if (correctasDefensor > correctasRetador) idGanador = duelo.id_defensor;

    if (esDueloCarrera) {
      if (idGanador === duelo.id_retador) {
        puntosCarreraRetador = apuesta;
        puntosCarreraDefensor = -apuesta;
      } else if (idGanador === duelo.id_defensor) {
        puntosCarreraDefensor = apuesta;
        puntosCarreraRetador = -apuesta;
      }

      const [pRetActual] = await conn.query('SELECT puntos FROM usuario_puntos_carrera WHERE id_usuario = ? AND id_carrera = ?', [duelo.id_retador, duelo.id_carrera]);
      const pRetNuevo = Math.max(0, (pRetActual[0]?.puntos || 0) + puntosCarreraRetador);
      await conn.query('INSERT INTO usuario_puntos_carrera (id_usuario, id_carrera, puntos) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE puntos = ?',
        [duelo.id_retador, duelo.id_carrera, pRetNuevo, pRetNuevo]);

      const [pDefActual] = await conn.query('SELECT puntos FROM usuario_puntos_carrera WHERE id_usuario = ? AND id_carrera = ?', [duelo.id_defensor, duelo.id_carrera]);
      const pDefNuevo = Math.max(0, (pDefActual[0]?.puntos || 0) + puntosCarreraDefensor);
      await conn.query('INSERT INTO usuario_puntos_carrera (id_usuario, id_carrera, puntos) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE puntos = ?',
        [duelo.id_defensor, duelo.id_carrera, pDefNuevo, pDefNuevo]);
    } else {
      if (idGanador === duelo.id_retador) {
        puntosRetador = apuesta;
        puntosDefensor = -apuesta;
      } else if (idGanador === duelo.id_defensor) {
        puntosDefensor = apuesta;
        puntosRetador = -apuesta;
      }
      await conn.query('UPDATE usuario SET puntos = GREATEST(0, puntos + ?) WHERE id_usuario = ?', [puntosRetador, duelo.id_retador]);
      await conn.query('UPDATE usuario SET puntos = GREATEST(0, puntos + ?) WHERE id_usuario = ?', [puntosDefensor, duelo.id_defensor]);
    }

    await conn.query(`
      INSERT INTO historial_duelos
        (id_duelo, id_retador, id_defensor, id_ganador, puntos_retador, puntos_defensor,
         total_preguntas, correctas_retador, correctas_defensor, porcentaje_retador, porcentaje_defensor, fecha_duelo, tipo_duelo)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)
    `, [
      salaId, duelo.id_retador, duelo.id_defensor, idGanador,
      esDueloCarrera ? puntosCarreraRetador : puntosRetador,
      esDueloCarrera ? puntosCarreraDefensor : puntosDefensor,
      numPreguntas, correctasRetador, correctasDefensor,
      porcentajeRetador, porcentajeDefensor,
      esDueloCarrera ? 'carrera' : 'general'
    ]);

    await conn.query('UPDATE duelos SET estado = ? WHERE id_duelo = ?', ['finalizado', salaId]);
    await conn.query("DELETE FROM notificaciones WHERE tipo = 'desafio_duelo' AND JSON_EXTRACT(extra_data, '$.id_duelo') = ?", [salaId]);

    const [retadorInfo] = await conn.query('SELECT username FROM usuario WHERE id_usuario = ?', [duelo.id_retador]);
    const [defensorInfo] = await conn.query('SELECT username FROM usuario WHERE id_usuario = ?', [duelo.id_defensor]);
    const retadorUsername = retadorInfo[0]?.username || 'Jugador';
    const defensorUsername = defensorInfo[0]?.username || 'Jugador';

    let mensajeRetador, mensajeDefensor;
    if (idGanador === duelo.id_retador) {
      mensajeRetador = `🏆 ¡Victoria! Derrotaste a ${defensorUsername} (${correctasRetador}/${numPreguntas}) +${Math.abs(esDueloCarrera ? puntosCarreraRetador : puntosRetador)} pts`;
      mensajeDefensor = `😔 Derrota ante ${retadorUsername} (${correctasDefensor}/${numPreguntas}) ${esDueloCarrera ? puntosCarreraDefensor : puntosDefensor} pts`;
    } else if (idGanador === duelo.id_defensor) {
      mensajeRetador = `😔 Derrota ante ${defensorUsername} (${correctasRetador}/${numPreguntas}) ${esDueloCarrera ? puntosCarreraRetador : puntosRetador} pts`;
      mensajeDefensor = `🏆 ¡Victoria! Derrotaste a ${retadorUsername} (${correctasDefensor}/${numPreguntas}) +${Math.abs(esDueloCarrera ? puntosCarreraDefensor : puntosDefensor)} pts`;
    } else {
      mensajeRetador = `🤝 Empate con ${defensorUsername} (${correctasRetador}/${numPreguntas})`;
      mensajeDefensor = `🤝 Empate con ${retadorUsername} (${correctasDefensor}/${numPreguntas})`;
    }

    await conn.query(`INSERT INTO notificaciones (id_usuario_destinatario, id_usuario_remitente, tipo, mensaje, extra_data) VALUES (?, ?, 'resultado_duelo', ?, ?)`,
      [duelo.id_retador, duelo.id_defensor, mensajeRetador, JSON.stringify({ id_duelo: salaId, resultado: idGanador === duelo.id_retador ? 'victoria' : (idGanador ? 'derrota' : 'empate'), correctas: correctasRetador, total: numPreguntas })]);
    await conn.query(`INSERT INTO notificaciones (id_usuario_destinatario, id_usuario_remitente, tipo, mensaje, extra_data) VALUES (?, ?, 'resultado_duelo', ?, ?)`,
      [duelo.id_defensor, duelo.id_retador, mensajeDefensor, JSON.stringify({ id_duelo: salaId, resultado: idGanador === duelo.id_defensor ? 'victoria' : (idGanador ? 'derrota' : 'empate'), correctas: correctasDefensor, total: numPreguntas })]);

    await conn.commit(); conn.release();
    console.log(`[FINALIZAR DUELO] ✅ Completado`);

    // ✅ Retornar los puntos correctos según quién es el usuario actual
    return {
      puntosGanados: !esDueloCarrera ? (esRetador ? puntosRetador : puntosDefensor) : 0,
      puntosCarreraGanados: esDueloCarrera ? (esRetador ? puntosCarreraRetador : puntosCarreraDefensor) : 0,
      ganador: idGanador,
      esDueloCarrera
    };
  } catch (error) {
    await conn.rollback(); conn.release();
    console.error('❌ [FINALIZAR DUELO] Error:', error);
    throw error;
  }
}

// =============================================
// 🚪 ABANDONAR DUELO
// =============================================
router.post('/duelo/confirmarRendicion/:salaId', async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'No autorizado' });
  const { salaId } = req.params;
  const { motivo } = req.body;
  const idUsuario = req.session.user.id_usuario;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [duelo] = await conn.query('SELECT * FROM duelos WHERE id_duelo = ? AND (id_retador = ? OR id_defensor = ?)', [salaId, idUsuario, idUsuario]);
    if (!duelo.length) { await conn.rollback(); conn.release(); return res.status(404).json({ error: 'Duelo no encontrado' }); }

    const dueloData = duelo[0];
    const apuesta = dueloData.apuesta;
    const esRetador = dueloData.id_retador === idUsuario;
    const idOponente = esRetador ? dueloData.id_defensor : dueloData.id_retador;
    const esDueloCarrera = dueloData.id_carrera !== null && dueloData.tipo_duelo === 'carrera';

    let porcentajePenalizacion = PENALIZACIONES.ABANDONO_VOLUNTARIO;
    let descripcionMotivo = 'Abandono';
    switch (motivo) {
      case 'voluntario': case 'rendirse': porcentajePenalizacion = PENALIZACIONES.ABANDONO_VOLUNTARIO; descripcionMotivo = 'Abandono voluntario'; break;
      case 'desconexion': porcentajePenalizacion = PENALIZACIONES.DESCONEXION; descripcionMotivo = 'Desconexión'; break;
      case 'navegacion': porcentajePenalizacion = 1.0; descripcionMotivo = 'Cierre de navegador'; break;
    }

    const penalizacion = Math.floor(apuesta * porcentajePenalizacion);

    if (esDueloCarrera) {
      const [puntosCarrera] = await conn.query('SELECT puntos FROM usuario_puntos_carrera WHERE id_usuario = ? AND id_carrera = ?', [idUsuario, dueloData.id_carrera]);
      const puntosActuales = puntosCarrera[0]?.puntos || 0;
      const penalizacionFinal = Math.min(penalizacion, puntosActuales);
      await conn.query('INSERT INTO usuario_puntos_carrera (id_usuario, id_carrera, puntos) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE puntos = ?',
        [idUsuario, dueloData.id_carrera, Math.max(0, puntosActuales - penalizacionFinal), Math.max(0, puntosActuales - penalizacionFinal)]);
      const [puntosOp] = await conn.query('SELECT puntos FROM usuario_puntos_carrera WHERE id_usuario = ? AND id_carrera = ?', [idOponente, dueloData.id_carrera]);
      const pOpNuevo = (puntosOp[0]?.puntos || 0) + penalizacionFinal;
      await conn.query('INSERT INTO usuario_puntos_carrera (id_usuario, id_carrera, puntos) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE puntos = ?',
        [idOponente, dueloData.id_carrera, pOpNuevo, pOpNuevo]);
    } else {
      await conn.query('UPDATE usuario SET puntos = GREATEST(0, puntos - ?) WHERE id_usuario = ?', [penalizacion, idUsuario]);
      await conn.query('UPDATE usuario SET puntos = puntos + ? WHERE id_usuario = ?', [penalizacion, idOponente]);
    }

    await conn.query(`
      INSERT INTO historial_duelos (id_duelo, id_retador, id_defensor, id_ganador, puntos_retador, puntos_defensor, fecha_duelo, motivo_abandono, penalizacion_aplicada, tipo_duelo)
      VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?)
    `, [salaId, dueloData.id_retador, dueloData.id_defensor, idOponente,
      esRetador ? -penalizacion : penalizacion,
      esRetador ? penalizacion : -penalizacion,
      descripcionMotivo, penalizacion, esDueloCarrera ? 'carrera' : 'general']);

    await conn.query('UPDATE duelos SET estado = ? WHERE id_duelo = ?', ['abandonado', salaId]);
    await conn.query('DELETE FROM duelos_preguntas WHERE id_duelo = ?', [salaId]);
    await conn.query('DELETE FROM duelos_respuestas WHERE id_duelo = ?', [salaId]);

    const [abandonador] = await conn.query('SELECT username FROM usuario WHERE id_usuario = ?', [idUsuario]);
    const nombreAbandono = abandonador[0]?.username || 'Usuario';

    await conn.query(`INSERT INTO notificaciones (id_usuario_destinatario, id_usuario_remitente, tipo, mensaje, extra_data) VALUES (?, ?, 'duelo_abandonado', ?, ?)`,
      [idOponente, idUsuario,
        `¡${nombreAbandono} abandonó el duelo! Ganaste ${penalizacion} puntos ${esDueloCarrera ? 'de carrera' : 'globales'} 🏆`,
        JSON.stringify({ id_duelo: salaId, motivo: descripcionMotivo, ganancia: penalizacion, tipo_duelo: esDueloCarrera ? 'carrera' : 'general' })]);

    await conn.commit(); conn.release();

    if (req.io) {
      req.io.to(idOponente.toString()).emit('duelo:oponenteAbandono', { ganaste: true, mensaje: `${nombreAbandono} ha abandonado el duelo`, gananciaOponente: penalizacion, motivo: descripcionMotivo, salaId, tipoDuelo: esDueloCarrera ? 'carrera' : 'general' });
      req.io.to(idOponente.toString()).emit('notificacion_recibida');
    }

    res.json({ success: true, message: `Has abandonado el duelo. Perdiste ${penalizacion} puntos ${esDueloCarrera ? 'de carrera' : 'globales'}`, penalizacion, gananciaOponente: penalizacion, motivo: descripcionMotivo, tipoDuelo: esDueloCarrera ? 'carrera' : 'general' });
  } catch (error) {
    try { await conn.rollback(); } catch(e) {}
    conn.release();
    console.error('❌ [ABANDONO] Error:', error);
    res.status(500).json({ error: 'Error al abandonar duelo: ' + error.message });
  }
});

// =============================================
// 🔄 VOLVER SIN INICIAR DUELO
// =============================================
router.post('/duelo/volver/:salaId', async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'No autorizado' });
  const { salaId } = req.params;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [dueloRows] = await conn.query('SELECT * FROM duelos WHERE id_duelo = ?', [salaId]);
    if (!dueloRows.length) { await conn.rollback(); conn.release(); return res.status(404).json({ error: 'Duelo no encontrado' }); }
    const duelo = dueloRows[0];
    if (duelo.respondido_retador || duelo.respondido_oponente) {
      await conn.rollback(); conn.release();
      return res.status(400).json({ error: 'No puedes volver porque alguien ya inició el duelo' });
    }
    await conn.query('DELETE FROM duelos_preguntas WHERE id_duelo = ?', [salaId]);
    await conn.query('DELETE FROM duelos_respuestas WHERE id_duelo = ?', [salaId]);
    await conn.query('DELETE FROM duelos WHERE id_duelo = ?', [salaId]);
    await conn.query("DELETE FROM notificaciones WHERE tipo = 'desafio_duelo' AND JSON_EXTRACT(extra_data, '$.id_duelo') = ?", [salaId]);
    await conn.commit(); conn.release();
    res.json({ success: true, message: 'Has vuelto al portal sin penalización' });
  } catch (error) {
    await conn.rollback(); conn.release();
    console.error('❌ Error procesando volver:', error);
    res.status(500).json({ error: 'Error al procesar volver' });
  }
});

// =============================================
// 📊 HISTORIAL DE DUELOS
// =============================================
router.get('/api/usuario/historial', async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'No autorizado' });
  try {
    const [historial] = await pool.query(`
      SELECT h.*, u1.username as retador_username, u1.foto_perfil as retador_foto,
        u2.username as defensor_username, u2.foto_perfil as defensor_foto,
        ug.username as ganador_username, d.dificultad, d.apuesta
      FROM historial_duelos h
      LEFT JOIN usuario u1 ON h.id_retador = u1.id_usuario
      LEFT JOIN usuario u2 ON h.id_defensor = u2.id_usuario
      LEFT JOIN usuario ug ON h.id_ganador = ug.id_usuario
      LEFT JOIN duelos d ON h.id_duelo = d.id_duelo
      WHERE h.id_retador = ? OR h.id_defensor = ?
      ORDER BY h.fecha_duelo DESC LIMIT 50
    `, [req.session.user.id_usuario, req.session.user.id_usuario]);
    res.json(historial);
  } catch (error) {
    console.error('❌ Error obteniendo historial:', error);
    res.status(500).json({ error: 'Error al obtener historial' });
  }
});

// =============================================
// 🎯 OBTENER MIS DUELOS ACTIVOS
// =============================================
router.get('/api/duelo/mis-duelos-activos', async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'No autorizado' });
  try {
    const idUsuario = req.session.user.id_usuario;
    const [duelos] = await pool.query(`
      SELECT d.id_duelo, d.id_retador, d.id_defensor, d.estado, d.fecha_limite, d.dificultad, d.apuesta,
        u1.username as retador_username, u2.username as defensor_username
      FROM duelos d
      LEFT JOIN usuario u1 ON d.id_retador = u1.id_usuario
      LEFT JOIN usuario u2 ON d.id_defensor = u2.id_usuario
      WHERE (d.id_retador = ? OR d.id_defensor = ?)
        AND d.estado NOT IN ('finalizado', 'abandonado')
        AND d.fecha_limite > NOW()
    `, [idUsuario, idUsuario]);
    res.json({ duelos_activos: duelos });
  } catch (error) {
    console.error('❌ Error obteniendo duelos activos:', error);
    res.status(500).json({ error: 'Error al obtener duelos activos' });
  }
});

// =============================================
// 🔧 ADMIN: LIMPIAR DUELOS ANTIGUOS
// =============================================
router.post('/admin/limpiar-duelos-antiguos', async (req, res) => {
  if (!req.session.user || req.session.user.id_tp_usuario !== 1) return res.status(403).json({ error: 'No autorizado' });
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [duelosExpirados] = await conn.query(`
      SELECT id_duelo FROM duelos
      WHERE fecha_limite < DATE_SUB(NOW(), INTERVAL 7 DAY)
        AND estado NOT IN ('finalizado', 'abandonado')
    `);
    for (const duelo of duelosExpirados) {
      await conn.query('DELETE FROM duelos_preguntas WHERE id_duelo = ?', [duelo.id_duelo]);
      await conn.query('DELETE FROM duelos_respuestas WHERE id_duelo = ?', [duelo.id_duelo]);
      await conn.query('DELETE FROM duelos WHERE id_duelo = ?', [duelo.id_duelo]);
    }
    await conn.commit(); conn.release();
    res.json({ success: true, message: `${duelosExpirados.length} duelos antiguos eliminados`, eliminados: duelosExpirados.length });
  } catch (error) {
    await conn.rollback(); conn.release();
    console.error('❌ Error limpiando duelos:', error);
    res.status(500).json({ error: 'Error al limpiar duelos' });
  }
});

// =============================================
// 📊 ESTADÍSTICAS AVANZADAS
// =============================================
router.get('/api/estadisticas/resumen', async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'No autorizado' });
  try {
    const idUsuario = req.session.user.id_usuario;
    const [stats] = await pool.query(`
      SELECT COUNT(*) as total_duelos,
        SUM(CASE WHEN id_ganador = ? THEN 1 ELSE 0 END) as victorias,
        SUM(CASE WHEN id_ganador IS NOT NULL AND id_ganador != ? THEN 1 ELSE 0 END) as derrotas,
        SUM(CASE WHEN id_ganador IS NULL THEN 1 ELSE 0 END) as empates,
        AVG(CASE WHEN id_retador = ? THEN correctas_retador ELSE correctas_defensor END) as promedio_correctas,
        AVG(CASE WHEN id_retador = ? THEN porcentaje_retador ELSE porcentaje_defensor END) as promedio_porcentaje
      FROM historial_duelos WHERE id_retador = ? OR id_defensor = ?
    `, [idUsuario, idUsuario, idUsuario, idUsuario, idUsuario, idUsuario]);
    const [puntos] = await pool.query(`
      SELECT SUM(CASE WHEN id_retador = ? THEN puntos_retador ELSE puntos_defensor END) as puntos_netos
      FROM historial_duelos WHERE id_retador = ? OR id_defensor = ?
    `, [idUsuario, idUsuario, idUsuario]);
    const [usuario] = await pool.query('SELECT racha_victorias, puntos FROM usuario WHERE id_usuario = ?', [idUsuario]);
    res.json({
      total_duelos: toNumber(stats[0]?.total_duelos),
      victorias: toNumber(stats[0]?.victorias),
      derrotas: toNumber(stats[0]?.derrotas),
      empates: toNumber(stats[0]?.empates),
      promedio_correctas: toNumber(stats[0]?.promedio_correctas),
      promedio_porcentaje: toNumber(stats[0]?.promedio_porcentaje),
      puntos_netos: toNumber(puntos[0]?.puntos_netos),
      racha_actual: toNumber(usuario[0]?.racha_victorias),
      puntos_actuales: toNumber(usuario[0]?.puntos)
    });
  } catch (error) {
    console.error('❌ [ESTADÍSTICAS] Error:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

router.get('/api/estadisticas/por-dificultad', async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'No autorizado' });
  try {
    const idUsuario = req.session.user.id_usuario;
    const [stats] = await pool.query(`
      SELECT d.dificultad, COUNT(*) as total,
        SUM(CASE WHEN hd.id_ganador = ? THEN 1 ELSE 0 END) as victorias,
        AVG(CASE WHEN hd.id_retador = ? THEN hd.correctas_retador ELSE hd.correctas_defensor END) as promedio_correctas,
        AVG(CASE WHEN hd.id_retador = ? THEN hd.porcentaje_retador ELSE hd.porcentaje_defensor END) as promedio_porcentaje
      FROM historial_duelos hd INNER JOIN duelos d ON hd.id_duelo = d.id_duelo
      WHERE hd.id_retador = ? OR hd.id_defensor = ?
      GROUP BY d.dificultad ORDER BY d.dificultad
    `, [idUsuario, idUsuario, idUsuario, idUsuario, idUsuario]);
    res.json(stats.map(row => ({
      dificultad: toNumber(row.dificultad, 1),
      total: toNumber(row.total),
      victorias: toNumber(row.victorias),
      promedio_correctas: toNumber(row.promedio_correctas),
      promedio_porcentaje: toNumber(row.promedio_porcentaje)
    })));
  } catch (error) {
    console.error('❌ [ESTADÍSTICAS] Error por dificultad:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

router.get('/api/estadisticas/historial-rendimiento', async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'No autorizado' });
  try {
    const idUsuario = req.session.user.id_usuario;
    const [historial] = await pool.query(`
      SELECT hd.fecha_duelo,
        CASE WHEN hd.id_retador = ? THEN hd.porcentaje_retador ELSE hd.porcentaje_defensor END as porcentaje,
        CASE WHEN hd.id_ganador = ? THEN 'Victoria' WHEN hd.id_ganador IS NULL THEN 'Empate' ELSE 'Derrota' END as resultado,
        CASE WHEN hd.id_retador = ? THEN hd.correctas_retador ELSE hd.correctas_defensor END as correctas,
        hd.total_preguntas, d.dificultad
      FROM historial_duelos hd LEFT JOIN duelos d ON hd.id_duelo = d.id_duelo
      WHERE hd.id_retador = ? OR hd.id_defensor = ?
      ORDER BY hd.fecha_duelo DESC LIMIT 30
    `, [idUsuario, idUsuario, idUsuario, idUsuario, idUsuario]);
    res.json(historial.map(row => ({
      fecha_duelo: row.fecha_duelo,
      porcentaje: toNumber(row.porcentaje),
      resultado: row.resultado,
      correctas: toNumber(row.correctas),
      total_preguntas: toNumber(row.total_preguntas),
      dificultad: toNumber(row.dificultad, 1)
    })));
  } catch (error) {
    console.error('❌ [ESTADÍSTICAS] Error historial:', error);
    res.status(500).json({ error: 'Error al obtener historial' });
  }
});

router.get('/api/estadisticas/por-tipo', async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'No autorizado' });
  try {
    const idUsuario = req.session.user.id_usuario;
    const [stats] = await pool.query(`
      SELECT COALESCE(hd.tipo_duelo, 'general') as tipo_duelo, COUNT(*) as total,
        SUM(CASE WHEN hd.id_ganador = ? THEN 1 ELSE 0 END) as victorias,
        AVG(CASE WHEN hd.id_retador = ? THEN hd.porcentaje_retador ELSE hd.porcentaje_defensor END) as promedio_porcentaje
      FROM historial_duelos hd WHERE hd.id_retador = ? OR hd.id_defensor = ?
      GROUP BY COALESCE(hd.tipo_duelo, 'general')
    `, [idUsuario, idUsuario, idUsuario, idUsuario]);
    res.json(stats.map(row => ({
      tipo_duelo: row.tipo_duelo || 'general',
      total: toNumber(row.total),
      victorias: toNumber(row.victorias),
      promedio_porcentaje: toNumber(row.promedio_porcentaje)
    })));
  } catch (error) {
    console.error('❌ [ESTADÍSTICAS] Error por tipo:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

router.get('/api/estadisticas/comparacion', async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'No autorizado' });
  try {
    const idUsuario = req.session.user.id_usuario;
    const [ranking] = await pool.query(`
      SELECT u.id_usuario, u.username, u.puntos, u.foto_perfil,
        COUNT(hd.id_duelo) as total_duelos,
        SUM(CASE WHEN hd.id_ganador = u.id_usuario THEN 1 ELSE 0 END) as victorias,
        ROUND((SUM(CASE WHEN hd.id_ganador = u.id_usuario THEN 1 ELSE 0 END) * 100.0) / NULLIF(COUNT(hd.id_duelo), 0), 2) as tasa_victoria
      FROM usuario u
      LEFT JOIN historial_duelos hd ON u.id_usuario = hd.id_retador OR u.id_usuario = hd.id_defensor
      GROUP BY u.id_usuario, u.username, u.puntos, u.foto_perfil
      ORDER BY u.puntos DESC LIMIT 5
    `);
    const [miPosicion] = await pool.query(`
      SELECT COUNT(*) + 1 as posicion FROM usuario
      WHERE puntos > (SELECT puntos FROM usuario WHERE id_usuario = ?)
    `, [idUsuario]);
    res.json({
      top_jugadores: ranking.map(row => ({
        id_usuario: toNumber(row.id_usuario),
        username: row.username,
        puntos: toNumber(row.puntos),
        foto_perfil: row.foto_perfil,
        total_duelos: toNumber(row.total_duelos),
        victorias: toNumber(row.victorias),
        tasa_victoria: toNumber(row.tasa_victoria)
      })),
      mi_posicion: toNumber(miPosicion[0]?.posicion, 1)
    });
  } catch (error) {
    console.error('❌ [ESTADÍSTICAS] Error comparación:', error);
    res.status(500).json({ error: 'Error al obtener comparación' });
  }
});

router.get('/estadisticas', async (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  try {
    res.render('estadisticas-duelo', { layout: 'main', title: 'Estadísticas de Duelos', user: req.session.user });
  } catch (error) {
    console.error('❌ [ESTADÍSTICAS] Error cargando vista:', error);
    res.redirect('/portal?error=error_estadisticas');
  }
});

module.exports = router;