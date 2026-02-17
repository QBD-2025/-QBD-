// ==================== CONFIGURACIÓN INICIAL ====================
const ROWS = 14;
const COLS = 14;
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const MAX_ERRORS = 4;
let WORDS = [];

// Variables de estado del juego
let grid = [];
let cellEls = [];
let foundWords = new Set();
let errors = 0;
let isDragging = false;
let start = null;
let dir = null;
let dragPath = [];
let myCellEls = [];
let confrontationMode = false;

// Variables para el modo enfrentamiento
let confrontationData = null;
let timerInterval = null;

// ===== ELEMENTOS DEL DOM - MODO NORMAL =====
const boardEl       = document.getElementById('board');
const cluesEl       = document.getElementById('clues');
const errorsBadge   = document.getElementById('errorsBadge');
const gameMessage   = document.getElementById('gameMessage');
const btnClear      = document.getElementById('btnClear');
const btnRestart    = document.getElementById('btnRestart');
const totalWords    = document.getElementById('totalWords');
const progressText  = document.getElementById('progressText');
const categoriaSelect = document.getElementById('categoria-select');

// ===== ELEMENTOS DEL DOM - MODO ENFRENTAMIENTO =====
const normalModeEl         = document.getElementById('normal-mode');
const confrontationModeEl  = document.getElementById('confrontation-mode');
const timerEl              = document.getElementById('confrontation-timer');
const confrontationMessageEl = document.getElementById('confrontation-message');
const resultsScreenEl      = document.getElementById('results-screen');

// ===== ELEMENTOS DEL PANEL DE VOTACIÓN =====
const votingPanel                  = document.getElementById('voting-panel');
const propuestaActualDiv           = document.getElementById('propuesta-actual');
const areaProponerDiv              = document.getElementById('area-proponer');
const areaVotarDiv                 = document.getElementById('area-votar');
const confrontationCategoriaSelect = document.getElementById('confrontation-categoria-select');
const proposeCategoryBtn           = document.getElementById('propose-category-btn');
const aceptarCategoriaBtn          = document.getElementById('aceptar-categoria-btn');
const rechazarCategoriaBtn         = document.getElementById('rechazar-categoria-btn');

// ===== ELEMENTOS DE REVANCHA =====
const rematchControls = document.getElementById('rematch-controls');
const rematchBtn      = document.getElementById('rematch-btn');
const rematchStatus   = document.getElementById('rematch-status');
const backToLobbyBtn  = document.getElementById('back-to-lobby-btn');

// ==================== SISTEMA DE CHAT Y SALA ====================
const socket    = io();
const salaId    = "{{salaId}}";
const usuario   = window.USER_DATA;
const chatBox   = document.getElementById('chatBox');
const chatInput = document.getElementById('chatInput');
const chatBtn   = document.getElementById('chatBtn');

function mostrarMensaje(user, msg) {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'msg';
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

// ==================== PANEL DE JUGADORES: AMIGOS & RANKING ====================

// ─── Estado del panel ─────────────────────────
let rankingOffset   = 0;
const RANKING_LIMIT = 15;
let rankingCargando = false;
let rankingHayMas   = true;
let rankingCargado  = false;   // ← bandera: ¿se cargó alguna vez con éxito?

// ─── Tabs ──────────────────────────────────────
const tabBtns     = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const tabId = btn.dataset.tab;

        tabBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));

        btn.classList.add('active');
        document.getElementById(`tab-${tabId}`).classList.add('active');

        // Cargar ranking si aún no se cargó (o si falló antes)
        if (tabId === 'ranking' && !rankingCargado) {
            cargarRanking(true);
        }
    });
});

// ─── Lista de amigos ───────────────────────────
async function cargarAmigos() {
    const listaEl = document.getElementById('lista-amigos');
    const countEl = document.getElementById('amigos-count');

    try {
        const res    = await fetch('/jugadoresa/amigos');
        const data   = await res.json();
        const amigos = data.amigos || [];

        countEl.textContent = amigos.length;

        if (amigos.length === 0) {
            listaEl.innerHTML = `
                <li class="empty-state">
                    <span>👥</span>
                    <p>Aún no tienes amigos agregados.<br>¡Busca jugadores para desafiar!</p>
                </li>
            `;
            return;
        }

        listaEl.innerHTML = '';
        amigos.forEach(amigo => {
            const li = crearItemJugador(amigo, {
                esAmigo: true,
                mostrarPuntos: true,
                acciones: ['invite', 'challenge']
            });
            listaEl.appendChild(li);
        });

    } catch (err) {
        console.error('❌ [AMIGOS] Error al cargar:', err);
        listaEl.innerHTML = `<li class="empty-state"><span>⚠️</span><p>Error al cargar amigos</p></li>`;
    }
}

// ─── Ranking global ────────────────────────────
async function cargarRanking(reset = false) {
    if (rankingCargando) return;
    if (!rankingHayMas && !reset) return;

    if (reset) {
        rankingOffset = 0;
        rankingHayMas = true;
    }

    rankingCargando = true;
    const listaEl  = document.getElementById('lista-ranking');
    const countEl  = document.getElementById('ranking-count');

    if (reset) {
        listaEl.innerHTML = `
            <li class="skeleton-item"></li>
            <li class="skeleton-item"></li>
            <li class="skeleton-item"></li>
        `;
    }

    try {
        const res  = await fetch(`/jugadoresa/ranking?limit=${RANKING_LIMIT}&offset=${rankingOffset}`);
        const data = await res.json();
        const { jugadores = [], meta = {} } = data;

        rankingHayMas  = meta.has_more ?? false;
        rankingOffset += jugadores.length;
        rankingCargado  = true; // éxito: no recargar al volver a la tab

        if (reset) {
            listaEl.innerHTML = '';
            // Quitar banner previo si existe
            const bannerViejo = listaEl.parentElement.querySelector('.mi-posicion-banner');
            if (bannerViejo) bannerViejo.remove();
            // Banner "Tu posición" si no apareces en el top visible
            const miPos = meta.mi_posicion ?? 0;
            if (miPos > jugadores.length) {
                const banner = document.createElement('div');
                banner.className = 'mi-posicion-banner';
                banner.innerHTML = `Tu posición global: <strong>#${miPos}</strong>`;
                listaEl.parentElement.insertBefore(banner, listaEl);
            }
        } else {
            listaEl.querySelectorAll('.skeleton-item').forEach(el => el.remove());
        }

        countEl.textContent = meta.total ? `${meta.total} total` : jugadores.length;

        jugadores.forEach((jugador, idx) => {
            const posGlobal = rankingOffset - jugadores.length + idx + 1;
            listaEl.appendChild(crearItemRanking(jugador, posGlobal));
        });

        // Botón "Ver más"
        const btnExistente = listaEl.querySelector('.load-more-btn');
        if (btnExistente) btnExistente.remove();

        if (rankingHayMas) {
            const btnMas = document.createElement('li');
            btnMas.className = 'load-more-btn';
            btnMas.innerHTML = `<button onclick="cargarRanking(false)">Ver más jugadores ↓</button>`;
            listaEl.appendChild(btnMas);
        }

    } catch (err) {
        console.error('❌ [RANKING] Error al cargar:', err);
        rankingCargado = false; // falló: permitir reintento al volver a la tab
        if (reset) {
            listaEl.innerHTML = `<li class="empty-state"><span>⚠️</span><p>Error al cargar el ranking.<br><button onclick="cargarRanking(true)" style="margin-top:8px;padding:4px 12px;border:none;border-radius:6px;cursor:pointer;background:var(--primary);color:white;font-size:12px;">Reintentar</button></p></li>`;
        }
    } finally {
        rankingCargando = false;
    }
}

// ─── Crear ítem de jugador (amigos) ────────────
function crearItemJugador(jugador, opciones = {}) {
    const { esAmigo = false, mostrarPuntos = false, acciones = [] } = opciones;
    const li = document.createElement('li');
    li.className = 'jugador-item';
    li.dataset.id = jugador.id;

    const avatar = jugador.foto_perfil
        ? `<img src="${jugador.foto_perfil}" alt="${jugador.username}" class="avatar-img">`
        : `<div class="avatar-placeholder">${jugador.username[0].toUpperCase()}</div>`;

    const insigniaAmigo = esAmigo ? `<span class="tag tag-amigo">💜 Amigo</span>` : '';
    const puntosBadge   = mostrarPuntos
        ? `<span class="puntos-badge">⭐ ${jugador.puntos.toLocaleString()}</span>`
        : '';

    const botonesHtml = acciones.map(accion => {
        if (accion === 'invite')    return `<button class="btn-invite btn-sm"    data-id="${jugador.id}" title="Invitar a sala">🤝</button>`;
        if (accion === 'challenge') return `<button class="btn-challenge btn-sm" data-id="${jugador.id}" title="Desafiar">⚔️</button>`;
        return '';
    }).join('');

    li.innerHTML = `
        <div class="jugador-info">
            ${avatar}
            <div class="jugador-meta">
                <span class="jugador-nombre">${jugador.username}</span>
                <div class="jugador-tags">${insigniaAmigo}${puntosBadge}</div>
            </div>
        </div>
        <div class="jugador-acciones">${botonesHtml}</div>
    `;
    return li;
}

// ─── Crear ítem de ranking ─────────────────────
function crearItemRanking(jugador, posicion) {
    const li = document.createElement('li');
    li.className = `jugador-item ranking-item${jugador.soy_yo ? ' soy-yo' : ''}${jugador.es_amigo ? ' es-amigo' : ''}`;
    li.dataset.id = jugador.id;

    const medallas = { 1: '🥇', 2: '🥈', 3: '🥉' };
    const posIcono = medallas[posicion]
        ? `<span class="medalla">${medallas[posicion]}</span>`
        : `<span class="posicion-num">#${posicion}</span>`;

    const avatar = jugador.foto_perfil
        ? `<img src="${jugador.foto_perfil}" alt="${jugador.username}" class="avatar-img">`
        : `<div class="avatar-placeholder">${jugador.username[0].toUpperCase()}</div>`;

    const tagAmigo = (jugador.es_amigo && !jugador.soy_yo) ? `<span class="tag tag-amigo-xs">💜</span>` : '';
    const tagYo    = jugador.soy_yo ? `<span class="tag tag-yo">Tú</span>` : '';
    const accion   = !jugador.soy_yo
        ? `<button class="btn-challenge btn-sm" data-id="${jugador.id}" title="Desafiar">⚔️</button>`
        : '';

    li.innerHTML = `
        <div class="ranking-pos">${posIcono}</div>
        <div class="jugador-info">
            ${avatar}
            <div class="jugador-meta">
                <span class="jugador-nombre">${jugador.username} ${tagYo}${tagAmigo}</span>
                <span class="puntos-badge-sm">⭐ ${jugador.puntos.toLocaleString()} pts</span>
            </div>
        </div>
        <div class="jugador-acciones">${accion}</div>
    `;
    return li;
}

// ─── Delegación de clicks (invitar / desafiar) ─
document.getElementById('jugadores-panel').addEventListener('click', async (e) => {
    const btn = e.target.closest('.btn-invite, .btn-challenge');
    if (!btn) return;

    const idJugador = btn.dataset.id;
    if (!idJugador) return;

    try {
        if (btn.classList.contains('btn-invite')) {
            const response = await fetch(`/invitar/${idJugador}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ salaId, juego: 'Sopa' })
            });
            const data = await response.json();
            mostrarMensaje('Sistema', data.message || 'Invitación enviada');

        } else if (btn.classList.contains('btn-challenge')) {
            const response = await fetch(`/enfrentar/${idJugador}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ juego: 'Sopa' })
            });
            const data = await response.json();
            if (data.salaId) {
                mostrarMensaje('Sistema', '¡Desafío enviado! Redirigiendo...');
                setTimeout(() => {
                    window.location.href = `/sopa/${data.salaId}?modo=enfrentamiento`;
                }, 1500);
            } else {
                mostrarMensaje('Sistema', data.message || 'Error al desafiar');
            }
        }
    } catch (error) {
        console.error('Error en acción de jugador:', error);
        mostrarMensaje('Sistema', 'Error al procesar la solicitud');
    }
});

// ==================== LÓGICA DEL JUEGO ====================
const inBounds = (r, c) => r >= 0 && c >= 0 && r < ROWS && c < COLS;
const randInt  = n => Math.floor(Math.random() * n);

const directions = [
    { dr: 0,  dc: 1  }, { dr: 0,  dc: -1 },
    { dr: 1,  dc: 0  }, { dr: -1, dc: 0  },
    { dr: 1,  dc: 1  }, { dr: 1,  dc: -1 },
    { dr: -1, dc: 1  }, { dr: -1, dc: -1 },
];

function emptyGrid() {
    grid = Array.from({ length: ROWS }, () => Array(COLS).fill(""));
}

function canPlace(word, r, c, dr, dc) {
    for (let i = 0; i < word.length; i++) {
        const rr = r + dr * i, cc = c + dc * i;
        if (!inBounds(rr, cc)) return false;
        const cell = grid[rr][cc];
        if (cell !== "" && cell !== word[i]) return false;
    }
    return true;
}

function placeWord(word) {
    for (let t = 0; t < 300; t++) {
        const { dr, dc } = directions[randInt(directions.length)];
        const startR = randInt(ROWS), startC = randInt(COLS);
        if (canPlace(word, startR, startC, dr, dc)) {
            for (let i = 0; i < word.length; i++) {
                grid[startR + dr * i][startC + dc * i] = word[i];
            }
            return true;
        }
    }
    return false;
}

function fillRandom() {
    for (let r = 0; r < ROWS; r++)
        for (let c = 0; c < COLS; c++)
            if (grid[r][c] === "") grid[r][c] = ALPHABET[randInt(ALPHABET.length)];
}

function renderBoard(boardElement, gridData, isInteractive) {
    boardElement.innerHTML = "";
    const currentCellElements = Array.from({ length: ROWS }, () => Array(COLS));

    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const d = document.createElement('div');
            d.className = 'cell';
            d.textContent = gridData[r][c];
            d.dataset.r = r;
            d.dataset.c = c;

            if (isInteractive) {
                d.addEventListener('mousedown', (e) => { e.preventDefault(); startDrag(r, c); });
                d.addEventListener('mouseenter', () => continueDrag(r, c));
            }

            boardElement.appendChild(d);
            currentCellElements[r][c] = d;
        }
    }

    if (isInteractive) {
        myCellEls = currentCellElements;
        document.addEventListener('mouseup', endDrag);
        boardElement.addEventListener('dragstart', e => e.preventDefault());
    }
}

function renderClues() {
    cluesEl.innerHTML = "";
    WORDS.forEach(({ word, hint }) => {
        const li = document.createElement('li');
        li.id = `clue-${word}`;
        li.innerHTML = `<div class="word">${word}</div><div class="hint">${hint}</div>`;
        cluesEl.appendChild(li);
    });
    updateClues();
}

function updateClues() {
    WORDS.forEach(({ word }) => {
        const li = document.getElementById(`clue-${word}`);
        if (li) li.classList.toggle('done', foundWords.has(word));
    });
    progressText.innerHTML = `<strong>${foundWords.size}</strong>/<strong>${WORDS.length}</strong> palabras`;
}

function setErrors(n) {
    errors = n;
    errorsBadge.textContent = `${errors} / ${MAX_ERRORS}`;
    errorsBadge.style.background = errors ? '#fee2e2' : '';
}

function message(text, kind = '') {
    gameMessage.className = `message ${kind}`;
    gameMessage.textContent = text;
}

function clearPathVisual(path) {
    if (path) path.forEach(p => p.el.classList.remove('selected'));
}

function startDrag(r, c) {
    if (isDragging) return;
    isDragging = true;
    start = { r, c };
    dir = null;
    clearPathVisual(dragPath);
    dragPath = [];

    const el = myCellEls[r][c];
    if (el.classList.contains('found')) { isDragging = false; return; }
    el.classList.add('selected');
    dragPath.push({ r, c, el, letter: el.textContent });
    if (!confrontationMode) message("");
}

function continueDrag(r, c) {
    if (!isDragging || !start) return;

    const drRaw = r - start.r;
    const dcRaw = c - start.c;
    if (drRaw === 0 && dcRaw === 0) return;

    if (!dir) {
        dir = {
            dr: drRaw === 0 ? 0 : drRaw / Math.abs(drRaw),
            dc: dcRaw === 0 ? 0 : dcRaw / Math.abs(dcRaw),
        };
    }

    const expectedSteps = Math.max(
        dir.dr !== 0 ? Math.abs((r - start.r) / dir.dr) : 0,
        dir.dc !== 0 ? Math.abs((c - start.c) / dir.dc) : 0
    );

    if ((r - start.r) !== (expectedSteps * dir.dr) && (c - start.c) !== (expectedSteps * dir.dc)) {
        if (Math.abs(drRaw) !== Math.abs(dcRaw) && drRaw !== 0 && dcRaw !== 0) return;
    }

    const maxLen    = Math.max(...WORDS.map(w => w.word.length));
    const cappedLen = Math.min(expectedSteps + 1, maxLen);
    const newPath   = [];

    for (let i = 0; i < cappedLen; i++) {
        const rr = start.r + dir.dr * i;
        const cc = start.c + dir.dc * i;
        if (!inBounds(rr, cc)) break;
        const el = myCellEls[rr][cc];
        if (el.classList.contains('found')) break;
        newPath.push({ r: rr, c: cc, el, letter: el.textContent });
    }

    clearPathVisual(dragPath);
    dragPath = newPath;
    dragPath.forEach(p => p.el.classList.add('selected'));
}

function endDrag() {
    if (!isDragging) return;
    isDragging = false;
    validateDrag();
    start = null;
    dir   = null;
}

function validateDrag() {
    if (!dragPath || dragPath.length === 0) return;

    const text         = dragPath.map(p => p.letter).join("");
    const reversedText = [...text].reverse().join("");
    clearPathVisual(dragPath);

    const palabraEncontrada = WORDS.find(w => w.word === text || w.word === reversedText);

    if (palabraEncontrada) {
        if (!foundWords.has(palabraEncontrada.word)) {
            dragPath.forEach(p => p.el.classList.add('found'));

            if (confrontationMode) {
                socket.emit('sopa:palabraEncontradaEnfrentamiento', { salaId, usuario, palabra: palabraEncontrada.word });
            } else {
                foundWords.add(palabraEncontrada.word);
                updateClues();
                message(`¡Encontraste "${palabraEncontrada.word}"! 🎉`, 'win');
                if (foundWords.size === WORDS.length) {
                    message("🥳 ¡Ganaste! Has encontrado todas las palabras.", 'win');
                }
            }
        }
    } else {
        if (confrontationMode) {
            socket.emit('sopa:errorEnfrentamiento', { salaId, usuario });
            dragPath.forEach(p => p.el.classList.add('error'));
            setTimeout(() => dragPath.forEach(p => p.el.classList.remove('error')), 500);
        } else {
            setErrors(errors + 1);
            message(`❌ Selección incorrecta. Te quedan ${MAX_ERRORS - errors} intentos.`, 'lose');
            if (errors >= MAX_ERRORS) {
                message("💥 ¡Perdiste! Reiniciando la sopa…", 'lose');
                setTimeout(initGame, 1100);
            }
        }
    }

    dragPath = [];
}

// ==================== MODO ENFRENTAMIENTO ====================
function iniciarEnfrentamiento(data) {
    confrontationMode = true;
    confrontationData = data;

    normalModeEl.style.display = 'none';
    confrontationModeEl.style.display = 'block';
    document.querySelector('.confrontation-boards-container').style.display = 'grid';
    votingPanel.style.display = 'none';
    timerEl.style.display = 'block';

    WORDS = data.palabras;
    renderClues();

    const yoSoyPlayer1  = data.player1.id === usuario.id_usuario;
    const miData        = yoSoyPlayer1 ? data.player1 : data.player2;
    const oponenteData  = yoSoyPlayer1 ? data.player2 : data.player1;

    document.getElementById('my-name').textContent       = miData.username;
    document.getElementById('opponent-name').textContent = oponenteData.username;

    renderBoard(document.getElementById('my-board-grid'),       miData.tablero,       true);
    renderBoard(document.getElementById('opponent-board-grid'), oponenteData.tablero, false);

    document.getElementById('my-board').classList.add('my-turn');
    document.getElementById('opponent-board').classList.add('opponent-turn');

    confrontationMessageEl.textContent = "¡Que comience la partida!";
}

function mostrarResultados(data) {
    document.removeEventListener('mouseup', endDrag);
    resultsScreenEl.style.display = 'flex';

    document.getElementById('result-name1').textContent  = data.player1.username;
    document.getElementById('result-words1').textContent = data.player1.palabrasEncontradas.length;
    document.getElementById('result-errors1').textContent = data.player1.errores;
    document.getElementById('result-player1').classList.remove('winner');

    document.getElementById('result-name2').textContent  = data.player2.username;
    document.getElementById('result-words2').textContent = data.player2.palabrasEncontradas.length;
    document.getElementById('result-errors2').textContent = data.player2.errores;
    document.getElementById('result-player2').classList.remove('winner');

    document.getElementById('results-title').textContent = data.razon || "Resultados del Enfrentamiento";

    if (data.ganador) {
        const winEl = data.ganador.id === data.player1.id ? 'result-player1' : 'result-player2';
        document.getElementById(winEl).classList.add('winner');
    }
}

// ==================== SISTEMA DE VOTACIÓN DE CATEGORÍAS ====================

socket.on('sopa:esperandoOponente', () => {
    votingPanel.style.display = 'block';
    propuestaActualDiv.innerHTML = `<p>Esperando a tu oponente...</p>`;
    areaProponerDiv.style.display = 'none';
    areaVotarDiv.style.display    = 'none';
});

socket.on('sopa:iniciarVotacion', async () => {
    await cargarCategorias();
    confrontationCategoriaSelect.innerHTML = categoriaSelect.innerHTML;

    votingPanel.style.display = 'block';
    propuestaActualDiv.innerHTML = `<p>¡Oponente conectado! Por favor, propone una categoría.</p>`;
    areaProponerDiv.style.display = 'block';
    areaVotarDiv.style.display    = 'none';

    mostrarMensaje('Sistema', '¡Oponente conectado! Pueden proponer una categoría para jugar.');
});

proposeCategoryBtn.addEventListener('click', () => {
    const idMateria    = confrontationCategoriaSelect.value;
    const materiaTexto = confrontationCategoriaSelect.options[confrontationCategoriaSelect.selectedIndex].text;

    socket.emit('sopa:proponerCategoria', { salaId, idMateria, materiaTexto });
    propuestaActualDiv.innerHTML  = `<p>Has propuesto: <strong>${materiaTexto}</strong>. Esperando respuesta...</p>`;
    areaProponerDiv.style.display = 'none';
});

socket.on('sopa:nuevaPropuesta', ({ proponente, materiaTexto }) => {
    votingPanel.style.display = 'block';
    propuestaActualDiv.innerHTML  = `<p><strong>${proponente}</strong> ha propuesto: <strong>${materiaTexto}</strong></p>`;
    areaProponerDiv.style.display = 'none';
    areaVotarDiv.style.display    = proponente !== usuario.username ? 'flex' : 'none';
});

aceptarCategoriaBtn.addEventListener('click', () => {
    socket.emit('sopa:votarCategoria', { salaId, voto: 'aceptado' });
    areaVotarDiv.style.display   = 'none';
    propuestaActualDiv.innerHTML = `<p>Has aceptado la propuesta. Iniciando partida...</p>`;
});

rechazarCategoriaBtn.addEventListener('click', () => {
    socket.emit('sopa:votarCategoria', { salaId, voto: 'rechazado' });
    areaVotarDiv.style.display   = 'none';
    propuestaActualDiv.innerHTML = `<p>Has rechazado la propuesta.</p>`;
});

socket.on('sopa:propuestaRechazada', ({ votante }) => {
    mostrarMensaje('Sistema', `${votante} ha rechazado la propuesta. ¡Vuelvan a proponer!`);
    propuestaActualDiv.innerHTML  = `<p>Propuesta rechazada. Esperando nueva propuesta...</p>`;
    areaProponerDiv.style.display = 'block';
    areaVotarDiv.style.display    = 'none';
});

// ==================== CONTROL DEL JUEGO ====================
async function cargarCategorias() {
    try {
        const response = await fetch('/sopa/materias');
        if (!response.ok) throw new Error('No se pudieron cargar categorías');
        const materias = await response.json();

        categoriaSelect.innerHTML = '';
        materias.forEach(materia => {
            const option = document.createElement('option');
            option.value = materia.id_materia;
            option.textContent = materia.descripcion;
            categoriaSelect.appendChild(option);
        });
    } catch (error) {
        console.error("Error al cargar categorías:", error);
        categoriaSelect.innerHTML = '<option>Error al cargar categorías</option>';
    }
}

async function cargarPalabrasPorCategoria(idMateria) {
    try {
        const response = await fetch(`/sopa/palabras/${idMateria}`);
        if (!response.ok) throw new Error('Error al cargar palabras');
        return await response.json();
    } catch (error) {
        console.error("Error al cargar palabras:", error);
        return [];
    }
}

async function initGame() {
    const idMateria = categoriaSelect.value || 1;
    WORDS = await cargarPalabrasPorCategoria(idMateria);

    if (WORDS.length === 0) {
        WORDS = [
            { word: "ERROR", hint: "No se pudieron cargar palabras" },
            { word: "CARGA", hint: "Intenta recargar la página"     },
        ];
    }

    message("");
    setErrors(0);
    foundWords.clear();
    dragPath = [];
    start = null;
    dir   = null;
    totalWords.textContent = WORDS.length;

    for (let safety = 0; safety < 60; safety++) {
        emptyGrid();
        let ok = true;
        for (const { word } of WORDS) {
            if (!placeWord(word)) { ok = false; break; }
        }
        if (ok) break;
    }
    fillRandom();
    renderBoard(boardEl, grid, true);
    renderClues();
}

// ==================== SOCKET EVENT LISTENERS ====================

socket.on('sopa:mensajeSistema', (mensaje) => {
    confrontationMessageEl.textContent = mensaje;
});

socket.on('sopa:enfrentamientoIniciado', (data) => {
    if (!data?.player1 || !data?.player2 || !data?.palabras) {
        confrontationMessageEl.textContent = "Error al recibir datos del servidor.";
        return;
    }
    iniciarEnfrentamiento(data);
});

socket.on('sopa:tick', ({ tiempoRestante }) => {
    const m = Math.floor(tiempoRestante / 60);
    const s = tiempoRestante % 60;
    timerEl.textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
});

socket.on('sopa:actualizarEnfrentamiento', (data) => {
    const yoSoyPlayer1 = data.player1.id === usuario.id_usuario;
    const miData       = yoSoyPlayer1 ? data.player1 : data.player2;
    const oponenteData = yoSoyPlayer1 ? data.player2 : data.player1;

    document.getElementById('my-words').textContent       = miData.palabrasEncontradas.length;
    document.getElementById('my-errors').textContent      = miData.errores;
    document.getElementById('opponent-words').textContent = oponenteData.palabrasEncontradas.length;
    document.getElementById('opponent-errors').textContent = oponenteData.errores;

    foundWords = new Set(miData.palabrasEncontradas);
    updateClues();
});

socket.on('sopa:enfrentamientoFinalizado', (data) => {
    document.removeEventListener('mouseup', endDrag);

    document.getElementById('result-name1').textContent   = data.player1.username;
    document.getElementById('result-words1').textContent  = data.player1.palabrasEncontradas.length;
    document.getElementById('result-errors1').textContent = data.player1.errores;

    document.getElementById('result-name2').textContent   = data.player2.username;
    document.getElementById('result-words2').textContent  = data.player2.palabrasEncontradas.length;
    document.getElementById('result-errors2').textContent = data.player2.errores;

    if (data.ganador) {
        document.getElementById('results-title').textContent = `¡El ganador es ${data.ganador.username}!`;
        const winEl = data.ganador.id === data.player1.id ? 'result-player1' : 'result-player2';
        document.getElementById(winEl).classList.add('winner');
    } else {
        document.getElementById('results-title').textContent = "¡Es un empate!";
    }

    resultsScreenEl.style.display = 'flex';
});

socket.on('sopa:oponenteDesconectado', () => {
    document.removeEventListener('mouseup', endDrag);
    confrontationMessageEl.textContent = `Tu oponente se ha desconectado. ¡Has ganado!`;
    confrontationMessageEl.className   = 'message win';
});

// ==================== SISTEMA DE REVANCHA ====================

rematchBtn.addEventListener('click', () => {
    socket.emit('sopa:solicitarRevancha', { salaId, usuario });
    rematchControls.style.display = 'none';
    rematchStatus.style.display   = 'block';
    rematchStatus.textContent     = 'Solicitud de revancha enviada. Esperando al oponente...';
});

backToLobbyBtn.addEventListener('click', () => {
    window.location.href = '/minijuegos';
});

socket.on('sopa:revanchaSolicitada', ({ solicitante }) => {
    rematchControls.style.display = 'none';
    rematchStatus.style.display   = 'block';

    if (solicitante.id !== usuario.id_usuario) {
        rematchStatus.innerHTML = `
            <span>${solicitante.username} quiere la revancha. ¿Aceptas?</span>
            <div style="margin-top:10px; display:flex; gap:10px; justify-content:center;">
                <button id="accept-rematch-btn" class="primary">Aceptar</button>
                <button id="reject-rematch-btn">Rechazar</button>
            </div>
        `;
    }
});

resultsScreenEl.addEventListener('click', (e) => {
    if (e.target.id === 'accept-rematch-btn') {
        socket.emit('sopa:responderRevancha', { salaId, respuesta: 'aceptada' });
        rematchStatus.textContent = '¡Revancha aceptada! Reiniciando...';
    }
    if (e.target.id === 'reject-rematch-btn') {
        socket.emit('sopa:responderRevancha', { salaId, respuesta: 'rechazada' });
        rematchStatus.textContent = 'Has rechazado la revancha.';
    }
});

socket.on('sopa:revanchaRechazada', () => {
    rematchStatus.textContent = 'Tu oponente ha rechazado la revancha.';
    setTimeout(() => {
        rematchControls.style.display = 'flex';
        rematchStatus.style.display   = 'none';
    }, 3000);
});

socket.on('sopa:reiniciarParaVotacion', () => {
    resultsScreenEl.style.display = 'none';
    rematchControls.style.display = 'flex';
    rematchStatus.style.display   = 'none';

    document.querySelector('.confrontation-boards-container').style.display = 'none';
    timerEl.style.display = 'none';
    confrontationMessageEl.textContent = "";
});

// ==================== INICIALIZACIÓN ====================
document.addEventListener('DOMContentLoaded', async () => {
    const urlParams       = new URLSearchParams(window.location.search);
    const esEnfrentamiento = urlParams.get('modo') === 'enfrentamiento';
    const idMateria       = urlParams.get('materia') || 1;

    // Unirse al chat (siempre)
    socket.emit('chat:unirse', { salaId, usuario: usuario.username });
    mostrarMensaje('Sistema', `¡Bienvenido, ${usuario.username}!`);

    if (esEnfrentamiento) {
        // ── MODO ENFRENTAMIENTO ──
        confrontationMode = true;
        normalModeEl.style.display        = 'none';
        confrontationModeEl.style.display = 'block';

        const panelJugadores = document.getElementById('jugadores-panel');
        if (panelJugadores) panelJugadores.style.display = 'none';

        confrontationMessageEl.textContent = "Buscando oponente...";
        socket.emit('sopa:unirseEnfrentamiento', { salaId, usuario });

    } else {
        // ── MODO INDIVIDUAL ──
        confrontationMode = false;
        await cargarCategorias();
        await initGame();

        // Cargar amigos al entrar y refrescar cada 20 s
        cargarAmigos();
        setInterval(cargarAmigos, 20000);

        btnClear.addEventListener('click', () => { clearPathVisual(dragPath); dragPath = []; });
        btnRestart.addEventListener('click', initGame);
        categoriaSelect.addEventListener('change', initGame);

        socket.emit('sopa:unirseIndividual', { salaId, usuario, idMateria });
    }
});