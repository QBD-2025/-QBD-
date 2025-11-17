// ✅ OBTENER DATOS DEL OBJETO GLOBAL
const dueloData = window.DUELO_DATA;

console.log('Datos del duelo:', dueloData);

// ✅ REEMPLAZAR {{#unless}} con IF en JavaScript
if (!dueloData.ambosTerminaron) {
    let contadorRecargas = 0;
    const maxRecargas = 20;

    function verificarEstado() {
        contadorRecargas++;
        if (contadorRecargas > maxRecargas) {
            console.log('Se detuvo la recarga automática para evitar bucles.');
            return;
        }
        
        fetch(`/competitivo/duelo/estado/${dueloData.id_duelo}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('La respuesta del servidor no fue OK: ' + response.status);
                }
                return response.json();
            })
            .then(data => {
                if (data.ambosCompletaron) {
                    console.log('¡Ambos terminaron! Recargando página...');
                    location.reload();
                } else {
                    console.log('Oponente aún no termina, verificando de nuevo en 30s...');
                    setTimeout(verificarEstado, 30000);
                }
            })
            .catch(error => {
                console.error('Error verificando estado:', error);
                setTimeout(verificarEstado, 60000);
            });
    }

    // Iniciar verificación después de 10 segundos
    setTimeout(verificarEstado, 10000);
}

// ✅ BOTÓN VOLVER (SIEMPRE SE EJECUTA)
const btnVolver = document.getElementById('btnVolver');

if (btnVolver) {
    btnVolver.addEventListener('click', function(e) {
        e.preventDefault();

        const jugadorTipo = dueloData.esRetador ? 'retador' : 'defensor';

        fetch(`/competitivo/duelo/volver/${dueloData.id_duelo}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jugador: jugadorTipo })
        })
        .then(res => res.json())
        .then(data => {
            if (data.ambosVolvieron) {
                ejecutarFuncionEspecial();
            } else {
                window.location.href = '/portal';
            }
        })
        .catch(err => {
            console.error('Error notificando clic:', err);
            window.location.href = '/portal';
        });
    });
}

function ejecutarFuncionEspecial() {
    alert("¡Ambos jugadores volvieron al portal! Ejecutando función...");
    window.location.href = '/portal';
}