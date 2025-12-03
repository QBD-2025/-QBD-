const { verificarPromocionDisponible } = require('../routes/rangos.router');
const express = require('express');
const router = express.Router();
const pool = require('../db/conexion');

// =============================================
// CONFIGURACIÓN DEL SISTEMA
// =============================================
router.get('/duelo/penalizaciones', (req, res) => {
    res.json({
        penalizaciones: PENALIZACIONES,
        tiempos: TIEMPOS
    });
});

const DIFICULTADES = {
    1: { nombre: 'Fácil', apuesta: 50, preguntas: 10 },
    2: { nombre: 'Medio', apuesta: 100, preguntas: 10 },
    3: { nombre: 'Difícil', apuesta: 200, preguntas: 10 }
};

async function obtenerRespuestas(idUsuario, salaId) {
    const [respuestas] = await pool.query(`
        SELECT 
            dp.id_pregunta,
            dr.id_respuesta,
            p.pregunta,
            r.respuesta as texto_respuesta,
            COALESCE(r.correcta, 0) as es_correcta,
            dp.orden,
            CASE WHEN dr.id_respuesta IS NULL THEN 1 ELSE 0 END as sin_responder
        FROM duelos_preguntas dp
        INNER JOIN pregunta p ON dp.id_pregunta = p.id_pregunta
        LEFT JOIN duelos_respuestas dr ON dr.id_duelo = dp.id_duelo 
            AND dr.id_pregunta = dp.id_pregunta 
            AND dr.id_usuario = ?
        LEFT JOIN respuesta r ON dr.id_respuesta = r.id_respuesta
        WHERE dp.id_duelo = ?
        ORDER BY dp.orden
    `, [idUsuario, salaId]);
    return respuestas;
}

// Función para verificar si ambos jugadores terminaron el duelo
async function verificarAmbosTerminaron(salaId) {
    const [duelo] = await pool.query(`
        SELECT respondido_retador, respondido_oponente 
        FROM duelos 
        WHERE id_duelo = ?
    `, [salaId]);
    
    if (duelo.length === 0) return false;
    
    return duelo[0].respondido_retador && duelo[0].respondido_oponente;
}

// Función para obtener información del oponente
async function obtenerOponente(idUsuario, salaId) {
    const [duelo] = await pool.query(`
        SELECT id_retador, id_defensor 
        FROM duelos 
        WHERE id_duelo = ?
    `, [salaId]);
    
    if (duelo.length === 0) return null;
    
    const idOponente = duelo[0].id_retador === idUsuario 
        ? duelo[0].id_defensor 
        : duelo[0].id_retador;
    
    const [oponente] = await pool.query(`
        SELECT id_usuario as id, username 
        FROM usuario 
        WHERE id_usuario = ?
    `, [idOponente]);
    
    return oponente[0];
}

function calcularPuntaje(respuestas) {
    // Contar solo las que fueron respondidas Y correctas
    return respuestas.filter(r => r.id_respuesta !== null && r.es_correcta).length;
}

async function obtenerTotalPreguntasDuelo(salaId) {
    const [result] = await pool.query(`
        SELECT COUNT(*) as total 
        FROM duelos_preguntas 
        WHERE id_duelo = ?
    `, [salaId]);
    
    return result[0]?.total || 0;
}

// Función para obtener el puesto/ranking de un usuario
async function obtenerRankingUsuario(idUsuario) {
    const [ranking] = await pool.query(`
        SELECT COUNT(*) + 1 as puesto
        FROM usuario
        WHERE puntos > (SELECT puntos FROM usuario WHERE id_usuario = ?)
    `, [idUsuario]);
    
    return ranking[0].puesto;
}

// Función para calcular puntos según diferencia de ranking
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
        
        if (diferencia < 0) {
            puntosDefensor = PUNTOS_PERDIDA_CONTRA_PEOR;
        } else {
            puntosDefensor = PUNTOS_PERDIDA;
        }
    } else {
        if (diferencia > 0) {
            const bonus = Math.min(diferencia * BONUS_POR_PUESTO, BONUS_MAXIMO);
            puntosDefensor = PUNTOS_BASE_VICTORIA + bonus;
        } else {
            puntosDefensor = Math.max(PUNTOS_BASE_VICTORIA - (Math.abs(diferencia) * PENALIZACION_POR_PUESTO), PUNTOS_MINIMOS);
        }
        
        if (diferencia > 0) {
            puntosRetador = PUNTOS_PERDIDA_CONTRA_PEOR;
        } else {
            puntosRetador = PUNTOS_PERDIDA;
        }
    }
    
    return { puntosRetador, puntosDefensor };
}

// Función para registrar el duelo en el historial y actualizar puntos
async function finalizarDuelo(salaId, idGanador, idPerdedor, puntajeGanador, puntajePerdedor) {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        
        const [duelo] = await conn.query('SELECT * FROM duelos WHERE id_duelo = ?', [salaId]);
        if (!duelo.length) throw new Error('Duelo no encontrado');
        
        const esRetadorGanador = duelo[0].id_retador === idGanador;
        
        const puestoRetador = await obtenerRankingUsuario(duelo[0].id_retador);
        const puestoDefensor = await obtenerRankingUsuario(duelo[0].id_defensor);
        
        const { puntosRetador, puntosDefensor } = calcularPuntosSegunRanking(
            puestoRetador, 
            puestoDefensor, 
            esRetadorGanador
        );
        
        await conn.query(
            'UPDATE usuario SET puntos = puntos + ? WHERE id_usuario = ?',
            [puntosRetador, duelo[0].id_retador]
        );
        
        await conn.query(
            'UPDATE usuario SET puntos = puntos + ? WHERE id_usuario = ?',
            [puntosDefensor, duelo[0].id_defensor]
        );
        
        await conn.query(`
            INSERT INTO historial_duelos 
            (id_duelo, id_retador, id_defensor, id_ganador, puntos_retador, puntos_defensor, fecha_duelo)
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

// Función para obtener información completa del duelo
async function obtenerDuelo(salaId) {
    const [duelo] = await pool.query(`
        SELECT 
            d.*,
            u1.username as retador_username,
            u1.id_usuario as retador_id,
            u2.username as defensor_username,
            u2.id_usuario as defensor_id
        FROM duelos d
        LEFT JOIN usuario u1 ON d.id_retador = u1.id_usuario
        LEFT JOIN usuario u2 ON d.id_defensor = u2.id_usuario
        WHERE d.id_duelo = ?
    `, [salaId]);
    
    return duelo[0];
}

async function actualizarNotificacionesAlTerminar(salaId, conn) {
    try {
        console.log(`[ACTUALIZAR NOTIF] Verificando si ambos terminaron: ${salaId}`);
        
        // 1️⃣ Verificar si ambos completaron
        const [duelo] = await conn.query(`
            SELECT respondido_retador, respondido_oponente, id_retador, id_defensor
            FROM duelos 
            WHERE id_duelo = ?
        `, [salaId]);
        
        if (duelo.length === 0) return;
        
        const ambosTerminaron = duelo[0].respondido_retador && duelo[0].respondido_oponente;
        
        if (!ambosTerminaron) {
            return;
        }
        
        console.log(`[ACTUALIZAR NOTIF] ✅ Ambos terminaron, actualizando notificaciones`);
        
        // 2️⃣ Actualizar mensaje de TODAS las notificaciones relacionadas
        await conn.query(`
            UPDATE notificaciones 
            SET 
                mensaje = 'Duelo completado - Ver resultados',
                tipo = 'duelo_completado'
            WHERE tipo = 'duelo_aceptado' 
            AND (
                JSON_EXTRACT(extra_data, '$.salaId') = ?
                OR JSON_EXTRACT(extra_data, '$.id_duelo') = ?
            )
        `, [salaId, salaId]);
        
        console.log(`[ACTUALIZAR NOTIF] ✅ Notificaciones actualizadas a 'duelo_completado'`);
        
    } catch (error) {
        console.error('❌ Error actualizando notificaciones:', error);
    }
}
const PENALIZACIONES = {
    DESCONEXION: 0.50,      // 50% de la apuesta
    ABANDONO_VOLUNTARIO: 1.0 // 100% de la apuesta
};

// =============================================
// 🏠 PORTAL PRINCIPAL
// =============================================

router.get('/portal', async (req, res) => {
    try {
        const userId = req.session.user.id_usuario;
        
        // Obtener carrera del usuario
        const [carreras] = await pool.query(`
            SELECT c.id_carrera, c.descripcion 
            FROM carrera c
            INNER JOIN usuario_carrera uc ON c.id_carrera = uc.id_carrera
            WHERE uc.id_usuario = ?
            LIMIT 1
        `, [userId]);
        
        const carrera = carreras.length > 0 ? carreras[0] : null;
        
        // Obtener estadísticas (puntos globales)
        const [userData] = await pool.query(`
            SELECT 
                u.puntos,
                COALESCE((SELECT COUNT(*) FROM historial_duelos 
                          WHERE id_retador = u.id_usuario OR id_defensor = u.id_usuario), 0) AS duelos_jugados,
                COALESCE((SELECT COUNT(*) FROM historial_duelos 
                          WHERE id_ganador = u.id_usuario), 0) AS victorias,
                u.racha_victorias
            FROM usuario u 
            WHERE u.id_usuario = ?
        `, [userId]);
        
        // Obtener puntos de carrera si tiene carrera asignada
        let puntosCarrera = 0;
        if (carrera) {
            const [puntosCarreraData] = await pool.query(`
                SELECT puntos FROM usuario_puntos_carrera 
                WHERE id_usuario = ? AND id_carrera = ?
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
            stats: {
                ...userData[0],
                puntos_carrera: puntosCarrera
            },
            dificultades: DIFICULTADES
        });
    } catch (error) {
        console.error("❌ ERROR al cargar portal:", error);
        res.redirect('/menu_principal');
    }
});

// =============================================
// 📚 OBTENER CARRERAS DEL USUARIO
// =============================================

router.get('/api/usuario/carreras', async (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'No autorizado' });
    
    try {
        const idUsuario = req.session.user.id_usuario;
        
        const [carreras] = await pool.query(`
            SELECT 
                c.id_carrera,
                c.descripcion,
                COALESCE(upc.puntos, 0) as puntos
            FROM usuario_puntos_carrera upc
            INNER JOIN carrera c ON upc.id_carrera = c.id_carrera
            WHERE upc.id_usuario = ?
            ORDER BY c.descripcion
        `, [idUsuario]);
        
        res.json({ carreras });
        
    } catch (error) {
        console.error('❌ Error obteniendo carreras:', error);
        res.status(500).json({ error: 'Error al obtener carreras' });
    }
});

// =============================================
// 💰 OBTENER PUNTOS ACTUALES DEL USUARIO
// =============================================

router.get('/api/usuario/puntos-actuales', async (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'No autorizado' });
    
    try {
        const idUsuario = req.session.user.id_usuario;
        
        const [usuario] = await pool.query(
            'SELECT puntos FROM usuario WHERE id_usuario = ?',
            [idUsuario]
        );
        
        if (!usuario.length) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        
        res.json({ 
            puntos_globales: usuario[0].puntos 
        });
        
    } catch (error) {
        console.error('❌ Error obteniendo puntos:', error);
        res.status(500).json({ error: 'Error al obtener puntos' });
    }
});
router.get('/api/ranking/global', async (req, res) => {
    try {
        const [jugadores] = await pool.query(`
            SELECT 
                u.id_usuario, 
                u.username, 
                u.foto_perfil, 
                u.puntos,
                GROUP_CONCAT(c.descripcion SEPARATOR ', ') as carreras
            FROM usuario u 
            LEFT JOIN usuario_carrera uc ON u.id_usuario = uc.id_usuario 
            LEFT JOIN carrera c ON uc.id_carrera = c.id_carrera
            GROUP BY u.id_usuario, u.username, u.foto_perfil, u.puntos
            ORDER BY u.puntos DESC 
            LIMIT 100
        `);
        res.json(jugadores);
    } catch (error) {
        console.error('❌ Error en ranking global:', error);
        res.status(500).json({ error: 'Error al obtener ranking' });
    }
});

router.get('/api/ranking/carrera/:id_carrera', async (req, res) => {
    try {
        const idCarrera = req.params.id_carrera;
        
        const [jugadores] = await pool.query(`
            SELECT DISTINCT
                u.id_usuario, 
                u.username, 
                u.foto_perfil,
                COALESCE(upc.puntos, 0) as puntos_carrera
            FROM usuario u
            INNER JOIN usuario_carrera uc ON u.id_usuario = uc.id_usuario
            LEFT JOIN usuario_puntos_carrera upc ON u.id_usuario = upc.id_usuario AND upc.id_carrera = ?
            WHERE uc.id_carrera = ?
            ORDER BY COALESCE(upc.puntos, 0) DESC
            LIMIT 100
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
            SELECT id_duelo, estado, fecha_limite 
            FROM duelos 
            WHERE ((id_retador = ? AND id_defensor = ?) OR (id_retador = ? AND id_defensor = ?))
            AND estado NOT IN ('finalizado', 'abandonado')
            AND fecha_limite > NOW()
        `, [idUsuario, idOponente, idOponente, idUsuario]);
        
        if (duelosActivos.length > 0) {
            return res.json({
                existe_duelo: true,
                mensaje: 'Ya existe un duelo activo con este jugador',
                duelo: duelosActivos[0]
            });
        }
        
        res.json({ existe_duelo: false });
        
    } catch (error) {
        console.error('❌ Error verificando duelo:', error);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

// =============================================
// ⚔️ CREAR DESAFÍO CON DIFICULTAD
// =============================================
// =============================================
// ⚔️ CREAR DESAFÍO GENERAL (Sin carrera)
// =============================================

router.post('/desafiar/duelo-general/:idOponente', async (req, res) => {
    if (!req.session.user) return res.status(401).json({ message: 'No autorizado' });
    
    const { idOponente } = req.params;
    const { id_dificultad, apuesta } = req.body;
    const { id_usuario: idRemitente, username: usernameRemitente } = req.session.user;
    
    console.log(`[DUELO GENERAL] ==========================================`);
    console.log(`[DUELO GENERAL] 👤 Remitente: ${usernameRemitente} (ID: ${idRemitente})`);
    console.log(`[DUELO GENERAL] 🎯 Oponente ID: ${idOponente}`);
    console.log(`[DUELO GENERAL] 💰 Apuesta: ${apuesta} pts`);
    console.log(`[DUELO GENERAL] 📊 Dificultad: ${id_dificultad}`);
    
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        
        // 1️⃣ Validar dificultad
        if (!DIFICULTADES[id_dificultad]) {
            await conn.rollback();
            conn.release();
            return res.status(400).json({ message: 'Dificultad inválida' });
        }
        
        const dificultadConfig = DIFICULTADES[id_dificultad];
        const apuestaEsperada = dificultadConfig.apuesta;
        
        if (parseInt(apuesta) !== apuestaEsperada) {
            await conn.rollback();
            conn.release();
            return res.status(400).json({ 
                message: `La apuesta debe ser ${apuestaEsperada} puntos` 
            });
        }
        
        // 2️⃣ Verificar puntos GLOBALES
        const [puntosUsuario] = await conn.query(
            'SELECT puntos FROM usuario WHERE id_usuario = ?',
            [idRemitente]
        );
        
        if (!puntosUsuario.length) {
            await conn.rollback();
            conn.release();
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }
        
        const puntosActuales = puntosUsuario[0].puntos;
        
        if (puntosActuales < apuesta) {
            await conn.rollback();
            conn.release();
            console.log(`[DUELO GENERAL] ❌ PUNTOS INSUFICIENTES: ${puntosActuales}/${apuesta}`);
            return res.status(400).json({ 
                message: `No tienes suficientes puntos. Necesitas ${apuesta}, tienes ${puntosActuales}` 
            });
        }
        
        console.log(`[DUELO GENERAL] ✅ Verificación de puntos exitosa`);
        
        // 3️⃣ Generar ID único
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 9);
        const id_duelo = `duelo_general_${timestamp}_${random}`;
        
        console.log(`[DUELO GENERAL] 🔑 ID Duelo: ${id_duelo}`);
        
        // 4️⃣ Seleccionar preguntas GENERALES
        const [preguntas] = await conn.query(`
            SELECT DISTINCT p.id_pregunta, p.pregunta
            FROM pregunta p
            WHERE p.id_dificultad = ?
            AND id_tematica is null
            AND p.id_pregunta IN (
                SELECT id_pregunta 
                FROM respuesta 
                GROUP BY id_pregunta 
                HAVING COUNT(*) >= 2
            )
            ORDER BY RAND() 
            LIMIT 20
        `, [id_dificultad, dificultadConfig.preguntas]);
        
        if (preguntas.length < dificultadConfig.preguntas) {
            await conn.rollback();
            conn.release();
            console.log(`[DUELO GENERAL] ❌ Solo ${preguntas.length} preguntas disponibles`);
            return res.status(500).json({ 
                message: `No hay suficientes preguntas de dificultad "${dificultadConfig.nombre}"` 
            });
        }
        
        console.log(`[DUELO GENERAL] ✅ ${preguntas.length} preguntas seleccionadas`);
        
        // 5️⃣ ✅ PRIMERO: Crear duelo en BD
        await conn.query(`
            INSERT INTO duelos 
            (id_duelo, id_retador, id_defensor, id_carrera, dificultad, apuesta, 
             fecha_inicio, fecha_limite, estado)
            VALUES (?, ?, ?, NULL, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 48 HOUR), 'activo')
        `, [id_duelo, idRemitente, idOponente, id_dificultad, apuesta]);
        
        console.log(`[DUELO GENERAL] ✅ Duelo insertado en BD`);
        
        // 6️⃣ Insertar preguntas en duelos_preguntas
        for (let i = 0; i < preguntas.length; i++) {
            await conn.query(`
                INSERT INTO duelos_preguntas (id_duelo, id_pregunta, orden) 
                VALUES (?, ?, ?)
            `, [id_duelo, preguntas[i].id_pregunta, i + 1]);
        }
        
        console.log(`[DUELO GENERAL] ✅ Preguntas insertadas`);
        
        // 7️⃣ ✅ DESPUÉS: Crear notificación
        const extraData = {
            remitente: {
                id_usuario: idRemitente,
                username: usernameRemitente,
                foto_perfil: req.session.user.foto_perfil
            },
            id_duelo,
            dificultad: dificultadConfig.nombre,
            apuesta,
            tipo_duelo: 'general',
            id_carrera: null, // ✅ AGREGADO
            tiempoLimite: 48 * 60 * 60
        };
        
        const mensajeNotificacion = `${usernameRemitente} te desafía a un Duelo GENERAL ${dificultadConfig.nombre} (${apuesta} pts)`;
        
        await conn.query(`
            INSERT INTO notificaciones 
            (id_usuario_destinatario, id_usuario_remitente, tipo, mensaje, extra_data) 
            VALUES (?, ?, 'desafio_duelo', ?, ?)
        `, [idOponente, idRemitente, mensajeNotificacion, JSON.stringify(extraData)]);
        
        console.log(`[DUELO GENERAL] ✅ Notificación creada`);
        
        await conn.commit();
        conn.release();
        
        // 8️⃣ Emitir socket
        if (req.io) {
            req.io.to(idOponente.toString()).emit('notificacion_recibida');
        }
        
        console.log(`[DUELO GENERAL] ✅ Proceso completado`);
        console.log(`[DUELO GENERAL] ==========================================`);
        
        res.json({ 
            success: true, 
            message: '¡Desafío General enviado!', 
            id_duelo, 
            dificultad: dificultadConfig.nombre,
            apuesta,
            tipo: 'general'
        });
        
    } catch (err) {
        try { await conn.rollback(); } catch(e) {}
        conn.release();
        console.error('❌ [DUELO GENERAL] Error:', err);
        res.status(500).json({ message: 'Error del servidor: ' + err.message });
    }
});

// =============================================
// 📚 CREAR DESAFÍO DE CARRERA - ✅ CORREGIDO
// =============================================

// 📝 CARGAR EXAMEN
// =============================================
router.post('/desafiar/duelo/:idOponente', async (req, res) => {
    if (!req.session.user) return res.status(401).json({ message: 'No autorizado' });
    
    const { idOponente } = req.params;
    const { id_dificultad, apuesta, id_carrera } = req.body;
    const { id_usuario: idRemitente, username: usernameRemitente } = req.session.user;
    
    console.log(`[DESAFÍO CARRERA] Iniciando...`);
    console.log(`[DESAFÍO CARRERA] Remitente: ${usernameRemitente} (${idRemitente})`);
    console.log(`[DESAFÍO CARRERA] Oponente: ${idOponente}`);
    console.log(`[DESAFÍO CARRERA] Carrera: ${id_carrera}, Dificultad: ${id_dificultad}, Apuesta: ${apuesta}`);
    
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        
        // 1️⃣ VALIDAR DIFICULTAD
        if (!DIFICULTADES[id_dificultad]) {
            await conn.rollback();
            conn.release();
            console.log(`[DESAFÍO CARRERA] ❌ Dificultad inválida`);
            return res.status(400).json({ message: 'Dificultad inválida' });
        }
        
        const dificultadConfig = DIFICULTADES[id_dificultad];
        const apuestaEsperada = dificultadConfig.apuesta;
        
        if (parseInt(apuesta) !== apuestaEsperada) {
            await conn.rollback();
            conn.release();
            console.log(`[DESAFÍO CARRERA] ❌ Apuesta incorrecta. Esperada: ${apuestaEsperada}, Recibida: ${apuesta}`);
            return res.status(400).json({ 
                message: `La apuesta debe ser ${apuestaEsperada} puntos` 
            });
        }
        
        // 2️⃣ VERIFICAR QUE LA CARRERA EXISTE
        const [carreraExiste] = await conn.query(
            'SELECT id_carrera, descripcion FROM carrera WHERE id_carrera = ?',
            [id_carrera]
        );
        
        if (!carreraExiste.length) {
            await conn.rollback();
            conn.release();
            console.log(`[DESAFÍO CARRERA] ❌ Carrera no encontrada`);
            return res.status(400).json({ message: 'Carrera no válida' });
        }
        
        const nombreCarrera = carreraExiste[0].descripcion;
        
        // 3️⃣ VERIFICAR PUNTOS DE CARRERA DEL RETADOR
        const [puntosRetador] = await conn.query(
            'SELECT puntos FROM usuario_puntos_carrera WHERE id_usuario = ? AND id_carrera = ?',
            [idRemitente, id_carrera]
        );
        
        if (!puntosRetador.length) {
            await conn.rollback();
            conn.release();
            console.log(`[DESAFÍO CARRERA] ❌ Usuario no tiene puntos en esta carrera`);
            return res.status(400).json({ message: 'No tienes puntos en esta carrera' });
        }
        
        const puntosActualesRetador = puntosRetador[0].puntos;
        
        if (puntosActualesRetador < apuesta) {
            await conn.rollback();
            conn.release();
            console.log(`[DESAFÍO CARRERA] ❌ Puntos insuficientes: ${puntosActualesRetador}/${apuesta}`);
            return res.status(400).json({ 
                message: `No tienes suficientes puntos de carrera. Necesitas ${apuesta}, tienes ${puntosActualesRetador}` 
            });
        }
        
        console.log(`[DESAFÍO CARRERA] ✅ Puntos de carrera verificados: ${puntosActualesRetador}`);
        
        // 4️⃣ VERIFICAR QUE AMBOS USUARIOS TENGAN LA CARRERA
        const [puntosDefensor] = await conn.query(
            'SELECT puntos FROM usuario_puntos_carrera WHERE id_usuario = ? AND id_carrera = ?',
            [idOponente, id_carrera]
        );
        
        if (!puntosDefensor.length) {
            await conn.rollback();
            conn.release();
            console.log(`[DESAFÍO CARRERA] ❌ Oponente no tiene puntos en esta carrera`);
            return res.status(400).json({ message: 'El oponente no tiene esta carrera' });
        }
        
        // 5️⃣ GENERAR ID ÚNICO DEL DUELO
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 9);
        const id_duelo = `duelo_carrera_${timestamp}_${random}`;
        
        console.log(`[DESAFÍO CARRERA] 🔑 ID Duelo: ${id_duelo}`);
        
        // 6️⃣ SELECCIONAR PREGUNTAS ESPECÍFICAS DE LA CARRERA
        const [preguntas] = await conn.query(`
            SELECT DISTINCT p.id_pregunta, p.pregunta, p.puntos_carrera
            FROM pregunta p
            WHERE p.id_carrera = ?
            AND p.id_dificultad = ?
            AND p.id_pregunta IN (
                SELECT id_pregunta 
                FROM respuesta 
                GROUP BY id_pregunta 
                HAVING COUNT(*) >= 2
            )
            ORDER BY RAND() 
            LIMIT ?
        `, [id_carrera, id_dificultad, dificultadConfig.preguntas]);
        
        if (preguntas.length < dificultadConfig.preguntas) {
            await conn.rollback();
            conn.release();
            console.log(`[DESAFÍO CARRERA] ❌ Solo ${preguntas.length} preguntas disponibles`);
            return res.status(500).json({ 
                message: `No hay suficientes preguntas de "${dificultadConfig.nombre}" en ${nombreCarrera}` 
            });
        }
        
        console.log(`[DESAFÍO CARRERA] ✅ ${preguntas.length} preguntas seleccionadas`);
        
        // 7️⃣ CREAR DUELO EN BD
        await conn.query(`
            INSERT INTO duelos 
            (id_duelo, id_retador, id_defensor, id_carrera, dificultad, apuesta, 
             fecha_inicio, fecha_limite, estado, tipo_duelo)
            VALUES (?, ?, ?, ?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 48 HOUR), 'activo', 'carrera')
        `, [id_duelo, idRemitente, idOponente, id_carrera, id_dificultad, apuesta]);
        
        console.log(`[DESAFÍO CARRERA] ✅ Duelo insertado en BD`);
        
        // 8️⃣ INSERTAR PREGUNTAS DEL DUELO
        for (let i = 0; i < preguntas.length; i++) {
            await conn.query(`
                INSERT INTO duelos_preguntas (id_duelo, id_pregunta, orden) 
                VALUES (?, ?, ?)
            `, [id_duelo, preguntas[i].id_pregunta, i + 1]);
        }
        
        console.log(`[DESAFÍO CARRERA] ✅ Preguntas insertadas`);
        
        // 9️⃣ CREAR NOTIFICACIÓN
        const extraData = {
            remitente: {
                id_usuario: idRemitente,
                username: usernameRemitente,
                foto_perfil: req.session.user.foto_perfil
            },
            id_duelo,
            dificultad: dificultadConfig.nombre,
            apuesta,
            tipo_duelo: 'carrera',
            id_carrera,
            nombre_carrera: nombreCarrera,
            tiempoLimite: 48 * 60 * 60
        };
        
        const mensajeNotificacion = `${usernameRemitente} te desafía en ${nombreCarrera} - ${dificultadConfig.nombre} (${apuesta} pts)`;
        
        await conn.query(`
            INSERT INTO notificaciones 
            (id_usuario_destinatario, id_usuario_remitente, tipo, mensaje, extra_data) 
            VALUES (?, ?, 'desafio_duelo', ?, ?)
        `, [idOponente, idRemitente, mensajeNotificacion, JSON.stringify(extraData)]);
        
        console.log(`[DESAFÍO CARRERA] ✅ Notificación creada`);
        
        await conn.commit();
        conn.release();
        
        // 🔟 EMITIR SOCKET
        if (req.io) {
            req.io.to(idOponente.toString()).emit('notificacion_recibida');
        }
        
        console.log(`[DESAFÍO CARRERA] ✅ ÉXITO - Desafío enviado`);
        
        res.json({ 
            success: true, 
            message: `¡Desafío de Carrera en ${nombreCarrera} enviado!`, 
            id_duelo,
            dificultad: dificultadConfig.nombre,
            apuesta,
            tipo: 'carrera',
            carrera: nombreCarrera
        });
        
    } catch (err) {
        try { await conn.rollback(); } catch(e) {}
        conn.release();
        console.error('❌ [DESAFÍO CARRERA] Error:', err);
        console.error('❌ [DESAFÍO CARRERA] Stack:', err.stack);
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
    
    console.log(`[EXAMEN] 🎯 Sala: ${salaId}, Usuario: ${userId}`);
    
    try {
        const [duelos] = await pool.query(`
            SELECT d.*, 
                   u1.username as retador_username, 
                   u2.username as defensor_username
            FROM duelos d
            LEFT JOIN usuario u1 ON d.id_retador = u1.id_usuario
            LEFT JOIN usuario u2 ON d.id_defensor = u2.id_usuario
            WHERE d.id_duelo = ? AND (d.id_retador = ? OR d.id_defensor = ?)
        `, [salaId, userId, userId]);
        
        if (!duelos.length) {
            return res.redirect('/portal?error=duelo_no_encontrado');
        }
        
        const duelo = duelos[0];
        const esRetador = duelo.id_retador === userId;
        
        if ((esRetador && duelo.respondido_retador) || (!esRetador && duelo.respondido_oponente)) {
            return res.redirect(`/duelo/resultados/${salaId}?mensaje=Ya completaste este examen`);
        }
        
        if (new Date() > new Date(duelo.fecha_limite)) {
            return res.redirect(`/duelo/resultados/${salaId}?mensaje=Tiempo expirado`);
        }
        
        const [preguntas] = await pool.query(`
            SELECT 
                p.id_pregunta, 
                p.pregunta,
                p.id_carrera,
                dp.orden
            FROM duelos_preguntas dp
            INNER JOIN pregunta p ON dp.id_pregunta = p.id_pregunta
            WHERE dp.id_duelo = ?
            ORDER BY dp.orden
        `, [salaId]);
        
        if (!preguntas.length) {
            return res.redirect('/portal?error=no_hay_preguntas');
        }
        
        for (let pregunta of preguntas) {
            const [respuestas] = await pool.query(`
                SELECT id_respuesta, respuesta, correcta 
                FROM respuesta 
                WHERE id_pregunta = ? 
                ORDER BY RAND()
            `, [pregunta.id_pregunta]);
            
            pregunta.respuestas = respuestas;
        }
        
        const dificultadNombre = DIFICULTADES[duelo.id_dificultad]?.nombre || 'Desconocida';
        
        res.render('examen-duelo-individual', {
            layout: 'main',
            user: req.session.user,
            duelo: {
                ...duelo,
                dificultad_nombre: dificultadNombre
            },
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
// 🚪 ABANDONAR DUELO - VERSIÓN CORREGIDA
// Coloca esto DESPUÉS de la ruta /duelo/responder y ANTES de cualquier otra ruta de abandono
// =============================================

// =============================================
// 🚪 ABANDONAR DUELO - VERSIÓN CORREGIDA CON SOPORTE DE CARRERA
// =============================================

router.post('/duelo/confirmarRendicion/:salaId', async (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'No autorizado' });
    
    const { salaId } = req.params;
    const { motivo } = req.body;
    const idUsuario = req.session.user.id_usuario;
    
    console.log(`[ABANDONO] ==========================================`);
    console.log(`[ABANDONO] 🚪 Usuario ${idUsuario} abandonando duelo ${salaId}`);
    console.log(`[ABANDONO] 📋 Motivo: ${motivo}`);
    
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        
        // 1️⃣ Obtener duelo
        const [duelo] = await conn.query(
            'SELECT * FROM duelos WHERE id_duelo = ? AND (id_retador = ? OR id_defensor = ?)',
            [salaId, idUsuario, idUsuario]
        );
        
        if (!duelo.length) {
            await conn.rollback();
            conn.release();
            return res.status(404).json({ error: 'Duelo no encontrado' });
        }
        
        const dueloData = duelo[0];
        const apuesta = dueloData.apuesta;
        const esRetador = dueloData.id_retador === idUsuario;
        const idOponente = esRetador ? dueloData.id_defensor : dueloData.id_retador;
        const esDueloCarrera = dueloData.id_carrera !== null && dueloData.tipo_duelo === 'carrera';
        
        console.log(`[ABANDONO] 💰 Apuesta: ${apuesta} pts`);
        console.log(`[ABANDONO] 📋 Es carrera: ${esDueloCarrera}`);
        console.log(`[ABANDONO] 🎯 ID Carrera: ${dueloData.id_carrera}`);
        
        // 2️⃣ Calcular penalización según motivo (PORCENTAJE DE LA APUESTA)
        let porcentajePenalizacion = 0;
        let descripcionMotivo = '';
        
        switch (motivo) {
            case 'voluntario':
            case 'rendirse':
                porcentajePenalizacion = PENALIZACIONES.ABANDONO_VOLUNTARIO;
                descripcionMotivo = 'Abandono voluntario';
                break;
            case 'navegacion':
                porcentajePenalizacion = PENALIZACIONES.NAVEGACION || 1.0;
                descripcionMotivo = 'Cierre de navegador';
                break;
            case 'desconexion':
                porcentajePenalizacion = PENALIZACIONES.DESCONEXION;
                descripcionMotivo = 'Desconexión';
                break;
            default:
                porcentajePenalizacion = PENALIZACIONES.ABANDONO_VOLUNTARIO;
                descripcionMotivo = 'Abandono';
        }
        
        const penalizacion = Math.floor(apuesta * porcentajePenalizacion);
        const gananciaOponente = penalizacion;
        
        console.log(`[ABANDONO] 📊 Porcentaje: ${porcentajePenalizacion * 100}%`);
        console.log(`[ABANDONO] 💸 Penalización: ${penalizacion} pts`);
        console.log(`[ABANDONO] 💰 Ganancia oponente: ${gananciaOponente} pts`);
        
        if (esDueloCarrera) {
            // ============ DUELO DE CARRERA ============
            console.log(`[ABANDONO] 💎 PROCESANDO ABANDONO EN MODO CARRERA`);
            
            // Verificar puntos de carrera del usuario
            const [puntosCarrera] = await conn.query(
                'SELECT puntos FROM usuario_puntos_carrera WHERE id_usuario = ? AND id_carrera = ?',
                [idUsuario, dueloData.id_carrera]
            );
            
            const puntosCarreraActuales = puntosCarrera[0]?.puntos || 0;
            console.log(`[ABANDONO] 💎 Puntos carrera actuales: ${puntosCarreraActuales}`);
            
            // Ajustar penalización si no tiene suficientes puntos
            const penalizacionFinal = Math.min(penalizacion, puntosCarreraActuales);
            const gananciaFinal = penalizacionFinal;
            
            console.log(`[ABANDONO] 💎 Penalización final: ${penalizacionFinal}`);
            
            // Restar puntos de carrera al que abandona
            const nuevosPuntosAbandono = Math.max(0, puntosCarreraActuales - penalizacionFinal);
            
            await conn.query(`
                INSERT INTO usuario_puntos_carrera (id_usuario, id_carrera, puntos)
                VALUES (?, ?, ?)
                ON DUPLICATE KEY UPDATE puntos = ?
            `, [idUsuario, dueloData.id_carrera, nuevosPuntosAbandono, nuevosPuntosAbandono]);
            
            console.log(`[ABANDONO] ✅ Usuario: ${puntosCarreraActuales} → ${nuevosPuntosAbandono}`);
            
            // Sumar puntos de carrera al oponente
            const [puntosOponente] = await conn.query(
                'SELECT puntos FROM usuario_puntos_carrera WHERE id_usuario = ? AND id_carrera = ?',
                [idOponente, dueloData.id_carrera]
            );
            
            const puntosOponenteActuales = puntosOponente[0]?.puntos || 0;
            const nuevosPuntosOponente = puntosOponenteActuales + gananciaFinal;
            
            await conn.query(`
                INSERT INTO usuario_puntos_carrera (id_usuario, id_carrera, puntos)
                VALUES (?, ?, ?)
                ON DUPLICATE KEY UPDATE puntos = ?
            `, [idOponente, dueloData.id_carrera, nuevosPuntosOponente, nuevosPuntosOponente]);
            
            console.log(`[ABANDONO] ✅ Oponente: ${puntosOponenteActuales} → ${nuevosPuntosOponente}`);
            
        } else {
            // ============ DUELO GENERAL ============
            console.log(`[ABANDONO] 🌍 PROCESANDO ABANDONO EN MODO GENERAL`);
            
            await conn.query(
                'UPDATE usuario SET puntos = GREATEST(0, puntos - ?) WHERE id_usuario = ?',
                [penalizacion, idUsuario]
            );
            
            await conn.query(
                'UPDATE usuario SET puntos = puntos + ? WHERE id_usuario = ?',
                [gananciaOponente, idOponente]
            );

            await verificarPromocionDisponible(idUsuario, puntos);
            
            console.log(`[ABANDONO] ✅ Puntos globales actualizados`);
        }
        
        // 6️⃣ Registrar en historial
        await conn.query(`
            INSERT INTO historial_duelos 
            (id_duelo, id_retador, id_defensor, id_ganador, puntos_retador, puntos_defensor, 
             fecha_duelo, motivo_abandono, penalizacion_aplicada, tipo_duelo)
            VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?)
        `, [
            salaId,
            dueloData.id_retador,
            dueloData.id_defensor,
            idOponente,
            esRetador ? -penalizacion : gananciaOponente,
            esRetador ? gananciaOponente : -penalizacion,
            descripcionMotivo,
            penalizacion,
            esDueloCarrera ? 'carrera' : 'general'
        ]);
        
        // 7️⃣ Marcar duelo como abandonado
        await conn.query('UPDATE duelos SET estado = ? WHERE id_duelo = ?', ['abandonado', salaId]);
        
        // 8️⃣ Limpiar datos
        await conn.query('DELETE FROM duelos_preguntas WHERE id_duelo = ?', [salaId]);
        await conn.query('DELETE FROM duelos_respuestas WHERE id_duelo = ?', [salaId]);
        
        // 9️⃣ Notificar oponente
        const [abandonador] = await conn.query('SELECT username FROM usuario WHERE id_usuario = ?', [idUsuario]);
        const nombreAbandono = abandonador[0]?.username || 'Usuario';
        
        await conn.query(`
            INSERT INTO notificaciones 
            (id_usuario_destinatario, id_usuario_remitente, tipo, mensaje, extra_data)
            VALUES (?, ?, 'duelo_abandonado', ?, ?)
        `, [
            idOponente,
            idUsuario,
            `¡${nombreAbandono} abandonó el duelo! Ganaste ${gananciaOponente} puntos ${esDueloCarrera ? 'de carrera' : 'globales'} 🏆`,
            JSON.stringify({ 
                id_duelo: salaId, 
                motivo: descripcionMotivo,
                ganancia: gananciaOponente,
                tipo_duelo: esDueloCarrera ? 'carrera' : 'general'
            })
        ]);

        await verificarPromocionDisponible(idUsuario, puntos);
        
        await conn.commit();
        conn.release();
        
        // 🔟 Emitir sockets
        if (req.io) {
            req.io.to(idOponente.toString()).emit('duelo:oponenteAbandono', {
                ganaste: true,
                mensaje: `${nombreAbandono} ha abandonado el duelo`,
                gananciaOponente,
                motivo: descripcionMotivo,
                salaId,
                tipoDuelo: esDueloCarrera ? 'carrera' : 'general'
            });
            
            req.io.to(idOponente.toString()).emit('notificacion_recibida');
        }
        
        console.log(`[ABANDONO] ✅ Proceso completado`);
        console.log(`[ABANDONO] ==========================================`);
        
        res.json({
            success: true,
            message: `Has abandonado el duelo. Perdiste ${penalizacion} puntos ${esDueloCarrera ? 'de carrera' : 'globales'}`,
            penalizacion,
            gananciaOponente,
            motivo: descripcionMotivo,
            tipoDuelo: esDueloCarrera ? 'carrera' : 'general'
        });
        
    } catch (error) {
        try { await conn.rollback(); } catch(e) {}
        conn.release();
        console.error('❌ [ABANDONO] Error:', error);
        res.status(500).json({ error: 'Error al abandonar duelo: ' + error.message });
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
        
        if (!duelos.length) {
            await conn.rollback();
            await conn.release();
            return res.status(404).json({ error: 'Duelo no encontrado' });
        }
        
        const duelo = duelos[0];
        const esRetador = duelo.id_retador === id_usuario;
        
        if ((esRetador && duelo.respondido_retador) || (!esRetador && duelo.respondido_oponente)) {
            await conn.rollback();
            await conn.release();
            return res.status(400).json({ error: 'Ya completaste este examen' });
        }
        
        await conn.query(`DELETE FROM duelos_respuestas WHERE id_duelo = ? AND id_usuario = ?`, [salaId, id_usuario]);
        
        for (const [id_pregunta, id_respuesta] of Object.entries(respuestasObj)) {
            await conn.query(`
                INSERT INTO duelos_respuestas (id_duelo, id_usuario, id_pregunta, id_respuesta) 
                VALUES (?, ?, ?, ?)
            `, [salaId, id_usuario, id_pregunta, id_respuesta]);
        }
        
        if (esRetador) {
            await conn.query(`UPDATE duelos SET respondido_retador = 1 WHERE id_duelo = ?`, [salaId]);
        } else {
            await conn.query(`UPDATE duelos SET respondido_oponente = 1 WHERE id_duelo = ?`, [salaId]);
        }
        
        console.log(`[RESPONDER] ✅ Duelo marcado como respondido`);

        await actualizarNotificacionesAlTerminar(salaId, conn);        

        await conn.commit();
        await conn.release();
        
        res.redirect(`/duelo/resultados/${salaId}`);

    } catch (error) {
        await conn.rollback();
        await conn.release();
        console.error('❌ Error guardando respuestas:', error);
        res.status(500).json({ error: 'Error del servidor: ' + error.message });
    }
});

// =============================================
// 🏆 RESULTADOS (con puntos de carrera)
// =============================================

router.get('/duelo/resultados/:salaId', async (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    
    const { salaId } = req.params;
    const idUsuario = req.session.user.id_usuario;
    
    console.log(`[RESULTADOS] ==========================================`);
    console.log(`[RESULTADOS] 📊 Sala: ${salaId}, Usuario: ${idUsuario}`);
    
    try {
        // 1️⃣ Obtener duelo
        const [duelos] = await pool.query(`
            SELECT d.*, 
                   u1.username as retador_username,
                   u1.id_usuario as retador_id,
                   u2.username as defensor_username,
                   u2.id_usuario as defensor_id,
                   c.descripcion as nombre_carrera
            FROM duelos d
            LEFT JOIN usuario u1 ON d.id_retador = u1.id_usuario
            LEFT JOIN usuario u2 ON d.id_defensor = u2.id_usuario
            LEFT JOIN carrera c ON d.id_carrera = c.id_carrera
            WHERE d.id_duelo = ?
        `, [salaId]);
        
        if (!duelos.length) {
            console.log(`[RESULTADOS] ❌ Duelo no encontrado`);
            return res.redirect('/portal?error=duelo_no_encontrado');
        }
        
        const duelo = duelos[0];
        const esRetador = duelo.id_retador === idUsuario;
        const esDueloCarrera = duelo.id_carrera !== null && duelo.tipo_duelo === 'carrera';
        const idOponente = esRetador ? duelo.id_defensor : duelo.id_retador;
        
        console.log(`[RESULTADOS] 📋 Tipo: ${esDueloCarrera ? 'CARRERA' : 'GENERAL'}`);
        console.log(`[RESULTADOS] 📋 Es retador: ${esRetador}`);
        console.log(`[RESULTADOS] 📋 Carrera: ${duelo.id_carrera || 'N/A'}`);
        
        // 2️⃣ Obtener mis respuestas
        const [misRespuestas] = await pool.query(`
            SELECT 
                dr.id_pregunta,
                dr.id_respuesta,
                p.pregunta,
                p.puntos_carrera,
                r.respuesta as texto_respuesta,
                r.correcta as es_correcta,
                dp.orden
            FROM duelos_respuestas dr
            INNER JOIN duelos_preguntas dp ON dr.id_duelo = dp.id_duelo AND dr.id_pregunta = dp.id_pregunta
            INNER JOIN pregunta p ON dr.id_pregunta = p.id_pregunta
            INNER JOIN respuesta r ON dr.id_respuesta = r.id_respuesta
            WHERE dr.id_duelo = ? AND dr.id_usuario = ?
            ORDER BY dp.orden
        `, [salaId, idUsuario]);
        
        if (!misRespuestas.length) {
            console.log(`[RESULTADOS] ⚠️ Usuario no ha respondido aún`);
            return res.redirect(`/duelo/examen/${salaId}?mensaje=Completa el examen primero`);
        }
        
        // 3️⃣ Calcular mi puntaje
        const miPuntaje = misRespuestas.filter(r => r.es_correcta).length;
        const miPuntosCarrera = esDueloCarrera 
            ? misRespuestas.filter(r => r.es_correcta).reduce((sum, r) => sum + (r.puntos_carrera || 0), 0)
            : 0;
        
        console.log(`[RESULTADOS] ✅ Mi puntaje: ${miPuntaje}/${misRespuestas.length}`);
        console.log(`[RESULTADOS] 💎 Mis puntos carrera: ${miPuntosCarrera}`);
        
        // 4️⃣ Verificar si ambos terminaron
        const ambosTerminaron = duelo.respondido_retador && duelo.respondido_oponente;
        console.log(`[RESULTADOS] 🎯 Ambos terminaron: ${ambosTerminaron}`);
        
        let respuestasOponente = [];
        let oponentePuntaje = null;
        let oponentePuntosCarrera = 0;
        let nombreOponente = esRetador ? duelo.defensor_username : duelo.retador_username;
        let resultado = null;
        let puntosGanados = 0;
        let puntosCarreraGanados = 0;
        let infoRanking = null; // ✅ Declarar variable
        
        if (ambosTerminaron) {
            console.log(`[RESULTADOS] 👤 Oponente: ${nombreOponente} (ID: ${idOponente})`);
            
            // 5️⃣ Obtener respuestas del oponente
            const [respOponente] = await pool.query(`
                SELECT 
                    dr.id_pregunta,
                    p.puntos_carrera,
                    r.respuesta as texto_respuesta,
                    r.correcta as es_correcta
                FROM duelos_respuestas dr
                INNER JOIN pregunta p ON dr.id_pregunta = p.id_pregunta
                INNER JOIN respuesta r ON dr.id_respuesta = r.id_respuesta
                WHERE dr.id_duelo = ? AND dr.id_usuario = ?
            `, [salaId, idOponente]);
            
            respuestasOponente = respOponente;
            oponentePuntaje = respuestasOponente.filter(r => r.es_correcta).length;
            oponentePuntosCarrera = esDueloCarrera
                ? respuestasOponente.filter(r => r.es_correcta).reduce((sum, r) => sum + (r.puntos_carrera || 0), 0)
                : 0;
            
            console.log(`[RESULTADOS] 👤 Puntaje oponente: ${oponentePuntaje}/${respuestasOponente.length}`);
            console.log(`[RESULTADOS] 💎 Puntos carrera oponente: ${oponentePuntosCarrera}`);
            
            // 6️⃣ Finalizar duelo si no está finalizado
            if (duelo.estado !== 'finalizado') {
                console.log(`[RESULTADOS] 🏁 Finalizando duelo...`);
                
                resultado = await finalizarDueloConCarrera(
                    salaId, 
                    duelo, 
                    idUsuario, 
                    idOponente,
                    miPuntaje,
                    oponentePuntaje,
                    miPuntosCarrera,
                    oponentePuntosCarrera
                );
                
                console.log(`[RESULTADOS] ✅ Resultado:`, resultado);
                
                if (esDueloCarrera) {
                    puntosCarreraGanados = resultado.puntosCarreraGanados || 0;
                    puntosGanados = 0;
                } else {
                    puntosGanados = resultado.puntosGanados || 0;
                    puntosCarreraGanados = 0;
                }
                
            } else {
                // 7️⃣ Obtener del historial
                console.log(`[RESULTADOS] 📖 Obteniendo del historial...`);
                
                const [historial] = await pool.query(`
                    SELECT * FROM historial_duelos WHERE id_duelo = ?
                `, [salaId]);
                
                if (historial.length > 0) {
                    const hist = historial[0];
                    resultado = {
                        ganador: hist.id_ganador,
                        esDueloCarrera: esDueloCarrera
                    };
                    
                    // ✅ Obtener puntos correctos
                    if (esDueloCarrera) {
                        puntosCarreraGanados = esRetador 
                            ? (hist.puntos_retador || 0)
                            : (hist.puntos_defensor || 0);
                        puntosGanados = 0;
                    } else {
                        puntosGanados = esRetador 
                            ? (hist.puntos_retador || 0)
                            : (hist.puntos_defensor || 0);
                        puntosCarreraGanados = 0;
                    }
                    
                    // ✅ Obtener ranking
                    const puestoRetador = await obtenerRankingUsuario(duelo.retador_id);
                    const puestoDefensor = await obtenerRankingUsuario(duelo.defensor_id);
                    
                    infoRanking = {
                        puntosRetador: hist.puntos_retador,
                        puntosDefensor: hist.puntos_defensor,
                        puestoRetador,
                        puestoDefensor
                    };
                    
                    console.log(`[RESULTADOS] 📖 Historial - Puntos asignados correctamente`);
                }
            }
        }
        
        // 8️⃣ Combinar respuestas
        const respuestasCombinadas = misRespuestas.map((miResp, index) => {
            const respOp = respuestasOponente.find(r => r.id_pregunta === miResp.id_pregunta);

            return {
                orden: index + 1,
                pregunta: miResp.pregunta,
                mi_respuesta_texto: miResp.texto_respuesta,
                mi_correcta: miResp.es_correcta,
                oponente_respuesta_texto: respOp?.texto_respuesta || null,
                oponente_correcta: respOp?.es_correcta || null
            };
        });
        
        // 9️⃣ Preparar datos para la vista
        const tipoDuelo = esDueloCarrera ? 'carrera' : 'general';
        const totalPreguntas = misRespuestas.length; // ✅ Usar misRespuestas
        
        console.log(`[RESULTADOS] Mi puntaje: ${miPuntaje}/${totalPreguntas}`);
        
        // 🔟 Limpiar notificaciones
        try {
            await pool.query(`
                DELETE FROM notificaciones 
                WHERE (id_usuario_destinatario = ? OR id_usuario_remitente = ?)
                AND tipo = 'desafio_duelo'
                AND JSON_EXTRACT(extra_data, '$.id_duelo') = ?
            `, [idUsuario, idUsuario, salaId]);
            console.log(`[RESULTADOS] ✅ Notificaciones limpiadas`);
        } catch (cleanupError) {
            console.warn('⚠️ No se pudieron limpiar las notificaciones:', cleanupError.message);
        }

        console.log(`[RESULTADOS] 📊 Resumen:`);
        console.log(`[RESULTADOS]   - Tipo: ${tipoDuelo}`);
        console.log(`[RESULTADOS]   - Mi puntaje: ${miPuntaje}`);
        console.log(`[RESULTADOS]   - Oponente: ${oponentePuntaje}`);
        console.log(`[RESULTADOS]   - Puntos globales: ${puntosGanados}`);
        console.log(`[RESULTADOS]   - Puntos carrera: ${puntosCarreraGanados}`);
        console.log(`[RESULTADOS] ==========================================`);
        
        // 1️⃣1️⃣ Renderizar vista
        res.render('resultados-duelo', {
            layout: 'main',
            user: req.session.user,
            duelo: {
                ...duelo,
                nombre_carrera: duelo.nombre_carrera || null
            },
            tipoDuelo,
            miPuntaje,
            oponentePuntaje,
            nombreOponente,
            respuestas: respuestasCombinadas,
            ambosTerminaron,
            esRetador,
            correctas: miPuntaje,
            totalPreguntas,
            puntosGanados,
            puntosCarreraGanados,
            dificultad: DIFICULTADES[duelo.id_dificultad]?.nombre || 'Desconocida',
            apuesta: duelo.apuesta,
            _debug: {
                esDueloCarrera,
                id_carrera: duelo.id_carrera,
                tipo_duelo: duelo.tipo_duelo,
                miPuntosCarrera,
                oponentePuntosCarrera
            }
        });
        
    } catch (error) {
        console.error('❌ [RESULTADOS] Error:', error);
        console.error('❌ [RESULTADOS] Stack:', error.stack);
        res.status(500).send(`
            <h1>Error al mostrar resultados</h1>
            <p>${error.message}</p>
            <pre>${error.stack}</pre>
            <a href="/portal">Volver al portal</a>
        `);
    }
});


// =============================================
// 🏁 FINALIZAR DUELO (con puntos de carrera)
// =============================================

// =============================================
// 🏁 FINALIZAR DUELO - VERSIÓN CORREGIDA
// =============================================

// =============================================
// 🏁 FINALIZAR DUELO - VERSIÓN MEJORADA CON MÉTRICAS
// =============================================

async function finalizarDueloConCarrera(
    salaId, 
    duelo, 
    idUsuario, 
    idOponente, 
    miPuntaje, 
    oponentePuntaje, 
    miPuntosCarrera, 
    oponentePuntosCarrera
) {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        
        console.log(`[FINALIZAR DUELO] ==========================================`);
        console.log(`[FINALIZAR DUELO] 🎯 Duelo: ${salaId}`);
        console.log(`[FINALIZAR DUELO] 👤 Usuario: ${idUsuario}, Oponente: ${idOponente}`);
        console.log(`[FINALIZAR DUELO] 📊 Mi puntaje: ${miPuntaje}, Oponente: ${oponentePuntaje}`);
        
        const esRetador = duelo.id_retador === idUsuario;
        const apuesta = duelo.apuesta;
        const esDueloCarrera = duelo.id_carrera !== null && duelo.tipo_duelo === 'carrera';
        
        // ✅ Obtener total de preguntas
        const [totalPreguntas] = await conn.query(
            'SELECT COUNT(*) as total FROM duelos_preguntas WHERE id_duelo = ?',
            [salaId]
        );
        
        const numPreguntas = totalPreguntas[0].total;
        
        // ✅ Calcular preguntas correctas según rol
        const correctasRetador = esRetador ? miPuntaje : oponentePuntaje;
        const correctasDefensor = esRetador ? oponentePuntaje : miPuntaje;
        
        // ✅ Calcular porcentajes
        const porcentajeRetador = numPreguntas > 0 
            ? ((correctasRetador / numPreguntas) * 100).toFixed(2)
            : 0;
        const porcentajeDefensor = numPreguntas > 0 
            ? ((correctasDefensor / numPreguntas) * 100).toFixed(2)
            : 0;
        
        console.log(`[FINALIZAR DUELO] 📈 Total preguntas: ${numPreguntas}`);
        console.log(`[FINALIZAR DUELO] 📈 Retador: ${correctasRetador}/${numPreguntas} (${porcentajeRetador}%)`);
        console.log(`[FINALIZAR DUELO] 📈 Defensor: ${correctasDefensor}/${numPreguntas} (${porcentajeDefensor}%)`);
        
        let idGanador = null;
        let puntosRetador = 0;
        let puntosDefensor = 0;
        let puntosCarreraRetador = 0;
        let puntosCarreraDefensor = 0;
        
        // ✅ DETERMINAR GANADOR
        if (correctasRetador > correctasDefensor) {
            idGanador = duelo.id_retador;
            console.log(`[FINALIZAR DUELO] 🏆 GANADOR: Retador`);
        } else if (correctasDefensor > correctasRetador) {
            idGanador = duelo.id_defensor;
            console.log(`[FINALIZAR DUELO] 🏆 GANADOR: Defensor`);
        } else {
            idGanador = null;
            console.log(`[FINALIZAR DUELO] 🤝 EMPATE`);
        }
        
        // ✅ CALCULAR PUNTOS SEGÚN TIPO DE DUELO
        if (esDueloCarrera) {
            console.log(`[FINALIZAR DUELO] 💎 MODO CARRERA - Usando apuesta: ${apuesta}`);
            
            if (idGanador === duelo.id_retador) {
                puntosCarreraRetador = apuesta;
                puntosCarreraDefensor = -apuesta;
            } else if (idGanador === duelo.id_defensor) {
                puntosCarreraDefensor = apuesta;
                puntosCarreraRetador = -apuesta;
            } else {
                puntosCarreraRetador = 0;
                puntosCarreraDefensor = 0;
            }
            
            // ✅ ACTUALIZAR PUNTOS DE CARRERA
            const [puntosRetadorActuales] = await conn.query(
                'SELECT puntos FROM usuario_puntos_carrera WHERE id_usuario = ? AND id_carrera = ?',
                [duelo.id_retador, duelo.id_carrera]
            );
            
            const puntosRetadorNuevos = Math.max(0, 
                (puntosRetadorActuales[0]?.puntos || 0) + puntosCarreraRetador
            );
            
            await conn.query(`
                INSERT INTO usuario_puntos_carrera (id_usuario, id_carrera, puntos)
                VALUES (?, ?, ?)
                ON DUPLICATE KEY UPDATE puntos = ?
            `, [duelo.id_retador, duelo.id_carrera, puntosRetadorNuevos, puntosRetadorNuevos]);
            
            const [puntosDefensorActuales] = await conn.query(
                'SELECT puntos FROM usuario_puntos_carrera WHERE id_usuario = ? AND id_carrera = ?',
                [duelo.id_defensor, duelo.id_carrera]
            );
            
            const puntosDefensorNuevos = Math.max(0, 
                (puntosDefensorActuales[0]?.puntos || 0) + puntosCarreraDefensor
            );
            
            await conn.query(`
                INSERT INTO usuario_puntos_carrera (id_usuario, id_carrera, puntos)
                VALUES (?, ?, ?)
                ON DUPLICATE KEY UPDATE puntos = ?
            `, [duelo.id_defensor, duelo.id_carrera, puntosDefensorNuevos, puntosDefensorNuevos]);
            
            await verificarPromocionDisponible(idUsuario, puntos);
            
        } else {
            console.log(`[FINALIZAR DUELO] 🌍 MODO GENERAL - Usando apuesta: ${apuesta}`);
            
            if (idGanador === duelo.id_retador) {
                puntosRetador = apuesta;
                puntosDefensor = -apuesta;
            } else if (idGanador === duelo.id_defensor) {
                puntosDefensor = apuesta;
                puntosRetador = -apuesta;
            } else {
                puntosRetador = 0;
                puntosDefensor = 0;
            }
            
            // ✅ ACTUALIZAR PUNTOS GLOBALES
            await conn.query(
                'UPDATE usuario SET puntos = GREATEST(0, puntos + ?) WHERE id_usuario = ?',
                [puntosRetador, duelo.id_retador]
            );
            
            await conn.query(
                'UPDATE usuario SET puntos = GREATEST(0, puntos + ?) WHERE id_usuario = ?',
                [puntosDefensor, duelo.id_defensor]
            );
            
            console.log(`[FINALIZAR DUELO] ✅ Puntos globales actualizados`);
        }
        
        // ✅ REGISTRAR EN HISTORIAL CON MÉTRICAS COMPLETAS
        await conn.query(`
            INSERT INTO historial_duelos 
            (id_duelo, id_retador, id_defensor, id_ganador, 
             puntos_retador, puntos_defensor, 
             total_preguntas, correctas_retador, correctas_defensor,
             porcentaje_retador, porcentaje_defensor,
             fecha_duelo, motivo_abandono, penalizacion_aplicada, tipo_duelo)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NULL, 0, ?)
        `, [
            salaId, 
            duelo.id_retador, 
            duelo.id_defensor, 
            idGanador, 
            esDueloCarrera ? puntosCarreraRetador : puntosRetador,
            esDueloCarrera ? puntosCarreraDefensor : puntosDefensor,
            numPreguntas,
            correctasRetador,
            correctasDefensor,
            porcentajeRetador,
            porcentajeDefensor,
            esDueloCarrera ? 'carrera' : 'general'
        ]);
        
        // ✅ MARCAR DUELO COMO FINALIZADO
        await conn.query('UPDATE duelos SET estado = ? WHERE id_duelo = ?', ['finalizado', salaId]);
        
        // ✅ ELIMINAR NOTIFICACIÓN DEL DESAFÍO
        await conn.query(`
            DELETE FROM notificaciones 
            WHERE tipo = 'desafio_duelo' 
            AND JSON_EXTRACT(extra_data, '$.id_duelo') = ?
        `, [salaId]);
        
        console.log(`[FINALIZAR DUELO] ✅ Notificación de desafío eliminada`);
        
        // ✅ CREAR NOTIFICACIÓN DE RESULTADO PARA AMBOS
        const [retadorInfo] = await conn.query(
            'SELECT username FROM usuario WHERE id_usuario = ?',
            [duelo.id_retador]
        );
        
        const [defensorInfo] = await conn.query(
            'SELECT username FROM usuario WHERE id_usuario = ?',
            [duelo.id_defensor]
        );
        
        const retadorUsername = retadorInfo[0]?.username || 'Jugador';
        const defensorUsername = defensorInfo[0]?.username || 'Jugador';
        
        let mensajeRetador, mensajeDefensor;
        
        if (idGanador === duelo.id_retador) {
            mensajeRetador = `🏆 ¡Victoria! Derrotaste a ${defensorUsername} (${correctasRetador}/${numPreguntas}) +${Math.abs(puntosCarreraRetador || puntosRetador)} pts`;
            mensajeDefensor = `😔 Derrota ante ${retadorUsername} (${correctasDefensor}/${numPreguntas}) ${puntosCarreraDefensor || puntosDefensor} pts`;
        } else if (idGanador === duelo.id_defensor) {
            mensajeRetador = `😔 Derrota ante ${defensorUsername} (${correctasRetador}/${numPreguntas}) ${puntosCarreraRetador || puntosRetador} pts`;
            mensajeDefensor = `🏆 ¡Victoria! Derrotaste a ${retadorUsername} (${correctasDefensor}/${numPreguntas}) +${Math.abs(puntosCarreraDefensor || puntosDefensor)} pts`;
        } else {
            mensajeRetador = `🤝 Empate con ${defensorUsername} (${correctasRetador}/${numPreguntas})`;
            mensajeDefensor = `🤝 Empate con ${retadorUsername} (${correctasDefensor}/${numPreguntas})`;
        }
        
        // Notificación para retador
        await conn.query(`
            INSERT INTO notificaciones 
            (id_usuario_destinatario, id_usuario_remitente, tipo, mensaje, extra_data)
            VALUES (?, ?, 'resultado_duelo', ?, ?)
        `, [
            duelo.id_retador,
            duelo.id_defensor,
            mensajeRetador,
            JSON.stringify({
                id_duelo: salaId,
                resultado: idGanador === duelo.id_retador ? 'victoria' : (idGanador ? 'derrota' : 'empate'),
                correctas: correctasRetador,
                total: numPreguntas,
                porcentaje: porcentajeRetador
            })
        ]);
        
        // Notificación para defensor
        await conn.query(`
            INSERT INTO notificaciones 
            (id_usuario_destinatario, id_usuario_remitente, tipo, mensaje, extra_data)
            VALUES (?, ?, 'resultado_duelo', ?, ?)
        `, [
            duelo.id_defensor,
            duelo.id_retador,
            mensajeDefensor,
            JSON.stringify({
                id_duelo: salaId,
                resultado: idGanador === duelo.id_defensor ? 'victoria' : (idGanador ? 'derrota' : 'empate'),
                correctas: correctasDefensor,
                total: numPreguntas,
                porcentaje: porcentajeDefensor
            })
        ]);
        
        await conn.commit();
        await conn.release();
        
        console.log(`[FINALIZAR DUELO] ✅ PROCESO COMPLETADO`);
        console.log(`[FINALIZAR DUELO] ==========================================`);
        
        // ✅ RETORNAR VALORES CORRECTOS
        return {
            puntosGanados: !esDueloCarrera ? (esRetador ? puntosRetador : puntosDefensor) : 0,
            puntosCarreraGanados: esDueloCarrera ? (esRetador ? puntosCarreraRetador : puntosCarreraDefensor) : 0,
            ganador: idGanador,
            esDueloCarrera,
            correctas: esRetador ? correctasRetador : correctasDefensor,
            totalPreguntas: numPreguntas,
            porcentaje: esRetador ? porcentajeRetador : porcentajeDefensor
        };
        
    } catch (error) {
        await conn.rollback();
        await conn.release();
        console.error('❌ [FINALIZAR DUELO] Error:', error);
        throw error;
    }
}
// =============================================
// 🚪 ABANDONAR DUELO (Sistema mejorado)
// =============================================

router.post('/duelo/abandonar/:salaId', async (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'No autorizado' });
    
    const { salaId } = req.params;
    const { motivo } = req.body; // 'voluntario' o 'desconexion'
    const idUsuario = req.session.user.id_usuario;
    
    console.log(`[ABANDONO] Usuario ${idUsuario} abandonando duelo ${salaId} (${motivo})`);
    
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        
        // Obtener duelo
        const [duelo] = await conn.query(
            'SELECT * FROM duelos WHERE id_duelo = ? AND (id_retador = ? OR id_defensor = ?)',
            [salaId, idUsuario, idUsuario]
        );
        
        if (!duelo.length) {
            await conn.rollback();
            await conn.release();
            return res.status(404).json({ error: 'Duelo no encontrado' });
        }
        
        const dueloData = duelo[0];
        const apuesta = dueloData.apuesta;
        const esRetador = dueloData.id_retador === idUsuario;
        const idOponente = esRetador ? dueloData.id_defensor : dueloData.id_retador;
        
        // Calcular penalización
        let penalizacion = 0;
        let gananciaOponente = 0;
        
        if (motivo === 'voluntario') {
            // Pierde 100% de la apuesta
            penalizacion = apuesta;
            gananciaOponente = apuesta;
        } else {
            // Pierde 50% de la apuesta (desconexión)
            penalizacion = Math.floor(apuesta * PENALIZACIONES.DESCONEXION);
            gananciaOponente = penalizacion;
        }
        
        console.log(`[ABANDONO] Penalización: -${penalizacion} pts, Ganancia oponente: +${gananciaOponente} pts`);
        
        // Aplicar penalización
        await conn.query(
            'UPDATE usuario SET puntos = GREATEST(0, puntos - ?) WHERE id_usuario = ?',
            [penalizacion, idUsuario]
        );
        
        // Recompensar oponente
        await conn.query(
            'UPDATE usuario SET puntos = puntos + ? WHERE id_usuario = ?',
            [gananciaOponente, idOponente]
        );

        await verificarPromocionDisponible(idUsuario, puntos);
        
        // Registrar en historial
        await conn.query(`
            INSERT INTO historial_duelos 
            (id_duelo, id_retador, id_defensor, id_ganador, puntos_retador, puntos_defensor, 
             fecha_duelo, motivo_abandono, penalizacion_aplicada)
            VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, ?)
        `, [
            salaId,
            dueloData.id_retador,
            dueloData.id_defensor,
            idOponente, // Ganador
            esRetador ? -penalizacion : gananciaOponente,
            esRetador ? gananciaOponente : -penalizacion,
            motivo,
            penalizacion
        ]);
        
        // Marcar duelo como abandonado
        await conn.query('UPDATE duelos SET estado = ? WHERE id_duelo = ?', ['abandonado', salaId]);
        
        // Limpiar datos
        await conn.query('DELETE FROM duelos_preguntas WHERE id_duelo = ?', [salaId]);
        await conn.query('DELETE FROM duelos_respuestas WHERE id_duelo = ?', [salaId]);
        
        // Notificar oponente
        const [ganador] = await conn.query('SELECT username FROM usuario WHERE id_usuario = ?', [idOponente]);
        
        if (ganador.length) {
            await conn.query(`
                INSERT INTO notificaciones 
                (id_usuario_destinatario, id_usuario_remitente, tipo, mensaje, extra_data)
                VALUES (?, ?, 'duelo_abandonado', ?, ?)
            `, [
                idOponente,
                idUsuario,
                `¡${req.session.user.username} abandonó el duelo! Ganaste ${gananciaOponente} puntos 🏆`,
                JSON.stringify({ 
                    id_duelo: salaId, 
                    motivo,
                    ganancia: gananciaOponente
                })
            ]);
        }
        
        await conn.commit();
        await conn.release();
        
        // Emitir sockets
        if (req.io) {
            req.io.to(idOponente.toString()).emit('duelo:abandonado', {
                ganaste: true,
                mensaje: `${req.session.user.username} ha abandonado el duelo`,
                ganancia: gananciaOponente,
                id_duelo: salaId
            });
            
            req.io.to(idOponente.toString()).emit('notificacion_recibida');
        }
        
        console.log(`[ABANDONO] ✅ Proceso completado`);
        
        res.json({
            success: true,
            message: `Has abandonado el duelo. Penalización: -${penalizacion} puntos`,
            penalizacion,
            redirigir: '/portal'
        });
        
    } catch (error) {
        await conn.rollback();
        await conn.release();
        console.error('❌ Error al abandonar duelo:', error);
        res.status(500).json({ error: 'Error al abandonar: ' + error.message });
    }
});

// =============================================
// 🔄 VOLVER SIN INICIAR DUELO
// =============================================

router.post('/duelo/volver/:salaId', async (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'No autorizado' });

    const { salaId } = req.params;
    const idUsuario = req.session.user.id_usuario;

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const [dueloRows] = await conn.query(
            'SELECT * FROM duelos WHERE id_duelo = ?',
            [salaId]
        );

        if (!dueloRows.length) {
            await conn.rollback();
            await conn.release();
            return res.status(404).json({ error: 'Duelo no encontrado' });
        }

        const duelo = dueloRows[0];
        
        // Solo permitir volver si NINGUNO ha respondido aún
        if (duelo.respondido_retador || duelo.respondido_oponente) {
            await conn.rollback();
            await conn.release();
            return res.status(400).json({ 
                error: 'No puedes volver porque alguien ya inició el duelo' 
            });
        }
        
        // Eliminar duelo completo
        await conn.query('DELETE FROM duelos_preguntas WHERE id_duelo = ?', [salaId]);
        await conn.query('DELETE FROM duelos_respuestas WHERE id_duelo = ?', [salaId]);
        await conn.query('DELETE FROM duelos WHERE id_duelo = ?', [salaId]);
        
        // Eliminar notificaciones relacionadas
        await conn.query(`
            DELETE FROM notificaciones 
            WHERE tipo = 'desafio_duelo' 
            AND JSON_EXTRACT(extra_data, '$.id_duelo') = ?
        `, [salaId]);

        await conn.commit();
        await conn.release();

        console.log(`[VOLVER] Duelo ${salaId} eliminado (volver sin iniciar)`);

        res.json({ success: true, message: 'Has vuelto al portal sin penalización' });

    } catch (error) {
        await conn.rollback();
        await conn.release();
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
            SELECT 
                h.*,
                u1.username as retador_username,
                u1.foto_perfil as retador_foto,
                u2.username as defensor_username,  
                u2.foto_perfil as defensor_foto,
                ug.username as ganador_username,
                d.dificultad,
                d.apuesta
            FROM historial_duelos h
            LEFT JOIN usuario u1 ON h.id_retador = u1.id_usuario
            LEFT JOIN usuario u2 ON h.id_defensor = u2.id_usuario  
            LEFT JOIN usuario ug ON h.id_ganador = ug.id_usuario
            LEFT JOIN duelos d ON h.id_duelo = d.id_duelo
            WHERE h.id_retador = ? OR h.id_defensor = ?
            ORDER BY h.fecha_duelo DESC
            LIMIT 50
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
            SELECT 
                d.id_duelo,
                d.id_retador,
                d.id_defensor,
                d.estado,
                d.fecha_limite,
                d.dificultad,
                d.apuesta,
                u1.username as retador_username,
                u2.username as defensor_username
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
    if (!req.session.user || req.session.user.id_tp_usuario !== 1) {
        return res.status(403).json({ error: 'No autorizado' });
    }
    
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        
        const [duelosExpirados] = await conn.query(`
            SELECT id_duelo FROM duelos 
            WHERE fecha_limite < DATE_SUB(NOW(), INTERVAL 7 DAY)
            AND estado NOT IN ('finalizado', 'abandonado')
        `);
        
        let limpios = 0;
        for (const duelo of duelosExpirados) {
            await conn.query(`DELETE FROM duelos_preguntas WHERE id_duelo = ?`, [duelo.id_duelo]);
            await conn.query(`DELETE FROM duelos_respuestas WHERE id_duelo = ?`, [duelo.id_duelo]);
            await conn.query(`DELETE FROM duelos WHERE id_duelo = ?`, [duelo.id_duelo]);
            limpios++;
        }
        
        await conn.commit();
        await conn.release();
        
        res.json({ 
            success: true, 
            message: `${limpios} duelos antiguos eliminados`,
            eliminados: limpios
        });
        
    } catch (error) {
        await conn.rollback();
        await conn.release();
        console.error('❌ Error limpiando duelos:', error);
        res.status(500).json({ error: 'Error al limpiar duelos' });
    }
});

module.exports = router;