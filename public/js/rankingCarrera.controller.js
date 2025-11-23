// ============================================
//   VARIABLES GLOBALES
// ============================================

// Usuario pasado desde el servidor
const user = window.DATA_USER;
const rankingCarreraContainer = document.getElementById('rankingCarreraContainer');

// DEBUG INFORMACIÓN DEL USUARIO
console.log('=== DEBUG USUARIO ===');
console.log('Usuario completo:', user);
console.log('ID Carrera:', user.id_carrera);
console.log('Carrera descripción:', user.carrera_descripcion);
console.log('===================');


// ============================================
//   FUNCIÓN PARA RENDERIZAR EL RANKING
// ============================================
function renderizarRanking(jugadores) {
    const loadingMsg = document.getElementById('loadingMessage');
    if (loadingMsg) loadingMsg.remove();

    if (!jugadores || jugadores.length === 0) {
        const noData = document.createElement('p');
        noData.textContent = 'No hay jugadores en este ranking.';
        noData.style.textAlign = 'center';
        noData.style.padding = '20px';
        rankingCarreraContainer.appendChild(noData);
        return;
    }

    // Ordenar por puntos
    jugadores.sort((a, b) => b.puntos - a.puntos);

    // Encontrar la posición del usuario actual
    const miIndex = jugadores.findIndex(j => j.id_usuario === user.id_usuario);

    jugadores.forEach((jugador, i) => {
        const item = document.createElement('div');
        item.classList.add('ranking-item');

        const esYo = jugador.id_usuario === user.id_usuario;
        if (esYo) item.classList.add('current-user');

        // Reglas para mostrar botón de desafiar:
        const mostrarBotonDesafiar = !esYo && i < miIndex;

        item.innerHTML = `
            <img src="${jugador.foto_perfil || '/uploads/default_avatar.png'}" 
                alt="Avatar de ${jugador.username}" 
                class="player-avatar"
                onerror="this.src='/uploads/default_avatar.png'">
            
            <div class="player-info">
                <div class="player-name">
                    ${jugador.username} 
                    ${esYo ? '<span class="badge-yo">(Tú)</span>' : ''}
                </div>

                <div class="player-stats">
                    <span class="stat-item">📊 Posición #${i + 1}</span>
                </div>
            </div>

            <div class="score-display">${jugador.puntos} pts</div>

            ${mostrarBotonDesafiar 
                ? `<button class="btn-desafiar" data-id="${jugador.id_usuario}">Desafiar ⚔️</button>` 
                : ''}
        `;

        rankingCarreraContainer.appendChild(item);
    });
}



// ============================================
//   FUNCIÓN PARA CARGAR EL RANKING
// ============================================
async function cargarRankingCarrera() {
    try {
        console.log('Verificando usuario...');

        if (!user) throw new Error('No hay información del usuario');

        if (!user.id_carrera) {
            console.error('❌ Usuario sin carrera:', user);
            rankingCarreraContainer.innerHTML += `
                <div style="color: red; text-align: center; padding: 20px;">
                    <h3>No tienes carrera asignada</h3>
                    <p>Usuario ID: ${user.id_usuario}</p>
                    <p>Username: ${user.username}</p>
                    <p>Por favor, contacta al administrador.</p>
                </div>
            `;
            return;
        }

        console.log('Cargando ranking para carrera ID:', user.id_carrera);

        const res = await fetch(`/api/ranking/carrera/${user.id_carrera}`);

        if (!res.ok) {
            const errorText = await res.text();
            console.error('❌ Error del servidor:', errorText);
            throw new Error(`Error ${res.status}: ${errorText}`);
        }

        const jugadores = await res.json();
        console.log('Jugadores recibidos:', jugadores.length);

        renderizarRanking(jugadores);

    } catch (error) {
        console.error('❌ Error al cargar ranking:', error);

        const errorMsg = document.createElement('div');
        errorMsg.style.color = 'red';
        errorMsg.style.textAlign = 'center';
        errorMsg.style.padding = '20px';
        errorMsg.innerHTML = `
            <h3>Error al cargar el ranking</h3>
            <p>${error.message}</p>
        `;
        rankingCarreraContainer.appendChild(errorMsg);
    }
}



// ============================================
//   LISTENER PARA BOTONES DE DESAFIAR
// ============================================
document.addEventListener('click', async (e) => {

    if (e.target && e.target.classList.contains('btn-desafiar')) {

        const idOponente = e.target.dataset.id;
        const boton = e.target;

        // Evitar enviar más de un desafío al mismo jugador
        if (boton.dataset.sent === "true") return;

        // Cambios visuales iniciales
        boton.disabled = true;
        boton.textContent = 'Enviando...';
        boton.style.opacity = "0.7";

        try {
            const res = await fetch(`/desafiar/duelo/${idOponente}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tiempoLimite: 2 * 24 * 60 * 60 }) // 2 días
            });

            const data = await res.json();
            console.log("Respuesta del servidor:", data);

            if (res.ok && data.success) {

                // Cambiar a estado "enviado"
                boton.textContent = '✓ Enviado';
                boton.style.backgroundColor = '#4CAF50';
                boton.style.color = '#ffffff';
                boton.style.opacity = "1";
                boton.dataset.sent = "true";

                alert('¡Desafío enviado exitosamente!');

            } else {
                throw new Error(data.message || 'Error al enviar desafío');
            }

        } catch (error) {
            console.error("Error al enviar desafío:", error);

            // Restaurar botón
            boton.disabled = false;
            boton.textContent = 'Desafiar ⚔️';
            boton.style.opacity = "1";

            alert('Error al enviar el desafío: ' + error.message);
        }
    }
});



// ============================================
//   INICIALIZACION
// ============================================
document.addEventListener('DOMContentLoaded', cargarRankingCarrera);
