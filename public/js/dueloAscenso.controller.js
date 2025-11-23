// Variable "user" enviada desde el servidor
const user = window.SALA_CONFIG.user;

console.log('===== DEBUG BOTONES DESAFIAR =====');
console.log('Usuario cargado:', user);
console.log('ID Carrera del usuario:', user.id_carrera);
console.log('==================================');

// Contenedor principal del ranking
const rankingGlobalContainer = document.getElementById('rankingGlobalContainer');

function renderizarRanking(container, jugadores) {
    // Guardar el header para mantenerlo
    const header = container.querySelector('.ranking-header');
    container.innerHTML = ''; // Limpiar contenedor
    if (header) {
        container.appendChild(header); // Volver a agregar el header
    }

    // Si no hay jugadores
    if (!jugadores || jugadores.length === 0) {
        container.innerHTML += '<p>No hay jugadores en este ranking.</p>';
        return;
    }

    // Ordenar jugadores por puntos descendente
    jugadores.sort((a, b) => b.puntos - a.puntos);

    // Encontrar la posición del usuario actual
    const miIndex = jugadores.findIndex(j => j.id_usuario === user.id_usuario);
    const miCarrera = user.id_carrera;

    console.log('===== DEBUG RENDERIZADO =====');
    console.log('Mi índice en ranking:', miIndex);
    console.log('Mi carrera:', miCarrera);
    console.log('Mi carrera (tipo):', typeof miCarrera);
    console.log('Total jugadores:', jugadores.length);
    
    if (miIndex === -1) {
        console.warn('⚠️ PROBLEMA: No estoy en el ranking!');
        console.warn('Mi ID de usuario:', user.id_usuario);
        console.warn('IDs en el ranking:', jugadores.map(j => j.id_usuario));
        
        // Mostrar mensaje de advertencia en la interfaz
        const warningDiv = document.createElement('div');
        warningDiv.className = 'warning-message';
        warningDiv.style.cssText = 'background: #fef3c7; border: 2px solid #f59e0b; padding: 15px; margin: 10px 0; border-radius: 8px; color: #92400e;';
        warningDiv.innerHTML = `
            <strong>⚠️ Aviso:</strong> No apareces en el ranking. 
            Esto puede deberse a que aún no has completado ningún duelo o hay un problema con tu perfil.
        `;
        container.appendChild(warningDiv);
    }

    // Crear los elementos HTML para cada jugador
    jugadores.forEach((jugador, i) => {
        const esYo = jugador.id_usuario === user.id_usuario;
        
        // CORRECCIÓN: Convertir a números para comparación estricta
        const jugadorCarrera = jugador.id_carrera ? parseInt(jugador.id_carrera) : null;
        const mismaCarrera = miCarrera && jugadorCarrera && (jugadorCarrera === parseInt(miCarrera));
        const puedoDesafiar = i < miIndex && mismaCarrera;

        // Debug para cada jugador
        if (i < 5 || esYo) { // Mostrar info de los primeros 5 y del usuario actual
            console.log(`Jugador #${i + 1}:`, {
                username: jugador.username,
                id_usuario: jugador.id_usuario,
                id_carrera: jugadorCarrera,
                id_carrera_raw: jugador.id_carrera,
                mi_carrera: miCarrera,
                esYo,
                mismaCarrera,
                puedoDesafiar,
                posicionSuperior: i < miIndex,
                miIndex: miIndex
            });
        }

        const item = document.createElement('div');
        item.className = esYo ? 'ranking-item ranking-item-current' : 'ranking-item';

        item.innerHTML = `
            <img src="${jugador.foto_perfil || '/uploads/default_avatar.png'}" 
            alt="Avatar de ${jugador.username}" 
            class="player-avatar"
            onerror="handleImageError(this)">

            <div class="player-info">
                <div class="player-name">${jugador.username} ${esYo ? '(Tú)' : ''}</div>
                <div class="player-stats">
                    <span class="stat-item">📊 Posición #${i + 1}</span>
                </div>
            </div>
            <div class="score-display">${jugador.puntos} pts</div>
            ${puedoDesafiar ? `
                <div class="challenge-actions">
                    <button class="challenge-btn" data-id="${jugador.id_usuario}">Desafiar</button>
                </div>
            ` : ''}
            ${!miCarrera && !esYo ? `
                <div class="challenge-actions">
                    <span class="no-challenge-reason">Debes tener una carrera asignada</span>
                </div>
            ` : ''}
            ${miCarrera && !mismaCarrera && i < miIndex && !esYo ? `
                <div class="challenge-actions">
                    <span class="no-challenge-reason">Diferente carrera</span>
                </div>
            ` : ''}
        `;
        container.appendChild(item);
    });

    console.log('===============================');
}

async function cargarRankingGlobal() {
    try {
        const response = await fetch('/api/ranking/global');
        if (!response.ok) {
            throw new Error('Error al cargar ranking');
        }
        const jugadores = await response.json();
        
        console.log('===== JUGADORES RECIBIDOS EN FRONTEND =====');
        console.log('Total:', jugadores.length);
        console.log('Usuario actual:', user);
        console.log('\n--- Primeros 5 jugadores ---');
        jugadores.slice(0, 5).forEach((j, idx) => {
            console.log(`${idx + 1}. ${j.username}:`);
            console.log(`   ID: ${j.id_usuario}, Carrera: ${j.id_carrera} (tipo: ${typeof j.id_carrera})`);
        });
        
        // Verificar si el usuario actual está en la lista
        const yoEnLista = jugadores.find(j => j.id_usuario === user.id_usuario);
        if (yoEnLista) {
            console.log('\n✅ Usuario actual encontrado en ranking:');
            console.log('   Mi carrera:', user.id_carrera, '(tipo:', typeof user.id_carrera, ')');
            console.log('   Mi carrera en ranking:', yoEnLista.id_carrera, '(tipo:', typeof yoEnLista.id_carrera, ')');
        } else {
            console.warn('⚠️ Usuario actual NO encontrado en el ranking');
        }
        console.log('==========================================\n');
        
        renderizarRanking(rankingGlobalContainer, jugadores);
    } catch (error) {
        console.error('Error cargando ranking:', error);
        rankingGlobalContainer.innerHTML += '<p class="error-message">Error al cargar el ranking. Recarga la página.</p>';
    }
}

// Evento global para capturar clicks en botones de "Desafiar"
document.addEventListener('click', async (e) => {
    if (e.target && e.target.classList.contains('challenge-btn') && e.target.dataset.id) {
        const idOponente = e.target.dataset.id;
        const tiempoLimite = 2 * 24 * 60 * 60; // 2 días en segundos

        e.target.disabled = true;
        e.target.textContent = 'Enviando...';

        try {
            // Enviar solicitud al servidor para desafiar al jugador
            const res = await fetch(`/desafiar/duelo/${idOponente}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tiempoLimite })
            });
            const data = await res.json();
            console.log("Respuesta del servidor:", data);

            if (res.ok) {
                e.target.textContent = '✓ Enviado';
                e.target.style.backgroundColor = '#10b981';
                setTimeout(() => {
                    e.target.textContent = 'Desafiar';
                    e.target.disabled = false;
                    e.target.style.backgroundColor = '';
                }, 3000);
            } else {
                throw new Error(data.message || 'Error al enviar desafío');
            }
        } catch (error) {
            console.error("Error al enviar desafío:", error);
            e.target.disabled = false;
            e.target.textContent = 'Desafiar';
            alert('Error al enviar el desafío: ' + error.message);
        }
    }
});

// Cargar ranking al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    cargarRankingGlobal();
});