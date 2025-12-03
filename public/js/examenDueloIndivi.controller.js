// =============================================
// 🎮 CONTROLADOR DE EXAMEN DE DUELO INDIVIDUAL
// Con sistema completo de manejo de errores
// =============================================
// /js/examenDueloIndivi.controller.js
(function() {
    'use strict';

    // =================================================================
    // VARIABLES GLOBALES - EXAMEN
    // =================================================================
    let fechaInicioExamen = null;
    const preguntas = document.querySelectorAll('.contenedor-pregunta');
    let actual = 0;
    let respuestasUsuario = {};
    let estadoPreguntas = [];
    const TIEMPO_ADVERTENCIA = 60;
    let tiempoRestante = 600; // 10 minutos
    let intervaloCronometro = null;
    let mostrarSoloNoRespondidas = true;
    let timerAdvertencia = null;
    
    // =================================================================
    // VARIABLES GLOBALES - DUELO Y MANEJO DE ERRORES
    // =================================================================
    let dueloActivo = false;
    let intentandoSalir = false;
    let salaId = null;
    let userId = null;
    let socketInstance = null;
    let penalizaciones = null;
    
    const fechaLimite = new Date('{{duelo.fecha_limite}}');
    let intervaloDuelo = null;

    // =================================================================
    // 🚀 INICIALIZACIÓN
    // =================================================================
    
    document.addEventListener('DOMContentLoaded', async function() {
        console.log('[DUELO] Iniciando sistema...');
        
        // Cargar configuración
        if (window.SALA_CONFIG) {
            userId = window.SALA_CONFIG.user.id_usuario;
            salaId = window.SALA_CONFIG.duelo.id_duelo;
            console.log('[DUELO] Config cargada:', { userId, salaId });
        }
        
        // Cargar penalizaciones
        await cargarPenalizaciones();
        
        // Inicializar contador del duelo
        iniciarContadorDuelo();
        
        // Inicializar examen (sin activar protecciones aún)
        iniciarExamen();
        
        console.log('[DUELO] ✅ Sistema inicializado');
    });

    // =================================================================
    // 📡 CARGAR PENALIZACIONES
    // =================================================================
    
    async function cargarPenalizaciones() {
        try {
            const response = await fetch('/duelo/penalizaciones');
            penalizaciones = await response.json();
            console.log('[DUELO] Penalizaciones cargadas:', penalizaciones);
        } catch (error) {
            console.error('[DUELO] Error cargando penalizaciones:', error);
            // Valores por defecto
            penalizaciones = {
                penalizaciones: {
                    ABANDONO_VOLUNTARIO: 0.30,
                    NAVEGACION: 0.40,
                    DESCONEXION: 0.20,
                    RENDIRSE: 0.30
                },
                tiempos: {
                    reconexion_minutos: 30,
                    afk_horas: 2
                }
            };
        }
    }

    // =================================================================
    // 🔌 INICIALIZAR SOCKET.IO
    // =================================================================
    
    function inicializarSocket() {
        if (typeof io === 'undefined') {
            console.error('[SOCKET] Socket.io no está cargado');
            return null;
        }
        
        const socket = io();
        
        socket.on('connect', () => {
            console.log('[SOCKET] Conectado:', socket.id);
            
            // Registrar usuario en la sala
            socket.emit('duelo:registrarUsuario', {
                userId,
                salaId
            });
            
            // Reportar actividad cada 30 segundos
            setInterval(() => {
                if (dueloActivo) {
                    socket.emit('duelo:actividad', { userId });
                }
            }, 30000);
        });
        
        // Manejar desconexión
        socket.on('disconnect', (reason) => {
            console.log('[SOCKET] Desconectado:', reason);
            
            if (dueloActivo && !intentandoSalir) {
                mostrarIndicadorReconexion();
                registrarDesconexion();
            }
        });
        
        // Escuchar abandono del oponente
        socket.on('duelo:oponenteAbandono', (data) => {
            console.log('[SOCKET] Oponente abandonó:', data);
            if (data.ganaste) {
                dueloActivo = false;
                mostrarPantallaVictoriaAbandono(data);
            }
        });
        
        // Escuchar reconexión del oponente
        socket.on('duelo:oponenteReconecto', (data) => {
            console.log('[SOCKET] Oponente reconectó');
            ocultarIndicadorDesconexionOponente();
        });
        
        // Escuchar desconexión del oponente
        socket.on('duelo:oponenteDesconectado', (data) => {
            console.log('[SOCKET] Oponente desconectado');
            mostrarIndicadorDesconexionOponente(data.tiempoEspera);
        });
        
        // Confirmación de abandono propio
        socket.on('duelo:abandonoConfirmado', (data) => {
            console.log('[SOCKET] Abandono confirmado:', data);
            mostrarPantallaAbandono(data);
        });
        
        // Advertencia de AFK
        socket.on('duelo:advertenciaAFK', (data) => {
            mostrarAviso('⚠️ Has estado inactivo. El duelo se abandonará si no respondes.');
        });
        
        return socket;
    }

    // =================================================================
    // 🛡️ PROTECCIÓN DEL NAVEGADOR
    // =================================================================
    
    // Interceptar cierre de pestaña/navegador
    window.addEventListener('beforeunload', (e) => {
        if (dueloActivo && !intentandoSalir) {
            e.preventDefault();
            e.returnValue = '⚠️ Si sales perderás el 40% de tus puntos';
            
            // Notificar servidor inmediatamente
            navigator.sendBeacon(`/duelo/abandonoRapido/${salaId}`, 
                JSON.stringify({ userId })
            );
            
            return e.returnValue;
        }
    });
    
    // Interceptar botón "Atrás"
    window.addEventListener('popstate', (e) => {
        if (dueloActivo && !intentandoSalir) {
            e.preventDefault();
            window.history.pushState(null, '', window.location.href);
            mostrarModalConfirmarSalida('navegacion');
        }
    });

    // =================================================================
    // ⏰ CONTADOR DEL DUELO (48 HORAS)
    // =================================================================
    
    function actualizarContadorDuelo() {
        const ahora = new Date();
        const tiempoRestanteDuelo = Math.max(0, fechaLimite - ahora);
        
        const elemento = document.getElementById('countdown-display') || 
                        document.getElementById('duelo-timer');
        if (!elemento) return;
        
        if (tiempoRestanteDuelo <= 0) {
            elemento.textContent = 'EXPIRADO';
            elemento.style.color = 'red';
            clearInterval(intervaloDuelo);
            alert('El tiempo del duelo ha expirado');
            window.location.href = '/portal';
            return;
        }
        
        const horas = Math.floor(tiempoRestanteDuelo / (1000 * 60 * 60));
        const minutos = Math.floor((tiempoRestanteDuelo % (1000 * 60 * 60)) / (1000 * 60));
        
        if (horas > 0) {
            elemento.textContent = `${horas}h ${minutos}m restantes`;
        } else {
            elemento.textContent = `${minutos} minutos restantes`;
        }
        
        // Colores de advertencia
        if (tiempoRestanteDuelo < 2 * 60 * 60 * 1000) {
            elemento.style.color = 'orange';
        }
        if (tiempoRestanteDuelo < 30 * 60 * 1000) {
            elemento.style.color = 'red';
        }
    }
    
    function iniciarContadorDuelo() {
        const fechaLimiteEl = document.getElementById('fecha-limite');
        if (fechaLimiteEl) {
            fechaLimiteEl.textContent = fechaLimite.toLocaleString('es-MX', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
        
        actualizarContadorDuelo();
        intervaloDuelo = setInterval(actualizarContadorDuelo, 60000);
    }

    // =================================================================
    // 🎬 FLUJO DEL EXAMEN
    // =================================================================
    
    window.confirmarInicioExamen = function() {
        document.getElementById('modalConfirmacion').classList.remove('oculto');
    };
    
    window.cerrarModal = function() {
        document.getElementById('modalConfirmacion').classList.add('oculto');
    };
    
    window.comenzarExamenConfirmado = function() {
        cerrarModal();
        comenzarExamen();
    };
    
    function comenzarExamen() {
        fechaInicioExamen = new Date().toISOString();
        
        // Ocultar pre-examen, mostrar examen
        document.getElementById('preExamenContent').style.display = 'none';
        document.getElementById('examenContent').style.display = 'block';
        
        // ✅ ACTIVAR PROTECCIONES
        dueloActivo = true;
        window.history.pushState(null, '', window.location.href);
        
        // Inicializar socket
        socketInstance = inicializarSocket();
        
        // Agregar botón de abandonar
        agregarBotonAbandonar();
        
        // Iniciar cronómetro del examen
        iniciarCronometro();
        
        console.log('[DUELO] Examen iniciado, protecciones activas');
    }
    
    function iniciarExamen() {
        preguntas.forEach((_, i) => estadoPreguntas[i] = "pendiente");
        mostrarPregunta(0);
        
        const toggleFiltro = document.getElementById('toggleFiltro');
        if(toggleFiltro) {
            toggleFiltro.addEventListener('change', (e) => {
                mostrarSoloNoRespondidas = e.target.checked;
                actualizarPendientesUI();
            });
        }
    }

    // =================================================================
    // 🚪 SISTEMA DE ABANDONO
    // =================================================================
    
    function agregarBotonAbandonar() {
        const header = document.querySelector('header > div:last-child');
        if (!header || document.getElementById('btnAbandonarDuelo')) return;
        
        const btnAbandonar = document.createElement('button');
        btnAbandonar.id = 'btnAbandonarDuelo';
        btnAbandonar.className = 'btn-volver';
        btnAbandonar.style.cssText = 'background: #ff4444; margin-right: 10px;';
        btnAbandonar.innerHTML = '<i class="fas fa-flag"></i> Abandonar';
        btnAbandonar.onclick = () => mostrarModalConfirmarSalida('rendirse');
        
        header.insertBefore(btnAbandonar, header.firstChild);
    }
    
    function mostrarModalConfirmarSalida(motivo) {
        const puntosUsuario = window.SALA_CONFIG?.user?.puntos || 0;
        let porcentaje = 0;
        let mensajeMotivo = '';
        
        switch (motivo) {
            case 'voluntario':
            case 'rendirse':
                porcentaje = penalizaciones?.penalizaciones?.ABANDONO_VOLUNTARIO || 0.30;
                mensajeMotivo = 'Si te rindes voluntariamente';
                break;
            case 'navegacion':
                porcentaje = penalizaciones?.penalizaciones?.NAVEGACION || 0.40;
                mensajeMotivo = 'Si cierras el navegador';
                break;
        }
        
        const penalizacion = Math.floor(puntosUsuario * porcentaje);
        
        const modalHTML = `
            <div id="modalConfirmarSalida" class="modal-aviso" style="display: flex;">
                <div class="modal-content" style="max-width: 500px;">
                    <h3 style="color: #ff4444;">
                        <i class="fas fa-exclamation-triangle"></i> 
                        ¿Abandonar Duelo?
                    </h3>
                    <p style="margin: 20px 0; font-size: 16px;">
                        <strong>${mensajeMotivo}:</strong>
                    </p>
                    <div style="background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%); 
                                color: white; padding: 20px; border-radius: 10px; margin: 20px 0;">
                        <p style="font-size: 18px; margin: 0;">
                            <i class="fas fa-coins"></i> 
                            <strong>Perderás: ${penalizacion} puntos (${Math.round(porcentaje * 100)}%)</strong>
                        </p>
                        <p style="margin: 10px 0 0 0; opacity: 0.9;">
                            Tu oponente ganará: +${penalizacion} puntos
                        </p>
                    </div>
                    <p style="color: #666; margin-bottom: 20px;">
                        Esta acción no se puede deshacer. ¿Estás completamente seguro?
                    </p>
                    <div style="text-align: center;">
                        <button id="btnCancelarSalida" 
                                style="margin-right: 10px; background: #6c757d; color: white; 
                                       border: none; padding: 12px 24px; border-radius: 5px; 
                                       cursor: pointer; font-size: 16px;">
                            <i class="fas fa-times"></i> No, continuar
                        </button>
                        <button id="btnConfirmarSalida" 
                                style="background: #dc3545; color: white; border: none; 
                                       padding: 12px 24px; border-radius: 5px; cursor: pointer; 
                                       font-size: 16px;">
                            <i class="fas fa-flag"></i> Sí, abandonar
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Limpiar modal existente
        const modalExistente = document.getElementById('modalConfirmarSalida');
        if (modalExistente) modalExistente.remove();
        
        // Insertar nuevo modal
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Event listeners
        document.getElementById('btnCancelarSalida').onclick = function() {
            document.getElementById('modalConfirmarSalida').remove();
        };
        
        document.getElementById('btnConfirmarSalida').onclick = function() {
            confirmarAbandonoDefinitivo(motivo);
        };
    }
    
    async function confirmarAbandonoDefinitivo(motivo) {
        // Cerrar modal
        const modal = document.getElementById('modalConfirmarSalida');
        if (modal) modal.remove();
        
        // Desactivar protecciones
        intentandoSalir = true;
        dueloActivo = false;
        
        // Limpiar intervalos
        if (intervaloCronometro) clearInterval(intervaloCronometro);
        if (intervaloDuelo) clearInterval(intervaloDuelo);
        if (timerAdvertencia) clearTimeout(timerAdvertencia);
        
        try {
            const response = await fetch(`/duelo/confirmarRendicion/${salaId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ motivo })
            });
            
            const data = await response.json();
            
            if (data.success) {
                mostrarPantallaAbandono(data);
            } else {
                alert('Error: ' + data.error);
                window.location.href = '/portal';
            }
            
        } catch (error) {
            console.error('[DUELO] Error confirmando abandono:', error);
            alert('Error de conexión');
            window.location.href = '/portal';
        }
    }
    
    window.confirmarSalida = function() {
        mostrarModalConfirmarSalida('navegacion');
    };

    // =================================================================
    // 📺 PANTALLAS DE RESULTADO
    // =================================================================
    
    function mostrarPantallaAbandono(data) {
        document.body.innerHTML = `
            <div style="display: flex; justify-content: center; align-items: center; 
                        min-height: 100vh; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                <div style="background: white; padding: 40px; border-radius: 20px; 
                            box-shadow: 0 10px 40px rgba(0,0,0,0.3); max-width: 500px; text-align: center;">
                    <div style="font-size: 80px; margin-bottom: 20px;">😔</div>
                    <h1 style="color: #dc3545; margin-bottom: 20px;">Has Abandonado</h1>
                    <p style="font-size: 18px; color: #666; margin-bottom: 30px;">
                        ${data.mensaje || 'Has abandonado el duelo'}
                    </p>
                    <div style="background: #ffe6e6; padding: 20px; border-radius: 10px; margin-bottom: 30px;">
                        <p style="font-size: 24px; color: #dc3545; margin: 0;">
                            <i class="fas fa-minus-circle"></i> 
                            -${data.penalizacion} puntos
                        </p>
                    </div>
                    <button onclick="location.href='/portal'" 
                            style="background: #667eea; color: white; border: none; 
                                   padding: 15px 30px; border-radius: 10px; font-size: 18px; 
                                   cursor: pointer;">
                        <i class="fas fa-home"></i> Volver al Portal
                    </button>
                </div>
            </div>
        `;
    }
    
    function mostrarPantallaVictoriaAbandono(data) {
        document.body.innerHTML = `
            <div style="display: flex; justify-content: center; align-items: center; 
                        min-height: 100vh; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">
                <canvas id="confettiVictoria" style="position: fixed; top: 0; left: 0; 
                        width: 100%; height: 100%; pointer-events: none; z-index: 9999;"></canvas>
                <div style="background: white; padding: 40px; border-radius: 20px; 
                            box-shadow: 0 10px 40px rgba(0,0,0,0.3); max-width: 500px; text-align: center; z-index: 10000;">
                    <div style="font-size: 80px; margin-bottom: 20px;">🏆</div>
                    <h1 style="color: #28a745; margin-bottom: 20px;">¡Victoria!</h1>
                    <p style="font-size: 18px; color: #666; margin-bottom: 30px;">
                        ${data.mensaje || 'Tu oponente ha abandonado'}
                    </p>
                    <div style="background: #e6ffe6; padding: 20px; border-radius: 10px; margin-bottom: 30px;">
                        <p style="font-size: 24px; color: #28a745; margin: 0;">
                            <i class="fas fa-plus-circle"></i> 
                            +${data.gananciaOponente} puntos
                        </p>
                    </div>
                    <button onclick="location.href='/portal'" 
                            style="background: #28a745; color: white; border: none; 
                                   padding: 15px 30px; border-radius: 10px; font-size: 18px; 
                                   cursor: pointer;">
                        <i class="fas fa-home"></i> Volver al Portal
                    </button>
                </div>
            </div>
        `;
        
        lanzarConfetti();
    }
    
    function lanzarConfetti() {
        const canvas = document.getElementById('confettiVictoria');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        
        const confetti = [];
        const colors = ['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#2196f3'];
        
        for (let i = 0; i < 100; i++) {
            confetti.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height - canvas.height,
                r: Math.random() * 4 + 2,
                d: Math.random() * 100,
                color: colors[Math.floor(Math.random() * colors.length)],
                tilt: Math.random() * 10 - 10,
                tiltAngleIncremental: Math.random() * 0.07 + 0.05,
                tiltAngle: 0
            });
        }
        
        function draw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            confetti.forEach((c, i) => {
                ctx.beginPath();
                ctx.lineWidth = c.r / 2;
                ctx.strokeStyle = c.color;
                ctx.moveTo(c.x + c.tilt + c.r, c.y);
                ctx.lineTo(c.x + c.tilt, c.y + c.tilt + c.r);
                ctx.stroke();
                
                c.tiltAngle += c.tiltAngleIncremental;
                c.y += (Math.cos(c.d) + 3 + c.r / 2) / 2;
                c.tilt = Math.sin(c.tiltAngle - i / 3) * 15;
                
                if (c.y > canvas.height) confetti.splice(i, 1);
            });
            
            if (confetti.length > 0) requestAnimationFrame(draw);
        }
        
        draw();
    }

    // =================================================================
    // 🔔 INDICADORES DE DESCONEXIÓN
    // =================================================================
    
    function mostrarIndicadorReconexion() {
        let indicador = document.getElementById('indicadorReconexion');
        
        if (!indicador) {
            indicador = document.createElement('div');
            indicador.id = 'indicadorReconexion';
            indicador.style.cssText = `
                position: fixed; top: 80px; right: 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white; padding: 15px 20px; border-radius: 10px;
                box-shadow: 0 4px 15px rgba(0,0,0,0.3); z-index: 9998;
            `;
            indicador.innerHTML = `
                <p style="margin: 0;"><strong><i class="fas fa-wifi"></i> Reconectando...</strong></p>
            `;
            document.body.appendChild(indicador);
        }
    }
    
    function ocultarIndicadorReconexion() {
        const indicador = document.getElementById('indicadorReconexion');
        if (indicador) indicador.remove();
    }
    
    function mostrarIndicadorDesconexionOponente(tiempoEspera) {
        let indicador = document.getElementById('indicadorDesconexionOponente');
        
        if (!indicador) {
            indicador = document.createElement('div');
            indicador.id = 'indicadorDesconexionOponente';
            indicador.style.cssText = `
                position: fixed; top: 80px; left: 20px;
                background: linear-gradient(135deg, #ffa500 0%, #ff6347 100%);
                color: white; padding: 15px 20px; border-radius: 10px;
                box-shadow: 0 4px 15px rgba(0,0,0,0.3); z-index: 9998;
            `;
            document.body.appendChild(indicador);
        }
        
        let segundosRestantes = tiempoEspera;
        
        indicador.innerHTML = `
            <p style="margin: 0 0 5px 0;"><strong><i class="fas fa-plug"></i> Oponente desconectado</strong></p>
            <p style="margin: 0;">Esperando... <span id="tiempoRestanteOponente">${Math.floor(segundosRestantes / 60)}m</span></p>
        `;
        
        const interval = setInterval(() => {
            segundosRestantes--;
            const span = document.getElementById('tiempoRestanteOponente');
            if (span) {
                span.textContent = `${Math.floor(segundosRestantes / 60)}m ${segundosRestantes % 60}s`;
            }
            
            if (segundosRestantes <= 0) {
                clearInterval(interval);
                if (indicador) indicador.remove();
            }
        }, 1000);
    }
    
    function ocultarIndicadorDesconexionOponente() {
        const indicador = document.getElementById('indicadorDesconexionOponente');
        if (indicador) indicador.remove();
    }

    // =================================================================
    // 📡 FUNCIONES DE CONEXIÓN
    // =================================================================
    
    async function registrarDesconexion() {
        try {
            const estadoDuelo = {
                preguntaActual: actual,
                respuestas: respuestasUsuario,
                tiempoRestante: tiempoRestante,
                fechaInicio: fechaInicioExamen
            };
            
            await fetch(`/duelo/desconexion/${salaId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ estadoDuelo })
            });
            
            console.log('[DESCONEXIÓN] Registrada');
        } catch (error) {
            console.error('Error registrando desconexión:', error);
        }
    }

    // =================================================================
    // FUNCIONES DEL EXAMEN (MANTENER LÓGICA ORIGINAL)
    // =================================================================
    
    function mostrarPregunta(index) {
        if (index < 0 || index >= preguntas.length) return;
        
        preguntas.forEach(p => p.classList.remove('activa'));
        preguntas[index].classList.add('activa');
        actual = index;
        
        actualizarPendientesUI();
        reiniciarTimerAdvertencia();
    }
    
    function reiniciarTimerAdvertencia() {
        if (timerAdvertencia) clearTimeout(timerAdvertencia);
        timerAdvertencia = setTimeout(() => {
            mostrarAviso(`Llevas mucho tiempo en la pregunta ${actual + 1}`);
        }, TIEMPO_ADVERTENCIA * 1000);
    }
    
    function actualizarPendientesUI() {
        const cont = document.getElementById('pendientesContainer');
        const listaNav = document.getElementById('listaPreguntasNavegacion');
        if (!cont || !listaNav) return;

        listaNav.innerHTML = "";
        cont.style.display = 'block';

        estadoPreguntas.forEach((estado, i) => {
            const esNoRespondida = estado === "pendiente" || estado === "suspenso";

            if (!mostrarSoloNoRespondidas || esNoRespondida) {
                const div = document.createElement('div');
                div.className = `item-navegacion estado-${estado}`;
                
                let icono = '⚪️';
                if(estado === 'respondida') icono = '✅';
                else if (estado === 'suspenso') icono = '❓';

                div.innerHTML = `${icono} Pregunta ${i + 1}`;
                div.dataset.index = i;
                
                div.addEventListener('click', () => {
                    mostrarPregunta(i);
                    activarBotonVolverAlFinal(i);
                });
                listaNav.appendChild(div);
            }
        });
    }
    
    function activarBotonVolverAlFinal(indexDondeEstoy) {
        document.querySelectorAll('.btnVolverFinal').forEach(b => b.style.display = 'none');

        if (indexDondeEstoy < preguntas.length - 1) {
            const preguntaActualEl = preguntas[indexDondeEstoy];
            const btn = preguntaActualEl.querySelector('.btnVolverFinal');
            if (btn) {
                btn.style.display = 'inline-block';
                btn.onclick = () => mostrarPregunta(preguntas.length - 1);
            }
        }
    }
    
    function iniciarCronometro() {
        tiempoRestante = 600;
        clearInterval(intervaloCronometro);
        actualizarCronometroUI();
        intervaloCronometro = setInterval(() => {
            tiempoRestante--;
            actualizarCronometroUI();
            if (tiempoRestante <= 0) {
                clearInterval(intervaloCronometro);
                finalizarExamen();
            }
        }, 1000);
    }

    function actualizarCronometroUI() {
        let minutos = Math.floor(tiempoRestante / 60);
        let segundos = tiempoRestante % 60;
        let texto = `${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`;
        document.querySelectorAll('.cronometro').forEach(c => c.textContent = texto);
    }

    function mostrarAviso(mensaje) {
        document.getElementById('mensajeAviso').textContent = mensaje;
        document.getElementById('avisoTiempo').classList.remove('oculto');
    }
    
    window.cerrarAviso = function() {
        document.getElementById('avisoTiempo').classList.add('oculto');
    };

    // =================================================================
    // EVENT LISTENERS PARA OPCIONES Y NAVEGACIÓN
    // =================================================================
    
    document.querySelectorAll('.opciones').forEach((opcionesDiv) => {
        opcionesDiv.querySelectorAll('button').forEach((btn) => {
            btn.addEventListener('click', () => {
                const preguntaDiv = opcionesDiv.closest('.contenedor-pregunta');
                const preguntaIndex = parseInt(preguntaDiv.dataset.index);
                const idPregunta = preguntaDiv.dataset.idPregunta;
                const idRespuesta = parseInt(btn.dataset.idRespuesta);
                
                opcionesDiv.querySelectorAll('button').forEach(b => b.classList.remove('seleccionada'));
                btn.classList.add('seleccionada');
                
                respuestasUsuario[idPregunta] = idRespuesta;
                estadoPreguntas[preguntaIndex] = "respondida";
                actualizarPendientesUI();
            });
        });
    });
    
    document.querySelectorAll('.btnNoSeguro').forEach((btn) => {
        btn.addEventListener('click', e => {
            e.preventDefault();
            const preguntaIndex = parseInt(e.target.closest('.contenedor-pregunta').dataset.index);
            estadoPreguntas[preguntaIndex] = "suspenso";
            if (preguntaIndex < preguntas.length - 1) {
                mostrarPregunta(preguntaIndex + 1);
            } else {
                actualizarPendientesUI();
            }
        });
    });

    document.querySelectorAll('.btn-siguiente').forEach(btn => {
        btn.addEventListener('click', () => {
            if (estadoPreguntas[actual] !== "respondida" && estadoPreguntas[actual] !== "suspenso") {
                estadoPreguntas[actual] = "pendiente";
            }
            mostrarPregunta(actual + 1);
        });
    });

    document.querySelectorAll('.btn-volver:not(.btnNoSeguro):not(.btnVolverFinal)').forEach(btn => {
        btn.addEventListener('click', () => mostrarPregunta(actual - 1));
    });
    
    document.querySelectorAll('.btn-finalizar').forEach(btn => {
        btn.addEventListener('click', finalizarExamen);
    });

    // =================================================================
    // FINALIZAR EXAMEN
    // =================================================================
    
    function finalizarExamen() {
        if (!confirm('¿Estás seguro de finalizar el duelo? No podrás modificar tus respuestas.')) {
            return;
        }
        
        console.log('📤 ENVIANDO RESPUESTAS:', respuestasUsuario);
        
        // ✅ DESACTIVAR PROTECCIONES
        intentandoSalir = true;
        dueloActivo = false;
        
        // Limpiar intervalos
        clearInterval(intervaloCronometro);
        clearInterval(intervaloDuelo);
        if (timerAdvertencia) clearTimeout(timerAdvertencia);
        
        const tiempoEmpleado = fechaInicioExamen 
            ? new Date() - new Date(fechaInicioExamen) 
            : 0;
        
        document.getElementById('inputRespuestas').value = JSON.stringify(respuestasUsuario);
        document.getElementById('inputFechaInicio').value = fechaInicioExamen;
        document.getElementById('inputTiempoEmpleado').value = tiempoEmpleado;
        document.getElementById('formResultados').submit();
    }

    console.log('[DUELO] ✅ Sistema de manejo de errores cargado');

})();