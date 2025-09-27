// En: src/router/competitivoR.js
const express = require('express');
const router = express.Router();
const pool = require('../db/conexion');

// --- RUTA PARA LA "SALA DE DUELOS" 1V1 ---
router.get('/portal', async (req, res) => {
    try {
        // Cambiar historial_duelos por duelo_respuestas si no existe la tabla historial_duelos
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

// --- RUTA PARA LA VISTA DEL ENFRENTAMIENTO EN SÍ ---
router.get('/duelo/enfrentamiento/:salaId', async (req, res) => {
    console.log('🎯 Acceso a duelo/enfrentamiento con salaId:', req.params.salaId);
    
    if (!req.session.user) {
        console.log('❌ Usuario no autenticado, redirigiendo a login');
        return res.redirect('/login');
    }

    const { salaId } = req.params;
    const userId = req.session.user.id_usuario;

    try {
        // Verificar que el duelo existe y el usuario es participante
        const [duelos] = await pool.query(
            `SELECT * FROM duelos WHERE id_duelo = ? AND (id_retador = ? OR id_defensor = ?)`,
            [salaId, userId, userId]
        );

        if (duelos.length === 0) {
            console.log('❌ Duelo no encontrado o usuario no autorizado:', salaId, userId);
            return res.redirect('/portal?error=duelo_no_encontrado');
        }

        const duelo = duelos[0];
        console.log('✅ Duelo encontrado:', duelo);

        // Renderizar la página del duelo
        res.render('examen-competitivo', { 
            layout: 'main',
            user: req.session.user,
            salaId: salaId,
            duelo: duelo,
            esRetador: (duelo.id_retador === userId)
        });

    } catch (error) {
        console.error('❌ Error al cargar duelo:', error);
        res.redirect('/portal?error=error_servidor');
    }
});

// --- RUTAS API (RANKINGS, DESAFÍOS, ETC.) ---

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

router.post('/desafiar/duelo/:idOponente', async (req, res) => {
    if (!req.session.user) 
        return res.status(401).json({ message: 'No has iniciado sesión' });

    const { idOponente } = req.params;
    const { id_usuario: idRemitente, username: usernameRemitente } = req.session.user;

    // Construir mensaje y extraData correctamente
    const mensajeNotificacion = `${usernameRemitente} te desafía a un Duelo de Ascenso!`;
    const extraData = {
        remitente: {
            id_usuario: idRemitente,
            username: usernameRemitente,
            email: req.session.user.email,
            id_tp_usuario: req.session.user.id_tp_usuario,
            foto_perfil: req.session.user.foto_perfil
        },
        tiempoLimite: 2 * 24 * 60 * 60 // 48 horas en segundos
    };

    try {
        await pool.query(
            `INSERT INTO notificaciones 
            (id_usuario_destinatario, id_usuario_remitente, tipo, mensaje, extra_data) 
            VALUES (?, ?, 'desafio_duelo', ?, ?)`,
            [idOponente, idRemitente, mensajeNotificacion, JSON.stringify(extraData)]
        );

        // Emitir notificación por socket si tienes io
        if (req.io) req.io.to(idOponente.toString()).emit('notificacion_recibida');

        res.json({ 
            success: true, 
            message: '¡Desafío enviado!', 
            extraData 
        });

    } catch (err) {
        console.error('Error enviando desafío:', err);
        res.status(500).json({ message: 'Error del servidor al enviar el desafío' });
    }
});

// --- RUTA PARA EL EXAMEN INDIVIDUAL DE DUELO (ASÍNCRONO) - CORREGIDA ---
router.get('/duelo/examen/:salaId', async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }

    const { salaId } = req.params;
    const userId = req.session.user.id_usuario;

    try {
        // Verificar que el duelo existe y el usuario es participante
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

        if (duelos.length === 0) {
            return res.redirect('/portal?error=duelo_no_encontrado');
        }

        const duelo = duelos[0];
        
        // Verificar si ya hizo el examen - TABLA CORREGIDA (sin 's')
        const [respuestasExistentes] = await pool.query(
            `SELECT COUNT(*) as count FROM duelo_respuestas WHERE id_duelo = ? AND id_usuario = ?`,
            [salaId, userId]
        );

        if (respuestasExistentes[0].count > 0) {
            return res.redirect(`/duelo/resultados/${salaId}?mensaje=Ya completaste este examen`);
        }

        // Verificar si el tiempo no ha expirado
        if (new Date() > new Date(duelo.fecha_limite)) {
            return res.redirect(`/duelo/resultados/${salaId}?mensaje=El tiempo para este duelo ha expirado`);
        }

        if (duelo.estado === 'abandonado') {
            const esRetador = (duelo.id_retador === userId);
            const miEstado = esRetador ? duelo.estado_retador : duelo.estado_defensor;
            
            if (miEstado === 'abandonado') {
                // Yo abandoné
                return res.redirect('/portal?mensaje=Abandonaste este duelo');
            } else {
                // El oponente abandonó
                const [abandonadorInfo] = await pool.query(
                    `SELECT username FROM usuario WHERE id_usuario = ?`,
                    [duelo.id_usuario_abandono]
                );
                const nombreAbandonador = abandonadorInfo[0]?.username || 'Tu oponente';
                
                return res.render('duelo-abandonado', {
                    layout: 'main',
                    user: req.session.user,
                    mensaje: `${nombreAbandonador} ha abandonado el duelo. ¡Has ganado!`,
                    duelo: duelo
                });
            }
        }


        const esRetador = (duelo.id_retador === userId);
        
        // Obtener preguntas ALEATORIAS (no por materia específica)
        const [preguntas] = await pool.query(
            `SELECT p.id_pregunta, p.pregunta
             FROM pregunta p 
             ORDER BY RAND() 
             LIMIT 10`
        );

        if (preguntas.length === 0) {
            return res.redirect('/portal?error=no_hay_preguntas');
        }

        // Obtener respuestas para cada pregunta
        for (let pregunta of preguntas) {
            const [respuestas] = await pool.query(
                `SELECT id_respuesta, respuesta, correcta 
                 FROM respuesta 
                 WHERE id_pregunta = ? 
                 ORDER BY id_respuesta`,
                [pregunta.id_pregunta]
            );
            pregunta.respuestas = respuestas;
        }

        res.render('examen-duelo-individual', {
            layout: 'main',
            user: req.session.user,
            duelo: duelo,
            preguntas: preguntas,
            esRetador: esRetador,
            tiempoRestante: Math.max(0, new Date(duelo.fecha_limite) - new Date())
        });

    } catch (error) {
        console.error('Error al cargar examen de duelo:', error);
        res.redirect('/portal?error=error_servidor');
    }
});

// --- RUTA PARA RESPONDER DUELO - CORREGIDA ---
router.post('/duelo/responder/:salaId', async (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'No autorizado' });

    const { salaId } = req.params;
    const { respuestas, fecha_inicio_str, tiempo_empleado } = req.body;
    const id_usuario = req.session.user.id_usuario;

    try {
        // Parsear respuestas (viene como JSON string desde el frontend)
        const respuestasObj = typeof respuestas === 'string' ? JSON.parse(respuestas) : respuestas;

        // Verificar que el duelo existe y el usuario participa
        const [duelos] = await pool.query(
            `SELECT * FROM duelos WHERE id_duelo = ? AND (id_retador = ? OR id_defensor = ?)`,
            [salaId, id_usuario, id_usuario]
        );

        if (duelos.length === 0) {
            return res.status(404).json({ success: false, error: 'Duelo no encontrado' });
        }

        const duelo = duelos[0];
        const esRetador = (duelo.id_retador === id_usuario);

        // Guardar respuestas en BD - TABLA CORREGIDA (sin 's')
        for (const [id_pregunta, respuesta_seleccionada] of Object.entries(respuestasObj)) {
            await pool.query(
                `INSERT INTO duelo_respuestas (id_duelo, id_usuario, id_pregunta, respuesta)
                VALUES (?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE respuesta = VALUES(respuesta)`,
                [salaId, id_usuario, parseInt(id_pregunta), parseInt(respuesta_seleccionada)]
            );
        }

        // Marcar que ya contestó este jugador
        const campoRespuesta = esRetador ? 'respondido_retador' : 'respondido_oponente';
        await pool.query(
            `UPDATE duelos SET ${campoRespuesta} = 1 WHERE id_duelo = ?`,
            [salaId]
        );

        // Verificar si ambos ya terminaron para calcular resultados
        const [dueloActualizado] = await pool.query(
            `SELECT * FROM duelos WHERE id_duelo = ?`,
            [salaId]
        );

        if (dueloActualizado[0].respondido_retador && dueloActualizado[0].respondido_oponente) {
            // Ambos terminaron, calcular ganador y actualizar puntos
            await calcularResultadosDuelo(salaId);
        }

        res.redirect(`/duelo/resultados/${salaId}`);

    } catch (error) {
        console.error("Error al guardar respuestas de duelo:", error);
        res.status(500).json({ success: false, error: "Error al guardar respuestas" });
    }
});

// --- FUNCIÓN AUXILIAR PARA CALCULAR RESULTADOS DEL DUELO ---
async function calcularResultadosDuelo(salaId) {
    try {
        // Obtener información del duelo
        const [duelos] = await pool.query(
            `SELECT * FROM duelos WHERE id_duelo = ?`,
            [salaId]
        );

        if (duelos.length === 0) return;
        
        const duelo = duelos[0];

        // Calcular puntuación del retador - CORREGIDO PARA TU ESTRUCTURA
        const [puntajeRetador] = await pool.query(`
            SELECT COUNT(*) as correctas
            FROM duelo_respuestas dr
            INNER JOIN pregunta p ON dr.id_pregunta = p.id_pregunta
            WHERE dr.id_duelo = ? AND dr.id_usuario = ? 
            AND EXISTS (
                SELECT 1 FROM respuesta r 
                WHERE r.id_pregunta = p.id_pregunta 
                AND r.correcta = 1 
                AND r.id_respuesta = (
                    SELECT res.id_respuesta FROM respuesta res 
                    WHERE res.id_pregunta = p.id_pregunta 
                    ORDER BY res.id_respuesta 
                    LIMIT dr.respuesta, 1
                )
            )
        `, [salaId, duelo.id_retador]);

        // Calcular puntuación del defensor - CORREGIDO PARA TU ESTRUCTURA
        const [puntajeDefensor] = await pool.query(`
            SELECT COUNT(*) as correctas
            FROM duelo_respuestas dr
            INNER JOIN pregunta p ON dr.id_pregunta = p.id_pregunta
            WHERE dr.id_duelo = ? AND dr.id_usuario = ? 
            AND EXISTS (
                SELECT 1 FROM respuesta r 
                WHERE r.id_pregunta = p.id_pregunta 
                AND r.correcta = 1 
                AND r.id_respuesta = (
                    SELECT res.id_respuesta FROM respuesta res 
                    WHERE res.id_pregunta = p.id_pregunta 
                    ORDER BY res.id_respuesta 
                    LIMIT dr.respuesta, 1
                )
            )
        `, [salaId, duelo.id_defensor]);

        const correctasRetador = puntajeRetador[0].correctas;
        const correctasDefensor = puntajeDefensor[0].correctas;

        let id_ganador = null;
        let puntosGanador = 0;

        // Determinar ganador
        if (correctasRetador > correctasDefensor) {
            id_ganador = duelo.id_retador;
            puntosGanador = 20; // Puntos por ganar duelo
        } else if (correctasDefensor > correctasRetador) {
            id_ganador = duelo.id_defensor;
            puntosGanador = 20;
        } else {
            // Empate - ambos ganan puntos menores
            puntosGanador = 10;
        }

        // Actualizar estado del duelo
        await pool.query(
            `UPDATE duelos SET estado = 'completado' WHERE id_duelo = ?`,
            [salaId]
        );

        // Guardar en historial si existe la tabla
        try {
            if (id_ganador) {
                await pool.query(
                    `INSERT INTO historial_duelos (id_duelo, id_retador, id_defensor, id_ganador, puntos_retador, puntos_defensor, fecha_completado)
                     VALUES (?, ?, ?, ?, ?, ?, NOW())`,
                    [salaId, duelo.id_retador, duelo.id_defensor, id_ganador, correctasRetador, correctasDefensor]
                );

                // Actualizar puntos del ganador
                await pool.query(
                    `UPDATE usuario SET puntos = puntos + ? WHERE id_usuario = ?`,
                    [puntosGanador, id_ganador]
                );
            } else {
                // Empate - ambos ganan puntos
                await pool.query(
                    `INSERT INTO historial_duelos (id_duelo, id_retador, id_defensor, puntos_retador, puntos_defensor, fecha_completado)
                     VALUES (?, ?, ?, ?, ?, NOW())`,
                    [salaId, duelo.id_retador, duelo.id_defensor, correctasRetador, correctasDefensor]
                );

                await pool.query(
                    `UPDATE usuario SET puntos = puntos + ? WHERE id_usuario IN (?, ?)`,
                    [puntosGanador, duelo.id_retador, duelo.id_defensor]
                );
            }
        } catch (historialError) {
            console.warn('No se pudo guardar en historial_duelos (tabla puede no existir):', historialError);
        }

    } catch (error) {
        console.error('Error al calcular resultados del duelo:', error);
    }
}

// --- RUTA DE RESULTADOS - CORREGIDA ---
router.get('/duelo/resultados/:salaId', async (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    
    const userId = req.session.user.id_usuario;
    const { salaId } = req.params;

    try {
        const [duelos] = await pool.query(
            `SELECT d.*, u1.username as retador_username, u2.username as defensor_username
             FROM duelos d
             LEFT JOIN usuario u1 ON d.id_retador = u1.id_usuario
             LEFT JOIN usuario u2 ON d.id_defensor = u2.id_usuario
             WHERE d.id_duelo = ?`,
            [salaId]
        );

        if (duelos.length === 0) return res.redirect('/portal');

        const duelo = duelos[0];

        // Verificar que el usuario es participante
        if (duelo.id_retador !== userId && duelo.id_defensor !== userId) {
            return res.redirect('/portal?error=no_autorizado');
        }

        const [respuestas] = await pool.query(
            `SELECT dr.*, p.pregunta, r.respuesta, r.correcta
             FROM duelo_respuestas dr
             INNER JOIN pregunta p ON dr.id_pregunta = p.id_pregunta
             LEFT JOIN respuesta r ON dr.id_pregunta = r.id_pregunta
             WHERE dr.id_duelo = ?
             ORDER BY dr.id_usuario, dr.id_pregunta`,
            [salaId]
        );

        res.render('resultados-duelo', {
            layout: 'main',
            user: req.session.user,
            duelo: duelo,
            respuestas: respuestas,
            ambosTerminaron: duelo.respondido_retador && duelo.respondido_oponente,
            esRetador: duelo.id_retador === userId
        });

    } catch (error) {
        console.error('Error al cargar resultados del duelo:', error);
        res.redirect('/portal?error=error_servidor');
    }
});

// --- RUTA PARA VER EL ESTADO/PROGRESO DEL DUELO - CORREGIDA ---
router.get('/duelo/estado/:salaId', async (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'No autorizado' });

    const { salaId } = req.params;
    const userId = req.session.user.id_usuario;

    try {
        const [duelos] = await pool.query(
            `SELECT d.*, 
             u1.username as retador_username, 
             u2.username as defensor_username,
             (SELECT COUNT(*) FROM duelo_respuestas WHERE id_duelo = d.id_duelo AND id_usuario = d.id_retador) as respuestas_retador,
             (SELECT COUNT(*) FROM duelo_respuestas WHERE id_duelo = d.id_duelo AND id_usuario = d.id_defensor) as respuestas_defensor
             FROM duelos d
             LEFT JOIN usuario u1 ON d.id_retador = u1.id_usuario
             LEFT JOIN usuario u2 ON d.id_defensor = u2.id_usuario
             WHERE d.id_duelo = ? AND (d.id_retador = ? OR d.id_defensor = ?)`,
            [salaId, userId, userId]
        );

        if (duelos.length === 0) {
            return res.status(404).json({ error: 'Duelo no encontrado' });
        }

        const duelo = duelos[0];
        const esRetador = (duelo.id_retador === userId);
        const yaConteste = (esRetador ? duelo.respuestas_retador : duelo.respuestas_defensor) > 0;
        const oponenteContesto = (esRetador ? duelo.respuestas_defensor : duelo.respuestas_retador) > 0;

        res.json({
            duelo: {
                id_duelo: duelo.id_duelo,
                fecha_limite: duelo.fecha_limite,
                retador_username: duelo.retador_username,
                defensor_username: duelo.defensor_username
            },
            miEstado: {
                yaConteste: yaConteste,
                esRetador: esRetador
            },
            oponenteEstado: {
                yaContesto: oponenteContesto
            },
            tiempoRestante: Math.max(0, new Date(duelo.fecha_limite) - new Date()),
            ambosCompletaron: yaConteste && oponenteContesto
        });

    } catch (error) {
        console.error('Error al obtener estado del duelo:', error);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

// --- RUTA PARA ABANDONAR UN DUELO ---
router.post('/duelo/abandonar/:salaId', async (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'No autorizado' });

    const { salaId } = req.params;
    const userId = req.session.user.id_usuario;
    const { razon } = req.body;

    try {
        // 1️⃣ Verificar que el duelo existe y el usuario es participante
        const [duelos] = await pool.query(
            `SELECT * FROM duelos WHERE id_duelo = ? AND (id_retador = ? OR id_defensor = ?)`,
            [salaId, userId, userId]
        );
        if (duelos.length === 0) {
            return res.status(404).json({ success: false, error: 'Duelo no encontrado' });
        }

        const duelo = duelos[0];
        const esRetador = (duelo.id_retador === userId);
        const campoEstado = esRetador ? 'estado_retador' : 'estado_defensor';
        const oponenteId = esRetador ? duelo.id_defensor : duelo.id_retador;

        // 2️⃣ Marcar como abandonado
        await pool.query(
            `UPDATE duelos 
             SET ${campoEstado} = 'abandonado', 
                 fecha_abandono = NOW(),
                 id_usuario_abandono = ?,
                 razon_abandono = ?,
                 estado = 'abandonado'
             WHERE id_duelo = ?`,
            [userId, razon || 'Abandono voluntario', salaId]
        );

        // 3️⃣ Obtener nombre del usuario que abandonó
        const [usuarioInfo] = await pool.query(
            `SELECT username FROM usuario WHERE id_usuario = ?`,
            [userId]
        );
        const nombreAbandonador = usuarioInfo[0]?.username || 'Un jugador';

        // 4️⃣ Notificar al oponente
        await pool.query(
            `INSERT INTO notificaciones (id_usuario_destinatario, id_usuario_remitente, tipo, mensaje, extra_data) 
             VALUES (?, ?, 'duelo_abandonado', ?, ?)`,
            [
                oponenteId,
                userId,
                `${nombreAbandonador} ha abandonado el duelo. Has ganado por abandono.`,
                JSON.stringify({ 
                    salaId, 
                    ganador: 'oponente', 
                    razon: 'abandono',
                    abandonador: nombreAbandonador
                })
            ]
        );

        // 5️⃣ Emitir evento socket en tiempo real
        if (req.io) {
            req.io.to(oponenteId.toString()).emit('duelo_abandonado', {
                salaId,
                mensaje: `${nombreAbandonador} ha abandonado el duelo`,
                ganaste: true
            });
            
            req.io.to(userId.toString()).emit('duelo_abandonado', {
                salaId,
                mensaje: 'Has abandonado el duelo',
                ganaste: false
            });
        }

        // 6️⃣ Actualizar puntos → el oponente gana 10 por abandono
        await pool.query(
            `UPDATE usuario SET puntos = puntos + 10 WHERE id_usuario = ?`,
            [oponenteId]
        );

        // 7️⃣ Guardar en historial_duelos (si existe)
        try {
            await pool.query(
                `INSERT INTO historial_duelos 
                (id_duelo, id_retador, id_defensor, id_ganador, puntos_retador, puntos_defensor, fecha_completado, tipo_finalizacion)
                VALUES (?, ?, ?, ?, ?, ?, NOW(), 'abandono')`,
                [
                    salaId, 
                    duelo.id_retador, 
                    duelo.id_defensor, 
                    oponenteId, 
                    esRetador ? 0 : 10, 
                    esRetador ? 10 : 0
                ]
            );
        } catch (historialError) {
            console.warn('No se pudo guardar en historial:', historialError);
        }

        res.json({
            success: true,
            message: 'Has abandonado el duelo',
            redirigir: '/portal'
        });

    } catch (error) {
        console.error('Error al abandonar duelo:', error);
        res.status(500).json({ success: false, error: 'Error del servidor' });
    }
});


module.exports = router;