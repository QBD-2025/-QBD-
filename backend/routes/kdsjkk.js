// src/router/competitivoR.js(actual)
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
        from usuario 
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
        from usuario
        WHERE puntos > (SELECT puntos from usuario WHERE id_usuario = ?)
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

router.get('/portal', async (req, res) => {
    try {
        const userId = req.session.user.id_usuario;

        // Obtener la carrera principal del usuario
        const [carreras] = await pool.query(`
            SELECT c.id_carrera, c.descripcion 
            FROM carrera c
            INNER JOIN usuario_carrera uc ON c.id_carrera = uc.id_carrera
            WHERE uc.id_usuario = ?
            LIMIT 1
        `, [userId]);

        const carrera = carreras.length > 0 ? carreras[0] : null;

        const [userData] = await pool.query(
            `SELECT 
                u.puntos,
                COALESCE((SELECT COUNT(*) FROM historial_duelos WHERE id_retador = u.id_usuario OR id_defensor = u.id_usuario), 0) AS duelos_jugados,
                COALESCE((SELECT COUNT(*) FROM historial_duelos WHERE id_ganador = u.id_usuario), 0) AS victorias
             from usuario u 
             WHERE u.id_usuario = ?`,
            [userId]
        );

        res.render('duelodelascenso', {
            layout: 'main',
            user: { ...req.session.user, id_carrera: carrera ? carrera.id_carrera : null }, // 👈 agregamos la carrera aquí
            stats: userData[0] || { puntos: 0, duelos_jugados: 0, victorias: 0 }
        });

    } catch (error) {
        console.error("Error al cargar la sala de duelos:", error);
        res.redirect('/menu_principal');
    }
});
// ============================================================
// 📨 RUTA: Enviar Invitación de Desafío por BD (CORREGIDA)
// ============================================================
router.post('/invitaciones/desafio/duelo/:idOponente', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ 
            success: false, 
            message: 'No has iniciado sesión' 
        });
    }

    const { idOponente } = req.params;
    const { modo, dificultad } = req.body;
    const idRemitente = req.session.user.id_usuario;
    const usernameRemitente = req.session.user.username;

    // Validar que no se desafíe a sí mismo
    if (parseInt(idRemitente) === parseInt(idOponente)) {
        return res.status(400).json({ 
            success: false, 
            message: 'No puedes desafiarte a ti mismo' 
        });
    }

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // Verificar si ya existe un desafío pendiente reciente (últimos 5 minutos)
        const [desafiosPendientes] = await conn.query(`
            SELECT id_notificacion 
            FROM notificaciones 
            WHERE id_usuario_remitente = ? 
            AND id_usuario_destinatario = ? 
            AND tipo = 'desafio_duelo'
            AND fecha_creacion > DATE_SUB(NOW(), INTERVAL 5 MINUTE)
            AND leida = 0
        `, [idRemitente, idOponente]);

        if (desafiosPendientes.length > 0) {
            await conn.rollback();
            await conn.release();
            return res.status(429).json({ 
                success: false, 
                message: 'Ya tienes un desafío pendiente con este usuario. Espera 5 minutos.' 
            });
        }

        // ✅ CREAR SALA PENDIENTE usando la función global
        const salaId = global.crearSalaPendiente(idRemitente, idOponente, req.io);
        
        console.log(`[BD DESAFÍO]: Sala ${salaId} creada - ${usernameRemitente} → Oponente ${idOponente}`);

        // Crear notificación en la base de datos
        const mensaje = `${usernameRemitente} te desafía a un duelo!`;
        const extraData = {
            salaId,
            id_duelo: salaId,
            modo: modo || 'general',
            dificultad: dificultad || null,
            remitente: {
                id_usuario: idRemitente,
                username: usernameRemitente,
                foto_perfil: req.session.user.foto_perfil
            },
            tiempoLimite: 180 // 3 minutos en segundos
        };

        const [resultado] = await conn.query(`
            INSERT INTO notificaciones 
            (id_usuario_destinatario, id_usuario_remitente, tipo, mensaje, extra_data, fecha_creacion, leida)
            VALUES (?, ?, 'desafio_duelo', ?, ?, NOW(), 0)
        `, [idOponente, idRemitente, mensaje, JSON.stringify(extraData)]);

        await conn.commit();
        await conn.release();

        console.log(`[BD DESAFÍO]: ✅ Notificación creada - ID: ${resultado.insertId}`);

        // Emitir evento de socket al destinatario
        if (req.io) {
            const oponenteSocketId = global.usuariosConectados?.get(parseInt(idOponente));
            if (oponenteSocketId) {
                req.io.to(oponenteSocketId).emit('notificacion_recibida', {
                    tipo: 'desafio_duelo',
                    mensaje,
                    salaId,
                    id_notificacion: resultado.insertId
                });
                console.log(`[BD DESAFÍO]: Socket emitido a ${oponenteSocketId}`);
            } else {
                console.log(`[BD DESAFÍO]: Oponente ${idOponente} no tiene socket activo`);
            }
        }

        res.json({
            success: true,
            message: 'Desafío enviado correctamente',
            salaId,
            id_notificacion: resultado.insertId
        });

    } catch (error) {
        await conn.rollback();
        await conn.release();
        console.error('[BD DESAFÍO ERROR]:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error del servidor al enviar el desafío' 
        });
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
            from usuario u ORDER BY u.puntos DESC LIMIT 100;
        `);
        res.json(jugadores);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener el ranking global' });
    }
});

router.get('/api/ranking/carrera/:id_carrera', async (req, res) => {
    try {
        const [jugadores] = await pool.query(`
            SELECT u.id_usuario, u.username, u.foto_perfil, u.puntos
            from usuario u
            INNER JOIN usuario_carrera uc ON u.id_usuario = uc.id_usuario
            WHERE uc.id_carrera = ?
            ORDER BY u.puntos DESC
            LIMIT 100;
        `, [req.params.id_carrera]);
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

// ✅ AGREGAR ESTAS RUTAS A competitivoR.js (después de la ruta /portal)

// ================================================================
// 🎮 RUTA: Vista de Matchmaking con Invitaciones
// ================================================================
router.get('/matchmaking', async (req, res) => {
    if (!req.session.user) return res.redirect('/login');

    try {
        const userId = req.session.user.id_usuario;
        
        // Obtener estadísticas del usuario
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

        // Calcular ranking (posición en el ranking global)
        const [rankingData] = await pool.query(
            `SELECT COUNT(*) + 1 as rank
             from usuario 
             WHERE puntos > (SELECT puntos from usuario WHERE id_usuario = ?)`,
            [userId]
        );

        // Calcular progreso hacia el siguiente rango
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
        console.error("Error al cargar matchmaking:", error);
        res.redirect('/competitivo/portal');
    }
});

// ================================================================
// 📊 API: Obtener usuarios online en el portal competitivo
// ================================================================
router.get('/api/usuarios/online', async (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'No autorizado' });
    
    try {
        // Obtener usuarios conectados desde el sistema global de sockets
        const usuariosEnPortal = global.usuariosEnPortalCompetitivo || new Set();
        const usuariosConectados = global.usuariosConectados || new Map();
        
        // Convertir a array de IDs
        const idsOnline = Array.from(usuariosEnPortal);
        
        if (idsOnline.length === 0) {
            return res.json([]);
        }
        
        // Obtener información básica de los usuarios online
        const placeholders = idsOnline.map(() => '?').join(',');
        const [usuarios] = await pool.query(
            `SELECT id_usuario, username, foto_perfil, puntos 
             from usuario 
             WHERE id_usuario IN (${placeholders})`,
            idsOnline
        );
        
        // Agregar información de si están realmente conectados (tienen socket)
        const usuariosConInfo = usuarios.map(u => ({
            ...u,
            socketId: usuariosConectados.get(u.id_usuario),
            conectado: usuariosConectados.has(u.id_usuario)
        })).filter(u => u.conectado); // Solo retornar los que tienen socket activo
        
        res.json(usuariosConInfo);
        
    } catch (error) {
        console.error('Error obteniendo usuarios online:', error);
        res.status(500).json({ error: 'Error al obtener usuarios online' });
    }
});

// ================================================================
// 🔧 API: Estado del sistema (debugging)
// ================================================================
router.get('/api/sistema/estado', async (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'No autorizado' });
    
    try {
        const usuariosEnPortal = global.usuariosEnPortalCompetitivo || new Set();
        const usuariosConectados = global.usuariosConectados || new Map();
        const salasPendientes = global.salasPendientes || new Map();
        const salasEspera = global.salasEspera || new Map();
        
        res.json({
            usuariosEnPortal: usuariosEnPortal.size,
            usuariosConSocket: usuariosConectados.size,
            salasPendientes: salasPendientes.size,
            salasEspera: salasEspera.size,
            usuariosEnPortalIds: Array.from(usuariosEnPortal),
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Error obteniendo estado:', error);
        res.status(500).json({ error: 'Error al obtener estado del sistema' });
    }
});

// ================================================================
// 🎯 API: Buscar usuarios específicos (con filtro)
// ================================================================
router.get('/api/buscar/usuarios', async (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'No autorizado' });
    
    try {
        const { q } = req.query; // Query de búsqueda
        let query = `
            SELECT u.id_usuario, u.username, u.foto_perfil, u.puntos
            from usuario u
            WHERE u.id_usuario != ?
        `;
        let params = [req.session.user.id_usuario];

        if (q && q.trim()) {
            query += ` AND u.username LIKE ?`;
            params.push(`%${q.trim()}%`);
        }

        query += ` ORDER BY u.puntos DESC LIMIT 20`;

        const [usuarios] = await pool.query(query, params);
        
        // Marcar cuáles están online
        const usuariosConectados = global.usuariosConectados || new Map();
        const usuariosConEstado = usuarios.map(u => ({
            ...u,
            online: usuariosConectados.has(u.id_usuario)
        }));
        
        res.json(usuariosConEstado);
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
router.get('/sala/:salaId', async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/');
    }

    try {
        const { salaId } = req.params;
        const userId = req.session.user.id_usuario;
        
        // Validar UUID
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(salaId)) {
            console.log(`[ROUTER SALA]: UUID inválido: ${salaId}`);
            req.session.errorMsg = 'ID de sala inválido.';
            return res.redirect('/competitivo/portal');
        }

        console.log(`[ROUTER SALA]: Acceso a sala ${salaId} por usuario ${userId}`);

        // ✅ Verificar si la sala existe en activeDuels (duelos en curso)
        const activeDuels = global.activeDuels || new Map();
        const dueloActivo = activeDuels.get(salaId);
        
        if (dueloActivo) {
            console.log(`[ROUTER SALA]: ✅ Sala ${salaId} es un duelo activo`);
            
            // Verificar que el usuario sea parte del duelo
            if (!dueloActivo.jugadores[userId]) {
                req.session.errorMsg = 'No tienes acceso a este duelo.';
                return res.redirect('/competitivo/portal');
            }
            
            // Renderizar portal con flag para auto-conectar
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

            const stats = userData[0] || { puntos: 0, victorias: 0, derrotas: 0 };
            
            return res.render('duelodelascenso', {
                layout: 'main',
                user: req.session.user,
                stats: stats,
                salaId: salaId,
                enSala: true,
                autoConectar: true, // ← Flag para conectar automáticamente
                dueloActivo: true
            });
        }

        // ✅ Verificar en salasPendientes (invitaciones BD)
        const salasPendientes = global.salasPendientes || new Map();
        const salasEspera = global.salasEspera || new Map();
        
        let sala = null;
        
        for (const [key, value] of [...salasPendientes.entries(), ...salasEspera.entries()]) {
            if (key.toLowerCase() === salaId.toLowerCase()) {
                sala = value;
                break;
            }
        }
        
        if (sala) {
            console.log(`[ROUTER SALA]: ✅ Sala ${salaId} encontrada (pendiente)`);
            
            // Verificar que el usuario sea parte de la sala
            const retadorId = parseInt(sala.retador || sala.idRetador);
            const retadoId = parseInt(sala.retado || sala.idRetado);
            const userIdInt = parseInt(userId);
            
            if (userIdInt !== retadorId && userIdInt !== retadoId) {
                req.session.errorMsg = 'No tienes acceso a esta sala.';
                return res.redirect('/competitivo/portal');
            }
            
            // Renderizar portal con flag para conectar
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

            const stats = userData[0] || { puntos: 0, victorias: 0, derrotas: 0 };
            
            return res.render('duelodelascenso', {
                layout: 'main',
                user: req.session.user,
                stats: stats,
                salaId: salaId,
                enSala: true,
                autoConectar: true,
                estadoSala: sala.estado
            });
        }

        // ❌ Sala no encontrada
        console.log(`[ROUTER SALA]: Sala ${salaId} no encontrada`);
        req.session.errorMsg = 'La sala no existe o expiró.';
        return res.redirect('/competitivo/portal');

    } catch (error) {
        console.error("[ROUTER SALA ERROR]:", error);
        req.session.errorMsg = 'Error al cargar la sala.';
        res.redirect('/competitivo/portal');
    }
});
// ================================================================
// 🛡️ RUTA AUXILIAR: Verificar estado de sala (API)
// ================================================================
router.get('/api/sala/:salaId/estado', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'No autorizado' });
    }

    try {
        const { salaId } = req.params;
        const userId = req.session.user.id_usuario;

        // Buscar en activeDuels
        const activeDuels = global.activeDuels || new Map();
        const duelo = activeDuels.get(salaId);

        if (duelo) {
            // Verificar acceso
            if (!duelo.jugadores[userId]) {
                return res.status(403).json({ error: 'Sin acceso' });
            }

            return res.json({
                existe: true,
                tipo: 'duelo_activo',
                estado: duelo.estado,
                jugadores: Object.keys(duelo.jugadores).length,
                modo: duelo.modo
            });
        }

        // Buscar en salas pendientes
        const salasPendientes = global.salasPendientes || new Map();
        const salasEspera = global.salasEspera || new Map();
        
        let sala = salasPendientes.get(salaId) || salasEspera.get(salaId);

        if (sala) {
            // Verificar acceso
            const retadorId = parseInt(sala.retador || sala.idRetador);
            const retadoId = parseInt(sala.retado || sala.idRetado);
            
            if (parseInt(userId) !== retadorId && parseInt(userId) !== retadoId) {
                return res.status(403).json({ error: 'Sin acceso' });
            }

            return res.json({
                existe: true,
                tipo: 'sala_pendiente',
                estado: sala.estado,
                jugadoresConectados: sala.jugadoresConectados?.size || 0
            });
        }

        // No encontrada
        return res.json({
            existe: false
        });

    } catch (error) {
        console.error('[API SALA ERROR]:', error);
        res.status(500).json({ error: 'Error del servidor' });
    }
});
router.post('/duelo/abandonar/:salaId', async (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'No autorizado' });

    const { salaId } = req.params;
    const { razon } = req.body;
    const idUsuario = req.session.user.id_usuario;

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // Obtener información del duelo
        const [duelo] = await conn.query(
            'SELECT * FROM duelos WHERE id_duelo = ? AND (id_retador = ? OR id_defensor = ?)',
            [salaId, idUsuario, idUsuario]
        );

        if (duelo.length === 0) {
            await conn.rollback();
            await conn.release();
            return res.status(404).json({ error: 'Duelo no encontrado' });
        }

        const dueloData = duelo[0];
        const esRetador = dueloData.id_retador === idUsuario;
        
        // El que abandona pierde, el otro gana
        const idGanador = esRetador ? dueloData.id_defensor : dueloData.id_retador;
        const idPerdedor = idUsuario;

        // ⚠️ OPCIÓN 1: SIN PENALIZACIÓN (ACTUAL)
        // Solo se actualiza el estado, no se tocan los puntos
        
        /* ⚠️ OPCIÓN 2: CON PENALIZACIÓN (COMENTADO - DESCOMENTAR SI SE DESEA USAR)
        
        // Obtener rankings
        const puestoRetador = await obtenerRankingUsuario(dueloData.id_retador);
        const puestoDefensor = await obtenerRankingUsuario(dueloData.id_defensor);

        // Calcular puntos (el que abandona pierde más puntos)
        const { puntosRetador, puntosDefensor } = calcularPuntosSegunRanking(
            puestoRetador,
            puestoDefensor,
            !esRetador // El ganador es el que NO abandonó
        );

        // Penalización extra por abandono (ajustar valor según necesidad)
        const PENALIZACION_ABANDONO = -10; // Cambiar este valor para ajustar penalización
        const puntosAbandonador = esRetador ? puntosRetador + PENALIZACION_ABANDONO : puntosDefensor + PENALIZACION_ABANDONO;
        const puntosGanador = esRetador ? puntosDefensor : puntosRetador;

        // Actualizar puntos (asegurarse que no baje de 0)
        await conn.query(
            'UPDATE usuario SET puntos = GREATEST(0, puntos + ?) WHERE id_usuario = ?',
            [puntosAbandonador, idPerdedor]
        );

        await conn.query(
            'UPDATE usuario SET puntos = puntos + ? WHERE id_usuario = ?',
            [puntosGanador, idGanador]
        );

        // Registrar en historial con puntos
        await conn.query(`
            INSERT INTO historial_duelos 
            (id_duelo, id_retador, id_defensor, id_ganador, puntos_retador, puntos_defensor, fecha_duelo)
            VALUES (?, ?, ?, ?, ?, ?, NOW())
        `, [salaId, dueloData.id_retador, dueloData.id_defensor, idGanador, 
            esRetador ? puntosAbandonador : puntosGanador,
            esRetador ? puntosGanador : puntosAbandonador]);
        
        */

        // Registrar en historial SIN modificar puntos (0 puntos para ambos)
        await conn.query(`
            INSERT INTO historial_duelos 
            (id_duelo, id_retador, id_defensor, id_ganador, puntos_retador, puntos_defensor, fecha_duelo)
            VALUES (?, ?, ?, ?, 0, 0, NOW())
        `, [salaId, dueloData.id_retador, dueloData.id_defensor, idGanador]);

        // Actualizar estado del duelo a 'abandonado'
        await conn.query(
            'UPDATE duelos SET estado = ? WHERE id_duelo = ?',
            ['abandonado', salaId]
        );

        // Crear notificación para el ganador
        const [ganador] = await conn.query('SELECT username from usuario WHERE id_usuario = ?', [idGanador]);
        const nombreGanador = ganador[0]?.username || 'Oponente';

        await conn.query(`
            INSERT INTO notificaciones 
            (id_usuario_destinatario, id_usuario_remitente, tipo, mensaje, extra_data)
            VALUES (?, ?, 'duelo_abandonado', ?, ?)
        `, [
            idGanador,
            idUsuario,
            `¡Tu oponente abandonó el duelo!`,
            JSON.stringify({ 
                id_duelo: salaId, 
                razon: razon || 'Sin especificar',
                abandonador: req.session.user.username 
            })
        ]);

        await conn.commit();
        await conn.release();

        // Emitir evento de socket si está disponible
        if (req.io) {
            req.io.to(idGanador.toString()).emit('duelo_abandonado', {
                ganaste: true,
                mensaje: `${req.session.user.username} ha abandonado el duelo`,
                id_duelo: salaId
            });
        }

        res.json({
            success: true,
            message: 'Has abandonado el duelo',
            redirigir: '/portal'
        });

    } catch (error) {
        await conn.rollback();
        await conn.release();
        console.error('Error al abandonar duelo:', error);
        res.status(500).json({ error: 'Error al abandonar el duelo' });
    }
});
router.get('/api/usuarios/online', async (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'No autorizado' });
    
    try {
        // Obtener usuarios conectados desde el sistema global de sockets
        const usuariosEnPortal = global.usuariosEnPortalCompetitivo || new Set();
        const usuariosConectados = global.usuariosConectados || new Map();
        
        // Convertir a array de IDs
        const idsOnline = Array.from(usuariosEnPortal);
        
        if (idsOnline.length === 0) {
            return res.json([]);
        }
        
        // Obtener información básica de los usuarios online
        const placeholders = idsOnline.map(() => '?').join(',');
        const [usuarios] = await pool.query(
            `SELECT id_usuario, username, foto_perfil, puntos 
             from usuario 
             WHERE id_usuario IN (${placeholders})`,
            idsOnline
        );
        
        // Agregar información de si están realmente conectados (tienen socket)
        const usuariosConInfo = usuarios.map(u => ({
            ...u,
            socketId: usuariosConectados.get(u.id_usuario),
            conectado: usuariosConectados.has(u.id_usuario)
        })).filter(u => u.conectado); // Solo retornar los que tienen socket activo
        
        res.json(usuariosConInfo);
        
    } catch (error) {
        console.error('Error obteniendo usuarios online:', error);
        res.status(500).json({ error: 'Error al obtener usuarios online' });
    }
});

// ✅ ENDPOINT: Estado del sistema (para debugging)
router.get('/api/sistema/estado', async (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'No autorizado' });
    
    try {
        const usuariosEnPortal = global.usuariosEnPortalCompetitivo || new Set();
        const usuariosConectados = global.usuariosConectados || new Map();
        const salasPendientes = global.salasPendientes || new Map();
        const salasEspera = global.salasEspera || new Map();
        
        res.json({
            usuariosEnPortal: usuariosEnPortal.size,
            usuariosConSocket: usuariosConectados.size,
            salasPendientes: salasPendientes.size,
            salasEspera: salasEspera.size,
            usuariosEnPortalIds: Array.from(usuariosEnPortal),
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Error obteniendo estado:', error);
        res.status(500).json({ error: 'Error al obtener estado del sistema' });
    }
});
module.exports = router;