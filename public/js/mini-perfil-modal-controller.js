// =============================================
// 🎭 CONTROLADOR MODAL MINI-PERFIL
// public/js/mini-perfil-modal.controller.js
// =============================================

(function() {
    'use strict';
    
    console.log('[MINI PERFIL]: 🎭 Inicializando controlador...');
    
    // ═════════════════════════════════════════
    // 🎯 FUNCIÓN PRINCIPAL: ABRIR MODAL
    // ═════════════════════════════════════════
    
    window.abrirMiniPerfil = async function(idUsuario) {
        console.log(`[MINI PERFIL]: 📂 Abriendo perfil de usuario ${idUsuario}`);
        
        try {
            // Crear modal si no existe
            let overlay = document.getElementById('miniPerfilOverlay');
            if (!overlay) {
                overlay = crearModalBase();
                document.body.appendChild(overlay);
            }
            
            // Mostrar loading
            const modalContent = overlay.querySelector('.mini-perfil-modal');
            modalContent.classList.add('cargando');
            modalContent.innerHTML = '<div class="mini-perfil-loading">⏳</div>';
            overlay.classList.add('active');
            
            // Obtener datos del usuario
            const response = await fetch(`/api/usuario/mini-perfil/${idUsuario}`);
            
            if (!response.ok) {
                throw new Error('Error al cargar perfil');
            }
            
            const data = await response.json();
            console.log('[MINI PERFIL]: ✅ Datos recibidos:', data);
            
            // Renderizar modal con datos
            renderizarMiniPerfil(modalContent, data);
            modalContent.classList.remove('cargando');
            
        } catch (error) {
            console.error('[MINI PERFIL ERROR]:', error);
            mostrarError();
        }
    };
    
    // ═════════════════════════════════════════
    // 🏗️ CREAR ESTRUCTURA BASE DEL MODAL
    // ═════════════════════════════════════════
    
    function crearModalBase() {
        const overlay = document.createElement('div');
        overlay.id = 'miniPerfilOverlay';
        overlay.className = 'mini-perfil-overlay';
        
        overlay.innerHTML = `
            <div class="mini-perfil-modal">
                <!-- Contenido dinámico -->
            </div>
        `;
        
        // Cerrar al hacer click en el overlay
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                cerrarMiniPerfil();
            }
        });
        
        return overlay;
    }
    
    // ═════════════════════════════════════════
    // 🎨 RENDERIZAR CONTENIDO DEL MODAL
    // ═════════════════════════════════════════
    
    function renderizarMiniPerfil(container, data) {
        const {
            usuario,
            stats,
            insignias_equipadas,
            posicion_global,
            titulo_personalizado
        } = data;
        
        // Determinar si tiene insignias legendarias
        const tieneInsigniasLegendarias = insignias_equipadas.some(i => i.rareza === 'legendaria');
        
        const html = `
            <!-- Header con banner y avatar -->
            <div class="mini-perfil-header">
                <button class="mini-perfil-close" onclick="cerrarMiniPerfil()">
                    <i class="fas fa-times"></i>
                </button>
                
                ${posicion_global <= 10 ? `
                    <div class="mini-perfil-ranking-badge">
                        <i class="fas fa-crown"></i>
                        Top ${posicion_global}
                    </div>
                ` : ''}
                
                <div class="mini-perfil-avatar-container ${tieneInsigniasLegendarias ? 'legendario' : ''}">
                    <div class="mini-perfil-avatar-border"></div>
                    <img src="${usuario.foto_perfil || '/uploads/default_avatar.png'}" 
                         alt="${usuario.username}" 
                         class="mini-perfil-avatar"
                         onerror="this.src='/uploads/default_avatar.png'">
                </div>
            </div>
            
            <!-- Body con información -->
            <div class="mini-perfil-body">
                <!-- Nombre y carrera -->
                <h2 class="mini-perfil-username">${usuario.apodo || usuario.username}</h2>
                
                ${usuario.carrera_descripcion ? `
                    <div class="mini-perfil-carrera">
                        <i class="fas fa-graduation-cap"></i>
                        <span>${usuario.carrera_descripcion}</span>
                    </div>
                ` : ''}
                
                ${titulo_personalizado ? `
                    <div class="mini-perfil-titulo">
                        <i class="fas fa-medal"></i> ${titulo_personalizado}
                    </div>
                ` : ''}
                
                <!-- Estadísticas rápidas -->
                <div class="mini-perfil-stats">
                    <div class="mini-perfil-stat destacado">
                        <div class="mini-perfil-stat-value">${formatNumber(stats.puntos_totales)}</div>
                        <div class="mini-perfil-stat-label">Puntos</div>
                    </div>
                    <div class="mini-perfil-stat">
                        <div class="mini-perfil-stat-value">${stats.examenes_realizados}</div>
                        <div class="mini-perfil-stat-label">Exámenes</div>
                    </div>
                    <div class="mini-perfil-stat">
                        <div class="mini-perfil-stat-value">${stats.victorias}</div>
                        <div class="mini-perfil-stat-label">Victorias</div>
                    </div>
                </div>
                
                <!-- Racha de victorias -->
                ${stats.racha_victorias > 0 ? `
                    <div class="mini-perfil-racha">
                        <div class="mini-perfil-racha-label">
                            <span class="mini-perfil-racha-icon">🔥</span>
                            <span>Racha Actual</span>
                        </div>
                        <div class="mini-perfil-racha-value">${stats.racha_victorias}</div>
                    </div>
                ` : ''}
                
                <!-- Insignias equipadas -->
                <div class="mini-perfil-insignias-section">
                    <div class="mini-perfil-section-title">
                        <i class="fas fa-medal"></i>
                        <span>Insignias Destacadas</span>
                    </div>
                    <div class="mini-perfil-insignias-grid">
                        ${renderizarInsignias(insignias_equipadas)}
                    </div>
                </div>
                
                <!-- Botón ver perfil completo -->
                <button class="mini-perfil-btn-completo" onclick="verPerfilCompleto(${usuario.id_usuario})">
                    <span>Ver Perfil Completo</span>
                    <i class="fas fa-arrow-right"></i>
                </button>
            </div>
        `;
        
        container.innerHTML = html;
    }
    
    // ═════════════════════════════════════════
    // 🏅 RENDERIZAR INSIGNIAS
    // ═════════════════════════════════════════
    
    function renderizarInsignias(insignias) {
        let html = '';
        
        // Máximo 6 espacios
        for (let i = 0; i < 6; i++) {
            const insignia = insignias[i];
            
            if (insignia) {
                html += `
                    <div class="mini-perfil-insignia ${insignia.rareza}" 
                         title="${insignia.nombre}">
                        <img src="${insignia.imagen}" 
                             alt="${insignia.nombre}"
                             onerror="this.src='/media/insignias/default.png'">
                        <div class="mini-perfil-insignia-tooltip">
                            ${insignia.nombre}
                        </div>
                    </div>
                `;
            } else {
                html += `
                    <div class="mini-perfil-insignia vacia">
                        <!-- Espacio vacío -->
                    </div>
                `;
            }
        }
        
        return html;
    }
    
    // ═════════════════════════════════════════
    // 🔢 FORMATEAR NÚMEROS
    // ═════════════════════════════════════════
    
    function formatNumber(num) {
        if (num === undefined || num === null) return '0';
        return Number(num).toLocaleString('es-MX');
    }
    
    // ═════════════════════════════════════════
    // ❌ MOSTRAR ERROR
    // ═════════════════════════════════════════
    
    function mostrarError() {
        const overlay = document.getElementById('miniPerfilOverlay');
        if (!overlay) return;
        
        const modal = overlay.querySelector('.mini-perfil-modal');
        modal.classList.remove('cargando');
        modal.innerHTML = `
            <div class="mini-perfil-error" style="
                padding: 40px;
                text-align: center;
                color: #ef4444;
            ">
                <i class="fas fa-exclamation-circle" style="font-size: 48px; margin-bottom: 20px;"></i>
                <h3 style="color: #f1f5f9; margin-bottom: 10px;">Error al cargar perfil</h3>
                <p style="color: #94a3b8;">No se pudo obtener la información del usuario</p>
                <button class="mini-perfil-btn-completo" onclick="cerrarMiniPerfil()" style="margin-top: 20px;">
                    Cerrar
                </button>
            </div>
        `;
    }
    
    // ═════════════════════════════════════════
    // 🚪 CERRAR MODAL
    // ═════════════════════════════════════════
    
    window.cerrarMiniPerfil = function() {
        console.log('[MINI PERFIL]: 🚪 Cerrando modal');
        const overlay = document.getElementById('miniPerfilOverlay');
        if (overlay) {
            overlay.classList.remove('active');
        }
    };
    
    // ═════════════════════════════════════════
    // 🔗 IR A PERFIL COMPLETO
    // ═════════════════════════════════════════
    
    window.verPerfilCompleto = function(idUsuario) {
        console.log('[MINI PERFIL]: 🔗 Redirigiendo a perfil completo');
        cerrarMiniPerfil();
        window.location.href = `/usuario/perfil/${idUsuario}`;
    };
    
    // ═════════════════════════════════════════
    // ⌨️ ATAJOS DE TECLADO
    // ═════════════════════════════════════════
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const overlay = document.getElementById('miniPerfilOverlay');
            if (overlay && overlay.classList.contains('active')) {
                cerrarMiniPerfil();
            }
        }
    });
    
    console.log('[MINI PERFIL]: ✅ Controlador cargado');
    
})();