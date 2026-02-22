document.addEventListener('DOMContentLoaded', () => {
    const socket = io();
    const salaId = window.SALA_CONFIG.salaId;
    const usuario = window.SALA_CONFIG.user;
    const urlParams = new URLSearchParams(window.location.search);
    const modo = urlParams.get('modo') === 'enfrentamiento' ? 'enfrentamiento' : 'cooperativo';

    const vistaCooperativo = document.getElementById('vista-cooperativo');
    const vistaEnfrentamiento = document.getElementById('vista-enfrentamiento');
    const jugadoresPanel = document.getElementById('jugadores-panel');
    const chatPanel = document.getElementById('chat-panel');
    const chatBox = document.getElementById('chatBox');
    const chatInput = document.getElementById('chatInput');
    const chatBtn = document.getElementById('chatBtn');

    const categoriaCoopSelect = document.getElementById("categoria-coop");
    const pistaCoopDiv = document.getElementById("pista-coop");
    const palabraCoopDiv = document.getElementById("palabra-coop");
    const incorrectasCoopDiv = document.getElementById("incorrectas-coop");
    const tecladoCoopDiv = document.getElementById("teclado-coop");
    const reiniciarCoopBtn = document.getElementById("reiniciar-coop");
    const canvasCoop = document.getElementById("canvas-coop");
    const ctxCoop = canvasCoop ? canvasCoop.getContext("2d") : null;

    const timerEl = document.getElementById('timer');
    const tecladoLocalDiv = document.getElementById("teclado-local");
    const tecladoOponenteDiv = document.getElementById("teclado-oponente");
    const palabraLocalDiv = document.getElementById("palabra-local");
    const incorrectasLocalDiv = document.getElementById("incorrectas-local");
    const canvasLocal = document.getElementById("canvas-local");
    const ctxLocal = canvasLocal ? canvasLocal.getContext("2d") : null;
    const nombreOponenteEl = document.getElementById('nombre-oponente');
    const palabraOponenteDiv = document.getElementById("palabra-oponente");
    const incorrectasOponenteDiv = document.getElementById("incorrectas-oponente");
    const canvasOponente = document.getElementById("canvas-oponente");
    const ctxOponente = canvasOponente ? canvasOponente.getContext("2d") : null;
    const pistaLocalDiv = document.getElementById('pista-local');
    const panelVotacion = document.getElementById('panel-votacion-enfrentamiento');
    const propuestaActualDiv = document.getElementById('propuesta-actual');
    const areaProponerDiv = document.getElementById('area-proponer');
    const areaVotarDiv = document.getElementById('area-votar');
    const categoriaEnfrentamientoSelect = document.getElementById('categoria-enfrentamiento-select');
    const proponerBtn = document.getElementById('proponer-btn');
    const aceptarBtn = document.getElementById('aceptar-btn');
    const rechazarBtn = document.getElementById('rechazar-btn');

    let timerInterval = null;
    const MAX_ERRORES = 10;

    // ──────────────────────────────────────────
    // SETUP DE VISTAS
    // ──────────────────────────────────────────
    if (modo === 'enfrentamiento') {
        vistaEnfrentamiento.style.display = 'grid';
        vistaCooperativo.style.display = 'none';
        document.getElementById('panel-central-enfrentamiento').prepend(panelVotacion);
        document.getElementById('panel-central-enfrentamiento').append(jugadoresPanel, chatPanel);
        document.querySelectorAll('.game-enfrentamiento').forEach(el => el.style.visibility = 'hidden');
        document.querySelector('.timer-container').style.display = 'none';
        panelVotacion.style.display = 'block';
    } else {
        vistaCooperativo.style.display = 'grid';
        vistaEnfrentamiento.style.display = 'none';
        document.getElementById('panel-central-coop').append(jugadoresPanel, chatPanel);
    }

    // ──────────────────────────────────────────
    // PANEL DE JUGADORES: TABS + LISTAS CON SCROLL
    // ──────────────────────────────────────────
    function buildPlayersPanel() {
        const panel = document.getElementById('jugadores-panel');
        panel.innerHTML = `
            <h3><i class="fas fa-users"></i> Jugadores</h3>
            <div class="players-tabs">
                <button class="tab-btn active" id="tab-amigos">
                    <i class="fas fa-heart"></i> Amigos
                </button>
                <button class="tab-btn" id="tab-ranking">
                    <i class="fas fa-trophy"></i> Ranking
                </button>
            </div>
            <div class="players-list-container" id="players-list-wrap">
                <!-- Tab amigos -->
                <div id="pane-amigos">
                    <ul id="lista-amigos"></ul>
                </div>
                <!-- Tab ranking -->
                <div id="pane-ranking" style="display:none;">
                    <ul id="lista-jugadores"></ul>
                </div>
            </div>
        `;

        document.getElementById('tab-amigos').addEventListener('click', () => switchTab('amigos'));
        document.getElementById('tab-ranking').addEventListener('click', () => switchTab('ranking'));
    }

    function switchTab(tab) {
        const tabAmigos   = document.getElementById('tab-amigos');
        const tabRanking  = document.getElementById('tab-ranking');
        const paneAmigos  = document.getElementById('pane-amigos');
        const paneRanking = document.getElementById('pane-ranking');

        if (tab === 'amigos') {
            tabAmigos.classList.add('active');
            tabRanking.classList.remove('active');
            paneAmigos.style.display = 'block';
            paneRanking.style.display = 'none';
        } else {
            tabRanking.classList.add('active');
            tabAmigos.classList.remove('active');
            paneRanking.style.display = 'block';
            paneAmigos.style.display = 'none';
        }
    }

    // ──────────────────────────────────────────
    // CARGAR AMIGOS DEL USUARIO
    // ──────────────────────────────────────────
    async function cargarAmigos() {
        const lista = document.getElementById('lista-amigos');
        if (!lista) return;

        try {
            const res = await fetch('/api/amistades/mis-amigos');
            const data = await res.json();
            const amigos = data.amigos || [];

            lista.innerHTML = '';

            if (amigos.length === 0) {
                lista.innerHTML = `
                    <div class="empty-list-msg">
                        <i class="fas fa-user-friends"></i>
                        Aún no tienes amigos.<br>¡Desafía a alguien!
                    </div>`;
                return;
            }

            amigos.forEach(amigo => {
                if (amigo.id_usuario === usuario.id_usuario) return;
                const li = document.createElement('li');
                li.className = 'fade-in';
                li.innerHTML = `
                    <div class="player-info">
                        <span class="player-name" title="${amigo.username}">
                            <i class="fas fa-circle" style="color:var(--success);font-size:.5rem;"></i>
                            ${amigo.username}
                        </span>
                        <span class="player-points">${amigo.puntos ?? 0} pts</span>
                    </div>
                    <div class="actions">
                        <button class="btn-invite" data-id="${amigo.id_usuario}" title="Invitar">🤝</button>
                        <button class="btn-challenge" data-id="${amigo.id_usuario}" title="Enfrentar">⚔️</button>
                    </div>`;
                lista.appendChild(li);
            });
        } catch (err) {
            console.error('Error al cargar amigos:', err);
        }
    }

    // ──────────────────────────────────────────
    // CARGAR RANKING GENERAL (por puntos)
    // ──────────────────────────────────────────
    async function cargarRanking() {
        const lista = document.getElementById('lista-jugadores');
        if (!lista) return;

        try {
            const res = await fetch('/jugadores');
            const jugadores = await res.json();

            lista.innerHTML = '';

            if (jugadores.length === 0) {
                lista.innerHTML = `
                    <div class="empty-list-msg">
                        <i class="fas fa-ghost"></i>
                        Sin jugadores activos.
                    </div>`;
                return;
            }

            jugadores.forEach((jugador, idx) => {
                if (jugador.id === usuario.id_usuario) return;

                const pos = idx + 1;
                let rankClass = '';
                if (pos === 1) rankClass = 'gold';
                else if (pos === 2) rankClass = 'silver';
                else if (pos === 3) rankClass = 'bronze';

                const li = document.createElement('li');
                li.className = 'fade-in';
                li.innerHTML = `
                    <div class="player-info">
                        <span class="player-rank ${rankClass}">${pos}</span>
                        <span class="player-name" title="${jugador.username}">${jugador.username}</span>
                        <span class="player-points">${jugador.puntos ?? 0} pts</span>
                    </div>
                    <div class="actions">
                        <button class="btn-invite" data-id="${jugador.id}" title="Invitar">🤝</button>
                        <button class="btn-challenge" data-id="${jugador.id}" title="Enfrentar">⚔️</button>
                    </div>`;
                lista.appendChild(li);
            });
        } catch (err) {
            console.error('Error al cargar ranking:', err);
        }
    }

    // Delegar click para ambas listas (amigos + ranking)
    document.getElementById('jugadores-panel').addEventListener('click', async (e) => {
        const target = e.target.closest('button');
        if (!target) return;
        const idJugador = target.dataset.id;
        if (!idJugador) return;

        try {
            if (target.classList.contains('btn-invite')) {
                const response = await fetch(`/invitar/${idJugador}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ salaId, juego: 'Ahorcado' })
                });
                const data = await response.json();
                alert(data.message || 'Error');

            } else if (target.classList.contains('btn-challenge')) {
                const response = await fetch(`/enfrentar/${idJugador}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ juego: 'Ahorcado' })
                });
                const data = await response.json();
                if (data.salaId && data.modo === 'enfrentamiento') {
                    alert('¡Desafío enviado! Serás redirigido a la sala de enfrentamiento.');
                    window.location.href = `/ahorcado/${data.salaId}?modo=enfrentamiento`;
                } else {
                    alert(data.message || 'Error al desafiar');
                }
            }
        } catch (error) {
            console.error('Error en acción de jugador:', error);
        }
    });

    // ──────────────────────────────────────────
    // HELPERS DE JUEGO
    // ──────────────────────────────────────────
    function crearTeclado(container, onLetraClick, isEnabled = true) {
        if (!container) return;
        container.innerHTML = "";
        "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ".split("").forEach(letra => {
            let btn = document.createElement("button");
            btn.textContent = letra;
            btn.disabled = !isEnabled;
            btn.onclick = () => onLetraClick(letra, btn);
            container.appendChild(btn);
        });
    }

    function actualizarTeclado(container, letrasUsadas) {
        if (!container) return;
        container.querySelectorAll('button').forEach(btn => {
            btn.disabled = letrasUsadas.includes(btn.textContent);
        });
    }

    function mostrarPalabra(div, palabraSecreta, letrasCorrectas) {
        if (!div || !palabraSecreta) return;
        const palabraMostrada = palabraSecreta
            .split('')
            .map(letra => {
                if (letra === ' ') return '  ';
                return letrasCorrectas.includes(letra) ? letra : '_';
            })
            .join(' ');
        div.textContent = palabraMostrada;
    }

    function dibujarAhorcado(ctx, errores) {
        if (!ctx) return;
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 4;
        if (errores >= 1)  { ctx.beginPath(); ctx.moveTo(10, 340); ctx.lineTo(290, 340); ctx.stroke(); }
        if (errores >= 2)  { ctx.beginPath(); ctx.moveTo(50, 340); ctx.lineTo(50, 20);   ctx.stroke(); }
        if (errores >= 3)  { ctx.beginPath(); ctx.moveTo(48, 20);  ctx.lineTo(250, 20);  ctx.stroke(); }
        if (errores >= 4)  { ctx.beginPath(); ctx.moveTo(250, 20); ctx.lineTo(250, 60);  ctx.stroke(); }
        if (errores >= 5)  { ctx.beginPath(); ctx.arc(250, 90, 30, 0, Math.PI * 2);      ctx.stroke(); }
        if (errores >= 6)  { ctx.beginPath(); ctx.moveTo(250, 120); ctx.lineTo(250, 220); ctx.stroke(); }
        if (errores >= 7)  { ctx.beginPath(); ctx.moveTo(250, 150); ctx.lineTo(200, 190); ctx.stroke(); }
        if (errores >= 8)  { ctx.beginPath(); ctx.moveTo(250, 150); ctx.lineTo(300, 190); ctx.stroke(); }
        if (errores >= 9)  { ctx.beginPath(); ctx.moveTo(250, 220); ctx.lineTo(200, 280); ctx.stroke(); }
        if (errores >= 10) { ctx.beginPath(); ctx.moveTo(250, 220); ctx.lineTo(300, 280); ctx.stroke(); }
    }

    async function fetchAndPopulateCategories(selectElement) {
        try {
            const response = await fetch('/ahorcado/materias');
            if (!response.ok) throw new Error('No se pudo obtener las materias.');
            const materias = await response.json();
            selectElement.innerHTML = '';
            if (materias.length === 0) {
                selectElement.innerHTML = '<option>No hay categorías disponibles</option>';
                return;
            }
            materias.forEach(materia => {
                const option = document.createElement('option');
                option.value = materia.id_materia;
                option.textContent = materia.descripcion;
                selectElement.appendChild(option);
            });
        } catch (error) {
            console.error("Error al cargar categorías:", error);
            selectElement.innerHTML = '<option>Error al cargar</option>';
        }
    }

    function unirseASala() {
        if (!salaId) return;
        if (modo === 'enfrentamiento') {
            socket.emit('joinConfrontation', { salaId, usuario: usuario.username, userId: usuario.id_usuario });
        } else {
            const idMateria = categoriaCoopSelect.value || 1;
            socket.emit('unirseSala', { salaId, usuario: usuario.username, idMateria });
        }
    }

    // ──────────────────────────────────────────
    // MODO COOPERATIVO
    // ──────────────────────────────────────────
    if (modo === 'cooperativo') {
        crearTeclado(tecladoCoopDiv, (letra, btn) => {
            socket.emit('intentarLetra', { salaId, letra });
            btn.disabled = true;
        });

        reiniciarCoopBtn.onclick = () => {
            socket.emit('reiniciarJuego', { salaId, idMateria: categoriaCoopSelect.value });
        };

        categoriaCoopSelect.onchange = () => {
            socket.emit('reiniciarJuego', { salaId, idMateria: categoriaCoopSelect.value });
        };

        socket.on('estadoPartida', (estado) => {
            if (!estado || !estado.palabraSecreta) return;
            dibujarAhorcado(ctxCoop, estado.letrasIncorrectas.length);
            mostrarPalabra(palabraCoopDiv, estado.palabraSecreta, estado.letrasCorrectas);
            incorrectasCoopDiv.textContent = `Incorrectas: ${estado.letrasIncorrectas.join(' ')}`;
            pistaCoopDiv.textContent = `Pista: ${estado.pista || 'Sin pista'}`;
            actualizarTeclado(tecladoCoopDiv, [...estado.letrasCorrectas, ...estado.letrasIncorrectas]);
            if (estado.letrasIncorrectas.length >= MAX_ERRORES) {
                tecladoCoopDiv.querySelectorAll('button').forEach(btn => btn.disabled = true);
            }
        });

        socket.on('juegoTerminado', (resultado) => {
            tecladoCoopDiv.innerHTML = "<h3>Juego Terminado</h3>";
            setTimeout(() => {
                const mensaje = resultado.ganador
                    ? `¡Ganaron! 🎉 La palabra era: ${resultado.palabra}`
                    : `Perdieron 😢 La palabra era: ${resultado.palabra}`;
                alert(mensaje);
            }, 200);
        });
    }

    // ──────────────────────────────────────────
    // MODO ENFRENTAMIENTO
    // ──────────────────────────────────────────
    if (modo === 'enfrentamiento') {
        crearTeclado(tecladoLocalDiv, (letra, btn) => {
            socket.emit('enfrentamiento:intentarLetra', { salaId, letra });
            btn.disabled = true;
        });
        crearTeclado(tecladoOponenteDiv, () => {}, false);

        function startTimer(initialTime) {
            if (timerInterval) clearInterval(timerInterval);
            let timeLeft = initialTime;
            timerInterval = setInterval(() => {
                timeLeft--;
                if (timeLeft < 0) { clearInterval(timerInterval); return; }
                const minutes = Math.floor(timeLeft / 60).toString().padStart(2, '0');
                const seconds = (timeLeft % 60).toString().padStart(2, '0');
                timerEl.textContent = `${minutes}:${seconds}`;
            }, 1000);
        }

        socket.on('confrontationUpdate', ({ gameState, gameStarted }) => {
            if (!gameState || !gameStarted) {
                palabraLocalDiv.textContent = "Esperando oponente...";
                return;
            }
            panelVotacion.style.display = 'none';
            document.querySelectorAll('.game-enfrentamiento').forEach(el => el.style.visibility = 'visible');
            document.querySelector('.timer-container').style.display = 'block';
            if (gameStarted && !timerInterval) startTimer(gameState.gameTime);

            const localPlayer    = gameState.player1.id === usuario.id_usuario ? gameState.player1 : gameState.player2;
            const opponentPlayer = gameState.player1.id === usuario.id_usuario ? gameState.player2 : gameState.player1;

            nombreOponenteEl.textContent = opponentPlayer ? opponentPlayer.username : "Esperando...";

            const erroresLocal = localPlayer.letrasIncorrectas.length;
            dibujarAhorcado(ctxLocal, erroresLocal);
            if (pistaLocalDiv) pistaLocalDiv.textContent = `Pista: ${localPlayer.pista}`;
            mostrarPalabra(palabraLocalDiv, localPlayer.palabraSecreta, localPlayer.letrasCorrectas);
            incorrectasLocalDiv.textContent = `Intentos restantes: ${MAX_ERRORES - erroresLocal}`;
            actualizarTeclado(tecladoLocalDiv, [...localPlayer.letrasCorrectas, ...localPlayer.letrasIncorrectas]);
            if (erroresLocal >= MAX_ERRORES) tecladoLocalDiv.querySelectorAll('button').forEach(btn => btn.disabled = true);

            if (opponentPlayer) {
                const erroresOponente = opponentPlayer.letrasIncorrectas.length;
                dibujarAhorcado(ctxOponente, erroresOponente);
                mostrarPalabra(palabraOponenteDiv, opponentPlayer.palabraSecreta, opponentPlayer.letrasCorrectas);
                incorrectasOponenteDiv.textContent = `Intentos restantes: ${MAX_ERRORES - erroresOponente}`;
                actualizarTeclado(tecladoOponenteDiv, [...opponentPlayer.letrasCorrectas, ...opponentPlayer.letrasIncorrectas]);
            }
        });

        socket.on('enfrentamiento:esperandoOponente', () => {
            panelVotacion.style.display = 'block';
            propuestaActualDiv.innerHTML = `<p>Esperando a tu oponente...</p>`;
            areaProponerDiv.style.display = 'none';
            areaVotarDiv.style.display = 'none';
        });

        socket.on('enfrentamiento:iniciarVotacion', () => {
            panelVotacion.style.display = 'block';
            propuestaActualDiv.innerHTML = `<p>¡Oponente conectado! Por favor, propone una categoría.</p>`;
            areaProponerDiv.style.display = 'block';
            areaVotarDiv.style.display = 'none';
        });

        socket.on('enfrentamiento:nuevaPropuesta', ({ proponente, textoMateria }) => {
            panelVotacion.style.display = 'block';
            propuestaActualDiv.innerHTML = `<p><strong>${proponente}</strong> ha propuesto: <strong>${textoMateria}</strong></p>`;
            areaProponerDiv.style.display = 'none';
            if (proponente !== usuario.username) areaVotarDiv.style.display = 'block';
        });

        socket.on('enfrentamiento:propuestaRechazada', ({ votante }) => {
            alert(`${votante} ha rechazado la propuesta. ¡Vuelvan a proponer!`);
            propuestaActualDiv.innerHTML = `<p>Propuesta rechazada. Esperando nueva propuesta...</p>`;
            areaVotarDiv.style.display = 'none';
        });

        proponerBtn.onclick = () => {
            const select = categoriaEnfrentamientoSelect;
            const idMateria = select.value;
            const textoMateria = select.options[select.selectedIndex].text;
            socket.emit('enfrentamiento:proponerCategoria', { salaId, idMateria, textoMateria });
            propuestaActualDiv.innerHTML = `<p>Has propuesto: <strong>${textoMateria}</strong>. Esperando respuesta...</p>`;
            areaProponerDiv.style.display = 'none';
        };

        aceptarBtn.onclick  = () => { socket.emit('enfrentamiento:votarCategoria', { salaId, voto: 'aceptado' });  areaVotarDiv.style.display = 'none'; };
        rechazarBtn.onclick = () => { socket.emit('enfrentamiento:votarCategoria', { salaId, voto: 'rechazado' }); areaVotarDiv.style.display = 'none'; };

        socket.on('gameOver', ({ winner }) => {
            if (timerInterval) clearInterval(timerInterval);
            tecladoLocalDiv.innerHTML = "<h3>Partida Terminada</h3>";
            tecladoOponenteDiv.innerHTML = "";
            let mensaje = "¡Ha sido un empate! 🤝";
            if (winner) mensaje = winner === usuario.id_usuario ? '¡Ganaste la partida! 🏆' : '¡Perdiste la partida! 😔';
            setTimeout(() => alert(mensaje), 500);
        });
    }

    // ──────────────────────────────────────────
    // CHAT
    // ──────────────────────────────────────────
    function mostrarMensaje(user, msg) {
        const msgDiv = document.createElement('div');
        msgDiv.innerHTML = `<span class="u">${user}:</span> <span>${msg}</span>`;
        chatBox.appendChild(msgDiv);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    function enviarMensaje() {
        const mensaje = chatInput.value.trim();
        if (mensaje && salaId) {
            socket.emit('mensajeChat', { salaId, mensaje, usuario: usuario.username });
            chatInput.value = '';
        }
    }

    chatBtn.addEventListener('click', enviarMensaje);
    chatInput.addEventListener('keypress', (e) => e.key === 'Enter' && enviarMensaje());
    socket.on('nuevoMensaje', (data) => {
        if (data.usuario && data.mensaje) mostrarMensaje(data.usuario, data.mensaje);
    });

    // ──────────────────────────────────────────
    // ERRORES DE SOCKET
    // ──────────────────────────────────────────
    socket.on('error', (error) => {
        console.error('Error del servidor:', error);
        alert(error.mensaje || 'Ha ocurrido un error');
    });

    // ──────────────────────────────────────────
    // INICIALIZACIÓN
    // ──────────────────────────────────────────
    buildPlayersPanel();

    if (modo === 'cooperativo') {
        fetchAndPopulateCategories(categoriaCoopSelect).then(() => unirseASala());
    } else {
        fetchAndPopulateCategories(categoriaEnfrentamientoSelect);
        unirseASala();
    }

    // Carga inicial de ambas listas
    cargarAmigos();
    cargarRanking();

    // Refresco periódico
    setInterval(() => { cargarAmigos(); cargarRanking(); }, 20000);

    // ──────────────────────────────────────────
    // TEMA OSCURO/CLARO
    // ──────────────────────────────────────────
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        const currentTheme = localStorage.getItem('theme') || 'light';
        if (currentTheme === 'dark') {
            document.body.setAttribute('data-theme', 'dark');
            themeToggle.checked = true;
        }
        themeToggle.addEventListener('change', function () {
            if (this.checked) {
                document.body.setAttribute('data-theme', 'dark');
                localStorage.setItem('theme', 'dark');
            } else {
                document.body.removeAttribute('data-theme');
                localStorage.setItem('theme', 'light');
            }
        });
    }
});