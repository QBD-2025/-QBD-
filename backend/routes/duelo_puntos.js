// ================================================================
// SISTEMA UNIFICADO DE PUNTUACIÓN - DUELOS RÁPIDOS
// Versión: 2.1 - Corrige bugs de tipos y SQL
// ================================================================

const db = require('../db/conexion');

// ================================================================
// CONSTANTES CENTRALIZADAS (FUENTE ÚNICA DE VERDAD)
// ================================================================

const SISTEMA_PUNTOS = {
    // Apuestas
    APUESTA: {
        MIN: 10,
        MAX: 100,
        DEFAULT: 20
    },
    
    // Recompensas base por dificultad
    RECOMPENSA: {
        facil: 10,
        normal: 20,
        dificil: 30
    },
    
    // Multiplicadores de velocidad
    VELOCIDAD: {
        RAPIDA: 0.30,   // <= 3s
        NORMAL: 0.20,    // 3-6s
        LENTA: 0.10     // >= 6s
    },
    
    // Bonificaciones
    BONUS: {
        VICTORIA: 10,
        RENDIMIENTO_EXCELENTE: 20,  // >= 90%
        RENDIMIENTO_BUENO: 10,      // >= 75%
        RENDIMIENTO_ACEPTABLE: 5,  // >= 50%
        RACHA_POR_RESPUESTA: 4
    },
    
    // Gambito
    GAMBITO: {
        BONUS_EXITO: 0.50,        // +50%
        PENALIZACION_FALLA: 0.25  // -25%
    },
    
    // Penalizaciones
    PENALIZACION: {
        TIMEOUT: -10,
        ERROR_CRITICO: -20
    },
    
    // Eventos especiales
    EVENTOS: {
        'rapida': { mult: 1.0, nombre: 'Ronda Rápida' },
        'critica': { mult: 0.50, nombre: 'Ronda Crítica' },
        'riesgo': { mult: 0.25, penalizacion: -10 }
    }
};

// ================================================================
// CLASE PRINCIPAL: GestorPuntuacion
// ================================================================

class GestorPuntuacion {
    
    /**
     * Calcula puntos de una pregunta individual
     * @param {Object} respuestaData - Datos de la respuesta
     * @param {Object} preguntaData - Datos de la pregunta
     * @returns {Object} { puntosTotales, puntosCarrera, desglose }
     */
    static calcularPuntosPregunta(respuestaData, preguntaData) {
        const {
            esCorrecta,
            tiempoRespuesta,
            racha = 0,
            eventoEspecial = null
        } = respuestaData;
        
        const { 
            puntos: puntosBase, 
            puntos_carrera: puntosCarreraBase = 0 
        } = preguntaData;
        
        let desglose = [];
        
        // ❌ RESPUESTA INCORRECTA
        if (!esCorrecta) {
            let penalizacion = 0;
            
            if (eventoEspecial === 'riesgo') {
                penalizacion = SISTEMA_PUNTOS.PENALIZACION.ERROR_CRITICO;
                desglose.push({ 
                    concepto: '💀 Error en Ronda de Riesgo', 
                    valor: penalizacion, 
                    esPositivo: false 
                });
            } else {
                desglose.push({ 
                    concepto: '❌ Respuesta Incorrecta', 
                    valor: 0, 
                    esPositivo: false 
                });
            }
            
            return {
                puntosTotales: penalizacion,
                puntosCarrera: 0,
                desglose
            };
        }
        
        // ✅ RESPUESTA CORRECTA
        
        // 1. Calcular multiplicador de velocidad
        let multVelocidad = SISTEMA_PUNTOS.VELOCIDAD.NORMAL;
        let etiquetaVelocidad = 'Normal';
        
        if (tiempoRespuesta <= 3) {
            multVelocidad = SISTEMA_PUNTOS.VELOCIDAD.RAPIDA;
            etiquetaVelocidad = '⚡ Rápida';
        } else if (tiempoRespuesta >= 6) {
            multVelocidad = SISTEMA_PUNTOS.VELOCIDAD.LENTA;
            etiquetaVelocidad = '🐌 Lenta';
        }
        
        let puntos = Math.floor(puntosBase * multVelocidad);
        desglose.push({ 
            concepto: `✅ Respuesta ${etiquetaVelocidad} (${tiempoRespuesta.toFixed(1)}s)`, 
            valor: puntos,
            esPositivo: true
        });
        
        // 2. Bonus de evento especial
        if (eventoEspecial && SISTEMA_PUNTOS.EVENTOS[eventoEspecial]) {
            const evento = SISTEMA_PUNTOS.EVENTOS[eventoEspecial];
            const bonusEvento = Math.floor(puntos * (evento.mult - 1));
            
            if (bonusEvento > 0) {
                desglose.push({ 
                    concepto: `🔥 ${evento.nombre}`, 
                    valor: bonusEvento,
                    esPositivo: true
                });
                puntos += bonusEvento;
            }
        }
        
        // 3. Bonus de racha
        if (racha > 0) {
            const bonusRacha = racha * SISTEMA_PUNTOS.BONUS.RACHA_POR_RESPUESTA;
            desglose.push({ 
                concepto: `🔥 Racha x${racha}`, 
                valor: bonusRacha,
                esPositivo: true
            });
            puntos += bonusRacha;
        }
        
        // 4. Puntos de carrera
        let puntosCarrera = 0;
        if (puntosCarreraBase > 0) {
            puntosCarrera = Math.floor(puntosCarreraBase * multVelocidad);
            desglose.push({ 
                concepto: '🎓 Puntos de Carrera', 
                valor: puntosCarrera,
                esPositivo: true
            });
        }
        
        return {
            puntosTotales: Math.max(0, puntos),
            puntosCarrera,
            desglose
        };
    }
    
    /**
     * Procesa resultado completo de un jugador
     * @param {Object} jugadorData - Datos del jugador con respuestas
     * @param {Map} preguntasMap - Mapa de preguntas por ID
     * @param {Boolean} gambito - Si activó gambito
     * @returns {Object} Resultado procesado
     */
    static procesarResultadoJugador(jugadorData, preguntasMap, gambito = false) {
        const { respuestas } = jugadorData;
        
        let puntosPartida = 0;
        let puntosCarrera = 0;
        let respuestasCorrectas = 0;
        let rachaActual = 0;
        let rachaMaxima = 0;
        let detallePreguntas = [];
        let cumplioGambito = gambito;
        
        // Procesar cada respuesta
        for (let i = 0; i < respuestas.length; i++) {
            const resp = respuestas[i];
            const pregunta = preguntasMap.get(resp.idPregunta);
            
            if (!pregunta) continue;
            
            // Actualizar racha
            if (resp.esCorrecta) {
                rachaActual++;
                rachaMaxima = Math.max(rachaMaxima, rachaActual);
                respuestasCorrectas++;
            } else {
                rachaActual = 0;
                if (gambito) cumplioGambito = false; // Gambito falla con 1 error
            }
            
            // Calcular puntos
            const resultado = this.calcularPuntosPregunta({
                esCorrecta: resp.esCorrecta,
                tiempoRespuesta: resp.tiempoRespuesta,
                racha: rachaActual,
                eventoEspecial: resp.eventoEspecial
            }, pregunta);
            
            puntosPartida += resultado.puntosTotales;
            puntosCarrera += resultado.puntosCarrera;
            
            detallePreguntas.push({
                numero: i + 1,
                idPregunta: resp.idPregunta,
                esCorrecta: resp.esCorrecta,
                tiempo: resp.tiempoRespuesta,
                puntos: resultado.puntosTotales,
                puntosCarrera: resultado.puntosCarrera,
                desglose: resultado.desglose
            });
        }
        
        // Calcular bonus de rendimiento
        const porcentaje = (respuestasCorrectas / respuestas.length) * 100;
        let bonusRendimiento = 0;
        
        if (porcentaje >= 90) {
            bonusRendimiento = SISTEMA_PUNTOS.BONUS.RENDIMIENTO_EXCELENTE;
        } else if (porcentaje >= 75) {
            bonusRendimiento = SISTEMA_PUNTOS.BONUS.RENDIMIENTO_BUENO;
        } else if (porcentaje >= 50) {
            bonusRendimiento = SISTEMA_PUNTOS.BONUS.RENDIMIENTO_ACEPTABLE;
        }
        
        return {
            puntosPartida,
            puntosCarrera,
            bonusRendimiento,
            respuestasCorrectas,
            respuestasIncorrectas: respuestas.length - respuestasCorrectas,
            rachaMaxima,
            porcentaje: porcentaje.toFixed(1),
            detallePreguntas,
            cumplioGambito
        };
    }
    
    /**
     * Finaliza duelo y guarda puntos en BD (TRANSACCIÓN ATÓMICA)
     * @param {String} salaId - ID de la sala
     * @param {Object} duelo - Objeto del duelo completo
     * @returns {Object} Resultado para emitir a clientes
     */
    static async finalizarDuelo(salaId, duelo) {
        const connection = await db.getConnection();
        
        try {
            await connection.beginTransaction();
            
            // ✅ CONVERTIR IDs A NÚMEROS (Object.keys devuelve strings)
            const jugadoresIds = Object.keys(duelo.jugadores).map(id => parseInt(id));
            const [jugadorA_id, jugadorB_id] = jugadoresIds;
            
            console.log(`[FINALIZAR ${salaId}]: 🏁 Iniciando...`);
            console.log(`[FINALIZAR]: IDs procesados - A: ${jugadorA_id} (${typeof jugadorA_id}), B: ${jugadorB_id} (${typeof jugadorB_id})`);
            
            // ================================================================
            // PASO 1: Cargar datos de preguntas
            // ================================================================
            
            const preguntasIds = duelo.examen.map(p => p.id_pregunta);
            const [preguntasData] = await connection.query(
                `SELECT id_pregunta, puntos, puntos_carrera, id_dificultad 
                FROM pregunta WHERE id_pregunta IN (?)`,
                [preguntasIds]
            );
            
            const preguntasMap = new Map(
                preguntasData.map(p => [p.id_pregunta, p])
            );
            
            // ================================================================
            // PASO 2: Obtener puntos iniciales (con lock para evitar race conditions)
            // ================================================================
            
            const [[puntosA]] = await connection.query(
                'SELECT puntos FROM usuario WHERE id_usuario = ? FOR UPDATE',
                [jugadorA_id]
            );
            const [[puntosB]] = await connection.query(
                'SELECT puntos FROM usuario WHERE id_usuario = ? FOR UPDATE',
                [jugadorB_id]
            );
            
            console.log(`[FINALIZAR]: Puntos iniciales - A: ${puntosA.puntos}, B: ${puntosB.puntos}`);
            
            // ================================================================
            // PASO 3: ✅ VALIDACIÓN FINAL DE APUESTA (PREVENIR TRAMPAS)
            // ================================================================
            
            const apuesta = duelo.apuesta || SISTEMA_PUNTOS.APUESTA.DEFAULT;
            
            if (puntosA.puntos < apuesta || puntosB.puntos < apuesta) {
                console.error(`[FINALIZAR]: ❌ Puntos insuficientes para apuesta`);
                
                await connection.rollback();
                
                throw new Error(
                    `ERROR_APUESTA_INVALIDA: Jugador sin puntos suficientes. ` +
                    `A=${puntosA.puntos}, B=${puntosB.puntos}, Apuesta=${apuesta}`
                );
            }
            
            // ================================================================
            // PASO 4: Procesar respuestas de cada jugador
            // ================================================================
            
            const resultados = {};
            
            for (const jId of jugadoresIds) {
                const respuestasJugador = [];
                
                // Reconstruir array de respuestas
                for (const pregunta of duelo.examen) {
                    const respData = duelo.respuestas[pregunta.id_pregunta]?.[jId];
                    const tiempo = duelo.tiemposRespuesta[pregunta.id_pregunta]?.[jId] || 10;
                    
                    respuestasJugador.push({
                        idPregunta: pregunta.id_pregunta,
                        esCorrecta: respData?.esCorrecta || false,
                        tiempoRespuesta: tiempo,
                        eventoEspecial: pregunta.evento?.id || null
                    });
                }
                
                resultados[jId] = this.procesarResultadoJugador({
                    respuestas: respuestasJugador
                }, preguntasMap, duelo.jugadores[jId].gambitoActivado);
            }
            
            // ================================================================
            // PASO 5: Determinar ganador
            // ================================================================
            
            const ptsA = resultados[jugadorA_id].puntosPartida;
            const ptsB = resultados[jugadorB_id].puntosPartida;
            
            const esEmpate = ptsA === ptsB;
            const ganadorId = esEmpate ? null : (ptsA > ptsB ? jugadorA_id : jugadorB_id);
            
            console.log(`[FINALIZAR]: Puntos A=${ptsA}, B=${ptsB}, Ganador=${ganadorId || 'EMPATE'} (tipo: ${typeof ganadorId})`);
            
            // ================================================================
            // PASO 6: Calcular recompensas finales
            // ================================================================
            
            const bote = apuesta * 2;
            const recompensaBase = SISTEMA_PUNTOS.RECOMPENSA[duelo.dificultad] || SISTEMA_PUNTOS.RECOMPENSA.normal;
            
            const desgloseCompleto = {};
            
            for (const jId of jugadoresIds) {
                const esGanador = !esEmpate && jId === ganadorId;
                const resultado = resultados[jId];
                const puntosIniciales = jId === jugadorA_id ? puntosA.puntos : puntosB.puntos;
                
                let desglose = [];
                let cambioTotal = 0;
                
                // 1. Puntos de partida
                desglose.push({
                    concepto: '🎮 Puntos de Partida',
                    valor: resultado.puntosPartida,
                    esPositivo: true
                });
                cambioTotal += resultado.puntosPartida;
                
                // 2. Bonus de rendimiento
                if (resultado.bonusRendimiento > 0) {
                    desglose.push({
                        concepto: `⭐ Bonus Rendimiento (${resultado.porcentaje}%)`,
                        valor: resultado.bonusRendimiento,
                        esPositivo: true
                    });
                    cambioTotal += resultado.bonusRendimiento;
                }
                
                // 3. Recompensas por resultado
                if (esGanador) {
                    desglose.push({ 
                        concepto: '🎰 Bote de Apuesta', 
                        valor: bote, 
                        esPositivo: true 
                    });
                    desglose.push({ 
                        concepto: '💎 Recompensa Base', 
                        valor: recompensaBase, 
                        esPositivo: true 
                    });
                    desglose.push({ 
                        concepto: '👑 Bonus Victoria', 
                        valor: SISTEMA_PUNTOS.BONUS.VICTORIA, 
                        esPositivo: true 
                    });
                    cambioTotal += bote + recompensaBase + SISTEMA_PUNTOS.BONUS.VICTORIA;
                    
                } else if (esEmpate) {
                    desglose.push({ 
                        concepto: '🤝 Devolución Apuesta', 
                        valor: apuesta, 
                        esPositivo: true 
                    });
                    const recompensaEmpate = Math.floor(recompensaBase / 2);
                    desglose.push({ 
                        concepto: '💰 Recompensa Empate', 
                        valor: recompensaEmpate, 
                        esPositivo: true 
                    });
                    cambioTotal += apuesta + recompensaEmpate;
                    
                } else {
                    // Perdedor
                    desglose.push({ 
                        concepto: '💔 Pérdida Apuesta', 
                        valor: apuesta, 
                        esPositivo: false 
                    });
                    cambioTotal -= apuesta;
                }
                
                // 4. Bonus/Penalización de Gambito
                if (duelo.jugadores[jId].gambitoActivado) {
                    if (resultado.cumplioGambito) {
                        const bonusGambito = Math.floor(
                            resultado.puntosPartida * SISTEMA_PUNTOS.GAMBITO.BONUS_EXITO
                        );
                        desglose.push({ 
                            concepto: '🎲 Bonus Gambito Exitoso (+50%)', 
                            valor: bonusGambito, 
                            esPositivo: true 
                        });
                        cambioTotal += bonusGambito;
                    } else {
                        const penalizacionGambito = Math.floor(
                            resultado.puntosPartida * SISTEMA_PUNTOS.GAMBITO.PENALIZACION_FALLA
                        );
                        desglose.push({ 
                            concepto: '🎲 Penalización Gambito Fallido (-25%)', 
                            valor: penalizacionGambito, 
                            esPositivo: false 
                        });
                        cambioTotal -= penalizacionGambito;
                    }
                }
                
                // No permitir puntos negativos totales
                cambioTotal = Math.max(-puntosIniciales, cambioTotal);
                
                desgloseCompleto[jId] = {
                    ...resultado,
                    puntosIniciales,
                    desglose,
                    cambioTotal,
                    puntosFinal: puntosIniciales + cambioTotal
                };
                
                // ================================================================
                // PASO 7: ACTUALIZAR BASE DE DATOS
                // ================================================================
                
                // 7.1 Puntos globales - ✅ CORREGIDO: Solo 2 parámetros
                await connection.query(
                    `UPDATE usuario 
                    SET puntos = GREATEST(0, puntos + ?)
                    WHERE id_usuario = ?`,
                    [cambioTotal, jId]
                );
                
                console.log(`[BD]: Usuario ${jId}: ${puntosIniciales} → ${puntosIniciales + cambioTotal} (${cambioTotal > 0 ? '+' : ''}${cambioTotal})`);
                
                // 7.2 Puntos de carrera (si aplica)
                if (duelo.modo === 'carrera' && resultado.puntosCarrera > 0) {
                    const [[carreraData]] = await connection.query(
                        'SELECT id_carrera FROM usuario_carrera WHERE id_usuario = ? LIMIT 1',
                        [jId]
                    );
                    
                    if (carreraData) {
                        await connection.query(
                            `INSERT INTO usuario_puntos_carrera (id_usuario, id_carrera, puntos)
                            VALUES (?, ?, ?)
                            ON DUPLICATE KEY UPDATE puntos = puntos + VALUES(puntos)`,
                            [jId, carreraData.id_carrera, resultado.puntosCarrera]
                        );
                        
                        console.log(`[BD]: Usuario ${jId} Carrera ${carreraData.id_carrera}: +${resultado.puntosCarrera} pts`);
                    }
                }
            }
            
            // ================================================================
            // PASO 8: Registrar en historial
            // ================================================================
            
            await connection.query(
                `INSERT INTO historial_duelos 
                (id_retador, id_defensor, id_ganador, puntos_retador, puntos_defensor, fecha_duelo)
                VALUES (?, ?, ?, ?, ?, NOW())`,
                [jugadorA_id, jugadorB_id, ganadorId, ptsA, ptsB]
            );
            
            // ✅ COMMIT ATÓMICO
            await connection.commit();
            
            console.log(`[FINALIZAR]: ✅ Duelo ${salaId} finalizado y guardado exitosamente`);
            
            // ================================================================
            // PASO 9: Preparar respuesta para clientes
            // ================================================================
            
            return {
                ganadorId, // ✅ Ya es un número
                esEmpate,
                puntuaciones: { 
                    [jugadorA_id]: ptsA, 
                    [jugadorB_id]: ptsB 
                },
                apuesta,
                bote,
                recompensaBase,
                jugadores: jugadoresIds.map(jId => ({
                    userId: parseInt(jId), // ✅ ASEGURAR QUE SEA NÚMERO
                    username: duelo.jugadores[jId].username,
                    foto_perfil: duelo.jugadores[jId].foto_perfil || '/uploads/default_avatar.png',
                    puntuacionFinal: resultados[jId].puntosPartida,
                    racha: resultados[jId].rachaMaxima,
                    ...desgloseCompleto[jId]
                }))
            };
            
        } catch (error) {
            await connection.rollback();
            console.error(`[FINALIZAR ERROR]:`, error);
            throw error;
        } finally {
            connection.release();
        }
    }
    
    /**
     * Valida si jugadores tienen puntos suficientes para apuesta
     * @param {Number} idJugadorA 
     * @param {Number} idJugadorB 
     * @param {Number} cantidad 
     * @returns {Object} { valido, mensaje, puntosMaximos }
     */
    static async validarApuesta(idJugadorA, idJugadorB, cantidad) {
        try {
            // Validar rango
            if (cantidad < SISTEMA_PUNTOS.APUESTA.MIN || 
                cantidad > SISTEMA_PUNTOS.APUESTA.MAX) {
                return {
                    valido: false,
                    mensaje: `La apuesta debe estar entre ${SISTEMA_PUNTOS.APUESTA.MIN} y ${SISTEMA_PUNTOS.APUESTA.MAX} puntos`,
                    puntosMaximos: 0
                };
            }
            
            // Consultar puntos actuales
            const [[puntosA]] = await db.query(
                'SELECT puntos FROM usuario WHERE id_usuario = ?',
                [idJugadorA]
            );
            const [[puntosB]] = await db.query(
                'SELECT puntos FROM usuario WHERE id_usuario = ?',
                [idJugadorB]
            );
            
            if (!puntosA || !puntosB) {
                return {
                    valido: false,
                    mensaje: 'Error al consultar puntos de los jugadores',
                    puntosMaximos: 0
                };
            }
            
            const puntosJugadorA = puntosA.puntos;
            const puntosJugadorB = puntosB.puntos;
            const puntosMaximos = Math.min(puntosJugadorA, puntosJugadorB, SISTEMA_PUNTOS.APUESTA.MAX);
            
            // Validar que ambos tengan suficientes puntos
            if (puntosJugadorA < cantidad || puntosJugadorB < cantidad) {
                return {
                    valido: false,
                    mensaje: `Uno de los jugadores no tiene suficientes puntos. Máximo disponible: ${puntosMaximos}`,
                    puntosMaximos
                };
            }
            
            return {
                valido: true,
                mensaje: 'Apuesta válida',
                puntosMaximos
            };
            
        } catch (error) {
            console.error('[VALIDAR APUESTA ERROR]:', error);
            return {
                valido: false,
                mensaje: 'Error al validar apuesta',
                puntosMaximos: 0
            };
        }
    }
}

// ================================================================
// EXPORTAR
// ================================================================

module.exports = {
    GestorPuntuacion,
    SISTEMA_PUNTOS
};