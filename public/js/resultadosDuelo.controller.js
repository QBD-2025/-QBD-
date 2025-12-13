// ARCHIVO: /public/js/resultadosDuelo.controller.js
// Maneja tiempo real con Socket.IO

(function() {
    'use strict';

    console.log('=== CONTROLADOR DE RESULTADOS INICIADO ===');
    console.log('Datos globales:', window.DUELO_DATA);

    const dueloData = window.DUELO_DATA;
    let socketInstance = null;
    let verificador = null;
    let maxVerificaciones = 0;
    const MAX_VERIFICACIONES_PERMITIDAS = 30; // 30 x 30s = 15 minutos máximo

    // =============================================
    // 🎯 INICIALIZACIÓN
    // =============================================

    document.addEventListener('DOMContentLoaded', () => {
        console.log('[RESULTADOS] Inicializando controlador...');

        // Si ambos ya terminaron, mostrar resultados finales
        if (dueloData.ambosTerminaron) {
            console.log('[RESULTADOS] Ambos ya terminaron');
            actualizarHeaderSegunResultado();
            return;
        }

        // Si no, conectar con socket para monitorear en tiempo real
        console.log('[RESULTADOS] Esperando que oponente termine...');
        inicializarSocket();
    });

    // =============================================
    // 📡 SOCKET.IO - TIEMPO REAL
    // =============================================

    function inicializarSocket() {
        if (typeof io === 'undefined') {
            console.warn('[SOCKET] Socket.io no disponible, usando polling');
            iniciarVerificacionPorPolling();
            return;
        }

        socketInstance = io();

        socketInstance.on('connect', () => {
            console.log('[SOCKET] Conectado:', socketInstance.id);

            // Registrarse en la sala del duelo
            socketInstance.emit('duelo:registrar-resultado', {
                id_duelo: dueloData.id_duelo,
                usuario_id: obtenerIdUsuario()
            });
        });

        // ✅ ESCUCHAR CUANDO EL OPONENTE TERMINA
        socketInstance.on('duelo:ambos-completaron', (data) => {
            console.log('[SOCKET] ¡Ambos completaron!');
            console.log('[SOCKET] Datos recibidos:', data);

            detenerVerificacion();

            // Mostrar resultado
            mostrarResultadoFinal(data);

            // Recargar después de 3 segundos para actualizar datos
            setTimeout(() => {
                location.reload();
            }, 3000);
        });

        // ✅ ESCUCHAR CUANDO OPONENTE ENVÍA RESPUESTAS
        socketInstance.on('duelo:oponente-respondio', (data) => {
            console.log('[SOCKET] Oponente respondió');
            actualizarPuntajeOponente(data);
        });

        socketInstance.on('disconnect', () => {
            console.log('[SOCKET] Desconectado');
            // Cambiar a polling si se desconecta
            iniciarVerificacionPorPolling();
        });

        socketInstance.on('error', (error) => {
            console.error('[SOCKET] Error:', error);
            iniciarVerificacionPorPolling();
        });
    }

    // =============================================
    // 🔄 POLLING - SI NO FUNCIONA SOCKET
    // =============================================

    function iniciarVerificacionPorPolling() {
        console.log('[POLLING] Iniciando verificación por polling...');

        function verificar() {
            maxVerificaciones++;

            if (maxVerificaciones > MAX_VERIFICACIONES_PERMITIDAS) {
                console.log('[POLLING] Máximo de verificaciones alcanzado');
                detenerVerificacion();
                return;
            }

            console.log(`[POLLING] Verificación ${maxVerificaciones}/${MAX_VERIFICACIONES_PERMITIDAS}`);

            fetch(`/competitivo/duelo/estado/${dueloData.id_duelo}`)
                .then(res => res.json())
                .then(data => {
                    console.log('[POLLING] Estado:', data);

                    if (data.ambosCompletaron) {
                        console.log('[POLLING] ¡Ambos completaron!');
                        detenerVerificacion();
                        location.reload();
                    } else {
                        console.log('[POLLING] Oponente aún no termina. Próxima verificación en 30s...');
                        verificador = setTimeout(verificar, 30000);
                    }
                })
                .catch(error => {
                    console.error('[POLLING] Error:', error);
                    verificador = setTimeout(verificar, 60000);
                });
        }

        // Primera verificación en 10 segundos
        verificador = setTimeout(verificar, 10000);
    }

    function detenerVerificacion() {
        if (verificador) {
            clearTimeout(verificador);
            verificador = null;
            console.log('[VERIFICACION] Detenida');
        }
    }

    // =============================================
    // 🎨 ACTUALIZAR UI
    // =============================================

    function actualizarHeaderSegunResultado() {
        const headerIcono = document.getElementById('headerIcono');
        const headerTitulo = document.getElementById('headerTitulo');

        if (!headerIcono) return;

        // Comparar puntajes
        const miPuntaje = parsearPuntaje('.puntaje-card.mi-puntaje .puntaje-numero');
        const oponentePuntaje = parsearPuntaje('.puntaje-card.oponente-puntaje .puntaje-numero');

        if (miPuntaje > oponentePuntaje) {
            headerIcono.textContent = '🏆';
            if (headerTitulo) headerTitulo.style.color = '#10b981';
        } else if (miPuntaje < oponentePuntaje) {
            headerIcono.textContent = '😔';
            if (headerTitulo) headerTitulo.style.color = '#ef4444';
        } else {
            headerIcono.textContent = '🤝';
            if (headerTitulo) headerTitulo.style.color = '#f59e0b';
        }
    }

    function parsearPuntaje(selector) {
        const elemento = document.querySelector(selector);
        if (!elemento) return 0;
        const texto = elemento.textContent.split('/')[0];
        return parseInt(texto) || 0;
    }

    function actualizarPuntajeOponente(data) {
        console.log('[ACTUALIZAR] Puntaje oponente:', data);

        const cardOponente = document.querySelector('.puntaje-card.oponente-puntaje');
        if (!cardOponente) return;

        // Actualizar número de preguntas correctas
        const numeroElement = cardOponente.querySelector('.puntaje-numero');
        if (numeroElement) {
            numeroElement.textContent = data.puntaje_oponente;
        }

        // Agregar animación
        cardOponente.style.animation = 'none';
        setTimeout(() => {
            cardOponente.style.animation = 'pulse 0.5s ease';
        }, 10);
    }

    function mostrarResultadoFinal(data) {
        console.log('[RESULTADO FINAL] Datos:', data);

        const resultadoDiv = document.querySelector('.resultado-final');
        if (!resultadoDiv) return;

        resultadoDiv.classList.add('visible');

        // Mostrar notificación
        mostrarNotificacion('¡Ambos han terminado el duelo!', 'success');
    }

    // =============================================
    // 🔔 NOTIFICACIONES
    // =============================================

    function mostrarNotificacion(mensaje, tipo = 'info') {
        const colores = {
            success: '#10b981',
            error: '#ef4444',
            info: '#667eea'
        };

        const notif = document.createElement('div');
        notif.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            background: ${colores[tipo]};
            color: white;
            padding: 20px 30px;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            z-index: 10000;
            animation: slideInRight 0.3s ease;
            font-weight: 600;
            max-width: 400px;
        `;
        notif.textContent = mensaje;

        document.body.appendChild(notif);

        setTimeout(() => {
            notif.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notif.remove(), 300);
        }, 4000);
    }

    // =============================================
    // 🎮 HELPERS HANDLEBARS EN JAVASCRIPT
    // =============================================
    // Estos helpers se ejecutan en el servidor ANTES de enviar el HTML
    // pero también los replicamos en JS para validaciones en cliente

    window.helpersFunctions = {
        equals: (a, b) => a === b,
        greaterThan: (a, b) => a > b,
        lessThan: (a, b) => a < b,
        greaterThanOrEqual: (a, b) => a >= b,
        lessThanOrEqual: (a, b) => a <= b,
        eq: (a, b) => a === b,
        gt: (a, b) => a > b,
        lt: (a, b) => a < b,
    };

    // =============================================
    // 🛠️ UTILIDADES
    // =============================================

    function obtenerIdUsuario() {
        // Obtener del meta tag o de localStorage
        const metaTag = document.querySelector('meta[name="userId"]');
        if (metaTag) return metaTag.getAttribute('content');

        // Alternativa: desde el HTML (si está disponible)
        const usuarioElement = document.querySelector('[data-user-id]');
        if (usuarioElement) return usuarioElement.dataset.userId;

        return null;
    }

    // =============================================
    // 🎨 ANIMACIONES CSS
    // =============================================

    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from {
                opacity: 0;
                transform: translateX(100%);
            }
            to {
                opacity: 1;
                transform: translateX(0);
            }
        }

        @keyframes slideOutRight {
            from {
                opacity: 1;
                transform: translateX(0);
            }
            to {
                opacity: 0;
                transform: translateX(100%);
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

        .resultado-final {
            opacity: 0;
            transition: opacity 0.5s ease;
        }

        .resultado-final.visible {
            opacity: 1;
        }
    `;
    document.head.appendChild(style);

    console.log('[RESULTADOS] ✅ Sistema completamente cargado');
})();