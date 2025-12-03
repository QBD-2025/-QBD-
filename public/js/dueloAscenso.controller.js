// =============================================
// 🎮 CONTROLADOR FRONTEND - VERSIÓN CORREGIDA
// Fixes: Lógica de desafíos en ranking de carrera
// =============================================

(function() {
    'use strict';
    
    const user = window.SALA_CONFIG.user;
    const stats = window.SALA_CONFIG.stats;
    
    let oponenteSeleccionado = null;
    let dificultadSeleccionada = null;
    let apuestaSeleccionada = null;
    let tipoDueloSeleccionado = null;
    
    console.log('=== SISTEMA DE DUELOS MEJORADO ===');
    console.log('Usuario:', user);
    console.log('Stats:', stats);
    
    // =============================================
    // 🎯 CONFIGURACIÓN
    // =============================================
    
    const DIFICULTADES = {
        1: { nombre: 'Fácil', apuesta: 50, emoji: '😊', color: '#10b981' },
        2: { nombre: 'Medio', apuesta: 100, emoji: '🤔', color: '#f59e0b' },
        3: { nombre: 'Difícil', apuesta: 200, emoji: '🔥', color: '#ef4444' }
    };
    
    // =============================================
    // 🎨 INICIALIZACIÓN
    // =============================================
    
    document.addEventListener('DOMContentLoaded', () => {
        console.log('Inicializando sistema de duelos...');
        
        inicializarTabs();
        inicializarModalDificultad();
        cargarRankingGlobal();
        
        console.log('✅ Sistema inicializado');
    });
    
    // =============================================
    // 📑 SISTEMA DE TABS
    // =============================================
    
    function inicializarTabs() {
        const tabs = document.querySelectorAll('.tab');
        const contents = document.querySelectorAll('.tab-content');
        
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const target = tab.dataset.tab;
                
                tabs.forEach(t => t.classList.remove('active'));
                contents.forEach(c => c.classList.remove('active'));
                
                tab.classList.add('active');
                document.getElementById(target).classList.add('active');
                
                if (target === 'global') {
                    cargarRankingGlobal();
                } else if (target === 'carrera') {
                    cargarRankingCarrera();
                }
            });
        });
    }
    
    // =============================================
    // 📊 CARGAR RANKING GLOBAL
    // =============================================
    
    async function cargarRankingGlobal() {
        const container = document.getElementById('rankingGlobalContainer');
        container.innerHTML = '<p style="text-align: center; padding: 20px; color: #cbd5e1;">Cargando ranking global...</p>';
        
        try {
            const response = await fetch('/api/ranking/global');
            if (!response.ok) throw new Error('Error al cargar ranking');
            
            const jugadores = await response.json();
            
            console.log('=== RANKING GLOBAL ===');
            console.log('Total jugadores:', jugadores.length);
            
            await renderizarRanking(container, jugadores, 'general');
            
        } catch (error) {
            console.error('❌ Error cargando ranking global:', error);
            container.innerHTML = '<p style="color: #ef4444; text-align: center;">Error al cargar el ranking</p>';
        }
    }
    
    // =============================================
    // 📊 CARGAR RANKING POR CARRERA - ✅ CON SELECTOR
    // =============================================
    
   async function cargarRankingCarrera(carreraIdSeleccionado = null) {
        const container = document.getElementById('rankingCarreraContainer');
        const selector = document.getElementById('selectorCarreraRanking');
        const infoBox = document.getElementById('carreraInfoBox');
        const puntosDisplay = document.getElementById('puntosCarreraActual');
        
        // 1️⃣ Cargar carreras del usuario en el selector (primera vez)
        if (!selector.dataset.cargado) {
            try {
                const response = await fetch('/api/usuario/carreras');
                const data = await response.json();
                
                if (!data.carreras || data.carreras.length === 0) {
                    container.innerHTML = `
                        <div style="text-align: center; padding: 40px;">
                            <i class="fas fa-exclamation-circle" style="font-size: 48px; color: #fbbf24; margin-bottom: 20px;"></i>
                            <h3 style="color: #fff;">No tienes carreras asignadas</h3>
                            <p style="color: #94a3b8; margin-top: 10px;">Contacta al administrador.</p>
                        </div>
                    `;
                    selector.style.display = 'none';
                    return;
                }
                
                // ✅ Llenar selector con carreras
                selector.innerHTML = '<option value="">-- Selecciona una carrera --</option>';
                data.carreras.forEach(carrera => {
                    const option = document.createElement('option');
                    option.value = carrera.id_carrera;
                    option.textContent = `${carrera.descripcion} (${carrera.puntos} pts)`;
                    option.dataset.puntos = carrera.puntos;
                    option.dataset.nombre = carrera.descripcion;
                    selector.appendChild(option);
                });
                
                selector.dataset.cargado = 'true';
                
                // ✅ Si hay carrera por defecto, seleccionarla
                if (carreraIdSeleccionado) {
                    selector.value = carreraIdSeleccionado;
                } else if (user.id_carrera) {
                    selector.value = user.id_carrera;
                }
                
                // ✅ Evento change del selector
                selector.addEventListener('change', function() {
                    const carreraId = this.value;
                    if (carreraId) {
                        cargarRankingCarrera(carreraId);
                    } else {
                        container.innerHTML = '<p style="text-align: center; color: #94a3b8;">Selecciona una carrera para ver el ranking</p>';
                        infoBox.style.display = 'none';
                    }
                });
                
            } catch (error) {
                console.error('❌ Error cargando carreras:', error);
                selector.innerHTML = '<option value="">Error al cargar carreras</option>';
                return;
            }
        }
        
        // 2️⃣ Cargar ranking de la carrera seleccionada
        const carreraId = carreraIdSeleccionado || selector.value;
        
        if (!carreraId) {
            container.innerHTML = '<p style="text-align: center; padding: 40px; color: #94a3b8;">Selecciona una carrera para ver el ranking</p>';
            infoBox.style.display = 'none';
            return;
        }
        
        container.innerHTML = '<p style="text-align: center; padding: 20px; color: #cbd5e1;">Cargando ranking...</p>';
        
        try {
            const response = await fetch(`/api/ranking/carrera/${carreraId}`);
            if (!response.ok) throw new Error('Error al cargar ranking');
            
            const jugadores = await response.json();
            
            console.log('=== RANKING CARRERA ===');
            console.log('Carrera ID:', carreraId);
            console.log('Total jugadores:', jugadores.length);
            console.log('Primer jugador:', jugadores[0]);
            
            // ✅ Mostrar puntos del usuario en esta carrera
            const opcionSeleccionada = selector.options[selector.selectedIndex];
            const puntosCarrera = opcionSeleccionada ? opcionSeleccionada.dataset.puntos : 0;
            const nombreCarrera = opcionSeleccionada ? opcionSeleccionada.dataset.nombre : 'Carrera';
            
            if (puntosDisplay) puntosDisplay.textContent = puntosCarrera;
            if (infoBox) {
                infoBox.style.display = 'block';
                infoBox.querySelector('p').textContent = `Ranking de ${nombreCarrera}`;
            }
            
            // ✅ Renderizar ranking con tipo 'carrera'
            await renderizarRanking(container, jugadores, 'carrera', carreraId);
            
        } catch (error) {
            console.error('❌ Error cargando ranking carrera:', error);
            container.innerHTML = '<p style="color: #ef4444; text-align: center;">Error al cargar el ranking</p>';
            if (infoBox) infoBox.style.display = 'none';
        }
    }
    
    // =============================================
    // 🎨 RENDERIZAR RANKING - ✅ LÓGICA CORREGIDA
    // =============================================
    
    // =============================================
    // 🎨 RENDERIZAR RANKING - ✅ CON BOTÓN CORRECTO
    // =============================================

    async function renderizarRanking(container, jugadores, tipoRanking, carreraId = null) {
        container.innerHTML = '';
        
        if (!jugadores || jugadores.length === 0) {
            container.innerHTML = '<p style="text-align: center; padding: 20px; color: #94a3b8;">No hay jugadores.</p>';
            return;
        }
        
        // Ordenar por puntos según tipo
        jugadores.sort((a, b) => {
            const puntosA = tipoRanking === 'general' ? a.puntos : (a.puntos_carrera || 0);
            const puntosB = tipoRanking === 'general' ? b.puntos : (b.puntos_carrera || 0);
            return puntosB - puntosA;
        });
        
        const miIndex = jugadores.findIndex(j => j.id_usuario === user.id_usuario);
        
        // Obtener duelos activos
        let duelosActivos = [];
        try {
            const response = await fetch('/api/duelo/mis-duelos-activos');
            if (response.ok) {
                const data = await response.json();
                duelosActivos = data.duelos_activos || [];
                console.log('[RANKING] Duelos activos:', duelosActivos.length);
            }
        } catch (error) {
            console.warn('[RANKING] Error cargando duelos:', error);
        }
        
        jugadores.forEach((jugador, i) => {
            const esYo = jugador.id_usuario === user.id_usuario;
            const puntosDisplay = tipoRanking === 'general' ? jugador.puntos : (jugador.puntos_carrera || 0);
            
            // Verificar duelo existente
            const dueloExistente = duelosActivos.find(d => 
                (d.id_retador === jugador.id_usuario || d.id_defensor === jugador.id_usuario)
            );
            
            // Lógica de desafío
            let puedoDesafiar = false;
            let motivoNoDesafiar = '';
            
            if (esYo) {
                motivoNoDesafiar = '';
            } else if (dueloExistente) {
                motivoNoDesafiar = '⏳ Duelo activo';
            } else if (i >= miIndex) {
                motivoNoDesafiar = 'Posición inferior';
            } else {
                puedoDesafiar = true;
            }
            
            const item = document.createElement('div');
            item.className = esYo ? 'ranking-item current-user' : 'ranking-item';
            
            // ✅ MOSTRAR CARRERAS EN RANKING GLOBAL
            const carrerasHTML = tipoRanking === 'general' && jugador.carreras ? 
                `<span><i class="fas fa-graduation-cap"></i> ${jugador.carreras}</span>` : '';
            
            item.innerHTML = `
                <div class="rank-number">#${i + 1}</div>
                <img src="${jugador.foto_perfil || '/uploads/default_avatar.png'}" 
                    alt="Avatar" 
                    class="player-avatar"
                    onerror="this.src='/uploads/default_avatar.png'">
                <div class="player-info">
                    <div class="player-name">
                        ${jugador.username}
                        ${esYo ? '<span class="badge-yo">Tú</span>' : ''}
                    </div>
                    <div class="player-stats">
                        <span><i class="fas fa-trophy"></i> ${puntosDisplay} pts</span>
                        ${carrerasHTML}
                    </div>
                </div>
                <div class="score-display">${puntosDisplay}</div>
                ${motivoNoDesafiar && !esYo ? `
                    <span class="no-challenge-reason">${motivoNoDesafiar}</span>
                ` : ''}
            `;
            
            container.appendChild(item);
            
            // Agregar botón de desafiar SI SE PUEDE
            if (puedoDesafiar) {
                const btnDesafiar = document.createElement('button');
                btnDesafiar.className = 'btn-desafiar';
                
                if (tipoRanking === 'general') {
                    btnDesafiar.innerHTML = '<i class="fas fa-brain"></i> Duelo General';
                } else {
                    btnDesafiar.innerHTML = '<i class="fas fa-graduation-cap"></i> Duelo Carrera';
                }
                
                btnDesafiar.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    console.log(`[CLICK] Desafiar a ${jugador.username} (${tipoRanking})`);
                    console.log(`[CLICK] Carrera ID:`, carreraId);
                    
                    abrirModalDificultad(jugador.id_usuario, jugador.username, tipoRanking, carreraId);
                });
                
                item.appendChild(btnDesafiar);
            }
        });
        
        console.log(`[RANKING] ✅ Renderizado completado (${tipoRanking})`);
    }
    
    // =============================================
    // 🎯 MODAL DE DIFICULTAD
    // =============================================
    
    async function abrirModalDificultad(idOponente, usernameOponente, tipoDuelo, carreraIdParam = null) {
        console.log('[MODAL] ==========================================');
        console.log('[MODAL] 🚀 Abriendo modal...');
        console.log('[MODAL]    - ID Oponente:', idOponente);
        console.log('[MODAL]    - Username:', usernameOponente);
        console.log('[MODAL]    - Tipo Duelo:', tipoDuelo);
        console.log('[MODAL]    - Carrera Param:', carreraIdParam);
        
        if (!idOponente || !usernameOponente || !tipoDuelo) {
            console.error('[MODAL] ❌ Datos inválidos');
            mostrarNotificacion('Error: Datos de oponente inválidos', 'error');
            return;
        }
        
        // Obtener puntos actualizados
        try {
            const response = await fetch('/api/usuario/puntos-actuales');
            if (response.ok) {
                const data = await response.json();
                user.puntos = data.puntos_globales;
                console.log('[MODAL] ✅ Puntos actualizados:', user.puntos);
            }
        } catch (error) {
            console.warn('[MODAL] ⚠️ No se pudieron actualizar los puntos:', error);
        }
        
        // Asignar variables globales
        oponenteSeleccionado = { 
            id: parseInt(idOponente), 
            username: String(usernameOponente) 
        };
        dificultadSeleccionada = null;
        apuestaSeleccionada = null;
        tipoDueloSeleccionado = tipoDuelo;
        
        console.log('[MODAL] ✅ Variables asignadas');
        
        // Resetear selección visual
        document.querySelectorAll('.difficulty-card').forEach(card => {
            card.classList.remove('selected');
        });
        
        const btnConfirmar = document.getElementById('btnConfirmarDuelo');
        if (btnConfirmar) {
            btnConfirmar.disabled = true;
        }
        
        const modalTitle = document.querySelector('.modal-header h2');
        const modalSubtitle = document.querySelector('.modal-header p');
        
        if (!modalTitle || !modalSubtitle) {
            console.error('[MODAL] ❌ No se encontraron elementos del modal');
            return;
        }
        
        if (tipoDuelo === 'general') {
            modalTitle.innerHTML = '<i class="fas fa-brain"></i> Duelo General';
            modalSubtitle.textContent = `Desafiar a ${usernameOponente} - Materias comunes`;
            
            const modalWarning = document.querySelector('.modal-warning');
            if (modalWarning) {
                modalWarning.innerHTML = `
                    <h4><i class="fas fa-exclamation-triangle"></i> Sistema de Penalizaciones</h4>
                    <ul>
                        <li><strong>Desconexión:</strong> Pierdes el 50% de tu apuesta</li>
                        <li><strong>Abandono voluntario:</strong> Pierdes el 100% de tu apuesta</li>
                        <li><strong>Victoria:</strong> Ganas la apuesta completa del oponente</li>
                        <li><strong>Empate:</strong> No se pierden ni ganan puntos</li>
                    </ul>
                `;
            }
        } else if (tipoDuelo === 'carrera') {
            // ✅ USAR carreraIdParam si viene del ranking
            let carreraSeleccionadaRanking = carreraIdParam;
            
            // Si no viene, intentar obtener del selector
            if (!carreraSeleccionadaRanking) {
                const selectorRanking = document.getElementById('selectorCarreraRanking');
                carreraSeleccionadaRanking = selectorRanking ? selectorRanking.value : null;
            }
            
            if (!carreraSeleccionadaRanking) {
                console.error('[MODAL] ❌ No hay carrera seleccionada');
                mostrarNotificacion('Selecciona una carrera en el ranking primero', 'error');
                return;
            }
            
            // ✅ Obtener info de la carrera seleccionada
            const selectorRanking = document.getElementById('selectorCarreraRanking');
            const opcionCarrera = selectorRanking ? Array.from(selectorRanking.options).find(opt => opt.value == carreraSeleccionadaRanking) : null;
            const nombreCarrera = opcionCarrera ? opcionCarrera.textContent.split('(')[0].trim() : 'Carrera';
            const puntosCarrera = opcionCarrera ? parseInt(opcionCarrera.dataset.puntos) : 0;
            
            modalTitle.innerHTML = '<i class="fas fa-graduation-cap"></i> Duelo de Carrera';
            modalSubtitle.textContent = `Desafiar a ${usernameOponente} - ${nombreCarrera}`;
            
            // ✅ Guardar la carrera seleccionada
            window.carreraSeleccionada = parseInt(carreraSeleccionadaRanking);
            window.puntosCarreraDisponibles = puntosCarrera;
            
            console.log('[MODAL] ✅ Carrera del ranking:', window.carreraSeleccionada);
            console.log('[MODAL] ✅ Puntos disponibles:', window.puntosCarreraDisponibles);
            
            const modalWarning = document.querySelector('.modal-warning');
            if (modalWarning) {
                modalWarning.innerHTML = `
                    <h4><i class="fas fa-exclamation-triangle"></i> Sistema de Puntos de Carrera</h4>
                    <ul>
                        <li><strong>Victoria:</strong> Ganas puntos de carrera según preguntas correctas</li>
                        <li><strong>Derrota:</strong> Pierdes el 50% de tus puntos de carrera</li>
                        <li><strong>Abandono:</strong> Pierdes el 30% de tus puntos de carrera</li>
                        <li><strong>Empate:</strong> No se pierden ni ganan puntos</li>
                    </ul>
                    <p style="margin-top: 15px; color: #fbbf24;">
                        <strong>Tus puntos en ${nombreCarrera}:</strong> ${puntosCarrera} pts
                    </p>
                `;
            }
        }
        
        const modal = document.getElementById('modalDificultad');
        if (modal) {
            modal.classList.add('active');
            console.log('[MODAL] ✅ Modal abierto');
            console.log('[MODAL] ==========================================');
        } else {
            console.error('[MODAL] ❌ No se encontró el elemento #modalDificultad');
        }
    }
    
    window.cerrarModalDificultad = function() {
        console.log('[MODAL] 🚪 Cerrando modal...');
        
        const modal = document.getElementById('modalDificultad');
        if (modal) {
            modal.classList.remove('active');
        }
        
        oponenteSeleccionado = null;
        dificultadSeleccionada = null;
        apuestaSeleccionada = null;
        tipoDueloSeleccionado = null;
        
        delete window.carreraSeleccionada;
        delete window.puntosCarreraDisponibles;
        
        console.log('[MODAL] ✅ Variables limpiadas');
    };
    
    // =============================================
    // 🎯 SELECCIÓN DE DIFICULTAD
    // =============================================
    
    function inicializarModalDificultad() {
        const cards = document.querySelectorAll('.difficulty-card');
        const btnConfirmar = document.getElementById('btnConfirmarDuelo');
        
        if (!cards.length) {
            console.warn('[MODAL] No se encontraron .difficulty-card');
            return;
        }
        
        cards.forEach(card => {
            card.addEventListener('click', () => {
                const dificultad = parseInt(card.dataset.difficulty);
                const apuesta = parseInt(card.dataset.bet);
                
                console.log('[MODAL] Dificultad seleccionada:', DIFICULTADES[dificultad].nombre);
                
                // Verificar puntos
                let puntosDisponibles = 0;
                let tipoPuntos = '';
                
                if (tipoDueloSeleccionado === 'general') {
                    puntosDisponibles = user.puntos || 0;
                    tipoPuntos = 'globales';
                } else if (tipoDueloSeleccionado === 'carrera') {
                    puntosDisponibles = window.puntosCarreraDisponibles || 0;
                    tipoPuntos = 'de carrera';
                }
                
                console.log('[MODAL] Verificando:', { disponibles: puntosDisponibles, requeridos: apuesta });
                
                if (puntosDisponibles < apuesta) {
                    mostrarNotificacion(
                        `❌ No tienes suficientes puntos ${tipoPuntos}. Necesitas ${apuesta}, tienes ${puntosDisponibles}`,
                        'error'
                    );
                    return;
                }
                
                cards.forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                dificultadSeleccionada = dificultad;
                apuestaSeleccionada = apuesta;
                
                btnConfirmar.disabled = false;
                console.log('[MODAL] ✅ Dificultad confirmada');
            });
        });
        
        if (btnConfirmar) {
            btnConfirmar.addEventListener('click', enviarDesafio);
        }
    }
    
    // =============================================
    // 📤 ENVIAR DESAFÍO
    // =============================================
    
    async function enviarDesafio() {
        console.log('[DESAFÍO] ==========================================');
        console.log('[DESAFÍO] 🚀 Iniciando envío...');
        
        if (!oponenteSeleccionado || !dificultadSeleccionada || !apuestaSeleccionada || !tipoDueloSeleccionado) {
            console.error('[DESAFÍO] ❌ Faltan datos');
            mostrarNotificacion('Error: Datos incompletos', 'error');
            return;
        }
        
        const oponenteId = oponenteSeleccionado.id;
        const oponenteUsername = oponenteSeleccionado.username;
        const dificultad = dificultadSeleccionada;
        const apuesta = apuestaSeleccionada;
        const tipoDuelo = tipoDueloSeleccionado;
        const carreraId = window.carreraSeleccionada || null;
        
        console.log('[DESAFÍO] 📋 Datos:', { oponenteId, dificultad, apuesta, tipoDuelo, carreraId });
        
        if (tipoDuelo === 'carrera' && !carreraId) {
            console.error('[DESAFÍO] ❌ Falta carrera');
            mostrarNotificacion('Error: Falta seleccionar carrera', 'error');
            return;
        }
        
        const btnConfirmar = document.getElementById('btnConfirmarDuelo');
        
        if (!btnConfirmar) {
            console.error('[DESAFÍO] ❌ No se encontró btnConfirmarDuelo');
            return;
        }
        
        btnConfirmar.disabled = true;
        btnConfirmar.textContent = 'Verificando...';
        
        try {
            // Verificar duelo activo
            console.log('[DESAFÍO] 🔍 Verificando duelo existente...');
            
            const checkResponse = await fetch(`/api/duelo/verificar/${oponenteId}`);
            const checkData = await checkResponse.json();
            
            if (checkData.existe_duelo) {
                console.log('[DESAFÍO] ⚠️ Ya existe duelo activo');
                cerrarModalDificultad();
                mostrarNotificacion(`Ya tienes un duelo activo con ${oponenteUsername}`, 'error');
                btnConfirmar.disabled = false;
                btnConfirmar.innerHTML = '<i class="fas fa-paper-plane"></i> Enviar Desafío';
                return;
            }
            
            console.log('[DESAFÍO] ✅ No hay duelo activo');
            
            btnConfirmar.textContent = 'Enviando...';
            
            const endpoint = tipoDuelo === 'general' ?
                `/desafiar/duelo-general/${oponenteId}` :
                `/desafiar/duelo/${oponenteId}`;
            
            const bodyData = {
                id_dificultad: dificultad,
                apuesta: apuesta
            };
            
            if (tipoDuelo === 'carrera') {
                bodyData.id_carrera = carreraId;
            }
            
            console.log('[DESAFÍO] 📤 POST:', endpoint, bodyData);
            
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(bodyData)
            });
            
            console.log('[DESAFÍO] 📥 Status:', response.status);
            
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const text = await response.text();
                console.error('[DESAFÍO] ❌ NO es JSON:', text.substring(0, 500));
                throw new Error('El servidor no devolvió JSON');
            }
            
            const data = await response.json();
            
            console.log('[DESAFÍO] 📥 Data:', data);
            
            if (!response.ok) {
                throw new Error(data.message || `HTTP ${response.status}`);
            }
            
            if (data.success) {
                console.log('[DESAFÍO] ✅ Éxito');
                
                cerrarModalDificultad();
                
                const dificultadNombre = DIFICULTADES[dificultad]?.nombre || 'Desconocida';
                const tipoTexto = tipoDuelo === 'general' ? 'General' : 'de Carrera';
                
                mostrarNotificacion(
                    `¡Desafío ${tipoTexto} ${dificultadNombre} enviado a ${oponenteUsername}! (${apuesta} pts)`,
                    'success'
                );
                
                delete window.carreraSeleccionada;
                delete window.puntosCarreraDisponibles;
                
                console.log('[DESAFÍO] 🔄 Recargando ranking...');
                if (tipoDuelo === 'general') {
                    await cargarRankingGlobal();
                } else {
                    await cargarRankingCarrera();
                }
                
                console.log('[DESAFÍO] ✅ Completado');
                console.log('[DESAFÍO] ==========================================');
            } else {
                throw new Error(data.message || 'Error desconocido');
            }
            
        } catch (error) {
            console.error('[DESAFÍO] ==========================================');
            console.error('[DESAFÍO] ❌ ERROR:', error.message);
            console.error('[DESAFÍO] ==========================================');
            
            mostrarNotificacion('Error: ' + error.message, 'error');
            
        } finally {
            if (btnConfirmar) {
                btnConfirmar.disabled = false;
                btnConfirmar.innerHTML = '<i class="fas fa-paper-plane"></i> Enviar Desafío';
            }
        }
    }
    
    // =============================================
    // 🔔 NOTIFICACIONES
    // =============================================
    
    function mostrarNotificacion(mensaje, tipo = 'info') {
        const colores = {
            success: '#10b981',
            error: '#ef4444',
            info: '#3b82f6'
        };
        
        const notif = document.createElement('div');
        notif.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${colores[tipo]};
            color: white;
            padding: 20px 30px;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
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
    
    // Animaciones CSS
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from { opacity: 0; transform: translateX(100%); }
            to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideOutRight {
            from { opacity: 1; transform: translateX(0); }
            to { opacity: 0; transform: translateX(100%); }
        }
    `;
    document.head.appendChild(style);
    
    console.log('[DUELOS] ✅ Sistema completamente cargado');
    
})();