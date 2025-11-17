// public/js/notificaciones.js - FRONTEND LIMPIO

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
                
                // ⚔️ DUELO RÁPIDO BD
                if (notif.tipo === 'desafio_duelo_rapido') {
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

        // ═══════════════════════════════════════════════════════════
        // LISTENERS DE BOTONES DE NOTIFICACIONES
        // ═══════════════════════════════════════════════════════════
        document.getElementById('notifications-ul')?.addEventListener('click', async (event) => {
            
            // ✅ ACEPTAR
            if (event.target.classList.contains('btn-aceptar')) {
                console.log('═══════════════════════════════════════════════════════════');
                console.log('[BTN ACEPTAR]: 🖱️ CLICK');
                console.log('═══════════════════════════════════════════════════════════');
                
                const notifId = event.target.dataset.id;
                const tipoNotif = event.target.dataset.tipo;
                const button = event.target;
                
                console.log('[BTN]: ID:', notifId);
                console.log('[BTN]: Tipo:', tipoNotif);
                
                button.disabled = true;
                button.textContent = 'Procesando...';
                
                try {
                    console.log('[BTN]: 📤 POST /aceptar/' + notifId);
                    
                    const response = await fetch(`/aceptar/${notifId}`, { 
                        method: 'POST', 
                        credentials: 'include',
                        headers: { 
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        }
                    });
                    
                    console.log('[BTN]: Status:', response.status);
                    
                    const contentType = response.headers.get('content-type');
                    console.log('[BTN]: Content-Type:', contentType);
                    
                    if (!contentType || !contentType.includes('application/json')) {
                        const text = await response.text();
                        console.error('[BTN]: ❌ NO ES JSON');
                        console.error('[BTN]: Respuesta:', text.substring(0, 500));
                        throw new Error('Respuesta no es JSON');
                    }
                    
                    const data = await response.json();
                    
                    console.log('[BTN]: ✅ JSON recibido');
                    console.log('[BTN]: success:', data.success);
                    console.log('[BTN]: tipo:', data.tipo);
                    console.log('[BTN]: salaId:', data.salaId);
                    console.log('[BTN]: redirigir:', data.redirigir);
                    console.log('[BTN]: message:', data.message);
                    console.log('[BTN]: mostrar_mensaje:', data.mostrar_mensaje);
                    
                    if (!response.ok) {
                        throw new Error(data.message || `HTTP ${response.status}`);
                    }
                    
                    if (data.success) {
                        const li = event.target.closest('li');
                        if (li) li.remove();
                        
                        // ⚔️ DUELO RÁPIDO BD
                        if (data.tipo === 'desafio_duelo_rapido') {
                            console.log('[BTN]: ⚔️ DUELO RÁPIDO BD');
                            
                            if (!data.salaId) {
                                console.error('[BTN]: ❌ NO HAY salaId');
                                throw new Error('No se recibió salaId');
                            }
                            
                            if (!data.redirigir) {
                                console.error('[BTN]: ❌ NO HAY URL');
                                throw new Error('No se recibió URL');
                            }
                            
                            console.log('[BTN]: 📡 Emitiendo socket...');
                            
                            socket.emit('duelo:aceptarDesafioBD', {
                                salaId: data.salaId,
                                idRetado: window.usuarioActual.id_usuario // ✅ CORREGIDO
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
                            
                            const cont = document.getElementById('mensajeExamen') || document.body;
                            const mensajeDiv = document.createElement('div');
                            mensajeDiv.id = 'duelo-aceptado-mensaje';
                            mensajeDiv.className = 'notification-message duelo-48h';
                            mensajeDiv.innerHTML = `
                                <div style="font-size: 48px; margin-bottom: 10px;">📚</div>
                                <h3 style="margin: 0 0 15px 0; font-size: 24px;">¡Desafío Aceptado!</h3>
                                <p style="margin: 0 0 20px 0;">${data.message}</p>
                                <p style="margin: 0 0 15px 0;">
                                    <strong>Haz clic en las notificaciones 🔔 para ver el botón "Unirse"</strong>
                                </p>
                                <div style="margin-top: 15px;">
                                    <button id="btn-cerrar-mensaje" style="background: #28a745; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-weight: bold;">
                                        Entendido
                                    </button>
                                </div>
                            `;
                            cont.appendChild(mensajeDiv);
                            
                            setTimeout(() => {
                                cargarNotificaciones();
                            }, 1000);
                            
                            document.getElementById('btn-cerrar-mensaje').addEventListener('click', () => {
                                mensajeDiv.remove();
                                cargarNotificaciones();
                            });
                            
                            setTimeout(() => {
                                if (document.getElementById('duelo-aceptado-mensaje')) {
                                    mensajeDiv.remove();
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
                            setTimeout(() => window.location.href = data.redirigir, 1000);
                            return;
                        }
                        
                        setTimeout(cargarNotificaciones, 500);
                        
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
                    if (li) li.remove();
                    
                    await fetch(`/rechazar/${notifId}`, { 
                        method: 'POST', 
                        credentials: 'include' 
                    });
                    
                    setTimeout(cargarNotificaciones, 500);
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
                    if (li) li.remove();
                    
                    await fetch(`/rechazar/${notifId}`, { 
                        method: 'POST', 
                        credentials: 'include' 
                    });
                    
                    setTimeout(cargarNotificaciones, 500);
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