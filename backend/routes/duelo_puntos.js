// ================================================================
// SISTEMA UNIFICADO DE PUNTUACIÓN - DUELOS RÁPIDOS + RANGOS
// ✅ Versión Unificada: Corrige puntos carrera vs globales
// ✅ Incluye: Validaciones mejoradas + Sistema de rangos
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
        NORMAL: 0.20,   // 3-6s
        LENTA: 0.10     // >= 6s
    },
    
    // Bonificaciones
    BONUS: {
        VICTORIA: 10,
        RENDIMIENTO_EXCELENTE: 20,  // >= 90%
        RENDIMIENTO_BUENO: 10,      // >= 75%
        RENDIMIENTO_ACEPTABLE: 5,   // >= 50%
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
     * ✅ CORREGIDO: Calcula puntos diferenciando modo carrera vs general
     * @param {Object} respuestaData - Datos de la respuesta
     * @param {Object} preguntaData - Datos de la pregunta
     * @param {String} modoPartida - 'carrera' o 'general'
     * @returns {Object} { puntosTotales, puntosGlobales, puntosCarrera, desglose }
     */
    static calcularPuntosPregunta(respuestaData, preguntaData, modoPartida = 'general') {
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
                puntosGlobales: penalizacion, // ✅ SIEMPRE afecta puntos globales
                puntosCarrera: 0,
                desglose
            };
        }
        
        // ✅ RESPUESTA CORRECTA
        
        // 1. Multiplicador de velocidad
        let multVelocidad = SISTEMA_PUNTOS.VELOCIDAD.NORMAL;
        let etiquetaVelocidad = 'Normal';
        
        if (tiempoRespuesta <= 3) {
            multVelocidad = SISTEMA_PUNTOS.VELOCIDAD.RAPIDA;
            etiquetaVelocidad = '⚡ Rápida';
        } else if (tiempoRespuesta >= 6) {
            multVelocidad = SISTEMA_PUNTOS.VELOCIDAD.LENTA;
            etiquetaVelocidad = '🐌 Lenta';
        }
        
        // ✅ CRÍTICO: Diferenciar puntos según modo
        let puntosGlobales = 0;
        let puntosCarrera = 0;
        
        if (modoPartida === 'carrera') {
            // ✅ MODO CARRERA: puntos_carrera a tabla usuario_puntos_carrera
            puntosCarrera = Math.floor(puntosCarreraBase * multVelocidad);
            
            desglose.push({ 
                concepto: `🎓 Puntos Carrera ${etiquetaVelocidad} (${tiempoRespuesta.toFixed(1)}s)`, 
                valor: puntosCarrera,
                esPositivo: true
            });
        } else {
            // ✅ MODO GENERAL: puntos a tabla usuario
            puntosGlobales = Math.floor(puntosBase * multVelocidad);
            
            desglose.push({ 
                concepto: `✅ Puntos Globales ${etiquetaVelocidad} (${tiempoRespuesta.toFixed(1)}s)`, 
                valor: puntosGlobales,
                esPositivo: true
            });
        }
        
        // 2. Bonus de evento especial
        if (eventoEspecial && SISTEMA_PUNTOS.EVENTOS[eventoEspecial]) {
            const evento = SISTEMA_PUNTOS.EVENTOS[eventoEspecial];
            const bonusEvento = Math.floor((puntosGlobales + puntosCarrera) * (evento.mult - 1));
            
            if (bonusEvento > 0) {
                desglose.push({ 
                    concepto: `🔥 ${evento.nombre}`, 
                    valor: bonusEvento,
                    esPositivo: true
                });
                
                if (modoPartida === 'carrera') {
                    puntosCarrera += bonusEvento;
                } else {
                    puntosGlobales += bonusEvento;
                }
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
            
            if (modoPartida === 'carrera') {
                puntosCarrera += bonusRacha;
            } else {
                puntosGlobales += bonusRacha;
            }
        }
        
        return {
            puntosTotales: Math.max(0, puntosGlobales + puntosCarrera),
            puntosGlobales: Math.max(0, puntosGlobales),
            puntosCarrera: Math.max(0, puntosCarrera),
            desglose
        };
    }
    
    /**
     * ✅ CORREGIDO: Procesa resultado con modo
     * @param {Object} jugadorData - Datos del jugador con respuestas
     * @param {Map} preguntasMap - Mapa de preguntas por ID
     * @param {Boolean} gambito - Si activó gambito
     * @param {String} modoPartida - 'carrera' o 'general'
     * @returns {Object} Resultado procesado
     */
    static procesarResultadoJugador(jugadorData, preguntasMap, gambito = false, modoPartida = 'general') {
        const { respuestas } = jugadorData;
        
        let puntosPartida = 0;
        let puntosGlobales = 0;
        let puntosCarrera = 0;
        let respuestasCorrectas = 0;
        let rachaActual = 0;
        let rachaMaxima = 0;
        let tiempoTotal = 0;
        let detallePreguntas = [];
        let cumplioGambito = gambito;
        
        // Procesar cada respuesta
        for (let i = 0; i < respuestas.length; i++) {
            const resp = respuestas[i];
            const pregunta = preguntasMap.get(resp.idPregunta);
            
            if (!pregunta) continue;
            
            tiempoTotal += resp.tiempoRespuesta;
            
            // Actualizar racha
            if (resp.esCorrecta) {
                rachaActual++;
                rachaMaxima = Math.max(rachaMaxima, rachaActual);
                respuestasCorrectas++;
            } else {
                rachaActual = 0;
                if (gambito) cumplioGambito = false;
            }
            
            // ✅ Calcular puntos con modo correcto
            const resultado = this.calcularPuntosPregunta({
                esCorrecta: resp.esCorrecta,
                tiempoRespuesta: resp.tiempoRespuesta,
                racha: rachaActual,
                eventoEspecial: resp.eventoEspecial
            }, pregunta, modoPartida);
            
            puntosPartida += resultado.puntosTotales;
            puntosGlobales += resultado.puntosGlobales;
            puntosCarrera += resultado.puntosCarrera;
            
            detallePreguntas.push({
                numero: i + 1,
                idPregunta: resp.idPregunta,
                esCorrecta: resp.esCorrecta,
                tiempo: resp.tiempoRespuesta,
                puntos: resultado.puntosTotales,
                puntosGlobales: resultado.puntosGlobales,
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
        
        // ✅ CRÍTICO: Bonus va a puntos GLOBALES siempre
        puntosGlobales += bonusRendimiento;
        puntosPartida += bonusRendimiento;
        
        const tiempoPromedio = respuestas.length > 0 ? tiempoTotal / respuestas.length : 0;
        
        return {
            puntosPartida,
            puntosGlobales,
            puntosCarrera,
            bonusRendimiento,
            respuestasCorrectas,
            respuestasIncorrectas: respuestas.length - respuestasCorrectas,
            rachaMaxima,
            tiempoPromedio: parseFloat(tiempoPromedio.toFixed(2)),
            porcentaje: porcentaje.toFixed(1),
            detallePreguntas,
            cumplioGambito
        };
    }
    
    /**
     * ✅✅✅ CRÍTICO: Finalizar duelo CON ACTUALIZACIÓN CORRECTA DE PUNTOS
     * @param {String} salaId - ID de la sala
     * @param {Object} duelo - Objeto del duelo completo
     * @returns {Object} Resultado para emitir a clientes
     */
    static async finalizarDuelo(salaId, duelo) {
        const connection = await db.getConnection();
        
        try {
            await connection.beginTransaction();
            
            const jugadoresIds = Object.keys(duelo.jugadores).map(id => parseInt(id));
            const [jugadorA_id, jugadorB_id] = jugadoresIds;
            
            console.log(`[FINALIZAR ${salaId}]: 🏁 Modo: ${duelo.modo}`);
            
            // ================================================================
            // PASO 1: Cargar preguntas
            // ================================================================
            
            const preguntasIds = duelo.examen.map(p => p.id_pregunta);
            
            const [preguntasData] = await connection.query(
                `SELECT 
                    p.id_pregunta, 
                    p.puntos, 
                    p.puntos_carrera,
                    p.id_dificultad,
                    p.id_tematica
                FROM pregunta p
                WHERE p.id_pregunta IN (?)`,
                [preguntasIds]
            );
            
            const preguntasMap = new Map(
                preguntasData.map(p => [p.id_pregunta, p])
            );
            
            // ================================================================
            // PASO 2: Obtener puntos iniciales (GLOBALES siempre) + LOCK
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
            
            // ✅ Validar apuesta (SIEMPRE con puntos globales)
            const apuesta = duelo.apuesta || SISTEMA_PUNTOS.APUESTA.DEFAULT;
            
            if (puntosA.puntos < apuesta || puntosB.puntos < apuesta) {
                await connection.rollback();
                throw new Error('ERROR_APUESTA_INVALIDA: Puntos insuficientes');
            }
            
            // ================================================================
            // PASO 3: Procesar respuestas
            // ================================================================
            
            const resultados = {};
            
            for (const jId of jugadoresIds) {
                const respuestasJugador = [];
                
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
                }, preguntasMap, duelo.jugadores[jId].gambitoActivado, duelo.modo);
            }
            
            // ================================================================
            // PASO 4: Determinar ganador
            // ================================================================
            
            const ptsA = resultados[jugadorA_id].puntosPartida;
            const ptsB = resultados[jugadorB_id].puntosPartida;
            
            const esEmpate = ptsA === ptsB;
            const ganadorId = esEmpate ? null : (ptsA > ptsB ? jugadorA_id : jugadorB_id);
            
            console.log(`[FINALIZAR]: Ganador=${ganadorId || 'EMPATE'}`);
            
            // ================================================================
            // PASO 5: Calcular recompensas
            // ================================================================
            
            const bote = apuesta * 2;
            const recompensaBase = SISTEMA_PUNTOS.RECOMPENSA[duelo.dificultad] || SISTEMA_PUNTOS.RECOMPENSA.normal;
            
            const desgloseCompleto = {};
            
            // ✅ Obtener id_carrera si es modo carrera
            let idCarrera = duelo.idCarrera || null;
            if (duelo.modo === 'carrera' && !idCarrera) {
                const [[carreraData]] = await connection.query(
                    'SELECT id_carrera FROM usuario_carrera WHERE id_usuario = ? LIMIT 1',
                    [jugadorA_id]
                );
                idCarrera = carreraData?.id_carrera || null;
            }
            
            for (const jId of jugadoresIds) {
                const esGanador = !esEmpate && jId === ganadorId;
                const resultado = resultados[jId];
                const puntosIniciales = jId === jugadorA_id ? puntosA.puntos : puntosB.puntos;
                
                let desglose = [];
                let cambioGlobal = 0;  // ✅ Para tabla usuario
                let cambioCarrera = 0; // ✅ Para tabla usuario_puntos_carrera
                
                // 1. Puntos de partida
                if (duelo.modo === 'carrera') {
                    desglose.push({
                        concepto: '🎓 Puntos de Carrera',
                        valor: resultado.puntosCarrera,
                        esPositivo: true
                    });
                    cambioCarrera += resultado.puntosCarrera;
                } else {
                    desglose.push({
                        concepto: '🎮 Puntos Globales',
                        valor: resultado.puntosGlobales,
                        esPositivo: true
                    });
                    cambioGlobal += resultado.puntosGlobales;
                }
                
                // 2. Bonus de rendimiento (SIEMPRE global)
                if (resultado.bonusRendimiento > 0) {
                    desglose.push({
                        concepto: `⭐ Bonus Rendimiento (${resultado.porcentaje}%)`,
                        valor: resultado.bonusRendimiento,
                        esPositivo: true
                    });
                    cambioGlobal += resultado.bonusRendimiento;
                }
                
                // 3. Resultado del duelo (SIEMPRE afecta globales)
                if (esGanador) {
                    desglose.push({ concepto: '🎰 Bote', valor: bote, esPositivo: true });
                    desglose.push({ concepto: '💎 Recompensa', valor: recompensaBase, esPositivo: true });
                    desglose.push({ concepto: '👑 Victoria', valor: SISTEMA_PUNTOS.BONUS.VICTORIA, esPositivo: true });
                    cambioGlobal += bote + recompensaBase + SISTEMA_PUNTOS.BONUS.VICTORIA;
                } else if (esEmpate) {
                    desglose.push({ concepto: '🤝 Devolución', valor: apuesta, esPositivo: true });
                    const recompensaEmpate = Math.floor(recompensaBase / 2);
                    desglose.push({ concepto: '💰 Recompensa', valor: recompensaEmpate, esPositivo: true });
                    cambioGlobal += apuesta + recompensaEmpate;
                } else {
                    desglose.push({ concepto: '💔 Pérdida Apuesta', valor: apuesta, esPositivo: false });
                    cambioGlobal -= apuesta;
                }
                
                // 4. Gambito
                if (duelo.jugadores[jId].gambitoActivado) {
                    const puntosBase = duelo.modo === 'carrera' ? resultado.puntosCarrera : resultado.puntosGlobales;
                    
                    if (resultado.cumplioGambito) {
                        const bonusGambito = Math.floor(puntosBase * SISTEMA_PUNTOS.GAMBITO.BONUS_EXITO);
                        desglose.push({ concepto: '🎲 Gambito (+50%)', valor: bonusGambito, esPositivo: true });
                        
                        if (duelo.modo === 'carrera') {
                            cambioCarrera += bonusGambito;
                        } else {
                            cambioGlobal += bonusGambito;
                        }
                    } else {
                        const penalizacion = Math.floor(puntosBase * SISTEMA_PUNTOS.GAMBITO.PENALIZACION_FALLA);
                        desglose.push({ concepto: '🎲 Penalización (-25%)', valor: penalizacion, esPositivo: false });
                        
                        if (duelo.modo === 'carrera') {
                            cambioCarrera -= penalizacion;
                        } else {
                            cambioGlobal -= penalizacion;
                        }
                    }
                }
                
                cambioGlobal = Math.max(-puntosIniciales, cambioGlobal);
                
                desgloseCompleto[jId] = {
                    ...resultado,
                    puntosIniciales,
                    desglose,
                    cambioGlobal,
                    cambioCarrera,
                    puntosFinal: puntosIniciales + cambioGlobal
                };
                
                // ================================================================
                // PASO 6: ✅✅✅ ACTUALIZAR BD CORRECTAMENTE
                // ================================================================
                
                // 6.1 Puntos globales (SIEMPRE se actualizan)
                await connection.query(
                    `UPDATE usuario 
                    SET puntos = GREATEST(0, puntos + ?)
                    WHERE id_usuario = ?`,
                    [cambioGlobal, jId]
                );
                
                console.log(`[BD]: Usuario ${jId} → Globales: ${cambioGlobal > 0 ? '+' : ''}${cambioGlobal} pts`);
                
                // 6.2 Puntos de carrera (SOLO si modo = carrera Y hay cambio)
                if (duelo.modo === 'carrera' && cambioCarrera !== 0 && idCarrera) {
                    await connection.query(
                        `INSERT INTO usuario_puntos_carrera (id_usuario, id_carrera, puntos)
                        VALUES (?, ?, ?)
                        ON DUPLICATE KEY UPDATE puntos = GREATEST(0, puntos + VALUES(puntos))`,
                        [jId, idCarrera, cambioCarrera]
                    );
                    console.log(`[BD]: Usuario ${jId} → Carrera ${idCarrera}: ${cambioCarrera > 0 ? '+' : ''}${cambioCarrera} pts`);
                }
            }
            
            // ================================================================
            // PASO 7: Registrar en historial
            // ================================================================
            
            const tipoOrigen = duelo.esMatchmaking ? 'matchmaking' : 
                            (duelo.tipo === 'lobby_directo' ? 'lobby' : 'notificacion_bd');
            
            await connection.query(
                `INSERT INTO historial_duelos 
                (id_sala, id_retador, id_defensor, id_ganador, puntos_retador, puntos_defensor,
                 fecha_duelo, id_dificultad, apuesta, tipo_duelo, modo_duelo, id_carrera,
                 total_preguntas, correctas_retador, correctas_defensor,
                 porcentaje_retador, porcentaje_defensor,
                 tiempo_promedio_retador, tiempo_promedio_defensor,
                 racha_maxima_retador, racha_maxima_defensor,
                 puntos_carrera_retador, puntos_carrera_defensor,
                 gambito_activado_retador, gambito_activado_defensor,
                 gambito_exitoso_retador, gambito_exitoso_defensor)
                VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    salaId,
                    jugadorA_id,
                    jugadorB_id,
                    ganadorId,
                    ptsA,
                    ptsB,
                    duelo.dificultad || null,
                    apuesta,
                    duelo.modo,
                    tipoOrigen,
                    idCarrera,
                    duelo.examen.length,
                    resultados[jugadorA_id].respuestasCorrectas,
                    resultados[jugadorB_id].respuestasCorrectas,
                    resultados[jugadorA_id].porcentaje,
                    resultados[jugadorB_id].porcentaje,
                    resultados[jugadorA_id].tiempoPromedio,
                    resultados[jugadorB_id].tiempoPromedio,
                    resultados[jugadorA_id].rachaMaxima,
                    resultados[jugadorB_id].rachaMaxima,
                    desgloseCompleto[jugadorA_id].cambioCarrera || 0,
                    desgloseCompleto[jugadorB_id].cambioCarrera || 0,
                    duelo.jugadores[jugadorA_id].gambitoActivado ? 1 : 0,
                    duelo.jugadores[jugadorB_id].gambitoActivado ? 1 : 0,
                    resultados[jugadorA_id].cumplioGambito ? 1 : 0,
                    resultados[jugadorB_id].cumplioGambito ? 1 : 0
                ]
            );
            
            await connection.commit();
            
            console.log(`[FINALIZAR]: ✅ Duelo ${salaId} completado`);
            
            // ================================================================
            // PASO 8: Respuesta
            // ================================================================
            
            return {
                ganadorId,
                esEmpate,
                puntuaciones: { 
                    [jugadorA_id]: ptsA, 
                    [jugadorB_id]: ptsB 
                },
                apuesta,
                bote,
                recompensaBase,
                modo: duelo.modo,
                idCarrera,
                jugadores: jugadoresIds.map(jId => ({
                    userId: parseInt(jId),
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
     * Validar apuesta (usa puntos globales)
     * @param {Number} idJugadorA 
     * @param {Number} idJugadorB 
     * @param {Number} cantidad 
     * @returns {Object} { valido, mensaje, puntosMaximos }
     */
    static async validarApuesta(idJugadorA, idJugadorB, cantidad) {
        try {
            if (cantidad < SISTEMA_PUNTOS.APUESTA.MIN || 
                cantidad > SISTEMA_PUNTOS.APUESTA.MAX) {
                return {
                    valido: false,
                    mensaje: `La apuesta debe estar entre ${SISTEMA_PUNTOS.APUESTA.MIN} y ${SISTEMA_PUNTOS.APUESTA.MAX} puntos`,
                    puntosMaximos: 0
                };
            }
            
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
                    mensaje: 'Error al consultar puntos',
                    puntosMaximos: 0
                };
            }
            
            const puntosMaximos = Math.min(puntosA.puntos, puntosB.puntos, SISTEMA_PUNTOS.APUESTA.MAX);
            
            if (puntosA.puntos < cantidad || puntosB.puntos < cantidad) {
                return {
                    valido: false,
                    mensaje: `Puntos insuficientes. Máximo: ${puntosMaximos}`,
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
                mensaje: 'Error al validar',
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