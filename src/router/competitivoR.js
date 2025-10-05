const express = require('express');
const router = express.Router();
const pool = require('../db/conexion');

// Número de preguntas por duelo
const NUM_PREGUNTAS_POR_DUELO = 10;

// --- FUNCIONES AUXILIARES ---

// Función para obtener las respuestas detalladas de un usuario en un duelo
async function obtenerRespuestas(idUsuario, salaId) {
    const [respuestas] = await pool.query(`
        SELECT 
            dr.id_pregunta,
            dr.id_respuesta,
            p.pregunta,
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

// Función para calcular el puntaje basado en respuestas correctas
function calcularPuntaje(respuestas) {
    return respuestas.filter(r => r.es_correcta).length;
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
    
    const diferencia = puestoDefensor - puestoRetador; // positivo = defensor está peor, negativo = defensor está mejor
    
    let puntosRetador = 0;
    let puntosDefensor = 0;
    
    if (ganoRetador) {
        // El retador ganó
        if (diferencia < 0) {
            // Ganó contra alguien mejor posicionado (puesto menor)
            const bonus = Math.min(Math.abs(diferencia) * BONUS_POR_PUESTO, BONUS_MAXIMO);
            puntosRetador = PUNTOS_BASE_VICTORIA + bonus;
        } else {
            // Ganó contra alguien peor posicionado
            puntosRetador = Math.max(PUNTOS_BASE_VICTORIA - (diferencia * PENALIZACION_POR_PUESTO), PUNTOS_MINIMOS);
        }
        
        // El defensor perdió
        if (diferencia < 0) {
            // Perdió contra alguien peor posicionado (penalización mayor)
            puntosDefensor = PUNTOS_PERDIDA_CONTRA_PEOR;
        } else {
            puntosDefensor = PUNTOS_PERDIDA;
        }
    } else {
        // El defensor ganó
        if (diferencia > 0) {
            // Ganó contra alguien mejor posicionado
            const bonus = Math.min(diferencia * BONUS_POR_PUESTO, BONUS_MAXIMO);
            puntosDefensor = PUNTOS_BASE_VICTORIA + bonus;
        } else {
            // Ganó contra alguien peor posicionado
            puntosDefensor = Math.max(PUNTOS_BASE_VICTORIA - (Math.abs(diferencia) * PENALIZACION_POR_PUESTO), PUNTOS_MINIMOS);
        }
        
        // El retador perdió
        if (diferencia > 0) {
            // Perdió contra alguien peor posicionado
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
        
        // Obtener información del duelo
        const [duelo] = await conn.query('SELECT * FROM duelos WHERE id_duelo = ?', [salaId]);
        if (!duelo.length) throw new Error('Duelo no encontrado');
        
        const esRetadorGanador = duelo[0].id_retador === idGanador;
        
        // Obtener rankings
        const puestoRetador = await obtenerRankingUsuario(duelo[0].id_retador);
        const puestoDefensor = await obtenerRankingUsuario(duelo[0].id_defensor);
        
        // Calcular puntos según ranking
        const { puntosRetador, puntosDefensor } = calcularPuntosSegunRanking(
            puestoRetador, 
            puestoDefensor, 
            esRetadorGanador
        );
        
        // Actualizar puntos de los usuarios
        await conn.query(
            'UPDATE usuario SET puntos = puntos + ? WHERE id_usuario = ?',
            [puntosRetador, duelo[0].id_retador]
        );
        
        await conn.query(
            'UPDATE usuario SET puntos = puntos + ? WHERE id_usuario = ?',
            [puntosDefensor, duelo[0].id_defensor]
        );
        
        // Registrar en historial
        await conn.query(`
            INSERT INTO historial_duelos 
            (id_duelo, id_retador, id_defensor, id_ganador, puntos_retador, puntos_defensor,fecha_duelo)
            VALUES (?, ?, ?, ?, ?, ?, NOW())
        `, [salaId, duelo[0].id_retador, duelo[0].id_defensor, idGanador, 
            esRetadorGanador ? puntajeGanador : puntajePerdedor,
            esRetadorGanador ? puntajePerdedor : puntajeGanador,
            puntosRetador, puntosDefensor]);
        
        // Actualizar estado del duelo
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

// --- RUTA PARA LA "SALA DE DUELOS" 1V1 ---
router.get('/portal', async (req, res) => {
    try {
        const [userData] = await pool.query(
            `SELECT 
                u.puntos,
                COALESCE((SELECT COUNT(*) FROM historial_duelos WHERE id_retador = u.id_usuario OR id_defensor = u.id_usuario), 0) AS duelos_jugados,
                COALESCE((SELECT COUNT(*) FROM historial_duelos WHERE id_ganador = u.id_usuario), 0) AS victorias
            FROM usuario u WHERE u.id_usuario = ?`,
            [req.session.user.id_usuario]
        );
        
        res.render('duelodelascenso', {
            layout: 'main',
            user: req.session.user,
            stats: userData[0] || { puntos: 0, duelos_jugados: 0, victorias: 0 }
        });

    } catch (error) {
        console.error("Error al cargar la sala de duelos:", error);
        res.redirect('/menu_principal');
    }
});

// --- RUTA PARA LA VISTA DEL ENFRENTAMIENTO ---
router.get('/duelo/enfrentamiento/:salaId', async (req, res) => {
    if (!req.session.user) return res.redirect('/login');

    const { salaId } = req.params;
    const userId = req.session.user.id_usuario;

    try {
        const [duelos] = await pool.query(
            `SELECT * FROM duelos WHERE id_duelo = ? AND (id_retador = ? OR id_defensor = ?)`,
            [salaId, userId, userId]
        );

        if (duelos.length === 0) return res.redirect('/portal?error=duelo_no_encontrado');

        const duelo = duelos[0];

        res.render('examen-competitivo', { 
            layout: 'main',
            user: req.session.user,
            salaId: salaId,
            duelo: duelo,
            esRetador: duelo.id_retador === userId
        });

    } catch (error) {
        console.error('Error al cargar duelo:', error);
        res.redirect('/portal?error=error_servidor');
    }
});

// --- API: Rankings ---
router.get('/api/ranking/global', async (req, res) => {
    try {
        const [jugadores] = await pool.query(`
            SELECT u.id_usuario, u.username, u.foto_perfil, u.puntos
            FROM usuario u ORDER BY u.puntos DESC LIMIT 100;
        `);
        res.json(jugadores);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener el ranking global' });
    }
});

router.get('/api/ranking/carrera/:id_carrera', async (req, res) => {
    try {
        const { id_carrera } = req.params;
        const [jugadores] = await pool.query(`
            SELECT u.id_usuario, u.username, u.foto_perfil, upc.puntos
            FROM usuario u
            INNER JOIN usuario_puntos_carrera upc ON u.id_usuario = upc.id_usuario
            WHERE upc.id_carrera = ?
            ORDER BY upc.puntos DESC LIMIT 100;
        `, [id_carrera]);
        res.json(jugadores);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener el ranking de carrera' });
    }
});

router.get('/api/usuario/carreras', async (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'No autorizado' });
    try {
        const [carreras] = await pool.query(`
            SELECT c.id_carrera, c.descripcion 
            FROM carrera c
            INNER JOIN usuario_carrera uc ON c.id_carrera = uc.id_carrera
            WHERE uc.id_usuario = ?;
        `, [req.session.user.id_usuario]);
        res.json(carreras);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener las carreras del usuario' });
    }
});

// --- RUTA PARA CREAR/ENVIAR DUELO ---
router.post('/desafiar/duelo/:idOponente', async (req, res) => {
    if (!req.session.user) return res.status(401).json({ message: 'No has iniciado sesión' });

    const { idOponente } = req.params;
    const { id_usuario: idRemitente, username: usernameRemitente } = req.session.user;

    const mensajeNotificacion = `${usernameRemitente} te desafía a un Duelo de Ascenso!`;
    const extraDataBase = {
        remitente: {
            id_usuario: idRemitente,
            username: usernameRemitente,
            email: req.session.user.email,
            id_tp_usuario: req.session.user.id_tp_usuario,
            foto_perfil: req.session.user.foto_perfil
        },
        tiempoLimite: 2 * 24 * 60 * 60
    };

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const id_duelo = `duelo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const fechaLimite = new Date();
        fechaLimite.setHours(fechaLimite.getHours() + 48);

        await conn.query(
            `INSERT INTO duelos (id_duelo, id_retador, id_defensor, fecha_limite, estado, respondido_retador, respondido_oponente)
             VALUES (?, ?, ?, ?, 'pendiente', 0, 0)`,
            [id_duelo, idRemitente, idOponente, fechaLimite]
        );

        // Limpiar preguntas por seguridad
        await conn.query(`DELETE FROM duelos_preguntas WHERE id_duelo = ?`, [id_duelo]);

        // Generar preguntas aleatorias
        const [preguntas] = await conn.query(`SELECT id_pregunta, pregunta FROM pregunta GROUP BY pregunta ORDER BY RAND() LIMIT ?`, [NUM_PREGUNTAS_POR_DUELO]);
        if (!preguntas || preguntas.length === 0) {
            await conn.rollback();
            await conn.release();
            return res.status(500).json({ message: 'No hay preguntas disponibles' });
        }

        for (let i = 0; i < preguntas.length; i++) {
            await conn.query(`INSERT INTO duelos_preguntas (id_duelo, id_pregunta, orden) VALUES (?, ?, ?)`, [id_duelo, preguntas[i].id_pregunta, i + 1]);
        }

        // Notificación
        const extraData = { ...extraDataBase, id_duelo };
        await conn.query(
            `INSERT INTO notificaciones (id_usuario_destinatario, id_usuario_remitente, tipo, mensaje, extra_data) 
             VALUES (?, ?, 'desafio_duelo', ?, ?)`,
            [idOponente, idRemitente, mensajeNotificacion, JSON.stringify(extraData)]
        );

        await conn.commit();
        await conn.release();

        if (req.io) req.io.to(idOponente.toString()).emit('notificacion_recibida');

        res.json({ success: true, message: '¡Desafío enviado!', id_duelo, extraData });

    } catch (err) {
        try { await conn.rollback(); } catch(e){ /* ignore */ }
        await conn.release();
        console.error('Error enviando desafío:', err);
        res.status(500).json({ message: 'Error del servidor al enviar el desafío' });
    }
});

// --- RUTA EXAMEN INDIVIDUAL DUELO ---
router.get('/duelo/examen/:salaId', async (req, res) => {
    if (!req.session.user) return res.redirect('/login');

    const { salaId } = req.params;
    const userId = req.session.user.id_usuario;

    try {
        const [duelos] = await pool.query(
            `SELECT d.*, 
             u1.username as retador_username, 
             u2.username as defensor_username
             FROM duelos d
             LEFT JOIN usuario u1 ON d.id_retador = u1.id_usuario
             LEFT JOIN usuario u2 ON d.id_defensor = u2.id_usuario
             WHERE d.id_duelo = ? AND (d.id_retador = ? OR d.id_defensor = ?)`,
            [salaId, userId, userId]
        );

        if (duelos.length === 0) return res.redirect('/portal?error=duelo_no_encontrado');

        const duelo = duelos[0];
        const esRetador = duelo.id_retador === userId;

        // ✅ Cambiado: verificar si ya terminó usando respondido_retador/oponente
        if ((esRetador && duelo.respondido_retador) || (!esRetador && duelo.respondido_oponente)) {
            return res.redirect(`/duelo/resultados/${salaId}?mensaje=Ya completaste este examen`);
        }

        if (new Date() > new Date(duelo.fecha_limite)) {
            return res.redirect(`/duelo/resultados/${salaId}?mensaje=El tiempo para este duelo ha expirado`);
        }

        // Cargar preguntas
        const [preguntas] = await pool.query(
            `SELECT p.id_pregunta, p.pregunta, dp.orden
             FROM duelos_preguntas dp
             INNER JOIN pregunta p ON dp.id_pregunta = p.id_pregunta
             WHERE dp.id_duelo = ?
             ORDER BY dp.orden`,
            [salaId]
        );

        if (!preguntas.length) return res.redirect('/portal?error=no_hay_preguntas');

        for (let pregunta of preguntas) {
            const [respuestas] = await pool.query(
                `SELECT id_respuesta, respuesta, correcta FROM respuesta WHERE id_pregunta = ? ORDER BY id_respuesta`,
                [pregunta.id_pregunta]
            );
            pregunta.respuestas = respuestas;
        }

        res.render('examen-duelo-individual', {
            layout: 'main',
            user: req.session.user,
            duelo: duelo,
            preguntas: preguntas,
            esRetador,
            tiempoRestante: Math.max(0, new Date(duelo.fecha_limite) - new Date())
        });

    } catch (error) {
        console.error('Error al cargar examen de duelo:', error);
        res.redirect('/portal?error=error_servidor');
    }
});

// --- POST: Guardar respuestas duelo ---
router.post('/duelo/responder/:salaId', async (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'No autorizado' });

    const { salaId } = req.params;
    const { respuestas } = req.body;
    const id_usuario = req.session.user.id_usuario;

    try {
        const respuestasObj = typeof respuestas === 'string' ? JSON.parse(respuestas) : respuestas;

        const [duelos] = await pool.query(
            `SELECT * FROM duelos WHERE id_duelo = ? AND (id_retador = ? OR id_defensor = ?)`,
            [salaId, id_usuario, id_usuario]
        );
        if (!duelos.length) return res.status(404).json({ error: 'Duelo no encontrado' });

        const duelo = duelos[0];
        const esRetador = duelo.id_retador === id_usuario;

        // Guardar respuestas
        for (const [id_pregunta, id_respuesta] of Object.entries(respuestasObj)) {
            await pool.query(
                `INSERT INTO duelos_respuestas (id_duelo, id_usuario, id_pregunta, id_respuesta) VALUES (?, ?, ?, ?)`,
                [salaId, id_usuario, id_pregunta, id_respuesta]
            );
        }

        // Marcar duelo como respondido
        if (esRetador) await pool.query(`UPDATE duelos SET respondido_retador = 1 WHERE id_duelo = ?`, [salaId]);
        else await pool.query(`UPDATE duelos SET respondido_oponente = 1 WHERE id_duelo = ?`, [salaId]);

        res.redirect(`/duelo/resultados/${salaId}`);

    } catch (error) {
        console.error('Error guardando respuestas del duelo:', error);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

// --- API: Verificar estado del duelo ---
router.get('/duelo/estado/:salaId', async (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'No autorizado' });

    const { salaId } = req.params;

    try {
        const ambosCompletaron = await verificarAmbosTerminaron(salaId);
        res.json({ ambosCompletaron });
    } catch (error) {
        console.error('Error verificando estado del duelo:', error);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

router.get('/duelo/resultados/:salaId', async (req, res) => {
    if (!req.session.user) return res.redirect('/login');

    const { salaId } = req.params;
    const idUsuario = req.session.user.id_usuario;

    try {
        // Obtener información del duelo
        const duelo = await obtenerDuelo(salaId);
        if (!duelo) return res.redirect('/portal?error=duelo_no_encontrado');

        // Obtener respuestas del usuario
        const misRespuestasDetalladas = await obtenerRespuestas(idUsuario, salaId);

        // Verificar si ambos terminaron
        const ambosTerminaron = await verificarAmbosTerminaron(salaId);

        // Obtener respuestas del oponente solo si ambos terminaron
        let respuestasOponenteDetalladas = [];
        let oponentePuntaje = null;
        let nombreOponente = '';
        let puntosGanados = null;
        let infoRanking = null;

        if (ambosTerminaron) {
            const oponente = await obtenerOponente(idUsuario, salaId);
            if (oponente) {
                nombreOponente = oponente.username;
                respuestasOponenteDetalladas = await obtenerRespuestas(oponente.id, salaId);
                oponentePuntaje = calcularPuntaje(respuestasOponenteDetalladas);

                // Finalizar duelo solo si aún no se ha finalizado
                if (duelo.estado !== 'finalizado') {
                    const miPuntaje = calcularPuntaje(misRespuestasDetalladas);
                    let idGanador, idPerdedor;

                    if (miPuntaje > oponentePuntaje) {
                        idGanador = idUsuario;
                        idPerdedor = oponente.id;
                    } else if (oponentePuntaje > miPuntaje) {
                        idGanador = oponente.id;
                        idPerdedor = idUsuario;
                    } else {
                        idGanador = null;
                        idPerdedor = null;
                    }

                    if (idGanador) {
                        infoRanking = await finalizarDuelo(
                            salaId, 
                            idGanador, 
                            idPerdedor, 
                            idGanador === idUsuario ? miPuntaje : oponentePuntaje,
                            idGanador === idUsuario ? oponentePuntaje : miPuntaje
                        );

                        const esRetador = duelo.id_retador === idUsuario;
                        puntosGanados = esRetador ? infoRanking.puntosRetador : infoRanking.puntosDefensor;
                    }
                } else {
                    // Si ya está finalizado, obtener los puntos del historial
                    const [historial] = await pool.query(
                        `SELECT puntos_retador, puntos_defensor 
                         FROM historial_duelos 
                         WHERE id_duelo = ?`, [salaId]
                    );
                    if (historial.length > 0) {
                        const esRetador = duelo.id_retador === idUsuario;
                        puntosGanados = esRetador ? historial[0].puntos_retador : historial[0].puntos_defensor;
                    }
                }
            }
        }

        // Combinar respuestas para mostrar en la vista
        let respuestasCombinadas = misRespuestasDetalladas.map((miResp, index) => {
            const respOponente = respuestasOponenteDetalladas.find(r => r.id_pregunta === miResp.id_pregunta);
            return {
                id_pregunta: miResp.id_pregunta,
                orden: index + 1,
                pregunta: miResp.pregunta,
                mi_respuesta_texto: miResp.texto_respuesta,
                mi_correcta: miResp.es_correcta,
                oponente_respuesta_texto: respOponente ? respOponente.texto_respuesta : null,
                oponente_correcta: respOponente ? respOponente.es_correcta : null,
            };
        });

        // ✅ Eliminar preguntas duplicadas (por texto de la pregunta)
        const respuestasCombinadasUnicas = [...new Map(respuestasCombinadas.map(r => [r.pregunta, r])).values()].map((r, index) => ({ ...r, orden: index + 1 })); 

        const miPuntaje = calcularPuntaje(misRespuestasDetalladas);

        res.render('resultados-duelo', {
            layout: 'main',
            user: req.session.user,
            duelo: duelo,
            miPuntaje,
            oponentePuntaje,
            nombreOponente,
            respuestas: respuestasCombinadasUnicas, // Usamos la versión única
            ambosTerminaron,
            esRetador: idUsuario === duelo.retador_id
        });

    } catch (err) {
        console.error('Error mostrando resultados del duelo:', err);
        res.status(500).send('Ocurrió un error al mostrar los resultados del duelo.');
    }
});


////////////////////////////////////////////////////////////// MATCHMAKING ////////////////////////////////////////////////////////////////

router.get('/matchmaking', async (req, res) => {
    console.log('👉 Sesión actual:', req.session.user);
    try {
        const userId = req.session.user.id_usuario;
        
        const [userData] = await pool.query(
            `SELECT 
                u.puntos,
                COALESCE(SUM(CASE WHEN h.id_ganador = u.id_usuario THEN 1 ELSE 0 END), 0) AS victorias,
                COALESCE(SUM(CASE WHEN h.id_ganador IS NOT NULL AND h.id_ganador != u.id_usuario THEN 1 ELSE 0 END), 0) AS derrotas
            FROM 
                usuario u
            LEFT JOIN 
                historial_duelos h ON u.id_usuario = h.id_retador OR u.id_usuario = h.id_defensor
            WHERE 
                u.id_usuario = ?
            GROUP BY
                u.id_usuario, u.puntos`,
            [userId]
        );

        // El resultado estará en userData[0]
        // Calcular ranking (posición en el ranking global)
        const [rankingData] = await pool.query(
            `SELECT COUNT(*) + 1 as rank
             FROM usuario 
             WHERE puntos > (SELECT puntos FROM usuario WHERE id_usuario = ?)`,
            [userId]
        );

        // Calcular progreso hacia el siguiente rango (ejemplo simple)
        const currentPoints = userData[0]?.puntos || 0;
        const nextRankPoints = Math.ceil((currentPoints + 100) / 100) * 100;
        const progressPercent = ((currentPoints % 100) / 100) * 100;

        const stats = {
            ...userData[0],
            rank: rankingData[0]?.rank || 1,
            progress_percent: progressPercent,
            points_needed: nextRankPoints - currentPoints
        };
        
        res.render('matchmaking', {
            layout: 'main',
            user: req.session.user,
            stats: stats
        });

    } catch (error) {
        console.error("Error al cargar la sala de duelos:", error);
    }
});


// ✅ RUTA PARA BUSCAR USUARIOS PARA DESAFÍO
router.get('/api/buscar/usuarios', async (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'No autorizado' });
    
    try {
        const { q } = req.query; // Query de búsqueda
        let query = `
            SELECT u.id_usuario, u.username, u.foto_perfil, u.puntos
            FROM usuario u
            WHERE u.id_usuario != ?
        `;
        let params = [req.session.user.id_usuario];

        if (q && q.trim()) {
            query += ` AND u.username LIKE ?`;
            params.push(`%${q.trim()}%`);
        }

        query += ` ORDER BY u.puntos DESC LIMIT 20`;

        const [usuarios] = await pool.query(query, params);
        res.json(usuarios);
    } catch (error) {
        console.error('Error buscando usuarios:', error);
        res.status(500).json({ error: 'Error al buscar usuarios' });
    }
});

// ✅ RUTA PARA HISTORIAL DE DUELOS
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
                ug.username as ganador_username
            FROM historial_duelos h
            LEFT JOIN usuario u1 ON h.id_retador = u1.id_usuario
            LEFT JOIN usuario u2 ON h.id_defensor = u2.id_usuario  
            LEFT JOIN usuario ug ON h.id_ganador = ug.id_usuario
            WHERE h.id_retador = ? OR h.id_defensor = ?
            ORDER BY h.fecha_duelo DESC
            LIMIT 50
        `, [req.session.user.id_usuario, req.session.user.id_usuario]);
        
        res.json(historial);
    } catch (error) {
        console.error('Error al obtener historial:', error);
        res.status(500).json({ error: 'Error al obtener historial de duelos' });
    }
});

router.get('/sala/:salaId', async (req, res, next) => {
    if (!req.session.user) {
        return res.redirect('/');
    }

    try {
        const { salaId } = req.params;
        const userId = req.session.user.id_usuario;
        
        // Validar UUID
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(salaId)) {
            console.log(`[ROUTER]: UUID inválido: ${salaId}`);
            return res.redirect('/competitivo/portal');
        }

        // ✅ VERIFICAR QUE LA SALA EXISTA EN EL SERVIDOR
        const salasPendientes = global.salasPendientes;
        const salasEspera = global.salasEspera || new Map();
        
        const salaExiste = salasPendientes.has(salaId) || salasEspera.has(salaId);
        
        if (!salaExiste) {
            console.log(`[ROUTER]: Sala ${salaId} no encontrada en servidor`);
            req.session.errorMsg = 'La sala no existe o expiró. Solicita una nueva invitación.';
            return res.redirect('/competitivo/portal');
        }

        const sala = salasPendientes.get(salaId) || salasEspera.get(salaId);
        
        // Verificar que el usuario sea parte de la sala
        const retadorId = sala.retador || sala.idRetador;
        const retadoId = sala.retado || sala.idRetado;
        
        if (parseInt(userId) !== parseInt(retadorId) && parseInt(userId) !== parseInt(retadoId)) {
            console.log(`[ROUTER]: Usuario ${userId} no es parte de la sala ${salaId}`);
            req.session.errorMsg = 'No tienes acceso a esta sala.';
            return res.redirect('/competitivo/portal');
        }

        console.log(`[ROUTER]: ✅ Sala ${salaId} válida para usuario ${userId}`);

        // CONTINUAR CON EL CÓDIGO ORIGINAL...
        const [userData] = await pool.query(
            `SELECT 
                u.puntos,
                COALESCE(SUM(CASE WHEN h.id_ganador = u.id_usuario THEN 1 ELSE 0 END), 0) AS victorias,
                COALESCE(SUM(CASE WHEN h.id_ganador IS NOT NULL AND h.id_ganador != u.id_usuario THEN 1 ELSE 0 END), 0) AS derrotas
            FROM 
                usuario u
            LEFT JOIN 
                historial_duelos h ON u.id_usuario = h.id_retador OR u.id_usuario = h.id_defensor
            WHERE 
                u.id_usuario = ?
            GROUP BY
                u.id_usuario, u.puntos`,
            [userId]
        );

        const [rankingData] = await pool.query(
            `SELECT COUNT(*) + 1 as rank
             FROM usuario 
             WHERE puntos > (SELECT puntos FROM usuario WHERE id_usuario = ?)`,
            [userId]
        );

        const currentPoints = userData[0]?.puntos || 0;
        const nextRankPoints = Math.ceil((currentPoints + 100) / 100) * 100;
        const progressPercent = ((currentPoints % 100) / 100) * 100;

        const stats = {
            ...userData[0],
            rank: rankingData[0]?.rank || 1,
            progress_percent: progressPercent,
            points_needed: nextRankPoints - currentPoints
        };
        
        res.render('matchmaking', {
            layout: 'main',
            user: req.session.user,
            stats: stats,
            salaId: salaId,
            enSala: true
        });

    } catch (error) {
        console.error("[ROUTER ERROR] al cargar sala:", error);
        res.redirect('/competitivo/portal');
    }
});
module.exports = router;