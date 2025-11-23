    // =================================================================
    // VARIABLES GLOBALES ADAPTADAS PARA DUELO
    // =================================================================
    let fechaInicioExamen = null;
    const preguntas = document.querySelectorAll('.contenedor-pregunta');
    let actual = 0;
    let respuestasUsuario = {};
    let estadoPreguntas = [];
    const TIEMPO_ADVERTENCIA = 60;
    let tiempoRestante = 600; // 10 minutos para el examen
    let intervaloCronometro = null;
    let mostrarSoloNoRespondidas = true;
    let timerAdvertencia = null;
    
    // Variables específicas del duelo
    const tiempoLimiteDuelo = tiempoRestante; // milisegundos restantes del duelo
    const fechaLimite = new Date('{{duelo.fecha_limite}}');
    let intervaloDuelo = null;

    // =================================================================
    // FUNCIONES ESPECÍFICAS DEL DUELO
    // =================================================================
    
    function actualizarContadorDuelo() {
        const ahora = new Date();
        const tiempoRestanteDuelo = Math.max(0, fechaLimite - ahora);
        
        const elemento = document.getElementById('countdown-display') || document.getElementById('duelo-timer');
        if (!elemento) return;
        
        if (tiempoRestanteDuelo <= 0) {
            elemento.textContent = 'EXPIRADO';
            elemento.style.color = 'red';
            // Redirigir o deshabilitar el examen
            if (intervaloDuelo) clearInterval(intervaloDuelo);
            alert('El tiempo para este duelo ha expirado');
            window.location.href = '/portal';
            return;
        }
        
        const horas = Math.floor(tiempoRestanteDuelo / (1000 * 60 * 60));
        const minutos = Math.floor((tiempoRestanteDuelo % (1000 * 60 * 60)) / (1000 * 60));
        
        if (horas > 0) {
            elemento.textContent = `${horas}h ${minutos}m restantes`;
        } else {
            elemento.textContent = `${minutos} minutos restantes`;
        }
        
        // Color de advertencia si queda poco tiempo
        if (tiempoRestanteDuelo < 2 * 60 * 60 * 1000) { // menos de 2 horas
            elemento.style.color = 'orange';
        }
        if (tiempoRestanteDuelo < 30 * 60 * 1000) { // menos de 30 minutos
            elemento.style.color = 'red';
        }
    }
    
    function iniciarContadorDuelo() {
        const fechaLimiteEl = document.getElementById('fecha-limite');
        if (fechaLimiteEl) {
            fechaLimiteEl.textContent = fechaLimite.toLocaleString();
        }
        
        actualizarContadorDuelo();
        intervaloDuelo = setInterval(actualizarContadorDuelo, 60000); // Actualizar cada minuto
    }
    
    function confirmarInicioExamen() {
        document.getElementById('modalConfirmacion').classList.remove('oculto');
    }
    
    function cerrarModal() {
        document.getElementById('modalConfirmacion').classList.add('oculto');
    }
    
    function comenzarExamenConfirmado() {
        cerrarModal();
        comenzarExamen();
    }
    
    function confirmarSalida() {
        if (confirm('¿Estás seguro de que quieres salir? Perderás todo tu progreso en el duelo.')) {
            window.location.href = '/portal';
        }
    }
    
    function verificarEstadoDuelo() {
        // Redirigir a una página que muestre el estado del duelo
        window.location.href = `/duelo/estado/{{duelo.id_duelo}}`;
    }

    // =================================================================
    // FUNCIONES PRINCIPALES ADAPTADAS
    // =================================================================

    function comenzarExamen() {
        fechaInicioExamen = new Date().toISOString();
        document.body.classList.add('mostrar-examen');
        document.getElementById('preExamenContent').style.display = 'none';
        document.getElementById('examenContent').style.display = 'block';
        iniciarExamen();
        iniciarCronometro();
    }
    
    function iniciarExamen() {
        preguntas.forEach((_, i) => estadoPreguntas[i] = "pendiente");
        mostrarPregunta(0);
        
        const toggleFiltro = document.getElementById('toggleFiltro');
        if(toggleFiltro) {
            toggleFiltro.addEventListener('change', (e) => {
                mostrarSoloNoRespondidas = e.target.checked;
                actualizarPendientesUI();
            });
        }
    }

    function mostrarPregunta(index) {
        if (index < 0 || index >= preguntas.length) return;
        
        preguntas.forEach(p => p.classList.remove('activa'));
        preguntas[index].classList.add('activa');
        actual = index;
        
        actualizarPendientesUI();
        reiniciarTimerAdvertencia();
    }
    
    function reiniciarTimerAdvertencia() {
        if (timerAdvertencia) clearTimeout(timerAdvertencia);
        timerAdvertencia = setTimeout(() => {
            mostrarAviso(`Llevas mucho tiempo en la pregunta ${actual + 1}. Considera avanzar o marcarla para después.`);
        }, TIEMPO_ADVERTENCIA * 1000);
    }

    // =================================================================
    // FUNCIONES DE UI (ADAPTADAS)
    // =================================================================

    function actualizarPendientesUI() {
        const cont = document.getElementById('pendientesContainer');
        const listaNav = document.getElementById('listaPreguntasNavegacion');
        if (!cont || !listaNav) return;

        listaNav.innerHTML = "";
        cont.style.display = 'block'; 

        estadoPreguntas.forEach((estado, i) => {
            const esNoRespondida = estado === "pendiente" || estado === "suspenso";

            if (!mostrarSoloNoRespondidas || esNoRespondida) {
                const div = document.createElement('div');
                div.className = `item-navegacion estado-${estado}`;
                
                let icono = '⚪️';
                let textoEstado = `Pregunta ${i + 1}`;

                if(estado === 'respondida') icono = '✅';
                else if (estado === 'suspenso') icono = '❓';

                div.innerHTML = `${icono} ${textoEstado}`;
                div.dataset.index = i;
                
                div.addEventListener('click', () => {
                    mostrarPregunta(i);
                    activarBotonVolverAlFinal(i);
                });
                listaNav.appendChild(div);
            }
        });
    }
    
    function activarBotonVolverAlFinal(indexDondeEstoy) {
        document.querySelectorAll('.btnVolverFinal').forEach(b => b.style.display = 'none');

        if (indexDondeEstoy < preguntas.length - 1) {
            const preguntaActualEl = preguntas[indexDondeEstoy];
            const btn = preguntaActualEl.querySelector('.btnVolverFinal');
            if (btn) {
                btn.style.display = 'inline-block';
                btn.onclick = () => mostrarPregunta(preguntas.length - 1);
            }
        }
    }

    // =================================================================
    // CRONÓMETRO Y MODAL
    // =================================================================
    function iniciarCronometro() {
        tiempoRestante = 600; // 10 minutos
        clearInterval(intervaloCronometro);
        actualizarCronometroUI();
        intervaloCronometro = setInterval(() => {
            tiempoRestante--;
            actualizarCronometroUI();
            if (tiempoRestante <= 0) {
                clearInterval(intervaloCronometro);
                finalizarExamen();
            }
        }, 1000);
    }

    function actualizarCronometroUI() {
        let minutos = Math.floor(tiempoRestante / 60);
        let segundos = tiempoRestante % 60;
        let texto = `${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`;
        document.querySelectorAll('.cronometro').forEach(c => c.textContent = texto);
    }

    function mostrarAviso(mensaje) {
        document.getElementById('mensajeAviso').textContent = mensaje;
        document.getElementById('avisoTiempo').classList.remove('oculto');
    }
    
    function cerrarAviso() {
        document.getElementById('avisoTiempo').classList.add('oculto');
    }

    // =================================================================
    // EVENT LISTENERS PARA BOTONES DEL EXAMEN
    // =================================================================
    
    document.querySelectorAll('.opciones').forEach((opcionesDiv) => {
        opcionesDiv.querySelectorAll('button').forEach((btn) => {
            btn.addEventListener('click', () => {
                const preguntaDiv = opcionesDiv.closest('.contenedor-pregunta');
                const preguntaIndex = parseInt(preguntaDiv.dataset.index);
                const idPregunta = preguntaDiv.dataset.idPregunta;
                
                // ✅ GUARDAR id_respuesta en lugar de índice
                const idRespuesta = parseInt(btn.dataset.idRespuesta);
                
                opcionesDiv.querySelectorAll('button').forEach(b => b.classList.remove('seleccionada'));
                btn.classList.add('seleccionada');
                
                respuestasUsuario[idPregunta] = idRespuesta;
                estadoPreguntas[preguntaIndex] = "respondida";
                actualizarPendientesUI();
            });
        });
    });
    
    document.querySelectorAll('.btnNoSeguro').forEach((btn) => {
        btn.addEventListener('click', e => {
            e.preventDefault();
            const preguntaIndex = parseInt(e.target.closest('.contenedor-pregunta').dataset.index);
            estadoPreguntas[preguntaIndex] = "suspenso";
            if (preguntaIndex < preguntas.length - 1) {
                mostrarPregunta(preguntaIndex + 1);
            } else {
                actualizarPendientesUI();
            }
        });
    });

    document.querySelectorAll('.btn-siguiente').forEach(btn => btn.addEventListener('click', () => {
        if (estadoPreguntas[actual] !== "respondida" && estadoPreguntas[actual] !== "suspenso") {
            estadoPreguntas[actual] = "pendiente";
        }
        mostrarPregunta(actual + 1);
    }));

    document.querySelectorAll('.btn-volver:not(.btnNoSeguro):not(.btnVolverFinal)').forEach(btn => btn.addEventListener('click', () => mostrarPregunta(actual - 1)));
    
    document.querySelectorAll('.btn-finalizar').forEach(btn => btn.addEventListener('click', finalizarExamen));

    function finalizarExamen() {
    if (confirm('¿Estás seguro de que quieres finalizar el duelo? No podrás modificar tus respuestas después.')) {
        console.log('📤 ENVIANDO RESPUESTAS:', respuestasUsuario);
        console.log('📤 Como JSON:', JSON.stringify(respuestasUsuario));
        
        clearInterval(intervaloCronometro);
        clearInterval(intervaloDuelo);
        
        const tiempoEmpleado = fechaInicioExamen ? new Date() - new Date(fechaInicioExamen) : 0;
        
        document.getElementById('inputRespuestas').value = JSON.stringify(respuestasUsuario);
        document.getElementById('inputFechaInicio').value = fechaInicioExamen;
        document.getElementById('inputTiempoEmpleado').value = tiempoEmpleado;
        document.getElementById('formResultados').submit();
    }
}   
    
    // =================================================================
    // INICIALIZACIÓN
    // =================================================================
    document.addEventListener('DOMContentLoaded', function() {
        iniciarContadorDuelo();
        iniciarExamen();
        document.body.classList.remove('mostrar-examen');
    });


    function confirmarAbandonoDuelo() {
    const razon = prompt('¿Por qué abandonas el duelo? (opcional)');
    
    if (confirm('¿Estás seguro de que quieres abandonar el duelo? Perderás automáticamente.')) {
        abandonarDuelo(razon);
    }
}

async function abandonarDuelo(razon) {
    try {
        const response = await fetch(`/duelo/abandonar/{{duelo.id_duelo}}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ razon: razon || 'Sin especificar' })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert(data.message);
            if (data.redirigir) {
                window.location.href = data.redirigir;
            }
        } else {
            alert('Error: ' + data.error);
        }
        
    } catch (error) {
        console.error('Error al abandonar duelo:', error);
        alert('Error de conexión al abandonar duelo');  
    }
    
}

// Listener para eventos de socket (detectar cuando el oponente abandona)
if (typeof socket !== 'undefined') {
    socket.on('duelo_abandonado', (data) => {
        if (data.ganaste) {
            alert(`¡Has ganado! ${data.mensaje}`);
            window.location.href = '/portal';
        } else {
            alert(data.mensaje);
            window.location.href = '/portal';
        }
    });
}

function confirmarSalida() {
    if (confirm('¿Estás seguro de que quieres salir del duelo?\n\nEsto contará como abandono.')) {
        abandonarDuelo();
    }
}

// ✅ Función para abandonar duelo
async function abandonarDuelo() {
    const salaId = '{{duelo.id_duelo}}';
    
    try {
        console.log('🚪 Abandonando duelo:', salaId);
        
        const response = await fetch(`/duelo/abandonar/${salaId}`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                razon: 'Salida voluntaria desde el examen' 
            })
        });
        
        console.log('📡 Respuesta del servidor:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Error del servidor:', errorText);
            throw new Error(`Error ${response.status}: ${errorText}`);
        }
        
        const data = await response.json();
        console.log('✅ Datos recibidos:', data);
        
        if (data.success) {
            alert(data.message || 'Has abandonado el duelo');
            
            // Limpiar intervalos
            if (intervaloCronometro) clearInterval(intervaloCronometro);
            if (intervaloDuelo) clearInterval(intervaloDuelo);
            if (timerAdvertencia) clearTimeout(timerAdvertencia);
            
            // Redirigir
            window.location.href = data.redirigir || '/portal';
        } else {
            throw new Error(data.error || 'Error desconocido al abandonar');
        }
        
    } catch (error) {
        console.error('💥 Error al abandonar duelo:', error);
        alert('Error al abandonar el duelo. Serás redirigido al portal.');
        window.location.href = '/portal';
    }
}