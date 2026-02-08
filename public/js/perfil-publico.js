// =============================================
// 🎮 CONTROLADOR FRONTEND - PERFIL PÚBLICO
// public/js/perfil-publico.controller.js
// =============================================

(function() {
    'use strict';
    
    console.log('🎮 Inicializando perfil público...');
    
    // =============================================
    // 📊 INICIALIZACIÓN
    // =============================================
    
    document.addEventListener('DOMContentLoaded', () => {
        inicializarAnimaciones();
        inicializarSocket();
        verificarActualizaciones();
        
        console.log('✅ Perfil público cargado');
    });
    
    // =============================================
    // ✨ ANIMACIONES DE BARRAS
    // =============================================
    
    function inicializarAnimaciones() {
        // Animar barras de progreso
        const barras = document.querySelectorAll('.barra-fill');
        
        barras.forEach((barra, index) => {
            const targetWidth = barra.style.width;
            barra.style.width = '0%';
            
            setTimeout(() => {
                barra.style.width = targetWidth;
            }, 100 + (index * 100));
        });
        
        // Animar contadores
        animarContadores();
    }
    
    function animarContadores() {
        const contadores = document.querySelectorAll('.stat-valor');
        
        contadores.forEach(contador => {
            const texto = contador.textContent;
            const numero = parseInt(texto.replace(/[^\d]/g, ''));
            
            if (!isNaN(numero) && numero > 0) {
                contador.textContent = '0';
                
                let actual = 0;
                const incremento = Math.ceil(numero / 50);
                const duracion = 1000;
                const intervalo = duracion / (numero / incremento);
                
                const timer = setInterval(() => {
                    actual += incremento;
                    
                    if (actual >= numero) {
                        contador.textContent = texto;
                        clearInterval(timer);
                    } else {
                        contador.textContent = actual.toLocaleString('es-MX');
                    }
                }, intervalo);
            }
        });
    }
    
    // =============================================
    // 🔌 WEBSOCKET - ACTUALIZACIONES EN TIEMPO REAL
    // =============================================
    
    function inicializarSocket() {
        if (typeof io === 'undefined') {
            console.warn('⚠️ Socket.IO no disponible');
            return;
        }
        
        const socket = io();
        
        socket.on('connect', () => {
            console.log('🔌 Socket conectado');
        });
        
        // Escuchar actualizaciones de estadísticas
        socket.on('stats:actualizado', (data) => {
            console.log('📊 Stats actualizados:', data);
            actualizarEstadisticas(data);
        });
        
        // Escuchar nuevas insignias (preparado para futuro)
        socket.on('insignia:desbloqueada', (data) => {
            console.log('🏅 Nueva insignia:', data);
            mostrarNotificacionInsignia(data);
        });
        
        socket.on('disconnect', () => {
            console.log('🔌 Socket desconectado');
        });
    }
    
    // =============================================
    // 🔄 ACTUALIZACIÓN DE ESTADÍSTICAS
    // =============================================
    
    function actualizarEstadisticas(data) {
        if (!data) return;
        
        // Actualizar puntos totales
        if (data.puntos_totales !== undefined) {
            const elementoPuntos = document.querySelector('.stat-card.destacado .stat-valor');
            if (elementoPuntos) {
                animarCambio(elementoPuntos, data.puntos_totales);
            }
        }
        
        // Actualizar exámenes
        if (data.examenes_realizados !== undefined) {
            const elementos = document.querySelectorAll('.stat-valor');
            if (elementos[1]) {
                animarCambio(elementos[1], data.examenes_realizados);
            }
        }
        
        // Actualizar duelos
        if (data.duelos_totales !== undefined) {
            const elementos = document.querySelectorAll('.stat-valor');
            if (elementos[2]) {
                animarCambio(elementos[2], data.duelos_totales);
            }
        }
    }
    
    function animarCambio(elemento, nuevoValor) {
        elemento.style.transition = 'all 0.3s ease';
        elemento.style.transform = 'scale(1.2)';
        elemento.style.color = '#10b981';
        
        setTimeout(() => {
            elemento.textContent = nuevoValor.toLocaleString('es-MX');
            
            setTimeout(() => {
                elemento.style.transform = 'scale(1)';
                elemento.style.color = '';
            }, 300);
        }, 150);
    }
    
    // =============================================
    // 🔔 NOTIFICACIONES
    // =============================================
    
    function mostrarNotificacionInsignia(data) {
        const notificacion = document.createElement('div');
        notificacion.className = 'notificacion-insignia';
        notificacion.innerHTML = `
            <div class="notif-icono">🏅</div>
            <div class="notif-contenido">
                <h4>¡Nueva Insignia Desbloqueada!</h4>
                <p>${data.nombre}</p>
            </div>
        `;
        
        document.body.appendChild(notificacion);
        
        setTimeout(() => {
            notificacion.classList.add('mostrar');
        }, 100);
        
        setTimeout(() => {
            notificacion.classList.remove('mostrar');
            setTimeout(() => {
                notificacion.remove();
            }, 500);
        }, 5000);
    }
    
    // =============================================
    // 🔄 VERIFICAR ACTUALIZACIONES PERIÓDICAS
    // =============================================
    
    function verificarActualizaciones() {
        // Obtener ID del usuario del perfil desde la URL
        const pathParts = window.location.pathname.split('/');
        const idUsuario = pathParts[pathParts.length - 1];
        
        if (!idUsuario || isNaN(idUsuario)) {
            console.warn('⚠️ ID de usuario no válido');
            return;
        }
        
        // Verificar cada 30 segundos si hay cambios
        setInterval(async () => {
            try {
                const response = await fetch(`/api/usuario/stats/${idUsuario}`);
                if (response.ok) {
                    const data = await response.json();
                    
                    // Solo actualizar si hay cambios significativos
                    const cambiosDetectados = verificarCambios(data);
                    if (cambiosDetectados) {
                        console.log('🔄 Cambios detectados, actualizando...');
                        actualizarEstadisticas(data);
                    }
                }
            } catch (error) {
                console.warn('⚠️ Error verificando actualizaciones:', error);
            }
        }, 30000); // 30 segundos
    }
    
    function verificarCambios(nuevosStats) {
        // Obtener stats actuales del DOM
        const statsActuales = {
            puntos: parseInt(document.querySelector('.stat-card.destacado .stat-valor')?.textContent.replace(/[^\d]/g, '') || '0'),
            examenes: parseInt(document.querySelectorAll('.stat-valor')[1]?.textContent || '0'),
            duelos: parseInt(document.querySelectorAll('.stat-valor')[2]?.textContent || '0')
        };
        
        // Comparar
        return (
            statsActuales.puntos !== nuevosStats.puntos_totales ||
            statsActuales.examenes !== nuevosStats.examenes_realizados ||
            statsActuales.duelos !== nuevosStats.duelos_totales
        );
    }
    
    // =============================================
    // 🎨 EFECTOS HOVER MEJORADOS
    // =============================================
    
    function mejorarInteracciones() {
        // Efecto parallax en stat cards
        const statCards = document.querySelectorAll('.stat-card');
        
        statCards.forEach(card => {
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                
                const rotateX = (y - centerY) / 20;
                const rotateY = (centerX - x) / 20;
                
                card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-5px)`;
            });
            
            card.addEventListener('mouseleave', () => {
                card.style.transform = '';
            });
        });
    }
    
    // Inicializar efectos adicionales
    setTimeout(mejorarInteracciones, 500);
    
    console.log('✅ Controlador de perfil público inicializado');
    
})();

// =============================================
// 📎 ESTILOS PARA NOTIFICACIONES (INYECTAR)
// =============================================

const estilosNotificacion = `
<style>
.notificacion-insignia {
    position: fixed;
    top: 20px;
    right: -400px;
    background: linear-gradient(135deg, #fbbf24, #f59e0b);
    color: white;
    padding: 20px;
    border-radius: 12px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    z-index: 10000;
    display: flex;
    align-items: center;
    gap: 15px;
    min-width: 350px;
    transition: right 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

.notificacion-insignia.mostrar {
    right: 20px;
}

.notif-icono {
    font-size: 48px;
    animation: rotar 2s ease-in-out infinite;
}

.notif-contenido h4 {
    margin: 0 0 5px 0;
    font-weight: 800;
    font-size: 16px;
}

.notif-contenido p {
    margin: 0;
    font-size: 14px;
    opacity: 0.9;
}

@keyframes rotar {
    0%, 100% { transform: rotate(0deg); }
    25% { transform: rotate(-15deg); }
    75% { transform: rotate(15deg); }
}
</style>
`;

document.head.insertAdjacentHTML('beforeend', estilosNotificacion);