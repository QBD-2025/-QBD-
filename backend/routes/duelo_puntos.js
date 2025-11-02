// ================================================================
// ROUTER: duelo-puntos-router.js
// Sistema completo de puntuación y recompensas para Duelos Rápidos
// ================================================================

const express = require('express');
const router = express.Router();
const pool = require('../db/conexion'); // Tu conexión a BD

// ================================================================
// CONSTANTES DEL SISTEMA DE PUNTUACIÓN
// ================================================================

const SISTEMA_PUNTOS = {
    // Recompensas base por dificultad
    RECOMPENSA_BASE: {
        facil: 20,
        normal: 30,
        dificil: 50
    },
    
    // Multiplicadores de velocidad
    MULTIPLICADOR_VELOCIDAD: {
        RAPIDA: 1.25,    // 0-3 segundos
        NORMAL: 1.0,     // 3-6 segundos
        LENTA: 0.75      // 6-10 segundos
    },
    
    // Bonificaciones especiales
    BONUS_VICTORIA: 100,
    BONUS_RENDIMIENTO: {
        EXCELENTE: 50,   // 90%+ correctas
        BUENO: 30,       // 75-89% correctas
        ACEPTABLE: 15    // 50-74% correctas
    },
    
    // Sistema de gambito
    GAMBITO: {
        BONUS_EXITO: 0.50,    // +50% si cumple
        PENALIZACION_FALLA: 0.25  // -25% si falla
    },
    
    // Bonus de racha
    BONUS_RACHA: 10,  // Puntos adicionales por cada respuesta en racha
    
    // Penalizaciones
    PENALIZACION_TIMEOUT: -25,
    PENALIZACION_ERROR_CRITICA: -50,
    
    // Modificadores de ronda especial
    MODIFICADORES_RONDA: {
        'Pregunta Rápida': { multiplicador: 2.0, nombre: 'Ronda Rápida' },
        'Pregunta Segura': { multiplicador: 1.0, penalizacion: 0, nombre: 'Ronda Segura' },
        'Pregunta Crítica': { multiplicador: 1.5, nombre: 'Ronda Crítica' }
    }
};

// ================================================================
// FUNCIÓN AUXILIAR: Calcular puntos por pregunta individual
// ================================================================

function calcularPuntosPregunta(respuesta, preguntaData) {
    const {
        esCorrecta,
        tiempoRespuesta,    // en segundos
        esGambito = false,
        cumplioGambito = false,
        racha = 0,
        eventoEspecial = null
    } = respuesta;
    
    const {
        puntos: puntosBase,
        puntos_carrera: puntosCarreraBase = 0
    } = preguntaData;
    
    let puntosTotales = 0;
    let puntosCarrera = 0;
    let desglose = [];
    
    // 1. PUNTOS BASE
    if (!esCorrecta) {
        // Respuesta incorrecta
        let penalizacion = 0;
        
        if (eventoEspecial === 'Pregunta Segura') {
            // No hay penalización en ronda segura
            desglose.push({ concepto: 'Respuesta incorrecta (Ronda Segura)', puntos: 0 });
        } else if (eventoEspecial === 'Pregunta Crítica') {
            penalizacion = SISTEMA_PUNTOS.PENALIZACION_ERROR_CRITICA;
            desglose.push({ concepto: 'Error en pregunta crítica', puntos: penalizacion });
        } else {
            // Penalización normal: 0 puntos
            desglose.push({ concepto: 'Respuesta incorrecta', puntos: 0 });
        }
        
        // Penalización de gambito si aplica
        if (esGambito) {
            const penalizacionGambito = Math.floor(puntosBase * SISTEMA_PUNTOS.GAMBITO.PENALIZACION_FALLA);
            penalizacion -= penalizacionGambito;
            desglose.push({ concepto: 'Penalización Gambito Fallido', puntos: -penalizacionGambito });
        }
        
        puntosTotales = penalizacion;
        
    } else {
        // 2. RESPUESTA CORRECTA - Aplicar multiplicador de velocidad
        let multiplicadorVelocidad = SISTEMA_PUNTOS.MULTIPLICADOR_VELOCIDAD.NORMAL;
        
        if (tiempoRespuesta <= 3) {
            multiplicadorVelocidad = SISTEMA_PUNTOS.MULTIPLICADOR_VELOCIDAD.RAPIDA;
        } else if (tiempoRespuesta >= 6) {
            multiplicadorVelocidad = SISTEMA_PUNTOS.MULTIPLICADOR_VELOCIDAD.LENTA;
        }
        
        let puntosConVelocidad = Math.floor(puntosBase * multiplicadorVelocidad);
        desglose.push({ 
            concepto: `Puntos base (${tiempoRespuesta.toFixed(1)}s)`, 
            puntos: puntosConVelocidad 
        });
        
        // 3. APLICAR MODIFICADOR DE EVENTO ESPECIAL
        if (eventoEspecial && SISTEMA_PUNTOS.MODIFICADORES_RONDA[eventoEspecial]) {
            const modificador = SISTEMA_PUNTOS.MODIFICADORES_RONDA[eventoEspecial];
            const puntosEvento = Math.floor(puntosConVelocidad * (modificador.multiplicador - 1));
            if (puntosEvento > 0) {
                desglose.push({ 
                    concepto: `Bonus ${modificador.nombre}`, 
                    puntos: puntosEvento 
                });
                puntosConVelocidad += puntosEvento;
            }
        }
        
        puntosTotales = puntosConVelocidad;
        
        // 4. BONUS DE RACHA
        if (racha > 0) {
            const bonusRacha = racha * SISTEMA_PUNTOS.BONUS_RACHA;
            desglose.push({ concepto: `Bonus Racha x${racha}`, puntos: bonusRacha });
            puntosTotales += bonusRacha;
        }
        
        // 5. BONUS DE GAMBITO EXITOSO
        if (esGambito && cumplioGambito) {
            const bonusGambito = Math.floor(puntosTotales * SISTEMA_PUNTOS.GAMBITO.BONUS_EXITO);
            desglose.push({ concepto: 'Bonus Gambito Exitoso (+50%)', puntos: bonusGambito });
            puntosTotales += bonusGambito;
        }
        
        // 6. PUNTOS DE CARRERA (si aplica)
        if (puntosCarreraBase > 0) {
            puntosCarrera = Math.floor(puntosCarreraBase * multiplicadorVelocidad);
            desglose.push({ concepto: 'Puntos Carrera', puntos: puntosCarrera });
        }
    }
    
    return {
        puntosTotales: Math.max(0, puntosTotales),
        puntosCarrera,
        desglose
    };
}

// ================================================================
// ENDPOINT PRINCIPAL: Guardar resultados del duelo
// ================================================================

router.post('/api/duelo/finalizar', async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const {
            salaId,
            jugadores,           // Array: [{ userId, respuestas: [...] }, ...]
            modo,                // 'carrera' o 'general'
            dificultad,          // 'facil', 'normal', 'dificil'
            apuesta = 0,         // Puntos apostados por jugador
            categorias,          // IDs de categorías/temáticas seleccionadas
            idCarrera = null     // ID de carrera (si modo === 'carrera')
        } = req.body;
        
        console.log(`[FINALIZAR DUELO]: Sala ${salaId} - Modo ${modo}`);
        
        // ================================================================
        // PASO 1: Cargar datos de las preguntas
        // ================================================================
        
        const preguntasIds = [...new Set(
            jugadores.flatMap(j => j.respuestas.map(r => r.idPregunta))
        )];
        
        const [preguntasData] = await connection.query(
            `SELECT 
                id_pregunta, 
                puntos, 
                puntos_carrera, 
                id_dificultad,
                id_tematica,
                id_materia
            FROM pregunta 
            WHERE id_pregunta IN (?)`,
            [preguntasIds]
        );
        
        const mapPreguntas = new Map(
            preguntasData.map(p => [p.id_pregunta, p])
        );
        
        // ================================================================
        // PASO 2: Calcular puntuación de cada jugador
        // ================================================================
        
        const resultadosJugadores = [];
        
        for (const jugador of jugadores) {
            const { userId, respuestas, gambitoActivado = false } = jugador;
            
            let puntosPartida = 0;
            let puntosCarrera = 0;
            let respuestasCorrectas = 0;
            let respuestasIncorrectas = 0;
            let rachaActual = 0;
            let rachaMaxima = 0;
            let detallePreguntas = [];
            
            // Procesar cada respuesta
            for (let i = 0; i < respuestas.length; i++) {
                const resp = respuestas[i];
                const preguntaData = mapPreguntas.get(resp.idPregunta);
                
                if (!preguntaData) {
                    console.warn(`Pregunta ${resp.idPregunta} no encontrada`);
                    continue;
                }
                
                // Actualizar racha
                if (resp.esCorrecta) {
                    rachaActual++;
                    rachaMaxima = Math.max(rachaMaxima, rachaActual);
                    respuestasCorrectas++;
                } else {
                    rachaActual = 0;
                    respuestasIncorrectas++;
                }
                
                // Calcular puntos de esta pregunta
                const resultado = calcularPuntosPregunta({
                    esCorrecta: resp.esCorrecta,
                    tiempoRespuesta: resp.tiempoRespuesta,
                    esGambito: gambitoActivado,
                    cumplioGambito: gambitoActivado && resp.esCorrecta,
                    racha: rachaActual,
                    eventoEspecial: resp.eventoEspecial
                }, preguntaData);
                
                puntosPartida += resultado.puntosTotales;
                puntosCarrera += resultado.puntosCarrera;
                
                detallePreguntas.push({
                    numeroPregunta: i + 1,
                    idPregunta: resp.idPregunta,
                    esCorrecta: resp.esCorrecta,
                    tiempoRespuesta: resp.tiempoRespuesta,
                    puntos: resultado.puntosTotales,
                    puntosCarrera: resultado.puntosCarrera,
                    desglose: resultado.desglose
                });
            }
            
            // Calcular bonificaciones finales
            const porcentajeCorrectas = (respuestasCorrectas / respuestas.length) * 100;
            let bonusRendimiento = 0;
            
            if (porcentajeCorrectas >= 90) {
                bonusRendimiento = SISTEMA_PUNTOS.BONUS_RENDIMIENTO.EXCELENTE;
            } else if (porcentajeCorrectas >= 75) {
                bonusRendimiento = SISTEMA_PUNTOS.BONUS_RENDIMIENTO.BUENO;
            } else if (porcentajeCorrectas >= 50) {
                bonusRendimiento = SISTEMA_PUNTOS.BONUS_RENDIMIENTO.ACEPTABLE;
            }
            
            resultadosJugadores.push({
                userId,
                puntosPartida,
                puntosCarrera,
                bonusRendimiento,
                respuestasCorrectas,
                respuestasIncorrectas,
                rachaMaxima,
                porcentajeCorrectas,
                detallePreguntas
            });
        }
        
        // ================================================================
        // PASO 3: Determinar ganador y calcular recompensas
        // ================================================================
        
        resultadosJugadores.sort((a, b) => b.puntosPartida - a.puntosPartida);
        
        const ganador = resultadosJugadores[0];
        const perdedor = resultadosJugadores[1] || null;
        const esEmpate = perdedor && (ganador.puntosPartida === perdedor.puntosPartida);
        
        // Calcular recompensa base según dificultad
        const recompensaBase = dificultad 
            ? SISTEMA_PUNTOS.RECOMPENSA_BASE[dificultad] 
            : SISTEMA_PUNTOS.RECOMPENSA_BASE.normal;
        
        // Bote de apuestas
        const boteApuestas = apuesta * 2;
        
        console.log(`[FINALIZAR DUELO]: Ganador: ${ganador.userId} (${ganador.puntosPartida} pts)`);
        if (esEmpate) {
            console.log(`[FINALIZAR DUELO]: ¡EMPATE! Ambos jugadores recibirán recompensas reducidas`);
        }
        
        // ================================================================
        // PASO 4: Actualizar puntos en la base de datos
        // ================================================================
        
        for (const resultado of resultadosJugadores) {
            const esGanadorDuelo = !esEmpate && resultado.userId === ganador.userId;
            
            // Calcular puntos totales a otorgar
            let puntosGlobalesGanados = resultado.puntosPartida + resultado.bonusRendimiento;
            
            if (esGanadorDuelo) {
                // GANADOR: Recibe bote + recompensa base + bonus victoria
                puntosGlobalesGanados += boteApuestas + recompensaBase + SISTEMA_PUNTOS.BONUS_VICTORIA;
            } else if (esEmpate) {
                // EMPATE: Devuelve su apuesta + recompensa reducida
                puntosGlobalesGanados += apuesta + Math.floor(recompensaBase / 2);
            } else {
                // PERDEDOR: Pierde su apuesta pero recibe puntos de la partida
                puntosGlobalesGanados -= apuesta;
            }
            
            // No permitir saldo negativo
            puntosGlobalesGanados = Math.max(0, puntosGlobalesGanados);
            
            // Actualizar puntos globales (usuario.puntos)
            await connection.query(
                `UPDATE usuario 
                SET puntos = puntos + ?,
                    racha_victorias = CASE 
                        WHEN ? THEN racha_victorias + 1 
                        ELSE 0 
                    END
                WHERE id_usuario = ?`,
                [puntosGlobalesGanados, esGanadorDuelo, resultado.userId]
            );
            
            console.log(`[FINALIZAR DUELO]: Usuario ${resultado.userId} - Global: +${puntosGlobalesGanados} pts`);
            
            // Actualizar puntos de carrera (si aplica)
            if (idCarrera && resultado.puntosCarrera > 0) {
                await connection.query(
                    `INSERT INTO usuario_puntos_carrera (id_usuario, id_carrera, puntos)
                    VALUES (?, ?, ?)
                    ON DUPLICATE KEY UPDATE puntos = puntos + VALUES(puntos)`,
                    [resultado.userId, idCarrera, resultado.puntosCarrera]
                );
                
                console.log(`[FINALIZAR DUELO]: Usuario ${resultado.userId} - Carrera ${idCarrera}: +${resultado.puntosCarrera} pts`);
            }
        }
        
        // ================================================================
        // PASO 5: Registrar en historial_duelos
        // ================================================================
        
        const [insertResult] = await connection.query(
            `INSERT INTO historial_duelos 
            (id_retador, id_defensor, id_ganador, puntos_retador, puntos_defensor, fecha_duelo)
            VALUES (?, ?, ?, ?, ?, NOW())`,
            [
                resultadosJugadores[0].userId,
                resultadosJugadores[1]?.userId || null,
                esEmpate ? null : ganador.userId,
                resultadosJugadores[0].puntosPartida,
                resultadosJugadores[1]?.puntosPartida || 0
            ]
        );
        
        const idDuelo = insertResult.insertId;
        
        console.log(`[FINALIZAR DUELO]: Registrado en historial con ID ${idDuelo}`);
        
        // ================================================================
        // PASO 6: Commit y preparar respuesta
        // ================================================================
        
        await connection.commit();
        
        // Preparar respuesta completa
        const respuestaFinal = {
            success: true,
            idDuelo,
            ganador: {
                userId: ganador.userId,
                puntosPartida: ganador.puntosPartida,
                puntosGlobalesGanados: ganador.puntosPartida + ganador.bonusRendimiento + 
                    (esEmpate ? 0 : (boteApuestas + recompensaBase + SISTEMA_PUNTOS.BONUS_VICTORIA)),
                puntosCarreraGanados: ganador.puntosCarrera,
                respuestasCorrectas: ganador.respuestasCorrectas,
                respuestasIncorrectas: ganador.respuestasIncorrectas,
                rachaMaxima: ganador.rachaMaxima,
                porcentajeCorrectas: ganador.porcentajeCorrectas.toFixed(1)
            },
            empate: esEmpate,
            recompensas: {
                boteApuestas,
                recompensaBase,
                bonusVictoria: esEmpate ? 0 : SISTEMA_PUNTOS.BONUS_VICTORIA
            },
            detalleJugadores: resultadosJugadores.map(r => ({
                userId: r.userId,
                puntosPartida: r.puntosPartida,
                puntosCarrera: r.puntosCarrera,
                bonusRendimiento: r.bonusRendimiento,
                respuestasCorrectas: r.respuestasCorrectas,
                respuestasIncorrectas: r.respuestasIncorrectas,
                rachaMaxima: r.rachaMaxima,
                porcentajeCorrectas: r.porcentajeCorrectas.toFixed(1),
                preguntas: r.detallePreguntas
            }))
        };
        
        res.json(respuestaFinal);
        
    } catch (error) {
        await connection.rollback();
        console.error('[FINALIZAR DUELO ERROR]:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error al procesar resultados del duelo',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    } finally {
        connection.release();
    }
});

// ================================================================
// ENDPOINT: Obtener desglose de puntos de un duelo
// ================================================================

router.get('/api/duelo/:idDuelo/desglose', async (req, res) => {
    try {
        const { idDuelo } = req.params;
        
        const [duelo] = await pool.query(
            `SELECT 
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
            WHERE h.id_duelo = ?`,
            [idDuelo]
        );
        
        if (duelo.length === 0) {
            return res.status(404).json({ error: 'Duelo no encontrado' });
        }
        
        res.json(duelo[0]);
        
    } catch (error) {
        console.error('[DESGLOSE DUELO ERROR]:', error);
        res.status(500).json({ error: 'Error al obtener desglose del duelo' });
    }
});

// ================================================================
// ENDPOINT: Estadísticas de rendimiento de un jugador
// ================================================================

router.get('/api/usuario/:userId/estadisticas-duelos', async (req, res) => {
    try {
        const { userId } = req.params;
        
        const [estadisticas] = await pool.query(
            `SELECT 
                COUNT(*) as duelos_totales,
                SUM(CASE WHEN id_ganador = ? THEN 1 ELSE 0 END) as victorias,
                SUM(CASE WHEN id_ganador != ? AND id_ganador IS NOT NULL THEN 1 ELSE 0 END) as derrotas,
                SUM(CASE WHEN id_ganador IS NULL THEN 1 ELSE 0 END) as empates,
                AVG(CASE 
                    WHEN id_retador = ? THEN puntos_retador 
                    WHEN id_defensor = ? THEN puntos_defensor 
                END) as promedio_puntos,
                MAX(CASE 
                    WHEN id_retador = ? THEN puntos_retador 
                    WHEN id_defensor = ? THEN puntos_defensor 
                END) as mejor_puntuacion
            FROM historial_duelos
            WHERE id_retador = ? OR id_defensor = ?`,
            [userId, userId, userId, userId, userId, userId, userId, userId]
        );
        
        const [racha] = await pool.query(
            'SELECT racha_victorias FROM usuario WHERE id_usuario = ?',
            [userId]
        );
        
        res.json({
            ...estadisticas[0],
            racha_actual: racha[0]?.racha_victorias || 0,
            porcentaje_victorias: estadisticas[0].duelos_totales > 0 
                ? ((estadisticas[0].victorias / estadisticas[0].duelos_totales) * 100).toFixed(1)
                : 0
        });
        
    } catch (error) {
        console.error('[ESTADÍSTICAS DUELOS ERROR]:', error);
        res.status(500).json({ error: 'Error al obtener estadísticas' });
    }
});

module.exports = router;