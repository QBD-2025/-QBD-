    // =================================================================
    // VARIABLES GLOBALES
    // =================================================================
    let fechaInicioExamen = null;
    const preguntas = document.querySelectorAll('.contenedor-pregunta');
    let actual = 0;
    let respuestasUsuario = {};
    let estadoPreguntas = [];
    const TIEMPO_ADVERTENCIA = 60;
    let tiempoRestante = 600;
    let intervaloCronometro = null;
    let mostrarSoloNoRespondidas = true;
    let timerAdvertencia = null;

    // ✅ AÑADIR: Validar id_materia al cargar la página
    window.addEventListener('DOMContentLoaded', () => {
        const inputIdMateria = document.getElementById('inputIdMateria');
        console.log('🔍 ID Materia cargado:', inputIdMateria.value);
        
        // Si está vacío o es "null" como string, dejarlo vacío para que el backend lo maneje
        if (inputIdMateria.value === 'null' || inputIdMateria.value === 'undefined') {
            inputIdMateria.value = '';
            console.log('⚠️ ID Materia era null, establecido como vacío');
        }
    });

    // =================================================================
    // FUNCIONES PRINCIPALES
    // =================================================================
    function comenzarExamen() {
        fechaInicioExamen = new Date().toISOString();
        document.body.classList.add('mostrar-examen');
        document.getElementById('preExamenContent').style.display = 'none';
        document.getElementById('examenContent').style.display = 'block';
        iniciarExamen();
        iniciarCronometro();
    }

    function volverAPreExamen() {
        document.body.classList.remove('mostrar-examen');
        document.getElementById('preExamenContent').style.display = 'block';
        document.getElementById('examenContent').style.display = 'none';
        clearInterval(intervaloCronometro);
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
            mostrarAviso(`¡Ojo! Llevas mucho tiempo en la pregunta ${actual + 1}. Considera avanzar o marcarla para después.`);
        }, TIEMPO_ADVERTENCIA * 1000);
    }

    // =================================================================
    // LISTA DE PREGUNTAS (PANEL DERECHO)
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
    // CRONÓMETRO
    // =================================================================
    function iniciarCronometro() {
        tiempoRestante = 600;
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
    // EVENT LISTENERS
    // =================================================================
    document.querySelectorAll('.opciones').forEach((opcionesDiv) => {
        opcionesDiv.querySelectorAll('button').forEach((btn, respuestaIndex) => {
            btn.addEventListener('click', () => {
                const preguntaDiv = opcionesDiv.closest('.contenedor-pregunta');
                const preguntaIndex = parseInt(preguntaDiv.dataset.index);
                const idPregunta = preguntaDiv.dataset.idPregunta;
                opcionesDiv.querySelectorAll('button').forEach(b => b.classList.remove('seleccionada'));
                btn.classList.add('seleccionada');
                respuestasUsuario[idPregunta] = respuestaIndex;
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
        console.log('🏁 Finalizando examen...');
        console.log('📦 Respuestas:', respuestasUsuario);
        
        clearInterval(intervaloCronometro);
        
        const inputIdMateria = document.getElementById('inputIdMateria');
        console.log('📊 ID Materia a enviar:', inputIdMateria.value);
        
        document.getElementById('inputRespuestas').value = JSON.stringify(respuestasUsuario);
        document.getElementById('inputFechaInicio').value = fechaInicioExamen;
        
        console.log('✅ Enviando formulario...');
        document.getElementById('formResultados').submit();
    }
    
    // Iniciar (solo prepara, no inicia el examen hasta que se presione el botón)
    document.body.classList.remove('mostrar-examen');