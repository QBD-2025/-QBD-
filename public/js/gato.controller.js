document.addEventListener('DOMContentLoaded', () => {
    const socket = io();
    const salaId = "{{salaId}}";
    const usuario = window.DATA_USER;
    const materiasPrecargadas = window.MATERIAS_DATA;

    // ============================================================
    // REFERENCIAS DOM
    // ============================================================
    const elements = {
        // Juego
        board:               document.getElementById('board'),
        gameStatusDisplay:   document.getElementById('game-status-display'),
        lobbyPanel:          document.getElementById('lobby-panel'),
        lobbyState:          document.getElementById('lobby-state'),
        startGameControls:   document.getElementById('start-game-controls'),
        materiasSelect:      document.getElementById('materias-select'),
        proposeStartBtn:     document.getElementById('propose-start-btn'),
        voteControls:        document.getElementById('vote-controls'),
        voteProposalText:    document.getElementById('vote-proposal-text'),
        voteYesBtn:          document.getElementById('vote-yes-btn'),
        voteNoBtn:           document.getElementById('vote-no-btn'),
        playersList:         document.getElementById('players-list'),
        // Chat
        chatBox:             document.getElementById('chatBox'),
        chatInput:           document.getElementById('chatInput'),
        chatBtn:             document.getElementById('chatBtn'),
        // Notificación
        notification:        document.getElementById('notification'),
        // Jugadores
        listaJugadoresActivos: document.getElementById('lista-jugadores-activos'),
        listaAmigos:           document.getElementById('lista-amigos'),
        friendsCount:          document.getElementById('friends-count'),
        activeCount:           document.getElementById('active-count'),
        // Ranking
        listaRanking:          document.getElementById('lista-ranking'),
        refreshRankingBtn:     document.getElementById('refresh-ranking-btn'),
        // Modal pregunta
        questionModal:       document.getElementById('question-modal'),
        modalQuestionText:   document.getElementById('modal-question-text'),
        modalOptions:        document.getElementById('modal-options'),
        feedbackSection:     document.getElementById('feedback-section'),
        feedbackText:        document.getElementById('feedback-text'),
        // Mobile UI
        hudStatusText:       document.getElementById('hud-status-text'),
        hudToggleBtn:        document.getElementById('hud-toggle-btn'),
        sidePanel:           document.getElementById('side-panel'),
        panelOverlay:        document.getElementById('panel-overlay'),
        panelCloseBtn:       document.getElementById('panel-close-btn'),
        // Tabs
        tabBtns:             document.querySelectorAll('.tab-btn'),
        tabContents:         document.querySelectorAll('.tab-content'),
        chatBadge:           document.getElementById('chat-badge'),
        // Búsqueda amigos
        friendsSearch:       document.getElementById('friends-search'),
        // HUD (búsqueda de amigos se maneja dinámicamente)
    };

    // ============================================================
    // ESTADO
    // ============================================================
    let gameState        = null;
    let currentQuestion  = null;
    let feedbackTimeout  = null;
    let unreadMessages   = 0;
    let activeTabId      = 'friends';

    // ============================================================
    // TABS
    // ============================================================
    const switchTab = (tabId) => {
        activeTabId = tabId;
        elements.tabBtns.forEach(btn => {
            const active = btn.dataset.tab === tabId;
            btn.classList.toggle('active', active);
            btn.setAttribute('aria-selected', String(active));
        });
        elements.tabContents.forEach(content => {
            content.classList.toggle('active', content.id === `tab-${tabId}`);
        });
        if (tabId === 'chat') {
            unreadMessages = 0;
            elements.chatBadge.textContent = '';
            elements.chatBadge.classList.add('hidden');
            scrollChatToBottom();
        }
        if (tabId === 'ranking') {
            cargarRanking();
        }
    };

    elements.tabBtns.forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // ============================================================
    // PANEL LATERAL — Bottom sheet en todo mobile (≤ 900px)
    // En desktop el panel es estático, no se abre/cierra.
    // ============================================================
    const isMobile = () => window.innerWidth <= 900;

    // Bloquear scroll sin usar overflow:hidden (que atrapa fixed en Android Chrome)
    let scrollY = 0;
    const lockScroll = () => {
        scrollY = window.scrollY;
        document.body.style.position = 'fixed';
        document.body.style.top = `-${scrollY}px`;
        document.body.style.width = '100%';
    };
    const unlockScroll = () => {
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        window.scrollTo(0, scrollY);
    };

    const openPanel = () => {
        if (!isMobile()) return;
        elements.sidePanel.style.transform = '';
        elements.sidePanel.classList.add('open');
        elements.panelOverlay.classList.add('visible');
        lockScroll();
    };

    const closePanel = () => {
        elements.sidePanel.style.transform = '';
        elements.sidePanel.style.transition = '';
        elements.sidePanel.classList.remove('open');
        elements.panelOverlay.classList.remove('visible');
        unlockScroll();
    };

    elements.hudToggleBtn.addEventListener('click', openPanel);
    elements.panelCloseBtn.addEventListener('click', closePanel);
    elements.panelOverlay.addEventListener('click', closePanel);

    // ── Swipe hacia abajo para cerrar ─────────────────────────
    let swipeStartY   = 0;
    let swipeCurrentY = 0;
    let swipeActive   = false;
    const SWIPE_CLOSE = 72; // px mínimos hacia abajo para cerrar

    const swipeTargets = [
        document.getElementById('sheet-handle'),
        document.querySelector('.tabs-nav'),
    ].filter(Boolean);

    swipeTargets.forEach(el => {
        el.addEventListener('touchstart', (e) => {
            if (!isMobile() || !elements.sidePanel.classList.contains('open')) return;
            swipeStartY   = e.touches[0].clientY;
            swipeCurrentY = swipeStartY;
            swipeActive   = true;
            elements.sidePanel.style.transition = 'none';
        }, { passive: true });

        el.addEventListener('touchmove', (e) => {
            if (!swipeActive) return;
            swipeCurrentY = e.touches[0].clientY;
            const delta   = swipeCurrentY - swipeStartY;
            if (delta > 0) {
                elements.sidePanel.style.transform = `translateY(${delta}px)`;
            }
        }, { passive: true });

        el.addEventListener('touchend', () => {
            if (!swipeActive) return;
            swipeActive = false;
            elements.sidePanel.style.transition = '';
            const delta = swipeCurrentY - swipeStartY;
            if (delta > SWIPE_CLOSE) {
                closePanel();
            } else {
                elements.sidePanel.style.transform = '';
            }
        });
    });

    // ============================================================
    // RENDER UI
    // ============================================================
    const renderUI = () => {
        if (!gameState) return;
        renderPlayersList();
        renderBoard();
        if (gameState.gameStarted) {
            elements.lobbyPanel.classList.add('hidden');
            renderGameStatus();
        } else {
            elements.lobbyPanel.classList.remove('hidden');
            renderLobbyStatus();
        }
    };

    const renderPlayersList = () => {
        elements.playersList.innerHTML = '';
        if (gameState?.jugadores) {
            gameState.jugadores.forEach(p => {
                const li = document.createElement('li');
                li.textContent = `${p.username} (${p.simbolo})`;
                elements.playersList.appendChild(li);
            });
        }
    };

    const renderBoard = () => {
        elements.board.innerHTML = '';
        if (!gameState?.jugadores) return;
        const jugadorEnTurno = gameState.jugadores[gameState.turno];
        const esMiTurno = !gameState.gameOver && jugadorEnTurno?.id === usuario.id_usuario;
        elements.board.classList.toggle('turno-activo', esMiTurno);
        gameState.tablero.forEach((simbolo, index) => {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.index = index;
            if (simbolo) {
                cell.textContent = simbolo;
                cell.classList.add(simbolo === 'X' ? 'symbol-x' : 'symbol-o', 'disabled');
            } else if (gameState.gameOver || !esMiTurno || !gameState.gameStarted) {
                cell.classList.add('disabled');
            }
            elements.board.appendChild(cell);
        });
    };

    const renderGameStatus = () => {
        if (!gameState?.jugadores) return;
        let text = '';
        if (gameState.gameOver) {
            if (gameState.ganador === 'empate') {
                text = '¡Juego terminado en empate!';
            } else if (gameState.ganador) {
                const esGanador = gameState.ganador.id === usuario.id_usuario;
                text = esGanador
                    ? '¡Felicidades, has ganado! 🏆'
                    : `Perdiste. Ganó ${gameState.ganador.username}.`;
            } else {
                text = 'Juego terminado por desconexión.';
            }
        } else {
            const jugadorEnTurno = gameState.jugadores[gameState.turno];
            if (jugadorEnTurno) {
                const esMiTurno = jugadorEnTurno.id === usuario.id_usuario;
                text = esMiTurno
                    ? '¡Es tu turno! Elige una casilla.'
                    : `Turno de ${jugadorEnTurno.username}...`;
                elements.gameStatusDisplay.classList.toggle('my-turn', esMiTurno);
            }
        }
        elements.gameStatusDisplay.textContent = text;
        elements.hudStatusText.textContent = text;
    };

    const renderLobbyStatus = () => {
        if (!gameState?.jugadores) return;
        const numJugadores = gameState.jugadores.length;
        const esAnfitrion = numJugadores > 0 && gameState.jugadores[0].id === usuario.id_usuario;
        elements.startGameControls.classList.add('hidden');
        elements.voteControls.classList.add('hidden');

        if (numJugadores < 2) {
            elements.lobbyState.textContent = 'Esperando a otro jugador...';
            elements.hudStatusText.textContent = 'Esperando jugador...';
        } else {
            if (gameState.votacionEnProgreso) {
                const proponente    = gameState.propuestaPor;
                const materiaTexto  = gameState.propuestaMateriaTexto;
                elements.lobbyState.textContent = `Votación iniciada por ${proponente}...`;
                elements.hudStatusText.textContent = 'Votación en progreso...';
                if (proponente !== usuario.username) {
                    elements.voteControls.classList.remove('hidden');
                    elements.voteProposalText.innerHTML =
                        `<strong>${proponente}</strong> propone jugar con la categoría:<br><strong>"${materiaTexto}"</strong><br>¿Aceptas?`;
                }
            } else {
                elements.lobbyState.textContent = '¡Listos para empezar!';
                elements.hudStatusText.textContent = '¡Listos!';
                if (esAnfitrion) elements.startGameControls.classList.remove('hidden');
            }
        }
    };

    // ============================================================
    // CHAT
    // ============================================================
    const scrollChatToBottom = () => {
        elements.chatBox.scrollTop = elements.chatBox.scrollHeight;
    };

    const addChatMessage = (user, msg, type) => {
        const msgDiv = document.createElement('div');
        msgDiv.classList.add('chat-message');

        if (type === 'system') {
            msgDiv.classList.add('system');
            msgDiv.innerHTML = msg;
        } else {
            const isOwn = user === usuario.username;
            msgDiv.classList.add(isOwn ? 'own' : 'other');
            msgDiv.innerHTML = `<strong>${user}</strong>${msg}`;
        }

        elements.chatBox.appendChild(msgDiv);
        scrollChatToBottom();

        // Contador de no leídos si el tab de chat no está activo
        if (type !== 'system' && activeTabId !== 'chat') {
            unreadMessages++;
            elements.chatBadge.textContent = unreadMessages > 9 ? '9+' : unreadMessages;
            elements.chatBadge.classList.remove('hidden');
        }
    };

    // ============================================================
    // MODAL PREGUNTA
    // ============================================================
    const showQuestionInModal = (pregunta) => {
        currentQuestion = pregunta;
        if (feedbackTimeout) { clearTimeout(feedbackTimeout); feedbackTimeout = null; }

        elements.modalQuestionText.textContent = pregunta.pregunta;
        elements.modalOptions.innerHTML = '';
        elements.feedbackSection.style.display = 'none';
        elements.feedbackSection.className = 'feedback-section';

        // Reiniciar timer bar
        const timerFill = document.getElementById('timer-fill');
        if (timerFill) {
            timerFill.style.animation = 'none';
            timerFill.offsetHeight; // reflow
            timerFill.style.animation = '';
        }

        pregunta.opciones.forEach(opcion => {
            const btn = document.createElement('button');
            btn.classList.add('option-btn');
            btn.textContent = opcion.texto;
            btn.dataset.respuestaId = opcion.id;
            btn.addEventListener('click', () => {
                elements.modalOptions.querySelectorAll('.option-btn').forEach(b => b.disabled = true);
                socket.emit('gato:respuesta', { salaId, respuestaId: opcion.id });
            });
            elements.modalOptions.appendChild(btn);
        });

        elements.questionModal.classList.add('show');
    };

    const handleAnswerFeedback = (ultimaJugada) => {
        if (!ultimaJugada?.preguntaRespondida) return;
        const { esCorrecta, respuestaCorrectaTexto } = ultimaJugada;

        if (feedbackTimeout) { clearTimeout(feedbackTimeout); feedbackTimeout = null; }

        elements.feedbackSection.style.display = 'block';
        if (esCorrecta) {
            elements.feedbackSection.className = 'feedback-section feedback-correct';
            elements.feedbackText.innerHTML = '<strong>✅ ¡Respuesta correcta!</strong>';
        } else {
            elements.feedbackSection.className = 'feedback-section feedback-incorrect';
            elements.feedbackText.innerHTML =
                `<strong>❌ Respuesta incorrecta.</strong> La correcta era: <strong>"${respuestaCorrectaTexto}"</strong>.`;
            elements.modalOptions.querySelectorAll('.option-btn').forEach(btn => {
                if (btn.textContent === respuestaCorrectaTexto) btn.classList.add('correct');
            });
        }

        if (currentQuestion?.retroalimentacion) {
            elements.feedbackText.innerHTML +=
                `<br><small><em>${currentQuestion.retroalimentacion}</em></small>`;
        }

        feedbackTimeout = setTimeout(() => {
            elements.questionModal.classList.remove('show');
            feedbackTimeout = null;
            currentQuestion = null;
        }, 3000);
    };

    // ============================================================
    // NOTIFICACIÓN
    // ============================================================
    let notifTimeout = null;
    const mostrarNotificacion = (mensaje) => {
        if (notifTimeout) clearTimeout(notifTimeout);
        elements.notification.textContent = mensaje;
        elements.notification.classList.add('show');
        notifTimeout = setTimeout(() => elements.notification.classList.remove('show'), 3000);
    };

    // ============================================================
    // HELPERS UI — construcción de filas de jugador
    // ============================================================
    const getInitial = (name) => (name || '?').charAt(0).toUpperCase();

    /**
     * Crea un <li> genérico para listas de jugadores.
     * @param {object} jugador  - { id, username, puntos? }
     * @param {boolean} canInvite
     * @param {string|null} extraClass
     */
    const buildPlayerItem = (jugador, canInvite = true) => {
        const li = document.createElement('li');

        const info = document.createElement('div');
        info.classList.add('player-info');

        const avatar = document.createElement('div');
        avatar.classList.add('player-avatar');
        avatar.textContent = getInitial(jugador.username);

        const nameWrap = document.createElement('div');

        const nameEl = document.createElement('div');
        nameEl.classList.add('player-name');
        nameEl.textContent = jugador.username;

        nameWrap.appendChild(nameEl);

        if (jugador.puntos !== undefined) {
            const ptsEl = document.createElement('div');
            ptsEl.classList.add('player-pts');
            ptsEl.textContent = `${jugador.puntos} pts`;
            nameWrap.appendChild(ptsEl);
        }

        info.appendChild(avatar);
        info.appendChild(nameWrap);
        li.appendChild(info);

        if (canInvite) {
            const actions = document.createElement('div');
            actions.classList.add('player-actions');
            const btn = document.createElement('button');
            btn.classList.add('btn-invite');
            btn.textContent = 'Invitar';
            btn.dataset.id = jugador.id;
            actions.appendChild(btn);
            li.appendChild(actions);
        }

        return li;
    };

    // ============================================================
    // LISTA DE AMIGOS
    // ============================================================
    let allFriends = [];

    const renderFriendsList = (filter = '') => {
        elements.listaAmigos.innerHTML = '';
        const filtered = filter
            ? allFriends.filter(f => f.username.toLowerCase().includes(filter.toLowerCase()))
            : allFriends;

        elements.friendsCount.textContent = allFriends.length;

        if (filtered.length === 0) {
            const li = document.createElement('li');
            li.classList.add('list-loading');
            li.innerHTML = filter
                ? '<span style="color:var(--c-text-muted)">Sin resultados</span>'
                : '<span style="color:var(--c-text-muted)">Aún no tienes amigos 😢</span>';
            elements.listaAmigos.appendChild(li);
            return;
        }

        filtered.forEach(amigo => {
            elements.listaAmigos.appendChild(buildPlayerItem(amigo, true));
        });
    };

    const cargarAmigos = async () => {
        try {
            elements.listaAmigos.innerHTML = '<li class="list-loading"><span class="loading-dot"></span> Cargando...</li>';
            const res = await fetch('/amigos');
            if (!res.ok) throw new Error('Error al cargar amigos');
            allFriends = await res.json();
            renderFriendsList(elements.friendsSearch?.value || '');
        } catch (err) {
            console.error('Error al cargar amigos:', err);
            elements.listaAmigos.innerHTML = '<li class="list-loading"><span style="color:var(--c-danger)">Error al cargar amigos</span></li>';
        }
    };

    if (elements.friendsSearch) {
        elements.friendsSearch.addEventListener('input', (e) => {
            renderFriendsList(e.target.value);
        });
    }

    // ============================================================
    // LISTA DE JUGADORES ACTIVOS
    // ============================================================
    const cargarJugadoresActivos = async () => {
        try {
            const res = await fetch('/jugadores');
            if (!res.ok) throw new Error('Error al obtener jugadores');
            const jugadores = await res.json();

            elements.listaJugadoresActivos.innerHTML = '';
            const otros = jugadores.filter(j => j.id !== usuario.id_usuario);
            elements.activeCount.textContent = otros.length;

            if (otros.length === 0) {
                const li = document.createElement('li');
                li.classList.add('list-loading');
                li.innerHTML = '<span style="color:var(--c-text-muted)">No hay otros jugadores activos</span>';
                elements.listaJugadoresActivos.appendChild(li);
                return;
            }

            otros.forEach(jugador => {
                elements.listaJugadoresActivos.appendChild(buildPlayerItem(jugador, true));
            });
        } catch (err) {
            console.error('Error al cargar jugadores:', err);
            elements.listaJugadoresActivos.innerHTML =
                '<li class="list-loading"><span style="color:var(--c-danger)">Error al cargar</span></li>';
        }
    };

    // ============================================================
    // RANKING
    // ============================================================
    const cargarRanking = async () => {
        try {
            elements.listaRanking.innerHTML =
                '<li class="list-loading"><span class="loading-dot"></span> Cargando ranking...</li>';

            if (elements.refreshRankingBtn) {
                elements.refreshRankingBtn.classList.add('spinning');
            }

            const res = await fetch('/jugadoress/ranking');
            if (!res.ok) throw new Error('No se pudo obtener el ranking');
            const jugadores = await res.json();

            elements.listaRanking.innerHTML = '';

            if (jugadores.length === 0) {
                const li = document.createElement('li');
                li.classList.add('list-loading');
                li.innerHTML = '<span style="color:var(--c-text-muted)">Sin datos de ranking</span>';
                elements.listaRanking.appendChild(li);
                return;
            }

            jugadores.forEach((jug, idx) => {
                const pos = idx + 1;
                const li = document.createElement('li');
                li.classList.add('ranking-item');

                const rankBadge = document.createElement('div');
                rankBadge.classList.add('rank-badge');
                if (pos <= 3) rankBadge.classList.add(`rank-${pos}`);
                if (jug.id === usuario.id_usuario) rankBadge.classList.add('rank-me');
                rankBadge.textContent = pos <= 3 ? ['🥇','🥈','🥉'][pos-1] : pos;

                const info = document.createElement('div');
                info.classList.add('player-info');

                const avatar = document.createElement('div');
                avatar.classList.add('player-avatar');
                avatar.textContent = getInitial(jug.username);

                const nameEl = document.createElement('div');
                nameEl.classList.add('player-name');
                nameEl.textContent = jug.username;
                if (jug.id === usuario.id_usuario) {
                    nameEl.style.color = 'var(--c-primary)';
                    nameEl.textContent += ' (Tú)';
                }

                const ptsPill = document.createElement('span');
                ptsPill.classList.add('pts-pill');
                ptsPill.textContent = `${jug.puntos} pts`;

                info.appendChild(avatar);
                info.appendChild(nameEl);

                li.appendChild(rankBadge);
                li.appendChild(info);
                li.appendChild(ptsPill);

                elements.listaRanking.appendChild(li);
            });
        } catch (err) {
            console.error('Error al cargar ranking:', err);
            elements.listaRanking.innerHTML =
                '<li class="list-loading"><span style="color:var(--c-danger)">Error al cargar</span></li>';
        } finally {
            if (elements.refreshRankingBtn) {
                elements.refreshRankingBtn.classList.remove('spinning');
            }
        }
    };

    if (elements.refreshRankingBtn) {
        elements.refreshRankingBtn.addEventListener('click', cargarRanking);
    }

    // ============================================================
    // INVITACIONES
    // ============================================================
    const handleInviteClick = async (target) => {
        const idJugador = target.dataset.id;
        if (!idJugador) return;

        target.disabled = true;
        target.textContent = '...';

        try {
            const res = await fetch(`/invitar/${idJugador}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ salaId, juego: 'Gato' })
            });
            const data = await res.json();
            mostrarNotificacion(data.message || '✅ Invitación enviada');
        } catch (err) {
            console.error('Error al invitar:', err);
            mostrarNotificacion('❌ No se pudo enviar la invitación');
        } finally {
            target.disabled = false;
            target.textContent = 'Invitar';
        }
    };

    // Delegación de eventos para invitaciones (amigos + activos)
    [elements.listaJugadoresActivos, elements.listaAmigos].forEach(list => {
        list.addEventListener('click', (e) => {
            const btn = e.target.closest('.btn-invite');
            if (btn) handleInviteClick(btn);
        });
    });

    // ============================================================
    // SOCKET LISTENERS
    // ============================================================
    const setupSocketListeners = () => {
        socket.on('gato:estado', (serverState) => {
            const isGameOverBefore = gameState ? gameState.gameOver : false;

            // Solo procesar feedback si es una jugada nueva
            if (serverState.ultimaJugada && gameState &&
                (!gameState.ultimaJugada ||
                 serverState.ultimaJugada.timestamp !== gameState.ultimaJugada.timestamp)) {
                handleAnswerFeedback(serverState.ultimaJugada);
            }

            gameState = serverState;
            renderUI();

            if (gameState.gameOver && !isGameOverBefore) {
                if (feedbackTimeout) { clearTimeout(feedbackTimeout); feedbackTimeout = null; }
                if (gameState.ganador === 'empate') {
                    addChatMessage(null, '🤝 La partida ha terminado en empate.', 'system');
                } else if (gameState.ganador) {
                    addChatMessage(null, `🏆 ¡Partida finalizada! Ganó ${gameState.ganador.username}.`, 'system');
                }
            }
        });

        socket.on('gato:votacionCancelada', ({ motivo }) => {
            addChatMessage(null, `⚠️ Votación cancelada: ${motivo}`, 'system');
        });

        socket.on('gato:mostrarPregunta', (pregunta) => {
            showQuestionInModal(pregunta);
        });

        socket.on('nuevoMensaje', (data) => {
            addChatMessage(data.usuario, data.mensaje);
        });

        socket.on('gato:error', ({ message }) => {
            addChatMessage(null, `🚫 Error: ${message}`, 'system');
        });

        socket.on('jugadorUnido', (data) => {
            mostrarNotificacion(`👋 ${data.username} se unió a la red`);
            cargarJugadoresActivos();
        });

        socket.on('jugadorAbandono', (data) => {
            mostrarNotificacion(`👋 ${data.username} abandonó la red`);
            cargarJugadoresActivos();
        });
    };

    // ============================================================
    // EVENT LISTENERS JUEGO
    // ============================================================
    const setupEventListeners = () => {
        elements.proposeStartBtn.addEventListener('click', () => {
            const select = elements.materiasSelect;
            const idMateria = select.value;
            if (!idMateria) { alert('Por favor, selecciona una categoría para jugar.'); return; }
            const textoMateria = select.options[select.selectedIndex].text;
            socket.emit('gato:proponerInicio', { salaId, idMateria, textoMateria });
        });

        elements.voteYesBtn.addEventListener('click', () => socket.emit('gato:votar', { salaId, voto: true }));
        elements.voteNoBtn.addEventListener('click', () => socket.emit('gato:votar', { salaId, voto: false }));

        elements.board.addEventListener('click', (e) => {
            const cell = e.target.closest('.cell');
            if (cell && !cell.classList.contains('disabled')) {
                socket.emit('gato:movimiento', { salaId, celda: cell.dataset.index });
            }
        });

        const sendChatMessage = () => {
            const mensaje = elements.chatInput.value.trim();
            if (mensaje) {
                socket.emit('mensajeChat', { salaId, mensaje, usuario: usuario.username });
                elements.chatInput.value = '';
            }
        };

        elements.chatBtn.addEventListener('click', sendChatMessage);
        elements.chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendChatMessage();
        });
    };

    // ============================================================
    // INIT
    // ============================================================
    const init = () => {
        // Cargar materias
        try {
            if (!materiasPrecargadas || materiasPrecargadas.length === 0) {
                elements.materiasSelect.innerHTML = '<option value="">No hay materias</option>';
                elements.proposeStartBtn.disabled = true;
                addChatMessage(null, '⚠️ No se encontraron materias con preguntas.', 'system');
            } else {
                elements.materiasSelect.innerHTML = '';
                materiasPrecargadas.forEach(m => {
                    const option = document.createElement('option');
                    option.value = m.id_materia;
                    option.textContent = m.descripcion;
                    elements.materiasSelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error al procesar materias:', error);
            addChatMessage(null, `❌ Error al procesar materias: ${error.message}`, 'system');
        }

        setupEventListeners();
        setupSocketListeners();
        socket.emit('gato:unirse', { salaId, usuario });

        // Cargar datos iniciales
        cargarJugadoresActivos();
        cargarAmigos();

        // Auto-refresh cada 20 s
        setInterval(() => {
            cargarJugadoresActivos();
            cargarAmigos();
        }, 20000);
    };

    init();
});