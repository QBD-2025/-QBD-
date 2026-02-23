// examen.controller.unified.js - CONTROLADOR UNIFICADO
// =================================================================
// DETECCIÓN AUTOMÁTICA DEL TIPO DE EXAMEN
// =================================================================
const TIPO_EXAMEN = (() => {
    const inputIdMateria = document.getElementById('inputIdMateria');
    const inputIdCarrera = document.getElementById('inputIdCarrera');
    
    if (inputIdCarrera && inputIdCarrera.value) {
        return 'CARRERA';
    } else if (inputIdMateria && inputIdMateria.value) {
        return 'MATERIA';
    }
    return 'DESCONOCIDO';
})();

console.log(`🎯 Tipo de examen detectado: ${TIPO_EXAMEN}`);

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
let dificultadSeleccionada = null;
let tematicaSeleccionada = null;

// =================================================================
// VALIDACIÓN INICIAL
// =================================================================
window.addEventListener('DOMContentLoaded', () => {
    console.log('\n🚀 === INICIO CARGA PÁGINA ===');
    console.log(`📋 Tipo: ${TIPO_EXAMEN}`);
    
    const inputIdMateria = document.getElementById('inputIdMateria');
    const inputIdCarrera = document.getElementById('inputIdCarrera');
    const totalPreguntas = document.querySelectorAll('.contenedor-pregunta').length;
    const errorMsg = document.body.dataset.errorMsg;
    
    console.log('📊 Estado inicial:');
    if (TIPO_EXAMEN === 'MATERIA') {
        console.log(`   - ID Materia: ${inputIdMateria?.value || 'No encontrado'}`);
        
        // Validar ID materia
        if (inputIdMateria) {
            if (inputIdMateria.value === 'null' || inputIdMateria.value === 'undefined' || inputIdMateria.value === '') {
                console.warn('⚠️ ID Materia inválido, limpiando...');
                inputIdMateria.value = '';
            }
        }
    } else if (TIPO_EXAMEN === 'CARRERA') {
        console.log(`   - ID Carrera: ${inputIdCarrera?.value || 'No encontrado'}`);
        
        // Validar ID carrera
        if (inputIdCarrera) {
            if (inputIdCarrera.value === 'null' || inputIdCarrera.value === 'undefined' || inputIdCarrera.value === '') {
                console.warn('⚠️ ID Carrera inválido, limpiando...');
                inputIdCarrera.value = '';
            }
        }
    }
    
    console.log(`   - Total preguntas: ${totalPreguntas}`);
    console.log(`   - Mensaje error: ${errorMsg || 'Ninguno'}`);
    
    // Manejar mensaje de error (sin abrir modales automáticamente)
    if (errorMsg) {
        console.log('Mostrando mensaje de error');
        alert(errorMsg);
    }
    
    console.log('✅ === FIN CARGA PÁGINA ===\n');
});

// =================================================================
// MODAL DE DIFICULTAD (MATERIAS GENERALES)
// =================================================================
function abrirModalDificultad() {
    console.log('🎭 Abriendo modal de dificultad');
    const modal = document.getElementById('modalDificultad');
    if (modal) {
        modal.classList.remove('oculto');
    } else {
        console.error('❌ Modal no encontrado');
    }
}

function cerrarModalDificultad() {
    console.log('🎭 Cerrando modal de dificultad');
    const modal = document.getElementById('modalDificultad');
    if (modal) {
        modal.classList.add('oculto');
    }
}

// =================================================================
// MODAL DE TEMÁTICA Y DIFICULTAD (CARRERAS)
// =================================================================
function abrirModalTematicaDificultad() {
    console.log('🎭 Abriendo modal de temática y dificultad');
    const modal = document.getElementById('modalTematicaDificultad');
    if (modal) {
        modal.classList.remove('oculto');
        // Resetear al paso 1
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
    console.log('🔙 Volviendo a selección de temática');
    document.getElementById('pasoTematica')?.classList.remove('oculto');
    document.getElementById('pasoDificultad')?.classList.add('oculto');
    tematicaSeleccionada = null;
}

// =================================================================
// EVENT LISTENERS PARA DIFICULTAD (MATERIAS GENERALES)
// =================================================================
document.addEventListener('DOMContentLoaded', () => {
    if (TIPO_EXAMEN !== 'MATERIA') return;
    
    console.log('🔌 Configurando event listeners de dificultad (MATERIAS)');
    
    const opcionesDificultad = document.querySelectorAll('#modalDificultad .opcion-dificultad');
    console.log(`   - Opciones encontradas: ${opcionesDificultad.length}`);
    
    opcionesDificultad.forEach((opcion, index) => {
        opcion.addEventListener('click', function() {
            const dificultad = this.dataset.dificultad;
            const idMateria = document.getElementById('inputIdMateria')?.value;
            
            console.log(`\n🎯 === SELECCIÓN DE DIFICULTAD ===`);
            console.log(`   - Dificultad: ${dificultad}`);
            console.log(`   - ID Materia: ${idMateria}`);
            
            if (!idMateria || idMateria === 'null' || idMateria === 'undefined' || idMateria === '') {
                console.error('❌ ID Materia inválido');
                alert('❌ Error: No se pudo determinar la materia. Por favor, recarga la página.');
                return;
            }
            
            const nuevaURL = `/examen/${idMateria}?dificultad=${dificultad}`;
            console.log(`🔄 Redirigiendo a: ${nuevaURL}`);
            window.location.href = nuevaURL;
        });
    });
});

// =================================================================
// EVENT LISTENERS PARA TEMÁTICA Y DIFICULTAD (CARRERAS)
// =================================================================
document.addEventListener('DOMContentLoaded', () => {
    if (TIPO_EXAMEN !== 'CARRERA') return;
    
    console.log('🔌 Configurando event listeners de temática y dificultad (CARRERAS)');
    
    const idCarrera = window.ID_CARRERA || document.getElementById('inputIdCarrera')?.value;
    
    // Event listeners para temáticas
    const opcionesTematica = document.querySelectorAll('.opcion-tematica');
    console.log(`   - Temáticas encontradas: ${opcionesTematica.length}`);
    
    opcionesTematica.forEach((opcion) => {
        opcion.addEventListener('click', function() {
            tematicaSeleccionada = this.dataset.tematica;
            const tematicaNombre = this.querySelector('.tematica-titulo')?.textContent || 'Temática seleccionada';
            
            console.log(`📚 Temática seleccionada: ${tematicaNombre} (ID: ${tematicaSeleccionada})`);
            
            // Actualizar texto y mostrar paso 2
            const textoTematica = document.getElementById('tematicaSeleccionadaTexto');
            if (textoTematica) textoTematica.textContent = tematicaNombre;
            
            document.getElementById('pasoTematica')?.classList.add('oculto');
            document.getElementById('pasoDificultad')?.classList.remove('oculto');
        });
    });
    
    // Event listeners para dificultad
    const opcionesDificultad = document.querySelectorAll('#modalTematicaDificultad .opcion-dificultad');
    console.log(`   - Dificultades encontradas: ${opcionesDificultad.length}`);
    
    opcionesDificultad.forEach((opcion) => {
        opcion.addEventListener('click', function() {
            const dificultad = this.dataset.dificultad;
            
            console.log(`\n🎯 === CONFIGURACIÓN COMPLETA ===`);
            console.log(`   - Carrera: ${idCarrera}`);
            console.log(`   - Temática: ${tematicaSeleccionada}`);
            console.log(`   - Dificultad: ${dificultad}`);
            
            if (!idCarrera || idCarrera === 'null' || idCarrera === 'undefined' || idCarrera === '') {
                console.error('❌ ID Carrera inválido');
                alert('❌ Error: No se pudo determinar la carrera. Por favor, recarga la página.');
                return;
            }
            
            if (!tematicaSeleccionada) {
                console.error('❌ Temática no seleccionada');
                alert('❌ Error: Debes seleccionar una temática primero.');
                return;
            }
            
            const nuevaURL = `/examen-carrera/${idCarrera}?tematica=${tematicaSeleccionada}&dificultad=${dificultad}`;
            console.log(`🔄 Redirigiendo a: ${nuevaURL}`);
            window.location.href = nuevaURL;
        });
    });
});

// =================================================================
// FUNCIÓN COMENZAR EXAMEN
// =================================================================
function comenzarExamen() {
    console.log('\n▶️ === INICIO EXAMEN ===');
    console.log(`📋 Tipo: ${TIPO_EXAMEN}`);
    
    const totalPreguntas = preguntas.length;
    console.log(`📊 Total preguntas disponibles: ${totalPreguntas}`);
    
    if (totalPreguntas === 0) {
        console.error('❌ No hay preguntas cargadas');
        alert('Por favor, selecciona la configuración del examen primero');
        
        if (TIPO_EXAMEN === 'MATERIA') {
            abrirModalDificultad();
        } else if (TIPO_EXAMEN === 'CARRERA') {
            abrirModalTematicaDificultad();
        }
        return;
    }
    
    // Obtener parámetros de la URL
    const urlParams = new URLSearchParams(window.location.search);
    dificultadSeleccionada = urlParams.get('dificultad') || '2';
    
    if (TIPO_EXAMEN === 'CARRERA') {
        tematicaSeleccionada = urlParams.get('tematica');
        console.log(`📚 Temática: ${tematicaSeleccionada}`);
    }
    
    console.log(`⚡ Dificultad: ${dificultadSeleccionada}`);
    
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
    
    console.log('✅ === EXAMEN INICIADO ===\n');
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
    console.log('\n🏁 === FINALIZANDO EXAMEN ===');
    console.log(`📋 Tipo: ${TIPO_EXAMEN}`);
    console.log(`📦 Total respuestas: ${Object.keys(respuestasUsuario).length}`);
    console.log(`⚡ Dificultad: ${dificultadSeleccionada}`);
    
    clearInterval(intervaloCronometro);
    
    // Preparar formulario según el tipo de examen
    if (TIPO_EXAMEN === 'MATERIA') {
        const inputIdMateria = document.getElementById('inputIdMateria');
        console.log(`📚 ID Materia: ${inputIdMateria?.value}`);
        
        if (!inputIdMateria || !inputIdMateria.value) {
            console.error('❌ No se pudo determinar la materia');
            alert('❌ Error: No se pudo determinar la materia');
            return;
        }
        
        document.getElementById('inputRespuestas').value = JSON.stringify(respuestasUsuario);
        document.getElementById('inputFechaInicio').value = fechaInicioExamen;
        
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
        
    } else if (TIPO_EXAMEN === 'CARRERA') {
        const inputIdCarrera = document.getElementById('inputIdCarrera');
        console.log(`🎓 ID Carrera: ${inputIdCarrera?.value}`);
        console.log(`📚 ID Temática: ${tematicaSeleccionada}`);
        
        if (!inputIdCarrera || !inputIdCarrera.value) {
            console.error('❌ No se pudo determinar la carrera');
            alert('❌ Error: No se pudo determinar la carrera');
            return;
        }
        
        document.getElementById('inputRespuestas').value = JSON.stringify(respuestasUsuario);
        document.getElementById('inputFechaInicio').value = fechaInicioExamen;
        
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
        
        // Asegurar campo de temática
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
    }
    
    console.log('✅ Formulario preparado, enviando...');
    console.log('✅ === FIN FINALIZACIÓN ===\n');
    
    document.getElementById('formResultados').submit();
}

// =================================================================
// SISTEMA DE TEMAS
// =================================================================
document.addEventListener('DOMContentLoaded', function() {
    const themeToggle = document.getElementById('theme-toggle');
    const currentTheme = localStorage.getItem('theme') || 'dark';
    
    document.documentElement.setAttribute('data-theme', currentTheme);
    
    if (themeToggle) {
        themeToggle.checked = currentTheme === 'dark';
        
        themeToggle.addEventListener('change', function() {
            const newTheme = this.checked ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
        });
    }
});

// Asegurar que inicia en modo pre-examen
document.body.classList.remove('mostrar-examen');

console.log('✅ Controlador de examen unificado cargado completamente');
console.log(`📋 Modo: ${TIPO_EXAMEN}`);
