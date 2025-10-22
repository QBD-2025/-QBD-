// src/router/competitivoR.js - VERSIÓN CORREGIDA
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

// =============================================
// RUTAS PRINCIPALES
// =============================================

router.get('/portal', async (req, res) => {
    try {
        const userId = req.session.user.id_usuario;
        
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
             FROM usuario u 
             WHERE u.id_usuario = ?`,
            [userId]
        );
        
        const userWithCarrera = {
            id_usuario: req.session.user.id_usuario,
            username: req.session.user.username,
            email: req.session.user.email,
            id_tp_usuario: req.session.user.id_tp_usuario,
            foto_perfil: req.session.user.foto_perfil,
            id_carrera: carrera ? carrera.id_carrera : null,
            carrera_descripcion: carrera ? carrera.descripcion : null
        };
        
        res.render('duelodelascenso', {
            layout: 'main',
            user: userWithCarrera,
            stats: userData[0] || { puntos: 0, duelos_jugados: 0, victorias: 0 }
        });
    } catch (error) {
        console.error("❌ ERROR al cargar la sala de duelos:", error);
        res.redirect('/menu_principal');
    }
});

router.get('/rankingCarrera', async (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    
    try {
        const userId = req.session.user.id_usuario;
        
        const [carreras] = await pool.query(`
            SELECT c.id_carrera, c.descripcion 
            FROM carrera c
            INNER JOIN usuario_carrera uc ON c.id_carrera = uc.id_carrera
            WHERE uc.id_usuario = ?
            LIMIT 1
        `, [userId]);
        
        if (carreras.length === 0) {
            return res.render('rankingCarrera', {
                layout: 'main',
                user: {
                    ...req.session.user,
                    id_carrera: null
                },
                error: 'No tienes una carrera asignada'
            });
        }
        
        const carrera = carreras[0];
        
        const userWithCarrera = {
            id_usuario: req.session.user.id_usuario,
            username: req.session.user.username,
            email: req.session.user.email,
            id_tp_usuario: req.session.user.id_tp_usuario,
            foto_perfil: req.session.user.foto_perfil,
            id_carrera: carrera.id_carrera,
            carrera_descripcion: carrera.descripcion
        };
        
        res.render('rankingCarrera', {
            layout: 'main',
            user: userWithCarrera
        });
    } catch (error) {
        console.error("❌ ERROR al cargar ranking de carrera:", error);
        res.status(500).send('Error al cargar el ranking');
    }
});

// --- API: Rankings ---
router.get('/api/ranking/global', async (req, res) => {
    try {
        const [jugadores] = await pool.query(`
            SELECT u.id_usuario, u.username, u.foto_perfil, u.puntos, uc.id_carrera
            FROM usuario u 
            LEFT JOIN usuario_carrera uc ON u.id_usuario = uc.id_usuario 
            ORDER BY u.puntos DESC 
            LIMIT 100
        `);
        res.json(jugadores);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener el ranking global' });
    }
});

router.get('/api/ranking/carrera/:id_carrera', async (req, res) => {
    try {
        const idCarrera = req.params.id_carrera;
        
        const [jugadores] = await pool.query(`
            SELECT u.id_usuario, u.username, u.foto_perfil, u.puntos
            FROM usuario u
            INNER JOIN usuario_carrera uc ON u.id_usuario = uc.id_usuario
            WHERE uc.id_carrera = ?
            ORDER BY u.puntos DESC
            LIMIT 100
        `, [idCarrera]);
        
        res.json(jugadores);
    } catch (error) {
        console.error('❌ ERROR en API ranking carrera:', error);
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
            WHERE uc.id_usuario = ?
        `, [req.session.user.id_usuario]);
        
        res.json(carreras);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener las carreras del usuario' });
    }
});

// =============================================
// 🔥 DESAFIAR - VERSIÓN CORREGIDA
// =============================================
router.post('/desafiar/duelo/:idOponente', async (req, res) => {
    if (!req.session.user) return res.status(401).json({ message: 'No has iniciado sesión' });
    
    const { idOponente } = req.params;
    const { id_usuario: idRemitente, username: usernameRemitente } = req.session.user;
    
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        
        // ✅ 1. VALIDAR CARRERA
        const [carreraRetador] = await conn.query(
            'SELECT id_carrera FROM usuario_carrera WHERE id_usuario = ? LIMIT 1', 
            [idRemitente]
        );
        
        if (carreraRetador.length === 0) {
            await conn.rollback();
            await conn.release();
            return res.status(400).json({ message: 'No tienes carrera asignada' });
        }
        
        const idCarrera = carreraRetador[0].id_carrera;
        
        // ✅ 2. VERIFICAR SI YA EXISTE UN DUELO ACTIVO ENTRE ESTOS JUGADORES
        const [duelosActivos] = await conn.query(`
            SELECT id_duelo, estado 
            FROM duelos 
            WHERE ((id_retador = ? AND id_defensor = ?) OR (id_retador = ? AND id_defensor = ?))
            AND estado NOT IN ('finalizado', 'abandonado')
            AND fecha_limite > NOW()
        `, [idRemitente, idOponente, idOponente, idRemitente]);
        
        if (duelosActivos.length > 0) {
            await conn.rollback();
            await conn.release();
            return res.status(400).json({ 
                message: 'Ya existe un duelo activo con este jugador. Complétalo primero.' 
            });
        }
        
        // ✅ 3. GENERAR ID ÚNICO CON TIMESTAMP
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 9);
        const id_duelo = `duelo_${timestamp}_${random}`;
        
        console.log(`[CREAR DUELO] ID generado: ${id_duelo}`);
        
        // ✅ 4. CREAR DUELO
        const fechaLimite = new Date();
        fechaLimite.setHours(fechaLimite.getHours() + 48);
        
        await conn.query(`
            INSERT INTO duelos 
            (id_duelo, id_retador, id_defensor, fecha_limite, estado, respondido_retador, respondido_oponente)
            VALUES (?, ?, ?, ?, 'pendiente', 0, 0)
        `, [id_duelo, idRemitente, idOponente, fechaLimite]);
        
        console.log(`[CREAR DUELO] ✅ Duelo creado en BD`);
        
        // ✅ 5. LIMPIAR PREGUNTAS ANTERIORES (por si acaso)
        await conn.query(`DELETE FROM duelos_preguntas WHERE id_duelo = ?`, [id_duelo]);
        
        // ✅ 6. GENERAR PREGUNTAS ALEATORIAS
        const [preguntas] = await conn.query(`
            SELECT DISTINCT p.id_pregunta, p.pregunta 
            FROM pregunta p
            INNER JOIN carrera_materia cm ON p.id_materia = cm.id_materia
            WHERE cm.id_carrera = ?
            AND p.id_pregunta IN (
                SELECT id_pregunta FROM respuesta GROUP BY id_pregunta HAVING COUNT(*) >= 2
            )
            ORDER BY RAND() 
            LIMIT ?
        `, [idCarrera, NUM_PREGUNTAS_POR_DUELO]);
        
        if (!preguntas || preguntas.length === 0) {
            await conn.rollback();
            await conn.release();
            return res.status(500).json({ 
                message: 'No hay suficientes preguntas disponibles para esta carrera' 
            });
        }
        
        if (preguntas.length < NUM_PREGUNTAS_POR_DUELO) {
            console.warn(`⚠️ Solo se encontraron ${preguntas.length} preguntas para carrera ${idCarrera}`);
        }
        
        // ✅ 7. INSERTAR PREGUNTAS
        for (let i = 0; i < preguntas.length; i++) {
            await conn.query(`
                INSERT INTO duelos_preguntas (id_duelo, id_pregunta, orden) 
                VALUES (?, ?, ?)
            `, [id_duelo, preguntas[i].id_pregunta, i + 1]);
        }
        
        console.log(`[CREAR DUELO] ✅ ${preguntas.length} preguntas insertadas`);
        
        // ✅ 8. CREAR NOTIFICACIÓN
        const extraData = {
            remitente: {
                id_usuario: idRemitente,
                username: usernameRemitente,
                email: req.session.user.email,
                id_tp_usuario: req.session.user.id_tp_usuario,
                foto_perfil: req.session.user.foto_perfil
            },
            id_duelo,
            tiempoLimite: 2 * 24 * 60 * 60
        };
        
        const mensajeNotificacion = `${usernameRemitente} te desafía a un Duelo de Ascenso!`;
        
        await conn.query(`
            INSERT INTO notificaciones 
            (id_usuario_destinatario, id_usuario_remitente, tipo, mensaje, extra_data) 
            VALUES (?, ?, 'desafio_duelo', ?, ?)
        `, [idOponente, idRemitente, mensajeNotificacion, JSON.stringify(extraData)]);
        
        console.log(`[CREAR DUELO] ✅ Notificación creada`);
        
        await conn.commit();
        await conn.release();
        
        // ✅ 9. EMITIR SOCKET
        if (req.io) {
            req.io.to(idOponente.toString()).emit('notificacion_recibida');
        }
        
        console.log(`[CREAR DUELO] ✅ Proceso completado para duelo ${id_duelo}`);
        
        res.json({ 
            success: true, 
            message: '¡Desafío enviado!', 
            id_duelo, 
            extraData 
        });
        
    } catch (err) {
        try { await conn.rollback(); } catch(e) { /* ignore */ }
        await conn.release();
        console.error('❌ Error enviando desafío:', err);
        res.status(500).json({ 
            message: 'Error del servidor al enviar el desafío: ' + err.message 
        });
    }
});

router.post('/duelo/volver/:salaId', async (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'No autorizado' });

    const { salaId } = req.params;
    const idUsuario = req.session.user.id_usuario;

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // 1️⃣ Obtener el duelo
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
        let actualizo = false;

        // 2️⃣ Marcar que el usuario hizo "volver"
        if (idUsuario === duelo.id_retador && !duelo.retador_volvio) {
            await conn.query('UPDATE duelos SET retador_volvio = 1 WHERE id_duelo = ?', [salaId]);
            actualizo = true;
        } else if (idUsuario === duelo.id_defensor && !duelo.defensor_volvio) {
            await conn.query('UPDATE duelos SET defensor_volvio = 1 WHERE id_duelo = ?', [salaId]);
            actualizo = true;
        }

        // 3️⃣ Verificar si ambos ya volvieron
        const [dueloActualizado] = await conn.query('SELECT * FROM duelos WHERE id_duelo = ?', [salaId]);
        if (dueloActualizado[0].retador_volvio && dueloActualizado[0].defensor_volvio) {
            // Eliminar preguntas, respuestas y el duelo
            await conn.query('DELETE FROM duelos_preguntas WHERE id_duelo = ?', [salaId]);
            await conn.query('DELETE FROM duelos_respuestas WHERE id_duelo = ?', [salaId]);
            await conn.query('DELETE FROM duelos WHERE id_duelo = ?', [salaId]);
            console.log(`[VOLVER] Duelo ${salaId} eliminado porque ambos volvieron`);
        }

        await conn.commit();
        await conn.release();

        res.json({ success: true, message: actualizo ? 'Se registró tu volver' : 'Ya habías hecho volver' });

    } catch (error) {
        await conn.rollback();
        await conn.release();
        console.error('❌ Error procesando volver del duelo:', error);
        res.status(500).json({ error: 'Error al procesar volver' });
    }
});

// =============================================
// 🎯 EXAMEN INDIVIDUAL - VERSIÓN CORREGIDA
// =============================================
router.get('/duelo/examen/:salaId', async (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    
    const { salaId } = req.params;
    const userId = req.session.user.id_usuario;
    
    console.log(`[EXAMEN] Usuario ${userId} accediendo a duelo ${salaId}`);
    
    try {
        // ✅ 1. OBTENER DUELO
        const [duelos] = await pool.query(`
            SELECT d.*, 
                   u1.username as retador_username, 
                   u2.username as defensor_username
            FROM duelos d
            LEFT JOIN usuario u1 ON d.id_retador = u1.id_usuario
            LEFT JOIN usuario u2 ON d.id_defensor = u2.id_usuario
            WHERE d.id_duelo = ? AND (d.id_retador = ? OR d.id_defensor = ?)
        `, [salaId, userId, userId]);
        
        if (duelos.length === 0) {
            console.log(`[EXAMEN] ❌ Duelo no encontrado: ${salaId}`);
            return res.redirect('/portal?error=duelo_no_encontrado');
        }
        
        const duelo = duelos[0];
        const esRetador = duelo.id_retador === userId;
        
        console.log(`[EXAMEN] Usuario es ${esRetador ? 'RETADOR' : 'DEFENSOR'}`);
        
        // ✅ 2. VERIFICAR SI YA COMPLETÓ EL EXAMEN
        if ((esRetador && duelo.respondido_retador) || (!esRetador && duelo.respondido_oponente)) {
            console.log(`[EXAMEN] ⚠️ Usuario ya completó este examen`);
            return res.redirect(`/duelo/resultados/${salaId}?mensaje=Ya completaste este examen`);
        }
        
        // ✅ 3. VERIFICAR TIEMPO LÍMITE
        if (new Date() > new Date(duelo.fecha_limite)) {
            console.log(`[EXAMEN] ⏰ Tiempo expirado`);
            return res.redirect(`/duelo/resultados/${salaId}?mensaje=El tiempo para este duelo ha expirado`);
        }
        
        // ✅ 4. CARGAR PREGUNTAS DE ESTE DUELO ESPECÍFICO
        const [preguntas] = await pool.query(`
            SELECT p.id_pregunta, p.pregunta, dp.orden
            FROM duelos_preguntas dp
            INNER JOIN pregunta p ON dp.id_pregunta = p.id_pregunta
            WHERE dp.id_duelo = ?
            ORDER BY dp.orden
        `, [salaId]);
        
        if (!preguntas.length) {
            console.log(`[EXAMEN] ❌ No hay preguntas para duelo ${salaId}`);
            return res.redirect('/portal?error=no_hay_preguntas');
        }
        
        console.log(`[EXAMEN] ✅ ${preguntas.length} preguntas cargadas`);
        
        // ✅ 5. CARGAR RESPUESTAS PARA CADA PREGUNTA
        for (let pregunta of preguntas) {
            const [respuestas] = await pool.query(`
                SELECT id_respuesta, respuesta, correcta 
                FROM respuesta 
                WHERE id_pregunta = ? 
                ORDER BY id_respuesta
            `, [pregunta.id_pregunta]);
            
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
        console.error('❌ Error al cargar examen de duelo:', error);
        res.redirect('/portal?error=error_servidor');
    }
});

// =============================================
// 📝 GUARDAR RESPUESTAS - VERSIÓN CORREGIDA
// =============================================
router.post('/duelo/responder/:salaId', async (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'No autorizado' });
    
    const { salaId } = req.params;
    const { respuestas } = req.body;
    const id_usuario = req.session.user.id_usuario;
    
    console.log(`[RESPONDER] Usuario ${id_usuario} enviando respuestas para duelo ${salaId}`);
    
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        
        const respuestasObj = typeof respuestas === 'string' ? JSON.parse(respuestas) : respuestas;
        
        // ✅ 1. VERIFICAR DUELO
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
        
        // ✅ 2. VERIFICAR SI YA RESPONDIÓ
        if ((esRetador && duelo.respondido_retador) || (!esRetador && duelo.respondido_oponente)) {
            await conn.rollback();
            await conn.release();
            return res.status(400).json({ error: 'Ya completaste este examen' });
        }
        
        // ✅ 3. LIMPIAR RESPUESTAS ANTERIORES (por seguridad)
        await conn.query(`
            DELETE FROM duelos_respuestas 
            WHERE id_duelo = ? AND id_usuario = ?
        `, [salaId, id_usuario]);
        
        console.log(`[RESPONDER] Limpiadas respuestas anteriores del usuario`);
        
        // ✅ 4. GUARDAR NUEVAS RESPUESTAS
        let respuestasGuardadas = 0;
        for (const [id_pregunta, id_respuesta] of Object.entries(respuestasObj)) {
            await conn.query(`
                INSERT INTO duelos_respuestas (id_duelo, id_usuario, id_pregunta, id_respuesta) 
                VALUES (?, ?, ?, ?)
            `, [salaId, id_usuario, id_pregunta, id_respuesta]);
            respuestasGuardadas++;
        }
        
        console.log(`[RESPONDER] ✅ ${respuestasGuardadas} respuestas guardadas`);
        
        // ✅ 5. MARCAR COMO RESPONDIDO
        if (esRetador) {
            await conn.query(`UPDATE duelos SET respondido_retador = 1 WHERE id_duelo = ?`, [salaId]);
        } else {
            await conn.query(`UPDATE duelos SET respondido_oponente = 1 WHERE id_duelo = ?`, [salaId]);
        }
        
        console.log(`[RESPONDER] ✅ Duelo marcado como respondido`);
        
        await conn.commit();
        await conn.release();
        
        res.redirect(`/duelo/resultados/${salaId}`);
        
    } catch (error) {
        await conn.rollback();
        await conn.release();
        console.error('❌ Error guardando respuestas del duelo:', error);
        res.status(500).json({ error: 'Error del servidor: ' + error.message });
    }
});

// =============================================
// 📊 RESULTADOS - VERSIÓN CORREGIDA
// =============================================
router.get('/duelo/resultados/:salaId', async (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    
    const { salaId } = req.params;
    const idUsuario = req.session.user.id_usuario;
    
    console.log(`[RESULTADOS] Usuario ${idUsuario} consultando resultados del duelo ${salaId}`);
    
    try {
        // ✅ 1. OBTENER INFORMACIÓN DEL DUELO
        const duelo = await obtenerDuelo(salaId);
        if (!duelo) {
            console.log(`[RESULTADOS] ❌ Duelo no encontrado: ${salaId}`);
            return res.redirect('/portal?error=duelo_no_encontrado');
        }
        
        console.log(`[RESULTADOS] Duelo encontrado. Estado: ${duelo.estado}`);
        
        // ✅ 2. OBTENER MIS RESPUESTAS
        const misRespuestasDetalladas = await obtenerRespuestas(idUsuario, salaId);
        
        if (misRespuestasDetalladas.length === 0) {
            console.log(`[RESULTADOS] ⚠️ Usuario no ha respondido aún`);
            return res.redirect(`/duelo/examen/${salaId}?mensaje=Debes completar el examen primero`);
        }
        
        console.log(`[RESULTADOS] ✅ ${misRespuestasDetalladas.length} respuestas del usuario cargadas`);
        
        // ✅ 3. VERIFICAR SI AMBOS TERMINARON
        const ambosTerminaron = await verificarAmbosTerminaron(salaId);
        console.log(`[RESULTADOS] Ambos terminaron: ${ambosTerminaron}`);
        
        // ✅ 4. OBTENER INFORMACIÓN DEL OPONENTE
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
                
                console.log(`[RESULTADOS] Oponente: ${nombreOponente}, Puntaje: ${oponentePuntaje}`);
                
                // ✅ 5. FINALIZAR DUELO (solo si no está finalizado)
                if (duelo.estado !== 'finalizado') {
                    console.log(`[RESULTADOS] 🏁 Finalizando duelo...`);
                    
                    const miPuntaje = calcularPuntaje(misRespuestasDetalladas);
                    let idGanador, idPerdedor;
                    
                    if (miPuntaje > oponentePuntaje) {
                        idGanador = idUsuario;
                        idPerdedor = oponente.id;
                        console.log(`[RESULTADOS] 🏆 Ganador: Usuario actual (${miPuntaje} vs ${oponentePuntaje})`);
                    } else if (oponentePuntaje > miPuntaje) {
                        idGanador = oponente.id;
                        idPerdedor = idUsuario;
                        console.log(`[RESULTADOS] 😔 Ganador: Oponente (${oponentePuntaje} vs ${miPuntaje})`);
                    } else {
                        idGanador = null;
                        idPerdedor = null;
                        console.log(`[RESULTADOS] 🤝 Empate (${miPuntaje} vs ${oponentePuntaje})`);
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
                        
                        console.log(`[RESULTADOS] ✅ Duelo finalizado. Puntos: ${puntosGanados}`);
                    }
                } else {
                    // Si ya está finalizado, obtener los puntos del historial
                    console.log(`[RESULTADOS] Duelo ya finalizado, obteniendo del historial`);
                    
                    const [historial] = await pool.query(`
                        SELECT puntos_retador, puntos_defensor 
                        FROM historial_duelos 
                        WHERE id_duelo = ?
                    `, [salaId]);
                    
                    if (historial.length > 0) {
                        const esRetador = duelo.id_retador === idUsuario;
                        puntosGanados = esRetador ? historial[0].puntos_retador : historial[0].puntos_defensor;
                        console.log(`[RESULTADOS] Puntos desde historial: ${puntosGanados}`);
                    }
                }
            }
        }
        
        // ✅ 6. COMBINAR RESPUESTAS PARA MOSTRAR
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
        
        // ✅ 7. ELIMINAR DUPLICADOS (por ID de pregunta)
        const respuestasUnicas = Array.from(
            new Map(respuestasCombinadas.map(r => [r.id_pregunta, r])).values()
        ).map((r, index) => ({ ...r, orden: index + 1 }));
        
        console.log(`[RESULTADOS] Total preguntas únicas: ${respuestasUnicas.length}`);
        
        const miPuntaje = calcularPuntaje(misRespuestasDetalladas);
        const correctas = misRespuestasDetalladas.filter(r => r.es_correcta).length;
        const totalPreguntas = respuestasUnicas.length;
        
        console.log(`[RESULTADOS] Mi puntaje: ${miPuntaje}/${totalPreguntas}`);
        
        // ✅ 9. LIMPIAR NOTIFICACIONES DE ESTE DUELO
        try {
            await pool.query(`
                DELETE FROM notificaciones 
                WHERE (id_usuario_destinatario = ? OR id_usuario_remitente = ?)
                AND tipo = 'desafio_duelo'
                AND JSON_EXTRACT(extra_data, '$.id_duelo') = ?
            `, [idUsuario, idUsuario, salaId]);
            console.log(`[RESULTADOS] ✅ Notificaciones del duelo limpiadas`);
        } catch (cleanupError) {
            console.warn('⚠️ No se pudieron limpiar las notificaciones:', cleanupError.message);
        }
        
        // ✅ 10. RENDERIZAR VISTA
        res.render('resultados-duelo', {
            layout: 'main',
            user: req.session.user,
            duelo: duelo,
            miPuntaje,
            oponentePuntaje,
            nombreOponente,
            respuestas: respuestasUnicas,
            ambosTerminaron,
            esRetador: idUsuario === duelo.retador_id,
            correctas,
            totalPreguntas,
            puntosGanados,
            infoRanking
        });
        
    } catch (err) {
        console.error('❌ Error mostrando resultados del duelo:', err);
        console.error('Stack trace:', err.stack);
        res.status(500).send('Ocurrió un error al mostrar los resultados del duelo.');
    }
});

// =============================================
// 📜 HISTORIAL DE DUELOS
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

// =============================================
// ⏰ VERIFICAR ESTADO DEL DUELO
// =============================================
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

// =============================================
// 🚪 ABANDONAR DUELO
// =============================================
router.post('/duelo/abandonar/:salaId', async (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'No autorizado' });
    
    const { salaId } = req.params;
    const { razon } = req.body;
    const idUsuario = req.session.user.id_usuario;
    
    console.log(`[ABANDONAR] Usuario ${idUsuario} abandonando duelo ${salaId}`);
    
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
        
        // Registrar en historial SIN modificar puntos
        await conn.query(`
            INSERT INTO historial_duelos 
            (id_duelo, id_retador, id_defensor, id_ganador, puntos_retador, puntos_defensor, fecha_duelo)
            VALUES (?, ?, ?, ?, 0, 0, NOW())
        `, [salaId, dueloData.id_retador, dueloData.id_defensor, idGanador]);
        
        // Actualizar estado del duelo
        await conn.query(
            'UPDATE duelos SET estado = ? WHERE id_duelo = ?',
            ['abandonado', salaId]
        );
        
        // Crear notificación para el ganador
        const [ganador] = await conn.query('SELECT username FROM usuario WHERE id_usuario = ?', [idGanador]);
        
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
        
        console.log(`[ABANDONAR] ✅ Duelo ${salaId} marcado como abandonado`);
        
        // Emitir evento de socket
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
        console.error('❌ Error al abandonar duelo:', error);
        res.status(500).json({ error: 'Error al abandonar el duelo' });
    }
});

router.post('/admin/limpiar-duelos-antiguos', async (req, res) => {
    if (!req.session.user || req.session.user.id_tp_usuario !== 1) {
        return res.status(403).json({ error: 'No autorizado' });
    }
    
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        
        // Limpiar duelos expirados (más de 7 días)
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
        console.error('Error limpiando duelos:', error);
        res.status(500).json({ error: 'Error al limpiar duelos' });
    }
});

module.exports = router;