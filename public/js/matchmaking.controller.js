// ================================================================
// CONFIGURACIÓN INICIAL Y VARIABLES GLOBALES
// ================================================================
const socket = io();
const user = window.USER_DATA;
const urlParams = new URLSearchParams(window.location.search);
const desdeNotificacion = urlParams.get('origen') === 'notificacion';

let salaId = null;
let salaActual = null;
let oponente = null;
let cronometroInterval = null;
let preguntaActualId = null;
let socketRegistrado = false;
let gambitoActivado = false;
let miPowerUp = null;
let escudoActivo = false;

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

console.log('[DUELO INIT]: Portal iniciado para usuario:', user.id_usuario);

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

// ================================================================
// LISTENERS DE SALA
// ================================================================
socket.on('sala:conectado', (data) => {
    console.log('[SALA]: ✅ Conectado:', data.mensaje);
    statusText.innerHTML = `<i class="fas fa-check-circle"></i> ${data.mensaje}`;
    salaActual = data.salaId;
});

socket.on('sala:error', (data) => {
    console.error('[SALA ERROR]:', data.mensaje);
    statusText.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${data.mensaje}`;
    btnCancelarBusqueda.textContent = 'Volver al Portal';
    
    setTimeout(() => {
        window.location.href = '/matchmaking';
    }, 3000);
});

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
socket.on('duelo:dueloListo', ({ salaId }) => {
    console.log('[DUELO]: ✅ Duelo listo!');
    statusText.innerHTML = '<i class="fas fa-swords"></i> ¡Duelo listo! Entrando a la arena...';
    btnCancelarBusqueda.style.display = 'none';
    
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
            
            // ✅ Enviar selección con estado de apuesta
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
// DUELO: Finalizado
// ================================================================
socket.on('duelo:finalizado', (resultado) => {
    console.log('[DUELO]: ✅ Resultado recibido');
    console.log('[DUELO RESULTADO COMPLETO]:', JSON.stringify(resultado, null, 2));
    console.log('[DEBUG TIPOS]:', {
        ganadorId: resultado.ganadorId,
        ganadorIdType: typeof resultado.ganadorId,
        miUserId: user.id_usuario,
        miUserIdType: typeof user.id_usuario,
        miUserIdParsed: parseInt(user.id_usuario),
        comparacionDirecta: resultado.ganadorId === user.id_usuario,
        comparacionParsed: resultado.ganadorId === parseInt(user.id_usuario),
        jugadores: resultado.jugadores?.map(j => ({
            userId: j.userId,
            userIdType: typeof j.userId,
            cambioTotal: j.cambioTotal,
            puntosFinal: j.puntosFinal
        }))
    });
    
    if (cronometroInterval) clearInterval(cronometroInterval);
    
    setTimeout(() => {
        mostrarResultadoDetallado(resultado);
    }, 1000);
});



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
function buscarJugadorEnLobby(idOponente, username) {
    if (idOponente === user.id_usuario) {
        mostrarNotificacion('No puedes desafiarte a ti mismo', 'error');
        return;
    }
    
    console.log(`[LOBBY]: Invitando a ${username}`);
    
    statusText.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Invitando a <strong>${username}</strong>...`;
    btnBuscarCarrera.style.display = 'none';
    btnBuscarGeneral.style.display = 'none';
    btnCancelarBusqueda.style.display = 'inline-block';

    socket.emit('duelo:invitarLobby', { 
        idOponente: idOponente,
        usernameOponente: username
    });
}

window.buscarJugadorEnLobby = buscarJugadorEnLobby;

socket.on('duelo:invitacionLobbyEnviada', (data) => {
    console.log('[LOBBY]: Invitación enviada');
    statusText.innerHTML = `<i class="fas fa-clock"></i> ${data.mensaje}`;
});

socket.on('duelo:recibirInvitacionLobby', (data) => {
    console.log('[LOBBY]: Invitación recibida de', data.username_retador);
    
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
                    <strong>${data.username_retador}</strong> te desafía!
                </p>
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
        
        socket.emit('duelo:aceptarInvitacionLobby', { salaId: data.salaId });
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
    
    if (btnElement) {
        btnElement.disabled = true;
        btnElement.textContent = 'Enviando...';
    }
    
    try {
        const response = await fetch(`/desafio/duelo/${idOponente}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                modo: 'general',
                dificultad: null
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Error ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.salaId) {
            console.log(`[BD DESAFÍO]: ✅ Enviado. Sala: ${data.salaId}`);
            
            mostrarNotificacion(`✅ Desafío enviado a ${usernameOponente}`, 'success');
            
            statusText.innerHTML = `<i class="fas fa-paper-plane"></i> Desafío enviado a <strong>${usernameOponente}</strong>`;
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
function renderizarRanking(container, jugadores) {
    container.innerHTML = '';
    
    if (!jugadores || jugadores.length === 0) {
        container.innerHTML = '<p>No hay jugadores en este ranking.</p>';
        return;
    }

    jugadores.forEach(jugador => {
        if (jugador.id_usuario === user.id_usuario) return;

        const item = document.createElement('div');
        item.className = 'player-item';
        item.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <img src="${jugador.foto_perfil || '/uploads/default_avatar.png'}" alt="Avatar" class="avatar">
                <div class="player-info">
                    <strong>${jugador.username}</strong>
                    <p>${jugador.puntos} puntos</p>
                </div>
            </div>
            <div class="player-actions">
                <button class="btn-buscar" onclick="buscarJugadorEnLobby(${jugador.id_usuario}, '${jugador.username}')">
                    Invitar Lobby 👤
                </button>
                <button class="btn-notificar" onclick="enviarDesafioBD(${jugador.id_usuario}, '${jugador.username}', this)">
                    Invitar Notif 📧
                </button>
            </div>
        `;
        
        container.appendChild(item);
    });
}

async function cargarRankingGlobal() {
    try {
        const response = await fetch('/api/ranking/global/com');
        const jugadores = await response.json();
        renderizarRanking(document.getElementById('rankingGlobalContainer'), jugadores);
    } catch (error) {
        console.error('Error cargando ranking global:', error);
    }
}

async function cargarRankingCarrera(idCarrera) {
    if (!idCarrera) {
        document.getElementById('rankingCarreraContainer').innerHTML = '<p>Selecciona una carrera.</p>';
        return;
    }
    
    try {
        const response = await fetch(`/com/api/ranking/carrera/${idCarrera}`);
        const jugadores = await response.json();
        renderizarRanking(document.getElementById('rankingCarreraContainer'), jugadores);
    } catch (error) {
        console.error('Error cargando ranking de carrera:', error);
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

let intentandoSalir = false;
let dueloActivo = false;
let tiempoUltimaInteraccion = Date.now();

// ================================================================
// 🔥 FUNCIÓN: Detectar si hay duelo activo
// ================================================================

function actualizarEstadoDuelo(activo) {
    dueloActivo = activo;
    
    if (activo) {
        // Mostrar botón de rendirse
        document.getElementById('btnAbandonarDuelo').style.display = 'block';
        
        // Actualizar tiempo de última interacción
        tiempoUltimaInteraccion = Date.now();
        
        console.log('[DUELO]: Estado actualizado - ACTIVO');
    } else {
        // Ocultar botón de rendirse
        document.getElementById('btnAbandonarDuelo').style.display = 'none';
        
        console.log('[DUELO]: Estado actualizado - INACTIVO');
    }
}

// ================================================================
// 🛡️ PREVENCIÓN DE SALIDA ACCIDENTAL (beforeunload)
// ================================================================

window.addEventListener('beforeunload', (event) => {
    // Solo prevenir si hay un duelo activo
    if (dueloActivo && !intentandoSalir) {
        event.preventDefault();
        event.returnValue = '¿Estás seguro de que quieres salir? Perderás el duelo y tus puntos apostados.';
        return event.returnValue;
    }
});

// ================================================================
// 🚪 INTERCEPTAR NAVEGACIÓN DEL BROWSER (popstate)
// ================================================================

window.addEventListener('popstate', (event) => {
    if (dueloActivo && !intentandoSalir) {
        event.preventDefault();
        
        // Restaurar el estado en el historial
        window.history.pushState(null, '', window.location.href);
        
        // Mostrar modal de confirmación
        mostrarModalConfirmarSalida('navegacion');
    }
});

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
// 📱 FUNCIÓN: Mostrar Modal de Confirmación
// ================================================================

function mostrarModalConfirmarSalida(motivo) {
    const modal = document.getElementById('modalConfirmarSalida');
    const mensajeSalida = document.getElementById('mensajeSalida');
    const penalizacionInfo = document.getElementById('penalizacionInfo');
    const cantidadPenalizacion = document.getElementById('cantidadPenalizacion');
    
    // Obtener apuesta actual del duelo
    const apuestaTexto = document.getElementById('apuestaActual')?.textContent || '0';
    const apuesta = parseInt(apuestaTexto.match(/\d+/)?.[0] || 0);
    
    let mensaje = '';
    let penalizacion = 0;
    
    // Calcular penalización según motivo
    if (motivo === 'voluntario') {
        if (apuesta > 0) {
            penalizacion = Math.floor(apuesta * 0.30); // 30%
            mensaje = `⚠️ Si te rindes:\n\n` +
                     `• Perderás ${penalizacion} puntos (30% de apuesta)\n` +
                     `• Tu oponente ganará ${penalizacion} puntos\n` +
                     `• Se registrará como derrota\n\n` +
                     `💡 Consejo: Si continúas jugando, aún puedes ganar.`;
        } else {
            mensaje = `⚠️ Si te rindes:\n\n` +
                     `• Se registrará como derrota\n` +
                     `• Tu oponente ganará automáticamente\n` +
                     `• Perderás tu racha actual\n\n` +
                     `¿Estás seguro?`;
        }
    } else if (motivo === 'navegacion') {
        if (apuesta > 0) {
            penalizacion = Math.floor(apuesta * 0.40);
            mensaje = `⚠️ Estás intentando salir del duelo:\n\n` +
                     `• Si sales ahora perderás ${penalizacion} puntos (40%)\n` +
                     `• El duelo contará como derrota\n` +
                     `• Tu oponente ganará automáticamente\n\n` +
                     `💡 ¿Quieres rendirte o continuar jugando?`;
        } else {
            mensaje = `⚠️ Estás saliendo del duelo:\n\n` +
                     `• El duelo contará como derrota\n` +
                     `• Tu oponente ganará automáticamente\n\n` +
                     `¿Deseas continuar o rendirte?`;
        }
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
}

// ================================================================
// ❌ BOTÓN: Cancelar Salida
// ================================================================

document.getElementById('btnCancelarSalida').addEventListener('click', () => {
    const modal = document.getElementById('modalConfirmarSalida');
    modal.classList.remove('visible');
    
    console.log('[ABANDONO]: Usuario canceló la salida');
});

// ================================================================
// ✅ BOTÓN: Confirmar Rendición
// ================================================================

document.getElementById('btnConfirmarSalida').addEventListener('click', () => {
    const modal = document.getElementById('modalConfirmarSalida');
    modal.classList.remove('visible');
    
    intentandoSalir = true;
    
    console.log('[ABANDONO]: Usuario confirmó rendición');
    
    // Emitir evento al servidor
    socket.emit('duelo:confirmarRendicion', {
        salaId: salaActual || salaId,
        userId: user.id_usuario
    });
    const timeoutRedirect = setTimeout(() => {
        console.warn('[ABANDONO]: Timeout esperando respuesta del servidor, redirigiendo...');
        window.location.href = '/matchmaking';
    }, 5000);
    
    // Guardar timeout para cancelarlo si recibimos respuesta
    window.abandonoTimeout = timeoutRedirect;
});

// ================================================================
// 📡 LISTENERS DE SERVIDOR
// ================================================================

// ✅ ABANDONO CONFIRMADO (TÚ ABANDONASTE)
socket.on('duelo:abandonoConfirmado', (data) => {
    console.log('[ABANDONO CONFIRMADO]:', data);
    
    // ✅ Cancelar timeout de seguridad
    if (window.abandonoTimeout) {
        clearTimeout(window.abandonoTimeout);
        window.abandonoTimeout = null;
    }
    
    const pantalla = document.getElementById('pantallaAbandono');
    const tituloAbandono = document.getElementById('tituloAbandono');
    const mensajeAbandono = document.getElementById('mensajeAbandono');
    const iconoAbandono = document.getElementById('iconoAbandono');
    const penalizacionAbandono = document.getElementById('penalizacionAbandono');
    const apuestaAbandono = document.getElementById('apuestaAbandono');
    
    // Actualizar contenido
    iconoAbandono.textContent = data.icono || '😔';
    tituloAbandono.textContent = data.motivo === 'rendirse' ? 'Te Rendiste' : 'Has Abandonado';
    mensajeAbandono.textContent = data.mensaje;
    
    penalizacionAbandono.textContent = data.penalizacion > 0 ? `-${data.penalizacion} pts` : '0 pts';
    apuestaAbandono.textContent = data.apuesta > 0 ? `${data.apuesta} pts` : 'Sin apuesta';
    
    // Mostrar pantalla
    pantalla.classList.add('visible');
    
    // Ocultar duelo
    dueloView.style.display = 'none';
    
    // Desactivar estado de duelo
    dueloActivo = false;
    
    // ✅ REDIRECCIÓN AUTOMÁTICA después de 3 segundos
    setTimeout(() => {
        console.log('[ABANDONO]: Redirigiendo al portal...');
        window.location.href = '/matchmaking';
    }, 3000);
});


// ✅ OPONENTE ABANDONÓ (TÚ GANASTE)
socket.on('duelo:oponenteAbandono', (data) => {
    console.log('[OPONENTE ABANDONÓ]:', data);
    
    const pantalla = document.getElementById('pantallaVictoriaAbandono');
    const mensajeVictoria = document.getElementById('mensajeVictoriaAbandono');
    const gananciaVictoria = document.getElementById('gananciaVictoria');
    
    // Actualizar contenido
    mensajeVictoria.textContent = data.mensaje;
    gananciaVictoria.textContent = `+${data.ganancia || 0} pts`;
    
    // Lanzar confetti
    lanzarConfettiVictoria();
    
    // Mostrar pantalla
    pantalla.classList.add('visible');
    
    // Ocultar duelo
    dueloView.style.display = 'none';
    
    // Desactivar estado de duelo
    dueloActivo = false;
});

// ✅ OPONENTE DESCONECTADO (esperando reconexión)
socket.on('duelo:oponenteDesconectado', (data) => {
    console.log('[OPONENTE DESCONECTADO]:', data);
    
    const indicador = document.getElementById('indicadorDesconexion');
    const nombreOponente = document.getElementById('nombreOponenteDesconectado');
    const tiempoRestante = document.getElementById('tiempoRestanteReconexion');
    
    nombreOponente.textContent = oponente?.username || 'Oponente';
    
    // Mostrar indicador
    indicador.classList.add('visible');
    
    // Countdown de 60 segundos
    let segundos = data.tiempoEspera || 60;
    tiempoRestante.textContent = segundos;
    
    const countdown = setInterval(() => {
        segundos--;
        tiempoRestante.textContent = segundos;
        
        if (segundos <= 0) {
            clearInterval(countdown);
        }
    }, 1000);
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

socket.on('duelo:finalizado', (data) => {
    console.log('[DUELO FINALIZADO]: Desactivando protección de abandono...');
    
    // Desactivar protección
    actualizarEstadoDuelo(false);
    intentandoSalir = false;
    
    // Ejecutar handler original si existe
    if (originalDueloFinalizado && originalDueloFinalizado.length > 0) {
        originalDueloFinalizado[0](data);
    }
});

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

window.addEventListener('beforeunload', (e) => {
    if (dueloActivo && !intentandoSalir) {
        // Informar al servidor INMEDIATAMENTE que está abandonando
        socket.emit('duelo:abandonoRapido', {
            salaId: salaActual || salaId,
            userId: user.id_usuario
        });
        
        // Mostrar mensaje de advertencia
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


console.log('[DUELO]: ✅ Sistema completamente inicializado');