// ================================================================
// 🎯 GESTOR DE PUNTUACIÓN CORREGIDO - duelo_puntos.js
// ================================================================

const db = require('../db/conexion');
const { obtenerIdDificultad } = require('./dificultad-helper');

const SISTEMA_PUNTOS = {
    APUESTA: { MIN: 10, MAX: 100, DEFAULT: 20 },
    RECOMPENSA: { facil: 10, normal: 20, dificil: 30 },
    VELOCIDAD: {
        RAPIDA: 0.30,
        NORMAL: 0.20,
        LENTA: 0.10
    },
    BONUS: {
        VICTORIA: 10,
        RENDIMIENTO_EXCELENTE: 20,
        RENDIMIENTO_BUENO: 10,
        RENDIMIENTO_ACEPTABLE: 5,
        RACHA_POR_RESPUESTA: 4
    },
    GAMBITO: { 
        BONUS_EXITO: 0.50,
        PENALIZACION_FALLA: 0.25
    },
    PENALIZACION: { TIMEOUT: -10, ERROR_CRITICO: -20 }
};

class GestorPuntuacion {
    
    /**
     * ✅ CRÍTICO: Calcula puntos DIFERENCIANDO modo y tipo de pregunta
     */
    static calcularPuntosPregunta(respuestaData, preguntaData, modoPartida = 'general') {
        const {
            esCorrecta,
            tiempoRespuesta,
            racha = 0,
            eventoEspecial = null
        } = respuestaData;
        
        const { 
            puntos: puntosGlobalesBase = 100,
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
                    esPositivo: false,
                    tipo: 'global'
                });
            } else {
                desglose.push({ 
                    concepto: '❌ Respuesta Incorrecta', 
                    valor: 0, 
                    esPositivo: false,
                    tipo: 'ninguno'
                });
            }
            
            return {
                puntosGlobales: penalizacion,
                puntosCarrera: 0,
                desglose
            };
        }
        
        // ✅ RESPUESTA CORRECTA
        
        // 1️⃣ Calcular multiplicador de velocidad
        let multVelocidad = SISTEMA_PUNTOS.VELOCIDAD.NORMAL;
        let etiquetaVelocidad = 'Normal';
        
        if (tiempoRespuesta <= 3) {
            multVelocidad = SISTEMA_PUNTOS.VELOCIDAD.RAPIDA;
            etiquetaVelocidad = '⚡ Rápida';
        } else if (tiempoRespuesta >= 6) {
            multVelocidad = SISTEMA_PUNTOS.VELOCIDAD.LENTA;
            etiquetaVelocidad = '🐌 Lenta';
        }
        
        // 2️⃣ ✅✅✅ CRÍTICO: Asignar puntos según el MODO
        let puntosGlobales = 0;
        let puntosCarrera = 0;
        
        if (modoPartida === 'carrera') {
            // MODO CARRERA: Usar campo puntos_carrera
            puntosCarrera = Math.floor(puntosCarreraBase * (1 + multVelocidad));
            
            desglose.push({ 
                concepto: `🎓 Pts Carrera ${etiquetaVelocidad} (${tiempoRespuesta.toFixed(1)}s)`, 
                valor: puntosCarrera,
                esPositivo: true,
                tipo: 'carrera'
            });
            
        } else {
            // MODO GENERAL: Usar campo puntos
            puntosGlobales = Math.floor(puntosGlobalesBase * (1 + multVelocidad));
            
            desglose.push({ 
                concepto: `🌍 Pts Globales ${etiquetaVelocidad} (${tiempoRespuesta.toFixed(1)}s)`, 
                valor: puntosGlobales,
                esPositivo: true,
                tipo: 'global'
            });
        }
        
        // 3️⃣ Bonus de racha
        if (racha > 0) {
            const bonusRacha = racha * SISTEMA_PUNTOS.BONUS.RACHA_POR_RESPUESTA;
            
            if (modoPartida === 'carrera') {
                puntosCarrera += bonusRacha;
                desglose.push({ 
                    concepto: `🔥 Racha x${racha}`, 
                    valor: bonusRacha,
                    esPositivo: true,
                    tipo: 'carrera'
                });
            } else {
                puntosGlobales += bonusRacha;
                desglose.push({ 
                    concepto: `🔥 Racha x${racha}`, 
                    valor: bonusRacha,
                    esPositivo: true,
                    tipo: 'global'
                });
            }
        }
        
        // 4️⃣ Eventos especiales
        if (eventoEspecial && (puntosGlobales + puntosCarrera > 0)) {
            let multiplicador = 1;
            let nombreEvento = '';
            
            if (eventoEspecial === 'rapida') {
                multiplicador = 2;
                nombreEvento = '⚡ Ronda Rápida x2';
            } else if (eventoEspecial === 'critica') {
                multiplicador = 1.5;
                nombreEvento = '🔥 Ronda Crítica x1.5';
            }
            
            if (multiplicador > 1) {
                if (modoPartida === 'carrera') {
                    const bonusEvento = Math.floor(puntosCarrera * (multiplicador - 1));
                    puntosCarrera += bonusEvento;
                    desglose.push({ 
                        concepto: nombreEvento, 
                        valor: bonusEvento,
                        esPositivo: true,
                        tipo: 'carrera'
                    });
                } else {
                    const bonusEvento = Math.floor(puntosGlobales * (multiplicador - 1));
                    puntosGlobales += bonusEvento;
                    desglose.push({ 
                        concepto: nombreEvento, 
                        valor: bonusEvento,
                        esPositivo: true,
                        tipo: 'global'
                    });
                }
            }
        }
        
        return {
            puntosGlobales: Math.max(0, puntosGlobales),
            puntosCarrera: Math.max(0, puntosCarrera),
            desglose
        };
    }
    
    /**
     * ✅ Procesa TODAS las respuestas de un jugador
     */
    static procesarResultadoJugador(jugadorData, preguntasMap, gambito = false, modoPartida = 'general') {
        const { respuestas } = jugadorData;
        
        let puntosGlobalesAcumulados = 0;
        let puntosCarreraAcumulados = 0;
        let respuestasCorrectas = 0;
        let rachaActual = 0;
        let rachaMaxima = 0;
        let tiempoTotal = 0;
        let detallePreguntas = [];
        let cumplioGambito = gambito;
        
        for (let i = 0; i < respuestas.length; i++) {
            const resp = respuestas[i];
            const pregunta = preguntasMap.get(resp.idPregunta);
            
            if (!pregunta) continue;
            
            tiempoTotal += resp.tiempoRespuesta;
            
            if (resp.esCorrecta) {
                rachaActual++;
                rachaMaxima = Math.max(rachaMaxima, rachaActual);
                respuestasCorrectas++;
            } else {
                rachaActual = 0;
                if (gambito) cumplioGambito = false;
            }
            
            const resultado = this.calcularPuntosPregunta({
                esCorrecta: resp.esCorrecta,
                tiempoRespuesta: resp.tiempoRespuesta,
                racha: rachaActual,
                eventoEspecial: resp.eventoEspecial
            }, pregunta, modoPartida);
            
            puntosGlobalesAcumulados += resultado.puntosGlobales;
            puntosCarreraAcumulados += resultado.puntosCarrera;
            
            detallePreguntas.push({
                numero: i + 1,
                idPregunta: resp.idPregunta,
                esCorrecta: resp.esCorrecta,
                tiempo: resp.tiempoRespuesta,
                puntosGlobales: resultado.puntosGlobales,
                puntosCarrera: resultado.puntosCarrera,
                desglose: resultado.desglose
            });
        }
        
        const porcentaje = respuestas.length > 0 
            ? (respuestasCorrectas / respuestas.length) * 100 
            : 0;
        
        const tiempoPromedio = respuestas.length > 0 
            ? tiempoTotal / respuestas.length 
            : 0;
        
        return {
            puntosGlobales: puntosGlobalesAcumulados,
            puntosCarrera: puntosCarreraAcumulados,
            respuestasCorrectas,
            respuestasIncorrectas: respuestas.length - respuestasCorrectas,
            rachaMaxima,
            tiempoPromedio: parseFloat(tiempoPromedio.toFixed(2)),
            porcentaje: parseFloat(porcentaje.toFixed(1)),
            detallePreguntas,
            cumplioGambito
        };
    }
    
    /**
     * ✅✅✅ FINALIZAR DUELO - VERSIÓN CORREGIDA
     */
    static async finalizarDuelo(salaId, duelo) {
        const connection = await db.getConnection();
        
        try {
            await connection.beginTransaction();
            
            console.log('');
            console.log('═══════════════════════════════════════════════════════════');
            console.log(`[FINALIZAR ${salaId}]: 🏁 INICIO`);
            console.log('═══════════════════════════════════════════════════════════');
            
            const jugadoresIds = Object.keys(duelo.jugadores).map(id => parseInt(id));
            const [jugadorA_id, jugadorB_id] = jugadoresIds;
            
            console.log(`[FINALIZAR]: Jugadores: ${jugadorA_id} vs ${jugadorB_id}`);
            console.log(`[FINALIZAR]: Modo: ${duelo.modo}`);
            console.log(`[FINALIZAR]: Apuesta: ${duelo.apuesta || 0} pts`);
            console.log(`[FINALIZAR]: Dificultad: ${duelo.dificultad || 'normal'}`);
            console.log('');
            
            // 1️⃣ Cargar datos de preguntas
            const preguntasIds = duelo.examen.map(p => p.id_pregunta);
            
            const [preguntasData] = await connection.query(
                `SELECT 
                    p.id_pregunta, 
                    COALESCE(p.puntos, 100) as puntos, 
                    COALESCE(p.puntos_carrera, 0) as puntos_carrera,
                    p.id_dificultad,
                    p.id_tematica,
                    p.id_materia
                FROM pregunta p
                WHERE p.id_pregunta IN (?)`,
                [preguntasIds]
            );
            
            const preguntasMap = new Map(
                preguntasData.map(p => [p.id_pregunta, p])
            );
            
            console.log(`[FINALIZAR]: ✅ ${preguntasData.length} preguntas cargadas`);
            
            // 2️⃣ Obtener puntos iniciales
            const [[puntosA]] = await connection.query(
                'SELECT COALESCE(puntos, 0) as puntos FROM usuario WHERE id_usuario = ? FOR UPDATE',
                [jugadorA_id]
            );
            const [[puntosB]] = await connection.query(
                'SELECT COALESCE(puntos, 0) as puntos FROM usuario WHERE id_usuario = ? FOR UPDATE',
                [jugadorB_id]
            );
            
            const puntosInicialesA = parseInt(puntosA.puntos) || 0;
            const puntosInicialesB = parseInt(puntosB.puntos) || 0;
            
            console.log(`[FINALIZAR]: Puntos iniciales - A: ${puntosInicialesA}, B: ${puntosInicialesB}`);
            
            // 3️⃣ Validar apuesta
            const apuesta = parseInt(duelo.apuesta) || 0;
            
            if (apuesta > 0) {
                if (puntosInicialesA < apuesta || puntosInicialesB < apuesta) {
                    await connection.rollback();
                    throw new Error(`ERROR_APUESTA: Puntos insuficientes`);
                }
            }
            
            console.log(`[FINALIZAR]: ✅ Apuesta validada: ${apuesta} pts`);
            console.log('');
            
            // 4️⃣ Procesar respuestas
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
                
                resultados[jId] = this.procesarResultadoJugador(
                    { respuestas: respuestasJugador },
                    preguntasMap,
                    duelo.jugadores[jId].gambitoActivado || false,
                    duelo.modo
                );
                
                console.log(`[FINALIZAR]: Jugador ${jId}:`);
                console.log(`  - Correctas: ${resultados[jId].respuestasCorrectas}/${respuestasJugador.length}`);
                console.log(`  - Pts Globales: ${resultados[jId].puntosGlobales}`);
                console.log(`  - Pts Carrera: ${resultados[jId].puntosCarrera}`);
            }
            
            console.log('');
            
            // 5️⃣ Determinar ganador
            const ptsPartidaA = resultados[jugadorA_id].puntosGlobales + resultados[jugadorA_id].puntosCarrera;
            const ptsPartidaB = resultados[jugadorB_id].puntosGlobales + resultados[jugadorB_id].puntosCarrera;
            
            const esEmpate = ptsPartidaA === ptsPartidaB;
            const ganadorId = esEmpate ? null : (ptsPartidaA > ptsPartidaB ? jugadorA_id : jugadorB_id);
            
            console.log(`[FINALIZAR]: Resultado:`);
            console.log(`  - Jugador A: ${ptsPartidaA} pts`);
            console.log(`  - Jugador B: ${ptsPartidaB} pts`);
            console.log(`  - Ganador: ${ganadorId || 'EMPATE'}`);
            console.log('');
            
            // 6️⃣ Calcular recompensas
            const bote = apuesta * 2;
            const recompensaBase = SISTEMA_PUNTOS.RECOMPENSA[duelo.dificultad] || SISTEMA_PUNTOS.RECOMPENSA.normal;
            
            let idCarrera = duelo.idCarrera || null;
            if (duelo.modo === 'carrera' && !idCarrera) {
                const [[carreraData]] = await connection.query(
                    'SELECT id_carrera FROM usuario_carrera WHERE id_usuario = ? LIMIT 1',
                    [jugadorA_id]
                );
                idCarrera = carreraData?.id_carrera || null;
            }
            
            const desgloseCompleto = {};
            
            for (const jId of jugadoresIds) {
                const esGanador = !esEmpate && jId === ganadorId;
                const esPerdedor = !esEmpate && jId !== ganadorId;
                const resultado = resultados[jId];
                const puntosIniciales = jId === jugadorA_id ? puntosInicialesA : puntosInicialesB;
                
                let desglose = [];
                let cambioGlobal = 0;
                let cambioCarrera = 0;
                
                // 1. Puntos de preguntas
                if (duelo.modo === 'carrera') {
                    cambioCarrera += resultado.puntosCarrera;
                    desglose.push({
                        concepto: '🎓 Puntos de Preguntas (Carrera)',
                        valor: resultado.puntosCarrera,
                        esPositivo: true,
                        tipo: 'carrera'
                    });
                } else {
                    cambioGlobal += resultado.puntosGlobales;
                    desglose.push({
                        concepto: '🌍 Puntos de Preguntas (Globales)',
                        valor: resultado.puntosGlobales,
                        esPositivo: true,
                        tipo: 'global'
                    });
                }
                
                // 2. Bonus de rendimiento (SIEMPRE GLOBAL)
                let bonusRendimiento = 0;
                const porcentaje = resultado.porcentaje;
                
                if (porcentaje >= 90) {
                    bonusRendimiento = SISTEMA_PUNTOS.BONUS.RENDIMIENTO_EXCELENTE;
                } else if (porcentaje >= 75) {
                    bonusRendimiento = SISTEMA_PUNTOS.BONUS.RENDIMIENTO_BUENO;
                } else if (porcentaje >= 50) {
                    bonusRendimiento = SISTEMA_PUNTOS.BONUS.RENDIMIENTO_ACEPTABLE;
                }
                
                if (bonusRendimiento > 0) {
                    desglose.push({
                        concepto: `⭐ Bonus Rendimiento (${porcentaje.toFixed(1)}%)`,
                        valor: bonusRendimiento,
                        esPositivo: true,
                        tipo: 'global'
                    });
                    cambioGlobal += bonusRendimiento;
                }
                
                // 3. Resultado del duelo (SIEMPRE AFECTA GLOBALES)
                if (esGanador) {
                    desglose.push({ 
                        concepto: '🎰 Bote (Ganador)', 
                        valor: bote, 
                        esPositivo: true,
                        tipo: 'global'
                    });
                    desglose.push({ 
                        concepto: '💎 Recompensa Base', 
                        valor: recompensaBase, 
                        esPositivo: true,
                        tipo: 'global'
                    });
                    desglose.push({ 
                        concepto: '👑 Bonus Victoria', 
                        valor: SISTEMA_PUNTOS.BONUS.VICTORIA, 
                        esPositivo: true,
                        tipo: 'global'
                    });
                    
                    cambioGlobal += bote + recompensaBase + SISTEMA_PUNTOS.BONUS.VICTORIA;
                    
                } else if (esEmpate) {
                    desglose.push({ 
                        concepto: '🤝 Devolución Apuesta', 
                        valor: apuesta, 
                        esPositivo: true,
                        tipo: 'global'
                    });
                    const recompensaEmpate = Math.floor(recompensaBase / 2);
                    desglose.push({ 
                        concepto: '💰 Recompensa Empate', 
                        valor: recompensaEmpate, 
                        esPositivo: true,
                        tipo: 'global'
                    });
                    
                    cambioGlobal += apuesta + recompensaEmpate;
                    
                } else if (esPerdedor) {
                    desglose.push({ 
                        concepto: '💔 Pérdida Apuesta', 
                        valor: -apuesta, 
                        esPositivo: false,
                        tipo: 'global'
                    });
                    
                    cambioGlobal -= apuesta;
                }
                
                // 4. Gambito
                if (duelo.jugadores[jId].gambitoActivado) {
                    const puntosBase = duelo.modo === 'carrera' 
                        ? resultado.puntosCarrera 
                        : resultado.puntosGlobales;
                    
                    if (resultado.cumplioGambito) {
                        const bonusGambito = Math.floor(puntosBase * SISTEMA_PUNTOS.GAMBITO.BONUS_EXITO);
                        
                        if (duelo.modo === 'carrera') {
                            desglose.push({ 
                                concepto: '🎲 Gambito Exitoso (+50%)', 
                                valor: bonusGambito, 
                                esPositivo: true,
                                tipo: 'carrera'
                            });
                            cambioCarrera += bonusGambito;
                        } else {
                            desglose.push({ 
                                concepto: '🎲 Gambito Exitoso (+50%)', 
                                valor: bonusGambito, 
                                esPositivo: true,
                                tipo: 'global'
                            });
                            cambioGlobal += bonusGambito;
                        }
                        
                    } else {
                        const penalizacion = Math.floor(puntosBase * SISTEMA_PUNTOS.GAMBITO.PENALIZACION_FALLA);
                        
                        if (duelo.modo === 'carrera') {
                            desglose.push({ 
                                concepto: '🎲 Gambito Fallido (-25%)', 
                                valor: -penalizacion, 
                                esPositivo: false,
                                tipo: 'carrera'
                            });
                            cambioCarrera -= penalizacion;
                        } else {
                            desglose.push({ 
                                concepto: '🎲 Gambito Fallido (-25%)', 
                                valor: -penalizacion, 
                                esPositivo: false,
                                tipo: 'global'
                            });
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
            }
            
            // 7️⃣ Actualizar base de datos
            for (const jId of jugadoresIds) {
                const { cambioGlobal, cambioCarrera } = desgloseCompleto[jId];
                
                await connection.query(
                    `UPDATE usuario SET puntos = GREATEST(0, puntos + ?) WHERE id_usuario = ?`,
                    [cambioGlobal, jId]
                );
                
                if (duelo.modo === 'carrera' && cambioCarrera !== 0 && idCarrera) {
                    await connection.query(
                        `INSERT INTO usuario_puntos_carrera (id_usuario, id_carrera, puntos)
                        VALUES (?, ?, ?)
                        ON DUPLICATE KEY UPDATE puntos = GREATEST(0, puntos + VALUES(puntos))`,
                        [jId, idCarrera, cambioCarrera]
                    );
                }
            }
            const idDificultad = obtenerIdDificultad(duelo.dificultad);

            // 8️⃣ Registrar historial
            await connection.query(
                `INSERT INTO historial_duelos 
                (id_sala, id_retador, id_defensor, id_ganador, 
                 puntos_retador, puntos_defensor,
                 fecha_duelo, id_dificultad, apuesta, 
                 tipo_duelo, modo_duelo, id_carrera,
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
                    ptsPartidaA,
                    ptsPartidaB,
                    idDificultad,
                    apuesta,
                    duelo.esMatchmaking ? 'matchmaking' : (duelo.tipo === 'lobby_directo' ? 'lobby' : 'notificacion_bd'),
                    duelo.modo,
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
            
            console.log('[FINALIZAR]: ✅ Transacción exitosa');
            console.log('═══════════════════════════════════════════════════════════');
            
            // 9️⃣ Retornar resultado estructurado
            return {
                ganadorId,
                esEmpate,
                modo: duelo.modo,
                idCarrera: idCarrera,
                apuesta,
                bote,
                recompensaBase,
                jugadores: jugadoresIds.map(jId => {
                    const resultado = resultados[jId];
                    const detalles = desgloseCompleto[jId];
                    
                    return {
                        userId: parseInt(jId),
                        username: duelo.jugadores[jId].username,
                        foto_perfil: duelo.jugadores[jId].foto_perfil || '/uploads/default_avatar.png',
                        
                        // ✅ CAMPOS DE PUNTOS
                        puntosGlobales: resultado.puntosGlobales,
                        puntosCarrera: resultado.puntosCarrera,
                        
                        // ✅✅✅ AGREGAR ESTOS CAMPOS FALTANTES:
                        cambioGlobal: detalles.cambioGlobal,
                        cambioCarrera: detalles.cambioCarrera,
                        
                        puntosIniciales: detalles.puntosIniciales,  // ← AGREGADO
                        puntosFinal: detalles.puntosFinal,          // ← AGREGADO
                        
                        // ✅ ESTADÍSTICAS
                        respuestasCorrectas: resultado.respuestasCorrectas,
                        respuestasIncorrectas: resultado.respuestasIncorrectas,
                        porcentaje: resultado.porcentaje,
                        rachaMaxima: resultado.rachaMaxima,
                        tiempoPromedio: resultado.tiempoPromedio,
                        
                        // ✅ GAMBITO
                        gambitoActivado: duelo.jugadores[jId].gambitoActivado || false,
                        cumplioGambito: resultado.cumplioGambito,
                        
                        // ✅ DESGLOSE
                        desglose: detalles.desglose
                    };
                })
            };
            
        } catch (error) {
            await connection.rollback();
            console.error('');
            console.error('═══════════════════════════════════════════════════════════');
            console.error('[FINALIZAR ERROR]: ❌ ERROR EN TRANSACCIÓN');
            console.error('═══════════════════════════════════════════════════════════');
            console.error('Mensaje:', error.message);
            console.error('Stack:', error.stack);
            console.error('═══════════════════════════════════════════════════════════');
            throw error;
        } finally {
            connection.release();
        }
    }
    
    /**
     * ✅ Validar que ambos jugadores tengan puntos para apostar
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
                'SELECT COALESCE(puntos, 0) as puntos FROM usuario WHERE id_usuario = ?',
                [idJugadorA]
            );
            const [[puntosB]] = await db.query(
                'SELECT COALESCE(puntos, 0) as puntos FROM usuario WHERE id_usuario = ?',
                [idJugadorB]
            );
            
            if (!puntosA || !puntosB) {
                return {
                    valido: false,
                    mensaje: 'Error al consultar puntos de los jugadores',
                    puntosMaximos: 0
                };
            }
            
            const puntosMaximos = Math.min(
                parseInt(puntosA.puntos) || 0, 
                parseInt(puntosB.puntos) || 0, 
                SISTEMA_PUNTOS.APUESTA.MAX
            );
            
            if ((puntosA.puntos || 0) < cantidad || (puntosB.puntos || 0) < cantidad) {
                return {
                    valido: false,
                    mensaje: `Puntos insuficientes. Máximo posible: ${puntosMaximos} pts`,
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

module.exports = {
    GestorPuntuacion,
    SISTEMA_PUNTOS
};