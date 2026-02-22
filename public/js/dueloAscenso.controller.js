// =============================================
// 🎮 dueloAscenso.controller.js — CON SISTEMA DE AMISTADES
// Cambios: renderizarRanking ahora carga estados de amistad
//          y muestra botón de agregar amigo en cada jugador
// =============================================

(function() {
    'use strict';

    const user = window.SALA_CONFIG.user;
    const stats = window.SALA_CONFIG.stats;

    let oponenteSeleccionado    = null;
    let dificultadSeleccionada  = null;
    let apuestaSeleccionada     = null;
    let tipoDueloSeleccionado   = null;

    const DIFICULTADES = {
        1: { nombre: 'Fácil',   apuesta: 50,  emoji: '😊', color: '#10b981' },
        2: { nombre: 'Medio',   apuesta: 100, emoji: '🤔', color: '#f59e0b' },
        3: { nombre: 'Difícil', apuesta: 200, emoji: '🔥', color: '#ef4444' }
    };

    // =============================================
    // 🎨 INICIALIZACIÓN
    // =============================================

    document.addEventListener('DOMContentLoaded', () => {
        inicializarTabs();
        inicializarModalDificultad();
        cargarRankingGlobal();
    });

    // =============================================
    // 📑 TABS
    // =============================================

    function inicializarTabs() {
        const tabs     = document.querySelectorAll('.tab');
        const contents = document.querySelectorAll('.tab-content');

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const target = tab.dataset.tab;
                tabs.forEach(t => t.classList.remove('active'));
                contents.forEach(c => c.classList.remove('active'));
                tab.classList.add('active');
                document.getElementById(target).classList.add('active');
                if (target === 'global')  cargarRankingGlobal();
                if (target === 'carrera') cargarRankingCarrera();
            });
        });
    }

    // =============================================
    // 📊 RANKING GLOBAL
    // =============================================

    async function cargarRankingGlobal() {
        const container = document.getElementById('rankingGlobalContainer');
        container.innerHTML = '<p style="text-align:center;padding:20px;color:#cbd5e1;">Cargando ranking global...</p>';
        try {
            const response  = await fetch('/api/ranking/global');
            if (!response.ok) throw new Error('Error al cargar ranking');
            const jugadores = await response.json();
            await renderizarRanking(container, jugadores, 'general');
        } catch (error) {
            console.error('❌ Ranking global:', error);
            container.innerHTML = '<p style="color:#ef4444;text-align:center;">Error al cargar el ranking</p>';
        }
    }

    // =============================================
    // 📊 RANKING POR CARRERA
    // =============================================

    async function cargarRankingCarrera(carreraIdSeleccionado = null) {
        const container    = document.getElementById('rankingCarreraContainer');
        const selector     = document.getElementById('selectorCarreraRanking');
        const infoBox      = document.getElementById('carreraInfoBox');
        const puntosDisplay = document.getElementById('puntosCarreraActual');

        if (!selector.dataset.cargado) {
            try {
                const response = await fetch('/api/usuario/carreras');
                const data     = await response.json();

                if (!data.carreras || data.carreras.length === 0) {
                    container.innerHTML = `
                        <div style="text-align:center;padding:40px;">
                            <i class="fas fa-exclamation-circle" style="font-size:48px;color:#fbbf24;margin-bottom:20px;"></i>
                            <h3 style="color:#fff;">No tienes carreras asignadas</h3>
                            <p style="color:#94a3b8;margin-top:10px;">Contacta al administrador.</p>
                        </div>`;
                    selector.style.display = 'none';
                    return;
                }

                selector.innerHTML = '<option value="">-- Selecciona una carrera --</option>';
                data.carreras.forEach(carrera => {
                    const option = document.createElement('option');
                    option.value            = carrera.id_carrera;
                    option.textContent      = `${carrera.descripcion} (${carrera.puntos} pts)`;
                    option.dataset.puntos   = carrera.puntos;
                    option.dataset.nombre   = carrera.descripcion;
                    selector.appendChild(option);
                });

                selector.dataset.cargado = 'true';
                if (carreraIdSeleccionado) selector.value = carreraIdSeleccionado;
                else if (user.id_carrera)  selector.value = user.id_carrera;

                selector.addEventListener('change', function() {
                    const carreraId = this.value;
                    if (carreraId) cargarRankingCarrera(carreraId);
                    else {
                        container.innerHTML = '<p style="text-align:center;color:#94a3b8;">Selecciona una carrera para ver el ranking</p>';
                        infoBox.style.display = 'none';
                    }
                });

            } catch (error) {
                console.error('❌ Error cargando carreras:', error);
                selector.innerHTML = '<option value="">Error al cargar carreras</option>';
                return;
            }
        }

        const carreraId = carreraIdSeleccionado || selector.value;
        if (!carreraId) {
            container.innerHTML = '<p style="text-align:center;padding:40px;color:#94a3b8;">Selecciona una carrera para ver el ranking</p>';
            infoBox.style.display = 'none';
            return;
        }

        container.innerHTML = '<p style="text-align:center;padding:20px;color:#cbd5e1;">Cargando ranking...</p>';

        try {
            const response  = await fetch(`/api/ranking/carrera/${carreraId}`);
            if (!response.ok) throw new Error('Error al cargar ranking');
            const jugadores = await response.json();

            const opcionSeleccionada = selector.options[selector.selectedIndex];
            const puntosCarrera  = opcionSeleccionada ? opcionSeleccionada.dataset.puntos : 0;
            const nombreCarrera  = opcionSeleccionada ? opcionSeleccionada.dataset.nombre  : 'Carrera';

            if (puntosDisplay) puntosDisplay.textContent = puntosCarrera;
            if (infoBox) {
                infoBox.style.display = 'block';
                infoBox.querySelector('p').textContent = `Ranking de ${nombreCarrera}`;
            }

            await renderizarRanking(container, jugadores, 'carrera', carreraId);

        } catch (error) {
            console.error('❌ Error ranking carrera:', error);
            container.innerHTML = '<p style="color:#ef4444;text-align:center;">Error al cargar el ranking</p>';
            if (infoBox) infoBox.style.display = 'none';
        }
    }

    // =============================================
    // 🏆 RENDERIZAR RANKING — con botones de amistad
    // =============================================

    async function renderizarRanking(container, jugadores, tipoRanking, carreraId = null) {
        container.innerHTML = '';

        if (!jugadores || jugadores.length === 0) {
            container.innerHTML = '<p style="text-align:center;padding:20px;color:#94a3b8;">No hay jugadores.</p>';
            return;
        }

        jugadores.sort((a, b) => {
            const pA = tipoRanking === 'general' ? a.puntos : (a.puntos_carrera || 0);
            const pB = tipoRanking === 'general' ? b.puntos : (b.puntos_carrera || 0);
            return pB - pA;
        });

        const miIndex = jugadores.findIndex(j => j.id_usuario === user.id_usuario);

        // ── Cargar duelos activos ──────────────────────────────────────────
        let duelosActivos = [];
        try {
            const r = await fetch('/api/duelo/mis-duelos-activos');
            if (r.ok) {
                const d = await r.json();
                duelosActivos = d.duelos_activos || [];
            }
        } catch (e) { console.warn('[RANKING] Error duelos:', e); }

        // ── Cargar estados de amistad en BULK (una sola petición) ──────────
        const idsOtros = jugadores
            .filter(j => j.id_usuario !== user.id_usuario)
            .map(j => j.id_usuario);

        let estadosAmistad = {};
        if (idsOtros.length > 0) {
            try {
                const r = await fetch('/api/amistades/estados-bulk', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ids: idsOtros })
                });
                if (r.ok) {
                    const d = await r.json();
                    estadosAmistad = d.estados || {};
                }
            } catch (e) { console.warn('[RANKING] Error estados amistad:', e); }
        }

        // ── Renderizar cada jugador ────────────────────────────────────────
        jugadores.forEach((jugador, i) => {
            const esYo          = jugador.id_usuario === user.id_usuario;
            const puntosDisplay = tipoRanking === 'general' ? jugador.puntos : (jugador.puntos_carrera || 0);

            const dueloExistente = duelosActivos.find(d =>
                d.id_retador === jugador.id_usuario || d.id_defensor === jugador.id_usuario
            );

            let puedoDesafiar      = false;
            let motivoNoDesafiar   = '';
            if (esYo) {
                motivoNoDesafiar = '';
            } else if (dueloExistente) {
                motivoNoDesafiar = '⏳ Duelo activo';
            } else if (i >= miIndex) {
                motivoNoDesafiar = 'Posición inferior';
            } else {
                puedoDesafiar = true;
            }

            const carrerasHTML = tipoRanking === 'general' && jugador.carreras
                ? `<span><i class="fas fa-graduation-cap"></i> ${jugador.carreras}</span>`
                : '';

            const item = document.createElement('div');
            item.className = esYo ? 'ranking-item current-user' : 'ranking-item';

            item.innerHTML = `
                <div class="rank-number">#${i + 1}</div>
                <div class="player-avatar-link" onclick="abrirMiniPerfil(${jugador.id_usuario})" title="Ver perfil">
                    <img src="${jugador.foto_perfil || '/uploads/default_avatar.png'}"
                         alt="Avatar" class="player-avatar"
                         onerror="this.src='/uploads/default_avatar.png'">
                </div>
                <div class="player-info">
                    <div class="player-name">
                        <span class="player-name-link" onclick="abrirMiniPerfil(${jugador.id_usuario})">
                            ${jugador.username}
                        </span>
                        ${esYo ? '<span class="badge-yo">Tú</span>' : ''}
                    </div>
                    <div class="player-stats">
                        <span><i class="fas fa-trophy"></i> ${puntosDisplay} pts</span>
                        ${carrerasHTML}
                    </div>
                </div>
                <div class="score-display">${puntosDisplay}</div>
                <div class="ranking-actions">
                    ${motivoNoDesafiar && !esYo
                        ? `<span class="no-challenge-reason">${motivoNoDesafiar}</span>`
                        : ''}
                </div>
            `;

            container.appendChild(item);

            const actionsDiv = item.querySelector('.ranking-actions');

            // ── Botón Desafiar ─────────────────────────────────────────────
            if (puedoDesafiar) {
                const btnDesafiar = document.createElement('button');
                btnDesafiar.className = 'btn-desafiar';
                btnDesafiar.innerHTML = tipoRanking === 'general'
                    ? '<i class="fas fa-brain"></i> Duelo'
                    : '<i class="fas fa-graduation-cap"></i> Duelo';
                btnDesafiar.addEventListener('click', e => {
                    e.preventDefault();
                    e.stopPropagation();
                    abrirModalDificultad(jugador.id_usuario, jugador.username, tipoRanking, carreraId);
                });
                actionsDiv.appendChild(btnDesafiar);
            }

            // ── Botón de Amistad ───────────────────────────────────────────
            if (!esYo) {
                const btnAmigo = construirBotonAmistad(jugador, estadosAmistad);
                actionsDiv.appendChild(btnAmigo);
            }
        });

        console.log(`[RANKING] ✅ Renderizado (${tipoRanking})`);
    }

    // =============================================
    // 🤝 CONSTRUIR BOTÓN DE AMISTAD
    // =============================================

    function construirBotonAmistad(jugador, estadosAmistad) {
        const btn   = document.createElement('button');
        const info  = estadosAmistad[jugador.id_usuario];
        const estado = info ? info.estado : 'ninguno';

        btn.dataset.idUsuario = jugador.id_usuario;
        btn.dataset.username  = jugador.username;
        btn.className = 'btn-amistad';

        if (estado === 'aceptado') {
            // Ya son amigos
            btn.classList.add('btn-amistad--amigos');
            btn.innerHTML = '<i class="fas fa-user-check"></i> Amigos';
            btn.title = 'Ya son amigos';
            btn.addEventListener('click', e => {
                e.stopPropagation();
                confirmarEliminarAmistad(jugador.id_usuario, jugador.username, btn);
            });

        } else if (estado === 'pendiente' && info.soy_solicitante) {
            // Yo envié, esperando respuesta
            btn.classList.add('btn-amistad--pendiente');
            btn.innerHTML = '<i class="fas fa-clock"></i> Pendiente';
            btn.title = 'Solicitud enviada, esperando respuesta';
            btn.disabled = true;

        } else if (estado === 'pendiente' && !info.soy_solicitante) {
            // Me enviaron a mí — mostrar aceptar/rechazar en tooltip o pequeño panel
            btn.classList.add('btn-amistad--recibida');
            btn.innerHTML = '<i class="fas fa-user-plus"></i> Responder';
            btn.title = `${jugador.username} te envió una solicitud`;
            btn.addEventListener('click', e => {
                e.stopPropagation();
                mostrarOpcionesRespuesta(jugador, btn);
            });

        } else if (estado === 'rechazado' && !info.puede_enviar) {
            // Rechazado, aún no puede reenviar
            btn.classList.add('btn-amistad--bloqueado');
            btn.innerHTML = `<i class="fas fa-hourglass-half"></i> ${info.dias_restantes}d`;
            btn.title = `Puedes reenviar en ${info.dias_restantes} día(s)`;
            btn.disabled = true;

        } else {
            // Ninguno / puede enviar / rechazado con tiempo cumplido
            btn.classList.add('btn-amistad--agregar');
            btn.innerHTML = '<i class="fas fa-user-plus"></i> Agregar';
            btn.title = `Enviar solicitud a ${jugador.username}`;
            btn.addEventListener('click', e => {
                e.stopPropagation();
                enviarSolicitudAmistad(jugador.id_usuario, jugador.username, btn);
            });
        }

        return btn;
    }

    // =============================================
    // 📤 ENVIAR SOLICITUD DE AMISTAD
    // =============================================

    async function enviarSolicitudAmistad(idReceptor, username, btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

        try {
            const response = await fetch(`/amistades/solicitar/${idReceptor}`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await response.json();

            if (data.success) {
                btn.classList.remove('btn-amistad--agregar');
                btn.classList.add('btn-amistad--pendiente');
                btn.innerHTML = '<i class="fas fa-clock"></i> Pendiente';
                btn.title = 'Solicitud enviada, esperando respuesta';
                btn.disabled = true;
                mostrarToast(`✅ Solicitud enviada a ${username}`, 'success');
            } else {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-user-plus"></i> Agregar';
                mostrarToast(data.message || 'Error al enviar solicitud', 'error');
            }
        } catch (error) {
            console.error('[AMISTAD] Error:', error);
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-user-plus"></i> Agregar';
            mostrarToast('Error de conexión', 'error');
        }
    }

    // =============================================
    // 💬 OPCIONES DE RESPUESTA (solicitud recibida)
    // Mini dropdown: Aceptar / Rechazar
    // =============================================

    function mostrarOpcionesRespuesta(jugador, btnRef) {
        // Cerrar cualquier popup previo
        document.querySelectorAll('.amistad-popup').forEach(p => p.remove());

        const popup = document.createElement('div');
        popup.className = 'amistad-popup';
        popup.innerHTML = `
            <p>Solicitud de <strong>${jugador.username}</strong></p>
            <button class="amistad-popup__aceptar"><i class="fas fa-check"></i> Aceptar</button>
            <button class="amistad-popup__rechazar"><i class="fas fa-times"></i> Rechazar</button>
        `;

        // Posicionar relativo al botón
        const rect = btnRef.getBoundingClientRect();
        popup.style.top  = `${rect.bottom + window.scrollY + 6}px`;
        popup.style.left = `${rect.left + window.scrollX}px`;
        document.body.appendChild(popup);

        // Cerrar al hacer click fuera
        const cerrar = e => { if (!popup.contains(e.target) && e.target !== btnRef) { popup.remove(); document.removeEventListener('click', cerrar); } };
        setTimeout(() => document.addEventListener('click', cerrar), 10);

        // Buscar la notificación correspondiente para aceptar/rechazar
        popup.querySelector('.amistad-popup__aceptar').addEventListener('click', async () => {
            popup.remove();
            await responderSolicitudDesdeRanking(jugador, 'aceptar', btnRef);
        });

        popup.querySelector('.amistad-popup__rechazar').addEventListener('click', async () => {
            popup.remove();
            await responderSolicitudDesdeRanking(jugador, 'rechazar', btnRef);
        });
    }

    async function responderSolicitudDesdeRanking(jugador, accion, btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

        try {
            // 1. Obtener id de la notificación de solicitud
            const nRes  = await fetch('/notificaciones');
            const notifs = await nRes.json();
            const notif  = notifs.find(n =>
                n.tipo === 'solicitud_amistad' && n.id_usuario_remitente === jugador.id_usuario
            );

            if (!notif) {
                mostrarToast('No se encontró la solicitud en notificaciones', 'error');
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-user-plus"></i> Responder';
                return;
            }

            const endpoint = accion === 'aceptar'
                ? `/amistades/aceptar/${notif.id_notificacion}`
                : `/amistades/rechazar/${notif.id_notificacion}`;

            const response = await fetch(endpoint, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await response.json();

            if (data.success) {
                if (accion === 'aceptar') {
                    btn.classList.remove('btn-amistad--recibida');
                    btn.classList.add('btn-amistad--amigos');
                    btn.innerHTML = '<i class="fas fa-user-check"></i> Amigos';
                    btn.disabled = false;
                    btn.title = 'Ya son amigos';
                    mostrarToast(`🎉 ¡Ahora eres amigo de ${jugador.username}!`, 'success');
                } else {
                    btn.classList.remove('btn-amistad--recibida');
                    btn.classList.add('btn-amistad--agregar');
                    btn.innerHTML = '<i class="fas fa-user-plus"></i> Agregar';
                    btn.disabled = false;
                    mostrarToast('Solicitud rechazada', 'info');
                }
            } else {
                mostrarToast(data.message || 'Error', 'error');
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-user-plus"></i> Responder';
            }
        } catch (error) {
            console.error('[AMISTAD] Error al responder:', error);
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-user-plus"></i> Responder';
            mostrarToast('Error de conexión', 'error');
        }
    }

    // =============================================
    // 🗑️ CONFIRMAR ELIMINAR AMISTAD
    // =============================================

    function confirmarEliminarAmistad(idAmigo, username, btn) {
        document.querySelectorAll('.amistad-popup').forEach(p => p.remove());

        const popup = document.createElement('div');
        popup.className = 'amistad-popup amistad-popup--danger';
        popup.innerHTML = `
            <p>¿Eliminar a <strong>${username}</strong> de amigos?</p>
            <button class="amistad-popup__confirmar"><i class="fas fa-user-times"></i> Eliminar</button>
            <button class="amistad-popup__cancelar">Cancelar</button>
        `;

        const rect = btn.getBoundingClientRect();
        popup.style.top  = `${rect.bottom + window.scrollY + 6}px`;
        popup.style.left = `${rect.left + window.scrollX}px`;
        document.body.appendChild(popup);

        const cerrar = e => { if (!popup.contains(e.target) && e.target !== btn) { popup.remove(); document.removeEventListener('click', cerrar); } };
        setTimeout(() => document.addEventListener('click', cerrar), 10);

        popup.querySelector('.amistad-popup__cancelar').addEventListener('click', () => popup.remove());

        popup.querySelector('.amistad-popup__confirmar').addEventListener('click', async () => {
            popup.remove();
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

            try {
                const response = await fetch(`/amistades/eliminar/${idAmigo}`, {
                    method: 'DELETE',
                    credentials: 'include'
                });
                const data = await response.json();

                if (data.success) {
                    btn.classList.remove('btn-amistad--amigos');
                    btn.classList.add('btn-amistad--agregar');
                    btn.innerHTML = '<i class="fas fa-user-plus"></i> Agregar';
                    btn.disabled = false;
                    btn.title = `Enviar solicitud a ${username}`;
                    // Re-asignar listener de enviar
                    btn.onclick = null;
                    btn.addEventListener('click', e => {
                        e.stopPropagation();
                        enviarSolicitudAmistad(idAmigo, username, btn);
                    });
                    mostrarToast(`${username} eliminado de amigos`, 'info');
                }
            } catch (error) {
                console.error('[AMISTAD] Error al eliminar:', error);
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-user-check"></i> Amigos';
            }
        });
    }

    // =============================================
    // 🔔 TOAST NOTIFICATIONS
    // =============================================

    function mostrarToast(mensaje, tipo = 'info') {
        const colores = { success: '#10b981', error: '#ef4444', info: '#3b82f6' };

        const notif = document.createElement('div');
        notif.className = 'qbd-toast';
        notif.style.cssText = `
            position:fixed;top:20px;right:20px;
            background:${colores[tipo]};color:white;
            padding:14px 22px;border-radius:10px;
            box-shadow:0 8px 24px rgba(0,0,0,0.35);
            z-index:10000;font-weight:600;font-size:14px;
            animation:qbdToastIn 0.3s ease;max-width:380px;
        `;
        notif.textContent = mensaje;
        document.body.appendChild(notif);

        setTimeout(() => {
            notif.style.animation = 'qbdToastOut 0.3s ease forwards';
            setTimeout(() => notif.remove(), 300);
        }, 3500);
    }

    // CSS de toast + popup inyectado una sola vez
    if (!document.getElementById('qbd-amistad-styles')) {
        const s = document.createElement('style');
        s.id = 'qbd-amistad-styles';
        s.textContent = `
            @keyframes qbdToastIn  { from { opacity:0; transform:translateX(100%); } to { opacity:1; transform:translateX(0); } }
            @keyframes qbdToastOut { from { opacity:1; transform:translateX(0); } to { opacity:0; transform:translateX(100%); } }

            /* ── Botones de amistad ─────────────────────── */
            .btn-amistad {
                display: inline-flex;
                align-items: center;
                gap: 5px;
                padding: 6px 12px;
                border-radius: 20px;
                border: none;
                font-size: 12px;
                font-weight: 700;
                cursor: pointer;
                transition: all 0.2s ease;
                white-space: nowrap;
            }
            .btn-amistad--agregar {
                background: linear-gradient(135deg, #3b82f6, #1d4ed8);
                color: #fff;
            }
            .btn-amistad--agregar:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(59,130,246,.45); }

            .btn-amistad--pendiente {
                background: rgba(251,191,36,.15);
                color: #fbbf24;
                border: 1px solid rgba(251,191,36,.3);
                cursor: default;
            }
            .btn-amistad--amigos {
                background: rgba(16,185,129,.15);
                color: #10b981;
                border: 1px solid rgba(16,185,129,.3);
            }
            .btn-amistad--amigos:hover { background: rgba(239,68,68,.15); color:#ef4444; border-color:rgba(239,68,68,.3); }

            .btn-amistad--recibida {
                background: linear-gradient(135deg, #8b5cf6, #6d28d9);
                color: #fff;
                animation: pulsePurple 1.8s infinite;
            }
            @keyframes pulsePurple {
                0%,100% { box-shadow: 0 0 0 0 rgba(139,92,246,.4); }
                50%      { box-shadow: 0 0 0 6px rgba(139,92,246,0); }
            }
            .btn-amistad--bloqueado {
                background: rgba(100,116,139,.2);
                color: #64748b;
                border: 1px solid rgba(100,116,139,.25);
                cursor: not-allowed;
                font-size: 11px;
            }

            /* ── Popup contextual ─────────────────────── */
            .amistad-popup {
                position: absolute;
                background: #1e293b;
                border: 1px solid rgba(255,255,255,.12);
                border-radius: 10px;
                padding: 12px 14px;
                z-index: 9999;
                box-shadow: 0 12px 32px rgba(0,0,0,.5);
                min-width: 180px;
                animation: popupIn .15s ease;
            }
            @keyframes popupIn { from { opacity:0; transform:scale(.92) translateY(-4px); } to { opacity:1; transform:scale(1) translateY(0); } }

            .amistad-popup p { margin: 0 0 10px 0; color:#cbd5e1; font-size:13px; }
            .amistad-popup button {
                display:block; width:100%; margin-bottom:6px; padding:7px 10px;
                border:none; border-radius:6px; font-size:13px; font-weight:600;
                cursor:pointer; transition:opacity .15s;
            }
            .amistad-popup button:last-child { margin-bottom:0; }
            .amistad-popup button:hover { opacity:.85; }

            .amistad-popup__aceptar  { background:#10b981; color:#fff; }
            .amistad-popup__rechazar { background:#ef4444; color:#fff; }
            .amistad-popup__confirmar { background:#ef4444; color:#fff; }
            .amistad-popup__cancelar  { background:rgba(255,255,255,.08); color:#94a3b8; }

            .amistad-popup--danger { border-color: rgba(239,68,68,.25); }

            /* ── Acciones del ranking ─────────────────── */
            .ranking-actions {
                display: flex;
                align-items: center;
                gap: 6px;
                flex-wrap: wrap;
                justify-content: flex-end;
            }
        `;
        document.head.appendChild(s);
    }

    // =============================================
    // 🎯 MODAL DE DIFICULTAD (sin cambios respecto a versión original)
    // =============================================

    async function abrirModalDificultad(idOponente, usernameOponente, tipoDuelo, carreraIdParam = null) {
        if (!idOponente || !usernameOponente || !tipoDuelo) {
            mostrarToast('Error: Datos de oponente inválidos', 'error');
            return;
        }

        try {
            const r = await fetch('/api/usuario/puntos-actuales');
            if (r.ok) { const d = await r.json(); user.puntos = d.puntos_globales; }
        } catch (e) {}

        oponenteSeleccionado   = { id: parseInt(idOponente), username: String(usernameOponente) };
        dificultadSeleccionada = null;
        apuestaSeleccionada    = null;
        tipoDueloSeleccionado  = tipoDuelo;

        document.querySelectorAll('.difficulty-card').forEach(c => c.classList.remove('selected'));
        const btnConfirmar = document.getElementById('btnConfirmarDuelo');
        if (btnConfirmar) btnConfirmar.disabled = true;

        const modalTitle    = document.querySelector('.modal-header h2');
        const modalSubtitle = document.querySelector('.modal-header p');
        if (!modalTitle || !modalSubtitle) return;

        if (tipoDuelo === 'general') {
            modalTitle.innerHTML   = '<i class="fas fa-brain"></i> Duelo General';
            modalSubtitle.textContent = `Desafiar a ${usernameOponente} - Materias comunes`;
            const mw = document.querySelector('.modal-warning');
            if (mw) mw.innerHTML = `
                <h4><i class="fas fa-exclamation-triangle"></i> Sistema de Penalizaciones</h4>
                <ul>
                    <li><strong>Desconexión:</strong> Pierdes el 50% de tu apuesta</li>
                    <li><strong>Abandono voluntario:</strong> Pierdes el 100% de tu apuesta</li>
                    <li><strong>Victoria:</strong> Ganas la apuesta completa del oponente</li>
                    <li><strong>Empate:</strong> No se pierden ni ganan puntos</li>
                </ul>`;
        } else if (tipoDuelo === 'carrera') {
            let carreraSeleccionadaRanking = carreraIdParam;
            if (!carreraSeleccionadaRanking) {
                const sel = document.getElementById('selectorCarreraRanking');
                carreraSeleccionadaRanking = sel ? sel.value : null;
            }
            if (!carreraSeleccionadaRanking) {
                mostrarToast('Selecciona una carrera en el ranking primero', 'error');
                return;
            }

            const sel = document.getElementById('selectorCarreraRanking');
            const opt = sel ? Array.from(sel.options).find(o => o.value == carreraSeleccionadaRanking) : null;
            const nombreCarrera = opt ? opt.textContent.split('(')[0].trim() : 'Carrera';
            const puntosCarrera = opt ? parseInt(opt.dataset.puntos) : 0;

            modalTitle.innerHTML   = '<i class="fas fa-graduation-cap"></i> Duelo de Carrera';
            modalSubtitle.textContent = `Desafiar a ${usernameOponente} - ${nombreCarrera}`;
            window.carreraSeleccionada       = parseInt(carreraSeleccionadaRanking);
            window.puntosCarreraDisponibles  = puntosCarrera;

            const mw = document.querySelector('.modal-warning');
            if (mw) mw.innerHTML = `
                <h4><i class="fas fa-exclamation-triangle"></i> Sistema de Puntos de Carrera</h4>
                <ul>
                    <li><strong>Victoria:</strong> Ganas puntos de carrera según preguntas correctas</li>
                    <li><strong>Derrota:</strong> Pierdes el 50% de tus puntos de carrera</li>
                    <li><strong>Abandono:</strong> Pierdes el 30% de tus puntos de carrera</li>
                    <li><strong>Empate:</strong> No se pierden ni ganan puntos</li>
                </ul>
                <p style="margin-top:15px;color:#fbbf24;">
                    <strong>Tus puntos en ${nombreCarrera}:</strong> ${puntosCarrera} pts
                </p>`;
        }

        const modal = document.getElementById('modalDificultad');
        if (modal) modal.classList.add('active');
    }

    window.cerrarModalDificultad = function() {
        const modal = document.getElementById('modalDificultad');
        if (modal) modal.classList.remove('active');
        oponenteSeleccionado = dificultadSeleccionada = apuestaSeleccionada = tipoDueloSeleccionado = null;
        delete window.carreraSeleccionada;
        delete window.puntosCarreraDisponibles;
    };

    function inicializarModalDificultad() {
        const cards       = document.querySelectorAll('.difficulty-card');
        const btnConfirmar = document.getElementById('btnConfirmarDuelo');
        if (!cards.length) return;

        cards.forEach(card => {
            card.addEventListener('click', () => {
                const dificultad = parseInt(card.dataset.difficulty);
                const apuesta    = parseInt(card.dataset.bet);

                let puntosDisponibles = tipoDueloSeleccionado === 'general'
                    ? (user.puntos || 0)
                    : (window.puntosCarreraDisponibles || 0);

                const tipoPuntos = tipoDueloSeleccionado === 'general' ? 'globales' : 'de carrera';

                if (puntosDisponibles < apuesta) {
                    mostrarToast(`❌ Necesitas ${apuesta} pts ${tipoPuntos}, tienes ${puntosDisponibles}`, 'error');
                    return;
                }

                cards.forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                dificultadSeleccionada = dificultad;
                apuestaSeleccionada    = apuesta;
                if (btnConfirmar) btnConfirmar.disabled = false;
            });
        });

        if (btnConfirmar) btnConfirmar.addEventListener('click', enviarDesafio);
    }

    async function enviarDesafio() {
        if (!oponenteSeleccionado || !dificultadSeleccionada || !apuestaSeleccionada || !tipoDueloSeleccionado) {
            mostrarToast('Error: Datos incompletos', 'error');
            return;
        }

        const { id: oponenteId, username: oponenteUsername } = oponenteSeleccionado;
        const dificultad = dificultadSeleccionada;
        const apuesta    = apuestaSeleccionada;
        const tipoDuelo  = tipoDueloSeleccionado;
        const carreraId  = window.carreraSeleccionada || null;

        if (tipoDuelo === 'carrera' && !carreraId) {
            mostrarToast('Error: Falta seleccionar carrera', 'error');
            return;
        }

        const btnConfirmar = document.getElementById('btnConfirmarDuelo');
        if (!btnConfirmar) return;
        btnConfirmar.disabled  = true;
        btnConfirmar.textContent = 'Verificando...';

        try {
            const checkRes  = await fetch(`/api/duelo/verificar/${oponenteId}`);
            const checkData = await checkRes.json();

            if (checkData.existe_duelo) {
                cerrarModalDificultad();
                mostrarToast(`Ya tienes un duelo activo con ${oponenteUsername}`, 'error');
                return;
            }

            btnConfirmar.textContent = 'Enviando...';

            const endpoint = tipoDuelo === 'general'
                ? `/desafiar/duelo-general/${oponenteId}`
                : `/desafiar/duelo/${oponenteId}`;

            const bodyData = { id_dificultad: dificultad, apuesta };
            if (tipoDuelo === 'carrera') bodyData.id_carrera = carreraId;

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify(bodyData)
            });

            const contentType = response.headers.get('content-type');
            if (!contentType?.includes('application/json')) throw new Error('El servidor no devolvió JSON');

            const data = await response.json();
            if (!response.ok) throw new Error(data.message || `HTTP ${response.status}`);

            if (data.success) {
                cerrarModalDificultad();
                const dificultadNombre = DIFICULTADES[dificultad]?.nombre || 'Desconocida';
                const tipoTexto = tipoDuelo === 'general' ? 'General' : 'de Carrera';
                mostrarToast(`¡Desafío ${tipoTexto} ${dificultadNombre} enviado a ${oponenteUsername}! (${apuesta} pts)`, 'success');
                delete window.carreraSeleccionada;
                delete window.puntosCarreraDisponibles;
                tipoDuelo === 'general' ? await cargarRankingGlobal() : await cargarRankingCarrera();
            } else {
                throw new Error(data.message || 'Error desconocido');
            }

        } catch (error) {
            mostrarToast('Error: ' + error.message, 'error');
        } finally {
            if (btnConfirmar) {
                btnConfirmar.disabled = false;
                btnConfirmar.innerHTML = '<i class="fas fa-paper-plane"></i> Enviar Desafío';
            }
        }
    }

    console.log('[DUELOS + AMISTADES] ✅ Sistema completamente cargado');

})();