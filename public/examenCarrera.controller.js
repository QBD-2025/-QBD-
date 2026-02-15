// examenCarrera.controller.js - CONTROLADOR PARA EXÁMENES POR CARRERA
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
let tematicaSeleccionada = null;
let dificultadSeleccionada = null;

// =================================================================
// VALIDACIÓN INICIAL
// =================================================================
window.addEventListener('DOMContentLoaded', () => {
    console.log('\n🚀 === INICIO CARGA PÁGINA CARRERA ===');
    
    const inputIdCarrera = document.getElementById('inputIdCarrera');
    const totalPreguntas = document.querySelectorAll('.contenedor-pregunta').length;
    const modalTematicaDificultad = document.getElementById('modalTematicaDificultad');
    const errorMsg = document.body.dataset.errorMsg;
    
    console.log('📊 Estado inicial:');
    console.log(`   - ID Carrera: ${inputIdCarrera?.value || 'No encontrado'}`);
    console.log(`   - Total preguntas: ${totalPreguntas}`);
    console.log(`   - Modal presente: ${modalTematicaDificultad ? 'Sí' : 'No'}`);
    console.log(`   - Mensaje error: ${errorMsg || 'Ninguno'}`);
    console.log(`   - Temáticas disponibles: ${window.TEMATICAS?.length || 0}`);
    
    // Validar ID carrera
    if (inputIdCarrera) {
        if (inputIdCarrera.value === 'null' || inputIdCarrera.value === 'undefined' || inputIdCarrera.value === '') {
            console.warn('⚠️ ID Carrera inválido, limpiando...');
            inputIdCarrera.value = '';
        }
    } else {
        console.error('❌ Input ID Carrera no encontrado en el DOM');
    }
    
    // Manejar mensaje de error
    if (errorMsg) {
        console.log('⚠️ Mostrando mensaje de error');
        alert(errorMsg);
        if (modalTematicaDificultad) {
            modalTematicaDificultad.classList.remove('oculto');
        }
    }
    
    // Configurar event listeners para temáticas y dificultades
    configurarEventListenersModal();
    
    console.log('✅ === FIN CARGA PÁGINA CARRERA ===\n');
});

// =================================================================
// MODAL DE TEMÁTICA Y DIFICULTAD
// =================================================================
function abrirModalTematicaDificultad() {
    console.log('🎭 Abriendo modal de temática y dificultad');
    const modal = document.getElementById('modalTematicaDificultad');
    if (modal) {
        modal.classList.remove('oculto');
        // Asegurar que empiece en el paso de temática
        document.getElementById('pasoTematica')?.classList.remove('oculto');
        document.getElementById('pasoDificultad')?.classList.add('oculto');
    } else {
        console.error('❌ Modal no encontrado');
    }
}

function cerrarModalTematicaDificultad() {
    console.log('🎭 Cerrando modal de temática y dificultad');
    const modal = document.getElementById('modalTematicaDificultad');
    if (modal) {
        modal.classList.add('oculto');
    }
}

function volverATematica() {
    console.log('🔙 Volviendo al paso de temática');
    document.getElementById('pasoTematica')?.classList.remove('oculto');
    document.getElementById('pasoDificultad')?.classList.add('oculto');
}

// =================================================================
// EVENT LISTENERS PARA TEMÁTICA Y DIFICULTAD
// =================================================================
function configurarEventListenersModal() {
    console.log('🔌 Configurando event listeners del modal');
    
    // Event listeners para temáticas
    const opcionesTematica = document.querySelectorAll('.opcion-tematica');
    console.log(`   - Opciones de temática: ${opcionesTematica.length}`);
    
    opcionesTematica.forEach((opcion, index) => {
        opcion.addEventListener('click', function() {
            tematicaSeleccionada = this.dataset.tematica;
            const textoTematica = this.querySelector('.tematica-titulo')?.textContent;
            
            console.log(`\n📚 === TEMÁTICA SELECCIONADA ===`);
            console.log(`   - ID Temática: ${tematicaSeleccionada}`);
            console.log(`   - Nombre: ${textoTematica}`);
            console.log(`   - Índice botón: ${index}`);
            
            // Marcar visualmente la selección
            opcionesTematica.forEach(o => o.classList.remove('seleccionada'));
            this.classList.add('seleccionada');
            
            // Actualizar texto en el paso 2
            const textoElement = document.getElementById('tematicaSeleccionadaTexto');
            if (textoElement) {
                textoElement.textContent = textoTematica;
            }
            
            // Mostrar paso de dificultad
            setTimeout(() => {
                document.getElementById('pasoTematica')?.classList.add('oculto');
                document.getElementById('pasoDificultad')?.classList.remove('oculto');
            }, 200);
            
            console.log('✅ === FIN SELECCIÓN TEMÁTICA ===\n');
        });
    });
    
    // Event listeners para dificultades
    const opcionesDificultad = document.querySelectorAll('.opcion-dificultad');
    console.log(`   - Opciones de dificultad: ${opcionesDificultad.length}`);
    
    opcionesDificultad.forEach((opcion, index) => {
        opcion.addEventListener('click', function() {
            dificultadSeleccionada = this.dataset.dificultad;
            const idCarrera = document.getElementById('inputIdCarrera')?.value;
            
            console.log(`\n⚡ === DIFICULTAD SELECCIONADA ===`);
            console.log(`   - Dificultad: ${dificultadSeleccionada}`);
            console.log(`   - Temática: ${tematicaSeleccionada}`);
            console.log(`   - ID Carrera: ${idCarrera}`);
            console.log(`   - Índice botón: ${index}`);
            
            // Validar que haya temática seleccionada
            if (!tematicaSeleccionada) {
                console.error('❌ No hay temática seleccionada');
                alert('⚠️ Por favor, primero selecciona una temática.');
                volverATematica();
                return;
            }
            
            // Validar ID carrera
            if (!idCarrera || idCarrera === 'null' || idCarrera === 'undefined' || idCarrera === '') {
                console.error('❌ ID Carrera inválido');
                alert('❌ Error: No se pudo determinar la carrera. Por favor, recarga la página.');
                return;
            }
            
            // Construir URL con parámetros
            const nuevaURL = `/examen-carrera/${idCarrera}?tematica=${tematicaSeleccionada}&dificultad=${dificultadSeleccionada}`;
            console.log(`🔄 Redirigiendo a: ${nuevaURL}`);
            console.log('✅ === FIN SELECCIÓN DIFICULTAD ===\n');
            
            window.location.href = nuevaURL;
        });
    });
}

// =================================================================
// FUNCIÓN COMENZAR EXAMEN
// =================================================================
function comenzarExamen() {
    console.log('\n▶️ === INICIO EXAMEN CARRERA ===');
    
    const totalPreguntas = preguntas.length;
    console.log(`📊 Total preguntas disponibles: ${totalPreguntas}`);
    
    // Validar que haya preguntas
    if (totalPreguntas === 0) {
        console.error('❌ No hay preguntas cargadas');
        alert('Por favor, configura el examen primero');
        abrirModalTematicaDificultad();
        return;
    }
    
    // Obtener dificultad y temática de la URL
    const urlParams = new URLSearchParams(window.location.search);
    dificultadSeleccionada = urlParams.get('dificultad') || '2';
    tematicaSeleccionada = urlParams.get('tematica');
    
    console.log(`⚡ Dificultad seleccionada: ${dificultadSeleccionada}`);
    console.log(`📚 Temática seleccionada: ${tematicaSeleccionada}`);
    
    // Registrar hora de inicio
    fechaInicioExamen = new Date().toISOString();
    console.log(`⏰ Hora inicio: ${fechaInicioExamen}`);
    
    // Cambiar vista
    document.body.classList.add('mostrar-examen');
    document.getElementById('preExamenContent').style.display = 'none';
    document.getElementById('examenContent').style.display = 'block';
    
    console.log('✅ Vista cambiada a examen');
    
    // Inicializar examen
    iniciarExamen();
    iniciarCronometro();
    
    console.log('✅ === EXAMEN CARRERA INICIADO ===\n');
}

// =================================================================
// FUNCIÓN VOLVER A PRE-EXAMEN
// =================================================================
function volverAPreExamen() {
    if (confirm('¿Estás seguro de que quieres salir del examen? Se perderá tu progreso.')) {
        console.log('🔙 Saliendo del examen');
        
        document.body.classList.remove('mostrar-examen');
        document.getElementById('preExamenContent').style.display = 'block';
        document.getElementById('examenContent').style.display = 'none';
        clearInterval(intervaloCronometro);
        
        // Recargar para limpiar estado
        window.location.reload();
    }
}

// =================================================================
// INICIAR EXAMEN
// =================================================================
function iniciarExamen() {
    console.log('🎬 Inicializando estado del examen');
    
    preguntas.forEach((_, i) => estadoPreguntas[i] = "pendiente");
    console.log(`📝 Estados inicializados: ${estadoPreguntas.length} preguntas`);
    
    mostrarPregunta(0);
    
    const toggleFiltro = document.getElementById('toggleFiltro');
    if(toggleFiltro) {
        toggleFiltro.addEventListener('change', (e) => {
            mostrarSoloNoRespondidas = e.target.checked;
            console.log(`🔍 Filtro actualizado: ${mostrarSoloNoRespondidas ? 'Solo no respondidas' : 'Todas'}`);
            actualizarPendientesUI();
        });
    }
}

// =================================================================
// MOSTRAR PREGUNTA
// =================================================================
function mostrarPregunta(index) {
    if (index < 0 || index >= preguntas.length) {
        console.warn(`⚠️ Índice inválido: ${index}`);
        return;
    }
    
    console.log(`📄 Mostrando pregunta ${index + 1}/${preguntas.length}`);
    
    preguntas.forEach(p => p.classList.remove('activa'));
    preguntas[index].classList.add('activa');
    actual = index;
    
    actualizarPendientesUI();
    reiniciarTimerAdvertencia();
}

// =================================================================
// TIMER DE ADVERTENCIA
// =================================================================
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
            if(estado === 'respondida') icono = '✅';
            else if (estado === 'suspenso') icono = '❓';

            div.innerHTML = `${icono} Pregunta ${i + 1}`;
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
    console.log('⏱️ Iniciando cronómetro (10 minutos)');
    tiempoRestante = 600;
    clearInterval(intervaloCronometro);
    actualizarCronometroUI();
    intervaloCronometro = setInterval(() => {
        tiempoRestante--;
        actualizarCronometroUI();
        if (tiempoRestante <= 0) {
            console.log('⏰ Tiempo agotado');
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
// EVENT LISTENERS DE RESPUESTAS
// =================================================================
document.querySelectorAll('.opciones').forEach((opcionesDiv) => {
    opcionesDiv.querySelectorAll('button').forEach((btn, respuestaIndex) => {
        btn.addEventListener('click', () => {
            const preguntaDiv = opcionesDiv.closest('.contenedor-pregunta');
            const preguntaIndex = parseInt(preguntaDiv.dataset.index);
            const idPregunta = preguntaDiv.dataset.idPregunta;
            
            console.log(`✔️ Respuesta seleccionada: Pregunta ${preguntaIndex + 1}, Opción ${respuestaIndex}`);
            
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
        console.log(`❓ Pregunta ${preguntaIndex + 1} marcada como suspenso`);
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

// =================================================================
// FINALIZAR EXAMEN
// =================================================================
function finalizarExamen() {
    console.log('\n🏁 === FINALIZANDO EXAMEN CARRERA ===');
    console.log(`📦 Total respuestas: ${Object.keys(respuestasUsuario).length}`);
    console.log(`⚡ Dificultad: ${dificultadSeleccionada}`);
    console.log(`📚 Temática: ${tematicaSeleccionada}`);
    
    clearInterval(intervaloCronometro);
    
    const inputIdCarrera = document.getElementById('inputIdCarrera');
    console.log(`🎓 ID Carrera: ${inputIdCarrera?.value}`);
    
    if (!inputIdCarrera || !inputIdCarrera.value) {
        console.error('❌ No se pudo determinar la carrera');
        alert('❌ Error: No se pudo determinar la carrera');
        return;
    }
    
    // Preparar formulario
    document.getElementById('inputRespuestas').value = JSON.stringify(respuestasUsuario);
    document.getElementById('inputFechaInicio').value = fechaInicioExamen;
    
    // Asegurar campos de dificultad y temática
    let inputDificultad = document.getElementById('inputDificultad');
    if (!inputDificultad) {
        console.log('➕ Creando campo de dificultad');
        inputDificultad = document.createElement('input');
        inputDificultad.type = 'hidden';
        inputDificultad.name = 'id_dificultad';
        inputDificultad.id = 'inputDificultad';
        document.getElementById('formResultados').appendChild(inputDificultad);
    }
    inputDificultad.value = dificultadSeleccionada || '2';
    
    let inputTematica = document.getElementById('inputTematica');
    if (!inputTematica) {
        console.log('➕ Creando campo de temática');
        inputTematica = document.createElement('input');
        inputTematica.type = 'hidden';
        inputTematica.name = 'id_tematica';
        inputTematica.id = 'inputTematica';
        document.getElementById('formResultados').appendChild(inputTematica);
    }
    inputTematica.value = tematicaSeleccionada;
    
    console.log('✅ Formulario preparado, enviando...');
    console.log('✅ === FIN FINALIZACIÓN ===\n');
    
    document.getElementById('formResultados').submit();
}

// Asegurar que inicia en modo pre-examen
document.body.classList.remove('mostrar-examen');

console.log('✅ Controlador de examen de carrera cargado completamente');