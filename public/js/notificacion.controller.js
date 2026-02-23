// ================== SISTEMA DE TEMAS ==================
const themeToggle = document.getElementById('theme-toggle');
const themeSlider = document.querySelector('.theme-toggle-slider');
const htmlElement = document.documentElement;

// Cargar tema guardado al iniciar
function loadTheme() {
    const currentTheme = localStorage.getItem('theme') || 'light';
    if (currentTheme === 'dark') {
        htmlElement.setAttribute('data-theme', 'dark');
        if (themeToggle) themeToggle.checked = true;
    }
}

// Función para cambiar tema
function toggleTheme() {
    if (!themeToggle || !themeSlider) return;
    
    // Añadir clase de transición
    htmlElement.setAttribute('data-theme-transitioning', '');
    
    // Animar el slider
    themeSlider.classList.add('animating');
    
    // Cambiar tema
    const isDark = themeToggle.checked;
    
    if (isDark) {
        htmlElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
        console.log('🌙 Tema oscuro activado');
    } else {
        htmlElement.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
        console.log('☀️ Tema claro activado');
    }
    
    // Remover clases de animación después de completar
    setTimeout(() => {
        htmlElement.removeAttribute('data-theme-transitioning');
        themeSlider.classList.remove('animating');
    }, 300);
}

// Event listeners
if (themeToggle) {
    themeToggle.addEventListener('change', toggleTheme);
}

// Cargar tema al iniciar
loadTheme();

// Mostrar animación de carga
window.addEventListener('load', () => {
    if (themeSlider) {
        setTimeout(() => {
            themeSlider.style.opacity = '1';
        }, 100);
    }
});

// ═══════════════════════════════════════════════════════════
// FUNCIONES GLOBALES
// ═══════════════════════════════════════════════════════════

function toggleNotifications(event) {
    event.stopPropagation();
    const list = document.getElementById("notification-list");
    if (list) {
        list.style.display = (list.style.display === "block") ? "none" : "block";
    }
    const activeMenu = document.querySelector('.kebab-menu.active');
    if (activeMenu) activeMenu.classList.remove('active');
}

function handleImageError(img) {
    if (img.src.includes('default_avatar.png')) {
        console.warn('Imagen default también falló');
        return;
    }
    img.onerror = null;
    img.src = '/uploads/default_avatar.png';
    img.alt = 'Avatar por defecto';
}

// ═══════════════════════════════════════════════════════════
// INICIALIZACIÓN - Solo si hay usuario logueado
// ═══════════════════════════════════════════════════════════

// ✅ Verificar que exista window.usuarioActual (viene de main.hbs)
if (window.usuarioActual) {
    
    // ═══════════════════════════════════════════════════════════
    // FUNCIÓN DE PARSING PARA EXTRA_DATA
    // ═══════════════════════════════════════════════════════════
    function parseExtraDataSafe(extraDataRaw) {
        if (typeof extraDataRaw === 'object' && extraDataRaw !== null) {
            return extraDataRaw;
        }
        
        if (typeof extraDataRaw === 'string') {
            const trimmed = extraDataRaw.trim();
            if (trimmed.length === 0) return null;
            
            try {
                return JSON.parse(trimmed);
            } catch (error) {
                console.error('[PARSE ERROR]:', error.message);
                return null;
            }
        }
        
        return null;
    }

    // ═══════════════════════════════════════════════════════════
    // CARGAR NOTIFICACIONES
    // ═══════════════════════════════════════════════════════════
    async function cargarNotificaciones() {
        try {
            const response = await fetch('/notificaciones');
            const data = await response.json();
            const ul = document.getElementById("notifications-ul");
            if (!ul) return;
            
            ul.innerHTML = data.length === 0 ? "<li>No tienes notificaciones</li>" : "";
            
            data.forEach(notif => {
                const li = document.createElement('li');
                let extraData = null;
                
                if (notif.extra_data) {
                    extraData = parseExtraDataSafe(notif.extra_data);
                }

            if (notif.tipo === 'promocion_editor_disponible') {
                li.innerHTML = `
                    <span>🎨 ${notif.mensaje}</span>
                    <button class="btn-promocionar" 
                            data-id="${notif.id_notificacion}"
                            data-tipo="editor"
                            style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer; margin-left: 10px; font-weight: bold;">
                        Ser Editor
                    </button>
                    <button class="btn-eliminar" 
                            data-id="${notif.id_notificacion}" 
                            style="background: #dc3545; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer; margin-left: 5px;">
                        ✕
                    </button>
                `;
            }
            // REVISOR
            else if (notif.tipo === 'promocion_revisor_disponible') {
                li.innerHTML = `
                    <span>👑 ${notif.mensaje}</span>
                    <button class="btn-promocionar" 
                            data-id="${notif.id_notificacion}"
                            data-tipo="revisor"
                            style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer; margin-left: 10px; font-weight: bold;">
                        Ser Revisor
                    </button>
                    <button class="btn-eliminar" 
                            data-id="${notif.id_notificacion}" 
                            style="background: #dc3545; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer; margin-left: 5px;">
                        ✕
                    </button>
                `;
            }

            else if (notif.tipo === 'promocion_completada') {
                li.innerHTML = `
                    <span>${notif.mensaje}</span>
                    <button class="btn-eliminar" 
                            data-id="${notif.id_notificacion}" 
                            style="background: #dc3545; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer; margin-left: 5px;">
                        ✕
                    </button>
                `;

            } else if (notif.tipo === 'desafio_duelo_rapido') {
                    const salaId = extraData?.salaId || 'NO_SALA';
                    
                    li.innerHTML = `
                        <span>⚔️ ${notif.mensaje}</span>
                        <button class="btn-aceptar" 
                                data-id="${notif.id_notificacion}"
                                data-sala-id="${salaId}"
                                data-tipo="${notif.tipo}">
                            Aceptar
                        </button>
                        <button class="btn-rechazar" data-id="${notif.id_notificacion}">
                            Rechazar
                        </button>
                    `;
                }

                // 📚 DUELO 48 HORAS - PENDIENTE DE ACEPTAR
                else if (notif.tipo === 'desafio_duelo') {
                    li.innerHTML = `
                        <span>📚 ${notif.mensaje}</span>
                        <button class="btn-aceptar" 
                                data-id="${notif.id_notificacion}"
                                data-tipo="${notif.tipo}">
                            Aceptar
                        </button>
                        <button class="btn-rechazar" data-id="${notif.id_notificacion}">
                            Rechazar
                        </button>
                    `;
                }
                // ✅ DUELO ACEPTADO - BOTÓN PARA UNIRSE
                else if (notif.tipo === 'duelo_aceptado') {
                    let ed = extraData || {};
                    const urlExamen = ed.url_examen || `/duelo/examen/${ed.salaId || ed.id_duelo}`;
                    
                    console.log('[NOTIF DUELO ACEPTADO]:', {
                        extraData: ed,
                        urlExamen: urlExamen,
                        salaId: ed.salaId,
                        id_duelo: ed.id_duelo
                    });
                    
                    li.innerHTML = `
                        <span>📚 ${notif.mensaje}</span>
                        <button class="btn-ir-examen" 
                                onclick="window.location.href='${urlExamen}'" 
                                style="background: #28a745; color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer; margin-left: 10px; font-weight: bold;">
                            Unirse
                        </button>
                        <button class="btn-eliminar" 
                                data-id="${notif.id_notificacion}" 
                                style="background: #dc3545; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer; margin-left: 5px;">
                            ✕
                        </button>
                    `;
                }

                else if (notif.tipo === 'invitacion') {
                    li.innerHTML = `
                        <span>🎮 ${notif.mensaje}</span>
                        <button class="btn-aceptar" 
                                data-id="${notif.id_notificacion}"
                                data-tipo="${notif.tipo}">
                            Aceptar
                        </button>
                        <button class="btn-rechazar" data-id="${notif.id_notificacion}">
                            Rechazar
                        </button>
                    `;
                } else if (notif.tipo === 'duelo_completado') {
                    let ed = extraData || {};
                    const urlResultados = `/duelo/resultados/${ed.salaId || ed.id_duelo}`;
                    
                    console.log('[NOTIF DUELO COMPLETADO]:', {
                        extraData: ed,
                        urlResultados: urlResultados,
                        salaId: ed.salaId,
                        id_duelo: ed.id_duelo
                    });
                    
                    li.innerHTML = `
                        <span>🏆 ${notif.mensaje}</span>
                        <button class="btn-ver-resultados" 
                                onclick="window.location.href='${urlResultados}'" 
                                style="background: #007bff; color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer; margin-left: 10px; font-weight: bold;">
                            Ver Resultados
                        </button>
                        <button class="btn-eliminar" 
                                data-id="${notif.id_notificacion}" 
                                style="background: #dc3545; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer; margin-left: 5px;">
                            ✕
                        </button>
                    `;
                } else if (notif.tipo === 'duelo_completado') {
                    let ed = extraData || {};
                    const urlResultados = `/duelo/resultados/${ed.salaId || ed.id_duelo}`;
                    
                    console.log('[NOTIF DUELO COMPLETADO]:', {
                        extraData: ed,
                        urlResultados: urlResultados,
                        salaId: ed.salaId,
                        id_duelo: ed.id_duelo
                    });
                    
                    li.innerHTML = `
                        <span>🏆 ${notif.mensaje}</span>
                        <button class="btn-ver-resultados" 
                                onclick="window.location.href='${urlResultados}'" 
                                style="background: #007bff; color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer; margin-left: 10px; font-weight: bold;">
                            Ver Resultados
                        </button>
                        <button class="btn-eliminar" 
                                data-id="${notif.id_notificacion}" 
                                style="background: #dc3545; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer; margin-left: 5px;">
                            ✕
                        </button>
                    `;
                  
                }
                // 📩 SOLICITUD DE AMISTAD (tú recibes la solicitud)
                else if (notif.tipo === 'solicitud_amistad') {
                    li.innerHTML = `
                        <span>🤝 ${notif.mensaje}</span>
                        <button class="btn-aceptar"
                                data-id="${notif.id_notificacion}"
                                data-tipo="solicitud_amistad"
                                style="background: linear-gradient(135deg, #3b82f6, #1d4ed8);
                                    color: white; border: none; padding: 8px 14px;
                                    border-radius: 5px; cursor: pointer; margin-left: 8px;
                                    font-weight: bold; font-size: 13px;">
                            Aceptar
                        </button>
                        <button class="btn-rechazar"
                                data-id="${notif.id_notificacion}"
                                style="background: #dc3545; color: white; border: none;
                                    padding: 5px 10px; border-radius: 3px; cursor: pointer;
                                    margin-left: 5px;">
                            ✕
                        </button>
                    `;
                }

                // 🎉 AMISTAD ACEPTADA (tú enviaste la solicitud y fue aceptada)
                else if (notif.tipo === 'amistad_aceptada') {
                    li.innerHTML = `
                        <span>🎉 ${notif.mensaje}</span>
                        <button class="btn-eliminar"
                                data-id="${notif.id_notificacion}"
                                style="background: #dc3545; color: white; border: none;
                                    padding: 5px 10px; border-radius: 3px; cursor: pointer;
                                    margin-left: 5px;">
                            ✕
                        </button>
                    `;
                } else {
                    li.innerHTML = `<span>${notif.mensaje}</span>
                    <button class="btn-rechazar" data-id="${notif.id_notificacion}">
                        X
                    </button>`;
                }
                
                ul.appendChild(li);
            });
            
            const countEl = document.getElementById("notification-count");
            if(countEl) {
                countEl.style.display = data.length > 0 ? "inline" : "none";
                countEl.innerText = data.length;
            }
        } catch (error) { 
            console.error("[CARGAR NOTIF ERROR]:", error); 
        }
    }

    async function actualizarNotificacionesAlTerminar(salaId, conn) {
        try {
            console.log(`[ACTUALIZAR NOTIF] Verificando si ambos terminaron: ${salaId}`);
            
            // 1️⃣ Verificar si ambos completaron
            const [duelo] = await conn.query(`
                SELECT respondido_retador, respondido_oponente, id_retador, id_defensor
                FROM duelos 
                WHERE id_duelo = ?
            `, [salaId]);
            
            if (duelo.length === 0) return;
            
            const ambosTerminaron = duelo[0].respondido_retador && duelo[0].respondido_oponente;
            
            if (!ambosTerminaron) {
                console.log(`[ACTUALIZAR NOTIF] ⏳ Todavía falta que uno termine`);
                return;
            }
            
            console.log(`[ACTUALIZAR NOTIF] ✅ Ambos terminaron, actualizando notificaciones`);
            
            // 2️⃣ Actualizar mensaje de TODAS las notificaciones relacionadas
            await conn.query(`
                UPDATE notificaciones 
                SET 
                    mensaje = CASE 
                        WHEN id_usuario_destinatario = ? 
                        THEN CONCAT('🏆 Duelo completado - Ver resultados')
                        ELSE CONCAT('🏆 Duelo completado - Ver resultados')
                    END,
                    tipo = 'duelo_completado'
                WHERE tipo = 'duelo_aceptado' 
                AND JSON_EXTRACT(extra_data, '$.salaId') = ?
            `, [duelo[0].id_retador, salaId]);
            
            console.log(`[ACTUALIZAR NOTIF] ✅ Notificaciones actualizadas a 'duelo_completado'`);
            
            // 3️⃣ Emitir evento socket para actualizar en tiempo real
            const io = global.io || req?.app?.get('io');
            if (io) {
                io.to(duelo[0].id_retador.toString()).emit('notificacion_recibida');
                io.to(duelo[0].id_defensor.toString()).emit('notificacion_recibida');
                console.log(`[ACTUALIZAR NOTIF] 📡 Sockets emitidos`);
            }
            
        } catch (error) {
            console.error('❌ Error actualizando notificaciones:', error);
        }
    }

    // ═══════════════════════════════════════════════════════════
    // DOM READY
    // ═══════════════════════════════════════════════════════════
    document.addEventListener('DOMContentLoaded', function() {
        
        const kebabButton = document.querySelector('.kebab-button');
        if (kebabButton) {
            gsap.set('.kebab-dropdown li', { opacity: 0, y: -15 });
            kebabButton.addEventListener('click', function(e) {
                e.stopPropagation();
                const notifList = document.getElementById('notification-list');
                if (notifList) notifList.style.display = 'none';
                
                const menu = this.parentElement;
                const isActive = menu.classList.toggle('active');
                gsap.to('.kebab-dropdown', { opacity: isActive ? 1 : 0, duration: 0.2 });
                gsap.to('.kebab-dropdown li', { opacity: isActive ? 1 : 0, y: isActive ? 0 : -15, stagger: 0.1, duration: 0.3 });
            });
        }

        document.addEventListener('click', () => {
            const activeMenu = document.querySelector('.kebab-menu.active');
            if (activeMenu) activeMenu.classList.remove('active');
            const notifList = document.getElementById("notification-list");
            if(notifList) notifList.style.display = 'none';
        });
        
        document.querySelector('.kebab-dropdown')?.addEventListener('click', e => e.stopPropagation());
        document.getElementById('notification-list')?.addEventListener('click', e => e.stopPropagation());

        const socket = io();
        socket.emit('registrar_usuario', window.usuarioActual.id_usuario);

        // ═══════════════════════════════════════════════════════════
        // LISTENERS DE BOTONES DE NOTIFICACIONES
        // ═══════════════════════════════════════════════════════════
        document.getElementById('notifications-ul')?.addEventListener('click', async (event) => {
            // 👑 BOTÓN PROMOCIONAR
            if (event.target.classList.contains('btn-promocionar')) {
                const notifId = event.target.dataset.id;
                const tipoPromocion = event.target.dataset.tipo; // 'editor' o 'revisor'
                const button = event.target;
                
                // Confirmación
                const confirmar = confirm(
                    tipoPromocion === 'editor' 
                        ? '¿Deseas convertirte en Editor? (2,500 puntos)' 
                        : '¿Deseas convertirte en Revisor? (5,000 puntos)'
                );
                
                if (!confirmar) return;
                
                button.disabled = true;
                button.textContent = 'Procesando...';
                
                try {
                    const endpoint = tipoPromocion === 'editor' 
                        ? '/api/promocion/promocionar-editor' 
                        : '/api/promocion/promocionar-revisor';
                    
                    const response = await fetch(endpoint, {
                        method: 'POST',
                        credentials: 'include',
                        headers: { 'Content-Type': 'application/json' }
                    });
                    
                    const data = await response.json();
                    
                    if (data.success) {
                        // Crear overlay con animación
                        const overlay = document.createElement('div');
                        overlay.style.cssText = `
                            position: fixed;
                            top: 0;
                            left: 0;
                            right: 0;
                            bottom: 0;
                            background: rgba(0, 0, 0, 0.8);
                            z-index: 9999;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                        `;
                        
                        const mensaje = document.createElement('div');
                        mensaje.style.cssText = `
                            background: white;
                            padding: 40px;
                            border-radius: 15px;
                            text-align: center;
                            max-width: 500px;
                            animation: fadeInScale 0.3s ease-out;
                        `;
                        
                        mensaje.innerHTML = `
                            <div style="font-size: 64px; margin-bottom: 20px;">
                                ${tipoPromocion === 'editor' ? '🎨' : '👑'}
                            </div>
                            <h2 style="margin: 0 0 15px 0; color: #333;">¡Felicidades!</h2>
                            <p style="margin: 0; color: #666; font-size: 18px;">
                                ${data.mensaje}
                            </p>
                            <button onclick="location.reload()" 
                                    style="margin-top: 25px; background: #28a745; color: white; border: none; padding: 12px 30px; border-radius: 25px; cursor: pointer; font-weight: bold; font-size: 16px;">
                                ¡Entendido!
                            </button>
                        `;
                        
                        overlay.appendChild(mensaje);
                        document.body.appendChild(overlay);
                        
                        // Auto-reload después de 5 segundos
                        setTimeout(() => location.reload(), 5000);
                    } else {
                        alert(data.mensaje || 'Error al procesar promoción');
                        button.disabled = false;
                        button.textContent = tipoPromocion === 'editor' ? 'Ser Editor' : 'Ser Revisor';
                    }
                } catch (error) {
                    console.error('[PROMOCIÓN ERROR]:', error);
                    alert('Error al procesar la promoción');
                    button.disabled = false;
                    button.textContent = tipoPromocion === 'editor' ? 'Ser Editor' : 'Ser Revisor';
                }
                return; // ✅ IMPORTANTE: Salir después de procesar promoción
            }
            
            // ✅ ACEPTAR (DUELOS E INVITACIONES)
            if (event.target.classList.contains('btn-aceptar')) {
                console.log('═══════════════════════════════════════════════════════════');
                console.log('[BTN ACEPTAR]: 🖱️ CLICK');
                console.log('═══════════════════════════════════════════════════════════');
                
                const notifId = event.target.dataset.id;
                const tipoNotif = event.target.dataset.tipo;
                const button = event.target;
                
                console.log('[BTN]: ID:', notifId);
                console.log('[BTN]: Tipo:', tipoNotif);
                
                // Mostrar estado de carga en el <li>
                const li = event.target.closest('li');
                if (li) {
                    li.style.opacity = '0.5';
                    li.innerHTML = '<span>⏳ Procesando...</span>';
                }
                
                button.disabled = true;
                button.textContent = 'Procesando...';
                
                try {                    
                    const response = await fetch(`/aceptar/${notifId}`, { 
                        method: 'POST', 
                        credentials: 'include',
                        headers: { 
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        }
                    });
                    
                    const contentType = response.headers.get('content-type');
                    
                    if (!contentType || !contentType.includes('application/json')) {
                        const text = await response.text();
                        throw new Error('Respuesta no es JSON');
                    }
                    
                    const data = await response.json();
                    
                    if (!response.ok) {
                        throw new Error(data.message || `HTTP ${response.status}`);
                    }
                    
                    if (data.success) {
                        
                        // ⚔️ DUELO RÁPIDO BD
                        if (data.tipo === 'desafio_duelo_rapido') {
                            
                            if (!data.salaId) {
                                throw new Error('No se recibió salaId');
                            }
                            
                            if (!data.redirigir) {

                                throw new Error('No se recibió URL');
                            }
                            
                            console.log('[BTN]: 📡 Emitiendo socket...');
                            
                            socket.emit('duelo:aceptarDesafioBD', {
                                salaId: data.salaId,
                                idRetado: window.usuarioActual.id_usuario
                            });
                            
                            console.log('[BTN]: ✅ Socket emitido');
                            
                            const mensaje = document.createElement('div');
                            mensaje.className = 'notification-message duelo-rapido';
                            mensaje.innerHTML = `
                                <div style="font-size: 48px; margin-bottom: 10px;">⚔️</div>
                                <h3 style="margin: 0 0 15px 0; font-size: 24px;">¡Desafío Aceptado!</h3>
                                <p style="margin: 0 0 20px 0;">${data.message}</p>
                                <div class="spinner"></div>
                                <p style="margin: 15px 0 0 0; font-size: 14px;">Conectando a la sala...</p>
                            `;
                            document.body.appendChild(mensaje);
                            
                            setTimeout(() => {
                                console.log('[BTN]: 🚀 REDIRIGIENDO:', data.redirigir);
                                window.location.href = data.redirigir;
                            }, 3000);
                            
                            console.log('═══════════════════════════════════════════════════════════');
                            console.log('[BTN]: ✅ Proceso OK');
                            console.log('═══════════════════════════════════════════════════════════');
                            
                            return;
                        }
                        
                        // 📚 DUELO 48 HORAS
                        if (data.tipo === 'desafio_duelo') {
                            console.log('[BTN]: 📚 DUELO 48 HORAS ACEPTADO');
                            console.log('[BTN]: Mostrar mensaje:', data.mostrar_mensaje);
                            console.log('[BTN]: Extra data:', data.extra_data);
                            
                            // Crear overlay oscuro
                            const overlay = document.createElement('div');
                            overlay.id = 'duelo-overlay';
                            overlay.style.cssText = `
                                position: fixed;
                                top: 0;
                                left: 0;
                                right: 0;
                                bottom: 0;
                                background: rgba(0, 0, 0, 0.7);
                                z-index: 9999;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                            `;
                            
                            // Crear mensaje modal
                            const mensajeDiv = document.createElement('div');
                            mensajeDiv.id = 'duelo-aceptado-mensaje';
                            mensajeDiv.style.cssText = `
                                background: black;
                                padding: 40px;
                                border-radius: 15px;
                                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
                                text-align: center;
                                min-width: 400px;
                                max-width: 90%;
                                color: #333;
                                animation: fadeInScale 0.3s ease-out;
                            `;
                            
                            mensajeDiv.innerHTML = `
                                <div style="font-size: 48px; margin-bottom: 10px;">📚</div>
                                <h3 style="margin: 0 0 15px 0; font-size: 24px; color: #ffffff;">¡Desafío Aceptado!</h3>
                                <p style="margin: 0 0 20px 0; color: #ffffff;">${data.message}</p>
                                <p style="margin: 0 0 15px 0; color: #ffffff;">
                                    <strong>Haz clic en las notificaciones 🔔 para ver el botón "Unirse"</strong>
                                </p>
                                <div style="margin-top: 15px;">
                                    <button id="btn-cerrar-mensaje" style="background: #28a745; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-weight: bold; transition: background 0.2s;">
                                        Entendido
                                    </button>
                                </div>
                            `;
                            
                            overlay.appendChild(mensajeDiv);
                            document.body.appendChild(overlay);
                            
                            // ✅ Recargar notificaciones después de 1.5s
                            setTimeout(() => {
                                cargarNotificaciones();
                            }, 1500);
                            
                            // Agregar animación CSS si no existe
                            if (!document.getElementById('duelo-animation-styles')) {
                                const style = document.createElement('style');
                                style.id = 'duelo-animation-styles';
                                style.textContent = `
                                    @keyframes fadeInScale {
                                        from {
                                            opacity: 0;
                                            transform: scale(0.9);
                                        }
                                        to {
                                            opacity: 1;
                                            transform: scale(1);
                                        }
                                    }
                                    #btn-cerrar-mensaje:hover {
                                        background: #218838 !important;
                                    }
                                `;
                                document.head.appendChild(style);
                            }
                            
                            document.getElementById('btn-cerrar-mensaje').addEventListener('click', () => {
                                overlay.remove();
                                cargarNotificaciones();
                            });
                            
                            // Auto-cerrar después de 10 segundos
                            setTimeout(() => {
                                if (document.getElementById('duelo-overlay')) {
                                    overlay.remove();
                                    cargarNotificaciones();
                                }
                            }, 10000);
                            
                            console.log('═══════════════════════════════════════════════════════════');
                            console.log('[BTN]: ✅ Duelo 48h procesado');
                            console.log('═══════════════════════════════════════════════════════════');
                            
                            return;
                        }


                                                // 🎮 INVITACIÓN A MINIJUEGO
                        if (data.tipo === 'invitacion') {
                            console.log('[BTN]: 🎮 INVITACIÓN ACEPTADA, redirigiendo:', data.redirigir);
                            
                            // Mostrar mensaje de confirmación
                            const mensaje = document.createElement('div');
                            mensaje.className = 'notification-message invitacion';
                            mensaje.innerHTML = `
                                <div style="font-size: 48px; margin-bottom: 10px;">🎮</div>
                                <h3 style="margin: 0 0 15px 0; font-size: 24px;">¡Invitación Aceptada!</h3>
                                <p style="margin: 0 0 20px 0;">Uniéndose al juego...</p>
                                <div class="spinner"></div>
                            `;
                            document.body.appendChild(mensaje);
                            
                            setTimeout(() => window.location.href = data.redirigir, 1500);
                            return;
                        }
                        
                        // ✅ Para otros tipos, recargar después de 1.5s
                        setTimeout(cargarNotificaciones, 1500);
                        
                    } else {
                        console.error('[BTN]: ❌ success = false');
                        alert(data.message || 'Error');
                        button.disabled = false;
                        button.textContent = 'Aceptar';
                    }
                    
                } catch (error) {
                    console.error('═══════════════════════════════════════════════════════════');
                    console.error('[BTN]: ❌❌❌ ERROR');
                    console.error('[BTN]: Mensaje:', error.message);
                    console.error('═══════════════════════════════════════════════════════════');
                    
                    alert('Error: ' + error.message);
                    button.disabled = false;
                    button.textContent = 'Aceptar';
                }
            }
            
            // ❌ RECHAZAR
            if (event.target.classList.contains('btn-rechazar')) {
                const notifId = event.target.dataset.id;
                const button = event.target;
                button.disabled = true;
                button.textContent = 'Rechazando...';

                try {
                    const li = event.target.closest('li');
                    if (li) {
                        li.style.opacity = '0.5';
                        li.innerHTML = '<span>⏳ Eliminando...</span>';
                    }
                    
                    await fetch(`/rechazar/${notifId}`, { 
                        method: 'POST', 
                        credentials: 'include' 
                    });
                    
                    setTimeout(cargarNotificaciones, 1500);
                } catch (error) {
                    console.error('[RECHAZAR ERROR]:', error);
                    button.disabled = false;
                    button.textContent = 'Rechazar';
                }
            }
            
            // 🗑️ ELIMINAR
            if (event.target.classList.contains('btn-eliminar')) {
                const notifId = event.target.dataset.id;
                const button = event.target;
                button.disabled = true;
                button.textContent = '...';

                try {
                    const li = event.target.closest('li');
                    if (li) {
                        li.style.opacity = '0.5';
                        li.innerHTML = '<span>⏳ Eliminando...</span>';
                    }
                    
                    await fetch(`/rechazar/${notifId}`, { 
                        method: 'POST', 
                        credentials: 'include' 
                    });
                    
                    setTimeout(cargarNotificaciones, 1500);
                } catch (error) {
                    console.error('[ELIMINAR ERROR]:', error);
                    button.disabled = false;
                    button.textContent = '✕';
                }
            }
        });

        // ═══════════════════════════════════════════════════════════
        // SOCKET LISTENERS
        // ═══════════════════════════════════════════════════════════
        
        socket.on('duelo:iniciarDesafio', ({ salaId, mensaje }) => {
            console.log('🚀 duelo:iniciarDesafio:', { salaId, mensaje });
            if (mensaje) alert(mensaje);
            window.location.href = `/duelo/enfrentamiento/${salaId}`;
        });

        socket.on('notificacion_recibida', () => {
            console.log('🔔 notificacion_recibida');
            cargarNotificaciones(); 
        });
        
        socket.on('duelo:aceptado', (data) => {
            console.log('✅ duelo:aceptado recibido:', data);
            cargarNotificaciones();
        });
        
        // Cargar notificaciones al inicio
        cargarNotificaciones();
        
        // Recargar periódicamente
        setInterval(cargarNotificaciones, 30000);
    });

    // Aplicar manejo de errores a todas las imágenes de perfil al cargar
    document.addEventListener('DOMContentLoaded', function() {
        document.querySelectorAll('img[src*="foto_perfil"], img.player-avatar, img.jugador-avatar, img.avatar, img.profile-avatar').forEach(img => {
            img.onerror = function() { handleImageError(this); };
        });
    });
}
