
// CONFIGURACIÓN INICIAL Y VARIABLES GLOBALES
// ================================================================
const socket = io();
const user = window.USER_DATA;
const urlParams = new URLSearchParams(window.location.search);
const desdeNotificacion = urlParams.get('origen') === 'notificacion';

// ================================================================
// 🔄 HANDLER: Detectar que se requiere reconexión
// ================================================================

socket.on('duelo:requiereReconexion', async ({ salaId, mensaje }) => {
    console.log('[CLIENTE]: 🔄 Reconexión requerida');
    console.log(`   - SalaId: ${salaId}`);
    
    statusText.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${mensaje}`;
    
    // Esperar 1 segundo y ejecutar reconexión
    await new Promise(r => setTimeout(r, 1000));
    
    console.log('[CLIENTE]: 📡 Emitiendo duelo:intentarReconexion...');
    
    socket.emit('duelo:intentarReconexion', {
        salaId: salaId,
        userId: user.id_usuario
    });
});

let salaId = null;
let salaActual = null;
let oponente = null;
let cronometroInterval = null;
let preguntaActualId = null;
let socketRegistrado = false;
let gambitoActivado = false;
let miPowerUp = null;
let escudoActivo = false;
let modoActualSala = null; // Variable global para trackear el modo de la sala actual
let dueloPausado = false;
let timerPausado = null;
let intentandoSalir = false;
let dueloActivo = false;
let modoActualDuelo = null; // 'general' o 'carrera'
let motivoSalida = null;        // ✅ NUEVO: Rastrear motivo exacto de salida
let botonesHabilitados = true;
let idCarreraActual = null;

// ✅ ESTADO DE NEGOCIACIÓN
let estadoNegociacion = {
    activa: false,
    rondaActual: 1,
    propuestaActual: null,
    esProponente: false,
    tiempoRestante: 60,
    intervalTimer: null,
    quieroApostar: false
};

// Elementos del DOM
const matchmakingView = document.getElementById('matchmakingView');
const dueloView = document.getElementById('dueloView');
const btnBuscarCarrera = document.getElementById('btnBuscarCarrera');
const btnBuscarGeneral = document.getElementById('btnBuscarGeneral');
const btnCancelarBusqueda = document.getElementById('btnCancelarBusqueda');
const statusText = document.getElementById('statusText');
const modalDificultad = document.getElementById('modalDificultad');
const draftContainer = document.getElementById('draftContainer');
const arenaContainer = document.getElementById('arenaContainer');
const materiasGrid = document.getElementById('materiasGrid');
const btnGambito = document.getElementById('btnGambito');
const textoPregunta = document.getElementById('textoPregunta');
const opcionesContainer = document.getElementById('opcionesContainer');
const cronometroEl = document.getElementById('cronometro');
const tuRachaEl = document.getElementById('tuRacha');
const oponenteRachaEl = document.getElementById('oponenteRacha');
const tuPowerUpEl = document.getElementById('tuPowerUp');
const btnUsarPowerUp = document.getElementById('btnUsarPowerUp');
const apuestaActualEl = document.getElementById('apuestaActual');
const dificultadActualEl = document.getElementById('dificultadActual');

// ✅ NUEVOS ELEMENTOS
const btnQuieroApostar = document.getElementById('btnQuieroApostar');
const negociacionContainer = document.getElementById('negociacionApuestaContainer');


// ================================================================
// ✅ BOTÓN "QUIERO APOSTAR"
// ================================================================
btnQuieroApostar.addEventListener('click', async () => {
            const puntosUsuario = parseInt(document.getElementById('puntosUsuario').textContent);
            
            // ✅ Validación con notificación bonita
            if (puntosUsuario < 10) {
                mostrarNotificacionAdvertencia(
                    '⚠️ Puntos Insuficientes',
                    `Necesitas al menos <strong>10 puntos</strong> para poder apostar.<br>Actualmente tienes <strong>${puntosUsuario} puntos</strong>.`,
                    'warning'
                );
                return;
            }
            
            estadoNegociacion.quieroApostar = !estadoNegociacion.quieroApostar;
            
            if (estadoNegociacion.quieroApostar) {
                btnQuieroApostar.classList.add('activo');
                btnQuieroApostar.innerHTML = '<i class="fas fa-check-circle"></i> APUESTA ACTIVADA';
                btnQuieroApostar.disabled = true; // Evitar múltiples clicks
                mostrarNotificacion('✅ Apuesta activada. Esperando respuesta del oponente...', 'success');
                
                // 🔔 NOTIFICAR AL OPONENTE QUE QUIERES APOSTAR
                socket.emit('duelo:notificarQuieroApostar', {
                    salaId: salaActual || salaId,
                    userId: user.id_usuario,
                    username: user.username,
                    foto_perfil: user.foto_perfil
                });
                
            } else {
                btnQuieroApostar.classList.remove('activo');
                btnQuieroApostar.innerHTML = '💰 QUIERO APOSTAR';
                btnQuieroApostar.disabled = false;
                mostrarNotificacion('❌ Apuesta desactivada', 'info');
                
                // Notificar que cancelaste
                socket.emit('duelo:cancelarQuieroApostar', {
                    salaId: salaActual || salaId,
                    userId: user.id_usuario
                });
            }
        });

// ================================================================
// REGISTRO DE SOCKET
// ================================================================
socket.userId = user?.id_usuario ? parseInt(user.id_usuario) : null;

if (user?.id_usuario) {
    console.log('[SOCKET]: Registrando usuario...');
    socket.emit('usuario:registrar', user.id_usuario);
    socket.emit('competitivo:entrarPortal', user.id_usuario);
    
    setTimeout(() => {
        socketRegistrado = true;
        console.log('[SOCKET]: ✅ Usuario registrado');
    }, 500);
}


socket.on('sala:modoDetectado', ({ modo, idCarrera }) => {
    console.log('[SALA]: Modo detectado por servidor:', modo);
    console.log('[SALA]: ID Carrera:', idCarrera || 'N/A');
    
    // ✅ GUARDAR MODO ACTUAL GLOBALMENTE
    modoActualDuelo = modo;
    idCarreraActual = idCarrera || null;
    
    const modoTexto = modo === 'carrera' ? '🎓 Duelo de Carrera' : '🌍 Duelo General';
    const modoColor = modo === 'carrera' ? '#3b82f6' : '#10b981';
    
    // Crear indicador visual del modo
    const indicadorModo = document.getElementById('indicadorModo') || document.createElement('div');
    indicadorModo.id = 'indicadorModo';
    indicadorModo.style.cssText = `
        position: fixed;
        top: 20px;
        left: 20px;
        background: ${modoColor};
        color: white;
        padding: 12px 24px;
        border-radius: 10px;
        font-weight: bold;
        font-size: 14px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 1000;
        animation: slideInLeft 0.3s ease;
    `;
    indicadorModo.textContent = modoTexto;
    
    if (!document.getElementById('indicadorModo')) {
        document.body.appendChild(indicadorModo);
    }
    
    console.log(`[MODO]: ✅ Modo actual guardado: ${modo}`);
});

// ================================================================
// LISTENERS DE SALA
// ================================================================
socket.on('sala:conectado', (data) => {
    console.log('[SALA]: ✅ Conectado:', data.mensaje);
    statusText.innerHTML = `<i class="fas fa-check-circle"></i> ${data.mensaje}`;
    salaActual = data.salaId;
});

window.addEventListener('beforeunload', (e) => {
    if (dueloActivo && !intentandoSalir) {
        // ✅ Informar al servidor INMEDIATAMENTE
        socket.emit('duelo:abandonoRapido', {
            salaId: salaActual || salaId,
            userId: user.id_usuario
        });
        
        // Mostrar advertencia
        e.preventDefault();
        e.returnValue = '';
    }
});
socket.on('sala:error', (data) => {
    console.error('[SALA ERROR]:', data.mensaje);
    statusText.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${data.mensaje}`;
    btnCancelarBusqueda.textContent = 'Volver al Portal';
    
    setTimeout(() => {
        window.location.href = '/matchmaking';
    }, 3000);
});
socket.on('duelo:pausado', ({ mensaje, bloqueado }) => {
    console.log('[DUELO PAUSADO]:', mensaje);
    
    dueloPausado = true;
    
    // ✅ DETENER CRONÓMETRO VISUAL
    if (cronometroInterval) {
        clearInterval(cronometroInterval);
        cronometroInterval = null;
    }
    
    // ✅ DESHABILITAR BOTONES DE OPCIONES
    deshabilitarBotones(true);
    
    // ✅ MOSTRAR OVERLAY DE PAUSA
    mostrarOverlayPausa(mensaje);
    
    console.log('[DUELO]: ⏸️ Duelo pausado - Esperando reconexión');
});

// ================================================================
// ✅ LISTENER: DUELO REANUDADO (Reconexión exitosa)
// ================================================================

socket.on('duelo:reanudado', ({ mensaje, bloqueado, tiempoRestante }) => {
    console.log('[DUELO REANUDADO]:', mensaje);
    
    dueloPausado = false;
    
    // ✅ OCULTAR OVERLAY
    ocultarOverlayPausa();
    
    // ✅ HABILITAR BOTONES
    deshabilitarBotones(false);
    
    // ✅ REANUDAR CRONÓMETRO SI HAY TIEMPO RESTANTE
    if (tiempoRestante && tiempoRestante > 0) {
        reanudarCronometro(tiempoRestante);
    }
    
    mostrarNotificacion('▶️ Duelo reanudado', 'success');
    
    console.log('[DUELO]: ▶️ Duelo reanudado');
});

// ================================================================
// ✅ LISTENER: ESTADO ACTUAL (Después de reconectar)
// ================================================================

// ================================================================
// ✅ AGREGAR: Handler para estado actual con pregunta
// Línea ~900 aproximadamente
// ================================================================

socket.on('duelo:estadoActual', (data) => {
    console.log('[ESTADO ACTUAL]:', data);
    
    const {
        estado,
        preguntaActual,
        totalPreguntas,
        puntuaciones,
        rachas,
        oponente,
        apuesta,
        modo,
        bloqueado,
        mensaje,
        fueRestaurado
    } = data;
    
    // ✅ ACTUALIZAR UI
    document.getElementById('puntuacionTuya').textContent = puntuaciones[user.id_usuario] || 0;
    document.getElementById('puntuacionOponente').textContent = puntuaciones[oponente.username] || 0;
    
    tuRachaEl.textContent = `🔥 x${rachas[user.id_usuario] || 0}`;
    oponenteRachaEl.textContent = `🔥 x${rachas[oponente.username] || 0}`;
    
    apuestaActualEl.textContent = apuesta > 0 ? `🎰 Bote: ${apuesta * 2} pts` : '🎮 Sin apuesta';
    
    // ✅✅✅ SI HAY PREGUNTA ACTIVA, RENDERIZARLA
    if (data.preguntaActual && data.preguntaActual.pregunta) {
        const { pregunta, opciones, numeroPregunta, tiempoRestante } = data.preguntaActual;
        
        console.log('[ESTADO ACTUAL]: Renderizando pregunta restaurada');
        
        textoPregunta.textContent = pregunta.pregunta;
        document.getElementById('numeroPregunta').textContent = `Pregunta ${numeroPregunta} / ${totalPreguntas}`;
        opcionesContainer.innerHTML = '';
        
        opciones.forEach(opcion => {
            const btn = document.createElement('button');
            btn.className = 'opcion-btn';
            btn.textContent = opcion.respuesta;
            
            btn.onclick = () => {
                if (dueloPausado || !botonesHabilitados) return;
                
                const tiempoRespuesta = (Date.now() - Date.now()) / 1000; // Aproximado
                
                opcionesContainer.querySelectorAll('button').forEach(b => b.disabled = true);
                btn.classList.add('seleccionada-jugador');
                
                socket.emit('duelo:responder', {
                    salaId: salaActual || salaId,
                    userId: user.id_usuario,
                    idPregunta: pregunta.id_pregunta,
                    idRespuesta: opcion.id_respuesta,
                    tiempoRespuesta: tiempoRespuesta
                });
            };
            
            opcionesContainer.appendChild(btn);
        });
        
        // ✅ Iniciar cronómetro con tiempo restante
        if (cronometroInterval) clearInterval(cronometroInterval);
        
        let tiempo = tiempoRestante || 10;
        cronometroEl.textContent = tiempo;
        
        cronometroInterval = setInterval(() => {
            if (dueloPausado) return;
            
            tiempo--;
            cronometroEl.textContent = tiempo;
            
            if (tiempo <= 0) {
                clearInterval(cronometroInterval);
            }
        }, 1000);
    }
    
    // ✅ SI ESTÁ BLOQUEADO, MOSTRAR OVERLAY
    if (bloqueado) {
        mostrarOverlayPausa('⏸️ Duelo pausado - Esperando al otro jugador...');
        deshabilitarBotones(true);
    } else {
        ocultarOverlayPausa();
        deshabilitarBotones(false);
    }
    
    mostrarNotificacion(mensaje, 'success');
    
    console.log('[ESTADO ACTUAL]: ✅ UI actualizada completamente');
});

// ================================================================
// ✅ LISTENER: OPONENTE SE DESCONECTÓ
// ================================================================

socket.on('duelo:oponenteDesconectado', (data) => {
    console.log('[OPONENTE DESCONECTADO]:', data);
    
    const indicador = document.getElementById('indicadorDesconexion');
    const nombreOponente = document.getElementById('nombreOponenteDesconectado');
    const tiempoRestante = document.getElementById('tiempoRestanteReconexion');
    
    nombreOponente.textContent = data.username || 'Oponente';
    
    // Mostrar indicador
    indicador.classList.add('visible');
    
    // ✅ Convertir milisegundos a segundos
    let segundos = Math.floor((data.tiempoEspera || 60000) / 1000);
    tiempoRestante.textContent = segundos;
    
    const countdown = setInterval(() => {
        segundos--;
        tiempoRestante.textContent = segundos;
        
        if (segundos <= 0) {
            clearInterval(countdown);
        }
    }, 1000);
    
    // Guardar referencia para limpiarlo si reconecta
    window.countdownDesconexion = countdown;
});

// ================================================================
// ✅ LISTENER: OPONENTE SE RECONECTÓ
// ================================================================

socket.on('duelo:oponenteReconectado', (data) => {
    console.log('[OPONENTE RECONECTADO]:', data);
    
    // ✅ OCULTAR INDICADOR
    const indicador = document.getElementById('indicadorDesconexion');
    indicador.classList.remove('visible');
    
    // ✅ LIMPIAR COUNTDOWN
    if (window.countdownDesconexion) {
        clearInterval(window.countdownDesconexion);
        window.countdownDesconexion = null;
    }
    
    // ✅ MOSTRAR NOTIFICACIÓN
    const notif = document.getElementById('notificacionReconexion');
    const mensajeReconexion = document.getElementById('mensajeReconexion');
    
    mensajeReconexion.textContent = data.mensaje || 'Continuando duelo...';
    notif.classList.add('visible');
    
    // ✅ OCULTAR DESPUÉS DE 3 SEGUNDOS
    setTimeout(() => {
        notif.classList.remove('visible');
    }, 3000);
});

// ================================================================
// 🆕 FUNCIONES AUXILIARES
// ================================================================

function mostrarOverlayPausa(mensaje) {
    let overlay = document.getElementById('overlayPausa');
    
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'overlayPausa';
        overlay.className = 'overlay-pausa';
        overlay.innerHTML = `
            <div class="overlay-pausa-content">
                <div class="spinner-pausa"></div>
                <h2>⏸️ Duelo Pausado</h2>
                <p id="mensajePausa">${mensaje}</p>
            </div>
        `;
        document.body.appendChild(overlay);
    } else {
        document.getElementById('mensajePausa').textContent = mensaje;
    }
    
    overlay.classList.add('visible');
}

function ocultarOverlayPausa() {
    const overlay = document.getElementById('overlayPausa');
    if (overlay) {
        overlay.classList.remove('visible');
    }
}

function deshabilitarBotones(deshabilitar) {
    botonesHabilitados = !deshabilitar;
    
    // ✅ DESHABILITAR/HABILITAR BOTONES DE OPCIONES
    const botones = opcionesContainer.querySelectorAll('button');
    botones.forEach(btn => {
        btn.disabled = deshabilitar;
        if (deshabilitar) {
            btn.style.opacity = '0.5';
            btn.style.cursor = 'not-allowed';
        } else {
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
        }
    });
    
    // ✅ DESHABILITAR POWER-UPS
    if (btnUsarPowerUp) {
        btnUsarPowerUp.disabled = deshabilitar;
    }
}

function reanudarCronometro(tiempoRestante) {
    if (cronometroInterval) {
        clearInterval(cronometroInterval);
    }
    
    let tiempo = tiempoRestante;
    cronometroEl.textContent = tiempo;
    
    cronometroInterval = setInterval(() => {
        tiempo--;
        cronometroEl.textContent = tiempo;
        
        if (tiempo <= 0) {
            clearInterval(cronometroInterval);
        }
    }, 1000);
}
// ================================================================
// DUELO: Información inicial
// ================================================================
socket.on('duelo:informacionInicial', ({ apuesta, bote, recompensaBase, dificultad }) => {
    console.log('[DUELO]: Info inicial recibida');
    apuestaActualEl.textContent = apuesta > 0 ? `🎰 Bote: ${bote} pts` : '🎮 Sin apuesta';
    dificultadActualEl.textContent = `📊 Dificultad: ${dificultad || 'Normal'}`;
});

// ================================================================
// DUELO: Listo para iniciar
// ================================================================
// ================================================================
// 🎧 LISTENER: DUELO LISTO (Activar protección)
// ================================================================

socket.on('duelo:dueloListo', ({ salaId }) => {
    console.log('[DUELO]: ✅ Duelo listo!');
    statusText.innerHTML = '<i class="fas fa-swords"></i> ¡Duelo listo! Entrando a la arena...';
    btnCancelarBusqueda.style.display = 'none';
    
    // ✅ ACTIVAR ESTADO DE DUELO DESPUÉS DE 2 SEGUNDOS
    setTimeout(() => {
        actualizarEstadoDuelo(true, { salaId });
    }, 2000);
    
    setTimeout(() => {
        matchmakingView.style.opacity = '0';
        
        setTimeout(() => {
            matchmakingView.style.display = 'none';
            dueloView.style.display = 'flex';
            
            socket.emit('duelo:clienteListo', { 
                salaId, 
                userId: user.id_usuario 
            });
            
            setTimeout(() => {
                dueloView.style.opacity = '1';
            }, 100);
        }, 500);
    }, 1500);
});

// ================================================================
// DUELO: Info del oponente
// ================================================================
socket.on('duelo:oponenteInfo', ({ oponenteId, oponente: oponenteData }) => {
    console.log('[DUELO]: Oponente:', oponenteData.username);
    document.getElementById('oponenteUsername').textContent = oponenteData.username;
    document.getElementById('oponenteAvatar').src = oponenteData.foto_perfil || '/uploads/default_avatar.png';
    oponente = { ...oponenteData, id_usuario: oponenteId };
});

// ================================================================
// DRAFT: Selección de categorías
// ================================================================
socket.on('duelo:iniciarMiniDraft', ({ categorias, permitirGambito }) => {
    console.log('[DRAFT]: Recibidas', categorias.length, 'categorías');
    console.log('[DRAFT]: Modo actual de sala:', modoActualSala || 'sin definir');
    
    // ✅ VERIFICACIÓN: Las categorías deben coincidir con el modo
    if (categorias && categorias.length > 0) {
        const primeraCat = categorias[0];
        console.log('[DRAFT]: Primera categoría:', primeraCat);
        
        // Si es modo carrera, debe tener id_tematica
        // Si es modo general, debe tener id_materia
        if (modoActualSala === 'carrera' && !primeraCat.id_tematica && primeraCat.id) {
            console.log('[DRAFT]: ✅ Categorías de CARRERA (tematicas)');
        } else if (modoActualSala === 'general' && !primeraCat.id_carrera) {
            console.log('[DRAFT]: ✅ Categorías GENERALES (materias)');
        }
    }
    
    document.getElementById('draftTitle').textContent = "ELIGE TU CAMPO DE BATALLA";
    document.getElementById('draftInstruction').textContent = "Selecciona una categoría y decide si quieres apostar.";
    materiasGrid.innerHTML = '';

    if (permitirGambito) {
        document.getElementById('gambitoContainer').style.display = 'block';
    }

    categorias.forEach(categoria => {
        const card = document.createElement('div');
        card.className = 'materia-card';
        card.dataset.id = categoria.id;
        card.textContent = categoria.descripcion;
        
        card.onclick = () => {
            document.querySelectorAll('.materia-card').forEach(c => {
                c.onclick = null;
                if (c !== card) c.classList.add('deshabilitada');
            });
            card.classList.add('seleccionada');
            document.getElementById('draftInstruction').textContent = "Esperando oponente...";
            
            socket.emit('duelo:seleccionarCategoria', { 
                salaId: salaActual || salaId, 
                userId: user.id_usuario, 
                idCategoria: categoria.id,
                gambitoActivado: gambitoActivado,
                quiereApostar: estadoNegociacion.quieroApostar
            });
        };
        
        materiasGrid.appendChild(card);
    });
});
// Botón de Gambito
btnGambito.addEventListener('click', () => {
    gambitoActivado = !gambitoActivado;
    
    if (gambitoActivado) {
        btnGambito.classList.add('activo');
        btnGambito.innerHTML = '<i class="fas fa-dice"></i> GAMBITO ACTIVADO';
    } else {
        btnGambito.classList.remove('activo');
        btnGambito.innerHTML = '<i class="fas fa-dice"></i> ACTIVAR GAMBITO';
    }
});

setInterval(() => {
    if (modoActualSala) {
        console.log('[DEBUG]: Modo actual de sala:', modoActualSala);
    }
}, 30000); // Cada 30 segundos
socket.on('duelo:oponenteSelecciono', ({ gambitoActivado, quiereApostar }) => {
    if (gambitoActivado) {
        console.log('[DRAFT]: ⚠️ El oponente activó GAMBITO');
    }
    if (quiereApostar) {
        console.log('[DRAFT]: 💰 El oponente también quiere apostar');
    }
});

// ================================================================
// ✅ INICIAR NEGOCIACIÓN DE APUESTA
// ================================================================
socket.on('duelo:iniciarNegociacionApuesta', ({ esProponente, oponente, puntosMaximos }) => {
            console.log('[NEGOCIACIÓN]: Iniciando - Proponente:', esProponente);
            
            estadoNegociacion.activa = true;
            estadoNegociacion.esProponente = esProponente;
            estadoNegociacion.rondaActual = 1;
            
            // NO ocultar materias, solo deshabilitarlas visualmente
            materiasGrid.style.pointerEvents = 'none';
            materiasGrid.style.opacity = '0.5';
            materiasGrid.style.filter = 'blur(2px)';
            
            // Mostrar contenedor de negociación con animación
            negociacionContainer.style.display = 'block';
            document.getElementById('maxApuesta').textContent = puntosMaximos;
            document.getElementById('rondaNegociacion').textContent = '1';
            
            if (esProponente) {
                // Mostrar interfaz para proponer
                document.getElementById('tuTurno').style.display = 'block';
                document.getElementById('propuestaActual').style.display = 'none';
                document.getElementById('esperandoRespuesta').style.display = 'none';
                document.getElementById('responderPropuesta').style.display = 'none';
                
                mostrarNotificacion('💰 Es tu turno de proponer una apuesta', 'info');
            } else {
                // Esperar propuesta del oponente
                document.getElementById('tuTurno').style.display = 'none';
                document.getElementById('propuestaActual').style.display = 'flex';
                document.getElementById('esperandoRespuesta').style.display = 'none';
                document.getElementById('responderPropuesta').style.display = 'none';
                
                document.getElementById('avatarProponente').src = oponente.foto_perfil || '/uploads/default_avatar.png';
                document.getElementById('textoProponente').textContent = `${oponente.username} está pensando...`;
                document.getElementById('cantidadPropuesta').textContent = '💭';
                
                mostrarNotificacion(`⏳ Esperando propuesta de ${oponente.username}`, 'info');
            }
            
            iniciarTimerNegociacion();
        });

// ================================================================
// ✅ RECIBIR PROPUESTA DE APUESTA
// ================================================================
socket.on('duelo:recibirPropuestaApuesta', ({ cantidad, proponente, ronda }) => {
            console.log('[NEGOCIACIÓN]: Propuesta recibida:', cantidad, 'pts');
            
            estadoNegociacion.propuestaActual = cantidad;
            estadoNegociacion.rondaActual = ronda;
            
            document.getElementById('rondaNegociacion').textContent = ronda;
            document.getElementById('avatarProponente').src = proponente.foto_perfil || '/uploads/default_avatar.png';
            document.getElementById('textoProponente').textContent = `${proponente.username} propone apostar:`;
            document.getElementById('cantidadPropuesta').textContent = `${cantidad} pts`;
            
            // Mostrar opciones para responder
            document.getElementById('propuestaActual').style.display = 'flex';
            document.getElementById('tuTurno').style.display = 'none';
            document.getElementById('esperandoRespuesta').style.display = 'none';
            document.getElementById('responderPropuesta').style.display = 'block';
            
            mostrarNotificacion(`💰 ${proponente.username} propone ${cantidad} puntos`, 'info');
        });

// ================================================================
// ✅ ENVIAR PROPUESTA
// ================================================================
document.getElementById('btnEnviarPropuesta').addEventListener('click', () => {
            const cantidad = parseInt(document.getElementById('inputCantidadCustom').value);
            const puntosUsuario = parseInt(document.getElementById('puntosUsuario').textContent);
            const maxApuesta = parseInt(document.getElementById('maxApuesta').textContent);
            
            // Validaciones
            if (isNaN(cantidad) || cantidad < 10) {
                mostrarNotificacion('⚠️ La apuesta mínima es de 10 puntos', 'error');
                return;
            }
            
            if (cantidad > maxApuesta) {
                mostrarNotificacion(`⚠️ La apuesta máxima es de ${maxApuesta} puntos`, 'error');
                return;
            }
            
            if (cantidad > puntosUsuario) {
                mostrarNotificacion('⚠️ No tienes suficientes puntos para esta apuesta', 'error');
                return;
            }
            
            console.log('[NEGOCIACIÓN]: Enviando propuesta de', cantidad, 'puntos');
            
            socket.emit('duelo:propuestaApuesta', {
                salaId: salaActual || salaId,
                userId: user.id_usuario,
                cantidad: cantidad,
                ronda: estadoNegociacion.rondaActual
            });
            
            // Cambiar a estado de espera
            document.getElementById('tuTurno').style.display = 'none';
            document.getElementById('propuestaActual').style.display = 'none';
            document.getElementById('responderPropuesta').style.display = 'none';
            document.getElementById('esperandoRespuesta').style.display = 'block';
        });

// ================================================================
// ✅ ACEPTAR APUESTA
// ================================================================
    document.querySelectorAll('.btn-cantidad-rapida').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.btn-cantidad-rapida').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                document.getElementById('inputCantidadCustom').value = btn.dataset.cantidad;
            });
        });
        
        // ================================================================
        // ✅ ACEPTAR APUESTA
        // ================================================================
        
        document.getElementById('btnAceptarApuesta').addEventListener('click', () => {
            console.log('[NEGOCIACIÓN]: Aceptando apuesta de', estadoNegociacion.propuestaActual, 'puntos');
            
            socket.emit('duelo:respuestaApuesta', {
                salaId: salaActual || salaId,
                userId: user.id_usuario,
                acepta: true
            });
            
            document.getElementById('responderPropuesta').style.display = 'none';
            document.getElementById('propuestaActual').style.display = 'none';
            document.getElementById('esperandoRespuesta').style.display = 'block';
            document.getElementById('esperandoRespuesta').querySelector('p').textContent = '✅ Apuesta aceptada. Iniciando duelo...';
            
            mostrarNotificacion('✅ Has aceptado la apuesta', 'success');
        });
        
        // ================================================================
        // ✅ CONTRAOFERTA
        // ================================================================
        
        document.getElementById('btnContraoferta').addEventListener('click', () => {
            console.log('[NEGOCIACIÓN]: Preparando contraoferta');
            
            if (estadoNegociacion.rondaActual >= 3) {
                mostrarNotificacion('⚠️ Máximo de rondas alcanzado. Se jugará sin apuesta.', 'warning');
                return;
            }
            
            socket.emit('duelo:respuestaApuesta', {
                salaId: salaActual || salaId,
                userId: user.id_usuario,
                acepta: false
            });
            
            document.getElementById('responderPropuesta').style.display = 'none';
            document.getElementById('propuestaActual').style.display = 'none';
            document.getElementById('esperandoRespuesta').style.display = 'block';
            document.getElementById('esperandoRespuesta').querySelector('p').textContent = '⏳ Preparando tu contraoferta...';
            
            mostrarNotificacion('💭 Preparando contraoferta...', 'info');
        });
        
        // ================================================================
        // ✅ SOCKET: RESPUESTA A PROPUESTA (PARA PROPONENTE)
        // ================================================================
        
        socket.on('duelo:respuestaPropuestaApuesta', ({ acepta, siguienteRonda }) => {
            console.log('[NEGOCIACIÓN]: Respuesta recibida - Acepta:', acepta);
            
            if (!acepta && siguienteRonda) {
                estadoNegociacion.rondaActual = siguienteRonda;
                document.getElementById('rondaNegociacion').textContent = siguienteRonda;
                
                // Cambiar a modo receptor
                document.getElementById('esperandoRespuesta').style.display = 'none';
                document.getElementById('tuTurno').style.display = 'none';
                document.getElementById('responderPropuesta').style.display = 'none';
                document.getElementById('propuestaActual').style.display = 'flex';
                document.getElementById('textoProponente').textContent = `${oponente.username} está pensando...`;
                document.getElementById('cantidadPropuesta').textContent = '💭';
                
                mostrarNotificacion('💭 Tu oponente está haciendo una contraoferta', 'info');
            }
        });
        
        // ================================================================
        // ✅ SOCKET: TU TURNO DE PROPONER
        // ================================================================
        
        socket.on('duelo:tuTurnoProponer', ({ ronda, oponente: oponenteData }) => {
            console.log('[NEGOCIACIÓN]: Es tu turno - Ronda', ronda);
            
            estadoNegociacion.rondaActual = ronda;
            document.getElementById('rondaNegociacion').textContent = ronda;
            
            // Mostrar interfaz para proponer
            document.getElementById('esperandoRespuesta').style.display = 'none';
            document.getElementById('propuestaActual').style.display = 'none';
            document.getElementById('responderPropuesta').style.display = 'none';
            document.getElementById('tuTurno').style.display = 'block';
            
            mostrarNotificacion(`💰 Es tu turno. Ronda ${ronda}/3`, 'info');
        });
        
        // ================================================================
        // ✅ SOCKET: APUESTA RECHAZADA POR FALTA DE PUNTOS
        // ================================================================
        
        socket.on('duelo:apuestaRechazadaPorPuntos', ({ mensaje, puntosActuales, puntosMinimos }) => {
            console.log('[NEGOCIACIÓN]: Apuesta rechazada por falta de puntos');
            
            mostrarNotificacionAdvertencia(
                '⚠️ Apuesta No Disponible',
                mensaje,
                'warning'
            );
            
            // Cerrar negociación
            cerrarNegociacion();
            
            document.getElementById('draftInstruction').textContent = 'No hay suficientes puntos para apostar. Continúa sin apuesta.';
        });
        
        // ================================================================
        // ✅ SOCKET: NEGOCIACIÓN FINALIZADA
        // ================================================================
        
        socket.on('duelo:negociacionFinalizada', ({ apuestaFinal, motivo }) => {
            console.log('[NEGOCIACIÓN]: Finalizada -', motivo, '- Apuesta:', apuestaFinal);
            
            cerrarNegociacion();
            
            let mensaje = '';
            let tipo = 'info';
            
            if (motivo === 'aceptada') {
                mensaje = `✅ Apuesta acordada: ${apuestaFinal} pts`;
                tipo = 'success';
            } else if (motivo === 'timeout') {
                mensaje = '⏰ Tiempo agotado. Apuesta por defecto: 20 pts';
                tipo = 'warning';
            } else if (motivo === 'max_rondas') {
                mensaje = '🤝 No hubo acuerdo. Se jugará sin apuesta';
                tipo = 'info';
            }
            
            mostrarNotificacion(mensaje, tipo);
            document.getElementById('draftInstruction').textContent = mensaje;
        });
        
        // ================================================================
        // ✅ FUNCIONES AUXILIARES
        // ================================================================
        
        function iniciarTimerNegociacion() {
            if (estadoNegociacion.intervalTimer) {
                clearInterval(estadoNegociacion.intervalTimer);
            }
            
            estadoNegociacion.tiempoRestante = 60;
            
            estadoNegociacion.intervalTimer = setInterval(() => {
                estadoNegociacion.tiempoRestante--;
                const tiempoEl = document.getElementById('tiempoNegociacion');
                if (tiempoEl) {
                    tiempoEl.textContent = estadoNegociacion.tiempoRestante;
                    
                    // Cambiar color cuando queden menos de 10 segundos
                    if (estadoNegociacion.tiempoRestante <= 10) {
                        tiempoEl.style.color = '#ef4444';
                        tiempoEl.style.animation = 'pulse 0.5s ease-in-out infinite';
                    }
                }
                
                if (estadoNegociacion.tiempoRestante <= 0) {
                    clearInterval(estadoNegociacion.intervalTimer);
                }
            }, 1000);
        }
        
        function detenerTimerNegociacion() {
            if (estadoNegociacion.intervalTimer) {
                clearInterval(estadoNegociacion.intervalTimer);
                estadoNegociacion.intervalTimer = null;
            }
        }
        
        function cerrarNegociacion() {
            detenerTimerNegociacion();
            negociacionContainer.style.display = 'none';
            
            // Restaurar interfaz de materias
            materiasGrid.style.pointerEvents = 'auto';
            materiasGrid.style.opacity = '1';
            materiasGrid.style.filter = 'none';
            
            estadoNegociacion.activa = false;
            estadoNegociacion.quieroApostar = false;
            
            // Resetear botón
            btnQuieroApostar.classList.remove('activo');
            btnQuieroApostar.innerHTML = '💰 QUIERO APOSTAR';
        }
        
        // ================================================================
        // ✅ FUNCIÓN PARA MOSTRAR NOTIFICACIÓN DE ADVERTENCIA BONITA
        // ================================================================
        
        function mostrarNotificacionAdvertencia(titulo, mensaje, tipo) {
            // Crear overlay
            const overlay = document.createElement('div');
            overlay.className = 'overlay-advertencia';
            
            // Crear notificación
            const notif = document.createElement('div');
            notif.className = 'notificacion-advertencia';
            
            // Iconos según tipo
            const iconos = {
                'warning': '⚠️',
                'error': '❌',
                'info': 'ℹ️'
            };
            
            notif.innerHTML = `
                <div class="icono-advertencia">${iconos[tipo] || '⚠️'}</div>
                <h3>${titulo}</h3>
                <p>${mensaje}</p>
                <button class="btn-cerrar-advertencia">Entendido</button>
            `;
            
            document.body.appendChild(overlay);
            document.body.appendChild(notif);
            
            // Cerrar al hacer clic
            const btnCerrar = notif.querySelector('.btn-cerrar-advertencia');
            btnCerrar.addEventListener('click', () => {
                notif.style.animation = 'bounceOut 0.4s ease';
                overlay.style.animation = 'fadeOut 0.4s ease';
                
                setTimeout(() => {
                    notif.remove();
                    overlay.remove();
                }, 400);
            });
            
            // Cerrar al hacer clic en overlay
            overlay.addEventListener('click', () => {
                btnCerrar.click();
            });
        }
        
        // ================================================================
        // ✅ FUNCIÓN PARA NOTIFICACIONES NORMALES
        // ================================================================
        
        function mostrarNotificacion(mensaje, tipo = 'info') {
            const notif = document.createElement('div');
            
            const colores = {
                'success': 'linear-gradient(135deg, #10b981, #059669)',
                'error': 'linear-gradient(135deg, #ef4444, #dc2626)',
                'warning': 'linear-gradient(135deg, #f59e0b, #d97706)',
                'info': 'linear-gradient(135deg, #3b82f6, #2563eb)'
            };
            
            notif.style.cssText = `
                position: fixed;
                top: 80px;
                right: 20px;
                background: ${colores[tipo]};
                color: white;
                padding: 18px 30px;
                border-radius: 15px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.4);
                z-index: 10003;
                font-size: 15px;
                font-weight: 600;
                max-width: 400px;
                animation: slideInRight 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
            `;
            
            notif.textContent = mensaje;
            document.body.appendChild(notif);
            
            setTimeout(() => {
                notif.style.animation = 'slideOutRight 0.4s ease';
                setTimeout(() => notif.remove(), 400);
            }, 4000);
        }
        
        // Agregar animaciones CSS
        const styleAnimaciones = document.createElement('style');
        styleAnimaciones.textContent = `
            @keyframes slideInRight {
                from {
                    transform: translateX(500px);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            
            @keyframes slideOutRight {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(500px);
                    opacity: 0;
                }
            }
            
            @keyframes bounceOut {
                0% {
                    transform: translate(-50%, -50%) scale(1);
                }
                50% {
                    transform: translate(-50%, -50%) scale(1.05);
                }
                100% {
                    transform: translate(-50%, -50%) scale(0);
                    opacity: 0;
                }
            }
            
            @keyframes fadeOut {
                to {
                    opacity: 0;
                }
            }
            
            @keyframes pulse {
                0%, 100% {
                    opacity: 1;
                }
                50% {
                    opacity: 0.5;
                }
            }
        `;
        document.head.appendChild(styleAnimaciones);
        
        console.log('[APUESTAS]: ✅ Sistema de apuestas completamente inicializado');



// ================================================================
// DRAFT FINALIZADO
// ================================================================
socket.on('duelo:miniDraftFinalizado', ({ selecciones, gambitos, apuesta, mensaje }) => {
    console.log('[DRAFT]: ✅ Finalizado');
    
    if (mensaje) {
        mostrarNotificacion(mensaje, 'info');
    }
    
    draftContainer.style.display = 'none';
    arenaContainer.style.display = 'flex';
    
    // Actualizar info de apuesta
    if (apuesta && apuesta > 0) {
        apuestaActualEl.textContent = `🎰 Bote: ${apuesta * 2} pts`;
    } else {
        apuestaActualEl.textContent = '🎮 Sin apuesta';
    }
});

// ================================================================
// DUELO: Nueva pregunta
// ================================================================
socket.on('duelo:nuevaPregunta', ({ pregunta, opciones, numeroPregunta, totalPreguntas, evento, duracion, efectoVisual, tiempoEfecto }) => {
    console.log(`[PREGUNTA]: ${numeroPregunta}/${totalPreguntas}`);
    
    // ✅ VERIFICAR SI ESTÁ PAUSADO
    if (dueloPausado) {
        console.log('[PREGUNTA]: ⚠️ Duelo pausado, no renderizar pregunta aún');
        return;
    }
    
    preguntaActualId = pregunta.id_pregunta;
    textoPregunta.textContent = pregunta.pregunta;
    document.getElementById('numeroPregunta').textContent = `Pregunta ${numeroPregunta} / ${totalPreguntas}`;
    opcionesContainer.innerHTML = '';
    
    // Mostrar evento especial
    if (evento) {
        const eventoDiv = document.createElement('div');
        eventoDiv.className = 'evento-especial';
        eventoDiv.innerHTML = `<strong>${evento.notificacion}</strong>`;
        textoPregunta.parentNode.insertBefore(eventoDiv, textoPregunta);
        
        setTimeout(() => eventoDiv.remove(), 3000);
    }

    // Aplicar efecto visual si existe
    if (efectoVisual === 'blur') {
        opcionesContainer.style.filter = 'blur(5px)';
        setTimeout(() => {
            opcionesContainer.style.filter = 'none';
        }, tiempoEfecto || 2000);
    }

    // Cronómetro
    if (cronometroInterval) clearInterval(cronometroInterval);
    
    let tiempoRestante = duracion || 10;
    cronometroEl.textContent = tiempoRestante;
    
    const inicioTiempo = Date.now();
    
    cronometroInterval = setInterval(() => {
        // ✅ NO ACTUALIZAR SI ESTÁ PAUSADO
        if (dueloPausado) {
            return;
        }
        
        tiempoRestante--;
        cronometroEl.textContent = tiempoRestante;
        if (tiempoRestante <= 0) clearInterval(cronometroInterval);
    }, 1000);

    // Crear opciones
    opciones.forEach(opcion => {
        const btn = document.createElement('button');
        btn.className = 'opcion-btn';
        btn.textContent = opcion.respuesta;
        
        btn.onclick = () => {
            // ✅ VERIFICAR SI ESTÁ PAUSADO
            if (dueloPausado) {
                mostrarNotificacion('⏸️ Duelo pausado. Espera a que se reanude.', 'warning');
                return;
            }
            
            // ✅ VERIFICAR SI BOTONES ESTÁN HABILITADOS
            if (!botonesHabilitados) {
                return;
            }
            
            const tiempoRespuesta = (Date.now() - inicioTiempo) / 1000;
            
            opcionesContainer.querySelectorAll('button').forEach(b => b.disabled = true);
            btn.classList.add('seleccionada-jugador');
            
            socket.emit('duelo:responder', {
                salaId: salaActual || salaId,
                userId: user.id_usuario,
                idPregunta: pregunta.id_pregunta,
                idRespuesta: opcion.id_respuesta,
                tiempoRespuesta: tiempoRespuesta
            });
        };
        
        opcionesContainer.appendChild(btn);
    });
});
// ================================================================
// ✅ HANDLER: Reconexión exitosa
// ================================================================

socket.on('duelo:reconexionExitosa', (estadoActual) => {
    console.log('[RECONEXIÓN EXITOSA]:', estadoActual);
    
    // Ocultar matchmaking, mostrar duelo
    matchmakingView.style.display = 'none';
    dueloView.style.display = 'flex';
    dueloView.style.opacity = '1';
    
    // Actualizar UI con estado restaurado
    document.getElementById('puntuacionTuya').textContent = estadoActual.puntuaciones[user.id_usuario] || 0;
    
    const oponenteId = Object.keys(estadoActual.puntuaciones).find(id => id !== user.id_usuario.toString());
    document.getElementById('puntuacionOponente').textContent = estadoActual.puntuaciones[oponenteId] || 0;
    
    tuRachaEl.textContent = `🔥 x${estadoActual.rachas[user.id_usuario] || 0}`;
    oponenteRachaEl.textContent = `🔥 x${estadoActual.rachas[oponenteId] || 0}`;
    
    apuestaActualEl.textContent = estadoActual.apuesta > 0 ? `🎰 Bote: ${estadoActual.apuesta * 2} pts` : '🎮 Sin apuesta';
    
    // Mostrar oponente
    document.getElementById('oponenteUsername').textContent = estadoActual.oponente.username;
    document.getElementById('oponenteAvatar').src = estadoActual.oponente.foto_perfil || '/uploads/default_avatar.png';
    
    // Si hay pregunta activa, mostrarla
    if (estadoActual.preguntaActual) {
        arenaContainer.style.display = 'flex';
        draftContainer.style.display = 'none';
        
        textoPregunta.textContent = estadoActual.preguntaActual.pregunta.pregunta;
        document.getElementById('numeroPregunta').textContent = `Pregunta ${estadoActual.preguntaActual.numeroPregunta} / ${estadoActual.totalPreguntas}`;
        
        opcionesContainer.innerHTML = '';
        
        estadoActual.preguntaActual.opciones.forEach(opcion => {
            const btn = document.createElement('button');
            btn.className = 'opcion-btn';
            btn.textContent = opcion.respuesta;
            
            // Si ya respondió, deshabilitar
            if (estadoActual.preguntaActual.yaRespondida) {
                btn.disabled = true;
                btn.classList.add('deshabilitada');
            } else {
                btn.onclick = () => {
                    if (dueloPausado || !botonesHabilitados) return;
                    
                    opcionesContainer.querySelectorAll('button').forEach(b => b.disabled = true);
                    btn.classList.add('seleccionada-jugador');
                    
                    socket.emit('duelo:responder', {
                        salaId: salaActual || salaId,
                        userId: user.id_usuario,
                        idPregunta: estadoActual.preguntaActual.pregunta.id_pregunta,
                        idRespuesta: opcion.id_respuesta,
                        tiempoRespuesta: 0
                    });
                };
            }
            
            opcionesContainer.appendChild(btn);
        });
        
        // Iniciar cronómetro con tiempo restante
        if (cronometroInterval) clearInterval(cronometroInterval);
        
        let tiempo = estadoActual.preguntaActual.tiempoRestante || 10;
        cronometroEl.textContent = tiempo;
        
        cronometroInterval = setInterval(() => {
            if (dueloPausado) return;
            
            tiempo--;
            cronometroEl.textContent = tiempo;
            
            if (tiempo <= 0) clearInterval(cronometroInterval);
        }, 1000);
    }
    
    if (estadoActual.bloqueado) {
        mostrarOverlayPausa('⏸️ Esperando al otro jugador...');
    }
    
    mostrarNotificacion(estadoActual.mensaje, 'success');
});
const styleOverlayPausa = document.createElement('style');
styleOverlayPausa.textContent = `
    .overlay-pausa {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.85);
        backdrop-filter: blur(10px);
        display: none;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        opacity: 0;
        transition: opacity 0.3s ease;
    }
    
    .overlay-pausa.visible {
        display: flex;
        opacity: 1;
    }
    
    .overlay-pausa-content {
        background: linear-gradient(135deg, #1e293b, #334155);
        padding: 40px;
        border-radius: 20px;
        text-align: center;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        max-width: 400px;
    }
    
    .overlay-pausa-content h2 {
        color: white;
        font-size: 28px;
        margin: 0 0 15px 0;
    }
    
    .overlay-pausa-content p {
        color: #94a3b8;
        font-size: 16px;
        margin: 0;
    }
    
    .spinner-pausa {
        width: 60px;
        height: 60px;
        border: 5px solid rgba(59, 130, 246, 0.2);
        border-top-color: #3b82f6;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto 20px auto;
    }
    
    @keyframes spin {
        to { transform: rotate(360deg); }
    }
`;
document.head.appendChild(styleOverlayPausa);

// ================================================================
// DUELO: Actualizar estado (puntos, rachas, power-ups)
// ================================================================
socket.on('duelo:actualizarEstado', ({ puntuaciones, rachas, powerUps }) => {
    document.getElementById('puntuacionTuya').textContent = puntuaciones[user.id_usuario] || 0;
    document.getElementById('puntuacionOponente').textContent = puntuaciones[oponente.id_usuario] || 0;

    if (rachas) {
        tuRachaEl.textContent = `🔥 x${rachas[user.id_usuario]}`;
        oponenteRachaEl.textContent = `🔥 x${rachas[oponente.id_usuario]}`;
    }

    if (powerUps) {
        if (powerUps[user.id_usuario]) {
            tuPowerUpEl.style.display = 'inline-block';
            miPowerUp = powerUps[user.id_usuario];
        } else {
            tuPowerUpEl.style.display = 'none';
            miPowerUp = null;
        }

        if (powerUps[oponente.id_usuario]) {
            document.getElementById('oponentePowerUp').style.display = 'inline-block';
            document.getElementById('oponentePowerUp').textContent = '⚡';
        } else {
            document.getElementById('oponentePowerUp').style.display = 'none';
        }
    }
});

// ================================================================
// POWER-UPS
// ================================================================
socket.on('duelo:powerUpObtenido', ({ powerUp, mensaje }) => {
    console.log('[POWER-UP]:', mensaje);
    
    miPowerUp = powerUp.id;
    tuPowerUpEl.style.display = 'inline-block';
    
    const iconos = {
        'congelar': '❄️',
        '50_50': '🎯',
        'escudo': '🛡️',
        'tiempo_extra': '⏱️'
    };
    
    btnUsarPowerUp.innerHTML = `${iconos[powerUp.id]} ${powerUp.nombre}`;
    btnUsarPowerUp.title = powerUp.descripcion;
    
    mostrarNotificacion(mensaje, 'success');
});

btnUsarPowerUp.addEventListener('click', () => {
    if (miPowerUp) {
        socket.emit('duelo:activarPowerUp', {
            salaId: salaActual || salaId,
            userId: user.id_usuario,
            idPowerUp: miPowerUp
        });
        
        tuPowerUpEl.style.display = 'none';
        miPowerUp = null;
    }
});

socket.on('duelo:efectoCongelamiento', ({ duracion, mensaje }) => {
    console.log('[POWER-UP]:', mensaje);
    
    opcionesContainer.style.pointerEvents = 'none';
    opcionesContainer.style.opacity = '0.5';
    
    setTimeout(() => {
        opcionesContainer.style.pointerEvents = 'auto';
        opcionesContainer.style.opacity = '1';
    }, duracion);
});

socket.on('duelo:escudoActivado', ({ mensaje }) => {
    escudoActivo = true;
    tuPowerUpEl.innerHTML = '🛡️ Escudo Activo';
});

socket.on('duelo:powerUpBloqueado', ({ mensaje }) => {
    console.log('[POWER-UP]:', mensaje);
    escudoActivo = false;
});

// ================================================================
// DUELO: Resultado de respuesta
// ================================================================
socket.on('duelo:resultadoRespuesta', ({ esCorrecta, retroalimentacion, puntosGanados, racha, tiempoRespuesta }) => {
    const feedback = document.createElement('div');
    feedback.className = `feedback ${esCorrecta ? 'correcto' : 'incorrecto'}`;
    feedback.innerHTML = `
        <p>${esCorrecta ? '✓ ¡Correcto!' : '✗ Incorrecto'}</p>
        <small>${retroalimentacion}</small>
        ${puntosGanados ? `<strong>+${puntosGanados} pts (${tiempoRespuesta}s)</strong>` : ''}
    `;
    textoPregunta.parentNode.appendChild(feedback);
    
    setTimeout(() => feedback.remove(), 3000);
});

socket.on('duelo:gambitoExitoso', ({ mensaje, bonus }) => {
    console.log('[GAMBITO]: ✅', mensaje);
    mostrarNotificacion(mensaje, 'success');
});

socket.on('duelo:oponenteRespondio', () => {
    document.getElementById('estadoOponente').textContent = '✓ Ya respondió';
});
function mostrarResultadoDetallado(data) {
    console.log('[RESULTADO DETALLADO]:', data);
    
    const modal = document.getElementById('modalResultadoDetallado');
    const iconoEl = document.getElementById('resultIcono');
    const tituloEl = document.getElementById('resultTitulo');
    const subtituloEl = document.getElementById('resultSubtitulo');
    const jugadoresContainer = document.getElementById('jugadoresContainer');
    
    // ✅ CONVERTIR A NÚMERO PARA COMPARACIÓN CORRECTA
    const miUserId = parseInt(user.id_usuario);
    const esGanador = data.ganadorId === miUserId;
    const esEmpate = data.esEmpate;
    
    console.log('[DEBUG RESULTADO]:', {
        miUserId,
        miUserIdType: typeof miUserId,
        ganadorId: data.ganadorId,
        ganadorIdType: typeof data.ganadorId,
        esGanador,
        esEmpate,
        comparacion: `${data.ganadorId} === ${miUserId} = ${esGanador}`
    });
    
    // ✅ LANZAR CONFETTI SI GANÉ
    if (esGanador) {
        console.log('[CONFETTI]: Lanzando confetti para victoria!');
        lanzarConfetti();
    }
    
    if (esEmpate) {
        iconoEl.textContent = '🤝';
        tituloEl.textContent = '¡EMPATE!';
        subtituloEl.textContent = 'Ambos jugadores demostraron gran conocimiento';
    } else if (esGanador) {
        iconoEl.textContent = '🏆';
        tituloEl.textContent = '¡VICTORIA!';
        subtituloEl.textContent = 'Has demostrado ser el mejor';
    } else {
        iconoEl.textContent = '💪';
        tituloEl.textContent = 'Derrota';
        subtituloEl.textContent = 'Sigue practicando para mejorar';
    }
    
    jugadoresContainer.innerHTML = '';
    
    data.jugadores.forEach(jugador => {
        const esMiCard = parseInt(jugador.userId) === miUserId;
        const esGanadorCard = !esEmpate && parseInt(jugador.userId) === data.ganadorId;
        
        console.log('[JUGADOR CARD]:', {
            userId: jugador.userId,
            username: jugador.username,
            esMiCard,
            esGanadorCard,
            cambioTotal: jugador.cambioTotal
        });
        
        const card = document.createElement('div');
        card.className = `jugador-card ${esGanadorCard ? 'ganador' : ''} ${esMiCard ? 'mi-card' : ''}`;
        
        card.innerHTML = `
            <div class="jugador-header">
                <img src="${jugador.foto_perfil || '/uploads/default_avatar.png'}" 
                     alt="${jugador.username}" 
                     class="jugador-avatar">
                <div class="jugador-info">
                    <h3>${esMiCard ? '👤 ' : ''}${jugador.username}</h3>
                    <div class="jugador-stats">
                        ${jugador.respuestasCorrectas}/${jugador.respuestasCorrectas + jugador.respuestasIncorrectas} correctas 
                        (${jugador.porcentaje}%)
                    </div>
                </div>
            </div>
            
            <div class="puntos-desglose">
                <div class="puntos-inicial">
                    Puntos iniciales: <span class="valor">${jugador.puntosIniciales}</span>
                </div>
                
                <div id="desglose-${jugador.userId}"></div>
                
                <div class="puntos-total">
                    <span class="total-label">Cambio Total:</span>
                    <span class="total-cambio ${jugador.cambioTotal >= 0 ? 'positivo' : 'negativo'}" 
                          id="cambio-${jugador.userId}">
                        ${jugador.cambioTotal >= 0 ? '+' : ''}0
                    </span>
                </div>
                
                <div class="puntos-final">
                    Puntos finales:
                    <span class="valor-final" id="final-${jugador.userId}">
                        ${jugador.puntosIniciales}
                    </span>
                </div>
            </div>
            
            <div class="stats-rapidas">
                <div class="stat-badge">
                    <div class="stat-valor">${jugador.puntuacionFinal}</div>
                    <div class="stat-label">Pts. Partida</div>
                </div>
                <div class="stat-badge">
                    <div class="stat-valor">${jugador.racha || 0}</div>
                    <div class="stat-label">Racha</div>
                </div>
                <div class="stat-badge">
                    <div class="stat-valor">${jugador.porcentaje}%</div>
                    <div class="stat-label">Precisión</div>
                </div>
            </div>
        `;
        
        jugadoresContainer.appendChild(card);
        
        // ✅ ANIMACIÓN DE DESGLOSE + CONTADORES
        setTimeout(() => {
            animarDesglose(jugador.userId, jugador.desglose);
            
            // Animar cambio total y puntos finales después del desglose
            setTimeout(() => {
                const cambioEl = document.getElementById(`cambio-${jugador.userId}`);
                const finalEl = document.getElementById(`final-${jugador.userId}`);
                
                if (cambioEl) {
                    animarContador(cambioEl, jugador.cambioTotal, 1000);
                }
                
                if (finalEl) {
                    animarContador(finalEl, jugador.puntosFinal, 1500);
                }
            }, jugador.desglose.length * 100 + 500);
            
        }, 500);
    });
    
    modal.classList.add('visible');
}
// ================================================================
// 📊 SISTEMA DE VISUALIZACIÓN DE PUNTOS - FRONTEND
// Agregar a matchmaking.controller.js
// ================================================================

// ================================================================
// 📊 FRONTEND - VISUALIZACIÓN DE RESULTADOS CORREGIDA
// Diferenciación clara entre Puntos Globales y Puntos de Carrera
// Agregar a matchmaking.controller.js (reemplazar función existente)
// ================================================================

/**
 * ✅ Renderiza el resultado del duelo con separación correcta de puntos
 * @param {Object} resultado - Datos del servidor con modo, jugadores, etc.
 */
// ================================================================
// 🏆 FUNCIÓN MEJORADA: RENDERIZAR RESULTADO CON DIFERENCIACIÓN CORRECTA
// Reemplazar función renderizarResultadoConPuntosSeparados() existente
// ================================================================

// ================================================================
// 🎯 FUNCIÓN CORREGIDA: renderizarResultadoConPuntosSeparados
// Reemplazar en matchmaking.controller.js (línea ~1050)
// ================================================================

/**
 * ✅ RENDERIZA RESULTADO FINAL DEL DUELO
 * - Diferencia puntos globales vs puntos de carrera
 * - Muestra desglose completo
 * - Maneja empates y victorias
 */
function renderizarResultadoConPuntosSeparados(resultado) {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('[RESULTADO UI]: 📊 Renderizando resultado');
    console.log(`[RESULTADO UI]: Modo: ${resultado.modo}`);
    console.log(`[RESULTADO UI]: ID Carrera: ${resultado.idCarrera || 'N/A'}`);
    console.log(`[RESULTADO UI]: Apuesta: ${resultado.apuesta}`);
    console.log(`[RESULTADO UI]: Jugadores: ${resultado.jugadores.length}`);
    console.log('═══════════════════════════════════════════════════════════');
    
    const container = document.getElementById('jugadoresContainer');
    if (!container) {
        console.error('[RESULTADO UI]: ❌ Container jugadoresContainer no encontrado');
        return;
    }
    
    container.innerHTML = '';
    
    // ✅ VALIDACIÓN: Verificar que tenemos datos
    if (!resultado.jugadores || resultado.jugadores.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #ef4444;">
                <h3>❌ Error</h3>
                <p>No se pudieron cargar los resultados del duelo</p>
            </div>
        `;
        console.error('[RESULTADO UI]: ❌ No hay jugadores en resultado');
        return;
    }
    
    const esCarrera = resultado.modo === 'carrera';
    const icono = esCarrera ? '🎓' : '🌍';
    const etiquetaModo = esCarrera ? 'CARRERA' : 'GENERAL';
    
    // ✅ Obtener mi ID de usuario
    const miUserId = parseInt(window.USER_DATA?.id_usuario);
    
    // ✅ RENDERIZAR CADA JUGADOR
    resultado.jugadores.forEach((jugador, index) => {
        console.log(`[RESULTADO UI]: 👤 Procesando jugador ${jugador.username}`);
        console.log(`  - userId: ${jugador.userId}`);
        console.log(`  - puntosGlobales: ${jugador.puntosGlobales || 0}`);
        console.log(`  - puntosCarrera: ${jugador.puntosCarrera || 0}`);
        console.log(`  - cambioGlobal: ${jugador.cambioGlobal || 0}`);
        console.log(`  - cambioCarrera: ${jugador.cambioCarrera || 0}`);
        
        const esYo = parseInt(jugador.userId) === miUserId;
        const esGanador = !resultado.esEmpate && parseInt(jugador.userId) === parseInt(resultado.ganadorId);
        const esEmpate = resultado.esEmpate;
        
        // ════════════════════════════════════════════════════════════
        // 📊 CONSTRUIR SECCIÓN DE PUNTOS PRINCIPALES
        // ════════════════════════════════════════════════════════════
        
        let puntosPartidaHTML = '';
        let cambioGlobalesHTML = '';
        let cambioCarreraHTML = '';
        
        // 1️⃣ PUNTOS OBTENIDOS EN LA PARTIDA (según modo)
        if (esCarrera) {
            // MODO CARRERA: Mostrar puntos de carrera ganados
            puntosPartidaHTML = `
                <div class="puntos-obtenidos carrera">
                    <span class="icono">🎓</span>
                    <span class="cantidad">${jugador.puntosCarrera || 0}</span>
                    <span class="label">Pts Carrera (Preguntas)</span>
                </div>
            `;
        } else {
            // MODO GENERAL: Mostrar puntos globales ganados
            puntosPartidaHTML = `
                <div class="puntos-obtenidos general">
                    <span class="icono">🌍</span>
                    <span class="cantidad">${jugador.puntosGlobales || 0}</span>
                    <span class="label">Pts Globales (Preguntas)</span>
                </div>
            `;
        }
        
        // 2️⃣ CAMBIO NETO EN PUNTOS GLOBALES (SIEMPRE se muestra)
        const cambioGlobal = jugador.cambioGlobal || 0;
        const esPositivoGlobal = cambioGlobal >= 0;
        const signoGlobal = esPositivoGlobal ? '+' : '';
        const claseGlobal = esPositivoGlobal ? 'positivo' : 'negativo';
        
        cambioGlobalesHTML = `
            <div class="cambio-puntos global ${claseGlobal}">
                <span class="icono">💎</span>
                <span class="cantidad">${signoGlobal}${cambioGlobal}</span>
                <span class="label">Cambio Neto Global</span>
                <span class="sublabel">(Apuesta + Bonus + Recompensas)</span>
            </div>
        `;
        
        // 3️⃣ CAMBIO EN PUNTOS DE CARRERA (SOLO si es modo carrera)
        if (esCarrera && jugador.cambioCarrera !== undefined && jugador.cambioCarrera !== 0) {
            const cambioCarrera = jugador.cambioCarrera;
            const esPositivoCarrera = cambioCarrera >= 0;
            const signoCarrera = esPositivoCarrera ? '+' : '';
            const claseCarrera = esPositivoCarrera ? 'positivo' : 'negativo';
            
            cambioCarreraHTML = `
                <div class="cambio-puntos carrera ${claseCarrera}">
                    <span class="icono">🎓</span>
                    <span class="cantidad">${signoCarrera}${cambioCarrera}</span>
                    <span class="label">Cambio Neto Carrera</span>
                    <span class="sublabel">(Total Acumulado)</span>
                </div>
            `;
        }
        
        // ════════════════════════════════════════════════════════════
        // 📝 DESGLOSE DETALLADO CON ETIQUETAS DE TIPO
        // ════════════════════════════════════════════════════════════
        
        let desgloseHTML = '';
        
        if (jugador.desglose && Array.isArray(jugador.desglose) && jugador.desglose.length > 0) {
            console.log(`[RESULTADO UI]: Procesando ${jugador.desglose.length} items de desglose`);
            
            desgloseHTML = jugador.desglose.map(item => {
                const valorStr = item.esPositivo ? `+${item.valor}` : `${item.valor}`;
                const claseItem = item.esPositivo ? 'positivo' : 'negativo';
                
                // ✅ Badge de tipo de punto
                let badgeTipo = '';
                
                if (item.tipo === 'carrera') {
                    badgeTipo = '<span class="badge-tipo carrera">🎓 Carrera</span>';
                } else if (item.tipo === 'global') {
                    badgeTipo = '<span class="badge-tipo global">💎 Global</span>';
                }
                
                return `
                    <div class="desglose-item ${claseItem}">
                        <span class="concepto">${item.concepto}</span>
                        ${badgeTipo}
                        <span class="valor">${valorStr}</span>
                    </div>
                `;
            }).join('');
        } else {
            console.warn(`[RESULTADO UI]: ⚠️ Sin desglose para jugador ${jugador.username}`);
            desgloseHTML = '<p class="no-desglose">Sin desglose disponible</p>';
        }
        
        // ════════════════════════════════════════════════════════════
        // 🏆 CARD COMPLETA DEL JUGADOR
        // ════════════════════════════════════════════════════════════
        
        const cardHTML = `
            <div class="jugador-card ${esGanador ? 'ganador' : ''} ${esEmpate ? 'empate' : ''} ${esYo ? 'mi-card' : ''}">
                <!-- Header -->
                <div class="jugador-header">
                    <img src="${jugador.foto_perfil || '/uploads/default_avatar.png'}" 
                         alt="${jugador.username}" 
                         class="jugador-avatar"
                         onerror="this.src='/uploads/default_avatar.png'">
                    <div class="jugador-info">
                        <h3>${esYo ? '👤 ' : ''}${jugador.username}</h3>
                        ${esGanador ? '<span class="badge-ganador">👑 GANADOR</span>' : ''}
                        ${esEmpate ? '<span class="badge-empate">🤝 EMPATE</span>' : ''}
                    </div>
                </div>
                
                <!-- Modo del Duelo -->
                <div class="modo-duelo">
                    <span class="icono-modo">${icono}</span>
                    <span class="texto-modo">MODO ${etiquetaModo}</span>
                </div>
                
                <!-- Puntos Principales -->
                <div class="puntos-principales">
                    ${puntosPartidaHTML}
                    ${cambioGlobalesHTML}
                    ${cambioCarreraHTML}
                </div>
                
                <!-- Estadísticas de Rendimiento -->
                <div class="stats-rendimiento">
                    <div class="stat-item">
                        <span class="stat-label">Correctas</span>
                        <span class="stat-valor">${jugador.respuestasCorrectas || 0}/${(jugador.respuestasCorrectas || 0) + (jugador.respuestasIncorrectas || 0)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Precisión</span>
                        <span class="stat-valor">${jugador.porcentaje || 0}%</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Racha Máxima</span>
                        <span class="stat-valor">🔥 ${jugador.rachaMaxima || 0}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Tiempo Promedio</span>
                        <span class="stat-valor">⏱️ ${jugador.tiempoPromedio || 0}s</span>
                    </div>
                    ${jugador.gambitoActivado ? `
                        <div class="stat-item gambito ${jugador.cumplioGambito ? 'exitoso' : 'fallido'}">
                            <span class="stat-label">Gambito</span>
                            <span class="stat-valor">${jugador.cumplioGambito ? '✅ Exitoso' : '❌ Fallido'}</span>
                        </div>
                    ` : ''}
                </div>
                
                <!-- Puntos Finales -->
                <div class="puntos-finales">
                    <div class="puntos-totales">
                        <span class="label">💎 Total Global Final</span>
                        <span class="valor">${jugador.puntosFinal || jugador.puntosIniciales || 0} pts</span>
                    </div>
                </div>
                
                <!-- Toggle Desglose -->
                <button class="btn-toggle-desglose" onclick="toggleDesglose(${index})">
                    📊 Ver Desglose Detallado
                    <span class="icono-toggle">▼</span>
                </button>
                
                <!-- Desglose (Inicialmente Oculto) -->
                <div class="desglose-container" id="desglose-${index}" style="display: none;">
                    <h4>Desglose Detallado</h4>
                    <div class="desglose-items">
                        ${desgloseHTML}
                    </div>
                </div>
            </div>
        `;
        
        container.innerHTML += cardHTML;
    });
    
    console.log('[RESULTADO UI]: ✅ Renderizado completado');
    console.log('═══════════════════════════════════════════════════════════');
}

/**
 * ✅ Toggle para mostrar/ocultar desglose
 */
function toggleDesglose(index) {
    const desglose = document.getElementById(`desglose-${index}`);
    const btn = event.target.closest('.btn-toggle-desglose');
    const icono = btn.querySelector('.icono-toggle');
    
    if (!desglose) {
        console.error(`[TOGGLE DESGLOSE]: Elemento desglose-${index} no encontrado`);
        return;
    }
    
    if (desglose.style.display === 'none') {
        desglose.style.display = 'block';
        icono.textContent = '▲';
        btn.classList.add('abierto');
    } else {
        desglose.style.display = 'none';
        icono.textContent = '▼';
        btn.classList.remove('abierto');
    }
}

// ================================================================
// 🎧 LISTENER MEJORADO: Recibir resultado del servidor
// ================================================================

socket.on('duelo:finalizado', (resultado) => {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('[SOCKET]: 📊 RESULTADO RECIBIDO DEL SERVIDOR');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('[SOCKET]: Modo:', resultado.modo);
    console.log('[SOCKET]: Ganador ID:', resultado.ganadorId);
    console.log('[SOCKET]: Es empate:', resultado.esEmpate);
    console.log('[SOCKET]: Apuesta:', resultado.apuesta);
    console.log('[SOCKET]: ID Carrera:', resultado.idCarrera || 'N/A');
    console.log('[SOCKET]: Jugadores recibidos:', resultado.jugadores?.length || 0);
    
    // ✅ VALIDACIÓN CRÍTICA: Verificar que tenemos datos
    if (!resultado.jugadores || resultado.jugadores.length === 0) {
        console.error('[SOCKET]: ❌ ERROR - No hay jugadores en resultado');
        console.error('[SOCKET]: Resultado completo:', JSON.stringify(resultado, null, 2));
        
        // Mostrar error al usuario
        const modal = document.getElementById('modalResultadoDetallado');
        if (modal) {
            modal.innerHTML = `
                <div style="text-align: center; padding: 40px; background: white; border-radius: 15px;">
                    <h2 style="color: #ef4444;">❌ Error al cargar resultados</h2>
                    <p>No se recibieron datos válidos del servidor</p>
                    <button onclick="location.href='/matchmaking'" style="margin-top: 20px; padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 8px; cursor: pointer;">
                        Volver al Portal
                    </button>
                </div>
            `;
            modal.style.display = 'flex';
            modal.classList.add('visible');
        }
        return;
    }
    
    // Cada jugador debe tener estos campos (validar)
    resultado.jugadores.forEach((j, idx) => {
        console.log(`[SOCKET]: Jugador ${idx + 1}:`);
        console.log(`  - userId: ${j.userId}`);
        console.log(`  - username: ${j.username}`);
        console.log(`  - puntosGlobales: ${j.puntosGlobales}`);
        console.log(`  - puntosCarrera: ${j.puntosCarrera}`);
        console.log(`  - cambioGlobal: ${j.cambioGlobal}`);
        console.log(`  - cambioCarrera: ${j.cambioCarrera}`);
        console.log(`  - desglose items: ${j.desglose?.length || 0}`);
    });
    
    // Ocultar arena
    const arenaContainer = document.getElementById('arenaContainer');
    const draftContainer = document.getElementById('draftContainer');
    
    if (arenaContainer) arenaContainer.style.display = 'none';
    if (draftContainer) draftContainer.style.display = 'none';
    
    // Mostrar modal de resultado
    const modal = document.getElementById('modalResultadoDetallado');
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('visible');
    }
    
    // ✅ Renderizar con sistema corregido
    try {
        renderizarResultadoConPuntosSeparados(resultado);
        console.log('[SOCKET]: ✅ Renderizado exitoso');
    } catch (error) {
        console.error('[SOCKET]: ❌ Error en renderizado:', error);
        console.error('[SOCKET]: Stack:', error.stack);
    }
    
    // Lanzar confetti si ganamos
    const userId = parseInt(window.USER_DATA?.id_usuario);
    if (resultado.ganadorId === userId && !resultado.esEmpate) {
        console.log('[SOCKET]: 🎉 Usuario ganó - Lanzando confetti');
        if (typeof lanzarConfetti === 'function') {
            lanzarConfetti();
        }
    }
    
    console.log('[SOCKET]: ✅ Proceso completado');
    console.log('═══════════════════════════════════════════════════════════');
});

/**
 * ✅ Toggle para mostrar/ocultar desglose
 */
function toggleDesglose(index) {
    const desglose = document.getElementById(`desglose-${index}`);
    const btn = event.target.closest('.btn-toggle-desglose');
    const icono = btn.querySelector('.icono-toggle');
    
    if (desglose.style.display === 'none') {
        desglose.style.display = 'block';
        icono.textContent = '▲';
        btn.classList.add('abierto');
    } else {
        desglose.style.display = 'none';
        icono.textContent = '▼';
        btn.classList.remove('abierto');
    }
}

// ================================================================
// 🎧 LISTENER MEJORADO: Recibir resultado del servidor
// ================================================================

socket.on('duelo:finalizado', (resultado) => {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('[SOCKET]: 📊 RESULTADO RECIBIDO');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('[SOCKET]: Modo:', resultado.modo);
    console.log('[SOCKET]: Ganador ID:', resultado.ganadorId);
    console.log('[SOCKET]: Es empate:', resultado.esEmpate);
    console.log('[SOCKET]: Apuesta:', resultado.apuesta);
    console.log('[SOCKET]: ID Carrera:', resultado.idCarrera || 'N/A');
    console.log('[SOCKET]: Jugadores:', resultado.jugadores.length);
    actualizarEstadoDuelo(false);
    // Ocultar arena
    document.getElementById('arenaContainer').style.display = 'none';
    document.getElementById('draftContainer').style.display = 'none';
    
    // Mostrar modal de resultado
    const modal = document.getElementById('modalResultadoDetallado');
    modal.style.display = 'flex';
    modal.classList.add('visible');
    
    // ✅ Renderizar con sistema corregido
    renderizarResultadoConPuntosSeparados(resultado);
    
    // Lanzar confetti si ganamos
    const userId = parseInt(window.USER_DATA?.id_usuario);
    if (resultado.ganadorId === userId && !resultado.esEmpate) {
        console.log('[SOCKET]: 🎉 Lanzando confetti (usuario ganó)');
        lanzarConfetti();
    }
    
    console.log('[SOCKET]: ✅ Interfaz actualizada');
    console.log('═══════════════════════════════════════════════════════════');
});

// ================================================================
// 🎨 ESTILOS CSS MEJORADOS CON SUBLABELS
// ================================================================

const estilosResultadosMejorados = `
<style>
/* Sublabels en cards de puntos */
.puntos-obtenidos .sublabel,
.cambio-puntos .sublabel {
    font-size: 9px;
    opacity: 0.7;
    font-style: italic;
    margin-top: 2px;
    color: rgba(255, 255, 255, 0.6);
}

/* Modo duelo más visible */
.modo-duelo {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 14px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    margin-bottom: 20px;
    border-left: 4px solid;
    border-color: var(--color-acento);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.modo-duelo .icono-modo {
    font-size: 28px;
}

.modo-duelo .texto-modo {
    font-weight: 800;
    font-size: 15px;
    letter-spacing: 1.5px;
    color: var(--color-acento);
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

/* Cards de puntos más claras */
.puntos-obtenidos,
.cambio-puntos {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 20px 16px;
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.04);
    border: 2px solid transparent;
    transition: all 0.3s ease;
    min-height: 120px;
    justify-content: center;
}

.puntos-obtenidos:hover,
.cambio-puntos:hover {
    transform: translateY(-4px);
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
}

/* Variantes de color más intensas */
.puntos-obtenidos.carrera {
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(139, 92, 246, 0.08));
    border-color: rgba(139, 92, 246, 0.4);
}

.puntos-obtenidos.general {
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(59, 130, 246, 0.08));
    border-color: rgba(59, 130, 246, 0.4);
}

.cambio-puntos.positivo {
    background: linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(34, 197, 94, 0.08));
    border-color: rgba(34, 197, 94, 0.4);
}

.cambio-puntos.negativo {
    background: linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(239, 68, 68, 0.08));
    border-color: rgba(239, 68, 68, 0.4);
}

.puntos-obtenidos .icono,
.cambio-puntos .icono {
    font-size: 36px;
    margin-bottom: 12px;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
}

.puntos-obtenidos .cantidad,
.cambio-puntos .cantidad {
    font-size: 32px;
    font-weight: 900;
    margin-bottom: 8px;
    color: white;
    text-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
}

.puntos-obtenidos .label,
.cambio-puntos .label {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    opacity: 0.9;
    font-weight: 700;
    text-align: center;
    color: rgba(255, 255, 255, 0.85);
    line-height: 1.3;
}

/* Badges de tipo mejorados */
.badge-tipo {
    font-size: 10px;
    padding: 4px 10px;
    border-radius: 6px;
    font-weight: 800;
    white-space: nowrap;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.badge-tipo.carrera {
    background: rgba(139, 92, 246, 0.25);
    color: #c084fc;
    border: 1.5px solid rgba(139, 92, 246, 0.4);
}

.badge-tipo.global {
    background: rgba(59, 130, 246, 0.25);
    color: #60a5fa;
    border: 1.5px solid rgba(59, 130, 246, 0.4);
}

/* Desglose items mejorado */
.desglose-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 16px;
    border-radius: 10px;
    font-size: 13px;
    background: rgba(255, 255, 255, 0.03);
    border-left: 4px solid transparent;
    gap: 12px;
    transition: all 0.2s ease;
}

.desglose-item:hover {
    background: rgba(255, 255, 255, 0.06);
    transform: translateX(4px);
}

.desglose-item.positivo {
    border-left-color: #22c55e;
    background: rgba(34, 197, 94, 0.06);
}

.desglose-item.negativo {
    border-left-color: #ef4444;
    background: rgba(239, 68, 68, 0.06);
}

.desglose-item .concepto {
    flex: 1;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.95);
}

.desglose-item .valor {
    font-weight: 800;
    font-size: 15px;
    min-width: 80px;
    text-align: right;
}

.desglose-item.positivo .valor {
    color: #22c55e;
    text-shadow: 0 0 8px rgba(34, 197, 94, 0.3);
}

.desglose-item.negativo .valor {
    color: #ef4444;
    text-shadow: 0 0 8px rgba(239, 68, 68, 0.3);
}
</style>
`;

// ✅ Inyectar estilos mejorados
document.head.insertAdjacentHTML('beforeend', estilosResultadosMejorados);

console.log('[RESULTADOS]: ✅ Sistema de visualización mejorado inicializado');
const estilosPuntosCSS = `
<style>
/* ============================================================ */
/* SISTEMA DE PUNTOS - ESTILOS MEJORADOS */
/* ============================================================ */

.modo-duelo {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    margin-bottom: 20px;
    border-left: 4px solid var(--color-acento);
}

.modo-duelo .icono-modo {
    font-size: 24px;
}

.modo-duelo .texto-modo {
    font-weight: 700;
    font-size: 14px;
    letter-spacing: 1px;
    color: var(--color-acento);
}

.puntos-principales {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 15px;
    margin-bottom: 25px;
}

.puntos-obtenidos,
.cambio-puntos {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 15px;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.03);
    border: 2px solid transparent;
    transition: all 0.3s ease;
}

.puntos-obtenidos.carrera {
    background: linear-gradient(135deg, rgba(100, 50, 200, 0.15), rgba(100, 50, 200, 0.05));
    border-color: rgba(100, 50, 200, 0.3);
}

.puntos-obtenidos.general {
    background: linear-gradient(135deg, rgba(50, 150, 255, 0.15), rgba(50, 150, 255, 0.05));
    border-color: rgba(50, 150, 255, 0.3);
}

.cambio-puntos.positivo {
    background: linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(34, 197, 94, 0.05));
    border-color: rgba(34, 197, 94, 0.3);
}

.cambio-puntos.negativo {
    background: linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(239, 68, 68, 0.05));
    border-color: rgba(239, 68, 68, 0.3);
}

.puntos-obtenidos .icono,
.cambio-puntos .icono {
    font-size: 28px;
    margin-bottom: 8px;
}

.puntos-obtenidos .cantidad,
.cambio-puntos .cantidad {
    font-size: 26px;
    font-weight: 800;
    margin-bottom: 4px;
}

.puntos-obtenidos .label,
.cambio-puntos .label {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    opacity: 0.8;
    font-weight: 600;
}

/* Desglose Detallado */
.btn-toggle-desglose {
    width: 100%;
    padding: 12px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    color: white;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin-top: 15px;
}

.btn-toggle-desglose:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.2);
}

.btn-toggle-desglose .icono-toggle {
    font-size: 10px;
    transition: transform 0.3s ease;
}

.desglose-container {
    margin-top: 15px;
    padding: 15px;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 8px;
    animation: slideDown 0.3s ease;
}

@keyframes slideDown {
    from {
        opacity: 0;
        transform: translateY(-10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.desglose-container h4 {
    font-size: 14px;
    margin-bottom: 12px;
    color: var(--color-acento);
    font-weight: 700;
}

.desglose-items {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.desglose-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    border-radius: 6px;
    font-size: 13px;
    background: rgba(255, 255, 255, 0.02);
    border-left: 3px solid transparent;
    gap: 10px;
}

.desglose-item.positivo {
    border-left-color: #22c55e;
    background: rgba(34, 197, 94, 0.05);
}

.desglose-item.negativo {
    border-left-color: #ef4444;
    background: rgba(239, 68, 68, 0.05);
}

.desglose-item .concepto {
    flex: 1;
    font-weight: 500;
}

.desglose-item .tipo-punto {
    font-size: 10px;
    padding: 2px 8px;
    border-radius: 4px;
    font-weight: 700;
    white-space: nowrap;
}

.desglose-item .tipo-punto.carrera {
    background: rgba(100, 50, 200, 0.2);
    color: #c084fc;
    border: 1px solid rgba(100, 50, 200, 0.3);
}

.desglose-item .tipo-punto.global {
    background: rgba(50, 150, 255, 0.2);
    color: #60a5fa;
    border: 1px solid rgba(50, 150, 255, 0.3);
}

.desglose-item .valor {
    font-weight: 700;
    font-size: 14px;
    min-width: 60px;
    text-align: right;
}

.desglose-item.positivo .valor {
    color: #22c55e;
}

.desglose-item.negativo .valor {
    color: #ef4444;
}

/* Stats de Rendimiento */
.stats-rendimiento {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    margin-bottom: 20px;
}

.stat-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 10px;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 8px;
}

.stat-item.gambito {
    grid-column: span 2;
    background: linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(168, 85, 247, 0.05));
    border: 1px solid rgba(168, 85, 247, 0.2);
}

.stat-label {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    opacity: 0.7;
    font-weight: 600;
}

.stat-valor {
    font-size: 16px;
    font-weight: 700;
}

/* Puntos Finales */
.puntos-finales {
    padding: 15px;
    background: linear-gradient(135deg, rgba(168, 85, 247, 0.15), rgba(168, 85, 247, 0.05));
    border-radius: 12px;
    border: 2px solid rgba(168, 85, 247, 0.3);
    margin-top: 15px;
}

.puntos-totales {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.puntos-totales .label {
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 1px;
    font-weight: 600;
    opacity: 0.9;
}

.puntos-totales .valor {
    font-size: 24px;
    font-weight: 900;
    color: var(--color-acento);
}

/* Responsive */
@media (max-width: 768px) {
    .puntos-principales {
        grid-template-columns: 1fr;
    }
    
    .stats-rendimiento {
        grid-template-columns: 1fr;
    }
}
</style>
`;

// ✅ Inyectar estilos en el documento
document.head.insertAdjacentHTML('beforeend', estilosPuntosCSS);



function animarDesglose(userId, desglose) {
    const container = document.getElementById(`desglose-${userId}`);
    if (!container) return;
    
    container.innerHTML = '';
    
    desglose.forEach((item, index) => {
        setTimeout(() => {
            const itemEl = document.createElement('div');
            itemEl.className = 'desglose-item';
            itemEl.style.animationDelay = `${index * 0.1}s`;
            
            const signo = item.esPositivo ? '+' : '-';
            const clase = item.esPositivo ? 'positivo' : 'negativo';
            
            itemEl.innerHTML = `
                <span class="desglose-concepto">${item.concepto}</span>
                <span class="desglose-valor ${clase}">${signo}${Math.abs(item.valor)}</span>
            `;
            
            container.appendChild(itemEl);
        }, index * 100);
    });
}

document.getElementById('btnVolverPortal').addEventListener('click', () => {
    window.location.href = '/matchmaking';
});
function lanzarConfetti() {
    const canvas = document.getElementById('confettiCanvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const confettiPieces = [];
    const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A'];
    
    // Crear 150 piezas de confetti
    for (let i = 0; i < 150; i++) {
        confettiPieces.push({
            x: Math.random() * canvas.width,
            y: -20,
            w: Math.random() * 10 + 5,
            h: Math.random() * 10 + 5,
            color: colors[Math.floor(Math.random() * colors.length)],
            speedY: Math.random() * 3 + 2,
            speedX: Math.random() * 2 - 1,
            rotation: Math.random() * 360
        });
    }
    
    function animateConfetti() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        confettiPieces.forEach((piece, index) => {
            ctx.save();
            ctx.translate(piece.x, piece.y);
            ctx.rotate(piece.rotation * Math.PI / 180);
            ctx.fillStyle = piece.color;
            ctx.fillRect(-piece.w / 2, -piece.h / 2, piece.w, piece.h);
            ctx.restore();
            
            // Actualizar posición
            piece.y += piece.speedY;
            piece.x += piece.speedX;
            piece.rotation += 5;
            
            // Remover si está fuera de pantalla
            if (piece.y > canvas.height) {
                confettiPieces.splice(index, 1);
            }
        });
        
        if (confettiPieces.length > 0) {
            requestAnimationFrame(animateConfetti);
        }
    }
    
    animateConfetti();
}

// ================================================================
// ✅ ANIMACIÓN DE CONTEO PROGRESIVO
// ================================================================

function animarContador(elemento, valorFinal, duracion = 1500) {
    const valorInicial = parseInt(elemento.textContent) || 0;
    const diferencia = valorFinal - valorInicial;
    const incremento = diferencia / (duracion / 16); // 60 FPS
    let valorActual = valorInicial;
    
    const timer = setInterval(() => {
        valorActual += incremento;
        
        if ((incremento > 0 && valorActual >= valorFinal) || 
            (incremento < 0 && valorActual <= valorFinal)) {
            valorActual = valorFinal;
            clearInterval(timer);
        }
        
        elemento.textContent = Math.round(valorActual);
        
        // Efecto de brillo al cambiar
        elemento.style.textShadow = '0 0 10px rgba(255, 215, 0, 0.8)';
        setTimeout(() => {
            elemento.style.textShadow = 'none';
        }, 100);
        
    }, 16);
}
// ================================================================
// MATCHMAKING
// ================================================================
btnBuscarCarrera.addEventListener('click', () => {
    modalDificultad.classList.add('visible');
});

btnBuscarGeneral.addEventListener('click', () => {
    iniciarBusqueda('general', null);
});

btnCancelarBusqueda.addEventListener('click', () => {
    if (salaActual) {
        window.location.href = '/matchmaking';
    } else {
        socket.emit('duelo:cancelarBusqueda', user.id_usuario);
        restaurarBusqueda("Búsqueda cancelada.");
    }
});

modalDificultad.querySelectorAll('.dificultad-opciones button').forEach(btn => {
    if (btn.dataset.dificultad) {
        btn.onclick = () => iniciarBusqueda('carrera', btn.dataset.dificultad);
    }
});

document.getElementById('cerrarModalDificultad').onclick = () => {
    modalDificultad.classList.remove('visible');
};

function iniciarBusqueda(modo, dificultad = null) {
    console.log(`[MATCHMAKING]: Iniciando - Modo: ${modo}, Dificultad: ${dificultad}`);
    
    modalDificultad.classList.remove('visible');
    btnBuscarCarrera.style.display = 'none';
    btnBuscarGeneral.style.display = 'none';
    btnCancelarBusqueda.style.display = 'inline-block';
    statusText.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Buscando oponente...';
    
    const evento = `duelo_com:buscar:${modo}`;
    const payload = modo === 'carrera' 
        ? { user, dificultad } 
        : { user };
    
    socket.emit(evento, payload);
}

function restaurarBusqueda(mensaje) {
    btnBuscarCarrera.style.display = 'inline-block';
    btnBuscarGeneral.style.display = 'inline-block';
    btnCancelarBusqueda.style.display = 'none';
    statusText.textContent = mensaje;
}

socket.on('matchmaking:salaCreada', ({ salaId, urlSala, mensaje, apuesta, bote, delay }) => {
    console.log('[MATCHMAKING]: ✅ Sala creada!', salaId);
    
    if (document.body.classList.contains('in-transition')) return;
    document.body.classList.add('in-transition');
    
    sessionStorage.setItem('fromMatchmaking', 'true');
    sessionStorage.setItem('matchmakingSalaId', salaId);
    
    statusText.innerHTML = `<i class="fas fa-check-circle"></i> ${mensaje}`;
    btnCancelarBusqueda.style.display = 'none';
    
    salaActual = salaId;
    
    const delayTotal = (delay || 0) + 1000;
    
    setTimeout(() => {
        window.location.href = urlSala;
    }, delayTotal);
});

// ================================================================
// DETECCIÓN DE SALA EN URL
// ================================================================
const urlPath = window.location.pathname;
const salaMatch = urlPath.match(/\/competitivo\/sala\/([a-f0-9-]{36})/i);
const fromMatchmaking = sessionStorage.getItem('fromMatchmaking') === 'true';
const matchmakingSalaId = sessionStorage.getItem('matchmakingSalaId');

if (fromMatchmaking && matchmakingSalaId) {
    salaActual = matchmakingSalaId;
    console.log('[SALA]: Sala de MATCHMAKING:', salaActual);
    
    sessionStorage.removeItem('fromMatchmaking');
    sessionStorage.removeItem('matchmakingSalaId');
    
    btnBuscarCarrera.style.display = 'none';
    btnBuscarGeneral.style.display = 'none';
    btnCancelarBusqueda.style.display = 'inline-block';
    statusText.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Conectando a la sala...';
    
    const conectarASalaMatchmaking = async () => {
        console.log('[SALA]: Iniciando conexión...');
        
        let esperaRegistro = 0;
        while (!socketRegistrado && esperaRegistro < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            esperaRegistro++;
        }
        
        if (!socketRegistrado) {
            console.error('[SALA]: Timeout esperando registro');
            statusText.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Error de conexión. Recargando...';
            setTimeout(() => window.location.reload(), 2000);
            return;
        }
        
        await new Promise(resolve => setTimeout(resolve, 4000));
        
        if (!socket.connected) {
            console.error('[SALA]: Socket no conectado');
            statusText.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Error de conexión. Recargando...';
            setTimeout(() => window.location.reload(), 2000);
            return;
        }
        
        let intentos = 0;
        const maxIntentos = 5;
        
        const emitirUnirse = async () => {
            intentos++;
            console.log(`[SALA]: Intento ${intentos}/${maxIntentos}`);
            
            socket.emit('sala:unirse', { salaId: salaActual });
            socket.hasJoinedSala = true;
            
            let recibioRespuesta = false;
            
            const timeoutPromise = new Promise(resolve => {
                setTimeout(() => resolve(false), 5000);
            });
            
            const responsePromise = new Promise(resolve => {
                const handler = () => {
                    recibioRespuesta = true;
                    socket.off('sala:conectado', handler);
                    socket.off('sala:error', handler);
                    resolve(true);
                };
                socket.once('sala:conectado', handler);
                socket.once('sala:error', handler);
            });
            
            const resultado = await Promise.race([responsePromise, timeoutPromise]);
            
            if (!resultado && intentos < maxIntentos) {
                await new Promise(resolve => setTimeout(resolve, 1500));
                return emitirUnirse();
            } else if (!resultado) {
                console.error('[SALA]: Error después de todos los intentos');
                statusText.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Error de conexión. Recargando...';
                setTimeout(() => window.location.reload(), 2000);
            } else {
                console.log('[SALA]: ✅ Conexión exitosa');
            }
        };
        
        await emitirUnirse();
    };
    
    conectarASalaMatchmaking();
    
    socket.on('connect', () => {
        if (salaActual && !socket.hasJoinedSala) {
            console.log('[SALA]: Reconexión detectada');
            setTimeout(() => {
                socket.hasJoinedSala = true;
                socket.emit('sala:unirse', { salaId: salaActual });
            }, 1000);
        }
    });
} else if (salaMatch) {
    salaActual = salaMatch[1];
    console.log('[SALA]: Sala detectada en URL:', salaActual);
    
    btnBuscarCarrera.style.display = 'none';
    btnBuscarGeneral.style.display = 'none';
    btnCancelarBusqueda.style.display = 'inline-block';
    statusText.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Conectando...';
    
    const conectarASala = async () => {
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        let intentos = 0;
        const maxIntentos = 20;
        
        const intentarConexion = async () => {
            intentos++;
            
            if (socket.connected && socket.userId) {
                console.log('[SALA]: Socket listo, conectando...');
                socket.emit('sala:unirse', { salaId: salaActual });
                socket.hasJoinedSala = true;
                return true;
            } else {
                if (intentos >= maxIntentos) {
                    console.error('[SALA]: Timeout');
                    statusText.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Error. Recargando...';
                    setTimeout(() => window.location.reload(), 2000);
                    return false;
                }
                
                await new Promise(resolve => setTimeout(resolve, 400));
                return intentarConexion();
            }
        };
        
        await intentarConexion();
    };
    
    conectarASala();
}

// ================================================================
// INVITACIONES DE LOBBY Y BD
// ================================================================
function buscarJugadorEnLobby(idOponente, username, modoDeseado = 'general') {
    if (idOponente === user.id_usuario) {
        mostrarNotificacion('No puedes desafiarte a ti mismo', 'error');
        return;
    }
    
    console.log(`[LOBBY]: Invitando a ${username}`);
    console.log(`[LOBBY]: Modo deseado: ${modoDeseado}`);
    
    const modoTexto = modoDeseado === 'carrera' ? 'de carrera' : 'general';
    
    statusText.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Invitando a <strong>${username}</strong> (${modoTexto})...`;
    btnBuscarCarrera.style.display = 'none';
    btnBuscarGeneral.style.display = 'none';
    btnCancelarBusqueda.style.display = 'inline-block';

    socket.emit('duelo:invitarLobby', { 
        idOponente: idOponente,
        usernameOponente: username,
        modoDeseado: modoDeseado // ✅ NUEVO: Enviar modo explícito
    });
}

window.buscarJugadorEnLobby = buscarJugadorEnLobby;

socket.on('duelo:invitacionLobbyEnviada', (data) => {
    console.log('[LOBBY]: Invitación enviada');
    statusText.innerHTML = `<i class="fas fa-clock"></i> ${data.mensaje}`;
});

socket.on('duelo:recibirInvitacionLobby', (data) => {
    console.log('[LOBBY]: Invitación recibida de', data.username_retador);
    console.log('[LOBBY]: Modo:', data.modo || 'sin especificar');
    console.log('[LOBBY]: ID Carrera:', data.idCarrera || 'N/A');
    
    // ✅ GUARDAR EL MODO DE LA INVITACIÓN
    modoActualSala = data.modo || 'general';
    
    const modal = document.createElement('div');
    modal.id = 'modal-invitacion-lobby';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    `;
    
    // ✅ MOSTRAR MODO EN LA UI
    const modoTexto = data.modo === 'carrera' ? '🎓 Carrera' : '🌍 General';
    const modoColor = data.modo === 'carrera' ? '#3b82f6' : '#10b981';
    
    modal.innerHTML = `
        <div style="
            background: white;
            padding: 30px;
            border-radius: 15px;
            max-width: 400px;
            text-align: center;
            box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        ">
            <h2 style="margin: 0 0 20px 0; color: #333;">🎮 ¡Desafío Recibido!</h2>
            
            <div style="margin: 20px 0;">
                ${data.foto_retador ? `<img src="${data.foto_retador}" alt="Avatar" style="width: 80px; height: 80px; border-radius: 50%; margin-bottom: 10px;">` : ''}
                <p style="font-size: 18px; color: #555; margin: 10px 0;">
                    <strong>${data.username_retador}</strong> te desafía
                </p>
                <div style="
                    display: inline-block;
                    background: ${modoColor};
                    color: white;
                    padding: 8px 20px;
                    border-radius: 20px;
                    font-size: 14px;
                    font-weight: bold;
                    margin-top: 10px;
                ">
                    ${modoTexto}
                </div>
            </div>
            
            <div style="margin-top: 30px; display: flex; gap: 10px; justify-content: center;">
                <button id="btn-aceptar-lobby" style="
                    background: #28a745;
                    color: white;
                    border: none;
                    padding: 12px 30px;
                    border-radius: 8px;
                    font-size: 16px;
                    font-weight: bold;
                    cursor: pointer;
                ">✓ Aceptar</button>
                <button id="btn-rechazar-lobby" style="
                    background: #dc3545;
                    color: white;
                    border: none;
                    padding: 12px 30px;
                    border-radius: 8px;
                    font-size: 16px;
                    font-weight: bold;
                    cursor: pointer;
                ">✗ Rechazar</button>
            </div>
            
            <p id="countdown-lobby" style="margin-top: 15px; color: #999; font-size: 14px;">
                Expira en 30 segundos
            </p>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    let segundos = 30;
    const countdownEl = document.getElementById('countdown-lobby');
    const countdownInterval = setInterval(() => {
        segundos--;
        if (countdownEl) {
            countdownEl.textContent = `Expira en ${segundos} segundos`;
        }
        if (segundos <= 0) {
            clearInterval(countdownInterval);
            if (modal.parentNode) modal.remove();
        }
    }, 1000);
    
    document.getElementById('btn-aceptar-lobby').addEventListener('click', () => {
        clearInterval(countdownInterval);
        modal.remove();
        
        console.log('[LOBBY]: Aceptando invitación con modo:', data.modo);
        
        // ✅ EMITIR CON MODO
        socket.emit('duelo:aceptarInvitacionLobby', { 
            salaId: data.salaId,
            modo: data.modo,
            idCarrera: data.idCarrera
        });
        
        statusText.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Aceptando desafío...';
    });
    
    document.getElementById('btn-rechazar-lobby').addEventListener('click', () => {
        clearInterval(countdownInterval);
        modal.remove();
        
        socket.emit('duelo:rechazarInvitacionLobby', { salaId: data.salaId });
        mostrarNotificacion('Invitación rechazada', 'info');
    });
});

socket.on('duelo:redirigirASala', ({ salaId, mensaje }) => {
    console.log('[REDIRECCIÓN]:', mensaje);
    
    const currentPath = window.location.pathname;
    const expectedPath = `/competitivo/sala/${salaId}`;
    
    if (currentPath !== expectedPath) {
        statusText.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${mensaje}`;
        
        setTimeout(() => {
            window.location.href = `${expectedPath}?origen=socket`;
        }, 1500);
    }
});

socket.on('duelo:invitacionExpirada', (data) => {
    const modal = document.getElementById('modal-invitacion-lobby');
    if (modal) modal.remove();
    
    mostrarNotificacion(data.mensaje, 'info');
    
    if (statusText && statusText.textContent.includes('Esperando')) {
        statusText.textContent = 'Compite en tu área de especialidad o en cultura general.';
    }
});

socket.on('duelo:invitacionLobbyRechazada', (data) => {
    mostrarNotificacion(data.mensaje, 'error');
    restaurarBusqueda(data.mensaje);
});

socket.on('duelo:invitacionLobbyError', (data) => {
    mostrarNotificacion(data.mensaje, 'error');
    restaurarBusqueda(data.mensaje);
});

// ================================================================
// DESAFÍOS BD
// ================================================================
async function enviarDesafioBD(idOponente, usernameOponente, btnElement) {
    if (parseInt(idOponente) === parseInt(user.id_usuario)) {
        mostrarNotificacion('No puedes desafiarte a ti mismo', 'error');
        return;
    }

    console.log(`[BD DESAFÍO]: Enviando a ${usernameOponente}`);
    console.log(`[BD DESAFÍO]: (El modo se detectará automáticamente en el servidor)`);
    
    if (btnElement) {
        btnElement.disabled = true;
        btnElement.textContent = 'Enviando...';
    }
    
    try {
        const response = await fetch(`/desafio/duelo/${idOponente}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                // ✅ NO ENVIAR MODO - EL SERVIDOR LO DETECTA
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Error ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.salaId) {
            console.log(`[BD DESAFÍO]: ✅ Enviado. Sala: ${data.salaId}`);
            console.log(`[BD DESAFÍO]: Modo detectado: ${data.modo}`);
            console.log(`[BD DESAFÍO]: ID Carrera: ${data.idCarrera || 'N/A'}`);
            
            // ✅ GUARDAR MODO
            modoActualSala = data.modo;
            
            const modoTexto = data.modo === 'carrera' ? 'de carrera' : 'general';
            
            mostrarNotificacion(
                `✅ Desafío ${modoTexto} enviado a ${usernameOponente}`, 
                'success'
            );
            
            statusText.innerHTML = `<i class="fas fa-paper-plane"></i> Desafío ${modoTexto} enviado a <strong>${usernameOponente}</strong>`;
            
            setTimeout(() => {
                statusText.textContent = 'Compite en tu área de especialidad o en cultura general.';
            }, 5000);
        } else {
            throw new Error(data.message || 'Respuesta inválida');
        }
        
    } catch (error) {
        console.error('[BD DESAFÍO ERROR]:', error);
        
        let mensajeError = error.message;
        
        if (error.message.includes('Ya tienes un desafío pendiente')) {
            mensajeError = '⏱️ Ya enviaste un desafío. Espera 5 minutos.';
        }
        
        mostrarNotificacion(mensajeError, 'error');
        
    } finally {
        if (btnElement) {
            btnElement.disabled = false;
            btnElement.textContent = 'Invitar Notif 📧';
        }
    }
}

// ✅ MANTENER EXPORT GLOBAL
window.enviarDesafioBD = enviarDesafioBD;

socket.on('duelo:desafioAceptado', ({ mensaje, salaId }) => {
    console.log('[BD]: Desafío aceptado por el oponente');
    
    mostrarNotificacion(mensaje, 'success');
    
    statusText.innerHTML = `<i class="fas fa-check-circle"></i> ${mensaje}`;
    
    btnBuscarCarrera.style.display = 'none';
    btnBuscarGeneral.style.display = 'none';
    btnCancelarBusqueda.style.display = 'inline-block';
    btnCancelarBusqueda.textContent = 'Conectando...';
    btnCancelarBusqueda.disabled = true;
});

socket.on('duelo:desafioRechazado', ({ mensaje }) => {
    mostrarNotificacion(mensaje, 'error');
    
    if (salaActual) {
        statusText.innerHTML = `<i class="fas fa-times-circle"></i> ${mensaje}`;
        
        setTimeout(() => {
            window.location.href = '/matchmaking';
        }, 2000);
    }
});

// ================================================================
// RANKINGS
// ================================================================

function renderizarRanking(container, jugadores, modo = 'general') {
    container.innerHTML = '';
    
    if (!jugadores || !Array.isArray(jugadores) || jugadores.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #94a3b8;">No hay jugadores en este ranking.</p>';
        return;
    }

    if (!user || !user.id_usuario) {
        console.error('❌ ERROR: user.id_usuario no disponible en renderizarRanking');
        container.innerHTML = '<p style="color: red;">Error: No se pudo cargar tu información de usuario.</p>';
        return;
    }

    const miUserId = parseInt(user.id_usuario);
    
    console.log(`[RANKING]: ═══════════════════════════════════════`);
    console.log(`[RANKING]: Renderizando ${jugadores.length} jugadores en modo ${modo}`);
    console.log(`[RANKING]: Usuario actual: ${miUserId} (${user.username})`);
    console.log(`[RANKING]: ═══════════════════════════════════════`);

    jugadores.forEach((jugador, index) => {
        if (!jugador || !jugador.id_usuario) {
            console.warn(`[RANKING]: Jugador en índice ${index} sin id_usuario:`, jugador);
            return;
        }

        const jugadorId = parseInt(jugador.id_usuario);
        
        if (jugadorId === miUserId) {
            console.log(`[RANKING]: ⏩ Filtrando jugador actual (${miUserId})`);
            return;
        }

        const item = document.createElement('div');
        item.className = 'player-item';
        
        // ✅ CRÍTICO: Pasar modo correcto a los botones
        item.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <img src="${jugador.foto_perfil || '/uploads/default_avatar.png'}" 
                     alt="Avatar" 
                     class="avatar"
                     onerror="this.src='/uploads/default_avatar.png'">
                <div class="player-info">
                    <strong>${jugador.username || 'Usuario'}</strong>
                    <p>${jugador.puntos || 0} puntos</p>
                </div>
            </div>
            <div class="player-actions">
                <button class="btn-buscar" 
                        onclick="buscarJugadorEnLobby(${jugadorId}, '${(jugador.username || '').replace(/'/g, "\\'")}', '${modo}')">
                    Invitar Lobby 👤
                </button>
                <button class="btn-notificar" 
                        onclick="enviarDesafioBD(${jugadorId}, '${(jugador.username || '').replace(/'/g, "\\'")}', this, '${modo}')">
                    Invitar Notif 📧
                </button>
            </div>
        `;
        
        container.appendChild(item);
    });

    console.log(`[RANKING]: ✅ Renderizado completado (${jugadores.length - 1} cards mostrados)`);
}

async function cargarRankingGlobal() {
    const container = document.getElementById('rankingGlobalContainer');
    
    if (!container) {
        console.error('❌ ERROR: rankingGlobalContainer no encontrado');
        return;
    }

    try {
        container.innerHTML = '<p style="text-align: center;">⏳ Cargando ranking...</p>';
        
        console.log('[RANKING GLOBAL]: 🔍 Iniciando carga...');
        
        const response = await fetch('/api/ranking/global/com');
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const jugadores = await response.json();
        
        console.log('[RANKING GLOBAL]: ✅ Datos recibidos:', {
            totalJugadores: jugadores.length,
            primerosJugadores: jugadores.slice(0, 3).map(j => ({
                id_usuario: j.id_usuario,
                username: j.username,
                puntos: j.puntos
            }))
        });
        
        // ✅ PASAR 'general' COMO MODO
        renderizarRanking(container, jugadores, 'general');
        
    } catch (error) {
        console.error('[RANKING GLOBAL ERROR]:', error);
        container.innerHTML = `
            <p style="color: red; text-align: center;">
                ❌ Error al cargar ranking: ${error.message}
                <br>
                <button onclick="cargarRankingGlobal()" style="margin-top: 10px; cursor: pointer; padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 6px;">
                    🔄 Reintentar
                </button>
            </p>
        `;
    }
}

async function cargarRankingCarrera(idCarrera) {
    const container = document.getElementById('rankingCarreraContainer');
    
    if (!idCarrera) {
        container.innerHTML = '<p>Selecciona una carrera.</p>';
        return;
    }
    
    try {
        container.innerHTML = '<p style="text-align: center;">⏳ Cargando ranking...</p>';
        
        const response = await fetch(`/com/api/ranking/carrera/${idCarrera}`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const jugadores = await response.json();
        
        // ✅ PASAR 'carrera' COMO MODO
        renderizarRanking(container, jugadores, 'carrera');
        
    } catch (error) {
        console.error('Error cargando ranking de carrera:', error);
        container.innerHTML = `
            <p style="color: red; text-align: center;">
                ❌ Error al cargar ranking
                <br>
                <button onclick="cargarRankingCarrera(document.getElementById('selectorCarrera').value)" 
                        style="margin-top: 10px; cursor: pointer; padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 6px;">
                    🔄 Reintentar
                </button>
            </p>
        `;
    }
}

// Pestañas
document.querySelectorAll('.tab-link').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.tab-link').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        const target = document.getElementById(tab.dataset.tab);
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        target.classList.add('active');
        
        if (tab.dataset.tab === 'tab-carrera') {
            cargarRankingCarrera(document.getElementById('selectorCarrera').value);
        } else {
            cargarRankingGlobal();
        }
    });
});

document.getElementById('selectorCarrera').addEventListener('change', (e) => {
    cargarRankingCarrera(e.target.value);
});

// ================================================================
// OTROS EVENTOS
// ================================================================
socket.on('duelo:oponenteAbandono', (data) => {
    mostrarNotificacion(data.mensaje, 'info');
    setTimeout(() => {
        window.location.href = '/matchmaking';
    }, 2000);
});

socket.on('duelo:error', (data) => {
    console.error('[DUELO ERROR]:', data);
    mostrarNotificacion('Error: ' + data.mensaje, 'error');
});

socket.on('duelo:error:sinCarrera', (data) => {
    mostrarNotificacion(data.mensaje, 'error');
    restaurarBusqueda(data.mensaje);
});
// ================================================================
// SISTEMA DE MANEJO DE ABANDONOS Y ERRORES - CLIENTE
// Agregar al final de tu script actual en matchmaking.html
// ================================================================

// ================================================================
// VARIABLES GLOBALES PARA CONTROL DE ABANDONOS
// ================================================================


let tiempoUltimaInteraccion = Date.now();

// ================================================================
// 🔥 FUNCIÓN: Detectar si hay duelo activo
// ================================================================



function actualizarEstadoDuelo(activo, sala = null) {
    dueloActivo = activo;
    
    const btnAbandono = document.getElementById('btnAbandonarDuelo');
    
    if (activo) {
        // ✅ DUELO ACTIVO - MOSTRAR BOTÓN
        salaActual = sala?.salaId || salaId;
        
        if (btnAbandono) {
            btnAbandono.style.display = 'flex';
            btnAbandono.classList.add('visible');
            console.log('[ESTADO DUELO]: ✅ Botón ABANDONAR visible');
        }
        
        console.log(`[ESTADO DUELO]: ✅ DUELO ACTIVO en sala ${salaActual}`);
        
    } else {
        // ❌ DUELO INACTIVO - OCULTAR BOTÓN
        if (btnAbandono) {
            btnAbandono.style.display = 'none';
            btnAbandono.classList.remove('visible');
            console.log('[ESTADO DUELO]: ❌ Botón ABANDONAR oculto');
        }
        
        salaActual = null;
        modoActualDuelo = null;
        idCarreraActual = null;
        
        console.log('[ESTADO DUELO]: ❌ Duelo INACTIVO');
    }
}
// ================================================================
// 🛡️ PREVENCIÓN DE SALIDA ACCIDENTAL (beforeunload)
// ================================================================


window.addEventListener('load', () => {
    if (window.location.pathname.includes('/competitivo/sala/')) {
        // Agregar entrada al historial para poder detectar "atrás"
        window.history.pushState(null, '', window.location.href);
        console.log('[INIT]: ✅ Prevención de "atrás" activada');
    }
});


// ================================================================
// 🚪 INTERCEPTAR NAVEGACIÓN DEL BROWSER (popstate)
// ================================================================



window.addEventListener('popstate', (event) => {
    if (dueloActivo && !intentandoSalir) {
        console.log('[POPSTATE]: ⚠️ Usuario presionó ATRÁS');
        
        // Prevenir navegación
        event.preventDefault();
        window.history.pushState(null, '', window.location.href);
        
        // Marcar motivo
        motivoSalida = 'navegacion';
        
        // Mostrar modal
        mostrarModalConfirmarSalida('navegacion');
    }
});

window.addEventListener('beforeunload', (e) => {
    if (dueloActivo && !intentandoSalir) {
        console.log('[BEFOREUNLOAD]: ⚠️ Usuario intenta cerrar navegador');
        
        // ✅ MARCAR MOTIVO
        motivoSalida = 'navegacion';
        
        // ✅ INFORMAR AL SERVIDOR INMEDIATAMENTE
        socket.emit('duelo:abandonoRapido', {
            salaId: salaActual || salaId,
            userId: user.id_usuario,
            motivo: 'navegacion'
        });
        
        // Mostrar advertencia estándar del navegador
        e.preventDefault();
        e.returnValue = '¿Seguro que quieres salir? Perderás el duelo.';
        return e.returnValue;
    }
});
// Agregar estado inicial al historial
if (window.location.pathname.includes('/competitivo/sala/')) {
    window.history.pushState(null, '', window.location.href);
}

// Agregar estado inicial al historial para poder detectar "atrás"
if (window.location.pathname.includes('/competitivo/sala/')) {
    window.history.pushState(null, '', window.location.href);
}

// ================================================================
// 🎯 BOTÓN DE ABANDONAR DUELO
// ================================================================

document.getElementById('btnAbandonarDuelo').addEventListener('click', () => {
    if (!dueloActivo) return;
    
    mostrarModalConfirmarSalida('voluntario');
});

// ================================================================
// 🚪 BOTÓN DE ABANDONAR DUELO - CLICK EVENT
// =

document.addEventListener('DOMContentLoaded', () => {
    const btnAbandono = document.getElementById('btnAbandonarDuelo');
    
    if (btnAbandono) {
        btnAbandono.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            if (!dueloActivo) {
                console.warn('[ABANDONO BTN]: No hay duelo activo');
                return;
            }
            
            console.log('[ABANDONO BTN]: 🚪 Usuario presionó ABANDONAR');
            
            // ✅ MARCAR COMO ABANDONO VOLUNTARIO
            motivoSalida = 'voluntario';
            
            // Mostrar modal
            mostrarModalConfirmarSalida('voluntario');
        });
        
        console.log('[INIT]: ✅ Listener de botón abandonar registrado');
    } else {
        console.error('[INIT]: ❌ Botón #btnAbandonarDuelo NO encontrado en DOM');
    }
});

// ================================================================
// 📱 MOSTRAR MODAL DE CONFIRMACIÓN
// ================================================================

function mostrarModalConfirmarSalida(motivo) {
    const modal = document.getElementById('modalConfirmarSalida');
    const mensajeSalida = document.getElementById('mensajeSalida');
    const penalizacionInfo = document.getElementById('penalizacionInfo');
    const cantidadPenalizacion = document.getElementById('cantidadPenalizacion');
    
    if (!modal) {
        console.error('[MODAL SALIDA]: ❌ Modal no encontrado');
        return;
    }
    
    // ✅ Obtener apuesta y modo actual
    const apuestaTexto = document.getElementById('apuestaActual')?.textContent || '0';
    const apuesta = parseInt(apuestaTexto.match(/\d+/)?.[0] || 0);
    
    // ✅ Detectar modo actual
    const esCarrera = modoActualDuelo === 'carrera';
    const tipoPuntos = esCarrera ? 'de carrera' : 'globales';
    
    let mensaje = '';
    let penalizacion = 0;
    
    console.log('[MODAL SALIDA]:', {
        motivo,
        apuesta,
        modo: modoActualDuelo,
        esCarrera,
        idCarrera: idCarreraActual
    });
    
    // ✅ Calcular penalización según motivo
    if (motivo === 'voluntario' || motivo === 'rendirse') {
        // 30% para rendirse voluntariamente
        penalizacion = Math.floor(apuesta * 0.30);
        
        mensaje = `⚠️ Si te rindes voluntariamente:\n\n` +
                 `• Perderás ${penalizacion} puntos ${tipoPuntos} (30% de apuesta)\n` +
                 `• Tu oponente ganará ${penalizacion} puntos ${tipoPuntos}\n` +
                 `• Se registrará como derrota\n\n` +
                 `💡 Consejo: Si continúas jugando, aún puedes ganar.`;
        
    } else if (motivo === 'navegacion') {
        // 50% por cerrar navegador
        penalizacion = Math.floor(apuesta * 0.50);
        
        mensaje = `⚠️ Estás intentando salir del duelo:\n\n` +
                 `• Si sales ahora perderás ${penalizacion} puntos ${tipoPuntos} (50%)\n` +
                 `• El duelo contará como derrota\n` +
                 `• Tu oponente ganará automáticamente\n\n` +
                 `💡 ¿Quieres rendirte o continuar jugando?`;
    }
    
    mensajeSalida.textContent = mensaje;
    
    // Mostrar/ocultar información de penalización
    if (penalizacion > 0) {
        penalizacionInfo.style.display = 'block';
        cantidadPenalizacion.textContent = `${penalizacion} pts`;
    } else {
        penalizacionInfo.style.display = 'none';
    }
    
    // Mostrar modal
    modal.classList.add('visible');
    
    console.log(`[MODAL SALIDA]: Modal mostrado - Penalización: ${penalizacion} pts ${tipoPuntos}`);
}

// ================================================================
// ❌ BOTÓN: CANCELAR SALIDA
// ================================================================

document.addEventListener('DOMContentLoaded', () => {
    const btnCancelar = document.getElementById('btnCancelarSalida');
    
    if (btnCancelar) {
        btnCancelar.addEventListener('click', () => {
            const modal = document.getElementById('modalConfirmarSalida');
            if (modal) {
                modal.classList.remove('visible');
            }
            
            // ✅ Resetear motivo
            motivoSalida = null;
            
            console.log('[MODAL SALIDA]: Usuario CANCELÓ la salida');
        });
    }
});

// ================================================================
// ✅ BOTÓN: CONFIRMAR RENDICIÓN
// ================================================================

document.addEventListener('DOMContentLoaded', () => {
    const btnConfirmar = document.getElementById('btnConfirmarSalida');
    
    if (btnConfirmar) {
        btnConfirmar.addEventListener('click', () => {
            const modal = document.getElementById('modalConfirmarSalida');
            if (modal) {
                modal.classList.remove('visible');
            }
            
            // ✅ MARCAR COMO INTENTO DE SALIDA CONFIRMADO
            intentandoSalir = true;
            
            console.log('═══════════════════════════════════════════════════════════');
            console.log('[CONFIRMAR SALIDA]: ✅ Usuario CONFIRMÓ rendición');
            console.log(`   - Sala: ${salaActual || salaId}`);
            console.log(`   - Usuario: ${user.id_usuario}`);
            console.log(`   - Motivo: ${motivoSalida || 'rendirse'}`);
            console.log(`   - Modo: ${modoActualDuelo}`);
            console.log('═══════════════════════════════════════════════════════════');
            
            // ✅ EMITIR EVENTO CORRECTO AL SERVIDOR
            socket.emit('duelo:confirmarRendicion', {
                salaId: salaActual || salaId,
                userId: user.id_usuario,
                motivo: motivoSalida || 'rendirse',
                modo: modoActualDuelo,
                idCarrera: idCarreraActual
            });
            
            // ✅ Mostrar indicador de procesamiento
            const procesando = document.createElement('div');
            procesando.id = 'procesandoRendicion';
            procesando.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(0,0,0,0.95);
                color: white;
                padding: 40px 60px;
                border-radius: 20px;
                z-index: 10001;
                text-align: center;
                box-shadow: 0 10px 40px rgba(0,0,0,0.5);
            `;
            procesando.innerHTML = `
                <div style="
                    width: 60px;
                    height: 60px;
                    border: 5px solid rgba(255,255,255,0.2);
                    border-top-color: #3b82f6;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin: 0 auto 20px auto;
                "></div>
                <h3 style="margin: 0; font-size: 18px;">Procesando rendición...</h3>
                <style>
                    @keyframes spin {
                        to { transform: rotate(360deg); }
                    }
                </style>
            `;
            document.body.appendChild(procesando);
            
            // ✅ Timeout de seguridad (5 segundos)
            const timeoutRedirect = setTimeout(() => {
                console.warn('[CONFIRMAR SALIDA]: ⏰ Timeout - Redirigiendo manualmente');
                window.location.href = '/matchmaking';
            }, 5000);
            
            window.abandonoTimeout = timeoutRedirect;
        });
    }
});
// ================================================================
// 📡 LISTENERS DE SERVIDOR
// ================================================================

socket.on('duelo:abandonoConfirmado', (data) => {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('[ABANDONO CONFIRMADO]:', data);
    console.log('═══════════════════════════════════════════════════════════');
    
    // ✅ Cancelar timeout de seguridad
    if (window.abandonoTimeout) {
        clearTimeout(window.abandonoTimeout);
        window.abandonoTimeout = null;
    }
    
    // ✅ Quitar indicador de procesamiento
    const procesando = document.getElementById('procesandoRendicion');
    if (procesando) {
        procesando.remove();
    }
    
    const pantalla = document.getElementById('pantallaAbandono');
    const tituloAbandono = document.getElementById('tituloAbandono');
    const mensajeAbandono = document.getElementById('mensajeAbandono');
    const iconoAbandono = document.getElementById('iconoAbandono');
    const penalizacionAbandono = document.getElementById('penalizacionAbandono');
    const apuestaAbandono = document.getElementById('apuestaAbandono');
    
    if (!pantalla) {
        console.error('[ABANDONO CONFIRMADO]: ❌ Pantalla no encontrada');
        
        // ✅ Fallback: Redirigir después de 2 segundos
        alert(`Has abandonado. Penalización: -${data.penalizacion} pts`);
        setTimeout(() => {
            window.location.href = '/matchmaking';
        }, 2000);
        return;
    }
    
    // Actualizar contenido
    iconoAbandono.textContent = data.icono || '😔';
    tituloAbandono.textContent = data.motivo === 'rendirse' ? 'Te Rendiste' : 'Has Abandonado';
    mensajeAbandono.textContent = data.mensaje;
    
    penalizacionAbandono.textContent = data.penalizacion > 0 ? `-${data.penalizacion} pts` : '0 pts';
    apuestaAbandono.textContent = data.apuesta > 0 ? `${data.apuesta} pts` : 'Sin apuesta';
    
    // Mostrar pantalla
    pantalla.classList.add('visible');
    
    // Ocultar duelo
    const dueloView = document.getElementById('dueloView');
    if (dueloView) {
        dueloView.style.display = 'none';
    }
    
    // ✅ Desactivar estado de duelo
    actualizarEstadoDuelo(false);
    
    // ✅ REDIRECCIÓN AUTOMÁTICA después de 3 segundos
    setTimeout(() => {
        console.log('[ABANDONO CONFIRMADO]: 🚪 Redirigiendo al portal...');
        window.location.href = '/matchmaking';
    }, 3000);
});


socket.on('duelo:oponenteAbandono', (data) => {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('[OPONENTE ABANDONÓ]:', data);
    console.log('═══════════════════════════════════════════════════════════');
    
    const pantalla = document.getElementById('pantallaVictoriaAbandono');
    const mensajeVictoria = document.getElementById('mensajeVictoriaAbandono');
    const gananciaVictoria = document.getElementById('gananciaVictoria');
    
    if (!pantalla) {
        console.error('[OPONENTE ABANDONÓ]: ❌ Pantalla no encontrada');
        
        // ✅ Mostrar notificación y redirigir
        alert(`¡Victoria! Tu oponente abandonó. Ganaste ${data.ganancia || 0} pts`);
        setTimeout(() => {
            window.location.href = '/matchmaking';
        }, 2000);
        return;
    }
    
    // Actualizar contenido
    mensajeVictoria.textContent = data.mensaje;
    gananciaVictoria.textContent = `+${data.ganancia || 0} pts`;
    
    // ✅ Lanzar confetti
    lanzarConfettiVictoria();
    
    // Mostrar pantalla
    pantalla.classList.add('visible');
    
    // Ocultar duelo
    const dueloView = document.getElementById('dueloView');
    if (dueloView) {
        dueloView.style.display = 'none';
    }
    
    // ✅ Desactivar estado de duelo
    actualizarEstadoDuelo(false);
    
    // ✅ REDIRECCIÓN AUTOMÁTICA después de 5 segundos
    setTimeout(() => {
        window.location.href = '/matchmaking';
    }, 5000);
});


// ================================================================
// 🔄 BOTONES DE VOLVER AL PORTAL
// ================================================================

document.addEventListener('DOMContentLoaded', () => {
    const btnVolverAbandono = document.getElementById('btnVolverPortalAbandono');
    const btnVolverVictoria = document.getElementById('btnVolverPortalVictoria');
    const btnVolverError = document.getElementById('btnVolverPortalError');
    
    if (btnVolverAbandono) {
        btnVolverAbandono.addEventListener('click', () => {
            console.log('[VOLVER PORTAL]: Abandono');
            if (window.abandonoTimeout) clearTimeout(window.abandonoTimeout);
            window.location.href = '/matchmaking';
        });
    }
    
    if (btnVolverVictoria) {
        btnVolverVictoria.addEventListener('click', () => {
            console.log('[VOLVER PORTAL]: Victoria');
            window.location.href = '/matchmaking';
        });
    }
    
    if (btnVolverError) {
        btnVolverError.addEventListener('click', () => {
            console.log('[VOLVER PORTAL]: Error');
            window.location.href = '/matchmaking';
        });
    }
});

// ✅ OPONENTE SE RECONECTÓ
socket.on('duelo:oponenteReconectado', (data) => {
    console.log('[OPONENTE RECONECTADO]:', data);
    
    // Ocultar indicador de desconexión
    const indicador = document.getElementById('indicadorDesconexion');
    indicador.classList.remove('visible');
    
    // Mostrar notificación de reconexión
    const notif = document.getElementById('notificacionReconexion');
    const mensajeReconexion = document.getElementById('mensajeReconexion');
    
    mensajeReconexion.textContent = data.mensaje;
    notif.classList.add('visible');
    
    // Ocultar después de 3 segundos
    setTimeout(() => {
        notif.classList.remove('visible');
    }, 3000);
});

// ❌ ERROR CRÍTICO
socket.on('duelo:errorCritico', (data) => {
    console.error('[ERROR CRÍTICO]:', data);
    
    const pantalla = document.getElementById('pantallaError');
    const mensajeError = document.getElementById('mensajeError');
    const codigoError = document.getElementById('codigoError');
    
    mensajeError.textContent = data.mensaje || 'Hubo un problema con el duelo. No te preocupes, tus puntos están seguros.';
    codigoError.textContent = data.codigo || 'ERR_UNKNOWN';
    
    pantalla.classList.add('visible');
    
    dueloView.style.display = 'none';
    dueloActivo = false;
});

// ================================================================
// 🔄 BOTONES DE VOLVER AL PORTAL
// ================================================================

document.getElementById('btnVolverPortalAbandono').addEventListener('click', () => {
    console.log('[ABANDONO]: Volver al portal manualmente');
    
    // Cancelar cualquier timeout pendiente
    if (window.abandonoTimeout) {
        clearTimeout(window.abandonoTimeout);
    }
    
    window.location.href = '/matchmaking';
});

document.getElementById('btnVolverPortalVictoria').addEventListener('click', () => {
    console.log('[VICTORIA]: Volver al portal');
    window.location.href = '/matchmaking';
});

document.getElementById('btnVolverPortalError').addEventListener('click', () => {
    console.log('[ERROR]: Volver al portal');
    window.location.href = '/matchmaking';
});

// ================================================================
// 📝 BOTÓN: Reportar Error
// ================================================================

document.getElementById('btnReportarError').addEventListener('click', () => {
    const codigoError = document.getElementById('codigoError').textContent;
    
    socket.emit('duelo:reportarError', {
        salaId: salaActual || salaId,
        userId: user.id_usuario,
        error: codigoError,
        contexto: {
            duelo: dueloActivo,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href
        }
    });
    
    mostrarNotificacion('✅ Error reportado. Gracias por tu ayuda.', 'success');
});

socket.on('duelo:errorRegistrado', (data) => {
    console.log('[ERROR REGISTRADO]:', data.mensaje);
});

// ================================================================
// 🎨 FUNCIÓN: Lanzar confetti en victoria por abandono
// ================================================================


function lanzarConfettiVictoria() {
    const canvas = document.getElementById('confettiVictoria');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const confettiPieces = [];
    const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8'];
    
    for (let i = 0; i < 200; i++) {
        confettiPieces.push({
            x: Math.random() * canvas.width,
            y: -50,
            w: Math.random() * 12 + 6,
            h: Math.random() * 12 + 6,
            color: colors[Math.floor(Math.random() * colors.length)],
            speedY: Math.random() * 4 + 3,
            speedX: Math.random() * 3 - 1.5,
            rotation: Math.random() * 360,
            rotationSpeed: Math.random() * 10 - 5
        });
    }
    
    function animateConfetti() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        confettiPieces.forEach((piece, index) => {
            ctx.save();
            ctx.translate(piece.x, piece.y);
            ctx.rotate(piece.rotation * Math.PI / 180);
            ctx.fillStyle = piece.color;
            ctx.fillRect(-piece.w / 2, -piece.h / 2, piece.w, piece.h);
            ctx.restore();
            
            piece.y += piece.speedY;
            piece.x += piece.speedX;
            piece.rotation += piece.rotationSpeed;
            
            if (piece.y > canvas.height) {
                confettiPieces.splice(index, 1);
            }
        });
        
        if (confettiPieces.length > 0) {
            requestAnimationFrame(animateConfetti);
        }
    }
    
    animateConfetti();
}

// ================================================================
// 🔧 INTEGRACIÓN CON TUS EVENTOS EXISTENTES
// ================================================================

// Modificar evento 'duelo:dueloListo' existente
const originalDueloListo = socket._callbacks['$duelo:dueloListo'];
socket.off('duelo:dueloListo');

socket.on('duelo:dueloListo', (data) => {
    console.log('[DUELO LISTO]: Activando protección de abandono...');
    
    // Ejecutar handler original si existe
    if (originalDueloListo && originalDueloListo.length > 0) {
        originalDueloListo[0](data);
    }
    
    // Activar protección después de 5 segundos
    setTimeout(() => {
        actualizarEstadoDuelo(true);
    }, 5000);
});

// Modificar evento 'duelo:finalizado' existente
const originalDueloFinalizado = socket._callbacks['$duelo:finalizado'];
socket.off('duelo:finalizado');



// ================================================================
// 🎯 MONITOREO DE ACTIVIDAD (para detectar AFK)
// ================================================================

const TIEMPO_AFK = 30000; // 30 segundos sin interacción = AFK

function actualizarActividad() {
    tiempoUltimaInteraccion = Date.now();
}

// Detectar actividad del usuario
document.addEventListener('click', actualizarActividad);
document.addEventListener('keypress', actualizarActividad);
document.addEventListener('mousemove', actualizarActividad);

// Verificar AFK cada 10 segundos
setInterval(() => {
    if (dueloActivo) {
        const tiempoInactivo = Date.now() - tiempoUltimaInteraccion;
        
        if (tiempoInactivo > TIEMPO_AFK) {
            console.warn('[AFK]: Usuario inactivo por', Math.floor(tiempoInactivo / 1000), 'segundos');
            // Opcional: Mostrar advertencia
        }
    }
}, 10000);

// ================================================================
// 🚀 LOG DE INICIALIZACIÓN
// ================================================================

console.log('═══════════════════════════════════════════════════════════');
console.log('[SISTEMA ABANDONOS]: ✅ Sistema de manejo de abandonos inicializado');
console.log('[SISTEMA ABANDONOS]: - Prevención de salida accidental: ACTIVO');
console.log('[SISTEMA ABANDONOS]: - Detección de navegación: ACTIVO');
console.log('[SISTEMA ABANDONOS]: - Monitoreo de desconexiones: ACTIVO');
console.log('[SISTEMA ABANDONOS]: - Sistema de reconexión: ACTIVO');
console.log('═══════════════════════════════════════════════════════════');
socket.on('disconnect', () => {
    console.log('[SOCKET]: Desconectado');
});

// ================================================================
// FUNCIÓN AUXILIAR: MOSTRAR NOTIFICACIONES
// ================================================================

// Añadir estilos de animación
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
    
    .btn-quiero-apostar {
        padding: 15px 35px;
        font-size: 1.2rem;
        font-weight: bold;
        border: 2px solid rgba(16, 185, 129, 0.5);
        border-radius: 12px;
        cursor: pointer;
        transition: all 0.3s ease;
        background: linear-gradient(135deg, #10b981, #059669);
        color: white;
        box-shadow: 0 8px 20px rgba(16, 185, 129, 0.3);
    }
    
    .btn-quiero-apostar:hover {
        transform: translateY(-3px);
        box-shadow: 0 12px 30px rgba(16, 185, 129, 0.5);
    }
    
    .btn-quiero-apostar.activo {
        background: linear-gradient(135deg, #fbbf24, #f59e0b);
        border-color: #fbbf24;
        animation: pulseGlow 2s ease-in-out infinite;
    }
    
    @keyframes pulseGlow {
        0%, 100% {
            box-shadow: 0 8px 20px rgba(251, 191, 36, 0.4);
        }
        50% {
            box-shadow: 0 12px 40px rgba(251, 191, 36, 0.7);
        }
    }
    
    .info-apuesta-draft {
        color: #94a3b8;
        font-size: 0.9rem;
        margin-top: 10px;
    }
    
    .apuesta-container-draft {
        margin: 25px 0;
    }
    
    .btn-gambito.activo {
        background: linear-gradient(135deg, #f59e0b, #d97706);
        border-color: #f59e0b;
        transform: scale(1.05);
    }
    
    .btn-gambito {
        padding: 12px 25px;
        font-size: 1.1rem;
        font-weight: bold;
        border: 2px solid rgba(139, 92, 246, 0.5);
        border-radius: 10px;
        cursor: pointer;
        transition: all 0.3s ease;
        background: linear-gradient(135deg, #8b5cf6, #7c3aed);
        color: white;
        box-shadow: 0 6px 15px rgba(139, 92, 246, 0.3);
    }
    
    .gambito-container {
        margin: 20px 0;
        text-align: center;
    }
    
    .gambito-info {
        color: #94a3b8;
        font-size: 0.85rem;
        margin-top: 8px;
    }
`;
document.head.appendChild(style);

// ================================================================
// INICIALIZACIÓN
// ================================================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('[INIT]: Portal cargado');
    
    cargarRankingGlobal();
    
    try {
        const resCarreras = await fetch('/com/api/usuario/carreras');
        const carreras = await resCarreras.json();
        const selectorCarrera = document.getElementById('selectorCarrera');
        
        selectorCarrera.innerHTML = '<option value="">Selecciona tu carrera</option>';
        
        carreras.forEach(carrera => {
            const option = document.createElement('option');
            option.value = carrera.id_carrera;
            option.textContent = carrera.descripcion;
            selectorCarrera.appendChild(option);
        });
    } catch (error) {
        console.error('Error cargando carreras:', error);
    }
});

// ================================================================
// CLEANUP
// ================================================================
window.addEventListener('beforeunload', () => {
    if (user?.id_usuario) {
        socket.emit('competitivo:salirPortal', user.id_usuario);
    }
    if (salaActual) {
        socket.emit('sala:salir', { salaId: salaActual });
    }
});

// ✅✅✅ Detectar cierre de navegador
window.addEventListener('beforeunload', (e) => {
    if (dueloActivo && !intentandoSalir) {
        // ✅ Informar al servidor INMEDIATAMENTE
        socket.emit('duelo:abandonoRapido', {
            salaId: salaActual || salaId,
            userId: user.id_usuario
        });
        
        // Mostrar advertencia
        e.preventDefault();
        e.returnValue = '';
    }
});

// Handler para abandono rápido en el servidor
socket.on('duelo:abandonoRapido', async ({ salaId, userId }) => {
    console.log(`[ABANDONO RÁPIDO]: Usuario ${userId} cerró navegador`);
    
    try {
        await procesarAbandono(
            salaId, 
            userId, 
            MOTIVOS_ABANDONO.NAVEGACION, // 50% penalización
            io
        );
    } catch (error) {
        console.error('[ABANDONO RÁPIDO ERROR]:', error);
    }
});
// ================================================================
// ✅ LISTENER: MOSTRAR ANIMACIÓN DE CARGA
// ================================================================

socket.on('duelo:mostrarAnimacionCarga', ({ mensaje, duracion }) => {
    console.log('[ANIMACIÓN CARGA]: Mostrando animación...');
    
    // Banco de preguntas ejemplo
    const preguntasEjemplo = [
        "¿Cuál es la capital de Francia?",
        "¿Quién pintó la Mona Lisa?",
        "¿En qué año llegó el hombre a la Luna?",
        "¿Cuál es el río más largo del mundo?",
        "¿Quién escribió Don Quijote?",
        "¿Cuál es la fórmula del agua?",
        "¿Cuántos continentes hay?",
        "¿Qué es un algoritmo?",
        "¿Cuál es la velocidad de la luz?",
        "¿Quién descubrió América?",
        "¿Cuál es el planeta más grande?",
        "¿Qué es una base de datos?",
        "¿Cuál es la capital de Japón?",
        "¿Quién fue Albert Einstein?",
        "¿Qué es Python?",
        "¿Cuál es el océano más grande?",
        "¿Qué es JavaScript?",
        "¿Cuántos días tiene un año bisiesto?",
        "¿Qué es HTML?",
        "¿Quién fue Isaac Newton?",
        "¿Qué es CSS?",
        "¿Cuál es el metal más pesado?",
        "¿Qué es React?",
        "¿Cuál es la montaña más alta?",
        "¿Qué es Node.js?"
    ];
    
    // Mostrar modal
    const modal = document.getElementById('modalCargaPreguntas');
    modal.style.display = 'flex';
    
    // Limpiar contenedores
    document.getElementById('preguntasFlotantes').innerHTML = '';
    document.getElementById('particulasContainer').innerHTML = '';
    document.getElementById('porcentajeCarga').textContent = '0%';
    
    // Crear partículas
    crearParticulas();
    
    // Animar porcentaje
    animarPorcentaje(duracion);
    
    // Generar preguntas flotantes (4 oleadas)
    const totalPreguntas = 4;
    const intervalo = duracion / (totalPreguntas + 1);
    
    for (let i = 0; i < totalPreguntas; i++) {
        const preguntaRandom = preguntasEjemplo[Math.floor(Math.random() * preguntasEjemplo.length)];
        const delay = (i * intervalo) / 1000;
        
        crearPreguntaFlotante(preguntaRandom, delay);
    }
    
    // Ocultar modal automáticamente después de la duración
    setTimeout(() => {
        modal.style.display = 'none';
        console.log('[ANIMACIÓN CARGA]: ✅ Animación completada');
    }, duracion);
});

// ================================================================
// FUNCIONES AUXILIARES PARA LA ANIMACIÓN
// ================================================================

function crearPreguntaFlotante(texto, delay) {
    const container = document.getElementById('preguntasFlotantes');
    const pregunta = document.createElement('div');
    pregunta.className = 'pregunta-flotante';
    pregunta.textContent = texto;

    const angle = Math.random() * 360;
    const distance = 250 + Math.random() * 100;
    const startX = Math.cos(angle * Math.PI / 180) * distance;
    const startY = Math.sin(angle * Math.PI / 180) * distance;

    pregunta.style.setProperty('--startX', `${startX}px`);
    pregunta.style.setProperty('--startY', `${startY}px`);
    pregunta.style.animationDelay = `${delay}s`;

    container.appendChild(pregunta);

    setTimeout(() => {
        pregunta.remove();
    }, (delay + 3) * 1000);
}

function crearParticulas() {
    const container = document.getElementById('particulasContainer');
    
    for (let i = 0; i < 20; i++) {
        const particula = document.createElement('div');
        particula.className = 'particula';
        particula.style.left = `${Math.random() * 100}%`;
        particula.style.top = `${Math.random() * 100}%`;
        particula.style.animationDelay = `${Math.random() * 4}s`;
        
        container.appendChild(particula);
    }
}

function animarPorcentaje(duracionTotal) {
    const porcentajeEl = document.getElementById('porcentajeCarga');
    const inicio = Date.now();
    
    const interval = setInterval(() => {
        const transcurrido = Date.now() - inicio;
        const progreso = Math.min((transcurrido / duracionTotal) * 100, 100);
        
        porcentajeEl.textContent = `${Math.floor(progreso)}%`;
        
        if (progreso >= 100) {
            clearInterval(interval);
        }
    }, 50);
}

console.log('[DUELO]: ✅ Sistema completamente inicializado');